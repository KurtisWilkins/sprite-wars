## TargetingData — Data schema for one of the 15 ability targeting patterns.
## [P2-002] Defines how abilities select their affected tiles on the battle grid.
## Includes a static function to resolve affected tile positions at runtime.
class_name TargetingData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

@export var targeting_id: int = 0
@export var targeting_name: String = ""

## ── Target Selection ──────────────────────────────────────────────────────────

## True if this pattern targets enemy units; false for ally/self patterns.
@export var is_enemy_target: bool = true

## The geometric shape of the targeting area.
@export_enum(
	"single", "row", "column", "cross", "diamond",
	"aoe_circle", "random", "all", "adjacent", "self",
	"single_ally", "all_allies", "adjacent_allies", "line", "pierce"
) var pattern_type: String = "single"

## ── Range ─────────────────────────────────────────────────────────────────────

## Minimum and maximum tile distance from the caster to the target origin.
@export_range(0, 20) var range_min: int = 1
@export_range(0, 20) var range_max: int = 1

## ── Tile Offsets ──────────────────────────────────────────────────────────────

## Pre-computed relative tile positions affected by this pattern.
## Origin (0, 0) is the targeted tile. Used by non-procedural patterns or
## as an override when the pattern is custom-designed.
@export var affected_tile_offsets: Array[Vector2i] = [Vector2i.ZERO]

## ── Line of Sight ─────────────────────────────────────────────────────────────

## Whether the targeting requires an unobstructed line of sight.
@export var requires_los: bool = false

## ── Presentation ──────────────────────────────────────────────────────────────

## Highlight color for the UI tile overlay when selecting targets.
@export var ui_highlight_color: Color = Color(1.0, 0.3, 0.3, 0.5)


## ── Constants ─────────────────────────────────────────────────────────────────

const VALID_PATTERNS: PackedStringArray = PackedStringArray([
	"single", "row", "column", "cross", "diamond",
	"aoe_circle", "random", "all", "adjacent", "self",
	"single_ally", "all_allies", "adjacent_allies", "line", "pierce",
])


## ── Static: Tile Resolution ───────────────────────────────────────────────────

## Resolve the actual grid tiles affected by this targeting pattern.
##
## [origin]    — The caster's tile position.
## [target]    — The selected target tile position.
## [grid_size] — The dimensions of the battle grid (columns, rows).
##
## Returns an array of Vector2i grid coordinates that are within bounds.
static func get_affected_tiles(
	origin: Vector2i,
	target: Vector2i,
	grid_size: Vector2i,
	targeting: TargetingData = null,
) -> Array[Vector2i]:
	var tiles: Array[Vector2i] = []

	if targeting == null:
		tiles.append(target)
		return _clamp_to_grid(tiles, grid_size)

	match targeting.pattern_type:
		"single", "single_ally":
			tiles.append(target)

		"self":
			tiles.append(origin)

		"row":
			for x in range(grid_size.x):
				tiles.append(Vector2i(x, target.y))

		"column":
			for y in range(grid_size.y):
				tiles.append(Vector2i(target.x, y))

		"cross":
			tiles.append(target)
			tiles.append(Vector2i(target.x - 1, target.y))
			tiles.append(Vector2i(target.x + 1, target.y))
			tiles.append(Vector2i(target.x, target.y - 1))
			tiles.append(Vector2i(target.x, target.y + 1))

		"diamond":
			# Diamond shape with radius 1 (5 tiles) centered on target.
			for dx in range(-1, 2):
				for dy in range(-1, 2):
					if absi(dx) + absi(dy) <= 1:
						tiles.append(Vector2i(target.x + dx, target.y + dy))

		"aoe_circle":
			# 3x3 area centered on target.
			for dx in range(-1, 2):
				for dy in range(-1, 2):
					tiles.append(Vector2i(target.x + dx, target.y + dy))

		"adjacent":
			tiles.append(Vector2i(target.x - 1, target.y))
			tiles.append(Vector2i(target.x + 1, target.y))
			tiles.append(Vector2i(target.x, target.y - 1))
			tiles.append(Vector2i(target.x, target.y + 1))
			tiles.append(target)

		"adjacent_allies":
			tiles.append(Vector2i(origin.x - 1, origin.y))
			tiles.append(Vector2i(origin.x + 1, origin.y))
			tiles.append(Vector2i(origin.x, origin.y - 1))
			tiles.append(Vector2i(origin.x, origin.y + 1))
			tiles.append(origin)

		"all", "all_allies":
			for x in range(grid_size.x):
				for y in range(grid_size.y):
					tiles.append(Vector2i(x, y))

		"random":
			# Random targeting is resolved at runtime by the battle system.
			# Return the single target as a placeholder; the caller is
			# responsible for randomization.
			tiles.append(target)

		"line":
			# A straight line from origin toward target, up to range_max tiles.
			var direction := _get_direction(origin, target)
			if direction != Vector2i.ZERO:
				var current := origin + direction
				var steps := 0
				while _is_in_grid(current, grid_size) and steps < targeting.range_max:
					tiles.append(current)
					current += direction
					steps += 1

		"pierce":
			# Like line, but passes through all tiles from origin through
			# target and continues to the grid edge.
			var direction := _get_direction(origin, target)
			if direction != Vector2i.ZERO:
				var current := origin + direction
				while _is_in_grid(current, grid_size):
					tiles.append(current)
					current += direction

		_:
			# Fallback: use the manually defined affected_tile_offsets.
			for offset in targeting.affected_tile_offsets:
				tiles.append(target + offset)

	return _clamp_to_grid(tiles, grid_size)


## ── Instance Helpers ──────────────────────────────────────────────────────────

## Convenience wrapper so callers can invoke on the resource itself.
func resolve_tiles(origin: Vector2i, target: Vector2i, grid_size: Vector2i) -> Array[Vector2i]:
	return TargetingData.get_affected_tiles(origin, target, grid_size, self)


## Whether the caster can reach the target tile from origin.
func is_in_range(origin: Vector2i, target: Vector2i) -> bool:
	var dist: int = absi(target.x - origin.x) + absi(target.y - origin.y)
	return dist >= range_min and dist <= range_max


## ── Private Helpers ───────────────────────────────────────────────────────────

## Clamp tile list to grid bounds, removing any out-of-bounds entries.
static func _clamp_to_grid(tiles: Array[Vector2i], grid_size: Vector2i) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for tile in tiles:
		if _is_in_grid(tile, grid_size):
			if tile not in result:
				result.append(tile)
	return result


static func _is_in_grid(pos: Vector2i, grid_size: Vector2i) -> bool:
	return pos.x >= 0 and pos.x < grid_size.x and pos.y >= 0 and pos.y < grid_size.y


## Get a normalized cardinal/diagonal direction vector from origin to target.
static func _get_direction(origin: Vector2i, target: Vector2i) -> Vector2i:
	var diff := target - origin
	if diff == Vector2i.ZERO:
		return Vector2i.ZERO
	return Vector2i(signi(diff.x), signi(diff.y))


## ── Validation ────────────────────────────────────────────────────────────────

func validate() -> Array[String]:
	var errors: Array[String] = []
	if targeting_id <= 0:
		errors.append("targeting_id must be a positive integer.")
	if targeting_name.is_empty():
		errors.append("targeting_name is required.")
	if pattern_type not in VALID_PATTERNS:
		errors.append("pattern_type '%s' is not valid." % pattern_type)
	if range_min < 0:
		errors.append("range_min must be >= 0.")
	if range_max < range_min:
		errors.append("range_max must be >= range_min.")
	if affected_tile_offsets.is_empty():
		errors.append("affected_tile_offsets must have at least one entry.")
	return errors

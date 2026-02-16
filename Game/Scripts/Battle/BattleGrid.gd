## BattleGrid -- [P3-001] Grid-based battlefield for Sprite Wars.
## 6 columns x 8 rows total (4 rows per side). Team 0 (player) occupies
## rows 0-3, team 1 (enemy) occupies rows 4-7.
class_name BattleGrid
extends RefCounted

## -- Constants ----------------------------------------------------------------

const GRID_WIDTH: int = 6
const GRID_HEIGHT_PER_SIDE: int = 4
const TOTAL_HEIGHT: int = 8  # 4 rows per side

## Team row boundaries (inclusive).
const PLAYER_ROW_MIN: int = 0
const PLAYER_ROW_MAX: int = 3
const ENEMY_ROW_MIN: int = 4
const ENEMY_ROW_MAX: int = 7

## -- State --------------------------------------------------------------------

## Maps Vector2i grid positions to the BattleUnit occupying that cell, or null.
var cells: Dictionary = {}

## -- Initialization -----------------------------------------------------------

func _init() -> void:
	_clear_grid()


func _clear_grid() -> void:
	cells.clear()
	for x in range(GRID_WIDTH):
		for y in range(TOTAL_HEIGHT):
			cells[Vector2i(x, y)] = null

## -- Unit Placement -----------------------------------------------------------

## Place a unit on the grid. Returns true if successful, false if the cell is
## occupied or out of bounds.
func place_unit(unit: BattleUnit, pos: Vector2i) -> bool:
	if not is_valid_position(pos):
		return false
	if not is_cell_empty(pos):
		return false
	cells[pos] = unit
	unit.grid_position = pos
	return true


## Remove and return the unit at the given position. Returns null if empty.
func remove_unit(pos: Vector2i) -> BattleUnit:
	if not is_valid_position(pos):
		return null
	var unit: BattleUnit = cells.get(pos)
	if unit != null:
		cells[pos] = null
	return unit


## Move a unit from its current position to a new one. Returns true on success.
func move_unit(unit: BattleUnit, new_pos: Vector2i) -> bool:
	if not is_valid_position(new_pos):
		return false
	if not is_cell_empty(new_pos):
		return false
	var old_pos: Vector2i = unit.grid_position
	if is_valid_position(old_pos):
		cells[old_pos] = null
	cells[new_pos] = unit
	unit.grid_position = new_pos
	return true

## -- Queries ------------------------------------------------------------------

## Get the unit at a position, or null if empty/invalid.
func get_unit_at(pos: Vector2i) -> BattleUnit:
	if not is_valid_position(pos):
		return null
	return cells.get(pos)


## Whether a cell exists and has no unit.
func is_cell_empty(pos: Vector2i) -> bool:
	if not is_valid_position(pos):
		return false
	return cells.get(pos) == null


## Whether coordinates are within the grid bounds.
func is_valid_position(pos: Vector2i) -> bool:
	return pos.x >= 0 and pos.x < GRID_WIDTH and pos.y >= 0 and pos.y < TOTAL_HEIGHT


## Get the team that owns a row (0 = player, 1 = enemy).
func get_team_for_row(row: int) -> int:
	if row >= PLAYER_ROW_MIN and row <= PLAYER_ROW_MAX:
		return 0
	return 1


## Get all living units on a given team.
func get_all_units(team: int) -> Array[BattleUnit]:
	var result: Array[BattleUnit] = []
	var row_min: int = PLAYER_ROW_MIN if team == 0 else ENEMY_ROW_MIN
	var row_max: int = PLAYER_ROW_MAX if team == 0 else ENEMY_ROW_MAX
	for y in range(row_min, row_max + 1):
		for x in range(GRID_WIDTH):
			var unit: BattleUnit = cells.get(Vector2i(x, y))
			if unit != null and unit.is_alive:
				result.append(unit)
	return result


## Get all units across both teams.
func get_all_living_units() -> Array[BattleUnit]:
	var result: Array[BattleUnit] = []
	for pos in cells:
		var unit: BattleUnit = cells[pos]
		if unit != null and unit.is_alive:
			result.append(unit)
	return result

## -- Range Queries ------------------------------------------------------------

## Get all living units within Manhattan distance of the origin.
func get_units_in_range(origin: Vector2i, range_val: int) -> Array[BattleUnit]:
	var result: Array[BattleUnit] = []
	for pos in cells:
		if cells[pos] == null:
			continue
		var unit: BattleUnit = cells[pos]
		if not unit.is_alive:
			continue
		var dist: int = absi(pos.x - origin.x) + absi(pos.y - origin.y)
		if dist <= range_val:
			result.append(unit)
	return result


## Get the four cardinal-adjacent cell coordinates (within bounds).
func get_adjacent_cells(pos: Vector2i) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	var offsets: Array[Vector2i] = [
		Vector2i(-1, 0), Vector2i(1, 0),
		Vector2i(0, -1), Vector2i(0, 1),
	]
	for offset in offsets:
		var adj: Vector2i = pos + offset
		if is_valid_position(adj):
			result.append(adj)
	return result


## Manhattan distance between two grid positions.
func get_distance(a: Vector2i, b: Vector2i) -> int:
	return absi(a.x - b.x) + absi(a.y - b.y)

## -- Pattern Resolution -------------------------------------------------------

## Resolve all cells affected by a targeting pattern, starting from an origin
## and aimed at/toward a direction.
##
## [origin]    -- The caster's grid position.
## [pattern]   -- One of the 15 canonical pattern names.
## [direction] -- A normalized direction vector toward the primary target.
##                For patterns like "single" this is the target position itself.
##
## Returns an array of valid grid positions (deduplicated, in-bounds).
func get_cells_in_pattern(
	origin: Vector2i,
	pattern: String,
	direction: Vector2i,
) -> Array[Vector2i]:
	var result: Array[Vector2i] = []

	match pattern:
		"single":
			# direction IS the target position for single-target patterns.
			result.append(direction)

		"single_ally":
			result.append(direction)

		"self":
			result.append(origin)

		"row":
			# The entire row of the target cell.
			var target_y: int = direction.y
			for x in range(GRID_WIDTH):
				result.append(Vector2i(x, target_y))

		"column":
			# The entire column of the target cell.
			var target_x: int = direction.x
			for y in range(TOTAL_HEIGHT):
				result.append(Vector2i(target_x, y))

		"cross":
			# Plus-shaped pattern centered on the target.
			result.append(direction)
			for offset in [Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, -1), Vector2i(0, 1)]:
				result.append(direction + offset)

		"diamond":
			# Diamond (Manhattan radius 2) centered on target.
			for dx in range(-2, 3):
				for dy in range(-2, 3):
					if absi(dx) + absi(dy) <= 2:
						result.append(Vector2i(direction.x + dx, direction.y + dy))

		"aoe_circle":
			# 3x3 square area centered on the target.
			for dx in range(-1, 2):
				for dy in range(-1, 2):
					result.append(Vector2i(direction.x + dx, direction.y + dy))

		"random":
			# Random pattern: direction is treated as the selected target.
			# The caller (MultiTargetResolver) handles selecting random targets.
			result.append(direction)

		"all":
			# Every enemy cell (opponent side of the field).
			var caster_team: int = get_team_for_row(origin.y)
			var enemy_row_min: int = ENEMY_ROW_MIN if caster_team == 0 else PLAYER_ROW_MIN
			var enemy_row_max: int = ENEMY_ROW_MAX if caster_team == 0 else PLAYER_ROW_MAX
			for y in range(enemy_row_min, enemy_row_max + 1):
				for x in range(GRID_WIDTH):
					result.append(Vector2i(x, y))

		"all_allies":
			# Every ally cell (caster's side of the field).
			var caster_team: int = get_team_for_row(origin.y)
			var ally_row_min: int = PLAYER_ROW_MIN if caster_team == 0 else ENEMY_ROW_MIN
			var ally_row_max: int = PLAYER_ROW_MAX if caster_team == 0 else ENEMY_ROW_MAX
			for y in range(ally_row_min, ally_row_max + 1):
				for x in range(GRID_WIDTH):
					result.append(Vector2i(x, y))

		"adjacent":
			# Four cardinal cells around the target, plus the target itself.
			result.append(direction)
			for offset in [Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, -1), Vector2i(0, 1)]:
				result.append(direction + offset)

		"adjacent_allies":
			# Cardinal cells around the caster (for ally-buff abilities).
			result.append(origin)
			for offset in [Vector2i(-1, 0), Vector2i(1, 0), Vector2i(0, -1), Vector2i(0, 1)]:
				result.append(origin + offset)

		"line":
			# A straight line from origin toward direction, up to grid edge.
			var dir_vec: Vector2i = _normalize_direction(origin, direction)
			if dir_vec != Vector2i.ZERO:
				var current: Vector2i = origin + dir_vec
				while is_valid_position(current):
					result.append(current)
					current += dir_vec

		"pierce":
			# Like line, but explicitly marks all cells for piercing projectiles.
			var dir_vec: Vector2i = _normalize_direction(origin, direction)
			if dir_vec != Vector2i.ZERO:
				var current: Vector2i = origin + dir_vec
				while is_valid_position(current):
					result.append(current)
					current += dir_vec

		_:
			push_warning("BattleGrid: Unknown pattern '%s', defaulting to single target." % pattern)
			result.append(direction)

	# Filter to valid, unique positions.
	return _filter_valid_unique(result)

## -- Private Helpers ----------------------------------------------------------

## Get a normalized cardinal/diagonal direction from one cell to another.
func _normalize_direction(from: Vector2i, to: Vector2i) -> Vector2i:
	var diff: Vector2i = to - from
	if diff == Vector2i.ZERO:
		return Vector2i.ZERO
	return Vector2i(signi(diff.x), signi(diff.y))


## Filter a list of positions to only valid, unique grid cells.
func _filter_valid_unique(positions: Array[Vector2i]) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for pos in positions:
		if is_valid_position(pos) and pos not in result:
			result.append(pos)
	return result

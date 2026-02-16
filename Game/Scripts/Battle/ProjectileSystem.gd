## ProjectileSystem -- [P3-009] Manages projectile creation, pathing, and
## pierce logic for ranged abilities on the battle grid.
class_name ProjectileSystem
extends RefCounted

## -- Constants ----------------------------------------------------------------

## Default projectile speed in tiles per second.
const DEFAULT_SPEED: float = 8.0

## Minimum speed to prevent division by zero.
const MIN_SPEED: float = 0.5

## -- Projectile Creation ------------------------------------------------------

## Create a projectile definition from a caster position to a target position.
##
## [caster_pos]   -- Grid position of the casting unit.
## [target_pos]   -- Grid position of the primary target.
## [ability]      -- The AbilityData being used (determines pierce, element, etc.).
## [speed]        -- Travel speed in tiles per second.
##
## Returns:
## {
##   path: Array[Vector2i],       -- Ordered grid cells the projectile traverses
##   speed: float,                -- Tiles per second
##   is_piercing: bool,           -- Whether the projectile continues after hitting
##   element: String,             -- Element type for visual effects
##   start_pos: Vector2i,         -- Origin cell
##   end_pos: Vector2i,           -- Final destination cell
## }
func create_projectile(
	caster_pos: Vector2i,
	target_pos: Vector2i,
	ability: AbilityData,
	speed: float = DEFAULT_SPEED,
) -> Dictionary:
	var is_piercing: bool = ability.targeting_type == "pierce"
	var actual_speed: float = maxf(speed, MIN_SPEED)

	# Calculate the path from caster to target (or grid edge for pierce).
	var path: Array[Vector2i] = _calculate_path(caster_pos, target_pos, is_piercing)

	var end_pos: Vector2i = target_pos
	if not path.is_empty():
		end_pos = path[path.size() - 1]

	return {
		"path": path,
		"speed": actual_speed,
		"is_piercing": is_piercing,
		"element": ability.element_type,
		"start_pos": caster_pos,
		"end_pos": end_pos,
	}

## -- Pierce Target Detection --------------------------------------------------

## Find all units along a projectile's path that would be hit by a piercing attack.
## Returns units in order of distance from the caster.
func check_pierce_targets(path: Array[Vector2i], grid: BattleGrid) -> Array[BattleUnit]:
	var targets: Array[BattleUnit] = []
	for cell in path:
		var unit: BattleUnit = grid.get_unit_at(cell)
		if unit != null and unit.is_alive:
			targets.append(unit)
	return targets

## -- Travel Time Calculation --------------------------------------------------

## Calculate the time in seconds for a projectile to travel between two positions.
func get_projectile_travel_time(start: Vector2i, end: Vector2i, speed: float) -> float:
	if speed <= 0.0:
		speed = DEFAULT_SPEED
	# Use Euclidean distance for smoother travel time calculation.
	var diff: Vector2 = Vector2(end - start)
	var distance: float = diff.length()
	return distance / maxf(speed, MIN_SPEED)

## -- Path Utilities -----------------------------------------------------------

## Get the direction vector from a projectile's path (for visual rotation).
func get_projectile_direction(start: Vector2i, end: Vector2i) -> Vector2:
	var diff: Vector2 = Vector2(end - start)
	if diff.is_zero_approx():
		return Vector2.RIGHT
	return diff.normalized()

## -- Private Helpers ----------------------------------------------------------

## Calculate the grid path from caster to target using Bresenham-like line.
## For piercing projectiles, the path continues to the grid edge.
func _calculate_path(
	start: Vector2i,
	target: Vector2i,
	is_piercing: bool,
) -> Array[Vector2i]:
	var path: Array[Vector2i] = []

	# Get normalized direction (cardinal or diagonal).
	var diff: Vector2i = target - start
	if diff == Vector2i.ZERO:
		return path

	var direction: Vector2i = Vector2i(signi(diff.x), signi(diff.y))

	if is_piercing:
		# Continue in the direction until off-grid (estimated max 20 tiles).
		var current: Vector2i = start + direction
		var steps: int = 0
		while steps < 20:
			path.append(current)
			current += direction
			steps += 1
	else:
		# Path from start to target only.
		var current: Vector2i = start + direction
		var steps: int = 0
		var max_steps: int = absi(diff.x) + absi(diff.y)
		while steps < max_steps:
			path.append(current)
			if current == target:
				break
			current += direction
			steps += 1
		# If we didn't reach the exact target (diagonal vs cardinal mismatch),
		# add the target explicitly.
		if path.is_empty() or path[path.size() - 1] != target:
			path.append(target)

	return path

## KnockbackSystem -- [P3-008] Grid-based knockback physics for Sprite Wars.
## Handles wall collisions, unit collisions, chain knockback, and DEF-based
## knockback resistance.
class_name KnockbackSystem
extends RefCounted

## -- Constants ----------------------------------------------------------------

## Wall collision damage: 10% of the knocked-back unit's max HP.
const WALL_DAMAGE_FRACTION: float = 0.10

## Unit collision damage: 5% of each colliding unit's max HP.
const COLLISION_DAMAGE_FRACTION: float = 0.05

## High DEF reduces knockback distance. DEF threshold per tile of reduction.
const DEF_RESISTANCE_DIVISOR: float = 50.0

## Maximum knockback distance allowed (prevents infinite chain loops).
const MAX_KNOCKBACK_DISTANCE: int = 6

## -- Main Processing ----------------------------------------------------------

## Process knockback on a unit in a given direction for a given distance.
##
## [unit]      -- The BattleUnit being knocked back.
## [direction] -- The knockback direction as a normalized Vector2i (e.g. (0,1), (-1,0)).
## [distance]  -- The number of tiles to push the unit.
## [grid]      -- The BattleGrid for collision detection and movement.
##
## Returns:
## {
##   final_position: Vector2i,         -- Where the unit ends up
##   wall_collision: bool,             -- Whether the unit hit a wall
##   wall_damage: int,                 -- Damage from wall collision
##   unit_collisions: Array[{          -- Collisions with other units
##     unit: BattleUnit,
##     damage: int,                    -- Damage dealt to the collided unit
##   }],
##   self_collision_damage: int,       -- Total collision damage to the knocked unit
##   tiles_traveled: int,              -- How many tiles the unit actually moved
## }
func process_knockback(
	unit: BattleUnit,
	direction: Vector2i,
	distance: int,
	grid: BattleGrid,
) -> Dictionary:
	var result := {
		"final_position": unit.grid_position,
		"wall_collision": false,
		"wall_damage": 0,
		"unit_collisions": [],
		"self_collision_damage": 0,
		"tiles_traveled": 0,
	}

	if unit == null or not unit.is_alive:
		return result

	if direction == Vector2i.ZERO or distance <= 0:
		return result

	# -- Apply DEF-based knockback resistance --------------------------------
	var effective_distance: int = _apply_resistance(unit, distance)
	if effective_distance <= 0:
		return result

	# Clamp to max.
	effective_distance = mini(effective_distance, MAX_KNOCKBACK_DISTANCE)

	# -- Remove unit from current position -----------------------------------
	var start_pos: Vector2i = unit.grid_position
	grid.remove_unit(start_pos)

	var current_pos: Vector2i = start_pos
	var tiles_moved: int = 0

	# -- Step through each tile -----------------------------------------------
	for _step in range(effective_distance):
		var next_pos: Vector2i = current_pos + direction

		# Check wall collision (out of bounds).
		if not grid.is_valid_position(next_pos):
			result["wall_collision"] = true
			result["wall_damage"] = _calculate_wall_damage(unit)
			unit.take_damage(result["wall_damage"])
			break

		# Check unit collision.
		var blocking_unit: BattleUnit = grid.get_unit_at(next_pos)
		if blocking_unit != null and blocking_unit.is_alive:
			# Collision: damage both units.
			var collision_damage_self: int = _calculate_collision_damage(unit)
			var collision_damage_other: int = _calculate_collision_damage(blocking_unit)

			unit.take_damage(collision_damage_self)
			result["self_collision_damage"] += collision_damage_self

			var other_damage_result: Dictionary = blocking_unit.take_damage(collision_damage_other)

			result["unit_collisions"].append({
				"unit": blocking_unit,
				"damage": collision_damage_other,
			})

			# Chain knockback: push the blocking unit 1 tile in the same direction.
			if blocking_unit.is_alive:
				var chain_result: Dictionary = _process_chain_knockback(
					blocking_unit, direction, 1, grid
				)
				# If the chain cleared the space, we can continue.
				if grid.is_cell_empty(next_pos):
					current_pos = next_pos
					tiles_moved += 1
					continue

			# Space still blocked; stop here.
			break

		# Empty cell: move through.
		current_pos = next_pos
		tiles_moved += 1

	# -- Place unit at final position -----------------------------------------
	if grid.is_cell_empty(current_pos):
		grid.place_unit(unit, current_pos)
	else:
		# Fallback: try to place near the current position.
		var placed: bool = false
		for fallback in grid.get_adjacent_cells(current_pos):
			if grid.is_cell_empty(fallback):
				grid.place_unit(unit, fallback)
				current_pos = fallback
				placed = true
				break
		if not placed:
			# Last resort: place back at start.
			if grid.is_cell_empty(start_pos):
				grid.place_unit(unit, start_pos)
				current_pos = start_pos
			else:
				# This shouldn't happen, but handle gracefully.
				grid.place_unit(unit, current_pos)

	result["final_position"] = unit.grid_position
	result["tiles_traveled"] = tiles_moved
	return result

## -- Private Helpers ----------------------------------------------------------

## Apply DEF-based knockback resistance. Higher DEF reduces distance.
func _apply_resistance(unit: BattleUnit, base_distance: int) -> int:
	var def_val: float = float(unit.effective_stats.get("def", 0))
	var reduction: int = int(def_val / DEF_RESISTANCE_DIVISOR)
	return maxi(0, base_distance - reduction)


## Calculate wall collision damage (10% max HP).
func _calculate_wall_damage(unit: BattleUnit) -> int:
	return maxi(1, int(float(unit.max_hp) * WALL_DAMAGE_FRACTION))


## Calculate unit collision damage (5% of the unit's own max HP).
func _calculate_collision_damage(unit: BattleUnit) -> int:
	return maxi(1, int(float(unit.max_hp) * COLLISION_DAMAGE_FRACTION))


## Process chain knockback (when a knocked unit hits another unit).
## Limited to 1 tile to prevent infinite chains.
func _process_chain_knockback(
	unit: BattleUnit,
	direction: Vector2i,
	distance: int,
	grid: BattleGrid,
) -> Dictionary:
	# Chain knockback uses a simplified version -- no further chaining.
	var result := {
		"final_position": unit.grid_position,
		"moved": false,
	}

	var next_pos: Vector2i = unit.grid_position + direction

	if not grid.is_valid_position(next_pos):
		# Wall: take wall damage.
		var wall_dmg: int = _calculate_wall_damage(unit)
		unit.take_damage(wall_dmg)
		return result

	if grid.is_cell_empty(next_pos):
		# Move the unit.
		grid.remove_unit(unit.grid_position)
		grid.place_unit(unit, next_pos)
		result["final_position"] = next_pos
		result["moved"] = true

	# If blocked by another unit, chain stops (no further chains).
	return result

## MultiTargetResolver -- [P3-010] Resolves multi-target ability effects,
## including AoE patterns, random targets, damage falloff, and sequential
## vs simultaneous resolution.
class_name MultiTargetResolver
extends RefCounted

## -- Constants ----------------------------------------------------------------

## Splash damage falloff: secondary targets take this fraction of primary damage.
const SPLASH_FALLOFF: float = 0.75

## Random target count when pattern is "random" (hits 2-4 random enemies).
const RANDOM_TARGET_MIN: int = 2
const RANDOM_TARGET_MAX: int = 4

## -- Multi-Target Resolution --------------------------------------------------

## Resolve all units affected by a multi-target ability.
##
## [ability]         -- The AbilityData being used.
## [caster]          -- The BattleUnit using the ability.
## [primary_target]  -- The grid position of the primary target (player selection).
## [grid]            -- The BattleGrid for position lookups.
##
## Returns an array of BattleUnits that will be affected, in hit order.
func resolve_multi_target(
	ability: AbilityData,
	caster: BattleUnit,
	primary_target: Vector2i,
	grid: BattleGrid,
) -> Array[BattleUnit]:
	var pattern: String = ability.targeting_type
	var targets: Array[BattleUnit] = []

	# Get all cells affected by this pattern.
	var affected_cells: Array[Vector2i] = grid.get_cells_in_pattern(
		caster.grid_position, pattern, primary_target
	)

	match pattern:
		"single", "single_ally":
			# Single target: just the unit at the primary target.
			var unit: BattleUnit = grid.get_unit_at(primary_target)
			if unit != null and unit.is_alive:
				targets.append(unit)

		"self":
			targets.append(caster)

		"random":
			# Pick random enemies within the affected area.
			targets = _resolve_random_targets(caster, grid)

		"all":
			# All living enemies.
			var enemy_team: int = 1 if caster.team == 0 else 0
			targets = grid.get_all_units(enemy_team)

		"all_allies":
			# All living allies.
			targets = grid.get_all_units(caster.team)

		"adjacent_allies":
			# Caster + adjacent allies.
			for cell in affected_cells:
				var unit: BattleUnit = grid.get_unit_at(cell)
				if unit != null and unit.is_alive and unit.team == caster.team:
					targets.append(unit)

		_:
			# Pattern-based AoE: collect all living units in the affected cells.
			# Filter to the appropriate team based on the ability's targeting.
			var is_ally_ability: bool = pattern in ["adjacent_allies", "all_allies", "single_ally", "self"]
			for cell in affected_cells:
				var unit: BattleUnit = grid.get_unit_at(cell)
				if unit == null or not unit.is_alive:
					continue
				if is_ally_ability:
					if unit.team == caster.team:
						targets.append(unit)
				else:
					if unit.team != caster.team:
						targets.append(unit)

	# Remove duplicates while preserving order.
	return _deduplicate(targets)

## -- Damage Falloff -----------------------------------------------------------

## Calculate the damage for a specific target in a multi-target ability.
## The primary target (index 0) receives full damage; others receive reduced.
##
## [base_damage]     -- The original damage value.
## [target_index]    -- This target's index in the hit order (0 = primary).
## [total_targets]   -- Total number of targets being hit.
##
## Returns the adjusted damage value.
func apply_damage_falloff(base_damage: int, target_index: int, total_targets: int) -> int:
	if total_targets <= 1 or target_index == 0:
		return base_damage

	# Splash damage: secondary targets take 75% damage.
	return maxi(1, int(float(base_damage) * SPLASH_FALLOFF))

## -- Resolution Order ---------------------------------------------------------

## Determine whether a multi-target ability resolves sequentially or simultaneously.
##
## "sequential":    Each target is resolved one at a time (e.g. chain lightning).
##                  Damage is calculated independently, crits rolled separately.
## "simultaneous":  All targets are resolved at once (e.g. earthquake).
##                  Single damage roll shared across all targets.
func resolve_sequential_vs_simultaneous(ability: AbilityData) -> String:
	match ability.targeting_type:
		"line", "pierce", "random":
			# These patterns hit targets one by one in sequence.
			return "sequential"
		_:
			# AoE patterns resolve simultaneously.
			return "simultaneous"

## -- Helper: Count Enemies in Area --------------------------------------------

## Count how many enemy units would be hit by an AoE ability at a given position.
## Useful for AI decision-making.
func count_targets_in_area(
	ability: AbilityData,
	caster: BattleUnit,
	target_pos: Vector2i,
	grid: BattleGrid,
) -> int:
	var targets: Array[BattleUnit] = resolve_multi_target(ability, caster, target_pos, grid)
	return targets.size()

## -- Private Helpers ----------------------------------------------------------

## Resolve random targets from the opposing team.
func _resolve_random_targets(caster: BattleUnit, grid: BattleGrid) -> Array[BattleUnit]:
	var enemy_team: int = 1 if caster.team == 0 else 0
	var all_enemies: Array[BattleUnit] = grid.get_all_units(enemy_team)

	if all_enemies.is_empty():
		return []

	var count: int = randi_range(RANDOM_TARGET_MIN, mini(RANDOM_TARGET_MAX, all_enemies.size()))
	var selected: Array[BattleUnit] = []

	# If fewer enemies than required count, just target all of them.
	if all_enemies.size() <= count:
		return all_enemies

	# Shuffle and pick. Allow duplicate targeting (same unit hit multiple times).
	for _i in range(count):
		var idx: int = randi() % all_enemies.size()
		selected.append(all_enemies[idx])

	return selected


## Remove duplicate entries from a BattleUnit array while preserving order.
func _deduplicate(units: Array[BattleUnit]) -> Array[BattleUnit]:
	var seen: Array[BattleUnit] = []
	for unit in units:
		if unit not in seen:
			seen.append(unit)
	return seen

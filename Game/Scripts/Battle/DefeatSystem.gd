## DefeatSystem -- [P3-011] Handles unit defeat (fainting) and cleanup.
## Removes defeated units from the grid and turn order, triggers on-faint
## abilities, and returns results for UI animation.
class_name DefeatSystem
extends RefCounted

## -- Main Processing ----------------------------------------------------------

## Process the defeat of a unit that has reached 0 HP.
##
## [unit]        -- The BattleUnit that fainted.
## [grid]        -- The BattleGrid to remove the unit from.
## [turn_order]  -- The TurnOrderSystem to remove the unit from.
##
## Returns:
## {
##   unit: BattleUnit,              -- The fainted unit
##   position: Vector2i,            -- Where the unit was standing
##   team: int,                     -- Which team lost the unit
##   on_faint_effects: Array,       -- Any on-faint effects triggered
##   display_name: String,          -- Name for UI display
## }
func process_defeat(
	unit: BattleUnit,
	grid: BattleGrid,
	turn_order: TurnOrderSystem,
) -> Dictionary:
	var result := {
		"unit": unit,
		"position": unit.grid_position,
		"team": unit.team,
		"on_faint_effects": [],
		"display_name": unit.get_display_name(),
	}

	# -- Remove from grid -----------------------------------------------------
	grid.remove_unit(unit.grid_position)

	# -- Remove from turn order -----------------------------------------------
	turn_order.remove_unit(unit)

	# -- Check for on-faint abilities -----------------------------------------
	# Some abilities/status effects trigger when a unit faints.
	# Currently we check for any "on_faint" marked effects.
	var faint_effects: Array = _check_on_faint_effects(unit, grid)
	result["on_faint_effects"] = faint_effects

	return result

## -- Batch Processing ---------------------------------------------------------

## Process multiple defeats at once (e.g. after an AoE attack).
## Returns an array of defeat result dictionaries.
func process_defeats(
	units: Array[BattleUnit],
	grid: BattleGrid,
	turn_order: TurnOrderSystem,
) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	for unit in units:
		if unit != null and not unit.is_alive:
			results.append(process_defeat(unit, grid, turn_order))
	return results

## -- Faint Detection ----------------------------------------------------------

## Check an array of ability results for any units that fainted.
## Returns the list of newly fainted BattleUnits.
func check_for_defeats(ability_results: Array[Dictionary]) -> Array[BattleUnit]:
	var fainted: Array[BattleUnit] = []
	for result in ability_results:
		if result.get("is_fainted", false):
			var target: BattleUnit = result.get("target")
			if target != null and target not in fainted:
				fainted.append(target)
	return fainted

## -- Private Helpers ----------------------------------------------------------

## Check for on-faint effects (e.g. explosion on defeat, ally buff on faint).
## This is a hook for future expansion. Currently returns an empty array.
func _check_on_faint_effects(unit: BattleUnit, grid: BattleGrid) -> Array:
	var effects: Array = []

	# Future: iterate through the unit's passive abilities or status effects
	# for any with an "on_faint" trigger, and process them.
	# Example: "Toxic Cloud" -- poisons adjacent enemies when this unit faints.
	# Example: "Last Stand" -- heals all allies for 10% HP when this unit faints.

	# For now, check if any active status effects have on-faint behavior.
	for entry in unit.active_status_effects:
		var effect_data: StatusEffectData = entry.get("effect_data")
		if effect_data == null:
			continue
		# Placeholder: on-faint effects would be a separate data field.
		# We emit via EventBus in BattleManager instead.

	return effects

## StatusEffectSystem -- [P3-007] Manages application, processing, and removal
## of status effects on BattleUnits during combat.
class_name StatusEffectSystem
extends RefCounted

## -- Constants ----------------------------------------------------------------

## Conflicting effect pairs: if one is active, the other replaces or is rejected.
## Maps sub_type -> Array of conflicting sub_types.
const CONFLICT_MAP: Dictionary = {
	"burn": ["freeze"],
	"freeze": ["burn"],
	"sleep": ["stun"],
	"stun": ["sleep"],
}

## -- Effect Application -------------------------------------------------------

## Apply a status effect to a unit. Returns true if the effect was successfully applied.
##
## Handles:
## - Type immunity checks
## - Stacking rules (none, refresh, stack, replace)
## - Conflicting effect resolution
func apply_effect(unit: BattleUnit, effect: StatusEffectData) -> bool:
	if unit == null or effect == null:
		return false

	if not unit.is_alive:
		return false

	# Check type immunity.
	if unit.is_status_immune(effect.effect_name.to_lower()):
		return false

	# Check for conflicting effects.
	if _has_conflict(unit, effect):
		# Remove the conflicting effect and apply the new one.
		_resolve_conflict(unit, effect)

	# Check if the unit already has this effect.
	var existing_idx: int = _find_effect_index(unit, effect.effect_id)

	if existing_idx >= 0:
		# Effect already exists -- apply stacking rule.
		match effect.stacking_rule:
			"none":
				return false  # Reject duplicate.

			"refresh":
				# Reset duration without changing stacks.
				unit.active_status_effects[existing_idx]["remaining_turns"] = effect.duration_turns
				return true

			"stack":
				# Increase stack count up to max.
				var entry: Dictionary = unit.active_status_effects[existing_idx]
				if entry["stacks"] < effect.max_stacks:
					entry["stacks"] += 1
					entry["remaining_turns"] = effect.duration_turns
					# Re-apply the stat modifier for the additional stack.
					_apply_stat_modifiers(unit, effect, 1)
					return true
				else:
					# At max stacks -- refresh duration instead.
					entry["remaining_turns"] = effect.duration_turns
					return false

			"replace":
				# Remove old, apply fresh.
				_remove_effect_at_index(unit, existing_idx, effect)
				_add_new_effect(unit, effect)
				return true

			_:
				return false
	else:
		# New effect -- apply it.
		_add_new_effect(unit, effect)
		return true

## -- Turn Processing ----------------------------------------------------------

## Process all active effects at the start/end of a unit's turn.
## Returns an array of result dictionaries for each effect processed:
## {effect_name: String, result_type: String, value: int/float}
##
## result_type can be: "dot_damage", "dot_heal", "stat_mod", "action_prevented",
##                     "forced_movement", "break_free"
func process_turn_effects(unit: BattleUnit) -> Array[Dictionary]:
	var results: Array[Dictionary] = []

	if unit == null or not unit.is_alive:
		return results

	# Iterate through a copy since effects might be removed during processing.
	var effects_copy: Array[Dictionary] = unit.active_status_effects.duplicate()

	for entry in effects_copy:
		var effect_data: StatusEffectData = entry.get("effect_data")
		if effect_data == null:
			continue

		var stacks: int = entry.get("stacks", 1)

		# -- Damage over Time --
		if effect_data.has_dot():
			var dot_per_tick: int = effect_data.get_dot_damage(unit.max_hp)
			var total_dot: int = dot_per_tick * stacks

			if total_dot > 0:
				# Damage.
				var dmg_result: Dictionary = unit.take_damage(total_dot)
				results.append({
					"effect_name": effect_data.effect_name,
					"result_type": "dot_damage",
					"value": dmg_result["actual_damage"],
				})
			elif total_dot < 0:
				# Healing (negative DoT = regen).
				var heal_amount: int = unit.heal(absi(total_dot))
				results.append({
					"effect_name": effect_data.effect_name,
					"result_type": "dot_heal",
					"value": heal_amount,
				})

		# -- Action Prevention --
		if effect_data.prevents_action:
			# Check for break-free chance (e.g. sleep).
			if effect_data.break_free_chance > 0.0 and randf() < effect_data.break_free_chance:
				results.append({
					"effect_name": effect_data.effect_name,
					"result_type": "break_free",
					"value": 0,
				})
				# Remove the effect since the unit broke free.
				remove_effect(unit, effect_data.effect_id)
				continue
			else:
				results.append({
					"effect_name": effect_data.effect_name,
					"result_type": "action_prevented",
					"value": 0,
				})

		# -- Forced Movement --
		if effect_data.forces_movement:
			results.append({
				"effect_name": effect_data.effect_name,
				"result_type": "forced_movement",
				"value": 0,
			})

	return results

## -- Duration Ticking ---------------------------------------------------------

## Tick down all effect durations by 1 turn. Returns an array of expired effect_ids.
func tick_durations(unit: BattleUnit) -> Array[int]:
	var expired: Array[int] = []

	if unit == null:
		return expired

	# Iterate backwards to safely remove expired entries.
	var i: int = unit.active_status_effects.size() - 1
	while i >= 0:
		var entry: Dictionary = unit.active_status_effects[i]
		var effect_data: StatusEffectData = entry.get("effect_data")

		if effect_data == null:
			unit.active_status_effects.remove_at(i)
			i -= 1
			continue

		# Permanent effects (-1 duration) never expire naturally.
		if entry["remaining_turns"] < 0:
			i -= 1
			continue

		entry["remaining_turns"] -= 1

		if entry["remaining_turns"] <= 0:
			expired.append(effect_data.effect_id)
			_remove_effect_at_index(unit, i, effect_data)

		i -= 1

	return expired

## -- Effect Removal -----------------------------------------------------------

## Remove a specific effect by ID from a unit.
func remove_effect(unit: BattleUnit, effect_id: int) -> void:
	var idx: int = _find_effect_index(unit, effect_id)
	if idx >= 0:
		var effect_data: StatusEffectData = unit.active_status_effects[idx].get("effect_data")
		_remove_effect_at_index(unit, idx, effect_data)


## Remove all effects of a given type ("buff", "debuff", "condition").
## Used for cleanse abilities.
func remove_all_effects(unit: BattleUnit, effect_type: String) -> void:
	if unit == null:
		return

	var i: int = unit.active_status_effects.size() - 1
	while i >= 0:
		var entry: Dictionary = unit.active_status_effects[i]
		var effect_data: StatusEffectData = entry.get("effect_data")
		if effect_data != null and effect_data.effect_type == effect_type:
			if effect_data.can_be_cleansed:
				_remove_effect_at_index(unit, i, effect_data)
		i -= 1


## Remove all effects from a unit (full cleanse).
func remove_all(unit: BattleUnit) -> void:
	if unit == null:
		return
	while not unit.active_status_effects.is_empty():
		var entry: Dictionary = unit.active_status_effects[0]
		var effect_data: StatusEffectData = entry.get("effect_data")
		_remove_effect_at_index(unit, 0, effect_data)

## -- Conflict Checking --------------------------------------------------------

## Check if applying a new effect would conflict with an existing one.
func check_conflicting_effects(unit: BattleUnit, new_effect: StatusEffectData) -> bool:
	return _has_conflict(unit, new_effect)

## -- Private Helpers ----------------------------------------------------------

## Find the index of an effect in the unit's active effects array.
func _find_effect_index(unit: BattleUnit, effect_id: int) -> int:
	for i in range(unit.active_status_effects.size()):
		var entry: Dictionary = unit.active_status_effects[i]
		var ed: StatusEffectData = entry.get("effect_data")
		if ed != null and ed.effect_id == effect_id:
			return i
	return -1


## Add a brand new effect to a unit.
func _add_new_effect(unit: BattleUnit, effect: StatusEffectData) -> void:
	var entry := {
		"effect_data": effect,
		"remaining_turns": effect.duration_turns,
		"stacks": 1,
	}
	unit.active_status_effects.append(entry)

	# Apply stat modifiers.
	_apply_stat_modifiers(unit, effect, 1)


## Remove an effect at a specific index, cleaning up stat modifiers.
func _remove_effect_at_index(unit: BattleUnit, index: int, effect_data: StatusEffectData) -> void:
	if index < 0 or index >= unit.active_status_effects.size():
		return

	var stacks: int = unit.active_status_effects[index].get("stacks", 1)
	unit.active_status_effects.remove_at(index)

	# Reverse stat modifiers.
	if effect_data != null:
		_remove_stat_modifiers(unit, effect_data, stacks)


## Apply stat modifiers from an effect (considering stack count).
func _apply_stat_modifiers(unit: BattleUnit, effect: StatusEffectData, stacks: int) -> void:
	if not effect.has_stat_modifiers():
		return
	for stat_key in effect.stat_modifiers:
		var mult: float = float(effect.stat_modifiers[stat_key])
		for _s in range(stacks):
			unit.apply_stat_modifier(stat_key, mult)


## Remove stat modifiers from an effect (considering stack count).
func _remove_stat_modifiers(unit: BattleUnit, effect: StatusEffectData, stacks: int) -> void:
	if not effect.has_stat_modifiers():
		return
	for stat_key in effect.stat_modifiers:
		var mult: float = float(effect.stat_modifiers[stat_key])
		for _s in range(stacks):
			unit.remove_stat_modifier(stat_key, mult)


## Check if a new effect conflicts with any active effect on the unit.
func _has_conflict(unit: BattleUnit, new_effect: StatusEffectData) -> bool:
	var new_name_lower: String = new_effect.effect_name.to_lower()
	var conflicts: Array = CONFLICT_MAP.get(new_name_lower, [])
	if conflicts.is_empty():
		return false

	for entry in unit.active_status_effects:
		var existing: StatusEffectData = entry.get("effect_data")
		if existing == null:
			continue
		if existing.effect_name.to_lower() in conflicts:
			return true
	return false


## Remove the conflicting effect and apply the new one.
func _resolve_conflict(unit: BattleUnit, new_effect: StatusEffectData) -> void:
	var new_name_lower: String = new_effect.effect_name.to_lower()
	var conflicts: Array = CONFLICT_MAP.get(new_name_lower, [])

	var i: int = unit.active_status_effects.size() - 1
	while i >= 0:
		var entry: Dictionary = unit.active_status_effects[i]
		var existing: StatusEffectData = entry.get("effect_data")
		if existing != null and existing.effect_name.to_lower() in conflicts:
			_remove_effect_at_index(unit, i, existing)
		i -= 1

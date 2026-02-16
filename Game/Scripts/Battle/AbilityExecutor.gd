## AbilityExecutor -- [P3-006] Complete ability execution pipeline.
## Handles validation, PP consumption, accuracy, damage/heal calculation,
## status effect application, knockback, and result packaging for the UI.
class_name AbilityExecutor
extends RefCounted

## -- Constants ----------------------------------------------------------------

## Default knockback distance for abilities that knock back.
const DEFAULT_KNOCKBACK_DISTANCE: int = 2

## -- Ability Execution Pipeline -----------------------------------------------

## Execute an ability from start to finish.
##
## Pipeline:
## 1. Validate targeting (range, valid targets)
## 2. Consume PP / start cooldown
## 3. Accuracy check per target
## 4. Calculate damage per target (or apply heal/buff)
## 5. Apply status effects (roll against apply_chance)
## 6. Process knockback if ability has it
## 7. Return results array for UI/animation
##
## [caster]       -- The BattleUnit using the ability.
## [ability]      -- The AbilityData being executed.
## [targets]      -- Array of BattleUnits to be affected.
## [grid]         -- The BattleGrid for position lookups.
## [damage_calc]  -- The DamageCalculator instance.
## [element_chart]-- Dictionary of element_id -> ElementData (for effectiveness).
## [status_system]-- The StatusEffectSystem for applying effects.
## [knockback_sys]-- The KnockbackSystem for knockback processing.
## [status_db]    -- Dictionary of effect_id -> StatusEffectData (for looking up effects).
##
## Returns: Array of per-target result dictionaries:
## [{
##   target: BattleUnit,
##   hit: bool,
##   damage: int,
##   is_crit: bool,
##   effectiveness: float,
##   effectiveness_label: String,
##   healed: int,
##   status_applied: Array[String],
##   knockback: Dictionary (or null),
##   is_fainted: bool,
## }]
func execute_ability(
	caster: BattleUnit,
	ability: AbilityData,
	targets: Array[BattleUnit],
	grid: BattleGrid,
	damage_calc: DamageCalculator,
	element_chart: Dictionary = {},
	status_system: StatusEffectSystem = null,
	knockback_sys: KnockbackSystem = null,
	status_db: Dictionary = {},
) -> Array[Dictionary]:
	var results: Array[Dictionary] = []

	if targets.is_empty():
		return results

	# -- Step 2: Consume PP and start cooldown --------------------------------
	caster.consume_pp(ability)

	# -- Process each target --------------------------------------------------
	var target_count: int = targets.size()

	for i in range(target_count):
		var target: BattleUnit = targets[i]
		var result := {
			"target": target,
			"hit": false,
			"damage": 0,
			"is_crit": false,
			"effectiveness": 1.0,
			"effectiveness_label": "neutral",
			"healed": 0,
			"status_applied": [],
			"knockback": null,
			"is_fainted": false,
		}

		if target == null or not target.is_alive:
			results.append(result)
			continue

		# -- Step 3: Accuracy check -------------------------------------------
		if not _check_accuracy(ability):
			result["hit"] = false
			results.append(result)
			continue

		result["hit"] = true

		# -- Step 4: Calculate damage or apply heal/buff ----------------------
		if ability.is_damaging():
			var dmg_result: Dictionary = damage_calc.calculate_damage(
				caster, target, ability, element_chart
			)

			# Apply splash falloff for secondary targets.
			var final_dmg: int = dmg_result["final_damage"]
			if i > 0 and target_count > 1:
				final_dmg = maxi(1, int(float(final_dmg) * 0.75))

			# Apply the damage to the target.
			var take_result: Dictionary = target.take_damage(final_dmg)

			result["damage"] = take_result["actual_damage"]
			result["is_crit"] = dmg_result["is_critical"]
			result["effectiveness"] = dmg_result["effectiveness"]
			result["effectiveness_label"] = dmg_result.get("effectiveness_label", "neutral")
			result["is_fainted"] = take_result["is_fainted"]

		elif ability.base_power <= 0 and _is_healing_ability(ability):
			# Healing ability: heal the target.
			var heal_amount: int = damage_calc.calculate_heal(caster, ability)
			var actual_healed: int = target.heal(heal_amount)
			result["healed"] = actual_healed

		# -- Step 5: Apply status effects -------------------------------------
		if ability.has_status_effects() and status_system != null:
			for effect_id in ability.status_effect_ids:
				# Roll against the ability's apply chance.
				if randf() <= ability.status_apply_chance:
					var effect_data: StatusEffectData = status_db.get(effect_id)
					if effect_data != null:
						var applied: bool = status_system.apply_effect(target, effect_data)
						if applied:
							result["status_applied"].append(effect_data.effect_name)

		# -- Step 6: Process knockback ----------------------------------------
		if knockback_sys != null and _has_knockback(ability) and target.is_alive:
			var kb_direction: Vector2i = _get_knockback_direction(caster, target)
			var kb_result: Dictionary = knockback_sys.process_knockback(
				target, kb_direction, DEFAULT_KNOCKBACK_DISTANCE, grid
			)
			result["knockback"] = kb_result

		results.append(result)

	return results

## -- Validation ---------------------------------------------------------------

## Validate whether a caster can use a specific ability right now.
## Returns {valid: bool, reason: String}.
func validate_ability_use(caster: BattleUnit, ability: AbilityData) -> Dictionary:
	if caster == null:
		return {"valid": false, "reason": "No caster unit."}

	if not caster.is_alive:
		return {"valid": false, "reason": "Caster has fainted."}

	if not caster.can_act:
		return {"valid": false, "reason": "Caster cannot act (stunned/frozen/asleep)."}

	if ability == null:
		return {"valid": false, "reason": "No ability selected."}

	# Check that the caster has this ability equipped.
	if ability.ability_id not in caster.equipped_abilities:
		return {"valid": false, "reason": "Ability not equipped."}

	# Check PP and cooldown.
	if not caster.can_use_ability(ability):
		if caster.ability_cooldowns.has(ability.ability_id):
			var cd: int = caster.ability_cooldowns[ability.ability_id]
			return {"valid": false, "reason": "On cooldown (%d turns)." % cd}
		return {"valid": false, "reason": "No PP remaining."}

	return {"valid": true, "reason": ""}

## -- Target Resolution --------------------------------------------------------

## Get all valid targets for an ability from the caster's perspective.
## Filters by team affinity, range, and alive status.
func get_valid_targets(
	caster: BattleUnit,
	ability: AbilityData,
	grid: BattleGrid,
) -> Array[BattleUnit]:
	var valid: Array[BattleUnit] = []
	var pattern: String = ability.targeting_type

	# Self-targeting abilities.
	if pattern == "self":
		valid.append(caster)
		return valid

	# Determine target team.
	var target_team: int
	var is_ally_pattern: bool = pattern in ["single_ally", "all_allies", "adjacent_allies"]
	if is_ally_pattern:
		target_team = caster.team
	else:
		target_team = 1 if caster.team == 0 else 0

	# Get all living units on the target team.
	var candidates: Array[BattleUnit] = grid.get_all_units(target_team)

	# For "all" patterns, return all candidates.
	if pattern in ["all", "all_allies"]:
		return candidates

	# For range-limited patterns, filter by distance.
	for unit in candidates:
		if unit.is_alive:
			valid.append(unit)

	return valid

## -- Private Helpers ----------------------------------------------------------

## Roll accuracy for an ability hit. Returns true if the attack lands.
func _check_accuracy(ability: AbilityData) -> bool:
	if ability.accuracy >= 1.0:
		return true
	return randf() <= ability.accuracy


## Determine the knockback direction from caster to target.
func _get_knockback_direction(caster: BattleUnit, target: BattleUnit) -> Vector2i:
	var diff: Vector2i = target.grid_position - caster.grid_position
	if diff == Vector2i.ZERO:
		return Vector2i(0, 1)  # Default: push downward.
	return Vector2i(signi(diff.x), signi(diff.y))


## Check if an ability has knockback properties.
## Abilities with "pierce" or "line" targeting inherently have knockback.
func _has_knockback(ability: AbilityData) -> bool:
	# Knockback is determined by targeting type for now.
	# In the future, this could be a field on AbilityData.
	return ability.targeting_type in ["pierce", "line"]


## Check if a non-damaging ability is a healing ability.
## Healing abilities target allies and have base_power > 0 used for heal formula.
func _is_healing_ability(ability: AbilityData) -> bool:
	return ability.targeting_type in ["self", "single_ally", "all_allies", "adjacent_allies"]

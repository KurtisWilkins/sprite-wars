## AbilityExecutor -- [P3-006] Complete ability execution pipeline.
## Handles validation, PP consumption, accuracy, damage/heal calculation,
## status effect application, knockback, and result packaging for the UI.
class_name AbilityExecutor
extends RefCounted

## -- Constants ----------------------------------------------------------------

## Default knockback distance for abilities that knock back.
const DEFAULT_KNOCKBACK_DISTANCE: int = 2

## Knockback distance for abilities explicitly tagged with knockback.
const ENHANCED_KNOCKBACK_DISTANCE: int = 3

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

	# -- Step 1b: Check for Assassin teleport ---------------------------------
	var teleport_result: Dictionary = {}
	if targets.size() == 1 and AssassinTeleportSystem.can_teleport(caster, ability, targets[0]):
		teleport_result = AssassinTeleportSystem.execute_teleport(caster, targets[0], grid)
		if teleport_result.get("success", false):
			EventBus.teleport_executed.emit(
				caster.sprite_instance,
				teleport_result["from_pos"],
				teleport_result["to_pos"]
			)

	# -- Step 2: Consume PP and start cooldown --------------------------------
	caster.consume_pp(ability)

	# -- Emit attack animation signal -----------------------------------------
	var weapon_type: String = _get_caster_weapon_type(caster)
	if not targets.is_empty() and targets[0] != null:
		# Check for class special animation (for ability uses, not auto-attacks).
		var caster_class: String = ""
		if caster.sprite_instance != null:
			caster_class = caster.sprite_instance.class_type
		var class_special: Dictionary = ClassSpecialAnimations.get_special(caster_class)
		if not class_special.is_empty():
			EventBus.special_animation_requested.emit(
				caster.sprite_instance,
				targets[0].sprite_instance if targets[0].sprite_instance else null,
				caster_class
			)
		else:
			EventBus.attack_animation_requested.emit(
				caster.sprite_instance,
				targets[0].sprite_instance if targets[0].sprite_instance else null,
				weapon_type,
				ability.element_type
			)

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

			# Apply teleport backstab bonus if applicable.
			if teleport_result.get("success", false):
				final_dmg = int(float(final_dmg) * teleport_result.get("damage_multiplier", 1.0))
				# Teleport also grants crit bonus (applied to the result).
				if not dmg_result["is_critical"]:
					var extra_crit: float = teleport_result.get("crit_bonus", 0.0)
					if randf() < extra_crit:
						final_dmg = int(float(final_dmg) * 1.5)
						dmg_result["is_critical"] = true

			# Apply the damage to the target.
			var take_result: Dictionary = target.take_damage(final_dmg)

			result["damage"] = take_result["actual_damage"]
			result["is_crit"] = dmg_result["is_critical"]
			result["effectiveness"] = dmg_result["effectiveness"]
			result["effectiveness_label"] = dmg_result.get("effectiveness_label", "neutral")
			result["is_fainted"] = take_result["is_fainted"]

		elif not ability.is_damaging() and _is_healing_ability(ability):
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

		# -- Step 5b: Emit hit impact signal ----------------------------------
		if result["hit"] and result["damage"] > 0:
			var atk_style: int = WeaponAnimationData.get_attack_style(weapon_type)
			EventBus.hit_impact_requested.emit(
				target.sprite_instance if target.sprite_instance else null,
				result["damage"],
				ability.element_type,
				atk_style
			)

		# -- Step 6: Process knockback ----------------------------------------
		if knockback_sys != null and _has_knockback(ability) and target.is_alive:
			var kb_direction: Vector2i = _get_knockback_direction(caster, target)
			var kb_distance: int = _get_knockback_distance(ability)
			var from_pos: Vector2i = target.grid_position
			var kb_result: Dictionary = knockback_sys.process_knockback(
				target, kb_direction, kb_distance, grid
			)
			result["knockback"] = kb_result

			# Emit knockback visual signal.
			if kb_result.get("tiles_traveled", 0) > 0:
				EventBus.knockback_visual_requested.emit(
					target.sprite_instance if target.sprite_instance else null,
					from_pos,
					kb_result["final_position"],
					kb_result["wall_collision"]
				)

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


## Get the equipped weapon type for a caster (for animation selection).
## Uses the class-to-weapon mapping from WeaponThemeData, since equipment
## slots store equipment_id ints (not weapon_type strings directly).
func _get_caster_weapon_type(caster: BattleUnit) -> String:
	if caster.sprite_instance == null:
		return "sword"
	# Look up default weapon from class_type string via WeaponThemeData.
	var class_type: String = caster.sprite_instance.class_type
	if not class_type.is_empty():
		var class_weapon_map: Dictionary = WeaponThemeData.get_class_weapon_map()
		var weapon_type: String = class_weapon_map.get(class_type, "")
		if not weapon_type.is_empty():
			return weapon_type
	# Fallback: use race-to-theme default weapon.
	var race_id: int = caster.sprite_instance.race_id
	if race_id > 0:
		var theme_data: Dictionary = WeaponThemeData.get_theme_for_race(race_id)
		var weapon: String = theme_data.get("weapon", "")
		if not weapon.is_empty():
			return weapon
	return "sword"


## Get the knockback distance for an ability. Abilities with explicit knockback
## targeting get enhanced distance; pierce/line get default.
func _get_knockback_distance(ability: AbilityData) -> int:
	# Future: could add a knockback_distance field to AbilityData.
	if ability.targeting_type == "pierce":
		return ENHANCED_KNOCKBACK_DISTANCE
	return DEFAULT_KNOCKBACK_DISTANCE

## BattleAI -- [P3-013] Enemy AI decision-making for auto-battler combat.
## Evaluates abilities and targets to choose the best action each turn.
## Uses a priority-based system: type advantage > heal when low > highest damage > status.
class_name BattleAI
extends RefCounted

## -- Constants ----------------------------------------------------------------

## HP threshold for healing priority (30%).
const HEAL_HP_THRESHOLD: float = 0.30

## Minimum expected damage to consider a damage ability worthwhile.
const MIN_DAMAGE_THRESHOLD: float = 5.0

## Weights for target prioritization.
const WEIGHT_LOW_HP: float = 3.0
const WEIGHT_TYPE_ADVANTAGE: float = 2.5
const WEIGHT_THREAT_LEVEL: float = 1.5

## -- Action Decision ----------------------------------------------------------

## Decide the best action for a unit.
##
## [unit]         -- The BattleUnit making the decision.
## [grid]         -- The BattleGrid for target/position queries.
## [damage_calc]  -- The DamageCalculator for estimating damage.
## [ability_db]   -- Dictionary of ability_id -> AbilityData resources.
## [element_chart]-- Dictionary of element_id -> ElementData resources.
##
## Returns:
## {
##   ability: AbilityData,     -- The chosen ability (or null if none available)
##   target: BattleUnit,       -- The chosen target (or null for self-target)
##   score: float,             -- The evaluation score of this action
## }
func decide_action(
	unit: BattleUnit,
	grid: BattleGrid,
	damage_calc: DamageCalculator,
	ability_db: Dictionary = {},
	element_chart: Dictionary = {},
) -> Dictionary:
	var best_action := {
		"ability": null,
		"target": null,
		"score": -1.0,
	}

	if unit == null or not unit.is_alive or not unit.can_act:
		return best_action

	# Get all usable abilities.
	var usable_abilities: Array[AbilityData] = _get_usable_abilities(unit, ability_db)
	if usable_abilities.is_empty():
		return best_action

	# -- Priority 1: Heal if HP is low ----------------------------------------
	if unit.get_hp_fraction() < HEAL_HP_THRESHOLD:
		var heal_action: Dictionary = _find_best_heal(unit, usable_abilities, grid)
		if heal_action["ability"] != null:
			return heal_action

	# -- Priority 2 & 3: Evaluate all damage/status abilities -----------------
	var enemy_team: int = 1 if unit.team == 0 else 0
	var enemies: Array[BattleUnit] = grid.get_all_units(enemy_team)

	if enemies.is_empty():
		# No enemies left -- try any self-buff or ally ability.
		var buff_action: Dictionary = _find_best_buff(unit, usable_abilities, grid)
		if buff_action["ability"] != null:
			return buff_action
		return best_action

	# Evaluate every ability against every possible target.
	for ability in usable_abilities:
		if _is_healing_ability(ability):
			continue  # Already checked healing above.

		if _is_ally_ability(ability):
			# Evaluate ally-targeted abilities (buffs, etc.).
			var allies: Array[BattleUnit] = grid.get_all_units(unit.team)
			for ally in allies:
				var score: float = _evaluate_ally_ability_value(ability, unit, ally, element_chart)
				if score > best_action["score"]:
					best_action = {"ability": ability, "target": ally, "score": score}
			continue

		# Damage/status ability against enemies.
		for enemy in enemies:
			var score: float = evaluate_ability_value(ability, unit, enemy, damage_calc, element_chart)
			if score > best_action["score"]:
				best_action = {"ability": ability, "target": enemy, "score": score}

	return best_action

## -- Target Prioritization ----------------------------------------------------

## Evaluate target priority and return the best target from a list.
## Prefers: lowest HP > type advantage > highest threat level.
func evaluate_target_priority(
	unit: BattleUnit,
	targets: Array[BattleUnit],
	element_chart: Dictionary = {},
) -> BattleUnit:
	if targets.is_empty():
		return null

	var best_target: BattleUnit = null
	var best_score: float = -1.0

	for target in targets:
		if not target.is_alive:
			continue

		var score: float = 0.0

		# Low HP bonus: prioritize finishing off weakened targets.
		var hp_frac: float = target.get_hp_fraction()
		score += (1.0 - hp_frac) * WEIGHT_LOW_HP

		# Type advantage bonus.
		if _has_type_advantage(unit, target, element_chart):
			score += WEIGHT_TYPE_ADVANTAGE

		# Threat level: high ATK or SP_ATK targets are dangerous.
		var threat: float = float(maxi(
			target.effective_stats.get("atk", 0),
			target.effective_stats.get("sp_atk", 0)
		))
		score += (threat / 200.0) * WEIGHT_THREAT_LEVEL

		if score > best_score:
			best_score = score
			best_target = target

	return best_target

## -- Ability Value Evaluation -------------------------------------------------

## Evaluate the value of using a specific ability against a specific target.
## Returns a score (higher = better).
func evaluate_ability_value(
	ability: AbilityData,
	caster: BattleUnit,
	target: BattleUnit,
	damage_calc: DamageCalculator = null,
	element_chart: Dictionary = {},
) -> float:
	var score: float = 0.0

	if ability.is_damaging() and damage_calc != null:
		# Estimate damage without RNG (no crits, no variance).
		var est_damage: float = _estimate_damage(caster, target, ability, damage_calc, element_chart)
		score += est_damage

		# Bonus for type advantage.
		var effectiveness: float = _get_effectiveness(ability, target, element_chart)
		if effectiveness > 1.5:
			score *= 1.5  # Super effective bonus.
		elif effectiveness < 0.75:
			score *= 0.5  # Not very effective penalty.
		elif effectiveness < 0.01:
			score = 0.0   # Immune -- don't bother.

		# Bonus for killing the target.
		if est_damage >= float(target.current_hp):
			score *= 2.0

	# Status effect value.
	if ability.has_status_effects():
		# Bonus for landing debuffs on targets without them.
		var status_bonus: float = 10.0 * ability.status_apply_chance
		# Reduced value if target already has many effects.
		if target.active_status_effects.size() >= 3:
			status_bonus *= 0.3
		score += status_bonus

	# Penalize low accuracy.
	score *= ability.accuracy

	return score

## -- Private Helpers ----------------------------------------------------------

## Get all usable abilities for a unit.
func _get_usable_abilities(unit: BattleUnit, ability_db: Dictionary) -> Array[AbilityData]:
	var result: Array[AbilityData] = []
	for ability_id in unit.equipped_abilities:
		var ability: AbilityData = ability_db.get(ability_id)
		if ability != null and unit.can_use_ability(ability):
			result.append(ability)
	return result


## Find the best healing ability to use when HP is low.
func _find_best_heal(
	unit: BattleUnit,
	abilities: Array[AbilityData],
	grid: BattleGrid,
) -> Dictionary:
	var best := {"ability": null, "target": null, "score": -1.0}

	for ability in abilities:
		if _is_healing_ability(ability):
			# Self-heal scores higher when HP is lower.
			var score: float = (1.0 - unit.get_hp_fraction()) * 100.0
			if score > best["score"]:
				best = {"ability": ability, "target": unit, "score": score}

	return best


## Find the best buff ability to use.
func _find_best_buff(
	unit: BattleUnit,
	abilities: Array[AbilityData],
	grid: BattleGrid,
) -> Dictionary:
	var best := {"ability": null, "target": null, "score": -1.0}

	for ability in abilities:
		if _is_ally_ability(ability):
			best = {"ability": ability, "target": unit, "score": 5.0}
			break

	return best


## Estimate damage without RNG.
func _estimate_damage(
	caster: BattleUnit,
	target: BattleUnit,
	ability: AbilityData,
	damage_calc: DamageCalculator,
	element_chart: Dictionary,
) -> float:
	if not ability.is_damaging():
		return 0.0

	# Use the formula deterministically.
	var atk_key: String = ability.get_offense_stat_key()
	var def_key: String = ability.get_defense_stat_key()
	var atk_val: float = float(caster.effective_stats.get(atk_key, 1))
	var def_val: float = maxf(float(target.effective_stats.get(def_key, 1)), 1.0)

	var level: int = caster.get_level()
	var level_mod: float = (2.0 * float(level) / 5.0 + 2.0)
	var base: float = (level_mod * float(ability.base_power) * atk_val / def_val) / 50.0 + 2.0

	# STAB.
	for elem in caster.get_element_types():
		if elem == ability.element_type:
			base *= 1.5
			break

	# Effectiveness.
	var eff: float = _get_effectiveness(ability, target, element_chart)
	base *= eff

	return base


## Get type effectiveness of an ability against a defender.
func _get_effectiveness(
	ability: AbilityData,
	target: BattleUnit,
	element_chart: Dictionary,
) -> float:
	if ability.element_type.is_empty():
		return 1.0

	var atk_element: ElementData = null
	for eid in element_chart:
		var ed: ElementData = element_chart[eid]
		if ed.element_name == ability.element_type:
			atk_element = ed
			break

	if atk_element == null:
		return 1.0

	var total: float = 1.0
	for eid in element_chart:
		var ed: ElementData = element_chart[eid]
		if ed.element_name in target.get_element_types():
			total *= atk_element.get_multiplier_against(int(eid))

	return total


## Check if this unit has a type advantage against the target.
func _has_type_advantage(
	unit: BattleUnit,
	target: BattleUnit,
	element_chart: Dictionary,
) -> bool:
	for elem_name in unit.get_element_types():
		for eid in element_chart:
			var ed: ElementData = element_chart[eid]
			if ed.element_name == elem_name:
				for target_elem in target.get_element_types():
					for teid in element_chart:
						var ted: ElementData = element_chart[teid]
						if ted.element_name == target_elem:
							if ed.get_multiplier_against(int(teid)) > 1.5:
								return true
	return false


## Whether an ability is ally-targeted (healing/buff).
func _is_ally_ability(ability: AbilityData) -> bool:
	return ability.targeting_type in ["single_ally", "all_allies", "adjacent_allies", "self"]


## Whether an ability is specifically a healing ability.
func _is_healing_ability(ability: AbilityData) -> bool:
	return not ability.is_damaging() and _is_ally_ability(ability)


## Evaluate value of an ally-targeted ability.
func _evaluate_ally_ability_value(
	ability: AbilityData,
	caster: BattleUnit,
	ally: BattleUnit,
	element_chart: Dictionary,
) -> float:
	var score: float = 0.0

	# Healing value: proportional to HP missing.
	if not ability.is_damaging():
		score += (1.0 - ally.get_hp_fraction()) * 50.0

	# Status effect value (buffs on allies).
	if ability.has_status_effects():
		score += 15.0 * ability.status_apply_chance

	return score

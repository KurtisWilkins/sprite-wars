## PlayerAutoAI -- [P3-014] Smarter auto-battle AI for the player's team.
## Extends BattleAI with additional considerations:
## - Conserve high-cooldown abilities for important targets
## - Use AoE when 3+ enemies are grouped
## - Prioritize healing allies below 30% HP
## - Consider team composition bonuses
class_name PlayerAutoAI
extends BattleAI

## -- Constants ----------------------------------------------------------------

## Number of grouped enemies required to prefer AoE.
const AOE_GROUP_THRESHOLD: int = 3

## Cooldown threshold: abilities with cooldown >= this are "high cooldown".
const HIGH_COOLDOWN_THRESHOLD: int = 3

## HP threshold below which an enemy is considered "low HP" (not worth big abilities).
const LOW_HP_FRACTION: float = 0.20

## Ally healing priority HP threshold.
const ALLY_HEAL_THRESHOLD: float = 0.30

## -- Override: decide_action --------------------------------------------------

## Enhanced decision-making for player auto-battle.
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

	var usable_abilities: Array[AbilityData] = _get_usable_abilities(unit, ability_db)
	if usable_abilities.is_empty():
		return best_action

	# -- Priority 1: Heal allies below 30% HP --------------------------------
	var heal_action: Dictionary = _find_best_ally_heal(unit, usable_abilities, grid, damage_calc)
	if heal_action["ability"] != null:
		return heal_action

	# -- Priority 2: Self-heal if low HP -------------------------------------
	if unit.get_hp_fraction() < HEAL_HP_THRESHOLD:
		var self_heal: Dictionary = _find_best_heal(unit, usable_abilities, grid)
		if self_heal["ability"] != null:
			return self_heal

	# -- Priority 3: AoE when 3+ enemies are grouped -------------------------
	var aoe_action: Dictionary = _evaluate_aoe_opportunities(
		unit, usable_abilities, grid, damage_calc, element_chart
	)
	if aoe_action["ability"] != null and aoe_action["score"] > 0:
		# Only use AoE if it scores well enough.
		best_action = aoe_action

	# -- Priority 4: Best single-target action --------------------------------
	var enemy_team: int = 1 if unit.team == 0 else 0
	var enemies: Array[BattleUnit] = grid.get_all_units(enemy_team)

	for ability in usable_abilities:
		if _is_healing_ability(ability) or _is_ally_ability(ability):
			continue

		for enemy in enemies:
			var score: float = _evaluate_smart(ability, unit, enemy, damage_calc, element_chart)
			if score > best_action["score"]:
				best_action = {"ability": ability, "target": enemy, "score": score}

	# -- Fallback: buff self if nothing else is good --------------------------
	if best_action["ability"] == null:
		var buff_action: Dictionary = _find_best_buff(unit, usable_abilities, grid)
		if buff_action["ability"] != null:
			return buff_action

	return best_action

## -- Smart Evaluation ---------------------------------------------------------

## Enhanced ability evaluation that considers cooldown conservation.
func _evaluate_smart(
	ability: AbilityData,
	caster: BattleUnit,
	target: BattleUnit,
	damage_calc: DamageCalculator,
	element_chart: Dictionary,
) -> float:
	var base_score: float = evaluate_ability_value(ability, caster, target, damage_calc, element_chart)

	# -- Don't waste high-cooldown abilities on low-HP targets ----------------
	if ability.cooldown_turns >= HIGH_COOLDOWN_THRESHOLD:
		if target.get_hp_fraction() < LOW_HP_FRACTION:
			# The target is almost dead -- use a cheaper ability.
			base_score *= 0.3

	# -- Bonus for killing the target with this ability -----------------------
	var est_damage: float = _estimate_damage(caster, target, ability, damage_calc, element_chart)
	if est_damage >= float(target.current_hp):
		# Overkill penalty for high-cooldown abilities.
		var overkill: float = est_damage - float(target.current_hp)
		if ability.cooldown_turns >= HIGH_COOLDOWN_THRESHOLD and overkill > float(target.max_hp) * 0.5:
			base_score *= 0.6  # Wasting a powerful ability.
		else:
			base_score *= 1.5  # Good use: securing the kill.

	return base_score

## -- AoE Evaluation -----------------------------------------------------------

## Check if any AoE abilities would hit enough enemies to be worthwhile.
func _evaluate_aoe_opportunities(
	unit: BattleUnit,
	abilities: Array[AbilityData],
	grid: BattleGrid,
	damage_calc: DamageCalculator,
	element_chart: Dictionary,
) -> Dictionary:
	var best := {"ability": null, "target": null, "score": -1.0}

	var aoe_abilities: Array[AbilityData] = []
	for ability in abilities:
		if _is_aoe_pattern(ability.targeting_type):
			aoe_abilities.append(ability)

	if aoe_abilities.is_empty():
		return best

	var enemy_team: int = 1 if unit.team == 0 else 0
	var enemies: Array[BattleUnit] = grid.get_all_units(enemy_team)

	for ability in aoe_abilities:
		# Test each enemy position as a potential AoE center.
		for enemy in enemies:
			var affected_cells: Array[Vector2i] = grid.get_cells_in_pattern(
				unit.grid_position, ability.targeting_type, enemy.grid_position
			)

			# Count how many enemies would be hit.
			var hit_count: int = 0
			var total_damage_estimate: float = 0.0
			for cell in affected_cells:
				var target: BattleUnit = grid.get_unit_at(cell)
				if target != null and target.is_alive and target.team == enemy_team:
					hit_count += 1
					total_damage_estimate += _estimate_damage(
						unit, target, ability, damage_calc, element_chart
					)

			# Only consider AoE if it hits enough targets.
			if hit_count >= AOE_GROUP_THRESHOLD:
				var score: float = total_damage_estimate * (1.0 + float(hit_count) * 0.25)
				if score > best["score"]:
					best = {"ability": ability, "target": enemy, "score": score}

	return best

## -- Ally Healing -------------------------------------------------------------

## Find the best healing ability to use on a low-HP ally.
func _find_best_ally_heal(
	unit: BattleUnit,
	abilities: Array[AbilityData],
	grid: BattleGrid,
	damage_calc: DamageCalculator,
) -> Dictionary:
	var best := {"ability": null, "target": null, "score": -1.0}

	# Find allies below the healing threshold.
	var allies: Array[BattleUnit] = grid.get_all_units(unit.team)
	var low_hp_allies: Array[BattleUnit] = []
	for ally in allies:
		if ally.is_alive and ally.get_hp_fraction() < ALLY_HEAL_THRESHOLD:
			low_hp_allies.append(ally)

	if low_hp_allies.is_empty():
		return best

	# Sort by HP fraction (lowest first).
	low_hp_allies.sort_custom(func(a: BattleUnit, b: BattleUnit) -> bool:
		return a.get_hp_fraction() < b.get_hp_fraction()
	)

	for ability in abilities:
		if _is_healing_ability(ability):
			# Target the most injured ally.
			var target: BattleUnit = low_hp_allies[0]
			var heal_est: float = float(damage_calc.calculate_heal(unit, ability))
			var hp_missing: float = float(target.max_hp - target.current_hp)
			# Score is proportional to how much HP we'd restore.
			var score: float = minf(heal_est, hp_missing) * 2.0
			if score > best["score"]:
				best = {"ability": ability, "target": target, "score": score}

	return best

## -- Helpers ------------------------------------------------------------------

## Check if a targeting pattern is AoE.
func _is_aoe_pattern(pattern: String) -> bool:
	return pattern in [
		"row", "column", "cross", "diamond", "aoe_circle",
		"all", "adjacent", "line", "pierce",
	]

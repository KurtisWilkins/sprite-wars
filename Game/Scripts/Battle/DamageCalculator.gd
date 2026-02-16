## DamageCalculator -- [P3-004/005] Complete damage formula for Sprite Wars combat.
## Handles physical/special split, STAB, type effectiveness, critical hits,
## damage variance, defense buffs bypass on crit, and composition bonuses.
class_name DamageCalculator
extends RefCounted

## -- Constants ----------------------------------------------------------------

## Base critical hit chance (6.25%).
const BASE_CRIT_CHANCE: float = 0.0625

## Critical hit damage multiplier.
const CRIT_MULTIPLIER: float = 1.5

## STAB (Same Type Attack Bonus) multiplier.
const STAB_MULTIPLIER: float = 1.5

## Damage variance range: final damage is multiplied by a random value in this range.
const VARIANCE_MIN: float = 0.85
const VARIANCE_MAX: float = 1.0

## Minimum damage any attack can deal (prevents 0-damage attacks).
const MIN_DAMAGE: int = 1

## Speed contribution to crit chance: crit_bonus = speed / SPEED_CRIT_DIVISOR.
## A unit with 200 speed gets +2% crit.
const SPEED_CRIT_DIVISOR: float = 10000.0

## -- Main Damage Calculation --------------------------------------------------

## Calculate the full damage result for an ability hitting a defender.
##
## [attacker]       -- The attacking BattleUnit.
## [defender]       -- The defending BattleUnit.
## [ability]        -- The AbilityData being used.
## [element_chart]  -- Dictionary mapping element_id (int) -> ElementData resource.
##
## Returns:
## {
##   raw_damage: int,         -- Damage before variance
##   final_damage: int,       -- Damage after variance (the actual HP loss)
##   is_critical: bool,       -- Whether a crit occurred
##   effectiveness: float,    -- Type effectiveness multiplier
##   is_stab: bool,           -- Whether STAB applied
##   effectiveness_label: String  -- "super_effective", "not_very_effective", "neutral", "immune"
## }
func calculate_damage(
	attacker: BattleUnit,
	defender: BattleUnit,
	ability: AbilityData,
	element_chart: Dictionary,
) -> Dictionary:
	var result := {
		"raw_damage": 0,
		"final_damage": 0,
		"is_critical": false,
		"effectiveness": 1.0,
		"is_stab": false,
		"effectiveness_label": "neutral",
	}

	# Non-damaging abilities deal no damage.
	if not ability.is_damaging():
		return result

	# -- Step 1: Determine offensive and defensive stats ----------------------
	var atk_stat_key: String = ability.get_offense_stat_key()
	var def_stat_key: String = ability.get_defense_stat_key()
	var atk_value: float = float(attacker.effective_stats.get(atk_stat_key, 1))
	var def_value: float = float(defender.effective_stats.get(def_stat_key, 1))

	# -- Step 2: Check for critical hit ---------------------------------------
	var crit_chance: float = calculate_crit_chance(attacker, ability.crit_rate_bonus)
	var is_crit: bool = randf() < crit_chance
	result["is_critical"] = is_crit

	# Crits bypass defense buffs: use base defense instead of buffed defense.
	if is_crit:
		# If defender has defense buffs (multiplier > 1.0), use the base value.
		var base_def: float = float(defender._base_battle_stats.get(def_stat_key, 1))
		if def_value > base_def:
			def_value = base_def

	# Prevent division by zero.
	def_value = maxf(def_value, 1.0)

	# -- Step 3: Level modifier -----------------------------------------------
	var level: int = attacker.get_level()
	var level_mod: float = (2.0 * float(level) / 5.0 + 2.0)

	# -- Step 4: Base damage calculation --------------------------------------
	# Formula: ((2 * level / 5 + 2) * base_power * ATK / DEF) / 50 + 2
	var base_damage: float = (level_mod * float(ability.base_power) * atk_value / def_value) / 50.0 + 2.0

	# -- Step 5: STAB (Same Type Attack Bonus) --------------------------------
	var is_stab: bool = _check_stab(attacker, ability)
	result["is_stab"] = is_stab
	if is_stab:
		base_damage *= STAB_MULTIPLIER

	# -- Step 6: Type effectiveness -------------------------------------------
	var effectiveness: float = _calculate_effectiveness(ability, defender, element_chart)
	result["effectiveness"] = effectiveness
	result["effectiveness_label"] = ElementData.effectiveness_label(effectiveness)
	base_damage *= effectiveness

	# -- Step 7: Critical hit multiplier --------------------------------------
	if is_crit:
		base_damage *= CRIT_MULTIPLIER

	# Store raw damage before variance.
	result["raw_damage"] = maxi(MIN_DAMAGE, int(base_damage))

	# -- Step 8: Damage variance (0.85 - 1.0) --------------------------------
	var variance: float = randf_range(VARIANCE_MIN, VARIANCE_MAX)
	var final_damage: int = maxi(MIN_DAMAGE, int(base_damage * variance))

	# Immune targets take 0 damage.
	if effectiveness < ElementData.IMMUNE_THRESHOLD:
		final_damage = 0
		result["raw_damage"] = 0

	result["final_damage"] = final_damage
	return result

## -- Critical Hit Chance ------------------------------------------------------

## Calculate the probability of a critical hit.
## Base 6.25% + speed bonus + ability-specific crit bonus.
func calculate_crit_chance(attacker: BattleUnit, ability_crit_bonus: float = 0.0) -> float:
	var chance: float = BASE_CRIT_CHANCE

	# Speed contributes a small crit bonus.
	var speed: float = float(attacker.effective_stats.get("spd", 0))
	chance += speed / SPEED_CRIT_DIVISOR

	# Ability-specific bonus.
	chance += ability_crit_bonus

	# Cap at 50% to prevent guaranteed crits.
	return clampf(chance, 0.0, 0.5)

## -- Composition Bonuses ------------------------------------------------------

## Apply team composition bonuses to a unit's stats.
## [unit]     -- The BattleUnit receiving bonuses.
## [bonuses]  -- Array of Dictionaries, each with {stat: String, value: float}.
##               The value is a multiplier (e.g. 1.1 for +10%).
## Returns a Dictionary of stat modifications applied {stat_key: multiplier}.
func apply_composition_bonuses(unit: BattleUnit, bonuses: Array) -> Dictionary:
	var applied := {}
	for bonus in bonuses:
		var stat_key: String = bonus.get("stat", "")
		var value: float = float(bonus.get("value", 1.0))
		if stat_key.is_empty() or value == 1.0:
			continue
		unit.apply_stat_modifier(stat_key, value)
		applied[stat_key] = value
	return applied

## -- Healing Calculation ------------------------------------------------------

## Calculate heal amount for a healing ability.
## Uses sp_atk as the healing stat with a simpler formula.
func calculate_heal(caster: BattleUnit, ability: AbilityData) -> int:
	if ability.base_power <= 0:
		return 0
	var sp_atk: float = float(caster.effective_stats.get("sp_atk", 1))
	var level: int = caster.get_level()
	var level_mod: float = (2.0 * float(level) / 5.0 + 2.0)
	# Healing formula: simplified, no defense factor.
	var heal_amount: float = (level_mod * float(ability.base_power) * sp_atk) / 100.0 + 5.0
	return maxi(1, int(heal_amount))

## -- Private Helpers ----------------------------------------------------------

## Check if the attacker gets Same Type Attack Bonus for this ability.
func _check_stab(attacker: BattleUnit, ability: AbilityData) -> bool:
	if ability.element_type.is_empty():
		return false
	# STAB applies if the ability's element matches any of the attacker's elements.
	for elem in attacker.get_element_types():
		if elem == ability.element_type:
			return true
	return false


## Calculate type effectiveness of an ability against a defender.
## Handles dual-type defenders by multiplying individual effectiveness values.
func _calculate_effectiveness(
	ability: AbilityData,
	defender: BattleUnit,
	element_chart: Dictionary,
) -> float:
	if ability.element_type.is_empty():
		return 1.0

	# Find the attacking element's data in the chart.
	var atk_element: ElementData = null
	for eid in element_chart:
		var ed: ElementData = element_chart[eid]
		if ed.element_name == ability.element_type:
			atk_element = ed
			break

	if atk_element == null:
		return 1.0

	# Get the defender's element IDs from the chart.
	var defending_element_ids: Array = []
	var defender_types: Array[String] = defender.get_element_types()
	for eid in element_chart:
		var ed: ElementData = element_chart[eid]
		if ed.element_name in defender_types:
			defending_element_ids.append(eid)

	if defending_element_ids.is_empty():
		return 1.0

	# Multiply effectiveness across all defender types.
	var total: float = 1.0
	for def_eid in defending_element_ids:
		total *= atk_element.get_multiplier_against(int(def_eid))

	return total

## AbilityDataValidator — [P2-018] Validates all 160 ability entries for
## completeness, targeting validity, status effect references, and learnset coverage.
class_name AbilityDataValidator
extends RefCounted

static func validate_all(
	abilities: Array,
	status_effects: Array,
	learnsets: Dictionary,
) -> Array[String]:
	var errors: Array[String] = []
	var valid_effect_ids: Array[int] = []
	for se in status_effects:
		valid_effect_ids.append(se.get("effect_id", -1))

	var valid_targeting := [
		"single", "row", "column", "cross", "diamond", "aoe_circle",
		"random", "all", "adjacent", "self", "single_ally", "all_allies",
		"adjacent_allies", "line", "pierce"
	]

	var ability_ids_in_learnsets: Array[int] = []
	for rid in learnsets:
		for entry in learnsets[rid]:
			var aid: int = entry.get("ability_id", -1)
			if aid not in ability_ids_in_learnsets:
				ability_ids_in_learnsets.append(aid)

	for ability in abilities:
		var aid: int = ability.get("ability_id", -1)

		# Targeting type validation
		var targeting: String = ability.get("targeting_type", "")
		if targeting not in valid_targeting:
			errors.append("Ability %d (%s): invalid targeting_type '%s'" % [aid, ability.get("ability_name", "?"), targeting])

		# Status effect references
		for se_id in ability.get("status_effect_ids", []):
			if se_id not in valid_effect_ids:
				errors.append("Ability %d (%s): references invalid status_effect_id %d" % [aid, ability.get("ability_name", "?"), se_id])

		# Balance checks
		var power: int = ability.get("base_power", 0)
		var pp: int = ability.get("pp_max", 5)
		var cooldown: int = ability.get("cooldown_turns", 0)
		if power > 100 and pp > 10 and cooldown == 0:
			errors.append("Ability %d (%s): high power (%d) with high PP (%d) and no cooldown may be unbalanced" % [aid, ability.get("ability_name", "?"), power, pp])

		# Learnset coverage
		if aid not in ability_ids_in_learnsets:
			errors.append("Ability %d (%s): not assigned to any Sprite's learnset" % [aid, ability.get("ability_name", "?")])

	return errors

## Calculate DPS curve data for balance review [P2-019]
static func calculate_dps_curves(abilities: Array) -> Array[Dictionary]:
	var curves: Array[Dictionary] = []
	for ability in abilities:
		var power: int = ability.get("base_power", 0)
		if power == 0:
			continue
		var accuracy: float = ability.get("accuracy", 1.0)
		var pp: int = ability.get("pp_max", 5)
		var cooldown: int = ability.get("cooldown_turns", 0)
		var crit_bonus: float = ability.get("crit_rate_bonus", 0.0)
		var effective_crit := 0.0625 + crit_bonus
		var crit_mult := 1.0 + (effective_crit * 0.5)

		# Effective DPS per turn (accounting for cooldown and accuracy)
		var turns_per_use := 1.0 + cooldown
		var dps := (power * accuracy * crit_mult) / turns_per_use

		curves.append({
			"ability_id": ability.get("ability_id", -1),
			"ability_name": ability.get("ability_name", ""),
			"element": ability.get("element_type", ""),
			"base_power": power,
			"accuracy": accuracy,
			"effective_dps": dps,
			"tier": _classify_tier(dps),
		})

	curves.sort_custom(func(a, b): return a.effective_dps > b.effective_dps)
	return curves

static func _classify_tier(dps: float) -> String:
	if dps >= 90.0:
		return "S"
	elif dps >= 70.0:
		return "A"
	elif dps >= 50.0:
		return "B"
	elif dps >= 30.0:
		return "C"
	else:
		return "D"

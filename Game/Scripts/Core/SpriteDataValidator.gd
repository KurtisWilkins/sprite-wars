## SpriteDataValidator — [P1-014] Editor tool / script that validates all 72
## Sprite form entries for data integrity across the entire database.
class_name SpriteDataValidator
extends RefCounted

## Validates all Sprite data across races, evolutions, elements, and abilities.
## Returns an array of human-readable error strings. Empty = all valid.

static func validate_all(
	races: Array,
	evolutions: Array,
	element_chart: Dictionary,
	abilities: Array,
	learnsets: Dictionary,
) -> Array[String]:
	var errors: Array[String] = []
	errors.append_array(_validate_races(races))
	errors.append_array(_validate_evolutions(evolutions, races))
	errors.append_array(_validate_element_chart(element_chart))
	errors.append_array(_validate_abilities(abilities, element_chart))
	errors.append_array(_validate_learnsets(learnsets, races, abilities))
	errors.append_array(_validate_cross_references(races, evolutions, abilities, learnsets))
	return errors

static func _validate_races(races: Array) -> Array[String]:
	var errors: Array[String] = []
	var seen_ids: Array[int] = []
	var valid_elements := ["Fire", "Water", "Plant", "Ice", "Wind", "Earth", "Electric",
		"Dark", "Light", "Fairy", "Lunar", "Solar", "Metal", "Poison"]
	var valid_rarities := ["common", "uncommon", "rare", "legendary"]
	var stat_keys := ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]

	for race in races:
		var rid: int = race.get("race_id", -1)
		if rid < 1 or rid > 24:
			errors.append("Race %d: invalid race_id (must be 1-24)" % rid)
		if rid in seen_ids:
			errors.append("Race %d: duplicate race_id" % rid)
		seen_ids.append(rid)

		if race.get("race_name", "").is_empty():
			errors.append("Race %d: missing race_name" % rid)

		for elem in race.get("element_types", []):
			if elem not in valid_elements:
				errors.append("Race %d: invalid element '%s'" % [rid, elem])

		if race.get("rarity", "") not in valid_rarities:
			errors.append("Race %d: invalid rarity '%s'" % [rid, race.get("rarity", "")])

		var base_stats: Dictionary = race.get("base_stats", {})
		var growth_rates: Dictionary = race.get("growth_rates", {})
		for key in stat_keys:
			if key not in base_stats:
				errors.append("Race %d: missing base_stat '%s'" % [rid, key])
			elif base_stats[key] < 1 or base_stats[key] > 255:
				errors.append("Race %d: base_stat '%s' out of range (1-255): %d" % [rid, key, base_stats[key]])
			if key not in growth_rates:
				errors.append("Race %d: missing growth_rate '%s'" % [rid, key])

		var stat_total := 0
		for key in stat_keys:
			stat_total += base_stats.get(key, 0)
		if stat_total < 200 or stat_total > 500:
			errors.append("Race %d: stat total %d outside expected range (200-500)" % [rid, stat_total])

	if seen_ids.size() != 24:
		errors.append("Expected 24 races, found %d" % seen_ids.size())

	return errors

static func _validate_evolutions(evolutions: Array, races: Array) -> Array[String]:
	var errors: Array[String] = []
	var seen_form_ids: Array[int] = []
	var valid_race_ids: Array[int] = []
	for r in races:
		valid_race_ids.append(r.get("race_id", -1))

	for evo in evolutions:
		var fid: int = evo.get("form_id", -1)
		if fid < 1 or fid > 72:
			errors.append("Evolution form_id %d: out of range (1-72)" % fid)
		if fid in seen_form_ids:
			errors.append("Evolution form_id %d: duplicate" % fid)
		seen_form_ids.append(fid)

		var stage: int = evo.get("stage_number", 0)
		if stage < 1 or stage > 3:
			errors.append("Form %d: invalid stage_number %d" % [fid, stage])

		var rid: int = evo.get("race_id", -1)
		if rid not in valid_race_ids:
			errors.append("Form %d: references invalid race_id %d" % [fid, rid])

		if stage > 1:
			var trigger_type: String = evo.get("evolution_trigger_type", "")
			if trigger_type not in ["level", "item", "condition"]:
				errors.append("Form %d: invalid evolution_trigger_type '%s'" % [fid, trigger_type])

	if seen_form_ids.size() != 72:
		errors.append("Expected 72 evolution forms, found %d" % seen_form_ids.size())

	# Check each race has exactly 3 stages
	for rid in valid_race_ids:
		var stages_found: Array[int] = []
		for evo in evolutions:
			if evo.get("race_id", -1) == rid:
				stages_found.append(evo.get("stage_number", 0))
		stages_found.sort()
		if stages_found != [1, 2, 3]:
			errors.append("Race %d: expected stages [1,2,3], found %s" % [rid, str(stages_found)])

	return errors

static func _validate_element_chart(chart: Dictionary) -> Array[String]:
	var errors: Array[String] = []
	var expected_count := 14
	if chart.size() != expected_count:
		errors.append("Element chart has %d elements, expected %d" % [chart.size(), expected_count])

	for atk_elem in chart:
		var matchups: Dictionary = chart[atk_elem]
		if matchups.size() != expected_count:
			errors.append("Element '%s' has %d matchups, expected %d" % [atk_elem, matchups.size(), expected_count])
		for def_elem in matchups:
			var mult: float = matchups[def_elem]
			if mult < 0.0 or mult > 4.0:
				errors.append("Element %s vs %s: multiplier %.1f out of range (0.0-4.0)" % [atk_elem, def_elem, mult])

	return errors

static func _validate_abilities(abilities: Array, element_chart: Dictionary) -> Array[String]:
	var errors: Array[String] = []
	var seen_ids: Array[int] = []
	var valid_elements: Array = element_chart.keys()

	for ability in abilities:
		var aid: int = ability.get("ability_id", -1)
		if aid < 1 or aid > 200:
			errors.append("Ability %d: invalid ability_id" % aid)
		if aid in seen_ids:
			errors.append("Ability %d: duplicate ability_id" % aid)
		seen_ids.append(aid)

		if ability.get("ability_name", "").is_empty():
			errors.append("Ability %d: missing ability_name" % aid)

		var elem: String = ability.get("element_type", "")
		if not elem.is_empty() and elem != "None" and elem not in valid_elements:
			errors.append("Ability %d: invalid element_type '%s'" % [aid, elem])

		var power: int = ability.get("base_power", 0)
		if power < 0 or power > 250:
			errors.append("Ability %d: base_power %d out of range (0-250)" % [aid, power])

		var accuracy: float = ability.get("accuracy", 0.0)
		if accuracy < 0.0 or accuracy > 1.0:
			errors.append("Ability %d: accuracy %.2f out of range (0.0-1.0)" % [aid, accuracy])

		var pp: int = ability.get("pp_max", 0)
		if pp < 1 or pp > 40:
			errors.append("Ability %d: pp_max %d out of range (1-40)" % [aid, pp])

	if seen_ids.size() < 160:
		errors.append("Expected at least 160 abilities, found %d" % seen_ids.size())

	return errors

static func _validate_learnsets(learnsets: Dictionary, races: Array, abilities: Array) -> Array[String]:
	var errors: Array[String] = []
	var valid_ability_ids: Array[int] = []
	for a in abilities:
		valid_ability_ids.append(a.get("ability_id", -1))

	for race in races:
		var rid: int = race.get("race_id", -1)
		if rid not in learnsets:
			errors.append("Race %d: no learnset defined" % rid)
			continue
		var learnset: Array = learnsets[rid]
		if learnset.size() < 4:
			errors.append("Race %d: learnset has only %d entries (minimum 4)" % [rid, learnset.size()])

		for entry in learnset:
			var ability_id: int = entry.get("ability_id", -1)
			if ability_id not in valid_ability_ids:
				errors.append("Race %d learnset: references invalid ability_id %d" % [rid, ability_id])

	return errors

static func _validate_cross_references(races: Array, evolutions: Array, abilities: Array, learnsets: Dictionary) -> Array[String]:
	var errors: Array[String] = []
	# Verify every race has at least one STAB ability in its learnset
	for race in races:
		var rid: int = race.get("race_id", -1)
		var elements: Array = race.get("element_types", [])
		if rid not in learnsets:
			continue
		var has_stab := false
		for entry in learnsets[rid]:
			for ability in abilities:
				if ability.get("ability_id", -1) == entry.get("ability_id", -1):
					if ability.get("element_type", "") in elements:
						has_stab = true
						break
			if has_stab:
				break
		if not has_stab and not elements.is_empty():
			errors.append("Race %d: no STAB ability found in learnset for elements %s" % [rid, str(elements)])

	return errors

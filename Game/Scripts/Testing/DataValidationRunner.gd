## DataValidationRunner — [P11-001] Automated test runner that validates all game data
## integrity at startup (debug builds) or on demand. Reports errors to console.
class_name DataValidationRunner
extends RefCounted

var total_tests: int = 0
var passed_tests: int = 0
var failed_tests: int = 0
var errors: Array[String] = []
var warnings: Array[String] = []

func run_all_validations() -> Dictionary:
	total_tests = 0
	passed_tests = 0
	failed_tests = 0
	errors.clear()
	warnings.clear()

	print("========================================")
	print("  SPRITE WARS — Data Validation Suite")
	print("========================================")

	_test_race_count()
	_test_evolution_count()
	_test_ability_count()
	_test_element_chart_completeness()
	_test_learnset_coverage()
	_test_equipment_count()
	_test_encounter_tables()
	_test_crystal_data()
	_test_consumable_data()
	_test_stat_ranges()
	_test_ability_balance()
	_test_learnset_stab_coverage()
	_test_evolution_chains()
	_test_quest_data()
	_test_temple_data()

	print("========================================")
	print("  Results: %d/%d passed (%d failed)" % [passed_tests, total_tests, failed_tests])
	if not errors.is_empty():
		print("  ERRORS: %d" % errors.size())
		for e in errors:
			print("    ✗ %s" % e)
	if not warnings.is_empty():
		print("  WARNINGS: %d" % warnings.size())
		for w in warnings:
			print("    ! %s" % w)
	print("========================================")

	return {
		"total": total_tests,
		"passed": passed_tests,
		"failed": failed_tests,
		"errors": errors.duplicate(),
		"warnings": warnings.duplicate(),
	}

func _assert_eq(test_name: String, actual: Variant, expected: Variant) -> void:
	total_tests += 1
	if actual == expected:
		passed_tests += 1
	else:
		failed_tests += 1
		var msg := "%s: expected %s, got %s" % [test_name, str(expected), str(actual)]
		errors.append(msg)

func _assert_gte(test_name: String, actual: int, minimum: int) -> void:
	total_tests += 1
	if actual >= minimum:
		passed_tests += 1
	else:
		failed_tests += 1
		var msg := "%s: expected >= %d, got %d" % [test_name, minimum, actual]
		errors.append(msg)

func _assert_range(test_name: String, value: float, min_val: float, max_val: float) -> void:
	total_tests += 1
	if value >= min_val and value <= max_val:
		passed_tests += 1
	else:
		failed_tests += 1
		var msg := "%s: value %.2f outside range [%.2f, %.2f]" % [test_name, value, min_val, max_val]
		errors.append(msg)

func _assert_true(test_name: String, condition: bool) -> void:
	total_tests += 1
	if condition:
		passed_tests += 1
	else:
		failed_tests += 1
		errors.append("%s: assertion failed" % test_name)

func _warn(message: String) -> void:
	warnings.append(message)

# =========================================================================
# Test implementations
# =========================================================================

func _test_race_count() -> void:
	var races := DataLoader.races
	if races is Dictionary:
		_assert_eq("Race count", races.size(), 24)
	elif races is Array:
		_assert_eq("Race count", races.size(), 24)
	else:
		_assert_true("Races loaded", false)

func _test_evolution_count() -> void:
	var evos := DataLoader.evolutions
	if evos is Array:
		_assert_eq("Evolution form count", evos.size(), 72)
	elif evos is Dictionary:
		_assert_eq("Evolution form count", evos.size(), 72)
	else:
		_assert_true("Evolutions loaded", false)

func _test_ability_count() -> void:
	_assert_gte("Ability count", DataLoader.abilities.size(), 160)

func _test_element_chart_completeness() -> void:
	var chart := DataLoader.element_chart
	_assert_eq("Element chart size", chart.size(), 14)
	for elem in chart:
		var matchups: Dictionary = chart[elem]
		_assert_eq("Element '%s' matchups" % elem, matchups.size(), 14)

func _test_learnset_coverage() -> void:
	var learnsets := DataLoader.learnsets
	_assert_gte("Learnset count", learnsets.size(), 24)
	for rid in learnsets:
		var ls: Array = learnsets[rid]
		_assert_gte("Race %d learnset size" % rid, ls.size(), 4)

func _test_equipment_count() -> void:
	_assert_gte("Equipment count", DataLoader.equipment.size(), 54)

func _test_encounter_tables() -> void:
	var tables := DataLoader.encounter_tables
	_assert_gte("Encounter table areas", tables.size(), 10)
	for area_id in tables:
		var entries: Array = tables[area_id]
		_assert_gte("Area '%s' encounters" % area_id, entries.size(), 2)

func _test_crystal_data() -> void:
	_assert_gte("Crystal types", DataLoader.crystals.size(), 5)

func _test_consumable_data() -> void:
	_assert_gte("Consumable items", DataLoader.consumables.size(), 10)

func _test_stat_ranges() -> void:
	var races = DataLoader.races
	var stat_keys := ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]
	var race_list: Array = races.values() if races is Dictionary else races
	for race in race_list:
		var rid = race.get("race_id", -1)
		var base_stats: Dictionary = race.get("base_stats", {})
		var total := 0
		for key in stat_keys:
			var val: int = base_stats.get(key, 0)
			_assert_range("Race %d stat '%s'" % [rid, key], float(val), 1.0, 255.0)
			total += val
		_assert_range("Race %d stat total" % rid, float(total), 200.0, 500.0)

func _test_ability_balance() -> void:
	for ability in DataLoader.abilities:
		var aid: int = ability.get("ability_id", -1)
		var power: int = ability.get("base_power", 0)
		var accuracy: float = ability.get("accuracy", 0.0)
		var pp: int = ability.get("pp_max", 0)
		if power > 0:
			_assert_range("Ability %d base_power" % aid, float(power), 1.0, 250.0)
		_assert_range("Ability %d accuracy" % aid, accuracy, 0.0, 1.0)
		_assert_range("Ability %d pp_max" % aid, float(pp), 1.0, 40.0)

func _test_learnset_stab_coverage() -> void:
	var races = DataLoader.races
	var race_list: Array = races.values() if races is Dictionary else races
	for race in race_list:
		var rid: int = race.get("race_id", -1)
		var elements: Array = race.get("element_types", [])
		if elements.is_empty():
			continue
		var learnset: Array = DataLoader.learnsets.get(rid, [])
		if learnset.is_empty():
			_warn("Race %d has no learnset" % rid)
			continue
		var has_stab := false
		for entry in learnset:
			var ability := DataLoader.get_ability(entry.get("ability_id", -1))
			if ability.get("element_type", "") in elements:
				has_stab = true
				break
		_assert_true("Race %d STAB coverage" % rid, has_stab)

func _test_evolution_chains() -> void:
	var races = DataLoader.races
	var evos := DataLoader.evolutions
	var race_list: Array = races.values() if races is Dictionary else races
	var evo_list: Array = evos.values() if evos is Dictionary else evos
	for race in race_list:
		var rid: int = race.get("race_id", -1)
		var chain: Array = race.get("evolution_chain", [])
		_assert_eq("Race %d chain length" % rid, chain.size(), 3)

func _test_quest_data() -> void:
	_assert_gte("Quest count", DataLoader.quests.size(), 10)

func _test_temple_data() -> void:
	_assert_gte("Temple count", DataLoader.temples.size(), 30)

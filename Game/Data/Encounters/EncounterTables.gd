## EncounterTables — Static encounter data for all explorable areas.
## Defines which Sprite races appear in each area, their level ranges,
## spawn weights, and rarity classifications.
##
## Design notes:
##   - race_id values reference SpriteRaces.gd definitions (1-24)
##   - weight is the relative spawn probability (higher = more common)
##   - rarity describes encounter rarity: "common", "uncommon", "rare", "legendary"
##   - Level ranges progress from starter_route (2-5) to ancient_ruins (40-50)
##   - Each area has 2-4 possible encounters with varied weights
##   - Legendary encounters only appear in ancient_ruins (race_ids 23, 24)
##   - Use get_table(area_id) to retrieve a specific area's encounter list
class_name EncounterTables
extends RefCounted


## Return the encounter table for a given area_id.
## Returns an empty array if the area_id is not recognized.
static func get_table(area_id: String) -> Array[Dictionary]:
	var tables := _get_all_tables()
	if tables.has(area_id):
		return tables[area_id]
	return [] as Array[Dictionary]


## Return all area IDs that have encounter tables defined.
static func get_all_area_ids() -> Array[String]:
	return [
		"starter_route",
		"forest_path",
		"coastal_trail",
		"mountain_pass",
		"volcanic_cave",
		"frozen_peaks",
		"thunder_plains",
		"dark_forest",
		"crystal_cavern",
		"ancient_ruins",
	]


## Return the full mapping of all encounter tables keyed by area_id.
static func _get_all_tables() -> Dictionary:
	return {
		# ──────────────────────────────────────────────────────────────────────
		# STARTER ROUTE — First area, levels 2-5
		# Races: Emberpaw (Fire), Tidalfin (Water), Thornvine (Nature), Frostfang (Ice)
		# ──────────────────────────────────────────────────────────────────────
		"starter_route": [
			{"race_id": 1, "min_level": 2, "max_level": 5, "weight": 40, "rarity": "common"},
			{"race_id": 2, "min_level": 2, "max_level": 5, "weight": 30, "rarity": "common"},
			{"race_id": 3, "min_level": 2, "max_level": 5, "weight": 20, "rarity": "uncommon"},
			{"race_id": 4, "min_level": 3, "max_level": 5, "weight": 10, "rarity": "rare"},
		] as Array[Dictionary],

		# ──────────────────────────────────────────────────────────────────────
		# FOREST PATH — Early area, levels 5-8
		# Races: Thornvine (Nature), Galecrest (Air), Terraclaw (Earth), Voltail (Electric)
		# ──────────────────────────────────────────────────────────────────────
		"forest_path": [
			{"race_id": 3, "min_level": 5, "max_level": 8, "weight": 35, "rarity": "common"},
			{"race_id": 5, "min_level": 5, "max_level": 8, "weight": 30, "rarity": "common"},
			{"race_id": 6, "min_level": 5, "max_level": 8, "weight": 20, "rarity": "uncommon"},
			{"race_id": 7, "min_level": 6, "max_level": 8, "weight": 15, "rarity": "uncommon"},
		] as Array[Dictionary],

		# ──────────────────────────────────────────────────────────────────────
		# COASTAL TRAIL — Mid-early area, levels 8-12
		# Races: Tidalfin (Water), Gloomshade (Dark), Luminos (Light), Glimmerwing (Psychic)
		# ──────────────────────────────────────────────────────────────────────
		"coastal_trail": [
			{"race_id": 2, "min_level": 8, "max_level": 12, "weight": 35, "rarity": "common"},
			{"race_id": 8, "min_level": 8, "max_level": 12, "weight": 25, "rarity": "uncommon"},
			{"race_id": 9, "min_level": 9, "max_level": 12, "weight": 25, "rarity": "uncommon"},
			{"race_id": 10, "min_level": 10, "max_level": 12, "weight": 15, "rarity": "rare"},
		] as Array[Dictionary],

		# ──────────────────────────────────────────────────────────────────────
		# MOUNTAIN PASS — Mid area, levels 12-16
		# Races: Frostfang (Ice), Spectrail (Spirit), Ignisurge (Chaos), Ironhusk (Metal)
		# ──────────────────────────────────────────────────────────────────────
		"mountain_pass": [
			{"race_id": 4, "min_level": 12, "max_level": 16, "weight": 30, "rarity": "common"},
			{"race_id": 11, "min_level": 12, "max_level": 16, "weight": 25, "rarity": "uncommon"},
			{"race_id": 12, "min_level": 13, "max_level": 16, "weight": 25, "rarity": "rare"},
			{"race_id": 13, "min_level": 12, "max_level": 16, "weight": 20, "rarity": "common"},
		] as Array[Dictionary],

		# ──────────────────────────────────────────────────────────────────────
		# VOLCANIC CAVE — Mid-late area, levels 16-20
		# Races: Emberpaw (Fire), Venomire (Poison), Blazeguard (Fire/Guardian)
		# ──────────────────────────────────────────────────────────────────────
		"volcanic_cave": [
			{"race_id": 1, "min_level": 16, "max_level": 20, "weight": 35, "rarity": "common"},
			{"race_id": 14, "min_level": 16, "max_level": 20, "weight": 35, "rarity": "common"},
			{"race_id": 15, "min_level": 17, "max_level": 20, "weight": 30, "rarity": "uncommon"},
		] as Array[Dictionary],

		# ──────────────────────────────────────────────────────────────────────
		# FROZEN PEAKS — Late area, levels 20-25
		# Races: Terraclaw (Earth), Aquashot (Water/Archer), Pyrovolt (Fire+Electric)
		# ──────────────────────────────────────────────────────────────────────
		"frozen_peaks": [
			{"race_id": 6, "min_level": 20, "max_level": 25, "weight": 35, "rarity": "common"},
			{"race_id": 16, "min_level": 20, "max_level": 25, "weight": 35, "rarity": "common"},
			{"race_id": 17, "min_level": 22, "max_level": 25, "weight": 30, "rarity": "rare"},
		] as Array[Dictionary],

		# ──────────────────────────────────────────────────────────────────────
		# THUNDER PLAINS — Late area, levels 25-30
		# Races: Voltail (Electric), Venomthorn (Poison+Nature), Shadowflare (Dark+Fire)
		# ──────────────────────────────────────────────────────────────────────
		"thunder_plains": [
			{"race_id": 7, "min_level": 25, "max_level": 30, "weight": 35, "rarity": "common"},
			{"race_id": 18, "min_level": 25, "max_level": 30, "weight": 35, "rarity": "uncommon"},
			{"race_id": 19, "min_level": 27, "max_level": 30, "weight": 30, "rarity": "rare"},
		] as Array[Dictionary],

		# ──────────────────────────────────────────────────────────────────────
		# DARK FOREST — Endgame area, levels 30-35
		# Races: Gloomshade (Dark), Crystalmist (Ice+Psychic), Ironstorm (Metal+Air)
		# ──────────────────────────────────────────────────────────────────────
		"dark_forest": [
			{"race_id": 8, "min_level": 30, "max_level": 35, "weight": 35, "rarity": "common"},
			{"race_id": 20, "min_level": 30, "max_level": 35, "weight": 35, "rarity": "rare"},
			{"race_id": 21, "min_level": 32, "max_level": 35, "weight": 30, "rarity": "uncommon"},
		] as Array[Dictionary],

		# ──────────────────────────────────────────────────────────────────────
		# CRYSTAL CAVERN — Endgame area, levels 35-40
		# Races: Luminos (Light), Glimmerwing (Psychic), Spiritbloom (Spirit+Nature)
		# ──────────────────────────────────────────────────────────────────────
		"crystal_cavern": [
			{"race_id": 9, "min_level": 35, "max_level": 40, "weight": 35, "rarity": "uncommon"},
			{"race_id": 10, "min_level": 35, "max_level": 40, "weight": 35, "rarity": "uncommon"},
			{"race_id": 22, "min_level": 37, "max_level": 40, "weight": 30, "rarity": "rare"},
		] as Array[Dictionary],

		# ──────────────────────────────────────────────────────────────────────
		# ANCIENT RUINS — Final area, levels 40-50, legendary encounters
		# Races: Solarius (Light+Chaos), Eclipsar (Dark+Spirit)
		# ──────────────────────────────────────────────────────────────────────
		"ancient_ruins": [
			{"race_id": 23, "min_level": 40, "max_level": 50, "weight": 50, "rarity": "legendary"},
			{"race_id": 24, "min_level": 40, "max_level": 50, "weight": 50, "rarity": "legendary"},
		] as Array[Dictionary],
	}


## Select a random encounter from an area's table using weighted probability.
## Returns a dictionary with race_id, level (randomly chosen within range), and rarity.
## Returns an empty dictionary if the area has no encounters.
static func roll_encounter(area_id: String) -> Dictionary:
	var table := get_table(area_id)
	if table.is_empty():
		return {}

	# Calculate total weight.
	var total_weight: int = 0
	for entry: Dictionary in table:
		total_weight += int(entry.get("weight", 0))

	if total_weight <= 0:
		return {}

	# Roll a random value within total weight.
	var roll: int = randi() % total_weight
	var cumulative: int = 0

	for entry: Dictionary in table:
		cumulative += int(entry.get("weight", 0))
		if roll < cumulative:
			var min_lvl: int = int(entry.get("min_level", 1))
			var max_lvl: int = int(entry.get("max_level", 1))
			var level: int = min_lvl + (randi() % (max_lvl - min_lvl + 1))
			return {
				"race_id": entry.get("race_id", 0),
				"level": level,
				"rarity": entry.get("rarity", "common"),
			}

	return {}


## Return the minimum and maximum levels for a given area (across all encounters).
static func get_area_level_range(area_id: String) -> Dictionary:
	var table := get_table(area_id)
	if table.is_empty():
		return {"min_level": 0, "max_level": 0}

	var min_lvl: int = 999
	var max_lvl: int = 0
	for entry: Dictionary in table:
		var entry_min: int = int(entry.get("min_level", 0))
		var entry_max: int = int(entry.get("max_level", 0))
		if entry_min < min_lvl:
			min_lvl = entry_min
		if entry_max > max_lvl:
			max_lvl = entry_max
	return {"min_level": min_lvl, "max_level": max_lvl}


## Return all area_ids where a given race_id can be encountered.
static func get_areas_for_race(race_id: int) -> Array[String]:
	var result: Array[String] = []
	var tables := _get_all_tables()
	for area_id: String in tables:
		for entry: Dictionary in tables[area_id]:
			if int(entry.get("race_id", -1)) == race_id:
				result.append(area_id)
				break
	return result


## Validate that all race_ids in encounter tables exist in SpriteRaces (1-24).
## Returns a list of warning strings for any invalid references.
static func validate_race_references() -> Array[String]:
	var warnings: Array[String] = []
	var valid_ids: Array[int] = range(1, 25) as Array[int]
	var tables := _get_all_tables()
	for area_id: String in tables:
		for entry: Dictionary in tables[area_id]:
			var rid: int = int(entry.get("race_id", 0))
			if rid not in valid_ids:
				warnings.append("Area '%s' references invalid race_id %d." % [area_id, rid])
	return warnings

## EncounterSystem — Manages wild Sprite encounter logic including step-based
## probability, per-area encounter tables, level scaling, and battle data generation.
## [P5-006] Drives random encounters when the player walks through encounter zones.
extends Node

## ── Configuration ───────────────────────────────────────────────────────────

## Base probability of encountering a wild Sprite per step in an encounter zone.
@export var base_encounter_rate: float = 0.1

## Minimum number of steps before an encounter can trigger (grace period).
@export var min_steps_between_encounters: int = 4

## Maximum steps before an encounter is forced (anti-frustration cap).
@export var max_steps_without_encounter: int = 30

## ── Encounter Tables ────────────────────────────────────────────────────────

## Dictionary mapping area_id (String) to an EncounterTable instance.
var encounter_tables: Dictionary = {}  # {String: EncounterTable}

## Number of steps taken in encounter zones since the last encounter.
var steps_since_encounter: int = 0

## ── Inner Class ─────────────────────────────────────────────────────────────

## Defines the weighted pool of wild Sprites for a specific area.
class EncounterTable:
	## Array of species entries with rarity-based weighting.
	## Each entry: {race_id: int, min_level: int, max_level: int, weight: float, rarity: String}
	var species_weights: Array[Dictionary] = []

	## Total weight for weighted random selection.
	var _total_weight: float = 0.0

	func _init(entries: Array[Dictionary] = []) -> void:
		species_weights = entries
		_recalculate_total_weight()

	func add_entry(entry: Dictionary) -> void:
		species_weights.append(entry)
		_recalculate_total_weight()

	func _recalculate_total_weight() -> void:
		_total_weight = 0.0
		for entry: Dictionary in species_weights:
			_total_weight += entry.get("weight", 1.0)

	## Selects a random species entry using weighted random selection.
	func roll_species() -> Dictionary:
		if species_weights.is_empty():
			return {}
		if _total_weight <= 0.0:
			return species_weights[0]

		var roll: float = randf() * _total_weight
		var cumulative: float = 0.0
		for entry: Dictionary in species_weights:
			cumulative += entry.get("weight", 1.0)
			if roll <= cumulative:
				return entry
		return species_weights[-1]


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	add_to_group("encounter_system")


## ── Public API ──────────────────────────────────────────────────────────────

## Registers an encounter table for the given area.
func register_table(area_id: String, entries: Array[Dictionary]) -> void:
	encounter_tables[area_id] = EncounterTable.new(entries)


## Called each time the player steps on an encounter tile.
## Returns a non-empty Dictionary with encounter data if an encounter triggers,
## or an empty Dictionary if no encounter occurs.
func check_encounter(area_id: String) -> Dictionary:
	steps_since_encounter += 1

	if not encounter_tables.has(area_id):
		return {}

	# Grace period: no encounters until minimum steps reached
	if steps_since_encounter < min_steps_between_encounters:
		return {}

	# Calculate effective encounter rate with progressive increase
	var effective_rate: float = _calculate_encounter_rate()

	# Apply weather modifier if a WeatherSystem is present
	effective_rate *= _get_weather_modifier()

	# Force encounter at max steps
	if steps_since_encounter >= max_steps_without_encounter:
		effective_rate = 1.0

	# Roll the dice
	if randf() > effective_rate:
		return {}

	# Encounter triggered -- roll species and level
	var table: EncounterTable = encounter_tables[area_id]
	var species_entry: Dictionary = table.roll_species()

	if species_entry.is_empty():
		return {}

	var level: int = _determine_level(species_entry)

	steps_since_encounter = 0

	var encounter_data: Dictionary = {
		"type": "wild",
		"area_id": area_id,
		"race_id": species_entry.get("race_id", 0),
		"level": level,
		"rarity": species_entry.get("rarity", "common"),
	}

	return encounter_data


## Builds a full battle data Dictionary from encounter data, ready for the
## BattleManager to consume.
func build_wild_battle(encounter_data: Dictionary) -> Dictionary:
	var race_id: int = encounter_data.get("race_id", 0)
	var level: int = encounter_data.get("level", 1)
	var rarity: String = encounter_data.get("rarity", "common")

	# Generate wild Sprite stats using the race data
	var wild_sprite: Dictionary = {
		"race_id": race_id,
		"level": level,
		"rarity": rarity,
		"is_wild": true,
	}

	# Apply rarity stat bonuses
	var iv_bonus: float = _get_rarity_iv_bonus(rarity)
	wild_sprite["iv_bonus"] = iv_bonus

	var battle_data: Dictionary = {
		"battle_type": "wild",
		"area_id": encounter_data.get("area_id", ""),
		"enemy_team": [wild_sprite],
		"can_flee": true,
		"can_catch": true,
		"background": _get_battle_background(encounter_data.get("area_id", "")),
	}

	# Include weather condition if active
	var weather_condition: Dictionary = _get_weather_battle_condition()
	if not weather_condition.is_empty():
		battle_data["weather_condition"] = weather_condition

	return battle_data


## Resets the step counter (e.g. after using a repel item).
func reset_step_counter() -> void:
	steps_since_encounter = 0


## ── Encounter Rate Calculation ──────────────────────────────────────────────

## Progressive encounter rate: increases with more steps taken since last encounter.
func _calculate_encounter_rate() -> float:
	var steps_over_min: int = steps_since_encounter - min_steps_between_encounters
	var progress: float = float(steps_over_min) / float(
		max_steps_without_encounter - min_steps_between_encounters
	)
	progress = clampf(progress, 0.0, 1.0)

	# Quadratic ramp from base_encounter_rate toward 1.0
	return base_encounter_rate + (1.0 - base_encounter_rate) * progress * progress


## ── Level Determination ─────────────────────────────────────────────────────

func _determine_level(species_entry: Dictionary) -> int:
	var min_level: int = species_entry.get("min_level", 1)
	var max_level: int = species_entry.get("max_level", min_level)
	return randi_range(min_level, max_level)


## ── Rarity Bonuses ──────────────────────────────────────────────────────────

## Rarity modifies the individual value (IV) bonus for the wild Sprite's stats.
func _get_rarity_iv_bonus(rarity: String) -> float:
	match rarity:
		"common":
			return 0.0
		"uncommon":
			return 0.05
		"rare":
			return 0.10
		"legendary":
			return 0.20
		_:
			return 0.0


## ── Weather Integration ─────────────────────────────────────────────────────

## Gets the encounter rate modifier from the WeatherSystem if present.
func _get_weather_modifier() -> float:
	var weather_systems := get_tree().get_nodes_in_group("weather_system")
	if weather_systems.is_empty():
		return 1.0
	var ws: Node = weather_systems[0]
	if ws.has_method("get_encounter_rate_modifier"):
		return ws.get_encounter_rate_modifier(ws.get("current_weather"))
	return 1.0


## Gets the active weather's battle condition from the WeatherSystem.
func _get_weather_battle_condition() -> Dictionary:
	var weather_systems := get_tree().get_nodes_in_group("weather_system")
	if weather_systems.is_empty():
		return {}
	var ws: Node = weather_systems[0]
	if ws.has_method("get_battle_condition"):
		return ws.get_battle_condition(ws.get("current_weather"))
	return {}


## ── Battle Background ───────────────────────────────────────────────────────

func _get_battle_background(area_id: String) -> String:
	# Default mapping; production would load this from a data resource.
	var bg_map: Dictionary = {
		"starter_town": "res://Sprites/Battle Backgrounds/grassland.png",
		"ember_cave": "res://Sprites/Battle Backgrounds/cave.png",
		"frost_peak": "res://Sprites/Battle Backgrounds/snow.png",
		"shadow_forest": "res://Sprites/Battle Backgrounds/forest.png",
	}
	return bg_map.get(area_id, "res://Sprites/Battle Backgrounds/grassland.png")

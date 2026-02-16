## DataLoader — Central data registry that loads and caches all game databases.
## Provides typed access to Sprites, abilities, elements, items, equipment, and more.
extends Node

## All 24 Sprite race definitions
var races: Array = []
## All 72 evolution form definitions
var evolutions: Array = []
## 14×14 element effectiveness chart
var element_chart: Dictionary = {}
## All 160+ abilities
var abilities: Array = []
## All status effects
var status_effects: Array = []
## Learnsets keyed by race_id
var learnsets: Dictionary = {}
## All crystal types for catching
var crystals: Array = []
## All consumable items
var consumables: Array = []
## All equipment items
var equipment: Array = []
## Encounter tables keyed by area_id
var encounter_tables: Dictionary = {}
## All quest definitions
var quests: Array = []
## All temple definitions
var temples: Array = []
## Composition bonus definitions
var composition_bonuses: Array = []

## Lookup caches for fast ID-based access
var _race_by_id: Dictionary = {}
var _ability_by_id: Dictionary = {}
var _form_by_id: Dictionary = {}
var _status_by_id: Dictionary = {}
var _crystal_by_id: Dictionary = {}
var _equipment_by_id: Dictionary = {}
var _quest_by_id: Dictionary = {}
var _temple_by_id: Dictionary = {}

var _loaded: bool = false

func _ready() -> void:
	load_all_data()

func load_all_data() -> void:
	if _loaded:
		return

	# Load core Sprite data
	var sprite_races_db = load("res://Data/Sprites/SpriteRaces.gd")
	if sprite_races_db:
		races = sprite_races_db.new().get_all_races() if sprite_races_db.has_method("get_all_races") else _try_static_call(sprite_races_db, "get_all_races")

	var evo_db = load("res://Data/Sprites/EvolutionData.gd")
	if evo_db:
		evolutions = _try_static_call(evo_db, "get_all_evolutions")

	# Load element chart
	var elem_db = load("res://Data/Elements/ElementChart.gd")
	if elem_db:
		element_chart = _try_static_call(elem_db, "get_chart")

	# Load abilities
	var ability_db = load("res://Data/Abilities/AbilityDatabase.gd")
	if ability_db:
		abilities = _try_static_call(ability_db, "get_all_abilities")

	# Load status effects
	var status_db = load("res://Data/StatusEffects/StatusEffectDatabase.gd")
	if status_db:
		status_effects = _try_static_call(status_db, "get_all_effects")

	# Load learnsets
	var learnset_db = load("res://Data/Sprites/SpriteLearnsets.gd")
	if learnset_db:
		learnsets = _try_static_call(learnset_db, "get_all_learnsets")

	# Load items
	var crystal_db = load("res://Data/Items/CrystalData.gd")
	if crystal_db:
		crystals = _try_static_call(crystal_db, "get_all_crystals")

	var consumable_db = load("res://Data/Items/ConsumableData.gd")
	if consumable_db:
		consumables = _try_static_call(consumable_db, "get_all_consumables")

	# Load equipment
	var equip_db = load("res://Data/Equipment/EquipmentDatabase.gd")
	if equip_db:
		equipment = _try_static_call(equip_db, "get_all_equipment")

	# Load quests
	var quest_db = load("res://Data/Quests/MainQuestData.gd")
	if quest_db:
		quests = _try_static_call(quest_db, "get_all_quests")

	# Load temples
	var temple_db = load("res://Data/Temples/TempleDatabase.gd")
	if temple_db:
		temples = _try_static_call(temple_db, "get_all_temples")

	# Build lookup caches
	_build_caches()
	_loaded = true
	print("[DataLoader] All data loaded: %d races, %d evolutions, %d abilities, %d status effects" % [
		races.size(), evolutions.size(), abilities.size(), status_effects.size()
	])

func _try_static_call(script: GDScript, method: String) -> Variant:
	if script.has_method(method):
		return script.call(method)
	# Try instantiating if it's not a static method on the script itself
	var instance = script.new()
	if instance.has_method(method):
		return instance.call(method)
	push_warning("[DataLoader] Script %s has no method '%s'" % [script.resource_path, method])
	return []

func _build_caches() -> void:
	_race_by_id.clear()
	for r in races:
		_race_by_id[r.get("race_id", -1)] = r

	_ability_by_id.clear()
	for a in abilities:
		_ability_by_id[a.get("ability_id", -1)] = a

	_form_by_id.clear()
	for e in evolutions:
		_form_by_id[e.get("form_id", -1)] = e

	_status_by_id.clear()
	for s in status_effects:
		_status_by_id[s.get("effect_id", -1)] = s

	_crystal_by_id.clear()
	for c in crystals:
		_crystal_by_id[c.get("item_id", -1)] = c

	_equipment_by_id.clear()
	for eq in equipment:
		_equipment_by_id[eq.get("equipment_id", -1)] = eq

	_quest_by_id.clear()
	for q in quests:
		_quest_by_id[q.get("quest_id", -1)] = q

	_temple_by_id.clear()
	for t in temples:
		_temple_by_id[t.get("temple_id", -1)] = t

## Fast lookups by ID
func get_race(race_id: int) -> Dictionary:
	return _race_by_id.get(race_id, {})

func get_ability(ability_id: int) -> Dictionary:
	return _ability_by_id.get(ability_id, {})

func get_form(form_id: int) -> Dictionary:
	return _form_by_id.get(form_id, {})

func get_status_effect(effect_id: int) -> Dictionary:
	return _status_by_id.get(effect_id, {})

func get_crystal(item_id: int) -> Dictionary:
	return _crystal_by_id.get(item_id, {})

func get_equipment(equipment_id: int) -> Dictionary:
	return _equipment_by_id.get(equipment_id, {})

func get_quest(quest_id: int) -> Dictionary:
	return _quest_by_id.get(quest_id, {})

func get_temple(temple_id: int) -> Dictionary:
	return _temple_by_id.get(temple_id, {})

## Get abilities by element type
func get_abilities_by_element(element: String) -> Array:
	var result: Array = []
	for a in abilities:
		if a.get("element_type", "") == element:
			result.append(a)
	return result

## Get learnset for a specific race
func get_learnset(race_id: int) -> Array:
	return learnsets.get(race_id, [])

## Get all forms for a race
func get_race_forms(race_id: int) -> Array:
	var forms: Array = []
	for e in evolutions:
		if e.get("race_id", -1) == race_id:
			forms.append(e)
	forms.sort_custom(func(a, b): return a.get("stage_number", 0) < b.get("stage_number", 0))
	return forms

## Get element effectiveness multiplier
func get_effectiveness(atk_element: String, def_element: String) -> float:
	if atk_element in element_chart:
		return element_chart[atk_element].get(def_element, 1.0)
	return 1.0

## Validate all loaded data and return error list
func validate_all() -> Array[String]:
	var errors: Array[String] = []
	errors.append_array(SpriteDataValidator.validate_all(races, evolutions, element_chart, abilities, learnsets))
	errors.append_array(AbilityDataValidator.validate_all(abilities, status_effects, learnsets))
	return errors

## AbilitySFXSystem — Maps abilities to sound effects and triggers audio by phase.
## [P11-024] Supports per-ability SFX overrides and element-based fallback sounds.
class_name AbilitySFXSystem
extends RefCounted

# ==============================================================================
# Constants
# ==============================================================================

## Valid ability SFX phases.
enum Phase { CAST, TRAVEL, HIT }

const PHASE_NAMES: Dictionary = {
	Phase.CAST: "cast",
	Phase.TRAVEL: "travel",
	Phase.HIT: "hit",
}

## SFX base path for ability sounds.
const ABILITY_SFX_PATH: String = "res://Audio/Sounds/"

# ==============================================================================
# Data
# ==============================================================================

## Per-ability SFX overrides.
## Format: { ability_id: int → { "cast_sfx": String, "travel_sfx": String,
##           "hit_sfx": String, "impact_delay": float } }
var ability_sfx_map: Dictionary = {}

## Element-to-SFX family mapping. Each element maps to a dictionary of phase → sfx name.
## These act as fallback sounds when an ability has no specific override.
var element_sfx_map: Dictionary = {
	"fire": {
		"cast": "Ability_Fire_Cast",
		"travel": "Ability_Fire_Travel",
		"hit": "Ability_Fire_Hit",
	},
	"water": {
		"cast": "Ability_Water_Cast",
		"travel": "Ability_Water_Travel",
		"hit": "Ability_Water_Hit",
	},
	"plant": {
		"cast": "Ability_Plant_Cast",
		"travel": "Ability_Plant_Travel",
		"hit": "Ability_Plant_Hit",
	},
	"ice": {
		"cast": "Ability_Ice_Cast",
		"travel": "Ability_Ice_Travel",
		"hit": "Ability_Ice_Hit",
	},
	"wind": {
		"cast": "Ability_Wind_Cast",
		"travel": "Ability_Wind_Travel",
		"hit": "Ability_Wind_Hit",
	},
	"earth": {
		"cast": "Ability_Earth_Cast",
		"travel": "Ability_Earth_Travel",
		"hit": "Ability_Earth_Hit",
	},
	"electric": {
		"cast": "Ability_Electric_Cast",
		"travel": "Ability_Electric_Travel",
		"hit": "Ability_Electric_Hit",
	},
	"dark": {
		"cast": "Ability_Dark_Cast",
		"travel": "Ability_Dark_Travel",
		"hit": "Ability_Dark_Hit",
	},
	"light": {
		"cast": "Ability_Light_Cast",
		"travel": "Ability_Light_Travel",
		"hit": "Ability_Light_Hit",
	},
	"fairy": {
		"cast": "Ability_Fairy_Cast",
		"travel": "Ability_Fairy_Travel",
		"hit": "Ability_Fairy_Hit",
	},
	"lunar": {
		"cast": "Ability_Lunar_Cast",
		"travel": "Ability_Lunar_Travel",
		"hit": "Ability_Lunar_Hit",
	},
	"solar": {
		"cast": "Ability_Solar_Cast",
		"travel": "Ability_Solar_Travel",
		"hit": "Ability_Solar_Hit",
	},
	"metal": {
		"cast": "Ability_Metal_Cast",
		"travel": "Ability_Metal_Travel",
		"hit": "Ability_Metal_Hit",
	},
	"poison": {
		"cast": "Ability_Poison_Cast",
		"travel": "Ability_Poison_Travel",
		"hit": "Ability_Poison_Hit",
	},
}

## Generic fallback SFX used when neither ability nor element SFX exist.
var generic_sfx: Dictionary = {
	"cast": "Hit",
	"travel": "Hit",
	"hit": "Hit",
}

# ==============================================================================
# Public API
# ==============================================================================

## Play the SFX for a given ability at a specific phase.
## [param ability_id] The unique ID of the ability being used.
## [param phase] One of "cast", "travel", or "hit".
## [param element] The ability's element type (used for fallback sounds).
## [param position] Optional world position for positional audio.
func play_ability_sfx(ability_id: int, phase: String, element: String = "", position: Vector2 = Vector2.ZERO) -> void:
	var sfx_name := _resolve_sfx_name(ability_id, phase, element)
	if sfx_name.is_empty():
		return

	# Handle impact delay for the hit phase.
	if phase == "hit" and ability_sfx_map.has(ability_id):
		var delay: float = ability_sfx_map[ability_id].get("impact_delay", 0.0)
		if delay > 0.0:
			_play_delayed(sfx_name, delay, position)
			return

	AudioManager.play_sfx(sfx_name, position)


## Register SFX data for a specific ability.
## [param sfx_data] Dictionary with keys: cast_sfx, travel_sfx, hit_sfx, impact_delay.
func register_ability_sfx(ability_id: int, sfx_data: Dictionary) -> void:
	ability_sfx_map[ability_id] = sfx_data


## Batch-register multiple abilities at once.
## [param data] Dictionary of { ability_id: int → sfx_data: Dictionary }.
func register_bulk(data: Dictionary) -> void:
	for ability_id: int in data:
		register_ability_sfx(ability_id, data[ability_id])


## Remove SFX registration for an ability (useful for hot-reload / testing).
func unregister_ability_sfx(ability_id: int) -> void:
	ability_sfx_map.erase(ability_id)


## Get the default hit SFX name for a given element.
## Returns the element-specific hit SFX key, or the generic hit fallback.
func get_element_hit_sfx(element: String) -> String:
	var lower_element := element.to_lower()
	if element_sfx_map.has(lower_element):
		return element_sfx_map[lower_element].get("hit", generic_sfx["hit"])
	return generic_sfx["hit"]


## Get the full SFX dictionary for an element.
func get_element_sfx_family(element: String) -> Dictionary:
	var lower_element := element.to_lower()
	return element_sfx_map.get(lower_element, generic_sfx.duplicate())


## Override element SFX mapping (for modding or special events).
func set_element_sfx(element: String, sfx_family: Dictionary) -> void:
	element_sfx_map[element.to_lower()] = sfx_family


## Check whether a specific ability has custom SFX registered.
func has_custom_sfx(ability_id: int) -> bool:
	return ability_sfx_map.has(ability_id)

# ==============================================================================
# Internal
# ==============================================================================

## Resolve which SFX name to play, checking ability overrides first, then
## element defaults, then generic fallback.
func _resolve_sfx_name(ability_id: int, phase: String, element: String) -> String:
	# 1. Per-ability override.
	if ability_sfx_map.has(ability_id):
		var key := phase + "_sfx"
		var override_name: String = ability_sfx_map[ability_id].get(key, "")
		if not override_name.is_empty():
			return override_name

	# 2. Element-based fallback.
	var lower_element := element.to_lower()
	if element_sfx_map.has(lower_element):
		var element_name: String = element_sfx_map[lower_element].get(phase, "")
		if not element_name.is_empty():
			return element_name

	# 3. Generic fallback.
	return generic_sfx.get(phase, "")


## Play an SFX after a delay using a SceneTree timer.
func _play_delayed(sfx_name: String, delay: float, position: Vector2) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	if not tree:
		AudioManager.play_sfx(sfx_name, position)
		return
	var timer := tree.create_timer(delay)
	timer.timeout.connect(func() -> void:
		AudioManager.play_sfx(sfx_name, position)
	)

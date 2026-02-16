## SpriteRaceData — Base data schema for a Sprite race definition.
## [P1-001] Defines the immutable template for one of the 24 Sprite races.
## Each race has an element affinity, class type, base stats, growth curves,
## and a 3-stage evolution chain (referencing EvolutionStageData form_ids).
class_name SpriteRaceData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

@export var race_id: int = 0
@export var race_name: String = ""

## ── Element & Class ───────────────────────────────────────────────────────────

## Supports dual-element Sprites (e.g. ["Fire", "Dark"]). Most have one entry.
@export var element_types: Array[String] = []

## Combat archetype. Must be one of VALID_CLASSES.
@export var class_type: String = ""

const VALID_CLASSES: PackedStringArray = PackedStringArray([
	"Spearman", "Archer", "Wizard", "Knight", "Assassin",
	"Cleric", "Berserker", "Summoner", "Guardian", "Ranger",
])

## ── Stats ─────────────────────────────────────────────────────────────────────

## Level-1 base stats before any growth, IVs, or equipment.
## Keys: hp, atk, def, spd, sp_atk, sp_def
@export var base_stats: Dictionary = {
	"hp": 0,
	"atk": 0,
	"def": 0,
	"spd": 0,
	"sp_atk": 0,
	"sp_def": 0,
}

## Per-level additive growth values. Applied each level via:
##   stat = base + (growth * (level - 1))
## Fine-grained float values (e.g. 2.4) are truncated at evaluation time.
@export var growth_rates: Dictionary = {
	"hp": 0.0,
	"atk": 0.0,
	"def": 0.0,
	"spd": 0.0,
	"sp_atk": 0.0,
	"sp_def": 0.0,
}

## ── Evolution ─────────────────────────────────────────────────────────────────

## Ordered array of EvolutionStageData form_ids (length 3 for stages 1-2-3).
@export var evolution_chain: Array[int] = []

## ── Presentation ──────────────────────────────────────────────────────────────

@export_multiline var lore_description: String = ""

@export_enum("common", "uncommon", "rare", "legendary") var rarity: String = "common"

## Path to the sprite sheet resource (e.g. "res://Sprites/Characters/race01.png").
@export_file("*.png,*.tres") var sprite_sheet_path: String = ""

## Path to the cry/call SFX asset.
@export_file("*.ogg,*.wav") var cry_sfx_path: String = ""


## ── Constants ─────────────────────────────────────────────────────────────────

const STAT_KEYS := ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]


## ── Helpers ───────────────────────────────────────────────────────────────────

## Return the stat value for a given level (before IVs and equipment).
func get_stat_at_level(stat_key: String, level: int) -> int:
	assert(stat_key in STAT_KEYS, "Invalid stat key: %s" % stat_key)
	var base: float = float(base_stats.get(stat_key, 0))
	var growth: float = float(growth_rates.get(stat_key, 0.0))
	return int(base + growth * float(maxi(level - 1, 0)))


## Return a full stat dictionary for the given level.
func get_all_stats_at_level(level: int) -> Dictionary:
	var stats := {}
	for key in STAT_KEYS:
		stats[key] = get_stat_at_level(key, level)
	return stats


## True if this race has the given element.
func has_element(element_name: String) -> bool:
	return element_name in element_types


## True if this race is dual-element.
func is_dual_element() -> bool:
	return element_types.size() >= 2


## Validate that all required fields are populated. Returns an array of error
## strings (empty if valid).
func validate() -> Array[String]:
	var errors: Array[String] = []
	if race_id <= 0:
		errors.append("race_id must be a positive integer.")
	if race_name.is_empty():
		errors.append("race_name is required.")
	if element_types.is_empty():
		errors.append("At least one element_type is required.")
	if class_type.is_empty():
		errors.append("class_type is required.")
	elif class_type not in VALID_CLASSES:
		errors.append("class_type '%s' is not in VALID_CLASSES." % class_type)
	for key in STAT_KEYS:
		if not base_stats.has(key):
			errors.append("base_stats missing key '%s'." % key)
		if not growth_rates.has(key):
			errors.append("growth_rates missing key '%s'." % key)
	if evolution_chain.size() != 3:
		errors.append("evolution_chain must contain exactly 3 form_ids.")
	if rarity not in ["common", "uncommon", "rare", "legendary"]:
		errors.append("rarity '%s' is invalid." % rarity)
	return errors

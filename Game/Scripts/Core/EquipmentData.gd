## EquipmentData — Data schema for equippable items in Sprite Wars.
## [P4-012] Covers all 9 equipment slot types with stat bonuses, element/class
## synergy multipliers, level requirements, and acquisition sources.
class_name EquipmentData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

@export var equipment_id: int = 0
@export var equipment_name: String = ""

## ── Slot & Rarity ─────────────────────────────────────────────────────────────

## Which equipment slot this item occupies.
@export_enum(
	"weapon", "helmet", "chest", "legs", "boots",
	"gloves", "ring", "amulet", "crystal"
) var slot_type: String = "weapon"

@export_enum("common", "uncommon", "rare", "epic", "legendary") var rarity: String = "common"

## ── Stat Bonuses ──────────────────────────────────────────────────────────────

## Flat additive bonuses to stats when equipped.
## Keys: hp, atk, def, spd, sp_atk, sp_def. Missing keys = 0.
@export var stat_bonuses: Dictionary = {
	"hp": 0,
	"atk": 0,
	"def": 0,
	"spd": 0,
	"sp_atk": 0,
	"sp_def": 0,
}

## ── Element Synergy ───────────────────────────────────────────────────────────

## If the equipped Sprite shares this element, the stat_bonuses are multiplied
## by element_synergy_multiplier. Empty string = no element synergy.
@export var element_synergy: String = ""

## The bonus multiplier applied to stat_bonuses on element match (e.g. 1.3 = 30% extra).
@export_range(1.0, 3.0, 0.05) var element_synergy_multiplier: float = 1.0

## ── Class Synergy ─────────────────────────────────────────────────────────────

## If the equipped Sprite matches this class, stat_bonuses are multiplied
## by class_synergy_multiplier. Empty string = no class synergy.
@export var class_synergy: String = ""

## The bonus multiplier applied to stat_bonuses on class match.
@export_range(1.0, 3.0, 0.05) var class_synergy_multiplier: float = 1.0

## ── Requirements ──────────────────────────────────────────────────────────────

## Minimum Sprite level required to equip this item.
@export_range(1, 100) var level_requirement: int = 1

## ── Presentation ──────────────────────────────────────────────────────────────

@export_multiline var description: String = ""
@export_file("*.png,*.tres") var icon_path: String = ""

## ── Acquisition ───────────────────────────────────────────────────────────────

## Where this equipment can be obtained.
@export_enum("shop", "temple_drop", "quest_reward", "boss_drop") var source: String = "shop"


## ── Constants ─────────────────────────────────────────────────────────────────

const VALID_SLOTS: PackedStringArray = PackedStringArray([
	"weapon", "helmet", "chest", "legs", "boots",
	"gloves", "ring", "amulet", "crystal",
])

const VALID_RARITIES: PackedStringArray = PackedStringArray([
	"common", "uncommon", "rare", "epic", "legendary",
])

const VALID_SOURCES: PackedStringArray = PackedStringArray([
	"shop", "temple_drop", "quest_reward", "boss_drop",
])

const STAT_KEYS: PackedStringArray = PackedStringArray([
	"hp", "atk", "def", "spd", "sp_atk", "sp_def",
])

## Rarity-based sell price multipliers (relative to a base price).
const RARITY_SELL_MULTIPLIER: Dictionary = {
	"common": 1.0,
	"uncommon": 2.0,
	"rare": 5.0,
	"epic": 12.0,
	"legendary": 30.0,
}


## ── Helpers ───────────────────────────────────────────────────────────────────

## Calculate the effective stat bonuses for a Sprite with the given element(s)
## and class type, applying synergy multipliers as appropriate.
func get_effective_stat_bonuses(sprite_elements: Array[String], sprite_class: String) -> Dictionary:
	var multiplier: float = 1.0

	# Element synergy check.
	if not element_synergy.is_empty() and element_synergy in sprite_elements:
		multiplier *= element_synergy_multiplier

	# Class synergy check.
	if not class_synergy.is_empty() and class_synergy == sprite_class:
		multiplier *= class_synergy_multiplier

	var result := {}
	for key in STAT_KEYS:
		var base_bonus: int = int(stat_bonuses.get(key, 0))
		result[key] = int(float(base_bonus) * multiplier)
	return result


## Whether this equipment has any non-zero stat bonus.
func has_stat_bonuses() -> bool:
	for key in STAT_KEYS:
		if int(stat_bonuses.get(key, 0)) != 0:
			return true
	return false


## Whether a Sprite at the given level can equip this item.
func can_equip(sprite_level: int) -> bool:
	return sprite_level >= level_requirement


## Get a rough sell price based on rarity and total stat budget.
func get_sell_price() -> int:
	var total_stats: int = 0
	for key in STAT_KEYS:
		total_stats += absi(int(stat_bonuses.get(key, 0)))
	var base_price: int = maxi(1, total_stats * 5)
	return int(float(base_price) * RARITY_SELL_MULTIPLIER.get(rarity, 1.0))


## ── Validation ────────────────────────────────────────────────────────────────

func validate() -> Array[String]:
	var errors: Array[String] = []
	if equipment_id <= 0:
		errors.append("equipment_id must be a positive integer.")
	if equipment_name.is_empty():
		errors.append("equipment_name is required.")
	if slot_type not in VALID_SLOTS:
		errors.append("slot_type '%s' is invalid." % slot_type)
	if rarity not in VALID_RARITIES:
		errors.append("rarity '%s' is invalid." % rarity)
	if source not in VALID_SOURCES:
		errors.append("source '%s' is invalid." % source)
	if level_requirement < 1:
		errors.append("level_requirement must be >= 1.")
	if element_synergy_multiplier < 1.0:
		errors.append("element_synergy_multiplier must be >= 1.0.")
	if class_synergy_multiplier < 1.0:
		errors.append("class_synergy_multiplier must be >= 1.0.")
	for key in stat_bonuses:
		if key not in STAT_KEYS:
			errors.append("stat_bonuses key '%s' is not a valid stat." % str(key))
	return errors

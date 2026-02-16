## SpriteInstance — Runtime instance of a Sprite owned by the player.
## [P1-001 Runtime] Represents one individual Sprite in the player's team or
## storage. Holds mutable state: level, XP, HP, equipped abilities, equipment,
## IVs, and provides stat calculation that combines base + growth + level +
## evolution multipliers + IVs + equipment bonuses.
class_name SpriteInstance
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

## Unique instance ID assigned at creation time. Never reused.
@export var instance_id: int = 0

## Reference to the parent SpriteRaceData.race_id.
@export var race_id: int = 0

## The EvolutionStageData.form_id for the current evolution form (1-72).
@export var form_id: int = 0

## Player-given nickname. Empty string means use the race name.
@export var nickname: String = ""

## ── Progression ───────────────────────────────────────────────────────────────

@export_range(1, 100) var level: int = 1
@export var current_xp: int = 0

## Current hit points (mutable in battle; reset to max on full heal).
@export var current_hp: int = 0

## ── Abilities ─────────────────────────────────────────────────────────────────

## Up to 4 ability IDs that are actively equipped for battle.
@export var equipped_abilities: Array[int] = []

## All ability IDs this Sprite has ever learned (superset of equipped).
@export var learned_abilities: Array[int] = []

## ── Equipment ─────────────────────────────────────────────────────────────────

## Maps slot_type → equipment_id. -1 means slot is empty.
## The 9 canonical slots mirror EquipmentData.VALID_SLOTS.
@export var equipment: Dictionary = {
	"weapon": -1,
	"helmet": -1,
	"chest": -1,
	"legs": -1,
	"boots": -1,
	"gloves": -1,
	"ring": -1,
	"amulet": -1,
	"crystal": -1,
}

## ── Individual Variance (IVs) ─────────────────────────────────────────────────

## Random per-instance stat bonuses (0-31 per stat), determined at catch/hatch.
@export var iv_stats: Dictionary = {
	"hp": 0,
	"atk": 0,
	"def": 0,
	"spd": 0,
	"sp_atk": 0,
	"sp_def": 0,
}


## ── Constants ─────────────────────────────────────────────────────────────────

const STAT_KEYS := ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]

const MAX_IV: int = 31
const MAX_EQUIPPED_ABILITIES: int = 4
const MAX_LEVEL: int = 100

const EQUIPMENT_SLOTS: PackedStringArray = PackedStringArray([
	"weapon", "helmet", "chest", "legs", "boots",
	"gloves", "ring", "amulet", "crystal",
])


## ── Stat Calculation ──────────────────────────────────────────────────────────

## Calculate the effective value for a single stat, combining:
##   1. Base stat + per-level growth (from SpriteRaceData)
##   2. Evolution stage multiplier (from EvolutionStageData)
##   3. Individual variance (IVs)
##   4. Equipment bonuses (from an array of EquipmentData)
##
## HP has a special additive bonus: + level + 10
##
## Parameters:
##   stat_key         — one of STAT_KEYS
##   race_data        — the SpriteRaceData for this Sprite's race
##   stage_data       — the EvolutionStageData for the current form
##   equipment_list   — Array of EquipmentData currently equipped (caller resolves IDs)
##   sprite_elements  — this Sprite's element types (for equipment synergy)
##   sprite_class     — this Sprite's class type (for equipment synergy)
func calculate_effective_stat(
	stat_key: String,
	race_data: SpriteRaceData,
	stage_data: EvolutionStageData,
	equipment_list: Array = [],
	sprite_elements: Array[String] = [],
	sprite_class: String = "",
) -> int:
	# Step 1: base + growth at current level.
	var base_at_level: int = race_data.get_stat_at_level(stat_key, level)

	# Step 2: apply evolution multiplier.
	var stage_mult: float = float(stage_data.stat_multipliers.get(stat_key, 1.0))
	var after_stage: int = int(float(base_at_level) * stage_mult)

	# Step 3: add IV.
	var iv_bonus: int = int(iv_stats.get(stat_key, 0))

	# Step 4: add equipment bonuses.
	var equip_bonus: int = 0
	for equip in equipment_list:
		if equip is EquipmentData:
			var bonuses: Dictionary = equip.get_effective_stat_bonuses(sprite_elements, sprite_class)
			equip_bonus += int(bonuses.get(stat_key, 0))

	var total: int = after_stage + iv_bonus + equip_bonus

	# HP gets an additive level-based bonus.
	if stat_key == "hp":
		total += level + 10

	return maxi(1, total)


## Calculate all six stats at once. Returns a Dictionary with STAT_KEYS.
func calculate_all_effective_stats(
	race_data: SpriteRaceData,
	stage_data: EvolutionStageData,
	equipment_list: Array = [],
	sprite_elements: Array[String] = [],
	sprite_class: String = "",
) -> Dictionary:
	var stats := {}
	for key in STAT_KEYS:
		stats[key] = calculate_effective_stat(
			key, race_data, stage_data, equipment_list, sprite_elements, sprite_class
		)
	return stats


## ── XP & Leveling ─────────────────────────────────────────────────────────────

## XP required to reach the next level from the current level.
## Uses a cubic growth curve: threshold = 4 * level^3 / 5
static func xp_for_level(target_level: int) -> int:
	return int(4.0 * pow(float(target_level), 3.0) / 5.0)


## Grant XP and handle level-ups. Returns the number of levels gained.
func grant_xp(amount: int) -> int:
	if level >= MAX_LEVEL:
		return 0
	current_xp += amount
	var levels_gained: int = 0
	while level < MAX_LEVEL:
		var threshold: int = xp_for_level(level + 1)
		if current_xp < threshold:
			break
		current_xp -= threshold
		level += 1
		levels_gained += 1
	if level >= MAX_LEVEL:
		current_xp = 0
	return levels_gained


## ── Ability Management ────────────────────────────────────────────────────────

## Learn a new ability. Returns true if the ability was newly learned.
func learn_ability(ability_id: int) -> bool:
	if ability_id in learned_abilities:
		return false
	learned_abilities.append(ability_id)
	# Auto-equip if there is room.
	if equipped_abilities.size() < MAX_EQUIPPED_ABILITIES:
		equipped_abilities.append(ability_id)
	return true


## Swap an equipped ability. Returns true on success.
func swap_equipped_ability(slot_index: int, new_ability_id: int) -> bool:
	if slot_index < 0 or slot_index >= equipped_abilities.size():
		return false
	if new_ability_id not in learned_abilities:
		return false
	if new_ability_id in equipped_abilities:
		return false  # Already equipped in another slot.
	equipped_abilities[slot_index] = new_ability_id
	return true


## ── Equipment Management ──────────────────────────────────────────────────────

## Equip an item in the given slot. Returns the previously equipped item ID
## (or -1 if the slot was empty).
func equip_item(slot_type: String, equipment_id: int) -> int:
	if slot_type not in EQUIPMENT_SLOTS:
		push_warning("Invalid equipment slot: %s" % slot_type)
		return -1
	var previous: int = int(equipment.get(slot_type, -1))
	equipment[slot_type] = equipment_id
	return previous


## Unequip an item from a slot. Returns the removed equipment_id (or -1).
func unequip_item(slot_type: String) -> int:
	if slot_type not in EQUIPMENT_SLOTS:
		push_warning("Invalid equipment slot: %s" % slot_type)
		return -1
	var previous: int = int(equipment.get(slot_type, -1))
	equipment[slot_type] = -1
	return previous


## Get all equipped item IDs (excluding empty slots).
func get_equipped_item_ids() -> Array[int]:
	var ids: Array[int] = []
	for slot in EQUIPMENT_SLOTS:
		var eid: int = int(equipment.get(slot, -1))
		if eid >= 0:
			ids.append(eid)
	return ids


## ── IV Generation ─────────────────────────────────────────────────────────────

## Randomize IVs (called at catch/hatch time). Each IV is [0, MAX_IV].
func randomize_ivs() -> void:
	for key in STAT_KEYS:
		iv_stats[key] = randi_range(0, MAX_IV)


## ── HP Management ─────────────────────────────────────────────────────────────

## Set current_hp to the calculated max HP.
func heal_full(
	race_data: SpriteRaceData,
	stage_data: EvolutionStageData,
	equipment_list: Array = [],
	sprite_elements: Array[String] = [],
	sprite_class: String = "",
) -> void:
	current_hp = calculate_effective_stat(
		"hp", race_data, stage_data, equipment_list, sprite_elements, sprite_class
	)


## Whether this Sprite has fainted (0 HP).
func is_fainted() -> bool:
	return current_hp <= 0


## ── Display ───────────────────────────────────────────────────────────────────

## Return the display name (nickname if set, otherwise requires race_name lookup).
func get_display_name(race_name_fallback: String = "") -> String:
	if not nickname.is_empty():
		return nickname
	return race_name_fallback


## ── Validation ────────────────────────────────────────────────────────────────

func validate() -> Array[String]:
	var errors: Array[String] = []
	if instance_id <= 0:
		errors.append("instance_id must be a positive integer.")
	if race_id <= 0:
		errors.append("race_id must be a positive integer.")
	if form_id <= 0 or form_id > 72:
		errors.append("form_id must be 1-72.")
	if level < 1 or level > MAX_LEVEL:
		errors.append("level must be 1-%d." % MAX_LEVEL)
	if equipped_abilities.size() > MAX_EQUIPPED_ABILITIES:
		errors.append("Cannot equip more than %d abilities." % MAX_EQUIPPED_ABILITIES)
	for ab_id in equipped_abilities:
		if ab_id not in learned_abilities:
			errors.append("Equipped ability %d is not in learned_abilities." % ab_id)
	for key in STAT_KEYS:
		var iv_val: int = int(iv_stats.get(key, 0))
		if iv_val < 0 or iv_val > MAX_IV:
			errors.append("iv_stats['%s'] must be 0-%d." % [key, MAX_IV])
	for slot in EQUIPMENT_SLOTS:
		if not equipment.has(slot):
			errors.append("equipment missing slot '%s'." % slot)
	return errors

## BattleLootSystem — Rolls random equipment drops after battle victories.
## Integrates with EquipmentDatabase for item selection and TempleRewardSystem
## for difficulty-scaled rarity weights. Equipment drops are a core reward
## alongside XP, items, and currency.
class_name BattleLootSystem
extends RefCounted


## ── Constants ────────────────────────────────────────────────────────────────

## Drop chance by battle type.
const DROP_CHANCES: Dictionary = {
	"normal": 0.15,
	"trainer": 0.25,
	"boss": 0.40,
	"temple": 0.60,
	"legendary": 0.80,
}

## Max number of drops per battle type.
const MAX_DROPS: Dictionary = {
	"normal": 1,
	"trainer": 1,
	"boss": 2,
	"temple": 3,
	"legendary": 3,
}

## Rarity weights by difficulty tier group.
## Low (1-3), Mid (4-6), High (7-10)
const RARITY_WEIGHTS_LOW: Dictionary = {
	"common": 0.70, "uncommon": 0.20, "rare": 0.08, "epic": 0.02, "legendary": 0.00,
}
const RARITY_WEIGHTS_MID: Dictionary = {
	"common": 0.40, "uncommon": 0.30, "rare": 0.20, "epic": 0.08, "legendary": 0.02,
}
const RARITY_WEIGHTS_HIGH: Dictionary = {
	"common": 0.15, "uncommon": 0.25, "rare": 0.30, "epic": 0.20, "legendary": 0.10,
}

## Element affinity weight multiplier for themed drops.
const ELEMENT_AFFINITY_WEIGHT: float = 2.5

## Equipment won't drop if its level_requirement exceeds player level by this much.
const MAX_LEVEL_ABOVE_PLAYER: int = 10


## ── Public API ──────────────────────────────────────────────────────────────

## Roll equipment loot after a battle victory.
##
## Parameters:
##   battle_type     — "normal", "trainer", "boss", "temple", "legendary"
##   difficulty      — 1-10 scale
##   player_level    — highest level sprite on the player's team
##   battle_element  — dominant element of the encounter (for themed drops), "" for none
##
## Returns: Array[Dictionary] of equipment data matching EquipmentDatabase format
static func roll_battle_loot(
	battle_type: String,
	difficulty: int,
	player_level: int,
	battle_element: String = "",
) -> Array[Dictionary]:
	var loot: Array[Dictionary] = []
	var clamped_diff: int = clampi(difficulty, 1, 10)

	# Check base drop chance.
	var drop_chance: float = float(DROP_CHANCES.get(battle_type, 0.15))
	if randf() > drop_chance:
		return loot

	# Determine how many drops.
	var max_drops: int = int(MAX_DROPS.get(battle_type, 1))
	var drop_count: int = 1
	# Higher difficulty can yield more drops (each additional has halved chance).
	for i in range(1, max_drops):
		if randf() < drop_chance * 0.5:
			drop_count += 1
		else:
			break

	# Get all valid equipment from database.
	var all_equipment: Array[Dictionary] = EquipmentDatabase.get_all_equipment_with_expansion()

	# Filter by level requirement.
	var level_cap: int = player_level + MAX_LEVEL_ABOVE_PLAYER
	var valid_pool: Array[Dictionary] = []
	for equip in all_equipment:
		if int(equip.get("level_requirement", 999)) <= level_cap:
			valid_pool.append(equip)

	if valid_pool.is_empty():
		return loot

	# Roll each drop.
	for _i in drop_count:
		var rarity: String = _roll_rarity(clamped_diff)
		var selected: Dictionary = _select_equipment(valid_pool, rarity, battle_element)
		if not selected.is_empty():
			loot.append(selected)

	return loot


## Format loot drops for display in the BattleResultsScreen.
##
## Returns: Array[Dictionary] with display-friendly fields.
static func format_loot_for_display(loot_array: Array[Dictionary]) -> Array[Dictionary]:
	var display: Array[Dictionary] = []
	for equip in loot_array:
		display.append({
			"equipment_id": equip.get("equipment_id", 0),
			"equipment_name": equip.get("equipment_name", "Unknown"),
			"slot_type": equip.get("slot_type", "weapon"),
			"rarity": equip.get("rarity", "common"),
			"stat_bonuses": equip.get("stat_bonuses", {}),
			"element_synergy": equip.get("element_synergy", ""),
			"class_synergy": equip.get("class_synergy", ""),
			"description": equip.get("description", ""),
			"level_requirement": equip.get("level_requirement", 1),
		})
	return display


## ── Private Helpers ─────────────────────────────────────────────────────────

## Roll a rarity tier based on difficulty.
static func _roll_rarity(difficulty: int) -> String:
	var weights: Dictionary
	if difficulty <= 3:
		weights = RARITY_WEIGHTS_LOW
	elif difficulty <= 6:
		weights = RARITY_WEIGHTS_MID
	else:
		weights = RARITY_WEIGHTS_HIGH

	var roll: float = randf()
	var cumulative: float = 0.0
	for rarity_name: String in weights:
		cumulative += float(weights[rarity_name])
		if roll <= cumulative:
			return rarity_name
	return "common"


## Select an equipment piece from the pool, preferring the rolled rarity
## and optionally weighting by element affinity.
static func _select_equipment(
	pool: Array[Dictionary],
	target_rarity: String,
	battle_element: String,
) -> Dictionary:
	# Filter by rarity first.
	var rarity_matches: Array[Dictionary] = []
	for equip in pool:
		if str(equip.get("rarity", "")) == target_rarity:
			rarity_matches.append(equip)

	# If no exact rarity match, fall back to one tier lower.
	if rarity_matches.is_empty():
		var fallback_rarity: String = _get_lower_rarity(target_rarity)
		for equip in pool:
			if str(equip.get("rarity", "")) == fallback_rarity:
				rarity_matches.append(equip)

	# If still empty, use the whole pool.
	if rarity_matches.is_empty():
		rarity_matches = pool

	# Apply element affinity weighting.
	if not battle_element.is_empty():
		var weighted_pool: Array[Dictionary] = []
		for equip in rarity_matches:
			weighted_pool.append(equip)
			# Add extra copies for element-matching equipment (increases probability).
			if str(equip.get("element_synergy", "")) == battle_element:
				for _j in int(ELEMENT_AFFINITY_WEIGHT):
					weighted_pool.append(equip)
		rarity_matches = weighted_pool

	if rarity_matches.is_empty():
		return {}

	return rarity_matches[randi() % rarity_matches.size()]


## Get the next lower rarity tier.
static func _get_lower_rarity(rarity: String) -> String:
	match rarity:
		"legendary": return "epic"
		"epic": return "rare"
		"rare": return "uncommon"
		"uncommon": return "common"
		_: return "common"

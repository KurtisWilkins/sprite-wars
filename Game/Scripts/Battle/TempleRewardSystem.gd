## TempleRewardSystem — Generates rewards for completing temple encounters and
## clearing temples. Rolls equipment drops from the temple's reward pool,
## applies first-clear bonuses, and generates themed equipment with synergy stats.
class_name TempleRewardSystem
extends RefCounted

## ── Constants ────────────────────────────────────────────────────────────────

## Rarity weights by difficulty tier (1-10). Higher tiers yield rarer gear.
## Format: {rarity_name: weight}
const RARITY_WEIGHTS_BY_TIER: Dictionary = {
	1: {"common": 0.80, "uncommon": 0.15, "rare": 0.04, "epic": 0.01, "legendary": 0.0},
	2: {"common": 0.70, "uncommon": 0.22, "rare": 0.06, "epic": 0.02, "legendary": 0.0},
	3: {"common": 0.55, "uncommon": 0.30, "rare": 0.10, "epic": 0.04, "legendary": 0.01},
	4: {"common": 0.45, "uncommon": 0.32, "rare": 0.15, "epic": 0.06, "legendary": 0.02},
	5: {"common": 0.35, "uncommon": 0.30, "rare": 0.22, "epic": 0.10, "legendary": 0.03},
	6: {"common": 0.25, "uncommon": 0.30, "rare": 0.25, "epic": 0.14, "legendary": 0.06},
	7: {"common": 0.15, "uncommon": 0.28, "rare": 0.30, "epic": 0.18, "legendary": 0.09},
	8: {"common": 0.10, "uncommon": 0.22, "rare": 0.32, "epic": 0.24, "legendary": 0.12},
	9: {"common": 0.05, "uncommon": 0.15, "rare": 0.30, "epic": 0.30, "legendary": 0.20},
	10: {"common": 0.02, "uncommon": 0.10, "rare": 0.25, "epic": 0.35, "legendary": 0.28},
}

## Base stat budget for generated equipment, scaled by rarity.
const STAT_BUDGET_BY_RARITY: Dictionary = {
	"common": 15,
	"uncommon": 30,
	"rare": 50,
	"epic": 80,
	"legendary": 120,
}

## Synergy multiplier applied when equipment matches the temple theme.
const THEMED_SYNERGY_MULTIPLIER: float = 1.25

## Base currency reward per difficulty tier.
const BASE_CURRENCY_PER_TIER: int = 50

## First clear currency multiplier.
const FIRST_CLEAR_CURRENCY_MULT: float = 3.0

## Number of equipment drops to roll per completion.
const BASE_DROP_COUNT: int = 1
const MAX_DROP_COUNT: int = 3

## Available equipment slots for random generation.
const EQUIPMENT_SLOTS: Array[String] = [
	"weapon", "helmet", "chest", "legs", "boots",
	"gloves", "ring", "amulet", "crystal",
]

## Running ID counter for generated equipment. In production, this would be
## backed by a persistent counter.
static var _next_equipment_id: int = 10000


## ── Public API ──────────────────────────────────────────────────────────────

## Roll all rewards for completing a temple.
## Returns: {
##   equipment: Array[Dictionary],
##   items: Array[Dictionary],
##   currency: int,
##   first_clear_bonus: Dictionary {xp, currency, items, unlocks},
## }
static func roll_temple_rewards(
	temple_data: Dictionary,
	is_first_clear: bool,
) -> Dictionary:
	var difficulty: int = int(temple_data.get("difficulty_tier", 1))
	var reward_pool: Dictionary = temple_data.get("reward_pool", {})

	# ── Equipment Drops ──────────────────────────────────────────────────
	var equipment: Array[Dictionary] = []

	# Roll from the temple's explicit equipment drop table.
	var equip_ids: Array = reward_pool.get("equipment_ids", [])
	var drop_rates: Dictionary = reward_pool.get("drop_rates", {})
	for eid in equip_ids:
		var rate: float = float(drop_rates.get(eid, 0.0))
		if randf() <= rate:
			equipment.append({"equipment_id": int(eid), "source": "drop_table"})

	# Additionally generate themed equipment drops.
	var element: String = str(temple_data.get("dominant_element", ""))
	var class_type: String = str(temple_data.get("dominant_class", ""))
	var drop_count: int = clampi(BASE_DROP_COUNT + difficulty / 4, BASE_DROP_COUNT, MAX_DROP_COUNT)

	for _i in drop_count:
		var themed_equip: Dictionary = generate_themed_equipment(element, class_type, difficulty)
		if not themed_equip.is_empty():
			equipment.append(themed_equip)

	# ── Items ────────────────────────────────────────────────────────────
	var items: Array[Dictionary] = _roll_consumable_items(difficulty)

	# ── Currency ─────────────────────────────────────────────────────────
	var currency: int = BASE_CURRENCY_PER_TIER * difficulty
	# Add some variance.
	currency += randi_range(-currency / 5, currency / 5)
	currency = maxi(10, currency)

	# ── First Clear Bonus ────────────────────────────────────────────────
	var first_clear_bonus: Dictionary = {}
	if is_first_clear:
		var fcb: Dictionary = reward_pool.get("first_clear_bonus", {})
		first_clear_bonus = {
			"xp": int(fcb.get("xp", difficulty * 100)),
			"currency": int(float(currency) * FIRST_CLEAR_CURRENCY_MULT),
			"items": fcb.get("items", []),
			"unlocks": fcb.get("unlocks", []),
		}
		# Add the first-clear currency on top.
		currency += int(first_clear_bonus.get("currency", 0))

	return {
		"equipment": equipment,
		"items": items,
		"currency": currency,
		"first_clear_bonus": first_clear_bonus,
	}


## Generate a single piece of themed equipment matching the temple's element
## and/or class. Rarity is rolled based on difficulty tier.
## Returns a Dictionary matching EquipmentData fields.
static func generate_themed_equipment(
	temple_element: String,
	temple_class: String,
	difficulty_tier: int,
) -> Dictionary:
	var clamped_tier: int = clampi(difficulty_tier, 1, 10)
	var rarity: String = _roll_rarity(clamped_tier)
	var slot: String = EQUIPMENT_SLOTS[randi() % EQUIPMENT_SLOTS.size()]

	# Determine stat budget.
	var budget: int = int(STAT_BUDGET_BY_RARITY.get(rarity, 15))
	# Scale slightly with difficulty.
	budget = int(float(budget) * (1.0 + float(clamped_tier - 1) * 0.08))

	# Distribute budget across stats with weighted randomness.
	var stat_bonuses: Dictionary = _distribute_stat_budget(budget, slot)

	# Build the equipment name.
	var element_prefix: String = temple_element if not temple_element.is_empty() else "Mystic"
	var class_suffix: String = temple_class if not temple_class.is_empty() else ""
	var slot_label: String = slot.capitalize()
	var equip_name: String = "%s %s" % [element_prefix, slot_label]
	if not class_suffix.is_empty():
		equip_name = "%s %s's %s" % [element_prefix, class_suffix, slot_label]

	# Assign a unique ID.
	var equip_id: int = _next_equipment_id
	_next_equipment_id += 1

	# Set synergy to match the temple theme.
	var element_synergy: String = temple_element
	var element_synergy_mult: float = THEMED_SYNERGY_MULTIPLIER if not temple_element.is_empty() else 1.0
	var class_synergy: String = temple_class
	var class_synergy_mult: float = THEMED_SYNERGY_MULTIPLIER if not temple_class.is_empty() else 1.0

	# Level requirement scales with difficulty.
	var level_req: int = clampi(clamped_tier * 5 - 4, 1, 100)

	return {
		"equipment_id": equip_id,
		"equipment_name": equip_name,
		"slot_type": slot,
		"rarity": rarity,
		"stat_bonuses": stat_bonuses,
		"element_synergy": element_synergy,
		"element_synergy_multiplier": element_synergy_mult,
		"class_synergy": class_synergy,
		"class_synergy_multiplier": class_synergy_mult,
		"level_requirement": level_req,
		"description": "Forged in the depths of a %s temple." % element_prefix.to_lower(),
		"source": "temple_drop",
	}


## ── Private Helpers ─────────────────────────────────────────────────────────

## Roll a rarity string based on difficulty tier weights.
static func _roll_rarity(difficulty: int) -> String:
	var weights: Dictionary = RARITY_WEIGHTS_BY_TIER.get(
		clampi(difficulty, 1, 10),
		RARITY_WEIGHTS_BY_TIER[1]
	)
	var roll: float = randf()
	var cumulative: float = 0.0
	for rarity_name: String in weights:
		cumulative += float(weights[rarity_name])
		if roll <= cumulative:
			return rarity_name
	return "common"


## Distribute a stat budget across the 6 stats with slot-aware weighting.
## Weapons favor atk/sp_atk; armor favors hp/def/sp_def; boots favor spd.
static func _distribute_stat_budget(budget: int, slot: String) -> Dictionary:
	var weights: Dictionary = _get_slot_stat_weights(slot)
	var total_weight: float = 0.0
	for key: String in weights:
		total_weight += float(weights[key])

	var result: Dictionary = {
		"hp": 0, "atk": 0, "def": 0, "spd": 0, "sp_atk": 0, "sp_def": 0,
	}

	if total_weight <= 0.0:
		return result

	var remaining: int = budget
	var stat_keys: Array = result.keys()

	# Distribute proportionally with rounding.
	for key: String in stat_keys:
		var share: float = float(weights.get(key, 0.0)) / total_weight
		var alloc: int = int(float(budget) * share)
		# Add small variance.
		alloc += randi_range(-2, 2)
		alloc = maxi(0, alloc)
		result[key] = alloc
		remaining -= alloc

	# Dump remainder into a random primary stat for this slot.
	if remaining > 0:
		var primary_stat: String = _get_primary_stat_for_slot(slot)
		result[primary_stat] = maxi(0, int(result[primary_stat]) + remaining)

	return result


## Return stat weight distributions by slot type.
static func _get_slot_stat_weights(slot: String) -> Dictionary:
	match slot:
		"weapon":
			return {"hp": 0.0, "atk": 3.0, "def": 0.0, "spd": 1.0, "sp_atk": 3.0, "sp_def": 0.0}
		"helmet":
			return {"hp": 1.0, "atk": 0.0, "def": 2.0, "spd": 0.0, "sp_atk": 0.0, "sp_def": 2.0}
		"chest":
			return {"hp": 3.0, "atk": 0.0, "def": 3.0, "spd": 0.0, "sp_atk": 0.0, "sp_def": 2.0}
		"legs":
			return {"hp": 1.0, "atk": 0.0, "def": 2.0, "spd": 1.5, "sp_atk": 0.0, "sp_def": 1.0}
		"boots":
			return {"hp": 0.0, "atk": 0.0, "def": 1.0, "spd": 4.0, "sp_atk": 0.0, "sp_def": 0.5}
		"gloves":
			return {"hp": 0.0, "atk": 2.5, "def": 0.5, "spd": 1.0, "sp_atk": 1.5, "sp_def": 0.0}
		"ring":
			return {"hp": 0.5, "atk": 1.0, "def": 0.5, "spd": 1.0, "sp_atk": 2.0, "sp_def": 1.0}
		"amulet":
			return {"hp": 1.5, "atk": 0.5, "def": 0.5, "spd": 0.5, "sp_atk": 1.5, "sp_def": 2.0}
		"crystal":
			return {"hp": 0.5, "atk": 1.0, "def": 0.0, "spd": 0.5, "sp_atk": 3.0, "sp_def": 1.0}
		_:
			return {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0}


## Return the primary stat key for a given slot.
static func _get_primary_stat_for_slot(slot: String) -> String:
	match slot:
		"weapon": return "atk"
		"helmet": return "def"
		"chest": return "hp"
		"legs": return "def"
		"boots": return "spd"
		"gloves": return "atk"
		"ring": return "sp_atk"
		"amulet": return "sp_def"
		"crystal": return "sp_atk"
		_: return "hp"


## Roll consumable item rewards based on difficulty.
static func _roll_consumable_items(difficulty: int) -> Array[Dictionary]:
	var items: Array[Dictionary] = []

	# Healing potions — higher difficulty gives more and better potions.
	# Item IDs are placeholder; in production these would reference an ItemDatabase.
	var potion_count: int = randi_range(1, 1 + difficulty / 3)
	if potion_count > 0:
		# Basic Potion (item_id: 101) for low difficulty, Super Potion (102) for mid,
		# Max Potion (103) for high.
		var potion_id: int = 101
		if difficulty >= 7:
			potion_id = 103
		elif difficulty >= 4:
			potion_id = 102
		items.append({"item_id": potion_id, "count": potion_count})

	# Crystals (catch items) — small chance.
	if randf() < 0.3 + float(difficulty) * 0.05:
		var crystal_tier: int = 1 + difficulty / 4
		var crystal_id: int = 200 + crystal_tier  # 201=Basic, 202=Great, 203=Ultra
		items.append({"item_id": crystal_id, "count": randi_range(1, 2)})

	# Status cure items at mid-high difficulty.
	if difficulty >= 5 and randf() < 0.4:
		items.append({"item_id": 301, "count": 1})  # Antidote / Full Heal

	return items

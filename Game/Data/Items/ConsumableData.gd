## ConsumableData — Static database of all consumable items.
## Consumables are single-use items for healing, curing status effects,
## boosting stats, and providing utility during battle or exploration.
##
## Design notes:
##   - item_id range: 101-199 reserved for consumables
##   - Categories: potion, status_cure, battle_item, utility
##   - effect_type describes what the item does; effect_value is the magnitude
##   - "full" as effect_value means restore to maximum (handled by item system)
##   - Element Gems cover the 4 starter elements; more can be added later
##   - Prices follow a power curve: stronger effects cost exponentially more
class_name ConsumableData
extends RefCounted


## Return all consumable item definitions.
static func get_all_consumables() -> Array[Dictionary]:
	return [
		# ──────────────────────────────────────────────────────────────────────
		# POTIONS
		# ──────────────────────────────────────────────────────────────────────
		{
			"item_id": 101,
			"name": "Small Potion",
			"category": "potion",
			"effect_type": "heal_hp",
			"effect_value": 30,
			"description": "Restores 30 HP to one Sprite.",
			"buy_price": 300,
		},
		{
			"item_id": 102,
			"name": "Medium Potion",
			"category": "potion",
			"effect_type": "heal_hp",
			"effect_value": 100,
			"description": "Restores 100 HP to one Sprite.",
			"buy_price": 700,
		},
		{
			"item_id": 103,
			"name": "Large Potion",
			"category": "potion",
			"effect_type": "heal_hp_full",
			"effect_value": 9999,
			"description": "Fully restores HP to one Sprite.",
			"buy_price": 1500,
		},
		{
			"item_id": 104,
			"name": "Max Potion",
			"category": "potion",
			"effect_type": "heal_team_full",
			"effect_value": 9999,
			"description": "Fully restores HP for the entire team.",
			"buy_price": 3000,
		},
		{
			"item_id": 105,
			"name": "PP Restore",
			"category": "potion",
			"effect_type": "restore_pp_all",
			"effect_value": 9999,
			"description": "Restores all PP for one Sprite's abilities.",
			"buy_price": 500,
		},

		# ──────────────────────────────────────────────────────────────────────
		# STATUS CURES
		# ──────────────────────────────────────────────────────────────────────
		{
			"item_id": 111,
			"name": "Antidote",
			"category": "status_cure",
			"effect_type": "cure_status",
			"effect_value": "poison",
			"description": "Cures poison from one Sprite.",
			"buy_price": 200,
		},
		{
			"item_id": 112,
			"name": "Thaw Crystal",
			"category": "status_cure",
			"effect_type": "cure_status",
			"effect_value": "freeze",
			"description": "Cures freeze from one Sprite.",
			"buy_price": 200,
		},
		{
			"item_id": 113,
			"name": "Awakening",
			"category": "status_cure",
			"effect_type": "cure_status",
			"effect_value": "sleep",
			"description": "Cures sleep from one Sprite.",
			"buy_price": 200,
		},
		{
			"item_id": 114,
			"name": "Full Cure",
			"category": "status_cure",
			"effect_type": "cure_status",
			"effect_value": "all",
			"description": "Cures all status effects from one Sprite.",
			"buy_price": 600,
		},

		# ──────────────────────────────────────────────────────────────────────
		# REVIVAL
		# ──────────────────────────────────────────────────────────────────────
		{
			"item_id": 121,
			"name": "Revive",
			"category": "potion",
			"effect_type": "revive",
			"effect_value": 50,
			"description": "Revives a fainted Sprite with 50% HP.",
			"buy_price": 2000,
		},
		{
			"item_id": 122,
			"name": "Max Revive",
			"category": "potion",
			"effect_type": "revive",
			"effect_value": 100,
			"description": "Revives a fainted Sprite with full HP.",
			"buy_price": 5000,
		},

		# ──────────────────────────────────────────────────────────────────────
		# BATTLE ITEMS — Temporary stat boosts (5 turns)
		# ──────────────────────────────────────────────────────────────────────
		{
			"item_id": 131,
			"name": "ATK Boost",
			"category": "battle_item",
			"effect_type": "buff_stat",
			"effect_value": {"stat": "atk", "multiplier": 1.5, "duration": 5},
			"description": "Boosts ATK by 50% for 5 turns.",
			"buy_price": 400,
		},
		{
			"item_id": 132,
			"name": "DEF Boost",
			"category": "battle_item",
			"effect_type": "buff_stat",
			"effect_value": {"stat": "def", "multiplier": 1.5, "duration": 5},
			"description": "Boosts DEF by 50% for 5 turns.",
			"buy_price": 400,
		},
		{
			"item_id": 133,
			"name": "SPD Boost",
			"category": "battle_item",
			"effect_type": "buff_stat",
			"effect_value": {"stat": "spd", "multiplier": 1.5, "duration": 5},
			"description": "Boosts SPD by 50% for 5 turns.",
			"buy_price": 400,
		},

		# ──────────────────────────────────────────────────────────────────────
		# UTILITY
		# ──────────────────────────────────────────────────────────────────────
		{
			"item_id": 141,
			"name": "Escape Rope",
			"category": "utility",
			"effect_type": "flee_dungeon",
			"effect_value": 1,
			"description": "Instantly flee from a dungeon or temple.",
			"buy_price": 500,
		},
		{
			"item_id": 142,
			"name": "Rare Candy",
			"category": "utility",
			"effect_type": "level_up",
			"effect_value": 1,
			"description": "Raises one Sprite's level by 1.",
			"buy_price": 10000,
		},

		# ──────────────────────────────────────────────────────────────────────
		# ELEMENT GEMS — Boost element damage for 1 battle
		# ──────────────────────────────────────────────────────────────────────
		{
			"item_id": 151,
			"name": "Fire Gem",
			"category": "battle_item",
			"effect_type": "element_boost",
			"effect_value": {"element": "Fire", "multiplier": 1.5, "duration": "battle"},
			"description": "Boosts Fire-type damage by 50% for one battle.",
			"buy_price": 800,
		},
		{
			"item_id": 152,
			"name": "Water Gem",
			"category": "battle_item",
			"effect_type": "element_boost",
			"effect_value": {"element": "Water", "multiplier": 1.5, "duration": "battle"},
			"description": "Boosts Water-type damage by 50% for one battle.",
			"buy_price": 800,
		},
		{
			"item_id": 153,
			"name": "Nature Gem",
			"category": "battle_item",
			"effect_type": "element_boost",
			"effect_value": {"element": "Nature", "multiplier": 1.5, "duration": "battle"},
			"description": "Boosts Nature-type damage by 50% for one battle.",
			"buy_price": 800,
		},
		{
			"item_id": 154,
			"name": "Ice Gem",
			"category": "battle_item",
			"effect_type": "element_boost",
			"effect_value": {"element": "Ice", "multiplier": 1.5, "duration": "battle"},
			"description": "Boosts Ice-type damage by 50% for one battle.",
			"buy_price": 800,
		},
	]


## Return a single consumable by item_id, or an empty dictionary if not found.
static func get_consumable(item_id: int) -> Dictionary:
	for item: Dictionary in get_all_consumables():
		if item.get("item_id", -1) == item_id:
			return item
	return {}


## Return all consumables in a given category.
static func get_consumables_by_category(category: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for item: Dictionary in get_all_consumables():
		if item.get("category", "") == category:
			result.append(item)
	return result


## Return all consumables that can be purchased from shops (have a buy_price).
static func get_shop_consumables() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for item: Dictionary in get_all_consumables():
		if item.get("buy_price", 0) > 0:
			result.append(item)
	return result


## Return the sell price for a consumable (50% of buy price).
static func get_sell_price(item_id: int) -> int:
	var item := get_consumable(item_id)
	if item.is_empty():
		return 0
	return int(item.get("buy_price", 0) * 0.5)

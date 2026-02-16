## CrystalData — Static database of all catching crystal items.
## Crystals are used to capture wild Sprites during encounters.
##
## Design notes:
##   - catch_multiplier is applied to the base catch formula
##   - Master Crystal (255.0) guarantees capture — extremely rare quest reward
##   - Conditional crystals (Status, Quick, Heavy, Net) have higher multipliers
##     but only under specific conditions checked by the catch system
##   - item_id range: 201-299 reserved for crystals
class_name CrystalData
extends RefCounted


## Return all crystal item definitions.
static func get_all_crystals() -> Array[Dictionary]:
	return [
		{
			"item_id": 201,
			"name": "Basic Crystal",
			"catch_multiplier": 1.0,
			"description": "A standard catching crystal.",
			"buy_price": 200,
			"source": "shop",
		},
		{
			"item_id": 202,
			"name": "Great Crystal",
			"catch_multiplier": 1.5,
			"description": "An improved crystal with better catch rate.",
			"buy_price": 600,
			"source": "shop",
		},
		{
			"item_id": 203,
			"name": "Ultra Crystal",
			"catch_multiplier": 2.0,
			"description": "A high-performance crystal for tough catches.",
			"buy_price": 1200,
			"source": "shop",
		},
		{
			"item_id": 204,
			"name": "Master Crystal",
			"catch_multiplier": 255.0,
			"description": "Never fails. Extremely rare.",
			"buy_price": 50000,
			"source": "quest_reward",
		},
		{
			"item_id": 205,
			"name": "Status Crystal",
			"catch_multiplier": 2.5,
			"description": "Works best on Sprites with status effects.",
			"buy_price": 1000,
			"source": "shop",
		},
		{
			"item_id": 206,
			"name": "Quick Crystal",
			"catch_multiplier": 4.0,
			"description": "High catch rate on first turn only.",
			"buy_price": 1000,
			"source": "shop",
		},
		{
			"item_id": 207,
			"name": "Heavy Crystal",
			"catch_multiplier": 3.0,
			"description": "Better against slow Sprites.",
			"buy_price": 1000,
			"source": "shop",
		},
		{
			"item_id": 208,
			"name": "Net Crystal",
			"catch_multiplier": 3.0,
			"description": "Better against Water and Plant types.",
			"buy_price": 1000,
			"source": "shop",
		},
	]


## Return a single crystal by item_id, or an empty dictionary if not found.
static func get_crystal(item_id: int) -> Dictionary:
	for crystal: Dictionary in get_all_crystals():
		if crystal.get("item_id", -1) == item_id:
			return crystal
	return {}


## Return all crystals available from a specific source ("shop", "quest_reward", etc.).
static func get_crystals_by_source(source: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for crystal: Dictionary in get_all_crystals():
		if crystal.get("source", "") == source:
			result.append(crystal)
	return result


## Return the crystal with the highest catch multiplier that the player can buy from shops.
static func get_best_shop_crystal() -> Dictionary:
	var best := {}
	var best_mult: float = 0.0
	for crystal: Dictionary in get_all_crystals():
		if crystal.get("source", "") == "shop":
			var mult: float = float(crystal.get("catch_multiplier", 0.0))
			if mult > best_mult:
				best_mult = mult
				best = crystal
	return best

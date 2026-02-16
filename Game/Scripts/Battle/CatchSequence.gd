## CatchSequence — Orchestrates a full catch attempt from input to result.
## [Progression] Validates the battle context, selects the crystal, computes
## the catch rate via CatchRateCalculator, runs the shake simulation, and
## returns a comprehensive result dictionary.
class_name CatchSequence
extends RefCounted


## ── Dependencies ────────────────────────────────────────────────────────────

var _calculator: CatchRateCalculator = CatchRateCalculator.new()


## ── Crystal Item Identifiers ────────────────────────────────────────────────
## Maps crystal item IDs to their catch multipliers and display names.

const CRYSTAL_DATA_TABLE: Dictionary = {
	201: {"name": "Catch Crystal", "multiplier": 1.0, "rarity": "common"},
	202: {"name": "Great Crystal", "multiplier": 1.5, "rarity": "uncommon"},
	203: {"name": "Ultra Crystal", "multiplier": 2.0, "rarity": "rare"},
	204: {"name": "Master Crystal", "multiplier": 255.0, "rarity": "legendary"},
	205: {"name": "Quick Crystal", "multiplier": 1.0, "rarity": "common"},
	206: {"name": "Heavy Crystal", "multiplier": 2.0, "rarity": "uncommon"},
	207: {"name": "Net Crystal", "multiplier": 1.5, "rarity": "uncommon"},
}

## Item IDs that are considered catch crystals.
const CRYSTAL_ITEM_IDS: Array[int] = [201, 202, 203, 204, 205, 206, 207]


## ── Core Operations ─────────────────────────────────────────────────────────

## Execute a full catch attempt sequence.
##
## Parameters:
##   target_hp_pct  — current HP as a fraction of max HP [0.0, 1.0]
##   target_rarity  — "common", "uncommon", "rare", or "legendary"
##   crystal_data   — Dictionary with at minimum "multiplier" (float) key.
##                    Optionally "item_id" (int) and "name" (String).
##   status         — active status condition on the target
##   is_trainer     — true if a trainer battle
##   is_boss        — true if the target is a boss
##
## Returns:
##   Dictionary {
##     "success": bool,        — whether the catch succeeded
##     "shake_count": int,     — number of shakes before result (0-3)
##     "catch_rate": float,    — computed catch probability
##     "blocked": bool,        — true if catch was blocked
##     "block_reason": String, — human-readable reason if blocked, else ""
##   }
func attempt_catch(
	target_hp_pct: float,
	target_rarity: String,
	crystal_data: Dictionary,
	status: String,
	is_trainer: bool,
	is_boss: bool,
) -> Dictionary:
	var result := {
		"success": false,
		"shake_count": 0,
		"catch_rate": 0.0,
		"blocked": false,
		"block_reason": "",
	}

	# Check if catching is blocked.
	if _calculator.is_catch_blocked(is_trainer, is_boss):
		result["blocked"] = true
		if is_trainer:
			result["block_reason"] = "Cannot catch trainer-owned Sprites."
		elif is_boss:
			result["block_reason"] = "This Sprite is too powerful to be caught."
		return result

	# Validate crystal data.
	var crystal_multiplier: float = float(crystal_data.get("multiplier", 1.0))
	if crystal_multiplier <= 0.0:
		result["blocked"] = true
		result["block_reason"] = "Invalid crystal data."
		return result

	# Calculate the catch rate.
	var catch_rate: float = _calculator.calculate_catch_rate(
		target_hp_pct, target_rarity, crystal_multiplier, status
	)
	result["catch_rate"] = catch_rate

	# Master Crystal always succeeds (multiplier >= 255.0).
	if crystal_multiplier >= 255.0:
		result["success"] = true
		result["shake_count"] = CatchRateCalculator.REQUIRED_SHAKES
		return result

	# Simulate shakes.
	var shake_count: int = _calculator.calculate_shake_count(catch_rate)
	result["shake_count"] = shake_count
	result["success"] = shake_count >= CatchRateCalculator.REQUIRED_SHAKES

	return result


## Retrieve all catch crystals available in the player's inventory.
##
## Parameters:
##   inventory — the player's inventory Dictionary (item_id → count)
##
## Returns:
##   Array of Dictionaries, each with:
##     "item_id": int, "name": String, "multiplier": float,
##     "rarity": String, "count": int
##   Sorted by multiplier descending (best crystals first).
func get_available_crystals(inventory: Dictionary) -> Array[Dictionary]:
	var available: Array[Dictionary] = []

	for item_id: int in CRYSTAL_ITEM_IDS:
		var count: int = int(inventory.get(item_id, 0))
		if count <= 0:
			continue

		var data: Dictionary = CRYSTAL_DATA_TABLE.get(item_id, {})
		if data.is_empty():
			continue

		available.append({
			"item_id": item_id,
			"name": str(data.get("name", "Unknown Crystal")),
			"multiplier": float(data.get("multiplier", 1.0)),
			"rarity": str(data.get("rarity", "common")),
			"count": count,
		})

	# Sort by multiplier descending so the best crystals appear first.
	available.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		return float(a.get("multiplier", 0.0)) > float(b.get("multiplier", 0.0))
	)

	return available


## Check whether the player has at least one catch crystal in inventory.
func has_any_crystal(inventory: Dictionary) -> bool:
	for item_id: int in CRYSTAL_ITEM_IDS:
		if int(inventory.get(item_id, 0)) > 0:
			return true
	return false


## Get crystal data by item ID. Returns an empty Dictionary if not found.
func get_crystal_info(item_id: int) -> Dictionary:
	return CRYSTAL_DATA_TABLE.get(item_id, {}).duplicate()

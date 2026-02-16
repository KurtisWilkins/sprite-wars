## TempleSelectionData — Provides temple listing and status queries for the
## temple map/selection screen. Reads from TempleDatabase and cross-references
## with player progress to determine unlock status and recommended levels.
class_name TempleSelectionData
extends RefCounted

## ── Constants ────────────────────────────────────────────────────────────────

## Recommended level buffer above the temple's minimum level requirement.
const RECOMMENDED_LEVEL_BUFFER: int = 3

## Base recommended level per difficulty tier when no min_level is set.
const BASE_RECOMMENDED_PER_TIER: int = 5


## ── Public API ──────────────────────────────────────────────────────────────

## Return all temples as an array of dictionaries for the temple map screen.
## Each entry includes the full temple data plus computed fields:
## {<all TempleDatabase fields>, recommended_level: int}
static func get_all_temples() -> Array[Dictionary]:
	var all_temples: Array[Dictionary] = TempleDatabase.get_all_temples()
	var result: Array[Dictionary] = []

	for temple: Dictionary in all_temples:
		var entry: Dictionary = temple.duplicate(true)
		entry["recommended_level"] = _calculate_recommended_level(temple)
		result.append(entry)

	return result


## Get the status of a specific temple for the player.
## Returns: {
##   unlocked: bool,
##   completed: bool,
##   best_time: float,
##   recommended_level: int,
##   completion_count: int,
##   unlock_reason: String,   — empty if unlocked, otherwise explains why locked
## }
static func get_temple_status(temple_id: int, player_data: PlayerData) -> Dictionary:
	var temple: Dictionary = _find_temple(temple_id)
	if temple.is_empty():
		return {
			"unlocked": false,
			"completed": false,
			"best_time": 0.0,
			"recommended_level": 0,
			"completion_count": 0,
			"unlock_reason": "Temple not found.",
		}

	var prerequisites: Dictionary = temple.get("unlock_prerequisites", {})

	# Check unlock status.
	var is_unlocked: bool = true
	var unlock_reason: String = ""

	if player_data:
		# Min level check.
		var min_level: int = int(prerequisites.get("min_level", 1))
		var avg_level: float = _get_player_avg_level(player_data)
		if avg_level < float(min_level):
			is_unlocked = false
			unlock_reason = "Team average level must be at least %d." % min_level

		# Quest prerequisites.
		if is_unlocked:
			var req_quests: Array = prerequisites.get("quest_ids", [])
			for qid in req_quests:
				if int(qid) not in player_data.completed_quest_ids:
					is_unlocked = false
					unlock_reason = "Complete required quest (ID %d) first." % int(qid)
					break

		# Temple prerequisites.
		if is_unlocked:
			var req_temples: Array = prerequisites.get("temple_ids", [])
			for tid in req_temples:
				if int(tid) not in player_data.completed_temple_ids:
					is_unlocked = false
					unlock_reason = "Clear the required temple (ID %d) first." % int(tid)
					break
	else:
		is_unlocked = false
		unlock_reason = "No player data available."

	# Completion status.
	var is_completed: bool = false
	if player_data:
		is_completed = player_data.is_temple_completed(temple_id)

	# Best time and completion count from the tracker (if available).
	var best_time: float = 0.0
	var completion_count: int = 0
	# Note: In production, the TempleProgressTracker instance would be queried here.
	# For now we check completed_temple_ids as a proxy for "at least once."
	if is_completed:
		completion_count = 1  # Minimum if marked as completed.

	return {
		"unlocked": is_unlocked,
		"completed": is_completed,
		"best_time": best_time,
		"recommended_level": _calculate_recommended_level(temple),
		"completion_count": completion_count,
		"unlock_reason": unlock_reason,
	}


## Return only the temples available (unlocked) to the player.
## Each entry is the same format as get_all_temples() plus status fields.
static func get_available_temples(player_data: PlayerData) -> Array[Dictionary]:
	var all_temples: Array[Dictionary] = TempleDatabase.get_all_temples()
	var result: Array[Dictionary] = []

	for temple: Dictionary in all_temples:
		var temple_id: int = int(temple.get("temple_id", 0))
		var status: Dictionary = get_temple_status(temple_id, player_data)

		if status.get("unlocked", false):
			var entry: Dictionary = temple.duplicate(true)
			entry["status"] = status
			result.append(entry)

	return result


## ── Filtering Helpers ───────────────────────────────────────────────────────

## Get all temples of a specific type ("elemental" or "class_based").
static func get_temples_by_type(temple_type: String) -> Array[Dictionary]:
	var all_temples: Array[Dictionary] = TempleDatabase.get_all_temples()
	var result: Array[Dictionary] = []
	for temple: Dictionary in all_temples:
		if temple.get("temple_type", "") == temple_type:
			result.append(temple)
	return result


## Get all temples for a specific element.
static func get_temples_by_element(element: String) -> Array[Dictionary]:
	var all_temples: Array[Dictionary] = TempleDatabase.get_all_temples()
	var result: Array[Dictionary] = []
	for temple: Dictionary in all_temples:
		if temple.get("dominant_element", "") == element:
			result.append(temple)
	return result


## Get all temples for a specific class.
static func get_temples_by_class(class_type: String) -> Array[Dictionary]:
	var all_temples: Array[Dictionary] = TempleDatabase.get_all_temples()
	var result: Array[Dictionary] = []
	for temple: Dictionary in all_temples:
		if temple.get("dominant_class", "") == class_type:
			result.append(temple)
	return result


## ── Private Helpers ─────────────────────────────────────────────────────────

## Calculate the recommended player level for a temple.
static func _calculate_recommended_level(temple: Dictionary) -> int:
	var prerequisites: Dictionary = temple.get("unlock_prerequisites", {})
	var min_level: int = int(prerequisites.get("min_level", 1))
	var difficulty: int = int(temple.get("difficulty_tier", 1))

	# Use the higher of: min_level + buffer, or difficulty-based estimate.
	var from_prereq: int = min_level + RECOMMENDED_LEVEL_BUFFER
	var from_difficulty: int = difficulty * BASE_RECOMMENDED_PER_TIER
	return maxi(from_prereq, from_difficulty)


## Find a temple dictionary by ID from the database.
static func _find_temple(temple_id: int) -> Dictionary:
	var all_temples: Array[Dictionary] = TempleDatabase.get_all_temples()
	for temple: Dictionary in all_temples:
		if int(temple.get("temple_id", 0)) == temple_id:
			return temple
	return {}


## Get the player's top-10 average level.
static func _get_player_avg_level(player_data: PlayerData) -> float:
	var all_sprites: Array = player_data.team + player_data.storage
	if all_sprites.is_empty():
		return 1.0
	all_sprites.sort_custom(func(a, b): return a.level > b.level)
	var top_count: int = mini(10, all_sprites.size())
	var total: int = 0
	for i in range(top_count):
		total += all_sprites[i].level
	return float(total) / float(top_count)

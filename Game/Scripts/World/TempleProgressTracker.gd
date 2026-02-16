## TempleProgressTracker — Tracks per-temple progress for the player,
## including area clears, enemy defeat counts, boss status, and completion.
## Provides save/load serialization via to_dict() / from_dict().
class_name TempleProgressTracker
extends RefCounted

## ── State ────────────────────────────────────────────────────────────────────

## Maps temple_id → progress Dictionary:
## {
##   current_area: int,            — index of the area the player is on
##   areas_cleared: Array[int],    — indices of cleared areas
##   enemies_defeated: int,        — total enemies defeated in this run
##   is_boss_defeated: bool,       — whether the boss has been beaten
##   completion_count: int,        — total number of completions
##   best_time_seconds: float,     — fastest completion time (0.0 = not completed)
##   run_start_time: float,        — timestamp when current run started
## }
var temple_progress: Dictionary = {}


## ── Public API ──────────────────────────────────────────────────────────────

## Initialize a new temple run. Resets area progress but preserves historical
## data (completion_count, best_time).
func start_temple_run(temple_id: int) -> void:
	if not temple_progress.has(temple_id):
		temple_progress[temple_id] = _create_default_progress()
	else:
		# Reset run-specific state, keep historical.
		var existing: Dictionary = temple_progress[temple_id]
		existing["current_area"] = 0
		existing["areas_cleared"] = []
		existing["enemies_defeated"] = 0
		existing["is_boss_defeated"] = false
		existing["run_start_time"] = Time.get_unix_time_from_system()
		temple_progress[temple_id] = existing


## Mark an area within the temple as cleared.
func clear_area(temple_id: int, area_index: int) -> void:
	_ensure_progress_exists(temple_id)
	var progress: Dictionary = temple_progress[temple_id]
	var cleared: Array = progress.get("areas_cleared", [])

	if area_index not in cleared:
		cleared.append(area_index)
		progress["areas_cleared"] = cleared

	# Advance current area to the next one.
	progress["current_area"] = area_index + 1
	temple_progress[temple_id] = progress

	EventBus.temple_area_cleared.emit(str(temple_id), area_index)


## Check whether a specific area has been cleared.
func is_area_cleared(temple_id: int, area_index: int) -> bool:
	if not temple_progress.has(temple_id):
		return false
	var cleared: Array = temple_progress[temple_id].get("areas_cleared", [])
	return area_index in cleared


## Record a boss defeat for the given temple.
func defeat_boss(temple_id: int) -> void:
	_ensure_progress_exists(temple_id)
	temple_progress[temple_id]["is_boss_defeated"] = true
	EventBus.temple_boss_defeated.emit(str(temple_id))


## Record an enemy defeated in the current temple run.
func record_enemy_defeated(temple_id: int, count: int = 1) -> void:
	_ensure_progress_exists(temple_id)
	temple_progress[temple_id]["enemies_defeated"] = (
		int(temple_progress[temple_id].get("enemies_defeated", 0)) + count
	)


## Complete the temple run. Returns a results dictionary:
## {first_clear: bool, rewards: Dictionary, completion_time: float}
func complete_temple(temple_id: int) -> Dictionary:
	_ensure_progress_exists(temple_id)
	var progress: Dictionary = temple_progress[temple_id]

	if not progress.get("is_boss_defeated", false):
		push_warning("TempleProgressTracker: cannot complete temple %d — boss not defeated." % temple_id)
		return {}

	var completion_count: int = int(progress.get("completion_count", 0))
	var is_first_clear: bool = completion_count == 0

	# Calculate run time.
	var start_time: float = float(progress.get("run_start_time", 0.0))
	var completion_time: float = 0.0
	if start_time > 0.0:
		completion_time = Time.get_unix_time_from_system() - start_time

	# Update historical data.
	completion_count += 1
	progress["completion_count"] = completion_count

	# Update best time.
	var best_time: float = float(progress.get("best_time_seconds", 0.0))
	if completion_time > 0.0 and (best_time <= 0.0 or completion_time < best_time):
		progress["best_time_seconds"] = completion_time

	temple_progress[temple_id] = progress

	# Update player data.
	if GameManager and GameManager.player_data:
		GameManager.player_data.complete_temple(temple_id)

	EventBus.temple_completed.emit(str(temple_id))

	return {
		"first_clear": is_first_clear,
		"completion_time": completion_time,
		"total_completions": completion_count,
		"enemies_defeated": int(progress.get("enemies_defeated", 0)),
	}


## Get the current progress dictionary for a temple.
## Returns empty dictionary if no progress exists.
func get_progress(temple_id: int) -> Dictionary:
	return temple_progress.get(temple_id, {})


## Check whether the player can enter a specific temple.
## Returns: {allowed: bool, reason: String}
##
## Parameters:
##   temple_id    — the ID of the temple to check.
##   player_data  — the player's PlayerData resource.
##   temple_data  — the TempleData dictionary (or TempleData resource fields as dict).
func can_enter_temple(
	temple_id: int,
	player_data: PlayerData,
	temple_data: Dictionary,
) -> Dictionary:
	if not player_data:
		return {"allowed": false, "reason": "No player data available."}

	var prerequisites: Dictionary = temple_data.get("unlock_prerequisites", {})

	# Check minimum level.
	var min_level: int = int(prerequisites.get("min_level", 1))
	var player_avg_level: float = _get_player_avg_level(player_data)
	if player_avg_level < float(min_level):
		return {
			"allowed": false,
			"reason": "Team average level must be at least %d (currently %.0f)." % [
				min_level, player_avg_level
			],
		}

	# Check prerequisite quests.
	var req_quests: Array = prerequisites.get("quest_ids", [])
	for qid in req_quests:
		if int(qid) not in player_data.completed_quest_ids:
			return {
				"allowed": false,
				"reason": "Required quest (ID %d) has not been completed." % int(qid),
			}

	# Check prerequisite temples.
	var req_temples: Array = prerequisites.get("temple_ids", [])
	for tid in req_temples:
		if int(tid) not in player_data.completed_temple_ids:
			return {
				"allowed": false,
				"reason": "Required temple (ID %d) has not been cleared." % int(tid),
			}

	return {"allowed": true, "reason": ""}


## ── Serialization ───────────────────────────────────────────────────────────

## Serialize all temple progress to a Dictionary for saving.
func to_dict() -> Dictionary:
	var result: Dictionary = {}
	for temple_id: int in temple_progress:
		var progress: Dictionary = temple_progress[temple_id]
		result[str(temple_id)] = {
			"current_area": int(progress.get("current_area", 0)),
			"areas_cleared": progress.get("areas_cleared", []).duplicate(),
			"enemies_defeated": int(progress.get("enemies_defeated", 0)),
			"is_boss_defeated": bool(progress.get("is_boss_defeated", false)),
			"completion_count": int(progress.get("completion_count", 0)),
			"best_time_seconds": float(progress.get("best_time_seconds", 0.0)),
		}
	return result


## Restore temple progress from a saved Dictionary.
func from_dict(data: Dictionary) -> void:
	temple_progress.clear()
	for key: String in data:
		if not key.is_valid_int():
			continue
		var temple_id: int = key.to_int()
		var saved: Dictionary = data[key]
		temple_progress[temple_id] = {
			"current_area": int(saved.get("current_area", 0)),
			"areas_cleared": saved.get("areas_cleared", []).duplicate(),
			"enemies_defeated": int(saved.get("enemies_defeated", 0)),
			"is_boss_defeated": bool(saved.get("is_boss_defeated", false)),
			"completion_count": int(saved.get("completion_count", 0)),
			"best_time_seconds": float(saved.get("best_time_seconds", 0.0)),
			"run_start_time": 0.0,
		}


## ── Private Helpers ─────────────────────────────────────────────────────────

## Create a default progress entry for a new temple.
func _create_default_progress() -> Dictionary:
	return {
		"current_area": 0,
		"areas_cleared": [],
		"enemies_defeated": 0,
		"is_boss_defeated": false,
		"completion_count": 0,
		"best_time_seconds": 0.0,
		"run_start_time": Time.get_unix_time_from_system(),
	}


## Ensure a progress entry exists for the given temple_id.
func _ensure_progress_exists(temple_id: int) -> void:
	if not temple_progress.has(temple_id):
		temple_progress[temple_id] = _create_default_progress()


## Get the player's top-10 average level using the same logic as GameManager.
func _get_player_avg_level(player_data: PlayerData) -> float:
	var all_sprites: Array = player_data.team + player_data.storage
	if all_sprites.is_empty():
		return 1.0
	all_sprites.sort_custom(func(a, b): return a.level > b.level)
	var top_count: int = mini(10, all_sprites.size())
	var total: int = 0
	for i in range(top_count):
		total += all_sprites[i].level
	return float(total) / float(top_count)

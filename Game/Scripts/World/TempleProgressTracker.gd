## TempleProgressTracker — Tracks per-temple run progress including area
## clears, enemy defeats, and boss status. Provides save/load serialization
## and unlock prerequisite checking.
class_name TempleProgressTracker
extends RefCounted

## ── State ────────────────────────────────────────────────────────────────────

## Maps temple_id (int) → progress Dictionary:
## {
##   current_area: int,                  — the area the player is currently in
##   areas_cleared: Array[int],          — indices of cleared areas
##   enemies_defeated: int,              — total enemies defeated this run
##   is_boss_defeated: bool,             — whether the boss has been beaten
##   run_start_time: float,              — OS.get_ticks_msec() at run start
##   run_end_time: float,                — OS.get_ticks_msec() at completion (0 if in progress)
## }
var temple_progress: Dictionary = {}


## ── Public API ──────────────────────────────────────────────────────────────

## Begin a new temple run. Resets progress for the given temple.
func start_temple_run(temple_id: int) -> void:
	temple_progress[temple_id] = {
		"current_area": 0,
		"areas_cleared": [],
		"enemies_defeated": 0,
		"is_boss_defeated": false,
		"run_start_time": Time.get_ticks_msec(),
		"run_end_time": 0.0,
	}


## Mark an area as cleared within a temple.
func clear_area(temple_id: int, area_index: int) -> void:
	if not temple_progress.has(temple_id):
		push_warning("TempleProgressTracker: no active run for temple %d." % temple_id)
		return

	var progress: Dictionary = temple_progress[temple_id]
	var cleared: Array = progress.get("areas_cleared", [])
	if area_index not in cleared:
		cleared.append(area_index)
		progress["areas_cleared"] = cleared

	# Advance current_area to the next uncleared area.
	progress["current_area"] = area_index + 1
	temple_progress[temple_id] = progress

	EventBus.temple_area_cleared.emit(str(temple_id), area_index)


## Check whether a specific area has been cleared.
func is_area_cleared(temple_id: int, area_index: int) -> bool:
	if not temple_progress.has(temple_id):
		return false
	var cleared: Array = temple_progress[temple_id].get("areas_cleared", [])
	return area_index in cleared


## Record a boss defeat.
func defeat_boss(temple_id: int) -> void:
	if not temple_progress.has(temple_id):
		push_warning("TempleProgressTracker: no active run for temple %d." % temple_id)
		return

	var progress: Dictionary = temple_progress[temple_id]
	progress["is_boss_defeated"] = true
	temple_progress[temple_id] = progress

	EventBus.temple_boss_defeated.emit(str(temple_id))


## Record an enemy defeat (for tracking purposes / quest objectives).
func record_enemy_defeat(temple_id: int, count: int = 1) -> void:
	if not temple_progress.has(temple_id):
		return
	var progress: Dictionary = temple_progress[temple_id]
	progress["enemies_defeated"] = int(progress.get("enemies_defeated", 0)) + count
	temple_progress[temple_id] = progress


## Complete the temple. Determines if this is a first clear and returns
## completion data. Also emits the temple_completed signal.
## Returns: {first_clear: bool, rewards: Dictionary, run_time_ms: float}
func complete_temple(temple_id: int) -> Dictionary:
	if not temple_progress.has(temple_id):
		push_warning("TempleProgressTracker: no active run for temple %d." % temple_id)
		return {"first_clear": false, "rewards": {}}

	var progress: Dictionary = temple_progress[temple_id]
	progress["run_end_time"] = Time.get_ticks_msec()
	temple_progress[temple_id] = progress

	# Determine first clear status from PlayerData.
	var first_clear: bool = false
	if GameManager and GameManager.player_data:
		first_clear = not GameManager.player_data.is_temple_completed(temple_id)
		GameManager.player_data.complete_temple(temple_id)

	var run_time_ms: float = float(progress["run_end_time"]) - float(progress.get("run_start_time", 0.0))

	EventBus.temple_completed.emit(str(temple_id))

	return {
		"first_clear": first_clear,
		"rewards": {},  # Populated by TempleRewardSystem after this call.
		"run_time_ms": run_time_ms,
		"enemies_defeated": int(progress.get("enemies_defeated", 0)),
	}


## Get the current progress for a temple. Returns empty dict if no run exists.
func get_progress(temple_id: int) -> Dictionary:
	return temple_progress.get(temple_id, {})


## Check whether the player can enter a specific temple.
## Returns: {allowed: bool, reason: String}
##
## Checks:
##   1. Player meets the minimum level requirement.
##   2. Required quests are completed.
##   3. Required temples are completed.
func can_enter_temple(
	temple_id: int,
	player_data: PlayerData,
	temple_data: Dictionary,
) -> Dictionary:
	if not player_data:
		return {"allowed": false, "reason": "No player data available."}

	var prereqs: Dictionary = temple_data.get("unlock_prerequisites", {})

	# Check minimum level.
	var min_level: int = int(prereqs.get("min_level", 1))
	var all_sprites: Array = player_data.team + player_data.storage
	var avg_level: float = _calculate_avg_level(all_sprites)
	if avg_level < float(min_level):
		return {
			"allowed": false,
			"reason": "Your team's average level (%d) is below the minimum (%d)." % [
				int(avg_level), min_level
			],
		}

	# Check required quests.
	var required_quests: Array = prereqs.get("quest_ids", [])
	for qid in required_quests:
		if int(qid) not in player_data.completed_quest_ids:
			return {
				"allowed": false,
				"reason": "A required quest has not been completed (Quest #%d)." % int(qid),
			}

	# Check required temples.
	var required_temples: Array = prereqs.get("temple_ids", [])
	for tid in required_temples:
		if int(tid) not in player_data.completed_temple_ids:
			return {
				"allowed": false,
				"reason": "A required temple has not been cleared (Temple #%d)." % int(tid),
			}

	return {"allowed": true, "reason": ""}


## ── Serialization ───────────────────────────────────────────────────────────

## Serialize the tracker state to a Dictionary for saving.
func to_dict() -> Dictionary:
	var data: Dictionary = {}
	for temple_id: int in temple_progress:
		var progress: Dictionary = temple_progress[temple_id]
		# Convert temple_id to string key for JSON compatibility.
		data[str(temple_id)] = {
			"current_area": int(progress.get("current_area", 0)),
			"areas_cleared": progress.get("areas_cleared", []).duplicate(),
			"enemies_defeated": int(progress.get("enemies_defeated", 0)),
			"is_boss_defeated": bool(progress.get("is_boss_defeated", false)),
			"run_start_time": float(progress.get("run_start_time", 0.0)),
			"run_end_time": float(progress.get("run_end_time", 0.0)),
		}
	return data


## Restore the tracker state from a saved Dictionary.
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
			"run_start_time": float(saved.get("run_start_time", 0.0)),
			"run_end_time": float(saved.get("run_end_time", 0.0)),
		}


## ── Private Helpers ─────────────────────────────────────────────────────────

## Calculate the average level of a list of SpriteInstances (top 10).
func _calculate_avg_level(sprites: Array) -> float:
	if sprites.is_empty():
		return 1.0
	var sorted_sprites: Array = sprites.duplicate()
	sorted_sprites.sort_custom(func(a, b): return a.level > b.level)
	var top_count: int = mini(10, sorted_sprites.size())
	var total: int = 0
	for i in range(top_count):
		total += sorted_sprites[i].level
	return float(total) / float(top_count)

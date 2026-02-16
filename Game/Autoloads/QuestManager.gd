## QuestManager — Quest state machine autoload for Sprite Wars.
## Manages active, completed, and available quests. Listens to EventBus signals
## to automatically update objective progress when game events occur.
## Registered as an autoload in project.godot.
extends Node

## ── State ────────────────────────────────────────────────────────────────────

## Each entry: {quest_data: Dictionary, objectives_progress: Array[int], state: String}
## quest_data mirrors the QuestData schema fields.
## objectives_progress[i] tracks the current count for objective i.
## state is one of: "active", "ready_to_complete".
var active_quests: Array[Dictionary] = []

## Quest IDs that have been completed and rewards claimed.
var completed_quests: Array[int] = []

## Quest IDs whose prerequisites are met and can be accepted by the player.
var available_quests: Array[int] = []

## The quest_id currently tracked on the HUD. -1 means none.
var _tracked_quest_id: int = -1


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	_connect_event_bus_signals()


## ── Signal Connections ──────────────────────────────────────────────────────

func _connect_event_bus_signals() -> void:
	EventBus.battle_ended.connect(_on_battle_ended)
	EventBus.catch_succeeded.connect(_on_catch_succeeded)
	EventBus.area_entered.connect(_on_area_entered)
	EventBus.npc_interaction_ended.connect(_on_npc_interaction_ended)
	EventBus.temple_completed.connect(_on_temple_completed)
	EventBus.item_acquired.connect(_on_item_acquired)


## ── Public API ──────────────────────────────────────────────────────────────

## Activate a quest by ID. Returns true if the quest was successfully activated.
## The quest must be in available_quests and not already active or completed.
func activate_quest(quest_id: int) -> bool:
	if quest_id in completed_quests:
		push_warning("QuestManager: quest %d is already completed." % quest_id)
		return false

	if _find_active_quest_index(quest_id) >= 0:
		push_warning("QuestManager: quest %d is already active." % quest_id)
		return false

	if quest_id not in available_quests:
		push_warning("QuestManager: quest %d is not available." % quest_id)
		return false

	# Look up quest data from the data source.
	var quest_data: Dictionary = _load_quest_data(quest_id)
	if quest_data.is_empty():
		push_warning("QuestManager: quest %d data not found." % quest_id)
		return false

	# Build the objectives progress array initialized to zero.
	var objectives: Array = quest_data.get("objectives", [])
	var progress: Array[int] = []
	for _i in objectives.size():
		progress.append(0)

	var quest_entry: Dictionary = {
		"quest_data": quest_data,
		"objectives_progress": progress,
		"state": "active",
	}

	active_quests.append(quest_entry)
	available_quests.erase(quest_id)

	# Auto-track the first activated quest if nothing is tracked.
	if _tracked_quest_id < 0:
		_tracked_quest_id = quest_id

	EventBus.quest_accepted.emit(null)  # Signal expects Resource; pass null for dict-based flow.
	return true


## Update objective progress for a specific quest. Called automatically by
## event handlers or manually for custom objective types.
## Returns true if any objective was updated.
func update_objective(quest_id: int, objective_type: String, target: String, amount: int = 1) -> bool:
	var idx: int = _find_active_quest_index(quest_id)
	if idx < 0:
		return false

	var quest_entry: Dictionary = active_quests[idx]
	if quest_entry["state"] != "active":
		return false

	var quest_data: Dictionary = quest_entry["quest_data"]
	var objectives: Array = quest_data.get("objectives", [])
	var progress: Array[int] = quest_entry["objectives_progress"]
	var any_updated: bool = false

	for i in objectives.size():
		var obj: Dictionary = objectives[i]
		if obj.get("type", "") != objective_type:
			continue
		if str(obj.get("target", "")) != target:
			continue

		var required: int = int(obj.get("count", 1))
		if progress[i] >= required:
			continue  # Already complete.

		progress[i] = mini(progress[i] + amount, required)
		any_updated = true
		EventBus.quest_objective_updated.emit(null, i)

	if any_updated:
		quest_entry["objectives_progress"] = progress
		active_quests[idx] = quest_entry

		# Check if the quest is now ready to complete.
		if check_completion(quest_id):
			quest_entry["state"] = "ready_to_complete"
			active_quests[idx] = quest_entry

	return any_updated


## Check whether all objectives for a quest are fulfilled.
func check_completion(quest_id: int) -> bool:
	var idx: int = _find_active_quest_index(quest_id)
	if idx < 0:
		return false

	var quest_entry: Dictionary = active_quests[idx]
	var quest_data: Dictionary = quest_entry["quest_data"]
	var objectives: Array = quest_data.get("objectives", [])
	var progress: Array[int] = quest_entry["objectives_progress"]

	for i in objectives.size():
		var required: int = int(objectives[i].get("count", 1))
		if progress[i] < required:
			return false

	return not objectives.is_empty()


## Complete a quest and return its rewards dictionary.
## Removes the quest from active_quests and adds it to completed_quests.
func complete_quest(quest_id: int) -> Dictionary:
	var idx: int = _find_active_quest_index(quest_id)
	if idx < 0:
		push_warning("QuestManager: cannot complete quest %d — not active." % quest_id)
		return {}

	if not check_completion(quest_id):
		push_warning("QuestManager: quest %d objectives are not all fulfilled." % quest_id)
		return {}

	var quest_entry: Dictionary = active_quests[idx]
	var quest_data: Dictionary = quest_entry["quest_data"]
	var rewards: Dictionary = quest_data.get("rewards", {})

	# Move to completed.
	active_quests.remove_at(idx)
	if quest_id not in completed_quests:
		completed_quests.append(quest_id)

	# Update tracked quest if this was the tracked one.
	if _tracked_quest_id == quest_id:
		_tracked_quest_id = _find_next_active_quest_id()

	# Update player data.
	if GameManager and GameManager.player_data:
		GameManager.player_data.complete_quest(quest_id)

	EventBus.quest_completed.emit(null)

	# Refresh available quests after completion (new quests may unlock).
	var all_quests: Array = _load_all_quest_data()
	refresh_available_quests(all_quests, completed_quests)

	return rewards


## Return the full list of active quest entries.
func get_active_quests() -> Array[Dictionary]:
	return active_quests


## Return the state of a given quest: "locked", "available", "active",
## "ready_to_complete", "complete", or "unknown".
func get_quest_state(quest_id: int) -> String:
	if quest_id in completed_quests:
		return "complete"
	if quest_id in available_quests:
		return "available"
	var idx: int = _find_active_quest_index(quest_id)
	if idx >= 0:
		return active_quests[idx].get("state", "active")
	return "locked"


## Check whether a quest's prerequisites are met given a set of completed IDs.
func check_prerequisites(quest_id: int, completed_ids: Array) -> bool:
	var quest_data: Dictionary = _load_quest_data(quest_id)
	if quest_data.is_empty():
		return false
	var prereqs: Array = quest_data.get("prerequisite_quest_ids", [])
	for prereq_id in prereqs:
		if int(prereq_id) not in completed_ids:
			return false
	return true


## Scan all quests and mark those whose prerequisites are now met as available.
## Skips quests that are already active, completed, or already available.
func refresh_available_quests(all_quests: Array, completed_ids: Array) -> void:
	for quest_data: Dictionary in all_quests:
		var qid: int = int(quest_data.get("quest_id", 0))
		if qid <= 0:
			continue
		if qid in completed_ids:
			continue
		if qid in available_quests:
			continue
		if _find_active_quest_index(qid) >= 0:
			continue

		var prereqs: Array = quest_data.get("prerequisite_quest_ids", [])
		var prereqs_met: bool = true
		for prereq_id in prereqs:
			if int(prereq_id) not in completed_ids:
				prereqs_met = false
				break

		if prereqs_met:
			available_quests.append(qid)
			EventBus.quest_available.emit(null)


## Return the currently tracked quest entry for HUD display, or empty dict.
func get_tracked_quest() -> Dictionary:
	if _tracked_quest_id < 0:
		return {}
	var idx: int = _find_active_quest_index(_tracked_quest_id)
	if idx < 0:
		return {}
	return active_quests[idx]


## Set the quest currently tracked on the HUD.
func set_tracked_quest(quest_id: int) -> void:
	if _find_active_quest_index(quest_id) >= 0:
		_tracked_quest_id = quest_id
	else:
		push_warning("QuestManager: cannot track quest %d — not active." % quest_id)


## ── Event Handlers ──────────────────────────────────────────────────────────

func _on_battle_ended(result: Dictionary) -> void:
	var is_victory: bool = result.get("victory", false)
	if not is_victory:
		return

	# Handle "defeat_enemies" objectives.
	var enemies_defeated: Array = result.get("enemies_defeated", [])
	for enemy_data: Dictionary in enemies_defeated:
		var enemy_id: String = str(enemy_data.get("race_id", ""))
		_broadcast_objective_update("defeat_enemies", enemy_id, 1)

	# Handle "win_battle_condition" objectives.
	var battle_type: String = str(result.get("battle_type", ""))
	if not battle_type.is_empty():
		_broadcast_objective_update("win_battle_condition", battle_type, 1)

	# Generic battle win target.
	_broadcast_objective_update("win_battle_condition", "any", 1)


func _on_catch_succeeded(sprite_data: Resource) -> void:
	var race_id_str: String = ""
	if sprite_data and sprite_data is SpriteInstance:
		race_id_str = str((sprite_data as SpriteInstance).race_id)
	_broadcast_objective_update("catch_sprite", race_id_str, 1)
	# Also count as "any" catch.
	_broadcast_objective_update("catch_sprite", "any", 1)


func _on_area_entered(area_id: String) -> void:
	_broadcast_objective_update("reach_area", area_id, 1)


func _on_npc_interaction_ended(npc_id: String) -> void:
	_broadcast_objective_update("talk_to_npc", npc_id, 1)


func _on_temple_completed(temple_id: String) -> void:
	_broadcast_objective_update("complete_temple", temple_id, 1)


func _on_item_acquired(item: Resource, quantity: int) -> void:
	# Resolve item_id from the Resource. EquipmentData or generic item.
	var item_id_str: String = ""
	if item and item is EquipmentData:
		item_id_str = str((item as EquipmentData).equipment_id)
	elif item:
		# Fallback: try common property names.
		if "item_id" in item:
			item_id_str = str(item.get("item_id"))

	if not item_id_str.is_empty():
		_broadcast_objective_update("collect_items", item_id_str, quantity)
		# Handle "deliver_item" as well (same trigger, different objective type).
		_broadcast_objective_update("deliver_item", item_id_str, quantity)


## ── Private Helpers ─────────────────────────────────────────────────────────

## Broadcast an objective update to all active quests.
func _broadcast_objective_update(objective_type: String, target: String, amount: int) -> void:
	for i in active_quests.size():
		var quest_entry: Dictionary = active_quests[i]
		var qid: int = int(quest_entry["quest_data"].get("quest_id", 0))
		update_objective(qid, objective_type, target, amount)


## Find the index of an active quest by quest_id. Returns -1 if not found.
func _find_active_quest_index(quest_id: int) -> int:
	for i in active_quests.size():
		if int(active_quests[i]["quest_data"].get("quest_id", 0)) == quest_id:
			return i
	return -1


## Find the next active quest ID for tracking after the current tracked quest
## is completed. Returns -1 if no active quests remain.
func _find_next_active_quest_id() -> int:
	if active_quests.is_empty():
		return -1
	return int(active_quests[0]["quest_data"].get("quest_id", -1))


## Load quest data by ID. Checks MainQuestData first; extensible for side quests.
func _load_quest_data(quest_id: int) -> Dictionary:
	var all_quests: Array = _load_all_quest_data()
	for quest: Dictionary in all_quests:
		if int(quest.get("quest_id", 0)) == quest_id:
			return quest
	return {}


## Load all quest definitions from data sources.
func _load_all_quest_data() -> Array:
	var quests: Array = []
	# Main story quests.
	quests.append_array(MainQuestData.get_all_quests())
	# Future: append side quests, daily quests, etc.
	return quests


## ── Save / Load Integration ────────────────────────────────────────────────

## Serialize the quest manager state to a Dictionary for saving.
func to_dict() -> Dictionary:
	return {
		"active_quests": active_quests.duplicate(true),
		"completed_quests": completed_quests.duplicate(),
		"available_quests": available_quests.duplicate(),
		"tracked_quest_id": _tracked_quest_id,
	}


## Restore quest manager state from a saved Dictionary.
func from_dict(data: Dictionary) -> void:
	active_quests.clear()
	var saved_active: Array = data.get("active_quests", [])
	for entry in saved_active:
		active_quests.append(entry)

	completed_quests.clear()
	var saved_completed: Array = data.get("completed_quests", [])
	for qid in saved_completed:
		completed_quests.append(int(qid))

	available_quests.clear()
	var saved_available: Array = data.get("available_quests", [])
	for qid in saved_available:
		available_quests.append(int(qid))

	_tracked_quest_id = int(data.get("tracked_quest_id", -1))

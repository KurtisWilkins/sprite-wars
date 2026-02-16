## QuestData — Data schema for quests in Sprite Wars.
## [P6-001] Covers main story, side quests, dailies, and temple quests.
## Tracks objectives, prerequisites, rewards, and completion state.
class_name QuestData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

@export var quest_id: int = 0
@export var title: String = ""
@export_multiline var description: String = ""

## ── Classification ────────────────────────────────────────────────────────────

@export_enum("main", "side", "daily", "temple") var quest_type: String = "side"

## NPC ID of the quest giver (for dialog and map marker systems).
@export var quest_giver_npc_id: String = ""

## ── Objectives ────────────────────────────────────────────────────────────────

## Each objective is a Dictionary:
##   {
##     "type": String,          — one of VALID_OBJECTIVE_TYPES
##     "target": Variant,       — the specific target (enemy id, area id, item id, etc.)
##     "count": int,            — how many times the objective must be fulfilled
##     "description": String,   — player-facing text
##     "completed": bool,       — runtime tracking flag
##   }
@export var objectives: Array[Dictionary] = []

## ── Prerequisites ─────────────────────────────────────────────────────────────

## Quest IDs that must be completed before this quest becomes available.
@export var prerequisite_quest_ids: Array[int] = []

## ── Rewards ───────────────────────────────────────────────────────────────────

## {
##   "xp": int,
##   "currency": int,
##   "items": Array[Dictionary] — [{item_id: int, count: int}]
##   "unlocks": Array[String]   — feature/area unlock keys
## }
@export var rewards: Dictionary = {
	"xp": 0,
	"currency": 0,
	"items": [],
	"unlocks": [],
}

## ── State ─────────────────────────────────────────────────────────────────────

## Runtime state of this quest for the current player.
@export_enum("locked", "available", "active", "complete") var quest_state: String = "locked"


## ── Constants ─────────────────────────────────────────────────────────────────

const VALID_QUEST_TYPES: PackedStringArray = PackedStringArray([
	"main", "side", "daily", "temple",
])

const VALID_QUEST_STATES: PackedStringArray = PackedStringArray([
	"locked", "available", "active", "complete",
])

const VALID_OBJECTIVE_TYPES: PackedStringArray = PackedStringArray([
	"defeat_enemies",
	"catch_sprite",
	"reach_area",
	"collect_items",
	"talk_to_npc",
	"complete_temple",
	"win_battle_condition",
	"deliver_item",
])


## ── Objective Helpers ─────────────────────────────────────────────────────────

## Return the total number of objectives.
func get_objective_count() -> int:
	return objectives.size()


## Return the number of completed objectives.
func get_completed_objective_count() -> int:
	var count := 0
	for obj in objectives:
		if obj.get("completed", false):
			count += 1
	return count


## Whether all objectives are fulfilled.
func are_all_objectives_complete() -> bool:
	for obj in objectives:
		if not obj.get("completed", false):
			return false
	return not objectives.is_empty()


## Mark a specific objective as completed by index.
func complete_objective(index: int) -> void:
	if index >= 0 and index < objectives.size():
		objectives[index]["completed"] = true


## Update progress for objectives matching the given type and target.
## Returns true if any objective was newly completed.
func update_objective_progress(objective_type: String, target: Variant, amount: int = 1) -> bool:
	var any_completed := false
	for i in objectives.size():
		var obj: Dictionary = objectives[i]
		if obj.get("completed", false):
			continue
		if obj.get("type", "") != objective_type:
			continue
		if obj.get("target", null) != target:
			continue
		# Increment progress tracking. We use a "_progress" key internally.
		var progress: int = obj.get("_progress", 0) + amount
		obj["_progress"] = progress
		if progress >= obj.get("count", 1):
			obj["completed"] = true
			any_completed = true
	return any_completed


## Reset all objectives to incomplete (e.g. for daily quest refresh).
func reset_objectives() -> void:
	for obj in objectives:
		obj["completed"] = false
		obj["_progress"] = 0


## ── State Helpers ─────────────────────────────────────────────────────────────

## Check whether this quest can be activated given a set of completed quest IDs.
func can_activate(completed_ids: Array[int]) -> bool:
	if quest_state != "available":
		return false
	for prereq_id in prerequisite_quest_ids:
		if prereq_id not in completed_ids:
			return false
	return true


## Check whether prerequisite quests are met (for transitioning locked → available).
func prerequisites_met(completed_ids: Array[int]) -> bool:
	for prereq_id in prerequisite_quest_ids:
		if prereq_id not in completed_ids:
			return false
	return true


## Attempt to advance the quest state. Returns true if the state changed.
func try_advance_state(completed_ids: Array[int]) -> bool:
	match quest_state:
		"locked":
			if prerequisites_met(completed_ids):
				quest_state = "available"
				return true
		"active":
			if are_all_objectives_complete():
				quest_state = "complete"
				return true
	return false


## ── Validation ────────────────────────────────────────────────────────────────

func validate() -> Array[String]:
	var errors: Array[String] = []
	if quest_id <= 0:
		errors.append("quest_id must be a positive integer.")
	if title.is_empty():
		errors.append("title is required.")
	if quest_type not in VALID_QUEST_TYPES:
		errors.append("quest_type '%s' is invalid." % quest_type)
	if quest_state not in VALID_QUEST_STATES:
		errors.append("quest_state '%s' is invalid." % quest_state)
	if objectives.is_empty():
		errors.append("At least one objective is required.")
	for i in objectives.size():
		var obj: Dictionary = objectives[i]
		if not obj.has("type"):
			errors.append("objectives[%d] missing 'type'." % i)
		elif obj["type"] not in VALID_OBJECTIVE_TYPES:
			errors.append("objectives[%d] type '%s' is invalid." % [i, obj["type"]])
		if not obj.has("count") or int(obj.get("count", 0)) < 1:
			errors.append("objectives[%d] must have count >= 1." % i)
		if not obj.has("description"):
			errors.append("objectives[%d] missing 'description'." % i)
	if not rewards.has("xp"):
		errors.append("rewards must include 'xp' key.")
	return errors

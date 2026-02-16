## SpriteRegistrySystem — Manages the Sprite registry (Pokedex equivalent).
## [Progression] Tracks which of the 72 Sprite forms the player has seen or
## caught, provides per-entry status lookups, and calculates completion
## statistics for UI display and achievement tracking.
class_name SpriteRegistrySystem
extends RefCounted


## ── Constants ───────────────────────────────────────────────────────────────

## Total number of unique forms in the game (24 races x 3 stages).
const TOTAL_FORMS: int = 72

## Registry entry statuses.
const STATUS_UNSEEN: String = ""
const STATUS_SEEN: String = "seen"
const STATUS_CAUGHT: String = "caught"

## Completion milestone thresholds (for achievement/reward triggers).
const MILESTONES: Array[int] = [10, 25, 50, 72]


## ── Core Operations ─────────────────────────────────────────────────────────

## Register a form as "seen" in the player's registry.
## If the form is already registered as "caught", this is a no-op (seen does
## not downgrade caught status).
##
## Parameters:
##   player_data — the PlayerData Resource
##   form_id     — the EvolutionStageData form_id (1-72)
func register_seen(player_data: Resource, form_id: int) -> void:
	if player_data == null or not (player_data is PlayerData):
		push_warning("SpriteRegistrySystem.register_seen: invalid player_data.")
		return

	if form_id < 1 or form_id > TOTAL_FORMS:
		push_warning("SpriteRegistrySystem.register_seen: form_id %d out of range." % form_id)
		return

	# Only upgrade from unseen to seen; never downgrade caught.
	player_data.register_seen(form_id)


## Register a form as "caught" in the player's registry.
## Upgrades from any previous status (unseen or seen) to caught.
##
## Parameters:
##   player_data — the PlayerData Resource
##   form_id     — the EvolutionStageData form_id (1-72)
func register_caught(player_data: Resource, form_id: int) -> void:
	if player_data == null or not (player_data is PlayerData):
		push_warning("SpriteRegistrySystem.register_caught: invalid player_data.")
		return

	if form_id < 1 or form_id > TOTAL_FORMS:
		push_warning("SpriteRegistrySystem.register_caught: form_id %d out of range." % form_id)
		return

	player_data.register_caught(form_id)


## Get the registry status for a specific form.
##
## Parameters:
##   player_data — the PlayerData Resource
##   form_id     — the EvolutionStageData form_id (1-72)
##
## Returns:
##   "caught", "seen", or "" (unseen).
func get_entry(player_data: Resource, form_id: int) -> String:
	if player_data == null or not (player_data is PlayerData):
		return STATUS_UNSEEN

	if form_id < 1 or form_id > TOTAL_FORMS:
		return STATUS_UNSEEN

	return player_data.get_registry_status(form_id)


## ── Completion Statistics ───────────────────────────────────────────────────

## Get comprehensive completion statistics for the Sprite registry.
##
## Parameters:
##   player_data — the PlayerData Resource
##
## Returns:
##   Dictionary {
##     "total": int,              — total number of forms (72)
##     "seen": int,               — number of forms seen (includes caught)
##     "caught": int,             — number of forms caught
##     "unseen": int,             — number of forms never encountered
##     "seen_percentage": float,  — seen / total as [0.0, 1.0]
##     "caught_percentage": float, — caught / total as [0.0, 1.0]
##     "is_complete": bool,       — true if all 72 forms are caught
##     "next_milestone": int,     — next uncompleted milestone, or -1 if all done
##   }
func get_completion_stats(player_data: Resource) -> Dictionary:
	var result := {
		"total": TOTAL_FORMS,
		"seen": 0,
		"caught": 0,
		"unseen": TOTAL_FORMS,
		"seen_percentage": 0.0,
		"caught_percentage": 0.0,
		"is_complete": false,
		"next_milestone": MILESTONES[0] if not MILESTONES.is_empty() else -1,
	}

	if player_data == null or not (player_data is PlayerData):
		return result

	var seen_count: int = player_data.get_seen_count()
	var caught_count: int = player_data.get_caught_count()

	result["seen"] = seen_count
	result["caught"] = caught_count
	result["unseen"] = TOTAL_FORMS - seen_count
	result["seen_percentage"] = float(seen_count) / float(TOTAL_FORMS)
	result["caught_percentage"] = float(caught_count) / float(TOTAL_FORMS)
	result["is_complete"] = caught_count >= TOTAL_FORMS

	# Determine the next milestone.
	var next_milestone: int = -1
	for milestone: int in MILESTONES:
		if caught_count < milestone:
			next_milestone = milestone
			break
	result["next_milestone"] = next_milestone

	return result


## ── Query Helpers ───────────────────────────────────────────────────────────

## Get all form IDs that have been seen (includes caught).
func get_seen_form_ids(player_data: Resource) -> Array[int]:
	var form_ids: Array[int] = []
	if player_data == null or not (player_data is PlayerData):
		return form_ids

	for form_id in player_data.sprite_registry:
		form_ids.append(int(form_id))

	form_ids.sort()
	return form_ids


## Get all form IDs that have been caught.
func get_caught_form_ids(player_data: Resource) -> Array[int]:
	var form_ids: Array[int] = []
	if player_data == null or not (player_data is PlayerData):
		return form_ids

	for form_id in player_data.sprite_registry:
		if str(player_data.sprite_registry[form_id]) == STATUS_CAUGHT:
			form_ids.append(int(form_id))

	form_ids.sort()
	return form_ids


## Get all form IDs that have NOT been seen at all.
func get_unseen_form_ids(player_data: Resource) -> Array[int]:
	var unseen: Array[int] = []
	if player_data == null or not (player_data is PlayerData):
		for i in range(1, TOTAL_FORMS + 1):
			unseen.append(i)
		return unseen

	for form_id in range(1, TOTAL_FORMS + 1):
		if not player_data.sprite_registry.has(form_id):
			unseen.append(form_id)

	return unseen


## Get all form IDs for a specific race (3 per race).
func get_race_form_ids(race_id: int) -> Array[int]:
	var form_ids: Array[int] = []
	if race_id < 1 or race_id > 24:
		return form_ids

	# Convention: form_id = (race_id - 1) * 3 + stage_number
	for stage in range(1, 4):
		form_ids.append((race_id - 1) * 3 + stage)

	return form_ids


## Get the registry completion status for an entire race.
##
## Parameters:
##   player_data — the PlayerData Resource
##   race_id     — the race ID (1-24)
##
## Returns:
##   Dictionary { "seen": int, "caught": int, "total": 3 }
func get_race_completion(player_data: Resource, race_id: int) -> Dictionary:
	var result := {"seen": 0, "caught": 0, "total": 3}
	if player_data == null or not (player_data is PlayerData):
		return result

	var form_ids := get_race_form_ids(race_id)
	for fid: int in form_ids:
		var status: String = player_data.get_registry_status(fid)
		if status == STATUS_CAUGHT:
			result["caught"] = int(result["caught"]) + 1
			result["seen"] = int(result["seen"]) + 1
		elif status == STATUS_SEEN:
			result["seen"] = int(result["seen"]) + 1

	return result


## Check whether a caught milestone was just reached. Returns the milestone
## value if a new milestone was hit, or -1 otherwise.
func check_milestone(player_data: Resource, previous_caught_count: int) -> int:
	if player_data == null or not (player_data is PlayerData):
		return -1

	var current_caught: int = player_data.get_caught_count()

	for milestone: int in MILESTONES:
		if previous_caught_count < milestone and current_caught >= milestone:
			return milestone

	return -1

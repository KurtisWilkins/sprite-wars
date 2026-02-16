## SaveConflictResolver -- Resolves conflicts between local and cloud saves.
## [P12-005] Compares timestamps, supports automatic resolution for clear winners,
## prompts the user when timestamps are close, and provides non-destructive merge
## for compatible fields.
class_name SaveConflictResolver
extends RefCounted


## ── Constants ────────────────────────────────────────────────────────────────────

## If the timestamp difference is within this many seconds, ask the user to choose
## rather than silently picking the newer one.
const TIMESTAMP_AMBIGUITY_WINDOW: float = 60.0


## ── Conflict Resolution ─────────────────────────────────────────────────────────

## Compare local and cloud saves and decide which should win.
## Returns:
##   {
##     "resolution": "local" | "cloud" | "ask_user",
##     "save_data": Dictionary,  -- the chosen save (empty if "ask_user")
##     "reason": String,         -- human-readable explanation
##   }
static func resolve_conflict(local_save: Dictionary, cloud_save: Dictionary) -> Dictionary:
	# Edge cases: one side is empty.
	if local_save.is_empty() and cloud_save.is_empty():
		return {
			"resolution": "local",
			"save_data": SaveSchema.create_empty_save(),
			"reason": "Both saves are empty; returning fresh save.",
		}
	if local_save.is_empty():
		return {
			"resolution": "cloud",
			"save_data": cloud_save,
			"reason": "Local save is empty; using cloud save.",
		}
	if cloud_save.is_empty():
		return {
			"resolution": "local",
			"save_data": local_save,
			"reason": "Cloud save is empty; using local save.",
		}

	# Compare timestamps.
	var local_ts: float = float(local_save.get("save_timestamp", 0.0))
	var cloud_ts: float = float(cloud_save.get("save_timestamp", 0.0))
	var diff: float = absf(local_ts - cloud_ts)

	# If within the ambiguity window, we cannot decide automatically.
	if diff <= TIMESTAMP_AMBIGUITY_WINDOW:
		# Check if one has clearly more progress.
		var local_progress := _estimate_progress(local_save)
		var cloud_progress := _estimate_progress(cloud_save)

		if local_progress > cloud_progress + 5.0:
			return {
				"resolution": "local",
				"save_data": local_save,
				"reason": "Timestamps close (%.0fs), but local has more progress (%.1f%% vs %.1f%%)." % [
					diff, local_progress, cloud_progress],
			}
		elif cloud_progress > local_progress + 5.0:
			return {
				"resolution": "cloud",
				"save_data": cloud_save,
				"reason": "Timestamps close (%.0fs), but cloud has more progress (%.1f%% vs %.1f%%)." % [
					diff, cloud_progress, local_progress],
			}

		# Truly ambiguous -- let the player decide.
		return {
			"resolution": "ask_user",
			"save_data": {},
			"reason": "Timestamps within %.0fs and similar progress. Player should choose." % diff,
			"local_info": _summarize_save(local_save),
			"cloud_info": _summarize_save(cloud_save),
		}

	# Clear timestamp winner.
	if local_ts > cloud_ts:
		return {
			"resolution": "local",
			"save_data": local_save,
			"reason": "Local save is newer by %.0f seconds." % diff,
		}
	else:
		return {
			"resolution": "cloud",
			"save_data": cloud_save,
			"reason": "Cloud save is newer by %.0f seconds." % diff,
		}


## ── Non-Destructive Merge ───────────────────────────────────────────────────────

## Merge two saves, taking the maximum progress from each where possible.
## This is a "best of both worlds" merge that never loses progress.
## Returns a new merged save dictionary.
static func merge_saves(local: Dictionary, cloud: Dictionary) -> Dictionary:
	# Start with the newer save as the base.
	var local_ts: float = float(local.get("save_timestamp", 0.0))
	var cloud_ts: float = float(cloud.get("save_timestamp", 0.0))
	var base: Dictionary = cloud.duplicate(true) if cloud_ts >= local_ts else local.duplicate(true)
	var other: Dictionary = local.duplicate(true) if cloud_ts >= local_ts else cloud.duplicate(true)

	# Merge currency: take the higher value.
	base["currency"] = maxi(int(base.get("currency", 0)), int(other.get("currency", 0)))

	# Merge play time: take the larger value.
	base["play_time_seconds"] = maxf(
		float(base.get("play_time_seconds", 0.0)),
		float(other.get("play_time_seconds", 0.0))
	)

	# Merge completed temple IDs: union of both sets.
	base["completed_temple_ids"] = _merge_int_arrays(
		base.get("completed_temple_ids", []),
		other.get("completed_temple_ids", [])
	)

	# Merge completed quest IDs: union of both sets.
	base["completed_quest_ids"] = _merge_int_arrays(
		base.get("completed_quest_ids", []),
		other.get("completed_quest_ids", [])
	)

	# Merge sprite registry: take the "better" status for each form.
	base["sprite_registry"] = _merge_registry(
		base.get("sprite_registry", {}),
		other.get("sprite_registry", {})
	)

	# Merge unlocked composition bonuses: union.
	base["unlocked_composition_bonuses"] = _merge_int_arrays(
		base.get("unlocked_composition_bonuses", []),
		other.get("unlocked_composition_bonuses", [])
	)

	# Merge inventory: take max count for each item.
	base["inventory"] = _merge_inventories(
		base.get("inventory", {}),
		other.get("inventory", {})
	)

	# Team and storage: Keep the base's team/storage as-is. Merging individual
	# sprite instances is too risky (stat drift, duplicate instance IDs).
	# The base already contains the newer team state.

	# Merge equipment inventory: union by equipment_id.
	base["equipment_inventory"] = _merge_equipment_arrays(
		base.get("equipment_inventory", []),
		other.get("equipment_inventory", [])
	)

	# Settings: keep the base (newer) settings.

	# Update timestamp and version.
	base["save_timestamp"] = Time.get_unix_time_from_system()
	base["schema_version"] = SaveSchema.SCHEMA_VERSION

	return base


## ── Private Helpers ─────────────────────────────────────────────────────────────

## Estimate overall progress as a percentage (0-100).
static func _estimate_progress(data: Dictionary) -> float:
	var score: float = 0.0

	# Temples completed (30 max).
	var temples: Array = data.get("completed_temple_ids", [])
	score += float(temples.size()) * 2.0

	# Quests completed.
	var quests: Array = data.get("completed_quest_ids", [])
	score += float(quests.size()) * 1.0

	# Sprites caught.
	var registry: Dictionary = data.get("sprite_registry", {})
	for key in registry:
		if registry[key] == "caught":
			score += 1.0
		elif registry[key] == "seen":
			score += 0.25

	# Team levels.
	var team: Array = data.get("team", [])
	for sprite_dict in team:
		if sprite_dict is Dictionary:
			score += float(int(sprite_dict.get("level", 1))) * 0.1

	return score


## Build a human-readable summary for conflict resolution UI.
static func _summarize_save(data: Dictionary) -> Dictionary:
	var team: Array = data.get("team", [])
	var team_levels: Array = []
	for sprite_dict in team:
		if sprite_dict is Dictionary:
			team_levels.append(int(sprite_dict.get("level", 1)))

	var highest_level: int = 0
	for lv in team_levels:
		highest_level = maxi(highest_level, lv)

	return {
		"timestamp": float(data.get("save_timestamp", 0.0)),
		"play_time_seconds": float(data.get("play_time_seconds", 0.0)),
		"player_name": str(data.get("player_name", "")),
		"team_size": team.size(),
		"highest_level": highest_level,
		"temples_completed": (data.get("completed_temple_ids", []) as Array).size(),
		"quests_completed": (data.get("completed_quest_ids", []) as Array).size(),
		"currency": int(data.get("currency", 0)),
	}


## Merge two arrays of ints into a deduplicated sorted union.
static func _merge_int_arrays(a: Array, b: Array) -> Array[int]:
	var seen: Dictionary = {}
	var result: Array[int] = []
	for val in a:
		var iv := int(val)
		if not seen.has(iv):
			seen[iv] = true
			result.append(iv)
	for val in b:
		var iv := int(val)
		if not seen.has(iv):
			seen[iv] = true
			result.append(iv)
	result.sort()
	return result


## Merge sprite registries: "caught" > "seen" > absent.
static func _merge_registry(a: Dictionary, b: Dictionary) -> Dictionary:
	var merged := a.duplicate()
	for key in b:
		var b_val: String = str(b[key])
		if not merged.has(key):
			merged[key] = b_val
		else:
			var a_val: String = str(merged[key])
			# "caught" always wins over "seen".
			if b_val == "caught" and a_val == "seen":
				merged[key] = "caught"
	return merged


## Merge inventories: take the max count for each item.
static func _merge_inventories(a: Dictionary, b: Dictionary) -> Dictionary:
	var merged := a.duplicate()
	for key in b:
		var b_count := int(b[key])
		var a_count := int(merged.get(key, 0))
		merged[key] = maxi(a_count, b_count)
	return merged


## Merge equipment arrays by equipment_id (union).
static func _merge_equipment_arrays(a: Array, b: Array) -> Array:
	var seen_ids: Dictionary = {}
	var merged: Array = []
	for equip in a:
		if equip is Dictionary:
			var eid := int(equip.get("equipment_id", 0))
			if not seen_ids.has(eid):
				seen_ids[eid] = true
				merged.append(equip)
	for equip in b:
		if equip is Dictionary:
			var eid := int(equip.get("equipment_id", 0))
			if not seen_ids.has(eid):
				seen_ids[eid] = true
				merged.append(equip)
	return merged

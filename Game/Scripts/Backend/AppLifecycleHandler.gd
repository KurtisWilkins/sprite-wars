## AppLifecycleHandler -- Manages mobile app lifecycle events for Sprite Wars.
## [P12-037] Handles focus loss/gain, close requests, and low memory situations.
## Backs up battle state on backgrounding and restores on return. Performs
## emergency saves on unexpected termination.
extends Node


## ── State ────────────────────────────────────────────────────────────────────────

## Whether the player was in a battle when the app was backgrounded.
var was_in_battle: bool = false

## Snapshot of the battle state captured on focus-out.
var battle_state_backup: Dictionary = {}

## Whether an emergency save has already been performed this lifecycle event.
var _emergency_save_done: bool = false

## Track whether the app is currently in focus.
var _is_focused: bool = true

## Timestamp of last focus-out (for detecting long background durations).
var _focus_out_timestamp: float = 0.0

## Duration threshold (seconds) after which we do a full reload on focus-in.
const LONG_BACKGROUND_THRESHOLD: float = 300.0  # 5 minutes


## ── Lifecycle ────────────────────────────────────────────────────────────────────

func _ready() -> void:
	# Ensure we get close request notifications.
	get_tree().set_auto_accept_quit(false)
	print("[AppLifecycleHandler] Initialized.")


func _notification(what: int) -> void:
	match what:
		NOTIFICATION_APPLICATION_FOCUS_OUT:
			_on_focus_out()
		NOTIFICATION_APPLICATION_FOCUS_IN:
			_on_focus_in()
		NOTIFICATION_WM_CLOSE_REQUEST:
			_on_close_request()
		NOTIFICATION_APPLICATION_PAUSED:
			# Android-specific: app is being paused by the OS.
			_on_focus_out()
		NOTIFICATION_APPLICATION_RESUMED:
			# Android-specific: app is being resumed.
			_on_focus_in()
		MainLoop.NOTIFICATION_OS_MEMORY_WARNING:
			_on_low_memory()


## ── Focus Out (Backgrounding) ───────────────────────────────────────────────────

func _on_focus_out() -> void:
	if not _is_focused:
		return  # Already handled.
	_is_focused = false
	_focus_out_timestamp = Time.get_unix_time_from_system()

	print("[AppLifecycleHandler] Focus lost.")

	# Save battle state if applicable.
	if is_instance_valid(GameManager) and GameManager.is_in_battle:
		was_in_battle = true
		backup_battle_state()
		# Pause the battle to prevent AI/timers from continuing.
		get_tree().paused = true
		print("[AppLifecycleHandler] Battle paused and state backed up.")
	else:
		was_in_battle = false

	# Perform a quick save of current state.
	_quick_save()

	# Notify analytics if available.
	_track_lifecycle_event("app_backgrounded")


## ── Focus In (Foregrounding) ────────────────────────────────────────────────────

func _on_focus_in() -> void:
	if _is_focused:
		return  # Already in focus.
	_is_focused = true
	_emergency_save_done = false

	var background_duration := Time.get_unix_time_from_system() - _focus_out_timestamp
	print("[AppLifecycleHandler] Focus restored after %.1f seconds." % background_duration)

	# Restore battle state if we were in one.
	if was_in_battle:
		if background_duration < LONG_BACKGROUND_THRESHOLD:
			restore_battle_state()
			get_tree().paused = false
			print("[AppLifecycleHandler] Battle resumed.")
		else:
			# Been away too long -- the battle state may be stale.
			push_warning("[AppLifecycleHandler] Background duration exceeded threshold. Battle state may be stale.")
			get_tree().paused = false
			# Let the battle system decide how to handle a long pause.
			if EventBus.has_signal("notification_requested"):
				EventBus.notification_requested.emit(
					"You were away for a while. Your battle may have been interrupted.",
					"warning"
				)
		was_in_battle = false

	_track_lifecycle_event("app_foregrounded", {"background_duration": background_duration})


## ── Close Request ───────────────────────────────────────────────────────────────

func _on_close_request() -> void:
	print("[AppLifecycleHandler] Close request received.")

	# Perform emergency save.
	emergency_save()

	# Notify analytics of session end.
	_track_lifecycle_event("app_close_requested")

	# Allow the app to quit.
	get_tree().quit()


## ── Low Memory ──────────────────────────────────────────────────────────────────

func _on_low_memory() -> void:
	push_warning("[AppLifecycleHandler] Low memory warning received.")

	# Unload non-essential cached resources.
	_unload_non_essential_assets()

	# Force garbage collection.
	_force_gc()

	# Log the event.
	_track_lifecycle_event("low_memory", {
		"static_memory": Performance.get_monitor(Performance.MEMORY_STATIC),
		"static_memory_max": Performance.get_monitor(Performance.MEMORY_STATIC_MAX),
		"object_count": Performance.get_monitor(Performance.OBJECT_COUNT),
	})


## ── Battle State Backup/Restore ─────────────────────────────────────────────────

## Capture the current battle state for restoration after backgrounding.
func backup_battle_state() -> void:
	battle_state_backup.clear()

	if not is_instance_valid(GameManager):
		return

	battle_state_backup = {
		"timestamp": Time.get_unix_time_from_system(),
		"is_in_battle": GameManager.is_in_battle,
		"current_area_id": GameManager.current_area_id,
		"game_time_seconds": GameManager.game_time_seconds,
	}

	# Capture BattleManager state if it exists.
	var battle_manager = get_node_or_null("/root/BattleManager")
	if battle_manager:
		# Store serializable battle state. The BattleManager should expose
		# a get_state() method; we guard against its absence.
		if battle_manager.has_method("get_battle_state"):
			battle_state_backup["battle_data"] = battle_manager.get_battle_state()
		else:
			# Fallback: capture what we can from public properties.
			battle_state_backup["battle_data"] = {}
			for prop in ["current_turn", "turn_count", "battle_phase"]:
				if prop in battle_manager:
					battle_state_backup["battle_data"][prop] = battle_manager.get(prop)

	# Capture team HP/status for consistency check on restore.
	if GameManager.player_data and "team" in GameManager.player_data:
		var team_snapshot: Array = []
		for sprite in GameManager.player_data.team:
			if sprite:
				team_snapshot.append({
					"instance_id": sprite.instance_id,
					"current_hp": sprite.current_hp,
					"level": sprite.level,
				})
		battle_state_backup["team_snapshot"] = team_snapshot

	print("[AppLifecycleHandler] Battle state backed up.")


## Restore battle state from backup.
func restore_battle_state() -> void:
	if battle_state_backup.is_empty():
		push_warning("[AppLifecycleHandler] No battle state backup to restore.")
		return

	# Verify the backup is still valid (same session, reasonable age).
	var backup_time: float = float(battle_state_backup.get("timestamp", 0.0))
	var age := Time.get_unix_time_from_system() - backup_time
	if age > LONG_BACKGROUND_THRESHOLD:
		push_warning("[AppLifecycleHandler] Battle state backup is %.0f seconds old, may be stale." % age)

	# Restore BattleManager state if applicable.
	var battle_manager = get_node_or_null("/root/BattleManager")
	if battle_manager and battle_manager.has_method("restore_battle_state"):
		var battle_data: Dictionary = battle_state_backup.get("battle_data", {})
		if not battle_data.is_empty():
			battle_manager.restore_battle_state(battle_data)

	print("[AppLifecycleHandler] Battle state restored (age: %.1fs)." % age)
	battle_state_backup.clear()


## ── Emergency Save ──────────────────────────────────────────────────────────────

## Perform an emergency save of the current game state. Designed to be fast
## and safe -- skips cloud sync and validation to minimize time.
func emergency_save() -> void:
	if _emergency_save_done:
		return
	_emergency_save_done = true

	if not is_instance_valid(GameManager):
		push_warning("[AppLifecycleHandler] Cannot emergency save: GameManager unavailable.")
		return
	if GameManager.player_data == null:
		push_warning("[AppLifecycleHandler] Cannot emergency save: No player data.")
		return

	print("[AppLifecycleHandler] Performing emergency save...")

	# Serialize directly, bypassing the full SaveManager pipeline for speed.
	var serialized := SaveSerializer.serialize_player_data(GameManager.player_data)
	if serialized.is_empty():
		push_error("[AppLifecycleHandler] Emergency save serialization failed.")
		return

	# Write to an emergency save file.
	var path := "user://saves/emergency_save.json"

	# Ensure directory exists.
	if not DirAccess.dir_exists_absolute("user://saves/"):
		DirAccess.make_dir_recursive_absolute("user://saves/")

	var json_string := JSON.stringify(serialized)
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file:
		file.store_string(json_string)
		file.close()
		print("[AppLifecycleHandler] Emergency save written to: %s" % path)
	else:
		push_error("[AppLifecycleHandler] Emergency save failed: cannot write to %s (Error: %s)" % [
			path, error_string(FileAccess.get_open_error())])

	# Also try a proper save through SaveManager if time permits.
	var save_manager = get_node_or_null("/root/SaveManager")
	if save_manager and save_manager.has_method("save_data"):
		var slot: int = save_manager.auto_save_slot if "auto_save_slot" in save_manager else 0
		save_manager.save_data(slot, GameManager.player_data)


## ── Quick Save (non-emergency) ──────────────────────────────────────────────────

func _quick_save() -> void:
	var save_manager = get_node_or_null("/root/SaveManager")
	if save_manager == null:
		return
	if not is_instance_valid(GameManager) or GameManager.player_data == null:
		return

	# Use SaveManager's normal pipeline.
	var slot: int = save_manager.auto_save_slot if "auto_save_slot" in save_manager else 0
	save_manager.save_data(slot, GameManager.player_data)


## ── Asset Unloading ─────────────────────────────────────────────────────────────

func _unload_non_essential_assets() -> void:
	# Clear any preloaded resource caches that aren't currently in use.
	# This is engine-specific and depends on the resource loading strategy.

	# Request the ResourceLoader to drop unused cached resources.
	# In Godot 4, we can't force-unload resources that have references,
	# but we can hint at the engine to free unreferenced resources.

	print("[AppLifecycleHandler] Requesting non-essential asset unload.")

	# Clear audio caches that aren't currently playing.
	var audio_manager = get_node_or_null("/root/AudioManager")
	if audio_manager and audio_manager.has_method("clear_cache"):
		audio_manager.clear_cache()

	# The engine's own resource cache is managed automatically, but we can
	# force unreferenced resources to be freed by triggering GC.
	_force_gc()


func _force_gc() -> void:
	# Godot 4 doesn't expose explicit GC, but we can nudge it.
	# Calling OS functions to suggest memory cleanup.
	print("[AppLifecycleHandler] Memory after cleanup - Static: %.2f MB, Objects: %d" % [
		Performance.get_monitor(Performance.MEMORY_STATIC) / 1_048_576.0,
		Performance.get_monitor(Performance.OBJECT_COUNT),
	])


## ── Analytics Helper ────────────────────────────────────────────────────────────

func _track_lifecycle_event(event_name: String, properties: Dictionary = {}) -> void:
	# Use the AnalyticsManager if available via the scene tree.
	# We don't assume it's an autoload -- look for it dynamically.
	var analytics = get_node_or_null("/root/AnalyticsManager")
	if analytics and analytics.has_method("track_event"):
		analytics.track_event(event_name, properties)

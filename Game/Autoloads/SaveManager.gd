## SaveManager -- Offline-first save system autoload for Sprite Wars.
## [P12-006] Manages local save slots with JSON serialization, SHA-256 checksums,
## auto-save timer, schema validation, migration, and cloud sync queuing.
extends Node


## ── Configuration ────────────────────────────────────────────────────────────────

const SAVE_DIR: String = "user://saves/"
const MAX_SLOTS: int = 3
const SAVE_FILE_PREFIX: String = "save_slot_"
const SAVE_FILE_EXT: String = ".json"
const CHECKSUM_FILE_EXT: String = ".sha256"
const BACKUP_FILE_EXT: String = ".bak"

## Auto-save interval in seconds (default: 5 minutes).
@export var auto_save_interval: float = 300.0

## The slot used for auto-save (defaults to the last manually-saved slot).
var auto_save_slot: int = 0


## ── State ────────────────────────────────────────────────────────────────────────

var auto_save_timer: float = 0.0
var cloud_sync_queue: Array[Dictionary] = []
var is_cloud_available: bool = false
var _is_saving: bool = false
var _last_save_slot: int = -1


## ── Lifecycle ────────────────────────────────────────────────────────────────────

func _ready() -> void:
	_ensure_save_directory()
	# Connect to EventBus save signals if available.
	if EventBus.has_signal("save_requested"):
		EventBus.save_requested.connect(_on_save_requested)
	print("[SaveManager] Initialized. Save directory: %s" % SAVE_DIR)


func _process(delta: float) -> void:
	# Auto-save timer.
	if auto_save_interval > 0.0 and auto_save_slot >= 0:
		auto_save_timer += delta
		if auto_save_timer >= auto_save_interval:
			auto_save_timer = 0.0
			_auto_save()


## ── Public API ───────────────────────────────────────────────────────────────────

## Save player data to the given slot. Returns true on success.
func save_data(slot: int, player_data: Resource) -> bool:
	if not _is_valid_slot(slot):
		push_error("[SaveManager] Invalid save slot: %d" % slot)
		return false

	if _is_saving:
		push_warning("[SaveManager] Save already in progress, skipping.")
		return false

	_is_saving = true
	var success := false

	# Step 1: Serialize player data.
	var serialized := SaveSerializer.serialize_player_data(player_data)
	if serialized.is_empty():
		push_error("[SaveManager] Serialization produced empty data.")
		_is_saving = false
		return false

	# Step 2: Validate the serialized data against schema.
	var validation := SaveSchema.validate_save(serialized)
	if not validation["valid"]:
		push_error("[SaveManager] Serialized data failed validation:")
		for err in validation["errors"]:
			push_error("  - %s" % err)
		_is_saving = false
		return false

	# Step 3: Run tamper detection on our own output (sanity check).
	var tamper_warnings := SaveSecurity.detect_tampering(serialized)
	if not tamper_warnings.is_empty():
		push_warning("[SaveManager] Tamper detection flagged serialized data:")
		for warning in tamper_warnings:
			push_warning("  - %s" % warning)

	# Step 4: Generate integrity hash and embed it.
	var integrity_hash := SaveSecurity.generate_integrity_hash(serialized)
	serialized[SaveSecurity.INTEGRITY_HASH_KEY] = integrity_hash

	# Step 5: Write to local file.
	success = _write_local(slot, serialized)
	if not success:
		push_error("[SaveManager] Failed to write save file for slot %d." % slot)
		_is_saving = false
		return false

	# Step 6: Generate and write checksum.
	var checksum := _generate_checksum(serialized)
	_write_checksum(slot, checksum)

	# Step 7: Queue cloud sync.
	if is_cloud_available:
		_queue_cloud_sync(slot, serialized)

	_last_save_slot = slot
	auto_save_slot = slot
	_is_saving = false

	print("[SaveManager] Save completed for slot %d." % slot)
	return true


## Load player data from the given slot. Returns the PlayerData resource, or null
## on failure.
func load_save(slot: int) -> Resource:
	if not _is_valid_slot(slot):
		push_error("[SaveManager] Invalid save slot: %d" % slot)
		return null

	# Step 1: Read local file.
	var data := _read_local(slot)
	if data.is_empty():
		push_warning("[SaveManager] No save data found for slot %d." % slot)
		return null

	# Step 2: Validate checksum.
	var stored_checksum := _read_checksum(slot)
	if not stored_checksum.is_empty():
		if not _validate_checksum(data, stored_checksum):
			push_error("[SaveManager] Checksum mismatch for slot %d! Save may be corrupted." % slot)
			# Attempt to load backup.
			var backup_data := _read_backup(slot)
			if not backup_data.is_empty():
				push_warning("[SaveManager] Loading backup for slot %d." % slot)
				data = backup_data
			else:
				push_error("[SaveManager] No backup available. Proceeding with potentially corrupted data.")

	# Step 3: Verify integrity hash.
	var stored_hash: String = data.get(SaveSecurity.INTEGRITY_HASH_KEY, "")
	if not stored_hash.is_empty():
		if not SaveSecurity.verify_integrity(data, stored_hash):
			push_error("[SaveManager] Integrity hash mismatch for slot %d! Save may be tampered." % slot)
			var tamper_flags := SaveSecurity.detect_tampering(data)
			for flag in tamper_flags:
				push_error("[SaveManager] Tamper: %s" % flag)

	# Step 4: Validate schema.
	var validation := SaveSchema.validate_save(data)
	if not validation["valid"]:
		push_warning("[SaveManager] Save data for slot %d has validation errors:" % slot)
		for err in validation["errors"]:
			push_warning("  - %s" % err)

	# Step 5: Migrate if old version.
	var save_version: int = int(data.get("schema_version", 1))
	if save_version < SaveSchema.SCHEMA_VERSION:
		print("[SaveManager] Migrating save from v%d to v%d." % [save_version, SaveSchema.SCHEMA_VERSION])
		data = SaveSchema.migrate_save(data, save_version)

	# Step 6: Deserialize to PlayerData.
	var player_data := SaveSerializer.deserialize_player_data(data)
	if player_data == null:
		push_error("[SaveManager] Deserialization failed for slot %d." % slot)
		return null

	_last_save_slot = slot
	auto_save_slot = slot
	print("[SaveManager] Load completed for slot %d." % slot)
	return player_data


## Delete a save slot (file + checksum + backup). Returns true on success.
func delete_save(slot: int) -> bool:
	if not _is_valid_slot(slot):
		push_error("[SaveManager] Invalid save slot: %d" % slot)
		return false

	var deleted_any := false
	var paths := [
		_get_save_path(slot),
		_get_checksum_path(slot),
		_get_backup_path(slot),
	]

	for path in paths:
		if FileAccess.file_exists(path):
			var err := DirAccess.remove_absolute(path)
			if err == OK:
				deleted_any = true
			else:
				push_error("[SaveManager] Failed to delete: %s (%s)" % [path, error_string(err)])

	if deleted_any:
		print("[SaveManager] Deleted save slot %d." % slot)
	return deleted_any


## Get metadata about a specific save slot without fully loading it.
func get_save_info(slot: int) -> Dictionary:
	var info := {
		"slot": slot,
		"exists": false,
		"timestamp": 0.0,
		"playtime": 0.0,
		"player_name": "",
		"team_preview": [],
		"progress_pct": 0.0,
	}

	if not _is_valid_slot(slot):
		return info

	var data := _read_local(slot)
	if data.is_empty():
		return info

	info["exists"] = true
	info["timestamp"] = float(data.get("save_timestamp", 0.0))
	info["playtime"] = float(data.get("play_time_seconds", 0.0))
	info["player_name"] = str(data.get("player_name", ""))

	# Team preview: extract lightweight info for UI display.
	var team: Array = data.get("team", [])
	var team_preview: Array = []
	for sprite_dict in team:
		if sprite_dict is Dictionary:
			team_preview.append({
				"form_id": int(sprite_dict.get("form_id", 0)),
				"level": int(sprite_dict.get("level", 1)),
				"nickname": str(sprite_dict.get("nickname", "")),
			})
	info["team_preview"] = team_preview

	# Progress percentage: rough estimate based on temples, quests, and registry.
	info["progress_pct"] = _calculate_progress(data)

	return info


## Get info for all save slots.
func get_all_save_info() -> Array[Dictionary]:
	var all_info: Array[Dictionary] = []
	for slot in MAX_SLOTS:
		all_info.append(get_save_info(slot))
	return all_info


## ── File I/O ─────────────────────────────────────────────────────────────────────

## Write serialized save data as JSON to the local filesystem.
func _write_local(slot: int, data: Dictionary) -> bool:
	var path := _get_save_path(slot)

	# Create backup of existing save first.
	if FileAccess.file_exists(path):
		var backup_path := _get_backup_path(slot)
		var existing := FileAccess.open(path, FileAccess.READ)
		if existing:
			var content := existing.get_as_text()
			existing.close()
			var backup := FileAccess.open(backup_path, FileAccess.WRITE)
			if backup:
				backup.store_string(content)
				backup.close()

	# Write the new save.
	var json_string := JSON.stringify(data, "\t")
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		push_error("[SaveManager] Cannot open file for writing: %s (Error: %s)" % [
			path, error_string(FileAccess.get_open_error())])
		return false

	file.store_string(json_string)
	file.close()
	return true


## Read a save file and parse it as a Dictionary. Returns empty dict on failure.
func _read_local(slot: int) -> Dictionary:
	var path := _get_save_path(slot)
	if not FileAccess.file_exists(path):
		return {}

	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("[SaveManager] Cannot open file for reading: %s (Error: %s)" % [
			path, error_string(FileAccess.get_open_error())])
		return {}

	var json_string := file.get_as_text()
	file.close()

	if json_string.is_empty():
		push_warning("[SaveManager] Save file is empty: %s" % path)
		return {}

	var json := JSON.new()
	var parse_err := json.parse(json_string)
	if parse_err != OK:
		push_error("[SaveManager] JSON parse error in %s (line %d): %s" % [
			path, json.get_error_line(), json.get_error_message()])
		return {}

	var result = json.data
	if not result is Dictionary:
		push_error("[SaveManager] Save file root is not a Dictionary: %s" % path)
		return {}

	return result


## Read backup file for a slot. Returns empty dict if not found.
func _read_backup(slot: int) -> Dictionary:
	var path := _get_backup_path(slot)
	if not FileAccess.file_exists(path):
		return {}

	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return {}

	var json_string := file.get_as_text()
	file.close()

	var json := JSON.new()
	if json.parse(json_string) != OK:
		return {}

	var result = json.data
	return result if result is Dictionary else {}


## ── Checksum ─────────────────────────────────────────────────────────────────────

## Generate a SHA-256 checksum of the serialized save data.
func _generate_checksum(data: Dictionary) -> String:
	var json_string := JSON.stringify(data, "", false)
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(json_string.to_utf8_buffer())
	var digest: PackedByteArray = ctx.finish()
	return digest.hex_encode()


## Validate a checksum against the save data.
func _validate_checksum(data: Dictionary, checksum: String) -> bool:
	var computed := _generate_checksum(data)
	# Constant-time comparison.
	if computed.length() != checksum.length():
		return false
	var result: int = 0
	for i in computed.length():
		result |= computed.unicode_at(i) ^ checksum.unicode_at(i)
	return result == 0


## Write checksum to its own file.
func _write_checksum(slot: int, checksum: String) -> void:
	var path := _get_checksum_path(slot)
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file:
		file.store_string(checksum)
		file.close()


## Read checksum from file.
func _read_checksum(slot: int) -> String:
	var path := _get_checksum_path(slot)
	if not FileAccess.file_exists(path):
		return ""
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return ""
	var checksum := file.get_as_text().strip_edges()
	file.close()
	return checksum


## ── Cloud Sync ───────────────────────────────────────────────────────────────────

func _queue_cloud_sync(slot: int, data: Dictionary) -> void:
	cloud_sync_queue.append({
		"slot": slot,
		"data": data,
		"queued_at": Time.get_unix_time_from_system(),
	})
	print("[SaveManager] Queued cloud sync for slot %d (queue size: %d)." % [
		slot, cloud_sync_queue.size()])


## ── Auto-Save ────────────────────────────────────────────────────────────────────

func _auto_save() -> void:
	if not is_instance_valid(GameManager):
		return
	if GameManager.player_data == null:
		return
	if GameManager.is_in_battle:
		# Don't auto-save during battle to avoid inconsistent state.
		return

	print("[SaveManager] Auto-save triggered for slot %d." % auto_save_slot)
	var success := save_data(auto_save_slot, GameManager.player_data)
	EventBus.save_completed.emit(success)


func _on_save_requested() -> void:
	# Default to last-used slot or slot 0.
	var slot := _last_save_slot if _last_save_slot >= 0 else 0
	if is_instance_valid(GameManager) and GameManager.player_data != null:
		save_data(slot, GameManager.player_data)


## ── Path Helpers ─────────────────────────────────────────────────────────────────

func _get_save_path(slot: int) -> String:
	return SAVE_DIR + SAVE_FILE_PREFIX + str(slot) + SAVE_FILE_EXT


func _get_checksum_path(slot: int) -> String:
	return SAVE_DIR + SAVE_FILE_PREFIX + str(slot) + CHECKSUM_FILE_EXT


func _get_backup_path(slot: int) -> String:
	return SAVE_DIR + SAVE_FILE_PREFIX + str(slot) + BACKUP_FILE_EXT


func _is_valid_slot(slot: int) -> bool:
	return slot >= 0 and slot < MAX_SLOTS


func _ensure_save_directory() -> void:
	if not DirAccess.dir_exists_absolute(SAVE_DIR):
		var err := DirAccess.make_dir_recursive_absolute(SAVE_DIR)
		if err != OK:
			push_error("[SaveManager] Failed to create save directory: %s (%s)" % [
				SAVE_DIR, error_string(err)])
		else:
			print("[SaveManager] Created save directory: %s" % SAVE_DIR)


## ── Progress Calculation ─────────────────────────────────────────────────────────

func _calculate_progress(data: Dictionary) -> float:
	var total_points: float = 0.0
	var earned_points: float = 0.0

	# Temples: 30 total, each worth 2 points = 60 points.
	var completed_temples: Array = data.get("completed_temple_ids", [])
	total_points += 60.0
	earned_points += float(mini(completed_temples.size(), 30)) * 2.0

	# Sprite registry: 72 forms, each caught = 1 point = 72 points.
	var registry: Dictionary = data.get("sprite_registry", {})
	total_points += 72.0
	for key in registry:
		if registry[key] == "caught":
			earned_points += 1.0

	# Quests completed: estimate 50 total, each 1 point = 50 points.
	var completed_quests: Array = data.get("completed_quest_ids", [])
	total_points += 50.0
	earned_points += float(mini(completed_quests.size(), 50))

	if total_points <= 0.0:
		return 0.0
	return clampf(earned_points / total_points * 100.0, 0.0, 100.0)

## SaveSchema -- Canonical save data structure and migration logic for Sprite Wars.
## [P12-001] Defines the complete save schema, empty-save factory, validation,
## and forward-compatible migration from older schema versions.
class_name SaveSchema
extends RefCounted


## ── Schema Version ──────────────────────────────────────────────────────────────
## Increment this whenever the save format changes. Migration functions below must
## handle every previous version up to SCHEMA_VERSION - 1.
const SCHEMA_VERSION: int = 1


## ── Required Top-Level Keys ─────────────────────────────────────────────────────
## Used by validate_save() to verify structural completeness.
const REQUIRED_KEYS: PackedStringArray = PackedStringArray([
	"schema_version",
	"save_timestamp",
	"play_time_seconds",
	"player_name",
	"currency",
	"team",
	"storage",
	"inventory",
	"equipment_inventory",
	"active_quests",
	"completed_quest_ids",
	"completed_temple_ids",
	"sprite_registry",
	"unlocked_composition_bonuses",
	"current_area_id",
	"settings",
])


## ── Stat / Slot Constants (mirrors Core scripts) ────────────────────────────────
const STAT_KEYS := ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]

const EQUIPMENT_SLOTS: PackedStringArray = PackedStringArray([
	"weapon", "helmet", "chest", "legs", "boots",
	"gloves", "ring", "amulet", "crystal",
])

const MAX_TEAM_SIZE: int = 6
const MAX_STORAGE_SIZE: int = 500
const MAX_LEVEL: int = 100
const MAX_IV: int = 31
const MAX_FORM_ID: int = 72
const MAX_EQUIPPED_ABILITIES: int = 4
const MAX_CURRENCY: int = 999_999_999


## ── Factory ─────────────────────────────────────────────────────────────────────

## Create a blank, valid save dictionary suitable for a brand-new player.
static func create_empty_save() -> Dictionary:
	return {
		"schema_version": SCHEMA_VERSION,
		"save_timestamp": Time.get_unix_time_from_system(),
		"play_time_seconds": 0.0,
		"player_name": "",
		"currency": 0,
		"team": [],            # Array of serialized SpriteInstance dicts
		"storage": [],         # Array of serialized SpriteInstance dicts
		"inventory": {},       # {item_id_string: count}
		"equipment_inventory": [],  # Array of serialized EquipmentData dicts
		"active_quests": [],        # Array of quest state dicts
		"completed_quest_ids": [],  # Array[int]
		"completed_temple_ids": [], # Array[int]
		"sprite_registry": {},      # {form_id_string: "seen" | "caught"}
		"unlocked_composition_bonuses": [],  # Array[int]
		"current_area_id": "starter_town",
		"settings": _default_settings(),
	}


## Default player settings sub-dictionary.
static func _default_settings() -> Dictionary:
	return {
		"music_volume": 0.8,
		"sfx_volume": 0.8,
		"language": "en",
		"auto_save_enabled": true,
		"battle_speed": 1.0,
		"show_damage_numbers": true,
		"vibration_enabled": true,
		"notifications_enabled": true,
	}


## ── Validation ──────────────────────────────────────────────────────────────────

## Validate a save dictionary. Returns {valid: bool, errors: Array[String]}.
## Does NOT mutate the input.
static func validate_save(data: Dictionary) -> Dictionary:
	var errors: Array[String] = []

	if not data is Dictionary:
		return {"valid": false, "errors": ["Save data is not a Dictionary."]}

	# --- Required keys ---
	for key in REQUIRED_KEYS:
		if not data.has(key):
			errors.append("Missing required key: '%s'." % key)

	# Early-out if structural keys are missing -- deeper checks would crash.
	if not errors.is_empty():
		return {"valid": false, "errors": errors}

	# --- Type checks ---
	_expect_type(data, "schema_version", TYPE_INT, errors)
	_expect_type(data, "save_timestamp", TYPE_FLOAT, errors)
	_expect_type(data, "play_time_seconds", TYPE_FLOAT, errors)
	_expect_type(data, "player_name", TYPE_STRING, errors)
	_expect_type(data, "currency", TYPE_INT, errors)
	_expect_type(data, "team", TYPE_ARRAY, errors)
	_expect_type(data, "storage", TYPE_ARRAY, errors)
	_expect_type(data, "inventory", TYPE_DICTIONARY, errors)
	_expect_type(data, "equipment_inventory", TYPE_ARRAY, errors)
	_expect_type(data, "active_quests", TYPE_ARRAY, errors)
	_expect_type(data, "completed_quest_ids", TYPE_ARRAY, errors)
	_expect_type(data, "completed_temple_ids", TYPE_ARRAY, errors)
	_expect_type(data, "sprite_registry", TYPE_DICTIONARY, errors)
	_expect_type(data, "unlocked_composition_bonuses", TYPE_ARRAY, errors)
	_expect_type(data, "current_area_id", TYPE_STRING, errors)
	_expect_type(data, "settings", TYPE_DICTIONARY, errors)

	# If type errors exist, deeper checks would be unsafe.
	if not errors.is_empty():
		return {"valid": false, "errors": errors}

	# --- Value-range checks ---
	if int(data["schema_version"]) < 1:
		errors.append("schema_version must be >= 1.")

	if int(data["currency"]) < 0:
		errors.append("currency must be non-negative.")
	elif int(data["currency"]) > MAX_CURRENCY:
		errors.append("currency exceeds maximum (%d)." % MAX_CURRENCY)

	if float(data["play_time_seconds"]) < 0.0:
		errors.append("play_time_seconds must be non-negative.")

	var team: Array = data["team"]
	if team.size() > MAX_TEAM_SIZE:
		errors.append("team exceeds MAX_TEAM_SIZE (%d)." % MAX_TEAM_SIZE)

	var storage: Array = data["storage"]
	if storage.size() > MAX_STORAGE_SIZE:
		errors.append("storage exceeds MAX_STORAGE_SIZE (%d)." % MAX_STORAGE_SIZE)

	# --- Validate individual sprite entries ---
	for i in team.size():
		var sprite_errors := _validate_sprite_dict(team[i], "team[%d]" % i)
		errors.append_array(sprite_errors)

	for i in storage.size():
		var sprite_errors := _validate_sprite_dict(storage[i], "storage[%d]" % i)
		errors.append_array(sprite_errors)

	# --- Validate equipment inventory ---
	for i in (data["equipment_inventory"] as Array).size():
		var equip_errors := _validate_equipment_dict(data["equipment_inventory"][i], "equipment_inventory[%d]" % i)
		errors.append_array(equip_errors)

	# --- Validate sprite registry values ---
	var registry: Dictionary = data["sprite_registry"]
	for key in registry:
		var val = registry[key]
		if val != "seen" and val != "caught":
			errors.append("sprite_registry['%s'] must be 'seen' or 'caught', got '%s'." % [str(key), str(val)])

	# --- Validate quest entries ---
	for i in (data["active_quests"] as Array).size():
		var quest_errors := _validate_quest_state_dict(data["active_quests"][i], "active_quests[%d]" % i)
		errors.append_array(quest_errors)

	return {"valid": errors.is_empty(), "errors": errors}


## ── Migration ───────────────────────────────────────────────────────────────────

## Migrate a save from from_version to SCHEMA_VERSION incrementally.
## Returns the migrated data dictionary (new copy). The original is not mutated.
static func migrate_save(data: Dictionary, from_version: int) -> Dictionary:
	var migrated := data.duplicate(true)  # deep copy

	if from_version < 1:
		push_warning("SaveSchema: Cannot migrate from version %d (minimum is 1)." % from_version)
		return migrated

	if from_version >= SCHEMA_VERSION:
		# Already current or newer (forward compat -- just return).
		return migrated

	var version := from_version

	# --- Version 1 -> 2 (placeholder for future migrations) ---
	# When SCHEMA_VERSION is bumped, add migration steps here:
	# if version == 1:
	#     migrated["new_field"] = default_value
	#     version = 2

	# After all incremental migrations, stamp the new version.
	migrated["schema_version"] = SCHEMA_VERSION
	push_warning("SaveSchema: Migrated save from v%d to v%d." % [from_version, SCHEMA_VERSION])
	return migrated


## ── Private Helpers ─────────────────────────────────────────────────────────────

static func _expect_type(data: Dictionary, key: String, expected_type: int, errors: Array[String]) -> void:
	var value = data.get(key)
	# Allow int/float interchangeability for numeric fields.
	if expected_type == TYPE_FLOAT and typeof(value) == TYPE_INT:
		return
	if expected_type == TYPE_INT and typeof(value) == TYPE_FLOAT:
		return
	if typeof(value) != expected_type:
		errors.append("'%s' expected type %s but got %s." % [
			key,
			type_string(expected_type),
			type_string(typeof(value)),
		])


static func _validate_sprite_dict(data, prefix: String) -> Array[String]:
	var errors: Array[String] = []
	if not data is Dictionary:
		errors.append("%s is not a Dictionary." % prefix)
		return errors

	var d: Dictionary = data
	var required_sprite_keys := ["instance_id", "race_id", "form_id", "level"]
	for key in required_sprite_keys:
		if not d.has(key):
			errors.append("%s missing key '%s'." % [prefix, key])

	if d.has("level"):
		var lv = d["level"]
		if lv is int or lv is float:
			if int(lv) < 1 or int(lv) > MAX_LEVEL:
				errors.append("%s level must be 1-%d." % [prefix, MAX_LEVEL])

	if d.has("form_id"):
		var fid = d["form_id"]
		if fid is int or fid is float:
			if int(fid) < 1 or int(fid) > MAX_FORM_ID:
				errors.append("%s form_id must be 1-%d." % [prefix, MAX_FORM_ID])

	if d.has("equipped_abilities") and d["equipped_abilities"] is Array:
		if (d["equipped_abilities"] as Array).size() > MAX_EQUIPPED_ABILITIES:
			errors.append("%s has more than %d equipped abilities." % [prefix, MAX_EQUIPPED_ABILITIES])

	if d.has("iv_stats") and d["iv_stats"] is Dictionary:
		var ivs: Dictionary = d["iv_stats"]
		for stat_key in STAT_KEYS:
			if ivs.has(stat_key):
				var iv_val = ivs[stat_key]
				if iv_val is int or iv_val is float:
					if int(iv_val) < 0 or int(iv_val) > MAX_IV:
						errors.append("%s iv_stats['%s'] must be 0-%d." % [prefix, stat_key, MAX_IV])

	return errors


static func _validate_equipment_dict(data, prefix: String) -> Array[String]:
	var errors: Array[String] = []
	if not data is Dictionary:
		errors.append("%s is not a Dictionary." % prefix)
		return errors

	var d: Dictionary = data
	if not d.has("equipment_id"):
		errors.append("%s missing 'equipment_id'." % prefix)
	if d.has("slot_type") and d["slot_type"] is String:
		if d["slot_type"] not in EQUIPMENT_SLOTS:
			errors.append("%s invalid slot_type '%s'." % [prefix, d["slot_type"]])

	return errors


static func _validate_quest_state_dict(data, prefix: String) -> Array[String]:
	var errors: Array[String] = []
	if not data is Dictionary:
		errors.append("%s is not a Dictionary." % prefix)
		return errors

	var d: Dictionary = data
	if not d.has("quest_id"):
		errors.append("%s missing 'quest_id'." % prefix)
	if d.has("quest_state") and d["quest_state"] is String:
		var valid_states := ["locked", "available", "active", "complete"]
		if d["quest_state"] not in valid_states:
			errors.append("%s invalid quest_state '%s'." % [prefix, d["quest_state"]])

	return errors

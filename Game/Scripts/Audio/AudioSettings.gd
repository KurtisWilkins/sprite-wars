## AudioSettings — Persistence layer for audio preferences.
## [P11-030] Saves/loads volume and mute settings to user:// config file.
class_name AudioSettings
extends RefCounted

# ==============================================================================
# Constants
# ==============================================================================

const SETTINGS_PATH: String = "user://audio_settings.cfg"
const SECTION: String = "audio"

## Default settings returned when no save file exists.
const DEFAULTS: Dictionary = {
	"music_volume": 1.0,
	"sfx_volume": 1.0,
	"ambient_volume": 1.0,
	"voice_volume": 1.0,
	"music_muted": false,
	"sfx_muted": false,
}

# ==============================================================================
# Instance State (for non-static usage)
# ==============================================================================

var settings: Dictionary = DEFAULTS.duplicate()

# ==============================================================================
# Save / Load
# ==============================================================================

## Save audio settings to the config file.
## [param p_settings] Dictionary with keys matching DEFAULTS.
static func save_settings(p_settings: Dictionary) -> void:
	var config := ConfigFile.new()

	for key: String in DEFAULTS:
		var value: Variant = p_settings.get(key, DEFAULTS[key])
		config.set_value(SECTION, key, value)

	var err := config.save(SETTINGS_PATH)
	if err != OK:
		push_error("AudioSettings: Failed to save — error code %d" % err)


## Load audio settings from the config file.
## Returns a Dictionary with all keys present (missing keys filled from DEFAULTS).
static func load_settings() -> Dictionary:
	var config := ConfigFile.new()
	var err := config.load(SETTINGS_PATH)

	var result := DEFAULTS.duplicate()
	if err != OK:
		# File does not exist or is corrupt — return defaults.
		return result

	for key: String in DEFAULTS:
		if config.has_section_key(SECTION, key):
			result[key] = config.get_value(SECTION, key, DEFAULTS[key])

	return result


## Apply a settings dictionary to the AudioManager autoload.
## Call this after loading settings or after the user changes a slider.
static func apply_settings(p_settings: Dictionary) -> void:
	var audio_mgr := _get_audio_manager()
	if not audio_mgr:
		push_warning("AudioSettings: AudioManager not found — settings not applied.")
		return

	# Volume
	audio_mgr.set_music_volume(p_settings.get("music_volume", DEFAULTS["music_volume"]))
	audio_mgr.set_sfx_volume(p_settings.get("sfx_volume", DEFAULTS["sfx_volume"]))
	audio_mgr.set_ambient_volume(p_settings.get("ambient_volume", DEFAULTS["ambient_volume"]))
	audio_mgr.set_voice_volume(p_settings.get("voice_volume", DEFAULTS["voice_volume"]))

	# Mute state — only toggle if the current state doesn't match the desired state.
	var music_muted: bool = p_settings.get("music_muted", DEFAULTS["music_muted"])
	if audio_mgr.music_muted != music_muted:
		audio_mgr.toggle_music_mute()

	var sfx_muted: bool = p_settings.get("sfx_muted", DEFAULTS["sfx_muted"])
	if audio_mgr.sfx_muted != sfx_muted:
		audio_mgr.toggle_sfx_mute()

# ==============================================================================
# Convenience
# ==============================================================================

## Load settings from disk and immediately apply them to AudioManager.
## Intended to be called once during game initialization.
static func initialize() -> void:
	var loaded := load_settings()
	apply_settings(loaded)


## Read the current AudioManager state back into a settings dictionary.
## Useful for populating a settings UI with current values.
static func read_current() -> Dictionary:
	var audio_mgr := _get_audio_manager()
	if not audio_mgr:
		return DEFAULTS.duplicate()

	return {
		"music_volume": audio_mgr.music_volume,
		"sfx_volume": audio_mgr.sfx_volume,
		"ambient_volume": audio_mgr.ambient_volume,
		"voice_volume": audio_mgr.voice_volume,
		"music_muted": audio_mgr.music_muted,
		"sfx_muted": audio_mgr.sfx_muted,
	}


## Update a single setting, apply it, and persist to disk.
## [param key] One of the DEFAULTS keys (e.g. "music_volume").
## [param value] The new value.
static func update_setting(key: String, value: Variant) -> void:
	if not DEFAULTS.has(key):
		push_warning("AudioSettings: Unknown setting key '%s'" % key)
		return

	var current := load_settings()
	current[key] = value
	apply_settings(current)
	save_settings(current)

# ==============================================================================
# Internal
# ==============================================================================

## Safely retrieve the AudioManager autoload node.
static func _get_audio_manager() -> Node:
	var tree := Engine.get_main_loop() as SceneTree
	if not tree:
		return null
	return tree.root.get_node_or_null("AudioManager")

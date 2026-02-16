## GameBootstrap — First autoload that runs to initialize all game systems in order.
## Ensures proper initialization sequence and validates game data on debug builds.
extends Node

const VERSION := "0.1.0"
const BUILD_DATE := "2026-02-16"

var initialization_complete: bool = false
var initialization_errors: Array[String] = []

func _ready() -> void:
	print("[GameBootstrap] Sprite Wars v%s (%s) starting..." % [VERSION, BUILD_DATE])
	_initialize_systems()

func _initialize_systems() -> void:
	# Step 1: Data is loaded by DataLoader autoload (runs before us if ordered properly)
	print("[GameBootstrap] Step 1/5: Verifying data loaded...")
	await get_tree().process_frame  # Allow DataLoader._ready() to complete

	# Step 2: Validate game data (debug builds only)
	if OS.is_debug_build():
		print("[GameBootstrap] Step 2/5: Validating game data...")
		var errors := DataLoader.validate_all()
		if not errors.is_empty():
			initialization_errors = errors
			push_warning("[GameBootstrap] Data validation found %d issues:" % errors.size())
			for i in range(mini(10, errors.size())):
				push_warning("  - %s" % errors[i])
			if errors.size() > 10:
				push_warning("  ... and %d more" % (errors.size() - 10))
	else:
		print("[GameBootstrap] Step 2/5: Skipping validation (release build)")

	# Step 3: Initialize audio system
	print("[GameBootstrap] Step 3/5: Initializing audio...")
	AudioManager.call_deferred("_apply_saved_settings")

	# Step 4: Load saved settings
	print("[GameBootstrap] Step 4/5: Loading settings...")
	_load_user_settings()

	# Step 5: Check for existing save data
	print("[GameBootstrap] Step 5/5: Checking save data...")
	_check_save_data()

	initialization_complete = true
	print("[GameBootstrap] Initialization complete. %d data warnings." % initialization_errors.size())

func _load_user_settings() -> void:
	var config := ConfigFile.new()
	var err := config.load("user://settings.cfg")
	if err != OK:
		# First launch — use defaults
		return

	# Audio settings
	var master_vol: float = config.get_value("audio", "master_volume", 1.0)
	var music_vol: float = config.get_value("audio", "music_volume", 0.8)
	var sfx_vol: float = config.get_value("audio", "sfx_volume", 1.0)
	AudioManager.set_master_volume(master_vol)
	AudioManager.set_music_volume(music_vol)
	AudioManager.set_sfx_volume(sfx_vol)

	# Display settings
	var battle_speed: int = config.get_value("gameplay", "battle_speed", 1)
	var auto_save: bool = config.get_value("gameplay", "auto_save", true)

func _check_save_data() -> void:
	var has_saves := false
	for slot in range(1, 4):
		var path := "user://save_slot_%d.dat" % slot
		if FileAccess.file_exists(path):
			has_saves = true
			break
	if has_saves:
		print("[GameBootstrap] Existing save data found.")
	else:
		print("[GameBootstrap] No save data — new player.")

func save_user_settings() -> void:
	var config := ConfigFile.new()
	config.set_value("audio", "master_volume", AudioManager.master_volume if "master_volume" in AudioManager else 1.0)
	config.set_value("audio", "music_volume", AudioManager.music_volume if "music_volume" in AudioManager else 0.8)
	config.set_value("audio", "sfx_volume", AudioManager.sfx_volume if "sfx_volume" in AudioManager else 1.0)
	config.save("user://settings.cfg")

## RegionAmbientSystem — Manages region-specific music and ambient audio transitions.
## [P11-026] Listens for area_entered signals and crossfades music/ambient layers accordingly.
extends Node

# ==============================================================================
# Data
# ==============================================================================

## Maps area_id → audio configuration.
## Each entry: { "music": String, "ambient": String, "weather_sfx": String }
## Music/ambient values are context keys understood by AudioManager (e.g. "battle", "town").
var region_audio_map: Dictionary = {
	# Towns & Safe Zones
	"starter_town": {"music": "town", "ambient": "Amb_Town", "weather_sfx": ""},
	"port_town": {"music": "town", "ambient": "Amb_Town_Harbor", "weather_sfx": ""},
	"trading_post": {"music": "shop", "ambient": "Amb_Town", "weather_sfx": ""},
	"sanctuary": {"music": "lullaby", "ambient": "Amb_Sanctuary", "weather_sfx": ""},

	# Wilderness / Overworld
	"forest_path": {"music": "forest", "ambient": "Amb_Forest_Wind", "weather_sfx": ""},
	"deep_forest": {"music": "forest", "ambient": "Amb_Forest_Dense", "weather_sfx": ""},
	"mountain_pass": {"music": "overworld", "ambient": "Amb_Mountain_Wind", "weather_sfx": ""},
	"plains": {"music": "overworld", "ambient": "Amb_Plains", "weather_sfx": ""},
	"desert": {"music": "overworld", "ambient": "Amb_Desert_Wind", "weather_sfx": ""},
	"swamp": {"music": "forest", "ambient": "Amb_Swamp", "weather_sfx": ""},
	"beach": {"music": "ship", "ambient": "Amb_Beach_Waves", "weather_sfx": ""},
	"volcanic_ridge": {"music": "dungeon", "ambient": "Amb_Lava_Rumble", "weather_sfx": ""},

	# Caves & Dungeons
	"cave_entrance": {"music": "cave", "ambient": "Amb_Cave_Drip", "weather_sfx": ""},
	"crystal_cave": {"music": "cave", "ambient": "Amb_Cave_Crystal", "weather_sfx": ""},
	"dungeon_floor": {"music": "dungeon", "ambient": "Amb_Dungeon", "weather_sfx": ""},
	"dungeon_boss_room": {"music": "boss", "ambient": "", "weather_sfx": ""},

	# Temples
	"temple_entrance": {"music": "dungeon", "ambient": "Amb_Temple_Echo", "weather_sfx": ""},
	"temple_interior": {"music": "dungeon", "ambient": "Amb_Temple_Echo", "weather_sfx": ""},
	"temple_boss": {"music": "boss", "ambient": "", "weather_sfx": ""},

	# Special Areas
	"title_screen": {"music": "title", "ambient": "", "weather_sfx": ""},
	"world_map": {"music": "map", "ambient": "", "weather_sfx": ""},
	"shop_interior": {"music": "shop", "ambient": "Amb_Shop", "weather_sfx": ""},
	"training_grounds": {"music": "training", "ambient": "Amb_Training", "weather_sfx": ""},
}

## The area_id of the currently active region.
var current_region: String = ""

## Reference to the active weather SFX channel (if any).
var _weather_channel: AudioStreamPlayer = null

# ==============================================================================
# Lifecycle
# ==============================================================================

func _ready() -> void:
	_connect_to_event_bus()


func _connect_to_event_bus() -> void:
	var event_bus := get_node_or_null("/root/EventBus")
	if event_bus:
		if event_bus.has_signal("area_entered"):
			event_bus.area_entered.connect(_on_area_entered)
		if event_bus.has_signal("area_exited"):
			event_bus.area_exited.connect(_on_area_exited)
		if event_bus.has_signal("battle_started"):
			event_bus.battle_started.connect(_on_battle_started)
		if event_bus.has_signal("battle_ended"):
			event_bus.battle_ended.connect(_on_battle_ended)
		if event_bus.has_signal("shop_opened"):
			event_bus.shop_opened.connect(_on_shop_opened)

# ==============================================================================
# Public API
# ==============================================================================

## Transition all audio layers to match a new area.
## Crossfades music and blends ambient layers. Handles weather SFX start/stop.
func transition_audio(new_area_id: String) -> void:
	if new_area_id == current_region:
		return

	var old_region := current_region
	current_region = new_area_id

	var config := _get_region_config(new_area_id)
	var old_config := _get_region_config(old_region)

	# --- Music ---
	var new_music: String = config.get("music", "")
	var old_music: String = old_config.get("music", "")
	if not new_music.is_empty() and new_music != old_music:
		AudioManager.play_music(new_music, true)
	elif new_music.is_empty():
		AudioManager.stop_music(1.0)

	# --- Ambient ---
	var new_ambient: String = config.get("ambient", "")
	var old_ambient: String = old_config.get("ambient", "")
	if not new_ambient.is_empty() and new_ambient != old_ambient:
		AudioManager.play_ambient(new_ambient, true)
	elif new_ambient.is_empty() and not old_ambient.is_empty():
		AudioManager.stop_ambient(1.0)

	# --- Weather SFX ---
	var new_weather: String = config.get("weather_sfx", "")
	_update_weather_sfx(new_weather)


## Register or update the audio configuration for a region.
## [param area_id] The string identifier for the area.
## [param audio_config] Dictionary with keys: "music", "ambient", "weather_sfx".
func register_region_audio(area_id: String, audio_config: Dictionary) -> void:
	region_audio_map[area_id] = audio_config


## Batch-register multiple region audio configs.
func register_bulk(data: Dictionary) -> void:
	for area_id: String in data:
		region_audio_map[area_id] = data[area_id]


## Remove a region audio config.
func unregister_region(area_id: String) -> void:
	region_audio_map.erase(area_id)


## Get the audio config for a region. Returns an empty dict if not registered.
func get_region_config(area_id: String) -> Dictionary:
	return _get_region_config(area_id)


## Force-refresh audio for the current region (e.g., after weather change).
func refresh_current_region() -> void:
	if current_region.is_empty():
		return
	var prev := current_region
	current_region = ""
	transition_audio(prev)


## Stop all regional audio (music, ambient, weather). Used before cutscenes, etc.
func silence_all(fade_duration: float = 1.0) -> void:
	AudioManager.stop_music(fade_duration)
	AudioManager.stop_ambient(fade_duration)
	_stop_weather_sfx()

# ==============================================================================
# Signal Handlers
# ==============================================================================

func _on_area_entered(area_id: String) -> void:
	transition_audio(area_id)


func _on_area_exited(_area_id: String) -> void:
	# Audio transition is handled by the next area_entered signal.
	# Stop weather SFX immediately if leaving an area with weather.
	pass


func _on_battle_started(battle_data: Dictionary) -> void:
	# Switch to battle music. The battle system will restore region music on end.
	var is_boss: bool = battle_data.get("is_boss", false)
	var is_final_boss: bool = battle_data.get("is_final_boss", false)
	if is_final_boss:
		AudioManager.play_music("final_boss", true)
	elif is_boss:
		AudioManager.play_music("boss", true)
	else:
		AudioManager.play_music("battle", true)
	# Fade out ambient during battle.
	AudioManager.stop_ambient(0.5)
	_stop_weather_sfx()


func _on_battle_ended(result: Dictionary) -> void:
	var won: bool = result.get("won", false)
	if won:
		AudioManager.play_music("victory", false)
		# After victory fanfare, restore region audio with a delay.
		var tree := get_tree()
		if tree:
			# Wait a reasonable time for the victory fanfare, then restore.
			var timer := tree.create_timer(6.0)
			timer.timeout.connect(func() -> void:
				if current_region != "":
					var config := _get_region_config(current_region)
					var music_key: String = config.get("music", "")
					if not music_key.is_empty():
						AudioManager.play_music(music_key, true)
					_restore_ambient()
			)
	else:
		AudioManager.play_music("game_over", false)


func _on_shop_opened(_shop_id: String) -> void:
	AudioManager.play_music("shop", true)

# ==============================================================================
# Internal
# ==============================================================================

func _get_region_config(area_id: String) -> Dictionary:
	if region_audio_map.has(area_id):
		return region_audio_map[area_id]
	# Try to match a prefix (e.g., "forest_path_01" matches "forest_path").
	for key: String in region_audio_map:
		if area_id.begins_with(key):
			return region_audio_map[key]
	return {}


func _update_weather_sfx(weather_name: String) -> void:
	_stop_weather_sfx()
	if weather_name.is_empty():
		return
	# Use an SFX channel for looping weather.
	_weather_channel = AudioManager.play_sfx(weather_name)
	# Note: Weather SFX files should be set to loop in their import settings,
	# or the calling code should re-trigger on the finished signal.


func _stop_weather_sfx() -> void:
	if _weather_channel and _weather_channel.playing:
		_weather_channel.stop()
	_weather_channel = null


func _restore_ambient() -> void:
	if current_region.is_empty():
		return
	var config := _get_region_config(current_region)
	var ambient_key: String = config.get("ambient", "")
	if not ambient_key.is_empty():
		AudioManager.play_ambient(ambient_key, true)
	var weather_key: String = config.get("weather_sfx", "")
	_update_weather_sfx(weather_key)

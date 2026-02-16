## AudioManager — Global audio autoload managing music, SFX, ambient, and voice playback.
## [P11-003] Handles crossfading, intro+loop music, SFX pooling, and volume control.
extends Node

# ------------------------------------------------------------------------------
# Audio Bus Names
# ------------------------------------------------------------------------------
const MUSIC_BUS: StringName = &"Music"
const SFX_BUS: StringName = &"SFX"
const AMBIENT_BUS: StringName = &"Ambient"
const VOICE_BUS: StringName = &"Voice"

# ------------------------------------------------------------------------------
# Paths
# ------------------------------------------------------------------------------
const MUSIC_PATH: String = "res://Audio/Music/"
const SFX_PATH: String = "res://Audio/Sounds/"
const AMBIENT_PATH: String = "res://Audio/Ambient/"
const CRIES_PATH: String = "res://Audio/Cries/"

# ------------------------------------------------------------------------------
# Channel Configuration
# ------------------------------------------------------------------------------
const SFX_POOL_SIZE: int = 8

# ------------------------------------------------------------------------------
# Players
# ------------------------------------------------------------------------------
var music_player: AudioStreamPlayer
var music_intro_player: AudioStreamPlayer  ## Plays the intro portion before handing off to loop.
var ambient_player: AudioStreamPlayer
var sfx_pool: Array[AudioStreamPlayer] = []
var voice_player: AudioStreamPlayer

# ------------------------------------------------------------------------------
# Volume State (linear 0.0 – 1.0)
# ------------------------------------------------------------------------------
var music_volume: float = 1.0
var sfx_volume: float = 1.0
var ambient_volume: float = 1.0
var voice_volume: float = 1.0

# ------------------------------------------------------------------------------
# Mute State
# ------------------------------------------------------------------------------
var music_muted: bool = false
var sfx_muted: bool = false

# ------------------------------------------------------------------------------
# Playback State
# ------------------------------------------------------------------------------
var current_music_track: String = ""
var is_crossfading: bool = false
var crossfade_duration: float = 1.5

## Tracks whether we are in the intro portion of an intro+loop pair.
var _playing_intro: bool = false

# ------------------------------------------------------------------------------
# SFX Cache
# ------------------------------------------------------------------------------
var _sfx_cache: Dictionary = {}  ## {String: AudioStream}

# ------------------------------------------------------------------------------
# Music / SFX Lookup Maps
# Maps short context keys to the base filename (without extension).
# The intro+loop resolver uses the base name to find _Intro / _Loop variants.
# ------------------------------------------------------------------------------
var music_map: Dictionary = {
	"title": "Title_Screen",
	"battle": "Battle_Theme",
	"boss": "Boss_Battle",
	"final_boss": "Boss_Battle",
	"dungeon_boss": "Boss_Battle",
	"evil_gloating": "Evil_Gloating",
	"town": "Town_Theme",
	"forest": "Deep_Forest",
	"dungeon": "Time_Cave",
	"cave": "Time_Cave",
	"map": "Overworld_Theme",
	"overworld": "Overworld_Theme",
	"shop": "Town_Theme",
	"victory": "Victory_Fanfare",
	"game_over": "Game Over",
	"intro": "Title_Screen",
	"lullaby": "Lullaby",
	"sad": "Lullaby",
	"training": "Battle_Theme",
	"ship": "Overworld_Theme",
}

var sfx_map: Dictionary = {
	"hit": "Hit",
	"item_confirm": "Item Confirm",
	"item_discard": "Item Discard",
	"item_use": "Item Use",
	"menu_cancel": "Menu Cancel",
	"menu_confirm": "Menu Confirm",
	"menu_move": "Menu Move",
	"open": "Open",
	"prompt": "Prompt",
	"recover": "Recover",
	# Convenience aliases
	"click": "Menu Confirm",
	"click_heavy": "Menu Confirm",
	"close": "Menu Cancel",
	"coin": "Item Confirm",
	"confirm": "Menu Confirm",
	"deny": "Menu Cancel",
	"error": "Menu Cancel",
	"hover": "Menu Move",
	"menu_open": "Open",
	"text": "Prompt",
}

# ==============================================================================
# Lifecycle
# ==============================================================================

func _ready() -> void:
	_ensure_audio_buses()
	_create_players()
	_create_sfx_pool()
	_connect_signals()


## Build the audio bus layout programmatically so the project works even without
## a saved .tres bus layout file.
func _ensure_audio_buses() -> void:
	# Godot always has "Master" at index 0.
	for bus_name: StringName in [MUSIC_BUS, SFX_BUS, AMBIENT_BUS, VOICE_BUS]:
		if AudioServer.get_bus_index(bus_name) == -1:
			var idx := AudioServer.bus_count
			AudioServer.add_bus(idx)
			AudioServer.set_bus_name(idx, bus_name)
			AudioServer.set_bus_send(idx, &"Master")
	# Set default ambient level slightly lower.
	var ambient_idx := AudioServer.get_bus_index(AMBIENT_BUS)
	if ambient_idx != -1:
		AudioServer.set_bus_volume_db(ambient_idx, -6.0)


func _create_players() -> void:
	music_player = AudioStreamPlayer.new()
	music_player.name = "MusicPlayer"
	music_player.bus = MUSIC_BUS
	music_player.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(music_player)
	music_player.finished.connect(_on_music_finished)

	music_intro_player = AudioStreamPlayer.new()
	music_intro_player.name = "MusicIntroPlayer"
	music_intro_player.bus = MUSIC_BUS
	music_intro_player.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(music_intro_player)
	music_intro_player.finished.connect(_on_intro_finished)

	ambient_player = AudioStreamPlayer.new()
	ambient_player.name = "AmbientPlayer"
	ambient_player.bus = AMBIENT_BUS
	ambient_player.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(ambient_player)

	voice_player = AudioStreamPlayer.new()
	voice_player.name = "VoicePlayer"
	voice_player.bus = VOICE_BUS
	voice_player.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(voice_player)


func _create_sfx_pool() -> void:
	for i in SFX_POOL_SIZE:
		var player := AudioStreamPlayer.new()
		player.name = "SFXChannel_%d" % i
		player.bus = SFX_BUS
		add_child(player)
		sfx_pool.append(player)


func _connect_signals() -> void:
	if Engine.has_singleton("EventBus"):
		return
	# Use the autoload directly if available.
	var event_bus := get_node_or_null("/root/EventBus")
	if event_bus and event_bus.has_signal("sfx_requested"):
		event_bus.sfx_requested.connect(_on_sfx_requested)
	if event_bus and event_bus.has_signal("music_changed"):
		event_bus.music_changed.connect(_on_music_change_requested)

# ==============================================================================
# Music
# ==============================================================================

## Play a music track by context key (e.g. "battle") or direct filename.
## Supports intro+loop pairs automatically.
func play_music(track_name: String, crossfade: bool = true) -> void:
	var resolved: String = music_map.get(track_name, track_name)
	if resolved == current_music_track and music_player.playing:
		return

	if crossfade and music_player.playing and not is_crossfading:
		_crossfade_music(resolved, crossfade_duration)
		return

	_start_music_track(resolved)


## Internal: begin playing a resolved track name, handling intro+loop.
func _start_music_track(track_base: String) -> void:
	current_music_track = track_base
	_playing_intro = false

	var intro_path := MUSIC_PATH + track_base + "_Intro.wav"
	var loop_path := MUSIC_PATH + track_base + "_Loop.wav"
	var single_path := MUSIC_PATH + track_base + ".wav"

	# Check for intro+loop pair.
	if ResourceLoader.exists(intro_path) and ResourceLoader.exists(loop_path):
		var intro_stream: AudioStream = load(intro_path)
		music_intro_player.stream = intro_stream
		music_intro_player.volume_db = _volume_to_db(music_volume) if not music_muted else -80.0
		music_intro_player.play()
		_playing_intro = true
		# Pre-load the loop so it is ready when the intro finishes.
		var loop_stream: AudioStream = load(loop_path)
		music_player.stream = loop_stream
		EventBus.music_changed.emit(track_base)
		return

	# Fallback: single file.
	if ResourceLoader.exists(single_path):
		var stream: AudioStream = load(single_path)
		music_player.stream = stream
		music_player.volume_db = _volume_to_db(music_volume) if not music_muted else -80.0
		music_player.play()
		EventBus.music_changed.emit(track_base)
		return

	push_warning("AudioManager: Music track not found — '%s'" % track_base)


func stop_music(fade_duration: float = 1.0) -> void:
	if fade_duration <= 0.0:
		music_player.stop()
		music_intro_player.stop()
		_playing_intro = false
		current_music_track = ""
		return

	var tween := create_tween()
	if _playing_intro and music_intro_player.playing:
		tween.tween_property(music_intro_player, "volume_db", -80.0, fade_duration)
	if music_player.playing:
		tween.parallel().tween_property(music_player, "volume_db", -80.0, fade_duration)
	tween.tween_callback(func() -> void:
		music_player.stop()
		music_intro_player.stop()
		_playing_intro = false
		current_music_track = ""
	)


func _crossfade_music(new_track: String, duration: float) -> void:
	is_crossfading = true
	var fade_out_tween := create_tween()
	if _playing_intro and music_intro_player.playing:
		fade_out_tween.tween_property(music_intro_player, "volume_db", -80.0, duration * 0.5)
	if music_player.playing:
		fade_out_tween.parallel().tween_property(music_player, "volume_db", -80.0, duration * 0.5)

	fade_out_tween.tween_callback(func() -> void:
		music_player.stop()
		music_intro_player.stop()
		_playing_intro = false
		_start_music_track(new_track)
		# Fade the new track in.
		var target_db := _volume_to_db(music_volume) if not music_muted else -80.0
		if _playing_intro:
			music_intro_player.volume_db = -80.0
			var fade_in := create_tween()
			fade_in.tween_property(music_intro_player, "volume_db", target_db, duration * 0.5)
			fade_in.tween_callback(func() -> void: is_crossfading = false)
		elif music_player.playing:
			music_player.volume_db = -80.0
			var fade_in := create_tween()
			fade_in.tween_property(music_player, "volume_db", target_db, duration * 0.5)
			fade_in.tween_callback(func() -> void: is_crossfading = false)
		else:
			is_crossfading = false
	)


func _on_intro_finished() -> void:
	if not _playing_intro:
		return
	_playing_intro = false
	# Start the loop portion.
	if music_player.stream:
		music_player.volume_db = _volume_to_db(music_volume) if not music_muted else -80.0
		music_player.play()


func _on_music_finished() -> void:
	# Loop the current music track.
	if current_music_track != "" and music_player.stream and not _playing_intro:
		music_player.play()

# ==============================================================================
# SFX
# ==============================================================================

## Play a sound effect by context key (e.g. "confirm") or direct filename.
## Returns the AudioStreamPlayer used, or null if no channel was available.
func play_sfx(sfx_name: String, _position: Vector2 = Vector2.ZERO) -> AudioStreamPlayer:
	if sfx_muted:
		return null

	var resolved: String = sfx_map.get(sfx_name, sfx_name)
	var stream: AudioStream = _get_sfx_stream(resolved)
	if not stream:
		push_warning("AudioManager: SFX not found — '%s'" % resolved)
		return null

	var channel := _get_free_sfx_channel()
	if not channel:
		return null

	channel.stream = stream
	channel.volume_db = _volume_to_db(sfx_volume)
	channel.play()
	return channel


## Find an idle SFX channel, or steal the oldest busy one.
func _get_free_sfx_channel() -> AudioStreamPlayer:
	# First pass: find a free channel.
	for player: AudioStreamPlayer in sfx_pool:
		if not player.playing:
			return player

	# Second pass: steal the one with the most elapsed playback time.
	var oldest: AudioStreamPlayer = sfx_pool[0]
	var oldest_position: float = 0.0
	for player: AudioStreamPlayer in sfx_pool:
		if player.get_playback_position() > oldest_position:
			oldest_position = player.get_playback_position()
			oldest = player
	oldest.stop()
	return oldest


## Load or retrieve a cached SFX AudioStream.
func _get_sfx_stream(file_base: String) -> AudioStream:
	if _sfx_cache.has(file_base):
		return _sfx_cache[file_base]

	var path := SFX_PATH + file_base + ".ogg"
	if ResourceLoader.exists(path):
		var stream: AudioStream = load(path)
		_sfx_cache[file_base] = stream
		return stream

	return null


## Pre-cache an array of SFX names for instant playback later.
func preload_sfx(sfx_names: Array[String]) -> void:
	for sfx_name: String in sfx_names:
		var resolved: String = sfx_map.get(sfx_name, sfx_name)
		_get_sfx_stream(resolved)

# ==============================================================================
# Voice / Sprite Cries
# ==============================================================================

func play_voice(cry_name: String) -> void:
	var path := CRIES_PATH + cry_name + ".ogg"
	if not ResourceLoader.exists(path):
		push_warning("AudioManager: Voice/cry not found — '%s'" % cry_name)
		return

	var stream: AudioStream = load(path)
	voice_player.stream = stream
	voice_player.volume_db = _volume_to_db(voice_volume)
	voice_player.play()

	# Duck music while voice plays.
	_duck_music(true)
	if not voice_player.finished.is_connected(_on_voice_finished):
		voice_player.finished.connect(_on_voice_finished, CONNECT_ONE_SHOT)


func _on_voice_finished() -> void:
	_duck_music(false)


## Temporarily lower music volume while voice is playing.
func _duck_music(duck: bool) -> void:
	var bus_idx := AudioServer.get_bus_index(MUSIC_BUS)
	if bus_idx == -1:
		return
	var target_db: float
	if duck:
		target_db = AudioServer.get_bus_volume_db(bus_idx) - 6.0
	else:
		target_db = _volume_to_db(music_volume) if not music_muted else -80.0
	var tween := create_tween()
	tween.tween_method(
		func(db: float) -> void: AudioServer.set_bus_volume_db(bus_idx, db),
		AudioServer.get_bus_volume_db(bus_idx),
		target_db,
		0.2 if duck else 0.5
	)

# ==============================================================================
# Ambient
# ==============================================================================

func play_ambient(ambient_name: String, crossfade: bool = true) -> void:
	var path := AMBIENT_PATH + ambient_name + ".wav"
	if not ResourceLoader.exists(path):
		# Try .ogg fallback.
		path = AMBIENT_PATH + ambient_name + ".ogg"
	if not ResourceLoader.exists(path):
		push_warning("AudioManager: Ambient track not found — '%s'" % ambient_name)
		return

	var stream: AudioStream = load(path)

	if crossfade and ambient_player.playing:
		var old_db := ambient_player.volume_db
		var tween := create_tween()
		tween.tween_property(ambient_player, "volume_db", -80.0, crossfade_duration * 0.5)
		tween.tween_callback(func() -> void:
			ambient_player.stream = stream
			ambient_player.volume_db = -80.0
			ambient_player.play()
			var fade_in := create_tween()
			fade_in.tween_property(
				ambient_player, "volume_db",
				_volume_to_db(ambient_volume),
				crossfade_duration * 0.5
			)
		)
		return

	ambient_player.stream = stream
	ambient_player.volume_db = _volume_to_db(ambient_volume)
	ambient_player.play()


func stop_ambient(fade_duration: float = 1.0) -> void:
	if fade_duration <= 0.0:
		ambient_player.stop()
		return

	var tween := create_tween()
	tween.tween_property(ambient_player, "volume_db", -80.0, fade_duration)
	tween.tween_callback(ambient_player.stop)

# ==============================================================================
# Volume Control
# ==============================================================================

func set_music_volume(value: float) -> void:
	music_volume = clampf(value, 0.0, 1.0)
	if not music_muted:
		var db := _volume_to_db(music_volume)
		music_player.volume_db = db
		music_intro_player.volume_db = db


func set_sfx_volume(value: float) -> void:
	sfx_volume = clampf(value, 0.0, 1.0)


func set_ambient_volume(value: float) -> void:
	ambient_volume = clampf(value, 0.0, 1.0)
	ambient_player.volume_db = _volume_to_db(ambient_volume)


func set_voice_volume(value: float) -> void:
	voice_volume = clampf(value, 0.0, 1.0)
	voice_player.volume_db = _volume_to_db(voice_volume)


func toggle_music_mute() -> void:
	music_muted = not music_muted
	var db := -80.0 if music_muted else _volume_to_db(music_volume)
	music_player.volume_db = db
	music_intro_player.volume_db = db


func toggle_sfx_mute() -> void:
	sfx_muted = not sfx_muted

# ==============================================================================
# Utility
# ==============================================================================

## Convert linear volume (0.0 – 1.0) to decibels.
## Returns -80 dB for silence (linear <= 0), 0 dB for full volume (linear = 1).
func _volume_to_db(linear: float) -> float:
	if linear <= 0.0:
		return -80.0
	return linear_to_db(linear)

# ==============================================================================
# Signal Callbacks
# ==============================================================================

func _on_sfx_requested(sfx_name: String, position: Vector2) -> void:
	play_sfx(sfx_name, position)


func _on_music_change_requested(track_name: String) -> void:
	# Avoid recursive emit — music_changed is emitted from _start_music_track.
	if track_name != current_music_track:
		play_music(track_name)

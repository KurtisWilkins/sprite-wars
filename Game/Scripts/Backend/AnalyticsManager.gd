## AnalyticsManager -- Client-side analytics event collection and batched dispatch.
## [P12-007] Tracks gameplay events, sessions, and player behavior metrics.
## Events are queued locally and flushed in batches to the analytics endpoint.
extends Node


## ── Configuration ────────────────────────────────────────────────────────────────

## Analytics API endpoint.
@export var analytics_endpoint: String = "https://analytics.spritewars.example.com/v1/events"

## Maximum events to batch in a single flush.
@export var batch_size: int = 20

## Seconds between automatic flushes.
@export var flush_interval: float = 60.0

## Whether analytics collection is enabled (respects user privacy settings).
var is_enabled: bool = true


## ── State ────────────────────────────────────────────────────────────────────────

## Queued events waiting to be flushed.
var event_queue: Array[Dictionary] = []

## Unique identifier for this play session.
var session_id: String = ""

## Unix timestamp when the session started.
var session_start_time: float = 0.0

## Timer for periodic flush.
var _flush_timer: float = 0.0

## Whether a flush is currently in progress.
var _is_flushing: bool = false

## Persistent player ID (survives across sessions).
var _player_id: String = ""

## Counters for session-level aggregates.
var _session_battles: int = 0
var _session_catches: int = 0
var _session_evolutions: int = 0


## ── Core Event Names ────────────────────────────────────────────────────────────

const EVENT_SESSION_START: String = "session_start"
const EVENT_SESSION_END: String = "session_end"
const EVENT_BATTLE_STARTED: String = "battle_started"
const EVENT_BATTLE_ENDED: String = "battle_ended"
const EVENT_TEMPLE_ENTERED: String = "temple_entered"
const EVENT_TEMPLE_COMPLETED: String = "temple_completed"
const EVENT_SPRITE_EVOLVED: String = "sprite_evolved"
const EVENT_SPRITE_CAUGHT: String = "sprite_caught"
const EVENT_ABILITY_USED: String = "ability_used"
const EVENT_ITEM_PURCHASED: String = "item_purchased"
const EVENT_QUEST_COMPLETED: String = "quest_completed"
const EVENT_LEVEL_UP: String = "level_up"


## ── Lifecycle ────────────────────────────────────────────────────────────────────

func _ready() -> void:
	# Generate a unique session ID.
	session_id = _generate_session_id()
	session_start_time = Time.get_unix_time_from_system()

	# Derive a persistent player ID from device.
	_player_id = _derive_player_id()

	# Log session start.
	track_event(EVENT_SESSION_START, {
		"platform": OS.get_name(),
		"locale": OS.get_locale(),
		"device_model": OS.get_model_name(),
		"screen_size": "%dx%d" % [
			DisplayServer.window_get_size().x,
			DisplayServer.window_get_size().y],
	})

	# Connect to EventBus signals for automatic tracking.
	_connect_event_signals()

	print("[AnalyticsManager] Session started: %s" % session_id)


func _process(delta: float) -> void:
	if not is_enabled:
		return

	_flush_timer += delta
	if _flush_timer >= flush_interval:
		_flush_timer = 0.0
		flush_events()


func _notification(what: int) -> void:
	match what:
		NOTIFICATION_WM_CLOSE_REQUEST:
			_on_session_end("close_request")
		NOTIFICATION_APPLICATION_FOCUS_OUT:
			# Flush events when app loses focus (mobile backgrounding).
			if not event_queue.is_empty():
				flush_events()


## ── Public API ──────────────────────────────────────────────────────────────────

## Track a custom analytics event.
func track_event(event_name: String, properties: Dictionary = {}) -> void:
	if not is_enabled:
		return

	var event := {
		"event_name": event_name,
		"session_id": session_id,
		"player_id": _player_id,
		"timestamp": Time.get_unix_time_from_system(),
		"session_duration": get_session_duration(),
		"properties": properties,
	}

	event_queue.append(event)

	# Auto-flush if the queue exceeds batch size.
	if event_queue.size() >= batch_size:
		flush_events()


## Flush all queued events to the analytics endpoint.
func flush_events() -> void:
	if _is_flushing:
		return
	if event_queue.is_empty():
		return

	_is_flushing = true

	# Extract a batch from the front of the queue.
	var batch_count := mini(event_queue.size(), batch_size)
	var batch: Array[Dictionary] = []
	for i in batch_count:
		batch.append(event_queue[i])

	# Attempt to send the batch.
	var success := await _send_batch(batch)

	if success:
		# Remove successfully sent events from the queue.
		for i in range(batch_count - 1, -1, -1):
			event_queue.remove_at(i)
	else:
		push_warning("[AnalyticsManager] Flush failed. Events remain queued (queue size: %d)." % event_queue.size())

	_is_flushing = false


## Get the duration of the current session in seconds.
func get_session_duration() -> float:
	return Time.get_unix_time_from_system() - session_start_time


## Get session-level aggregate stats.
func get_session_stats() -> Dictionary:
	return {
		"session_id": session_id,
		"duration": get_session_duration(),
		"battles": _session_battles,
		"catches": _session_catches,
		"evolutions": _session_evolutions,
		"events_tracked": event_queue.size(),
	}


## ── EventBus Signal Handlers ────────────────────────────────────────────────────

func _connect_event_signals() -> void:
	if not is_instance_valid(EventBus):
		push_warning("[AnalyticsManager] EventBus not available; automatic tracking disabled.")
		return

	# Battle events.
	if EventBus.has_signal("battle_started"):
		EventBus.battle_started.connect(_on_battle_started)
	if EventBus.has_signal("battle_ended"):
		EventBus.battle_ended.connect(_on_battle_ended)

	# Catching.
	if EventBus.has_signal("catch_succeeded"):
		EventBus.catch_succeeded.connect(_on_catch_succeeded)

	# Progression.
	if EventBus.has_signal("evolution_completed"):
		EventBus.evolution_completed.connect(_on_evolution_completed)
	if EventBus.has_signal("level_up"):
		EventBus.level_up.connect(_on_level_up)
	if EventBus.has_signal("ability_used"):
		EventBus.ability_used.connect(_on_ability_used)

	# Quests.
	if EventBus.has_signal("quest_completed"):
		EventBus.quest_completed.connect(_on_quest_completed)

	# Economy.
	if EventBus.has_signal("item_acquired"):
		EventBus.item_acquired.connect(_on_item_acquired)

	# Temples.
	if EventBus.has_signal("temple_entered"):
		EventBus.temple_entered.connect(_on_temple_entered)
	if EventBus.has_signal("temple_completed"):
		EventBus.temple_completed.connect(_on_temple_completed)

	# Area navigation.
	if EventBus.has_signal("area_entered"):
		EventBus.area_entered.connect(_on_area_entered)


func _on_battle_started(battle_data: Dictionary) -> void:
	_session_battles += 1
	track_event(EVENT_BATTLE_STARTED, {
		"battle_type": str(battle_data.get("type", "unknown")),
		"team_size": int(battle_data.get("team_size", 0)),
		"area_id": str(battle_data.get("area_id", "")),
	})


func _on_battle_ended(result: Dictionary) -> void:
	track_event(EVENT_BATTLE_ENDED, {
		"outcome": str(result.get("outcome", "unknown")),
		"turns": int(result.get("turns", 0)),
		"duration": float(result.get("duration", 0.0)),
		"xp_gained": int(result.get("xp_gained", 0)),
	})


func _on_catch_succeeded(sprite_data: Resource) -> void:
	_session_catches += 1
	track_event(EVENT_SPRITE_CAUGHT, {
		"race_id": int(sprite_data.race_id) if sprite_data else 0,
		"form_id": int(sprite_data.form_id) if sprite_data else 0,
		"level": int(sprite_data.level) if sprite_data else 0,
	})


func _on_evolution_completed(sprite_data: Resource) -> void:
	_session_evolutions += 1
	track_event(EVENT_SPRITE_EVOLVED, {
		"race_id": int(sprite_data.race_id) if sprite_data else 0,
		"form_id": int(sprite_data.form_id) if sprite_data else 0,
		"level": int(sprite_data.level) if sprite_data else 0,
	})


func _on_level_up(sprite_data: Resource, new_level: int) -> void:
	track_event(EVENT_LEVEL_UP, {
		"race_id": int(sprite_data.race_id) if sprite_data else 0,
		"new_level": new_level,
	})


func _on_ability_used(caster: Resource, ability: Resource, targets: Array) -> void:
	track_event(EVENT_ABILITY_USED, {
		"ability_id": int(ability.ability_id) if ability else 0,
		"caster_race_id": int(caster.race_id) if caster else 0,
		"target_count": targets.size(),
	})


func _on_quest_completed(quest: Resource) -> void:
	track_event(EVENT_QUEST_COMPLETED, {
		"quest_id": int(quest.quest_id) if quest else 0,
		"quest_type": str(quest.quest_type) if quest else "unknown",
	})


func _on_item_acquired(item: Resource, quantity: int) -> void:
	track_event(EVENT_ITEM_PURCHASED, {
		"item_id": int(item.equipment_id) if item and "equipment_id" in item else 0,
		"quantity": quantity,
	})


func _on_temple_entered(temple_id: String) -> void:
	track_event(EVENT_TEMPLE_ENTERED, {
		"temple_id": temple_id,
	})


func _on_temple_completed(temple_id: String) -> void:
	track_event(EVENT_TEMPLE_COMPLETED, {
		"temple_id": temple_id,
	})


func _on_area_entered(area_id: String) -> void:
	track_event("area_entered", {
		"area_id": area_id,
	})


func _on_session_end(reason: String) -> void:
	track_event(EVENT_SESSION_END, {
		"reason": reason,
		"session_duration": get_session_duration(),
		"battles_played": _session_battles,
		"sprites_caught": _session_catches,
		"evolutions": _session_evolutions,
		"events_queued": event_queue.size(),
	})

	# Force-flush remaining events synchronously-ish.
	if not event_queue.is_empty():
		flush_events()


## ── Private Helpers ─────────────────────────────────────────────────────────────

## Generate a unique session ID using crypto random bytes.
func _generate_session_id() -> String:
	var crypto := Crypto.new()
	var bytes := crypto.generate_random_bytes(16)
	return bytes.hex_encode()


## Derive a persistent (but privacy-respecting) player identifier.
func _derive_player_id() -> String:
	var device_id := OS.get_unique_id()
	if device_id.is_empty():
		device_id = "dev_player"
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(("SpriteWars_PID_" + device_id).to_utf8_buffer())
	return ctx.finish().hex_encode().left(16)


## Send a batch of events to the analytics endpoint.
func _send_batch(batch: Array[Dictionary]) -> bool:
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return false

	var http := HTTPRequest.new()
	http.timeout = 10.0
	tree.root.add_child(http)

	var payload := {
		"batch": batch,
		"sent_at": Time.get_unix_time_from_system(),
		"sdk_version": "1.0.0",
	}

	var headers := PackedStringArray([
		"Content-Type: application/json",
		"X-Analytics-Key: sprite_wars_analytics",
	])

	var body := JSON.stringify(payload)
	var err := http.request(analytics_endpoint, headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		http.queue_free()
		return false

	var response: Array = await http.request_completed
	http.queue_free()

	var result_code: int = int(response[0])
	var status_code: int = int(response[1])

	return result_code == HTTPRequest.RESULT_SUCCESS and status_code >= 200 and status_code < 300

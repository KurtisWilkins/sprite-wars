## BattleReplayRecorder — [P3-017] Records battle inputs and RNG seeds for
## deterministic replay. Stores as compact data for sharing or review.
class_name BattleReplayRecorder
extends RefCounted

var is_recording: bool = false
var replay_data: Dictionary = {}
var action_log: Array[Dictionary] = []
var rng_seed: int = 0
var turn_count: int = 0

func start_recording(player_team: Array, enemy_team: Array, battle_config: Dictionary) -> void:
	is_recording = true
	rng_seed = randi()
	seed(rng_seed)
	turn_count = 0
	action_log.clear()
	replay_data = {
		"version": 1,
		"timestamp": Time.get_unix_time_from_system(),
		"rng_seed": rng_seed,
		"player_team": _serialize_team(player_team),
		"enemy_team": _serialize_team(enemy_team),
		"battle_config": battle_config,
		"actions": action_log,
	}

func record_action(action: Dictionary) -> void:
	if not is_recording:
		return
	var entry := {
		"turn": turn_count,
		"type": action.get("type", "unknown"),
		"unit_id": action.get("unit_id", -1),
		"ability_id": action.get("ability_id", -1),
		"target_pos": _vec_to_array(action.get("target_pos", Vector2i.ZERO)),
		"timestamp_ms": Time.get_ticks_msec(),
	}
	action_log.append(entry)

func record_turn_start() -> void:
	turn_count += 1

func stop_recording() -> Dictionary:
	is_recording = false
	replay_data["total_turns"] = turn_count
	replay_data["total_actions"] = action_log.size()
	return replay_data

func get_replay_data() -> Dictionary:
	return replay_data

func save_replay(file_path: String) -> bool:
	var file := FileAccess.open(file_path, FileAccess.WRITE)
	if not file:
		return false
	file.store_string(JSON.stringify(replay_data))
	file.close()
	return true

static func load_replay(file_path: String) -> Dictionary:
	var file := FileAccess.open(file_path, FileAccess.READ)
	if not file:
		return {}
	var text := file.get_as_text()
	file.close()
	var json := JSON.new()
	if json.parse(text) != OK:
		return {}
	return json.data

func _serialize_team(team: Array) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for sprite in team:
		result.append({
			"race_id": sprite.get("race_id", sprite.race_id if sprite is Resource else 0),
			"form_id": sprite.get("form_id", sprite.form_id if sprite is Resource else 0),
			"level": sprite.get("level", sprite.level if sprite is Resource else 1),
			"abilities": sprite.get("equipped_abilities", sprite.equipped_abilities if sprite is Resource else []),
		})
	return result

func _vec_to_array(v: Vector2i) -> Array:
	return [v.x, v.y]

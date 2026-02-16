## GameManager — Central game state manager and scene coordinator.
extends Node

var player_data: PlayerData
var current_area_id: String = ""
var game_time_seconds: float = 0.0
var is_in_battle: bool = false

func _ready() -> void:
	player_data = PlayerData.new()

func _process(delta: float) -> void:
	game_time_seconds += delta

func start_new_game() -> void:
	player_data = PlayerData.new()
	player_data.initialize_starter()
	current_area_id = "starter_town"
	EventBus.area_entered.emit(current_area_id)

func load_game(save_slot: int) -> void:
	var data := SaveManager.load_save(save_slot)
	if data:
		player_data = data
		EventBus.load_completed.emit(true)
	else:
		EventBus.load_completed.emit(false)

func save_game(save_slot: int) -> void:
	EventBus.save_requested.emit()
	var success := SaveManager.save_data(save_slot, player_data)
	EventBus.save_completed.emit(success)

func get_top_10_average_level() -> float:
	## [P9-007] Calculate the average level of the player's top 10 highest-leveled Sprites.
	var all_sprites: Array = player_data.team + player_data.storage
	if all_sprites.is_empty():
		return 1.0
	all_sprites.sort_custom(func(a, b): return a.level > b.level)
	var top_count := mini(10, all_sprites.size())
	var total := 0
	for i in range(top_count):
		total += all_sprites[i].level
	return float(total) / float(top_count)

func transition_to_battle(battle_data: Dictionary) -> void:
	is_in_battle = true
	EventBus.battle_started.emit(battle_data)
	get_tree().change_scene_to_file("res://Scenes/Battle.tscn")

func end_battle(result: Dictionary) -> void:
	is_in_battle = false
	EventBus.battle_ended.emit(result)

func transition_to_area(area_id: String) -> void:
	EventBus.area_exited.emit(current_area_id)
	current_area_id = area_id
	EventBus.area_entered.emit(area_id)

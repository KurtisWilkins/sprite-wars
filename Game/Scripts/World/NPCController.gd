## NPCController — Controls NPC behavior including patrol movement, player
## interaction, trainer vision detection, and dialogue triggering.
## [P5-009] Handles static, patrol, and trainer NPC archetypes.
extends CharacterBody2D

## ── Identity ────────────────────────────────────────────────────────────────

## Unique identifier for this NPC instance.
@export var npc_id: String = ""

## Display name shown in dialogue.
@export var npc_name: String = ""

## NPC behavior archetype: "static", "patrol", or "trainer".
@export_enum("static", "patrol", "trainer") var npc_type: String = "static"

## ── Dialogue ────────────────────────────────────────────────────────────────

## Dialogue sequence data. Each entry:
## {speaker, text, portrait, choices: [{text, next_index, condition, action}]}
@export var dialogue_data: Array[Dictionary] = []

## ── Patrol ──────────────────────────────────────────────────────────────────

## Ordered list of grid positions forming the patrol route. Only used when
## npc_type == "patrol".
@export var patrol_path: Array[Vector2i] = []

## Current index within the patrol_path array.
var patrol_index: int = 0

## Patrol movement speed in pixels per second.
@export var patrol_speed: float = 80.0

## Seconds to wait at each patrol waypoint before moving to the next.
@export var patrol_wait_time: float = 2.0

## ── Trainer ─────────────────────────────────────────────────────────────────

## Number of tiles the trainer can see ahead (for spotting the player).
@export var vision_range: int = 5

## Direction the trainer is looking for the player.
@export var vision_direction: Vector2i = Vector2i.DOWN

## Whether this trainer has been defeated (won't re-trigger battle).
var is_defeated: bool = false

## ── Node References ─────────────────────────────────────────────────────────

@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D

## ── Internal State ──────────────────────────────────────────────────────────

## Grid cell size in pixels; must match the OverworldMap/PlayerController.
var grid_size: int = 16

## Current facing direction.
var _facing: Vector2i = Vector2i.DOWN

## Whether this NPC is currently moving between grid cells.
var _is_moving: bool = false

## Movement target for patrol interpolation.
var _move_target: Vector2 = Vector2.ZERO

## Whether the NPC is waiting at a patrol waypoint.
var _is_waiting: bool = false

## Remaining wait time at a patrol waypoint.
var _wait_timer: float = 0.0

## Whether the NPC is currently engaged in interaction (blocks patrol).
var _in_interaction: bool = false

## Whether the trainer exclamation sequence is playing.
var _trainer_triggered: bool = false

## Reference to the exclamation mark indicator (child Sprite2D node).
var _exclamation_sprite: Sprite2D = null


## ── Signals ─────────────────────────────────────────────────────────────────

signal interaction_started(npc: Node)
signal interaction_ended(npc: Node)
signal trainer_battle_requested(npc: Node)


## ── Constants ───────────────────────────────────────────────────────────────

const DIRECTION_NAMES: Dictionary = {
	Vector2i.UP: "up",
	Vector2i.DOWN: "down",
	Vector2i.LEFT: "left",
	Vector2i.RIGHT: "right",
}


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	_facing = vision_direction if npc_type == "trainer" else Vector2i.DOWN
	_play_idle_animation()

	# Look for exclamation mark child
	if has_node("ExclamationSprite"):
		_exclamation_sprite = $ExclamationSprite as Sprite2D
		_exclamation_sprite.visible = false

	# Register with the overworld map if available
	_register_with_map()


func _process(delta: float) -> void:
	if _in_interaction or _trainer_triggered:
		return

	match npc_type:
		"patrol":
			_process_patrol(delta)
		"trainer":
			_process_trainer_vision()


## ── Interaction ─────────────────────────────────────────────────────────────

## Called when the player interacts with this NPC (presses action button while
## facing the NPC). Triggers dialogue and, for trainers, initiates battle.
func interact(player: Node) -> void:
	if _in_interaction:
		return

	_in_interaction = true
	interaction_started.emit(self)

	# Face the player
	if player:
		face_player(player.global_position)

	# Start dialogue
	if not dialogue_data.is_empty():
		var dialogue_system := _get_dialogue_system()
		if dialogue_system:
			dialogue_system.start_dialogue(dialogue_data)
			await dialogue_system.dialogue_ended

	_in_interaction = false
	interaction_ended.emit(self)

	# Trainer battle after dialogue (only if not yet defeated)
	if npc_type == "trainer" and not is_defeated:
		trigger_trainer_battle()


## ── Trainer Vision ──────────────────────────────────────────────────────────

## Checks if the player is within the trainer's vision cone: a straight line
## in the facing direction up to vision_range tiles.
func check_player_in_vision(player_pos: Vector2i) -> bool:
	if is_defeated or _trainer_triggered or _in_interaction:
		return false

	var my_grid_pos: Vector2i = _get_grid_pos()

	# Vision is a straight line in the facing direction
	for i in range(1, vision_range + 1):
		var check_pos: Vector2i = my_grid_pos + vision_direction * i
		if check_pos == player_pos:
			return true
		# Stop at obstacles (check the overworld map)
		var overworld_map := _get_overworld_map()
		if overworld_map and overworld_map.has_method("is_walkable"):
			if not overworld_map.is_walkable(check_pos):
				break

	return false


## ── Trainer Vision Processing ───────────────────────────────────────────────

func _process_trainer_vision() -> void:
	if is_defeated or _trainer_triggered:
		return

	var player := _get_player()
	if not player:
		return

	var player_grid: Vector2i = player.get("current_grid_pos") if player.get("current_grid_pos") != null else Vector2i.ZERO
	if check_player_in_vision(player_grid):
		_start_trainer_sequence(player)


## ── Trainer Battle Sequence ─────────────────────────────────────────────────

## Triggers the exclamation mark -> walk to player -> battle sequence.
func trigger_trainer_battle() -> void:
	trainer_battle_requested.emit(self)


## Begins the trainer detection sequence: freeze player, show "!",
## walk toward player, then request battle.
func _start_trainer_sequence(player: Node) -> void:
	if _trainer_triggered:
		return
	_trainer_triggered = true

	# Freeze player movement
	if player.has_method("freeze"):
		player.freeze()

	# Show exclamation mark
	if _exclamation_sprite:
		_exclamation_sprite.visible = true
		await get_tree().create_timer(0.8).timeout
		_exclamation_sprite.visible = false

	# Walk toward the player, stopping one tile away
	var target_grid: Vector2i
	if player.get("current_grid_pos") != null:
		target_grid = player.current_grid_pos
	else:
		target_grid = Vector2i(
			roundi(player.global_position.x / float(grid_size)),
			roundi(player.global_position.y / float(grid_size)),
		)

	await _walk_toward_player(target_grid)

	# Face the player
	face_player(player.global_position)

	# Trigger battle through the TrainerBattleSystem
	trainer_battle_requested.emit(self)


## Walks the NPC grid-by-grid toward the player, stopping one tile away.
func _walk_toward_player(player_grid: Vector2i) -> void:
	var my_grid: Vector2i = _get_grid_pos()
	var direction: Vector2i = vision_direction

	# Walk along vision direction until one tile from the player
	while true:
		var next_grid: Vector2i = my_grid + direction
		var distance_to_player: int = _grid_distance(next_grid, player_grid)
		if distance_to_player < 1:
			break

		# Check walkability
		var overworld_map := _get_overworld_map()
		if overworld_map and overworld_map.has_method("is_walkable"):
			if not overworld_map.is_walkable(next_grid):
				break

		# Move one cell
		_move_target = Vector2(next_grid) * float(grid_size) + Vector2(grid_size, grid_size) * 0.5
		_is_moving = true
		_set_facing(direction)
		_play_walk_animation()

		while position.distance_to(_move_target) > 1.0:
			position = position.move_toward(_move_target, patrol_speed * get_process_delta_time())
			await get_tree().process_frame

		position = _move_target
		my_grid = next_grid
		_is_moving = false

		# Update map registration
		_register_with_map()

	_play_idle_animation()


## ── Facing ──────────────────────────────────────────────────────────────────

## Faces the NPC toward the given player world position.
func face_player(player_pos: Vector2) -> void:
	var diff: Vector2 = player_pos - global_position
	if absf(diff.x) > absf(diff.y):
		_set_facing(Vector2i.RIGHT if diff.x > 0.0 else Vector2i.LEFT)
	else:
		_set_facing(Vector2i.DOWN if diff.y > 0.0 else Vector2i.UP)


func _set_facing(direction: Vector2i) -> void:
	if direction == Vector2i.ZERO:
		return
	_facing = direction
	if npc_type == "trainer":
		vision_direction = direction


## ── Patrol Movement ─────────────────────────────────────────────────────────

func _process_patrol(delta: float) -> void:
	if patrol_path.is_empty():
		return

	if _is_waiting:
		_wait_timer -= delta
		if _wait_timer <= 0.0:
			_is_waiting = false
			patrol_index = (patrol_index + 1) % patrol_path.size()
		return

	if _is_moving:
		_process_patrol_movement(delta)
		return

	# Start moving to next waypoint
	var target_grid: Vector2i = patrol_path[patrol_index]
	var current_grid: Vector2i = _get_grid_pos()

	if current_grid == target_grid:
		# Already at waypoint, wait
		_is_waiting = true
		_wait_timer = patrol_wait_time
		_play_idle_animation()
		return

	# Determine direction to next waypoint (one step at a time)
	var diff: Vector2i = target_grid - current_grid
	var direction := Vector2i.ZERO
	if abs(diff.x) > abs(diff.y):
		direction = Vector2i(signi(diff.x), 0)
	else:
		direction = Vector2i(0, signi(diff.y))

	var next_grid: Vector2i = current_grid + direction

	# Check walkability
	var overworld_map := _get_overworld_map()
	if overworld_map and overworld_map.has_method("is_walkable"):
		if not overworld_map.is_walkable(next_grid):
			# Can't move, skip to wait
			_is_waiting = true
			_wait_timer = patrol_wait_time
			return

	_set_facing(direction)
	_move_target = Vector2(next_grid) * float(grid_size) + Vector2(grid_size, grid_size) * 0.5
	_is_moving = true
	_play_walk_animation()


func _process_patrol_movement(delta: float) -> void:
	var step: float = patrol_speed * delta
	var distance: float = position.distance_to(_move_target)

	if distance <= step:
		position = _move_target
		_is_moving = false
		_play_idle_animation()
		_register_with_map()
	else:
		position = position.move_toward(_move_target, step)


## ── Animation Helpers ───────────────────────────────────────────────────────

func _play_idle_animation() -> void:
	if not animated_sprite:
		return
	var dir_name: String = DIRECTION_NAMES.get(_facing, "down")
	var anim_name := "idle_%s" % dir_name
	if animated_sprite.sprite_frames and animated_sprite.sprite_frames.has_animation(anim_name):
		animated_sprite.play(anim_name)


func _play_walk_animation() -> void:
	if not animated_sprite:
		return
	var dir_name: String = DIRECTION_NAMES.get(_facing, "down")
	var anim_name := "walk_%s" % dir_name
	if animated_sprite.sprite_frames and animated_sprite.sprite_frames.has_animation(anim_name):
		animated_sprite.play(anim_name)


## ── Utility ─────────────────────────────────────────────────────────────────

func _get_grid_pos() -> Vector2i:
	return Vector2i(
		roundi((position.x - float(grid_size) * 0.5) / float(grid_size)),
		roundi((position.y - float(grid_size) * 0.5) / float(grid_size)),
	)


func _grid_distance(a: Vector2i, b: Vector2i) -> int:
	return abs(a.x - b.x) + abs(a.y - b.y)


func _get_dialogue_system() -> Node:
	var systems := get_tree().get_nodes_in_group("dialogue_system")
	if not systems.is_empty():
		return systems[0]
	# Fallback: search by typical node path
	return get_tree().root.find_child("DialogueSystem", true, false)


func _get_overworld_map() -> Node:
	var maps := get_tree().get_nodes_in_group("overworld_map")
	if not maps.is_empty():
		return maps[0]
	return null


func _get_player() -> Node:
	var players := get_tree().get_nodes_in_group("player")
	if not players.is_empty():
		return players[0]
	return null


func _register_with_map() -> void:
	var overworld_map := _get_overworld_map()
	if overworld_map and overworld_map.has_method("register_npc"):
		overworld_map.register_npc(self, _get_grid_pos())

## PlayerController — Grid-based player character for overworld exploration.
## [P5-002] Handles 4-directional movement, interaction, encounter checks,
## and cutscene freeze/unfreeze.
extends CharacterBody2D

## ── Configuration ───────────────────────────────────────────────────────────

## Movement speed in pixels per second during grid movement.
@export var move_speed: float = 200.0

## Tile size in pixels; must match the OverworldMap grid_size.
@export var grid_size: int = 16

## ── Node References ─────────────────────────────────────────────────────────

@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var interaction_ray: RayCast2D = $InteractionRay

## ── State ───────────────────────────────────────────────────────────────────

## True while the character is tweening between grid cells.
var is_moving: bool = false

## The direction the character is facing; used for interaction raycasts and
## sprite animation selection.
var facing_direction: Vector2i = Vector2i.DOWN

## When false, all input is ignored (dialogue, menus, cutscenes).
var can_move: bool = true

## Grid position the player currently occupies.
var current_grid_pos: Vector2i = Vector2i.ZERO

## Target world position during grid movement tween.
var _move_target: Vector2 = Vector2.ZERO

## Reference to the overworld map for walkability/encounter checks.
var overworld_map: Node = null  # OverworldMap

## ── Signals ─────────────────────────────────────────────────────────────────

signal moved_to_grid(grid_pos: Vector2i)
signal interaction_requested(target: Node)
signal step_taken(grid_pos: Vector2i)


## ── Direction Constants ─────────────────────────────────────────────────────

const DIRECTION_NAMES: Dictionary = {
	Vector2i.UP: "up",
	Vector2i.DOWN: "down",
	Vector2i.LEFT: "left",
	Vector2i.RIGHT: "right",
}

const INPUT_DIRECTIONS: Dictionary = {
	"ui_up": Vector2i.UP,
	"ui_down": Vector2i.DOWN,
	"ui_left": Vector2i.LEFT,
	"ui_right": Vector2i.RIGHT,
}


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	current_grid_pos = Vector2i(
		roundi(position.x / float(grid_size)),
		roundi(position.y / float(grid_size)),
	)
	_snap_to_grid()
	set_facing(Vector2i.DOWN)


func _physics_process(delta: float) -> void:
	if is_moving:
		_process_movement(delta)
		return

	if not can_move:
		return

	handle_input()


## ── Input Handling ──────────────────────────────────────────────────────────

## Reads directional input and initiates grid movement or interaction.
func handle_input() -> void:
	# Check for interaction input first
	if Input.is_action_just_pressed("ui_accept"):
		check_interaction()
		return

	# Determine movement direction from input
	var direction := Vector2i.ZERO
	for action: String in INPUT_DIRECTIONS:
		if Input.is_action_pressed(action):
			direction = INPUT_DIRECTIONS[action]
			break

	if direction == Vector2i.ZERO:
		_play_idle_animation()
		return

	set_facing(direction)

	var target_grid_pos: Vector2i = current_grid_pos + direction
	if _can_move_to(target_grid_pos):
		move_to_grid(target_grid_pos)


## ── Grid Movement ───────────────────────────────────────────────────────────

## Initiates smooth movement from the current grid cell to the target cell.
func move_to_grid(target_grid_pos: Vector2i) -> void:
	if is_moving:
		return

	is_moving = true
	_move_target = Vector2(target_grid_pos) * float(grid_size) + Vector2(grid_size, grid_size) * 0.5
	_play_walk_animation()


## Processes smooth interpolation toward the movement target each frame.
func _process_movement(delta: float) -> void:
	var move_vector: Vector2 = (_move_target - position).normalized()
	var step: float = move_speed * delta
	var distance_remaining: float = position.distance_to(_move_target)

	if distance_remaining <= step:
		# Arrived at target
		position = _move_target
		var old_grid_pos := current_grid_pos
		current_grid_pos = Vector2i(
			roundi((_move_target.x - float(grid_size) * 0.5) / float(grid_size)),
			roundi((_move_target.y - float(grid_size) * 0.5) / float(grid_size)),
		)
		is_moving = false

		moved_to_grid.emit(current_grid_pos)
		step_taken.emit(current_grid_pos)

		# Post-move checks
		_on_arrived_at_cell(current_grid_pos)
	else:
		position += move_vector * step


## ── Post-Move Checks ────────────────────────────────────────────────────────

func _on_arrived_at_cell(grid_pos: Vector2i) -> void:
	# Check area transitions
	if overworld_map and overworld_map.has_method("get_transition_at"):
		var target_area: String = overworld_map.get_transition_at(grid_pos)
		if not target_area.is_empty():
			EventBus.area_entered.emit(target_area)
			return

	# Check encounter zones
	_on_encounter_check(grid_pos)


## Rolls for a wild encounter when stepping on an encounter tile.
func _on_encounter_check(grid_pos: Vector2i) -> void:
	if not overworld_map:
		return
	if not overworld_map.has_method("is_encounter_zone"):
		return
	if not overworld_map.is_encounter_zone(grid_pos):
		return

	# Delegate encounter roll to the EncounterSystem (found via tree or autoload)
	var encounter_system := _get_encounter_system()
	if not encounter_system:
		return

	var encounter_data: Dictionary = encounter_system.check_encounter(
		GameManager.current_area_id
	)
	if not encounter_data.is_empty():
		freeze()
		EventBus.encounter_triggered.emit(encounter_data)


## ── Interaction ─────────────────────────────────────────────────────────────

## Casts the interaction ray forward and interacts with the first valid target.
func check_interaction() -> void:
	_update_interaction_ray()
	interaction_ray.force_raycast_update()

	if not interaction_ray.is_colliding():
		return

	var collider := interaction_ray.get_collider()
	if collider and collider.has_method("interact"):
		set_facing(facing_direction)
		interaction_requested.emit(collider)
		collider.interact(self)


## Updates the interaction raycast direction to match facing_direction.
func _update_interaction_ray() -> void:
	interaction_ray.target_position = Vector2(facing_direction) * float(grid_size)


## ── Facing & Animation ──────────────────────────────────────────────────────

## Sets the facing direction and updates the sprite animation accordingly.
func set_facing(direction: Vector2i) -> void:
	if direction == Vector2i.ZERO:
		return
	facing_direction = direction
	_update_interaction_ray()
	_play_idle_animation()


func _play_idle_animation() -> void:
	var dir_name: String = DIRECTION_NAMES.get(facing_direction, "down")
	var anim_name := "idle_%s" % dir_name
	if animated_sprite.sprite_frames and animated_sprite.sprite_frames.has_animation(anim_name):
		animated_sprite.play(anim_name)


func _play_walk_animation() -> void:
	var dir_name: String = DIRECTION_NAMES.get(facing_direction, "down")
	var anim_name := "walk_%s" % dir_name
	if animated_sprite.sprite_frames and animated_sprite.sprite_frames.has_animation(anim_name):
		animated_sprite.play(anim_name)


## ── Freeze / Unfreeze ───────────────────────────────────────────────────────

## Disables all player input and movement (for dialogue, cutscenes, menus).
func freeze() -> void:
	can_move = false
	is_moving = false
	_play_idle_animation()


## Re-enables player input and movement.
func unfreeze() -> void:
	can_move = true


## ── Helpers ─────────────────────────────────────────────────────────────────

## Checks whether the player can step onto the target grid position.
func _can_move_to(grid_pos: Vector2i) -> bool:
	if not overworld_map:
		return true
	if overworld_map.has_method("is_walkable"):
		return overworld_map.is_walkable(grid_pos)
	return true


## Snaps the player position to the center of the current grid cell.
func _snap_to_grid() -> void:
	position = Vector2(current_grid_pos) * float(grid_size) + Vector2(grid_size, grid_size) * 0.5


## Locates the EncounterSystem in the scene tree.
func _get_encounter_system() -> Node:
	var systems := get_tree().get_nodes_in_group("encounter_system")
	if not systems.is_empty():
		return systems[0]
	# Fallback: look for sibling node
	var parent := get_parent()
	if parent and parent.has_node("EncounterSystem"):
		return parent.get_node("EncounterSystem")
	return null

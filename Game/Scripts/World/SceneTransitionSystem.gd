## SceneTransitionSystem — Manages animated screen transitions between areas,
## into battles, and back from battles with fade, slide, and custom effects.
## [P5-011] Rendered as a CanvasLayer overlay above all game content.
extends CanvasLayer

## ── Node References ─────────────────────────────────────────────────────────

@onready var transition_overlay: ColorRect = $TransitionOverlay

## ── Configuration ───────────────────────────────────────────────────────────

## Duration of the transition animation in seconds (each half: in + out).
@export var default_duration: float = 0.5

## ── State ───────────────────────────────────────────────────────────────────

## True while a transition animation is in progress.
var is_transitioning: bool = false

## Active tween reference.
var _tween: Tween = null


## ── Signals ─────────────────────────────────────────────────────────────────

signal transition_started(transition_type: String)
signal transition_midpoint()
signal transition_finished()


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	add_to_group("scene_transition")

	# Start fully transparent
	layer = 100  # Render above everything
	transition_overlay.color = Color(0, 0, 0, 0)
	transition_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Ensure overlay covers the full viewport
	transition_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)


## ── Public API ──────────────────────────────────────────────────────────────

## Transitions to a new area with the specified visual effect.
## transition_type: "fade_black", "slide_left", "slide_right", "door_enter"
func transition_to_area(
	area_id: String,
	spawn_position: Vector2i,
	transition_type: String = "fade_black",
) -> void:
	if is_transitioning:
		return

	is_transitioning = true
	transition_started.emit(transition_type)

	var midpoint_action := func() -> void:
		# Change the area
		GameManager.transition_to_area(area_id)

		# Set player spawn position
		var player := _get_player()
		if player:
			var grid_size: int = player.get("grid_size") if player.get("grid_size") != null else 16
			player.position = Vector2(spawn_position) * float(grid_size) + Vector2(grid_size, grid_size) * 0.5
			if player.has_method("_snap_to_grid"):
				player.set("current_grid_pos", spawn_position)

		transition_midpoint.emit()

	await _play_transition_animation(transition_type, midpoint_action)

	is_transitioning = false
	transition_finished.emit()


## Transitions to a battle scene with battle-appropriate visual effects.
func transition_to_battle(battle_data: Dictionary) -> void:
	if is_transitioning:
		return

	is_transitioning = true
	transition_started.emit("battle_enter")

	var midpoint_action := func() -> void:
		GameManager.transition_to_battle(battle_data)
		transition_midpoint.emit()

	await _play_battle_transition()

	is_transitioning = false
	transition_finished.emit()


## Transitions back from a battle to the overworld.
func transition_from_battle(result: Dictionary) -> void:
	if is_transitioning:
		return

	is_transitioning = true
	transition_started.emit("battle_exit")

	var midpoint_action := func() -> void:
		GameManager.end_battle(result)
		transition_midpoint.emit()

	await _play_transition_animation("fade_black", midpoint_action)

	# Unfreeze the player
	var player := _get_player()
	if player and player.has_method("unfreeze"):
		player.unfreeze()

	is_transitioning = false
	transition_finished.emit()


## ── Transition Animations ───────────────────────────────────────────────────

## Plays a two-phase transition: fade/slide in, execute midpoint callback, fade/slide out.
func _play_transition_animation(type: String, on_midpoint: Callable) -> void:
	# Kill any existing tween
	if _tween and _tween.is_valid():
		_tween.kill()

	transition_overlay.mouse_filter = Control.MOUSE_FILTER_STOP  # Block input

	match type:
		"fade_black":
			await _transition_fade_black(on_midpoint)
		"slide_left":
			await _transition_slide(on_midpoint, Vector2.LEFT)
		"slide_right":
			await _transition_slide(on_midpoint, Vector2.RIGHT)
		"door_enter":
			await _transition_door_enter(on_midpoint)
		_:
			await _transition_fade_black(on_midpoint)

	transition_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE  # Unblock input


## Fade to black, execute callback, fade from black.
func _transition_fade_black(on_midpoint: Callable) -> void:
	transition_overlay.color = Color(0, 0, 0, 0)
	transition_overlay.position = Vector2.ZERO

	_tween = create_tween()

	# Fade in
	_tween.tween_property(transition_overlay, "color:a", 1.0, default_duration) \
		.set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_CUBIC)

	# Midpoint callback
	_tween.tween_callback(on_midpoint)
	_tween.tween_interval(0.1)  # Brief hold at black

	# Fade out
	_tween.tween_property(transition_overlay, "color:a", 0.0, default_duration) \
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)

	await _tween.finished


## Slide overlay from one side, execute callback, slide out.
func _transition_slide(on_midpoint: Callable, direction: Vector2) -> void:
	var viewport_size: Vector2 = get_viewport().get_visible_rect().size
	transition_overlay.color = Color(0, 0, 0, 1)

	# Start off-screen
	var start_pos: Vector2 = -direction * viewport_size
	var center_pos := Vector2.ZERO
	var end_pos: Vector2 = direction * viewport_size

	transition_overlay.position = start_pos

	_tween = create_tween()

	# Slide in
	_tween.tween_property(transition_overlay, "position", center_pos, default_duration) \
		.set_ease(Tween.EASE_IN_OUT).set_trans(Tween.TRANS_CUBIC)

	# Midpoint
	_tween.tween_callback(on_midpoint)
	_tween.tween_interval(0.1)

	# Slide out
	_tween.tween_property(transition_overlay, "position", end_pos, default_duration) \
		.set_ease(Tween.EASE_IN_OUT).set_trans(Tween.TRANS_CUBIC)

	await _tween.finished

	# Reset position
	transition_overlay.position = Vector2.ZERO
	transition_overlay.color = Color(0, 0, 0, 0)


## Door-style transition: iris close, callback, iris open. Uses alpha since
## shader-based iris would be a separate enhancement.
func _transition_door_enter(on_midpoint: Callable) -> void:
	transition_overlay.color = Color(0, 0, 0, 0)
	transition_overlay.position = Vector2.ZERO

	_tween = create_tween()

	# Quick fade to black (door close)
	_tween.tween_property(transition_overlay, "color:a", 1.0, default_duration * 0.6) \
		.set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_QUAD)

	# Midpoint
	_tween.tween_callback(on_midpoint)
	_tween.tween_interval(0.3)

	# Slow fade from black (door open / eyes adjust)
	_tween.tween_property(transition_overlay, "color:a", 0.0, default_duration * 1.2) \
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)

	await _tween.finished


## ── Battle-Specific Transition ──────────────────────────────────────────────

## Battle transitions use a distinctive flash effect before fading to black.
func _play_battle_transition() -> void:
	if _tween and _tween.is_valid():
		_tween.kill()

	transition_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	transition_overlay.position = Vector2.ZERO

	_tween = create_tween()

	# Rapid white flashes (3 pulses)
	for i in range(3):
		_tween.tween_property(transition_overlay, "color", Color(1, 1, 1, 0.8), 0.08)
		_tween.tween_property(transition_overlay, "color", Color(0, 0, 0, 0), 0.08)

	# Final fade to black
	_tween.tween_property(transition_overlay, "color", Color(0, 0, 0, 1), 0.3) \
		.set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_CUBIC)

	_tween.tween_interval(0.2)

	await _tween.finished

	transition_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE


## ── Utility ─────────────────────────────────────────────────────────────────

func _get_player() -> Node:
	var players := get_tree().get_nodes_in_group("player")
	if not players.is_empty():
		return players[0]
	return null

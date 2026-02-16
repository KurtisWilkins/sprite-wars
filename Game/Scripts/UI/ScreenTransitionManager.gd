## ScreenTransitionManager — Push/pop navigation with animated transitions.
## [P8-014] Manages a navigation stack and plays slide/fade/scale transitions
## between screens. Add as a CanvasLayer autoload or scene child.
class_name ScreenTransitionManager
extends CanvasLayer

## ── Constants ────────────────────────────────────────────────────────────────

const TRANSITION_DURATION: float = 0.3
const SCREEN_WIDTH: float = 1080.0
const SCREEN_HEIGHT: float = 1920.0

## ── State ────────────────────────────────────────────────────────────────────

var navigation_stack: Array[String] = []
var current_screen: Control = null
var is_transitioning: bool = false

## ── Internal Nodes ───────────────────────────────────────────────────────────

var transition_overlay: ColorRect
var _screen_container: Control


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	layer = 10
	_build_ui()


func _build_ui() -> void:
	_screen_container = Control.new()
	_screen_container.name = "ScreenContainer"
	_screen_container.set_anchors_preset(Control.PRESET_FULL_RECT)
	_screen_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_screen_container)

	transition_overlay = ColorRect.new()
	transition_overlay.name = "TransitionOverlay"
	transition_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	transition_overlay.color = Color(0.0, 0.0, 0.0, 0.0)
	transition_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	transition_overlay.visible = false
	add_child(transition_overlay)


## ── Public API ───────────────────────────────────────────────────────────────

## Push a new screen onto the navigation stack.
func push_screen(scene_path: String, transition: String = "slide_left") -> void:
	if is_transitioning:
		return

	var packed_scene := load(scene_path) as PackedScene
	if packed_scene == null:
		push_error("ScreenTransitionManager: Failed to load scene '%s'" % scene_path)
		return

	var new_screen: Control = packed_scene.instantiate() as Control
	if new_screen == null:
		push_error("ScreenTransitionManager: Scene root must be a Control node.")
		return

	navigation_stack.append(scene_path)

	_play_transition(transition, func() -> void:
		_remove_current_screen()
		_set_current_screen(new_screen)
	)


## Pop the current screen and return to the previous one.
func pop_screen(transition: String = "slide_right") -> void:
	if is_transitioning:
		return
	if navigation_stack.size() <= 1:
		push_warning("ScreenTransitionManager: Cannot pop — stack has <= 1 screen.")
		return

	navigation_stack.pop_back()
	var previous_path: String = navigation_stack[-1]

	var packed_scene := load(previous_path) as PackedScene
	if packed_scene == null:
		push_error("ScreenTransitionManager: Failed to load scene '%s'" % previous_path)
		return

	var previous_screen: Control = packed_scene.instantiate() as Control

	_play_transition(transition, func() -> void:
		_remove_current_screen()
		_set_current_screen(previous_screen)
	)


## Replace the current screen without modifying the stack depth.
func replace_screen(scene_path: String, transition: String = "fade") -> void:
	if is_transitioning:
		return

	var packed_scene := load(scene_path) as PackedScene
	if packed_scene == null:
		push_error("ScreenTransitionManager: Failed to load scene '%s'" % scene_path)
		return

	var new_screen: Control = packed_scene.instantiate() as Control

	if not navigation_stack.is_empty():
		navigation_stack[-1] = scene_path
	else:
		navigation_stack.append(scene_path)

	_play_transition(transition, func() -> void:
		_remove_current_screen()
		_set_current_screen(new_screen)
	)


## Clear the entire navigation stack.
func clear_stack() -> void:
	navigation_stack.clear()
	_remove_current_screen()


## Get the name of the current screen (filename without extension).
func get_current_screen_name() -> String:
	if navigation_stack.is_empty():
		return ""
	var path: String = navigation_stack[-1]
	return path.get_file().get_basename()


## ── Transition Playback ──────────────────────────────────────────────────────

func _play_transition(type: String, on_midpoint: Callable) -> void:
	is_transitioning = true
	transition_overlay.visible = true
	transition_overlay.mouse_filter = Control.MOUSE_FILTER_STOP

	var tween := create_tween()
	tween.set_ease(Tween.EASE_IN_OUT)
	tween.set_trans(Tween.TRANS_CUBIC)

	match type:
		"slide_left":
			_transition_slide(tween, on_midpoint, -SCREEN_WIDTH)
		"slide_right":
			_transition_slide(tween, on_midpoint, SCREEN_WIDTH)
		"fade":
			_transition_fade(tween, on_midpoint)
		"scale_up":
			_transition_scale(tween, on_midpoint)
		"none":
			on_midpoint.call()
			_finish_transition()
			return
		_:
			_transition_fade(tween, on_midpoint)

	tween.finished.connect(_finish_transition)


func _transition_fade(tween: Tween, on_midpoint: Callable) -> void:
	transition_overlay.color = Color(0.0, 0.0, 0.0, 0.0)
	# Fade out (overlay becomes opaque).
	tween.tween_property(transition_overlay, "color:a", 1.0, TRANSITION_DURATION * 0.5)
	tween.tween_callback(on_midpoint)
	# Fade in (overlay becomes transparent).
	tween.tween_property(transition_overlay, "color:a", 0.0, TRANSITION_DURATION * 0.5)


func _transition_slide(tween: Tween, on_midpoint: Callable, offset: float) -> void:
	transition_overlay.color = Color(0.0, 0.0, 0.0, 0.0)

	if current_screen:
		var original_x: float = current_screen.position.x
		# Slide the current screen out.
		tween.tween_property(current_screen, "position:x", original_x + offset, TRANSITION_DURATION * 0.5)

	tween.tween_callback(func() -> void:
		on_midpoint.call()
		# Position the new screen offscreen and slide it in.
		if current_screen:
			current_screen.position.x = -offset
			tween.tween_property(current_screen, "position:x", 0.0, TRANSITION_DURATION * 0.5)
	)


func _transition_scale(tween: Tween, on_midpoint: Callable) -> void:
	transition_overlay.color = Color(0.0, 0.0, 0.0, 0.0)
	# Fade overlay to black.
	tween.tween_property(transition_overlay, "color:a", 1.0, TRANSITION_DURATION * 0.4)
	tween.tween_callback(on_midpoint)
	tween.tween_callback(func() -> void:
		if current_screen:
			current_screen.scale = Vector2(0.8, 0.8)
			current_screen.pivot_offset = current_screen.size / 2.0
	)
	tween.tween_property(transition_overlay, "color:a", 0.0, TRANSITION_DURATION * 0.3)
	tween.parallel().tween_callback(func() -> void:
		if current_screen:
			var scale_tween := create_tween()
			scale_tween.set_ease(Tween.EASE_OUT)
			scale_tween.set_trans(Tween.TRANS_BACK)
			scale_tween.tween_property(current_screen, "scale", Vector2.ONE, TRANSITION_DURATION * 0.3)
	)


func _finish_transition() -> void:
	is_transitioning = false
	transition_overlay.visible = false
	transition_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	transition_overlay.color = Color(0.0, 0.0, 0.0, 0.0)

	if current_screen:
		EventBus.screen_changed.emit(get_current_screen_name())


## ── Internal ─────────────────────────────────────────────────────────────────

func _remove_current_screen() -> void:
	if current_screen and is_instance_valid(current_screen):
		_screen_container.remove_child(current_screen)
		current_screen.queue_free()
		current_screen = null


func _set_current_screen(screen: Control) -> void:
	current_screen = screen
	current_screen.set_anchors_preset(Control.PRESET_FULL_RECT)
	_screen_container.add_child(current_screen)

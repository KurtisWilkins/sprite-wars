## TouchInputSystem — Unified touch input handling for mobile UI.
## [P8-015] Detects taps, long presses, swipes, drags, and pinch-to-zoom.
## Add as a child of any node that needs touch input, or use as an autoload.
class_name TouchInputSystem
extends Node

## ── Configuration ────────────────────────────────────────────────────────────

## Minimum touch target size in logical points (Apple HIG / Material spec).
const MIN_TOUCH_TARGET: int = 44

## Distance in pixels a finger must move before it counts as a drag.
@export var drag_threshold: float = 10.0

## Duration in seconds a finger must be held before triggering a long press.
@export var long_press_duration: float = 0.5

## Minimum distance in pixels for a fling to register as a swipe.
@export var swipe_threshold: float = 50.0

## ── State ────────────────────────────────────────────────────────────────────

var is_dragging: bool = false
var drag_start_pos: Vector2 = Vector2.ZERO
var drag_current_pos: Vector2 = Vector2.ZERO

var _touch_start_pos: Vector2 = Vector2.ZERO
var _touch_start_time: float = 0.0
var _is_touching: bool = false
var long_press_timer: float = 0.0
var _long_press_fired: bool = false

## Multi-touch tracking for pinch.
var _active_touches: Dictionary = {}  # finger_index -> Vector2
var _pinch_start_distance: float = 0.0
var _pinch_active: bool = false

## ── Signals ──────────────────────────────────────────────────────────────────

signal tap_detected(position: Vector2)
signal long_press_detected(position: Vector2)
signal swipe_detected(direction: Vector2, velocity: float)
signal drag_started(position: Vector2)
signal drag_updated(position: Vector2, delta: Vector2)
signal drag_ended(position: Vector2)
signal pinch_detected(center: Vector2, scale_factor: float)


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	set_process(true)


func _process(delta: float) -> void:
	if _is_touching and not is_dragging and not _long_press_fired:
		long_press_timer += delta
		if long_press_timer >= long_press_duration:
			_long_press_fired = true
			long_press_detected.emit(_touch_start_pos)


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		_handle_screen_touch(event as InputEventScreenTouch)
	elif event is InputEventScreenDrag:
		_handle_screen_drag(event as InputEventScreenDrag)
	# Also handle mouse events for editor testing.
	elif event is InputEventMouseButton:
		_handle_mouse_button(event as InputEventMouseButton)
	elif event is InputEventMouseMotion:
		_handle_mouse_motion(event as InputEventMouseMotion)


## ── Screen Touch ─────────────────────────────────────────────────────────────

func _handle_screen_touch(event: InputEventScreenTouch) -> void:
	var finger: int = event.index

	if event.pressed:
		_active_touches[finger] = event.position

		if finger == 0:
			_begin_touch(event.position)

		# Check for pinch start (two fingers down).
		if _active_touches.size() == 2:
			_start_pinch()
	else:
		if finger == 0 and _is_touching:
			_end_touch(event.position)

		_active_touches.erase(finger)

		if _active_touches.size() < 2:
			_pinch_active = false


func _handle_screen_drag(event: InputEventScreenDrag) -> void:
	var finger: int = event.index
	_active_touches[finger] = event.position

	if _pinch_active and _active_touches.size() >= 2:
		_update_pinch()
		return

	if finger != 0:
		return

	if not _is_touching:
		return

	var distance_from_start: float = event.position.distance_to(_touch_start_pos)

	if not is_dragging and distance_from_start >= drag_threshold:
		is_dragging = true
		drag_start_pos = _touch_start_pos
		drag_current_pos = event.position
		drag_started.emit(drag_start_pos)
	elif is_dragging:
		var previous_pos := drag_current_pos
		drag_current_pos = event.position
		var delta := drag_current_pos - previous_pos
		drag_updated.emit(drag_current_pos, delta)


## ── Mouse Fallback (Editor/Desktop Testing) ─────────────────────────────────

func _handle_mouse_button(event: InputEventMouseButton) -> void:
	if event.button_index != MOUSE_BUTTON_LEFT:
		return

	if event.pressed:
		_begin_touch(event.position)
	else:
		_end_touch(event.position)


func _handle_mouse_motion(event: InputEventMouseMotion) -> void:
	if not _is_touching:
		return

	var distance_from_start: float = event.position.distance_to(_touch_start_pos)

	if not is_dragging and distance_from_start >= drag_threshold:
		is_dragging = true
		drag_start_pos = _touch_start_pos
		drag_current_pos = event.position
		drag_started.emit(drag_start_pos)
	elif is_dragging:
		var previous_pos := drag_current_pos
		drag_current_pos = event.position
		var delta := drag_current_pos - previous_pos
		drag_updated.emit(drag_current_pos, delta)


## ── Touch Begin / End ────────────────────────────────────────────────────────

func _begin_touch(pos: Vector2) -> void:
	_is_touching = true
	_touch_start_pos = pos
	_touch_start_time = Time.get_ticks_msec() / 1000.0
	long_press_timer = 0.0
	_long_press_fired = false
	is_dragging = false
	drag_start_pos = pos
	drag_current_pos = pos


func _end_touch(pos: Vector2) -> void:
	if not _is_touching:
		return

	var elapsed: float = (Time.get_ticks_msec() / 1000.0) - _touch_start_time
	var distance: float = pos.distance_to(_touch_start_pos)

	if is_dragging:
		# Check if the drag ended as a swipe (fast fling).
		var swipe_velocity: float = distance / maxf(elapsed, 0.001)
		if distance >= swipe_threshold and swipe_velocity > 200.0:
			var direction: Vector2 = (pos - _touch_start_pos).normalized()
			swipe_detected.emit(direction, swipe_velocity)
		drag_ended.emit(pos)
	elif not _long_press_fired:
		# Simple tap — only if we did not fire a long press.
		if distance < drag_threshold:
			tap_detected.emit(pos)

	_is_touching = false
	is_dragging = false
	long_press_timer = 0.0
	_long_press_fired = false


## ── Pinch ────────────────────────────────────────────────────────────────────

func _start_pinch() -> void:
	var keys := _active_touches.keys()
	if keys.size() < 2:
		return
	var p1: Vector2 = _active_touches[keys[0]]
	var p2: Vector2 = _active_touches[keys[1]]
	_pinch_start_distance = p1.distance_to(p2)
	if _pinch_start_distance < 1.0:
		_pinch_start_distance = 1.0
	_pinch_active = true
	# Cancel any drag that was in progress.
	if is_dragging:
		is_dragging = false
		drag_ended.emit(drag_current_pos)


func _update_pinch() -> void:
	var keys := _active_touches.keys()
	if keys.size() < 2:
		return
	var p1: Vector2 = _active_touches[keys[0]]
	var p2: Vector2 = _active_touches[keys[1]]
	var current_distance: float = p1.distance_to(p2)
	var center: Vector2 = (p1 + p2) / 2.0
	var scale_factor: float = current_distance / maxf(_pinch_start_distance, 1.0)
	pinch_detected.emit(center, scale_factor)


## ── Utility ──────────────────────────────────────────────────────────────────

## Validate that a Control meets the minimum touch target size.
## Returns true if the control is large enough; false if too small.
static func validate_touch_target(control: Control) -> bool:
	var size := control.size
	return size.x >= MIN_TOUCH_TARGET and size.y >= MIN_TOUCH_TARGET


## Enforce minimum touch target size on a Control by adjusting custom_minimum_size.
static func enforce_touch_target(control: Control) -> void:
	var min_size := Vector2(MIN_TOUCH_TARGET, MIN_TOUCH_TARGET)
	if control.custom_minimum_size.x < min_size.x:
		control.custom_minimum_size.x = min_size.x
	if control.custom_minimum_size.y < min_size.y:
		control.custom_minimum_size.y = min_size.y


## Get the cardinal direction string from a swipe direction vector.
static func get_swipe_direction_name(direction: Vector2) -> String:
	if absf(direction.x) > absf(direction.y):
		return "right" if direction.x > 0.0 else "left"
	else:
		return "down" if direction.y > 0.0 else "up"

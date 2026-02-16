## OverworldCamera — Smooth-follow camera with map bounds, zoom presets,
## cinematic pans, and screen shake.
## [P5-003] Attaches to the player and constrains view to map bounds.
extends Camera2D

## ── Configuration ───────────────────────────────────────────────────────────

## The node this camera follows (typically the player).
@export var target: Node2D

## Interpolation speed for smooth follow (higher = snappier).
@export var smooth_speed: float = 5.0

## Rectangle defining the map boundaries in world pixels. The camera will not
## show content outside this area.
@export var map_bounds: Rect2 = Rect2()

## Zoom presets keyed by area type string.
var zoom_levels: Dictionary = {
	"overworld": Vector2(1.0, 1.0),
	"indoor": Vector2(1.5, 1.5),
	"cave": Vector2(1.3, 1.3),
	"battle_preview": Vector2(0.8, 0.8),
}

## ── Runtime State ───────────────────────────────────────────────────────────

## Active screen shake intensity and timer.
var _shake_intensity: float = 0.0
var _shake_timer: float = 0.0
var _shake_offset: Vector2 = Vector2.ZERO

## Cinematic pan state.
var _is_panning: bool = false
var _pan_tween: Tween = null


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	# Ensure this camera is current
	make_current()


func _process(delta: float) -> void:
	if _is_panning:
		_process_shake(delta)
		return

	if target and is_instance_valid(target):
		_follow_target(delta)

	_process_shake(delta)
	_apply_bounds()


## ── Follow ──────────────────────────────────────────────────────────────────

func _follow_target(delta: float) -> void:
	var target_pos: Vector2 = target.global_position
	global_position = global_position.lerp(target_pos, smooth_speed * delta)


## ── Bounds ──────────────────────────────────────────────────────────────────

## Sets the camera bounds to prevent showing area outside the map.
func set_bounds(map_rect: Rect2) -> void:
	map_bounds = map_rect
	_apply_bounds()


func _apply_bounds() -> void:
	if map_bounds.size == Vector2.ZERO:
		return

	var viewport_size: Vector2 = get_viewport_rect().size / zoom
	var half_viewport: Vector2 = viewport_size * 0.5

	var min_pos := map_bounds.position + half_viewport
	var max_pos := map_bounds.end - half_viewport

	# If the map is smaller than the viewport, center it
	if min_pos.x > max_pos.x:
		global_position.x = map_bounds.position.x + map_bounds.size.x * 0.5
	else:
		global_position.x = clampf(global_position.x, min_pos.x, max_pos.x)

	if min_pos.y > max_pos.y:
		global_position.y = map_bounds.position.y + map_bounds.size.y * 0.5
	else:
		global_position.y = clampf(global_position.y, min_pos.y, max_pos.y)

	# Apply shake offset after bounds clamping
	offset = _shake_offset


## ── Zoom ────────────────────────────────────────────────────────────────────

## Sets the zoom level based on an area type string.
## Falls back to overworld zoom if the area_type is not recognized.
func set_zoom_for_area(area_type: String) -> void:
	var target_zoom: Vector2 = zoom_levels.get(area_type, zoom_levels.get("overworld", Vector2.ONE))
	var tween := create_tween()
	tween.tween_property(self, "zoom", target_zoom, 0.5).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)


## ── Cinematic Pan ───────────────────────────────────────────────────────────

## Smoothly pans the camera to a target position over the given duration.
## Used for cutscene camera movements.
func transition_to(target_pos: Vector2, duration: float) -> void:
	_is_panning = true

	# Kill any previous pan tween
	if _pan_tween and _pan_tween.is_valid():
		_pan_tween.kill()

	_pan_tween = create_tween()
	_pan_tween.tween_property(self, "global_position", target_pos, duration) \
		.set_ease(Tween.EASE_IN_OUT) \
		.set_trans(Tween.TRANS_CUBIC)
	_pan_tween.tween_callback(_on_pan_finished)


func _on_pan_finished() -> void:
	_is_panning = false


## Returns true if the camera is currently performing a cinematic pan.
func is_panning() -> bool:
	return _is_panning


## ── Screen Shake ────────────────────────────────────────────────────────────

## Triggers a screen shake effect with the given intensity (in pixels) and
## duration (in seconds).
func shake(intensity: float, duration: float) -> void:
	_shake_intensity = intensity
	_shake_timer = duration


func _process_shake(delta: float) -> void:
	if _shake_timer <= 0.0:
		_shake_offset = Vector2.ZERO
		return

	_shake_timer -= delta
	if _shake_timer <= 0.0:
		_shake_timer = 0.0
		_shake_intensity = 0.0
		_shake_offset = Vector2.ZERO
		return

	_shake_offset = Vector2(
		randf_range(-_shake_intensity, _shake_intensity),
		randf_range(-_shake_intensity, _shake_intensity),
	)

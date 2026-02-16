## FloatingDamage -- Spawns floating damage/heal numbers and status text.
## Numbers float upward with slight random horizontal offset, scaling up for
## critical hits and displaying effectiveness text.
extends Control

## -- Constants ----------------------------------------------------------------

const FLOAT_DURATION: float = 1.5
const FLOAT_DISTANCE: float = 80.0
const HORIZONTAL_OFFSET_RANGE: float = 30.0

const DAMAGE_FONT_SIZE: int = 28
const CRIT_FONT_SIZE: int = 38
const HEAL_FONT_SIZE: int = 26
const STATUS_FONT_SIZE: int = 22
const EFFECTIVENESS_FONT_SIZE: int = 20

const COLOR_DAMAGE := Color(1.0, 0.25, 0.2)
const COLOR_CRIT := Color(1.0, 0.15, 0.05)
const COLOR_HEAL := Color(0.2, 1.0, 0.35)
const COLOR_SUPER_EFFECTIVE := Color(1.0, 0.7, 0.1)
const COLOR_NOT_EFFECTIVE := Color(0.6, 0.6, 0.7)
const COLOR_IMMUNE := Color(0.5, 0.5, 0.55)
const COLOR_MISS := Color(0.65, 0.65, 0.7)

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

## -- Public API ---------------------------------------------------------------

## Spawn a floating damage number.
func spawn_damage(amount: int, pos: Vector2, is_crit: bool, effectiveness: float) -> void:
	var text: String = str(amount)
	var color: Color = COLOR_CRIT if is_crit else COLOR_DAMAGE
	var font_size: int = CRIT_FONT_SIZE if is_crit else DAMAGE_FONT_SIZE

	var label: Label = _create_floating_label(text, pos, color, font_size)

	# Apply burst scale for crits.
	if is_crit:
		label.scale = Vector2(1.6, 1.6)
		var scale_tween := create_tween()
		scale_tween.tween_property(label, "scale", Vector2(1.0, 1.0), 0.25)\
			.set_trans(Tween.TRANS_ELASTIC)\
			.set_ease(Tween.EASE_OUT)

	_animate_float(label)

	# Spawn effectiveness text slightly below the damage number.
	if effectiveness >= 2.0:
		var eff_label := _create_floating_label(
			"Super Effective!", Vector2(pos.x, pos.y + 30.0),
			COLOR_SUPER_EFFECTIVE, EFFECTIVENESS_FONT_SIZE
		)
		_animate_float(eff_label, 0.15)  # Slight delay.
	elif effectiveness <= 0.0:
		var eff_label := _create_floating_label(
			"Immune!", Vector2(pos.x, pos.y + 30.0),
			COLOR_IMMUNE, EFFECTIVENESS_FONT_SIZE
		)
		_animate_float(eff_label, 0.15)
	elif effectiveness < 1.0 and effectiveness > 0.0:
		var eff_label := _create_floating_label(
			"Not Very Effective...", Vector2(pos.x, pos.y + 30.0),
			COLOR_NOT_EFFECTIVE, EFFECTIVENESS_FONT_SIZE
		)
		_animate_float(eff_label, 0.15)


## Spawn a floating heal number.
func spawn_heal(amount: int, pos: Vector2) -> void:
	var text: String = "+%d" % amount
	var label: Label = _create_floating_label(text, pos, COLOR_HEAL, HEAL_FONT_SIZE)
	_animate_float(label)


## Spawn arbitrary floating text (for "Immune!", "Miss!", etc.).
func spawn_text(text: String, pos: Vector2, color: Color) -> void:
	var label: Label = _create_floating_label(text, pos, color, STATUS_FONT_SIZE)
	_animate_float(label)

## -- Private Helpers ----------------------------------------------------------

## Create a Label node positioned at the given screen coordinate.
func _create_floating_label(text: String, pos: Vector2, color: Color, font_size: int) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.85))
	label.add_theme_constant_override("shadow_offset_x", 2)
	label.add_theme_constant_override("shadow_offset_y", 2)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Add random horizontal offset.
	var x_offset: float = randf_range(-HORIZONTAL_OFFSET_RANGE, HORIZONTAL_OFFSET_RANGE)
	label.position = Vector2(pos.x + x_offset - 50.0, pos.y)  # -50 to roughly center text.
	label.size = Vector2(100.0, 40.0)
	label.pivot_offset = Vector2(50.0, 20.0)

	add_child(label)
	return label


## Animate a label floating upward and fading out, then remove it.
func _animate_float(label: Label, delay: float = 0.0) -> void:
	var tween := create_tween()

	if delay > 0.0:
		tween.tween_interval(delay)

	# Float up.
	var target_y: float = label.position.y - FLOAT_DISTANCE
	tween.set_parallel(true)
	tween.tween_property(label, "position:y", target_y, FLOAT_DURATION)\
		.set_trans(Tween.TRANS_QUAD)\
		.set_ease(Tween.EASE_OUT)

	# Fade out (start fading at 60% through the animation).
	tween.tween_property(label, "modulate:a", 0.0, FLOAT_DURATION * 0.4)\
		.set_delay(FLOAT_DURATION * 0.6)\
		.set_trans(Tween.TRANS_QUAD)\
		.set_ease(Tween.EASE_IN)

	tween.set_parallel(false)

	# Remove after animation completes.
	tween.tween_callback(label.queue_free)

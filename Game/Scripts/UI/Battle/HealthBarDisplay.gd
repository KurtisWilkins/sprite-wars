## HealthBarDisplay -- Per-unit floating health bars that follow unit positions.
## Renders a ProgressBar with smooth drain animation and color-coded HP thresholds.
## Green > 60%, yellow > 30%, red <= 30%.
extends Control

## -- State --------------------------------------------------------------------

## Per-unit bar data. Keys: unit_id. Values: Dictionary with bar components.
## {bar: ProgressBar, label: Label, container: Control, max_hp: int, tween: Tween}
var bars: Dictionary = {}

## -- Color Thresholds ---------------------------------------------------------

const COLOR_HP_HIGH := Color(0.2, 0.85, 0.3)    # Green, > 60%
const COLOR_HP_MID := Color(0.95, 0.85, 0.15)    # Yellow, > 30%
const COLOR_HP_LOW := Color(0.9, 0.15, 0.15)     # Red, <= 30%
const COLOR_DRAIN := Color(1.0, 0.9, 0.3, 0.7)   # Drain trail color

const BAR_WIDTH: float = 100.0
const BAR_HEIGHT: float = 12.0
const LABEL_FONT_SIZE: int = 16
const BAR_OFFSET_Y: float = -65.0  # Offset above the unit sprite.

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	# Stretch across the full viewport so bars can be placed anywhere.
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

## -- Public API ---------------------------------------------------------------

## Add a health bar for a unit.
func add_bar(unit_id: int, max_hp: int, current_hp: int, bar_position: Vector2, team: int) -> void:
	if bars.has(unit_id):
		remove_bar(unit_id)

	# Container to hold bar + label.
	var container := Control.new()
	container.position = Vector2(bar_position.x - BAR_WIDTH / 2.0, bar_position.y + BAR_OFFSET_Y)
	container.size = Vector2(BAR_WIDTH, BAR_HEIGHT + 20.0)
	container.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Background bar (drain trail).
	var drain_bar := ProgressBar.new()
	drain_bar.position = Vector2.ZERO
	drain_bar.size = Vector2(BAR_WIDTH, BAR_HEIGHT)
	drain_bar.min_value = 0.0
	drain_bar.max_value = float(max_hp)
	drain_bar.value = float(current_hp)
	drain_bar.show_percentage = false
	drain_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_apply_bar_style(drain_bar, COLOR_DRAIN, Color(0.15, 0.15, 0.2))

	# Foreground bar (actual HP).
	var hp_bar := ProgressBar.new()
	hp_bar.position = Vector2.ZERO
	hp_bar.size = Vector2(BAR_WIDTH, BAR_HEIGHT)
	hp_bar.min_value = 0.0
	hp_bar.max_value = float(max_hp)
	hp_bar.value = float(current_hp)
	hp_bar.show_percentage = false
	hp_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var hp_color: Color = _get_hp_color(current_hp, max_hp)
	_apply_bar_style(hp_bar, hp_color, Color(0.1, 0.1, 0.15, 0.9))

	# HP label.
	var label := Label.new()
	label.position = Vector2(0.0, BAR_HEIGHT + 1.0)
	label.size = Vector2(BAR_WIDTH, 18.0)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.text = "%d / %d" % [current_hp, max_hp]
	label.add_theme_font_size_override("font_size", LABEL_FONT_SIZE)
	label.add_theme_color_override("font_color", Color.WHITE)
	label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	label.add_theme_constant_override("shadow_offset_x", 1)
	label.add_theme_constant_override("shadow_offset_y", 1)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Team indicator border.
	var border := Panel.new()
	border.position = Vector2(-2.0, -2.0)
	border.size = Vector2(BAR_WIDTH + 4.0, BAR_HEIGHT + 4.0)
	border.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var border_style := StyleBoxFlat.new()
	border_style.bg_color = Color(0, 0, 0, 0)
	border_style.border_color = Color(0.3, 0.5, 1.0) if team == 0 else Color(1.0, 0.3, 0.3)
	border_style.set_border_width_all(2)
	border_style.set_corner_radius_all(3)
	border.add_theme_stylebox_override("panel", border_style)

	container.add_child(border)
	container.add_child(drain_bar)
	container.add_child(hp_bar)
	container.add_child(label)
	add_child(container)

	bars[unit_id] = {
		"bar": hp_bar,
		"drain_bar": drain_bar,
		"label": label,
		"container": container,
		"max_hp": max_hp,
		"tween": null,
		"drain_tween": null,
	}


## Update the HP bar for a unit with optional smooth animation.
func update_bar(unit_id: int, new_hp: int, max_hp: int, animated: bool = true) -> void:
	if not bars.has(unit_id):
		return

	var data: Dictionary = bars[unit_id]
	var hp_bar: ProgressBar = data["bar"]
	var drain_bar: ProgressBar = data["drain_bar"]
	var label: Label = data["label"]

	# Update max if changed.
	hp_bar.max_value = float(max_hp)
	drain_bar.max_value = float(max_hp)
	data["max_hp"] = max_hp

	var clamped_hp: int = clampi(new_hp, 0, max_hp)

	# Update color based on new HP ratio.
	var hp_color: Color = _get_hp_color(clamped_hp, max_hp)

	if animated:
		# Kill existing tweens.
		if data["tween"] != null and data["tween"] is Tween:
			data["tween"].kill()
		if data["drain_tween"] != null and data["drain_tween"] is Tween:
			data["drain_tween"].kill()

		# Animate foreground bar immediately.
		var tween: Tween = create_tween()
		tween.tween_property(hp_bar, "value", float(clamped_hp), 0.3)\
			.set_trans(Tween.TRANS_QUAD)\
			.set_ease(Tween.EASE_OUT)
		data["tween"] = tween

		# Animate drain bar after a brief delay (trailing effect).
		var drain_tween: Tween = create_tween()
		drain_tween.tween_interval(0.5)
		drain_tween.tween_property(drain_bar, "value", float(clamped_hp), 0.6)\
			.set_trans(Tween.TRANS_QUAD)\
			.set_ease(Tween.EASE_OUT)
		data["drain_tween"] = drain_tween

		# Update the style color.
		_apply_bar_fill_color(hp_bar, hp_color)
	else:
		hp_bar.value = float(clamped_hp)
		drain_bar.value = float(clamped_hp)
		_apply_bar_fill_color(hp_bar, hp_color)

	# Update label.
	label.text = "%d / %d" % [clamped_hp, max_hp]


## Remove a health bar.
func remove_bar(unit_id: int) -> void:
	if not bars.has(unit_id):
		return

	var data: Dictionary = bars[unit_id]

	# Kill tweens.
	if data.get("tween") != null and data["tween"] is Tween:
		data["tween"].kill()
	if data.get("drain_tween") != null and data["drain_tween"] is Tween:
		data["drain_tween"].kill()

	var container: Control = data["container"]
	if container != null and is_instance_valid(container):
		container.queue_free()

	bars.erase(unit_id)


## Update positions of all bars to follow their unit sprites.
func update_positions(unit_positions: Dictionary) -> void:
	for unit_id in unit_positions:
		if bars.has(unit_id):
			var pos: Vector2 = unit_positions[unit_id]
			var container: Control = bars[unit_id]["container"]
			if container != null and is_instance_valid(container):
				container.position = Vector2(pos.x - BAR_WIDTH / 2.0, pos.y + BAR_OFFSET_Y)

## -- Private Helpers ----------------------------------------------------------

## Determine bar color based on HP percentage.
func _get_hp_color(current_hp: int, max_hp: int) -> Color:
	if max_hp <= 0:
		return COLOR_HP_LOW
	var pct: float = float(current_hp) / float(max_hp)
	if pct > 0.6:
		return COLOR_HP_HIGH
	elif pct > 0.3:
		return COLOR_HP_MID
	else:
		return COLOR_HP_LOW


## Apply a StyleBoxFlat to a ProgressBar.
func _apply_bar_style(bar: ProgressBar, fill_color: Color, bg_color: Color) -> void:
	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = fill_color
	fill_style.set_corner_radius_all(3)
	bar.add_theme_stylebox_override("fill", fill_style)

	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color = bg_color
	bg_style.set_corner_radius_all(3)
	bar.add_theme_stylebox_override("background", bg_style)


## Update just the fill color of an existing bar.
func _apply_bar_fill_color(bar: ProgressBar, color: Color) -> void:
	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = color
	fill_style.set_corner_radius_all(3)
	bar.add_theme_stylebox_override("fill", fill_style)

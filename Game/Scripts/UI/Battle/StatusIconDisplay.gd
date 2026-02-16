## StatusIconDisplay -- Per-unit status effect icon rows.
## Each unit gets an HBoxContainer of small icons showing active buffs/debuffs
## with duration counters and stack indicators. Icons follow unit positions.
extends Control

## -- State --------------------------------------------------------------------

## Per-unit icon containers. Keys: unit_id.
## Values: {container: HBoxContainer, effects: Dictionary{effect_name: icon_data}}
var icons: Dictionary = {}

## -- Constants ----------------------------------------------------------------

const ICON_SIZE: float = 28.0
const ICON_SPACING: float = 2.0
const ICON_OFFSET_Y: float = -90.0  # Above the HP bar.
const STACK_FONT_SIZE: int = 12
const DURATION_FONT_SIZE: int = 10

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

## -- Public API ---------------------------------------------------------------

## Add a status effect icon for a unit.
func add_status(unit_id: int, effect_name: String, icon: Texture2D, duration: int, stacks: int) -> void:
	# Ensure the unit has a container.
	if not icons.has(unit_id):
		var container := HBoxContainer.new()
		container.alignment = BoxContainer.ALIGNMENT_CENTER
		container.add_theme_constant_override("separation", int(ICON_SPACING))
		container.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(container)
		icons[unit_id] = {"container": container, "effects": {}}

	var data: Dictionary = icons[unit_id]
	var effects: Dictionary = data["effects"]

	# If effect already exists, update it.
	if effects.has(effect_name):
		_update_existing_icon(effects[effect_name], duration, stacks)
		return

	# Create new icon entry.
	var icon_container := PanelContainer.new()
	icon_container.custom_minimum_size = Vector2(ICON_SIZE, ICON_SIZE)
	icon_container.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var icon_style := StyleBoxFlat.new()
	icon_style.bg_color = Color(0.15, 0.15, 0.2, 0.85)
	icon_style.set_corner_radius_all(4)
	icon_style.set_border_width_all(1)
	icon_style.border_color = Color(0.5, 0.5, 0.6, 0.6)
	icon_container.add_theme_stylebox_override("panel", icon_style)

	# Icon texture.
	var icon_rect := TextureRect.new()
	icon_rect.custom_minimum_size = Vector2(ICON_SIZE - 4.0, ICON_SIZE - 4.0)
	icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if icon != null:
		icon_rect.texture = icon

	# Stack count label (bottom-right corner).
	var stack_label := Label.new()
	stack_label.text = "x%d" % stacks if stacks > 1 else ""
	stack_label.add_theme_font_size_override("font_size", STACK_FONT_SIZE)
	stack_label.add_theme_color_override("font_color", Color(1, 0.85, 0.3))
	stack_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 1))
	stack_label.add_theme_constant_override("shadow_offset_x", 1)
	stack_label.add_theme_constant_override("shadow_offset_y", 1)
	stack_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	stack_label.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
	stack_label.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Duration label (top-right corner).
	var duration_label := Label.new()
	duration_label.text = str(duration) if duration > 0 else ""
	duration_label.add_theme_font_size_override("font_size", DURATION_FONT_SIZE)
	duration_label.add_theme_color_override("font_color", Color.WHITE)
	duration_label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 1))
	duration_label.add_theme_constant_override("shadow_offset_x", 1)
	duration_label.add_theme_constant_override("shadow_offset_y", 1)
	duration_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	duration_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
	duration_label.mouse_filter = Control.MOUSE_FILTER_IGNORE

	icon_container.add_child(icon_rect)
	icon_container.add_child(stack_label)
	icon_container.add_child(duration_label)

	var container: HBoxContainer = data["container"]
	container.add_child(icon_container)

	effects[effect_name] = {
		"icon_container": icon_container,
		"icon_rect": icon_rect,
		"stack_label": stack_label,
		"duration_label": duration_label,
		"duration": duration,
		"stacks": stacks,
	}


## Remove a specific status effect icon from a unit.
func remove_status(unit_id: int, effect_name: String) -> void:
	if not icons.has(unit_id):
		return

	var effects: Dictionary = icons[unit_id]["effects"]
	if not effects.has(effect_name):
		return

	var icon_data: Dictionary = effects[effect_name]
	var icon_container: PanelContainer = icon_data["icon_container"]
	if icon_container != null and is_instance_valid(icon_container):
		# Fade out animation.
		var tween := create_tween()
		tween.tween_property(icon_container, "modulate:a", 0.0, 0.3)
		tween.tween_callback(icon_container.queue_free)

	effects.erase(effect_name)


## Update the remaining duration of a status effect.
func update_duration(unit_id: int, effect_name: String, remaining: int) -> void:
	if not icons.has(unit_id):
		return

	var effects: Dictionary = icons[unit_id]["effects"]
	if not effects.has(effect_name):
		return

	var icon_data: Dictionary = effects[effect_name]
	icon_data["duration"] = remaining
	var duration_label: Label = icon_data["duration_label"]
	duration_label.text = str(remaining) if remaining > 0 else ""

	# Flash the icon when duration is low.
	if remaining <= 2 and remaining > 0:
		var icon_container: PanelContainer = icon_data["icon_container"]
		var tween := create_tween()
		tween.tween_property(icon_container, "modulate:a", 0.4, 0.2)
		tween.tween_property(icon_container, "modulate:a", 1.0, 0.2)


## Clear all status icons for a unit.
func clear_unit(unit_id: int) -> void:
	if not icons.has(unit_id):
		return

	var data: Dictionary = icons[unit_id]
	var container: HBoxContainer = data["container"]
	if container != null and is_instance_valid(container):
		container.queue_free()

	icons.erase(unit_id)


## Update positions of icon containers to follow units.
func update_positions(unit_positions: Dictionary) -> void:
	for unit_id in unit_positions:
		if icons.has(unit_id):
			var pos: Vector2 = unit_positions[unit_id]
			var container: HBoxContainer = icons[unit_id]["container"]
			if container != null and is_instance_valid(container):
				var container_width: float = container.size.x
				container.position = Vector2(
					pos.x - container_width / 2.0,
					pos.y + ICON_OFFSET_Y
				)

## -- Private Helpers ----------------------------------------------------------

## Update an existing icon entry with new duration and stacks.
func _update_existing_icon(icon_data: Dictionary, duration: int, stacks: int) -> void:
	icon_data["duration"] = duration
	icon_data["stacks"] = stacks

	var duration_label: Label = icon_data["duration_label"]
	duration_label.text = str(duration) if duration > 0 else ""

	var stack_label: Label = icon_data["stack_label"]
	stack_label.text = "x%d" % stacks if stacks > 1 else ""

	# Brief flash to indicate update.
	var icon_container: PanelContainer = icon_data["icon_container"]
	var tween := create_tween()
	tween.tween_property(icon_container, "modulate", Color(1.5, 1.5, 1.5, 1.0), 0.15)
	tween.tween_property(icon_container, "modulate", Color.WHITE, 0.15)

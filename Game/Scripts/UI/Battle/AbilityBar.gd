## AbilityBar -- Horizontal bar of 4 ability buttons for player input.
## Each button displays ability icon, name, PP count, cooldown overlay, and
## element-colored border. Slides in/out from the bottom of the screen.
extends HBoxContainer

## -- Signals ------------------------------------------------------------------

signal ability_selected(ability_id: int)

## -- State --------------------------------------------------------------------

## The 4 ability button containers.
var ability_buttons: Array[Button] = []

## Cached ability data for each slot. Array of Dictionary.
var _ability_data: Array[Dictionary] = []

## Sub-components per button.
var _button_components: Array[Dictionary] = []  # {icon, name_label, pp_label, cooldown_overlay, cooldown_label, border}

## Whether the bar is currently visible.
var _is_visible: bool = false

## -- Constants ----------------------------------------------------------------

const BUTTON_SIZE := Vector2(240, 120)
const BUTTON_SPACING: int = 8
const ICON_SIZE: float = 48.0
const PP_FONT_SIZE: int = 16
const NAME_FONT_SIZE: int = 18
const COOLDOWN_FONT_SIZE: int = 28
const SLIDE_DURATION: float = 0.35

## Element color mapping for borders.
const ELEMENT_COLORS: Dictionary = {
	"Fire": Color(1.0, 0.35, 0.1),
	"Water": Color(0.2, 0.5, 1.0),
	"Earth": Color(0.6, 0.45, 0.2),
	"Wind": Color(0.5, 0.9, 0.6),
	"Ice": Color(0.6, 0.85, 1.0),
	"Electric": Color(1.0, 0.9, 0.2),
	"Nature": Color(0.3, 0.75, 0.2),
	"Poison": Color(0.65, 0.2, 0.8),
	"Light": Color(1.0, 0.95, 0.7),
	"Dark": Color(0.35, 0.15, 0.5),
	"Metal": Color(0.7, 0.7, 0.75),
	"Psychic": Color(1.0, 0.45, 0.7),
	"Spirit": Color(0.5, 0.3, 0.8),
	"Void": Color(0.2, 0.1, 0.3),
}

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	alignment = BoxContainer.ALIGNMENT_CENTER
	add_theme_constant_override("separation", BUTTON_SPACING)

	# Position at the bottom of the screen.
	set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	position.y = 1920.0  # Start offscreen below viewport.
	size = Vector2(1080.0, BUTTON_SIZE.y + 20.0)

	# Create 4 ability buttons.
	for i in range(4):
		var btn_data: Dictionary = _create_ability_button(i)
		ability_buttons.append(btn_data["button"])
		_button_components.append(btn_data)
		_ability_data.append({})

## -- Public API ---------------------------------------------------------------

## Set the abilities displayed on the bar.
## Each entry: {ability_id: int, ability_name: String, element_type: String,
##              icon: Texture2D, pp_current: int, pp_max: int, cooldown: int}
func set_abilities(abilities: Array[Dictionary]) -> void:
	for i in range(4):
		if i < abilities.size():
			_ability_data[i] = abilities[i]
			_update_button_display(i, abilities[i])
			ability_buttons[i].visible = true
		else:
			_ability_data[i] = {}
			ability_buttons[i].visible = false


## Enable or disable a specific ability button (e.g., on cooldown or no PP).
func set_button_enabled(index: int, enabled: bool) -> void:
	if index < 0 or index >= ability_buttons.size():
		return
	ability_buttons[index].disabled = not enabled
	var comps: Dictionary = _button_components[index]
	if enabled:
		ability_buttons[index].modulate.a = 1.0
		comps["cooldown_overlay"].visible = false
	else:
		ability_buttons[index].modulate.a = 0.55
		# Show cooldown overlay if we have cooldown data.
		var cd: int = _ability_data[index].get("cooldown", 0)
		if cd > 0:
			comps["cooldown_overlay"].visible = true
			comps["cooldown_label"].text = str(cd)


## Update cooldown display on a button.
func update_cooldown(index: int, turns_remaining: int) -> void:
	if index < 0 or index >= _button_components.size():
		return
	var comps: Dictionary = _button_components[index]
	if turns_remaining > 0:
		comps["cooldown_overlay"].visible = true
		comps["cooldown_label"].text = str(turns_remaining)
		ability_buttons[index].disabled = true
		ability_buttons[index].modulate.a = 0.55
	else:
		comps["cooldown_overlay"].visible = false
		ability_buttons[index].disabled = false
		ability_buttons[index].modulate.a = 1.0


## Update PP display on a button.
func update_pp(index: int, current_pp: int, max_pp: int) -> void:
	if index < 0 or index >= _button_components.size():
		return
	var comps: Dictionary = _button_components[index]
	comps["pp_label"].text = "PP %d/%d" % [current_pp, max_pp]
	if current_pp <= 0:
		set_button_enabled(index, false)


## Slide the bar into view from below.
func show_bar() -> void:
	if _is_visible:
		return
	_is_visible = true
	var target_y: float = 1920.0 - BUTTON_SIZE.y - 40.0
	var tween := create_tween()
	tween.tween_property(self, "position:y", target_y, SLIDE_DURATION)\
		.set_trans(Tween.TRANS_BACK)\
		.set_ease(Tween.EASE_OUT)


## Slide the bar offscreen below.
func hide_bar() -> void:
	if not _is_visible:
		return
	_is_visible = false
	var tween := create_tween()
	tween.tween_property(self, "position:y", 1920.0, SLIDE_DURATION)\
		.set_trans(Tween.TRANS_QUAD)\
		.set_ease(Tween.EASE_IN)

## -- Private: Button Construction ---------------------------------------------

## Create a single ability button with all sub-components.
func _create_ability_button(index: int) -> Dictionary:
	var button := Button.new()
	button.custom_minimum_size = BUTTON_SIZE
	button.mouse_filter = Control.MOUSE_FILTER_STOP
	button.focus_mode = Control.FOCUS_NONE

	# Base button style.
	var normal_style := StyleBoxFlat.new()
	normal_style.bg_color = Color(0.12, 0.12, 0.18, 0.92)
	normal_style.set_corner_radius_all(8)
	normal_style.set_border_width_all(3)
	normal_style.border_color = Color(0.4, 0.4, 0.5)
	normal_style.set_content_margin_all(6)
	button.add_theme_stylebox_override("normal", normal_style)

	var pressed_style := normal_style.duplicate()
	pressed_style.bg_color = Color(0.2, 0.2, 0.3, 0.95)
	button.add_theme_stylebox_override("pressed", pressed_style)

	var disabled_style := normal_style.duplicate()
	disabled_style.bg_color = Color(0.08, 0.08, 0.1, 0.9)
	disabled_style.border_color = Color(0.25, 0.25, 0.3)
	button.add_theme_stylebox_override("disabled", disabled_style)

	# Remove default button text.
	button.text = ""

	# Internal layout: VBox with icon row + name + PP.
	var vbox := VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 2)
	vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Icon row.
	var icon_rect := TextureRect.new()
	icon_rect.custom_minimum_size = Vector2(ICON_SIZE, ICON_SIZE)
	icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Ability name.
	var name_label := Label.new()
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", NAME_FONT_SIZE)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	name_label.text = "---"
	name_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	name_label.clip_text = true
	name_label.custom_minimum_size.x = BUTTON_SIZE.x - 16.0

	# PP text.
	var pp_label := Label.new()
	pp_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pp_label.add_theme_font_size_override("font_size", PP_FONT_SIZE)
	pp_label.add_theme_color_override("font_color", Color(0.7, 0.75, 0.85))
	pp_label.text = "PP -/-"
	pp_label.mouse_filter = Control.MOUSE_FILTER_IGNORE

	vbox.add_child(icon_rect)
	vbox.add_child(name_label)
	vbox.add_child(pp_label)
	button.add_child(vbox)

	# Cooldown overlay (semi-transparent dark panel with turn count).
	var cooldown_overlay := Panel.new()
	cooldown_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	cooldown_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cooldown_overlay.visible = false
	var cd_style := StyleBoxFlat.new()
	cd_style.bg_color = Color(0, 0, 0, 0.65)
	cd_style.set_corner_radius_all(8)
	cooldown_overlay.add_theme_stylebox_override("panel", cd_style)

	var cooldown_label := Label.new()
	cooldown_label.set_anchors_preset(Control.PRESET_CENTER)
	cooldown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	cooldown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	cooldown_label.add_theme_font_size_override("font_size", COOLDOWN_FONT_SIZE)
	cooldown_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3))
	cooldown_label.text = ""
	cooldown_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cooldown_overlay.add_child(cooldown_label)

	button.add_child(cooldown_overlay)

	# Connect press signal.
	button.pressed.connect(_on_ability_pressed.bind(index))

	add_child(button)

	return {
		"button": button,
		"icon": icon_rect,
		"name_label": name_label,
		"pp_label": pp_label,
		"cooldown_overlay": cooldown_overlay,
		"cooldown_label": cooldown_label,
		"normal_style": normal_style,
	}


## Update a button's display with ability data.
func _update_button_display(index: int, data: Dictionary) -> void:
	var comps: Dictionary = _button_components[index]

	# Set icon.
	var icon_texture: Texture2D = data.get("icon", null)
	comps["icon"].texture = icon_texture

	# Set name.
	comps["name_label"].text = str(data.get("ability_name", "---"))

	# Set PP.
	var pp_cur: int = data.get("pp_current", 0)
	var pp_max: int = data.get("pp_max", 0)
	comps["pp_label"].text = "PP %d/%d" % [pp_cur, pp_max]

	# Set element color border.
	var element: String = data.get("element_type", "")
	var border_color: Color = ELEMENT_COLORS.get(element, Color(0.4, 0.4, 0.5))
	var style: StyleBoxFlat = comps["normal_style"]
	style.border_color = border_color

	# Handle cooldown.
	var cooldown: int = data.get("cooldown", 0)
	if cooldown > 0:
		update_cooldown(index, cooldown)
	elif pp_cur <= 0:
		set_button_enabled(index, false)
	else:
		set_button_enabled(index, true)

## -- Signal Handlers ----------------------------------------------------------

func _on_ability_pressed(index: int) -> void:
	if index >= 0 and index < _ability_data.size():
		var data: Dictionary = _ability_data[index]
		var ability_id: int = data.get("ability_id", -1)
		if ability_id >= 0:
			ability_selected.emit(ability_id)

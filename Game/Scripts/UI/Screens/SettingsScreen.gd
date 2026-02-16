## SettingsScreen — Audio, gameplay, and display settings.
## [P8-009] All settings persist to user:// via ConfigFile.
## Portrait layout 1080x1920, mobile-first with large touch targets.
class_name SettingsScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_PATH: String = "user://settings.cfg"
const SECTION: String = "settings"
const LABEL_FONT_SIZE: int = 22
const SLIDER_MIN_HEIGHT: float = 48.0
const ROW_SPACING: int = 12

## ── Node References ──────────────────────────────────────────────────────────

var music_slider: HSlider
var sfx_slider: HSlider
var ambient_slider: HSlider
var music_mute: CheckButton
var sfx_mute: CheckButton
var battle_speed_option: OptionButton
var animation_toggle: CheckButton
var text_size_option: OptionButton
var back_button: Button

## ── Internal ─────────────────────────────────────────────────────────────────

var _scroll_container: ScrollContainer
var _content: VBoxContainer


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	_build_ui()
	load_settings()


func _build_ui() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)

	# Background.
	var bg := ColorRect.new()
	bg.name = "Background"
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.08, 0.08, 0.12, 1.0)
	add_child(bg)

	# Root VBox.
	var root := VBoxContainer.new()
	root.name = "Root"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 0)
	add_child(root)

	# Header bar.
	var header := _create_header()
	root.add_child(header)

	# Scrollable content.
	_scroll_container = ScrollContainer.new()
	_scroll_container.name = "ScrollContainer"
	_scroll_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_scroll_container.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	root.add_child(_scroll_container)

	_content = VBoxContainer.new()
	_content.name = "Content"
	_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_theme_constant_override("separation", 8)
	_scroll_container.add_child(_content)

	# Padding.
	var pad := MarginContainer.new()
	pad.add_theme_constant_override("margin_left", 32)
	pad.add_theme_constant_override("margin_right", 32)
	pad.add_theme_constant_override("margin_top", 20)
	pad.add_theme_constant_override("margin_bottom", 20)
	pad.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_child(pad)

	var inner := VBoxContainer.new()
	inner.add_theme_constant_override("separation", ROW_SPACING)
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pad.add_child(inner)

	# --- Audio Section ---
	inner.add_child(_create_section_label("Audio"))

	music_slider = _create_slider_row(inner, "Music Volume", 0.0, 1.0, 0.8)
	music_slider.value_changed.connect(func(val: float) -> void: _on_slider_changed(val, "music"))

	music_mute = _create_check_row(inner, "Mute Music")
	music_mute.toggled.connect(func(pressed: bool) -> void: _on_mute_toggled(pressed, "music"))

	sfx_slider = _create_slider_row(inner, "SFX Volume", 0.0, 1.0, 0.8)
	sfx_slider.value_changed.connect(func(val: float) -> void: _on_slider_changed(val, "sfx"))

	sfx_mute = _create_check_row(inner, "Mute SFX")
	sfx_mute.toggled.connect(func(pressed: bool) -> void: _on_mute_toggled(pressed, "sfx"))

	ambient_slider = _create_slider_row(inner, "Ambient Volume", 0.0, 1.0, 0.6)
	ambient_slider.value_changed.connect(func(val: float) -> void: _on_slider_changed(val, "ambient"))

	inner.add_child(HSeparator.new())

	# --- Gameplay Section ---
	inner.add_child(_create_section_label("Gameplay"))

	var speed_row := _create_option_row(inner, "Battle Speed")
	battle_speed_option = speed_row
	battle_speed_option.add_item("1x", 0)
	battle_speed_option.add_item("2x", 1)
	battle_speed_option.add_item("4x", 2)
	battle_speed_option.item_selected.connect(func(_idx: int) -> void: save_settings())

	animation_toggle = _create_check_row(inner, "Show Animations")
	animation_toggle.button_pressed = true
	animation_toggle.toggled.connect(func(_pressed: bool) -> void: save_settings())

	inner.add_child(HSeparator.new())

	# --- Display Section ---
	inner.add_child(_create_section_label("Display"))

	var text_row := _create_option_row(inner, "Text Size")
	text_size_option = text_row
	text_size_option.add_item("Small", 0)
	text_size_option.add_item("Medium", 1)
	text_size_option.add_item("Large", 2)
	text_size_option.selected = 1
	text_size_option.item_selected.connect(func(_idx: int) -> void: save_settings())

	# Bottom safe area.
	var safe := Control.new()
	safe.custom_minimum_size.y = 48.0
	inner.add_child(safe)


## ── Header ───────────────────────────────────────────────────────────────────

func _create_header() -> PanelContainer:
	var header := PanelContainer.new()
	header.custom_minimum_size.y = 80.0

	var header_style := StyleBoxFlat.new()
	header_style.bg_color = Color(0.1, 0.1, 0.15, 1.0)
	header_style.content_margin_left = 16.0
	header_style.content_margin_right = 16.0
	header.add_theme_stylebox_override("panel", header_style)

	var hbox := HBoxContainer.new()
	hbox.alignment = BoxContainer.ALIGNMENT_BEGIN
	header.add_child(hbox)

	back_button = Button.new()
	back_button.text = "< Back"
	back_button.custom_minimum_size = Vector2(120.0, 56.0)
	back_button.add_theme_font_size_override("font_size", 22)

	var back_style := StyleBoxFlat.new()
	back_style.bg_color = Color(0.2, 0.2, 0.28, 1.0)
	back_style.corner_radius_top_left = 10
	back_style.corner_radius_top_right = 10
	back_style.corner_radius_bottom_left = 10
	back_style.corner_radius_bottom_right = 10
	back_button.add_theme_stylebox_override("normal", back_style)
	back_button.pressed.connect(_on_back_pressed)
	hbox.add_child(back_button)

	var title := Label.new()
	title.text = "Settings"
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", Color.WHITE)
	hbox.add_child(title)

	# Spacer to balance back button.
	var spacer := Control.new()
	spacer.custom_minimum_size.x = 120.0
	hbox.add_child(spacer)

	return header


## ── Row Factories ────────────────────────────────────────────────────────────

func _create_section_label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 26)
	label.add_theme_color_override("font_color", Color(0.7, 0.75, 0.9, 1.0))
	return label


func _create_slider_row(parent: VBoxContainer, label_text: String, min_val: float, max_val: float, default_val: float) -> HSlider:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	parent.add_child(row)

	var label := Label.new()
	label.text = label_text
	label.custom_minimum_size.x = 280.0
	label.add_theme_font_size_override("font_size", LABEL_FONT_SIZE)
	label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85))
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	row.add_child(label)

	var slider := HSlider.new()
	slider.min_value = min_val
	slider.max_value = max_val
	slider.step = 0.05
	slider.value = default_val
	slider.custom_minimum_size = Vector2(0.0, SLIDER_MIN_HEIGHT)
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(slider)

	var value_label := Label.new()
	value_label.text = "%d%%" % int(default_val * 100.0)
	value_label.custom_minimum_size.x = 64.0
	value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	value_label.add_theme_font_size_override("font_size", 20)
	value_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	row.add_child(value_label)

	slider.value_changed.connect(func(val: float) -> void:
		value_label.text = "%d%%" % int(val * 100.0)
	)

	return slider


func _create_check_row(parent: VBoxContainer, label_text: String) -> CheckButton:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	parent.add_child(row)

	var label := Label.new()
	label.text = label_text
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.add_theme_font_size_override("font_size", LABEL_FONT_SIZE)
	label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85))
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	row.add_child(label)

	var toggle := CheckButton.new()
	toggle.custom_minimum_size = Vector2(80.0, 48.0)
	row.add_child(toggle)

	return toggle


func _create_option_row(parent: VBoxContainer, label_text: String) -> OptionButton:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	parent.add_child(row)

	var label := Label.new()
	label.text = label_text
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.add_theme_font_size_override("font_size", LABEL_FONT_SIZE)
	label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.85))
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	row.add_child(label)

	var option := OptionButton.new()
	option.custom_minimum_size = Vector2(200.0, 48.0)
	option.add_theme_font_size_override("font_size", 20)
	row.add_child(option)

	return option


## ── Settings Persistence ─────────────────────────────────────────────────────

func save_settings() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value(SECTION, "music_volume", music_slider.value)
	cfg.set_value(SECTION, "sfx_volume", sfx_slider.value)
	cfg.set_value(SECTION, "ambient_volume", ambient_slider.value)
	cfg.set_value(SECTION, "music_muted", music_mute.button_pressed)
	cfg.set_value(SECTION, "sfx_muted", sfx_mute.button_pressed)
	cfg.set_value(SECTION, "battle_speed", battle_speed_option.selected)
	cfg.set_value(SECTION, "show_animations", animation_toggle.button_pressed)
	cfg.set_value(SECTION, "text_size", text_size_option.selected)
	cfg.save(SETTINGS_PATH)


func load_settings() -> Dictionary:
	var cfg := ConfigFile.new()
	var err := cfg.load(SETTINGS_PATH)
	if err != OK:
		return {}

	var data: Dictionary = {}

	music_slider.value = cfg.get_value(SECTION, "music_volume", 0.8)
	data["music_volume"] = music_slider.value

	sfx_slider.value = cfg.get_value(SECTION, "sfx_volume", 0.8)
	data["sfx_volume"] = sfx_slider.value

	ambient_slider.value = cfg.get_value(SECTION, "ambient_volume", 0.6)
	data["ambient_volume"] = ambient_slider.value

	music_mute.button_pressed = cfg.get_value(SECTION, "music_muted", false)
	data["music_muted"] = music_mute.button_pressed

	sfx_mute.button_pressed = cfg.get_value(SECTION, "sfx_muted", false)
	data["sfx_muted"] = sfx_mute.button_pressed

	battle_speed_option.selected = cfg.get_value(SECTION, "battle_speed", 0)
	data["battle_speed"] = battle_speed_option.selected

	animation_toggle.button_pressed = cfg.get_value(SECTION, "show_animations", true)
	data["show_animations"] = animation_toggle.button_pressed

	text_size_option.selected = cfg.get_value(SECTION, "text_size", 1)
	data["text_size"] = text_size_option.selected

	return data


## ── Handlers ─────────────────────────────────────────────────────────────────

func _on_slider_changed(_value: float, _category: String) -> void:
	save_settings()
	# Apply volume changes to audio buses.
	match _category:
		"music":
			var bus_idx := AudioServer.get_bus_index("Music")
			if bus_idx >= 0:
				AudioServer.set_bus_volume_db(bus_idx, linear_to_db(_value))
		"sfx":
			var bus_idx := AudioServer.get_bus_index("SFX")
			if bus_idx >= 0:
				AudioServer.set_bus_volume_db(bus_idx, linear_to_db(_value))
		"ambient":
			var bus_idx := AudioServer.get_bus_index("Ambient")
			if bus_idx >= 0:
				AudioServer.set_bus_volume_db(bus_idx, linear_to_db(_value))


func _on_mute_toggled(pressed: bool, category: String) -> void:
	save_settings()
	match category:
		"music":
			var bus_idx := AudioServer.get_bus_index("Music")
			if bus_idx >= 0:
				AudioServer.set_bus_mute(bus_idx, pressed)
		"sfx":
			var bus_idx := AudioServer.get_bus_index("SFX")
			if bus_idx >= 0:
				AudioServer.set_bus_mute(bus_idx, pressed)


func _on_back_pressed() -> void:
	save_settings()
	var transition_mgr := get_tree().root.find_child("ScreenTransitionManager", true, false)
	if transition_mgr is ScreenTransitionManager:
		(transition_mgr as ScreenTransitionManager).pop_screen("slide_right")

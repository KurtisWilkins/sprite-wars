## SettingsScreen — Audio, visual, and gameplay settings with persistent save.
## [P8-009] Provides sliders for music/sfx/ambient volumes, mute toggles,
## battle speed, animation toggle, and text size. All built programmatically.
class_name SettingsScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_PATH: String = "user://settings.cfg"
const LABEL_FONT_SIZE: int = 22
const HEADER_FONT_SIZE: int = 28
const SECTION_SPACING: int = 32
const ROW_SPACING: int = 16
const SLIDER_MIN_HEIGHT: float = 48.0

## ── Nodes ────────────────────────────────────────────────────────────────────

var music_slider: HSlider
var sfx_slider: HSlider
var ambient_slider: HSlider
var music_mute: CheckButton
var sfx_mute: CheckButton
var battle_speed_option: OptionButton
var animation_toggle: CheckButton
var text_size_option: OptionButton
var back_button: Button

var _scroll: ScrollContainer
var _vbox: VBoxContainer


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build_ui()
	_load_and_apply_settings()


func _build_ui() -> void:
	# Background.
	var bg := ColorRect.new()
	bg.name = "Background"
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.06, 0.06, 0.1, 1.0)
	add_child(bg)

	# Top bar with back button and title.
	var top_bar := _build_top_bar("Settings")
	add_child(top_bar)

	# Scrollable content.
	_scroll = ScrollContainer.new()
	_scroll.name = "Scroll"
	_scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	_scroll.offset_top = 100.0
	_scroll.offset_bottom = 0.0
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(_scroll)

	_vbox = VBoxContainer.new()
	_vbox.name = "SettingsContent"
	_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_vbox.add_theme_constant_override("separation", SECTION_SPACING)

	# Pad content.
	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.add_theme_constant_override("margin_left", 40)
	margin.add_theme_constant_override("margin_right", 40)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_bottom", 60)
	margin.add_child(_vbox)
	_scroll.add_child(margin)

	# ── Audio Section ─────────────────────────────────────────────────────────
	_add_section_header("Audio")

	music_slider = _add_slider_row("Music Volume", 0.0, 1.0, 0.8)
	music_slider.value_changed.connect(func(val: float) -> void: _on_slider_changed(val, "music"))

	music_mute = _add_check_row("Mute Music")
	music_mute.toggled.connect(func(pressed: bool) -> void:
		AudioServer.set_bus_mute(AudioServer.get_bus_index("Music"), pressed)
		_auto_save()
	)

	sfx_slider = _add_slider_row("SFX Volume", 0.0, 1.0, 0.8)
	sfx_slider.value_changed.connect(func(val: float) -> void: _on_slider_changed(val, "sfx"))

	sfx_mute = _add_check_row("Mute SFX")
	sfx_mute.toggled.connect(func(pressed: bool) -> void:
		AudioServer.set_bus_mute(AudioServer.get_bus_index("SFX"), pressed)
		_auto_save()
	)

	ambient_slider = _add_slider_row("Ambient Volume", 0.0, 1.0, 0.6)
	ambient_slider.value_changed.connect(func(val: float) -> void: _on_slider_changed(val, "ambient"))

	# ── Gameplay Section ──────────────────────────────────────────────────────
	_add_section_header("Gameplay")

	battle_speed_option = _add_option_row("Battle Speed", ["1x", "2x", "4x"])
	battle_speed_option.item_selected.connect(func(_idx: int) -> void: _auto_save())

	animation_toggle = _add_check_row("Show Battle Animations")
	animation_toggle.button_pressed = true
	animation_toggle.toggled.connect(func(_pressed: bool) -> void: _auto_save())

	# ── Display Section ───────────────────────────────────────────────────────
	_add_section_header("Display")

	text_size_option = _add_option_row("Text Size", ["Small", "Medium", "Large"])
	text_size_option.select(1)  # Default to Medium.
	text_size_option.item_selected.connect(func(_idx: int) -> void: _auto_save())


## ── Top Bar ──────────────────────────────────────────────────────────────────

func _build_top_bar(title: String) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = "TopBar"
	panel.set_anchors_preset(Control.PRESET_TOP_WIDE)
	panel.custom_minimum_size = Vector2(0.0, 96.0)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.08, 0.14, 1.0)
	style.border_width_bottom = 2
	style.border_color = Color(0.2, 0.2, 0.3, 1.0)
	style.content_margin_left = 16.0
	style.content_margin_right = 16.0
	panel.add_theme_stylebox_override("panel", style)

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 16)
	panel.add_child(hbox)

	back_button = Button.new()
	back_button.name = "BackButton"
	back_button.text = "<  Back"
	back_button.custom_minimum_size = Vector2(120.0, 56.0)
	back_button.add_theme_font_size_override("font_size", 22)

	var back_style := StyleBoxFlat.new()
	back_style.bg_color = Color(0.15, 0.15, 0.22, 1.0)
	back_style.corner_radius_top_left = 10
	back_style.corner_radius_top_right = 10
	back_style.corner_radius_bottom_left = 10
	back_style.corner_radius_bottom_right = 10
	back_button.add_theme_stylebox_override("normal", back_style)
	back_button.pressed.connect(_on_back_pressed)
	hbox.add_child(back_button)

	var title_label := Label.new()
	title_label.text = title
	title_label.add_theme_font_size_override("font_size", 32)
	title_label.add_theme_color_override("font_color", Color.WHITE)
	title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(title_label)

	return panel


## ── UI Builders ──────────────────────────────────────────────────────────────

func _add_section_header(text: String) -> void:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", HEADER_FONT_SIZE)
	label.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0, 1.0))
	_vbox.add_child(label)

	var sep := HSeparator.new()
	_vbox.add_child(sep)


func _add_slider_row(label_text: String, min_val: float, max_val: float, default_val: float) -> HSlider:
	var row := VBoxContainer.new()
	row.add_theme_constant_override("separation", 4)

	var label := Label.new()
	label.text = label_text
	label.add_theme_font_size_override("font_size", LABEL_FONT_SIZE)
	label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.9, 1.0))
	row.add_child(label)

	var slider_row := HBoxContainer.new()
	slider_row.add_theme_constant_override("separation", 12)

	var slider := HSlider.new()
	slider.min_value = min_val
	slider.max_value = max_val
	slider.step = 0.01
	slider.value = default_val
	slider.custom_minimum_size = Vector2(0.0, SLIDER_MIN_HEIGHT)
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	slider_row.add_child(slider)

	var value_label := Label.new()
	value_label.text = "%d%%" % int(default_val * 100.0)
	value_label.custom_minimum_size = Vector2(60.0, 0.0)
	value_label.add_theme_font_size_override("font_size", 20)
	value_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75, 1.0))
	slider_row.add_child(value_label)

	slider.value_changed.connect(func(val: float) -> void:
		value_label.text = "%d%%" % int(val * 100.0)
	)

	row.add_child(slider_row)
	_vbox.add_child(row)
	return slider


func _add_check_row(label_text: String) -> CheckButton:
	var check := CheckButton.new()
	check.text = label_text
	check.custom_minimum_size = Vector2(0.0, 52.0)
	check.add_theme_font_size_override("font_size", LABEL_FONT_SIZE)
	check.add_theme_color_override("font_color", Color(0.85, 0.85, 0.9, 1.0))
	_vbox.add_child(check)
	return check


func _add_option_row(label_text: String, options: Array) -> OptionButton:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)

	var label := Label.new()
	label.text = label_text
	label.add_theme_font_size_override("font_size", LABEL_FONT_SIZE)
	label.add_theme_color_override("font_color", Color(0.85, 0.85, 0.9, 1.0))
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	row.add_child(label)

	var option := OptionButton.new()
	option.custom_minimum_size = Vector2(200.0, 52.0)
	option.add_theme_font_size_override("font_size", 20)
	for opt_text in options:
		option.add_item(opt_text)
	row.add_child(option)

	_vbox.add_child(row)
	return option


## ── Audio Bus Helpers ────────────────────────────────────────────────────────

func _on_slider_changed(value: float, category: String) -> void:
	var bus_name: String = ""
	match category:
		"music":
			bus_name = "Music"
		"sfx":
			bus_name = "SFX"
		"ambient":
			bus_name = "Ambient"
		_:
			bus_name = "Master"

	var bus_idx: int = AudioServer.get_bus_index(bus_name)
	if bus_idx >= 0:
		# Convert linear to dB. Mute at 0.
		if value <= 0.001:
			AudioServer.set_bus_volume_db(bus_idx, -80.0)
		else:
			AudioServer.set_bus_volume_db(bus_idx, linear_to_db(value))

	_auto_save()


## ── Save / Load ──────────────────────────────────────────────────────────────

func save_settings() -> void:
	var config := ConfigFile.new()
	config.set_value("audio", "music_volume", music_slider.value)
	config.set_value("audio", "sfx_volume", sfx_slider.value)
	config.set_value("audio", "ambient_volume", ambient_slider.value)
	config.set_value("audio", "music_muted", music_mute.button_pressed)
	config.set_value("audio", "sfx_muted", sfx_mute.button_pressed)
	config.set_value("gameplay", "battle_speed", battle_speed_option.selected)
	config.set_value("gameplay", "show_animations", animation_toggle.button_pressed)
	config.set_value("display", "text_size", text_size_option.selected)
	config.save(SETTINGS_PATH)


func load_settings() -> Dictionary:
	var config := ConfigFile.new()
	var err := config.load(SETTINGS_PATH)
	if err != OK:
		return _default_settings()

	var settings: Dictionary = {
		"music_volume": config.get_value("audio", "music_volume", 0.8),
		"sfx_volume": config.get_value("audio", "sfx_volume", 0.8),
		"ambient_volume": config.get_value("audio", "ambient_volume", 0.6),
		"music_muted": config.get_value("audio", "music_muted", false),
		"sfx_muted": config.get_value("audio", "sfx_muted", false),
		"battle_speed": config.get_value("gameplay", "battle_speed", 0),
		"show_animations": config.get_value("gameplay", "show_animations", true),
		"text_size": config.get_value("display", "text_size", 1),
	}
	return settings


func _default_settings() -> Dictionary:
	return {
		"music_volume": 0.8,
		"sfx_volume": 0.8,
		"ambient_volume": 0.6,
		"music_muted": false,
		"sfx_muted": false,
		"battle_speed": 0,
		"show_animations": true,
		"text_size": 1,
	}


func _load_and_apply_settings() -> void:
	var settings := load_settings()
	music_slider.value = settings.get("music_volume", 0.8)
	sfx_slider.value = settings.get("sfx_volume", 0.8)
	ambient_slider.value = settings.get("ambient_volume", 0.6)
	music_mute.button_pressed = settings.get("music_muted", false)
	sfx_mute.button_pressed = settings.get("sfx_muted", false)
	battle_speed_option.select(int(settings.get("battle_speed", 0)))
	animation_toggle.button_pressed = settings.get("show_animations", true)
	text_size_option.select(int(settings.get("text_size", 1)))

	# Apply audio settings immediately.
	_on_slider_changed(music_slider.value, "music")
	_on_slider_changed(sfx_slider.value, "sfx")
	_on_slider_changed(ambient_slider.value, "ambient")


func _auto_save() -> void:
	save_settings()


## ── Navigation ───────────────────────────────────────────────────────────────

func _on_back_pressed() -> void:
	save_settings()
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")
	else:
		get_tree().change_scene_to_file("res://Scenes/UI/MainMenuScreen.tscn")

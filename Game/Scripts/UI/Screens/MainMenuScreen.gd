## MainMenuScreen — Title screen with Continue, New Game, Settings, Credits.
## [P8-001] Checks for existing saves to show/hide Continue. Builds the entire
## UI tree programmatically for scene-less workflow.
class_name MainMenuScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH: float = 1080.0
const SCREEN_HEIGHT: float = 1920.0
const BUTTON_WIDTH: float = 480.0
const BUTTON_HEIGHT: float = 72.0
const BUTTON_SPACING: int = 20
const LOGO_SIZE: Vector2 = Vector2(600.0, 300.0)

## ── Scene Paths ──────────────────────────────────────────────────────────────

const SETTINGS_SCENE: String = "res://Scenes/UI/SettingsScreen.tscn"
const CREDITS_SCENE: String = "res://Scenes/UI/CreditsScreen.tscn"
const GAME_SCENE: String = "res://Scenes/Overworld.tscn"
const SAVE_LOAD_SCENE: String = "res://Scenes/UI/SaveLoadScreen.tscn"

## ── Nodes ────────────────────────────────────────────────────────────────────

var logo: TextureRect
var continue_button: Button
var new_game_button: Button
var settings_button: Button
var credits_button: Button
var version_label: Label

var _bg: TextureRect
var _vbox: VBoxContainer
var _button_container: VBoxContainer


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	_build_ui()
	_check_save_data()
	_animate_entrance()


func _build_ui() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	custom_minimum_size = Vector2(SCREEN_WIDTH, SCREEN_HEIGHT)

	# Background.
	_bg = TextureRect.new()
	_bg.name = "Background"
	_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_bg.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	# Fallback solid color if no texture assigned.
	var bg_color := ColorRect.new()
	bg_color.name = "BGColor"
	bg_color.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg_color.color = Color(0.05, 0.05, 0.12, 1.0)
	add_child(bg_color)
	add_child(_bg)

	# Main VBox layout.
	_vbox = VBoxContainer.new()
	_vbox.name = "MainLayout"
	_vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	_vbox.add_theme_constant_override("separation", 40)
	add_child(_vbox)

	# Top spacer.
	var top_spacer := Control.new()
	top_spacer.custom_minimum_size = Vector2(0.0, 200.0)
	_vbox.add_child(top_spacer)

	# Logo.
	logo = TextureRect.new()
	logo.name = "Logo"
	logo.custom_minimum_size = LOGO_SIZE
	logo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	logo.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_vbox.add_child(logo)

	# Title text fallback (shown if no logo texture).
	var title_label := Label.new()
	title_label.name = "TitleLabel"
	title_label.text = "SPRITE WARS"
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.add_theme_font_size_override("font_size", 56)
	title_label.add_theme_color_override("font_color", Color(0.95, 0.85, 0.4, 1.0))
	_vbox.add_child(title_label)

	# Subtitle.
	var subtitle := Label.new()
	subtitle.name = "Subtitle"
	subtitle.text = "Legends of the Shattered Grid"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 24)
	subtitle.add_theme_color_override("font_color", Color(0.7, 0.7, 0.8, 1.0))
	_vbox.add_child(subtitle)

	# Mid spacer.
	var mid_spacer := Control.new()
	mid_spacer.custom_minimum_size = Vector2(0.0, 60.0)
	mid_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_vbox.add_child(mid_spacer)

	# Button container.
	_button_container = VBoxContainer.new()
	_button_container.name = "ButtonContainer"
	_button_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_button_container.add_theme_constant_override("separation", BUTTON_SPACING)
	_vbox.add_child(_button_container)

	continue_button = _create_menu_button("Continue", Color(0.2, 0.65, 0.4, 1.0))
	continue_button.pressed.connect(_on_continue_pressed)
	_button_container.add_child(continue_button)

	new_game_button = _create_menu_button("New Game", Color(0.2, 0.5, 0.9, 1.0))
	new_game_button.pressed.connect(_on_new_game_pressed)
	_button_container.add_child(new_game_button)

	settings_button = _create_menu_button("Settings", Color(0.35, 0.35, 0.45, 1.0))
	settings_button.pressed.connect(_on_settings_pressed)
	_button_container.add_child(settings_button)

	credits_button = _create_menu_button("Credits", Color(0.35, 0.35, 0.45, 1.0))
	credits_button.pressed.connect(_on_credits_pressed)
	_button_container.add_child(credits_button)

	# Bottom spacer.
	var bottom_spacer := Control.new()
	bottom_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_vbox.add_child(bottom_spacer)

	# Version label.
	version_label = Label.new()
	version_label.name = "VersionLabel"
	version_label.text = "v0.1.0-alpha"
	version_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	version_label.add_theme_font_size_override("font_size", 16)
	version_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55, 1.0))
	_vbox.add_child(version_label)

	# Bottom safe area.
	var safe_bottom := Control.new()
	safe_bottom.custom_minimum_size = Vector2(0.0, 32.0)
	_vbox.add_child(safe_bottom)


## ── Button Factory ───────────────────────────────────────────────────────────

func _create_menu_button(text: String, color: Color) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(BUTTON_WIDTH, BUTTON_HEIGHT)
	btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER

	var normal_style := StyleBoxFlat.new()
	normal_style.bg_color = color
	normal_style.corner_radius_top_left = 14
	normal_style.corner_radius_top_right = 14
	normal_style.corner_radius_bottom_left = 14
	normal_style.corner_radius_bottom_right = 14
	normal_style.content_margin_left = 24.0
	normal_style.content_margin_right = 24.0
	btn.add_theme_stylebox_override("normal", normal_style)

	var pressed_style := normal_style.duplicate() as StyleBoxFlat
	pressed_style.bg_color = color.darkened(0.25)
	btn.add_theme_stylebox_override("pressed", pressed_style)

	var hover_style := normal_style.duplicate() as StyleBoxFlat
	hover_style.bg_color = color.lightened(0.1)
	btn.add_theme_stylebox_override("hover", hover_style)

	var disabled_style := normal_style.duplicate() as StyleBoxFlat
	disabled_style.bg_color = Color(0.2, 0.2, 0.25, 0.5)
	btn.add_theme_stylebox_override("disabled", disabled_style)

	btn.add_theme_font_size_override("font_size", 26)
	btn.add_theme_color_override("font_color", Color.WHITE)
	btn.add_theme_color_override("font_disabled_color", Color(0.5, 0.5, 0.5, 0.5))

	return btn


## ── Save Detection ───────────────────────────────────────────────────────────

func _check_save_data() -> void:
	# Check if any save slot has data.
	var has_save: bool = false
	for slot_index in range(3):
		var path: String = "user://save_slot_%d.sav" % slot_index
		if FileAccess.file_exists(path):
			has_save = true
			break

	continue_button.visible = has_save
	continue_button.disabled = not has_save


## ── Animations ───────────────────────────────────────────────────────────────

func _animate_entrance() -> void:
	# Fade in the whole menu.
	modulate = Color(1.0, 1.0, 1.0, 0.0)
	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 1.0, 0.6)

	# Stagger button animations.
	var buttons: Array[Button] = [continue_button, new_game_button, settings_button, credits_button]
	for i in range(buttons.size()):
		var btn := buttons[i]
		if not btn.visible:
			continue
		btn.modulate = Color(1.0, 1.0, 1.0, 0.0)
		btn.position.y += 30.0
		var btn_tween := create_tween()
		btn_tween.set_ease(Tween.EASE_OUT)
		btn_tween.set_trans(Tween.TRANS_CUBIC)
		btn_tween.tween_interval(0.3 + i * 0.1)
		btn_tween.tween_property(btn, "modulate:a", 1.0, 0.3)
		btn_tween.parallel().tween_property(btn, "position:y", btn.position.y - 30.0, 0.3)


## ── Button Handlers ──────────────────────────────────────────────────────────

func _on_continue_pressed() -> void:
	# Go directly to the save/load screen in load mode, or load last save.
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.push_screen(SAVE_LOAD_SCENE, "slide_left")
	else:
		# Fallback: load the first valid save slot.
		GameManager.load_game(0)


func _on_new_game_pressed() -> void:
	GameManager.start_new_game()
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.push_screen(GAME_SCENE, "fade")
	else:
		get_tree().change_scene_to_file(GAME_SCENE)


func _on_settings_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.push_screen(SETTINGS_SCENE, "slide_left")
	else:
		get_tree().change_scene_to_file(SETTINGS_SCENE)


func _on_credits_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.push_screen(CREDITS_SCENE, "slide_left")
	else:
		get_tree().change_scene_to_file(CREDITS_SCENE)

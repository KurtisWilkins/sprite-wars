## MainMenuScreen — Title/main menu with continue, new game, settings, credits.
## [P8-001] Built programmatically for portrait 1080x1920. Checks for existing
## save data to show/hide the Continue button.
class_name MainMenuScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const BUTTON_MIN_SIZE := Vector2(480.0, 64.0)
const BUTTON_FONT_SIZE: int = 26
const BUTTON_SPACING: int = 16
const VERSION_TEXT: String = "v0.1.0-alpha"

## ── Node References ──────────────────────────────────────────────────────────

var logo: TextureRect
var continue_button: Button
var new_game_button: Button
var settings_button: Button
var credits_button: Button
var version_label: Label

## ── Internal ─────────────────────────────────────────────────────────────────

var _button_container: VBoxContainer


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	_build_ui()
	_check_save_data()


func _build_ui() -> void:
	# Root layout — full screen.
	set_anchors_preset(Control.PRESET_FULL_RECT)

	# Background.
	var bg := ColorRect.new()
	bg.name = "Background"
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.06, 0.06, 0.1, 1.0)
	add_child(bg)

	# Main VBox that centres everything vertically.
	var root_vbox := VBoxContainer.new()
	root_vbox.name = "RootVBox"
	root_vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	root_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	root_vbox.add_theme_constant_override("separation", 40)
	add_child(root_vbox)

	# Top spacer.
	var top_spacer := Control.new()
	top_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	top_spacer.custom_minimum_size.y = 200.0
	root_vbox.add_child(top_spacer)

	# Logo area.
	logo = TextureRect.new()
	logo.name = "Logo"
	logo.custom_minimum_size = Vector2(600.0, 300.0)
	logo.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	logo.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	logo.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	root_vbox.add_child(logo)

	# Title text (shown if no logo texture is assigned).
	var title_label := Label.new()
	title_label.name = "TitleLabel"
	title_label.text = "SPRITE WARS"
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.add_theme_font_size_override("font_size", 56)
	title_label.add_theme_color_override("font_color", Color(0.9, 0.85, 0.4, 1.0))
	root_vbox.add_child(title_label)

	# Subtitle.
	var subtitle := Label.new()
	subtitle.name = "Subtitle"
	subtitle.text = "Choose Your Sprites. Conquer the Temples."
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 20)
	subtitle.add_theme_color_override("font_color", Color(0.7, 0.7, 0.8, 0.8))
	root_vbox.add_child(subtitle)

	# Button container.
	_button_container = VBoxContainer.new()
	_button_container.name = "ButtonContainer"
	_button_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_button_container.add_theme_constant_override("separation", BUTTON_SPACING)
	_button_container.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	root_vbox.add_child(_button_container)

	# Buttons.
	continue_button = _create_menu_button("Continue", Color(0.2, 0.6, 0.3, 1.0))
	continue_button.pressed.connect(_on_continue_pressed)
	_button_container.add_child(continue_button)

	new_game_button = _create_menu_button("New Game", Color(0.2, 0.45, 0.85, 1.0))
	new_game_button.pressed.connect(_on_new_game_pressed)
	_button_container.add_child(new_game_button)

	settings_button = _create_menu_button("Settings", Color(0.35, 0.35, 0.45, 1.0))
	settings_button.pressed.connect(_on_settings_pressed)
	_button_container.add_child(settings_button)

	credits_button = _create_menu_button("Credits", Color(0.3, 0.3, 0.38, 1.0))
	credits_button.pressed.connect(_on_credits_pressed)
	_button_container.add_child(credits_button)

	# Bottom spacer.
	var bottom_spacer := Control.new()
	bottom_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root_vbox.add_child(bottom_spacer)

	# Version label at bottom.
	version_label = Label.new()
	version_label.name = "VersionLabel"
	version_label.text = VERSION_TEXT
	version_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	version_label.add_theme_font_size_override("font_size", 16)
	version_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55, 0.7))
	root_vbox.add_child(version_label)

	# Safe-area bottom padding.
	var safe_bottom := Control.new()
	safe_bottom.custom_minimum_size.y = 32.0
	root_vbox.add_child(safe_bottom)


## ── Button Factory ───────────────────────────────────────────────────────────

func _create_menu_button(label_text: String, bg_color: Color) -> Button:
	var btn := Button.new()
	btn.text = label_text
	btn.custom_minimum_size = BUTTON_MIN_SIZE
	btn.add_theme_font_size_override("font_size", BUTTON_FONT_SIZE)
	btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER

	var style_normal := StyleBoxFlat.new()
	style_normal.bg_color = bg_color
	style_normal.corner_radius_top_left = 14
	style_normal.corner_radius_top_right = 14
	style_normal.corner_radius_bottom_left = 14
	style_normal.corner_radius_bottom_right = 14
	style_normal.content_margin_left = 24.0
	style_normal.content_margin_right = 24.0
	style_normal.content_margin_top = 12.0
	style_normal.content_margin_bottom = 12.0
	btn.add_theme_stylebox_override("normal", style_normal)

	var style_pressed := style_normal.duplicate() as StyleBoxFlat
	style_pressed.bg_color = bg_color.darkened(0.2)
	btn.add_theme_stylebox_override("pressed", style_pressed)

	var style_hover := style_normal.duplicate() as StyleBoxFlat
	style_hover.bg_color = bg_color.lightened(0.1)
	btn.add_theme_stylebox_override("hover", style_hover)

	return btn


## ── Save Data Check ──────────────────────────────────────────────────────────

func _check_save_data() -> void:
	# Check if any save slot has data. If not, hide Continue button.
	var has_save: bool = false
	for slot_index in range(3):
		var path := "user://save_slot_%d.tres" % slot_index
		if FileAccess.file_exists(path):
			has_save = true
			break
	continue_button.visible = has_save


## ── Button Handlers ──────────────────────────────────────────────────────────

func _on_continue_pressed() -> void:
	# Navigate to save/load screen in load mode.
	EventBus.screen_changed.emit("SaveLoadScreen")
	var transition_mgr := _get_transition_manager()
	if transition_mgr:
		transition_mgr.push_screen("res://Scenes/UI/SaveLoadScreen.tscn", "slide_left")


func _on_new_game_pressed() -> void:
	# If saves exist, confirm overwrite intent. Otherwise start directly.
	if continue_button.visible:
		EventBus.dialog_requested.emit(
			"New Game",
			"Start a new adventure? You can save to an empty slot.",
			func() -> void:
				GameManager.start_new_game()
		)
	else:
		GameManager.start_new_game()


func _on_settings_pressed() -> void:
	EventBus.screen_changed.emit("SettingsScreen")
	var transition_mgr := _get_transition_manager()
	if transition_mgr:
		transition_mgr.push_screen("res://Scenes/UI/SettingsScreen.tscn", "slide_left")


func _on_credits_pressed() -> void:
	EventBus.screen_changed.emit("CreditsScreen")
	var transition_mgr := _get_transition_manager()
	if transition_mgr:
		transition_mgr.push_screen("res://Scenes/UI/CreditsScreen.tscn", "slide_left")


## ── Utility ──────────────────────────────────────────────────────────────────

func _get_transition_manager() -> ScreenTransitionManager:
	var node := get_tree().root.find_child("ScreenTransitionManager", true, false)
	if node is ScreenTransitionManager:
		return node as ScreenTransitionManager
	return null

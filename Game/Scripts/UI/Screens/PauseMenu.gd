## PauseMenu — In-game overlay menu with navigation to all game screens.
## [P8-011] Provides quick access to Team, Inventory, Registry, Quests, Map,
## Settings, Save, and Return to Title. Pauses the game tree when open.
class_name PauseMenu
extends CanvasLayer

## ── Constants ────────────────────────────────────────────────────────────────

const ANIM_DURATION: float = 0.2

const MENU_ACTIONS: Array = [
	{"label": "Team", "action": "team", "icon": "", "color": Color(0.2, 0.55, 0.85)},
	{"label": "Inventory", "action": "inventory", "icon": "", "color": Color(0.6, 0.5, 0.2)},
	{"label": "Registry", "action": "registry", "icon": "", "color": Color(0.5, 0.3, 0.7)},
	{"label": "Quests", "action": "quests", "icon": "", "color": Color(0.2, 0.65, 0.4)},
	{"label": "Map", "action": "map", "icon": "", "color": Color(0.35, 0.55, 0.35)},
	{"label": "Settings", "action": "settings", "icon": "", "color": Color(0.4, 0.4, 0.5)},
	{"label": "Save Game", "action": "save", "icon": "", "color": Color(0.3, 0.5, 0.7)},
	{"label": "Return to Title", "action": "title", "icon": "", "color": Color(0.6, 0.25, 0.25)},
]

const SCENE_MAP: Dictionary = {
	"team": "res://Scenes/UI/TeamScreen.tscn",
	"inventory": "res://Scenes/UI/InventoryScreen.tscn",
	"registry": "res://Scenes/UI/RegistryScreen.tscn",
	"quests": "res://Scenes/UI/QuestsScreen.tscn",
	"map": "res://Scenes/UI/MapScreen.tscn",
	"settings": "res://Scenes/UI/SettingsScreen.tscn",
	"save": "res://Scenes/UI/SaveLoadScreen.tscn",
	"title": "res://Scenes/UI/MainMenuScreen.tscn",
}

## ── State ────────────────────────────────────────────────────────────────────

var is_open: bool = false

## ── Nodes ────────────────────────────────────────────────────────────────────

var menu_panel: PanelContainer
var _overlay: ColorRect
var _button_container: VBoxContainer
var _resume_button: Button


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	layer = 80
	_build_ui()
	visible = false
	set_process_input(true)


func _input(event: InputEvent) -> void:
	# Toggle on Escape / Back button.
	if event.is_action_pressed("ui_cancel"):
		toggle()
		get_viewport().set_input_as_handled()


func _build_ui() -> void:
	# Overlay.
	_overlay = ColorRect.new()
	_overlay.name = "Overlay"
	_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	_overlay.color = Color(0.0, 0.0, 0.0, 0.6)
	_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_overlay)

	# Center container.
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	# Menu panel.
	menu_panel = PanelContainer.new()
	menu_panel.name = "MenuPanel"
	menu_panel.custom_minimum_size = Vector2(500.0, 0.0)

	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.1, 0.1, 0.15, 0.95)
	panel_style.corner_radius_top_left = 20
	panel_style.corner_radius_top_right = 20
	panel_style.corner_radius_bottom_left = 20
	panel_style.corner_radius_bottom_right = 20
	panel_style.content_margin_left = 24.0
	panel_style.content_margin_right = 24.0
	panel_style.content_margin_top = 24.0
	panel_style.content_margin_bottom = 24.0
	panel_style.border_width_left = 2
	panel_style.border_width_right = 2
	panel_style.border_width_top = 2
	panel_style.border_width_bottom = 2
	panel_style.border_color = Color(0.3, 0.3, 0.4, 0.8)
	menu_panel.add_theme_stylebox_override("panel", panel_style)
	center.add_child(menu_panel)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 12)
	menu_panel.add_child(vbox)

	# Title.
	var title := Label.new()
	title.text = "PAUSED"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 32)
	title.add_theme_color_override("font_color", Color(0.8, 0.85, 1.0))
	vbox.add_child(title)

	var sep := HSeparator.new()
	vbox.add_child(sep)

	# Button container.
	_button_container = VBoxContainer.new()
	_button_container.add_theme_constant_override("separation", 8)
	vbox.add_child(_button_container)

	for item in MENU_ACTIONS:
		var btn := _create_menu_button(item["label"], item["color"] as Color)
		var action: String = item["action"]
		btn.pressed.connect(func() -> void: _on_button_pressed(action))
		_button_container.add_child(btn)

	# Resume button.
	var sep2 := HSeparator.new()
	vbox.add_child(sep2)

	_resume_button = _create_menu_button("Resume", Color(0.3, 0.65, 0.3))
	_resume_button.pressed.connect(toggle)
	vbox.add_child(_resume_button)


func _create_menu_button(text: String, color: Color) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(0.0, 56.0)
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	btn.add_theme_font_size_override("font_size", 22)
	btn.add_theme_color_override("font_color", Color.WHITE)

	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 10
	style.corner_radius_top_right = 10
	style.corner_radius_bottom_left = 10
	style.corner_radius_bottom_right = 10
	style.content_margin_left = 16.0
	style.content_margin_right = 16.0
	btn.add_theme_stylebox_override("normal", style)

	var pressed_style := style.duplicate() as StyleBoxFlat
	pressed_style.bg_color = color.darkened(0.2)
	btn.add_theme_stylebox_override("pressed", pressed_style)

	var hover_style := style.duplicate() as StyleBoxFlat
	hover_style.bg_color = color.lightened(0.1)
	btn.add_theme_stylebox_override("hover", hover_style)

	return btn


## ── Public API ───────────────────────────────────────────────────────────────

func toggle() -> void:
	if is_open:
		_close()
	else:
		_open()


## ── Open / Close ─────────────────────────────────────────────────────────────

func _open() -> void:
	is_open = true
	visible = true
	get_tree().paused = true

	# Animate in.
	menu_panel.pivot_offset = menu_panel.size / 2.0
	menu_panel.scale = Vector2(0.8, 0.8)
	menu_panel.modulate = Color(1.0, 1.0, 1.0, 0.0)
	_overlay.color = Color(0.0, 0.0, 0.0, 0.0)

	var tween := create_tween()
	tween.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)
	tween.set_parallel(true)
	tween.tween_property(menu_panel, "scale", Vector2.ONE, ANIM_DURATION)
	tween.tween_property(menu_panel, "modulate:a", 1.0, ANIM_DURATION * 0.6)
	tween.tween_property(_overlay, "color:a", 0.6, ANIM_DURATION * 0.5)


func _close() -> void:
	var tween := create_tween()
	tween.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	tween.set_ease(Tween.EASE_IN)
	tween.set_trans(Tween.TRANS_BACK)
	tween.set_parallel(true)
	tween.tween_property(menu_panel, "scale", Vector2(0.8, 0.8), ANIM_DURATION)
	tween.tween_property(menu_panel, "modulate:a", 0.0, ANIM_DURATION * 0.8)
	tween.tween_property(_overlay, "color:a", 0.0, ANIM_DURATION)
	tween.chain().tween_callback(func() -> void:
		visible = false
		is_open = false
		get_tree().paused = false
	)


## ── Button Handler ───────────────────────────────────────────────────────────

func _on_button_pressed(action: String) -> void:
	match action:
		"title":
			# Return to title with confirmation.
			EventBus.dialog_requested.emit(
				"Return to Title",
				"Unsaved progress will be lost. Continue?",
				func() -> void:
					get_tree().paused = false
					is_open = false
					visible = false
					get_tree().change_scene_to_file(SCENE_MAP["title"])
			)
		"save":
			# Close pause, open save screen.
			_close()
			await get_tree().create_timer(ANIM_DURATION + 0.05).timeout
			if has_node("/root/ScreenTransitionManager"):
				var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
				stm.push_screen(SCENE_MAP["save"], "slide_left")
		_:
			if SCENE_MAP.has(action):
				_close()
				await get_tree().create_timer(ANIM_DURATION + 0.05).timeout
				if has_node("/root/ScreenTransitionManager"):
					var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
					stm.push_screen(SCENE_MAP[action], "slide_left")

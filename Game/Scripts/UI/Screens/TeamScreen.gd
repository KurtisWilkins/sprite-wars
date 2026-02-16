## TeamScreen — Manage the active team of up to 10 Sprites.
## [P8-002] Shows portrait, name, level, HP bar, and element icon per slot.
## Supports drag-and-drop reordering and navigation to detail/storage screens.
class_name TeamScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const MAX_TEAM_SIZE: int = 10
const SLOT_HEIGHT: float = 120.0
const SLOT_SPACING: int = 8
const HP_BAR_HEIGHT: float = 12.0
const PORTRAIT_SIZE: Vector2 = Vector2(80.0, 80.0)

const DETAIL_SCENE: String = "res://Scenes/UI/SpriteDetailScreen.tscn"
const STORAGE_SCENE: String = "res://Scenes/UI/StorageScreen.tscn"

## ── State ────────────────────────────────────────────────────────────────────

var team_slots: Array[Control] = []
var selected_index: int = -1
var drag_source_index: int = -1
var _is_dragging: bool = false
var _drag_visual: Control = null

## ── Nodes ────────────────────────────────────────────────────────────────────

var _scroll: ScrollContainer
var _slot_container: VBoxContainer
var _top_bar: PanelContainer
var _back_button: Button
var _storage_button: Button
var _detail_button: Button


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build_ui()
	_populate_team()


func _build_ui() -> void:
	# Background.
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.06, 0.06, 0.1, 1.0)
	add_child(bg)

	# Top bar.
	_top_bar = _build_top_bar()
	add_child(_top_bar)

	# Scroll container for team list.
	_scroll = ScrollContainer.new()
	_scroll.name = "Scroll"
	_scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	_scroll.offset_top = 100.0
	_scroll.offset_bottom = -100.0
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(_scroll)

	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.add_theme_constant_override("margin_left", 20)
	margin.add_theme_constant_override("margin_right", 20)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_bottom", 12)
	_scroll.add_child(margin)

	_slot_container = VBoxContainer.new()
	_slot_container.name = "SlotContainer"
	_slot_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_slot_container.add_theme_constant_override("separation", SLOT_SPACING)
	margin.add_child(_slot_container)

	# Bottom action bar.
	var bottom_bar := _build_bottom_bar()
	add_child(bottom_bar)


func _build_top_bar() -> PanelContainer:
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

	_back_button = Button.new()
	_back_button.text = "<  Back"
	_back_button.custom_minimum_size = Vector2(120.0, 56.0)
	_back_button.add_theme_font_size_override("font_size", 22)
	var back_style := StyleBoxFlat.new()
	back_style.bg_color = Color(0.15, 0.15, 0.22, 1.0)
	back_style.corner_radius_top_left = 10
	back_style.corner_radius_top_right = 10
	back_style.corner_radius_bottom_left = 10
	back_style.corner_radius_bottom_right = 10
	_back_button.add_theme_stylebox_override("normal", back_style)
	_back_button.pressed.connect(_on_back_pressed)
	hbox.add_child(_back_button)

	var title := Label.new()
	title.text = "Team"
	title.add_theme_font_size_override("font_size", 32)
	title.add_theme_color_override("font_color", Color.WHITE)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(title)

	return panel


func _build_bottom_bar() -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = "BottomBar"
	panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	panel.custom_minimum_size = Vector2(0.0, 96.0)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.08, 0.14, 1.0)
	style.border_width_top = 2
	style.border_color = Color(0.2, 0.2, 0.3, 1.0)
	style.content_margin_left = 20.0
	style.content_margin_right = 20.0
	panel.add_theme_stylebox_override("panel", style)

	var hbox := HBoxContainer.new()
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	hbox.add_theme_constant_override("separation", 24)
	panel.add_child(hbox)

	_detail_button = _create_action_button("Details", Color(0.2, 0.5, 0.9, 1.0))
	_detail_button.pressed.connect(_on_detail_pressed)
	_detail_button.disabled = true
	hbox.add_child(_detail_button)

	_storage_button = _create_action_button("Storage", Color(0.35, 0.35, 0.5, 1.0))
	_storage_button.pressed.connect(open_storage)
	hbox.add_child(_storage_button)

	return panel


func _create_action_button(text: String, color: Color) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(200.0, 56.0)

	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_left = 12
	style.corner_radius_bottom_right = 12
	btn.add_theme_stylebox_override("normal", style)
	btn.add_theme_font_size_override("font_size", 22)
	btn.add_theme_color_override("font_color", Color.WHITE)

	var disabled_style := style.duplicate() as StyleBoxFlat
	disabled_style.bg_color = Color(0.2, 0.2, 0.25, 0.5)
	btn.add_theme_stylebox_override("disabled", disabled_style)

	return btn


## ── Team Population ──────────────────────────────────────────────────────────

func _populate_team() -> void:
	# Clear existing slots.
	for slot in team_slots:
		if is_instance_valid(slot):
			slot.queue_free()
	team_slots.clear()

	var team: Array = GameManager.player_data.team if GameManager.player_data else []

	for i in range(MAX_TEAM_SIZE):
		var sprite_data: SpriteInstance = team[i] if i < team.size() else null
		var slot := _create_team_slot(i, sprite_data)
		_slot_container.add_child(slot)
		team_slots.append(slot)


func _create_team_slot(index: int, sprite_data: SpriteInstance) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = "Slot_%d" % index
	panel.custom_minimum_size = Vector2(0.0, SLOT_HEIGHT)

	var is_empty: bool = sprite_data == null
	var bg_color: Color = Color(0.12, 0.12, 0.18, 1.0) if not is_empty else Color(0.08, 0.08, 0.12, 0.5)

	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_left = 12
	style.corner_radius_bottom_right = 12
	style.content_margin_left = 12.0
	style.content_margin_right = 12.0
	style.content_margin_top = 8.0
	style.content_margin_bottom = 8.0
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = Color(0.2, 0.2, 0.3, 0.6)
	panel.add_theme_stylebox_override("panel", style)

	if is_empty:
		var empty_label := Label.new()
		empty_label.text = "— Empty Slot %d —" % (index + 1)
		empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		empty_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		empty_label.add_theme_font_size_override("font_size", 20)
		empty_label.add_theme_color_override("font_color", Color(0.4, 0.4, 0.45, 0.6))
		panel.add_child(empty_label)
	else:
		var hbox := HBoxContainer.new()
		hbox.add_theme_constant_override("separation", 12)
		panel.add_child(hbox)

		# Slot number.
		var num_label := Label.new()
		num_label.text = "#%d" % (index + 1)
		num_label.custom_minimum_size = Vector2(40.0, 0.0)
		num_label.add_theme_font_size_override("font_size", 18)
		num_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		num_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		hbox.add_child(num_label)

		# Portrait.
		var portrait := TextureRect.new()
		portrait.name = "Portrait"
		portrait.custom_minimum_size = PORTRAIT_SIZE
		portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED

		# Placeholder color rect behind portrait.
		var portrait_bg := ColorRect.new()
		portrait_bg.custom_minimum_size = PORTRAIT_SIZE
		portrait_bg.color = Color(0.15, 0.15, 0.22, 1.0)
		hbox.add_child(portrait_bg)

		# Info VBox.
		var info := VBoxContainer.new()
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		info.add_theme_constant_override("separation", 4)
		hbox.add_child(info)

		# Name.
		var display_name: String = sprite_data.nickname if not sprite_data.nickname.is_empty() else "Sprite #%d" % sprite_data.race_id
		var name_label := Label.new()
		name_label.name = "NameLabel"
		name_label.text = display_name
		name_label.add_theme_font_size_override("font_size", 22)
		name_label.add_theme_color_override("font_color", Color.WHITE)
		info.add_child(name_label)

		# Level.
		var level_label := Label.new()
		level_label.name = "LevelLabel"
		level_label.text = "Lv. %d" % sprite_data.level
		level_label.add_theme_font_size_override("font_size", 18)
		level_label.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
		info.add_child(level_label)

		# HP bar.
		var hp_bar := ProgressBar.new()
		hp_bar.name = "HPBar"
		hp_bar.custom_minimum_size = Vector2(0.0, HP_BAR_HEIGHT)
		hp_bar.min_value = 0.0
		hp_bar.max_value = 100.0
		hp_bar.value = 100.0  # Full HP in team view.
		hp_bar.show_percentage = false

		var fill_style := StyleBoxFlat.new()
		fill_style.bg_color = Color(0.2, 0.8, 0.3, 1.0)
		fill_style.corner_radius_top_left = 4
		fill_style.corner_radius_top_right = 4
		fill_style.corner_radius_bottom_left = 4
		fill_style.corner_radius_bottom_right = 4
		hp_bar.add_theme_stylebox_override("fill", fill_style)

		var bg_style := StyleBoxFlat.new()
		bg_style.bg_color = Color(0.15, 0.15, 0.2, 1.0)
		bg_style.corner_radius_top_left = 4
		bg_style.corner_radius_top_right = 4
		bg_style.corner_radius_bottom_left = 4
		bg_style.corner_radius_bottom_right = 4
		hp_bar.add_theme_stylebox_override("background", bg_style)
		info.add_child(hp_bar)

		# Element icons.
		var element_hbox := HBoxContainer.new()
		element_hbox.name = "Elements"
		element_hbox.add_theme_constant_override("separation", 4)
		for element in sprite_data.element_types:
			var elem_label := Label.new()
			elem_label.text = element
			elem_label.add_theme_font_size_override("font_size", 14)
			elem_label.add_theme_color_override("font_color", _get_element_color(element))
			element_hbox.add_child(elem_label)
		info.add_child(element_hbox)

	# Make the slot clickable.
	var click_btn := Button.new()
	click_btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	click_btn.flat = true
	click_btn.mouse_filter = Control.MOUSE_FILTER_STOP

	var transparent := StyleBoxEmpty.new()
	click_btn.add_theme_stylebox_override("normal", transparent)
	click_btn.add_theme_stylebox_override("hover", transparent)
	click_btn.add_theme_stylebox_override("pressed", transparent)
	click_btn.add_theme_stylebox_override("focus", transparent)

	click_btn.pressed.connect(func() -> void: select_sprite(index))
	panel.add_child(click_btn)

	return panel


## ── Selection ────────────────────────────────────────────────────────────────

func select_sprite(index: int) -> void:
	# Deselect previous.
	if selected_index >= 0 and selected_index < team_slots.size():
		_set_slot_selected(selected_index, false)

	if selected_index == index:
		# Toggle off.
		selected_index = -1
		_detail_button.disabled = true
		return

	selected_index = index
	_set_slot_selected(index, true)

	var team: Array = GameManager.player_data.team if GameManager.player_data else []
	_detail_button.disabled = (index >= team.size())


func _set_slot_selected(index: int, selected: bool) -> void:
	if index < 0 or index >= team_slots.size():
		return
	var slot := team_slots[index]
	var style := slot.get_theme_stylebox("panel") as StyleBoxFlat
	if style:
		var new_style := style.duplicate() as StyleBoxFlat
		new_style.border_color = Color(0.4, 0.7, 1.0, 1.0) if selected else Color(0.2, 0.2, 0.3, 0.6)
		new_style.border_width_left = 3 if selected else 2
		new_style.border_width_right = 3 if selected else 2
		new_style.border_width_top = 3 if selected else 2
		new_style.border_width_bottom = 3 if selected else 2
		slot.add_theme_stylebox_override("panel", new_style)


## ── Drag-and-Drop Reorder ────────────────────────────────────────────────────

func swap_sprites(from_idx: int, to_idx: int) -> void:
	if not GameManager.player_data:
		return
	var team: Array = GameManager.player_data.team
	if from_idx < 0 or from_idx >= team.size():
		return
	if to_idx < 0 or to_idx >= team.size():
		return
	if from_idx == to_idx:
		return

	var temp = team[from_idx]
	team[from_idx] = team[to_idx]
	team[to_idx] = temp

	update_display()


## ── Navigation ───────────────────────────────────────────────────────────────

func open_sprite_detail(index: int) -> void:
	if not GameManager.player_data:
		return
	var team: Array = GameManager.player_data.team
	if index < 0 or index >= team.size():
		return

	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.push_screen(DETAIL_SCENE, "slide_left")
		# After the screen loads, pass the sprite data.
		await get_tree().process_frame
		if stm.current_screen and stm.current_screen.has_method("set_sprite"):
			stm.current_screen.set_sprite(team[index])


func open_storage() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.push_screen(STORAGE_SCENE, "slide_left")


## ── Display Update ───────────────────────────────────────────────────────────

func update_display() -> void:
	for slot in team_slots:
		if is_instance_valid(slot):
			slot.queue_free()
	team_slots.clear()
	_populate_team()


## ── Handlers ─────────────────────────────────────────────────────────────────

func _on_back_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")


func _on_detail_pressed() -> void:
	if selected_index >= 0:
		open_sprite_detail(selected_index)


## ── Element Color ────────────────────────────────────────────────────────────

func _get_element_color(element_name: String) -> Color:
	match element_name:
		"Fire": return Color(1.0, 0.4, 0.2)
		"Water": return Color(0.3, 0.6, 1.0)
		"Earth": return Color(0.6, 0.45, 0.25)
		"Air": return Color(0.7, 0.9, 1.0)
		"Light": return Color(1.0, 1.0, 0.6)
		"Dark": return Color(0.5, 0.3, 0.7)
		"Nature": return Color(0.3, 0.8, 0.3)
		"Electric": return Color(1.0, 0.9, 0.2)
		"Ice": return Color(0.6, 0.9, 1.0)
		"Metal": return Color(0.7, 0.7, 0.75)
		"Poison": return Color(0.7, 0.3, 0.8)
		"Psychic": return Color(1.0, 0.5, 0.8)
		"Spirit": return Color(0.6, 0.8, 0.9)
		"Chaos": return Color(0.9, 0.2, 0.4)
		_: return Color(0.7, 0.7, 0.7)

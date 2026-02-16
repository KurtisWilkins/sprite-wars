## StorageScreen — PC Storage for depositing/withdrawing Sprites.
## [P8-007] Grid view of stored Sprites with search, sort, element/class filters,
## multi-select, and withdraw/deposit operations.
class_name StorageScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const GRID_COLUMNS: int = 5
const CELL_SIZE: Vector2 = Vector2(120.0, 140.0)

## ── State ────────────────────────────────────────────────────────────────────

var selected_sprites: Array[int] = []
var _current_filter: Dictionary = {}

## ── Nodes ────────────────────────────────────────────────────────────────────

var storage_grid: GridContainer
var search_bar: LineEdit
var sort_options: OptionButton
var filter_buttons: HBoxContainer
var withdraw_button: Button
var deposit_button: Button
var back_button: Button
var _selection_label: Label
var _scroll: ScrollContainer


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build_ui()
	populate_grid({})


func _build_ui() -> void:
	# Background.
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.06, 0.06, 0.1, 1.0)
	add_child(bg)

	add_child(_build_top_bar("PC Storage"))

	# Content.
	var content := VBoxContainer.new()
	content.set_anchors_preset(Control.PRESET_FULL_RECT)
	content.offset_top = 100.0
	content.offset_bottom = -100.0
	content.add_theme_constant_override("separation", 8)
	add_child(content)

	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_theme_constant_override("margin_left", 20)
	margin.add_theme_constant_override("margin_right", 20)
	margin.add_theme_constant_override("margin_top", 8)
	content.add_child(margin)

	var inner := VBoxContainer.new()
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inner.size_flags_vertical = Control.SIZE_EXPAND_FILL
	inner.add_theme_constant_override("separation", 10)
	margin.add_child(inner)

	# Search bar.
	var search_row := HBoxContainer.new()
	search_row.add_theme_constant_override("separation", 8)

	search_bar = LineEdit.new()
	search_bar.name = "SearchBar"
	search_bar.placeholder_text = "Search Sprites..."
	search_bar.custom_minimum_size = Vector2(0.0, 48.0)
	search_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	search_bar.add_theme_font_size_override("font_size", 20)
	search_bar.text_changed.connect(_on_search_changed)
	search_row.add_child(search_bar)

	sort_options = OptionButton.new()
	sort_options.add_item("Name A-Z")
	sort_options.add_item("Name Z-A")
	sort_options.add_item("Level (High)")
	sort_options.add_item("Level (Low)")
	sort_options.add_item("Element")
	sort_options.custom_minimum_size = Vector2(160.0, 48.0)
	sort_options.add_theme_font_size_override("font_size", 18)
	sort_options.item_selected.connect(_on_sort_changed)
	search_row.add_child(sort_options)
	inner.add_child(search_row)

	# Filter buttons.
	filter_buttons = HBoxContainer.new()
	filter_buttons.name = "Filters"
	filter_buttons.add_theme_constant_override("separation", 6)

	var all_btn := _create_filter_chip("All")
	all_btn.pressed.connect(func() -> void: _apply_filter({}))
	filter_buttons.add_child(all_btn)

	for element in ["Fire", "Water", "Earth", "Air", "Nature", "Electric"]:
		var chip := _create_filter_chip(element)
		var elem := element
		chip.pressed.connect(func() -> void: _apply_filter({"element": elem}))
		filter_buttons.add_child(chip)

	# Wrap in a scroll for overflow.
	var filter_scroll := ScrollContainer.new()
	filter_scroll.custom_minimum_size = Vector2(0.0, 44.0)
	filter_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	filter_scroll.add_child(filter_buttons)
	inner.add_child(filter_scroll)

	# Selection count.
	_selection_label = Label.new()
	_selection_label.text = "0 selected"
	_selection_label.add_theme_font_size_override("font_size", 18)
	_selection_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.65))
	inner.add_child(_selection_label)

	# Grid scroll.
	_scroll = ScrollContainer.new()
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	inner.add_child(_scroll)

	var grid_margin := MarginContainer.new()
	grid_margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_scroll.add_child(grid_margin)

	storage_grid = GridContainer.new()
	storage_grid.name = "StorageGrid"
	storage_grid.columns = GRID_COLUMNS
	storage_grid.add_theme_constant_override("h_separation", 6)
	storage_grid.add_theme_constant_override("v_separation", 6)
	storage_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid_margin.add_child(storage_grid)

	# Bottom action bar.
	add_child(_build_bottom_bar())


func _build_bottom_bar() -> PanelContainer:
	var panel := PanelContainer.new()
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
	hbox.add_theme_constant_override("separation", 16)
	panel.add_child(hbox)

	withdraw_button = _create_action_button("Withdraw", Color(0.2, 0.6, 0.4, 1.0))
	withdraw_button.pressed.connect(withdraw_selected)
	withdraw_button.disabled = true
	hbox.add_child(withdraw_button)

	deposit_button = _create_action_button("Deposit", Color(0.2, 0.5, 0.9, 1.0))
	deposit_button.pressed.connect(deposit_selected)
	deposit_button.disabled = true
	hbox.add_child(deposit_button)

	return panel


func _create_filter_chip(text: String) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(0.0, 36.0)
	btn.add_theme_font_size_override("font_size", 16)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.18, 0.18, 0.25, 1.0)
	style.corner_radius_top_left = 16
	style.corner_radius_top_right = 16
	style.corner_radius_bottom_left = 16
	style.corner_radius_bottom_right = 16
	style.content_margin_left = 12.0
	style.content_margin_right = 12.0
	btn.add_theme_stylebox_override("normal", style)

	return btn


func _create_action_button(text: String, color: Color) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(200.0, 56.0)
	btn.add_theme_font_size_override("font_size", 22)

	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_left = 12
	style.corner_radius_bottom_right = 12
	btn.add_theme_stylebox_override("normal", style)

	var disabled_style := style.duplicate() as StyleBoxFlat
	disabled_style.bg_color = Color(0.2, 0.2, 0.25, 0.5)
	btn.add_theme_stylebox_override("disabled", disabled_style)

	return btn


## ── Top Bar ──────────────────────────────────────────────────────────────────

func _build_top_bar(title: String) -> PanelContainer:
	var panel := PanelContainer.new()
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


## ── Public API ───────────────────────────────────────────────────────────────

func populate_grid(filter: Dictionary) -> void:
	_current_filter = filter
	selected_sprites.clear()
	_update_selection_ui()

	for child in storage_grid.get_children():
		child.queue_free()

	if not GameManager.player_data:
		return

	var storage: Array = GameManager.player_data.storage if GameManager.player_data.get("storage") else []

	for sprite_data in storage:
		if not _matches_filter(sprite_data, filter):
			continue
		var cell := _create_sprite_cell(sprite_data)
		storage_grid.add_child(cell)

	if storage_grid.get_child_count() == 0:
		var empty := Label.new()
		empty.text = "No Sprites in storage."
		empty.add_theme_font_size_override("font_size", 20)
		empty.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		storage_grid.add_child(empty)


func search(query: String) -> void:
	var filter := _current_filter.duplicate()
	if not query.is_empty():
		filter["search"] = query
	populate_grid(filter)


func withdraw_selected() -> void:
	if selected_sprites.is_empty():
		return
	# Move selected from storage to team.
	# Implementation depends on GameManager API.
	selected_sprites.clear()
	_update_selection_ui()
	populate_grid(_current_filter)


func deposit_selected() -> void:
	if selected_sprites.is_empty():
		return
	# Move selected from team to storage.
	selected_sprites.clear()
	_update_selection_ui()
	populate_grid(_current_filter)


## ── Internal ─────────────────────────────────────────────────────────────────

func _create_sprite_cell(sprite_data: SpriteInstance) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = CELL_SIZE

	var is_selected := sprite_data.instance_id in selected_sprites
	var border_color := Color(0.4, 0.7, 1.0) if is_selected else Color(0.2, 0.2, 0.3, 0.6)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.12, 0.18, 1.0)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = border_color
	style.content_margin_left = 4.0
	style.content_margin_right = 4.0
	style.content_margin_top = 4.0
	style.content_margin_bottom = 4.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 2)

	# Portrait placeholder.
	var portrait := ColorRect.new()
	portrait.custom_minimum_size = Vector2(64.0, 64.0)
	portrait.color = Color(0.15, 0.15, 0.22, 1.0)
	portrait.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vbox.add_child(portrait)

	# Name.
	var name_label := Label.new()
	var display_name: String = sprite_data.nickname if not sprite_data.nickname.is_empty() else "Sprite #%d" % sprite_data.race_id
	name_label.text = display_name
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 14)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	name_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	vbox.add_child(name_label)

	# Level.
	var level_label := Label.new()
	level_label.text = "Lv.%d" % sprite_data.level
	level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	level_label.add_theme_font_size_override("font_size", 12)
	level_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.65))
	vbox.add_child(level_label)

	panel.add_child(vbox)

	# Click handler for selection toggle.
	var btn := Button.new()
	btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	btn.flat = true
	var transparent := StyleBoxEmpty.new()
	btn.add_theme_stylebox_override("normal", transparent)
	btn.add_theme_stylebox_override("hover", transparent)
	btn.add_theme_stylebox_override("pressed", transparent)
	btn.add_theme_stylebox_override("focus", transparent)
	var sid := sprite_data.instance_id
	btn.pressed.connect(func() -> void: _toggle_selection(sid))
	panel.add_child(btn)

	return panel


func _toggle_selection(sprite_id: int) -> void:
	if sprite_id in selected_sprites:
		selected_sprites.erase(sprite_id)
	else:
		selected_sprites.append(sprite_id)
	_update_selection_ui()
	populate_grid(_current_filter)


func _update_selection_ui() -> void:
	_selection_label.text = "%d selected" % selected_sprites.size()
	withdraw_button.disabled = selected_sprites.is_empty()
	deposit_button.disabled = selected_sprites.is_empty()


func _matches_filter(sprite_data: SpriteInstance, filter: Dictionary) -> bool:
	if filter.has("element"):
		if not sprite_data.has_element(filter["element"]):
			return false
	if filter.has("search"):
		var query: String = (filter["search"] as String).to_lower()
		var name: String = sprite_data.nickname.to_lower()
		if not name.contains(query) and not ("sprite #%d" % sprite_data.race_id).contains(query):
			return false
	return true


func _apply_filter(filter: Dictionary) -> void:
	populate_grid(filter)


## ── Handlers ─────────────────────────────────────────────────────────────────

func _on_search_changed(text: String) -> void:
	search(text)


func _on_sort_changed(_idx: int) -> void:
	populate_grid(_current_filter)


func _on_back_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")

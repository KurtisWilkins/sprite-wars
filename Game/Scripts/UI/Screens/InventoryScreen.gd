## InventoryScreen — Tabbed inventory with grid view and item detail popup.
## [P8-006] Categories: consumables, crystals, equipment, key_items, materials.
## Grid layout with sorting and item detail/use/equip actions.
class_name InventoryScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const ITEM_CELL_SIZE: Vector2 = Vector2(96.0, 96.0)
const GRID_COLUMNS: int = 5
const TAB_NAMES: PackedStringArray = PackedStringArray([
	"Consumables", "Crystals", "Equipment", "Key Items", "Materials",
])
const TAB_KEYS: PackedStringArray = PackedStringArray([
	"consumables", "crystals", "equipment", "key_items", "materials",
])

## ── State ────────────────────────────────────────────────────────────────────

var current_tab: String = "consumables"
var _selected_item_id: int = -1

## ── Nodes ────────────────────────────────────────────────────────────────────

var tab_bar: TabBar
var item_grid: GridContainer
var item_detail_popup: PanelContainer
var sort_button: OptionButton
var back_button: Button

var _scroll: ScrollContainer
var _detail_name: Label
var _detail_description: Label
var _detail_quantity: Label
var _use_button: Button
var _equip_button: Button
var _detail_overlay: ColorRect


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build_ui()
	populate_items(current_tab)


func _build_ui() -> void:
	# Background.
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.06, 0.06, 0.1, 1.0)
	add_child(bg)

	# Top bar.
	add_child(_build_top_bar("Inventory"))

	# Main content.
	var main := VBoxContainer.new()
	main.set_anchors_preset(Control.PRESET_FULL_RECT)
	main.offset_top = 100.0
	main.add_theme_constant_override("separation", 0)
	add_child(main)

	# Tab bar.
	tab_bar = TabBar.new()
	tab_bar.name = "TabBar"
	tab_bar.custom_minimum_size = Vector2(0.0, 52.0)
	tab_bar.tab_close_display_policy = TabBar.CLOSE_BUTTON_SHOW_NEVER
	for tab_name in TAB_NAMES:
		tab_bar.add_tab(tab_name)
	tab_bar.tab_changed.connect(_on_tab_changed)
	main.add_child(tab_bar)

	# Sort row.
	var sort_row := HBoxContainer.new()
	sort_row.add_theme_constant_override("separation", 8)

	var sort_margin := MarginContainer.new()
	sort_margin.add_theme_constant_override("margin_left", 24)
	sort_margin.add_theme_constant_override("margin_right", 24)
	sort_margin.add_theme_constant_override("margin_top", 8)
	sort_margin.add_theme_constant_override("margin_bottom", 4)

	var sort_label := Label.new()
	sort_label.text = "Sort:"
	sort_label.add_theme_font_size_override("font_size", 18)
	sort_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.65))
	sort_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	sort_row.add_child(sort_label)

	sort_button = OptionButton.new()
	sort_button.add_item("Name A-Z")
	sort_button.add_item("Name Z-A")
	sort_button.add_item("Quantity")
	sort_button.add_item("Newest")
	sort_button.custom_minimum_size = Vector2(160.0, 44.0)
	sort_button.add_theme_font_size_override("font_size", 18)
	sort_button.item_selected.connect(_on_sort_changed)
	sort_row.add_child(sort_button)

	sort_margin.add_child(sort_row)
	main.add_child(sort_margin)

	# Item grid in scroll.
	_scroll = ScrollContainer.new()
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	main.add_child(_scroll)

	var grid_margin := MarginContainer.new()
	grid_margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid_margin.add_theme_constant_override("margin_left", 24)
	grid_margin.add_theme_constant_override("margin_right", 24)
	grid_margin.add_theme_constant_override("margin_top", 8)
	grid_margin.add_theme_constant_override("margin_bottom", 24)
	_scroll.add_child(grid_margin)

	item_grid = GridContainer.new()
	item_grid.name = "ItemGrid"
	item_grid.columns = GRID_COLUMNS
	item_grid.add_theme_constant_override("h_separation", 8)
	item_grid.add_theme_constant_override("v_separation", 8)
	item_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid_margin.add_child(item_grid)

	# ── Detail Popup (overlay) ────────────────────────────────────────────────
	_build_detail_popup()


func _build_detail_popup() -> void:
	_detail_overlay = ColorRect.new()
	_detail_overlay.name = "DetailOverlay"
	_detail_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	_detail_overlay.color = Color(0.0, 0.0, 0.0, 0.5)
	_detail_overlay.visible = false
	_detail_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_detail_overlay)

	# Dismiss when tapping outside.
	var dismiss_btn := Button.new()
	dismiss_btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	dismiss_btn.flat = true
	var transparent := StyleBoxEmpty.new()
	dismiss_btn.add_theme_stylebox_override("normal", transparent)
	dismiss_btn.add_theme_stylebox_override("hover", transparent)
	dismiss_btn.add_theme_stylebox_override("pressed", transparent)
	dismiss_btn.add_theme_stylebox_override("focus", transparent)
	dismiss_btn.pressed.connect(_close_detail)
	_detail_overlay.add_child(dismiss_btn)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_detail_overlay.add_child(center)

	item_detail_popup = PanelContainer.new()
	item_detail_popup.name = "DetailPopup"
	item_detail_popup.custom_minimum_size = Vector2(600.0, 400.0)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.16, 1.0)
	style.corner_radius_top_left = 16
	style.corner_radius_top_right = 16
	style.corner_radius_bottom_left = 16
	style.corner_radius_bottom_right = 16
	style.content_margin_left = 28.0
	style.content_margin_right = 28.0
	style.content_margin_top = 24.0
	style.content_margin_bottom = 24.0
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = Color(0.3, 0.3, 0.4)
	item_detail_popup.add_theme_stylebox_override("panel", style)
	center.add_child(item_detail_popup)

	var detail_vbox := VBoxContainer.new()
	detail_vbox.add_theme_constant_override("separation", 12)

	_detail_name = Label.new()
	_detail_name.add_theme_font_size_override("font_size", 26)
	_detail_name.add_theme_color_override("font_color", Color.WHITE)
	detail_vbox.add_child(_detail_name)

	_detail_quantity = Label.new()
	_detail_quantity.add_theme_font_size_override("font_size", 20)
	_detail_quantity.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	detail_vbox.add_child(_detail_quantity)

	var sep := HSeparator.new()
	detail_vbox.add_child(sep)

	_detail_description = Label.new()
	_detail_description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_detail_description.custom_minimum_size.x = 500.0
	_detail_description.add_theme_font_size_override("font_size", 20)
	_detail_description.add_theme_color_override("font_color", Color(0.75, 0.75, 0.8))
	detail_vbox.add_child(_detail_description)

	# Action buttons.
	var btn_row := HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_CENTER
	btn_row.add_theme_constant_override("separation", 16)

	_use_button = Button.new()
	_use_button.text = "Use"
	_use_button.custom_minimum_size = Vector2(160.0, 52.0)
	_use_button.add_theme_font_size_override("font_size", 22)
	var use_style := StyleBoxFlat.new()
	use_style.bg_color = Color(0.2, 0.6, 0.4, 1.0)
	use_style.corner_radius_top_left = 10
	use_style.corner_radius_top_right = 10
	use_style.corner_radius_bottom_left = 10
	use_style.corner_radius_bottom_right = 10
	_use_button.add_theme_stylebox_override("normal", use_style)
	_use_button.pressed.connect(_on_use_pressed)
	btn_row.add_child(_use_button)

	_equip_button = Button.new()
	_equip_button.text = "Equip"
	_equip_button.custom_minimum_size = Vector2(160.0, 52.0)
	_equip_button.add_theme_font_size_override("font_size", 22)
	var equip_style := StyleBoxFlat.new()
	equip_style.bg_color = Color(0.2, 0.5, 0.9, 1.0)
	equip_style.corner_radius_top_left = 10
	equip_style.corner_radius_top_right = 10
	equip_style.corner_radius_bottom_left = 10
	equip_style.corner_radius_bottom_right = 10
	_equip_button.add_theme_stylebox_override("normal", equip_style)
	_equip_button.pressed.connect(_on_equip_pressed)
	btn_row.add_child(_equip_button)

	var close_btn := Button.new()
	close_btn.text = "Close"
	close_btn.custom_minimum_size = Vector2(120.0, 52.0)
	close_btn.add_theme_font_size_override("font_size", 22)
	var close_style := StyleBoxFlat.new()
	close_style.bg_color = Color(0.3, 0.3, 0.38, 1.0)
	close_style.corner_radius_top_left = 10
	close_style.corner_radius_top_right = 10
	close_style.corner_radius_bottom_left = 10
	close_style.corner_radius_bottom_right = 10
	close_btn.add_theme_stylebox_override("normal", close_style)
	close_btn.pressed.connect(_close_detail)
	btn_row.add_child(close_btn)

	detail_vbox.add_child(btn_row)
	item_detail_popup.add_child(detail_vbox)


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

func switch_tab(tab: String) -> void:
	current_tab = tab
	var idx := TAB_KEYS.find(tab)
	if idx >= 0:
		tab_bar.current_tab = idx
	populate_items(tab)


## Rarity color mapping for equipment items.
const RARITY_COLORS: Dictionary = {
	"common": Color(0.55, 0.55, 0.55),
	"uncommon": Color(0.2, 0.8, 0.38),
	"rare": Color(0.2, 0.6, 1.0),
	"epic": Color(0.67, 0.27, 1.0),
	"legendary": Color(1.0, 0.67, 0.0),
}

const RARITY_BG_COLORS: Dictionary = {
	"common": Color(0.12, 0.12, 0.15),
	"uncommon": Color(0.08, 0.15, 0.1),
	"rare": Color(0.08, 0.1, 0.2),
	"epic": Color(0.12, 0.08, 0.2),
	"legendary": Color(0.2, 0.15, 0.05),
}


func populate_items(category: String) -> void:
	# Clear existing items.
	for child in item_grid.get_children():
		child.queue_free()

	if category == "equipment":
		_populate_equipment_items()
		return

	# For non-equipment tabs, use placeholder for now.
	var empty_label := Label.new()
	empty_label.text = "No %s found." % category.replace("_", " ")
	empty_label.add_theme_font_size_override("font_size", 20)
	empty_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
	empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	item_grid.add_child(empty_label)


## Populate the equipment tab with all equipment from the database.
func _populate_equipment_items() -> void:
	var all_equipment: Array[Dictionary] = EquipmentDatabase.get_all_equipment_with_expansion()

	if all_equipment.is_empty():
		var empty_label := Label.new()
		empty_label.text = "No equipment found."
		empty_label.add_theme_font_size_override("font_size", 20)
		empty_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		item_grid.add_child(empty_label)
		return

	for equip in all_equipment:
		var cell := _create_equipment_cell(equip)
		item_grid.add_child(cell)


## Create a grid cell for an equipment item with rarity-colored border.
func _create_equipment_cell(equip_data: Dictionary) -> PanelContainer:
	var rarity: String = str(equip_data.get("rarity", "common"))
	var rarity_color: Color = RARITY_COLORS.get(rarity, RARITY_COLORS["common"])
	var bg_color: Color = RARITY_BG_COLORS.get(rarity, RARITY_BG_COLORS["common"])

	var panel := PanelContainer.new()
	panel.custom_minimum_size = ITEM_CELL_SIZE

	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = rarity_color
	style.content_margin_left = 4.0
	style.content_margin_right = 4.0
	style.content_margin_top = 4.0
	style.content_margin_bottom = 4.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER

	# Equipment icon PNG (or fallback to slot type label).
	var slot_type: String = str(equip_data.get("slot_type", "weapon"))
	var equip_icon_path: String = str(equip_data.get("icon_path", ""))
	if not equip_icon_path.is_empty() and ResourceLoader.exists(equip_icon_path):
		var equip_icon_tex: Texture2D = load(equip_icon_path) as Texture2D
		if equip_icon_tex != null:
			var icon_rect := TextureRect.new()
			icon_rect.texture = equip_icon_tex
			icon_rect.custom_minimum_size = Vector2(48.0, 48.0)
			icon_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			icon_rect.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			vbox.add_child(icon_rect)
		else:
			var slot_label := Label.new()
			slot_label.text = slot_type.capitalize()
			slot_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			slot_label.add_theme_font_size_override("font_size", 10)
			slot_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
			vbox.add_child(slot_label)
	else:
		var slot_label := Label.new()
		slot_label.text = slot_type.capitalize()
		slot_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		slot_label.add_theme_font_size_override("font_size", 10)
		slot_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		vbox.add_child(slot_label)

	# Equipment name.
	var name_label := Label.new()
	name_label.text = str(equip_data.get("equipment_name", "???"))
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 12)
	name_label.add_theme_color_override("font_color", rarity_color)
	name_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	name_label.custom_minimum_size.x = 80.0
	vbox.add_child(name_label)

	# Rarity label.
	var rarity_lbl := Label.new()
	rarity_lbl.text = rarity.capitalize()
	rarity_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rarity_lbl.add_theme_font_size_override("font_size", 10)
	rarity_lbl.add_theme_color_override("font_color", rarity_color * 0.7)
	vbox.add_child(rarity_lbl)

	panel.add_child(vbox)

	# Click handler.
	var equip_id: int = int(equip_data.get("equipment_id", 0))
	var btn := Button.new()
	btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	btn.flat = true
	var transparent := StyleBoxEmpty.new()
	btn.add_theme_stylebox_override("normal", transparent)
	btn.add_theme_stylebox_override("hover", transparent)
	btn.add_theme_stylebox_override("pressed", transparent)
	btn.add_theme_stylebox_override("focus", transparent)
	btn.pressed.connect(func() -> void: _show_equipment_detail(equip_data))
	panel.add_child(btn)

	return panel


## Show equipment detail popup with full stats.
func _show_equipment_detail(equip_data: Dictionary) -> void:
	var equip_id: int = int(equip_data.get("equipment_id", 0))
	_selected_item_id = equip_id

	var rarity: String = str(equip_data.get("rarity", "common"))
	var rarity_color: Color = RARITY_COLORS.get(rarity, RARITY_COLORS["common"])

	_detail_name.text = str(equip_data.get("equipment_name", "Unknown"))
	_detail_name.add_theme_color_override("font_color", rarity_color)

	var slot_type: String = str(equip_data.get("slot_type", "weapon"))
	_detail_quantity.text = "%s | %s | Lv.%d Required" % [
		slot_type.capitalize(),
		rarity.capitalize(),
		int(equip_data.get("level_requirement", 1)),
	]

	# Build description with stat bonuses.
	var desc: String = str(equip_data.get("description", ""))
	var stat_bonuses: Dictionary = equip_data.get("stat_bonuses", {})
	var stat_parts: PackedStringArray = PackedStringArray()
	for key in ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]:
		var val: int = int(stat_bonuses.get(key, 0))
		if val != 0:
			var sign_str: String = "+" if val > 0 else ""
			stat_parts.append("%s %s%d" % [key.to_upper().replace("_", "."), sign_str, val])

	if stat_parts.size() > 0:
		desc += "\n\nStat Bonuses: %s" % ", ".join(stat_parts)

	var element_syn: String = str(equip_data.get("element_synergy", ""))
	if not element_syn.is_empty():
		desc += "\nElement Synergy: %s (x%.2f)" % [element_syn, float(equip_data.get("element_synergy_multiplier", 1.0))]

	var class_syn: String = str(equip_data.get("class_synergy", ""))
	if not class_syn.is_empty():
		desc += "\nClass Synergy: %s (x%.2f)" % [class_syn, float(equip_data.get("class_synergy_multiplier", 1.0))]

	_detail_description.text = desc

	_use_button.visible = false
	_equip_button.visible = true
	_detail_overlay.visible = true

	# Scale-in animation.
	item_detail_popup.pivot_offset = item_detail_popup.size / 2.0
	item_detail_popup.scale = Vector2(0.8, 0.8)
	item_detail_popup.modulate = Color(1.0, 1.0, 1.0, 0.0)
	var tween := create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)
	tween.set_parallel(true)
	tween.tween_property(item_detail_popup, "scale", Vector2.ONE, 0.2)
	tween.tween_property(item_detail_popup, "modulate:a", 1.0, 0.15)


func show_item_detail(item_id: int) -> void:
	# Try to look up as equipment first.
	if current_tab == "equipment":
		var all_equip: Array[Dictionary] = EquipmentDatabase.get_all_equipment_with_expansion()
		for equip in all_equip:
			if int(equip.get("equipment_id", -1)) == item_id:
				_show_equipment_detail(equip)
				return

	_selected_item_id = item_id
	_detail_name.text = "Item #%d" % item_id
	_detail_name.add_theme_color_override("font_color", Color.WHITE)
	_detail_quantity.text = "Qty: 1"
	_detail_description.text = "Item description will be loaded from the item registry."

	# Show/hide action buttons based on tab.
	_use_button.visible = current_tab in ["consumables", "crystals"]
	_equip_button.visible = current_tab == "equipment"

	_detail_overlay.visible = true

	# Scale-in animation.
	item_detail_popup.pivot_offset = item_detail_popup.size / 2.0
	item_detail_popup.scale = Vector2(0.8, 0.8)
	item_detail_popup.modulate = Color(1.0, 1.0, 1.0, 0.0)
	var tween := create_tween()
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)
	tween.set_parallel(true)
	tween.tween_property(item_detail_popup, "scale", Vector2.ONE, 0.2)
	tween.tween_property(item_detail_popup, "modulate:a", 1.0, 0.15)


func use_item(item_id: int) -> void:
	EventBus.item_used.emit(null)  # Would pass actual item resource.
	_close_detail()
	populate_items(current_tab)


func equip_item(item_id: int) -> void:
	# Navigate to equipment screen with this item selected.
	_close_detail()


## ── Handlers ─────────────────────────────────────────────────────────────────

func _on_tab_changed(idx: int) -> void:
	if idx >= 0 and idx < TAB_KEYS.size():
		current_tab = TAB_KEYS[idx]
		populate_items(current_tab)


func _on_sort_changed(_idx: int) -> void:
	populate_items(current_tab)


func _on_use_pressed() -> void:
	if _selected_item_id > 0:
		use_item(_selected_item_id)


func _on_equip_pressed() -> void:
	if _selected_item_id > 0:
		equip_item(_selected_item_id)


func _close_detail() -> void:
	_detail_overlay.visible = false
	_selected_item_id = -1


func _on_back_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")

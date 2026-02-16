## EquipmentScreen — Paper-doll equipment management with stat comparison.
## [P8-005] Shows 9 equipment slots in a paper-doll layout, an inventory list
## of equippable items, and a comparison panel for current vs candidate stats.
class_name EquipmentScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const EQUIPMENT_SLOT_TYPES: PackedStringArray = PackedStringArray([
	"weapon", "armor", "accessory",
	"helmet", "boots", "shield",
	"ring_1", "ring_2", "amulet",
])

const SLOT_SIZE: Vector2 = Vector2(100.0, 100.0)
const STAT_DISPLAY_NAMES: Dictionary = {
	"hp": "HP", "atk": "ATK", "def": "DEF",
	"spd": "SPD", "sp_atk": "SP.ATK", "sp_def": "SP.DEF",
}

## ── State ────────────────────────────────────────────────────────────────────

var _sprite_instance: SpriteInstance = null
var _selected_slot_type: String = ""
var _selected_inventory_index: int = -1

## ── Nodes ────────────────────────────────────────────────────────────────────

var equipment_slots: Dictionary = {}  # slot_type -> PanelContainer
var inventory_list: ItemList
var comparison_panel: PanelContainer
var back_button: Button

var _equip_button: Button
var _unequip_button: Button
var _comparison_labels: Dictionary = {}  # stat_key -> {current: Label, candidate: Label, diff: Label}


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build_ui()


func _build_ui() -> void:
	# Background.
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.06, 0.06, 0.1, 1.0)
	add_child(bg)

	# Top bar.
	add_child(_build_top_bar("Equipment"))

	# Main scroll.
	var scroll := ScrollContainer.new()
	scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	scroll.offset_top = 100.0
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(scroll)

	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_bottom", 40)
	scroll.add_child(margin)

	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 20)
	margin.add_child(content)

	# ── Paper-Doll Layout ─────────────────────────────────────────────────────
	var equip_label := Label.new()
	equip_label.text = "Equipment Slots"
	equip_label.add_theme_font_size_override("font_size", 24)
	equip_label.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	content.add_child(equip_label)

	# 3x3 grid for paper-doll.
	var doll_grid := GridContainer.new()
	doll_grid.columns = 3
	doll_grid.add_theme_constant_override("h_separation", 8)
	doll_grid.add_theme_constant_override("v_separation", 8)
	doll_grid.size_flags_horizontal = Control.SIZE_SHRINK_CENTER

	for slot_type in EQUIPMENT_SLOT_TYPES:
		var slot := _create_equipment_slot(slot_type)
		equipment_slots[slot_type] = slot
		doll_grid.add_child(slot)
	content.add_child(doll_grid)

	# ── Inventory List ────────────────────────────────────────────────────────
	var inv_label := Label.new()
	inv_label.text = "Available Equipment"
	inv_label.add_theme_font_size_override("font_size", 24)
	inv_label.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	content.add_child(inv_label)

	inventory_list = ItemList.new()
	inventory_list.name = "InventoryList"
	inventory_list.custom_minimum_size = Vector2(0.0, 250.0)
	inventory_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inventory_list.add_theme_font_size_override("font_size", 20)
	inventory_list.item_selected.connect(_on_inventory_item_selected)
	content.add_child(inventory_list)

	# Action buttons.
	var action_row := HBoxContainer.new()
	action_row.alignment = BoxContainer.ALIGNMENT_CENTER
	action_row.add_theme_constant_override("separation", 16)

	_equip_button = _create_action_button("Equip", Color(0.2, 0.6, 0.4, 1.0))
	_equip_button.pressed.connect(_on_equip_pressed)
	_equip_button.disabled = true
	action_row.add_child(_equip_button)

	_unequip_button = _create_action_button("Unequip", Color(0.6, 0.3, 0.3, 1.0))
	_unequip_button.pressed.connect(_on_unequip_pressed)
	_unequip_button.disabled = true
	action_row.add_child(_unequip_button)
	content.add_child(action_row)

	# ── Comparison Panel ──────────────────────────────────────────────────────
	comparison_panel = PanelContainer.new()
	comparison_panel.name = "ComparisonPanel"
	comparison_panel.visible = false

	var comp_style := StyleBoxFlat.new()
	comp_style.bg_color = Color(0.1, 0.1, 0.16, 1.0)
	comp_style.corner_radius_top_left = 12
	comp_style.corner_radius_top_right = 12
	comp_style.corner_radius_bottom_left = 12
	comp_style.corner_radius_bottom_right = 12
	comp_style.content_margin_left = 20.0
	comp_style.content_margin_right = 20.0
	comp_style.content_margin_top = 16.0
	comp_style.content_margin_bottom = 16.0
	comp_style.border_width_left = 1
	comp_style.border_width_right = 1
	comp_style.border_width_top = 1
	comp_style.border_width_bottom = 1
	comp_style.border_color = Color(0.25, 0.25, 0.35)
	comparison_panel.add_theme_stylebox_override("panel", comp_style)

	var comp_vbox := VBoxContainer.new()
	comp_vbox.add_theme_constant_override("separation", 8)

	var comp_header := Label.new()
	comp_header.text = "Stat Comparison"
	comp_header.add_theme_font_size_override("font_size", 22)
	comp_header.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	comp_vbox.add_child(comp_header)

	# Stat rows: current | candidate | difference.
	var stat_grid := GridContainer.new()
	stat_grid.columns = 4
	stat_grid.add_theme_constant_override("h_separation", 16)
	stat_grid.add_theme_constant_override("v_separation", 8)

	# Header row.
	for header_text in ["Stat", "Current", "New", "Diff"]:
		var h := Label.new()
		h.text = header_text
		h.add_theme_font_size_override("font_size", 16)
		h.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		stat_grid.add_child(h)

	for stat_key in SpriteInstance.STAT_KEYS:
		var stat_name := Label.new()
		stat_name.text = STAT_DISPLAY_NAMES.get(stat_key, stat_key.to_upper())
		stat_name.add_theme_font_size_override("font_size", 18)
		stat_name.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
		stat_grid.add_child(stat_name)

		var current_label := Label.new()
		current_label.text = "--"
		current_label.add_theme_font_size_override("font_size", 18)
		current_label.add_theme_color_override("font_color", Color.WHITE)
		stat_grid.add_child(current_label)

		var candidate_label := Label.new()
		candidate_label.text = "--"
		candidate_label.add_theme_font_size_override("font_size", 18)
		candidate_label.add_theme_color_override("font_color", Color.WHITE)
		stat_grid.add_child(candidate_label)

		var diff_label := Label.new()
		diff_label.text = "--"
		diff_label.add_theme_font_size_override("font_size", 18)
		stat_grid.add_child(diff_label)

		_comparison_labels[stat_key] = {
			"current": current_label,
			"candidate": candidate_label,
			"diff": diff_label,
		}

	comp_vbox.add_child(stat_grid)
	comparison_panel.add_child(comp_vbox)
	content.add_child(comparison_panel)


func _create_equipment_slot(slot_type: String) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = "Slot_%s" % slot_type
	panel.custom_minimum_size = SLOT_SIZE

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.12, 0.2, 1.0)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = Color(0.25, 0.25, 0.35)
	style.content_margin_left = 4.0
	style.content_margin_right = 4.0
	style.content_margin_top = 4.0
	style.content_margin_bottom = 4.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER

	var type_label := Label.new()
	type_label.name = "TypeLabel"
	type_label.text = slot_type.replace("_", " ").capitalize()
	type_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	type_label.add_theme_font_size_override("font_size", 12)
	type_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
	vbox.add_child(type_label)

	var item_label := Label.new()
	item_label.name = "ItemLabel"
	item_label.text = "--"
	item_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	item_label.add_theme_font_size_override("font_size", 14)
	item_label.add_theme_color_override("font_color", Color.WHITE)
	item_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(item_label)
	panel.add_child(vbox)

	# Click overlay.
	var btn := Button.new()
	btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	btn.flat = true
	var transparent := StyleBoxEmpty.new()
	btn.add_theme_stylebox_override("normal", transparent)
	btn.add_theme_stylebox_override("hover", transparent)
	btn.add_theme_stylebox_override("pressed", transparent)
	btn.add_theme_stylebox_override("focus", transparent)
	var st := slot_type
	btn.pressed.connect(func() -> void: _on_slot_pressed(st))
	panel.add_child(btn)

	return panel


func _create_action_button(text: String, color: Color) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(180.0, 52.0)
	btn.add_theme_font_size_override("font_size", 20)

	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.corner_radius_top_left = 10
	style.corner_radius_top_right = 10
	style.corner_radius_bottom_left = 10
	style.corner_radius_bottom_right = 10
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

func set_sprite_and_slot(sprite_instance: SpriteInstance, slot_type: String) -> void:
	_sprite_instance = sprite_instance
	_selected_slot_type = slot_type
	_refresh_display()
	if not slot_type.is_empty():
		_on_slot_pressed(slot_type)


func equip_item(slot_type: String, equipment_id: int) -> void:
	if _sprite_instance == null:
		return
	_sprite_instance.equipment[slot_type] = equipment_id
	EventBus.equipment_changed.emit(_sprite_instance, EQUIPMENT_SLOT_TYPES.find(slot_type), null)
	_refresh_display()


func unequip_item(slot_type: String) -> void:
	if _sprite_instance == null:
		return
	_sprite_instance.equipment[slot_type] = -1
	EventBus.equipment_changed.emit(_sprite_instance, EQUIPMENT_SLOT_TYPES.find(slot_type), null)
	_refresh_display()


func show_comparison(current: Resource, candidate: Resource) -> void:
	comparison_panel.visible = true
	# In a full implementation, this would read stat bonuses from the item resources.
	# For now, show placeholder comparison.
	for stat_key in _comparison_labels:
		var labels: Dictionary = _comparison_labels[stat_key]
		(labels["current"] as Label).text = "--"
		(labels["candidate"] as Label).text = "--"
		(labels["diff"] as Label).text = "--"
		(labels["diff"] as Label).add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))


## ── Display ──────────────────────────────────────────────────────────────────

func _refresh_display() -> void:
	if _sprite_instance == null:
		return

	for slot_type in EQUIPMENT_SLOT_TYPES:
		if not equipment_slots.has(slot_type):
			continue
		var panel: PanelContainer = equipment_slots[slot_type]
		var vbox := panel.get_child(0) as VBoxContainer
		if vbox == null:
			continue
		var item_label: Label = vbox.get_node_or_null("ItemLabel") as Label
		if item_label == null:
			continue

		var item_id: int = _sprite_instance.equipment.get(slot_type, -1)
		if item_id > 0:
			item_label.text = "Item #%d" % item_id
		else:
			item_label.text = "--"

		_highlight_slot(slot_type, slot_type == _selected_slot_type)


func _highlight_slot(slot_type: String, highlighted: bool) -> void:
	if not equipment_slots.has(slot_type):
		return
	var panel: PanelContainer = equipment_slots[slot_type]
	var style := panel.get_theme_stylebox("panel") as StyleBoxFlat
	if style:
		var new_style := style.duplicate() as StyleBoxFlat
		new_style.border_color = Color(0.4, 0.7, 1.0) if highlighted else Color(0.25, 0.25, 0.35)
		panel.add_theme_stylebox_override("panel", new_style)


## ── Handlers ─────────────────────────────────────────────────────────────────

func _on_slot_pressed(slot_type: String) -> void:
	# Deselect previous.
	if not _selected_slot_type.is_empty():
		_highlight_slot(_selected_slot_type, false)
	_selected_slot_type = slot_type
	_highlight_slot(slot_type, true)

	var item_id: int = _sprite_instance.equipment.get(slot_type, -1) if _sprite_instance else -1
	_unequip_button.disabled = (item_id <= 0)
	_equip_button.disabled = (_selected_inventory_index < 0)


func _on_inventory_item_selected(index: int) -> void:
	_selected_inventory_index = index
	_equip_button.disabled = _selected_slot_type.is_empty()
	comparison_panel.visible = true


func _on_equip_pressed() -> void:
	if _selected_slot_type.is_empty() or _selected_inventory_index < 0:
		return
	# In a full implementation, get the actual item_id from the inventory list.
	equip_item(_selected_slot_type, _selected_inventory_index + 1)


func _on_unequip_pressed() -> void:
	if _selected_slot_type.is_empty():
		return
	unequip_item(_selected_slot_type)


func _on_back_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")

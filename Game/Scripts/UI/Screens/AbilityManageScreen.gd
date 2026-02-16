## AbilityManageScreen — Swap equipped abilities from the learned ability pool.
## [P8-004] Shows 4 equipped ability slots, a scrollable learned ability list,
## and a detail panel with full ability information.
class_name AbilityManageScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const EQUIPPED_SLOT_COUNT: int = 4
const SLOT_SIZE: Vector2 = Vector2(220.0, 100.0)

## ── State ────────────────────────────────────────────────────────────────────

var _sprite_instance: SpriteInstance = null
var _selected_equipped_slot: int = -1
var _selected_learned_index: int = -1

## ── Nodes ────────────────────────────────────────────────────────────────────

var equipped_slots: Array[PanelContainer] = []
var learned_list: ItemList
var ability_detail_panel: PanelContainer
var back_button: Button

var _equipped_container: HBoxContainer
var _detail_name: Label
var _detail_element: Label
var _detail_power: Label
var _detail_accuracy: Label
var _detail_pp: Label
var _detail_cooldown: Label
var _detail_targeting: Label
var _detail_description: Label
var _swap_button: Button


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
	add_child(_build_top_bar("Abilities"))

	# Main layout.
	var main_vbox := VBoxContainer.new()
	main_vbox.set_anchors_preset(Control.PRESET_FULL_RECT)
	main_vbox.offset_top = 100.0
	main_vbox.add_theme_constant_override("separation", 16)
	add_child(main_vbox)

	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_bottom", 16)
	main_vbox.add_child(margin)

	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 16)
	margin.add_child(content)

	# ── Section: Equipped Slots ───────────────────────────────────────────────
	var equipped_label := Label.new()
	equipped_label.text = "Equipped (4 Slots)"
	equipped_label.add_theme_font_size_override("font_size", 24)
	equipped_label.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	content.add_child(equipped_label)

	_equipped_container = HBoxContainer.new()
	_equipped_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_equipped_container.add_theme_constant_override("separation", 10)

	for i in range(EQUIPPED_SLOT_COUNT):
		var slot := _create_equipped_slot(i)
		equipped_slots.append(slot)
		_equipped_container.add_child(slot)
	content.add_child(_equipped_container)

	# ── Section: Learned Abilities ────────────────────────────────────────────
	var learned_label := Label.new()
	learned_label.text = "Known Abilities"
	learned_label.add_theme_font_size_override("font_size", 24)
	learned_label.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	content.add_child(learned_label)

	learned_list = ItemList.new()
	learned_list.name = "LearnedList"
	learned_list.custom_minimum_size = Vector2(0.0, 300.0)
	learned_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	learned_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	learned_list.add_theme_font_size_override("font_size", 20)
	learned_list.fixed_icon_size = Vector2(32, 32)
	learned_list.item_selected.connect(_on_learned_item_selected)
	content.add_child(learned_list)

	# ── Section: Detail Panel ─────────────────────────────────────────────────
	ability_detail_panel = PanelContainer.new()
	ability_detail_panel.name = "DetailPanel"
	ability_detail_panel.custom_minimum_size = Vector2(0.0, 260.0)
	ability_detail_panel.visible = false

	var detail_style := StyleBoxFlat.new()
	detail_style.bg_color = Color(0.1, 0.1, 0.16, 1.0)
	detail_style.corner_radius_top_left = 12
	detail_style.corner_radius_top_right = 12
	detail_style.corner_radius_bottom_left = 12
	detail_style.corner_radius_bottom_right = 12
	detail_style.content_margin_left = 20.0
	detail_style.content_margin_right = 20.0
	detail_style.content_margin_top = 16.0
	detail_style.content_margin_bottom = 16.0
	detail_style.border_width_left = 1
	detail_style.border_width_right = 1
	detail_style.border_width_top = 1
	detail_style.border_width_bottom = 1
	detail_style.border_color = Color(0.25, 0.25, 0.35)
	ability_detail_panel.add_theme_stylebox_override("panel", detail_style)

	var detail_vbox := VBoxContainer.new()
	detail_vbox.add_theme_constant_override("separation", 8)

	_detail_name = Label.new()
	_detail_name.add_theme_font_size_override("font_size", 24)
	_detail_name.add_theme_color_override("font_color", Color.WHITE)
	detail_vbox.add_child(_detail_name)

	# Row: element, power, accuracy.
	var stat_row := HBoxContainer.new()
	stat_row.add_theme_constant_override("separation", 20)

	_detail_element = _create_detail_field("Element")
	stat_row.add_child(_detail_element)
	_detail_power = _create_detail_field("Power")
	stat_row.add_child(_detail_power)
	_detail_accuracy = _create_detail_field("Accuracy")
	stat_row.add_child(_detail_accuracy)
	detail_vbox.add_child(stat_row)

	# Row: PP, cooldown, targeting.
	var resource_row := HBoxContainer.new()
	resource_row.add_theme_constant_override("separation", 20)

	_detail_pp = _create_detail_field("PP")
	resource_row.add_child(_detail_pp)
	_detail_cooldown = _create_detail_field("Cooldown")
	resource_row.add_child(_detail_cooldown)
	_detail_targeting = _create_detail_field("Targeting")
	resource_row.add_child(_detail_targeting)
	detail_vbox.add_child(resource_row)

	# Description.
	_detail_description = Label.new()
	_detail_description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_detail_description.add_theme_font_size_override("font_size", 18)
	_detail_description.add_theme_color_override("font_color", Color(0.75, 0.75, 0.8))
	detail_vbox.add_child(_detail_description)

	# Swap button.
	_swap_button = Button.new()
	_swap_button.text = "Equip to Selected Slot"
	_swap_button.custom_minimum_size = Vector2(0.0, 52.0)
	_swap_button.disabled = true
	_swap_button.add_theme_font_size_override("font_size", 20)

	var swap_style := StyleBoxFlat.new()
	swap_style.bg_color = Color(0.2, 0.6, 0.4, 1.0)
	swap_style.corner_radius_top_left = 10
	swap_style.corner_radius_top_right = 10
	swap_style.corner_radius_bottom_left = 10
	swap_style.corner_radius_bottom_right = 10
	_swap_button.add_theme_stylebox_override("normal", swap_style)
	_swap_button.pressed.connect(_on_swap_pressed)
	detail_vbox.add_child(_swap_button)

	ability_detail_panel.add_child(detail_vbox)
	content.add_child(ability_detail_panel)


func _create_detail_field(label_text: String) -> Label:
	var label := Label.new()
	label.text = label_text + ": --"
	label.add_theme_font_size_override("font_size", 18)
	label.add_theme_color_override("font_color", Color(0.65, 0.65, 0.7))
	return label


func _create_equipped_slot(index: int) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = "EquippedSlot_%d" % index
	panel.custom_minimum_size = SLOT_SIZE

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.12, 0.2, 1.0)
	style.corner_radius_top_left = 10
	style.corner_radius_top_right = 10
	style.corner_radius_bottom_left = 10
	style.corner_radius_bottom_right = 10
	style.border_width_left = 2
	style.border_width_right = 2
	style.border_width_top = 2
	style.border_width_bottom = 2
	style.border_color = Color(0.25, 0.25, 0.35)
	style.content_margin_left = 8.0
	style.content_margin_right = 8.0
	style.content_margin_top = 8.0
	style.content_margin_bottom = 8.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 4)

	var slot_label := Label.new()
	slot_label.name = "SlotLabel"
	slot_label.text = "Slot %d" % (index + 1)
	slot_label.add_theme_font_size_override("font_size", 14)
	slot_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
	slot_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(slot_label)

	var ability_label := Label.new()
	ability_label.name = "AbilityLabel"
	ability_label.text = "-- Empty --"
	ability_label.add_theme_font_size_override("font_size", 18)
	ability_label.add_theme_color_override("font_color", Color.WHITE)
	ability_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ability_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(ability_label)
	panel.add_child(vbox)

	# Click handler.
	var btn := Button.new()
	btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	btn.flat = true
	var transparent := StyleBoxEmpty.new()
	btn.add_theme_stylebox_override("normal", transparent)
	btn.add_theme_stylebox_override("hover", transparent)
	btn.add_theme_stylebox_override("pressed", transparent)
	btn.add_theme_stylebox_override("focus", transparent)
	var idx := index
	btn.pressed.connect(func() -> void: _on_equipped_slot_pressed(idx))
	panel.add_child(btn)

	return panel


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

## Called by the SpriteDetailScreen after navigation.
func set_sprite_and_slot(sprite_instance: SpriteInstance, slot_index: int) -> void:
	_sprite_instance = sprite_instance
	_selected_equipped_slot = slot_index
	_refresh_display()


## Swap an ability into an equipped slot.
func swap_ability(slot_index: int, ability_id: int) -> void:
	if _sprite_instance == null:
		return
	if slot_index < 0 or slot_index >= EQUIPPED_SLOT_COUNT:
		return

	# Ensure the equipped array is big enough.
	while _sprite_instance.equipped_ability_ids.size() <= slot_index:
		_sprite_instance.equipped_ability_ids.append(0)

	_sprite_instance.equipped_ability_ids[slot_index] = ability_id
	_refresh_display()


## Show detail for a specific ability.
func show_ability_detail(ability_id: int) -> void:
	# Load ability data from registry (fallback display if not loaded).
	ability_detail_panel.visible = true

	_detail_name.text = "Ability #%d" % ability_id
	_detail_element.text = "Element: --"
	_detail_power.text = "Power: --"
	_detail_accuracy.text = "Accuracy: --"
	_detail_pp.text = "PP: --"
	_detail_cooldown.text = "Cooldown: --"
	_detail_targeting.text = "Targeting: --"
	_detail_description.text = "Ability details will be loaded from the ability registry."


## ── Display ──────────────────────────────────────────────────────────────────

func _refresh_display() -> void:
	if _sprite_instance == null:
		return

	# Update equipped slots.
	for i in range(EQUIPPED_SLOT_COUNT):
		var slot := equipped_slots[i]
		var vbox := slot.get_child(0) as VBoxContainer
		if vbox == null:
			continue
		var ability_label: Label = vbox.get_node_or_null("AbilityLabel") as Label
		if ability_label == null:
			continue

		if i < _sprite_instance.equipped_ability_ids.size() and _sprite_instance.equipped_ability_ids[i] > 0:
			ability_label.text = "Ability #%d" % _sprite_instance.equipped_ability_ids[i]
		else:
			ability_label.text = "-- Empty --"

		# Highlight selected slot.
		_highlight_equipped_slot(i, i == _selected_equipped_slot)

	# Update learned list.
	learned_list.clear()
	for ability_id in _sprite_instance.known_ability_ids:
		var is_equipped: bool = ability_id in _sprite_instance.equipped_ability_ids
		var prefix: String = "[E] " if is_equipped else ""
		learned_list.add_item("%sAbility #%d" % [prefix, ability_id])


func _highlight_equipped_slot(index: int, highlighted: bool) -> void:
	if index < 0 or index >= equipped_slots.size():
		return
	var slot := equipped_slots[index]
	var style := slot.get_theme_stylebox("panel") as StyleBoxFlat
	if style:
		var new_style := style.duplicate() as StyleBoxFlat
		new_style.border_color = Color(0.4, 0.7, 1.0) if highlighted else Color(0.25, 0.25, 0.35)
		slot.add_theme_stylebox_override("panel", new_style)


## ── Handlers ─────────────────────────────────────────────────────────────────

func _on_equipped_slot_pressed(index: int) -> void:
	# Deselect previous.
	if _selected_equipped_slot >= 0:
		_highlight_equipped_slot(_selected_equipped_slot, false)

	_selected_equipped_slot = index
	_highlight_equipped_slot(index, true)
	_update_swap_button()


func _on_learned_item_selected(index: int) -> void:
	_selected_learned_index = index
	if _sprite_instance and index < _sprite_instance.known_ability_ids.size():
		show_ability_detail(_sprite_instance.known_ability_ids[index])
	_update_swap_button()


func _on_swap_pressed() -> void:
	if _selected_equipped_slot < 0 or _selected_learned_index < 0:
		return
	if _sprite_instance == null:
		return
	if _selected_learned_index >= _sprite_instance.known_ability_ids.size():
		return

	var ability_id: int = _sprite_instance.known_ability_ids[_selected_learned_index]
	swap_ability(_selected_equipped_slot, ability_id)


func _update_swap_button() -> void:
	_swap_button.disabled = (_selected_equipped_slot < 0 or _selected_learned_index < 0)


func _on_back_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")

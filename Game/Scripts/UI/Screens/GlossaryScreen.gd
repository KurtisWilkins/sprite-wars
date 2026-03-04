## GlossaryScreen — Reference glossary with Races, Classes, and Equipment tabs.
## Provides a read-only encyclopedia of all game data: Sprite races and their
## stats, ability classes with full ability listings, and the equipment catalog.
class_name GlossaryScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const TAB_NAMES: PackedStringArray = PackedStringArray([
	"Races", "Classes", "Equipment",
])

const ELEMENT_COLORS: Dictionary = {
	"Fire": Color("ff6633"),
	"Water": Color("4d99ff"),
	"Earth": Color("997740"),
	"Air": Color("b3e6ff"),
	"Light": Color("ffff99"),
	"Dark": Color("804dbb"),
	"Nature": Color("4dcc4d"),
	"Electric": Color("ffe633"),
	"Ice": Color("99e6ff"),
	"Metal": Color("b3b3bf"),
	"Poison": Color("b34dcc"),
	"Psychic": Color("ff80cc"),
	"Spirit": Color("99cce6"),
	"Chaos": Color("e63366"),
}

const RARITY_COLORS: Dictionary = {
	"common": Color(0.55, 0.55, 0.55),
	"uncommon": Color(0.2, 0.8, 0.38),
	"rare": Color(0.2, 0.6, 1.0),
	"epic": Color(0.67, 0.27, 1.0),
	"legendary": Color(1.0, 0.67, 0.0),
}

const STAT_DISPLAY_NAMES: Dictionary = {
	"hp": "HP", "atk": "ATK", "def": "DEF",
	"spd": "SPD", "sp_atk": "SP.ATK", "sp_def": "SP.DEF",
}

## ── State ────────────────────────────────────────────────────────────────────

var _current_tab: int = 0
var _equipment_filter: String = "All"

## ── Nodes ────────────────────────────────────────────────────────────────────

var back_button: Button
var _tab_buttons: Array[Button] = []
var _content_scroll: ScrollContainer
var _content_container: VBoxContainer
var _equipment_cards_container: VBoxContainer
var _equipment_filter_chips: Dictionary = {}  # text -> Button


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
	add_child(_build_top_bar("Glossary"))

	# Main content area below top bar.
	var main := VBoxContainer.new()
	main.set_anchors_preset(Control.PRESET_FULL_RECT)
	main.offset_top = 100.0
	main.add_theme_constant_override("separation", 0)
	add_child(main)

	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_theme_constant_override("margin_left", 20)
	margin.add_theme_constant_override("margin_right", 20)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_bottom", 24)
	main.add_child(margin)

	var inner := VBoxContainer.new()
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inner.size_flags_vertical = Control.SIZE_EXPAND_FILL
	inner.add_theme_constant_override("separation", 12)
	margin.add_child(inner)

	# Tab buttons row.
	var tab_row := HBoxContainer.new()
	tab_row.add_theme_constant_override("separation", 8)
	tab_row.alignment = BoxContainer.ALIGNMENT_CENTER

	for i in range(TAB_NAMES.size()):
		var tab_btn := _create_tab_button(TAB_NAMES[i], i)
		_tab_buttons.append(tab_btn)
		tab_row.add_child(tab_btn)

	inner.add_child(tab_row)

	# Scrollable content below tabs.
	_content_scroll = ScrollContainer.new()
	_content_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_content_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	inner.add_child(_content_scroll)

	_content_container = VBoxContainer.new()
	_content_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content_container.add_theme_constant_override("separation", 12)
	_content_scroll.add_child(_content_container)

	# Show initial tab.
	_update_tab_styles()
	_populate_tab(_current_tab)


func _create_tab_button(text: String, index: int) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(140.0, 44.0)
	btn.add_theme_font_size_override("font_size", 22)

	var idx := index
	btn.pressed.connect(func() -> void: _on_tab_pressed(idx))

	return btn


func _update_tab_styles() -> void:
	for i in range(_tab_buttons.size()):
		var btn: Button = _tab_buttons[i]
		var style := StyleBoxFlat.new()
		if i == _current_tab:
			style.bg_color = Color(0.25, 0.55, 0.85, 1.0)
		else:
			style.bg_color = Color(0.18, 0.18, 0.25, 1.0)
		style.corner_radius_top_left = 16
		style.corner_radius_top_right = 16
		style.corner_radius_bottom_left = 16
		style.corner_radius_bottom_right = 16
		btn.add_theme_stylebox_override("normal", style)


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


## ── Tab Population ───────────────────────────────────────────────────────────

func _populate_tab(tab_index: int) -> void:
	if _content_container == null:
		return
	# Clear existing content immediately to avoid phantom children.
	for child in _content_container.get_children():
		_content_container.remove_child(child)
		child.queue_free()

	match tab_index:
		0:
			_populate_races_tab()
		1:
			_populate_classes_tab()
		2:
			_populate_equipment_tab()

	# Reset scroll position.
	_content_scroll.scroll_vertical = 0


## ── RACES TAB ────────────────────────────────────────────────────────────────

func _populate_races_tab() -> void:
	var all_races: Dictionary = SpriteRaces.get_all_races()

	if all_races.is_empty():
		_add_empty_label("No races found.")
		return

	# Sort by race_id.
	var race_keys: Array = all_races.keys()
	race_keys.sort()

	for race_id in race_keys:
		var race: Dictionary = all_races[race_id]
		var card := _create_race_card(race)
		_content_container.add_child(card)


func _create_race_card(race: Dictionary) -> PanelContainer:
	var panel := PanelContainer.new()

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.09, 0.09, 0.14, 1.0)
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_left = 12
	style.corner_radius_bottom_right = 12
	style.content_margin_left = 16.0
	style.content_margin_right = 16.0
	style.content_margin_top = 14.0
	style.content_margin_bottom = 14.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)

	# Race name.
	var race_name: String = str(race.get("race_name", "Unknown"))
	var name_label := Label.new()
	name_label.text = race_name
	name_label.add_theme_font_size_override("font_size", 22)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	vbox.add_child(name_label)

	# Element badges row.
	var element_types: Array = race.get("element_types", [])
	if element_types.size() > 0:
		var element_row := HBoxContainer.new()
		element_row.add_theme_constant_override("separation", 6)
		for element_name in element_types:
			var badge := _create_element_badge(str(element_name))
			element_row.add_child(badge)
		vbox.add_child(element_row)

	# Class type.
	var class_type: String = str(race.get("class_type", ""))
	if not class_type.is_empty():
		var class_label := Label.new()
		class_label.text = "Class: %s" % class_type
		class_label.add_theme_font_size_override("font_size", 18)
		class_label.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
		vbox.add_child(class_label)

	# Base stats row.
	var base_stats: Dictionary = race.get("base_stats", {})
	if not base_stats.is_empty():
		var stats_text := ""
		for stat_key in ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]:
			var val: int = int(base_stats.get(stat_key, 0))
			var display_name: String = STAT_DISPLAY_NAMES.get(stat_key, stat_key.to_upper())
			if not stats_text.is_empty():
				stats_text += "  "
			stats_text += "%s: %d" % [display_name, val]

		var stats_label := Label.new()
		stats_label.text = stats_text
		stats_label.add_theme_font_size_override("font_size", 18)
		stats_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
		stats_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(stats_label)

	# Rarity indicator.
	var rarity: String = str(race.get("rarity", "common"))
	if not rarity.is_empty():
		var rarity_color: Color = RARITY_COLORS.get(rarity, RARITY_COLORS.get("common", Color(0.55, 0.55, 0.55)))
		var rarity_label := Label.new()
		rarity_label.text = rarity.capitalize()
		rarity_label.add_theme_font_size_override("font_size", 16)
		rarity_label.add_theme_color_override("font_color", rarity_color)
		vbox.add_child(rarity_label)

	# Lore description.
	var lore: String = str(race.get("lore_description", ""))
	if not lore.is_empty():
		var lore_label := Label.new()
		lore_label.text = lore
		lore_label.add_theme_font_size_override("font_size", 16)
		lore_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		lore_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(lore_label)

	panel.add_child(vbox)
	return panel


func _create_element_badge(element_name: String) -> PanelContainer:
	var badge_panel := PanelContainer.new()

	var element_color: Color = ELEMENT_COLORS.get(element_name, Color(0.5, 0.5, 0.5))

	var badge_style := StyleBoxFlat.new()
	badge_style.bg_color = Color(element_color.r, element_color.g, element_color.b, 0.25)
	badge_style.corner_radius_top_left = 8
	badge_style.corner_radius_top_right = 8
	badge_style.corner_radius_bottom_left = 8
	badge_style.corner_radius_bottom_right = 8
	badge_style.content_margin_left = 8.0
	badge_style.content_margin_right = 8.0
	badge_style.content_margin_top = 2.0
	badge_style.content_margin_bottom = 2.0
	badge_panel.add_theme_stylebox_override("panel", badge_style)

	var badge_label := Label.new()
	badge_label.text = element_name
	badge_label.add_theme_font_size_override("font_size", 16)
	badge_label.add_theme_color_override("font_color", element_color)
	badge_panel.add_child(badge_label)

	return badge_panel


## ── CLASSES TAB ──────────────────────────────────────────────────────────────

func _populate_classes_tab() -> void:
	var all_abilities: Array[Dictionary] = AbilityDatabase.get_all_abilities()

	if all_abilities.is_empty():
		_add_empty_label("No abilities found.")
		return

	# Extract unique class_affinity values and sort alphabetically.
	var class_names: Array[String] = []
	for ability in all_abilities:
		var class_affinity: String = str(ability.get("class_affinity", ""))
		if not class_affinity.is_empty() and not class_names.has(class_affinity):
			class_names.append(class_affinity)
	class_names.sort()

	for class_name_str in class_names:
		# Section header.
		var header := Label.new()
		header.text = class_name_str
		header.add_theme_font_size_override("font_size", 26)
		header.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
		_content_container.add_child(header)

		var sep := HSeparator.new()
		_content_container.add_child(sep)

		# Get abilities for this class.
		var class_abilities: Array[Dictionary] = AbilityDatabase.get_abilities_by_class(class_name_str)

		for ability in class_abilities:
			var card := _create_ability_card(ability)
			_content_container.add_child(card)

		# Spacer after each class group.
		var spacer := Control.new()
		spacer.custom_minimum_size = Vector2(0.0, 8.0)
		_content_container.add_child(spacer)


func _create_ability_card(ability: Dictionary) -> PanelContainer:
	var panel := PanelContainer.new()

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.09, 0.09, 0.14, 1.0)
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_left = 12
	style.corner_radius_bottom_right = 12
	style.content_margin_left = 16.0
	style.content_margin_right = 16.0
	style.content_margin_top = 12.0
	style.content_margin_bottom = 12.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)

	# Top row: ability name + element badge.
	var top_row := HBoxContainer.new()
	top_row.add_theme_constant_override("separation", 10)

	var ability_name: String = str(ability.get("ability_name", "Unknown"))
	var name_label := Label.new()
	name_label.text = ability_name
	name_label.add_theme_font_size_override("font_size", 20)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	top_row.add_child(name_label)

	var element_type: String = str(ability.get("element_type", ""))
	if not element_type.is_empty():
		var badge := _create_element_badge(element_type)
		top_row.add_child(badge)

	vbox.add_child(top_row)

	# Stats row: targeting, power, accuracy, physical/special.
	var stats_row := HBoxContainer.new()
	stats_row.add_theme_constant_override("separation", 16)

	var targeting_type: String = str(ability.get("targeting_type", ""))
	if not targeting_type.is_empty():
		var targeting_label := Label.new()
		targeting_label.text = _format_targeting_type(targeting_type)
		targeting_label.add_theme_font_size_override("font_size", 16)
		targeting_label.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
		stats_row.add_child(targeting_label)

	var base_power: int = int(ability.get("base_power", 0))
	if base_power > 0:
		var power_label := Label.new()
		power_label.text = "PWR: %d" % base_power
		power_label.add_theme_font_size_override("font_size", 16)
		power_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
		stats_row.add_child(power_label)

	var accuracy: float = float(ability.get("accuracy", 0.0))
	if accuracy > 0.0:
		var acc_label := Label.new()
		acc_label.text = "ACC: %d%%" % int(accuracy * 100.0)
		acc_label.add_theme_font_size_override("font_size", 16)
		acc_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
		stats_row.add_child(acc_label)

	var pp_max: int = int(ability.get("pp_max", 0))
	if pp_max > 0:
		var pp_label := Label.new()
		pp_label.text = "PP: %d" % pp_max
		pp_label.add_theme_font_size_override("font_size", 16)
		pp_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
		stats_row.add_child(pp_label)

	var is_physical: bool = bool(ability.get("is_physical", true))
	var type_label := Label.new()
	type_label.text = "Physical" if is_physical else "Special"
	type_label.add_theme_font_size_override("font_size", 16)
	type_label.add_theme_color_override("font_color", Color(0.85, 0.65, 0.4) if is_physical else Color(0.6, 0.5, 0.85))
	stats_row.add_child(type_label)

	vbox.add_child(stats_row)

	# Description.
	var description: String = str(ability.get("description", ""))
	if not description.is_empty():
		var desc_label := Label.new()
		desc_label.text = description
		desc_label.add_theme_font_size_override("font_size", 16)
		desc_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(desc_label)

	panel.add_child(vbox)
	return panel


func _format_targeting_type(targeting: String) -> String:
	# Convert snake_case targeting types to readable labels.
	return targeting.replace("_", " ").capitalize()


## ── EQUIPMENT TAB ────────────────────────────────────────────────────────────

func _populate_equipment_tab() -> void:
	var all_equipment: Array[Dictionary] = EquipmentDatabase.get_all_equipment()

	if all_equipment.is_empty():
		_add_empty_label("No equipment found.")
		return

	# Build filter chips row.
	var filter_scroll := ScrollContainer.new()
	filter_scroll.custom_minimum_size = Vector2(0.0, 48.0)
	filter_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_content_container.add_child(filter_scroll)

	var filter_row := HBoxContainer.new()
	filter_row.add_theme_constant_override("separation", 6)
	filter_scroll.add_child(filter_row)

	# Collect unique slot types.
	var slot_types: Array[String] = []
	for equip in all_equipment:
		var slot_type: String = str(equip.get("slot_type", ""))
		if not slot_type.is_empty() and not slot_types.has(slot_type):
			slot_types.append(slot_type)
	slot_types.sort()

	# "All" chip plus one per slot type.
	var all_chip := _create_equipment_filter_chip("All")
	filter_row.add_child(all_chip)

	for slot_type in slot_types:
		var chip := _create_equipment_filter_chip(slot_type.capitalize())
		filter_row.add_child(chip)

	# Equipment cards container (separate from filter row for efficient re-render).
	_equipment_cards_container = VBoxContainer.new()
	_equipment_cards_container.add_theme_constant_override("separation", 8)
	_content_container.add_child(_equipment_cards_container)

	_refresh_equipment_cards()


func _refresh_equipment_cards() -> void:
	if _equipment_cards_container == null:
		return

	# Clear only the cards, not the filter row.
	for child in _equipment_cards_container.get_children():
		_equipment_cards_container.remove_child(child)
		child.queue_free()

	var all_equipment: Array[Dictionary] = EquipmentDatabase.get_all_equipment()

	# Sort equipment: by slot_type then by level_requirement.
	var sorted_equipment: Array[Dictionary] = all_equipment.duplicate()
	sorted_equipment.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		var slot_a: String = str(a.get("slot_type", ""))
		var slot_b: String = str(b.get("slot_type", ""))
		if slot_a != slot_b:
			return slot_a < slot_b
		var lvl_a: int = int(a.get("level_requirement", 0))
		var lvl_b: int = int(b.get("level_requirement", 0))
		return lvl_a < lvl_b
	)

	# Equipment cards.
	for equip in sorted_equipment:
		var slot_type: String = str(equip.get("slot_type", ""))
		if _equipment_filter != "All" and slot_type.capitalize() != _equipment_filter:
			continue
		var card := _create_equipment_card(equip)
		_equipment_cards_container.add_child(card)


func _create_equipment_filter_chip(text: String) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(0.0, 36.0)
	btn.add_theme_font_size_override("font_size", 16)

	var is_active: bool = (_equipment_filter == text)
	var style := StyleBoxFlat.new()
	if is_active:
		style.bg_color = Color(0.25, 0.55, 0.85, 1.0)
	else:
		style.bg_color = Color(0.18, 0.18, 0.25, 1.0)
	style.corner_radius_top_left = 16
	style.corner_radius_top_right = 16
	style.corner_radius_bottom_left = 16
	style.corner_radius_bottom_right = 16
	style.content_margin_left = 12.0
	style.content_margin_right = 12.0
	btn.add_theme_stylebox_override("normal", style)

	var filter_text := text
	btn.pressed.connect(func() -> void:
		_equipment_filter = filter_text
		_refresh_equipment_cards()
		_update_equipment_filter_styles()
	)

	_equipment_filter_chips[text] = btn
	return btn


func _update_equipment_filter_styles() -> void:
	for chip_text in _equipment_filter_chips:
		var chip: Button = _equipment_filter_chips[chip_text]
		var is_active: bool = (_equipment_filter == chip_text)
		var new_style := StyleBoxFlat.new()
		if is_active:
			new_style.bg_color = Color(0.25, 0.55, 0.85, 1.0)
		else:
			new_style.bg_color = Color(0.18, 0.18, 0.25, 1.0)
		new_style.corner_radius_top_left = 16
		new_style.corner_radius_top_right = 16
		new_style.corner_radius_bottom_left = 16
		new_style.corner_radius_bottom_right = 16
		new_style.content_margin_left = 12.0
		new_style.content_margin_right = 12.0
		chip.add_theme_stylebox_override("normal", new_style)


func _create_equipment_card(equip: Dictionary) -> PanelContainer:
	var panel := PanelContainer.new()

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.09, 0.09, 0.14, 1.0)
	style.corner_radius_top_left = 12
	style.corner_radius_top_right = 12
	style.corner_radius_bottom_left = 12
	style.corner_radius_bottom_right = 12
	style.content_margin_left = 16.0
	style.content_margin_right = 16.0
	style.content_margin_top = 12.0
	style.content_margin_bottom = 12.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)

	# Equipment name colored by rarity.
	var rarity: String = str(equip.get("rarity", "common"))
	var rarity_color: Color = RARITY_COLORS.get(rarity, RARITY_COLORS.get("common", Color(0.55, 0.55, 0.55)))

	var equip_name: String = str(equip.get("equipment_name", "Unknown"))
	var name_label := Label.new()
	name_label.text = equip_name
	name_label.add_theme_font_size_override("font_size", 20)
	name_label.add_theme_color_override("font_color", rarity_color)
	vbox.add_child(name_label)

	# Slot type and rarity row.
	var info_row := HBoxContainer.new()
	info_row.add_theme_constant_override("separation", 12)

	var slot_type: String = str(equip.get("slot_type", ""))
	if not slot_type.is_empty():
		var slot_label := Label.new()
		slot_label.text = slot_type.capitalize()
		slot_label.add_theme_font_size_override("font_size", 16)
		slot_label.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
		info_row.add_child(slot_label)

	# Rarity stars.
	var rarity_stars: String = _get_rarity_stars(rarity)
	var stars_label := Label.new()
	stars_label.text = rarity_stars
	stars_label.add_theme_font_size_override("font_size", 16)
	stars_label.add_theme_color_override("font_color", rarity_color)
	info_row.add_child(stars_label)

	vbox.add_child(info_row)

	# Stat bonuses (only non-zero).
	var stat_bonuses: Dictionary = equip.get("stat_bonuses", {})
	var bonus_parts: PackedStringArray = PackedStringArray()
	for stat_key in ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]:
		var val: int = int(stat_bonuses.get(stat_key, 0))
		if val != 0:
			var sign_str: String = "+" if val > 0 else ""
			var display_name: String = STAT_DISPLAY_NAMES.get(stat_key, stat_key.to_upper())
			bonus_parts.append("%s %s%d" % [display_name, sign_str, val])

	if bonus_parts.size() > 0:
		var bonus_label := Label.new()
		bonus_label.text = ", ".join(bonus_parts)
		bonus_label.add_theme_font_size_override("font_size", 18)
		bonus_label.add_theme_color_override("font_color", Color(0.4, 0.8, 0.5))
		bonus_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(bonus_label)

	# Element synergy.
	var element_synergy: String = str(equip.get("element_synergy", ""))
	if not element_synergy.is_empty():
		var syn_label := Label.new()
		syn_label.text = "Element Synergy: %s" % element_synergy
		syn_label.add_theme_font_size_override("font_size", 16)
		var syn_color: Color = ELEMENT_COLORS.get(element_synergy, Color(0.6, 0.6, 0.65))
		syn_label.add_theme_color_override("font_color", syn_color)
		vbox.add_child(syn_label)

	# Class synergy.
	var class_synergy: String = str(equip.get("class_synergy", ""))
	if not class_synergy.is_empty():
		var cls_label := Label.new()
		cls_label.text = "Class Synergy: %s" % class_synergy
		cls_label.add_theme_font_size_override("font_size", 16)
		cls_label.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
		vbox.add_child(cls_label)

	# Level requirement.
	var level_req: int = int(equip.get("level_requirement", 1))
	var lvl_label := Label.new()
	lvl_label.text = "Lv. %d Required" % level_req
	lvl_label.add_theme_font_size_override("font_size", 16)
	lvl_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
	vbox.add_child(lvl_label)

	# Description.
	var description: String = str(equip.get("description", ""))
	if not description.is_empty():
		var desc_label := Label.new()
		desc_label.text = description
		desc_label.add_theme_font_size_override("font_size", 16)
		desc_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(desc_label)

	panel.add_child(vbox)
	return panel


func _get_rarity_stars(rarity: String) -> String:
	match rarity:
		"common":
			return "*"
		"uncommon":
			return "**"
		"rare":
			return "***"
		"epic":
			return "****"
		"legendary":
			return "*****"
		_:
			return "*"


## ── Utility ──────────────────────────────────────────────────────────────────

func _add_empty_label(text: String) -> void:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 20)
	label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_content_container.add_child(label)


## ── Handlers ─────────────────────────────────────────────────────────────────

func _on_tab_pressed(index: int) -> void:
	if index == _current_tab:
		return
	_current_tab = index
	_equipment_filter = "All"
	_update_tab_styles()
	_populate_tab(_current_tab)


func _on_back_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")

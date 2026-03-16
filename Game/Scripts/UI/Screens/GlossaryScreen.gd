## GlossaryScreen — Reference glossary with Races, Elements, Classes, and Equipment tabs.
## Provides a read-only encyclopedia of all game data: Sprite races with element
## variants, the 14-element effectiveness chart, class definitions, and equipment.
class_name GlossaryScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const TAB_NAMES: PackedStringArray = PackedStringArray([
	"Races", "Elements", "Classes", "Equipment",
])

const ELEMENT_COLORS: Dictionary = {
	"Fire": Color("ff6633"),
	"Water": Color("4d99ff"),
	"Earth": Color("997740"),
	"Wind": Color("b3e6ff"),
	"Light": Color("ffff99"),
	"Dark": Color("804dbb"),
	"Plant": Color("4dcc4d"),
	"Electric": Color("ffe633"),
	"Ice": Color("99e6ff"),
	"Metal": Color("b3b3bf"),
	"Poison": Color("b34dcc"),
	"Fairy": Color("ff80cc"),
	"Solar": Color("ffcc33"),
	"Lunar": Color("9966cc"),
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

const ROLE_COLORS: Dictionary = {
	"melee": Color(0.85, 0.45, 0.3),
	"ranged": Color(0.3, 0.7, 0.85),
	"support": Color(0.4, 0.85, 0.5),
	"hybrid": Color(0.85, 0.75, 0.35),
}

## ── Class Icons (emoji-based for UI display) ────────────────────────────────

const CLASS_ICONS: Dictionary = {
	"Barbarian": "⚔", "Fighter": "🗡", "Archer": "🏹", "Spearman": "🔱",
	"Heavy": "🛡", "Wizard": "🪄", "Javelin": "💨", "Alchemist": "🧪",
	"Cleric": "✚", "Ambrosian": "✨", "Assassin": "🗡", "Monk": "🤜",
	"Crossbow": "🎯", "Handgunner": "🔫", "Siegebreaker": "🔨", "Paladin": "🛡",
}

## ── Slot Type Icons ─────────────────────────────────────────────────────────

const SLOT_ICONS: Dictionary = {
	"weapon": "⚔", "helmet": "⛑", "chest": "🛡", "legs": "👖",
	"boots": "👢", "gloves": "🧤", "ring": "💍", "amulet": "📿", "crystal": "💎",
}

## ── State ────────────────────────────────────────────────────────────────────

var _current_tab: int = 0
var _equipment_filter: String = "All"
var _expanded_races: Dictionary = {}  # race_id -> bool
var _race_selected_element: Dictionary = {}  # race_id -> element name

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
	btn.custom_minimum_size = Vector2(120.0, 44.0)
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
			_populate_elements_tab()
		2:
			_populate_classes_tab()
		3:
			_populate_equipment_tab()

	# Reset scroll position.
	_content_scroll.scroll_vertical = 0


## ── RACES TAB ────────────────────────────────────────────────────────────────

func _populate_races_tab() -> void:
	# Use SpriteGlossary for race names, descriptions, and element variants.
	if SpriteGlossary.RACE_NAMES.is_empty():
		_add_empty_label("No races found.")
		return

	var race_ids: Array = SpriteGlossary.RACE_NAMES.keys()
	race_ids.sort()

	for race_id in race_ids:
		var race_name: String = SpriteGlossary.RACE_NAMES[race_id]
		var race_description: String = SpriteGlossary.RACE_DESCRIPTIONS.get(race_id, "")
		var card := _create_race_card(race_id, race_name, race_description)
		_content_container.add_child(card)


func _create_race_card(race_id: int, race_name: String, race_description: String) -> PanelContainer:
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

	# Top row: sprite preview + race info
	var top_row := HBoxContainer.new()
	top_row.add_theme_constant_override("separation", 14)

	# Sprite portrait using SpriteTextureLoader
	var selected_element: String = _race_selected_element.get(race_id, "Fire")
	if not _race_selected_element.has(race_id):
		_race_selected_element[race_id] = "Fire"

	var portrait_bg := ColorRect.new()
	portrait_bg.custom_minimum_size = Vector2(80.0, 80.0)
	var preview_color: Color = ELEMENT_COLORS.get(selected_element, Color(0.5, 0.5, 0.5))
	portrait_bg.color = Color(preview_color.r, preview_color.g, preview_color.b, 0.15)

	var sprite_portrait := TextureRect.new()
	sprite_portrait.custom_minimum_size = Vector2(80.0, 80.0)
	sprite_portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	sprite_portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	sprite_portrait.set_anchors_preset(Control.PRESET_FULL_RECT)
	var race_tex: Texture2D = SpriteTextureLoader.get_race_texture(race_id, 0)
	if race_tex != null:
		sprite_portrait.texture = race_tex
	else:
		# Fallback: show race initial letter
		var initial_label := Label.new()
		initial_label.text = race_name[0] if race_name.length() > 0 else "?"
		initial_label.add_theme_font_size_override("font_size", 36)
		initial_label.add_theme_color_override("font_color", Color.WHITE)
		initial_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		initial_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		initial_label.set_anchors_preset(Control.PRESET_FULL_RECT)
		portrait_bg.add_child(initial_label)
	portrait_bg.add_child(sprite_portrait)

	top_row.add_child(portrait_bg)

	# Info column next to sprite preview
	var info_col := VBoxContainer.new()
	info_col.add_theme_constant_override("separation", 4)
	info_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var name_label := Label.new()
	name_label.text = race_name
	name_label.add_theme_font_size_override("font_size", 22)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	info_col.add_child(name_label)

	# Get rarity from SpriteRaces
	var race_data: Dictionary = SpriteRaces.get_race(race_id)
	var rarity_str: String = str(race_data.get("rarity", "common"))
	var rarity_color: Color = RARITY_COLORS.get(rarity_str, Color(0.55, 0.55, 0.55))
	var rarity_label := Label.new()
	rarity_label.text = rarity_str.capitalize()
	rarity_label.add_theme_font_size_override("font_size", 16)
	rarity_label.add_theme_color_override("font_color", rarity_color)
	info_col.add_child(rarity_label)

	top_row.add_child(info_col)

	# Expand/collapse toggle
	var toggle_btn := Button.new()
	var is_expanded: bool = _expanded_races.get(race_id, false)
	toggle_btn.text = "Collapse" if is_expanded else "Expand"
	toggle_btn.custom_minimum_size = Vector2(100.0, 32.0)
	toggle_btn.add_theme_font_size_override("font_size", 16)
	var toggle_style := StyleBoxFlat.new()
	toggle_style.bg_color = Color(0.18, 0.18, 0.25, 1.0)
	toggle_style.corner_radius_top_left = 8
	toggle_style.corner_radius_top_right = 8
	toggle_style.corner_radius_bottom_left = 8
	toggle_style.corner_radius_bottom_right = 8
	toggle_btn.add_theme_stylebox_override("normal", toggle_style)
	top_row.add_child(toggle_btn)

	vbox.add_child(top_row)

	# Element selector row
	var elem_label := Label.new()
	elem_label.text = "Element:"
	elem_label.add_theme_font_size_override("font_size", 15)
	elem_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
	vbox.add_child(elem_label)

	var elem_selector := HFlowContainer.new()
	elem_selector.add_theme_constant_override("h_separation", 4)
	elem_selector.add_theme_constant_override("v_separation", 4)

	for element_name in SpriteGlossary.ELEMENT_NAMES:
		var elem_btn := Button.new()
		elem_btn.text = str(element_name)
		elem_btn.custom_minimum_size = Vector2(0.0, 28.0)
		elem_btn.add_theme_font_size_override("font_size", 13)

		var elem_color: Color = ELEMENT_COLORS.get(str(element_name), Color(0.5, 0.5, 0.5))
		var elem_style := StyleBoxFlat.new()
		var is_selected: bool = (str(element_name) == selected_element)
		if is_selected:
			elem_style.bg_color = Color(elem_color.r, elem_color.g, elem_color.b, 0.4)
			elem_style.border_width_bottom = 2
			elem_style.border_color = elem_color
		else:
			elem_style.bg_color = Color(elem_color.r, elem_color.g, elem_color.b, 0.15)
		elem_style.corner_radius_top_left = 6
		elem_style.corner_radius_top_right = 6
		elem_style.corner_radius_bottom_left = 6
		elem_style.corner_radius_bottom_right = 6
		elem_style.content_margin_left = 6.0
		elem_style.content_margin_right = 6.0
		elem_btn.add_theme_stylebox_override("normal", elem_style)
		elem_btn.add_theme_color_override("font_color", elem_color)

		var rid := race_id
		var ename := str(element_name)
		var sp := sprite_preview
		elem_btn.pressed.connect(func() -> void:
			_race_selected_element[rid] = ename
			_populate_tab(0)
		)

		elem_selector.add_child(elem_btn)

	vbox.add_child(elem_selector)

	# Lore description.
	if not race_description.is_empty():
		var lore_label := Label.new()
		lore_label.text = race_description
		lore_label.add_theme_font_size_override("font_size", 16)
		lore_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		lore_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(lore_label)

	# Element variants section (collapsible content).
	var variants_container := VBoxContainer.new()
	variants_container.add_theme_constant_override("separation", 6)
	variants_container.visible = is_expanded

	# Element badges grid showing all 14 element variants.
	var element_grid_label := Label.new()
	element_grid_label.text = "Element Variants:"
	element_grid_label.add_theme_font_size_override("font_size", 18)
	element_grid_label.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
	variants_container.add_child(element_grid_label)

	# Use a flow container to wrap badges nicely.
	var badge_flow := HFlowContainer.new()
	badge_flow.add_theme_constant_override("h_separation", 6)
	badge_flow.add_theme_constant_override("v_separation", 6)

	for element_name in SpriteGlossary.ELEMENT_NAMES:
		var variant_name: String = "%s %s" % [element_name, race_name]
		var badge := _create_element_variant_badge(str(element_name), variant_name)
		badge_flow.add_child(badge)

	variants_container.add_child(badge_flow)

	# Show individual variant details when expanded.
	var entries: Array[Dictionary] = SpriteGlossary.get_entries_by_race(race_id)
	for entry in entries:
		var variant_panel := _create_variant_detail(entry)
		variants_container.add_child(variant_panel)

	vbox.add_child(variants_container)

	# Wire up toggle button.
	var rid := race_id
	var vc := variants_container
	var tb := toggle_btn
	toggle_btn.pressed.connect(func() -> void:
		_expanded_races[rid] = not _expanded_races.get(rid, false)
		vc.visible = _expanded_races[rid]
		tb.text = "Collapse" if _expanded_races[rid] else "Expand"
	)

	panel.add_child(vbox)
	return panel


func _create_element_variant_badge(element_name: String, variant_name: String) -> PanelContainer:
	var badge_panel := PanelContainer.new()
	badge_panel.tooltip_text = variant_name

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


func _create_variant_detail(entry: Dictionary) -> PanelContainer:
	var panel := PanelContainer.new()

	var element_name: String = str(entry.get("element", ""))
	var element_color: Color = ELEMENT_COLORS.get(element_name, Color(0.5, 0.5, 0.5))

	var style := StyleBoxFlat.new()
	style.bg_color = Color(element_color.r, element_color.g, element_color.b, 0.08)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.content_margin_left = 12.0
	style.content_margin_right = 12.0
	style.content_margin_top = 8.0
	style.content_margin_bottom = 8.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 4)

	# Variant name.
	var variant_name: String = str(entry.get("sprite_variant_name", "Unknown"))
	var name_label := Label.new()
	name_label.text = variant_name
	name_label.add_theme_font_size_override("font_size", 18)
	name_label.add_theme_color_override("font_color", element_color)
	vbox.add_child(name_label)

	# Variant description.
	var description: String = str(entry.get("description", ""))
	if not description.is_empty():
		var desc_label := Label.new()
		desc_label.text = description
		desc_label.add_theme_font_size_override("font_size", 15)
		desc_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(desc_label)

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


## ── ELEMENTS TAB ─────────────────────────────────────────────────────────────

func _populate_elements_tab() -> void:
	var element_ids: Array = ElementChart.ELEMENT_NAMES.keys()
	element_ids.sort()

	if element_ids.is_empty():
		_add_empty_label("No element data found.")
		return

	for element_id in element_ids:
		var element_name: String = ElementChart.ELEMENT_NAMES[element_id]
		var card := _create_element_card(element_name)
		_content_container.add_child(card)


func _create_element_card(element_name: String) -> PanelContainer:
	var panel := PanelContainer.new()

	var element_color: Color = ELEMENT_COLORS.get(element_name, Color(0.5, 0.5, 0.5))

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.09, 0.09, 0.14, 1.0)
	style.border_width_left = 4
	style.border_color = element_color
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

	# Element name header with badge.
	var header_row := HBoxContainer.new()
	header_row.add_theme_constant_override("separation", 10)

	var name_label := Label.new()
	name_label.text = element_name
	name_label.add_theme_font_size_override("font_size", 24)
	name_label.add_theme_color_override("font_color", element_color)
	header_row.add_child(name_label)

	vbox.add_child(header_row)

	# Strong against (super effective).
	var strengths: Array[String] = ElementChart.get_strengths(element_name)
	if strengths.size() > 0:
		var strong_label := Label.new()
		strong_label.text = "Strong against:"
		strong_label.add_theme_font_size_override("font_size", 17)
		strong_label.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
		vbox.add_child(strong_label)

		var strong_flow := HFlowContainer.new()
		strong_flow.add_theme_constant_override("h_separation", 6)
		strong_flow.add_theme_constant_override("v_separation", 4)
		for s_element in strengths:
			var badge := _create_element_badge(s_element)
			strong_flow.add_child(badge)
		vbox.add_child(strong_flow)

	# Weak against (not very effective).
	var weaknesses: Array[String] = ElementChart.get_weaknesses(element_name)
	if weaknesses.size() > 0:
		var weak_label := Label.new()
		weak_label.text = "Weak against:"
		weak_label.add_theme_font_size_override("font_size", 17)
		weak_label.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
		vbox.add_child(weak_label)

		var weak_flow := HFlowContainer.new()
		weak_flow.add_theme_constant_override("h_separation", 6)
		weak_flow.add_theme_constant_override("v_separation", 4)
		for w_element in weaknesses:
			var badge := _create_element_badge(w_element)
			weak_flow.add_child(badge)
		vbox.add_child(weak_flow)

	# Immunities.
	var immunities: Array[String] = ElementChart.get_immunities(element_name)
	if immunities.size() > 0:
		var immune_label := Label.new()
		immune_label.text = "Immune to:"
		immune_label.add_theme_font_size_override("font_size", 17)
		immune_label.add_theme_color_override("font_color", Color(0.4, 0.85, 0.5))
		vbox.add_child(immune_label)

		var immune_flow := HFlowContainer.new()
		immune_flow.add_theme_constant_override("h_separation", 6)
		immune_flow.add_theme_constant_override("v_separation", 4)
		for i_element in immunities:
			var badge := _create_element_badge(i_element)
			immune_flow.add_child(badge)
		vbox.add_child(immune_flow)

	panel.add_child(vbox)
	return panel


## ── CLASSES TAB ──────────────────────────────────────────────────────────────

func _populate_classes_tab() -> void:
	var all_classes: Dictionary = ClassDatabase.get_all_classes()

	if all_classes.is_empty():
		_add_empty_label("No classes found.")
		return

	# Group by role_type for organized display.
	var role_order: Array[String] = ["melee", "ranged", "support", "hybrid"]

	for role in role_order:
		var class_ids: Array[int] = ClassDatabase.get_classes_by_role(role)
		if class_ids.is_empty():
			continue

		class_ids.sort()

		# Role section header.
		var role_color: Color = ROLE_COLORS.get(role, Color(0.7, 0.7, 0.75))
		var header := Label.new()
		header.text = role.to_upper()
		header.add_theme_font_size_override("font_size", 26)
		header.add_theme_color_override("font_color", role_color)
		_content_container.add_child(header)

		var sep := HSeparator.new()
		_content_container.add_child(sep)

		for class_id in class_ids:
			var cls: Dictionary = all_classes[class_id]
			var card := _create_class_card(cls)
			_content_container.add_child(card)

		# Spacer after each role group.
		var spacer := Control.new()
		spacer.custom_minimum_size = Vector2(0.0, 8.0)
		_content_container.add_child(spacer)


func _create_class_card(cls: Dictionary) -> PanelContainer:
	var panel := PanelContainer.new()

	var role_type: String = str(cls.get("role_type", ""))
	var role_color: Color = ROLE_COLORS.get(role_type, Color(0.7, 0.7, 0.75))

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

	# Top row: class icon + class name + role badge.
	var top_row := HBoxContainer.new()
	top_row.add_theme_constant_override("separation", 10)

	var class_name_str: String = str(cls.get("class_name", "Unknown"))

	# Class icon
	var class_icon: String = CLASS_ICONS.get(class_name_str, "")
	if not class_icon.is_empty():
		var icon_bg := PanelContainer.new()
		var icon_style := StyleBoxFlat.new()
		icon_style.bg_color = Color(1.0, 1.0, 1.0, 0.05)
		icon_style.corner_radius_top_left = 8
		icon_style.corner_radius_top_right = 8
		icon_style.corner_radius_bottom_left = 8
		icon_style.corner_radius_bottom_right = 8
		icon_style.content_margin_left = 6.0
		icon_style.content_margin_right = 6.0
		icon_style.content_margin_top = 2.0
		icon_style.content_margin_bottom = 2.0
		icon_bg.add_theme_stylebox_override("panel", icon_style)
		icon_bg.custom_minimum_size = Vector2(36.0, 36.0)

		var icon_label := Label.new()
		icon_label.text = class_icon
		icon_label.add_theme_font_size_override("font_size", 24)
		icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		icon_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		icon_bg.add_child(icon_label)
		top_row.add_child(icon_bg)

	var name_label := Label.new()
	name_label.text = class_name_str
	name_label.add_theme_font_size_override("font_size", 20)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	top_row.add_child(name_label)

	# Role type badge.
	if not role_type.is_empty():
		var role_badge := PanelContainer.new()
		var badge_style := StyleBoxFlat.new()
		badge_style.bg_color = Color(role_color.r, role_color.g, role_color.b, 0.25)
		badge_style.corner_radius_top_left = 8
		badge_style.corner_radius_top_right = 8
		badge_style.corner_radius_bottom_left = 8
		badge_style.corner_radius_bottom_right = 8
		badge_style.content_margin_left = 8.0
		badge_style.content_margin_right = 8.0
		badge_style.content_margin_top = 2.0
		badge_style.content_margin_bottom = 2.0
		role_badge.add_theme_stylebox_override("panel", badge_style)

		var role_label := Label.new()
		role_label.text = role_type.capitalize()
		role_label.add_theme_font_size_override("font_size", 16)
		role_label.add_theme_color_override("font_color", role_color)
		role_badge.add_child(role_label)
		top_row.add_child(role_badge)

	vbox.add_child(top_row)

	# Description.
	var description: String = str(cls.get("description", ""))
	if not description.is_empty():
		var desc_label := Label.new()
		desc_label.text = description
		desc_label.add_theme_font_size_override("font_size", 16)
		desc_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		desc_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(desc_label)

	# Stat weights row.
	var stat_weights: Dictionary = cls.get("stat_weights", {})
	if not stat_weights.is_empty():
		var weights_label := Label.new()
		weights_label.text = "Stat Weights:"
		weights_label.add_theme_font_size_override("font_size", 17)
		weights_label.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
		vbox.add_child(weights_label)

		var stats_text := ""
		for stat_key in ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]:
			var val: int = int(stat_weights.get(stat_key, 0))
			var display_name: String = STAT_DISPLAY_NAMES.get(stat_key, stat_key.to_upper())
			if not stats_text.is_empty():
				stats_text += "  "
			stats_text += "%s: %s" % [display_name, _stat_weight_to_bar(val)]

		var stats_label := Label.new()
		stats_label.text = stats_text
		stats_label.add_theme_font_size_override("font_size", 16)
		stats_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
		stats_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(stats_label)

	# Available weapon types.
	var weapon_types: Array = cls.get("available_weapon_types", [])
	if weapon_types.size() > 0:
		var weapons_text := "Weapons: "
		var weapon_names: PackedStringArray = PackedStringArray()
		for wt in weapon_types:
			weapon_names.append(str(wt).replace("_", " ").capitalize())
		weapons_text += ", ".join(weapon_names)

		var weapons_label := Label.new()
		weapons_label.text = weapons_text
		weapons_label.add_theme_font_size_override("font_size", 16)
		weapons_label.add_theme_color_override("font_color", Color(0.55, 0.55, 0.6))
		weapons_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(weapons_label)

	panel.add_child(vbox)
	return panel


func _stat_weight_to_bar(weight: int) -> String:
	# Convert a 1-5 stat weight into a visual bar representation.
	var clamped: int = clampi(weight, 0, 5)
	var filled: String = ""
	for i in range(clamped):
		filled += "|"
	var empty: String = ""
	for i in range(5 - clamped):
		empty += "."
	return filled + empty


## ── EQUIPMENT TAB ────────────────────────────────────────────────────────────

func _populate_equipment_tab() -> void:
	var all_equipment: Array[Dictionary] = EquipmentDatabase.get_all_equipment_with_expansion()

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

	var all_equipment: Array[Dictionary] = EquipmentDatabase.get_all_equipment_with_expansion()

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

	# Top row with equipment icon + equipment info
	var top_equip_row := HBoxContainer.new()
	top_equip_row.add_theme_constant_override("separation", 12)

	# Equipment icon (PNG or fallback to slot emoji)
	var slot_type: String = str(equip.get("slot_type", ""))
	var rarity: String = str(equip.get("rarity", "common"))
	var rarity_color: Color = RARITY_COLORS.get(rarity, RARITY_COLORS.get("common", Color(0.55, 0.55, 0.55)))
	var slot_icon_text: String = SLOT_ICONS.get(slot_type, "?")

	var icon_container := PanelContainer.new()
	icon_container.custom_minimum_size = Vector2(44.0, 44.0)
	var icon_bg_style := StyleBoxFlat.new()
	icon_bg_style.bg_color = Color(rarity_color.r, rarity_color.g, rarity_color.b, 0.15)
	icon_bg_style.border_width_left = 1
	icon_bg_style.border_width_right = 1
	icon_bg_style.border_width_top = 1
	icon_bg_style.border_width_bottom = 1
	icon_bg_style.border_color = Color(rarity_color.r, rarity_color.g, rarity_color.b, 0.4)
	icon_bg_style.corner_radius_top_left = 8
	icon_bg_style.corner_radius_top_right = 8
	icon_bg_style.corner_radius_bottom_left = 8
	icon_bg_style.corner_radius_bottom_right = 8
	icon_container.add_theme_stylebox_override("panel", icon_bg_style)

	var equip_icon_path: String = str(equip.get("icon_path", ""))
	if not equip_icon_path.is_empty() and ResourceLoader.exists(equip_icon_path):
		var equip_icon_tex: Texture2D = load(equip_icon_path) as Texture2D
		if equip_icon_tex != null:
			var equip_icon_rect := TextureRect.new()
			equip_icon_rect.texture = equip_icon_tex
			equip_icon_rect.custom_minimum_size = Vector2(36.0, 36.0)
			equip_icon_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			equip_icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			icon_container.add_child(equip_icon_rect)
		else:
			var slot_icon_label := Label.new()
			slot_icon_label.text = slot_icon_text
			slot_icon_label.add_theme_font_size_override("font_size", 22)
			slot_icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			slot_icon_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			icon_container.add_child(slot_icon_label)
	else:
		var slot_icon_label := Label.new()
		slot_icon_label.text = slot_icon_text
		slot_icon_label.add_theme_font_size_override("font_size", 22)
		slot_icon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		slot_icon_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		icon_container.add_child(slot_icon_label)
	top_equip_row.add_child(icon_container)

	# Equipment name and info column
	var equip_info_col := VBoxContainer.new()
	equip_info_col.add_theme_constant_override("separation", 2)
	equip_info_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var equip_name: String = str(equip.get("equipment_name", "Unknown"))
	var name_label := Label.new()
	name_label.text = equip_name
	name_label.add_theme_font_size_override("font_size", 20)
	name_label.add_theme_color_override("font_color", rarity_color)
	equip_info_col.add_child(name_label)

	# Slot type and rarity row.
	var info_row := HBoxContainer.new()
	info_row.add_theme_constant_override("separation", 12)

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

	equip_info_col.add_child(info_row)
	top_equip_row.add_child(equip_info_col)
	vbox.add_child(top_equip_row)

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
	_equipment_filter_chips.clear()
	_update_tab_styles()
	_populate_tab(_current_tab)


func _on_back_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")

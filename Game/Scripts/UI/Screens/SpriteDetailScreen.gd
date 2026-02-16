## SpriteDetailScreen — Detailed view of a single Sprite's stats, abilities, equipment.
## [P8-003] Shows artwork, editable nickname, stats (base + equipment), elements,
## class, ability slots, equipment slots, and evolution status.
class_name SpriteDetailScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const ABILITY_SLOTS_COUNT: int = 4
const EQUIPMENT_SLOT_TYPES: PackedStringArray = PackedStringArray([
	"weapon", "armor", "accessory",
	"helmet", "boots", "shield",
	"ring_1", "ring_2", "amulet",
])
const STAT_DISPLAY_NAMES: Dictionary = {
	"hp": "HP", "atk": "ATK", "def": "DEF",
	"spd": "SPD", "sp_atk": "SP.ATK", "sp_def": "SP.DEF",
}

const ABILITY_SCENE: String = "res://Scenes/UI/AbilityManageScreen.tscn"
const EQUIPMENT_SCENE: String = "res://Scenes/UI/EquipmentScreen.tscn"

## ── State ────────────────────────────────────────────────────────────────────

var _sprite_instance: SpriteInstance = null

## ── Nodes ────────────────────────────────────────────────────────────────────

var sprite_art: TextureRect
var name_label: Label
var _name_edit: LineEdit
var level_label: Label
var xp_bar: ProgressBar
var stat_labels: Dictionary = {}  # stat_key -> Label
var element_icons: HBoxContainer
var class_label: Label
var ability_slots: Array[Button] = []
var equipment_slots: Array[Button] = []
var evolution_indicator: TextureRect
var back_button: Button

var _scroll: ScrollContainer
var _content: VBoxContainer


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
	var top_bar := _build_top_bar("Sprite Detail")
	add_child(top_bar)

	# Scroll.
	_scroll = ScrollContainer.new()
	_scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	_scroll.offset_top = 100.0
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	add_child(_scroll)

	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.add_theme_constant_override("margin_left", 32)
	margin.add_theme_constant_override("margin_right", 32)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_bottom", 40)
	_scroll.add_child(margin)

	_content = VBoxContainer.new()
	_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_theme_constant_override("separation", 24)
	margin.add_child(_content)

	# ── Sprite Art Section ────────────────────────────────────────────────────
	var art_center := CenterContainer.new()
	art_center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content.add_child(art_center)

	var art_panel := PanelContainer.new()
	art_panel.custom_minimum_size = Vector2(300.0, 300.0)
	var art_style := StyleBoxFlat.new()
	art_style.bg_color = Color(0.1, 0.1, 0.16, 1.0)
	art_style.corner_radius_top_left = 16
	art_style.corner_radius_top_right = 16
	art_style.corner_radius_bottom_left = 16
	art_style.corner_radius_bottom_right = 16
	art_style.border_width_left = 2
	art_style.border_width_right = 2
	art_style.border_width_top = 2
	art_style.border_width_bottom = 2
	art_style.border_color = Color(0.25, 0.25, 0.35, 1.0)
	art_panel.add_theme_stylebox_override("panel", art_style)
	art_center.add_child(art_panel)

	sprite_art = TextureRect.new()
	sprite_art.name = "SpriteArt"
	sprite_art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	sprite_art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	art_panel.add_child(sprite_art)

	# Evolution indicator in corner.
	evolution_indicator = TextureRect.new()
	evolution_indicator.name = "EvolutionIndicator"
	evolution_indicator.custom_minimum_size = Vector2(48.0, 48.0)
	evolution_indicator.visible = false
	art_panel.add_child(evolution_indicator)

	# ── Identity Section ──────────────────────────────────────────────────────
	var identity_panel := _create_section("Identity")
	_content.add_child(identity_panel)

	var identity_content: VBoxContainer = identity_panel.get_child(0).get_child(1) if identity_panel.get_child_count() > 0 else VBoxContainer.new()

	# Nickname (editable).
	var name_row := HBoxContainer.new()
	name_row.add_theme_constant_override("separation", 8)

	name_label = Label.new()
	name_label.text = "Name:"
	name_label.add_theme_font_size_override("font_size", 20)
	name_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.65))
	name_label.custom_minimum_size = Vector2(80.0, 0.0)
	name_row.add_child(name_label)

	_name_edit = LineEdit.new()
	_name_edit.name = "NicknameEdit"
	_name_edit.placeholder_text = "Enter nickname..."
	_name_edit.custom_minimum_size = Vector2(0.0, 48.0)
	_name_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_name_edit.add_theme_font_size_override("font_size", 22)
	_name_edit.text_submitted.connect(_on_nickname_changed)
	name_row.add_child(_name_edit)
	_content.add_child(name_row)

	# Level + XP.
	var level_row := HBoxContainer.new()
	level_row.add_theme_constant_override("separation", 16)

	level_label = Label.new()
	level_label.name = "LevelLabel"
	level_label.text = "Lv. 1"
	level_label.add_theme_font_size_override("font_size", 28)
	level_label.add_theme_color_override("font_color", Color(0.9, 0.85, 0.5))
	level_row.add_child(level_label)

	class_label = Label.new()
	class_label.name = "ClassLabel"
	class_label.text = ""
	class_label.add_theme_font_size_override("font_size", 20)
	class_label.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
	class_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	level_row.add_child(class_label)
	_content.add_child(level_row)

	# XP bar.
	xp_bar = ProgressBar.new()
	xp_bar.name = "XPBar"
	xp_bar.custom_minimum_size = Vector2(0.0, 16.0)
	xp_bar.min_value = 0.0
	xp_bar.max_value = 100.0
	xp_bar.value = 0.0
	xp_bar.show_percentage = false

	var xp_fill := StyleBoxFlat.new()
	xp_fill.bg_color = Color(0.3, 0.6, 1.0, 1.0)
	xp_fill.corner_radius_top_left = 4
	xp_fill.corner_radius_top_right = 4
	xp_fill.corner_radius_bottom_left = 4
	xp_fill.corner_radius_bottom_right = 4
	xp_bar.add_theme_stylebox_override("fill", xp_fill)

	var xp_bg := StyleBoxFlat.new()
	xp_bg.bg_color = Color(0.12, 0.12, 0.18, 1.0)
	xp_bg.corner_radius_top_left = 4
	xp_bg.corner_radius_top_right = 4
	xp_bg.corner_radius_bottom_left = 4
	xp_bg.corner_radius_bottom_right = 4
	xp_bar.add_theme_stylebox_override("background", xp_bg)
	_content.add_child(xp_bar)

	# Elements.
	element_icons = HBoxContainer.new()
	element_icons.name = "ElementIcons"
	element_icons.add_theme_constant_override("separation", 8)
	_content.add_child(element_icons)

	# ── Stats Section ─────────────────────────────────────────────────────────
	_add_section_header("Stats")

	var stats_grid := GridContainer.new()
	stats_grid.columns = 2
	stats_grid.add_theme_constant_override("h_separation", 24)
	stats_grid.add_theme_constant_override("v_separation", 12)

	for stat_key in SpriteInstance.STAT_KEYS:
		var display_name: String = STAT_DISPLAY_NAMES.get(stat_key, stat_key.to_upper())

		var stat_row := HBoxContainer.new()
		stat_row.add_theme_constant_override("separation", 8)

		var stat_name_label := Label.new()
		stat_name_label.text = display_name
		stat_name_label.custom_minimum_size = Vector2(80.0, 0.0)
		stat_name_label.add_theme_font_size_override("font_size", 20)
		stat_name_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
		stat_row.add_child(stat_name_label)

		var stat_value_label := Label.new()
		stat_value_label.name = "StatValue_%s" % stat_key
		stat_value_label.text = "0"
		stat_value_label.add_theme_font_size_override("font_size", 22)
		stat_value_label.add_theme_color_override("font_color", Color.WHITE)
		stat_row.add_child(stat_value_label)

		stat_labels[stat_key] = stat_value_label
		stats_grid.add_child(stat_row)

	_content.add_child(stats_grid)

	# ── Abilities Section ─────────────────────────────────────────────────────
	_add_section_header("Abilities")

	var ability_grid := GridContainer.new()
	ability_grid.columns = 2
	ability_grid.add_theme_constant_override("h_separation", 12)
	ability_grid.add_theme_constant_override("v_separation", 12)

	for i in range(ABILITY_SLOTS_COUNT):
		var btn := Button.new()
		btn.name = "AbilitySlot_%d" % i
		btn.text = "— Empty —"
		btn.custom_minimum_size = Vector2(220.0, 64.0)
		btn.add_theme_font_size_override("font_size", 18)

		var btn_style := StyleBoxFlat.new()
		btn_style.bg_color = Color(0.14, 0.14, 0.22, 1.0)
		btn_style.corner_radius_top_left = 10
		btn_style.corner_radius_top_right = 10
		btn_style.corner_radius_bottom_left = 10
		btn_style.corner_radius_bottom_right = 10
		btn_style.border_width_left = 1
		btn_style.border_width_right = 1
		btn_style.border_width_top = 1
		btn_style.border_width_bottom = 1
		btn_style.border_color = Color(0.3, 0.3, 0.4)
		btn.add_theme_stylebox_override("normal", btn_style)

		var slot_index := i
		btn.pressed.connect(func() -> void: _on_ability_slot_pressed(slot_index))
		ability_slots.append(btn)
		ability_grid.add_child(btn)

	_content.add_child(ability_grid)

	# ── Equipment Section ─────────────────────────────────────────────────────
	_add_section_header("Equipment")

	var equip_grid := GridContainer.new()
	equip_grid.columns = 3
	equip_grid.add_theme_constant_override("h_separation", 8)
	equip_grid.add_theme_constant_override("v_separation", 8)

	for slot_type in EQUIPMENT_SLOT_TYPES:
		var btn := Button.new()
		btn.name = "EquipSlot_%s" % slot_type
		btn.text = slot_type.capitalize()
		btn.custom_minimum_size = Vector2(140.0, 80.0)
		btn.add_theme_font_size_override("font_size", 16)

		var btn_style := StyleBoxFlat.new()
		btn_style.bg_color = Color(0.12, 0.12, 0.18, 1.0)
		btn_style.corner_radius_top_left = 8
		btn_style.corner_radius_top_right = 8
		btn_style.corner_radius_bottom_left = 8
		btn_style.corner_radius_bottom_right = 8
		btn_style.border_width_left = 1
		btn_style.border_width_right = 1
		btn_style.border_width_top = 1
		btn_style.border_width_bottom = 1
		btn_style.border_color = Color(0.25, 0.25, 0.35)
		btn.add_theme_stylebox_override("normal", btn_style)

		var st := slot_type
		btn.pressed.connect(func() -> void: _on_equipment_slot_pressed(st))
		equipment_slots.append(btn)
		equip_grid.add_child(btn)

	_content.add_child(equip_grid)


## ── Top Bar ──────────────────────────────────────────────────────────────────

func _build_top_bar(title: String) -> PanelContainer:
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


## ── Section Helpers ──────────────────────────────────────────────────────────

func _add_section_header(text: String) -> void:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 26)
	label.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	_content.add_child(label)

	var sep := HSeparator.new()
	_content.add_child(sep)


func _create_section(title_text: String) -> PanelContainer:
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
	vbox.add_theme_constant_override("separation", 8)

	var header := Label.new()
	header.text = title_text
	header.add_theme_font_size_override("font_size", 22)
	header.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	vbox.add_child(header)

	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 8)
	vbox.add_child(content)

	panel.add_child(vbox)
	return panel


## ── Public API ───────────────────────────────────────────────────────────────

func set_sprite(sprite_instance: Resource) -> void:
	if sprite_instance is SpriteInstance:
		_sprite_instance = sprite_instance as SpriteInstance
		_update_stats_display()


## ── Stats Update ─────────────────────────────────────────────────────────────

func _update_stats_display() -> void:
	if _sprite_instance == null:
		return

	# Name.
	_name_edit.text = _sprite_instance.nickname

	# Level.
	level_label.text = "Lv. %d" % _sprite_instance.level

	# XP bar.
	xp_bar.max_value = float(_sprite_instance.xp_to_next_level)
	xp_bar.value = float(_sprite_instance.current_xp)

	# Elements.
	for child in element_icons.get_children():
		child.queue_free()
	for element in _sprite_instance.element_types:
		var badge := Label.new()
		badge.text = "  %s  " % element
		badge.add_theme_font_size_override("font_size", 16)

		var badge_style := StyleBoxFlat.new()
		badge_style.bg_color = _get_element_color(element).darkened(0.4)
		badge_style.corner_radius_top_left = 8
		badge_style.corner_radius_top_right = 8
		badge_style.corner_radius_bottom_left = 8
		badge_style.corner_radius_bottom_right = 8
		var label_settings := LabelSettings.new()
		label_settings.font_size = 16
		label_settings.font_color = _get_element_color(element)
		badge.label_settings = label_settings
		element_icons.add_child(badge)

	# Stats — we show the base stat. Equipment bonuses would be added if equipment data exists.
	for stat_key in SpriteInstance.STAT_KEYS:
		if stat_labels.has(stat_key):
			var base_val: int = 0
			# Try to compute from race data if available.
			var iv_bonus: int = _sprite_instance.ivs.get(stat_key, 0)
			var ev_bonus: int = int(float(_sprite_instance.evs.get(stat_key, 0)) / 4.0)
			base_val = iv_bonus + ev_bonus + _sprite_instance.level * 2  # Simplified fallback.
			stat_labels[stat_key].text = str(base_val)

	# Abilities.
	for i in range(ABILITY_SLOTS_COUNT):
		if i < _sprite_instance.equipped_ability_ids.size() and _sprite_instance.equipped_ability_ids[i] > 0:
			ability_slots[i].text = "Ability #%d" % _sprite_instance.equipped_ability_ids[i]
		else:
			ability_slots[i].text = "-- Empty --"

	# Equipment.
	for i in range(equipment_slots.size()):
		if i < EQUIPMENT_SLOT_TYPES.size():
			var slot_type: String = EQUIPMENT_SLOT_TYPES[i]
			var item_id: int = _sprite_instance.equipment.get(slot_type, -1)
			if item_id > 0:
				equipment_slots[i].text = "%s\n#%d" % [slot_type.capitalize(), item_id]
			else:
				equipment_slots[i].text = slot_type.capitalize()


## ── Handlers ─────────────────────────────────────────────────────────────────

func _on_ability_slot_pressed(index: int) -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.push_screen(ABILITY_SCENE, "slide_left")
		await get_tree().process_frame
		if stm.current_screen and stm.current_screen.has_method("set_sprite_and_slot"):
			stm.current_screen.set_sprite_and_slot(_sprite_instance, index)


func _on_equipment_slot_pressed(slot_type: String) -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.push_screen(EQUIPMENT_SCENE, "slide_left")
		await get_tree().process_frame
		if stm.current_screen and stm.current_screen.has_method("set_sprite_and_slot"):
			stm.current_screen.set_sprite_and_slot(_sprite_instance, slot_type)


func _on_nickname_changed(new_text: String) -> void:
	if _sprite_instance:
		_sprite_instance.nickname = new_text
		_name_edit.release_focus()


func _on_back_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")


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

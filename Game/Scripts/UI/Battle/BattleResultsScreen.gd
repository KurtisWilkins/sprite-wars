## BattleResultsScreen -- Post-battle results overlay.
## Displays victory/defeat banner, animated XP bars per sprite with level-up
## effects, loot rewards, evolution notifications, and a continue button.
extends CanvasLayer

## -- Signals ------------------------------------------------------------------

signal results_closed()

## -- Sub-components -----------------------------------------------------------

var _root: Control = null
var _background: Panel = null
var _title_label: Label = null
var _xp_container: VBoxContainer = null
var _rewards_container: VBoxContainer = null
var _continue_button: Button = null

## XP bar entries: Dictionary {unit_id: {bar: ProgressBar, label: Label, name_label: Label, level_label: Label}}
var xp_bars: Array[Dictionary] = []

## Rewards list container.
var rewards_list: VBoxContainer = null

## -- Constants ----------------------------------------------------------------

const XP_BAR_WIDTH: float = 600.0
const XP_BAR_HEIGHT: float = 20.0
const XP_FILL_DURATION: float = 1.5
const LEVEL_UP_FLASH_COLOR := Color(1.0, 0.95, 0.5)
const VICTORY_COLOR := Color(1.0, 0.85, 0.2)
const DEFEAT_COLOR := Color(0.7, 0.2, 0.2)

const TITLE_FONT_SIZE: int = 48
const NAME_FONT_SIZE: int = 22
const LEVEL_FONT_SIZE: int = 20
const REWARD_FONT_SIZE: int = 20
const BUTTON_FONT_SIZE: int = 24

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	layer = 10  # Above everything else.
	_build_ui()
	_root.visible = false


func _build_ui() -> void:
	# Root control covering the full viewport.
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_STOP  # Block input to layers below.

	# Semi-transparent background.
	_background = Panel.new()
	_background.set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color = Color(0, 0, 0, 0.75)
	_background.add_theme_stylebox_override("panel", bg_style)
	_background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(_background)

	# Scrollable content area.
	var scroll := ScrollContainer.new()
	scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	scroll.set_anchor_and_offset(SIDE_TOP, 0, 60)
	scroll.set_anchor_and_offset(SIDE_BOTTOM, 1, -100)
	scroll.set_anchor_and_offset(SIDE_LEFT, 0, 40)
	scroll.set_anchor_and_offset(SIDE_RIGHT, 1, -40)
	scroll.mouse_filter = Control.MOUSE_FILTER_STOP

	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 20)

	# Title label.
	_title_label = Label.new()
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.add_theme_font_size_override("font_size", TITLE_FONT_SIZE)
	_title_label.add_theme_color_override("font_color", VICTORY_COLOR)
	_title_label.text = "VICTORY!"
	_title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(_title_label)

	# Separator.
	var sep := HSeparator.new()
	sep.add_theme_constant_override("separation", 12)
	content.add_child(sep)

	# XP bars container.
	var xp_header := Label.new()
	xp_header.text = "Experience Gained"
	xp_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	xp_header.add_theme_font_size_override("font_size", NAME_FONT_SIZE)
	xp_header.add_theme_color_override("font_color", Color(0.8, 0.8, 0.9))
	xp_header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(xp_header)

	_xp_container = VBoxContainer.new()
	_xp_container.add_theme_constant_override("separation", 12)
	_xp_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(_xp_container)

	# Rewards container.
	var rewards_sep := HSeparator.new()
	rewards_sep.add_theme_constant_override("separation", 12)
	content.add_child(rewards_sep)

	var rewards_header := Label.new()
	rewards_header.text = "Rewards"
	rewards_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rewards_header.add_theme_font_size_override("font_size", NAME_FONT_SIZE)
	rewards_header.add_theme_color_override("font_color", Color(0.8, 0.8, 0.9))
	rewards_header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(rewards_header)

	_rewards_container = VBoxContainer.new()
	_rewards_container.add_theme_constant_override("separation", 8)
	_rewards_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(_rewards_container)
	rewards_list = _rewards_container

	scroll.add_child(content)
	_root.add_child(scroll)

	# Continue button at the bottom.
	_continue_button = Button.new()
	_continue_button.text = "Continue"
	_continue_button.add_theme_font_size_override("font_size", BUTTON_FONT_SIZE)
	_continue_button.custom_minimum_size = Vector2(300.0, 60.0)
	_continue_button.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	_continue_button.set_anchor_and_offset(SIDE_TOP, 1, -80)
	_continue_button.set_anchor_and_offset(SIDE_BOTTOM, 1, -20)
	_continue_button.set_anchor_and_offset(SIDE_LEFT, 0.5, -150)
	_continue_button.set_anchor_and_offset(SIDE_RIGHT, 0.5, 150)
	_continue_button.focus_mode = Control.FOCUS_NONE

	var btn_style := StyleBoxFlat.new()
	btn_style.bg_color = Color(0.2, 0.45, 0.8)
	btn_style.set_corner_radius_all(10)
	btn_style.set_content_margin_all(12)
	_continue_button.add_theme_stylebox_override("normal", btn_style)

	var btn_pressed := btn_style.duplicate()
	btn_pressed.bg_color = Color(0.15, 0.35, 0.65)
	_continue_button.add_theme_stylebox_override("pressed", btn_pressed)

	var btn_hover := btn_style.duplicate()
	btn_hover.bg_color = Color(0.25, 0.5, 0.9)
	_continue_button.add_theme_stylebox_override("hover", btn_hover)

	_continue_button.pressed.connect(_on_continue_pressed)
	_root.add_child(_continue_button)

	add_child(_root)

## -- Rarity Colors -----------------------------------------------------------

const RARITY_COLORS: Dictionary = {
	"common": Color(0.55, 0.55, 0.55),
	"uncommon": Color(0.2, 0.8, 0.38),
	"rare": Color(0.2, 0.6, 1.0),
	"epic": Color(0.67, 0.27, 1.0),
	"legendary": Color(1.0, 0.67, 0.0),
}

const RARITY_BG_COLORS: Dictionary = {
	"common": Color(0.15, 0.15, 0.18, 0.9),
	"uncommon": Color(0.08, 0.2, 0.12, 0.9),
	"rare": Color(0.08, 0.12, 0.25, 0.9),
	"epic": Color(0.15, 0.08, 0.25, 0.9),
	"legendary": Color(0.25, 0.18, 0.05, 0.9),
}

const RARITY_LABELS: Dictionary = {
	"common": "Common",
	"uncommon": "Uncommon",
	"rare": "Rare",
	"epic": "Epic",
	"legendary": "Legendary",
}

const SLOT_ICONS: Dictionary = {
	"weapon": "Weapon",
	"helmet": "Helmet",
	"chest": "Chest",
	"legs": "Legs",
	"boots": "Boots",
	"gloves": "Gloves",
	"ring": "Ring",
	"amulet": "Amulet",
	"crystal": "Crystal",
}

## -- Public API ---------------------------------------------------------------

## Show the results screen with battle outcome data.
## result: {
##   outcome: String ("player_win" | "enemy_win" | "draw"),
##   xp_per_sprite: Dictionary {instance_id: {name: String, xp_gained: int, old_level: int, new_level: int, old_xp: int, new_xp: int, xp_to_next: int}},
##   items: Array[Dictionary] ({name: String, icon: Texture2D, quantity: int}),
##   equipment: Array[Dictionary] ({equipment_name, slot_type, rarity, stat_bonuses, element_synergy, description}),
##   currency: int,
##   evolutions: Array[Dictionary] ({name: String, old_form: String, new_form: String}),
## }
func show_results(result: Dictionary) -> void:
	_clear_previous()

	var outcome: String = result.get("outcome", "player_win")

	# Set title.
	match outcome:
		"player_win":
			_title_label.text = "VICTORY!"
			_title_label.add_theme_color_override("font_color", VICTORY_COLOR)
		"enemy_win":
			_title_label.text = "DEFEAT"
			_title_label.add_theme_color_override("font_color", DEFEAT_COLOR)
		"draw":
			_title_label.text = "DRAW"
			_title_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.8))

	# Build XP bars.
	var xp_data: Dictionary = result.get("xp_per_sprite", {})
	var delay: float = 0.3
	for instance_id in xp_data:
		var sprite_xp: Dictionary = xp_data[instance_id]
		var xp_entry: Dictionary = _create_xp_bar(sprite_xp)
		xp_bars.append(xp_entry)
		# Animate with staggered delay.
		_animate_xp_bar(xp_entry, sprite_xp, delay)
		delay += 0.4

	# Build rewards list.
	var items: Array = result.get("items", [])
	for item in items:
		_add_reward_entry(
			str(item.get("name", "Unknown")),
			"x%d" % item.get("quantity", 1),
			item.get("icon", null)
		)

	var currency: int = result.get("currency", 0)
	if currency > 0:
		_add_reward_entry("Gold", str(currency), null)

	# Equipment drops — displayed as rarity-colored cards.
	var equipment_drops: Array = result.get("equipment", [])
	if equipment_drops.size() > 0:
		_add_equipment_header()
		for equip in equipment_drops:
			_add_equipment_card(equip, delay)
			delay += 0.25

	# Evolution notifications.
	var evolutions: Array = result.get("evolutions", [])
	for evo in evolutions:
		_add_evolution_notification(evo)

	# Show with fade-in.
	_root.visible = true
	_root.modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(_root, "modulate:a", 1.0, 0.4)\
		.set_trans(Tween.TRANS_QUAD)\
		.set_ease(Tween.EASE_OUT)

## -- Private: XP Bar Construction ---------------------------------------------

func _create_xp_bar(sprite_xp: Dictionary) -> Dictionary:
	var container := HBoxContainer.new()
	container.add_theme_constant_override("separation", 12)
	container.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	# Sprite name.
	var name_label := Label.new()
	name_label.text = str(sprite_xp.get("name", "Sprite"))
	name_label.add_theme_font_size_override("font_size", NAME_FONT_SIZE)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	name_label.custom_minimum_size.x = 150.0
	container.add_child(name_label)

	# XP bar.
	var bar_vbox := VBoxContainer.new()
	bar_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var bar := ProgressBar.new()
	bar.custom_minimum_size = Vector2(XP_BAR_WIDTH, XP_BAR_HEIGHT)
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.min_value = 0.0
	bar.show_percentage = false

	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = Color(0.3, 0.6, 1.0)
	fill_style.set_corner_radius_all(4)
	bar.add_theme_stylebox_override("fill", fill_style)

	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color = Color(0.12, 0.12, 0.18)
	bg_style.set_corner_radius_all(4)
	bar.add_theme_stylebox_override("background", bg_style)

	bar_vbox.add_child(bar)

	# XP text below bar.
	var xp_label := Label.new()
	xp_label.add_theme_font_size_override("font_size", 14)
	xp_label.add_theme_color_override("font_color", Color(0.6, 0.65, 0.75))
	xp_label.text = ""
	bar_vbox.add_child(xp_label)

	container.add_child(bar_vbox)

	# Level label.
	var level_label := Label.new()
	level_label.text = "Lv.%d" % sprite_xp.get("old_level", 1)
	level_label.add_theme_font_size_override("font_size", LEVEL_FONT_SIZE)
	level_label.add_theme_color_override("font_color", Color(0.8, 0.85, 0.95))
	level_label.custom_minimum_size.x = 80.0
	level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	container.add_child(level_label)

	_xp_container.add_child(container)

	return {
		"container": container,
		"bar": bar,
		"label": xp_label,
		"name_label": name_label,
		"level_label": level_label,
	}


## Animate an XP bar filling, with level-up flash if applicable.
func _animate_xp_bar(xp_entry: Dictionary, sprite_xp: Dictionary, delay: float) -> void:
	var bar: ProgressBar = xp_entry["bar"]
	var label: Label = xp_entry["label"]
	var level_label: Label = xp_entry["level_label"]

	var old_level: int = sprite_xp.get("old_level", 1)
	var new_level: int = sprite_xp.get("new_level", old_level)
	var xp_gained: int = sprite_xp.get("xp_gained", 0)
	var old_xp: int = sprite_xp.get("old_xp", 0)
	var xp_to_next: int = sprite_xp.get("xp_to_next", 100)

	# Set initial bar state.
	bar.max_value = float(xp_to_next)
	bar.value = float(old_xp)
	label.text = "+%d XP" % xp_gained

	# Animate the bar filling.
	var tween := create_tween()
	tween.tween_interval(delay)

	if new_level > old_level:
		# Fill to max first, then flash for level up.
		tween.tween_property(bar, "value", float(xp_to_next), XP_FILL_DURATION * 0.6)\
			.set_trans(Tween.TRANS_QUAD)\
			.set_ease(Tween.EASE_OUT)

		# Level up flash.
		tween.tween_callback(func() -> void:
			level_label.text = "Lv.%d" % new_level
			level_label.add_theme_color_override("font_color", LEVEL_UP_FLASH_COLOR)
			var flash_tween := create_tween()
			flash_tween.tween_property(level_label, "scale", Vector2(1.3, 1.3), 0.15)
			flash_tween.tween_property(level_label, "scale", Vector2(1.0, 1.0), 0.15)
			flash_tween.tween_callback(func() -> void:
				level_label.add_theme_color_override("font_color", Color(0.8, 0.85, 0.95))
			)
		)

		# Reset bar to show remainder XP at new level.
		var new_xp: int = sprite_xp.get("new_xp", 0)
		var new_xp_to_next: int = SpriteInstance.xp_for_level(new_level + 1)
		tween.tween_callback(func() -> void:
			bar.max_value = float(new_xp_to_next)
			bar.value = 0.0
		)
		tween.tween_property(bar, "value", float(new_xp), XP_FILL_DURATION * 0.4)\
			.set_trans(Tween.TRANS_QUAD)\
			.set_ease(Tween.EASE_OUT)
	else:
		# Simple fill without level up.
		var target_xp: float = float(old_xp + xp_gained)
		tween.tween_property(bar, "value", target_xp, XP_FILL_DURATION)\
			.set_trans(Tween.TRANS_QUAD)\
			.set_ease(Tween.EASE_OUT)

## -- Private: Rewards ---------------------------------------------------------

func _add_reward_entry(item_name: String, quantity_text: String, icon: Texture2D) -> void:
	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 10)

	if icon != null:
		var icon_rect := TextureRect.new()
		icon_rect.custom_minimum_size = Vector2(28, 28)
		icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon_rect.texture = icon
		icon_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		hbox.add_child(icon_rect)

	var name_lbl := Label.new()
	name_lbl.text = item_name
	name_lbl.add_theme_font_size_override("font_size", REWARD_FONT_SIZE)
	name_lbl.add_theme_color_override("font_color", Color.WHITE)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(name_lbl)

	var qty_lbl := Label.new()
	qty_lbl.text = quantity_text
	qty_lbl.add_theme_font_size_override("font_size", REWARD_FONT_SIZE)
	qty_lbl.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3))
	qty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	qty_lbl.custom_minimum_size.x = 80.0
	hbox.add_child(qty_lbl)

	_rewards_container.add_child(hbox)


func _add_evolution_notification(evo: Dictionary) -> void:
	var panel := PanelContainer.new()
	var evo_style := StyleBoxFlat.new()
	evo_style.bg_color = Color(0.15, 0.1, 0.3, 0.9)
	evo_style.set_border_width_all(2)
	evo_style.border_color = Color(0.6, 0.4, 1.0)
	evo_style.set_corner_radius_all(8)
	evo_style.set_content_margin_all(12)
	panel.add_theme_stylebox_override("panel", evo_style)

	var label := Label.new()
	label.text = "%s evolved from %s to %s!" % [
		str(evo.get("name", "?")),
		str(evo.get("old_form", "?")),
		str(evo.get("new_form", "?"))
	]
	label.add_theme_font_size_override("font_size", NAME_FONT_SIZE)
	label.add_theme_color_override("font_color", Color(0.8, 0.6, 1.0))
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART

	panel.add_child(label)
	_rewards_container.add_child(panel)

## -- Private: Equipment Drop Cards -------------------------------------------

func _add_equipment_header() -> void:
	var sep := HSeparator.new()
	sep.add_theme_constant_override("separation", 8)
	_rewards_container.add_child(sep)

	var header := Label.new()
	header.text = "Equipment Found!"
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	header.add_theme_font_size_override("font_size", NAME_FONT_SIZE)
	header.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3))
	header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_rewards_container.add_child(header)


func _add_equipment_card(equip_data: Dictionary, delay: float) -> void:
	var rarity: String = str(equip_data.get("rarity", "common"))
	var rarity_color: Color = RARITY_COLORS.get(rarity, RARITY_COLORS["common"])
	var bg_color: Color = RARITY_BG_COLORS.get(rarity, RARITY_BG_COLORS["common"])
	var rarity_label: String = RARITY_LABELS.get(rarity, "Common")
	var slot_type: String = str(equip_data.get("slot_type", "weapon"))
	var slot_label: String = SLOT_ICONS.get(slot_type, slot_type.capitalize())

	# Card panel.
	var card := PanelContainer.new()
	var card_style := StyleBoxFlat.new()
	card_style.bg_color = bg_color
	card_style.set_border_width_all(2)
	card_style.border_color = rarity_color
	card_style.set_corner_radius_all(10)
	card_style.set_content_margin_all(14)
	card.add_theme_stylebox_override("panel", card_style)

	# Start invisible for animation.
	card.modulate.a = 0.0
	card.scale = Vector2(0.8, 0.8)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 4)

	# Row 1: Name + Rarity badge.
	var name_row := HBoxContainer.new()
	name_row.add_theme_constant_override("separation", 8)

	var name_lbl := Label.new()
	name_lbl.text = str(equip_data.get("equipment_name", "Unknown Equipment"))
	name_lbl.add_theme_font_size_override("font_size", 22)
	name_lbl.add_theme_color_override("font_color", rarity_color)
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_row.add_child(name_lbl)

	var rarity_badge := Label.new()
	rarity_badge.text = rarity_label
	rarity_badge.add_theme_font_size_override("font_size", 14)
	rarity_badge.add_theme_color_override("font_color", rarity_color)
	name_row.add_child(rarity_badge)
	vbox.add_child(name_row)

	# Row 2: Slot type + Element synergy.
	var meta_row := HBoxContainer.new()
	meta_row.add_theme_constant_override("separation", 12)

	var slot_lbl := Label.new()
	slot_lbl.text = slot_label
	slot_lbl.add_theme_font_size_override("font_size", 16)
	slot_lbl.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	meta_row.add_child(slot_lbl)

	var element_synergy: String = str(equip_data.get("element_synergy", ""))
	if not element_synergy.is_empty():
		var synergy_lbl := Label.new()
		synergy_lbl.text = "%s Synergy" % element_synergy
		synergy_lbl.add_theme_font_size_override("font_size", 14)
		synergy_lbl.add_theme_color_override("font_color", Color(0.4, 0.8, 0.6))
		meta_row.add_child(synergy_lbl)
	vbox.add_child(meta_row)

	# Row 3: Stat bonuses in a compact grid.
	var stat_bonuses: Dictionary = equip_data.get("stat_bonuses", {})
	var stat_text := ""
	var stat_parts: Array[String] = []
	for key in ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]:
		var val: int = int(stat_bonuses.get(key, 0))
		if val != 0:
			var label: String = key.to_upper().replace("_", ".")
			var sign_str: String = "+" if val > 0 else ""
			stat_parts.append("%s %s%d" % [label, sign_str, val])
	if stat_parts.size() > 0:
		stat_text = ", ".join(stat_parts)
	else:
		stat_text = "No stat bonuses"

	var stats_lbl := Label.new()
	stats_lbl.text = stat_text
	stats_lbl.add_theme_font_size_override("font_size", 15)
	stats_lbl.add_theme_color_override("font_color", Color(0.45, 0.75, 0.45))
	stats_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(stats_lbl)

	# Row 4: Description.
	var desc: String = str(equip_data.get("description", ""))
	if not desc.is_empty():
		var desc_lbl := Label.new()
		desc_lbl.text = desc
		desc_lbl.add_theme_font_size_override("font_size", 14)
		desc_lbl.add_theme_color_override("font_color", Color(0.5, 0.5, 0.6))
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		vbox.add_child(desc_lbl)

	card.add_child(vbox)
	_rewards_container.add_child(card)

	# Animate the card appearing.
	var tween := create_tween()
	tween.tween_interval(delay)
	tween.tween_property(card, "modulate:a", 1.0, 0.35)\
		.set_trans(Tween.TRANS_BACK)\
		.set_ease(Tween.EASE_OUT)
	tween.parallel().tween_property(card, "scale", Vector2(1.0, 1.0), 0.35)\
		.set_trans(Tween.TRANS_BACK)\
		.set_ease(Tween.EASE_OUT)

	# Emit loot event.
	if has_node("/root/EventBus"):
		EventBus.equipment_dropped.emit(equip_data)


## -- Private Helpers ----------------------------------------------------------

## Clear all previous results content.
func _clear_previous() -> void:
	# Clear XP bars.
	for entry in xp_bars:
		var container: Control = entry["container"]
		if container != null and is_instance_valid(container):
			container.queue_free()
	xp_bars.clear()

	# Clear rewards.
	for child in _rewards_container.get_children():
		child.queue_free()


func _on_continue_pressed() -> void:
	# Fade out and close.
	var tween := create_tween()
	tween.tween_property(_root, "modulate:a", 0.0, 0.3)
	tween.tween_callback(func() -> void:
		_root.visible = false
		results_closed.emit()
	)

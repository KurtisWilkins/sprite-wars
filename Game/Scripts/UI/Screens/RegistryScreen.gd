## RegistryScreen — Sprite Registry (Dex) with seen/caught tracking.
## [P8-008] Lists all 72 Sprite forms with silhouettes for unseen, filters by
## element/class/caught status, and shows detailed info for caught Sprites.
class_name RegistryScreen
extends Control

## ── Constants ────────────────────────────────────────────────────────────────

const TOTAL_FORMS: int = 72
const LIST_ITEM_HEIGHT: int = 64

## ── State ────────────────────────────────────────────────────────────────────

var _current_filter: Dictionary = {}

## ── Nodes ────────────────────────────────────────────────────────────────────

var sprite_list: ItemList
var detail_panel: PanelContainer
var completion_label: Label
var filter_bar: HBoxContainer
var back_button: Button

var _detail_name: Label
var _detail_elements: Label
var _detail_class: Label
var _detail_lore: Label
var _detail_stats: Label
var _detail_art: TextureRect


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build_ui()
	_populate_list()


func _build_ui() -> void:
	# Background.
	var bg := ColorRect.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.color = Color(0.06, 0.06, 0.1, 1.0)
	add_child(bg)

	add_child(_build_top_bar("Sprite Registry"))

	# Content.
	var content := VBoxContainer.new()
	content.set_anchors_preset(Control.PRESET_FULL_RECT)
	content.offset_top = 100.0
	content.add_theme_constant_override("separation", 8)
	add_child(content)

	var margin := MarginContainer.new()
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_theme_constant_override("margin_left", 20)
	margin.add_theme_constant_override("margin_right", 20)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_bottom", 16)
	content.add_child(margin)

	var inner := VBoxContainer.new()
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inner.size_flags_vertical = Control.SIZE_EXPAND_FILL
	inner.add_theme_constant_override("separation", 10)
	margin.add_child(inner)

	# Completion bar.
	var completion_row := HBoxContainer.new()
	completion_row.add_theme_constant_override("separation", 12)

	completion_label = Label.new()
	completion_label.text = "Caught: 0 / %d (0%%)" % TOTAL_FORMS
	completion_label.add_theme_font_size_override("font_size", 20)
	completion_label.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	completion_row.add_child(completion_label)
	inner.add_child(completion_row)

	# Completion progress bar.
	var progress := ProgressBar.new()
	progress.custom_minimum_size = Vector2(0.0, 12.0)
	progress.min_value = 0.0
	progress.max_value = TOTAL_FORMS
	progress.value = 0.0
	progress.show_percentage = false

	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = Color(0.9, 0.75, 0.2, 1.0)
	fill_style.corner_radius_top_left = 4
	fill_style.corner_radius_top_right = 4
	fill_style.corner_radius_bottom_left = 4
	fill_style.corner_radius_bottom_right = 4
	progress.add_theme_stylebox_override("fill", fill_style)

	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color = Color(0.12, 0.12, 0.18, 1.0)
	bg_style.corner_radius_top_left = 4
	bg_style.corner_radius_top_right = 4
	bg_style.corner_radius_bottom_left = 4
	bg_style.corner_radius_bottom_right = 4
	progress.add_theme_stylebox_override("background", bg_style)
	inner.add_child(progress)

	# Filter bar.
	filter_bar = HBoxContainer.new()
	filter_bar.add_theme_constant_override("separation", 6)

	var filter_scroll := ScrollContainer.new()
	filter_scroll.custom_minimum_size = Vector2(0.0, 44.0)
	filter_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	filter_scroll.add_child(filter_bar)

	var all_filter := _create_filter_chip("All", {})
	filter_bar.add_child(all_filter)

	var caught_filter := _create_filter_chip("Caught", {"status": "caught"})
	filter_bar.add_child(caught_filter)

	var seen_filter := _create_filter_chip("Seen", {"status": "seen"})
	filter_bar.add_child(seen_filter)

	for element in ["Fire", "Water", "Earth", "Nature"]:
		var chip := _create_filter_chip(element, {"element": element})
		filter_bar.add_child(chip)

	inner.add_child(filter_scroll)

	# Split: list on left, detail on right (or stacked on narrow screens).
	var split := HSplitContainer.new()
	split.size_flags_vertical = Control.SIZE_EXPAND_FILL

	# Sprite list.
	sprite_list = ItemList.new()
	sprite_list.name = "SpriteList"
	sprite_list.custom_minimum_size = Vector2(360.0, 0.0)
	sprite_list.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sprite_list.add_theme_font_size_override("font_size", 20)
	sprite_list.fixed_icon_size = Vector2(48, 48)
	sprite_list.item_selected.connect(_on_sprite_selected)
	split.add_child(sprite_list)

	# Detail panel.
	detail_panel = PanelContainer.new()
	detail_panel.name = "DetailPanel"
	detail_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.09, 0.09, 0.14, 1.0)
	panel_style.corner_radius_top_left = 12
	panel_style.corner_radius_top_right = 12
	panel_style.corner_radius_bottom_left = 12
	panel_style.corner_radius_bottom_right = 12
	panel_style.content_margin_left = 20.0
	panel_style.content_margin_right = 20.0
	panel_style.content_margin_top = 16.0
	panel_style.content_margin_bottom = 16.0
	detail_panel.add_theme_stylebox_override("panel", panel_style)

	var detail_scroll := ScrollContainer.new()
	detail_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED

	var detail_vbox := VBoxContainer.new()
	detail_vbox.add_theme_constant_override("separation", 12)

	# Art.
	_detail_art = TextureRect.new()
	_detail_art.custom_minimum_size = Vector2(200.0, 200.0)
	_detail_art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_detail_art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_detail_art.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	detail_vbox.add_child(_detail_art)

	_detail_name = Label.new()
	_detail_name.text = "Select a Sprite"
	_detail_name.add_theme_font_size_override("font_size", 26)
	_detail_name.add_theme_color_override("font_color", Color.WHITE)
	_detail_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	detail_vbox.add_child(_detail_name)

	_detail_elements = Label.new()
	_detail_elements.add_theme_font_size_override("font_size", 20)
	_detail_elements.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	_detail_elements.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	detail_vbox.add_child(_detail_elements)

	_detail_class = Label.new()
	_detail_class.add_theme_font_size_override("font_size", 20)
	_detail_class.add_theme_color_override("font_color", Color(0.6, 0.7, 0.9))
	_detail_class.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	detail_vbox.add_child(_detail_class)

	var sep := HSeparator.new()
	detail_vbox.add_child(sep)

	_detail_stats = Label.new()
	_detail_stats.add_theme_font_size_override("font_size", 18)
	_detail_stats.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
	detail_vbox.add_child(_detail_stats)

	_detail_lore = Label.new()
	_detail_lore.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_detail_lore.add_theme_font_size_override("font_size", 18)
	_detail_lore.add_theme_color_override("font_color", Color(0.6, 0.6, 0.65))
	detail_vbox.add_child(_detail_lore)

	detail_scroll.add_child(detail_vbox)
	detail_panel.add_child(detail_scroll)
	split.add_child(detail_panel)
	inner.add_child(split)


func _create_filter_chip(text: String, filter: Dictionary) -> Button:
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

	var f := filter
	btn.pressed.connect(func() -> void:
		_current_filter = f
		_populate_list()
	)

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


## ── Population ───────────────────────────────────────────────────────────────

func _populate_list() -> void:
	sprite_list.clear()

	# In a full implementation, iterate the race registry.
	# Placeholder: show numbered entries with seen/caught status.
	var caught_count: int = 0

	for form_id in range(1, TOTAL_FORMS + 1):
		# Check seen/caught status from player data.
		var status: String = _get_form_status(form_id)

		if _current_filter.has("status") and status != _current_filter["status"]:
			if not (_current_filter["status"] == "seen" and status == "caught"):
				continue

		var display_text: String
		match status:
			"caught":
				display_text = "#%03d - Form %d" % [form_id, form_id]
				caught_count += 1
			"seen":
				display_text = "#%03d - ???" % form_id
			_:
				display_text = "#%03d - ?????" % form_id

		sprite_list.add_item(display_text)

	completion_label.text = "Caught: %d / %d (%d%%)" % [
		caught_count, TOTAL_FORMS,
		int(float(caught_count) / float(TOTAL_FORMS) * 100.0)
	]


func _get_form_status(form_id: int) -> String:
	# In a full implementation, check GameManager.player_data.registry.
	# Placeholder: all unseen.
	return "unseen"


## ── Handlers ─────────────────────────────────────────────────────────────────

func _on_sprite_selected(index: int) -> void:
	# Show detail for the selected registry entry.
	var text: String = sprite_list.get_item_text(index)
	_detail_name.text = text
	_detail_elements.text = "Elements: Unknown"
	_detail_class.text = "Class: Unknown"
	_detail_stats.text = "Stats will be shown for caught Sprites."
	_detail_lore.text = "Catch this Sprite to unlock its registry entry."


func _on_back_pressed() -> void:
	if has_node("/root/ScreenTransitionManager"):
		var stm: ScreenTransitionManager = get_node("/root/ScreenTransitionManager")
		stm.pop_screen("slide_right")

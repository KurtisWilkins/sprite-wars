## CrystalThrowUI -- Crystal selection panel for catching wild sprites.
## Displays available catch crystals with their names, quantities, and catch
## rate bonuses. The player selects a crystal and confirms the throw.
extends PanelContainer

## -- Signals ------------------------------------------------------------------

signal crystal_thrown(crystal_data: Dictionary)
signal catch_cancelled()

## -- Sub-components -----------------------------------------------------------

var crystal_list: VBoxContainer = null
var throw_button: Button = null
var cancel_button: Button = null

## -- State --------------------------------------------------------------------

## Currently selected crystal data.
var selected_crystal: Dictionary = {}

## All available crystal entries for selection.
var _crystal_entries: Array[Dictionary] = []  # {panel: PanelContainer, data: Dictionary}

## -- Constants ----------------------------------------------------------------

const PANEL_WIDTH: float = 480.0
const PANEL_HEIGHT: float = 600.0
const ENTRY_HEIGHT: float = 72.0
const ICON_SIZE: float = 48.0
const BUTTON_HEIGHT: float = 52.0
const TITLE_FONT_SIZE: int = 24
const ENTRY_FONT_SIZE: int = 20
const DETAIL_FONT_SIZE: int = 16
const BUTTON_FONT_SIZE: int = 22

const COLOR_SELECTED := Color(0.2, 0.4, 0.7, 0.4)
const COLOR_NORMAL := Color(0.12, 0.12, 0.18, 0.8)

## Rarity colors for crystal borders.
const RARITY_COLORS: Dictionary = {
	"common": Color(0.6, 0.6, 0.65),
	"uncommon": Color(0.3, 0.7, 0.3),
	"rare": Color(0.3, 0.5, 1.0),
	"legendary": Color(1.0, 0.7, 0.1),
}

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	_build_ui()
	visible = false


func _build_ui() -> void:
	# Panel style.
	custom_minimum_size = Vector2(PANEL_WIDTH, PANEL_HEIGHT)
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.08, 0.08, 0.14, 0.95)
	panel_style.set_corner_radius_all(12)
	panel_style.set_border_width_all(2)
	panel_style.border_color = Color(0.3, 0.35, 0.5)
	panel_style.set_content_margin_all(16)
	add_theme_stylebox_override("panel", panel_style)

	# Center on screen.
	set_anchors_preset(Control.PRESET_CENTER)
	position = Vector2((1080.0 - PANEL_WIDTH) / 2.0, (1920.0 - PANEL_HEIGHT) / 2.0)

	# Main layout.
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 12)
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_vertical = Control.SIZE_EXPAND_FILL

	# Title.
	var title := Label.new()
	title.text = "Select Crystal"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", TITLE_FONT_SIZE)
	title.add_theme_color_override("font_color", Color(0.9, 0.85, 0.6))
	vbox.add_child(title)

	# Separator.
	var sep := HSeparator.new()
	sep.add_theme_constant_override("separation", 8)
	vbox.add_child(sep)

	# Scrollable crystal list.
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.custom_minimum_size.y = 320.0

	crystal_list = VBoxContainer.new()
	crystal_list.add_theme_constant_override("separation", 6)
	crystal_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(crystal_list)
	vbox.add_child(scroll)

	# Button row.
	var button_row := HBoxContainer.new()
	button_row.alignment = BoxContainer.ALIGNMENT_CENTER
	button_row.add_theme_constant_override("separation", 16)

	# Cancel button.
	cancel_button = Button.new()
	cancel_button.text = "Cancel"
	cancel_button.custom_minimum_size = Vector2(180.0, BUTTON_HEIGHT)
	cancel_button.add_theme_font_size_override("font_size", BUTTON_FONT_SIZE)
	cancel_button.focus_mode = Control.FOCUS_NONE
	var cancel_style := StyleBoxFlat.new()
	cancel_style.bg_color = Color(0.35, 0.15, 0.15)
	cancel_style.set_corner_radius_all(8)
	cancel_style.set_content_margin_all(8)
	cancel_button.add_theme_stylebox_override("normal", cancel_style)
	var cancel_pressed := cancel_style.duplicate()
	cancel_pressed.bg_color = Color(0.25, 0.1, 0.1)
	cancel_button.add_theme_stylebox_override("pressed", cancel_pressed)
	cancel_button.pressed.connect(_on_cancel_pressed)
	button_row.add_child(cancel_button)

	# Throw button.
	throw_button = Button.new()
	throw_button.text = "Throw!"
	throw_button.custom_minimum_size = Vector2(180.0, BUTTON_HEIGHT)
	throw_button.add_theme_font_size_override("font_size", BUTTON_FONT_SIZE)
	throw_button.focus_mode = Control.FOCUS_NONE
	throw_button.disabled = true
	var throw_style := StyleBoxFlat.new()
	throw_style.bg_color = Color(0.15, 0.4, 0.2)
	throw_style.set_corner_radius_all(8)
	throw_style.set_content_margin_all(8)
	throw_button.add_theme_stylebox_override("normal", throw_style)
	var throw_pressed := throw_style.duplicate()
	throw_pressed.bg_color = Color(0.1, 0.3, 0.15)
	throw_button.add_theme_stylebox_override("pressed", throw_pressed)
	var throw_disabled := throw_style.duplicate()
	throw_disabled.bg_color = Color(0.1, 0.15, 0.1)
	throw_button.add_theme_stylebox_override("disabled", throw_disabled)
	throw_button.pressed.connect(_on_throw_pressed)
	button_row.add_child(throw_button)

	vbox.add_child(button_row)
	add_child(vbox)

## -- Public API ---------------------------------------------------------------

## Show available crystals for selection.
## Each entry: {item_id: int, name: String, multiplier: float, rarity: String, count: int, icon: Texture2D (optional)}
func show_crystals(available: Array[Dictionary]) -> void:
	_clear_crystal_list()
	selected_crystal = {}
	throw_button.disabled = true

	for crystal_data in available:
		var entry: Dictionary = _create_crystal_entry(crystal_data)
		_crystal_entries.append(entry)

	visible = true

	# Fade in.
	modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 1.0, 0.25)\
		.set_trans(Tween.TRANS_QUAD)\
		.set_ease(Tween.EASE_OUT)


## Hide the crystal selection panel.
func hide_panel() -> void:
	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 0.0, 0.2)
	tween.tween_callback(func() -> void:
		visible = false
	)

## -- Private: Crystal Entry Construction --------------------------------------

func _create_crystal_entry(crystal_data: Dictionary) -> Dictionary:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_WIDTH - 40.0, ENTRY_HEIGHT)

	var rarity: String = str(crystal_data.get("rarity", "common"))
	var border_color: Color = RARITY_COLORS.get(rarity, RARITY_COLORS["common"])

	var style := StyleBoxFlat.new()
	style.bg_color = COLOR_NORMAL
	style.set_corner_radius_all(6)
	style.set_border_width_all(2)
	style.border_color = border_color
	style.set_content_margin_all(8)
	panel.add_theme_stylebox_override("panel", style)

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 10)

	# Crystal icon.
	var icon_rect := TextureRect.new()
	icon_rect.custom_minimum_size = Vector2(ICON_SIZE, ICON_SIZE)
	icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var icon: Texture2D = crystal_data.get("icon", null)
	if icon != null:
		icon_rect.texture = icon
	hbox.add_child(icon_rect)

	# Info column.
	var info_vbox := VBoxContainer.new()
	info_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var name_label := Label.new()
	name_label.text = str(crystal_data.get("name", "Crystal"))
	name_label.add_theme_font_size_override("font_size", ENTRY_FONT_SIZE)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	info_vbox.add_child(name_label)

	var detail_label := Label.new()
	var multiplier: float = crystal_data.get("multiplier", 1.0)
	detail_label.text = "Catch Rate: x%.1f" % multiplier
	detail_label.add_theme_font_size_override("font_size", DETAIL_FONT_SIZE)
	detail_label.add_theme_color_override("font_color", Color(0.6, 0.65, 0.75))
	info_vbox.add_child(detail_label)

	hbox.add_child(info_vbox)

	# Quantity.
	var qty_label := Label.new()
	qty_label.text = "x%d" % crystal_data.get("count", 0)
	qty_label.add_theme_font_size_override("font_size", ENTRY_FONT_SIZE)
	qty_label.add_theme_color_override("font_color", Color(0.8, 0.85, 0.95))
	qty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	qty_label.custom_minimum_size.x = 60.0
	hbox.add_child(qty_label)

	panel.add_child(hbox)

	# Make the entry clickable via a button overlay.
	var click_button := Button.new()
	click_button.set_anchors_preset(Control.PRESET_FULL_RECT)
	click_button.flat = true
	click_button.focus_mode = Control.FOCUS_NONE
	click_button.mouse_filter = Control.MOUSE_FILTER_STOP
	click_button.pressed.connect(_on_crystal_entry_pressed.bind(crystal_data, panel, style))
	panel.add_child(click_button)

	crystal_list.add_child(panel)

	return {
		"panel": panel,
		"data": crystal_data,
		"style": style,
		"border_color": border_color,
	}

## -- Private Helpers ----------------------------------------------------------

func _clear_crystal_list() -> void:
	for child in crystal_list.get_children():
		child.queue_free()
	_crystal_entries.clear()


func _highlight_selected(selected_panel: PanelContainer) -> void:
	for entry in _crystal_entries:
		var panel: PanelContainer = entry["panel"]
		var style: StyleBoxFlat = entry["style"]
		if panel == selected_panel:
			style.bg_color = COLOR_SELECTED
		else:
			style.bg_color = COLOR_NORMAL

## -- Signal Handlers ----------------------------------------------------------

func _on_crystal_entry_pressed(crystal_data: Dictionary, panel: PanelContainer, _style: StyleBoxFlat) -> void:
	selected_crystal = crystal_data
	throw_button.disabled = false
	_highlight_selected(panel)


func _on_throw_pressed() -> void:
	if selected_crystal.is_empty():
		return
	crystal_thrown.emit(selected_crystal)
	hide_panel()


func _on_cancel_pressed() -> void:
	catch_cancelled.emit()
	hide_panel()

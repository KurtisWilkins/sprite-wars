## TurnOrderBar -- Horizontal bar of unit portraits showing the turn order.
## Displays up to 8 unit portraits with team-colored borders and highlights
## the currently active unit with a golden border.
extends HBoxContainer

## -- State --------------------------------------------------------------------

## Active portrait entries. Each: {texture_rect: TextureRect, panel: PanelContainer,
##   unit_id: int, team: int, border_style: StyleBoxFlat}
var portraits: Array[Dictionary] = []

## Maximum number of portraits to display.
var max_visible: int = 8

## Currently highlighted unit ID.
var _current_unit_id: int = -1

## -- Constants ----------------------------------------------------------------

const PORTRAIT_SIZE: float = 64.0
const PORTRAIT_SPACING: int = 6
const BORDER_WIDTH: int = 3
const CURRENT_BORDER_WIDTH: int = 4

const COLOR_PLAYER_BORDER := Color(0.3, 0.5, 1.0)
const COLOR_ENEMY_BORDER := Color(1.0, 0.3, 0.3)
const COLOR_CURRENT_BORDER := Color(1.0, 0.85, 0.2)
const COLOR_BG := Color(0.1, 0.1, 0.15, 0.9)
const COLOR_FADED := Color(0.5, 0.5, 0.5, 0.6)

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	alignment = BoxContainer.ALIGNMENT_CENTER
	add_theme_constant_override("separation", PORTRAIT_SPACING)

	# Position at the top of the screen.
	set_anchors_preset(Control.PRESET_TOP_WIDE)
	position = Vector2(0, 20)
	size = Vector2(1080.0, PORTRAIT_SIZE + 16.0)

## -- Public API ---------------------------------------------------------------

## Set the full turn order display.
## Each entry: {id: int, texture: Texture2D, team: int, is_current: bool}
func set_turn_order(units: Array[Dictionary]) -> void:
	_clear_portraits()

	var visible_count: int = mini(units.size(), max_visible)
	for i in range(visible_count):
		var unit_data: Dictionary = units[i]
		var portrait: Dictionary = _create_portrait(unit_data)
		portraits.append(portrait)

		if unit_data.get("is_current", false):
			_current_unit_id = unit_data.get("id", -1)
			_apply_current_highlight(portrait)


## Highlight the currently active unit with a golden border.
func highlight_current(unit_id: int) -> void:
	_current_unit_id = unit_id

	for portrait in portraits:
		if portrait["unit_id"] == unit_id:
			_apply_current_highlight(portrait)
		else:
			_apply_normal_border(portrait)


## Remove a unit's portrait (e.g., when fainted).
func remove_unit(unit_id: int) -> void:
	for i in range(portraits.size() - 1, -1, -1):
		if portraits[i]["unit_id"] == unit_id:
			var panel: PanelContainer = portraits[i]["panel"]
			if panel != null and is_instance_valid(panel):
				# Fade out animation.
				var tween := create_tween()
				tween.tween_property(panel, "modulate", COLOR_FADED, 0.3)
				tween.tween_property(panel, "modulate:a", 0.0, 0.2)
				tween.tween_callback(panel.queue_free)
			portraits.remove_at(i)
			break


## Update the turn order (e.g., after speed change mid-round).
func update_order(new_order: Array[Dictionary]) -> void:
	set_turn_order(new_order)

## -- Private Helpers ----------------------------------------------------------

## Create a single portrait entry.
func _create_portrait(unit_data: Dictionary) -> Dictionary:
	var unit_id: int = unit_data.get("id", -1)
	var texture: Texture2D = unit_data.get("texture", null)
	var team: int = unit_data.get("team", 0)

	# Outer panel with border.
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PORTRAIT_SIZE, PORTRAIT_SIZE)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var border_style := StyleBoxFlat.new()
	border_style.bg_color = COLOR_BG
	border_style.set_corner_radius_all(6)
	border_style.set_border_width_all(BORDER_WIDTH)
	border_style.border_color = COLOR_PLAYER_BORDER if team == 0 else COLOR_ENEMY_BORDER
	panel.add_theme_stylebox_override("panel", border_style)

	# Portrait texture.
	var tex_rect := TextureRect.new()
	tex_rect.custom_minimum_size = Vector2(PORTRAIT_SIZE - 10.0, PORTRAIT_SIZE - 10.0)
	tex_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tex_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if texture != null:
		tex_rect.texture = texture

	panel.add_child(tex_rect)
	add_child(panel)

	return {
		"texture_rect": tex_rect,
		"panel": panel,
		"unit_id": unit_id,
		"team": team,
		"border_style": border_style,
	}


## Apply the golden "current turn" highlight to a portrait.
func _apply_current_highlight(portrait: Dictionary) -> void:
	var style: StyleBoxFlat = portrait["border_style"]
	style.border_color = COLOR_CURRENT_BORDER
	style.set_border_width_all(CURRENT_BORDER_WIDTH)

	# Subtle pulse animation.
	var panel: PanelContainer = portrait["panel"]
	var tween := create_tween().set_loops()
	tween.tween_property(panel, "modulate", Color(1.15, 1.1, 0.9), 0.6)\
		.set_trans(Tween.TRANS_SINE)\
		.set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(panel, "modulate", Color.WHITE, 0.6)\
		.set_trans(Tween.TRANS_SINE)\
		.set_ease(Tween.EASE_IN_OUT)


## Reset a portrait to its normal team-colored border.
func _apply_normal_border(portrait: Dictionary) -> void:
	var style: StyleBoxFlat = portrait["border_style"]
	var team: int = portrait["team"]
	style.border_color = COLOR_PLAYER_BORDER if team == 0 else COLOR_ENEMY_BORDER
	style.set_border_width_all(BORDER_WIDTH)

	# Stop any active pulse animation by resetting modulate.
	var panel: PanelContainer = portrait["panel"]
	panel.modulate = Color.WHITE


## Clear all existing portrait nodes.
func _clear_portraits() -> void:
	for portrait in portraits:
		var panel: PanelContainer = portrait["panel"]
		if panel != null and is_instance_valid(panel):
			panel.queue_free()
	portraits.clear()
	_current_unit_id = -1

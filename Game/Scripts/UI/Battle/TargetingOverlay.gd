## TargetingOverlay -- Visual overlay for target selection during player turns.
## Highlights valid targets in blue, shows AoE preview in yellow, and handles
## touch/tap input for target confirmation or cancellation.
extends Node2D

## -- Signals ------------------------------------------------------------------

signal target_confirmed(grid_pos: Vector2i)
signal target_cancelled()

## -- State --------------------------------------------------------------------

## Whether targeting mode is currently active.
var active: bool = false

## Valid target cells the player can select.
var valid_targets: Array[Vector2i] = []

## Currently selected/hovered target.
var selected_target: Vector2i = Vector2i(-1, -1)

## The targeting pattern name for AoE preview.
var ability_pattern: String = "single"

## The caster's position (for pattern resolution).
var _caster_pos: Vector2i = Vector2i.ZERO

## The full ability data for AoE preview.
var _ability_data: Dictionary = {}

## Reference to the GridDisplay for coordinate conversion.
var _grid_display: Node2D = null

## AoE preview cells for the current hover/selection.
var _aoe_preview_cells: Array[Vector2i] = []

## -- Colors -------------------------------------------------------------------

const COLOR_VALID_TARGET := Color(0.2, 0.5, 1.0, 0.35)
const COLOR_VALID_TARGET_BORDER := Color(0.3, 0.6, 1.0, 0.8)
const COLOR_SELECTED := Color(0.3, 0.7, 1.0, 0.55)
const COLOR_AOE_PREVIEW := Color(1.0, 0.9, 0.2, 0.3)
const COLOR_AOE_PREVIEW_BORDER := Color(1.0, 0.85, 0.1, 0.7)
const COLOR_CANCEL_ZONE := Color(1.0, 0.3, 0.2, 0.15)

## Cancel button height at the bottom of the screen.
const CANCEL_ZONE_HEIGHT: float = 100.0

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	set_process_input(false)
	visible = false


## Inject the grid display reference for coordinate lookups.
func set_grid_display(grid_display: Node2D) -> void:
	_grid_display = grid_display

## -- Public API ---------------------------------------------------------------

## Enter targeting mode: show valid targets and wait for player input.
func show_targeting(ability_data: Dictionary, caster_pos: Vector2i, valid_cells: Array[Vector2i]) -> void:
	_ability_data = ability_data
	_caster_pos = caster_pos
	valid_targets = valid_cells
	ability_pattern = str(ability_data.get("targeting_type", "single"))
	selected_target = Vector2i(-1, -1)
	_aoe_preview_cells.clear()
	active = true
	visible = true
	set_process_input(true)
	queue_redraw()


## Exit targeting mode.
func hide_targeting() -> void:
	active = false
	visible = false
	set_process_input(false)
	valid_targets.clear()
	_aoe_preview_cells.clear()
	selected_target = Vector2i(-1, -1)
	queue_redraw()

## -- Input Handling -----------------------------------------------------------

func _input(event: InputEvent) -> void:
	if not active or _grid_display == null:
		return

	if event is InputEventScreenTouch:
		_handle_touch(event as InputEventScreenTouch)
	elif event is InputEventMouseButton:
		_handle_mouse_button(event as InputEventMouseButton)
	elif event is InputEventMouseMotion:
		_handle_mouse_motion(event as InputEventMouseMotion)
	elif event is InputEventScreenDrag:
		_handle_screen_drag(event as InputEventScreenDrag)


func _handle_touch(event: InputEventScreenTouch) -> void:
	if not event.pressed:
		return

	var pos: Vector2 = event.position

	# Check cancel zone (bottom strip of screen).
	if pos.y > 1920.0 - CANCEL_ZONE_HEIGHT:
		_cancel_targeting()
		return

	# Check if the tap is on the grid.
	if _grid_display.is_screen_pos_on_grid(pos):
		var grid_pos: Vector2i = _grid_display.screen_to_grid(pos)
		if grid_pos in valid_targets:
			_confirm_target(grid_pos)
			return

	# Tap outside valid area does nothing (keeps targeting active).


func _handle_mouse_button(event: InputEventMouseButton) -> void:
	if event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
		_cancel_targeting()
		return

	if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var pos: Vector2 = event.position

		if pos.y > 1920.0 - CANCEL_ZONE_HEIGHT:
			_cancel_targeting()
			return

		if _grid_display.is_screen_pos_on_grid(pos):
			var grid_pos: Vector2i = _grid_display.screen_to_grid(pos)
			if grid_pos in valid_targets:
				_confirm_target(grid_pos)


func _handle_mouse_motion(event: InputEventMouseMotion) -> void:
	var pos: Vector2 = event.position
	_update_hover(pos)


func _handle_screen_drag(event: InputEventScreenDrag) -> void:
	var pos: Vector2 = event.position
	_update_hover(pos)


## Update hover preview for the position under the pointer.
func _update_hover(screen_pos: Vector2) -> void:
	if _grid_display == null or not _grid_display.is_screen_pos_on_grid(screen_pos):
		if selected_target != Vector2i(-1, -1):
			selected_target = Vector2i(-1, -1)
			_aoe_preview_cells.clear()
			queue_redraw()
		return

	var grid_pos: Vector2i = _grid_display.screen_to_grid(screen_pos)
	if grid_pos != selected_target:
		selected_target = grid_pos
		_update_aoe_preview()
		queue_redraw()

## -- Drawing ------------------------------------------------------------------

func _draw() -> void:
	if not active or _grid_display == null:
		return

	# Draw valid target cells.
	for cell in valid_targets:
		_draw_cell_highlight(cell, COLOR_VALID_TARGET, COLOR_VALID_TARGET_BORDER)

	# Draw AoE preview.
	for cell in _aoe_preview_cells:
		_draw_cell_highlight(cell, COLOR_AOE_PREVIEW, COLOR_AOE_PREVIEW_BORDER)

	# Draw selected cell with a stronger highlight.
	if selected_target in valid_targets:
		_draw_cell_highlight(selected_target, COLOR_SELECTED, COLOR_VALID_TARGET_BORDER)

	# Draw cancel zone indicator.
	_draw_cancel_zone()


## Draw a highlighted cell at a grid position.
func _draw_cell_highlight(grid_pos: Vector2i, fill_color: Color, border_color: Color) -> void:
	var screen_center: Vector2 = _grid_display.grid_to_screen(grid_pos)
	var cell_size: Vector2 = _grid_display.cell_size
	var top_left: Vector2 = screen_center - cell_size / 2.0
	var rect := Rect2(top_left, cell_size)

	# Fill.
	draw_rect(rect, fill_color)
	# Border.
	draw_rect(rect, border_color, false, 2.0)


## Draw the cancel zone at the bottom of the screen.
func _draw_cancel_zone() -> void:
	var rect := Rect2(
		Vector2(0.0, 1920.0 - CANCEL_ZONE_HEIGHT),
		Vector2(1080.0, CANCEL_ZONE_HEIGHT)
	)
	draw_rect(rect, COLOR_CANCEL_ZONE)

	# "Cancel" text placeholder -- drawn as a colored rect with text would
	# need a font, so we draw a simple X symbol.
	var center := Vector2(540.0, 1920.0 - CANCEL_ZONE_HEIGHT / 2.0)
	var half: float = 15.0
	draw_line(center + Vector2(-half, -half), center + Vector2(half, half), Color(1, 0.3, 0.2, 0.7), 3.0)
	draw_line(center + Vector2(half, -half), center + Vector2(-half, half), Color(1, 0.3, 0.2, 0.7), 3.0)

## -- Private Helpers ----------------------------------------------------------

## Update the AoE preview cells based on the current selection and pattern.
func _update_aoe_preview() -> void:
	_aoe_preview_cells.clear()

	if selected_target == Vector2i(-1, -1):
		return
	if selected_target not in valid_targets:
		return

	# For single-target patterns, no AoE preview needed.
	if ability_pattern in ["single", "single_ally", "self", "random"]:
		return

	# Use the grid's pattern resolution to get affected cells.
	var grid_size := Vector2i(6, 8)  # BattleGrid constants.
	var affected: Array[Vector2i] = TargetingData.get_affected_tiles(
		_caster_pos, selected_target, grid_size
	)

	# Exclude the primary target (it's already highlighted differently).
	for cell in affected:
		if cell != selected_target:
			_aoe_preview_cells.append(cell)


## Confirm a target and emit signal.
func _confirm_target(grid_pos: Vector2i) -> void:
	target_confirmed.emit(grid_pos)
	hide_targeting()


## Cancel targeting and emit signal.
func _cancel_targeting() -> void:
	target_cancelled.emit()
	hide_targeting()

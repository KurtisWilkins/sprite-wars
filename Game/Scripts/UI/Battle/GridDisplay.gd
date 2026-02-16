## GridDisplay -- Visual representation of the 6x8 battle grid.
## Draws grid lines, terrain highlights, and manages per-cell sprite visuals.
## Positions itself within the parent BattleUI, using cell_size to map between
## grid coordinates and screen space.
extends Node2D

## -- Configuration ------------------------------------------------------------

## Pixel size of each grid cell.
var cell_size: Vector2 = Vector2(120, 120)

## Grid dimensions (columns x rows). Matches BattleGrid constants.
var grid_width: int = 6
var grid_height: int = 8  # 4 rows per side

## Pixel offset from top-left of this node to the first cell center.
var grid_origin: Vector2 = Vector2.ZERO

## -- Visual State -------------------------------------------------------------

## Active highlight overlays. Array of {cells: Array[Vector2i], color: Color}.
var _highlights: Array[Dictionary] = []

## Sprite visuals keyed by unit_id. Values: {sprite: Sprite2D, grid_pos: Vector2i}
var _unit_visuals: Dictionary = {}

## Active movement tweens keyed by unit_id.
var _move_tweens: Dictionary = {}

## -- Color Palette ------------------------------------------------------------

const COLOR_GRID_LINE := Color(0.35, 0.4, 0.5, 0.6)
const COLOR_PLAYER_CELL := Color(0.2, 0.35, 0.55, 0.15)
const COLOR_ENEMY_CELL := Color(0.55, 0.2, 0.2, 0.15)
const COLOR_DIVIDER := Color(0.9, 0.85, 0.6, 0.45)

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	_calculate_grid_origin()


## Calculate grid_origin so the grid is centered horizontally.
func _calculate_grid_origin() -> void:
	var total_width: float = float(grid_width) * cell_size.x
	# Center horizontally within the 1080 viewport.
	grid_origin.x = (1080.0 - total_width) / 2.0
	# Offset from top to leave room for the turn order bar.
	grid_origin.y = 180.0

## -- Drawing ------------------------------------------------------------------

func _draw() -> void:
	_draw_cell_backgrounds()
	_draw_grid_lines()
	_draw_highlights()
	_draw_divider()


## Draw tinted backgrounds for player and enemy halves.
func _draw_cell_backgrounds() -> void:
	for y in range(grid_height):
		for x in range(grid_width):
			var rect := Rect2(
				grid_origin + Vector2(float(x) * cell_size.x, float(y) * cell_size.y),
				cell_size
			)
			if y < 4:
				# Enemy rows (top half in screen space, rows 4-7 in grid space
				# since we render enemy at top).
				draw_rect(rect, COLOR_ENEMY_CELL)
			else:
				# Player rows (bottom half).
				draw_rect(rect, COLOR_PLAYER_CELL)


## Draw the grid lines between cells.
func _draw_grid_lines() -> void:
	var total_w: float = float(grid_width) * cell_size.x
	var total_h: float = float(grid_height) * cell_size.y

	# Horizontal lines.
	for y in range(grid_height + 1):
		var start := Vector2(grid_origin.x, grid_origin.y + float(y) * cell_size.y)
		var end := Vector2(grid_origin.x + total_w, start.y)
		draw_line(start, end, COLOR_GRID_LINE, 1.0)

	# Vertical lines.
	for x in range(grid_width + 1):
		var start := Vector2(grid_origin.x + float(x) * cell_size.x, grid_origin.y)
		var end := Vector2(start.x, grid_origin.y + total_h)
		draw_line(start, end, COLOR_GRID_LINE, 1.0)


## Draw the center divider between teams.
func _draw_divider() -> void:
	var y_pos: float = grid_origin.y + 4.0 * cell_size.y
	var start := Vector2(grid_origin.x, y_pos)
	var end := Vector2(grid_origin.x + float(grid_width) * cell_size.x, y_pos)
	draw_line(start, end, COLOR_DIVIDER, 3.0)


## Draw all active cell highlights.
func _draw_highlights() -> void:
	for entry in _highlights:
		var cells: Array = entry.get("cells", [])
		var color: Color = entry.get("color", Color(1, 1, 1, 0.3))
		for cell_pos in cells:
			if cell_pos is Vector2i:
				var screen_pos: Vector2i = cell_pos
				# Convert grid pos to screen pos. Enemy rows 4-7 map to screen rows 0-3,
				# player rows 0-3 map to screen rows 4-7.
				var display_row: int = _grid_row_to_display_row(screen_pos.y)
				var rect := Rect2(
					grid_origin + Vector2(float(screen_pos.x) * cell_size.x, float(display_row) * cell_size.y),
					cell_size
				)
				draw_rect(rect, color)

## -- Public API: Highlights ---------------------------------------------------

## Highlight a set of grid cells with a given color.
func highlight_cells(cells: Array[Vector2i], color: Color) -> void:
	_highlights.append({"cells": cells, "color": color})
	queue_redraw()


## Clear all active highlights.
func clear_highlights() -> void:
	_highlights.clear()
	queue_redraw()

## -- Public API: Unit Visuals -------------------------------------------------

## Place a sprite visual at a grid position.
func place_sprite_visual(unit_id: int, pos: Vector2i, texture: Texture2D) -> void:
	# Remove existing visual if present.
	if _unit_visuals.has(unit_id):
		remove_sprite_visual(unit_id)

	var sprite := Sprite2D.new()
	sprite.texture = texture
	if texture != null:
		# Scale sprite to fit within cell, leaving a small margin.
		var target_size: float = cell_size.x * 0.85
		var tex_size: float = maxf(float(texture.get_width()), float(texture.get_height()))
		if tex_size > 0.0:
			var s: float = target_size / tex_size
			sprite.scale = Vector2(s, s)

	sprite.position = grid_to_screen(pos)
	add_child(sprite)

	_unit_visuals[unit_id] = {"sprite": sprite, "grid_pos": pos}


## Animate a sprite visual moving to a new grid position.
func move_sprite_visual(unit_id: int, to_pos: Vector2i, duration: float) -> void:
	if not _unit_visuals.has(unit_id):
		return

	var data: Dictionary = _unit_visuals[unit_id]
	var sprite: Sprite2D = data["sprite"]
	var target_screen: Vector2 = grid_to_screen(to_pos)

	# Kill any existing move tween for this unit.
	if _move_tweens.has(unit_id) and _move_tweens[unit_id] != null:
		_move_tweens[unit_id].kill()

	var tween: Tween = create_tween()
	tween.tween_property(sprite, "position", target_screen, duration)\
		.set_trans(Tween.TRANS_QUAD)\
		.set_ease(Tween.EASE_IN_OUT)

	_move_tweens[unit_id] = tween
	data["grid_pos"] = to_pos


## Remove a sprite visual from the display.
func remove_sprite_visual(unit_id: int) -> void:
	if not _unit_visuals.has(unit_id):
		return

	var data: Dictionary = _unit_visuals[unit_id]
	var sprite: Sprite2D = data["sprite"]
	if sprite != null and is_instance_valid(sprite):
		sprite.queue_free()

	# Kill any running tween.
	if _move_tweens.has(unit_id) and _move_tweens[unit_id] != null:
		_move_tweens[unit_id].kill()
		_move_tweens.erase(unit_id)

	_unit_visuals.erase(unit_id)

## -- Coordinate Conversion ----------------------------------------------------

## Convert a grid position to a screen position (center of the cell).
func grid_to_screen(grid_pos: Vector2i) -> Vector2:
	var display_row: int = _grid_row_to_display_row(grid_pos.y)
	return Vector2(
		grid_origin.x + (float(grid_pos.x) + 0.5) * cell_size.x,
		grid_origin.y + (float(display_row) + 0.5) * cell_size.y
	)


## Convert a screen position to a grid position.
func screen_to_grid(screen_pos: Vector2) -> Vector2i:
	var local_pos: Vector2 = screen_pos - grid_origin
	var col: int = int(local_pos.x / cell_size.x)
	var display_row: int = int(local_pos.y / cell_size.y)
	col = clampi(col, 0, grid_width - 1)
	display_row = clampi(display_row, 0, grid_height - 1)
	var grid_row: int = _display_row_to_grid_row(display_row)
	return Vector2i(col, grid_row)


## Check if a screen position is within the grid bounds.
func is_screen_pos_on_grid(screen_pos: Vector2) -> bool:
	var local_pos: Vector2 = screen_pos - grid_origin
	return (
		local_pos.x >= 0.0 and
		local_pos.x < float(grid_width) * cell_size.x and
		local_pos.y >= 0.0 and
		local_pos.y < float(grid_height) * cell_size.y
	)

## -- Private Helpers ----------------------------------------------------------

## Map grid row to display row. Enemy rows (4-7) display at top (0-3),
## player rows (0-3) display at bottom (4-7).
func _grid_row_to_display_row(grid_row: int) -> int:
	if grid_row >= 4:
		return grid_row - 4  # Enemy rows at top.
	else:
		return grid_row + 4  # Player rows at bottom.


## Reverse mapping from display row to grid row.
func _display_row_to_grid_row(display_row: int) -> int:
	if display_row < 4:
		return display_row + 4  # Top of screen = enemy rows.
	else:
		return display_row - 4  # Bottom of screen = player rows.

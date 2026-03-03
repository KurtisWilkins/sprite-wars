## DeploymentScreen -- Pre-battle placement screen.
## Shows the full battle grid (6x8) with enemy preview at the top and the
## player's deployable rows at the bottom. The player drags sprites from the
## team panel onto grid cells to set their starting positions.
## Includes auto-deploy and start battle buttons.
extends CanvasLayer

## -- Signals ------------------------------------------------------------------

signal deployment_confirmed(placements: Dictionary)

## -- Sub-components -----------------------------------------------------------

var _root: Control = null
var grid_display: Node2D = null
var team_panel: VBoxContainer = null
var auto_deploy_button: Button = null
var start_battle_button: Button = null

## -- State --------------------------------------------------------------------

## Currently placed units: {grid_pos: Vector2i -> sprite_data: Dictionary}
var placed_units: Dictionary = {}

## Available team sprites for placement.
var _team_sprites: Array[Dictionary] = []

## Grid dimensions for the full battle map (columns x total rows).
var _grid_size: Vector2i = Vector2i(6, 8)

## Number of rows the player can deploy on (bottom half of grid).
const PLAYER_ROWS: int = 4

## Enemy preview data.
var _enemy_preview: Array[Dictionary] = []

## Drag state.
var _dragging: bool = false
var _drag_sprite_data: Dictionary = {}
var _drag_visual: TextureRect = null
var _drag_source_pos: Vector2i = Vector2i(-1, -1)  # -1,-1 means from panel.
var _drag_start_screen_pos: Vector2 = Vector2.ZERO  # For tap detection.

## Info panel state.
var _info_overlay: ColorRect = null
var _info_panel: PanelContainer = null
var _info_visible: bool = false
var _info_sprite_data: Dictionary = {}

## -- Constants ----------------------------------------------------------------

const CELL_SIZE: float = 110.0
const GRID_ORIGIN := Vector2(60.0, 120.0)  # Full grid starts near top of screen.
const PANEL_WIDTH: float = 280.0
const PANEL_X: float = 800.0  # Right side of screen.
const SPRITE_ENTRY_HEIGHT: float = 80.0
const BUTTON_HEIGHT: float = 56.0
const BUTTON_FONT_SIZE: int = 22
const PANEL_FONT_SIZE: int = 18
const TAP_TOLERANCE: float = 10.0  # Max px movement to count as tap (not drag).
const INFO_PANEL_WIDTH: float = 850.0
const INFO_PANEL_HEIGHT: float = 1200.0

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	layer = 5
	_build_ui()
	_root.visible = false


func _build_ui() -> void:
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_STOP

	# Background.
	var bg := Panel.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color = Color(0.06, 0.07, 0.12, 0.95)
	bg.add_theme_stylebox_override("panel", bg_style)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(bg)

	# Title.
	var title := Label.new()
	title.text = "Deploy Your Team"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 32)
	title.add_theme_color_override("font_color", Color(0.9, 0.85, 0.6))
	title.position = Vector2(0, 20)
	title.size = Vector2(1080, 50)
	_root.add_child(title)

	# Subtitle instruction.
	var subtitle := Label.new()
	subtitle.text = "Drag sprites from the panel to the grid"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 18)
	subtitle.add_theme_color_override("font_color", Color(0.6, 0.65, 0.75))
	subtitle.position = Vector2(0, 60)
	subtitle.size = Vector2(1080, 30)
	_root.add_child(subtitle)

	# Grid display for the full battle map (enemy preview + player deployment).
	grid_display = Node2D.new()
	grid_display.set_script(null)  # We draw the grid manually here.
	_root.add_child(grid_display)

	# Team panel (scrollable).
	var panel_bg := Panel.new()
	panel_bg.position = Vector2(PANEL_X, 120)
	panel_bg.size = Vector2(PANEL_WIDTH, 1560)
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.1, 0.1, 0.16, 0.9)
	panel_style.set_corner_radius_all(8)
	panel_style.set_border_width_all(2)
	panel_style.border_color = Color(0.3, 0.3, 0.4)
	panel_bg.add_theme_stylebox_override("panel", panel_style)
	_root.add_child(panel_bg)

	var panel_title := Label.new()
	panel_title.text = "Team"
	panel_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	panel_title.add_theme_font_size_override("font_size", 22)
	panel_title.add_theme_color_override("font_color", Color(0.8, 0.8, 0.9))
	panel_title.position = Vector2(0, 8)
	panel_title.size = Vector2(PANEL_WIDTH, 30)
	panel_bg.add_child(panel_title)

	var scroll := ScrollContainer.new()
	scroll.position = Vector2(8, 42)
	scroll.size = Vector2(PANEL_WIDTH - 16, 1500)
	panel_bg.add_child(scroll)

	team_panel = VBoxContainer.new()
	team_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	team_panel.add_theme_constant_override("separation", 6)
	scroll.add_child(team_panel)

	# Auto-deploy button.
	auto_deploy_button = _create_button("Auto Deploy", Vector2(80, 1800), Vector2(400, BUTTON_HEIGHT))
	auto_deploy_button.pressed.connect(_on_auto_deploy_pressed)
	_root.add_child(auto_deploy_button)

	# Start battle button.
	start_battle_button = _create_button("Start Battle", Vector2(540, 1800), Vector2(400, BUTTON_HEIGHT))
	start_battle_button.pressed.connect(_on_start_battle_pressed)
	var start_style: StyleBoxFlat = start_battle_button.get_theme_stylebox("normal").duplicate()
	start_style.bg_color = Color(0.2, 0.5, 0.3)
	start_battle_button.add_theme_stylebox_override("normal", start_style)
	_root.add_child(start_battle_button)

	# Info panel (added last so it renders on top of everything).
	_build_info_panel()

	add_child(_root)

## -- Public API ---------------------------------------------------------------

## Show the deployment screen with team and grid data.
## team: Array of {id: int, name: String, texture: Texture2D, level: int, hp: int, element_types: Array}
## grid_size: Vector2i (columns x total rows, typically 6x8 for full battle map)
## enemy_preview: Array of {name: String, texture: Texture2D, position: Vector2i}
func show_deployment(team: Array, grid_size: Vector2i, enemy_preview: Array) -> void:
	_team_sprites = []
	for entry in team:
		_team_sprites.append(entry)
	_grid_size = grid_size
	_enemy_preview = []
	for entry in enemy_preview:
		_enemy_preview.append(entry)
	placed_units.clear()

	_populate_team_panel()
	_root.visible = true
	_refresh_display()


## Auto-deploy: place sprites in a default formation (centered, back row first).
func auto_deploy() -> void:
	placed_units.clear()
	_clear_grid_visuals()

	var available: Array[Dictionary] = _get_unplaced_sprites()
	var positions: Array[Vector2i] = []

	# Fill from the back row (row 0 = front line closest to enemy, row 3 = back).
	# Deploy back-to-front, centering units in each row.
	# Only place on player rows 0 through PLAYER_ROWS-1 (i.e. 0-3).
	var placed_count: int = 0
	for row in range(PLAYER_ROWS - 1, -1, -1):
		var units_this_row: int = mini(_grid_size.x, available.size() - placed_count)
		if units_this_row <= 0:
			break
		var offset: int = (_grid_size.x - units_this_row) / 2
		for col in range(units_this_row):
			var pos := Vector2i(offset + col, row)
			positions.append(pos)
			placed_count += 1
		if placed_count >= available.size():
			break

	for i in range(mini(positions.size(), available.size())):
		placed_units[positions[i]] = available[i]

	_refresh_display()


## Validate that the deployment is acceptable.
func validate_deployment() -> bool:
	return not placed_units.is_empty()

## -- Input Handling -----------------------------------------------------------

func _input(event: InputEvent) -> void:
	if not _root.visible:
		return
	# If the info panel is open, intercept touch/click releases to dismiss it.
	if _info_visible:
		if event is InputEventScreenTouch:
			var touch: InputEventScreenTouch = event as InputEventScreenTouch
			if not touch.pressed:
				_hide_sprite_info()
				get_viewport().set_input_as_handled()
		elif event is InputEventMouseButton:
			var mouse: InputEventMouseButton = event as InputEventMouseButton
			if mouse.button_index == MOUSE_BUTTON_LEFT and not mouse.pressed:
				_hide_sprite_info()
				get_viewport().set_input_as_handled()
		return
	_handle_drag_drop(event)


func _handle_drag_drop(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var touch: InputEventScreenTouch = event as InputEventScreenTouch
		if touch.pressed:
			_start_drag(touch.position)
		else:
			_end_drag(touch.position)
	elif event is InputEventScreenDrag:
		var drag: InputEventScreenDrag = event as InputEventScreenDrag
		_update_drag(drag.position)
	elif event is InputEventMouseButton:
		var mouse: InputEventMouseButton = event as InputEventMouseButton
		if mouse.button_index == MOUSE_BUTTON_LEFT:
			if mouse.pressed:
				_start_drag(mouse.position)
			else:
				_end_drag(mouse.position)
	elif event is InputEventMouseMotion:
		if _dragging:
			var motion: InputEventMouseMotion = event as InputEventMouseMotion
			_update_drag(motion.position)


func _start_drag(pos: Vector2) -> void:
	# If the info panel is visible, ignore drag starts (handled by overlay tap).
	if _info_visible:
		return

	_drag_start_screen_pos = pos

	# Check if we're touching a sprite in the team panel.
	var panel_index: int = _get_panel_sprite_at(pos)
	if panel_index >= 0:
		var unplaced: Array[Dictionary] = _get_unplaced_sprites()
		if panel_index < unplaced.size():
			_drag_sprite_data = unplaced[panel_index]
			_drag_source_pos = Vector2i(-1, -1)
			_dragging = true
			_create_drag_visual(pos)
			return

	# Check if we're touching a sprite already on the grid.
	var grid_pos: Vector2i = _screen_to_player_grid(pos)
	if grid_pos != Vector2i(-1, -1) and placed_units.has(grid_pos):
		_drag_sprite_data = placed_units[grid_pos]
		_drag_source_pos = grid_pos
		placed_units.erase(grid_pos)
		_dragging = true
		_create_drag_visual(pos)
		_refresh_display()


func _update_drag(pos: Vector2) -> void:
	if not _dragging or _drag_visual == null:
		return
	_drag_visual.position = pos - Vector2(CELL_SIZE / 2.0, CELL_SIZE / 2.0)


func _end_drag(pos: Vector2) -> void:
	if not _dragging:
		return

	var drag_distance: float = pos.distance_to(_drag_start_screen_pos)
	var is_tap: bool = drag_distance < TAP_TOLERANCE

	_dragging = false

	# Tap on a team panel sprite -> show info instead of placing.
	if is_tap and _drag_source_pos == Vector2i(-1, -1) and not _drag_sprite_data.is_empty():
		var tap_data: Dictionary = _drag_sprite_data.duplicate()
		# Not a real drag -- nothing to place.
		_drag_sprite_data = {}
		_drag_source_pos = Vector2i(-1, -1)
		if _drag_visual != null and is_instance_valid(_drag_visual):
			_drag_visual.queue_free()
			_drag_visual = null
		_refresh_display()
		_show_sprite_info(tap_data)
		return

	# Tap on a grid unit -> show info and return unit to its cell.
	if is_tap and _drag_source_pos != Vector2i(-1, -1) and not _drag_sprite_data.is_empty():
		var tap_data: Dictionary = _drag_sprite_data.duplicate()
		# Return the unit to its original grid cell.
		placed_units[_drag_source_pos] = _drag_sprite_data
		_drag_sprite_data = {}
		_drag_source_pos = Vector2i(-1, -1)
		if _drag_visual != null and is_instance_valid(_drag_visual):
			_drag_visual.queue_free()
			_drag_visual = null
		_refresh_display()
		_show_sprite_info(tap_data)
		return

	var grid_pos: Vector2i = _screen_to_player_grid(pos)
	if grid_pos != Vector2i(-1, -1) and not placed_units.has(grid_pos):
		# Valid placement.
		placed_units[grid_pos] = _drag_sprite_data
	elif _drag_source_pos != Vector2i(-1, -1):
		# Return to original position if dropped outside grid.
		placed_units[_drag_source_pos] = _drag_sprite_data

	_drag_sprite_data = {}
	_drag_source_pos = Vector2i(-1, -1)

	if _drag_visual != null and is_instance_valid(_drag_visual):
		_drag_visual.queue_free()
		_drag_visual = null

	_refresh_display()

## -- Private: UI Construction -------------------------------------------------

func _create_button(text: String, pos: Vector2, btn_size: Vector2) -> Button:
	var button := Button.new()
	button.text = text
	button.position = pos
	button.size = btn_size
	button.add_theme_font_size_override("font_size", BUTTON_FONT_SIZE)
	button.focus_mode = Control.FOCUS_NONE

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.15, 0.2, 0.35)
	style.set_corner_radius_all(8)
	style.set_content_margin_all(8)
	button.add_theme_stylebox_override("normal", style)

	var pressed_style := style.duplicate()
	pressed_style.bg_color = Color(0.1, 0.15, 0.25)
	button.add_theme_stylebox_override("pressed", pressed_style)

	return button


func _populate_team_panel() -> void:
	# Clear existing entries.
	for child in team_panel.get_children():
		child.queue_free()

	for sprite_data in _team_sprites:
		var entry := _create_team_entry(sprite_data)
		team_panel.add_child(entry)


func _create_team_entry(sprite_data: Dictionary) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(PANEL_WIDTH - 20, SPRITE_ENTRY_HEIGHT)

	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.12, 0.2, 0.8)
	style.set_corner_radius_all(6)
	style.set_content_margin_all(6)
	style.set_border_width_all(1)
	style.border_color = Color(0.3, 0.3, 0.4)
	panel.add_theme_stylebox_override("panel", style)

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 8)

	# Portrait with visible frame for prominence.
	var portrait_frame := PanelContainer.new()
	portrait_frame.custom_minimum_size = Vector2(56, 56)
	var portrait_style := StyleBoxFlat.new()
	portrait_style.bg_color = Color(0.08, 0.08, 0.15, 1.0)
	portrait_style.set_corner_radius_all(4)
	portrait_style.set_border_width_all(2)
	portrait_style.border_color = Color(0.4, 0.4, 0.55)
	portrait_style.set_content_margin_all(2)
	portrait_frame.add_theme_stylebox_override("panel", portrait_style)
	portrait_frame.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var portrait := TextureRect.new()
	portrait.custom_minimum_size = Vector2(56, 56)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var tex: Texture2D = sprite_data.get("texture", null)
	if tex != null:
		portrait.texture = tex
	portrait_frame.add_child(portrait)
	hbox.add_child(portrait_frame)

	# Info vbox.
	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var name_label := Label.new()
	name_label.text = str(sprite_data.get("name", "Sprite"))
	name_label.add_theme_font_size_override("font_size", PANEL_FONT_SIZE)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	name_label.clip_text = true
	info.add_child(name_label)

	var level_label := Label.new()
	level_label.text = "Lv.%d" % sprite_data.get("level", 1)
	level_label.add_theme_font_size_override("font_size", 14)
	level_label.add_theme_color_override("font_color", Color(0.6, 0.65, 0.75))
	info.add_child(level_label)

	hbox.add_child(info)

	# Placed indicator.
	var placed_label := Label.new()
	placed_label.name = "PlacedLabel"
	placed_label.text = ""
	placed_label.add_theme_font_size_override("font_size", 14)
	placed_label.add_theme_color_override("font_color", Color(0.3, 0.8, 0.3))
	placed_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	placed_label.custom_minimum_size.x = 50.0
	hbox.add_child(placed_label)

	panel.add_child(hbox)
	return panel


func _create_drag_visual(pos: Vector2) -> void:
	if _drag_visual != null and is_instance_valid(_drag_visual):
		_drag_visual.queue_free()

	_drag_visual = TextureRect.new()
	_drag_visual.custom_minimum_size = Vector2(CELL_SIZE * 0.8, CELL_SIZE * 0.8)
	_drag_visual.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_drag_visual.modulate = Color(1, 1, 1, 0.75)
	_drag_visual.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_drag_visual.position = pos - Vector2(CELL_SIZE / 2.0, CELL_SIZE / 2.0)

	var tex: Texture2D = _drag_sprite_data.get("texture", null)
	if tex != null:
		_drag_visual.texture = tex

	_root.add_child(_drag_visual)

## -- Private: Coordinate Conversion -------------------------------------------

## Convert screen position to player grid position. Returns (-1,-1) if outside
## the player's deployable area (rows 0-3). The deployment screen uses the same
## row mapping as the battle grid: enemy rows (4-7) display at the top of the
## screen (display rows 0-3) and player rows (0-3) display at the bottom
## (display rows 4-7).
func _screen_to_player_grid(screen_pos: Vector2) -> Vector2i:
	var local := screen_pos - GRID_ORIGIN
	if local.x < 0 or local.y < 0:
		return Vector2i(-1, -1)

	var col: int = int(local.x / CELL_SIZE)
	var display_row: int = int(local.y / CELL_SIZE)

	if col < 0 or col >= _grid_size.x or display_row < 0 or display_row >= _grid_size.y:
		return Vector2i(-1, -1)

	# Map display row to grid row (bottom half = player rows 0-3).
	var grid_row: int = _display_row_to_grid_row(display_row)

	# Only allow placement on player rows (0-3).
	if grid_row < 0 or grid_row >= PLAYER_ROWS:
		return Vector2i(-1, -1)

	return Vector2i(col, grid_row)


## Convert player grid position to screen position (center of cell).
## Uses the same row mapping as GridDisplay: player rows 0-3 map to display
## rows 4-7 (bottom half), enemy rows 4-7 map to display rows 0-3 (top half).
func _player_grid_to_screen(grid_pos: Vector2i) -> Vector2:
	var display_row: int = _grid_row_to_display_row(grid_pos.y)
	return GRID_ORIGIN + Vector2(
		(float(grid_pos.x) + 0.5) * CELL_SIZE,
		(float(display_row) + 0.5) * CELL_SIZE
	)


## Map grid row to display row. Enemy rows (4-7) display at top (0-3),
## player rows (0-3) display at bottom (4-7). Matches GridDisplay mapping.
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

## -- Private: Display Refresh -------------------------------------------------

func _refresh_display() -> void:
	_clear_grid_visuals()
	_draw_grid_cells()
	_draw_enemy_preview()
	_draw_placed_units()
	_update_panel_placed_indicators()


func _clear_grid_visuals() -> void:
	# Remove dynamically added grid visuals (tagged with "grid_visual" group).
	for child in _root.get_children():
		if child.is_in_group("deploy_grid_visual"):
			child.queue_free()


func _draw_grid_cells() -> void:
	for display_row in range(_grid_size.y):
		for col in range(_grid_size.x):
			var pos := GRID_ORIGIN + Vector2(float(col) * CELL_SIZE, float(display_row) * CELL_SIZE)
			var cell := Panel.new()
			cell.position = pos
			cell.size = Vector2(CELL_SIZE, CELL_SIZE)
			cell.add_to_group("deploy_grid_visual")
			cell.mouse_filter = Control.MOUSE_FILTER_IGNORE

			# Map display row to grid row for correct coloring and placement lookup.
			var grid_row: int = _display_row_to_grid_row(display_row)
			var grid_pos := Vector2i(col, grid_row)
			var is_player_row: bool = grid_row >= 0 and grid_row < PLAYER_ROWS

			var style := StyleBoxFlat.new()
			if placed_units.has(grid_pos):
				# Occupied player cell -- highlighted blue.
				style.bg_color = Color(0.2, 0.35, 0.55, 0.3)
			elif is_player_row:
				# Empty player cell -- blue tint.
				style.bg_color = Color(0.2, 0.35, 0.55, 0.15)
			else:
				# Enemy cell -- red tint.
				style.bg_color = Color(0.55, 0.2, 0.2, 0.15)
			style.set_border_width_all(1)
			style.border_color = Color(0.3, 0.35, 0.45, 0.5)
			style.set_corner_radius_all(2)
			cell.add_theme_stylebox_override("panel", style)

			_root.add_child(cell)

	# Gold divider line between enemy rows (display rows 0-3) and player rows (display rows 4-7).
	var divider := ColorRect.new()
	var divider_y: float = GRID_ORIGIN.y + float(PLAYER_ROWS) * CELL_SIZE - 1.5
	divider.position = Vector2(GRID_ORIGIN.x, divider_y)
	divider.size = Vector2(float(_grid_size.x) * CELL_SIZE, 3.0)
	divider.color = Color(0.85, 0.7, 0.2, 0.9)
	divider.mouse_filter = Control.MOUSE_FILTER_IGNORE
	divider.add_to_group("deploy_grid_visual")
	_root.add_child(divider)


func _draw_placed_units() -> void:
	for grid_pos in placed_units:
		var data: Dictionary = placed_units[grid_pos]
		var screen_pos: Vector2 = _player_grid_to_screen(grid_pos)

		var tex_rect := TextureRect.new()
		tex_rect.custom_minimum_size = Vector2(CELL_SIZE * 0.8, CELL_SIZE * 0.8)
		tex_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tex_rect.position = screen_pos - Vector2(CELL_SIZE * 0.4, CELL_SIZE * 0.4)
		tex_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		tex_rect.add_to_group("deploy_grid_visual")

		var tex: Texture2D = data.get("texture", null)
		if tex != null:
			tex_rect.texture = tex

		_root.add_child(tex_rect)


## Draw enemy preview sprites in the top 4 rows (enemy side) with a
## semi-transparent red tint so the player can see what they are facing.
func _draw_enemy_preview() -> void:
	for enemy_data in _enemy_preview:
		var enemy_pos: Vector2i = enemy_data.get("position", Vector2i(-1, -1))
		if enemy_pos == Vector2i(-1, -1):
			continue

		# Enemy positions use grid rows 4-7. Convert to screen via row mapping.
		var screen_pos: Vector2 = _player_grid_to_screen(enemy_pos)

		var tex_rect := TextureRect.new()
		tex_rect.custom_minimum_size = Vector2(CELL_SIZE * 0.8, CELL_SIZE * 0.8)
		tex_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tex_rect.position = screen_pos - Vector2(CELL_SIZE * 0.4, CELL_SIZE * 0.4)
		tex_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		tex_rect.add_to_group("deploy_grid_visual")
		# Semi-transparent red tint for enemy preview.
		tex_rect.modulate = Color(1.0, 0.5, 0.5, 0.55)

		var tex: Texture2D = enemy_data.get("texture", null)
		if tex != null:
			tex_rect.texture = tex

		_root.add_child(tex_rect)

		# Draw enemy name below the sprite for identification.
		var enemy_name: String = str(enemy_data.get("name", ""))
		if not enemy_name.is_empty():
			var name_label := Label.new()
			name_label.text = enemy_name
			name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			name_label.add_theme_font_size_override("font_size", 12)
			name_label.add_theme_color_override("font_color", Color(1.0, 0.6, 0.6, 0.7))
			name_label.position = Vector2(screen_pos.x - CELL_SIZE * 0.4, screen_pos.y + CELL_SIZE * 0.3)
			name_label.size = Vector2(CELL_SIZE * 0.8, 16.0)
			name_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
			name_label.add_to_group("deploy_grid_visual")
			_root.add_child(name_label)


func _update_panel_placed_indicators() -> void:
	var placed_ids: Array[int] = []
	for grid_pos in placed_units:
		placed_ids.append(placed_units[grid_pos].get("id", -1))

	var entries: Array[Node] = []
	for child in team_panel.get_children():
		entries.append(child)

	for i in range(mini(entries.size(), _team_sprites.size())):
		var sprite_id: int = _team_sprites[i].get("id", -1)
		var placed_label: Label = entries[i].find_child("PlacedLabel", true, false)
		if placed_label != null:
			placed_label.text = "[Placed]" if sprite_id in placed_ids else ""

## -- Private: Helpers ---------------------------------------------------------

func _get_unplaced_sprites() -> Array[Dictionary]:
	var placed_ids: Array[int] = []
	for grid_pos in placed_units:
		placed_ids.append(placed_units[grid_pos].get("id", -1))

	var result: Array[Dictionary] = []
	for sprite in _team_sprites:
		if sprite.get("id", -1) not in placed_ids:
			result.append(sprite)
	return result


func _get_panel_sprite_at(screen_pos: Vector2) -> int:
	# Check if the position is within the team panel area.
	if screen_pos.x < PANEL_X or screen_pos.x > PANEL_X + PANEL_WIDTH:
		return -1

	var panel_y_start: float = 162.0  # Panel content start (120 + 42).
	var local_y: float = screen_pos.y - panel_y_start
	if local_y < 0:
		return -1

	var index: int = int(local_y / (SPRITE_ENTRY_HEIGHT + 6.0))
	var unplaced: Array[Dictionary] = _get_unplaced_sprites()
	if index >= 0 and index < unplaced.size():
		return index
	return -1

## -- Sprite Info Panel --------------------------------------------------------

## Build the info popup (initially hidden). Added as a child of _root last
## so it renders on top of every other element.
func _build_info_panel() -> void:
	# Dark overlay — fills the screen, dismisses panel on tap.
	_info_overlay = ColorRect.new()
	_info_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	_info_overlay.color = Color(0.0, 0.0, 0.0, 0.5)
	_info_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	_info_overlay.visible = false
	_root.add_child(_info_overlay)

	# Centered panel container.
	_info_panel = PanelContainer.new()
	_info_panel.custom_minimum_size = Vector2(INFO_PANEL_WIDTH, INFO_PANEL_HEIGHT)
	_info_panel.size = Vector2(INFO_PANEL_WIDTH, INFO_PANEL_HEIGHT)
	# Center on a 1080-wide screen.
	_info_panel.position = Vector2(
		(1080.0 - INFO_PANEL_WIDTH) / 2.0,
		(1920.0 - INFO_PANEL_HEIGHT) / 2.0
	)
	_info_panel.mouse_filter = Control.MOUSE_FILTER_STOP

	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.08, 0.08, 0.14, 0.97)
	panel_style.set_corner_radius_all(16)
	panel_style.set_border_width_all(2)
	panel_style.border_color = Color(0.3, 0.3, 0.45)
	panel_style.set_content_margin_all(28)
	_info_panel.add_theme_stylebox_override("panel", panel_style)

	# Scroll container for content (in case it overflows).
	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_info_panel.add_child(scroll)

	var content := VBoxContainer.new()
	content.name = "InfoContent"
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 18)
	scroll.add_child(content)

	# -- Portrait --
	var portrait_center := CenterContainer.new()
	portrait_center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(portrait_center)

	var portrait_frame := PanelContainer.new()
	portrait_frame.custom_minimum_size = Vector2(260.0, 260.0)
	var portrait_style := StyleBoxFlat.new()
	portrait_style.bg_color = Color(0.1, 0.1, 0.18, 1.0)
	portrait_style.set_corner_radius_all(12)
	portrait_style.set_border_width_all(2)
	portrait_style.border_color = Color(0.25, 0.25, 0.4)
	portrait_frame.add_theme_stylebox_override("panel", portrait_style)
	portrait_center.add_child(portrait_frame)

	var portrait := TextureRect.new()
	portrait.name = "InfoPortrait"
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.custom_minimum_size = Vector2(260.0, 260.0)
	portrait_frame.add_child(portrait)

	# -- Name label --
	var name_lbl := Label.new()
	name_lbl.name = "InfoName"
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.add_theme_font_size_override("font_size", 34)
	name_lbl.add_theme_color_override("font_color", Color.WHITE)
	content.add_child(name_lbl)

	# -- Level label --
	var level_lbl := Label.new()
	level_lbl.name = "InfoLevel"
	level_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	level_lbl.add_theme_font_size_override("font_size", 24)
	level_lbl.add_theme_color_override("font_color", Color(0.9, 0.85, 0.5))
	content.add_child(level_lbl)

	# -- Element badges container --
	var elem_center := CenterContainer.new()
	elem_center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(elem_center)

	var elem_row := HBoxContainer.new()
	elem_row.name = "InfoElements"
	elem_row.add_theme_constant_override("separation", 8)
	elem_center.add_child(elem_row)

	# -- Separator --
	var sep := HSeparator.new()
	sep.add_theme_constant_override("separation", 8)
	content.add_child(sep)

	# -- Stats header --
	var stats_header := Label.new()
	stats_header.text = "Stats"
	stats_header.add_theme_font_size_override("font_size", 26)
	stats_header.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	content.add_child(stats_header)

	# -- Stats grid (2-column) --
	var stats_grid := GridContainer.new()
	stats_grid.name = "InfoStatsGrid"
	stats_grid.columns = 2
	stats_grid.add_theme_constant_override("h_separation", 32)
	stats_grid.add_theme_constant_override("v_separation", 12)
	content.add_child(stats_grid)

	# Pre-build stat rows (will be populated in _show_sprite_info).
	var stat_keys: Array[String] = ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]
	var stat_display: Dictionary = {
		"hp": "HP", "atk": "ATK", "def": "DEF",
		"spd": "SPD", "sp_atk": "SP.ATK", "sp_def": "SP.DEF",
	}
	for key in stat_keys:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)

		var stat_name := Label.new()
		stat_name.text = stat_display.get(key, key.to_upper())
		stat_name.custom_minimum_size = Vector2(100.0, 0.0)
		stat_name.add_theme_font_size_override("font_size", 22)
		stat_name.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
		row.add_child(stat_name)

		var stat_val := Label.new()
		stat_val.name = "InfoStat_%s" % key
		stat_val.text = "--"
		stat_val.add_theme_font_size_override("font_size", 24)
		stat_val.add_theme_color_override("font_color", Color.WHITE)
		row.add_child(stat_val)

		stats_grid.add_child(row)

	# -- Separator --
	var sep2 := HSeparator.new()
	sep2.add_theme_constant_override("separation", 8)
	content.add_child(sep2)

	# -- Abilities header --
	var abilities_header := Label.new()
	abilities_header.text = "Abilities"
	abilities_header.add_theme_font_size_override("font_size", 26)
	abilities_header.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	content.add_child(abilities_header)

	# -- Abilities list --
	var abilities_box := VBoxContainer.new()
	abilities_box.name = "InfoAbilities"
	abilities_box.add_theme_constant_override("separation", 10)
	content.add_child(abilities_box)

	# -- Close button --
	var close_center := CenterContainer.new()
	close_center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(close_center)

	var close_btn := Button.new()
	close_btn.text = "Close"
	close_btn.custom_minimum_size = Vector2(240.0, 56.0)
	close_btn.add_theme_font_size_override("font_size", 24)
	close_btn.focus_mode = Control.FOCUS_NONE

	var close_style := StyleBoxFlat.new()
	close_style.bg_color = Color(0.2, 0.2, 0.3)
	close_style.set_corner_radius_all(10)
	close_style.set_content_margin_all(8)
	close_btn.add_theme_stylebox_override("normal", close_style)

	var close_pressed := close_style.duplicate()
	close_pressed.bg_color = Color(0.15, 0.15, 0.22)
	close_btn.add_theme_stylebox_override("pressed", close_pressed)
	close_btn.pressed.connect(_hide_sprite_info)
	close_center.add_child(close_btn)

	_info_panel.visible = false
	_root.add_child(_info_panel)


## Populate and show the sprite info panel.
func _show_sprite_info(sprite_data: Dictionary) -> void:
	_info_sprite_data = sprite_data
	_info_visible = true

	# -- Portrait --
	var portrait: TextureRect = _info_panel.find_child("InfoPortrait", true, false)
	if portrait != null:
		var tex: Texture2D = sprite_data.get("texture", null)
		portrait.texture = tex

	# -- Name --
	var name_lbl: Label = _info_panel.find_child("InfoName", true, false)
	if name_lbl != null:
		name_lbl.text = str(sprite_data.get("name", "Unknown Sprite"))

	# -- Level --
	var level_lbl: Label = _info_panel.find_child("InfoLevel", true, false)
	if level_lbl != null:
		level_lbl.text = "Lv. %d" % sprite_data.get("level", 1)

	# -- Elements --
	var elem_row: HBoxContainer = _info_panel.find_child("InfoElements", true, false)
	if elem_row != null:
		for child in elem_row.get_children():
			child.queue_free()
		var elements: Array = sprite_data.get("element_types", [])
		for element in elements:
			var badge := Label.new()
			badge.text = "  %s  " % str(element)
			var elem_color: Color = _get_element_color(str(element))
			var badge_settings := LabelSettings.new()
			badge_settings.font_size = 20
			badge_settings.font_color = elem_color

			var badge_style := StyleBoxFlat.new()
			badge_style.bg_color = elem_color.darkened(0.55)
			badge_style.set_corner_radius_all(8)
			badge.label_settings = badge_settings
			elem_row.add_child(badge)

	# -- Stats --
	var stat_keys: Array[String] = ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]
	for key in stat_keys:
		var stat_lbl: Label = _info_panel.find_child("InfoStat_%s" % key, true, false)
		if stat_lbl != null:
			var value = sprite_data.get(key, sprite_data.get("stats", {}).get(key, -1))
			if value is int and value >= 0:
				stat_lbl.text = str(value)
			elif value is float and value >= 0.0:
				stat_lbl.text = str(int(value))
			else:
				stat_lbl.text = "--"

	# -- Abilities --
	var abilities_box: VBoxContainer = _info_panel.find_child("InfoAbilities", true, false)
	if abilities_box != null:
		for child in abilities_box.get_children():
			child.queue_free()
		var abilities: Array = sprite_data.get("abilities", sprite_data.get("equipped_abilities", []))
		if abilities.is_empty():
			var empty_lbl := Label.new()
			empty_lbl.text = "No abilities equipped"
			empty_lbl.add_theme_font_size_override("font_size", 20)
			empty_lbl.add_theme_color_override("font_color", Color(0.45, 0.45, 0.55))
			abilities_box.add_child(empty_lbl)
		else:
			for ability in abilities:
				var ability_entry := HBoxContainer.new()
				ability_entry.add_theme_constant_override("separation", 8)

				var bullet := Label.new()
				bullet.text = ">"
				bullet.add_theme_font_size_override("font_size", 20)
				bullet.add_theme_color_override("font_color", Color(0.5, 0.6, 0.8))
				ability_entry.add_child(bullet)

				var ability_name := Label.new()
				if ability is String:
					ability_name.text = ability
				elif ability is Dictionary:
					ability_name.text = str(ability.get("name", "Unknown"))
				else:
					ability_name.text = str(ability)
				ability_name.add_theme_font_size_override("font_size", 22)
				ability_name.add_theme_color_override("font_color", Color.WHITE)
				ability_name.clip_text = true
				ability_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				ability_entry.add_child(ability_name)

				abilities_box.add_child(ability_entry)

	_info_overlay.visible = true
	_info_panel.visible = true


## Hide the sprite info panel.
func _hide_sprite_info() -> void:
	_info_visible = false
	_info_sprite_data = {}
	_info_overlay.visible = false
	_info_panel.visible = false


## Return the color associated with an element type.
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


## -- Signal Handlers ----------------------------------------------------------

func _on_auto_deploy_pressed() -> void:
	auto_deploy()


func _on_start_battle_pressed() -> void:
	if not validate_deployment():
		# Flash the button red briefly.
		var tween := create_tween()
		tween.tween_property(start_battle_button, "modulate", Color(1, 0.4, 0.4), 0.15)
		tween.tween_property(start_battle_button, "modulate", Color.WHITE, 0.15)
		return

	# Convert placements to the format expected by BattleManager.
	# Map player grid rows to actual BattleGrid rows (player: 0-3).
	var final_placements: Dictionary = {}
	for grid_pos in placed_units:
		final_placements[grid_pos] = placed_units[grid_pos]

	_root.visible = false
	deployment_confirmed.emit(final_placements)

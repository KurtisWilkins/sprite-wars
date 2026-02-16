## DeploymentScreen -- Pre-battle placement screen.
## Shows the player's half of the grid and a team panel. The player drags
## sprites from the team panel onto grid cells to set their starting positions.
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

## Grid dimensions for the player's side.
var _grid_size: Vector2i = Vector2i(6, 4)

## Enemy preview data.
var _enemy_preview: Array[Dictionary] = []

## Drag state.
var _dragging: bool = false
var _drag_sprite_data: Dictionary = {}
var _drag_visual: TextureRect = null
var _drag_source_pos: Vector2i = Vector2i(-1, -1)  # -1,-1 means from panel.

## -- Constants ----------------------------------------------------------------

const CELL_SIZE: float = 120.0
const GRID_ORIGIN := Vector2(60.0, 400.0)  # Player half starts lower on screen.
const PANEL_WIDTH: float = 280.0
const PANEL_X: float = 800.0  # Right side of screen.
const SPRITE_ENTRY_HEIGHT: float = 80.0
const BUTTON_HEIGHT: float = 56.0
const BUTTON_FONT_SIZE: int = 22
const PANEL_FONT_SIZE: int = 18

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

	# Grid display for the player's half.
	grid_display = Node2D.new()
	grid_display.set_script(null)  # We draw the grid manually here.
	_root.add_child(grid_display)

	# Team panel (scrollable).
	var panel_bg := Panel.new()
	panel_bg.position = Vector2(PANEL_X, 120)
	panel_bg.size = Vector2(PANEL_WIDTH, 1500)
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
	scroll.size = Vector2(PANEL_WIDTH - 16, 1440)
	panel_bg.add_child(scroll)

	team_panel = VBoxContainer.new()
	team_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	team_panel.add_theme_constant_override("separation", 6)
	scroll.add_child(team_panel)

	# Auto-deploy button.
	auto_deploy_button = _create_button("Auto Deploy", Vector2(80, 1720), Vector2(400, BUTTON_HEIGHT))
	auto_deploy_button.pressed.connect(_on_auto_deploy_pressed)
	_root.add_child(auto_deploy_button)

	# Start battle button.
	start_battle_button = _create_button("Start Battle", Vector2(540, 1720), Vector2(400, BUTTON_HEIGHT))
	start_battle_button.pressed.connect(_on_start_battle_pressed)
	var start_style: StyleBoxFlat = start_battle_button.get_theme_stylebox("normal").duplicate()
	start_style.bg_color = Color(0.2, 0.5, 0.3)
	start_battle_button.add_theme_stylebox_override("normal", start_style)
	_root.add_child(start_battle_button)

	add_child(_root)

## -- Public API ---------------------------------------------------------------

## Show the deployment screen with team and grid data.
## team: Array of {id: int, name: String, texture: Texture2D, level: int, hp: int, element_types: Array}
## grid_size: Vector2i (columns x player rows, typically 6x4)
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


## Auto-deploy: place sprites in a default formation (centered, back row first).
func auto_deploy() -> void:
	placed_units.clear()
	_clear_grid_visuals()

	var available: Array[Dictionary] = _get_unplaced_sprites()
	var positions: Array[Vector2i] = []

	# Fill from the back row (row 0 = front, row 3 = back for player).
	# Deploy back-to-front, centering units in each row.
	var placed_count: int = 0
	for row in range(_grid_size.y - 1, -1, -1):
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
	_dragging = false

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

	# Portrait.
	var portrait := TextureRect.new()
	portrait.custom_minimum_size = Vector2(56, 56)
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var tex: Texture2D = sprite_data.get("texture", null)
	if tex != null:
		portrait.texture = tex
	hbox.add_child(portrait)

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

## Convert screen position to player grid position. Returns (-1,-1) if outside.
func _screen_to_player_grid(screen_pos: Vector2) -> Vector2i:
	var local := screen_pos - GRID_ORIGIN
	if local.x < 0 or local.y < 0:
		return Vector2i(-1, -1)

	var col: int = int(local.x / CELL_SIZE)
	var row: int = int(local.y / CELL_SIZE)

	if col < 0 or col >= _grid_size.x or row < 0 or row >= _grid_size.y:
		return Vector2i(-1, -1)

	return Vector2i(col, row)


## Convert player grid position to screen position (center of cell).
func _player_grid_to_screen(grid_pos: Vector2i) -> Vector2:
	return GRID_ORIGIN + Vector2(
		(float(grid_pos.x) + 0.5) * CELL_SIZE,
		(float(grid_pos.y) + 0.5) * CELL_SIZE
	)

## -- Private: Display Refresh -------------------------------------------------

func _refresh_display() -> void:
	_clear_grid_visuals()
	_draw_grid_cells()
	_draw_placed_units()
	_update_panel_placed_indicators()


func _clear_grid_visuals() -> void:
	# Remove dynamically added grid visuals (tagged with "grid_visual" group).
	for child in _root.get_children():
		if child.is_in_group("deploy_grid_visual"):
			child.queue_free()


func _draw_grid_cells() -> void:
	for row in range(_grid_size.y):
		for col in range(_grid_size.x):
			var pos := GRID_ORIGIN + Vector2(float(col) * CELL_SIZE, float(row) * CELL_SIZE)
			var cell := Panel.new()
			cell.position = pos
			cell.size = Vector2(CELL_SIZE, CELL_SIZE)
			cell.add_to_group("deploy_grid_visual")
			cell.mouse_filter = Control.MOUSE_FILTER_IGNORE

			var grid_pos := Vector2i(col, row)
			var style := StyleBoxFlat.new()
			if placed_units.has(grid_pos):
				style.bg_color = Color(0.2, 0.35, 0.55, 0.3)
			else:
				style.bg_color = Color(0.15, 0.18, 0.25, 0.4)
			style.set_border_width_all(1)
			style.border_color = Color(0.3, 0.35, 0.45, 0.5)
			style.set_corner_radius_all(2)
			cell.add_theme_stylebox_override("panel", style)

			_root.add_child(cell)


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

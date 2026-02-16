## Minimap — Renders a miniature overhead view of the current area with a
## player position marker, fog-of-war, and discovered area tracking.
## [P5-018] Displayed as a corner overlay in the overworld HUD.
extends Control

## ── Node References ─────────────────────────────────────────────────────────

@onready var map_texture: TextureRect = $MapTexture
@onready var player_marker: TextureRect = $PlayerMarker

## ── Configuration ───────────────────────────────────────────────────────────

## Size of the minimap display in pixels.
@export var minimap_size: Vector2 = Vector2(160, 160)

## Scale factor: how many world pixels map to one minimap pixel.
@export var world_to_minimap_scale: float = 0.1

## Reveal radius around the player in grid cells.
@export var reveal_radius: int = 5

## Color used for unexplored (fog-of-war) areas.
@export var fog_color: Color = Color(0.1, 0.1, 0.15, 0.85)

## Color used for the player marker.
@export var player_marker_color: Color = Color(0.2, 0.8, 1.0, 1.0)

## ── State ───────────────────────────────────────────────────────────────────

## Fog-of-war grid: cells that have been revealed are true.
var fog_of_war: Dictionary = {}  # {Vector2i: bool}

## List of area IDs the player has discovered.
var discovered_areas: Array[String] = []

## Current map image used as the minimap base.
var _current_map_image: Image = null

## Cached fog-of-war overlay image.
var _fog_image: Image = null

## The rendered minimap texture (map + fog composited).
var _rendered_texture: ImageTexture = null

## Grid dimensions of the current map.
var _map_grid_size: Vector2i = Vector2i.ZERO

## World-space bounds of the current map.
var _map_bounds: Rect2 = Rect2()

## Current player world position for marker placement.
var _player_world_pos: Vector2 = Vector2.ZERO


## ── Signals ─────────────────────────────────────────────────────────────────

signal area_discovered(area_id: String)


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	custom_minimum_size = minimap_size
	size = minimap_size
	clip_contents = true

	# Connect to area changes
	EventBus.area_entered.connect(_on_area_entered)


func _draw() -> void:
	_draw_minimap()


## ── Public API ──────────────────────────────────────────────────────────────

## Updates the player's position on the minimap. Call this from the overworld
## scene's _process or whenever the player moves.
func update_player_position(world_pos: Vector2) -> void:
	_player_world_pos = world_pos

	# Reveal fog around the player
	var grid_pos: Vector2i = _world_to_grid(world_pos)
	_reveal_around(grid_pos)

	# Update the player marker position
	_update_player_marker()

	queue_redraw()


## Marks an area as discovered.
func reveal_area(area_id: String) -> void:
	if area_id in discovered_areas:
		return

	discovered_areas.append(area_id)
	area_discovered.emit(area_id)


## Returns true if the given area has been discovered by the player.
func is_discovered(area_id: String) -> bool:
	return area_id in discovered_areas


## Sets the map image and bounds for the minimap display. Called when the area
## map changes (new area loaded).
func set_map_data(map_image: Image, map_bounds: Rect2, grid_size: Vector2i) -> void:
	_current_map_image = map_image
	_map_bounds = map_bounds
	_map_grid_size = grid_size

	# Create a fresh fog image matching the map dimensions
	_fog_image = Image.create(
		grid_size.x,
		grid_size.y,
		false,
		Image.FORMAT_RGBA8,
	)
	_fog_image.fill(fog_color)

	# Apply previously revealed cells
	for pos: Vector2i in fog_of_war:
		if fog_of_war[pos]:
			_clear_fog_at(pos)

	_update_rendered_texture()
	queue_redraw()


## ── Fog-of-War ──────────────────────────────────────────────────────────────

## Reveals cells in a radius around the given grid position.
func _reveal_around(center: Vector2i) -> void:
	var changed: bool = false

	for dx in range(-reveal_radius, reveal_radius + 1):
		for dy in range(-reveal_radius, reveal_radius + 1):
			# Circular reveal
			if dx * dx + dy * dy > reveal_radius * reveal_radius:
				continue

			var cell := Vector2i(center.x + dx, center.y + dy)

			# Bounds check
			if cell.x < 0 or cell.y < 0:
				continue
			if cell.x >= _map_grid_size.x or cell.y >= _map_grid_size.y:
				continue

			if not fog_of_war.get(cell, false):
				fog_of_war[cell] = true
				_clear_fog_at(cell)
				changed = true

	if changed:
		_update_rendered_texture()


## Clears the fog pixel at the given grid cell.
func _clear_fog_at(grid_pos: Vector2i) -> void:
	if not _fog_image:
		return
	if grid_pos.x < 0 or grid_pos.y < 0:
		return
	if grid_pos.x >= _fog_image.get_width() or grid_pos.y >= _fog_image.get_height():
		return
	_fog_image.set_pixel(grid_pos.x, grid_pos.y, Color.TRANSPARENT)


## ── Rendering ───────────────────────────────────────────────────────────────

func _update_rendered_texture() -> void:
	if not _current_map_image or not _fog_image:
		return

	# Composite: map image with fog overlay
	var result_image: Image = _current_map_image.duplicate() as Image

	# Resize fog to match map image dimensions
	var fog_resized: Image = _fog_image.duplicate() as Image
	if fog_resized.get_size() != result_image.get_size():
		fog_resized.resize(
			result_image.get_width(),
			result_image.get_height(),
			Image.INTERPOLATE_NEAREST,
		)

	# Blend fog onto the map
	result_image.blend_rect(
		fog_resized,
		Rect2i(Vector2i.ZERO, fog_resized.get_size()),
		Vector2i.ZERO,
	)

	# Update the texture
	if _rendered_texture:
		_rendered_texture.update(result_image)
	else:
		_rendered_texture = ImageTexture.create_from_image(result_image)

	if map_texture:
		map_texture.texture = _rendered_texture


func _draw_minimap() -> void:
	# Draw background
	draw_rect(Rect2(Vector2.ZERO, minimap_size), Color(0.05, 0.05, 0.1, 0.8))

	# Draw border
	draw_rect(Rect2(Vector2.ZERO, minimap_size), Color(0.5, 0.5, 0.6, 0.8), false, 2.0)

	# If no map loaded, just show the background
	if not _rendered_texture:
		return

	# Draw the minimap texture
	var tex_size: Vector2 = Vector2(_rendered_texture.get_width(), _rendered_texture.get_height())
	var scale_factor: Vector2 = minimap_size / tex_size
	var min_scale: float = minf(scale_factor.x, scale_factor.y)

	# Center the map within the minimap display
	var scaled_size: Vector2 = tex_size * min_scale
	var offset: Vector2 = (minimap_size - scaled_size) * 0.5
	draw_texture_rect(_rendered_texture, Rect2(offset, scaled_size), false)

	# Draw player marker
	var marker_pos: Vector2 = _world_to_minimap(_player_world_pos)
	draw_circle(marker_pos, 3.0, player_marker_color)

	# Draw a small direction indicator
	var dir: Vector2 = Vector2.DOWN  # Default; would use player facing_direction
	draw_line(marker_pos, marker_pos + dir * 4.0, player_marker_color, 1.5)


## ── Coordinate Conversion ───────────────────────────────────────────────────

## Converts a world position to a grid cell position.
func _world_to_grid(world_pos: Vector2) -> Vector2i:
	if _map_bounds.size == Vector2.ZERO:
		return Vector2i.ZERO

	var relative: Vector2 = world_pos - _map_bounds.position
	var grid_cell_size: Vector2 = _map_bounds.size / Vector2(_map_grid_size)

	return Vector2i(
		clampi(int(relative.x / grid_cell_size.x), 0, _map_grid_size.x - 1),
		clampi(int(relative.y / grid_cell_size.y), 0, _map_grid_size.y - 1),
	)


## Converts a world position to a position within the minimap display.
func _world_to_minimap(world_pos: Vector2) -> Vector2:
	if _map_bounds.size == Vector2.ZERO:
		return minimap_size * 0.5

	var relative: Vector2 = world_pos - _map_bounds.position
	var normalized: Vector2 = relative / _map_bounds.size

	return Vector2(
		clampf(normalized.x * minimap_size.x, 0.0, minimap_size.x),
		clampf(normalized.y * minimap_size.y, 0.0, minimap_size.y),
	)


## Updates the player marker's position within the minimap control.
func _update_player_marker() -> void:
	if not player_marker:
		return

	var marker_pos: Vector2 = _world_to_minimap(_player_world_pos)
	# Center the marker texture on the calculated position
	var marker_size: Vector2 = player_marker.size
	player_marker.position = marker_pos - marker_size * 0.5


## ── Event Handlers ──────────────────────────────────────────────────────────

func _on_area_entered(area_id: String) -> void:
	reveal_area(area_id)

	# Clear fog for a new area (fog_of_war is per-area)
	fog_of_war.clear()
	_fog_image = null
	_rendered_texture = null
	queue_redraw()


## ── Save / Load ─────────────────────────────────────────────────────────────

## Serializes minimap discovery data for the save system.
func to_dict() -> Dictionary:
	var fog_data: Array[Dictionary] = []
	for pos: Vector2i in fog_of_war:
		if fog_of_war[pos]:
			fog_data.append({"x": pos.x, "y": pos.y})

	return {
		"discovered_areas": discovered_areas.duplicate(),
		"fog_of_war": fog_data,
	}


## Restores minimap discovery data from a save file.
func from_dict(data: Dictionary) -> void:
	discovered_areas.clear()
	var areas: Array = data.get("discovered_areas", [])
	for area_id in areas:
		discovered_areas.append(str(area_id))

	fog_of_war.clear()
	var fog_data: Array = data.get("fog_of_war", [])
	for entry: Dictionary in fog_data:
		var pos := Vector2i(entry.get("x", 0), entry.get("y", 0))
		fog_of_war[pos] = true

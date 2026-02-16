## OverworldMap — Manages the tile-based overworld map, collision, encounter zones,
## area transitions, and placed objects.
## [P5-001] Core map system for all overworld navigation.
extends Node2D

## ── Node References ─────────────────────────────────────────────────────────

@onready var tile_map: TileMap = $TileMap

## ── Configuration ───────────────────────────────────────────────────────────

## TileMap layer index used for walkability collision checks.
@export var collision_layer: int = 1

## TileMap layer index for tall grass / encounter zones.
@export var encounter_layer: int = 2

## Grid cell size in pixels (must match TileMap tile_size).
@export var grid_size: int = 16

## ── Runtime State ───────────────────────────────────────────────────────────

## Dictionary mapping area_id (String) -> Rect2 defining trigger zones for
## area transitions. Populated by load_map() or configured in the editor.
var transition_zones: Dictionary = {}  # {String: Rect2}

## Currently placed NPC references keyed by grid position for O(1) lookup.
var _npc_lookup: Dictionary = {}  # {Vector2i: NPCController}

## Currently placed interactable objects keyed by grid position.
var _object_lookup: Dictionary = {}  # {Vector2i: Node}

## Cached map pixel bounds for camera clamping.
var map_bounds_px: Rect2 = Rect2()


## ── Signals ─────────────────────────────────────────────────────────────────

signal map_loaded(map_id: String)
signal object_placed(object: Node, grid_pos: Vector2i)


## ── Map Loading ─────────────────────────────────────────────────────────────

## Loads tileset, map layers, transitions, and placed objects from a data dict.
## Expected keys:
##   tileset_path: String - res:// path to the TileSet resource
##   layers: Array[Dictionary] - per-layer tile data {layer_index, cells: [{pos: Vector2i, source_id, atlas_coords, alternative}]}
##   transitions: Dictionary {area_id: {x, y, w, h}}
##   objects: Array[Dictionary] - see place_objects()
##   npcs: Array[Dictionary] - NPC placement data
##   map_id: String
func load_map(map_data: Dictionary) -> void:
	_clear_map()

	# Load tileset
	var tileset_path: String = map_data.get("tileset_path", "")
	if not tileset_path.is_empty():
		var tileset := load(tileset_path) as TileSet
		if tileset:
			tile_map.tile_set = tileset

	# Populate tile layers
	var layers: Array = map_data.get("layers", [])
	for layer_data: Dictionary in layers:
		var layer_index: int = layer_data.get("layer_index", 0)
		# Ensure layer exists
		while tile_map.get_layers_count() <= layer_index:
			tile_map.add_layer(-1)
		var cells: Array = layer_data.get("cells", [])
		for cell: Dictionary in cells:
			var pos: Vector2i = cell.get("pos", Vector2i.ZERO)
			var source_id: int = cell.get("source_id", 0)
			var atlas_coords: Vector2i = cell.get("atlas_coords", Vector2i.ZERO)
			var alternative: int = cell.get("alternative", 0)
			tile_map.set_cell(layer_index, pos, source_id, atlas_coords, alternative)

	# Parse transition zones
	transition_zones.clear()
	var transitions: Dictionary = map_data.get("transitions", {})
	for area_id: String in transitions:
		var rect_data: Dictionary = transitions[area_id]
		transition_zones[area_id] = Rect2(
			rect_data.get("x", 0.0),
			rect_data.get("y", 0.0),
			rect_data.get("w", 0.0),
			rect_data.get("h", 0.0),
		)

	# Place objects (chests, signs, etc.)
	var objects: Array = map_data.get("objects", [])
	place_objects(objects)

	# Cache map bounds
	_update_map_bounds()

	var map_id: String = map_data.get("map_id", "unknown")
	map_loaded.emit(map_id)


## ── Tile Queries ────────────────────────────────────────────────────────────

## Returns the tile source ID at the given world position on the base layer (0).
func get_tile_at(world_pos: Vector2) -> int:
	var grid_pos: Vector2i = tile_map.local_to_map(tile_map.to_local(world_pos))
	return tile_map.get_cell_source_id(0, grid_pos)


## Returns true if the grid cell is walkable (no collision tile present).
func is_walkable(grid_pos: Vector2i) -> bool:
	# A cell is walkable if the collision layer has no tile there
	var source_id: int = tile_map.get_cell_source_id(collision_layer, grid_pos)
	if source_id != -1:
		return false
	# Also check for NPC blocking
	if _npc_lookup.has(grid_pos):
		return false
	# Check for blocking objects
	if _object_lookup.has(grid_pos):
		var obj: Node = _object_lookup[grid_pos]
		if obj.has_method("is_blocking") and obj.is_blocking():
			return false
	return true


## Returns true if the grid cell is an encounter zone (tall grass, etc.).
func is_encounter_zone(grid_pos: Vector2i) -> bool:
	var source_id: int = tile_map.get_cell_source_id(encounter_layer, grid_pos)
	return source_id != -1


## Returns the target area_id if the given grid position overlaps a transition
## zone, or "" if no transition exists at that position.
func get_transition_at(grid_pos: Vector2i) -> String:
	var world_pos := Vector2(grid_pos) * float(grid_size) + Vector2(grid_size, grid_size) * 0.5
	for area_id: String in transition_zones:
		var zone: Rect2 = transition_zones[area_id]
		if zone.has_point(world_pos):
			return area_id
	return ""


## Returns the NPCController at the given grid position, or null if none.
func get_npc_at(grid_pos: Vector2i) -> Node:
	return _npc_lookup.get(grid_pos, null)


## Returns the interactable object at the given grid position, or null.
func get_object_at(grid_pos: Vector2i) -> Node:
	return _object_lookup.get(grid_pos, null)


## ── Object Placement ────────────────────────────────────────────────────────

## Places interactable objects from an array of dictionaries.
## Each entry: {scene_path: String, grid_pos: Vector2i, data: Dictionary}
func place_objects(objects: Array) -> void:
	for obj_data: Dictionary in objects:
		var scene_path: String = obj_data.get("scene_path", "")
		var grid_pos: Vector2i = obj_data.get("grid_pos", Vector2i.ZERO)
		var data: Dictionary = obj_data.get("data", {})

		if scene_path.is_empty():
			push_warning("OverworldMap: object missing scene_path at %s" % str(grid_pos))
			continue

		var scene := load(scene_path) as PackedScene
		if not scene:
			push_warning("OverworldMap: failed to load scene '%s'" % scene_path)
			continue

		var instance := scene.instantiate()
		instance.position = Vector2(grid_pos) * float(grid_size) + Vector2(grid_size, grid_size) * 0.5

		if instance.has_method("setup"):
			instance.setup(data)

		add_child(instance)
		_object_lookup[grid_pos] = instance
		object_placed.emit(instance, grid_pos)


## ── NPC Registration ────────────────────────────────────────────────────────

## Registers an NPC at a grid position for lookup. Called by NPCController on
## ready or whenever the NPC moves.
func register_npc(npc: Node, grid_pos: Vector2i) -> void:
	# Remove old position if the NPC was previously registered
	for pos: Vector2i in _npc_lookup:
		if _npc_lookup[pos] == npc:
			_npc_lookup.erase(pos)
			break
	_npc_lookup[grid_pos] = npc


## Unregisters an NPC (e.g. when removed from the scene).
func unregister_npc(npc: Node) -> void:
	for pos: Vector2i in _npc_lookup:
		if _npc_lookup[pos] == npc:
			_npc_lookup.erase(pos)
			return


## ── Coordinate Helpers ──────────────────────────────────────────────────────

## Converts a world position to a grid position.
func world_to_grid(world_pos: Vector2) -> Vector2i:
	return tile_map.local_to_map(tile_map.to_local(world_pos))


## Converts a grid position to a centered world position.
func grid_to_world(grid_pos: Vector2i) -> Vector2:
	return Vector2(grid_pos) * float(grid_size) + Vector2(grid_size, grid_size) * 0.5


## ── Internals ───────────────────────────────────────────────────────────────

func _clear_map() -> void:
	# Remove placed objects
	for pos: Vector2i in _object_lookup:
		var obj: Node = _object_lookup[pos]
		if is_instance_valid(obj):
			obj.queue_free()
	_object_lookup.clear()
	_npc_lookup.clear()
	transition_zones.clear()
	# Clear all tile layers
	for i in range(tile_map.get_layers_count()):
		tile_map.clear_layer(i)


func _update_map_bounds() -> void:
	var used_rect: Rect2i = tile_map.get_used_rect()
	map_bounds_px = Rect2(
		Vector2(used_rect.position) * float(grid_size),
		Vector2(used_rect.size) * float(grid_size),
	)

## InteractableObject — Base class for all overworld interactable objects:
## chests, signs, save points, breakable rocks, switches, and item pickups.
## [P5-012] Uses Area2D for interaction detection and delegates behavior
## based on object_type.
extends Area2D

## ── Identity ────────────────────────────────────────────────────────────────

## Unique identifier for save/load tracking of object state.
@export var object_id: String = ""

## Determines the interaction behavior.
@export_enum("chest", "sign", "save_point", "breakable_rock", "switch", "item_pickup")
var object_type: String = "sign"

## ── Data ────────────────────────────────────────────────────────────────────

## Configuration data specific to the object type:
##   chest:           {items: [{item_id: int, count: int}], opened_sprite: String}
##   sign:            {text: String}
##   save_point:      {heal: bool}
##   breakable_rock:  {required_ability: String, loot: [{item_id, count}]}
##   switch:          {target_id: String, toggle_state: bool}
##   item_pickup:     {item_id: int, count: int, visible_sprite: String}
@export var interaction_data: Dictionary = {}

## Whether this object has been used/consumed (persisted via save system).
var is_used: bool = false

## ── Node References ─────────────────────────────────────────────────────────

## Optional animated sprite for visual state changes (open chest, pressed switch).
@onready var sprite: Sprite2D = $Sprite2D if has_node("Sprite2D") else null
@onready var animated_sprite: AnimatedSprite2D = $AnimatedSprite2D if has_node("AnimatedSprite2D") else null

## ── Signals ─────────────────────────────────────────────────────────────────

signal object_interacted(object_id: String, object_type: String)
signal chest_opened(object_id: String, items: Array)
signal sign_read(object_id: String, text: String)
signal save_triggered(object_id: String)
signal switch_toggled(object_id: String, new_state: bool)
signal item_picked_up(object_id: String, item_id: int, count: int)
signal rock_broken(object_id: String)


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	add_to_group("interactable")
	_update_visual_state()


## ── Interaction Entry Point ─────────────────────────────────────────────────

## Called by the PlayerController when the player presses the interact button
## while facing this object.
func interact(player: Node) -> void:
	if is_used and object_type in ["chest", "item_pickup", "breakable_rock"]:
		# Already consumed; no further interaction
		return

	object_interacted.emit(object_id, object_type)

	match object_type:
		"chest":
			_interact_chest(player)
		"sign":
			_interact_sign(player)
		"save_point":
			_interact_save_point(player)
		"breakable_rock":
			_interact_breakable_rock(player)
		"switch":
			_interact_switch(player)
		"item_pickup":
			_interact_item_pickup(player)
		_:
			push_warning("InteractableObject: unknown object_type '%s'" % object_type)


## ── Type-Specific Interactions ──────────────────────────────────────────────

func _interact_chest(player: Node) -> void:
	var items: Array = interaction_data.get("items", [])

	# Grant items to the player
	for item_entry: Dictionary in items:
		var item_id: int = item_entry.get("item_id", 0)
		var count: int = item_entry.get("count", 1)
		if item_id > 0:
			EventBus.item_acquired.emit(null, count)

	is_used = true
	chest_opened.emit(object_id, items)

	# Visual: switch to opened chest sprite
	_set_animation("opened")

	# Show dialogue about obtained items
	_show_item_dialogue(items)

	# Play chest open SFX
	EventBus.sfx_requested.emit("chest_open", global_position)


func _interact_sign(player: Node) -> void:
	var text: String = interaction_data.get("text", "...")

	sign_read.emit(object_id, text)

	# Show sign text via dialogue system
	var dialogue_data: Array[Dictionary] = [{
		"speaker": "",
		"text": text,
		"portrait": "",
		"choices": [],
	}]

	var dialogue_system := _get_dialogue_system()
	if dialogue_system:
		dialogue_system.start_dialogue(dialogue_data)


func _interact_save_point(player: Node) -> void:
	save_triggered.emit(object_id)

	# Optionally heal the team
	var should_heal: bool = interaction_data.get("heal", true)
	if should_heal:
		var sprite_center := _get_sprite_center()
		if sprite_center and sprite_center.has_method("heal_all_sprites"):
			sprite_center.heal_all_sprites(GameManager.player_data)

	# Set respawn point
	var sprite_center := _get_sprite_center()
	if sprite_center and sprite_center.has_method("set_respawn_point"):
		var grid_pos := Vector2i(
			roundi(global_position.x / 16.0),
			roundi(global_position.y / 16.0),
		)
		sprite_center.set_respawn_point(GameManager.current_area_id, grid_pos)

	# Trigger save
	EventBus.save_requested.emit()

	# Play save animation
	_set_animation("active")

	# Show confirmation dialogue
	var dialogue_data: Array[Dictionary] = [{
		"speaker": "",
		"text": "Progress saved. Your Sprites have been fully healed!" if should_heal else "Progress saved!",
		"portrait": "",
		"choices": [],
	}]

	var dialogue_system := _get_dialogue_system()
	if dialogue_system:
		dialogue_system.start_dialogue(dialogue_data)

	EventBus.sfx_requested.emit("save_point", global_position)


func _interact_breakable_rock(player: Node) -> void:
	var required_ability: String = interaction_data.get("required_ability", "")

	# Check if the player has the required ability (e.g. "Rock Smash")
	if not required_ability.is_empty():
		if not _player_has_ability(required_ability):
			var dialogue_data: Array[Dictionary] = [{
				"speaker": "",
				"text": "This rock looks like it could be broken with the right ability...",
				"portrait": "",
				"choices": [],
			}]
			var dialogue_system := _get_dialogue_system()
			if dialogue_system:
				dialogue_system.start_dialogue(dialogue_data)
			return

	# Break the rock
	is_used = true
	rock_broken.emit(object_id)

	# Drop loot
	var loot: Array = interaction_data.get("loot", [])
	for item_entry: Dictionary in loot:
		var item_id: int = item_entry.get("item_id", 0)
		var count: int = item_entry.get("count", 1)
		if item_id > 0:
			EventBus.item_acquired.emit(null, count)

	# Play break animation then remove
	_set_animation("breaking")
	EventBus.sfx_requested.emit("rock_break", global_position)

	# After animation, hide or free
	if animated_sprite:
		if animated_sprite.sprite_frames and animated_sprite.sprite_frames.has_animation("breaking"):
			await animated_sprite.animation_finished
	visible = false
	set_deferred("monitoring", false)


func _interact_switch(player: Node) -> void:
	var current_state: bool = interaction_data.get("toggle_state", false)
	var new_state: bool = not current_state
	interaction_data["toggle_state"] = new_state

	switch_toggled.emit(object_id, new_state)

	# Notify the target (e.g. a door or barrier)
	var target_id: String = interaction_data.get("target_id", "")
	if not target_id.is_empty():
		_notify_switch_target(target_id, new_state)

	# Visual update
	_set_animation("on" if new_state else "off")

	EventBus.sfx_requested.emit("switch_toggle", global_position)


func _interact_item_pickup(player: Node) -> void:
	var item_id: int = interaction_data.get("item_id", 0)
	var count: int = interaction_data.get("count", 1)

	if item_id > 0:
		EventBus.item_acquired.emit(null, count)

	is_used = true
	item_picked_up.emit(object_id, item_id, count)

	# Show pickup dialogue
	_show_item_dialogue([{"item_id": item_id, "count": count}])

	# Remove from world
	visible = false
	set_deferred("monitoring", false)

	EventBus.sfx_requested.emit("item_pickup", global_position)


## ── Helpers ─────────────────────────────────────────────────────────────────

## Returns true if this object blocks player movement.
func is_blocking() -> bool:
	match object_type:
		"chest":
			return true
		"breakable_rock":
			return not is_used
		"switch":
			return false
		_:
			return false


## Setup method called by OverworldMap.place_objects().
func setup(data: Dictionary) -> void:
	interaction_data = data
	object_type = data.get("object_type", object_type)
	object_id = data.get("object_id", object_id)
	is_used = data.get("is_used", false)
	_update_visual_state()


func _update_visual_state() -> void:
	if is_used:
		match object_type:
			"chest":
				_set_animation("opened")
			"breakable_rock", "item_pickup":
				visible = false


func _set_animation(anim_name: String) -> void:
	if animated_sprite and animated_sprite.sprite_frames:
		if animated_sprite.sprite_frames.has_animation(anim_name):
			animated_sprite.play(anim_name)
	elif sprite:
		# For static sprites, we rely on named frames in the atlas
		pass


func _show_item_dialogue(items: Array) -> void:
	if items.is_empty():
		return

	var text := "Obtained: "
	var item_strings: PackedStringArray = []
	for item_entry: Dictionary in items:
		var item_id: int = item_entry.get("item_id", 0)
		var count: int = item_entry.get("count", 1)
		# In production, look up item name from data resource
		var item_name := "Item #%d" % item_id
		if count > 1:
			item_strings.append("%s x%d" % [item_name, count])
		else:
			item_strings.append(item_name)

	text += ", ".join(item_strings)

	var dialogue_data: Array[Dictionary] = [{
		"speaker": "",
		"text": text,
		"portrait": "",
		"choices": [],
	}]

	var dialogue_system := _get_dialogue_system()
	if dialogue_system:
		dialogue_system.start_dialogue(dialogue_data)


func _player_has_ability(ability_name: String) -> bool:
	# Check if any Sprite in the player's team knows the required field ability
	if not GameManager.player_data:
		return false
	var team: Array = GameManager.player_data.get("team") if GameManager.player_data.get("team") != null else []
	for sprite_data in team:
		if sprite_data.has_method("has_ability"):
			if sprite_data.has_ability(ability_name):
				return true
	return false


func _notify_switch_target(target_id: String, state: bool) -> void:
	var interactables := get_tree().get_nodes_in_group("interactable")
	for obj: Node in interactables:
		if obj.get("object_id") == target_id:
			if obj.has_method("on_switch_toggled"):
				obj.on_switch_toggled(state)
			return


func _get_dialogue_system() -> Node:
	var systems := get_tree().get_nodes_in_group("dialogue_system")
	if not systems.is_empty():
		return systems[0]
	return get_tree().root.find_child("DialogueSystem", true, false)


func _get_sprite_center() -> Node:
	var centers := get_tree().get_nodes_in_group("sprite_center")
	if not centers.is_empty():
		return centers[0]
	return get_tree().root.find_child("SpriteCenter", true, false)

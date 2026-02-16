## SpriteCenter — Handles team healing and respawn point management.
## [P5-013] The player's Sprite team is fully restored when visiting a Sprite Center,
## and the last-visited center becomes the respawn point on defeat.
extends Node

## ── Respawn Data ────────────────────────────────────────────────────────────

## Area ID of the last visited Sprite Center (used as respawn location).
var respawn_area_id: String = "starter_town"

## Grid position within the respawn area where the player will spawn.
var respawn_position: Vector2i = Vector2i.ZERO

## ── Configuration ───────────────────────────────────────────────────────────

## Duration of the heal animation sequence in seconds.
@export var heal_animation_duration: float = 1.5

## ── Signals ─────────────────────────────────────────────────────────────────

signal heal_started()
signal heal_completed()
signal respawn_point_set(area_id: String, position: Vector2i)


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	add_to_group("sprite_center")


## ── Public API ──────────────────────────────────────────────────────────────

## Fully restores HP (and optionally PP/status) for every Sprite in the
## player's active team.
func heal_all_sprites(player_data: Resource) -> void:
	if not player_data:
		push_warning("SpriteCenter: player_data is null, cannot heal.")
		return

	heal_started.emit()

	# Get the player's team
	var team: Array = []
	if player_data.get("team") != null:
		team = player_data.team

	if team.is_empty():
		heal_completed.emit()
		return

	# Play heal animation (non-blocking visual feedback)
	_play_heal_animation()

	# Restore each Sprite
	for sprite_data in team:
		_heal_sprite(sprite_data)

	# Play healing SFX
	EventBus.sfx_requested.emit("heal_jingle", Vector2.ZERO)

	# Wait for animation to complete
	await get_tree().create_timer(heal_animation_duration).timeout

	heal_completed.emit()
	EventBus.notification_requested.emit("Your Sprites have been fully healed!", "info")


## Sets the respawn point to the given area and position. Called when the player
## interacts with a save point or Sprite Center.
func set_respawn_point(area_id: String, position: Vector2i) -> void:
	respawn_area_id = area_id
	respawn_position = position
	respawn_point_set.emit(area_id, position)


## Returns the current respawn location as a Dictionary for the save system.
func get_respawn_data() -> Dictionary:
	return {
		"area_id": respawn_area_id,
		"position_x": respawn_position.x,
		"position_y": respawn_position.y,
	}


## Loads respawn data from a save file.
func load_respawn_data(data: Dictionary) -> void:
	respawn_area_id = data.get("area_id", "starter_town")
	respawn_position = Vector2i(
		data.get("position_x", 0),
		data.get("position_y", 0),
	)


## Triggers respawn: transitions the player to the last Sprite Center and heals.
func respawn_player() -> void:
	# Heal the team first
	heal_all_sprites(GameManager.player_data)

	# Transition to the respawn area
	var transition_system := _get_transition_system()
	if transition_system and transition_system.has_method("transition_to_area"):
		transition_system.transition_to_area(
			respawn_area_id,
			respawn_position,
			"fade_black",
		)
	else:
		# Fallback: direct area transition
		GameManager.transition_to_area(respawn_area_id)


## ── Internal: Healing Logic ─────────────────────────────────────────────────

## Restores a single Sprite to full HP, clears status effects, and restores PP.
func _heal_sprite(sprite_data: Variant) -> void:
	if sprite_data == null:
		return

	# Restore HP to maximum
	if sprite_data.get("current_hp") != null and sprite_data.get("max_hp") != null:
		sprite_data.current_hp = sprite_data.max_hp

	# Alternative: some data schemas use a heal() method
	if sprite_data.has_method("heal_full"):
		sprite_data.heal_full()
		return

	# Clear status effects
	if sprite_data.get("status_effects") != null:
		sprite_data.status_effects = []

	# Restore PP for all abilities
	if sprite_data.get("abilities") != null:
		for ability in sprite_data.abilities:
			if ability and ability.get("current_pp") != null and ability.get("pp_max") != null:
				ability.current_pp = ability.pp_max

	# Clear fainted state
	if sprite_data.get("is_fainted") != null:
		sprite_data.is_fainted = false


## ── Internal: Heal Animation ────────────────────────────────────────────────

## Plays a visual heal animation effect. In production this would display
## particle effects and a jingle; here we emit the SFX signal and rely on
## the AudioManager.
func _play_heal_animation() -> void:
	# The actual visual effect would be handled by a dedicated VFX node.
	# For now we trigger the audio and rely on the UI to show feedback.
	EventBus.sfx_requested.emit("heal_start", Vector2.ZERO)


## ── System Lookups ──────────────────────────────────────────────────────────

func _get_transition_system() -> Node:
	var systems := get_tree().get_nodes_in_group("scene_transition")
	if not systems.is_empty():
		return systems[0]
	return get_tree().root.find_child("SceneTransitionSystem", true, false)

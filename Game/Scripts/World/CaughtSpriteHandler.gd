## CaughtSpriteHandler — Processes a successful wild Sprite catch.
## [Progression] Creates a SpriteInstance from wild encounter data, assigns it
## to the player's team or storage, awards catch XP, and registers the form
## in the Sprite registry.
extends Node


## ── Constants ───────────────────────────────────────────────────────────────

## Base XP awarded for catching a Sprite. Scales with the wild Sprite's level.
const CATCH_BASE_XP: int = 30

## Bonus XP multiplier for catching a Sprite of a higher rarity.
const RARITY_XP_MULTIPLIERS: Dictionary = {
	"common": 1.0,
	"uncommon": 1.5,
	"rare": 2.0,
	"legendary": 3.0,
}

## Bonus XP for catching a previously unseen form.
const NEW_DEX_ENTRY_XP_BONUS: int = 50

## Team size limit — must match PlayerData.MAX_TEAM_SIZE.
const MAX_TEAM_SIZE: int = 10


## ── Core Operations ─────────────────────────────────────────────────────────

## Process a freshly caught wild Sprite and integrate it into the player's data.
##
## Parameters:
##   wild_sprite_data — Dictionary describing the wild Sprite:
##     {
##       "race_id": int,
##       "form_id": int,
##       "level": int,
##       "current_hp": int,           — HP at time of capture
##       "max_hp": int,               — max HP for HP percentage preservation
##       "rarity": String,            — "common" / "uncommon" / "rare" / "legendary"
##       "abilities": Array[int],     — known ability IDs
##       "status": String,            — active status (carried over to caught Sprite)
##       "nickname": String,          — optional, defaults to ""
##     }
##   player_data — the player's PlayerData resource
##
## Returns:
##   Dictionary {
##     "sprite_instance": SpriteInstance,  — the newly created instance
##     "added_to": String,                 — "team" or "storage"
##     "xp_awarded": int,                  — total catch XP awarded to party
##     "is_new_entry": bool,               — true if this was a new registry entry
##   }
func process_catch(wild_sprite_data: Dictionary, player_data: Resource) -> Dictionary:
	var result := {
		"sprite_instance": null,
		"added_to": "",
		"xp_awarded": 0,
		"is_new_entry": false,
	}

	# ── Validate input ───────────────────────────────────────────────────
	if wild_sprite_data.is_empty() or player_data == null:
		push_warning("CaughtSpriteHandler: invalid input data.")
		return result

	var race_id: int = int(wild_sprite_data.get("race_id", 0))
	var form_id: int = int(wild_sprite_data.get("form_id", 0))
	var level: int = int(wild_sprite_data.get("level", 1))
	var rarity: String = str(wild_sprite_data.get("rarity", "common"))

	if race_id <= 0 or form_id <= 0:
		push_warning("CaughtSpriteHandler: missing race_id or form_id.")
		return result

	# ── Create the SpriteInstance ────────────────────────────────────────
	var sprite := SpriteInstance.new()
	sprite.instance_id = _generate_instance_id(player_data)
	sprite.race_id = race_id
	sprite.form_id = form_id
	sprite.level = clampi(level, 1, SpriteInstance.MAX_LEVEL)
	sprite.current_xp = 0
	sprite.nickname = str(wild_sprite_data.get("nickname", ""))

	# Preserve the wild Sprite's current HP.
	sprite.current_hp = maxi(1, int(wild_sprite_data.get("current_hp", 1)))

	# Transfer known abilities.
	var wild_abilities: Array = wild_sprite_data.get("abilities", [])
	for ability_id in wild_abilities:
		var aid: int = int(ability_id)
		if aid > 0 and aid not in sprite.learned_abilities:
			sprite.learned_abilities.append(aid)
	# Equip up to MAX_EQUIPPED_ABILITIES from the learned set.
	for i in mini(sprite.learned_abilities.size(), SpriteInstance.MAX_EQUIPPED_ABILITIES):
		sprite.equipped_abilities.append(sprite.learned_abilities[i])

	# Randomize IVs for the newly caught Sprite.
	sprite.randomize_ivs()

	result["sprite_instance"] = sprite

	# ── Add to team or storage ───────────────────────────────────────────
	if player_data.team.size() < MAX_TEAM_SIZE:
		player_data.team.append(sprite)
		result["added_to"] = "team"
	else:
		player_data.storage.append(sprite)
		result["added_to"] = "storage"

	# ── Register in Sprite registry ──────────────────────────────────────
	var previous_status: String = str(player_data.sprite_registry.get(form_id, ""))
	player_data.register_caught(form_id)
	result["is_new_entry"] = previous_status.is_empty()

	# ── Calculate and award catch XP ─────────────────────────────────────
	var xp_amount: int = _calculate_catch_xp(level, rarity, result["is_new_entry"])
	result["xp_awarded"] = xp_amount

	# Distribute catch XP to all non-fainted team members.
	_distribute_catch_xp(player_data, xp_amount)

	# ── Emit signals via EventBus if available ───────────────────────────
	var event_bus := _get_event_bus()
	if event_bus:
		event_bus.catch_succeeded.emit(sprite)

	return result


## ── Internal Helpers ────────────────────────────────────────────────────────

## Calculate XP reward for catching a Sprite.
func _calculate_catch_xp(level: int, rarity: String, is_new_entry: bool) -> int:
	var base_xp: int = CATCH_BASE_XP + level * 3
	var rarity_mult: float = RARITY_XP_MULTIPLIERS.get(rarity, 1.0)
	var total: int = int(float(base_xp) * rarity_mult)
	if is_new_entry:
		total += NEW_DEX_ENTRY_XP_BONUS
	return total


## Distribute catch XP evenly across all non-fainted team members.
func _distribute_catch_xp(player_data: Resource, total_xp: int) -> void:
	var eligible: Array = []
	for sprite in player_data.team:
		if sprite is SpriteInstance and not sprite.is_fainted():
			eligible.append(sprite)

	if eligible.is_empty():
		return

	var share: int = maxi(1, total_xp / eligible.size())
	for sprite: SpriteInstance in eligible:
		sprite.grant_xp(share)


## Generate a unique instance ID by scanning all existing Sprites.
func _generate_instance_id(player_data: Resource) -> int:
	var max_id: int = 0
	for sprite in player_data.team:
		if sprite is SpriteInstance and sprite.instance_id > max_id:
			max_id = sprite.instance_id
	for sprite in player_data.storage:
		if sprite is SpriteInstance and sprite.instance_id > max_id:
			max_id = sprite.instance_id
	return max_id + 1


## Safely access the global EventBus autoload.
func _get_event_bus() -> Node:
	if Engine.has_singleton("EventBus"):
		return Engine.get_singleton("EventBus")
	# Fallback: try the scene tree.
	if is_inside_tree():
		return get_node_or_null("/root/EventBus")
	return null

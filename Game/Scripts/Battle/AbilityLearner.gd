## AbilityLearner — Manages ability learning, slot assignment, and replacement.
## [Progression] Checks which abilities a Sprite can learn at a given level
## from its learnset, handles the 4-slot equip limit, and supports manual
## ability replacement when all slots are full.
class_name AbilityLearner
extends RefCounted


## ── Constants ───────────────────────────────────────────────────────────────

## Maximum number of equipped abilities (must match SpriteInstance).
const MAX_EQUIPPED: int = 4


## ── Core Operations ─────────────────────────────────────────────────────────

## Check which new abilities a Sprite should learn upon reaching a given level.
## Scans the learnset for entries whose learn_level matches exactly or falls
## within a recently-gained range, excluding already-known abilities.
##
## Parameters:
##   sprite    — the SpriteInstance Resource
##   new_level — the level the Sprite just reached
##   learnset  — Array of Dictionaries, each:
##     {
##       "learn_level": int,   — level at which this ability becomes available
##       "ability_id": int,    — the ability to learn
##       "replaces_ability_id": int, — ability to auto-replace (-1 = add without replace)
##     }
##
## Returns:
##   Array of ability_id (int) that the Sprite can learn at this level.
func check_new_abilities(sprite: Resource, new_level: int, learnset: Array) -> Array[int]:
	var new_abilities: Array[int] = []

	if sprite == null or not (sprite is SpriteInstance):
		return new_abilities

	for entry in learnset:
		var learn_level: int = int(entry.get("learn_level", 0))
		var ability_id: int = int(entry.get("ability_id", 0))

		# Only consider abilities unlocked at exactly this level.
		if learn_level != new_level:
			continue

		if ability_id <= 0:
			continue

		# Skip if already known.
		if ability_id in sprite.learned_abilities:
			continue

		new_abilities.append(ability_id)

	return new_abilities


## Attempt to learn a single ability. If there is room in the equipped slots,
## the ability is both learned and auto-equipped. If all slots are full,
## it is still added to learned_abilities but requires manual slot replacement.
##
## Parameters:
##   sprite     — the SpriteInstance Resource
##   ability_id — the ability to learn
##
## Returns:
##   Dictionary {
##     "learned": bool,          — true if the ability was newly learned
##     "slot": int,              — equipped slot index, or -1 if not auto-equipped
##     "requires_replace": bool, — true if all 4 slots are full and user must choose
##   }
func learn_ability(sprite: Resource, ability_id: int) -> Dictionary:
	var result := {
		"learned": false,
		"slot": -1,
		"requires_replace": false,
	}

	if sprite == null or not (sprite is SpriteInstance):
		push_warning("AbilityLearner.learn_ability: invalid sprite.")
		return result

	if ability_id <= 0:
		push_warning("AbilityLearner.learn_ability: invalid ability_id %d." % ability_id)
		return result

	# Already known — no-op.
	if ability_id in sprite.learned_abilities:
		return result

	# Add to the learned set.
	sprite.learned_abilities.append(ability_id)
	result["learned"] = true

	# Try to auto-equip.
	if sprite.equipped_abilities.size() < MAX_EQUIPPED:
		sprite.equipped_abilities.append(ability_id)
		result["slot"] = sprite.equipped_abilities.size() - 1
	else:
		result["requires_replace"] = true

	return result


## Learn an ability with automatic replacement. If the learnset entry specifies
## a replaces_ability_id, and that ability is currently equipped, it is swapped
## out automatically. Otherwise falls back to standard learn_ability behavior.
##
## Parameters:
##   sprite              — the SpriteInstance Resource
##   ability_id          — the ability to learn
##   replaces_ability_id — ability to auto-replace (-1 = no auto-replace)
##
## Returns:
##   Dictionary (same as learn_ability, plus "replaced_ability_id": int or -1)
func learn_ability_with_replace(
	sprite: Resource,
	ability_id: int,
	replaces_ability_id: int,
) -> Dictionary:
	var result := learn_ability(sprite, ability_id)

	# If auto-equip succeeded or learning failed, we are done.
	if not result["learned"] or not result["requires_replace"]:
		result["replaced_ability_id"] = -1
		return result

	# Attempt auto-replacement.
	if replaces_ability_id > 0 and replaces_ability_id in sprite.equipped_abilities:
		var slot_index: int = sprite.equipped_abilities.find(replaces_ability_id)
		if slot_index >= 0:
			sprite.equipped_abilities[slot_index] = ability_id
			result["slot"] = slot_index
			result["requires_replace"] = false
			result["replaced_ability_id"] = replaces_ability_id
			return result

	result["replaced_ability_id"] = -1
	return result


## Replace an equipped ability in a specific slot with a new one.
## The new ability must already be in learned_abilities.
##
## Parameters:
##   sprite         — the SpriteInstance Resource
##   slot_index     — index in equipped_abilities (0-3) to replace
##   new_ability_id — the ability to put in that slot
##
## Returns:
##   true if the replacement succeeded, false otherwise.
func replace_ability(sprite: Resource, slot_index: int, new_ability_id: int) -> bool:
	if sprite == null or not (sprite is SpriteInstance):
		push_warning("AbilityLearner.replace_ability: invalid sprite.")
		return false

	if slot_index < 0 or slot_index >= sprite.equipped_abilities.size():
		push_warning("AbilityLearner.replace_ability: slot_index %d out of range." % slot_index)
		return false

	if new_ability_id <= 0:
		push_warning("AbilityLearner.replace_ability: invalid ability_id %d." % new_ability_id)
		return false

	# The new ability must be in the learned set.
	if new_ability_id not in sprite.learned_abilities:
		push_warning("AbilityLearner.replace_ability: ability %d not in learned set." % new_ability_id)
		return false

	# Don't allow duplicates in the equipped set.
	if new_ability_id in sprite.equipped_abilities:
		push_warning("AbilityLearner.replace_ability: ability %d already equipped." % new_ability_id)
		return false

	sprite.equipped_abilities[slot_index] = new_ability_id
	return true


## ── Batch Processing ────────────────────────────────────────────────────────

## Process all abilities a Sprite should learn for a given level from
## a learnset, applying auto-replacements where specified.
##
## Parameters:
##   sprite    — the SpriteInstance Resource
##   new_level — the level just reached
##   learnset  — Array of learnset entry Dictionaries
##
## Returns:
##   Array of result Dictionaries from learn_ability_with_replace().
func process_level_up_abilities(
	sprite: Resource,
	new_level: int,
	learnset: Array,
) -> Array[Dictionary]:
	var results: Array[Dictionary] = []

	var new_ability_ids := check_new_abilities(sprite, new_level, learnset)

	# Build a lookup for replacement info.
	var replace_map := {}
	for entry in learnset:
		var learn_level: int = int(entry.get("learn_level", 0))
		var ability_id: int = int(entry.get("ability_id", 0))
		var replaces: int = int(entry.get("replaces_ability_id", -1))
		if learn_level == new_level and ability_id > 0:
			replace_map[ability_id] = replaces

	for ability_id: int in new_ability_ids:
		var replaces: int = int(replace_map.get(ability_id, -1))
		var result := learn_ability_with_replace(sprite, ability_id, replaces)
		results.append(result)

	return results


## ── Query Helpers ───────────────────────────────────────────────────────────

## Get all learned but not currently equipped abilities for a Sprite.
func get_unequipped_abilities(sprite: Resource) -> Array[int]:
	var unequipped: Array[int] = []
	if sprite == null or not (sprite is SpriteInstance):
		return unequipped
	for ability_id: int in sprite.learned_abilities:
		if ability_id not in sprite.equipped_abilities:
			unequipped.append(ability_id)
	return unequipped


## Get the total count of learned abilities.
func get_learned_count(sprite: Resource) -> int:
	if sprite == null or not (sprite is SpriteInstance):
		return 0
	return sprite.learned_abilities.size()

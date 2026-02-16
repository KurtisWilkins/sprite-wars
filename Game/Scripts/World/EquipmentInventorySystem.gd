## EquipmentInventorySystem — Manages equipping, unequipping, and comparing gear.
## [Progression] Handles the full lifecycle of equipment on Sprites: validation
## of slot and level requirements, stat change calculation, inventory transfer,
## and side-by-side equipment comparison with synergy awareness.
class_name EquipmentInventorySystem
extends RefCounted


## ── Core Operations ─────────────────────────────────────────────────────────

## Equip an item onto a Sprite. Validates requirements, unequips any existing
## item in that slot (returning it to the player's equipment inventory), and
## applies the new equipment.
##
## Parameters:
##   sprite      — the SpriteInstance Resource to equip
##   equipment   — the EquipmentData Resource to equip
##   player_data — the PlayerData Resource (for inventory management)
##
## Returns:
##   Dictionary {
##     "success": bool,              — whether the equip succeeded
##     "old_item": EquipmentData,    — previously equipped item (null if slot was empty)
##     "stat_changes": Dictionary,   — per-stat { "before": int, "after": int, "diff": int }
##     "error": String,              — error message if failed, "" if success
##   }
func equip_item(
	sprite: Resource,
	equipment: Resource,
	player_data: Resource,
) -> Dictionary:
	var result := {
		"success": false,
		"old_item": null,
		"stat_changes": {},
		"error": "",
	}

	# ── Validation ───────────────────────────────────────────────────────
	if sprite == null or not (sprite is SpriteInstance):
		result["error"] = "Invalid sprite."
		return result

	if equipment == null or not (equipment is EquipmentData):
		result["error"] = "Invalid equipment."
		return result

	if player_data == null or not (player_data is PlayerData):
		result["error"] = "Invalid player data."
		return result

	# Check level requirement.
	if not equipment.can_equip(sprite.level):
		result["error"] = "Sprite level %d is below the level %d requirement." % [
			sprite.level, equipment.level_requirement
		]
		return result

	# Validate slot type.
	var slot: String = equipment.slot_type
	if slot not in SpriteInstance.EQUIPMENT_SLOTS:
		result["error"] = "Invalid equipment slot: %s." % slot
		return result

	# ── Snapshot stats before change ─────────────────────────────────────
	var sprite_elements: Array[String] = _get_sprite_elements(sprite, player_data)
	var sprite_class: String = _get_sprite_class(sprite, player_data)

	var old_equip_list := _resolve_equipment_list(sprite, player_data)
	var stats_before := _calculate_stat_bonuses(old_equip_list, sprite_elements, sprite_class)

	# ── Handle previously equipped item ──────────────────────────────────
	var old_equipment_id: int = int(sprite.equipment.get(slot, -1))
	var old_item: EquipmentData = null

	if old_equipment_id >= 0:
		old_item = _find_equipment_by_id(old_equipment_id, player_data, old_equip_list)
		if old_item != null:
			# Return old item to player inventory.
			player_data.add_equipment(old_item)
		result["old_item"] = old_item

	# ── Equip the new item ───────────────────────────────────────────────
	sprite.equip_item(slot, equipment.equipment_id)

	# Remove the new item from the player's equipment inventory.
	player_data.remove_equipment(equipment.equipment_id)

	# ── Calculate stat changes ───────────────────────────────────────────
	var new_equip_list := _resolve_equipment_list(sprite, player_data)
	var stats_after := _calculate_stat_bonuses(new_equip_list, sprite_elements, sprite_class)

	var stat_changes := {}
	for key in SpriteInstance.STAT_KEYS:
		var before: int = int(stats_before.get(key, 0))
		var after: int = int(stats_after.get(key, 0))
		stat_changes[key] = {
			"before": before,
			"after": after,
			"diff": after - before,
		}

	result["stat_changes"] = stat_changes
	result["success"] = true
	return result


## Unequip an item from a specific slot on a Sprite, returning it to the
## player's equipment inventory.
##
## Parameters:
##   sprite      — the SpriteInstance Resource
##   slot_type   — equipment slot name (e.g. "weapon", "helmet")
##   player_data — the PlayerData Resource
##
## Returns:
##   Dictionary {
##     "success": bool,
##     "removed_item": EquipmentData,  — the item that was unequipped (null if empty)
##     "stat_changes": Dictionary,
##     "error": String,
##   }
func unequip_item(
	sprite: Resource,
	slot_type: String,
	player_data: Resource,
) -> Dictionary:
	var result := {
		"success": false,
		"removed_item": null,
		"stat_changes": {},
		"error": "",
	}

	if sprite == null or not (sprite is SpriteInstance):
		result["error"] = "Invalid sprite."
		return result

	if player_data == null or not (player_data is PlayerData):
		result["error"] = "Invalid player data."
		return result

	if slot_type not in SpriteInstance.EQUIPMENT_SLOTS:
		result["error"] = "Invalid equipment slot: %s." % slot_type
		return result

	var equipped_id: int = int(sprite.equipment.get(slot_type, -1))
	if equipped_id < 0:
		result["error"] = "No equipment in slot '%s'." % slot_type
		return result

	# Snapshot stats before.
	var sprite_elements: Array[String] = _get_sprite_elements(sprite, player_data)
	var sprite_class: String = _get_sprite_class(sprite, player_data)
	var old_equip_list := _resolve_equipment_list(sprite, player_data)
	var stats_before := _calculate_stat_bonuses(old_equip_list, sprite_elements, sprite_class)

	# Find the equipment data and return it to inventory.
	var removed_item: EquipmentData = _find_equipment_by_id(equipped_id, player_data, old_equip_list)
	if removed_item != null:
		player_data.add_equipment(removed_item)
		result["removed_item"] = removed_item

	# Clear the slot.
	sprite.unequip_item(slot_type)

	# Calculate new stats.
	var new_equip_list := _resolve_equipment_list(sprite, player_data)
	var stats_after := _calculate_stat_bonuses(new_equip_list, sprite_elements, sprite_class)

	var stat_changes := {}
	for key in SpriteInstance.STAT_KEYS:
		var before: int = int(stats_before.get(key, 0))
		var after: int = int(stats_after.get(key, 0))
		stat_changes[key] = {
			"before": before,
			"after": after,
			"diff": after - before,
		}

	result["stat_changes"] = stat_changes
	result["success"] = true
	return result


## Get all equipment from the player's inventory that can be equipped in
## a specific slot on a specific Sprite.
##
## Parameters:
##   sprite      — the SpriteInstance Resource
##   slot_type   — equipment slot name
##   player_data — the PlayerData Resource
##
## Returns:
##   Array of EquipmentData that match the slot and meet level requirements.
func get_equippable_items(
	sprite: Resource,
	slot_type: String,
	player_data: Resource,
) -> Array:
	var equippable: Array = []

	if sprite == null or not (sprite is SpriteInstance):
		return equippable

	if player_data == null or not (player_data is PlayerData):
		return equippable

	if slot_type not in SpriteInstance.EQUIPMENT_SLOTS:
		return equippable

	for item in player_data.equipment_inventory:
		if not (item is EquipmentData):
			continue
		if item.slot_type != slot_type:
			continue
		if not item.can_equip(sprite.level):
			continue
		equippable.append(item)

	# Sort by total stat bonus descending for better UX.
	equippable.sort_custom(func(a: EquipmentData, b: EquipmentData) -> bool:
		return _total_stat_value(a) > _total_stat_value(b)
	)

	return equippable


## Compare two equipment pieces, showing stat differences with synergy applied.
##
## Parameters:
##   current   — the currently equipped EquipmentData (can be null)
##   candidate — the EquipmentData being considered
##   sprite_elements — the Sprite's element types
##   sprite_class    — the Sprite's class type
##
## Returns:
##   Dictionary {
##     "stat_diffs": Dictionary,   — per-stat { "current": int, "candidate": int, "diff": int }
##     "current_synergy": bool,    — whether current item has active synergy
##     "candidate_synergy": bool,  — whether candidate item has active synergy
##     "is_upgrade": bool,         — true if total candidate stats > current stats
##     "total_diff": int,          — sum of all stat diffs
##   }
func compare_equipment(
	current: Resource,
	candidate: Resource,
	sprite_elements: Array,
	sprite_class: String,
) -> Dictionary:
	var result := {
		"stat_diffs": {},
		"current_synergy": false,
		"candidate_synergy": false,
		"is_upgrade": false,
		"total_diff": 0,
	}

	# Typed element array for synergy calls.
	var elements: Array[String] = []
	for e in sprite_elements:
		elements.append(str(e))

	# Get effective stat bonuses for current equipment.
	var current_bonuses := {}
	if current != null and current is EquipmentData:
		current_bonuses = current.get_effective_stat_bonuses(elements, sprite_class)
		result["current_synergy"] = _has_active_synergy(current, elements, sprite_class)

	# Get effective stat bonuses for candidate equipment.
	var candidate_bonuses := {}
	if candidate != null and candidate is EquipmentData:
		candidate_bonuses = candidate.get_effective_stat_bonuses(elements, sprite_class)
		result["candidate_synergy"] = _has_active_synergy(candidate, elements, sprite_class)

	# Calculate per-stat differences.
	var total_diff: int = 0
	for key in SpriteInstance.STAT_KEYS:
		var cur_val: int = int(current_bonuses.get(key, 0))
		var cand_val: int = int(candidate_bonuses.get(key, 0))
		var diff: int = cand_val - cur_val
		total_diff += diff

		result["stat_diffs"][key] = {
			"current": cur_val,
			"candidate": cand_val,
			"diff": diff,
		}

	result["total_diff"] = total_diff
	result["is_upgrade"] = total_diff > 0

	return result


## ── Internal Helpers ────────────────────────────────────────────────────────

## Resolve the list of EquipmentData currently equipped on a Sprite.
## Searches the player's equipment_inventory and currently equipped data.
func _resolve_equipment_list(sprite: SpriteInstance, player_data: PlayerData) -> Array:
	var equipped: Array = []
	for slot in SpriteInstance.EQUIPMENT_SLOTS:
		var eid: int = int(sprite.equipment.get(slot, -1))
		if eid < 0:
			continue
		# Search in player_data's equipment_inventory.
		for item in player_data.equipment_inventory:
			if item is EquipmentData and item.equipment_id == eid:
				equipped.append(item)
				break
	return equipped


## Calculate total stat bonuses from an equipment list.
func _calculate_stat_bonuses(
	equipment_list: Array,
	sprite_elements: Array[String],
	sprite_class: String,
) -> Dictionary:
	var totals := {}
	for key in SpriteInstance.STAT_KEYS:
		totals[key] = 0

	for equip in equipment_list:
		if equip is EquipmentData:
			var bonuses: Dictionary = equip.get_effective_stat_bonuses(sprite_elements, sprite_class)
			for key in SpriteInstance.STAT_KEYS:
				totals[key] = int(totals[key]) + int(bonuses.get(key, 0))

	return totals


## Check if an equipment piece has active element or class synergy.
func _has_active_synergy(
	equip: EquipmentData,
	sprite_elements: Array[String],
	sprite_class: String,
) -> bool:
	if not equip.element_synergy.is_empty() and equip.element_synergy in sprite_elements:
		return true
	if not equip.class_synergy.is_empty() and equip.class_synergy == sprite_class:
		return true
	return false


## Get total raw stat value of an equipment piece (for sorting).
func _total_stat_value(equip: EquipmentData) -> int:
	var total: int = 0
	for key in EquipmentData.STAT_KEYS:
		total += absi(int(equip.stat_bonuses.get(key, 0)))
	return total


## Attempt to determine a Sprite's element types from race data.
func _get_sprite_elements(sprite: SpriteInstance, _player_data: PlayerData) -> Array[String]:
	# In the full game, this would look up SpriteRaceData via a database.
	# For now, return an empty array; callers with race_data can provide this.
	return []


## Attempt to determine a Sprite's class type from race data.
func _get_sprite_class(sprite: SpriteInstance, _player_data: PlayerData) -> String:
	# Same as above — would look up from SpriteRaceData in full integration.
	return ""


## Find an EquipmentData by ID from either the player inventory or equipped list.
func _find_equipment_by_id(
	equipment_id: int,
	player_data: PlayerData,
	equipped_list: Array,
) -> EquipmentData:
	# Check the equipped list first (items currently on the Sprite).
	for item in equipped_list:
		if item is EquipmentData and item.equipment_id == equipment_id:
			return item

	# Check the player's unequipped inventory.
	for item in player_data.equipment_inventory:
		if item is EquipmentData and item.equipment_id == equipment_id:
			return item

	return null

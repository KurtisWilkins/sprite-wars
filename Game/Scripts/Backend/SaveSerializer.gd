## SaveSerializer -- Converts live game objects to/from serializable dictionaries.
## [P12-002] Handles SpriteInstance, EquipmentData, QuestData, and the full
## PlayerData resource. Every serialize function produces a plain Dictionary that
## is safe for JSON.stringify(); every deserialize rebuilds the typed Resource.
class_name SaveSerializer
extends RefCounted


## ── Player Data ─────────────────────────────────────────────────────────────────

## Serialize the entire PlayerData resource into a save-ready Dictionary.
## The result conforms to SaveSchema and can be passed directly to SaveManager.
static func serialize_player_data(player_data: Resource) -> Dictionary:
	var data := SaveSchema.create_empty_save()
	data["save_timestamp"] = Time.get_unix_time_from_system()

	# Core fields -- guard against missing properties with safe access.
	data["player_name"] = _safe_get(player_data, "player_name", "")
	data["currency"] = _safe_get(player_data, "currency", 0)
	data["play_time_seconds"] = _safe_get(player_data, "play_time_seconds",
			GameManager.game_time_seconds if Engine.has_singleton("GameManager") or is_instance_valid(GameManager) else 0.0)

	# Team & storage -- arrays of SpriteInstance resources.
	data["team"] = _serialize_sprite_array(_safe_get(player_data, "team", []))
	data["storage"] = _serialize_sprite_array(_safe_get(player_data, "storage", []))

	# Inventory (item_id -> count).
	data["inventory"] = _deep_copy_dict(_safe_get(player_data, "inventory", {}))

	# Equipment inventory -- array of EquipmentData resources.
	var equip_inv: Array = _safe_get(player_data, "equipment_inventory", [])
	var serialized_equip: Array = []
	for equip in equip_inv:
		serialized_equip.append(serialize_equipment(equip))
	data["equipment_inventory"] = serialized_equip

	# Quests.
	data["active_quests"] = _serialize_quest_array(_safe_get(player_data, "active_quests", []))
	data["completed_quest_ids"] = Array(_safe_get(player_data, "completed_quest_ids", []))
	data["completed_temple_ids"] = Array(_safe_get(player_data, "completed_temple_ids", []))

	# Sprite registry.
	data["sprite_registry"] = _deep_copy_dict(_safe_get(player_data, "sprite_registry", {}))

	# Composition bonuses.
	data["unlocked_composition_bonuses"] = Array(_safe_get(player_data, "unlocked_composition_bonuses", []))

	# Current area.
	data["current_area_id"] = _safe_get(player_data, "current_area_id",
			GameManager.current_area_id if is_instance_valid(GameManager) else "starter_town")

	# Settings.
	data["settings"] = _deep_copy_dict(_safe_get(player_data, "settings", {}))

	return data


## Reconstruct a PlayerData resource from a validated save dictionary.
## Returns null if the data is fundamentally broken.
static func deserialize_player_data(data: Dictionary) -> Resource:
	if data.is_empty():
		push_error("SaveSerializer: Cannot deserialize empty dictionary.")
		return null

	var player_data := PlayerData.new()

	player_data.player_name = str(data.get("player_name", ""))
	player_data.currency = int(data.get("currency", 0))
	player_data.play_time_seconds = float(data.get("play_time_seconds", 0.0))

	# Team.
	var team_array: Array = data.get("team", [])
	var team: Array = []
	for sprite_dict in team_array:
		var sprite := deserialize_sprite_instance(sprite_dict)
		if sprite:
			team.append(sprite)
	player_data.team = team

	# Storage.
	var storage_array: Array = data.get("storage", [])
	var storage: Array = []
	for sprite_dict in storage_array:
		var sprite := deserialize_sprite_instance(sprite_dict)
		if sprite:
			storage.append(sprite)
	player_data.storage = storage

	# Inventory.
	player_data.inventory = _deep_copy_dict(data.get("inventory", {}))

	# Equipment inventory.
	var equip_array: Array = data.get("equipment_inventory", [])
	var equip_inv: Array = []
	for equip_dict in equip_array:
		var equip := deserialize_equipment(equip_dict)
		if equip:
			equip_inv.append(equip)
	player_data.equipment_inventory = equip_inv

	# Quests.
	var quest_array: Array = data.get("active_quests", [])
	var quests: Array = []
	for quest_dict in quest_array:
		var quest := _deserialize_quest_state(quest_dict)
		if quest:
			quests.append(quest)
	player_data.active_quests = quests

	player_data.completed_quest_ids = _to_int_array(data.get("completed_quest_ids", []))
	player_data.completed_temple_ids = _to_int_array(data.get("completed_temple_ids", []))

	# Sprite registry.
	player_data.sprite_registry = _deep_copy_dict(data.get("sprite_registry", {}))

	# Composition bonuses.
	player_data.unlocked_composition_bonuses = _to_int_array(data.get("unlocked_composition_bonuses", []))

	# Area.
	player_data.current_area_id = str(data.get("current_area_id", "starter_town"))

	# Settings.
	player_data.settings = _deep_copy_dict(data.get("settings", {}))

	return player_data


## ── Sprite Instance ─────────────────────────────────────────────────────────────

## Serialize a SpriteInstance resource to a plain Dictionary.
static func serialize_sprite_instance(sprite: Resource) -> Dictionary:
	if sprite == null:
		push_warning("SaveSerializer: Attempted to serialize null SpriteInstance.")
		return {}

	return {
		"instance_id": int(_safe_get(sprite, "instance_id", 0)),
		"race_id": int(_safe_get(sprite, "race_id", 0)),
		"form_id": int(_safe_get(sprite, "form_id", 0)),
		"nickname": str(_safe_get(sprite, "nickname", "")),
		"level": int(_safe_get(sprite, "level", 1)),
		"current_xp": int(_safe_get(sprite, "current_xp", 0)),
		"current_hp": int(_safe_get(sprite, "current_hp", 0)),
		"equipped_abilities": Array(_safe_get(sprite, "equipped_abilities", [])),
		"learned_abilities": Array(_safe_get(sprite, "learned_abilities", [])),
		"equipment": _deep_copy_dict(_safe_get(sprite, "equipment", {})),
		"iv_stats": _deep_copy_dict(_safe_get(sprite, "iv_stats", {})),
	}


## Reconstruct a SpriteInstance resource from a Dictionary.
static func deserialize_sprite_instance(data: Dictionary) -> Resource:
	if data.is_empty():
		push_warning("SaveSerializer: Cannot deserialize empty sprite dictionary.")
		return null

	var sprite := SpriteInstance.new()
	sprite.instance_id = int(data.get("instance_id", 0))
	sprite.race_id = int(data.get("race_id", 0))
	sprite.form_id = int(data.get("form_id", 0))
	sprite.nickname = str(data.get("nickname", ""))
	sprite.level = clampi(int(data.get("level", 1)), 1, SpriteInstance.MAX_LEVEL)
	sprite.current_xp = maxi(0, int(data.get("current_xp", 0)))
	sprite.current_hp = maxi(0, int(data.get("current_hp", 0)))

	# Abilities.
	sprite.equipped_abilities = _to_int_array(data.get("equipped_abilities", []))
	sprite.learned_abilities = _to_int_array(data.get("learned_abilities", []))

	# Equipment slots.
	var equip_data: Dictionary = data.get("equipment", {})
	for slot in SpriteInstance.EQUIPMENT_SLOTS:
		sprite.equipment[slot] = int(equip_data.get(slot, -1))

	# IVs.
	var iv_data: Dictionary = data.get("iv_stats", {})
	for stat_key in SpriteInstance.STAT_KEYS:
		sprite.iv_stats[stat_key] = clampi(int(iv_data.get(stat_key, 0)), 0, SpriteInstance.MAX_IV)

	return sprite


## ── Equipment ───────────────────────────────────────────────────────────────────

## Serialize an EquipmentData resource to a plain Dictionary.
static func serialize_equipment(equip: Resource) -> Dictionary:
	if equip == null:
		push_warning("SaveSerializer: Attempted to serialize null EquipmentData.")
		return {}

	return {
		"equipment_id": int(_safe_get(equip, "equipment_id", 0)),
		"equipment_name": str(_safe_get(equip, "equipment_name", "")),
		"slot_type": str(_safe_get(equip, "slot_type", "weapon")),
		"rarity": str(_safe_get(equip, "rarity", "common")),
		"stat_bonuses": _deep_copy_dict(_safe_get(equip, "stat_bonuses", {})),
		"element_synergy": str(_safe_get(equip, "element_synergy", "")),
		"element_synergy_multiplier": float(_safe_get(equip, "element_synergy_multiplier", 1.0)),
		"class_synergy": str(_safe_get(equip, "class_synergy", "")),
		"class_synergy_multiplier": float(_safe_get(equip, "class_synergy_multiplier", 1.0)),
		"level_requirement": int(_safe_get(equip, "level_requirement", 1)),
		"description": str(_safe_get(equip, "description", "")),
		"icon_path": str(_safe_get(equip, "icon_path", "")),
		"source": str(_safe_get(equip, "source", "shop")),
	}


## Reconstruct an EquipmentData resource from a Dictionary.
static func deserialize_equipment(data: Dictionary) -> Resource:
	if data.is_empty():
		push_warning("SaveSerializer: Cannot deserialize empty equipment dictionary.")
		return null

	var equip := EquipmentData.new()
	equip.equipment_id = int(data.get("equipment_id", 0))
	equip.equipment_name = str(data.get("equipment_name", ""))
	equip.slot_type = str(data.get("slot_type", "weapon"))
	equip.rarity = str(data.get("rarity", "common"))
	equip.element_synergy = str(data.get("element_synergy", ""))
	equip.element_synergy_multiplier = float(data.get("element_synergy_multiplier", 1.0))
	equip.class_synergy = str(data.get("class_synergy", ""))
	equip.class_synergy_multiplier = float(data.get("class_synergy_multiplier", 1.0))
	equip.level_requirement = int(data.get("level_requirement", 1))
	equip.description = str(data.get("description", ""))
	equip.icon_path = str(data.get("icon_path", ""))
	equip.source = str(data.get("source", "shop"))

	# Stat bonuses.
	var bonus_data: Dictionary = data.get("stat_bonuses", {})
	for key in EquipmentData.STAT_KEYS:
		equip.stat_bonuses[key] = int(bonus_data.get(key, 0))

	return equip


## ── Private Helpers ─────────────────────────────────────────────────────────────

static func _serialize_sprite_array(sprites: Array) -> Array:
	var result: Array = []
	for sprite in sprites:
		if sprite != null:
			result.append(serialize_sprite_instance(sprite))
	return result


static func _serialize_quest_array(quests: Array) -> Array:
	var result: Array = []
	for quest in quests:
		if quest != null:
			result.append(_serialize_quest_state(quest))
	return result


## Serialize a QuestData resource into a lightweight state dict (not the full
## definition, which lives in data files -- we only persist runtime state).
static func _serialize_quest_state(quest: Resource) -> Dictionary:
	if quest == null:
		return {}

	var objectives_state: Array = []
	var raw_objectives: Array = _safe_get(quest, "objectives", [])
	for obj in raw_objectives:
		if obj is Dictionary:
			objectives_state.append({
				"type": str(obj.get("type", "")),
				"target": obj.get("target", ""),
				"count": int(obj.get("count", 1)),
				"completed": bool(obj.get("completed", false)),
				"_progress": int(obj.get("_progress", 0)),
			})

	return {
		"quest_id": int(_safe_get(quest, "quest_id", 0)),
		"quest_type": str(_safe_get(quest, "quest_type", "side")),
		"quest_state": str(_safe_get(quest, "quest_state", "active")),
		"objectives": objectives_state,
	}


## Reconstruct a QuestData from a state dict. Full quest definitions (title,
## description, rewards) are expected to be re-loaded from data files; here we
## only restore the mutable runtime state.
static func _deserialize_quest_state(data: Dictionary) -> Resource:
	if data.is_empty():
		return null

	var quest := QuestData.new()
	quest.quest_id = int(data.get("quest_id", 0))
	quest.quest_type = str(data.get("quest_type", "side"))
	quest.quest_state = str(data.get("quest_state", "active"))

	var objectives_data: Array = data.get("objectives", [])
	var objectives: Array[Dictionary] = []
	for obj_dict in objectives_data:
		if obj_dict is Dictionary:
			objectives.append({
				"type": str(obj_dict.get("type", "")),
				"target": obj_dict.get("target", ""),
				"count": int(obj_dict.get("count", 1)),
				"description": str(obj_dict.get("description", "")),
				"completed": bool(obj_dict.get("completed", false)),
				"_progress": int(obj_dict.get("_progress", 0)),
			})
	quest.objectives = objectives

	return quest


## Safely access a property on a Resource without crashing if it doesn't exist.
static func _safe_get(obj: Resource, property: String, default_value: Variant) -> Variant:
	if obj == null:
		return default_value
	if property in obj:
		return obj.get(property)
	return default_value


## Deep-copy a dictionary (JSON-safe values only).
static func _deep_copy_dict(source: Dictionary) -> Dictionary:
	var copy := {}
	for key in source:
		var val = source[key]
		if val is Dictionary:
			copy[key] = _deep_copy_dict(val)
		elif val is Array:
			copy[key] = _deep_copy_array(val)
		else:
			copy[key] = val
	return copy


static func _deep_copy_array(source: Array) -> Array:
	var copy: Array = []
	for item in source:
		if item is Dictionary:
			copy.append(_deep_copy_dict(item))
		elif item is Array:
			copy.append(_deep_copy_array(item))
		else:
			copy.append(item)
	return copy


## Convert a mixed array to Array[int], handling float-to-int coercion.
static func _to_int_array(source: Array) -> Array[int]:
	var result: Array[int] = []
	for item in source:
		result.append(int(item))
	return result

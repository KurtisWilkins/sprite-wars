## QuestRewardDistributor — Processes quest rewards and distributes them
## to the player's data. Handles XP distribution to the active team,
## item grants, currency, and feature/area unlocks.
class_name QuestRewardDistributor
extends RefCounted

## ── Constants ────────────────────────────────────────────────────────────────

## Minimum XP each team member receives (prevents zero-XP edge cases).
const MIN_XP_PER_SPRITE: int = 1


## ── Public API ──────────────────────────────────────────────────────────────

## Process a quest's rewards dictionary and apply them to the player's data.
## Returns a summary dictionary describing everything that was granted:
## {
##   xp_distributed: Array[Dictionary] — [{instance_id, xp_gained, levels_gained}],
##   items_granted: Array[Dictionary] — [{item_id, count}],
##   currency_granted: int,
##   unlocks_granted: Array[String],
##   equipment_granted: Array[Dictionary],
## }
static func distribute_rewards(quest_rewards: Dictionary, player_data: PlayerData) -> Dictionary:
	var summary: Dictionary = {
		"xp_distributed": [],
		"items_granted": [],
		"currency_granted": 0,
		"unlocks_granted": [],
		"equipment_granted": [],
	}

	if not player_data:
		push_warning("QuestRewardDistributor: player_data is null.")
		return summary

	# ── XP Distribution ──────────────────────────────────────────────────
	var total_xp: int = int(quest_rewards.get("xp", 0))
	if total_xp > 0:
		summary["xp_distributed"] = _distribute_xp(total_xp, player_data)

	# ── Item Grants ──────────────────────────────────────────────────────
	var items: Array = quest_rewards.get("items", [])
	for item_entry in items:
		var item_id: int = int(item_entry.get("item_id", 0))
		var count: int = int(item_entry.get("count", 1))
		if item_id > 0 and count > 0:
			player_data.add_item(item_id, count)
			summary["items_granted"].append({"item_id": item_id, "count": count})

	# ── Currency ─────────────────────────────────────────────────────────
	var currency: int = int(quest_rewards.get("currency", 0))
	if currency > 0:
		player_data.add_currency(currency)
		summary["currency_granted"] = currency

	# ── Unlocks (areas, bonuses, features) ──────────────────────────────
	var unlocks: Array = quest_rewards.get("unlocks", [])
	for unlock_key in unlocks:
		var key_str: String = str(unlock_key)
		if not key_str.is_empty():
			_process_unlock(key_str, player_data)
			summary["unlocks_granted"].append(key_str)

	# ── Equipment Grants ────────────────────────────────────────────────
	var equipment: Array = quest_rewards.get("equipment", [])
	for equip_entry in equipment:
		summary["equipment_granted"].append(equip_entry)

	return summary


## Emit notification signals to inform the UI about rewards.
## Call this after distribute_rewards() to show the reward summary screen.
static func show_reward_summary(rewards_summary: Dictionary) -> void:
	# XP gains.
	var xp_entries: Array = rewards_summary.get("xp_distributed", [])
	for entry: Dictionary in xp_entries:
		var levels: int = int(entry.get("levels_gained", 0))
		if levels > 0:
			EventBus.notification_requested.emit(
				"Level up! +%d levels" % levels, "level_up"
			)

	# Items.
	var items: Array = rewards_summary.get("items_granted", [])
	for item_entry: Dictionary in items:
		EventBus.notification_requested.emit(
			"Received Item #%d x%d" % [
				int(item_entry.get("item_id", 0)),
				int(item_entry.get("count", 0)),
			],
			"item"
		)

	# Currency.
	var currency: int = int(rewards_summary.get("currency_granted", 0))
	if currency > 0:
		EventBus.notification_requested.emit(
			"Received %d currency" % currency, "currency"
		)

	# Unlocks.
	var unlocks: Array = rewards_summary.get("unlocks_granted", [])
	for unlock_key: String in unlocks:
		EventBus.notification_requested.emit(
			"Unlocked: %s" % unlock_key.replace("_", " ").capitalize(),
			"unlock"
		)

	# Equipment.
	var equipment: Array = rewards_summary.get("equipment_granted", [])
	for equip_entry: Dictionary in equipment:
		var equip_name: String = str(equip_entry.get("equipment_name", "Equipment"))
		EventBus.notification_requested.emit(
			"Received: %s" % equip_name, "equipment"
		)


## ── Private Helpers ─────────────────────────────────────────────────────────

## Distribute XP evenly across the player's active team.
## Returns an array of {instance_id, xp_gained, levels_gained} entries.
static func _distribute_xp(total_xp: int, player_data: PlayerData) -> Array:
	var result: Array = []
	var team: Array = player_data.team
	if team.is_empty():
		return result

	var xp_per_sprite: int = maxi(MIN_XP_PER_SPRITE, total_xp / team.size())

	for sprite in team:
		if not (sprite is SpriteInstance):
			continue
		var instance: SpriteInstance = sprite as SpriteInstance
		var levels_gained: int = instance.grant_xp(xp_per_sprite)
		result.append({
			"instance_id": instance.instance_id,
			"xp_gained": xp_per_sprite,
			"levels_gained": levels_gained,
		})

		# Emit progression signals.
		if xp_per_sprite > 0:
			EventBus.xp_gained.emit(instance, xp_per_sprite)
		if levels_gained > 0:
			EventBus.level_up.emit(instance, instance.level)

	return result


## Process a single unlock key. This handles area unlocks, composition bonus
## unlocks, and generic feature flags.
static func _process_unlock(unlock_key: String, player_data: PlayerData) -> void:
	# Composition bonus unlocks are formatted as "bonus_<id>".
	if unlock_key.begins_with("bonus_"):
		var bonus_id_str: String = unlock_key.substr(6)
		if bonus_id_str.is_valid_int():
			var bonus_id: int = bonus_id_str.to_int()
			if bonus_id not in player_data.unlocked_composition_bonuses:
				player_data.unlocked_composition_bonuses.append(bonus_id)

	# Area unlocks and other feature flags can be handled by extending
	# PlayerData with a generic unlocks set, or by emitting to a system
	# that manages world state. For now we emit a notification.
	# Future: player_data.unlocked_features.append(unlock_key)

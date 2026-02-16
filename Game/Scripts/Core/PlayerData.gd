## PlayerData — Central resource holding all persistent player state.
## [P1-001 Player] Aggregates the player's team, storage, inventory, equipment,
## currency, quest progress, temple completions, Sprite registry, and play time.
## This is the root object serialized by the save system.
class_name PlayerData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

@export var player_name: String = ""

## ── Team & Storage ────────────────────────────────────────────────────────────

## The active battle team (max 10 SpriteInstances).
@export var team: Array = []  # Array of SpriteInstance

## Long-term Sprite storage (no hard cap, but UI paginates).
@export var storage: Array = []  # Array of SpriteInstance

## ── Inventory ─────────────────────────────────────────────────────────────────

## Consumable/key items. Maps item_id (int) → count (int).
@export var inventory: Dictionary = {}

## Owned equipment pieces (not currently equipped on any Sprite).
@export var equipment_inventory: Array = []  # Array of EquipmentData

## ── Currency ──────────────────────────────────────────────────────────────────

@export var currency: int = 0

## ── Quest Progress ────────────────────────────────────────────────────────────

## IDs of quests that have been fully completed and rewards claimed.
@export var completed_quest_ids: Array[int] = []

## Quests currently in the "active" state. Each entry is a serialized snapshot
## of the QuestData with runtime progress (objectives, _progress counters).
@export var active_quests: Array[Dictionary] = []

## ── Temple Progress ───────────────────────────────────────────────────────────

## Temple IDs the player has cleared at least once.
@export var completed_temple_ids: Array[int] = []

## ── Sprite Registry (Pokedex equivalent) ──────────────────────────────────────

## Maps form_id (int) → status String: "seen" or "caught".
## Missing keys mean the form has never been encountered.
@export var sprite_registry: Dictionary = {}

## ── Composition Bonuses ───────────────────────────────────────────────────────

## IDs of CompositionBonusData that the player has unlocked.
@export var unlocked_composition_bonuses: Array[int] = []

## ── Play Time ─────────────────────────────────────────────────────────────────

## Total seconds of active play. Updated by GameManager._process().
@export var play_time_seconds: float = 0.0

## ── Location ──────────────────────────────────────────────────────────────────

## The area/scene the player is currently in (e.g. "starter_town", "temple_03_area_2").
@export var current_area_id: String = ""


## ── Constants ─────────────────────────────────────────────────────────────────

const MAX_TEAM_SIZE: int = 10
const STARTER_RACE_IDS: Array[int] = [1, 2, 3]  # Fire, Water, Nature starters
const STARTER_LEVEL: int = 5
const STARTER_CURRENCY: int = 500
const STARTER_FORM_STAGE: int = 1  # Base form


## ── Initialization ────────────────────────────────────────────────────────────

## Set up a brand-new game with a starter Sprite, initial currency, and defaults.
## This is called when the player starts a new save file.
## [starter_choice] is 0, 1, or 2 indexing into STARTER_RACE_IDS.
func initialize_starter(starter_choice: int = 0) -> void:
	# Reset all state.
	player_name = ""
	team.clear()
	storage.clear()
	inventory.clear()
	equipment_inventory.clear()
	completed_quest_ids.clear()
	active_quests.clear()
	completed_temple_ids.clear()
	sprite_registry.clear()
	unlocked_composition_bonuses.clear()
	play_time_seconds = 0.0
	current_area_id = "starter_town"

	# Grant starting currency.
	currency = STARTER_CURRENCY

	# Create the starter Sprite instance.
	var starter := SpriteInstance.new()
	starter.instance_id = _generate_instance_id()
	var race_index: int = clampi(starter_choice, 0, STARTER_RACE_IDS.size() - 1)
	starter.race_id = STARTER_RACE_IDS[race_index]
	# Form ID for stage 1 of this race. Convention: (race_id - 1) * 3 + stage_number
	starter.form_id = (starter.race_id - 1) * 3 + STARTER_FORM_STAGE
	starter.level = STARTER_LEVEL
	starter.current_xp = 0
	starter.randomize_ivs()

	# Register the starter in the Sprite registry.
	sprite_registry[starter.form_id] = "caught"

	# Add to team.
	team.append(starter)


## ── Team Management ───────────────────────────────────────────────────────────

## Add a SpriteInstance to the team. Returns true if added, false if team is full.
func add_to_team(sprite: SpriteInstance) -> bool:
	if team.size() >= MAX_TEAM_SIZE:
		return false
	team.append(sprite)
	return true


## Move a Sprite from the team to storage by instance_id. Returns true on success.
func move_to_storage(instance_id: int) -> bool:
	for i in team.size():
		if team[i].instance_id == instance_id:
			var sprite = team[i]
			team.remove_at(i)
			storage.append(sprite)
			return true
	return false


## Move a Sprite from storage to the team by instance_id. Returns true on success.
func move_to_team(instance_id: int) -> bool:
	if team.size() >= MAX_TEAM_SIZE:
		return false
	for i in storage.size():
		if storage[i].instance_id == instance_id:
			var sprite = storage[i]
			storage.remove_at(i)
			team.append(sprite)
			return true
	return false


## Find a SpriteInstance by instance_id across team and storage.
func find_sprite(instance_id: int) -> SpriteInstance:
	for sprite in team:
		if sprite.instance_id == instance_id:
			return sprite
	for sprite in storage:
		if sprite.instance_id == instance_id:
			return sprite
	return null


## ── Inventory Helpers ─────────────────────────────────────────────────────────

## Add an item to the consumable/key item inventory.
func add_item(item_id: int, count: int = 1) -> void:
	inventory[item_id] = int(inventory.get(item_id, 0)) + count


## Remove an item from inventory. Returns true if the item was available and removed.
func remove_item(item_id: int, count: int = 1) -> bool:
	var current: int = int(inventory.get(item_id, 0))
	if current < count:
		return false
	current -= count
	if current <= 0:
		inventory.erase(item_id)
	else:
		inventory[item_id] = current
	return true


## Get the count of an item in inventory.
func get_item_count(item_id: int) -> int:
	return int(inventory.get(item_id, 0))


## ── Equipment Inventory ───────────────────────────────────────────────────────

## Add an EquipmentData to the unequipped equipment pool.
func add_equipment(equip: EquipmentData) -> void:
	equipment_inventory.append(equip)


## Remove an EquipmentData by equipment_id. Returns true if found and removed.
func remove_equipment(equipment_id: int) -> bool:
	for i in equipment_inventory.size():
		if equipment_inventory[i].equipment_id == equipment_id:
			equipment_inventory.remove_at(i)
			return true
	return false


## ── Currency ──────────────────────────────────────────────────────────────────

## Add currency. Clamps to non-negative.
func add_currency(amount: int) -> void:
	currency = maxi(0, currency + amount)


## Spend currency. Returns true if the player had enough.
func spend_currency(amount: int) -> bool:
	if currency < amount:
		return false
	currency -= amount
	return true


## ── Sprite Registry ───────────────────────────────────────────────────────────

## Register a form as "seen" (if not already caught).
func register_seen(form_id: int) -> void:
	if not sprite_registry.has(form_id):
		sprite_registry[form_id] = "seen"


## Register a form as "caught" (upgrades from "seen").
func register_caught(form_id: int) -> void:
	sprite_registry[form_id] = "caught"


## Get registry status for a form_id: "seen", "caught", or "" (unknown).
func get_registry_status(form_id: int) -> String:
	return str(sprite_registry.get(form_id, ""))


## Count total seen (including caught).
func get_seen_count() -> int:
	return sprite_registry.size()


## Count total caught.
func get_caught_count() -> int:
	var count := 0
	for form_id in sprite_registry:
		if sprite_registry[form_id] == "caught":
			count += 1
	return count


## ── Quest Helpers ─────────────────────────────────────────────────────────────

## Whether a given quest has been completed.
func is_quest_completed(quest_id: int) -> bool:
	return quest_id in completed_quest_ids


## Mark a quest as completed (add to completed_quest_ids, remove from active).
func complete_quest(quest_id: int) -> void:
	if quest_id not in completed_quest_ids:
		completed_quest_ids.append(quest_id)
	# Remove from active_quests.
	for i in range(active_quests.size() - 1, -1, -1):
		if int(active_quests[i].get("quest_id", -1)) == quest_id:
			active_quests.remove_at(i)


## ── Temple Helpers ────────────────────────────────────────────────────────────

## Whether a temple has been completed.
func is_temple_completed(temple_id: int) -> bool:
	return temple_id in completed_temple_ids


## Mark a temple as completed.
func complete_temple(temple_id: int) -> void:
	if temple_id not in completed_temple_ids:
		completed_temple_ids.append(temple_id)


## ── Utility ───────────────────────────────────────────────────────────────────

## Generate a unique instance ID based on the current team + storage count.
## In production this would use a persistent auto-increment counter.
func _generate_instance_id() -> int:
	var max_id: int = 0
	for sprite in team:
		if sprite.instance_id > max_id:
			max_id = sprite.instance_id
	for sprite in storage:
		if sprite.instance_id > max_id:
			max_id = sprite.instance_id
	return max_id + 1


## Get all owned Sprites (team + storage).
func get_all_sprites() -> Array:
	return team + storage


## Get formatted play time string (HH:MM:SS).
func get_formatted_play_time() -> String:
	var total_secs: int = int(play_time_seconds)
	var hours: int = total_secs / 3600
	var minutes: int = (total_secs % 3600) / 60
	var seconds: int = total_secs % 60
	return "%02d:%02d:%02d" % [hours, minutes, seconds]


## ── Validation ────────────────────────────────────────────────────────────────

func validate() -> Array[String]:
	var errors: Array[String] = []
	if team.size() > MAX_TEAM_SIZE:
		errors.append("team exceeds MAX_TEAM_SIZE (%d)." % MAX_TEAM_SIZE)
	if currency < 0:
		errors.append("currency cannot be negative.")
	if play_time_seconds < 0.0:
		errors.append("play_time_seconds cannot be negative.")
	for i in team.size():
		if not (team[i] is SpriteInstance):
			errors.append("team[%d] is not a SpriteInstance." % i)
	for i in storage.size():
		if not (storage[i] is SpriteInstance):
			errors.append("storage[%d] is not a SpriteInstance." % i)
	for form_id in sprite_registry:
		var status: String = str(sprite_registry[form_id])
		if status not in ["seen", "caught"]:
			errors.append("sprite_registry[%s] has invalid status '%s'." % [str(form_id), status])
	return errors

## TrainerBattleSystem — Orchestrates the full trainer encounter sequence:
## detection, exclamation animation, NPC approach, pre-battle dialogue,
## battle transition, post-battle dialogue, and defeat tracking.
## [P5-010] Bridges NPC/trainer logic with the battle system.
extends Node

## ── Trainer Data ────────────────────────────────────────────────────────────

## Pre-loaded trainer team data keyed by npc_id.
## Each entry: Array[Dictionary] of Sprite definitions
##   {race_id: int, level: int, nickname: String, ability_ids: Array[int]}
var trainer_teams: Dictionary = {}  # {String: Array[Dictionary]}

## Trainer reward data keyed by npc_id.
## {currency: int, items: Array[{item_id: int, count: int}], badge_id: String}
var trainer_rewards: Dictionary = {}  # {String: Dictionary}

## Pre-battle dialogue overrides keyed by npc_id (optional).
var trainer_pre_dialogue: Dictionary = {}  # {String: Array[Dictionary]}

## Post-battle dialogue (victory) keyed by npc_id.
var trainer_post_dialogue: Dictionary = {}  # {String: Array[Dictionary]}

## Post-battle dialogue (defeat) keyed by npc_id.
var trainer_defeat_dialogue: Dictionary = {}  # {String: Array[Dictionary]}

## Set of npc_ids that have been defeated this session.
var _defeated_trainers: Dictionary = {}  # {String: bool}

## ── Signals ─────────────────────────────────────────────────────────────────

signal trainer_encounter_started(npc_id: String)
signal trainer_encounter_ended(npc_id: String, player_won: bool)
signal trainer_rewards_granted(npc_id: String, rewards: Dictionary)


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	add_to_group("trainer_battle_system")
	EventBus.battle_ended.connect(_on_battle_ended)


## ── Public API ──────────────────────────────────────────────────────────────

## Initiates the full trainer encounter sequence.
## Called by the NPCController when a trainer spots the player or when the
## player interacts with an undefeated trainer.
func start_trainer_encounter(npc: Node, player: Node) -> void:
	var npc_id: String = npc.get("npc_id") if npc.get("npc_id") != null else ""
	if npc_id.is_empty():
		push_warning("TrainerBattleSystem: NPC has no npc_id")
		return

	# Don't re-battle defeated trainers
	if is_trainer_defeated(npc_id):
		_show_post_defeat_dialogue(npc, player)
		return

	trainer_encounter_started.emit(npc_id)

	# Freeze the player
	if player.has_method("freeze"):
		player.freeze()

	# Pre-battle dialogue
	var pre_dialogue: Array[Dictionary] = _get_pre_dialogue(npc)
	if not pre_dialogue.is_empty():
		var dialogue_system := _get_dialogue_system()
		if dialogue_system:
			dialogue_system.start_dialogue(pre_dialogue)
			await dialogue_system.dialogue_ended

	# Build battle data
	var team: Array[Dictionary] = get_trainer_team(npc_id)
	if team.is_empty():
		push_warning("TrainerBattleSystem: No team data for trainer '%s'" % npc_id)
		if player.has_method("unfreeze"):
			player.unfreeze()
		return

	var battle_data: Dictionary = {
		"battle_type": "trainer",
		"trainer_npc_id": npc_id,
		"trainer_name": npc.get("npc_name") if npc.get("npc_name") != null else "Trainer",
		"enemy_team": team,
		"can_flee": false,
		"can_catch": false,
		"background": _get_battle_background(),
		"rewards": get_trainer_rewards(npc_id),
	}

	# Transition to battle
	var transition_system := _get_transition_system()
	if transition_system:
		transition_system.transition_to_battle(battle_data)
	else:
		# Fallback: directly invoke GameManager
		GameManager.transition_to_battle(battle_data)


## Returns the trainer's Sprite team for battle.
func get_trainer_team(npc_id: String) -> Array[Dictionary]:
	if trainer_teams.has(npc_id):
		return trainer_teams[npc_id]

	# Fallback: generate a default team based on area level
	return _generate_default_team(npc_id)


## Returns the reward data for defeating a trainer.
func get_trainer_rewards(npc_id: String) -> Dictionary:
	if trainer_rewards.has(npc_id):
		return trainer_rewards[npc_id]

	# Default rewards
	return {
		"currency": 100,
		"items": [],
		"badge_id": "",
	}


## Registers trainer data from external sources (data files, map loading, etc.).
func register_trainer(
	npc_id: String,
	team: Array[Dictionary],
	rewards: Dictionary = {},
	pre_dialogue: Array[Dictionary] = [],
	post_dialogue: Array[Dictionary] = [],
	defeat_dialogue: Array[Dictionary] = [],
) -> void:
	trainer_teams[npc_id] = team
	if not rewards.is_empty():
		trainer_rewards[npc_id] = rewards
	if not pre_dialogue.is_empty():
		trainer_pre_dialogue[npc_id] = pre_dialogue
	if not post_dialogue.is_empty():
		trainer_post_dialogue[npc_id] = post_dialogue
	if not defeat_dialogue.is_empty():
		trainer_defeat_dialogue[npc_id] = defeat_dialogue


## Checks whether a trainer has been defeated.
func is_trainer_defeated(npc_id: String) -> bool:
	return _defeated_trainers.get(npc_id, false)


## Marks a trainer as defeated. Called internally after battle victory.
func mark_trainer_defeated(npc_id: String) -> void:
	_defeated_trainers[npc_id] = true


## Loads defeated trainer state from save data.
func load_defeated_state(defeated_ids: Array) -> void:
	_defeated_trainers.clear()
	for id in defeated_ids:
		_defeated_trainers[str(id)] = true


## Returns all defeated trainer IDs for saving.
func get_defeated_trainer_ids() -> Array[String]:
	var ids: Array[String] = []
	for id: String in _defeated_trainers:
		if _defeated_trainers[id]:
			ids.append(id)
	return ids


## ── Battle Result Handling ──────────────────────────────────────────────────

## Connected to EventBus.battle_ended to handle post-battle logic for trainers.
func _on_battle_ended(result: Dictionary) -> void:
	if result.get("battle_type", "") != "trainer":
		return

	var npc_id: String = result.get("trainer_npc_id", "")
	if npc_id.is_empty():
		return

	var player_won: bool = result.get("player_won", false)

	if player_won:
		mark_trainer_defeated(npc_id)

		# Mark the NPC as defeated
		var npc := _find_npc_by_id(npc_id)
		if npc:
			npc.set("is_defeated", true)

		# Grant rewards
		var rewards: Dictionary = get_trainer_rewards(npc_id)
		_grant_rewards(rewards)
		trainer_rewards_granted.emit(npc_id, rewards)

		# Post-victory dialogue
		_show_post_victory_dialogue(npc_id)
	else:
		# Player lost -- typically respawn at last save point
		pass

	trainer_encounter_ended.emit(npc_id, player_won)

	# Unfreeze the player after returning from battle
	var player := _get_player()
	if player and player.has_method("unfreeze"):
		player.unfreeze()


## ── Reward Granting ─────────────────────────────────────────────────────────

func _grant_rewards(rewards: Dictionary) -> void:
	var currency: int = rewards.get("currency", 0)
	if currency > 0:
		EventBus.currency_changed.emit(currency)

	var items: Array = rewards.get("items", [])
	for item_entry: Dictionary in items:
		var item_id: int = item_entry.get("item_id", 0)
		var count: int = item_entry.get("count", 1)
		if item_id > 0:
			EventBus.item_acquired.emit(null, count)


## ── Dialogue Helpers ────────────────────────────────────────────────────────

func _get_pre_dialogue(npc: Node) -> Array[Dictionary]:
	var npc_id: String = npc.get("npc_id") if npc.get("npc_id") != null else ""
	if trainer_pre_dialogue.has(npc_id):
		return trainer_pre_dialogue[npc_id]
	# Fall back to the NPC's default dialogue
	var default_dialogue = npc.get("dialogue_data")
	if default_dialogue != null and not default_dialogue.is_empty():
		return default_dialogue
	return []


func _show_post_victory_dialogue(npc_id: String) -> void:
	if not trainer_post_dialogue.has(npc_id):
		return
	var dialogue_system := _get_dialogue_system()
	if dialogue_system:
		dialogue_system.start_dialogue(trainer_post_dialogue[npc_id])


func _show_post_defeat_dialogue(npc: Node, player: Node) -> void:
	var npc_id: String = npc.get("npc_id") if npc.get("npc_id") != null else ""
	var dialogue: Array[Dictionary] = []

	if trainer_defeat_dialogue.has(npc_id):
		dialogue = trainer_defeat_dialogue[npc_id]
	elif not npc.get("dialogue_data").is_empty() if npc.get("dialogue_data") != null else false:
		# Use a fallback defeated line
		dialogue = [{
			"speaker": npc.get("npc_name") if npc.get("npc_name") != null else "Trainer",
			"text": "You've already beaten me. Good luck out there!",
			"portrait": "",
			"choices": [],
		}]

	if not dialogue.is_empty():
		var dialogue_system := _get_dialogue_system()
		if dialogue_system:
			dialogue_system.start_dialogue(dialogue)


## ── Default Team Generation ─────────────────────────────────────────────────

func _generate_default_team(npc_id: String) -> Array[Dictionary]:
	# Generate a basic 1-Sprite team scaled to the player's average level
	var avg_level: float = GameManager.get_top_10_average_level()
	var trainer_level: int = maxi(1, roundi(avg_level * 0.9))

	return [{
		"race_id": 1,
		"level": trainer_level,
		"nickname": "",
		"ability_ids": [],
	}]


## ── System Lookups ──────────────────────────────────────────────────────────

func _get_dialogue_system() -> Node:
	var systems := get_tree().get_nodes_in_group("dialogue_system")
	if not systems.is_empty():
		return systems[0]
	return get_tree().root.find_child("DialogueSystem", true, false)


func _get_transition_system() -> Node:
	var systems := get_tree().get_nodes_in_group("scene_transition")
	if not systems.is_empty():
		return systems[0]
	return get_tree().root.find_child("SceneTransitionSystem", true, false)


func _get_player() -> Node:
	var players := get_tree().get_nodes_in_group("player")
	if not players.is_empty():
		return players[0]
	return null


func _find_npc_by_id(npc_id: String) -> Node:
	var npcs := get_tree().get_nodes_in_group("npc")
	for npc: Node in npcs:
		if npc.get("npc_id") == npc_id:
			return npc
	return null


func _get_battle_background() -> String:
	# Use the current area's background
	var area_id: String = GameManager.current_area_id
	var bg_map: Dictionary = {
		"starter_town": "res://Sprites/Battle Backgrounds/grassland.png",
		"ember_cave": "res://Sprites/Battle Backgrounds/cave.png",
	}
	return bg_map.get(area_id, "res://Sprites/Battle Backgrounds/grassland.png")

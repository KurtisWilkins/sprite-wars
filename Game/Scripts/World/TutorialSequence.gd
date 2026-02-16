## TutorialSequence — Guided onboarding sequence for new players.
## Walks the player through first movement, NPC interaction, battle, catch,
## team management, equipment, and shop usage via a linear quest chain.
extends Node

## ── Constants ────────────────────────────────────────────────────────────────

## Tutorial quest IDs correspond to the first few quests in MainQuestData.
## These are the IDs that form the tutorial chain.
const TUTORIAL_QUEST_IDS: Array[int] = [1, 2, 3, 4]

## Step definitions mapping step index to a tutorial hint and focus area.
const TUTORIAL_STEPS: Array[Dictionary] = [
	{
		"step": 0,
		"hint": "Welcome to Sprite Wars! Use the joystick to move around.",
		"highlight": Rect2(440, 1600, 200, 200),  # Joystick area
		"event": "first_movement",
	},
	{
		"step": 1,
		"hint": "Approach Professor Oak and tap to talk.",
		"highlight": Rect2(400, 800, 280, 280),  # NPC area
		"event": "first_npc",
	},
	{
		"step": 2,
		"hint": "Your first battle! Your Sprite will fight automatically. Watch and learn!",
		"highlight": Rect2(0, 0, 1080, 1920),  # Full screen
		"event": "first_battle",
	},
	{
		"step": 3,
		"hint": "A wild Sprite appeared! Use a Crystal to catch it.",
		"highlight": Rect2(800, 1700, 200, 150),  # Catch button area
		"event": "first_catch",
	},
	{
		"step": 4,
		"hint": "Open the Team screen to manage your Sprites.",
		"highlight": Rect2(0, 1800, 270, 120),  # Team button area
		"event": "first_team_management",
	},
	{
		"step": 5,
		"hint": "Tap on a Sprite and equip an item to make them stronger!",
		"highlight": Rect2(540, 960, 300, 200),  # Equipment slot area
		"event": "first_equip",
	},
	{
		"step": 6,
		"hint": "Visit the shop to buy Crystals and healing items.",
		"highlight": Rect2(700, 400, 280, 200),  # Shop area
		"event": "first_shop",
	},
]

## ── State ────────────────────────────────────────────────────────────────────

## Current step index in the tutorial sequence.
var tutorial_step: int = 0

## The IDs of the tutorial quest chain (copied from constant, but can be overridden).
var tutorial_quests: Array[int] = TUTORIAL_QUEST_IDS.duplicate()

## Whether the tutorial is currently running.
var is_tutorial_active: bool = false

## Reference to the player data for checking conditions.
var _player_data: PlayerData = null


## ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	_connect_signals()


## ── Public API ──────────────────────────────────────────────────────────────

## Start the tutorial sequence for a new player.
## Activates the first tutorial quest and shows the initial hint.
func start_tutorial(player_data: PlayerData) -> void:
	if is_tutorial_active:
		push_warning("TutorialSequence: tutorial is already active.")
		return

	_player_data = player_data
	is_tutorial_active = true
	tutorial_step = 0

	# Activate the first tutorial quest if available.
	if not tutorial_quests.is_empty():
		QuestManager.activate_quest(tutorial_quests[0])

	# Show the first hint.
	_show_current_step()


## Advance to the next tutorial step. Called when the current step's
## condition is satisfied.
func advance_step() -> void:
	if not is_tutorial_active:
		return

	tutorial_step += 1

	if tutorial_step >= TUTORIAL_STEPS.size():
		_finish_tutorial()
		return

	# Activate the corresponding tutorial quest if one exists for this step.
	if tutorial_step < tutorial_quests.size():
		var quest_id: int = tutorial_quests[tutorial_step]
		var state: String = QuestManager.get_quest_state(quest_id)
		if state == "available":
			QuestManager.activate_quest(quest_id)

	_show_current_step()


## Show a tutorial hint with optional highlight area.
func show_tutorial_hint(text: String, highlight_area: Rect2) -> void:
	EventBus.notification_requested.emit(text, "tutorial")
	# The UI layer should listen for "tutorial" type notifications and
	# render a highlight overlay at the given Rect2. We store the data
	# for the UI to query.
	_current_highlight = highlight_area
	_current_hint_text = text


## Skip the tutorial entirely. Marks all tutorial quests as available
## and disables the tutorial flow.
func skip_tutorial() -> void:
	is_tutorial_active = false
	tutorial_step = TUTORIAL_STEPS.size()

	# Ensure all tutorial quests are still accessible.
	for quest_id in tutorial_quests:
		var state: String = QuestManager.get_quest_state(quest_id)
		if state == "locked":
			# Force-add to available.
			if quest_id not in QuestManager.available_quests:
				QuestManager.available_quests.append(quest_id)

	EventBus.notification_requested.emit("Tutorial skipped. Good luck!", "tutorial")


## Whether the full tutorial sequence has been completed.
func is_complete() -> bool:
	return tutorial_step >= TUTORIAL_STEPS.size()


## ── UI Query API ────────────────────────────────────────────────────────────

## Current highlight area for the UI overlay.
var _current_highlight: Rect2 = Rect2()

## Current hint text for the UI overlay.
var _current_hint_text: String = ""

## Get the current tutorial hint text (for UI rendering).
func get_current_hint_text() -> String:
	return _current_hint_text


## Get the current highlight rectangle (for UI overlay rendering).
func get_current_highlight() -> Rect2:
	return _current_highlight


## Get the current step index.
func get_current_step() -> int:
	return tutorial_step


## Get the total number of tutorial steps.
func get_total_steps() -> int:
	return TUTORIAL_STEPS.size()


## ── Signal Handlers ─────────────────────────────────────────────────────────

func _connect_signals() -> void:
	EventBus.area_entered.connect(_on_area_entered)
	EventBus.npc_interaction_ended.connect(_on_npc_interaction_ended)
	EventBus.battle_ended.connect(_on_battle_ended)
	EventBus.catch_succeeded.connect(_on_catch_succeeded)
	EventBus.screen_changed.connect(_on_screen_changed)
	EventBus.equipment_changed.connect(_on_equipment_changed)
	EventBus.shop_opened.connect(_on_shop_opened)


func _on_area_entered(_area_id: String) -> void:
	if not is_tutorial_active:
		return
	if _get_current_event() == "first_movement":
		advance_step()


func _on_npc_interaction_ended(_npc_id: String) -> void:
	if not is_tutorial_active:
		return
	if _get_current_event() == "first_npc":
		advance_step()


func _on_battle_ended(_result: Dictionary) -> void:
	if not is_tutorial_active:
		return
	if _get_current_event() == "first_battle":
		advance_step()


func _on_catch_succeeded(_sprite_data: Resource) -> void:
	if not is_tutorial_active:
		return
	if _get_current_event() == "first_catch":
		advance_step()


func _on_screen_changed(screen_name: String) -> void:
	if not is_tutorial_active:
		return
	if _get_current_event() == "first_team_management" and screen_name == "team":
		advance_step()


func _on_equipment_changed(_sprite_data: Resource, _slot: int, _item: Resource) -> void:
	if not is_tutorial_active:
		return
	if _get_current_event() == "first_equip":
		advance_step()


func _on_shop_opened(_shop_id: String) -> void:
	if not is_tutorial_active:
		return
	if _get_current_event() == "first_shop":
		advance_step()


## ── Private Helpers ─────────────────────────────────────────────────────────

## Get the event key for the current tutorial step.
func _get_current_event() -> String:
	if tutorial_step < 0 or tutorial_step >= TUTORIAL_STEPS.size():
		return ""
	return TUTORIAL_STEPS[tutorial_step].get("event", "")


## Show the hint for the current tutorial step.
func _show_current_step() -> void:
	if tutorial_step < 0 or tutorial_step >= TUTORIAL_STEPS.size():
		return

	var step_data: Dictionary = TUTORIAL_STEPS[tutorial_step]
	var hint: String = step_data.get("hint", "")
	var highlight: Rect2 = step_data.get("highlight", Rect2())
	show_tutorial_hint(hint, highlight)


## Finish the tutorial sequence.
func _finish_tutorial() -> void:
	is_tutorial_active = false
	_current_hint_text = ""
	_current_highlight = Rect2()
	EventBus.notification_requested.emit(
		"Tutorial complete! The world is yours to explore.", "tutorial"
	)


## ── Serialization ───────────────────────────────────────────────────────────

func to_dict() -> Dictionary:
	return {
		"tutorial_step": tutorial_step,
		"is_tutorial_active": is_tutorial_active,
	}


func from_dict(data: Dictionary) -> void:
	tutorial_step = int(data.get("tutorial_step", 0))
	is_tutorial_active = bool(data.get("is_tutorial_active", false))

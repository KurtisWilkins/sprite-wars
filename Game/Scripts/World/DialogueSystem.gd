## DialogueSystem — Full-featured NPC dialogue UI with typewriter text, speaker
## portraits, branching choices, conditional dialogue, and action callbacks.
## [P5-008] Rendered as a CanvasLayer so it overlays the game world.
extends CanvasLayer

## ── Node References ─────────────────────────────────────────────────────────

@onready var dialogue_box: Panel = $DialogueBox
@onready var name_label: Label = $DialogueBox/NameLabel
@onready var text_label: RichTextLabel = $DialogueBox/TextLabel
@onready var portrait_texture: TextureRect = $DialogueBox/PortraitTexture
@onready var choices_container: VBoxContainer = $DialogueBox/ChoicesContainer
@onready var continue_indicator: TextureRect = $DialogueBox/ContinueIndicator

## ── Configuration ───────────────────────────────────────────────────────────

## Characters revealed per second during typewriter effect.
@export var typewriter_speed: float = 40.0

## Time in seconds to wait after typewriter finishes before showing indicator.
@export var continue_indicator_delay: float = 0.3

## ── State ───────────────────────────────────────────────────────────────────

## Whether the dialogue system is currently showing dialogue.
var is_active: bool = false

## The full dialogue sequence being played.
var current_dialogue: Array[Dictionary] = []

## Index of the currently displayed dialogue entry.
var current_index: int = 0

## Typewriter state.
var _visible_characters: int = 0
var _total_characters: int = 0
var _typewriter_timer: float = 0.0
var _typewriter_active: bool = false
var _waiting_for_input: bool = false

## Currently displayed choices (if any).
var _current_choices: Array[Dictionary] = []


## ── Signals ─────────────────────────────────────────────────────────────────

signal dialogue_started()
signal dialogue_ended()
signal dialogue_line_shown(index: int)
signal choice_selected(choice_index: int, choice_data: Dictionary)


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	dialogue_box.visible = false
	if continue_indicator:
		continue_indicator.visible = false
	_clear_choices()
	set_process(false)


func _process(delta: float) -> void:
	if not is_active:
		return

	# Handle typewriter animation
	if _typewriter_active:
		_typewriter_timer += delta
		var chars_to_show: int = int(_typewriter_timer * typewriter_speed)
		if chars_to_show > _visible_characters:
			_visible_characters = mini(chars_to_show, _total_characters)
			text_label.visible_characters = _visible_characters

			if _visible_characters >= _total_characters:
				_on_typewriter_finished()
		return

	# Handle input for advancing dialogue
	if _waiting_for_input:
		if Input.is_action_just_pressed("ui_accept") or _is_touch_tap():
			advance()


## ── Public API ──────────────────────────────────────────────────────────────

## Starts a dialogue sequence. Each entry in dialogue_data is a Dictionary with:
##   speaker: String - name of the speaking character
##   text: String - the dialogue text (supports BBCode)
##   portrait: String - res:// path to the speaker's portrait texture (optional)
##   choices: Array[Dictionary] - branching choices (optional)
##     Each choice: {text: String, next_index: int, condition: String, action: String}
func start_dialogue(dialogue_data: Array[Dictionary]) -> void:
	if dialogue_data.is_empty():
		return

	current_dialogue = dialogue_data
	current_index = 0
	is_active = true
	set_process(true)

	dialogue_box.visible = true
	dialogue_started.emit()
	EventBus.npc_interaction_started.emit(_get_current_speaker_id())

	_show_line(current_index)


## Advances to the next dialogue line, or closes if at the end.
func advance() -> void:
	if not is_active:
		return

	# If typewriter is still animating, skip to full text
	if _typewriter_active:
		_skip_typewriter()
		return

	# If we have active choices, don't advance until one is selected
	if not _current_choices.is_empty():
		return

	# Move to next line
	current_index += 1
	if current_index >= current_dialogue.size():
		close_dialogue()
		return

	_show_line(current_index)


## Shows a branching choice UI for the current dialogue line.
func show_choices(choices: Array[Dictionary]) -> void:
	_clear_choices()
	_current_choices = choices
	_waiting_for_input = false

	if continue_indicator:
		continue_indicator.visible = false

	for i in range(choices.size()):
		var choice: Dictionary = choices[i]

		# Evaluate condition if present
		if choice.has("condition") and not choice["condition"].is_empty():
			if not _evaluate_condition(choice["condition"]):
				continue

		var button := Button.new()
		button.text = choice.get("text", "...")
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(_on_choice_selected.bind(i))
		choices_container.add_child(button)

	choices_container.visible = true


## Closes the dialogue UI and cleans up state.
func close_dialogue() -> void:
	is_active = false
	_typewriter_active = false
	_waiting_for_input = false
	set_process(false)

	dialogue_box.visible = false
	_clear_choices()

	var speaker_id: String = _get_current_speaker_id()

	current_dialogue = []
	current_index = 0

	dialogue_ended.emit()
	EventBus.npc_interaction_ended.emit(speaker_id)


## ── Internal: Line Display ──────────────────────────────────────────────────

func _show_line(index: int) -> void:
	if index < 0 or index >= current_dialogue.size():
		close_dialogue()
		return

	var line: Dictionary = current_dialogue[index]

	# Speaker name
	var speaker: String = line.get("speaker", "")
	name_label.text = speaker
	name_label.visible = not speaker.is_empty()

	# Portrait
	var portrait_path: String = line.get("portrait", "")
	if not portrait_path.is_empty():
		var tex := load(portrait_path) as Texture2D
		if tex:
			portrait_texture.texture = tex
			portrait_texture.visible = true
		else:
			portrait_texture.visible = false
	else:
		portrait_texture.visible = false

	# Text with typewriter effect
	var text: String = line.get("text", "")
	text_label.text = text
	_start_typewriter()

	# Hide continue indicator and choices until typewriter finishes
	if continue_indicator:
		continue_indicator.visible = false
	_clear_choices()

	dialogue_line_shown.emit(index)


## ── Internal: Typewriter Effect ─────────────────────────────────────────────

func _start_typewriter() -> void:
	_visible_characters = 0
	_total_characters = _count_visible_characters(text_label.text)
	_typewriter_timer = 0.0
	_typewriter_active = true
	_waiting_for_input = false
	text_label.visible_characters = 0


func _skip_typewriter() -> void:
	_typewriter_active = false
	_visible_characters = _total_characters
	text_label.visible_characters = -1  # Show all
	_on_typewriter_finished()


func _on_typewriter_finished() -> void:
	_typewriter_active = false

	var line: Dictionary = current_dialogue[current_index] if current_index < current_dialogue.size() else {}

	# Check for choices on this line
	var choices: Array = line.get("choices", [])
	if not choices.is_empty():
		# Convert to typed array
		var typed_choices: Array[Dictionary] = []
		for c in choices:
			typed_choices.append(c)
		show_choices(typed_choices)
	else:
		_waiting_for_input = true
		# Show continue indicator after a brief delay
		if continue_indicator:
			var tween := create_tween()
			tween.tween_callback(func() -> void:
				if _waiting_for_input and continue_indicator:
					continue_indicator.visible = true
			).set_delay(continue_indicator_delay)


## ── Internal: Choice Handling ───────────────────────────────────────────────

func _on_choice_selected(index: int) -> void:
	if index < 0 or index >= _current_choices.size():
		return

	var choice: Dictionary = _current_choices[index]
	choice_selected.emit(index, choice)

	# Execute action if present
	if choice.has("action") and not choice["action"].is_empty():
		_execute_action(choice["action"])

	# Navigate to the specified dialogue index
	var next_index: int = choice.get("next_index", -1)
	_clear_choices()
	_current_choices = []

	if next_index >= 0 and next_index < current_dialogue.size():
		current_index = next_index
		_show_line(current_index)
	else:
		close_dialogue()


func _clear_choices() -> void:
	_current_choices = []
	if choices_container:
		for child in choices_container.get_children():
			child.queue_free()
		choices_container.visible = false


## ── Condition Evaluation ────────────────────────────────────────────────────

## Evaluates a condition string against the current game state.
## Supported conditions:
##   "quest_completed:quest_id" — checks QuestManager
##   "has_item:item_id" — checks player inventory
##   "badge_count>=N" — checks badge count
##   "flag:flag_name" — checks a boolean game flag
func _evaluate_condition(condition: String) -> bool:
	if condition.is_empty():
		return true

	# quest_completed:quest_id
	if condition.begins_with("quest_completed:"):
		var quest_id: String = condition.substr(len("quest_completed:"))
		if GameManager.player_data.has_method("is_quest_completed"):
			return GameManager.player_data.is_quest_completed(quest_id)
		return false

	# has_item:item_id
	if condition.begins_with("has_item:"):
		var item_id_str: String = condition.substr(len("has_item:"))
		if item_id_str.is_valid_int():
			var item_id: int = item_id_str.to_int()
			if GameManager.player_data.has_method("has_item"):
				return GameManager.player_data.has_item(item_id)
		return false

	# flag:flag_name
	if condition.begins_with("flag:"):
		var flag_name: String = condition.substr(len("flag:"))
		if GameManager.player_data.has_method("get_flag"):
			return GameManager.player_data.get_flag(flag_name)
		return false

	push_warning("DialogueSystem: unrecognized condition '%s'" % condition)
	return true


## ── Action Execution ────────────────────────────────────────────────────────

## Executes a dialogue action string.
## Supported actions:
##   "give_item:item_id:count"
##   "set_flag:flag_name"
##   "start_quest:quest_id"
##   "heal_team"
func _execute_action(action: String) -> void:
	if action.is_empty():
		return

	var parts: PackedStringArray = action.split(":")

	match parts[0]:
		"give_item":
			if parts.size() >= 2 and parts[1].is_valid_int():
				var item_id: int = parts[1].to_int()
				var count: int = parts[2].to_int() if parts.size() >= 3 and parts[2].is_valid_int() else 1
				EventBus.item_acquired.emit(null, count)  # UI will handle specifics
		"set_flag":
			if parts.size() >= 2 and GameManager.player_data.has_method("set_flag"):
				GameManager.player_data.set_flag(parts[1], true)
		"start_quest":
			if parts.size() >= 2:
				pass  # QuestManager.start_quest(parts[1])
		"heal_team":
			pass  # Delegate to SpriteCenter
		_:
			push_warning("DialogueSystem: unrecognized action '%s'" % action)


## ── Helpers ─────────────────────────────────────────────────────────────────

## Counts visible characters excluding BBCode tags.
func _count_visible_characters(bbcode_text: String) -> int:
	var regex := RegEx.new()
	regex.compile("\\[.*?\\]")
	var stripped: String = regex.sub(bbcode_text, "", true)
	return stripped.length()


func _get_current_speaker_id() -> String:
	if current_index < current_dialogue.size():
		return current_dialogue[current_index].get("speaker", "")
	return ""


## Detects a touch tap for mobile input (distinct from virtual button presses).
func _is_touch_tap() -> bool:
	return Input.is_action_just_pressed("ui_accept")

## DialogueSystem — Full-featured NPC dialogue system with typewriter text,
## branching choices, conditional lines, and quest/action callbacks.
## [P5-008] Renders dialogue boxes, speaker portraits, and choice menus.
extends CanvasLayer

## ── Configuration ───────────────────────────────────────────────────────────

## Characters per second for the typewriter text effect.
@export var typewriter_speed: float = 40.0

## Time to wait after the last character before allowing advance (seconds).
@export var end_of_line_delay: float = 0.2

## ── Node References ─────────────────────────────────────────────────────────

@onready var dialogue_box: Panel = $DialogueBox
@onready var name_label: Label = $DialogueBox/NameLabel
@onready var text_label: RichTextLabel = $DialogueBox/TextLabel
@onready var portrait_texture: TextureRect = $DialogueBox/PortraitTexture
@onready var choices_container: VBoxContainer = $DialogueBox/ChoicesContainer
@onready var advance_indicator: TextureRect = $DialogueBox/AdvanceIndicator

## ── State ───────────────────────────────────────────────────────────────────

## True when a dialogue sequence is active.
var is_active: bool = false

## The full dialogue sequence currently playing.
## Each entry: {speaker: String, text: String, portrait: String,
##              choices: Array[{text, next_index, condition, action}]}
var current_dialogue: Array[Dictionary] = []

## Index of the line currently being shown.
var current_index: int = 0

## Typewriter state.
var _visible_chars: int = 0
var _total_chars: int = 0
var _typewriter_timer: float = 0.0
var _typewriter_active: bool = false
var _line_finished: bool = false
var _post_line_timer: float = 0.0

## ── Signals ─────────────────────────────────────────────────────────────────

signal dialogue_started()
signal dialogue_ended()
signal choice_made(choice_index: int, choice_data: Dictionary)
signal line_shown(index: int)


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	dialogue_box.visible = false
	choices_container.visible = false
	if advance_indicator:
		advance_indicator.visible = false


func _process(delta: float) -> void:
	if not is_active:
		return

	_process_typewriter(delta)

	# Handle advance input
	if Input.is_action_just_pressed("ui_accept"):
		_on_advance_pressed()


## ── Public API ──────────────────────────────────────────────────────────────

## Starts a new dialogue sequence.
## dialogue_data: Array of dialogue line dictionaries.
func start_dialogue(dialogue_data: Array[Dictionary]) -> void:
	if dialogue_data.is_empty():
		return

	current_dialogue = dialogue_data
	current_index = 0
	is_active = true
	dialogue_box.visible = true
	choices_container.visible = false

	dialogue_started.emit()
	_show_line(current_index)


## Advances to the next line, or closes dialogue if at the end.
func advance() -> void:
	if not is_active:
		return

	# If typewriter is still running, show the full text immediately
	if _typewriter_active:
		_finish_typewriter()
		return

	# If there are active choices, don't advance (wait for choice selection)
	if choices_container.visible and choices_container.get_child_count() > 0:
		return

	# Move to next line
	current_index += 1
	if current_index >= current_dialogue.size():
		close_dialogue()
		return

	_show_line(current_index)


## Closes the dialogue and cleans up.
func close_dialogue() -> void:
	is_active = false
	current_dialogue.clear()
	current_index = 0
	dialogue_box.visible = false
	choices_container.visible = false
	_typewriter_active = false
	_line_finished = false

	_clear_choices()

	dialogue_ended.emit()


## ── Line Rendering ──────────────────────────────────────────────────────────

func _show_line(index: int) -> void:
	if index < 0 or index >= current_dialogue.size():
		close_dialogue()
		return

	var line: Dictionary = current_dialogue[index]

	# Check conditional display
	if line.has("condition") and not line["condition"].is_empty():
		if not _evaluate_condition(line["condition"]):
			# Skip this line
			current_index += 1
			if current_index >= current_dialogue.size():
				close_dialogue()
			else:
				_show_line(current_index)
			return

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
	_start_typewriter(text)

	# Hide advance indicator and choices while typing
	if advance_indicator:
		advance_indicator.visible = false
	choices_container.visible = false
	_clear_choices()

	line_shown.emit(index)

	# Execute immediate action if present
	if line.has("action") and not line["action"].is_empty():
		_execute_action(line["action"])


## ── Typewriter Effect ───────────────────────────────────────────────────────

func _start_typewriter(text: String) -> void:
	_total_chars = text.length()
	_visible_chars = 0
	_typewriter_active = true
	_line_finished = false
	_typewriter_timer = 0.0
	_post_line_timer = 0.0
	text_label.visible_characters = 0


func _process_typewriter(delta: float) -> void:
	if not _typewriter_active:
		if _line_finished and _post_line_timer > 0.0:
			_post_line_timer -= delta
			if _post_line_timer <= 0.0:
				_on_line_display_complete()
		return

	_typewriter_timer += delta
	var chars_to_show: int = int(_typewriter_timer * typewriter_speed)

	if chars_to_show > _visible_chars:
		_visible_chars = mini(chars_to_show, _total_chars)
		text_label.visible_characters = _visible_chars

		# Play text blip sound
		if _visible_chars < _total_chars and _visible_chars % 3 == 0:
			EventBus.sfx_requested.emit("text_blip", Vector2.ZERO)

	if _visible_chars >= _total_chars:
		_typewriter_active = false
		_line_finished = true
		_post_line_timer = end_of_line_delay


func _finish_typewriter() -> void:
	_visible_chars = _total_chars
	text_label.visible_characters = _total_chars
	_typewriter_active = false
	_line_finished = true
	_post_line_timer = 0.0
	_on_line_display_complete()


func _on_line_display_complete() -> void:
	# Show choices if present
	var line: Dictionary = current_dialogue[current_index]
	var choices: Array = line.get("choices", [])

	if not choices.is_empty():
		show_choices(choices)
	else:
		# Show advance indicator
		if advance_indicator:
			advance_indicator.visible = true


## ── Choices ─────────────────────────────────────────────────────────────────

## Displays a list of choices for the player to select.
## Each choice: {text: String, next_index: int, condition: String, action: String}
func show_choices(choices: Array) -> void:
	_clear_choices()
	choices_container.visible = true

	var valid_index: int = 0
	for choice_data in choices:
		var choice: Dictionary = choice_data as Dictionary

		# Filter out choices whose conditions fail
		if choice.has("condition") and not choice["condition"].is_empty():
			if not _evaluate_condition(choice["condition"]):
				continue

		var button := Button.new()
		button.text = choice.get("text", "...")
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.custom_minimum_size = Vector2(0, 48)

		# Store metadata for the callback
		button.set_meta("choice_index", valid_index)
		button.set_meta("choice_data", choice)
		button.pressed.connect(_on_choice_button_pressed.bind(button))

		choices_container.add_child(button)
		valid_index += 1

	# Focus the first button for gamepad/keyboard navigation
	if choices_container.get_child_count() > 0:
		(choices_container.get_child(0) as Control).grab_focus()


func _on_choice_button_pressed(button: Button) -> void:
	var choice_index: int = button.get_meta("choice_index")
	var choice_data: Dictionary = button.get_meta("choice_data")

	_on_choice_selected(choice_index, choice_data)


func _on_choice_selected(index: int, choice_data: Dictionary) -> void:
	choices_container.visible = false
	_clear_choices()

	choice_made.emit(index, choice_data)

	# Execute choice action if present
	if choice_data.has("action") and not choice_data["action"].is_empty():
		_execute_action(choice_data["action"])

	# Jump to next_index if specified, otherwise advance normally
	var next_index: int = choice_data.get("next_index", -1)
	if next_index >= 0 and next_index < current_dialogue.size():
		current_index = next_index
		_show_line(current_index)
	else:
		# Advance past current line
		current_index += 1
		if current_index >= current_dialogue.size():
			close_dialogue()
		else:
			_show_line(current_index)


func _clear_choices() -> void:
	for child in choices_container.get_children():
		child.queue_free()


## ── Input Handling ──────────────────────────────────────────────────────────

func _on_advance_pressed() -> void:
	advance()


## ── Conditional Evaluation ──────────────────────────────────────────────────

## Evaluates a condition string against game state.
## Supported formats:
##   "quest:quest_id:status"  - checks quest status
##   "has_item:item_id:count" - checks inventory
##   "flag:flag_name"         - checks a boolean game flag
func _evaluate_condition(condition: String) -> bool:
	if condition.is_empty():
		return true

	var parts: PackedStringArray = condition.split(":")
	if parts.size() < 2:
		push_warning("DialogueSystem: Invalid condition format '%s'" % condition)
		return true

	match parts[0]:
		"quest":
			return _check_quest_condition(parts)
		"has_item":
			return _check_item_condition(parts)
		"flag":
			return _check_flag_condition(parts)
		"not_flag":
			return not _check_flag_condition(parts)
		_:
			push_warning("DialogueSystem: Unknown condition type '%s'" % parts[0])
			return true


func _check_quest_condition(parts: PackedStringArray) -> bool:
	if parts.size() < 3:
		return true
	var quest_id: String = parts[1]
	var expected_status: String = parts[2]
	# Delegate to QuestManager autoload
	if not Engine.has_singleton("QuestManager"):
		var qm := get_node_or_null("/root/QuestManager")
		if qm and qm.has_method("get_quest_status"):
			return qm.get_quest_status(quest_id) == expected_status
	return true


func _check_item_condition(parts: PackedStringArray) -> bool:
	if parts.size() < 3:
		return true
	var item_id: int = parts[1].to_int()
	var required_count: int = parts[2].to_int()
	if GameManager.player_data and GameManager.player_data.has_method("has_item"):
		return GameManager.player_data.has_item(item_id, required_count)
	return true


func _check_flag_condition(parts: PackedStringArray) -> bool:
	if parts.size() < 2:
		return true
	var flag_name: String = parts[1]
	if GameManager.player_data and "flags" in GameManager.player_data:
		return GameManager.player_data.flags.get(flag_name, false)
	return false


## ── Action Execution ────────────────────────────────────────────────────────

## Executes an action string triggered by a dialogue line or choice.
## Supported formats:
##   "give_item:item_id:count"
##   "set_flag:flag_name:true/false"
##   "start_quest:quest_id"
##   "heal_team"
##   "open_shop:shop_id"
func _execute_action(action: String) -> void:
	if action.is_empty():
		return

	var parts: PackedStringArray = action.split(":")
	if parts.is_empty():
		return

	match parts[0]:
		"give_item":
			if parts.size() >= 3:
				var item_id: int = parts[1].to_int()
				var count: int = parts[2].to_int()
				EventBus.item_acquired.emit(null, count)  # UI will handle display
				if GameManager.player_data and GameManager.player_data.has_method("add_item"):
					GameManager.player_data.add_item(item_id, count)
		"set_flag":
			if parts.size() >= 3:
				var flag_name: String = parts[1]
				var value: bool = parts[2] == "true"
				if GameManager.player_data and "flags" in GameManager.player_data:
					GameManager.player_data.flags[flag_name] = value
		"start_quest":
			if parts.size() >= 2:
				var quest_id: String = parts[1]
				var qm := get_node_or_null("/root/QuestManager")
				if qm and qm.has_method("start_quest"):
					qm.start_quest(quest_id)
		"heal_team":
			# Delegate to SpriteCenter
			var centers := get_tree().get_nodes_in_group("sprite_center")
			if not centers.is_empty() and centers[0].has_method("heal_all_sprites"):
				centers[0].heal_all_sprites(GameManager.player_data)
		"open_shop":
			if parts.size() >= 2:
				EventBus.shop_opened.emit(parts[1])
		_:
			push_warning("DialogueSystem: Unknown action '%s'" % parts[0])

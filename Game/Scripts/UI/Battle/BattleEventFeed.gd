## BattleEventFeed -- Scrolling battle event text log.
## Shows the last N messages at the side of the screen, auto-fading old messages
## after a duration. Provides format helpers for common battle events.
extends VBoxContainer

## -- Configuration ------------------------------------------------------------

## Maximum number of visible messages at once.
var max_messages: int = 3

## How long each message stays visible before fading.
var message_duration: float = 4.0

## -- State --------------------------------------------------------------------

## Active message entries: Array of {label: Label, timer: SceneTreeTimer, tween: Tween}
var _messages: Array[Dictionary] = []

## -- Constants ----------------------------------------------------------------

const MESSAGE_FONT_SIZE: int = 18
const MESSAGE_MAX_WIDTH: float = 400.0
const FADE_DURATION: float = 0.5

const COLOR_DEFAULT := Color.WHITE
const COLOR_DAMAGE := Color(1.0, 0.4, 0.3)
const COLOR_HEAL := Color(0.3, 1.0, 0.45)
const COLOR_STATUS := Color(0.85, 0.7, 1.0)
const COLOR_FAINT := Color(0.7, 0.2, 0.2)
const COLOR_ABILITY := Color(0.9, 0.85, 0.5)
const COLOR_EFFECTIVENESS := Color(1.0, 0.7, 0.1)

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	# Position at the left side of the screen, below the turn order bar.
	set_anchors_preset(Control.PRESET_TOP_LEFT)
	position = Vector2(16.0, 100.0)
	size = Vector2(MESSAGE_MAX_WIDTH, 200.0)
	alignment = BoxContainer.ALIGNMENT_END  # New messages at bottom.
	add_theme_constant_override("separation", 4)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

## -- Public API ---------------------------------------------------------------

## Add a new message to the feed.
func add_message(text: String, color: Color = COLOR_DEFAULT) -> void:
	# If we're at max, remove the oldest.
	while _messages.size() >= max_messages:
		_remove_oldest()

	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", MESSAGE_FONT_SIZE)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	label.add_theme_constant_override("shadow_offset_x", 1)
	label.add_theme_constant_override("shadow_offset_y", 1)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.custom_minimum_size.x = MESSAGE_MAX_WIDTH
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Start with a pop-in effect.
	label.modulate.a = 0.0
	label.scale = Vector2(0.9, 0.9)
	add_child(label)

	var entry_tween := create_tween()
	entry_tween.set_parallel(true)
	entry_tween.tween_property(label, "modulate:a", 1.0, 0.2)
	entry_tween.tween_property(label, "scale", Vector2(1.0, 1.0), 0.2)\
		.set_trans(Tween.TRANS_BACK)\
		.set_ease(Tween.EASE_OUT)

	# Set up auto-fade timer.
	var timer: SceneTreeTimer = get_tree().create_timer(message_duration)
	var message_entry: Dictionary = {
		"label": label,
		"timer": timer,
		"tween": null,
	}
	_messages.append(message_entry)

	# Connect timer to fade out.
	timer.timeout.connect(_fade_message.bind(message_entry))


## Clear all messages immediately.
func clear() -> void:
	for entry in _messages:
		var label: Label = entry["label"]
		if label != null and is_instance_valid(label):
			label.queue_free()
		if entry["tween"] != null and entry["tween"] is Tween:
			entry["tween"].kill()
	_messages.clear()

## -- Format Helpers -----------------------------------------------------------

## Format an ability use message.
func ability_used_text(caster_name: String, ability_name: String, target_name: String) -> String:
	if target_name.is_empty():
		return "%s used %s!" % [caster_name, ability_name]
	return "%s used %s on %s!" % [caster_name, ability_name, target_name]


## Format a damage message.
func damage_text(target_name: String, amount: int, is_crit: bool = false) -> String:
	if is_crit:
		return "Critical hit! %s took %d damage!" % [target_name, amount]
	return "%s took %d damage." % [target_name, amount]


## Format a status effect application message.
func status_text(target_name: String, effect_name: String, applied: bool = true) -> String:
	if applied:
		return "%s was inflicted with %s!" % [target_name, effect_name]
	return "%s's %s wore off." % [target_name, effect_name]


## Format a faint message.
func faint_text(unit_name: String) -> String:
	return "%s fainted!" % unit_name

## -- Private Helpers ----------------------------------------------------------

## Remove the oldest message immediately.
func _remove_oldest() -> void:
	if _messages.is_empty():
		return

	var entry: Dictionary = _messages.pop_front()
	var label: Label = entry["label"]
	if entry["tween"] != null and entry["tween"] is Tween:
		entry["tween"].kill()
	if label != null and is_instance_valid(label):
		label.queue_free()


## Fade out a message and remove it.
func _fade_message(entry: Dictionary) -> void:
	if not _messages.has(entry):
		return

	var label: Label = entry["label"]
	if label == null or not is_instance_valid(label):
		_messages.erase(entry)
		return

	var tween := create_tween()
	tween.tween_property(label, "modulate:a", 0.0, FADE_DURATION)
	tween.tween_callback(func() -> void:
		if label != null and is_instance_valid(label):
			label.queue_free()
		_messages.erase(entry)
	)
	entry["tween"] = tween

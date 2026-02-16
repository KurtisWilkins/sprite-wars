## BattleEventFeed -- Scrolling text log for battle events.
## Shows the most recent N messages at the left side of the screen, with each
## message fading out after a configurable duration. New messages push older
## ones upward.
extends VBoxContainer

## -- Configuration ------------------------------------------------------------

## Maximum number of visible messages at once.
var max_messages: int = 3

## Seconds before a message begins fading out.
var message_duration: float = 4.0

## -- State --------------------------------------------------------------------

## Active message entries: Array of {label: Label, timer: float, tween: Tween}
var _messages: Array[Dictionary] = []

## -- Constants ----------------------------------------------------------------

const FONT_SIZE: int = 18
const MESSAGE_HEIGHT: float = 28.0
const FADE_DURATION: float = 0.8
const SLIDE_DURATION: float = 0.2
const MARGIN_LEFT: float = 16.0
const MARGIN_TOP: float = 100.0
const MAX_WIDTH: float = 520.0

## -- Pre-defined Colors -------------------------------------------------------

const COLOR_ABILITY := Color(0.6, 0.85, 1.0)
const COLOR_DAMAGE := Color(1.0, 0.5, 0.4)
const COLOR_HEAL := Color(0.4, 1.0, 0.5)
const COLOR_STATUS := Color(0.9, 0.75, 1.0)
const COLOR_FAINT := Color(0.85, 0.3, 0.3)
const COLOR_CRIT := Color(1.0, 0.9, 0.3)
const COLOR_SYSTEM := Color(0.7, 0.7, 0.75)

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	# Position on the left side of the screen, below the turn order bar.
	position = Vector2(MARGIN_LEFT, MARGIN_TOP)
	size = Vector2(MAX_WIDTH, MESSAGE_HEIGHT * float(max_messages) + 20.0)
	alignment = BoxContainer.ALIGNMENT_END  # Stack from bottom.
	add_theme_constant_override("separation", 4)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

## -- Public API ---------------------------------------------------------------

## Add a new message to the feed.
func add_message(text: String, color: Color = Color.WHITE) -> void:
	# Remove the oldest message if at capacity.
	if _messages.size() >= max_messages:
		_remove_oldest()

	# Create the message label.
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", FONT_SIZE)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.9))
	label.add_theme_constant_override("shadow_offset_x", 1)
	label.add_theme_constant_override("shadow_offset_y", 1)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.custom_minimum_size = Vector2(MAX_WIDTH, 0)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Slide in from the left.
	label.modulate.a = 0.0
	label.position.x = -20.0
	add_child(label)

	var slide_tween := create_tween()
	slide_tween.set_parallel(true)
	slide_tween.tween_property(label, "modulate:a", 1.0, SLIDE_DURATION)
	slide_tween.tween_property(label, "position:x", 0.0, SLIDE_DURATION)\
		.set_trans(Tween.TRANS_QUAD)\
		.set_ease(Tween.EASE_OUT)

	# Schedule fade-out after the display duration.
	var fade_tween := create_tween()
	fade_tween.tween_interval(message_duration)
	fade_tween.tween_property(label, "modulate:a", 0.0, FADE_DURATION)
	fade_tween.tween_callback(_on_message_expired.bind(label))

	_messages.append({
		"label": label,
		"fade_tween": fade_tween,
	})


## Clear all messages immediately.
func clear() -> void:
	for entry in _messages:
		var label: Label = entry["label"]
		if label != null and is_instance_valid(label):
			label.queue_free()
		var tween: Tween = entry.get("fade_tween")
		if tween != null:
			tween.kill()
	_messages.clear()

## -- Format Helpers -----------------------------------------------------------

## Format text for an ability being used.
func ability_used_text(caster_name: String, ability_name: String, target_name: String) -> String:
	if target_name.is_empty():
		return "%s used %s!" % [caster_name, ability_name]
	return "%s used %s on %s!" % [caster_name, ability_name, target_name]


## Format text for damage dealt.
func damage_text(target_name: String, amount: int, is_crit: bool) -> String:
	var base: String = "%s took %d damage!" % [target_name, amount]
	if is_crit:
		base = "Critical hit! " + base
	return base


## Format text for healing.
func heal_text(target_name: String, amount: int) -> String:
	return "%s recovered %d HP!" % [target_name, amount]


## Format text for status effect applied.
func status_text(target_name: String, effect_name: String, applied: bool) -> String:
	if applied:
		return "%s is now affected by %s!" % [target_name, effect_name]
	return "%s is no longer affected by %s." % [target_name, effect_name]


## Format text for a unit fainting.
func faint_text(unit_name: String) -> String:
	return "%s fainted!" % unit_name

## -- Private Helpers ----------------------------------------------------------

## Remove the oldest message from the feed.
func _remove_oldest() -> void:
	if _messages.is_empty():
		return

	var oldest: Dictionary = _messages[0]
	var label: Label = oldest["label"]
	var tween: Tween = oldest.get("fade_tween")

	if tween != null:
		tween.kill()

	if label != null and is_instance_valid(label):
		label.queue_free()

	_messages.remove_at(0)


## Callback when a message's fade timer expires.
func _on_message_expired(label: Label) -> void:
	# Find and remove the entry.
	for i in range(_messages.size()):
		if _messages[i]["label"] == label:
			if label != null and is_instance_valid(label):
				label.queue_free()
			_messages.remove_at(i)
			break

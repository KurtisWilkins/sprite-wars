## BattleEventLog -- [P3-016] Records all events that occur during a battle
## for display in the battle log UI and for post-battle replay/analysis.
class_name BattleEventLog
extends RefCounted

## -- Constants ----------------------------------------------------------------

## Maximum events to keep in memory (prevents unbounded growth in long battles).
const MAX_EVENTS: int = 500

## Event type constants.
const EVENT_ABILITY_USED: String = "ability_used"
const EVENT_DAMAGE_DEALT: String = "damage_dealt"
const EVENT_HEAL: String = "heal"
const EVENT_CRITICAL_HIT: String = "critical_hit"
const EVENT_SUPER_EFFECTIVE: String = "super_effective"
const EVENT_NOT_EFFECTIVE: String = "not_effective"
const EVENT_IMMUNE: String = "immune"
const EVENT_MISS: String = "miss"
const EVENT_STATUS_APPLIED: String = "status_applied"
const EVENT_STATUS_EXPIRED: String = "status_expired"
const EVENT_STATUS_DAMAGE: String = "status_damage"
const EVENT_FAINTED: String = "fainted"
const EVENT_KNOCKBACK: String = "knockback"
const EVENT_TURN_START: String = "turn_start"
const EVENT_BATTLE_START: String = "battle_start"
const EVENT_BATTLE_END: String = "battle_end"

## -- State --------------------------------------------------------------------

## Ordered list of all events, newest last.
var events: Array[Dictionary] = []

## Running turn counter for event timestamps.
var _current_turn: int = 0

## -- Event Recording ----------------------------------------------------------

## Add a new event to the log.
##
## [event_type] -- One of the EVENT_* constants.
## [data]       -- Dictionary of event-specific data. Common keys:
##                 "unit_name", "target_name", "ability_name", "damage",
##                 "heal_amount", "effect_name", "effectiveness", etc.
func add_event(event_type: String, data: Dictionary) -> void:
	var event := {
		"type": event_type,
		"turn": _current_turn,
		"data": data,
		"timestamp": Time.get_ticks_msec(),
	}
	events.append(event)

	# Trim old events if we exceed the cap.
	if events.size() > MAX_EVENTS:
		events = events.slice(events.size() - MAX_EVENTS)


## Increment the turn counter.
func advance_turn() -> void:
	_current_turn += 1

## -- Event Retrieval ----------------------------------------------------------

## Get the N most recent events.
func get_recent_events(count: int) -> Array[Dictionary]:
	if count <= 0:
		return []
	var start: int = maxi(0, events.size() - count)
	var result: Array[Dictionary] = []
	for i in range(start, events.size()):
		result.append(events[i])
	return result


## Get all events from the current turn.
func get_current_turn_events() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for event in events:
		if event["turn"] == _current_turn:
			result.append(event)
	return result


## Get the full event log.
func get_full_log() -> Array[Dictionary]:
	return events.duplicate()

## -- Event Formatting ---------------------------------------------------------

## Format an event into a human-readable text string for the battle log UI.
func format_event_text(event: Dictionary) -> String:
	var data: Dictionary = event.get("data", {})
	var unit_name: String = data.get("unit_name", "???")
	var target_name: String = data.get("target_name", "???")
	var ability_name: String = data.get("ability_name", "???")

	match event.get("type", ""):
		EVENT_ABILITY_USED:
			if target_name != unit_name:
				return "%s used %s on %s!" % [unit_name, ability_name, target_name]
			return "%s used %s!" % [unit_name, ability_name]

		EVENT_DAMAGE_DEALT:
			var damage: int = int(data.get("damage", 0))
			return "%s took %d damage!" % [target_name, damage]

		EVENT_HEAL:
			var amount: int = int(data.get("heal_amount", 0))
			return "%s recovered %d HP!" % [unit_name, amount]

		EVENT_CRITICAL_HIT:
			return "A critical hit!"

		EVENT_SUPER_EFFECTIVE:
			return "It's super effective!"

		EVENT_NOT_EFFECTIVE:
			return "It's not very effective..."

		EVENT_IMMUNE:
			return "%s is immune!" % target_name

		EVENT_MISS:
			return "%s's attack missed!" % unit_name

		EVENT_STATUS_APPLIED:
			var effect_name: String = data.get("effect_name", "???")
			return "%s was afflicted with %s!" % [target_name, effect_name]

		EVENT_STATUS_EXPIRED:
			var effect_name: String = data.get("effect_name", "???")
			return "%s's %s wore off." % [unit_name, effect_name]

		EVENT_STATUS_DAMAGE:
			var damage: int = int(data.get("damage", 0))
			var effect_name: String = data.get("effect_name", "???")
			return "%s took %d damage from %s!" % [unit_name, damage, effect_name]

		EVENT_FAINTED:
			return "%s fainted!" % unit_name

		EVENT_KNOCKBACK:
			return "%s was knocked back!" % target_name

		EVENT_TURN_START:
			return "--- Turn %d ---" % int(data.get("turn_number", _current_turn))

		EVENT_BATTLE_START:
			return "Battle started!"

		EVENT_BATTLE_END:
			var winner: String = data.get("winner", "???")
			return "Battle ended! %s wins!" % winner

		_:
			return str(data)

## -- Convenience Loggers ------------------------------------------------------

## Log an ability being used.
func log_ability_used(caster_name: String, ability_name: String, target_name: String) -> void:
	add_event(EVENT_ABILITY_USED, {
		"unit_name": caster_name,
		"ability_name": ability_name,
		"target_name": target_name,
	})


## Log damage dealt.
func log_damage(target_name: String, damage: int, attacker_name: String = "") -> void:
	add_event(EVENT_DAMAGE_DEALT, {
		"target_name": target_name,
		"damage": damage,
		"unit_name": attacker_name,
	})


## Log healing.
func log_heal(unit_name: String, amount: int) -> void:
	add_event(EVENT_HEAL, {
		"unit_name": unit_name,
		"heal_amount": amount,
	})


## Log a unit fainting.
func log_faint(unit_name: String) -> void:
	add_event(EVENT_FAINTED, {"unit_name": unit_name})


## Log a status effect being applied.
func log_status_applied(target_name: String, effect_name: String) -> void:
	add_event(EVENT_STATUS_APPLIED, {
		"target_name": target_name,
		"effect_name": effect_name,
	})


## Log a status effect expiring.
func log_status_expired(unit_name: String, effect_name: String) -> void:
	add_event(EVENT_STATUS_EXPIRED, {
		"unit_name": unit_name,
		"effect_name": effect_name,
	})


## Clear the log (for a new battle).
func clear() -> void:
	events.clear()
	_current_turn = 0

## EvolutionTrigger — Checks whether a Sprite qualifies for evolution.
## [Progression] Evaluates level-based, item-based, and condition-based
## evolution triggers against the EvolutionData database. Returns detailed
## information about whether evolution is possible and what form is next.
class_name EvolutionTrigger
extends RefCounted


## ── Trigger Type Constants ──────────────────────────────────────────────────

const TRIGGER_LEVEL: String = "level"
const TRIGGER_ITEM: String = "item"
const TRIGGER_CONDITION: String = "condition"
const TRIGGER_NONE: String = "none"


## ── Core Operations ─────────────────────────────────────────────────────────

## Check whether a Sprite is eligible to evolve.
##
## Parameters:
##   sprite       — the SpriteInstance Resource to check
##   evolution_db — the full evolution database Dictionary from
##                  EvolutionData.get_all_forms(). Keys are form_ids.
##   held_item_id — ID of the evolution item being used (-1 if none).
##                  Only relevant for item-triggered evolutions.
##   condition_flags — Dictionary of condition keys → bool for condition triggers.
##
## Returns:
##   Dictionary {
##     "can_evolve": bool,           — whether evolution is possible right now
##     "trigger_type": String,       — "level", "item", "condition", or "none"
##     "next_form_id": int,          — the form_id of the next stage (0 if none)
##     "trigger_description": String, — human-readable trigger description
##     "current_stage": int,         — the Sprite's current evolution stage
##   }
func check_evolution(
	sprite: Resource,
	evolution_db: Dictionary,
	held_item_id: int = -1,
	condition_flags: Dictionary = {},
) -> Dictionary:
	var result := {
		"can_evolve": false,
		"trigger_type": TRIGGER_NONE,
		"next_form_id": 0,
		"trigger_description": "",
		"current_stage": 0,
	}

	if sprite == null or not (sprite is SpriteInstance):
		return result

	# Identify current form data.
	var current_form: Dictionary = evolution_db.get(sprite.form_id, {})
	if current_form.is_empty():
		push_warning("EvolutionTrigger: form_id %d not found in evolution_db." % sprite.form_id)
		return result

	var current_stage: int = int(current_form.get("stage_number", 0))
	result["current_stage"] = current_stage

	# Stage 3 is final — cannot evolve further.
	if current_stage >= 3:
		return result

	# Find the next stage form.
	var next_stage: int = current_stage + 1
	var race_id: int = int(current_form.get("race_id", sprite.race_id))
	var next_form: Dictionary = _find_next_form(race_id, next_stage, evolution_db)

	if next_form.is_empty():
		return result

	var next_form_id: int = int(next_form.get("form_id", 0))
	result["next_form_id"] = next_form_id

	# Evaluate the trigger.
	var trigger_type: String = str(next_form.get("evolution_trigger_type", TRIGGER_NONE))
	result["trigger_type"] = trigger_type
	result["trigger_description"] = str(next_form.get("evolution_trigger_description", ""))

	match trigger_type:
		TRIGGER_LEVEL:
			var required_level: int = int(next_form.get("evolution_trigger_value", 999))
			result["can_evolve"] = sprite.level >= required_level

		TRIGGER_ITEM:
			var required_item: int = int(next_form.get("evolution_trigger_value", -1))
			result["can_evolve"] = held_item_id == required_item and required_item > 0

		TRIGGER_CONDITION:
			var condition_key: String = str(next_form.get("evolution_trigger_value", ""))
			result["can_evolve"] = bool(condition_flags.get(condition_key, false))

		_:
			result["can_evolve"] = false

	return result


## Retrieve the data for the next evolution stage of a given race.
##
## Parameters:
##   race_id        — the Sprite's race ID (1-24)
##   current_stage  — the current evolution stage (1-3)
##   evolution_db   — the full evolution database Dictionary
##
## Returns:
##   Dictionary containing the next form's data, or empty if no next stage exists.
##   Fields: form_id, race_id, stage_number, stat_multipliers, ability_changes,
##           evolution_trigger_type, evolution_trigger_value, evolution_trigger_description.
func get_next_stage_data(
	race_id: int,
	current_stage: int,
	evolution_db: Dictionary,
) -> Dictionary:
	if current_stage >= 3:
		return {}

	var next_stage: int = current_stage + 1
	return _find_next_form(race_id, next_stage, evolution_db)


## ── Convenience Queries ─────────────────────────────────────────────────────

## Check if a Sprite has reached the final evolution stage.
func is_fully_evolved(sprite: Resource, evolution_db: Dictionary) -> bool:
	if sprite == null or not (sprite is SpriteInstance):
		return false
	var form: Dictionary = evolution_db.get(sprite.form_id, {})
	return int(form.get("stage_number", 0)) >= 3


## Get the evolution stage number for a Sprite's current form.
func get_current_stage(sprite: Resource, evolution_db: Dictionary) -> int:
	if sprite == null or not (sprite is SpriteInstance):
		return 0
	var form: Dictionary = evolution_db.get(sprite.form_id, {})
	return int(form.get("stage_number", 0))


## Get the level required for the next level-based evolution, or -1 if
## the next evolution is not level-based or the Sprite is fully evolved.
func get_next_evolution_level(sprite: Resource, evolution_db: Dictionary) -> int:
	if sprite == null or not (sprite is SpriteInstance):
		return -1

	var current_form: Dictionary = evolution_db.get(sprite.form_id, {})
	var current_stage: int = int(current_form.get("stage_number", 0))

	if current_stage >= 3:
		return -1

	var race_id: int = int(current_form.get("race_id", sprite.race_id))
	var next_form: Dictionary = _find_next_form(race_id, current_stage + 1, evolution_db)

	if next_form.is_empty():
		return -1

	if str(next_form.get("evolution_trigger_type", "")) == TRIGGER_LEVEL:
		return int(next_form.get("evolution_trigger_value", -1))

	return -1


## Get the item ID required for the next item-based evolution, or -1 if not
## applicable.
func get_required_evolution_item(sprite: Resource, evolution_db: Dictionary) -> int:
	if sprite == null or not (sprite is SpriteInstance):
		return -1

	var current_form: Dictionary = evolution_db.get(sprite.form_id, {})
	var current_stage: int = int(current_form.get("stage_number", 0))

	if current_stage >= 3:
		return -1

	var race_id: int = int(current_form.get("race_id", sprite.race_id))
	var next_form: Dictionary = _find_next_form(race_id, current_stage + 1, evolution_db)

	if next_form.is_empty():
		return -1

	if str(next_form.get("evolution_trigger_type", "")) == TRIGGER_ITEM:
		return int(next_form.get("evolution_trigger_value", -1))

	return -1


## ── Internal Helpers ────────────────────────────────────────────────────────

## Find the next evolution form for a race at a given stage.
## Uses the convention: form_id = (race_id - 1) * 3 + stage_number
func _find_next_form(race_id: int, target_stage: int, evolution_db: Dictionary) -> Dictionary:
	# Calculate expected form_id using the project convention.
	var expected_form_id: int = (race_id - 1) * 3 + target_stage
	var form: Dictionary = evolution_db.get(expected_form_id, {})

	# Verify the found form matches the expected race and stage.
	if not form.is_empty():
		if int(form.get("race_id", 0)) == race_id and int(form.get("stage_number", 0)) == target_stage:
			return form

	# Fallback: linear scan (should not be needed with proper data).
	for form_id: int in evolution_db:
		var entry: Dictionary = evolution_db[form_id]
		if int(entry.get("race_id", 0)) == race_id and int(entry.get("stage_number", 0)) == target_stage:
			return entry

	return {}

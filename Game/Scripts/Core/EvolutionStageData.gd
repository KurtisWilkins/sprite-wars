## EvolutionStageData — Data model for a single evolution form of a Sprite race.
## [P1-006] There are 72 total forms (24 races x 3 stages). Each form has its
## own stat multipliers, ability changes, visual, and trigger conditions.
class_name EvolutionStageData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

## Evolution stage (1 = base, 2 = mid, 3 = final).
@export_range(1, 3) var stage_number: int = 1

## The parent SpriteRaceData.race_id this form belongs to.
@export var race_id: int = 0

## A globally unique ID for this specific form (1-72).
@export var form_id: int = 0

## ── Stat Scaling ──────────────────────────────────────────────────────────────

## Multiplicative modifiers applied ON TOP of the base race stats.
## Stage 1 typically has all 1.0 multipliers; Stage 3 might be 1.4+ on key stats.
## Final stat = floor(race_base_stat_at_level * multiplier)
@export var stat_multipliers: Dictionary = {
	"hp": 1.0,
	"atk": 1.0,
	"def": 1.0,
	"spd": 1.0,
	"sp_atk": 1.0,
	"sp_def": 1.0,
}

## ── Ability Changes ───────────────────────────────────────────────────────────

## Each entry: {learn_level: int, ability_id: int, replaces_ability_id: int}
## replaces_ability_id of -1 means the ability is added without replacing.
@export var ability_changes: Array[Dictionary] = []

## ── Visuals ───────────────────────────────────────────────────────────────────

## Path to this form's specific sprite sheet or animation resource.
@export_file("*.png,*.tres") var visual_form_path: String = ""

## ── Evolution Trigger ─────────────────────────────────────────────────────────

## How this evolution is activated.
@export_enum("level", "item", "condition") var evolution_trigger_type: String = "level"

## The value associated with the trigger:
##   - "level"     → int (the level threshold, e.g. 16)
##   - "item"      → int (the item_id of the evolution catalyst)
##   - "condition" → String (a condition key, e.g. "win_10_battles_no_faint")
@export var evolution_trigger_value: Variant = 0

## Player-facing description of the evolution requirement.
@export_multiline var evolution_trigger_description: String = ""


## ── Constants ─────────────────────────────────────────────────────────────────

const STAT_KEYS: PackedStringArray = PackedStringArray([
	"hp", "atk", "def", "spd", "sp_atk", "sp_def",
])

const VALID_TRIGGER_TYPES: PackedStringArray = PackedStringArray([
	"level", "item", "condition",
])


## ── Helpers ───────────────────────────────────────────────────────────────────

## Apply this stage's multipliers to a raw stat dictionary.
## Returns a new dictionary with floored int values.
func apply_multipliers(raw_stats: Dictionary) -> Dictionary:
	var result := {}
	for key in STAT_KEYS:
		var base_val: float = float(raw_stats.get(key, 0))
		var mult: float = float(stat_multipliers.get(key, 1.0))
		result[key] = int(base_val * mult)
	return result


## Get the list of abilities learned at or before the given level for this stage.
func get_abilities_at_level(level: int) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for change in ability_changes:
		if change.get("learn_level", 999) <= level:
			result.append(change)
	return result


## Check whether a Sprite instance meets the trigger for evolving INTO this stage.
## For stage 1 (base form) this always returns false — nothing evolves into stage 1.
func can_evolve(current_level: int, held_item_id: int, condition_flags: Dictionary) -> bool:
	if stage_number <= 1:
		return false  # Base form is not an evolution target.

	match evolution_trigger_type:
		"level":
			return current_level >= int(evolution_trigger_value)
		"item":
			return held_item_id == int(evolution_trigger_value)
		"condition":
			var cond_key: String = str(evolution_trigger_value)
			return condition_flags.get(cond_key, false)
		_:
			push_warning("Unknown evolution_trigger_type: %s" % evolution_trigger_type)
			return false


## True if this is the final evolution stage.
func is_final_stage() -> bool:
	return stage_number == 3


## Validate data integrity. Returns array of error strings (empty = valid).
func validate() -> Array[String]:
	var errors: Array[String] = []
	if form_id <= 0 or form_id > 72:
		errors.append("form_id must be 1-72, got %d." % form_id)
	if race_id <= 0:
		errors.append("race_id must be a positive integer.")
	if stage_number < 1 or stage_number > 3:
		errors.append("stage_number must be 1-3, got %d." % stage_number)
	if evolution_trigger_type not in VALID_TRIGGER_TYPES:
		errors.append("evolution_trigger_type '%s' is invalid." % evolution_trigger_type)
	for key in STAT_KEYS:
		if not stat_multipliers.has(key):
			errors.append("stat_multipliers missing key '%s'." % key)
		elif float(stat_multipliers[key]) <= 0.0:
			errors.append("stat_multipliers['%s'] must be > 0." % key)
	for i in ability_changes.size():
		var ac: Dictionary = ability_changes[i]
		if not ac.has("learn_level") or not ac.has("ability_id"):
			errors.append("ability_changes[%d] missing required keys." % i)
	return errors

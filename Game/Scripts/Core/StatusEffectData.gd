## StatusEffectData — Data model for buffs, debuffs, and conditions.
## [P2-003] Defines duration, stat modifiers, DoT, action prevention,
## forced movement, stacking rules, and presentation for status effects.
class_name StatusEffectData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

@export var effect_id: int = 0
@export var effect_name: String = ""

## ── Effect Classification ─────────────────────────────────────────────────────

## The high-level category of this effect.
@export_enum("buff", "debuff", "condition") var effect_type: String = "debuff"

## ── Duration ──────────────────────────────────────────────────────────────────

## Number of turns this effect lasts. -1 = permanent until cleansed/replaced.
@export var duration_turns: int = 3

## ── Stat Modifiers ────────────────────────────────────────────────────────────

## Multiplicative modifiers to stats while this effect is active.
## Keys: any of {hp, atk, def, spd, sp_atk, sp_def}.
## Values: float multipliers (e.g. 0.5 = halved, 1.5 = 50% boost).
## Only include stats that are actually modified; missing keys = 1.0 (no change).
@export var stat_modifiers: Dictionary = {}

## ── Damage over Time ──────────────────────────────────────────────────────────

## Flat damage dealt at the end of each turn (or healed if negative).
## Set to 0 for non-DoT effects.
@export var damage_per_turn: int = 0

## If true, damage_per_turn is treated as a percentage of the unit's max HP
## rather than a flat value.
@export var damage_per_turn_is_percent: bool = false

## ── Action Control ────────────────────────────────────────────────────────────

## If true, the affected unit cannot take any action on their turn
## (e.g. Stun, Freeze, Sleep).
@export var prevents_action: bool = false

## If true, the affected unit is forced to move (e.g. Confusion, Fear).
## The actual movement logic is handled by the battle system.
@export var forces_movement: bool = false

## ── Stacking Rules ────────────────────────────────────────────────────────────

## How this effect interacts with itself when reapplied.
##   none    — cannot be applied if already active
##   refresh — resets duration to full without changing stacks
##   stack   — adds a new stack (up to max_stacks), each independently tracked
##   replace — removes the old instance and applies a fresh one
@export_enum("none", "refresh", "stack", "replace") var stacking_rule: String = "refresh"

## Maximum number of stacks allowed when stacking_rule is "stack".
@export_range(1, 10) var max_stacks: int = 1

## ── Cleansing ─────────────────────────────────────────────────────────────────

## Whether this effect can be removed by cleansing abilities.
## Some boss conditions or story effects are not cleansable.
@export var can_be_cleansed: bool = true

## ── Presentation ──────────────────────────────────────────────────────────────

@export_file("*.png,*.tres") var icon_path: String = ""
@export_file("*.tscn,*.tres") var vfx_path: String = ""
@export_multiline var description: String = ""


## ── Constants ─────────────────────────────────────────────────────────────────

const VALID_EFFECT_TYPES: PackedStringArray = PackedStringArray([
	"buff", "debuff", "condition",
])

const VALID_STACKING_RULES: PackedStringArray = PackedStringArray([
	"none", "refresh", "stack", "replace",
])

const STAT_KEYS := ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]


## ── Helpers ───────────────────────────────────────────────────────────────────

## Whether this effect modifies any stats.
func has_stat_modifiers() -> bool:
	return not stat_modifiers.is_empty()


## Whether this effect deals (or heals) damage each turn.
func has_dot() -> bool:
	return damage_per_turn != 0


## Calculate the actual DoT damage for a unit with the given max HP.
func get_dot_damage(max_hp: int) -> int:
	if damage_per_turn_is_percent:
		return int(float(max_hp) * float(damage_per_turn) / 100.0)
	return damage_per_turn


## Whether this effect is considered negative (debuff or harmful condition).
func is_negative() -> bool:
	if effect_type == "buff":
		return false
	if effect_type == "debuff":
		return true
	# Conditions: consider negative if they prevent action, force movement, or deal damage.
	return prevents_action or forces_movement or damage_per_turn > 0


## Get the combined stat multiplier for a given stat key, considering stacks.
func get_stat_multiplier(stat_key: String, stack_count: int = 1) -> float:
	if not stat_modifiers.has(stat_key):
		return 1.0
	var base_mod: float = float(stat_modifiers[stat_key])
	if stacking_rule == "stack" and stack_count > 1:
		# Stacking: each stack compounds the modifier.
		# e.g. 0.9 atk with 3 stacks = 0.9^3 = 0.729
		return pow(base_mod, float(stack_count))
	return base_mod


## Whether this effect is permanent (no natural expiry).
func is_permanent() -> bool:
	return duration_turns < 0


## ── Validation ────────────────────────────────────────────────────────────────

func validate() -> Array[String]:
	var errors: Array[String] = []
	if effect_id <= 0:
		errors.append("effect_id must be a positive integer.")
	if effect_name.is_empty():
		errors.append("effect_name is required.")
	if effect_type not in VALID_EFFECT_TYPES:
		errors.append("effect_type '%s' is invalid." % effect_type)
	if duration_turns == 0:
		errors.append("duration_turns must be > 0 or -1 for permanent.")
	if stacking_rule not in VALID_STACKING_RULES:
		errors.append("stacking_rule '%s' is invalid." % stacking_rule)
	if stacking_rule == "stack" and max_stacks < 1:
		errors.append("max_stacks must be >= 1 when stacking_rule is 'stack'.")
	for key in stat_modifiers:
		if key not in STAT_KEYS:
			errors.append("stat_modifiers key '%s' is not a valid stat." % str(key))
		elif float(stat_modifiers[key]) <= 0.0:
			errors.append("stat_modifiers['%s'] must be > 0." % str(key))
	return errors

## AbilityData — Base data schema for one of the 160 abilities in Sprite Wars.
## [P2-001] Defines power, accuracy, cooldowns, status effects, targeting,
## and all presentation references for a single ability.
class_name AbilityData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

@export var ability_id: int = 0
@export var ability_name: String = ""

## ── Element & Class ───────────────────────────────────────────────────────────

## The element this ability belongs to (used for STAB and effectiveness).
@export var element_type: String = ""

## The class that gains an affinity bonus when using this ability.
@export var class_affinity: String = ""

## ── Targeting ─────────────────────────────────────────────────────────────────

## References a TargetingData.targeting_name (one of the 15 canonical types).
@export var targeting_type: String = "single"

## ── Power & Accuracy ──────────────────────────────────────────────────────────

## Raw damage value before modifiers. 0 for pure status/utility abilities.
@export var base_power: int = 0

## Hit chance as a float in [0.0, 1.0]. 1.0 = guaranteed hit.
@export_range(0.0, 1.0, 0.01) var accuracy: float = 1.0

## True = physical (uses atk/def), False = special (uses sp_atk/sp_def).
@export var is_physical: bool = true

## Additive bonus to the base critical hit rate (typically 0.0 to 0.5).
@export_range(0.0, 1.0, 0.01) var crit_rate_bonus: float = 0.0

## ── Resource Management ───────────────────────────────────────────────────────

## Number of uses before the ability must recharge.
@export_range(1, 99) var pp_max: int = 10

## Turns of cooldown after all PP is spent (0 = instant recharge next turn).
@export_range(0, 10) var cooldown_turns: int = 0

## ── Priority ──────────────────────────────────────────────────────────────────

## Shifts turn order. Positive = acts sooner, negative = acts later.
## Range: -3 (very slow) to +3 (very fast).
@export_range(-3, 3) var priority_modifier: int = 0

## ── Status Effects ────────────────────────────────────────────────────────────

## IDs of StatusEffectData resources that may be applied on hit.
@export var status_effect_ids: Array[int] = []

## Chance each status effect is applied (shared for all effects on this ability).
@export_range(0.0, 1.0, 0.01) var status_apply_chance: float = 0.0

## ── Presentation ──────────────────────────────────────────────────────────────

## Reference key for the combat animation (looked up by the animation system).
@export var animation_ref: String = ""

## Reference key for the sound effect.
@export var sfx_ref: String = ""

## Reference key for the visual effect overlay.
@export var vfx_ref: String = ""

## Player-facing description of the ability.
@export_multiline var description: String = ""


## ── Constants ─────────────────────────────────────────────────────────────────

const MAX_PRIORITY: int = 3
const MIN_PRIORITY: int = -3


## ── Helpers ───────────────────────────────────────────────────────────────────

## Whether this ability deals damage (vs. pure utility/status).
func is_damaging() -> bool:
	return base_power > 0


## Whether this ability carries at least one status effect.
func has_status_effects() -> bool:
	return not status_effect_ids.is_empty() and status_apply_chance > 0.0


## Calculate raw damage output before defense/resistance modifiers.
## [attacker_stat] is the relevant offensive stat (atk or sp_atk).
## [level] is the attacker's level.
## [stab_bonus] is the Same-Type Attack Bonus multiplier (typically 1.0 or 1.5).
## [effectiveness] is the element effectiveness multiplier.
## [is_crit] applies a fixed 1.5x crit multiplier.
func calculate_raw_damage(
	attacker_stat: int,
	level: int,
	stab_bonus: float = 1.0,
	effectiveness: float = 1.0,
	is_crit: bool = false,
) -> int:
	if base_power <= 0:
		return 0
	# Standard formula: ((2 * level / 5 + 2) * power * atk / 50 + 2) * modifiers
	var level_factor: float = (2.0 * float(level) / 5.0 + 2.0)
	var raw: float = (level_factor * float(base_power) * float(attacker_stat)) / 50.0 + 2.0
	raw *= stab_bonus
	raw *= effectiveness
	if is_crit:
		raw *= 1.5
	return maxi(1, int(raw))


## Return the stat key used for offense (atk vs sp_atk).
func get_offense_stat_key() -> String:
	return "atk" if is_physical else "sp_atk"


## Return the stat key used for defense (def vs sp_def).
func get_defense_stat_key() -> String:
	return "def" if is_physical else "sp_def"


## ── Validation ────────────────────────────────────────────────────────────────

func validate() -> Array[String]:
	var errors: Array[String] = []
	if ability_id <= 0:
		errors.append("ability_id must be a positive integer.")
	if ability_name.is_empty():
		errors.append("ability_name is required.")
	if element_type.is_empty():
		errors.append("element_type is required.")
	if base_power < 0:
		errors.append("base_power cannot be negative.")
	if accuracy < 0.0 or accuracy > 1.0:
		errors.append("accuracy must be in [0.0, 1.0].")
	if pp_max < 1:
		errors.append("pp_max must be at least 1.")
	if priority_modifier < MIN_PRIORITY or priority_modifier > MAX_PRIORITY:
		errors.append("priority_modifier must be in [%d, %d]." % [MIN_PRIORITY, MAX_PRIORITY])
	if status_apply_chance < 0.0 or status_apply_chance > 1.0:
		errors.append("status_apply_chance must be in [0.0, 1.0].")
	if not status_effect_ids.is_empty() and status_apply_chance <= 0.0:
		errors.append("status_effect_ids are set but status_apply_chance is 0.")
	return errors

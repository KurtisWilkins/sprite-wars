## CompositionBonusData — Data model for team composition synergy bonuses.
## [P9-011] When a player's team has enough Sprites of a matching element,
## class, or mixed combination, tiered stat bonuses activate. This encourages
## strategic team building beyond raw power.
class_name CompositionBonusData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

@export var bonus_id: int = 0
@export var bonus_name: String = ""

## ── Bonus Type ────────────────────────────────────────────────────────────────

## The category of composition this bonus checks for.
@export_enum("element", "class", "mixed") var bonus_type: String = "element"

## For element bonuses: the required element name (e.g. "Fire").
@export var required_element: String = ""

## For class bonuses: the required class name (e.g. "Knight").
@export var required_class: String = ""

## For mixed bonuses: an array of specific requirements.
## Each entry: {type: String ("element" or "class"), value: String, count: int}
## Example: [{type: "element", value: "Fire", count: 2}, {type: "class", value: "Knight", count: 1}]
@export var mixed_requirements: Array[Dictionary] = []

## ── Tiers ─────────────────────────────────────────────────────────────────────

## How many matching Sprites are needed for each tier.
## Example: [3, 5, 7] means tier 1 at 3 matches, tier 2 at 5, tier 3 at 7.
@export var tier_thresholds: Array[int] = []

## Effects granted at each tier. Must have the same length as tier_thresholds.
## Each entry:
##   {
##     "stat_bonuses": Dictionary {stat_key: float_multiplier},
##     "description": String,
##   }
## stat_bonuses are multiplicative team-wide bonuses (e.g. {"atk": 1.1} = +10% atk).
@export var tier_effects: Array[Dictionary] = []

## ── Unlock ────────────────────────────────────────────────────────────────────

## Quest ID that must be completed before this composition bonus is usable.
## 0 or -1 means no quest prerequisite (available from the start).
@export var unlock_quest_id: int = 0

## ── Presentation ──────────────────────────────────────────────────────────────

@export_file("*.png,*.tres") var icon_path: String = ""
@export_multiline var description: String = ""


## ── Constants ─────────────────────────────────────────────────────────────────

const VALID_BONUS_TYPES: PackedStringArray = PackedStringArray([
	"element", "class", "mixed",
])

const STAT_KEYS: PackedStringArray = PackedStringArray([
	"hp", "atk", "def", "spd", "sp_atk", "sp_def",
])


## ── Helpers ───────────────────────────────────────────────────────────────────

## Determine the highest active tier for a given team.
##
## [team] — Array of SpriteInstance (or any objects with `race_id`).
## [race_registry] — Dictionary mapping race_id → SpriteRaceData.
##
## Returns the 0-based tier index that is active, or -1 if no tier is met.
func get_active_tier(team: Array, race_registry: Dictionary) -> int:
	var matching_count: int = _count_matching(team, race_registry)
	var active_tier: int = -1
	for i in tier_thresholds.size():
		if matching_count >= tier_thresholds[i]:
			active_tier = i
	return active_tier


## Get the stat bonuses for the active tier. Returns empty Dictionary if no tier is active.
func get_active_bonuses(team: Array, race_registry: Dictionary) -> Dictionary:
	var tier: int = get_active_tier(team, race_registry)
	if tier < 0 or tier >= tier_effects.size():
		return {}
	return tier_effects[tier].get("stat_bonuses", {})


## Get the human-readable description for the active tier.
func get_active_description(team: Array, race_registry: Dictionary) -> String:
	var tier: int = get_active_tier(team, race_registry)
	if tier < 0 or tier >= tier_effects.size():
		return ""
	return tier_effects[tier].get("description", "")


## Whether this bonus requires a quest to be completed.
func requires_quest_unlock() -> bool:
	return unlock_quest_id > 0


## Whether this bonus is unlocked given the player's completed quest list.
func is_unlocked(completed_quest_ids: Array[int]) -> bool:
	if not requires_quest_unlock():
		return true
	return unlock_quest_id in completed_quest_ids


## ── Private ───────────────────────────────────────────────────────────────────

## Count how many team members satisfy this bonus's requirements.
func _count_matching(team: Array, race_registry: Dictionary) -> int:
	match bonus_type:
		"element":
			return _count_element_matches(team, race_registry, required_element)
		"class":
			return _count_class_matches(team, race_registry, required_class)
		"mixed":
			return _count_mixed_matches(team, race_registry)
		_:
			return 0


## Count team members with the given element.
func _count_element_matches(team: Array, race_registry: Dictionary, element: String) -> int:
	var count := 0
	for sprite in team:
		var race_data: SpriteRaceData = race_registry.get(sprite.race_id) as SpriteRaceData
		if race_data and race_data.has_element(element):
			count += 1
	return count


## Count team members with the given class.
func _count_class_matches(team: Array, race_registry: Dictionary, class_name_val: String) -> int:
	var count := 0
	for sprite in team:
		var race_data: SpriteRaceData = race_registry.get(sprite.race_id) as SpriteRaceData
		if race_data and race_data.class_type == class_name_val:
			count += 1
	return count


## For mixed bonuses, check if ALL requirements are met and return the minimum
## match count (the bottleneck). This determines the effective tier.
func _count_mixed_matches(team: Array, race_registry: Dictionary) -> int:
	if mixed_requirements.is_empty():
		return 0
	# For mixed bonuses, we check each requirement independently and return
	# the "total matching Sprites" as the minimum across all requirement ratios.
	var min_ratio: float = INF
	for req in mixed_requirements:
		var req_type: String = req.get("type", "")
		var req_value: String = req.get("value", "")
		var req_count: int = int(req.get("count", 1))
		var actual: int = 0
		match req_type:
			"element":
				actual = _count_element_matches(team, race_registry, req_value)
			"class":
				actual = _count_class_matches(team, race_registry, req_value)
		# How many times this requirement is satisfied.
		var ratio: float = float(actual) / float(maxi(req_count, 1))
		min_ratio = minf(min_ratio, ratio)
	# The effective "matching count" is based on the limiting ratio applied
	# to the first tier threshold, but we keep it simple: floor of min_ratio
	# as the number of complete "sets".
	if min_ratio == INF:
		return 0
	return int(min_ratio)


## ── Validation ────────────────────────────────────────────────────────────────

func validate() -> Array[String]:
	var errors: Array[String] = []
	if bonus_id <= 0:
		errors.append("bonus_id must be a positive integer.")
	if bonus_name.is_empty():
		errors.append("bonus_name is required.")
	if bonus_type not in VALID_BONUS_TYPES:
		errors.append("bonus_type '%s' is invalid." % bonus_type)
	if bonus_type == "element" and required_element.is_empty():
		errors.append("element bonuses require a required_element.")
	if bonus_type == "class" and required_class.is_empty():
		errors.append("class bonuses require a required_class.")
	if bonus_type == "mixed" and mixed_requirements.is_empty():
		errors.append("mixed bonuses require at least one mixed_requirement.")
	if tier_thresholds.is_empty():
		errors.append("At least one tier_threshold is required.")
	if tier_thresholds.size() != tier_effects.size():
		errors.append("tier_thresholds and tier_effects must have the same length.")
	for i in tier_thresholds.size():
		if tier_thresholds[i] < 1:
			errors.append("tier_thresholds[%d] must be >= 1." % i)
		if i > 0 and tier_thresholds[i] <= tier_thresholds[i - 1]:
			errors.append("tier_thresholds must be strictly increasing.")
	for i in tier_effects.size():
		if not tier_effects[i].has("stat_bonuses"):
			errors.append("tier_effects[%d] missing 'stat_bonuses'." % i)
		if not tier_effects[i].has("description"):
			errors.append("tier_effects[%d] missing 'description'." % i)
	for i in mixed_requirements.size():
		var req: Dictionary = mixed_requirements[i]
		if not req.has("type") or req["type"] not in ["element", "class"]:
			errors.append("mixed_requirements[%d] 'type' must be 'element' or 'class'." % i)
		if not req.has("value") or str(req.get("value", "")).is_empty():
			errors.append("mixed_requirements[%d] missing 'value'." % i)
		if not req.has("count") or int(req.get("count", 0)) < 1:
			errors.append("mixed_requirements[%d] 'count' must be >= 1." % i)
	return errors

## CompositionBonusSystem — Evaluates a player's team against all composition
## bonus definitions and returns which bonuses are active with their stat effects.
## Also provides "near bonus" detection for UI hints showing bonuses close to
## activating at the next tier threshold.
class_name CompositionBonusSystem
extends RefCounted

## ── Constants ────────────────────────────────────────────────────────────────

## Distance (in number of matching units) to consider a bonus "near" activation.
const NEAR_THRESHOLD: int = 1


## ── Public API ──────────────────────────────────────────────────────────────

## Evaluate the team against all bonus definitions.
## Only checks bonuses the player has unlocked.
## Returns an array of active bonuses:
## [{bonus_data: Dictionary, active_tier: int, stat_effects: Dictionary}]
##
## Parameters:
##   team           — Array of SpriteInstance (the player's battle team).
##   all_bonuses    — Array of CompositionBonusData resources or dictionaries.
##   unlocked_bonus_ids — Array[int] of bonus IDs the player has unlocked.
static func evaluate_team(
	team: Array,
	all_bonuses: Array,
	unlocked_bonus_ids: Array,
) -> Array[Dictionary]:
	var active_bonuses: Array[Dictionary] = []

	for bonus in all_bonuses:
		var bonus_id: int = _get_bonus_id(bonus)
		if bonus_id <= 0:
			continue

		# Check unlock status. Bonuses with unlock_quest_id <= 0 are always available.
		var unlock_quest_id: int = _get_unlock_quest_id(bonus)
		if unlock_quest_id > 0 and bonus_id not in unlocked_bonus_ids:
			continue

		var bonus_type: String = _get_bonus_type(bonus)
		var tier: int = -1

		match bonus_type:
			"element":
				var element: String = _get_required_element(bonus)
				var thresholds: Array = _get_tier_thresholds(bonus)
				tier = check_element_bonus(team, element, thresholds)
			"class":
				var class_type: String = _get_required_class(bonus)
				var thresholds: Array = _get_tier_thresholds(bonus)
				tier = check_class_bonus(team, class_type, thresholds)
			"mixed":
				var requirements: Array = _get_mixed_requirements(bonus)
				tier = check_mixed_bonus(team, requirements)

		if tier >= 0:
			var effects: Dictionary = _get_tier_effects_at(bonus, tier)
			active_bonuses.append({
				"bonus_data": bonus,
				"active_tier": tier,
				"stat_effects": effects.get("stat_bonuses", {}),
			})

	return active_bonuses


## Check an element-type bonus. Returns the highest tier achieved (0-based),
## or -1 if no tier is met.
static func check_element_bonus(
	team: Array,
	required_element: String,
	thresholds: Array,
) -> int:
	var count: int = _count_team_element(team, required_element)
	return _get_highest_tier(count, thresholds)


## Check a class-type bonus. Returns the highest tier achieved (0-based),
## or -1 if no tier is met.
static func check_class_bonus(
	team: Array,
	required_class: String,
	thresholds: Array,
) -> int:
	var count: int = _count_team_class(team, required_class)
	return _get_highest_tier(count, thresholds)


## Check a mixed-type bonus. Uses minimum-ratio approach from CompositionBonusData.
## Returns the highest tier achieved (0-based), or -1 if requirements not met.
static func check_mixed_bonus(
	team: Array,
	requirements: Array,
) -> int:
	if requirements.is_empty():
		return -1

	# For mixed bonuses, we check if all requirements are met simultaneously.
	# The effective tier is determined by how many complete "sets" the team has.
	var min_ratio: float = INF

	for req: Dictionary in requirements:
		var req_type: String = str(req.get("type", ""))
		var req_value: String = str(req.get("value", ""))
		var req_count: int = int(req.get("count", 1))
		var actual: int = 0

		match req_type:
			"element":
				actual = _count_team_element(team, req_value)
			"class":
				actual = _count_team_class(team, req_value)

		var ratio: float = float(actual) / float(maxi(req_count, 1))
		min_ratio = minf(min_ratio, ratio)

	if min_ratio == INF or min_ratio < 1.0:
		return -1

	# The effective "set count" determines the tier.
	# For mixed bonuses the thresholds are typically [1, 2, 3] representing
	# number of complete sets.
	return int(min_ratio) - 1  # 0-based tier index.


## Aggregate all stat bonuses from a list of active bonuses into a single dictionary.
## Returns {stat_name: total_bonus_multiplier}.
static func get_total_stat_bonuses(active_bonuses: Array) -> Dictionary:
	var totals: Dictionary = {}

	for bonus_entry: Dictionary in active_bonuses:
		var effects: Dictionary = bonus_entry.get("stat_effects", {})
		for stat_key: String in effects:
			var current: float = float(totals.get(stat_key, 1.0))
			var bonus_mult: float = float(effects[stat_key])
			# Composition bonuses are multiplicative (e.g., 1.1 means +10%).
			# We accumulate them multiplicatively.
			totals[stat_key] = current * bonus_mult

	return totals


## Find bonuses that are within NEAR_THRESHOLD units of activating the next tier.
## Useful for UI hints like "Add 1 more Fire Sprite for Fire Synergy Tier 1!"
## Returns: [{bonus_data, current_count, needed_count, next_tier}]
static func get_near_bonuses(
	team: Array,
	all_bonuses: Array,
	unlocked_ids: Array,
) -> Array:
	var near: Array = []

	for bonus in all_bonuses:
		var bonus_id: int = _get_bonus_id(bonus)
		if bonus_id <= 0:
			continue

		var unlock_quest_id: int = _get_unlock_quest_id(bonus)
		if unlock_quest_id > 0 and bonus_id not in unlocked_ids:
			continue

		var bonus_type: String = _get_bonus_type(bonus)
		var thresholds: Array = _get_tier_thresholds(bonus)

		if bonus_type == "element":
			var element: String = _get_required_element(bonus)
			var count: int = _count_team_element(team, element)
			var near_info: Dictionary = _check_near_tier(count, thresholds, bonus)
			if not near_info.is_empty():
				near.append(near_info)

		elif bonus_type == "class":
			var class_type: String = _get_required_class(bonus)
			var count: int = _count_team_class(team, class_type)
			var near_info: Dictionary = _check_near_tier(count, thresholds, bonus)
			if not near_info.is_empty():
				near.append(near_info)

		# Mixed bonuses are more complex; skip near-detection for them.

	return near


## ── Private Helpers: Team Counting ──────────────────────────────────────────

## Count team members with a matching element. Uses SpriteRaces registry lookup.
static func _count_team_element(team: Array, element: String) -> int:
	var count: int = 0
	for sprite in team:
		if not (sprite is SpriteInstance):
			continue
		var race_data: Dictionary = SpriteRaces.get_race((sprite as SpriteInstance).race_id)
		var elements: Array = race_data.get("element_types", [])
		if element in elements:
			count += 1
	return count


## Count team members with a matching class type.
static func _count_team_class(team: Array, class_type: String) -> int:
	var count: int = 0
	for sprite in team:
		if not (sprite is SpriteInstance):
			continue
		var race_data: Dictionary = SpriteRaces.get_race((sprite as SpriteInstance).race_id)
		if race_data.get("class_type", "") == class_type:
			count += 1
	return count


## ── Private Helpers: Tier Resolution ────────────────────────────────────────

## Given a count and tier thresholds, return the highest achieved tier (0-based)
## or -1 if no tier is met.
static func _get_highest_tier(count: int, thresholds: Array) -> int:
	var active_tier: int = -1
	for i in thresholds.size():
		if count >= int(thresholds[i]):
			active_tier = i
	return active_tier


## Check if a count is near (within NEAR_THRESHOLD) of the next unmet tier.
## Returns a dictionary with near-bonus info, or empty if not near.
static func _check_near_tier(
	count: int,
	thresholds: Array,
	bonus,
) -> Dictionary:
	# Find the first unmet tier.
	for i in thresholds.size():
		var threshold: int = int(thresholds[i])
		if count < threshold:
			var deficit: int = threshold - count
			if deficit <= NEAR_THRESHOLD:
				return {
					"bonus_data": bonus,
					"current_count": count,
					"needed_count": threshold,
					"next_tier": i,
				}
			return {}  # Too far from next tier.
	return {}  # All tiers already met.


## ── Private Helpers: Bonus Data Access ──────────────────────────────────────
## These accessors handle both Resource (CompositionBonusData) and Dictionary forms.

static func _get_bonus_id(bonus) -> int:
	if bonus is CompositionBonusData:
		return (bonus as CompositionBonusData).bonus_id
	if bonus is Dictionary:
		return int(bonus.get("bonus_id", 0))
	return 0


static func _get_unlock_quest_id(bonus) -> int:
	if bonus is CompositionBonusData:
		return (bonus as CompositionBonusData).unlock_quest_id
	if bonus is Dictionary:
		return int(bonus.get("unlock_quest_id", 0))
	return 0


static func _get_bonus_type(bonus) -> String:
	if bonus is CompositionBonusData:
		return (bonus as CompositionBonusData).bonus_type
	if bonus is Dictionary:
		return str(bonus.get("bonus_type", ""))
	return ""


static func _get_required_element(bonus) -> String:
	if bonus is CompositionBonusData:
		return (bonus as CompositionBonusData).required_element
	if bonus is Dictionary:
		return str(bonus.get("required_element", ""))
	return ""


static func _get_required_class(bonus) -> String:
	if bonus is CompositionBonusData:
		return (bonus as CompositionBonusData).required_class
	if bonus is Dictionary:
		return str(bonus.get("required_class", ""))
	return ""


static func _get_tier_thresholds(bonus) -> Array:
	if bonus is CompositionBonusData:
		return (bonus as CompositionBonusData).tier_thresholds
	if bonus is Dictionary:
		return bonus.get("tier_thresholds", [])
	return []


static func _get_mixed_requirements(bonus) -> Array:
	if bonus is CompositionBonusData:
		return (bonus as CompositionBonusData).mixed_requirements
	if bonus is Dictionary:
		return bonus.get("mixed_requirements", [])
	return []


static func _get_tier_effects_at(bonus, tier: int) -> Dictionary:
	var effects: Array = []
	if bonus is CompositionBonusData:
		effects = (bonus as CompositionBonusData).tier_effects
	elif bonus is Dictionary:
		effects = bonus.get("tier_effects", [])
	if tier >= 0 and tier < effects.size():
		return effects[tier]
	return {}

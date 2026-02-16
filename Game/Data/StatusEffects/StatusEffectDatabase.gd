## StatusEffectDatabase -- Static database of all status effects.
## Defines 24 status effects used by abilities in AbilityDatabase.gd.
##
## Design notes:
##   - effect_type categories: "dot" (damage over time), "disable" (prevents action),
##     "stat_buff", "stat_debuff", "heal_over_time", "shield", "taunt", "special"
##   - duration_turns: -1 means permanent until cleansed; 0 means instant
##   - stat_modifiers: dict of stat_name -> float multiplier offset (e.g., 0.25 = +25%)
##   - damage_per_turn: fraction of max HP dealt each turn (0.0625 = 1/16)
##   - stacking_rule: "refresh" (resets duration), "stack" (adds stacks), "none" (cannot reapply)
##   - prevents_action: true if the effect can stop a Sprite from acting
class_name StatusEffectDatabase
extends RefCounted


static func get_all_effects() -> Array[Dictionary]:
	return [
		# ──────────────────────────────────────────────────────────────────
		# DAMAGE-OVER-TIME (DoT) EFFECTS
		# ──────────────────────────────────────────────────────────────────
		{
			"effect_id": 1,
			"effect_name": "Burn",
			"effect_type": "dot",
			"duration_turns": 4,
			"stat_modifiers": {"atk": -0.15},
			"damage_per_turn": 0.0625,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "Burns the target for 1/16 max HP each turn and reduces ATK by 15%. Lasts 4 turns.",
		},
		{
			"effect_id": 2,
			"effect_name": "Poison",
			"effect_type": "dot",
			"duration_turns": 5,
			"stat_modifiers": {},
			"damage_per_turn": 0.0625,
			"prevents_action": false,
			"stacking_rule": "stack",
			"max_stacks": 3,
			"can_be_cleansed": true,
			"description": "Poisons the target for 1/16 max HP per stack each turn. Stacks up to 3 times. Lasts 5 turns.",
		},
		{
			"effect_id": 3,
			"effect_name": "Bleed",
			"effect_type": "dot",
			"duration_turns": 3,
			"stat_modifiers": {},
			"damage_per_turn": 0.083,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "The target bleeds for ~1/12 max HP each turn. Lasts 3 turns.",
		},

		# ──────────────────────────────────────────────────────────────────
		# DISABLE / CROWD CONTROL EFFECTS
		# ──────────────────────────────────────────────────────────────────
		{
			"effect_id": 4,
			"effect_name": "Freeze",
			"effect_type": "disable",
			"duration_turns": 2,
			"stat_modifiers": {},
			"damage_per_turn": 0.0,
			"prevents_action": true,
			"stacking_rule": "none",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "Frozen solid. Cannot act for up to 2 turns. 25% chance to break free each turn.",
		},
		{
			"effect_id": 5,
			"effect_name": "Paralysis",
			"effect_type": "disable",
			"duration_turns": 4,
			"stat_modifiers": {"spd": -0.25},
			"damage_per_turn": 0.0,
			"prevents_action": true,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "Paralyzed. 50% chance to be unable to act each turn. SPD reduced by 25%. Lasts 4 turns.",
		},
		{
			"effect_id": 6,
			"effect_name": "Sleep",
			"effect_type": "disable",
			"duration_turns": 3,
			"stat_modifiers": {},
			"damage_per_turn": 0.0,
			"prevents_action": true,
			"stacking_rule": "none",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "Asleep. Cannot act. Wakes on taking damage or after 3 turns.",
		},
		{
			"effect_id": 7,
			"effect_name": "Confusion",
			"effect_type": "disable",
			"duration_turns": 3,
			"stat_modifiers": {},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "Confused. 33% chance to hit self instead of the target each turn. Lasts 3 turns.",
		},
		{
			"effect_id": 8,
			"effect_name": "Fear",
			"effect_type": "disable",
			"duration_turns": 2,
			"stat_modifiers": {"atk": -0.20, "sp_atk": -0.20},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "Frightened. ATK and SP.ATK reduced by 20%. 30% chance to skip turn. Lasts 2 turns.",
		},

		# ──────────────────────────────────────────────────────────────────
		# STAT BUFF EFFECTS
		# ──────────────────────────────────────────────────────────────────
		{
			"effect_id": 9,
			"effect_name": "ATK Up",
			"effect_type": "stat_buff",
			"duration_turns": 4,
			"stat_modifiers": {"atk": 0.30},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": false,
			"description": "ATK increased by 30% for 4 turns.",
		},
		{
			"effect_id": 10,
			"effect_name": "DEF Up",
			"effect_type": "stat_buff",
			"duration_turns": 4,
			"stat_modifiers": {"def": 0.30},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": false,
			"description": "DEF increased by 30% for 4 turns.",
		},
		{
			"effect_id": 11,
			"effect_name": "SPD Up",
			"effect_type": "stat_buff",
			"duration_turns": 4,
			"stat_modifiers": {"spd": 0.30},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": false,
			"description": "SPD increased by 30% for 4 turns.",
		},
		{
			"effect_id": 12,
			"effect_name": "SP.ATK Up",
			"effect_type": "stat_buff",
			"duration_turns": 4,
			"stat_modifiers": {"sp_atk": 0.30},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": false,
			"description": "SP.ATK increased by 30% for 4 turns.",
		},
		{
			"effect_id": 13,
			"effect_name": "SP.DEF Up",
			"effect_type": "stat_buff",
			"duration_turns": 4,
			"stat_modifiers": {"sp_def": 0.30},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": false,
			"description": "SP.DEF increased by 30% for 4 turns.",
		},
		{
			"effect_id": 14,
			"effect_name": "Evasion Up",
			"effect_type": "stat_buff",
			"duration_turns": 3,
			"stat_modifiers": {"evasion": 0.25},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": false,
			"description": "Evasion increased by 25% for 3 turns.",
		},

		# ──────────────────────────────────────────────────────────────────
		# STAT DEBUFF EFFECTS
		# ──────────────────────────────────────────────────────────────────
		{
			"effect_id": 15,
			"effect_name": "ATK Down",
			"effect_type": "stat_debuff",
			"duration_turns": 4,
			"stat_modifiers": {"atk": -0.30},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "ATK reduced by 30% for 4 turns.",
		},
		{
			"effect_id": 16,
			"effect_name": "DEF Down",
			"effect_type": "stat_debuff",
			"duration_turns": 4,
			"stat_modifiers": {"def": -0.30},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "DEF reduced by 30% for 4 turns.",
		},
		{
			"effect_id": 17,
			"effect_name": "SPD Down",
			"effect_type": "stat_debuff",
			"duration_turns": 4,
			"stat_modifiers": {"spd": -0.30},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "SPD reduced by 30% for 4 turns.",
		},
		{
			"effect_id": 18,
			"effect_name": "SP.ATK Down",
			"effect_type": "stat_debuff",
			"duration_turns": 4,
			"stat_modifiers": {"sp_atk": -0.30},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "SP.ATK reduced by 30% for 4 turns.",
		},
		{
			"effect_id": 19,
			"effect_name": "SP.DEF Down",
			"effect_type": "stat_debuff",
			"duration_turns": 4,
			"stat_modifiers": {"sp_def": -0.30},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "SP.DEF reduced by 30% for 4 turns.",
		},
		{
			"effect_id": 20,
			"effect_name": "Accuracy Down",
			"effect_type": "stat_debuff",
			"duration_turns": 3,
			"stat_modifiers": {"accuracy": -0.25},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "Accuracy reduced by 25% for 3 turns.",
		},

		# ──────────────────────────────────────────────────────────────────
		# HEAL / SHIELD / SPECIAL EFFECTS
		# ──────────────────────────────────────────────────────────────────
		{
			"effect_id": 21,
			"effect_name": "Regen",
			"effect_type": "heal_over_time",
			"duration_turns": 4,
			"stat_modifiers": {},
			"damage_per_turn": -0.0625,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": false,
			"description": "Regenerates 1/16 max HP each turn for 4 turns.",
		},
		{
			"effect_id": 22,
			"effect_name": "Shield",
			"effect_type": "shield",
			"duration_turns": 3,
			"stat_modifiers": {},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": false,
			"description": "Absorbs damage equal to 20% of max HP. Lasts 3 turns or until broken.",
		},
		{
			"effect_id": 23,
			"effect_name": "Taunt",
			"effect_type": "taunt",
			"duration_turns": 2,
			"stat_modifiers": {},
			"damage_per_turn": 0.0,
			"prevents_action": false,
			"stacking_rule": "refresh",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "Forces all enemies to target this Sprite for 2 turns.",
		},
		{
			"effect_id": 24,
			"effect_name": "Curse",
			"effect_type": "special",
			"duration_turns": 3,
			"stat_modifiers": {"atk": -0.15, "def": -0.15, "sp_atk": -0.15, "sp_def": -0.15},
			"damage_per_turn": 0.04,
			"prevents_action": false,
			"stacking_rule": "none",
			"max_stacks": 1,
			"can_be_cleansed": true,
			"description": "Cursed. All stats reduced by 15% and takes 1/25 max HP damage per turn. Lasts 3 turns.",
		},
	]


## Return a single effect dictionary by effect_id, or an empty dictionary if not found.
static func get_effect(effect_id: int) -> Dictionary:
	for effect: Dictionary in get_all_effects():
		if effect.get("effect_id", -1) == effect_id:
			return effect
	return {}


## Return all effects of a given type.
static func get_effects_by_type(effect_type: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for effect: Dictionary in get_all_effects():
		if effect.get("effect_type", "") == effect_type:
			result.append(effect)
	return result


## Return all effects that prevent action (for battle system AI).
static func get_disabling_effects() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for effect: Dictionary in get_all_effects():
		if effect.get("prevents_action", false):
			result.append(effect)
	return result


## Return all effects that can be cleansed (for heal/purify abilities).
static func get_cleansable_effects() -> Array[int]:
	var result: Array[int] = []
	for effect: Dictionary in get_all_effects():
		if effect.get("can_be_cleansed", false):
			result.append(int(effect.get("effect_id", -1)))
	return result

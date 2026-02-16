## BattleUnit -- [P3-002] Runtime representation of a single unit in combat.
## Wraps a SpriteInstance with battle-specific mutable state: HP, status effects,
## cooldowns, stat modifiers, and grid position.
class_name BattleUnit
extends RefCounted

## -- Core References ----------------------------------------------------------

## The underlying Sprite data this unit is based on.
var sprite_instance: SpriteInstance = null

## Team assignment: 0 = player, 1 = enemy.
var team: int = 0

## Current position on the BattleGrid.
var grid_position: Vector2i = Vector2i.ZERO

## Cached element types (set during init from SpriteRaceData).
var element_types: Array[String] = []

## -- Health -------------------------------------------------------------------

var current_hp: int = 0
var max_hp: int = 0

## -- Stats --------------------------------------------------------------------

## Effective combat stats after all modifiers. Keys: atk, def, spd, sp_atk, sp_def.
var effective_stats: Dictionary = {
	"atk": 0,
	"def": 0,
	"spd": 0,
	"sp_atk": 0,
	"sp_def": 0,
}

## Base stats from the SpriteInstance (before battle modifiers).
## Used as the reference point for recalculating effective_stats.
var _base_battle_stats: Dictionary = {}

## Active stat multipliers from buffs/debuffs. Maps stat_key -> Array[float].
## Each entry is a multiplier; they are compounded when calculating effective stats.
var _stat_multipliers: Dictionary = {
	"atk": [],
	"def": [],
	"spd": [],
	"sp_atk": [],
	"sp_def": [],
}

## -- Status Effects -----------------------------------------------------------

## Active status effects. Each entry:
## {
##   "effect_data": StatusEffectData,
##   "remaining_turns": int,
##   "stacks": int,
## }
var active_status_effects: Array[Dictionary] = []

## -- Abilities ----------------------------------------------------------------

## Maps ability_id -> turns_remaining until the ability is off cooldown.
## Only contains entries for abilities currently on cooldown.
var ability_cooldowns: Dictionary = {}

## Maps ability_id -> current PP remaining.
var ability_pp: Dictionary = {}

## Ordered list of this unit's equipped AbilityData ability_ids.
var equipped_abilities: Array[int] = []

## -- Derived State ------------------------------------------------------------

## Whether this unit is still alive (HP > 0).
var is_alive: bool:
	get:
		return current_hp > 0

## Whether this unit can take an action this turn.
## False if dead, stunned, frozen, or asleep.
var can_act: bool:
	get:
		if not is_alive:
			return false
		for effect_entry in active_status_effects:
			var effect_data: StatusEffectData = effect_entry.get("effect_data")
			if effect_data != null and effect_data.prevents_action:
				return false
		return true

## -- Constants ----------------------------------------------------------------

const COMBAT_STAT_KEYS: PackedStringArray = PackedStringArray([
	"atk", "def", "spd", "sp_atk", "sp_def",
])

## -- Initialization -----------------------------------------------------------

## Set up the BattleUnit from a SpriteInstance and pre-calculated stats.
## [instance]       -- The SpriteInstance data resource.
## [stats]          -- Full stat dictionary from SpriteInstance.calculate_all_effective_stats().
## [team_id]        -- 0 for player, 1 for enemy.
## [abilities]      -- Array of AbilityData resources this unit can use.
## [elem_types]     -- Element types from the SpriteRaceData for this unit.
func initialize(instance: SpriteInstance, stats: Dictionary, team_id: int, abilities: Array, elem_types: Array[String] = []) -> void:
	sprite_instance = instance
	team = team_id
	element_types = elem_types

	# Set HP from the full stat dict (HP is computed differently from combat stats).
	max_hp = int(stats.get("hp", 1))
	current_hp = max_hp

	# Store base combat stats.
	for key in COMBAT_STAT_KEYS:
		var val: int = int(stats.get(key, 1))
		_base_battle_stats[key] = val
		effective_stats[key] = val

	# Initialize ability PP and cooldowns.
	equipped_abilities.clear()
	ability_pp.clear()
	ability_cooldowns.clear()
	for ability in abilities:
		if ability is AbilityData:
			equipped_abilities.append(ability.ability_id)
			ability_pp[ability.ability_id] = ability.pp_max

	# Clear status effects.
	active_status_effects.clear()
	_reset_multipliers()


## -- Stat Modification --------------------------------------------------------

## Recalculate effective stats from base + all active multipliers.
func calculate_effective_stats() -> void:
	for key in COMBAT_STAT_KEYS:
		var base_val: float = float(_base_battle_stats.get(key, 1))
		var combined_mult: float = 1.0
		for mult in _stat_multipliers.get(key, []):
			combined_mult *= mult
		# Clamp multiplier to prevent stats from going below 25% or above 400%.
		combined_mult = clampf(combined_mult, 0.25, 4.0)
		effective_stats[key] = maxi(1, int(base_val * combined_mult))


## Add a multiplicative stat modifier (e.g. 1.5 for +50%, 0.75 for -25%).
func apply_stat_modifier(stat: String, multiplier: float) -> void:
	if stat not in _stat_multipliers:
		push_warning("BattleUnit: Invalid stat key '%s' for modifier." % stat)
		return
	_stat_multipliers[stat].append(multiplier)
	calculate_effective_stats()


## Remove a specific stat modifier. Removes the first matching value.
func remove_stat_modifier(stat: String, multiplier: float) -> void:
	if stat not in _stat_multipliers:
		return
	var mults: Array = _stat_multipliers[stat]
	var idx: int = mults.find(multiplier)
	if idx >= 0:
		mults.remove_at(idx)
	calculate_effective_stats()


## Clear all stat multipliers (used on battle end or full cleanse).
func _reset_multipliers() -> void:
	for key in COMBAT_STAT_KEYS:
		_stat_multipliers[key] = []

## -- Damage & Healing ---------------------------------------------------------

## Apply damage to this unit. Returns a result dictionary.
## {actual_damage: int, is_fainted: bool}
func take_damage(amount: int) -> Dictionary:
	var actual: int = maxi(0, amount)
	var was_alive: bool = is_alive
	current_hp = maxi(0, current_hp - actual)
	var fainted: bool = was_alive and not is_alive
	return {
		"actual_damage": actual,
		"is_fainted": fainted,
	}


## Heal this unit. Returns the actual amount healed (capped at max HP).
func heal(amount: int) -> int:
	if not is_alive:
		return 0
	var heal_amount: int = maxi(0, amount)
	var old_hp: int = current_hp
	current_hp = mini(current_hp + heal_amount, max_hp)
	return current_hp - old_hp

## -- Cooldown Management ------------------------------------------------------

## Reduce all ability cooldowns by 1 turn. Called at the start of this unit's turn.
func reduce_cooldowns() -> void:
	var to_remove: Array[int] = []
	for ability_id in ability_cooldowns:
		ability_cooldowns[ability_id] -= 1
		if ability_cooldowns[ability_id] <= 0:
			to_remove.append(ability_id)
	for ability_id in to_remove:
		ability_cooldowns.erase(ability_id)


## Consume 1 PP for an ability. If PP reaches 0, start the cooldown.
func consume_pp(ability: AbilityData) -> void:
	var aid: int = ability.ability_id
	if ability_pp.has(aid):
		ability_pp[aid] = maxi(0, ability_pp[aid] - 1)
		if ability_pp[aid] <= 0 and ability.cooldown_turns > 0:
			ability_cooldowns[aid] = ability.cooldown_turns
			# PP will be restored when cooldown expires.


## Restore PP for an ability that has come off cooldown.
func restore_pp(ability: AbilityData) -> void:
	ability_pp[ability.ability_id] = ability.pp_max


## Whether an ability is currently usable (has PP and is not on cooldown).
func can_use_ability(ability: AbilityData) -> bool:
	var aid: int = ability.ability_id
	if ability_cooldowns.has(aid):
		return false
	return ability_pp.get(aid, 0) > 0

## -- Status Effect Queries ----------------------------------------------------

## Check if this unit has a specific status effect by effect_id.
func has_status_effect(effect_id: int) -> bool:
	for entry in active_status_effects:
		var ed: StatusEffectData = entry.get("effect_data")
		if ed != null and ed.effect_id == effect_id:
			return true
	return false


## Get the status effect entry for a given effect_id, or null.
func get_status_effect_entry(effect_id: int) -> Dictionary:
	for entry in active_status_effects:
		var ed: StatusEffectData = entry.get("effect_data")
		if ed != null and ed.effect_id == effect_id:
			return entry
	return {}


## Whether this unit is immune to a given effect type.
## Certain element types grant natural immunity to specific status conditions.
func is_status_immune(effect_type: String) -> bool:
	# Fire-type Sprites are immune to burn.
	if effect_type == "burn" and "Fire" in element_types:
		return true
	# Ice-type Sprites are immune to freeze.
	if effect_type == "freeze" and "Ice" in element_types:
		return true
	# Poison-type Sprites are immune to poison.
	if effect_type == "poison" and "Poison" in element_types:
		return true
	# Electric-type Sprites are immune to paralysis.
	if effect_type == "paralysis" and "Electric" in element_types:
		return true
	return false

## -- Display Helpers ----------------------------------------------------------

## Get the display name for this unit.
func get_display_name() -> String:
	if sprite_instance == null:
		return "Unknown"
	if not sprite_instance.nickname.is_empty():
		return sprite_instance.nickname
	return "Sprite #%d" % sprite_instance.race_id


## Get the current HP as a fraction of max (0.0 - 1.0).
func get_hp_fraction() -> float:
	if max_hp <= 0:
		return 0.0
	return float(current_hp) / float(max_hp)


## Get the unit's level.
func get_level() -> int:
	if sprite_instance == null:
		return 1
	return sprite_instance.level


## Get the unit's element types (cached from race data at init time).
func get_element_types() -> Array[String]:
	return element_types


## Whether this unit has a specific element.
func has_element(element_name: String) -> bool:
	return element_name in element_types

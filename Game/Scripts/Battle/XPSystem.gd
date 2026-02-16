## XPSystem — Experience point calculation, distribution, and leveling logic.
## [Progression] Computes battle XP rewards based on level differentials,
## applies XP to individual Sprites, handles multi-level-up scenarios, and
## queries the cubic XP curve.
class_name XPSystem
extends RefCounted


## ── Constants ───────────────────────────────────────────────────────────────

## Hard level cap for all Sprites.
const MAX_LEVEL: int = 100

## Base XP granted per battle (before level-difference modifiers).
const BASE_BATTLE_XP: int = 50

## XP per average enemy level.
const XP_PER_ENEMY_LEVEL: int = 15

## Minimum XP awarded from any battle (even if player is massively over-leveled).
const MIN_BATTLE_XP: int = 5

## Maximum scaling factor when fighting much higher-level enemies.
const MAX_LEVEL_DIFF_MULTIPLIER: float = 3.0

## Minimum scaling factor when fighting much lower-level enemies.
const MIN_LEVEL_DIFF_MULTIPLIER: float = 0.1


## ── XP Curve ────────────────────────────────────────────────────────────────

## XP threshold required to reach a given level.
## Uses a cubic growth curve: threshold(level) = floor(4 * level^3 / 5)
##
## Parameters:
##   level — the target level (1-100)
##
## Returns:
##   Cumulative XP needed to reach that level from level 1.
static func get_xp_for_level(level: int) -> int:
	if level <= 1:
		return 0
	return int(4.0 * pow(float(level), 3.0) / 5.0)


## XP still needed to advance from [current_level, current_xp] to the next level.
##
## Parameters:
##   current_level — the Sprite's current level
##   current_xp    — XP accumulated since last level-up
##
## Returns:
##   Remaining XP needed. Returns 0 if at or above MAX_LEVEL.
static func get_xp_to_next(current_level: int, current_xp: int) -> int:
	if current_level >= MAX_LEVEL:
		return 0
	var threshold: int = SpriteInstance.xp_for_level(current_level + 1)
	return maxi(0, threshold - current_xp)


## ── Battle XP Calculation ───────────────────────────────────────────────────

## Calculate total XP earned from a battle.
##
## The formula:
##   base_xp = BASE_BATTLE_XP + avg_enemy_level * XP_PER_ENEMY_LEVEL
##   level_diff = avg_enemy_level - avg_player_level
##   modifier = clamp(1.0 + level_diff * 0.1, MIN, MAX)
##   result = max(MIN_BATTLE_XP, floor(base_xp * modifier))
##
## Fighting higher-level enemies yields bonus XP; lower-level yields less.
##
## Parameters:
##   player_levels — Array of int levels of all participating player Sprites
##   enemy_levels  — Array of int levels of all enemy Sprites in the battle
##
## Returns:
##   Total XP to be divided among surviving Sprites.
func calculate_battle_xp(player_levels: Array, enemy_levels: Array) -> int:
	if enemy_levels.is_empty():
		return MIN_BATTLE_XP

	# Calculate average levels.
	var avg_enemy: float = _calculate_average(enemy_levels)
	var avg_player: float = _calculate_average(player_levels) if not player_levels.is_empty() else 1.0

	# Base XP from enemy level.
	var base_xp: float = float(BASE_BATTLE_XP) + avg_enemy * float(XP_PER_ENEMY_LEVEL)

	# Level difference modifier.
	var level_diff: float = avg_enemy - avg_player
	var modifier: float = clampf(
		1.0 + level_diff * 0.1,
		MIN_LEVEL_DIFF_MULTIPLIER,
		MAX_LEVEL_DIFF_MULTIPLIER,
	)

	var total: int = maxi(MIN_BATTLE_XP, int(base_xp * modifier))
	return total


## ── XP Application ──────────────────────────────────────────────────────────

## Apply XP to a single Sprite, processing any level-ups and recording
## newly learned abilities at each level gained.
##
## Parameters:
##   sprite — the SpriteInstance Resource to award XP to
##   amount — XP amount to grant
##
## Returns:
##   Array of level-up event Dictionaries, each containing:
##     {
##       "new_level": int,            — the level just reached
##       "new_abilities": Array[int], — ability IDs available at this level
##       "xp_threshold": int,         — XP that was required for this level
##     }
##   Empty array if no level-ups occurred.
func apply_xp(sprite: Resource, amount: int) -> Array[Dictionary]:
	var level_ups: Array[Dictionary] = []

	if sprite == null or not (sprite is SpriteInstance):
		push_warning("XPSystem.apply_xp: sprite is null or not a SpriteInstance.")
		return level_ups

	if sprite.level >= MAX_LEVEL:
		return level_ups

	if amount <= 0:
		return level_ups

	var old_level: int = sprite.level
	var levels_gained: int = sprite.grant_xp(amount)

	# Record each level-up with its threshold and any new abilities.
	for i in levels_gained:
		var reached_level: int = old_level + i + 1
		var threshold: int = SpriteInstance.xp_for_level(reached_level)

		level_ups.append({
			"new_level": reached_level,
			"new_abilities": [],  # Caller should populate via AbilityLearner
			"xp_threshold": threshold,
		})

	return level_ups


## ── XP Distribution ─────────────────────────────────────────────────────────

## Distribute battle XP among an array of participating Sprites.
## XP is divided equally; each Sprite gets at least 1 XP.
##
## Parameters:
##   sprites    — Array of SpriteInstance Resources that participated
##   total_xp   — total XP pool to distribute
##   fainted_share — fraction of XP that fainted Sprites receive [0.0, 1.0]
##
## Returns:
##   Array of Dictionaries, one per Sprite:
##     {
##       "sprite": SpriteInstance,
##       "xp_received": int,
##       "level_ups": Array[Dictionary],
##     }
func distribute_xp(
	sprites: Array,
	total_xp: int,
	fainted_share: float = 0.0,
) -> Array[Dictionary]:
	var results: Array[Dictionary] = []

	if sprites.is_empty() or total_xp <= 0:
		return results

	# Separate alive and fainted Sprites.
	var alive: Array = []
	var fainted: Array = []
	for sprite in sprites:
		if not (sprite is SpriteInstance):
			continue
		if sprite.is_fainted():
			fainted.append(sprite)
		else:
			alive.append(sprite)

	# Calculate effective recipient count (fainted count as partial).
	var effective_count: float = float(alive.size()) + float(fainted.size()) * fainted_share
	if effective_count < 1.0:
		effective_count = 1.0

	var share_per_unit: int = maxi(1, int(float(total_xp) / effective_count))
	var fainted_xp: int = maxi(0, int(float(share_per_unit) * fainted_share))

	# Apply XP to alive Sprites.
	for sprite: SpriteInstance in alive:
		var level_ups := apply_xp(sprite, share_per_unit)
		results.append({
			"sprite": sprite,
			"xp_received": share_per_unit,
			"level_ups": level_ups,
		})

	# Apply reduced XP to fainted Sprites.
	for sprite: SpriteInstance in fainted:
		if fainted_xp > 0:
			var level_ups := apply_xp(sprite, fainted_xp)
			results.append({
				"sprite": sprite,
				"xp_received": fainted_xp,
				"level_ups": level_ups,
			})

	return results


## ── XP Preview ──────────────────────────────────────────────────────────────

## Preview how many levels a Sprite would gain from a given amount of XP
## without actually applying it.
##
## Parameters:
##   current_level — the Sprite's current level
##   current_xp    — XP accumulated since last level-up
##   xp_amount     — hypothetical XP to add
##
## Returns:
##   Dictionary { "levels_gained": int, "final_level": int, "remaining_xp": int }
func preview_xp_gain(current_level: int, current_xp: int, xp_amount: int) -> Dictionary:
	var lv: int = current_level
	var xp: int = current_xp + xp_amount
	var levels_gained: int = 0

	while lv < MAX_LEVEL:
		var threshold: int = SpriteInstance.xp_for_level(lv + 1)
		if xp < threshold:
			break
		xp -= threshold
		lv += 1
		levels_gained += 1

	if lv >= MAX_LEVEL:
		xp = 0

	return {
		"levels_gained": levels_gained,
		"final_level": lv,
		"remaining_xp": xp,
	}


## ── Internal Helpers ────────────────────────────────────────────────────────

## Calculate the average of an array of int/float values.
func _calculate_average(values: Array) -> float:
	if values.is_empty():
		return 0.0
	var total: float = 0.0
	for v in values:
		total += float(v)
	return total / float(values.size())

## CatchRateCalculator — Computes capture probability and shake sequences.
## [Progression] Determines the catch rate for wild Sprites based on HP, rarity,
## crystal quality, and status conditions. Also simulates the shake-check sequence
## and validates whether catching is allowed in the current battle context.
class_name CatchRateCalculator
extends RefCounted


## ── Status Effect Modifiers ─────────────────────────────────────────────────
## Status conditions that improve catch rate. Sleep and freeze are strongest,
## paralysis and poison moderate, burn weakest.

const STATUS_MODIFIERS: Dictionary = {
	"sleep": 2.0,
	"freeze": 2.0,
	"paralysis": 1.5,
	"poison": 1.5,
	"burn": 1.25,
	"none": 1.0,
	"": 1.0,
}


## ── Rarity Modifiers ────────────────────────────────────────────────────────
## Rarer Sprites are harder to catch. Legendary Sprites have only 30% of the
## base capture probability.

const RARITY_MODIFIERS: Dictionary = {
	"common": 1.0,
	"uncommon": 0.8,
	"rare": 0.6,
	"legendary": 0.3,
}


## ── Catch Rate Bounds ───────────────────────────────────────────────────────

const MIN_CATCH_RATE: float = 0.05
const MAX_CATCH_RATE: float = 0.95

## Number of shakes required for a successful catch.
const REQUIRED_SHAKES: int = 3


## ── Core Calculations ───────────────────────────────────────────────────────

## Calculate the probability of catching a wild Sprite.
##
## Parameters:
##   target_hp_pct       — current HP as a fraction of max HP [0.0, 1.0]
##   target_rarity       — "common", "uncommon", "rare", or "legendary"
##   crystal_multiplier  — catch crystal quality multiplier (e.g. 1.0 for basic,
##                         1.5 for great, 2.0 for ultra)
##   has_status          — active status condition on the target: "sleep",
##                         "freeze", "paralysis", "poison", "burn", "none", or ""
##
## Returns:
##   Catch probability clamped to [0.05, 0.95].
func calculate_catch_rate(
	target_hp_pct: float,
	target_rarity: String,
	crystal_multiplier: float,
	has_status: String,
) -> float:
	# Ensure HP percentage is in valid range.
	var hp_pct: float = clampf(target_hp_pct, 0.0, 1.0)

	# Look up status bonus; default to 1.0 for unknown statuses.
	var status_bonus: float = STATUS_MODIFIERS.get(has_status, 1.0)

	# Look up rarity modifier; default to 1.0 for unknown rarities.
	var rarity_modifier: float = RARITY_MODIFIERS.get(target_rarity, 1.0)

	# Ensure crystal multiplier is at least 0.1 (protect against bad data).
	var crystal_mult: float = maxf(crystal_multiplier, 0.1)

	# Formula: 0.5 * (1.0 - hp_pct) * status_bonus * crystal_mult * rarity_modifier
	# At 100% HP the base is 0.0; at 0% HP the base is 0.5.
	var catch_rate: float = 0.5 * (1.0 - hp_pct) * status_bonus * crystal_mult * rarity_modifier

	return clampf(catch_rate, MIN_CATCH_RATE, MAX_CATCH_RATE)


## Simulate the shake-check sequence. Each of the 3 shakes succeeds
## independently with probability = catch_rate^0.25.
##
## Parameters:
##   catch_rate — the catch probability from calculate_catch_rate()
##
## Returns:
##   Number of successful shakes (0 to 3). A value of 3 means capture success.
func calculate_shake_count(catch_rate: float) -> int:
	var rate: float = clampf(catch_rate, 0.0, 1.0)
	var shake_prob: float = pow(rate, 0.25)

	var shakes: int = 0
	for i in REQUIRED_SHAKES:
		var roll: float = randf()
		if roll < shake_prob:
			shakes += 1
		else:
			break  # Shake failed — crystal breaks open.
	return shakes


## Determine whether catching is blocked in the current battle context.
## Catching is not allowed in trainer battles or against boss encounters.
##
## Parameters:
##   is_trainer_battle — true if the player is fighting another trainer
##   is_boss           — true if the target is a boss Sprite
##
## Returns:
##   true if catching is blocked, false if the player may attempt a catch.
func is_catch_blocked(is_trainer_battle: bool, is_boss: bool) -> bool:
	return is_trainer_battle or is_boss


## ── Utility ─────────────────────────────────────────────────────────────────

## Return a human-readable description of the catch difficulty for UI display.
func get_difficulty_label(catch_rate: float) -> String:
	if catch_rate >= 0.80:
		return "very_easy"
	elif catch_rate >= 0.60:
		return "easy"
	elif catch_rate >= 0.40:
		return "moderate"
	elif catch_rate >= 0.20:
		return "hard"
	elif catch_rate >= 0.10:
		return "very_hard"
	else:
		return "near_impossible"


## Get the probability of passing all 3 shakes (overall catch success rate).
## This is shake_prob^3 = (catch_rate^0.25)^3 = catch_rate^0.75
func get_overall_success_probability(catch_rate: float) -> float:
	var rate: float = clampf(catch_rate, 0.0, 1.0)
	return pow(rate, 0.75)

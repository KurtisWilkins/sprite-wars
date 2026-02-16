## BattleSpeedController -- [P3-015] Controls battle playback speed.
## Manages speed multiplier for animations and tick rates, supporting
## 1x, 2x, and 4x speed modes for mobile auto-battler convenience.
class_name BattleSpeedController
extends RefCounted

## -- State --------------------------------------------------------------------

## Current speed multiplier (affects animations, delays, and tick rate).
var speed_multiplier: float = 1.0

## Available speed options.
var available_speeds: Array = [1.0, 2.0, 4.0]

## Index into available_speeds for the current setting.
var current_speed_index: int = 0

## -- Speed Control ------------------------------------------------------------

## Cycle to the next speed level. Wraps around to 1x after the highest.
## Returns the new speed multiplier.
func cycle_speed() -> float:
	current_speed_index = (current_speed_index + 1) % available_speeds.size()
	speed_multiplier = available_speeds[current_speed_index]
	return speed_multiplier


## Set the speed directly (must be one of the available speeds).
## Returns true if the speed was set, false if invalid.
func set_speed(target_speed: float) -> bool:
	var idx: int = available_speeds.find(target_speed)
	if idx >= 0:
		current_speed_index = idx
		speed_multiplier = target_speed
		return true
	return false


## Reset to 1x speed.
func reset_speed() -> void:
	current_speed_index = 0
	speed_multiplier = available_speeds[0]

## -- Rate Helpers -------------------------------------------------------------

## Get the effective animation speed multiplier.
## Animation playback should be multiplied by this value.
func get_animation_speed() -> float:
	return speed_multiplier


## Get the effective tick rate multiplier for battle processing.
## Higher speed = shorter delays between turns.
func get_tick_rate() -> float:
	return speed_multiplier


## Convert a base duration (seconds) to the speed-adjusted duration.
## E.g., a 1.0s animation at 2x speed becomes 0.5s.
func get_adjusted_duration(base_duration: float) -> float:
	if speed_multiplier <= 0.0:
		return base_duration
	return base_duration / speed_multiplier


## Get the current speed as a display string (e.g. "2x").
func get_speed_label() -> String:
	if speed_multiplier == int(speed_multiplier):
		return "%dx" % int(speed_multiplier)
	return "%.1fx" % speed_multiplier

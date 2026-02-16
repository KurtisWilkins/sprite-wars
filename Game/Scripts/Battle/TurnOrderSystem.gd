## TurnOrderSystem -- [P3-003] Manages turn order for grid-based combat.
## Sorts units by effective speed (descending) with priority move support.
## Skips dead or action-prevented units automatically.
class_name TurnOrderSystem
extends RefCounted

## -- State --------------------------------------------------------------------

## The full list of units participating in this round.
var units: Array[BattleUnit] = []

## Index of the current unit in the sorted turn order.
var current_index: int = -1

## Priority queue: units that have used priority moves act before the normal order.
var _priority_queue: Array[BattleUnit] = []

## The computed turn order for the current round.
var _turn_order: Array[BattleUnit] = []

## -- Initialization -----------------------------------------------------------

## Set up the turn order with all participating units.
func initialize(all_units: Array[BattleUnit]) -> void:
	units.clear()
	for unit in all_units:
		units.append(unit)
	_priority_queue.clear()
	current_index = -1
	calculate_turn_order()

## -- Turn Order Calculation ---------------------------------------------------

## Sort units by effective speed (highest first). Ties broken by:
## 1. Higher sp_atk (proxy for power)
## 2. Random coin flip
func calculate_turn_order() -> Array[BattleUnit]:
	_turn_order.clear()

	# Only include living units.
	var living: Array[BattleUnit] = []
	for unit in units:
		if unit.is_alive:
			living.append(unit)

	# Sort by speed descending. On ties, use sp_atk as tiebreaker.
	living.sort_custom(_compare_speed)
	_turn_order = living
	current_index = -1
	return _turn_order


## Get the sorted turn order (read-only snapshot).
func get_turn_order() -> Array[BattleUnit]:
	return _turn_order.duplicate()


## Comparison function: higher speed first, then higher sp_atk, then random.
func _compare_speed(a: BattleUnit, b: BattleUnit) -> bool:
	var spd_a: int = a.effective_stats.get("spd", 0)
	var spd_b: int = b.effective_stats.get("spd", 0)
	if spd_a != spd_b:
		return spd_a > spd_b
	var spa_a: int = a.effective_stats.get("sp_atk", 0)
	var spa_b: int = b.effective_stats.get("sp_atk", 0)
	if spa_a != spa_b:
		return spa_a > spa_b
	# Final tiebreaker: random.
	return randf() > 0.5

## -- Turn Progression ---------------------------------------------------------

## Advance to the next unit that can act. Returns null if no more units remain.
## Priority-queued units are served first, then the normal turn order.
func get_next_unit() -> BattleUnit:
	# Drain the priority queue first.
	while not _priority_queue.is_empty():
		var priority_unit: BattleUnit = _priority_queue.pop_front()
		if priority_unit.is_alive and priority_unit.can_act:
			return priority_unit

	# Normal turn order.
	current_index += 1
	while current_index < _turn_order.size():
		var unit: BattleUnit = _turn_order[current_index]
		if unit.is_alive and unit.can_act:
			return unit
		current_index += 1

	# All units have acted or are unable.
	return null


## Whether there are more units to act this round.
func has_next_unit() -> bool:
	# Check priority queue.
	for unit in _priority_queue:
		if unit.is_alive and unit.can_act:
			return true
	# Check remaining normal order.
	for i in range(current_index + 1, _turn_order.size()):
		var unit: BattleUnit = _turn_order[i]
		if unit.is_alive and unit.can_act:
			return true
	return false

## -- Priority Actions ---------------------------------------------------------

## Insert a unit for a priority action (e.g. Quick Attack-style moves).
## The unit will act before the next normal turn.
func insert_priority_action(unit: BattleUnit) -> void:
	if unit.is_alive:
		_priority_queue.append(unit)

## -- Unit Management ----------------------------------------------------------

## Remove a unit from the turn order (e.g. when fainted).
func remove_unit(unit: BattleUnit) -> void:
	var idx: int = units.find(unit)
	if idx >= 0:
		units.remove_at(idx)
	# Also remove from the active turn order.
	idx = _turn_order.find(unit)
	if idx >= 0:
		# If the removed unit is before our current index, adjust.
		if idx <= current_index:
			current_index -= 1
		_turn_order.remove_at(idx)
	# Remove from priority queue.
	idx = _priority_queue.find(unit)
	if idx >= 0:
		_priority_queue.remove_at(idx)


## Recalculate turn order mid-round (e.g. after a speed change).
## Preserves progress: units that have already acted this round are not re-added.
func recalculate() -> void:
	# Collect units that haven't acted yet.
	var already_acted: Array[BattleUnit] = []
	for i in range(0, mini(current_index + 1, _turn_order.size())):
		already_acted.append(_turn_order[i])

	# Recalculate full order.
	calculate_turn_order()

	# Remove already-acted units from the new order and reset index.
	var new_order: Array[BattleUnit] = []
	for unit in _turn_order:
		if unit not in already_acted:
			new_order.append(unit)
	_turn_order = new_order
	current_index = -1


## Start a new round: recalculate from scratch.
func new_round() -> void:
	_priority_queue.clear()
	calculate_turn_order()

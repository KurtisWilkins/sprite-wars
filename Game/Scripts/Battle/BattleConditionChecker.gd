## BattleConditionChecker -- [P3-012] Evaluates win/loss conditions each turn.
## Checks whether all units on a team have fainted to determine the battle outcome.
class_name BattleConditionChecker
extends RefCounted

## -- Constants ----------------------------------------------------------------

## Battle states.
const STATE_ONGOING: String = "ongoing"
const STATE_PLAYER_WIN: String = "player_win"
const STATE_ENEMY_WIN: String = "enemy_win"

## -- Condition Checking -------------------------------------------------------

## Check the current battle conditions and return the state.
##
## [grid] -- The BattleGrid to query for living units.
##
## Returns:
## {
##   state: String,    -- "ongoing", "player_win", or "enemy_win"
##   winner: int,      -- -1 if ongoing, 0 if player wins, 1 if enemy wins
## }
func check_conditions(grid: BattleGrid) -> Dictionary:
	var player_all_fainted: bool = check_all_fainted(0, grid)
	var enemy_all_fainted: bool = check_all_fainted(1, grid)

	# Both teams wiped out simultaneously (e.g. recoil, DoT) = player loses.
	if player_all_fainted and enemy_all_fainted:
		return {"state": STATE_ENEMY_WIN, "winner": 1}

	if enemy_all_fainted:
		return {"state": STATE_PLAYER_WIN, "winner": 0}

	if player_all_fainted:
		return {"state": STATE_ENEMY_WIN, "winner": 1}

	return {"state": STATE_ONGOING, "winner": -1}


## Check if all units on a given team have fainted.
func check_all_fainted(team: int, grid: BattleGrid) -> bool:
	var living_units: Array[BattleUnit] = grid.get_all_units(team)
	return living_units.is_empty()

## -- Additional Condition Helpers ---------------------------------------------

## Get the count of living units on each team.
## Returns {player: int, enemy: int}.
func get_living_counts(grid: BattleGrid) -> Dictionary:
	return {
		"player": grid.get_all_units(0).size(),
		"enemy": grid.get_all_units(1).size(),
	}


## Check if a specific team is close to losing (1 unit remaining).
func is_team_critical(team: int, grid: BattleGrid) -> bool:
	return grid.get_all_units(team).size() <= 1

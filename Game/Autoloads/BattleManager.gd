## BattleManager -- Main battle orchestrator autoload for Sprite Wars.
## Coordinates all battle subsystems: grid, turn order, damage, abilities,
## status effects, knockback, projectiles, multi-target, AI, and event logging.
##
## Usage:
##   BattleManager.start_battle(player_team, enemy_team, config)
##   BattleManager.execute_player_ability(ability_id, target_pos)
##   BattleManager.toggle_auto_battle()
extends Node

## -- Subsystem Instances ------------------------------------------------------

var grid: BattleGrid = null
var turn_order: TurnOrderSystem = null
var damage_calc: DamageCalculator = null
var ability_executor: AbilityExecutor = null
var status_system: StatusEffectSystem = null
var knockback_system: KnockbackSystem = null
var projectile_system: ProjectileSystem = null
var multi_target: MultiTargetResolver = null
var defeat_system: DefeatSystem = null
var condition_checker: BattleConditionChecker = null
var enemy_ai: BattleAI = null
var player_auto_ai: PlayerAutoAI = null
var speed_controller: BattleSpeedController = null
var event_log: BattleEventLog = null

## -- Battle State -------------------------------------------------------------

## Whether a battle is currently in progress.
var is_battle_active: bool = false

## Whether auto-battle mode is enabled for the player.
var is_auto_battle: bool = false

## The unit whose turn it currently is (null between turns).
var current_unit: BattleUnit = null

## Whether we are currently waiting for player input.
var awaiting_player_input: bool = false

## Current round number.
var _round_number: int = 0

## Current battle configuration.
var _battle_config: Dictionary = {}

## -- Data Registries ----------------------------------------------------------

## Ability database: ability_id -> AbilityData.
## Populated at battle start from the participating units.
var _ability_db: Dictionary = {}

## Element chart: element_id -> ElementData.
## Loaded at battle start.
var _element_chart: Dictionary = {}

## Status effect database: effect_id -> StatusEffectData.
## Loaded at battle start.
var _status_db: Dictionary = {}

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	_initialize_subsystems()


func _initialize_subsystems() -> void:
	grid = BattleGrid.new()
	turn_order = TurnOrderSystem.new()
	damage_calc = DamageCalculator.new()
	ability_executor = AbilityExecutor.new()
	status_system = StatusEffectSystem.new()
	knockback_system = KnockbackSystem.new()
	projectile_system = ProjectileSystem.new()
	multi_target = MultiTargetResolver.new()
	defeat_system = DefeatSystem.new()
	condition_checker = BattleConditionChecker.new()
	enemy_ai = BattleAI.new()
	player_auto_ai = PlayerAutoAI.new()
	speed_controller = BattleSpeedController.new()
	event_log = BattleEventLog.new()

## -- Battle Lifecycle ---------------------------------------------------------

## Start a new battle.
##
## [player_team]   -- Array of Dictionaries, each containing:
##                    {instance: SpriteInstance, race_data: SpriteRaceData,
##                     stage_data: EvolutionStageData, abilities: Array[AbilityData],
##                     position: Vector2i (optional)}
## [enemy_team]    -- Same format as player_team.
## [battle_config] -- Optional config:
##                    {element_chart: Dictionary, status_db: Dictionary,
##                     composition_bonuses: Array}
func start_battle(player_team: Array, enemy_team: Array, battle_config: Dictionary = {}) -> void:
	if is_battle_active:
		push_warning("BattleManager: Battle already active. Call end_battle() first.")
		return

	# Reset state.
	_initialize_subsystems()
	_battle_config = battle_config
	_round_number = 0
	is_battle_active = true
	is_auto_battle = false
	awaiting_player_input = false
	current_unit = null

	# Load data registries.
	_element_chart = battle_config.get("element_chart", {})
	_status_db = battle_config.get("status_db", {})
	_ability_db.clear()

	# -- Place player units ---------------------------------------------------
	var all_units: Array[BattleUnit] = []
	var player_positions: Array[Vector2i] = _generate_default_positions(0, player_team.size())

	for i in range(player_team.size()):
		var data: Dictionary = player_team[i]
		var unit: BattleUnit = _create_battle_unit(data, 0)
		if unit == null:
			continue

		var pos: Vector2i = data.get("position", player_positions[i] if i < player_positions.size() else Vector2i(i % BattleGrid.GRID_WIDTH, 0))
		grid.place_unit(unit, pos)
		all_units.append(unit)
		_register_abilities(data.get("abilities", []))

	# -- Place enemy units ----------------------------------------------------
	var enemy_positions: Array[Vector2i] = _generate_default_positions(1, enemy_team.size())

	for i in range(enemy_team.size()):
		var data: Dictionary = enemy_team[i]
		var unit: BattleUnit = _create_battle_unit(data, 1)
		if unit == null:
			continue

		var pos: Vector2i = data.get("position", enemy_positions[i] if i < enemy_positions.size() else Vector2i(i % BattleGrid.GRID_WIDTH, BattleGrid.ENEMY_ROW_MIN))
		grid.place_unit(unit, pos)
		all_units.append(unit)
		_register_abilities(data.get("abilities", []))

	# -- Apply composition bonuses --------------------------------------------
	var comp_bonuses: Array = battle_config.get("composition_bonuses", [])
	if not comp_bonuses.is_empty():
		for unit in all_units:
			if unit.team == 0:  # Only player team gets comp bonuses.
				damage_calc.apply_composition_bonuses(unit, comp_bonuses)

	# -- Initialize turn order ------------------------------------------------
	turn_order.initialize(all_units)

	# -- Log battle start -----------------------------------------------------
	event_log.clear()
	event_log.add_event(BattleEventLog.EVENT_BATTLE_START, {
		"player_count": player_team.size(),
		"enemy_count": enemy_team.size(),
	})

	# -- Emit signal ----------------------------------------------------------
	EventBus.battle_started.emit({
		"player_count": player_team.size(),
		"enemy_count": enemy_team.size(),
	})

	# -- Start the first round ------------------------------------------------
	_start_new_round()

## -- Turn Processing ----------------------------------------------------------

## Process the next turn in the battle. Called by the battle scene or auto-battle loop.
func process_turn() -> void:
	if not is_battle_active:
		return

	# Get the next unit that can act.
	current_unit = turn_order.get_next_unit()

	if current_unit == null:
		# All units have acted this round -- start a new round.
		_start_new_round()
		current_unit = turn_order.get_next_unit()
		if current_unit == null:
			# No units can act at all (shouldn't happen in normal play).
			end_battle("draw")
			return

	# -- Pre-turn processing: reduce cooldowns, process status effects --------
	_process_pre_turn(current_unit)

	# Check if the unit can still act after status processing.
	if not current_unit.is_alive:
		_handle_status_faint(current_unit)
		# Continue to the next unit.
		process_turn()
		return

	if not current_unit.can_act:
		# Unit is action-prevented (stunned/frozen/sleeping).
		event_log.add_event(BattleEventLog.EVENT_TURN_START, {
			"unit_name": current_unit.get_display_name(),
			"turn_number": _round_number,
			"cannot_act": true,
		})
		EventBus.turn_ended.emit(current_unit.sprite_instance)
		process_turn()
		return

	# -- Emit turn start signal -----------------------------------------------
	event_log.add_event(BattleEventLog.EVENT_TURN_START, {
		"unit_name": current_unit.get_display_name(),
		"turn_number": _round_number,
	})
	EventBus.turn_started.emit(current_unit.sprite_instance)

	# -- Decide action based on team and auto-battle mode --------------------
	if current_unit.team == 1:
		# Enemy unit: AI decides.
		_execute_ai_turn(current_unit, enemy_ai)
	elif is_auto_battle:
		# Player unit in auto-battle: smart AI decides.
		_execute_ai_turn(current_unit, player_auto_ai)
	else:
		# Player unit in manual mode: wait for input.
		awaiting_player_input = true
		# The UI will call execute_player_ability() when the player acts.

## -- Player Manual Input ------------------------------------------------------

## Execute a manually selected ability on a target position.
## Called by the battle scene UI when the player selects an ability and target.
func execute_player_ability(ability_id: int, target_pos: Vector2i) -> void:
	if not is_battle_active or not awaiting_player_input:
		return

	if current_unit == null or current_unit.team != 0:
		return

	awaiting_player_input = false

	# Look up the ability.
	var ability: AbilityData = _ability_db.get(ability_id)
	if ability == null:
		push_warning("BattleManager: Unknown ability_id %d" % ability_id)
		awaiting_player_input = true
		return

	# Validate.
	var validation: Dictionary = ability_executor.validate_ability_use(current_unit, ability)
	if not validation["valid"]:
		push_warning("BattleManager: Invalid ability use -- %s" % validation["reason"])
		awaiting_player_input = true
		return

	# Resolve targets.
	var targets: Array[BattleUnit] = multi_target.resolve_multi_target(
		ability, current_unit, target_pos, grid
	)

	# Execute.
	_execute_ability_and_process(current_unit, ability, targets)

	# End turn.
	_end_current_turn()

## -- Auto-Battle Toggle -------------------------------------------------------

## Toggle auto-battle mode on/off.
func toggle_auto_battle() -> void:
	is_auto_battle = not is_auto_battle

	# If we were waiting for player input and auto-battle was just enabled,
	# immediately process the current turn via AI.
	if is_auto_battle and awaiting_player_input and current_unit != null:
		awaiting_player_input = false
		_execute_ai_turn(current_unit, player_auto_ai)

## -- Battle End ---------------------------------------------------------------

## End the battle with a result.
## [result] -- "player_win", "enemy_win", or "draw"
func end_battle(result: String) -> void:
	if not is_battle_active:
		return

	is_battle_active = false
	awaiting_player_input = false
	current_unit = null

	var winner_label: String
	match result:
		"player_win":
			winner_label = "Player"
		"enemy_win":
			winner_label = "Enemy"
		_:
			winner_label = "Draw"

	event_log.add_event(BattleEventLog.EVENT_BATTLE_END, {
		"result": result,
		"winner": winner_label,
		"rounds": _round_number,
	})

	# Emit signal for GameManager and UI.
	EventBus.battle_ended.emit({
		"result": result,
		"rounds": _round_number,
		"event_log": event_log.get_full_log(),
	})

## -- Private: Round Management ------------------------------------------------

## Start a new round: tick status durations, recalculate turn order.
func _start_new_round() -> void:
	_round_number += 1
	turn_order.new_round()


## Process pre-turn effects for a unit: reduce cooldowns, process DoT/status.
func _process_pre_turn(unit: BattleUnit) -> void:
	# Reduce ability cooldowns.
	unit.reduce_cooldowns()

	# Check if any cooldowns just expired -- restore PP.
	for ability_id in unit.equipped_abilities:
		var ability: AbilityData = _ability_db.get(ability_id)
		if ability != null:
			if not unit.ability_cooldowns.has(ability_id) and unit.ability_pp.get(ability_id, 0) <= 0:
				unit.restore_pp(ability)

	# Process active status effects (DoT, regen, etc.).
	var status_results: Array[Dictionary] = status_system.process_turn_effects(unit)
	for result in status_results:
		match result.get("result_type", ""):
			"dot_damage":
				event_log.add_event(BattleEventLog.EVENT_STATUS_DAMAGE, {
					"unit_name": unit.get_display_name(),
					"effect_name": result.get("effect_name", ""),
					"damage": result.get("value", 0),
				})
			"dot_heal":
				event_log.log_heal(unit.get_display_name(), int(result.get("value", 0)))
			"break_free":
				event_log.add_event("break_free", {
					"unit_name": unit.get_display_name(),
					"effect_name": result.get("effect_name", ""),
				})

	# Tick durations and log expired effects.
	var expired_ids: Array[int] = status_system.tick_durations(unit)
	for eid in expired_ids:
		var effect_data: StatusEffectData = _status_db.get(eid)
		if effect_data != null:
			event_log.log_status_expired(unit.get_display_name(), effect_data.effect_name)
			EventBus.status_expired.emit(unit.sprite_instance, effect_data)

## -- Private: AI Turn ---------------------------------------------------------

## Execute an AI-controlled turn for a unit.
func _execute_ai_turn(unit: BattleUnit, ai: BattleAI) -> void:
	var action: Dictionary = ai.decide_action(
		unit, grid, damage_calc, _ability_db, _element_chart
	)

	var ability: AbilityData = action.get("ability")
	var target: BattleUnit = action.get("target")

	if ability == null:
		# AI couldn't find a valid action -- skip turn.
		event_log.add_event("skip", {"unit_name": unit.get_display_name()})
		_end_current_turn()
		return

	# Resolve multi-target from the chosen target's position.
	var target_pos: Vector2i = target.grid_position if target != null else unit.grid_position
	var targets: Array[BattleUnit] = multi_target.resolve_multi_target(
		ability, unit, target_pos, grid
	)

	# Execute the ability.
	_execute_ability_and_process(unit, ability, targets)

	# End the turn.
	_end_current_turn()

## -- Private: Ability Execution -----------------------------------------------

## Execute an ability and process all consequences (damage, faint, win check).
func _execute_ability_and_process(
	caster: BattleUnit,
	ability: AbilityData,
	targets: Array[BattleUnit],
) -> void:
	# Log the ability use.
	var target_name: String = ""
	if not targets.is_empty() and targets[0] != null:
		target_name = targets[0].get_display_name()
	event_log.log_ability_used(caster.get_display_name(), ability.ability_name, target_name)

	# Emit ability used signal.
	var target_refs: Array = []
	for t in targets:
		if t != null and t.sprite_instance != null:
			target_refs.append(t.sprite_instance)
	EventBus.ability_used.emit(caster.sprite_instance, ability, target_refs)

	# Execute through the pipeline.
	var results: Array[Dictionary] = ability_executor.execute_ability(
		caster, ability, targets, grid, damage_calc,
		_element_chart, status_system, knockback_system, _status_db
	)

	# Process results: log events, check for faints, emit signals.
	var fainted_units: Array[BattleUnit] = []

	for result in results:
		var target: BattleUnit = result.get("target")
		if target == null:
			continue

		var t_name: String = target.get_display_name()

		if not result.get("hit", false):
			event_log.add_event(BattleEventLog.EVENT_MISS, {
				"unit_name": caster.get_display_name(),
				"target_name": t_name,
			})
			continue

		# Damage logging.
		var damage: int = result.get("damage", 0)
		if damage > 0:
			event_log.log_damage(t_name, damage, caster.get_display_name())

			# Effectiveness text.
			var eff_label: String = result.get("effectiveness_label", "neutral")
			match eff_label:
				"super_effective":
					event_log.add_event(BattleEventLog.EVENT_SUPER_EFFECTIVE, {"target_name": t_name})
				"not_very_effective":
					event_log.add_event(BattleEventLog.EVENT_NOT_EFFECTIVE, {"target_name": t_name})
				"immune":
					event_log.add_event(BattleEventLog.EVENT_IMMUNE, {"target_name": t_name})

			# Critical hit text.
			if result.get("is_crit", false):
				event_log.add_event(BattleEventLog.EVENT_CRITICAL_HIT, {"target_name": t_name})

			# Emit damage signal.
			EventBus.damage_dealt.emit(
				caster.sprite_instance,
				target.sprite_instance if target.sprite_instance else null,
				damage,
				result.get("is_crit", false),
				result.get("effectiveness", 1.0)
			)

		# Heal logging.
		var healed: int = result.get("healed", 0)
		if healed > 0:
			event_log.log_heal(t_name, healed)

		# Status effect logging.
		var status_applied: Array = result.get("status_applied", [])
		for effect_name in status_applied:
			event_log.log_status_applied(t_name, effect_name)
			# Find the StatusEffectData for the signal.
			for eid in _status_db:
				var sed: StatusEffectData = _status_db[eid]
				if sed.effect_name == effect_name:
					EventBus.status_applied.emit(target.sprite_instance, sed)
					break

		# Knockback logging.
		if result.get("knockback") != null:
			event_log.add_event(BattleEventLog.EVENT_KNOCKBACK, {
				"target_name": t_name,
			})

		# Faint check.
		if result.get("is_fainted", false):
			fainted_units.append(target)

	# -- Process defeats -------------------------------------------------------
	for fainted in fainted_units:
		var defeat_result: Dictionary = defeat_system.process_defeat(fainted, grid, turn_order)
		event_log.log_faint(defeat_result.get("display_name", "???"))
		EventBus.unit_fainted.emit(fainted.sprite_instance)

	# -- Check win/loss conditions --------------------------------------------
	_check_battle_conditions()

## -- Private: Turn End --------------------------------------------------------

func _end_current_turn() -> void:
	if current_unit != null:
		EventBus.turn_ended.emit(current_unit.sprite_instance)
	event_log.advance_turn()
	current_unit = null

	if not is_battle_active:
		return

	# Continue to the next turn.
	# Use call_deferred to allow UI to update between turns.
	call_deferred("process_turn")

## -- Private: Condition Check -------------------------------------------------

func _check_battle_conditions() -> void:
	var result: Dictionary = condition_checker.check_conditions(grid)
	match result["state"]:
		"player_win":
			end_battle("player_win")
		"enemy_win":
			end_battle("enemy_win")
		# "ongoing" -- continue.

## -- Private: Status Faint Handling -------------------------------------------

func _handle_status_faint(unit: BattleUnit) -> void:
	var defeat_result: Dictionary = defeat_system.process_defeat(unit, grid, turn_order)
	event_log.log_faint(defeat_result.get("display_name", "???"))
	EventBus.unit_fainted.emit(unit.sprite_instance)
	_check_battle_conditions()

## -- Private: Unit Creation ---------------------------------------------------

## Create a BattleUnit from the team data dictionary.
func _create_battle_unit(data: Dictionary, team_id: int) -> BattleUnit:
	var instance: SpriteInstance = data.get("instance")
	var race_data: SpriteRaceData = data.get("race_data")
	var stage_data: EvolutionStageData = data.get("stage_data")
	var abilities: Array = data.get("abilities", [])

	if instance == null or race_data == null or stage_data == null:
		push_warning("BattleManager: Incomplete unit data, skipping.")
		return null

	# Calculate full stats.
	var stats: Dictionary = instance.calculate_all_effective_stats(race_data, stage_data)
	var elem_types: Array[String] = []
	for e in race_data.element_types:
		elem_types.append(e)

	var unit := BattleUnit.new()
	unit.initialize(instance, stats, team_id, abilities, elem_types)
	return unit

## -- Private: Ability Registration --------------------------------------------

## Register abilities in the database for AI lookups.
func _register_abilities(abilities: Array) -> void:
	for ability in abilities:
		if ability is AbilityData:
			_ability_db[ability.ability_id] = ability

## -- Private: Default Positioning ---------------------------------------------

## Generate default grid positions for a team.
## Places units in rows starting from the front, filling left to right.
func _generate_default_positions(team: int, count: int) -> Array[Vector2i]:
	var positions: Array[Vector2i] = []
	var row_start: int = BattleGrid.PLAYER_ROW_MAX if team == 0 else BattleGrid.ENEMY_ROW_MIN
	var row_dir: int = -1 if team == 0 else 1  # Player fills back-to-front, enemy front-to-back.

	var placed: int = 0
	var current_row: int = row_start
	var max_rows: int = BattleGrid.GRID_HEIGHT_PER_SIDE

	for _row in range(max_rows):
		for x in range(BattleGrid.GRID_WIDTH):
			if placed >= count:
				break
			# Center units if fewer than grid width.
			var offset: int = 0
			var units_this_row: int = mini(BattleGrid.GRID_WIDTH, count - placed)
			if units_this_row < BattleGrid.GRID_WIDTH:
				offset = (BattleGrid.GRID_WIDTH - units_this_row) / 2
			if x >= offset and x < offset + units_this_row:
				positions.append(Vector2i(x, current_row))
				placed += 1
		if placed >= count:
			break
		current_row += row_dir

	return positions

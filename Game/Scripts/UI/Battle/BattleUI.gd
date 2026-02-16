## BattleUI -- Main battle UI controller.
## Extends CanvasLayer to overlay all battle interface components on top of
## the game world. Instantiates all sub-components programmatically, wires
## EventBus signals to UI updates, and manages the flow between deployment,
## combat, targeting, catching, and results screens.
extends CanvasLayer

## -- Sub-Component References -------------------------------------------------

var grid_display: Node2D = null          # GridDisplay.gd
var health_bar_display: Control = null   # HealthBarDisplay.gd
var status_icon_display: Control = null  # StatusIconDisplay.gd
var ability_bar: HBoxContainer = null    # AbilityBar.gd
var targeting_overlay: Node2D = null     # TargetingOverlay.gd
var floating_damage: Control = null      # FloatingDamage.gd
var turn_order_bar: HBoxContainer = null # TurnOrderBar.gd
var event_feed: VBoxContainer = null     # BattleEventFeed.gd
var results_screen: CanvasLayer = null   # BattleResultsScreen.gd
var deployment_screen: CanvasLayer = null # DeploymentScreen.gd
var crystal_throw_ui: PanelContainer = null # CrystalThrowUI.gd

## -- State --------------------------------------------------------------------

## Currently active unit data during player turn.
var _active_unit_data: Dictionary = {}

## Currently selected ability ID for targeting.
var _selected_ability_id: int = -1

## Unit visual tracking: {unit_id: {grid_pos: Vector2i, texture: Texture2D, team: int}}
var _tracked_units: Dictionary = {}

## -- Script Paths -------------------------------------------------------------

const GRID_DISPLAY_SCRIPT := "res://Scripts/UI/Battle/GridDisplay.gd"
const HEALTH_BAR_SCRIPT := "res://Scripts/UI/Battle/HealthBarDisplay.gd"
const STATUS_ICON_SCRIPT := "res://Scripts/UI/Battle/StatusIconDisplay.gd"
const ABILITY_BAR_SCRIPT := "res://Scripts/UI/Battle/AbilityBar.gd"
const TARGETING_OVERLAY_SCRIPT := "res://Scripts/UI/Battle/TargetingOverlay.gd"
const FLOATING_DAMAGE_SCRIPT := "res://Scripts/UI/Battle/FloatingDamage.gd"
const TURN_ORDER_BAR_SCRIPT := "res://Scripts/UI/Battle/TurnOrderBar.gd"
const EVENT_FEED_SCRIPT := "res://Scripts/UI/Battle/BattleEventFeed.gd"
const RESULTS_SCREEN_SCRIPT := "res://Scripts/UI/Battle/BattleResultsScreen.gd"
const DEPLOYMENT_SCREEN_SCRIPT := "res://Scripts/UI/Battle/DeploymentScreen.gd"
const CRYSTAL_THROW_SCRIPT := "res://Scripts/UI/Battle/CrystalThrowUI.gd"

## -- Initialization -----------------------------------------------------------

func _ready() -> void:
	layer = 1
	_instantiate_components()
	_layout_components()
	connect_to_battle_manager()


## Create all sub-component instances programmatically.
func _instantiate_components() -> void:
	# Grid Display (Node2D).
	grid_display = Node2D.new()
	grid_display.set_script(load(GRID_DISPLAY_SCRIPT))
	add_child(grid_display)

	# Health Bar Display (Control).
	health_bar_display = Control.new()
	health_bar_display.set_script(load(HEALTH_BAR_SCRIPT))
	add_child(health_bar_display)

	# Status Icon Display (Control).
	status_icon_display = Control.new()
	status_icon_display.set_script(load(STATUS_ICON_SCRIPT))
	add_child(status_icon_display)

	# Turn Order Bar (HBoxContainer).
	turn_order_bar = HBoxContainer.new()
	turn_order_bar.set_script(load(TURN_ORDER_BAR_SCRIPT))
	add_child(turn_order_bar)

	# Event Feed (VBoxContainer).
	event_feed = VBoxContainer.new()
	event_feed.set_script(load(EVENT_FEED_SCRIPT))
	add_child(event_feed)

	# Floating Damage (Control).
	floating_damage = Control.new()
	floating_damage.set_script(load(FLOATING_DAMAGE_SCRIPT))
	add_child(floating_damage)

	# Targeting Overlay (Node2D) -- rendered above grid but below UI panels.
	targeting_overlay = Node2D.new()
	targeting_overlay.set_script(load(TARGETING_OVERLAY_SCRIPT))
	targeting_overlay.set_grid_display(grid_display)
	add_child(targeting_overlay)

	# Ability Bar (HBoxContainer).
	ability_bar = HBoxContainer.new()
	ability_bar.set_script(load(ABILITY_BAR_SCRIPT))
	add_child(ability_bar)

	# Crystal Throw UI (PanelContainer).
	crystal_throw_ui = PanelContainer.new()
	crystal_throw_ui.set_script(load(CRYSTAL_THROW_SCRIPT))
	add_child(crystal_throw_ui)

	# Results Screen (CanvasLayer) -- separate layer on top.
	results_screen = CanvasLayer.new()
	results_screen.set_script(load(RESULTS_SCREEN_SCRIPT))
	add_child(results_screen)

	# Deployment Screen (CanvasLayer) -- separate layer.
	deployment_screen = CanvasLayer.new()
	deployment_screen.set_script(load(DEPLOYMENT_SCREEN_SCRIPT))
	add_child(deployment_screen)


## Position and configure sub-component layout for 1080x1920 portrait.
func _layout_components() -> void:
	# Grid display is self-positioning in its _ready() via grid_origin.
	# Turn order bar is self-positioning at the top.
	# Event feed is self-positioning at top-left.
	# Ability bar is self-positioning at the bottom.
	# Floating damage, health bars, and status icons are full-rect overlays.
	# Targeting overlay shares grid_display's coordinate space.
	# Results, deployment, crystal throw are modal overlays.
	pass

## -- EventBus Signal Wiring ---------------------------------------------------

## Connect all EventBus signals to their UI update handlers.
func connect_to_battle_manager() -> void:
	# Battle lifecycle.
	EventBus.battle_started.connect(_on_battle_started)
	EventBus.battle_ended.connect(_on_battle_ended)

	# Turn flow.
	EventBus.turn_started.connect(_on_turn_started)
	EventBus.turn_ended.connect(_on_turn_ended)

	# Combat events.
	EventBus.ability_used.connect(_on_ability_used)
	EventBus.damage_dealt.connect(_on_damage_dealt)
	EventBus.unit_fainted.connect(_on_unit_fainted)

	# Status effects.
	EventBus.status_applied.connect(_on_status_applied)
	EventBus.status_expired.connect(_on_status_expired)

	# Knockback.
	EventBus.knockback_occurred.connect(_on_knockback_occurred)

	# Catching.
	EventBus.catch_attempted.connect(_on_catch_attempted)
	EventBus.catch_succeeded.connect(_on_catch_succeeded)
	EventBus.catch_failed.connect(_on_catch_failed)

	# Progression (for results screen).
	EventBus.xp_gained.connect(_on_xp_gained)
	EventBus.level_up.connect(_on_level_up)
	EventBus.evolution_triggered.connect(_on_evolution_triggered)

	# Component signals.
	ability_bar.ability_selected.connect(_on_ability_selected)
	targeting_overlay.target_confirmed.connect(_on_target_confirmed)
	targeting_overlay.target_cancelled.connect(_on_target_cancelled)
	results_screen.results_closed.connect(_on_results_closed)
	deployment_screen.deployment_confirmed.connect(_on_deployment_confirmed)
	crystal_throw_ui.crystal_thrown.connect(_on_crystal_thrown)
	crystal_throw_ui.catch_cancelled.connect(_on_catch_cancelled)

## -- Player Turn UI -----------------------------------------------------------

## Show the ability bar for the active player unit.
## unit_data: {unit_id: int, abilities: Array[Dictionary], grid_pos: Vector2i}
func show_player_turn_ui(unit_data: Dictionary) -> void:
	_active_unit_data = unit_data
	_selected_ability_id = -1

	var abilities: Array[Dictionary] = []
	var raw_abilities: Array = unit_data.get("abilities", [])
	for ab in raw_abilities:
		abilities.append(ab)
	ability_bar.set_abilities(abilities)
	ability_bar.show_bar()


## Hide the ability bar and targeting overlay.
func hide_player_turn_ui() -> void:
	_active_unit_data = {}
	_selected_ability_id = -1
	ability_bar.hide_bar()
	targeting_overlay.hide_targeting()


## Refresh all displays (health bars, status icons, positions).
func update_all() -> void:
	_update_unit_positions()

## -- Unit Tracking ------------------------------------------------------------

## Register a unit for visual tracking.
func register_unit(unit_id: int, grid_pos: Vector2i, texture: Texture2D, team: int,
		max_hp: int, current_hp: int) -> void:
	_tracked_units[unit_id] = {
		"grid_pos": grid_pos,
		"texture": texture,
		"team": team,
		"max_hp": max_hp,
		"current_hp": current_hp,
	}

	# Place visual on grid.
	grid_display.place_sprite_visual(unit_id, grid_pos, texture)

	# Add health bar.
	var screen_pos: Vector2 = grid_display.grid_to_screen(grid_pos)
	health_bar_display.add_bar(unit_id, max_hp, current_hp, screen_pos, team)


## Unregister a unit from all visual systems.
func unregister_unit(unit_id: int) -> void:
	grid_display.remove_sprite_visual(unit_id)
	health_bar_display.remove_bar(unit_id)
	status_icon_display.clear_unit(unit_id)
	_tracked_units.erase(unit_id)

## -- Private: Position Updates ------------------------------------------------

## Sync health bar and status icon positions with grid display sprite positions.
func _update_unit_positions() -> void:
	var hp_positions: Dictionary = {}
	var status_positions: Dictionary = {}

	for unit_id in _tracked_units:
		var data: Dictionary = _tracked_units[unit_id]
		var screen_pos: Vector2 = grid_display.grid_to_screen(data["grid_pos"])
		hp_positions[unit_id] = screen_pos
		status_positions[unit_id] = screen_pos

	health_bar_display.update_positions(hp_positions)
	status_icon_display.update_positions(status_positions)

## -- EventBus Signal Handlers -------------------------------------------------

func _on_battle_started(_battle_data: Dictionary) -> void:
	event_feed.clear()
	event_feed.add_message("Battle Start!", BattleEventFeed.COLOR_ABILITY)


func _on_battle_ended(result: Dictionary) -> void:
	hide_player_turn_ui()
	# The results screen is shown separately when result data is fully prepared.
	var outcome: String = result.get("result", "draw")
	match outcome:
		"player_win":
			event_feed.add_message("Victory!", Color(1.0, 0.85, 0.2))
		"enemy_win":
			event_feed.add_message("Defeat...", Color(0.7, 0.2, 0.2))
		_:
			event_feed.add_message("Draw.", Color(0.7, 0.7, 0.8))


func _on_turn_started(unit_resource: Resource) -> void:
	if unit_resource == null:
		return

	# Update turn order bar highlight.
	var unit_id: int = unit_resource.instance_id if unit_resource is SpriteInstance else 0
	turn_order_bar.highlight_current(unit_id)


func _on_turn_ended(_unit_resource: Resource) -> void:
	# Hide player UI between turns.
	hide_player_turn_ui()


func _on_ability_used(caster: Resource, ability: Resource, targets: Array) -> void:
	if caster == null or ability == null:
		return

	var caster_name: String = ""
	if caster is SpriteInstance:
		caster_name = caster.get_display_name()

	var ability_name: String = ""
	if ability is AbilityData:
		ability_name = ability.ability_name

	var target_name: String = ""
	if not targets.is_empty() and targets[0] != null and targets[0] is SpriteInstance:
		target_name = targets[0].get_display_name()

	var msg: String = event_feed.ability_used_text(caster_name, ability_name, target_name)
	event_feed.add_message(msg, BattleEventFeed.COLOR_ABILITY)


func _on_damage_dealt(attacker: Resource, defender: Resource, amount: int,
		is_crit: bool, effectiveness: float) -> void:
	if defender == null:
		return

	var defender_id: int = 0
	var defender_name: String = ""
	if defender is SpriteInstance:
		defender_id = defender.instance_id
		defender_name = defender.get_display_name()

	# Spawn floating damage number.
	if _tracked_units.has(defender_id):
		var screen_pos: Vector2 = grid_display.grid_to_screen(
			_tracked_units[defender_id]["grid_pos"]
		)
		floating_damage.spawn_damage(amount, screen_pos, is_crit, effectiveness)

	# Update health bar (fetch current HP from BattleManager if possible).
	# The actual HP update will come through the unit data; here we animate
	# the bar based on the damage amount.
	if _tracked_units.has(defender_id):
		var data: Dictionary = _tracked_units[defender_id]
		var new_hp: int = maxi(0, data.get("current_hp", 0) - amount)
		data["current_hp"] = new_hp
		health_bar_display.update_bar(defender_id, new_hp, data.get("max_hp", 1))

	# Event feed.
	var msg: String = event_feed.damage_text(defender_name, amount, is_crit)
	var color: Color = BattleEventFeed.COLOR_DAMAGE
	event_feed.add_message(msg, color)


func _on_unit_fainted(unit_resource: Resource) -> void:
	if unit_resource == null:
		return

	var unit_id: int = 0
	var unit_name: String = ""
	if unit_resource is SpriteInstance:
		unit_id = unit_resource.instance_id
		unit_name = unit_resource.get_display_name()

	# Remove from turn order bar.
	turn_order_bar.remove_unit(unit_id)

	# Fade out the sprite visual and remove after delay.
	# The grid_display.remove_sprite_visual will be called after animation.
	event_feed.add_message(event_feed.faint_text(unit_name), BattleEventFeed.COLOR_FAINT)

	# Delay removal for visual effect.
	get_tree().create_timer(0.8).timeout.connect(func() -> void:
		unregister_unit(unit_id)
	)


func _on_status_applied(unit_resource: Resource, effect: Resource) -> void:
	if unit_resource == null or effect == null:
		return

	var unit_id: int = 0
	var unit_name: String = ""
	if unit_resource is SpriteInstance:
		unit_id = unit_resource.instance_id
		unit_name = unit_resource.get_display_name()

	var effect_name: String = ""
	var duration: int = 0
	var icon_path: String = ""
	if effect is StatusEffectData:
		effect_name = effect.effect_name
		duration = effect.duration_turns
		icon_path = effect.icon_path

	# Load icon texture if available.
	var icon_texture: Texture2D = null
	if not icon_path.is_empty() and ResourceLoader.exists(icon_path):
		icon_texture = load(icon_path)

	status_icon_display.add_status(unit_id, effect_name, icon_texture, duration, 1)

	var msg: String = event_feed.status_text(unit_name, effect_name, true)
	event_feed.add_message(msg, BattleEventFeed.COLOR_STATUS)

	# Spawn floating text.
	if _tracked_units.has(unit_id):
		var screen_pos: Vector2 = grid_display.grid_to_screen(
			_tracked_units[unit_id]["grid_pos"]
		)
		floating_damage.spawn_text(effect_name, screen_pos, BattleEventFeed.COLOR_STATUS)


func _on_status_expired(unit_resource: Resource, effect: Resource) -> void:
	if unit_resource == null or effect == null:
		return

	var unit_id: int = 0
	var unit_name: String = ""
	if unit_resource is SpriteInstance:
		unit_id = unit_resource.instance_id
		unit_name = unit_resource.get_display_name()

	var effect_name: String = ""
	if effect is StatusEffectData:
		effect_name = effect.effect_name

	status_icon_display.remove_status(unit_id, effect_name)

	var msg: String = event_feed.status_text(unit_name, effect_name, false)
	event_feed.add_message(msg, Color(0.6, 0.65, 0.75))


func _on_knockback_occurred(unit_resource: Resource, from_pos: Vector2i, to_pos: Vector2i) -> void:
	if unit_resource == null:
		return

	var unit_id: int = 0
	if unit_resource is SpriteInstance:
		unit_id = unit_resource.instance_id

	# Animate the unit moving.
	grid_display.move_sprite_visual(unit_id, to_pos, 0.3)

	# Update tracked position.
	if _tracked_units.has(unit_id):
		_tracked_units[unit_id]["grid_pos"] = to_pos

	# Update floating UI positions after a short delay.
	get_tree().create_timer(0.35).timeout.connect(_update_unit_positions)


func _on_catch_attempted(_crystal: Resource, _target: Resource) -> void:
	event_feed.add_message("Throwing crystal...", Color(0.7, 0.85, 1.0))


func _on_catch_succeeded(sprite_data: Resource) -> void:
	var name: String = ""
	if sprite_data is SpriteInstance:
		name = sprite_data.get_display_name()
	event_feed.add_message("Caught %s!" % name, Color(0.3, 1.0, 0.5))


func _on_catch_failed(sprite_data: Resource) -> void:
	var name: String = ""
	if sprite_data is SpriteInstance:
		name = sprite_data.get_display_name()
	event_feed.add_message("%s broke free!" % name, Color(1.0, 0.5, 0.3))


func _on_xp_gained(_sprite_data: Resource, _amount: int) -> void:
	# XP display handled in the results screen.
	pass


func _on_level_up(sprite_data: Resource, new_level: int) -> void:
	if sprite_data == null:
		return
	var name: String = ""
	if sprite_data is SpriteInstance:
		name = sprite_data.get_display_name()
	event_feed.add_message("%s reached level %d!" % [name, new_level], Color(1.0, 0.85, 0.2))


func _on_evolution_triggered(sprite_data: Resource, _new_stage: int) -> void:
	if sprite_data == null:
		return
	var name: String = ""
	if sprite_data is SpriteInstance:
		name = sprite_data.get_display_name()
	event_feed.add_message("%s is evolving!" % name, Color(0.8, 0.6, 1.0))

## -- Component Signal Handlers ------------------------------------------------

## Player selected an ability from the ability bar.
func _on_ability_selected(ability_id: int) -> void:
	_selected_ability_id = ability_id

	# Determine valid targets and show targeting overlay.
	var caster_pos: Vector2i = _active_unit_data.get("grid_pos", Vector2i.ZERO)
	var valid_cells: Array[Vector2i] = _active_unit_data.get("valid_targets", [])

	# Find the ability data from the active unit's abilities.
	var ability_data: Dictionary = {}
	var abilities: Array = _active_unit_data.get("abilities", [])
	for ab in abilities:
		if ab.get("ability_id", -1) == ability_id:
			ability_data = ab
			break

	if ability_data.is_empty():
		return

	# If no valid_targets were pre-supplied, generate them from the grid.
	if valid_cells.is_empty():
		var targeting_type: String = ability_data.get("targeting_type", "single")
		# For self-targeting, confirm immediately.
		if targeting_type == "self":
			_on_target_confirmed(caster_pos)
			return
		# For all/all_allies, confirm immediately.
		if targeting_type in ["all", "all_allies"]:
			_on_target_confirmed(caster_pos)
			return

	targeting_overlay.show_targeting(ability_data, caster_pos, valid_cells)


## Player confirmed a target cell.
func _on_target_confirmed(grid_pos: Vector2i) -> void:
	if _selected_ability_id < 0:
		return

	# Forward to BattleManager.
	BattleManager.execute_player_ability(_selected_ability_id, grid_pos)
	hide_player_turn_ui()


## Player cancelled targeting.
func _on_target_cancelled() -> void:
	_selected_ability_id = -1
	# Re-show the ability bar.
	if not _active_unit_data.is_empty():
		ability_bar.show_bar()


## Results screen closed.
func _on_results_closed() -> void:
	# Signal upstream that the battle scene can transition.
	EventBus.screen_changed.emit("overworld")


## Deployment confirmed by the player.
func _on_deployment_confirmed(placements: Dictionary) -> void:
	# The battle scene will handle starting the battle with these placements.
	pass


## Crystal thrown for catching.
func _on_crystal_thrown(crystal_data: Dictionary) -> void:
	# Forward to the catch system via BattleManager or catch sequence.
	EventBus.catch_attempted.emit(null, null)


## Catch cancelled.
func _on_catch_cancelled() -> void:
	# Re-show the ability bar if it's still the player's turn.
	if not _active_unit_data.is_empty():
		ability_bar.show_bar()

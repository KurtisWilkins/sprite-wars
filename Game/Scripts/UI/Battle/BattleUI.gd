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

## Unit inspection popup.
var inspect_overlay: ColorRect = null
var inspect_panel: PanelContainer = null
var _inspected_unit_id: int = -1

## Internal references to inspection popup child nodes for data population.
var _inspect_portrait: TextureRect = null
var _inspect_name_label: Label = null
var _inspect_team_label: Label = null
var _inspect_level_label: Label = null
var _inspect_element_row: HBoxContainer = null
var _inspect_hp_bar: ProgressBar = null
var _inspect_hp_label: Label = null
var _inspect_stats_grid: GridContainer = null
var _inspect_stat_labels: Dictionary = {}  # stat_key -> Label
var _inspect_abilities_box: VBoxContainer = null
var _inspect_status_box: VBoxContainer = null

## Touch tracking for tap detection (press vs drag).
var _touch_press_pos: Vector2 = Vector2.ZERO
var _touch_pressed: bool = false

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

	# Unit Inspection Popup -- full-screen overlay with unit detail panel.
	_build_inspect_popup()

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
## extra_data is an optional dictionary with extended info for the inspect popup:
##   { "name": String, "level": int, "elements": Array[String],
##     "abilities": Array[Dictionary], "stats": Dictionary,
##     "status_effects": Array[String] }
func register_unit(unit_id: int, grid_pos: Vector2i, texture: Texture2D, team: int,
		max_hp: int, current_hp: int, extra_data: Dictionary = {}) -> void:
	_tracked_units[unit_id] = {
		"grid_pos": grid_pos,
		"texture": texture,
		"team": team,
		"max_hp": max_hp,
		"current_hp": current_hp,
		"name": extra_data.get("name", "Unknown"),
		"level": extra_data.get("level", 1),
		"elements": extra_data.get("elements", []),
		"abilities": extra_data.get("abilities", []),
		"stats": extra_data.get("stats", {}),
		"status_effects": extra_data.get("status_effects", []),
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
	_hide_unit_inspect()
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

	# Dismiss the inspect popup when a new turn begins.
	_hide_unit_inspect()

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

## -- Unit Inspection Popup ----------------------------------------------------

## Build the full-screen inspection overlay and detail panel.
## Called once during _instantiate_components; nodes are hidden by default.
func _build_inspect_popup() -> void:
	# Full-screen semi-transparent overlay that dismisses on tap.
	inspect_overlay = ColorRect.new()
	inspect_overlay.name = "InspectOverlay"
	inspect_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	inspect_overlay.color = Color(0.0, 0.0, 0.0, 0.4)
	inspect_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	inspect_overlay.visible = false
	inspect_overlay.z_index = 50
	add_child(inspect_overlay)

	# Centered detail panel (950x1400 with dark background and rounded corners).
	inspect_panel = PanelContainer.new()
	inspect_panel.name = "InspectPanel"
	inspect_panel.custom_minimum_size = Vector2(950.0, 1400.0)
	inspect_panel.size = Vector2(950.0, 1400.0)
	inspect_panel.position = Vector2(
		(1080.0 - 950.0) / 2.0,
		(1920.0 - 1400.0) / 2.0
	)
	inspect_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	inspect_panel.z_index = 51

	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.08, 0.08, 0.14, 0.95)
	panel_style.corner_radius_top_left = 16
	panel_style.corner_radius_top_right = 16
	panel_style.corner_radius_bottom_left = 16
	panel_style.corner_radius_bottom_right = 16
	panel_style.border_width_left = 2
	panel_style.border_width_right = 2
	panel_style.border_width_top = 2
	panel_style.border_width_bottom = 2
	panel_style.border_color = Color(0.25, 0.25, 0.4, 1.0)
	panel_style.content_margin_left = 32.0
	panel_style.content_margin_right = 32.0
	panel_style.content_margin_top = 24.0
	panel_style.content_margin_bottom = 32.0
	inspect_panel.add_theme_stylebox_override("panel", panel_style)
	inspect_panel.visible = false
	inspect_overlay.add_child(inspect_panel)

	# Scroll container inside the panel to handle overflow.
	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	inspect_panel.add_child(scroll)

	# Main VBox layout inside scroll.
	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 18)
	scroll.add_child(content)

	# -- Close button (top-right, "X") --
	var close_row := HBoxContainer.new()
	close_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	close_row.alignment = BoxContainer.ALIGNMENT_END
	content.add_child(close_row)

	var close_btn := Button.new()
	close_btn.name = "CloseButton"
	close_btn.text = "X"
	close_btn.custom_minimum_size = Vector2(56.0, 56.0)
	close_btn.add_theme_font_size_override("font_size", 28)
	close_btn.focus_mode = Control.FOCUS_NONE
	var close_style := StyleBoxFlat.new()
	close_style.bg_color = Color(0.3, 0.15, 0.15, 0.9)
	close_style.corner_radius_top_left = 8
	close_style.corner_radius_top_right = 8
	close_style.corner_radius_bottom_left = 8
	close_style.corner_radius_bottom_right = 8
	close_btn.add_theme_stylebox_override("normal", close_style)
	var close_pressed_style := close_style.duplicate()
	close_pressed_style.bg_color = Color(0.4, 0.15, 0.15, 0.9)
	close_btn.add_theme_stylebox_override("pressed", close_pressed_style)
	close_btn.pressed.connect(_hide_unit_inspect)
	close_row.add_child(close_btn)

	# -- Sprite portrait (TextureRect, 160x160, centered) --
	var portrait_center := CenterContainer.new()
	portrait_center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(portrait_center)

	var portrait_frame := PanelContainer.new()
	portrait_frame.custom_minimum_size = Vector2(220.0, 220.0)
	var portrait_style := StyleBoxFlat.new()
	portrait_style.bg_color = Color(0.1, 0.1, 0.16, 1.0)
	portrait_style.corner_radius_top_left = 12
	portrait_style.corner_radius_top_right = 12
	portrait_style.corner_radius_bottom_left = 12
	portrait_style.corner_radius_bottom_right = 12
	portrait_style.border_width_left = 2
	portrait_style.border_width_right = 2
	portrait_style.border_width_top = 2
	portrait_style.border_width_bottom = 2
	portrait_style.border_color = Color(0.25, 0.25, 0.35, 1.0)
	portrait_frame.add_theme_stylebox_override("panel", portrait_style)
	portrait_center.add_child(portrait_frame)

	_inspect_portrait = TextureRect.new()
	_inspect_portrait.name = "InspectPortrait"
	_inspect_portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_inspect_portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_inspect_portrait.custom_minimum_size = Vector2(220.0, 220.0)
	portrait_frame.add_child(_inspect_portrait)

	# -- Name label (large, colored by team) --
	_inspect_name_label = Label.new()
	_inspect_name_label.name = "InspectNameLabel"
	_inspect_name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_inspect_name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_inspect_name_label.add_theme_font_size_override("font_size", 36)
	content.add_child(_inspect_name_label)

	# -- Team label ("Ally" / "Enemy") --
	_inspect_team_label = Label.new()
	_inspect_team_label.name = "InspectTeamLabel"
	_inspect_team_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_inspect_team_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_inspect_team_label.add_theme_font_size_override("font_size", 22)
	content.add_child(_inspect_team_label)

	# -- Level label --
	_inspect_level_label = Label.new()
	_inspect_level_label.name = "InspectLevelLabel"
	_inspect_level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_inspect_level_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_inspect_level_label.add_theme_font_size_override("font_size", 26)
	_inspect_level_label.add_theme_color_override("font_color", Color(0.9, 0.85, 0.5))
	content.add_child(_inspect_level_label)

	# -- Element badges row (HBoxContainer with colored labels) --
	var elem_center := CenterContainer.new()
	elem_center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(elem_center)

	_inspect_element_row = HBoxContainer.new()
	_inspect_element_row.name = "InspectElements"
	_inspect_element_row.add_theme_constant_override("separation", 8)
	elem_center.add_child(_inspect_element_row)

	# -- HP bar (ProgressBar showing current/max HP) --
	var hp_section := VBoxContainer.new()
	hp_section.add_theme_constant_override("separation", 4)
	content.add_child(hp_section)

	var hp_header := Label.new()
	hp_header.text = "HP"
	hp_header.add_theme_font_size_override("font_size", 22)
	hp_header.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	hp_section.add_child(hp_header)

	_inspect_hp_bar = ProgressBar.new()
	_inspect_hp_bar.name = "InspectHPBar"
	_inspect_hp_bar.custom_minimum_size = Vector2(0.0, 32.0)
	_inspect_hp_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_inspect_hp_bar.show_percentage = false
	var hp_fill := StyleBoxFlat.new()
	hp_fill.bg_color = Color(0.2, 0.8, 0.3, 1.0)
	hp_fill.corner_radius_top_left = 6
	hp_fill.corner_radius_top_right = 6
	hp_fill.corner_radius_bottom_left = 6
	hp_fill.corner_radius_bottom_right = 6
	_inspect_hp_bar.add_theme_stylebox_override("fill", hp_fill)
	var hp_bg := StyleBoxFlat.new()
	hp_bg.bg_color = Color(0.12, 0.12, 0.18, 1.0)
	hp_bg.corner_radius_top_left = 6
	hp_bg.corner_radius_top_right = 6
	hp_bg.corner_radius_bottom_left = 6
	hp_bg.corner_radius_bottom_right = 6
	_inspect_hp_bar.add_theme_stylebox_override("background", hp_bg)
	hp_section.add_child(_inspect_hp_bar)

	_inspect_hp_label = Label.new()
	_inspect_hp_label.name = "InspectHPLabel"
	_inspect_hp_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_inspect_hp_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_inspect_hp_label.add_theme_font_size_override("font_size", 20)
	_inspect_hp_label.add_theme_color_override("font_color", Color(0.7, 0.9, 0.7))
	hp_section.add_child(_inspect_hp_label)

	# -- Separator before stats --
	var sep1 := HSeparator.new()
	sep1.add_theme_constant_override("separation", 8)
	content.add_child(sep1)

	# -- Stats section header --
	var stats_header := Label.new()
	stats_header.text = "Stats"
	stats_header.add_theme_font_size_override("font_size", 26)
	stats_header.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	content.add_child(stats_header)

	# -- Stats grid (2-column GridContainer: HP, ATK, DEF, SPD, SP.ATK, SP.DEF) --
	_inspect_stats_grid = GridContainer.new()
	_inspect_stats_grid.name = "InspectStatsGrid"
	_inspect_stats_grid.columns = 2
	_inspect_stats_grid.add_theme_constant_override("h_separation", 32)
	_inspect_stats_grid.add_theme_constant_override("v_separation", 12)
	_inspect_stats_grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(_inspect_stats_grid)

	var stat_keys: Array[String] = ["hp", "atk", "def", "spd", "sp_atk", "sp_def"]
	var stat_display: Dictionary = {
		"hp": "HP", "atk": "ATK", "def": "DEF",
		"spd": "SPD", "sp_atk": "SP.ATK", "sp_def": "SP.DEF",
	}
	_inspect_stat_labels.clear()
	for key in stat_keys:
		var stat_name_label := Label.new()
		stat_name_label.text = stat_display.get(key, key.to_upper())
		stat_name_label.custom_minimum_size = Vector2(120.0, 0.0)
		stat_name_label.add_theme_font_size_override("font_size", 22)
		stat_name_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
		_inspect_stats_grid.add_child(stat_name_label)

		var stat_val_label := Label.new()
		stat_val_label.text = "--"
		stat_val_label.add_theme_font_size_override("font_size", 24)
		stat_val_label.add_theme_color_override("font_color", Color.WHITE)
		_inspect_stats_grid.add_child(stat_val_label)

		_inspect_stat_labels[key] = stat_val_label

	# -- Separator before abilities --
	var sep2 := HSeparator.new()
	sep2.add_theme_constant_override("separation", 8)
	content.add_child(sep2)

	# -- Abilities section header --
	var abilities_header := Label.new()
	abilities_header.text = "Abilities"
	abilities_header.add_theme_font_size_override("font_size", 26)
	abilities_header.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	content.add_child(abilities_header)

	# -- Abilities list (VBoxContainer, up to 4 abilities with element color badges) --
	_inspect_abilities_box = VBoxContainer.new()
	_inspect_abilities_box.name = "InspectAbilities"
	_inspect_abilities_box.add_theme_constant_override("separation", 10)
	_inspect_abilities_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(_inspect_abilities_box)

	# -- Separator before status effects --
	var sep3 := HSeparator.new()
	sep3.add_theme_constant_override("separation", 8)
	content.add_child(sep3)

	# -- Status effects section header --
	var status_header := Label.new()
	status_header.text = "Status Effects"
	status_header.add_theme_font_size_override("font_size", 26)
	status_header.add_theme_color_override("font_color", Color(0.7, 0.8, 1.0))
	content.add_child(status_header)

	# -- Status effects list --
	_inspect_status_box = VBoxContainer.new()
	_inspect_status_box.name = "InspectStatusEffects"
	_inspect_status_box.add_theme_constant_override("separation", 4)
	_inspect_status_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(_inspect_status_box)


## Show the unit inspection popup for the given unit.
## Looks up the unit in _tracked_units, populates the panel with the unit's
## info, and shows the overlay and panel with a scale-in animation (tween).
func _show_unit_inspect(unit_id: int) -> void:
	if not _tracked_units.has(unit_id):
		return

	_inspected_unit_id = unit_id
	var data: Dictionary = _tracked_units[unit_id]

	# -- Portrait --
	_inspect_portrait.texture = data.get("texture", null)

	# -- Name (gold color for allies, red for enemies) --
	var unit_name: String = str(data.get("name", "Unknown"))
	_inspect_name_label.text = unit_name
	var team: int = data.get("team", 0)
	if team == 0:
		_inspect_name_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3))
	else:
		_inspect_name_label.add_theme_color_override("font_color", Color(1.0, 0.35, 0.3))

	# -- Team label --
	if team == 0:
		_inspect_team_label.text = "Ally"
		_inspect_team_label.add_theme_color_override("font_color", Color(0.4, 0.8, 1.0))
	else:
		_inspect_team_label.text = "Enemy"
		_inspect_team_label.add_theme_color_override("font_color", Color(1.0, 0.4, 0.4))

	# -- Level --
	var unit_level: int = data.get("level", 1)
	_inspect_level_label.text = "Lv. %d" % unit_level

	# -- Element badges (colored labels using element color helper) --
	for child in _inspect_element_row.get_children():
		child.queue_free()
	var elements: Array = data.get("elements", [])
	for element in elements:
		var badge := Label.new()
		badge.text = "  %s  " % str(element)
		var badge_color: Color = _get_element_color(str(element))
		var badge_style := StyleBoxFlat.new()
		badge_style.bg_color = badge_color.darkened(0.5)
		badge_style.corner_radius_top_left = 8
		badge_style.corner_radius_top_right = 8
		badge_style.corner_radius_bottom_left = 8
		badge_style.corner_radius_bottom_right = 8
		badge_style.content_margin_left = 4.0
		badge_style.content_margin_right = 4.0
		badge_style.content_margin_top = 2.0
		badge_style.content_margin_bottom = 2.0
		badge.add_theme_stylebox_override("normal", badge_style)
		var label_settings := LabelSettings.new()
		label_settings.font_size = 20
		label_settings.font_color = badge_color
		badge.label_settings = label_settings
		_inspect_element_row.add_child(badge)

	# -- HP bar (current/max with color-coded fill) --
	var max_hp: int = data.get("max_hp", 1)
	var current_hp: int = data.get("current_hp", 0)
	_inspect_hp_bar.max_value = float(max_hp)
	_inspect_hp_bar.value = float(current_hp)
	_inspect_hp_label.text = "%d / %d" % [current_hp, max_hp]

	# Update HP bar fill color based on HP ratio.
	var hp_ratio: float = float(current_hp) / float(maxi(1, max_hp))
	var fill_color: Color
	if hp_ratio > 0.5:
		fill_color = Color(0.2, 0.8, 0.3, 1.0)
	elif hp_ratio > 0.25:
		fill_color = Color(0.9, 0.7, 0.1, 1.0)
	else:
		fill_color = Color(0.9, 0.2, 0.2, 1.0)
	var hp_fill_style := StyleBoxFlat.new()
	hp_fill_style.bg_color = fill_color
	hp_fill_style.corner_radius_top_left = 6
	hp_fill_style.corner_radius_top_right = 6
	hp_fill_style.corner_radius_bottom_left = 6
	hp_fill_style.corner_radius_bottom_right = 6
	_inspect_hp_bar.add_theme_stylebox_override("fill", hp_fill_style)

	# -- Stats grid --
	var stats: Dictionary = data.get("stats", {})
	for stat_key in _inspect_stat_labels:
		var val: int = int(stats.get(stat_key, 0))
		_inspect_stat_labels[stat_key].text = str(val)

	# -- Abilities list (up to 4, with element color badges) --
	for child in _inspect_abilities_box.get_children():
		child.queue_free()
	var abilities: Array = data.get("abilities", [])
	var ability_count: int = mini(abilities.size(), 4)
	if ability_count == 0:
		var none_label := Label.new()
		none_label.text = "None"
		none_label.add_theme_font_size_override("font_size", 20)
		none_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		_inspect_abilities_box.add_child(none_label)
	else:
		for i in range(ability_count):
			var ab: Dictionary = abilities[i] if abilities[i] is Dictionary else {}
			var ab_row := HBoxContainer.new()
			ab_row.add_theme_constant_override("separation", 8)

			# Element color badge for the ability.
			var ab_element: String = str(ab.get("element", ""))
			if not ab_element.is_empty():
				var ab_badge := Label.new()
				ab_badge.text = " %s " % ab_element
				var ab_color: Color = _get_element_color(ab_element)
				var ab_badge_style := StyleBoxFlat.new()
				ab_badge_style.bg_color = ab_color.darkened(0.5)
				ab_badge_style.corner_radius_top_left = 6
				ab_badge_style.corner_radius_top_right = 6
				ab_badge_style.corner_radius_bottom_left = 6
				ab_badge_style.corner_radius_bottom_right = 6
				ab_badge_style.content_margin_left = 4.0
				ab_badge_style.content_margin_right = 4.0
				ab_badge.add_theme_stylebox_override("normal", ab_badge_style)
				var ab_label_settings := LabelSettings.new()
				ab_label_settings.font_size = 18
				ab_label_settings.font_color = ab_color
				ab_badge.label_settings = ab_label_settings
				ab_row.add_child(ab_badge)

			# Ability name.
			var ab_name_label := Label.new()
			ab_name_label.text = str(ab.get("name", ab.get("ability_name", "Ability #%d" % (i + 1))))
			ab_name_label.add_theme_font_size_override("font_size", 22)
			ab_name_label.add_theme_color_override("font_color", Color.WHITE)
			ab_name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			ab_row.add_child(ab_name_label)

			# Power label (if available).
			var ab_power: int = int(ab.get("power", 0))
			if ab_power > 0:
				var power_label := Label.new()
				power_label.text = "Pow: %d" % ab_power
				power_label.add_theme_font_size_override("font_size", 20)
				power_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
				ab_row.add_child(power_label)

			_inspect_abilities_box.add_child(ab_row)

	# -- Status effects list (if any active) --
	for child in _inspect_status_box.get_children():
		child.queue_free()
	var status_effects: Array = data.get("status_effects", [])
	if status_effects.is_empty():
		var no_status := Label.new()
		no_status.text = "None"
		no_status.add_theme_font_size_override("font_size", 20)
		no_status.add_theme_color_override("font_color", Color(0.5, 0.5, 0.55))
		_inspect_status_box.add_child(no_status)
	else:
		for effect_name in status_effects:
			var effect_label := Label.new()
			effect_label.text = str(effect_name)
			effect_label.add_theme_font_size_override("font_size", 20)
			effect_label.add_theme_color_override("font_color", Color(0.85, 0.7, 1.0))
			_inspect_status_box.add_child(effect_label)

	# -- Show with scale-in animation (tween) --
	inspect_overlay.visible = true
	inspect_panel.visible = true
	inspect_panel.scale = Vector2(0.8, 0.8)
	inspect_panel.pivot_offset = Vector2(475.0, 700.0)
	inspect_panel.modulate.a = 0.0

	var tween := create_tween()
	tween.set_parallel(true)
	tween.set_ease(Tween.EASE_OUT)
	tween.set_trans(Tween.TRANS_BACK)
	tween.tween_property(inspect_panel, "scale", Vector2.ONE, 0.25)
	tween.tween_property(inspect_panel, "modulate:a", 1.0, 0.2).set_trans(Tween.TRANS_QUAD)


## Hide the unit inspection popup with a scale-out animation.
## Resets _inspected_unit_id.
func _hide_unit_inspect() -> void:
	if not inspect_overlay.visible:
		return

	_inspected_unit_id = -1

	var tween := create_tween()
	tween.set_parallel(true)
	tween.set_ease(Tween.EASE_IN)
	tween.set_trans(Tween.TRANS_QUAD)
	tween.tween_property(inspect_panel, "scale", Vector2(0.85, 0.85), 0.15)
	tween.tween_property(inspect_panel, "modulate:a", 0.0, 0.15)
	tween.chain().tween_callback(func() -> void:
		inspect_overlay.visible = false
		inspect_panel.visible = false
		inspect_panel.scale = Vector2.ONE
		inspect_panel.modulate.a = 1.0
	)


## -- Input: Tap-to-Inspect ---------------------------------------------------

## Handle touch / mouse input for tapping a unit on the grid to inspect it.
## Only responds to touch/mouse taps (press + release at same position).
## Skipped when the targeting overlay is active or when any modal overlay is
## showing. If the inspect overlay is visible and tapped outside the panel,
## hides it.
func _input(event: InputEvent) -> void:
	# Do not process inspect taps while targeting is active.
	if targeting_overlay != null and targeting_overlay.active:
		return

	# Do not process while modal screens are visible.
	if results_screen != null and results_screen.visible:
		return
	if deployment_screen != null and deployment_screen.visible:
		return

	# If the inspect popup is open, tapping the overlay (outside the panel)
	# dismisses it.
	if inspect_overlay != null and inspect_overlay.visible:
		if event is InputEventScreenTouch and event.pressed:
			var pos: Vector2 = event.position
			var panel_rect := Rect2(inspect_panel.position, inspect_panel.size)
			if not panel_rect.has_point(pos):
				_hide_unit_inspect()
				get_viewport().set_input_as_handled()
			return
		if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			var pos: Vector2 = event.position
			var panel_rect := Rect2(inspect_panel.position, inspect_panel.size)
			if not panel_rect.has_point(pos):
				_hide_unit_inspect()
				get_viewport().set_input_as_handled()
			return
		return  # Consume all other input while popup is open.

	# Detect short taps on units for inspection. Track press position to
	# distinguish taps from drags.
	if event is InputEventScreenTouch:
		if event.pressed:
			_touch_press_pos = event.position
			_touch_pressed = true
		else:
			if _touch_pressed:
				var release_pos: Vector2 = event.position
				_touch_pressed = false
				if _touch_press_pos.distance_to(release_pos) < 20.0:
					_try_inspect_at(release_pos)
	elif event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_touch_press_pos = event.position
				_touch_pressed = true
			else:
				if _touch_pressed:
					var release_pos: Vector2 = event.position
					_touch_pressed = false
					if _touch_press_pos.distance_to(release_pos) < 20.0:
						_try_inspect_at(release_pos)


## Attempt to find a unit at the given screen position and open the inspect
## popup for it. Converts screen position to grid position using
## grid_display.screen_to_grid(), checks if grid_display.is_screen_pos_on_grid()
## is true, and looks up the unit at that grid position.
func _try_inspect_at(screen_pos: Vector2) -> void:
	if grid_display == null:
		return
	if not grid_display.is_screen_pos_on_grid(screen_pos):
		return

	var grid_pos: Vector2i = grid_display.screen_to_grid(screen_pos)

	# Search all tracked units for one at this grid position.
	for unit_id in _tracked_units:
		var data: Dictionary = _tracked_units[unit_id]
		if data.get("grid_pos", Vector2i(-99, -99)) == grid_pos:
			_show_unit_inspect(unit_id)
			get_viewport().set_input_as_handled()
			return


## -- Element Color Helper ----------------------------------------------------

## Return the theme color for a given element name.
## Matches the pattern used in SpriteDetailScreen.gd.
func _get_element_color(element_name: String) -> Color:
	match element_name:
		"Fire": return Color(1.0, 0.4, 0.2)
		"Water": return Color(0.3, 0.6, 1.0)
		"Earth": return Color(0.6, 0.45, 0.25)
		"Wind": return Color(0.7, 0.9, 1.0)
		"Light": return Color(1.0, 1.0, 0.6)
		"Dark": return Color(0.5, 0.3, 0.7)
		"Plant": return Color(0.3, 0.8, 0.3)
		"Electric": return Color(1.0, 0.9, 0.2)
		"Ice": return Color(0.6, 0.9, 1.0)
		"Metal": return Color(0.7, 0.7, 0.75)
		"Poison": return Color(0.7, 0.3, 0.8)
		"Fairy": return Color(1.0, 0.5, 0.8)
		"Solar": return Color(0.6, 0.8, 0.9)
		"Lunar": return Color(0.9, 0.2, 0.4)
		_: return Color(0.7, 0.7, 0.7)

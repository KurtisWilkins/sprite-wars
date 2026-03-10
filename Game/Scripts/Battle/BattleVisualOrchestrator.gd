## BattleVisualOrchestrator — Connects EventBus animation signals to the
## visual systems (BattleAnimationController, BattleVFXSystem). This node
## lives in the Battle scene tree and bridges the logical battle system
## with on-screen animation playback.
##
## Attach as a child of the Battle scene. Set references during _ready().
extends Node


## ── References ──────────────────────────────────────────────────────────────

## GridDisplay for sprite lookups and coordinate conversion.
var grid_display: Node2D = null

## The animation controller instance.
var anim_controller: BattleAnimationController = null

## The VFX system node.
var vfx_system: Node = null

## FloatingDamage node for comic impact layering.
var floating_damage: Control = null

## Speed multiplier from BattleSpeedController.
var speed_multiplier: float = 1.0

## Maps sprite_instance -> unit_id for visual lookups.
var _sprite_to_unit_id: Dictionary = {}


## ── Initialization ──────────────────────────────────────────────────────────

func _ready() -> void:
	anim_controller = BattleAnimationController.new()
	_connect_signals()


func setup(
	p_grid_display: Node2D,
	p_vfx_system: Node,
	p_floating_damage: Control,
) -> void:
	grid_display = p_grid_display
	vfx_system = p_vfx_system
	floating_damage = p_floating_damage

	if anim_controller != null:
		anim_controller.grid_display = grid_display
		anim_controller.vfx_system = vfx_system


## Register a sprite instance to unit_id mapping for visual lookups.
func register_unit_visual(sprite_instance: Resource, unit_id: int) -> void:
	if sprite_instance != null:
		_sprite_to_unit_id[sprite_instance] = unit_id

	# Start idle loop for chibi sprites.
	if grid_display != null and anim_controller != null:
		var sprite: Node2D = _get_sprite_node(sprite_instance)
		if sprite != null:
			anim_controller.start_chibi_idle(sprite)


## Unregister a unit visual.
func unregister_unit_visual(sprite_instance: Resource) -> void:
	# Stop chibi animations before removing.
	if anim_controller != null:
		var sprite: Node2D = _get_sprite_node(sprite_instance)
		if sprite != null:
			anim_controller.stop_chibi_animation(sprite)
	_sprite_to_unit_id.erase(sprite_instance)


## ── Signal Connections ──────────────────────────────────────────────────────

func _connect_signals() -> void:
	EventBus.attack_animation_requested.connect(_on_attack_animation)
	EventBus.hit_impact_requested.connect(_on_hit_impact)
	EventBus.knockback_visual_requested.connect(_on_knockback_visual)
	EventBus.faint_animation_requested.connect(_on_faint_animation)
	EventBus.damage_dealt.connect(_on_damage_dealt)
	EventBus.special_animation_requested.connect(_on_special_animation)
	EventBus.teleport_executed.connect(_on_teleport_visual)


## ── Signal Handlers ─────────────────────────────────────────────────────────

## Handle attack animation: play weapon-specific attack motion on the attacker.
func _on_attack_animation(
	attacker: Resource, target: Resource,
	weapon_type: String, element: String,
) -> void:
	if grid_display == null or anim_controller == null:
		return

	var attacker_sprite: Node2D = _get_sprite_node(attacker)
	var target_sprite: Node2D = _get_sprite_node(target)
	if attacker_sprite == null:
		return

	var profile: Dictionary = WeaponAnimationData.get_profile(weapon_type)
	anim_controller.play_attack_animation(
		attacker_sprite, target_sprite, profile, element, speed_multiplier
	)


## Handle hit impact VFX: spawn element-colored impact on the target.
func _on_hit_impact(
	target: Resource, damage: int,
	element: String, attack_style: int,
) -> void:
	if vfx_system == null:
		return

	var target_sprite: Node2D = _get_sprite_node(target)
	if target_sprite == null:
		return

	vfx_system.spawn_hit_impact(target_sprite.position, element, attack_style)

	# Spawn comic-book impact text for significant damage.
	vfx_system.spawn_comic_impact(target_sprite.position, damage)


## Handle damage dealt: play hit reaction on defender.
func _on_damage_dealt(
	_attacker: Resource, defender: Resource,
	amount: int, is_crit: bool, _effectiveness: float,
) -> void:
	if anim_controller == null:
		return

	var defender_sprite: Node2D = _get_sprite_node(defender)
	if defender_sprite == null:
		return

	anim_controller.play_hit_reaction(defender_sprite, amount, is_crit, speed_multiplier)


## Handle knockback visual: animate the unit sliding to the new position.
func _on_knockback_visual(
	unit: Resource, from_pos: Vector2i,
	to_pos: Vector2i, hit_wall: bool,
) -> void:
	if grid_display == null or anim_controller == null:
		return

	var unit_sprite: Node2D = _get_sprite_node(unit)
	if unit_sprite == null:
		return

	# Spawn trail VFX.
	if vfx_system != null:
		var from_screen: Vector2 = grid_display.grid_to_screen(from_pos)
		var to_screen: Vector2 = grid_display.grid_to_screen(to_pos)
		vfx_system.spawn_knockback_trail(from_screen, to_screen)

	# Move the sprite visual to the new grid position.
	var unit_id: int = _sprite_to_unit_id.get(unit, -1)
	if unit_id >= 0:
		var distance: int = absi(to_pos.x - from_pos.x) + absi(to_pos.y - from_pos.y)
		var move_dur: float = 0.15 + float(distance) * 0.05
		grid_display.move_sprite_visual(unit_id, to_pos, move_dur / speed_multiplier)


## Handle faint animation: play defeat visual on the unit.
func _on_faint_animation(unit: Resource) -> void:
	if anim_controller == null:
		return

	var sprite: Node2D = _get_sprite_node(unit)
	if sprite == null:
		return

	anim_controller.play_faint_animation(sprite, speed_multiplier)


## Handle class special animation.
func _on_special_animation(
	caster: Resource, target: Resource,
	class_name_str: String,
) -> void:
	if anim_controller == null:
		return

	var caster_sprite: Node2D = _get_sprite_node(caster)
	var target_sprite: Node2D = _get_sprite_node(target)
	if caster_sprite == null:
		return

	var special_data: Dictionary = ClassSpecialAnimations.get_special(class_name_str)
	if special_data.is_empty():
		return

	anim_controller.play_class_special(
		caster_sprite, target_sprite, special_data, speed_multiplier
	)


## Handle teleport visual: animate vanish and reappear.
func _on_teleport_visual(
	unit: Resource, from_pos: Vector2i, to_pos: Vector2i,
) -> void:
	if grid_display == null:
		return

	var sprite: Node2D = _get_sprite_node(unit)
	if sprite == null:
		return

	# Smoke at origin.
	if vfx_system != null:
		vfx_system.spawn_teleport_smoke(sprite.position)

	# Move to new position.
	var unit_id: int = _sprite_to_unit_id.get(unit, -1)
	if unit_id >= 0:
		grid_display.move_sprite_visual(unit_id, to_pos, 0.01)

	# Smoke at destination.
	if vfx_system != null:
		var dest_screen: Vector2 = grid_display.grid_to_screen(to_pos)
		vfx_system.spawn_teleport_smoke(dest_screen)


## ── Utility ─────────────────────────────────────────────────────────────────

## Look up the Sprite2D node for a sprite_instance resource.
func _get_sprite_node(sprite_instance: Resource) -> Node2D:
	if sprite_instance == null or grid_display == null:
		return null
	var unit_id: int = _sprite_to_unit_id.get(sprite_instance, -1)
	if unit_id < 0:
		return null
	var visual_data: Dictionary = grid_display._unit_visuals.get(unit_id, {})
	var sprite: Node2D = visual_data.get("sprite")
	if sprite != null and is_instance_valid(sprite):
		return sprite
	return null


## Update speed multiplier (call when battle speed changes).
func set_speed_multiplier(mult: float) -> void:
	speed_multiplier = maxf(0.25, mult)


## Cleanup: disconnect signals.
func _exit_tree() -> void:
	if EventBus.attack_animation_requested.is_connected(_on_attack_animation):
		EventBus.attack_animation_requested.disconnect(_on_attack_animation)
	if EventBus.hit_impact_requested.is_connected(_on_hit_impact):
		EventBus.hit_impact_requested.disconnect(_on_hit_impact)
	if EventBus.knockback_visual_requested.is_connected(_on_knockback_visual):
		EventBus.knockback_visual_requested.disconnect(_on_knockback_visual)
	if EventBus.faint_animation_requested.is_connected(_on_faint_animation):
		EventBus.faint_animation_requested.disconnect(_on_faint_animation)
	if EventBus.damage_dealt.is_connected(_on_damage_dealt):
		EventBus.damage_dealt.disconnect(_on_damage_dealt)
	if EventBus.special_animation_requested.is_connected(_on_special_animation):
		EventBus.special_animation_requested.disconnect(_on_special_animation)
	if EventBus.teleport_executed.is_connected(_on_teleport_visual):
		EventBus.teleport_executed.disconnect(_on_teleport_visual)

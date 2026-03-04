## BattleAnimationController — Orchestrates all visual attack animations during
## battle. Drives unit lunge/recoil movement, weapon swing arcs, hit flash,
## screen shake, and coordinates timing with the VFX and projectile systems.
##
## This controller works with GridDisplay sprites (Sprite2D nodes) and uses
## Godot Tweens for all procedural animation. No sprite sheet animation frames
## are required — all motion is generated from the weapon profile parameters.
##
## Usage:
##   var controller = BattleAnimationController.new()
##   controller.grid_display = grid_display_ref
##   await controller.play_attack_animation(attacker_visual, target_visual, weapon_profile)
class_name BattleAnimationController
extends RefCounted


## Reference to GridDisplay for coordinate conversion and sprite access.
var grid_display: Node2D = null

## Reference to BattleVFXSystem for spawning impact effects.
var vfx_system: Node = null

## Active tweens tracked for cleanup.
var _active_tweens: Array[Tween] = []


## ── Main Attack Animation ───────────────────────────────────────────────────

## Play a full attack animation sequence for a unit attacking a target.
## Returns when the full animation completes.
##
## [attacker_sprite]   -- The Sprite2D node of the attacking unit.
## [target_sprite]     -- The Sprite2D node of the target unit (can be null for self-target).
## [weapon_profile]    -- Dictionary from WeaponAnimationData.get_profile().
## [element_type]      -- Element string for VFX coloring.
## [speed_multiplier]  -- Animation speed (from BattleSpeedController).
func play_attack_animation(
	attacker_sprite: Node2D,
	target_sprite: Node2D,
	weapon_profile: Dictionary,
	element_type: String = "",
	speed_multiplier: float = 1.0,
) -> void:
	if attacker_sprite == null or not is_instance_valid(attacker_sprite):
		return

	var style: int = weapon_profile.get("style", WeaponAnimationData.AttackStyle.SLASH)
	var wind_up: float = weapon_profile.get("wind_up", 0.12) / speed_multiplier
	var strike: float = weapon_profile.get("strike", 0.12) / speed_multiplier
	var recovery: float = weapon_profile.get("recovery", 0.15) / speed_multiplier
	var move_dist: float = weapon_profile.get("move_distance", 16.0)
	var arc_deg: float = weapon_profile.get("arc_degrees", 0.0)
	var shake: float = weapon_profile.get("shake_intensity", 0.3)
	var has_projectile: bool = weapon_profile.get("projectile", false)

	var origin_pos: Vector2 = attacker_sprite.position

	# Calculate direction toward target.
	var direction: Vector2 = Vector2.RIGHT
	if target_sprite != null and is_instance_valid(target_sprite):
		direction = (target_sprite.position - attacker_sprite.position).normalized()
		if direction.is_zero_approx():
			direction = Vector2.RIGHT

	var lunge_offset: Vector2 = direction * move_dist

	match style:
		WeaponAnimationData.AttackStyle.SLASH:
			await _animate_slash(attacker_sprite, origin_pos, lunge_offset, arc_deg, wind_up, strike, recovery)
		WeaponAnimationData.AttackStyle.THRUST:
			await _animate_thrust(attacker_sprite, origin_pos, lunge_offset, wind_up, strike, recovery)
		WeaponAnimationData.AttackStyle.SMASH:
			await _animate_smash(attacker_sprite, origin_pos, lunge_offset, wind_up, strike, recovery)
		WeaponAnimationData.AttackStyle.DRAW_RELEASE:
			await _animate_draw_release(attacker_sprite, origin_pos, lunge_offset, wind_up, strike, recovery)
		WeaponAnimationData.AttackStyle.THROW:
			await _animate_throw(attacker_sprite, origin_pos, lunge_offset, wind_up, strike, recovery)
		WeaponAnimationData.AttackStyle.CAST:
			await _animate_cast(attacker_sprite, origin_pos, wind_up, strike, recovery, element_type)
		WeaponAnimationData.AttackStyle.PUNCH:
			await _animate_punch(attacker_sprite, origin_pos, lunge_offset, wind_up, strike, recovery)
		WeaponAnimationData.AttackStyle.BLOCK_BASH:
			await _animate_block_bash(attacker_sprite, origin_pos, lunge_offset, wind_up, strike, recovery)
		WeaponAnimationData.AttackStyle.HOLY_STRIKE:
			await _animate_holy_strike(attacker_sprite, origin_pos, lunge_offset, wind_up, strike, recovery)
		WeaponAnimationData.AttackStyle.GUNFIRE:
			await _animate_gunfire(attacker_sprite, origin_pos, lunge_offset, wind_up, strike, recovery)
		_:
			await _animate_slash(attacker_sprite, origin_pos, lunge_offset, arc_deg, wind_up, strike, recovery)

	# Apply screen shake on impact.
	if shake > 0.0 and grid_display != null:
		_apply_screen_shake(grid_display, shake, 0.2 / speed_multiplier)

	# Spawn impact VFX on target.
	if target_sprite != null and is_instance_valid(target_sprite) and vfx_system != null:
		if has_projectile:
			vfx_system.spawn_projectile_impact(target_sprite.position, element_type)
		else:
			vfx_system.spawn_hit_impact(target_sprite.position, element_type, style)

	# Ensure attacker returns to origin.
	_ensure_position_reset(attacker_sprite, origin_pos, recovery)


## ── Slash Animation ─────────────────────────────────────────────────────────
## Sword/axe swing: lunge forward with rotation arc, then snap back.

func _animate_slash(
	sprite: Node2D, origin: Vector2, lunge: Vector2,
	arc_degrees: float, wind_up: float, strike_time: float, recovery: float,
) -> void:
	var half_arc: float = deg_to_rad(arc_degrees / 2.0)

	# Wind-up: slight pull back and rotate to start of arc.
	var tween := _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin - lunge * 0.2, wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "rotation", -half_arc, wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Strike: lunge forward and sweep through arc.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin + lunge, strike_time)\
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "rotation", half_arc, strike_time)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	await tween.finished

	# Recovery: return to origin and neutral rotation.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(sprite, "rotation", 0.0, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await tween.finished


## ── Thrust Animation ────────────────────────────────────────────────────────
## Spear/dagger: pull back, then rapid forward lunge.

func _animate_thrust(
	sprite: Node2D, origin: Vector2, lunge: Vector2,
	wind_up: float, strike_time: float, recovery: float,
) -> void:
	# Wind-up: pull back.
	var tween := _create_tween(sprite)
	tween.tween_property(sprite, "position", origin - lunge * 0.3, wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Strike: rapid lunge forward.
	tween = _create_tween(sprite)
	tween.tween_property(sprite, "position", origin + lunge, strike_time)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Recovery: return.
	tween = _create_tween(sprite)
	tween.tween_property(sprite, "position", origin, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await tween.finished


## ── Smash Animation ─────────────────────────────────────────────────────────
## Hammer/mace: rise up, then slam down with scale squash.

func _animate_smash(
	sprite: Node2D, origin: Vector2, lunge: Vector2,
	wind_up: float, strike_time: float, recovery: float,
) -> void:
	# Wind-up: rise upward and stretch vertically.
	var tween := _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin + Vector2(0, -20.0), wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "scale", Vector2(0.9, 1.15), wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Strike: slam down toward target with squash.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin + lunge + Vector2(0, 8.0), strike_time)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	tween.tween_property(sprite, "scale", Vector2(1.15, 0.85), strike_time)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	await tween.finished

	# Recovery: bounce back to normal.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin, recovery)\
		.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "scale", Vector2(1.0, 1.0), recovery)\
		.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	await tween.finished


## ── Draw & Release Animation ────────────────────────────────────────────────
## Bow/crossbow: lean back (drawing), then snap forward on release.

func _animate_draw_release(
	sprite: Node2D, origin: Vector2, lean: Vector2,
	wind_up: float, strike_time: float, recovery: float,
) -> void:
	# Wind-up: lean back (draw the bowstring). lean is negative for bows.
	var tween := _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin + lean, wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	# Slight scale stretch to simulate tension.
	tween.tween_property(sprite, "scale", Vector2(1.08, 0.95), wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Release: snap forward slightly.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin - lean * 0.3, strike_time)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "scale", Vector2(0.95, 1.05), strike_time)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Recovery: settle back.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(sprite, "scale", Vector2(1.0, 1.0), recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await tween.finished


## ── Throw Animation ─────────────────────────────────────────────────────────
## Javelin/flask: wind up arm, step forward, release.

func _animate_throw(
	sprite: Node2D, origin: Vector2, lunge: Vector2,
	wind_up: float, strike_time: float, recovery: float,
) -> void:
	# Wind-up: pull arm back with slight rotation.
	var tween := _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin - lunge * 0.2, wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "rotation", deg_to_rad(-15.0), wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Strike: step forward and release with follow-through rotation.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin + lunge * 0.6, strike_time)\
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "rotation", deg_to_rad(10.0), strike_time)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	await tween.finished

	# Recovery.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(sprite, "rotation", 0.0, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await tween.finished


## ── Cast Animation ──────────────────────────────────────────────────────────
## Staff/wand/orb: hover up slightly, pulse with element glow, release.

func _animate_cast(
	sprite: Node2D, origin: Vector2,
	wind_up: float, strike_time: float, recovery: float,
	element_type: String,
) -> void:
	# Wind-up: float upward and scale pulse (channeling).
	var tween := _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin + Vector2(0, -12.0), wind_up)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "scale", Vector2(1.1, 1.1), wind_up)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)

	# Element glow using modulate.
	var glow_color: Color = _get_element_glow(element_type)
	tween.tween_property(sprite, "modulate", glow_color, wind_up)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Strike: pulse burst.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "scale", Vector2(1.2, 1.2), strike_time * 0.3)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Release: scale down and flash back to normal.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "scale", Vector2(1.0, 1.0), strike_time * 0.7)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	await tween.finished

	# Recovery: drop back down, restore modulate.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(sprite, "modulate", Color.WHITE, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await tween.finished


## ── Punch Animation ─────────────────────────────────────────────────────────
## Fist/nunchaku: rapid forward jab with bounce.

func _animate_punch(
	sprite: Node2D, origin: Vector2, lunge: Vector2,
	wind_up: float, strike_time: float, recovery: float,
) -> void:
	# Minimal wind-up (quick fighters).
	var tween := _create_tween(sprite)
	tween.tween_property(sprite, "position", origin - lunge * 0.1, wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Rapid strike: snap forward.
	tween = _create_tween(sprite)
	tween.tween_property(sprite, "position", origin + lunge, strike_time)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Bounce recovery.
	tween = _create_tween(sprite)
	tween.tween_property(sprite, "position", origin, recovery)\
		.set_trans(Tween.TRANS_BOUNCE).set_ease(Tween.EASE_OUT)
	await tween.finished


## ── Block-Bash Animation ────────────────────────────────────────────────────
## Shield: brace (scale up width), then bash forward.

func _animate_block_bash(
	sprite: Node2D, origin: Vector2, lunge: Vector2,
	wind_up: float, strike_time: float, recovery: float,
) -> void:
	# Wind-up: brace stance (widen slightly).
	var tween := _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "scale", Vector2(1.15, 0.95), wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "position", origin - lunge * 0.1, wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Bash: shove forward.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin + lunge, strike_time)\
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "scale", Vector2(1.0, 1.05), strike_time)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Recovery.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(sprite, "scale", Vector2(1.0, 1.0), recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await tween.finished


## ── Holy Strike Animation ───────────────────────────────────────────────────
## Holy mace/weapon: raise overhead with golden glow, slam down.

func _animate_holy_strike(
	sprite: Node2D, origin: Vector2, lunge: Vector2,
	wind_up: float, strike_time: float, recovery: float,
) -> void:
	# Wind-up: rise up with holy glow.
	var tween := _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin + Vector2(0, -24.0), wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "modulate", Color(1.2, 1.15, 0.8, 1.0), wind_up)\
		.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "scale", Vector2(1.1, 1.15), wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Strike: slam down.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin + lunge, strike_time)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	tween.tween_property(sprite, "scale", Vector2(1.15, 0.9), strike_time)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	await tween.finished

	# Recovery.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin, recovery)\
		.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "scale", Vector2(1.0, 1.0), recovery)\
		.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "modulate", Color.WHITE, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await tween.finished


## ── Gunfire Animation ───────────────────────────────────────────────────────
## Pistol/musket: aim, flash, recoil back.

func _animate_gunfire(
	sprite: Node2D, origin: Vector2, recoil: Vector2,
	wind_up: float, strike_time: float, recovery: float,
) -> void:
	# Wind-up: aim (slight lean forward).
	var tween := _create_tween(sprite)
	tween.tween_property(sprite, "position", origin - recoil * 0.15, wind_up)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Fire: muzzle flash (brief bright modulate) and recoil.
	tween = _create_tween(sprite)
	tween.set_parallel(true)
	tween.tween_property(sprite, "position", origin + recoil, strike_time)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "modulate", Color(1.5, 1.3, 0.8, 1.0), strike_time * 0.5)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Flash restore.
	tween = _create_tween(sprite)
	tween.tween_property(sprite, "modulate", Color.WHITE, strike_time * 0.5)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	await tween.finished

	# Recovery: return from recoil.
	tween = _create_tween(sprite)
	tween.tween_property(sprite, "position", origin, recovery)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await tween.finished


## ── Hit Reaction Animation ──────────────────────────────────────────────────
## Plays on the target when they take damage.

func play_hit_reaction(
	target_sprite: Node2D,
	damage_amount: int,
	is_crit: bool,
	speed_multiplier: float = 1.0,
) -> void:
	if target_sprite == null or not is_instance_valid(target_sprite):
		return

	var duration: float = 0.25 / speed_multiplier
	var flash_color := Color(1.0, 0.4, 0.4, 1.0)
	var shake_amount: float = 4.0 if not is_crit else 8.0

	# Flash red.
	var tween := _create_tween(target_sprite)
	tween.tween_property(target_sprite, "modulate", flash_color, duration * 0.15)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tween.tween_property(target_sprite, "modulate", Color.WHITE, duration * 0.35)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)

	# Shake: rapid horizontal oscillation.
	var origin: Vector2 = target_sprite.position
	var shake_tween := _create_tween(target_sprite)
	var shake_steps: int = 4 if not is_crit else 6
	var step_time: float = duration / float(shake_steps)
	for i in range(shake_steps):
		var offset_x: float = shake_amount * (1.0 if i % 2 == 0 else -1.0)
		offset_x *= (1.0 - float(i) / float(shake_steps))  # Dampen.
		shake_tween.tween_property(target_sprite, "position",
			origin + Vector2(offset_x, 0), step_time)\
			.set_trans(Tween.TRANS_SINE)

	# Squash-stretch on crit.
	if is_crit:
		var squash_tween := _create_tween(target_sprite)
		squash_tween.tween_property(target_sprite, "scale", Vector2(1.2, 0.85), duration * 0.3)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
		squash_tween.tween_property(target_sprite, "scale", Vector2(1.0, 1.0), duration * 0.7)\
			.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)


## ── Faint Animation ─────────────────────────────────────────────────────────
## Plays when a unit is defeated. Fades out and shrinks.

func play_faint_animation(
	sprite: Node2D,
	speed_multiplier: float = 1.0,
) -> void:
	if sprite == null or not is_instance_valid(sprite):
		return

	var duration: float = 0.6 / speed_multiplier

	var tween := _create_tween(sprite)
	tween.set_parallel(true)

	# Fade out.
	tween.tween_property(sprite, "modulate:a", 0.0, duration)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	# Shrink and drop.
	tween.tween_property(sprite, "scale", Vector2(0.5, 0.5), duration)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.tween_property(sprite, "position:y", sprite.position.y + 20.0, duration)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)


## ── Class Special Animation ─────────────────────────────────────────────────
## Plays the unique class special animation. Handles teleport for assassins.

func play_class_special(
	attacker_sprite: Node2D,
	target_sprite: Node2D,
	special_data: Dictionary,
	speed_multiplier: float = 1.0,
) -> void:
	if attacker_sprite == null or not is_instance_valid(attacker_sprite):
		return

	var origin: Vector2 = attacker_sprite.position
	var total_dur: float = special_data.get("total_duration", 0.8) / speed_multiplier
	var pre_move: Vector2 = special_data.get("pre_move", Vector2.ZERO)
	var strike_count: int = special_data.get("strike_count", 1)
	var strike_interval: float = special_data.get("strike_interval", 0.1) / speed_multiplier
	var has_teleport: bool = special_data.get("has_teleport", false)
	var flash_color: Color = special_data.get("flash_color", Color(1, 1, 1, 0.3))
	var shake: float = special_data.get("shake_intensity", 0.5)

	if has_teleport and target_sprite != null and is_instance_valid(target_sprite):
		# Assassin teleport: fade out, appear behind target, strike.
		await _animate_teleport_strike(attacker_sprite, target_sprite, origin,
			total_dur, flash_color, speed_multiplier)
	else:
		# Standard special: pre-move, multi-strike, return.
		var direction: Vector2 = Vector2.RIGHT
		if target_sprite != null and is_instance_valid(target_sprite):
			direction = (target_sprite.position - attacker_sprite.position).normalized()
			if direction.is_zero_approx():
				direction = Vector2.RIGHT

		var move_target: Vector2 = origin + Vector2(pre_move.x * direction.x, pre_move.y)

		# Pre-move phase.
		var pre_dur: float = total_dur * 0.25
		var tween := _create_tween(attacker_sprite)
		tween.tween_property(attacker_sprite, "position", move_target, pre_dur)\
			.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
		await tween.finished

		# Multi-strike phase.
		for strike_idx in range(strike_count):
			# Quick strike motion.
			var strike_offset: Vector2 = direction * 12.0
			if strike_count > 1:
				# Alternate strike positions slightly.
				strike_offset += Vector2(0, randf_range(-6.0, 6.0))

			tween = _create_tween(attacker_sprite)
			tween.tween_property(attacker_sprite, "position",
				move_target + strike_offset, strike_interval * 0.4)\
				.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
			tween.tween_property(attacker_sprite, "position",
				move_target, strike_interval * 0.6)\
				.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
			await tween.finished

			# Flash on each strike hit.
			if target_sprite != null and is_instance_valid(target_sprite):
				_flash_sprite(target_sprite, flash_color, 0.1 / speed_multiplier)

			# Shake on each strike.
			if grid_display != null and shake > 0.0:
				_apply_screen_shake(grid_display, shake * 0.5, 0.08 / speed_multiplier)

		# Return phase.
		var return_dur: float = total_dur * 0.25
		tween = _create_tween(attacker_sprite)
		tween.tween_property(attacker_sprite, "position", origin, return_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
		await tween.finished

	# Final impact shake.
	if grid_display != null and shake > 0.0:
		_apply_screen_shake(grid_display, shake, 0.15 / speed_multiplier)


## ── Assassin Teleport Strike ────────────────────────────────────────────────

func _animate_teleport_strike(
	attacker: Node2D,
	target: Node2D,
	origin: Vector2,
	total_dur: float,
	flash_color: Color,
	speed_multiplier: float,
) -> void:
	# Phase 1: Vanish (fade out with smoke-like scale).
	var vanish_dur: float = total_dur * 0.2
	var tween := _create_tween(attacker)
	tween.set_parallel(true)
	tween.tween_property(attacker, "modulate:a", 0.0, vanish_dur)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	tween.tween_property(attacker, "scale", Vector2(0.6, 1.3), vanish_dur)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	await tween.finished

	# Spawn vanish VFX at origin.
	if vfx_system != null:
		vfx_system.spawn_teleport_smoke(origin)

	# Phase 2: Reposition behind target (instant, invisible).
	var behind_offset: Vector2 = (target.position - origin).normalized() * 24.0
	attacker.position = target.position + behind_offset
	attacker.scale = Vector2(1.0, 1.0)

	# Spawn appear VFX.
	if vfx_system != null:
		vfx_system.spawn_teleport_smoke(attacker.position)

	# Phase 3: Appear (fade in).
	var appear_dur: float = total_dur * 0.15
	tween = _create_tween(attacker)
	tween.tween_property(attacker, "modulate:a", 1.0, appear_dur)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Phase 4: Backstab strike.
	var strike_dur: float = total_dur * 0.2
	tween = _create_tween(attacker)
	tween.tween_property(attacker, "position", target.position, strike_dur)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await tween.finished

	# Flash target.
	_flash_sprite(target, flash_color, 0.12 / speed_multiplier)

	# Phase 5: Return to origin.
	var return_dur: float = total_dur * 0.25

	# Brief vanish again.
	tween = _create_tween(attacker)
	tween.tween_property(attacker, "modulate:a", 0.0, return_dur * 0.3)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	await tween.finished

	attacker.position = origin

	tween = _create_tween(attacker)
	tween.tween_property(attacker, "modulate:a", 1.0, return_dur * 0.7)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await tween.finished


## ── Knockback Visual Animation ──────────────────────────────────────────────
## Animate a unit being knocked back across the grid.

func play_knockback_animation(
	sprite: Node2D,
	from_screen: Vector2,
	to_screen: Vector2,
	hit_wall: bool,
	speed_multiplier: float = 1.0,
) -> void:
	if sprite == null or not is_instance_valid(sprite):
		return

	var distance: float = from_screen.distance_to(to_screen)
	var duration: float = maxf(0.15, distance / 800.0) / speed_multiplier

	var tween := _create_tween(sprite)
	tween.tween_property(sprite, "position", to_screen, duration)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await tween.finished

	if hit_wall:
		# Wall slam: bounce back slightly with shake.
		var bounce_dir: Vector2 = (from_screen - to_screen).normalized() * 6.0
		tween = _create_tween(sprite)
		tween.tween_property(sprite, "position", to_screen + bounce_dir, 0.05 / speed_multiplier)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.tween_property(sprite, "position", to_screen, 0.1 / speed_multiplier)\
			.set_trans(Tween.TRANS_BOUNCE).set_ease(Tween.EASE_OUT)

		# Flash red on wall hit.
		_flash_sprite(sprite, Color(1.0, 0.3, 0.2, 0.5), 0.15 / speed_multiplier)

		if grid_display != null:
			_apply_screen_shake(grid_display, 0.4, 0.12 / speed_multiplier)


## ── Utility ─────────────────────────────────────────────────────────────────

## Create and track a tween. Uses the sprite's scene tree for tween creation.
## If the node is invalid, returns a minimal tween from grid_display as fallback
## to prevent null dereference crashes during mid-animation node freeing.
func _create_tween(node: Node2D) -> Tween:
	if node != null and is_instance_valid(node) and node.is_inside_tree():
		var tween: Tween = node.create_tween()
		_active_tweens.append(tween)
		return tween
	# Fallback: create a no-op tween from grid_display if available.
	if grid_display != null and is_instance_valid(grid_display) and grid_display.is_inside_tree():
		var fallback: Tween = grid_display.create_tween()
		_active_tweens.append(fallback)
		return fallback
	# Last resort: return a dummy tween. This should never happen in practice
	# since grid_display should always be valid during battle.
	push_warning("BattleAnimationController: No valid node for tween creation.")
	return null


## Flash a sprite with a color overlay briefly.
func _flash_sprite(sprite: Node2D, color: Color, duration: float) -> void:
	if sprite == null or not is_instance_valid(sprite):
		return
	var tween := _create_tween(sprite)
	tween.tween_property(sprite, "modulate", color, duration * 0.3)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tween.tween_property(sprite, "modulate", Color.WHITE, duration * 0.7)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)


## Apply screen shake to a parent node.
func _apply_screen_shake(node: Node2D, intensity: float, duration: float) -> void:
	if node == null or not is_instance_valid(node):
		return
	var original_pos: Vector2 = node.position
	var tween := _create_tween(node)
	var steps: int = maxi(2, int(duration / 0.03))
	var step_dur: float = duration / float(steps)
	for i in range(steps):
		var remaining_factor: float = 1.0 - float(i) / float(steps)
		var offset := Vector2(
			randf_range(-intensity, intensity) * 6.0 * remaining_factor,
			randf_range(-intensity, intensity) * 6.0 * remaining_factor
		)
		tween.tween_property(node, "position", original_pos + offset, step_dur)
	tween.tween_property(node, "position", original_pos, step_dur)


## Ensure a sprite returns to its original position.
func _ensure_position_reset(sprite: Node2D, origin: Vector2, duration: float) -> void:
	if sprite == null or not is_instance_valid(sprite):
		return
	if sprite.position.distance_to(origin) > 1.0:
		var tween := _create_tween(sprite)
		tween.tween_property(sprite, "position", origin, duration * 0.5)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)


## Get element-themed glow color for cast animations.
func _get_element_glow(element_type: String) -> Color:
	match element_type:
		"Fire":     return Color(1.3, 0.7, 0.3, 1.0)
		"Water":    return Color(0.4, 0.7, 1.3, 1.0)
		"Plant":    return Color(0.4, 1.2, 0.5, 1.0)
		"Ice":      return Color(0.6, 0.9, 1.4, 1.0)
		"Wind":     return Color(0.8, 1.2, 0.9, 1.0)
		"Earth":    return Color(0.9, 0.7, 0.4, 1.0)
		"Electric": return Color(1.3, 1.2, 0.4, 1.0)
		"Dark":     return Color(0.5, 0.3, 0.7, 1.0)
		"Light":    return Color(1.3, 1.3, 1.0, 1.0)
		"Fairy":    return Color(1.2, 0.6, 1.1, 1.0)
		"Lunar":    return Color(0.7, 0.6, 1.2, 1.0)
		"Solar":    return Color(1.4, 1.1, 0.5, 1.0)
		"Metal":    return Color(0.8, 0.85, 0.95, 1.0)
		"Poison":   return Color(0.6, 1.0, 0.4, 1.0)
		_:          return Color(1.1, 1.1, 1.1, 1.0)


## Kill all active tweens (for battle end cleanup).
func cleanup() -> void:
	for tween in _active_tweens:
		if tween != null and tween.is_valid():
			tween.kill()
	_active_tweens.clear()

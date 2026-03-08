## ChibiSpriteAnimator — Drives frame-by-frame procedural animation of modular
## chibi sprites assembled from individual body parts (Head, Body, FrontArm,
## BackArm, Weapon, Legs). Animates each part independently via Godot Tweens,
## producing sword swings, spell casts, hit recoils, idle breathing, and more.
##
## Style reference: HippoGames Fantasy Heroes / Character Editor Megapack —
## modular upper-body and lower-body animation with weapon swing arcs driven
## by arm rotation.
##
## The sprite_root Node2D is expected to have these child nodes:
##   "Head", "Body", "FrontArm", "BackArm", "Weapon", "Legs"
## Weapon is typically a child of FrontArm so it inherits arm rotation, but
## this animator can also apply additional weapon offsets when needed.
##
## Usage:
##   var animator = ChibiSpriteAnimator.new()
##   await animator.play_animation(sprite_root, ChibiSpriteAnimator.AnimState.ATTACK_SLASH, 1.0)
class_name ChibiSpriteAnimator
extends RefCounted


## ── Animation States ──────────────────────────────────────────────────────────

enum AnimState {
	IDLE,
	READY,
	WALK,
	ATTACK_SLASH,
	ATTACK_THRUST,
	ATTACK_SMASH,
	ATTACK_CAST,
	ATTACK_SHOOT,
	HIT,
	FAINT,
}

## Body part node names expected under the sprite root.
const PART_HEAD      := "Head"
const PART_BODY      := "Body"
const PART_FRONT_ARM := "FrontArm"
const PART_BACK_ARM  := "BackArm"
const PART_WEAPON    := "Weapon"
const PART_LEGS      := "Legs"


## ── Timing Defaults (seconds) ─────────────────────────────────────────────────

## Base durations for each animation phase. Multiplied by 1.0/speed_mult.
const SLASH_FRAME_DUR   := 0.07
const THRUST_FRAME_DUR  := 0.06
const SMASH_FRAME_DUR   := 0.09
const CAST_FRAME_DUR    := 0.12
const SHOOT_FRAME_DUR   := 0.08
const HIT_DURATION      := 0.25
const FAINT_DURATION     := 0.6
const IDLE_CYCLE         := 1.8
const READY_CYCLE        := 1.0
const WALK_CYCLE         := 0.5


## ── State ─────────────────────────────────────────────────────────────────────

## Active tweens tracked per sprite root (keyed by sprite_root instance ID).
## Each entry is an Array[Tween].
var _active_tweens: Dictionary = {}

## Active idle loop references (keyed by sprite_root instance ID).
var _idle_loops: Dictionary = {}

## Original positions of body parts, captured on first animation.
## Keyed by "instance_id:part_name" -> Vector2.
## Used by _reset_pose to restore positions after animations modify them.
var _original_positions: Dictionary = {}


## ── Main Entry Point ──────────────────────────────────────────────────────────

## Play the given animation state on a modular chibi sprite.
## [sprite_root]  -- The assembled Node2D with body-part children.
## [state]        -- AnimState enum value.
## [speed_mult]   -- Speed multiplier (higher = faster).
func play_animation(sprite_root: Node2D, state: int, speed_mult: float = 1.0) -> void:
	if sprite_root == null or not is_instance_valid(sprite_root):
		return

	# Stop any running animation on this sprite before starting a new one.
	_kill_tweens_for(sprite_root)

	# Cache original part positions on first use so _reset_pose can restore them.
	_cache_original_positions(sprite_root)

	# Reset to neutral before starting new animation to prevent drift.
	_reset_pose(sprite_root)

	match state:
		AnimState.IDLE:
			await _anim_idle(sprite_root, speed_mult)
		AnimState.READY:
			await _anim_ready(sprite_root, speed_mult)
		AnimState.WALK:
			await _anim_walk(sprite_root, speed_mult)
		AnimState.ATTACK_SLASH:
			await _anim_attack_slash(sprite_root, speed_mult)
		AnimState.ATTACK_THRUST:
			await _anim_attack_thrust(sprite_root, speed_mult)
		AnimState.ATTACK_SMASH:
			await _anim_attack_smash(sprite_root, speed_mult)
		AnimState.ATTACK_CAST:
			await _anim_attack_cast(sprite_root, speed_mult)
		AnimState.ATTACK_SHOOT:
			await _anim_attack_shoot(sprite_root, speed_mult)
		AnimState.HIT:
			await _anim_hit(sprite_root, speed_mult)
		AnimState.FAINT:
			await _anim_faint(sprite_root, speed_mult)


## Start a looping idle animation that repeats until stopped.
## This creates a self-sustaining tween loop via a callback.
func play_idle_loop(sprite_root: Node2D) -> void:
	if sprite_root == null or not is_instance_valid(sprite_root):
		return

	var sid: int = sprite_root.get_instance_id()
	_idle_loops[sid] = true

	# Run the loop in a deferred way so it doesn't block the caller.
	_run_idle_loop(sprite_root, sid)


## Stop all running tweens on a sprite and reset every part to its neutral pose.
func stop_animation(sprite_root: Node2D) -> void:
	if sprite_root == null or not is_instance_valid(sprite_root):
		return

	var sid: int = sprite_root.get_instance_id()
	_idle_loops.erase(sid)
	_kill_tweens_for(sprite_root)
	_reset_pose(sprite_root)


## ── Idle Animation ────────────────────────────────────────────────────────────
## Gentle breathing bob: head and body drift up/down 1-2 px with a slow sine
## wave. Arms sway faintly. Body pulses scale slightly for a breathing feel.

func _anim_idle(sprite_root: Node2D, speed_mult: float) -> void:
	var dur: float = IDLE_CYCLE / speed_mult
	var half: float = dur * 0.5

	var head := _get_part(sprite_root, PART_HEAD)
	var body := _get_part(sprite_root, PART_BODY)
	var front_arm := _get_part(sprite_root, PART_FRONT_ARM)
	var back_arm := _get_part(sprite_root, PART_BACK_ARM)
	var legs := _get_part(sprite_root, PART_LEGS)

	# Head bob up then back down.
	if head:
		var origin_y: float = head.position.y
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		t.tween_property(head, "position:y", origin_y - 1.5, half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(head, "position:y", origin_y, half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# Body bob and breathing scale pulse.
	if body:
		var origin_y: float = body.position.y
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.set_parallel(true)
		t.tween_property(body, "position:y", origin_y - 1.0, half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(body, "scale", Vector2(1.01, 1.02), half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.set_parallel(false)
		t.tween_property(body, "position:y", origin_y, half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(body, "scale", Vector2(1.0, 1.0), half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# Front arm gentle sway.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(3.0), half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(front_arm, "rotation", 0.0, half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# Back arm counter-sway.
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-2.0), half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(back_arm, "rotation", 0.0, half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# Wait for the longest tween to finish (head has the full cycle).
	await sprite_root.get_tree().create_timer(dur).timeout


## ── Ready Animation ───────────────────────────────────────────────────────────
## Battle stance with a bouncy bob — arms slightly raised, faster rhythm.

func _anim_ready(sprite_root: Node2D, speed_mult: float) -> void:
	var dur: float = READY_CYCLE / speed_mult
	var half: float = dur * 0.5

	var body := _get_part(sprite_root, PART_BODY)
	var front_arm := _get_part(sprite_root, PART_FRONT_ARM)
	var back_arm := _get_part(sprite_root, PART_BACK_ARM)
	var legs := _get_part(sprite_root, PART_LEGS)

	if body:
		var origin_y: float = body.position.y
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "position:y", origin_y - 2.0, half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(body, "position:y", origin_y, half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# Arms held in guard position.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(-15.0), half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(front_arm, "rotation", deg_to_rad(-10.0), half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(10.0), half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(back_arm, "rotation", deg_to_rad(5.0), half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# Slight leg bounce.
	if legs:
		var origin_y: float = legs.position.y
		var t := _create_tween(sprite_root, legs)
		if t == null:
			return
		t.tween_property(legs, "position:y", origin_y + 1.0, half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(legs, "position:y", origin_y, half)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	await sprite_root.get_tree().create_timer(dur).timeout


## ── Walk Animation ────────────────────────────────────────────────────────────
## Legs alternate back and forth; arms swing opposite to legs; body bobs.

func _anim_walk(sprite_root: Node2D, speed_mult: float) -> void:
	var dur: float = WALK_CYCLE / speed_mult
	var quarter: float = dur * 0.25

	var body := _get_part(sprite_root, PART_BODY)
	var head := _get_part(sprite_root, PART_HEAD)
	var front_arm := _get_part(sprite_root, PART_FRONT_ARM)
	var back_arm := _get_part(sprite_root, PART_BACK_ARM)
	var legs := _get_part(sprite_root, PART_LEGS)

	# Body vertical bob (two bounces per cycle).
	if body:
		var origin_y: float = body.position.y
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "position:y", origin_y - 2.0, quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		t.tween_property(body, "position:y", origin_y, quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
		t.tween_property(body, "position:y", origin_y - 2.0, quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		t.tween_property(body, "position:y", origin_y, quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)

	# Head follows body bob slightly.
	if head:
		var origin_y: float = head.position.y
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		t.tween_property(head, "position:y", origin_y - 1.5, quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		t.tween_property(head, "position:y", origin_y, quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)
		t.tween_property(head, "position:y", origin_y - 1.5, quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		t.tween_property(head, "position:y", origin_y, quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN)

	# Front arm swings: forward on step 1, back on step 2.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(20.0), dur * 0.5)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(front_arm, "rotation", deg_to_rad(-20.0), dur * 0.5)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# Back arm swings opposite.
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-15.0), dur * 0.5)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(back_arm, "rotation", deg_to_rad(15.0), dur * 0.5)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	# Legs alternate tilt to simulate stepping.
	if legs:
		var t := _create_tween(sprite_root, legs)
		if t == null:
			return
		t.tween_property(legs, "rotation", deg_to_rad(8.0), quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(legs, "rotation", 0.0, quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(legs, "rotation", deg_to_rad(-8.0), quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(legs, "rotation", 0.0, quarter)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	await sprite_root.get_tree().create_timer(dur).timeout


## ── ATTACK_SLASH Animation ────────────────────────────────────────────────────
## The signature sword/axe swing. Six frames driving front arm rotation through
## a full arc, with back arm counter-motion, head bob on impact, and body tilt.
##
## Frame 1 — Wind-up:        Front arm -60 deg, weapon raised
## Frame 2 — Peak:           Front arm -90 deg (overhead), body leans back
## Frame 3 — Mid-swing:      Front arm -30 deg, body lurches forward
## Frame 4 — Impact:         Front arm +30 deg (below horizontal), strike point
## Frame 5 — Follow-through: Front arm +60 deg
## Frame 6 — Recovery:       Front arm back to 0 deg (neutral)

func _anim_attack_slash(sprite_root: Node2D, speed_mult: float) -> void:
	var fd: float = SLASH_FRAME_DUR / speed_mult  # Frame duration.

	var head := _get_part(sprite_root, PART_HEAD)
	var body := _get_part(sprite_root, PART_BODY)
	var front_arm := _get_part(sprite_root, PART_FRONT_ARM)
	var back_arm := _get_part(sprite_root, PART_BACK_ARM)
	var weapon := _get_part(sprite_root, PART_WEAPON)

	# ── Frame 1: Wind-up ──
	# Front arm rotates back to -60 deg; weapon raised.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(-60.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	# Back arm counters slightly (+15 deg).
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(15.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	# Body starts neutral.
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "rotation", deg_to_rad(2.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(fd).timeout

	# ── Frame 2: Peak (overhead) ──
	# Front arm at -90 deg; body leans back slightly.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(-90.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(25.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "rotation", deg_to_rad(5.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		t.tween_property(head, "position:y", head.position.y - 1.0, fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(fd).timeout

	# ── Frame 3: Mid-swing ──
	# Front arm sweeps forward to -30 deg; body lurches forward.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(-30.0), fd)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(10.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "rotation", deg_to_rad(-3.0), fd)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	await sprite_root.get_tree().create_timer(fd).timeout

	# ── Frame 4: Impact ──
	# Front arm at +30 deg (below horizontal); head bobs forward; body commits.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(30.0), fd * 0.8)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-10.0), fd * 0.8)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "rotation", deg_to_rad(-6.0), fd * 0.8)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		t.tween_property(head, "position:y", head.position.y + 2.0, fd * 0.8)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	# Extra weapon rotation kick on impact for axes.
	if weapon:
		var t := _create_tween(sprite_root, weapon)
		if t == null:
			return
		t.tween_property(weapon, "rotation", deg_to_rad(15.0), fd * 0.8)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(fd).timeout

	# ── Frame 5: Follow-through ──
	# Front arm continues to +60 deg.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(60.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-15.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "rotation", deg_to_rad(-4.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	if weapon:
		var t := _create_tween(sprite_root, weapon)
		if t == null:
			return
		t.tween_property(weapon, "rotation", deg_to_rad(20.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(fd).timeout

	# ── Frame 6: Recovery ──
	# Everything returns to neutral (0 degrees).
	var recovery_dur: float = fd * 1.5  # Slightly longer for a smooth settle.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		var head_origin: Vector2 = _get_original_position(sprite_root, PART_HEAD)
		t.tween_property(head, "position:y", head_origin.y, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if weapon:
		var t := _create_tween(sprite_root, weapon)
		if t == null:
			return
		t.tween_property(weapon, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await sprite_root.get_tree().create_timer(recovery_dur).timeout


## ── ATTACK_THRUST Animation ───────────────────────────────────────────────────
## Spear/dagger thrust — front arm pulls back, then punches straight forward.
## Quick and snappy. Weapon stays aligned with arm direction.

func _anim_attack_thrust(sprite_root: Node2D, speed_mult: float) -> void:
	var fd: float = THRUST_FRAME_DUR / speed_mult

	var body := _get_part(sprite_root, PART_BODY)
	var front_arm := _get_part(sprite_root, PART_FRONT_ARM)
	var back_arm := _get_part(sprite_root, PART_BACK_ARM)
	var weapon := _get_part(sprite_root, PART_WEAPON)

	# ── Pull back ──
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(-40.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(10.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "rotation", deg_to_rad(4.0), fd)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(fd).timeout

	# ── Arm coil (hold briefly) ──
	await sprite_root.get_tree().create_timer(fd * 0.5).timeout

	# ── Thrust forward ──
	var strike_dur: float = fd * 0.7  # Very fast snap.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(35.0), strike_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if front_arm:
		# Push arm position forward for visual punch.
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "position:x", front_arm.position.x + 6.0, strike_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "rotation", deg_to_rad(-5.0), strike_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-5.0), strike_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(strike_dur).timeout

	# ── Hold at extension briefly ──
	await sprite_root.get_tree().create_timer(fd * 0.3).timeout

	# ── Recovery ──
	var recovery_dur: float = fd * 1.5
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.set_parallel(true)
		t.tween_property(front_arm, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
		var arm_origin: Vector2 = _get_original_position(sprite_root, PART_FRONT_ARM)
		t.tween_property(front_arm, "position:x", arm_origin.x, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await sprite_root.get_tree().create_timer(recovery_dur).timeout


## ── ATTACK_SMASH Animation ────────────────────────────────────────────────────
## Hammer/mace overhead slam — both arms raise together to -90 deg, pause at
## peak, then slam down to +70 deg. Body compresses (squash) on impact.

func _anim_attack_smash(sprite_root: Node2D, speed_mult: float) -> void:
	var fd: float = SMASH_FRAME_DUR / speed_mult

	var head := _get_part(sprite_root, PART_HEAD)
	var body := _get_part(sprite_root, PART_BODY)
	var front_arm := _get_part(sprite_root, PART_FRONT_ARM)
	var back_arm := _get_part(sprite_root, PART_BACK_ARM)
	var weapon := _get_part(sprite_root, PART_WEAPON)

	# ── Raise phase: both arms up to -90 deg ──
	var raise_dur: float = fd * 2.0
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(-90.0), raise_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-90.0), raise_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	if body:
		# Body stretches upward.
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.set_parallel(true)
		t.tween_property(body, "scale", Vector2(0.95, 1.08), raise_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		t.tween_property(body, "position:y", body.position.y - 3.0, raise_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		t.tween_property(head, "position:y", head.position.y - 4.0, raise_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(raise_dur).timeout

	# ── Pause at peak ──
	await sprite_root.get_tree().create_timer(fd * 0.6).timeout

	# ── Slam down: both arms to +70 deg ──
	var slam_dur: float = fd * 0.8  # Fast slam.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(70.0), slam_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(70.0), slam_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	# Body squash on impact.
	if body:
		var body_origin_y: float = body.position.y + 3.0  # Undo the raise offset.
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.set_parallel(true)
		t.tween_property(body, "scale", Vector2(1.12, 0.88), slam_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
		t.tween_property(body, "position:y", body_origin_y + 2.0, slam_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		t.tween_property(head, "position:y", head.position.y + 5.0, slam_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	# Extra weapon slam rotation.
	if weapon:
		var t := _create_tween(sprite_root, weapon)
		if t == null:
			return
		t.tween_property(weapon, "rotation", deg_to_rad(25.0), slam_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_IN)
	await sprite_root.get_tree().create_timer(slam_dur).timeout

	# ── Impact hold (ground effect timing window) ──
	await sprite_root.get_tree().create_timer(fd * 0.4).timeout

	# ── Recovery: unsquash and return to neutral ──
	var recovery_dur: float = fd * 2.5
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		var body_origin: Vector2 = _get_original_position(sprite_root, PART_BODY)
		t.set_parallel(true)
		t.tween_property(body, "scale", Vector2(1.0, 1.0), recovery_dur)\
			.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
		t.tween_property(body, "position:y", body_origin.y, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		var head_origin: Vector2 = _get_original_position(sprite_root, PART_HEAD)
		t.tween_property(head, "position:y", head_origin.y, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if weapon:
		var t := _create_tween(sprite_root, weapon)
		if t == null:
			return
		t.tween_property(weapon, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(recovery_dur).timeout


## ── ATTACK_CAST Animation ─────────────────────────────────────────────────────
## Magical channeling — both arms raise outward, body lifts, pulse effect,
## then release and settle back.

func _anim_attack_cast(sprite_root: Node2D, speed_mult: float) -> void:
	var fd: float = CAST_FRAME_DUR / speed_mult

	var head := _get_part(sprite_root, PART_HEAD)
	var body := _get_part(sprite_root, PART_BODY)
	var front_arm := _get_part(sprite_root, PART_FRONT_ARM)
	var back_arm := _get_part(sprite_root, PART_BACK_ARM)

	# ── Channeling raise ──
	var raise_dur: float = fd * 2.0
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(-70.0), raise_dur)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-60.0), raise_dur)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.set_parallel(true)
		t.tween_property(body, "position:y", body.position.y - 4.0, raise_dur)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
		t.tween_property(body, "scale", Vector2(1.05, 1.05), raise_dur)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		t.tween_property(head, "position:y", head.position.y - 5.0, raise_dur)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(raise_dur).timeout

	# ── Channel pulse (arms widen then contract) ──
	var pulse_dur: float = fd * 1.5
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(-85.0), pulse_dur * 0.5)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(front_arm, "rotation", deg_to_rad(-70.0), pulse_dur * 0.5)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-75.0), pulse_dur * 0.5)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(back_arm, "rotation", deg_to_rad(-60.0), pulse_dur * 0.5)\
			.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	# Body scale pulse for magical energy burst.
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "scale", Vector2(1.1, 1.1), pulse_dur * 0.4)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
		t.tween_property(body, "scale", Vector2(1.05, 1.05), pulse_dur * 0.6)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	await sprite_root.get_tree().create_timer(pulse_dur).timeout

	# ── Release burst ──
	var release_dur: float = fd * 0.8
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(-30.0), release_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-20.0), release_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(release_dur).timeout

	# ── Recovery ──
	var recovery_dur: float = fd * 2.0
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		var body_origin: Vector2 = _get_original_position(sprite_root, PART_BODY)
		t.set_parallel(true)
		t.tween_property(body, "position:y", body_origin.y, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(body, "scale", Vector2(1.0, 1.0), recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		var head_origin: Vector2 = _get_original_position(sprite_root, PART_HEAD)
		t.tween_property(head, "position:y", head_origin.y, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await sprite_root.get_tree().create_timer(recovery_dur).timeout


## ── ATTACK_SHOOT Animation ────────────────────────────────────────────────────
## Bow animation — back arm draws back (pulling bowstring), front arm holds
## steady (bow grip), release and snap forward.

func _anim_attack_shoot(sprite_root: Node2D, speed_mult: float) -> void:
	var fd: float = SHOOT_FRAME_DUR / speed_mult

	var body := _get_part(sprite_root, PART_BODY)
	var front_arm := _get_part(sprite_root, PART_FRONT_ARM)
	var back_arm := _get_part(sprite_root, PART_BACK_ARM)

	# ── Aim: front arm extends forward, back arm draws back ──
	var draw_dur: float = fd * 2.0
	if front_arm:
		# Front arm holds at slight forward angle (gripping the bow).
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(15.0), draw_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	if back_arm:
		# Back arm draws back (pulling the string).
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-50.0), draw_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	if body:
		# Slight lean back for draw tension.
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.set_parallel(true)
		t.tween_property(body, "rotation", deg_to_rad(3.0), draw_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		t.tween_property(body, "scale", Vector2(1.04, 0.97), draw_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(draw_dur).timeout

	# ── Hold at full draw ──
	await sprite_root.get_tree().create_timer(fd * 0.5).timeout

	# ── Release: back arm snaps forward ──
	var release_dur: float = fd * 0.5
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(10.0), release_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.set_parallel(true)
		t.tween_property(body, "rotation", deg_to_rad(-2.0), release_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
		t.tween_property(body, "scale", Vector2(0.97, 1.03), release_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	await sprite_root.get_tree().create_timer(release_dur).timeout

	# ── Recovery ──
	var recovery_dur: float = fd * 2.0
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.set_parallel(true)
		t.tween_property(body, "rotation", 0.0, recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
		t.tween_property(body, "scale", Vector2(1.0, 1.0), recovery_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	await sprite_root.get_tree().create_timer(recovery_dur).timeout


## ── HIT Animation ─────────────────────────────────────────────────────────────
## Quick jerk backward, flash white, arms flinch up briefly.

func _anim_hit(sprite_root: Node2D, speed_mult: float) -> void:
	var dur: float = HIT_DURATION / speed_mult
	var recoil_dur: float = dur * 0.25
	var flash_dur: float = dur * 0.15
	var settle_dur: float = dur * 0.6

	var head := _get_part(sprite_root, PART_HEAD)
	var body := _get_part(sprite_root, PART_BODY)
	var front_arm := _get_part(sprite_root, PART_FRONT_ARM)
	var back_arm := _get_part(sprite_root, PART_BACK_ARM)

	# ── Recoil: body jerks backward, arms flinch up ──
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "position:x", body.position.x - 4.0, recoil_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		t.tween_property(head, "position:x", head.position.x - 3.0, recoil_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(-25.0), recoil_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(-20.0), recoil_dur)\
			.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)

	# ── Flash white on all parts ──
	_flash_all_parts(sprite_root, Color(2.0, 2.0, 2.0, 1.0), flash_dur)
	await sprite_root.get_tree().create_timer(recoil_dur + flash_dur).timeout

	# ── Quick shake ──
	if body:
		var shake_dur: float = dur * 0.2
		var step: float = shake_dur / 4.0
		var origin_x: float = body.position.x
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "position:x", origin_x + 3.0, step)
		t.tween_property(body, "position:x", origin_x - 2.0, step)
		t.tween_property(body, "position:x", origin_x + 1.0, step)
		t.tween_property(body, "position:x", origin_x, step)

	# ── Settle back to neutral ──
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		var body_origin: Vector2 = _get_original_position(sprite_root, PART_BODY)
		t.tween_property(body, "position:x", body_origin.x, settle_dur)\
			.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		var head_origin: Vector2 = _get_original_position(sprite_root, PART_HEAD)
		t.tween_property(head, "position:x", head_origin.x, settle_dur)\
			.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", 0.0, settle_dur)\
			.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", 0.0, settle_dur)\
			.set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)

	# Restore modulate on all parts.
	_flash_all_parts(sprite_root, Color.WHITE, settle_dur * 0.3)
	await sprite_root.get_tree().create_timer(settle_dur).timeout


## ── FAINT Animation ───────────────────────────────────────────────────────────
## Arms go limp (rotate down), body tilts to the side, head droops, fade out.

func _anim_faint(sprite_root: Node2D, speed_mult: float) -> void:
	var dur: float = FAINT_DURATION / speed_mult
	var collapse_dur: float = dur * 0.6
	var fade_dur: float = dur * 0.4

	var head := _get_part(sprite_root, PART_HEAD)
	var body := _get_part(sprite_root, PART_BODY)
	var front_arm := _get_part(sprite_root, PART_FRONT_ARM)
	var back_arm := _get_part(sprite_root, PART_BACK_ARM)
	var legs := _get_part(sprite_root, PART_LEGS)
	var weapon := _get_part(sprite_root, PART_WEAPON)

	# ── Collapse phase: everything goes limp ──
	# Arms dangle down.
	if front_arm:
		var t := _create_tween(sprite_root, front_arm)
		if t == null:
			return
		t.tween_property(front_arm, "rotation", deg_to_rad(80.0), collapse_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	if back_arm:
		var t := _create_tween(sprite_root, back_arm)
		if t == null:
			return
		t.tween_property(back_arm, "rotation", deg_to_rad(70.0), collapse_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	# Body tilts to the side.
	if body:
		var t := _create_tween(sprite_root, body)
		if t == null:
			return
		t.tween_property(body, "rotation", deg_to_rad(25.0), collapse_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	# Head droops forward and to the side.
	if head:
		var t := _create_tween(sprite_root, head)
		if t == null:
			return
		t.set_parallel(true)
		t.tween_property(head, "rotation", deg_to_rad(30.0), collapse_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		t.tween_property(head, "position:y", head.position.y + 6.0, collapse_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	# Legs buckle.
	if legs:
		var t := _create_tween(sprite_root, legs)
		if t == null:
			return
		t.tween_property(legs, "scale", Vector2(1.1, 0.7), collapse_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	# Weapon drops (extra rotation).
	if weapon:
		var t := _create_tween(sprite_root, weapon)
		if t == null:
			return
		t.tween_property(weapon, "rotation", deg_to_rad(45.0), collapse_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	await sprite_root.get_tree().create_timer(collapse_dur).timeout

	# ── Fade out phase ──
	# Fade the entire sprite root.
	var t := _create_tween(sprite_root, sprite_root)
	if t == null:
		return
	t.tween_property(sprite_root, "modulate:a", 0.0, fade_dur)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	# Slight downward drift during fade.
	if body:
		var tb := _create_tween(sprite_root, body)
		if tb == null:
			return
		tb.tween_property(body, "position:y", body.position.y + 8.0, fade_dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	await sprite_root.get_tree().create_timer(fade_dur).timeout


## ── Utility: Get Part ─────────────────────────────────────────────────────────
## Safely returns a child Node2D by name, or null if not found.

func _get_part(sprite_root: Node2D, part_name: String) -> Node2D:
	if sprite_root == null or not is_instance_valid(sprite_root):
		return null
	# Weapon is a child of FrontArm (assembled by ChibiSpriteAssembler),
	# so check the nested path if direct lookup fails.
	if not sprite_root.has_node(part_name):
		if part_name == PART_WEAPON and sprite_root.has_node(PART_FRONT_ARM + "/" + PART_WEAPON):
			var node: Node = sprite_root.get_node(PART_FRONT_ARM + "/" + PART_WEAPON)
			if node is Node2D:
				return node as Node2D
		return null
	var node: Node = sprite_root.get_node(part_name)
	if node is Node2D:
		return node as Node2D
	return null


## ── Utility: Tween Creation & Tracking ────────────────────────────────────────

## Create a tween from the given node and track it for cleanup.
## [owner_root] is used as the dictionary key for tracking.
## [target_node] is the node the tween is created on (must be in tree).
## Falls back to owner_root if target_node is not in tree.
## Returns null only when no valid in-tree node exists at all — callers
## that chain methods on the return value MUST null-check first.
func _create_tween(owner_root: Node2D, target_node: Node2D = null) -> Tween:
	var node: Node2D = target_node if target_node != null else owner_root
	# If the preferred node is unavailable, fall back to the owner root.
	if node == null or not is_instance_valid(node) or not node.is_inside_tree():
		node = owner_root
	if node == null or not is_instance_valid(node) or not node.is_inside_tree():
		push_warning("ChibiSpriteAnimator: Cannot create tween — no valid in-tree node.")
		return null

	var tween: Tween = node.create_tween()
	var sid: int = owner_root.get_instance_id()
	if not _active_tweens.has(sid):
		_active_tweens[sid] = []
	_active_tweens[sid].append(tween)
	return tween


## Kill all tweens associated with a sprite root.
func _kill_tweens_for(sprite_root: Node2D) -> void:
	var sid: int = sprite_root.get_instance_id()
	if _active_tweens.has(sid):
		var tweens: Array = _active_tweens[sid]
		for tween in tweens:
			if tween != null and tween.is_valid():
				tween.kill()
		_active_tweens.erase(sid)


## ── Utility: Reset Pose ──────────────────────────────────────────────────────
## Snap all body parts back to their neutral transform (no animation).
## Restores rotation, scale, AND position to the original assembly positions
## set by ChibiSpriteAssembler, which are stored in _original_positions.

func _reset_pose(sprite_root: Node2D) -> void:
	var parts: Array[String] = [
		PART_HEAD, PART_BODY, PART_FRONT_ARM, PART_BACK_ARM, PART_WEAPON, PART_LEGS,
	]
	var sid: int = sprite_root.get_instance_id()
	for part_name in parts:
		var part := _get_part(sprite_root, part_name)
		if part:
			part.rotation = 0.0
			part.scale = Vector2(1.0, 1.0)
			# Restore original position if we have it cached.
			var key: String = str(sid) + ":" + part_name
			if _original_positions.has(key):
				part.position = _original_positions[key]
	# Reset root modulate alpha in case faint was playing.
	sprite_root.modulate.a = 1.0


## ── Utility: Cache Original Positions ─────────────────────────────────────────
## Snapshot each body part's position on first use so we can restore it later.

func _cache_original_positions(sprite_root: Node2D) -> void:
	var sid: int = sprite_root.get_instance_id()
	var parts: Array[String] = [
		PART_HEAD, PART_BODY, PART_FRONT_ARM, PART_BACK_ARM, PART_WEAPON, PART_LEGS,
	]
	for part_name in parts:
		var key: String = str(sid) + ":" + part_name
		if not _original_positions.has(key):
			var part := _get_part(sprite_root, part_name)
			if part:
				_original_positions[key] = part.position


## ── Utility: Get Original Position ────────────────────────────────────────────
## Returns the cached original position for a body part, or its current position
## if not cached. Used by recovery frames to tween back to the correct origin.

func _get_original_position(sprite_root: Node2D, part_name: String) -> Vector2:
	var sid: int = sprite_root.get_instance_id()
	var key: String = str(sid) + ":" + part_name
	if _original_positions.has(key):
		return _original_positions[key]
	var part := _get_part(sprite_root, part_name)
	if part:
		return part.position
	return Vector2.ZERO


## ── Utility: Flash All Parts ──────────────────────────────────────────────────
## Apply a modulate color flash to every body part simultaneously.

func _flash_all_parts(sprite_root: Node2D, color: Color, duration: float) -> void:
	var parts: Array[String] = [
		PART_HEAD, PART_BODY, PART_FRONT_ARM, PART_BACK_ARM, PART_WEAPON, PART_LEGS,
	]
	for part_name in parts:
		var part := _get_part(sprite_root, part_name)
		if part:
			var t := _create_tween(sprite_root, part)
			if t:
				t.tween_property(part, "modulate", color, duration)\
					.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)


## ── Utility: Idle Loop Runner ─────────────────────────────────────────────────
## Internal coroutine that keeps replaying idle until _idle_loops[sid] is cleared.

func _run_idle_loop(sprite_root: Node2D, sid: int) -> void:
	while _idle_loops.has(sid):
		if sprite_root == null or not is_instance_valid(sprite_root):
			_idle_loops.erase(sid)
			return
		if not sprite_root.is_inside_tree():
			_idle_loops.erase(sid)
			return

		await _anim_idle(sprite_root, 1.0)

	# Loop ended — reset to neutral.
	if sprite_root != null and is_instance_valid(sprite_root):
		_kill_tweens_for(sprite_root)
		_reset_pose(sprite_root)


## ── Cleanup ───────────────────────────────────────────────────────────────────
## Kill every tracked tween across all sprites. Call on battle end or scene exit.

func cleanup() -> void:
	for sid in _active_tweens.keys():
		var tweens: Array = _active_tweens[sid]
		for tween in tweens:
			if tween != null and tween.is_valid():
				tween.kill()
	_active_tweens.clear()
	_idle_loops.clear()
	_original_positions.clear()

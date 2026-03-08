## BattleVFXSystem — Spawns visual effects during combat: hit impacts,
## elemental bursts, comic-book style impact text, projectile trails,
## teleport smoke, and special ability VFX overlays.
##
## All VFX are procedurally generated using Godot drawing primitives and tweens.
## Effects are designed to be punchy but not overstimulating — short duration,
## moderate scale, with quick fade-outs.
##
## Attach as a child of the Battle scene. Draws on a CanvasLayer above the grid
## but below the UI.
extends Node2D


## ── Constants ────────────────────────────────────────────────────────────────

## Maximum simultaneous VFX nodes to prevent performance issues on mobile.
const MAX_VFX_NODES: int = 20

## Comic impact text options (shown randomly on big hits).
const IMPACT_WORDS: PackedStringArray = PackedStringArray([
	"BAM!", "POW!", "WHAM!", "CRACK!", "SMASH!",
])

## Minimum damage threshold to show comic impact text (avoids spam).
const COMIC_TEXT_THRESHOLD: int = 30

## ── Element Color Palette ───────────────────────────────────────────────────

const ELEMENT_COLORS: Dictionary = {
	"Fire":     Color(1.0, 0.45, 0.15),
	"Water":    Color(0.2, 0.55, 1.0),
	"Plant":    Color(0.25, 0.85, 0.35),
	"Ice":      Color(0.5, 0.85, 1.0),
	"Wind":     Color(0.7, 0.95, 0.75),
	"Earth":    Color(0.75, 0.55, 0.3),
	"Electric": Color(1.0, 0.95, 0.3),
	"Dark":     Color(0.4, 0.2, 0.55),
	"Light":    Color(1.0, 1.0, 0.8),
	"Fairy":    Color(1.0, 0.5, 0.85),
	"Lunar":    Color(0.55, 0.45, 0.9),
	"Solar":    Color(1.0, 0.85, 0.35),
	"Metal":    Color(0.7, 0.75, 0.85),
	"Poison":   Color(0.5, 0.85, 0.3),
}

## Neutral hit color when element is unknown.
const DEFAULT_HIT_COLOR := Color(1.0, 1.0, 1.0)

## ── Doodle Art Style Settings ────────────────────────────────────────────────

## Enable/disable doodle hand-drawn look for all VFX.
var doodle_enabled: bool = true

## Amount of random wobble applied to Line2D points (pixels).
const DOODLE_LINE_WOBBLE: float = 2.0

## Number of hatching lines drawn over colored VFX areas.
const DOODLE_HATCH_LINE_COUNT: int = 5

## Sketch outline color used for doodle pen strokes.
const DOODLE_STROKE_COLOR := Color("2d2d2d", 0.7)

## Doodle particle shape types.
const DOODLE_PARTICLE_SHAPES: PackedStringArray = PackedStringArray([
	"star", "spiral", "heart", "scribble_cloud",
])

## Active VFX tracked for doodle impact cleanup.
var _active_vfx: Array[Node2D] = []


## ── Initialization ──────────────────────────────────────────────────────────

func _ready() -> void:
	# Ensure this node doesn't block input.
	z_index = 5


## ── Public API: Hit Impacts ─────────────────────────────────────────────────

## Spawn a melee hit impact effect at a screen position.
## Style varies by weapon attack style.
func spawn_hit_impact(pos: Vector2, element: String, attack_style: int = 0) -> void:
	_enforce_vfx_limit()
	var color: Color = ELEMENT_COLORS.get(element, DEFAULT_HIT_COLOR)

	match attack_style:
		WeaponAnimationData.AttackStyle.SLASH:
			_spawn_slash_mark(pos, color)
		WeaponAnimationData.AttackStyle.THRUST:
			_spawn_stab_point(pos, color)
		WeaponAnimationData.AttackStyle.SMASH, WeaponAnimationData.AttackStyle.BLOCK_BASH:
			_spawn_shockwave_ring(pos, color)
		WeaponAnimationData.AttackStyle.CAST, WeaponAnimationData.AttackStyle.HOLY_STRIKE:
			_spawn_magic_burst(pos, color)
		WeaponAnimationData.AttackStyle.PUNCH:
			_spawn_punch_star(pos, color)
		_:
			_spawn_basic_hit(pos, color)


## Spawn a projectile impact (arrow hit, bullet hit, flask splash).
func spawn_projectile_impact(pos: Vector2, element: String) -> void:
	_enforce_vfx_limit()
	var color: Color = ELEMENT_COLORS.get(element, DEFAULT_HIT_COLOR)
	_spawn_basic_hit(pos, color)
	# Small debris particles.
	_spawn_particles(pos, color, 4, 15.0)


## Spawn comic-book style impact text for big hits.
func spawn_comic_impact(pos: Vector2, damage: int) -> void:
	if damage < COMIC_TEXT_THRESHOLD:
		return
	_enforce_vfx_limit()

	var word: String = IMPACT_WORDS[randi() % IMPACT_WORDS.size()]
	var label := Label.new()
	label.text = word
	label.position = pos + Vector2(randf_range(-20, 20), randf_range(-30, -10))
	label.pivot_offset = Vector2(40, 15)
	label.size = Vector2(80, 30)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

	# Comic book style: bold, outlined, slightly rotated.
	var font_size: int = 24 + mini(12, damage / 20)
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", Color(1.0, 1.0, 0.9))
	label.add_theme_color_override("font_shadow_color", Color(0.1, 0.1, 0.15, 0.9))
	label.add_theme_color_override("font_outline_color", Color(0.15, 0.1, 0.1, 0.95))
	label.add_theme_constant_override("shadow_offset_x", 3)
	label.add_theme_constant_override("shadow_offset_y", 3)
	label.add_theme_constant_override("outline_size", 4)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Random slight rotation for comic feel.
	label.rotation = randf_range(deg_to_rad(-15.0), deg_to_rad(15.0))

	# Doodle mode: add a hand-drawn speech bubble behind the text.
	var bubble_container := Node2D.new()
	bubble_container.position = label.position + Vector2(label.size.x * 0.5, label.size.y * 0.5)
	if doodle_enabled:
		var bubble := Line2D.new()
		bubble.width = randf_range(2.0, 3.5)
		bubble.default_color = DOODLE_STROKE_COLOR
		bubble.z_index = -1
		# Draw a wobbly rounded rectangle around the text area.
		var bw: float = label.size.x * 0.6 + 6.0
		var bh: float = label.size.y * 0.6 + 4.0
		var corners: Array[Vector2] = [
			Vector2(-bw, -bh), Vector2(bw, -bh),
			Vector2(bw, bh), Vector2(-bw, bh),
		]
		for idx in range(corners.size()):
			var next_idx: int = (idx + 1) % corners.size()
			_add_wobbly_line_points(bubble, corners[idx], corners[next_idx], 3)
		# Close the shape.
		bubble.add_point(corners[0] + Vector2(
			randf_range(-DOODLE_LINE_WOBBLE, DOODLE_LINE_WOBBLE),
			randf_range(-DOODLE_LINE_WOBBLE, DOODLE_LINE_WOBBLE)))
		bubble_container.add_child(bubble)
		# Add a small tail/pointer at the bottom.
		var tail := Line2D.new()
		tail.width = 2.0
		tail.default_color = DOODLE_STROKE_COLOR
		tail.add_point(Vector2(-4.0, bh))
		tail.add_point(Vector2(0.0, bh + 8.0))
		tail.add_point(Vector2(4.0, bh))
		bubble_container.add_child(tail)
	add_child(bubble_container)

	add_child(label)

	# Animate: pop in, hold briefly, fade out.
	label.scale = Vector2(0.3, 0.3)
	label.modulate.a = 0.0

	var tween := create_tween()
	# Pop in.
	tween.set_parallel(true)
	tween.tween_property(label, "scale", Vector2(1.1, 1.1), 0.12)\
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(label, "modulate:a", 1.0, 0.08)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.set_parallel(false)

	# Settle.
	tween.tween_property(label, "scale", Vector2(1.0, 1.0), 0.08)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

	# Hold.
	tween.tween_interval(0.3)

	# Fade out and float up.
	tween.set_parallel(true)
	tween.tween_property(label, "modulate:a", 0.0, 0.25)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.tween_property(label, "position:y", label.position.y - 30.0, 0.25)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.set_parallel(false)

	tween.tween_callback(label.queue_free)
	# Also fade and free the doodle bubble container.
	if doodle_enabled:
		var bubble_tween := create_tween()
		bubble_tween.tween_interval(0.48)
		bubble_tween.tween_property(bubble_container, "modulate:a", 0.0, 0.25)
		bubble_tween.tween_callback(bubble_container.queue_free)


## Spawn teleport smoke cloud for assassin abilities.
func spawn_teleport_smoke(pos: Vector2) -> void:
	_enforce_vfx_limit()
	_spawn_smoke_cloud(pos, Color(0.3, 0.2, 0.45, 0.7), 20.0)


## Spawn a knockback trail effect between two positions.
func spawn_knockback_trail(from: Vector2, to: Vector2) -> void:
	_enforce_vfx_limit()
	_spawn_motion_trail(from, to, Color(0.9, 0.7, 0.3, 0.5))


## ── Private VFX Implementations ─────────────────────────────────────────────

## Basic hit flash: expanding circle that fades.
func _spawn_basic_hit(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)
	var radius_start: float = 4.0
	var radius_end: float = 20.0
	var duration: float = 0.25

	# Use a ColorRect as a simple expanding circle approximation.
	var rect := ColorRect.new()
	rect.color = Color(color, 0.8)
	rect.size = Vector2(radius_start * 2, radius_start * 2)
	rect.position = Vector2(-radius_start, -radius_start)
	rect.pivot_offset = Vector2(radius_start, radius_start)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vfx.add_child(rect)

	# Doodle mode: add thin hatching lines over the hit flash area.
	if doodle_enabled:
		_add_sketch_hatching(vfx, radius_end)

	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(rect, "size", Vector2(radius_end * 2, radius_end * 2), duration)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tween.tween_property(rect, "position", Vector2(-radius_end, -radius_end), duration)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tween.tween_property(rect, "color:a", 0.0, duration)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.set_parallel(false)
	tween.tween_callback(vfx.queue_free)


## Slash mark: angled line that appears and fades.
## Doodle mode: uses wobbly multi-segment lines instead of clean straight ones.
func _spawn_slash_mark(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)

	# Two crossing lines for an X-shaped slash.
	for i in range(2):
		var line := Line2D.new()
		line.width = 3.0
		line.default_color = Color(color, 0.9)
		var angle: float = deg_to_rad(45.0 + 90.0 * float(i))
		var half_len: float = 18.0
		var start_pt := Vector2(cos(angle), sin(angle)) * -half_len
		var end_pt := Vector2(cos(angle), sin(angle)) * half_len
		if doodle_enabled:
			_add_wobbly_line_points(line, start_pt, end_pt, 5)
			line.width = randf_range(2.0, 4.0)
		else:
			line.add_point(start_pt)
			line.add_point(end_pt)
		vfx.add_child(line)
	# Doodle: add a thin sketch outline layer behind the colored slash.
	if doodle_enabled:
		_add_sketch_outline_layer(vfx, color)

	var tween := create_tween()
	tween.tween_property(vfx, "modulate:a", 0.0, 0.3)\
		.set_delay(0.1)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.tween_callback(vfx.queue_free)


## Stab point: small concentrated impact burst.
## Doodle mode: radial lines are wobbly and vary in width.
func _spawn_stab_point(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)

	# Small radial lines from center.
	for i in range(4):
		var line := Line2D.new()
		line.width = 2.0
		line.default_color = Color(color, 0.85)
		var angle: float = deg_to_rad(float(i) * 90.0 + 45.0)
		var dir := Vector2(cos(angle), sin(angle))
		if doodle_enabled:
			_add_wobbly_line_points(line, dir * 3.0, dir * 12.0, 4)
			line.width = randf_range(1.5, 3.0)
		else:
			line.add_point(dir * 3.0)
			line.add_point(dir * 12.0)
		vfx.add_child(line)

	vfx.scale = Vector2(0.5, 0.5)
	var tween := create_tween()
	tween.tween_property(vfx, "scale", Vector2(1.2, 1.2), 0.12)\
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(vfx, "modulate:a", 0.0, 0.2)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.tween_callback(vfx.queue_free)


## Shockwave ring: expanding ring outline.
## Doodle mode: ring has wobbly edges like a hand-drawn circle.
func _spawn_shockwave_ring(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)

	# Create multiple expanding circles using Line2D arcs.
	var ring_points: int = 16
	var ring := Line2D.new()
	ring.width = 3.0
	ring.default_color = Color(color, 0.8)
	var radius: float = 6.0
	for i in range(ring_points + 1):
		var angle: float = TAU * float(i) / float(ring_points)
		var wobble_r: float = radius
		if doodle_enabled:
			wobble_r += randf_range(-DOODLE_LINE_WOBBLE, DOODLE_LINE_WOBBLE)
		ring.add_point(Vector2(cos(angle), sin(angle)) * wobble_r)
	if doodle_enabled:
		ring.width = randf_range(2.0, 4.0)
	vfx.add_child(ring)

	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(vfx, "scale", Vector2(3.5, 3.5), 0.3)\
		.set_trans(Tween.TRANS_EXPO).set_ease(Tween.EASE_OUT)
	tween.tween_property(ring, "width", 1.0, 0.3)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.tween_property(vfx, "modulate:a", 0.0, 0.3)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.set_parallel(false)
	tween.tween_callback(vfx.queue_free)


## Magic burst: expanding star/sparkle pattern.
## Doodle mode: star rays are wobbly with varying widths.
func _spawn_magic_burst(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)

	# Star pattern.
	var points: int = 6
	for i in range(points):
		var line := Line2D.new()
		line.width = 2.5
		line.default_color = Color(color, 0.85)
		var angle: float = TAU * float(i) / float(points)
		var dir := Vector2(cos(angle), sin(angle))
		if doodle_enabled:
			_add_wobbly_line_points(line, dir * 2.0, dir * 16.0, 4)
			line.width = randf_range(2.0, 3.5)
		else:
			line.add_point(dir * 2.0)
			line.add_point(dir * 16.0)
		vfx.add_child(line)

	vfx.scale = Vector2(0.3, 0.3)
	var tween := create_tween()
	tween.set_parallel(true)
	tween.tween_property(vfx, "scale", Vector2(1.5, 1.5), 0.2)\
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(vfx, "rotation", deg_to_rad(30.0), 0.2)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tween.set_parallel(false)
	tween.tween_property(vfx, "modulate:a", 0.0, 0.2)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.tween_callback(vfx.queue_free)


## Punch star: classic cartoon impact star.
## Doodle mode: star rays are wobbly with hand-drawn feel.
func _spawn_punch_star(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)

	# 8-pointed star using alternating long/short radial lines.
	var points: int = 8
	for i in range(points):
		var line := Line2D.new()
		line.width = 2.0
		line.default_color = Color(color, 0.9)
		var angle: float = TAU * float(i) / float(points)
		var dir := Vector2(cos(angle), sin(angle))
		var length: float = 14.0 if i % 2 == 0 else 8.0
		if doodle_enabled:
			_add_wobbly_line_points(line, Vector2.ZERO, dir * length, 4)
			line.width = randf_range(1.5, 3.0)
		else:
			line.add_point(Vector2.ZERO)
			line.add_point(dir * length)
		vfx.add_child(line)

	vfx.scale = Vector2(0.2, 0.2)
	var tween := create_tween()
	tween.tween_property(vfx, "scale", Vector2(1.3, 1.3), 0.1)\
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tween.tween_property(vfx, "scale", Vector2(1.0, 1.0), 0.08)
	tween.tween_property(vfx, "modulate:a", 0.0, 0.2)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.tween_callback(vfx.queue_free)


## Smoke cloud: expanding and dispersing cloud.
func _spawn_smoke_cloud(pos: Vector2, color: Color, radius: float) -> void:
	var vfx := _create_vfx_node(pos)

	# Multiple small squares representing smoke puffs.
	var puff_count: int = 6
	for i in range(puff_count):
		var rect := ColorRect.new()
		rect.color = color
		var puff_size: float = randf_range(6.0, 12.0)
		rect.size = Vector2(puff_size, puff_size)
		rect.position = Vector2(
			randf_range(-radius * 0.3, radius * 0.3),
			randf_range(-radius * 0.3, radius * 0.3)
		) - rect.size / 2.0
		rect.pivot_offset = rect.size / 2.0
		rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vfx.add_child(rect)

		# Each puff expands outward.
		var end_pos: Vector2 = rect.position + Vector2(
			randf_range(-radius, radius),
			randf_range(-radius, radius)
		)
		var tween := create_tween()
		tween.set_parallel(true)
		var dur: float = randf_range(0.25, 0.4)
		tween.tween_property(rect, "position", end_pos, dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.tween_property(rect, "color:a", 0.0, dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tween.tween_property(rect, "size", rect.size * 1.5, dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

	# Clean up parent after all puffs dissipate.
	var cleanup_tween := create_tween()
	cleanup_tween.tween_interval(0.5)
	cleanup_tween.tween_callback(vfx.queue_free)


## Small particle burst.
func _spawn_particles(pos: Vector2, color: Color, count: int, spread: float) -> void:
	var vfx := _create_vfx_node(pos)

	for i in range(count):
		var rect := ColorRect.new()
		rect.color = Color(color, 0.9)
		var s: float = randf_range(2.0, 4.0)
		rect.size = Vector2(s, s)
		rect.position = -rect.size / 2.0
		rect.pivot_offset = rect.size / 2.0
		rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		vfx.add_child(rect)

		var angle: float = randf_range(0, TAU)
		var dist: float = randf_range(spread * 0.3, spread)
		var end_pos: Vector2 = rect.position + Vector2(cos(angle), sin(angle)) * dist
		var dur: float = randf_range(0.2, 0.35)

		var tween := create_tween()
		tween.set_parallel(true)
		tween.tween_property(rect, "position", end_pos, dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.tween_property(rect, "color:a", 0.0, dur)\
			.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)

	var cleanup := create_tween()
	cleanup.tween_interval(0.4)
	cleanup.tween_callback(vfx.queue_free)


## Motion trail between two points (for knockback visualization).
func _spawn_motion_trail(from: Vector2, to: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(from)

	var line := Line2D.new()
	line.width = 4.0
	line.default_color = color
	line.add_point(Vector2.ZERO)
	line.add_point(to - from)
	vfx.add_child(line)

	var tween := create_tween()
	tween.tween_property(line, "width", 0.5, 0.3)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.tween_property(vfx, "modulate:a", 0.0, 0.15)
	tween.tween_callback(vfx.queue_free)


## ── Utility ─────────────────────────────────────────────────────────────────

## Create a positioned container node for VFX children.
func _create_vfx_node(pos: Vector2) -> Node2D:
	var node := Node2D.new()
	node.position = pos
	add_child(node)
	return node


## Remove oldest VFX nodes if we exceed the limit.
func _enforce_vfx_limit() -> void:
	while get_child_count() > MAX_VFX_NODES:
		var oldest: Node = get_child(0)
		if oldest != null:
			oldest.free()  # Use free() not queue_free() to avoid infinite loop.
		else:
			break

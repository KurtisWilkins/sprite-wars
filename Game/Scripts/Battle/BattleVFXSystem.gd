## BattleVFXSystem — Spawns visual effects during combat: hit impacts,
## elemental bursts, comic-book style impact text, projectile trails,
## teleport smoke, and special ability VFX overlays.
##
## All VFX are procedurally generated using Godot drawing primitives and tweens.
## Effects use a flat cel-shaded style with clean black outlines, vibrant
## saturated colors, hard-edged shading, and clean geometric shapes.
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

## ── Element Color Palette (vibrant saturated for cel-shaded look) ─────────

const ELEMENT_COLORS: Dictionary = {
	"Fire":     Color(1.0, 0.35, 0.05),
	"Water":    Color(0.1, 0.5, 1.0),
	"Plant":    Color(0.15, 0.9, 0.25),
	"Ice":      Color(0.4, 0.85, 1.0),
	"Wind":     Color(0.6, 1.0, 0.65),
	"Earth":    Color(0.8, 0.5, 0.2),
	"Electric": Color(1.0, 0.95, 0.15),
	"Dark":     Color(0.35, 0.15, 0.55),
	"Light":    Color(1.0, 1.0, 0.75),
	"Fairy":    Color(1.0, 0.4, 0.85),
	"Lunar":    Color(0.5, 0.4, 0.95),
	"Solar":    Color(1.0, 0.85, 0.2),
	"Metal":    Color(0.65, 0.7, 0.85),
	"Poison":   Color(0.45, 0.9, 0.2),
}

## Neutral hit color when element is unknown.
const DEFAULT_HIT_COLOR := Color(1.0, 1.0, 1.0)

## ── Cel-Shaded Art Style Settings ─────────────────────────────────────────

## Clean black outline color used for cel-shaded VFX borders.
const OUTLINE_COLOR := Color(0.05, 0.05, 0.05, 0.95)

## Outline width for cel-shaded VFX shapes.
const OUTLINE_WIDTH: float = 2.0

## Clean geometric particle shape types for cel-shaded style.
const PARTICLE_SHAPES: PackedStringArray = PackedStringArray([
	"circle", "diamond", "star", "triangle",
])

## Active VFX tracked for cleanup.
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
## Uses clean bold font with solid black outline — cel-shaded style.
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

	# Cel-shaded style: clean bold font with solid black outline, no sketchy text.
	var font_size: int = 24 + mini(12, damage / 20)
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", Color(1.0, 1.0, 0.9))
	label.add_theme_color_override("font_shadow_color", Color(0.05, 0.05, 0.1, 0.95))
	label.add_theme_color_override("font_outline_color", Color(0.05, 0.05, 0.05, 1.0))
	label.add_theme_constant_override("shadow_offset_x", 2)
	label.add_theme_constant_override("shadow_offset_y", 2)
	label.add_theme_constant_override("outline_size", 5)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE

	# Clean fixed rotation for bold cel-shaded feel (no random wobble).
	label.rotation = deg_to_rad(-5.0)

	# Cel-shaded style: clean geometric speech bubble with solid black outline.
	var bubble_container := Node2D.new()
	bubble_container.position = label.position + Vector2(label.size.x * 0.5, label.size.y * 0.5)
	var bubble := Line2D.new()
	bubble.width = OUTLINE_WIDTH
	bubble.default_color = OUTLINE_COLOR
	bubble.z_index = -1
	# Draw a clean rounded rectangle around the text area.
	var bw: float = label.size.x * 0.6 + 6.0
	var bh: float = label.size.y * 0.6 + 4.0
	var corners: Array[Vector2] = [
		Vector2(-bw, -bh), Vector2(bw, -bh),
		Vector2(bw, bh), Vector2(-bw, bh),
	]
	for idx in range(corners.size()):
		var next_idx: int = (idx + 1) % corners.size()
		bubble.add_point(corners[idx])
		bubble.add_point(corners[next_idx])
	# Close the shape.
	bubble.add_point(corners[0])
	bubble_container.add_child(bubble)
	# Add a small clean tail/pointer at the bottom.
	var tail := Line2D.new()
	tail.width = OUTLINE_WIDTH
	tail.default_color = OUTLINE_COLOR
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
	# Also fade and free the bubble container.
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


## ── Public API: Cel-Shaded Impact ─────────────────────────────────────────

## Spawn a cel-shaded impact effect with clean geometric shapes and solid outlines.
func spawn_cel_impact(position: Vector2, impact_type: String, element_color: Color) -> void:
	var impact_node := Node2D.new()
	impact_node.position = position
	impact_node.z_index = 70
	add_child(impact_node)

	# Clean radial burst lines around impact with solid color and black outlines.
	var mark_count := randi_range(3, 6)
	for i in range(mark_count):
		var angle := (TAU / float(mark_count)) * float(i)
		var dist := randf_range(8.0, 20.0)
		var mark_pos := Vector2(cos(angle), sin(angle)) * dist
		# Create clean straight line with consistent width.
		var line := Line2D.new()
		line.width = 2.0
		line.default_color = OUTLINE_COLOR
		var line_dir := Vector2(cos(angle), sin(angle)) * randf_range(4.0, 8.0)
		line.add_point(mark_pos)
		line.add_point(mark_pos + line_dir)
		impact_node.add_child(line)

	# Add element-colored geometric particles around the impact.
	var particle_count := randi_range(2, 4)
	for i in range(particle_count):
		var geo_p := _create_geometric_particle(element_color)
		geo_p.position = Vector2(randf_range(-12.0, 12.0), randf_range(-12.0, 12.0))
		impact_node.add_child(geo_p)

	# Fade out and remove.
	var tween := create_tween()
	tween.tween_property(impact_node, "modulate:a", 0.0, 0.4)
	tween.tween_callback(func(): _active_vfx.erase(impact_node); impact_node.queue_free())

	_active_vfx.append(impact_node)


## ── Private VFX Implementations ─────────────────────────────────────────────

## Basic hit flash: expanding circle that fades. Uses solid flat color fill.
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
## Cel-shaded style: clean straight lines with consistent width and black outline.
func _spawn_slash_mark(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)

	# Two crossing lines for an X-shaped slash — clean straight edges.
	for i in range(2):
		var line := Line2D.new()
		line.width = 3.0
		line.default_color = Color(color, 0.9)
		var angle: float = deg_to_rad(45.0 + 90.0 * float(i))
		var half_len: float = 18.0
		var start_pt := Vector2(cos(angle), sin(angle)) * -half_len
		var end_pt := Vector2(cos(angle), sin(angle)) * half_len
		line.add_point(start_pt)
		line.add_point(end_pt)
		vfx.add_child(line)

	# Add clean black outline behind the colored slash.
	_add_clean_outline_layer(vfx, color)

	var tween := create_tween()
	tween.tween_property(vfx, "modulate:a", 0.0, 0.3)\
		.set_delay(0.1)\
		.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
	tween.tween_callback(vfx.queue_free)


## Stab point: small concentrated impact burst.
## Cel-shaded style: clean radial lines with uniform width.
func _spawn_stab_point(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)

	# Small radial lines from center — clean and uniform.
	for i in range(4):
		var line := Line2D.new()
		line.width = 2.0
		line.default_color = Color(color, 0.85)
		var angle: float = deg_to_rad(float(i) * 90.0 + 45.0)
		var dir := Vector2(cos(angle), sin(angle))
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
## Cel-shaded style: clean perfect circle with uniform line width.
func _spawn_shockwave_ring(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)

	# Create a clean circle using Line2D arc.
	var ring_points: int = 16
	var ring := Line2D.new()
	ring.width = 3.0
	ring.default_color = Color(color, 0.8)
	var radius: float = 6.0
	for i in range(ring_points + 1):
		var angle: float = TAU * float(i) / float(ring_points)
		ring.add_point(Vector2(cos(angle), sin(angle)) * radius)
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
## Cel-shaded style: clean straight rays with uniform width.
func _spawn_magic_burst(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)

	# Star pattern — clean geometric rays.
	var points: int = 6
	for i in range(points):
		var line := Line2D.new()
		line.width = 2.5
		line.default_color = Color(color, 0.85)
		var angle: float = TAU * float(i) / float(points)
		var dir := Vector2(cos(angle), sin(angle))
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
## Cel-shaded style: clean geometric star with sharp edges.
func _spawn_punch_star(pos: Vector2, color: Color) -> void:
	var vfx := _create_vfx_node(pos)

	# 8-pointed star using alternating long/short radial lines — clean edges.
	var points: int = 8
	for i in range(points):
		var line := Line2D.new()
		line.width = 2.0
		line.default_color = Color(color, 0.9)
		var angle: float = TAU * float(i) / float(points)
		var dir := Vector2(cos(angle), sin(angle))
		var length: float = 14.0 if i % 2 == 0 else 8.0
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
## Cel-shaded style: uses clean geometric particle shapes with solid colors.
func _spawn_particles(pos: Vector2, color: Color, count: int, spread: float) -> void:
	var vfx := _create_vfx_node(pos)

	for i in range(count):
		var angle: float = randf_range(0, TAU)
		var dist: float = randf_range(spread * 0.3, spread)
		var dur: float = randf_range(0.2, 0.35)

		# Cel-shaded style: alternate between geometric shapes and solid rectangles.
		if randf() < 0.5:
			var geo_shape := _create_geometric_particle(color)
			geo_shape.position = Vector2.ZERO
			vfx.add_child(geo_shape)
			var end_pos: Vector2 = Vector2(cos(angle), sin(angle)) * dist
			var tween := create_tween()
			tween.set_parallel(true)
			tween.tween_property(geo_shape, "position", end_pos, dur)\
				.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
			tween.tween_property(geo_shape, "modulate:a", 0.0, dur)\
				.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		else:
			var rect := ColorRect.new()
			rect.color = Color(color, 0.9)
			var s: float = randf_range(2.0, 4.0)
			rect.size = Vector2(s, s)
			rect.position = -rect.size / 2.0
			rect.pivot_offset = rect.size / 2.0
			rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
			vfx.add_child(rect)
			var end_pos: Vector2 = rect.position + Vector2(cos(angle), sin(angle)) * dist
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


## ── Cel-Shaded Art Style: Internal Helpers ──────────────────────────────────

## Add a clean black outline layer behind colored VFX lines for a cel-shaded look.
func _add_clean_outline_layer(vfx: Node2D, _base_color: Color) -> void:
	var outline := Line2D.new()
	outline.width = OUTLINE_WIDTH
	outline.default_color = OUTLINE_COLOR
	outline.z_index = -1
	# Draw a clean circle outline around the effect center.
	var r: float = 13.0
	var segs: int = 12
	for i in range(segs + 1):
		var angle: float = TAU * float(i) / float(segs)
		outline.add_point(Vector2(cos(angle), sin(angle)) * r)
	vfx.add_child(outline)


## Create a small clean geometric particle node (circle, diamond, star, or triangle).
## All shapes use solid flat color fills with clean black outlines.
func _create_geometric_particle(color: Color) -> Node2D:
	var particle := Node2D.new()
	var shape_type: String = PARTICLE_SHAPES[randi() % PARTICLE_SHAPES.size()]
	var s: float = randf_range(2.0, 5.0)

	# Solid color fill line.
	var line := Line2D.new()
	line.width = 2.0
	line.default_color = Color(color, 0.9)

	# Black outline line drawn behind.
	var outline := Line2D.new()
	outline.width = 3.0
	outline.default_color = OUTLINE_COLOR
	outline.z_index = -1

	match shape_type:
		"circle":
			# Small circle with 8 segments.
			var segs: int = 8
			for i in range(segs + 1):
				var angle: float = TAU * float(i) / float(segs)
				var pt := Vector2(cos(angle), sin(angle)) * s
				line.add_point(pt)
				outline.add_point(pt)
		"diamond":
			# Clean diamond / rhombus shape.
			var pts: Array[Vector2] = [
				Vector2(0, -s), Vector2(s, 0),
				Vector2(0, s), Vector2(-s, 0),
				Vector2(0, -s),
			]
			for pt in pts:
				line.add_point(pt)
				outline.add_point(pt)
		"star":
			# Clean 4-pointed star with sharp edges.
			for i in range(4):
				var angle: float = TAU * float(i) / 4.0
				var dir := Vector2(cos(angle), sin(angle))
				line.add_point(dir * s)
				line.add_point(Vector2.ZERO)
				outline.add_point(dir * s)
				outline.add_point(Vector2.ZERO)
		"triangle":
			# Clean equilateral triangle.
			var pts: Array[Vector2] = [
				Vector2(0, -s),
				Vector2(s * 0.866, s * 0.5),
				Vector2(-s * 0.866, s * 0.5),
				Vector2(0, -s),
			]
			for pt in pts:
				line.add_point(pt)
				outline.add_point(pt)

	particle.add_child(outline)
	particle.add_child(line)
	return particle


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

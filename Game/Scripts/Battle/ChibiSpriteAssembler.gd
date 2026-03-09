## ChibiSpriteAssembler — Procedurally assembles modular chibi sprites from
## individual body parts at runtime. Each part is a separate Sprite2D node
## so it can be independently animated (arm swings, head bobs, etc.).
##
## Art style: "Flat Cel-Shaded Chibi" — clean digital illustration with uniform
## 2px black outlines, vibrant saturated colors, and hard-edged shading (one
## highlight zone and one shadow zone per color area, no gradients). Eyes are
## simple filled black circles (dot eyes). No wobble, no hatching, no sketch
## marks. All art is generated procedurally via Image + ImageTexture (no
## external texture files required).
##
## Cel-shaded rendering features:
##   - Clean uniform outlines via _draw_clean_line() and _draw_clean_rect_outline()
##   - Hard-edged cel shading via _apply_cel_shading()
##   - Simple dot eyes via _draw_cel_eyes()
##   - Clean ellipse outlines via _draw_clean_ellipse_outline()
##   - Filled circle helper via _draw_filled_circle()
##
## Layer order (back to front):
##   BackArm -> Legs -> Body -> Head -> FrontArm -> Weapon
class_name ChibiSpriteAssembler
extends RefCounted


## Canvas size for each body-part texture.
const CANVAS_SIZE := 64

## Default skin color when none is provided.
const DEFAULT_SKIN_COLOR := Color(0.93, 0.76, 0.60)

## Default armor color per evolution stage.
const STAGE_ARMOR_COLORS: Array[Color] = [
	Color(0.45, 0.50, 0.55),  # Stage 1 — iron grey
	Color(0.30, 0.45, 0.70),  # Stage 2 — steel blue
	Color(0.65, 0.50, 0.20),  # Stage 3 — gold
]

## Eye color variations per race_id modulo.
const EYE_COLORS: Array[Color] = [
	Color(0.15, 0.15, 0.15),  # Black
	Color(0.20, 0.35, 0.70),  # Blue
	Color(0.25, 0.60, 0.25),  # Green
	Color(0.60, 0.20, 0.15),  # Red
	Color(0.55, 0.30, 0.60),  # Purple
	Color(0.70, 0.55, 0.15),  # Amber
]

## Weapon handle color.
const HANDLE_COLOR := Color(0.45, 0.30, 0.15)

## Weapon blade/metal color.
const BLADE_COLOR := Color(0.75, 0.78, 0.82)

## Cel-shading constants.
const OUTLINE_THICKNESS := 2
const OUTLINE_COLOR := Color(0, 0, 0, 1)  # Pure black
const SHADOW_FACTOR := 0.75  # Shadow zone is 75% brightness of base
const HIGHLIGHT_FACTOR := 1.25  # Highlight zone is 125% brightness of base


# ── Public API ──────────────────────────────────────────────────────────────

## Assemble a complete chibi sprite from the given config and return the root
## Node2D. The caller is responsible for adding the returned node to the scene
## tree.
##
## Config keys:
##   "race_id"           : int   — determines head/body appearance
##   "evolution_stage"   : int   — 1, 2, or 3 (affects size and detail)
##   "skin_color"        : Color — skin tint
##   "equipment_visuals" : Dictionary — from EquipmentVisualDatabase
##   "weapon_type"       : String — sword, axe, mace, bow, staff, dagger, etc.
##   "facing"            : String — "left" or "right" (default "right")
func assemble_sprite(config: Dictionary) -> Node2D:
	# Cel-shaded art style: all outlines use clean uniform 2px black lines,
	# shading uses flat hard-edged shadow/highlight zones, and eyes are drawn
	# as simple filled black circles (dot eyes). No wobble, no hatching.
	var race_id: int = int(config.get("race_id", 0))
	var stage: int = clampi(int(config.get("evolution_stage", 1)), 1, 3)
	var element: String = str(config.get("element", "Fire"))
	var equip_visuals: Dictionary = config.get("equipment_visuals", {}) as Dictionary
	var weapon_type: String = str(config.get("weapon_type", "sword"))
	var facing: String = str(config.get("facing", "right"))

	# Resolve skin color from race palette (element-aware)
	var palette: Dictionary = ChibiSpriteConfig.get_race_palette(race_id, element)
	var skin_color_val = config.get("skin_color", null)
	var skin_color: Color
	if skin_color_val is Color:
		skin_color = skin_color_val
	elif palette.has("skin"):
		skin_color = palette["skin"]
	else:
		skin_color = DEFAULT_SKIN_COLOR

	# Evolution modifiers
	var evo_mods: Dictionary = ChibiSpriteConfig.get_evolution_modifiers(stage - 1)

	# Root node for the assembled sprite.
	var root := Node2D.new()
	root.name = "ChibiSprite"

	# ── Build parts ─────────────────────────────────────────────────────────

	# Back arm (behind the body).
	var back_arm := _create_arm(false, skin_color, equip_visuals.get("gloves", {}))
	back_arm.name = "BackArm"
	back_arm.position = Vector2(-8, 2)
	back_arm.z_index = -1
	root.add_child(back_arm)

	# Legs (behind body, below torso).
	var leg_visuals: Dictionary = equip_visuals.get("legs", {})
	var boot_visuals: Dictionary = equip_visuals.get("boots", {})
	var legs := _create_legs(race_id, stage, leg_visuals, boot_visuals)
	legs.name = "Legs"
	legs.position = Vector2(0, 16)
	root.add_child(legs)

	# Body / torso.
	var chest_visuals: Dictionary = equip_visuals.get("chest", {})
	var body := _create_body(race_id, stage, chest_visuals)
	body.name = "Body"
	body.position = Vector2(0, 4)
	root.add_child(body)

	# Head (oversized chibi head).
	var head := _create_head(race_id, stage, skin_color, element)
	head.name = "Head"
	head.position = Vector2(0, -16)
	root.add_child(head)

	# Front arm (weapon arm, in front of body).
	var front_arm := _create_arm(true, skin_color, equip_visuals.get("gloves", {}))
	front_arm.name = "FrontArm"
	front_arm.position = Vector2(8, 2)
	front_arm.z_index = 1
	root.add_child(front_arm)

	# Weapon (child of FrontArm). Use ChibiWeaponRenderer for detailed weapons,
	# falling back to the simpler built-in drawing.
	var weapon_visuals: Dictionary = equip_visuals.get("weapon", {})
	var weapon := Sprite2D.new()
	var _weapon_renderer := ChibiWeaponRenderer.new()
	var weapon_tex: ImageTexture = _weapon_renderer.render_weapon(weapon_type, weapon_visuals)
	if weapon_tex != null:
		weapon.texture = weapon_tex
	else:
		# Fallback to simple built-in weapon drawing.
		var fallback := _create_weapon_sprite(weapon_type, weapon_visuals)
		weapon.texture = fallback.texture
	weapon.name = "Weapon"
	var grip_offset: Vector2 = _weapon_renderer.get_weapon_grip_offset(weapon_type)
	weapon.position = grip_offset
	front_arm.add_child(weapon)

	# Effect anchor for VFX attachment.
	var effect_anchor := Node2D.new()
	effect_anchor.name = "EffectAnchor"
	effect_anchor.position = Vector2(0, -8)  # Center-chest area.
	root.add_child(effect_anchor)

	# ── Facing ──────────────────────────────────────────────────────────────

	if facing == "left":
		root.scale.x = -1.0

	return root


# ── Head ────────────────────────────────────────────────────────────────────

## Create the oversized chibi head (~26x24 px on a 64x64 canvas).
## Race ID controls shape variation; stage adds detail (horns, crest, etc.).
## Eyes are rendered as simple dot eyes via _draw_cel_eyes().
func _create_head(race_id: int, stage: int, skin_color: Color, element: String = "Fire") -> Sprite2D:
	var img := Image.create(CANVAS_SIZE, CANVAS_SIZE, false, Image.FORMAT_RGBA8)

	var cx: int = CANVAS_SIZE / 2  # 32
	var cy: int = CANVAS_SIZE / 2  # 32

	# Head dimensions — slightly varied by race.
	var half_w: int = 13 + (race_id % 3)       # 13-15
	var half_h: int = 12 + (race_id % 2)       # 12-13
	var top: int = cy - half_h
	var bottom: int = cy + half_h
	var left: int = cx - half_w
	var right: int = cx + half_w

	# Draw rounded head shape: an ellipse filled with skin color.
	_draw_filled_ellipse(img, cx, cy, half_w, half_h, skin_color)

	# Cel shading on the head fill — shadow zone on bottom-right, highlight on top-left.
	var head_rect := Rect2i(left, top, half_w * 2, half_h * 2)
	_apply_cel_shading(img, head_rect, skin_color)

	# Outline — clean uniform 2px black ellipse.
	_draw_clean_ellipse_outline(img, cx, cy, half_w, half_h, OUTLINE_COLOR)

	# ── Eyes — simple filled black dot eyes ──────────────────────────────
	var eye_palette = ChibiSpriteConfig.get_race_palette(race_id, "Fire")
	var eye_color: Color
	if eye_palette.has("eye"):
		eye_color = eye_palette["eye"]
	else:
		eye_color = EYE_COLORS[race_id % EYE_COLORS.size()]
	var head_rect_f := Rect2(
		Vector2(float(left), float(top)),
		Vector2(float(half_w * 2), float(half_h * 2))
	)
	_draw_cel_eyes(img, head_rect_f, eye_color)

	# ── Mouth ────────────────────────────────────────────────────────────
	var mouth_y: int = cy + 5
	var mouth_color := skin_color.darkened(0.25)
	# Clean straight mouth line.
	var mouth_from := Vector2(float(cx - 2), float(mouth_y))
	var mouth_to := Vector2(float(cx + 2), float(mouth_y))
	_draw_clean_line(img, mouth_from, mouth_to, mouth_color)

	# ── Race-based features ──────────────────────────────────────────────
	# Odd races get pointed ears; even races get round cheeks.
	if race_id % 2 == 1:
		# Pointed ears (small triangles on sides).
		var ear_color := skin_color.darkened(0.10)
		for ey in range(3):
			var ear_x_offset: int = half_w + 1 + ey
			var ear_y_pos: int = cy - 2 + ey
			if cx - ear_x_offset >= 0 and ear_y_pos >= 0:
				img.set_pixel(cx - ear_x_offset, ear_y_pos, ear_color)
			if cx + ear_x_offset < CANVAS_SIZE and ear_y_pos >= 0:
				img.set_pixel(cx + ear_x_offset - 1, ear_y_pos, ear_color)
	# Note: even races have round cheeks (no blush marks in cel-shaded style).

	# ── Stage detail (evolution) — element-colored marks and crowns ──────
	_draw_evolution_effects(img, stage, element, cx, top, half_h * 2)

	# Build Sprite2D.
	var sprite := Sprite2D.new()
	sprite.texture = ImageTexture.create_from_image(img)
	return sprite


# ── Body ────────────────────────────────────────────────────────────────────

## Create the small torso (~16x14 px). Chest equipment overlays armor color.
## Cel shading is applied to the armor area; outlines are clean uniform 2px black.
func _create_body(race_id: int, stage: int, equipment: Dictionary) -> Sprite2D:
	var img := Image.create(CANVAS_SIZE, CANVAS_SIZE, false, Image.FORMAT_RGBA8)

	var cx: int = CANVAS_SIZE / 2
	var cy: int = CANVAS_SIZE / 2

	# Body rect dimensions.
	var body_w: int = 16
	var body_h: int = 14
	var bx: int = cx - body_w / 2
	var by: int = cy - body_h / 2

	# Base body color (shirt / skin undertone).
	var base_color := Color(0.55, 0.45, 0.40)
	_draw_rect_filled(img, bx, by, body_w, body_h, base_color)

	# Armor overlay from equipment or stage default.
	var armor_color: Color
	if equipment.has("primary_color"):
		armor_color = equipment["primary_color"] as Color
	else:
		armor_color = STAGE_ARMOR_COLORS[clampi(stage - 1, 0, 2)]

	# Armor covers the top 10 rows of the body (chest plate area).
	_draw_rect_filled(img, bx + 1, by + 1, body_w - 2, 10, armor_color)

	# Cel shading on the armor area — shadow on bottom-right, highlight on top-left.
	var armor_rect := Rect2i(bx + 1, by + 1, body_w - 2, 10)
	_apply_cel_shading(img, armor_rect, armor_color)

	# Armor highlight strip across the chest.
	var highlight := armor_color.lightened(0.25)
	_draw_rect_filled(img, bx + 2, by + 3, body_w - 4, 1, highlight)

	# Belt at the bottom of the torso.
	var belt_color := Color(0.35, 0.25, 0.15)
	_draw_rect_filled(img, bx, by + body_h - 3, body_w, 3, belt_color)
	# Belt buckle.
	var buckle_color := Color(0.80, 0.70, 0.30)
	_draw_rect_filled(img, cx - 1, by + body_h - 3, 2, 2, buckle_color)

	# Outline — clean uniform 2px black rectangle.
	_draw_clean_rect_outline(img, bx, by, body_w, body_h, OUTLINE_COLOR)

	# Stage 3 shoulder pads.
	if stage >= 3:
		var pad_color := armor_color.lightened(0.10)
		_draw_rect_filled(img, bx - 2, by, 3, 4, pad_color)
		_draw_rect_filled(img, bx + body_w - 1, by, 3, 4, pad_color)

	var sprite := Sprite2D.new()
	sprite.texture = ImageTexture.create_from_image(img)
	return sprite


# ── Arms ────────────────────────────────────────────────────────────────────

## Create an arm sprite (~4x10 px). The pivot is at the shoulder (top of the
## arm) so rotation animates naturally. We achieve this via Sprite2D.offset.
## Outlines use clean uniform 2px black lines.
func _create_arm(is_front: bool, skin_color: Color, glove_visuals: Dictionary) -> Sprite2D:
	var img := Image.create(CANVAS_SIZE, CANVAS_SIZE, false, Image.FORMAT_RGBA8)

	var arm_w: int = 4
	var arm_h: int = 10
	# Draw the arm at the canvas center, top-aligned to the center point.
	var ax: int = CANVAS_SIZE / 2 - arm_w / 2
	var ay: int = CANVAS_SIZE / 2

	# Upper arm — skin color.
	_draw_rect_filled(img, ax, ay, arm_w, arm_h - 3, skin_color)

	# Forearm / glove area — last 3 rows.
	var glove_color: Color
	if glove_visuals.has("primary_color"):
		glove_color = glove_visuals["primary_color"] as Color
	else:
		glove_color = skin_color.darkened(0.10)
	_draw_rect_filled(img, ax, ay + arm_h - 3, arm_w, 3, glove_color)

	# Outline — clean uniform 2px black outline.
	_draw_clean_rect_outline(img, ax, ay, arm_w, arm_h, OUTLINE_COLOR)

	# Shoulder joint dot (1 px highlight at top-center).
	var shoulder_highlight := skin_color.lightened(0.20)
	img.set_pixel(ax + 1, ay, shoulder_highlight)
	img.set_pixel(ax + 2, ay, shoulder_highlight)

	var sprite := Sprite2D.new()
	sprite.texture = ImageTexture.create_from_image(img)
	# Offset so the pivot (Sprite2D origin) is at the shoulder (top of arm).
	# The arm was drawn starting at (cx, cy), so shift the texture down by
	# half the arm height so the top aligns with position (0, 0).
	sprite.offset = Vector2(0, arm_h / 2.0)
	return sprite


# ── Legs ────────────────────────────────────────────────────────────────────

## Create leg sprites (~12x10 px). Two stubby legs side by side.
## Outlines use clean uniform 2px black lines; pant areas get cel shading.
func _create_legs(race_id: int, stage: int, leg_visuals: Dictionary, boot_visuals: Dictionary) -> Sprite2D:
	var img := Image.create(CANVAS_SIZE, CANVAS_SIZE, false, Image.FORMAT_RGBA8)

	var cx: int = CANVAS_SIZE / 2
	var cy: int = CANVAS_SIZE / 2

	var leg_w: int = 5
	var leg_h: int = 10
	var gap: int = 2  # Gap between the two legs.

	# Leg color — pants or skin.
	var pant_color: Color
	if leg_visuals.has("primary_color"):
		pant_color = leg_visuals["primary_color"] as Color
	else:
		pant_color = Color(0.30, 0.30, 0.45)  # Default dark trousers.

	# Boot color.
	var boot_color: Color
	if boot_visuals.has("primary_color"):
		boot_color = boot_visuals["primary_color"] as Color
	else:
		boot_color = Color(0.35, 0.22, 0.12)  # Brown leather.

	# Left leg.
	var lx: int = cx - gap / 2 - leg_w
	var ly: int = cy - leg_h / 2
	_draw_rect_filled(img, lx, ly, leg_w, leg_h - 3, pant_color)
	_draw_rect_filled(img, lx, ly + leg_h - 3, leg_w, 3, boot_color)
	_apply_cel_shading(img, Rect2i(lx, ly, leg_w, leg_h - 3), pant_color)
	_draw_clean_rect_outline(img, lx, ly, leg_w, leg_h, OUTLINE_COLOR)

	# Right leg.
	var rx: int = cx + gap / 2
	_draw_rect_filled(img, rx, ly, leg_w, leg_h - 3, pant_color)
	_draw_rect_filled(img, rx, ly + leg_h - 3, leg_w, 3, boot_color)
	_apply_cel_shading(img, Rect2i(rx, ly, leg_w, leg_h - 3), pant_color)
	_draw_clean_rect_outline(img, rx, ly, leg_w, leg_h, OUTLINE_COLOR)

	# Stage 2+ boot detail — add a strap.
	if stage >= 2:
		var strap_color := boot_color.lightened(0.20)
		_draw_rect_filled(img, lx + 1, ly + leg_h - 2, leg_w - 2, 1, strap_color)
		_draw_rect_filled(img, rx + 1, ly + leg_h - 2, leg_w - 2, 1, strap_color)

	var sprite := Sprite2D.new()
	sprite.texture = ImageTexture.create_from_image(img)
	return sprite


# ── Weapon ──────────────────────────────────────────────────────────────────

## Create a weapon sprite with a distinct silhouette per weapon_type.
## weapon_visuals may override colors (primary_color, secondary_color).
func _create_weapon_sprite(weapon_type: String, weapon_visuals: Dictionary) -> Sprite2D:
	var img := Image.create(CANVAS_SIZE, CANVAS_SIZE, false, Image.FORMAT_RGBA8)

	var cx: int = CANVAS_SIZE / 2
	var cy: int = CANVAS_SIZE / 2

	var primary: Color
	if weapon_visuals.has("primary_color"):
		primary = weapon_visuals["primary_color"] as Color
	else:
		primary = BLADE_COLOR

	var secondary: Color
	if weapon_visuals.has("secondary_color"):
		secondary = weapon_visuals["secondary_color"] as Color
	else:
		secondary = HANDLE_COLOR

	match weapon_type:
		"sword":
			_draw_sword(img, cx, cy, primary, secondary)
		"axe":
			_draw_axe(img, cx, cy, primary, secondary)
		"mace":
			_draw_mace(img, cx, cy, primary, secondary)
		"bow":
			_draw_bow(img, cx, cy, primary, secondary)
		"staff":
			_draw_staff(img, cx, cy, primary, secondary)
		"dagger":
			_draw_dagger(img, cx, cy, primary, secondary)
		"spear":
			_draw_spear(img, cx, cy, primary, secondary)
		_:
			# Fallback: default sword.
			_draw_sword(img, cx, cy, primary, secondary)

	var sprite := Sprite2D.new()
	sprite.texture = ImageTexture.create_from_image(img)
	return sprite


# ── Weapon Drawing Helpers ──────────────────────────────────────────────────

func _draw_sword(img: Image, cx: int, cy: int, blade: Color, handle: Color) -> void:
	# Handle (bottom).
	_draw_rect_filled(img, cx - 1, cy + 4, 2, 6, handle)
	# Cross guard.
	_draw_rect_filled(img, cx - 3, cy + 3, 6, 2, handle.lightened(0.15))
	# Blade (going upward from guard).
	_draw_rect_filled(img, cx - 1, cy - 8, 2, 12, blade)
	# Blade tip (pointed).
	img.set_pixel(cx, cy - 9, blade.lightened(0.15))
	# Edge highlight.
	for y in range(cy - 8, cy + 3):
		if y >= 0 and y < CANVAS_SIZE:
			img.set_pixel(cx - 1, y, blade.lightened(0.10))


func _draw_axe(img: Image, cx: int, cy: int, blade: Color, handle: Color) -> void:
	# Handle (vertical shaft).
	_draw_rect_filled(img, cx - 1, cy - 4, 2, 14, handle)
	# Axe head (right side, top of shaft).
	_draw_rect_filled(img, cx + 1, cy - 6, 5, 6, blade)
	# Axe head curve — cut out top-right and bottom-right corners.
	img.set_pixel(cx + 5, cy - 6, Color.TRANSPARENT)
	img.set_pixel(cx + 5, cy - 1, Color.TRANSPARENT)
	# Edge highlight.
	for y in range(cy - 5, cy - 1):
		if cx + 5 < CANVAS_SIZE and y >= 0 and y < CANVAS_SIZE:
			img.set_pixel(cx + 4, y, blade.lightened(0.20))


func _draw_mace(img: Image, cx: int, cy: int, metal: Color, handle: Color) -> void:
	# Handle.
	_draw_rect_filled(img, cx - 1, cy + 2, 2, 8, handle)
	# Mace head (blocky, top).
	_draw_rect_filled(img, cx - 3, cy - 5, 6, 6, metal)
	# Spikes / flanges (single pixels protruding).
	var spike := metal.lightened(0.20)
	img.set_pixel(cx - 4, cy - 4, spike)
	img.set_pixel(cx + 3, cy - 4, spike)
	img.set_pixel(cx - 4, cy - 2, spike)
	img.set_pixel(cx + 3, cy - 2, spike)
	img.set_pixel(cx, cy - 6, spike)


func _draw_bow(img: Image, cx: int, cy: int, wood: Color, string_color: Color) -> void:
	# Bow limbs (curved — approximated with offset rects).
	# Upper limb.
	_draw_rect_filled(img, cx - 4, cy - 8, 2, 4, wood)
	_draw_rect_filled(img, cx - 3, cy - 5, 2, 3, wood)
	# Lower limb.
	_draw_rect_filled(img, cx - 4, cy + 4, 2, 4, wood)
	_draw_rect_filled(img, cx - 3, cy + 2, 2, 3, wood)
	# Grip.
	_draw_rect_filled(img, cx - 3, cy - 1, 2, 3, wood.darkened(0.15))
	# Bowstring — clean straight line.
	var string_from := Vector2(float(cx - 1), float(cy - 7))
	var string_to := Vector2(float(cx - 1), float(cy + 8))
	_draw_clean_line(img, string_from, string_to, string_color)


func _draw_staff(img: Image, cx: int, cy: int, orb_color: Color, shaft_color: Color) -> void:
	# Long shaft.
	_draw_rect_filled(img, cx - 1, cy - 6, 2, 16, shaft_color)
	# Orb at top.
	_draw_filled_ellipse(img, cx, cy - 8, 3, 3, orb_color)
	# Orb highlight.
	img.set_pixel(cx - 1, cy - 9, orb_color.lightened(0.35))
	# Bottom cap.
	_draw_rect_filled(img, cx - 1, cy + 9, 2, 1, shaft_color.lightened(0.15))


func _draw_dagger(img: Image, cx: int, cy: int, blade: Color, handle: Color) -> void:
	# Short handle.
	_draw_rect_filled(img, cx - 1, cy + 2, 2, 4, handle)
	# Small cross guard.
	_draw_rect_filled(img, cx - 2, cy + 1, 4, 1, handle.lightened(0.15))
	# Short blade.
	_draw_rect_filled(img, cx - 1, cy - 4, 2, 6, blade)
	# Tip.
	img.set_pixel(cx, cy - 5, blade.lightened(0.15))


func _draw_spear(img: Image, cx: int, cy: int, tip_color: Color, shaft_color: Color) -> void:
	# Long shaft.
	_draw_rect_filled(img, cx, cy - 4, 1, 16, shaft_color)
	# Spear tip (diamond-ish).
	_draw_rect_filled(img, cx - 1, cy - 8, 3, 2, tip_color)
	img.set_pixel(cx, cy - 9, tip_color.lightened(0.15))
	_draw_rect_filled(img, cx, cy - 7, 1, 1, tip_color.lightened(0.10))


# ── Cel-Shaded Art Style Helpers ───────────────────────────────────────────

## Draw a clean straight line between two points with uniform OUTLINE_THICKNESS.
## No wobble, no thickness variation — perfectly straight.
func _draw_clean_line(image: Image, from: Vector2, to: Vector2, color: Color) -> void:
	var length := from.distance_to(to)
	var steps := int(length) + 1
	for i in range(steps + 1):
		var t := float(i) / float(steps) if steps > 0 else 0.0
		var point := from.lerp(to, t)
		var half_t := OUTLINE_THICKNESS / 2
		for ox in range(-half_t, half_t + 1):
			for oy in range(-half_t, half_t + 1):
				var px := Vector2i(int(point.x) + ox, int(point.y) + oy)
				if px.x >= 0 and px.x < image.get_width() and px.y >= 0 and px.y < image.get_height():
					image.set_pixelv(px, color)


## Draw a clean rectangle outline with uniform OUTLINE_THICKNESS using
## _draw_clean_line for each edge. No wobble, perfectly straight edges.
func _draw_clean_rect_outline(image: Image, x: int, y: int, w: int, h: int, color: Color) -> void:
	var tl := Vector2(float(x), float(y))
	var tr := Vector2(float(x + w - 1), float(y))
	var bl := Vector2(float(x), float(y + h - 1))
	var br := Vector2(float(x + w - 1), float(y + h - 1))
	_draw_clean_line(image, tl, tr, color)  # Top edge
	_draw_clean_line(image, bl, br, color)  # Bottom edge
	_draw_clean_line(image, tl, bl, color)  # Left edge
	_draw_clean_line(image, tr, br, color)  # Right edge


## Apply flat cel shading to a rectangular region. The bottom-right portion
## receives a shadow zone (base color darkened by SHADOW_FACTOR) and the
## top-left portion receives a highlight zone (base color lightened by
## HIGHLIGHT_FACTOR). Hard edges, no gradients.
func _apply_cel_shading(image: Image, rect: Rect2i, base_color: Color) -> void:
	var shadow_color := Color(
		base_color.r * SHADOW_FACTOR,
		base_color.g * SHADOW_FACTOR,
		base_color.b * SHADOW_FACTOR,
		base_color.a
	)
	var highlight_color := Color(
		minf(base_color.r * HIGHLIGHT_FACTOR, 1.0),
		minf(base_color.g * HIGHLIGHT_FACTOR, 1.0),
		minf(base_color.b * HIGHLIGHT_FACTOR, 1.0),
		base_color.a
	)
	# Divide the rect diagonally: top-left triangle = highlight, bottom-right = shadow.
	# The diagonal runs from top-right corner to bottom-left corner.
	var rx := rect.position.x
	var ry := rect.position.y
	var rw := rect.size.x
	var rh := rect.size.y
	for py in range(maxi(ry, 0), mini(ry + rh, CANVAS_SIZE)):
		for px in range(maxi(rx, 0), mini(rx + rw, CANVAS_SIZE)):
			if image.get_pixel(px, py).a < 0.1:
				continue  # Skip transparent pixels
			# Normalized position within rect (0..1)
			var nx := float(px - rx) / float(maxi(rw, 1))
			var ny := float(py - ry) / float(maxi(rh, 1))
			if nx + ny < 0.8:
				# Top-left zone — highlight
				image.set_pixel(px, py, highlight_color)
			elif nx + ny > 1.2:
				# Bottom-right zone — shadow
				image.set_pixel(px, py, shadow_color)
			# Middle zone keeps base color (already filled)


## Draw simple filled black circle dot eyes. No sparkle, no blush marks.
## Each eye is a small filled black circle positioned on the head.
func _draw_cel_eyes(image: Image, head_rect: Rect2, _eye_color: Color) -> void:
	var center := Vector2(
		head_rect.position.x + head_rect.size.x / 2.0,
		head_rect.position.y + head_rect.size.y * 0.45
	)
	var eye_spacing := 4.0
	# Simple filled black dot eyes — small circles
	for side in [-1.0, 1.0]:
		var eye_center := center + Vector2(side * eye_spacing, 0)
		_draw_filled_circle(image, eye_center, 1.5, Color(0, 0, 0, 1))


## Draw a clean ellipse outline with uniform OUTLINE_THICKNESS. No wobble,
## mathematically precise ellipse sampling.
func _draw_clean_ellipse_outline(img: Image, cx: int, cy: int, rx: int, ry: int, color: Color) -> void:
	var steps: int = maxi(rx, ry) * 8
	var half_t := OUTLINE_THICKNESS / 2
	for i in range(steps):
		var angle: float = TAU * float(i) / float(steps)
		var base_x := float(cx) + float(rx) * cos(angle)
		var base_y := float(cy) + float(ry) * sin(angle)
		for ox in range(-half_t, half_t + 1):
			for oy in range(-half_t, half_t + 1):
				var px: int = int(base_x) + ox
				var py: int = int(base_y) + oy
				if px >= 0 and px < CANVAS_SIZE and py >= 0 and py < CANVAS_SIZE:
					img.set_pixel(px, py, color)


# ── Drawing Primitives ──────────────────────────────────────────────────────

## Fill a rectangle with the given color. Coordinates are clamped to canvas.
func _draw_rect_filled(img: Image, x: int, y: int, w: int, h: int, color: Color) -> void:
	for py in range(maxi(y, 0), mini(y + h, CANVAS_SIZE)):
		for px in range(maxi(x, 0), mini(x + w, CANVAS_SIZE)):
			img.set_pixel(px, py, color)


## Draw a 1-pixel outline rectangle. Used internally for weapon details and
## other small elements where a 2px outline would be too heavy.
func _draw_rect_outline(img: Image, x: int, y: int, w: int, h: int, color: Color) -> void:
	# Top and bottom edges.
	for px in range(maxi(x, 0), mini(x + w, CANVAS_SIZE)):
		if y >= 0 and y < CANVAS_SIZE:
			img.set_pixel(px, y, color)
		if y + h - 1 >= 0 and y + h - 1 < CANVAS_SIZE:
			img.set_pixel(px, y + h - 1, color)
	# Left and right edges.
	for py in range(maxi(y, 0), mini(y + h, CANVAS_SIZE)):
		if x >= 0 and x < CANVAS_SIZE:
			img.set_pixel(x, py, color)
		if x + w - 1 >= 0 and x + w - 1 < CANVAS_SIZE:
			img.set_pixel(x + w - 1, py, color)


## Draw a filled ellipse centered at (cx, cy) with the given half-widths.
func _draw_filled_ellipse(img: Image, cx: int, cy: int, rx: int, ry: int, color: Color) -> void:
	for py in range(maxi(cy - ry, 0), mini(cy + ry + 1, CANVAS_SIZE)):
		var dy: float = float(py - cy)
		# Half-width at this row from the ellipse equation.
		var half_w: float = float(rx) * sqrt(maxf(0.0, 1.0 - (dy * dy) / float(ry * ry)))
		var x_start: int = maxi(cx - int(half_w), 0)
		var x_end: int = mini(cx + int(half_w) + 1, CANVAS_SIZE)
		for px in range(x_start, x_end):
			img.set_pixel(px, py, color)


## Draw a 1-pixel ellipse outline. Kept for internal use (e.g. weapon orbs).
func _draw_ellipse_outline(img: Image, cx: int, cy: int, rx: int, ry: int, color: Color) -> void:
	# Sample around the ellipse and plot pixels.
	var steps: int = maxi(rx, ry) * 8
	for i in range(steps):
		var angle: float = TAU * float(i) / float(steps)
		var px: int = cx + int(round(float(rx) * cos(angle)))
		var py: int = cy + int(round(float(ry) * sin(angle)))
		if px >= 0 and px < CANVAS_SIZE and py >= 0 and py < CANVAS_SIZE:
			img.set_pixel(px, py, color)


## Helper: draw a filled circle on an Image
func _draw_filled_circle(image: Image, center: Vector2, radius: float, color: Color) -> void:
	var r_sq := radius * radius
	for y in range(int(center.y - radius) - 1, int(center.y + radius) + 2):
		for x in range(int(center.x - radius) - 1, int(center.x + radius) + 2):
			if x >= 0 and x < image.get_width() and y >= 0 and y < image.get_height():
				var dist_sq := (Vector2(x, y) - center).length_squared()
				if dist_sq <= r_sq:
					image.set_pixelv(Vector2i(x, y), color)


# ── Evolution Stage Visual Effects ─────────────────────────────────────────

## Element color lookup for evolution marks and auras.
const ELEMENT_EFFECT_COLORS: Dictionary = {
	"Fire": Color(1.0, 0.4, 0.2),
	"Water": Color(0.2, 0.6, 1.0),
	"Plant": Color(0.27, 0.73, 0.27),
	"Ice": Color(0.53, 0.87, 1.0),
	"Wind": Color(0.67, 0.87, 0.67),
	"Earth": Color(0.73, 0.53, 0.27),
	"Electric": Color(1.0, 0.87, 0.27),
	"Dark": Color(0.53, 0.33, 0.67),
	"Light": Color(1.0, 0.93, 0.67),
	"Fairy": Color(1.0, 0.53, 0.8),
	"Solar": Color(1.0, 0.8, 0.27),
	"Lunar": Color(0.67, 0.73, 0.87),
	"Metal": Color(0.6, 0.67, 0.73),
	"Poison": Color(0.67, 0.4, 0.8),
}

## Draw evolution stage effects on a head image. Called after base head is drawn.
func _draw_evolution_effects(img: Image, stage: int, element: String, cx: int, head_top: int, head_h: int) -> void:
	var evo_color: Color = ELEMENT_EFFECT_COLORS.get(element, Color(0.8, 0.8, 0.8))

	if stage >= 2:
		# Stage 2: Small element-colored marks on cheeks
		var mark_y: int = cx - head_h / 4 + 2
		var mark_left_x: int = cx - 8
		var mark_right_x: int = cx + 6
		_draw_rect_filled(img, mark_left_x, head_top + head_h - 6, 2, 2, evo_color)
		_draw_rect_filled(img, mark_right_x, head_top + head_h - 6, 2, 2, evo_color)

	if stage >= 3:
		# Stage 3: Element-themed crown/crest on head
		var crown_color: Color = evo_color.lightened(0.2)
		_draw_rect_filled(img, cx - 3, head_top - 5, 2, 4, crown_color)
		_draw_rect_filled(img, cx + 1, head_top - 5, 2, 4, crown_color)
		_draw_rect_filled(img, cx - 1, head_top - 7, 2, 6, crown_color)
		# Crown tips
		img.set_pixel(cx - 3, head_top - 6, crown_color.lightened(0.15))
		img.set_pixel(cx + 2, head_top - 6, crown_color.lightened(0.15))
		img.set_pixel(cx, head_top - 8, crown_color.lightened(0.25))


# ── Character Outfit Drawing ───────────────────────────────────────────────

## Draw character outfit overlays (vest, hat, accessory) on a body image.
## appearance_config comes from ChibiSpriteConfig.get_trainer_appearance() or
## ChibiSpriteConfig.get_player_appearance().
func _draw_character_outfit(body_img: Image, head_img: Image, appearance: Dictionary) -> void:
	var cx: int = CANVAS_SIZE / 2
	var cy: int = CANVAS_SIZE / 2

	# Outfit vest overlay on body
	if appearance.has("outfit_color"):
		var outfit_color: Color = appearance["outfit_color"]
		var body_w: int = 16
		var bx: int = cx - body_w / 2
		var by: int = cy - 7
		_draw_rect_filled(body_img, bx + 1, by + 1, body_w - 2, 8, outfit_color)
		# Accent trim
		if appearance.has("accent_color"):
			var accent: Color = appearance["accent_color"]
			_draw_rect_filled(body_img, bx + 1, by + 8, body_w - 2, 2, accent)

	# Hat overlay on head
	var hat_style: String = str(appearance.get("hat_style", "none"))
	if hat_style != "none" and appearance.has("hat_color"):
		var hat_color: Color = appearance["hat_color"]
		var head_cx: int = CANVAS_SIZE / 2
		var head_top: int = CANVAS_SIZE / 2 - 13
		match hat_style:
			"cap":
				_draw_rect_filled(head_img, head_cx - 14, head_top - 2, 28, 5, hat_color)
				_draw_rect_filled(head_img, head_cx - 10, head_top - 4, 20, 3, hat_color)
				# Brim
				_draw_rect_filled(head_img, head_cx - 16, head_top + 2, 14, 3, hat_color.darkened(0.15))
			"straw":
				_draw_rect_filled(head_img, head_cx - 16, head_top - 1, 32, 4, hat_color)
				_draw_rect_filled(head_img, head_cx - 12, head_top - 4, 24, 4, hat_color)
				# Wide brim
				_draw_rect_filled(head_img, head_cx - 18, head_top + 2, 36, 3, hat_color.darkened(0.1))
			"bandana":
				_draw_rect_filled(head_img, head_cx - 13, head_top - 1, 26, 4, hat_color)
				# Knot at back
				_draw_rect_filled(head_img, head_cx + 12, head_top, 4, 6, hat_color.darkened(0.1))
			"hood":
				_draw_rect_filled(head_img, head_cx - 15, head_top - 3, 30, 8, hat_color)
				_draw_rect_filled(head_img, head_cx - 16, head_top + 4, 6, 10, hat_color)
				_draw_rect_filled(head_img, head_cx + 10, head_top + 4, 6, 10, hat_color)

	# Accessory (simplified)
	var accessory: String = str(appearance.get("accessory", "none"))
	if accessory == "backpack":
		var bp_color: Color = appearance.get("hat_color", Color("886644"))
		_draw_rect_filled(body_img, cx + 7, cy - 5, 5, 8, bp_color)
		_draw_rect_filled(body_img, cx + 8, cy - 6, 3, 1, bp_color.darkened(0.15))

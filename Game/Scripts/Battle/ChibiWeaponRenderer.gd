## ChibiWeaponRenderer — Procedurally generates flat cel-shaded weapon sprites for
## the chibi sprite system. Each weapon type gets a distinct, recognizable silhouette
## drawn with clean geometric shapes, uniform 2px black outlines, vibrant flat colors,
## and hard-edged one-step highlight/shadow shading (no gradients, no pixel art).
##
## Weapons are drawn at chibi-appropriate scale (small but recognizable), with
## canvas sizes ranging from 10x16 to 16x20 depending on weapon type.
class_name ChibiWeaponRenderer
extends RefCounted


## ── Default Colors (vibrant, saturated for cel-shaded look) ──────────────────

const DEFAULT_BLADE_COLOR := Color("#C8D0E0")           # bright steel
const DEFAULT_BLADE_HIGHLIGHT := Color("#F0F4FF")       # white-steel highlight
const DEFAULT_HANDLE_COLOR := Color("#8B4513")          # rich brown
const DEFAULT_GUARD_COLOR := Color("#DAA520")           # bright gold
const DEFAULT_MAGIC_OUTLINE_COLOR := Color(0.4, 0.7, 1.0, 0.8) # flat magic outline
const DEFAULT_WOOD_COLOR := Color(0.55, 0.38, 0.22)    # wood shaft
const DEFAULT_HEAD_COLOR := Color(0.5, 0.5, 0.55)      # iron head
const DEFAULT_STRING_COLOR := Color(0.85, 0.82, 0.70)  # bowstring
const DEFAULT_ORB_COLOR := Color(0.3, 0.5, 0.9)        # magic blue
const DEFAULT_BARREL_COLOR := Color(0.35, 0.35, 0.38)  # dark metal


## ── Canvas Sizes ────────────────────────────────────────────────────────────

const CANVAS_SIZES: Dictionary = {
	"sword":       Vector2i(10, 18),
	"longsword":   Vector2i(10, 20),
	"greatsword":  Vector2i(12, 22),
	"shortsword":  Vector2i(10, 14),
	"katana":      Vector2i(10, 20),
	"scimitar":    Vector2i(12, 18),
	"axe":         Vector2i(12, 18),
	"battleaxe":   Vector2i(14, 20),
	"greataxe":    Vector2i(16, 22),
	"dagger":      Vector2i(8, 12),
	"spear":       Vector2i(8, 22),
	"lance":       Vector2i(10, 22),
	"halberd":     Vector2i(12, 22),
	"mace":        Vector2i(10, 18),
	"warhammer":   Vector2i(12, 20),
	"hammer":      Vector2i(12, 18),
	"flail":       Vector2i(12, 18),
	"bow":         Vector2i(12, 20),
	"crossbow":    Vector2i(14, 16),
	"shortbow":    Vector2i(10, 16),
	"longbow":     Vector2i(10, 22),
	"staff":       Vector2i(8, 22),
	"wand":        Vector2i(8, 16),
	"orb":         Vector2i(10, 10),
	"scepter":     Vector2i(8, 18),
	"shield":      Vector2i(14, 16),
	"tower_shield": Vector2i(14, 20),
	"fist":        Vector2i(10, 10),
	"pistol":      Vector2i(12, 10),
	"musket":      Vector2i(8, 22),
	"blunderbuss": Vector2i(10, 20),
	"scythe":      Vector2i(14, 22),
}

## ── Grip Offsets ────────────────────────────────────────────────────────────
## Offset from sprite centre to the grip point (where the hand holds).

const GRIP_OFFSETS: Dictionary = {
	"sword":       Vector2(0, 6),
	"longsword":   Vector2(0, 7),
	"greatsword":  Vector2(0, 8),
	"shortsword":  Vector2(0, 4),
	"katana":      Vector2(0, 7),
	"scimitar":    Vector2(0, 6),
	"axe":         Vector2(0, 6),
	"battleaxe":   Vector2(0, 7),
	"greataxe":    Vector2(0, 8),
	"dagger":      Vector2(0, 3),
	"spear":       Vector2(0, 5),
	"lance":       Vector2(0, 6),
	"halberd":     Vector2(0, 5),
	"mace":        Vector2(0, 6),
	"warhammer":   Vector2(0, 7),
	"hammer":      Vector2(0, 6),
	"flail":       Vector2(0, 6),
	"bow":         Vector2(0, 0),
	"crossbow":    Vector2(0, 2),
	"shortbow":    Vector2(0, 0),
	"longbow":     Vector2(0, 0),
	"staff":       Vector2(0, 5),
	"wand":        Vector2(0, 4),
	"orb":         Vector2(0, 0),
	"scepter":     Vector2(0, 5),
	"shield":      Vector2(0, 0),
	"tower_shield": Vector2(0, 0),
	"fist":        Vector2(0, 0),
	"pistol":      Vector2(2, 1),
	"musket":      Vector2(0, 5),
	"blunderbuss": Vector2(0, 5),
	"scythe":      Vector2(0, 6),
}


## ── Public API ──────────────────────────────────────────────────────────────

## Render a cel-shaded weapon sprite for the given weapon_type using the provided
## visual_config dictionary (from EquipmentVisualDatabase). Returns an
## ImageTexture ready for use on a Sprite2D.
func render_weapon(weapon_type: String, visual_config: Dictionary) -> ImageTexture:
	var size: Vector2i = get_weapon_canvas_size(weapon_type)
	var image := Image.create(size.x, size.y, false, Image.FORMAT_RGBA8)
	image.fill(Color(0, 0, 0, 0))

	# Resolve colours from visual_config with sensible defaults.
	var blade_col: Color = _color_or(visual_config, "bladeColor", DEFAULT_BLADE_COLOR)
	var blade_hi: Color = _color_or(visual_config, "bladeHighlight", DEFAULT_BLADE_HIGHLIGHT)
	var handle_col: Color = _color_or(visual_config, "handleColor", DEFAULT_HANDLE_COLOR)
	var guard_col: Color = _color_or(visual_config, "guardColor", DEFAULT_GUARD_COLOR)
	var magic_outline_col: Color = _color_or(visual_config, "glowColor", DEFAULT_MAGIC_OUTLINE_COLOR)
	var head_col: Color = _color_or(visual_config, "headColor", DEFAULT_HEAD_COLOR)
	var wood_col: Color = _color_or(visual_config, "shaftColor", DEFAULT_WOOD_COLOR)
	var string_col: Color = _color_or(visual_config, "stringColor", DEFAULT_STRING_COLOR)
	var orb_col: Color = _color_or(visual_config, "orbColor", DEFAULT_ORB_COLOR)
	var barrel_col: Color = _color_or(visual_config, "barrelColor", DEFAULT_BARREL_COLOR)

	# Dispatch to the appropriate cel-shaded drawing routine.
	match weapon_type:
		"sword":
			_draw_sword(image, size, blade_col, blade_hi, handle_col, guard_col)
		"longsword":
			_draw_longsword(image, size, blade_col, blade_hi, handle_col, guard_col)
		"greatsword":
			_draw_greatsword(image, size, blade_col, blade_hi, handle_col, guard_col)
		"shortsword":
			_draw_shortsword(image, size, blade_col, blade_hi, handle_col, guard_col)
		"katana":
			_draw_katana(image, size, blade_col, blade_hi, handle_col, guard_col)
		"scimitar":
			_draw_scimitar(image, size, blade_col, blade_hi, handle_col, guard_col)
		"axe":
			_draw_axe(image, size, head_col, blade_hi, wood_col, guard_col)
		"battleaxe":
			_draw_battleaxe(image, size, head_col, blade_hi, wood_col, guard_col)
		"greataxe":
			_draw_greataxe(image, size, head_col, blade_hi, wood_col, guard_col)
		"dagger":
			_draw_dagger(image, size, blade_col, blade_hi, handle_col, guard_col)
		"spear":
			_draw_spear(image, size, head_col, blade_hi, wood_col)
		"lance":
			_draw_lance(image, size, head_col, blade_hi, wood_col, guard_col)
		"halberd":
			_draw_halberd(image, size, head_col, blade_hi, wood_col)
		"mace":
			_draw_mace(image, size, head_col, blade_hi, wood_col)
		"warhammer":
			_draw_warhammer(image, size, head_col, blade_hi, wood_col)
		"hammer":
			_draw_hammer(image, size, head_col, blade_hi, wood_col)
		"flail":
			_draw_flail(image, size, head_col, blade_hi, wood_col, string_col)
		"bow":
			_draw_bow(image, size, wood_col, string_col)
		"crossbow":
			_draw_crossbow(image, size, wood_col, string_col, barrel_col)
		"shortbow":
			_draw_bow_short(image, size, wood_col, string_col)
		"longbow":
			_draw_bow_long(image, size, wood_col, string_col)
		"staff":
			_draw_staff(image, size, wood_col, orb_col, blade_hi)
		"wand":
			_draw_wand(image, size, wood_col, orb_col, blade_hi)
		"orb":
			_draw_orb(image, size, orb_col, blade_hi)
		"scepter":
			_draw_scepter(image, size, wood_col, orb_col, guard_col, blade_hi)
		"shield":
			_draw_shield(image, size, head_col, guard_col, blade_hi)
		"tower_shield":
			_draw_tower_shield(image, size, head_col, guard_col, blade_hi)
		"fist":
			_draw_fist(image, size, handle_col, head_col)
		"pistol":
			_draw_pistol(image, size, barrel_col, wood_col, guard_col)
		"musket":
			_draw_musket(image, size, barrel_col, wood_col, guard_col)
		"blunderbuss":
			_draw_blunderbuss(image, size, barrel_col, wood_col, guard_col)
		"scythe":
			_draw_scythe(image, size, head_col, blade_hi, wood_col)
		_:
			# Fallback: draw a generic sword.
			_draw_sword(image, size, blade_col, blade_hi, handle_col, guard_col)

	# Magic outline pass (replaces old gradient glow — flat colored outline only).
	var has_particles: bool = visual_config.get("hasParticles", false)
	if has_particles and magic_outline_col.a > 0.0:
		_apply_magic_outline(image, magic_outline_col)

	var tex := ImageTexture.create_from_image(image)
	return tex


## Returns the offset from the weapon sprite's centre to the grip point.
func get_weapon_grip_offset(weapon_type: String) -> Vector2:
	return GRIP_OFFSETS.get(weapon_type, Vector2.ZERO)


## Returns the appropriate canvas size for each weapon type.
func get_weapon_canvas_size(weapon_type: String) -> Vector2i:
	return CANVAS_SIZES.get(weapon_type, Vector2i(10, 18))


## ── Drawing Helpers (cel-shaded primitives) ─────────────────────────────────

func _set_pixel_safe(image: Image, x: int, y: int, color: Color) -> void:
	if x >= 0 and x < image.get_width() and y >= 0 and y < image.get_height():
		image.set_pixel(x, y, color)


func _draw_line_v(image: Image, x: int, y_from: int, y_to: int, color: Color) -> void:
	var y_min: int = mini(y_from, y_to)
	var y_max: int = maxi(y_from, y_to)
	for y in range(y_min, y_max + 1):
		_set_pixel_safe(image, x, y, color)


func _draw_line_h(image: Image, y: int, x_from: int, x_to: int, color: Color) -> void:
	var x_min: int = mini(x_from, x_to)
	var x_max: int = maxi(x_from, x_to)
	for x in range(x_min, x_max + 1):
		_set_pixel_safe(image, x, y, color)


## Fill a rectangle with a flat color (no shading).
func _draw_rect_filled(image: Image, rect: Rect2i, color: Color) -> void:
	for y in range(rect.position.y, rect.position.y + rect.size.y):
		for x in range(rect.position.x, rect.position.x + rect.size.x):
			_set_pixel_safe(image, x, y, color)


## Fill a circle with a flat color.
func _fill_circle(image: Image, center: Vector2i, radius: int, color: Color) -> void:
	var r2: int = radius * radius
	for dy in range(-radius, radius + 1):
		for dx in range(-radius, radius + 1):
			if dx * dx + dy * dy <= r2:
				_set_pixel_safe(image, center.x + dx, center.y + dy, color)


## Draw a diamond shape with flat color fill.
func _draw_diamond(image: Image, center: Vector2i, radius: int, color: Color) -> void:
	for dy in range(-radius, radius + 1):
		var w: int = radius - absi(dy)
		for dx in range(-w, w + 1):
			_set_pixel_safe(image, center.x + dx, center.y + dy, color)


## ── Cel-Shading Helpers ─────────────────────────────────────────────────────

## Return a single-step shadow tone (darker) of the base color.
func _get_shadow_color(base: Color) -> Color:
	return base.darkened(0.25)


## Return a single-step highlight tone (lighter) of the base color.
func _get_highlight_color(base: Color) -> Color:
	return base.lightened(0.20)


## Draw a clean 2px black outline around a rectangular region.
func _draw_rect_outline(image: Image, x: int, y: int, w: int, h: int, color: Color = Color.BLACK) -> void:
	# Top edge (2px)
	_draw_rect_filled(image, Rect2i(x, y, w, clampi(2, 1, h)), color)
	# Bottom edge (2px)
	var bot_h: int = clampi(2, 1, h)
	_draw_rect_filled(image, Rect2i(x, y + h - bot_h, w, bot_h), color)
	# Left edge (2px)
	_draw_rect_filled(image, Rect2i(x, y, clampi(2, 1, w), h), color)
	# Right edge (2px)
	var right_w: int = clampi(2, 1, w)
	_draw_rect_filled(image, Rect2i(x + w - right_w, y, right_w, h), color)


## Draw a 1px black outline around a rectangular region (for small shapes).
func _draw_rect_outline_1px(image: Image, x: int, y: int, w: int, h: int, color: Color = Color.BLACK) -> void:
	_draw_rect_filled(image, Rect2i(x, y, w, 1), color)
	_draw_rect_filled(image, Rect2i(x, y + h - 1, w, 1), color)
	_draw_rect_filled(image, Rect2i(x, y, 1, h), color)
	_draw_rect_filled(image, Rect2i(x + w - 1, y, 1, h), color)


## Draw a circle outline (1px) for rounded shapes.
func _draw_circle_outline(image: Image, center: Vector2i, radius: int, color: Color = Color.BLACK) -> void:
	var r2_outer: int = (radius + 1) * (radius + 1)
	var r2_inner: int = (radius - 1) * (radius - 1)
	for dy in range(-radius - 1, radius + 2):
		for dx in range(-radius - 1, radius + 2):
			var d2: int = dx * dx + dy * dy
			if d2 <= r2_outer and d2 > r2_inner:
				_set_pixel_safe(image, center.x + dx, center.y + dy, color)


## Draw a fully cel-shaded rectangle: flat base fill, highlight top edge,
## shadow bottom edge, clean black outline.
func _draw_cel_shaded_rect(img: Image, x: int, y: int, w: int, h: int, base_color: Color) -> void:
	# Fill base color
	_draw_rect_filled(img, Rect2i(x, y, w, h), base_color)
	# Highlight on top edge (1px)
	_draw_rect_filled(img, Rect2i(x, y, w, 1), _get_highlight_color(base_color))
	# Shadow on bottom edge (1px)
	_draw_rect_filled(img, Rect2i(x, y + h - 1, w, 1), _get_shadow_color(base_color))
	# Clean black outline (1px for small weapon parts)
	_draw_rect_outline_1px(img, x, y, w, h, Color.BLACK)


## Draw a fully cel-shaded circle: flat base fill, highlight top, shadow bottom,
## clean black outline.
func _draw_cel_shaded_circle(img: Image, center: Vector2i, radius: int, base_color: Color) -> void:
	# Fill base
	_fill_circle(img, center, radius, base_color)
	# Highlight on upper portion
	var r2: int = radius * radius
	for dx in range(-radius, radius + 1):
		for dy in range(-radius, -radius / 2):
			if dx * dx + dy * dy <= r2:
				_set_pixel_safe(img, center.x + dx, center.y + dy, _get_highlight_color(base_color))
	# Shadow on lower portion
	for dx in range(-radius, radius + 1):
		for dy in range(radius / 2, radius + 1):
			if dx * dx + dy * dy <= r2:
				_set_pixel_safe(img, center.x + dx, center.y + dy, _get_shadow_color(base_color))
	# Clean black outline
	_draw_circle_outline(img, center, radius, Color.BLACK)


## ── Magic Outline Effect (replaces gradient glow) ───────────────────────────

## For magical weapons: draw a flat, solid-color 1px outline around all filled
## pixels. No gradients, no transparency falloff — clean cel-shaded style.
func _apply_magic_outline(image: Image, outline_color: Color) -> void:
	var w: int = image.get_width()
	var h: int = image.get_height()
	var solid_outline := Color(outline_color.r, outline_color.g, outline_color.b, 1.0)
	# Collect all opaque pixel positions.
	var opaque_pixels: Array[Vector2i] = []
	for y in range(h):
		for x in range(w):
			if image.get_pixel(x, y).a > 0.1:
				opaque_pixels.append(Vector2i(x, y))
	# Paint flat outline on adjacent transparent pixels.
	for p in opaque_pixels:
		for offset in [Vector2i(-1,0), Vector2i(1,0), Vector2i(0,-1), Vector2i(0,1)]:
			var nx: int = p.x + offset.x
			var ny: int = p.y + offset.y
			if nx >= 0 and nx < w and ny >= 0 and ny < h:
				if image.get_pixel(nx, ny).a < 0.05:
					_set_pixel_safe(image, nx, ny, solid_outline)


## ── Color Utility ───────────────────────────────────────────────────────────

func _color_or(config: Dictionary, key: String, fallback: Color) -> Color:
	if config.has(key):
		var val = config[key]
		if val is Color:
			return val
		if val is String and val != "":
			return Color(val)
	return fallback


func _darker(color: Color, amount: float = 0.2) -> Color:
	return color.darkened(amount)


func _lighter(color: Color, amount: float = 0.2) -> Color:
	return color.lightened(amount)


## ═══════════════════════════════════════════════════════════════════════════
## ── WEAPON DRAWING ROUTINES (cel-shaded style) ──────────────────────────
## Each weapon uses flat color fills, one highlight zone, one shadow zone,
## and clean black outlines. No gradients or pixel-art dithering.
## ═══════════════════════════════════════════════════════════════════════════


## ── Swords (cel-shaded) ─────────────────────────────────────────────────────

func _draw_sword(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel — small cel-shaded circle at bottom
	_draw_cel_shaded_rect(image, cx - 1, size.y - 2, 2, 2, _get_shadow_color(handle))
	# Handle — flat rect with highlight/shadow
	_draw_cel_shaded_rect(image, cx - 1, size.y - 5, 2, 3, handle)
	# Guard — wide flat bar
	var guard_y: int = size.y - 6
	_draw_cel_shaded_rect(image, cx - 3, guard_y, 6, 1, guard)
	# Blade — flat fill with highlight strip and shadow edges
	var blade_top: int = 1
	var blade_h: int = guard_y - blade_top
	_draw_rect_filled(image, Rect2i(cx - 1, blade_top, 2, blade_h), blade)
	# Highlight strip down centre of blade
	_draw_line_v(image, cx, blade_top, blade_top + blade_h - 1, highlight)
	# Shadow on left edge of blade
	_draw_line_v(image, cx - 1, blade_top + 1, blade_top + blade_h - 1, _get_shadow_color(blade))
	# Blade tip — pointed
	_set_pixel_safe(image, cx, blade_top - 1 if blade_top > 0 else 0, highlight)
	# Clean black outline around entire blade
	_draw_rect_outline_1px(image, cx - 1, blade_top, 2, blade_h, Color.BLACK)


func _draw_longsword(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel
	_draw_cel_shaded_rect(image, cx - 1, size.y - 2, 2, 2, _get_shadow_color(handle))
	# Handle — 4px tall
	_draw_cel_shaded_rect(image, cx - 1, size.y - 6, 2, 4, handle)
	# Guard — double-height bar
	var guard_y: int = size.y - 7
	_draw_cel_shaded_rect(image, cx - 3, guard_y, 6, 2, guard)
	# Blade — tall and slim, 3px wide
	var blade_top: int = 1
	var blade_h: int = guard_y - blade_top
	_draw_rect_filled(image, Rect2i(cx - 1, blade_top, 3, blade_h), blade)
	# Highlight strip
	_draw_line_v(image, cx, blade_top, blade_top + blade_h - 1, highlight)
	# Shadow on left edge (fuller)
	_draw_line_v(image, cx - 1, blade_top + 2, blade_top + blade_h - 2, _get_shadow_color(blade))
	# Tip
	_set_pixel_safe(image, cx, blade_top - 1 if blade_top > 0 else 0, highlight)
	# Clean outline
	_draw_rect_outline_1px(image, cx - 1, blade_top, 3, blade_h, Color.BLACK)


func _draw_greatsword(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel
	_draw_cel_shaded_rect(image, cx - 1, size.y - 2, 2, 2, _get_shadow_color(handle))
	# Handle — 5px tall
	_draw_cel_shaded_rect(image, cx - 1, size.y - 7, 2, 5, handle)
	# Guard — wide double bar
	var guard_y: int = size.y - 8
	_draw_cel_shaded_rect(image, cx - 4, guard_y, 8, 2, guard)
	# Blade — wide, 4px
	var blade_top: int = 1
	var blade_h: int = guard_y - blade_top
	_draw_rect_filled(image, Rect2i(cx - 2, blade_top, 4, blade_h), blade)
	# Shadow edges
	_draw_line_v(image, cx - 2, blade_top + 2, blade_top + blade_h - 1, _get_shadow_color(blade))
	_draw_line_v(image, cx + 1, blade_top + 2, blade_top + blade_h - 1, _get_shadow_color(blade))
	# Highlight strips
	_draw_line_v(image, cx, blade_top + 1, blade_top + blade_h - 2, highlight)
	_draw_line_v(image, cx - 1, blade_top + 1, blade_top + blade_h - 2, _get_highlight_color(blade))
	# Tip
	_draw_rect_filled(image, Rect2i(cx - 1, blade_top, 2, 1), blade)
	_set_pixel_safe(image, cx, blade_top - 1 if blade_top > 0 else 0, highlight)
	# Clean outline
	_draw_rect_outline_1px(image, cx - 2, blade_top, 4, blade_h, Color.BLACK)


func _draw_shortsword(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel
	_draw_cel_shaded_rect(image, cx - 1, size.y - 2, 2, 2, _get_shadow_color(handle))
	# Handle
	_draw_cel_shaded_rect(image, cx - 1, size.y - 5, 2, 3, handle)
	# Guard
	var guard_y: int = size.y - 6
	_draw_cel_shaded_rect(image, cx - 2, guard_y, 4, 1, guard)
	# Blade — short
	var blade_top: int = 2
	var blade_h: int = guard_y - blade_top
	_draw_rect_filled(image, Rect2i(cx - 1, blade_top, 2, blade_h), blade)
	# Highlight
	_draw_line_v(image, cx, blade_top, blade_top + blade_h - 1, highlight)
	# Tip
	_set_pixel_safe(image, cx, blade_top - 1 if blade_top > 0 else 0, highlight)
	# Clean outline
	_draw_rect_outline_1px(image, cx - 1, blade_top, 2, blade_h, Color.BLACK)


func _draw_katana(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel cap
	_draw_cel_shaded_rect(image, cx - 1, size.y - 2, 2, 2, _get_shadow_color(handle))
	# Handle — long, wrapped look (alternating cel-shaded bands)
	for i in range(5):
		var y: int = size.y - 3 - i
		var col: Color = handle if i % 2 == 0 else _get_shadow_color(handle)
		_draw_rect_filled(image, Rect2i(cx - 1, y, 2, 1), col)
	_draw_rect_outline_1px(image, cx - 1, size.y - 7, 2, 5, Color.BLACK)
	# Tsuba (round guard)
	var guard_y: int = size.y - 8
	_draw_cel_shaded_rect(image, cx - 2, guard_y, 4, 1, guard)
	# Blade — slight curve (offset 1px right partway up)
	var blade_top: int = 1
	# Lower blade: straight
	_draw_rect_filled(image, Rect2i(cx - 1, guard_y - 6, 2, 6), blade)
	_draw_rect_outline_1px(image, cx - 1, guard_y - 6, 2, 6, Color.BLACK)
	# Upper blade: shifted right for curve
	_draw_rect_filled(image, Rect2i(cx, blade_top + 1, 2, guard_y - 6 - blade_top), blade)
	# Highlight along sharp edge
	_draw_line_v(image, cx, guard_y - 6, guard_y - 1, highlight)
	_draw_line_v(image, cx + 1, blade_top + 1, guard_y - 7, highlight)
	# Shadow on back edge
	_draw_line_v(image, cx - 1, guard_y - 6, guard_y - 1, _get_shadow_color(blade))
	# Tip
	_set_pixel_safe(image, cx + 1, blade_top, highlight)
	# Outline upper blade
	_draw_rect_outline_1px(image, cx, blade_top, 2, guard_y - 6 - blade_top + 1, Color.BLACK)


func _draw_scimitar(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel
	_draw_cel_shaded_rect(image, cx - 1, size.y - 2, 2, 2, _get_shadow_color(handle))
	# Handle
	_draw_cel_shaded_rect(image, cx - 1, size.y - 5, 2, 3, handle)
	# Guard
	var guard_y: int = size.y - 6
	_draw_cel_shaded_rect(image, cx - 2, guard_y, 5, 1, guard)
	# Blade — curved, built from cel-shaded rect sections
	# Lower section
	_draw_cel_shaded_rect(image, cx - 1, guard_y - 5, 2, 5, blade)
	# Mid curve: shifts left
	_draw_cel_shaded_rect(image, cx - 2, guard_y - 9, 3, 4, blade)
	# Top: wide curved end
	_draw_cel_shaded_rect(image, cx - 3, guard_y - 11, 4, 2, blade)
	# Tip
	_set_pixel_safe(image, cx - 4, guard_y - 11, blade)
	_set_pixel_safe(image, cx - 4, guard_y - 10, highlight)
	# Highlight along inner edge
	_draw_line_v(image, cx, guard_y - 5, guard_y - 1, highlight)
	_draw_line_v(image, cx - 1, guard_y - 9, guard_y - 5, highlight)


## ── Axes (cel-shaded) ────────────────────────────────────────────────────────

func _draw_axe(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color, _guard: Color) -> void:
	var cx: int = size.x / 2
	# Shaft — cel-shaded
	_draw_cel_shaded_rect(image, cx - 1, 4, 2, size.y - 4, shaft)
	# Axe head — right side, flat fill with shadow/highlight
	_draw_rect_filled(image, Rect2i(cx + 1, 2, 4, 5), head)
	# Highlight on cutting edge
	_draw_line_v(image, cx + 4, 2, 6, highlight)
	# Shadow on back
	_draw_line_v(image, cx + 1, 2, 6, _get_shadow_color(head))
	# Left bit
	_draw_rect_filled(image, Rect2i(cx - 1, 3, 1, 2), head)
	# Top of head
	_set_pixel_safe(image, cx, 2, head)
	_set_pixel_safe(image, cx + 1, 1, head)
	# Clean outline around head
	_draw_rect_outline_1px(image, cx + 1, 1, 4, 6, Color.BLACK)


func _draw_battleaxe(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color, _guard: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_cel_shaded_rect(image, cx - 1, 5, 2, size.y - 5, shaft)
	# Right blade
	_draw_rect_filled(image, Rect2i(cx + 1, 2, 4, 6), head)
	_draw_line_v(image, cx + 4, 2, 7, highlight)
	_draw_rect_outline_1px(image, cx + 1, 2, 4, 6, Color.BLACK)
	# Left blade
	_draw_rect_filled(image, Rect2i(cx - 5, 2, 4, 6), head)
	_draw_line_v(image, cx - 5, 2, 7, highlight)
	_draw_rect_outline_1px(image, cx - 5, 2, 4, 6, Color.BLACK)
	# Top cap
	_draw_cel_shaded_rect(image, cx - 2, 1, 4, 1, head)
	_set_pixel_safe(image, cx, 0, highlight)


func _draw_greataxe(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color, _guard: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_cel_shaded_rect(image, cx - 1, 7, 2, size.y - 7, shaft)
	# Massive head — right side
	_draw_rect_filled(image, Rect2i(cx + 1, 1, 6, 8), head)
	# Highlight on cutting edge
	_draw_line_v(image, cx + 6, 2, 8, highlight)
	_draw_line_v(image, cx + 5, 1, 8, _get_highlight_color(head))
	# Shadow on inner edge
	_draw_line_v(image, cx + 1, 2, 8, _get_shadow_color(head))
	# Clean outline
	_draw_rect_outline_1px(image, cx + 1, 1, 6, 8, Color.BLACK)
	# Left accent
	_draw_cel_shaded_rect(image, cx - 3, 3, 2, 4, head)
	# Top spike
	_draw_rect_filled(image, Rect2i(cx, 0, 3, 1), head)
	_set_pixel_safe(image, cx + 1, 0, highlight)


## ── Dagger (cel-shaded) ─────────────────────────────────────────────────────

func _draw_dagger(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel
	_draw_cel_shaded_rect(image, cx - 1, size.y - 2, 2, 2, _get_shadow_color(handle))
	# Handle
	_draw_cel_shaded_rect(image, cx - 1, size.y - 4, 2, 2, handle)
	# Guard
	var guard_y: int = size.y - 5
	_draw_cel_shaded_rect(image, cx - 2, guard_y, 4, 1, guard)
	# Blade — short, flat fill
	var blade_top: int = 1
	var blade_h: int = guard_y - blade_top
	_draw_rect_filled(image, Rect2i(cx - 1, blade_top, 2, blade_h), blade)
	# Highlight strip
	_draw_line_v(image, cx, blade_top, blade_top + blade_h - 1, highlight)
	# Tip
	_set_pixel_safe(image, cx, blade_top - 1 if blade_top > 0 else 0, highlight)
	# Clean outline
	_draw_rect_outline_1px(image, cx - 1, blade_top, 2, blade_h, Color.BLACK)


## ── Spears / Polearms (cel-shaded) ──────────────────────────────────────────

func _draw_spear(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Shaft — nearly full height
	_draw_cel_shaded_rect(image, cx, 4, 1, size.y - 4, shaft)
	# Spearhead — diamond shape with cel shading
	_draw_diamond(image, Vector2i(cx, 2), 2, head)
	# Highlight on upper portion
	_set_pixel_safe(image, cx, 0, highlight)
	_set_pixel_safe(image, cx, 1, highlight)
	# Shadow on lower portion
	_set_pixel_safe(image, cx, 3, _get_shadow_color(head))
	# Outline
	_set_pixel_safe(image, cx, 0, Color.BLACK)
	_set_pixel_safe(image, cx - 1, 1, Color.BLACK)
	_set_pixel_safe(image, cx + 1, 1, Color.BLACK)
	_set_pixel_safe(image, cx, 4, Color.BLACK)


func _draw_lance(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_cel_shaded_rect(image, cx, 5, 1, size.y - 5, shaft)
	# Vamplate (hand guard) — cel-shaded flat bar
	var vamp_y: int = size.y - 8
	_draw_cel_shaded_rect(image, cx - 2, vamp_y, 5, 1, guard)
	# Lance head — tapered point, flat fill
	_draw_rect_filled(image, Rect2i(cx - 1, 2, 3, 3), head)
	_draw_rect_filled(image, Rect2i(cx, 1, 1, 1), head)
	# Highlight
	_set_pixel_safe(image, cx, 0, highlight)
	_set_pixel_safe(image, cx, 1, highlight)
	_set_pixel_safe(image, cx, 2, highlight)
	# Shadow on sides
	_set_pixel_safe(image, cx - 1, 3, _get_shadow_color(head))
	_set_pixel_safe(image, cx + 1, 3, _get_shadow_color(head))
	# Clean outline
	_draw_rect_outline_1px(image, cx - 1, 1, 3, 4, Color.BLACK)


func _draw_halberd(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_cel_shaded_rect(image, cx, 6, 1, size.y - 6, shaft)
	# Top spike — flat
	_draw_rect_filled(image, Rect2i(cx, 1, 1, 2), head)
	_set_pixel_safe(image, cx, 0, highlight)
	# Axe blade on right — cel-shaded rect
	_draw_cel_shaded_rect(image, cx + 1, 3, 4, 4, head)
	# Highlight on cutting edge
	_draw_line_v(image, cx + 4, 3, 6, highlight)
	# Back spike on left
	_draw_cel_shaded_rect(image, cx - 3, 4, 3, 2, head)
	# Tip highlight
	_set_pixel_safe(image, cx - 3, 4, highlight)
	_set_pixel_safe(image, cx, 1, highlight)


## ── Maces / Hammers (cel-shaded) ────────────────────────────────────────────

func _draw_mace(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_cel_shaded_rect(image, cx, 6, 1, size.y - 6, shaft)
	# Mace head — cel-shaded circle
	_draw_cel_shaded_circle(image, Vector2i(cx, 3), 2, head)
	# Spikes (flat colored, no gradient)
	_set_pixel_safe(image, cx, 0, highlight)
	_set_pixel_safe(image, cx + 3, 3, highlight)
	_set_pixel_safe(image, cx - 3, 3, highlight)
	_set_pixel_safe(image, cx, 6, _get_shadow_color(head))
	# Diagonal spikes
	_set_pixel_safe(image, cx + 2, 1, head)
	_set_pixel_safe(image, cx - 2, 1, head)
	_set_pixel_safe(image, cx + 2, 5, head)
	_set_pixel_safe(image, cx - 2, 5, head)


func _draw_warhammer(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_cel_shaded_rect(image, cx, 7, 1, size.y - 7, shaft)
	# Hammer head right — flat hammer face
	_draw_cel_shaded_rect(image, cx + 1, 3, 3, 4, head)
	# Highlight on face
	_draw_line_v(image, cx + 3, 3, 6, highlight)
	# Left pick — flat
	_draw_cel_shaded_rect(image, cx - 4, 4, 4, 2, head)
	# Pick tip highlight
	_set_pixel_safe(image, cx - 4, 4, highlight)
	_set_pixel_safe(image, cx - 4, 5, highlight)
	# Top cap
	_draw_cel_shaded_rect(image, cx - 1, 2, 4, 1, head)
	_set_pixel_safe(image, cx, 1, highlight)


func _draw_hammer(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_cel_shaded_rect(image, cx, 6, 1, size.y - 6, shaft)
	# Symmetrical hammer head — cel-shaded rect
	_draw_cel_shaded_rect(image, cx - 3, 2, 7, 4, head)
	# Highlight on top band
	_draw_rect_filled(image, Rect2i(cx - 2, 2, 5, 1), highlight)
	# Highlight on both faces
	_set_pixel_safe(image, cx - 3, 3, highlight)
	_set_pixel_safe(image, cx + 3, 3, highlight)


func _draw_flail(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color, chain: Color) -> void:
	var cx: int = size.x / 2
	# Handle — cel-shaded
	_draw_cel_shaded_rect(image, cx, 10, 1, size.y - 10, shaft)
	# Chain — flat colored links (no gradient)
	_set_pixel_safe(image, cx, 9, chain)
	_set_pixel_safe(image, cx + 1, 8, chain)
	_set_pixel_safe(image, cx, 7, chain)
	_set_pixel_safe(image, cx + 1, 6, chain)
	# Spiked ball — cel-shaded circle
	_draw_cel_shaded_circle(image, Vector2i(cx, 3), 2, head)
	# Spikes — flat
	_set_pixel_safe(image, cx, 0, highlight)
	_set_pixel_safe(image, cx + 3, 3, highlight)
	_set_pixel_safe(image, cx - 3, 3, highlight)
	_set_pixel_safe(image, cx + 2, 1, head)
	_set_pixel_safe(image, cx - 2, 1, head)


## ── Bows (cel-shaded) ────────────────────────────────────────────────────────

func _draw_bow(image: Image, size: Vector2i, wood: Color, string_col: Color) -> void:
	var cx: int = size.x / 2
	var mid_y: int = size.y / 2
	# Bow limbs — drawn as flat colored shapes with highlight/shadow
	# Upper limb
	_draw_rect_filled(image, Rect2i(cx - 4, 1, 2, 8), wood)
	_draw_line_v(image, cx - 4, 1, 8, _get_highlight_color(wood))
	_draw_line_v(image, cx - 3, 1, 8, _get_shadow_color(wood))
	_draw_rect_outline_1px(image, cx - 4, 1, 2, 8, Color.BLACK)
	# Grip — flat darker rect
	_draw_cel_shaded_rect(image, cx - 3, mid_y - 1, 2, 3, _get_shadow_color(wood))
	# Lower limb
	_draw_rect_filled(image, Rect2i(cx - 4, mid_y + 2, 2, 8), wood)
	_draw_line_v(image, cx - 4, mid_y + 2, mid_y + 9, _get_highlight_color(wood))
	_draw_line_v(image, cx - 3, mid_y + 2, mid_y + 9, _get_shadow_color(wood))
	_draw_rect_outline_1px(image, cx - 4, mid_y + 2, 2, 8, Color.BLACK)
	# Bowstring — clean flat line
	_draw_line_v(image, cx - 1, 1, size.y - 2, string_col)
	# Nock points — highlight
	_set_pixel_safe(image, cx - 1, 0, _get_highlight_color(wood))
	_set_pixel_safe(image, cx - 1, size.y - 1, _get_highlight_color(wood))


func _draw_bow_short(image: Image, size: Vector2i, wood: Color, string_col: Color) -> void:
	# Shorter version of bow — same cel-shaded approach
	_draw_bow(image, size, wood, string_col)


func _draw_bow_long(image: Image, size: Vector2i, wood: Color, string_col: Color) -> void:
	# Taller version — same cel-shaded structure, more canvas
	_draw_bow(image, size, wood, string_col)


func _draw_crossbow(image: Image, size: Vector2i, wood: Color, string_col: Color, metal: Color) -> void:
	var cx: int = size.x / 2
	var mid_y: int = size.y / 2
	# Stock (horizontal body) — cel-shaded rect
	_draw_cel_shaded_rect(image, cx - 2, mid_y - 1, 7, 2, wood)
	# Trigger — flat metal
	_draw_cel_shaded_rect(image, cx + 2, mid_y + 1, 1, 2, metal)
	# Upper limb — flat
	_draw_cel_shaded_rect(image, cx - 5, mid_y - 4, 3, 3, wood)
	# Lower limb — flat
	_draw_cel_shaded_rect(image, cx - 5, mid_y + 1, 3, 3, wood)
	# String — flat line
	_draw_line_v(image, cx - 2, mid_y - 3, mid_y + 2, string_col)
	# Bolt on rail — flat metal with highlight tip
	_draw_rect_filled(image, Rect2i(cx - 4, mid_y - 1, 3, 1), metal)
	_set_pixel_safe(image, cx - 5, mid_y - 1, _get_highlight_color(metal))


## ── Staves / Wands / Orbs (cel-shaded) ──────────────────────────────────────

func _draw_staff(image: Image, size: Vector2i, wood: Color, orb: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	# Long shaft — cel-shaded
	_draw_cel_shaded_rect(image, cx, 4, 1, size.y - 4, wood)
	# Ornate top — cel-shaded orb (flat fill, no gradient glow)
	_draw_cel_shaded_circle(image, Vector2i(cx, 2), 2, orb)
	# Prongs holding orb — flat
	_set_pixel_safe(image, cx - 1, 4, _get_shadow_color(wood))
	_set_pixel_safe(image, cx + 1, 4, _get_shadow_color(wood))
	# Wrap detail near grip — alternating flat bands
	var grip_y: int = size.y - 8
	_set_pixel_safe(image, cx, grip_y, _get_highlight_color(wood))
	_set_pixel_safe(image, cx, grip_y + 1, _get_shadow_color(wood))
	_set_pixel_safe(image, cx, grip_y + 2, _get_highlight_color(wood))


func _draw_wand(image: Image, size: Vector2i, wood: Color, orb: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	# Thin shaft — cel-shaded
	_draw_cel_shaded_rect(image, cx, 3, 1, size.y - 3, wood)
	# Wider base
	_set_pixel_safe(image, cx - 1, size.y - 3, _get_shadow_color(wood))
	_set_pixel_safe(image, cx - 1, size.y - 2, _get_shadow_color(wood))
	# Tip — flat orb color (no sparkle/gradient)
	_set_pixel_safe(image, cx, 2, orb)
	_set_pixel_safe(image, cx, 1, highlight)
	_set_pixel_safe(image, cx, 0, _get_highlight_color(orb))
	# Flat colored accent around tip (replaces sparkle)
	_set_pixel_safe(image, cx - 1, 1, orb)
	_set_pixel_safe(image, cx + 1, 1, orb)


func _draw_orb(image: Image, size: Vector2i, orb: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	var cy: int = size.y / 2
	# Main sphere — cel-shaded circle (flat fill with highlight/shadow zones)
	_draw_cel_shaded_circle(image, Vector2i(cx, cy), 3, orb)
	# Core highlight — single bright spot
	_set_pixel_safe(image, cx - 1, cy - 1, highlight)
	_set_pixel_safe(image, cx, cy - 1, highlight)
	# Small pedestal/base — flat
	_draw_cel_shaded_rect(image, cx - 1, cy + 4, 3, 1, _get_shadow_color(orb))


func _draw_scepter(image: Image, size: Vector2i, shaft: Color, orb: Color, guard: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	# Shaft — cel-shaded
	_draw_cel_shaded_rect(image, cx, 4, 1, size.y - 4, shaft)
	# Decorative ring — flat guard color
	var ring_y: int = size.y - 6
	_draw_cel_shaded_rect(image, cx - 1, ring_y, 3, 1, guard)
	# Crown/head — flat guard with prongs
	_draw_cel_shaded_rect(image, cx - 2, 3, 5, 1, guard)
	# Prongs
	_set_pixel_safe(image, cx - 2, 2, guard)
	_set_pixel_safe(image, cx + 2, 2, guard)
	_set_pixel_safe(image, cx, 1, guard)
	# Gem — flat orb color
	_set_pixel_safe(image, cx, 2, orb)
	_set_pixel_safe(image, cx, 1, highlight)
	# Finial tips — highlight
	_set_pixel_safe(image, cx - 2, 1, highlight)
	_set_pixel_safe(image, cx + 2, 1, highlight)
	_set_pixel_safe(image, cx, 0, highlight)


## ── Shields (cel-shaded) ────────────────────────────────────────────────────

func _draw_shield(image: Image, size: Vector2i, body: Color, trim: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	var cy: int = size.y / 2
	# Shield body — flat fill
	# Top
	_draw_rect_filled(image, Rect2i(cx - 5, 2, 10, 1), body)
	# Main body
	_draw_rect_filled(image, Rect2i(cx - 5, 3, 10, size.y - 6), body)
	# Bottom taper
	_draw_rect_filled(image, Rect2i(cx - 4, size.y - 3, 8, 1), body)
	_draw_rect_filled(image, Rect2i(cx - 2, size.y - 2, 4, 1), body)
	_set_pixel_safe(image, cx, size.y - 1, body)
	# Highlight on top row
	_draw_rect_filled(image, Rect2i(cx - 4, 2, 8, 1), _get_highlight_color(body))
	# Shadow on lower rows
	_draw_rect_filled(image, Rect2i(cx - 4, size.y - 4, 8, 1), _get_shadow_color(body))
	# Border — flat trim color (clean outline)
	_draw_line_h(image, 1, cx - 4, cx + 3, trim)
	_draw_line_v(image, cx - 5, 2, size.y - 4, trim)
	_draw_line_v(image, cx + 4, 2, size.y - 4, trim)
	_draw_line_h(image, size.y - 3, cx - 4, cx + 3, trim)
	# Centre emblem — flat diamond
	_draw_diamond(image, Vector2i(cx, cy), 2, highlight)
	_set_pixel_safe(image, cx, cy, _get_highlight_color(highlight))
	# Clean black outline around shield
	_draw_line_h(image, 0, cx - 4, cx + 3, Color.BLACK)
	_draw_line_v(image, cx - 6, 2, size.y - 4, Color.BLACK)
	_draw_line_v(image, cx + 5, 2, size.y - 4, Color.BLACK)


func _draw_tower_shield(image: Image, size: Vector2i, body: Color, trim: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	var cy: int = size.y / 2
	# Tall rectangular shield — flat body fill
	_draw_rect_filled(image, Rect2i(cx - 5, 1, 10, size.y - 2), body)
	# Highlight on top row
	_draw_rect_filled(image, Rect2i(cx - 4, 1, 8, 1), _get_highlight_color(body))
	# Shadow on bottom row
	_draw_rect_filled(image, Rect2i(cx - 4, size.y - 2, 8, 1), _get_shadow_color(body))
	# Border — flat trim
	_draw_line_h(image, 0, cx - 5, cx + 4, trim)
	_draw_line_h(image, size.y - 1, cx - 5, cx + 4, trim)
	_draw_line_v(image, cx - 5, 0, size.y - 1, trim)
	_draw_line_v(image, cx + 4, 0, size.y - 1, trim)
	# Horizontal divider — flat trim
	_draw_line_h(image, cy, cx - 4, cx + 3, trim)
	# Central cross — flat dark trim
	_draw_line_v(image, cx, 2, size.y - 3, _get_shadow_color(trim))
	_draw_line_h(image, cy, cx - 3, cx + 2, _get_shadow_color(trim))
	# Rivets — flat highlights
	_set_pixel_safe(image, cx - 4, 1, highlight)
	_set_pixel_safe(image, cx + 3, 1, highlight)
	_set_pixel_safe(image, cx - 4, size.y - 2, highlight)
	_set_pixel_safe(image, cx + 3, size.y - 2, highlight)
	# Clean black outline
	_draw_rect_outline_1px(image, cx - 6, 0, 11, size.y, Color.BLACK)


## ── Fist (cel-shaded) ───────────────────────────────────────────────────────

func _draw_fist(image: Image, size: Vector2i, wrap: Color, metal: Color) -> void:
	var cx: int = size.x / 2
	var cy: int = size.y / 2
	# Main bar across knuckles — cel-shaded
	_draw_cel_shaded_rect(image, cx - 3, cy - 1, 6, 3, metal)
	# Finger holes — shadow color
	_set_pixel_safe(image, cx - 2, cy, _get_shadow_color(metal))
	_set_pixel_safe(image, cx, cy, _get_shadow_color(metal))
	_set_pixel_safe(image, cx + 2, cy, _get_shadow_color(metal))
	# Spikes on top — flat
	_set_pixel_safe(image, cx - 2, cy - 2, metal)
	_set_pixel_safe(image, cx, cy - 2, metal)
	_set_pixel_safe(image, cx + 2, cy - 2, metal)
	# Grip bar — cel-shaded
	_draw_cel_shaded_rect(image, cx - 2, cy + 2, 4, 1, wrap)


## ── Firearms (cel-shaded) ───────────────────────────────────────────────────

func _draw_pistol(image: Image, size: Vector2i, barrel: Color, grip: Color, guard: Color) -> void:
	var cy: int = size.y / 2
	# Barrel — horizontal cel-shaded rect
	_draw_cel_shaded_rect(image, 0, cy - 1, 8, 2, barrel)
	# Muzzle highlight
	_set_pixel_safe(image, 0, cy - 1, _get_highlight_color(barrel))
	_set_pixel_safe(image, 0, cy, _get_highlight_color(barrel))
	# Flintlock mechanism — flat guard color
	_draw_cel_shaded_rect(image, 6, cy - 2, 2, 2, guard)
	# Grip — angled down, cel-shaded
	_draw_cel_shaded_rect(image, 7, cy + 1, 2, 3, grip)
	_draw_cel_shaded_rect(image, 8, cy + 4, 2, 1, grip)
	# Trigger guard — flat
	_set_pixel_safe(image, 6, cy + 1, guard)
	_set_pixel_safe(image, 5, cy + 2, guard)
	_set_pixel_safe(image, 6, cy + 2, guard)


func _draw_musket(image: Image, size: Vector2i, barrel: Color, stock: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Barrel — long vertical cel-shaded rect
	_draw_cel_shaded_rect(image, cx, 0, 1, 12, barrel)
	# Barrel highlight
	_set_pixel_safe(image, cx, 0, _get_highlight_color(barrel))
	# Barrel band — flat dark accent
	_draw_rect_filled(image, Rect2i(cx - 1, 5, 3, 1), _get_shadow_color(barrel))
	# Mechanism — flat guard color
	_draw_cel_shaded_rect(image, cx - 1, 12, 3, 2, guard)
	# Stock — cel-shaded
	_draw_cel_shaded_rect(image, cx - 1, 14, 2, 6, stock)
	# Butt — shadow
	_draw_cel_shaded_rect(image, cx - 1, 20, 2, 2, _get_shadow_color(stock))
	# Trigger — flat
	_set_pixel_safe(image, cx + 1, 14, guard)
	_set_pixel_safe(image, cx + 1, 15, guard)


func _draw_blunderbuss(image: Image, size: Vector2i, barrel: Color, stock: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Flared barrel — wide top, cel-shaded
	_draw_cel_shaded_rect(image, cx - 2, 0, 5, 2, barrel)
	_draw_cel_shaded_rect(image, cx - 1, 2, 3, 3, barrel)
	_draw_cel_shaded_rect(image, cx, 5, 1, 5, barrel)
	# Muzzle flare highlight
	_draw_rect_filled(image, Rect2i(cx - 2, 0, 5, 1), _get_highlight_color(barrel))
	# Mechanism — flat guard
	_draw_cel_shaded_rect(image, cx - 1, 10, 3, 2, guard)
	# Stock — cel-shaded
	_draw_cel_shaded_rect(image, cx - 1, 12, 2, 6, stock)
	# Butt — shadow
	_draw_cel_shaded_rect(image, cx - 1, 18, 2, 2, _get_shadow_color(stock))
	# Trigger — flat
	_set_pixel_safe(image, cx + 1, 12, guard)


## ── Scythe (cel-shaded) ─────────────────────────────────────────────────────

func _draw_scythe(image: Image, size: Vector2i, blade: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Long shaft — cel-shaded
	_draw_cel_shaded_rect(image, cx, 5, 1, size.y - 5, shaft)
	# Wrap near grip — flat shadow bands
	_set_pixel_safe(image, cx, size.y - 5, _get_shadow_color(shaft))
	_set_pixel_safe(image, cx, size.y - 7, _get_shadow_color(shaft))
	# Blade mount — flat dark rect
	_draw_cel_shaded_rect(image, cx - 1, 4, 3, 2, _get_shadow_color(blade))
	# Curved blade — built from flat cel-shaded rects (same silhouette)
	# Inner curve (spine)
	_draw_cel_shaded_rect(image, cx + 1, 3, 4, 1, blade)
	_draw_cel_shaded_rect(image, cx + 4, 4, 2, 4, blade)
	_draw_cel_shaded_rect(image, cx + 4, 8, 1, 1, blade)
	# Outer edge (sharp edge — highlight zone)
	_draw_rect_filled(image, Rect2i(cx + 2, 2, 3, 1), highlight)
	_draw_line_v(image, cx + 6, 4, 7, highlight)
	_draw_line_v(image, cx + 5, 3, 4, highlight)
	# Fill between curves
	_draw_rect_filled(image, Rect2i(cx + 4, 3, 2, 1), blade)
	_draw_rect_filled(image, Rect2i(cx + 5, 4, 1, 4), blade)
	# Blade tip
	_set_pixel_safe(image, cx + 3, 8, highlight)
	_set_pixel_safe(image, cx + 3, 9, blade)
	# Top point
	_set_pixel_safe(image, cx, 3, blade)
	_set_pixel_safe(image, cx, 2, highlight)
	_set_pixel_safe(image, cx, 1, highlight)

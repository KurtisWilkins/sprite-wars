## ChibiWeaponRenderer — Procedurally generates pixel art weapon sprites for the
## chibi sprite system. Each weapon type gets a distinct, recognizable pixel art
## silhouette drawn to an Image, then converted to ImageTexture for use as a
## Sprite2D texture.
##
## Weapons are drawn at chibi-appropriate scale (small but recognizable), with
## canvas sizes ranging from 10x16 to 16x20 depending on weapon type.
class_name ChibiWeaponRenderer
extends RefCounted


## ── Default Colors ──────────────────────────────────────────────────────────

const DEFAULT_BLADE_COLOR := Color(0.75, 0.78, 0.82)      # steel grey
const DEFAULT_BLADE_HIGHLIGHT := Color(0.92, 0.94, 0.96)  # bright steel
const DEFAULT_HANDLE_COLOR := Color(0.45, 0.30, 0.18)     # brown leather
const DEFAULT_GUARD_COLOR := Color(0.65, 0.55, 0.20)      # bronze
const DEFAULT_GLOW_COLOR := Color(0.4, 0.7, 1.0, 0.45)    # soft blue glow
const DEFAULT_WOOD_COLOR := Color(0.55, 0.38, 0.22)       # wood shaft
const DEFAULT_HEAD_COLOR := Color(0.5, 0.5, 0.55)         # iron head
const DEFAULT_STRING_COLOR := Color(0.85, 0.82, 0.70)     # bowstring
const DEFAULT_ORB_COLOR := Color(0.3, 0.5, 0.9)           # magic blue
const DEFAULT_BARREL_COLOR := Color(0.35, 0.35, 0.38)     # dark metal


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
## Pixel offset from sprite centre to the grip point (where the hand holds).

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

## Render a weapon sprite for the given weapon_type using the provided
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
	var glow_col: Color = _color_or(visual_config, "glowColor", DEFAULT_GLOW_COLOR)
	var head_col: Color = _color_or(visual_config, "headColor", DEFAULT_HEAD_COLOR)
	var wood_col: Color = _color_or(visual_config, "shaftColor", DEFAULT_WOOD_COLOR)
	var string_col: Color = _color_or(visual_config, "stringColor", DEFAULT_STRING_COLOR)
	var orb_col: Color = _color_or(visual_config, "orbColor", DEFAULT_ORB_COLOR)
	var barrel_col: Color = _color_or(visual_config, "barrelColor", DEFAULT_BARREL_COLOR)

	# Dispatch to the appropriate drawing routine.
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

	# Glow pass.
	var has_particles: bool = visual_config.get("hasParticles", false)
	if has_particles and glow_col.a > 0.0:
		_apply_glow(image, glow_col)

	var tex := ImageTexture.create_from_image(image)
	return tex


## Returns the pixel offset from the weapon sprite's centre to the grip point.
func get_weapon_grip_offset(weapon_type: String) -> Vector2:
	return GRIP_OFFSETS.get(weapon_type, Vector2.ZERO)


## Returns the appropriate canvas size for each weapon type.
func get_weapon_canvas_size(weapon_type: String) -> Vector2i:
	return CANVAS_SIZES.get(weapon_type, Vector2i(10, 18))


## ── Drawing Helpers ─────────────────────────────────────────────────────────

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


func _draw_rect_filled(image: Image, rect: Rect2i, color: Color) -> void:
	for y in range(rect.position.y, rect.position.y + rect.size.y):
		for x in range(rect.position.x, rect.position.x + rect.size.x):
			_set_pixel_safe(image, x, y, color)


func _fill_circle(image: Image, center: Vector2i, radius: int, color: Color) -> void:
	var r2: int = radius * radius
	for dy in range(-radius, radius + 1):
		for dx in range(-radius, radius + 1):
			if dx * dx + dy * dy <= r2:
				_set_pixel_safe(image, center.x + dx, center.y + dy, color)


func _draw_diamond(image: Image, center: Vector2i, radius: int, color: Color) -> void:
	for dy in range(-radius, radius + 1):
		var w: int = radius - absi(dy)
		for dx in range(-w, w + 1):
			_set_pixel_safe(image, center.x + dx, center.y + dy, color)


## ── Glow Effect ─────────────────────────────────────────────────────────────

func _apply_glow(image: Image, glow_color: Color) -> void:
	var w: int = image.get_width()
	var h: int = image.get_height()
	# Find all opaque pixels, then paint glow on adjacent transparent pixels.
	var opaque_pixels: Array[Vector2i] = []
	for y in range(h):
		for x in range(w):
			if image.get_pixel(x, y).a > 0.1:
				opaque_pixels.append(Vector2i(x, y))

	for p in opaque_pixels:
		for offset in [Vector2i(-1,0), Vector2i(1,0), Vector2i(0,-1), Vector2i(0,1)]:
			var nx: int = p.x + offset.x
			var ny: int = p.y + offset.y
			if nx >= 0 and nx < w and ny >= 0 and ny < h:
				if image.get_pixel(nx, ny).a < 0.05:
					_set_pixel_safe(image, nx, ny, glow_color)


## ── Color Utility ───────────────────────────────────────────────────────────

func _color_or(config: Dictionary, key: String, fallback: Color) -> Color:
	if config.has(key):
		var val = config[key]
		if val is Color:
			return val
		if val is String:
			return Color(val)
	return fallback


func _darker(color: Color, amount: float = 0.2) -> Color:
	return color.darkened(amount)


func _lighter(color: Color, amount: float = 0.2) -> Color:
	return color.lightened(amount)


## ═══════════════════════════════════════════════════════════════════════════
## ── WEAPON DRAWING ROUTINES ────────────────────────────────────────────────
## ═══════════════════════════════════════════════════════════════════════════


## ── Swords ──────────────────────────────────────────────────────────────────

func _draw_sword(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel (bottom)
	_set_pixel_safe(image, cx, size.y - 1, _darker(handle))
	# Handle: 3px tall, 2px wide
	_draw_rect_filled(image, Rect2i(cx - 1, size.y - 4, 2, 3), handle)
	# Guard: 6px wide, 1px tall
	var guard_y: int = size.y - 5
	_draw_line_h(image, guard_y, cx - 3, cx + 2, guard)
	# Blade: from guard_y-1 upward, 2px wide
	var blade_top: int = 1
	_draw_rect_filled(image, Rect2i(cx - 1, blade_top + 1, 2, guard_y - blade_top - 1), blade)
	# Blade tip (pointed)
	_set_pixel_safe(image, cx - 1, blade_top, blade)
	_set_pixel_safe(image, cx, blade_top, blade)
	_set_pixel_safe(image, cx, blade_top - 1 if blade_top > 0 else 0, highlight)
	# Highlight line down center of blade
	_draw_line_v(image, cx, blade_top + 1, guard_y - 1, highlight)


func _draw_longsword(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel
	_set_pixel_safe(image, cx, size.y - 1, _darker(handle))
	# Handle: 4px tall
	_draw_rect_filled(image, Rect2i(cx - 1, size.y - 5, 2, 4), handle)
	# Guard
	var guard_y: int = size.y - 6
	_draw_line_h(image, guard_y, cx - 3, cx + 2, guard)
	_draw_line_h(image, guard_y - 1, cx - 3, cx + 2, _darker(guard))
	# Blade: tall and slim
	var blade_top: int = 1
	_draw_rect_filled(image, Rect2i(cx - 1, blade_top + 1, 3, guard_y - blade_top - 1), blade)
	# Tip
	_set_pixel_safe(image, cx, blade_top, highlight)
	_set_pixel_safe(image, cx - 1, blade_top + 1, blade)
	_set_pixel_safe(image, cx + 1, blade_top + 1, blade)
	# Highlight
	_draw_line_v(image, cx, blade_top + 1, guard_y - 1, highlight)
	# Fuller (dark line along blade)
	_draw_line_v(image, cx - 1, blade_top + 3, guard_y - 2, _darker(blade, 0.1))


func _draw_greatsword(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel
	_draw_rect_filled(image, Rect2i(cx - 1, size.y - 2, 2, 2), _darker(handle))
	# Handle: 5px tall
	_draw_rect_filled(image, Rect2i(cx - 1, size.y - 7, 2, 5), handle)
	# Guard: wide
	var guard_y: int = size.y - 8
	_draw_line_h(image, guard_y, cx - 4, cx + 3, guard)
	_draw_line_h(image, guard_y - 1, cx - 4, cx + 3, _darker(guard))
	# Blade: wider, 3px
	var blade_top: int = 1
	_draw_rect_filled(image, Rect2i(cx - 2, blade_top + 2, 4, guard_y - blade_top - 2), blade)
	# Edges darker
	_draw_line_v(image, cx - 2, blade_top + 3, guard_y - 1, _darker(blade, 0.15))
	_draw_line_v(image, cx + 1, blade_top + 3, guard_y - 1, _darker(blade, 0.15))
	# Tip: pointed
	_draw_rect_filled(image, Rect2i(cx - 1, blade_top, 2, 2), blade)
	_set_pixel_safe(image, cx, blade_top - 1 if blade_top > 0 else 0, highlight)
	# Highlight
	_draw_line_v(image, cx, blade_top + 2, guard_y - 2, highlight)
	_draw_line_v(image, cx - 1, blade_top + 2, guard_y - 2, _lighter(blade, 0.1))


func _draw_shortsword(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel
	_set_pixel_safe(image, cx, size.y - 1, _darker(handle))
	# Handle: 3px
	_draw_rect_filled(image, Rect2i(cx - 1, size.y - 4, 2, 3), handle)
	# Guard
	var guard_y: int = size.y - 5
	_draw_line_h(image, guard_y, cx - 2, cx + 1, guard)
	# Blade: short
	var blade_top: int = 2
	_draw_rect_filled(image, Rect2i(cx - 1, blade_top + 1, 2, guard_y - blade_top - 1), blade)
	# Tip
	_set_pixel_safe(image, cx, blade_top, highlight)
	# Highlight
	_draw_line_v(image, cx, blade_top + 1, guard_y - 1, highlight)


func _draw_katana(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel cap
	_set_pixel_safe(image, cx, size.y - 1, _darker(handle))
	# Handle: long, wrapped look (alternating dark/light)
	for i in range(5):
		var y: int = size.y - 2 - i
		var col: Color = handle if i % 2 == 0 else _darker(handle, 0.15)
		_draw_rect_filled(image, Rect2i(cx - 1, y, 2, 1), col)
	# Tsuba (round guard)
	var guard_y: int = size.y - 7
	_draw_line_h(image, guard_y, cx - 2, cx + 1, guard)
	# Blade: slight curve (offset 1px right partway up)
	var blade_top: int = 1
	# Lower blade: straight
	_draw_rect_filled(image, Rect2i(cx - 1, guard_y - 6, 2, 6), blade)
	# Upper blade: shifted 1px right for curve
	_draw_rect_filled(image, Rect2i(cx, blade_top + 1, 2, guard_y - 6 - blade_top), blade)
	# Tip: angled
	_set_pixel_safe(image, cx + 1, blade_top, highlight)
	_set_pixel_safe(image, cx + 2, blade_top + 1, blade)
	# Highlight along edge
	_draw_line_v(image, cx, guard_y - 6, guard_y - 1, highlight)
	_draw_line_v(image, cx + 1, blade_top + 1, guard_y - 7, highlight)


func _draw_scimitar(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel
	_set_pixel_safe(image, cx, size.y - 1, _darker(handle))
	# Handle
	_draw_rect_filled(image, Rect2i(cx - 1, size.y - 4, 2, 3), handle)
	# Guard: curved
	var guard_y: int = size.y - 5
	_draw_line_h(image, guard_y, cx - 2, cx + 2, guard)
	# Blade: curved, wider at end
	# Lower section: 2px wide
	_draw_rect_filled(image, Rect2i(cx - 1, guard_y - 5, 2, 5), blade)
	# Mid curve: shifts left
	_draw_rect_filled(image, Rect2i(cx - 2, guard_y - 9, 3, 4), blade)
	# Top: wide curved end
	_draw_rect_filled(image, Rect2i(cx - 3, guard_y - 11, 4, 2), blade)
	# Tip
	_set_pixel_safe(image, cx - 4, guard_y - 11, blade)
	_set_pixel_safe(image, cx - 4, guard_y - 10, highlight)
	# Highlight: along the inside edge
	_draw_line_v(image, cx, guard_y - 5, guard_y - 1, highlight)
	_draw_line_v(image, cx - 1, guard_y - 9, guard_y - 5, highlight)


## ── Axes ────────────────────────────────────────────────────────────────────

func _draw_axe(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color, _guard: Color) -> void:
	var cx: int = size.x / 2
	# Shaft: full height minus head area
	_draw_rect_filled(image, Rect2i(cx - 1, 4, 2, size.y - 4), shaft)
	# Pommel
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Axe head: right side of shaft, triangular
	_draw_rect_filled(image, Rect2i(cx + 1, 2, 3, 5), head)
	_draw_rect_filled(image, Rect2i(cx + 4, 3, 1, 3), head)
	# Left bit
	_set_pixel_safe(image, cx - 1, 3, head)
	_set_pixel_safe(image, cx - 1, 4, head)
	# Edge highlight
	_draw_line_v(image, cx + 4, 3, 5, highlight)
	_draw_line_v(image, cx + 3, 2, 6, highlight)
	# Top of head
	_set_pixel_safe(image, cx, 2, head)
	_set_pixel_safe(image, cx + 1, 1, head)


func _draw_battleaxe(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color, _guard: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_rect_filled(image, Rect2i(cx - 1, 5, 2, size.y - 5), shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Double-sided axe head
	# Right blade
	_draw_rect_filled(image, Rect2i(cx + 1, 2, 3, 6), head)
	_draw_rect_filled(image, Rect2i(cx + 4, 3, 1, 4), head)
	# Left blade
	_draw_rect_filled(image, Rect2i(cx - 4, 2, 3, 6), head)
	_draw_rect_filled(image, Rect2i(cx - 5, 3, 1, 4), head)
	# Top cap
	_draw_line_h(image, 1, cx - 2, cx + 2, head)
	_set_pixel_safe(image, cx, 0, highlight)
	# Edge highlights
	_draw_line_v(image, cx + 4, 3, 6, highlight)
	_draw_line_v(image, cx - 5, 3, 6, highlight)


func _draw_greataxe(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color, _guard: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_rect_filled(image, Rect2i(cx - 1, 7, 2, size.y - 7), shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Massive head: right side
	_draw_rect_filled(image, Rect2i(cx + 1, 1, 4, 8), head)
	_draw_rect_filled(image, Rect2i(cx + 5, 2, 2, 6), head)
	# Left accent
	_draw_rect_filled(image, Rect2i(cx - 3, 3, 2, 4), head)
	# Top spike
	_draw_line_h(image, 0, cx, cx + 2, head)
	_set_pixel_safe(image, cx + 1, 0, highlight)
	# Edge highlight
	_draw_line_v(image, cx + 6, 3, 7, highlight)
	_draw_line_v(image, cx + 5, 2, 7, _lighter(head, 0.1))
	# Dark inner edge
	_draw_line_v(image, cx + 1, 2, 8, _darker(head, 0.15))


## ── Dagger ──────────────────────────────────────────────────────────────────

func _draw_dagger(image: Image, size: Vector2i, blade: Color, highlight: Color, handle: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Pommel
	_set_pixel_safe(image, cx, size.y - 1, _darker(handle))
	# Handle: 2px tall
	_draw_rect_filled(image, Rect2i(cx - 1, size.y - 3, 2, 2), handle)
	# Guard: small, 4px
	var guard_y: int = size.y - 4
	_draw_line_h(image, guard_y, cx - 2, cx + 1, guard)
	# Blade: short and slim, 2px wide
	var blade_top: int = 1
	_draw_rect_filled(image, Rect2i(cx - 1, blade_top + 1, 2, guard_y - blade_top - 1), blade)
	# Tip
	_set_pixel_safe(image, cx, blade_top, highlight)
	# Highlight
	_draw_line_v(image, cx, blade_top + 1, guard_y - 1, highlight)


## ── Spears / Polearms ───────────────────────────────────────────────────────

func _draw_spear(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Shaft: nearly full height
	_draw_rect_filled(image, Rect2i(cx, 4, 1, size.y - 4), shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Spearhead: diamond shape
	_set_pixel_safe(image, cx, 0, highlight)
	_draw_rect_filled(image, Rect2i(cx - 1, 1, 3, 1), head)
	_draw_rect_filled(image, Rect2i(cx - 1, 2, 3, 1), head)
	_draw_rect_filled(image, Rect2i(cx, 3, 1, 1), head)
	# Highlight on head
	_set_pixel_safe(image, cx, 1, highlight)
	_set_pixel_safe(image, cx, 2, highlight)


func _draw_lance(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_rect_filled(image, Rect2i(cx, 5, 1, size.y - 5), shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Vamplate (hand guard disc)
	var vamp_y: int = size.y - 8
	_draw_line_h(image, vamp_y, cx - 2, cx + 2, guard)
	# Lance head: long tapered point
	_set_pixel_safe(image, cx, 0, highlight)
	_draw_rect_filled(image, Rect2i(cx, 1, 1, 1), head)
	_draw_rect_filled(image, Rect2i(cx - 1, 2, 3, 1), head)
	_draw_rect_filled(image, Rect2i(cx - 1, 3, 3, 2), head)
	# Highlight
	_set_pixel_safe(image, cx, 1, highlight)
	_set_pixel_safe(image, cx, 2, highlight)
	_set_pixel_safe(image, cx, 3, highlight)


func _draw_halberd(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_rect_filled(image, Rect2i(cx, 6, 1, size.y - 6), shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Top spike
	_set_pixel_safe(image, cx, 0, highlight)
	_draw_rect_filled(image, Rect2i(cx, 1, 1, 2), head)
	# Axe blade on right
	_draw_rect_filled(image, Rect2i(cx + 1, 3, 3, 4), head)
	_draw_rect_filled(image, Rect2i(cx + 4, 4, 1, 2), head)
	# Back spike on left
	_draw_rect_filled(image, Rect2i(cx - 2, 4, 2, 2), head)
	_set_pixel_safe(image, cx - 3, 5, head)
	# Highlights
	_draw_line_v(image, cx + 4, 4, 5, highlight)
	_set_pixel_safe(image, cx + 3, 3, highlight)
	_set_pixel_safe(image, cx, 1, highlight)


## ── Maces / Hammers ─────────────────────────────────────────────────────────

func _draw_mace(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_rect_filled(image, Rect2i(cx, 6, 1, size.y - 6), shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Mace head: circle with spikes
	_fill_circle(image, Vector2i(cx, 3), 2, head)
	# Spikes (4 cardinal directions)
	_set_pixel_safe(image, cx, 0, highlight)
	_set_pixel_safe(image, cx + 3, 3, highlight)
	_set_pixel_safe(image, cx - 3, 3, highlight)
	_set_pixel_safe(image, cx, 6, _darker(head))
	# Diagonal spikes
	_set_pixel_safe(image, cx + 2, 1, head)
	_set_pixel_safe(image, cx - 2, 1, head)
	_set_pixel_safe(image, cx + 2, 5, head)
	_set_pixel_safe(image, cx - 2, 5, head)
	# Top highlight
	_set_pixel_safe(image, cx - 1, 2, highlight)
	_set_pixel_safe(image, cx, 2, highlight)


func _draw_warhammer(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_rect_filled(image, Rect2i(cx, 7, 1, size.y - 7), shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Hammer head: rectangular, wider on one side
	# Right: flat hammer face
	_draw_rect_filled(image, Rect2i(cx + 1, 3, 3, 4), head)
	# Left: spike/pick
	_draw_rect_filled(image, Rect2i(cx - 3, 4, 3, 2), head)
	_set_pixel_safe(image, cx - 4, 5, head)
	# Top cap
	_draw_line_h(image, 2, cx - 1, cx + 2, head)
	_set_pixel_safe(image, cx, 1, highlight)
	# Highlights
	_set_pixel_safe(image, cx + 3, 3, highlight)
	_set_pixel_safe(image, cx + 3, 4, highlight)
	_set_pixel_safe(image, cx - 4, 5, highlight)


func _draw_hammer(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_rect_filled(image, Rect2i(cx, 6, 1, size.y - 6), shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Symmetrical hammer head
	_draw_rect_filled(image, Rect2i(cx - 3, 2, 7, 4), head)
	# Top band
	_draw_line_h(image, 1, cx - 2, cx + 2, _darker(head))
	# Highlights on faces
	_set_pixel_safe(image, cx - 3, 3, highlight)
	_set_pixel_safe(image, cx + 3, 3, highlight)
	_draw_line_h(image, 2, cx - 2, cx + 2, highlight)


func _draw_flail(image: Image, size: Vector2i, head: Color, highlight: Color, shaft: Color, chain: Color) -> void:
	var cx: int = size.x / 2
	# Handle/shaft: lower portion
	_draw_rect_filled(image, Rect2i(cx, 10, 1, size.y - 10), shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Chain: 3-4 links from shaft top to ball
	_set_pixel_safe(image, cx, 9, chain)
	_set_pixel_safe(image, cx + 1, 8, chain)
	_set_pixel_safe(image, cx, 7, chain)
	_set_pixel_safe(image, cx + 1, 6, chain)
	# Spiked ball
	_fill_circle(image, Vector2i(cx, 3), 2, head)
	# Spikes
	_set_pixel_safe(image, cx, 0, highlight)
	_set_pixel_safe(image, cx + 3, 3, highlight)
	_set_pixel_safe(image, cx - 3, 3, highlight)
	_set_pixel_safe(image, cx + 2, 1, head)
	_set_pixel_safe(image, cx - 2, 1, head)
	# Shine
	_set_pixel_safe(image, cx - 1, 2, highlight)


## ── Bows ────────────────────────────────────────────────────────────────────

func _draw_bow(image: Image, size: Vector2i, wood: Color, string_col: Color) -> void:
	var cx: int = size.x / 2
	var mid_y: int = size.y / 2
	# Bow limbs: curved arc on the left side
	# Upper limb
	_set_pixel_safe(image, cx - 2, 1, wood)
	_set_pixel_safe(image, cx - 3, 2, wood)
	_set_pixel_safe(image, cx - 4, 3, wood)
	_set_pixel_safe(image, cx - 4, 4, wood)
	_set_pixel_safe(image, cx - 4, 5, wood)
	_set_pixel_safe(image, cx - 3, 6, wood)
	_set_pixel_safe(image, cx - 3, 7, wood)
	_set_pixel_safe(image, cx - 2, 8, wood)
	# Grip
	_draw_rect_filled(image, Rect2i(cx - 2, mid_y - 1, 2, 3), _darker(wood))
	# Lower limb
	_set_pixel_safe(image, cx - 2, mid_y + 2, wood)
	_set_pixel_safe(image, cx - 3, mid_y + 3, wood)
	_set_pixel_safe(image, cx - 3, mid_y + 4, wood)
	_set_pixel_safe(image, cx - 4, mid_y + 5, wood)
	_set_pixel_safe(image, cx - 4, mid_y + 6, wood)
	_set_pixel_safe(image, cx - 4, mid_y + 7, wood)
	_set_pixel_safe(image, cx - 3, size.y - 3, wood)
	_set_pixel_safe(image, cx - 2, size.y - 2, wood)
	# Bowstring: vertical line on right side of bow
	_draw_line_v(image, cx - 1, 1, size.y - 2, string_col)
	# Nock points
	_set_pixel_safe(image, cx - 1, 0, _lighter(wood))
	_set_pixel_safe(image, cx - 1, size.y - 1, _lighter(wood))


func _draw_bow_short(image: Image, size: Vector2i, wood: Color, string_col: Color) -> void:
	# Shorter version of bow
	_draw_bow(image, size, wood, string_col)


func _draw_bow_long(image: Image, size: Vector2i, wood: Color, string_col: Color) -> void:
	# Taller version - same structure, just more canvas
	_draw_bow(image, size, wood, string_col)


func _draw_crossbow(image: Image, size: Vector2i, wood: Color, string_col: Color, metal: Color) -> void:
	var cx: int = size.x / 2
	var mid_y: int = size.y / 2
	# Stock (horizontal body)
	_draw_rect_filled(image, Rect2i(cx - 2, mid_y - 1, 5, 2), wood)
	_draw_rect_filled(image, Rect2i(cx + 3, mid_y, 2, 1), _darker(wood))
	# Trigger
	_set_pixel_safe(image, cx + 2, mid_y + 1, metal)
	_set_pixel_safe(image, cx + 2, mid_y + 2, metal)
	# Bow limbs: horizontal bar at front
	# Upper limb
	_set_pixel_safe(image, cx - 3, mid_y - 2, wood)
	_set_pixel_safe(image, cx - 4, mid_y - 3, wood)
	_set_pixel_safe(image, cx - 5, mid_y - 4, wood)
	# Lower limb
	_set_pixel_safe(image, cx - 3, mid_y + 1, wood)
	_set_pixel_safe(image, cx - 4, mid_y + 2, wood)
	_set_pixel_safe(image, cx - 5, mid_y + 3, wood)
	# String
	_draw_line_v(image, cx - 2, mid_y - 2, mid_y + 1, string_col)
	# Bolt/arrow on the rail
	_draw_line_h(image, mid_y - 1, cx - 4, cx - 2, metal)
	_set_pixel_safe(image, cx - 5, mid_y - 1, _lighter(metal))


## ── Staves / Wands / Orbs ───────────────────────────────────────────────────

func _draw_staff(image: Image, size: Vector2i, wood: Color, orb: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	# Long shaft
	_draw_rect_filled(image, Rect2i(cx, 4, 1, size.y - 4), wood)
	_set_pixel_safe(image, cx, size.y - 1, _darker(wood))
	# Ornate top: small orb
	_fill_circle(image, Vector2i(cx, 2), 2, orb)
	_set_pixel_safe(image, cx - 1, 1, highlight)
	_set_pixel_safe(image, cx, 1, highlight)
	# Prongs holding orb
	_set_pixel_safe(image, cx - 1, 4, _darker(wood, 0.1))
	_set_pixel_safe(image, cx + 1, 4, _darker(wood, 0.1))
	# Wrap detail near grip
	var grip_y: int = size.y - 8
	_set_pixel_safe(image, cx, grip_y, _lighter(wood, 0.15))
	_set_pixel_safe(image, cx, grip_y + 1, _darker(wood, 0.1))
	_set_pixel_safe(image, cx, grip_y + 2, _lighter(wood, 0.15))


func _draw_wand(image: Image, size: Vector2i, wood: Color, orb: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	# Thin shaft
	_draw_line_v(image, cx, 3, size.y - 1, wood)
	_set_pixel_safe(image, cx, size.y - 1, _darker(wood))
	# Tapers: slightly wider near base
	_set_pixel_safe(image, cx - 1, size.y - 3, _darker(wood))
	_set_pixel_safe(image, cx - 1, size.y - 2, _darker(wood))
	# Tip: glowing point
	_set_pixel_safe(image, cx, 2, orb)
	_set_pixel_safe(image, cx, 1, highlight)
	_set_pixel_safe(image, cx, 0, _lighter(orb, 0.3))
	# Sparkle around tip
	_set_pixel_safe(image, cx - 1, 1, Color(orb.r, orb.g, orb.b, 0.4))
	_set_pixel_safe(image, cx + 1, 1, Color(orb.r, orb.g, orb.b, 0.4))
	_set_pixel_safe(image, cx, 0, Color(highlight.r, highlight.g, highlight.b, 0.6))


func _draw_orb(image: Image, size: Vector2i, orb: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	var cy: int = size.y / 2
	# Main sphere
	_fill_circle(image, Vector2i(cx, cy), 3, orb)
	# Inner glow ring
	_fill_circle(image, Vector2i(cx, cy), 2, _lighter(orb, 0.15))
	# Core highlight
	_set_pixel_safe(image, cx - 1, cy - 1, highlight)
	_set_pixel_safe(image, cx, cy - 1, highlight)
	_set_pixel_safe(image, cx - 1, cy, _lighter(orb, 0.3))
	# Outline shadow (bottom-right)
	_set_pixel_safe(image, cx + 2, cy + 2, _darker(orb, 0.3))
	_set_pixel_safe(image, cx + 1, cy + 3, _darker(orb, 0.3))
	_set_pixel_safe(image, cx + 3, cy + 1, _darker(orb, 0.3))
	# Small pedestal/base
	_draw_line_h(image, cy + 4, cx - 1, cx + 1, _darker(orb, 0.4))


func _draw_scepter(image: Image, size: Vector2i, shaft: Color, orb: Color, guard: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	# Shaft
	_draw_line_v(image, cx, 4, size.y - 1, shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Decorative ring
	var ring_y: int = size.y - 6
	_draw_line_h(image, ring_y, cx - 1, cx + 1, guard)
	# Crown/head
	# Prongs
	_set_pixel_safe(image, cx - 2, 2, guard)
	_set_pixel_safe(image, cx + 2, 2, guard)
	_set_pixel_safe(image, cx, 1, guard)
	# Cross-bar
	_draw_line_h(image, 3, cx - 2, cx + 2, guard)
	# Gem at centre
	_set_pixel_safe(image, cx, 2, orb)
	_set_pixel_safe(image, cx, 1, highlight)
	# Finial tips
	_set_pixel_safe(image, cx - 2, 1, highlight)
	_set_pixel_safe(image, cx + 2, 1, highlight)
	_set_pixel_safe(image, cx, 0, highlight)


## ── Shields ─────────────────────────────────────────────────────────────────

func _draw_shield(image: Image, size: Vector2i, body: Color, trim: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	var cy: int = size.y / 2
	# Shield body: rounded rectangle shape
	# Top: slightly narrower
	_draw_line_h(image, 1, cx - 4, cx + 3, trim)
	_draw_line_h(image, 2, cx - 5, cx + 4, body)
	# Main body
	for y in range(3, size.y - 3):
		_draw_line_h(image, y, cx - 5, cx + 4, body)
	# Bottom: tapers to point
	_draw_line_h(image, size.y - 3, cx - 4, cx + 3, body)
	_draw_line_h(image, size.y - 2, cx - 2, cx + 1, body)
	_set_pixel_safe(image, cx, size.y - 1, body)
	# Border
	_draw_line_v(image, cx - 5, 3, size.y - 4, trim)
	_draw_line_v(image, cx + 4, 3, size.y - 4, trim)
	_draw_line_h(image, size.y - 3, cx - 4, cx + 3, trim)
	# Centre emblem: simple cross/diamond
	_draw_diamond(image, Vector2i(cx, cy), 2, highlight)
	_set_pixel_safe(image, cx, cy, _lighter(highlight, 0.3))
	# Top-left shine
	_set_pixel_safe(image, cx - 3, 3, highlight)
	_set_pixel_safe(image, cx - 3, 4, _lighter(body, 0.15))


func _draw_tower_shield(image: Image, size: Vector2i, body: Color, trim: Color, highlight: Color) -> void:
	var cx: int = size.x / 2
	var cy: int = size.y / 2
	# Tall rectangular shield
	# Top
	_draw_line_h(image, 0, cx - 5, cx + 4, trim)
	# Body
	for y in range(1, size.y - 1):
		_draw_line_h(image, y, cx - 5, cx + 4, body)
	# Bottom
	_draw_line_h(image, size.y - 1, cx - 5, cx + 4, trim)
	# Side borders
	_draw_line_v(image, cx - 5, 0, size.y - 1, trim)
	_draw_line_v(image, cx + 4, 0, size.y - 1, trim)
	# Horizontal divider
	_draw_line_h(image, cy, cx - 4, cx + 3, trim)
	# Central cross
	_draw_line_v(image, cx, 2, size.y - 3, _darker(trim, 0.1))
	_draw_line_h(image, cy, cx - 3, cx + 2, _darker(trim, 0.1))
	# Rivets in corners
	_set_pixel_safe(image, cx - 4, 1, highlight)
	_set_pixel_safe(image, cx + 3, 1, highlight)
	_set_pixel_safe(image, cx - 4, size.y - 2, highlight)
	_set_pixel_safe(image, cx + 3, size.y - 2, highlight)
	# Shine
	_set_pixel_safe(image, cx - 3, 2, _lighter(body, 0.2))
	_set_pixel_safe(image, cx - 3, 3, _lighter(body, 0.1))


## ── Fist ────────────────────────────────────────────────────────────────────

func _draw_fist(image: Image, size: Vector2i, wrap: Color, metal: Color) -> void:
	var cx: int = size.x / 2
	var cy: int = size.y / 2
	# Fist weapon / knuckle duster
	# Main bar across knuckles
	_draw_rect_filled(image, Rect2i(cx - 3, cy - 1, 6, 3), metal)
	# Finger holes (darker spots)
	_set_pixel_safe(image, cx - 2, cy, _darker(metal, 0.3))
	_set_pixel_safe(image, cx, cy, _darker(metal, 0.3))
	_set_pixel_safe(image, cx + 2, cy, _darker(metal, 0.3))
	# Spikes on top
	_set_pixel_safe(image, cx - 2, cy - 2, metal)
	_set_pixel_safe(image, cx, cy - 2, metal)
	_set_pixel_safe(image, cx + 2, cy - 2, metal)
	# Grip bar underneath
	_draw_rect_filled(image, Rect2i(cx - 2, cy + 2, 4, 1), wrap)
	# Highlights
	_draw_line_h(image, cy - 1, cx - 3, cx + 2, _lighter(metal, 0.2))


## ── Firearms ────────────────────────────────────────────────────────────────

func _draw_pistol(image: Image, size: Vector2i, barrel: Color, grip: Color, guard: Color) -> void:
	var cy: int = size.y / 2
	# Barrel: horizontal
	_draw_rect_filled(image, Rect2i(0, cy - 1, 8, 2), barrel)
	# Muzzle
	_set_pixel_safe(image, 0, cy - 1, _lighter(barrel, 0.2))
	_set_pixel_safe(image, 0, cy, _lighter(barrel, 0.2))
	# Flintlock mechanism
	_draw_rect_filled(image, Rect2i(6, cy - 2, 2, 2), guard)
	# Grip: angled down from body
	_draw_rect_filled(image, Rect2i(7, cy + 1, 2, 3), grip)
	_draw_rect_filled(image, Rect2i(8, cy + 4, 2, 1), grip)
	# Pommel
	_set_pixel_safe(image, 9, cy + 4, _darker(grip))
	# Trigger guard
	_set_pixel_safe(image, 6, cy + 1, guard)
	_set_pixel_safe(image, 5, cy + 2, guard)
	_set_pixel_safe(image, 6, cy + 2, guard)
	# Barrel highlight
	_draw_line_h(image, cy - 1, 1, 5, _lighter(barrel, 0.15))


func _draw_musket(image: Image, size: Vector2i, barrel: Color, stock: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Barrel: long vertical
	_draw_line_v(image, cx, 0, 12, barrel)
	_set_pixel_safe(image, cx, 0, _lighter(barrel, 0.2))
	# Barrel band
	_draw_line_h(image, 5, cx - 1, cx + 1, _darker(barrel, 0.1))
	# Mechanism
	_draw_rect_filled(image, Rect2i(cx - 1, 12, 3, 2), guard)
	# Stock
	_draw_rect_filled(image, Rect2i(cx - 1, 14, 2, 6), stock)
	_draw_rect_filled(image, Rect2i(cx - 1, 20, 2, 2), _darker(stock))
	# Butt plate
	_draw_line_h(image, size.y - 1, cx - 1, cx + 1, _darker(stock, 0.2))
	# Trigger
	_set_pixel_safe(image, cx + 1, 14, guard)
	_set_pixel_safe(image, cx + 1, 15, guard)
	# Barrel highlight
	_draw_line_v(image, cx, 1, 11, _lighter(barrel, 0.1))


func _draw_blunderbuss(image: Image, size: Vector2i, barrel: Color, stock: Color, guard: Color) -> void:
	var cx: int = size.x / 2
	# Flared barrel: widens at top
	_draw_rect_filled(image, Rect2i(cx - 2, 0, 5, 2), barrel)
	_draw_rect_filled(image, Rect2i(cx - 1, 2, 3, 3), barrel)
	_draw_line_v(image, cx, 5, 10, barrel)
	# Muzzle flare highlight
	_draw_line_h(image, 0, cx - 2, cx + 2, _lighter(barrel, 0.2))
	# Mechanism
	_draw_rect_filled(image, Rect2i(cx - 1, 10, 3, 2), guard)
	# Stock
	_draw_rect_filled(image, Rect2i(cx - 1, 12, 2, 6), stock)
	_draw_rect_filled(image, Rect2i(cx - 1, 18, 2, 2), _darker(stock))
	# Trigger
	_set_pixel_safe(image, cx + 1, 12, guard)
	# Barrel highlight
	_draw_line_v(image, cx, 2, 9, _lighter(barrel, 0.1))


## ── Scythe ──────────────────────────────────────────────────────────────────

func _draw_scythe(image: Image, size: Vector2i, blade: Color, highlight: Color, shaft: Color) -> void:
	var cx: int = size.x / 2
	# Long shaft
	_draw_line_v(image, cx, 5, size.y - 1, shaft)
	_set_pixel_safe(image, cx, size.y - 1, _darker(shaft))
	# Wrap near grip
	_set_pixel_safe(image, cx, size.y - 5, _darker(shaft, 0.15))
	_set_pixel_safe(image, cx, size.y - 7, _darker(shaft, 0.15))
	# Blade mount
	_draw_rect_filled(image, Rect2i(cx - 1, 4, 3, 2), _darker(blade, 0.2))
	# Curved blade sweeping to the right
	# Inner curve (spine)
	_set_pixel_safe(image, cx + 1, 3, blade)
	_set_pixel_safe(image, cx + 2, 3, blade)
	_set_pixel_safe(image, cx + 3, 3, blade)
	_set_pixel_safe(image, cx + 4, 4, blade)
	_set_pixel_safe(image, cx + 5, 5, blade)
	_set_pixel_safe(image, cx + 5, 6, blade)
	_set_pixel_safe(image, cx + 5, 7, blade)
	_set_pixel_safe(image, cx + 4, 8, blade)
	# Outer edge (sharp edge - with highlight)
	_set_pixel_safe(image, cx + 2, 2, highlight)
	_set_pixel_safe(image, cx + 3, 2, highlight)
	_set_pixel_safe(image, cx + 4, 2, blade)
	_set_pixel_safe(image, cx + 5, 3, highlight)
	_set_pixel_safe(image, cx + 6, 4, highlight)
	_set_pixel_safe(image, cx + 6, 5, highlight)
	_set_pixel_safe(image, cx + 6, 6, highlight)
	_set_pixel_safe(image, cx + 6, 7, blade)
	_set_pixel_safe(image, cx + 5, 8, blade)
	# Fill between inner and outer curves
	_set_pixel_safe(image, cx + 4, 3, blade)
	_set_pixel_safe(image, cx + 5, 4, blade)
	_set_pixel_safe(image, cx + 6, 5, blade)
	_set_pixel_safe(image, cx + 6, 6, blade)
	# Blade tip
	_set_pixel_safe(image, cx + 3, 9, blade)
	_set_pixel_safe(image, cx + 3, 8, highlight)
	# Top point
	_set_pixel_safe(image, cx, 3, blade)
	_set_pixel_safe(image, cx, 2, highlight)
	_set_pixel_safe(image, cx, 1, highlight)

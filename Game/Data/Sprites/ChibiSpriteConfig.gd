## ChibiSpriteConfig — Core proportions and modular body-part assembly data
## for chibi / super-deformed character sprites (Color Doodle Chibi style —
## hand-drawn, sketchy, colorful doodle art with exaggerated chibi proportions).
##
## All pixel positions are relative to a 64x64 canvas with origin at center (32, 32).
## Positive X = right, Positive Y = down (Godot 2D convention).
##
## Body-part render order (back-to-front):
##   arm_back → legs → body → head → arm_front → weapon → vfx
##
## Usage:
##   var head_rect = ChibiSpriteConfig.get_body_proportions()["head"]
##   var z_order   = ChibiSpriteConfig.get_layer_order()
##   var frames    = ChibiSpriteConfig.get_animation_frames()["idle"]
class_name ChibiSpriteConfig
extends RefCounted

# ════════════════════════════════════════════════════════════════════════════════
# 1. CANVAS CONSTANTS
# ════════════════════════════════════════════════════════════════════════════════

## Full sprite canvas dimensions.
const CANVAS_WIDTH: int = 64
const CANVAS_HEIGHT: int = 64

## Canvas center — the origin all offsets are relative to.
const ORIGIN := Vector2(32, 32)

## Chibi head-to-body ratio.  Head ≈ 50 % of total sprite height (doodle chibi).
const HEAD_HEIGHT_RATIO: float = 0.50

# ════════════════════════════════════════════════════════════════════════════════
# 2. BODY PROPORTIONS
# ════════════════════════════════════════════════════════════════════════════════

## Returns a dictionary of body-part rects and anchor positions.
## Each part has:
##   "size"     — Vector2 width × height of the part texture region (pixels)
##   "offset"   — Vector2 offset from canvas origin to part anchor (pixels)
##   "anchor"   — Vector2 local anchor inside the part texture (for rotation pivot)
static func get_body_proportions() -> Dictionary:
	return {
		# ── Head ───────────────────────────────────────────────────────────
		# 30 px tall ≈ 50 % of 64.  Extra big & round for doodle chibi.
		"head": {
			"size":   Vector2(34, 30),
			"offset": Vector2(0, -18),     # top-center of canvas
			"anchor": Vector2(17, 27),     # base of head (neck attach)
		},

		# ── Body / Torso ──────────────────────────────────────────────────
		# Short stubby torso — doodle chibi proportions.
		"body": {
			"size":   Vector2(18, 12),
			"offset": Vector2(0, 0),       # centered vertically on origin
			"anchor": Vector2(9, 0),       # top-center (neck joint)
		},

		# ── Front Arm ─────────────────────────────────────────────────────
		"arm_front": {
			"size":   Vector2(7, 12),
			"offset": Vector2(8, -1),      # right of body center
			"anchor": Vector2(3, 1),       # shoulder pivot
		},

		# ── Back Arm ──────────────────────────────────────────────────────
		"arm_back": {
			"size":   Vector2(7, 12),
			"offset": Vector2(-8, -1),     # left of body center
			"anchor": Vector2(3, 1),       # shoulder pivot
		},

		# ── Legs ──────────────────────────────────────────────────────────
		# Short stubby legs — doodle chibi proportions.
		"legs": {
			"size":   Vector2(16, 10),
			"offset": Vector2(0, 13),      # below body
			"anchor": Vector2(8, 0),       # hip joint center
		},

		# ── Weapon (default slot — replaced per weapon type) ──────────────
		"weapon": {
			"size":   Vector2(14, 22),
			"offset": Vector2(14, -6),     # extending from front arm
			"anchor": Vector2(3, 18),      # grip point near bottom
		},
	}


# ════════════════════════════════════════════════════════════════════════════════
# 2b. DOODLE OUTLINE CONFIGURATION
# ════════════════════════════════════════════════════════════════════════════════

## Doodle art style parameters for hand-drawn outline rendering.
## "thickness_base" — base outline width in pixels.
## "thickness_variance" — random per-segment thickness variation (±pixels).
## "wobble_amplitude" — max pixel offset for hand-drawn wobble effect.
## "wobble_frequency" — how often wobble direction changes per outline segment.
## "ink_colors" — available doodle ink/pen line colors.
## "sketch_marks_enabled" — whether to add decorative sketch marks (motion lines, blush, etc.).
static func get_doodle_style() -> Dictionary:
	return {
		"thickness_base": 2.5,
		"thickness_variance": 0.8,
		"wobble_amplitude": 1.2,
		"wobble_frequency": 0.3,
		"color_bleed_pixels": 0.5,
		"hatching_density": 0.4,
		"sketch_marks_enabled": true,
		"ink_colors": {
			"soft_black": Color("2d2d2d"),
			"warm_brown": Color("5c4033"),
			"dark_blue": Color("2b3a67"),
			"soft_gray": Color("7a7a7a"),
		},
		"fill_style": "hatched",  # "hatched", "cross_hatched", "scribble", "soft_fill"
		"expression_style": {
			"eye_type": "sparkle",  # "dot", "sparkle", "round"
			"blush_enabled": true,
			"blush_color": Color("ff9999"),
			"mouth_style": "simple_curve",
		},
	}


# ════════════════════════════════════════════════════════════════════════════════
# 3. PART LAYER / Z-ORDER
# ════════════════════════════════════════════════════════════════════════════════

## Render order values — lower draws first (further back).
static func get_layer_order() -> Dictionary:
	return {
		"shadow":    0,
		"arm_back":  10,
		"legs":      20,
		"body":      30,
		"head":      40,
		"arm_front": 50,
		"weapon":    60,
		"vfx":       70,
	}


# ════════════════════════════════════════════════════════════════════════════════
# 4. ANIMATION FRAME COUNTS
# ════════════════════════════════════════════════════════════════════════════════

## Each animation state maps to its frame count and default FPS.
## "loop" indicates whether the animation should repeat.
static func get_animation_frames() -> Dictionary:
	return {
		"idle": {
			"frames": 4,
			"fps": 6,
			"loop": true,
		},
		"walk": {
			"frames": 6,
			"fps": 10,
			"loop": true,
		},
		"attack_slash": {
			"frames": 6,
			"fps": 12,
			"loop": false,
		},
		"attack_thrust": {
			"frames": 5,
			"fps": 12,
			"loop": false,
		},
		"attack_smash": {
			"frames": 6,
			"fps": 10,
			"loop": false,
		},
		"attack_cast": {
			"frames": 5,
			"fps": 10,
			"loop": false,
		},
		"hit": {
			"frames": 3,
			"fps": 10,
			"loop": false,
		},
		"faint": {
			"frames": 4,
			"fps": 8,
			"loop": false,
		},
		"ready": {
			"frames": 4,
			"fps": 6,
			"loop": true,
		},
	}


# ════════════════════════════════════════════════════════════════════════════════
# 5. ARM PIVOT / SHOULDER POSITIONS
# ════════════════════════════════════════════════════════════════════════════════

## Shoulder pivot positions per body-type variant, relative to canvas origin.
## The arm sprite rotates around this point during attacks.
## "front" = right-side arm pivot, "back" = left-side arm pivot.
static func get_arm_pivots() -> Dictionary:
	return {
		# Default proportions (most races).
		"default": {
			"front": Vector2(9, -2),
			"back":  Vector2(-9, -2),
		},
		# Bulky / heavy-set races (Bear Man, Golem, etc.).
		"bulky": {
			"front": Vector2(11, -1),
			"back":  Vector2(-11, -1),
		},
		# Slim / lithe races (Bird Man, Snake Man, etc.).
		"slim": {
			"front": Vector2(8, -3),
			"back":  Vector2(-8, -3),
		},
		# Tiny races (Fairy, Mouse Man, etc.).
		"tiny": {
			"front": Vector2(7, -2),
			"back":  Vector2(-7, -2),
		},
	}


# ════════════════════════════════════════════════════════════════════════════════
# 6. WEAPON GRIP OFFSETS
# ════════════════════════════════════════════════════════════════════════════════

## Where the weapon texture anchors onto the front-arm sprite, per weapon group.
## "grip" — local offset on the arm sprite where the weapon handle sits.
## "weapon_anchor" — the point inside the weapon texture that aligns to the grip.
## "rest_rotation" — default rotation (degrees) when idle/ready (0 = pointing up).
static func get_weapon_grips() -> Dictionary:
	return {
		"sword": {
			"grip":           Vector2(4, 12),
			"weapon_anchor":  Vector2(3, 20),
			"rest_rotation":  -15.0,
			"weapon_size":    Vector2(12, 26),
		},
		"axe": {
			"grip":           Vector2(4, 12),
			"weapon_anchor":  Vector2(4, 22),
			"rest_rotation":  -20.0,
			"weapon_size":    Vector2(16, 26),
		},
		"spear": {
			"grip":           Vector2(4, 10),
			"weapon_anchor":  Vector2(3, 28),
			"rest_rotation":  -30.0,
			"weapon_size":    Vector2(8, 34),
		},
		"mace": {
			"grip":           Vector2(4, 12),
			"weapon_anchor":  Vector2(4, 22),
			"rest_rotation":  -15.0,
			"weapon_size":    Vector2(14, 26),
		},
		"bow": {
			"grip":           Vector2(4, 8),
			"weapon_anchor":  Vector2(8, 14),
			"rest_rotation":  0.0,
			"weapon_size":    Vector2(16, 28),
		},
		"staff": {
			"grip":           Vector2(4, 10),
			"weapon_anchor":  Vector2(4, 26),
			"rest_rotation":  -5.0,
			"weapon_size":    Vector2(10, 34),
		},
		"dagger": {
			"grip":           Vector2(4, 12),
			"weapon_anchor":  Vector2(3, 14),
			"rest_rotation":  -10.0,
			"weapon_size":    Vector2(8, 18),
		},
		"fist": {
			"grip":           Vector2(4, 12),
			"weapon_anchor":  Vector2(4, 6),
			"rest_rotation":  0.0,
			"weapon_size":    Vector2(10, 10),
		},
	}


# ════════════════════════════════════════════════════════════════════════════════
# 7. PER-FRAME ARM ROTATION DATA (attack animations)
# ════════════════════════════════════════════════════════════════════════════════

## Rotation values in degrees for the front arm at each frame of an attack.
## 0° = arm hanging straight down; negative = raised/behind; positive = forward/down.
## Back-arm typically stays near rest unless noted.
##
## Each entry is an Array of Dictionaries, one per frame:
##   { "front_deg": float, "back_deg": float, "weapon_extra_deg": float }
## weapon_extra_deg is added on top of the arm rotation for weapon-specific flair.

static func get_attack_arm_rotations() -> Dictionary:
	return {
		# ── SLASH ─────────────────────────────────────────────────────────
		# Wind-up from raised position, swing through forward arc, follow-through.
		# 6 frames: raise → peak → accelerate → contact → follow-through → recover
		"attack_slash": [
			{ "front_deg": -80.0, "back_deg":   5.0, "weapon_extra_deg":  10.0 },  # 0  wind-up
			{ "front_deg": -95.0, "back_deg":   0.0, "weapon_extra_deg":  15.0 },  # 1  peak raise
			{ "front_deg": -40.0, "back_deg":  -5.0, "weapon_extra_deg":   0.0 },  # 2  accelerate
			{ "front_deg":  20.0, "back_deg":  -5.0, "weapon_extra_deg": -10.0 },  # 3  contact
			{ "front_deg":  75.0, "back_deg":   0.0, "weapon_extra_deg": -20.0 },  # 4  follow-through
			{ "front_deg":  40.0, "back_deg":   5.0, "weapon_extra_deg":  -5.0 },  # 5  recover
		],

		# ── THRUST ────────────────────────────────────────────────────────
		# Pull back → hold → lunge forward → extend → retract.
		# 5 frames
		"attack_thrust": [
			{ "front_deg": -50.0, "back_deg":  10.0, "weapon_extra_deg":  -5.0 },  # 0  pull back
			{ "front_deg": -55.0, "back_deg":  10.0, "weapon_extra_deg":  -5.0 },  # 1  hold / brace
			{ "front_deg":  -5.0, "back_deg":   0.0, "weapon_extra_deg":   0.0 },  # 2  lunge
			{ "front_deg":  15.0, "back_deg":  -5.0, "weapon_extra_deg":   5.0 },  # 3  full extend
			{ "front_deg": -15.0, "back_deg":   5.0, "weapon_extra_deg":   0.0 },  # 4  retract
		],

		# ── SMASH ─────────────────────────────────────────────────────────
		# Raise high overhead → pause at peak → crash downward → impact → bounce.
		# 6 frames
		"attack_smash": [
			{ "front_deg": -60.0, "back_deg":  -20.0, "weapon_extra_deg":   0.0 },  # 0  lift
			{ "front_deg": -110.0, "back_deg": -40.0, "weapon_extra_deg":  10.0 },  # 1  overhead
			{ "front_deg": -115.0, "back_deg": -40.0, "weapon_extra_deg":  10.0 },  # 2  peak hold
			{ "front_deg": -20.0, "back_deg":   0.0, "weapon_extra_deg":  -5.0 },  # 3  crash down
			{ "front_deg":  50.0, "back_deg":  10.0, "weapon_extra_deg": -15.0 },  # 4  impact
			{ "front_deg":  25.0, "back_deg":   5.0, "weapon_extra_deg":  -5.0 },  # 5  bounce recover
		],

		# ── CAST ──────────────────────────────────────────────────────────
		# Raise arm → channel (hold) → release burst → lower.
		# 5 frames — both arms participate for channeling feel.
		"attack_cast": [
			{ "front_deg": -45.0, "back_deg": -30.0, "weapon_extra_deg":   0.0 },  # 0  raise
			{ "front_deg": -70.0, "back_deg": -55.0, "weapon_extra_deg":   5.0 },  # 1  channel high
			{ "front_deg": -75.0, "back_deg": -60.0, "weapon_extra_deg":   5.0 },  # 2  channel hold
			{ "front_deg": -30.0, "back_deg": -15.0, "weapon_extra_deg": -10.0 },  # 3  release
			{ "front_deg": -10.0, "back_deg":   0.0, "weapon_extra_deg":   0.0 },  # 4  lower / recover
		],
	}


# ════════════════════════════════════════════════════════════════════════════════
# 8. PER-FRAME BODY MOTION (optional squash/stretch & position offsets)
# ════════════════════════════════════════════════════════════════════════════════

## Subtle per-frame body offsets and scale tweaks to add weight to animations.
## "body_offset" — extra translation from base position (pixels).
## "body_scale"  — multiplicative scale Vector2 (1.0 = normal).
## "head_offset" — extra head bob / recoil (pixels).
static func get_body_motion() -> Dictionary:
	return {
		"idle": [
			{ "body_offset": Vector2(0, 0), "body_scale": Vector2(1.0, 1.0),   "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, -1), "body_scale": Vector2(1.0, 1.01), "head_offset": Vector2(0, -1) },
			{ "body_offset": Vector2(0, 0), "body_scale": Vector2(1.0, 1.0),   "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, 1), "body_scale": Vector2(1.0, 0.99),  "head_offset": Vector2(0, 1) },
		],
		"walk": [
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, -2), "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, -1) },
			{ "body_offset": Vector2(0, -1), "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, -2), "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, -1) },
			{ "body_offset": Vector2(0, -1), "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
		],
		"attack_slash": [
			{ "body_offset": Vector2(-2, 0), "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(-1, 0) },
			{ "body_offset": Vector2(-3, -1), "body_scale": Vector2(1.0, 1.02), "head_offset": Vector2(-1, -1) },
			{ "body_offset": Vector2(1, 0),  "body_scale": Vector2(1.02, 0.98), "head_offset": Vector2(1, 0) },
			{ "body_offset": Vector2(3, 1),  "body_scale": Vector2(1.03, 0.97), "head_offset": Vector2(2, 0) },
			{ "body_offset": Vector2(2, 0),  "body_scale": Vector2(1.01, 0.99), "head_offset": Vector2(1, 0) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
		],
		"attack_thrust": [
			{ "body_offset": Vector2(-3, 0), "body_scale": Vector2(0.98, 1.02), "head_offset": Vector2(-2, 0) },
			{ "body_offset": Vector2(-4, 0), "body_scale": Vector2(0.97, 1.02), "head_offset": Vector2(-2, 0) },
			{ "body_offset": Vector2(2, 0),  "body_scale": Vector2(1.04, 0.97), "head_offset": Vector2(1, 0) },
			{ "body_offset": Vector2(4, 0),  "body_scale": Vector2(1.05, 0.96), "head_offset": Vector2(2, 0) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
		],
		"attack_smash": [
			{ "body_offset": Vector2(0, 1),  "body_scale": Vector2(1.0, 0.98),  "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, -2), "body_scale": Vector2(0.98, 1.04), "head_offset": Vector2(0, -2) },
			{ "body_offset": Vector2(0, -3), "body_scale": Vector2(0.97, 1.05), "head_offset": Vector2(0, -2) },
			{ "body_offset": Vector2(0, 2),  "body_scale": Vector2(1.04, 0.96), "head_offset": Vector2(0, 1) },
			{ "body_offset": Vector2(0, 3),  "body_scale": Vector2(1.06, 0.94), "head_offset": Vector2(0, 2) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
		],
		"attack_cast": [
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, -1), "body_scale": Vector2(1.0, 1.02), "head_offset": Vector2(0, -1) },
			{ "body_offset": Vector2(0, -2), "body_scale": Vector2(0.99, 1.03), "head_offset": Vector2(0, -1) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.02, 0.98), "head_offset": Vector2(0, 1) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
		],
		"hit": [
			{ "body_offset": Vector2(-3, 0), "body_scale": Vector2(0.95, 1.04), "head_offset": Vector2(-2, -1) },
			{ "body_offset": Vector2(-5, 1), "body_scale": Vector2(0.93, 1.06), "head_offset": Vector2(-3, 0) },
			{ "body_offset": Vector2(-1, 0), "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
		],
		"faint": [
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(-2, 2), "body_scale": Vector2(1.02, 0.96), "head_offset": Vector2(-1, 1) },
			{ "body_offset": Vector2(-4, 5), "body_scale": Vector2(1.06, 0.90), "head_offset": Vector2(-2, 3) },
			{ "body_offset": Vector2(-5, 8), "body_scale": Vector2(1.10, 0.85), "head_offset": Vector2(-3, 5) },
		],
		"ready": [
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, -1), "body_scale": Vector2(1.01, 0.99), "head_offset": Vector2(0, -1) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),  "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, 1),  "body_scale": Vector2(0.99, 1.01), "head_offset": Vector2(0, 1) },
		],
	}


# ════════════════════════════════════════════════════════════════════════════════
# 9. COLOR PALETTE SYSTEM
# ════════════════════════════════════════════════════════════════════════════════

## Base skin tone palettes.  Each palette is an array of 4 colors
## ordered: shadow → mid-tone → base → highlight.
static func get_skin_palettes() -> Dictionary:
	return {
		"pale": [
			Color("b08a7a"),  # shadow — warm pink-toned
			Color("dbbfa0"),  # mid
			Color("f5e0c8"),  # base
			Color("fff8f0"),  # highlight
		],
		"light": [
			Color("8b6b4a"),
			Color("c49e6e"),
			Color("e8c496"),
			Color("fce4c8"),
		],
		"medium": [
			Color("6b4a30"),
			Color("a07040"),
			Color("c89660"),
			Color("e0b880"),
		],
		"tan": [
			Color("5a3a22"),
			Color("8a5c38"),
			Color("b07848"),
			Color("d09860"),
		],
		"brown": [
			Color("3e2816"),
			Color("6a4428"),
			Color("8c5e3c"),
			Color("a87850"),
		],
		"dark": [
			Color("2a1a10"),
			Color("4a3020"),
			Color("6a4830"),
			Color("886040"),
		],
		# Fantasy / non-human tones
		"green": [
			Color("2a4a20"),
			Color("4a7a30"),
			Color("6aaa48"),
			Color("90d068"),
		],
		"blue": [
			Color("203050"),
			Color("305880"),
			Color("4880b0"),
			Color("68a8d8"),
		],
		"grey": [
			Color("3a3a3a"),
			Color("606060"),
			Color("909090"),
			Color("b8b8b8"),
		],
		"red": [
			Color("4a1818"),
			Color("803030"),
			Color("b04848"),
			Color("d87070"),
		],
	}


## Armor tint slot definitions.  The shader replaces these indexed palette
## colours so equipment can recolour armour pieces without new textures.
## Each slot maps a name to a pair of source → default-replacement colors.
static func get_armor_tint_slots() -> Dictionary:
	return {
		"primary": {
			"source_shadow":    Color("404040"),
			"source_mid":       Color("808080"),
			"source_base":      Color("b0b0b0"),
			"source_highlight": Color("e0e0e0"),
			"default_shadow":    Color("2a3a6a"),
			"default_mid":       Color("3a5a9a"),
			"default_base":      Color("5080c0"),
			"default_highlight": Color("80b0e8"),
		},
		"secondary": {
			"source_shadow":    Color("404000"),
			"source_mid":       Color("808000"),
			"source_base":      Color("b0b000"),
			"source_highlight": Color("e0e000"),
			"default_shadow":    Color("6a3a2a"),
			"default_mid":       Color("9a5a3a"),
			"default_base":      Color("c08050"),
			"default_highlight": Color("e8b080"),
		},
		"accent": {
			"source_shadow":    Color("004040"),
			"source_mid":       Color("008080"),
			"source_base":      Color("00b0b0"),
			"source_highlight": Color("00e0e0"),
			"default_shadow":    Color("5a1a1a"),
			"default_mid":       Color("8a3030"),
			"default_base":      Color("b85050"),
			"default_highlight": Color("e08080"),
		},
	}


# ════════════════════════════════════════════════════════════════════════════════
# 10. HELPER / CONVENIENCE FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════════

## Convert a canvas-relative offset to absolute pixel position.
static func offset_to_position(offset: Vector2) -> Vector2:
	return ORIGIN + offset


## Get the absolute Rect2 for a given body part on the canvas.
static func get_part_rect(part_name: String) -> Rect2:
	var parts := get_body_proportions()
	if not parts.has(part_name):
		push_warning("ChibiSpriteConfig: unknown part '%s'" % part_name)
		return Rect2()
	var part: Dictionary = parts[part_name]
	var pos: Vector2 = offset_to_position(part["offset"]) - part["anchor"]
	return Rect2(pos, part["size"])


## Build a complete sorted render list for one frame.
## Returns an Array of { "part": String, "z": int } sorted by z ascending.
static func get_sorted_render_order() -> Array:
	var order := get_layer_order()
	var result: Array = []
	for part_name in order:
		result.append({ "part": part_name, "z": order[part_name] })
	result.sort_custom(func(a, b): return a["z"] < b["z"])
	return result


## Return arm rotation data for a specific attack and frame index.
## Returns { "front_deg", "back_deg", "weapon_extra_deg" } or null.
static func get_arm_rotation_at(attack_name: String, frame: int):
	var rotations := get_attack_arm_rotations()
	if not rotations.has(attack_name):
		return null
	var frames: Array = rotations[attack_name]
	if frame < 0 or frame >= frames.size():
		return null
	return frames[frame]


## Return body motion data for a specific animation and frame index.
## Returns { "body_offset", "body_scale", "head_offset" } or null.
static func get_body_motion_at(anim_name: String, frame: int):
	var motions := get_body_motion()
	if not motions.has(anim_name):
		return null
	var frames: Array = motions[anim_name]
	if frame < 0 or frame >= frames.size():
		return null
	return frames[frame]


## Resolve the weapon grip for a weapon type, falling back to "sword" defaults.
static func get_grip_for_weapon(weapon_type: String) -> Dictionary:
	var grips := get_weapon_grips()
	if grips.has(weapon_type):
		return grips[weapon_type]
	push_warning("ChibiSpriteConfig: unknown weapon type '%s', falling back to sword" % weapon_type)
	return grips["sword"]


## Map a race body-type tag to its arm pivot set.
## Accepted tags: "default", "bulky", "slim", "tiny".
static func get_pivots_for_body_type(body_type: String) -> Dictionary:
	var pivots := get_arm_pivots()
	if pivots.has(body_type):
		return pivots[body_type]
	return pivots["default"]

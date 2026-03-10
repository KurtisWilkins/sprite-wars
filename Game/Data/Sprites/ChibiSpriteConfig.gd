## ChibiSpriteConfig — Core proportions and modular body-part assembly data
## for chibi / super-deformed character sprites (Flat Cel-Shaded Chibi style —
## clean digital illustration, flat color zones, hard-edged shading with
## uniform black outlines and exaggerated chibi proportions).
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

## Chibi head-to-body ratio.  Head ≈ 50 % of total sprite height (cel-shaded chibi).
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
		# 30 px tall ≈ 50 % of 64.  Extra big & round for cel-shaded chibi.
		"head": {
			"size":   Vector2(34, 30),
			"offset": Vector2(0, -18),     # top-center of canvas
			"anchor": Vector2(17, 27),     # base of head (neck attach)
		},

		# ── Body / Torso ──────────────────────────────────────────────────
		# Short stubby torso — cel-shaded chibi proportions.
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
		# Short stubby legs — cel-shaded chibi proportions.
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
# 2b. CEL-SHADED OUTLINE & STYLE CONFIGURATION
# ════════════════════════════════════════════════════════════════════════════════

## Cel-shaded art style parameters for clean digital rendering.
## "outline_thickness" — uniform outline width in pixels (no variance).
## "outline_color" — single color for all outlines (pure black).
## "shadow_intensity" — how much darker the shadow zone is vs base (0.0–1.0).
## "highlight_intensity" — how much lighter the highlight zone is vs base (0.0–1.0).
## "shading_style" — shading method: "cel" for flat zones with hard edges.
## "eye_type" — character eye style: "dot" for small filled black circles.
## "blush_enabled" — whether to draw blush marks on cheeks.
static func get_cel_style() -> Dictionary:
	return {
		"outline_thickness": 2,
		"outline_color": Color(0, 0, 0, 1),
		"shadow_intensity": 0.25,
		"highlight_intensity": 0.2,
		"shading_style": "cel",  # "cel" — flat zones, hard edges, no gradients
		"fill_style": "flat",  # "flat" — solid color fills, no hatching or texture
		"expression_style": {
			"eye_type": "dot",  # "dot" — small filled black circle
			"blush_enabled": false,
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
			{ "body_offset": Vector2(0, 0), "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, -1), "body_scale": Vector2(1.0, 1.012),  "head_offset": Vector2(0, -2) },
			{ "body_offset": Vector2(0, 0), "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, 1), "body_scale": Vector2(1.0, 0.988),   "head_offset": Vector2(0, 2) },
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
			{ "body_offset": Vector2(-2, 0), "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(-1, 0) },
			{ "body_offset": Vector2(-3, -1), "body_scale": Vector2(1.0, 1.024),  "head_offset": Vector2(-1, -1) },
			{ "body_offset": Vector2(1, 0),  "body_scale": Vector2(1.024, 0.976), "head_offset": Vector2(1, 0) },
			{ "body_offset": Vector2(3, 1),  "body_scale": Vector2(1.036, 0.964), "head_offset": Vector2(2, 0) },
			{ "body_offset": Vector2(2, 0),  "body_scale": Vector2(1.012, 0.988), "head_offset": Vector2(1, 0) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
		],
		"attack_thrust": [
			{ "body_offset": Vector2(-3, 0), "body_scale": Vector2(0.976, 1.024), "head_offset": Vector2(-2, 0) },
			{ "body_offset": Vector2(-4, 0), "body_scale": Vector2(0.964, 1.024), "head_offset": Vector2(-2, 0) },
			{ "body_offset": Vector2(2, 0),  "body_scale": Vector2(1.048, 0.964), "head_offset": Vector2(1, 0) },
			{ "body_offset": Vector2(4, 0),  "body_scale": Vector2(1.060, 0.952), "head_offset": Vector2(2, 0) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
		],
		"attack_smash": [
			{ "body_offset": Vector2(0, 1),  "body_scale": Vector2(1.0, 0.976),   "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, -2), "body_scale": Vector2(0.976, 1.048), "head_offset": Vector2(0, -2) },
			{ "body_offset": Vector2(0, -3), "body_scale": Vector2(0.964, 1.060), "head_offset": Vector2(0, -2) },
			{ "body_offset": Vector2(0, 2),  "body_scale": Vector2(1.048, 0.952), "head_offset": Vector2(0, 1) },
			{ "body_offset": Vector2(0, 3),  "body_scale": Vector2(1.072, 0.928), "head_offset": Vector2(0, 2) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
		],
		"attack_cast": [
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, -1), "body_scale": Vector2(1.0, 1.024),   "head_offset": Vector2(0, -1) },
			{ "body_offset": Vector2(0, -2), "body_scale": Vector2(0.988, 1.036), "head_offset": Vector2(0, -1) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.024, 0.976), "head_offset": Vector2(0, 1) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
		],
		"hit": [
			{ "body_offset": Vector2(-3, 0), "body_scale": Vector2(0.940, 1.048), "head_offset": Vector2(-2, -1) },
			{ "body_offset": Vector2(-5, 1), "body_scale": Vector2(0.916, 1.072), "head_offset": Vector2(-3, 0) },
			{ "body_offset": Vector2(-1, 0), "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
		],
		"faint": [
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(-2, 2), "body_scale": Vector2(1.024, 0.952), "head_offset": Vector2(-1, 1) },
			{ "body_offset": Vector2(-4, 5), "body_scale": Vector2(1.072, 0.880), "head_offset": Vector2(-2, 3) },
			{ "body_offset": Vector2(-5, 8), "body_scale": Vector2(1.120, 0.820), "head_offset": Vector2(-3, 5) },
		],
		"ready": [
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, -1), "body_scale": Vector2(1.012, 0.988), "head_offset": Vector2(0, -1) },
			{ "body_offset": Vector2(0, 0),  "body_scale": Vector2(1.0, 1.0),     "head_offset": Vector2(0, 0) },
			{ "body_offset": Vector2(0, 1),  "body_scale": Vector2(0.988, 1.012), "head_offset": Vector2(0, 1) },
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
		# Fantasy / non-human tones — cel-shaded palette
		"green": [
			Color("5a8a60"),  # shadow — vibrant mint
			Color("80b888"),  # mid
			Color("a8ddb0"),  # base
			Color("d0f0d8"),  # highlight
		],
		"blue": [
			Color("5070a0"),  # shadow — vibrant sky blue
			Color("78a0c8"),  # mid
			Color("a0c8e8"),  # base
			Color("c8e4f8"),  # highlight
		],
		"grey": [
			Color("3a3a3a"),
			Color("606060"),
			Color("909090"),
			Color("b8b8b8"),
		],
		"red": [
			Color("a05858"),  # shadow — vibrant rosy
			Color("c88080"),  # mid
			Color("e8a8a8"),  # base
			Color("f8d0d0"),  # highlight
		],
		# Additional fantasy palettes
		"lavender": [
			Color("7868a0"),  # shadow
			Color("a090c8"),  # mid
			Color("c8b8e8"),  # base
			Color("e8e0f8"),  # highlight
		],
		"peach": [
			Color("b08060"),  # shadow
			Color("d8a880"),  # mid
			Color("f0c8a0"),  # base
			Color("f8e8d8"),  # highlight
		],
		"mint": [
			Color("50a090"),  # shadow
			Color("78c8b8"),  # mid
			Color("a8e8d8"),  # base
			Color("d0f8f0"),  # highlight
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


# ════════════════════════════════════════════════════════════════════════════════
# 11. RACE COLOR PALETTES
# ════════════════════════════════════════════════════════════════════════════════

## Element-based skin tone base colors (14 elements).
const ELEMENT_SKIN_TONES: Dictionary = {
	"Fire":     Color("e8a060"),
	"Water":    Color("88b8d8"),
	"Plant":    Color("8bc878"),
	"Ice":      Color("c0d8e8"),
	"Wind":     Color("d0d8c0"),
	"Earth":    Color("c8a878"),
	"Electric": Color("e8d860"),
	"Dark":     Color("8868a8"),
	"Light":    Color("f0e8c0"),
	"Fairy":    Color("d088c8"),
	"Solar":    Color("e8c888"),
	"Lunar":    Color("b8c0d8"),
	"Metal":    Color("b8b8c0"),
	"Poison":   Color("a088c0"),
}

## Race IDs that override element-based skin tones with fixed colors.
## Key = race_id, Value = Dictionary with override fields.
const RACE_SKIN_OVERRIDES: Dictionary = {
	# Ent (race 8) — bark brown tree creature
	8: {
		"skin": Color("8b6840"),
		"skin_shadow": Color("5c4428"),
		"skin_highlight": Color("b89060"),
		"accent": Color("5a8848"),
	},
	# Ghost (race 10) — pale translucent regardless of element
	10: {
		"skin": Color("c8c8e8"),
		"skin_shadow": Color("9898b8"),
		"skin_highlight": Color("e8e8ff"),
		"accent": Color("8888cc"),
	},
	# Golem (race 11) — stone grey
	11: {
		"skin": Color("989088"),
		"skin_shadow": Color("686058"),
		"skin_highlight": Color("c0b8b0"),
		"accent": Color("b8a878"),
	},
	# Robot (race 19) — metallic grey-blue
	19: {
		"skin": Color("a0a8b8"),
		"skin_shadow": Color("707888"),
		"skin_highlight": Color("c8d0e0"),
		"accent": Color("60d0e0"),
	},
	# Skeleton (race 21) — bone white
	21: {
		"skin": Color("e8e0d0"),
		"skin_shadow": Color("c8c0b0"),
		"skin_highlight": Color("f8f0e8"),
		"accent": Color("d8d0c0"),
	},
}

## Default race accent, hair, and eye colors keyed by race_id.
## Default race accent, hair, and eye colors keyed by race_id (1-24).
## 1=Bug Man, 2=Bear Man, 3=Bird Man, 4=Demon, 5=Devil, 6=Cat Man,
## 7=Elf, 8=Ent, 9=Fish Man, 10=Ghost, 11=Golem, 12=Human,
## 13=Lizard Man, 14=Minotaur, 15=Monkey Man, 16=Mummy, 17=Ork,
## 18=Rat Man, 19=Robot, 20=Shark Man, 21=Skeleton, 22=Turtle Man,
## 23=Wolf Man, 24=Zombie
const RACE_FEATURE_COLORS: Dictionary = {
	1:  { "hair": Color("483828"), "eye": Color("282828"), "accent": Color("c89858") },  # Bug Man
	2:  { "hair": Color("e8c848"), "eye": Color("3868b0"), "accent": Color("e8a830") },  # Bear Man
	3:  { "hair": Color("c83030"), "eye": Color("c82020"), "accent": Color("e85040") },  # Bird Man
	4:  { "hair": Color("2898d8"), "eye": Color("2070b0"), "accent": Color("50b0e8") },  # Demon
	5:  { "hair": Color("40a858"), "eye": Color("308838"), "accent": Color("68c870") },  # Devil
	6:  { "hair": Color("b0b0d8"), "eye": Color("c060c0"), "accent": Color("8888cc") },  # Cat Man
	7:  { "hair": Color("f0d070"), "eye": Color("e8a020"), "accent": Color("f0c030") },  # Elf
	8:  { "hair": Color("584068"), "eye": Color("a040a0"), "accent": Color("9060a8") },  # Ent
	9:  { "hair": Color("808890"), "eye": Color("40d0f0"), "accent": Color("60d0e0") },  # Fish Man
	10: { "hair": Color("f8a8c0"), "eye": Color("e060a0"), "accent": Color("f088b8") },  # Ghost
	11: { "hair": Color("d8a050"), "eye": Color("d89030"), "accent": Color("e8b840") },  # Golem
	12: { "hair": Color("c0c8d8"), "eye": Color("6888b0"), "accent": Color("a0b0c8") },  # Human
	13: { "hair": Color("5a8848"), "eye": Color("a0c040"), "accent": Color("5a8848") },  # Lizard Man
	14: { "hair": Color("e87830"), "eye": Color("f06020"), "accent": Color("f09040") },  # Minotaur
	15: { "hair": Color("686058"), "eye": Color("e8c040"), "accent": Color("b8a878") },  # Monkey Man
	16: { "hair": Color("282838"), "eye": Color("e03030"), "accent": Color("a02020") },  # Mummy
	17: { "hair": Color("f0e0a0"), "eye": Color("50a0f0"), "accent": Color("f0d860") },  # Ork
	18: { "hair": Color("98d0f0"), "eye": Color("3888c8"), "accent": Color("70b8e8") },  # Rat Man
	19: { "hair": Color("60b880"), "eye": Color("f0f0f0"), "accent": Color("40b880") },  # Robot
	20: { "hair": Color("d0a870"), "eye": Color("885020"), "accent": Color("c89050") },  # Shark Man
	21: { "hair": Color("e8d888"), "eye": Color("d8a830"), "accent": Color("f0c848") },  # Skeleton
	22: { "hair": Color("88a0b8"), "eye": Color("5078a0"), "accent": Color("7090b0") },  # Turtle Man
	23: { "hair": Color("a868c0"), "eye": Color("8040a0"), "accent": Color("b878d0") },  # Wolf Man
	24: { "hair": Color("38a0a0"), "eye": Color("20b0a0"), "accent": Color("50c8b8") },  # Zombie
}

## Returns a race-specific color palette based on race_id and element.
static func get_race_palette(race_id: int, element: String) -> Dictionary:
	var base_skin: Color
	if ELEMENT_SKIN_TONES.has(element):
		base_skin = ELEMENT_SKIN_TONES[element]
	else:
		base_skin = Color("c8a878")

	var skin := base_skin
	var skin_shadow := base_skin.darkened(0.25)
	var skin_highlight := base_skin.lightened(0.20)

	var features: Dictionary
	if RACE_FEATURE_COLORS.has(race_id):
		features = RACE_FEATURE_COLORS[race_id]
	else:
		features = { "hair": Color("483828"), "eye": Color("282828"), "accent": Color("c89858") }

	var accent: Color = features["accent"]

	if RACE_SKIN_OVERRIDES.has(race_id):
		var overrides: Dictionary = RACE_SKIN_OVERRIDES[race_id]
		skin = overrides["skin"]
		skin_shadow = overrides["skin_shadow"]
		skin_highlight = overrides["skin_highlight"]
		accent = overrides["accent"]

	return {
		"skin": skin,
		"skin_shadow": skin_shadow,
		"skin_highlight": skin_highlight,
		"hair": features["hair"],
		"eye": features["eye"],
		"accent": accent,
		"outline": Color("111111"),
	}


# ════════════════════════════════════════════════════════════════════════════════
# 12. EVOLUTION VISUAL MODIFIERS
# ════════════════════════════════════════════════════════════════════════════════

## Returns visual modifiers for a given evolution stage (0, 1, or 2).
static func get_evolution_modifiers(stage: int) -> Dictionary:
	var clamped := clampi(stage, 0, 2)
	var scale_values := [1.0, 1.05, 1.1]
	var particle_values := [0, 2, 4]
	return {
		"scale_multiplier": scale_values[clamped],
		"outline_thickness": 2,
		"has_element_marks": clamped >= 1,
		"has_aura": clamped >= 2,
		"has_crown": clamped >= 2,
		"particle_count": particle_values[clamped],
	}


# ════════════════════════════════════════════════════════════════════════════════
# 13. TRAINER APPEARANCE DATA
# ════════════════════════════════════════════════════════════════════════════════

## Returns outfit colors and accessory data for a trainer class.
static func get_trainer_appearance(trainer_class: String) -> Dictionary:
	var trainers := {
		"bug_catcher": {
			"outfit_color": Color("68a850"),
			"accent_color": Color("c8d048"),
			"hat_style": "cap",
			"hat_color": Color("e8e0a0"),
			"hair_color": Color("885830"),
			"shoe_color": Color("604828"),
			"accessory": "net",
		},
		"javelin": {
			"outfit_color": Color("c85040"),
			"accent_color": Color("e8c840"),
			"hat_style": "headband",
			"hat_color": Color("c83030"),
			"hair_color": Color("282828"),
			"shoe_color": Color("503828"),
			"accessory": "javelin",
		},
		"youngster": {
			"outfit_color": Color("5080c0"),
			"accent_color": Color("e8e8e8"),
			"hat_style": "cap_backwards",
			"hat_color": Color("3868a8"),
			"hair_color": Color("b08840"),
			"shoe_color": Color("e04030"),
			"accessory": "none",
		},
		"lass": {
			"outfit_color": Color("e888a8"),
			"accent_color": Color("f0c8d0"),
			"hat_style": "none",
			"hat_color": Color("000000"),
			"hair_color": Color("d8a040"),
			"shoe_color": Color("d06888"),
			"accessory": "bow_ribbon",
		},
		"hiker": {
			"outfit_color": Color("8b6840"),
			"accent_color": Color("d8c090"),
			"hat_style": "wide_brim",
			"hat_color": Color("705028"),
			"hair_color": Color("483020"),
			"shoe_color": Color("584028"),
			"accessory": "backpack",
		},
		"mystic": {
			"outfit_color": Color("6848a8"),
			"accent_color": Color("c8a8f0"),
			"hat_style": "hood",
			"hat_color": Color("503888"),
			"hair_color": Color("c0b8d0"),
			"shoe_color": Color("403060"),
			"accessory": "crystal_pendant",
		},
	}
	if trainers.has(trainer_class):
		return trainers[trainer_class]
	return trainers["youngster"]


# ════════════════════════════════════════════════════════════════════════════════
# 14. PLAYER APPEARANCE
# ════════════════════════════════════════════════════════════════════════════════

## Returns the player character's visual config (young adventurer).
static func get_player_appearance() -> Dictionary:
	return {
		"outfit_color": Color("d03030"),
		"accent_color": Color("e8e8e8"),
		"hat_style": "none",
		"hat_color": Color("000000"),
		"hair_color": Color("302828"),
		"shoe_color": Color("404040"),
		"accessory": "backpack",
		"pants_color": Color("3858a0"),
		"jacket_color": Color("d03030"),
		"backpack_color": Color("c87830"),
		"skin_color": Color("f0c898"),
	}

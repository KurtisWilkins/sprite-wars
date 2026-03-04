## WeaponThemeData — Maps Sprite races to weapon theme sprite sheets and
## defines extraction coordinates for equipment overlays.
## Mirrors Web/js/data/WeaponThemeData.js for the Godot engine.
class_name WeaponThemeData
extends RefCounted


## ── Theme Sheet Cell Dimensions ────────────────────────────────────────────

const THEME_CELL_W: int = 48
const THEME_CELL_H: int = 48


## ── Equipment Icon Extraction from Left Column ────────────────────────────
## Each row in the left column contains 3 tier variants (light/medium/heavy).
## Keys: row, tiers, cellW, cellH, offsetX, offsetY

static func get_equipment_rows() -> Dictionary:
	return {
		"helmet":      {"row": 0,  "tiers": 3, "cellW": 32, "cellH": 32, "offsetX": 8,  "offsetY": 4},
		"shoulderpad": {"row": 1,  "tiers": 3, "cellW": 32, "cellH": 24, "offsetX": 8,  "offsetY": 36},
		"eyes":        {"row": 2,  "tiers": 4, "cellW": 16, "cellH": 10, "offsetX": 12, "offsetY": 64},
		"ears":        {"row": 3,  "tiers": 4, "cellW": 16, "cellH": 12, "offsetX": 12, "offsetY": 80},
		"faceguard":   {"row": 4,  "tiers": 4, "cellW": 24, "cellH": 20, "offsetX": 8,  "offsetY": 96},
		"boots":       {"row": 5,  "tiers": 4, "cellW": 20, "cellH": 12, "offsetX": 10, "offsetY": 120},
		"gloves":      {"row": 6,  "tiers": 3, "cellW": 16, "cellH": 12, "offsetX": 12, "offsetY": 140},
		"chestplate":  {"row": 7,  "tiers": 3, "cellW": 32, "cellH": 28, "offsetX": 8,  "offsetY": 156},
		"sword":       {"row": 8,  "tiers": 3, "cellW": 16, "cellH": 40, "offsetX": 16, "offsetY": 192},
		"axe":         {"row": 9,  "tiers": 3, "cellW": 20, "cellH": 40, "offsetX": 14, "offsetY": 240},
		"staff":       {"row": 10, "tiers": 3, "cellW": 12, "cellH": 44, "offsetX": 18, "offsetY": 288},
		"spear":       {"row": 11, "tiers": 3, "cellW": 12, "cellH": 48, "offsetX": 18, "offsetY": 340},
		"crossbow":    {"row": 12, "tiers": 2, "cellW": 28, "cellH": 20, "offsetX": 10, "offsetY": 396},
		"shield":      {"row": 13, "tiers": 2, "cellW": 24, "cellH": 28, "offsetX": 12, "offsetY": 424},
	}


## ── Animated Character Sprite Regions ──────────────────────────────────────

const ANIM_START_X: int = 110
const ANIM_START_Y: int = 160
const ANIM_FRAME_W: int = 48
const ANIM_FRAME_H: int = 48
const FRAMES_PER_DIR: int = 9
const DIRECTIONS: int = 4
const ARMOR_ROWS: int = 2


## ── Race-to-Theme Mapping ──────────────────────────────────────────────────
## Maps each race_id to a weapon theme and default weapon type.

static func get_race_theme_map() -> Dictionary:
	return {
		1:  {"theme": "Fire Theme",           "weapon": "sword",    "armor": "heavy"},
		2:  {"theme": "Water Theme",          "weapon": "shield",   "armor": "heavy"},
		3:  {"theme": "Forest Theme",         "weapon": "crossbow", "armor": "medium"},
		4:  {"theme": "Water Theme",          "weapon": "sword",    "armor": "light"},
		5:  {"theme": "Fairy Theme",          "weapon": "crossbow", "armor": "light"},
		6:  {"theme": "Rock Theme",           "weapon": "axe",      "armor": "heavy"},
		7:  {"theme": "Electric Theme",       "weapon": "staff",    "armor": "medium"},
		8:  {"theme": "Demon Theme",          "weapon": "sword",    "armor": "light"},
		9:  {"theme": "Golden Angel Theme",   "weapon": "staff",    "armor": "medium"},
		10: {"theme": "Fairy Theme",          "weapon": "staff",    "armor": "medium"},
		11: {"theme": "Lunar Theme",          "weapon": "staff",    "armor": "medium"},
		12: {"theme": "Demon Theme",          "weapon": "axe",      "armor": "heavy"},
		13: {"theme": "English Knight Theme", "weapon": "sword",    "armor": "heavy"},
		14: {"theme": "Bug Theme",            "weapon": "crossbow", "armor": "medium"},
		15: {"theme": "Fire Theme",           "weapon": "shield",   "armor": "heavy"},
		16: {"theme": "Water Theme",          "weapon": "crossbow", "armor": "medium"},
		17: {"theme": "Electric Theme",       "weapon": "staff",    "armor": "medium"},
		18: {"theme": "Bug Theme",            "weapon": "spear",    "armor": "medium"},
		19: {"theme": "Demon Theme",          "weapon": "spear",    "armor": "medium"},
		20: {"theme": "Fairy Theme",          "weapon": "staff",    "armor": "medium"},
		21: {"theme": "TeutonicTheme",        "weapon": "axe",      "armor": "heavy"},
		22: {"theme": "Forest Theme",         "weapon": "staff",    "armor": "medium"},
		23: {"theme": "Golden Angel Theme",   "weapon": "shield",   "armor": "heavy"},
		24: {"theme": "Lunar Theme",          "weapon": "staff",    "armor": "medium"},
	}


## ── Class-to-Weapon Defaults ───────────────────────────────────────────────

static func get_class_weapon_map() -> Dictionary:
	return {
		"Barbarian": "axe",
		"Paladin":  "shield",
		"Javelin":    "crossbow",
		"Assassin":  "sword",
		"Archer":    "crossbow",
		"Fighter":    "sword",
		"Wizard":    "staff",
		"Cleric":    "staff",
		"Alchemist":  "staff",
		"Spearman":  "spear",
	}


## ── Armor Tier by Evolution Stage ──────────────────────────────────────────

static func get_armor_tier(stage: int) -> int:
	match stage:
		1: return 0  # Light / base
		2: return 1  # Medium / upgraded
		3: return 2  # Heavy / final
		_: return 0


## ── Theme File Paths ───────────────────────────────────────────────────────

static func get_theme_paths() -> Dictionary:
	return {
		"Fire Theme":           "res://Sprites/Weapons/Fire Theme.png",
		"Water Theme":          "res://Sprites/Weapons/Water Theme.png",
		"Forest Theme":         "res://Sprites/Weapons/Forest Theme.png",
		"Rock Theme":           "res://Sprites/Weapons/Rock Theme.png",
		"Electric Theme":       "res://Sprites/Weapons/Electric Theme.png",
		"Demon Theme":          "res://Sprites/Weapons/Demon Theme.png",
		"Golden Angel Theme":   "res://Sprites/Weapons/Golden Angel Theme.png",
		"Fairy Theme":          "res://Sprites/Weapons/Fairy Theme.png",
		"Lunar Theme":          "res://Sprites/Weapons/Lunar Theme.png",
		"Bug Theme":            "res://Sprites/Weapons/Bug Theme.png",
		"English Knight Theme": "res://Sprites/Weapons/English Knight Theme.png",
		"TeutonicTheme":        "res://Sprites/Weapons/TeutonicTheme.png",
		"Aztec Theme":          "res://Sprites/Weapons/Aztec Theme.png",
		"Bone Theme":           "res://Sprites/Weapons/Bone Theme.png",
		"Colonial Theme":       "res://Sprites/Weapons/Colonial Theme.png",
		"Desert Theme":         "res://Sprites/Weapons/Desert Theme.png",
		"Dragon Theme":         "res://Sprites/Weapons/Dragon Theme.png",
		"Fish People Theme":    "res://Sprites/Weapons/Fish People Theme.png",
		"French Knight Theme":  "res://Sprites/Weapons/French Knight Theme.png",
		"Jester Theme":         "res://Sprites/Weapons/Jester Theme.png",
		"Ork Theme":            "res://Sprites/Weapons/Ork Theme.png",
		"Peasant 1 Theme":      "res://Sprites/Weapons/Peasant 1 Theme.png",
		"Peasant 2 Theme":      "res://Sprites/Weapons/Peasant 2 Theme.png",
		"Pirate Theme":         "res://Sprites/Weapons/Pirate Theme.png",
		"Roman Theme":          "res://Sprites/Weapons/Roman Theme.png",
		"Samurai Theme":        "res://Sprites/Weapons/Samurai Theme.png",
		"SewerPeopleTheme":     "res://Sprites/Weapons/SewerPeopleTheme.png",
		"Wolf Theme":           "res://Sprites/Weapons/Wolf Theme.png",
	}


## ── Utility ────────────────────────────────────────────────────────────────

## Get the theme configuration for a given race and evolution stage.
static func get_theme_for_race(race_id: int, stage: int = 1) -> Dictionary:
	var race_map: Dictionary = get_race_theme_map()
	var race_theme: Dictionary = race_map.get(race_id, race_map.get(1, {}))
	var theme_paths: Dictionary = get_theme_paths()
	var theme_path: String = str(theme_paths.get(race_theme.get("theme", "Fire Theme"), ""))
	var armor_tier: int = get_armor_tier(stage)
	return {
		"theme_path": theme_path,
		"weapon": str(race_theme.get("weapon", "sword")),
		"armor_tier": armor_tier,
		"theme_name": str(race_theme.get("theme", "Fire Theme")),
	}

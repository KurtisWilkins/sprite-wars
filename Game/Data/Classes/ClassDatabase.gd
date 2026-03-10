## ClassDatabase — Static database of all 16 combat class definitions.
## Defines class archetypes that determine a Sprite's role, stat growth
## tendencies, and available weapon types in battle.
##
## Design notes:
##   - role_type categories: "melee", "ranged", "support", "hybrid"
##   - stat_weights use a 1-5 scale: 1 = very low, 2 = low, 3 = moderate,
##     4 = high, 5 = very high
##   - Stats tracked: hp, atk, def, spd, sp_atk, sp_def
##   - Each class has 3 available weapon types that it can equip
##   - 16 classes total: 8 melee, 4 ranged, 3 support, 1 hybrid
class_name ClassDatabase
extends RefCounted


## Return all 16 class data dictionaries keyed by class_id.
static func get_all_classes() -> Dictionary:
	return {
		# ──────────────────────────────────────────────────────────────────
		# MELEE CLASSES (8)
		# ──────────────────────────────────────────────────────────────────

		# 1 — Barbarian
		1: {
			"class_id": 1,
			"class_name": "Barbarian",
			"description": "Aggressive melee fighter focused on raw damage output and berserker-style abilities.",
			"role_type": "melee",
			"stat_weights": {"hp": 4, "atk": 5, "def": 2, "spd": 3, "sp_atk": 1, "sp_def": 1},
			"available_weapon_types": ["axe", "mace", "greatsword"],
		},

		# 2 — Fighter
		2: {
			"class_id": 2,
			"class_name": "Fighter",
			"description": "Balanced melee combatant with solid offense, defense, and tactical versatility.",
			"role_type": "melee",
			"stat_weights": {"hp": 3, "atk": 4, "def": 4, "spd": 3, "sp_atk": 2, "sp_def": 2},
			"available_weapon_types": ["sword", "shield", "axe"],
		},

		# 4 — Spearman
		4: {
			"class_id": 4,
			"class_name": "Spearman",
			"description": "Melee fighter with extended reach and formation-based combat bonuses.",
			"role_type": "melee",
			"stat_weights": {"hp": 3, "atk": 4, "def": 4, "spd": 3, "sp_atk": 1, "sp_def": 2},
			"available_weapon_types": ["spear", "halberd", "lance"],
		},

		# 5 — Heavy
		5: {
			"class_id": 5,
			"class_name": "Heavy",
			"description": "High-mass tank designed to absorb damage, block movement, and control space.",
			"role_type": "melee",
			"stat_weights": {"hp": 5, "atk": 2, "def": 5, "spd": 1, "sp_atk": 1, "sp_def": 3},
			"available_weapon_types": ["tower_shield", "warhammer", "flail"],
		},

		# 11 — Assassin
		11: {
			"class_id": 11,
			"class_name": "Assassin",
			"description": "High-damage stealth-based melee class focused on critical strikes and target elimination.",
			"role_type": "melee",
			"stat_weights": {"hp": 2, "atk": 5, "def": 1, "spd": 5, "sp_atk": 1, "sp_def": 1},
			"available_weapon_types": ["dagger", "shortsword", "poison_blade"],
		},

		# 12 — Monk
		12: {
			"class_id": 12,
			"class_name": "Monk",
			"description": "Agile melee fighter focused on speed, evasion, and rapid multi-hit attacks.",
			"role_type": "melee",
			"stat_weights": {"hp": 3, "atk": 4, "def": 2, "spd": 5, "sp_atk": 1, "sp_def": 2},
			"available_weapon_types": ["fist", "bo_staff", "nunchaku"],
		},

		# 15 — Siegebreaker
		15: {
			"class_id": 15,
			"class_name": "Siegebreaker",
			"description": "Heavy melee class designed to break through defensive lines with massive knockback.",
			"role_type": "melee",
			"stat_weights": {"hp": 5, "atk": 5, "def": 3, "spd": 1, "sp_atk": 1, "sp_def": 2},
			"available_weapon_types": ["battering_ram", "maul", "siege_hammer"],
		},

		# 16 — Paladin
		16: {
			"class_id": 16,
			"class_name": "Paladin",
			"description": "Tanky melee fighter with defensive support abilities, auras, and holy damage.",
			"role_type": "melee",
			"stat_weights": {"hp": 4, "atk": 3, "def": 5, "spd": 2, "sp_atk": 2, "sp_def": 4},
			"available_weapon_types": ["longsword", "shield", "holy_mace"],
		},

		# ──────────────────────────────────────────────────────────────────
		# RANGED CLASSES (4)
		# ──────────────────────────────────────────────────────────────────

		# 3 — Archer
		3: {
			"class_id": 3,
			"class_name": "Archer",
			"description": "Ranged attacker using bow-based projectiles with precision and area control.",
			"role_type": "ranged",
			"stat_weights": {"hp": 2, "atk": 4, "def": 2, "spd": 5, "sp_atk": 2, "sp_def": 2},
			"available_weapon_types": ["bow", "shortbow", "longbow"],
		},

		# 6 — Wizard
		6: {
			"class_id": 6,
			"class_name": "Wizard",
			"description": "Ranged magical attacker with powerful elemental abilities and utility spells.",
			"role_type": "ranged",
			"stat_weights": {"hp": 2, "atk": 1, "def": 2, "spd": 3, "sp_atk": 5, "sp_def": 5},
			"available_weapon_types": ["staff", "wand", "orb"],
		},

		# 13 — Crossbow
		13: {
			"class_id": 13,
			"class_name": "Crossbow",
			"description": "Ranged attacker with high single-target damage and armor-piercing bolts. Two-handed weapon class.",
			"role_type": "ranged",
			"stat_weights": {"hp": 2, "atk": 5, "def": 2, "spd": 3, "sp_atk": 1, "sp_def": 2},
			"available_weapon_types": ["crossbow", "heavy_crossbow", "repeater"],
		},

		# 14 — Handgunner
		14: {
			"class_id": 14,
			"class_name": "Handgunner",
			"description": "Ranged attacker using early firearms with burst damage and crowd control.",
			"role_type": "ranged",
			"stat_weights": {"hp": 2, "atk": 5, "def": 2, "spd": 3, "sp_atk": 2, "sp_def": 2},
			"available_weapon_types": ["pistol", "musket", "blunderbuss"],
		},

		# ──────────────────────────────────────────────────────────────────
		# SUPPORT CLASSES (3)
		# ──────────────────────────────────────────────────────────────────

		# 8 — Alchemist
		8: {
			"class_id": 8,
			"class_name": "Alchemist",
			"description": "Support class focused on buffs, debuffs, healing over time, and status effects.",
			"role_type": "support",
			"stat_weights": {"hp": 3, "atk": 1, "def": 2, "spd": 3, "sp_atk": 4, "sp_def": 4},
			"available_weapon_types": ["flask", "mortar", "tome"],
		},

		# 9 — Cleric
		9: {
			"class_id": 9,
			"class_name": "Cleric",
			"description": "Primary healer and support class with purification and resurrection abilities.",
			"role_type": "support",
			"stat_weights": {"hp": 4, "atk": 1, "def": 3, "spd": 2, "sp_atk": 4, "sp_def": 4},
			"available_weapon_types": ["mace", "holy_symbol", "staff"],
		},

		# 10 — Ambrosian
		10: {
			"class_id": 10,
			"class_name": "Ambrosian",
			"description": "Specialized support class with unique soul-linking, shielding, and revival mechanics.",
			"role_type": "support",
			"stat_weights": {"hp": 4, "atk": 1, "def": 3, "spd": 2, "sp_atk": 3, "sp_def": 5},
			"available_weapon_types": ["relic", "chalice", "scepter"],
		},

		# ──────────────────────────────────────────────────────────────────
		# HYBRID CLASSES (1)
		# ──────────────────────────────────────────────────────────────────

		# 7 — Javelin
		7: {
			"class_id": 7,
			"class_name": "Javelin",
			"description": "Ranged/melee hybrid using thrown weapons; versatile at any distance.",
			"role_type": "hybrid",
			"stat_weights": {"hp": 3, "atk": 4, "def": 3, "spd": 4, "sp_atk": 1, "sp_def": 2},
			"available_weapon_types": ["javelin", "throwing_spear", "pilum"],
		},
	}


## Return a single class dictionary by class_id, or an empty dictionary if not found.
static func get_class(class_id: int) -> Dictionary:
	var all_classes := get_all_classes()
	return all_classes.get(class_id, {})


## Return all class IDs that match the given role_type ("melee", "ranged", "support", "hybrid").
static func get_classes_by_role(role_type: String) -> Array[int]:
	var result: Array[int] = []
	var all_classes := get_all_classes()
	for class_id: int in all_classes:
		var cls: Dictionary = all_classes[class_id]
		if cls.get("role_type", "") == role_type:
			result.append(class_id)
	return result


## Return all class IDs that can equip the given weapon type.
static func get_classes_by_weapon(weapon_type: String) -> Array[int]:
	var result: Array[int] = []
	var all_classes := get_all_classes()
	for class_id: int in all_classes:
		var cls: Dictionary = all_classes[class_id]
		if weapon_type in cls.get("available_weapon_types", []):
			result.append(class_id)
	return result


## Return a summary count of how many classes exist per role (for balance validation).
static func get_role_coverage() -> Dictionary:
	var coverage := {}
	var all_classes := get_all_classes()
	for class_id: int in all_classes:
		var cls: Dictionary = all_classes[class_id]
		var role: String = cls.get("role_type", "")
		coverage[role] = coverage.get(role, 0) + 1
	return coverage


## Return the class_name string for a given class_id, or "Unknown" if not found.
static func get_class_name(class_id: int) -> String:
	var cls := get_class(class_id)
	return cls.get("class_name", "Unknown")

## ClassSpecialAnimations — Defines unique special attack animations per class.
## Each class has a signature move style that plays during special/ultimate
## abilities, giving visual identity to class archetypes.
##
## These animations are layered on top of the base weapon animations and include
## unique visual flourishes, movement patterns, and VFX cues.
class_name ClassSpecialAnimations
extends RefCounted


## ── Special Animation Types ─────────────────────────────────────────────────

enum SpecialType {
	BERSERKER_RUSH,    ## Barbarian: Rapid multi-slash with screen shake
	SHIELD_WALL,       ## Fighter/Paladin: Defensive stance then counter
	ARROW_RAIN,        ## Archer: Leap back, fire multiple arrows upward
	SPEAR_CHARGE,      ## Spearman: Dash forward with extended reach
	FORTRESS_SLAM,     ## Heavy: Ground pound with radial shockwave
	ARCANE_BURST,      ## Wizard: Channel energy orbs then release
	JAVELIN_VOLLEY,    ## Javelin: Rapid multi-throw sequence
	POTION_LOOM,       ## Alchemist: Toss flask with expanding cloud
	DIVINE_LIGHT,      ## Cleric: Raise arms, healing circle expands
	SOUL_LINK,         ## Ambrosian: Ethereal tether connecting allies
	SHADOW_STEP,       ## Assassin: Vanish, teleport behind, backstab
	FLURRY,            ## Monk: Rapid combo punches with afterimages
	BOLT_BARRAGE,      ## Crossbow: Rapid-fire bolt volley
	CANNON_BLAST,      ## Handgunner: Charged heavy shot with smoke
	WALL_BREAK,        ## Siegebreaker: Charge forward smashing through
	HOLY_JUDGEMENT,    ## Paladin: Raise weapon, divine beam descends
}


## ── Class Special Definitions ───────────────────────────────────────────────
## Each entry defines:
##   special_type:     SpecialType enum
##   description:      Human-readable description
##   pre_move:         Movement before the strike {dx, dy} in pixels
##   strike_count:     Number of visual hits in the animation
##   strike_interval:  Seconds between each strike visual
##   total_duration:   Total animation time
##   vfx_style:        VFX overlay type string for BattleVFXSystem
##   shake_intensity:  Camera shake (0.0-1.0)
##   flash_color:      Color flash on impact
##   has_teleport:     Whether this special includes teleportation

static func get_class_specials() -> Dictionary:
	return {
		"Barbarian": {
			"special_type": SpecialType.BERSERKER_RUSH,
			"description": "Berserker Rush — Rapid multi-slash frenzy",
			"pre_move": Vector2(32.0, 0.0),
			"strike_count": 3,
			"strike_interval": 0.12,
			"total_duration": 0.85,
			"vfx_style": "slash_flurry",
			"shake_intensity": 0.6,
			"flash_color": Color(1.0, 0.3, 0.1, 0.4),
			"has_teleport": false,
		},
		"Fighter": {
			"special_type": SpecialType.SHIELD_WALL,
			"description": "Shield Wall — Brace, then powerful counter-strike",
			"pre_move": Vector2(8.0, 0.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 0.70,
			"vfx_style": "shield_flash",
			"shake_intensity": 0.45,
			"flash_color": Color(0.6, 0.7, 1.0, 0.3),
			"has_teleport": false,
		},
		"Archer": {
			"special_type": SpecialType.ARROW_RAIN,
			"description": "Arrow Rain — Leap back and fire a volley skyward",
			"pre_move": Vector2(-20.0, 0.0),
			"strike_count": 5,
			"strike_interval": 0.08,
			"total_duration": 0.90,
			"vfx_style": "arrow_rain",
			"shake_intensity": 0.3,
			"flash_color": Color(0.9, 0.85, 0.5, 0.3),
			"has_teleport": false,
		},
		"Spearman": {
			"special_type": SpecialType.SPEAR_CHARGE,
			"description": "Spear Charge — Dash forward with devastating thrust",
			"pre_move": Vector2(48.0, 0.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 0.65,
			"vfx_style": "pierce_trail",
			"shake_intensity": 0.5,
			"flash_color": Color(0.8, 0.8, 0.9, 0.3),
			"has_teleport": false,
		},
		"Heavy": {
			"special_type": SpecialType.FORTRESS_SLAM,
			"description": "Fortress Slam — Ground pound creating radial shockwave",
			"pre_move": Vector2(0.0, -16.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 0.95,
			"vfx_style": "ground_shockwave",
			"shake_intensity": 0.8,
			"flash_color": Color(0.7, 0.5, 0.3, 0.4),
			"has_teleport": false,
		},
		"Wizard": {
			"special_type": SpecialType.ARCANE_BURST,
			"description": "Arcane Burst — Channel swirling energy then release",
			"pre_move": Vector2(0.0, 0.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 1.0,
			"vfx_style": "arcane_explosion",
			"shake_intensity": 0.5,
			"flash_color": Color(0.5, 0.3, 1.0, 0.4),
			"has_teleport": false,
		},
		"Javelin": {
			"special_type": SpecialType.JAVELIN_VOLLEY,
			"description": "Javelin Volley — Rapid multi-throw barrage",
			"pre_move": Vector2(12.0, 0.0),
			"strike_count": 3,
			"strike_interval": 0.15,
			"total_duration": 0.80,
			"vfx_style": "projectile_volley",
			"shake_intensity": 0.35,
			"flash_color": Color(0.8, 0.7, 0.5, 0.3),
			"has_teleport": false,
		},
		"Alchemist": {
			"special_type": SpecialType.POTION_LOOM,
			"description": "Potion Loom — Toss volatile flask creating expanding cloud",
			"pre_move": Vector2(8.0, 0.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 0.85,
			"vfx_style": "potion_cloud",
			"shake_intensity": 0.25,
			"flash_color": Color(0.3, 0.9, 0.4, 0.3),
			"has_teleport": false,
		},
		"Cleric": {
			"special_type": SpecialType.DIVINE_LIGHT,
			"description": "Divine Light — Raise hands, healing circle expands outward",
			"pre_move": Vector2(0.0, -8.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 0.90,
			"vfx_style": "divine_circle",
			"shake_intensity": 0.15,
			"flash_color": Color(1.0, 1.0, 0.7, 0.35),
			"has_teleport": false,
		},
		"Ambrosian": {
			"special_type": SpecialType.SOUL_LINK,
			"description": "Soul Link — Ethereal tethers form between allies",
			"pre_move": Vector2(0.0, 0.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 1.0,
			"vfx_style": "soul_tether",
			"shake_intensity": 0.1,
			"flash_color": Color(0.7, 0.5, 1.0, 0.3),
			"has_teleport": false,
		},
		"Assassin": {
			"special_type": SpecialType.SHADOW_STEP,
			"description": "Shadow Step — Vanish in smoke, teleport behind target, backstab",
			"pre_move": Vector2(0.0, 0.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 0.80,
			"vfx_style": "shadow_smoke",
			"shake_intensity": 0.4,
			"flash_color": Color(0.2, 0.1, 0.3, 0.5),
			"has_teleport": true,
		},
		"Monk": {
			"special_type": SpecialType.FLURRY,
			"description": "Flurry — Rapid-fire combo punches with afterimages",
			"pre_move": Vector2(24.0, 0.0),
			"strike_count": 5,
			"strike_interval": 0.06,
			"total_duration": 0.70,
			"vfx_style": "afterimage_combo",
			"shake_intensity": 0.45,
			"flash_color": Color(1.0, 0.9, 0.3, 0.3),
			"has_teleport": false,
		},
		"Crossbow": {
			"special_type": SpecialType.BOLT_BARRAGE,
			"description": "Bolt Barrage — Rapid-fire crossbow bolt volley",
			"pre_move": Vector2(-8.0, 0.0),
			"strike_count": 4,
			"strike_interval": 0.10,
			"total_duration": 0.80,
			"vfx_style": "bolt_volley",
			"shake_intensity": 0.3,
			"flash_color": Color(0.7, 0.7, 0.8, 0.3),
			"has_teleport": false,
		},
		"Handgunner": {
			"special_type": SpecialType.CANNON_BLAST,
			"description": "Cannon Blast — Charged heavy shot with muzzle flash and smoke",
			"pre_move": Vector2(-12.0, 0.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 0.85,
			"vfx_style": "muzzle_blast",
			"shake_intensity": 0.7,
			"flash_color": Color(1.0, 0.6, 0.1, 0.45),
			"has_teleport": false,
		},
		"Siegebreaker": {
			"special_type": SpecialType.WALL_BREAK,
			"description": "Wall Break — Full-body charge smashing through everything",
			"pre_move": Vector2(56.0, 0.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 0.90,
			"vfx_style": "impact_shockwave",
			"shake_intensity": 0.9,
			"flash_color": Color(0.9, 0.6, 0.2, 0.5),
			"has_teleport": false,
		},
		"Paladin": {
			"special_type": SpecialType.HOLY_JUDGEMENT,
			"description": "Holy Judgement — Raise weapon, beam of light descends on target",
			"pre_move": Vector2(0.0, -12.0),
			"strike_count": 1,
			"strike_interval": 0.0,
			"total_duration": 1.0,
			"vfx_style": "divine_beam",
			"shake_intensity": 0.55,
			"flash_color": Color(1.0, 0.95, 0.6, 0.5),
			"has_teleport": false,
		},
	}


## Get the special animation data for a class name.
static func get_special(class_name_str: String) -> Dictionary:
	var specials: Dictionary = get_class_specials()
	return specials.get(class_name_str, {})


## Check if a class has a teleport-based special.
static func has_teleport_special(class_name_str: String) -> bool:
	var special: Dictionary = get_special(class_name_str)
	return special.get("has_teleport", false)

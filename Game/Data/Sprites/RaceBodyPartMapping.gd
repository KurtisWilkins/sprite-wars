## RaceBodyPartMapping — Maps each of the 24 Sprite races to their body part
## asset paths for the skeletal 2D animation system.
##
## Integrates with ChibiSpriteConfig.gd for arm pivot types, body proportions,
## and cel-shaded rendering parameters.
##
## Race IDs (1-24):
##   1=BugMan, 2=BearMan, 3=BirdMan, 4=Demon, 5=Devil, 6=CatMan,
##   7=Elf, 8=Ent, 9=FishMan, 10=Ghost, 11=Golem, 12=Human,
##   13=LizardMan, 14=Minotaur, 15=MonkeyMan, 16=Mummy, 17=Ork,
##   18=RatMan, 19=Robot, 20=SharkMan, 21=Skeleton, 22=TurtleMan,
##   23=WolfMan, 24=Zombie
##
## Usage:
##   var parts = RaceBodyPartMapping.get_race_parts(12)       # Human body parts
##   var pivot = RaceBodyPartMapping.get_arm_pivot_type(11)    # "bulky" for Golem
##   var custom = RaceBodyPartMapping.get_races_needing_custom_parts()
class_name RaceBodyPartMapping
extends RefCounted


# ════════════════════════════════════════════════════════════════════════════════
# 1. FILE PATH CONSTANTS
# ════════════════════════════════════════════════════════════════════════════════

## Base path for source body-part assets (modular pieces).
const SOURCE_BASE: String = "res://Sprites/Characters and Equipment/BodyParts/"

## Base path for assembled / output character sprites.
const OUTPUT_BASE: String = "res://Sprites/Characters/"


# ════════════════════════════════════════════════════════════════════════════════
# 2. RACE NAME LOOKUP
# ════════════════════════════════════════════════════════════════════════════════

## Maps race_id → display name.
const RACE_NAMES: Dictionary = {
	1:  "BugMan",
	2:  "BearMan",
	3:  "BirdMan",
	4:  "Demon",
	5:  "Devil",
	6:  "CatMan",
	7:  "Elf",
	8:  "Ent",
	9:  "FishMan",
	10: "Ghost",
	11: "Golem",
	12: "Human",
	13: "LizardMan",
	14: "Minotaur",
	15: "MonkeyMan",
	16: "Mummy",
	17: "Ork",
	18: "RatMan",
	19: "Robot",
	20: "SharkMan",
	21: "Skeleton",
	22: "TurtleMan",
	23: "WolfMan",
	24: "Zombie",
}


# ════════════════════════════════════════════════════════════════════════════════
# 3. BODY PART DEFINITIONS — RACES WITH EXISTING ASSETS
# ════════════════════════════════════════════════════════════════════════════════

## Races that map directly to existing BodyParts assets.
## Each entry contains file paths relative to SOURCE_BASE, arm pivot type,
## body type tag, and a flag indicating no custom generation is needed.
static func _get_existing_race_parts() -> Dictionary:
	return {
		# ── Human (12) ────────────────────────────────────────────────────
		12: {
			"body":      "Body/Basic/Human.png",
			"head":      "Head/Basic/Head.png",
			"ears":      "Ears/Basic/HumanEars.png",
			"eyes":      "Eyes/Basic/Male.png",
			"mouth":     "Mouth/Basic/Normal.png",
			"hair":      "Hair/Basic/ShortHair.png",
			"eyebrows":  "Eyebrows/Basic/Eyebrows1.png",
			"beard":     "",
			"arm_pivot": "default",
			"body_type": "humanoid",
			"needs_custom": false,
		},

		# ── Elf (7) ──────────────────────────────────────────────────────
		7: {
			"body":      "Body/Basic/Human.png",
			"head":      "Head/Basic/Head.png",
			"ears":      "Ears/Basic/ElfEars.png",
			"eyes":      "Eyes/Basic/Female.png",
			"mouth":     "Mouth/Basic/Smirk.png",
			"hair":      "Hair/Bonus/ElfaHair.png",
			"eyebrows":  "Eyebrows/Basic/Eyebrows2.png",
			"beard":     "",
			"arm_pivot": "slim",
			"body_type": "humanoid",
			"needs_custom": false,
		},

		# ── Demon (4) ────────────────────────────────────────────────────
		4: {
			"body":      "Body/Demon/Demon1.png",
			"head":      "Head/Demon/DemonHead1.png",
			"ears":      "Ears/Demon/DemonEar1.png",
			"eyes":      "Eyes/Demon/DemonEyes1.png",
			"mouth":     "Mouth/Demon/DemonMouth1.png",
			"eyebrows":  "",
			"beard":     "",
			"hair":      "Hair/Basic/Mohawk.png",
			"arm_pivot": "default",
			"body_type": "demon",
			"needs_custom": false,
		},

		# ── Devil (5) ────────────────────────────────────────────────────
		5: {
			"body":      "Body/Demon/Demon2.png",
			"head":      "Head/Demon/DemonHead2.png",
			"ears":      "Ears/Demon/DemonEar2.png",
			"eyes":      "Eyes/Demon/DemonEyes2.png",
			"mouth":     "Mouth/Demon/DemonMouth2.png",
			"eyebrows":  "",
			"beard":     "",
			"hair":      "Hair/Basic/Slicked.png",
			"arm_pivot": "default",
			"body_type": "demon",
			"needs_custom": false,
		},

		# ── CatMan (6) ───────────────────────────────────────────────────
		6: {
			"body":      "Body/Furry/FurryBody1.png",
			"head":      "Head/Furry/WolfyHead1.png",
			"ears":      "Ears/Furry/WolfyEars1.png",
			"eyes":      "Eyes/Furry/FurryEyes1.png",
			"mouth":     "Mouth/Furry/Smirk.png",
			"eyebrows":  "",
			"beard":     "",
			"hair":      "",
			"arm_pivot": "default",
			"body_type": "furry",
			"needs_custom": false,
		},

		# ── BearMan (2) ──────────────────────────────────────────────────
		2: {
			"body":      "Body/Furry/FurryBody3.png",
			"head":      "Head/Furry/WolfyHead3.png",
			"ears":      "Ears/Furry/WolfyEars3.png",
			"eyes":      "Eyes/Furry/FurryEyes3.png",
			"mouth":     "Mouth/Furry/Normal.png",
			"eyebrows":  "",
			"beard":     "",
			"hair":      "",
			"arm_pivot": "bulky",
			"body_type": "furry",
			"needs_custom": false,
		},

		# ── WolfMan (23) ─────────────────────────────────────────────────
		23: {
			"body":      "Body/Furry/FurryBody2.png",
			"head":      "Head/Furry/WolfyHead2.png",
			"ears":      "Ears/Furry/WolfyEars2.png",
			"eyes":      "Eyes/Furry/FurryEyes2.png",
			"mouth":     "Mouth/Furry/Normal.png",
			"eyebrows":  "",
			"beard":     "",
			"hair":      "",
			"arm_pivot": "default",
			"body_type": "furry",
			"needs_custom": false,
		},

		# ── MonkeyMan (15) ───────────────────────────────────────────────
		15: {
			"body":      "Body/Furry/FurryBody4.png",
			"head":      "Head/Furry/WolfyHead4.png",
			"ears":      "Ears/Furry/WolfyEars4.png",
			"eyes":      "Eyes/Furry/FurryEyes4.png",
			"mouth":     "Mouth/Furry/Smirk.png",
			"eyebrows":  "",
			"beard":     "",
			"hair":      "",
			"arm_pivot": "default",
			"body_type": "furry",
			"needs_custom": false,
		},

		# ── Mummy (16) ───────────────────────────────────────────────────
		16: {
			"body":      "Body/Mummies/MummyBody1.png",
			"head":      "Head/Mummies/MummyHead1.png",
			"ears":      "Ears/Mummies/MummyEar1.png",
			"eyes":      "Eyes/Mummies/GlowingEyes.png",
			"mouth":     "",
			"hair":      "",
			"eyebrows":  "",
			"beard":     "",
			"arm_pivot": "default",
			"body_type": "undead",
			"needs_custom": false,
		},

		# ── Skeleton (21) ────────────────────────────────────────────────
		21: {
			"body":      "Body/Skeletons/Skeleton1.png",
			"head":      "Head/Skeletons/Skeleton1.png",
			"ears":      "",
			"eyes":      "Eyes/Skeletons/Skeleton1Eyes.png",
			"mouth":     "",
			"hair":      "",
			"eyebrows":  "",
			"beard":     "",
			"arm_pivot": "slim",
			"body_type": "undead",
			"needs_custom": false,
		},

		# ── Zombie (24) ──────────────────────────────────────────────────
		24: {
			"body":      "Body/Zombies/ZombieBody1.png",
			"head":      "Head/Zombies/ZombieHead1.png",
			"ears":      "Ears/Zombies/ZombieEar1.png",
			"eyes":      "Eyes/Zombies/ZombieEyes1.png",
			"mouth":     "Mouth/Zombies/ZombieMouth1.png",
			"hair":      "Hair/Basic/ZombieShabby.png",
			"eyebrows":  "",
			"beard":     "",
			"arm_pivot": "default",
			"body_type": "undead",
			"needs_custom": false,
		},
	}


# ════════════════════════════════════════════════════════════════════════════════
# 4. BODY PART DEFINITIONS — RACES NEEDING CUSTOM GENERATION
# ════════════════════════════════════════════════════════════════════════════════

## Races that require custom-generated body part assets.
## "base" indicates which existing body set to use as a generation template.
## "custom_tag" is the unique visual identifier for the custom generation pipeline.
static func _get_custom_race_parts() -> Dictionary:
	return {
		# ── BugMan (1) ───────────────────────────────────────────────────
		1: {
			"base":       "furry",
			"custom_tag": "insectoid",
			"arm_pivot":  "slim",
			"body_type":  "insectoid",
			"needs_custom": true,
		},

		# ── BirdMan (3) ──────────────────────────────────────────────────
		3: {
			"base":       "furry",
			"custom_tag": "avian",
			"arm_pivot":  "slim",
			"body_type":  "avian",
			"needs_custom": true,
		},

		# ── Ent (8) ──────────────────────────────────────────────────────
		8: {
			"base":       "basic",
			"custom_tag": "plant",
			"arm_pivot":  "bulky",
			"body_type":  "plant",
			"needs_custom": true,
		},

		# ── FishMan (9) ──────────────────────────────────────────────────
		9: {
			"base":       "furry",
			"custom_tag": "aquatic",
			"arm_pivot":  "default",
			"body_type":  "aquatic",
			"needs_custom": true,
		},

		# ── Ghost (10) ───────────────────────────────────────────────────
		10: {
			"base":       "basic",
			"custom_tag": "ethereal",
			"arm_pivot":  "default",
			"body_type":  "ethereal",
			"needs_custom": true,
		},

		# ── Golem (11) ───────────────────────────────────────────────────
		11: {
			"base":       "basic",
			"custom_tag": "stone",
			"arm_pivot":  "bulky",
			"body_type":  "stone",
			"needs_custom": true,
		},

		# ── LizardMan (13) ───────────────────────────────────────────────
		13: {
			"base":       "furry",
			"custom_tag": "reptilian",
			"arm_pivot":  "default",
			"body_type":  "reptilian",
			"needs_custom": true,
		},

		# ── Minotaur (14) ────────────────────────────────────────────────
		14: {
			"base":       "furry",
			"custom_tag": "bovine",
			"arm_pivot":  "bulky",
			"body_type":  "bovine",
			"needs_custom": true,
		},

		# ── Ork (17) ─────────────────────────────────────────────────────
		17: {
			"base":       "basic",
			"custom_tag": "ork",
			"arm_pivot":  "bulky",
			"body_type":  "ork",
			"needs_custom": true,
		},

		# ── RatMan (18) ──────────────────────────────────────────────────
		18: {
			"base":       "furry",
			"custom_tag": "rodent",
			"arm_pivot":  "slim",
			"body_type":  "rodent",
			"needs_custom": true,
		},

		# ── Robot (19) ───────────────────────────────────────────────────
		19: {
			"base":       "basic",
			"custom_tag": "mechanical",
			"arm_pivot":  "default",
			"body_type":  "mechanical",
			"needs_custom": true,
		},

		# ── SharkMan (20) ────────────────────────────────────────────────
		20: {
			"base":       "furry",
			"custom_tag": "shark",
			"arm_pivot":  "bulky",
			"body_type":  "shark",
			"needs_custom": true,
		},

		# ── TurtleMan (22) ───────────────────────────────────────────────
		22: {
			"base":       "furry",
			"custom_tag": "turtle",
			"arm_pivot":  "bulky",
			"body_type":  "turtle",
			"needs_custom": true,
		},
	}


# ════════════════════════════════════════════════════════════════════════════════
# 5. BASE TEMPLATE PATHS (for custom-generated races)
# ════════════════════════════════════════════════════════════════════════════════

## Fallback body-part paths used as generation templates for custom races.
## Keyed by base type ("basic", "furry", etc.).
const BASE_TEMPLATES: Dictionary = {
	"basic": {
		"body":  "Body/Basic/Human.png",
		"head":  "Head/Basic/Head.png",
		"ears":  "Ears/Basic/HumanEars.png",
		"eyes":  "Eyes/Basic/Male.png",
		"mouth": "Mouth/Basic/Normal.png",
	},
	"furry": {
		"body":  "Body/Furry/FurryBody1.png",
		"head":  "Head/Furry/WolfyHead1.png",
		"ears":  "Ears/Furry/WolfyEars1.png",
		"eyes":  "Eyes/Furry/FurryEyes1.png",
		"mouth": "Mouth/Furry/Normal.png",
	},
}


# ════════════════════════════════════════════════════════════════════════════════
# 6. HELPER FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════════

## Returns the body-part paths dictionary for a race.
## For races with existing assets, paths are relative to SOURCE_BASE.
## For custom races, returns the base template paths plus custom metadata.
static func get_race_parts(race_id: int) -> Dictionary:
	var existing := _get_existing_race_parts()
	if existing.has(race_id):
		return existing[race_id]

	var custom := _get_custom_race_parts()
	if custom.has(race_id):
		var entry: Dictionary = custom[race_id]
		var base_type: String = entry["base"]
		var template: Dictionary = BASE_TEMPLATES[base_type].duplicate()
		template["custom_tag"] = entry["custom_tag"]
		template["arm_pivot"] = entry["arm_pivot"]
		template["body_type"] = entry["body_type"]
		template["needs_custom"] = true
		template["base"] = base_type
		return template

	push_warning("RaceBodyPartMapping: unknown race_id %d" % race_id)
	return {}


## Returns the display name for a race_id.
static func get_race_name(race_id: int) -> String:
	if RACE_NAMES.has(race_id):
		return RACE_NAMES[race_id]
	push_warning("RaceBodyPartMapping: unknown race_id %d" % race_id)
	return "Unknown"


## Returns the arm pivot type string for a race ("default", "bulky", "slim", "tiny").
## This value maps directly to ChibiSpriteConfig.get_arm_pivots() keys.
static func get_arm_pivot_type(race_id: int) -> String:
	var existing := _get_existing_race_parts()
	if existing.has(race_id):
		return existing[race_id]["arm_pivot"]

	var custom := _get_custom_race_parts()
	if custom.has(race_id):
		return custom[race_id]["arm_pivot"]

	push_warning("RaceBodyPartMapping: unknown race_id %d, defaulting to 'default' pivot" % race_id)
	return "default"


## Returns the body type tag for a race (e.g. "humanoid", "furry", "undead", "stone").
static func get_body_type(race_id: int) -> String:
	var existing := _get_existing_race_parts()
	if existing.has(race_id):
		return existing[race_id]["body_type"]

	var custom := _get_custom_race_parts()
	if custom.has(race_id):
		return custom[race_id]["body_type"]

	push_warning("RaceBodyPartMapping: unknown race_id %d, defaulting to 'humanoid' body type" % race_id)
	return "humanoid"


## Returns the output file path for an assembled sprite.
## stage is the evolution stage (0, 1, or 2).
static func get_assembled_sprite_path(race_id: int, stage: int) -> String:
	var name := get_race_name(race_id)
	if name == "Unknown":
		return ""
	var clamped := clampi(stage, 0, 2)
	return OUTPUT_BASE + name + "/Stage" + str(clamped) + "/" + name + "_stage" + str(clamped) + ".png"


## Returns an Array of all valid race IDs (1-24), sorted ascending.
static func get_all_race_ids() -> Array:
	var ids: Array = RACE_NAMES.keys()
	ids.sort()
	return ids


## Returns an Array of race_ids that require custom-generated body parts.
static func get_races_needing_custom_parts() -> Array:
	var custom := _get_custom_race_parts()
	var ids: Array = custom.keys()
	ids.sort()
	return ids

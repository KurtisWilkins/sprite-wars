## SpriteRaces — Static database of all 24 Sprite race definitions.
## [P1-002 through P1-005] Populates SpriteRaceData resources for the full roster.
##
## Design notes:
##   - 24 unique races: 14 common, 7 uncommon, 3 rare
##   - ALL races can be ANY of the 14 elements and ANY of the 16 classes
##   - Base stat totals: common 285-310, uncommon 325-345, rare 360-370
##   - Growth rates use 1-5 scale (per-level additive) tuned to race archetype
##   - Evolution chains: form_id = race_id * 3 - 2 (stage 1), race_id * 3 - 1 (stage 2), race_id * 3 (stage 3)
class_name SpriteRaces
extends RefCounted

## All 14 elements available to every race.
const ALL_ELEMENTS: Array[String] = [
	"Fire", "Water", "Wind", "Earth", "Plant", "Metal", "Electric",
	"Dark", "Light", "Solar", "Lunar", "Fairy", "Poison", "Ice",
]

## All 16 classes available to every race.
const ALL_CLASSES: Array[String] = [
	"Barbarian", "Fighter", "Archer", "Spearman", "Heavy", "Wizard",
	"Javelin", "Alchemist", "Cleric", "Ambrosian", "Assassin", "Monk",
	"Crossbow", "Handgunner", "Siegebreaker", "Paladin",
]

## Return all 24 race data dictionaries keyed by race_id.
static func get_all_races() -> Dictionary:
	return {
		# ──────────────────────────────────────────────────────────────────────
		# COMMON RACES (14)
		# ──────────────────────────────────────────────────────────────────────

		# 1 — Bug Man — Fast, fragile (spd/atk focus, low def) — total ~300
		1: {
			"race_id": 1,
			"race_name": "Bug Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 42, "atk": 55, "def": 35, "spd": 65, "sp_atk": 58, "sp_def": 45},
			"growth_rates": {"hp": 2.0, "atk": 3.5, "def": 1.5, "spd": 4.5, "sp_atk": 3.0, "sp_def": 2.0},
			"evolution_chain": [1, 2, 3],
			"rarity": "common",
			"lore_description": "Chitinous humanoids with compound eyes and vestigial wings. Bug Men are swift and relentless, swarming enemies with coordinated strikes before they can mount a defense.",
		},

		# 2 — Bear Man — Tanky bruiser (hp/atk/def focus, low spd) — total ~310
		2: {
			"race_id": 2,
			"race_name": "Bear Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 72, "atk": 62, "def": 60, "spd": 30, "sp_atk": 38, "sp_def": 48},
			"growth_rates": {"hp": 4.5, "atk": 4.0, "def": 3.5, "spd": 1.0, "sp_atk": 1.5, "sp_def": 2.5},
			"evolution_chain": [4, 5, 6],
			"rarity": "common",
			"lore_description": "Massive ursine warriors with thick hides and crushing strength. Bear Men shrug off blows that would fell lesser races, then retaliate with bone-shattering force.",
		},

		# 3 — Bird Man — Fast ranged (spd/sp_atk focus, low def) — total ~295
		3: {
			"race_id": 3,
			"race_name": "Bird Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 40, "atk": 42, "def": 35, "spd": 68, "sp_atk": 62, "sp_def": 48},
			"growth_rates": {"hp": 2.0, "atk": 2.0, "def": 1.5, "spd": 5.0, "sp_atk": 4.0, "sp_def": 2.5},
			"evolution_chain": [7, 8, 9],
			"rarity": "common",
			"lore_description": "Feathered humanoids who soar above the battlefield, raining down elemental attacks from on high. Their hollow bones grant unmatched speed at the cost of durability.",
		},

		# 6 — Cat Man — Speed assassin (spd/atk, low hp) — total ~295
		6: {
			"race_id": 6,
			"race_name": "Cat Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 38, "atk": 58, "def": 40, "spd": 70, "sp_atk": 48, "sp_def": 41},
			"growth_rates": {"hp": 1.5, "atk": 3.5, "def": 2.0, "spd": 5.0, "sp_atk": 2.5, "sp_def": 2.0},
			"evolution_chain": [16, 17, 18],
			"rarity": "common",
			"lore_description": "Lithe feline warriors with retractable claws and night-piercing eyes. Cat Men strike from the shadows with blinding speed, vanishing before their prey hits the ground.",
		},

		# 9 — Fish Man — Water specialist (balanced, slight sp_atk) — total ~300
		9: {
			"race_id": 9,
			"race_name": "Fish Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 52, "atk": 45, "def": 48, "spd": 48, "sp_atk": 58, "sp_def": 49},
			"growth_rates": {"hp": 3.0, "atk": 2.5, "def": 2.5, "spd": 2.5, "sp_atk": 3.5, "sp_def": 2.5},
			"evolution_chain": [25, 26, 27],
			"rarity": "common",
			"lore_description": "Amphibious humanoids with iridescent scales and gills that function in air and water alike. Fish Men channel the tides through their bodies, bending currents to their will.",
		},

		# 12 — Human — Perfectly balanced — total ~300
		12: {
			"race_id": 12,
			"race_name": "Human",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 50, "atk": 50, "def": 50, "spd": 50, "sp_atk": 50, "sp_def": 50},
			"growth_rates": {"hp": 3.0, "atk": 3.0, "def": 3.0, "spd": 3.0, "sp_atk": 3.0, "sp_def": 3.0},
			"evolution_chain": [34, 35, 36],
			"rarity": "common",
			"lore_description": "The most adaptable of all races, Humans lack natural extremes but excel through sheer versatility. Their balanced nature lets them master any element or fighting style with equal proficiency.",
		},

		# 13 — Lizard Man — Physical balanced (atk/def) — total ~305
		13: {
			"race_id": 13,
			"race_name": "Lizard Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 52, "atk": 58, "def": 55, "spd": 48, "sp_atk": 42, "sp_def": 50},
			"growth_rates": {"hp": 3.0, "atk": 3.5, "def": 3.5, "spd": 2.5, "sp_atk": 2.0, "sp_def": 2.5},
			"evolution_chain": [37, 38, 39],
			"rarity": "common",
			"lore_description": "Cold-blooded reptilian warriors with regenerating tails and armored scales. Lizard Men are disciplined fighters who rely on physical prowess and natural resilience in battle.",
		},

		# 15 — Monkey Man — Agile (spd/atk, low def) — total ~290
		15: {
			"race_id": 15,
			"race_name": "Monkey Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 44, "atk": 55, "def": 38, "spd": 65, "sp_atk": 50, "sp_def": 38},
			"growth_rates": {"hp": 2.0, "atk": 3.5, "def": 1.5, "spd": 4.5, "sp_atk": 3.0, "sp_def": 1.5},
			"evolution_chain": [43, 44, 45],
			"rarity": "common",
			"lore_description": "Acrobatic primate warriors who swing through battle with unpredictable agility. Monkey Men use terrain to their advantage, leaping and tumbling to avoid attacks while landing precise strikes.",
		},

		# 17 — Ork — Barbarian (atk/hp, low sp_def) — total ~305
		17: {
			"race_id": 17,
			"race_name": "Ork",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 62, "atk": 65, "def": 50, "spd": 42, "sp_atk": 38, "sp_def": 48},
			"growth_rates": {"hp": 3.5, "atk": 4.5, "def": 2.5, "spd": 2.0, "sp_atk": 1.5, "sp_def": 2.0},
			"evolution_chain": [49, 50, 51],
			"rarity": "common",
			"lore_description": "Green-skinned brutes fueled by battle rage. Orks grow stronger as the fight intensifies, their fury overwhelming any attempt at magical suppression. They live for the thrill of combat.",
		},

		# 18 — Rat Man — Glass cannon speed (spd/atk, low hp/def) — total ~285
		18: {
			"race_id": 18,
			"race_name": "Rat Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 35, "atk": 55, "def": 32, "spd": 68, "sp_atk": 52, "sp_def": 43},
			"growth_rates": {"hp": 1.5, "atk": 3.5, "def": 1.0, "spd": 5.0, "sp_atk": 3.0, "sp_def": 2.0},
			"evolution_chain": [52, 53, 54],
			"rarity": "common",
			"lore_description": "Wiry rodent humanoids with razor-sharp reflexes and an uncanny ability to find weak points. Rat Men strike fast and fade away, preferring guerrilla tactics over prolonged confrontation.",
		},

		# 21 — Skeleton — Fast undead (spd/atk, low hp) — total ~290
		21: {
			"race_id": 21,
			"race_name": "Skeleton",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 35, "atk": 58, "def": 45, "spd": 62, "sp_atk": 50, "sp_def": 40},
			"growth_rates": {"hp": 1.5, "atk": 3.5, "def": 2.5, "spd": 4.0, "sp_atk": 3.0, "sp_def": 2.0},
			"evolution_chain": [61, 62, 63],
			"rarity": "common",
			"lore_description": "Animated skeletal warriors that move with unnatural speed and precision. Freed from the burden of flesh, Skeletons fight with mechanical efficiency, reforming even after being shattered.",
		},

		# 23 — Wolf Man — Pack fighter (spd/atk balanced) — total ~300
		23: {
			"race_id": 23,
			"race_name": "Wolf Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 50, "atk": 55, "def": 45, "spd": 58, "sp_atk": 45, "sp_def": 47},
			"growth_rates": {"hp": 2.5, "atk": 3.5, "def": 2.5, "spd": 3.5, "sp_atk": 2.5, "sp_def": 2.5},
			"evolution_chain": [67, 68, 69],
			"rarity": "common",
			"lore_description": "Lupine warriors who fight with coordinated pack tactics. Wolf Men grow fiercer when allies are near, their howls bolstering companions while striking fear into the hearts of enemies.",
		},

		# 24 — Zombie — Relentless (hp/atk, very low spd) — total ~300
		24: {
			"race_id": 24,
			"race_name": "Zombie",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 68, "atk": 58, "def": 52, "spd": 25, "sp_atk": 45, "sp_def": 52},
			"growth_rates": {"hp": 4.5, "atk": 3.5, "def": 3.0, "spd": 1.0, "sp_atk": 2.0, "sp_def": 3.0},
			"evolution_chain": [70, 71, 72],
			"rarity": "common",
			"lore_description": "Shambling undead driven by an insatiable hunger for battle. Zombies endure punishment that would destroy any living creature, dragging themselves forward through sheer relentless will.",
		},

		# ──────────────────────────────────────────────────────────────────────
		# UNCOMMON RACES (7)
		# ──────────────────────────────────────────────────────────────────────

		# 4 — Demon — High sp_atk, glass cannon — total ~330
		4: {
			"race_id": 4,
			"race_name": "Demon",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 48, "atk": 50, "def": 40, "spd": 55, "sp_atk": 75, "sp_def": 62},
			"growth_rates": {"hp": 2.0, "atk": 2.5, "def": 1.5, "spd": 3.0, "sp_atk": 5.0, "sp_def": 3.0},
			"evolution_chain": [10, 11, 12],
			"rarity": "uncommon",
			"lore_description": "Infernal beings forged in abyssal fire, Demons wield devastating magical power at the cost of physical resilience. Their arcane might can level entire battalions in a single incantation.",
		},

		# 5 — Devil — Balanced, tricky (sp_atk/spd) — total ~335
		5: {
			"race_id": 5,
			"race_name": "Devil",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 52, "atk": 48, "def": 45, "spd": 62, "sp_atk": 70, "sp_def": 58},
			"growth_rates": {"hp": 2.5, "atk": 2.0, "def": 2.0, "spd": 4.0, "sp_atk": 4.5, "sp_def": 3.0},
			"evolution_chain": [13, 14, 15],
			"rarity": "uncommon",
			"lore_description": "Cunning fiends who prefer manipulation over brute force. Devils weave illusions and hexes with deceptive elegance, always three steps ahead of their opponents in the deadly game of battle.",
		},

		# 7 — Elf — Magic balanced (sp_atk/sp_def/spd) — total ~325
		7: {
			"race_id": 7,
			"race_name": "Elf",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 45, "atk": 42, "def": 42, "spd": 62, "sp_atk": 68, "sp_def": 66},
			"growth_rates": {"hp": 2.0, "atk": 2.0, "def": 2.0, "spd": 4.0, "sp_atk": 4.5, "sp_def": 4.0},
			"evolution_chain": [19, 20, 21],
			"rarity": "uncommon",
			"lore_description": "Ancient and graceful, Elves command magic with an elegance born of centuries of study. Their attunement to the arcane makes them peerless spellcasters and resilient against magical assault.",
		},

		# 8 — Ent — Extreme tank (hp/def, very low spd) — total ~340
		8: {
			"race_id": 8,
			"race_name": "Ent",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 80, "atk": 48, "def": 72, "spd": 18, "sp_atk": 52, "sp_def": 70},
			"growth_rates": {"hp": 5.0, "atk": 2.0, "def": 4.5, "spd": 1.0, "sp_atk": 2.5, "sp_def": 4.0},
			"evolution_chain": [22, 23, 24],
			"rarity": "uncommon",
			"lore_description": "Living tree giants who have walked the world since before recorded history. Ents are nearly immovable fortresses, their bark-like skin absorbing punishment while they slowly crush all opposition.",
		},

		# 11 — Golem — Ultra tank (hp/def, minimal spd) — total ~345
		11: {
			"race_id": 11,
			"race_name": "Golem",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 82, "atk": 55, "def": 78, "spd": 15, "sp_atk": 40, "sp_def": 75},
			"growth_rates": {"hp": 5.0, "atk": 2.5, "def": 5.0, "spd": 1.0, "sp_atk": 1.5, "sp_def": 4.5},
			"evolution_chain": [31, 32, 33],
			"rarity": "uncommon",
			"lore_description": "Constructs of animated stone and arcane runes, Golems are the ultimate defensive bulwarks. They feel no pain, know no fear, and will stand guard for eternity if commanded.",
		},

		# 14 — Minotaur — Power bruiser (atk/hp, low spd) — total ~335
		14: {
			"race_id": 14,
			"race_name": "Minotaur",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 68, "atk": 72, "def": 58, "spd": 32, "sp_atk": 45, "sp_def": 60},
			"growth_rates": {"hp": 4.0, "atk": 5.0, "def": 3.0, "spd": 1.0, "sp_atk": 2.0, "sp_def": 3.0},
			"evolution_chain": [40, 41, 42],
			"rarity": "uncommon",
			"lore_description": "Towering bull-headed warriors whose charge can shatter fortress gates. Minotaurs channel primal fury into devastating physical attacks, their horns and fists equally lethal instruments of destruction.",
		},

		# 20 — Shark Man — Aggressive (atk/hp/spd) — total ~340
		20: {
			"race_id": 20,
			"race_name": "Shark Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 62, "atk": 68, "def": 52, "spd": 58, "sp_atk": 48, "sp_def": 52},
			"growth_rates": {"hp": 3.5, "atk": 4.5, "def": 2.5, "spd": 3.5, "sp_atk": 2.0, "sp_def": 2.5},
			"evolution_chain": [58, 59, 60],
			"rarity": "uncommon",
			"lore_description": "Apex predators of the deep given humanoid form. Shark Men sense weakness like blood in the water, growing more ferocious as their prey falters. They never stop advancing.",
		},

		# 22 — Turtle Man — Extreme defense (def/sp_def/hp, low spd/atk) — total ~330
		22: {
			"race_id": 22,
			"race_name": "Turtle Man",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 70, "atk": 35, "def": 75, "spd": 20, "sp_atk": 55, "sp_def": 75},
			"growth_rates": {"hp": 4.0, "atk": 1.5, "def": 5.0, "spd": 1.0, "sp_atk": 2.5, "sp_def": 5.0},
			"evolution_chain": [64, 65, 66],
			"rarity": "uncommon",
			"lore_description": "Patient, shell-armored warriors who outlast any foe through sheer endurance. Turtle Men retreat into their shells to weather the fiercest storms, then emerge to counterattack with methodical precision.",
		},

		# ──────────────────────────────────────────────────────────────────────
		# RARE RACES (3)
		# ──────────────────────────────────────────────────────────────────────

		# 10 — Ghost — Ethereal (sp_atk/spd, very low def/hp) — total ~360
		10: {
			"race_id": 10,
			"race_name": "Ghost",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 38, "atk": 40, "def": 30, "spd": 72, "sp_atk": 82, "sp_def": 98},
			"growth_rates": {"hp": 1.5, "atk": 1.5, "def": 1.0, "spd": 4.5, "sp_atk": 5.0, "sp_def": 4.5},
			"evolution_chain": [28, 29, 30],
			"rarity": "rare",
			"lore_description": "Spectral entities that phase between the material and spirit planes. Ghosts are nearly impossible to pin down, their intangible forms slipping through attacks while unleashing devastating psychic assaults.",
		},

		# 16 — Mummy — Curse specialist (sp_atk/sp_def, low spd) — total ~365
		16: {
			"race_id": 16,
			"race_name": "Mummy",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 65, "atk": 45, "def": 60, "spd": 25, "sp_atk": 80, "sp_def": 90},
			"growth_rates": {"hp": 3.5, "atk": 2.0, "def": 3.0, "spd": 1.0, "sp_atk": 5.0, "sp_def": 4.5},
			"evolution_chain": [46, 47, 48],
			"rarity": "rare",
			"lore_description": "Ancient rulers preserved through forbidden rituals, Mummies wield curses accumulated over millennia. Their bandaged forms radiate dread, and their hexes erode both body and spirit of all who oppose them.",
		},

		# 19 — Robot — Calculated (def/atk, no sp_atk variance) — total ~370
		19: {
			"race_id": 19,
			"race_name": "Robot",
			"element_types": ALL_ELEMENTS.duplicate(),
			"available_classes": ALL_CLASSES.duplicate(),
			"base_stats": {"hp": 65, "atk": 70, "def": 75, "spd": 45, "sp_atk": 55, "sp_def": 60},
			"growth_rates": {"hp": 3.5, "atk": 4.0, "def": 4.5, "spd": 2.0, "sp_atk": 3.0, "sp_def": 3.0},
			"evolution_chain": [55, 56, 57],
			"rarity": "rare",
			"lore_description": "Mechanical constructs powered by arcane cores, Robots execute combat algorithms with flawless precision. They adapt to enemy patterns in real-time, becoming deadlier with each exchange.",
		},
	}


## Return a single race dictionary by ID, or an empty dictionary if not found.
static func get_race(race_id: int) -> Dictionary:
	var all_races := get_all_races()
	return all_races.get(race_id, {})


## Return all race IDs that have a given element in their element_types list.
static func get_races_by_element(element_name: String) -> Array[int]:
	var result: Array[int] = []
	var all_races := get_all_races()
	for race_id: int in all_races:
		var race: Dictionary = all_races[race_id]
		if element_name in race.get("element_types", []):
			result.append(race_id)
	return result


## Return all race IDs that have a given class in their available_classes list.
static func get_races_by_class(class_name_str: String) -> Array[int]:
	var result: Array[int] = []
	var all_races := get_all_races()
	for race_id: int in all_races:
		var race: Dictionary = all_races[race_id]
		if class_name_str in race.get("available_classes", []):
			result.append(race_id)
	return result


## Return all race IDs of a given rarity.
static func get_races_by_rarity(rarity: String) -> Array[int]:
	var result: Array[int] = []
	var all_races := get_all_races()
	for race_id: int in all_races:
		var race: Dictionary = all_races[race_id]
		if race.get("rarity", "") == rarity:
			result.append(race_id)
	return result


## Return a summary count of how many races list each element (for balance validation).
static func get_element_coverage() -> Dictionary:
	var coverage := {}
	var all_races := get_all_races()
	for race_id: int in all_races:
		var race: Dictionary = all_races[race_id]
		for element: String in race.get("element_types", []):
			coverage[element] = coverage.get(element, 0) + 1
	return coverage


## Return a summary count of how many races list each class (for balance validation).
static func get_class_coverage() -> Dictionary:
	var coverage := {}
	var all_races := get_all_races()
	for race_id: int in all_races:
		var race: Dictionary = all_races[race_id]
		for cls: String in race.get("available_classes", []):
			coverage[cls] = coverage.get(cls, 0) + 1
	return coverage

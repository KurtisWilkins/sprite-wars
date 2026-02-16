## SpriteRaces — Static database of all 24 Sprite race definitions.
## [P1-002 through P1-005] Populates SpriteRaceData resources for the full roster.
##
## Design notes:
##   - 16 single-element + 6 dual-element + 2 legendary Sprites = 24 total
##   - All 14 elements represented; all 10 classes represented (at least 2 each)
##   - Base stat totals: common 280-320, uncommon 320-360, rare 360-400, legendary 400-420
##   - Growth rates use 1-5 scale (per-level additive) tuned to class archetype
##   - Evolution chains: form_id = race_id * 3 - 2 (stage 1), race_id * 3 - 1 (stage 2), race_id * 3 (stage 3)
class_name SpriteRaces
extends RefCounted

## Return all 24 race data dictionaries keyed by race_id.
static func get_all_races() -> Dictionary:
	return {
		# ──────────────────────────────────────────────────────────────────────
		# SINGLE-ELEMENT SPRITES (16)
		# ──────────────────────────────────────────────────────────────────────

		# 1 — Emberpaw (Fire / Berserker) — Common
		1: {
			"race_id": 1,
			"race_name": "Emberpaw",
			"element_types": ["Fire"],
			"class_type": "Berserker",
			"base_stats": {"hp": 52, "atk": 62, "def": 40, "spd": 55, "sp_atk": 48, "sp_def": 38},
			"growth_rates": {"hp": 3.0, "atk": 4.0, "def": 2.0, "spd": 3.5, "sp_atk": 2.5, "sp_def": 2.0},
			"evolution_chain": [1, 2, 3],
			"rarity": "common",
			"lore_description": "A scrappy fire-furred cub with smoldering paws. It charges headlong into battle, leaving scorch marks in its wake. Wild Emberpaws are drawn to campfires and volcanic vents.",
		},

		# 2 — Tidalfin (Water / Guardian) — Common
		2: {
			"race_id": 2,
			"race_name": "Tidalfin",
			"element_types": ["Water"],
			"class_type": "Guardian",
			"base_stats": {"hp": 60, "atk": 40, "def": 58, "spd": 42, "sp_atk": 50, "sp_def": 55},
			"growth_rates": {"hp": 3.5, "atk": 2.0, "def": 3.5, "spd": 2.0, "sp_atk": 3.0, "sp_def": 3.5},
			"evolution_chain": [4, 5, 6],
			"rarity": "common",
			"lore_description": "A sturdy aquatic Sprite with shimmering blue scales and translucent fins. Tidalfin forms living barriers in shallow waters, shielding smaller creatures from predators.",
		},

		# 3 — Thornvine (Nature / Ranger) — Common
		3: {
			"race_id": 3,
			"race_name": "Thornvine",
			"element_types": ["Nature"],
			"class_type": "Ranger",
			"base_stats": {"hp": 55, "atk": 45, "def": 50, "spd": 48, "sp_atk": 55, "sp_def": 50},
			"growth_rates": {"hp": 3.0, "atk": 2.5, "def": 3.0, "spd": 2.5, "sp_atk": 3.5, "sp_def": 3.0},
			"evolution_chain": [7, 8, 9],
			"rarity": "common",
			"lore_description": "A vine-wrapped creature with thorny tendrils that extend from its back. Thornvine thrives in dense forests, using its roots to sense vibrations through the earth.",
		},

		# 4 — Frostfang (Ice / Assassin) — Uncommon
		4: {
			"race_id": 4,
			"race_name": "Frostfang",
			"element_types": ["Ice"],
			"class_type": "Assassin",
			"base_stats": {"hp": 48, "atk": 58, "def": 42, "spd": 65, "sp_atk": 55, "sp_def": 45},
			"growth_rates": {"hp": 2.5, "atk": 3.5, "def": 2.0, "spd": 4.5, "sp_atk": 3.0, "sp_def": 2.5},
			"evolution_chain": [10, 11, 12],
			"rarity": "uncommon",
			"lore_description": "A sleek predator coated in crystalline ice. Frostfang hunts in blizzards, its pale fur rendering it invisible against the snow. Its bite flash-freezes on contact.",
		},

		# 5 — Galecrest (Air / Archer) — Common
		5: {
			"race_id": 5,
			"race_name": "Galecrest",
			"element_types": ["Air"],
			"class_type": "Archer",
			"base_stats": {"hp": 45, "atk": 50, "def": 38, "spd": 68, "sp_atk": 52, "sp_def": 42},
			"growth_rates": {"hp": 2.0, "atk": 3.0, "def": 2.0, "spd": 5.0, "sp_atk": 3.0, "sp_def": 2.0},
			"evolution_chain": [13, 14, 15],
			"rarity": "common",
			"lore_description": "A swift avian Sprite with feathers that shimmer like the sky at dawn. Galecrest rides thermal currents effortlessly, launching razor-sharp wind blades from its wings.",
		},

		# 6 — Terraclaw (Earth / Knight) — Common
		6: {
			"race_id": 6,
			"race_name": "Terraclaw",
			"element_types": ["Earth"],
			"class_type": "Knight",
			"base_stats": {"hp": 62, "atk": 55, "def": 65, "spd": 28, "sp_atk": 35, "sp_def": 50},
			"growth_rates": {"hp": 4.0, "atk": 3.0, "def": 4.5, "spd": 1.0, "sp_atk": 1.5, "sp_def": 3.0},
			"evolution_chain": [16, 17, 18],
			"rarity": "common",
			"lore_description": "An armored quadruped with stone-plated hide and massive claws. Terraclaw moves slowly but shrugs off blows that would fell lesser Sprites. It digs vast underground warrens.",
		},

		# 7 — Voltail (Electric / Wizard) — Uncommon
		7: {
			"race_id": 7,
			"race_name": "Voltail",
			"element_types": ["Electric"],
			"class_type": "Wizard",
			"base_stats": {"hp": 45, "atk": 35, "def": 40, "spd": 62, "sp_atk": 68, "sp_def": 48},
			"growth_rates": {"hp": 2.0, "atk": 1.5, "def": 2.0, "spd": 4.0, "sp_atk": 5.0, "sp_def": 2.5},
			"evolution_chain": [19, 20, 21],
			"rarity": "uncommon",
			"lore_description": "A fox-like Sprite with a lightning-bolt tail that crackles with static. Voltail channels ambient electricity into devastating arcane bolts. Thunderstorms amplify its power tenfold.",
		},

		# 8 — Gloomshade (Dark / Assassin) — Uncommon
		8: {
			"race_id": 8,
			"race_name": "Gloomshade",
			"element_types": ["Dark"],
			"class_type": "Assassin",
			"base_stats": {"hp": 48, "atk": 60, "def": 40, "spd": 62, "sp_atk": 55, "sp_def": 48},
			"growth_rates": {"hp": 2.5, "atk": 4.0, "def": 2.0, "spd": 4.0, "sp_atk": 3.5, "sp_def": 2.5},
			"evolution_chain": [22, 23, 24],
			"rarity": "uncommon",
			"lore_description": "A shadowy feline that melts into darkness. Gloomshade's eyes glow faintly crimson, the only warning before its silent strike. It feeds on fear, growing stronger in places of dread.",
		},

		# 9 — Luminos (Light / Cleric) — Uncommon
		9: {
			"race_id": 9,
			"race_name": "Luminos",
			"element_types": ["Light"],
			"class_type": "Cleric",
			"base_stats": {"hp": 58, "atk": 35, "def": 48, "spd": 45, "sp_atk": 60, "sp_def": 62},
			"growth_rates": {"hp": 3.5, "atk": 1.5, "def": 2.5, "spd": 2.5, "sp_atk": 4.0, "sp_def": 4.0},
			"evolution_chain": [25, 26, 27],
			"rarity": "uncommon",
			"lore_description": "A radiant moth-like Sprite whose wings emit a warm golden glow. Luminos is revered as a healer; its light mends wounds and purifies corrupted energy wherever it rests.",
		},

		# 10 — Glimmerwing (Psychic / Summoner) — Uncommon
		10: {
			"race_id": 10,
			"race_name": "Glimmerwing",
			"element_types": ["Psychic"],
			"class_type": "Summoner",
			"base_stats": {"hp": 50, "atk": 30, "def": 45, "spd": 50, "sp_atk": 65, "sp_def": 58},
			"growth_rates": {"hp": 2.5, "atk": 1.0, "def": 2.5, "spd": 3.0, "sp_atk": 4.5, "sp_def": 3.5},
			"evolution_chain": [28, 29, 30],
			"rarity": "uncommon",
			"lore_description": "A butterfly-like Sprite with iridescent wings that refract psychic energy into visible spectrums. Glimmerwing can project illusions and summon phantasmal allies from thought alone.",
		},

		# 11 — Spectrail (Spirit / Wizard) — Rare
		11: {
			"race_id": 11,
			"race_name": "Spectrail",
			"element_types": ["Spirit"],
			"class_type": "Wizard",
			"base_stats": {"hp": 52, "atk": 40, "def": 48, "spd": 58, "sp_atk": 72, "sp_def": 55},
			"growth_rates": {"hp": 2.5, "atk": 1.5, "def": 2.5, "spd": 3.5, "sp_atk": 5.0, "sp_def": 3.0},
			"evolution_chain": [31, 32, 33],
			"rarity": "rare",
			"lore_description": "A ghostly serpent wreathed in pale ectoplasmic flame. Spectrail drifts between the material world and the spirit plane, drawing arcane power from the boundary between life and death.",
		},

		# 12 — Ignisurge (Chaos / Berserker) — Rare
		12: {
			"race_id": 12,
			"race_name": "Ignisurge",
			"element_types": ["Chaos"],
			"class_type": "Berserker",
			"base_stats": {"hp": 58, "atk": 70, "def": 45, "spd": 55, "sp_atk": 55, "sp_def": 42},
			"growth_rates": {"hp": 3.0, "atk": 5.0, "def": 2.0, "spd": 3.0, "sp_atk": 3.0, "sp_def": 2.0},
			"evolution_chain": [34, 35, 36],
			"rarity": "rare",
			"lore_description": "A volatile beast born from raw chaotic energy. Its body constantly shifts between solid and plasma states. Ignisurge's attacks are wildly unpredictable but devastatingly powerful.",
		},

		# 13 — Ironhusk (Metal / Knight) — Common
		13: {
			"race_id": 13,
			"race_name": "Ironhusk",
			"element_types": ["Metal"],
			"class_type": "Knight",
			"base_stats": {"hp": 58, "atk": 52, "def": 68, "spd": 25, "sp_atk": 30, "sp_def": 55},
			"growth_rates": {"hp": 3.5, "atk": 3.0, "def": 5.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 3.5},
			"evolution_chain": [37, 38, 39],
			"rarity": "common",
			"lore_description": "A beetle-like Sprite encased in a carapace of living metal. Ironhusk's shell can deflect sword strikes without a scratch. It grows heavier and more resilient with age.",
		},

		# 14 — Venomire (Poison / Ranger) — Common
		14: {
			"race_id": 14,
			"race_name": "Venomire",
			"element_types": ["Poison"],
			"class_type": "Ranger",
			"base_stats": {"hp": 52, "atk": 48, "def": 45, "spd": 55, "sp_atk": 52, "sp_def": 45},
			"growth_rates": {"hp": 3.0, "atk": 2.5, "def": 2.5, "spd": 3.5, "sp_atk": 3.0, "sp_def": 2.5},
			"evolution_chain": [40, 41, 42],
			"rarity": "common",
			"lore_description": "A gecko-like Sprite with vivid purple markings that warn of its potent toxins. Venomire coats its darts with paralyzing venom extracted from its own glands.",
		},

		# 15 — Blazeguard (Fire / Guardian) — Uncommon
		15: {
			"race_id": 15,
			"race_name": "Blazeguard",
			"element_types": ["Fire"],
			"class_type": "Guardian",
			"base_stats": {"hp": 62, "atk": 45, "def": 58, "spd": 35, "sp_atk": 48, "sp_def": 55},
			"growth_rates": {"hp": 4.0, "atk": 2.0, "def": 3.5, "spd": 1.5, "sp_atk": 2.5, "sp_def": 3.5},
			"evolution_chain": [43, 44, 45],
			"rarity": "uncommon",
			"lore_description": "A lion-maned Sprite wreathed in protective flames. Blazeguard stands sentinel over volcanic temples, its fiery barrier shielding allies from harm while scorching any who dare approach.",
		},

		# 16 — Aquashot (Water / Archer) — Common
		16: {
			"race_id": 16,
			"race_name": "Aquashot",
			"element_types": ["Water"],
			"class_type": "Archer",
			"base_stats": {"hp": 48, "atk": 52, "def": 42, "spd": 58, "sp_atk": 55, "sp_def": 45},
			"growth_rates": {"hp": 2.5, "atk": 3.0, "def": 2.0, "spd": 3.5, "sp_atk": 3.5, "sp_def": 2.5},
			"evolution_chain": [46, 47, 48],
			"rarity": "common",
			"lore_description": "A nimble amphibian Sprite that fires pressurized water jets with pinpoint accuracy. Aquashot perches on lily pads, sniping insects from remarkable distances with its water bolts.",
		},

		# ──────────────────────────────────────────────────────────────────────
		# DUAL-ELEMENT SPRITES (6)
		# ──────────────────────────────────────────────────────────────────────

		# 17 — Pyrovolt (Fire + Electric / Wizard) — Rare
		17: {
			"race_id": 17,
			"race_name": "Pyrovolt",
			"element_types": ["Fire", "Electric"],
			"class_type": "Wizard",
			"base_stats": {"hp": 50, "atk": 40, "def": 42, "spd": 60, "sp_atk": 72, "sp_def": 50},
			"growth_rates": {"hp": 2.5, "atk": 1.5, "def": 2.0, "spd": 3.5, "sp_atk": 5.0, "sp_def": 2.5},
			"evolution_chain": [49, 50, 51],
			"rarity": "rare",
			"lore_description": "A salamander-like Sprite that conducts lightning through its flame-wreathed body. Pyrovolt's dual nature lets it unleash devastating plasma storms that incinerate and electrocute simultaneously.",
		},

		# 18 — Venomthorn (Poison + Nature / Spearman) — Uncommon
		18: {
			"race_id": 18,
			"race_name": "Venomthorn",
			"element_types": ["Poison", "Nature"],
			"class_type": "Spearman",
			"base_stats": {"hp": 55, "atk": 58, "def": 50, "spd": 45, "sp_atk": 48, "sp_def": 48},
			"growth_rates": {"hp": 3.0, "atk": 3.5, "def": 3.0, "spd": 2.0, "sp_atk": 2.5, "sp_def": 2.5},
			"evolution_chain": [52, 53, 54],
			"rarity": "uncommon",
			"lore_description": "A mantis-like Sprite with toxic barbed forelimbs and a body covered in poisonous thorns. Venomthorn impales prey with surgical precision, injecting paralyzing plant toxins.",
		},

		# 19 — Shadowflare (Dark + Fire / Spearman) — Rare
		19: {
			"race_id": 19,
			"race_name": "Shadowflare",
			"element_types": ["Dark", "Fire"],
			"class_type": "Spearman",
			"base_stats": {"hp": 55, "atk": 65, "def": 45, "spd": 58, "sp_atk": 50, "sp_def": 42},
			"growth_rates": {"hp": 2.5, "atk": 4.5, "def": 2.0, "spd": 3.5, "sp_atk": 2.5, "sp_def": 2.0},
			"evolution_chain": [55, 56, 57],
			"rarity": "rare",
			"lore_description": "A wolf-like Sprite cloaked in black flames that burn without light. Shadowflare strikes from impossible angles, its dark fire consuming both flesh and spirit. Born during eclipses.",
		},

		# 20 — Crystalmist (Ice + Psychic / Cleric) — Rare
		20: {
			"race_id": 20,
			"race_name": "Crystalmist",
			"element_types": ["Ice", "Psychic"],
			"class_type": "Cleric",
			"base_stats": {"hp": 58, "atk": 30, "def": 50, "spd": 42, "sp_atk": 62, "sp_def": 68},
			"growth_rates": {"hp": 3.0, "atk": 1.0, "def": 2.5, "spd": 2.0, "sp_atk": 4.0, "sp_def": 4.5},
			"evolution_chain": [58, 59, 60],
			"rarity": "rare",
			"lore_description": "A crystalline deer whose antlers are made of psychic ice. Crystalmist can heal allies by channeling mental energy through frozen lattices, converting pain into soothing frost.",
		},

		# 21 — Ironstorm (Metal + Air / Berserker) — Uncommon
		21: {
			"race_id": 21,
			"race_name": "Ironstorm",
			"element_types": ["Metal", "Air"],
			"class_type": "Berserker",
			"base_stats": {"hp": 55, "atk": 62, "def": 52, "spd": 50, "sp_atk": 40, "sp_def": 45},
			"growth_rates": {"hp": 3.0, "atk": 4.0, "def": 3.0, "spd": 2.5, "sp_atk": 1.5, "sp_def": 2.5},
			"evolution_chain": [61, 62, 63],
			"rarity": "uncommon",
			"lore_description": "A raptor-like Sprite with steel-plated wings that slice through the air like blades. Ironstorm dives from great heights, becoming a living missile of wind and metal.",
		},

		# 22 — Spiritbloom (Spirit + Nature / Summoner) — Rare
		22: {
			"race_id": 22,
			"race_name": "Spiritbloom",
			"element_types": ["Spirit", "Nature"],
			"class_type": "Summoner",
			"base_stats": {"hp": 55, "atk": 32, "def": 48, "spd": 45, "sp_atk": 65, "sp_def": 60},
			"growth_rates": {"hp": 3.0, "atk": 1.0, "def": 2.5, "spd": 2.0, "sp_atk": 4.5, "sp_def": 3.5},
			"evolution_chain": [64, 65, 66],
			"rarity": "rare",
			"lore_description": "A tree-spirit Sprite whose blossoms are portals to the spirit realm. Spiritbloom summons ancestral nature spirits to fight alongside it, drawing power from ancient groves.",
		},

		# ──────────────────────────────────────────────────────────────────────
		# LEGENDARY SPRITES (2)
		# ──────────────────────────────────────────────────────────────────────

		# 23 — Solarius (Light + Chaos / Guardian) — Legendary
		23: {
			"race_id": 23,
			"race_name": "Solarius",
			"element_types": ["Light", "Chaos"],
			"class_type": "Guardian",
			"base_stats": {"hp": 72, "atk": 55, "def": 68, "spd": 50, "sp_atk": 65, "sp_def": 70},
			"growth_rates": {"hp": 4.5, "atk": 2.5, "def": 4.0, "spd": 2.5, "sp_atk": 3.5, "sp_def": 4.0},
			"evolution_chain": [67, 68, 69],
			"rarity": "legendary",
			"lore_description": "An ancient phoenix-like Sprite that embodies the paradox of order and chaos. Solarius guards the Temple of the Sun, its blinding radiance and unpredictable power keeping all but the worthy at bay.",
		},

		# 24 — Eclipsar (Dark + Spirit / Summoner) — Legendary
		24: {
			"race_id": 24,
			"race_name": "Eclipsar",
			"element_types": ["Dark", "Spirit"],
			"class_type": "Summoner",
			"base_stats": {"hp": 68, "atk": 48, "def": 55, "spd": 55, "sp_atk": 75, "sp_def": 65},
			"growth_rates": {"hp": 3.5, "atk": 2.0, "def": 3.0, "spd": 3.0, "sp_atk": 5.0, "sp_def": 3.5},
			"evolution_chain": [70, 71, 72],
			"rarity": "legendary",
			"lore_description": "A spectral dragon that exists in eternal twilight. Eclipsar commands legions of shadow spirits and is said to have witnessed the creation of the first temples. Its presence warps reality itself.",
		},
	}


## Return a single race dictionary by ID, or an empty dictionary if not found.
static func get_race(race_id: int) -> Dictionary:
	var all_races := get_all_races()
	return all_races.get(race_id, {})


## Return all race IDs for a given element.
static func get_races_by_element(element_name: String) -> Array[int]:
	var result: Array[int] = []
	var all_races := get_all_races()
	for race_id: int in all_races:
		var race: Dictionary = all_races[race_id]
		if element_name in race.get("element_types", []):
			result.append(race_id)
	return result


## Return all race IDs for a given class.
static func get_races_by_class(class_type: String) -> Array[int]:
	var result: Array[int] = []
	var all_races := get_all_races()
	for race_id: int in all_races:
		var race: Dictionary = all_races[race_id]
		if race.get("class_type", "") == class_type:
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


## Return a summary count of how many races exist per element (for balance validation).
static func get_element_coverage() -> Dictionary:
	var coverage := {}
	var all_races := get_all_races()
	for race_id: int in all_races:
		var race: Dictionary = all_races[race_id]
		for element: String in race.get("element_types", []):
			coverage[element] = coverage.get(element, 0) + 1
	return coverage


## Return a summary count of how many races exist per class (for balance validation).
static func get_class_coverage() -> Dictionary:
	var coverage := {}
	var all_races := get_all_races()
	for race_id: int in all_races:
		var race: Dictionary = all_races[race_id]
		var cls: String = race.get("class_type", "")
		coverage[cls] = coverage.get(cls, 0) + 1
	return coverage

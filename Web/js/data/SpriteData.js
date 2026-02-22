/**
 * SpriteData.js — All 24 Sprite races and 72 evolution forms.
 * Ported from SpriteRaces.gd and EvolutionData.gd.
 *
 * 16 single-element + 6 dual-element + 2 legendary = 24 races
 * form_id formula: race_id * 3 - 2 (stage 1), race_id * 3 - 1 (stage 2), race_id * 3 (stage 3)
 *
 * @typedef {Object} SpriteRace
 * @property {number} race_id
 * @property {string} race_name
 * @property {string[]} element_types
 * @property {string} class_type
 * @property {{ hp:number, atk:number, def:number, spd:number, sp_atk:number, sp_def:number }} base_stats
 * @property {{ hp:number, atk:number, def:number, spd:number, sp_atk:number, sp_def:number }} growth_rates
 * @property {number[]} evolution_chain — form_ids for stages 1-3
 * @property {string} rarity — "common","uncommon","rare","legendary"
 * @property {string} lore_description
 *
 * @typedef {Object} AbilityChange
 * @property {number} learn_level
 * @property {number} ability_id
 * @property {number} replaces_ability_id — -1 if no replacement
 *
 * @typedef {Object} EvolutionForm
 * @property {number} form_id
 * @property {number} race_id
 * @property {number} stage_number — 1, 2, or 3
 * @property {{ hp:number, atk:number, def:number, spd:number, sp_atk:number, sp_def:number }} stat_multipliers
 * @property {AbilityChange[]} ability_changes
 * @property {string} evolution_trigger_type — "none","level","item"
 * @property {number} evolution_trigger_value
 * @property {string} evolution_trigger_description
 */

// ─────────────────────────────────────────────────────────────────────────────
// SPRITE RACES (24)
// ─────────────────────────────────────────────────────────────────────────────

/** @type {SpriteRace[]} */
export const SPRITE_RACES = [
	// ── SINGLE-ELEMENT SPRITES (16) ──

	// 1 — Emberpaw (Fire / Berserker) — Common
	{
		race_id: 1,
		race_name: "Emberpaw",
		element_types: ["Fire"],
		class_type: "Berserker",
		base_stats: { hp: 52, atk: 62, def: 40, spd: 55, sp_atk: 48, sp_def: 38 },
		growth_rates: { hp: 3.0, atk: 4.0, def: 2.0, spd: 3.5, sp_atk: 2.5, sp_def: 2.0 },
		evolution_chain: [1, 2, 3],
		rarity: "common",
		lore_description: "A scrappy fire-furred cub with smoldering paws. It charges headlong into battle, leaving scorch marks in its wake. Wild Emberpaws are drawn to campfires and volcanic vents.",
	},

	// 2 — Tidalfin (Water / Guardian) — Common
	{
		race_id: 2,
		race_name: "Tidalfin",
		element_types: ["Water"],
		class_type: "Guardian",
		base_stats: { hp: 60, atk: 40, def: 58, spd: 42, sp_atk: 50, sp_def: 55 },
		growth_rates: { hp: 3.5, atk: 2.0, def: 3.5, spd: 2.0, sp_atk: 3.0, sp_def: 3.5 },
		evolution_chain: [4, 5, 6],
		rarity: "common",
		lore_description: "A sturdy aquatic Sprite with shimmering blue scales and translucent fins. Tidalfin forms living barriers in shallow waters, shielding smaller creatures from predators.",
	},

	// 3 — Thornvine (Nature / Ranger) — Common
	{
		race_id: 3,
		race_name: "Thornvine",
		element_types: ["Nature"],
		class_type: "Ranger",
		base_stats: { hp: 55, atk: 45, def: 50, spd: 48, sp_atk: 55, sp_def: 50 },
		growth_rates: { hp: 3.0, atk: 2.5, def: 3.0, spd: 2.5, sp_atk: 3.5, sp_def: 3.0 },
		evolution_chain: [7, 8, 9],
		rarity: "common",
		lore_description: "A vine-wrapped creature with thorny tendrils that extend from its back. Thornvine thrives in dense forests, using its roots to sense vibrations through the earth.",
	},

	// 4 — Frostfang (Ice / Assassin) — Uncommon
	{
		race_id: 4,
		race_name: "Frostfang",
		element_types: ["Ice"],
		class_type: "Assassin",
		base_stats: { hp: 48, atk: 58, def: 42, spd: 65, sp_atk: 55, sp_def: 45 },
		growth_rates: { hp: 2.5, atk: 3.5, def: 2.0, spd: 4.5, sp_atk: 3.0, sp_def: 2.5 },
		evolution_chain: [10, 11, 12],
		rarity: "uncommon",
		lore_description: "A sleek predator coated in crystalline ice. Frostfang hunts in blizzards, its pale fur rendering it invisible against the snow. Its bite flash-freezes on contact.",
	},

	// 5 — Galecrest (Air / Archer) — Common
	{
		race_id: 5,
		race_name: "Galecrest",
		element_types: ["Air"],
		class_type: "Archer",
		base_stats: { hp: 45, atk: 50, def: 38, spd: 68, sp_atk: 52, sp_def: 42 },
		growth_rates: { hp: 2.0, atk: 3.0, def: 2.0, spd: 5.0, sp_atk: 3.0, sp_def: 2.0 },
		evolution_chain: [13, 14, 15],
		rarity: "common",
		lore_description: "A swift avian Sprite with feathers that shimmer like the sky at dawn. Galecrest rides thermal currents effortlessly, launching razor-sharp wind blades from its wings.",
	},

	// 6 — Terraclaw (Earth / Knight) — Common
	{
		race_id: 6,
		race_name: "Terraclaw",
		element_types: ["Earth"],
		class_type: "Knight",
		base_stats: { hp: 62, atk: 55, def: 65, spd: 28, sp_atk: 35, sp_def: 50 },
		growth_rates: { hp: 4.0, atk: 3.0, def: 4.5, spd: 1.0, sp_atk: 1.5, sp_def: 3.0 },
		evolution_chain: [16, 17, 18],
		rarity: "common",
		lore_description: "An armored quadruped with stone-plated hide and massive claws. Terraclaw moves slowly but shrugs off blows that would fell lesser Sprites. It digs vast underground warrens.",
	},

	// 7 — Voltail (Electric / Wizard) — Uncommon
	{
		race_id: 7,
		race_name: "Voltail",
		element_types: ["Electric"],
		class_type: "Wizard",
		base_stats: { hp: 45, atk: 35, def: 40, spd: 62, sp_atk: 68, sp_def: 48 },
		growth_rates: { hp: 2.0, atk: 1.5, def: 2.0, spd: 4.0, sp_atk: 5.0, sp_def: 2.5 },
		evolution_chain: [19, 20, 21],
		rarity: "uncommon",
		lore_description: "A fox-like Sprite with a lightning-bolt tail that crackles with static. Voltail channels ambient electricity into devastating arcane bolts. Thunderstorms amplify its power tenfold.",
	},

	// 8 — Gloomshade (Dark / Assassin) — Uncommon
	{
		race_id: 8,
		race_name: "Gloomshade",
		element_types: ["Dark"],
		class_type: "Assassin",
		base_stats: { hp: 48, atk: 60, def: 40, spd: 62, sp_atk: 55, sp_def: 48 },
		growth_rates: { hp: 2.5, atk: 4.0, def: 2.0, spd: 4.0, sp_atk: 3.5, sp_def: 2.5 },
		evolution_chain: [22, 23, 24],
		rarity: "uncommon",
		lore_description: "A shadowy feline that melts into darkness. Gloomshade's eyes glow faintly crimson, the only warning before its silent strike. It feeds on fear, growing stronger in places of dread.",
	},

	// 9 — Luminos (Light / Cleric) — Uncommon
	{
		race_id: 9,
		race_name: "Luminos",
		element_types: ["Light"],
		class_type: "Cleric",
		base_stats: { hp: 58, atk: 35, def: 48, spd: 45, sp_atk: 60, sp_def: 62 },
		growth_rates: { hp: 3.5, atk: 1.5, def: 2.5, spd: 2.5, sp_atk: 4.0, sp_def: 4.0 },
		evolution_chain: [25, 26, 27],
		rarity: "uncommon",
		lore_description: "A radiant moth-like Sprite whose wings emit a warm golden glow. Luminos is revered as a healer; its light mends wounds and purifies corrupted energy wherever it rests.",
	},

	// 10 — Glimmerwing (Psychic / Summoner) — Uncommon
	{
		race_id: 10,
		race_name: "Glimmerwing",
		element_types: ["Psychic"],
		class_type: "Summoner",
		base_stats: { hp: 50, atk: 30, def: 45, spd: 50, sp_atk: 65, sp_def: 58 },
		growth_rates: { hp: 2.5, atk: 1.0, def: 2.5, spd: 3.0, sp_atk: 4.5, sp_def: 3.5 },
		evolution_chain: [28, 29, 30],
		rarity: "uncommon",
		lore_description: "A butterfly-like Sprite with iridescent wings that refract psychic energy into visible spectrums. Glimmerwing can project illusions and summon phantasmal allies from thought alone.",
	},

	// 11 — Spectrail (Spirit / Wizard) — Rare
	{
		race_id: 11,
		race_name: "Spectrail",
		element_types: ["Spirit"],
		class_type: "Wizard",
		base_stats: { hp: 52, atk: 40, def: 48, spd: 58, sp_atk: 72, sp_def: 55 },
		growth_rates: { hp: 2.5, atk: 1.5, def: 2.5, spd: 3.5, sp_atk: 5.0, sp_def: 3.0 },
		evolution_chain: [31, 32, 33],
		rarity: "rare",
		lore_description: "A ghostly serpent wreathed in pale ectoplasmic flame. Spectrail drifts between the material world and the spirit plane, drawing arcane power from the boundary between life and death.",
	},

	// 12 — Ignisurge (Chaos / Berserker) — Rare
	{
		race_id: 12,
		race_name: "Ignisurge",
		element_types: ["Chaos"],
		class_type: "Berserker",
		base_stats: { hp: 58, atk: 70, def: 45, spd: 55, sp_atk: 55, sp_def: 42 },
		growth_rates: { hp: 3.0, atk: 5.0, def: 2.0, spd: 3.0, sp_atk: 3.0, sp_def: 2.0 },
		evolution_chain: [34, 35, 36],
		rarity: "rare",
		lore_description: "A volatile beast born from raw chaotic energy. Its body constantly shifts between solid and plasma states. Ignisurge's attacks are wildly unpredictable but devastatingly powerful.",
	},

	// 13 — Ironhusk (Metal / Knight) — Common
	{
		race_id: 13,
		race_name: "Ironhusk",
		element_types: ["Metal"],
		class_type: "Knight",
		base_stats: { hp: 58, atk: 52, def: 68, spd: 25, sp_atk: 30, sp_def: 55 },
		growth_rates: { hp: 3.5, atk: 3.0, def: 5.0, spd: 1.0, sp_atk: 1.0, sp_def: 3.5 },
		evolution_chain: [37, 38, 39],
		rarity: "common",
		lore_description: "A beetle-like Sprite encased in a carapace of living metal. Ironhusk's shell can deflect sword strikes without a scratch. It grows heavier and more resilient with age.",
	},

	// 14 — Venomire (Poison / Ranger) — Common
	{
		race_id: 14,
		race_name: "Venomire",
		element_types: ["Poison"],
		class_type: "Ranger",
		base_stats: { hp: 52, atk: 48, def: 45, spd: 55, sp_atk: 52, sp_def: 45 },
		growth_rates: { hp: 3.0, atk: 2.5, def: 2.5, spd: 3.5, sp_atk: 3.0, sp_def: 2.5 },
		evolution_chain: [40, 41, 42],
		rarity: "common",
		lore_description: "A gecko-like Sprite with vivid purple markings that warn of its potent toxins. Venomire coats its darts with paralyzing venom extracted from its own glands.",
	},

	// 15 — Blazeguard (Fire / Guardian) — Uncommon
	{
		race_id: 15,
		race_name: "Blazeguard",
		element_types: ["Fire"],
		class_type: "Guardian",
		base_stats: { hp: 62, atk: 45, def: 58, spd: 35, sp_atk: 48, sp_def: 55 },
		growth_rates: { hp: 4.0, atk: 2.0, def: 3.5, spd: 1.5, sp_atk: 2.5, sp_def: 3.5 },
		evolution_chain: [43, 44, 45],
		rarity: "uncommon",
		lore_description: "A lion-maned Sprite wreathed in protective flames. Blazeguard stands sentinel over volcanic temples, its fiery barrier shielding allies from harm while scorching any who dare approach.",
	},

	// 16 — Aquashot (Water / Archer) — Common
	{
		race_id: 16,
		race_name: "Aquashot",
		element_types: ["Water"],
		class_type: "Archer",
		base_stats: { hp: 48, atk: 52, def: 42, spd: 58, sp_atk: 55, sp_def: 45 },
		growth_rates: { hp: 2.5, atk: 3.0, def: 2.0, spd: 3.5, sp_atk: 3.5, sp_def: 2.5 },
		evolution_chain: [46, 47, 48],
		rarity: "common",
		lore_description: "A nimble amphibian Sprite that fires pressurized water jets with pinpoint accuracy. Aquashot perches on lily pads, sniping insects from remarkable distances with its water bolts.",
	},

	// ── DUAL-ELEMENT SPRITES (6) ──

	// 17 — Pyrovolt (Fire + Electric / Wizard) — Rare
	{
		race_id: 17,
		race_name: "Pyrovolt",
		element_types: ["Fire", "Electric"],
		class_type: "Wizard",
		base_stats: { hp: 50, atk: 40, def: 42, spd: 60, sp_atk: 72, sp_def: 50 },
		growth_rates: { hp: 2.5, atk: 1.5, def: 2.0, spd: 3.5, sp_atk: 5.0, sp_def: 2.5 },
		evolution_chain: [49, 50, 51],
		rarity: "rare",
		lore_description: "A salamander-like Sprite that conducts lightning through its flame-wreathed body. Pyrovolt's dual nature lets it unleash devastating plasma storms that incinerate and electrocute simultaneously.",
	},

	// 18 — Venomthorn (Poison + Nature / Spearman) — Uncommon
	{
		race_id: 18,
		race_name: "Venomthorn",
		element_types: ["Poison", "Nature"],
		class_type: "Spearman",
		base_stats: { hp: 55, atk: 58, def: 50, spd: 45, sp_atk: 48, sp_def: 48 },
		growth_rates: { hp: 3.0, atk: 3.5, def: 3.0, spd: 2.0, sp_atk: 2.5, sp_def: 2.5 },
		evolution_chain: [52, 53, 54],
		rarity: "uncommon",
		lore_description: "A mantis-like Sprite with toxic barbed forelimbs and a body covered in poisonous thorns. Venomthorn impales prey with surgical precision, injecting paralyzing plant toxins.",
	},

	// 19 — Shadowflare (Dark + Fire / Spearman) — Rare
	{
		race_id: 19,
		race_name: "Shadowflare",
		element_types: ["Dark", "Fire"],
		class_type: "Spearman",
		base_stats: { hp: 55, atk: 65, def: 45, spd: 58, sp_atk: 50, sp_def: 42 },
		growth_rates: { hp: 2.5, atk: 4.5, def: 2.0, spd: 3.5, sp_atk: 2.5, sp_def: 2.0 },
		evolution_chain: [55, 56, 57],
		rarity: "rare",
		lore_description: "A wolf-like Sprite cloaked in black flames that burn without light. Shadowflare strikes from impossible angles, its dark fire consuming both flesh and spirit. Born during eclipses.",
	},

	// 20 — Crystalmist (Ice + Psychic / Cleric) — Rare
	{
		race_id: 20,
		race_name: "Crystalmist",
		element_types: ["Ice", "Psychic"],
		class_type: "Cleric",
		base_stats: { hp: 58, atk: 30, def: 50, spd: 42, sp_atk: 62, sp_def: 68 },
		growth_rates: { hp: 3.0, atk: 1.0, def: 2.5, spd: 2.0, sp_atk: 4.0, sp_def: 4.5 },
		evolution_chain: [58, 59, 60],
		rarity: "rare",
		lore_description: "A crystalline deer whose antlers are made of psychic ice. Crystalmist can heal allies by channeling mental energy through frozen lattices, converting pain into soothing frost.",
	},

	// 21 — Ironstorm (Metal + Air / Berserker) — Uncommon
	{
		race_id: 21,
		race_name: "Ironstorm",
		element_types: ["Metal", "Air"],
		class_type: "Berserker",
		base_stats: { hp: 55, atk: 62, def: 52, spd: 50, sp_atk: 40, sp_def: 45 },
		growth_rates: { hp: 3.0, atk: 4.0, def: 3.0, spd: 2.5, sp_atk: 1.5, sp_def: 2.5 },
		evolution_chain: [61, 62, 63],
		rarity: "uncommon",
		lore_description: "A raptor-like Sprite with steel-plated wings that slice through the air like blades. Ironstorm dives from great heights, becoming a living missile of wind and metal.",
	},

	// 22 — Spiritbloom (Spirit + Nature / Summoner) — Rare
	{
		race_id: 22,
		race_name: "Spiritbloom",
		element_types: ["Spirit", "Nature"],
		class_type: "Summoner",
		base_stats: { hp: 55, atk: 32, def: 48, spd: 45, sp_atk: 65, sp_def: 60 },
		growth_rates: { hp: 3.0, atk: 1.0, def: 2.5, spd: 2.0, sp_atk: 4.5, sp_def: 3.5 },
		evolution_chain: [64, 65, 66],
		rarity: "rare",
		lore_description: "A tree-spirit Sprite whose blossoms are portals to the spirit realm. Spiritbloom summons ancestral nature spirits to fight alongside it, drawing power from ancient groves.",
	},

	// ── LEGENDARY SPRITES (2) ──

	// 23 — Solarius (Light + Chaos / Guardian) — Legendary
	{
		race_id: 23,
		race_name: "Solarius",
		element_types: ["Light", "Chaos"],
		class_type: "Guardian",
		base_stats: { hp: 72, atk: 55, def: 68, spd: 50, sp_atk: 65, sp_def: 70 },
		growth_rates: { hp: 4.5, atk: 2.5, def: 4.0, spd: 2.5, sp_atk: 3.5, sp_def: 4.0 },
		evolution_chain: [67, 68, 69],
		rarity: "legendary",
		lore_description: "An ancient phoenix-like Sprite that embodies the paradox of order and chaos. Solarius guards the Temple of the Sun, its blinding radiance and unpredictable power keeping all but the worthy at bay.",
	},

	// 24 — Eclipsar (Dark + Spirit / Summoner) — Legendary
	{
		race_id: 24,
		race_name: "Eclipsar",
		element_types: ["Dark", "Spirit"],
		class_type: "Summoner",
		base_stats: { hp: 68, atk: 48, def: 55, spd: 55, sp_atk: 75, sp_def: 65 },
		growth_rates: { hp: 3.5, atk: 2.0, def: 3.0, spd: 3.0, sp_atk: 5.0, sp_def: 3.5 },
		evolution_chain: [70, 71, 72],
		rarity: "legendary",
		lore_description: "A spectral dragon that exists in eternal twilight. Eclipsar commands legions of shadow spirits and is said to have witnessed the creation of the first temples. Its presence warps reality itself.",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// EVOLUTION FORMS (72) — keyed by form_id
// ─────────────────────────────────────────────────────────────────────────────

/** @type {{ [form_id: number]: EvolutionForm }} */
export const EVOLUTION_FORMS = {
	// ── RACE 1 — Emberpaw -> Infernoclaw -> Blazerath (Fire / Berserker) ──
	1:  { form_id: 1,  race_id: 1,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	2:  { form_id: 2,  race_id: 1,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.5, def: 1.3, spd: 1.4, sp_atk: 1.3, sp_def: 1.3 }, ability_changes: [{ learn_level: 16, ability_id: 5, replaces_ability_id: -1 }, { learn_level: 20, ability_id: 8, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 16, evolution_trigger_description: "Evolves at level 16." },
	3:  { form_id: 3,  race_id: 1,  stage_number: 3, stat_multipliers: { hp: 1.6, atk: 2.0, def: 1.6, spd: 1.8, sp_atk: 1.6, sp_def: 1.6 }, ability_changes: [{ learn_level: 32, ability_id: 10, replaces_ability_id: 1 }, { learn_level: 36, ability_id: 11, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 32, evolution_trigger_description: "Evolves at level 32." },

	// ── RACE 2 — Tidalfin -> Torrentscale -> Abyssguard (Water / Guardian) ──
	4:  { form_id: 4,  race_id: 2,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	5:  { form_id: 5,  race_id: 2,  stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.4, spd: 1.3, sp_atk: 1.3, sp_def: 1.4 }, ability_changes: [{ learn_level: 17, ability_id: 16, replaces_ability_id: -1 }, { learn_level: 21, ability_id: 19, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	6:  { form_id: 6,  race_id: 2,  stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.6, def: 1.9, spd: 1.6, sp_atk: 1.7, sp_def: 1.9 }, ability_changes: [{ learn_level: 34, ability_id: 22, replaces_ability_id: 12 }, { learn_level: 36, ability_id: 23, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 3 — Thornvine -> Briarwarden -> Sylvanguard (Nature / Ranger) ──
	7:  { form_id: 7,  race_id: 3,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	8:  { form_id: 8,  race_id: 3,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.4, spd: 1.3, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 16, ability_id: 27, replaces_ability_id: -1 }, { learn_level: 19, ability_id: 30, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 16, evolution_trigger_description: "Evolves at level 16." },
	9:  { form_id: 9,  race_id: 3,  stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.6, def: 1.8, spd: 1.6, sp_atk: 1.8, sp_def: 1.7 }, ability_changes: [{ learn_level: 33, ability_id: 33, replaces_ability_id: 24 }, { learn_level: 36, ability_id: 34, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 33, evolution_trigger_description: "Evolves at level 33." },

	// ── RACE 4 — Frostfang -> Glacierclaw -> Blizzarbane (Ice / Assassin) ──
	10: { form_id: 10, race_id: 4,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	11: { form_id: 11, race_id: 4,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.4, def: 1.3, spd: 1.5, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 18, ability_id: 38, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 41, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	12: { form_id: 12, race_id: 4,  stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.8, def: 1.6, spd: 2.0, sp_atk: 1.8, sp_def: 1.6 }, ability_changes: [{ learn_level: 35, ability_id: 44, replaces_ability_id: 35 }, { learn_level: 36, ability_id: 45, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 101, evolution_trigger_description: "Evolves when exposed to a Frost Shard." },

	// ── RACE 5 — Galecrest -> Stormwing -> Tempestlord (Air / Archer) ──
	13: { form_id: 13, race_id: 5,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	14: { form_id: 14, race_id: 5,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.5, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 16, ability_id: 49, replaces_ability_id: -1 }, { learn_level: 20, ability_id: 52, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 16, evolution_trigger_description: "Evolves at level 16." },
	15: { form_id: 15, race_id: 5,  stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.7, def: 1.6, spd: 2.0, sp_atk: 1.8, sp_def: 1.6 }, ability_changes: [{ learn_level: 34, ability_id: 55, replaces_ability_id: 46 }, { learn_level: 36, ability_id: 56, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 6 — Terraclaw -> Boulderknee -> Monolithion (Earth / Knight) ──
	16: { form_id: 16, race_id: 6,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	17: { form_id: 17, race_id: 6,  stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.5, spd: 1.3, sp_atk: 1.3, sp_def: 1.4 }, ability_changes: [{ learn_level: 18, ability_id: 60, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 63, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	18: { form_id: 18, race_id: 6,  stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.7, def: 2.0, spd: 1.6, sp_atk: 1.6, sp_def: 1.8 }, ability_changes: [{ learn_level: 34, ability_id: 66, replaces_ability_id: 57 }, { learn_level: 36, ability_id: 67, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 7 — Voltail -> Arcstrike -> Thunderlord (Electric / Wizard) ──
	19: { form_id: 19, race_id: 7,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	20: { form_id: 20, race_id: 7,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.4, sp_atk: 1.5, sp_def: 1.3 }, ability_changes: [{ learn_level: 17, ability_id: 71, replaces_ability_id: -1 }, { learn_level: 21, ability_id: 74, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	21: { form_id: 21, race_id: 7,  stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.6, def: 1.6, spd: 1.8, sp_atk: 2.0, sp_def: 1.7 }, ability_changes: [{ learn_level: 33, ability_id: 77, replaces_ability_id: 68 }, { learn_level: 36, ability_id: 78, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 33, evolution_trigger_description: "Evolves at level 33." },

	// ── RACE 8 — Gloomshade -> Nightfang -> Voidreaver (Dark / Assassin) ──
	22: { form_id: 22, race_id: 8,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	23: { form_id: 23, race_id: 8,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.5, def: 1.3, spd: 1.4, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 18, ability_id: 82, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 85, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	24: { form_id: 24, race_id: 8,  stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.9, def: 1.6, spd: 1.8, sp_atk: 1.8, sp_def: 1.6 }, ability_changes: [{ learn_level: 35, ability_id: 88, replaces_ability_id: 79 }, { learn_level: 36, ability_id: 89, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 102, evolution_trigger_description: "Evolves when exposed to a Shadow Gem." },

	// ── RACE 9 — Luminos -> Radiancewing -> Dawnkeeper (Light / Cleric) ──
	25: { form_id: 25, race_id: 9,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	26: { form_id: 26, race_id: 9,  stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.3, spd: 1.3, sp_atk: 1.4, sp_def: 1.5 }, ability_changes: [{ learn_level: 17, ability_id: 93, replaces_ability_id: -1 }, { learn_level: 20, ability_id: 96, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	27: { form_id: 27, race_id: 9,  stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.6, def: 1.7, spd: 1.6, sp_atk: 1.9, sp_def: 2.0 }, ability_changes: [{ learn_level: 34, ability_id: 99, replaces_ability_id: 90 }, { learn_level: 36, ability_id: 100, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 10 — Glimmerwing -> Prismoth -> Mindweaver (Psychic / Summoner) ──
	28: { form_id: 28, race_id: 10, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	29: { form_id: 29, race_id: 10, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.3, sp_atk: 1.5, sp_def: 1.4 }, ability_changes: [{ learn_level: 18, ability_id: 104, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 107, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	30: { form_id: 30, race_id: 10, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.6, def: 1.6, spd: 1.7, sp_atk: 2.0, sp_def: 1.8 }, ability_changes: [{ learn_level: 35, ability_id: 110, replaces_ability_id: 101 }, { learn_level: 36, ability_id: 111, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 35, evolution_trigger_description: "Evolves at level 35." },

	// ── RACE 11 — Spectrail -> Phantomcoil -> Ethereon (Spirit / Wizard) ──
	31: { form_id: 31, race_id: 11, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	32: { form_id: 32, race_id: 11, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.4, sp_atk: 1.5, sp_def: 1.4 }, ability_changes: [{ learn_level: 19, ability_id: 115, replaces_ability_id: -1 }, { learn_level: 23, ability_id: 118, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 19, evolution_trigger_description: "Evolves at level 19." },
	33: { form_id: 33, race_id: 11, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.6, def: 1.7, spd: 1.8, sp_atk: 2.0, sp_def: 1.8 }, ability_changes: [{ learn_level: 35, ability_id: 121, replaces_ability_id: 112 }, { learn_level: 36, ability_id: 122, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 103, evolution_trigger_description: "Evolves when exposed to a Spirit Essence." },

	// ── RACE 12 — Ignisurge -> Chaosflame -> Entropyrex (Chaos / Berserker) ──
	34: { form_id: 34, race_id: 12, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	35: { form_id: 35, race_id: 12, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.5, def: 1.3, spd: 1.4, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 20, ability_id: 126, replaces_ability_id: -1 }, { learn_level: 24, ability_id: 129, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 20, evolution_trigger_description: "Evolves at level 20." },
	36: { form_id: 36, race_id: 12, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 2.0, def: 1.6, spd: 1.8, sp_atk: 1.8, sp_def: 1.6 }, ability_changes: [{ learn_level: 36, ability_id: 132, replaces_ability_id: 123 }, { learn_level: 36, ability_id: 133, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 104, evolution_trigger_description: "Evolves when exposed to a Chaos Crystal." },

	// ── RACE 13 — Ironhusk -> Steelshell -> Titanforge (Metal / Knight) ──
	37: { form_id: 37, race_id: 13, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	38: { form_id: 38, race_id: 13, stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.5, spd: 1.3, sp_atk: 1.3, sp_def: 1.4 }, ability_changes: [{ learn_level: 18, ability_id: 137, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 140, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	39: { form_id: 39, race_id: 13, stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.7, def: 2.0, spd: 1.6, sp_atk: 1.6, sp_def: 1.8 }, ability_changes: [{ learn_level: 34, ability_id: 143, replaces_ability_id: 134 }, { learn_level: 36, ability_id: 144, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 14 — Venomire -> Toxicscale -> Plaguestalker (Poison / Ranger) ──
	40: { form_id: 40, race_id: 14, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	41: { form_id: 41, race_id: 14, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.4, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 16, ability_id: 148, replaces_ability_id: -1 }, { learn_level: 20, ability_id: 151, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 16, evolution_trigger_description: "Evolves at level 16." },
	42: { form_id: 42, race_id: 14, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.7, def: 1.7, spd: 1.8, sp_atk: 1.8, sp_def: 1.7 }, ability_changes: [{ learn_level: 33, ability_id: 154, replaces_ability_id: 145 }, { learn_level: 36, ability_id: 155, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 33, evolution_trigger_description: "Evolves at level 33." },

	// ── RACE 15 — Blazeguard -> Infernowall -> Magmashield (Fire / Guardian) ──
	43: { form_id: 43, race_id: 15, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	44: { form_id: 44, race_id: 15, stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.4, spd: 1.3, sp_atk: 1.3, sp_def: 1.4 }, ability_changes: [{ learn_level: 17, ability_id: 6, replaces_ability_id: -1 }, { learn_level: 21, ability_id: 9, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	45: { form_id: 45, race_id: 15, stage_number: 3, stat_multipliers: { hp: 1.9, atk: 1.6, def: 1.8, spd: 1.6, sp_atk: 1.7, sp_def: 1.8 }, ability_changes: [{ learn_level: 34, ability_id: 10, replaces_ability_id: 1 }, { learn_level: 36, ability_id: 11, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 16 — Aquashot -> Torrentbow -> Tidesurfer (Water / Archer) ──
	46: { form_id: 46, race_id: 16, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	47: { form_id: 47, race_id: 16, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.4, def: 1.3, spd: 1.4, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 17, ability_id: 17, replaces_ability_id: -1 }, { learn_level: 21, ability_id: 20, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	48: { form_id: 48, race_id: 16, stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.8, def: 1.6, spd: 1.8, sp_atk: 1.8, sp_def: 1.6 }, ability_changes: [{ learn_level: 34, ability_id: 22, replaces_ability_id: 12 }, { learn_level: 36, ability_id: 23, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 17 — Pyrovolt -> Plasmaflare -> Thunderblaze (Fire+Electric / Wizard) ──
	49: { form_id: 49, race_id: 17, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	50: { form_id: 50, race_id: 17, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.4, sp_atk: 1.5, sp_def: 1.3 }, ability_changes: [{ learn_level: 19, ability_id: 8, replaces_ability_id: -1 }, { learn_level: 23, ability_id: 74, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 19, evolution_trigger_description: "Evolves at level 19." },
	51: { form_id: 51, race_id: 17, stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.6, def: 1.6, spd: 1.8, sp_atk: 2.0, sp_def: 1.7 }, ability_changes: [{ learn_level: 35, ability_id: 11, replaces_ability_id: 1 }, { learn_level: 36, ability_id: 78, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 35, evolution_trigger_description: "Evolves at level 35." },

	// ── RACE 18 — Venomthorn -> Blightstinger -> Plaguebramble (Poison+Nature / Spearman) ──
	52: { form_id: 52, race_id: 18, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	53: { form_id: 53, race_id: 18, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.4, def: 1.3, spd: 1.3, sp_atk: 1.3, sp_def: 1.3 }, ability_changes: [{ learn_level: 17, ability_id: 148, replaces_ability_id: -1 }, { learn_level: 21, ability_id: 30, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	54: { form_id: 54, race_id: 18, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.8, def: 1.7, spd: 1.6, sp_atk: 1.7, sp_def: 1.7 }, ability_changes: [{ learn_level: 34, ability_id: 155, replaces_ability_id: 145 }, { learn_level: 36, ability_id: 34, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 19 — Shadowflare -> Duskblade -> Eclipsefire (Dark+Fire / Spearman) ──
	55: { form_id: 55, race_id: 19, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	56: { form_id: 56, race_id: 19, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.5, def: 1.3, spd: 1.4, sp_atk: 1.3, sp_def: 1.3 }, ability_changes: [{ learn_level: 19, ability_id: 82, replaces_ability_id: -1 }, { learn_level: 23, ability_id: 8, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 19, evolution_trigger_description: "Evolves at level 19." },
	57: { form_id: 57, race_id: 19, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 2.0, def: 1.6, spd: 1.8, sp_atk: 1.7, sp_def: 1.6 }, ability_changes: [{ learn_level: 35, ability_id: 89, replaces_ability_id: 79 }, { learn_level: 36, ability_id: 11, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 105, evolution_trigger_description: "Evolves when exposed to a Dusk Ember." },

	// ── RACE 20 — Crystalmist -> Frostveil -> Glacialpsych (Ice+Psychic / Cleric) ──
	58: { form_id: 58, race_id: 20, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	59: { form_id: 59, race_id: 20, stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.3, spd: 1.3, sp_atk: 1.4, sp_def: 1.5 }, ability_changes: [{ learn_level: 18, ability_id: 41, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 107, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	60: { form_id: 60, race_id: 20, stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.6, def: 1.7, spd: 1.6, sp_atk: 1.9, sp_def: 2.0 }, ability_changes: [{ learn_level: 35, ability_id: 45, replaces_ability_id: 35 }, { learn_level: 36, ability_id: 111, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 35, evolution_trigger_description: "Evolves at level 35." },

	// ── RACE 21 — Ironstorm -> Steelgale -> Titanwing (Metal+Air / Berserker) ──
	61: { form_id: 61, race_id: 21, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	62: { form_id: 62, race_id: 21, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.4, def: 1.4, spd: 1.3, sp_atk: 1.3, sp_def: 1.3 }, ability_changes: [{ learn_level: 18, ability_id: 137, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 52, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	63: { form_id: 63, race_id: 21, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.9, def: 1.8, spd: 1.7, sp_atk: 1.6, sp_def: 1.7 }, ability_changes: [{ learn_level: 35, ability_id: 144, replaces_ability_id: 134 }, { learn_level: 36, ability_id: 56, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 35, evolution_trigger_description: "Evolves at level 35." },

	// ── RACE 22 — Spiritbloom -> Ancestralgrove -> Worldtree (Spirit+Nature / Summoner) ──
	64: { form_id: 64, race_id: 22, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	65: { form_id: 65, race_id: 22, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.3, sp_atk: 1.5, sp_def: 1.4 }, ability_changes: [{ learn_level: 19, ability_id: 115, replaces_ability_id: -1 }, { learn_level: 23, ability_id: 30, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 19, evolution_trigger_description: "Evolves at level 19." },
	66: { form_id: 66, race_id: 22, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.6, def: 1.7, spd: 1.6, sp_atk: 2.0, sp_def: 1.8 }, ability_changes: [{ learn_level: 35, ability_id: 122, replaces_ability_id: 112 }, { learn_level: 36, ability_id: 34, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 106, evolution_trigger_description: "Evolves when exposed to a World Seed." },

	// ── RACE 23 — Solarius -> Novaflare -> Cosmosguard (Light+Chaos / Guardian) [LEGENDARY] ──
	67: { form_id: 67, race_id: 23, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	68: { form_id: 68, race_id: 23, stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.4, spd: 1.3, sp_atk: 1.4, sp_def: 1.5 }, ability_changes: [{ learn_level: 20, ability_id: 99, replaces_ability_id: -1 }, { learn_level: 24, ability_id: 132, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 20, evolution_trigger_description: "Evolves at level 20." },
	69: { form_id: 69, race_id: 23, stage_number: 3, stat_multipliers: { hp: 1.9, atk: 1.7, def: 1.9, spd: 1.7, sp_atk: 1.8, sp_def: 2.0 }, ability_changes: [{ learn_level: 36, ability_id: 100, replaces_ability_id: 90 }, { learn_level: 36, ability_id: 133, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 107, evolution_trigger_description: "Evolves when exposed to a Celestial Core." },

	// ── RACE 24 — Eclipsar -> Twilightmaw -> Voidemperor (Dark+Spirit / Summoner) [LEGENDARY] ──
	70: { form_id: 70, race_id: 24, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	71: { form_id: 71, race_id: 24, stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.3, spd: 1.3, sp_atk: 1.5, sp_def: 1.4 }, ability_changes: [{ learn_level: 20, ability_id: 88, replaces_ability_id: -1 }, { learn_level: 24, ability_id: 121, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 20, evolution_trigger_description: "Evolves at level 20." },
	72: { form_id: 72, race_id: 24, stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.7, def: 1.7, spd: 1.7, sp_atk: 2.0, sp_def: 1.9 }, ability_changes: [{ learn_level: 36, ability_id: 89, replaces_ability_id: 79 }, { learn_level: 36, ability_id: 122, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 108, evolution_trigger_description: "Evolves when exposed to an Eclipse Shard." },
};

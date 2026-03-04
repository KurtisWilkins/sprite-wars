/**
 * SpriteData.js — All 24 Sprite races and 72 evolution forms.
 * Ported from SpriteRaces.gd and EvolutionData.gd.
 *
 * 24 races, each with all 14 elements and all 16 classes available.
 * form_id formula: race_id * 3 - 2 (stage 1), race_id * 3 - 1 (stage 2), race_id * 3 (stage 3)
 *
 * @typedef {Object} SpriteRace
 * @property {number} race_id
 * @property {string} race_name
 * @property {string[]} element_types
 * @property {string[]} available_classes
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

const ALL_ELEMENTS = ["Fire", "Water", "Wind", "Earth", "Plant", "Metal", "Electric", "Dark", "Light", "Solar", "Lunar", "Fairy", "Poison", "Ice"];
const ALL_CLASSES = ["Barbarian", "Fighter", "Archer", "Spearman", "Heavy", "Wizard", "Javelin", "Alchemist", "Cleric", "Ambrosian", "Assassin", "Monk", "Crossbow", "Handgunner", "Siegebreaker", "Paladin"];

// ─────────────────────────────────────────────────────────────────────────────
// SPRITE RACES (24)
// ─────────────────────────────────────────────────────────────────────────────

/** @type {SpriteRace[]} */
export const SPRITE_RACES = [

	// 1 — Bug Man — Common
	{
		race_id: 1,
		race_name: "Bug Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 48, atk: 55, def: 42, spd: 60, sp_atk: 50, sp_def: 40 },
		growth_rates: { hp: 3.0, atk: 4.0, def: 2.0, spd: 3.5, sp_atk: 2.5, sp_def: 2.0 },
		evolution_chain: [1, 2, 3],
		rarity: "common",
		lore_description: "An insectoid humanoid with a chitinous exoskeleton and compound eyes. Bug Men communicate through pheromones and clicking mandibles, swarming their enemies with coordinated strikes.",
	},

	// 2 — Bear Man — Common
	{
		race_id: 2,
		race_name: "Bear Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 65, atk: 58, def: 55, spd: 30, sp_atk: 38, sp_def: 50 },
		growth_rates: { hp: 3.5, atk: 2.0, def: 3.5, spd: 2.0, sp_atk: 3.0, sp_def: 3.5 },
		evolution_chain: [4, 5, 6],
		rarity: "common",
		lore_description: "A towering ursine warrior covered in thick fur. Bear Men are known for their immense strength and endurance, often serving as frontline defenders in temple battles.",
	},

	// 3 — Bird Man — Common
	{
		race_id: 3,
		race_name: "Bird Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 42, atk: 45, def: 38, spd: 68, sp_atk: 55, sp_def: 48 },
		growth_rates: { hp: 3.0, atk: 2.5, def: 3.0, spd: 2.5, sp_atk: 3.5, sp_def: 3.0 },
		evolution_chain: [7, 8, 9],
		rarity: "common",
		lore_description: "A feathered humanoid with sharp talons and keen eyesight. Bird Men soar above battlefields, diving with precision to strike from unexpected angles before retreating skyward.",
	},

	// 4 — Demon — Uncommon
	{
		race_id: 4,
		race_name: "Demon",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 52, atk: 62, def: 40, spd: 55, sp_atk: 58, sp_def: 42 },
		growth_rates: { hp: 2.5, atk: 3.5, def: 2.0, spd: 4.5, sp_atk: 3.0, sp_def: 2.5 },
		evolution_chain: [10, 11, 12],
		rarity: "uncommon",
		lore_description: "A fiendish creature born from dark magical rifts. Demons wield destructive power with reckless abandon, their curved horns and glowing eyes striking fear into all who face them.",
	},

	// 5 — Devil — Common
	{
		race_id: 5,
		race_name: "Devil",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 50, atk: 55, def: 42, spd: 58, sp_atk: 52, sp_def: 45 },
		growth_rates: { hp: 2.0, atk: 3.0, def: 2.0, spd: 5.0, sp_atk: 3.0, sp_def: 2.0 },
		evolution_chain: [13, 14, 15],
		rarity: "common",
		lore_description: "A cunning trickster with bat-like wings and a forked tail. Devils excel at deception and misdirection, luring opponents into traps before delivering a decisive blow.",
	},

	// 6 — Cat Man — Common
	{
		race_id: 6,
		race_name: "Cat Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 45, atk: 50, def: 40, spd: 65, sp_atk: 52, sp_def: 48 },
		growth_rates: { hp: 4.0, atk: 3.0, def: 4.5, spd: 1.0, sp_atk: 1.5, sp_def: 3.0 },
		evolution_chain: [16, 17, 18],
		rarity: "common",
		lore_description: "A lithe feline humanoid with retractable claws and night vision. Cat Men move with silent grace, their reflexes and agility making them natural hunters in any terrain.",
	},

	// 7 — Elf — Uncommon
	{
		race_id: 7,
		race_name: "Elf",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 45, atk: 40, def: 42, spd: 55, sp_atk: 65, sp_def: 55 },
		growth_rates: { hp: 2.0, atk: 1.5, def: 2.0, spd: 4.0, sp_atk: 5.0, sp_def: 2.5 },
		evolution_chain: [19, 20, 21],
		rarity: "uncommon",
		lore_description: "An elegant, long-lived humanoid with pointed ears and innate magical affinity. Elves channel arcane forces with unmatched finesse, their ancient wisdom guiding every spell.",
	},

	// 8 — Ent — Uncommon
	{
		race_id: 8,
		race_name: "Ent",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 68, atk: 45, def: 62, spd: 25, sp_atk: 50, sp_def: 58 },
		growth_rates: { hp: 2.5, atk: 4.0, def: 2.0, spd: 4.0, sp_atk: 3.5, sp_def: 2.5 },
		evolution_chain: [22, 23, 24],
		rarity: "uncommon",
		lore_description: "A living tree creature whose bark-covered body shelters moss and small creatures. Ents draw power from the earth itself, their roots spreading deep to anchor them in battle.",
	},

	// 9 — Fish Man — Uncommon
	{
		race_id: 9,
		race_name: "Fish Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 55, atk: 42, def: 48, spd: 52, sp_atk: 55, sp_def: 52 },
		growth_rates: { hp: 3.5, atk: 1.5, def: 2.5, spd: 2.5, sp_atk: 4.0, sp_def: 4.0 },
		evolution_chain: [25, 26, 27],
		rarity: "uncommon",
		lore_description: "An amphibious humanoid with glistening scales and webbed hands. Fish Men inhabit coastal ruins and sunken temples, wielding water currents as both shield and weapon.",
	},

	// 10 — Ghost — Uncommon
	{
		race_id: 10,
		race_name: "Ghost",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 40, atk: 35, def: 35, spd: 60, sp_atk: 68, sp_def: 58 },
		growth_rates: { hp: 2.5, atk: 1.0, def: 2.5, spd: 3.0, sp_atk: 4.5, sp_def: 3.5 },
		evolution_chain: [28, 29, 30],
		rarity: "uncommon",
		lore_description: "A spectral entity that phases between the material and ethereal planes. Ghosts are immune to most physical attacks, instead draining life force with their chilling touch.",
	},

	// 11 — Golem — Rare
	{
		race_id: 11,
		race_name: "Golem",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 70, atk: 55, def: 68, spd: 22, sp_atk: 35, sp_def: 55 },
		growth_rates: { hp: 2.5, atk: 1.5, def: 2.5, spd: 3.5, sp_atk: 5.0, sp_def: 3.0 },
		evolution_chain: [31, 32, 33],
		rarity: "rare",
		lore_description: "A massive construct of enchanted stone and crystal. Golems are animated by ancient magic, their thundering footsteps shaking the ground as they march tirelessly into combat.",
	},

	// 12 — Human — Rare
	{
		race_id: 12,
		race_name: "Human",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 55, atk: 52, def: 50, spd: 50, sp_atk: 52, sp_def: 50 },
		growth_rates: { hp: 3.0, atk: 5.0, def: 2.0, spd: 3.0, sp_atk: 3.0, sp_def: 2.0 },
		evolution_chain: [34, 35, 36],
		rarity: "rare",
		lore_description: "The most versatile of all races, Humans adapt to any element or class with equal aptitude. Their determination and ingenuity make them formidable opponents in any arena.",
	},

	// 13 — Lizard Man — Common
	{
		race_id: 13,
		race_name: "Lizard Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 55, atk: 52, def: 58, spd: 40, sp_atk: 42, sp_def: 50 },
		growth_rates: { hp: 3.5, atk: 3.0, def: 5.0, spd: 1.0, sp_atk: 1.0, sp_def: 3.5 },
		evolution_chain: [37, 38, 39],
		rarity: "common",
		lore_description: "A reptilian warrior with armored scales and a powerful tail. Lizard Men thrive in warm climates, their cold-blooded nature giving them patience to outlast foes in prolonged battles.",
	},

	// 14 — Minotaur — Common
	{
		race_id: 14,
		race_name: "Minotaur",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 60, atk: 62, def: 52, spd: 35, sp_atk: 38, sp_def: 45 },
		growth_rates: { hp: 3.0, atk: 2.5, def: 2.5, spd: 3.5, sp_atk: 3.0, sp_def: 2.5 },
		evolution_chain: [40, 41, 42],
		rarity: "common",
		lore_description: "A bull-headed giant with immense physical power. Minotaurs charge through enemy lines with unstoppable force, their horns and hooves leaving devastation in their path.",
	},

	// 15 — Monkey Man — Uncommon
	{
		race_id: 15,
		race_name: "Monkey Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 48, atk: 50, def: 42, spd: 62, sp_atk: 52, sp_def: 48 },
		growth_rates: { hp: 4.0, atk: 2.0, def: 3.5, spd: 1.5, sp_atk: 2.5, sp_def: 3.5 },
		evolution_chain: [43, 44, 45],
		rarity: "uncommon",
		lore_description: "An agile primate humanoid with a prehensile tail and quick wits. Monkey Men swing through temple ruins with acrobatic grace, using improvised weapons and clever tactics.",
	},

	// 16 — Mummy — Common
	{
		race_id: 16,
		race_name: "Mummy",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 58, atk: 48, def: 55, spd: 35, sp_atk: 52, sp_def: 52 },
		growth_rates: { hp: 2.5, atk: 3.0, def: 2.0, spd: 3.5, sp_atk: 3.5, sp_def: 2.5 },
		evolution_chain: [46, 47, 48],
		rarity: "common",
		lore_description: "An ancient undead wrapped in enchanted bandages. Mummies carry the curses of forgotten pharaohs, draining the life from those who disturb their eternal rest.",
	},

	// 17 — Ork — Rare
	{
		race_id: 17,
		race_name: "Ork",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 58, atk: 60, def: 48, spd: 42, sp_atk: 40, sp_def: 42 },
		growth_rates: { hp: 2.5, atk: 1.5, def: 2.0, spd: 3.5, sp_atk: 5.0, sp_def: 2.5 },
		evolution_chain: [49, 50, 51],
		rarity: "rare",
		lore_description: "A brutish green-skinned warrior who lives for battle. Orks form war bands that sweep across regions, their raw aggression and crude but effective weapons making them dangerous foes.",
	},

	// 18 — Rat Man — Uncommon
	{
		race_id: 18,
		race_name: "Rat Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 45, atk: 48, def: 40, spd: 62, sp_atk: 50, sp_def: 45 },
		growth_rates: { hp: 3.0, atk: 3.5, def: 3.0, spd: 2.0, sp_atk: 2.5, sp_def: 2.5 },
		evolution_chain: [52, 53, 54],
		rarity: "uncommon",
		lore_description: "A sneaky rodent humanoid that thrives in dark tunnels and sewers. Rat Men excel at ambush tactics, using their sharp senses and knowledge of hidden passages to outmaneuver enemies.",
	},

	// 19 — Robot — Rare
	{
		race_id: 19,
		race_name: "Robot",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 55, atk: 55, def: 58, spd: 42, sp_atk: 48, sp_def: 52 },
		growth_rates: { hp: 2.5, atk: 4.5, def: 2.0, spd: 3.5, sp_atk: 2.5, sp_def: 2.0 },
		evolution_chain: [55, 56, 57],
		rarity: "rare",
		lore_description: "A mechanical construct powered by ancient magitech cores. Robots execute combat protocols with perfect precision, their metal bodies resistant to damage and immune to fatigue.",
	},

	// 20 — Shark Man — Rare
	{
		race_id: 20,
		race_name: "Shark Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 58, atk: 62, def: 48, spd: 48, sp_atk: 42, sp_def: 45 },
		growth_rates: { hp: 3.0, atk: 1.0, def: 2.5, spd: 2.0, sp_atk: 4.0, sp_def: 4.5 },
		evolution_chain: [58, 59, 60],
		rarity: "rare",
		lore_description: "A fearsome aquatic predator with razor-sharp teeth and armored skin. Shark Men dominate underwater arenas but are equally deadly on land, using their powerful jaws to crush opponents.",
	},

	// 21 — Skeleton — Uncommon
	{
		race_id: 21,
		race_name: "Skeleton",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 42, atk: 55, def: 45, spd: 55, sp_atk: 48, sp_def: 42 },
		growth_rates: { hp: 3.0, atk: 4.0, def: 3.0, spd: 2.5, sp_atk: 1.5, sp_def: 2.5 },
		evolution_chain: [61, 62, 63],
		rarity: "uncommon",
		lore_description: "An undead warrior held together by necromantic energy. Skeletons are relentless fighters that reassemble after being shattered, their hollow eye sockets burning with unholy fire.",
	},

	// 22 — Turtle Man — Rare
	{
		race_id: 22,
		race_name: "Turtle Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 65, atk: 38, def: 65, spd: 25, sp_atk: 48, sp_def: 60 },
		growth_rates: { hp: 3.0, atk: 1.0, def: 2.5, spd: 2.0, sp_atk: 4.5, sp_def: 3.5 },
		evolution_chain: [64, 65, 66],
		rarity: "rare",
		lore_description: "A heavily armored reptilian humanoid with a massive shell. Turtle Men are the ultimate defenders, withdrawing into their shells to weather any storm before counterattacking with crushing force.",
	},

	// 23 — Wolf Man — Legendary
	{
		race_id: 23,
		race_name: "Wolf Man",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 55, atk: 60, def: 48, spd: 62, sp_atk: 50, sp_def: 48 },
		growth_rates: { hp: 4.5, atk: 2.5, def: 4.0, spd: 2.5, sp_atk: 3.5, sp_def: 4.0 },
		evolution_chain: [67, 68, 69],
		rarity: "legendary",
		lore_description: "A lycanthropic warrior who channels the primal fury of the wolf. Wolf Men hunt in packs, their howls bolstering allies while striking terror into enemies across the battlefield.",
	},

	// 24 — Zombie — Legendary
	{
		race_id: 24,
		race_name: "Zombie",
		element_types: [...ALL_ELEMENTS],
		available_classes: [...ALL_CLASSES],
		base_stats: { hp: 68, atk: 52, def: 55, spd: 28, sp_atk: 48, sp_def: 52 },
		growth_rates: { hp: 3.5, atk: 2.0, def: 3.0, spd: 3.0, sp_atk: 5.0, sp_def: 3.5 },
		evolution_chain: [70, 71, 72],
		rarity: "legendary",
		lore_description: "An undead horror that refuses to stay down. Zombies absorb punishment that would destroy other races, regenerating from wounds and overwhelming foes through sheer relentless persistence.",
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// EVOLUTION FORMS (72) — keyed by form_id
// ─────────────────────────────────────────────────────────────────────────────

/** @type {{ [form_id: number]: EvolutionForm }} */
export const EVOLUTION_FORMS = {
	// ── RACE 1 — Bug Man (stage 1 -> stage 2 -> stage 3) ──
	1:  { form_id: 1,  race_id: 1,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	2:  { form_id: 2,  race_id: 1,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.5, def: 1.3, spd: 1.4, sp_atk: 1.3, sp_def: 1.3 }, ability_changes: [{ learn_level: 16, ability_id: 5, replaces_ability_id: -1 }, { learn_level: 20, ability_id: 8, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 16, evolution_trigger_description: "Evolves at level 16." },
	3:  { form_id: 3,  race_id: 1,  stage_number: 3, stat_multipliers: { hp: 1.6, atk: 2.0, def: 1.6, spd: 1.8, sp_atk: 1.6, sp_def: 1.6 }, ability_changes: [{ learn_level: 32, ability_id: 10, replaces_ability_id: 1 }, { learn_level: 36, ability_id: 11, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 32, evolution_trigger_description: "Evolves at level 32." },

	// ── RACE 2 — Bear Man (stage 1 -> stage 2 -> stage 3) ──
	4:  { form_id: 4,  race_id: 2,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	5:  { form_id: 5,  race_id: 2,  stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.4, spd: 1.3, sp_atk: 1.3, sp_def: 1.4 }, ability_changes: [{ learn_level: 17, ability_id: 16, replaces_ability_id: -1 }, { learn_level: 21, ability_id: 19, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	6:  { form_id: 6,  race_id: 2,  stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.6, def: 1.9, spd: 1.6, sp_atk: 1.7, sp_def: 1.9 }, ability_changes: [{ learn_level: 34, ability_id: 22, replaces_ability_id: 12 }, { learn_level: 36, ability_id: 23, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 3 — Bird Man (stage 1 -> stage 2 -> stage 3) ──
	7:  { form_id: 7,  race_id: 3,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	8:  { form_id: 8,  race_id: 3,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.4, spd: 1.3, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 16, ability_id: 27, replaces_ability_id: -1 }, { learn_level: 19, ability_id: 30, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 16, evolution_trigger_description: "Evolves at level 16." },
	9:  { form_id: 9,  race_id: 3,  stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.6, def: 1.8, spd: 1.6, sp_atk: 1.8, sp_def: 1.7 }, ability_changes: [{ learn_level: 33, ability_id: 33, replaces_ability_id: 24 }, { learn_level: 36, ability_id: 34, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 33, evolution_trigger_description: "Evolves at level 33." },

	// ── RACE 4 — Demon (stage 1 -> stage 2 -> stage 3) ──
	10: { form_id: 10, race_id: 4,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	11: { form_id: 11, race_id: 4,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.4, def: 1.3, spd: 1.5, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 18, ability_id: 38, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 41, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	12: { form_id: 12, race_id: 4,  stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.8, def: 1.6, spd: 2.0, sp_atk: 1.8, sp_def: 1.6 }, ability_changes: [{ learn_level: 35, ability_id: 44, replaces_ability_id: 35 }, { learn_level: 36, ability_id: 45, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 101, evolution_trigger_description: "Evolves when exposed to a Frost Shard." },

	// ── RACE 5 — Devil (stage 1 -> stage 2 -> stage 3) ──
	13: { form_id: 13, race_id: 5,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	14: { form_id: 14, race_id: 5,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.5, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 16, ability_id: 49, replaces_ability_id: -1 }, { learn_level: 20, ability_id: 52, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 16, evolution_trigger_description: "Evolves at level 16." },
	15: { form_id: 15, race_id: 5,  stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.7, def: 1.6, spd: 2.0, sp_atk: 1.8, sp_def: 1.6 }, ability_changes: [{ learn_level: 34, ability_id: 55, replaces_ability_id: 46 }, { learn_level: 36, ability_id: 56, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 6 — Cat Man (stage 1 -> stage 2 -> stage 3) ──
	16: { form_id: 16, race_id: 6,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	17: { form_id: 17, race_id: 6,  stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.5, spd: 1.3, sp_atk: 1.3, sp_def: 1.4 }, ability_changes: [{ learn_level: 18, ability_id: 60, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 63, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	18: { form_id: 18, race_id: 6,  stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.7, def: 2.0, spd: 1.6, sp_atk: 1.6, sp_def: 1.8 }, ability_changes: [{ learn_level: 34, ability_id: 66, replaces_ability_id: 57 }, { learn_level: 36, ability_id: 67, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 7 — Elf (stage 1 -> stage 2 -> stage 3) ──
	19: { form_id: 19, race_id: 7,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	20: { form_id: 20, race_id: 7,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.4, sp_atk: 1.5, sp_def: 1.3 }, ability_changes: [{ learn_level: 17, ability_id: 71, replaces_ability_id: -1 }, { learn_level: 21, ability_id: 74, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	21: { form_id: 21, race_id: 7,  stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.6, def: 1.6, spd: 1.8, sp_atk: 2.0, sp_def: 1.7 }, ability_changes: [{ learn_level: 33, ability_id: 77, replaces_ability_id: 68 }, { learn_level: 36, ability_id: 78, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 33, evolution_trigger_description: "Evolves at level 33." },

	// ── RACE 8 — Ent (stage 1 -> stage 2 -> stage 3) ──
	22: { form_id: 22, race_id: 8,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	23: { form_id: 23, race_id: 8,  stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.5, def: 1.3, spd: 1.4, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 18, ability_id: 82, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 85, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	24: { form_id: 24, race_id: 8,  stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.9, def: 1.6, spd: 1.8, sp_atk: 1.8, sp_def: 1.6 }, ability_changes: [{ learn_level: 35, ability_id: 88, replaces_ability_id: 79 }, { learn_level: 36, ability_id: 89, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 102, evolution_trigger_description: "Evolves when exposed to a Shadow Gem." },

	// ── RACE 9 — Fish Man (stage 1 -> stage 2 -> stage 3) ──
	25: { form_id: 25, race_id: 9,  stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	26: { form_id: 26, race_id: 9,  stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.3, spd: 1.3, sp_atk: 1.4, sp_def: 1.5 }, ability_changes: [{ learn_level: 17, ability_id: 93, replaces_ability_id: -1 }, { learn_level: 20, ability_id: 96, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	27: { form_id: 27, race_id: 9,  stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.6, def: 1.7, spd: 1.6, sp_atk: 1.9, sp_def: 2.0 }, ability_changes: [{ learn_level: 34, ability_id: 99, replaces_ability_id: 90 }, { learn_level: 36, ability_id: 100, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 10 — Ghost (stage 1 -> stage 2 -> stage 3) ──
	28: { form_id: 28, race_id: 10, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	29: { form_id: 29, race_id: 10, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.3, sp_atk: 1.5, sp_def: 1.4 }, ability_changes: [{ learn_level: 18, ability_id: 104, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 107, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	30: { form_id: 30, race_id: 10, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.6, def: 1.6, spd: 1.7, sp_atk: 2.0, sp_def: 1.8 }, ability_changes: [{ learn_level: 35, ability_id: 110, replaces_ability_id: 101 }, { learn_level: 36, ability_id: 111, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 35, evolution_trigger_description: "Evolves at level 35." },

	// ── RACE 11 — Golem (stage 1 -> stage 2 -> stage 3) ──
	31: { form_id: 31, race_id: 11, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	32: { form_id: 32, race_id: 11, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.4, sp_atk: 1.5, sp_def: 1.4 }, ability_changes: [{ learn_level: 19, ability_id: 115, replaces_ability_id: -1 }, { learn_level: 23, ability_id: 118, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 19, evolution_trigger_description: "Evolves at level 19." },
	33: { form_id: 33, race_id: 11, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.6, def: 1.7, spd: 1.8, sp_atk: 2.0, sp_def: 1.8 }, ability_changes: [{ learn_level: 35, ability_id: 121, replaces_ability_id: 112 }, { learn_level: 36, ability_id: 122, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 103, evolution_trigger_description: "Evolves when exposed to a Spirit Essence." },

	// ── RACE 12 — Human (stage 1 -> stage 2 -> stage 3) ──
	34: { form_id: 34, race_id: 12, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	35: { form_id: 35, race_id: 12, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.5, def: 1.3, spd: 1.4, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 20, ability_id: 126, replaces_ability_id: -1 }, { learn_level: 24, ability_id: 129, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 20, evolution_trigger_description: "Evolves at level 20." },
	36: { form_id: 36, race_id: 12, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 2.0, def: 1.6, spd: 1.8, sp_atk: 1.8, sp_def: 1.6 }, ability_changes: [{ learn_level: 36, ability_id: 132, replaces_ability_id: 123 }, { learn_level: 36, ability_id: 133, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 104, evolution_trigger_description: "Evolves when exposed to a Chaos Crystal." },

	// ── RACE 13 — Lizard Man (stage 1 -> stage 2 -> stage 3) ──
	37: { form_id: 37, race_id: 13, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	38: { form_id: 38, race_id: 13, stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.5, spd: 1.3, sp_atk: 1.3, sp_def: 1.4 }, ability_changes: [{ learn_level: 18, ability_id: 137, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 140, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	39: { form_id: 39, race_id: 13, stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.7, def: 2.0, spd: 1.6, sp_atk: 1.6, sp_def: 1.8 }, ability_changes: [{ learn_level: 34, ability_id: 143, replaces_ability_id: 134 }, { learn_level: 36, ability_id: 144, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 14 — Minotaur (stage 1 -> stage 2 -> stage 3) ──
	40: { form_id: 40, race_id: 14, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	41: { form_id: 41, race_id: 14, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.4, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 16, ability_id: 148, replaces_ability_id: -1 }, { learn_level: 20, ability_id: 151, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 16, evolution_trigger_description: "Evolves at level 16." },
	42: { form_id: 42, race_id: 14, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.7, def: 1.7, spd: 1.8, sp_atk: 1.8, sp_def: 1.7 }, ability_changes: [{ learn_level: 33, ability_id: 154, replaces_ability_id: 145 }, { learn_level: 36, ability_id: 155, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 33, evolution_trigger_description: "Evolves at level 33." },

	// ── RACE 15 — Monkey Man (stage 1 -> stage 2 -> stage 3) ──
	43: { form_id: 43, race_id: 15, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	44: { form_id: 44, race_id: 15, stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.4, spd: 1.3, sp_atk: 1.3, sp_def: 1.4 }, ability_changes: [{ learn_level: 17, ability_id: 6, replaces_ability_id: -1 }, { learn_level: 21, ability_id: 9, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	45: { form_id: 45, race_id: 15, stage_number: 3, stat_multipliers: { hp: 1.9, atk: 1.6, def: 1.8, spd: 1.6, sp_atk: 1.7, sp_def: 1.8 }, ability_changes: [{ learn_level: 34, ability_id: 10, replaces_ability_id: 1 }, { learn_level: 36, ability_id: 11, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 16 — Mummy (stage 1 -> stage 2 -> stage 3) ──
	46: { form_id: 46, race_id: 16, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	47: { form_id: 47, race_id: 16, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.4, def: 1.3, spd: 1.4, sp_atk: 1.4, sp_def: 1.3 }, ability_changes: [{ learn_level: 17, ability_id: 17, replaces_ability_id: -1 }, { learn_level: 21, ability_id: 20, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	48: { form_id: 48, race_id: 16, stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.8, def: 1.6, spd: 1.8, sp_atk: 1.8, sp_def: 1.6 }, ability_changes: [{ learn_level: 34, ability_id: 22, replaces_ability_id: 12 }, { learn_level: 36, ability_id: 23, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 17 — Ork (stage 1 -> stage 2 -> stage 3) ──
	49: { form_id: 49, race_id: 17, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	50: { form_id: 50, race_id: 17, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.4, sp_atk: 1.5, sp_def: 1.3 }, ability_changes: [{ learn_level: 19, ability_id: 8, replaces_ability_id: -1 }, { learn_level: 23, ability_id: 74, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 19, evolution_trigger_description: "Evolves at level 19." },
	51: { form_id: 51, race_id: 17, stage_number: 3, stat_multipliers: { hp: 1.6, atk: 1.6, def: 1.6, spd: 1.8, sp_atk: 2.0, sp_def: 1.7 }, ability_changes: [{ learn_level: 35, ability_id: 11, replaces_ability_id: 1 }, { learn_level: 36, ability_id: 78, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 35, evolution_trigger_description: "Evolves at level 35." },

	// ── RACE 18 — Rat Man (stage 1 -> stage 2 -> stage 3) ──
	52: { form_id: 52, race_id: 18, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	53: { form_id: 53, race_id: 18, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.4, def: 1.3, spd: 1.3, sp_atk: 1.3, sp_def: 1.3 }, ability_changes: [{ learn_level: 17, ability_id: 148, replaces_ability_id: -1 }, { learn_level: 21, ability_id: 30, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 17, evolution_trigger_description: "Evolves at level 17." },
	54: { form_id: 54, race_id: 18, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.8, def: 1.7, spd: 1.6, sp_atk: 1.7, sp_def: 1.7 }, ability_changes: [{ learn_level: 34, ability_id: 155, replaces_ability_id: 145 }, { learn_level: 36, ability_id: 34, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 34, evolution_trigger_description: "Evolves at level 34." },

	// ── RACE 19 — Robot (stage 1 -> stage 2 -> stage 3) ──
	55: { form_id: 55, race_id: 19, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	56: { form_id: 56, race_id: 19, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.5, def: 1.3, spd: 1.4, sp_atk: 1.3, sp_def: 1.3 }, ability_changes: [{ learn_level: 19, ability_id: 82, replaces_ability_id: -1 }, { learn_level: 23, ability_id: 8, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 19, evolution_trigger_description: "Evolves at level 19." },
	57: { form_id: 57, race_id: 19, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 2.0, def: 1.6, spd: 1.8, sp_atk: 1.7, sp_def: 1.6 }, ability_changes: [{ learn_level: 35, ability_id: 89, replaces_ability_id: 79 }, { learn_level: 36, ability_id: 11, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 105, evolution_trigger_description: "Evolves when exposed to a Dusk Ember." },

	// ── RACE 20 — Shark Man (stage 1 -> stage 2 -> stage 3) ──
	58: { form_id: 58, race_id: 20, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	59: { form_id: 59, race_id: 20, stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.3, spd: 1.3, sp_atk: 1.4, sp_def: 1.5 }, ability_changes: [{ learn_level: 18, ability_id: 41, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 107, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	60: { form_id: 60, race_id: 20, stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.6, def: 1.7, spd: 1.6, sp_atk: 1.9, sp_def: 2.0 }, ability_changes: [{ learn_level: 35, ability_id: 45, replaces_ability_id: 35 }, { learn_level: 36, ability_id: 111, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 35, evolution_trigger_description: "Evolves at level 35." },

	// ── RACE 21 — Skeleton (stage 1 -> stage 2 -> stage 3) ──
	61: { form_id: 61, race_id: 21, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	62: { form_id: 62, race_id: 21, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.4, def: 1.4, spd: 1.3, sp_atk: 1.3, sp_def: 1.3 }, ability_changes: [{ learn_level: 18, ability_id: 137, replaces_ability_id: -1 }, { learn_level: 22, ability_id: 52, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 18, evolution_trigger_description: "Evolves at level 18." },
	63: { form_id: 63, race_id: 21, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.9, def: 1.8, spd: 1.7, sp_atk: 1.6, sp_def: 1.7 }, ability_changes: [{ learn_level: 35, ability_id: 144, replaces_ability_id: 134 }, { learn_level: 36, ability_id: 56, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 35, evolution_trigger_description: "Evolves at level 35." },

	// ── RACE 22 — Turtle Man (stage 1 -> stage 2 -> stage 3) ──
	64: { form_id: 64, race_id: 22, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	65: { form_id: 65, race_id: 22, stage_number: 2, stat_multipliers: { hp: 1.3, atk: 1.3, def: 1.3, spd: 1.3, sp_atk: 1.5, sp_def: 1.4 }, ability_changes: [{ learn_level: 19, ability_id: 115, replaces_ability_id: -1 }, { learn_level: 23, ability_id: 30, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 19, evolution_trigger_description: "Evolves at level 19." },
	66: { form_id: 66, race_id: 22, stage_number: 3, stat_multipliers: { hp: 1.7, atk: 1.6, def: 1.7, spd: 1.6, sp_atk: 2.0, sp_def: 1.8 }, ability_changes: [{ learn_level: 35, ability_id: 122, replaces_ability_id: 112 }, { learn_level: 36, ability_id: 34, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 106, evolution_trigger_description: "Evolves when exposed to a World Seed." },

	// ── RACE 23 — Wolf Man (stage 1 -> stage 2 -> stage 3) [LEGENDARY] ──
	67: { form_id: 67, race_id: 23, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	68: { form_id: 68, race_id: 23, stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.4, spd: 1.3, sp_atk: 1.4, sp_def: 1.5 }, ability_changes: [{ learn_level: 20, ability_id: 99, replaces_ability_id: -1 }, { learn_level: 24, ability_id: 132, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 20, evolution_trigger_description: "Evolves at level 20." },
	69: { form_id: 69, race_id: 23, stage_number: 3, stat_multipliers: { hp: 1.9, atk: 1.7, def: 1.9, spd: 1.7, sp_atk: 1.8, sp_def: 2.0 }, ability_changes: [{ learn_level: 36, ability_id: 100, replaces_ability_id: 90 }, { learn_level: 36, ability_id: 133, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 107, evolution_trigger_description: "Evolves when exposed to a Celestial Core." },

	// ── RACE 24 — Zombie (stage 1 -> stage 2 -> stage 3) [LEGENDARY] ──
	70: { form_id: 70, race_id: 24, stage_number: 1, stat_multipliers: { hp: 1.0, atk: 1.0, def: 1.0, spd: 1.0, sp_atk: 1.0, sp_def: 1.0 }, ability_changes: [], evolution_trigger_type: "none", evolution_trigger_value: 0, evolution_trigger_description: "Base form." },
	71: { form_id: 71, race_id: 24, stage_number: 2, stat_multipliers: { hp: 1.4, atk: 1.3, def: 1.3, spd: 1.3, sp_atk: 1.5, sp_def: 1.4 }, ability_changes: [{ learn_level: 20, ability_id: 88, replaces_ability_id: -1 }, { learn_level: 24, ability_id: 121, replaces_ability_id: -1 }], evolution_trigger_type: "level", evolution_trigger_value: 20, evolution_trigger_description: "Evolves at level 20." },
	72: { form_id: 72, race_id: 24, stage_number: 3, stat_multipliers: { hp: 1.8, atk: 1.7, def: 1.7, spd: 1.7, sp_atk: 2.0, sp_def: 1.9 }, ability_changes: [{ learn_level: 36, ability_id: 89, replaces_ability_id: 79 }, { learn_level: 36, ability_id: 122, replaces_ability_id: -1 }], evolution_trigger_type: "item", evolution_trigger_value: 108, evolution_trigger_description: "Evolves when exposed to an Eclipse Shard." },
};

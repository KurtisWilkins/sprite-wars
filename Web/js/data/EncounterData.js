/**
 * EncounterData.js — Static encounter data for all explorable areas.
 * Ported from EncounterTables.gd.
 *
 * race_id values reference SpriteData.js definitions (1-24).
 * weight is relative spawn probability (higher = more common).
 * rarity: "common", "uncommon", "rare", "legendary"
 *
 * @typedef {Object} EncounterEntry
 * @property {number} race_id
 * @property {number} min_level
 * @property {number} max_level
 * @property {number} weight
 * @property {string} rarity
 *
 * @typedef {{ [areaId: string]: EncounterEntry[] }} EncounterTableMap
 */

/** @type {string[]} */
export const AREA_IDS = [
	"starter_route",
	"forest_path",
	"coastal_trail",
	"mountain_pass",
	"volcanic_cave",
	"frozen_peaks",
	"thunder_plains",
	"dark_forest",
	"crystal_cavern",
	"ancient_ruins",
];

/** @type {EncounterTableMap} */
export const ENCOUNTER_TABLES = {
	// ── STARTER ROUTE — First area, levels 2-5 ──
	// Races: Bug Man (Fire), Bear Man (Water), Bird Man (Plant), Demon (Ice)
	starter_route: [
		{ race_id: 1, min_level: 2, max_level: 5, weight: 40, rarity: "common" },
		{ race_id: 2, min_level: 2, max_level: 5, weight: 30, rarity: "common" },
		{ race_id: 3, min_level: 2, max_level: 5, weight: 20, rarity: "uncommon" },
		{ race_id: 4, min_level: 3, max_level: 5, weight: 10, rarity: "rare" },
	],

	// ── FOREST PATH — Early area, levels 5-8 ──
	// Races: Bird Man (Plant), Devil (Wind), Cat Man (Earth), Elf (Electric)
	forest_path: [
		{ race_id: 3, min_level: 5, max_level: 8, weight: 35, rarity: "common" },
		{ race_id: 5, min_level: 5, max_level: 8, weight: 30, rarity: "common" },
		{ race_id: 6, min_level: 5, max_level: 8, weight: 20, rarity: "uncommon" },
		{ race_id: 7, min_level: 6, max_level: 8, weight: 15, rarity: "uncommon" },
	],

	// ── COASTAL TRAIL — Mid-early area, levels 8-12 ──
	// Races: Bear Man (Water), Ent (Dark), Fish Man (Light), Ghost (Fairy)
	coastal_trail: [
		{ race_id: 2, min_level: 8, max_level: 12, weight: 35, rarity: "common" },
		{ race_id: 8, min_level: 8, max_level: 12, weight: 25, rarity: "uncommon" },
		{ race_id: 9, min_level: 9, max_level: 12, weight: 25, rarity: "uncommon" },
		{ race_id: 10, min_level: 10, max_level: 12, weight: 15, rarity: "rare" },
	],

	// ── MOUNTAIN PASS — Mid area, levels 12-16 ──
	// Races: Demon (Ice), Golem (Solar), Human (Lunar), Lizard Man (Metal)
	mountain_pass: [
		{ race_id: 4, min_level: 12, max_level: 16, weight: 30, rarity: "common" },
		{ race_id: 11, min_level: 12, max_level: 16, weight: 25, rarity: "uncommon" },
		{ race_id: 12, min_level: 13, max_level: 16, weight: 25, rarity: "rare" },
		{ race_id: 13, min_level: 12, max_level: 16, weight: 20, rarity: "common" },
	],

	// ── VOLCANIC CAVE — Mid-late area, levels 16-20 ──
	// Races: Bug Man (Fire), Minotaur (Poison), Monkey Man (Fire/Paladin)
	volcanic_cave: [
		{ race_id: 1, min_level: 16, max_level: 20, weight: 35, rarity: "common" },
		{ race_id: 14, min_level: 16, max_level: 20, weight: 35, rarity: "common" },
		{ race_id: 15, min_level: 17, max_level: 20, weight: 30, rarity: "uncommon" },
	],

	// ── FROZEN PEAKS — Late area, levels 20-25 ──
	// Races: Cat Man (Earth), Mummy (Water/Archer), Ork (Fire+Electric)
	frozen_peaks: [
		{ race_id: 6, min_level: 20, max_level: 25, weight: 35, rarity: "common" },
		{ race_id: 16, min_level: 20, max_level: 25, weight: 35, rarity: "common" },
		{ race_id: 17, min_level: 22, max_level: 25, weight: 30, rarity: "rare" },
	],

	// ── THUNDER PLAINS — Late area, levels 25-30 ──
	// Races: Elf (Electric), Rat Man (Poison+Plant), Robot (Dark+Fire)
	thunder_plains: [
		{ race_id: 7, min_level: 25, max_level: 30, weight: 35, rarity: "common" },
		{ race_id: 18, min_level: 25, max_level: 30, weight: 35, rarity: "uncommon" },
		{ race_id: 19, min_level: 27, max_level: 30, weight: 30, rarity: "rare" },
	],

	// ── DARK FOREST — Endgame area, levels 30-35 ──
	// Races: Ent (Dark), Shark Man (Ice+Fairy), Skeleton (Metal+Wind)
	dark_forest: [
		{ race_id: 8, min_level: 30, max_level: 35, weight: 35, rarity: "common" },
		{ race_id: 20, min_level: 30, max_level: 35, weight: 35, rarity: "rare" },
		{ race_id: 21, min_level: 32, max_level: 35, weight: 30, rarity: "uncommon" },
	],

	// ── CRYSTAL CAVERN — Endgame area, levels 35-40 ──
	// Races: Fish Man (Light), Ghost (Fairy), Turtle Man (Solar+Plant)
	crystal_cavern: [
		{ race_id: 9, min_level: 35, max_level: 40, weight: 35, rarity: "uncommon" },
		{ race_id: 10, min_level: 35, max_level: 40, weight: 35, rarity: "uncommon" },
		{ race_id: 22, min_level: 37, max_level: 40, weight: 30, rarity: "rare" },
	],

	// ── ANCIENT RUINS — Final area, levels 40-50, legendary encounters ──
	// Races: Wolf Man (Light+Lunar), Zombie (Dark+Solar)
	ancient_ruins: [
		{ race_id: 23, min_level: 40, max_level: 50, weight: 50, rarity: "legendary" },
		{ race_id: 24, min_level: 40, max_level: 50, weight: 50, rarity: "legendary" },
	],
};

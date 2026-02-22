/**
 * ElementData.js — Full 14x14 element type effectiveness chart.
 * Ported from ElementChart.gd.
 *
 * Element IDs:
 *   1=Fire, 2=Water, 3=Earth, 4=Air, 5=Light, 6=Dark,
 *   7=Nature, 8=Electric, 9=Ice, 10=Metal, 11=Poison,
 *   12=Psychic, 13=Spirit, 14=Chaos
 *
 * Only non-1.0 multipliers are stored; missing keys default to 1.0 (neutral).
 * Super effective = 2.0, not very effective = 0.5, immune = 0.0
 *
 * @typedef {{ [defendingElementId: number]: number }} MatchupMap
 * @typedef {{ [attackingElementId: number]: MatchupMap }} EffectivenessChart
 */

/** @type {{ [name: string]: number }} */
export const ELEMENT_IDS = {
	Fire: 1, Water: 2, Earth: 3, Air: 4,
	Light: 5, Dark: 6, Nature: 7, Electric: 8,
	Ice: 9, Metal: 10, Poison: 11, Psychic: 12,
	Spirit: 13, Chaos: 14,
};

/** @type {{ [id: number]: string }} */
export const ELEMENT_NAMES = {
	1: "Fire", 2: "Water", 3: "Earth", 4: "Air",
	5: "Light", 6: "Dark", 7: "Nature", 8: "Electric",
	9: "Ice", 10: "Metal", 11: "Poison", 12: "Psychic",
	13: "Spirit", 14: "Chaos",
};

/**
 * Full effectiveness chart.
 * chart[attackingElementId][defendingElementId] = multiplier
 * @type {EffectivenessChart}
 */
export const EFFECTIVENESS_CHART = {
	// Fire (1) — Strong vs: Nature, Ice, Metal | Weak vs: Water, Earth, Fire
	1: {
		7: 2.0,   // Fire > Nature
		9: 2.0,   // Fire > Ice
		10: 2.0,  // Fire > Metal
		2: 0.5,   // Fire < Water
		3: 0.5,   // Fire < Earth
		1: 0.5,   // Fire < Fire (resistance)
	},

	// Water (2) — Strong vs: Fire, Earth | Weak vs: Nature, Electric, Poison
	2: {
		1: 2.0,   // Water > Fire
		3: 2.0,   // Water > Earth
		7: 0.5,   // Water < Nature
		8: 0.5,   // Water < Electric
		11: 0.5,  // Water < Poison
	},

	// Earth (3) — Strong vs: Fire, Electric, Metal, Poison | Weak vs: Water, Nature, Ice
	3: {
		1: 2.0,   // Earth > Fire
		8: 2.0,   // Earth > Electric
		10: 2.0,  // Earth > Metal
		11: 2.0,  // Earth > Poison
		2: 0.5,   // Earth < Water
		7: 0.5,   // Earth < Nature
		9: 0.5,   // Earth < Ice
	},

	// Air (4) — Strong vs: Nature, Poison | Weak vs: Electric, Ice, Earth
	4: {
		7: 2.0,   // Air > Nature
		11: 2.0,  // Air > Poison
		8: 0.5,   // Air < Electric
		9: 0.5,   // Air < Ice
		3: 0.5,   // Air < Earth
	},

	// Light (5) — Strong vs: Dark, Poison, Spirit | Weak vs: Chaos, Light
	5: {
		6: 2.0,   // Light > Dark
		11: 2.0,  // Light > Poison
		13: 2.0,  // Light > Spirit
		14: 0.5,  // Light < Chaos
		5: 0.5,   // Light < Light (resistance)
	},

	// Dark (6) — Strong vs: Light, Psychic, Spirit | Weak vs: Chaos, Dark
	6: {
		5: 2.0,   // Dark > Light
		12: 2.0,  // Dark > Psychic
		13: 2.0,  // Dark > Spirit
		14: 0.5,  // Dark < Chaos
		6: 0.5,   // Dark < Dark (resistance)
	},

	// Nature (7) — Strong vs: Water, Earth | Weak vs: Fire, Ice, Poison
	7: {
		2: 2.0,   // Nature > Water
		3: 2.0,   // Nature > Earth
		1: 0.5,   // Nature < Fire
		9: 0.5,   // Nature < Ice
		11: 0.5,  // Nature < Poison
	},

	// Electric (8) — Strong vs: Water, Air | Weak vs: Earth | Immune to: Electric
	8: {
		2: 2.0,   // Electric > Water
		4: 2.0,   // Electric > Air
		3: 0.5,   // Electric < Earth
		8: 0.0,   // Electric immune to Electric
	},

	// Ice (9) — Strong vs: Nature, Air, Psychic, Earth | Weak vs: Fire, Metal
	9: {
		7: 2.0,   // Ice > Nature
		4: 2.0,   // Ice > Air
		12: 2.0,  // Ice > Psychic
		3: 2.0,   // Ice > Earth
		1: 0.5,   // Ice < Fire
		10: 0.5,  // Ice < Metal
	},

	// Metal (10) — Strong vs: Ice, Psychic, Earth | Weak vs: Fire, Electric
	10: {
		9: 2.0,   // Metal > Ice
		12: 2.0,  // Metal > Psychic
		3: 2.0,   // Metal > Earth
		1: 0.5,   // Metal < Fire
		8: 0.5,   // Metal < Electric
	},

	// Poison (11) — Strong vs: Nature, Psychic, Water | Weak vs: Earth, Metal, Light
	11: {
		7: 2.0,   // Poison > Nature
		12: 2.0,  // Poison > Psychic
		2: 2.0,   // Poison > Water
		3: 0.5,   // Poison < Earth
		10: 0.5,  // Poison < Metal
		5: 0.5,   // Poison < Light
	},

	// Psychic (12) — Strong vs: Poison, Air | Weak vs: Dark, Metal, Ice
	12: {
		11: 2.0,  // Psychic > Poison
		4: 2.0,   // Psychic > Air
		6: 0.5,   // Psychic < Dark
		10: 0.5,  // Psychic < Metal
		9: 0.5,   // Psychic < Ice
	},

	// Spirit (13) — Strong vs: Light, Chaos | Weak vs: Dark, Spirit
	13: {
		5: 2.0,   // Spirit > Light
		14: 2.0,  // Spirit > Chaos
		6: 0.5,   // Spirit < Dark
		13: 0.5,  // Spirit < Spirit (resistance)
	},

	// Chaos (14) — Strong vs: Dark, Light, Ice | Weak vs: Spirit, Earth
	14: {
		6: 2.0,   // Chaos > Dark
		5: 2.0,   // Chaos > Light
		9: 2.0,   // Chaos > Ice
		13: 0.5,  // Chaos < Spirit
		3: 0.5,   // Chaos < Earth
	},
};

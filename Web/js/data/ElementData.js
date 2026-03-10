/**
 * ElementData.js — Full 14x14 element type effectiveness chart.
 * Ported from ElementChart.gd.
 *
 * Element IDs:
 *   1=Fire, 2=Water, 3=Wind, 4=Earth, 5=Plant, 6=Metal,
 *   7=Electric, 8=Dark, 9=Light, 10=Solar, 11=Lunar,
 *   12=Fairy, 13=Poison, 14=Ice
 *
 * Only non-1.0 multipliers are stored; missing keys default to 1.0 (neutral).
 * Super effective = 2.0, not very effective = 0.5, immune = 0.0
 *
 * @typedef {{ [defendingElementId: number]: number }} MatchupMap
 * @typedef {{ [attackingElementId: number]: MatchupMap }} EffectivenessChart
 */

/** @type {{ [name: string]: number }} */
export const ELEMENT_IDS = {
	Fire: 1, Water: 2, Wind: 3, Earth: 4,
	Plant: 5, Metal: 6, Electric: 7, Dark: 8,
	Light: 9, Solar: 10, Lunar: 11, Fairy: 12,
	Poison: 13, Ice: 14,
};

/** @type {{ [id: number]: string }} */
export const ELEMENT_NAMES = {
	1: "Fire", 2: "Water", 3: "Wind", 4: "Earth",
	5: "Plant", 6: "Metal", 7: "Electric", 8: "Dark",
	9: "Light", 10: "Solar", 11: "Lunar", 12: "Fairy",
	13: "Poison", 14: "Ice",
};

/**
 * Full effectiveness chart.
 * chart[attackingElementId][defendingElementId] = multiplier
 * @type {EffectivenessChart}
 */
export const EFFECTIVENESS_CHART = {
	// Fire (1) — Strong vs: Plant, Ice, Metal | Weak vs: Water, Earth
	1: {
		5: 2.0,   // Fire > Plant
		14: 2.0,  // Fire > Ice
		6: 2.0,   // Fire > Metal
		2: 0.5,   // Fire < Water
		4: 0.5,   // Fire < Earth
	},

	// Water (2) — Strong vs: Fire, Earth | Weak vs: Plant, Electric, Poison
	2: {
		1: 2.0,   // Water > Fire
		4: 2.0,   // Water > Earth
		5: 0.5,   // Water < Plant
		7: 0.5,   // Water < Electric
		13: 0.5,  // Water < Poison
	},

	// Wind (3) — Strong vs: Plant, Poison | Weak vs: Electric, Ice, Earth
	3: {
		5: 2.0,   // Wind > Plant
		13: 2.0,  // Wind > Poison
		7: 0.5,   // Wind < Electric
		14: 0.5,  // Wind < Ice
		4: 0.5,   // Wind < Earth
	},

	// Earth (4) — Strong vs: Fire, Electric, Metal, Poison | Weak vs: Water, Plant, Ice
	4: {
		1: 2.0,   // Earth > Fire
		7: 2.0,   // Earth > Electric
		6: 2.0,   // Earth > Metal
		13: 2.0,  // Earth > Poison
		2: 0.5,   // Earth < Water
		5: 0.5,   // Earth < Plant
		14: 0.5,  // Earth < Ice
	},

	// Plant (5) — Strong vs: Water, Earth | Weak vs: Fire, Ice, Poison
	5: {
		2: 2.0,   // Plant > Water
		4: 2.0,   // Plant > Earth
		1: 0.5,   // Plant < Fire
		14: 0.5,  // Plant < Ice
		13: 0.5,  // Plant < Poison
	},

	// Metal (6) — Strong vs: Ice, Fairy, Earth | Weak vs: Fire, Electric
	6: {
		14: 2.0,  // Metal > Ice
		12: 2.0,  // Metal > Fairy
		4: 2.0,   // Metal > Earth
		1: 0.5,   // Metal < Fire
		7: 0.5,   // Metal < Electric
	},

	// Electric (7) — Strong vs: Water, Wind | Weak vs: Earth | Immune to: Electric
	7: {
		2: 2.0,   // Electric > Water
		3: 2.0,   // Electric > Wind
		4: 0.5,   // Electric < Earth
		7: 0.0,   // Electric immune to Electric
	},

	// Dark (8) — Strong vs: Light, Fairy, Solar | Resisted by: Lunar
	8: {
		9: 2.0,   // Dark > Light
		12: 2.0,  // Dark > Fairy
		10: 2.0,  // Dark > Solar
		11: 0.5,  // Dark < Lunar
	},

	// Light (9) — Strong vs: Dark, Poison, Lunar | Resisted by: Solar
	9: {
		8: 2.0,   // Light > Dark
		13: 2.0,  // Light > Poison
		11: 2.0,  // Light > Lunar
		10: 0.5,  // Light < Solar
	},

	// Solar (10) — Strong vs: Plant, Ice, Lunar | Weak vs: Dark, Light
	10: {
		5: 2.0,   // Solar > Plant
		14: 2.0,  // Solar > Ice
		11: 2.0,  // Solar > Lunar
		8: 0.5,   // Solar < Dark
		9: 0.5,   // Solar < Light
	},

	// Lunar (11) — Strong vs: Light, Dark, Fairy | Weak vs: Solar, Poison
	11: {
		9: 2.0,   // Lunar > Light
		8: 2.0,   // Lunar > Dark
		12: 2.0,  // Lunar > Fairy
		10: 0.5,  // Lunar < Solar
		13: 0.5,  // Lunar < Poison
	},

	// Fairy (12) — Strong vs: Dark, Poison, Wind | Weak vs: Metal, Ice
	12: {
		8: 2.0,   // Fairy > Dark
		13: 2.0,  // Fairy > Poison
		3: 2.0,   // Fairy > Wind
		6: 0.5,   // Fairy < Metal
		14: 0.5,  // Fairy < Ice
	},

	// Poison (13) — Strong vs: Plant, Fairy, Water | Weak vs: Earth, Metal, Light
	13: {
		5: 2.0,   // Poison > Plant
		12: 2.0,  // Poison > Fairy
		2: 2.0,   // Poison > Water
		4: 0.5,   // Poison < Earth
		6: 0.5,   // Poison < Metal
		9: 0.5,   // Poison < Light
	},

	// Ice (14) — Strong vs: Plant, Wind, Earth, Fairy | Weak vs: Fire, Metal
	14: {
		5: 2.0,   // Ice > Plant
		3: 2.0,   // Ice > Wind
		4: 2.0,   // Ice > Earth
		12: 2.0,  // Ice > Fairy
		1: 0.5,   // Ice < Fire
		6: 0.5,   // Ice < Metal
	},
};

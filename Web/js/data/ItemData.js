/**
 * ItemData.js — All consumable items and catching crystals.
 * Ported from ConsumableData.gd and CrystalData.gd.
 *
 * item_id ranges: 101-199 consumables, 201-299 crystals
 *
 * @typedef {Object} Consumable
 * @property {number} item_id
 * @property {string} name
 * @property {string} category — "potion", "status_cure", "battle_item", "utility"
 * @property {string} effect_type
 * @property {number|string|Object} effect_value — int, string, or object depending on type
 * @property {string} description
 * @property {number} buy_price
 *
 * @typedef {Object} Crystal
 * @property {number} item_id
 * @property {string} name
 * @property {number} catch_multiplier
 * @property {string} description
 * @property {number} buy_price
 * @property {string} source — "shop" or "quest_reward"
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSUMABLES
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Consumable[]} */
export const CONSUMABLES = [
	// ── POTIONS ──
	{
		item_id: 101,
		name: "Small Potion",
		category: "potion",
		effect_type: "heal_hp",
		effect_value: 30,
		description: "Restores 30 HP to one Sprite.",
		buy_price: 300,
	},
	{
		item_id: 102,
		name: "Medium Potion",
		category: "potion",
		effect_type: "heal_hp",
		effect_value: 100,
		description: "Restores 100 HP to one Sprite.",
		buy_price: 700,
	},
	{
		item_id: 103,
		name: "Large Potion",
		category: "potion",
		effect_type: "heal_hp_full",
		effect_value: 9999,
		description: "Fully restores HP to one Sprite.",
		buy_price: 1500,
	},
	{
		item_id: 104,
		name: "Max Potion",
		category: "potion",
		effect_type: "heal_team_full",
		effect_value: 9999,
		description: "Fully restores HP for the entire team.",
		buy_price: 3000,
	},
	{
		item_id: 105,
		name: "PP Restore",
		category: "potion",
		effect_type: "restore_pp_all",
		effect_value: 9999,
		description: "Restores all PP for one Sprite's abilities.",
		buy_price: 500,
	},

	// ── STATUS CURES ──
	{
		item_id: 111,
		name: "Antidote",
		category: "status_cure",
		effect_type: "cure_status",
		effect_value: "poison",
		description: "Cures poison from one Sprite.",
		buy_price: 200,
	},
	{
		item_id: 112,
		name: "Thaw Crystal",
		category: "status_cure",
		effect_type: "cure_status",
		effect_value: "freeze",
		description: "Cures freeze from one Sprite.",
		buy_price: 200,
	},
	{
		item_id: 113,
		name: "Awakening",
		category: "status_cure",
		effect_type: "cure_status",
		effect_value: "sleep",
		description: "Cures sleep from one Sprite.",
		buy_price: 200,
	},
	{
		item_id: 114,
		name: "Full Cure",
		category: "status_cure",
		effect_type: "cure_status",
		effect_value: "all",
		description: "Cures all status effects from one Sprite.",
		buy_price: 600,
	},

	// ── REVIVAL ──
	{
		item_id: 121,
		name: "Revive",
		category: "potion",
		effect_type: "revive",
		effect_value: 50,
		description: "Revives a fainted Sprite with 50% HP.",
		buy_price: 2000,
	},
	{
		item_id: 122,
		name: "Max Revive",
		category: "potion",
		effect_type: "revive",
		effect_value: 100,
		description: "Revives a fainted Sprite with full HP.",
		buy_price: 5000,
	},

	// ── BATTLE ITEMS — Temporary stat boosts (5 turns) ──
	{
		item_id: 131,
		name: "ATK Boost",
		category: "battle_item",
		effect_type: "buff_stat",
		effect_value: { stat: "atk", multiplier: 1.5, duration: 5 },
		description: "Boosts ATK by 50% for 5 turns.",
		buy_price: 400,
	},
	{
		item_id: 132,
		name: "DEF Boost",
		category: "battle_item",
		effect_type: "buff_stat",
		effect_value: { stat: "def", multiplier: 1.5, duration: 5 },
		description: "Boosts DEF by 50% for 5 turns.",
		buy_price: 400,
	},
	{
		item_id: 133,
		name: "SPD Boost",
		category: "battle_item",
		effect_type: "buff_stat",
		effect_value: { stat: "spd", multiplier: 1.5, duration: 5 },
		description: "Boosts SPD by 50% for 5 turns.",
		buy_price: 400,
	},

	// ── UTILITY ──
	{
		item_id: 141,
		name: "Escape Rope",
		category: "utility",
		effect_type: "flee_dungeon",
		effect_value: 1,
		description: "Instantly flee from a dungeon or temple.",
		buy_price: 500,
	},
	{
		item_id: 142,
		name: "Rare Candy",
		category: "utility",
		effect_type: "level_up",
		effect_value: 1,
		description: "Raises one Sprite's level by 1.",
		buy_price: 10000,
	},

	// ── ELEMENT GEMS — Boost element damage for 1 battle ──
	{
		item_id: 151,
		name: "Fire Gem",
		category: "battle_item",
		effect_type: "element_boost",
		effect_value: { element: "Fire", multiplier: 1.5, duration: "battle" },
		description: "Boosts Fire-type damage by 50% for one battle.",
		buy_price: 800,
	},
	{
		item_id: 152,
		name: "Water Gem",
		category: "battle_item",
		effect_type: "element_boost",
		effect_value: { element: "Water", multiplier: 1.5, duration: "battle" },
		description: "Boosts Water-type damage by 50% for one battle.",
		buy_price: 800,
	},
	{
		item_id: 153,
		name: "Nature Gem",
		category: "battle_item",
		effect_type: "element_boost",
		effect_value: { element: "Nature", multiplier: 1.5, duration: "battle" },
		description: "Boosts Nature-type damage by 50% for one battle.",
		buy_price: 800,
	},
	{
		item_id: 154,
		name: "Ice Gem",
		category: "battle_item",
		effect_type: "element_boost",
		effect_value: { element: "Ice", multiplier: 1.5, duration: "battle" },
		description: "Boosts Ice-type damage by 50% for one battle.",
		buy_price: 800,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CURES (300-range)
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Consumable[]} */
export const STATUS_CURES = [
	{
		item_id: 301,
		name: "Burn Heal",
		category: "status_cure",
		effect_type: "cure_status",
		effect_value: { cure_status: 1 },
		description: "Cures burn status from one Sprite.",
		buy_price: 150,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// EVOLUTION ITEMS (400-range)
// ─────────────────────────────────────────────────────────────────────────────

export const EVOLUTION_ITEMS = [
	{
		item_id: 401,
		name: "Evolution Catalyst",
		category: "evolution",
		description: "Triggers evolution when conditions are met.",
		buy_price: 0,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// KEY ITEMS (500-range)
// ─────────────────────────────────────────────────────────────────────────────

export const KEY_ITEMS = [
	{
		item_id: 501,
		name: "Rival's Badge",
		category: "key_item",
		description: "Proof of victory over your rival.",
		buy_price: 0,
	},
	{
		item_id: 502,
		name: "Dark Temple Key",
		category: "key_item",
		description: "Unlocks the entrance to the Dark Temple.",
		buy_price: 0,
	},
];

// ─────────────────────────────────────────────────────────────────────────────
// CRYSTALS (catching items)
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Crystal[]} */
export const CRYSTALS = [
	{
		item_id: 201,
		name: "Basic Crystal",
		catch_multiplier: 1.0,
		description: "A standard catching crystal.",
		buy_price: 200,
		source: "shop",
	},
	{
		item_id: 202,
		name: "Great Crystal",
		catch_multiplier: 1.5,
		description: "An improved crystal with better catch rate.",
		buy_price: 600,
		source: "shop",
	},
	{
		item_id: 203,
		name: "Ultra Crystal",
		catch_multiplier: 2.0,
		description: "A high-performance crystal for tough catches.",
		buy_price: 1200,
		source: "shop",
	},
	{
		item_id: 204,
		name: "Master Crystal",
		catch_multiplier: 255.0,
		description: "Never fails. Extremely rare.",
		buy_price: 50000,
		source: "quest_reward",
	},
	{
		item_id: 205,
		name: "Status Crystal",
		catch_multiplier: 2.5,
		description: "Works best on Sprites with status effects.",
		buy_price: 1000,
		source: "shop",
	},
	{
		item_id: 206,
		name: "Quick Crystal",
		catch_multiplier: 4.0,
		description: "High catch rate on first turn only.",
		buy_price: 1000,
		source: "shop",
	},
	{
		item_id: 207,
		name: "Heavy Crystal",
		catch_multiplier: 3.0,
		description: "Better against slow Sprites.",
		buy_price: 1000,
		source: "shop",
	},
	{
		item_id: 208,
		name: "Net Crystal",
		catch_multiplier: 3.0,
		description: "Better against Water and Plant types.",
		buy_price: 1000,
		source: "shop",
	},
];

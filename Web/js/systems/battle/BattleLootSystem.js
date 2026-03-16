/**
 * BattleLootSystem.js -- Random equipment drop/loot system for battle victories.
 *
 * Rolls random equipment drops after battles with configurable drop rates,
 * rarity weights scaled by difficulty, element-themed weighting, and
 * level-appropriate filtering.
 *
 * Usage:
 *   import { rollBattleLoot, formatLootForDisplay } from './BattleLootSystem.js';
 *
 *   const loot = rollBattleLoot('boss', 7, 20, 'Fire');
 *   const display = formatLootForDisplay(loot);
 */

import { EQUIPMENT, RARITY_TIERS, getAllEquipmentWithExpansion } from '../../data/EquipmentData.js';
import { eventBus } from '../../core/EventBus.js';

// ── Drop Rate Configuration ────────────────────────────────────────────────
// Each battle type defines the chance of getting ANY drops at all,
// and the min/max number of items if the roll succeeds.

const DROP_CONFIG = {
    normal: { chance: 0.15, minDrops: 1, maxDrops: 1 },
    boss:   { chance: 0.40, minDrops: 1, maxDrops: 2 },
    temple: { chance: 0.60, minDrops: 1, maxDrops: 3 },
};

// ── Rarity Weight Tables by Difficulty Tier ────────────────────────────────
// Difficulty is a 1-10 scale. Each tier maps rarity names to relative weights.
// Order matches RARITY_TIERS: common, uncommon, rare, epic, legendary.

const RARITY_WEIGHTS = {
    low:  { common: 70, uncommon: 20, rare: 8,  epic: 2,  legendary: 0  },
    mid:  { common: 40, uncommon: 30, rare: 20, epic: 8,  legendary: 2  },
    high: { common: 15, uncommon: 25, rare: 30, epic: 20, legendary: 10 },
};

// ── Rarity Display Colors (matches SpriteCenterScene palette) ──────────────

const RARITY_COLORS = {
    common:    '#888888',
    uncommon:  '#33cc66',
    rare:      '#3399ff',
    epic:      '#aa44ff',
    legendary: '#ffaa00',
};

// ── Rarity Labels (title-cased for display) ────────────────────────────────

const RARITY_LABELS = {
    common:    'Common',
    uncommon:  'Uncommon',
    rare:      'Rare',
    epic:      'Epic',
    legendary: 'Legendary',
};

// ── Element Synergy Weight Multiplier ──────────────────────────────────────
// Equipment whose element_synergy matches the battle element gets this
// multiplier applied to its selection weight.

const ELEMENT_SYNERGY_MULTIPLIER = 2.0;

// ── Level Filter Tolerance ─────────────────────────────────────────────────
// Don't drop items whose level_requirement exceeds playerLevel + this value.

const LEVEL_TOLERANCE = 10;

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Map a numeric difficulty (1-10) to a tier key.
 * @param {number} difficulty
 * @returns {'low'|'mid'|'high'}
 */
function _getDifficultyTier(difficulty) {
    if (difficulty <= 3) return 'low';
    if (difficulty <= 6) return 'mid';
    return 'high';
}

/**
 * Perform a weighted random selection from an array of { item, weight } entries.
 * @param {{ item: any, weight: number }[]} weightedItems
 * @returns {any|null}
 */
function _weightedRandom(weightedItems) {
    if (weightedItems.length === 0) return null;

    let totalWeight = 0;
    for (const entry of weightedItems) {
        totalWeight += entry.weight;
    }
    if (totalWeight <= 0) return null;

    let roll = Math.random() * totalWeight;
    for (const entry of weightedItems) {
        roll -= entry.weight;
        if (roll <= 0) return entry.item;
    }
    // Fallback (floating point edge case)
    return weightedItems[weightedItems.length - 1].item;
}

/**
 * Pick a rarity tier based on difficulty-weighted probabilities.
 * @param {number} difficulty
 * @returns {string} One of RARITY_TIERS values.
 */
function _rollRarity(difficulty) {
    const tier = _getDifficultyTier(difficulty);
    const weights = RARITY_WEIGHTS[tier];

    const entries = [];
    for (const rarity of RARITY_TIERS) {
        const w = weights[rarity] || 0;
        if (w > 0) {
            entries.push({ item: rarity, weight: w });
        }
    }
    return _weightedRandom(entries) || 'common';
}

/**
 * Get equipment candidates filtered by rarity, level, and optionally weighted
 * by element synergy.
 * @param {string} rarity
 * @param {number} playerLevel
 * @param {string|null} battleElement
 * @returns {{ item: object, weight: number }[]}
 */
function _getCandidates(rarity, playerLevel, battleElement) {
    const maxLevel = playerLevel + LEVEL_TOLERANCE;
    const candidates = [];

    for (const eq of getAllEquipmentWithExpansion()) {
        // Must match rarity
        if (eq.rarity !== rarity) continue;

        // Must be level-appropriate
        if (eq.level_requirement > maxLevel) continue;

        // Calculate selection weight
        let weight = 1.0;

        // Apply element synergy bonus: equipment with matching element_synergy
        // gets double weight to appear more often in themed battles.
        if (battleElement && eq.element_synergy && eq.element_synergy === battleElement) {
            weight *= ELEMENT_SYNERGY_MULTIPLIER;
        }

        candidates.push({ item: eq, weight });
    }

    return candidates;
}

/**
 * Roll a random number of drops within a min-max range (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function _rollDropCount(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Roll random equipment drops after a battle victory.
 *
 * @param {'normal'|'boss'|'temple'} battleType - Type of battle completed.
 * @param {number} difficulty - Battle difficulty on a 1-10 scale.
 * @param {number} playerLevel - Highest sprite level on the player's team.
 * @param {string|null} [battleElement=null] - Element theme of the battle (e.g. 'Fire').
 *     Equipment with matching element_synergy will be weighted 2x higher.
 * @returns {object[]} Array of equipment data objects from EQUIPMENT. Empty if no drops.
 */
export function rollBattleLoot(battleType, difficulty, playerLevel, battleElement = null) {
    // Validate and normalize inputs
    const config = DROP_CONFIG[battleType] || DROP_CONFIG.normal;
    const diff = Math.max(1, Math.min(10, difficulty || 1));
    const level = Math.max(1, playerLevel || 1);

    // Step 1: Roll whether any loot drops at all
    if (Math.random() > config.chance) {
        return [];
    }

    // Step 2: Determine how many items drop
    const dropCount = _rollDropCount(config.minDrops, config.maxDrops);

    // Step 3: Roll each drop independently
    const drops = [];
    const usedIds = new Set(); // Avoid duplicate equipment in same drop

    for (let i = 0; i < dropCount; i++) {
        // Roll rarity for this specific drop
        const rarity = _rollRarity(diff);

        // Get weighted candidates for this rarity
        let candidates = _getCandidates(rarity, level, battleElement);

        // Remove already-dropped items to avoid duplicates
        if (usedIds.size > 0) {
            candidates = candidates.filter(c => !usedIds.has(c.item.equipment_id));
        }

        // If no candidates at this rarity, try adjacent rarities
        if (candidates.length === 0) {
            const rarityIdx = RARITY_TIERS.indexOf(rarity);

            // Try one tier lower, then one tier higher
            for (const offset of [-1, 1, -2, 2]) {
                const fallbackIdx = rarityIdx + offset;
                if (fallbackIdx >= 0 && fallbackIdx < RARITY_TIERS.length) {
                    candidates = _getCandidates(RARITY_TIERS[fallbackIdx], level, battleElement);
                    if (usedIds.size > 0) {
                        candidates = candidates.filter(c => !usedIds.has(c.item.equipment_id));
                    }
                    if (candidates.length > 0) break;
                }
            }
        }

        // Perform weighted selection
        const selected = _weightedRandom(candidates);
        if (selected) {
            drops.push(selected);
            usedIds.add(selected.equipment_id);
        }
    }

    // Emit event if any loot was generated
    if (drops.length > 0) {
        eventBus.emit('battle_loot_rolled', {
            battleType,
            difficulty: diff,
            playerLevel: level,
            battleElement,
            loot: drops,
        });
    }

    return drops;
}

/**
 * Format loot drops for UI display. Returns an array of display-ready objects
 * with rarity colors, labels, and stat summary strings.
 *
 * @param {object[]} lootArray - Array of equipment data objects from rollBattleLoot().
 * @returns {{ equipmentId: number, name: string, slotType: string, rarity: string,
 *             rarityLabel: string, rarityColor: string, description: string,
 *             statSummary: string, elementSynergy: string, levelRequirement: number,
 *             iconPath: string, raw: object }[]}
 */
export function formatLootForDisplay(lootArray) {
    if (!lootArray || lootArray.length === 0) return [];

    return lootArray.map(eq => {
        // Build a compact stat summary string like "+18 ATK, +5 SP.ATK"
        const statParts = [];
        const bonuses = eq.stat_bonuses || {};
        const statLabels = {
            hp: 'HP', atk: 'ATK', def: 'DEF',
            spd: 'SPD', sp_atk: 'SP.ATK', sp_def: 'SP.DEF',
        };
        for (const [key, label] of Object.entries(statLabels)) {
            const val = bonuses[key] || 0;
            if (val > 0) {
                statParts.push(`+${val} ${label}`);
            }
        }

        return {
            equipmentId: eq.equipment_id,
            name: eq.equipment_name,
            slotType: eq.slot_type,
            rarity: eq.rarity,
            rarityLabel: RARITY_LABELS[eq.rarity] || eq.rarity,
            rarityColor: RARITY_COLORS[eq.rarity] || RARITY_COLORS.common,
            description: eq.description || '',
            statSummary: statParts.join(', ') || 'No stat bonuses',
            elementSynergy: eq.element_synergy || '',
            levelRequirement: eq.level_requirement || 1,
            iconPath: eq.icon_path || '',
            raw: eq,
        };
    });
}

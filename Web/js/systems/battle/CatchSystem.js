/**
 * CatchSystem -- Catch rate calculation and catch sequence logic.
 * [Progression] Determines the catch rate for wild Sprites based on HP, rarity,
 * crystal quality, and status conditions. Also simulates the shake-check sequence
 * and validates whether catching is allowed in the current battle context.
 *
 * Ported from Game/Scripts/Battle/CatchRateCalculator.gd
 *         and Game/Scripts/Battle/CatchSequence.gd
 */

// ============================================================================
// CatchRateCalculator -- Computes capture probability and shake sequences.
// ============================================================================

export class CatchRateCalculator {
    // -- Status Effect Modifiers --------------------------------------------------
    // Status conditions that improve catch rate. Sleep and freeze are strongest,
    // paralysis and poison moderate, burn weakest.

    static STATUS_MODIFIERS = {
        sleep: 2.0,
        freeze: 2.0,
        paralysis: 1.5,
        poison: 1.5,
        burn: 1.25,
        none: 1.0,
        '': 1.0,
    };

    // -- Rarity Modifiers ---------------------------------------------------------
    // Rarer Sprites are harder to catch. Legendary Sprites have only 30% of the
    // base capture probability.

    static RARITY_MODIFIERS = {
        common: 1.0,
        uncommon: 0.8,
        rare: 0.6,
        legendary: 0.3,
    };

    // -- Catch Rate Bounds --------------------------------------------------------

    static MIN_CATCH_RATE = 0.05;
    static MAX_CATCH_RATE = 0.95;

    /** Number of shakes required for a successful catch. */
    static REQUIRED_SHAKES = 3;

    // -- Core Calculations --------------------------------------------------------

    /**
     * Calculate the probability of catching a wild Sprite.
     *
     * @param {number} targetHpPct - Current HP as a fraction of max HP [0.0, 1.0].
     * @param {string} targetRarity - "common", "uncommon", "rare", or "legendary".
     * @param {number} crystalMultiplier - Catch crystal quality multiplier (e.g. 1.0, 1.5, 2.0).
     * @param {string} hasStatus - Active status condition on the target.
     * @returns {number} Catch probability clamped to [0.05, 0.95].
     */
    calculateCatchRate(targetHpPct, targetRarity, crystalMultiplier, hasStatus) {
        // Ensure HP percentage is in valid range.
        const hpPct = Math.min(Math.max(targetHpPct, 0.0), 1.0);

        // Look up status bonus; default to 1.0 for unknown statuses.
        const statusBonus = CatchRateCalculator.STATUS_MODIFIERS[hasStatus] !== undefined
            ? CatchRateCalculator.STATUS_MODIFIERS[hasStatus]
            : 1.0;

        // Look up rarity modifier; default to 1.0 for unknown rarities.
        const rarityModifier = CatchRateCalculator.RARITY_MODIFIERS[targetRarity] !== undefined
            ? CatchRateCalculator.RARITY_MODIFIERS[targetRarity]
            : 1.0;

        // Ensure crystal multiplier is at least 0.1 (protect against bad data).
        const crystalMult = Math.max(crystalMultiplier, 0.1);

        // Formula: 0.5 * (1.0 - hp_pct) * status_bonus * crystal_mult * rarity_modifier
        // At 100% HP the base is 0.0; at 0% HP the base is 0.5.
        const catchRate = 0.5 * (1.0 - hpPct) * statusBonus * crystalMult * rarityModifier;

        return Math.min(Math.max(catchRate, CatchRateCalculator.MIN_CATCH_RATE), CatchRateCalculator.MAX_CATCH_RATE);
    }

    /**
     * Simulate the shake-check sequence. Each of the 3 shakes succeeds
     * independently with probability = catch_rate^0.25.
     *
     * @param {number} catchRate - The catch probability from calculateCatchRate().
     * @returns {number} Number of successful shakes (0 to 3). A value of 3 means capture success.
     */
    calculateShakeCount(catchRate) {
        const rate = Math.min(Math.max(catchRate, 0.0), 1.0);
        const shakeProb = Math.pow(rate, 0.25);

        let shakes = 0;
        for (let i = 0; i < CatchRateCalculator.REQUIRED_SHAKES; i++) {
            const roll = Math.random();
            if (roll < shakeProb) {
                shakes += 1;
            } else {
                break; // Shake failed -- crystal breaks open.
            }
        }
        return shakes;
    }

    /**
     * Determine whether catching is blocked in the current battle context.
     * Catching is not allowed in trainer battles or against boss encounters.
     *
     * @param {boolean} isTrainerBattle - True if the player is fighting another trainer.
     * @param {boolean} isBoss - True if the target is a boss Sprite.
     * @returns {boolean} True if catching is blocked, false if the player may attempt a catch.
     */
    isCatchBlocked(isTrainerBattle, isBoss) {
        return isTrainerBattle || isBoss;
    }

    // -- Utility ------------------------------------------------------------------

    /**
     * Return a human-readable description of the catch difficulty for UI display.
     * @param {number} catchRate
     * @returns {string}
     */
    getDifficultyLabel(catchRate) {
        if (catchRate >= 0.80) return 'very_easy';
        if (catchRate >= 0.60) return 'easy';
        if (catchRate >= 0.40) return 'moderate';
        if (catchRate >= 0.20) return 'hard';
        if (catchRate >= 0.10) return 'very_hard';
        return 'near_impossible';
    }

    /**
     * Get the probability of passing all 3 shakes (overall catch success rate).
     * This is shake_prob^3 = (catch_rate^0.25)^3 = catch_rate^0.75
     * @param {number} catchRate
     * @returns {number}
     */
    getOverallSuccessProbability(catchRate) {
        const rate = Math.min(Math.max(catchRate, 0.0), 1.0);
        return Math.pow(rate, 0.75);
    }
}

// ============================================================================
// CatchSequence -- Orchestrates a full catch attempt from input to result.
// ============================================================================

export class CatchSequence {
    // -- Dependencies -------------------------------------------------------------

    constructor() {
        this._calculator = new CatchRateCalculator();
    }

    // -- Crystal Item Identifiers -------------------------------------------------
    // Maps crystal item IDs to their catch multipliers and display names.

    static CRYSTAL_DATA_TABLE = {
        201: { name: 'Catch Crystal', multiplier: 1.0, rarity: 'common' },
        202: { name: 'Great Crystal', multiplier: 1.5, rarity: 'uncommon' },
        203: { name: 'Ultra Crystal', multiplier: 2.0, rarity: 'rare' },
        204: { name: 'Master Crystal', multiplier: 255.0, rarity: 'legendary' },
        205: { name: 'Quick Crystal', multiplier: 1.0, rarity: 'common' },
        206: { name: 'Heavy Crystal', multiplier: 2.0, rarity: 'uncommon' },
        207: { name: 'Net Crystal', multiplier: 1.5, rarity: 'uncommon' },
    };

    /** Item IDs that are considered catch crystals. */
    static CRYSTAL_ITEM_IDS = [201, 202, 203, 204, 205, 206, 207];

    // -- Core Operations ----------------------------------------------------------

    /**
     * Execute a full catch attempt sequence.
     *
     * @param {number} targetHpPct - Current HP as a fraction of max HP [0.0, 1.0].
     * @param {string} targetRarity - "common", "uncommon", "rare", or "legendary".
     * @param {object} crystalData - Dictionary with at minimum "multiplier" (number) key.
     * @param {string} status - Active status condition on the target.
     * @param {boolean} isTrainer - True if a trainer battle.
     * @param {boolean} isBoss - True if the target is a boss.
     * @returns {{
     *   success: boolean,
     *   shakeCount: number,
     *   catchRate: number,
     *   blocked: boolean,
     *   blockReason: string
     * }}
     */
    attemptCatch(targetHpPct, targetRarity, crystalData, status, isTrainer, isBoss) {
        const result = {
            success: false,
            shakeCount: 0,
            catchRate: 0.0,
            blocked: false,
            blockReason: '',
        };

        // Check if catching is blocked.
        if (this._calculator.isCatchBlocked(isTrainer, isBoss)) {
            result.blocked = true;
            if (isTrainer) {
                result.blockReason = 'Cannot catch trainer-owned Sprites.';
            } else if (isBoss) {
                result.blockReason = 'This Sprite is too powerful to be caught.';
            }
            return result;
        }

        // Validate crystal data.
        const crystalMultiplier = crystalData.multiplier !== undefined ? crystalData.multiplier : 1.0;
        if (crystalMultiplier <= 0.0) {
            result.blocked = true;
            result.blockReason = 'Invalid crystal data.';
            return result;
        }

        // Calculate the catch rate.
        const catchRate = this._calculator.calculateCatchRate(
            targetHpPct, targetRarity, crystalMultiplier, status
        );
        result.catchRate = catchRate;

        // Master Crystal always succeeds (multiplier >= 255.0).
        if (crystalMultiplier >= 255.0) {
            result.success = true;
            result.shakeCount = CatchRateCalculator.REQUIRED_SHAKES;
            return result;
        }

        // Simulate shakes.
        const shakeCount = this._calculator.calculateShakeCount(catchRate);
        result.shakeCount = shakeCount;
        result.success = shakeCount >= CatchRateCalculator.REQUIRED_SHAKES;

        return result;
    }

    /**
     * Retrieve all catch crystals available in the player's inventory.
     *
     * @param {Object<number, number>} inventory - The player's inventory (item_id -> count).
     * @returns {Array<{itemId: number, name: string, multiplier: number, rarity: string, count: number}>}
     *   Sorted by multiplier descending (best crystals first).
     */
    getAvailableCrystals(inventory) {
        const available = [];

        for (const itemId of CatchSequence.CRYSTAL_ITEM_IDS) {
            const count = inventory[itemId] || 0;
            if (count <= 0) continue;

            const data = CatchSequence.CRYSTAL_DATA_TABLE[itemId];
            if (!data) continue;

            available.push({
                itemId: itemId,
                name: data.name || 'Unknown Crystal',
                multiplier: data.multiplier || 1.0,
                rarity: data.rarity || 'common',
                count: count,
            });
        }

        // Sort by multiplier descending so the best crystals appear first.
        available.sort((a, b) => b.multiplier - a.multiplier);

        return available;
    }

    /**
     * Check whether the player has at least one catch crystal in inventory.
     * @param {Object<number, number>} inventory
     * @returns {boolean}
     */
    hasAnyCrystal(inventory) {
        for (const itemId of CatchSequence.CRYSTAL_ITEM_IDS) {
            if ((inventory[itemId] || 0) > 0) return true;
        }
        return false;
    }

    /**
     * Get crystal data by item ID. Returns null if not found.
     * @param {number} itemId
     * @returns {object|null}
     */
    getCrystalInfo(itemId) {
        const data = CatchSequence.CRYSTAL_DATA_TABLE[itemId];
        if (!data) return null;
        return { ...data };
    }
}

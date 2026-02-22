/**
 * XPSystem -- Experience point calculation, distribution, and leveling logic.
 * [Progression] Computes battle XP rewards based on level differentials,
 * applies XP to individual Sprites, handles multi-level-up scenarios, and
 * queries the cubic XP curve.
 *
 * Ported from Game/Scripts/Battle/XPSystem.gd
 */

export class XPSystem {
    // -- Constants ----------------------------------------------------------------

    /** Hard level cap for all Sprites. */
    static MAX_LEVEL = 100;

    /** Base XP granted per battle (before level-difference modifiers). */
    static BASE_BATTLE_XP = 50;

    /** XP per average enemy level. */
    static XP_PER_ENEMY_LEVEL = 15;

    /** Minimum XP awarded from any battle (even if player is massively over-leveled). */
    static MIN_BATTLE_XP = 5;

    /** Maximum scaling factor when fighting much higher-level enemies. */
    static MAX_LEVEL_DIFF_MULTIPLIER = 3.0;

    /** Minimum scaling factor when fighting much lower-level enemies. */
    static MIN_LEVEL_DIFF_MULTIPLIER = 0.1;

    // -- XP Curve -----------------------------------------------------------------

    /**
     * XP threshold required to reach a given level.
     * Uses a cubic growth curve: threshold(level) = floor(4 * level^3 / 5)
     *
     * @param {number} level - The target level (1-100).
     * @returns {number} Cumulative XP needed to reach that level from level 1.
     */
    static getXpForLevel(level) {
        if (level <= 1) return 0;
        return Math.floor(4.0 * Math.pow(level, 3.0) / 5.0);
    }

    /**
     * XP still needed to advance from [currentLevel, currentXp] to the next level.
     *
     * @param {number} currentLevel - The Sprite's current level.
     * @param {number} currentXp - XP accumulated since last level-up.
     * @returns {number} Remaining XP needed. Returns 0 if at or above MAX_LEVEL.
     */
    static getXpToNext(currentLevel, currentXp) {
        if (currentLevel >= XPSystem.MAX_LEVEL) return 0;
        const threshold = XPSystem.getXpForLevel(currentLevel + 1);
        return Math.max(0, threshold - currentXp);
    }

    // -- Battle XP Calculation ----------------------------------------------------

    /**
     * Calculate total XP earned from a battle.
     *
     * The formula:
     *   base_xp = BASE_BATTLE_XP + avg_enemy_level * XP_PER_ENEMY_LEVEL
     *   level_diff = avg_enemy_level - avg_player_level
     *   modifier = clamp(1.0 + level_diff * 0.1, MIN, MAX)
     *   result = max(MIN_BATTLE_XP, floor(base_xp * modifier))
     *
     * Fighting higher-level enemies yields bonus XP; lower-level yields less.
     *
     * @param {number[]} playerLevels - Array of int levels of all participating player Sprites.
     * @param {number[]} enemyLevels - Array of int levels of all enemy Sprites in the battle.
     * @returns {number} Total XP to be divided among surviving Sprites.
     */
    calculateBattleXp(playerLevels, enemyLevels) {
        if (enemyLevels.length === 0) return XPSystem.MIN_BATTLE_XP;

        // Calculate average levels.
        const avgEnemy = this._calculateAverage(enemyLevels);
        const avgPlayer = playerLevels.length > 0 ? this._calculateAverage(playerLevels) : 1.0;

        // Base XP from enemy level.
        const baseXp = XPSystem.BASE_BATTLE_XP + avgEnemy * XPSystem.XP_PER_ENEMY_LEVEL;

        // Level difference modifier.
        const levelDiff = avgEnemy - avgPlayer;
        const modifier = Math.min(
            Math.max(1.0 + levelDiff * 0.1, XPSystem.MIN_LEVEL_DIFF_MULTIPLIER),
            XPSystem.MAX_LEVEL_DIFF_MULTIPLIER
        );

        const total = Math.max(XPSystem.MIN_BATTLE_XP, Math.floor(baseXp * modifier));
        return total;
    }

    // -- XP Application -----------------------------------------------------------

    /**
     * Apply XP to a single Sprite, processing any level-ups and recording
     * newly learned abilities at each level gained.
     *
     * @param {object} sprite - The SpriteInstance Resource to award XP to.
     * @param {number} amount - XP amount to grant.
     * @returns {Array<{newLevel: number, newAbilities: number[], xpThreshold: number}>}
     *   Array of level-up event objects. Empty array if no level-ups occurred.
     */
    applyXp(sprite, amount) {
        const levelUps = [];

        if (sprite == null) {
            console.warn('XPSystem.applyXp: sprite is null.');
            return levelUps;
        }

        if (sprite.level >= XPSystem.MAX_LEVEL) return levelUps;
        if (amount <= 0) return levelUps;

        const oldLevel = sprite.level;
        const levelsGained = sprite.grantXp(amount);

        // Record each level-up with its threshold and any new abilities.
        for (let i = 0; i < levelsGained; i++) {
            const reachedLevel = oldLevel + i + 1;
            const threshold = XPSystem.getXpForLevel(reachedLevel);

            levelUps.push({
                newLevel: reachedLevel,
                newAbilities: [], // Caller should populate via AbilityLearner
                xpThreshold: threshold,
            });
        }

        return levelUps;
    }

    // -- XP Distribution ----------------------------------------------------------

    /**
     * Distribute battle XP among an array of participating Sprites.
     * XP is divided equally; each Sprite gets at least 1 XP.
     *
     * @param {object[]} sprites - Array of SpriteInstance Resources that participated.
     * @param {number} totalXp - Total XP pool to distribute.
     * @param {number} faintedShare - Fraction of XP that fainted Sprites receive [0.0, 1.0].
     * @returns {Array<{sprite: object, xpReceived: number, levelUps: Array}>}
     */
    distributeXp(sprites, totalXp, faintedShare = 0.0) {
        const results = [];

        if (sprites.length === 0 || totalXp <= 0) return results;

        // Separate alive and fainted Sprites.
        const alive = [];
        const fainted = [];
        for (const sprite of sprites) {
            if (sprite == null) continue;
            if (sprite.isFainted && sprite.isFainted()) {
                fainted.push(sprite);
            } else {
                alive.push(sprite);
            }
        }

        // Calculate effective recipient count (fainted count as partial).
        let effectiveCount = alive.length + fainted.length * faintedShare;
        if (effectiveCount < 1.0) effectiveCount = 1.0;

        const sharePerUnit = Math.max(1, Math.floor(totalXp / effectiveCount));
        const faintedXp = Math.max(0, Math.floor(sharePerUnit * faintedShare));

        // Apply XP to alive Sprites.
        for (const sprite of alive) {
            const levelUps = this.applyXp(sprite, sharePerUnit);
            results.push({
                sprite: sprite,
                xpReceived: sharePerUnit,
                levelUps: levelUps,
            });
        }

        // Apply reduced XP to fainted Sprites.
        for (const sprite of fainted) {
            if (faintedXp > 0) {
                const levelUps = this.applyXp(sprite, faintedXp);
                results.push({
                    sprite: sprite,
                    xpReceived: faintedXp,
                    levelUps: levelUps,
                });
            }
        }

        return results;
    }

    // -- XP Preview ---------------------------------------------------------------

    /**
     * Preview how many levels a Sprite would gain from a given amount of XP
     * without actually applying it.
     *
     * @param {number} currentLevel - The Sprite's current level.
     * @param {number} currentXp - XP accumulated since last level-up.
     * @param {number} xpAmount - Hypothetical XP to add.
     * @returns {{levelsGained: number, finalLevel: number, remainingXp: number}}
     */
    previewXpGain(currentLevel, currentXp, xpAmount) {
        let lv = currentLevel;
        let xp = currentXp + xpAmount;
        let levelsGained = 0;

        while (lv < XPSystem.MAX_LEVEL) {
            const threshold = XPSystem.getXpForLevel(lv + 1);
            if (xp < threshold) break;
            xp -= threshold;
            lv += 1;
            levelsGained += 1;
        }

        if (lv >= XPSystem.MAX_LEVEL) {
            xp = 0;
        }

        return {
            levelsGained: levelsGained,
            finalLevel: lv,
            remainingXp: xp,
        };
    }

    // -- Internal Helpers ---------------------------------------------------------

    /**
     * Calculate the average of an array of int/float values.
     * @param {number[]} values
     * @returns {number}
     */
    _calculateAverage(values) {
        if (values.length === 0) return 0.0;
        let total = 0.0;
        for (const v of values) {
            total += v;
        }
        return total / values.length;
    }
}

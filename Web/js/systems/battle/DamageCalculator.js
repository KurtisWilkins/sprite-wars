/**
 * DamageCalculator -- [P3-004/005] Complete damage formula for Sprite Wars combat.
 * Handles physical/special split, STAB, type effectiveness, critical hits,
 * damage variance, defense buffs bypass on crit, and composition bonuses.
 *
 * Ported from Game/Scripts/Battle/DamageCalculator.gd
 */

export class DamageCalculator {
    // -- Constants ----------------------------------------------------------------

    /** Base critical hit chance (6.25%). */
    static BASE_CRIT_CHANCE = 0.0625;

    /** Critical hit damage multiplier. */
    static CRIT_MULTIPLIER = 1.5;

    /** STAB (Same Type Attack Bonus) multiplier. */
    static STAB_MULTIPLIER = 1.5;

    /** Damage variance range: final damage is multiplied by a random value in this range. */
    static VARIANCE_MIN = 0.85;
    static VARIANCE_MAX = 1.0;

    /** Minimum damage any attack can deal (prevents 0-damage attacks). */
    static MIN_DAMAGE = 1;

    /**
     * Speed contribution to crit chance: crit_bonus = speed / SPEED_CRIT_DIVISOR.
     * A unit with 200 speed gets +2% crit.
     */
    static SPEED_CRIT_DIVISOR = 10000.0;

    /** Immune threshold -- effectiveness below this means immune. */
    static IMMUNE_THRESHOLD = 0.01;

    // -- Main Damage Calculation --------------------------------------------------

    /**
     * Calculate the full damage result for an ability hitting a defender.
     *
     * @param {import('./BattleUnit.js').BattleUnit} attacker - The attacking BattleUnit.
     * @param {import('./BattleUnit.js').BattleUnit} defender - The defending BattleUnit.
     * @param {object} ability - The AbilityData being used.
     * @param {Object<number, object>} elementChart - Dictionary mapping element_id -> ElementData resource.
     * @returns {{
     *   rawDamage: number,
     *   finalDamage: number,
     *   isCritical: boolean,
     *   effectiveness: number,
     *   isStab: boolean,
     *   effectivenessLabel: string
     * }}
     */
    calculateDamage(attacker, defender, ability, elementChart) {
        const result = {
            rawDamage: 0,
            finalDamage: 0,
            isCritical: false,
            effectiveness: 1.0,
            isStab: false,
            effectivenessLabel: 'neutral',
        };

        // Non-damaging abilities deal no damage.
        if (!ability.isDamaging()) {
            return result;
        }

        // -- Step 1: Determine offensive and defensive stats ----------------------
        const atkStatKey = ability.getOffenseStatKey();
        const defStatKey = ability.getDefenseStatKey();
        let atkValue = attacker.effectiveStats[atkStatKey] || 1;
        let defValue = defender.effectiveStats[defStatKey] || 1;

        // -- Step 2: Check for critical hit ---------------------------------------
        const critChance = this.calculateCritChance(attacker, ability.critRateBonus || 0);
        const isCrit = Math.random() < critChance;
        result.isCritical = isCrit;

        // Crits bypass defense buffs: use base defense instead of buffed defense.
        if (isCrit) {
            const baseDef = defender._baseBattleStats[defStatKey] || 1;
            if (defValue > baseDef) {
                defValue = baseDef;
            }
        }

        // Prevent division by zero.
        defValue = Math.max(defValue, 1.0);

        // -- Step 3: Level modifier -----------------------------------------------
        const level = attacker.getLevel();
        const levelMod = (2.0 * level / 5.0 + 2.0);

        // -- Step 4: Base damage calculation --------------------------------------
        // Formula: ((2 * level / 5 + 2) * base_power * ATK / DEF) / 50 + 2
        let baseDamage = (levelMod * ability.basePower * atkValue / defValue) / 50.0 + 2.0;

        // -- Step 5: STAB (Same Type Attack Bonus) --------------------------------
        const isStab = this._checkStab(attacker, ability);
        result.isStab = isStab;
        if (isStab) {
            baseDamage *= DamageCalculator.STAB_MULTIPLIER;
        }

        // -- Step 6: Type effectiveness -------------------------------------------
        const effectiveness = this._calculateEffectiveness(ability, defender, elementChart);
        result.effectiveness = effectiveness;
        result.effectivenessLabel = DamageCalculator.effectivenessLabel(effectiveness);
        baseDamage *= effectiveness;

        // -- Step 7: Critical hit multiplier --------------------------------------
        if (isCrit) {
            baseDamage *= DamageCalculator.CRIT_MULTIPLIER;
        }

        // Store raw damage before variance.
        result.rawDamage = Math.max(DamageCalculator.MIN_DAMAGE, Math.floor(baseDamage));

        // -- Step 8: Damage variance (0.85 - 1.0) --------------------------------
        const variance = DamageCalculator.VARIANCE_MIN +
            Math.random() * (DamageCalculator.VARIANCE_MAX - DamageCalculator.VARIANCE_MIN);
        let finalDamage = Math.max(DamageCalculator.MIN_DAMAGE, Math.floor(baseDamage * variance));

        // Immune targets take 0 damage.
        if (effectiveness < DamageCalculator.IMMUNE_THRESHOLD) {
            finalDamage = 0;
            result.rawDamage = 0;
        }

        result.finalDamage = finalDamage;
        return result;
    }

    // -- Critical Hit Chance ------------------------------------------------------

    /**
     * Calculate the probability of a critical hit.
     * Base 6.25% + speed bonus + ability-specific crit bonus.
     * @param {import('./BattleUnit.js').BattleUnit} attacker
     * @param {number} abilityCritBonus
     * @returns {number}
     */
    calculateCritChance(attacker, abilityCritBonus = 0.0) {
        let chance = DamageCalculator.BASE_CRIT_CHANCE;

        // Speed contributes a small crit bonus.
        const speed = attacker.effectiveStats.spd || 0;
        chance += speed / DamageCalculator.SPEED_CRIT_DIVISOR;

        // Ability-specific bonus.
        chance += abilityCritBonus;

        // Cap at 50% to prevent guaranteed crits.
        return Math.min(Math.max(chance, 0.0), 0.5);
    }

    // -- Composition Bonuses ------------------------------------------------------

    /**
     * Apply team composition bonuses to a unit's stats.
     * @param {import('./BattleUnit.js').BattleUnit} unit - The BattleUnit receiving bonuses.
     * @param {Array<{stat: string, value: number}>} bonuses - Array of bonus objects.
     * @returns {Object<string, number>} Dictionary of stat modifications applied.
     */
    applyCompositionBonuses(unit, bonuses) {
        const applied = {};
        for (const bonus of bonuses) {
            const statKey = bonus.stat || '';
            const value = bonus.value !== undefined ? bonus.value : 1.0;
            if (statKey === '' || value === 1.0) continue;
            unit.applyStatModifier(statKey, value);
            applied[statKey] = value;
        }
        return applied;
    }

    // -- Healing Calculation ------------------------------------------------------

    /**
     * Calculate heal amount for a healing ability.
     * Uses sp_atk as the healing stat with a simpler formula.
     * @param {import('./BattleUnit.js').BattleUnit} caster
     * @param {object} ability
     * @returns {number}
     */
    calculateHeal(caster, ability) {
        if (ability.basePower <= 0) return 0;
        const spAtk = caster.effectiveStats.sp_atk || 1;
        const level = caster.getLevel();
        const levelMod = (2.0 * level / 5.0 + 2.0);
        // Healing formula: simplified, no defense factor.
        const healAmount = (levelMod * ability.basePower * spAtk) / 100.0 + 5.0;
        return Math.max(1, Math.floor(healAmount));
    }

    // -- Private Helpers ----------------------------------------------------------

    /**
     * Check if the attacker gets Same Type Attack Bonus for this ability.
     * @param {import('./BattleUnit.js').BattleUnit} attacker
     * @param {object} ability
     * @returns {boolean}
     */
    _checkStab(attacker, ability) {
        if (!ability.elementType || ability.elementType === '') return false;
        // STAB applies if the ability's element matches any of the attacker's elements.
        for (const elem of attacker.getElementTypes()) {
            if (elem === ability.elementType) return true;
        }
        return false;
    }

    /**
     * Calculate type effectiveness of an ability against a defender.
     * Handles dual-type defenders by multiplying individual effectiveness values.
     * @param {object} ability
     * @param {import('./BattleUnit.js').BattleUnit} defender
     * @param {Object<number, object>} elementChart
     * @returns {number}
     */
    _calculateEffectiveness(ability, defender, elementChart) {
        if (!ability.elementType || ability.elementType === '') return 1.0;
        if (!elementChart || typeof elementChart !== 'object') return 1.0;

        // Resolve attacking element ID from name.
        // elementChart can be either:
        //   (a) { atkElemId: { defElemId: multiplier } }  (raw EFFECTIVENESS_CHART)
        //   (b) { eid: { elementName, getMultiplierAgainst() } }  (wrapped)
        // We support both formats.

        // Try to find atkElementId from ELEMENT_IDS-style name mapping.
        // First check if the chart has a helper attached; otherwise do a name→id lookup.
        let atkElementId = null;

        // Check if chart entries have elementName (wrapped format)
        const firstKey = Object.keys(elementChart)[0];
        const isWrapped = firstKey && elementChart[firstKey] && typeof elementChart[firstKey].elementName === 'string';

        if (isWrapped) {
            // Wrapped format: find by elementName, use getMultiplierAgainst
            let atkElement = null;
            for (const eid in elementChart) {
                const ed = elementChart[eid];
                if (ed.elementName === ability.elementType) {
                    atkElement = ed;
                    break;
                }
            }
            if (!atkElement) return 1.0;

            const defendingElementIds = [];
            const defenderTypes = defender.getElementTypes();
            for (const eid in elementChart) {
                const ed = elementChart[eid];
                if (defenderTypes.includes(ed.elementName)) {
                    defendingElementIds.push(parseInt(eid, 10));
                }
            }
            if (defendingElementIds.length === 0) return 1.0;

            let total = 1.0;
            for (const defEid of defendingElementIds) {
                total *= atkElement.getMultiplierAgainst(defEid);
            }
            return total;
        }

        // Raw format: { atkElemId: { defElemId: multiplier } }
        // Need a name→id mapping. Build one from common element names.
        const NAME_TO_ID = {
            Fire: 1, Water: 2, Wind: 3, Earth: 4, Plant: 5, Metal: 6,
            Electric: 7, Dark: 8, Light: 9, Solar: 10, Lunar: 11,
            Fairy: 12, Poison: 13, Ice: 14,
        };

        atkElementId = NAME_TO_ID[ability.elementType];
        if (atkElementId == null) return 1.0;

        const atkMatchups = elementChart[atkElementId];
        if (!atkMatchups) return 1.0;

        // Get the defender's element IDs
        const defenderTypes = defender.getElementTypes();
        if (!defenderTypes || defenderTypes.length === 0) return 1.0;

        let total = 1.0;
        for (const defType of defenderTypes) {
            const defId = NAME_TO_ID[defType];
            if (defId == null) continue;
            const mult = atkMatchups[defId];
            if (mult !== undefined) {
                total *= mult;
            }
            // Missing entry = 1.0 (neutral), so no multiplication needed
        }

        return total;
    }

    // -- Static Helpers -----------------------------------------------------------

    /**
     * Get a human-readable label for an effectiveness value.
     * Mirrors ElementData.effectiveness_label from the GDScript source.
     * @param {number} effectiveness
     * @returns {string}
     */
    static effectivenessLabel(effectiveness) {
        if (effectiveness < DamageCalculator.IMMUNE_THRESHOLD) return 'immune';
        if (effectiveness > 1.5) return 'super_effective';
        if (effectiveness < 0.75) return 'not_very_effective';
        return 'neutral';
    }
}

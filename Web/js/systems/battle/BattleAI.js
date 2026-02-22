/**
 * BattleAI -- [P3-013] Enemy AI decision-making for auto-battler combat.
 * Evaluates abilities and targets to choose the best action each turn.
 * Uses a priority-based system: type advantage > heal when low > highest damage > status.
 *
 * Ported from Game/Scripts/Battle/BattleAI.gd
 */

export class BattleAI {
    // -- Constants ----------------------------------------------------------------

    /** HP threshold for healing priority (30%). */
    static HEAL_HP_THRESHOLD = 0.30;

    /** Minimum expected damage to consider a damage ability worthwhile. */
    static MIN_DAMAGE_THRESHOLD = 5.0;

    /** Weights for target prioritization. */
    static WEIGHT_LOW_HP = 3.0;
    static WEIGHT_TYPE_ADVANTAGE = 2.5;
    static WEIGHT_THREAT_LEVEL = 1.5;

    // -- Action Decision ----------------------------------------------------------

    /**
     * Decide the best action for a unit.
     *
     * @param {import('./BattleUnit.js').BattleUnit} unit - The BattleUnit making the decision.
     * @param {import('./BattleGrid.js').BattleGrid} grid - The BattleGrid for target/position queries.
     * @param {import('./DamageCalculator.js').DamageCalculator} damageCalc - The DamageCalculator for estimating damage.
     * @param {Object<number, object>} abilityDb - Dictionary of abilityId -> AbilityData resources.
     * @param {Object<number, object>} elementChart - Dictionary of elementId -> ElementData resources.
     * @returns {{ability: object|null, target: import('./BattleUnit.js').BattleUnit|null, score: number}}
     */
    decideAction(unit, grid, damageCalc, abilityDb = {}, elementChart = {}) {
        let bestAction = {
            ability: null,
            target: null,
            score: -1.0,
        };

        if (unit == null || !unit.isAlive || !unit.canAct) {
            return bestAction;
        }

        // Get all usable abilities.
        const usableAbilities = this._getUsableAbilities(unit, abilityDb);
        if (usableAbilities.length === 0) {
            return bestAction;
        }

        // -- Priority 1: Heal if HP is low ----------------------------------------
        if (unit.getHpFraction() < BattleAI.HEAL_HP_THRESHOLD) {
            const healAction = this._findBestHeal(unit, usableAbilities, grid);
            if (healAction.ability !== null) {
                return healAction;
            }
        }

        // -- Priority 2 & 3: Evaluate all damage/status abilities -----------------
        const enemyTeam = unit.team === 0 ? 1 : 0;
        const enemies = grid.getAllUnits(enemyTeam);

        if (enemies.length === 0) {
            // No enemies left -- try any self-buff or ally ability.
            const buffAction = this._findBestBuff(unit, usableAbilities, grid);
            if (buffAction.ability !== null) {
                return buffAction;
            }
            return bestAction;
        }

        // Evaluate every ability against every possible target.
        for (const ability of usableAbilities) {
            if (this._isHealingAbility(ability)) {
                continue; // Already checked healing above.
            }

            if (this._isAllyAbility(ability)) {
                // Evaluate ally-targeted abilities (buffs, etc.).
                const allies = grid.getAllUnits(unit.team);
                for (const ally of allies) {
                    const score = this._evaluateAllyAbilityValue(ability, unit, ally, elementChart);
                    if (score > bestAction.score) {
                        bestAction = { ability, target: ally, score };
                    }
                }
                continue;
            }

            // Damage/status ability against enemies.
            for (const enemy of enemies) {
                const score = this.evaluateAbilityValue(ability, unit, enemy, damageCalc, elementChart);
                if (score > bestAction.score) {
                    bestAction = { ability, target: enemy, score };
                }
            }
        }

        return bestAction;
    }

    // -- Target Prioritization ----------------------------------------------------

    /**
     * Evaluate target priority and return the best target from a list.
     * Prefers: lowest HP > type advantage > highest threat level.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {import('./BattleUnit.js').BattleUnit[]} targets
     * @param {Object<number, object>} elementChart
     * @returns {import('./BattleUnit.js').BattleUnit|null}
     */
    evaluateTargetPriority(unit, targets, elementChart = {}) {
        if (targets.length === 0) return null;

        let bestTarget = null;
        let bestScore = -1.0;

        for (const target of targets) {
            if (!target.isAlive) continue;

            let score = 0.0;

            // Low HP bonus: prioritize finishing off weakened targets.
            const hpFrac = target.getHpFraction();
            score += (1.0 - hpFrac) * BattleAI.WEIGHT_LOW_HP;

            // Type advantage bonus.
            if (this._hasTypeAdvantage(unit, target, elementChart)) {
                score += BattleAI.WEIGHT_TYPE_ADVANTAGE;
            }

            // Threat level: high ATK or SP_ATK targets are dangerous.
            const threat = Math.max(
                target.effectiveStats.atk || 0,
                target.effectiveStats.sp_atk || 0
            );
            score += (threat / 200.0) * BattleAI.WEIGHT_THREAT_LEVEL;

            if (score > bestScore) {
                bestScore = score;
                bestTarget = target;
            }
        }

        return bestTarget;
    }

    // -- Ability Value Evaluation -------------------------------------------------

    /**
     * Evaluate the value of using a specific ability against a specific target.
     * Returns a score (higher = better).
     * @param {object} ability
     * @param {import('./BattleUnit.js').BattleUnit} caster
     * @param {import('./BattleUnit.js').BattleUnit} target
     * @param {import('./DamageCalculator.js').DamageCalculator|null} damageCalc
     * @param {Object<number, object>} elementChart
     * @returns {number}
     */
    evaluateAbilityValue(ability, caster, target, damageCalc = null, elementChart = {}) {
        let score = 0.0;

        if (ability.isDamaging() && damageCalc !== null) {
            // Estimate damage without RNG (no crits, no variance).
            const estDamage = this._estimateDamage(caster, target, ability, damageCalc, elementChart);
            score += estDamage;

            // Bonus for type advantage.
            const effectiveness = this._getEffectiveness(ability, target, elementChart);
            if (effectiveness > 1.5) {
                score *= 1.5; // Super effective bonus.
            } else if (effectiveness < 0.75) {
                score *= 0.5; // Not very effective penalty.
            } else if (effectiveness < 0.01) {
                score = 0.0; // Immune -- don't bother.
            }

            // Bonus for killing the target.
            if (estDamage >= target.currentHp) {
                score *= 2.0;
            }
        }

        // Status effect value.
        if (ability.hasStatusEffects()) {
            // Bonus for landing debuffs on targets without them.
            let statusBonus = 10.0 * ability.statusApplyChance;
            // Reduced value if target already has many effects.
            if (target.activeStatusEffects.length >= 3) {
                statusBonus *= 0.3;
            }
            score += statusBonus;
        }

        // Penalize low accuracy.
        score *= ability.accuracy;

        return score;
    }

    // -- Private Helpers ----------------------------------------------------------

    /**
     * Get all usable abilities for a unit.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {Object<number, object>} abilityDb
     * @returns {object[]}
     */
    _getUsableAbilities(unit, abilityDb) {
        const result = [];
        for (const abilityId of unit.equippedAbilities) {
            const ability = abilityDb[abilityId];
            if (ability != null && unit.canUseAbility(ability)) {
                result.push(ability);
            }
        }
        return result;
    }

    /**
     * Find the best healing ability to use when HP is low.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {object[]} abilities
     * @param {import('./BattleGrid.js').BattleGrid} grid
     * @returns {{ability: object|null, target: import('./BattleUnit.js').BattleUnit|null, score: number}}
     */
    _findBestHeal(unit, abilities, grid) {
        let best = { ability: null, target: null, score: -1.0 };

        for (const ability of abilities) {
            if (this._isHealingAbility(ability)) {
                // Self-heal scores higher when HP is lower.
                const score = (1.0 - unit.getHpFraction()) * 100.0;
                if (score > best.score) {
                    best = { ability, target: unit, score };
                }
            }
        }

        return best;
    }

    /**
     * Find the best buff ability to use.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {object[]} abilities
     * @param {import('./BattleGrid.js').BattleGrid} grid
     * @returns {{ability: object|null, target: import('./BattleUnit.js').BattleUnit|null, score: number}}
     */
    _findBestBuff(unit, abilities, grid) {
        let best = { ability: null, target: null, score: -1.0 };

        for (const ability of abilities) {
            if (this._isAllyAbility(ability)) {
                best = { ability, target: unit, score: 5.0 };
                break;
            }
        }

        return best;
    }

    /**
     * Estimate damage without RNG.
     * @param {import('./BattleUnit.js').BattleUnit} caster
     * @param {import('./BattleUnit.js').BattleUnit} target
     * @param {object} ability
     * @param {import('./DamageCalculator.js').DamageCalculator} damageCalc
     * @param {Object<number, object>} elementChart
     * @returns {number}
     */
    _estimateDamage(caster, target, ability, damageCalc, elementChart) {
        if (!ability.isDamaging()) return 0.0;

        // Use the formula deterministically.
        const atkKey = ability.getOffenseStatKey();
        const defKey = ability.getDefenseStatKey();
        const atkVal = caster.effectiveStats[atkKey] || 1;
        const defVal = Math.max(target.effectiveStats[defKey] || 1, 1.0);

        const level = caster.getLevel();
        const levelMod = (2.0 * level / 5.0 + 2.0);
        let base = (levelMod * ability.basePower * atkVal / defVal) / 50.0 + 2.0;

        // STAB.
        for (const elem of caster.getElementTypes()) {
            if (elem === ability.elementType) {
                base *= 1.5;
                break;
            }
        }

        // Effectiveness.
        const eff = this._getEffectiveness(ability, target, elementChart);
        base *= eff;

        return base;
    }

    /**
     * Get type effectiveness of an ability against a defender.
     * @param {object} ability
     * @param {import('./BattleUnit.js').BattleUnit} target
     * @param {Object<number, object>} elementChart
     * @returns {number}
     */
    _getEffectiveness(ability, target, elementChart) {
        if (!ability.elementType || ability.elementType === '') return 1.0;

        let atkElement = null;
        for (const eid in elementChart) {
            const ed = elementChart[eid];
            if (ed.elementName === ability.elementType) {
                atkElement = ed;
                break;
            }
        }

        if (atkElement === null) return 1.0;

        let total = 1.0;
        for (const eid in elementChart) {
            const ed = elementChart[eid];
            if (target.getElementTypes().includes(ed.elementName)) {
                total *= atkElement.getMultiplierAgainst(parseInt(eid, 10));
            }
        }

        return total;
    }

    /**
     * Check if this unit has a type advantage against the target.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {import('./BattleUnit.js').BattleUnit} target
     * @param {Object<number, object>} elementChart
     * @returns {boolean}
     */
    _hasTypeAdvantage(unit, target, elementChart) {
        for (const elemName of unit.getElementTypes()) {
            for (const eid in elementChart) {
                const ed = elementChart[eid];
                if (ed.elementName === elemName) {
                    for (const targetElem of target.getElementTypes()) {
                        for (const teid in elementChart) {
                            const ted = elementChart[teid];
                            if (ted.elementName === targetElem) {
                                if (ed.getMultiplierAgainst(parseInt(teid, 10)) > 1.5) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    /**
     * Whether an ability is ally-targeted (healing/buff).
     * @param {object} ability
     * @returns {boolean}
     */
    _isAllyAbility(ability) {
        return ['single_ally', 'all_allies', 'adjacent_allies', 'self'].includes(ability.targetingType);
    }

    /**
     * Whether an ability is specifically a healing ability.
     * @param {object} ability
     * @returns {boolean}
     */
    _isHealingAbility(ability) {
        return !ability.isDamaging() && this._isAllyAbility(ability);
    }

    /**
     * Evaluate value of an ally-targeted ability.
     * @param {object} ability
     * @param {import('./BattleUnit.js').BattleUnit} caster
     * @param {import('./BattleUnit.js').BattleUnit} ally
     * @param {Object<number, object>} elementChart
     * @returns {number}
     */
    _evaluateAllyAbilityValue(ability, caster, ally, elementChart) {
        let score = 0.0;

        // Healing value: proportional to HP missing.
        if (!ability.isDamaging()) {
            score += (1.0 - ally.getHpFraction()) * 50.0;
        }

        // Status effect value (buffs on allies).
        if (ability.hasStatusEffects()) {
            score += 15.0 * ability.statusApplyChance;
        }

        return score;
    }
}

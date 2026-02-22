/**
 * AbilityExecutor -- [P3-006] Complete ability execution pipeline.
 * Handles validation, PP consumption, accuracy, damage/heal calculation,
 * status effect application, knockback, and result packaging for the UI.
 *
 * Ported from Game/Scripts/Battle/AbilityExecutor.gd
 */

export class AbilityExecutor {
    // -- Constants ----------------------------------------------------------------

    /** Default knockback distance for abilities that knock back. */
    static DEFAULT_KNOCKBACK_DISTANCE = 2;

    // -- Ability Execution Pipeline -----------------------------------------------

    /**
     * Execute an ability from start to finish.
     *
     * Pipeline:
     * 1. Validate targeting (range, valid targets)
     * 2. Consume PP / start cooldown
     * 3. Accuracy check per target
     * 4. Calculate damage per target (or apply heal/buff)
     * 5. Apply status effects (roll against apply_chance)
     * 6. Process knockback if ability has it
     * 7. Return results array for UI/animation
     *
     * @param {import('./BattleUnit.js').BattleUnit} caster - The BattleUnit using the ability.
     * @param {object} ability - The AbilityData being executed.
     * @param {import('./BattleUnit.js').BattleUnit[]} targets - Array of BattleUnits to be affected.
     * @param {import('./BattleGrid.js').BattleGrid} grid - The BattleGrid for position lookups.
     * @param {import('./DamageCalculator.js').DamageCalculator} damageCalc - The DamageCalculator instance.
     * @param {Object<number, object>} elementChart - Dictionary of element_id -> ElementData.
     * @param {import('./StatusEffectSystem.js').StatusEffectSystem|null} statusSystem - The StatusEffectSystem.
     * @param {object|null} knockbackSys - The KnockbackSystem for knockback processing.
     * @param {Object<number, object>} statusDb - Dictionary of effect_id -> StatusEffectData.
     * @returns {Array<{
     *   target: import('./BattleUnit.js').BattleUnit,
     *   hit: boolean,
     *   damage: number,
     *   isCrit: boolean,
     *   effectiveness: number,
     *   effectivenessLabel: string,
     *   healed: number,
     *   statusApplied: string[],
     *   knockback: object|null,
     *   isFainted: boolean
     * }>}
     */
    executeAbility(
        caster,
        ability,
        targets,
        grid,
        damageCalc,
        elementChart = {},
        statusSystem = null,
        knockbackSys = null,
        statusDb = {},
    ) {
        const results = [];

        if (targets.length === 0) return results;

        // -- Step 2: Consume PP and start cooldown --------------------------------
        caster.consumePp(ability);

        // -- Process each target --------------------------------------------------
        const targetCount = targets.length;

        for (let i = 0; i < targetCount; i++) {
            const target = targets[i];
            const result = {
                target: target,
                hit: false,
                damage: 0,
                isCrit: false,
                effectiveness: 1.0,
                effectivenessLabel: 'neutral',
                healed: 0,
                statusApplied: [],
                knockback: null,
                isFainted: false,
            };

            if (target == null || !target.isAlive) {
                results.push(result);
                continue;
            }

            // -- Step 3: Accuracy check -------------------------------------------
            if (!this._checkAccuracy(ability)) {
                result.hit = false;
                results.push(result);
                continue;
            }

            result.hit = true;

            // -- Step 4: Calculate damage or apply heal/buff ----------------------
            if (ability.isDamaging()) {
                const dmgResult = damageCalc.calculateDamage(
                    caster, target, ability, elementChart
                );

                // Apply splash falloff for secondary targets.
                let finalDmg = dmgResult.finalDamage;
                if (i > 0 && targetCount > 1) {
                    finalDmg = Math.max(1, Math.floor(finalDmg * 0.75));
                }

                // Apply the damage to the target.
                const takeResult = target.takeDamage(finalDmg);

                result.damage = takeResult.actualDamage;
                result.isCrit = dmgResult.isCritical;
                result.effectiveness = dmgResult.effectiveness;
                result.effectivenessLabel = dmgResult.effectivenessLabel || 'neutral';
                result.isFainted = takeResult.isFainted;

            } else if (ability.basePower <= 0 && this._isHealingAbility(ability)) {
                // Healing ability: heal the target.
                const healAmount = damageCalc.calculateHeal(caster, ability);
                const actualHealed = target.heal(healAmount);
                result.healed = actualHealed;
            }

            // -- Step 5: Apply status effects -------------------------------------
            if (ability.hasStatusEffects() && statusSystem !== null) {
                for (const effectId of ability.statusEffectIds) {
                    // Roll against the ability's apply chance.
                    if (Math.random() <= ability.statusApplyChance) {
                        const effectData = statusDb[effectId];
                        if (effectData != null) {
                            const applied = statusSystem.applyEffect(target, effectData);
                            if (applied) {
                                result.statusApplied.push(effectData.effectName);
                            }
                        }
                    }
                }
            }

            // -- Step 6: Process knockback ----------------------------------------
            if (knockbackSys !== null && this._hasKnockback(ability) && target.isAlive) {
                const kbDirection = this._getKnockbackDirection(caster, target);
                const kbResult = knockbackSys.processKnockback(
                    target, kbDirection, AbilityExecutor.DEFAULT_KNOCKBACK_DISTANCE, grid
                );
                result.knockback = kbResult;
            }

            results.push(result);
        }

        return results;
    }

    // -- Validation ---------------------------------------------------------------

    /**
     * Validate whether a caster can use a specific ability right now.
     * @param {import('./BattleUnit.js').BattleUnit} caster
     * @param {object} ability
     * @returns {{valid: boolean, reason: string}}
     */
    validateAbilityUse(caster, ability) {
        if (caster == null) {
            return { valid: false, reason: 'No caster unit.' };
        }

        if (!caster.isAlive) {
            return { valid: false, reason: 'Caster has fainted.' };
        }

        if (!caster.canAct) {
            return { valid: false, reason: 'Caster cannot act (stunned/frozen/asleep).' };
        }

        if (ability == null) {
            return { valid: false, reason: 'No ability selected.' };
        }

        // Check that the caster has this ability equipped.
        if (!caster.equippedAbilities.includes(ability.abilityId)) {
            return { valid: false, reason: 'Ability not equipped.' };
        }

        // Check PP and cooldown.
        if (!caster.canUseAbility(ability)) {
            if (ability.abilityId in caster.abilityCooldowns) {
                const cd = caster.abilityCooldowns[ability.abilityId];
                return { valid: false, reason: `On cooldown (${cd} turns).` };
            }
            return { valid: false, reason: 'No PP remaining.' };
        }

        return { valid: true, reason: '' };
    }

    // -- Target Resolution --------------------------------------------------------

    /**
     * Get all valid targets for an ability from the caster's perspective.
     * Filters by team affinity, range, and alive status.
     * @param {import('./BattleUnit.js').BattleUnit} caster
     * @param {object} ability
     * @param {import('./BattleGrid.js').BattleGrid} grid
     * @returns {import('./BattleUnit.js').BattleUnit[]}
     */
    getValidTargets(caster, ability, grid) {
        const valid = [];
        const pattern = ability.targetingType;

        // Self-targeting abilities.
        if (pattern === 'self') {
            valid.push(caster);
            return valid;
        }

        // Determine target team.
        let targetTeam;
        const isAllyPattern = ['single_ally', 'all_allies', 'adjacent_allies'].includes(pattern);
        if (isAllyPattern) {
            targetTeam = caster.team;
        } else {
            targetTeam = caster.team === 0 ? 1 : 0;
        }

        // Get all living units on the target team.
        const candidates = grid.getAllUnits(targetTeam);

        // For "all" patterns, return all candidates.
        if (pattern === 'all' || pattern === 'all_allies') {
            return candidates;
        }

        // For range-limited patterns, filter by alive status.
        for (const unit of candidates) {
            if (unit.isAlive) {
                valid.push(unit);
            }
        }

        return valid;
    }

    // -- Private Helpers ----------------------------------------------------------

    /**
     * Roll accuracy for an ability hit. Returns true if the attack lands.
     * @param {object} ability
     * @returns {boolean}
     */
    _checkAccuracy(ability) {
        if (ability.accuracy >= 1.0) return true;
        return Math.random() <= ability.accuracy;
    }

    /**
     * Determine the knockback direction from caster to target.
     * @param {import('./BattleUnit.js').BattleUnit} caster
     * @param {import('./BattleUnit.js').BattleUnit} target
     * @returns {{x: number, y: number}}
     */
    _getKnockbackDirection(caster, target) {
        const dx = target.gridPosition.x - caster.gridPosition.x;
        const dy = target.gridPosition.y - caster.gridPosition.y;
        if (dx === 0 && dy === 0) {
            return { x: 0, y: 1 }; // Default: push downward.
        }
        return { x: Math.sign(dx), y: Math.sign(dy) };
    }

    /**
     * Check if an ability has knockback properties.
     * Abilities with "pierce" or "line" targeting inherently have knockback.
     * @param {object} ability
     * @returns {boolean}
     */
    _hasKnockback(ability) {
        return ['pierce', 'line'].includes(ability.targetingType);
    }

    /**
     * Check if a non-damaging ability is a healing ability.
     * Healing abilities target allies and have base_power > 0 used for heal formula.
     * @param {object} ability
     * @returns {boolean}
     */
    _isHealingAbility(ability) {
        return ['self', 'single_ally', 'all_allies', 'adjacent_allies'].includes(ability.targetingType);
    }
}

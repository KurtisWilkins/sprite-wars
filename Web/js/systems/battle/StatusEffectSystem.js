/**
 * StatusEffectSystem -- [P3-007] Manages application, processing, and removal
 * of status effects on BattleUnits during combat.
 *
 * Ported from Game/Scripts/Battle/StatusEffectSystem.gd
 */

export class StatusEffectSystem {
    // -- Constants ----------------------------------------------------------------

    /**
     * Conflicting effect pairs: if one is active, the other replaces or is rejected.
     * Maps sub_type -> Array of conflicting sub_types.
     */
    static CONFLICT_MAP = {
        burn: ['freeze'],
        freeze: ['burn'],
        sleep: ['paralysis'],
        paralysis: ['sleep'],
    };

    // -- Effect Application -------------------------------------------------------

    /**
     * Apply a status effect to a unit. Returns true if the effect was successfully applied.
     *
     * Handles:
     * - Type immunity checks
     * - Stacking rules (none, refresh, stack, replace)
     * - Conflicting effect resolution
     *
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {object} effect - StatusEffectData object.
     * @returns {boolean}
     */
    applyEffect(unit, effect) {
        if (unit == null || effect == null) return false;
        if (!unit.isAlive) return false;

        // Check type immunity.
        if (unit.isStatusImmune(effect.effectName.toLowerCase())) {
            return false;
        }

        // Check for conflicting effects.
        if (this._hasConflict(unit, effect)) {
            // Remove the conflicting effect and apply the new one.
            this._resolveConflict(unit, effect);
        }

        // Check if the unit already has this effect.
        const existingIdx = this._findEffectIndex(unit, effect.effectId);

        if (existingIdx >= 0) {
            // Effect already exists -- apply stacking rule.
            switch (effect.stackingRule) {
                case 'none':
                    return false; // Reject duplicate.

                case 'refresh':
                    // Reset duration without changing stacks.
                    unit.activeStatusEffects[existingIdx].remainingTurns = effect.durationTurns;
                    return true;

                case 'stack': {
                    // Increase stack count up to max.
                    const entry = unit.activeStatusEffects[existingIdx];
                    if (entry.stacks < effect.maxStacks) {
                        entry.stacks += 1;
                        entry.remainingTurns = effect.durationTurns;
                        // Re-apply the stat modifier for the additional stack.
                        this._applyStatModifiers(unit, effect, 1);
                        return true;
                    } else {
                        // At max stacks -- refresh duration instead.
                        entry.remainingTurns = effect.durationTurns;
                        return false;
                    }
                }

                case 'replace':
                    // Remove old, apply fresh.
                    this._removeEffectAtIndex(unit, existingIdx, effect);
                    this._addNewEffect(unit, effect);
                    return true;

                default:
                    return false;
            }
        } else {
            // New effect -- apply it.
            this._addNewEffect(unit, effect);
            return true;
        }
    }

    // -- Turn Processing ----------------------------------------------------------

    /**
     * Process all active effects at the start/end of a unit's turn.
     * Returns an array of result dictionaries for each effect processed.
     *
     * result_type can be: "dot_damage", "dot_heal", "stat_mod", "action_prevented",
     *                     "forced_movement", "break_free"
     *
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @returns {Array<{effectName: string, resultType: string, value: number}>}
     */
    processTurnEffects(unit) {
        const results = [];

        if (unit == null || !unit.isAlive) return results;

        // Iterate through a copy since effects might be removed during processing.
        const effectsCopy = [...unit.activeStatusEffects];

        for (const entry of effectsCopy) {
            const effectData = entry.effectData;
            if (effectData == null) continue;

            const stacks = entry.stacks || 1;

            // -- Damage over Time --
            if (effectData.hasDot()) {
                const dotPerTick = effectData.getDotDamage(unit.maxHp);
                const totalDot = dotPerTick * stacks;

                if (totalDot > 0) {
                    // Damage.
                    const dmgResult = unit.takeDamage(totalDot);
                    results.push({
                        effectName: effectData.effectName,
                        resultType: 'dot_damage',
                        value: dmgResult.actualDamage,
                    });
                } else if (totalDot < 0) {
                    // Healing (negative DoT = regen).
                    const healAmount = unit.heal(Math.abs(totalDot));
                    results.push({
                        effectName: effectData.effectName,
                        resultType: 'dot_heal',
                        value: healAmount,
                    });
                }
            }

            // -- Action Prevention --
            if (effectData.preventsAction) {
                // Check for break-free chance (e.g. sleep).
                if (effectData.breakFreeChance > 0.0 && Math.random() < effectData.breakFreeChance) {
                    results.push({
                        effectName: effectData.effectName,
                        resultType: 'break_free',
                        value: 0,
                    });
                    // Remove the effect since the unit broke free.
                    this.removeEffect(unit, effectData.effectId);
                    continue;
                } else {
                    results.push({
                        effectName: effectData.effectName,
                        resultType: 'action_prevented',
                        value: 0,
                    });
                }
            }

            // -- Forced Movement --
            if (effectData.forcesMovement) {
                results.push({
                    effectName: effectData.effectName,
                    resultType: 'forced_movement',
                    value: 0,
                });
            }
        }

        return results;
    }

    // -- Duration Ticking ---------------------------------------------------------

    /**
     * Tick down all effect durations by 1 turn. Returns an array of expired effectIds.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @returns {number[]}
     */
    tickDurations(unit) {
        const expired = [];

        if (unit == null) return expired;

        // Iterate backwards to safely remove expired entries.
        let i = unit.activeStatusEffects.length - 1;
        while (i >= 0) {
            const entry = unit.activeStatusEffects[i];
            const effectData = entry.effectData;

            if (effectData == null) {
                unit.activeStatusEffects.splice(i, 1);
                i -= 1;
                continue;
            }

            // Permanent effects (-1 duration) never expire naturally.
            if (entry.remainingTurns < 0) {
                i -= 1;
                continue;
            }

            entry.remainingTurns -= 1;

            if (entry.remainingTurns <= 0) {
                expired.push(effectData.effectId);
                this._removeEffectAtIndex(unit, i, effectData);
            }

            i -= 1;
        }

        return expired;
    }

    // -- Effect Removal -----------------------------------------------------------

    /**
     * Remove a specific effect by ID from a unit.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {number} effectId
     */
    removeEffect(unit, effectId) {
        const idx = this._findEffectIndex(unit, effectId);
        if (idx >= 0) {
            const effectData = unit.activeStatusEffects[idx].effectData;
            this._removeEffectAtIndex(unit, idx, effectData);
        }
    }

    /**
     * Remove all effects of a given type ("buff", "debuff", "condition").
     * Used for cleanse abilities.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {string} effectType
     */
    removeAllEffects(unit, effectType) {
        if (unit == null) return;

        let i = unit.activeStatusEffects.length - 1;
        while (i >= 0) {
            const entry = unit.activeStatusEffects[i];
            const effectData = entry.effectData;
            if (effectData != null && effectData.effectType === effectType) {
                if (effectData.canBeCleansed) {
                    this._removeEffectAtIndex(unit, i, effectData);
                }
            }
            i -= 1;
        }
    }

    /**
     * Remove all effects from a unit (full cleanse).
     * @param {import('./BattleUnit.js').BattleUnit} unit
     */
    removeAll(unit) {
        if (unit == null) return;
        while (unit.activeStatusEffects.length > 0) {
            const entry = unit.activeStatusEffects[0];
            const effectData = entry.effectData;
            this._removeEffectAtIndex(unit, 0, effectData);
        }
    }

    // -- Conflict Checking --------------------------------------------------------

    /**
     * Check if applying a new effect would conflict with an existing one.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {object} newEffect - StatusEffectData
     * @returns {boolean}
     */
    checkConflictingEffects(unit, newEffect) {
        return this._hasConflict(unit, newEffect);
    }

    // -- Private Helpers ----------------------------------------------------------

    /**
     * Find the index of an effect in the unit's active effects array.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {number} effectId
     * @returns {number}
     */
    _findEffectIndex(unit, effectId) {
        for (let i = 0; i < unit.activeStatusEffects.length; i++) {
            const entry = unit.activeStatusEffects[i];
            const ed = entry.effectData;
            if (ed != null && ed.effectId === effectId) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Add a brand new effect to a unit.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {object} effect - StatusEffectData
     */
    _addNewEffect(unit, effect) {
        const entry = {
            effectData: effect,
            remainingTurns: effect.durationTurns,
            stacks: 1,
        };
        unit.activeStatusEffects.push(entry);

        // Apply stat modifiers.
        this._applyStatModifiers(unit, effect, 1);
    }

    /**
     * Remove an effect at a specific index, cleaning up stat modifiers.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {number} index
     * @param {object} effectData - StatusEffectData
     */
    _removeEffectAtIndex(unit, index, effectData) {
        if (index < 0 || index >= unit.activeStatusEffects.length) return;

        const stacks = unit.activeStatusEffects[index].stacks || 1;
        unit.activeStatusEffects.splice(index, 1);

        // Reverse stat modifiers.
        if (effectData != null) {
            this._removeStatModifiers(unit, effectData, stacks);
        }
    }

    /**
     * Apply stat modifiers from an effect (considering stack count).
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {object} effect - StatusEffectData
     * @param {number} stacks
     */
    _applyStatModifiers(unit, effect, stacks) {
        if (!effect.hasStatModifiers()) return;
        for (const statKey in effect.statModifiers) {
            const offset = effect.statModifiers[statKey];
            for (let s = 0; s < stacks; s++) {
                unit.applyStatModifier(statKey, 1.0 + offset);
            }
        }
    }

    /**
     * Remove stat modifiers from an effect (considering stack count).
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {object} effectData - StatusEffectData
     * @param {number} stacks
     */
    _removeStatModifiers(unit, effectData, stacks) {
        if (!effectData.hasStatModifiers()) return;
        for (const statKey in effectData.statModifiers) {
            const offset = effectData.statModifiers[statKey];
            for (let s = 0; s < stacks; s++) {
                unit.removeStatModifier(statKey, 1.0 + offset);
            }
        }
    }

    /**
     * Check if a new effect conflicts with any active effect on the unit.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {object} newEffect - StatusEffectData
     * @returns {boolean}
     */
    _hasConflict(unit, newEffect) {
        const newNameLower = newEffect.effectName.toLowerCase();
        const conflicts = StatusEffectSystem.CONFLICT_MAP[newNameLower] || [];
        if (conflicts.length === 0) return false;

        for (const entry of unit.activeStatusEffects) {
            const existing = entry.effectData;
            if (existing == null) continue;
            if (conflicts.includes(existing.effectName.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Remove the conflicting effect and apply the new one.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {object} newEffect - StatusEffectData
     */
    _resolveConflict(unit, newEffect) {
        const newNameLower = newEffect.effectName.toLowerCase();
        const conflicts = StatusEffectSystem.CONFLICT_MAP[newNameLower] || [];

        let i = unit.activeStatusEffects.length - 1;
        while (i >= 0) {
            const entry = unit.activeStatusEffects[i];
            const existing = entry.effectData;
            if (existing != null && conflicts.includes(existing.effectName.toLowerCase())) {
                this._removeEffectAtIndex(unit, i, existing);
            }
            i -= 1;
        }
    }
}

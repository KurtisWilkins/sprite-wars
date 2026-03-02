/**
 * RTSCombatAI.js — Auto-combat behavior for Hero's Hour-style RTS battles.
 *
 * Each unit follows this behavior loop every frame:
 *   1. If no target or target is dead → find nearest enemy
 *   2. If target is out of range → move toward target
 *   3. If target is in range and attack ready → attack
 *   4. If ability is ready → use best ability
 *   5. Apply separation from nearby allies (flocking)
 *
 * Supports different behaviors based on class type:
 *   - Melee (Berserker, Knight, Assassin, Spearman): Rush to nearest enemy
 *   - Ranged (Archer, Ranger): Keep distance, shoot from range
 *   - Support (Cleric, Summoner): Stay behind front line, heal allies
 *   - Caster (Wizard): Position at mid-range, use abilities
 */

import { UnitState, AGGRO_RANGE, MELEE_RANGE, RANGED_RANGE } from './RTSUnit.js';

// ── Behavior Types ──────────────────────────────────────────────────────────
const BEHAVIOR_MELEE = 'melee';
const BEHAVIOR_RANGED = 'ranged';
const BEHAVIOR_SUPPORT = 'support';
const BEHAVIOR_CASTER = 'caster';

const CLASS_BEHAVIOR = {
    Berserker: BEHAVIOR_MELEE,
    Knight:    BEHAVIOR_MELEE,
    Guardian:  BEHAVIOR_MELEE,
    Assassin:  BEHAVIOR_MELEE,
    Spearman:  BEHAVIOR_MELEE,
    Archer:    BEHAVIOR_RANGED,
    Ranger:    BEHAVIOR_RANGED,
    Cleric:    BEHAVIOR_SUPPORT,
    Summoner:  BEHAVIOR_SUPPORT,
    Wizard:    BEHAVIOR_CASTER,
};

// ── Constants ───────────────────────────────────────────────────────────────
const TARGET_RECHECK_INTERVAL = 0.8;   // Seconds between target reassessment
const PATH_RECALC_INTERVAL = 0.5;      // Seconds between pathfinding updates
const RETREAT_DISTANCE = 80;            // How far ranged units back up
const SUPPORT_FOLLOW_DIST = 60;        // How far behind the front line supports stay
const ABILITY_CHECK_INTERVAL = 1.5;    // Seconds between ability use attempts

export class RTSCombatAI {

    /**
     * Process AI behavior for a single unit this frame.
     * @param {import('./RTSUnit.js').RTSUnit} unit
     * @param {import('./RTSBattleField.js').RTSBattleField} field
     * @param {object} abilityDb - abilityId -> AbilityData
     * @param {number} dt - Delta time
     * @returns {{ action: string, target?: object, ability?: object }|null}
     */
    static processUnit(unit, field, abilityDb, dt) {
        if (!unit.isAlive || unit.state === UnitState.DEAD) return null;
        if (unit.state === UnitState.ATTACKING || unit.state === UnitState.CASTING) return null;
        if (unit.state === UnitState.STUNNED) return null;

        const behavior = CLASS_BEHAVIOR[unit.classType] || BEHAVIOR_MELEE;

        // 1. Target acquisition
        this._acquireTarget(unit, field, behavior);

        if (!unit.target || !unit.target.isAlive) {
            // No target in aggro range — march toward the enemy side
            // This ensures units always advance even if spawn distance > AGGRO_RANGE
            const marchX = unit.team === 0 ? unit.worldPos.x + 200 : unit.worldPos.x - 200;
            const marchY = unit.worldPos.y;
            unit.moveToward(marchX, marchY, dt);
            return null;
        }

        // 2. Behavior-specific positioning
        let action = null;

        switch (behavior) {
            case BEHAVIOR_MELEE:
                action = this._processMelee(unit, field, abilityDb, dt);
                break;
            case BEHAVIOR_RANGED:
                action = this._processRanged(unit, field, abilityDb, dt);
                break;
            case BEHAVIOR_SUPPORT:
                action = this._processSupport(unit, field, abilityDb, dt);
                break;
            case BEHAVIOR_CASTER:
                action = this._processCaster(unit, field, abilityDb, dt);
                break;
        }

        // 3. Apply separation from nearby allies
        const nearbyAllies = field.getUnitsInRadius(
            unit.worldPos.x, unit.worldPos.y, 30
        ).filter(u => u.team === unit.team && u !== unit);
        unit.applySeparation(nearbyAllies, dt);

        return action;
    }

    // ── Target Acquisition ──────────────────────────────────────────────────

    static _acquireTarget(unit, field, behavior) {
        // Keep current target if still valid and alive
        if (unit.target && unit.target.isAlive) {
            // Recheck periodically for better targets
            if (unit.pathAge < TARGET_RECHECK_INTERVAL) return;
        }

        // Reset pathAge so we don't recheck again until interval elapses
        unit.pathAge = 0;

        // Find new target based on behavior
        switch (behavior) {
            case BEHAVIOR_SUPPORT: {
                // Support units target the weakest ally for healing (excluding self)
                const weakAlly = field.findWeakestAlly(
                    unit.worldPos.x, unit.worldPos.y, unit.team, AGGRO_RANGE
                );
                if (weakAlly && weakAlly !== unit) {
                    unit.target = weakAlly;
                    return;
                }
                // If no allies need healing, target nearest enemy
                unit.target = field.findNearestEnemy(
                    unit.worldPos.x, unit.worldPos.y, unit.team, AGGRO_RANGE
                );
                break;
            }

            case BEHAVIOR_RANGED:
            case BEHAVIOR_CASTER: {
                // Prefer weakest enemy in range, fall back to nearest anywhere
                const weakEnemy = field.findWeakestEnemy(
                    unit.worldPos.x, unit.worldPos.y, unit.team, AGGRO_RANGE
                );
                unit.target = weakEnemy || field.findNearestEnemy(
                    unit.worldPos.x, unit.worldPos.y, unit.team, AGGRO_RANGE
                );
                break;
            }

            default: {
                // Melee: target nearest enemy
                unit.target = field.findNearestEnemy(
                    unit.worldPos.x, unit.worldPos.y, unit.team, AGGRO_RANGE
                );
                break;
            }
        }
    }

    // ── Melee Behavior ──────────────────────────────────────────────────────

    static _processMelee(unit, field, abilityDb, dt) {
        const target = unit.target;
        const dist = unit.distanceTo(target);

        // In range → attack
        if (dist <= MELEE_RANGE + target.radius) {
            if (unit.canAttack) {
                unit.startAttack();
                // Face the target
                this._faceTarget(unit, target);
                return { action: 'attack', target };
            }

            // Check for ability use
            if (unit.canCastAbility) {
                const ability = unit.getBestAbility(abilityDb);
                if (ability && ability.isDamaging()) {
                    unit.startCast(ability, target);
                    this._faceTarget(unit, target);
                    return { action: 'ability', target, ability };
                }
            }

            // Wait for cooldown
            unit.state = UnitState.IDLE;
            unit.velocity.x = 0;
            unit.velocity.y = 0;
            return null;
        }

        // Out of range → move toward target
        unit.moveToward(target.worldPos.x, target.worldPos.y, dt);
        return null;
    }

    // ── Ranged Behavior ─────────────────────────────────────────────────────

    static _processRanged(unit, field, abilityDb, dt) {
        const target = unit.target;
        const dist = unit.distanceTo(target);

        // Too close → retreat
        if (dist < MELEE_RANGE * 2) {
            const dx = unit.worldPos.x - target.worldPos.x;
            const dy = unit.worldPos.y - target.worldPos.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const retreatX = unit.worldPos.x + (dx / len) * RETREAT_DISTANCE;
            const retreatY = unit.worldPos.y + (dy / len) * RETREAT_DISTANCE;
            unit.moveToward(retreatX, retreatY, dt);
            return null;
        }

        // In range → attack
        if (dist <= RANGED_RANGE + target.radius) {
            this._faceTarget(unit, target);

            // Prefer damaging abilities when available (don't use healing on enemy target)
            if (unit.canCastAbility) {
                const ability = unit.getBestAbility(abilityDb);
                if (ability && this._isOffensiveAbility(ability)) {
                    unit.startCast(ability, target);
                    return { action: 'ability', target, ability };
                }
            }

            if (unit.canAttack) {
                unit.startAttack();
                return { action: 'attack', target };
            }

            // Wait
            unit.state = UnitState.IDLE;
            unit.velocity.x = 0;
            unit.velocity.y = 0;
            return null;
        }

        // Out of range → move toward target
        unit.moveToward(target.worldPos.x, target.worldPos.y, dt);
        return null;
    }

    // ── Support Behavior ────────────────────────────────────────────────────

    static _processSupport(unit, field, abilityDb, dt) {
        // Check if we should heal an ally (exclude self)
        let weakAlly = field.findWeakestAlly(
            unit.worldPos.x, unit.worldPos.y, unit.team, 150
        );
        if (weakAlly === unit) weakAlly = null;

        if (weakAlly && unit.canCastAbility) {
            const healAbility = this._findHealAbility(unit, abilityDb);
            if (healAbility) {
                this._faceTarget(unit, weakAlly);
                unit.startCast(healAbility, weakAlly);
                return { action: 'ability', target: weakAlly, ability: healAbility };
            }
        }

        // Position behind frontline allies
        const allies = field.getLivingUnits(unit.team);
        if (allies.length > 1) {
            // Find the center of allied units
            let cx = 0, cy = 0, count = 0;
            for (const ally of allies) {
                if (ally === unit) continue;
                cx += ally.worldPos.x;
                cy += ally.worldPos.y;
                count++;
            }
            if (count > 0) {
                cx /= count;
                cy /= count;

                // Stay behind the front line
                const behindX = unit.team === 0
                    ? cx - SUPPORT_FOLLOW_DIST
                    : cx + SUPPORT_FOLLOW_DIST;

                const distToPos = Math.sqrt(
                    Math.pow(behindX - unit.worldPos.x, 2) +
                    Math.pow(cy - unit.worldPos.y, 2)
                );

                if (distToPos > 20) {
                    unit.moveToward(behindX, cy, dt);
                    return null;
                }
            }
        }

        // If no allies to heal, attack enemies
        const target = unit.target;
        if (target && target.isAlive && target.team !== unit.team) {
            const dist = unit.distanceTo(target);
            if (dist <= RANGED_RANGE + target.radius) {
                if (unit.canAttack) {
                    this._faceTarget(unit, target);
                    unit.startAttack();
                    return { action: 'attack', target };
                }
            } else {
                // Move closer but not too close
                const targetDist = RANGED_RANGE * 0.7;
                if (dist > targetDist) {
                    unit.moveToward(target.worldPos.x, target.worldPos.y, dt);
                }
            }
        }

        unit.state = UnitState.IDLE;
        unit.velocity.x = 0;
        unit.velocity.y = 0;
        return null;
    }

    // ── Caster Behavior ─────────────────────────────────────────────────────

    static _processCaster(unit, field, abilityDb, dt) {
        const target = unit.target;
        const dist = unit.distanceTo(target);

        // Prefer offensive abilities over auto-attacks (don't heal enemies)
        if (unit.canCastAbility) {
            const ability = unit.getBestAbility(abilityDb);
            if (ability && this._isOffensiveAbility(ability) && dist <= RANGED_RANGE + target.radius) {
                this._faceTarget(unit, target);
                unit.startCast(ability, target);
                return { action: 'ability', target, ability };
            }
        }

        // Maintain mid-range position
        const idealDist = RANGED_RANGE * 0.6;
        if (dist < MELEE_RANGE * 1.5) {
            // Too close → retreat
            const dx = unit.worldPos.x - target.worldPos.x;
            const dy = unit.worldPos.y - target.worldPos.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            unit.moveToward(
                unit.worldPos.x + (dx / len) * 60,
                unit.worldPos.y + (dy / len) * 60,
                dt
            );
            return null;
        }

        if (dist > RANGED_RANGE + target.radius) {
            // Out of range → move closer
            unit.moveToward(target.worldPos.x, target.worldPos.y, dt);
            return null;
        }

        // In range but ability on cooldown → auto-attack
        if (unit.canAttack) {
            this._faceTarget(unit, target);
            unit.startAttack();
            return { action: 'attack', target };
        }

        unit.state = UnitState.IDLE;
        unit.velocity.x = 0;
        unit.velocity.y = 0;
        return null;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    static _isOffensiveAbility(ability) {
        if (!ability) return false;
        if (ability.isDamaging()) return true;
        // Non-damaging but targets enemies (debuffs, status effects)
        const tt = ability.targetingType || '';
        return tt === 'single_enemy' || tt === 'row' || tt === 'aoe_circle' || tt === 'all_enemies';
    }

    static _faceTarget(unit, target) {
        const dx = target.worldPos.x - unit.worldPos.x;
        const dy = target.worldPos.y - unit.worldPos.y;
        if (Math.abs(dx) > Math.abs(dy)) {
            unit.facing = dx > 0 ? 2 : 1;
        } else {
            unit.facing = dy > 0 ? 0 : 3;
        }
    }

    static _findHealAbility(unit, abilityDb) {
        for (const abilityId of unit.equippedAbilities) {
            if ((unit.rtsCooldowns[abilityId] || 0) > 0) continue;
            if ((unit.abilityPp[abilityId] || 0) <= 0) continue;
            const ability = abilityDb[abilityId];
            if (!ability) continue;
            // Healing abilities: target allies/self, or have basePower > 0 but target single_ally/self
            const tt = ability.targetingType || '';
            if (tt === 'single_ally' || tt === 'self') {
                return ability;
            }
        }
        return null;
    }
}

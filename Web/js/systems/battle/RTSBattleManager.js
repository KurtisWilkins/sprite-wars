/**
 * RTSBattleManager.js — Real-time battle orchestrator for Hero's Hour-style combat.
 *
 * Replaces BattleManager's turn-based loop with a continuous update cycle:
 *   - All units act simultaneously based on individual cooldown timers
 *   - Movement happens every frame via RTSCombatAI
 *   - Attacks/abilities resolve instantly on cooldown completion
 *   - Status effects tick in real-time (1 "turn" = 3 seconds)
 *   - Battle ends when all units on one side are eliminated
 *
 * The player watches the battle unfold (auto-battler) with speed controls.
 */

import { eventBus, GameEvents } from '../../core/EventBus.js';
import { RTSBattleField } from './RTSBattleField.js';
import { RTSUnit, UnitState } from './RTSUnit.js';
import { RTSCombatAI } from './RTSCombatAI.js';
import { DamageCalculator } from './DamageCalculator.js';
import { StatusEffectSystem } from './StatusEffectSystem.js';

// ── Constants ───────────────────────────────────────────────────────────────
const STATUS_TICK_INTERVAL = 3.0;   // Seconds per "turn" for status effects
const FAINT_REMOVE_DELAY = 0.5;     // Seconds before dead units are removed
const MAX_BATTLE_TIME = 180;        // Auto-draw after 3 minutes
const MIN_DT = 1 / 120;            // Minimum timestep (prevent micro-dt)

export class RTSBattleManager {

    // ── Subsystems ──────────────────────────────────────────────────────────

    /** @type {RTSBattleField} */
    field = null;

    /** @type {DamageCalculator} */
    damageCalc = null;

    /** @type {StatusEffectSystem} */
    statusSystem = null;

    // ── Battle State ────────────────────────────────────────────────────────

    /** Whether battle is actively running. */
    isActive = false;

    /** Battle is paused (player can pause/unpause). */
    isPaused = false;

    /** Speed multiplier (1x, 2x, 3x). */
    speedMultiplier = 1;

    /** Total elapsed battle time (seconds). */
    elapsedTime = 0;

    /** Battle result: null, "player_win", "enemy_win", or "draw". */
    result = null;

    // ── Data Registries ─────────────────────────────────────────────────────

    /** Ability database: abilityId -> AbilityData. */
    _abilityDb = {};

    /** Element chart for type effectiveness. */
    _elementChart = {};

    /** Status effect database. */
    _statusDb = {};

    // ── Event Log ───────────────────────────────────────────────────────────

    /** Battle event log for UI display. @type {Array<{type: string, time: number, data: object}>} */
    eventLog = [];

    // ── Status Tick ─────────────────────────────────────────────────────────

    _statusTickTimer = 0;

    // ── Pending Removals ────────────────────────────────────────────────────

    /** @type {Array<{unit: RTSUnit, timer: number}>} */
    _pendingRemovals = [];

    // ── Stats Tracking ──────────────────────────────────────────────────────

    stats = {
        totalDamageDealt: { player: 0, enemy: 0 },
        unitsDefeated: { player: 0, enemy: 0 },
        abilitiesUsed: { player: 0, enemy: 0 },
    };

    // ── Initialization ──────────────────────────────────────────────────────

    constructor() {
        this.field = new RTSBattleField();
        this.damageCalc = new DamageCalculator();
        this.statusSystem = new StatusEffectSystem();
    }

    /**
     * Start a new RTS battle.
     * @param {Array} playerTeam - [{instance, raceData, stageData, abilities, position?}]
     * @param {Array} enemyTeam - Same format
     * @param {object} config - {elementChart, statusDb}
     */
    startBattle(playerTeam, enemyTeam, config = {}) {
        // Reset state
        this.field.reset();
        this.isActive = true;
        this.isPaused = false;
        this.speedMultiplier = 1;
        this.elapsedTime = 0;
        this.result = null;
        this.eventLog = [];
        this._statusTickTimer = 0;
        this._pendingRemovals = [];
        this.stats = {
            totalDamageDealt: { player: 0, enemy: 0 },
            unitsDefeated: { player: 0, enemy: 0 },
            abilitiesUsed: { player: 0, enemy: 0 },
        };

        // Load registries
        this._elementChart = config.elementChart || {};
        this._statusDb = config.statusDb || {};
        this._abilityDb = {};

        // Create and place player units
        const playerPositions = this.field.generateSpawnPositions(0, playerTeam.length);
        for (let i = 0; i < playerTeam.length; i++) {
            const data = playerTeam[i];
            const unit = this._createUnit(data, 0);
            if (!unit) continue;

            const pos = data.position
                ? this.field.gridToWorld(data.position.x, data.position.y, 0)
                : playerPositions[i] || { x: 80, y: 200 };
            this.field.addUnit(unit, pos.x, pos.y);
            this._registerAbilities(data.abilities || []);
        }

        // Create and place enemy units
        const enemyPositions = this.field.generateSpawnPositions(1, enemyTeam.length);
        for (let i = 0; i < enemyTeam.length; i++) {
            const data = enemyTeam[i];
            const unit = this._createUnit(data, 1);
            if (!unit) continue;

            const pos = data.position
                ? this.field.gridToWorld(data.position.x, data.position.y, 1)
                : enemyPositions[i] || { x: 700, y: 200 };
            this.field.addUnit(unit, pos.x, pos.y);
            this._registerAbilities(data.abilities || []);
        }

        // Log and emit battle start
        this._logEvent('battle_start', {
            playerCount: this.field.playerUnits.length,
            enemyCount: this.field.enemyUnits.length,
        });

        eventBus.emit(GameEvents.BATTLE_STARTED, {
            playerCount: this.field.playerUnits.length,
            enemyCount: this.field.enemyUnits.length,
            mode: 'rts',
        });
    }

    // ── Main Update Loop ────────────────────────────────────────────────────

    /**
     * Update the battle simulation. Called every frame.
     * @param {number} rawDt - Frame delta time in seconds
     */
    update(rawDt) {
        if (!this.isActive || this.isPaused) return;

        const dt = Math.max(MIN_DT, rawDt) * this.speedMultiplier;
        this.elapsedTime += dt;

        // Check time limit
        if (this.elapsedTime >= MAX_BATTLE_TIME) {
            this.endBattle('draw');
            return;
        }

        // Rebuild spatial hash for queries
        this.field.rebuildSpatialHash();

        // Process each living unit
        const allUnits = this.field.getAllLivingUnits();
        for (const unit of allUnits) {
            // Update unit timers
            unit.update(dt);

            // AI decision
            const action = RTSCombatAI.processUnit(unit, this.field, this._abilityDb, dt);

            // Process action results
            if (action) {
                this._processAction(unit, action, dt);
            }
        }

        // Resolve unit collisions
        this.field.resolveCollisions();

        // Clamp all units to bounds
        for (const unit of allUnits) {
            this.field.clampToBounds(unit);
        }

        // Tick status effects (every STATUS_TICK_INTERVAL seconds)
        this._statusTickTimer += dt;
        if (this._statusTickTimer >= STATUS_TICK_INTERVAL) {
            this._statusTickTimer -= STATUS_TICK_INTERVAL;
            this._processStatusTicks();
        }

        // Process pending unit removals
        this._processPendingRemovals(dt);

        // Check win/loss
        this._checkBattleEnd();
    }

    // ── Action Processing ───────────────────────────────────────────────────

    _processAction(unit, action, dt) {
        switch (action.action) {
            case 'attack':
                this._processAutoAttack(unit, action.target);
                break;
            case 'ability':
                this._processAbility(unit, action.ability, action.target);
                break;
        }
    }

    /**
     * Process an auto-attack from attacker to target.
     */
    _processAutoAttack(attacker, target) {
        if (!target || !target.isAlive) return;

        // Find the unit's best basic attack ability, or use a default
        let attackAbility = null;
        for (const abilityId of attacker.equippedAbilities) {
            const ab = this._abilityDb[abilityId];
            if (ab && ab.isDamaging() && ab.basePower > 0 && ab.basePower <= 50) {
                attackAbility = ab;
                break;
            }
        }

        // Fallback: create a simple auto-attack based on stats
        if (!attackAbility) {
            attackAbility = {
                abilityId: -1,
                abilityName: 'Auto-Attack',
                elementType: attacker.elementTypes[0] || 'Fire',
                basePower: 30,
                accuracy: 0.95,
                isPhysical: true,
                critRateBonus: 0,
                isDamaging() { return true; },
                getOffenseStatKey() { return 'atk'; },
                getDefenseStatKey() { return 'def'; },
                hasStatusEffects() { return false; },
                statusEffectIds: [],
                statusApplyChance: 0,
            };
        }

        // Accuracy check (before damage calculation to avoid wasted computation)
        if (Math.random() > (attackAbility.accuracy || 0.95)) {
            this._logEvent('miss', {
                attacker: attacker.getDisplayName(),
                target: target.getDisplayName(),
            });
            return;
        }

        // Calculate damage
        const result = this.damageCalc.calculateDamage(
            attacker, target, attackAbility, this._elementChart
        );

        // Apply damage
        const damageResult = target.takeDamage(result.finalDamage);
        target.onHit();

        // Track stats
        const teamKey = attacker.team === 0 ? 'player' : 'enemy';
        this.stats.totalDamageDealt[teamKey] += result.finalDamage;

        // Log
        this._logEvent('damage', {
            attacker: attacker.getDisplayName(),
            target: target.getDisplayName(),
            damage: result.finalDamage,
            isCrit: result.isCritical,
            effectiveness: result.effectiveness,
        });

        // Emit damage event
        eventBus.emit(GameEvents.UNIT_DAMAGED,
            attacker.spriteInstance,
            target.spriteInstance,
            result.finalDamage,
            result.isCritical,
            result.effectiveness
        );

        // Check for faint
        if (damageResult.isFainted) {
            this._handleUnitFaint(target, attacker);
        }
    }

    /**
     * Process an ability use.
     */
    _processAbility(caster, ability, target) {
        if (!target || !target.isAlive) return;
        if (!ability) return;

        const teamKey = caster.team === 0 ? 'player' : 'enemy';
        this.stats.abilitiesUsed[teamKey]++;

        // Consume PP
        if (ability.abilityId > 0) {
            caster.consumePp(ability);
        }

        // Emit ability used
        eventBus.emit(GameEvents.ABILITY_USED,
            caster.spriteInstance, ability,
            target.spriteInstance ? [target.spriteInstance] : []
        );

        // Check targeting type to determine behavior
        const targetingType = ability.targetingType || '';
        const isHealingAbility = targetingType === 'single_ally' || targetingType === 'self';
        const isStatusOnly = !ability.isDamaging() && !isHealingAbility;

        if (isHealingAbility) {
            // Healing ability — use proper DamageCalculator formula
            // For self-targeting, heal the caster instead of the passed target
            const healTarget = targetingType === 'self' ? caster : target;
            const healAmount = this.damageCalc.calculateHeal(caster, ability);
            const healed = healTarget.heal(healAmount);

            if (healed > 0) {
                this._logEvent('heal', {
                    caster: caster.getDisplayName(),
                    target: healTarget.getDisplayName(),
                    amount: healed,
                });
                eventBus.emit(GameEvents.UNIT_HEALED, healTarget.spriteInstance, healed);
            }

            // Healing abilities can also apply status effects (e.g., Regen)
            if (ability.hasStatusEffects() && ability.statusApplyChance > 0) {
                if (Math.random() < ability.statusApplyChance) {
                    for (const effectId of ability.statusEffectIds) {
                        const effectData = this._statusDb[effectId];
                        if (effectData) {
                            this.statusSystem.applyEffect(healTarget, effectData);
                        }
                    }
                }
            }
            return;
        }

        if (isStatusOnly) {
            // Non-damaging offensive ability (debuffs, status effects targeting enemies)
            // Apply status effects directly, no damage and no healing
            if (ability.hasStatusEffects() && ability.statusApplyChance > 0) {
                if (Math.random() < ability.statusApplyChance) {
                    for (const effectId of ability.statusEffectIds) {
                        const effectData = this._statusDb[effectId];
                        if (effectData) {
                            this.statusSystem.applyEffect(target, effectData);
                            this._logEvent('status', {
                                target: target.getDisplayName(),
                                effect: effectData.effectName || effectData.effect_name || 'Unknown',
                            });
                        }
                    }
                }
            }
            this._logEvent('ability', {
                caster: caster.getDisplayName(),
                target: target.getDisplayName(),
                ability: ability.abilityName,
                damage: 0,
                isCrit: false,
                effectiveness: 'neutral',
            });
            return;
        }

        // Accuracy check (before damage calculation to avoid wasted computation)
        if (Math.random() > (ability.accuracy || 0.90)) {
            this._logEvent('miss', {
                attacker: caster.getDisplayName(),
                target: target.getDisplayName(),
                ability: ability.abilityName,
            });
            return;
        }

        // Damaging ability
        const result = this.damageCalc.calculateDamage(
            caster, target, ability, this._elementChart
        );

        // Apply damage
        const damageResult = target.takeDamage(result.finalDamage);
        target.onHit();

        this.stats.totalDamageDealt[teamKey] += result.finalDamage;

        // AoE: hit nearby enemies if ability has AoE targeting type
        const aoeTypes = new Set(['row', 'aoe_circle', 'all_enemies']);
        if (aoeTypes.has(ability.targetingType || '')) {
            const aoeRadius = ability.targetingType === 'aoe_circle' ? 40 : 30;
            const maxTargets = ability.targetingType === 'all_enemies' ? 6 : 2;
            const nearby = this.field.getUnitsInRadius(
                target.worldPos.x, target.worldPos.y, aoeRadius
            ).filter(u => u.team !== caster.team && u !== target && u.isAlive);

            for (const aoeTarget of nearby.slice(0, maxTargets)) {
                const aoeResult = this.damageCalc.calculateDamage(
                    caster, aoeTarget, ability, this._elementChart
                );
                const aoeDmg = Math.floor(aoeResult.finalDamage * 0.5);
                const aoeDamageResult = aoeTarget.takeDamage(aoeDmg);
                aoeTarget.onHit();
                this.stats.totalDamageDealt[teamKey] += aoeDmg;

                // Emit damage event for AoE targets (floating text + visual feedback)
                eventBus.emit(GameEvents.UNIT_DAMAGED,
                    caster.spriteInstance,
                    aoeTarget.spriteInstance,
                    aoeDmg,
                    aoeResult.isCritical,
                    aoeResult.effectiveness
                );

                if (aoeDamageResult.isFainted) {
                    this._handleUnitFaint(aoeTarget, caster);
                }
            }
        }

        // Log the ability
        this._logEvent('ability', {
            caster: caster.getDisplayName(),
            target: target.getDisplayName(),
            ability: ability.abilityName,
            damage: result.finalDamage,
            isCrit: result.isCritical,
            effectiveness: result.effectivenessLabel,
        });

        // Apply status effects
        if (ability.hasStatusEffects() && ability.statusApplyChance > 0) {
            if (Math.random() < ability.statusApplyChance) {
                for (const effectId of ability.statusEffectIds) {
                    const effectData = this._statusDb[effectId];
                    if (effectData) {
                        this.statusSystem.applyEffect(target, effectData);
                        this._logEvent('status', {
                            target: target.getDisplayName(),
                            effect: effectData.effectName || 'Unknown',
                        });
                    }
                }
            }
        }

        // Emit damage
        eventBus.emit(GameEvents.UNIT_DAMAGED,
            caster.spriteInstance,
            target.spriteInstance,
            result.finalDamage,
            result.isCritical,
            result.effectiveness
        );

        // Check faint
        if (damageResult.isFainted) {
            this._handleUnitFaint(target, caster);
        }
    }

    // ── Status Effects ──────────────────────────────────────────────────────

    _processStatusTicks() {
        const allUnits = this.field.getAllLivingUnits();
        for (const unit of allUnits) {
            // Process DoT, regen, etc.
            const results = this.statusSystem.processTurnEffects(unit);
            for (const r of results) {
                if (r.resultType === 'dot_damage') {
                    this._logEvent('status_damage', {
                        target: unit.getDisplayName(),
                        effect: r.effectName,
                        damage: r.value,
                    });
                    if (!unit.isAlive) {
                        this._handleUnitFaint(unit, null);
                    }
                }
            }

            // Tick durations
            const expired = this.statusSystem.tickDurations(unit);
            for (const eid of expired) {
                const effectData = this._statusDb[eid];
                if (effectData) {
                    eventBus.emit(GameEvents.STATUS_REMOVED, unit.spriteInstance, effectData);
                }
            }
        }
    }

    // ── Unit Faint Handling ─────────────────────────────────────────────────

    _handleUnitFaint(unit, killer) {
        // Guard against double-kill in the same frame
        if (unit.state === UnitState.DEAD) return;

        unit.state = UnitState.DEAD;
        unit.velocity.x = 0;
        unit.velocity.y = 0;

        // Credit the killer's team (or the opposing team if killed by status effect)
        const teamKey = killer
            ? (killer.team === 0 ? 'player' : 'enemy')
            : (unit.team === 0 ? 'enemy' : 'player');
        this.stats.unitsDefeated[teamKey]++;

        this._logEvent('faint', {
            unit: unit.getDisplayName(),
            killer: killer ? killer.getDisplayName() : 'status effect',
        });

        eventBus.emit(GameEvents.UNIT_DEFEATED, unit.spriteInstance);

        // Schedule removal
        this._pendingRemovals.push({ unit, timer: FAINT_REMOVE_DELAY });
    }

    _processPendingRemovals(dt) {
        for (let i = this._pendingRemovals.length - 1; i >= 0; i--) {
            this._pendingRemovals[i].timer -= dt;
            if (this._pendingRemovals[i].timer <= 0) {
                // Remove unit from field arrays so it no longer participates in queries
                this.field.removeUnit(this._pendingRemovals[i].unit);
                this._pendingRemovals.splice(i, 1);
            }
        }
    }

    // ── Win/Loss Check ──────────────────────────────────────────────────────

    _checkBattleEnd() {
        const playerAlive = this.field.getLivingUnits(0);
        const enemyAlive = this.field.getLivingUnits(1);

        if (enemyAlive.length === 0 && playerAlive.length > 0) {
            this.endBattle('player_win');
        } else if (playerAlive.length === 0 && enemyAlive.length > 0) {
            this.endBattle('enemy_win');
        } else if (playerAlive.length === 0 && enemyAlive.length === 0) {
            this.endBattle('draw');
        }
    }

    /**
     * End the battle with a result.
     * @param {string} result - "player_win", "enemy_win", or "draw"
     */
    endBattle(result) {
        if (!this.isActive) return;

        this.isActive = false;
        this.result = result;

        this._logEvent('battle_end', {
            result,
            elapsed: Math.floor(this.elapsedTime),
            stats: { ...this.stats },
        });

        eventBus.emit(GameEvents.BATTLE_ENDED, {
            result,
            rounds: Math.floor(this.elapsedTime / STATUS_TICK_INTERVAL),
            mode: 'rts',
            stats: this.stats,
        });
    }

    // ── Speed Controls ──────────────────────────────────────────────────────

    togglePause() {
        this.isPaused = !this.isPaused;
        return this.isPaused;
    }

    setSpeed(multiplier) {
        this.speedMultiplier = Math.max(0.5, Math.min(3, multiplier));
    }

    cycleSpeed() {
        if (this.speedMultiplier >= 3) {
            this.speedMultiplier = 1;
        } else {
            this.speedMultiplier += 1;
        }
        return this.speedMultiplier;
    }

    // ── Unit Creation ───────────────────────────────────────────────────────

    _createUnit(data, teamId) {
        const instance = data.instance;
        const raceData = data.raceData;
        const stageData = data.stageData;
        const abilities = data.abilities || [];

        if (!instance || !raceData || !stageData) {
            console.warn('RTSBattleManager: Incomplete unit data, skipping.');
            return null;
        }

        if (typeof instance.calculateAllEffectiveStats !== 'function') {
            console.warn('RTSBattleManager: instance missing calculateAllEffectiveStats, skipping.');
            return null;
        }

        const stats = instance.calculateAllEffectiveStats(raceData, stageData);
        const elemTypes = raceData.element_types || [];
        const stage = stageData.stage_number || 1;

        const unit = new RTSUnit();
        unit.initRTS(instance, stats, teamId, abilities, [...elemTypes], raceData, stage);

        return unit;
    }

    _registerAbilities(abilities) {
        for (const ability of abilities) {
            if (ability && ability.abilityId !== undefined) {
                this._abilityDb[ability.abilityId] = ability;
            }
        }
    }

    // ── Event Logging ───────────────────────────────────────────────────────

    _logEvent(type, data = {}) {
        this.eventLog.push({
            type,
            time: this.elapsedTime,
            ...data,
        });

        // Keep log bounded
        if (this.eventLog.length > 200) {
            this.eventLog.splice(0, 50);
        }
    }

    /**
     * Get recent events for UI display.
     * @param {number} count
     * @returns {object[]}
     */
    getRecentEvents(count = 10) {
        return this.eventLog.slice(-count);
    }
}

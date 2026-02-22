/**
 * BattleManager -- Main battle orchestrator for Sprite Wars.
 * Coordinates all battle subsystems: grid, turn order, damage, abilities,
 * status effects, AI, and event logging.
 *
 * Usage:
 *   battleManager.startBattle(playerTeam, enemyTeam, config)
 *   battleManager.executePlayerAbility(abilityId, targetPos)
 *   battleManager.toggleAutoBattle()
 *
 * Ported from Game/Autoloads/BattleManager.gd
 */

import { eventBus, GameEvents } from '../../core/EventBus.js';
import { BattleGrid } from './BattleGrid.js';
import { BattleUnit } from './BattleUnit.js';
import { TurnOrderSystem } from './TurnOrderSystem.js';
import { DamageCalculator } from './DamageCalculator.js';
import { AbilityExecutor } from './AbilityExecutor.js';
import { StatusEffectSystem } from './StatusEffectSystem.js';
import { BattleAI } from './BattleAI.js';

// -- Event Log Constants (matching BattleEventLog from GDScript) ----------------
const EVENT_BATTLE_START = 'battle_start';
const EVENT_BATTLE_END = 'battle_end';
const EVENT_TURN_START = 'turn_start';
const EVENT_MISS = 'miss';
const EVENT_STATUS_DAMAGE = 'status_damage';
const EVENT_SUPER_EFFECTIVE = 'super_effective';
const EVENT_NOT_EFFECTIVE = 'not_very_effective';
const EVENT_IMMUNE = 'immune';
const EVENT_CRITICAL_HIT = 'critical_hit';
const EVENT_KNOCKBACK = 'knockback';

export class BattleManager {
    // -- Subsystem Instances ------------------------------------------------------

    /** @type {BattleGrid} */
    grid = null;
    /** @type {TurnOrderSystem} */
    turnOrder = null;
    /** @type {DamageCalculator} */
    damageCalc = null;
    /** @type {AbilityExecutor} */
    abilityExecutor = null;
    /** @type {StatusEffectSystem} */
    statusSystem = null;
    /** @type {object|null} */
    knockbackSystem = null;
    /** @type {object|null} */
    projectileSystem = null;
    /** @type {object|null} */
    multiTarget = null;
    /** @type {object|null} */
    defeatSystem = null;
    /** @type {object|null} */
    conditionChecker = null;
    /** @type {BattleAI} */
    enemyAi = null;
    /** @type {BattleAI} */
    playerAutoAi = null;
    /** @type {object|null} */
    speedController = null;
    /** @type {BattleEventLog} */
    eventLog = null;

    // -- Battle State -------------------------------------------------------------

    /** Whether a battle is currently in progress. */
    isBattleActive = false;

    /** Whether auto-battle mode is enabled for the player. */
    isAutoBattle = false;

    /** The unit whose turn it currently is (null between turns). @type {BattleUnit|null} */
    currentUnit = null;

    /** Whether we are currently waiting for player input. */
    awaitingPlayerInput = false;

    /** Current round number. */
    _roundNumber = 0;

    /** Current battle configuration. */
    _battleConfig = {};

    // -- Data Registries ----------------------------------------------------------

    /** Ability database: abilityId -> AbilityData. */
    _abilityDb = {};

    /** Element chart: elementId -> ElementData. */
    _elementChart = {};

    /** Status effect database: effectId -> StatusEffectData. */
    _statusDb = {};

    // -- Initialization -----------------------------------------------------------

    constructor() {
        this._initializeSubsystems();
    }

    _initializeSubsystems() {
        this.grid = new BattleGrid();
        this.turnOrder = new TurnOrderSystem();
        this.damageCalc = new DamageCalculator();
        this.abilityExecutor = new AbilityExecutor();
        this.statusSystem = new StatusEffectSystem();
        this.knockbackSystem = null; // External subsystem, injected if available
        this.projectileSystem = null; // External subsystem, injected if available
        this.multiTarget = null; // External subsystem, injected if available
        this.defeatSystem = null; // External subsystem, injected if available
        this.conditionChecker = null; // External subsystem, injected if available
        this.enemyAi = new BattleAI();
        this.playerAutoAi = new BattleAI();
        this.speedController = null;
        this.eventLog = new BattleEventLog();
    }

    // -- Battle Lifecycle ---------------------------------------------------------

    /**
     * Start a new battle.
     *
     * @param {Array<{instance: object, raceData: object, stageData: object, abilities: object[], position?: {x:number,y:number}}>} playerTeam
     * @param {Array<{instance: object, raceData: object, stageData: object, abilities: object[], position?: {x:number,y:number}}>} enemyTeam
     * @param {object} battleConfig - Optional config: {elementChart, statusDb, compositionBonuses}
     */
    startBattle(playerTeam, enemyTeam, battleConfig = {}) {
        if (this.isBattleActive) {
            console.warn('BattleManager: Battle already active. Call endBattle() first.');
            return;
        }

        // Reset state.
        this._initializeSubsystems();
        this._battleConfig = battleConfig;
        this._roundNumber = 0;
        this.isBattleActive = true;
        this.isAutoBattle = false;
        this.awaitingPlayerInput = false;
        this.currentUnit = null;

        // Load data registries.
        this._elementChart = battleConfig.elementChart || {};
        this._statusDb = battleConfig.statusDb || {};
        this._abilityDb = {};

        // -- Place player units ---------------------------------------------------
        const allUnits = [];
        const playerPositions = this._generateDefaultPositions(0, playerTeam.length);

        for (let i = 0; i < playerTeam.length; i++) {
            const data = playerTeam[i];
            const unit = this._createBattleUnit(data, 0);
            if (unit === null) continue;

            const pos = data.position || (i < playerPositions.length
                ? playerPositions[i]
                : { x: i % BattleGrid.GRID_WIDTH, y: 0 });
            this.grid.placeUnit(unit, pos);
            allUnits.push(unit);
            this._registerAbilities(data.abilities || []);
        }

        // -- Place enemy units ----------------------------------------------------
        const enemyPositions = this._generateDefaultPositions(1, enemyTeam.length);

        for (let i = 0; i < enemyTeam.length; i++) {
            const data = enemyTeam[i];
            const unit = this._createBattleUnit(data, 1);
            if (unit === null) continue;

            const pos = data.position || (i < enemyPositions.length
                ? enemyPositions[i]
                : { x: i % BattleGrid.GRID_WIDTH, y: BattleGrid.ENEMY_ROW_MIN });
            this.grid.placeUnit(unit, pos);
            allUnits.push(unit);
            this._registerAbilities(data.abilities || []);
        }

        // -- Apply composition bonuses --------------------------------------------
        const compBonuses = battleConfig.compositionBonuses || [];
        if (compBonuses.length > 0) {
            for (const unit of allUnits) {
                if (unit.team === 0) { // Only player team gets comp bonuses.
                    this.damageCalc.applyCompositionBonuses(unit, compBonuses);
                }
            }
        }

        // -- Initialize turn order ------------------------------------------------
        this.turnOrder.initialize(allUnits);

        // -- Log battle start -----------------------------------------------------
        this.eventLog.clear();
        this.eventLog.addEvent(EVENT_BATTLE_START, {
            playerCount: playerTeam.length,
            enemyCount: enemyTeam.length,
        });

        // -- Emit signal ----------------------------------------------------------
        eventBus.emit(GameEvents.BATTLE_STARTED, {
            playerCount: playerTeam.length,
            enemyCount: enemyTeam.length,
        });

        // -- Start the first round ------------------------------------------------
        this._startNewRound();
    }

    // -- Turn Processing ----------------------------------------------------------

    /** Process the next turn in the battle. Called by the battle scene or auto-battle loop. */
    processTurn() {
        if (!this.isBattleActive) return;

        // Get the next unit that can act.
        this.currentUnit = this.turnOrder.getNextUnit();

        if (this.currentUnit === null) {
            // All units have acted this round -- start a new round.
            this._startNewRound();
            this.currentUnit = this.turnOrder.getNextUnit();
            if (this.currentUnit === null) {
                // No units can act at all (shouldn't happen in normal play).
                this.endBattle('draw');
                return;
            }
        }

        // -- Pre-turn processing: reduce cooldowns, process status effects --------
        this._processPreTurn(this.currentUnit);

        // Check if the unit can still act after status processing.
        if (!this.currentUnit.isAlive) {
            this._handleStatusFaint(this.currentUnit);
            // Continue to the next unit.
            this.processTurn();
            return;
        }

        if (!this.currentUnit.canAct) {
            // Unit is action-prevented (stunned/frozen/sleeping).
            this.eventLog.addEvent(EVENT_TURN_START, {
                unitName: this.currentUnit.getDisplayName(),
                turnNumber: this._roundNumber,
                cannotAct: true,
            });
            eventBus.emit(GameEvents.TURN_ENDED, this.currentUnit.spriteInstance);
            this.processTurn();
            return;
        }

        // -- Emit turn start signal -----------------------------------------------
        this.eventLog.addEvent(EVENT_TURN_START, {
            unitName: this.currentUnit.getDisplayName(),
            turnNumber: this._roundNumber,
        });
        eventBus.emit(GameEvents.TURN_STARTED, this.currentUnit.spriteInstance);

        // -- Decide action based on team and auto-battle mode --------------------
        if (this.currentUnit.team === 1) {
            // Enemy unit: AI decides.
            this._executeAiTurn(this.currentUnit, this.enemyAi);
        } else if (this.isAutoBattle) {
            // Player unit in auto-battle: smart AI decides.
            this._executeAiTurn(this.currentUnit, this.playerAutoAi);
        } else {
            // Player unit in manual mode: wait for input.
            this.awaitingPlayerInput = true;
            // The UI will call executePlayerAbility() when the player acts.
        }
    }

    // -- Player Manual Input ------------------------------------------------------

    /**
     * Execute a manually selected ability on a target position.
     * Called by the battle scene UI when the player selects an ability and target.
     * @param {number} abilityId
     * @param {{x: number, y: number}} targetPos
     */
    executePlayerAbility(abilityId, targetPos) {
        if (!this.isBattleActive || !this.awaitingPlayerInput) return;
        if (this.currentUnit === null || this.currentUnit.team !== 0) return;

        this.awaitingPlayerInput = false;

        // Look up the ability.
        const ability = this._abilityDb[abilityId];
        if (ability == null) {
            console.warn(`BattleManager: Unknown ability_id ${abilityId}`);
            this.awaitingPlayerInput = true;
            return;
        }

        // Validate.
        const validation = this.abilityExecutor.validateAbilityUse(this.currentUnit, ability);
        if (!validation.valid) {
            console.warn(`BattleManager: Invalid ability use -- ${validation.reason}`);
            this.awaitingPlayerInput = true;
            return;
        }

        // Resolve targets.
        let targets;
        if (this.multiTarget != null) {
            targets = this.multiTarget.resolveMultiTarget(ability, this.currentUnit, targetPos, this.grid);
        } else {
            // Fallback: use the ability executor's target resolution.
            targets = this.abilityExecutor.getValidTargets(this.currentUnit, ability, this.grid);
            // If single target, filter to just the target at the position.
            const unitAtPos = this.grid.getUnitAt(targetPos);
            if (unitAtPos != null && targets.includes(unitAtPos)) {
                targets = [unitAtPos];
            }
        }

        // Execute.
        this._executeAbilityAndProcess(this.currentUnit, ability, targets);

        // End turn.
        this._endCurrentTurn();
    }

    // -- Auto-Battle Toggle -------------------------------------------------------

    /** Toggle auto-battle mode on/off. */
    toggleAutoBattle() {
        this.isAutoBattle = !this.isAutoBattle;

        // If we were waiting for player input and auto-battle was just enabled,
        // immediately process the current turn via AI.
        if (this.isAutoBattle && this.awaitingPlayerInput && this.currentUnit !== null) {
            this.awaitingPlayerInput = false;
            this._executeAiTurn(this.currentUnit, this.playerAutoAi);
        }
    }

    // -- Battle End ---------------------------------------------------------------

    /**
     * End the battle with a result.
     * @param {string} result - "player_win", "enemy_win", or "draw"
     */
    endBattle(result) {
        if (!this.isBattleActive) return;

        this.isBattleActive = false;
        this.awaitingPlayerInput = false;
        this.currentUnit = null;

        let winnerLabel;
        switch (result) {
            case 'player_win':
                winnerLabel = 'Player';
                break;
            case 'enemy_win':
                winnerLabel = 'Enemy';
                break;
            default:
                winnerLabel = 'Draw';
                break;
        }

        this.eventLog.addEvent(EVENT_BATTLE_END, {
            result: result,
            winner: winnerLabel,
            rounds: this._roundNumber,
        });

        // Emit signal for GameManager and UI.
        eventBus.emit(GameEvents.BATTLE_ENDED, {
            result: result,
            rounds: this._roundNumber,
            eventLog: this.eventLog.getFullLog(),
        });
    }

    // -- Private: Round Management ------------------------------------------------

    /** Start a new round: tick status durations, recalculate turn order. */
    _startNewRound() {
        this._roundNumber += 1;
        this.turnOrder.newRound();
    }

    /**
     * Process pre-turn effects for a unit: reduce cooldowns, process DoT/status.
     * @param {BattleUnit} unit
     */
    _processPreTurn(unit) {
        // Reduce ability cooldowns.
        unit.reduceCooldowns();

        // Check if any cooldowns just expired -- restore PP.
        for (const abilityId of unit.equippedAbilities) {
            const ability = this._abilityDb[abilityId];
            if (ability != null) {
                if (!(abilityId in unit.abilityCooldowns) && (unit.abilityPp[abilityId] || 0) <= 0) {
                    unit.restorePp(ability);
                }
            }
        }

        // Process active status effects (DoT, regen, etc.).
        const statusResults = this.statusSystem.processTurnEffects(unit);
        for (const result of statusResults) {
            switch (result.resultType) {
                case 'dot_damage':
                    this.eventLog.addEvent(EVENT_STATUS_DAMAGE, {
                        unitName: unit.getDisplayName(),
                        effectName: result.effectName || '',
                        damage: result.value || 0,
                    });
                    break;
                case 'dot_heal':
                    this.eventLog.logHeal(unit.getDisplayName(), result.value || 0);
                    break;
                case 'break_free':
                    this.eventLog.addEvent('break_free', {
                        unitName: unit.getDisplayName(),
                        effectName: result.effectName || '',
                    });
                    break;
            }
        }

        // Tick durations and log expired effects.
        const expiredIds = this.statusSystem.tickDurations(unit);
        for (const eid of expiredIds) {
            const effectData = this._statusDb[eid];
            if (effectData != null) {
                this.eventLog.logStatusExpired(unit.getDisplayName(), effectData.effectName);
                eventBus.emit(GameEvents.STATUS_REMOVED, unit.spriteInstance, effectData);
            }
        }
    }

    // -- Private: AI Turn ---------------------------------------------------------

    /**
     * Execute an AI-controlled turn for a unit.
     * @param {BattleUnit} unit
     * @param {BattleAI} ai
     */
    _executeAiTurn(unit, ai) {
        const action = ai.decideAction(
            unit, this.grid, this.damageCalc, this._abilityDb, this._elementChart
        );

        const ability = action.ability;
        const target = action.target;

        if (ability === null) {
            // AI couldn't find a valid action -- skip turn.
            this.eventLog.addEvent('skip', { unitName: unit.getDisplayName() });
            this._endCurrentTurn();
            return;
        }

        // Resolve multi-target from the chosen target's position.
        const targetPos = target != null ? target.gridPosition : unit.gridPosition;
        let targets;
        if (this.multiTarget != null) {
            targets = this.multiTarget.resolveMultiTarget(ability, unit, targetPos, this.grid);
        } else {
            // Fallback: single target or use ability executor.
            targets = target != null ? [target] : [unit];
        }

        // Execute the ability.
        this._executeAbilityAndProcess(unit, ability, targets);

        // End the turn.
        this._endCurrentTurn();
    }

    // -- Private: Ability Execution -----------------------------------------------

    /**
     * Execute an ability and process all consequences (damage, faint, win check).
     * @param {BattleUnit} caster
     * @param {object} ability
     * @param {BattleUnit[]} targets
     */
    _executeAbilityAndProcess(caster, ability, targets) {
        // Log the ability use.
        let targetName = '';
        if (targets.length > 0 && targets[0] != null) {
            targetName = targets[0].getDisplayName();
        }
        this.eventLog.logAbilityUsed(caster.getDisplayName(), ability.abilityName, targetName);

        // Emit ability used signal.
        const targetRefs = [];
        for (const t of targets) {
            if (t != null && t.spriteInstance != null) {
                targetRefs.push(t.spriteInstance);
            }
        }
        eventBus.emit(GameEvents.ABILITY_USED, caster.spriteInstance, ability, targetRefs);

        // Execute through the pipeline.
        const results = this.abilityExecutor.executeAbility(
            caster, ability, targets, this.grid, this.damageCalc,
            this._elementChart, this.statusSystem, this.knockbackSystem, this._statusDb
        );

        // Process results: log events, check for faints, emit signals.
        const faintedUnits = [];

        for (const result of results) {
            const target = result.target;
            if (target == null) continue;

            const tName = target.getDisplayName();

            if (!result.hit) {
                this.eventLog.addEvent(EVENT_MISS, {
                    unitName: caster.getDisplayName(),
                    targetName: tName,
                });
                continue;
            }

            // Damage logging.
            const damage = result.damage || 0;
            if (damage > 0) {
                this.eventLog.logDamage(tName, damage, caster.getDisplayName());

                // Effectiveness text.
                const effLabel = result.effectivenessLabel || 'neutral';
                switch (effLabel) {
                    case 'super_effective':
                        this.eventLog.addEvent(EVENT_SUPER_EFFECTIVE, { targetName: tName });
                        break;
                    case 'not_very_effective':
                        this.eventLog.addEvent(EVENT_NOT_EFFECTIVE, { targetName: tName });
                        break;
                    case 'immune':
                        this.eventLog.addEvent(EVENT_IMMUNE, { targetName: tName });
                        break;
                }

                // Critical hit text.
                if (result.isCrit) {
                    this.eventLog.addEvent(EVENT_CRITICAL_HIT, { targetName: tName });
                }

                // Emit damage signal.
                eventBus.emit(
                    GameEvents.UNIT_DAMAGED,
                    caster.spriteInstance,
                    target.spriteInstance || null,
                    damage,
                    result.isCrit || false,
                    result.effectiveness || 1.0
                );
            }

            // Heal logging.
            const healed = result.healed || 0;
            if (healed > 0) {
                this.eventLog.logHeal(tName, healed);
            }

            // Status effect logging.
            const statusApplied = result.statusApplied || [];
            for (const effectName of statusApplied) {
                this.eventLog.logStatusApplied(tName, effectName);
                // Find the StatusEffectData for the signal.
                for (const eid in this._statusDb) {
                    const sed = this._statusDb[eid];
                    if (sed.effectName === effectName) {
                        eventBus.emit(GameEvents.STATUS_APPLIED, target.spriteInstance, sed);
                        break;
                    }
                }
            }

            // Knockback logging.
            if (result.knockback != null) {
                this.eventLog.addEvent(EVENT_KNOCKBACK, {
                    targetName: tName,
                });
            }

            // Faint check.
            if (result.isFainted) {
                faintedUnits.push(target);
            }
        }

        // -- Process defeats -------------------------------------------------------
        for (const fainted of faintedUnits) {
            if (this.defeatSystem != null) {
                const defeatResult = this.defeatSystem.processDefeat(fainted, this.grid, this.turnOrder);
                this.eventLog.logFaint(defeatResult.displayName || '???');
            } else {
                // Minimal defeat handling: remove from grid and turn order.
                this.grid.removeUnit(fainted.gridPosition);
                this.turnOrder.removeUnit(fainted);
                this.eventLog.logFaint(fainted.getDisplayName());
            }
            eventBus.emit(GameEvents.UNIT_DEFEATED, fainted.spriteInstance);
        }

        // -- Check win/loss conditions --------------------------------------------
        this._checkBattleConditions();
    }

    // -- Private: Turn End --------------------------------------------------------

    _endCurrentTurn() {
        if (this.currentUnit !== null) {
            eventBus.emit(GameEvents.TURN_ENDED, this.currentUnit.spriteInstance);
        }
        this.eventLog.advanceTurn();
        this.currentUnit = null;

        if (!this.isBattleActive) return;

        // Continue to the next turn.
        // Use setTimeout(0) to allow UI to update between turns (mirrors call_deferred).
        setTimeout(() => this.processTurn(), 0);
    }

    // -- Private: Condition Check -------------------------------------------------

    _checkBattleConditions() {
        if (this.conditionChecker != null) {
            const result = this.conditionChecker.checkConditions(this.grid);
            switch (result.state) {
                case 'player_win':
                    this.endBattle('player_win');
                    break;
                case 'enemy_win':
                    this.endBattle('enemy_win');
                    break;
                // "ongoing" -- continue.
            }
        } else {
            // Default condition check: if all units on one side are dead.
            const playerUnits = this.grid.getAllUnits(0);
            const enemyUnits = this.grid.getAllUnits(1);
            if (enemyUnits.length === 0) {
                this.endBattle('player_win');
            } else if (playerUnits.length === 0) {
                this.endBattle('enemy_win');
            }
        }
    }

    // -- Private: Status Faint Handling -------------------------------------------

    /**
     * @param {BattleUnit} unit
     */
    _handleStatusFaint(unit) {
        if (this.defeatSystem != null) {
            const defeatResult = this.defeatSystem.processDefeat(unit, this.grid, this.turnOrder);
            this.eventLog.logFaint(defeatResult.displayName || '???');
        } else {
            this.grid.removeUnit(unit.gridPosition);
            this.turnOrder.removeUnit(unit);
            this.eventLog.logFaint(unit.getDisplayName());
        }
        eventBus.emit(GameEvents.UNIT_DEFEATED, unit.spriteInstance);
        this._checkBattleConditions();
    }

    // -- Private: Unit Creation ---------------------------------------------------

    /**
     * Create a BattleUnit from the team data dictionary.
     * @param {object} data
     * @param {number} teamId
     * @returns {BattleUnit|null}
     */
    _createBattleUnit(data, teamId) {
        const instance = data.instance;
        const raceData = data.raceData;
        const stageData = data.stageData;
        const abilities = data.abilities || [];

        if (instance == null || raceData == null || stageData == null) {
            console.warn('BattleManager: Incomplete unit data, skipping.');
            return null;
        }

        // Calculate full stats.
        const stats = instance.calculateAllEffectiveStats(raceData, stageData);
        const elemTypes = [];
        if (raceData.elementTypes) {
            for (const e of raceData.elementTypes) {
                elemTypes.push(e);
            }
        }

        const unit = new BattleUnit();
        unit.initialize(instance, stats, teamId, abilities, elemTypes);
        return unit;
    }

    // -- Private: Ability Registration --------------------------------------------

    /**
     * Register abilities in the database for AI lookups.
     * @param {object[]} abilities
     */
    _registerAbilities(abilities) {
        for (const ability of abilities) {
            if (ability != null && ability.abilityId !== undefined) {
                this._abilityDb[ability.abilityId] = ability;
            }
        }
    }

    // -- Private: Default Positioning ---------------------------------------------

    /**
     * Generate default grid positions for a team.
     * Places units in rows starting from the front, filling left to right.
     * @param {number} team
     * @param {number} count
     * @returns {{x: number, y: number}[]}
     */
    _generateDefaultPositions(team, count) {
        const positions = [];
        const rowStart = team === 0 ? BattleGrid.PLAYER_ROW_MAX : BattleGrid.ENEMY_ROW_MIN;
        const rowDir = team === 0 ? -1 : 1; // Player fills back-to-front, enemy front-to-back.

        let placed = 0;
        let currentRow = rowStart;
        const maxRows = BattleGrid.GRID_HEIGHT_PER_SIDE;

        for (let _row = 0; _row < maxRows; _row++) {
            for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
                if (placed >= count) break;
                // Center units if fewer than grid width.
                let offset = 0;
                const unitsThisRow = Math.min(BattleGrid.GRID_WIDTH, count - placed);
                if (unitsThisRow < BattleGrid.GRID_WIDTH) {
                    offset = Math.floor((BattleGrid.GRID_WIDTH - unitsThisRow) / 2);
                }
                if (x >= offset && x < offset + unitsThisRow) {
                    positions.push({ x, y: currentRow });
                    placed += 1;
                }
            }
            if (placed >= count) break;
            currentRow += rowDir;
        }

        return positions;
    }
}

// ============================================================================
// BattleEventLog -- Simple event log for battle history and UI display.
// Mirrors the GDScript BattleEventLog autoload.
// ============================================================================

class BattleEventLog {
    constructor() {
        this._log = [];
        this._currentTurn = 0;
    }

    /** Clear the full log. */
    clear() {
        this._log = [];
        this._currentTurn = 0;
    }

    /** Advance the turn counter. */
    advanceTurn() {
        this._currentTurn += 1;
    }

    /**
     * Add a generic event to the log.
     * @param {string} eventType
     * @param {object} data
     */
    addEvent(eventType, data = {}) {
        this._log.push({
            type: eventType,
            turn: this._currentTurn,
            timestamp: Date.now(),
            ...data,
        });
    }

    /**
     * Log an ability being used.
     * @param {string} casterName
     * @param {string} abilityName
     * @param {string} targetName
     */
    logAbilityUsed(casterName, abilityName, targetName) {
        this.addEvent('ability_used', {
            casterName,
            abilityName,
            targetName,
        });
    }

    /**
     * Log damage dealt.
     * @param {string} targetName
     * @param {number} damage
     * @param {string} sourceName
     */
    logDamage(targetName, damage, sourceName) {
        this.addEvent('damage', {
            targetName,
            damage,
            sourceName,
        });
    }

    /**
     * Log healing.
     * @param {string} targetName
     * @param {number} amount
     */
    logHeal(targetName, amount) {
        this.addEvent('heal', {
            targetName,
            amount,
        });
    }

    /**
     * Log a status effect being applied.
     * @param {string} targetName
     * @param {string} effectName
     */
    logStatusApplied(targetName, effectName) {
        this.addEvent('status_applied', {
            targetName,
            effectName,
        });
    }

    /**
     * Log a status effect expiring.
     * @param {string} targetName
     * @param {string} effectName
     */
    logStatusExpired(targetName, effectName) {
        this.addEvent('status_expired', {
            targetName,
            effectName,
        });
    }

    /**
     * Log a unit fainting.
     * @param {string} displayName
     */
    logFaint(displayName) {
        this.addEvent('faint', {
            unitName: displayName,
        });
    }

    /**
     * Get the full log.
     * @returns {object[]}
     */
    getFullLog() {
        return [...this._log];
    }
}

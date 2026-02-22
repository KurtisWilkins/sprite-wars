/**
 * TurnOrderSystem -- [P3-003] Manages turn order for grid-based combat.
 * Sorts units by effective speed (descending) with priority move support.
 * Skips dead or action-prevented units automatically.
 *
 * Ported from Game/Scripts/Battle/TurnOrderSystem.gd
 */

export class TurnOrderSystem {
    // -- State --------------------------------------------------------------------

    /** The full list of units participating in this round. @type {import('./BattleUnit.js').BattleUnit[]} */
    units = [];

    /** Index of the current unit in the sorted turn order. */
    currentIndex = -1;

    /** Priority queue: units that have used priority moves act before the normal order. @type {import('./BattleUnit.js').BattleUnit[]} */
    _priorityQueue = [];

    /** The computed turn order for the current round. @type {import('./BattleUnit.js').BattleUnit[]} */
    _turnOrder = [];

    // -- Initialization -----------------------------------------------------------

    /**
     * Set up the turn order with all participating units.
     * @param {import('./BattleUnit.js').BattleUnit[]} allUnits
     */
    initialize(allUnits) {
        this.units = [];
        for (const unit of allUnits) {
            this.units.push(unit);
        }
        this._priorityQueue = [];
        this.currentIndex = -1;
        this.calculateTurnOrder();
    }

    // -- Turn Order Calculation ---------------------------------------------------

    /**
     * Sort units by effective speed (highest first). Ties broken by:
     * 1. Higher sp_atk (proxy for power)
     * 2. Random coin flip
     * @returns {import('./BattleUnit.js').BattleUnit[]}
     */
    calculateTurnOrder() {
        this._turnOrder = [];

        // Only include living units.
        const living = [];
        for (const unit of this.units) {
            if (unit.isAlive) {
                living.push(unit);
            }
        }

        // Sort by speed descending. On ties, use sp_atk as tiebreaker.
        living.sort((a, b) => this._compareSpeed(a, b));
        this._turnOrder = living;
        this.currentIndex = -1;
        return this._turnOrder;
    }

    /**
     * Get the sorted turn order (read-only snapshot).
     * @returns {import('./BattleUnit.js').BattleUnit[]}
     */
    getTurnOrder() {
        return [...this._turnOrder];
    }

    /**
     * Comparison function: higher speed first, then higher sp_atk, then random.
     * Returns negative if a should come first, positive if b should come first.
     * @param {import('./BattleUnit.js').BattleUnit} a
     * @param {import('./BattleUnit.js').BattleUnit} b
     * @returns {number}
     */
    _compareSpeed(a, b) {
        const spdA = a.effectiveStats.spd || 0;
        const spdB = b.effectiveStats.spd || 0;
        if (spdA !== spdB) return spdB - spdA; // Descending

        const spaA = a.effectiveStats.sp_atk || 0;
        const spaB = b.effectiveStats.sp_atk || 0;
        if (spaA !== spaB) return spaB - spaA; // Descending

        // Final tiebreaker: random.
        return Math.random() > 0.5 ? -1 : 1;
    }

    // -- Turn Progression ---------------------------------------------------------

    /**
     * Advance to the next unit that can act. Returns null if no more units remain.
     * Priority-queued units are served first, then the normal turn order.
     * @returns {import('./BattleUnit.js').BattleUnit|null}
     */
    getNextUnit() {
        // Drain the priority queue first.
        while (this._priorityQueue.length > 0) {
            const priorityUnit = this._priorityQueue.shift();
            if (priorityUnit.isAlive && priorityUnit.canAct) {
                return priorityUnit;
            }
        }

        // Normal turn order.
        this.currentIndex += 1;
        while (this.currentIndex < this._turnOrder.length) {
            const unit = this._turnOrder[this.currentIndex];
            if (unit.isAlive && unit.canAct) {
                return unit;
            }
            this.currentIndex += 1;
        }

        // All units have acted or are unable.
        return null;
    }

    /**
     * Whether there are more units to act this round.
     * @returns {boolean}
     */
    hasNextUnit() {
        // Check priority queue.
        for (const unit of this._priorityQueue) {
            if (unit.isAlive && unit.canAct) return true;
        }
        // Check remaining normal order.
        for (let i = this.currentIndex + 1; i < this._turnOrder.length; i++) {
            const unit = this._turnOrder[i];
            if (unit.isAlive && unit.canAct) return true;
        }
        return false;
    }

    // -- Priority Actions ---------------------------------------------------------

    /**
     * Insert a unit for a priority action (e.g. Quick Attack-style moves).
     * The unit will act before the next normal turn.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     */
    insertPriorityAction(unit) {
        if (unit.isAlive) {
            this._priorityQueue.push(unit);
        }
    }

    // -- Unit Management ----------------------------------------------------------

    /**
     * Remove a unit from the turn order (e.g. when fainted).
     * @param {import('./BattleUnit.js').BattleUnit} unit
     */
    removeUnit(unit) {
        let idx = this.units.indexOf(unit);
        if (idx >= 0) {
            this.units.splice(idx, 1);
        }

        // Also remove from the active turn order.
        idx = this._turnOrder.indexOf(unit);
        if (idx >= 0) {
            // If the removed unit is before our current index, adjust.
            if (idx <= this.currentIndex) {
                this.currentIndex -= 1;
            }
            this._turnOrder.splice(idx, 1);
        }

        // Remove from priority queue.
        idx = this._priorityQueue.indexOf(unit);
        if (idx >= 0) {
            this._priorityQueue.splice(idx, 1);
        }
    }

    /**
     * Recalculate turn order mid-round (e.g. after a speed change).
     * Preserves progress: units that have already acted this round are not re-added.
     */
    recalculate() {
        // Collect units that haven't acted yet.
        const alreadyActed = [];
        const limit = Math.min(this.currentIndex + 1, this._turnOrder.length);
        for (let i = 0; i < limit; i++) {
            alreadyActed.push(this._turnOrder[i]);
        }

        // Recalculate full order.
        this.calculateTurnOrder();

        // Remove already-acted units from the new order and reset index.
        const newOrder = [];
        for (const unit of this._turnOrder) {
            if (!alreadyActed.includes(unit)) {
                newOrder.push(unit);
            }
        }
        this._turnOrder = newOrder;
        this.currentIndex = -1;
    }

    /** Start a new round: recalculate from scratch. */
    newRound() {
        this._priorityQueue = [];
        this.calculateTurnOrder();
    }
}

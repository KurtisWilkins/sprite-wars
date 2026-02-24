/**
 * BattleGrid -- [P3-001] Grid-based battlefield for Sprite Wars.
 * 7 columns x 9 rows total (5 player rows + 4 enemy rows). Team 0 (player)
 * occupies rows 0-4, team 1 (enemy) occupies rows 5-8.
 *
 * Ported from Game/Scripts/Battle/BattleGrid.gd
 */

export class BattleGrid {
    // -- Constants ----------------------------------------------------------------

    static GRID_WIDTH = 7;
    static GRID_HEIGHT_PER_SIDE = 5;
    static TOTAL_HEIGHT = 9; // 5 player rows + 4 enemy rows

    // Team row boundaries (inclusive).
    static PLAYER_ROW_MIN = 0;
    static PLAYER_ROW_MAX = 4;
    static ENEMY_ROW_MIN = 5;
    static ENEMY_ROW_MAX = 8;

    // -- State --------------------------------------------------------------------

    /** @type {Map<string, import('./BattleUnit.js').BattleUnit|null>} */
    cells;

    // -- Initialization -----------------------------------------------------------

    constructor() {
        this.cells = new Map();
        this._clearGrid();
    }

    _clearGrid() {
        this.cells.clear();
        for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
            for (let y = 0; y < BattleGrid.TOTAL_HEIGHT; y++) {
                this.cells.set(_key(x, y), null);
            }
        }
    }

    // -- Unit Placement -----------------------------------------------------------

    /**
     * Place a unit on the grid. Returns true if successful, false if the cell is
     * occupied or out of bounds.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {{x: number, y: number}} pos
     * @returns {boolean}
     */
    placeUnit(unit, pos) {
        if (!this.isValidPosition(pos)) return false;
        if (!this.isCellEmpty(pos)) return false;
        this.cells.set(_key(pos.x, pos.y), unit);
        unit.gridPosition = { x: pos.x, y: pos.y };
        return true;
    }

    /**
     * Remove and return the unit at the given position. Returns null if empty.
     * @param {{x: number, y: number}} pos
     * @returns {import('./BattleUnit.js').BattleUnit|null}
     */
    removeUnit(pos) {
        if (!this.isValidPosition(pos)) return null;
        const unit = this.cells.get(_key(pos.x, pos.y)) || null;
        if (unit !== null) {
            this.cells.set(_key(pos.x, pos.y), null);
        }
        return unit;
    }

    /**
     * Move a unit from its current position to a new one. Returns true on success.
     * @param {import('./BattleUnit.js').BattleUnit} unit
     * @param {{x: number, y: number}} newPos
     * @returns {boolean}
     */
    moveUnit(unit, newPos) {
        if (!this.isValidPosition(newPos)) return false;
        if (!this.isCellEmpty(newPos)) return false;
        const oldPos = unit.gridPosition;
        if (this.isValidPosition(oldPos)) {
            this.cells.set(_key(oldPos.x, oldPos.y), null);
        }
        this.cells.set(_key(newPos.x, newPos.y), unit);
        unit.gridPosition = { x: newPos.x, y: newPos.y };
        return true;
    }

    // -- Queries ------------------------------------------------------------------

    /**
     * Get the unit at a position, or null if empty/invalid.
     * @param {{x: number, y: number}} pos
     * @returns {import('./BattleUnit.js').BattleUnit|null}
     */
    getUnitAt(pos) {
        if (!this.isValidPosition(pos)) return null;
        return this.cells.get(_key(pos.x, pos.y)) || null;
    }

    /**
     * Whether a cell exists and has no unit.
     * @param {{x: number, y: number}} pos
     * @returns {boolean}
     */
    isCellEmpty(pos) {
        if (!this.isValidPosition(pos)) return false;
        return this.cells.get(_key(pos.x, pos.y)) === null;
    }

    /**
     * Whether coordinates are within the grid bounds.
     * @param {{x: number, y: number}} pos
     * @returns {boolean}
     */
    isValidPosition(pos) {
        return pos.x >= 0 && pos.x < BattleGrid.GRID_WIDTH &&
               pos.y >= 0 && pos.y < BattleGrid.TOTAL_HEIGHT;
    }

    /**
     * Get the team that owns a row (0 = player, 1 = enemy).
     * @param {number} row
     * @returns {number}
     */
    getTeamForRow(row) {
        if (row >= BattleGrid.PLAYER_ROW_MIN && row <= BattleGrid.PLAYER_ROW_MAX) {
            return 0;
        }
        return 1;
    }

    /**
     * Get all living units on a given team.
     * @param {number} team
     * @returns {import('./BattleUnit.js').BattleUnit[]}
     */
    getAllUnits(team) {
        const result = [];
        const rowMin = team === 0 ? BattleGrid.PLAYER_ROW_MIN : BattleGrid.ENEMY_ROW_MIN;
        const rowMax = team === 0 ? BattleGrid.PLAYER_ROW_MAX : BattleGrid.ENEMY_ROW_MAX;
        for (let y = rowMin; y <= rowMax; y++) {
            for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
                const unit = this.cells.get(_key(x, y));
                if (unit !== null && unit !== undefined && unit.isAlive) {
                    result.push(unit);
                }
            }
        }
        return result;
    }

    /**
     * Get all units across both teams.
     * @returns {import('./BattleUnit.js').BattleUnit[]}
     */
    getAllLivingUnits() {
        const result = [];
        for (const unit of this.cells.values()) {
            if (unit !== null && unit !== undefined && unit.isAlive) {
                result.push(unit);
            }
        }
        return result;
    }

    // -- Range Queries ------------------------------------------------------------

    /**
     * Get all living units within Manhattan distance of the origin.
     * @param {{x: number, y: number}} origin
     * @param {number} rangeVal
     * @returns {import('./BattleUnit.js').BattleUnit[]}
     */
    getUnitsInRange(origin, rangeVal) {
        const result = [];
        for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
            for (let y = 0; y < BattleGrid.TOTAL_HEIGHT; y++) {
                const unit = this.cells.get(_key(x, y));
                if (unit === null || unit === undefined) continue;
                if (!unit.isAlive) continue;
                const dist = Math.abs(x - origin.x) + Math.abs(y - origin.y);
                if (dist <= rangeVal) {
                    result.push(unit);
                }
            }
        }
        return result;
    }

    /**
     * Get the four cardinal-adjacent cell coordinates (within bounds).
     * @param {{x: number, y: number}} pos
     * @returns {{x: number, y: number}[]}
     */
    getAdjacentCells(pos) {
        const result = [];
        const offsets = [
            { x: -1, y: 0 }, { x: 1, y: 0 },
            { x: 0, y: -1 }, { x: 0, y: 1 },
        ];
        for (const offset of offsets) {
            const adj = { x: pos.x + offset.x, y: pos.y + offset.y };
            if (this.isValidPosition(adj)) {
                result.push(adj);
            }
        }
        return result;
    }

    /**
     * Manhattan distance between two grid positions.
     * @param {{x: number, y: number}} a
     * @param {{x: number, y: number}} b
     * @returns {number}
     */
    getDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    // -- Pattern Resolution -------------------------------------------------------

    /**
     * Resolve all cells affected by a targeting pattern, starting from an origin
     * and aimed at/toward a direction.
     *
     * @param {{x: number, y: number}} origin - The caster's grid position.
     * @param {string} pattern - One of the 15 canonical pattern names.
     * @param {{x: number, y: number}} direction - A normalized direction vector toward the primary target.
     *        For patterns like "single" this is the target position itself.
     * @returns {{x: number, y: number}[]} Array of valid grid positions (deduplicated, in-bounds).
     */
    getCellsInPattern(origin, pattern, direction) {
        const result = [];

        switch (pattern) {
            case 'single':
                // direction IS the target position for single-target patterns.
                result.push({ x: direction.x, y: direction.y });
                break;

            case 'single_ally':
                result.push({ x: direction.x, y: direction.y });
                break;

            case 'self':
                result.push({ x: origin.x, y: origin.y });
                break;

            case 'row': {
                // The entire row of the target cell.
                const targetY = direction.y;
                for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
                    result.push({ x, y: targetY });
                }
                break;
            }

            case 'column': {
                // The entire column of the target cell.
                const targetX = direction.x;
                for (let y = 0; y < BattleGrid.TOTAL_HEIGHT; y++) {
                    result.push({ x: targetX, y });
                }
                break;
            }

            case 'cross':
                // Plus-shaped pattern centered on the target.
                result.push({ x: direction.x, y: direction.y });
                for (const offset of [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }]) {
                    result.push({ x: direction.x + offset.x, y: direction.y + offset.y });
                }
                break;

            case 'diamond':
                // Diamond (Manhattan radius 2) centered on target.
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dy = -2; dy <= 2; dy++) {
                        if (Math.abs(dx) + Math.abs(dy) <= 2) {
                            result.push({ x: direction.x + dx, y: direction.y + dy });
                        }
                    }
                }
                break;

            case 'aoe_circle':
                // 3x3 square area centered on the target.
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        result.push({ x: direction.x + dx, y: direction.y + dy });
                    }
                }
                break;

            case 'random':
                // Random pattern: direction is treated as the selected target.
                // The caller (MultiTargetResolver) handles selecting random targets.
                result.push({ x: direction.x, y: direction.y });
                break;

            case 'all': {
                // Every enemy cell (opponent side of the field).
                const casterTeam = this.getTeamForRow(origin.y);
                const enemyRowMin = casterTeam === 0 ? BattleGrid.ENEMY_ROW_MIN : BattleGrid.PLAYER_ROW_MIN;
                const enemyRowMax = casterTeam === 0 ? BattleGrid.ENEMY_ROW_MAX : BattleGrid.PLAYER_ROW_MAX;
                for (let y = enemyRowMin; y <= enemyRowMax; y++) {
                    for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
                        result.push({ x, y });
                    }
                }
                break;
            }

            case 'all_allies': {
                // Every ally cell (caster's side of the field).
                const casterTeamA = this.getTeamForRow(origin.y);
                const allyRowMin = casterTeamA === 0 ? BattleGrid.PLAYER_ROW_MIN : BattleGrid.ENEMY_ROW_MIN;
                const allyRowMax = casterTeamA === 0 ? BattleGrid.PLAYER_ROW_MAX : BattleGrid.ENEMY_ROW_MAX;
                for (let y = allyRowMin; y <= allyRowMax; y++) {
                    for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
                        result.push({ x, y });
                    }
                }
                break;
            }

            case 'adjacent':
                // Four cardinal cells around the target, plus the target itself.
                result.push({ x: direction.x, y: direction.y });
                for (const offset of [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }]) {
                    result.push({ x: direction.x + offset.x, y: direction.y + offset.y });
                }
                break;

            case 'adjacent_allies':
                // Cardinal cells around the caster (for ally-buff abilities).
                result.push({ x: origin.x, y: origin.y });
                for (const offset of [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }]) {
                    result.push({ x: origin.x + offset.x, y: origin.y + offset.y });
                }
                break;

            case 'line': {
                // A straight line from origin toward direction, up to grid edge.
                const dirVec = this._normalizeDirection(origin, direction);
                if (dirVec.x !== 0 || dirVec.y !== 0) {
                    let current = { x: origin.x + dirVec.x, y: origin.y + dirVec.y };
                    while (this.isValidPosition(current)) {
                        result.push({ x: current.x, y: current.y });
                        current = { x: current.x + dirVec.x, y: current.y + dirVec.y };
                    }
                }
                break;
            }

            case 'pierce': {
                // Like line, but explicitly marks all cells for piercing projectiles.
                const dirVecP = this._normalizeDirection(origin, direction);
                if (dirVecP.x !== 0 || dirVecP.y !== 0) {
                    let current = { x: origin.x + dirVecP.x, y: origin.y + dirVecP.y };
                    while (this.isValidPosition(current)) {
                        result.push({ x: current.x, y: current.y });
                        current = { x: current.x + dirVecP.x, y: current.y + dirVecP.y };
                    }
                }
                break;
            }

            default:
                console.warn(`BattleGrid: Unknown pattern '${pattern}', defaulting to single target.`);
                result.push({ x: direction.x, y: direction.y });
                break;
        }

        // Filter to valid, unique positions.
        return this._filterValidUnique(result);
    }

    // -- Private Helpers ----------------------------------------------------------

    /**
     * Get a normalized cardinal/diagonal direction from one cell to another.
     * @param {{x: number, y: number}} from
     * @param {{x: number, y: number}} to
     * @returns {{x: number, y: number}}
     */
    _normalizeDirection(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        if (dx === 0 && dy === 0) return { x: 0, y: 0 };
        return { x: Math.sign(dx), y: Math.sign(dy) };
    }

    /**
     * Filter a list of positions to only valid, unique grid cells.
     * @param {{x: number, y: number}[]} positions
     * @returns {{x: number, y: number}[]}
     */
    _filterValidUnique(positions) {
        const result = [];
        const seen = new Set();
        for (const pos of positions) {
            if (!this.isValidPosition(pos)) continue;
            const k = _key(pos.x, pos.y);
            if (seen.has(k)) continue;
            seen.add(k);
            result.push({ x: pos.x, y: pos.y });
        }
        return result;
    }
}

/**
 * Internal helper: generate a string key from grid coordinates for Map storage.
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
function _key(x, y) {
    return `${x},${y}`;
}

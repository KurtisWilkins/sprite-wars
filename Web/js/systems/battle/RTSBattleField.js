/**
 * RTSBattleField.js — Continuous 2D battlefield for Hero's Hour-style combat.
 *
 * Unlike BattleGrid (7x9 discrete cells), RTSBattleField operates on continuous
 * pixel coordinates. Units move freely within the battlefield bounds.
 *
 * Features:
 *   - Continuous unit positioning
 *   - Spatial hashing for efficient neighbor queries
 *   - Boundary clamping
 *   - Collision detection between units
 */

import { RTSUnit } from './RTSUnit.js';

// ── Battlefield Dimensions (matches 960x540 design resolution) ──────────────
const FIELD_WIDTH = 860;       // Battle area width (pixels)
const FIELD_HEIGHT = 420;      // Battle area height (pixels)
const FIELD_MARGIN_X = 50;    // Left/right margin from canvas edge
const FIELD_MARGIN_Y = 60;    // Top margin (below UI)
const FIELD_MARGIN_BOTTOM = 60; // Bottom margin (above controls)

// ── Spatial Hash Grid ───────────────────────────────────────────────────────
const HASH_CELL_SIZE = 48;    // Size of each spatial hash cell

export class RTSBattleField {

    // ── Dimensions ──────────────────────────────────────────────────────────

    /** Battlefield width in pixels. */
    width = FIELD_WIDTH;
    /** Battlefield height in pixels. */
    height = FIELD_HEIGHT;
    /** X offset from canvas origin. */
    offsetX = FIELD_MARGIN_X;
    /** Y offset from canvas origin. */
    offsetY = FIELD_MARGIN_Y;

    // ── Units ───────────────────────────────────────────────────────────────

    /** All units on the battlefield (both teams). @type {RTSUnit[]} */
    units = [];

    /** Player team units. @type {RTSUnit[]} */
    playerUnits = [];

    /** Enemy team units. @type {RTSUnit[]} */
    enemyUnits = [];

    // ── Spatial Hash ────────────────────────────────────────────────────────

    /** @type {Map<string, RTSUnit[]>} */
    _spatialHash = new Map();

    // ── Initialization ──────────────────────────────────────────────────────

    constructor() {
        this.reset();
    }

    reset() {
        this.units = [];
        this.playerUnits = [];
        this.enemyUnits = [];
        this._spatialHash.clear();
    }

    // ── Unit Management ─────────────────────────────────────────────────────

    /**
     * Add a unit to the battlefield at a world position.
     * @param {RTSUnit} unit
     * @param {number} x - World X
     * @param {number} y - World Y
     */
    addUnit(unit, x, y) {
        unit.worldPos.x = x;
        unit.worldPos.y = y;
        this.units.push(unit);

        if (unit.team === 0) {
            this.playerUnits.push(unit);
        } else {
            this.enemyUnits.push(unit);
        }
    }

    /**
     * Remove a unit from the battlefield.
     * @param {RTSUnit} unit
     */
    removeUnit(unit) {
        this._removeFromArray(this.units, unit);
        if (unit.team === 0) {
            this._removeFromArray(this.playerUnits, unit);
        } else {
            this._removeFromArray(this.enemyUnits, unit);
        }
    }

    /**
     * Get all living units on a team.
     * @param {number} team - 0=player, 1=enemy
     * @returns {RTSUnit[]}
     */
    getLivingUnits(team) {
        const source = team === 0 ? this.playerUnits : this.enemyUnits;
        return source.filter(u => u.isAlive);
    }

    /**
     * Get all living units on both teams.
     * @returns {RTSUnit[]}
     */
    getAllLivingUnits() {
        return this.units.filter(u => u.isAlive);
    }

    // ── Spatial Queries ─────────────────────────────────────────────────────

    /**
     * Rebuild the spatial hash grid (call once per frame before queries).
     */
    rebuildSpatialHash() {
        this._spatialHash.clear();
        for (const unit of this.units) {
            if (!unit.isAlive) continue;
            const key = this._hashKey(unit.worldPos.x, unit.worldPos.y);
            let bucket = this._spatialHash.get(key);
            if (!bucket) {
                bucket = [];
                this._spatialHash.set(key, bucket);
            }
            bucket.push(unit);
        }
    }

    /**
     * Find all living units within a radius of a point.
     * @param {number} x
     * @param {number} y
     * @param {number} radius
     * @returns {RTSUnit[]}
     */
    getUnitsInRadius(x, y, radius) {
        const result = [];
        const radiusSq = radius * radius;

        // Check all cells that could overlap with the circle
        const minCX = Math.floor((x - radius) / HASH_CELL_SIZE);
        const maxCX = Math.floor((x + radius) / HASH_CELL_SIZE);
        const minCY = Math.floor((y - radius) / HASH_CELL_SIZE);
        const maxCY = Math.floor((y + radius) / HASH_CELL_SIZE);

        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cy = minCY; cy <= maxCY; cy++) {
                const bucket = this._spatialHash.get(`${cx},${cy}`);
                if (!bucket) continue;
                for (const unit of bucket) {
                    const dx = unit.worldPos.x - x;
                    const dy = unit.worldPos.y - y;
                    if (dx * dx + dy * dy <= radiusSq) {
                        result.push(unit);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Find the nearest enemy unit to a position.
     * @param {number} x
     * @param {number} y
     * @param {number} team - The team of the searcher (finds opposite team)
     * @param {number} maxRange - Maximum search range
     * @returns {RTSUnit|null}
     */
    findNearestEnemy(x, y, team, maxRange = 999) {
        const enemies = team === 0 ? this.enemyUnits : this.playerUnits;
        let nearest = null;
        let nearestDist = maxRange * maxRange;

        for (const enemy of enemies) {
            if (!enemy.isAlive) continue;
            const dx = enemy.worldPos.x - x;
            const dy = enemy.worldPos.y - y;
            const distSq = dx * dx + dy * dy;
            if (distSq < nearestDist) {
                nearestDist = distSq;
                nearest = enemy;
            }
        }

        return nearest;
    }

    /**
     * Find the weakest (lowest HP%) enemy within range.
     * @param {number} x
     * @param {number} y
     * @param {number} team
     * @param {number} range
     * @returns {RTSUnit|null}
     */
    findWeakestEnemy(x, y, team, range) {
        const enemies = this.getUnitsInRadius(x, y, range)
            .filter(u => u.team !== team && u.isAlive);

        if (enemies.length === 0) return null;

        let weakest = enemies[0];
        let lowestHp = weakest.getHpFraction();

        for (let i = 1; i < enemies.length; i++) {
            const hp = enemies[i].getHpFraction();
            if (hp < lowestHp) {
                lowestHp = hp;
                weakest = enemies[i];
            }
        }

        return weakest;
    }

    /**
     * Find the weakest ally within range (for healing).
     * @param {number} x
     * @param {number} y
     * @param {number} team
     * @param {number} range
     * @returns {RTSUnit|null}
     */
    findWeakestAlly(x, y, team, range) {
        const allies = this.getUnitsInRadius(x, y, range)
            .filter(u => u.team === team && u.isAlive && u.getHpFraction() < 0.8);

        if (allies.length === 0) return null;

        let weakest = allies[0];
        let lowestHp = weakest.getHpFraction();

        for (let i = 1; i < allies.length; i++) {
            const hp = allies[i].getHpFraction();
            if (hp < lowestHp) {
                lowestHp = hp;
                weakest = allies[i];
            }
        }

        return weakest;
    }

    // ── Boundary Enforcement ────────────────────────────────────────────────

    /**
     * Clamp a unit's position to battlefield bounds.
     * @param {RTSUnit} unit
     */
    clampToBounds(unit) {
        const r = unit.radius;
        unit.worldPos.x = Math.max(r, Math.min(this.width - r, unit.worldPos.x));
        unit.worldPos.y = Math.max(r, Math.min(this.height - r, unit.worldPos.y));
    }

    /**
     * Check if a point is within the battlefield.
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isInBounds(x, y) {
        return x >= 0 && x <= this.width && y >= 0 && y <= this.height;
    }

    // ── Collision Resolution ────────────────────────────────────────────────

    /**
     * Resolve unit-to-unit collisions using simple overlap pushback.
     * Called once per frame after all movement.
     */
    resolveCollisions() {
        const livingUnits = this.units.filter(u => u.isAlive);
        const count = livingUnits.length;

        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const a = livingUnits[i];
                const b = livingUnits[j];

                const dx = b.worldPos.x - a.worldPos.x;
                const dy = b.worldPos.y - a.worldPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = a.radius + b.radius;

                if (dist < minDist) {
                    const overlap = (minDist - dist) * 0.5;
                    let nx, ny;
                    if (dist > 0.01) {
                        nx = dx / dist;
                        ny = dy / dist;
                    } else {
                        // Nearly overlapping — random direction to separate
                        const angle = Math.random() * Math.PI * 2;
                        nx = Math.cos(angle);
                        ny = Math.sin(angle);
                    }

                    a.worldPos.x -= nx * overlap;
                    a.worldPos.y -= ny * overlap;
                    b.worldPos.x += nx * overlap;
                    b.worldPos.y += ny * overlap;
                }
            }
        }
    }

    // ── Deployment Position Helpers ──────────────────────────────────────────

    /**
     * Convert deployment grid position (from DeploymentScene) to world position.
     * Player units start on the left, enemy on the right.
     * @param {number} gridX - Grid column (0-6)
     * @param {number} gridY - Grid row (0-8)
     * @param {number} team - 0=player, 1=enemy
     * @returns {{x: number, y: number}}
     */
    gridToWorld(gridX, gridY, team) {
        if (team === 0) {
            // Player: left side of field
            const x = 60 + gridX * 40;
            const y = 40 + gridY * (this.height / 9);
            return { x, y };
        } else {
            // Enemy: right side of field
            const x = this.width - 60 - (6 - gridX) * 40;
            const y = 40 + (gridY - 5) * (this.height / 5);
            return { x: Math.min(x, this.width - 30), y };
        }
    }

    /**
     * Generate default spread positions for a team.
     * @param {number} team
     * @param {number} count
     * @returns {{x: number, y: number}[]}
     */
    generateSpawnPositions(team, count) {
        const positions = [];
        if (count <= 0) return positions;
        const cols = Math.min(count, 3);
        const rows = Math.ceil(count / cols);

        for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);

            const spacingX = 50;
            const spacingY = Math.min(60, (this.height - 80) / Math.max(rows, 1));

            let x, y;
            if (team === 0) {
                // Player: left quarter
                x = 80 + col * spacingX;
                y = (this.height / 2) - ((rows - 1) * spacingY / 2) + row * spacingY;
            } else {
                // Enemy: right quarter
                x = this.width - 80 - col * spacingX;
                y = (this.height / 2) - ((rows - 1) * spacingY / 2) + row * spacingY;
            }

            positions.push({ x, y });
        }

        return positions;
    }

    // ── Canvas Coordinate Conversion ────────────────────────────────────────

    /**
     * Convert world position to canvas screen position.
     * @param {number} wx - World X
     * @param {number} wy - World Y
     * @returns {{x: number, y: number}}
     */
    worldToScreen(wx, wy) {
        return {
            x: this.offsetX + wx,
            y: this.offsetY + wy,
        };
    }

    /**
     * Convert canvas screen position to world position.
     * @param {number} sx - Screen X
     * @param {number} sy - Screen Y
     * @returns {{x: number, y: number}}
     */
    screenToWorld(sx, sy) {
        return {
            x: sx - this.offsetX,
            y: sy - this.offsetY,
        };
    }

    // ── Private ─────────────────────────────────────────────────────────────

    _hashKey(x, y) {
        const cx = Math.floor(x / HASH_CELL_SIZE);
        const cy = Math.floor(y / HASH_CELL_SIZE);
        return `${cx},${cy}`;
    }

    _removeFromArray(arr, item) {
        const idx = arr.indexOf(item);
        if (idx >= 0) arr.splice(idx, 1);
    }
}

// ── Export field dimensions ─────────────────────────────────────────────────
export { FIELD_WIDTH, FIELD_HEIGHT, FIELD_MARGIN_X, FIELD_MARGIN_Y };

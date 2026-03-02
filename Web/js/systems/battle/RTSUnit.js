/**
 * RTSUnit.js — Real-time unit extending BattleUnit with continuous position,
 * velocity, attack cooldowns, and movement state for Hero's Hour-style combat.
 *
 * Each RTSUnit exists on a continuous 2D battlefield (not grid-locked).
 * Units autonomously move toward enemies and attack/use abilities in real-time.
 */

import { BattleUnit } from './BattleUnit.js';

// ── Unit States ─────────────────────────────────────────────────────────────
export const UnitState = {
    IDLE:       'idle',
    MOVING:     'moving',
    ATTACKING:  'attacking',
    CASTING:    'casting',
    STUNNED:    'stunned',
    DEAD:       'dead',
};

// ── Constants ───────────────────────────────────────────────────────────────
const BASE_MOVE_SPEED = 40;          // Pixels per second (base, scaled by SPD)
const BASE_ATTACK_COOLDOWN = 2.0;    // Seconds between attacks (base)
const BASE_ABILITY_COOLDOWN = 8.0;   // Seconds between ability uses
const MELEE_RANGE = 24;              // Pixels for melee attacks
const RANGED_RANGE = 120;            // Pixels for ranged attacks
const UNIT_RADIUS = 10;              // Collision radius
const ATTACK_ANIM_DURATION = 0.3;    // Seconds for attack animation
const CAST_ANIM_DURATION = 0.5;      // Seconds for ability cast animation
const SEPARATION_RADIUS = 18;        // Min distance between allied units
const AGGRO_RANGE = 300;             // Max distance to acquire targets

// Class types that use ranged attacks
const RANGED_CLASSES = new Set(['Archer', 'Wizard', 'Cleric', 'Summoner', 'Ranger']);

export class RTSUnit extends BattleUnit {

    // ── Real-Time Position ──────────────────────────────────────────────────

    /** World position (continuous). @type {{x: number, y: number}} */
    worldPos = { x: 0, y: 0 };

    /** Current velocity vector. @type {{x: number, y: number}} */
    velocity = { x: 0, y: 0 };

    /** Movement speed in pixels/second. */
    moveSpeed = BASE_MOVE_SPEED;

    /** Unit collision radius. */
    radius = UNIT_RADIUS;

    // ── Combat State ────────────────────────────────────────────────────────

    /** Current behavior state. */
    state = UnitState.IDLE;

    /** Current target unit (may be null). @type {RTSUnit|null} */
    target = null;

    /** Time until next auto-attack is ready (seconds). */
    attackCooldownTimer = 0;

    /** Time until next ability can be used (seconds). */
    abilityCooldownTimer = 0;

    /** Time remaining in current attack/cast animation. */
    animTimer = 0;

    /** Whether this unit uses ranged attacks. */
    isRanged = false;

    /** Attack range in pixels. */
    attackRange = MELEE_RANGE;

    /** Class type for weapon/ability selection. */
    classType = 'Knight';

    // ── Movement ────────────────────────────────────────────────────────────

    /** Path waypoints for movement. @type {{x: number, y: number}[]} */
    path = [];

    /** Current waypoint index. */
    pathIndex = 0;

    /** Time since last path recalculation. */
    pathAge = 0;

    // ── Visual State ────────────────────────────────────────────────────────

    /** Facing direction: 0=down, 1=left, 2=right, 3=up */
    facing = 0;

    /** Walk animation frame (0-3). */
    walkFrame = 0;

    /** Walk animation timer. */
    walkTimer = 0;

    /** Flash timer for hit feedback. */
    hitFlashTimer = 0;

    /** Race ID for sprite rendering. */
    raceId = 1;

    /** Evolution stage (1-3). */
    evolutionStage = 1;

    // ── Ability Tracking ────────────────────────────────────────────────────

    /** Real-time ability cooldowns: abilityId -> seconds remaining. */
    rtsCooldowns = {};

    /** The ability being cast (if in CASTING state). */
    castingAbility = null;

    /** The target of the ability being cast. */
    castTarget = null;

    // ── Stats Cache ─────────────────────────────────────────────────────────

    /** Attack cooldown rate (derived from SPD). */
    attackRate = BASE_ATTACK_COOLDOWN;

    // ── Initialization ──────────────────────────────────────────────────────

    /**
     * Initialize the RTS unit from deployment data.
     * @param {object} instance - SpriteInstance
     * @param {object} stats - Calculated stats
     * @param {number} teamId - 0=player, 1=enemy
     * @param {object[]} abilities - Ability data array
     * @param {string[]} elemTypes - Element types
     * @param {object} raceData - Race definition from SpriteData
     * @param {number} stage - Evolution stage 1-3
     */
    initRTS(instance, stats, teamId, abilities, elemTypes, raceData, stage) {
        // Initialize base BattleUnit
        this.initialize(instance, stats, teamId, abilities, elemTypes);

        // Race/evolution info
        this.raceId = raceData ? raceData.race_id : 1;
        this.evolutionStage = stage || 1;
        this.classType = raceData ? raceData.class_type : 'Knight';

        // Determine if ranged
        this.isRanged = RANGED_CLASSES.has(this.classType);
        this.attackRange = this.isRanged ? RANGED_RANGE : MELEE_RANGE;

        // Calculate movement speed from SPD stat
        // SPD 50 = base speed, SPD 100 = 1.5x speed, SPD 200 = 2x speed
        const spdStat = this.effectiveStats.spd || 50;
        this.moveSpeed = BASE_MOVE_SPEED * (0.6 + spdStat / 125);

        // Attack rate: higher SPD = faster attacks
        // SPD 50 = 2s cooldown, SPD 100 = 1.3s, SPD 200 = 0.8s
        this.attackRate = Math.max(0.4, BASE_ATTACK_COOLDOWN * (50 / Math.max(spdStat, 20)));

        // Initialize ability cooldowns
        this.rtsCooldowns = {};
        for (const abilityId of this.equippedAbilities) {
            this.rtsCooldowns[abilityId] = 0; // Ready immediately
        }

        // Start in idle state
        this.state = UnitState.IDLE;
        this.target = null;
        this.attackCooldownTimer = 0;
        this.abilityCooldownTimer = Math.random() * 1.0; // Stagger first ability use
        this.animTimer = 0;
        this.hitFlashTimer = 0;
        this.path = [];
        this.pathIndex = 0;
        this.pathAge = 999; // Force immediate pathfinding
    }

    // ── Update ──────────────────────────────────────────────────────────────

    /**
     * Main update tick. Called every frame by RTSBattleManager.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (!this.isAlive) {
            this.state = UnitState.DEAD;
            return;
        }

        // Update timers
        this.attackCooldownTimer = Math.max(0, this.attackCooldownTimer - dt);
        this.abilityCooldownTimer = Math.max(0, this.abilityCooldownTimer - dt);
        this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
        this.pathAge += dt;

        // Tick real-time ability cooldowns
        for (const aid in this.rtsCooldowns) {
            if (this.rtsCooldowns[aid] > 0) {
                this.rtsCooldowns[aid] = Math.max(0, this.rtsCooldowns[aid] - dt);
            }
        }

        // Check stunned state
        if (!this.canAct) {
            this.state = UnitState.STUNNED;
            this.velocity.x = 0;
            this.velocity.y = 0;
            return;
        }

        // Handle animation states
        if (this.state === UnitState.ATTACKING || this.state === UnitState.CASTING) {
            this.animTimer -= dt;
            if (this.animTimer <= 0) {
                this.state = UnitState.IDLE;
                this.animTimer = 0;
            }
            this.velocity.x = 0;
            this.velocity.y = 0;
            return;
        }

        // Walk animation
        if (this.state === UnitState.MOVING) {
            this.walkTimer += dt;
            if (this.walkTimer >= 0.15) {
                this.walkFrame = (this.walkFrame + 1) % 4;
                this.walkTimer = 0;
            }
        } else {
            this.walkFrame = 0;
            this.walkTimer = 0;
        }
    }

    // ── Movement ────────────────────────────────────────────────────────────

    /**
     * Move toward a world position.
     * @param {number} tx - Target X
     * @param {number} ty - Target Y
     * @param {number} dt - Delta time
     */
    moveToward(tx, ty, dt) {
        const dx = tx - this.worldPos.x;
        const dy = ty - this.worldPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            this.velocity.x = 0;
            this.velocity.y = 0;
            return;
        }

        // Normalize and apply speed
        const nx = dx / dist;
        const ny = dy / dist;
        this.velocity.x = nx * this.moveSpeed;
        this.velocity.y = ny * this.moveSpeed;

        // Move
        this.worldPos.x += this.velocity.x * dt;
        this.worldPos.y += this.velocity.y * dt;

        // Update facing direction
        this._updateFacing(nx, ny);

        this.state = UnitState.MOVING;
    }

    /**
     * Apply separation force from nearby allied units (flocking).
     * @param {RTSUnit[]} nearby - Nearby allied units
     * @param {number} dt
     */
    applySeparation(nearby, dt) {
        let sepX = 0, sepY = 0;
        let count = 0;

        for (const other of nearby) {
            if (other === this || !other.isAlive) continue;
            const dx = this.worldPos.x - other.worldPos.x;
            const dy = this.worldPos.y - other.worldPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < SEPARATION_RADIUS) {
                if (dist > 0.1) {
                    // Push away proportional to overlap
                    const force = (SEPARATION_RADIUS - dist) / SEPARATION_RADIUS;
                    sepX += (dx / dist) * force;
                    sepY += (dy / dist) * force;
                } else {
                    // Nearly overlapping — random nudge to separate
                    sepX += (Math.random() - 0.5) * 2;
                    sepY += (Math.random() - 0.5) * 2;
                }
                count++;
            }
        }

        if (count > 0) {
            const strength = this.moveSpeed * 0.5;
            this.worldPos.x += sepX * strength * dt;
            this.worldPos.y += sepY * strength * dt;
        }
    }

    // ── Combat ──────────────────────────────────────────────────────────────

    /**
     * Whether this unit can auto-attack right now.
     */
    get canAttack() {
        return this.isAlive && this.canAct &&
               this.attackCooldownTimer <= 0 &&
               this.state !== UnitState.ATTACKING &&
               this.state !== UnitState.CASTING;
    }

    /**
     * Whether this unit can cast an ability right now.
     */
    get canCastAbility() {
        return this.isAlive && this.canAct &&
               this.abilityCooldownTimer <= 0 &&
               this.state !== UnitState.ATTACKING &&
               this.state !== UnitState.CASTING;
    }

    /**
     * Begin an auto-attack animation.
     */
    startAttack() {
        this.state = UnitState.ATTACKING;
        this.animTimer = ATTACK_ANIM_DURATION;
        this.attackCooldownTimer = this.attackRate;
    }

    /**
     * Begin an ability cast animation.
     * @param {object} ability
     * @param {RTSUnit} target
     */
    startCast(ability, target) {
        this.state = UnitState.CASTING;
        this.animTimer = CAST_ANIM_DURATION;
        this.castingAbility = ability;
        this.castTarget = target;

        // Set ability cooldown
        const baseCd = ability.cooldownTurns || 3;
        this.rtsCooldowns[ability.abilityId] = baseCd * 2.5; // Convert turns to seconds
        this.abilityCooldownTimer = BASE_ABILITY_COOLDOWN * 0.5; // Global ability cooldown
    }

    /**
     * Get the best available ability to use.
     * @param {object} abilityDb - abilityId -> AbilityData map
     * @returns {object|null}
     */
    getBestAbility(abilityDb) {
        let bestAbility = null;
        let bestScore = -1;

        for (const abilityId of this.equippedAbilities) {
            // Check real-time cooldown
            if ((this.rtsCooldowns[abilityId] || 0) > 0) continue;

            // Check PP
            if ((this.abilityPp[abilityId] || 0) <= 0) continue;

            const ability = abilityDb[abilityId];
            if (!ability) continue;

            // Score: prefer high damage abilities, healing when low HP
            let score = ability.basePower || 10;
            if (!ability.isDamaging() && this.getHpFraction() < 0.5) {
                score += 50; // Prioritize heals when low
            }
            if (ability.isDamaging() && this.getHpFraction() > 0.3) {
                score += ability.basePower * 0.5;
            }

            if (score > bestScore) {
                bestScore = score;
                bestAbility = ability;
            }
        }

        return bestAbility;
    }

    /**
     * Check if target is within attack range.
     * @param {RTSUnit} target
     * @returns {boolean}
     */
    isInRange(target) {
        if (!target) return false;
        const dx = target.worldPos.x - this.worldPos.x;
        const dy = target.worldPos.y - this.worldPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist <= this.attackRange + target.radius;
    }

    /**
     * Get distance to another unit.
     * @param {RTSUnit} other
     * @returns {number}
     */
    distanceTo(other) {
        const dx = other.worldPos.x - this.worldPos.x;
        const dy = other.worldPos.y - this.worldPos.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Register a hit (for visual feedback).
     */
    onHit() {
        this.hitFlashTimer = 0.15;
    }

    // ── Private ─────────────────────────────────────────────────────────────

    _updateFacing(nx, ny) {
        if (Math.abs(nx) > Math.abs(ny)) {
            this.facing = nx > 0 ? 2 : 1; // right : left
        } else {
            this.facing = ny > 0 ? 0 : 3; // down : up
        }
    }
}

// ── Export Constants ─────────────────────────────────────────────────────────
export {
    BASE_MOVE_SPEED,
    BASE_ATTACK_COOLDOWN,
    MELEE_RANGE,
    RANGED_RANGE,
    UNIT_RADIUS,
    AGGRO_RANGE,
    SEPARATION_RADIUS,
};

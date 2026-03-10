/**
 * NPCController — Controls NPC behavior including patrol movement, player
 * interaction, trainer vision detection, and dialogue triggering.
 * [P5-009] Handles static, patrol, and trainer NPC archetypes.
 *
 * Ported from Game/Scripts/World/NPCController.gd
 * Adapted from Godot CharacterBody2D to plain JS 2D tile-based movement.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// ── Direction Constants ─────────────────────────────────────────────────────

const DIR_UP    = { x:  0, y: -1 };
const DIR_DOWN  = { x:  0, y:  1 };
const DIR_LEFT  = { x: -1, y:  0 };
const DIR_RIGHT = { x:  1, y:  0 };
const DIR_ZERO  = { x:  0, y:  0 };

const DIRECTION_NAMES = new Map([
    ['0,-1', 'up'],
    ['0,1',  'down'],
    ['-1,0', 'left'],
    ['1,0',  'right'],
]);

function dirKey(dir) {
    return `${dir.x},${dir.y}`;
}

// ── NPCController Class ────────────────────────────────────────────────────

export class NPCController {
    /**
     * @param {object} config
     * @param {string}  [config.npcId]          - Unique identifier for this NPC.
     * @param {string}  [config.npcName]        - Display name shown in dialogue.
     * @param {string}  [config.npcType]        - "static", "patrol", or "trainer".
     * @param {object[]} [config.dialogueData]  - Dialogue sequence data.
     * @param {{x:number,y:number}[]} [config.patrolPath] - Patrol waypoints.
     * @param {number}  [config.patrolSpeed]    - Patrol speed (pixels/second).
     * @param {number}  [config.patrolWaitTime] - Wait time at waypoints (seconds).
     * @param {number}  [config.visionRange]    - Trainer vision range (tiles).
     * @param {{x:number,y:number}} [config.visionDirection] - Trainer vision dir.
     * @param {number}  [config.gridSize]       - Grid cell size in pixels.
     * @param {{x:number,y:number}} [config.gridPos] - Starting grid position.
     * @param {object}  [config.overworldMap]   - Reference to OverworldMap.
     * @param {object}  [config.dialogueSystem] - Reference to DialogueSystem.
     * @param {Function} [config.getPlayer]     - Callback returning the player ref.
     */
    constructor(config = {}) {
        // ── Identity ────────────────────────────────────────────────────
        this.npcId = config.npcId || '';
        this.npcName = config.npcName || '';
        this.npcType = config.npcType || 'static'; // "static", "patrol", "trainer"

        // ── Dialogue ────────────────────────────────────────────────────
        /** @type {object[]} */
        this.dialogueData = config.dialogueData || [];

        // ── Patrol ──────────────────────────────────────────────────────
        /** @type {{x:number,y:number}[]} */
        this.patrolPath = config.patrolPath || [];
        this.patrolIndex = 0;
        this.patrolSpeed = config.patrolSpeed ?? 80.0;
        this.patrolWaitTime = config.patrolWaitTime ?? 2.0;

        // ── Trainer ─────────────────────────────────────────────────────
        this.visionRange = config.visionRange ?? 5;
        this.visionDirection = config.visionDirection
            ? { x: config.visionDirection.x, y: config.visionDirection.y }
            : { ...DIR_DOWN };
        this.isDefeated = false;

        // ── Internal State ──────────────────────────────────────────────
        this.gridSize = config.gridSize ?? 16;
        this._facing = this.npcType === 'trainer'
            ? { ...this.visionDirection }
            : { ...DIR_DOWN };
        this._isMoving = false;
        this._moveTarget = { x: 0, y: 0 };
        this._isWaiting = false;
        this._waitTimer = 0.0;
        this._inInteraction = false;
        this._trainerTriggered = false;
        this._trainerSequenceTimer = 0;
        this._trainerPlayer = null;
        this._walkContext = null;

        /** Pixel position of the NPC. */
        this.position = { x: 0, y: 0 };

        /** Current animation name (for external renderer to read). */
        this.currentAnimation = 'idle_down';

        /** Whether the exclamation indicator should be shown. */
        this.showExclamation = false;

        // ── External References ─────────────────────────────────────────
        this.overworldMap = config.overworldMap || null;
        this.dialogueSystem = config.dialogueSystem || null;
        this._getPlayerFn = config.getPlayer || null;

        // Initialize position from grid
        const startGrid = config.gridPos || { x: 0, y: 0 };
        this.position = {
            x: startGrid.x * this.gridSize + this.gridSize * 0.5,
            y: startGrid.y * this.gridSize + this.gridSize * 0.5,
        };

        this._playIdleAnimation();
        this._registerWithMap();
    }

    // ── Update Loop ─────────────────────────────────────────────────────────

    /**
     * Called every frame by the game loop.
     * @param {number} delta - Time since last frame in seconds.
     */
    update(delta) {
        // Process trainer sequence timers (game-time aware)
        if (this._trainerSequenceTimer > 0) {
            this._trainerSequenceTimer -= delta;
            if (this._trainerSequenceTimer <= 0) {
                this._trainerSequenceTimer = 0;
                this._onTrainerExclamationDone();
            }
        }

        // Process game-loop-driven walk movement
        if (this._isMoving && this._moveTarget) {
            const dx = this._moveTarget.x - this.position.x;
            const dy = this._moveTarget.y - this.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = this.patrolSpeed * delta;

            if (dist <= step) {
                this.position.x = this._moveTarget.x;
                this.position.y = this._moveTarget.y;
                this._isMoving = false;
                this._registerWithMap();
                if (this._walkContext) {
                    const ctx = this._walkContext;
                    this._executeWalkSteps(ctx.steps, ctx.stepIndex + 1, ctx.direction, ctx.player);
                }
            } else {
                const nx = dx / dist;
                const ny = dy / dist;
                this.position.x += nx * step;
                this.position.y += ny * step;
            }
        }

        if (this._inInteraction || this._trainerTriggered) {
            return;
        }

        switch (this.npcType) {
            case 'patrol':
                this._processPatrol(delta);
                break;
            case 'trainer':
                this._processTrainerVision();
                break;
            // "static" NPCs do nothing in update
        }
    }

    // ── Interaction ─────────────────────────────────────────────────────────

    /**
     * Called when the player interacts with this NPC.
     * Triggers dialogue and, for trainers, initiates battle.
     * @param {object} player - The PlayerController instance.
     */
    interact(player) {
        if (this._inInteraction) {
            return;
        }

        this._inInteraction = true;
        eventBus.emit('npc_interaction_started', this.npcId);

        // Face the player
        if (player && player.position) {
            this.facePlayer(player.position);
        }

        // Start dialogue
        if (this.dialogueData.length > 0 && this.dialogueSystem) {
            this.dialogueSystem.startDialogue(this.dialogueData);

            // Listen for dialogue end to complete interaction
            const onDialogueEnded = () => {
                eventBus.off(GameEvents.DIALOGUE_ENDED, onDialogueEnded);
                this._finishInteraction();
            };
            eventBus.on(GameEvents.DIALOGUE_ENDED, onDialogueEnded);
        } else {
            this._finishInteraction();
        }
    }

    /**
     * Completes the interaction sequence.
     */
    _finishInteraction() {
        this._inInteraction = false;
        eventBus.emit('npc_interaction_ended', this.npcId);

        // Trainer battle after dialogue (only if not yet defeated)
        if (this.npcType === 'trainer' && !this.isDefeated) {
            this.triggerTrainerBattle();
        }
    }

    // ── Trainer Vision ──────────────────────────────────────────────────────

    /**
     * Checks if the player is within the trainer's vision cone: a straight line
     * in the facing direction up to visionRange tiles.
     * @param {{x: number, y: number}} playerPos - Player grid position.
     * @returns {boolean}
     */
    checkPlayerInVision(playerPos) {
        if (this.isDefeated || this._trainerTriggered || this._inInteraction) {
            return false;
        }

        const myGridPos = this._getGridPos();

        // Vision is a straight line in the facing direction
        for (let i = 1; i <= this.visionRange; i++) {
            const checkPos = {
                x: myGridPos.x + this.visionDirection.x * i,
                y: myGridPos.y + this.visionDirection.y * i,
            };

            if (checkPos.x === playerPos.x && checkPos.y === playerPos.y) {
                return true;
            }

            // Stop at obstacles
            if (this.overworldMap && typeof this.overworldMap.isWalkable === 'function') {
                if (!this.overworldMap.isWalkable(checkPos)) {
                    break;
                }
            }
        }

        return false;
    }

    // ── Trainer Vision Processing ───────────────────────────────────────────

    _processTrainerVision() {
        if (this.isDefeated || this._trainerTriggered) {
            return;
        }

        const player = this._getPlayer();
        if (!player) {
            return;
        }

        const playerGrid = player.currentGridPos || { x: 0, y: 0 };
        if (this.checkPlayerInVision(playerGrid)) {
            this._startTrainerSequence(player);
        }
    }

    // ── Trainer Battle Sequence ──────────────────────────────────────────────

    /**
     * Triggers the trainer battle request.
     */
    triggerTrainerBattle() {
        eventBus.emit('trainer_battle_requested', this);
    }

    /**
     * Begins the trainer detection sequence: freeze player, show "!",
     * walk toward player, then request battle.
     *
     * Uses a step-based async approach since we have no coroutines.
     * @param {object} player
     */
    _startTrainerSequence(player) {
        if (this._trainerTriggered) {
            return;
        }
        this._trainerTriggered = true;
        this._trainerPlayer = player;

        // Freeze player movement
        if (player && typeof player.freeze === 'function') {
            player.freeze();
        }

        // Show exclamation mark
        this.showExclamation = true;

        // Start game-time timer (0.8s) — processed in update()
        this._trainerSequenceTimer = 0.8;
    }

    /**
     * Called by update() when the trainer exclamation timer expires.
     * @private
     */
    _onTrainerExclamationDone() {
        this.showExclamation = false;
        const player = this._trainerPlayer;

        // Get target grid (player's position)
        const targetGrid = player.currentGridPos
            ? { ...player.currentGridPos }
            : {
                x: Math.round(player.position.x / this.gridSize),
                y: Math.round(player.position.y / this.gridSize),
            };

        // Walk toward the player
        this._walkTowardPlayer(targetGrid, player);
    }

    /**
     * Walks the NPC grid-by-grid toward the player, stopping one tile away.
     * Uses requestAnimationFrame-based step movement.
     *
     * @param {{x:number, y:number}} playerGrid
     * @param {object} player
     */
    _walkTowardPlayer(playerGrid, player) {
        const myGrid = this._getGridPos();
        const direction = { ...this.visionDirection };

        const stepsToTake = [];
        let currentGrid = { ...myGrid };

        // Pre-calculate the walk path
        while (true) {
            const nextGrid = {
                x: currentGrid.x + direction.x,
                y: currentGrid.y + direction.y,
            };
            const distToPlayer = this._gridDistance(nextGrid, playerGrid);
            if (distToPlayer < 1) {
                break;
            }

            // Check walkability
            if (this.overworldMap && typeof this.overworldMap.isWalkable === 'function') {
                if (!this.overworldMap.isWalkable(nextGrid)) {
                    break;
                }
            }

            stepsToTake.push({ ...nextGrid });
            currentGrid = { ...nextGrid };
        }

        // Execute walk steps sequentially
        this._executeWalkSteps(stepsToTake, 0, direction, player);
    }

    /**
     * Recursively executes walk steps with smooth interpolation.
     * @param {{x:number,y:number}[]} steps
     * @param {number} stepIndex
     * @param {{x:number,y:number}} direction
     * @param {object} player
     */
    _executeWalkSteps(steps, stepIndex, direction, player) {
        if (stepIndex >= steps.length) {
            // Done walking - face the player and trigger battle
            this._playIdleAnimation();
            if (player && player.position) {
                this.facePlayer(player.position);
            }
            this._registerWithMap();
            this.triggerTrainerBattle();
            return;
        }

        const nextGrid = steps[stepIndex];
        this._moveTarget = {
            x: nextGrid.x * this.gridSize + this.gridSize * 0.5,
            y: nextGrid.y * this.gridSize + this.gridSize * 0.5,
        };
        this._isMoving = true;
        this._walkContext = { steps, stepIndex, direction, player };
        this._setFacing(direction);
        this._playWalkAnimation();
    }

    // ── Facing ──────────────────────────────────────────────────────────────

    /**
     * Faces the NPC toward the given player world position.
     * @param {{x: number, y: number}} playerPos
     */
    facePlayer(playerPos) {
        const diffX = playerPos.x - this.position.x;
        const diffY = playerPos.y - this.position.y;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            this._setFacing(diffX > 0 ? DIR_RIGHT : DIR_LEFT);
        } else {
            this._setFacing(diffY > 0 ? DIR_DOWN : DIR_UP);
        }
    }

    /**
     * Sets the internal facing direction.
     * @param {{x: number, y: number}} direction
     */
    _setFacing(direction) {
        if (direction.x === 0 && direction.y === 0) {
            return;
        }
        this._facing = { x: direction.x, y: direction.y };
        if (this.npcType === 'trainer') {
            this.visionDirection = { x: direction.x, y: direction.y };
        }
    }

    // ── Patrol Movement ─────────────────────────────────────────────────────

    /**
     * Processes patrol behavior each frame.
     * @param {number} delta
     */
    _processPatrol(delta) {
        if (this.patrolPath.length === 0) {
            return;
        }

        if (this._isWaiting) {
            this._waitTimer -= delta;
            if (this._waitTimer <= 0.0) {
                this._isWaiting = false;
                this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
            }
            return;
        }

        if (this._isMoving) {
            this._processPatrolMovement(delta);
            return;
        }

        // Start moving to next waypoint
        const targetGrid = this.patrolPath[this.patrolIndex];
        const currentGrid = this._getGridPos();

        if (currentGrid.x === targetGrid.x && currentGrid.y === targetGrid.y) {
            // Already at waypoint, wait
            this._isWaiting = true;
            this._waitTimer = this.patrolWaitTime;
            this._playIdleAnimation();
            return;
        }

        // Determine direction to next waypoint (one step at a time)
        const diffX = targetGrid.x - currentGrid.x;
        const diffY = targetGrid.y - currentGrid.y;
        let direction;
        if (Math.abs(diffX) > Math.abs(diffY)) {
            direction = { x: Math.sign(diffX), y: 0 };
        } else {
            direction = { x: 0, y: Math.sign(diffY) };
        }

        const nextGrid = {
            x: currentGrid.x + direction.x,
            y: currentGrid.y + direction.y,
        };

        // Check walkability
        if (this.overworldMap && typeof this.overworldMap.isWalkable === 'function') {
            if (!this.overworldMap.isWalkable(nextGrid)) {
                // Can't move, skip to wait
                this._isWaiting = true;
                this._waitTimer = this.patrolWaitTime;
                return;
            }
        }

        this._setFacing(direction);
        this._moveTarget = {
            x: nextGrid.x * this.gridSize + this.gridSize * 0.5,
            y: nextGrid.y * this.gridSize + this.gridSize * 0.5,
        };
        this._isMoving = true;
        this._playWalkAnimation();
    }

    /**
     * Processes patrol movement interpolation each frame.
     * @param {number} delta
     */
    _processPatrolMovement(delta) {
        const step = this.patrolSpeed * delta;
        const dx = this._moveTarget.x - this.position.x;
        const dy = this._moveTarget.y - this.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= step) {
            this.position.x = this._moveTarget.x;
            this.position.y = this._moveTarget.y;
            this._isMoving = false;
            this._playIdleAnimation();
            this._registerWithMap();
        } else {
            const nx = dx / dist;
            const ny = dy / dist;
            this.position.x += nx * step;
            this.position.y += ny * step;
        }
    }

    // ── Animation Helpers ───────────────────────────────────────────────────

    _playIdleAnimation() {
        const dirName = DIRECTION_NAMES.get(dirKey(this._facing)) || 'down';
        this.currentAnimation = `idle_${dirName}`;
    }

    _playWalkAnimation() {
        const dirName = DIRECTION_NAMES.get(dirKey(this._facing)) || 'down';
        this.currentAnimation = `walk_${dirName}`;
    }

    // ── Utility ─────────────────────────────────────────────────────────────

    /**
     * Returns the NPC's current grid position.
     * @returns {{x: number, y: number}}
     */
    _getGridPos() {
        return {
            x: Math.round((this.position.x - this.gridSize * 0.5) / this.gridSize),
            y: Math.round((this.position.y - this.gridSize * 0.5) / this.gridSize),
        };
    }

    /**
     * Returns the Manhattan distance between two grid positions.
     * @param {{x:number,y:number}} a
     * @param {{x:number,y:number}} b
     * @returns {number}
     */
    _gridDistance(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Gets the player reference via the provided callback.
     * @returns {object|null}
     */
    _getPlayer() {
        if (typeof this._getPlayerFn === 'function') {
            return this._getPlayerFn();
        }
        return null;
    }

    /**
     * Registers this NPC's position with the overworld map for collision lookup.
     */
    _registerWithMap() {
        if (this.overworldMap && typeof this.overworldMap.registerNpc === 'function') {
            this.overworldMap.registerNpc(this, this._getGridPos());
        }
    }

    /**
     * Returns the NPC's current grid position (public accessor).
     * @returns {{x: number, y: number}}
     */
    getGridPos() {
        return this._getGridPos();
    }
}

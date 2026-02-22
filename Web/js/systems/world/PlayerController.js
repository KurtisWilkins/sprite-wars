/**
 * PlayerController — Grid-based player character for overworld exploration.
 * [P5-002] Handles 4-directional movement, interaction, encounter checks,
 * and cutscene freeze/unfreeze.
 *
 * Ported from Game/Scripts/World/PlayerController.gd
 * Adapted from Godot physics (CharacterBody2D) to simple 2D tile-based movement.
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

/**
 * Maps keyboard key codes to direction vectors.
 */
const KEY_DIRECTIONS = {
    'ArrowUp':    DIR_UP,
    'ArrowDown':  DIR_DOWN,
    'ArrowLeft':  DIR_LEFT,
    'ArrowRight': DIR_RIGHT,
    'w':          DIR_UP,
    's':          DIR_DOWN,
    'a':          DIR_LEFT,
    'd':          DIR_RIGHT,
};

/**
 * Keys that trigger interaction.
 */
const INTERACT_KEYS = new Set(['Enter', ' ', 'e', 'E']);

// ── Helper ──────────────────────────────────────────────────────────────────

function dirKey(dir) {
    return `${dir.x},${dir.y}`;
}

function dirEquals(a, b) {
    return a.x === b.x && a.y === b.y;
}

function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// ── PlayerController Class ──────────────────────────────────────────────────

export class PlayerController {
    /**
     * @param {object} [config]
     * @param {number} [config.moveSpeed]  - Pixels per second during grid movement.
     * @param {number} [config.gridSize]   - Tile size in pixels.
     * @param {{x: number, y: number}} [config.startGridPos] - Starting grid position.
     */
    constructor(config = {}) {
        // ── Configuration ───────────────────────────────────────────────
        /** Movement speed in pixels per second during grid movement. */
        this.moveSpeed = config.moveSpeed ?? 200.0;

        /** Tile size in pixels; must match the OverworldMap grid_size. */
        this.gridSize = config.gridSize ?? 16;

        // ── State ───────────────────────────────────────────────────────

        /** True while the character is tweening between grid cells. */
        this.isMoving = false;

        /** The direction the character is facing. */
        this.facingDirection = { ...DIR_DOWN };

        /** When false, all input is ignored (dialogue, menus, cutscenes). */
        this.canMove = true;

        /** Grid position the player currently occupies. */
        this.currentGridPos = config.startGridPos
            ? { x: config.startGridPos.x, y: config.startGridPos.y }
            : { x: 0, y: 0 };

        /** Pixel position of the player. */
        this.position = { x: 0, y: 0 };

        /** Target world position during grid movement tween. */
        this._moveTarget = { x: 0, y: 0 };

        /** Reference to the overworld map for walkability/encounter checks. */
        this.overworldMap = null;

        /** Reference to the encounter system. */
        this.encounterSystem = null;

        /** Current area ID (set externally by the game manager). */
        this.currentAreaId = '';

        /** Current animation name (for external renderer to read). */
        this.currentAnimation = 'idle_down';

        // ── Input State ─────────────────────────────────────────────────

        /** Currently held keys. */
        this._keysDown = new Set();

        /** Whether interact was just pressed this frame. */
        this._interactPressed = false;

        // ── Touch Input State ───────────────────────────────────────────

        /** Active touch identifier. */
        this._touchId = null;

        /** Touch start position. */
        this._touchStart = null;

        /** Minimum swipe distance to register direction (pixels). */
        this._touchThreshold = 20;

        /** Direction derived from current touch/swipe. */
        this._touchDirection = null;

        // Initialize position
        this._snapToGrid();
    }

    // ── Input Binding ───────────────────────────────────────────────────────

    /**
     * Binds keyboard and touch event listeners. Call once after construction.
     * @param {HTMLElement|Window} [target=window]
     */
    bindInput(target = window) {
        target.addEventListener('keydown', (e) => this._onKeyDown(e));
        target.addEventListener('keyup', (e) => this._onKeyUp(e));
        target.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        target.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        target.addEventListener('touchend', (e) => this._onTouchEnd(e));
    }

    // ── Update Loop ─────────────────────────────────────────────────────────

    /**
     * Called every frame by the game loop.
     * @param {number} delta - Time since last frame in seconds.
     */
    update(delta) {
        if (this.isMoving) {
            this._processMovement(delta);
            return;
        }

        if (!this.canMove) {
            return;
        }

        this._handleInput();

        // Consume one-shot inputs
        this._interactPressed = false;
    }

    // ── Input Handling ──────────────────────────────────────────────────────

    /**
     * Reads directional input and initiates grid movement or interaction.
     */
    _handleInput() {
        // Check for interaction input first
        if (this._interactPressed) {
            this.checkInteraction();
            return;
        }

        // Determine movement direction from keyboard input
        let direction = null;
        for (const key of this._keysDown) {
            if (KEY_DIRECTIONS[key]) {
                direction = KEY_DIRECTIONS[key];
                break;
            }
        }

        // If no keyboard direction, check touch direction
        if (!direction && this._touchDirection) {
            direction = this._touchDirection;
        }

        if (!direction) {
            this._playIdleAnimation();
            return;
        }

        this.setFacing(direction);

        const targetGridPos = {
            x: this.currentGridPos.x + direction.x,
            y: this.currentGridPos.y + direction.y,
        };

        if (this._canMoveTo(targetGridPos)) {
            this.moveToGrid(targetGridPos);
        }
    }

    // ── Grid Movement ───────────────────────────────────────────────────────

    /**
     * Initiates smooth movement from the current grid cell to the target cell.
     * @param {{x: number, y: number}} targetGridPos
     */
    moveToGrid(targetGridPos) {
        if (this.isMoving) {
            return;
        }

        this.isMoving = true;
        this._moveTarget = {
            x: targetGridPos.x * this.gridSize + this.gridSize * 0.5,
            y: targetGridPos.y * this.gridSize + this.gridSize * 0.5,
        };
        this._playWalkAnimation();
    }

    /**
     * Processes smooth interpolation toward the movement target each frame.
     * @param {number} delta
     */
    _processMovement(delta) {
        const dx = this._moveTarget.x - this.position.x;
        const dy = this._moveTarget.y - this.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = this.moveSpeed * delta;

        if (dist <= step) {
            // Arrived at target
            this.position.x = this._moveTarget.x;
            this.position.y = this._moveTarget.y;

            this.currentGridPos = {
                x: Math.round((this._moveTarget.x - this.gridSize * 0.5) / this.gridSize),
                y: Math.round((this._moveTarget.y - this.gridSize * 0.5) / this.gridSize),
            };
            this.isMoving = false;

            eventBus.emit('moved_to_grid', this.currentGridPos);
            eventBus.emit('step_taken', this.currentGridPos);

            // Post-move checks
            this._onArrivedAtCell(this.currentGridPos);
        } else {
            const nx = dx / dist;
            const ny = dy / dist;
            this.position.x += nx * step;
            this.position.y += ny * step;
        }
    }

    // ── Post-Move Checks ────────────────────────────────────────────────────

    /**
     * Called when the player arrives at a new grid cell.
     * @param {{x: number, y: number}} gridPos
     */
    _onArrivedAtCell(gridPos) {
        // Check area transitions
        if (this.overworldMap && typeof this.overworldMap.getTransitionAt === 'function') {
            const targetArea = this.overworldMap.getTransitionAt(gridPos);
            if (targetArea) {
                eventBus.emit('area_entered', targetArea);
                return;
            }
        }

        // Check encounter zones
        this._onEncounterCheck(gridPos);
    }

    /**
     * Rolls for a wild encounter when stepping on an encounter tile.
     * @param {{x: number, y: number}} gridPos
     */
    _onEncounterCheck(gridPos) {
        if (!this.overworldMap) {
            return;
        }
        if (typeof this.overworldMap.isEncounterZone !== 'function') {
            return;
        }
        if (!this.overworldMap.isEncounterZone(gridPos)) {
            return;
        }

        // Delegate encounter roll to the EncounterSystem
        if (!this.encounterSystem) {
            return;
        }

        const encounterData = this.encounterSystem.checkEncounter(this.currentAreaId);
        if (encounterData && Object.keys(encounterData).length > 0) {
            this.freeze();
            eventBus.emit(GameEvents.ENCOUNTER_TRIGGERED, encounterData);
        }
    }

    // ── Interaction ─────────────────────────────────────────────────────────

    /**
     * Checks for an interactable NPC or object in the facing direction.
     */
    checkInteraction() {
        if (!this.overworldMap) {
            return;
        }

        const targetGridPos = {
            x: this.currentGridPos.x + this.facingDirection.x,
            y: this.currentGridPos.y + this.facingDirection.y,
        };

        // Check for NPC
        const npc = this.overworldMap.getNpcAt(targetGridPos);
        if (npc && typeof npc.interact === 'function') {
            eventBus.emit('interaction_requested', npc);
            npc.interact(this);
            return;
        }

        // Check for interactable object
        const obj = this.overworldMap.getObjectAt(targetGridPos);
        if (obj && typeof obj.interact === 'function') {
            eventBus.emit('interaction_requested', obj);
            obj.interact(this);
        }
    }

    // ── Facing & Animation ──────────────────────────────────────────────────

    /**
     * Sets the facing direction and updates the sprite animation accordingly.
     * @param {{x: number, y: number}} direction
     */
    setFacing(direction) {
        if (direction.x === 0 && direction.y === 0) {
            return;
        }
        this.facingDirection = { x: direction.x, y: direction.y };
        this._playIdleAnimation();
    }

    /**
     * Sets the idle animation name based on current facing direction.
     */
    _playIdleAnimation() {
        const dirName = DIRECTION_NAMES.get(dirKey(this.facingDirection)) || 'down';
        this.currentAnimation = `idle_${dirName}`;
    }

    /**
     * Sets the walk animation name based on current facing direction.
     */
    _playWalkAnimation() {
        const dirName = DIRECTION_NAMES.get(dirKey(this.facingDirection)) || 'down';
        this.currentAnimation = `walk_${dirName}`;
    }

    // ── Freeze / Unfreeze ───────────────────────────────────────────────────

    /**
     * Disables all player input and movement (for dialogue, cutscenes, menus).
     */
    freeze() {
        this.canMove = false;
        this.isMoving = false;
        this._playIdleAnimation();
    }

    /**
     * Re-enables player input and movement.
     */
    unfreeze() {
        this.canMove = true;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Checks whether the player can step onto the target grid position.
     * @param {{x: number, y: number}} gridPos
     * @returns {boolean}
     */
    _canMoveTo(gridPos) {
        if (!this.overworldMap) {
            return true;
        }
        if (typeof this.overworldMap.isWalkable === 'function') {
            return this.overworldMap.isWalkable(gridPos);
        }
        return true;
    }

    /**
     * Snaps the player position to the center of the current grid cell.
     */
    _snapToGrid() {
        this.position = {
            x: this.currentGridPos.x * this.gridSize + this.gridSize * 0.5,
            y: this.currentGridPos.y * this.gridSize + this.gridSize * 0.5,
        };
    }

    /**
     * Teleports the player to a specific grid position.
     * @param {{x: number, y: number}} gridPos
     */
    teleportToGrid(gridPos) {
        this.currentGridPos = { x: gridPos.x, y: gridPos.y };
        this._snapToGrid();
        this.isMoving = false;
        this._playIdleAnimation();
    }

    // ── Keyboard Event Handlers ─────────────────────────────────────────────

    /**
     * @param {KeyboardEvent} e
     */
    _onKeyDown(e) {
        if (INTERACT_KEYS.has(e.key)) {
            this._interactPressed = true;
            return;
        }
        this._keysDown.add(e.key);
    }

    /**
     * @param {KeyboardEvent} e
     */
    _onKeyUp(e) {
        this._keysDown.delete(e.key);
    }

    // ── Touch Event Handlers ────────────────────────────────────────────────

    /**
     * @param {TouchEvent} e
     */
    _onTouchStart(e) {
        if (this._touchId !== null) return;
        const touch = e.changedTouches[0];
        this._touchId = touch.identifier;
        this._touchStart = { x: touch.clientX, y: touch.clientY };
        this._touchDirection = null;
    }

    /**
     * @param {TouchEvent} e
     */
    _onTouchMove(e) {
        if (this._touchId === null) return;
        for (const touch of e.changedTouches) {
            if (touch.identifier !== this._touchId) continue;
            const dx = touch.clientX - this._touchStart.x;
            const dy = touch.clientY - this._touchStart.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= this._touchThreshold) {
                // Determine dominant axis
                if (Math.abs(dx) > Math.abs(dy)) {
                    this._touchDirection = dx > 0 ? DIR_RIGHT : DIR_LEFT;
                } else {
                    this._touchDirection = dy > 0 ? DIR_DOWN : DIR_UP;
                }
            }
        }
    }

    /**
     * @param {TouchEvent} e
     */
    _onTouchEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier !== this._touchId) continue;

            // If touch was a tap (no significant movement), treat as interaction
            if (!this._touchDirection) {
                this._interactPressed = true;
            }

            this._touchId = null;
            this._touchStart = null;
            this._touchDirection = null;
        }
    }
}

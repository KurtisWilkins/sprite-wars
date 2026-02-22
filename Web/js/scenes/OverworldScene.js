/**
 * OverworldScene - Exploration scene with tilemap, player, NPCs, encounters.
 * Renders all world visuals on Canvas. Handles player movement, NPC
 * interaction, random/scripted encounters, and area transitions.
 *
 * Ported from Game/Scripts/UI/Battle/... overworld concepts.
 * Grid uses the engine's tile renderer with camera follow.
 */
import { Scene } from '../core/SceneManager.js';
import { eventBus, GameEvents } from '../core/EventBus.js';

// ── Map Constants ──────────────────────────────────────────────────────────
const TILE_SIZE = 32;
const TILE_DRAW_SIZE = 32;
const PLAYER_SIZE = 24;
const PLAYER_SPEED = 120; // pixels per second
const NPC_INTERACT_DISTANCE = 40;
const ENCOUNTER_STEP_THRESHOLD = 30; // steps between encounter checks
const ENCOUNTER_CHANCE = 0.15; // 15% chance per check
const CAMERA_LERP_SPEED = 6.0;

// ── Direction vectors ──────────────────────────────────────────────────────
const DIR = {
    up:    { x: 0, y: -1 },
    down:  { x: 0, y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};

// ── Default region map data (used when no external map loaded) ─────────────
const DEFAULT_MAP_WIDTH = 30;
const DEFAULT_MAP_HEIGHT = 20;

export class OverworldScene extends Scene {
    constructor(engine) {
        super(engine);

        // Region / map state
        this._currentRegion = 'verdant_temple';
        this._mapData = null;      // { width, height, layers[], collisionMap[], npcs[], transitions[], encounterZones[] }
        this._tilesetImg = null;

        // Player
        this._player = {
            x: 0, y: 0,
            facing: 'down',
            moving: false,
            animFrame: 0,
            animTimer: 0,
            spriteImg: null,
        };

        // Camera (world coordinates of top-left corner, smoothed)
        this._camera = { x: 0, y: 0 };
        this._cameraTarget = { x: 0, y: 0 };

        // NPCs
        this._npcs = [];

        // Encounter tracking
        this._stepCounter = 0;
        this._encounterCooldown = 0;

        // Area transitions
        this._transitions = [];

        // Dialogue state
        this._dialogueActive = false;
        this._dialogueQueue = [];
        this._dialogueNpc = null;

        // HUD
        this._showHud = true;

        // Listeners
        this._unsubs = [];

        // Game data passed from menu or save
        this._gameData = null;

        // Map-edge boundaries
        this._mapPixelWidth = 0;
        this._mapPixelHeight = 0;
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    async init() {
        // Load player sprite
        try {
            this._player.spriteImg = await this.engine.assets.loadImage(
                'Sprites/Characters/player_overworld.png'
            );
        } catch (_) {
            this._player.spriteImg = null;
        }

        this.initialized = true;
    }

    enter(data) {
        this._gameData = data.gameData || data.saveData || {};

        // Determine starting region
        this._currentRegion = this._gameData.currentRegion || 'verdant_temple';

        // Load the region
        this._loadRegion(this._currentRegion, data.spawnPoint || null);

        // Show overworld HUD
        this._showHud = true;
        const topHud = document.getElementById('top-hud');
        if (topHud) {
            topHud.classList.remove('hidden');
            const nameEl = document.getElementById('player-name');
            const goldEl = document.getElementById('gold-display');
            if (nameEl) nameEl.textContent = this._gameData.playerName || 'Trainer';
            if (goldEl) goldEl.textContent = (this._gameData.gold || 0) + 'g';
        }

        // Hide battle HUD
        const battleHud = document.getElementById('battle-hud');
        if (battleHud) battleHud.classList.add('hidden');

        // Wire up events
        this._unsubs.push(
            eventBus.on(GameEvents.DIALOGUE_ENDED, () => {
                this._dialogueActive = false;
                this._dialogueNpc = null;
                const dialogueBox = document.getElementById('dialogue-box');
                if (dialogueBox) dialogueBox.classList.add('hidden');
            })
        );

        this._unsubs.push(
            eventBus.on(GameEvents.GOLD_CHANGED, (amount) => {
                if (this._gameData) this._gameData.gold = amount;
                const goldEl = document.getElementById('gold-display');
                if (goldEl) goldEl.textContent = amount + 'g';
            })
        );

        // Menu button handler
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            this._menuHandler = () => this._openPauseMenu();
            menuBtn.addEventListener('click', this._menuHandler);
        }

        // Play overworld music
        this.engine.audio.playMusic(
            this.engine.assets.resolvePath('Audio/Music/OverworldTheme.wav')
        );

        eventBus.emit(GameEvents.SCREEN_OPENED, 'overworld');
    }

    exit() {
        for (const unsub of this._unsubs) {
            if (typeof unsub === 'function') unsub();
        }
        this._unsubs = [];

        // Hide HUD
        const topHud = document.getElementById('top-hud');
        if (topHud) topHud.classList.add('hidden');

        // Hide dialogue
        const dialogueBox = document.getElementById('dialogue-box');
        if (dialogueBox) dialogueBox.classList.add('hidden');

        // Remove menu handler
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn && this._menuHandler) {
            menuBtn.removeEventListener('click', this._menuHandler);
            this._menuHandler = null;
        }

        eventBus.emit(GameEvents.SCREEN_CLOSED, 'overworld');
    }

    // ── Region Loading ─────────────────────────────────────────────────────

    async _loadRegion(regionId, spawnPoint) {
        this._currentRegion = regionId;

        // Attempt to load region data from JSON, fall back to procedural
        let regionData = await this.engine.assets.loadJSON(`data/regions/${regionId}.json`);
        if (!regionData) {
            regionData = this._generateFallbackMap(regionId);
        }

        this._mapData = regionData;
        this._mapPixelWidth = (this._mapData.width || DEFAULT_MAP_WIDTH) * TILE_SIZE;
        this._mapPixelHeight = (this._mapData.height || DEFAULT_MAP_HEIGHT) * TILE_SIZE;

        // Load tileset for this region
        const tilesetPath = this._mapData.tileset || 'Sprites/Tilesets/verdant_tileset.png';
        try {
            this._tilesetImg = await this.engine.assets.loadImage(tilesetPath);
        } catch (_) {
            this._tilesetImg = null;
        }

        // Set up NPCs
        this._npcs = (this._mapData.npcs || []).map((npcDef, idx) => ({
            id: npcDef.id || `npc_${idx}`,
            name: npcDef.name || 'NPC',
            x: (npcDef.gridX || 5) * TILE_SIZE + TILE_SIZE / 2,
            y: (npcDef.gridY || 5) * TILE_SIZE + TILE_SIZE / 2,
            spriteImg: null,
            dialogue: npcDef.dialogue || ['...'],
            facing: npcDef.facing || 'down',
            type: npcDef.type || 'talk', // talk, shop, quest, heal
        }));

        // Load NPC sprites
        for (const npc of this._npcs) {
            try {
                npc.spriteImg = await this.engine.assets.loadImage(
                    `Sprites/Characters/npc_${npc.type}.png`
                );
            } catch (_) {
                npc.spriteImg = null;
            }
        }

        // Set up area transitions
        this._transitions = (this._mapData.transitions || []).map(t => ({
            x: t.gridX * TILE_SIZE,
            y: t.gridY * TILE_SIZE,
            w: (t.width || 1) * TILE_SIZE,
            h: (t.height || 1) * TILE_SIZE,
            targetRegion: t.targetRegion,
            targetSpawn: t.targetSpawn || null,
        }));

        // Position player
        if (spawnPoint) {
            this._player.x = spawnPoint.x * TILE_SIZE + TILE_SIZE / 2;
            this._player.y = spawnPoint.y * TILE_SIZE + TILE_SIZE / 2;
        } else if (this._mapData.defaultSpawn) {
            this._player.x = this._mapData.defaultSpawn.x * TILE_SIZE + TILE_SIZE / 2;
            this._player.y = this._mapData.defaultSpawn.y * TILE_SIZE + TILE_SIZE / 2;
        } else {
            this._player.x = 5 * TILE_SIZE + TILE_SIZE / 2;
            this._player.y = 10 * TILE_SIZE + TILE_SIZE / 2;
        }

        // Snap camera to player immediately
        this._updateCameraTarget();
        this._camera.x = this._cameraTarget.x;
        this._camera.y = this._cameraTarget.y;

        this._stepCounter = 0;
        this._encounterCooldown = 10; // grace period after entering
    }

    _generateFallbackMap(regionId) {
        const w = DEFAULT_MAP_WIDTH;
        const h = DEFAULT_MAP_HEIGHT;

        // Create a basic grass map with walls along edges
        const ground = [];
        const collision = [];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const isEdge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
                ground.push(isEdge ? 1 : 0); // 1 = wall tile, 0 = grass tile
                collision.push(isEdge ? 1 : 0);
            }
        }

        // Scatter some decorative tiles (trees, rocks)
        for (let i = 0; i < 20; i++) {
            const rx = 2 + Math.floor(Math.random() * (w - 4));
            const ry = 2 + Math.floor(Math.random() * (h - 4));
            const idx = ry * w + rx;
            // Avoid spawn area
            if (Math.abs(rx - 5) < 3 && Math.abs(ry - 10) < 3) continue;
            ground[idx] = 2; // tree/decoration tile
            collision[idx] = 1; // solid
        }

        return {
            id: regionId,
            width: w,
            height: h,
            tileset: 'Sprites/Tilesets/verdant_tileset.png',
            layers: [ground],
            collisionMap: collision,
            defaultSpawn: { x: 5, y: 10 },
            npcs: [
                {
                    id: 'elder',
                    name: 'Temple Elder',
                    gridX: 8,
                    gridY: 6,
                    type: 'talk',
                    dialogue: [
                        'Welcome to the Verdant Temple.',
                        'Wild Sprites roam these grounds.',
                        'Build your team and challenge the temple guardians!',
                    ],
                },
                {
                    id: 'healer',
                    name: 'Healer',
                    gridX: 12,
                    gridY: 8,
                    type: 'heal',
                    dialogue: [
                        'Let me restore your Sprites to full health.',
                        'Your team has been healed!',
                    ],
                },
            ],
            transitions: [
                {
                    gridX: 14,
                    gridY: 0,
                    width: 2,
                    height: 1,
                    targetRegion: 'crystal_caverns',
                    targetSpawn: { x: 7, y: 18 },
                },
            ],
            encounterZones: [
                { x1: 2, y1: 2, x2: 28, y2: 18, encounterRate: 0.15, minLevel: 1, maxLevel: 5 },
            ],
        };
    }

    // ── Update ─────────────────────────────────────────────────────────────

    update(dt) {
        if (this._dialogueActive) {
            // No movement during dialogue
            super.update(dt);
            return;
        }

        // Player movement
        const dir = this.engine.input.getDirection();
        const isMoving = dir.x !== 0 || dir.y !== 0;

        if (isMoving) {
            // Normalize diagonal movement
            const len = Math.hypot(dir.x, dir.y);
            const nx = dir.x / len;
            const ny = dir.y / len;

            const newX = this._player.x + nx * PLAYER_SPEED * dt;
            const newY = this._player.y + ny * PLAYER_SPEED * dt;

            // Collision check - try X and Y separately for wall sliding
            const canMoveX = !this._isColliding(newX, this._player.y);
            const canMoveY = !this._isColliding(this._player.x, newY);

            if (canMoveX) this._player.x = newX;
            if (canMoveY) this._player.y = newY;

            // Clamp to map bounds
            const halfSize = PLAYER_SIZE / 2;
            this._player.x = Math.max(halfSize, Math.min(this._mapPixelWidth - halfSize, this._player.x));
            this._player.y = Math.max(halfSize, Math.min(this._mapPixelHeight - halfSize, this._player.y));

            // Update facing
            if (Math.abs(dir.x) >= Math.abs(dir.y)) {
                this._player.facing = dir.x > 0 ? 'right' : 'left';
            } else {
                this._player.facing = dir.y > 0 ? 'down' : 'up';
            }

            this._player.moving = true;

            // Animation
            this._player.animTimer += dt;
            if (this._player.animTimer >= 0.15) {
                this._player.animTimer = 0;
                this._player.animFrame = (this._player.animFrame + 1) % 4;
            }

            // Step counter for encounters
            this._stepCounter += PLAYER_SPEED * dt / TILE_SIZE;
            if (this._encounterCooldown > 0) {
                this._encounterCooldown -= dt;
            } else if (this._stepCounter >= ENCOUNTER_STEP_THRESHOLD) {
                this._stepCounter = 0;
                this._checkEncounter();
            }

            // Check area transitions
            this._checkTransitions();
        } else {
            this._player.moving = false;
            this._player.animFrame = 0;
        }

        // Smooth camera follow
        this._updateCameraTarget();
        this._camera.x += (this._cameraTarget.x - this._camera.x) * CAMERA_LERP_SPEED * dt;
        this._camera.y += (this._cameraTarget.y - this._camera.y) * CAMERA_LERP_SPEED * dt;

        // Update renderer camera for tile/sprite drawing
        this.engine.renderer.setCamera(Math.round(this._camera.x), Math.round(this._camera.y));

        super.update(dt);
    }

    // ── Render ─────────────────────────────────────────────────────────────

    render(renderer) {
        const ctx = renderer.ctx;

        // Sky/ground color
        renderer.clear('#1a2a1a');

        // Determine visible tile range
        const camX = Math.round(this._camera.x);
        const camY = Math.round(this._camera.y);
        const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
        const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
        const endCol = Math.min(
            (this._mapData ? this._mapData.width : DEFAULT_MAP_WIDTH) - 1,
            Math.ceil((camX + this.engine.designWidth) / TILE_SIZE)
        );
        const endRow = Math.min(
            (this._mapData ? this._mapData.height : DEFAULT_MAP_HEIGHT) - 1,
            Math.ceil((camY + this.engine.designHeight) / TILE_SIZE)
        );

        const mapWidth = this._mapData ? this._mapData.width : DEFAULT_MAP_WIDTH;

        // Draw tilemap layers
        if (this._mapData && this._mapData.layers) {
            for (const layer of this._mapData.layers) {
                for (let y = startRow; y <= endRow; y++) {
                    for (let x = startCol; x <= endCol; x++) {
                        const tileIndex = layer[y * mapWidth + x];
                        if (tileIndex === undefined) continue;

                        const worldX = x * TILE_SIZE;
                        const worldY = y * TILE_SIZE;

                        if (this._tilesetImg) {
                            renderer.drawTile(
                                this._tilesetImg, tileIndex, TILE_SIZE,
                                worldX, worldY, TILE_DRAW_SIZE
                            );
                        } else {
                            // Fallback: color-coded tiles
                            const color = this._getTileFallbackColor(tileIndex);
                            renderer.drawRect(worldX, worldY, TILE_DRAW_SIZE, TILE_DRAW_SIZE, color);
                        }
                    }
                }
            }
        }

        // Draw area transitions (subtle glow markers)
        for (const t of this._transitions) {
            renderer.save();
            renderer.setAlpha(0.3 + 0.15 * Math.sin(performance.now() / 400));
            renderer.drawRect(t.x, t.y, t.w, t.h, 'rgba(100, 200, 255, 0.4)');
            renderer.restore();
        }

        // Draw NPCs
        for (const npc of this._npcs) {
            this._renderNpc(renderer, npc);
        }

        // Draw player
        this._renderPlayer(renderer);

        // Draw NPC interaction prompt if nearby
        const nearbyNpc = this._getNearbyNpc();
        if (nearbyNpc && !this._dialogueActive) {
            const screenX = nearbyNpc.x - camX;
            const screenY = nearbyNpc.y - camY - 28;
            renderer.drawText('[Talk]', screenX, screenY, {
                color: '#e8a035',
                font: 'bold 10px sans-serif',
                align: 'center',
                baseline: 'bottom',
                shadow: true,
            });
        }

        // Region name overlay (top center)
        const regionDisplayName = this._formatRegionName(this._currentRegion);
        renderer.drawText(regionDisplayName, this.engine.designWidth / 2, 56, {
            color: 'rgba(255,255,255,0.5)',
            font: '11px sans-serif',
            align: 'center',
            baseline: 'top',
        });

        super.render(renderer);
    }

    // ── Input ──────────────────────────────────────────────────────────────

    onInput(input) {
        // Dialogue advancement
        if (this._dialogueActive) {
            if (input.isTap() || input.isKeyJustPressed('Space') || input.isKeyJustPressed('Enter')) {
                this._advanceDialogue();
            }
            return;
        }

        // NPC interaction
        if (input.isKeyJustPressed('Space') || input.isKeyJustPressed('Enter') || input.isKeyJustPressed('KeyE')) {
            const npc = this._getNearbyNpc();
            if (npc) {
                this._startNpcInteraction(npc);
                return;
            }
        }

        // Tap-to-interact with NPC
        if (input.isTap()) {
            const worldX = input.pointerPos.x + this._camera.x;
            const worldY = input.pointerPos.y + this._camera.y;
            for (const npc of this._npcs) {
                const dx = worldX - npc.x;
                const dy = worldY - npc.y;
                if (Math.hypot(dx, dy) < NPC_INTERACT_DISTANCE) {
                    // Walk toward NPC then interact
                    this._startNpcInteraction(npc);
                    return;
                }
            }
        }

        // Open Sprite Center
        if (input.isKeyJustPressed('KeyI') || input.isKeyJustPressed('Tab')) {
            this._openSpriteCenter();
        }

        // Open pause menu
        if (input.isKeyJustPressed('Escape')) {
            this._openPauseMenu();
        }

        // Quick save
        if (input.isKeyJustPressed('F5')) {
            this._quickSave();
        }

        // Swipe handling for mobile virtual dpad
        const swipe = input.getSwipe();
        if (swipe) {
            // Swipe gestures could trigger area transitions or menu access
        }
    }

    // ── Collision ──────────────────────────────────────────────────────────

    _isColliding(worldX, worldY) {
        if (!this._mapData || !this._mapData.collisionMap) return false;

        const mapWidth = this._mapData.width || DEFAULT_MAP_WIDTH;
        const halfSize = PLAYER_SIZE / 2 - 2; // Slightly smaller hitbox

        // Check four corners of the player
        const corners = [
            { x: worldX - halfSize, y: worldY - halfSize },
            { x: worldX + halfSize, y: worldY - halfSize },
            { x: worldX - halfSize, y: worldY + halfSize },
            { x: worldX + halfSize, y: worldY + halfSize },
        ];

        for (const c of corners) {
            const col = Math.floor(c.x / TILE_SIZE);
            const row = Math.floor(c.y / TILE_SIZE);
            if (col < 0 || row < 0 || col >= mapWidth || row >= (this._mapData.height || DEFAULT_MAP_HEIGHT)) {
                return true; // Out of bounds
            }
            const idx = row * mapWidth + col;
            if (this._mapData.collisionMap[idx] === 1) {
                return true;
            }
        }

        return false;
    }

    // ── Camera ─────────────────────────────────────────────────────────────

    _updateCameraTarget() {
        const halfW = this.engine.designWidth / 2;
        const halfH = this.engine.designHeight / 2;

        this._cameraTarget.x = this._player.x - halfW;
        this._cameraTarget.y = this._player.y - halfH;

        // Clamp camera to map bounds
        this._cameraTarget.x = Math.max(0, Math.min(this._mapPixelWidth - this.engine.designWidth, this._cameraTarget.x));
        this._cameraTarget.y = Math.max(0, Math.min(this._mapPixelHeight - this.engine.designHeight, this._cameraTarget.y));
    }

    // ── Encounter System ───────────────────────────────────────────────────

    _checkEncounter() {
        if (!this._mapData || !this._mapData.encounterZones) return;

        const playerGridX = Math.floor(this._player.x / TILE_SIZE);
        const playerGridY = Math.floor(this._player.y / TILE_SIZE);

        for (const zone of this._mapData.encounterZones) {
            if (playerGridX >= zone.x1 && playerGridX <= zone.x2 &&
                playerGridY >= zone.y1 && playerGridY <= zone.y2) {

                const rate = zone.encounterRate || ENCOUNTER_CHANCE;
                if (Math.random() < rate) {
                    this._triggerEncounter(zone);
                    return;
                }
            }
        }
    }

    _triggerEncounter(zone) {
        // Generate enemy team based on zone level range
        const minLevel = zone.minLevel || 1;
        const maxLevel = zone.maxLevel || 5;
        const enemyCount = 1 + Math.floor(Math.random() * 3); // 1-3 enemies

        const enemies = [];
        for (let i = 0; i < enemyCount; i++) {
            const level = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
            enemies.push({
                raceId: Math.floor(Math.random() * 24) + 1, // 24 Sprite races
                level,
                stage: level < 10 ? 0 : (level < 25 ? 1 : 2),
            });
        }

        eventBus.emit(GameEvents.ENCOUNTER_TRIGGERED, {
            type: 'wild',
            region: this._currentRegion,
            enemies,
        });

        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/encounter.ogg')
        );

        // Transition to deployment screen (player picks their team)
        this.engine.scenes.changeTo('deployment', {
            encounterType: 'wild',
            region: this._currentRegion,
            enemies,
            gameData: this._gameData,
            returnScene: 'overworld',
            returnData: {
                gameData: this._gameData,
                spawnPoint: {
                    x: Math.floor(this._player.x / TILE_SIZE),
                    y: Math.floor(this._player.y / TILE_SIZE),
                },
            },
        });
    }

    // ── Area Transitions ───────────────────────────────────────────────────

    _checkTransitions() {
        const px = this._player.x;
        const py = this._player.y;

        for (const t of this._transitions) {
            if (px >= t.x && px <= t.x + t.w &&
                py >= t.y && py <= t.y + t.h) {
                this._transitionToRegion(t.targetRegion, t.targetSpawn);
                return;
            }
        }
    }

    _transitionToRegion(regionId, spawnPoint) {
        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/area_transition.ogg'), 0.7
        );

        if (this._gameData) {
            this._gameData.currentRegion = regionId;
        }

        // Re-enter this scene with the new region
        this.engine.scenes.changeTo('overworld', {
            gameData: this._gameData,
            spawnPoint,
        });
    }

    // ── NPC Interaction ────────────────────────────────────────────────────

    _getNearbyNpc() {
        let closest = null;
        let closestDist = NPC_INTERACT_DISTANCE;

        for (const npc of this._npcs) {
            const dx = this._player.x - npc.x;
            const dy = this._player.y - npc.y;
            const dist = Math.hypot(dx, dy);
            if (dist < closestDist) {
                closestDist = dist;
                closest = npc;
            }
        }

        return closest;
    }

    _startNpcInteraction(npc) {
        this._dialogueActive = true;
        this._dialogueNpc = npc;
        this._dialogueQueue = [...npc.dialogue];

        eventBus.emit(GameEvents.NPC_INTERACTED, {
            npcId: npc.id,
            npcName: npc.name,
            npcType: npc.type,
        });

        eventBus.emit(GameEvents.DIALOGUE_STARTED, {
            speaker: npc.name,
            lines: npc.dialogue,
        });

        this._showDialogueLine();
    }

    _showDialogueLine() {
        if (this._dialogueQueue.length === 0) {
            this._endDialogue();
            return;
        }

        const line = this._dialogueQueue[0];
        const dialogueBox = document.getElementById('dialogue-box');
        const speakerEl = document.getElementById('dialogue-speaker');
        const textEl = document.getElementById('dialogue-text');

        if (dialogueBox && speakerEl && textEl) {
            dialogueBox.classList.remove('hidden');
            speakerEl.textContent = this._dialogueNpc ? this._dialogueNpc.name : '';
            textEl.textContent = line;
        }
    }

    _advanceDialogue() {
        this._dialogueQueue.shift();
        if (this._dialogueQueue.length === 0) {
            this._endDialogue();
        } else {
            this._showDialogueLine();
        }
    }

    _endDialogue() {
        this._dialogueActive = false;

        // Apply NPC effect based on type
        if (this._dialogueNpc) {
            switch (this._dialogueNpc.type) {
                case 'heal':
                    this._healParty();
                    break;
                case 'shop':
                    this._openShop(this._dialogueNpc);
                    break;
                case 'quest':
                    // Quest handling would check quest state and advance
                    break;
            }
        }

        this._dialogueNpc = null;

        const dialogueBox = document.getElementById('dialogue-box');
        if (dialogueBox) dialogueBox.classList.add('hidden');

        eventBus.emit(GameEvents.DIALOGUE_ENDED);
    }

    _healParty() {
        // Restore all sprites to full HP
        if (this._gameData && this._gameData.team) {
            for (const sprite of this._gameData.team) {
                sprite.currentHp = sprite.maxHp;
                // Clear status effects
                sprite.statusEffects = [];
            }
        }

        eventBus.emit(GameEvents.NOTIFICATION, 'Your Sprites have been fully healed!');
        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/heal.ogg')
        );
    }

    _openShop(npc) {
        // Open shop via the screen panel -- future implementation
        eventBus.emit(GameEvents.NOTIFICATION, 'Shop coming soon!');
    }

    // ── Menus ──────────────────────────────────────────────────────────────

    _openPauseMenu() {
        const panel = document.getElementById('screen-panel');
        if (!panel) return;

        panel.classList.remove('hidden');
        panel.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'panel-header';

        const title = document.createElement('span');
        title.className = 'panel-title';
        title.textContent = 'Menu';

        const backBtn = document.createElement('button');
        backBtn.className = 'panel-back-btn';
        backBtn.textContent = '\u2190';
        backBtn.addEventListener('click', () => {
            panel.classList.add('hidden');
            panel.innerHTML = '';
        });

        header.appendChild(backBtn);
        header.appendChild(title);
        panel.appendChild(header);

        const content = document.createElement('div');
        content.className = 'panel-content';

        const menuItems = [
            { label: 'Sprite Center', action: () => { panel.classList.add('hidden'); this._openSpriteCenter(); } },
            { label: 'Save Game', action: () => { this._quickSave(); panel.classList.add('hidden'); } },
            { label: 'Settings', action: () => { panel.classList.add('hidden'); this._openSettings(); } },
            { label: 'Return to Title', action: () => { panel.classList.add('hidden'); this._returnToTitle(); } },
        ];

        for (const item of menuItems) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.style.cssText = 'width:100%;margin-bottom:10px;';
            btn.textContent = item.label;
            btn.addEventListener('click', item.action);
            content.appendChild(btn);
        }

        panel.appendChild(content);
    }

    _openSpriteCenter() {
        this.engine.scenes.pushScene('sprite_center', {
            gameData: this._gameData,
        });
    }

    _openSettings() {
        // Reuse the settings panel from MainMenuScene pattern
        const panel = document.getElementById('screen-panel');
        if (!panel) return;

        panel.classList.remove('hidden');
        panel.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'panel-header';

        const title = document.createElement('span');
        title.className = 'panel-title';
        title.textContent = 'Settings';

        const backBtn = document.createElement('button');
        backBtn.className = 'panel-back-btn';
        backBtn.textContent = '\u2190';
        backBtn.addEventListener('click', () => {
            panel.classList.add('hidden');
            panel.innerHTML = '';
        });

        header.appendChild(backBtn);
        header.appendChild(title);
        panel.appendChild(header);

        const content = document.createElement('div');
        content.className = 'panel-content';
        content.innerHTML = '<p style="color:var(--text-dim);">Settings panel</p>';
        panel.appendChild(content);
    }

    _returnToTitle() {
        this.engine.audio.stopMusic(400);
        this.engine.scenes.changeTo('main_menu', {});
    }

    _quickSave() {
        if (!this._gameData) return;

        const saveData = {
            ...this._gameData,
            currentRegion: this._currentRegion,
            playerPosition: {
                x: Math.floor(this._player.x / TILE_SIZE),
                y: Math.floor(this._player.y / TILE_SIZE),
            },
            saveTimestamp: Date.now(),
        };

        localStorage.setItem('sprite_wars_save_0', JSON.stringify(saveData));
        eventBus.emit(GameEvents.GAME_SAVED, saveData);
        eventBus.emit(GameEvents.NOTIFICATION, 'Game saved!');
    }

    // ── Rendering Helpers ──────────────────────────────────────────────────

    _renderPlayer(renderer) {
        const px = this._player.x;
        const py = this._player.y;
        const halfSize = PLAYER_SIZE / 2;

        if (this._player.spriteImg && this._player.spriteImg.complete) {
            // Sprite sheet: 4 columns (frames) x 4 rows (directions: down, left, right, up)
            const dirRow = { down: 0, left: 1, right: 2, up: 3 };
            const row = dirRow[this._player.facing] || 0;
            const col = this._player.moving ? this._player.animFrame : 0;
            const sw = this._player.spriteImg.width / 4;
            const sh = this._player.spriteImg.height / 4;
            renderer.drawSprite(
                this._player.spriteImg,
                col * sw, row * sh, sw, sh,
                px - halfSize, py - halfSize, PLAYER_SIZE, PLAYER_SIZE
            );
        } else {
            // Fallback: colored circle
            renderer.drawCircle(px, py, halfSize, '#44aaff');
            // Direction indicator
            const d = DIR[this._player.facing] || DIR.down;
            renderer.drawCircle(
                px + d.x * halfSize * 0.6,
                py + d.y * halfSize * 0.6,
                3, '#ffffff'
            );
        }
    }

    _renderNpc(renderer, npc) {
        const halfSize = 12;

        if (npc.spriteImg && npc.spriteImg.complete) {
            renderer.drawImage(npc.spriteImg, npc.x - halfSize, npc.y - halfSize, halfSize * 2, halfSize * 2);
        } else {
            // Fallback: colored circle by type
            const colors = {
                talk: '#e8a035',
                heal: '#44cc44',
                shop: '#cc44cc',
                quest: '#4488ee',
            };
            const color = colors[npc.type] || '#ffffff';
            renderer.drawCircle(npc.x, npc.y, halfSize, color);
        }

        // NPC name above
        const screenPos = renderer.worldToScreen(npc.x, npc.y);
        renderer.save();
        const camBackup = { ...renderer.camera };
        renderer.setCamera(0, 0);
        renderer.drawText(npc.name, screenPos.x, screenPos.y - 22, {
            color: '#ffffff',
            font: '9px sans-serif',
            align: 'center',
            baseline: 'bottom',
            shadow: true,
        });
        renderer.setCamera(camBackup.x, camBackup.y);
        renderer.restore();
    }

    _getTileFallbackColor(tileIndex) {
        switch (tileIndex) {
            case 0: return '#2d5a1e'; // grass
            case 1: return '#5a4a3a'; // wall/stone
            case 2: return '#1a4a1a'; // tree/decoration
            case 3: return '#3a6aaa'; // water
            case 4: return '#8a7a5a'; // path
            default: return '#2d5a1e';
        }
    }

    _formatRegionName(regionId) {
        return regionId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
}

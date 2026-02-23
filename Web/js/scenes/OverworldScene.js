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

// ── Admin Log ─────────────────────────────────────────────────────────────
class AdminLog {
    constructor() {
        this._entries = [];
        this._maxEntries = 500;
        this._visible = false;
        this._panel = document.getElementById('admin-log-panel');
        this._content = document.getElementById('admin-log-content');

        // Wire clear/close buttons
        document.getElementById('admin-log-clear')?.addEventListener('click', () => this.clear());
        document.getElementById('admin-log-close')?.addEventListener('click', () => this.hide());
    }

    log(message, level = 'info') {
        const now = new Date();
        const time = now.toLocaleTimeString('en-US', { hour12: false });
        const entry = { time, message, level };
        this._entries.push(entry);
        if (this._entries.length > this._maxEntries) {
            this._entries.shift();
        }
        this._appendDOM(entry);
    }

    _appendDOM(entry) {
        if (!this._content) return;
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = `<span class="log-time">[${entry.time}]</span><span class="log-${entry.level}">${entry.message}</span>`;
        this._content.appendChild(div);
        this._content.scrollTop = this._content.scrollHeight;
    }

    show() {
        this._visible = true;
        if (this._panel) this._panel.classList.remove('hidden');
        // Show admin button in HUD
        const adminBtn = document.getElementById('hud-admin-btn');
        if (adminBtn) adminBtn.classList.remove('hidden');
    }

    hide() {
        this._visible = false;
        if (this._panel) this._panel.classList.add('hidden');
    }

    toggle() {
        if (this._visible) this.hide(); else this.show();
    }

    clear() {
        this._entries = [];
        if (this._content) this._content.innerHTML = '';
    }

    get isVisible() { return this._visible; }
}

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
const DEFAULT_MAP_WIDTH = 24;
const DEFAULT_MAP_HEIGHT = 24;

export class OverworldScene extends Scene {
    constructor(engine) {
        super(engine);

        // Region / map state
        this._currentRegion = 'starter_town';
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

        // Debug overlay (toggle with Ctrl+G)
        this._debugMode = false;
        this._debugHoveredTile = null;

        // Admin log
        this._adminLog = new AdminLog();

        // HUD button handlers (stored for cleanup)
        this._hudSpritesBtnHandler = null;
        this._hudBagBtnHandler = null;
        this._hudAdminBtnHandler = null;

        // Throttled position logging
        this._lastPosLogTime = 0;
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
        // Pull game data from GameManager first (canonical source), fall back to passed data
        const gm = this.engine.gameManager;
        this._gameData = (gm && gm.playerData) ? gm.playerData : (data.gameData || data.saveData || {});

        // Determine starting region
        this._currentRegion = this._gameData.currentAreaId || this._gameData.currentRegion || 'starter_town';

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

        // Wire HUD action buttons
        const spriteBtn = document.getElementById('hud-sprites-btn');
        if (spriteBtn) {
            this._hudSpritesBtnHandler = () => this._openSpriteCenter();
            spriteBtn.addEventListener('click', this._hudSpritesBtnHandler);
        }

        const bagBtn = document.getElementById('hud-bag-btn');
        if (bagBtn) {
            this._hudBagBtnHandler = () => this._openBag();
            bagBtn.addEventListener('click', this._hudBagBtnHandler);
        }

        const adminBtn = document.getElementById('hud-admin-btn');
        if (adminBtn) {
            this._hudAdminBtnHandler = () => this._toggleAdminLog();
            adminBtn.addEventListener('click', this._hudAdminBtnHandler);
        }

        // Admin log event subscriptions
        const logEvents = [
            [GameEvents.BATTLE_STARTED, 'event', 'Battle started'],
            [GameEvents.BATTLE_ENDED, 'event', 'Battle ended'],
            [GameEvents.ENCOUNTER_TRIGGERED, 'event', 'Wild encounter triggered'],
            [GameEvents.NPC_INTERACTED, 'info', data => `NPC interaction: ${data?.name || 'unknown'}`],
            [GameEvents.SCENE_CHANGED, 'info', data => `Scene changed: ${data || 'unknown'}`],
            [GameEvents.ITEM_OBTAINED, 'info', data => `Item obtained: ${data?.name || data}`],
            [GameEvents.ITEM_USED, 'info', data => `Item used: ${data?.name || data}`],
            [GameEvents.GOLD_CHANGED, 'info', amount => `Gold: ${amount}g`],
            [GameEvents.TEAM_CHANGED, 'info', 'Team roster changed'],
            [GameEvents.EQUIPMENT_CHANGED, 'info', 'Equipment changed'],
            [GameEvents.QUEST_STARTED, 'event', data => `Quest started: ${data?.name || data}`],
            [GameEvents.QUEST_COMPLETED, 'event', data => `Quest completed: ${data?.name || data}`],
            [GameEvents.GAME_SAVED, 'admin', data => `Game saved (slot ${data?.slot ?? '?'}, ${data?.auto ? 'auto' : 'manual'})`],
            [GameEvents.GAME_LOADED, 'admin', 'Game data loaded'],
            [GameEvents.LEVEL_UP, 'event', data => `Level up! ${data?.name || ''} → Lv.${data?.level || '?'}`],
            [GameEvents.EVOLUTION_COMPLETE, 'event', data => `Evolution: ${data?.from || '?'} → ${data?.to || '?'}`],
            [GameEvents.SCREEN_OPENED, 'info', screen => `Screen opened: ${screen}`],
            [GameEvents.SCREEN_CLOSED, 'info', screen => `Screen closed: ${screen}`],
        ];

        for (const [event, level, msgOrFn] of logEvents) {
            this._unsubs.push(
                eventBus.on(event, (data) => {
                    const msg = typeof msgOrFn === 'function' ? msgOrFn(data) : msgOrFn;
                    this._adminLog.log(msg, level);
                })
            );
        }

        // Log initial state
        this._adminLog.log(`Entered overworld — Region: ${this._currentRegion}`, 'admin');
        this._adminLog.log(`Player: ${this._gameData.playerName || 'Trainer'}, Gold: ${this._gameData.gold || 0}`, 'admin');
        this._adminLog.log(`Team size: ${(this._gameData.team || []).length}`, 'admin');

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

        // Remove HUD button handlers
        const spriteBtn = document.getElementById('hud-sprites-btn');
        if (spriteBtn && this._hudSpritesBtnHandler) {
            spriteBtn.removeEventListener('click', this._hudSpritesBtnHandler);
            this._hudSpritesBtnHandler = null;
        }

        const bagBtn = document.getElementById('hud-bag-btn');
        if (bagBtn && this._hudBagBtnHandler) {
            bagBtn.removeEventListener('click', this._hudBagBtnHandler);
            this._hudBagBtnHandler = null;
        }

        const adminBtn = document.getElementById('hud-admin-btn');
        if (adminBtn && this._hudAdminBtnHandler) {
            adminBtn.removeEventListener('click', this._hudAdminBtnHandler);
            this._hudAdminBtnHandler = null;
        }

        // Hide admin log panel
        this._adminLog.hide();

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
        // Dispatch to dedicated map builders for hand-crafted regions
        switch (regionId) {
            case 'starter_town':
                return this._buildStarterTownMap();
            case 'fire_temple':
                return this._buildFireTempleMap();
            default:
                return this._buildGenericFallbackMap(regionId);
        }
    }

    // ── Generic fallback for unknown regions ──────────────────────────────
    _buildGenericFallbackMap(regionId) {
        const w = DEFAULT_MAP_WIDTH;
        const h = DEFAULT_MAP_HEIGHT;
        const ground = [];
        const collision = [];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const isEdge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
                ground.push(isEdge ? 6 : 0);
                collision.push(isEdge ? 1 : 0);
            }
        }
        // Scatter decorative tiles avoiding spawn
        for (let i = 0; i < 20; i++) {
            const rx = 2 + Math.floor(Math.random() * (w - 4));
            const ry = 2 + Math.floor(Math.random() * (h - 4));
            const idx = ry * w + rx;
            if (Math.abs(rx - 12) < 3 && Math.abs(ry - 12) < 3) continue;
            ground[idx] = Math.random() < 0.5 ? 6 : 9;
            collision[idx] = 1;
        }
        return {
            id: regionId,
            width: w,
            height: h,
            tileset: 'Sprites/Tilesets/Overworld.png',
            layers: [ground],
            collisionMap: collision,
            defaultSpawn: { x: 12, y: 12 },
            npcs: [],
            transitions: [],
            encounterZones: [
                { x1: 1, y1: 1, x2: w - 2, y2: h - 2, encounterRate: 0.15, minLevel: 1, maxLevel: 5 },
            ],
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    //  STARTER TOWN (Willowshade) — 24x24 hand-crafted overworld map
    //  Designed with Pokemon fan-game principles: organic tree borders,
    //  clear exits with visual cues, inside-out town layout, no encounters.
    // ══════════════════════════════════════════════════════════════════════
    _buildStarterTownMap() {
        const w = 24;
        const h = 24;

        //  Tile index legend:
        //  0  = grass            1  = path (horiz)     2  = path (vert)
        //  3  = path intersection 4 = water            5  = water edge
        //  6  = tree (dark)      7  = tree (light)     8  = flowers/bush
        //  9  = rock/boulder    10  = house wall      11  = house roof
        // 12  = house door      13  = fence           14  = bridge
        // 15  = sign post       16  = chest/crate     17  = lamp post
        // 18  = well/fountain   19  = stairs/cave entrance

        // prettier-ignore
        const ground = [
            // Row 0  — north border: solid dense forest (full tree row, no void)
            6, 7, 6, 6, 7, 6, 7, 6, 6, 7, 6, 7, 6, 6, 7, 6, 6, 7, 6, 7, 6, 6, 7, 6,
            // Row 1  — thick forest border with irregular inner edge
            6, 6, 7, 6, 6, 7, 6, 0, 0, 6, 7, 6, 7, 6, 0, 0, 7, 6, 7, 6, 6, 7, 6, 6,
            // Row 2  — forest thins: NE pond begins, clearings appear
            7, 6, 0, 0, 8, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 5, 5, 5, 0, 0, 8, 6, 7,
            // Row 3  — pond area NE, Player's House roof SW
            6, 7, 0, 11,11,11, 0, 0, 8, 0, 0, 0, 0, 0, 8, 5, 4, 4, 5, 0, 0, 0, 7, 6,
            // Row 4  — Player's House walls + door, pond continues
            6, 0, 0, 10, 0, 10, 0, 0, 0, 0, 0, 2, 0, 0, 0, 5, 4, 4, 5, 0, 8, 0, 0, 7,
            // Row 5  — Player's House door faces east path, pond edge
            7, 0, 0, 10,12, 10, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 6,
            // Row 6  — path from house connects south, Healer Hut roof NW area
            6, 0, 8, 0, 1, 1, 1, 1, 0, 11,11, 3, 0, 0, 8, 0, 0, 0, 0, 0, 0, 8, 0, 7,
            // Row 7  — Healer Hut walls + door, path continues
            7, 0, 0, 0, 0, 0, 0, 1, 0, 10,12, 2, 0, 0, 0, 0, 0, 0, 0, 13,13,13, 0, 6,
            // Row 8  — open area, vertical path toward town center
            6, 0, 0, 8, 0, 0, 0, 1, 0, 10,10, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7,
            // Row 9  — approaching town square from north, decorative house W
            7, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 11,11,11, 0, 0, 0, 0, 0, 0, 6,
            // Row 10 — decorative house roof E, path widens to square
            6, 0, 11,11, 0, 0, 17, 1, 1, 1, 1, 3, 1, 1, 10, 0, 10, 0, 0, 17, 0, 15, 9, 7,
            // Row 11 — town square: fountain row, main E-W avenue, east exit
            7, 0, 10,10, 0, 17, 1, 1, 3, 1, 18, 3, 18, 1, 3, 1, 1, 1, 1, 1, 1, 9,19, 6,
            // Row 12 — town square south row, east exit (stairs + rocks)
            6, 0, 0, 0, 0, 0, 1, 1, 3, 1, 17, 3, 17, 1, 3, 1, 1, 1, 1, 1, 1, 9,19, 7,
            // Row 13 — Shop roof + path south from square
            7, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0, 0, 8, 0, 0, 0, 0, 6,
            // Row 14 — Shop building (east of center), path continues
            6, 0, 0, 8, 0, 0, 0, 0, 2, 0, 11,11,11, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 7,
            // Row 15 — Shop walls + door, fences along path
            7, 0, 0, 0, 13, 13, 0, 0, 2, 0, 10, 0, 10, 0, 2, 0, 0, 0, 0, 0, 8, 0, 7, 6,
            // Row 16 — Shop door faces west path, Prof Lab roof begins
            6, 0, 0, 0, 0, 0, 0, 1, 3, 1, 10,12, 10, 0, 2, 0, 11,11,11,11, 0, 0, 0, 7,
            // Row 17 — Prof Lab walls (largest building, 4 wide)
            7, 0, 8, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 10, 0, 0, 10, 0, 0, 7, 6,
            // Row 18 — Prof Lab door faces north path, path widens toward south exit
            6, 0, 0, 0, 0, 0, 0, 0, 2, 0, 13, 0, 13, 0, 2, 0, 10, 0, 0, 10, 0, 0, 0, 7,
            // Row 19 — fence guides path south, path begins widening from 2 to 4
            7, 6, 0, 0, 8, 0, 0, 13, 3, 1, 1, 1, 1, 1, 3, 1, 1, 12, 1, 1, 0, 0, 6, 6,
            // Row 20 — widening path toward south exit (2 -> 3 wide)
            6, 7, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 7, 6, 7,
            // Row 21 — path widens to 4 tiles, signs on each side
            7, 6, 0, 8, 0, 0, 0, 15, 2, 0, 1, 1, 1, 1, 0, 0, 15, 0, 8, 0, 0, 6, 7, 6,
            // Row 22 — south exit approach: tree gap 4 tiles wide + path
            6, 7, 6, 0, 0, 0, 7, 6, 0, 0, 1, 1, 1, 1, 0, 0, 6, 7, 0, 0, 0, 7, 6, 7,
            // Row 23 — south border: trees except 4-tile south exit gap
            6, 7, 6, 7, 6, 7, 6, 6, 7, 6, 0, 0, 0, 0, 6, 7, 6, 6, 7, 6, 7, 6, 7, 6,
        ];

        // Collision map: 1 = solid, 0 = passable
        // Solid: trees(6,7), water(4), water-edge(5), rocks(9), walls(10), roofs(11), fences(13)
        // Passable: grass(0), paths(1,2,3), flowers(8), doors(12), bridge(14),
        //           signs(15), chests(16), lamps(17), fountain(18), stairs(19)
        const collision = ground.map(tile => {
            switch (tile) {
                case 4:  // water
                case 5:  // water edge
                case 6:  // tree dark
                case 7:  // tree light
                case 9:  // rock/boulder
                case 10: // house wall
                case 11: // house roof
                case 13: // fence
                    return 1;
                default:
                    return 0;
            }
        });

        return {
            id: 'starter_town',
            width: w,
            height: h,
            tileset: 'Sprites/Tilesets/Overworld.png',
            layers: [ground],
            collisionMap: collision,
            defaultSpawn: { x: 11, y: 11 },  // Center of town, near fountain
            npcs: [
                {
                    id: 'elder',
                    name: 'Temple Elder',
                    gridX: 10,
                    gridY: 10,
                    type: 'talk',
                    facing: 'down',
                    dialogue: [
                        'Welcome to Willowshade, young trainer!',
                        'This humble town sits at the edge of the wild lands.',
                        'Many aspiring Sprite tamers begin their journey here.',
                        'Head east through the cave entrance to reach the Blazecore Sanctum.',
                        'But be warned -- the Fire Sprites there are fierce!',
                        'Build your team and grow stronger before challenging the temple guardian.',
                    ],
                },
                {
                    id: 'healer',
                    name: 'Healer Mira',
                    gridX: 8,
                    gridY: 7,
                    type: 'heal',
                    facing: 'down',
                    dialogue: [
                        'Oh dear, your Sprites look exhausted!',
                        'Rest here a moment... Let me tend to them.',
                        'There we go -- all healed up! Good luck out there!',
                    ],
                },
                {
                    id: 'shopkeeper',
                    name: 'Merchant Grin',
                    gridX: 9,
                    gridY: 16,
                    type: 'shop',
                    facing: 'left',
                    dialogue: [
                        'Looking to buy supplies? You have come to the right place!',
                        'I stock potions, crystals, and other essentials.',
                        'Come back any time -- my door is always open!',
                    ],
                },
                {
                    id: 'quest_guide',
                    name: 'Scout Renn',
                    gridX: 20,
                    gridY: 11,
                    type: 'quest',
                    facing: 'left',
                    dialogue: [
                        'Blazecore Sanctum is through that cave!',
                        'Fire-type Sprites lurk within. Their guardian is formidable.',
                        'I have seen trainers rush in unprepared... it never ends well.',
                        'If you bring me a Fire Gem, I can teach your Sprites fire resistance!',
                    ],
                },
                {
                    id: 'mom',
                    name: 'Mom',
                    gridX: 3,
                    gridY: 6,
                    type: 'talk',
                    facing: 'right',
                    dialogue: [
                        'Be careful out there!',
                        'Remember to heal your Sprites at Mira\'s hut if they get hurt.',
                        'I\'ll always be here if you need me.',
                    ],
                },
            ],
            transitions: [
                // East side: cave entrance leads to fire_temple
                {
                    gridX: 22,
                    gridY: 11,
                    width: 2,
                    height: 2,
                    targetRegion: 'fire_temple',
                    targetSpawn: { x: 1, y: 12 },
                },
                // South side: 4-tile-wide exit to starter_route
                {
                    gridX: 10,
                    gridY: 23,
                    width: 4,
                    height: 1,
                    targetRegion: 'starter_route',
                    targetSpawn: { x: 12, y: 1 },
                },
            ],
            // No encounters inside town -- encounters only outside
            encounterZones: [],
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    //  FIRE TEMPLE (Blazecore Sanctum) — 24x24 cave/dungeon map
    //  Pokemon-style dungeon: west entrance corridor -> T-junction,
    //  north boss arena, south treasure room with lava, side rooms,
    //  rest alcove with healer. All edges are cave wall (10).
    // ══════════════════════════════════════════════════════════════════════
    _buildFireTempleMap() {
        const w = 24;
        const h = 24;

        // Cave tileset indices (repurposed for dungeon):
        //  0  = stone floor       1  = path (horiz)     2  = path (vert)
        //  3  = path intersection  4  = lava pool       5  = lava edge
        //  6  = stalagmite (tall) 7  = stalagmite (sm)  8  = moss/rubble
        //  9  = rock/boulder     10  = cave wall        11  = cave wall (top)
        // 12  = archway/door     13  = pillar           14  = bridge (over lava)
        // 15  = sign/rune stone  16  = chest/crate      17  = torch/brazier
        // 18  = altar/shrine     19  = stairs/exit

        // prettier-ignore
        const ground = [
            // Row 0  — solid cave wall (north border)
            10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,
            // Row 1  — boss arena: north wall with corner pillars + torches
            10,10,10,10,10,10,10,13,17, 0, 0, 0, 0, 0, 0,17,13,10,10,10,10,10,10,10,
            // Row 2  — boss arena: open floor
            10,10,10,10,10,10,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10,10,10,10,10,10,10,
            // Row 3  — boss arena: altar at center-north
            10,10,10,10,10,10,10, 0, 0, 0, 0,18, 0, 0, 0, 0, 0,10,10,10,10,10,10,10,
            // Row 4  — boss arena: open floor with torches
            10,10,10,10,10,10,10, 0,17, 0, 0, 0, 0, 0, 0,17, 0,10,10,10,10,10,10,10,
            // Row 5  — boss arena: south wall with 2-tile boss door (archway)
            10,10,10,10,10,10,10,13, 0, 0, 0, 0, 0, 0, 0, 0,13,10,10,10,10,10,10,10,
            // Row 6  — boss door corridor: pillars flank 2-tile archway
            10,10,10,10,10,10,10,10,10,10,13,12,12,13,10,10,10,10,10,10,10,10,10,10,
            // Row 7  — north corridor: narrow 2-wide heading south from boss door
            10,10,10,10,10,10,10,10,10,10, 0, 2, 2, 0,10,10,10,10,10,10,10,10,10,10,
            // Row 8  — north corridor with torch
            10,10,10,10,10,10,10,10,10,17, 0, 2, 2, 0,17,10,10,10,10,10,10,10,10,10,
            // Row 9  — corridor approaching T-junction, east side room opens
            10,10,10,10,10,10,10,10,10,10, 0, 2, 2, 0, 0, 0, 0, 0,10,10,10,10,10,10,
            // Row 10 — T-junction row: east side room (encounter room)
            10,10,10,10,10,10,10,10,10,10, 0, 3, 3, 1, 1,17, 0, 0,10,10,10,10,10,10,
            // Row 11 — main E-W corridor: west entrance archway with torches
            10,17,12,12, 1, 1, 1,17, 1, 1, 1, 3, 3, 0, 0, 0, 0, 0,10,10,10,10,10,10,
            // Row 12 — main E-W corridor continues (2-tile-high corridor)
            10,17,12,12, 1, 1, 1, 1, 1,17, 1, 3, 3, 1, 1, 0, 0,10,10,10,10,10,10,10,
            // Row 13 — south branch begins from T-junction
            10,10,10,10,10,10,10,10,10,10, 0, 2, 2, 0,10,10,10,10,10,10,10,10,10,10,
            // Row 14 — south corridor with west side room entrance
            10,10,10,10,10, 0, 0, 0,12, 0, 0, 2, 2, 0,10,10,10,10,10,10,10,10,10,10,
            // Row 15 — west side room (encounter room with rubble)
            10,10,10,10,10, 0,17, 8, 0, 0,17, 2, 2, 0,10,10,10,10,10,10,10,10,10,10,
            // Row 16 — side room continues, south corridor goes down
            10,10,10,10,10, 0, 0, 8, 0,10,10, 2, 2,10,10,10,10,10,10,10,10,10,10,10,
            // Row 17 — south corridor: opens to treasure room + rest alcove
            10,10,10,10,10,10,10,10,10,10, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0,10,10,10,10,
            // Row 18 — treasure room: lava with proper edge borders
            10,10,10,10,10,10,10,10,10,10, 0, 2, 0, 0, 5, 5, 5, 0, 0, 0,10,10,10,10,
            // Row 19 — treasure room: lava pool center, chest beyond
            10,10,10,10,10,10,10,10,10,10, 0, 2, 0, 5, 4, 4, 5, 0,17, 0,10,10,10,10,
            // Row 20 — treasure room: lava pool south edge, chest
            10,10,10,10,10,10,10,10,10,10, 0, 2, 0, 5, 4, 4, 5, 0, 0, 0,10,10,10,10,
            // Row 21 — treasure room south + rest alcove (west side)
            10,10,10, 0, 0,17, 0, 0,10,10, 0, 0, 0, 0, 5, 5, 5, 0,16, 0,10,10,10,10,
            // Row 22 — rest alcove: altar + healer NPC position
            10,10,10, 0,18, 0,17, 0,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,
            // Row 23 — south border: solid cave wall
            10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,
        ];

        // Collision: walls(10,11), lava(4), lava-edge(5), stalagmites(6,7), rocks(9), pillars(13)
        const collision = ground.map(tile => {
            switch (tile) {
                case 4:  // lava
                case 5:  // lava edge
                case 6:  // stalagmite tall
                case 7:  // stalagmite small
                case 9:  // rock
                case 10: // cave wall
                case 11: // cave wall top
                case 13: // pillar
                    return 1;
                default:
                    return 0;
            }
        });

        return {
            id: 'fire_temple',
            width: w,
            height: h,
            tileset: 'Sprites/Tilesets/Cave.png',
            layers: [ground],
            collisionMap: collision,
            defaultSpawn: { x: 3, y: 11 },  // Just inside the west entrance
            npcs: [
                {
                    id: 'temple_guard',
                    name: 'Fire Acolyte',
                    gridX: 8,
                    gridY: 11,
                    type: 'talk',
                    facing: 'left',
                    dialogue: [
                        'You dare enter the Blazecore Sanctum?',
                        'The guardian awaits at the northern chamber.',
                        'Only those who master Fire can survive here.',
                        'Beware the lava pools -- they scorch anything nearby.',
                    ],
                },
                {
                    id: 'temple_healer',
                    name: 'Ember Priestess',
                    gridX: 4,
                    gridY: 22,
                    type: 'heal',
                    facing: 'up',
                    dialogue: [
                        'The flames spare those who show respect.',
                        'Rest here and regain your strength.',
                        'Your Sprites have been restored by sacred fire.',
                    ],
                },
            ],
            transitions: [
                // West entrance: archway back to starter_town (2 tiles high)
                {
                    gridX: 1,
                    gridY: 11,
                    width: 1,
                    height: 2,
                    targetRegion: 'starter_town',
                    targetSpawn: { x: 21, y: 11 },
                },
            ],
            encounterZones: [
                // Main corridors (moderate encounter rate)
                { x1: 4, y1: 7, x2: 17, y2: 13, encounterRate: 0.18, minLevel: 3, maxLevel: 7 },
                // Side rooms (slightly higher)
                { x1: 5, y1: 14, x2: 8, y2: 16, encounterRate: 0.20, minLevel: 4, maxLevel: 8 },
                { x1: 13, y1: 9, x2: 17, y2: 11, encounterRate: 0.20, minLevel: 4, maxLevel: 8 },
                // Treasure room corridor (higher level)
                { x1: 10, y1: 17, x2: 19, y2: 21, encounterRate: 0.15, minLevel: 5, maxLevel: 9 },
                // Boss arena (scripted-feel, low random rate, high level)
                { x1: 7, y1: 1, x2: 16, y2: 6, encounterRate: 0.05, minLevel: 7, maxLevel: 12 },
                // Rest alcove: NO encounters (excluded by not covering rows 21-22, cols 3-7)
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

        // Throttled position logging for admin log
        if (this._adminLog.isVisible && Date.now() - this._lastPosLogTime > 2000) {
            const pgx = Math.floor(this._player.x / TILE_SIZE);
            const pgy = Math.floor(this._player.y / TILE_SIZE);
            this._adminLog.log(`Player at (${pgx}, ${pgy})`, 'info');
            this._lastPosLogTime = Date.now();
        }

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

        // Debug overlay (Ctrl+G)
        if (this._debugMode) {
            this._renderDebugOverlay(renderer);
        }

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

        // Open Bag
        if (input.isKeyJustPressed('KeyB')) {
            this._openBag();
        }

        // Toggle Admin Log
        if (input.isKeyJustPressed('Backquote')) {
            this._toggleAdminLog();
        }

        // Open pause menu
        if (input.isKeyJustPressed('Escape')) {
            this._openPauseMenu();
        }

        // Quick save
        if (input.isKeyJustPressed('F5')) {
            this._quickSave();
        }

        // Debug overlay toggle (Ctrl+G)
        // Support multiple input API patterns for Ctrl detection
        const ctrlHeld = (input.isKeyDown ? input.isKeyDown('Control') : false) ||
                         (input.isKeyDown ? input.isKeyDown('ControlLeft') : false) ||
                         (input.isKeyDown ? input.isKeyDown('ControlRight') : false) ||
                         !!input.ctrlKey || !!input.ctrl;
        if (input.isKeyJustPressed('KeyG') && ctrlHeld) {
            this._debugMode = !this._debugMode;
            const adminBtnEl = document.getElementById('hud-admin-btn');
            if (adminBtnEl) {
                if (this._debugMode) adminBtnEl.classList.remove('hidden');
                else adminBtnEl.classList.add('hidden');
            }
        }

        // Update debug hovered tile from pointer position
        if (this._debugMode && input.pointerPos) {
            const worldX = input.pointerPos.x + this._camera.x;
            const worldY = input.pointerPos.y + this._camera.y;
            this._debugHoveredTile = {
                x: Math.floor(worldX / TILE_SIZE),
                y: Math.floor(worldY / TILE_SIZE),
            };
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
        const fromRegion = this._currentRegion;
        const toRegion = regionId;
        this._adminLog.log(`Region transition: ${fromRegion} → ${toRegion}`, 'admin');

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

    _openBag() {
        if (this._dialogueActive) return;
        this.engine.scenes.pushScene('bag', {
            gameData: this._gameData,
        });
    }

    _toggleAdminLog() {
        this._adminLog.toggle();
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

    // ── Debug Overlay ────────────────────────────────────────────────────

    _renderDebugOverlay(renderer) {
        const ctx = renderer.ctx;
        const camX = Math.round(this._camera.x);
        const camY = Math.round(this._camera.y);
        const mapWidth = this._mapData ? this._mapData.width : DEFAULT_MAP_WIDTH;
        const mapHeight = this._mapData ? this._mapData.height : DEFAULT_MAP_HEIGHT;
        const screenW = this.engine.designWidth;
        const screenH = this.engine.designHeight;

        // Determine visible tile range
        const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
        const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
        const endCol = Math.min(mapWidth - 1, Math.ceil((camX + screenW) / TILE_SIZE));
        const endRow = Math.min(mapHeight - 1, Math.ceil((camY + screenH) / TILE_SIZE));

        // Save context state for screen-space drawing
        ctx.save();

        // ── 1. Grid lines: semi-transparent white at every tile boundary ──
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        for (let x = startCol; x <= endCol + 1; x++) {
            const screenX = x * TILE_SIZE - camX;
            ctx.beginPath();
            ctx.moveTo(screenX, startRow * TILE_SIZE - camY);
            ctx.lineTo(screenX, (endRow + 1) * TILE_SIZE - camY);
            ctx.stroke();
        }
        for (let y = startRow; y <= endRow + 1; y++) {
            const screenY = y * TILE_SIZE - camY;
            ctx.beginPath();
            ctx.moveTo(startCol * TILE_SIZE - camX, screenY);
            ctx.lineTo((endCol + 1) * TILE_SIZE - camX, screenY);
            ctx.stroke();
        }

        // ── 2. Tile ID overlay + 3. Collision overlay ──
        if (this._mapData && this._mapData.layers && this._mapData.layers[0]) {
            const ground = this._mapData.layers[0];
            const collisionMap = this._mapData.collisionMap;
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            for (let y = startRow; y <= endRow; y++) {
                for (let x = startCol; x <= endCol; x++) {
                    const idx = y * mapWidth + x;
                    const screenX = x * TILE_SIZE - camX;
                    const screenY = y * TILE_SIZE - camY;

                    // Collision overlay: semi-transparent red tint on solid tiles
                    if (collisionMap && collisionMap[idx] === 1) {
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
                        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                    }

                    // Tile ID number in small red text
                    const tileId = ground[idx];
                    if (tileId !== undefined) {
                        ctx.fillStyle = '#ff3333';
                        ctx.fillText(String(tileId), screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
                    }
                }
            }
        }

        // ── 5. Transition zone highlights: semi-transparent blue rectangles ──
        ctx.fillStyle = 'rgba(50, 100, 255, 0.35)';
        ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
        ctx.lineWidth = 2;
        for (const t of this._transitions) {
            const sx = t.x - camX;
            const sy = t.y - camY;
            ctx.fillRect(sx, sy, t.w, t.h);
            ctx.strokeRect(sx, sy, t.w, t.h);
        }

        // ── 6. NPC markers: small green dots on NPC tiles ──
        ctx.fillStyle = '#00ff44';
        for (const npc of this._npcs) {
            const npcScreenX = npc.x - camX;
            const npcScreenY = npc.y - camY;
            ctx.beginPath();
            ctx.arc(npcScreenX, npcScreenY - 16, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // ── 7. Spawn point marker: yellow X on default spawn tile ──
        if (this._mapData && this._mapData.defaultSpawn) {
            const sp = this._mapData.defaultSpawn;
            const spX = sp.x * TILE_SIZE + TILE_SIZE / 2 - camX;
            const spY = sp.y * TILE_SIZE + TILE_SIZE / 2 - camY;
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            const armLen = TILE_SIZE / 3;
            ctx.beginPath();
            ctx.moveTo(spX - armLen, spY - armLen);
            ctx.lineTo(spX + armLen, spY + armLen);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(spX + armLen, spY - armLen);
            ctx.lineTo(spX - armLen, spY + armLen);
            ctx.stroke();
        }

        // ── 4. Coordinate display bar at bottom of screen ──
        const barHeight = 20;
        const barY = screenH - barHeight;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, barY, screenW, barHeight);

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        if (this._debugHoveredTile) {
            const tx = this._debugHoveredTile.x;
            const ty = this._debugHoveredTile.y;
            let tileId = '?';
            if (this._mapData && this._mapData.layers && this._mapData.layers[0] &&
                tx >= 0 && ty >= 0 && tx < mapWidth && ty < mapHeight) {
                tileId = this._mapData.layers[0][ty * mapWidth + tx];
            }
            ctx.fillText(`Tile: (${tx}, ${ty}) = ${tileId}`, 8, barY + barHeight / 2);
        } else {
            ctx.fillText('Tile: (-, -)', 8, barY + barHeight / 2);
        }

        // Also show player grid position on the right side of the bar
        const pgx = Math.floor(this._player.x / TILE_SIZE);
        const pgy = Math.floor(this._player.y / TILE_SIZE);
        ctx.textAlign = 'right';
        ctx.fillText(`Player: (${pgx}, ${pgy})  Region: ${this._currentRegion}`, screenW - 8, barY + barHeight / 2);

        // ── Tile placement rules panel (top-right corner) ──
        const panelLines = [
            'TILE RULES:',
            'Water(4) needs edge(5) border',
            'Trees(6,7) form borders only',
            'Doors(12) must face paths(1-3)',
            'Signs(15) next to paths(1-3)',
            'Lamps(17) on paths/intersections',
            'Fountain(18) on intersection(3)',
        ];
        const lineHeight = 13;
        const panelPadX = 6;
        const panelPadY = 4;
        const panelW = 210;
        const panelH = panelLines.length * lineHeight + panelPadY * 2;
        const panelX = screenW - panelW - 8;
        const panelY = 8;

        // Panel background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelW, panelH);

        // Panel text
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        for (let i = 0; i < panelLines.length; i++) {
            ctx.fillStyle = i === 0 ? '#ffcc44' : '#cccccc';
            ctx.fillText(panelLines[i], panelX + panelPadX, panelY + panelPadY + i * lineHeight);
        }

        // ── "DEBUG" label in top-left ──
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(8, 8, 58, 18);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('DEBUG', 14, 12);

        ctx.restore();
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
            case 0:  return '#2d5a1e'; // grass / stone floor
            case 1:  return '#8a7a5a'; // path horizontal
            case 2:  return '#8a7a5a'; // path vertical
            case 3:  return '#9a8a6a'; // path intersection
            case 4:  return '#2244aa'; // water / lava
            case 5:  return '#3366bb'; // water edge / lava edge
            case 6:  return '#1a3a0e'; // tree (dark)
            case 7:  return '#2a5a1e'; // tree (light)
            case 8:  return '#44882e'; // flowers/bush
            case 9:  return '#5a5a5a'; // rock/boulder
            case 10: return '#6a5040'; // house wall / cave wall
            case 11: return '#8a3030'; // house roof / cave wall top
            case 12: return '#5a3020'; // house door / archway
            case 13: return '#7a6a50'; // fence / pillar
            case 14: return '#6a5a3a'; // bridge
            case 15: return '#8a8a50'; // sign post / rune
            case 16: return '#aa8030'; // chest/crate
            case 17: return '#ccaa30'; // lamp post / torch
            case 18: return '#60a0c0'; // well/fountain / altar
            case 19: return '#3a3a3a'; // stairs/cave entrance
            default: return '#2d5a1e';
        }
    }

    _formatRegionName(regionId) {
        return regionId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
}

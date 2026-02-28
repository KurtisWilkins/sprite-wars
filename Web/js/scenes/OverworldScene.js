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
import { SpriteSheetGenerator } from '../core/SpriteSheetGenerator.js';

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
const PLAYER_SIZE = 28;          // Larger character fills more of the tile (classic RPG style)
const NPC_DRAW_HALFSIZE = 14;    // NPC render radius matches player proportions
const PLAYER_SPEED = 120;        // pixels per second
const NPC_INTERACT_DISTANCE = 40;
const ENCOUNTER_STEP_THRESHOLD = 30; // steps between encounter checks
const ENCOUNTER_CHANCE = 0.15; // 15% chance per check
const CAMERA_LERP_SPEED = 6.0;
const CAMERA_ZOOM = 2.0;        // 2x zoom for classic RPG look (Pokemon/Zelda/Dragon Quest)

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

        // Mobile controls handlers (stored for cleanup)
        this._mobileControlHandlers = [];
        this._mobileActiveTouches = new Set();

        // Throttled position logging
        this._lastPosLogTime = 0;

        // Generated walk-cycle sprite sheets from Units body types
        this._generatedSpriteSheets = [];
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    async init() {
        // Load player sprite (128x128, 4 cols x 4 rows, 32x32 per frame)
        try {
            this._player.spriteImg = await this.engine.assets.loadImage(
                'Sprites/Characters/Farmer1.png'
            );
        } catch (_) {
            this._player.spriteImg = null;
        }

        // Load Units body type sheet and generate walk-cycle sprite sheets with arms/legs
        try {
            const unitsSheet = await this.engine.assets.loadImage(
                'Sprites/Units/newbodytypes (1).png'
            );
            if (unitsSheet) {
                this._generatedSpriteSheets = SpriteSheetGenerator.generateFromSheet(unitsSheet);
                // Convert first generated sheet to player sprite (if no character sprite loaded)
                if (!this._player.spriteImg && this._generatedSpriteSheets.length > 0) {
                    this._player.spriteImg = await SpriteSheetGenerator.toImage(
                        this._generatedSpriteSheets[0]
                    );
                }
            }
        } catch (_) {
            this._generatedSpriteSheets = [];
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

        // Show mobile controls and wire up touch events
        this._setupMobileControls();

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

        // Hide mobile controls and remove touch event listeners
        this._teardownMobileControls();

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
        const tilesetPath = this._mapData.tileset || 'Sprites/Tiles/RogueAdventure/Overworld/RA_Overworld.png';
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
            spritePath: npcDef.spritePath || null,
            dialogue: npcDef.dialogue || ['...'],
            facing: npcDef.facing || 'down',
            type: npcDef.type || 'talk', // talk, shop, quest, heal
        }));

        // Load individual NPC sprites (128x128, 4 cols x 4 rows, 32x32 per frame)
        let generatedSheetIdx = 0;
        for (const npc of this._npcs) {
            npc.spriteSheet = null;
            npc.spriteFrameW = 32;
            npc.spriteFrameH = 32;
            npc.spriteCols = 4;
            npc.spriteRows = 4;
            if (npc.spritePath) {
                try {
                    npc.spriteSheet = await this.engine.assets.loadImage(npc.spritePath);
                } catch (_) {
                    npc.spriteSheet = null;
                }
            }
            // Fallback: assign a generated walk-cycle sheet from Units body types
            if (!npc.spriteSheet && this._generatedSpriteSheets.length > 0) {
                const sheetCanvas = this._generatedSpriteSheets[generatedSheetIdx % this._generatedSpriteSheets.length];
                try {
                    npc.spriteSheet = await SpriteSheetGenerator.toImage(sheetCanvas);
                } catch (_) { /* ignore */ }
                generatedSheetIdx++;
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
            case 'starter_route':
                return this._buildStarterRouteMap();
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
            tileset: 'Sprites/Tiles/RogueAdventure/Overworld/RA_Overworld.png',
            tilesetTileSize: 16,
            tileIndexMap: {
                0: 171, 1: 173, 2: 174, 3: 175, 4: 199, 5: 198,
                6: 103, 7: 104, 8: 136, 9: 36, 10: 117, 11: 85,
                12: 149, 13: 78, 14: 206, 15: 178, 16: 242, 17: 179,
                18: 143, 19: 7,
            },
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
    //  STARTER TOWN (Willowshade) — 48x48 large overworld village
    //  Districts: Residential NW, Lake NE, Healer W, Town Square center,
    //  Training E, Merchant SW, Lab SE. No encounters inside town.
    // ══════════════════════════════════════════════════════════════════════
    _buildStarterTownMap() {
        const w = 48;
        const h = 48;

        // Tile legend (Village_Forest combined tileset):
        // 0=grass 1=path 2=pathV 3=cross 4=pond 5=pondEdge
        // 6=treeDark 7=treeLight 8=flowers 9=rock 10=wall 11=roof
        // 12=door 13=fence 14=bridge 15=sign 16=chest 17=lamp
        // 18=fountain 19=stairs 20=roofPeak 21=wallWood 22=barrel
        // 23=tallGrass 24=mushroom 25=stump
        // 26=bigTreeTL 27=bigTreeTR 28=bigTreeBL 29=bigTreeBR
        // 30=crate 31=roofLeft 32=roofRight 33=wallWindow 34=stonePath

        const ground = new Array(w * h).fill(0);
        const S = (x, y, t) => { if (x >= 0 && x < w && y >= 0 && y < h) ground[y * w + x] = t; };
        const F = (x1, y1, x2, y2, t) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) S(x, y, t); };
        const hP = (x1, x2, y) => { for (let x = x1; x <= x2; x++) S(x, y, 1); };
        const vP = (x, y1, y2) => { for (let y = y1; y <= y2; y++) S(x, y, 2); };
        const X = (x, y) => S(x, y, 3);

        // Helper: place a 2x2 big tree (4 tile quadrants)
        const bigTree = (x, y) => { S(x, y, 26); S(x + 1, y, 27); S(x, y + 1, 28); S(x + 1, y + 1, 29); };

        // Helper: place a building (roof peak top, roof sides, wall with windows, stone foundation)
        const bldg = (bx, by, bw) => {
            // Row 0: roof peak — left edge, middle fills, right edge
            S(bx, by, 31);
            for (let i = 1; i < bw - 1; i++) S(bx + i, by, 20);
            S(bx + bw - 1, by, 32);
            // Row 1: roof body
            for (let i = 0; i < bw; i++) S(bx + i, by + 1, 11);
            // Row 2: walls with windows, door in center
            for (let i = 0; i < bw; i++) S(bx + i, by + 2, 33);
            const doorX = bx + Math.floor(bw / 2);
            S(doorX, by + 2, 12);
            // Row 3: stone foundation
            for (let i = 0; i < bw; i++) S(bx + i, by + 3, 34);
        };

        // ── FOREST BORDERS (3 thick, mixed big & small trees) ───────
        // Top border: rows 0-2
        for (let y = 0; y <= 2; y++) {
            for (let x = 0; x < w; x++) {
                S(x, y, (x + y) % 3 === 0 ? 7 : 6);
            }
        }
        // Bottom border: rows 45-47
        for (let y = h - 3; y < h; y++) {
            for (let x = 0; x < w; x++) {
                S(x, y, (x + y) % 3 === 0 ? 7 : 6);
            }
        }
        // Left border: cols 0-2
        for (let x = 0; x <= 2; x++) {
            for (let y = 0; y < h; y++) {
                S(x, y, (x + y) % 3 === 0 ? 7 : 6);
            }
        }
        // Right border: cols 45-47
        for (let x = w - 3; x < w; x++) {
            for (let y = 0; y < h; y++) {
                S(x, y, (x + y) % 3 === 0 ? 7 : 6);
            }
        }

        // Scatter big trees along the inner edge of the forest border
        bigTree(3, 0); bigTree(9, 0); bigTree(15, 0); bigTree(31, 0); bigTree(37, 0); bigTree(43, 0);
        bigTree(0, 5); bigTree(0, 11); bigTree(0, 17); bigTree(0, 29); bigTree(0, 35); bigTree(0, 41);
        bigTree(46, 5); bigTree(46, 11); bigTree(46, 17); bigTree(46, 29); bigTree(46, 35); bigTree(46, 41);
        bigTree(3, 46); bigTree(9, 46); bigTree(15, 46); bigTree(31, 46); bigTree(37, 46); bigTree(43, 46);

        // ── MAIN ROADS (dirt paths) ─────────────────────────────────
        // Central crossroads at (24,24)
        hP(3, 44, 24); hP(3, 44, 25);
        vP(24, 3, 44); vP(25, 3, 44);
        X(24, 24); X(25, 24); X(24, 25); X(25, 25);

        // Secondary grid roads
        hP(5, 43, 12); hP(5, 43, 36);
        vP(12, 5, 43); vP(36, 5, 43);

        // Intersections
        X(12, 12); X(24, 12); X(25, 12); X(36, 12);
        X(12, 24); X(12, 25); X(36, 24); X(36, 25);
        X(12, 36); X(24, 36); X(25, 36); X(36, 36);

        // ── RESIDENTIAL NW (cols 4-22, rows 4-11) ──────────────────
        // House 1: Mom's cottage (4 wide)
        bldg(5, 4, 4);
        S(4, 5, 8); S(4, 6, 8); S(9, 5, 8); S(9, 7, 8); // flower gardens
        vP(7, 8, 11); X(7, 12);

        // House 2: Neighbor cottage (4 wide)
        bldg(14, 4, 4);
        S(13, 5, 8); S(18, 6, 8);
        vP(16, 8, 11); X(16, 12);

        // House 3: Small hut (3 wide)
        bldg(20, 5, 3);
        S(19, 6, 23); S(23, 6, 23); // tall grass patches

        // Residential fence line
        F(3, 3, 3, 11, 13); F(3, 3, 10, 3, 13);

        // Lamps along paths
        S(7, 10, 17); S(16, 10, 17); S(10, 7, 17);

        // Stumps and mushrooms for decoration
        S(10, 9, 25); S(11, 5, 24); S(19, 8, 24);

        // ── GARDEN GROVE NE (cols 28-44, rows 3-14) ────────────────
        // Small pond in the middle
        F(33, 6, 40, 9, 4);
        F(32, 6, 32, 9, 5); F(41, 6, 41, 9, 5);
        F(33, 5, 40, 5, 5); F(33, 10, 40, 10, 5);
        S(32, 5, 5); S(41, 5, 5); S(32, 10, 5); S(41, 10, 5);

        // Small island in pond
        S(36, 7, 0); S(37, 7, 0); S(36, 8, 0); S(37, 8, 16); // chest on island

        // Bridge to island
        S(34, 10, 14); S(35, 10, 14);

        // Garden flowers around pond
        S(28, 5, 8); S(28, 9, 8); S(28, 6, 8); S(28, 8, 8);
        S(42, 6, 8); S(42, 8, 8); S(43, 7, 8); S(43, 9, 8);
        S(30, 4, 23); S(31, 4, 23); S(42, 4, 23); S(43, 4, 23);

        // Trees around grove
        bigTree(28, 3); bigTree(42, 3); bigTree(28, 11); bigTree(42, 11);

        // Path from main road to grove
        hP(26, 33, 8); X(36, 8);
        S(29, 8, 15); // sign post near grove

        // Decorative fence along south edge of grove
        F(28, 13, 44, 13, 13);

        // ── HEALER HUT W (cols 3-11, rows 16-23) ───────────────────
        // Healer building (4 wide)
        bldg(5, 16, 4);

        // Herb garden around healer
        F(4, 16, 4, 20, 8); F(9, 16, 9, 20, 8);
        S(5, 20, 8); S(8, 20, 8);
        S(4, 22, 24); S(5, 22, 24); S(6, 22, 24); // mushroom patch for potions

        // Path to main road
        vP(7, 20, 24); X(7, 24);
        hP(8, 11, 20); X(12, 20);

        // Rocks near healer
        S(4, 23, 9); S(5, 23, 9);
        S(6, 20, 17); // lamp near door

        // ── TOWN SQUARE (cols 17-31, rows 20-29) ───────────────────
        // Paved plaza
        F(18, 21, 30, 28, 1);

        // Central fountain (2x2 decorative)
        S(23, 24, 18); S(26, 24, 18);
        S(23, 25, 18); S(26, 25, 18);
        S(24, 24, 34); S(25, 24, 34); // stone center
        S(24, 25, 34); S(25, 25, 34);

        // Corner lamps
        S(18, 21, 17); S(30, 21, 17); S(18, 28, 17); S(30, 28, 17);
        S(21, 23, 17); S(28, 23, 17); S(21, 26, 17); S(28, 26, 17);

        // Signs at entrances
        S(17, 24, 15); S(31, 24, 15);

        // Flower beds in corners
        S(19, 22, 8); S(20, 22, 8); S(29, 22, 8); S(30, 22, 8);
        S(19, 27, 8); S(20, 27, 8); S(29, 27, 8); S(30, 27, 8);

        // Barrel and crate decorations
        S(19, 23, 22); S(30, 23, 30); S(19, 26, 30); S(30, 26, 22);

        // Road connections
        X(24, 21); X(25, 21); X(24, 28); X(25, 28);

        // ── TRAINING YARD E (cols 38-44, rows 18-28) ───────────────
        // Fenced training arena
        F(38, 18, 44, 18, 13); F(38, 28, 44, 28, 13);
        F(38, 18, 38, 28, 13); F(44, 18, 44, 28, 13);

        // Gate openings
        S(38, 23, 12); S(38, 24, 12);

        // Arena interior — clear ground
        F(39, 19, 43, 27, 0);

        // Training dummies (rocks) and equipment (chest)
        S(40, 20, 9); S(43, 20, 9); S(40, 26, 9); S(43, 26, 9);
        S(42, 23, 16); // reward chest
        S(41, 21, 25); S(42, 26, 25); // stumps as training targets

        // Path connection
        hP(37, 38, 23); hP(37, 38, 24);
        X(36, 23); X(36, 24);
        S(37, 22, 17); S(37, 25, 17); // lamps at gate

        // ── MERCHANT DISTRICT SW (cols 3-16, rows 30-42) ───────────
        // Shop 1: General store
        bldg(4, 30, 4);
        vP(6, 34, 36); X(6, 36);

        // Shop 2: Potion shop
        bldg(10, 30, 4);
        vP(12, 34, 36); // already has intersection

        // Market stalls (fence lines with chests = goods)
        F(4, 37, 16, 37, 13);
        F(4, 40, 16, 40, 13);
        F(5, 38, 7, 38, 16); F(9, 38, 11, 38, 16); F(13, 38, 15, 38, 16);
        F(4, 39, 16, 39, 1); // walkway between stalls

        // Blacksmith forge
        bldg(4, 41, 4);
        S(8, 42, 22); S(9, 42, 22); // barrels outside forge
        S(8, 43, 30); S(9, 43, 30); // crates outside forge

        // Connecting paths
        hP(5, 11, 34); hP(5, 11, 36);
        X(8, 34); X(12, 34); X(8, 36);

        // Lamps in market area
        S(3, 37, 17); S(3, 40, 17); S(17, 37, 17);

        // ── PROFESSOR LAB SE (cols 30-43, rows 30-40) ──────────────
        // Large lab building (8 wide, 2 floors)
        // Top floor: double roof
        S(32, 30, 31);
        for (let i = 33; i <= 38; i++) S(i, 30, 20);
        S(39, 30, 32);
        for (let i = 32; i <= 39; i++) S(i, 31, 11);

        // Bottom floor: walls + windows + door
        for (let i = 32; i <= 39; i++) S(i, 32, 33);
        S(35, 32, 12); S(36, 32, 12); // double doors
        for (let i = 32; i <= 39; i++) S(i, 33, 34); // stone foundation

        // Garden behind lab
        F(32, 35, 39, 35, 13);
        F(32, 38, 39, 38, 13);
        S(35, 35, 12); S(36, 35, 12); // garden gate
        F(33, 36, 38, 37, 8); // flower research garden
        S(35, 37, 18); // special specimen in center

        // Lab sign and lamps
        S(34, 34, 15);
        vP(35, 33, 36); vP(36, 33, 36);
        X(35, 36); X(36, 36);
        hP(26, 34, 34);
        S(31, 33, 17); S(40, 33, 17);

        // Crates and barrels near lab
        S(31, 31, 30); S(31, 32, 22);
        S(40, 31, 22); S(40, 32, 30);

        // ── EXITS ───────────────────────────────────────────────────
        // East exit to fire_temple
        S(45, 24, 19); S(45, 25, 19);
        S(44, 23, 15); S(44, 26, 9);
        // Clear path through border trees
        for (let x = 45; x < 48; x++) { S(x, 24, 0); S(x, 25, 0); S(x, 23, 0); S(x, 26, 0); }

        // South exit to starter_route
        for (let x = 21; x <= 28; x++) { S(x, h - 3, 0); S(x, h - 2, 0); S(x, h - 1, 0); }
        hP(22, 27, 44);
        S(20, 44, 15); // sign at south gate
        S(21, 43, 17); S(28, 43, 17); // lamps flanking gate
        // Gate pillars
        S(21, 44, 9); S(28, 44, 9);
        S(21, 45, 9); S(28, 45, 9);

        // ── SCATTERED DETAILS ───────────────────────────────────────
        // Extra trees along inner paths for atmosphere
        for (const [tx, ty] of [
            [3,14],[4,14],[3,15], [10,3],[11,3], [19,3],[20,3],
            [3,28],[3,29],[4,29], [44,14],[43,14],[44,15],
            [43,30],[44,30],[44,31], [3,44],[4,44],[3,43],
            [10,44],[11,44], [38,44],[39,44], [44,42],[44,43],
            [27,3],[26,3], [22,3],[23,3], [20,14],[21,14]
        ]) {
            if (ground[ty * w + tx] === 0) S(tx, ty, (tx + ty) % 2 ? 6 : 7);
        }

        // Scattered flower patches
        for (const [fx, fy] of [
            [16,8],[17,8],[16,10], [30,14],[31,14],[32,14],
            [15,30],[16,30],[17,30], [42,14],[42,15],
            [19,42],[20,42], [29,42],[30,42],
            [14,19],[15,19], [33,16],[34,16],[35,16],
            [40,14],[41,14]
        ]) {
            if (ground[fy * w + fx] === 0) S(fx, fy, 8);
        }

        // Scattered rocks
        for (const [rx, ry] of [
            [3,13],[44,13], [3,35],[44,35],
            [10,2],[38,2], [10,45],[38,45]
        ]) {
            if (ground[ry * w + rx] === 0) S(rx, ry, 9);
        }

        // Tall grass and mushroom clusters in open areas
        for (const [gx, gy] of [
            [13,8],[14,8],[13,9], [26,5],[27,5],[27,6],
            [37,16],[38,16], [14,27],[15,27],[15,28],
            [26,31],[27,31], [40,37],[41,37],[41,38]
        ]) {
            if (ground[gy * w + gx] === 0) S(gx, gy, 23);
        }

        for (const [mx, my] of [
            [13,10],[27,7],[15,29],[41,39],[26,32]
        ]) {
            if (ground[my * w + mx] === 0) S(mx, my, 24);
        }

        // Collidable tiles: trees, rocks, walls, roofs, fences, pond, stumps, big trees, barrels, crates
        const collision = ground.map(t =>
            [4, 5, 6, 7, 9, 10, 11, 13, 20, 21, 22, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(t) ? 1 : 0
        );

        return {
            id: 'starter_town', width: w, height: h,
            tileset: 'Sprites/Tiles/Village_Forest.png',
            tilesetTileSize: 16,
            tileIndexMap: {
                0: 1602,   // grass (forest ground tile)
                1: 49,     // path horizontal (village wooden floor)
                2: 49,     // path vertical (same path tile)
                3: 49,     // crossroad (same path tile)
                4: 1571,   // pond water (forest light green ground)
                5: 1603,   // pond edge (forest grass edge)
                6: 1152,   // dark tree (forest small tree)
                7: 1184,   // light tree (forest small tree variant)
                8: 1033,   // flowers (forest plant)
                9: 1618,   // rock (forest stone)
                10: 708,   // wall (village stone wall)
                11: 272,   // roof (village red planks)
                12: 876,   // door (village door tile)
                13: 1729,  // fence (forest wooden fence)
                14: 130,   // bridge (village wooden plank)
                15: 1714,  // sign (forest sign post)
                16: 1038,  // chest (forest red chest)
                17: 103,   // lamp/well (village well piece)
                18: 1035,  // fountain/specimen (forest yellow flower)
                19: 1620,  // stairs/exit marker (forest rock pile)
                20: 240,   // roof peak (village roof peak)
                21: 176,   // wood panel wall (village wood wall)
                22: 856,   // barrel (village barrel)
                23: 1024,  // tall grass (forest grass tuft)
                24: 1105,  // mushroom (forest mushroom)
                25: 1042,  // stump (forest tree stump)
                26: 1286,  // big tree top-left (forest large tree)
                27: 1287,  // big tree top-right
                28: 1318,  // big tree bottom-left
                29: 1319,  // big tree bottom-right
                30: 820,   // crate (village crate)
                31: 273,   // roof left edge (village roof left)
                32: 275,   // roof right edge (village roof right)
                33: 848,   // wall with window (village windowed wall)
                34: 711,   // stone path/foundation (village stone)
            },
            layers: [ground],
            collisionMap: collision,
            defaultSpawn: { x: 24, y: 24 },
            npcs: [
                { id:'elder', name:'Temple Elder', gridX:24, gridY:23, type:'talk', facing:'down', spritePath:'Sprites/Characters/Priest.png', dialogue:['Welcome to Willowshade, young trainer!','Our town has grown into a fine settlement.','Head east through the cave to reach the Blazecore Sanctum.','Or venture south through the gate to explore the Verdant Route.','Build your team and grow stronger before challenging the temple guardian.'] },
                { id:'healer', name:'Healer Mira', gridX:7, gridY:20, type:'heal', facing:'up', spritePath:'Sprites/Characters/Nun1.png', dialogue:['Oh dear, your Sprites look exhausted!','Rest here a moment... Let me tend to them.','There we go -- all healed up! Good luck out there!'] },
                { id:'shopkeeper', name:'Merchant Grin', gridX:8, gridY:35, type:'shop', facing:'down', spritePath:'Sprites/Characters/Merchant1.png', dialogue:['Looking to buy supplies? You have come to the right place!','I stock potions, crystals, and other essentials.','Come back any time -- my door is always open!'] },
                { id:'quest_guide', name:'Scout Renn', gridX:41, gridY:23, type:'quest', facing:'left', spritePath:'Sprites/Characters/Viking1.png', dialogue:['Blazecore Sanctum is through the cave to the east!','Fire-type Sprites lurk within. Their guardian is formidable.','I train here every day to prepare for the challenge.','If you bring me a Fire Gem, I can teach your Sprites fire resistance!'] },
                { id:'mom', name:'Mom', gridX:7, gridY:8, type:'talk', facing:'down', spritePath:'Sprites/Characters/NobleLady1.png', dialogue:['Be careful out there, dear!','Remember to heal your Sprites at Mira\'s hut if they get hurt.','I\'ll always be here if you need me.'] },
                { id:'father_byron', name:'Father Byron', gridX:35, gridY:35, type:'talk', facing:'up', spritePath:'Sprites/Characters/Priest.png', dialogue:['Blessings upon you, young trainer!','I have devoted my life to studying the bond between Sprites and their tamers.','There are 24 known Sprite races, each with three evolution stages.','That is 72 distinct forms to discover!','Head south to the Verdant Route for your first encounters.'] },
                { id:'fisherman', name:'Old Fisher Tom', gridX:31, gridY:8, type:'talk', facing:'right', spritePath:'Sprites/Characters/Farmer1.png', dialogue:['The pond here is home to some rare Water-type Sprites.','I have been fishing these waters for thirty years.','Legend says there is a treasure on the small island out there...'] },
                { id:'guard', name:'Gate Guard Hal', gridX:24, gridY:43, type:'talk', facing:'up', spritePath:'Sprites/Characters/Viking3.png', dialogue:['Beyond this gate lies the Verdant Route.','Wild Sprites roam freely out there. Make sure you are prepared!','Stock up on potions before heading out.'] },
                { id:'blacksmith', name:'Smith Doran', gridX:6, gridY:44, type:'shop', facing:'up', spritePath:'Sprites/Characters/MinerLeader.png', dialogue:['Need equipment? I forge the finest gear in Willowshade.','Bring me raw materials and I can craft something special.'] },
                { id:'child', name:'Little Pip', gridX:22, gridY:26, type:'talk', facing:'down', spritePath:'Sprites/Characters/Thief1.png', dialogue:['I am going to be the greatest Sprite tamer ever!','My dad says I am too young to leave town though...','Have you seen the big fountain? It is my favorite spot!'] },
            ],
            transitions: [
                { gridX:45, gridY:24, width:2, height:2, targetRegion:'fire_temple', targetSpawn:{x:1,y:12} },
                { gridX:22, gridY:46, width:6, height:2, targetRegion:'starter_route', targetSpawn:{x:16,y:1} },
            ],
            encounterZones: [],
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    //  STARTER ROUTE (Verdant Route) — 32x24 outdoor route with encounters
    //  Connects Willowshade (north) to future areas (south/east).
    //  Tall grass, winding paths, a few trainers, natural obstacles.
    // ══════════════════════════════════════════════════════════════════════
    _buildStarterRouteMap() {
        const w = 32; const h = 24;
        const ground = new Array(w * h).fill(0);
        const S = (x, y, t) => { if (x>=0&&x<w&&y>=0&&y<h) ground[y*w+x]=t; };
        const F = (x1,y1,x2,y2,t) => { for(let y=y1;y<=y2;y++) for(let x=x1;x<=x2;x++) S(x,y,t); };
        const hP = (x1,x2,y) => { for(let x=x1;x<=x2;x++) S(x,y,1); };
        const vP = (x,y1,y2) => { for(let y=y1;y<=y2;y++) S(x,y,2); };
        const X = (x,y) => S(x,y,3);

        // Borders
        for(let x=0;x<w;x++){S(x,0,(x%3===0)?7:6);S(x,h-1,(x%3===0)?7:6);}
        for(let y=0;y<h;y++){S(0,y,(y%3===0)?7:6);S(w-1,y,(y%3===0)?7:6);}

        // North entrance (from town)
        S(15,0,0); S(16,0,0); S(17,0,0); S(18,0,0);
        vP(16,0,5); vP(17,0,5);

        // Main path: north to south with bend
        vP(16,5,11); vP(17,5,11);
        X(16,11); X(17,11);
        hP(17,24,11); hP(17,24,12);
        X(24,11); X(24,12);
        vP(24,12,22); vP(25,12,22);

        // Tall grass patches (encounter zones) — use flowers(8) as tall grass
        F(3,3,8,8,8); F(20,3,27,8,8); F(3,14,10,20,8); F(26,16,29,21,8);

        // Trees as obstacles
        S(10,4,6); S(11,4,7); S(12,5,6); S(10,7,7);
        S(13,14,6); S(14,15,7); S(13,17,6);
        S(22,15,7); S(23,16,6); S(22,19,7);

        // Water feature (small pond)
        F(5,10,8,11,4); S(4,10,5); S(9,10,5); S(4,11,5); S(9,11,5);
        S(5,9,5); S(6,9,5); S(7,9,5); S(8,9,5);
        S(5,12,5); S(6,12,5); S(7,12,5); S(8,12,5);

        // Rocks
        S(15,8,9); S(28,10,9); S(2,15,9); S(12,20,9);

        // Signs
        S(15,3,15); S(23,14,15);

        // Lamps
        S(15,6,17); S(25,14,17);

        const collision = ground.map(t=>[4,5,6,7,9,10,11,13].includes(t)?1:0);

        return {
            id: 'starter_route', width: w, height: h,
            tileset: 'Sprites/Tiles/RogueAdventure/Overworld/RA_Overworld.png',
            tilesetTileSize: 16,
            tileIndexMap: { 0:171,1:173,2:174,3:175,4:199,5:198,6:103,7:104,8:136,9:36,10:117,11:85,12:149,13:78,14:206,15:178,16:242,17:179,18:143,19:7 },
            layers: [ground],
            collisionMap: collision,
            defaultSpawn: { x: 16, y: 1 },
            npcs: [
                { id:'ranger', name:'Ranger Kai', gridX:14, gridY:6, type:'talk', facing:'right', spritePath:'Sprites/Characters/Viking2.png', dialogue:['The tall grass here is full of wild Sprites!','Walk carefully and be ready for battle.','Stronger Sprites appear further along the route.'] },
                { id:'trainer1', name:'Bug Catcher Tim', gridX:6, gridY:5, type:'talk', facing:'down', spritePath:'Sprites/Characters/Farmer3.png', dialogue:['I love catching Bug-type Sprites!','They may be weak, but they evolve fast!'] },
            ],
            transitions: [
                { gridX:15, gridY:0, width:4, height:1, targetRegion:'starter_town', targetSpawn:{x:24,y:44} },
            ],
            encounterZones: [
                { x1:3, y1:3, x2:8, y2:8, encounterRate:0.15, minLevel:2, maxLevel:5 },
                { x1:20, y1:3, x2:27, y2:8, encounterRate:0.15, minLevel:2, maxLevel:5 },
                { x1:3, y1:14, x2:10, y2:20, encounterRate:0.18, minLevel:3, maxLevel:7 },
                { x1:26, y1:16, x2:29, y2:21, encounterRate:0.20, minLevel:4, maxLevel:8 },
            ],
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
            tileset: 'Sprites/Tiles/RogueAdventure/Cavern/RA_Cavern.png',
            tilesetTileSize: 16,
            // Map logical tile indices (0-19) to positions in RA_Cavern.png (32 cols)
            tileIndexMap: {
                0: 165,  // stone floor
                1: 165,  // path (horiz) - same as floor in cave
                2: 165,  // path (vert)
                3: 165,  // path intersection
                4: 74,   // lava pool
                5: 73,   // lava edge
                6: 32,   // stalagmite (tall)
                7: 33,   // stalagmite (small)
                8: 101,  // moss/rubble
                9: 38,   // rock/boulder
                10: 0,   // cave wall
                11: 1,   // cave wall (top)
                12: 99,  // archway/door
                13: 64,  // pillar
                14: 166, // bridge (over lava)
                15: 133, // rune stone
                16: 199, // chest/crate
                17: 103, // torch/brazier
                18: 131, // altar/shrine
                19: 67,  // stairs/exit
            },
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
                    spritePath: 'Sprites/Characters/Cultist1.png',
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
                    spritePath: 'Sprites/Characters/Nun3.png',
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
                    targetSpawn: { x: 44, y: 24 },
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

        // Apply camera zoom for classic RPG perspective
        ctx.save();
        ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);

        // Visible area is smaller due to zoom
        const viewW = this.engine.designWidth / CAMERA_ZOOM;
        const viewH = this.engine.designHeight / CAMERA_ZOOM;

        // Determine visible tile range (based on zoomed viewport)
        const camX = Math.round(this._camera.x);
        const camY = Math.round(this._camera.y);
        const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
        const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
        const endCol = Math.min(
            (this._mapData ? this._mapData.width : DEFAULT_MAP_WIDTH) - 1,
            Math.ceil((camX + viewW) / TILE_SIZE)
        );
        const endRow = Math.min(
            (this._mapData ? this._mapData.height : DEFAULT_MAP_HEIGHT) - 1,
            Math.ceil((camY + viewH) / TILE_SIZE)
        );

        const mapWidth = this._mapData ? this._mapData.width : DEFAULT_MAP_WIDTH;

        // Tileset config: source tile size (16 for Rogue Adventure) and tile index mapping
        const tsTileSize = (this._mapData && this._mapData.tilesetTileSize) || TILE_SIZE;
        const tileMap = this._mapData && this._mapData.tileIndexMap;

        // ── PASS 1: Draw floor tile (tile 0) at every visible position ──
        // This ensures no black gaps between decorative tiles
        const floorMapped = tileMap ? tileMap[0] : 0;
        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                const worldX = x * TILE_SIZE;
                const worldY = y * TILE_SIZE;

                if (this._tilesetImg && floorMapped !== undefined && floorMapped >= 0) {
                    renderer.drawTile(
                        this._tilesetImg, floorMapped, tsTileSize,
                        worldX, worldY, TILE_DRAW_SIZE
                    );
                } else {
                    // Fallback: grass/stone floor color (tile 0)
                    const floorColor = this._getTileFallbackColor(0);
                    renderer.drawRect(worldX, worldY, TILE_DRAW_SIZE, TILE_DRAW_SIZE, floorColor);
                }
            }
        }

        // ── PASS 2: Draw decorative/object tiles on top (skip tile 0 since it's the floor) ──
        if (this._mapData && this._mapData.layers) {
            for (const layer of this._mapData.layers) {
                for (let y = startRow; y <= endRow; y++) {
                    for (let x = startCol; x <= endCol; x++) {
                        const tileIndex = layer[y * mapWidth + x];
                        if (tileIndex === undefined || tileIndex === 0) continue; // Skip floor tiles

                        const worldX = x * TILE_SIZE;
                        const worldY = y * TILE_SIZE;

                        const mappedIndex = tileMap ? tileMap[tileIndex] : tileIndex;
                        if (this._tilesetImg && mappedIndex !== undefined && mappedIndex >= 0) {
                            renderer.drawTile(
                                this._tilesetImg, mappedIndex, tsTileSize,
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

        // Restore zoom before drawing UI overlays (text stays crisp at native resolution)
        ctx.restore();

        // ── UI Overlays (drawn in screen space, not zoomed) ──

        // Draw NPC names above sprites (screen space)
        for (const npc of this._npcs) {
            const screenX = (npc.x - camX) * CAMERA_ZOOM;
            const screenY = (npc.y - camY) * CAMERA_ZOOM;
            renderer.save();
            const camBackup = { ...renderer.camera };
            renderer.setCamera(0, 0);
            renderer.drawText(npc.name, screenX, screenY - NPC_DRAW_HALFSIZE * CAMERA_ZOOM - 6, {
                color: '#ffffff',
                font: '10px sans-serif',
                align: 'center',
                baseline: 'bottom',
                shadow: true,
            });
            renderer.setCamera(camBackup.x, camBackup.y);
            renderer.restore();
        }

        // Draw NPC interaction prompt if nearby
        const nearbyNpc = this._getNearbyNpc();
        if (nearbyNpc && !this._dialogueActive) {
            const screenX = (nearbyNpc.x - camX) * CAMERA_ZOOM;
            const screenY = (nearbyNpc.y - camY) * CAMERA_ZOOM;
            renderer.save();
            const camBackup = { ...renderer.camera };
            renderer.setCamera(0, 0);
            renderer.drawText('[Talk]', screenX, screenY - NPC_DRAW_HALFSIZE * CAMERA_ZOOM - 20, {
                color: '#e8a035',
                font: 'bold 11px sans-serif',
                align: 'center',
                baseline: 'bottom',
                shadow: true,
            });
            renderer.setCamera(camBackup.x, camBackup.y);
            renderer.restore();
        }

        // Region name overlay (top center)
        const regionDisplayName = this._formatRegionName(this._currentRegion);
        renderer.drawText(regionDisplayName, this.engine.designWidth / 2, 56, {
            color: 'rgba(255,255,255,0.5)',
            font: '12px sans-serif',
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
            // Convert screen coords to world coords accounting for camera zoom
            const worldX = input.pointerPos.x / CAMERA_ZOOM + this._camera.x;
            const worldY = input.pointerPos.y / CAMERA_ZOOM + this._camera.y;
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

        // Update debug hovered tile from pointer position (account for zoom)
        if (this._debugMode && input.pointerPos) {
            const worldX = input.pointerPos.x / CAMERA_ZOOM + this._camera.x;
            const worldY = input.pointerPos.y / CAMERA_ZOOM + this._camera.y;
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
        // Visible area is reduced by zoom factor (shows fewer tiles = more zoomed in)
        const viewW = this.engine.designWidth / CAMERA_ZOOM;
        const viewH = this.engine.designHeight / CAMERA_ZOOM;
        const halfW = viewW / 2;
        const halfH = viewH / 2;

        this._cameraTarget.x = this._player.x - halfW;
        this._cameraTarget.y = this._player.y - halfH;

        // Clamp camera to map bounds
        this._cameraTarget.x = Math.max(0, Math.min(this._mapPixelWidth - viewW, this._cameraTarget.x));
        this._cameraTarget.y = Math.max(0, Math.min(this._mapPixelHeight - viewH, this._cameraTarget.y));
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
        const viewW = screenW / CAMERA_ZOOM;
        const viewH = screenH / CAMERA_ZOOM;

        // Determine visible tile range (zoomed viewport)
        const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
        const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
        const endCol = Math.min(mapWidth - 1, Math.ceil((camX + viewW) / TILE_SIZE));
        const endRow = Math.min(mapHeight - 1, Math.ceil((camY + viewH) / TILE_SIZE));

        // Save context state and apply zoom for world-space debug elements
        ctx.save();
        ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);

        // ── 1. Grid lines: semi-transparent white at every tile boundary ──
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1 / CAMERA_ZOOM;
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

        // Restore zoom context before drawing screen-space UI elements
        ctx.restore();
        ctx.save();

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
            // Character sprite sheet: 128x128, 4 columns x 4 rows, 32x32 per frame
            // Row 0: down, Row 1: left, Row 2: right, Row 3: up
            // Use frame 0 for idle, animate through 4 frames for walking
            const dirRow = { down: 0, left: 1, right: 2, up: 3 };
            const row = dirRow[this._player.facing] || 0;
            const col = this._player.moving ? (this._player.animFrame % 4) : 0;
            const sw = this._player.spriteImg.width / 4;   // 32
            const sh = this._player.spriteImg.height / 4;  // 32
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
        if (npc.spriteSheet && npc.spriteSheet.complete) {
            // Individual character sprite sheet: 128x128, 4 cols x 4 rows, 32x32 per frame
            // Row 0: down, Row 1: left, Row 2: right, Row 3: up
            const dirRow = { down: 0, left: 1, right: 2, up: 3 };
            const row = dirRow[npc.facing] || 0;
            const col = 0; // idle frame
            const fw = npc.spriteFrameW;
            const fh = npc.spriteFrameH;
            renderer.drawSprite(
                npc.spriteSheet,
                col * fw, row * fh, fw, fh,
                npc.x - NPC_DRAW_HALFSIZE, npc.y - NPC_DRAW_HALFSIZE,
                NPC_DRAW_HALFSIZE * 2, NPC_DRAW_HALFSIZE * 2
            );
        } else if (npc.spriteImg && npc.spriteImg.complete) {
            renderer.drawImage(npc.spriteImg, npc.x - NPC_DRAW_HALFSIZE, npc.y - NPC_DRAW_HALFSIZE,
                NPC_DRAW_HALFSIZE * 2, NPC_DRAW_HALFSIZE * 2);
        } else {
            // Fallback: colored circle by type
            const colors = {
                talk: '#e8a035',
                heal: '#44cc44',
                shop: '#cc44cc',
                quest: '#4488ee',
            };
            const color = colors[npc.type] || '#ffffff';
            renderer.drawCircle(npc.x, npc.y, NPC_DRAW_HALFSIZE, color);
        }
        // NPC name labels drawn in screen space after zoom restore (see render method)
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
            case 20: return '#8a3030'; // roof peak
            case 21: return '#6a5040'; // wood panel wall
            case 22: return '#5a3a20'; // barrel
            case 23: return '#3a7a2e'; // tall grass
            case 24: return '#aa3030'; // mushroom
            case 25: return '#5a4a30'; // stump
            case 26: return '#1a4a0e'; // big tree top-left
            case 27: return '#1a4a0e'; // big tree top-right
            case 28: return '#3a2a1a'; // big tree bottom-left
            case 29: return '#3a2a1a'; // big tree bottom-right
            case 30: return '#6a5030'; // crate
            case 31: return '#8a3030'; // roof left edge
            case 32: return '#8a3030'; // roof right edge
            case 33: return '#6a5040'; // wall with window
            case 34: return '#7a7a7a'; // stone path/foundation
            default: return '#2d5a1e';
        }
    }

    _formatRegionName(regionId) {
        return regionId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // ── Mobile Controls ───────────────────────────────────────────────────

    _setupMobileControls() {
        const mobileControls = document.getElementById('mobile-controls');
        if (!mobileControls) return;

        // Show mobile controls
        mobileControls.classList.remove('hidden');

        // D-pad touch handling
        const dpadBtns = document.querySelectorAll('.dpad-btn[data-dir]');
        const dirMap = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
        this._mobileActiveTouches = new Set();

        const updateDpad = () => {
            let dx = 0, dy = 0;
            for (const dir of this._mobileActiveTouches) {
                dx += dirMap[dir].x;
                dy += dirMap[dir].y;
            }
            this.engine.input.setVirtualDpadDirection(dx, dy);
        };

        for (const btn of dpadBtns) {
            const onTouchStart = (e) => {
                e.preventDefault();
                this._mobileActiveTouches.add(btn.dataset.dir);
                btn.style.background = 'rgba(255, 255, 255, 0.3)';
                updateDpad();
            };
            const onTouchEnd = (e) => {
                e.preventDefault();
                this._mobileActiveTouches.delete(btn.dataset.dir);
                btn.style.background = '';
                updateDpad();
            };
            const onTouchCancel = (e) => {
                this._mobileActiveTouches.delete(btn.dataset.dir);
                btn.style.background = '';
                updateDpad();
            };

            btn.addEventListener('touchstart', onTouchStart, { passive: false });
            btn.addEventListener('touchend', onTouchEnd, { passive: false });
            btn.addEventListener('touchcancel', onTouchCancel);

            // Also support mouse events for desktop testing
            const onMouseDown = (e) => {
                e.preventDefault();
                this._mobileActiveTouches.add(btn.dataset.dir);
                btn.style.background = 'rgba(255, 255, 255, 0.3)';
                updateDpad();
            };
            const onMouseUp = (e) => {
                this._mobileActiveTouches.delete(btn.dataset.dir);
                btn.style.background = '';
                updateDpad();
            };
            const onMouseLeave = (e) => {
                this._mobileActiveTouches.delete(btn.dataset.dir);
                btn.style.background = '';
                updateDpad();
            };

            btn.addEventListener('mousedown', onMouseDown);
            btn.addEventListener('mouseup', onMouseUp);
            btn.addEventListener('mouseleave', onMouseLeave);

            // Store handlers for cleanup
            this._mobileControlHandlers.push(
                { el: btn, event: 'touchstart', handler: onTouchStart },
                { el: btn, event: 'touchend', handler: onTouchEnd },
                { el: btn, event: 'touchcancel', handler: onTouchCancel },
                { el: btn, event: 'mousedown', handler: onMouseDown },
                { el: btn, event: 'mouseup', handler: onMouseUp },
                { el: btn, event: 'mouseleave', handler: onMouseLeave }
            );
        }

        // Interact button ("A") touch handling
        const interactBtn = document.getElementById('mobile-interact-btn');
        if (interactBtn) {
            const onInteractTouchStart = (e) => {
                e.preventDefault();
                interactBtn.style.background = 'rgba(232, 160, 53, 0.5)';
                interactBtn.style.borderColor = 'rgba(232, 160, 53, 0.8)';
                this.engine.input.triggerVirtualButton('Space');
            };
            const onInteractTouchEnd = (e) => {
                e.preventDefault();
                interactBtn.style.background = '';
                interactBtn.style.borderColor = '';
            };
            const onInteractClick = (e) => {
                e.preventDefault();
                this.engine.input.triggerVirtualButton('Space');
            };

            interactBtn.addEventListener('touchstart', onInteractTouchStart, { passive: false });
            interactBtn.addEventListener('touchend', onInteractTouchEnd, { passive: false });
            interactBtn.addEventListener('click', onInteractClick);

            this._mobileControlHandlers.push(
                { el: interactBtn, event: 'touchstart', handler: onInteractTouchStart },
                { el: interactBtn, event: 'touchend', handler: onInteractTouchEnd },
                { el: interactBtn, event: 'click', handler: onInteractClick }
            );
        }
    }

    _teardownMobileControls() {
        // Hide mobile controls
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
            mobileControls.classList.add('hidden');
        }

        // Remove all stored event listeners
        for (const { el, event, handler } of this._mobileControlHandlers) {
            el.removeEventListener(event, handler);
        }
        this._mobileControlHandlers = [];

        // Reset the virtual d-pad direction
        this._mobileActiveTouches = new Set();
        if (this.engine && this.engine.input) {
            this.engine.input.setVirtualDpadDirection(0, 0);
        }
    }
}

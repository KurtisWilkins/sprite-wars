/**
 * OverworldScene - Adventure Quest-style overworld with player, NPCs, encounters.
 * Renders all world visuals procedurally on Canvas using AQ-style cel-shaded tiles
 * with bold black outlines, hard-edged two-tone shading, and detailed decorations.
 * Handles player movement, NPC interaction, building entry/exit, random/scripted
 * encounters, and area transitions.
 *
 * Art style: Adventure Quest / Flash-RPG cartoon style — bold black outlines,
 * vibrant saturated fantasy palette, cel-shaded with hard-edged two-tone shading,
 * detailed props and buildings, clean digital cartoon illustration.
 */
import { Scene } from '../core/SceneManager.js';
import { eventBus, GameEvents } from '../core/EventBus.js';
import { SpriteSheetGenerator } from '../core/SpriteSheetGenerator.js';
import { HumanoidSpriteSystem } from '../systems/rendering/HumanoidSpriteSystem.js';
import { getTrainer } from '../data/TrainerData.js';
import { ENCOUNTER_TABLES } from '../data/EncounterData.js';
import { GlossaryScreen } from '../systems/ui/GlossaryScreen.js';

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
const TILE_RENDER_SIZE = 128;   // High-quality off-screen render resolution per tile
const TILE_CACHE_LIMIT = 1024;  // Max cached tile canvases (LRU eviction)
const PLAYER_SIZE = 34;          // AQ-style characters with heroic proportions
const NPC_DRAW_HALFSIZE = 17;    // NPC render radius matches AQ player proportions
const PLAYER_SPEED = 120;        // pixels per second
const NPC_INTERACT_DISTANCE = 40;
const ENCOUNTER_STEP_THRESHOLD = 10; // steps between encounter checks
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

// ── AQ-style cel-shaded tile color palette ───────────────────────────────
// Adventure Quest / Flash-RPG cartoon style — bold outlines, vibrant saturated
// fantasy colors, hard-edged two-tone shading. Each tile has base, shadow,
// highlight, and name for procedural rendering. No external tileset images.
const TILE_COLORS = {
    0:  { base: '#4db84d', shadow: '#3a9a3a', highlight: '#66d466', name: 'grass' },
    1:  { base: '#c8a858', shadow: '#a88e40', highlight: '#e0c070', name: 'path' },
    2:  { base: '#c8a858', shadow: '#a88e40', highlight: '#e0c070', name: 'path_v' },
    3:  { base: '#d4b868', shadow: '#b89848', highlight: '#ecd080', name: 'crossroad' },
    4:  { base: '#3878cc', shadow: '#2860b0', highlight: '#4890e8', name: 'water' },
    5:  { base: '#4888d8', shadow: '#3870c0', highlight: '#58a0f0', name: 'water_edge' },
    6:  { base: '#1a5c1a', shadow: '#104810', highlight: '#287428', name: 'tree_dark' },
    7:  { base: '#2a7030', shadow: '#1e5c22', highlight: '#3a8a3a', name: 'tree_light' },
    8:  { base: '#4db84d', shadow: '#3a9a3a', highlight: '#66d466', name: 'flowers' },
    9:  { base: '#787888', shadow: '#606070', highlight: '#9090a0', name: 'stone' },
    10: { base: '#5c4030', shadow: '#483020', highlight: '#705240', name: 'wall' },
    11: { base: '#c03030', shadow: '#a02020', highlight: '#e04848', name: 'roof' },
    12: { base: '#5c3418', shadow: '#482810', highlight: '#704428', name: 'door' },
    13: { base: '#7a6848', shadow: '#645434', highlight: '#907c5c', name: 'fence' },
    14: { base: '#7a6040', shadow: '#644c2c', highlight: '#907454', name: 'bridge' },
    15: { base: '#909050', shadow: '#787838', highlight: '#a8a868', name: 'sign' },
    16: { base: '#cc8820', shadow: '#aa7010', highlight: '#e8a038', name: 'chest' },
    17: { base: '#e8b030', shadow: '#d09820', highlight: '#f8c848', name: 'lamp' },
    18: { base: '#58a0c8', shadow: '#4088b0', highlight: '#70b8e0', name: 'fountain' },
    19: { base: '#484848', shadow: '#343434', highlight: '#5c5c5c', name: 'stairs' },
    20: { base: '#c03030', shadow: '#a02020', highlight: '#e04848', name: 'roof_peak' },
    21: { base: '#5c4030', shadow: '#483020', highlight: '#705240', name: 'wall_wood' },
    22: { base: '#5c3818', shadow: '#482c10', highlight: '#704828', name: 'barrel' },
    23: { base: '#3a9a2a', shadow: '#2a821e', highlight: '#4ab23a', name: 'tall_grass' },
    24: { base: '#cc3030', shadow: '#b02020', highlight: '#e84848', name: 'mushroom' },
    25: { base: '#5c4828', shadow: '#48381c', highlight: '#705838', name: 'stump' },
    26: { base: '#145014', shadow: '#0c400c', highlight: '#1c641c', name: 'big_tree_tl' },
    27: { base: '#145014', shadow: '#0c400c', highlight: '#1c641c', name: 'big_tree_tr' },
    28: { base: '#3c2c18', shadow: '#2c2010', highlight: '#4c3c28', name: 'big_tree_bl' },
    29: { base: '#3c2c18', shadow: '#2c2010', highlight: '#4c3c28', name: 'big_tree_br' },
    30: { base: '#6c4c28', shadow: '#583c1c', highlight: '#805c38', name: 'crate' },
    31: { base: '#c03030', shadow: '#a02020', highlight: '#e04848', name: 'roof_left' },
    32: { base: '#c03030', shadow: '#a02020', highlight: '#e04848', name: 'roof_right' },
    33: { base: '#5c4030', shadow: '#483020', highlight: '#705240', name: 'wall_window' },
    34: { base: '#787888', shadow: '#606070', highlight: '#9090a0', name: 'stone_path' },
    // ── New AQ-style building tiles ───
    35: { base: '#584838', shadow: '#443428', highlight: '#6c5c48', name: 'inn_wall' },
    36: { base: '#2848a0', shadow: '#1c3880', highlight: '#3858c0', name: 'shop_awning' },
    37: { base: '#b07828', shadow: '#905c18', highlight: '#c89038', name: 'tavern_sign' },
    38: { base: '#483040', shadow: '#382030', highlight: '#584050', name: 'magic_wall' },
    39: { base: '#6048a0', shadow: '#483880', highlight: '#7858c0', name: 'magic_roof' },
    40: { base: '#c8b898', shadow: '#b0a080', highlight: '#e0d0b0', name: 'wood_floor' },
    41: { base: '#483838', shadow: '#342828', highlight: '#5c4c4c', name: 'fireplace' },
    42: { base: '#a08858', shadow: '#887040', highlight: '#b8a070', name: 'counter' },
    43: { base: '#384890', shadow: '#283878', highlight: '#4858a8', name: 'bookshelf' },
    44: { base: '#907048', shadow: '#785830', highlight: '#a88860', name: 'table' },
    45: { base: '#686070', shadow: '#504858', highlight: '#807888', name: 'anvil' },
    46: { base: '#c86830', shadow: '#a85020', highlight: '#e88040', name: 'forge_fire' },
    47: { base: '#e8d8c0', shadow: '#d0c0a8', highlight: '#f8e8d8', name: 'carpet' },
    48: { base: '#58a868', shadow: '#489050', highlight: '#68c080', name: 'potion_shelf' },
    49: { base: '#785838', shadow: '#604020', highlight: '#906850', name: 'bed' },
};

// Default fallback for unknown tile indices
const DEFAULT_TILE_COLOR = { base: '#5cb85c', shadow: '#4a9a4a', highlight: '#6ed46e', name: 'unknown' };

// ── Default region map data (used when no external map loaded) ─────────────
const DEFAULT_MAP_WIDTH = 24;
const DEFAULT_MAP_HEIGHT = 24;

export class OverworldScene extends Scene {
    constructor(engine) {
        super(engine);

        // Region / map state
        this._currentRegion = 'starter_town';
        this._mapData = null;      // { width, height, layers[], collisionMap[], npcs[], transitions[], encounterZones[] }

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
        this._transitionPending = false;

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

        // Tile rendering cache — 128x128 off-screen canvases for high-quality tiles
        this._tileCache = new Map();
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    async init() {
        // Load player sprite (256x256, 4 cols x 4 rows, 64x64 per frame)
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

        // Preload PNG race sprites for HumanoidSpriteSystem rendering.
        await HumanoidSpriteSystem.preloadAssets(this.engine.assets);

        // Pre-calculate player sprite frame dimensions (same logic as NPCs).
        if (this._player.spriteImg) {
            this._player.spriteRows = 4;
            this._player.spriteFrameH = this._player.spriteImg.height / 4;
            this._player.spriteFrameW = this._player.spriteFrameH; // square frames
            this._player.spriteCols = Math.floor(this._player.spriteImg.width / this._player.spriteFrameW);
        }

        this.initialized = true;
    }

    enter(data) {
        this._transitionPending = false;

        // Pull game data from GameManager first (canonical source), fall back to passed data
        const gm = this.engine.gameManager;
        this._gameData = (gm && gm.playerData) ? gm.playerData : (data.gameData || data.saveData || {});
        if (!this._gameData.defeatedTrainers) this._gameData.defeatedTrainers = [];

        // Record trainer victory if returning from a won trainer battle
        if (data.battleResult === 'player_win' && data.returnData?.trainerId) {
            if (!this._gameData.defeatedTrainers.includes(data.returnData.trainerId)) {
                this._gameData.defeatedTrainers.push(data.returnData.trainerId);
            }
        }

        // Apply battle rewards if present
        if (data.rewards) {
            if (data.rewards.gold) {
                this._gameData.gold = (this._gameData.gold || 0) + data.rewards.gold;
            }
            if (data.rewards.xp && this._gameData.team) {
                for (const member of this._gameData.team) {
                    member.xp = (member.xp || 0) + data.rewards.xp;
                }
            }
        }

        // Determine starting region
        this._currentRegion = this._gameData.currentAreaId || this._gameData.currentRegion || 'starter_town';

        // Load the region (prefer explicit spawnPoint, then extract from returnData)
        const spawnPoint = data.spawnPoint || (data.returnData && data.returnData.spawnPoint) || null;
        this._loadRegion(this._currentRegion, spawnPoint).then(() => {
            // Restore saved player position when returning via popScene (e.g. Bag, SpriteCenter)
            // with no explicit spawnPoint. This overrides the default spawn set by _loadRegion.
            if (!spawnPoint && this._savedPlayerPos) {
                this._player.x = this._savedPlayerPos.x;
                this._player.y = this._savedPlayerPos.y;
                this._updateCameraTarget();
                this._camera.x = this._cameraTarget.x;
                this._camera.y = this._cameraTarget.y;
                this._savedPlayerPos = null;
            }
        });

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
            [GameEvents.NPC_INTERACTED, 'info', data => `NPC interaction: ${data?.npcName || data?.name || 'unknown'}`],
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
        // Save current player pixel position for popScene returns (Bag, SpriteCenter, etc.)
        if (this._player) {
            this._savedPlayerPos = { x: this._player.x, y: this._player.y };
        }

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

        // Hide screen panel (pause menu / settings)
        const screenPanel = document.getElementById('screen-panel');
        if (screenPanel) { screenPanel.classList.add('hidden'); screenPanel.innerHTML = ''; }

        // Hide admin log panel
        this._adminLog.hide();

        // Hide mobile controls and remove touch event listeners
        this._teardownMobileControls();

        eventBus.emit(GameEvents.SCREEN_CLOSED, 'overworld');
    }

    // ── Region Loading ─────────────────────────────────────────────────────

    async _loadRegion(regionId, spawnPoint) {
        this._currentRegion = regionId;

        // Clear tile cache for new region (tiles change per region)
        this._tileCache.clear();

        // Attempt to load region data from JSON, fall back to procedural
        let regionData = await this.engine.assets.loadJSON(`data/regions/${regionId}.json`);
        if (!regionData) {
            regionData = this._generateFallbackMap(regionId);
        }

        this._mapData = regionData;
        this._mapPixelWidth = (this._mapData.width || DEFAULT_MAP_WIDTH) * TILE_SIZE;
        this._mapPixelHeight = (this._mapData.height || DEFAULT_MAP_HEIGHT) * TILE_SIZE;

        // Set up NPCs
        // Deterministic race assignments for NPC types so they render via
        // HumanoidSpriteSystem (cel-shaded) instead of pixel-art sprite sheets.
        const NPC_RACE_BY_TYPE = {
            talk:    [12, 6, 10, 15, 18, 20, 22],  // Human, Cat Man, Ghost, Monkey Man, Rat Man, Shark Man, Turtle Man
            heal:    [9, 17, 24],                    // Fish Man, Ork, Zombie
            shop:    [8, 14, 11],                    // Ent, Minotaur, Golem
            quest:   [3, 5, 7],                      // Bird Man, Devil, Elf
            trainer: [1, 2, 4, 13, 16, 19, 21, 23], // Bug Man, Bear Man, Demon, Lizard Man, Mummy, Robot, Skeleton, Wolf Man
        };
        const npcTypeCounters = {};
        this._npcs = (this._mapData.npcs || []).map((npcDef, idx) => {
            const npcType = npcDef.type || 'talk';
            npcTypeCounters[npcType] = (npcTypeCounters[npcType] || 0);
            const racePool = NPC_RACE_BY_TYPE[npcType] || NPC_RACE_BY_TYPE.talk;
            const raceId = npcDef.raceId || racePool[npcTypeCounters[npcType] % racePool.length];
            npcTypeCounters[npcType]++;
            return {
                id: npcDef.id || `npc_${idx}`,
                name: npcDef.name || 'NPC',
                x: (npcDef.gridX ?? 5) * TILE_SIZE + TILE_SIZE / 2,
                y: (npcDef.gridY ?? 5) * TILE_SIZE + TILE_SIZE / 2,
                spriteImg: null,
                spritePath: npcDef.spritePath || null,
                dialogue: npcDef.dialogue || ['...'],
                facing: npcDef.facing || 'down',
                type: npcType,
                raceId: raceId,
                stage: npcDef.stage || (npcType === 'trainer' ? 2 : 1),
                equipment: npcDef.equipment || {},
                visionRange: npcDef.visionRange || 0,
                visionDirection: npcDef.visionDirection || null,
            };
        });

        // Load individual NPC sprites and auto-detect frame dimensions.
        // Sprite sheets use 4 rows (down/left/right/up) with square frames.
        // Supports various sheet sizes: 128x128 (32x32), 256x256 (64x64), 512x256 (64x64), etc.
        let generatedSheetIdx = 0;
        for (const npc of this._npcs) {
            npc.spriteSheet = null;
            npc.spriteFrameW = 64;
            npc.spriteFrameH = 64;
            npc.spriteCols = 4;
            npc.spriteRows = 4;
            // Skip sprite sheet loading for NPCs with raceId — they use HumanoidSpriteSystem
            if (npc.raceId) continue;
            if (npc.spritePath) {
                try {
                    npc.spriteSheet = await this.engine.assets.loadImage(npc.spritePath);
                    if (npc.spriteSheet) {
                        // Auto-detect frame size: 4 rows, square frames
                        npc.spriteFrameH = npc.spriteSheet.height / 4;
                        npc.spriteFrameW = npc.spriteFrameH;
                        npc.spriteCols = Math.floor(npc.spriteSheet.width / npc.spriteFrameW);
                        npc.spriteRows = 4;
                    }
                } catch (_) {
                    npc.spriteSheet = null;
                }
            }
            // Fallback: assign a generated walk-cycle sheet from Units body types
            if (!npc.spriteSheet && this._generatedSpriteSheets.length > 0) {
                const sheetCanvas = this._generatedSpriteSheets[generatedSheetIdx % this._generatedSpriteSheets.length];
                try {
                    npc.spriteSheet = await SpriteSheetGenerator.toImage(sheetCanvas);
                    if (npc.spriteSheet) {
                        npc.spriteFrameH = npc.spriteSheet.height / 4;
                        npc.spriteFrameW = npc.spriteFrameH;
                        npc.spriteCols = Math.floor(npc.spriteSheet.width / npc.spriteFrameW);
                        npc.spriteRows = 4;
                    }
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
            // ── Building interiors ──
            case 'healer_hut':
                return this._buildHealerHutInterior();
            case 'general_store':
                return this._buildGeneralStoreInterior();
            case 'potion_shop':
                return this._buildPotionShopInterior();
            case 'blacksmith_forge':
                return this._buildBlacksmithInterior();
            case 'professor_lab':
                return this._buildProfessorLabInterior();
            case 'mom_house':
                return this._buildMomHouseInterior();
            case 'tavern_inn':
                return this._buildTavernInnInterior();
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

        // Tile legend (procedural cel-shaded tile types):
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

        // Collidable tiles: trees, rocks, walls, roofs, fences, pond, stumps, big trees, barrels, crates, signs, chests, lamps, fountains
        const collision = ground.map(t =>
            [4, 5, 6, 7, 9, 10, 11, 13, 15, 16, 17, 18, 20, 21, 22, 25, 26, 27, 28, 29, 30, 31, 32, 33].includes(t) ? 1 : 0
        );

        return {
            id: 'starter_town', width: w, height: h,
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
                { id:'trainer_pip', name:'Youngster Pip', gridX:22, gridY:40, type:'trainer', facing:'up', spritePath:'Sprites/Characters/RedBand_Kai/RedBand_Kai.png', dialogue:['I just got my first Sprite yesterday!','Wanna see how strong it is? Battle me!'], visionRange:4, visionDirection:{x:0,y:-1} },
                { id:'trainer_fern', name:'Lass Fern', gridX:28, gridY:10, type:'trainer', facing:'left', spritePath:'Sprites/Characters/GoldenBraid_Celeste/GoldenBraid_Celeste.png', dialogue:['The Sprites near this pond are so graceful...','Oh! A challenger? My Water-types won\'t go easy on you!'], visionRange:3, visionDirection:{x:-1,y:0} },
            ],
            transitions: [
                { gridX:45, gridY:24, width:2, height:2, targetRegion:'fire_temple', targetSpawn:{x:1,y:12} },
                { gridX:22, gridY:46, width:6, height:2, targetRegion:'starter_route', targetSpawn:{x:16,y:1} },
                // ── Enterable building doors (door tile at bldg row+2) ──
                { gridX:7, gridY:6, width:1, height:1, targetRegion:'mom_house', targetSpawn:{x:5,y:8} },
                { gridX:7, gridY:18, width:1, height:1, targetRegion:'healer_hut', targetSpawn:{x:4,y:7} },
                { gridX:6, gridY:32, width:1, height:1, targetRegion:'general_store', targetSpawn:{x:5,y:8} },
                { gridX:12, gridY:32, width:1, height:1, targetRegion:'potion_shop', targetSpawn:{x:4,y:7} },
                { gridX:6, gridY:43, width:1, height:1, targetRegion:'blacksmith_forge', targetSpawn:{x:4,y:7} },
                { gridX:35, gridY:32, width:2, height:1, targetRegion:'professor_lab', targetSpawn:{x:6,y:10} },
                { gridX:16, gridY:6, width:1, height:1, targetRegion:'tavern_inn', targetSpawn:{x:5,y:9} },
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

        const collision = ground.map(t=>[4,5,6,7,9,10,11,13,15,16,17].includes(t)?1:0);

        return {
            id: 'starter_route', width: w, height: h,
            layers: [ground],
            collisionMap: collision,
            defaultSpawn: { x: 16, y: 1 },
            npcs: [
                { id:'trainer_kai', name:'Javelin Kai', gridX:14, gridY:6, type:'trainer', facing:'right', spritePath:'Sprites/Characters/Viking2.png', dialogue:['Hold it right there, rookie!','The wilds ahead are dangerous. Let me test if you are ready!'], visionRange:5, visionDirection:{x:-1,y:0} },
                { id:'trainer_tim', name:'Bug Catcher Tim', gridX:6, gridY:5, type:'trainer', facing:'down', spritePath:'Sprites/Characters/Farmer3.png', dialogue:['Hey! You look like a new trainer!','Let me show you what my Bug-type Sprites can do!'], visionRange:4, visionDirection:{x:0,y:1} },
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

        // Cave tile type indices (procedural cel-shaded dungeon tiles):
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

        // Collision: walls(10,11), lava(4), lava-edge(5), stalagmites(6,7), rocks(9), pillars(13), chests(16), torches(17), altars(18)
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
                case 16: // chest/crate
                case 17: // torch/brazier
                case 18: // altar/shrine
                    return 1;
                default:
                    return 0;
            }
        });

        return {
            id: 'fire_temple',
            width: w,
            height: h,
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

    // ══════════════════════════════════════════════════════════════════════
    //  BUILDING INTERIORS — AQ-style enterable buildings with NPCs
    //  Each interior is a small map (10-14 tiles) with wood floors, furniture,
    //  and NPCs the player can talk to. Exit door transitions back to town.
    // ══════════════════════════════════════════════════════════════════════

    /** Interior helper: builds a rectangular room with walls, floor, and exit door */
    _buildInterior(w, h, opts = {}) {
        const ground = new Array(w * h).fill(40); // wood floor
        const S = (x, y, t) => { if (x >= 0 && x < w && y >= 0 && y < h) ground[y * w + x] = t; };
        const F = (x1, y1, x2, y2, t) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) S(x, y, t); };

        // Walls around edges
        for (let x = 0; x < w; x++) { S(x, 0, 10); S(x, h - 1, 10); }
        for (let y = 0; y < h; y++) { S(0, y, 10); S(w - 1, y, 10); }

        // Exit door at bottom center
        const doorX = opts.doorX ?? Math.floor(w / 2);
        const doorY = h - 1;
        S(doorX, doorY, 12);

        // Carpet runner to door
        if (opts.carpet !== false) {
            for (let y = doorY - 1; y >= Math.max(1, doorY - 3); y--) S(doorX, y, 47);
        }

        const collision = ground.map(t =>
            [10, 41, 42, 43, 44, 45, 46, 48, 49].includes(t) ? 1 : 0
        );
        // Door is walkable
        collision[doorY * w + doorX] = 0;

        return { ground, collision, S, F, w, h, doorX, doorY };
    }

    // ── Mom's House Interior ──────────────────────────────────────────────
    _buildMomHouseInterior() {
        const { ground, collision, S, F, w, h } = this._buildInterior(10, 10, { doorX: 5 });

        // Furniture
        S(1, 1, 41);  // Fireplace
        S(2, 1, 43);  // Bookshelf
        S(3, 1, 43);  // Bookshelf
        S(7, 1, 49);  // Bed
        S(8, 1, 49);  // Bed
        S(1, 4, 44);  // Kitchen table
        S(2, 4, 44);  // Kitchen table
        S(7, 4, 42);  // Counter
        S(8, 4, 42);  // Counter
        F(4, 5, 6, 6, 47); // Carpet area

        // Mark furniture as collidable
        for (let i = 0; i < ground.length; i++) {
            if ([41, 42, 43, 44, 49].includes(ground[i])) collision[i] = 1;
        }

        return {
            id: 'mom_house', width: w, height: h,
            layers: [ground], collisionMap: collision,
            defaultSpawn: { x: 5, y: 8 },
            npcs: [
                { id: 'mom_inside', name: 'Mom', gridX: 2, gridY: 5, type: 'heal', facing: 'down',
                  dialogue: [
                      'Welcome home, sweetheart!',
                      'You must be tired from your adventures.',
                      'Here, let me patch up your Sprites for you.',
                      'There we go -- all better! Come visit any time.',
                  ] },
            ],
            transitions: [
                { gridX: 5, gridY: 9, width: 1, height: 1, targetRegion: 'starter_town', targetSpawn: { x: 7, y: 7 } },
            ],
            encounterZones: [],
        };
    }

    // ── Healer Hut Interior ───────────────────────────────────────────────
    _buildHealerHutInterior() {
        const { ground, collision, S, F, w, h } = this._buildInterior(8, 8, { doorX: 4 });

        // Healing setup
        S(1, 1, 48);  // Potion shelf
        S(2, 1, 48);  // Potion shelf
        S(5, 1, 43);  // Bookshelf (medical texts)
        S(6, 1, 43);
        S(3, 3, 42);  // Healing counter
        S(4, 3, 42);
        S(1, 3, 41);  // Warm fireplace
        F(3, 4, 5, 5, 47); // Carpet in front of counter

        for (let i = 0; i < ground.length; i++) {
            if ([41, 42, 43, 48].includes(ground[i])) collision[i] = 1;
        }

        return {
            id: 'healer_hut', width: w, height: h,
            layers: [ground], collisionMap: collision,
            defaultSpawn: { x: 4, y: 6 },
            npcs: [
                { id: 'healer_inside', name: 'Healer Mira', gridX: 4, gridY: 2, type: 'heal', facing: 'down',
                  dialogue: [
                      'Welcome to my clinic!',
                      'Place your injured Sprites on the counter.',
                      'A little herbal magic and... good as new!',
                      'Your Sprites have been fully restored!',
                      'Come back whenever you need healing.',
                  ] },
                { id: 'healer_assistant', name: 'Apprentice Lily', gridX: 2, gridY: 5, type: 'talk', facing: 'right',
                  dialogue: [
                      'I\'m studying to become a healer like Mira!',
                      'Did you know certain herbs can cure any status condition?',
                      'You can find them growing in the wild if you look carefully.',
                  ] },
            ],
            transitions: [
                { gridX: 4, gridY: 7, width: 1, height: 1, targetRegion: 'starter_town', targetSpawn: { x: 7, y: 19 } },
            ],
            encounterZones: [],
        };
    }

    // ── General Store Interior ─────────────────────────────────────────────
    _buildGeneralStoreInterior() {
        const { ground, collision, S, F, w, h } = this._buildInterior(10, 10, { doorX: 5 });

        // Shop shelves and counter
        F(1, 1, 3, 1, 48); // Potion shelves (left wall)
        F(6, 1, 8, 1, 43); // Book/item shelves (right wall)
        F(1, 3, 1, 5, 48); // Side shelf
        S(3, 4, 42);  // Shop counter
        S(4, 4, 42);
        S(5, 4, 42);
        S(6, 4, 42);
        S(8, 4, 30); // Crate
        S(8, 5, 30); // Crate
        S(8, 6, 22); // Barrel
        F(3, 6, 6, 7, 47); // Carpet in front of counter

        for (let i = 0; i < ground.length; i++) {
            if ([22, 30, 42, 43, 48].includes(ground[i])) collision[i] = 1;
        }

        return {
            id: 'general_store', width: w, height: h,
            layers: [ground], collisionMap: collision,
            defaultSpawn: { x: 5, y: 8 },
            npcs: [
                { id: 'shopkeeper_inside', name: 'Merchant Grin', gridX: 5, gridY: 3, type: 'shop', facing: 'down',
                  dialogue: [
                      'Welcome to Grin\'s General Goods!',
                      'I\'ve got potions, crystals, and essential supplies.',
                      'Business has been booming since trainers started passing through!',
                      'Take a look around -- everything is priced fairly!',
                  ] },
                { id: 'shop_cat', name: 'Shop Cat Whiskers', gridX: 2, gridY: 6, type: 'talk', facing: 'right',
                  dialogue: [
                      '...Meow.',
                      'The cat stares at you with knowing eyes.',
                      'It seems unimpressed by your trainer credentials.',
                  ] },
            ],
            transitions: [
                { gridX: 5, gridY: 9, width: 1, height: 1, targetRegion: 'starter_town', targetSpawn: { x: 6, y: 33 } },
            ],
            encounterZones: [],
        };
    }

    // ── Potion Shop Interior ──────────────────────────────────────────────
    _buildPotionShopInterior() {
        const { ground, collision, S, F, w, h } = this._buildInterior(8, 8, { doorX: 4 });

        // Potion brewing setup
        F(1, 1, 3, 1, 48); // Potion shelves
        F(5, 1, 6, 1, 48); // More potions
        S(2, 3, 42);  // Brewing counter
        S(3, 3, 42);
        S(4, 3, 42);
        S(5, 3, 46);  // Brewing fire/cauldron
        S(1, 5, 22);  // Ingredient barrel
        S(6, 5, 22);  // Ingredient barrel

        for (let i = 0; i < ground.length; i++) {
            if ([22, 42, 46, 48].includes(ground[i])) collision[i] = 1;
        }

        return {
            id: 'potion_shop', width: w, height: h,
            layers: [ground], collisionMap: collision,
            defaultSpawn: { x: 4, y: 6 },
            npcs: [
                { id: 'potion_brewer', name: 'Alchemist Zara', gridX: 3, gridY: 2, type: 'shop', facing: 'down',
                  dialogue: [
                      'Bubbling cauldrons and ancient recipes!',
                      'I specialize in potions and status cures.',
                      'My Fire Resist potions are very popular with temple explorers.',
                      'Shall I brew something for your journey?',
                  ] },
            ],
            transitions: [
                { gridX: 4, gridY: 7, width: 1, height: 1, targetRegion: 'starter_town', targetSpawn: { x: 12, y: 33 } },
            ],
            encounterZones: [],
        };
    }

    // ── Blacksmith Forge Interior ─────────────────────────────────────────
    _buildBlacksmithInterior() {
        const { ground, collision, S, F, w, h } = this._buildInterior(8, 8, { doorX: 4 });

        // Forge equipment
        S(1, 1, 46);  // Forge fire
        S(2, 1, 46);  // Forge fire
        S(3, 1, 45);  // Anvil
        S(5, 1, 43);  // Equipment shelf
        S(6, 1, 43);
        S(1, 3, 22);  // Metal barrel
        S(1, 4, 22);  // Metal barrel
        S(6, 4, 30);  // Crate of materials
        S(6, 5, 30);  // Crate
        S(3, 4, 42);  // Work counter
        S(4, 4, 42);

        for (let i = 0; i < ground.length; i++) {
            if ([22, 30, 42, 43, 45, 46].includes(ground[i])) collision[i] = 1;
        }

        return {
            id: 'blacksmith_forge', width: w, height: h,
            layers: [ground], collisionMap: collision,
            defaultSpawn: { x: 4, y: 6 },
            npcs: [
                { id: 'smith_inside', name: 'Smith Doran', gridX: 4, gridY: 2, type: 'shop', facing: 'down',
                  dialogue: [
                      '*CLANG* *CLANG*',
                      'Ah, a customer! Welcome to my forge!',
                      'I craft the finest weapons and armor in Willowshade.',
                      'Bring me raw materials and gold, and I\'ll make something special.',
                      'My work speaks for itself -- just look at these blades!',
                  ] },
                { id: 'smith_apprentice', name: 'Apprentice Cog', gridX: 2, gridY: 5, type: 'talk', facing: 'right',
                  dialogue: [
                      'Master Doran taught me everything about metalwork.',
                      'The secret to a good blade is patience and the right alloy.',
                      'One day I\'ll forge legendary weapons of my own!',
                  ] },
            ],
            transitions: [
                { gridX: 4, gridY: 7, width: 1, height: 1, targetRegion: 'starter_town', targetSpawn: { x: 6, y: 44 } },
            ],
            encounterZones: [],
        };
    }

    // ── Professor Lab Interior ────────────────────────────────────────────
    _buildProfessorLabInterior() {
        const { ground, collision, S, F, w, h } = this._buildInterior(12, 12, { doorX: 6 });

        // Lab equipment
        F(1, 1, 4, 1, 43);  // Bookshelves (research library)
        F(7, 1, 10, 1, 43); // More bookshelves
        S(1, 3, 48);  // Specimen shelf
        S(2, 3, 48);
        S(9, 3, 48);
        S(10, 3, 48);
        F(4, 4, 8, 4, 42);  // Long research counter
        S(3, 6, 44);  // Analysis table
        S(4, 6, 44);
        S(8, 6, 44);  // Second table
        S(9, 6, 44);
        S(1, 8, 30);  // Crate of supplies
        S(10, 8, 30);
        F(4, 8, 8, 9, 47);  // Carpet in main area

        for (let i = 0; i < ground.length; i++) {
            if ([30, 42, 43, 44, 48].includes(ground[i])) collision[i] = 1;
        }

        return {
            id: 'professor_lab', width: w, height: h,
            layers: [ground], collisionMap: collision,
            defaultSpawn: { x: 6, y: 10 },
            npcs: [
                { id: 'professor_inside', name: 'Professor Elm', gridX: 6, gridY: 3, type: 'quest', facing: 'down',
                  dialogue: [
                      'Ah, a young trainer! Welcome to my laboratory!',
                      'I\'ve dedicated my life to studying Sprite evolution.',
                      'There are 24 known Sprite races, each with three stages.',
                      'That\'s 72 unique forms waiting to be discovered!',
                      'I need your help cataloging wild Sprites.',
                      'Bring me data from your encounters and I\'ll reward you handsomely.',
                  ] },
                { id: 'lab_assistant_a', name: 'Researcher Ada', gridX: 3, gridY: 7, type: 'talk', facing: 'right',
                  dialogue: [
                      'The Professor\'s research is groundbreaking!',
                      'We\'ve discovered that element types influence evolution paths.',
                      'Fire-types evolve fastest in volcanic regions.',
                      'Water-types seem to prefer areas near large bodies of water.',
                  ] },
                { id: 'lab_assistant_b', name: 'Researcher Max', gridX: 9, gridY: 7, type: 'talk', facing: 'left',
                  dialogue: [
                      'I\'m analyzing the equipment bonding data.',
                      'Did you know Sprites can equip gear that boosts their abilities?',
                      'The rarer the equipment, the stronger the bond.',
                      'Check the Glossary for details on what each piece does!',
                  ] },
            ],
            transitions: [
                { gridX: 6, gridY: 11, width: 1, height: 1, targetRegion: 'starter_town', targetSpawn: { x: 35, y: 33 } },
            ],
            encounterZones: [],
        };
    }

    // ── Tavern / Inn Interior ─────────────────────────────────────────────
    _buildTavernInnInterior() {
        const { ground, collision, S, F, w, h } = this._buildInterior(12, 10, { doorX: 5 });

        // Tavern setup
        S(1, 1, 41);  // Fireplace
        S(2, 1, 41);  // Fireplace (large)
        F(5, 1, 10, 1, 43); // Bottles/shelves behind bar
        F(5, 3, 9, 3, 42);  // Bar counter
        S(10, 3, 42);
        // Tables and chairs
        S(1, 4, 44);  // Table
        S(2, 4, 44);
        S(1, 6, 44);  // Table
        S(2, 6, 44);
        S(9, 6, 44);  // Table
        S(10, 6, 44);
        // Decorations
        S(10, 8, 22);  // Barrel
        S(1, 8, 22);   // Barrel
        F(4, 5, 7, 7, 47);  // Carpet area

        for (let i = 0; i < ground.length; i++) {
            if ([22, 41, 42, 43, 44].includes(ground[i])) collision[i] = 1;
        }

        return {
            id: 'tavern_inn', width: w, height: h,
            layers: [ground], collisionMap: collision,
            defaultSpawn: { x: 5, y: 8 },
            npcs: [
                { id: 'innkeeper', name: 'Innkeeper Rose', gridX: 7, gridY: 2, type: 'heal', facing: 'down',
                  dialogue: [
                      'Welcome to the Wandering Sprite Inn!',
                      'A warm meal and a soft bed will fix you right up.',
                      'Your Sprites deserve a good rest too.',
                      'There! All healed and ready for adventure!',
                      'Come back any time you need a break from the road.',
                  ] },
                { id: 'tavern_patron_a', name: 'Traveling Merchant', gridX: 2, gridY: 5, type: 'talk', facing: 'right',
                  dialogue: [
                      'I\'ve traveled far and wide across these lands.',
                      'Beyond the Verdant Route lies the Crystal Caverns.',
                      'I once saw a Legendary Wolf Man Sprite there!',
                      'If you\'re brave enough, the treasures are worth the risk.',
                  ] },
                { id: 'tavern_patron_b', name: 'Retired Trainer', gridX: 10, gridY: 5, type: 'talk', facing: 'left',
                  dialogue: [
                      'Back in my day, we didn\'t have fancy equipment.',
                      'Just raw skill and a bond with our Sprites.',
                      'I defeated all 30 temple guardians with just three Sprites!',
                      'Well... maybe it was two guardians. Memory isn\'t what it used to be.',
                  ] },
                { id: 'tavern_bard', name: 'Bard Melody', gridX: 5, gridY: 6, type: 'talk', facing: 'down',
                  dialogue: [
                      '♪ In Willowshade where Sprites do play... ♪',
                      '♪ The trainers train both night and day... ♪',
                      '♪ With fire and ice and lightning bright... ♪',
                      '♪ They battle on with all their might! ♪',
                      'Heh, how was that? I\'m still working on it.',
                  ] },
            ],
            transitions: [
                { gridX: 5, gridY: 9, width: 1, height: 1, targetRegion: 'starter_town', targetSpawn: { x: 16, y: 7 } },
            ],
            encounterZones: [],
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
                if (this._encounterCooldown <= 0) {
                    this._stepCounter = 0; // reset steps accumulated during cooldown
                }
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

        // ── PASS 1: Draw floor tile (tile 0) at every visible position ──
        // This ensures no black gaps between decorative tiles
        for (let y = startRow; y <= endRow; y++) {
            for (let x = startCol; x <= endCol; x++) {
                const worldX = x * TILE_SIZE;
                const worldY = y * TILE_SIZE;
                this._drawCelShadedTile(ctx, 0, worldX - camX, worldY - camY, TILE_DRAW_SIZE, x, y);
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
                        this._drawCelShadedTile(ctx, tileIndex, worldX - camX, worldY - camY, TILE_DRAW_SIZE, x, y);
                    }
                }
            }
        }

        // Draw area transitions (subtle glow markers) — inside scaled context, use raw coords
        for (const t of this._transitions) {
            ctx.save();
            ctx.globalAlpha = 0.3 + 0.15 * Math.sin(performance.now() / 400);
            ctx.fillStyle = 'rgba(100, 200, 255, 0.4)';
            ctx.fillRect(t.x - camX, t.y - camY, t.w, t.h);
            ctx.restore();
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
            const isUndefeatedTrainer = nearbyNpc.type === 'trainer' && !(this._gameData.defeatedTrainers || []).includes(nearbyNpc.id);
            const promptLabel = isUndefeatedTrainer ? '[Battle]' : '[Talk]';
            const promptColor = isUndefeatedTrainer ? '#e03535' : '#e8a035';
            renderer.drawText(promptLabel, screenX, screenY - NPC_DRAW_HALFSIZE * CAMERA_ZOOM - 20, {
                color: promptColor,
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

        // Look up the current region in the curated encounter tables
        // Map internal region names to encounter table keys where they differ
        const regionKeyMap = { fire_temple: 'volcanic_cave' };
        const tableKey = regionKeyMap[this._currentRegion] || this._currentRegion;
        const table = ENCOUNTER_TABLES[tableKey];

        const enemies = [];
        for (let i = 0; i < enemyCount; i++) {
            const level = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
            let raceId;

            if (table && table.length > 0) {
                // Weighted random selection from the encounter table
                const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
                let roll = Math.random() * totalWeight;
                let picked = table[0];
                for (const entry of table) {
                    roll -= entry.weight;
                    if (roll <= 0) {
                        picked = entry;
                        break;
                    }
                }
                raceId = picked.race_id;
            } else {
                // Fallback: random race if no encounter table exists for this region
                raceId = Math.floor(Math.random() * 24) + 1;
            }

            enemies.push({
                raceId,
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
        if (this._transitionPending) return;
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
        this._transitionPending = true;
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

        // Defeated trainers show post-battle dialogue instead
        let lines = npc.dialogue;
        if (npc.type === 'trainer') {
            const defeated = (this._gameData.defeatedTrainers || []).includes(npc.id);
            if (defeated) {
                const trainerDef = getTrainer(npc.id);
                if (trainerDef && trainerDef.postDialogue) {
                    lines = trainerDef.postDialogue;
                }
            }
        }
        this._dialogueQueue = [...lines];

        eventBus.emit(GameEvents.NPC_INTERACTED, {
            npcId: npc.id,
            npcName: npc.name,
            npcType: npc.type,
        });

        eventBus.emit(GameEvents.DIALOGUE_STARTED, {
            speaker: npc.name,
            lines,
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
                    eventBus.emit(GameEvents.QUEST_STARTED, {
                        npcId: this._dialogueNpc?.id,
                        npcName: this._dialogueNpc?.name,
                    });
                    break;
                case 'trainer':
                    this._startTrainerBattle(this._dialogueNpc);
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

    _startTrainerBattle(npc) {
        const trainerDef = getTrainer(npc.id);
        if (!trainerDef) {
            eventBus.emit(GameEvents.NOTIFICATION, `${npc.name} wants to battle, but has no team data!`);
            return;
        }

        // Check if already defeated (stored in gameData)
        const defeated = this._gameData.defeatedTrainers || [];
        if (defeated.includes(npc.id)) {
            return; // Already beaten, dialogue-only from now on
        }

        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/encounter.ogg')
        );

        eventBus.emit(GameEvents.ENCOUNTER_TRIGGERED, {
            type: 'trainer',
            trainerId: npc.id,
            trainerName: trainerDef.name,
            region: this._currentRegion,
            enemies: trainerDef.team,
        });

        this.engine.scenes.changeTo('deployment', {
            encounterType: 'trainer',
            trainerId: npc.id,
            trainerName: trainerDef.name,
            trainerTitle: trainerDef.title,
            region: this._currentRegion,
            enemies: trainerDef.team,
            goldReward: trainerDef.goldReward,
            xpBonus: trainerDef.xpBonus,
            postDialogue: trainerDef.postDialogue,
            gameData: this._gameData,
            returnScene: 'overworld',
            returnData: {
                trainerId: npc.id,
                gameData: this._gameData,
                spawnPoint: {
                    x: Math.floor(this._player.x / TILE_SIZE),
                    y: Math.floor(this._player.y / TILE_SIZE),
                },
            },
        });
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
            { label: 'Glossary', action: () => { panel.classList.add('hidden'); this._openGlossary(); } },
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

    _openGlossary() {
        const panel = document.getElementById('screen-panel');
        if (!panel) return;

        panel.classList.remove('hidden');
        panel.innerHTML = '';

        const glossary = new GlossaryScreen({
            engine: this.engine,
            onBack: () => {
                panel.classList.add('hidden');
                panel.innerHTML = '';
            },
        });
        const el = glossary.build();
        panel.appendChild(el);
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
        eventBus.emit(GameEvents.GAME_SAVED, { slot: 0, auto: false });
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
            ctx.font = '8px sans-serif';
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
        ctx.font = '11px sans-serif';
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
        ctx.font = '10px sans-serif';
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
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('DEBUG', 14, 12);

        ctx.restore();
    }

    // ── Rendering Helpers ──────────────────────────────────────────────────

    _renderPlayer(renderer) {
        const wx = this._player.x;
        const wy = this._player.y;
        const camX = Math.round(this._camera.x);
        const camY = Math.round(this._camera.y);
        const halfSize = PLAYER_SIZE / 2;

        // Use AQ-style HumanoidSpriteSystem for the player character
        const dirMap = { down: 0, left: 1, right: 2, up: 3 };
        const dir = dirMap[this._player.facing] || 0;
        const animFrame = this._player.moving ? (this._player.animFrame % 4) : 0;
        const raceId = this._player.raceId || 12; // Default to Human
        const stage = this._player.stage || 1;
        const equipment = this._player.equipment || {};

        try {
            const ctx = renderer.ctx || renderer._ctx;
            if (ctx) {
                // Direct ctx calls need manual camera offset
                const px = wx - camX;
                const py = wy - camY;
                ctx.imageSmoothingEnabled = true;
                HumanoidSpriteSystem.drawWithEquipment(
                    ctx, raceId, stage, dir, animFrame,
                    px, py + halfSize * 0.3, PLAYER_SIZE,
                    { equipment }
                );
                ctx.imageSmoothingEnabled = true;
                return;
            }
        } catch (_) { /* fall through to legacy rendering */ }

        // Legacy fallback uses renderer methods which subtract camera internally
        if (this._player.spriteImg && this._player.spriteImg.complete) {
            const dirRow = { down: 0, left: 1, right: 2, up: 3 };
            const row = dirRow[this._player.facing] || 0;
            const numRows = this._player.spriteRows || 4;
            const sh = this._player.spriteImg.height / numRows;
            const sw = this._player.spriteFrameW || sh;
            const numCols = this._player.spriteCols || Math.floor(this._player.spriteImg.width / sw) || 4;
            const col = this._player.moving ? (this._player.animFrame % numCols) : 0;
            renderer.drawSprite(
                this._player.spriteImg,
                col * sw, row * sh, sw, sh,
                wx - halfSize, wy - halfSize, PLAYER_SIZE, PLAYER_SIZE
            );
        } else {
            // Fallback: colored circle
            renderer.drawCircle(wx, wy, halfSize, '#44aaff');
            const d = DIR[this._player.facing] || DIR.down;
            renderer.drawCircle(
                wx + d.x * halfSize * 0.6,
                wy + d.y * halfSize * 0.6,
                3, '#ffffff'
            );
        }
    }

    _renderNpc(renderer, npc) {
        // Try AQ-style HumanoidSpriteSystem rendering for NPCs with race data
        if (npc.raceId) {
            try {
                const ctx = renderer.ctx || renderer._ctx;
                if (ctx) {
                    // Direct ctx calls need manual camera offset
                    const camX = Math.round(this._camera.x);
                    const camY = Math.round(this._camera.y);
                    const dirMap = { down: 0, left: 1, right: 2, up: 3 };
                    const dir = dirMap[npc.facing] || 0;
                    const animFrame = npc.moving ? ((npc.animFrame || 0) % 4) : 0;
                    const npcSize = NPC_DRAW_HALFSIZE * 2;
                    ctx.imageSmoothingEnabled = true;
                    HumanoidSpriteSystem.drawWithEquipment(
                        ctx, npc.raceId, npc.stage || 1, dir, animFrame,
                        npc.x - camX, npc.y - camY + NPC_DRAW_HALFSIZE * 0.3, npcSize,
                        { equipment: npc.equipment || {} }
                    );
                    ctx.imageSmoothingEnabled = true;
                    return;
                }
            } catch (_) { /* fall through to legacy */ }
        }

        if (npc.spriteSheet && npc.spriteSheet.complete) {
            const dirRow = { down: 0, left: 1, right: 2, up: 3 };
            const row = dirRow[npc.facing] || 0;
            const col = npc.moving ? ((npc.animFrame || 0) % (npc.spriteCols || 4)) : 0;
            const fw = npc.spriteFrameW || (npc.spriteSheet.width / (npc.spriteCols || 4));
            const fh = npc.spriteFrameH || (npc.spriteSheet.height / (npc.spriteRows || 4));
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
                trainer: '#e03535',
            };
            const color = colors[npc.type] || '#ffffff';
            renderer.drawCircle(npc.x, npc.y, NPC_DRAW_HALFSIZE, color);
        }
    }

    /**
     * Draw a single tile with caching at TILE_RENDER_SIZE (128px) resolution.
     * Cached tiles are rendered once to an off-screen canvas, then blitted
     * to the display at the requested size for high-quality scaled output.
     * Animated tiles (magic_wall) bypass the cache and render directly.
     */
    _drawCelShadedTile(ctx, tileIndex, dx, dy, size, gridX, gridY) {
        const colors = TILE_COLORS[tileIndex] || DEFAULT_TILE_COLOR;
        const isAnimated = (colors.name === 'magic_wall');

        if (!isAnimated) {
            // Use hash bucket (16 variants per tile) for deterministic variety
            const hashBucket = ((gridX * 7919 + gridY * 6271) & 0xFFFF) % 16;
            const cacheKey = (tileIndex << 8) | (hashBucket << 4) | (((gridX * 11) % 12) & 0xF);
            let cached = this._tileCache.get(cacheKey);
            if (!cached) {
                // Evict oldest entry if over limit
                if (this._tileCache.size >= TILE_CACHE_LIMIT) {
                    const firstKey = this._tileCache.keys().next().value;
                    this._tileCache.delete(firstKey);
                }
                cached = (typeof OffscreenCanvas !== 'undefined')
                    ? new OffscreenCanvas(TILE_RENDER_SIZE, TILE_RENDER_SIZE)
                    : Object.assign(document.createElement('canvas'), { width: TILE_RENDER_SIZE, height: TILE_RENDER_SIZE });
                const tctx = cached.getContext('2d');
                this._renderTileDetailed(tctx, tileIndex, 0, 0, TILE_RENDER_SIZE, gridX, gridY);
                this._tileCache.set(cacheKey, cached);
            }
            ctx.drawImage(cached, dx, dy, size, size);
        } else {
            // Animated tiles render directly each frame
            this._renderTileDetailed(ctx, tileIndex, dx, dy, size, gridX, gridY);
        }
    }

    /**
     * Render a single tile at high detail (128x128) with AQ cel-shaded style:
     * base fill, highlight/shadow strips, bold outline, and rich procedural
     * decorations scaled via the s factor (size/32). At 128px, s=4 gives
     * 4x the detail of the original 32px tiles.
     */
    _renderTileDetailed(ctx, tileIndex, dx, dy, size, gridX, gridY) {
        const colors = TILE_COLORS[tileIndex] || DEFAULT_TILE_COLOR;
        const s = size / 32;  // Scale factor: 1 at 32px, 4 at 128px

        // Scaled fillRect helper — coordinates in 32px space, auto-scaled
        const r = (x, y, w, h) => ctx.fillRect(dx + (x * s) | 0, dy + (y * s) | 0, (w * s) | 0, (h * s) | 0);
        // Scaled strokeRect helper
        const sr = (x, y, w, h) => ctx.strokeRect(dx + (x * s) + 0.5, dy + (y * s) + 0.5, (w * s) | 0, (h * s) | 0);

        // 1. Base fill
        ctx.fillStyle = colors.base;
        ctx.fillRect(dx, dy, size, size);

        // 2. Highlight strip (top 3px and left 2px scaled) — AQ hard edge
        ctx.fillStyle = colors.highlight;
        r(0, 0, 32, 3);
        r(0, 0, 2, 32);

        // 3. Shadow strip (bottom 3px and right 2px scaled)
        ctx.fillStyle = colors.shadow;
        r(0, 29, 32, 3);
        r(30, 0, 2, 32);

        // 4. Bold outline — scales with resolution
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.lineWidth = Math.max(1, s * 0.75);
        ctx.strokeRect(dx + 0.5, dy + 0.5, size - 1, size - 1);

        // 5. Procedural decorations — high detail at 128px resolution
        const name = colors.name;
        const hash = ((gridX * 7919 + gridY * 6271) & 0xFFFF) / 0xFFFF;
        const hash2 = ((gridX * 4919 + gridY * 8271) & 0xFFFF) / 0xFFFF;
        const hash3 = ((gridX * 3571 + gridY * 9029) & 0xFFFF) / 0xFFFF;

        if (name === 'grass' || name === 'deep_grass') {
            // Rich grass with multiple blade clusters, texture, and occasional flowers
            ctx.fillStyle = colors.shadow;
            if (hash > 0.3) {
                r(6 + (hash * 10 | 0), 8 + (hash * 6 | 0), 2, 4);
                r(18 + (hash * 4 | 0), 20 + (hash * 4 | 0), 2, 4);
                r(24 + (hash2 * 4 | 0), 6 + (hash2 * 8 | 0), 1, 3);
            }
            // Lighter blade accents
            ctx.fillStyle = colors.highlight;
            r(3 + (hash2 * 8 | 0), 5 + (hash3 * 4 | 0), 1, 5);
            r(14 + (hash3 * 6 | 0), 3, 1, 4);
            r(24 + (hash * 4 | 0), 14 + (hash2 * 6 | 0), 1, 5);
            r(10, 22 + (hash3 * 4 | 0), 1, 4);
            // Ground texture dots
            ctx.fillStyle = colors.shadow;
            r(10 + (hash * 6 | 0), 16, 1, 1);
            r(22 + (hash2 * 6 | 0), 10, 1, 1);
            r(4 + (hash3 * 4 | 0), 26, 1, 1);
            // Tiny clover/flower at some positions
            if (hash > 0.8) {
                ctx.fillStyle = '#e8e060';
                r(14 + (hash2 * 6 | 0), 14 + (hash * 4 | 0), 2, 2);
                ctx.fillStyle = '#e0d040';
                r(15 + (hash2 * 6 | 0), 13 + (hash * 4 | 0), 1, 1);
            }
            if (hash > 0.7) {
                ctx.fillStyle = colors.shadow;
                r(12, 14, 1, 5);
            }
        } else if (name === 'water' || name === 'deep_water' || name === 'water_edge') {
            // Layered ripples with foam and depth variation
            ctx.fillStyle = colors.highlight;
            const ry = 6 + (hash * 10 | 0);
            r(3, ry, 10, 1);
            r(16, ry + 4, 12, 1);
            r(6, ry + 10, 8, 1);
            // Depth variation — darker areas
            ctx.fillStyle = colors.shadow;
            r(2 + (hash2 * 8 | 0), 18 + (hash2 * 6 | 0), 6, 3);
            // Foam bubbles at edges
            if (name === 'water_edge') {
                ctx.fillStyle = '#a0d0f0';
                r(4 + (hash * 6 | 0), 2, 2, 1);
                r(18 + (hash2 * 4 | 0), 3, 3, 1);
                r(10 + (hash3 * 6 | 0), 1, 2, 1);
            }
            // Secondary ripple layer
            ctx.fillStyle = colors.highlight;
            r(20 + (hash3 * 4 | 0), ry + 8, 6, 1);
            if (hash > 0.4) {
                r(8 + (hash2 * 6 | 0), ry + 14, 8, 1);
            }
        } else if (name === 'stone' || name === 'dark_stone' || name === 'stone_path') {
            // Detailed cracks, pebble texture, and moss patches
            ctx.fillStyle = colors.shadow;
            const cx = 6 + (hash * 14 | 0);
            const cy = 6 + (hash * 10 | 0);
            r(cx, cy, 8, 1);
            r(cx + 5, cy, 1, 6);
            // Secondary crack
            r(4 + (hash2 * 12 | 0), 18 + (hash2 * 6 | 0), 5, 1);
            r(8 + (hash2 * 12 | 0), 18 + (hash2 * 6 | 0), 1, 4);
            // Pebble texture
            ctx.fillStyle = colors.highlight;
            r(3 + (hash3 * 6 | 0), 4 + (hash * 4 | 0), 2, 2);
            r(22 + (hash2 * 4 | 0), 22 + (hash3 * 4 | 0), 2, 2);
            // Moss at some positions
            if (hash > 0.75 && name !== 'stone_path') {
                ctx.fillStyle = '#4a8a3a';
                r(2 + (hash * 8 | 0), 24 + (hash2 * 4 | 0), 4, 2);
            }
        } else if (name === 'sand') {
            // Detailed sand with speckles, ripples, and shell fragments
            ctx.fillStyle = colors.shadow;
            r(8 + (hash * 10 | 0), 10 + (hash * 8 | 0), 1, 1);
            r(20 + (hash * 4 | 0), 6, 1, 1);
            r(4 + (hash2 * 8 | 0), 22 + (hash2 * 4 | 0), 1, 1);
            r(16 + (hash3 * 6 | 0), 16, 1, 1);
            // Wind ripple lines
            ctx.fillStyle = colors.highlight;
            r(2, 14 + (hash * 6 | 0), 12, 1);
            r(18, 20 + (hash2 * 4 | 0), 10, 1);
            // Shell fragment
            if (hash > 0.85) {
                ctx.fillStyle = '#e8e0d0';
                r(12 + (hash2 * 8 | 0), 8 + (hash3 * 10 | 0), 2, 2);
            }
        } else if (name === 'path' || name === 'path_v' || name === 'crossroad') {
            // Detailed dirt path with tracks, pebbles, and wear marks
            ctx.fillStyle = colors.shadow;
            r(10 + (hash * 8 | 0), 14, 3, 1);
            r(4 + (hash2 * 6 | 0), 8 + (hash * 8 | 0), 2, 1);
            r(20 + (hash3 * 4 | 0), 22, 2, 1);
            // Embedded pebbles
            ctx.fillStyle = colors.highlight;
            r(6 + (hash * 10 | 0), 18 + (hash2 * 6 | 0), 2, 2);
            r(22 + (hash2 * 4 | 0), 10 + (hash3 * 4 | 0), 2, 1);
            // Wheel rut marks (path only)
            if (name === 'path') {
                ctx.fillStyle = colors.shadow;
                r(8, 2, 1, 28);
                r(22, 2, 1, 28);
            } else if (name === 'path_v') {
                ctx.fillStyle = colors.shadow;
                r(2, 8, 28, 1);
                r(2, 22, 28, 1);
            }
        } else if (name === 'flowers') {
            // Rich flower patches with stems, petals, and leaves
            const flowerColors = ['#e05050', '#e0e050', '#e050e0', '#50b0e0', '#ff8844'];
            const fci = (gridX + gridY) % flowerColors.length;
            // Main flowers
            ctx.fillStyle = flowerColors[fci];
            r(8 + (hash * 8 | 0), 8 + (hash * 6 | 0), 4, 4);
            r(18 + (hash * 4 | 0), 18 + (hash * 4 | 0), 4, 4);
            // Petal highlights
            ctx.fillStyle = '#ffffff';
            r(9 + (hash * 8 | 0), 9 + (hash * 6 | 0), 1, 1);
            r(19 + (hash * 4 | 0), 19 + (hash * 4 | 0), 1, 1);
            // Third flower at some positions
            if (hash > 0.4) {
                ctx.fillStyle = flowerColors[(fci + 2) % flowerColors.length];
                r(4 + (hash2 * 6 | 0), 20 + (hash2 * 4 | 0), 3, 3);
            }
            // Stems and leaves
            ctx.fillStyle = '#2a8a2a';
            r(9 + (hash * 8 | 0), 12 + (hash * 6 | 0), 1, 4);
            r(19 + (hash * 4 | 0), 22 + (hash * 4 | 0), 1, 3);
            // Grass blades around flowers
            ctx.fillStyle = colors.shadow;
            r(14, 6, 1, 5);
            r(26, 14, 1, 4);
        } else if (name === 'tree_dark' || name === 'tree_light') {
            // Dense foliage with multiple leaf clusters and depth
            ctx.fillStyle = colors.highlight;
            r(4, 4, 6, 6);
            r(16, 3, 8, 5);
            r(8, 12, 7, 5);
            r(22, 14, 6, 6);
            // Deep shadow clusters
            ctx.fillStyle = colors.shadow;
            r(12, 20, 8, 5);
            r(2, 16, 5, 4);
            r(26, 6, 4, 4);
            // Individual leaf dots
            ctx.fillStyle = colors.highlight;
            r(6, 24, 3, 2);
            r(20, 8, 2, 2);
            // Bark peek-through at bottom
            ctx.fillStyle = '#5c4030';
            r(14, 28, 4, 3);
        } else if (name === 'big_tree_tl' || name === 'big_tree_tr') {
            // Dense canopy with layered highlights and leaf detail
            ctx.fillStyle = colors.highlight;
            r(3, 3, 10, 8);
            r(16, 8, 12, 7);
            r(6, 16, 8, 5);
            // Darker depth
            ctx.fillStyle = colors.shadow;
            r(12, 4, 4, 6);
            r(24, 18, 5, 6);
            // Leaf edge detail
            ctx.fillStyle = colors.highlight;
            r(2, 22, 3, 3);
            r(28, 4, 3, 3);
            r(8, 26, 4, 2);
        } else if (name === 'big_tree_bl' || name === 'big_tree_br') {
            // Detailed trunk bark with grain, knots, and root textures
            ctx.fillStyle = colors.highlight;
            r(8, 2, 3, 14);
            r(18, 4, 3, 12);
            r(13, 8, 2, 8);
            // Bark knot
            ctx.fillStyle = colors.shadow;
            r(14, 16, 4, 3);
            r(10, 22, 3, 2);
            // Root detail at bottom
            ctx.fillStyle = colors.highlight;
            r(4, 26, 6, 2);
            r(20, 28, 8, 2);
            // Moss on bark
            ctx.fillStyle = '#3a7a2a';
            r(6, 18, 3, 3);
        } else if (name === 'wall' || name === 'wall_wood' || name === 'wall_window') {
            // Detailed brick/wood wall with mortar, weathering, texture
            ctx.fillStyle = colors.shadow;
            r(0, 10, 32, 1);
            r(0, 22, 32, 1);
            // Brick pattern (staggered horizontal lines)
            r(14, 2, 1, 8);
            r(8, 12, 1, 10);
            r(22, 12, 1, 10);
            // Mortar highlight
            ctx.fillStyle = colors.highlight;
            r(4, 4, 8, 1);
            r(18, 16, 8, 1);
            // Weathering spots
            ctx.fillStyle = colors.shadow;
            r(4 + (hash * 6 | 0), 26 + (hash2 * 2 | 0), 3, 2);
            if (name === 'wall_window') {
                // Detailed window with frame, panes, sill, and reflection
                ctx.fillStyle = '#6699cc';
                r(8, 4, 16, 14);
                // Window frame
                ctx.fillStyle = colors.shadow;
                r(8, 4, 16, 1);
                r(8, 17, 16, 1);
                r(8, 4, 1, 14);
                r(23, 4, 1, 14);
                // Mullion cross
                r(15, 4, 2, 14);
                r(8, 10, 16, 2);
                // Glass reflection
                ctx.fillStyle = '#aaddff';
                r(10, 6, 4, 3);
                r(18, 12, 3, 2);
                // Window sill
                ctx.fillStyle = colors.highlight;
                r(6, 18, 20, 2);
            } else if (name === 'wall_wood') {
                // Wood plank grain
                ctx.fillStyle = colors.highlight;
                r(2, 6, 28, 1);
                r(2, 16, 28, 1);
                r(2, 26, 28, 1);
            }
        } else if (name === 'roof' || name === 'roof_peak' || name === 'roof_left' || name === 'roof_right') {
            // Detailed roof tiles with shingle pattern and weathering
            ctx.fillStyle = colors.shadow;
            r(0, 7, 32, 1);
            r(0, 15, 32, 1);
            r(0, 23, 32, 1);
            // Staggered shingle edges
            ctx.fillStyle = colors.highlight;
            r(4, 6, 6, 1);
            r(18, 6, 8, 1);
            r(8, 14, 6, 1);
            r(22, 14, 6, 1);
            r(2, 22, 8, 1);
            r(16, 22, 6, 1);
            // Weathering/moss spots
            if (hash > 0.6) {
                ctx.fillStyle = '#8a4020';
                r(10 + (hash * 8 | 0), 4, 2, 2);
            }
        } else if (name === 'door') {
            // Detailed door with planks, hinges, handle, and frame
            ctx.fillStyle = colors.shadow;
            r(10, 2, 2, 28);
            r(20, 2, 2, 28);
            // Extra plank lines
            r(6, 2, 1, 28);
            r(15, 2, 1, 28);
            r(25, 2, 1, 28);
            // Door frame
            ctx.fillStyle = '#3a2810';
            r(0, 0, 2, 32);
            r(30, 0, 2, 32);
            r(0, 0, 32, 2);
            // Handle and keyhole
            ctx.fillStyle = '#c8a040';
            r(22, 14, 4, 4);
            ctx.fillStyle = '#8a6020';
            r(23, 15, 2, 2);
            // Hinges
            ctx.fillStyle = '#555555';
            r(2, 6, 3, 2);
            r(2, 22, 3, 2);
        } else if (name === 'fence') {
            // Detailed fence with posts, rails, wood grain, and nails
            ctx.fillStyle = colors.shadow;
            r(4, 3, 4, 26);
            r(24, 3, 4, 26);
            // Middle post
            r(14, 6, 3, 20);
            // Horizontal rails with highlight
            ctx.fillStyle = colors.highlight;
            r(2, 11, 28, 3);
            r(2, 21, 28, 3);
            // Rail shadow edge
            ctx.fillStyle = colors.shadow;
            r(2, 14, 28, 1);
            r(2, 24, 28, 1);
            // Nail dots
            ctx.fillStyle = '#555555';
            r(5, 12, 1, 1);
            r(5, 22, 1, 1);
            r(25, 12, 1, 1);
            r(25, 22, 1, 1);
        } else if (name === 'bridge') {
            // Detailed bridge planks with grain, gaps, and rope rails
            ctx.fillStyle = colors.shadow;
            r(5, 0, 2, 32);
            r(13, 0, 2, 32);
            r(21, 0, 2, 32);
            r(28, 0, 1, 32);
            // Plank grain
            ctx.fillStyle = colors.highlight;
            r(2, 4, 1, 8);
            r(9, 8, 1, 10);
            r(17, 2, 1, 12);
            r(25, 6, 1, 8);
            // Rope rails
            ctx.fillStyle = '#8a7050';
            r(0, 0, 1, 32);
            r(31, 0, 1, 32);
        } else if (name === 'lava') {
            // Detailed lava with hot streaks, crust, and glow
            ctx.fillStyle = colors.highlight;
            r(3, 6 + (hash * 8 | 0), 12, 3);
            r(18, 14, 10, 3);
            // Orange glow
            ctx.fillStyle = '#ff8844';
            r(8, 18 + (hash2 * 4 | 0), 14, 2);
            // Yellow-hot center
            ctx.fillStyle = '#ffcc44';
            r(10, 10 + (hash * 6 | 0), 6, 2);
            // Dark crust patches
            ctx.fillStyle = colors.shadow;
            r(2 + (hash * 8 | 0), 2 + (hash2 * 4 | 0), 4, 3);
            r(20 + (hash2 * 4 | 0), 22 + (hash3 * 4 | 0), 5, 3);
        } else if (name === 'fountain') {
            // Detailed fountain with basin, water, spout, and splashes
            ctx.fillStyle = '#707080';
            r(6, 6, 20, 20);
            ctx.fillStyle = colors.highlight;
            r(8, 8, 16, 16);
            // Water
            ctx.fillStyle = colors.base;
            r(10, 10, 12, 12);
            // Central spout
            ctx.fillStyle = '#808090';
            r(14, 8, 4, 8);
            // Water splashes
            ctx.fillStyle = '#a0d0f0';
            r(11, 9, 2, 2);
            r(20, 11, 2, 2);
            r(12, 18, 2, 2);
            r(18, 16, 3, 2);
            // Basin rim
            ctx.fillStyle = '#606070';
            r(6, 6, 20, 2);
            r(6, 24, 20, 2);
            r(6, 6, 2, 20);
            r(24, 6, 2, 20);
        } else if (name === 'chest' || name === 'crate') {
            // Detailed chest/crate with lid, bands, clasp, and wood grain
            ctx.fillStyle = colors.shadow;
            r(3, 14, 26, 2);
            // Wood grain
            r(6, 4, 1, 10);
            r(18, 4, 1, 10);
            r(8, 18, 1, 10);
            r(22, 18, 1, 10);
            // Metal bands
            ctx.fillStyle = '#888888';
            r(3, 6, 26, 1);
            r(3, 24, 26, 1);
            // Clasp/latch
            ctx.fillStyle = name === 'chest' ? '#d4a020' : colors.highlight;
            r(12, 10, 8, 5);
            // Keyhole on chests
            if (name === 'chest') {
                ctx.fillStyle = '#333333';
                r(15, 12, 2, 2);
            }
        } else if (name === 'lamp') {
            // Detailed lamp post with lantern, flame, and glow
            ctx.fillStyle = '#555555';
            r(14, 14, 4, 18);
            // Lantern body
            ctx.fillStyle = '#cc9930';
            r(10, 4, 12, 10);
            // Glass panes
            ctx.fillStyle = '#fff8cc';
            r(12, 6, 8, 6);
            // Flame inside
            ctx.fillStyle = '#ff9930';
            r(14, 7, 4, 4);
            ctx.fillStyle = '#ffcc60';
            r(15, 8, 2, 2);
            // Top cap
            ctx.fillStyle = '#444444';
            r(11, 3, 10, 2);
            r(13, 2, 6, 1);
            // Warm glow area
            ctx.fillStyle = 'rgba(255, 200, 80, 0.08)';
            ctx.fillRect(dx, dy, size, size);
        } else if (name === 'mushroom') {
            // Detailed mushroom with cap, spots, gills, and stem
            // Cap
            ctx.fillStyle = colors.highlight;
            r(6, 4, 20, 12);
            r(8, 2, 16, 4);
            // Cap shadow
            ctx.fillStyle = colors.shadow;
            r(6, 14, 20, 2);
            // White spots
            ctx.fillStyle = '#ffffff';
            r(10, 6, 4, 4);
            r(18, 8, 3, 3);
            r(14, 4, 2, 2);
            // Gills underneath
            ctx.fillStyle = '#d0c0a0';
            r(10, 14, 2, 2);
            r(14, 14, 2, 2);
            r(18, 14, 2, 2);
            // Stem
            ctx.fillStyle = '#e8dcc0';
            r(12, 16, 8, 12);
            ctx.fillStyle = '#d8cca0';
            r(14, 18, 2, 8);
        } else if (name === 'stump') {
            // Detailed tree stump with rings, bark, and moss
            ctx.fillStyle = colors.highlight;
            r(6, 6, 20, 16);
            // Growth rings
            ctx.fillStyle = colors.shadow;
            r(10, 10, 12, 8);
            ctx.fillStyle = colors.highlight;
            r(12, 12, 8, 4);
            ctx.fillStyle = colors.shadow;
            r(14, 13, 4, 2);
            // Bark edges
            ctx.fillStyle = colors.shadow;
            r(4, 20, 24, 8);
            ctx.fillStyle = colors.highlight;
            r(6, 22, 20, 4);
            // Moss
            ctx.fillStyle = '#3a8a2a';
            r(4 + (hash * 4 | 0), 20, 4, 2);
        } else if (name === 'barrel') {
            // Detailed barrel with staves, hoops, and wood grain
            // Stave lines
            ctx.fillStyle = colors.shadow;
            r(8, 2, 1, 28);
            r(16, 2, 1, 28);
            r(24, 2, 1, 28);
            // Metal hoops
            ctx.fillStyle = '#777777';
            r(3, 7, 26, 2);
            r(3, 20, 26, 2);
            // Hoop rivets
            ctx.fillStyle = '#999999';
            r(6, 7, 1, 2);
            r(14, 7, 1, 2);
            r(22, 7, 1, 2);
            // Wood grain
            ctx.fillStyle = colors.highlight;
            r(4, 12, 1, 6);
            r(12, 10, 1, 8);
            r(20, 14, 1, 4);
            // Barrel top
            ctx.fillStyle = colors.shadow;
            r(6, 2, 20, 2);
        } else if (name === 'sign') {
            // Detailed sign with post, board, text lines, and arrow
            // Post
            ctx.fillStyle = colors.shadow;
            r(13, 16, 6, 16);
            ctx.fillStyle = colors.highlight;
            r(14, 18, 4, 12);
            // Sign board
            ctx.fillStyle = colors.highlight;
            r(4, 2, 24, 14);
            // Board border
            ctx.fillStyle = colors.shadow;
            r(4, 2, 24, 1);
            r(4, 15, 24, 1);
            r(4, 2, 1, 14);
            r(27, 2, 1, 14);
            // Text lines
            ctx.fillStyle = '#333333';
            r(7, 6, 18, 1);
            r(7, 10, 14, 1);
            // Arrow
            r(22, 9, 3, 3);
        } else if (name === 'stairs') {
            // Detailed stairs with step edges, shadows, and side walls
            ctx.fillStyle = colors.highlight;
            for (let sy = 3; sy < 29; sy += 5) {
                r(3, sy, 26, 3);
            }
            // Step edges/shadows
            ctx.fillStyle = colors.shadow;
            for (let sy = 6; sy < 32; sy += 5) {
                r(3, sy, 26, 1);
            }
            // Side walls
            ctx.fillStyle = colors.shadow;
            r(2, 2, 1, 28);
            r(29, 2, 1, 28);
        } else if (name === 'tall_grass') {
            // Detailed tall grass with swaying blades and seed heads
            ctx.fillStyle = colors.highlight;
            r(4, 2, 2, 10);
            r(10, 0, 2, 14);
            r(18, 3, 2, 10);
            r(24, 1, 2, 12);
            r(7, 6, 2, 8);
            r(21, 4, 2, 10);
            // Shadow blades
            ctx.fillStyle = colors.shadow;
            r(8, 8, 2, 12);
            r(14, 6, 2, 14);
            r(22, 10, 2, 10);
            r(3, 14, 2, 10);
            r(28, 8, 2, 8);
            // Seed heads
            ctx.fillStyle = '#d0c080';
            r(10, 0, 3, 2);
            r(24, 1, 3, 2);
            r(14, 4, 2, 2);
        } else if (name === 'marble') {
            // Detailed marble with veining, polish, and subtle color variation
            ctx.fillStyle = colors.shadow;
            r(3, 7, 14, 1);
            r(15, 7, 1, 12);
            r(8, 18, 10, 1);
            // Additional veins
            r(22, 4, 1, 8);
            r(20, 12, 8, 1);
            // Polish highlights
            ctx.fillStyle = colors.highlight;
            r(4, 4, 3, 2);
            r(20, 20, 4, 2);
            r(10, 24, 3, 2);
        } else if (name === 'wood') {
            // Detailed wood planks with grain, knots, and nail holes
            ctx.fillStyle = colors.shadow;
            r(1, 5, 30, 1);
            r(1, 13, 30, 1);
            r(1, 21, 30, 1);
            r(1, 29, 30, 1);
            // Grain lines within planks
            ctx.fillStyle = colors.highlight;
            r(3, 8, 12, 1);
            r(18, 16, 10, 1);
            r(6, 24, 14, 1);
            // Knots
            ctx.fillStyle = colors.shadow;
            r(10 + (hash * 6 | 0), 8, 2, 2);
            r(22 + (hash2 * 4 | 0), 24, 2, 2);
            // Nail holes
            ctx.fillStyle = '#444444';
            r(4, 5, 1, 1);
            r(28, 13, 1, 1);
        } else if (name === 'inn_wall') {
            // Detailed timber frame inn wall with plaster, nails, and weathering
            ctx.fillStyle = colors.highlight;
            r(2, 9, 28, 3);
            r(2, 20, 28, 3);
            r(13, 2, 3, 28);
            // Plaster between timbers
            ctx.fillStyle = '#d8c8a8';
            r(4, 12, 9, 8);
            r(16, 12, 12, 8);
            r(4, 2, 9, 7);
            r(16, 2, 12, 7);
            // Plaster texture
            ctx.fillStyle = '#c8b898';
            r(6, 14, 4, 2);
            r(20, 4, 3, 2);
            // Timber grain
            ctx.fillStyle = colors.shadow;
            r(4, 10, 8, 1);
            r(18, 21, 6, 1);
            r(14, 6, 1, 4);
            // Nails
            ctx.fillStyle = '#555555';
            r(5, 9, 1, 1);
            r(25, 20, 1, 1);
        } else if (name === 'shop_awning') {
            // Detailed striped awning with scalloped edge and shadows
            ctx.fillStyle = colors.highlight;
            for (let sx = 0; sx < 32; sx += 8) {
                r(sx, 0, 4, 28);
            }
            // Scalloped bottom edge
            ctx.fillStyle = colors.shadow;
            r(0, 28, 32, 4);
            // Edge detail
            ctx.fillStyle = colors.highlight;
            r(2, 28, 4, 1);
            r(10, 28, 4, 1);
            r(18, 28, 4, 1);
            r(26, 28, 4, 1);
            // Support rod
            ctx.fillStyle = '#666666';
            r(0, 2, 32, 1);
        } else if (name === 'tavern_sign') {
            // Detailed hanging tavern sign with icon, chains, and board grain
            // Chains
            ctx.fillStyle = '#888888';
            r(10, 0, 2, 8);
            r(20, 0, 2, 8);
            // Chain links
            ctx.fillStyle = '#666666';
            r(10, 2, 2, 1);
            r(10, 5, 2, 1);
            r(20, 2, 2, 1);
            r(20, 5, 2, 1);
            // Sign board
            ctx.fillStyle = colors.highlight;
            r(3, 8, 26, 18);
            // Board border
            ctx.fillStyle = '#3a2810';
            r(3, 8, 26, 1);
            r(3, 25, 26, 1);
            r(3, 8, 1, 18);
            r(28, 8, 1, 18);
            // Dark text area
            ctx.fillStyle = '#222222';
            r(6, 11, 20, 12);
            // Mug icon
            ctx.fillStyle = '#e8d068';
            r(9, 13, 5, 6);
            r(14, 15, 2, 4);
            // Tankard foam
            ctx.fillStyle = '#f0e8c0';
            r(9, 13, 5, 2);
            // Second mug
            ctx.fillStyle = '#e8d068';
            r(18, 13, 5, 6);
            r(17, 15, 1, 4);
        } else if (name === 'magic_wall') {
            // Animated mystical wall with glowing runes and arcane patterns
            ctx.fillStyle = colors.highlight;
            r(0, 8, 32, 1);
            r(0, 16, 32, 1);
            r(0, 24, 32, 1);
            // Stone block pattern
            ctx.fillStyle = colors.shadow;
            r(14, 2, 1, 6);
            r(8, 10, 1, 6);
            r(22, 10, 1, 6);
            r(14, 18, 1, 6);
            // Glowing rune marks (animated)
            const runeAlpha = 0.4 + 0.3 * Math.sin((gridX * 3 + gridY * 7) + performance.now() / 600);
            ctx.fillStyle = '#8868d0';
            ctx.globalAlpha = runeAlpha;
            r(9, 3, 5, 5);
            r(18, 11, 5, 5);
            r(6, 19, 5, 5);
            r(22, 19, 4, 4);
            // Rune detail
            ctx.fillStyle = '#b090f0';
            r(10, 4, 3, 3);
            r(19, 12, 3, 3);
            r(7, 20, 3, 3);
            ctx.globalAlpha = 1.0;
        } else if (name === 'magic_roof') {
            // Mystical roof with star constellations and shimmer
            ctx.fillStyle = colors.shadow;
            r(0, 7, 32, 1);
            r(0, 15, 32, 1);
            r(0, 23, 32, 1);
            // Star pattern
            ctx.fillStyle = '#c8b8f0';
            r(12, 10, 4, 4);
            r(13, 9, 2, 1);
            r(13, 14, 2, 1);
            r(11, 11, 1, 2);
            r(16, 11, 1, 2);
            // Second star
            r(24, 20, 3, 3);
            r(25, 19, 1, 1);
            r(25, 23, 1, 1);
            // Shimmer dots
            ctx.fillStyle = '#d8d0f8';
            r(6, 4, 1, 1);
            r(20, 6, 1, 1);
            r(8, 26, 1, 1);
        } else if (name === 'wood_floor') {
            // Detailed wood plank floor with grain, gaps, and wear marks
            ctx.fillStyle = colors.shadow;
            r(0, 6, 32, 1);
            r(0, 13, 32, 1);
            r(0, 20, 32, 1);
            r(0, 27, 32, 1);
            // Staggered plank joints
            const jx = 10 + ((gridX * 11) % 12);
            r(jx, 0, 1, 6);
            r((jx + 14) % 30 + 1, 7, 1, 6);
            r((jx + 8) % 30 + 1, 14, 1, 6);
            r((jx + 20) % 30 + 1, 21, 1, 6);
            // Wood grain within planks
            ctx.fillStyle = colors.highlight;
            r(4, 2, 10, 1);
            r(20, 9, 8, 1);
            r(8, 16, 12, 1);
            r(16, 23, 10, 1);
            // Knot detail
            ctx.fillStyle = colors.shadow;
            r(18 + (hash * 6 | 0), 3, 2, 2);
            r(8 + (hash2 * 6 | 0), 23, 2, 2);
        } else if (name === 'fireplace') {
            // Detailed stone fireplace with flames, embers, and warm glow
            // Stone surround
            ctx.fillStyle = colors.highlight;
            r(3, 3, 26, 26);
            // Stone blocks
            ctx.fillStyle = colors.shadow;
            r(3, 3, 26, 2);
            r(3, 27, 26, 2);
            r(3, 3, 2, 26);
            r(27, 3, 2, 26);
            // Inner fireplace
            ctx.fillStyle = '#2a2020';
            r(7, 7, 18, 18);
            // Fire layers
            ctx.fillStyle = '#d85020';
            r(9, 12, 14, 12);
            ctx.fillStyle = '#e88030';
            r(11, 10, 10, 10);
            ctx.fillStyle = '#f8b040';
            r(13, 8, 6, 8);
            ctx.fillStyle = '#f8d850';
            r(14, 6, 4, 6);
            // Flame tip
            ctx.fillStyle = '#ffe870';
            r(15, 5, 2, 3);
            // Embers
            ctx.fillStyle = '#ff6020';
            r(10, 22, 2, 1);
            r(18, 20, 2, 1);
            r(14, 23, 2, 1);
            // Log
            ctx.fillStyle = '#4a3020';
            r(8, 22, 16, 3);
            // Warm glow
            ctx.fillStyle = 'rgba(255, 140, 40, 0.12)';
            ctx.fillRect(dx, dy, size, size);
        } else if (name === 'counter') {
            // Detailed shop/inn counter with grain, edge trim, and items
            // Counter surface
            ctx.fillStyle = colors.highlight;
            r(2, 2, 28, 12);
            // Surface grain
            ctx.fillStyle = colors.base;
            r(4, 4, 12, 1);
            r(20, 6, 8, 1);
            r(8, 9, 10, 1);
            // Edge trim
            ctx.fillStyle = colors.shadow;
            r(0, 13, 32, 3);
            // Support legs below
            ctx.fillStyle = colors.shadow;
            r(4, 16, 3, 14);
            r(25, 16, 3, 14);
            r(14, 18, 3, 12);
            // Shelf behind
            ctx.fillStyle = colors.highlight;
            r(6, 20, 20, 1);
        } else if (name === 'bookshelf') {
            // Detailed bookshelf with varied book sizes, colors, and shelf detail
            const bookColors = ['#c04040', '#40a040', '#4060c0', '#c0a030', '#a040a0', '#c06030', '#30a0a0'];
            // Shelf boards
            ctx.fillStyle = colors.shadow;
            r(1, 14, 30, 2);
            r(1, 0, 30, 2);
            r(1, 30, 30, 2);
            // Upper shelf books (varied heights)
            for (let bx = 2; bx < 29; bx += 4) {
                const bh = 8 + ((bx * 3 + gridX) % 4);
                ctx.fillStyle = bookColors[(bx + gridX) % bookColors.length];
                r(bx, 16 - bh + 2, 3, bh);
                // Book spine line
                ctx.fillStyle = colors.shadow;
                r(bx + 1, 16 - bh + 3, 1, bh - 2);
            }
            // Lower shelf books
            for (let bx = 2; bx < 29; bx += 4) {
                const bh = 8 + ((bx * 7 + gridY) % 4);
                ctx.fillStyle = bookColors[(bx + gridY + 3) % bookColors.length];
                r(bx, 32 - bh - 2, 3, bh);
            }
            // Side panels
            ctx.fillStyle = colors.shadow;
            r(0, 0, 2, 32);
            r(30, 0, 2, 32);
        } else if (name === 'table') {
            // Detailed wooden table with surface, legs, and items
            // Table surface
            ctx.fillStyle = colors.highlight;
            r(2, 4, 28, 14);
            // Surface grain
            ctx.fillStyle = colors.base;
            r(4, 6, 10, 1);
            r(18, 10, 8, 1);
            r(8, 14, 14, 1);
            // Edge shadow
            ctx.fillStyle = colors.shadow;
            r(2, 16, 28, 2);
            // Legs
            ctx.fillStyle = colors.shadow;
            r(4, 18, 4, 12);
            r(24, 18, 4, 12);
            // Cross beam
            ctx.fillStyle = colors.highlight;
            r(8, 24, 16, 2);
        } else if (name === 'anvil') {
            // Detailed blacksmith anvil with horn, face, hardy hole, and base
            // Anvil face (top)
            ctx.fillStyle = '#9090a0';
            r(4, 6, 24, 6);
            // Horn (left side)
            ctx.fillStyle = '#888898';
            r(2, 8, 6, 3);
            r(0, 9, 3, 1);
            // Heel (right side)
            r(26, 8, 4, 3);
            // Face highlight
            ctx.fillStyle = '#a8a8b8';
            r(6, 7, 20, 2);
            // Hardy hole
            ctx.fillStyle = '#333333';
            r(20, 8, 3, 3);
            // Waist
            ctx.fillStyle = colors.highlight;
            r(8, 12, 16, 4);
            // Base
            ctx.fillStyle = colors.base;
            r(6, 16, 20, 8);
            ctx.fillStyle = colors.shadow;
            r(4, 24, 24, 4);
            // Base edge highlight
            ctx.fillStyle = colors.highlight;
            r(6, 24, 20, 1);
        } else if (name === 'forge_fire') {
            // Detailed forge with brick, flames, bellows, and sparks
            // Forge body
            ctx.fillStyle = '#4a3030';
            r(2, 4, 28, 24);
            // Brick pattern
            ctx.fillStyle = '#5a3838';
            r(2, 10, 28, 1);
            r(2, 18, 28, 1);
            r(14, 4, 1, 6);
            r(8, 12, 1, 6);
            r(22, 12, 1, 6);
            // Fire in center
            ctx.fillStyle = '#e85020';
            r(6, 8, 20, 16);
            ctx.fillStyle = '#f8a030';
            r(8, 10, 16, 12);
            ctx.fillStyle = '#f8d850';
            r(10, 12, 12, 8);
            ctx.fillStyle = '#ffe878';
            r(12, 14, 8, 4);
            // Sparks
            ctx.fillStyle = '#ffe080';
            r(5, 4, 2, 2);
            r(22, 2, 2, 2);
            r(14, 2, 2, 2);
            r(26, 6, 2, 2);
            // Coal bed
            ctx.fillStyle = '#cc4020';
            r(8, 22, 16, 4);
            ctx.fillStyle = '#882010';
            r(10, 24, 4, 2);
            r(18, 24, 4, 2);
        } else if (name === 'carpet') {
            // Ornate carpet with border pattern, tassels, and center design
            // Main carpet body
            ctx.fillStyle = '#b84040';
            r(2, 2, 28, 28);
            // Outer border (gold)
            ctx.fillStyle = '#d8a040';
            r(3, 3, 26, 2);
            r(3, 27, 26, 2);
            r(3, 3, 2, 26);
            r(27, 3, 2, 26);
            // Inner border
            ctx.fillStyle = '#c86838';
            r(6, 6, 20, 1);
            r(6, 25, 20, 1);
            r(6, 6, 1, 20);
            r(25, 6, 1, 20);
            // Center diamond motif
            ctx.fillStyle = '#d8a040';
            r(14, 10, 4, 4);
            r(12, 12, 8, 8);
            r(14, 18, 4, 4);
            // Center dot
            ctx.fillStyle = '#e8d070';
            r(15, 14, 2, 2);
            // Corner details
            ctx.fillStyle = '#c88030';
            r(4, 4, 2, 2);
            r(26, 4, 2, 2);
            r(4, 26, 2, 2);
            r(26, 26, 2, 2);
        } else if (name === 'potion_shelf') {
            // Detailed shelf with potion bottles, labels, and shelf boards
            // Shelf boards
            ctx.fillStyle = colors.shadow;
            r(1, 14, 30, 2);
            r(1, 0, 30, 2);
            r(1, 30, 30, 2);
            // Side panels
            r(0, 0, 2, 32);
            r(30, 0, 2, 32);
            // Upper shelf potions (with bottle shapes)
            // Red health potion
            ctx.fillStyle = '#e04040';
            r(3, 5, 5, 9);
            ctx.fillStyle = '#cc2020';
            r(4, 4, 3, 2);
            // Blue mana potion
            ctx.fillStyle = '#4080e0';
            r(10, 6, 5, 8);
            ctx.fillStyle = '#2060c0';
            r(11, 4, 3, 3);
            // Green potion
            ctx.fillStyle = '#40c040';
            r(17, 5, 5, 9);
            ctx.fillStyle = '#20a020';
            r(18, 3, 3, 3);
            // Yellow potion
            ctx.fillStyle = '#e0d040';
            r(24, 6, 5, 8);
            ctx.fillStyle = '#c8b020';
            r(25, 4, 3, 3);
            // Lower shelf potions
            ctx.fillStyle = '#c040c0';
            r(4, 18, 5, 10);
            ctx.fillStyle = '#a020a0';
            r(5, 16, 3, 3);
            ctx.fillStyle = '#40c0c0';
            r(12, 19, 5, 9);
            ctx.fillStyle = '#20a0a0';
            r(13, 17, 3, 3);
            ctx.fillStyle = '#e08040';
            r(20, 18, 5, 10);
            ctx.fillStyle = '#c06020';
            r(21, 16, 3, 3);
            // Cork stoppers
            ctx.fillStyle = '#a08060';
            r(4, 4, 3, 1);
            r(11, 4, 3, 1);
            r(18, 3, 3, 1);
            r(25, 4, 3, 1);
        } else if (name === 'bed') {
            // Detailed bed with headboard, pillow, blanket folds, and frame
            // Bed frame
            ctx.fillStyle = colors.highlight;
            r(2, 2, 28, 28);
            // Headboard
            ctx.fillStyle = '#5a4030';
            r(2, 2, 28, 4);
            ctx.fillStyle = '#6a5040';
            r(4, 3, 24, 2);
            // Pillow
            ctx.fillStyle = '#e8e0d0';
            r(4, 6, 24, 8);
            ctx.fillStyle = '#f0e8e0';
            r(6, 7, 20, 4);
            // Pillow indent
            ctx.fillStyle = '#d8d0c0';
            r(10, 8, 12, 2);
            // Blanket
            ctx.fillStyle = '#4060a0';
            r(4, 15, 24, 14);
            // Blanket fold line
            ctx.fillStyle = '#3050a0';
            r(4, 15, 24, 2);
            // Blanket wrinkle
            ctx.fillStyle = '#506cb0';
            r(8, 20, 16, 1);
            r(6, 26, 20, 1);
            // Blanket pattern
            ctx.fillStyle = '#3858a8';
            r(10, 22, 4, 4);
            r(18, 22, 4, 4);
            // Side rails
            ctx.fillStyle = '#5a4030';
            r(2, 6, 2, 24);
            r(28, 6, 2, 24);
        }
    }

    _formatRegionName(regionId) {
        // Named overrides for building interiors and key locations
        const REGION_NAMES = {
            starter_town: 'Willowshade',
            starter_route: 'Verdant Route',
            fire_temple: 'Blazecore Sanctum',
            mom_house: "Mom's House",
            healer_hut: 'Healer Clinic',
            general_store: "Grin's General Goods",
            potion_shop: 'Alchemy Shop',
            blacksmith_forge: "Doran's Forge",
            professor_lab: "Professor Elm's Lab",
            tavern_inn: 'Wandering Sprite Inn',
        };
        return REGION_NAMES[regionId] || regionId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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

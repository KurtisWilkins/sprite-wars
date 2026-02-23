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
        this._currentRegion = this._gameData.currentRegion || 'starter_town';

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
    //  STARTER TOWN — 24x24 hand-crafted overworld map
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
            // Row 0  — north border: dense forest
            6, 6, 7, 6, 6, 7, 6, 7, 6, 6, 7, 6, 6, 7, 6, 6, 7, 6, 7, 6, 6, 7, 6, 6,
            // Row 1  — forest with a few clearings
            6, 7, 8, 0, 7, 6, 8, 0, 7, 6, 8, 0, 0, 8, 6, 7, 0, 8, 6, 7, 8, 0, 7, 6,
            // Row 2  — forest edge, path begins heading south
            7, 0, 0, 8, 0, 7, 0, 0, 8, 7, 0, 2, 2, 0, 7, 8, 0, 0, 7, 0, 0, 8, 0, 7,
            // Row 3  — transition: trees thin out, path continues
            6, 0, 8, 0, 0, 0, 8, 0, 0, 0, 0, 2, 2, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 6,
            // Row 4  — west pond area + vertical path
            9, 0, 0, 0, 4, 4, 5, 0, 0, 13, 13, 3, 3, 13, 13, 0, 0, 0, 0, 0, 0, 0, 0, 9,
            // Row 5  — pond continues, path goes east-west
            0, 0, 0, 5, 4, 4, 5, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 11,11,11, 0, 0, 0, 0,
            // Row 6  — pond edge, healer building area
            0, 0, 0, 5, 4, 5, 0, 0, 15, 0, 1, 0, 0, 1, 0, 0, 0, 10, 0, 10, 0, 0, 0, 0,
            // Row 7  — open area, path continues
            0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 10,12, 10, 0, 0, 0, 0,
            // Row 8  — west fence, path intersection row
            0, 13, 0, 0, 0, 0, 0, 11,11,11, 3, 1, 1, 3, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0,
            // Row 9  — shop building area + path
            0, 13, 0, 0, 0, 0, 0, 10, 0, 10, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,
            // Row 10 — shop door + path + fountain row approaches
            0, 0, 0, 0, 17, 0, 0, 10,12, 10, 2, 0, 0, 2, 0, 0, 16, 0, 0, 0, 1, 0, 0, 0,
            // Row 11 — main east-west avenue + fountain
            0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 3, 1, 18, 1, 3, 1, 1, 1, 1, 1, 3, 1, 1, 19,
            // Row 12 — main east-west avenue (south side of square)
            0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 3, 1, 18, 1, 3, 1, 1, 1, 1, 1, 3, 1, 1, 19,
            // Row 13 — path + town hall building
            0, 0, 0, 0, 17, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 11,11,11,11, 1, 0, 0, 0,
            // Row 14 — path continues south
            0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 10, 0, 0, 10, 1, 0, 0, 0,
            // Row 15 — south buildings + path
            0, 0, 0, 11,11,11, 0, 0, 0, 13, 3, 1, 1, 3, 13, 0, 10,12, 0, 10, 1, 0, 8, 0,
            // Row 16 — south building doors
            0, 0, 0, 10, 0, 10, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 13, 0, 0, 13, 0, 0, 0, 0,
            // Row 17 — more south area
            0, 0, 0, 10,12, 10, 0, 17, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0,
            // Row 18 — open grassy area south
            0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 8, 0, 0, 0, 0, 8, 0,
            // Row 19 — fence row before south exit
            0, 0, 0, 0, 0, 8, 0, 0, 13, 13, 3, 1, 1, 3, 13, 13, 0, 0, 8, 0, 0, 0, 0, 0,
            // Row 20 — path to south transition
            0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0,
            // Row 21 — approaching south exit
            0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0,
            // Row 22 — south exit path
            9, 0, 0, 0, 0, 0, 8, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 8, 0, 0, 0, 0, 0, 9,
            // Row 23 — south border
            9, 9, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 9, 9,
        ];

        // Collision map: 1 = solid, 0 = passable
        // Solid tiles: trees (6,7), water (4), rocks (9), house walls (10),
        //              house roofs (11), fences (13), water edges (5 when blocking)
        // Passable: grass (0), paths (1,2,3), flowers (8), doors (12), bridge (14),
        //           signs (15), chests (16), lamps (17), fountain (18), stairs (19)
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
            defaultSpawn: { x: 11, y: 18 },
            npcs: [
                {
                    id: 'elder',
                    name: 'Temple Elder',
                    gridX: 12,
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
                    gridX: 18,
                    gridY: 6,
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
                    gridX: 8,
                    gridY: 9,
                    type: 'shop',
                    facing: 'right',
                    dialogue: [
                        'Looking to buy supplies? You have come to the right place!',
                        'I stock potions, crystals, and other essentials.',
                        'Come back any time -- my door is always open!',
                    ],
                },
                {
                    id: 'quest_guide',
                    name: 'Scout Renn',
                    gridX: 22,
                    gridY: 11,
                    type: 'quest',
                    facing: 'left',
                    dialogue: [
                        'The cave entrance to the east leads to the Blazecore Sanctum.',
                        'Fire-type Sprites lurk within. Their guardian is formidable.',
                        'I have seen trainers rush in unprepared... it never ends well.',
                        'If you bring me a Fire Gem, I can teach your Sprites fire resistance!',
                    ],
                },
            ],
            transitions: [
                // East side: leads to fire_temple
                {
                    gridX: 23,
                    gridY: 11,
                    width: 1,
                    height: 2,
                    targetRegion: 'fire_temple',
                    targetSpawn: { x: 1, y: 12 },
                },
                // South side: leads to starter_route
                {
                    gridX: 9,
                    gridY: 23,
                    width: 6,
                    height: 1,
                    targetRegion: 'starter_route',
                    targetSpawn: { x: 12, y: 1 },
                },
            ],
            encounterZones: [
                // Light encounters only in the northern forest area
                { x1: 0, y1: 0, x2: 23, y2: 3, encounterRate: 0.08, minLevel: 1, maxLevel: 3 },
            ],
        };
    }

    // ══════════════════════════════════════════════════════════════════════
    //  FIRE TEMPLE (Blazecore Sanctum) — 24x24 cave/dungeon map
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
            // Row 0  — solid cave wall (north border / boss arena top)
            10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,
            // Row 1  — boss arena north wall with torches
            10,10,10,10,10,10, 0,17, 0, 0, 0, 0, 0, 0, 0, 0,17, 0,10,10,10,10,10,10,
            // Row 2  — boss arena open space
            10,10,10,10,10,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10,10,10,10,10,10,
            // Row 3  — boss arena with altar
            10,10,10,10,10,10, 0, 0, 0, 0, 0,18, 18, 0, 0, 0, 0, 0,10,10,10,10,10,10,
            // Row 4  — boss arena floor
            10,10,10,10,10,10, 0, 0, 0,13, 0, 0, 0, 0,13, 0, 0, 0,10,10,10,10,10,10,
            // Row 5  — boss arena south wall + corridor entrance
            10,10,10,10,10,10,10,10,10,10,10,12, 12,10,10,10,10,10,10,10,10,10,10,10,
            // Row 6  — narrow corridor heading south
            10,10,10,10,10,10,10,10,10,10, 0, 0, 0, 0,10,10,10,10,10,10,10,10,10,10,
            // Row 7  — corridor with torch
            10,10,10,10,10,10,10,10,10,10, 0,17, 0, 0,10,10,10,10,10,10,10,10,10,10,
            // Row 8  — corridor opens to east chamber
            10,10,10,10,10,10,10,10,10,10, 0, 0,12, 0, 0, 0, 0,17, 0,10,10,10,10,10,
            // Row 9  — east lava chamber
            10,10,10,10,10,10,10,10,10,10, 0, 0, 0, 5, 4, 4, 5, 0, 0,10,10,10,10,10,
            // Row 10 — east chamber with lava pool
            10,10,10,10,10,10,10,10,10,10, 0, 0, 0, 5, 4, 4, 5, 0,16,10,10,10,10,10,
            // Row 11 — chamber south + corridor continues
            10,10,10,10,10,10,10,10,10,10, 0,17, 0, 0, 5, 5, 0, 0, 0,10,10,10,10,10,
            // Row 12 — main east-west corridor (connects to entrance)
            19, 0, 0, 0, 0, 1, 1, 1,17, 1, 3, 1, 1, 1, 0, 0, 0, 0, 0,10,10,10,10,10,
            // Row 13 — corridor with south branch
            10,10,10,10, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0,10,10,10,10,10,10,10,10,10,10,
            // Row 14 — south corridor with west puzzle room
            10,10,10,10, 0,17, 0, 0,10,10, 2, 0,10,10,10,10,10,10,10,10,10,10,10,10,
            // Row 15 — west puzzle room entrance
            10,10,10,10,12, 0, 0,13,10,10, 2, 0,10,10,10,10,10,10,10,10,10,10,10,10,
            // Row 16 — west puzzle room
            10, 0, 0, 0, 0, 0,15, 0,10,10, 2, 0,10,10,10,10,10,10,10,10,10,10,10,10,
            // Row 17 — puzzle room with chest + rune
            10, 0,16, 0, 0, 0, 0,17,10,10, 2, 0, 0, 0,12, 0, 0,17, 0,10,10,10,10,10,
            // Row 18 — puzzle room south wall
            10, 0, 0,15, 0,13, 0, 0,10,10, 0, 0,10, 0, 0, 0, 0, 0, 0,10,10,10,10,10,
            // Row 19 — corridor continues south
            10,10,10,10,10,10,10,10,10,10, 0, 0,10, 0, 5, 4, 4, 5, 0,10,10,10,10,10,
            // Row 20 — south rest area approach
            10,10,10,10,10,10,10,10,10, 0, 0,17,10, 0, 5, 4, 4, 5, 0,10,10,10,10,10,
            // Row 21 — south rest area
            10,10,10,10,10,10,10,10,10, 0,18, 0,10, 0, 0, 5, 5, 0, 0,10,10,10,10,10,
            // Row 22 — rest area with healer NPC spot
            10,10,10,10,10,10,10,10,10, 0, 0,17,10, 0, 0, 0, 0, 0,16,10,10,10,10,10,
            // Row 23 — south border
            10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,
        ];

        // Collision: walls (10,11), lava (4), stalagmites (6,7), rocks (9), pillars (13)
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
            defaultSpawn: { x: 1, y: 12 },
            npcs: [
                {
                    id: 'temple_guard',
                    name: 'Fire Acolyte',
                    gridX: 11,
                    gridY: 7,
                    type: 'talk',
                    facing: 'down',
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
                    gridX: 10,
                    gridY: 21,
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
                // West side exit: back to starter_town
                {
                    gridX: 0,
                    gridY: 12,
                    width: 1,
                    height: 1,
                    targetRegion: 'starter_town',
                    targetSpawn: { x: 22, y: 11 },
                },
            ],
            encounterZones: [
                // Corridor encounters (moderate rate)
                { x1: 1, y1: 6, x2: 18, y2: 11, encounterRate: 0.18, minLevel: 3, maxLevel: 7 },
                // South chambers (slightly higher level)
                { x1: 1, y1: 13, x2: 18, y2: 22, encounterRate: 0.20, minLevel: 4, maxLevel: 8 },
                // Boss arena (scripted, lower random rate)
                { x1: 6, y1: 1, x2: 17, y2: 5, encounterRate: 0.05, minLevel: 6, maxLevel: 10 },
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

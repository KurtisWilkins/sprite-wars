/**
 * SpriteCenterScene -- Sprite management hub for Sprite Wars.
 * Provides tab-based navigation for Team, Storage, and Registry management.
 *
 * - Team tab: party of 6, tap to view details, drag to reorder
 * - Storage tab: PC box grid system, deposit/withdraw sprites
 * - Registry tab: Pokedex-style grid showing all 72 forms (seen/caught)
 * - Sprite detail: stats, abilities, equipment, evolution progress
 * - Equipment management (equip/unequip items)
 * - RTS ability management (1 basic + 1 advanced/passive ability with targeting)
 *
 * Uses DOM panels for the UI and Canvas for sprite previews.
 *
 * enter(data) receives:
 *   { tab: string } (optional, default 'team')
 */

import { Scene } from '../core/SceneManager.js';
import { eventBus, GameEvents } from '../core/EventBus.js';
import { SPRITE_RACES, EVOLUTION_FORMS } from '../data/SpriteData.js';
import { ABILITIES } from '../data/AbilityData.js';
import { LEARNSETS } from '../data/LearnsetData.js';
import { UnitRenderer, ELEMENT_COLORS as UR_ELEMENT_COLORS } from '../systems/ui/UnitRenderer.js';
import { EQUIPMENT, findEquipmentWithExpansion } from '../data/EquipmentData.js';
import { SkeletalAnimationSystem } from '../systems/rendering/SkeletalAnimationSystem.js';
import { getRaceSpritePath, getFormSpritePath } from '../data/SpriteTextureHelper.js';

// ── Helpers ─────────────────────────────────────────────────────────────────
function _getSpriteName(inst) {
    if (inst.nickname) return inst.nickname;
    const race = SPRITE_RACES.find(r => r.race_id === inst.raceId);
    return race ? race.race_name : `Sprite #${inst.raceId || '?'}`;
}

// ── Constants ───────────────────────────────────────────────────────────────
const TABS = ['team', 'storage', 'registry'];
const TAB_LABELS = { team: 'Team', storage: 'Storage', registry: 'Registry' };
const TOTAL_RACES = 24;
const STAGES_PER_RACE = 3;
const TOTAL_FORMS = TOTAL_RACES * STAGES_PER_RACE; // 72
const MAX_PARTY_SIZE = 6;
const MAX_EQUIPPED_ABILITIES = 2; // RTS auto-battle: 1 basic + 1 advanced/passive
const STORAGE_BOX_SIZE = 30; // sprites per box
const STORAGE_BOX_COLS = 6;
const REGISTRY_COLS = 8;
const SPRITE_PREVIEW_SIZE = 128;

// ── Equipment Slot Config ─────────────────────────────────────────────────
const EQUIP_SLOT_ICONS = {
    helmet:  '\u26D1',  // helmet
    weapon:  '\u2694',  // crossed swords
    chest:   '\u{1F6E1}', // shield
    gloves:  '\u{1F9E4}', // gloves
    legs:    '\u{1F456}', // jeans/legs
    boots:   '\u{1F462}', // boots
    ring:    '\u{1F48D}', // ring
    amulet:  '\u{1F4FF}', // prayer beads / amulet
    crystal: '\u{1F48E}', // gem / crystal
};

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
const RARITY_COLORS_GLOBAL = {
    common: '#888888', uncommon: '#33cc66', rare: '#3399ff', epic: '#aa44ff', legendary: '#ffaa00',
};

// Stat display labels
const STAT_LABELS = { hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD', sp_atk: 'SP.ATK', sp_def: 'SP.DEF' };
const STAT_COLORS = {
    hp: '#33cc66', atk: '#ff6644', def: '#4488ff', spd: '#66ffcc', sp_atk: '#ff66aa', sp_def: '#66aaff',
};

// Stat weights for power score calculation
const STAT_WEIGHTS = { hp: 0.5, atk: 1.2, def: 1.0, spd: 1.1, sp_atk: 1.2, sp_def: 1.0 };

const ELEMENT_COLORS = {
    Fire: '#ff5533', Water: '#3399ff', Earth: '#996633', Wind: '#88ccaa',
    Electric: '#ffcc00', Ice: '#99ddff', Plant: '#33aa33', Poison: '#aa33aa',
    Light: '#ffee99', Dark: '#553366', Metal: '#aaaacc', Fairy: '#ff66aa',
    Lunar: '#ff8833', Solar: '#ccccff',
};

// ── Targeting Type Icons & Descriptions ──────────────────────────────────────
const TARGETING_ICONS = {
    single_enemy:    '\u{1F3AF}', // direct hit
    row:             '\u2194',    // left-right arrow (row sweep)
    column:          '\u2195',    // up-down arrow (column pierce)
    aoe_circle:      '\u{1F4A5}', // explosion (area)
    all_enemies:     '\u{1F525}', // fire (hits all enemies)
    random:          '\u{1F3B2}', // dice (random)
    cross:           '\u271A',    // cross pattern
    diamond:         '\u{1F537}', // diamond
    line:            '\u2192',    // arrow right (piercing line)
    adjacent:        '\u{1F91C}', // fist (adjacent)
    self:            '\u{1F6E1}', // shield (self)
    single_ally:     '\u{1F49A}', // green heart (heal ally)
    all_allies:      '\u{1F49B}', // yellow heart (team heal)
    adjacent_allies: '\u{1F91D}', // handshake (nearby allies)
    random_ally:     '\u2728',    // sparkle (random ally)
};

const TARGETING_DESCRIPTIONS = {
    single_enemy:    'Targets one enemy',
    row:             'Hits all enemies in a row',
    column:          'Hits all enemies in a column',
    aoe_circle:      'Hits all enemies in an area',
    all_enemies:     'Strikes every enemy on the field',
    random:          'Hits a random enemy',
    cross:           'Hits enemies in a cross pattern',
    diamond:         'Hits enemies in a diamond pattern',
    line:            'Pierces through enemies in a line',
    adjacent:        'Hits enemies on adjacent tiles',
    self:            'Affects the user only',
    single_ally:     'Targets one ally',
    all_allies:      'Affects the entire team',
    adjacent_allies: 'Affects nearby allies',
    random_ally:     'Affects a random ally',
};

// ── Ability classification for RTS auto-battle ──────────────────────────────
// Basic: low power, no cooldown, bread-and-butter damage/heal
// Advanced/Passive: high power, cooldown > 0, AoE, or status-focused
function _classifyAbility(ability) {
    if (!ability) return 'basic';
    if (ability.cooldown_turns > 0) return 'advanced';
    if (ability.base_power >= 70) return 'advanced';
    if (['aoe_circle', 'all_enemies', 'row', 'column', 'cross', 'diamond', 'all_allies'].includes(ability.targeting_type)) return 'advanced';
    if (ability.base_power === 0 && ability.status_effect_ids && ability.status_effect_ids.length > 0) return 'advanced';
    return 'basic';
}

// ── Evolution stage names ────────────────────────────────────────────────────
const STAGE_NAMES = { 1: 'Hatchling', 2: 'Adept', 3: 'Apex' };
const STAGE_DESCRIPTIONS = {
    1: 'The base form of this Sprite. Young and still developing its full potential.',
    2: 'An evolved form with heightened stats and new combat abilities.',
    3: 'The final evolution. A fully realized Sprite at the peak of its power.',
};

const COLOR_BG = '#1a2a3a';  // Medieval fantasy flat dark blue

export class SpriteCenterScene extends Scene {
    constructor(engine) {
        super(engine);

        // ── Tab state ─────────────────────────────────────────────────
        this._activeTab = 'team';

        // ── Player data references ────────────────────────────────────
        this._party = [];       // Array of sprite data objects (up to 6)
        this._storage = [];     // Array of storage boxes, each an array of sprite data
        this._registry = {};    // Map of formId -> { seen: bool, caught: bool }
        this._inventory = [];   // Player's item inventory
        this._equipmentInventory = []; // Player's equipment inventory (equipment IDs)

        // ── Storage browsing ──────────────────────────────────────────
        this._currentBoxIndex = 0;

        // ── Detail view ───────────────────────────────────────────────
        this._detailSprite = null;
        this._detailMode = 'stats'; // 'stats', 'abilities', 'equipment', 'evolution'

        // ── Team drag-reorder ─────────────────────────────────────────
        this._dragIndex = -1;
        this._dragOverIndex = -1;

        // ── Ability management ────────────────────────────────────────
        this._abilityManagementSprite = null;
        this._learnedAbilities = [];
        this._equippedAbilities = [];

        // ── DOM references ────────────────────────────────────────────
        this._domContainer = null;
        this._tabBarEl = null;
        this._contentEl = null;
        this._detailPanelEl = null;
        this._previewCanvasEl = null;
        this._previewCtx = null;

        // ── Animation time tracking ──────────────────────────────────
        this._time = 0;
        this._animAccum = 0;
        this._previewCanvases = [];

        // ── Equipment preview animation ──────────────────────────────
        this._equipPreviewCanvas = null;
        this._equipPreviewFrame = 0;
        this._equipPreviewAccum = 0;
        this._equipPreviewInst = null;

        // ── Equipment popup sort state ───────────────────────────────
        this._equipSortMode = 'rarity'; // 'rarity', 'stat', 'level'

        // ── Equipment preview walk animation ─────────────────────────
        this._equipPreviewDir = 0;       // 0=down,1=left,2=right,3=up
        this._equipPreviewAnimTimer = 0;

        // ── Event cleanup ─────────────────────────────────────────────
        this._unsubs = [];

        // ── Inject CSS keyframes for equipment UI (once) ─────────────
        if (!document.getElementById('sprite-center-equip-styles')) {
            const style = document.createElement('style');
            style.id = 'sprite-center-equip-styles';
            style.textContent = `
                @keyframes equip-slot-pulse-epic {
                    0%, 100% { box-shadow: 0 0 4px #aa44ff55; }
                    50% { box-shadow: 0 0 12px #aa44ffaa; }
                }
                @keyframes equip-slot-pulse-legendary {
                    0%, 100% { box-shadow: 0 0 6px #ffaa0055; }
                    50% { box-shadow: 0 0 16px #ffaa00cc, 0 0 24px #ffaa0044; }
                }
                @keyframes equip-power-shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @media (orientation: portrait) and (max-width: 600px) {
                    .sprite-center-detail-panel {
                        width: 100% !important;
                        max-width: 100vw !important;
                        position: absolute !important;
                        top: 0 !important; left: 0 !important;
                        right: 0 !important; bottom: 0 !important;
                        z-index: 20;
                        border-left: none !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════

    async init() {
        this.initialized = true;
    }

    enter(data) {
        this._activeTab = (data && data.tab && TABS.includes(data.tab)) ? data.tab : 'team';
        this._detailSprite = null;
        this._detailMode = 'stats';
        this._dragIndex = -1;
        this._dragOverIndex = -1;
        this._currentBoxIndex = 0;
        this._abilityManagementSprite = null;

        // Load player data from engine state
        this._loadPlayerData();

        // Preload sprite assets for visual rendering
        UnitRenderer.preloadTeam(this.engine, this._party).catch(() => {});
        for (const box of this._storage) {
            UnitRenderer.preloadTeam(this.engine, box || []).catch(() => {});
        }

        // Build DOM
        this._createDOM();
        this._setActiveTab(this._activeTab);

        // Auto-select the first sprite in the party by default
        if (this._activeTab === 'team' && this._party.length > 0) {
            this._showSpriteDetail(this._party[0]);
        }

        // Music
        this.engine.audio.playMusic(
            this.engine.assets.resolvePath('Audio/Music/SpriteCenter.wav')
        );

        // Subscribe to data changes
        this._unsubs.push(
            eventBus.on(GameEvents.TEAM_CHANGED, () => {
                this._loadPlayerData();
                if (this._activeTab === 'team') this._renderTeamTab();
            })
        );
        this._unsubs.push(
            eventBus.on(GameEvents.EQUIPMENT_CHANGED, () => {
                this._loadPlayerData();
                if (this._detailSprite) this._renderDetailPanel();
            })
        );

        eventBus.emit(GameEvents.SCREEN_OPENED, 'sprite_center');
    }

    exit() {
        for (const unsub of this._unsubs) {
            if (typeof unsub === 'function') unsub();
        }
        this._unsubs = [];

        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
        }
        this._domContainer = null;
        this._tabBarEl = null;
        this._contentEl = null;
        this._detailPanelEl = null;
        this._previewCanvasEl = null;
        this._previewCtx = null;
        this._equipPreviewCanvas = null;
        this._equipPreviewInst = null;

        eventBus.emit(GameEvents.SCREEN_CLOSED, 'sprite_center');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Update / Render
    // ═══════════════════════════════════════════════════════════════════

    update(dt) {
        super.update(dt);
        this._time += dt;
        this._animAccum = (this._animAccum || 0) + dt;
        if (this._animAccum > 0.2 && this._previewCanvases) {
            this._animAccum = 0;
            for (const { canvas, inst, opts } of this._previewCanvases) {
                const pCtx = canvas.getContext('2d');
                pCtx.clearRect(0, 0, canvas.width, canvas.height);
                UnitRenderer.draw(pCtx, inst, opts.cx, opts.cy, opts.size, { ...opts, time: this._time });
            }
        }

        // ── Animated equipment preview (walk cycle) ──────────────
        if (this._equipPreviewCanvas && this._equipPreviewInst) {
            this._equipPreviewAnimTimer = (this._equipPreviewAnimTimer || 0) + dt;
            if (this._equipPreviewAnimTimer > 0.18) {
                this._equipPreviewAnimTimer = 0;
                this._equipPreviewFrame = ((this._equipPreviewFrame || 0) + 1) % 4;

                const canvas = this._equipPreviewCanvas;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const inst = this._equipPreviewInst;
                const raceId = inst.raceId || inst.race_id || 1;
                const stage = inst.evolutionStage || inst.evolution_stage || 1;
                const equipment = inst.equipment || {};
                HumanoidSpriteSystem.drawWithEquipment(
                    ctx, raceId, stage,
                    this._equipPreviewDir, this._equipPreviewFrame,
                    128, 190, 180,
                    { equipment }
                );
            }
        }
    }

    render(renderer) {
        renderer.clear(COLOR_BG);

        // Render the sprite preview canvas onto the main canvas if detail is showing
        if (this._detailSprite && this._previewCanvasEl) {
            this._renderSpritePreview();
        }

        super.render(renderer);
    }

    onInput(input) {
        // Keyboard tab switching
        if (input.isKeyJustPressed('Digit1')) this._setActiveTab('team');
        if (input.isKeyJustPressed('Digit2')) this._setActiveTab('storage');
        if (input.isKeyJustPressed('Digit3')) this._setActiveTab('registry');
        if (input.isKeyJustPressed('Escape')) this._goBack();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Data Loading
    // ═══════════════════════════════════════════════════════════════════

    _loadPlayerData() {
        const gm = this.engine.gameManager;
        const pd = (gm && gm.playerData) ? gm.playerData : (this.engine.state || this.engine.gameState || {});
        this._party = pd.team || pd.party || [];
        this._storage = pd.storage || pd.spriteStorage || [[]];
        this._registry = pd.spriteRegistry || pd.registry || {};
        this._inventory = pd.inventory || pd.items || [];
        this._equipmentInventory = pd.equipmentInventory || [];

        // Ensure at least one storage box
        if (this._storage.length === 0) {
            this._storage.push([]);
        }
    }

    _savePlayerData() {
        const gm = this.engine.gameManager;
        const pd = (gm && gm.playerData) ? gm.playerData : (this.engine.state || this.engine.gameState || {});
        pd.team = this._party;
        pd.storage = this._storage;
        pd.spriteStorage = this._storage;
        pd.spriteRegistry = this._registry;
        pd.inventory = this._inventory;
        pd.equipmentInventory = this._equipmentInventory;
    }

    // ═══════════════════════════════════════════════════════════════════
    // DOM Construction
    // ═══════════════════════════════════════════════════════════════════

    _createDOM() {
        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
        }

        this._domContainer = document.createElement('div');
        this._domContainer.id = 'sprite-center-scene';
        this._domContainer.style.cssText = `
            position:absolute;top:0;left:0;width:100%;height:100%;
            pointer-events:auto;z-index:10;
            display:flex;flex-direction:column;background:${COLOR_BG};
        `;

        // Header bar with back button and title
        const headerBar = document.createElement('div');
        headerBar.style.cssText = `
            display:flex;align-items:center;padding:8px 12px;gap:12px;
            background:rgba(0,0,0,0.5);border-bottom:1px solid rgba(255,255,255,0.08);
            flex-shrink:0;
        `;

        const backBtn = document.createElement('button');
        backBtn.style.cssText = `
            padding:4px 12px;font-size:0.8rem;border:1px solid #555;
            border-radius:6px;background:rgba(0,0,0,0.5);color:#aaa;cursor:pointer;
        `;
        backBtn.textContent = '\u2190';
        backBtn.addEventListener('click', () => this._goBack());
        headerBar.appendChild(backBtn);

        const title = document.createElement('span');
        title.style.cssText = 'color:#ffcc33;font-size:1rem;font-weight:700;';
        title.textContent = 'Sprite Center';
        headerBar.appendChild(title);

        this._domContainer.appendChild(headerBar);

        // Tab bar
        this._tabBarEl = document.createElement('div');
        this._tabBarEl.style.cssText = `
            display:flex;background:rgba(0,0,0,0.3);
            border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;
        `;
        for (const tab of TABS) {
            const tabBtn = document.createElement('button');
            tabBtn.dataset.tab = tab;
            tabBtn.style.cssText = `
                flex:1;padding:10px 0;font-size:0.8rem;font-weight:600;
                border:none;cursor:pointer;transition:background 0.15s,color 0.15s;
                background:transparent;color:#888;
                border-bottom:2px solid transparent;
            `;
            tabBtn.textContent = TAB_LABELS[tab];
            tabBtn.addEventListener('click', () => this._setActiveTab(tab));
            this._tabBarEl.appendChild(tabBtn);
        }
        this._domContainer.appendChild(this._tabBarEl);

        // Main content area (split into content + detail)
        const mainArea = document.createElement('div');
        mainArea.style.cssText = 'display:flex;flex:1;overflow:hidden;';

        this._contentEl = document.createElement('div');
        this._contentEl.style.cssText = `
            flex:1;overflow-y:auto;padding:8px;
        `;
        mainArea.appendChild(this._contentEl);

        this._detailPanelEl = document.createElement('div');
        this._detailPanelEl.className = 'sprite-center-detail-panel';
        this._detailPanelEl.style.cssText = `
            width:50%;max-width:50vw;background:rgba(0,0,0,0.4);
            border-left:1px solid rgba(255,255,255,0.06);
            overflow-y:auto;padding:10px;display:none;
        `;
        mainArea.appendChild(this._detailPanelEl);

        this._domContainer.appendChild(mainArea);

        const gameContainer = document.getElementById('game-container') || document.body;
        gameContainer.appendChild(this._domContainer);
    }

    _setActiveTab(tab) {
        this._activeTab = tab;
        this._detailSprite = null;
        this._detailPanelEl.style.display = 'none';
        this._abilityManagementSprite = null;

        // Update tab bar styling
        const tabBtns = this._tabBarEl.querySelectorAll('button');
        for (const btn of tabBtns) {
            const isActive = btn.dataset.tab === tab;
            btn.style.color = isActive ? '#ffcc33' : '#888';
            btn.style.borderBottom = isActive ? '2px solid #ffcc33' : '2px solid transparent';
            btn.style.background = isActive ? 'rgba(255,204,51,0.05)' : 'transparent';
        }

        // Render the tab content
        switch (tab) {
            case 'team':
                this._renderTeamTab();
                break;
            case 'storage':
                this._renderStorageTab();
                break;
            case 'registry':
                this._renderRegistryTab();
                break;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Team Tab
    // ═══════════════════════════════════════════════════════════════════

    _renderTeamTab() {
        this._contentEl.innerHTML = '';
        this._previewCanvases = [];

        const header = document.createElement('div');
        header.style.cssText = 'color:#aaa;font-size:0.75rem;margin-bottom:8px;';
        header.textContent = `Party (${this._party.length}/${MAX_PARTY_SIZE})`;
        this._contentEl.appendChild(header);

        if (this._party.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color:#555;font-size:0.8rem;text-align:center;padding:40px 0;';
            empty.textContent = 'No sprites in your party.';
            this._contentEl.appendChild(empty);
            return;
        }

        const list = document.createElement('div');
        list.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

        for (let i = 0; i < this._party.length; i++) {
            const sprite = this._party[i];
            const row = this._createTeamRow(sprite, i);
            list.appendChild(row);
        }

        this._contentEl.appendChild(list);
    }

    _createTeamRow(sprite, index) {
        const inst = sprite.instance || sprite;
        const raceData = sprite.raceData || {};
        const elemTypes = inst.elementTypes || inst.element_types || raceData.elementTypes || [];

        const row = document.createElement('div');
        row.dataset.teamIndex = index;
        row.draggable = true;
        row.style.cssText = `
            display:flex;align-items:center;gap:10px;padding:8px 10px;
            background:rgba(255,255,255,0.03);border-radius:8px;
            border:1px solid rgba(255,255,255,0.06);cursor:grab;
            transition:background 0.15s,transform 0.15s;
        `;

        // Position number
        const posNum = document.createElement('div');
        posNum.style.cssText = 'color:#555;font-size:0.7rem;font-weight:700;width:16px;text-align:center;';
        posNum.textContent = `${index + 1}`;
        row.appendChild(posNum);

        // PNG race sprite portrait (primary display)
        const hp = inst.currentHp !== undefined ? inst.currentHp : (inst.maxHp || 100);
        const maxHp = inst.maxHp || 100;
        const raceId = inst.raceId || inst.race_id || 1;
        const formId = inst.formId || inst.form_id || 1;
        const stage = ((formId - 1) % 3);
        const portraitWrap = document.createElement('div');
        portraitWrap.style.cssText = 'position:relative;width:52px;height:58px;flex-shrink:0;overflow:hidden;';
        const racePath = getRaceSpritePath(raceId, stage);
        if (racePath) {
            const raceImg = document.createElement('img');
            raceImg.src = racePath;
            raceImg.style.cssText = 'width:52px;height:52px;object-fit:contain;image-rendering:pixelated;';
            raceImg.onerror = () => { raceImg.style.display = 'none'; };
            portraitWrap.appendChild(raceImg);
        }

        // Canvas overlay (equipment rendering)
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 52;
        previewCanvas.height = 58;
        previewCanvas.style.cssText = 'position:absolute;top:0;left:0;width:52px;height:58px;';
        const pCtx = previewCanvas.getContext('2d');
        UnitRenderer.draw(pCtx, inst, 26, 26, 46, {
            time: this._time,
            showHpBar: true,
            hpFraction: hp / maxHp,
            showLevel: true,
            showAura: true,
            showWeapon: true,
            showArmorGlow: true,
            showElementBadge: true,
        });
        portraitWrap.appendChild(previewCanvas);
        row.appendChild(portraitWrap);
        this._previewCanvases.push({
            canvas: previewCanvas,
            inst,
            opts: { cx: 26, cy: 26, size: 46, showHpBar: true, hpFraction: hp / maxHp, showLevel: true, showAura: true, showWeapon: true, showArmorGlow: true, showElementBadge: true },
        });

        // Info block
        const info = document.createElement('div');
        info.style.cssText = 'flex:1;';

        const nameSpan = document.createElement('div');
        nameSpan.style.cssText = 'font-size:0.8rem;font-weight:600;color:#ddddee;';
        nameSpan.textContent = _getSpriteName(inst);
        info.appendChild(nameSpan);

        const detailSpan = document.createElement('div');
        detailSpan.style.cssText = 'font-size:0.6rem;color:#888;';
        detailSpan.textContent = `Lv${inst.level || 1} | ${elemTypes.join('/') || '???'}`;
        info.appendChild(detailSpan);

        // HP bar
        const hpFrac = Math.max(0, Math.min(1, hp / maxHp));
        const hpBar = document.createElement('div');
        hpBar.style.cssText = `
            width:100%;height:4px;background:#1a1a2e;border-radius:2px;
            margin-top:3px;overflow:hidden;
        `;
        const hpFill = document.createElement('div');
        const hpColor = hpFrac > 0.5 ? '#33cc66' : hpFrac > 0.25 ? '#cccc33' : '#cc3333';
        hpFill.style.cssText = `width:${hpFrac * 100}%;height:100%;background:${hpColor};`;
        hpBar.appendChild(hpFill);
        info.appendChild(hpBar);

        row.appendChild(info);

        // Tap to view details
        row.addEventListener('click', () => {
            this._showSpriteDetail(sprite);
        });

        // Drag to reorder
        row.addEventListener('dragstart', (e) => {
            this._dragIndex = index;
            row.style.opacity = '0.5';
            e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', () => {
            this._dragIndex = -1;
            this._dragOverIndex = -1;
            row.style.opacity = '1';
        });
        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            this._dragOverIndex = index;
            row.style.background = 'rgba(50,150,255,0.1)';
        });
        row.addEventListener('dragleave', () => {
            row.style.background = 'rgba(255,255,255,0.03)';
        });
        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.style.background = 'rgba(255,255,255,0.03)';
            if (this._dragIndex >= 0 && this._dragIndex !== index) {
                this._reorderParty(this._dragIndex, index);
            }
        });

        return row;
    }

    _reorderParty(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this._party.length) return;
        if (toIndex < 0 || toIndex >= this._party.length) return;

        const moved = this._party.splice(fromIndex, 1)[0];
        this._party.splice(toIndex, 0, moved);
        this._savePlayerData();
        this._renderTeamTab();

        eventBus.emit(GameEvents.TEAM_CHANGED, this._party);

        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.3
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // Storage Tab
    // ═══════════════════════════════════════════════════════════════════

    _renderStorageTab() {
        this._contentEl.innerHTML = '';
        this._previewCanvases = [];

        // Box navigation
        const boxNav = document.createElement('div');
        boxNav.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:10px;';

        const prevBtn = document.createElement('button');
        prevBtn.style.cssText = `
            padding:4px 12px;font-size:0.8rem;border:1px solid #444;
            border-radius:4px;background:rgba(0,0,0,0.4);color:#aaa;cursor:pointer;
        `;
        prevBtn.textContent = '\u25C0';
        prevBtn.addEventListener('click', () => {
            if (this._currentBoxIndex > 0) {
                this._currentBoxIndex--;
                this._renderStorageTab();
            }
        });
        boxNav.appendChild(prevBtn);

        const boxLabel = document.createElement('span');
        boxLabel.style.cssText = 'color:#ccccdd;font-size:0.85rem;font-weight:600;';
        boxLabel.textContent = `Box ${this._currentBoxIndex + 1} / ${this._storage.length}`;
        boxNav.appendChild(boxLabel);

        const nextBtn = document.createElement('button');
        nextBtn.style.cssText = `
            padding:4px 12px;font-size:0.8rem;border:1px solid #444;
            border-radius:4px;background:rgba(0,0,0,0.4);color:#aaa;cursor:pointer;
        `;
        nextBtn.textContent = '\u25B6';
        nextBtn.addEventListener('click', () => {
            if (this._currentBoxIndex < this._storage.length - 1) {
                this._currentBoxIndex++;
                this._renderStorageTab();
            }
        });
        boxNav.appendChild(nextBtn);

        // Add new box button
        const addBoxBtn = document.createElement('button');
        addBoxBtn.style.cssText = `
            padding:4px 8px;font-size:0.7rem;border:1px solid #336633;
            border-radius:4px;background:rgba(30,60,30,0.4);color:#88cc88;cursor:pointer;
        `;
        addBoxBtn.textContent = '+ Box';
        addBoxBtn.addEventListener('click', () => {
            this._storage.push([]);
            this._currentBoxIndex = this._storage.length - 1;
            this._savePlayerData();
            this._renderStorageTab();
        });
        boxNav.appendChild(addBoxBtn);

        this._contentEl.appendChild(boxNav);

        // Box grid
        const box = this._storage[this._currentBoxIndex] || [];
        const grid = document.createElement('div');
        grid.style.cssText = `
            display:grid;grid-template-columns:repeat(${STORAGE_BOX_COLS}, 1fr);
            gap:4px;
        `;

        for (let i = 0; i < STORAGE_BOX_SIZE; i++) {
            const sprite = box[i] || null;
            const cell = document.createElement('div');

            const spriteInst = sprite ? (sprite.instance || sprite) : null;
            const elemTypes = spriteInst && spriteInst.elementTypes ? spriteInst.elementTypes : (sprite && sprite.raceData ? (sprite.raceData.elementTypes || []) : []);
            const elemColor = ELEMENT_COLORS[elemTypes[0]] || '#333';
            const borderColor = sprite ? elemColor : 'rgba(255,255,255,0.06)';

            cell.style.cssText = `
                aspect-ratio:1;border-radius:6px;
                border:1px solid ${borderColor};
                background:${sprite ? `${elemColor}15` : 'rgba(255,255,255,0.02)'};
                display:flex;align-items:center;justify-content:center;
                flex-direction:column;cursor:${sprite ? 'pointer' : 'default'};
                transition:background 0.15s;
            `;

            if (sprite) {
                const inst = sprite.instance || sprite;

                // PNG race sprite (primary display)
                const sRaceId = inst.raceId || inst.race_id || 1;
                const sFormId = inst.formId || inst.form_id || 1;
                const sStage = ((sFormId - 1) % 3);
                const sPath = getRaceSpritePath(sRaceId, sStage);
                if (sPath) {
                    const sImg = document.createElement('img');
                    sImg.src = sPath;
                    sImg.style.cssText = 'width:48px;height:48px;object-fit:contain;image-rendering:pixelated;';
                    sImg.onerror = () => { sImg.style.display = 'none'; };
                    cell.appendChild(sImg);
                }

                // Canvas overlay (equipment rendering)
                const cellCanvas = document.createElement('canvas');
                cellCanvas.width = 56;
                cellCanvas.height = 60;
                cellCanvas.style.cssText = 'width:56px;height:60px;position:absolute;top:0;left:0;';
                cell.style.position = 'relative';
                const cCtx = cellCanvas.getContext('2d');
                UnitRenderer.draw(cCtx, inst, 28, 28, 48, {
                    time: this._time,
                    showHpBar: false,
                    showLevel: true,
                    showAura: true,
                    showWeapon: true,
                    showArmorGlow: true,
                    showElementBadge: true,
                });
                cell.appendChild(cellCanvas);
                this._previewCanvases.push({
                    canvas: cellCanvas,
                    inst,
                    opts: { cx: 28, cy: 28, size: 48, showHpBar: false, showLevel: true, showAura: true, showWeapon: true, showArmorGlow: true, showElementBadge: true },
                });

                const nameLabel = document.createElement('div');
                nameLabel.style.cssText = 'font-size:0.5rem;color:#aaa;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;padding:0 2px;';
                nameLabel.textContent = inst.nickname || `#${inst.raceId || '?'}`;
                cell.appendChild(nameLabel);

                cell.addEventListener('click', () => this._showSpriteDetail(sprite));
                cell.addEventListener('mouseenter', () => { cell.style.background = `${elemColor}25`; });
                cell.addEventListener('mouseleave', () => { cell.style.background = `${elemColor}15`; });
            } else {
                const emptyLabel = document.createElement('div');
                emptyLabel.style.cssText = 'font-size:0.6rem;color:#333;';
                emptyLabel.textContent = '-';
                cell.appendChild(emptyLabel);
            }

            grid.appendChild(cell);
        }

        this._contentEl.appendChild(grid);

        // Action buttons (deposit/withdraw)
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'display:flex;gap:8px;margin-top:12px;justify-content:center;';

        const depositInfo = document.createElement('div');
        depositInfo.style.cssText = 'color:#666;font-size:0.65rem;text-align:center;';
        depositInfo.textContent = 'Tap a sprite in your party, then tap an empty slot to deposit. Tap a stored sprite to view or withdraw.';
        actionsDiv.appendChild(depositInfo);

        this._contentEl.appendChild(actionsDiv);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Registry Tab
    // ═══════════════════════════════════════════════════════════════════

    _renderRegistryTab() {
        this._contentEl.innerHTML = '';

        // Stats header
        let seenCount = 0;
        let caughtCount = 0;
        for (let formId = 1; formId <= TOTAL_FORMS; formId++) {
            const entry = this._registry[formId];
            if (entry) {
                if (entry.seen) seenCount++;
                if (entry.caught) caughtCount++;
            }
        }

        const statsHeader = document.createElement('div');
        statsHeader.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:10px;font-size:0.7rem;';

        const seenLabel = document.createElement('span');
        seenLabel.style.cssText = 'color:#8888aa;';
        seenLabel.textContent = `Seen: ${seenCount}/${TOTAL_FORMS}`;
        statsHeader.appendChild(seenLabel);

        const caughtLabel = document.createElement('span');
        caughtLabel.style.cssText = 'color:#88cc88;';
        caughtLabel.textContent = `Caught: ${caughtCount}/${TOTAL_FORMS}`;
        statsHeader.appendChild(caughtLabel);

        this._contentEl.appendChild(statsHeader);

        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.style.cssText = 'width:100%;height:6px;background:#1a1a2e;border-radius:3px;margin-bottom:12px;overflow:hidden;';
        const progressFill = document.createElement('div');
        progressFill.style.cssText = `width:${(caughtCount / TOTAL_FORMS) * 100}%;height:100%;background:#33cc66;`;
        progressBar.appendChild(progressFill);
        this._contentEl.appendChild(progressBar);

        // Registry grid grouped by race
        for (let raceId = 1; raceId <= TOTAL_RACES; raceId++) {
            const raceGroup = document.createElement('div');
            raceGroup.style.cssText = 'margin-bottom:8px;';

            // Race header
            const raceHeader = document.createElement('div');
            raceHeader.style.cssText = 'font-size:0.6rem;color:#666;margin-bottom:3px;';
            raceHeader.textContent = `Race #${raceId}`;
            raceGroup.appendChild(raceHeader);

            const formRow = document.createElement('div');
            formRow.style.cssText = 'display:flex;gap:4px;';

            for (let stage = 1; stage <= STAGES_PER_RACE; stage++) {
                const formId = (raceId - 1) * STAGES_PER_RACE + stage;
                const entry = this._registry[formId] || {};
                const seen = !!entry.seen;
                const caught = !!entry.caught;

                const formCell = document.createElement('div');
                let bgColor, borderColor, textColor;

                if (caught) {
                    bgColor = 'rgba(50,200,100,0.15)';
                    borderColor = '#33cc66';
                    textColor = '#88ff88';
                } else if (seen) {
                    bgColor = 'rgba(100,100,150,0.1)';
                    borderColor = '#555577';
                    textColor = '#8888aa';
                } else {
                    bgColor = 'rgba(20,20,30,0.5)';
                    borderColor = 'rgba(255,255,255,0.04)';
                    textColor = '#333';
                }

                formCell.style.cssText = `
                    width:48px;height:48px;border-radius:6px;
                    border:1px solid ${borderColor};background:${bgColor};
                    display:flex;align-items:center;justify-content:center;
                    flex-direction:column;cursor:${seen ? 'pointer' : 'default'};
                `;

                // PNG race sprite for seen/caught forms
                if (caught || seen) {
                    const formSpritePath = getFormSpritePath(formId);
                    if (formSpritePath) {
                        const formImg = document.createElement('img');
                        formImg.src = formSpritePath;
                        formImg.style.cssText = `width:36px;height:36px;object-fit:contain;image-rendering:pixelated;${seen && !caught ? 'filter:brightness(0.5);' : ''}`;
                        formImg.onerror = () => { formImg.style.display = 'none'; };
                        formCell.appendChild(formImg);
                    }
                }

                // Stage indicator
                const stageLabel = document.createElement('div');
                stageLabel.style.cssText = `font-size:0.55rem;color:${textColor};font-weight:600;`;
                if (caught || seen) {
                    const stageNames = ['Base', 'Evo 1', 'Evo 2'];
                    stageLabel.textContent = stageNames[stage - 1] || `S${stage}`;
                } else {
                    stageLabel.textContent = '???';
                }
                formCell.appendChild(stageLabel);

                // Form ID
                const idLabel = document.createElement('div');
                idLabel.style.cssText = `font-size:0.5rem;color:${textColor};opacity:0.6;`;
                idLabel.textContent = `#${formId}`;
                formCell.appendChild(idLabel);

                // Caught/seen icon
                if (caught) {
                    const icon = document.createElement('div');
                    icon.style.cssText = 'font-size:0.5rem;color:#33cc66;';
                    icon.textContent = '\u2714'; // checkmark
                    formCell.appendChild(icon);
                } else if (seen) {
                    const icon = document.createElement('div');
                    icon.style.cssText = 'font-size:0.5rem;color:#8888aa;';
                    icon.textContent = '\u25CB'; // circle
                    formCell.appendChild(icon);
                }

                if (seen) {
                    const fid = formId;
                    formCell.addEventListener('click', () => this._showRegistryDetail(fid));
                }

                formRow.appendChild(formCell);
            }

            raceGroup.appendChild(formRow);
            this._contentEl.appendChild(raceGroup);
        }
    }

    _showRegistryDetail(formId) {
        const entry = this._registry[formId] || {};
        if (!entry.seen) return;

        // Show basic form info in detail panel
        this._detailPanelEl.style.display = 'block';
        this._detailPanelEl.innerHTML = '';

        const title = document.createElement('div');
        title.style.cssText = 'font-size:0.85rem;font-weight:700;color:#ffcc33;margin-bottom:6px;';
        const raceId = Math.ceil(formId / STAGES_PER_RACE);
        const stage = ((formId - 1) % STAGES_PER_RACE) + 1;
        title.textContent = entry.name || `Race #${raceId} - Stage ${stage}`;
        this._detailPanelEl.appendChild(title);

        const formInfo = document.createElement('div');
        formInfo.style.cssText = 'font-size:0.7rem;color:#aaa;margin-bottom:8px;';
        formInfo.textContent = `Form #${formId} | ${entry.caught ? 'Caught' : 'Seen'}`;
        this._detailPanelEl.appendChild(formInfo);

        // PNG race sprite portrait (primary display in registry detail)
        const regSpritePath = getFormSpritePath(formId);
        if (regSpritePath) {
            const regImg = document.createElement('img');
            regImg.src = regSpritePath;
            regImg.style.cssText = 'display:block;width:96px;height:96px;object-fit:contain;image-rendering:pixelated;margin:0 auto 10px auto;border-radius:8px;background:rgba(0,0,0,0.3);padding:4px;';
            regImg.onerror = () => { regImg.style.display = 'none'; };
            this._detailPanelEl.appendChild(regImg);
        }

        // Elements
        if (entry.elementTypes && entry.elementTypes.length > 0) {
            const elemDiv = document.createElement('div');
            elemDiv.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;';
            for (const elem of entry.elementTypes) {
                const elemTag = document.createElement('span');
                const color = ELEMENT_COLORS[elem] || '#888';
                elemTag.style.cssText = `
                    padding:2px 8px;border-radius:10px;font-size:0.6rem;
                    background:${color}33;color:${color};border:1px solid ${color}66;
                `;
                elemTag.textContent = elem;
                elemDiv.appendChild(elemTag);
            }
            this._detailPanelEl.appendChild(elemDiv);
        }

        // Description (if available)
        if (entry.description) {
            const desc = document.createElement('div');
            desc.style.cssText = 'font-size:0.65rem;color:#888;line-height:1.4;';
            desc.textContent = entry.description;
            this._detailPanelEl.appendChild(desc);
        }

        // Habitat (if available)
        if (entry.habitat) {
            const habitat = document.createElement('div');
            habitat.style.cssText = 'font-size:0.6rem;color:#666;margin-top:6px;';
            habitat.textContent = `Habitat: ${entry.habitat}`;
            this._detailPanelEl.appendChild(habitat);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Sprite Detail Panel
    // ═══════════════════════════════════════════════════════════════════

    _showSpriteDetail(sprite) {
        this._detailSprite = sprite;
        this._detailMode = 'stats';
        this._detailPanelEl.style.display = 'block';
        this._renderDetailPanel();

        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.3
        );
    }

    _renderDetailPanel() {
        this._detailPanelEl.innerHTML = '';
        // Clear equipment animation state when re-rendering (it'll be re-created if equipment mode)
        this._equipPreviewCanvas = null;
        this._equipPreviewInst = null;

        const sprite = this._detailSprite;
        if (!sprite) {
            this._detailPanelEl.style.display = 'none';
            return;
        }

        const inst = sprite.instance || sprite;
        const raceData = sprite.raceData || {};
        const stageData = sprite.stageData || {};
        const abilities = sprite.abilities || inst.abilities || [];
        const elemTypes = inst.elementTypes || inst.element_types || raceData.elementTypes || [];

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            position:absolute;top:4px;right:4px;padding:2px 6px;font-size:0.7rem;
            border:none;background:none;color:#888;cursor:pointer;
        `;
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', () => {
            this._detailSprite = null;
            this._detailPanelEl.style.display = 'none';
        });
        this._detailPanelEl.style.position = 'relative';
        this._detailPanelEl.appendChild(closeBtn);

        // Name and level
        const nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:0.9rem;font-weight:700;color:#ffcc33;margin-bottom:2px;';
        nameEl.textContent = _getSpriteName(inst);
        this._detailPanelEl.appendChild(nameEl);

        const levelEl = document.createElement('div');
        levelEl.style.cssText = 'font-size:0.65rem;color:#aaa;margin-bottom:8px;';
        levelEl.textContent = `Lv${inst.level || 1} | ${elemTypes.join(' / ') || '???'}`;
        this._detailPanelEl.appendChild(levelEl);

        // Element tags
        if (elemTypes.length > 0) {
            const elemDiv = document.createElement('div');
            elemDiv.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap;';
            for (const elem of elemTypes) {
                const tag = document.createElement('span');
                const color = ELEMENT_COLORS[elem] || '#888';
                tag.style.cssText = `
                    padding:1px 6px;border-radius:8px;font-size:0.55rem;
                    background:${color}33;color:${color};border:1px solid ${color}55;
                `;
                tag.textContent = elem;
                elemDiv.appendChild(tag);
            }
            this._detailPanelEl.appendChild(elemDiv);
        }

        // Sprite preview + class/race info row
        const previewRow = document.createElement('div');
        previewRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';

        const detailCanvas = document.createElement('canvas');
        detailCanvas.width = 128;
        detailCanvas.height = 144;
        detailCanvas.style.cssText = 'width:128px;height:144px;flex-shrink:0;';
        const dCtx = detailCanvas.getContext('2d');
        UnitRenderer.draw(dCtx, inst, 64, 64, 112, {
            time: this._time,
            showHpBar: true,
            hpFraction: (inst.currentHp || inst.maxHp || 100) / (inst.maxHp || 100),
            showLevel: true,
            showAura: true,
            showWeapon: true,
            showArmorGlow: true,
            showElementBadge: true,
            showStatusIcons: false,
        });
        previewRow.appendChild(detailCanvas);
        this._previewCanvases.push({
            canvas: detailCanvas,
            inst,
            opts: { cx: 64, cy: 64, size: 112, showHpBar: true, hpFraction: (inst.currentHp || inst.maxHp || 100) / (inst.maxHp || 100), showLevel: true, showAura: true, showWeapon: true, showArmorGlow: true, showElementBadge: true, showStatusIcons: false },
        });

        // Class & race summary next to preview
        const summaryCol = document.createElement('div');
        summaryCol.style.cssText = 'flex:1;min-width:0;';
        const classType = inst.classType || inst.class_type || raceData.classType || raceData.class_type || (raceData.available_classes && raceData.available_classes[0]) || 'Fighter';
        const rarity = raceData.rarity || 'common';
        const rarityColor = RARITY_COLORS_GLOBAL[rarity] || '#888';
        const classLine = document.createElement('div');
        classLine.style.cssText = `font-size:0.6rem;color:${rarityColor};font-weight:600;`;
        classLine.textContent = `${classType} \u2022 ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}`;
        summaryCol.appendChild(classLine);
        const stageLine = document.createElement('div');
        const currentStage = inst.evolutionStage || 1;
        stageLine.style.cssText = 'font-size:0.55rem;color:#777;';
        stageLine.textContent = `Stage ${currentStage}/3 \u2022 ${STAGE_NAMES[currentStage] || 'Unknown'}`;
        summaryCol.appendChild(stageLine);
        // HP bar text
        const hpLine = document.createElement('div');
        hpLine.style.cssText = 'font-size:0.55rem;color:#33cc66;margin-top:2px;';
        hpLine.textContent = `HP: ${inst.currentHp || inst.maxHp || '???'}/${inst.maxHp || '???'}`;
        summaryCol.appendChild(hpLine);
        previewRow.appendChild(summaryCol);
        this._detailPanelEl.appendChild(previewRow);

        // Mode tabs (Stats, Abilities, Equipment, Evolution)
        const modeTabs = document.createElement('div');
        modeTabs.style.cssText = 'display:flex;gap:2px;margin-bottom:8px;flex-wrap:wrap;';
        const modes = [
            { id: 'stats', label: 'Stats' },
            { id: 'abilities', label: 'Abilities' },
            { id: 'equipment', label: 'Equip' },
            { id: 'evolution', label: 'Evo' },
        ];
        for (const mode of modes) {
            const modeBtn = document.createElement('button');
            const isActive = this._detailMode === mode.id;
            modeBtn.style.cssText = `
                padding:3px 8px;font-size:0.6rem;border-radius:4px;cursor:pointer;
                border:1px solid ${isActive ? '#ffcc33' : '#444'};
                background:${isActive ? 'rgba(255,204,51,0.1)' : 'transparent'};
                color:${isActive ? '#ffcc33' : '#888'};
            `;
            modeBtn.textContent = mode.label;
            modeBtn.addEventListener('click', () => {
                this._detailMode = mode.id;
                this._renderDetailPanel();
            });
            modeTabs.appendChild(modeBtn);
        }
        this._detailPanelEl.appendChild(modeTabs);

        // Content per mode
        const modeContent = document.createElement('div');

        switch (this._detailMode) {
            case 'stats':
                this._renderStatsMode(modeContent, inst, raceData, stageData);
                break;
            case 'abilities':
                this._renderAbilitiesMode(modeContent, inst, abilities);
                break;
            case 'equipment':
                this._renderEquipmentMode(modeContent, inst);
                break;
            case 'evolution':
                this._renderEvolutionMode(modeContent, inst, raceData, stageData);
                break;
        }

        this._detailPanelEl.appendChild(modeContent);

        // Action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'display:flex;gap:4px;margin-top:10px;flex-wrap:wrap;';

        // Deposit/Withdraw button
        const isInParty = this._party.includes(sprite);
        if (isInParty && this._party.length > 1) {
            const depositBtn = document.createElement('button');
            depositBtn.style.cssText = `
                padding:4px 8px;font-size:0.6rem;border:1px solid #cc8833;
                border-radius:4px;background:rgba(100,60,20,0.3);color:#ccaa66;cursor:pointer;
            `;
            depositBtn.textContent = 'Deposit';
            depositBtn.addEventListener('click', () => this._depositSprite(sprite));
            actionsDiv.appendChild(depositBtn);
        } else if (!isInParty && this._party.length < MAX_PARTY_SIZE) {
            const withdrawBtn = document.createElement('button');
            withdrawBtn.style.cssText = `
                padding:4px 8px;font-size:0.6rem;border:1px solid #3388cc;
                border-radius:4px;background:rgba(20,60,100,0.3);color:#66aacc;cursor:pointer;
            `;
            withdrawBtn.textContent = 'Withdraw';
            withdrawBtn.addEventListener('click', () => this._withdrawSprite(sprite));
            actionsDiv.appendChild(withdrawBtn);
        }

        this._detailPanelEl.appendChild(actionsDiv);
    }

    _renderStatsMode(container, inst, raceData, stageData) {
        // ── Element / Race / Class info block ──
        const infoBlock = document.createElement('div');
        infoBlock.style.cssText = 'margin-bottom:10px;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,255,255,0.06);';

        // Race
        const raceId = inst.raceId || inst.race_id || 0;
        const raceEntry = SPRITE_RACES.find(r => r.race_id === raceId);
        const raceName = raceEntry ? raceEntry.race_name : (raceData.raceName || raceData.race_name || 'Unknown');
        const raceLine = document.createElement('div');
        raceLine.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
        const raceLabel = document.createElement('span');
        raceLabel.style.cssText = 'font-size:0.55rem;color:#666;width:48px;';
        raceLabel.textContent = 'RACE';
        raceLine.appendChild(raceLabel);
        const raceValue = document.createElement('span');
        raceValue.style.cssText = 'font-size:0.65rem;color:#ddddee;font-weight:600;';
        raceValue.textContent = raceName;
        raceLine.appendChild(raceValue);
        infoBlock.appendChild(raceLine);

        // Class
        const classType = inst.classType || inst.class_type || raceData.classType || raceData.class_type || (raceData.available_classes && raceData.available_classes[0]) || 'Fighter';
        const classLine = document.createElement('div');
        classLine.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';
        const classLabel = document.createElement('span');
        classLabel.style.cssText = 'font-size:0.55rem;color:#666;width:48px;';
        classLabel.textContent = 'CLASS';
        classLine.appendChild(classLabel);
        const classValue = document.createElement('span');
        classValue.style.cssText = 'font-size:0.65rem;color:#ccbbff;font-weight:600;';
        classValue.textContent = classType;
        classLine.appendChild(classValue);
        infoBlock.appendChild(classLine);

        // Element
        const elemTypes = inst.elementTypes || inst.element_types || raceData.elementTypes || raceData.element_types || [];
        const elemLine = document.createElement('div');
        elemLine.style.cssText = 'display:flex;align-items:center;gap:6px;';
        const elemLabel = document.createElement('span');
        elemLabel.style.cssText = 'font-size:0.55rem;color:#666;width:48px;';
        elemLabel.textContent = 'ELEM';
        elemLine.appendChild(elemLabel);
        const elemTags = document.createElement('div');
        elemTags.style.cssText = 'display:flex;gap:3px;flex-wrap:wrap;';
        if (elemTypes.length > 0) {
            for (const elem of elemTypes) {
                const tag = document.createElement('span');
                const color = ELEMENT_COLORS[elem] || '#888';
                tag.style.cssText = `
                    padding:1px 6px;border-radius:8px;font-size:0.55rem;
                    background:${color}33;color:${color};border:1px solid ${color}55;font-weight:600;
                `;
                tag.textContent = elem;
                elemTags.appendChild(tag);
            }
        } else {
            const unknownTag = document.createElement('span');
            unknownTag.style.cssText = 'font-size:0.6rem;color:#666;';
            unknownTag.textContent = '???';
            elemTags.appendChild(unknownTag);
        }
        elemLine.appendChild(elemTags);
        infoBlock.appendChild(elemLine);

        container.appendChild(infoBlock);

        // Calculate stats if method exists
        let stats = null;
        if (inst.calculateAllEffectiveStats && raceData && stageData) {
            stats = inst.calculateAllEffectiveStats(raceData, stageData);
        }

        const statKeys = [
            { key: 'hp', label: 'HP', color: '#33cc66' },
            { key: 'atk', label: 'ATK', color: '#ff6644' },
            { key: 'def', label: 'DEF', color: '#4488ff' },
            { key: 'sp_atk', label: 'SP.ATK', color: '#ff66aa' },
            { key: 'sp_def', label: 'SP.DEF', color: '#66aaff' },
            { key: 'spd', label: 'SPD', color: '#66ffcc' },
        ];

        const maxStat = 200; // scale reference for stat bars

        for (const s of statKeys) {
            const val = stats ? Math.floor(stats[s.key] || 0) : (inst[s.key] || 0);

            const row = document.createElement('div');
            row.style.cssText = 'margin-bottom:4px;';

            const labelRow = document.createElement('div');
            labelRow.style.cssText = 'display:flex;justify-content:space-between;font-size:0.6rem;margin-bottom:1px;';

            const label = document.createElement('span');
            label.style.color = '#888';
            label.textContent = s.label;
            labelRow.appendChild(label);

            const value = document.createElement('span');
            value.style.cssText = `color:${s.color};font-weight:600;`;
            value.textContent = `${val}`;
            labelRow.appendChild(value);

            row.appendChild(labelRow);

            const barBg = document.createElement('div');
            barBg.style.cssText = 'width:100%;height:4px;background:#1a1a2e;border-radius:2px;overflow:hidden;';
            const barFill = document.createElement('div');
            barFill.style.cssText = `width:${Math.min(100, (val / maxStat) * 100)}%;height:100%;background:${s.color};`;
            barBg.appendChild(barFill);
            row.appendChild(barBg);

            container.appendChild(row);
        }

        // Nature / personality (if available)
        if (inst.nature) {
            const nature = document.createElement('div');
            nature.style.cssText = 'font-size:0.6rem;color:#888;margin-top:8px;';
            nature.textContent = `Nature: ${inst.nature}`;
            container.appendChild(nature);
        }

        // XP bar
        if (inst.currentXp !== undefined && inst.xpToNextLevel !== undefined) {
            const xpDiv = document.createElement('div');
            xpDiv.style.cssText = 'margin-top:8px;';

            const xpLabel = document.createElement('div');
            xpLabel.style.cssText = 'font-size:0.6rem;color:#888;margin-bottom:2px;';
            xpLabel.textContent = `EXP: ${inst.currentXp}/${inst.xpToNextLevel}`;
            xpDiv.appendChild(xpLabel);

            const xpBar = document.createElement('div');
            xpBar.style.cssText = 'width:100%;height:4px;background:#1a1a2e;border-radius:2px;overflow:hidden;';
            const xpFrac = inst.xpToNextLevel > 0 ? inst.currentXp / inst.xpToNextLevel : 0;
            const xpFill = document.createElement('div');
            xpFill.style.cssText = `width:${Math.min(100, xpFrac * 100)}%;height:100%;background:#6666ff;`;
            xpBar.appendChild(xpFill);
            xpDiv.appendChild(xpBar);

            container.appendChild(xpDiv);
        }
    }

    _renderAbilitiesMode(container, inst, abilities) {
        // Resolve full ability data from ABILITIES dictionary
        const raceId = inst.raceId || inst.race_id || 1;
        const learnset = LEARNSETS[raceId] || [];
        const instLevel = inst.level || 1;

        // Build full ability list from learnset (abilities learned up to current level)
        const learnedAbilityIds = learnset
            .filter(entry => entry.learn_level <= instLevel)
            .map(entry => entry.ability_id);

        // Merge with any abilities already on the instance
        const instAbilityIds = (abilities || []).map(a => a.abilityId || a.ability_id);
        const allAbilityIds = [...new Set([...learnedAbilityIds, ...instAbilityIds])];

        // Resolve to full ability objects from ABILITIES data
        const fullAbilities = allAbilityIds
            .map(id => ABILITIES[id])
            .filter(a => !!a);

        // Split into basic and advanced/passive
        const basicPool = fullAbilities.filter(a => _classifyAbility(a) === 'basic');
        const advancedPool = fullAbilities.filter(a => _classifyAbility(a) === 'advanced');

        // Determine equipped abilities (pick best if not explicitly set)
        const equippedIds = inst.equippedAbilities || [];
        let basicAbility = basicPool.find(a => equippedIds.includes(a.ability_id)) || basicPool[basicPool.length - 1] || null;
        let advancedAbility = advancedPool.find(a => equippedIds.includes(a.ability_id)) || advancedPool[advancedPool.length - 1] || null;

        // ── Section header ──
        const header = document.createElement('div');
        header.style.cssText = 'font-size:0.65rem;font-weight:700;color:#aaa;margin-bottom:6px;';
        header.textContent = 'Combat Abilities (RTS Auto-Battle)';
        container.appendChild(header);

        const helpText = document.createElement('div');
        helpText.style.cssText = 'font-size:0.5rem;color:#666;margin-bottom:8px;line-height:1.4;';
        helpText.textContent = 'In auto-battle, each Sprite uses one basic attack and one advanced ability. The AI selects targets based on type advantage and HP.';
        container.appendChild(helpText);

        // ── Basic Ability Card ──
        this._renderAbilityCard(container, basicAbility, 'Basic Attack', '#ff6644', basicPool, inst, 'basic');

        // ── Advanced/Passive Ability Card ──
        this._renderAbilityCard(container, advancedAbility, 'Advanced / Passive', '#aa44ff', advancedPool, inst, 'advanced');

        // ── Learned Pool (collapsed) ──
        if (fullAbilities.length > 2) {
            const poolHeader = document.createElement('div');
            poolHeader.style.cssText = 'font-size:0.6rem;font-weight:700;color:#666;margin-top:8px;margin-bottom:4px;';
            poolHeader.textContent = `Learned Pool (${fullAbilities.length} total)`;
            container.appendChild(poolHeader);

            for (const ability of fullAbilities) {
                if (ability === basicAbility || ability === advancedAbility) continue;
                const elemColor = ELEMENT_COLORS[ability.element_type] || '#444';
                const typeLabel = _classifyAbility(ability) === 'basic' ? 'B' : 'A';
                const targetIcon = TARGETING_ICONS[ability.targeting_type] || '\u2753';

                const row = document.createElement('div');
                row.style.cssText = `
                    display:flex;align-items:center;gap:4px;
                    padding:3px 6px;margin-bottom:1px;border-radius:3px;
                    font-size:0.55rem;color:#888;
                    border-left:2px solid ${elemColor}66;
                `;

                const typeTag = document.createElement('span');
                typeTag.style.cssText = `font-size:0.45rem;padding:0 3px;border-radius:2px;
                    background:${typeLabel === 'B' ? '#ff664433' : '#aa44ff33'};
                    color:${typeLabel === 'B' ? '#ff6644' : '#aa44ff'};font-weight:700;`;
                typeTag.textContent = typeLabel;
                row.appendChild(typeTag);

                const targetSpan = document.createElement('span');
                targetSpan.style.cssText = 'font-size:0.55rem;';
                targetSpan.textContent = targetIcon;
                targetSpan.title = TARGETING_DESCRIPTIONS[ability.targeting_type] || '';
                row.appendChild(targetSpan);

                const nameSpan = document.createElement('span');
                nameSpan.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                nameSpan.textContent = ability.ability_name;
                row.appendChild(nameSpan);

                if (ability.base_power > 0) {
                    const pwrSpan = document.createElement('span');
                    pwrSpan.style.cssText = `color:${elemColor};font-size:0.5rem;`;
                    pwrSpan.textContent = `${ability.base_power}`;
                    row.appendChild(pwrSpan);
                }

                container.appendChild(row);
            }
        }
    }

    /**
     * Render a single ability card with icon, name, description, targeting, and stats.
     */
    _renderAbilityCard(container, ability, slotLabel, accentColor, pool, inst, slotType) {
        const card = document.createElement('div');
        card.style.cssText = `
            padding:8px;margin-bottom:6px;border-radius:6px;
            border:1px solid ${ability ? accentColor + '55' : '#33333388'};
            background:${ability ? accentColor + '0a' : 'rgba(255,255,255,0.01)'};
        `;

        // Slot label header
        const slotHeader = document.createElement('div');
        slotHeader.style.cssText = `font-size:0.55rem;font-weight:700;color:${accentColor};margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px;`;
        slotHeader.textContent = slotLabel;
        card.appendChild(slotHeader);

        if (!ability) {
            const emptyText = document.createElement('div');
            emptyText.style.cssText = 'font-size:0.6rem;color:#555;font-style:italic;';
            emptyText.textContent = 'No ability available for this slot.';
            card.appendChild(emptyText);
            container.appendChild(card);
            return;
        }

        const elemColor = ELEMENT_COLORS[ability.element_type] || '#888';
        const targetIcon = TARGETING_ICONS[ability.targeting_type] || '\u2753';
        const targetDesc = TARGETING_DESCRIPTIONS[ability.targeting_type] || 'Unknown targeting';

        // ── Row 1: Icon + Name + Element badge ──
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;';

        // Ability icon (targeting type icon as visual indicator)
        const iconEl = document.createElement('span');
        iconEl.style.cssText = `
            font-size:1.1rem;width:28px;height:28px;
            display:flex;align-items:center;justify-content:center;
            background:${elemColor}22;border-radius:4px;border:1px solid ${elemColor}44;
            flex-shrink:0;
        `;
        iconEl.textContent = targetIcon;
        iconEl.title = targetDesc;
        nameRow.appendChild(iconEl);

        const nameCol = document.createElement('div');
        nameCol.style.cssText = 'flex:1;min-width:0;';
        const abilityName = document.createElement('div');
        abilityName.style.cssText = 'font-size:0.7rem;font-weight:700;color:#ddddee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        abilityName.textContent = ability.ability_name;
        nameCol.appendChild(abilityName);

        // Element + Physical/Special tag
        const tagsRow = document.createElement('div');
        tagsRow.style.cssText = 'display:flex;gap:4px;align-items:center;margin-top:1px;';
        if (ability.element_type) {
            const elemTag = document.createElement('span');
            elemTag.style.cssText = `font-size:0.5rem;padding:0 4px;border-radius:6px;
                background:${elemColor}33;color:${elemColor};border:1px solid ${elemColor}55;`;
            elemTag.textContent = ability.element_type;
            tagsRow.appendChild(elemTag);
        }
        const physTag = document.createElement('span');
        physTag.style.cssText = `font-size:0.5rem;padding:0 4px;border-radius:6px;
            background:rgba(255,255,255,0.05);color:#888;border:1px solid rgba(255,255,255,0.1);`;
        physTag.textContent = ability.is_physical ? 'Physical' : 'Special';
        tagsRow.appendChild(physTag);
        nameCol.appendChild(tagsRow);
        nameRow.appendChild(nameCol);
        card.appendChild(nameRow);

        // ── Row 2: Description ──
        if (ability.description) {
            const descEl = document.createElement('div');
            descEl.style.cssText = 'font-size:0.55rem;color:#999;line-height:1.4;margin-bottom:6px;';
            descEl.textContent = ability.description;
            card.appendChild(descEl);
        }

        // ── Row 3: Targeting description ──
        const targetRow = document.createElement('div');
        targetRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;';
        const targetLabel = document.createElement('span');
        targetLabel.style.cssText = 'font-size:0.5rem;color:#666;font-weight:700;';
        targetLabel.textContent = 'TARGET:';
        targetRow.appendChild(targetLabel);
        const targetText = document.createElement('span');
        targetText.style.cssText = 'font-size:0.5rem;color:#aaa;';
        targetText.textContent = `${targetIcon} ${targetDesc}`;
        targetRow.appendChild(targetText);
        card.appendChild(targetRow);

        // ── Row 4: Stats grid ──
        const statsGrid = document.createElement('div');
        statsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;';

        const statItems = [
            { label: 'PWR', value: ability.base_power || '—', color: '#ff6644' },
            { label: 'ACC', value: ability.accuracy ? `${Math.round(ability.accuracy * 100)}%` : '—', color: '#66ffcc' },
            { label: 'PP', value: ability.pp_max || '—', color: '#66aaff' },
        ];
        if (ability.cooldown_turns > 0) {
            statItems.push({ label: 'CD', value: `${ability.cooldown_turns}T`, color: '#cc9933' });
        }
        if (ability.priority_modifier > 0) {
            statItems.push({ label: 'PRI', value: `+${ability.priority_modifier}`, color: '#ffcc33' });
        }
        if (ability.crit_rate_bonus > 0) {
            statItems.push({ label: 'CRIT', value: `+${Math.round(ability.crit_rate_bonus * 100)}%`, color: '#ff66aa' });
        }

        for (const s of statItems) {
            const cell = document.createElement('div');
            cell.style.cssText = `
                text-align:center;padding:2px 0;border-radius:3px;
                background:rgba(255,255,255,0.03);
            `;
            const labelEl = document.createElement('div');
            labelEl.style.cssText = 'font-size:0.4rem;color:#666;font-weight:700;letter-spacing:0.5px;';
            labelEl.textContent = s.label;
            cell.appendChild(labelEl);
            const valEl = document.createElement('div');
            valEl.style.cssText = `font-size:0.6rem;color:${s.color};font-weight:600;`;
            valEl.textContent = s.value;
            cell.appendChild(valEl);
            statsGrid.appendChild(cell);
        }
        card.appendChild(statsGrid);

        // ── Swap button (if pool has alternatives) ──
        if (pool.length > 1) {
            const swapBtn = document.createElement('button');
            swapBtn.style.cssText = `
                margin-top:6px;width:100%;padding:4px;font-size:0.5rem;
                border:1px solid ${accentColor}66;border-radius:4px;
                background:${accentColor}11;color:${accentColor};cursor:pointer;
            `;
            swapBtn.textContent = `Change ${slotLabel} (${pool.length} available)`;
            swapBtn.addEventListener('click', () => {
                this._showAbilitySwapPopup(inst, pool, ability, slotType);
            });
            card.appendChild(swapBtn);
        }

        container.appendChild(card);
    }

    /**
     * Show a popup to swap an ability in a slot.
     */
    _showAbilitySwapPopup(inst, pool, currentAbility, slotType) {
        // Overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.7);z-index:10000;
            display:flex;align-items:center;justify-content:center;
        `;

        const popup = document.createElement('div');
        popup.style.cssText = `
            background:#1a1a2e;border:1px solid #333;border-radius:8px;
            padding:12px;width:260px;max-height:80vh;overflow-y:auto;
        `;

        const title = document.createElement('div');
        title.style.cssText = 'font-size:0.75rem;font-weight:700;color:#ffcc33;margin-bottom:8px;';
        title.textContent = `Select ${slotType === 'basic' ? 'Basic Attack' : 'Advanced / Passive'}`;
        popup.appendChild(title);

        for (const ability of pool) {
            const isEquipped = ability === currentAbility;
            const elemColor = ELEMENT_COLORS[ability.element_type] || '#888';
            const targetIcon = TARGETING_ICONS[ability.targeting_type] || '\u2753';

            const row = document.createElement('div');
            row.style.cssText = `
                display:flex;align-items:center;gap:6px;
                padding:6px 8px;margin-bottom:3px;border-radius:4px;
                border:1px solid ${isEquipped ? '#ffcc3366' : 'rgba(255,255,255,0.06)'};
                background:${isEquipped ? 'rgba(255,204,51,0.08)' : 'rgba(255,255,255,0.02)'};
                cursor:pointer;min-height:44px;
            `;

            const icon = document.createElement('span');
            icon.style.cssText = `font-size:0.9rem;width:24px;height:24px;display:flex;align-items:center;justify-content:center;
                background:${elemColor}22;border-radius:3px;flex-shrink:0;`;
            icon.textContent = targetIcon;
            row.appendChild(icon);

            const infoCol = document.createElement('div');
            infoCol.style.cssText = 'flex:1;min-width:0;';
            const nameEl = document.createElement('div');
            nameEl.style.cssText = `font-size:0.6rem;font-weight:600;color:${isEquipped ? '#ffcc33' : '#ccddee'};`;
            nameEl.textContent = `${ability.ability_name}${isEquipped ? ' (equipped)' : ''}`;
            infoCol.appendChild(nameEl);
            const descEl = document.createElement('div');
            descEl.style.cssText = 'font-size:0.5rem;color:#777;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            descEl.textContent = `${ability.element_type || 'None'} | Pwr:${ability.base_power || '—'} | ${TARGETING_DESCRIPTIONS[ability.targeting_type] || ''}`;
            infoCol.appendChild(descEl);
            row.appendChild(infoCol);

            if (!isEquipped) {
                row.addEventListener('click', () => {
                    // Set this ability as the equipped one for this slot type
                    if (!inst.equippedAbilities) inst.equippedAbilities = [];
                    // Remove any existing ability of same classification
                    inst.equippedAbilities = inst.equippedAbilities.filter(id => {
                        const ab = ABILITIES[id];
                        return ab && _classifyAbility(ab) !== slotType;
                    });
                    inst.equippedAbilities.push(ability.ability_id);
                    overlay.remove();
                    this._renderDetailPanel();
                });
            }

            popup.appendChild(row);
        }

        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            margin-top:8px;width:100%;padding:6px;font-size:0.6rem;
            border:1px solid #555;border-radius:4px;
            background:rgba(0,0,0,0.4);color:#aaa;cursor:pointer;
            min-height:44px;
        `;
        closeBtn.textContent = '\u2715 Close';
        closeBtn.addEventListener('click', () => overlay.remove());
        popup.appendChild(closeBtn);

        overlay.appendChild(popup);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    }

    _renderEquipmentMode(container, inst) {
        const equipment = inst.equipment || {};
        const RARITY_COLORS = {
            common: '#888', uncommon: '#33cc66', rare: '#3399ff', epic: '#aa44ff', legendary: '#ffaa00',
        };

        // Full 9-slot equipment system with slot-specific icons
        const equipSlots = [
            { key: 'helmet',  label: 'Helmet',  icon: '\u26D1' },
            { key: 'weapon',  label: 'Weapon',  icon: '\u2694' },
            { key: 'chest',   label: 'Chest',   icon: '\u{1F6E1}' },
            { key: 'gloves',  label: 'Gloves',  icon: '\u{1F9E4}' },
            { key: 'legs',    label: 'Legs',    icon: '\u{1F456}' },
            { key: 'boots',   label: 'Boots',   icon: '\u{1F462}' },
            { key: 'ring',    label: 'Ring',    icon: '\u{1F48D}' },
            { key: 'amulet',  label: 'Amulet',  icon: '\u{1F4FF}' },
            { key: 'crystal', label: 'Crystal', icon: '\u{1F48E}' },
        ];

        // Slot groupings for paper-doll layout:
        //   Row 1: helmet (centered)
        //   Row 2: weapon | PREVIEW | chest
        //   Row 3: gloves | PREVIEW | ring
        //   Row 4: legs (centered)
        //   Row 5: boots | amulet | crystal
        const paperDollLayout = [
            { type: 'row', slots: [null, 'helmet', null] },
            { type: 'preview-row-top', slots: ['weapon', null, 'chest'] },
            { type: 'preview-row-bot', slots: ['gloves', null, 'ring'] },
            { type: 'row', slots: [null, 'legs', null] },
            { type: 'row', slots: ['boots', 'amulet', 'crystal'] },
        ];

        // ── Paper-doll grid wrapper ──────────────────────────────
        const dollWrapper = document.createElement('div');
        dollWrapper.style.cssText = 'display:flex;flex-direction:column;gap:3px;align-items:center;';

        // Create the animated preview canvas (256x256)
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 256;
        previewCanvas.height = 256;
        previewCanvas.style.cssText = `
            width:192px;height:192px;
            border:1px solid rgba(255,255,255,0.12);border-radius:8px;
            background:rgba(0,0,0,0.4);
        `;

        // Register for animation
        this._equipPreviewCanvas = previewCanvas;
        this._equipPreviewInst = inst;
        this._equipPreviewFrame = 0;
        this._equipPreviewDir = 0;
        this._equipPreviewAnimTimer = 0;

        // Initial draw
        const pCtx = previewCanvas.getContext('2d');
        pCtx.imageSmoothingEnabled = true;
        const raceId = inst.raceId || inst.race_id || 1;
        const stage = inst.evolutionStage || inst.evolution_stage || 1;
        HumanoidSpriteSystem.drawWithEquipment(
            pCtx, raceId, stage, 0, 0,
            128, 190, 180,
            { equipment }
        );

        // Tap/click on preview to cycle direction
        previewCanvas.style.cursor = 'pointer';
        previewCanvas.addEventListener('click', () => {
            this._equipPreviewDir = (this._equipPreviewDir + 1) % 4;
        });

        // Build paper-doll rows
        for (const rowDef of paperDollLayout) {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:3px;justify-content:center;align-items:center;width:100%;';

            if (rowDef.type === 'preview-row-top') {
                // Left slot | preview canvas top half | right slot
                const leftSlot = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === rowDef.slots[0]), equipment, RARITY_COLORS);
                row.appendChild(leftSlot);
                // We attach the preview canvas spanning two rows using a container
                const previewContainer = document.createElement('div');
                previewContainer.style.cssText = 'display:flex;align-items:flex-start;justify-content:center;';
                previewContainer.id = 'equip-preview-container';
                previewContainer.appendChild(previewCanvas);
                row.appendChild(previewContainer);
                const rightSlot = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === rowDef.slots[2]), equipment, RARITY_COLORS);
                row.appendChild(rightSlot);
                // We need the preview to span two rows, so use a grid instead
                // Actually, we'll use a different approach: combine rows 2 and 3 into a single grid
            } else if (rowDef.type === 'preview-row-bot') {
                const leftSlot = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === rowDef.slots[0]), equipment, RARITY_COLORS);
                row.appendChild(leftSlot);
                // Spacer matching preview width
                const spacer = document.createElement('div');
                spacer.style.cssText = 'width:192px;flex-shrink:0;';
                row.appendChild(spacer);
                const rightSlot = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === rowDef.slots[2]), equipment, RARITY_COLORS);
                row.appendChild(rightSlot);
            } else {
                for (const slotKey of rowDef.slots) {
                    if (slotKey === null) {
                        const spacer = document.createElement('div');
                        spacer.style.cssText = 'width:56px;flex-shrink:0;';
                        row.appendChild(spacer);
                    } else {
                        const slotDef = equipSlots.find(s => s.key === slotKey);
                        const cell = this._createEquipSlotCell(inst, slotDef, equipment, RARITY_COLORS);
                        row.appendChild(cell);
                    }
                }
            }

            dollWrapper.appendChild(row);

            // After first preview row, we need to make the preview span down
            // We already added the canvas in row-top; the bot row just has a spacer
        }

        // Restructure: use CSS grid for the paper-doll so preview spans center
        dollWrapper.innerHTML = '';
        const paperGrid = document.createElement('div');
        paperGrid.style.cssText = `
            display:grid;
            grid-template-columns:56px 192px 56px;
            grid-template-rows:auto auto auto auto auto;
            gap:3px;
            justify-items:center;
            align-items:center;
            justify-content:center;
        `;

        // Row 1: _ | helmet | _
        const r1spacerL = document.createElement('div');
        paperGrid.appendChild(r1spacerL);
        paperGrid.appendChild(this._createEquipSlotCell(inst, equipSlots.find(s => s.key === 'helmet'), equipment, RARITY_COLORS));
        const r1spacerR = document.createElement('div');
        paperGrid.appendChild(r1spacerR);

        // Row 2-3: weapon/gloves | PREVIEW (span 2 rows) | chest/ring
        const weaponCell = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === 'weapon'), equipment, RARITY_COLORS);
        weaponCell.style.gridRow = '2';
        weaponCell.style.gridColumn = '1';
        paperGrid.appendChild(weaponCell);

        const previewCell = document.createElement('div');
        previewCell.style.cssText = 'grid-row:2/4;grid-column:2;display:flex;align-items:center;justify-content:center;';
        previewCell.appendChild(previewCanvas);
        paperGrid.appendChild(previewCell);

        const chestCell = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === 'chest'), equipment, RARITY_COLORS);
        chestCell.style.gridRow = '2';
        chestCell.style.gridColumn = '3';
        paperGrid.appendChild(chestCell);

        const glovesCell = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === 'gloves'), equipment, RARITY_COLORS);
        glovesCell.style.gridRow = '3';
        glovesCell.style.gridColumn = '1';
        paperGrid.appendChild(glovesCell);

        const ringCell = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === 'ring'), equipment, RARITY_COLORS);
        ringCell.style.gridRow = '3';
        ringCell.style.gridColumn = '3';
        paperGrid.appendChild(ringCell);

        // Row 4: _ | legs | _
        const r4spacerL = document.createElement('div');
        r4spacerL.style.gridRow = '4';
        r4spacerL.style.gridColumn = '1';
        paperGrid.appendChild(r4spacerL);

        const legsCell = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === 'legs'), equipment, RARITY_COLORS);
        legsCell.style.gridRow = '4';
        legsCell.style.gridColumn = '2';
        paperGrid.appendChild(legsCell);

        const r4spacerR = document.createElement('div');
        r4spacerR.style.gridRow = '4';
        r4spacerR.style.gridColumn = '3';
        paperGrid.appendChild(r4spacerR);

        // Row 5: boots | amulet | crystal
        const bootsCell = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === 'boots'), equipment, RARITY_COLORS);
        bootsCell.style.gridRow = '5';
        bootsCell.style.gridColumn = '1';
        paperGrid.appendChild(bootsCell);

        const amuletCell = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === 'amulet'), equipment, RARITY_COLORS);
        amuletCell.style.gridRow = '5';
        amuletCell.style.gridColumn = '2';
        paperGrid.appendChild(amuletCell);

        const crystalCell = this._createEquipSlotCell(inst, equipSlots.find(s => s.key === 'crystal'), equipment, RARITY_COLORS);
        crystalCell.style.gridRow = '5';
        crystalCell.style.gridColumn = '3';
        paperGrid.appendChild(crystalCell);

        container.appendChild(paperGrid);

        // ══════════════════════════════════════════════════════════════
        // Equipment Summary Panel — Total bonuses, synergies, power score
        // ══════════════════════════════════════════════════════════════
        this._renderEquipmentSummary(container, inst, equipSlots, equipment);
    }

    /**
     * Create a single equipment slot cell for the paper-doll grid.
     * Includes rarity glow, slot icon, stat preview on hover, and empty dashed style.
     */
    _createEquipSlotCell(inst, slotDef, equipment, RARITY_COLORS) {
        if (!slotDef) {
            const empty = document.createElement('div');
            empty.style.cssText = 'width:56px;';
            return empty;
        }

        const eqId = equipment[slotDef.key];
        const eqData = eqId ? (typeof eqId === 'object' ? eqId : findEquipmentWithExpansion(eqId)) : null;
        const rarityColor = eqData ? (RARITY_COLORS[eqData.rarity] || '#888') : '#555';
        const rarity = eqData ? (eqData.rarity || 'common') : null;

        const slotDiv = document.createElement('div');

        // Determine border and animation styles based on rarity
        let borderStyle = '1px dashed rgba(255,255,255,0.12)';
        let animationStyle = '';
        if (eqData) {
            borderStyle = `1px solid ${rarityColor}88`;
            if (rarity === 'epic') {
                animationStyle = 'animation:equip-slot-pulse-epic 2s ease-in-out infinite;';
            } else if (rarity === 'legendary') {
                animationStyle = 'animation:equip-slot-pulse-legendary 1.5s ease-in-out infinite;';
            }
        }

        slotDiv.style.cssText = `
            width:56px;min-height:56px;padding:3px;border-radius:6px;cursor:pointer;
            border:${borderStyle};
            background:${eqData ? rarityColor + '12' : 'rgba(255,255,255,0.02)'};
            text-align:center;position:relative;
            transition:background 0.15s,transform 0.1s;
            ${animationStyle}
        `;

        // Slot icon + label row
        const iconLabel = document.createElement('div');
        iconLabel.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:2px;margin-bottom:2px;';
        const iconSpan = document.createElement('span');
        iconSpan.style.cssText = 'font-size:0.6rem;';
        iconSpan.textContent = slotDef.icon;
        iconLabel.appendChild(iconSpan);
        const labelSpan = document.createElement('span');
        labelSpan.style.cssText = 'font-size:0.4rem;color:#666;text-transform:uppercase;letter-spacing:0.5px;';
        labelSpan.textContent = slotDef.label;
        iconLabel.appendChild(labelSpan);
        slotDiv.appendChild(iconLabel);

        if (eqData) {
            // Item name (truncated)
            const itemName = document.createElement('div');
            itemName.style.cssText = `
                font-size:0.5rem;color:${rarityColor};font-weight:600;margin-top:1px;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                max-width:100%;
            `;
            itemName.textContent = eqData.equipment_name || 'Unknown';
            slotDiv.appendChild(itemName);

            // Key stat bonus
            const bonuses = eqData.stat_bonuses || {};
            const topStat = Object.entries(bonuses)
                .filter(([, v]) => v > 0)
                .sort((a, b) => b[1] - a[1])[0];
            if (topStat) {
                const statLine = document.createElement('div');
                const statColor = STAT_COLORS[topStat[0]] || '#aaa';
                statLine.style.cssText = `font-size:0.45rem;color:${statColor};`;
                statLine.textContent = `+${topStat[1]} ${(STAT_LABELS[topStat[0]] || topStat[0]).toUpperCase()}`;
                slotDiv.appendChild(statLine);
            }

            // Rarity dot indicator
            const rarityDot = document.createElement('div');
            rarityDot.style.cssText = `
                position:absolute;top:2px;right:2px;width:5px;height:5px;
                border-radius:50%;background:${rarityColor};
            `;
            slotDiv.appendChild(rarityDot);
        } else {
            // Empty slot: dashed border + "+" icon
            const emptyIcon = document.createElement('div');
            emptyIcon.style.cssText = 'font-size:1rem;color:#333;margin-top:2px;line-height:1;';
            emptyIcon.textContent = '+';
            slotDiv.appendChild(emptyIcon);
        }

        // ── Stat comparison tooltip on hover/tap ─────────────────
        let tooltipEl = null;
        const showTooltip = () => {
            if (tooltipEl) return;
            if (!eqData) return;
            tooltipEl = this._createStatTooltip(eqData, inst);
            slotDiv.appendChild(tooltipEl);
            slotDiv.style.transform = 'scale(1.05)';
            slotDiv.style.zIndex = '2';
        };
        const hideTooltip = () => {
            if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
            slotDiv.style.transform = 'scale(1)';
            slotDiv.style.zIndex = '';
        };

        slotDiv.addEventListener('mouseenter', () => {
            showTooltip();
            slotDiv.style.background = eqData ? rarityColor + '25' : 'rgba(255,255,255,0.05)';
        });
        slotDiv.addEventListener('mouseleave', () => {
            hideTooltip();
            slotDiv.style.background = eqData ? rarityColor + '12' : 'rgba(255,255,255,0.02)';
        });

        // Click handler: show equip/unequip popup
        slotDiv.addEventListener('click', () => {
            hideTooltip();
            this._showEquipmentSlotPopup(inst, slotDef, eqData, null);
        });

        return slotDiv;
    }

    /**
     * Create a floating stat tooltip for an equipped item.
     * Shows all stat bonuses from the item.
     */
    _createStatTooltip(eqData, inst) {
        const tip = document.createElement('div');
        tip.style.cssText = `
            position:absolute;bottom:100%;left:50%;transform:translateX(-50%);
            background:rgba(10,10,25,0.95);border:1px solid rgba(255,255,255,0.15);
            border-radius:6px;padding:6px 8px;white-space:nowrap;z-index:10;
            pointer-events:none;min-width:80px;
        `;

        const titleEl = document.createElement('div');
        const rc = RARITY_COLORS_GLOBAL[eqData.rarity] || '#888';
        titleEl.style.cssText = `font-size:0.55rem;font-weight:700;color:${rc};margin-bottom:3px;`;
        titleEl.textContent = eqData.equipment_name || 'Unknown';
        tip.appendChild(titleEl);

        const bonuses = eqData.stat_bonuses || {};
        for (const [key, val] of Object.entries(bonuses)) {
            if (val === 0) continue;
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;gap:8px;font-size:0.5rem;';
            const label = document.createElement('span');
            label.style.color = '#888';
            label.textContent = STAT_LABELS[key] || key.toUpperCase();
            row.appendChild(label);
            const value = document.createElement('span');
            value.style.cssText = `color:${val > 0 ? '#44ee66' : '#ee4444'};font-weight:600;`;
            value.textContent = `${val > 0 ? '+' : ''}${val}`;
            row.appendChild(value);
            tip.appendChild(row);
        }

        // Synergy info
        if (eqData.element_synergy && eqData.element_synergy_multiplier > 1) {
            const raceData = SPRITE_RACES.find(r => r.race_id === (inst.raceId || inst.race_id));
            const hasMatch = raceData && raceData.element_types && raceData.element_types.includes(eqData.element_synergy);
            const synRow = document.createElement('div');
            const elemColor = ELEMENT_COLORS[eqData.element_synergy] || '#888';
            synRow.style.cssText = `
                font-size:0.45rem;margin-top:3px;padding:2px 4px;border-radius:3px;
                background:${hasMatch ? elemColor + '33' : 'rgba(255,255,255,0.05)'};
                color:${hasMatch ? elemColor : '#666'};
            `;
            synRow.textContent = `${eqData.element_synergy} \u00D7${eqData.element_synergy_multiplier}${hasMatch ? ' \u2714' : ''}`;
            tip.appendChild(synRow);
        }

        return tip;
    }

    /**
     * Render the Equipment Summary Panel below the paper-doll grid.
     * Shows total bonuses, active synergies, and power score.
     */
    _renderEquipmentSummary(container, inst, equipSlots, equipment) {
        // ── Calculate total stat bonuses ─────────────────────────
        const totalBonuses = { hp: 0, atk: 0, def: 0, spd: 0, sp_atk: 0, sp_def: 0 };
        const activeSynergies = []; // { type: 'element'|'class', name, multiplier }
        const raceData = SPRITE_RACES.find(r => r.race_id === (inst.raceId || inst.race_id));
        const spriteElements = (raceData && raceData.element_types) ? raceData.element_types : [];
        const spriteClass = (raceData && raceData.class_type) ? raceData.class_type : '';

        for (const slot of equipSlots) {
            const eqId = equipment[slot.key];
            const eqData = eqId ? (typeof eqId === 'object' ? eqId : findEquipmentWithExpansion(eqId)) : null;
            if (!eqData) continue;

            if (eqData.stat_bonuses) {
                for (const k of Object.keys(totalBonuses)) {
                    totalBonuses[k] += (eqData.stat_bonuses[k] || 0);
                }
            }

            // Check element synergy
            if (eqData.element_synergy && eqData.element_synergy_multiplier > 1 && spriteElements.includes(eqData.element_synergy)) {
                activeSynergies.push({
                    type: 'element',
                    name: eqData.element_synergy,
                    multiplier: eqData.element_synergy_multiplier,
                    source: eqData.equipment_name,
                });
            }
            // Check class synergy
            if (eqData.class_synergy && eqData.class_synergy_multiplier > 1 && spriteClass === eqData.class_synergy) {
                activeSynergies.push({
                    type: 'class',
                    name: eqData.class_synergy,
                    multiplier: eqData.class_synergy_multiplier,
                    source: eqData.equipment_name,
                });
            }
        }

        // ── Power Score ──────────────────────────────────────────
        let powerScore = 0;
        for (const [key, val] of Object.entries(totalBonuses)) {
            powerScore += val * (STAT_WEIGHTS[key] || 1);
        }
        // Synergy multiplier bonus adds to power
        for (const syn of activeSynergies) {
            powerScore += (syn.multiplier - 1) * 50;
        }
        powerScore = Math.round(powerScore);

        const hasBonuses = Object.values(totalBonuses).some(v => v !== 0) || activeSynergies.length > 0;

        // ── Summary container ────────────────────────────────────
        const summaryDiv = document.createElement('div');
        summaryDiv.style.cssText = `
            margin-top:8px;padding:8px;
            background:rgba(255,255,255,0.03);border-radius:6px;
            border:1px solid rgba(255,255,255,0.06);
        `;

        // Title with power score
        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';

        const titleLabel = document.createElement('span');
        titleLabel.style.cssText = 'font-size:0.55rem;color:#888;text-transform:uppercase;font-weight:700;letter-spacing:0.5px;';
        titleLabel.textContent = 'Total Equipment Bonuses';
        titleRow.appendChild(titleLabel);

        const powerBadge = document.createElement('span');
        const powerColor = powerScore >= 100 ? '#ffaa00' : powerScore >= 50 ? '#aa44ff' : powerScore >= 20 ? '#3399ff' : '#888';
        powerBadge.style.cssText = `
            font-size:0.55rem;font-weight:700;color:${powerColor};
            padding:2px 6px;border-radius:8px;
            background:${powerColor}22;border:1px solid ${powerColor}44;
        `;
        if (powerScore > 60) {
            powerBadge.style.cssText += `
                background:${powerColor}33;
            `;
        }
        powerBadge.textContent = `\u2B50 ${powerScore} PWR`;
        titleRow.appendChild(powerBadge);
        summaryDiv.appendChild(titleRow);

        if (!hasBonuses) {
            const noneMsg = document.createElement('div');
            noneMsg.style.cssText = 'font-size:0.55rem;color:#444;text-align:center;padding:6px 0;';
            noneMsg.textContent = 'No equipment bonuses active';
            summaryDiv.appendChild(noneMsg);
            container.appendChild(summaryDiv);
            return;
        }

        // ── Stat bonus bars ──────────────────────────────────────
        const statsGrid = document.createElement('div');
        statsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;margin-bottom:6px;';

        for (const [key, val] of Object.entries(totalBonuses)) {
            if (val === 0) continue;
            const statRow = document.createElement('div');
            statRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

            const label = document.createElement('span');
            label.style.cssText = `font-size:0.5rem;color:${STAT_COLORS[key] || '#888'};`;
            label.textContent = STAT_LABELS[key] || key.toUpperCase();
            statRow.appendChild(label);

            const value = document.createElement('span');
            const vColor = val > 0 ? '#44ee66' : '#ee4444';
            value.style.cssText = `font-size:0.55rem;font-weight:700;color:${vColor};`;
            value.textContent = `${val > 0 ? '+' : ''}${val}`;
            statRow.appendChild(value);

            statsGrid.appendChild(statRow);
        }
        summaryDiv.appendChild(statsGrid);

        // ── Active Synergies ─────────────────────────────────────
        if (activeSynergies.length > 0) {
            const synLabel = document.createElement('div');
            synLabel.style.cssText = 'font-size:0.45rem;color:#666;text-transform:uppercase;margin-bottom:3px;margin-top:4px;';
            synLabel.textContent = 'Active Synergies';
            summaryDiv.appendChild(synLabel);

            for (const syn of activeSynergies) {
                const synRow = document.createElement('div');
                const elemColor = syn.type === 'element' ? (ELEMENT_COLORS[syn.name] || '#888') : '#ffcc33';
                synRow.style.cssText = `
                    display:inline-flex;align-items:center;gap:4px;
                    padding:2px 6px;margin:1px 2px;border-radius:10px;
                    background:${elemColor}22;border:1px solid ${elemColor}44;
                    font-size:0.45rem;color:${elemColor};
                `;
                const typeIcon = syn.type === 'element' ? '\u2B50' : '\u{1F6E1}';
                synRow.textContent = `${typeIcon} ${syn.name.toUpperCase()} SYNERGY \u00D7${syn.multiplier}`;
                summaryDiv.appendChild(synRow);
            }
        }

        container.appendChild(summaryDiv);
    }

    /**
     * Show popup for a specific equipment slot — allows equipping, unequipping, or viewing details.
     * Enhanced with sorting, stat comparison, synergy badges, and mini sprite previews.
     */
    _showEquipmentSlotPopup(inst, slot, currentEqData, parentContainer) {
        const RARITY_COLORS = {
            common: '#888', uncommon: '#33cc66', rare: '#3399ff', epic: '#aa44ff', legendary: '#ffaa00',
        };

        const raceData = SPRITE_RACES.find(r => r.race_id === (inst.raceId || inst.race_id));
        const spriteElements = (raceData && raceData.element_types) ? raceData.element_types : [];
        const spriteClass = (raceData && raceData.class_type) ? raceData.class_type : '';

        // Find compatible items from player's equipment inventory
        const compatibleItems = [];
        for (const entry of (this._equipmentInventory || [])) {
            // Entry can be a numeric ID or a full equipment object
            const eqId = typeof entry === 'number' ? entry : (entry.equipment_id || entry.equipmentId);
            const resolved = typeof entry === 'number'
                ? findEquipmentWithExpansion(eqId)
                : entry;
            if (!resolved) continue;
            if ((resolved.slot_type || '') !== slot.key) continue;
            if ((resolved.level_requirement || 0) > (inst.level || 1)) continue;
            const isCurrentlyEquipped = currentEqData && currentEqData.equipment_id === resolved.equipment_id;
            if (!isCurrentlyEquipped) compatibleItems.push(resolved);
        }

        // ── Sort function ────────────────────────────────────────
        const sortItems = (items, mode) => {
            const sorted = [...items];
            switch (mode) {
                case 'rarity':
                    sorted.sort((a, b) => (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0));
                    break;
                case 'stat': {
                    const totalBonus = (it) => {
                        const b = it.stat_bonuses || {};
                        return Object.values(b).reduce((sum, v) => sum + (v || 0), 0);
                    };
                    sorted.sort((a, b) => totalBonus(b) - totalBonus(a));
                    break;
                }
                case 'level':
                    sorted.sort((a, b) => (a.level_requirement || 0) - (b.level_requirement || 0));
                    break;
            }
            return sorted;
        };

        // ── Stat delta calculator ────────────────────────────────
        const calcStatDelta = (newItem) => {
            const currentBonuses = currentEqData ? (currentEqData.stat_bonuses || {}) : {};
            const newBonuses = newItem ? (newItem.stat_bonuses || {}) : {};
            const delta = {};
            const allKeys = new Set([...Object.keys(currentBonuses), ...Object.keys(newBonuses)]);
            for (const key of allKeys) {
                const oldVal = currentBonuses[key] || 0;
                const newVal = newBonuses[key] || 0;
                const diff = newVal - oldVal;
                if (diff !== 0) {
                    delta[key] = { old: oldVal, new: newVal, diff };
                }
            }
            return delta;
        };

        // Create overlay popup
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:absolute;top:0;left:0;width:100%;height:100%;
            background:rgba(5,5,15,0.97);z-index:5;overflow-y:auto;padding:10px;
        `;

        // ── Header ───────────────────────────────────────────────
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';
        const title = document.createElement('span');
        title.style.cssText = 'font-size:0.8rem;font-weight:700;color:#ffcc33;';
        title.textContent = `${EQUIP_SLOT_ICONS[slot.key] || ''} ${slot.label} Slot`;
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            padding:6px 14px;font-size:0.65rem;border:1px solid #555;border-radius:4px;
            background:rgba(0,0,0,0.5);color:#aaa;cursor:pointer;
            min-height:44px;min-width:44px;
        `;
        closeBtn.textContent = '\u2715 Close';
        closeBtn.addEventListener('click', () => { overlay.remove(); });
        header.appendChild(closeBtn);
        overlay.appendChild(header);

        // ── Currently equipped section ───────────────────────────
        if (currentEqData) {
            const currentDiv = document.createElement('div');
            const curRarity = RARITY_COLORS[currentEqData.rarity] || '#888';
            currentDiv.style.cssText = `
                padding:8px;margin-bottom:8px;border-radius:6px;
                border:1px solid ${curRarity}66;
                background:${curRarity}12;
            `;

            const curHeader = document.createElement('div');
            curHeader.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;';

            const curLabel = document.createElement('div');
            curLabel.style.cssText = 'font-size:0.45rem;color:#666;text-transform:uppercase;letter-spacing:1px;';
            curLabel.textContent = 'CURRENTLY EQUIPPED';
            currentDiv.appendChild(curLabel);

            // Mini sprite preview of current equipment
            const curPreviewRow = document.createElement('div');
            curPreviewRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:4px;';

            const curMiniCanvas = document.createElement('canvas');
            curMiniCanvas.width = 48;
            curMiniCanvas.height = 48;
            curMiniCanvas.style.cssText = 'width:48px;height:48px;border-radius:4px;background:rgba(0,0,0,0.3);flex-shrink:0;';
            const cmCtx = curMiniCanvas.getContext('2d');
            cmCtx.imageSmoothingEnabled = true;
            const raceId = inst.raceId || inst.race_id || 1;
            const stg = inst.evolutionStage || inst.evolution_stage || 1;
            HumanoidSpriteSystem.drawWithEquipment(
                cmCtx, raceId, stg, 0, 0, 24, 38, 38, { equipment: inst.equipment || {} }
            );
            curPreviewRow.appendChild(curMiniCanvas);

            const curInfo = document.createElement('div');
            curInfo.style.cssText = 'flex:1;';

            const curName = document.createElement('div');
            curName.style.cssText = `font-size:0.7rem;color:${curRarity};font-weight:700;`;
            curName.textContent = currentEqData.equipment_name || 'Unknown';
            curInfo.appendChild(curName);

            // Stat bonuses line
            if (currentEqData.stat_bonuses) {
                const statsLine = document.createElement('div');
                statsLine.style.cssText = 'font-size:0.5rem;color:#aaa;margin-top:2px;display:flex;flex-wrap:wrap;gap:4px;';
                for (const [k, v] of Object.entries(currentEqData.stat_bonuses)) {
                    if (v === 0) continue;
                    const statSpan = document.createElement('span');
                    const sc = STAT_COLORS[k] || '#aaa';
                    statSpan.style.cssText = `color:${sc};`;
                    statSpan.textContent = `${STAT_LABELS[k] || k}:${v > 0 ? '+' : ''}${v}`;
                    statsLine.appendChild(statSpan);
                }
                curInfo.appendChild(statsLine);
            }

            curPreviewRow.appendChild(curInfo);
            currentDiv.appendChild(curPreviewRow);

            // Unequip button
            const unequipBtn = document.createElement('button');
            unequipBtn.style.cssText = `
                margin-top:6px;padding:8px 10px;font-size:0.6rem;font-weight:600;
                border:1px solid #884444;border-radius:4px;
                background:rgba(80,30,30,0.3);color:#cc8888;cursor:pointer;
                width:100%;min-height:44px;
            `;
            unequipBtn.textContent = '\u2716 Unequip';
            unequipBtn.addEventListener('click', () => {
                this._unequipItem(inst, slot.key);
                overlay.remove();
            });
            currentDiv.appendChild(unequipBtn);
            overlay.appendChild(currentDiv);
        }

        // ── Sort controls ────────────────────────────────────────
        if (compatibleItems.length > 1) {
            const sortBar = document.createElement('div');
            sortBar.style.cssText = 'display:flex;gap:4px;margin-bottom:6px;align-items:center;';

            const sortLabel = document.createElement('span');
            sortLabel.style.cssText = 'font-size:0.5rem;color:#666;margin-right:4px;';
            sortLabel.textContent = 'Sort:';
            sortBar.appendChild(sortLabel);

            const sortModes = [
                { id: 'rarity', label: 'Rarity' },
                { id: 'stat', label: 'Stats' },
                { id: 'level', label: 'Level' },
            ];
            for (const mode of sortModes) {
                const sortBtn = document.createElement('button');
                const isActive = this._equipSortMode === mode.id;
                sortBtn.style.cssText = `
                    padding:4px 10px;font-size:0.5rem;border-radius:10px;cursor:pointer;
                    min-height:28px;
                    border:1px solid ${isActive ? '#ffcc33' : '#444'};
                    background:${isActive ? 'rgba(255,204,51,0.12)' : 'transparent'};
                    color:${isActive ? '#ffcc33' : '#888'};
                `;
                sortBtn.textContent = mode.label;
                sortBtn.addEventListener('click', () => {
                    this._equipSortMode = mode.id;
                    // Re-render the popup
                    overlay.remove();
                    this._showEquipmentSlotPopup(inst, slot, currentEqData, parentContainer);
                });
                sortBar.appendChild(sortBtn);
            }
            overlay.appendChild(sortBar);
        }

        // ── Available items list ─────────────────────────────────
        if (compatibleItems.length > 0) {
            const sorted = sortItems(compatibleItems, this._equipSortMode);

            const availLabel = document.createElement('div');
            availLabel.style.cssText = 'font-size:0.5rem;color:#666;margin:4px 0 6px;text-transform:uppercase;letter-spacing:0.5px;';
            availLabel.textContent = `AVAILABLE (${sorted.length})`;
            overlay.appendChild(availLabel);

            for (const item of sorted) {
                const rarity = item.rarity || 'common';
                const rarityColor = RARITY_COLORS[rarity] || '#888';
                const delta = calcStatDelta(item);

                const itemCard = document.createElement('div');
                itemCard.style.cssText = `
                    padding:8px;margin-bottom:4px;border-radius:6px;cursor:pointer;
                    border:1px solid ${rarityColor}44;
                    background:rgba(255,255,255,0.02);
                    transition:background 0.1s,border-color 0.1s;
                    min-height:44px;
                `;

                // Top row: mini sprite preview + name + rarity
                const topRow = document.createElement('div');
                topRow.style.cssText = 'display:flex;align-items:center;gap:8px;';

                // Mini sprite preview with this item equipped
                const miniCanvas = document.createElement('canvas');
                miniCanvas.width = 40;
                miniCanvas.height = 40;
                miniCanvas.style.cssText = 'width:40px;height:40px;border-radius:4px;background:rgba(0,0,0,0.3);flex-shrink:0;';
                const mCtx = miniCanvas.getContext('2d');
                mCtx.imageSmoothingEnabled = true;

                // Build hypothetical equipment with this item
                const hypotheticalEquip = { ...(inst.equipment || {}) };
                hypotheticalEquip[slot.key] = item.equipment_id || item;
                const rId = inst.raceId || inst.race_id || 1;
                const stge = inst.evolutionStage || inst.evolution_stage || 1;
                HumanoidSpriteSystem.drawWithEquipment(
                    mCtx, rId, stge, 0, 0, 20, 32, 34, { equipment: hypotheticalEquip }
                );
                topRow.appendChild(miniCanvas);

                // Name + level req
                const nameCol = document.createElement('div');
                nameCol.style.cssText = 'flex:1;min-width:0;';

                const nameRow = document.createElement('div');
                nameRow.style.cssText = `font-size:0.65rem;color:${rarityColor};font-weight:700;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
                nameRow.textContent = item.equipment_name || item.name || 'Unknown';
                nameCol.appendChild(nameRow);

                // Level and rarity badge
                const metaRow = document.createElement('div');
                metaRow.style.cssText = 'display:flex;gap:4px;align-items:center;margin-top:1px;';
                const rarityBadge = document.createElement('span');
                rarityBadge.style.cssText = `
                    font-size:0.4rem;padding:1px 4px;border-radius:6px;text-transform:uppercase;
                    background:${rarityColor}22;color:${rarityColor};border:1px solid ${rarityColor}44;
                `;
                rarityBadge.textContent = rarity;
                metaRow.appendChild(rarityBadge);

                if (item.level_requirement && item.level_requirement > 1) {
                    const lvlBadge = document.createElement('span');
                    lvlBadge.style.cssText = 'font-size:0.4rem;color:#888;';
                    lvlBadge.textContent = `Lv${item.level_requirement}`;
                    metaRow.appendChild(lvlBadge);
                }
                nameCol.appendChild(metaRow);
                topRow.appendChild(nameCol);

                itemCard.appendChild(topRow);

                // ── Stat comparison: Current -> New ──────────────
                const deltaKeys = Object.keys(delta);
                if (deltaKeys.length > 0) {
                    const statCompDiv = document.createElement('div');
                    statCompDiv.style.cssText = 'margin-top:4px;padding:4px 6px;background:rgba(0,0,0,0.2);border-radius:4px;';

                    const compLabel = document.createElement('div');
                    compLabel.style.cssText = 'font-size:0.4rem;color:#555;margin-bottom:2px;text-transform:uppercase;';
                    compLabel.textContent = 'STAT CHANGE';
                    statCompDiv.appendChild(compLabel);

                    const compGrid = document.createElement('div');
                    compGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px 8px;';

                    for (const [key, info] of Object.entries(delta)) {
                        const compRow = document.createElement('div');
                        compRow.style.cssText = 'display:flex;align-items:center;gap:2px;font-size:0.45rem;';

                        const statLabel = document.createElement('span');
                        statLabel.style.cssText = `color:${STAT_COLORS[key] || '#888'};`;
                        statLabel.textContent = STAT_LABELS[key] || key.toUpperCase();
                        compRow.appendChild(statLabel);

                        const oldVal = document.createElement('span');
                        oldVal.style.cssText = 'color:#666;';
                        oldVal.textContent = `${info.old > 0 ? '+' : ''}${info.old}`;
                        compRow.appendChild(oldVal);

                        const arrow = document.createElement('span');
                        arrow.style.cssText = 'color:#555;';
                        arrow.textContent = '\u2192';
                        compRow.appendChild(arrow);

                        const newVal = document.createElement('span');
                        const diffColor = info.diff > 0 ? '#44ee66' : '#ee4444';
                        newVal.style.cssText = `color:${diffColor};font-weight:700;`;
                        newVal.textContent = `${info.new > 0 ? '+' : ''}${info.new}`;
                        compRow.appendChild(newVal);

                        const diffSpan = document.createElement('span');
                        diffSpan.style.cssText = `color:${diffColor};font-size:0.4rem;`;
                        diffSpan.textContent = `(${info.diff > 0 ? '+' : ''}${info.diff})`;
                        compRow.appendChild(diffSpan);

                        compGrid.appendChild(compRow);
                    }

                    statCompDiv.appendChild(compGrid);
                    itemCard.appendChild(statCompDiv);
                }

                // ── Element synergy badge ────────────────────────
                if (item.element_synergy && item.element_synergy_multiplier > 1) {
                    const hasElemMatch = spriteElements.includes(item.element_synergy);
                    const elemColor = ELEMENT_COLORS[item.element_synergy] || '#888';
                    const synergyBadge = document.createElement('div');
                    synergyBadge.style.cssText = `
                        display:inline-flex;align-items:center;gap:3px;
                        margin-top:4px;padding:3px 8px;border-radius:10px;
                        font-size:0.45rem;font-weight:600;
                        background:${hasElemMatch ? elemColor + '25' : 'rgba(255,255,255,0.04)'};
                        color:${hasElemMatch ? elemColor : '#555'};
                        border:1px solid ${hasElemMatch ? elemColor + '55' : 'rgba(255,255,255,0.06)'};
                    `;
                    synergyBadge.textContent = `${hasElemMatch ? '\u2714 ' : ''}${item.element_synergy.toUpperCase()} SYNERGY \u00D7${item.element_synergy_multiplier}`;
                    itemCard.appendChild(synergyBadge);
                }

                // ── Class synergy badge ──────────────────────────
                if (item.class_synergy && item.class_synergy_multiplier > 1) {
                    const hasClassMatch = spriteClass === item.class_synergy;
                    const classBadge = document.createElement('div');
                    classBadge.style.cssText = `
                        display:inline-flex;align-items:center;gap:3px;
                        margin-top:3px;margin-left:${item.element_synergy ? '4px' : '0'};
                        padding:3px 8px;border-radius:10px;
                        font-size:0.45rem;font-weight:600;
                        background:${hasClassMatch ? 'rgba(255,204,51,0.15)' : 'rgba(255,255,255,0.04)'};
                        color:${hasClassMatch ? '#ffcc33' : '#555'};
                        border:1px solid ${hasClassMatch ? 'rgba(255,204,51,0.4)' : 'rgba(255,255,255,0.06)'};
                    `;
                    classBadge.textContent = `${hasClassMatch ? '\u2714 ' : ''}${item.class_synergy.toUpperCase()} SYNERGY \u00D7${item.class_synergy_multiplier}`;
                    itemCard.appendChild(classBadge);
                }

                // ── Equip on click ───────────────────────────────
                itemCard.addEventListener('click', () => {
                    this._equipItem(inst, slot.key, item);
                    overlay.remove();
                });
                itemCard.addEventListener('mouseenter', () => {
                    itemCard.style.background = 'rgba(255,255,255,0.06)';
                    itemCard.style.borderColor = rarityColor + '88';
                });
                itemCard.addEventListener('mouseleave', () => {
                    itemCard.style.background = 'rgba(255,255,255,0.02)';
                    itemCard.style.borderColor = rarityColor + '44';
                });
                overlay.appendChild(itemCard);
            }
        } else if (!currentEqData) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = 'font-size:0.65rem;color:#555;text-align:center;margin-top:30px;';
            emptyMsg.textContent = 'No items available for this slot';
            overlay.appendChild(emptyMsg);
        }

        this._detailPanelEl.appendChild(overlay);
    }

    _renderEvolutionMode(container, inst, raceData, stageData) {
        const currentStage = inst.evolutionStage || stageData.stageNumber || 1;
        const maxStage = STAGES_PER_RACE;
        const raceId = inst.raceId || inst.race_id || 1;

        // Look up evolution forms from data
        const evoChain = raceData.evolutionChain || raceData.evolution_chain || [];
        const race = SPRITE_RACES.find(r => r.race_id === raceId);
        const chainFormIds = race ? race.evolution_chain : [];

        // ── Evolution chain visual with stage names ──
        const chainDiv = document.createElement('div');
        chainDiv.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;justify-content:center;';

        for (let s = 1; s <= maxStage; s++) {
            const isActive = s === currentStage;
            const isPast = s < currentStage;
            const bgColor = isActive ? '#ffcc33' : isPast ? '#33aa66' : '#333';
            const textColor = isActive || isPast ? '#fff' : '#555';
            const borderColor = isActive ? '#ffdd55' : isPast ? '#44cc77' : '#444';

            const stageEl = document.createElement('div');
            stageEl.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;';

            const circle = document.createElement('div');
            circle.style.cssText = `
                width:30px;height:30px;border-radius:50%;background:${bgColor};
                display:flex;align-items:center;justify-content:center;
                font-size:0.65rem;font-weight:700;color:${textColor};
                border:2px solid ${borderColor};
            `;
            circle.textContent = `${s}`;
            stageEl.appendChild(circle);

            const stageName = document.createElement('div');
            stageName.style.cssText = `font-size:0.45rem;color:${isActive ? '#ffcc33' : isPast ? '#44cc77' : '#555'};font-weight:600;`;
            stageName.textContent = STAGE_NAMES[s] || `Stage ${s}`;
            stageEl.appendChild(stageName);

            chainDiv.appendChild(stageEl);

            if (s < maxStage) {
                const arrow = document.createElement('span');
                arrow.style.cssText = `color:${s < currentStage ? '#44cc77' : '#444'};font-size:0.8rem;margin-bottom:12px;`;
                arrow.textContent = '\u2192';
                chainDiv.appendChild(arrow);
            }
        }
        container.appendChild(chainDiv);

        // ── Current stage description ──
        const stageDesc = document.createElement('div');
        stageDesc.style.cssText = 'font-size:0.55rem;color:#999;line-height:1.4;margin-bottom:8px;text-align:center;';
        stageDesc.textContent = STAGE_DESCRIPTIONS[currentStage] || '';
        container.appendChild(stageDesc);

        // ── Lore description ──
        const lore = race ? race.lore_description : (raceData.loreDescription || raceData.lore_description || '');
        if (lore) {
            const loreBox = document.createElement('div');
            loreBox.style.cssText = `
                padding:6px 8px;border-radius:4px;margin-bottom:8px;
                background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);
                font-size:0.5rem;color:#887766;line-height:1.5;font-style:italic;
            `;
            loreBox.textContent = `"${lore}"`;
            container.appendChild(loreBox);
        }

        // ── Stat multipliers for current stage ──
        const formId = chainFormIds[currentStage - 1];
        const form = formId ? EVOLUTION_FORMS[formId] : null;
        if (form && form.stat_multipliers) {
            const multHeader = document.createElement('div');
            multHeader.style.cssText = 'font-size:0.6rem;font-weight:700;color:#888;margin-bottom:4px;';
            multHeader.textContent = 'Stage Stat Multipliers';
            container.appendChild(multHeader);

            const multGrid = document.createElement('div');
            multGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;margin-bottom:8px;';
            const statDefs = [
                { key: 'hp', label: 'HP', color: '#33cc66' },
                { key: 'atk', label: 'ATK', color: '#ff6644' },
                { key: 'def', label: 'DEF', color: '#4488ff' },
                { key: 'sp_atk', label: 'SP.A', color: '#ff66aa' },
                { key: 'sp_def', label: 'SP.D', color: '#66aaff' },
                { key: 'spd', label: 'SPD', color: '#66ffcc' },
            ];
            for (const s of statDefs) {
                const mult = form.stat_multipliers[s.key] || 1.0;
                const cell = document.createElement('div');
                cell.style.cssText = `text-align:center;padding:2px;border-radius:3px;background:rgba(255,255,255,0.03);`;
                const lbl = document.createElement('div');
                lbl.style.cssText = 'font-size:0.4rem;color:#666;font-weight:700;';
                lbl.textContent = s.label;
                cell.appendChild(lbl);
                const val = document.createElement('div');
                val.style.cssText = `font-size:0.6rem;font-weight:600;color:${mult > 1.0 ? s.color : '#666'};`;
                val.textContent = `\u00D7${mult.toFixed(1)}`;
                cell.appendChild(val);
                multGrid.appendChild(cell);
            }
            container.appendChild(multGrid);
        }

        // ── Abilities gained at next evolution ──
        if (currentStage < maxStage) {
            const nextFormId = chainFormIds[currentStage]; // index = currentStage because 0-based
            const nextForm = nextFormId ? EVOLUTION_FORMS[nextFormId] : null;
            if (nextForm && nextForm.ability_changes && nextForm.ability_changes.length > 0) {
                const abilHeader = document.createElement('div');
                abilHeader.style.cssText = 'font-size:0.6rem;font-weight:700;color:#888;margin-bottom:4px;';
                abilHeader.textContent = 'New Abilities on Evolution';
                container.appendChild(abilHeader);

                for (const change of nextForm.ability_changes) {
                    const newAbility = ABILITIES[change.ability_id];
                    const replacesAbility = change.replaces_ability_id > 0 ? ABILITIES[change.replaces_ability_id] : null;
                    const elemColor = newAbility ? (ELEMENT_COLORS[newAbility.element_type] || '#888') : '#888';
                    const targetIcon = newAbility ? (TARGETING_ICONS[newAbility.targeting_type] || '\u2753') : '\u2753';

                    const changeRow = document.createElement('div');
                    changeRow.style.cssText = `
                        padding:4px 6px;margin-bottom:3px;border-radius:4px;
                        border-left:3px solid ${elemColor};
                        background:rgba(255,255,255,0.03);
                    `;

                    const nameRow = document.createElement('div');
                    nameRow.style.cssText = 'display:flex;align-items:center;gap:4px;';
                    const icon = document.createElement('span');
                    icon.style.cssText = 'font-size:0.7rem;';
                    icon.textContent = targetIcon;
                    nameRow.appendChild(icon);
                    const name = document.createElement('span');
                    name.style.cssText = 'font-size:0.6rem;font-weight:600;color:#ccddee;';
                    name.textContent = newAbility ? newAbility.ability_name : `Ability #${change.ability_id}`;
                    nameRow.appendChild(name);
                    const lvlTag = document.createElement('span');
                    lvlTag.style.cssText = 'font-size:0.45rem;color:#888;margin-left:auto;';
                    lvlTag.textContent = `Lv${change.learn_level}`;
                    nameRow.appendChild(lvlTag);
                    changeRow.appendChild(nameRow);

                    if (newAbility && newAbility.description) {
                        const desc = document.createElement('div');
                        desc.style.cssText = 'font-size:0.5rem;color:#777;margin-top:2px;';
                        desc.textContent = newAbility.description;
                        changeRow.appendChild(desc);
                    }

                    if (replacesAbility) {
                        const replTag = document.createElement('div');
                        replTag.style.cssText = 'font-size:0.45rem;color:#cc6633;margin-top:2px;';
                        replTag.textContent = `Replaces: ${replacesAbility.ability_name}`;
                        changeRow.appendChild(replTag);
                    }

                    container.appendChild(changeRow);
                }
            }
        }

        // ── Fully evolved message ──
        if (currentStage >= maxStage) {
            const maxedLabel = document.createElement('div');
            maxedLabel.style.cssText = 'color:#ffcc33;font-size:0.75rem;font-weight:700;text-align:center;margin:8px 0;';
            maxedLabel.textContent = '\u2728 Fully Evolved \u2014 Apex Form \u2728';
            container.appendChild(maxedLabel);
            const maxedDesc = document.createElement('div');
            maxedDesc.style.cssText = 'font-size:0.55rem;color:#999;text-align:center;margin-bottom:8px;';
            maxedDesc.textContent = 'This Sprite has reached its final evolution and is at the peak of its power.';
            container.appendChild(maxedDesc);
            return;
        }

        // ── Evolution requirements ──
        const nextFormId = chainFormIds[currentStage];
        const nextForm = nextFormId ? EVOLUTION_FORMS[nextFormId] : null;
        const triggerType = nextForm ? nextForm.evolution_trigger_type : 'level';
        const triggerValue = nextForm ? nextForm.evolution_trigger_value : ((currentStage) * 15);
        const triggerDesc = nextForm ? nextForm.evolution_trigger_description : '';

        // Merge with any requirements from stageData/raceData
        const evoRequirements = stageData.evolutionRequirements || raceData.evolutionRequirements || {};

        const reqDiv = document.createElement('div');
        reqDiv.style.cssText = 'margin-bottom:8px;';

        const reqHeader = document.createElement('div');
        reqHeader.style.cssText = 'font-size:0.6rem;font-weight:700;color:#888;margin-bottom:4px;';
        reqHeader.textContent = 'Evolution Requirements';
        reqDiv.appendChild(reqHeader);

        // Trigger description
        if (triggerDesc) {
            const triggerDescEl = document.createElement('div');
            triggerDescEl.style.cssText = 'font-size:0.55rem;color:#aaa;margin-bottom:4px;font-style:italic;';
            triggerDescEl.textContent = triggerDesc;
            reqDiv.appendChild(triggerDescEl);
        }

        const currentLevel = inst.level || 1;
        let canEvolve = true;

        // Level requirement
        if (triggerType === 'level' || triggerType === 'none') {
            const reqLevel = (triggerType === 'level') ? triggerValue : (evoRequirements.level || ((currentStage) * 15));
            const levelMet = currentLevel >= reqLevel;
            if (!levelMet) canEvolve = false;

            const levelRow = document.createElement('div');
            levelRow.style.cssText = `font-size:0.6rem;color:${levelMet ? '#33cc66' : '#cc6633'};margin-bottom:2px;`;
            levelRow.textContent = `${levelMet ? '\u2714' : '\u2718'} Level ${reqLevel} (current: ${currentLevel})`;
            reqDiv.appendChild(levelRow);

            const levelProgress = Math.min(1, currentLevel / reqLevel);
            const levelBar = document.createElement('div');
            levelBar.style.cssText = 'width:100%;height:4px;background:#1a1a2e;border-radius:2px;overflow:hidden;margin-bottom:4px;';
            const levelFill = document.createElement('div');
            levelFill.style.cssText = `width:${levelProgress * 100}%;height:100%;background:${levelMet ? '#33cc66' : '#cc6633'};`;
            levelBar.appendChild(levelFill);
            reqDiv.appendChild(levelBar);
        }

        // Item requirement
        if (triggerType === 'item') {
            const hasItem = this._inventory && this._inventory.some(it => it && (it.id === triggerValue || it.item_id === triggerValue));
            if (!hasItem) canEvolve = false;
            const itemRow = document.createElement('div');
            itemRow.style.cssText = `font-size:0.6rem;color:${hasItem ? '#33cc66' : '#cc6633'};margin-bottom:2px;`;
            itemRow.textContent = `${hasItem ? '\u2714' : '\u2718'} ${triggerDesc || 'Requires evolution item'}`;
            reqDiv.appendChild(itemRow);

            // Also check level (item-based still may need a level)
            if (triggerValue > 0) {
                const levelMet = currentLevel >= (triggerValue > 200 ? 1 : triggerValue);
                // For item triggers, level is not always required
            }
        }

        // Fallback check for evoRequirements
        if (evoRequirements.item && triggerType !== 'item') {
            const hasItem = this._inventory && this._inventory.some(it => it && it.id === evoRequirements.item);
            if (!hasItem) canEvolve = false;
            const itemRow = document.createElement('div');
            itemRow.style.cssText = `font-size:0.6rem;color:${hasItem ? '#33cc66' : '#cc6633'};margin-bottom:2px;`;
            itemRow.textContent = `${hasItem ? '\u2714' : '\u2718'} ${evoRequirements.itemName || 'Evolution Item'}`;
            reqDiv.appendChild(itemRow);
        }

        if (evoRequirements.condition) {
            canEvolve = false; // Conditions need special handling
            const condRow = document.createElement('div');
            condRow.style.cssText = 'font-size:0.6rem;color:#cc9933;margin-bottom:2px;';
            condRow.textContent = `\u25CB ${evoRequirements.conditionDescription || evoRequirements.condition}`;
            reqDiv.appendChild(condRow);
        }

        container.appendChild(reqDiv);

        // ── Stat preview for next stage ──
        if (nextForm && nextForm.stat_multipliers) {
            const previewHeader = document.createElement('div');
            previewHeader.style.cssText = 'font-size:0.55rem;font-weight:700;color:#666;margin-bottom:3px;';
            previewHeader.textContent = 'After Evolution:';
            container.appendChild(previewHeader);

            const compGrid = document.createElement('div');
            compGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px;margin-bottom:8px;';
            const currentForm = formId ? EVOLUTION_FORMS[formId] : null;
            const statDefs = [
                { key: 'hp', label: 'HP', color: '#33cc66' },
                { key: 'atk', label: 'ATK', color: '#ff6644' },
                { key: 'def', label: 'DEF', color: '#4488ff' },
                { key: 'sp_atk', label: 'SP.A', color: '#ff66aa' },
                { key: 'sp_def', label: 'SP.D', color: '#66aaff' },
                { key: 'spd', label: 'SPD', color: '#66ffcc' },
            ];
            for (const s of statDefs) {
                const curMult = currentForm ? (currentForm.stat_multipliers[s.key] || 1.0) : 1.0;
                const nextMult = nextForm.stat_multipliers[s.key] || 1.0;
                const increase = nextMult - curMult;
                const cell = document.createElement('div');
                cell.style.cssText = 'text-align:center;padding:2px;border-radius:3px;background:rgba(255,255,255,0.03);';
                const lbl = document.createElement('div');
                lbl.style.cssText = 'font-size:0.4rem;color:#666;font-weight:700;';
                lbl.textContent = s.label;
                cell.appendChild(lbl);
                const val = document.createElement('div');
                val.style.cssText = `font-size:0.55rem;font-weight:600;color:#33cc66;`;
                val.textContent = `+${increase.toFixed(1)}`;
                cell.appendChild(val);
                compGrid.appendChild(cell);
            }
            container.appendChild(compGrid);
        }

        // ── Evolve button ──
        const evolveBtn = document.createElement('button');
        evolveBtn.style.cssText = `
            width:100%;padding:8px;font-size:0.75rem;font-weight:700;
            border:2px solid ${canEvolve ? '#ffcc33' : '#444'};
            border-radius:6px;
            background:${canEvolve ? 'rgba(200,150,30,0.2)' : 'rgba(40,40,40,0.3)'};
            color:${canEvolve ? '#ffcc33' : '#555'};
            cursor:${canEvolve ? 'pointer' : 'not-allowed'};
            min-height:44px;
        `;
        evolveBtn.textContent = canEvolve ? '\u2728 Evolve!' : 'Not Ready';

        if (canEvolve) {
            evolveBtn.addEventListener('click', () => {
                this._performEvolution(inst, raceData, stageData);
            });
        }

        container.appendChild(evolveBtn);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Actions
    // ═══════════════════════════════════════════════════════════════════

    _depositSprite(sprite) {
        const partyIdx = this._party.indexOf(sprite);
        if (partyIdx < 0) return;
        if (this._party.length <= 1) return; // Must keep at least 1 in party

        // Remove from party
        this._party.splice(partyIdx, 1);

        // Add to current storage box
        const box = this._storage[this._currentBoxIndex];
        if (box.length < STORAGE_BOX_SIZE) {
            box.push(sprite);
        } else {
            // Find first box with space
            let placed = false;
            for (const b of this._storage) {
                if (b.length < STORAGE_BOX_SIZE) {
                    b.push(sprite);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                // Create new box
                this._storage.push([sprite]);
            }
        }

        this._savePlayerData();
        this._detailSprite = null;
        this._detailPanelEl.style.display = 'none';
        this._setActiveTab(this._activeTab);

        eventBus.emit(GameEvents.TEAM_CHANGED, this._party);
        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.4
        );
    }

    _withdrawSprite(sprite) {
        if (this._party.length >= MAX_PARTY_SIZE) return;

        // Find and remove from storage
        for (const box of this._storage) {
            const idx = box.indexOf(sprite);
            if (idx >= 0) {
                box.splice(idx, 1);
                break;
            }
        }

        // Add to party
        this._party.push(sprite);

        this._savePlayerData();
        this._detailSprite = null;
        this._detailPanelEl.style.display = 'none';
        this._setActiveTab(this._activeTab);

        eventBus.emit(GameEvents.TEAM_CHANGED, this._party);
        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.4
        );
    }

    _equipAbility(inst, ability, currentEquipped) {
        if (!ability || !ability.abilityId) return;

        // If already at max equipped, replace the last one
        if (currentEquipped.length >= MAX_EQUIPPED_ABILITIES) {
            currentEquipped[MAX_EQUIPPED_ABILITIES - 1] = ability.abilityId;
        } else {
            currentEquipped.push(ability.abilityId);
        }

        inst.equippedAbilities = [...currentEquipped];
        this._savePlayerData();
        this._renderDetailPanel();

        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.3
        );
    }

    _unequipItem(inst, slotKey) {
        const equipment = inst.equipment || {};
        const eqId = equipment[slotKey];
        if (!eqId && eqId !== 0) return;

        // Return item to equipment inventory (store the numeric ID)
        const numericId = typeof eqId === 'object' ? (eqId.equipment_id || eqId.equipmentId) : eqId;
        if (numericId && numericId > 0) {
            this._equipmentInventory.push(numericId);
        }
        delete equipment[slotKey];
        inst.equipment = equipment;

        // Invalidate sprite cache for this unit
        HumanoidSpriteSystem.invalidateCache(
            inst.raceId || inst.race_id || 1,
            inst.evolutionStage || inst.evolution_stage || 1,
            equipment
        );

        this._savePlayerData();
        this._renderDetailPanel();

        eventBus.emit(GameEvents.EQUIPMENT_CHANGED, inst);
        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.3
        );
    }

    _showEquipSelection(inst, slotKey, compatibleItems) {
        // Create a simple selection overlay within the detail panel
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:absolute;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.9);z-index:5;overflow-y:auto;padding:8px;
        `;

        const overlayHeader = document.createElement('div');
        overlayHeader.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;';

        const overlayTitle = document.createElement('span');
        overlayTitle.style.cssText = 'font-size:0.75rem;font-weight:700;color:#ffcc33;';
        overlayTitle.textContent = `Select ${slotKey}`;
        overlayHeader.appendChild(overlayTitle);

        const closeOverlay = document.createElement('button');
        closeOverlay.style.cssText = 'padding:2px 8px;font-size:0.65rem;border:1px solid #555;border-radius:3px;background:rgba(0,0,0,0.5);color:#aaa;cursor:pointer;';
        closeOverlay.textContent = 'Cancel';
        closeOverlay.addEventListener('click', () => {
            overlay.parentNode.removeChild(overlay);
        });
        overlayHeader.appendChild(closeOverlay);

        overlay.appendChild(overlayHeader);

        for (const item of compatibleItems) {
            const itemRow = document.createElement('div');
            itemRow.style.cssText = `
                padding:6px;margin-bottom:3px;border-radius:4px;
                border:1px solid rgba(255,255,255,0.08);
                background:rgba(255,255,255,0.03);cursor:pointer;
            `;

            const itemName = document.createElement('div');
            itemName.style.cssText = 'font-size:0.7rem;color:#ccddee;font-weight:600;';
            itemName.textContent = item.name || 'Unknown';
            itemRow.appendChild(itemName);

            if (item.stats) {
                const statsLine = document.createElement('div');
                statsLine.style.cssText = 'font-size:0.55rem;color:#888;';
                const parts = [];
                for (const key in item.stats) {
                    parts.push(`${key}: +${item.stats[key]}`);
                }
                statsLine.textContent = parts.join(' | ');
                itemRow.appendChild(statsLine);
            }

            itemRow.addEventListener('click', () => {
                this._equipItem(inst, slotKey, item);
                overlay.parentNode.removeChild(overlay);
            });
            itemRow.addEventListener('mouseenter', () => { itemRow.style.background = 'rgba(255,255,255,0.06)'; });
            itemRow.addEventListener('mouseleave', () => { itemRow.style.background = 'rgba(255,255,255,0.03)'; });

            overlay.appendChild(itemRow);
        }

        this._detailPanelEl.appendChild(overlay);
    }

    _equipItem(inst, slotKey, item) {
        const equipment = inst.equipment || {};

        // If there is already an item in this slot, return it to equipment inventory
        const oldId = equipment[slotKey];
        if (oldId) {
            const numericOldId = typeof oldId === 'object' ? (oldId.equipment_id || oldId.equipmentId) : oldId;
            if (numericOldId && numericOldId > 0) {
                this._equipmentInventory.push(numericOldId);
            }
        }

        // Equip the new item (store equipment_id for data-driven lookup)
        const newEqId = item.equipment_id || item.equipmentId;
        equipment[slotKey] = newEqId || item;

        // Remove from equipment inventory
        const removeId = newEqId || (typeof item === 'number' ? item : null);
        if (removeId) {
            const invIdx = this._equipmentInventory.indexOf(removeId);
            if (invIdx >= 0) {
                this._equipmentInventory.splice(invIdx, 1);
            }
        }

        inst.equipment = equipment;

        // Invalidate sprite cache so the new equipment is rendered
        HumanoidSpriteSystem.invalidateCache(
            inst.raceId || inst.race_id || 1,
            inst.evolutionStage || inst.evolution_stage || 1,
            equipment
        );

        this._savePlayerData();
        this._renderDetailPanel();

        eventBus.emit(GameEvents.EQUIPMENT_CHANGED, inst);
        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_confirm.ogg'), 0.4
        );
    }

    _performEvolution(inst, raceData, stageData) {
        const currentStage = inst.evolutionStage || stageData.stageNumber || 1;
        if (currentStage >= STAGES_PER_RACE) return;

        // Consume evolution item if required
        const evoReqs = stageData.evolutionRequirements || raceData.evolutionRequirements || {};
        if (evoReqs.item) {
            const itemIdx = this._inventory.findIndex(it => it && it.id === evoReqs.item);
            if (itemIdx >= 0) {
                this._inventory.splice(itemIdx, 1);
            }
        }

        // Also consume items from EVOLUTION_FORMS triggers (e.g., Frost Shard, Shadow Gem)
        const evoRaceId = inst.raceId || inst.race_id || 1;
        const evoRace = SPRITE_RACES.find(r => r.race_id === evoRaceId);
        const evoChainIds = evoRace ? evoRace.evolution_chain : [];
        const nextEvoFormId = evoChainIds[currentStage]; // next stage index
        const nextEvoForm = nextEvoFormId ? EVOLUTION_FORMS[nextEvoFormId] : null;
        if (nextEvoForm && nextEvoForm.evolution_trigger_type === 'item' && nextEvoForm.evolution_trigger_value) {
            const trigItemId = nextEvoForm.evolution_trigger_value;
            const trigIdx = this._inventory.findIndex(
                it => it && (it.id === trigItemId || it.item_id === trigItemId)
            );
            if (trigIdx >= 0) {
                this._inventory.splice(trigIdx, 1);
            }
        }

        // Advance evolution stage
        inst.evolutionStage = currentStage + 1;

        // Update registry
        const raceId = inst.raceId || 1;
        const newFormId = (raceId - 1) * STAGES_PER_RACE + inst.evolutionStage;
        if (!this._registry[newFormId]) {
            this._registry[newFormId] = {};
        }
        this._registry[newFormId].seen = true;
        this._registry[newFormId].caught = true;

        this._savePlayerData();

        // Emit evolution event
        eventBus.emit(GameEvents.EVOLUTION_COMPLETE, inst);

        // Play evolution SFX
        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/evolution.ogg'), 0.7
        );

        // Refresh detail
        this._renderDetailPanel();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Sprite Preview (Canvas)
    // ═══════════════════════════════════════════════════════════════════

    _renderSpritePreview() {
        // This would render a sprite animation preview on a small offscreen canvas
        // For now, the detail panel uses DOM-only rendering.
    }

    // ═══════════════════════════════════════════════════════════════════
    // Navigation
    // ═══════════════════════════════════════════════════════════════════

    _goBack() {
        this.engine.audio.stopMusic(300);
        this.engine.scenes.popScene().catch(() => {
            this.engine.scenes.changeTo('overworld', {});
        });
    }
}

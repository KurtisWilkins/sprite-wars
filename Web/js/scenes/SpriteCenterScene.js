/**
 * SpriteCenterScene -- Sprite management hub for Sprite Wars.
 * Provides tab-based navigation for Team, Storage, and Registry management.
 *
 * - Team tab: party of 6, tap to view details, drag to reorder
 * - Storage tab: PC box grid system, deposit/withdraw sprites
 * - Registry tab: Pokedex-style grid showing all 72 forms (seen/caught)
 * - Sprite detail: stats, abilities, equipment, evolution progress
 * - Equipment management (equip/unequip items)
 * - Ability management (select 4 active from learned pool)
 *
 * Uses DOM panels for the UI and Canvas for sprite previews.
 *
 * enter(data) receives:
 *   { tab: string } (optional, default 'team')
 */

import { Scene } from '../core/SceneManager.js';
import { eventBus, GameEvents } from '../core/EventBus.js';
import { SPRITE_RACES } from '../data/SpriteData.js';

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
const MAX_EQUIPPED_ABILITIES = 4;
const STORAGE_BOX_SIZE = 30; // sprites per box
const STORAGE_BOX_COLS = 6;
const REGISTRY_COLS = 8;
const SPRITE_PREVIEW_SIZE = 64;

const ELEMENT_COLORS = {
    Fire: '#ff5533', Water: '#3399ff', Earth: '#996633', Wind: '#88ccaa',
    Electric: '#ffcc00', Ice: '#99ddff', Nature: '#33aa33', Poison: '#aa33aa',
    Light: '#ffee99', Dark: '#553366', Metal: '#aaaacc', Psychic: '#ff66aa',
    Dragon: '#6633cc', Spirit: '#ccccff',
};

const COLOR_BG = '#0b0b1a';

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

        // ── Event cleanup ─────────────────────────────────────────────
        this._unsubs = [];
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

        // Build DOM
        this._createDOM();
        this._setActiveTab(this._activeTab);

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

        eventBus.emit(GameEvents.SCREEN_CLOSED, 'sprite_center');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Update / Render
    // ═══════════════════════════════════════════════════════════════════

    update(dt) {
        super.update(dt);
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
        this._detailPanelEl.style.cssText = `
            width:200px;background:rgba(0,0,0,0.4);
            border-left:1px solid rgba(255,255,255,0.06);
            overflow-y:auto;padding:8px;display:none;
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
        const elemTypes = raceData.elementTypes || [];

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

        // Element indicator
        const elemColor = ELEMENT_COLORS[elemTypes[0]] || '#888';
        const elemDot = document.createElement('div');
        elemDot.style.cssText = `
            width:28px;height:28px;border-radius:50%;background:${elemColor};
            display:flex;align-items:center;justify-content:center;
            font-size:0.6rem;font-weight:700;color:#fff;flex-shrink:0;
        `;
        elemDot.textContent = `${inst.level || 1}`;
        row.appendChild(elemDot);

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
        const hp = inst.currentHp !== undefined ? inst.currentHp : (inst.maxHp || 100);
        const maxHp = inst.maxHp || 100;
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

            const elemTypes = sprite && sprite.raceData ? (sprite.raceData.elementTypes || []) : [];
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

                // Element circle
                const dot = document.createElement('div');
                dot.style.cssText = `
                    width:20px;height:20px;border-radius:50%;background:${elemColor};
                    display:flex;align-items:center;justify-content:center;
                    font-size:0.55rem;font-weight:700;color:#fff;margin-bottom:2px;
                `;
                dot.textContent = `${inst.level || '?'}`;
                cell.appendChild(dot);

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
        progressFill.style.cssText = `width:${(caughtCount / TOTAL_FORMS) * 100}%;height:100%;background:linear-gradient(90deg,#33cc66,#66ff99);`;
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
        const sprite = this._detailSprite;
        if (!sprite) {
            this._detailPanelEl.style.display = 'none';
            return;
        }

        const inst = sprite.instance || sprite;
        const raceData = sprite.raceData || {};
        const stageData = sprite.stageData || {};
        const abilities = sprite.abilities || inst.abilities || [];
        const elemTypes = raceData.elementTypes || [];

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
        // Equipped abilities
        const equippedHeader = document.createElement('div');
        equippedHeader.style.cssText = 'font-size:0.65rem;font-weight:700;color:#aaa;margin-bottom:4px;';
        equippedHeader.textContent = `Active Abilities (${Math.min(abilities.length, MAX_EQUIPPED_ABILITIES)}/${MAX_EQUIPPED_ABILITIES})`;
        container.appendChild(equippedHeader);

        const equippedIds = inst.equippedAbilities || abilities.slice(0, MAX_EQUIPPED_ABILITIES).map(a => a.abilityId);
        const equippedList = document.createElement('div');
        equippedList.style.cssText = 'margin-bottom:10px;';

        for (let i = 0; i < MAX_EQUIPPED_ABILITIES; i++) {
            const ability = abilities.find(a => a && a.abilityId === equippedIds[i]) || abilities[i];
            const slot = document.createElement('div');

            if (ability) {
                const elemColor = ELEMENT_COLORS[ability.elementType] || '#666';
                slot.style.cssText = `
                    padding:4px 6px;margin-bottom:2px;border-radius:4px;
                    border-left:3px solid ${elemColor};
                    background:rgba(255,255,255,0.03);font-size:0.6rem;
                `;

                const nameRow = document.createElement('div');
                nameRow.style.cssText = 'display:flex;justify-content:space-between;';

                const nameSpan = document.createElement('span');
                nameSpan.style.cssText = 'color:#ccddee;font-weight:600;';
                nameSpan.textContent = ability.abilityName || `Ability #${ability.abilityId}`;
                nameRow.appendChild(nameSpan);

                const pwrSpan = document.createElement('span');
                pwrSpan.style.cssText = `color:${elemColor};`;
                pwrSpan.textContent = ability.basePower ? `Pwr:${ability.basePower}` : 'Status';
                nameRow.appendChild(pwrSpan);

                slot.appendChild(nameRow);

                const infoRow = document.createElement('div');
                infoRow.style.cssText = 'font-size:0.55rem;color:#777;';
                infoRow.textContent = `${ability.elementType || '???'} | PP:${ability.ppMax || '?'} | Acc:${Math.round((ability.accuracy || 1) * 100)}%`;
                slot.appendChild(infoRow);
            } else {
                slot.style.cssText = `
                    padding:4px 6px;margin-bottom:2px;border-radius:4px;
                    border-left:3px solid #333;
                    background:rgba(255,255,255,0.01);font-size:0.6rem;
                    color:#444;
                `;
                slot.textContent = `Slot ${i + 1} - Empty`;
            }

            equippedList.appendChild(slot);
        }
        container.appendChild(equippedList);

        // Learned abilities pool (those not equipped)
        const learnedAbilities = abilities.filter(a => a && !equippedIds.includes(a.abilityId));
        if (learnedAbilities.length > 0) {
            const learnedHeader = document.createElement('div');
            learnedHeader.style.cssText = 'font-size:0.6rem;font-weight:700;color:#666;margin-bottom:3px;';
            learnedHeader.textContent = 'Learned Pool';
            container.appendChild(learnedHeader);

            for (const ability of learnedAbilities) {
                const elemColor = ELEMENT_COLORS[ability.elementType] || '#444';
                const row = document.createElement('div');
                row.style.cssText = `
                    display:flex;justify-content:space-between;align-items:center;
                    padding:3px 6px;margin-bottom:1px;border-radius:3px;
                    font-size:0.55rem;color:#888;cursor:pointer;
                    border-left:2px solid ${elemColor}66;
                `;
                row.textContent = `${ability.abilityName || '???'} (${ability.elementType || '???'})`;

                // Swap button
                const swapBtn = document.createElement('button');
                swapBtn.style.cssText = `
                    padding:1px 6px;font-size:0.5rem;border:1px solid #555;
                    border-radius:3px;background:rgba(0,0,0,0.3);color:#aaa;cursor:pointer;
                `;
                swapBtn.textContent = 'Equip';
                swapBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._equipAbility(inst, ability, equippedIds);
                });
                row.appendChild(swapBtn);

                container.appendChild(row);
            }
        }
    }

    _renderEquipmentMode(container, inst) {
        const equipment = inst.equipment || {};
        const equipSlots = [
            { key: 'weapon', label: 'Weapon' },
            { key: 'armor', label: 'Armor' },
            { key: 'accessory', label: 'Accessory' },
            { key: 'charm', label: 'Charm' },
        ];

        for (const slot of equipSlots) {
            const item = equipment[slot.key];
            const slotDiv = document.createElement('div');
            slotDiv.style.cssText = `
                padding:6px;margin-bottom:4px;border-radius:6px;
                border:1px solid rgba(255,255,255,0.06);
                background:rgba(255,255,255,0.02);
            `;

            const labelRow = document.createElement('div');
            labelRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

            const label = document.createElement('span');
            label.style.cssText = 'font-size:0.6rem;color:#888;';
            label.textContent = slot.label;
            labelRow.appendChild(label);

            if (item) {
                const unequipBtn = document.createElement('button');
                unequipBtn.style.cssText = `
                    padding:1px 6px;font-size:0.5rem;border:1px solid #884444;
                    border-radius:3px;background:rgba(80,30,30,0.3);color:#cc8888;cursor:pointer;
                `;
                unequipBtn.textContent = 'Remove';
                unequipBtn.addEventListener('click', () => {
                    this._unequipItem(inst, slot.key);
                });
                labelRow.appendChild(unequipBtn);
            }

            slotDiv.appendChild(labelRow);

            if (item) {
                const itemName = document.createElement('div');
                itemName.style.cssText = 'font-size:0.7rem;color:#ccddee;font-weight:600;margin-top:2px;';
                itemName.textContent = item.name || 'Unknown Item';
                slotDiv.appendChild(itemName);

                // Item stats
                if (item.stats) {
                    const statsLine = document.createElement('div');
                    statsLine.style.cssText = 'font-size:0.55rem;color:#888;margin-top:1px;';
                    const parts = [];
                    for (const key in item.stats) {
                        parts.push(`${key}: +${item.stats[key]}`);
                    }
                    statsLine.textContent = parts.join(' | ');
                    slotDiv.appendChild(statsLine);
                }
            } else {
                const emptyLabel = document.createElement('div');
                emptyLabel.style.cssText = 'font-size:0.6rem;color:#444;margin-top:2px;';
                emptyLabel.textContent = '(empty)';
                slotDiv.appendChild(emptyLabel);

                // Show equip button if we have items in inventory
                const compatibleItems = this._inventory.filter(
                    it => it && it.equipSlot === slot.key
                );
                if (compatibleItems.length > 0) {
                    const equipBtn = document.createElement('button');
                    equipBtn.style.cssText = `
                        margin-top:4px;padding:2px 8px;font-size:0.55rem;
                        border:1px solid #338833;border-radius:3px;
                        background:rgba(30,60,30,0.3);color:#88cc88;cursor:pointer;
                    `;
                    equipBtn.textContent = `Equip (${compatibleItems.length} available)`;
                    equipBtn.addEventListener('click', () => {
                        this._showEquipSelection(inst, slot.key, compatibleItems);
                    });
                    slotDiv.appendChild(equipBtn);
                }
            }

            container.appendChild(slotDiv);
        }
    }

    _renderEvolutionMode(container, inst, raceData, stageData) {
        const currentStage = inst.evolutionStage || stageData.stageNumber || 1;
        const maxStage = STAGES_PER_RACE;

        // Evolution chain visual
        const chainDiv = document.createElement('div');
        chainDiv.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;justify-content:center;';

        for (let s = 1; s <= maxStage; s++) {
            const stageCircle = document.createElement('div');
            const isActive = s === currentStage;
            const isPast = s < currentStage;
            const bgColor = isActive ? '#ffcc33' : isPast ? '#33aa66' : '#333';
            const textColor = isActive || isPast ? '#fff' : '#555';

            stageCircle.style.cssText = `
                width:32px;height:32px;border-radius:50%;background:${bgColor};
                display:flex;align-items:center;justify-content:center;
                font-size:0.7rem;font-weight:700;color:${textColor};
                border:2px solid ${isActive ? '#ffdd55' : isPast ? '#44cc77' : '#444'};
            `;
            stageCircle.textContent = `${s}`;
            chainDiv.appendChild(stageCircle);

            // Arrow between stages
            if (s < maxStage) {
                const arrow = document.createElement('span');
                arrow.style.cssText = `color:${s < currentStage ? '#44cc77' : '#444'};font-size:0.8rem;`;
                arrow.textContent = '\u2192';
                chainDiv.appendChild(arrow);
            }
        }
        container.appendChild(chainDiv);

        // Current stage info
        const stageInfo = document.createElement('div');
        stageInfo.style.cssText = 'font-size:0.7rem;color:#aaa;text-align:center;margin-bottom:8px;';
        stageInfo.textContent = `Current Stage: ${currentStage}/${maxStage}`;
        container.appendChild(stageInfo);

        if (currentStage >= maxStage) {
            const maxedLabel = document.createElement('div');
            maxedLabel.style.cssText = 'color:#ffcc33;font-size:0.75rem;font-weight:700;text-align:center;margin:12px 0;';
            maxedLabel.textContent = 'Fully Evolved!';
            container.appendChild(maxedLabel);
            return;
        }

        // Evolution requirements
        const evoRequirements = stageData.evolutionRequirements || raceData.evolutionRequirements || {};
        const reqDiv = document.createElement('div');
        reqDiv.style.cssText = 'margin-bottom:10px;';

        const reqHeader = document.createElement('div');
        reqHeader.style.cssText = 'font-size:0.65rem;font-weight:700;color:#888;margin-bottom:4px;';
        reqHeader.textContent = 'Requirements for Next Evolution';
        reqDiv.appendChild(reqHeader);

        // Level requirement
        const reqLevel = evoRequirements.level || ((currentStage) * 15);
        const currentLevel = inst.level || 1;
        const levelMet = currentLevel >= reqLevel;
        const levelRow = document.createElement('div');
        levelRow.style.cssText = `font-size:0.6rem;color:${levelMet ? '#33cc66' : '#cc6633'};margin-bottom:2px;`;
        levelRow.textContent = `${levelMet ? '\u2714' : '\u2718'} Level ${reqLevel} (current: ${currentLevel})`;
        reqDiv.appendChild(levelRow);

        // Level progress bar
        const levelProgress = Math.min(1, currentLevel / reqLevel);
        const levelBar = document.createElement('div');
        levelBar.style.cssText = 'width:100%;height:4px;background:#1a1a2e;border-radius:2px;overflow:hidden;margin-bottom:4px;';
        const levelFill = document.createElement('div');
        levelFill.style.cssText = `width:${levelProgress * 100}%;height:100%;background:${levelMet ? '#33cc66' : '#cc6633'};`;
        levelBar.appendChild(levelFill);
        reqDiv.appendChild(levelBar);

        // Item requirement (if any)
        if (evoRequirements.item) {
            const hasItem = this._inventory.some(it => it && it.id === evoRequirements.item);
            const itemRow = document.createElement('div');
            itemRow.style.cssText = `font-size:0.6rem;color:${hasItem ? '#33cc66' : '#cc6633'};margin-bottom:2px;`;
            itemRow.textContent = `${hasItem ? '\u2714' : '\u2718'} ${evoRequirements.itemName || 'Evolution Item'}`;
            reqDiv.appendChild(itemRow);
        }

        // Special condition (if any)
        if (evoRequirements.condition) {
            const condRow = document.createElement('div');
            condRow.style.cssText = 'font-size:0.6rem;color:#cc9933;margin-bottom:2px;';
            condRow.textContent = `\u25CB ${evoRequirements.conditionDescription || evoRequirements.condition}`;
            reqDiv.appendChild(condRow);
        }

        container.appendChild(reqDiv);

        // Evolve button (if all requirements met)
        const canEvolve = levelMet && (!evoRequirements.item ||
            this._inventory.some(it => it && it.id === evoRequirements.item));

        const evolveBtn = document.createElement('button');
        evolveBtn.style.cssText = `
            width:100%;padding:8px;font-size:0.75rem;font-weight:700;
            border:2px solid ${canEvolve ? '#ffcc33' : '#444'};
            border-radius:6px;
            background:${canEvolve ? 'rgba(200,150,30,0.2)' : 'rgba(40,40,40,0.3)'};
            color:${canEvolve ? '#ffcc33' : '#555'};
            cursor:${canEvolve ? 'pointer' : 'not-allowed'};
        `;
        evolveBtn.textContent = canEvolve ? 'Evolve!' : 'Not Ready';

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
        const item = equipment[slotKey];
        if (!item) return;

        // Return item to inventory
        this._inventory.push(item);
        delete equipment[slotKey];
        inst.equipment = equipment;

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

        // If there is already an item, put it back in inventory
        if (equipment[slotKey]) {
            this._inventory.push(equipment[slotKey]);
        }

        // Equip the new item and remove from inventory
        equipment[slotKey] = item;
        const invIdx = this._inventory.indexOf(item);
        if (invIdx >= 0) {
            this._inventory.splice(invIdx, 1);
        }

        inst.equipment = equipment;
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

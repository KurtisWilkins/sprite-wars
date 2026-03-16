/**
 * BagScene -- Inventory management hub for Sprite Wars.
 * Provides tab-based navigation for Items, Equipment, and Key Items.
 *
 * - Items tab: consumables and crystals grouped by category
 * - Equipment tab: collected equipment grouped by slot type
 * - Key Items tab: placeholder for future quest items
 *
 * Uses DOM panels for the UI, rendered into #screen-panel / game-container.
 *
 * enter(data) receives:
 *   { tab: string } (optional, default 'items')
 */

import { Scene } from '../core/SceneManager.js';
import { eventBus, GameEvents } from '../core/EventBus.js';
import { CONSUMABLES, CRYSTALS } from '../data/ItemData.js';
import { EQUIPMENT, getAllEquipmentWithExpansion } from '../data/EquipmentData.js';
import { SkeletalAnimationSystem } from '../systems/rendering/SkeletalAnimationSystem.js';
import { getRaceSpritePath } from '../data/SpriteTextureHelper.js';

// ── Constants ───────────────────────────────────────────────────────────────
const TABS = ['items', 'equipment', 'keyitems'];
const TAB_LABELS = { items: 'Items', equipment: 'Equipment', keyitems: 'Key Items' };

const COLOR_BG = '#1a2a3a';  // Medieval fantasy flat dark blue

const RARITY_COLORS = {
    common: '#aaaaaa',
    uncommon: '#44cc44',
    rare: '#4488ff',
    epic: '#aa44ee',
    legendary: '#ffaa00',
};

const CATEGORY_COLORS = {
    potion: '#33cc66',
    status_cure: '#66aaff',
    battle_item: '#ff6644',
    utility: '#cccc44',
    crystal: '#cc66ff',
};

const CATEGORY_LABELS = {
    potion: 'Potions',
    status_cure: 'Status Cures',
    battle_item: 'Battle Items',
    utility: 'Utility',
    crystal: 'Crystals',
};

const SLOT_LABELS = {
    weapon: 'Weapons',
    helmet: 'Helmets',
    chest: 'Chests',
    legs: 'Legs',
    boots: 'Boots',
    gloves: 'Gloves',
    ring: 'Rings',
    amulet: 'Amulets',
    crystal: 'Crystals',
};

const SLOT_ORDER = ['weapon', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'ring', 'amulet', 'crystal'];

// Build lookup maps for fast item/equipment resolution by id
const ITEM_MAP = {};
for (const item of CONSUMABLES) {
    ITEM_MAP[item.item_id] = item;
}
for (const crystal of CRYSTALS) {
    ITEM_MAP[crystal.item_id] = crystal;
}

const EQUIPMENT_MAP = {};
for (const eq of getAllEquipmentWithExpansion()) {
    EQUIPMENT_MAP[eq.equipment_id] = eq;
}

// ── Helper: categorize a consumable/crystal item ────────────────────────────
function _getItemCategory(item) {
    // Crystals (from CRYSTALS array) don't have a category field
    if (item.catch_multiplier !== undefined) return 'crystal';
    return item.category || 'utility';
}

export class BagScene extends Scene {
    constructor(engine) {
        super(engine);

        // ── Tab state ────────────────────────────────────────────────────
        this._activeTab = 'items';

        // ── Player data references ───────────────────────────────────────
        this._inventory = {};            // { item_id: quantity }
        this._equipmentInventory = [];   // array of equipment_id numbers

        // ── Selection state ──────────────────────────────────────────────
        this._selectedItemIndex = -1;
        this._selectedEquipIndex = -1;
        this._flatItemList = [];         // flattened list of { id, def } for keyboard nav
        this._flatEquipList = [];        // flattened list of { id, def } for keyboard nav

        // ── Detail panel ─────────────────────────────────────────────────
        this._detailEquip = null;        // currently viewed equipment detail

        // ── DOM references ───────────────────────────────────────────────
        this._domContainer = null;
        this._tabBarEl = null;
        this._contentEl = null;
        this._detailPanelEl = null;

        // ── Keyboard handler ─────────────────────────────────────────────
        this._boundKeyHandler = null;

        // ── Event cleanup ────────────────────────────────────────────────
        this._unsubs = [];
    }

    // ═════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═════════════════════════════════════════════════════════════════════

    async init() {
        this.initialized = true;
    }

    enter(data) {
        this._activeTab = (data && data.tab && TABS.includes(data.tab)) ? data.tab : 'items';
        this._selectedItemIndex = -1;
        this._selectedEquipIndex = -1;
        this._detailEquip = null;
        this._flatItemList = [];
        this._flatEquipList = [];

        // Load player data
        this._loadPlayerData();

        // Build DOM
        this._createDOM();
        this._setActiveTab(this._activeTab);

        // Keyboard listener
        this._boundKeyHandler = (e) => this._handleKeyDown(e);
        document.addEventListener('keydown', this._boundKeyHandler);

        // Subscribe to inventory changes
        this._unsubs.push(
            eventBus.on(GameEvents.ITEM_USED, () => {
                this._loadPlayerData();
                if (this._activeTab === 'items') this._renderItemsTab();
            })
        );
        this._unsubs.push(
            eventBus.on(GameEvents.ITEM_OBTAINED, () => {
                this._loadPlayerData();
                if (this._activeTab === 'items') this._renderItemsTab();
            })
        );
        this._unsubs.push(
            eventBus.on(GameEvents.EQUIPMENT_CHANGED, () => {
                this._loadPlayerData();
                if (this._activeTab === 'equipment') this._renderEquipmentTab();
            })
        );

        eventBus.emit(GameEvents.SCREEN_OPENED, 'bag');
    }

    exit() {
        for (const unsub of this._unsubs) {
            if (typeof unsub === 'function') unsub();
        }
        this._unsubs = [];

        if (this._boundKeyHandler) {
            document.removeEventListener('keydown', this._boundKeyHandler);
            this._boundKeyHandler = null;
        }

        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
        }
        this._domContainer = null;
        this._tabBarEl = null;
        this._contentEl = null;
        this._detailPanelEl = null;

        eventBus.emit(GameEvents.SCREEN_CLOSED, 'bag');
    }

    // ═════════════════════════════════════════════════════════════════════
    // Update / Render
    // ═════════════════════════════════════════════════════════════════════

    update(dt) {
        super.update(dt);
    }

    render(renderer) {
        renderer.clear(COLOR_BG);
        super.render(renderer);
    }

    onInput(_input) {
        // All keyboard handling is done via DOM-level _handleKeyDown
        // to ensure proper preventDefault and avoid double-firing with engine input
    }

    // ═════════════════════════════════════════════════════════════════════
    // Keyboard Handling (DOM-level)
    // ═════════════════════════════════════════════════════════════════════

    _handleKeyDown(e) {
        const key = e.key;

        // Tab switching with number keys
        if (key === '1') { this._setActiveTab('items'); e.preventDefault(); return; }
        if (key === '2') { this._setActiveTab('equipment'); e.preventDefault(); return; }
        if (key === '3') { this._setActiveTab('keyitems'); e.preventDefault(); return; }

        // Tab key cycles tabs
        if (key === 'Tab') {
            e.preventDefault();
            const idx = TABS.indexOf(this._activeTab);
            const next = TABS[(idx + 1) % TABS.length];
            this._setActiveTab(next);
            return;
        }

        // Back
        if (key === 'Escape' || key === 'Backspace') {
            e.preventDefault();
            this._goBack();
            return;
        }

        // Arrow navigation
        if (this._activeTab === 'items') {
            this._handleItemsKeyNav(key, e);
        } else if (this._activeTab === 'equipment') {
            this._handleEquipKeyNav(key, e);
        }
    }

    _handleItemsKeyNav(key, e) {
        if (this._flatItemList.length === 0) return;

        if (key === 'ArrowDown') {
            e.preventDefault();
            this._selectedItemIndex = Math.min(this._selectedItemIndex + 1, this._flatItemList.length - 1);
            this._highlightItemRow(this._selectedItemIndex);
        } else if (key === 'ArrowUp') {
            e.preventDefault();
            this._selectedItemIndex = Math.max(this._selectedItemIndex - 1, 0);
            this._highlightItemRow(this._selectedItemIndex);
        } else if (key === 'Enter') {
            e.preventDefault();
            if (this._selectedItemIndex >= 0 && this._selectedItemIndex < this._flatItemList.length) {
                this._selectItem(this._flatItemList[this._selectedItemIndex]);
            }
        }
    }

    _handleEquipKeyNav(key, e) {
        if (this._flatEquipList.length === 0) return;

        if (key === 'ArrowDown') {
            e.preventDefault();
            this._selectedEquipIndex = Math.min(this._selectedEquipIndex + 1, this._flatEquipList.length - 1);
            this._highlightEquipRow(this._selectedEquipIndex);
        } else if (key === 'ArrowUp') {
            e.preventDefault();
            this._selectedEquipIndex = Math.max(this._selectedEquipIndex - 1, 0);
            this._highlightEquipRow(this._selectedEquipIndex);
        } else if (key === 'Enter') {
            e.preventDefault();
            if (this._selectedEquipIndex >= 0 && this._selectedEquipIndex < this._flatEquipList.length) {
                this._showEquipDetail(this._flatEquipList[this._selectedEquipIndex].def);
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // Data Loading
    // ═════════════════════════════════════════════════════════════════════

    _loadPlayerData() {
        const gm = this.engine.gameManager || {};
        const pd = gm.playerData || {};
        this._inventory = pd.inventory || {};
        this._equipmentInventory = pd.equipmentInventory || [];
    }

    // ═════════════════════════════════════════════════════════════════════
    // DOM Construction
    // ═════════════════════════════════════════════════════════════════════

    _createDOM() {
        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
        }

        this._domContainer = document.createElement('div');
        this._domContainer.id = 'bag-scene';
        this._domContainer.style.cssText = `
            position:absolute;top:0;left:0;width:100%;height:100%;
            pointer-events:auto;z-index:10;
            display:flex;flex-direction:column;background:${COLOR_BG};
        `;

        // Header bar with back button and title
        const headerBar = document.createElement('div');
        headerBar.className = 'panel-header';
        headerBar.style.cssText = `
            display:flex;align-items:center;padding:8px 12px;gap:12px;
            background:rgba(0,0,0,0.5);border-bottom:1px solid rgba(255,255,255,0.08);
            flex-shrink:0;
        `;

        const backBtn = document.createElement('button');
        backBtn.className = 'panel-back-btn';
        backBtn.style.cssText = `
            padding:4px 12px;font-size:0.8rem;border:1px solid #555;
            border-radius:6px;background:rgba(0,0,0,0.5);color:#aaa;cursor:pointer;
        `;
        backBtn.textContent = '\u2190';
        backBtn.addEventListener('click', () => this._goBack());
        headerBar.appendChild(backBtn);

        const title = document.createElement('span');
        title.className = 'panel-title';
        title.style.cssText = 'color:#ffcc33;font-size:1rem;font-weight:700;';
        title.textContent = 'Bag';
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

        // Main content area (content + optional detail panel)
        const mainArea = document.createElement('div');
        mainArea.style.cssText = 'display:flex;flex:1;overflow:hidden;';

        this._contentEl = document.createElement('div');
        this._contentEl.className = 'panel-content';
        this._contentEl.style.cssText = 'flex:1;overflow-y:auto;padding:8px;';
        mainArea.appendChild(this._contentEl);

        this._detailPanelEl = document.createElement('div');
        this._detailPanelEl.style.cssText = `
            width:220px;background:rgba(0,0,0,0.4);
            border-left:1px solid rgba(255,255,255,0.06);
            overflow-y:auto;padding:8px;display:none;position:relative;
        `;
        mainArea.appendChild(this._detailPanelEl);

        this._domContainer.appendChild(mainArea);

        const gameContainer = document.getElementById('game-container') || document.body;
        gameContainer.appendChild(this._domContainer);
    }

    _setActiveTab(tab) {
        this._activeTab = tab;
        this._selectedItemIndex = -1;
        this._selectedEquipIndex = -1;
        this._detailEquip = null;
        this._detailPanelEl.style.display = 'none';

        // Update tab bar styling
        const tabBtns = this._tabBarEl.querySelectorAll('button');
        for (const btn of tabBtns) {
            const isActive = btn.dataset.tab === tab;
            btn.style.color = isActive ? '#ffcc33' : '#888';
            btn.style.borderBottom = isActive ? '2px solid #ffcc33' : '2px solid transparent';
            btn.style.background = isActive ? 'rgba(255,204,51,0.05)' : 'transparent';
        }

        // Render tab content
        switch (tab) {
            case 'items':
                this._renderItemsTab();
                break;
            case 'equipment':
                this._renderEquipmentTab();
                break;
            case 'keyitems':
                this._renderKeyItemsTab();
                break;
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // Items Tab
    // ═════════════════════════════════════════════════════════════════════

    _renderItemsTab() {
        this._contentEl.innerHTML = '';
        this._flatItemList = [];

        // Gather owned items with their definitions
        const ownedItems = [];
        for (const idStr of Object.keys(this._inventory)) {
            const id = Number(idStr);
            const qty = this._inventory[id];
            if (qty <= 0) continue;
            const def = ITEM_MAP[id];
            if (!def) continue;
            ownedItems.push({ id, qty, def });
        }

        if (ownedItems.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color:#555;font-size:0.8rem;text-align:center;padding:40px 0;';
            empty.textContent = 'No items in your bag.';
            this._contentEl.appendChild(empty);
            return;
        }

        // Group by category
        const groups = {};
        for (const entry of ownedItems) {
            const cat = _getItemCategory(entry.def);
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(entry);
        }

        // Render category order
        const categoryOrder = ['potion', 'status_cure', 'battle_item', 'utility', 'crystal'];
        let flatIndex = 0;

        for (const cat of categoryOrder) {
            const items = groups[cat];
            if (!items || items.length === 0) continue;

            // Category header
            const catHeader = document.createElement('div');
            catHeader.style.cssText = `
                font-size:0.7rem;font-weight:700;color:${CATEGORY_COLORS[cat] || '#aaa'};
                margin:10px 0 4px 0;padding:2px 6px;
                border-bottom:1px solid ${CATEGORY_COLORS[cat] || '#333'}33;
                text-transform:uppercase;letter-spacing:0.05em;
            `;
            catHeader.textContent = CATEGORY_LABELS[cat] || cat;
            this._contentEl.appendChild(catHeader);

            // Item rows
            for (const entry of items) {
                const rowIndex = flatIndex++;
                this._flatItemList.push(entry);

                const row = this._createItemRow(entry, rowIndex);
                this._contentEl.appendChild(row);
            }
        }
    }

    _createItemRow(entry, rowIndex) {
        const { id, qty, def } = entry;
        const cat = _getItemCategory(def);
        const catColor = CATEGORY_COLORS[cat] || '#888';

        const row = document.createElement('div');
        row.dataset.itemRowIndex = rowIndex;
        row.style.cssText = `
            display:flex;align-items:center;gap:10px;padding:8px 10px;
            background:rgba(255,255,255,0.03);border-radius:8px;
            border:1px solid rgba(255,255,255,0.06);cursor:pointer;
            transition:background 0.15s;margin-bottom:3px;
        `;

        // Category icon using emoji
        const CATEGORY_ICONS = {
            potion: '\u{1F9EA}',
            status_cure: '\u{1F48A}',
            battle_item: '\u2694\uFE0F',
            utility: '\u{1F527}',
            crystal: '\u{1F48E}',
        };
        const icon = document.createElement('div');
        icon.style.cssText = `
            width:28px;height:28px;border-radius:6px;background:${catColor}22;
            display:flex;align-items:center;justify-content:center;
            font-size:0.9rem;flex-shrink:0;
            border:1px solid ${catColor}44;
        `;
        icon.textContent = CATEGORY_ICONS[cat] || '\u2753';
        row.appendChild(icon);

        // Info block
        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';

        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'font-size:0.8rem;font-weight:600;color:#ddddee;';
        nameSpan.textContent = def.name || def.equipment_name || `Item #${id}`;
        nameRow.appendChild(nameSpan);

        const qtySpan = document.createElement('span');
        qtySpan.style.cssText = 'font-size:0.7rem;font-weight:700;color:#aaa;';
        qtySpan.textContent = `x${qty}`;
        nameRow.appendChild(qtySpan);

        info.appendChild(nameRow);

        const descSpan = document.createElement('div');
        descSpan.style.cssText = 'font-size:0.6rem;color:#777;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
        descSpan.textContent = def.description || '';
        info.appendChild(descSpan);

        row.appendChild(info);

        // Click to select
        row.addEventListener('click', () => {
            this._selectedItemIndex = rowIndex;
            this._selectItem(entry);
            this._highlightItemRow(rowIndex);
        });

        // Hover effect
        row.addEventListener('mouseenter', () => {
            row.style.background = 'rgba(255,255,255,0.06)';
        });
        row.addEventListener('mouseleave', () => {
            const isSelected = this._selectedItemIndex === rowIndex;
            row.style.background = isSelected ? 'rgba(255,204,51,0.08)' : 'rgba(255,255,255,0.03)';
        });

        return row;
    }

    _highlightItemRow(index) {
        if (!this._contentEl) return;
        const rows = this._contentEl.querySelectorAll('[data-item-row-index]');
        for (const row of rows) {
            const ri = Number(row.dataset.itemRowIndex);
            if (ri === index) {
                row.style.background = 'rgba(255,204,51,0.08)';
                row.style.borderColor = 'rgba(255,204,51,0.2)';
                // Scroll into view if needed
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                row.style.background = 'rgba(255,255,255,0.03)';
                row.style.borderColor = 'rgba(255,255,255,0.06)';
            }
        }
    }

    _selectItem(entry) {
        const { id, qty, def } = entry;

        // Show detail in the side panel
        this._detailPanelEl.style.display = 'block';
        this._detailPanelEl.innerHTML = '';

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            position:absolute;top:4px;right:4px;padding:2px 6px;font-size:0.7rem;
            border:none;background:none;color:#888;cursor:pointer;
        `;
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', () => {
            this._detailPanelEl.style.display = 'none';
            this._selectedItemIndex = -1;
            this._highlightItemRow(-1);
        });
        this._detailPanelEl.appendChild(closeBtn);

        // Item name
        const nameEl = document.createElement('div');
        nameEl.style.cssText = 'font-size:0.9rem;font-weight:700;color:#ffcc33;margin-bottom:4px;padding-right:20px;';
        nameEl.textContent = def.name || `Item #${id}`;
        this._detailPanelEl.appendChild(nameEl);

        // Category badge
        const cat = _getItemCategory(def);
        const catColor = CATEGORY_COLORS[cat] || '#888';
        const catBadge = document.createElement('span');
        catBadge.style.cssText = `
            display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.6rem;
            background:${catColor}33;color:${catColor};border:1px solid ${catColor}55;
            margin-bottom:8px;
        `;
        catBadge.textContent = CATEGORY_LABELS[cat] || cat;
        this._detailPanelEl.appendChild(catBadge);

        // Quantity
        const qtyEl = document.createElement('div');
        qtyEl.style.cssText = 'font-size:0.7rem;color:#aaa;margin-bottom:8px;';
        qtyEl.textContent = `Quantity: ${qty}`;
        this._detailPanelEl.appendChild(qtyEl);

        // Description
        const descEl = document.createElement('div');
        descEl.style.cssText = 'font-size:0.65rem;color:#888;line-height:1.5;margin-bottom:12px;';
        descEl.textContent = def.description || 'No description.';
        this._detailPanelEl.appendChild(descEl);

        // Crystal-specific info
        if (def.catch_multiplier !== undefined) {
            const catchInfo = document.createElement('div');
            catchInfo.style.cssText = 'font-size:0.65rem;color:#cc66ff;margin-bottom:8px;';
            catchInfo.textContent = `Catch Rate: x${def.catch_multiplier}`;
            this._detailPanelEl.appendChild(catchInfo);
        }

        // Effect info for consumables
        if (def.effect_type && def.effect_value !== undefined) {
            const effectInfo = document.createElement('div');
            effectInfo.style.cssText = 'font-size:0.6rem;color:#66ccaa;margin-bottom:8px;';
            let effectText = `Effect: ${def.effect_type}`;
            if (typeof def.effect_value === 'number') {
                effectText += ` (${def.effect_value})`;
            } else if (typeof def.effect_value === 'string') {
                effectText += ` [${def.effect_value}]`;
            } else if (typeof def.effect_value === 'object' && def.effect_value !== null) {
                const parts = [];
                for (const k of Object.keys(def.effect_value)) {
                    parts.push(`${k}: ${def.effect_value[k]}`);
                }
                effectText += ` (${parts.join(', ')})`;
            }
            effectInfo.textContent = effectText;
            this._detailPanelEl.appendChild(effectInfo);
        }

        // Buy price
        if (def.buy_price !== undefined) {
            const priceEl = document.createElement('div');
            priceEl.style.cssText = 'font-size:0.6rem;color:#666;margin-bottom:12px;';
            priceEl.textContent = `Value: ${def.buy_price}G`;
            this._detailPanelEl.appendChild(priceEl);
        }

        // Use button (disabled if not in battle or not applicable)
        const useBtn = document.createElement('button');
        useBtn.className = 'btn btn-primary';
        useBtn.style.cssText = `
            width:100%;padding:8px;font-size:0.75rem;font-weight:700;
            border:2px solid #444;border-radius:6px;
            background:rgba(40,40,40,0.3);color:#555;
            cursor:not-allowed;opacity:0.5;
        `;
        useBtn.textContent = 'Use';
        useBtn.disabled = true;

        // Check if we're in a battle context where the item could be used
        const inBattle = this._isInBattle();
        const isUsableOutsideBattle = ['heal_hp', 'heal_hp_full', 'heal_team_full', 'restore_pp_all',
            'cure_status', 'revive', 'level_up', 'flee_dungeon'].includes(def.effect_type);

        if (inBattle || isUsableOutsideBattle) {
            useBtn.disabled = false;
            useBtn.style.cssText = `
                width:100%;padding:8px;font-size:0.75rem;font-weight:700;
                border:2px solid #33aa66;border-radius:6px;
                background:rgba(30,80,50,0.3);color:#66dd88;
                cursor:pointer;
            `;
            useBtn.addEventListener('click', () => {
                this._useItem(entry);
            });
        }

        this._detailPanelEl.appendChild(useBtn);
    }

    _isInBattle() {
        // Check if a battle is currently active in the engine
        const sceneName = this.engine.scenes ? this.engine.scenes.currentName : '';
        return sceneName === 'battle' || sceneName === 'combat';
    }

    _useItem(entry) {
        const { id, qty, def } = entry;
        if (qty <= 0) return;

        // Emit ITEM_USED event for other systems to handle
        eventBus.emit(GameEvents.ITEM_USED, {
            itemId: id,
            itemDef: def,
            source: 'bag',
        });

        // Decrement quantity
        if (this._inventory[id] !== undefined) {
            this._inventory[id]--;
            if (this._inventory[id] <= 0) {
                delete this._inventory[id];
            }
        }

        // Re-render
        this._renderItemsTab();
        this._detailPanelEl.style.display = 'none';
        this._selectedItemIndex = -1;

        // SFX
        if (this.engine.audio && this.engine.audio.playSFX) {
            this.engine.audio.playSFX(
                this.engine.assets.resolvePath('Audio/Sounds/ui_confirm.ogg'), 0.4
            );
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // Equipment Tab
    // ═════════════════════════════════════════════════════════════════════

    _renderEquipmentTab() {
        this._contentEl.innerHTML = '';
        this._flatEquipList = [];

        // Resolve equipment definitions from IDs
        const ownedEquip = [];
        for (const eqId of this._equipmentInventory) {
            const def = EQUIPMENT_MAP[eqId];
            if (def) {
                ownedEquip.push({ id: eqId, def });
            }
        }

        if (ownedEquip.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color:#555;font-size:0.8rem;text-align:center;padding:40px 0;';
            empty.textContent = 'No equipment collected yet.';
            this._contentEl.appendChild(empty);
            return;
        }

        // Group by slot type
        const groups = {};
        for (const entry of ownedEquip) {
            const slot = entry.def.slot_type || 'other';
            if (!groups[slot]) groups[slot] = [];
            groups[slot].push(entry);
        }

        let flatIndex = 0;

        for (const slot of SLOT_ORDER) {
            const items = groups[slot];
            if (!items || items.length === 0) continue;

            // Slot section header
            const slotHeader = document.createElement('div');
            slotHeader.style.cssText = `
                font-size:0.7rem;font-weight:700;color:#aaa;
                margin:10px 0 4px 0;padding:2px 6px;
                border-bottom:1px solid rgba(255,255,255,0.08);
                text-transform:uppercase;letter-spacing:0.05em;
            `;
            slotHeader.textContent = SLOT_LABELS[slot] || slot;
            this._contentEl.appendChild(slotHeader);

            // Sort by rarity (legendary first) then by level req
            const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
            items.sort((a, b) => {
                const ra = rarityOrder[a.def.rarity] !== undefined ? rarityOrder[a.def.rarity] : 5;
                const rb = rarityOrder[b.def.rarity] !== undefined ? rarityOrder[b.def.rarity] : 5;
                if (ra !== rb) return ra - rb;
                return (b.def.level_requirement || 0) - (a.def.level_requirement || 0);
            });

            for (const entry of items) {
                const rowIndex = flatIndex++;
                this._flatEquipList.push(entry);

                const row = this._createEquipRow(entry, rowIndex);
                this._contentEl.appendChild(row);
            }
        }
    }

    _createEquipRow(entry, rowIndex) {
        const { id, def } = entry;
        const rarityColor = RARITY_COLORS[def.rarity] || '#aaaaaa';

        const row = document.createElement('div');
        row.dataset.equipRowIndex = rowIndex;
        row.style.cssText = `
            display:flex;align-items:center;gap:10px;padding:8px 10px;
            background:rgba(255,255,255,0.03);border-radius:8px;
            border:1px solid rgba(255,255,255,0.06);cursor:pointer;
            transition:background 0.15s;margin-bottom:3px;
            border-left:3px solid ${rarityColor};
        `;

        // Equipment sprite preview (28x28 canvas)
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = 28;
        previewCanvas.height = 36;
        previewCanvas.style.cssText = 'flex-shrink:0;';
        const pCtx = previewCanvas.getContext('2d');
        // Build equipment object with just this one piece
        const previewEquip = {};
        previewEquip[def.slot_type] = def.equipment_id;
        SkeletalAnimationSystem.drawWithEquipment(
            pCtx, 1, 1, 0, 0, 16, 32, 30, { equipment: previewEquip }
        );
        row.appendChild(previewCanvas);

        // Info block
        const info = document.createElement('div');
        info.style.cssText = 'flex:1;min-width:0;';

        // Name row with rarity badge
        const nameRow = document.createElement('div');
        nameRow.style.cssText = 'display:flex;align-items:center;gap:6px;';

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = `font-size:0.8rem;font-weight:600;color:${rarityColor};`;
        nameSpan.textContent = def.equipment_name || `Equipment #${id}`;
        nameRow.appendChild(nameSpan);

        // Rarity badge
        const rarityBadge = document.createElement('span');
        rarityBadge.style.cssText = `
            font-size:0.5rem;font-weight:700;padding:1px 5px;border-radius:6px;
            background:${rarityColor}22;color:${rarityColor};border:1px solid ${rarityColor}44;
            text-transform:uppercase;letter-spacing:0.03em;
        `;
        rarityBadge.textContent = def.rarity || 'common';
        nameRow.appendChild(rarityBadge);

        info.appendChild(nameRow);

        // Stat bonuses summary
        const statsLine = document.createElement('div');
        statsLine.style.cssText = 'font-size:0.6rem;color:#888;margin-top:2px;';
        const bonuses = def.stat_bonuses || {};
        const statParts = [];
        const statKeys = ['hp', 'atk', 'def', 'spd', 'sp_atk', 'sp_def'];
        for (const key of statKeys) {
            const val = bonuses[key];
            if (val && val !== 0) {
                const sign = val > 0 ? '+' : '';
                const label = key.toUpperCase().replace('_', '.');
                statParts.push(`${label}:${sign}${val}`);
            }
        }
        statsLine.textContent = statParts.length > 0 ? statParts.join(' | ') : 'No stat bonuses';
        info.appendChild(statsLine);

        // Level requirement
        const levelReq = document.createElement('div');
        levelReq.style.cssText = 'font-size:0.55rem;color:#666;margin-top:1px;';
        levelReq.textContent = `Lv ${def.level_requirement || 1} required`;
        info.appendChild(levelReq);

        row.appendChild(info);

        // Click to show detail
        row.addEventListener('click', () => {
            this._selectedEquipIndex = rowIndex;
            this._showEquipDetail(def);
            this._highlightEquipRow(rowIndex);
        });

        // Hover effect
        row.addEventListener('mouseenter', () => {
            row.style.background = 'rgba(255,255,255,0.06)';
        });
        row.addEventListener('mouseleave', () => {
            const isSelected = this._selectedEquipIndex === rowIndex;
            row.style.background = isSelected ? 'rgba(255,204,51,0.08)' : 'rgba(255,255,255,0.03)';
        });

        return row;
    }

    _highlightEquipRow(index) {
        if (!this._contentEl) return;
        const rows = this._contentEl.querySelectorAll('[data-equip-row-index]');
        for (const row of rows) {
            const ri = Number(row.dataset.equipRowIndex);
            if (ri === index) {
                row.style.background = 'rgba(255,204,51,0.08)';
                row.style.borderColor = 'rgba(255,204,51,0.2)';
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                row.style.background = 'rgba(255,255,255,0.03)';
                row.style.borderColor = 'rgba(255,255,255,0.06)';
            }
        }
    }

    _showEquipDetail(def) {
        this._detailEquip = def;
        this._detailPanelEl.style.display = 'block';
        this._detailPanelEl.innerHTML = '';

        const rarityColor = RARITY_COLORS[def.rarity] || '#aaaaaa';

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
            position:absolute;top:4px;right:4px;padding:2px 6px;font-size:0.7rem;
            border:none;background:none;color:#888;cursor:pointer;
        `;
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', () => {
            this._detailEquip = null;
            this._detailPanelEl.style.display = 'none';
            this._selectedEquipIndex = -1;
            this._highlightEquipRow(-1);
        });
        this._detailPanelEl.appendChild(closeBtn);

        // PNG race sprite portrait (primary display for equipment preview)
        const detailPreviewWrap = document.createElement('div');
        detailPreviewWrap.style.cssText = 'position:relative;width:56px;height:56px;margin:0 auto 8px auto;';
        const eqRaceSpritePath = getRaceSpritePath(1, 0);
        if (eqRaceSpritePath) {
            const eqRaceImg = document.createElement('img');
            eqRaceImg.src = eqRaceSpritePath;
            eqRaceImg.style.cssText = 'width:56px;height:56px;object-fit:contain;image-rendering:pixelated;';
            eqRaceImg.onerror = () => { eqRaceImg.style.display = 'none'; };
            detailPreviewWrap.appendChild(eqRaceImg);
        }

        // Canvas overlay with equipment rendering
        const detailPreviewCanvas = document.createElement('canvas');
        detailPreviewCanvas.width = 56;
        detailPreviewCanvas.height = 56;
        detailPreviewCanvas.style.cssText = 'position:absolute;top:0;left:0;display:block;';
        const dpCtx = detailPreviewCanvas.getContext('2d');
        const detailPreviewEquip = {};
        detailPreviewEquip[def.slot_type] = def.equipment_id;
        SkeletalAnimationSystem.drawWithEquipment(
            dpCtx, 1, 1, 0, 0, 28, 50, 48, { equipment: detailPreviewEquip }
        );
        detailPreviewWrap.appendChild(detailPreviewCanvas);
        this._detailPanelEl.appendChild(detailPreviewWrap);

        // Equipment name
        const nameEl = document.createElement('div');
        nameEl.style.cssText = `font-size:0.9rem;font-weight:700;color:${rarityColor};margin-bottom:4px;padding-right:20px;`;
        nameEl.textContent = def.equipment_name || `Equipment #${def.equipment_id}`;
        this._detailPanelEl.appendChild(nameEl);

        // Rarity + Slot
        const metaRow = document.createElement('div');
        metaRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;';

        const rarityTag = document.createElement('span');
        rarityTag.style.cssText = `
            padding:2px 8px;border-radius:10px;font-size:0.6rem;
            background:${rarityColor}22;color:${rarityColor};border:1px solid ${rarityColor}55;
            text-transform:uppercase;font-weight:700;
        `;
        rarityTag.textContent = def.rarity || 'common';
        metaRow.appendChild(rarityTag);

        const slotTag = document.createElement('span');
        slotTag.style.cssText = `
            padding:2px 8px;border-radius:10px;font-size:0.6rem;
            background:rgba(255,255,255,0.05);color:#aaa;border:1px solid rgba(255,255,255,0.1);
            text-transform:uppercase;
        `;
        slotTag.textContent = def.slot_type || 'unknown';
        metaRow.appendChild(slotTag);

        this._detailPanelEl.appendChild(metaRow);

        // Level requirement
        const levelEl = document.createElement('div');
        levelEl.style.cssText = 'font-size:0.65rem;color:#888;margin-bottom:10px;';
        levelEl.textContent = `Level Requirement: ${def.level_requirement || 1}`;
        this._detailPanelEl.appendChild(levelEl);

        // Stat bonuses
        const statsHeader = document.createElement('div');
        statsHeader.style.cssText = 'font-size:0.65rem;font-weight:700;color:#aaa;margin-bottom:4px;';
        statsHeader.textContent = 'Stat Bonuses';
        this._detailPanelEl.appendChild(statsHeader);

        const bonuses = def.stat_bonuses || {};
        const statDisplayKeys = [
            { key: 'hp', label: 'HP', color: '#33cc66' },
            { key: 'atk', label: 'ATK', color: '#ff6644' },
            { key: 'def', label: 'DEF', color: '#4488ff' },
            { key: 'sp_atk', label: 'SP.ATK', color: '#ff66aa' },
            { key: 'sp_def', label: 'SP.DEF', color: '#66aaff' },
            { key: 'spd', label: 'SPD', color: '#66ffcc' },
        ];

        for (const s of statDisplayKeys) {
            const val = bonuses[s.key] || 0;
            if (val === 0) continue;

            const statRow = document.createElement('div');
            statRow.style.cssText = 'display:flex;justify-content:space-between;font-size:0.6rem;margin-bottom:2px;';

            const label = document.createElement('span');
            label.style.cssText = 'color:#777;';
            label.textContent = s.label;
            statRow.appendChild(label);

            const value = document.createElement('span');
            const sign = val > 0 ? '+' : '';
            value.style.cssText = `color:${val > 0 ? s.color : '#cc4444'};font-weight:600;`;
            value.textContent = `${sign}${val}`;
            statRow.appendChild(value);

            this._detailPanelEl.appendChild(statRow);
        }

        // Synergies section
        const hasSynergy = (def.element_synergy && def.element_synergy_multiplier > 1.0) ||
                           (def.class_synergy && def.class_synergy_multiplier > 1.0);

        if (hasSynergy) {
            const synHeader = document.createElement('div');
            synHeader.style.cssText = 'font-size:0.65rem;font-weight:700;color:#aaa;margin:10px 0 4px 0;';
            synHeader.textContent = 'Synergies';
            this._detailPanelEl.appendChild(synHeader);

            if (def.element_synergy && def.element_synergy_multiplier > 1.0) {
                const elemSyn = document.createElement('div');
                elemSyn.style.cssText = 'font-size:0.6rem;color:#cc9933;margin-bottom:2px;';
                elemSyn.textContent = `${def.element_synergy} Element: x${def.element_synergy_multiplier.toFixed(2)}`;
                this._detailPanelEl.appendChild(elemSyn);
            }

            if (def.class_synergy && def.class_synergy_multiplier > 1.0) {
                const classSyn = document.createElement('div');
                classSyn.style.cssText = 'font-size:0.6rem;color:#9966cc;margin-bottom:2px;';
                classSyn.textContent = `${def.class_synergy} Class: x${def.class_synergy_multiplier.toFixed(2)}`;
                this._detailPanelEl.appendChild(classSyn);
            }
        }

        // Description
        const descEl = document.createElement('div');
        descEl.style.cssText = 'font-size:0.65rem;color:#888;line-height:1.5;margin-top:10px;';
        descEl.textContent = def.description || 'No description.';
        this._detailPanelEl.appendChild(descEl);

        // Source
        if (def.source) {
            const sourceEl = document.createElement('div');
            sourceEl.style.cssText = 'font-size:0.55rem;color:#555;margin-top:8px;';
            const sourceLabels = {
                shop: 'Purchased from shop',
                dungeon_drop: 'Found in dungeons',
                boss_drop: 'Dropped by bosses',
                legendary_quest: 'Legendary quest reward',
            };
            sourceEl.textContent = `Source: ${sourceLabels[def.source] || def.source}`;
            this._detailPanelEl.appendChild(sourceEl);
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    // Key Items Tab
    // ═════════════════════════════════════════════════════════════════════

    _renderKeyItemsTab() {
        this._contentEl.innerHTML = '';

        const emptyContainer = document.createElement('div');
        emptyContainer.style.cssText = 'text-align:center;padding:60px 20px;';

        const emptyTitle = document.createElement('div');
        emptyTitle.style.cssText = 'font-size:0.9rem;font-weight:700;color:#555;margin-bottom:8px;';
        emptyTitle.textContent = 'No key items yet.';
        emptyContainer.appendChild(emptyTitle);

        const emptyDesc = document.createElement('div');
        emptyDesc.style.cssText = 'font-size:0.7rem;color:#444;line-height:1.5;';
        emptyDesc.textContent = 'Key items will appear here as you complete quests.';
        emptyContainer.appendChild(emptyDesc);

        this._contentEl.appendChild(emptyContainer);
    }

    // ═════════════════════════════════════════════════════════════════════
    // Navigation
    // ═════════════════════════════════════════════════════════════════════

    _goBack() {
        // Play click SFX
        if (this.engine.audio && this.engine.audio.playSFX) {
            this.engine.audio.playSFX(
                this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.3
            );
        }

        this.engine.scenes.popScene().catch(() => {
            this.engine.scenes.changeTo('overworld', {});
        });
    }
}

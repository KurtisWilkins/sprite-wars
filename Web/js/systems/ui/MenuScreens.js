/**
 * MenuScreens - Main menu, team management, inventory, and settings screens
 * Ported from:
 *   Game/Scripts/UI/Screens/MainMenuScreen.gd
 *   Game/Scripts/UI/Screens/TeamScreen.gd
 *   Game/Scripts/UI/Screens/InventoryScreen.gd
 *   Game/Scripts/UI/Screens/SettingsScreen.gd
 *
 * Each class builds its UI using DOM manipulation into the #screen-panel div,
 * designed for mobile-first layout. Screens are registered with ScreenManager.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';
import { HumanoidSpriteSystem } from '../rendering/HumanoidSpriteSystem.js';

// -- Shared Style Constants ------------------------------------------------------

const COLORS = {
    bgDark:     '#0d0d1a',
    bgPanel:    '#13131f',
    bgCard:     '#1e1e2e',
    bgCardDim:  'rgba(20,20,30,0.5)',
    border:     'rgba(50,50,75,0.6)',
    borderHi:   'rgba(100,160,255,1)',
    textPrimary:'#ffffff',
    textSecondary:'rgba(180,180,200,0.9)',
    textDim:    'rgba(120,120,140,0.6)',
    accent:     '#3380e6',
    success:    '#33a64c',
    danger:     '#d93333',
    gold:       '#f2c94c',
};

const ELEMENT_COLORS = {
    Fire:     '#ff6633', Water:    '#4d99ff', Earth:    '#997740',
    Air:      '#b3e6ff', Light:    '#ffff99', Dark:     '#804dbb',
    Nature:   '#4dcc4d', Electric: '#ffe633', Ice:      '#99e6ff',
    Metal:    '#b3b3bf', Poison:   '#b34dcc', Psychic:  '#ff80cc',
    Spirit:   '#99cce6', Chaos:    '#e63366',
};

// -- Helper: Create styled button -----------------------------------------------

function createButton(text, bgColor, opts = {}) {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
        padding: opts.padding || '10px 20px',
        background: bgColor,
        color: COLORS.textPrimary,
        border: 'none',
        borderRadius: '12px',
        fontSize: opts.fontSize || '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        minWidth: opts.minWidth || '0',
        textAlign: 'center',
        transition: 'background 0.15s, transform 0.1s',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
    });

    // Hover and active states
    const originalBg = bgColor;
    btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.15)'; });
    btn.addEventListener('mouseleave', () => { btn.style.filter = ''; });
    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.97)'; });
    btn.addEventListener('mouseup', () => { btn.style.transform = ''; });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });

    if (opts.disabled) {
        btn.disabled = true;
        btn.style.background = 'rgba(50,50,60,0.5)';
        btn.style.color = 'rgba(120,120,120,0.5)';
        btn.style.cursor = 'default';
    }

    return btn;
}

// -- Helper: Create top bar -----------------------------------------------------

function createTopBar(title, onBack) {
    const bar = document.createElement('div');
    bar.className = 'screen-top-bar';
    Object.assign(bar.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        background: 'rgba(20,20,35,1)',
        borderBottom: '2px solid rgba(50,50,75,0.6)',
        minHeight: '60px',
        boxSizing: 'border-box',
        flexShrink: '0',
    });

    if (onBack) {
        const backBtn = createButton('<  Back', 'rgba(35,35,55,1)', { fontSize: '14px', padding: '8px 14px' });
        backBtn.addEventListener('click', onBack);
        bar.appendChild(backBtn);
    }

    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    Object.assign(titleEl.style, {
        color: COLORS.textPrimary,
        fontSize: '22px',
        fontWeight: 'bold',
        flex: '1',
    });
    bar.appendChild(titleEl);

    return bar;
}

// ================================================================================
// MainMenuScreen
// ================================================================================

export class MainMenuScreen {
    /**
     * @param {Object} [deps]
     * @param {Object} [deps.gameManager]
     * @param {Object} [deps.saveManager]
     * @param {Object} [deps.screenManager]
     * @param {Object} [deps.authManager]
     */
    constructor(deps = {}) {
        this._gameManager = deps.gameManager || null;
        this._saveManager = deps.saveManager || null;
        this._screenManager = deps.screenManager || null;
        this._authManager = deps.authManager || null;
    }

    /**
     * Build and return the main menu screen DOM element.
     * @param {Object} [params]
     * @returns {HTMLElement}
     */
    build(params = {}) {
        const screen = document.createElement('div');
        screen.className = 'main-menu-screen';
        Object.assign(screen.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            background: COLORS.bgDark,
            color: COLORS.textPrimary,
            fontFamily: 'sans-serif',
        });

        // Title section
        const titleSection = document.createElement('div');
        titleSection.style.cssText = 'text-align:center;margin-bottom:40px;';

        const title = document.createElement('div');
        title.textContent = 'SPRITE WARS';
        Object.assign(title.style, {
            fontSize: '42px',
            fontWeight: 'bold',
            color: '#f2d966',
            marginBottom: '8px',
            letterSpacing: '2px',
        });
        titleSection.appendChild(title);

        const subtitle = document.createElement('div');
        subtitle.textContent = 'Legends of the Shattered Grid';
        Object.assign(subtitle.style, {
            fontSize: '16px',
            color: 'rgba(180,180,200,0.8)',
        });
        titleSection.appendChild(subtitle);

        screen.appendChild(titleSection);

        // Button container
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display:flex;flex-direction:column;gap:16px;width:320px;max-width:80%;';

        // Check for existing saves
        const hasSave = this._checkForSaves();

        // Continue button (only visible if save exists)
        if (hasSave) {
            const continueBtn = createButton('Continue', COLORS.success, { padding: '14px 24px', fontSize: '18px', minWidth: '100%' });
            continueBtn.addEventListener('click', () => this._onContinuePressed());
            btnContainer.appendChild(continueBtn);
        }

        // New Game button
        const newGameBtn = createButton('New Game', COLORS.accent, { padding: '14px 24px', fontSize: '18px', minWidth: '100%' });
        newGameBtn.addEventListener('click', () => this._onNewGamePressed());
        btnContainer.appendChild(newGameBtn);

        // Settings button
        const settingsBtn = createButton('Settings', 'rgba(55,55,72,1)', { padding: '14px 24px', fontSize: '18px', minWidth: '100%' });
        settingsBtn.addEventListener('click', () => this._onSettingsPressed());
        btnContainer.appendChild(settingsBtn);

        // Credits button
        const creditsBtn = createButton('Credits', 'rgba(55,55,72,1)', { padding: '14px 24px', fontSize: '18px', minWidth: '100%' });
        creditsBtn.addEventListener('click', () => this._onCreditsPressed());
        btnContainer.appendChild(creditsBtn);

        screen.appendChild(btnContainer);

        // Version label
        const version = document.createElement('div');
        version.textContent = 'v0.1.0-alpha';
        Object.assign(version.style, {
            position: 'absolute',
            bottom: '24px',
            color: 'rgba(120,120,140,0.5)',
            fontSize: '13px',
        });
        screen.appendChild(version);

        // Entrance animation: fade in with button stagger
        screen.style.opacity = '0';
        requestAnimationFrame(() => {
            screen.style.transition = 'opacity 0.6s ease-out';
            screen.style.opacity = '1';
        });

        const buttons = btnContainer.children;
        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            btn.style.opacity = '0';
            btn.style.transform = 'translateY(20px)';
            setTimeout(() => {
                btn.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                btn.style.opacity = '1';
                btn.style.transform = 'translateY(0)';
            }, 300 + i * 100);
        }

        return screen;
    }

    /** @private */
    _checkForSaves() {
        if (this._saveManager) {
            const allInfo = this._saveManager.getAllSaveInfo();
            return allInfo.some(info => info.exists);
        }
        return false;
    }

    /** @private */
    _onContinuePressed() {
        if (this._gameManager) {
            this._gameManager.loadGame(0);
        }
        if (this._screenManager) {
            this._screenManager.pushScreen('overworld', 'fade');
        }
    }

    /** @private */
    _onNewGamePressed() {
        if (this._gameManager) {
            this._gameManager.startNewGame();
        }
        if (this._screenManager) {
            this._screenManager.pushScreen('overworld', 'fade');
        }
    }

    /** @private */
    _onSettingsPressed() {
        if (this._screenManager) {
            this._screenManager.pushScreen('settings', 'slide_left');
        }
    }

    /** @private */
    _onCreditsPressed() {
        if (this._screenManager) {
            this._screenManager.pushScreen('credits', 'slide_left');
        }
    }
}

// ================================================================================
// TeamScreen
// ================================================================================

export class TeamScreen {
    /**
     * @param {Object} [deps]
     * @param {Object} [deps.gameManager]
     * @param {Object} [deps.screenManager]
     */
    constructor(deps = {}) {
        this._gameManager = deps.gameManager || null;
        this._screenManager = deps.screenManager || null;

        this.MAX_TEAM_SIZE = 10;
        this._selectedIndex = -1;
        this._detailButton = null;
    }

    /**
     * Build and return the team screen DOM element.
     * @param {Object} [params]
     * @returns {HTMLElement}
     */
    build(params = {}) {
        const screen = document.createElement('div');
        screen.className = 'team-screen';
        Object.assign(screen.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: COLORS.bgDark,
            color: COLORS.textPrimary,
            fontFamily: 'sans-serif',
        });

        // Top bar
        screen.appendChild(createTopBar('Team', () => this._onBackPressed()));

        // Scrollable team list
        const scrollArea = document.createElement('div');
        scrollArea.style.cssText = 'flex:1;overflow-y:auto;padding:12px 16px;';

        const slotContainer = document.createElement('div');
        slotContainer.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

        const team = (this._gameManager && this._gameManager.playerData)
            ? this._gameManager.playerData.team || []
            : [];

        for (let i = 0; i < this.MAX_TEAM_SIZE; i++) {
            const spriteData = i < team.length ? team[i] : null;
            const slot = this._createTeamSlot(i, spriteData);
            slotContainer.appendChild(slot);
        }

        scrollArea.appendChild(slotContainer);
        screen.appendChild(scrollArea);

        // Bottom action bar
        screen.appendChild(this._buildBottomBar());

        return screen;
    }

    /** @private */
    _createTeamSlot(index, spriteData) {
        const isEmpty = !spriteData;

        const slot = document.createElement('div');
        slot.className = 'team-slot';
        Object.assign(slot.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            background: isEmpty ? COLORS.bgCardDim : COLORS.bgCard,
            borderRadius: '12px',
            border: `2px solid ${COLORS.border}`,
            cursor: 'pointer',
            minHeight: '80px',
            transition: 'border-color 0.15s',
        });

        if (isEmpty) {
            const emptyLabel = document.createElement('div');
            emptyLabel.textContent = `-- Empty Slot ${index + 1} --`;
            Object.assign(emptyLabel.style, {
                flex: '1',
                textAlign: 'center',
                color: COLORS.textDim,
                fontSize: '15px',
            });
            slot.appendChild(emptyLabel);
        } else {
            // Slot number
            const numLabel = document.createElement('div');
            numLabel.textContent = `#${index + 1}`;
            numLabel.style.cssText = 'color:rgba(130,130,140,0.7);font-size:14px;min-width:30px;';
            slot.appendChild(numLabel);

            // Portrait with equipment rendering
            const portrait = document.createElement('canvas');
            portrait.width = 56;
            portrait.height = 56;
            Object.assign(portrait.style, {
                width: '56px', height: '56px',
                borderRadius: '8px',
                flexShrink: '0',
                imageRendering: 'pixelated',
                background: 'rgba(35,35,55,1)',
            });
            const pCtx = portrait.getContext('2d');
            const sRaceId = spriteData.raceId || spriteData.race_id || 1;
            const sStage = spriteData.evolutionStage || spriteData.evolution_stage || 1;
            const sEquip = spriteData.equipment || {};
            HumanoidSpriteSystem.drawWithEquipment(
                pCtx, sRaceId, sStage, 0, 0, 28, 50, 44, { equipment: sEquip }
            );
            slot.appendChild(portrait);

            // Info column
            const info = document.createElement('div');
            info.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:3px;';

            // Name
            const displayName = spriteData.nickname || `Sprite #${spriteData.raceId || '?'}`;
            const nameEl = document.createElement('div');
            nameEl.textContent = displayName;
            nameEl.style.cssText = 'color:#fff;font-size:16px;font-weight:bold;';
            info.appendChild(nameEl);

            // Level
            const levelEl = document.createElement('div');
            levelEl.textContent = `Lv. ${spriteData.level || 1}`;
            levelEl.style.cssText = 'color:rgba(180,200,255,0.9);font-size:14px;';
            info.appendChild(levelEl);

            // HP bar
            const hpBar = document.createElement('div');
            hpBar.style.cssText = 'width:100%;height:8px;background:rgba(35,35,50,1);border-radius:4px;overflow:hidden;';
            const hpFill = document.createElement('div');
            const hpPct = spriteData.maxHp > 0 ? (spriteData.currentHp / spriteData.maxHp) * 100 : 100;
            hpFill.style.cssText = `width:${hpPct}%;height:100%;background:#33cc55;border-radius:4px;`;
            hpBar.appendChild(hpFill);
            info.appendChild(hpBar);

            // Element types
            const elemRow = document.createElement('div');
            elemRow.style.cssText = 'display:flex;gap:6px;margin-top:2px;';
            const elements = spriteData.elementTypes || spriteData.element_types || [];
            for (const elem of elements) {
                const elemEl = document.createElement('span');
                elemEl.textContent = elem;
                elemEl.style.cssText = `font-size:12px;color:${ELEMENT_COLORS[elem] || '#aaa'};`;
                elemRow.appendChild(elemEl);
            }
            info.appendChild(elemRow);

            slot.appendChild(info);
        }

        // Click handler
        slot.addEventListener('click', () => this._selectSprite(index, slot));

        return slot;
    }

    /** @private */
    _buildBottomBar() {
        const bar = document.createElement('div');
        bar.className = 'screen-bottom-bar';
        Object.assign(bar.style, {
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            padding: '12px 16px',
            background: 'rgba(20,20,35,1)',
            borderTop: '2px solid rgba(50,50,75,0.6)',
            minHeight: '60px',
            boxSizing: 'border-box',
            flexShrink: '0',
        });

        this._detailButton = createButton('Details', COLORS.accent, { disabled: true, padding: '10px 28px' });
        this._detailButton.addEventListener('click', () => this._onDetailPressed());
        bar.appendChild(this._detailButton);

        const storageBtn = createButton('Storage', 'rgba(55,55,80,1)', { padding: '10px 28px' });
        storageBtn.addEventListener('click', () => this._onStoragePressed());
        bar.appendChild(storageBtn);

        return bar;
    }

    /** @private */
    _selectSprite(index, slotElement) {
        // Deselect previous
        const allSlots = slotElement.parentNode ? slotElement.parentNode.querySelectorAll('.team-slot') : [];
        for (const s of allSlots) {
            s.style.borderColor = COLORS.border;
        }

        if (this._selectedIndex === index) {
            this._selectedIndex = -1;
            if (this._detailButton) {
                this._detailButton.disabled = true;
                this._detailButton.style.background = 'rgba(50,50,60,0.5)';
                this._detailButton.style.color = 'rgba(120,120,120,0.5)';
            }
            return;
        }

        this._selectedIndex = index;
        slotElement.style.borderColor = COLORS.borderHi;

        const team = (this._gameManager && this._gameManager.playerData)
            ? this._gameManager.playerData.team || []
            : [];

        if (this._detailButton) {
            const hasSprite = index < team.length;
            this._detailButton.disabled = !hasSprite;
            this._detailButton.style.background = hasSprite ? COLORS.accent : 'rgba(50,50,60,0.5)';
            this._detailButton.style.color = hasSprite ? '#fff' : 'rgba(120,120,120,0.5)';
        }
    }

    /** @private */
    _onBackPressed() {
        if (this._screenManager) {
            this._screenManager.popScreen('slide_right');
        }
    }

    /** @private */
    _onDetailPressed() {
        if (this._selectedIndex >= 0 && this._screenManager) {
            this._screenManager.pushScreen('sprite_detail', 'slide_left', { spriteIndex: this._selectedIndex });
        }
    }

    /** @private */
    _onStoragePressed() {
        if (this._screenManager) {
            this._screenManager.pushScreen('storage', 'slide_left');
        }
    }
}

// ================================================================================
// InventoryScreen
// ================================================================================

export class InventoryScreen {
    /**
     * @param {Object} [deps]
     * @param {Object} [deps.gameManager]
     * @param {Object} [deps.screenManager]
     */
    constructor(deps = {}) {
        this._gameManager = deps.gameManager || null;
        this._screenManager = deps.screenManager || null;

        this.TAB_NAMES = ['Consumables', 'Crystals', 'Equipment', 'Key Items', 'Materials'];
        this.TAB_KEYS  = ['consumables', 'crystals', 'equipment', 'key_items', 'materials'];
        this.GRID_COLUMNS = 5;
        this.CELL_SIZE = 80;

        this._currentTab = 'consumables';
        this._selectedItemId = -1;

        /** @private DOM refs */
        this._tabBar = null;
        this._itemGrid = null;
        this._detailOverlay = null;
        this._detailName = null;
        this._detailDesc = null;
        this._detailQty = null;
        this._useButton = null;
        this._equipButton = null;
    }

    /**
     * Build and return the inventory screen DOM element.
     * @param {Object} [params]
     * @returns {HTMLElement}
     */
    build(params = {}) {
        const screen = document.createElement('div');
        screen.className = 'inventory-screen';
        Object.assign(screen.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: COLORS.bgDark,
            color: COLORS.textPrimary,
            fontFamily: 'sans-serif',
        });

        // Top bar
        screen.appendChild(createTopBar('Inventory', () => this._onBackPressed()));

        // Tab bar
        this._tabBar = this._buildTabBar();
        screen.appendChild(this._tabBar);

        // Sort row
        screen.appendChild(this._buildSortRow());

        // Item grid (scrollable)
        const scrollArea = document.createElement('div');
        scrollArea.style.cssText = 'flex:1;overflow-y:auto;padding:8px 20px 20px;';

        this._itemGrid = document.createElement('div');
        this._itemGrid.className = 'item-grid';
        Object.assign(this._itemGrid.style, {
            display: 'grid',
            gridTemplateColumns: `repeat(${this.GRID_COLUMNS}, 1fr)`,
            gap: '8px',
        });
        scrollArea.appendChild(this._itemGrid);
        screen.appendChild(scrollArea);

        // Detail popup overlay
        this._buildDetailPopup(screen);

        // Populate initial tab
        this._populateItems(this._currentTab);

        return screen;
    }

    /** @private */
    _buildTabBar() {
        const bar = document.createElement('div');
        bar.className = 'inventory-tab-bar';
        Object.assign(bar.style, {
            display: 'flex',
            overflow: 'auto',
            background: 'rgba(18,18,30,1)',
            borderBottom: '1px solid rgba(50,50,75,0.4)',
            flexShrink: '0',
        });

        for (let i = 0; i < this.TAB_NAMES.length; i++) {
            const tab = document.createElement('button');
            tab.textContent = this.TAB_NAMES[i];
            tab.dataset.tabKey = this.TAB_KEYS[i];
            Object.assign(tab.style, {
                flex: '1',
                padding: '10px 4px',
                background: 'transparent',
                color: this.TAB_KEYS[i] === this._currentTab ? COLORS.accent : COLORS.textSecondary,
                border: 'none',
                borderBottom: this.TAB_KEYS[i] === this._currentTab ? `2px solid ${COLORS.accent}` : '2px solid transparent',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
            });

            tab.addEventListener('click', () => {
                this._switchTab(this.TAB_KEYS[i], bar);
            });

            bar.appendChild(tab);
        }

        return bar;
    }

    /** @private */
    _buildSortRow() {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 24px;flex-shrink:0;';

        const label = document.createElement('span');
        label.textContent = 'Sort:';
        label.style.cssText = `color:${COLORS.textDim};font-size:14px;`;
        row.appendChild(label);

        const select = document.createElement('select');
        const options = ['Name A-Z', 'Name Z-A', 'Quantity', 'Newest'];
        for (const opt of options) {
            const o = document.createElement('option');
            o.textContent = opt;
            select.appendChild(o);
        }
        Object.assign(select.style, {
            padding: '6px 10px',
            background: 'rgba(25,25,40,1)',
            color: COLORS.textSecondary,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            fontSize: '14px',
        });
        select.addEventListener('change', () => {
            this._populateItems(this._currentTab);
        });
        row.appendChild(select);

        return row;
    }

    /** @private */
    _buildDetailPopup(parent) {
        // Overlay
        this._detailOverlay = document.createElement('div');
        this._detailOverlay.className = 'item-detail-overlay';
        Object.assign(this._detailOverlay.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '500',
        });

        // Dismiss on background click
        this._detailOverlay.addEventListener('click', (e) => {
            if (e.target === this._detailOverlay) this._closeDetail();
        });

        // Popup panel
        const popup = document.createElement('div');
        popup.className = 'item-detail-popup';
        Object.assign(popup.style, {
            background: COLORS.bgPanel,
            borderRadius: '16px',
            border: `2px solid rgba(70,70,100,0.6)`,
            padding: '24px 28px',
            minWidth: '280px',
            maxWidth: '90%',
        });

        this._detailName = document.createElement('div');
        this._detailName.style.cssText = 'font-size:20px;font-weight:bold;color:#fff;margin-bottom:4px;';
        popup.appendChild(this._detailName);

        this._detailQty = document.createElement('div');
        this._detailQty.style.cssText = 'font-size:15px;color:rgba(180,200,255,0.9);margin-bottom:8px;';
        popup.appendChild(this._detailQty);

        const sep = document.createElement('hr');
        sep.style.cssText = 'border:none;border-top:1px solid rgba(60,60,80,0.5);margin:8px 0;';
        popup.appendChild(sep);

        this._detailDesc = document.createElement('div');
        this._detailDesc.style.cssText = 'font-size:15px;color:rgba(190,190,200,0.85);line-height:1.4;margin-bottom:16px;';
        popup.appendChild(this._detailDesc);

        // Action buttons row
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;justify-content:center;gap:12px;';

        this._useButton = createButton('Use', 'rgba(50,150,100,1)', { padding: '10px 24px' });
        this._useButton.addEventListener('click', () => this._onUsePressed());
        btnRow.appendChild(this._useButton);

        this._equipButton = createButton('Equip', COLORS.accent, { padding: '10px 24px' });
        this._equipButton.addEventListener('click', () => this._onEquipPressed());
        btnRow.appendChild(this._equipButton);

        const closeBtn = createButton('Close', 'rgba(70,70,90,1)', { padding: '10px 20px' });
        closeBtn.addEventListener('click', () => this._closeDetail());
        btnRow.appendChild(closeBtn);

        popup.appendChild(btnRow);
        this._detailOverlay.appendChild(popup);
        parent.appendChild(this._detailOverlay);
    }

    /** @private */
    _switchTab(tabKey, tabBarEl) {
        this._currentTab = tabKey;

        // Update tab styles
        const tabs = tabBarEl.querySelectorAll('button');
        for (const t of tabs) {
            const isActive = t.dataset.tabKey === tabKey;
            t.style.color = isActive ? COLORS.accent : COLORS.textSecondary;
            t.style.borderBottom = isActive ? `2px solid ${COLORS.accent}` : '2px solid transparent';
        }

        this._populateItems(tabKey);
    }

    /** @private */
    _populateItems(category) {
        if (!this._itemGrid) return;
        this._itemGrid.innerHTML = '';

        // Get inventory items for this category
        const inventory = (this._gameManager && this._gameManager.playerData)
            ? this._gameManager.playerData.inventory || {}
            : {};
        const items = inventory[category] || [];

        if (items.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = `No ${category.replace(/_/g, ' ')} found.`;
            emptyMsg.style.cssText = `color:${COLORS.textDim};font-size:15px;text-align:center;grid-column:1/-1;padding:40px 0;`;
            this._itemGrid.appendChild(emptyMsg);
            return;
        }

        for (const item of items) {
            const cell = document.createElement('div');
            cell.className = 'item-cell';
            Object.assign(cell.style, {
                width: '100%',
                aspectRatio: '1',
                background: COLORS.bgCard,
                borderRadius: '10px',
                border: `1px solid ${COLORS.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                color: COLORS.textSecondary,
                padding: '4px',
                boxSizing: 'border-box',
            });

            // Item icon with category-specific emoji
            const iconArea = document.createElement('div');
            iconArea.style.cssText = 'width:48px;height:48px;background:rgba(40,40,60,1);border-radius:6px;margin-bottom:4px;display:flex;align-items:center;justify-content:center;font-size:22px;';
            const catIcons = { consumables: '\u{1F9EA}', crystals: '\u{1F48E}', equipment: '\u2694\uFE0F', key_items: '\u{1F511}', materials: '\u{1F9F1}' };
            iconArea.textContent = catIcons[category] || '\u{1F4E6}';
            cell.appendChild(iconArea);

            // Quantity badge
            if (item.quantity && item.quantity > 1) {
                const qty = document.createElement('span');
                qty.textContent = `x${item.quantity}`;
                qty.style.cssText = 'font-size:11px;color:rgba(200,200,220,0.7);';
                cell.appendChild(qty);
            }

            cell.addEventListener('click', () => {
                this._showItemDetail(item);
            });

            this._itemGrid.appendChild(cell);
        }
    }

    /** @private */
    _showItemDetail(item) {
        this._selectedItemId = item.itemId || item.item_id || -1;
        this._detailName.textContent = item.itemName || item.name || `Item #${this._selectedItemId}`;
        this._detailQty.textContent = `Qty: ${item.quantity || 1}`;
        this._detailDesc.textContent = item.description || 'Item description will be loaded from the item registry.';

        // Show/hide action buttons based on category
        this._useButton.style.display = ['consumables', 'crystals'].includes(this._currentTab) ? '' : 'none';
        this._equipButton.style.display = this._currentTab === 'equipment' ? '' : 'none';

        this._detailOverlay.style.display = 'flex';
    }

    /** @private */
    _closeDetail() {
        this._detailOverlay.style.display = 'none';
        this._selectedItemId = -1;
    }

    /** @private */
    _onUsePressed() {
        if (this._selectedItemId > 0) {
            eventBus.emit(GameEvents.ITEM_USED, { itemId: this._selectedItemId });
            this._closeDetail();
            this._populateItems(this._currentTab);
        }
    }

    /** @private */
    _onEquipPressed() {
        if (this._selectedItemId > 0) {
            eventBus.emit(GameEvents.EQUIPMENT_CHANGED, { itemId: this._selectedItemId });
            this._closeDetail();
        }
    }

    /** @private */
    _onBackPressed() {
        if (this._screenManager) {
            this._screenManager.popScreen('slide_right');
        }
    }
}

// ================================================================================
// SettingsScreen
// ================================================================================

export class SettingsScreen {
    /**
     * @param {Object} [deps]
     * @param {Object} [deps.screenManager]
     * @param {Object} [deps.audioEngine] - Reference to AudioEngine for volume control
     */
    constructor(deps = {}) {
        this._screenManager = deps.screenManager || null;
        this._audioEngine = deps.audioEngine || null;

        this.SETTINGS_KEY = 'sw_settings';
    }

    /**
     * Build and return the settings screen DOM element.
     * @param {Object} [params]
     * @returns {HTMLElement}
     */
    build(params = {}) {
        const screen = document.createElement('div');
        screen.className = 'settings-screen';
        Object.assign(screen.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: COLORS.bgDark,
            color: COLORS.textPrimary,
            fontFamily: 'sans-serif',
        });

        // Top bar
        screen.appendChild(createTopBar('Settings', () => this._onBackPressed()));

        // Scrollable settings content
        const scrollArea = document.createElement('div');
        scrollArea.style.cssText = 'flex:1;overflow-y:auto;padding:20px 32px 60px;';

        const content = document.createElement('div');
        content.style.cssText = 'display:flex;flex-direction:column;gap:24px;';

        // Load current settings
        const settings = this._loadSettings();

        // -- Audio Section --
        content.appendChild(this._createSectionHeader('Audio'));

        const musicSlider = this._createSliderRow('Music Volume', 0, 1, settings.musicVolume, (val) => {
            if (this._audioEngine) this._audioEngine.setMusicVolume(val);
            this._autoSave();
        });
        content.appendChild(musicSlider.row);

        const musicMute = this._createCheckRow('Mute Music', settings.musicMuted, (checked) => {
            if (this._audioEngine && checked) this._audioEngine.toggleMute();
            this._autoSave();
        });
        content.appendChild(musicMute);

        const sfxSlider = this._createSliderRow('SFX Volume', 0, 1, settings.sfxVolume, (val) => {
            if (this._audioEngine) this._audioEngine.setSfxVolume(val);
            this._autoSave();
        });
        content.appendChild(sfxSlider.row);

        const sfxMute = this._createCheckRow('Mute SFX', settings.sfxMuted, (_checked) => {
            this._autoSave();
        });
        content.appendChild(sfxMute);

        const ambientSlider = this._createSliderRow('Ambient Volume', 0, 1, settings.ambientVolume, (_val) => {
            this._autoSave();
        });
        content.appendChild(ambientSlider.row);

        // -- Gameplay Section --
        content.appendChild(this._createSectionHeader('Gameplay'));

        const battleSpeedRow = this._createOptionRow('Battle Speed', ['1x', '2x', '4x'], settings.battleSpeed, () => {
            this._autoSave();
        });
        content.appendChild(battleSpeedRow);

        const animToggle = this._createCheckRow('Show Battle Animations', settings.showAnimations, (_checked) => {
            this._autoSave();
        });
        content.appendChild(animToggle);

        // -- Display Section --
        content.appendChild(this._createSectionHeader('Display'));

        const textSizeRow = this._createOptionRow('Text Size', ['Small', 'Medium', 'Large'], settings.textSize, () => {
            this._autoSave();
        });
        content.appendChild(textSizeRow);

        scrollArea.appendChild(content);
        screen.appendChild(scrollArea);

        // Store references for saving
        screen._settingsRefs = {
            musicSlider: musicSlider.slider,
            sfxSlider: sfxSlider.slider,
            ambientSlider: ambientSlider.slider,
        };

        return screen;
    }

    // -- UI Builders -------------------------------------------------------------

    /** @private */
    _createSectionHeader(text) {
        const container = document.createElement('div');

        const label = document.createElement('div');
        label.textContent = text;
        label.style.cssText = 'font-size:20px;font-weight:bold;color:rgba(180,200,255,1);margin-bottom:4px;';
        container.appendChild(label);

        const sep = document.createElement('hr');
        sep.style.cssText = 'border:none;border-top:1px solid rgba(60,60,80,0.5);margin:0;';
        container.appendChild(sep);

        return container;
    }

    /** @private */
    _createSliderRow(labelText, min, max, value, onChange) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-direction:column;gap:4px;';

        const label = document.createElement('div');
        label.textContent = labelText;
        label.style.cssText = 'font-size:16px;color:rgba(215,215,230,1);';
        row.appendChild(label);

        const sliderRow = document.createElement('div');
        sliderRow.style.cssText = 'display:flex;align-items:center;gap:12px;';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = 0.01;
        slider.value = value;
        Object.assign(slider.style, {
            flex: '1',
            height: '6px',
            accentColor: COLORS.accent,
        });

        const valueLabel = document.createElement('span');
        valueLabel.textContent = `${Math.round(value * 100)}%`;
        valueLabel.style.cssText = 'min-width:48px;text-align:right;color:rgba(180,180,195,0.8);font-size:14px;';

        slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            valueLabel.textContent = `${Math.round(val * 100)}%`;
            if (onChange) onChange(val);
        });

        sliderRow.appendChild(slider);
        sliderRow.appendChild(valueLabel);
        row.appendChild(sliderRow);

        return { row, slider };
    }

    /** @private */
    _createCheckRow(labelText, checked, onChange) {
        const row = document.createElement('label');
        row.style.cssText = 'display:flex;align-items:center;gap:12px;cursor:pointer;padding:4px 0;';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!checked;
        checkbox.style.cssText = 'width:20px;height:20px;accent-color:' + COLORS.accent + ';';
        checkbox.addEventListener('change', () => {
            if (onChange) onChange(checkbox.checked);
        });
        row.appendChild(checkbox);

        const label = document.createElement('span');
        label.textContent = labelText;
        label.style.cssText = 'font-size:16px;color:rgba(215,215,230,1);';
        row.appendChild(label);

        return row;
    }

    /** @private */
    _createOptionRow(labelText, options, selectedIndex, onChange) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:16px;';

        const label = document.createElement('span');
        label.textContent = labelText;
        label.style.cssText = 'flex:1;font-size:16px;color:rgba(215,215,230,1);';
        row.appendChild(label);

        const select = document.createElement('select');
        for (const opt of options) {
            const o = document.createElement('option');
            o.textContent = opt;
            select.appendChild(o);
        }
        select.selectedIndex = selectedIndex || 0;
        Object.assign(select.style, {
            padding: '8px 12px',
            background: 'rgba(25,25,40,1)',
            color: COLORS.textSecondary,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            fontSize: '14px',
            minWidth: '120px',
        });
        select.addEventListener('change', () => {
            if (onChange) onChange(select.selectedIndex);
        });
        row.appendChild(select);

        return row;
    }

    // -- Save / Load Settings ----------------------------------------------------

    /** @private */
    _loadSettings() {
        try {
            const raw = localStorage.getItem(this.SETTINGS_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* use defaults */ }

        return this._defaultSettings();
    }

    /** @private */
    _defaultSettings() {
        return {
            musicVolume: 0.8,
            sfxVolume: 0.8,
            ambientVolume: 0.6,
            musicMuted: false,
            sfxMuted: false,
            battleSpeed: 0,
            showAnimations: true,
            textSize: 1,
        };
    }

    /** @private */
    _saveSettings() {
        // Collect current values from the DOM
        // This is a lightweight approach: we re-read the DOM state
        const screen = document.querySelector('.settings-screen');
        if (!screen) return;

        const sliders = screen.querySelectorAll('input[type="range"]');
        const checkboxes = screen.querySelectorAll('input[type="checkbox"]');
        const selects = screen.querySelectorAll('select');

        const settings = {
            musicVolume: sliders[0] ? parseFloat(sliders[0].value) : 0.8,
            sfxVolume: sliders[1] ? parseFloat(sliders[1].value) : 0.8,
            ambientVolume: sliders[2] ? parseFloat(sliders[2].value) : 0.6,
            musicMuted: checkboxes[0] ? checkboxes[0].checked : false,
            sfxMuted: checkboxes[1] ? checkboxes[1].checked : false,
            showAnimations: checkboxes[2] ? checkboxes[2].checked : true,
            battleSpeed: selects[0] ? selects[0].selectedIndex : 0,
            textSize: selects[1] ? selects[1].selectedIndex : 1,
        };

        try {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.warn('[SettingsScreen] Failed to save settings:', e);
        }

        eventBus.emit(GameEvents.SETTINGS_CHANGED, settings);
    }

    /** @private */
    _autoSave() {
        this._saveSettings();
    }

    /** @private */
    _onBackPressed() {
        this._saveSettings();
        if (this._screenManager) {
            this._screenManager.popScreen('slide_right');
        }
    }
}

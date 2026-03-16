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
import { EQUIPMENT, SLOT_TYPES, RARITY_TIERS, findEquipmentWithExpansion } from '../../data/EquipmentData.js';
import { getRaceSpritePath } from '../../data/SpriteTextureHelper.js';

// -- Shared Style Constants ------------------------------------------------------

// Clean cel-shaded art style: vibrant saturated colors, flat fills, black outlines
const COLORS = {
    bgDark:     '#1A1230',
    bgPanel:    '#221A3D',
    bgCard:     '#2A2050',
    bgCardDim:  'rgba(42,32,80,0.6)',
    border:     '#1A1A1A',
    borderHi:   '#4A90D9',
    textPrimary:'#FFFFFF',
    textSecondary:'#B0B8CC',
    textDim:    'rgba(140,148,170,0.6)',
    accent:     '#4A90D9',
    success:    '#44CC66',
    danger:     '#DD4444',
    gold:       '#FFAA33',
};

const ELEMENT_COLORS = {
    Fire:     '#ff5533', Water:    '#3399ff', Plant:    '#33aa33',
    Ice:      '#99ddff', Wind:     '#88ccaa', Earth:    '#996633',
    Electric: '#ffcc00', Dark:     '#8844aa', Light:    '#ffee99',
    Fairy:    '#ff66aa', Solar:    '#ffaa33', Lunar:    '#8899cc',
    Metal:    '#aaaacc', Poison:   '#aa33aa',
};

const RARITY_COLORS = {
    common:    '#888888',
    uncommon:  '#33cc66',
    rare:      '#3399ff',
    epic:      '#aa44ff',
    legendary: '#ffaa00',
};

const RARITY_STARS = {
    common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5,
};

const SLOT_ICONS = {
    helmet: '\u26D1', weapon: '\u2694', chest: '\uD83D\uDEE1',
    gloves: '\uD83E\uDDE4', legs: '\uD83D\uDC56', boots: '\uD83D\uDC62',
    ring: '\uD83D\uDC8D', amulet: '\uD83D\uDCFF', crystal: '\uD83D\uDC8E',
};

const STAT_LABELS = {
    hp: 'HP', atk: 'ATK', def: 'DEF',
    sp_atk: 'SP.ATK', sp_def: 'SP.DEF', spd: 'SPD',
};

const STAT_COLORS = {
    hp:     '#33cc66', atk:    '#ff6644', def:    '#4488ff',
    sp_atk: '#ff66aa', sp_def: '#66aaff', spd:    '#66ffcc',
};

// -- Helper: Create styled button -----------------------------------------------

function createButton(text, bgColor, opts = {}) {
    const btn = document.createElement('button');
    btn.textContent = text;
    // Clean cel-shaded button: uniform black outline, flat color fill, rounded corners
    Object.assign(btn.style, {
        padding: opts.padding || '10px 20px',
        background: bgColor,
        color: '#FFFFFF',
        border: '3px solid #1A1A1A',
        borderRadius: '8px',
        fontSize: opts.fontSize || '16px',
        fontWeight: 'bold',
        fontFamily: "Arial, Helvetica, sans-serif",
        cursor: 'pointer',
        minWidth: opts.minWidth || '0',
        textAlign: 'center',
        transition: 'background 0.15s, transform 0.15s',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
    });

    // Hover and active states — clean
    btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.15)'; });
    btn.addEventListener('mouseleave', () => { btn.style.filter = ''; btn.style.transform = ''; });
    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.97)'; });
    btn.addEventListener('mouseup', () => { btn.style.transform = ''; });

    if (opts.disabled) {
        btn.disabled = true;
        btn.style.background = '#333344';
        btn.style.color = 'rgba(120,120,120,0.5)';
        btn.style.cursor = 'default';
        btn.style.borderColor = '#555';
    }

    return btn;
}

// -- Helper: Create top bar -----------------------------------------------------

function createTopBar(title, onBack) {
    const bar = document.createElement('div');
    bar.className = 'screen-top-bar';
    // Clean cel-shaded top bar: flat color, black outline border
    Object.assign(bar.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 16px',
        background: '#221A3D',
        borderBottom: '3px solid #1A1A1A',
        minHeight: '60px',
        boxSizing: 'border-box',
        flexShrink: '0',
        fontFamily: "Arial, Helvetica, sans-serif",
    });

    if (onBack) {
        const backBtn = createButton('<  Back', '#3D3060', { fontSize: '14px', padding: '8px 14px' });
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
        // Clean cel-shaded style: vibrant saturated colors, flat fills
        Object.assign(screen.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            background: COLORS.bgDark,
            color: COLORS.textPrimary,
            fontFamily: "Arial, Helvetica, sans-serif",
        });

        // Title section — clean cel-shaded style
        const titleSection = document.createElement('div');
        titleSection.style.cssText = 'text-align:center;margin-bottom:40px;';

        const title = document.createElement('div');
        title.textContent = 'SPRITE WARS';
        Object.assign(title.style, {
            fontSize: '46px',
            fontWeight: 'bold',
            color: '#FFCC33',
            marginBottom: '8px',
            letterSpacing: '3px',
            fontFamily: "Arial, Helvetica, sans-serif",
            textShadow: '3px 3px 0 #1A1A1A',
        });
        titleSection.appendChild(title);

        const subtitle = document.createElement('div');
        subtitle.textContent = 'Legends of the Shattered Grid';
        Object.assign(subtitle.style, {
            fontSize: '17px',
            color: '#B0B8CC',
            fontFamily: "Arial, Helvetica, sans-serif",
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

        this.MAX_TEAM_SIZE = 14;
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
        // Clean cel-shaded style
        Object.assign(screen.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: COLORS.bgDark,
            color: COLORS.textPrimary,
            fontFamily: "Arial, Helvetica, sans-serif",
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

        // Clean cel-shaded slot with uniform outline
        const slot = document.createElement('div');
        slot.className = 'team-slot';
        Object.assign(slot.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            background: isEmpty ? COLORS.bgCardDim : COLORS.bgCard,
            borderRadius: '8px',
            border: `3px solid ${COLORS.border}`,
            cursor: 'pointer',
            minHeight: '80px',
            transition: 'border-color 0.15s',
            fontFamily: "Arial, Helvetica, sans-serif",
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

            // Portrait container: race sprite image + canvas overlay with equipment
            const portraitWrap = document.createElement('div');
            Object.assign(portraitWrap.style, {
                position: 'relative',
                width: '56px', height: '56px',
                flexShrink: '0',
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'rgba(35,35,55,1)',
            });

            const sRaceId = spriteData.raceId || spriteData.race_id || 1;
            const sStage = spriteData.evolutionStage || spriteData.evolution_stage || 1;
            const sEquip = spriteData.equipment || {};

            // Race sprite image (background portrait)
            const raceSpritePath = getRaceSpritePath(sRaceId, Math.max(0, sStage - 1));
            if (raceSpritePath) {
                const raceImg = document.createElement('img');
                raceImg.src = raceSpritePath;
                Object.assign(raceImg.style, {
                    position: 'absolute', top: '0', left: '0',
                    width: '100%', height: '100%',
                    objectFit: 'contain',
                    imageRendering: 'crisp-edges',
                    opacity: '0.35',
                });
                raceImg.onerror = () => { raceImg.style.display = 'none'; };
                portraitWrap.appendChild(raceImg);
            }

            // Canvas with equipment rendering (foreground)
            const portrait = document.createElement('canvas');
            portrait.width = 56;
            portrait.height = 56;
            Object.assign(portrait.style, {
                position: 'relative',
                width: '56px', height: '56px',
                imageRendering: 'crisp-edges',
            });
            const pCtx = portrait.getContext('2d');
            HumanoidSpriteSystem.drawWithEquipment(
                pCtx, sRaceId, sStage, 0, 0, 28, 48, 50, { equipment: sEquip }
            );
            portraitWrap.appendChild(portrait);
            slot.appendChild(portraitWrap);

            // Info column
            const info = document.createElement('div');
            info.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:3px;';

            // Name
            const displayName = spriteData.nickname || `Sprite #${spriteData.raceId || '?'}`;
            const nameEl = document.createElement('div');
            nameEl.textContent = displayName;
            nameEl.style.cssText = "color:#FFFFFF;font-size:16px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;";
            info.appendChild(nameEl);

            // Level
            const levelEl = document.createElement('div');
            levelEl.textContent = `Lv. ${spriteData.level || 1}`;
            levelEl.style.cssText = "color:#B0B8CC;font-size:14px;font-family:Arial,Helvetica,sans-serif;";
            info.appendChild(levelEl);

            // HP bar — clean flat rectangle with black outline
            const hpBar = document.createElement('div');
            hpBar.style.cssText = 'width:100%;height:8px;background:#1A1A2E;border-radius:4px;overflow:hidden;border:2px solid #1A1A1A;position:relative;';
            const hpFill = document.createElement('div');
            const hpPct = spriteData.maxHp > 0 ? (spriteData.currentHp / spriteData.maxHp) * 100 : 100;
            hpFill.style.cssText = `width:${hpPct}%;height:100%;background:#33CC55;border-radius:2px;position:relative;z-index:1;`;
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
        // Clean cel-shaded bottom bar: flat color, black outline border
        Object.assign(bar.style, {
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            padding: '12px 16px',
            background: '#221A3D',
            borderTop: '3px solid #1A1A1A',
            minHeight: '60px',
            boxSizing: 'border-box',
            flexShrink: '0',
            fontFamily: "Arial, Helvetica, sans-serif",
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
        this.EQUIPMENT_CAPACITY = 100;

        this._currentTab = 'consumables';
        this._selectedItemId = -1;

        // Equipment tab state
        this._eqSlotFilter = 'all';
        this._eqRarityFilter = 'all';
        this._eqElementFilter = 'all';
        this._eqSortMode = 'rarity';

        /** @private DOM refs */
        this._screenEl = null;
        this._tabBar = null;
        this._itemGrid = null;
        this._sortRow = null;
        this._eqFilterRow = null;
        this._eqCountHeader = null;
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
        // Clean cel-shaded style
        Object.assign(screen.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: COLORS.bgDark,
            color: COLORS.textPrimary,
            fontFamily: "Arial, Helvetica, sans-serif",
        });
        this._screenEl = screen;

        // Top bar
        screen.appendChild(createTopBar('Inventory', () => this._onBackPressed()));

        // Tab bar
        this._tabBar = this._buildTabBar();
        screen.appendChild(this._tabBar);

        // Sort row (for non-equipment tabs)
        this._sortRow = this._buildSortRow();
        screen.appendChild(this._sortRow);

        // Equipment filter row (hidden by default, shown for equipment tab)
        this._eqFilterRow = this._buildEquipmentFilterRow();
        this._eqFilterRow.style.display = 'none';
        screen.appendChild(this._eqFilterRow);

        // Equipment count header (hidden by default)
        this._eqCountHeader = document.createElement('div');
        this._eqCountHeader.style.cssText = `
            display: none; padding: 4px 24px 0;
            font-size: 14px; font-weight: 600; color: ${COLORS.textSecondary};
            flex-shrink: 0;
        `;
        screen.appendChild(this._eqCountHeader);

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

        // Sprite selection overlay (for equip flow)
        this._buildSpriteSelectionOverlay(screen);

        // Populate initial tab
        this._populateItems(this._currentTab);

        return screen;
    }

    /** @private */
    _buildTabBar() {
        const bar = document.createElement('div');
        bar.className = 'inventory-tab-bar';
        // Clean cel-shaded tab bar
        Object.assign(bar.style, {
            display: 'flex',
            overflow: 'auto',
            background: '#221A3D',
            borderBottom: '3px solid #1A1A1A',
            flexShrink: '0',
            fontFamily: "Arial, Helvetica, sans-serif",
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
                minHeight: '44px',
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
            background: '#2A2050',
            color: COLORS.textSecondary,
            border: `2px solid ${COLORS.border}`,
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'Arial, Helvetica, sans-serif',
        });
        select.addEventListener('change', () => {
            this._populateItems(this._currentTab);
        });
        row.appendChild(select);

        return row;
    }

    /** @private Build the equipment-specific sort/filter bar */
    _buildEquipmentFilterRow() {
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
            padding: 8px 24px; flex-shrink: 0;
            background: rgba(18, 18, 30, 0.6);
            border-bottom: 1px solid rgba(50,50,75,0.3);
        `;

        // Slot filter
        const slotLabel = document.createElement('span');
        slotLabel.textContent = 'Slot:';
        slotLabel.style.cssText = `color:${COLORS.textDim};font-size:13px;`;
        row.appendChild(slotLabel);

        const slotSelect = document.createElement('select');
        slotSelect.style.cssText = this._filterSelectStyle();
        const slotOpts = [{ value: 'all', label: 'All Slots' }];
        for (const st of SLOT_TYPES) {
            slotOpts.push({ value: st, label: `${SLOT_ICONS[st] || ''} ${st.charAt(0).toUpperCase() + st.slice(1)}` });
        }
        for (const so of slotOpts) {
            const o = document.createElement('option');
            o.value = so.value;
            o.textContent = so.label;
            slotSelect.appendChild(o);
        }
        slotSelect.addEventListener('change', () => {
            this._eqSlotFilter = slotSelect.value;
            this._populateEquipmentTab();
        });
        row.appendChild(slotSelect);

        // Rarity filter
        const rarLabel = document.createElement('span');
        rarLabel.textContent = 'Rarity:';
        rarLabel.style.cssText = `color:${COLORS.textDim};font-size:13px;margin-left:4px;`;
        row.appendChild(rarLabel);

        const rarSelect = document.createElement('select');
        rarSelect.style.cssText = this._filterSelectStyle();
        const rarOpts = [{ value: 'all', label: 'All' }];
        for (const rt of RARITY_TIERS) {
            rarOpts.push({ value: rt, label: rt.charAt(0).toUpperCase() + rt.slice(1) });
        }
        for (const ro of rarOpts) {
            const o = document.createElement('option');
            o.value = ro.value;
            o.textContent = ro.label;
            rarSelect.appendChild(o);
        }
        rarSelect.addEventListener('change', () => {
            this._eqRarityFilter = rarSelect.value;
            this._populateEquipmentTab();
        });
        row.appendChild(rarSelect);

        // Sort
        const sortLabel = document.createElement('span');
        sortLabel.textContent = 'Sort:';
        sortLabel.style.cssText = `color:${COLORS.textDim};font-size:13px;margin-left:4px;`;
        row.appendChild(sortLabel);

        const sortSelect = document.createElement('select');
        sortSelect.style.cssText = this._filterSelectStyle();
        const sortOpts = [
            { value: 'rarity', label: 'Rarity' },
            { value: 'slot', label: 'Slot Type' },
            { value: 'name', label: 'Name A-Z' },
            { value: 'level', label: 'Level Req' },
        ];
        for (const srt of sortOpts) {
            const o = document.createElement('option');
            o.value = srt.value;
            o.textContent = srt.label;
            sortSelect.appendChild(o);
        }
        sortSelect.addEventListener('change', () => {
            this._eqSortMode = sortSelect.value;
            this._populateEquipmentTab();
        });
        row.appendChild(sortSelect);

        return row;
    }

    /** @private Shared style for filter/sort selects */
    _filterSelectStyle() {
        return `
            padding: 5px 8px; background: #2A2050;
            color: ${COLORS.textSecondary}; border: 2px solid ${COLORS.border};
            border-radius: 6px; font-size: 13px; min-height: 36px;
            font-family: Arial, Helvetica, sans-serif;
        `;
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

        // Popup panel — clean cel-shaded: flat color, uniform black outline
        const popup = document.createElement('div');
        popup.className = 'item-detail-popup';
        Object.assign(popup.style, {
            background: COLORS.bgPanel,
            borderRadius: '8px',
            border: `3px solid #1A1A1A`,
            padding: '24px 28px',
            minWidth: '280px',
            maxWidth: '90%',
            fontFamily: "Arial, Helvetica, sans-serif",
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

    /** @private Build sprite selection overlay for equip flow */
    _buildSpriteSelectionOverlay(parent) {
        this._spriteSelectOverlay = document.createElement('div');
        Object.assign(this._spriteSelectOverlay.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '550',
        });
        this._spriteSelectOverlay.addEventListener('click', (e) => {
            if (e.target === this._spriteSelectOverlay) {
                this._spriteSelectOverlay.style.display = 'none';
            }
        });

        const panel = document.createElement('div');
        panel.style.cssText = `
            background: ${COLORS.bgPanel}; border-radius: 8px;
            border: 3px solid #1A1A1A;
            padding: 20px 24px; min-width: 300px; max-width: 90%;
            max-height: 80%; overflow-y: auto;
            font-family: Arial, Helvetica, sans-serif;
        `;

        const panelTitle = document.createElement('div');
        panelTitle.style.cssText = 'font-size: 18px; font-weight: bold; color: #fff; margin-bottom: 12px; text-align: center;';
        panelTitle.textContent = 'Select Sprite to Equip';
        panel.appendChild(panelTitle);

        this._spriteListContainer = document.createElement('div');
        this._spriteListContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
        panel.appendChild(this._spriteListContainer);

        const cancelBtn = createButton('Cancel', 'rgba(70,70,90,1)', { padding: '10px 24px', minWidth: '100%' });
        cancelBtn.style.marginTop = '12px';
        cancelBtn.addEventListener('click', () => {
            this._spriteSelectOverlay.style.display = 'none';
        });
        panel.appendChild(cancelBtn);

        this._spriteSelectOverlay.appendChild(panel);
        parent.appendChild(this._spriteSelectOverlay);
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

        // Toggle filter rows and grid layout based on tab
        const isEquipment = tabKey === 'equipment';
        this._sortRow.style.display = isEquipment ? 'none' : 'flex';
        this._eqFilterRow.style.display = isEquipment ? 'flex' : 'none';
        this._eqCountHeader.style.display = isEquipment ? 'block' : 'none';

        if (isEquipment) {
            // Equipment uses a vertical card list, not a grid
            this._itemGrid.style.display = 'flex';
            this._itemGrid.style.flexDirection = 'column';
            this._itemGrid.style.gap = '8px';
            this._itemGrid.style.gridTemplateColumns = '';
            this._populateEquipmentTab();
        } else {
            this._itemGrid.style.display = 'grid';
            this._itemGrid.style.flexDirection = '';
            this._itemGrid.style.gridTemplateColumns = `repeat(${this.GRID_COLUMNS}, 1fr)`;
            this._itemGrid.style.gap = '8px';
            this._populateItems(tabKey);
        }
    }

    /** @private */
    _populateItems(category) {
        if (!this._itemGrid) return;
        this._itemGrid.innerHTML = '';

        if (category === 'equipment') {
            this._populateEquipmentTab();
            return;
        }

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
            // Clean cel-shaded item cell with uniform outline
            const cell = document.createElement('div');
            cell.className = 'item-cell';
            Object.assign(cell.style, {
                width: '100%',
                aspectRatio: '1',
                background: COLORS.bgCard,
                borderRadius: '8px',
                border: `3px solid ${COLORS.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                color: COLORS.textSecondary,
                padding: '4px',
                boxSizing: 'border-box',
                fontFamily: "Arial, Helvetica, sans-serif",
                transition: 'background 0.15s',
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

    // ── Equipment Tab ─────────────────────────────────────────────────────

    /** @private Populate the equipment tab with rich equipment cards */
    _populateEquipmentTab() {
        if (!this._itemGrid) return;
        this._itemGrid.innerHTML = '';

        // Get unequipped equipment from player data
        const playerData = (this._gameManager && this._gameManager.playerData)
            ? this._gameManager.playerData
            : {};
        let equipmentList = playerData.equipmentInventory || [];

        // Also check generic inventory.equipment for backwards compatibility
        if (equipmentList.length === 0 && playerData.inventory && playerData.inventory.equipment) {
            equipmentList = playerData.inventory.equipment;
        }

        // Resolve equipment data: items might be IDs or full objects
        let resolvedItems = equipmentList.map(item => {
            if (typeof item === 'number') {
                const found = findEquipmentWithExpansion(item);
                return found || null;
            }
            if (item && (item.equipment_id || item.equipmentId)) {
                // If it's a partial object, try to enrich with static data
                const eqId = item.equipment_id || item.equipmentId;
                const staticData = findEquipmentWithExpansion(eqId);
                return staticData || item;
            }
            return item;
        }).filter(Boolean);

        // Apply slot filter
        if (this._eqSlotFilter !== 'all') {
            resolvedItems = resolvedItems.filter(e =>
                (e.slot_type || e.slotType) === this._eqSlotFilter
            );
        }

        // Apply rarity filter
        if (this._eqRarityFilter !== 'all') {
            resolvedItems = resolvedItems.filter(e =>
                (e.rarity || 'common') === this._eqRarityFilter
            );
        }

        // Apply sorting
        resolvedItems = this._sortEquipmentList(resolvedItems, this._eqSortMode);

        // Update count header
        const totalCount = (playerData.equipmentInventory || []).length;
        this._eqCountHeader.textContent = `Equipment (${totalCount}/${this.EQUIPMENT_CAPACITY})`;
        this._eqCountHeader.style.display = 'block';

        if (resolvedItems.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = this._eqSlotFilter !== 'all' || this._eqRarityFilter !== 'all'
                ? 'No equipment matches the current filters.'
                : 'No unequipped equipment in inventory.';
            emptyMsg.style.cssText = `
                color: ${COLORS.textDim}; font-size: 15px;
                text-align: center; padding: 40px 0;
            `;
            this._itemGrid.appendChild(emptyMsg);
            return;
        }

        for (const eqData of resolvedItems) {
            this._itemGrid.appendChild(this._createEquipmentCard(eqData));
        }
    }

    /** @private Sort the equipment list */
    _sortEquipmentList(items, mode) {
        const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
        const slotOrder = {};
        SLOT_TYPES.forEach((s, i) => { slotOrder[s] = i; });

        const sorted = [...items];
        switch (mode) {
            case 'rarity':
                sorted.sort((a, b) => {
                    const ra = rarityOrder[a.rarity || 'common'] || 0;
                    const rb = rarityOrder[b.rarity || 'common'] || 0;
                    return rb - ra; // Higher rarity first
                });
                break;
            case 'slot':
                sorted.sort((a, b) => {
                    const sa = slotOrder[a.slot_type || a.slotType || ''] || 0;
                    const sb = slotOrder[b.slot_type || b.slotType || ''] || 0;
                    return sa - sb;
                });
                break;
            case 'name':
                sorted.sort((a, b) => {
                    const na = (a.equipment_name || a.equipmentName || '').toLowerCase();
                    const nb = (b.equipment_name || b.equipmentName || '').toLowerCase();
                    return na < nb ? -1 : na > nb ? 1 : 0;
                });
                break;
            case 'level':
                sorted.sort((a, b) => {
                    const la = a.level_requirement || a.levelRequirement || 0;
                    const lb = b.level_requirement || b.levelRequirement || 0;
                    return lb - la; // Higher level first
                });
                break;
        }
        return sorted;
    }

    /**
     * @private Create a rich equipment card for the inventory.
     * @param {object} eqData
     * @returns {HTMLElement}
     */
    _createEquipmentCard(eqData) {
        const rarityColor = RARITY_COLORS[eqData.rarity] || '#888';
        const rarity = eqData.rarity || 'common';
        const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1);
        const stars = RARITY_STARS[rarity] || 1;
        const slotType = eqData.slot_type || eqData.slotType || 'weapon';
        const slotIcon = SLOT_ICONS[slotType] || '\u2B24';
        const slotLabel = slotType.charAt(0).toUpperCase() + slotType.slice(1);
        const name = eqData.equipment_name || eqData.equipmentName || 'Unknown';
        const levelReq = eqData.level_requirement || eqData.levelRequirement || 1;
        const description = eqData.description || '';

        // Clean cel-shaded equipment card: flat color, uniform outline
        const card = document.createElement('div');
        card.style.cssText = `
            display: flex; flex-direction: column;
            padding: 12px 14px;
            background: ${COLORS.bgCard};
            border-radius: 8px;
            border: 3px solid ${COLORS.border};
            border-left: 5px solid ${rarityColor};
            cursor: pointer;
            transition: background 0.15s;
            min-height: 44px;
            font-family: Arial, Helvetica, sans-serif;
        `;
        card.addEventListener('mouseenter', () => {
            card.style.background = '#332855';
        });
        card.addEventListener('mouseleave', () => {
            card.style.background = COLORS.bgCard;
        });

        // ── Top row: name + rarity stars ──
        const topRow = document.createElement('div');
        topRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;';

        // Equipment icon — prefer PNG asset, fall back to emoji
        const iconEl = document.createElement('span');
        iconEl.style.cssText = `
            font-size: 1.2rem; width: 32px; height: 32px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(40,40,60,0.8); border-radius: 6px;
            border: 1px solid ${rarityColor}44; flex-shrink: 0;
            overflow: hidden;
        `;
        const eqIconPath = eqData.icon_path || eqData.iconPath;
        if (eqIconPath) {
            const eqIconImg = document.createElement('img');
            eqIconImg.src = eqIconPath.replace(/^\.\.\//g, '');
            Object.assign(eqIconImg.style, {
                width: '100%', height: '100%',
                objectFit: 'contain',
                imageRendering: 'crisp-edges',
            });
            eqIconImg.onerror = () => { eqIconImg.style.display = 'none'; iconEl.textContent = slotIcon; };
            iconEl.appendChild(eqIconImg);
        } else {
            iconEl.textContent = slotIcon;
        }
        topRow.appendChild(iconEl);

        // Name + stars column
        const nameCol = document.createElement('div');
        nameCol.style.cssText = 'flex: 1; min-width: 0;';

        const nameEl = document.createElement('div');
        nameEl.style.cssText = `
            font-size: 15px; font-weight: 700; color: ${rarityColor};
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        `;
        nameEl.textContent = name;
        nameCol.appendChild(nameEl);

        const starsRow = document.createElement('div');
        starsRow.style.cssText = 'font-size: 12px; margin-top: 1px;';
        starsRow.innerHTML = `<span style="color:${rarityColor};">${'\u2605'.repeat(stars)}</span><span style="color:#333;">${'\u2605'.repeat(5 - stars)}</span>`;
        nameCol.appendChild(starsRow);

        topRow.appendChild(nameCol);

        // Equip button
        const equipBtn = createButton('Equip', COLORS.accent, { padding: '6px 14px', fontSize: '13px' });
        equipBtn.style.minHeight = '36px';
        equipBtn.style.minWidth = '60px';
        equipBtn.style.flexShrink = '0';
        equipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._showSpriteSelectionForEquip(eqData);
        });
        topRow.appendChild(equipBtn);

        card.appendChild(topRow);

        // ── Meta row: slot + level req ──
        const metaRow = document.createElement('div');
        metaRow.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 12px; color: rgba(150,150,170,0.8); margin-bottom: 6px;';
        metaRow.innerHTML = `
            <span>${slotIcon} ${slotLabel}</span>
            <span style="color:${COLORS.textDim};">&middot;</span>
            <span>${rarityLabel}</span>
            <span style="color:${COLORS.textDim};">&middot;</span>
            <span>Lv. ${levelReq}+</span>
        `;
        card.appendChild(metaRow);

        // ── Stat bonuses grid ──
        const statBonuses = eqData.stat_bonuses || eqData.statBonuses || {};
        const statsRow = document.createElement('div');
        statsRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px 6px; margin-bottom: 4px;';

        for (const [statKey, val] of Object.entries(statBonuses)) {
            if (val && val !== 0) {
                const statColor = STAT_COLORS[statKey] || '#888';
                const label = STAT_LABELS[statKey] || statKey;
                const sign = val > 0 ? '+' : '';
                const badge = document.createElement('span');
                badge.style.cssText = `
                    font-size: 11px; font-weight: 600;
                    color: ${statColor};
                    background: ${statColor}15;
                    padding: 2px 6px; border-radius: 4px;
                    border: 1px solid ${statColor}30;
                `;
                badge.textContent = `${label} ${sign}${val}`;
                statsRow.appendChild(badge);
            }
        }
        if (statsRow.children.length > 0) {
            card.appendChild(statsRow);
        }

        // ── Synergy tags ──
        const elemSynergy = eqData.element_synergy || eqData.elementSynergy || '';
        const classSynergy = eqData.class_synergy || eqData.classSynergy || '';
        if (elemSynergy || classSynergy) {
            const synergyRow = document.createElement('div');
            synergyRow.style.cssText = 'display: flex; gap: 6px; margin-bottom: 4px;';

            if (elemSynergy) {
                const elemColor = ELEMENT_COLORS[elemSynergy] || '#888';
                const elemBadge = document.createElement('span');
                elemBadge.style.cssText = `
                    font-size: 11px; font-weight: 600;
                    color: ${elemColor}; background: ${elemColor}18;
                    padding: 2px 7px; border-radius: 4px;
                    border: 1px solid ${elemColor}40;
                `;
                const mult = eqData.element_synergy_multiplier || eqData.elementSynergyMultiplier || 1;
                elemBadge.textContent = `${elemSynergy} Synergy x${mult}`;
                synergyRow.appendChild(elemBadge);
            }
            if (classSynergy) {
                const classBadge = document.createElement('span');
                classBadge.style.cssText = `
                    font-size: 11px; font-weight: 600;
                    color: #ccaa66; background: rgba(204,170,102,0.1);
                    padding: 2px 7px; border-radius: 4px;
                    border: 1px solid rgba(204,170,102,0.3);
                `;
                const classMult = eqData.class_synergy_multiplier || eqData.classSynergyMultiplier || 1;
                classBadge.textContent = `${classSynergy} x${classMult}`;
                synergyRow.appendChild(classBadge);
            }

            card.appendChild(synergyRow);
        }

        // ── Description ──
        if (description) {
            const descEl = document.createElement('div');
            descEl.style.cssText = 'font-size: 12px; color: rgba(150,150,170,0.7); font-style: italic; line-height: 1.4;';
            descEl.textContent = description;
            card.appendChild(descEl);
        }

        return card;
    }

    /**
     * @private Show the sprite selection flow for equipping an item.
     * @param {object} eqData - The equipment data to equip
     */
    _showSpriteSelectionForEquip(eqData) {
        if (!this._spriteListContainer) return;
        this._spriteListContainer.innerHTML = '';

        const team = (this._gameManager && this._gameManager.playerData)
            ? this._gameManager.playerData.team || []
            : [];

        if (team.length === 0) {
            const noSprites = document.createElement('div');
            noSprites.style.cssText = `color:${COLORS.textDim}; text-align:center; padding:20px 0; font-size:14px;`;
            noSprites.textContent = 'No sprites in your team.';
            this._spriteListContainer.appendChild(noSprites);
        }

        const slotType = eqData.slot_type || eqData.slotType || 'weapon';
        const levelReq = eqData.level_requirement || eqData.levelRequirement || 0;

        for (let i = 0; i < team.length; i++) {
            const sprite = team[i];
            if (!sprite) continue;

            const spriteLevel = sprite.level || 1;
            const meetsLevel = spriteLevel >= levelReq;
            const displayName = sprite.nickname || `Sprite #${sprite.raceId || sprite.race_id || '?'}`;
            const currentEquip = sprite.equipment ? sprite.equipment[slotType] : null;
            const currentEqName = currentEquip
                ? (findEquipmentWithExpansion(currentEquip) || {}).equipment_name || `Item #${currentEquip}`
                : 'Empty';

            const row = document.createElement('div');
            row.style.cssText = `
                display: flex; align-items: center; gap: 10px;
                padding: 10px 12px; border-radius: 10px;
                background: ${COLORS.bgCard};
                border: 1px solid ${COLORS.border};
                cursor: ${meetsLevel ? 'pointer' : 'default'};
                opacity: ${meetsLevel ? '1' : '0.5'};
                transition: background 0.15s;
                min-height: 54px;
            `;

            if (meetsLevel) {
                row.addEventListener('mouseenter', () => { row.style.background = 'rgba(35,35,55,1)'; });
                row.addEventListener('mouseleave', () => { row.style.background = COLORS.bgCard; });
                row.addEventListener('click', () => {
                    this._performEquip(sprite, eqData, i);
                    this._spriteSelectOverlay.style.display = 'none';
                });
            }

            // Portrait with race sprite background
            const portraitWrap2 = document.createElement('div');
            Object.assign(portraitWrap2.style, {
                position: 'relative',
                width: '44px', height: '44px',
                flexShrink: '0',
                borderRadius: '6px',
                overflow: 'hidden',
                background: 'rgba(35,35,55,1)',
            });

            const sRaceId = sprite.raceId || sprite.race_id || 1;
            const sStage = sprite.evolutionStage || sprite.evolution_stage || 1;

            const raceSpritePath2 = getRaceSpritePath(sRaceId, Math.max(0, sStage - 1));
            if (raceSpritePath2) {
                const raceImg2 = document.createElement('img');
                raceImg2.src = raceSpritePath2;
                Object.assign(raceImg2.style, {
                    position: 'absolute', top: '0', left: '0',
                    width: '100%', height: '100%',
                    objectFit: 'contain',
                    imageRendering: 'crisp-edges',
                    opacity: '0.35',
                });
                raceImg2.onerror = () => { raceImg2.style.display = 'none'; };
                portraitWrap2.appendChild(raceImg2);
            }

            const portrait = document.createElement('canvas');
            portrait.width = 44;
            portrait.height = 44;
            Object.assign(portrait.style, {
                position: 'relative',
                width: '44px', height: '44px',
                imageRendering: 'crisp-edges',
            });
            const pCtx = portrait.getContext('2d');
            HumanoidSpriteSystem.drawWithEquipment(
                pCtx, sRaceId, sStage, 0, 0, 22, 36, 40, { equipment: sprite.equipment || {} }
            );
            portraitWrap2.appendChild(portrait);
            row.appendChild(portraitWrap2);

            // Info
            const info = document.createElement('div');
            info.style.cssText = 'flex: 1; min-width: 0;';

            const nameEl = document.createElement('div');
            nameEl.style.cssText = 'font-size: 14px; font-weight: bold; color: #fff;';
            nameEl.textContent = `${displayName} (Lv.${spriteLevel})`;
            info.appendChild(nameEl);

            const currentSlotEl = document.createElement('div');
            currentSlotEl.style.cssText = 'font-size: 12px; color: rgba(150,150,170,0.8);';
            currentSlotEl.textContent = `${SLOT_ICONS[slotType] || ''} ${slotType}: ${currentEqName}`;
            info.appendChild(currentSlotEl);

            if (!meetsLevel) {
                const reqEl = document.createElement('div');
                reqEl.style.cssText = 'font-size: 11px; color: #cc4444;';
                reqEl.textContent = `Requires Lv.${levelReq}`;
                info.appendChild(reqEl);
            }

            row.appendChild(info);
            this._spriteListContainer.appendChild(row);
        }

        this._spriteSelectOverlay.style.display = 'flex';
    }

    /**
     * @private Perform the equip action and emit events.
     * @param {object} sprite
     * @param {object} eqData
     * @param {number} spriteIndex
     */
    _performEquip(sprite, eqData, spriteIndex) {
        const eqId = eqData.equipment_id || eqData.equipmentId;
        const slotType = eqData.slot_type || eqData.slotType || 'weapon';

        eventBus.emit(GameEvents.EQUIPMENT_CHANGED, {
            itemId: eqId,
            equipmentData: eqData,
            spriteIndex,
            slotType,
        });

        // Optimistic UI update
        if (!sprite.equipment) sprite.equipment = {};
        const oldEquipId = sprite.equipment[slotType];
        sprite.equipment[slotType] = eqId;

        // Remove from player inventory and add back old item
        const playerData = this._gameManager && this._gameManager.playerData;
        if (playerData && playerData.equipmentInventory) {
            const removeIdx = playerData.equipmentInventory.findIndex(e => {
                const eid = e.equipment_id || e.equipmentId;
                return eid === eqId;
            });
            if (removeIdx >= 0) {
                playerData.equipmentInventory.splice(removeIdx, 1);
            }
            // Return old item to inventory
            if (oldEquipId) {
                const oldEqData = findEquipmentWithExpansion(oldEquipId);
                if (oldEqData) {
                    playerData.equipmentInventory.push(oldEqData);
                }
            }
        }

        // Refresh equipment display
        this._populateEquipmentTab();
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
        // Clean cel-shaded style
        Object.assign(screen.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: COLORS.bgDark,
            color: COLORS.textPrimary,
            fontFamily: "Arial, Helvetica, sans-serif",
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
            if (this._audioEngine) this._audioEngine.toggleMute();
            this._autoSave();
        });
        content.appendChild(musicMute);

        const sfxSlider = this._createSliderRow('SFX Volume', 0, 1, settings.sfxVolume, (val) => {
            if (this._audioEngine) this._audioEngine.setSfxVolume(val);
            this._autoSave();
        });
        content.appendChild(sfxSlider.row);

        const sfxMute = this._createCheckRow('Mute SFX', settings.sfxMuted, (checked) => {
            if (this._audioEngine) this._audioEngine.setSfxMuted(checked);
            this._autoSave();
        });
        content.appendChild(sfxMute);

        const ambientSlider = this._createSliderRow('Ambient Volume', 0, 1, settings.ambientVolume, (val) => {
            if (this._audioEngine) this._audioEngine.setAmbientVolume(val);
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
            background: '#2A2050',
            color: COLORS.textSecondary,
            border: `2px solid ${COLORS.border}`,
            borderRadius: '8px',
            fontSize: '14px',
            minWidth: '120px',
            fontFamily: 'Arial, Helvetica, sans-serif',
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

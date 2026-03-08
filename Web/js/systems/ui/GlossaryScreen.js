/**
 * GlossaryScreen - Tabbed glossary UI with Races, Classes, and Equipment sections.
 * Provides a read-only reference for all game data, designed for mobile-first layout.
 *
 * Data sources:
 *   - SPRITE_RACES from SpriteData.js (24 races)
 *   - ABILITIES from AbilityData.js (160 abilities, keyed by ability_id)
 *   - EQUIPMENT, SLOT_TYPES from EquipmentData.js (144 items)
 *
 * Follows the same DOM-building patterns as MenuScreens.js.
 */
import { SPRITE_RACES } from '../../data/SpriteData.js';
import { ABILITIES } from '../../data/AbilityData.js';
import { EQUIPMENT, SLOT_TYPES } from '../../data/EquipmentData.js';
import { HumanoidSpriteSystem } from '../rendering/HumanoidSpriteSystem.js';

// -- Shared Style Constants ------------------------------------------------------

const COLORS = {
    bgDark:     '#0d0d1a',
    bgPanel:    '#13131f',
    bgCard:     '#1e1e2e',
    border:     'rgba(50,50,75,0.6)',
    textPrimary:'#ffffff',
    textSecondary:'rgba(180,180,200,0.9)',
    textDim:    'rgba(120,120,140,0.6)',
    accent:     '#3380e6',
    success:    '#33a64c',
    gold:       '#f2c94c',
};

const ELEMENT_COLORS = {
    Fire:     '#ff6633', Water:    '#4d99ff', Earth:    '#997740',
    Wind:     '#b3e6ff', Light:    '#ffff99', Dark:     '#804dbb',
    Plant:    '#4dcc4d', Electric: '#ffe633', Ice:      '#99e6ff',
    Metal:    '#b3b3bf', Poison:   '#b34dcc', Fairy:    '#ff80cc',
    Solar:    '#99cce6', Lunar:    '#e63366',
};

const ALL_ELEMENTS = ["Fire", "Water", "Wind", "Earth", "Plant", "Metal", "Electric", "Dark", "Light", "Solar", "Lunar", "Fairy", "Poison", "Ice"];

const RARITY_COLORS = {
    common:    '#888888',
    uncommon:  '#33cc66',
    rare:      '#3399ff',
    epic:      '#aa44ff',
    legendary: '#ffaa00',
};

const STAT_LABELS = {
    hp: 'HP', atk: 'ATK', def: 'DEF',
    sp_atk: 'SP.ATK', sp_def: 'SP.DEF', spd: 'SPD',
};

const STAT_COLORS = {
    hp:     '#33cc66', atk:    '#ff6644', def:    '#4488ff',
    sp_atk: '#ff66aa', sp_def: '#66aaff', spd:    '#66ffcc',
};

const RARITY_STARS = {
    common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5,
};

// -- Class Data (16 classes) ---------------------------------------------------

const CLASS_DATA = {
    Barbarian:    { role: 'melee',   icon: '\u{1FA78}', stat_weights: { hp: 4, atk: 5, def: 2, spd: 3, sp_atk: 1, sp_def: 1 }, weapons: ['axe', 'mace', 'greatsword'], desc: 'Aggressive melee fighter focused on raw damage output and berserker-style abilities.' },
    Fighter:      { role: 'melee',   icon: '\u2694',     stat_weights: { hp: 3, atk: 4, def: 4, spd: 3, sp_atk: 2, sp_def: 2 }, weapons: ['sword', 'shield', 'axe'], desc: 'Balanced melee combatant with solid offense, defense, and tactical versatility.' },
    Archer:       { role: 'ranged',  icon: '\u{1F3F9}', stat_weights: { hp: 2, atk: 4, def: 2, spd: 5, sp_atk: 2, sp_def: 2 }, weapons: ['bow', 'shortbow', 'longbow'], desc: 'Ranged attacker using bow-based projectiles with precision and area control.' },
    Spearman:     { role: 'melee',   icon: '\u{1F531}', stat_weights: { hp: 3, atk: 4, def: 4, spd: 3, sp_atk: 1, sp_def: 2 }, weapons: ['spear', 'halberd', 'lance'], desc: 'Melee fighter with extended reach and formation-based combat bonuses.' },
    Heavy:        { role: 'melee',   icon: '\u{1F6E1}', stat_weights: { hp: 5, atk: 2, def: 5, spd: 1, sp_atk: 1, sp_def: 3 }, weapons: ['tower_shield', 'warhammer', 'flail'], desc: 'High-mass tank designed to absorb damage, block movement, and control space.' },
    Wizard:       { role: 'ranged',  icon: '\u{1FA84}', stat_weights: { hp: 2, atk: 1, def: 2, spd: 3, sp_atk: 5, sp_def: 5 }, weapons: ['staff', 'wand', 'orb'], desc: 'Ranged magical attacker with powerful elemental abilities and utility spells.' },
    Javelin:      { role: 'hybrid',  icon: '\u{1F4A8}', stat_weights: { hp: 3, atk: 4, def: 3, spd: 4, sp_atk: 1, sp_def: 2 }, weapons: ['javelin', 'throwing_spear', 'pilum'], desc: 'Ranged/melee hybrid using thrown weapons; versatile at any distance.' },
    Alchemist:    { role: 'support', icon: '\u{1F9EA}', stat_weights: { hp: 3, atk: 1, def: 2, spd: 3, sp_atk: 4, sp_def: 4 }, weapons: ['flask', 'mortar', 'tome'], desc: 'Support class focused on buffs, debuffs, healing over time, and status effects.' },
    Cleric:       { role: 'support', icon: '\u271A',     stat_weights: { hp: 4, atk: 1, def: 3, spd: 2, sp_atk: 4, sp_def: 4 }, weapons: ['mace', 'holy_symbol', 'staff'], desc: 'Primary healer and support class with purification and resurrection abilities.' },
    Ambrosian:    { role: 'support', icon: '\u2728',     stat_weights: { hp: 4, atk: 1, def: 3, spd: 2, sp_atk: 3, sp_def: 5 }, weapons: ['relic', 'chalice', 'scepter'], desc: 'Specialized support class with unique soul-linking, shielding, and revival mechanics.' },
    Assassin:     { role: 'melee',   icon: '\u{1F5E1}', stat_weights: { hp: 2, atk: 5, def: 1, spd: 5, sp_atk: 1, sp_def: 1 }, weapons: ['dagger', 'shortsword', 'poison_blade'], desc: 'High-damage stealth-based melee class focused on critical strikes and target elimination.' },
    Monk:         { role: 'melee',   icon: '\u{1F91C}', stat_weights: { hp: 3, atk: 4, def: 2, spd: 5, sp_atk: 1, sp_def: 2 }, weapons: ['fist', 'bo_staff', 'nunchaku'], desc: 'Agile melee fighter focused on speed, evasion, and rapid multi-hit attacks.' },
    Crossbow:     { role: 'ranged',  icon: '\u{1F3AF}', stat_weights: { hp: 2, atk: 5, def: 2, spd: 3, sp_atk: 1, sp_def: 2 }, weapons: ['crossbow', 'heavy_crossbow', 'repeater'], desc: 'Ranged attacker with high single-target damage and armor-piercing bolts.' },
    Handgunner:   { role: 'ranged',  icon: '\u{1F52B}', stat_weights: { hp: 2, atk: 5, def: 2, spd: 3, sp_atk: 2, sp_def: 2 }, weapons: ['pistol', 'musket', 'blunderbuss'], desc: 'Ranged attacker using early firearms with burst damage and crowd control.' },
    Siegebreaker: { role: 'melee',   icon: '\u{1F528}', stat_weights: { hp: 5, atk: 5, def: 3, spd: 1, sp_atk: 1, sp_def: 2 }, weapons: ['battering_ram', 'maul', 'siege_hammer'], desc: 'Heavy melee class designed to break through defensive lines with massive knockback.' },
    Paladin:      { role: 'melee',   icon: '\u{1F6E1}', stat_weights: { hp: 4, atk: 3, def: 5, spd: 2, sp_atk: 2, sp_def: 4 }, weapons: ['longsword', 'shield', 'holy_mace'], desc: 'Tanky melee fighter with defensive support abilities, auras, and holy damage.' },
};

const ROLE_COLORS = {
    melee:   '#d97350',
    ranged:  '#50b3d9',
    support: '#66d980',
    hybrid:  '#d9c050',
};

// -- Slot type icons for equipment -----------------------------------------------

const SLOT_ICONS = {
    weapon:  '\u2694',
    helmet:  '\u26D1',
    chest:   '\u{1F6E1}',
    legs:    '\u{1F456}',
    boots:   '\u{1F462}',
    gloves:  '\u{1F9E4}',
    ring:    '\u{1F48D}',
    amulet:  '\u{1F4FF}',
    crystal: '\u{1F48E}',
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
        minHeight: opts.minHeight || '0',
        textAlign: 'center',
        transition: 'background 0.15s, transform 0.1s',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
    });

    btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.15)'; });
    btn.addEventListener('mouseleave', () => { btn.style.filter = ''; btn.style.transform = ''; });
    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.97)'; });
    btn.addEventListener('mouseup', () => { btn.style.transform = ''; });

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
        const backBtn = createButton('<  Back', 'rgba(35,35,55,1)', { fontSize: '14px', padding: '8px 14px', minHeight: '44px' });
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

// -- Helper: Capitalize words ---------------------------------------------------

function capitalizeWords(str) {
    return str
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

// -- Helper: Create element badge -----------------------------------------------

function createElementBadge(elementName, opts = {}) {
    const badge = document.createElement('span');
    badge.textContent = elementName;
    const color = ELEMENT_COLORS[elementName] || '#aaa';
    Object.assign(badge.style, {
        display: 'inline-block',
        padding: opts.padding || '2px 8px',
        borderRadius: '10px',
        background: hexToRgba(color, 0.2),
        color: color,
        fontSize: opts.fontSize || '12px',
        fontWeight: 'bold',
        lineHeight: '1.4',
        cursor: opts.clickable ? 'pointer' : 'default',
        border: opts.selected ? `2px solid ${color}` : '2px solid transparent',
        transition: 'border 0.15s, background 0.15s',
    });
    return badge;
}

// -- Helper: Hex to RGBA -------------------------------------------------------

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// -- Helper: Draw sprite preview on canvas -------------------------------------

function drawSpritePreview(canvas, raceId, elementName) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const size = canvas.width;

    // Use HumanoidSpriteSystem to render if available
    try {
        // Create a mock sprite instance with the selected element
        const mockInst = {
            raceId: raceId,
            race_id: raceId,
            evolutionStage: 1,
            evolution_stage: 1,
            element_types: [elementName],
            elementTypes: [elementName],
            level: 1,
            equipment: {},
        };

        // Draw the frame using HumanoidSpriteSystem (chibi sized)
        const spriteSize = size * 0.9;
        HumanoidSpriteSystem.drawFrame(ctx, raceId, 1, 0, 0, (size - spriteSize) / 2, (size - spriteSize) / 2, spriteSize);
    } catch (e) {
        // Fallback: draw a colored circle with race initial
        const race = SPRITE_RACES.find(r => r.race_id === raceId);
        const elemColor = ELEMENT_COLORS[elementName] || '#888';

        // Background glow
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, hexToRgba(elemColor, 0.4));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Circle
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(elemColor, 0.3);
        ctx.fill();
        ctx.strokeStyle = elemColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Race initial
        ctx.fillStyle = COLORS.textPrimary;
        ctx.font = `bold ${Math.floor(size * 0.35)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(race ? race.race_name.charAt(0) : '?', size / 2, size / 2);
    }

    // Draw element indicator dot at bottom
    const elemColor = ELEMENT_COLORS[elementName] || '#888';
    ctx.beginPath();
    ctx.arc(size / 2, size - 6, 4, 0, Math.PI * 2);
    ctx.fillStyle = elemColor;
    ctx.fill();
}

// ================================================================================
// GlossaryScreen
// ================================================================================

export class GlossaryScreen {
    /**
     * @param {Object} [deps]
     * @param {Object} [deps.screenManager]
     * @param {Object} [deps.engine]
     */
    constructor(deps = {}) {
        this._screenManager = deps.screenManager || null;
        this._engine = deps.engine || null;
        this._onBack = deps.onBack || null;

        /** @private */
        this._activeTab = 'races';
        /** @private */
        this._contentArea = null;
        /** @private */
        this._tabButtons = {};
        /** @private */
        this._equipmentFilter = 'all';
        /** @private */
        this._equipFilterButtons = {};
        /** @private */
        this._equipListContainer = null;
        /** @private — tracks selected element per race for sprite display */
        this._raceSelectedElement = {};
    }

    /**
     * Build and return the glossary screen DOM element.
     * @param {Object} [params]
     * @returns {HTMLElement}
     */
    build(params = {}) {
        const screen = document.createElement('div');
        screen.className = 'glossary-screen';
        Object.assign(screen.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: COLORS.bgDark,
            color: COLORS.textPrimary,
            fontFamily: 'sans-serif',
        });

        // Top bar with back button
        screen.appendChild(createTopBar('Glossary', () => this._onBackPressed()));

        // Tab bar
        screen.appendChild(this._buildTabBar());

        // Scrollable content area
        this._contentArea = document.createElement('div');
        Object.assign(this._contentArea.style, {
            flex: '1',
            overflowY: 'auto',
            padding: '12px 16px',
            WebkitOverflowScrolling: 'touch',
        });
        screen.appendChild(this._contentArea);

        // Render the default tab
        this._renderActiveTab();

        return screen;
    }

    // -- Tab Bar ----------------------------------------------------------------

    /** @private */
    _buildTabBar() {
        const tabBar = document.createElement('div');
        Object.assign(tabBar.style, {
            display: 'flex',
            gap: '8px',
            padding: '12px 16px',
            background: COLORS.bgPanel,
            borderBottom: `1px solid ${COLORS.border}`,
            flexShrink: '0',
        });

        const tabs = [
            { key: 'races', label: 'Races' },
            { key: 'classes', label: 'Classes' },
            { key: 'equipment', label: 'Equipment' },
        ];

        for (const tab of tabs) {
            const btn = document.createElement('button');
            btn.textContent = tab.label;
            Object.assign(btn.style, {
                flex: '1',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '20px',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer',
                color: COLORS.textPrimary,
                transition: 'background 0.15s, transform 0.1s',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                minHeight: '44px',
            });

            btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.15)'; });
            btn.addEventListener('mouseleave', () => { btn.style.filter = ''; btn.style.transform = ''; });
            btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.97)'; });
            btn.addEventListener('mouseup', () => { btn.style.transform = ''; });

            btn.addEventListener('click', () => {
                this._activeTab = tab.key;
                this._updateTabStyles();
                this._renderActiveTab();
            });

            this._tabButtons[tab.key] = btn;
            tabBar.appendChild(btn);
        }

        this._updateTabStyles();

        return tabBar;
    }

    /** @private */
    _updateTabStyles() {
        for (const [key, btn] of Object.entries(this._tabButtons)) {
            if (key === this._activeTab) {
                btn.style.background = COLORS.accent;
            } else {
                btn.style.background = 'rgba(35,35,55,1)';
            }
        }
    }

    /** @private */
    _renderActiveTab() {
        if (!this._contentArea) return;
        this._contentArea.innerHTML = '';

        switch (this._activeTab) {
            case 'races':
                this._renderRacesTab();
                break;
            case 'classes':
                this._renderClassesTab();
                break;
            case 'equipment':
                this._renderEquipmentTab();
                break;
        }
    }

    // -- Back Navigation --------------------------------------------------------

    /** @private */
    _onBackPressed() {
        if (this._onBack) {
            this._onBack();
        } else if (this._screenManager) {
            this._screenManager.popScreen('slide_right');
        }
    }

    // ============================================================================
    // RACES TAB — with sprite preview and element selection
    // ============================================================================

    /** @private */
    _renderRacesTab() {
        const races = [...SPRITE_RACES].sort((a, b) => a.race_id - b.race_id);

        for (const race of races) {
            // Initialize selected element for this race if not set
            if (!this._raceSelectedElement[race.race_id]) {
                this._raceSelectedElement[race.race_id] = (race.element_types && race.element_types.length > 0)
                    ? race.element_types[0]
                    : 'Fire';
            }

            const card = document.createElement('div');
            Object.assign(card.style, {
                background: COLORS.bgCard,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '10px',
            });

            // Top section: sprite preview + info
            const topRow = document.createElement('div');
            Object.assign(topRow.style, {
                display: 'flex',
                gap: '14px',
                marginBottom: '10px',
                alignItems: 'flex-start',
            });

            // Sprite preview canvas
            const previewCanvas = document.createElement('canvas');
            previewCanvas.width = 80;
            previewCanvas.height = 80;
            Object.assign(previewCanvas.style, {
                width: '80px',
                height: '80px',
                flexShrink: '0',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.3)',
                imageRendering: 'pixelated',
            });
            drawSpritePreview(previewCanvas, race.race_id, this._raceSelectedElement[race.race_id]);
            topRow.appendChild(previewCanvas);

            // Info column
            const infoCol = document.createElement('div');
            infoCol.style.flex = '1';

            const nameEl = document.createElement('div');
            nameEl.textContent = race.race_name;
            Object.assign(nameEl.style, {
                fontSize: '18px',
                fontWeight: 'bold',
                color: COLORS.textPrimary,
                marginBottom: '4px',
            });
            infoCol.appendChild(nameEl);

            // Available classes
            const classEl = document.createElement('div');
            classEl.textContent = `Classes: ${race.available_classes ? race.available_classes.length : 0} available`;
            Object.assign(classEl.style, {
                fontSize: '13px',
                color: COLORS.textSecondary,
                marginBottom: '4px',
            });
            infoCol.appendChild(classEl);

            // Rarity badge
            const rarityEl = document.createElement('div');
            rarityEl.textContent = race.rarity.charAt(0).toUpperCase() + race.rarity.slice(1);
            Object.assign(rarityEl.style, {
                fontSize: '13px',
                fontWeight: 'bold',
                color: RARITY_COLORS[race.rarity] || COLORS.textDim,
            });
            infoCol.appendChild(rarityEl);

            topRow.appendChild(infoCol);
            card.appendChild(topRow);

            // Element selector row — scrollable horizontal list
            const elemSelectorLabel = document.createElement('div');
            elemSelectorLabel.textContent = 'Element:';
            Object.assign(elemSelectorLabel.style, {
                fontSize: '12px',
                color: COLORS.textDim,
                marginBottom: '6px',
                fontWeight: 'bold',
            });
            card.appendChild(elemSelectorLabel);

            const elemSelector = document.createElement('div');
            Object.assign(elemSelector.style, {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                marginBottom: '10px',
            });

            const selectedElem = this._raceSelectedElement[race.race_id];
            for (const elem of ALL_ELEMENTS) {
                const isSelected = elem === selectedElem;
                const badge = createElementBadge(elem, {
                    clickable: true,
                    selected: isSelected,
                    fontSize: '11px',
                    padding: '3px 7px',
                });

                badge.addEventListener('click', () => {
                    this._raceSelectedElement[race.race_id] = elem;
                    // Re-draw the canvas
                    drawSpritePreview(previewCanvas, race.race_id, elem);
                    // Update badge selection styles
                    const badges = elemSelector.querySelectorAll('span');
                    for (const b of badges) {
                        const bElem = b.textContent;
                        const bColor = ELEMENT_COLORS[bElem] || '#aaa';
                        if (bElem === elem) {
                            b.style.border = `2px solid ${bColor}`;
                            b.style.background = hexToRgba(bColor, 0.35);
                        } else {
                            b.style.border = '2px solid transparent';
                            b.style.background = hexToRgba(ELEMENT_COLORS[bElem] || '#aaa', 0.2);
                        }
                    }
                });

                elemSelector.appendChild(badge);
            }

            card.appendChild(elemSelector);

            // Stats row
            const statsRow = document.createElement('div');
            Object.assign(statsRow.style, {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '10px',
            });

            for (const [statKey, label] of Object.entries(STAT_LABELS)) {
                const value = race.base_stats[statKey];
                if (value === undefined) continue;

                const statEl = document.createElement('div');
                Object.assign(statEl.style, {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: '44px',
                });

                const labelEl = document.createElement('span');
                labelEl.textContent = label;
                Object.assign(labelEl.style, {
                    fontSize: '11px',
                    color: STAT_COLORS[statKey] || COLORS.textDim,
                    fontWeight: 'bold',
                });

                const valueEl = document.createElement('span');
                valueEl.textContent = value;
                Object.assign(valueEl.style, {
                    fontSize: '15px',
                    color: STAT_COLORS[statKey] || COLORS.textPrimary,
                    fontWeight: 'bold',
                });

                statEl.appendChild(labelEl);
                statEl.appendChild(valueEl);
                statsRow.appendChild(statEl);
            }

            card.appendChild(statsRow);

            // Lore text
            const loreEl = document.createElement('div');
            loreEl.textContent = race.lore_description;
            Object.assign(loreEl.style, {
                fontSize: '14px',
                color: COLORS.textDim,
                lineHeight: '1.5',
                wordWrap: 'break-word',
            });
            card.appendChild(loreEl);

            this._contentArea.appendChild(card);
        }
    }

    // ============================================================================
    // CLASSES TAB — with class icons, stat weights, and abilities
    // ============================================================================

    /** @private */
    _renderClassesTab() {
        const allAbilities = Object.values(ABILITIES);

        // Group by class_affinity
        const classBuckets = {};
        for (const ability of allAbilities) {
            const cls = ability.class_affinity || 'Unknown';
            if (!classBuckets[cls]) {
                classBuckets[cls] = [];
            }
            classBuckets[cls].push(ability);
        }

        // Sort class names alphabetically
        const classNames = Object.keys(classBuckets).sort();

        for (const className of classNames) {
            const abilities = classBuckets[className].sort((a, b) => a.ability_id - b.ability_id);
            const classInfo = CLASS_DATA[className];

            // Section header with class icon
            const sectionHeader = document.createElement('div');
            Object.assign(sectionHeader.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '20px',
                marginBottom: '6px',
                paddingBottom: '6px',
                borderBottom: `1px solid ${COLORS.border}`,
            });

            // Class icon
            if (classInfo) {
                const iconEl = document.createElement('span');
                iconEl.textContent = classInfo.icon;
                Object.assign(iconEl.style, {
                    fontSize: '28px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    flexShrink: '0',
                });
                sectionHeader.appendChild(iconEl);
            }

            const headerTextCol = document.createElement('div');
            headerTextCol.style.flex = '1';

            const nameEl = document.createElement('div');
            nameEl.textContent = className;
            Object.assign(nameEl.style, {
                fontSize: '20px',
                fontWeight: 'bold',
                color: COLORS.textPrimary,
            });
            headerTextCol.appendChild(nameEl);

            // Role badge
            if (classInfo) {
                const roleBadge = document.createElement('span');
                roleBadge.textContent = capitalizeWords(classInfo.role);
                const roleColor = ROLE_COLORS[classInfo.role] || COLORS.textSecondary;
                Object.assign(roleBadge.style, {
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: roleColor,
                    padding: '1px 8px',
                    borderRadius: '8px',
                    background: hexToRgba(roleColor, 0.15),
                });
                headerTextCol.appendChild(roleBadge);
            }

            sectionHeader.appendChild(headerTextCol);
            this._contentArea.appendChild(sectionHeader);

            // Class info card (description, stat weights, weapons)
            if (classInfo) {
                const infoCard = document.createElement('div');
                Object.assign(infoCard.style, {
                    background: 'rgba(30,30,50,0.5)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    marginBottom: '8px',
                });

                // Description
                const descEl = document.createElement('div');
                descEl.textContent = classInfo.desc;
                Object.assign(descEl.style, {
                    fontSize: '13px',
                    color: COLORS.textSecondary,
                    lineHeight: '1.4',
                    marginBottom: '8px',
                });
                infoCard.appendChild(descEl);

                // Stat weights as bars
                const statWeightsRow = document.createElement('div');
                Object.assign(statWeightsRow.style, {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginBottom: '8px',
                });

                for (const [statKey, weight] of Object.entries(classInfo.stat_weights)) {
                    const statEl = document.createElement('div');
                    Object.assign(statEl.style, {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                    });

                    const labelEl = document.createElement('span');
                    labelEl.textContent = STAT_LABELS[statKey] || statKey;
                    labelEl.style.color = STAT_COLORS[statKey] || COLORS.textDim;
                    labelEl.style.fontWeight = 'bold';
                    labelEl.style.width = '42px';
                    statEl.appendChild(labelEl);

                    // Visual bar (5 pips)
                    const barEl = document.createElement('div');
                    Object.assign(barEl.style, {
                        display: 'flex',
                        gap: '2px',
                    });
                    for (let i = 0; i < 5; i++) {
                        const pip = document.createElement('div');
                        const statColor = STAT_COLORS[statKey] || '#888';
                        Object.assign(pip.style, {
                            width: '8px',
                            height: '8px',
                            borderRadius: '2px',
                            background: i < weight ? statColor : 'rgba(40,40,60,0.6)',
                        });
                        barEl.appendChild(pip);
                    }
                    statEl.appendChild(barEl);

                    statWeightsRow.appendChild(statEl);
                }

                infoCard.appendChild(statWeightsRow);

                // Available weapons
                const weaponRow = document.createElement('div');
                Object.assign(weaponRow.style, {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    fontSize: '11px',
                    alignItems: 'center',
                });

                const weaponLabel = document.createElement('span');
                weaponLabel.textContent = 'Weapons:';
                weaponLabel.style.color = COLORS.textDim;
                weaponLabel.style.fontWeight = 'bold';
                weaponRow.appendChild(weaponLabel);

                for (const wep of classInfo.weapons) {
                    const wepBadge = document.createElement('span');
                    wepBadge.textContent = capitalizeWords(wep);
                    Object.assign(wepBadge.style, {
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: 'rgba(50,50,75,0.4)',
                        color: COLORS.textSecondary,
                        fontSize: '11px',
                    });
                    weaponRow.appendChild(wepBadge);
                }

                infoCard.appendChild(weaponRow);
                this._contentArea.appendChild(infoCard);
            }

            // Ability cards
            for (const ability of abilities) {
                const card = document.createElement('div');
                Object.assign(card.style, {
                    background: COLORS.bgCard,
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '8px',
                });

                // Name + element badge + targeting type badge
                const headerRow = document.createElement('div');
                Object.assign(headerRow.style, {
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '8px',
                });

                const abilNameEl = document.createElement('span');
                abilNameEl.textContent = ability.ability_name;
                Object.assign(abilNameEl.style, {
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: COLORS.textPrimary,
                });
                headerRow.appendChild(abilNameEl);

                // Element badge
                if (ability.element_type && ability.element_type !== 'None') {
                    headerRow.appendChild(createElementBadge(ability.element_type));
                }

                // Targeting type badge
                const targetBadge = document.createElement('span');
                targetBadge.textContent = capitalizeWords(ability.targeting_type);
                Object.assign(targetBadge.style, {
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: 'rgba(50,50,75,0.5)',
                    color: COLORS.textSecondary,
                    fontSize: '11px',
                    fontWeight: 'bold',
                });
                headerRow.appendChild(targetBadge);

                card.appendChild(headerRow);

                // Stats row: Power, Accuracy, PP, Physical/Special
                const statsRow = document.createElement('div');
                Object.assign(statsRow.style, {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '8px',
                    fontSize: '13px',
                });

                const statItems = [
                    { label: 'Power', value: ability.base_power, color: STAT_COLORS.atk },
                    { label: 'Accuracy', value: `${Math.round(ability.accuracy * 100)}%`, color: STAT_COLORS.spd },
                    { label: 'PP', value: ability.pp_max, color: STAT_COLORS.hp },
                    { label: 'Type', value: ability.is_physical ? 'Physical' : 'Special', color: ability.is_physical ? STAT_COLORS.atk : STAT_COLORS.sp_atk },
                ];

                for (const item of statItems) {
                    const statEl = document.createElement('span');

                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = `${item.label}: `;
                    labelSpan.style.color = COLORS.textDim;

                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = item.value;
                    valueSpan.style.color = item.color;
                    valueSpan.style.fontWeight = 'bold';

                    statEl.appendChild(labelSpan);
                    statEl.appendChild(valueSpan);
                    statsRow.appendChild(statEl);
                }

                card.appendChild(statsRow);

                // Description
                const abilDescEl = document.createElement('div');
                abilDescEl.textContent = ability.description;
                Object.assign(abilDescEl.style, {
                    fontSize: '14px',
                    color: COLORS.textDim,
                    lineHeight: '1.4',
                    wordWrap: 'break-word',
                });
                card.appendChild(abilDescEl);

                this._contentArea.appendChild(card);
            }
        }
    }

    // ============================================================================
    // EQUIPMENT TAB — with slot type icons and weapon/armor visuals
    // ============================================================================

    /** @private */
    _renderEquipmentTab() {
        // Filter row
        const filterRow = document.createElement('div');
        Object.assign(filterRow.style, {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '14px',
        });

        const allFilterNames = ['all', ...SLOT_TYPES];
        this._equipFilterButtons = {};

        for (const filterName of allFilterNames) {
            const btn = document.createElement('button');
            const icon = SLOT_ICONS[filterName] || '';
            btn.textContent = filterName === 'all' ? 'All' : `${icon} ${capitalizeWords(filterName)}`;
            Object.assign(btn.style, {
                padding: '8px 14px',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                color: COLORS.textPrimary,
                transition: 'background 0.15s, transform 0.1s',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                minHeight: '44px',
            });

            btn.addEventListener('mouseenter', () => { btn.style.filter = 'brightness(1.15)'; });
            btn.addEventListener('mouseleave', () => { btn.style.filter = ''; btn.style.transform = ''; });
            btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.97)'; });
            btn.addEventListener('mouseup', () => { btn.style.transform = ''; });

            btn.addEventListener('click', () => {
                this._equipmentFilter = filterName;
                this._updateEquipFilterStyles();
                this._renderEquipmentList();
            });

            this._equipFilterButtons[filterName] = btn;
            filterRow.appendChild(btn);
        }

        this._contentArea.appendChild(filterRow);

        // Equipment list container
        this._equipListContainer = document.createElement('div');
        this._contentArea.appendChild(this._equipListContainer);

        this._updateEquipFilterStyles();
        this._renderEquipmentList();
    }

    /** @private */
    _updateEquipFilterStyles() {
        for (const [key, btn] of Object.entries(this._equipFilterButtons)) {
            if (key === this._equipmentFilter) {
                btn.style.background = COLORS.accent;
            } else {
                btn.style.background = 'rgba(35,35,55,1)';
            }
        }
    }

    /** @private */
    _renderEquipmentList() {
        if (!this._equipListContainer) return;
        this._equipListContainer.innerHTML = '';

        // Filter
        let items = [...EQUIPMENT];
        if (this._equipmentFilter !== 'all') {
            items = items.filter(eq => eq.slot_type === this._equipmentFilter);
        }

        // Sort by slot_type then level_requirement
        const slotOrder = {};
        SLOT_TYPES.forEach((s, i) => { slotOrder[s] = i; });

        items.sort((a, b) => {
            const slotDiff = (slotOrder[a.slot_type] || 0) - (slotOrder[b.slot_type] || 0);
            if (slotDiff !== 0) return slotDiff;
            return (a.level_requirement || 0) - (b.level_requirement || 0);
        });

        for (const equip of items) {
            const card = document.createElement('div');
            Object.assign(card.style, {
                background: COLORS.bgCard,
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '8px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
            });

            // Slot icon
            const iconContainer = document.createElement('div');
            const slotIcon = SLOT_ICONS[equip.slot_type] || '\u2753';
            const rarityColor = RARITY_COLORS[equip.rarity] || '#888';
            Object.assign(iconContainer.style, {
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: hexToRgba(rarityColor, 0.15),
                border: `1px solid ${hexToRgba(rarityColor, 0.4)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: '0',
            });
            iconContainer.textContent = slotIcon;
            card.appendChild(iconContainer);

            // Info column
            const infoCol = document.createElement('div');
            infoCol.style.flex = '1';
            infoCol.style.minWidth = '0';

            // Name (colored by rarity)
            const nameEl = document.createElement('div');
            nameEl.textContent = equip.equipment_name;
            Object.assign(nameEl.style, {
                fontSize: '16px',
                fontWeight: 'bold',
                color: RARITY_COLORS[equip.rarity] || COLORS.textPrimary,
                marginBottom: '4px',
            });
            infoCol.appendChild(nameEl);

            // Slot type + Rarity stars
            const metaRow = document.createElement('div');
            Object.assign(metaRow.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '6px',
                fontSize: '13px',
            });

            const slotEl = document.createElement('span');
            slotEl.textContent = capitalizeWords(equip.slot_type);
            slotEl.style.color = COLORS.textSecondary;
            metaRow.appendChild(slotEl);

            const starsEl = document.createElement('span');
            const starCount = RARITY_STARS[equip.rarity] || 1;
            starsEl.textContent = '\u2605'.repeat(starCount);
            starsEl.style.color = RARITY_COLORS[equip.rarity] || COLORS.textDim;
            starsEl.style.letterSpacing = '2px';
            metaRow.appendChild(starsEl);

            infoCol.appendChild(metaRow);

            // Stat bonuses (only non-zero)
            const bonuses = equip.stat_bonuses || {};
            const nonZeroStats = Object.entries(bonuses).filter(([, v]) => v !== 0);

            if (nonZeroStats.length > 0) {
                const bonusRow = document.createElement('div');
                Object.assign(bonusRow.style, {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '6px',
                    fontSize: '13px',
                });

                for (const [statKey, value] of nonZeroStats) {
                    const statEl = document.createElement('span');

                    const labelSpan = document.createElement('span');
                    labelSpan.textContent = `${STAT_LABELS[statKey] || statKey}: `;
                    labelSpan.style.color = COLORS.textDim;

                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = value > 0 ? `+${value}` : `${value}`;
                    valueSpan.style.color = STAT_COLORS[statKey] || COLORS.textPrimary;
                    valueSpan.style.fontWeight = 'bold';

                    statEl.appendChild(labelSpan);
                    statEl.appendChild(valueSpan);
                    bonusRow.appendChild(statEl);
                }

                infoCol.appendChild(bonusRow);
            }

            // Synergies (element + class)
            const synergies = [];
            if (equip.element_synergy && equip.element_synergy !== '') {
                synergies.push({ label: 'Element', value: equip.element_synergy, color: ELEMENT_COLORS[equip.element_synergy] || COLORS.textSecondary });
            }
            if (equip.class_synergy && equip.class_synergy !== '') {
                synergies.push({ label: 'Class', value: equip.class_synergy, color: COLORS.accent });
            }

            if (synergies.length > 0) {
                const synergyRow = document.createElement('div');
                Object.assign(synergyRow.style, {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '6px',
                    fontSize: '13px',
                });

                for (const syn of synergies) {
                    const synEl = document.createElement('span');

                    const synLabel = document.createElement('span');
                    synLabel.textContent = `${syn.label} Synergy: `;
                    synLabel.style.color = COLORS.textDim;

                    const synValue = document.createElement('span');
                    synValue.textContent = syn.value;
                    synValue.style.color = syn.color;
                    synValue.style.fontWeight = 'bold';

                    synEl.appendChild(synLabel);
                    synEl.appendChild(synValue);
                    synergyRow.appendChild(synEl);
                }

                infoCol.appendChild(synergyRow);
            }

            // Level req + Source
            const reqRow = document.createElement('div');
            Object.assign(reqRow.style, {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '6px',
                fontSize: '13px',
            });

            const levelEl = document.createElement('span');
            const lvlLabel = document.createElement('span');
            lvlLabel.textContent = 'Lv. Req: ';
            lvlLabel.style.color = COLORS.textDim;
            const lvlValue = document.createElement('span');
            lvlValue.textContent = equip.level_requirement || 1;
            lvlValue.style.color = COLORS.textSecondary;
            lvlValue.style.fontWeight = 'bold';
            levelEl.appendChild(lvlLabel);
            levelEl.appendChild(lvlValue);
            reqRow.appendChild(levelEl);

            if (equip.source) {
                const sourceEl = document.createElement('span');
                const srcLabel = document.createElement('span');
                srcLabel.textContent = 'Source: ';
                srcLabel.style.color = COLORS.textDim;
                const srcValue = document.createElement('span');
                srcValue.textContent = capitalizeWords(equip.source);
                srcValue.style.color = COLORS.textSecondary;
                sourceEl.appendChild(srcLabel);
                sourceEl.appendChild(srcValue);
                reqRow.appendChild(sourceEl);
            }

            infoCol.appendChild(reqRow);

            // Description
            const descEl = document.createElement('div');
            descEl.textContent = equip.description;
            Object.assign(descEl.style, {
                fontSize: '14px',
                color: COLORS.textDim,
                lineHeight: '1.4',
                wordWrap: 'break-word',
            });
            infoCol.appendChild(descEl);

            card.appendChild(infoCol);
            this._equipListContainer.appendChild(card);
        }

        // Empty state
        if (items.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.textContent = 'No equipment found for this slot type.';
            Object.assign(emptyEl.style, {
                textAlign: 'center',
                color: COLORS.textDim,
                fontSize: '15px',
                padding: '40px 16px',
            });
            this._equipListContainer.appendChild(emptyEl);
        }
    }
}

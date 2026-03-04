/**
 * GlossaryScreen - Tabbed glossary UI with Races, Classes, and Equipment sections.
 * Provides a read-only reference for all game data, designed for mobile-first layout.
 *
 * Data sources:
 *   - SPRITE_RACES from SpriteData.js (24 races)
 *   - ABILITIES from AbilityData.js (160 abilities, keyed by ability_id)
 *   - EQUIPMENT, SLOT_TYPES, RARITY_TIERS from EquipmentData.js (144 items)
 *
 * Follows the same DOM-building patterns as MenuScreens.js.
 */
import { SPRITE_RACES } from '../../data/SpriteData.js';
import { ABILITIES } from '../../data/AbilityData.js';
import { EQUIPMENT, SLOT_TYPES } from '../../data/EquipmentData.js';

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
    Air:      '#b3e6ff', Light:    '#ffff99', Dark:     '#804dbb',
    Nature:   '#4dcc4d', Electric: '#ffe633', Ice:      '#99e6ff',
    Metal:    '#b3b3bf', Poison:   '#b34dcc', Psychic:  '#ff80cc',
    Spirit:   '#99cce6', Chaos:    '#e63366',
};

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

function createElementBadge(elementName) {
    const badge = document.createElement('span');
    badge.textContent = elementName;
    const color = ELEMENT_COLORS[elementName] || '#aaa';
    Object.assign(badge.style, {
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '10px',
        background: hexToRgba(color, 0.2),
        color: color,
        fontSize: '12px',
        fontWeight: 'bold',
        lineHeight: '1.4',
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
    // RACES TAB
    // ============================================================================

    /** @private */
    _renderRacesTab() {
        const races = [...SPRITE_RACES].sort((a, b) => a.race_id - b.race_id);

        for (const race of races) {
            const card = document.createElement('div');
            Object.assign(card.style, {
                background: COLORS.bgCard,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '10px',
            });

            // Header row: race name + element badges
            const header = document.createElement('div');
            Object.assign(header.style, {
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px',
            });

            const nameEl = document.createElement('div');
            nameEl.textContent = race.race_name;
            Object.assign(nameEl.style, {
                fontSize: '18px',
                fontWeight: 'bold',
                color: COLORS.textPrimary,
            });
            header.appendChild(nameEl);

            for (const elem of race.element_types) {
                header.appendChild(createElementBadge(elem));
            }

            card.appendChild(header);

            // Class type
            const classEl = document.createElement('div');
            classEl.textContent = `Class: ${race.class_type}`;
            Object.assign(classEl.style, {
                fontSize: '14px',
                color: COLORS.textSecondary,
                marginBottom: '10px',
            });
            card.appendChild(classEl);

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

            // Rarity badge
            const rarityEl = document.createElement('div');
            rarityEl.textContent = race.rarity.charAt(0).toUpperCase() + race.rarity.slice(1);
            Object.assign(rarityEl.style, {
                fontSize: '13px',
                fontWeight: 'bold',
                color: RARITY_COLORS[race.rarity] || COLORS.textDim,
                marginBottom: '8px',
            });
            card.appendChild(rarityEl);

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
    // CLASSES TAB
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

            // Section header
            const sectionHeader = document.createElement('div');
            sectionHeader.textContent = className;
            Object.assign(sectionHeader.style, {
                fontSize: '20px',
                fontWeight: 'bold',
                color: COLORS.textPrimary,
                marginTop: '20px',
                marginBottom: '10px',
                paddingBottom: '6px',
                borderBottom: `1px solid ${COLORS.border}`,
            });
            this._contentArea.appendChild(sectionHeader);

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

                const nameEl = document.createElement('span');
                nameEl.textContent = ability.ability_name;
                Object.assign(nameEl.style, {
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: COLORS.textPrimary,
                });
                headerRow.appendChild(nameEl);

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
                const descEl = document.createElement('div');
                descEl.textContent = ability.description;
                Object.assign(descEl.style, {
                    fontSize: '14px',
                    color: COLORS.textDim,
                    lineHeight: '1.4',
                    wordWrap: 'break-word',
                });
                card.appendChild(descEl);

                this._contentArea.appendChild(card);
            }
        }
    }

    // ============================================================================
    // EQUIPMENT TAB
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
            btn.textContent = filterName === 'all' ? 'All' : capitalizeWords(filterName);
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
            });

            // Name (colored by rarity)
            const nameEl = document.createElement('div');
            nameEl.textContent = equip.equipment_name;
            Object.assign(nameEl.style, {
                fontSize: '16px',
                fontWeight: 'bold',
                color: RARITY_COLORS[equip.rarity] || COLORS.textPrimary,
                marginBottom: '4px',
            });
            card.appendChild(nameEl);

            // Slot type + Rarity stars
            const metaRow = document.createElement('div');
            Object.assign(metaRow.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px',
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

            card.appendChild(metaRow);

            // Stat bonuses (only non-zero)
            const bonuses = equip.stat_bonuses || {};
            const nonZeroStats = Object.entries(bonuses).filter(([, v]) => v !== 0);

            if (nonZeroStats.length > 0) {
                const bonusRow = document.createElement('div');
                Object.assign(bonusRow.style, {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '8px',
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

                card.appendChild(bonusRow);
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
                    marginBottom: '8px',
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

                card.appendChild(synergyRow);
            }

            // Level req + Source
            const reqRow = document.createElement('div');
            Object.assign(reqRow.style, {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '8px',
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

            card.appendChild(reqRow);

            // Description
            const descEl = document.createElement('div');
            descEl.textContent = equip.description;
            Object.assign(descEl.style, {
                fontSize: '14px',
                color: COLORS.textDim,
                lineHeight: '1.4',
                wordWrap: 'break-word',
            });
            card.appendChild(descEl);

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

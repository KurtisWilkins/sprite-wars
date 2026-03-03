/**
 * SpriteInspectPanel — Shared, tabbed inspect panel for Sprite units.
 *
 * Renders a DOM side-panel with tabs: Stats, Abilities, Equip, Evo.
 * Used by DeploymentScene (tap roster / grid unit) and RTSBattleScene
 * (tap any unit on the battlefield).
 *
 * Usage:
 *   const panel = new SpriteInspectPanel();
 *   panel.show(parentEl, unitData, options);
 *   panel.hide();
 */

import { HumanoidSpriteSystem } from '../rendering/HumanoidSpriteSystem.js';
import { SPRITE_RACES, EVOLUTION_FORMS } from '../../data/SpriteData.js';
import { ABILITIES } from '../../data/AbilityData.js';
import { EQUIPMENT } from '../../data/EquipmentData.js';

// ── Colors ──────────────────────────────────────────────────────────────────

const ELEMENT_COLORS = {
    Fire: '#ff5533', Water: '#3399ff', Earth: '#996633', Air: '#88ccaa',
    Electric: '#ffcc00', Ice: '#99ddff', Nature: '#33aa33', Poison: '#aa33aa',
    Light: '#ffee99', Dark: '#553366', Metal: '#aaaacc', Psychic: '#ff66aa',
    Chaos: '#ff8833', Spirit: '#ccccff',
};

const STAT_COLORS = {
    hp:     '#33cc66',
    atk:    '#ff6644',
    def:    '#4488ff',
    sp_atk: '#ff66aa',
    sp_def: '#66aaff',
    spd:    '#66ffcc',
};

const STAT_LABELS = {
    hp:     'HP',
    atk:    'ATK',
    def:    'DEF',
    sp_atk: 'SP.ATK',
    sp_def: 'SP.DEF',
    spd:    'SPD',
};

const RARITY_COLORS = {
    common:    '#888888',
    uncommon:  '#33cc66',
    rare:      '#3399ff',
    epic:      '#aa44ff',
    legendary: '#ffaa00',
};

const STAGE_NAMES = { 1: 'Hatchling', 2: 'Evolved', 3: 'Ascended' };

const SLOT_ICONS = {
    helmet: '\u26D1', weapon: '\u2694', chest: '\uD83D\uDEE1',
    gloves: '\uD83E\uDDE4', legs: '\uD83D\uDC56', boots: '\uD83D\uDC62',
    ring: '\uD83D\uDC8D', amulet: '\uD83D\uDCFF', crystal: '\uD83D\uDC8E',
};

// ── Stat bar max reference (for bar width scaling) ──────────────────────────
const STAT_MAX_REFERENCE = 200;

// ════════════════════════════════════════════════════════════════════════════
// SpriteInspectPanel
// ════════════════════════════════════════════════════════════════════════════

export class SpriteInspectPanel {

    constructor() {
        /** @type {HTMLElement|null} */
        this._el = null;
        /** @type {string} */
        this._activeTab = 'stats';
        /** @type {object|null} current unit data */
        this._unitData = null;
        /** @type {object} */
        this._options = {};
        /** @type {HTMLElement|null} */
        this._parentEl = null;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Show the inspect panel for a unit.
     *
     * @param {HTMLElement} parentEl - Container to append the panel to
     * @param {object} unitData - Unit data (can be various shapes, normalised internally)
     * @param {object} [options]
     * @param {boolean} [options.isBattleUnit=false] - true if RTSUnit from battle
     * @param {boolean} [options.isEnemy=false]
     * @param {boolean} [options.isDeployed=false]
     * @param {string}  [options.position='right'] - 'left' or 'right'
     * @param {Function} [options.onClose]
     * @param {Function} [options.onRemove] - Deployment: remove from formation
     * @param {Function} [options.onDeposit] - Deployment: deposit to storage
     */
    show(parentEl, unitData, options = {}) {
        this._parentEl = parentEl;
        this._unitData = unitData;
        this._options = options;
        this._activeTab = 'stats';
        this._build();
    }

    /** Remove panel from DOM. */
    hide() {
        if (this._el && this._el.parentNode) {
            this._el.parentNode.removeChild(this._el);
        }
        this._el = null;
    }

    /** Whether the panel is currently visible. */
    get isVisible() {
        return this._el !== null;
    }

    /**
     * Refresh the panel (e.g. when HP changes during battle).
     * Rebuilds content but keeps the current tab.
     */
    refresh() {
        if (!this._el || !this._parentEl || !this._unitData) return;
        const currentTab = this._activeTab;
        this._build();
        this._activeTab = currentTab;
        this._renderTabContent();
    }

    // ── Normalise Unit Data ─────────────────────────────────────────────────

    /** Extract a normalised snapshot from various unit data shapes. */
    _normalise(raw) {
        const opts = this._options;

        // RTSUnit / BattleUnit from battle scene
        if (opts.isBattleUnit) {
            const unit = raw;
            const raceData = SPRITE_RACES.find(r => r.race_id === unit.raceId) || {};
            const elemTypes = unit.elementTypes || raceData.element_types || [];
            return {
                name: unit.getDisplayName ? unit.getDisplayName() : 'Unknown',
                level: unit.getLevel ? unit.getLevel() : (unit.spriteInstance && unit.spriteInstance.level) || 1,
                raceId: unit.raceId || 1,
                evolutionStage: unit.evolutionStage || 1,
                elements: elemTypes,
                rarity: raceData.rarity || 'common',
                classType: unit.classType || raceData.class_type || '???',
                hp: unit.currentHp,
                maxHp: unit.maxHp,
                stats: { hp: unit.maxHp, ...(unit.effectiveStats || {}) },
                equipment: unit.equipment || {},
                abilities: unit.equippedAbilities || [],
                isEnemy: unit.team === 1,
                facing: unit.facing || 0,
                raceData,
            };
        }

        // Deployment / roster sprite data (instance + raceData + stageData)
        const inst = raw.instance || raw;
        const raceId = inst.raceId || inst.race_id || 1;
        const raceData = raw.raceData || SPRITE_RACES.find(r => r.race_id === raceId) || {};
        const elemTypes = raceData.element_types || raceData.elementTypes || inst.elementTypes || [];
        const level = inst.level || 1;
        const stage = inst.evolutionStage || inst.evolution_stage
            || (raw.stageData && raw.stageData.stage_number) || 1;

        // Resolve stageData: prefer explicit, then look up from EVOLUTION_FORMS
        let stageData = raw.stageData || null;
        if (!stageData && EVOLUTION_FORMS) {
            const formId = inst.formId || inst.form_id || (raceId * 3 - 2 + (stage - 1));
            stageData = EVOLUTION_FORMS[formId] || {};
        }
        if (!stageData) stageData = {};

        let stats = {};
        if (inst.calculateAllEffectiveStats && raceData.base_stats && stageData.stat_multipliers) {
            stats = inst.calculateAllEffectiveStats(raceData, stageData);
        } else if (raceData.base_stats) {
            // Fallback: compute stats manually with stage multipliers
            const keys = ['hp', 'atk', 'def', 'spd', 'sp_atk', 'sp_def'];
            for (const key of keys) {
                const base = (raceData.base_stats[key] || 10);
                const growth = (raceData.growth_rates && raceData.growth_rates[key]) || 1;
                const mult = (stageData.stat_multipliers && stageData.stat_multipliers[key]) || 1;
                stats[key] = Math.max(1, Math.floor((base + growth * level) * mult));
            }
        }

        // Resolve abilities: prefer enriched data, then fall back to instance's equipped abilities
        let abilities = raw.abilities || [];
        if (abilities.length === 0 && inst.equippedAbilities) {
            abilities = inst.equippedAbilities;
        }
        if (abilities.length === 0 && inst.abilities) {
            abilities = inst.abilities;
        }

        return {
            name: inst.nickname || raceData.race_name || `Sprite #${raceId}`,
            level,
            raceId,
            evolutionStage: stage,
            elements: elemTypes,
            rarity: raceData.rarity || 'common',
            classType: raceData.class_type || '???',
            hp: stats.hp || 0,
            maxHp: stats.hp || 0,
            stats,
            equipment: inst.equipment || {},
            abilities,
            isEnemy: !!opts.isEnemy,
            facing: 0,
            raceData,
        };
    }

    // ── Build the DOM ───────────────────────────────────────────────────────

    _build() {
        this.hide();

        const d = this._normalise(this._unitData);
        const position = this._options.position || 'right';

        // ── Root container ──
        const el = document.createElement('div');
        el.className = 'sprite-inspect-panel';
        el.style.cssText = `
            width: 280px;
            background: rgba(0, 0, 0, 0.4);
            border-${position === 'right' ? 'left' : 'right'}: 1px solid rgba(255, 255, 255, 0.06);
            overflow-y: auto;
            padding: 10px;
            display: block;
            position: ${this._options.isBattleUnit ? 'absolute' : 'relative'};
            ${this._options.isBattleUnit ? 'top: 60px;' : ''}
            ${position === 'right' ? 'right: 0;' : 'left: 0;'}
            pointer-events: auto;
            max-height: ${this._options.isBattleUnit ? '420px' : '100%'};
            box-sizing: border-box;
            font-family: sans-serif;
            z-index: 20;
        `;

        // ── Close button ──
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '\u2715';
        closeBtn.style.cssText = `
            position: absolute; top: 4px; right: 4px;
            padding: 2px 6px; font-size: 0.7rem;
            border: none; background: none; color: #888;
            cursor: pointer;
        `;
        closeBtn.addEventListener('click', () => {
            if (this._options.onClose) this._options.onClose();
            this.hide();
        });
        el.appendChild(closeBtn);

        // ── Name ──
        const nameEl = document.createElement('div');
        nameEl.style.cssText = `
            font-size: 0.9rem; font-weight: 700;
            color: ${d.isEnemy ? '#ff6655' : '#ffcc33'};
            margin-bottom: 2px;
        `;
        nameEl.textContent = d.name;
        el.appendChild(nameEl);

        // ── Level | Elements ──
        const subEl = document.createElement('div');
        subEl.style.cssText = 'font-size: 0.65rem; color: #aaa; margin-bottom: 8px;';
        subEl.textContent = `Lv${d.level} | ${d.elements.join(' / ') || '???'}`;
        el.appendChild(subEl);

        // ── Sprite preview row ──
        const previewRow = document.createElement('div');
        previewRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;';

        // Canvas
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 72;
        canvas.style.cssText = 'width: 64px; height: 72px; flex-shrink: 0; image-rendering: pixelated;';
        const ctx = canvas.getContext('2d');
        HumanoidSpriteSystem.drawWithEquipment(
            ctx, d.raceId, d.evolutionStage, d.facing, 0,
            32, 60, 48,
            { equipment: d.equipment || {} }
        );
        previewRow.appendChild(canvas);

        // Info col
        const infoCol = document.createElement('div');
        infoCol.style.cssText = 'flex: 1 1 0%; min-width: 0px;';

        // Element • Rarity
        const elemRarity = document.createElement('div');
        elemRarity.style.cssText = 'font-size: 0.6rem; color: #888; font-weight: 600;';
        const rarityLabel = d.rarity.charAt(0).toUpperCase() + d.rarity.slice(1);
        elemRarity.textContent = `${d.classType} \u2022 ${rarityLabel}`;
        infoCol.appendChild(elemRarity);

        // Stage
        const stageEl = document.createElement('div');
        stageEl.style.cssText = 'font-size: 0.55rem; color: #777;';
        stageEl.textContent = `Stage ${d.evolutionStage}/3 \u2022 ${STAGE_NAMES[d.evolutionStage] || 'Unknown'}`;
        infoCol.appendChild(stageEl);

        // HP inline
        const hpInline = document.createElement('div');
        hpInline.style.cssText = 'font-size: 0.55rem; color: #33cc66; margin-top: 2px;';
        hpInline.textContent = `HP: ${d.hp}/${d.maxHp}`;
        infoCol.appendChild(hpInline);

        previewRow.appendChild(infoCol);
        el.appendChild(previewRow);

        // ── Tab Buttons ──
        const tabRow = document.createElement('div');
        tabRow.style.cssText = 'display: flex; gap: 2px; margin-bottom: 8px; flex-wrap: wrap;';
        this._tabRow = tabRow;

        const tabs = ['stats', 'abilities', 'equip', 'evo'];
        const tabLabels = { stats: 'Stats', abilities: 'Abilities', equip: 'Equip', evo: 'Evo' };

        for (const tab of tabs) {
            const btn = document.createElement('button');
            btn.dataset.tab = tab;
            btn.textContent = tabLabels[tab];
            btn.style.cssText = this._tabButtonStyle(tab === this._activeTab);
            btn.addEventListener('click', () => {
                this._activeTab = tab;
                this._renderTabContent();
                this._updateTabStyles();
            });
            tabRow.appendChild(btn);
        }
        el.appendChild(tabRow);

        // ── Tab Content Container ──
        const contentEl = document.createElement('div');
        contentEl.className = 'inspect-tab-content';
        el.appendChild(contentEl);
        this._contentEl = contentEl;

        // ── Action Buttons ──
        const actionsRow = document.createElement('div');
        actionsRow.style.cssText = 'display: flex; gap: 4px; margin-top: 10px; flex-wrap: wrap;';

        if (this._options.onRemove) {
            actionsRow.appendChild(this._makeActionBtn('Remove', '#aa4444', 'rgba(120,30,30,0.3)', '#ffaaaa', this._options.onRemove));
        }
        if (this._options.onDeposit) {
            actionsRow.appendChild(this._makeActionBtn('Deposit', 'rgb(204, 136, 51)', 'rgba(100, 60, 20, 0.3)', 'rgb(204, 170, 102)', this._options.onDeposit));
        }

        if (actionsRow.children.length > 0) {
            el.appendChild(actionsRow);
        }

        // ── Mount ──
        this._el = el;
        this._d = d;
        this._parentEl.appendChild(el);

        // Render initial tab
        this._renderTabContent();
    }

    // ── Tab Styling ─────────────────────────────────────────────────────────

    _tabButtonStyle(isActive) {
        if (isActive) {
            return `
                padding: 3px 8px; font-size: 0.6rem; border-radius: 4px;
                cursor: pointer; border: 1px solid #ffcc33;
                background: rgba(255, 204, 51, 0.1); color: #ffcc33;
                font-family: sans-serif;
            `;
        }
        return `
            padding: 3px 8px; font-size: 0.6rem; border-radius: 4px;
            cursor: pointer; border: 1px solid #444;
            background: transparent; color: #888;
            font-family: sans-serif;
        `;
    }

    _updateTabStyles() {
        if (!this._tabRow) return;
        for (const btn of this._tabRow.children) {
            const isActive = btn.dataset.tab === this._activeTab;
            btn.style.cssText = this._tabButtonStyle(isActive);
        }
    }

    // ── Tab Content Rendering ───────────────────────────────────────────────

    _renderTabContent() {
        if (!this._contentEl || !this._d) return;
        this._contentEl.innerHTML = '';

        switch (this._activeTab) {
            case 'stats':
                this._renderStatsTab(this._contentEl, this._d);
                break;
            case 'abilities':
                this._renderAbilitiesTab(this._contentEl, this._d);
                break;
            case 'equip':
                this._renderEquipTab(this._contentEl, this._d);
                break;
            case 'evo':
                this._renderEvoTab(this._contentEl, this._d);
                break;
        }

        this._updateTabStyles();
    }

    // ── Stats Tab ───────────────────────────────────────────────────────────

    _renderStatsTab(container, d) {
        const statKeys = ['hp', 'atk', 'def', 'sp_atk', 'sp_def', 'spd'];

        for (const key of statKeys) {
            const value = Math.floor(d.stats[key] || 0);
            const color = STAT_COLORS[key] || '#888';
            const label = STAT_LABELS[key] || key.toUpperCase();
            const barPct = Math.min(100, Math.max(0, (value / STAT_MAX_REFERENCE) * 100));

            const row = document.createElement('div');
            row.style.cssText = 'margin-bottom: 4px;';

            // Label + value
            const header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; font-size: 0.6rem; margin-bottom: 1px;';
            header.innerHTML = `
                <span style="color: #888;">${label}</span>
                <span style="color: ${color}; font-weight: 600;">${value}</span>
            `;
            row.appendChild(header);

            // Bar
            const barBg = document.createElement('div');
            barBg.style.cssText = 'width: 100%; height: 4px; background: #1a1a2e; border-radius: 2px; overflow: hidden;';
            const barFill = document.createElement('div');
            barFill.style.cssText = `width: ${barPct}%; height: 100%; background: ${color};`;
            barBg.appendChild(barFill);
            row.appendChild(barBg);

            container.appendChild(row);
        }

        // Extra combat info for battle units
        if (this._options.isBattleUnit && this._unitData) {
            const unit = this._unitData;
            const divider = document.createElement('div');
            divider.style.cssText = 'border-top: 1px solid rgba(255,255,255,0.06); margin: 8px 0 6px;';
            container.appendChild(divider);

            const rangeType = unit.isRanged ? 'Ranged' : 'Melee';
            const rangeColor = unit.isRanged ? '#88ccff' : '#ff8844';

            const combatInfo = document.createElement('div');
            combatInfo.style.cssText = 'font-size: 0.55rem; color: #999;';
            combatInfo.innerHTML = `
                <div style="margin-bottom: 2px;">
                    Type: <span style="color:${rangeColor};font-weight:600">${rangeType}</span>
                    (${unit.attackRange || 0}px range)
                </div>
                <div>Move Speed: <span style="color:#88cc88;font-weight:600">${Math.floor(unit.moveSpeed || 0)}</span></div>
                <div>Atk Cooldown: <span style="color:#ccaa66;font-weight:600">${(unit.attackRate || 0).toFixed(1)}s</span></div>
            `;
            container.appendChild(combatInfo);
        }
    }

    // ── Abilities Tab ───────────────────────────────────────────────────────

    _renderAbilitiesTab(container, d) {
        const abilityIds = d.abilities;

        if (!abilityIds || abilityIds.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'font-size: 0.6rem; color: #666; text-align: center; padding: 12px 0;';
            empty.textContent = 'No abilities learned';
            container.appendChild(empty);
            return;
        }

        for (const abilityOrId of abilityIds) {
            // Could be an ability ID (number) or an ability object
            let ability;
            if (typeof abilityOrId === 'number') {
                ability = ABILITIES[abilityOrId];
            } else if (abilityOrId && abilityOrId.abilityId !== undefined) {
                ability = ABILITIES[abilityOrId.abilityId] || abilityOrId;
            } else if (abilityOrId && abilityOrId.ability_id !== undefined) {
                ability = ABILITIES[abilityOrId.ability_id] || abilityOrId;
            } else {
                ability = abilityOrId;
            }

            if (!ability) continue;

            const aName = ability.ability_name || ability.abilityName || `Ability #${ability.ability_id || ability.abilityId || '?'}`;
            const aElem = ability.element_type || ability.elementType || 'None';
            const elemColor = ELEMENT_COLORS[aElem] || '#888';
            const isPhys = ability.is_physical !== undefined ? ability.is_physical : ability.isPhysical;
            const physLabel = isPhys ? 'Physical' : 'Special';
            const power = ability.base_power || ability.basePower || 0;
            const acc = ability.accuracy || 1;
            const targeting = ability.targeting_type || ability.targetingType || 'single';
            const ppMax = ability.pp_max || ability.ppMax || '?';
            const desc = ability.description || '';

            const card = document.createElement('div');
            card.style.cssText = `
                margin-bottom: 4px; padding: 4px 6px;
                background: rgba(255,255,255,0.04); border-radius: 4px;
                border-left: 2px solid ${elemColor};
            `;

            // Name row
            const nameRow = document.createElement('div');
            nameRow.style.cssText = 'font-size: 0.65rem; font-weight: 700; color: #ddd;';
            nameRow.innerHTML = `<span style="color:${elemColor};">\u25CF</span> ${aName}`;
            card.appendChild(nameRow);

            // Meta row
            const metaRow = document.createElement('div');
            metaRow.style.cssText = 'font-size: 0.5rem; color: #999; margin-top: 1px;';
            let metaStr = `${aElem} | ${physLabel} | ${targeting}`;
            if (power > 0) metaStr += ` | Pwr: ${power}`;
            metaStr += ` | Acc: ${Math.round(acc * 100)}%`;
            metaStr += ` | PP: ${ppMax}`;
            metaRow.textContent = metaStr;
            card.appendChild(metaRow);

            // Description
            if (desc) {
                const descEl = document.createElement('div');
                descEl.style.cssText = 'font-size: 0.5rem; color: #777; margin-top: 2px; font-style: italic;';
                descEl.textContent = desc;
                card.appendChild(descEl);
            }

            // PP remaining (battle units)
            if (this._options.isBattleUnit && this._unitData) {
                const unit = this._unitData;
                const abilityId = ability.ability_id || ability.abilityId;
                const ppRemaining = unit.abilityPp ? (unit.abilityPp[abilityId] ?? '?') : '?';
                const cdRemaining = unit.rtsCooldowns ? (unit.rtsCooldowns[abilityId] || 0) : 0;

                const battleRow = document.createElement('div');
                battleRow.style.cssText = 'font-size: 0.5rem; color: #aaa; margin-top: 2px;';
                let battleStr = `PP: ${ppRemaining}/${ppMax}`;
                if (cdRemaining > 0) {
                    battleStr += ` | CD: ${cdRemaining.toFixed(1)}s`;
                }
                battleRow.textContent = battleStr;
                card.appendChild(battleRow);
            }

            container.appendChild(card);
        }
    }

    // ── Equipment Tab ───────────────────────────────────────────────────────

    _renderEquipTab(container, d) {
        const equipment = d.equipment || {};
        const slots = ['helmet', 'weapon', 'chest', 'gloves', 'legs', 'boots', 'ring', 'amulet', 'crystal'];

        let hasAny = false;

        for (const slot of slots) {
            const eqId = equipment[slot];
            if (!eqId) continue;
            hasAny = true;

            const eqData = typeof eqId === 'object' ? eqId : EQUIPMENT.find(e => e.equipment_id === eqId);
            if (!eqData) continue;

            const rarityColor = RARITY_COLORS[eqData.rarity] || '#888';
            const icon = SLOT_ICONS[slot] || '\u2B24';
            const rarityLabel = (eqData.rarity || 'common').charAt(0).toUpperCase() + (eqData.rarity || 'common').slice(1);

            const row = document.createElement('div');
            row.style.cssText = `
                display: flex; align-items: center; gap: 6px;
                padding: 3px 4px; margin-bottom: 3px;
                background: rgba(255,255,255,0.03); border-radius: 3px;
                border-left: 2px solid ${rarityColor};
            `;

            // Icon
            const iconEl = document.createElement('span');
            iconEl.style.cssText = 'font-size: 0.75rem; width: 20px; text-align: center;';
            iconEl.textContent = icon;
            row.appendChild(iconEl);

            // Info
            const infoEl = document.createElement('div');
            infoEl.style.cssText = 'flex: 1; min-width: 0;';

            const nameEl = document.createElement('div');
            nameEl.style.cssText = `font-size: 0.6rem; font-weight: 600; color: ${rarityColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
            nameEl.textContent = eqData.equipment_name || 'Unknown';
            infoEl.appendChild(nameEl);

            const metaEl = document.createElement('div');
            metaEl.style.cssText = 'font-size: 0.5rem; color: #777;';
            metaEl.textContent = `${slot.charAt(0).toUpperCase() + slot.slice(1)} \u2022 ${rarityLabel}`;
            infoEl.appendChild(metaEl);

            // Stat bonuses
            if (eqData.stat_bonuses) {
                const bonusStrs = [];
                for (const [statKey, val] of Object.entries(eqData.stat_bonuses)) {
                    if (val && val !== 0) {
                        const label = STAT_LABELS[statKey] || statKey;
                        const sign = val > 0 ? '+' : '';
                        bonusStrs.push(`${label} ${sign}${val}`);
                    }
                }
                if (bonusStrs.length > 0) {
                    const bonusEl = document.createElement('div');
                    bonusEl.style.cssText = 'font-size: 0.45rem; color: #66aa66; margin-top: 1px;';
                    bonusEl.textContent = bonusStrs.join(', ');
                    infoEl.appendChild(bonusEl);
                }
            }

            row.appendChild(infoEl);
            container.appendChild(row);
        }

        if (!hasAny) {
            const empty = document.createElement('div');
            empty.style.cssText = 'font-size: 0.6rem; color: #666; text-align: center; padding: 12px 0;';
            empty.textContent = 'No equipment';
            container.appendChild(empty);
        }
    }

    // ── Evolution Tab ───────────────────────────────────────────────────────

    _renderEvoTab(container, d) {
        const raceData = d.raceData;
        const currentStage = d.evolutionStage;

        // Show evolution chain
        const chainEl = document.createElement('div');
        chainEl.style.cssText = 'margin-bottom: 8px;';

        const chainHeader = document.createElement('div');
        chainHeader.style.cssText = 'font-size: 0.6rem; color: #888; font-weight: 600; margin-bottom: 4px;';
        chainHeader.textContent = 'Evolution Chain';
        chainEl.appendChild(chainHeader);

        const chain = raceData.evolution_chain || [];
        for (let i = 0; i < 3; i++) {
            const formId = chain[i] || (d.raceId * 3 - 2 + i);
            const form = EVOLUTION_FORMS ? EVOLUTION_FORMS[formId] : null;
            const stageNum = i + 1;
            const isCurrent = stageNum === currentStage;
            const isLocked = stageNum > currentStage;
            const stageName = STAGE_NAMES[stageNum] || `Stage ${stageNum}`;

            const stageRow = document.createElement('div');
            stageRow.style.cssText = `
                display: flex; align-items: center; gap: 8px;
                padding: 4px 6px; margin-bottom: 2px;
                background: ${isCurrent ? 'rgba(255, 204, 51, 0.1)' : 'rgba(255,255,255,0.02)'};
                border: 1px solid ${isCurrent ? 'rgba(255, 204, 51, 0.3)' : 'rgba(255,255,255,0.05)'};
                border-radius: 4px;
                opacity: ${isLocked ? '0.5' : '1'};
            `;

            // Mini sprite preview
            const miniCanvas = document.createElement('canvas');
            miniCanvas.width = 32;
            miniCanvas.height = 36;
            miniCanvas.style.cssText = 'width: 32px; height: 36px; image-rendering: pixelated;';
            const mCtx = miniCanvas.getContext('2d');
            HumanoidSpriteSystem.drawWithEquipment(
                mCtx, d.raceId, stageNum, 0, 0,
                16, 30, 24,
                { equipment: {} }
            );
            stageRow.appendChild(miniCanvas);

            // Stage info
            const stageInfo = document.createElement('div');
            stageInfo.style.cssText = 'flex: 1;';

            const stageLabel = document.createElement('div');
            stageLabel.style.cssText = `font-size: 0.6rem; font-weight: 600; color: ${isCurrent ? '#ffcc33' : '#aaa'};`;
            stageLabel.textContent = `${stageName} ${'★'.repeat(stageNum)}`;
            stageInfo.appendChild(stageLabel);

            // Evolution trigger
            if (form) {
                const triggerDesc = form.evolution_trigger_description || '';
                if (triggerDesc && stageNum > 1) {
                    const triggerEl = document.createElement('div');
                    triggerEl.style.cssText = 'font-size: 0.5rem; color: #777;';
                    triggerEl.textContent = triggerDesc;
                    stageInfo.appendChild(triggerEl);
                }

                // Stat multipliers preview
                if (form.stat_multipliers) {
                    const multStrs = [];
                    for (const [key, val] of Object.entries(form.stat_multipliers)) {
                        if (val && val !== 1) {
                            const label = STAT_LABELS[key] || key;
                            multStrs.push(`${label} x${val}`);
                        }
                    }
                    if (multStrs.length > 0) {
                        const multEl = document.createElement('div');
                        multEl.style.cssText = 'font-size: 0.45rem; color: #66aaff; margin-top: 1px;';
                        multEl.textContent = multStrs.join(', ');
                        stageInfo.appendChild(multEl);
                    }
                }
            }

            if (isCurrent) {
                const currentBadge = document.createElement('span');
                currentBadge.style.cssText = 'font-size: 0.45rem; color: #ffcc33; font-weight: 700;';
                currentBadge.textContent = ' (Current)';
                stageLabel.appendChild(currentBadge);
            }

            stageRow.appendChild(stageInfo);
            container.appendChild(stageRow);

            // Arrow between stages
            if (i < 2) {
                const arrow = document.createElement('div');
                arrow.style.cssText = 'text-align: center; color: #444; font-size: 0.7rem; margin: 1px 0;';
                arrow.textContent = '\u25BC';
                container.appendChild(arrow);
            }
        }

        // Lore description
        if (raceData.lore_description) {
            const loreDiv = document.createElement('div');
            loreDiv.style.cssText = 'border-top: 1px solid rgba(255,255,255,0.06); margin-top: 8px; padding-top: 6px;';

            const loreHeader = document.createElement('div');
            loreHeader.style.cssText = 'font-size: 0.55rem; color: #888; font-weight: 600; margin-bottom: 2px;';
            loreHeader.textContent = 'Lore';
            loreDiv.appendChild(loreHeader);

            const loreText = document.createElement('div');
            loreText.style.cssText = 'font-size: 0.5rem; color: #777; font-style: italic; line-height: 1.4;';
            loreText.textContent = raceData.lore_description;
            loreDiv.appendChild(loreText);

            container.appendChild(loreDiv);
        }
    }

    // ── Action Button Helper ────────────────────────────────────────────────

    _makeActionBtn(label, borderColor, bgColor, textColor, onClick) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = `
            padding: 4px 8px; font-size: 0.6rem;
            border: 1px solid ${borderColor}; border-radius: 4px;
            background: ${bgColor}; color: ${textColor};
            cursor: pointer; font-family: sans-serif;
        `;
        btn.addEventListener('click', onClick);
        return btn;
    }
}

export default SpriteInspectPanel;

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

import { eventBus, GameEvents } from '../../core/EventBus.js';
import { HumanoidSpriteSystem } from '../rendering/HumanoidSpriteSystem.js';
import { SPRITE_RACES, EVOLUTION_FORMS } from '../../data/SpriteData.js';
import { ABILITIES } from '../../data/AbilityData.js';
import { EQUIPMENT, findEquipmentWithExpansion } from '../../data/EquipmentData.js';
import { getRaceSpritePath } from '../../data/SpriteTextureHelper.js';

// ── Colors ──────────────────────────────────────────────────────────────────

const ELEMENT_COLORS = {
    Fire: '#ff5533', Water: '#3399ff', Plant: '#33aa33', Ice: '#99ddff',
    Wind: '#88ccaa', Earth: '#996633', Electric: '#ffcc00', Dark: '#8844aa',
    Light: '#ffee99', Fairy: '#ff66aa', Solar: '#ffaa33', Lunar: '#8899cc',
    Metal: '#aaaacc', Poison: '#aa33aa',
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
                classType: unit.classType || raceData.class_type || (raceData.available_classes && raceData.available_classes[0]) || 'Fighter',
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
        const elemTypes = inst.elementTypes || inst.element_types || raceData.element_types || [];
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
            classType: inst.classType || inst.class_type || raceData.class_type || (raceData.available_classes && raceData.available_classes[0]) || 'Fighter',
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
            width: 380px;
            background: #1E1533;
            border-${position === 'right' ? 'left' : 'right'}: 3px solid #1A1A1A;
            overflow-y: auto;
            padding: 14px;
            display: block;
            position: ${this._options.isBattleUnit ? 'absolute' : 'relative'};
            ${this._options.isBattleUnit ? 'top: 60px;' : ''}
            ${position === 'right' ? 'right: 0;' : 'left: 0;'}
            pointer-events: auto;
            max-height: ${this._options.isBattleUnit ? '560px' : '100%'};
            box-sizing: border-box;
            font-family: Arial, Helvetica, sans-serif;
            z-index: 20;
        `;

        // ── Close button ──
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '\u2715';
        closeBtn.style.cssText = `
            position: absolute; top: 6px; right: 6px;
            padding: 4px 8px; font-size: 0.85rem;
            border: 2px solid #1A1A1A; border-radius: 4px;
            background: #3D3060; color: #FFFFFF;
            cursor: pointer; font-family: Arial, Helvetica, sans-serif;
        `;
        closeBtn.addEventListener('click', () => {
            if (this._options.onClose) this._options.onClose();
            this.hide();
        });
        el.appendChild(closeBtn);

        // ── Name ──
        const nameEl = document.createElement('div');
        nameEl.style.cssText = `
            font-size: 1.1rem; font-weight: 700;
            color: ${d.isEnemy ? '#ff6655' : '#ffcc33'};
            margin-bottom: 4px;
        `;
        nameEl.textContent = d.name;
        el.appendChild(nameEl);

        // ── Level | Elements ──
        const subEl = document.createElement('div');
        subEl.style.cssText = 'font-size: 0.8rem; color: #aaa; margin-bottom: 10px;';
        subEl.textContent = `Lv${d.level} | ${d.elements.join(' / ') || '???'}`;
        el.appendChild(subEl);

        // ── Sprite preview row ──
        const previewRow = document.createElement('div');
        previewRow.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 12px;';

        // Canvas container with race sprite background
        const canvasWrap = document.createElement('div');
        canvasWrap.style.cssText = 'position: relative; width: 160px; height: 180px; flex-shrink: 0; overflow: hidden;';

        // Race sprite PNG portrait (primary display)
        const racePath = getRaceSpritePath(d.raceId, Math.max(0, d.evolutionStage - 1));
        if (racePath) {
            const racePortrait = document.createElement('img');
            racePortrait.src = racePath;
            Object.assign(racePortrait.style, {
                position: 'absolute', top: '0', left: '0',
                width: '100%', height: '100%',
                objectFit: 'contain',
                imageRendering: 'pixelated',
                opacity: '1',
                pointerEvents: 'none',
                zIndex: '0',
            });
            racePortrait.onerror = () => { racePortrait.style.display = 'none'; };
            canvasWrap.appendChild(racePortrait);
        }

        // Canvas overlay (equipment rendering on top of PNG)
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 288;
        canvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 160px; height: 180px; z-index: 1;';
        const ctx = canvas.getContext('2d');
        HumanoidSpriteSystem.drawWithEquipment(
            ctx, d.raceId, d.evolutionStage, d.facing, 0,
            128, 230, 210,
            { equipment: d.equipment || {} }
        );
        canvasWrap.appendChild(canvas);
        previewRow.appendChild(canvasWrap);

        // Info col
        const infoCol = document.createElement('div');
        infoCol.style.cssText = 'flex: 1 1 0%; min-width: 0px;';

        // Element • Rarity
        const elemRarity = document.createElement('div');
        elemRarity.style.cssText = 'font-size: 0.75rem; color: #888; font-weight: 600;';
        const rarityLabel = d.rarity.charAt(0).toUpperCase() + d.rarity.slice(1);
        elemRarity.textContent = `${d.classType} \u2022 ${rarityLabel}`;
        infoCol.appendChild(elemRarity);

        // Stage
        const stageEl = document.createElement('div');
        stageEl.style.cssText = 'font-size: 0.7rem; color: #777;';
        stageEl.textContent = `Stage ${d.evolutionStage}/3 \u2022 ${STAGE_NAMES[d.evolutionStage] || 'Unknown'}`;
        infoCol.appendChild(stageEl);

        // HP inline
        const hpInline = document.createElement('div');
        hpInline.style.cssText = 'font-size: 0.7rem; color: #33cc66; margin-top: 3px;';
        hpInline.textContent = `HP: ${d.hp}/${d.maxHp}`;
        infoCol.appendChild(hpInline);

        previewRow.appendChild(infoCol);
        el.appendChild(previewRow);

        // ── Tab Buttons ──
        const tabRow = document.createElement('div');
        tabRow.style.cssText = 'display: flex; gap: 4px; margin-bottom: 10px; flex-wrap: wrap;';
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
        actionsRow.style.cssText = 'display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap;';

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
                padding: 5px 12px; font-size: 0.75rem; border-radius: 6px;
                cursor: pointer; border: 2px solid #1A1A1A;
                background: #4A90D9; color: #FFFFFF;
                font-family: Arial, Helvetica, sans-serif; font-weight: bold;
            `;
        }
        return `
            padding: 5px 12px; font-size: 0.75rem; border-radius: 6px;
            cursor: pointer; border: 2px solid #1A1A1A;
            background: #3D3060; color: #B0B8CC;
            font-family: Arial, Helvetica, sans-serif; font-weight: bold;
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
        // ── Element / Race / Class info block ──
        const infoBlock = document.createElement('div');
        infoBlock.style.cssText = 'margin-bottom: 10px; padding: 6px 8px; background: #2A2050; border-radius: 6px; border: 2px solid #1A1A1A;';

        // Race
        const raceEntry = SPRITE_RACES.find(r => r.race_id === d.raceId);
        const raceName = raceEntry ? raceEntry.race_name : (d.raceData && d.raceData.race_name ? d.raceData.race_name : 'Unknown');
        const raceLine = document.createElement('div');
        raceLine.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-bottom: 4px;';
        const raceTagLabel = document.createElement('span');
        raceTagLabel.style.cssText = 'font-size:0.65rem;color:#666;width:48px;';
        raceTagLabel.textContent = 'RACE';
        raceLine.appendChild(raceTagLabel);
        const raceTagValue = document.createElement('span');
        raceTagValue.style.cssText = 'font-size:0.75rem;color:#ddddee;font-weight:600;';
        raceTagValue.textContent = raceName;
        raceLine.appendChild(raceTagValue);
        infoBlock.appendChild(raceLine);

        // Class
        const classLine = document.createElement('div');
        classLine.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-bottom: 4px;';
        const classTagLabel = document.createElement('span');
        classTagLabel.style.cssText = 'font-size:0.65rem;color:#666;width:48px;';
        classTagLabel.textContent = 'CLASS';
        classLine.appendChild(classTagLabel);
        const classTagValue = document.createElement('span');
        classTagValue.style.cssText = 'font-size:0.75rem;color:#ccbbff;font-weight:600;';
        classTagValue.textContent = d.classType || 'Unknown';
        classLine.appendChild(classTagValue);
        infoBlock.appendChild(classLine);

        // Element
        const elemLine = document.createElement('div');
        elemLine.style.cssText = 'display: flex; align-items: center; gap: 6px;';
        const elemLabelSpan = document.createElement('span');
        elemLabelSpan.style.cssText = 'font-size:0.65rem;color:#666;width:48px;';
        elemLabelSpan.textContent = 'ELEM';
        elemLine.appendChild(elemLabelSpan);
        const elemTagsDiv = document.createElement('div');
        elemTagsDiv.style.cssText = 'display: flex; gap: 3px; flex-wrap: wrap;';
        if (d.elements && d.elements.length > 0) {
            for (const elem of d.elements) {
                const tag = document.createElement('span');
                const color = ELEMENT_COLORS[elem] || '#888';
                tag.style.cssText = `padding:1px 6px;border-radius:8px;font-size:0.65rem;background:${color}33;color:${color};border:1px solid ${color}55;font-weight:600;`;
                tag.textContent = elem;
                elemTagsDiv.appendChild(tag);
            }
        } else {
            const unknownTag = document.createElement('span');
            unknownTag.style.cssText = 'font-size:0.7rem;color:#666;';
            unknownTag.textContent = '???';
            elemTagsDiv.appendChild(unknownTag);
        }
        elemLine.appendChild(elemTagsDiv);
        infoBlock.appendChild(elemLine);

        container.appendChild(infoBlock);

        const statKeys = ['hp', 'atk', 'def', 'sp_atk', 'sp_def', 'spd'];

        for (const key of statKeys) {
            const value = Math.floor(d.stats[key] || 0);
            const color = STAT_COLORS[key] || '#888';
            const label = STAT_LABELS[key] || key.toUpperCase();
            const barPct = Math.min(100, Math.max(0, (value / STAT_MAX_REFERENCE) * 100));

            const row = document.createElement('div');
            row.style.cssText = 'margin-bottom: 6px;';

            // Label + value
            const header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 2px;';
            header.innerHTML = `
                <span style="color: #888;">${label}</span>
                <span style="color: ${color}; font-weight: 600;">${value}</span>
            `;
            row.appendChild(header);

            // Bar
            const barBg = document.createElement('div');
            barBg.style.cssText = 'width: 100%; height: 6px; background: #1A1A2E; border-radius: 3px; overflow: hidden; border: 1px solid #1A1A1A;';
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
            divider.style.cssText = 'border-top: 2px solid #1A1A1A; margin: 8px 0 6px;';
            container.appendChild(divider);

            const rangeType = unit.isRanged ? 'Ranged' : 'Melee';
            const rangeColor = unit.isRanged ? '#88ccff' : '#ff8844';

            const combatInfo = document.createElement('div');
            combatInfo.style.cssText = 'font-size: 0.7rem; color: #999;';
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
            empty.style.cssText = 'font-size: 0.75rem; color: #666; text-align: center; padding: 14px 0;';
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
                margin-bottom: 6px; padding: 6px 10px;
                background: #2A2050; border-radius: 6px;
                border: 2px solid #1A1A1A;
                border-left: 4px solid ${elemColor};
            `;

            // Name row
            const nameRow = document.createElement('div');
            nameRow.style.cssText = 'font-size: 0.8rem; font-weight: 700; color: #ddd;';
            nameRow.innerHTML = `<span style="color:${elemColor};">\u25CF</span> ${aName}`;
            card.appendChild(nameRow);

            // Meta row
            const metaRow = document.createElement('div');
            metaRow.style.cssText = 'font-size: 0.65rem; color: #999; margin-top: 2px;';
            let metaStr = `${aElem} | ${physLabel} | ${targeting}`;
            if (power > 0) metaStr += ` | Pwr: ${power}`;
            metaStr += ` | Acc: ${Math.round(acc * 100)}%`;
            metaStr += ` | PP: ${ppMax}`;
            metaRow.textContent = metaStr;
            card.appendChild(metaRow);

            // Description
            if (desc) {
                const descEl = document.createElement('div');
                descEl.style.cssText = 'font-size: 0.65rem; color: #777; margin-top: 3px; font-style: italic;';
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
                battleRow.style.cssText = 'font-size: 0.65rem; color: #aaa; margin-top: 3px;';
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

        // ── Paper-Doll Visual Layout ────────────────────────────────────
        const paperDoll = document.createElement('div');
        paperDoll.style.cssText = `
            position: relative;
            width: 100%; max-width: 340px; height: 220px;
            margin: 0 auto 12px; border-radius: 8px;
            background: #1A1230;
            border: 3px solid #1A1A1A;
        `;

        // Central sprite preview
        const dollCanvas = document.createElement('canvas');
        dollCanvas.width = 72;
        dollCanvas.height = 84;
        dollCanvas.style.cssText = `
            position: absolute; left: 50%; top: 50%;
            transform: translate(-50%, -50%);
            width: 72px; height: 84px;
        `;
        const dollCtx = dollCanvas.getContext('2d');
        HumanoidSpriteSystem.drawWithEquipment(
            dollCtx, d.raceId, d.evolutionStage, d.facing, 0,
            36, 66, 64,
            { equipment: equipment }
        );
        paperDoll.appendChild(dollCanvas);

        // Slot positions around the paper-doll (absolute positioning)
        const slotLayout = {
            helmet:  { left: '50%', top: '4px',   tx: '-50%', ty: '0' },
            weapon:  { left: '8px', top: '50%',   tx: '0',    ty: '-50%' },
            chest:   { left: '50%', top: '50%',   tx: '-50%', ty: '-50%' },
            gloves:  { left: '8px', top: 'auto',  tx: '0',    ty: '0',   bottom: '40px' },
            legs:    { left: '50%', top: 'auto',   tx: '-50%', ty: '0',   bottom: '40px' },
            boots:   { left: '50%', top: 'auto',   tx: '-50%', ty: '0',   bottom: '4px' },
            ring:    { left: 'auto', top: '50%',  tx: '0',    ty: '-50%', right: '8px' },
            amulet:  { left: 'auto', top: '30%',  tx: '0',    ty: '0',   right: '8px' },
            crystal: { left: 'auto', top: 'auto', tx: '0',    ty: '0',   right: '8px', bottom: '40px' },
        };

        // Adjust chest slot to offset from the center sprite
        slotLayout.chest.left = 'calc(50% + 52px)';
        slotLayout.chest.top = '50%';
        slotLayout.weapon.top = '36%';

        const allSlots = ['helmet', 'weapon', 'chest', 'gloves', 'legs', 'boots', 'ring', 'amulet', 'crystal'];

        for (const slot of allSlots) {
            const pos = slotLayout[slot];
            const eqId = equipment[slot];
            const eqData = eqId ? (typeof eqId === 'object' ? eqId : findEquipmentWithExpansion(eqId)) : null;
            const hasItem = !!eqData;
            const rarityColor = hasItem ? (RARITY_COLORS[eqData.rarity] || '#888') : '#333';
            const icon = SLOT_ICONS[slot] || '\u2B24';

            const slotEl = document.createElement('div');
            slotEl.title = hasItem ? `${eqData.equipment_name} (${slot})` : `${slot.charAt(0).toUpperCase() + slot.slice(1)} - Empty`;
            slotEl.style.cssText = `
                position: absolute;
                width: 40px; height: 40px;
                border-radius: 6px;
                display: flex; align-items: center; justify-content: center;
                font-size: 1.1rem;
                cursor: ${hasItem ? 'pointer' : 'default'};
                transition: border-color 0.2s, background 0.2s, transform 0.15s;
                ${hasItem
                    ? `background: #2A2050; border: 3px solid #1A1A1A;`
                    : 'background: #1A1230; border: 2px dashed #444; opacity: 0.5;'
                }
                ${pos.left !== 'auto' ? `left: ${pos.left};` : ''}
                ${pos.right ? `right: ${pos.right};` : ''}
                ${pos.top !== 'auto' ? `top: ${pos.top};` : ''}
                ${pos.bottom ? `bottom: ${pos.bottom};` : ''}
                transform: translate(${pos.tx}, ${pos.ty});
            `;
            // Use equipment icon image if available, otherwise emoji
            const eqIconPath = hasItem && (eqData.icon_path || eqData.iconPath);
            if (eqIconPath) {
                const eqIconImg = document.createElement('img');
                eqIconImg.src = eqIconPath.replace(/^\.\.\//g, '');
                Object.assign(eqIconImg.style, {
                    width: '100%', height: '100%',
                    objectFit: 'contain',
                    imageRendering: 'crisp-edges',
                });
                eqIconImg.onerror = () => { eqIconImg.style.display = 'none'; slotEl.textContent = icon; };
                slotEl.appendChild(eqIconImg);
            } else {
                slotEl.textContent = icon;
            }

            // Hover effect for equipped items
            if (hasItem) {
                slotEl.addEventListener('mouseenter', () => {
                    slotEl.style.transform = `translate(${pos.tx}, ${pos.ty}) scale(1.12)`;
                    slotEl.style.background = '#332855';
                });
                slotEl.addEventListener('mouseleave', () => {
                    slotEl.style.transform = `translate(${pos.tx}, ${pos.ty})`;
                    slotEl.style.background = '#2A2050';
                });
            }

            paperDoll.appendChild(slotEl);
        }

        container.appendChild(paperDoll);

        // ── Scrollable Equipment List ───────────────────────────────────
        const listHeader = document.createElement('div');
        listHeader.style.cssText = 'font-size: 0.7rem; color: #888; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;';
        const equippedCount = allSlots.filter(s => equipment[s]).length;
        listHeader.textContent = `Equipped Items (${equippedCount}/${allSlots.length})`;
        container.appendChild(listHeader);

        const listContainer = document.createElement('div');
        listContainer.style.cssText = 'max-height: 240px; overflow-y: auto; padding-right: 2px;';

        let hasAny = false;

        for (const slot of allSlots) {
            const eqId = equipment[slot];
            if (!eqId) continue;
            hasAny = true;

            const eqData = typeof eqId === 'object' ? eqId : findEquipmentWithExpansion(eqId);
            if (!eqData) continue;

            const rarityColor = RARITY_COLORS[eqData.rarity] || '#888';
            const icon = SLOT_ICONS[slot] || '\u2B24';
            const rarityLabel = (eqData.rarity || 'common').charAt(0).toUpperCase() + (eqData.rarity || 'common').slice(1);

            const card = document.createElement('div');
            card.style.cssText = `
                padding: 8px 10px; margin-bottom: 6px;
                background: #2A2050; border-radius: 6px;
                border: 2px solid #1A1A1A;
                border-left: 4px solid ${rarityColor};
                transition: background 0.15s;
            `;
            card.addEventListener('mouseenter', () => { card.style.background = '#332855'; });
            card.addEventListener('mouseleave', () => { card.style.background = '#2A2050'; });

            // Top row: icon + name + unequip button
            const topRow = document.createElement('div');
            topRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 4px;';

            const iconEl = document.createElement('span');
            iconEl.style.cssText = 'font-size: 1rem; width: 24px; text-align: center; flex-shrink: 0;';
            iconEl.textContent = icon;
            topRow.appendChild(iconEl);

            const nameEl = document.createElement('div');
            nameEl.style.cssText = `
                flex: 1; min-width: 0;
                font-size: 0.8rem; font-weight: 700;
                color: ${rarityColor};
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            `;
            nameEl.textContent = eqData.equipment_name || 'Unknown';
            topRow.appendChild(nameEl);

            // Unequip button
            const unequipBtn = document.createElement('button');
            unequipBtn.textContent = 'Unequip';
            unequipBtn.style.cssText = `
                padding: 3px 8px; font-size: 0.6rem;
                border: 2px solid #1A1A1A; border-radius: 4px;
                background: #AA3333; color: #FFFFFF;
                cursor: pointer; font-family: Arial, Helvetica, sans-serif;
                font-weight: bold; flex-shrink: 0;
                min-height: 28px; min-width: 52px;
                transition: background 0.15s;
            `;
            unequipBtn.addEventListener('mouseenter', () => {
                unequipBtn.style.background = '#CC4444';
            });
            unequipBtn.addEventListener('mouseleave', () => {
                unequipBtn.style.background = '#AA3333';
            });
            unequipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._handleUnequip(slot);
            });
            topRow.appendChild(unequipBtn);

            card.appendChild(topRow);

            // Slot + rarity meta row
            const metaRow = document.createElement('div');
            metaRow.style.cssText = 'font-size: 0.65rem; color: #777; margin-bottom: 3px;';
            metaRow.innerHTML = `${icon} ${slot.charAt(0).toUpperCase() + slot.slice(1)} &middot; ${rarityLabel}`;
            card.appendChild(metaRow);

            // Stat bonuses in compact row
            if (eqData.stat_bonuses) {
                const statsRow = document.createElement('div');
                statsRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px 8px; margin-bottom: 3px;';

                for (const [statKey, val] of Object.entries(eqData.stat_bonuses)) {
                    if (val && val !== 0) {
                        const statColor = STAT_COLORS[statKey] || '#888';
                        const label = STAT_LABELS[statKey] || statKey;
                        const sign = val > 0 ? '+' : '';
                        const badge = document.createElement('span');
                        badge.style.cssText = `
                            font-size: 0.6rem; font-weight: 600;
                            color: ${statColor};
                            background: ${statColor}18;
                            padding: 1px 5px; border-radius: 3px;
                        `;
                        badge.textContent = `${label} ${sign}${val}`;
                        statsRow.appendChild(badge);
                    }
                }
                if (statsRow.children.length > 0) {
                    card.appendChild(statsRow);
                }
            }

            // Element synergy badge
            const elemSynergy = eqData.element_synergy || '';
            const classSynergy = eqData.class_synergy || '';
            if (elemSynergy || classSynergy) {
                const synergyRow = document.createElement('div');
                synergyRow.style.cssText = 'display: flex; gap: 6px; margin-bottom: 3px;';

                if (elemSynergy) {
                    const elemColor = ELEMENT_COLORS[elemSynergy] || '#888';
                    const elemBadge = document.createElement('span');
                    elemBadge.style.cssText = `
                        font-size: 0.6rem; font-weight: 600;
                        color: ${elemColor}; background: ${elemColor}20;
                        padding: 1px 6px; border-radius: 3px;
                        border: 1px solid ${elemColor}44;
                    `;
                    const mult = eqData.element_synergy_multiplier || 1;
                    elemBadge.textContent = `${elemSynergy} x${mult}`;
                    synergyRow.appendChild(elemBadge);
                }
                if (classSynergy) {
                    const classBadge = document.createElement('span');
                    classBadge.style.cssText = `
                        font-size: 0.6rem; font-weight: 600;
                        color: #ccaa66; background: rgba(204, 170, 102, 0.12);
                        padding: 1px 6px; border-radius: 3px;
                        border: 1px solid rgba(204, 170, 102, 0.3);
                    `;
                    const classMult = eqData.class_synergy_multiplier || 1;
                    classBadge.textContent = `${classSynergy} x${classMult}`;
                    synergyRow.appendChild(classBadge);
                }

                card.appendChild(synergyRow);
            }

            // Description
            if (eqData.description) {
                const descEl = document.createElement('div');
                descEl.style.cssText = 'font-size: 0.6rem; color: #666; font-style: italic; line-height: 1.4;';
                descEl.textContent = eqData.description;
                card.appendChild(descEl);
            }

            listContainer.appendChild(card);
        }

        if (!hasAny) {
            const empty = document.createElement('div');
            empty.style.cssText = 'font-size: 0.75rem; color: #555; text-align: center; padding: 20px 0; font-style: italic;';
            empty.textContent = 'No equipment equipped';
            listContainer.appendChild(empty);
        }

        container.appendChild(listContainer);
    }

    /**
     * Handle unequip action from the equip tab.
     * Emits an event for the game system to process and refreshes the panel.
     * @param {string} slot
     */
    _handleUnequip(slot) {
        const d = this._d;
        if (!d || !d.equipment || !d.equipment[slot]) return;

        // Emit the unequip event for the EquipmentInventorySystem to handle
        if (eventBus) {
            eventBus.emit('equipment_unequip_requested', {
                slot,
                equipmentId: d.equipment[slot],
                unitData: this._unitData,
            });
        }

        // Optimistic UI update: remove from local data and refresh
        delete d.equipment[slot];
        if (this._unitData) {
            const inst = this._unitData.instance || this._unitData;
            if (inst.equipment) {
                delete inst.equipment[slot];
            }
        }
        this._renderTabContent();
    }

    // ── Evolution Tab ───────────────────────────────────────────────────────

    _renderEvoTab(container, d) {
        const raceData = d.raceData;
        const currentStage = d.evolutionStage;

        // Show evolution chain
        const chainEl = document.createElement('div');
        chainEl.style.cssText = 'margin-bottom: 8px;';

        const chainHeader = document.createElement('div');
        chainHeader.style.cssText = 'font-size: 0.75rem; color: #888; font-weight: 600; margin-bottom: 6px;';
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
                background: ${isCurrent ? '#2A2050' : '#1E1533'};
                border: 2px solid ${isCurrent ? '#FFCC33' : '#1A1A1A'};
                border-radius: 6px;
                opacity: ${isLocked ? '0.5' : '1'};
            `;

            // Mini sprite preview
            const miniCanvas = document.createElement('canvas');
            miniCanvas.width = 48;
            miniCanvas.height = 54;
            miniCanvas.style.cssText = 'width: 48px; height: 54px;';
            const mCtx = miniCanvas.getContext('2d');
            HumanoidSpriteSystem.drawWithEquipment(
                mCtx, d.raceId, stageNum, 0, 0,
                24, 44, 42,
                { equipment: {} }
            );
            stageRow.appendChild(miniCanvas);

            // Stage info
            const stageInfo = document.createElement('div');
            stageInfo.style.cssText = 'flex: 1;';

            const stageLabel = document.createElement('div');
            stageLabel.style.cssText = `font-size: 0.75rem; font-weight: 600; color: ${isCurrent ? '#ffcc33' : '#aaa'};`;
            stageLabel.textContent = `${stageName} ${'★'.repeat(stageNum)}`;
            stageInfo.appendChild(stageLabel);

            // Evolution trigger
            if (form) {
                const triggerDesc = form.evolution_trigger_description || '';
                if (triggerDesc && stageNum > 1) {
                    const triggerEl = document.createElement('div');
                    triggerEl.style.cssText = 'font-size: 0.65rem; color: #777;';
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
                        multEl.style.cssText = 'font-size: 0.6rem; color: #66aaff; margin-top: 2px;';
                        multEl.textContent = multStrs.join(', ');
                        stageInfo.appendChild(multEl);
                    }
                }
            }

            if (isCurrent) {
                const currentBadge = document.createElement('span');
                currentBadge.style.cssText = 'font-size: 0.6rem; color: #ffcc33; font-weight: 700;';
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
            loreDiv.style.cssText = 'border-top: 2px solid #1A1A1A; margin-top: 8px; padding-top: 6px;';

            const loreHeader = document.createElement('div');
            loreHeader.style.cssText = 'font-size: 0.7rem; color: #888; font-weight: 600; margin-bottom: 3px;';
            loreHeader.textContent = 'Lore';
            loreDiv.appendChild(loreHeader);

            const loreText = document.createElement('div');
            loreText.style.cssText = 'font-size: 0.65rem; color: #777; font-style: italic; line-height: 1.5;';
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
            padding: 6px 12px; font-size: 0.75rem;
            border: 2px solid #1A1A1A; border-radius: 6px;
            background: ${bgColor}; color: ${textColor};
            cursor: pointer; font-family: Arial, Helvetica, sans-serif;
            font-weight: bold;
        `;
        btn.addEventListener('click', onClick);
        return btn;
    }
}

export default SpriteInspectPanel;

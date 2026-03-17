/**
 * BattleUI - Main battle UI controller (DOM-based)
 * Ported from Game/Scripts/UI/Battle/BattleUI.gd
 *
 * Manages the battle HUD: turn order bar, ability bar, health bars,
 * status icons, floating damage numbers, event feed, targeting overlay,
 * deployment screen, results screen, and crystal throw UI.
 * All rendered into the #battle-hud div using DOM manipulation.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';
import { SkeletalAnimationSystem } from '../rendering/SkeletalAnimationSystem.js';

// -- Color Constants (matching BattleEventFeed colors) ---------------------------

const COLORS = {
    ability:  '#66aaff',
    damage:   '#ff6655',
    heal:     '#55ee77',
    status:   '#cc99ff',
    faint:    '#aa5555',
    catch:    '#66ddaa',
    victory:  '#ffe644',
    defeat:   '#bb3333',
    default:  '#ccccdd',
};

// -- BattleUI --------------------------------------------------------------------

export class BattleUI {
    /**
     * @param {string} containerId - ID of the battle HUD container (default: 'battle-hud')
     */
    constructor(containerId = 'battle-hud') {
        /** @type {HTMLElement|null} */
        this._container = null;

        /** @type {string} */
        this._containerId = containerId;

        // -- Sub-component DOM elements --
        /** @type {HTMLElement|null} */
        this._turnOrderBar = null;
        /** @type {HTMLElement|null} */
        this._abilityBar = null;
        /** @type {HTMLElement|null} */
        this._eventFeed = null;
        /** @type {HTMLElement|null} */
        this._floatingDamageLayer = null;
        /** @type {HTMLElement|null} */
        this._healthBarLayer = null;
        /** @type {HTMLElement|null} */
        this._statusIconLayer = null;
        /** @type {HTMLElement|null} */
        this._targetingOverlay = null;
        /** @type {HTMLElement|null} */
        this._resultsScreen = null;
        /** @type {HTMLElement|null} */
        this._deploymentScreen = null;

        // -- State --
        /** @type {Object} Currently active unit data during player turn */
        this._activeUnitData = {};

        /** @type {number} Currently selected ability ID for targeting */
        this._selectedAbilityId = -1;

        /** @type {Map<number, Object>} Unit visual tracking: unitId -> { gridPos, team, maxHp, currentHp } */
        this._trackedUnits = new Map();

        /** @type {Map<number, HTMLElement>} Health bar elements by unit ID */
        this._healthBars = new Map();

        /** @type {Map<number, HTMLElement>} Status icon containers by unit ID */
        this._statusIcons = new Map();

        /** @type {Map<number, HTMLElement>} Turn order portraits by unit ID */
        this._turnOrderPortraits = new Map();

        console.log('[BattleUI] Created.');
    }

    // -- Initialization ----------------------------------------------------------

    /**
     * Initialize the battle UI by building DOM structure and wiring events.
     */
    init() {
        this._container = document.getElementById(this._containerId);
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.id = this._containerId;
            document.body.appendChild(this._container);
        }

        Object.assign(this._container.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none',
            zIndex: '100',
            display: 'none',
        });

        this._buildComponents();
        this._connectEventBus();

        console.log('[BattleUI] Initialized.');
    }

    // -- Component Construction --------------------------------------------------

    /** @private */
    _buildComponents() {
        // Turn Order Bar (top) — clean cel-shaded style with uniform black outline
        this._turnOrderBar = document.createElement('div');
        this._turnOrderBar.className = 'battle-turn-order';
        Object.assign(this._turnOrderBar.style, {
            position: 'absolute',
            top: '8px', left: '0',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            gap: '6px',
            padding: '4px 12px',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            fontFamily: "Arial, Helvetica, sans-serif",
        });
        // Clean cel-shaded background panel
        const turnOrderBg = document.createElement('div');
        turnOrderBg.style.cssText = `
            position:absolute;top:0;left:5%;right:5%;bottom:0;
            background:#2A1F4E;
            border:3px solid #1A1A1A;
            border-radius:8px;
            z-index:-1;
        `;
        this._turnOrderBar.style.position = 'absolute';
        this._turnOrderBar.appendChild(turnOrderBg);
        this._container.appendChild(this._turnOrderBar);

        // Event Feed (top-left) — clean flat panel
        this._eventFeed = document.createElement('div');
        this._eventFeed.className = 'battle-event-feed';
        Object.assign(this._eventFeed.style, {
            position: 'absolute',
            top: '64px', left: '8px',
            width: '260px',
            maxHeight: '200px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            pointerEvents: 'none',
            fontSize: '13px',
            fontFamily: "Arial, Helvetica, sans-serif",
            background: '#1E1533',
            border: '3px solid #1A1A1A',
            borderRadius: '8px',
            padding: '8px 10px',
        });
        this._container.appendChild(this._eventFeed);

        // Health bar layer (overlay)
        this._healthBarLayer = document.createElement('div');
        this._healthBarLayer.className = 'battle-health-bars';
        Object.assign(this._healthBarLayer.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none',
        });
        this._container.appendChild(this._healthBarLayer);

        // Status icon layer (overlay)
        this._statusIconLayer = document.createElement('div');
        this._statusIconLayer.className = 'battle-status-icons';
        Object.assign(this._statusIconLayer.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none',
        });
        this._container.appendChild(this._statusIconLayer);

        // Floating damage layer
        this._floatingDamageLayer = document.createElement('div');
        this._floatingDamageLayer.className = 'battle-floating-damage';
        Object.assign(this._floatingDamageLayer.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none',
            overflow: 'hidden',
        });
        this._container.appendChild(this._floatingDamageLayer);

        // Targeting overlay
        this._targetingOverlay = document.createElement('div');
        this._targetingOverlay.className = 'battle-targeting';
        Object.assign(this._targetingOverlay.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            pointerEvents: 'none',
            display: 'none',
        });
        this._container.appendChild(this._targetingOverlay);

        // Ability Bar (bottom)
        this._abilityBar = document.createElement('div');
        this._abilityBar.className = 'battle-ability-bar';
        Object.assign(this._abilityBar.style, {
            position: 'absolute',
            bottom: '16px', left: '0',
            width: '100%',
            display: 'none',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
        });
        this._container.appendChild(this._abilityBar);

        // Results screen (modal overlay)
        this._resultsScreen = document.createElement('div');
        this._resultsScreen.className = 'battle-results';
        Object.assign(this._resultsScreen.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            pointerEvents: 'auto',
            zIndex: '200',
        });
        this._container.appendChild(this._resultsScreen);

        // Deployment screen (modal overlay)
        this._deploymentScreen = document.createElement('div');
        this._deploymentScreen.className = 'battle-deployment';
        Object.assign(this._deploymentScreen.style, {
            position: 'absolute',
            top: '0', left: '0',
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            pointerEvents: 'auto',
            zIndex: '200',
        });
        this._container.appendChild(this._deploymentScreen);
    }

    // -- EventBus Wiring ---------------------------------------------------------

    /** @private */
    _connectEventBus() {
        // Battle lifecycle
        eventBus.on(GameEvents.BATTLE_STARTED, (data) => this._onBattleStarted(data));
        eventBus.on(GameEvents.BATTLE_ENDED, (result) => this._onBattleEnded(result));

        // Turn flow
        eventBus.on(GameEvents.TURN_STARTED, (unit) => this._onTurnStarted(unit));
        eventBus.on(GameEvents.TURN_ENDED, (unit) => this._onTurnEnded(unit));

        // Combat events
        eventBus.on(GameEvents.ABILITY_USED, (caster, ability, targets) => this._onAbilityUsed(caster, ability, targets));
        eventBus.on(GameEvents.UNIT_DAMAGED, (attacker, defender, amount, isCrit, effectiveness) =>
            this._onDamageDealt(attacker, defender, amount, isCrit, effectiveness));
        eventBus.on(GameEvents.UNIT_DEFEATED, (unit) => this._onUnitFainted(unit));

        // Status effects
        eventBus.on(GameEvents.STATUS_APPLIED, (unit, effect) => this._onStatusApplied(unit, effect));
        eventBus.on(GameEvents.STATUS_REMOVED, (unit, effect) => this._onStatusExpired(unit, effect));

        // Catching
        eventBus.on(GameEvents.CATCH_ATTEMPTED, (crystal, target) => this._onCatchAttempted(crystal, target));
        eventBus.on(GameEvents.CATCH_RESULT, (result) => {
            if (result && result.success) {
                this._onCatchSucceeded(result.spriteData);
            } else if (result) {
                this._onCatchFailed(result.spriteData);
            }
        });

        // Progression
        eventBus.on(GameEvents.LEVEL_UP, (sprite, level) => this._onLevelUp(sprite, level));
        eventBus.on(GameEvents.EVOLUTION_READY, (sprite, stage) => this._onEvolutionTriggered(sprite, stage));
    }

    // -- Public API: Show/Hide ---------------------------------------------------

    /**
     * Show the battle HUD.
     */
    show() {
        this._container.style.display = '';
    }

    /**
     * Hide the battle HUD.
     */
    hide() {
        this._container.style.display = 'none';
    }

    // -- Public API: Player Turn UI -----------------------------------------------

    /**
     * Show the ability bar for the active player unit.
     * @param {Object} unitData - { unitId, abilities: Array<Object>, gridPos: {x, y} }
     */
    showPlayerTurnUI(unitData) {
        this._activeUnitData = unitData;
        this._selectedAbilityId = -1;

        const abilities = unitData.abilities || [];
        this._renderAbilityBar(abilities);
        this._abilityBar.style.display = 'flex';
    }

    /**
     * Hide the ability bar and targeting overlay.
     */
    hidePlayerTurnUI() {
        this._activeUnitData = {};
        this._selectedAbilityId = -1;
        this._abilityBar.style.display = 'none';
        this._hideTargeting();
    }

    // -- Public API: Unit Registration -------------------------------------------

    /**
     * Register a unit for visual tracking.
     * @param {number} unitId
     * @param {Object} gridPos - { x, y }
     * @param {string} [textureUrl] - URL for the unit sprite
     * @param {number} team - 0 for player, 1 for enemy
     * @param {number} maxHp
     * @param {number} currentHp
     */
    registerUnit(unitId, gridPos, textureUrl, team, maxHp, currentHp, unitData) {
        this._trackedUnits.set(unitId, {
            gridPos,
            textureUrl,
            team,
            maxHp,
            currentHp,
            unitData,
        });

        // Create health bar
        this._createHealthBar(unitId, maxHp, currentHp, team);

        // Add to turn order bar with full unitData for skeletal rendering
        this._addTurnOrderPortrait(unitId, unitData, team);
    }

    /**
     * Unregister a unit from all visual systems.
     * @param {number} unitId
     */
    unregisterUnit(unitId) {
        this._removeHealthBar(unitId);
        this._removeStatusIcons(unitId);
        this._removeTurnOrderPortrait(unitId);
        this._trackedUnits.delete(unitId);
    }

    // -- Public API: Refresh All -------------------------------------------------

    /**
     * Refresh all displays.
     */
    updateAll() {
        // Health bars and status icons positions would be updated here
        // if we were using canvas-based positioning.
    }

    // -- Turn Order Bar ----------------------------------------------------------

    /** @private */
    _addTurnOrderPortrait(unitId, unitData, team) {
        // Clean cel-shaded portrait with uniform outline
        const el = document.createElement('div');
        el.className = 'turn-order-portrait';
        Object.assign(el.style, {
            width: '48px',
            height: '48px',
            borderRadius: '6px',
            border: `3px solid #1A1A1A`,
            background: team === 0 ? '#4A90D9' : '#D94A4A',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#FFFFFF',
            fontFamily: "Arial, Helvetica, sans-serif",
            transition: 'transform 0.2s, box-shadow 0.2s',
        });

        if (unitData) {
            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            canvas.style.cssText = 'width:100%;height:100%;';
            const ctx = canvas.getContext('2d');
            const raceId = unitData.raceId || unitData.race_id || 1;
            const stage = unitData.evolutionStage || unitData.evolution_stage || 1;
            const equipment = unitData.equipment || {};
            SkeletalAnimationSystem.drawWithEquipment(ctx, raceId, stage, 0, 0, 24, 40, 40, { equipment });
            el.appendChild(canvas);
        } else {
            el.textContent = unitId;
        }

        this._turnOrderBar.appendChild(el);
        this._turnOrderPortraits.set(unitId, el);
    }

    /** @private */
    _removeTurnOrderPortrait(unitId) {
        const el = this._turnOrderPortraits.get(unitId);
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
        this._turnOrderPortraits.delete(unitId);
    }

    /**
     * Highlight the current turn's unit in the turn order bar.
     * @param {number} unitId
     */
    highlightCurrentTurn(unitId) {
        for (const [id, el] of this._turnOrderPortraits) {
            if (id === unitId) {
                el.style.transform = 'scale(1.2)';
                el.style.boxShadow = '0 0 10px rgba(255,255,100,0.7)';
            } else {
                el.style.transform = 'scale(1)';
                el.style.boxShadow = 'none';
            }
        }
    }

    // -- Ability Bar Rendering ---------------------------------------------------

    /** @private */
    _renderAbilityBar(abilities) {
        this._abilityBar.innerHTML = '';

        for (const ability of abilities) {
            const btn = document.createElement('button');
            btn.className = 'ability-btn';
            // Clean cel-shaded button with uniform outline
            Object.assign(btn.style, {
                padding: '10px 14px',
                background: '#3366AA',
                color: '#FFFFFF',
                border: '3px solid #1A1A1A',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                minWidth: '80px',
                textAlign: 'center',
                pointerEvents: 'auto',
                fontFamily: "Arial, Helvetica, sans-serif",
                transition: 'background 0.15s',
            });

            const nameSpan = document.createElement('div');
            nameSpan.textContent = ability.name || `Ability ${ability.abilityId}`;
            nameSpan.style.fontWeight = 'bold';
            btn.appendChild(nameSpan);

            if (ability.element) {
                const elemSpan = document.createElement('div');
                elemSpan.textContent = ability.element;
                elemSpan.style.cssText = "font-size:11px;color:#AABBDD;margin-top:2px;font-family:Arial,Helvetica,sans-serif;";
                btn.appendChild(elemSpan);
            }

            const abilityId = ability.abilityId !== undefined ? ability.abilityId : ability.ability_id;
            btn.addEventListener('click', () => this._onAbilitySelected(abilityId));

            // Hover — clean highlight
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#4477BB';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#3366AA';
            });

            this._abilityBar.appendChild(btn);
        }

        // Add a "Catch" button if applicable (can be shown conditionally)
        const catchBtn = document.createElement('button');
        catchBtn.className = 'ability-btn catch-btn';
        // Clean cel-shaded catch button
        Object.assign(catchBtn.style, {
            padding: '10px 14px',
            background: '#33AA55',
            color: '#FFFFFF',
            border: '3px solid #1A1A1A',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '80px',
            textAlign: 'center',
            pointerEvents: 'auto',
            fontFamily: "Arial, Helvetica, sans-serif",
            fontWeight: 'bold',
        });
        catchBtn.textContent = 'Catch';
        catchBtn.addEventListener('click', () => this._onCatchButtonPressed());
        this._abilityBar.appendChild(catchBtn);
    }

    // -- Targeting Overlay -------------------------------------------------------

    /**
     * Show targeting overlay with valid cells highlighted.
     * @param {Object} abilityData
     * @param {Object} casterPos - { x, y }
     * @param {Array<Object>} validCells - Array of { x, y }
     */
    showTargeting(abilityData, casterPos, validCells) {
        this._targetingOverlay.innerHTML = '';
        this._targetingOverlay.style.display = '';
        this._targetingOverlay.style.pointerEvents = 'auto';

        // Info label
        const info = document.createElement('div');
        info.textContent = `Select target for: ${abilityData.name || 'Ability'}`;
        Object.assign(info.style, {
            position: 'absolute',
            top: '100px',
            width: '100%',
            textAlign: 'center',
            color: '#aaddff',
            fontSize: '16px',
            pointerEvents: 'none',
        });
        this._targetingOverlay.appendChild(info);

        // Render valid target cells as clickable areas
        for (const cell of validCells) {
            const cellBtn = document.createElement('div');
            cellBtn.className = 'target-cell';
            Object.assign(cellBtn.style, {
                position: 'absolute',
                width: '48px', height: '48px',
                background: 'rgba(100,200,255,0.3)',
                border: '2px solid rgba(100,200,255,0.6)',
                borderRadius: '6px',
                cursor: 'pointer',
                // Position would be computed from grid coordinates;
                // for now, arrange in a row for demonstration
                left: `${80 + cell.x * 56}px`,
                top: `${300 + cell.y * 56}px`,
            });

            cellBtn.addEventListener('click', () => {
                this._onTargetConfirmed(cell);
            });

            this._targetingOverlay.appendChild(cellBtn);
        }

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        Object.assign(cancelBtn.style, {
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 24px',
            background: '#AA3333',
            color: '#FFFFFF',
            border: '3px solid #1A1A1A',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontWeight: 'bold',
            cursor: 'pointer',
        });
        cancelBtn.addEventListener('click', () => this._onTargetCancelled());
        this._targetingOverlay.appendChild(cancelBtn);
    }

    /** @private */
    _hideTargeting() {
        this._targetingOverlay.innerHTML = '';
        this._targetingOverlay.style.display = 'none';
        this._targetingOverlay.style.pointerEvents = 'none';
    }

    // -- Health Bars -------------------------------------------------------------

    /** @private */
    _createHealthBar(unitId, maxHp, currentHp, team) {
        const wrapper = document.createElement('div');
        wrapper.className = 'health-bar-wrapper';
        wrapper.dataset.unitId = unitId;
        Object.assign(wrapper.style, {
            position: 'relative',
            display: 'inline-block',
            width: '64px',
            margin: '2px',
        });

        const bar = document.createElement('div');
        bar.className = 'health-bar';
        Object.assign(bar.style, {
            width: '100%',
            height: '8px',
            background: '#1A1A2E',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '2px solid #1A1A1A',
            position: 'relative',
        });

        const fill = document.createElement('div');
        fill.className = 'health-bar-fill';
        const pct = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
        Object.assign(fill.style, {
            width: pct + '%',
            height: '100%',
            background: team === 0 ? '#33CC55' : '#CC3333',
            borderRadius: '2px',
            transition: 'width 0.3s ease-out',
            position: 'relative',
            zIndex: '1',
        });

        bar.appendChild(fill);
        wrapper.appendChild(bar);
        this._healthBarLayer.appendChild(wrapper);
        this._healthBars.set(unitId, { wrapper, fill, maxHp, team });
    }

    /**
     * Update a health bar.
     * @param {number} unitId
     * @param {number} currentHp
     * @param {number} [maxHp]
     */
    updateHealthBar(unitId, currentHp, maxHp) {
        const entry = this._healthBars.get(unitId);
        if (!entry) return;
        const mhp = maxHp !== undefined ? maxHp : entry.maxHp;
        if (maxHp !== undefined) entry.maxHp = maxHp;
        const pct = mhp > 0 ? Math.max(0, Math.min(100, (currentHp / mhp) * 100)) : 0;
        entry.fill.style.width = pct + '%';

        // Color based on HP percentage
        if (pct < 25) {
            entry.fill.style.background = '#dd2222';
        } else if (pct < 50) {
            entry.fill.style.background = '#ddaa22';
        } else {
            entry.fill.style.background = entry.team === 0 ? '#33CC55' : '#CC3333';
        }
    }

    /** @private */
    _removeHealthBar(unitId) {
        const entry = this._healthBars.get(unitId);
        if (entry && entry.wrapper.parentNode) {
            entry.wrapper.parentNode.removeChild(entry.wrapper);
        }
        this._healthBars.delete(unitId);
    }

    // -- Status Icons ------------------------------------------------------------

    /**
     * Add a status effect icon for a unit.
     * @param {number} unitId
     * @param {string} effectName
     * @param {string} [iconUrl]
     * @param {number} [durationTurns]
     */
    addStatusIcon(unitId, effectName, iconUrl, durationTurns) {
        let container = this._statusIcons.get(unitId);
        if (!container) {
            container = document.createElement('div');
            container.className = 'status-icons-container';
            Object.assign(container.style, {
                display: 'flex',
                gap: '2px',
                position: 'relative',
            });
            this._statusIconLayer.appendChild(container);
            this._statusIcons.set(unitId, container);
        }

        const icon = document.createElement('div');
        icon.className = 'status-icon';
        icon.dataset.effectName = effectName;
        Object.assign(icon.style, {
            width: '20px', height: '20px',
            borderRadius: '4px',
            background: '#6B44BB',
            border: '2px solid #1A1A1A',
            fontSize: '10px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        });
        icon.title = effectName;

        if (iconUrl) {
            const img = document.createElement('img');
            img.src = iconUrl;
            img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
            img.onerror = () => { icon.textContent = effectName.charAt(0).toUpperCase(); };
            icon.appendChild(img);
        } else {
            icon.textContent = effectName.charAt(0).toUpperCase();
        }

        if (durationTurns !== undefined) {
            const dur = document.createElement('span');
            dur.textContent = durationTurns;
            dur.style.cssText = 'position:absolute;bottom:-2px;right:-2px;font-size:8px;color:#ffd;';
            icon.style.position = 'relative';
            icon.appendChild(dur);
        }

        container.appendChild(icon);
    }

    /**
     * Remove a status effect icon for a unit.
     * @param {number} unitId
     * @param {string} effectName
     */
    removeStatusIcon(unitId, effectName) {
        const container = this._statusIcons.get(unitId);
        if (!container) return;

        const icons = container.querySelectorAll('.status-icon');
        for (const icon of icons) {
            if (icon.dataset.effectName === effectName) {
                container.removeChild(icon);
                break;
            }
        }
    }

    /** @private */
    _removeStatusIcons(unitId) {
        const container = this._statusIcons.get(unitId);
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        this._statusIcons.delete(unitId);
    }

    // -- Floating Damage ---------------------------------------------------------

    /**
     * Spawn a floating damage number.
     * @param {number} amount
     * @param {Object} screenPos - { x, y }
     * @param {boolean} isCrit
     * @param {number} [effectiveness=1] - Damage multiplier for color coding
     */
    spawnFloatingDamage(amount, screenPos, isCrit, effectiveness = 1) {
        const el = document.createElement('div');
        el.className = 'floating-damage';

        let color = COLORS.damage;
        let prefix = '';
        if (effectiveness > 1) color = '#ff9922';
        if (effectiveness < 1) color = '#8888aa';
        if (isCrit) {
            prefix = 'CRIT! ';
            color = '#ffdd00';
        }

        // Clean cel-shaded floating damage with solid outline
        el.textContent = prefix + amount;
        Object.assign(el.style, {
            position: 'absolute',
            left: (screenPos.x || 100) + 'px',
            top: (screenPos.y || 200) + 'px',
            color,
            fontSize: isCrit ? '26px' : '21px',
            fontWeight: 'bold',
            fontFamily: "Arial, Helvetica, sans-serif",
            textShadow: `-2px -2px 0 #1A1A1A, 2px -2px 0 #1A1A1A, -2px 2px 0 #1A1A1A, 2px 2px 0 #1A1A1A`,
            pointerEvents: 'none',
            transition: 'transform 1s ease-out, opacity 1s ease-out',
            zIndex: '150',
        });

        // Wrap in a positioned container
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `position:absolute;left:${(screenPos.x || 100)}px;top:${(screenPos.y || 200)}px;pointer-events:none;z-index:150;`;
        wrapper.appendChild(el);
        el.style.position = 'relative';
        el.style.left = '';
        el.style.top = '';

        this._floatingDamageLayer.appendChild(wrapper);

        // Animate: float up and fade out
        void wrapper.offsetWidth;
        wrapper.style.transition = 'transform 1s ease-out, opacity 1s ease-out';
        wrapper.style.transform = 'translateY(-60px)';
        wrapper.style.opacity = '0';

        setTimeout(() => {
            if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        }, 1000);
    }

    /**
     * Spawn floating text (for status effects, etc.)
     * @param {string} text
     * @param {Object} screenPos - { x, y }
     * @param {string} [color]
     */
    spawnFloatingText(text, screenPos, color = COLORS.status) {
        const el = document.createElement('div');
        el.className = 'floating-text';
        el.textContent = text;
        Object.assign(el.style, {
            position: 'absolute',
            left: (screenPos.x || 100) + 'px',
            top: (screenPos.y || 200) + 'px',
            color,
            fontSize: '16px',
            fontWeight: 'bold',
            fontFamily: "Arial, Helvetica, sans-serif",
            textShadow: '-2px -2px 0 #1A1A1A, 2px -2px 0 #1A1A1A, -2px 2px 0 #1A1A1A, 2px 2px 0 #1A1A1A',
            pointerEvents: 'none',
            transition: 'transform 1.2s ease-out, opacity 1.2s ease-out',
            zIndex: '150',
        });

        this._floatingDamageLayer.appendChild(el);

        void el.offsetWidth;
        el.style.transform = 'translateY(-40px)';
        el.style.opacity = '0';

        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 1200);
    }

    // -- Event Feed --------------------------------------------------------------

    /**
     * Add a message to the battle event feed.
     * @param {string} message
     * @param {string} [color]
     */
    addFeedMessage(message, color = COLORS.default) {
        const el = document.createElement('div');
        el.className = 'event-feed-msg';
        el.textContent = message;
        Object.assign(el.style, {
            color,
            padding: '2px 0',
            opacity: '1',
            transition: 'opacity 0.5s',
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: '13px',
            lineHeight: '20px',
        });

        this._eventFeed.appendChild(el);

        // Keep at most 15 messages
        while (this._eventFeed.children.length > 15) {
            this._eventFeed.removeChild(this._eventFeed.firstChild);
        }

        // Auto-scroll to bottom
        this._eventFeed.scrollTop = this._eventFeed.scrollHeight;
    }

    /**
     * Clear the event feed.
     */
    clearFeed() {
        this._eventFeed.innerHTML = '';
    }

    // -- Results Screen ----------------------------------------------------------

    /**
     * Show the battle results screen.
     * @param {Object} result - { result: 'player_win'|'enemy_win'|'draw', rewards: {...} }
     */
    showResults(result) {
        this._resultsScreen.innerHTML = '';
        this._resultsScreen.style.display = 'flex';

        const outcome = result.result || 'draw';

        // Title
        const title = document.createElement('div');
        title.style.cssText = 'font-size:36px;font-weight:bold;margin-bottom:24px;';
        switch (outcome) {
            case 'player_win':
                title.textContent = 'Victory!';
                title.style.color = COLORS.victory;
                break;
            case 'enemy_win':
                title.textContent = 'Defeat...';
                title.style.color = COLORS.defeat;
                break;
            default:
                title.textContent = 'Draw.';
                title.style.color = COLORS.default;
        }
        this._resultsScreen.appendChild(title);

        // Rewards
        if (result.rewards) {
            const rewardBox = document.createElement('div');
            rewardBox.style.cssText = 'color:#eee;font-size:16px;text-align:center;margin-bottom:24px;';
            if (result.rewards.xp) {
                const line = document.createElement('div');
                line.textContent = `XP Gained: ${result.rewards.xp}`;
                rewardBox.appendChild(line);
            }
            if (result.rewards.gold) {
                const line = document.createElement('div');
                line.textContent = `Gold: +${result.rewards.gold}`;
                rewardBox.appendChild(line);
            }
            this._resultsScreen.appendChild(rewardBox);
        }

        // Continue button
        const btn = document.createElement('button');
        btn.textContent = 'Continue';
        Object.assign(btn.style, {
            padding: '12px 36px',
            background: '#3366AA',
            color: '#FFFFFF',
            border: '3px solid #1A1A1A',
            borderRadius: '8px',
            fontSize: '18px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontWeight: 'bold',
            cursor: 'pointer',
        });
        btn.addEventListener('click', () => this._onResultsClosed());
        this._resultsScreen.appendChild(btn);
    }

    // -- Deployment Screen -------------------------------------------------------

    /**
     * Show the deployment/team selection screen.
     * @param {Array<Object>} availableSprites - Sprites available for deployment
     */
    showDeployment(availableSprites) {
        this._deploymentScreen.innerHTML = '';
        this._deploymentScreen.style.display = 'flex';

        const title = document.createElement('div');
        title.textContent = 'Deploy Your Team';
        title.style.cssText = 'font-size:28px;font-weight:bold;color:#aaddff;margin-bottom:20px;';
        this._deploymentScreen.appendChild(title);

        const list = document.createElement('div');
        list.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;max-width:400px;';

        const placements = {};

        for (const sprite of availableSprites) {
            const slot = document.createElement('div');
            slot.style.cssText = `
                width:80px;height:100px;background:#2A1F4E;border:3px solid #1A1A1A;
                border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;
                cursor:pointer;color:#fff;font-size:13px;padding:4px;font-family:Arial,Helvetica,sans-serif;
            `;
            slot.textContent = sprite.nickname || `#${sprite.instanceId || '?'}`;
            slot.dataset.selected = 'false';
            slot.addEventListener('click', () => {
                const isSelected = slot.dataset.selected === 'true';
                slot.dataset.selected = isSelected ? 'false' : 'true';
                slot.style.borderColor = isSelected ? '#1A1A1A' : 'rgb(80, 200, 120)';
                if (isSelected) {
                    delete placements[sprite.instanceId];
                } else {
                    placements[sprite.instanceId] = sprite;
                }
            });
            list.appendChild(slot);
        }
        this._deploymentScreen.appendChild(list);

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Deploy';
        Object.assign(confirmBtn.style, {
            marginTop: '20px', padding: '12px 36px',
            background: '#33AA55', color: '#FFFFFF',
            border: '3px solid #1A1A1A', borderRadius: '8px',
            fontSize: '18px', fontFamily: 'Arial, Helvetica, sans-serif',
            fontWeight: 'bold', cursor: 'pointer',
        });
        confirmBtn.addEventListener('click', () => {
            this._deploymentScreen.style.display = 'none';
            eventBus.emit('deployment_confirmed', placements);
        });
        this._deploymentScreen.appendChild(confirmBtn);
    }

    // -- Internal: Event Handlers ------------------------------------------------

    /** @private */
    _onBattleStarted(_battleData) {
        this.show();
        this.clearFeed();
        this.addFeedMessage('Battle Start!', COLORS.ability);
    }

    /** @private */
    _onBattleEnded(result) {
        this.hidePlayerTurnUI();
        const outcome = result.result || 'draw';
        switch (outcome) {
            case 'player_win':
                this.addFeedMessage('Victory!', COLORS.victory);
                break;
            case 'enemy_win':
                this.addFeedMessage('Defeat...', COLORS.defeat);
                break;
            default:
                this.addFeedMessage('Draw.', COLORS.default);
        }
    }

    /** @private */
    _onTurnStarted(unit) {
        if (!unit) return;
        const unitId = unit.instanceId || unit.instance_id || 0;
        this.highlightCurrentTurn(unitId);
    }

    /** @private */
    _onTurnEnded(_unit) {
        this.hidePlayerTurnUI();
    }

    /** @private */
    _onAbilityUsed(caster, ability, targets) {
        const casterName = caster ? (caster.nickname || caster.displayName || 'Unit') : 'Unit';
        const abilityName = ability ? (ability.name || ability.abilityName || 'Ability') : 'Ability';
        const targetName = (targets && targets.length > 0 && targets[0])
            ? (targets[0].nickname || targets[0].displayName || 'Target')
            : '';

        const msg = targetName
            ? `${casterName} used ${abilityName} on ${targetName}!`
            : `${casterName} used ${abilityName}!`;
        this.addFeedMessage(msg, COLORS.ability);
    }

    /** @private */
    _onDamageDealt(attacker, defender, amount, isCrit, effectiveness) {
        if (!defender) return;

        const defenderId = defender.instanceId || defender.instance_id || 0;
        const defenderName = defender.nickname || defender.displayName || 'Unit';

        // Spawn floating damage
        if (this._trackedUnits.has(defenderId)) {
            // Use a default screen position (in a real implementation, this would
            // come from grid-to-screen coordinate conversion)
            const screenPos = { x: 200 + Math.random() * 100, y: 300 + Math.random() * 50 };
            this.spawnFloatingDamage(amount, screenPos, isCrit, effectiveness);
        }

        // Update health bar
        if (this._trackedUnits.has(defenderId)) {
            const data = this._trackedUnits.get(defenderId);
            const newHp = Math.max(0, (data.currentHp || 0) - amount);
            data.currentHp = newHp;
            this.updateHealthBar(defenderId, newHp, data.maxHp);
        }

        // Event feed
        let msg = `${defenderName} took ${amount} damage`;
        if (isCrit) msg += ' (CRIT!)';
        this.addFeedMessage(msg, COLORS.damage);
    }

    /** @private */
    _onUnitFainted(unit) {
        if (!unit) return;

        const unitId = unit.instanceId || unit.instance_id || 0;
        const unitName = unit.nickname || unit.displayName || 'Unit';

        this.addFeedMessage(`${unitName} fainted!`, COLORS.faint);

        // Delay removal for visual effect
        setTimeout(() => {
            this.unregisterUnit(unitId);
        }, 800);
    }

    /** @private */
    _onStatusApplied(unit, effect) {
        if (!unit || !effect) return;

        const unitId = unit.instanceId || unit.instance_id || 0;
        const unitName = unit.nickname || unit.displayName || 'Unit';
        const effectName = effect.effectName || effect.name || 'Effect';
        const iconUrl = effect.iconPath || effect.iconUrl || null;
        const duration = effect.durationTurns || effect.duration || 0;

        this.addStatusIcon(unitId, effectName, iconUrl, duration);
        this.addFeedMessage(`${unitName} is affected by ${effectName}!`, COLORS.status);

        // Floating text
        if (this._trackedUnits.has(unitId)) {
            const screenPos = { x: 200 + Math.random() * 60, y: 280 + Math.random() * 40 };
            this.spawnFloatingText(effectName, screenPos, COLORS.status);
        }
    }

    /** @private */
    _onStatusExpired(unit, effect) {
        if (!unit || !effect) return;

        const unitId = unit.instanceId || unit.instance_id || 0;
        const unitName = unit.nickname || unit.displayName || 'Unit';
        const effectName = effect.effectName || effect.name || 'Effect';

        this.removeStatusIcon(unitId, effectName);
        this.addFeedMessage(`${effectName} wore off on ${unitName}.`, '#9999aa');
    }

    /** @private */
    _onCatchAttempted(_crystal, _target) {
        this.addFeedMessage('Throwing crystal...', '#b0d8ff');
    }

    /** @private */
    _onCatchSucceeded(spriteData) {
        const name = spriteData ? (spriteData.nickname || spriteData.displayName || 'Sprite') : 'Sprite';
        this.addFeedMessage(`Caught ${name}!`, COLORS.catch);
    }

    /** @private */
    _onCatchFailed(spriteData) {
        const name = spriteData ? (spriteData.nickname || spriteData.displayName || 'Sprite') : 'Sprite';
        this.addFeedMessage(`${name} broke free!`, '#ff8844');
    }

    /** @private */
    _onLevelUp(spriteData, newLevel) {
        if (!spriteData) return;
        const name = spriteData.nickname || spriteData.displayName || 'Sprite';
        this.addFeedMessage(`${name} reached level ${newLevel}!`, COLORS.victory);
    }

    /** @private */
    _onEvolutionTriggered(spriteData, _newStage) {
        if (!spriteData) return;
        const name = spriteData.nickname || spriteData.displayName || 'Sprite';
        this.addFeedMessage(`${name} is evolving!`, '#cc99ff');
    }

    // -- Component Signal Handlers -----------------------------------------------

    /** @private */
    _onAbilitySelected(abilityId) {
        this._selectedAbilityId = abilityId;

        const casterPos = this._activeUnitData.gridPos || { x: 0, y: 0 };
        let validCells = this._activeUnitData.validTargets || [];

        // Find the ability data from the active unit's abilities
        const abilities = this._activeUnitData.abilities || [];
        let abilityData = null;
        for (const ab of abilities) {
            const abId = ab.abilityId !== undefined ? ab.abilityId : ab.ability_id;
            if (abId === abilityId) {
                abilityData = ab;
                break;
            }
        }

        if (!abilityData) return;

        // Self-targeting or AoE: confirm immediately
        const targetingType = abilityData.targetingType || abilityData.targeting_type || 'single';
        if (targetingType === 'self' || targetingType === 'all' || targetingType === 'all_allies') {
            this._onTargetConfirmed(casterPos);
            return;
        }

        // If no valid targets pre-supplied, generate defaults
        if (validCells.length === 0) {
            // Generate some placeholder targets from tracked enemy units
            for (const [id, data] of this._trackedUnits) {
                if (data.team !== 0) { // Enemy team
                    validCells.push(data.gridPos);
                }
            }
        }

        this.showTargeting(abilityData, casterPos, validCells);
    }

    /** @private */
    _onTargetConfirmed(gridPos) {
        if (this._selectedAbilityId < 0) return;

        // Forward to battle system via EventBus
        eventBus.emit('player_ability_confirmed', {
            abilityId: this._selectedAbilityId,
            targetPos: gridPos,
        });

        this.hidePlayerTurnUI();
    }

    /** @private */
    _onTargetCancelled() {
        this._selectedAbilityId = -1;
        this._hideTargeting();
        // Re-show the ability bar
        if (Object.keys(this._activeUnitData).length > 0) {
            this._abilityBar.style.display = 'flex';
        }
    }

    /** @private */
    _onResultsClosed() {
        this._resultsScreen.style.display = 'none';
        eventBus.emit(GameEvents.SCREEN_OPENED, 'overworld');
    }

    /** @private */
    _onCatchButtonPressed() {
        eventBus.emit(GameEvents.CATCH_ATTEMPTED, null, null);
    }
}

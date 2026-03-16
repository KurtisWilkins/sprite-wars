/**
 * RTSBattleScene.js — Hero's Hour-style real-time auto-battle scene.
 *
 * After the deployment phase, this scene takes over and runs the battle
 * in real-time. The player watches units move and fight autonomously.
 *
 * Controls:
 *   - Space/Tap: Pause/Resume
 *   - Right arrow/Swipe right: Speed up (1x → 2x → 3x)
 *   - Escape: View battle log
 *
 * enter(data) receives the same format as BattleScene:
 *   { playerTeam, enemyTeam, background, isBoss, returnData }
 */

import { Scene } from '../core/SceneManager.js';
import { eventBus, GameEvents } from '../core/EventBus.js';
import { RTSBattleManager } from '../systems/battle/RTSBattleManager.js';
import { RTSBattleRenderer } from '../systems/rendering/RTSBattleRenderer.js';
import { HumanoidSpriteSystem } from '../systems/rendering/HumanoidSpriteSystem.js';
import { SPRITE_RACES, EVOLUTION_FORMS } from '../data/SpriteData.js';
import { ABILITIES } from '../data/AbilityData.js';
import { EQUIPMENT, findEquipmentWithExpansion } from '../data/EquipmentData.js';
import { rollBattleLoot, formatLootForDisplay } from '../systems/battle/BattleLootSystem.js';
import { SpriteInspectPanel } from '../systems/ui/SpriteInspectPanel.js';
import { getWeaponProfile } from '../data/WeaponAnimationData.js';
import { getClassSpecial } from '../data/ClassSpecialAnimations.js';
import { CLASS_WEAPON_MAP } from '../data/WeaponThemeData.js';
import { canTeleport, executeTeleport, getTeleportDescription } from '../systems/battle/AssassinTeleportSystem.js';

// ── UI Constants ────────────────────────────────────────────────────────────
const INTRO_DURATION = 2.0;
const END_SCREEN_DELAY = 1.5;
const SPEED_LABELS = { 1: '1x', 2: '2x', 3: '3x' };

// ── Element Colors (for info panel) ──────────────────────────────────────────
const ELEMENT_COLORS_PANEL = {
    Fire: '#ff5533', Water: '#3399ff', Earth: '#996633', Wind: '#88ccaa',
    Electric: '#ffcc00', Ice: '#99ddff', Plant: '#33aa33', Poison: '#aa33aa',
    Light: '#ffee99', Dark: '#553366', Metal: '#aaaacc', Fairy: '#ff66aa',
    Lunar: '#ff8833', Solar: '#ccccff',
};

// ── Ability wrapper (same as BattleScene) ───────────────────────────────────
function _wrapAbility(raw) {
    return {
        abilityId: raw.ability_id,
        abilityName: raw.ability_name,
        elementType: raw.element_type,
        targetingType: raw.targeting_type,
        basePower: raw.base_power,
        accuracy: raw.accuracy,
        ppMax: raw.pp_max,
        cooldownTurns: raw.cooldown_turns,
        priorityModifier: raw.priority_modifier || 0,
        statusEffectIds: raw.status_effect_ids || [],
        statusApplyChance: raw.status_apply_chance || 0,
        isPhysical: raw.is_physical,
        critRateBonus: raw.crit_rate_bonus || 0,
        description: raw.description || '',
        isDamaging() { return this.basePower > 0; },
        getOffenseStatKey() { return this.isPhysical ? 'atk' : 'sp_atk'; },
        getDefenseStatKey() { return this.isPhysical ? 'def' : 'sp_def'; },
        hasStatusEffects() { return this.statusEffectIds.length > 0; },
    };
}

function _resolveAbilities(raw, raceData, stageData, level) {
    const wrapped = [];
    if (raw.abilities && raw.abilities.length > 0) {
        for (const ab of raw.abilities) {
            const id = ab.abilityId || ab.ability_id;
            const canonical = ABILITIES[id];
            if (canonical) wrapped.push(_wrapAbility(canonical));
        }
    }
    if (wrapped.length > 0) return wrapped;

    const elemType = (raceData.element_types && raceData.element_types[0]) || 'Fire';
    const matching = [];
    for (const id in ABILITIES) {
        const ab = ABILITIES[id];
        if (ab.element_type === elemType || ab.element_type === 'None') {
            matching.push(ab);
        }
    }
    matching.sort((a, b) => a.base_power - b.base_power);
    const levelAppropriate = matching.filter(ab => ab.base_power <= 30 + level * 3);
    const picks = levelAppropriate.length > 0 ? levelAppropriate : matching.slice(0, 2);
    const selected = picks.slice(-2);
    for (const ab of selected) wrapped.push(_wrapAbility(ab));
    if (wrapped.length === 0 && ABILITIES[155]) wrapped.push(_wrapAbility(ABILITIES[155]));
    return wrapped;
}

export class RTSBattleScene extends Scene {
    constructor(engine) {
        super(engine);

        // ── Subsystems ─────────────────────────────────────────
        this._battleManager = new RTSBattleManager();
        this._renderer = new RTSBattleRenderer();

        // ── State ──────────────────────────────────────────────
        this._phase = 'intro';  // intro, battle, ending, result
        this._introTimer = 0;
        this._endTimer = 0;
        this._isBoss = false;
        this._bgImage = null;
        this._returnData = null;
        this._battleRewards = null;
        this._battleResult = null;

        // ── Input ──────────────────────────────────────────────
        this._playerTeamData = [];
        this._enemyTeamData = [];

        // ── Unit Selection ────────────────────────────────────
        this._selectedUnit = null;
        this._inspectPanel = new SpriteInspectPanel();

        // ── DOM ────────────────────────────────────────────────
        this._domContainer = null;
        this._speedBtnEl = null;
        this._pauseBtnEl = null;
        this._logPanelEl = null;
        this._endScreenEl = null;

        // ── Event Listeners ────────────────────────────────────
        this._unsubs = [];
    }

    // ═══════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════

    async init() {
        // Preload humanoid sprite assets
        await HumanoidSpriteSystem.preloadAssets(this.engine.assets).catch(() => {});
        this.initialized = true;
    }

    enter(data) {
        this._playerTeamData = data.playerTeam || [];
        this._enemyTeamData = data.enemyTeam || [];
        this._isBoss = !!data.isBoss;
        this._returnData = data.returnData || null;
        this._bgImage = null;
        this._battleResult = null;
        this._battleRewards = null;
        this._phase = 'intro';
        this._introTimer = 0;
        this._endTimer = 0;

        // Load background
        if (data.background) {
            this.engine.assets.loadImage(data.background)
                .then(img => {
                    this._bgImage = img;
                    this._renderer.setBackground(img);
                })
                .catch(() => {});
        }

        // Resolve team data
        const playerTeam = this._resolveTeam(this._playerTeamData);
        const enemyTeam = this._resolveTeam(this._enemyTeamData);

        // Build config
        const config = {
            elementChart: this.engine.data ? this.engine.data.effectivenessMatrix : {},
            statusDb: this.engine.data ? this.engine.data.statusEffects : {},
        };

        // Start the battle
        this._battleManager.startBattle(playerTeam, enemyTeam, config);
        this._renderer.setField(this._battleManager.field);

        // Create DOM overlays
        this._createDOMOverlays();

        // Subscribe to events
        this._subscribeEvents();

        // Play battle music
        const musicTrack = this._isBoss ? 'Audio/Music/BossBattle.wav' : 'Audio/Music/BattleTheme.wav';
        this.engine.audio.playMusic(
            this.engine.assets.resolvePath(musicTrack)
        );

        eventBus.emit(GameEvents.SCREEN_OPENED, 'rts_battle');
    }

    exit() {
        for (const unsub of this._unsubs) {
            if (typeof unsub === 'function') unsub();
        }
        this._unsubs = [];

        this._inspectPanel.hide();

        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
        }
        this._domContainer = null;
        this._speedBtnEl = null;
        this._pauseBtnEl = null;
        this._logPanelEl = null;
        this._endScreenEl = null;
        this._selectedUnit = null;
        this._renderer.selectedUnit = null;
        this._renderer.clear();
        HumanoidSpriteSystem.clearCache();
    }

    // ═══════════════════════════════════════════════════════════════
    // Update
    // ═══════════════════════════════════════════════════════════════

    update(dt) {
        switch (this._phase) {
            case 'intro':
                this._introTimer += dt;
                if (this._introTimer >= INTRO_DURATION) {
                    this._phase = 'battle';
                    // Ensure battle is not paused from intro-phase button presses
                    this._battleManager.isPaused = false;
                    if (this._pauseBtnEl) this._pauseBtnEl.textContent = '⏸ PAUSE';
                    // Show controls now that battle has started
                    if (this._speedBtnEl) this._speedBtnEl.style.display = '';
                    if (this._pauseBtnEl) this._pauseBtnEl.style.display = '';
                }
                break;

            case 'battle':
                this._battleManager.update(dt);

                // Check if battle ended
                if (this._battleManager.result) {
                    this._phase = 'ending';
                    this._endTimer = 0;
                    this._battleResult = this._battleManager.result;
                    this._calculateRewards();
                }
                break;

            case 'ending':
                this._endTimer += dt;
                if (this._endTimer >= END_SCREEN_DELAY) {
                    this._phase = 'result';
                    this._showEndScreen();
                }
                break;

            case 'result':
                // Wait for player input to exit
                break;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Input
    // ═══════════════════════════════════════════════════════════════

    onInput(input) {
        if (this._phase === 'battle') {
            // Tap: try to select a unit first; if no unit hit, toggle pause
            if (input.pointerJustPressed && input.isTap && input.isTap()) {
                const tappedUnit = this._hitTestUnit(input.pointerPos.x, input.pointerPos.y);
                if (tappedUnit) {
                    this._selectUnit(tappedUnit);
                } else if (this._selectedUnit) {
                    // Tapped empty space — deselect
                    this._deselectUnit();
                } else {
                    const isPaused = this._battleManager.togglePause();
                    if (this._pauseBtnEl) {
                        this._pauseBtnEl.textContent = isPaused ? '▶ PLAY' : '⏸ PAUSE';
                    }
                }
            }

            // Space: pause (keyboard only)
            if (input.isKeyJustPressed('Space')) {
                const isPaused = this._battleManager.togglePause();
                if (this._pauseBtnEl) {
                    this._pauseBtnEl.textContent = isPaused ? '▶ PLAY' : '⏸ PAUSE';
                }
            }

            // Escape: deselect unit or close info panel
            if (input.isKeyJustPressed('Escape')) {
                if (this._selectedUnit) {
                    this._deselectUnit();
                }
            }

            // Right arrow or 'S': speed up
            if (input.isKeyJustPressed('ArrowRight') || input.isKeyJustPressed('KeyS')) {
                const newSpeed = this._battleManager.cycleSpeed();
                if (this._speedBtnEl) {
                    this._speedBtnEl.textContent = `⏩ ${SPEED_LABELS[newSpeed] || newSpeed + 'x'}`;
                }
            }
        }

        if (this._phase === 'result') {
            // Any key or tap to exit
            if (input.isKeyJustPressed('Space') || input.isKeyJustPressed('Enter') ||
                input.isKeyJustPressed('Escape') ||
                (input.pointerJustPressed && input.isTap && input.isTap())) {
                this._exitBattle();
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Unit Selection
    // ═══════════════════════════════════════════════════════════════

    /**
     * Hit-test: find the nearest alive unit within tap radius of screen coords.
     * @param {number} sx - Screen X
     * @param {number} sy - Screen Y
     * @returns {import('../systems/battle/RTSUnit.js').RTSUnit|null}
     */
    _hitTestUnit(sx, sy) {
        const field = this._battleManager.field;
        if (!field) return null;

        const world = field.screenToWorld(sx, sy);
        const TAP_RADIUS = 24; // pixels in world space
        let closest = null;
        let closestDist = TAP_RADIUS;

        for (const unit of field.units) {
            if (!unit.isAlive) continue;
            const dx = unit.worldPos.x - world.x;
            const dy = unit.worldPos.y - world.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closest = unit;
            }
        }
        return closest;
    }

    /**
     * Select a unit and show the info panel.
     * @param {import('../systems/battle/RTSUnit.js').RTSUnit} unit
     */
    _selectUnit(unit) {
        this._selectedUnit = unit;
        this._renderer.selectedUnit = unit;
        this._showUnitInfoPanel(unit);
    }

    /** Deselect the current unit and hide the info panel. */
    _deselectUnit() {
        this._selectedUnit = null;
        this._renderer.selectedUnit = null;
        this._hideUnitInfoPanel();
    }

    /**
     * Build and show the DOM info panel for a selected unit.
     * @param {import('../systems/battle/RTSUnit.js').RTSUnit} unit
     */
    _showUnitInfoPanel(unit) {
        if (!this._domContainer) return;
        this._inspectPanel.show(this._domContainer, unit, {
            isBattleUnit: true,
            position: 'left',
            onClose: () => this._deselectUnit(),
        });
    }

    /** Remove the unit info panel from the DOM. */
    _hideUnitInfoPanel() {
        this._inspectPanel.hide();
    }

    // ═══════════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════════

    render(renderer) {
        const ctx = renderer.ctx;

        // Render battlefield
        if (this._battleManager.field) {
            this._renderer.render(ctx, this._battleManager.field,
                this.engine.deltaTime * this._battleManager.speedMultiplier);
        }

        // HUD overlays
        this._renderHUD(ctx);

        // Phase-specific overlays
        if (this._phase === 'intro') {
            this._renderIntro(ctx);
        }

        if (this._phase === 'ending') {
            this._renderEndingOverlay(ctx);
        }
    }

    _renderHUD(ctx) {
        const mgr = this._battleManager;

        // Timer display
        const elapsed = Math.floor(mgr.elapsedTime);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(460, 4, 40, 18);
        ctx.fillStyle = '#ddd';
        ctx.fillText(timeStr, 480, 17);

        // Unit count
        const pAlive = mgr.field ? mgr.field.getLivingUnits(0).length : 0;
        const eAlive = mgr.field ? mgr.field.getLivingUnits(1).length : 0;

        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#4488ff';
        ctx.fillText(`Player: ${pAlive}`, 10, 16);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#ff4444';
        ctx.fillText(`Enemy: ${eAlive}`, 950, 16);

        // Speed indicator
        if (mgr.speedMultiplier > 1) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffcc00';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(`${mgr.speedMultiplier}x`, 480, 36);
        }

        // Pause indicator
        if (mgr.isPaused) {
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(380, 250, 200, 40);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText('⏸ PAUSED', 480, 276);
        }

        ctx.textAlign = 'left';
    }

    _renderIntro(ctx) {
        const progress = Math.min(1, this._introTimer / INTRO_DURATION);
        const fadeIn = Math.min(1, this._introTimer / 0.5);
        const fadeOut = this._introTimer > 1.5 ? 1 - (this._introTimer - 1.5) / 0.5 : 1;
        const alpha = Math.min(fadeIn, fadeOut);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 220, 960, 100);

        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this._isBoss ? '#ff4444' : '#ffffff';
        ctx.fillText(this._isBoss ? 'BOSS BATTLE!' : 'BATTLE START!', 480, 270);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Units will fight automatically', 480, 296);

        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    _renderEndingOverlay(ctx) {
        const progress = Math.min(1, this._endTimer / END_SCREEN_DELAY);
        ctx.globalAlpha = progress * 0.5;
        ctx.fillStyle = this._battleResult === 'player_win' ? '#001a33' : '#330000';
        ctx.fillRect(0, 0, 960, 540);
        ctx.globalAlpha = 1;
    }

    // ═══════════════════════════════════════════════════════════════
    // DOM Overlays
    // ═══════════════════════════════════════════════════════════════

    _createDOMOverlays() {
        // Remove old container
        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
        }

        this._domContainer = document.createElement('div');
        this._domContainer.id = 'rts-battle-ui';
        this._domContainer.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 10;
        `;

        // Speed button
        this._speedBtnEl = document.createElement('button');
        this._speedBtnEl.textContent = '⏩ 1x';
        this._speedBtnEl.style.cssText = `
            position: absolute; bottom: 12px; right: 80px;
            padding: 6px 14px; background: rgba(0,0,0,0.7); color: #fff;
            border: 1px solid #555; border-radius: 4px; font: bold 12px sans-serif;
            cursor: pointer; pointer-events: auto;
        `;
        this._speedBtnEl.addEventListener('click', () => {
            const newSpeed = this._battleManager.cycleSpeed();
            this._speedBtnEl.textContent = `⏩ ${SPEED_LABELS[newSpeed] || newSpeed + 'x'}`;
        });

        // Pause button
        this._pauseBtnEl = document.createElement('button');
        this._pauseBtnEl.textContent = '⏸ PAUSE';
        this._pauseBtnEl.style.cssText = `
            position: absolute; bottom: 12px; right: 12px;
            padding: 6px 14px; background: rgba(0,0,0,0.7); color: #fff;
            border: 1px solid #555; border-radius: 4px; font: bold 12px sans-serif;
            cursor: pointer; pointer-events: auto;
        `;
        this._pauseBtnEl.addEventListener('click', () => {
            const isPaused = this._battleManager.togglePause();
            this._pauseBtnEl.textContent = isPaused ? '▶ PLAY' : '⏸ PAUSE';
        });

        // Battle log panel (bottom left)
        this._logPanelEl = document.createElement('div');
        this._logPanelEl.style.cssText = `
            position: absolute; bottom: 12px; left: 12px; width: 280px; max-height: 100px;
            overflow-y: auto; background: rgba(0,0,0,0.6); color: #ccc;
            font: 10px sans-serif; padding: 4px 6px; border-radius: 4px;
            pointer-events: auto;
        `;

        // Hide buttons during intro phase — they'll be shown when battle starts
        this._speedBtnEl.style.display = 'none';
        this._pauseBtnEl.style.display = 'none';

        this._domContainer.appendChild(this._speedBtnEl);
        this._domContainer.appendChild(this._pauseBtnEl);
        this._domContainer.appendChild(this._logPanelEl);

        const canvasParent = this.engine.canvas.parentElement;
        canvasParent.appendChild(this._domContainer);
    }

    _showEndScreen() {
        if (!this._domContainer) return;

        // Remove battle controls
        if (this._speedBtnEl) this._speedBtnEl.style.display = 'none';
        if (this._pauseBtnEl) this._pauseBtnEl.style.display = 'none';

        this._endScreenEl = document.createElement('div');
        this._endScreenEl.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.85); color: #fff; padding: 24px 40px;
            border-radius: 8px; text-align: center; pointer-events: auto;
            border: 2px solid ${this._battleResult === 'player_win' ? '#44ff88' : '#ff4444'};
            min-width: 280px; max-height: 80vh; overflow-y: auto;
        `;

        const isWin = this._battleResult === 'player_win';
        const stats = this._battleManager.stats;

        // Build loot display HTML
        let lootHtml = '';
        if (isWin && this._battleRewards && this._battleRewards.loot && this._battleRewards.loot.length > 0) {
            const lootDisplay = formatLootForDisplay(this._battleRewards.loot);
            let itemsHtml = '';
            for (const item of lootDisplay) {
                itemsHtml += `
                    <div style="display:inline-flex;align-items:center;gap:4px;
                        background:rgba(255,255,255,0.06);border:1px solid ${item.rarityColor}40;
                        border-radius:4px;padding:3px 8px;margin:2px;font:10px sans-serif;">
                        <span style="color:${item.rarityColor};font-weight:700;">${item.name}</span>
                        <span style="color:${item.rarityColor};font-size:9px;opacity:0.8;">[${item.rarityLabel}]</span>
                        <span style="color:#aaa;font-size:9px;">${item.statSummary}</span>
                    </div>
                `;
            }
            lootHtml = `
                <div style="font: bold 11px sans-serif; color: #ffcc44; margin-bottom: 4px;">Equipment Found</div>
                <div style="margin-bottom: 12px;">${itemsHtml}</div>
            `;
        }

        this._endScreenEl.innerHTML = `
            <div style="font: bold 24px sans-serif; color: ${isWin ? '#44ff88' : '#ff4444'}; margin-bottom: 12px;">
                ${isWin ? 'VICTORY!' : this._battleResult === 'draw' ? 'DRAW' : 'DEFEAT'}
            </div>
            <div style="font: 12px sans-serif; color: #aaa; margin-bottom: 16px;">
                Time: ${Math.floor(this._battleManager.elapsedTime)}s
            </div>
            <div style="display: flex; gap: 24px; justify-content: center; margin-bottom: 16px;">
                <div>
                    <div style="color: #4488ff; font: bold 11px sans-serif;">PLAYER</div>
                    <div style="font: 10px sans-serif; color: #ccc;">
                        DMG: ${stats.totalDamageDealt.player}<br>
                        KOs: ${stats.unitsDefeated.player}<br>
                        Abilities: ${stats.abilitiesUsed.player}
                    </div>
                </div>
                <div>
                    <div style="color: #ff4444; font: bold 11px sans-serif;">ENEMY</div>
                    <div style="font: 10px sans-serif; color: #ccc;">
                        DMG: ${stats.totalDamageDealt.enemy}<br>
                        KOs: ${stats.unitsDefeated.enemy}<br>
                        Abilities: ${stats.abilitiesUsed.enemy}
                    </div>
                </div>
            </div>
            ${isWin && this._battleRewards ? `
                <div style="font: 11px sans-serif; color: #ffcc44; margin-bottom: 12px;">
                    +${this._battleRewards.xp} XP &nbsp; +${this._battleRewards.gold} Gold
                </div>
            ` : ''}
            ${lootHtml}
            <div style="font: 11px sans-serif; color: #888;">
                Tap or press any key to continue
            </div>
        `;

        this._domContainer.appendChild(this._endScreenEl);
    }

    // ═══════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════

    _subscribeEvents() {
        // Damage events → floating text + effects
        this._unsubs.push(eventBus.on(GameEvents.UNIT_DAMAGED, (attacker, target, damage, isCrit, effectiveness) => {
            // Find the RTSUnit for this target
            const units = this._battleManager.field.units;
            for (const unit of units) {
                if (unit.spriteInstance === target) {
                    const color = isCrit ? '#ffaa00' : (effectiveness > 1.5 ? '#ff4444' : '#fff');
                    const size = isCrit ? 16 : 12;
                    this._renderer.addFloatingText(unit.worldPos.x, unit.worldPos.y,
                        `-${damage}`, color, size);

                    // Impact effect
                    const elemColor = unit.elementTypes[0] ? '#ff6633' : '#fff';
                    this._renderer.addEffect(unit.worldPos.x, unit.worldPos.y, elemColor, 15, 0.3);
                    break;
                }
            }
        }));

        // Heal events
        this._unsubs.push(eventBus.on(GameEvents.UNIT_HEALED, (target, amount) => {
            const units = this._battleManager.field.units;
            for (const unit of units) {
                if (unit.spriteInstance === target) {
                    this._renderer.addFloatingText(unit.worldPos.x, unit.worldPos.y,
                        `+${amount}`, '#44ff88', 12);
                    this._renderer.addEffect(unit.worldPos.x, unit.worldPos.y, '#44ff88', 12, 0.3);
                    break;
                }
            }
        }));

        // Update battle log on all combat events
        this._unsubs.push(eventBus.on(GameEvents.ABILITY_USED, () => {
            this._updateBattleLog();
        }));
        this._unsubs.push(eventBus.on(GameEvents.UNIT_DAMAGED, () => {
            this._updateBattleLog();
        }));
        this._unsubs.push(eventBus.on(GameEvents.UNIT_DEFEATED, () => {
            this._updateBattleLog();
        }));

        // ── Animation & VFX Events ──────────────────────────────────
        // Attack animation: play weapon-specific animation via controller
        this._unsubs.push(eventBus.on(GameEvents.ATTACK_ANIMATION_REQUESTED, (attackerInst, targetInst, weaponType, element) => {
            const field = this._battleManager.field;
            const units = field.units;
            let attacker = null, target = null;
            for (const u of units) {
                if (u.spriteInstance === attackerInst) attacker = u;
                if (u.spriteInstance === targetInst) target = u;
            }
            if (attacker) {
                this._renderer.animController.playAttackAnimation(
                    attacker, target, weaponType, element,
                    this._renderer.vfxSystem, field
                );
            }
        }));

        // Hit impact VFX
        this._unsubs.push(eventBus.on(GameEvents.HIT_IMPACT_REQUESTED, (targetInst, damage, element, attackStyle) => {
            const field = this._battleManager.field;
            for (const u of field.units) {
                if (u.spriteInstance === targetInst) {
                    const scr = field.worldToScreen(u.worldPos.x, u.worldPos.y);
                    this._renderer.vfxSystem.spawnHitImpact(scr.x, scr.y - 24, element, attackStyle);
                    this._renderer.vfxSystem.spawnComicImpact(scr.x, scr.y - 30, damage);
                    break;
                }
            }
        }));

        // Class special animation
        this._unsubs.push(eventBus.on(GameEvents.SPECIAL_ANIMATION_REQUESTED, (casterInst, targetInst, className) => {
            const field = this._battleManager.field;
            const units = field.units;
            let caster = null, target = null;
            for (const u of units) {
                if (u.spriteInstance === casterInst) caster = u;
                if (u.spriteInstance === targetInst) target = u;
            }
            const specialData = getClassSpecial(className);
            if (caster && specialData) {
                this._renderer.animController.playClassSpecial(
                    caster, target, specialData,
                    this._renderer.vfxSystem, field
                );
            }
        }));

        // Teleport visual
        this._unsubs.push(eventBus.on(GameEvents.TELEPORT_EXECUTED, (unitInst, fromX, fromY, toX, toY) => {
            const field = this._battleManager.field;
            const fromScr = field.worldToScreen(fromX, fromY);
            const toScr = field.worldToScreen(toX, toY);
            this._renderer.vfxSystem.spawnTeleportSmoke(fromScr.x, fromScr.y - 24);
            this._renderer.vfxSystem.spawnTeleportSmoke(toScr.x, toScr.y - 24);
        }));

        // Faint animation
        this._unsubs.push(eventBus.on(GameEvents.FAINT_ANIMATION_REQUESTED, (unitInst) => {
            const field = this._battleManager.field;
            for (const u of field.units) {
                if (u.spriteInstance === unitInst) {
                    this._renderer.animController.playFaintAnimation(u);
                    break;
                }
            }
        }));

        // Knockback visual
        this._unsubs.push(eventBus.on(GameEvents.KNOCKBACK_VISUAL_REQUESTED, (unitInst, fromX, fromY, toX, toY) => {
            const field = this._battleManager.field;
            const fromScr = field.worldToScreen(fromX, fromY);
            const toScr = field.worldToScreen(toX, toY);
            this._renderer.vfxSystem.spawnKnockbackTrail(fromScr.x, fromScr.y, toScr.x, toScr.y);
        }));

        // Unit defeated → floating text
        this._unsubs.push(eventBus.on(GameEvents.UNIT_DEFEATED, (instance) => {
            const units = this._battleManager.field.units;
            for (const unit of units) {
                if (unit.spriteInstance === instance) {
                    this._renderer.addFloatingText(unit.worldPos.x, unit.worldPos.y,
                        'KO!', '#ff4444', 18);
                    this._renderer.addEffect(unit.worldPos.x, unit.worldPos.y, '#ff0000', 24, 0.5);
                    break;
                }
            }
        }));
    }

    _updateBattleLog() {
        if (!this._logPanelEl) return;
        const events = this._battleManager.getRecentEvents(8);
        let html = '';
        for (const e of events) {
            const time = `${Math.floor(e.time)}s`;
            switch (e.type) {
                case 'damage':
                    html += `<div><span style="color:#888">[${time}]</span> ${e.attacker} → ${e.target} <span style="color:#ff6633">-${e.damage}</span>${e.isCrit ? ' <span style="color:#ffaa00">CRIT!</span>' : ''}</div>`;
                    break;
                case 'ability':
                    html += `<div><span style="color:#888">[${time}]</span> ${e.caster} used <span style="color:#88ccff">${e.ability}</span> → ${e.target} <span style="color:#ff6633">-${e.damage}</span></div>`;
                    break;
                case 'heal':
                    html += `<div><span style="color:#888">[${time}]</span> ${e.caster} healed ${e.target} <span style="color:#44ff88">+${e.amount}</span></div>`;
                    break;
                case 'faint':
                    html += `<div><span style="color:#888">[${time}]</span> <span style="color:#ff4444">${e.unit} defeated!</span></div>`;
                    break;
                case 'miss':
                    html += `<div><span style="color:#888">[${time}]</span> ${e.attacker} missed ${e.target}</div>`;
                    break;
            }
        }
        this._logPanelEl.innerHTML = html;
        this._logPanelEl.scrollTop = this._logPanelEl.scrollHeight;
    }

    // ═══════════════════════════════════════════════════════════════
    // Team Resolution
    // ═══════════════════════════════════════════════════════════════

    _resolveTeam(teamData) {
        const resolved = [];
        for (const raw of teamData) {
            // Already enriched (has instance, raceData, stageData) — pass through
            if (raw.instance && raw.raceData && raw.stageData) {
                resolved.push(raw);
                continue;
            }

            const raceId = (raw.instance || raw).raceId || raw.raceId || 1;
            const raceData = SPRITE_RACES.find(r => r.race_id === raceId);
            if (!raceData) {
                console.warn(`RTSBattleScene._resolveTeam: No race data for raceId=${raceId}, skipping.`);
                continue;
            }

            // Resolve formId: player data has formId, enemies have stage (0-2)
            let formId = raw.formId || (raw.instance || raw).formId;
            if (formId == null) {
                const stageIdx = raw.stage != null ? raw.stage : 0;
                formId = raceId * 3 - 2 + stageIdx;
            }
            const stageData = EVOLUTION_FORMS[formId] || EVOLUTION_FORMS[1];
            const level = (raw.instance || raw).level || raw.level || 1;

            // Build instance object with calculateAllEffectiveStats method
            // (mirrors BattleScene._enrichTeamData pattern)
            const sourceInst = raw.instance || raw;
            const instance = {
                ...sourceInst,
                raceId,
                formId,
                level,
                nickname: sourceInst.nickname || '',
                calculateAllEffectiveStats(rd, sd) {
                    let result;
                    // Player sprites have pre-computed stats — use them
                    // Check that stats actually has meaningful values (not empty object)
                    const hasStats = this.stats && this.maxHp &&
                        (this.stats.attack || this.stats.atk || this.stats.defense || this.stats.def);
                    if (hasStats) {
                        result = {
                            hp: this.maxHp,
                            atk: this.stats.attack || this.stats.atk || 1,
                            def: this.stats.defense || this.stats.def || 1,
                            spd: this.stats.speed || this.stats.spd || 1,
                            sp_atk: this.stats.specialAttack || this.stats.sp_atk || 1,
                            sp_def: this.stats.specialDefense || this.stats.sp_def || 1,
                        };
                    } else {
                        // Enemy sprites: compute from base_stats, growth, level, stage mult
                        result = {};
                        const keys = ['hp', 'atk', 'def', 'spd', 'sp_atk', 'sp_def'];
                        for (const key of keys) {
                            const base = rd.base_stats[key] || 10;
                            const growth = rd.growth_rates[key] || 1;
                            const mult = sd.stat_multipliers[key] || 1;
                            result[key] = Math.max(1, Math.floor((base + growth * this.level) * mult));
                        }
                    }

                    // Apply equipment stat bonuses per EquipmentSystemDesign.md
                    // Final Stat = Base Stat + Equipment Bonus + Synergy Multiplier
                    const eq = this.equipment || {};
                    const spriteElements = rd.element_types || this.elementTypes || [];
                    const spriteClass = rd.class_type || this.classType || '';
                    const statKeys = ['hp', 'atk', 'def', 'spd', 'sp_atk', 'sp_def'];

                    for (const slotKey of Object.keys(eq)) {
                        const eqId = eq[slotKey];
                        if (!eqId) continue;
                        const eqData = typeof eqId === 'object' ? eqId : findEquipmentWithExpansion(eqId);
                        if (!eqData || !eqData.stat_bonuses) continue;

                        // Calculate synergy multiplier
                        let synergyMult = 1.0;
                        if (eqData.element_synergy && spriteElements.includes(eqData.element_synergy)) {
                            synergyMult *= (eqData.element_synergy_multiplier || 1.0);
                        }
                        if (eqData.class_synergy && eqData.class_synergy === spriteClass) {
                            synergyMult *= (eqData.class_synergy_multiplier || 1.0);
                        }

                        // Add equipment bonuses with synergy
                        for (const key of statKeys) {
                            const bonus = eqData.stat_bonuses[key] || 0;
                            if (bonus > 0) {
                                result[key] = Math.floor(result[key] + bonus * synergyMult);
                            }
                        }
                    }

                    return result;
                },
            };

            // Ensure equipment is present — generate tier-appropriate gear for enemies
            if (!instance.equipment || Object.keys(instance.equipment).length === 0) {
                instance.equipment = RTSBattleScene._generateEquipmentForLevel(level, raceData);
            }

            const abilities = _resolveAbilities(raw, raceData, stageData, level);

            resolved.push({
                instance,
                raceData,
                stageData,
                abilities,
                position: raw.position || null,
            });
        }
        return resolved;
    }

    // ═══════════════════════════════════════════════════════════════
    // Equipment Generation (for enemies / units without gear)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate level-appropriate equipment for a unit.
     * Picks items the unit qualifies for by level, biased toward matching element.
     */
    static _generateEquipmentForLevel(level, raceData) {
        const eq = {};
        const slots = ['weapon', 'helmet', 'chest', 'boots'];
        const elemTypes = raceData ? raceData.element_types : [];

        for (const slot of slots) {
            // Find items for this slot that the unit can equip
            const candidates = EQUIPMENT.filter(e =>
                e.slot_type === slot && e.level_requirement <= level
            );
            if (candidates.length === 0) continue;

            // Prefer element synergy matches, then pick the best by level req
            let best = null;
            let bestScore = -1;
            for (const c of candidates) {
                let score = c.level_requirement;
                if (c.element_synergy && elemTypes.includes(c.element_synergy)) {
                    score += 10; // Prefer synergy matches
                }
                if (score > bestScore) {
                    bestScore = score;
                    best = c;
                }
            }
            if (best) {
                eq[slot] = best.equipment_id;
            }
        }
        return eq;
    }

    // ═══════════════════════════════════════════════════════════════
    // Rewards & Exit
    // ═══════════════════════════════════════════════════════════════

    _calculateRewards() {
        if (this._battleResult !== 'player_win') return;

        const stats = this._battleManager.stats;
        const xp = 50 + stats.unitsDefeated.enemy * 20 + Math.floor(this._battleManager.elapsedTime * 0.5);
        const gold = 25 + stats.unitsDefeated.enemy * 10;

        // Roll equipment loot drops
        const battleType = this._isBoss ? 'boss' : 'normal';
        const difficulty = this._deriveDifficulty();
        const playerLevel = this._getHighestPlayerLevel();
        const battleElement = this._deriveBattleElement();

        const loot = rollBattleLoot(battleType, difficulty, playerLevel, battleElement);

        this._battleRewards = { xp, gold, loot };
    }

    // ═══════════════════════════════════════════════════════════════
    // Loot Helpers
    // ═══════════════════════════════════════════════════════════════

    /**
     * Derive a 1-10 difficulty score from the enemy team data.
     * Uses average enemy level relative to player level, boss flag, and team size.
     * @returns {number}
     */
    _deriveDifficulty() {
        const playerLevel = this._getHighestPlayerLevel();
        let avgEnemyLevel = 1;

        if (this._enemyTeamData.length > 0) {
            let total = 0;
            for (const e of this._enemyTeamData) {
                const inst = e.instance || e;
                total += inst.level || 1;
            }
            avgEnemyLevel = total / this._enemyTeamData.length;
        }

        // Base difficulty from level ratio (enemy vs player)
        let diff = Math.round((avgEnemyLevel / Math.max(1, playerLevel)) * 5);

        // Boss battles are harder
        if (this._isBoss) diff += 2;

        // More enemies = harder
        if (this._enemyTeamData.length >= 5) diff += 1;

        return Math.max(1, Math.min(10, diff));
    }

    /**
     * Get the highest level among the player's team sprites.
     * @returns {number}
     */
    _getHighestPlayerLevel() {
        let highest = 1;
        for (const p of this._playerTeamData) {
            const inst = p.instance || p;
            const level = inst.level || 1;
            if (level > highest) highest = level;
        }
        return highest;
    }

    /**
     * Derive the dominant element of the battle from enemy team composition.
     * Returns the most common element type among enemies, or null if mixed.
     * @returns {string|null}
     */
    _deriveBattleElement() {
        const counts = {};
        for (const e of this._enemyTeamData) {
            const inst = e.instance || e;
            const raceData = e.raceData;
            const elems = (raceData && raceData.element_types) || inst.elementTypes || [];
            for (const elem of elems) {
                counts[elem] = (counts[elem] || 0) + 1;
            }
        }

        let bestElem = null;
        let bestCount = 0;
        for (const [elem, count] of Object.entries(counts)) {
            if (count > bestCount) {
                bestCount = count;
                bestElem = elem;
            }
        }
        return bestElem;
    }

    _exitBattle() {
        const result = this._battleResult || 'draw';
        this.engine.scenes.changeTo('overworld', {
            battleResult: result,
            rewards: this._battleRewards || null,
            returnData: this._returnData,
        });
    }
}

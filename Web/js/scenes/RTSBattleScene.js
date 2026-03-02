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

// ── UI Constants ────────────────────────────────────────────────────────────
const INTRO_DURATION = 2.0;
const END_SCREEN_DELAY = 1.5;
const SPEED_LABELS = { 1: '1x', 2: '2x', 3: '3x' };

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
        if (ab.element_type === elemType || ab.element_type === '') {
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

        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
        }
        this._domContainer = null;
        this._speedBtnEl = null;
        this._pauseBtnEl = null;
        this._logPanelEl = null;
        this._endScreenEl = null;
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
            // Space or tap: pause
            if (input.isKeyJustPressed('Space') || (input.pointerJustPressed && input.isTap && input.isTap())) {
                const isPaused = this._battleManager.togglePause();
                if (this._pauseBtnEl) {
                    this._pauseBtnEl.textContent = isPaused ? '▶ PLAY' : '⏸ PAUSE';
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

        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(460, 4, 40, 18);
        ctx.fillStyle = '#ddd';
        ctx.fillText(timeStr, 480, 17);

        // Unit count
        const pAlive = mgr.field ? mgr.field.getLivingUnits(0).length : 0;
        const eAlive = mgr.field ? mgr.field.getLivingUnits(1).length : 0;

        ctx.font = 'bold 12px monospace';
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
            ctx.font = 'bold 16px monospace';
            ctx.fillText(`${mgr.speedMultiplier}x`, 480, 36);
        }

        // Pause indicator
        if (mgr.isPaused) {
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(380, 250, 200, 40);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px monospace';
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

        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = this._isBoss ? '#ff4444' : '#ffffff';
        ctx.fillText(this._isBoss ? 'BOSS BATTLE!' : 'BATTLE START!', 480, 270);

        ctx.font = '14px monospace';
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
            border: 1px solid #555; border-radius: 4px; font: bold 12px monospace;
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
            border: 1px solid #555; border-radius: 4px; font: bold 12px monospace;
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
            font: 10px monospace; padding: 4px 6px; border-radius: 4px;
            pointer-events: auto;
        `;

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
            min-width: 280px;
        `;

        const isWin = this._battleResult === 'player_win';
        const stats = this._battleManager.stats;

        this._endScreenEl.innerHTML = `
            <div style="font: bold 24px monospace; color: ${isWin ? '#44ff88' : '#ff4444'}; margin-bottom: 12px;">
                ${isWin ? 'VICTORY!' : this._battleResult === 'draw' ? 'DRAW' : 'DEFEAT'}
            </div>
            <div style="font: 12px monospace; color: #aaa; margin-bottom: 16px;">
                Time: ${Math.floor(this._battleManager.elapsedTime)}s
            </div>
            <div style="display: flex; gap: 24px; justify-content: center; margin-bottom: 16px;">
                <div>
                    <div style="color: #4488ff; font: bold 11px monospace;">PLAYER</div>
                    <div style="font: 10px monospace; color: #ccc;">
                        DMG: ${stats.totalDamageDealt.player}<br>
                        KOs: ${stats.unitsDefeated.player}<br>
                        Abilities: ${stats.abilitiesUsed.player}
                    </div>
                </div>
                <div>
                    <div style="color: #ff4444; font: bold 11px monospace;">ENEMY</div>
                    <div style="font: 10px monospace; color: #ccc;">
                        DMG: ${stats.totalDamageDealt.enemy}<br>
                        KOs: ${stats.unitsDefeated.enemy}<br>
                        Abilities: ${stats.abilitiesUsed.enemy}
                    </div>
                </div>
            </div>
            ${isWin && this._battleRewards ? `
                <div style="font: 11px monospace; color: #ffcc44; margin-bottom: 12px;">
                    +${this._battleRewards.xp} XP &nbsp; +${this._battleRewards.gold} Gold
                </div>
            ` : ''}
            <div style="font: 11px monospace; color: #888;">
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

        // Ability used → log update
        this._unsubs.push(eventBus.on(GameEvents.ABILITY_USED, () => {
            this._updateBattleLog();
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
            const instance = raw.instance || raw;
            const raceId = instance.raceId || raw.raceId || 1;
            const raceData = SPRITE_RACES.find(r => r.race_id === raceId);
            if (!raceData) continue;

            const formId = raw.formId || instance.formId || raceData.evolution_chain[0];
            const stageData = EVOLUTION_FORMS[formId] || EVOLUTION_FORMS[1];
            const level = instance.level || raw.level || 1;
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
    // Rewards & Exit
    // ═══════════════════════════════════════════════════════════════

    _calculateRewards() {
        if (this._battleResult !== 'player_win') return;

        const stats = this._battleManager.stats;
        const xp = 50 + stats.unitsDefeated.player * 20 + Math.floor(this._battleManager.elapsedTime * 0.5);
        const gold = 25 + stats.unitsDefeated.player * 10;

        this._battleRewards = { xp, gold };
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

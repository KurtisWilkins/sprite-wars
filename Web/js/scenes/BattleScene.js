/**
 * BattleScene -- Core 5v5 grid-based battle scene for Sprite Wars.
 * Renders a 6x8 BattleGrid on Canvas with units, health bars, status icons,
 * floating damage numbers, turn order bar, ability selection, and battle log.
 *
 * Uses Canvas for the battlefield + DOM overlays for ability bar, turn order,
 * and the battle log panel.
 *
 * enter(data) receives:
 *   { playerTeam: [...], enemyTeam: [...], background: string, isBoss: bool }
 */

import { Scene } from '../core/SceneManager.js';
import { eventBus, GameEvents } from '../core/EventBus.js';
import { BattleManager } from '../systems/battle/BattleManager.js';
import { BattleGrid } from '../systems/battle/BattleGrid.js';
import { BattleUnit } from '../systems/battle/BattleUnit.js';
import { DamageCalculator } from '../systems/battle/DamageCalculator.js';
import { TurnOrderSystem } from '../systems/battle/TurnOrderSystem.js';
import { BattleAI } from '../systems/battle/BattleAI.js';
import { StatusEffectSystem } from '../systems/battle/StatusEffectSystem.js';
import { AbilityExecutor } from '../systems/battle/AbilityExecutor.js';
import { AssetRegistry } from '../data/AssetRegistry.js';
import { UnitRenderer, ELEMENT_COLORS as UR_ELEMENT_COLORS } from '../systems/ui/UnitRenderer.js';

// ── Layout Constants ────────────────────────────────────────────────────────
const GRID_PADDING_X = 24;
const GRID_PADDING_TOP = 72;
const CELL_SIZE = 48;
const CELL_GAP = 4;
const TURN_ORDER_HEIGHT = 52;
const BATTLE_LOG_MAX_LINES = 40;

// ── Colors ──────────────────────────────────────────────────────────────────
const COLOR_GRID_PLAYER = 'rgba(50, 120, 200, 0.15)';
const COLOR_GRID_ENEMY = 'rgba(200, 50, 50, 0.15)';
const COLOR_GRID_LINES = 'rgba(255,255,255,0.08)';
const COLOR_CELL_HIGHLIGHT = 'rgba(255, 255, 100, 0.35)';
const COLOR_CELL_TARGET_VALID = 'rgba(0, 255, 100, 0.25)';
const COLOR_CELL_TARGET_HOVER = 'rgba(0, 255, 100, 0.50)';
const COLOR_HP_GREEN = '#33cc66';
const COLOR_HP_YELLOW = '#cccc33';
const COLOR_HP_RED = '#cc3333';
const COLOR_BG_DEFAULT = '#0d0d1e';
const COLOR_BG_BOSS = '#1a0a0a';

// ── Battle Phases ───────────────────────────────────────────────────────────
const PHASE_INTRO = 'intro';
const PHASE_TURNS = 'turns';
const PHASE_PLAYER_SELECT_ABILITY = 'player_select_ability';
const PHASE_PLAYER_SELECT_TARGET = 'player_select_target';
const PHASE_ANIMATING = 'animating';
const PHASE_BATTLE_END = 'battle_end';

// ── Element Color Map (canonical UnitRenderer palette + local overrides) ─────
const ELEMENT_COLORS = {
    ...UR_ELEMENT_COLORS,
    // Legacy aliases used in some ability/unit data
    Wind: '#88ccaa',
    Dragon: '#6633cc',
};

export class BattleScene extends Scene {
    constructor(engine) {
        super(engine);

        // ── Battle subsystems ─────────────────────────────────────────
        this._battleManager = new BattleManager();

        // ── Scene state ───────────────────────────────────────────────
        this._phase = PHASE_INTRO;
        this._introTimer = 0;
        this._isBoss = false;
        this._bgColor = COLOR_BG_DEFAULT;
        this._bgImage = null;

        // ── Grid rendering state ──────────────────────────────────────
        this._gridOriginX = 0;
        this._gridOriginY = 0;

        // ── Unit rendering cache ──────────────────────────────────────
        /** @type {Map<BattleUnit, {spriteImg: HTMLImageElement|null, x: number, y: number}>} */
        this._unitRenderCache = new Map();

        // ── Floating text overlays (damage numbers, status text) ──────
        /** @type {Array<{text: string, x: number, y: number, color: string, age: number, duration: number, size: number, offsetY: number}>} */
        this._floatingTexts = [];

        // ── Ability selection state ───────────────────────────────────
        this._selectedAbilityIndex = -1;
        this._selectedAbility = null;
        this._validTargetPositions = [];
        this._hoveredCell = null;

        // ── Turn order cache ──────────────────────────────────────────
        this._turnOrderUnits = [];

        // ── Battle log ────────────────────────────────────────────────
        this._battleLog = [];

        // ── Battle result ─────────────────────────────────────────────
        this._battleResult = null;
        this._resultTimer = 0;

        // ── Input data from enter() ───────────────────────────────────
        this._playerTeamData = [];
        this._enemyTeamData = [];

        // ── DOM elements ──────────────────────────────────────────────
        this._domContainer = null;
        this._abilityBarEl = null;
        this._turnOrderBarEl = null;
        this._battleLogEl = null;
        this._endScreenEl = null;

        // ── Animation queue ───────────────────────────────────────────
        this._animQueue = [];
        this._currentAnim = null;
        this._animTimer = 0;

        // ── Event unsubscribers ───────────────────────────────────────
        this._unsubs = [];

        // ── Auto battle ───────────────────────────────────────────────
        this._autoBattle = false;

        // ── Pending turn advance delay ────────────────────────────────
        this._turnAdvanceDelay = 0;

        // ── Time tracker for UnitRenderer animations ──────────────────
        this._time = 0;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════

    async init() {
        this.initialized = true;
    }

    enter(data) {
        this._playerTeamData = data.playerTeam || [];
        this._enemyTeamData = data.enemyTeam || [];
        this._isBoss = !!data.isBoss;
        this._bgColor = this._isBoss ? COLOR_BG_BOSS : COLOR_BG_DEFAULT;
        this._bgImage = null;

        // Reset state
        this._phase = PHASE_INTRO;
        this._introTimer = 0;
        this._floatingTexts = [];
        this._battleLog = [];
        this._battleResult = null;
        this._resultTimer = 0;
        this._selectedAbilityIndex = -1;
        this._selectedAbility = null;
        this._validTargetPositions = [];
        this._hoveredCell = null;
        this._animQueue = [];
        this._currentAnim = null;
        this._animTimer = 0;
        this._autoBattle = false;
        this._turnAdvanceDelay = 0;
        this._unitRenderCache.clear();

        // Calculate grid layout
        const designW = this.engine.designWidth;
        this._gridOriginX = Math.floor((designW - (BattleGrid.GRID_WIDTH * (CELL_SIZE + CELL_GAP) - CELL_GAP)) / 2);
        this._gridOriginY = GRID_PADDING_TOP + TURN_ORDER_HEIGHT;

        // Load background image if specified
        if (data.background) {
            this.engine.assets.loadImage(data.background)
                .then(img => { this._bgImage = img; })
                .catch(() => {});
        }

        // Preload unit assets via UnitRenderer for rich composite rendering
        UnitRenderer.preloadTeam(this.engine, this._playerTeamData).catch(() => {});
        UnitRenderer.preloadTeam(this.engine, this._enemyTeamData).catch(() => {});

        // Build DOM overlays
        this._createDOMOverlays();

        // Subscribe to battle events
        this._subscribeEvents();

        // Play battle music
        const musicTrack = this._isBoss ? 'Audio/Music/BossBattle.wav' : 'Audio/Music/BattleTheme.wav';
        this.engine.audio.playMusic(
            this.engine.assets.resolvePath(musicTrack)
        );

        eventBus.emit(GameEvents.SCREEN_OPENED, 'battle');
    }

    exit() {
        // Unsubscribe all event listeners
        for (const unsub of this._unsubs) {
            if (typeof unsub === 'function') unsub();
        }
        this._unsubs = [];

        // Remove DOM overlays
        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
        }
        this._domContainer = null;
        this._abilityBarEl = null;
        this._turnOrderBarEl = null;
        this._battleLogEl = null;
        this._endScreenEl = null;

        this._unitRenderCache.clear();

        eventBus.emit(GameEvents.SCREEN_CLOSED, 'battle');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Update
    // ═══════════════════════════════════════════════════════════════════

    update(dt) {
        this._time += dt;

        switch (this._phase) {
            case PHASE_INTRO:
                this._updateIntro(dt);
                break;

            case PHASE_TURNS:
            case PHASE_PLAYER_SELECT_ABILITY:
            case PHASE_PLAYER_SELECT_TARGET:
                this._updateTurns(dt);
                break;

            case PHASE_ANIMATING:
                this._updateAnimations(dt);
                break;

            case PHASE_BATTLE_END:
                this._resultTimer += dt;
                break;
        }

        // Update floating texts
        this._updateFloatingTexts(dt);

        // Update turn advance delay
        if (this._turnAdvanceDelay > 0) {
            this._turnAdvanceDelay -= dt;
            if (this._turnAdvanceDelay <= 0) {
                this._turnAdvanceDelay = 0;
                this._advanceTurn();
            }
        }

        super.update(dt);
    }

    _updateIntro(dt) {
        this._introTimer += dt;
        if (this._introTimer >= 1.2) {
            // Start the actual battle
            this._startBattle();
            this._phase = PHASE_TURNS;
            this._advanceTurn();
        }
    }

    _updateTurns(dt) {
        // Refresh turn order display
        this._refreshTurnOrderUI();
    }

    _updateAnimations(dt) {
        if (this._currentAnim) {
            this._animTimer += dt;
            if (this._animTimer >= this._currentAnim.duration) {
                // Complete current animation
                if (this._currentAnim.onComplete) {
                    this._currentAnim.onComplete();
                }
                this._currentAnim = null;
                this._animTimer = 0;
            }
        }

        if (!this._currentAnim && this._animQueue.length > 0) {
            this._currentAnim = this._animQueue.shift();
            this._animTimer = 0;
        }

        if (!this._currentAnim && this._animQueue.length === 0) {
            // All animations done, return to turn processing
            if (this._battleManager.isBattleActive) {
                this._phase = PHASE_TURNS;
                // Small delay before next turn for readability
                this._turnAdvanceDelay = 0.4;
            }
        }
    }

    _updateFloatingTexts(dt) {
        for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
            const ft = this._floatingTexts[i];
            ft.age += dt;
            ft.offsetY -= 30 * dt; // Float upward
            if (ft.age >= ft.duration) {
                this._floatingTexts.splice(i, 1);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════════════

    render(renderer) {
        const ctx = renderer.ctx;

        // Background
        if (this._bgImage && this._bgImage.complete) {
            renderer.drawImageRaw(this._bgImage, 0, 0, this.engine.designWidth, this.engine.designHeight);
        } else {
            renderer.clear(this._bgColor);
        }

        // Draw grid
        this._renderGrid(ctx, renderer);

        // Draw units
        this._renderUnits(ctx, renderer);

        // Draw floating texts
        this._renderFloatingTexts(ctx, renderer);

        // Draw intro overlay
        if (this._phase === PHASE_INTRO) {
            this._renderIntroOverlay(ctx, renderer);
        }

        super.render(renderer);
    }

    _renderGrid(ctx, renderer) {
        const gx = this._gridOriginX;
        const gy = this._gridOriginY;

        // Draw cell backgrounds
        for (let y = 0; y < BattleGrid.TOTAL_HEIGHT; y++) {
            for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
                const cellX = gx + x * (CELL_SIZE + CELL_GAP);
                const cellY = gy + y * (CELL_SIZE + CELL_GAP);
                const isPlayerSide = y <= BattleGrid.PLAYER_ROW_MAX;

                // Base cell color
                ctx.fillStyle = isPlayerSide ? COLOR_GRID_PLAYER : COLOR_GRID_ENEMY;
                ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);

                // Highlight current unit's cell
                const bm = this._battleManager;
                if (bm.currentUnit) {
                    const pos = bm.currentUnit.gridPosition;
                    if (pos.x === x && pos.y === y) {
                        ctx.fillStyle = COLOR_CELL_HIGHLIGHT;
                        ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
                    }
                }

                // Show valid target cells
                if (this._phase === PHASE_PLAYER_SELECT_TARGET) {
                    const isValidTarget = this._validTargetPositions.some(
                        p => p.x === x && p.y === y
                    );
                    if (isValidTarget) {
                        const isHovered = this._hoveredCell &&
                            this._hoveredCell.x === x && this._hoveredCell.y === y;
                        ctx.fillStyle = isHovered ? COLOR_CELL_TARGET_HOVER : COLOR_CELL_TARGET_VALID;
                        ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
                    }
                }

                // Cell border
                ctx.strokeStyle = COLOR_GRID_LINES;
                ctx.lineWidth = 1;
                ctx.strokeRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            }
        }

        // Draw divider between player and enemy sides
        const dividerY = gy + BattleGrid.GRID_HEIGHT_PER_SIDE * (CELL_SIZE + CELL_GAP) - CELL_GAP / 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx - 4, dividerY);
        ctx.lineTo(gx + BattleGrid.GRID_WIDTH * (CELL_SIZE + CELL_GAP), dividerY);
        ctx.stroke();
    }

    _renderUnits(ctx, renderer) {
        const gx = this._gridOriginX;
        const gy = this._gridOriginY;
        const grid = this._battleManager.grid;
        if (!grid) return;

        const cellStep = CELL_SIZE + CELL_GAP;

        for (let y = 0; y < BattleGrid.TOTAL_HEIGHT; y++) {
            for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
                const unit = grid.getUnitAt({ x, y });
                if (!unit || !unit.isAlive) continue;

                const cellX = gx + x * cellStep;
                const cellY = gy + y * cellStep;
                const centerX = cellX + CELL_SIZE / 2;
                const centerY = cellY + CELL_SIZE / 2;
                const spriteSize = CELL_SIZE - 8; // leave some padding

                // Update render cache position for floating text placement
                let cache = this._unitRenderCache.get(unit);
                if (!cache) {
                    cache = { spriteImg: null, x: cellX, y: cellY };
                    this._unitRenderCache.set(unit, cache);
                }
                cache.x = cellX;
                cache.y = cellY;

                // Draw fully composited unit via UnitRenderer
                const inst = unit.spriteInstance || unit.spriteData || unit;
                UnitRenderer.draw(ctx, inst, centerX, centerY, spriteSize, {
                    time: this._time,
                    team: unit.team,
                    showHpBar: true,
                    hpFraction: unit.getHpFraction ? unit.getHpFraction() : (unit.currentHp / unit.maxHp),
                    showLevel: true,
                    showAura: true,
                    showWeapon: true,
                    showArmorGlow: true,
                    showElementBadge: true,
                    showStatusIcons: true,
                    isSelected: unit === this._battleManager.currentUnit,
                    statusEffects: unit.activeStatusEffects || [],
                    direction: unit.facing || 0,
                });

                // Draw name label for current unit
                if (this._battleManager.currentUnit === unit) {
                    renderer.drawText(unit.getDisplayName(), centerX, cellY - 3, {
                        color: '#ffffff',
                        font: 'bold 9px sans-serif',
                        align: 'center',
                        baseline: 'bottom',
                    });
                }
            }
        }
    }

    _renderFloatingTexts(ctx, renderer) {
        for (const ft of this._floatingTexts) {
            const alpha = Math.max(0, 1 - ft.age / ft.duration);
            renderer.save();
            renderer.setAlpha(alpha);
            renderer.drawText(ft.text, ft.x, ft.y + ft.offsetY, {
                color: ft.color,
                font: `bold ${ft.size}px sans-serif`,
                align: 'center',
                baseline: 'middle',
                shadow: true,
                shadowColor: 'rgba(0,0,0,0.6)',
            });
            renderer.restore();
        }
    }

    _renderIntroOverlay(ctx, renderer) {
        const alpha = Math.min(1, this._introTimer / 0.5);
        renderer.save();
        renderer.setAlpha(alpha);

        const centerX = this.engine.designWidth / 2;
        const centerY = this.engine.designHeight / 2;

        const label = this._isBoss ? 'BOSS BATTLE!' : 'BATTLE START!';
        const textColor = this._isBoss ? '#ff4444' : '#ffcc33';

        renderer.drawText(label, centerX, centerY, {
            color: textColor,
            font: 'bold 28px sans-serif',
            align: 'center',
            baseline: 'middle',
            shadow: true,
            shadowColor: 'rgba(0,0,0,0.5)',
        });

        renderer.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Input
    // ═══════════════════════════════════════════════════════════════════

    onInput(input) {
        const px = input.pointerPos.x;
        const py = input.pointerPos.y;

        // Calculate hovered grid cell
        this._hoveredCell = this._screenToGrid(px, py);

        if (this._phase === PHASE_BATTLE_END) {
            // Tap anywhere or press Enter to continue after result screen
            if (input.isTap() || input.isKeyJustPressed('Enter') || input.isKeyJustPressed('Space')) {
                if (this._resultTimer > 1.0) {
                    this._exitBattle();
                }
            }
            return;
        }

        if (this._phase === PHASE_PLAYER_SELECT_ABILITY) {
            // Keyboard: number keys to select ability
            for (let i = 0; i < 4; i++) {
                if (input.isKeyJustPressed(`Digit${i + 1}`)) {
                    this._selectAbility(i);
                }
            }
            // Toggle auto-battle with 'A' key
            if (input.isKeyJustPressed('KeyA')) {
                this._toggleAutoBattle();
            }
            // Escape to flee (non-boss only)
            if (input.isKeyJustPressed('Escape') && !this._isBoss) {
                this._attemptFlee();
            }
            return;
        }

        if (this._phase === PHASE_PLAYER_SELECT_TARGET) {
            // Escape/right-click to go back to ability selection
            if (input.isKeyJustPressed('Escape')) {
                this._cancelTargetSelection();
                return;
            }

            // Tap on a valid target cell
            if (input.isTap() && this._hoveredCell) {
                const isValid = this._validTargetPositions.some(
                    p => p.x === this._hoveredCell.x && p.y === this._hoveredCell.y
                );
                if (isValid) {
                    this._confirmTarget(this._hoveredCell);
                }
            }
            return;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Battle Lifecycle
    // ═══════════════════════════════════════════════════════════════════

    _startBattle() {
        const config = {};

        // Provide element chart from engine data if available
        if (this.engine.data && this.engine.data.elementChart) {
            config.elementChart = this.engine.data.elementChart;
        }
        if (this.engine.data && this.engine.data.statusDb) {
            config.statusDb = this.engine.data.statusDb;
        }

        this._battleManager.startBattle(
            this._playerTeamData,
            this._enemyTeamData,
            config
        );

        this._addLogEntry('Battle started!');
    }

    _advanceTurn() {
        if (!this._battleManager.isBattleActive) return;

        // Let BattleManager process the next turn
        this._battleManager.processTurn();

        // After processTurn, check what state we are in
        if (this._battleManager.awaitingPlayerInput && !this._autoBattle) {
            this._phase = PHASE_PLAYER_SELECT_ABILITY;
            this._showAbilityBar();
        } else {
            // AI or auto-battle turn was processed; the _endCurrentTurn in
            // BattleManager will call processTurn again via setTimeout.
            // We just keep the phase in TURNS and let event listeners drive animations.
            this._phase = PHASE_TURNS;
        }

        this._refreshTurnOrderUI();
    }

    _toggleAutoBattle() {
        this._autoBattle = !this._autoBattle;
        this._battleManager.toggleAutoBattle();
        if (this._autoBattle) {
            this._hideAbilityBar();
            this._addLogEntry('Auto-Battle enabled.');
        } else {
            this._addLogEntry('Auto-Battle disabled.');
        }
    }

    _attemptFlee() {
        // 50% flee chance for non-boss encounters
        const success = Math.random() < 0.5;
        if (success) {
            this._addLogEntry('Got away safely!');
            this._battleManager.endBattle('draw');
        } else {
            this._addLogEntry('Could not escape!');
            // Skip player's turn as a penalty
            this._battleManager.awaitingPlayerInput = false;
            this._hideAbilityBar();
            this._phase = PHASE_TURNS;
            this._turnAdvanceDelay = 0.6;
        }
    }

    _exitBattle() {
        this.engine.audio.stopMusic(400);
        const result = this._battleResult;

        if (result === 'player_win') {
            // Return to overworld (or caller) with victory data
            this.engine.scenes.popScene().catch(() => {
                this.engine.scenes.changeTo('overworld', {
                    battleResult: result,
                });
            });
        } else {
            // Defeat or draw: return to overworld
            this.engine.scenes.popScene().catch(() => {
                this.engine.scenes.changeTo('overworld', {
                    battleResult: result,
                });
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Ability Selection
    // ═══════════════════════════════════════════════════════════════════

    _showAbilityBar() {
        if (!this._abilityBarEl) return;

        const unit = this._battleManager.currentUnit;
        if (!unit) return;

        this._abilityBarEl.innerHTML = '';
        this._abilityBarEl.classList.remove('hidden');

        // Unit name label
        const nameLabel = document.createElement('div');
        nameLabel.className = 'battle-ability-unit-name';
        nameLabel.textContent = unit.getDisplayName();
        nameLabel.style.cssText = 'color:#ffcc33;font-weight:700;font-size:0.8rem;margin-bottom:4px;text-align:center;';
        this._abilityBarEl.appendChild(nameLabel);

        // Ability buttons container
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;';

        const abilityDb = this._battleManager._abilityDb;

        for (let i = 0; i < unit.equippedAbilities.length; i++) {
            const abilityId = unit.equippedAbilities[i];
            const ability = abilityDb[abilityId];
            if (!ability) continue;

            const canUse = unit.canUseAbility(ability);
            const pp = unit.abilityPp[abilityId] || 0;
            const cdTurns = unit.abilityCooldowns[abilityId] || 0;

            const btn = document.createElement('button');
            btn.className = 'battle-ability-btn';
            const elemColor = ELEMENT_COLORS[ability.elementType] || '#666';
            btn.style.cssText = `
                padding:6px 10px;font-size:0.75rem;border:2px solid ${elemColor};
                border-radius:6px;background:rgba(0,0,0,0.6);color:#fff;
                cursor:${canUse ? 'pointer' : 'not-allowed'};
                opacity:${canUse ? '1' : '0.4'};min-width:70px;
                transition:background 0.15s;
            `;

            const nameSpan = document.createElement('div');
            nameSpan.style.cssText = 'font-weight:700;';
            nameSpan.textContent = `${i + 1}. ${ability.abilityName || `Ability ${abilityId}`}`;
            btn.appendChild(nameSpan);

            const infoSpan = document.createElement('div');
            infoSpan.style.cssText = 'font-size:0.65rem;color:#aaa;';
            if (cdTurns > 0) {
                infoSpan.textContent = `CD: ${cdTurns}`;
            } else {
                infoSpan.textContent = `PP: ${pp}/${ability.ppMax || '?'} | Pwr: ${ability.basePower || 0}`;
            }
            btn.appendChild(infoSpan);

            if (canUse) {
                const idx = i;
                btn.addEventListener('click', () => this._selectAbility(idx));
                btn.addEventListener('mouseenter', () => {
                    btn.style.background = 'rgba(255,255,255,0.1)';
                });
                btn.addEventListener('mouseleave', () => {
                    btn.style.background = 'rgba(0,0,0,0.6)';
                });
            }

            btnContainer.appendChild(btn);
        }

        this._abilityBarEl.appendChild(btnContainer);

        // Action buttons row (Auto-Battle, Flee)
        const actionsRow = document.createElement('div');
        actionsRow.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:4px;';

        const autoBtn = document.createElement('button');
        autoBtn.style.cssText = 'padding:4px 10px;font-size:0.65rem;border:1px solid #555;border-radius:4px;background:rgba(0,0,0,0.4);color:#aaa;cursor:pointer;';
        autoBtn.textContent = 'Auto (A)';
        autoBtn.addEventListener('click', () => this._toggleAutoBattle());
        actionsRow.appendChild(autoBtn);

        if (!this._isBoss) {
            const fleeBtn = document.createElement('button');
            fleeBtn.style.cssText = 'padding:4px 10px;font-size:0.65rem;border:1px solid #553333;border-radius:4px;background:rgba(0,0,0,0.4);color:#aa6666;cursor:pointer;';
            fleeBtn.textContent = 'Flee (Esc)';
            fleeBtn.addEventListener('click', () => this._attemptFlee());
            actionsRow.appendChild(fleeBtn);
        }

        this._abilityBarEl.appendChild(actionsRow);
    }

    _hideAbilityBar() {
        if (this._abilityBarEl) {
            this._abilityBarEl.classList.add('hidden');
        }
    }

    _selectAbility(index) {
        const unit = this._battleManager.currentUnit;
        if (!unit) return;

        const abilityDb = this._battleManager._abilityDb;
        const abilityId = unit.equippedAbilities[index];
        if (abilityId === undefined) return;

        const ability = abilityDb[abilityId];
        if (!ability) return;

        if (!unit.canUseAbility(ability)) return;

        this._selectedAbilityIndex = index;
        this._selectedAbility = ability;

        // Determine valid target positions
        this._validTargetPositions = this._getValidTargetPositions(unit, ability);

        if (this._validTargetPositions.length === 0) {
            this._addLogEntry('No valid targets for this ability.');
            return;
        }

        // For 'self' targeting, auto-confirm
        if (ability.targetingType === 'self') {
            this._confirmTarget(unit.gridPosition);
            return;
        }

        // For 'all' or 'all_allies' patterns, auto-confirm with first target
        if (ability.targetingType === 'all' || ability.targetingType === 'all_allies') {
            this._confirmTarget(this._validTargetPositions[0]);
            return;
        }

        // Enter target selection phase
        this._phase = PHASE_PLAYER_SELECT_TARGET;
        this._hideAbilityBar();
        this._addLogEntry(`Select target for ${ability.abilityName || 'ability'}...`);

        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.4
        );
    }

    _cancelTargetSelection() {
        this._phase = PHASE_PLAYER_SELECT_ABILITY;
        this._selectedAbility = null;
        this._selectedAbilityIndex = -1;
        this._validTargetPositions = [];
        this._showAbilityBar();
    }

    _confirmTarget(targetPos) {
        if (!this._selectedAbility || !this._battleManager.currentUnit) return;

        const abilityId = this._selectedAbility.abilityId;

        this._hideAbilityBar();
        this._phase = PHASE_ANIMATING;
        this._validTargetPositions = [];

        // Queue a brief ability animation
        this._queueAbilityAnimation(this._battleManager.currentUnit, this._selectedAbility, targetPos);

        // Execute the ability through BattleManager
        this._battleManager.executePlayerAbility(abilityId, targetPos);

        this._selectedAbility = null;
        this._selectedAbilityIndex = -1;
    }

    _getValidTargetPositions(unit, ability) {
        const positions = [];
        const executor = this._battleManager.abilityExecutor;
        const grid = this._battleManager.grid;

        const validTargets = executor.getValidTargets(unit, ability, grid);
        for (const target of validTargets) {
            if (target.gridPosition) {
                positions.push({ x: target.gridPosition.x, y: target.gridPosition.y });
            }
        }

        return positions;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Animations
    // ═══════════════════════════════════════════════════════════════════

    _queueAbilityAnimation(caster, ability, targetPos) {
        this._animQueue.push({
            type: 'ability_use',
            caster,
            ability,
            targetPos,
            duration: 0.5,
            onComplete: () => {
                // SFX for ability use
                this.engine.audio.playSFX(
                    this.engine.assets.resolvePath('Audio/Sounds/attack_hit.ogg'), 0.5
                );
            },
        });
    }

    _spawnDamageNumber(unit, amount, color) {
        const cache = this._unitRenderCache.get(unit);
        if (!cache) return;

        const centerX = cache.x + CELL_SIZE / 2;
        const centerY = cache.y + CELL_SIZE / 2;

        this._floatingTexts.push({
            text: `-${amount}`,
            x: centerX + (Math.random() - 0.5) * 16,
            y: centerY,
            color: color || '#ff4444',
            age: 0,
            duration: 1.2,
            size: amount > 50 ? 16 : 12,
            offsetY: 0,
        });
    }

    _spawnHealNumber(unit, amount) {
        const cache = this._unitRenderCache.get(unit);
        if (!cache) return;

        const centerX = cache.x + CELL_SIZE / 2;
        const centerY = cache.y + CELL_SIZE / 2;

        this._floatingTexts.push({
            text: `+${amount}`,
            x: centerX,
            y: centerY,
            color: '#33ff66',
            age: 0,
            duration: 1.0,
            size: 13,
            offsetY: 0,
        });
    }

    _spawnStatusText(unit, text, color) {
        const cache = this._unitRenderCache.get(unit);
        if (!cache) return;

        const centerX = cache.x + CELL_SIZE / 2;
        const topY = cache.y;

        this._floatingTexts.push({
            text,
            x: centerX,
            y: topY,
            color: color || '#ffaa33',
            age: 0,
            duration: 1.5,
            size: 10,
            offsetY: -10,
        });
    }

    _spawnEffectivenessText(unit, label) {
        const colorMap = {
            super_effective: '#ffcc00',
            not_very_effective: '#888888',
            immune: '#aaaaaa',
        };
        const textMap = {
            super_effective: 'Super Effective!',
            not_very_effective: 'Not very effective...',
            immune: 'Immune!',
        };
        if (textMap[label]) {
            this._spawnStatusText(unit, textMap[label], colorMap[label]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Event Subscriptions
    // ═══════════════════════════════════════════════════════════════════

    _subscribeEvents() {
        this._unsubs.push(
            eventBus.on(GameEvents.TURN_STARTED, (spriteInstance) => {
                const unit = this._findUnitByInstance(spriteInstance);
                if (unit) {
                    this._addLogEntry(`${unit.getDisplayName()}'s turn.`);
                    this._refreshTurnOrderUI();
                }
            })
        );

        this._unsubs.push(
            eventBus.on(GameEvents.ABILITY_USED, (casterInst, ability, targetInsts) => {
                const caster = this._findUnitByInstance(casterInst);
                const abilityName = ability ? (ability.abilityName || 'an ability') : 'an ability';
                if (caster) {
                    this._addLogEntry(`${caster.getDisplayName()} used ${abilityName}!`);
                }
            })
        );

        this._unsubs.push(
            eventBus.on(GameEvents.UNIT_DAMAGED, (attackerInst, defenderInst, damage, isCrit, effectiveness) => {
                const defender = this._findUnitByInstance(defenderInst);
                if (defender) {
                    const color = isCrit ? '#ffdd00' : '#ff4444';
                    this._spawnDamageNumber(defender, damage, color);
                    if (isCrit) {
                        this._spawnStatusText(defender, 'CRIT!', '#ffdd00');
                    }
                    // Effectiveness label
                    const label = DamageCalculator.effectivenessLabel(effectiveness);
                    if (label !== 'neutral') {
                        this._spawnEffectivenessText(defender, label);
                    }
                }
            })
        );

        this._unsubs.push(
            eventBus.on(GameEvents.UNIT_HEALED, (targetInst, amount) => {
                const target = this._findUnitByInstance(targetInst);
                if (target) {
                    this._spawnHealNumber(target, amount);
                }
            })
        );

        this._unsubs.push(
            eventBus.on(GameEvents.STATUS_APPLIED, (targetInst, effectData) => {
                const target = this._findUnitByInstance(targetInst);
                if (target && effectData) {
                    this._spawnStatusText(target, effectData.effectName, '#ffaa33');
                    this._addLogEntry(`${target.getDisplayName()} is afflicted with ${effectData.effectName}!`);
                }
            })
        );

        this._unsubs.push(
            eventBus.on(GameEvents.STATUS_REMOVED, (targetInst, effectData) => {
                const target = this._findUnitByInstance(targetInst);
                if (target && effectData) {
                    this._addLogEntry(`${target.getDisplayName()}'s ${effectData.effectName} wore off.`);
                }
            })
        );

        this._unsubs.push(
            eventBus.on(GameEvents.UNIT_DEFEATED, (spriteInst) => {
                const unit = this._findUnitByInstance(spriteInst);
                if (unit) {
                    this._spawnStatusText(unit, 'DEFEATED', '#ff3333');
                    this._addLogEntry(`${unit.getDisplayName()} was defeated!`);
                    this.engine.audio.playSFX(
                        this.engine.assets.resolvePath('Audio/Sounds/unit_faint.ogg'), 0.6
                    );
                }
            })
        );

        this._unsubs.push(
            eventBus.on(GameEvents.BATTLE_ENDED, (data) => {
                this._onBattleEnded(data);
            })
        );
    }

    _findUnitByInstance(spriteInstance) {
        if (!spriteInstance) return null;
        const grid = this._battleManager.grid;
        if (!grid) return null;
        const allUnits = grid.getAllLivingUnits();
        for (const unit of allUnits) {
            if (unit.spriteInstance === spriteInstance) return unit;
        }
        // Also search dead units in the render cache
        for (const [unit] of this._unitRenderCache) {
            if (unit.spriteInstance === spriteInstance) return unit;
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Battle End
    // ═══════════════════════════════════════════════════════════════════

    _onBattleEnded(data) {
        this._battleResult = data.result;
        this._resultTimer = 0;
        this._phase = PHASE_BATTLE_END;
        this._hideAbilityBar();

        const isVictory = data.result === 'player_win';
        const label = isVictory ? 'VICTORY!' : data.result === 'draw' ? 'DRAW' : 'DEFEAT';
        this._addLogEntry(`Battle ended: ${label} (${data.rounds} rounds)`);

        // Play result SFX
        const sfx = isVictory ? 'Audio/Sounds/battle_victory.ogg' : 'Audio/Sounds/battle_defeat.ogg';
        this.engine.audio.playSFX(this.engine.assets.resolvePath(sfx), 0.7);

        // Stop battle music
        this.engine.audio.stopMusic(800);

        // Show end screen overlay
        this._showBattleEndScreen(data);
    }

    _showBattleEndScreen(data) {
        if (!this._endScreenEl) return;

        this._endScreenEl.innerHTML = '';
        this._endScreenEl.classList.remove('hidden');

        const isVictory = data.result === 'player_win';
        const container = document.createElement('div');
        container.style.cssText = `
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            width:100%;height:100%;background:rgba(0,0,0,0.75);
        `;

        // Result title
        const title = document.createElement('div');
        title.style.cssText = `
            font-size:2rem;font-weight:900;margin-bottom:16px;
            color:${isVictory ? '#ffcc33' : data.result === 'draw' ? '#aaaacc' : '#ff4444'};
            text-shadow:0 0 20px ${isVictory ? 'rgba(255,204,51,0.4)' : 'rgba(255,68,68,0.4)'};
        `;
        title.textContent = isVictory ? 'VICTORY!' : data.result === 'draw' ? 'DRAW' : 'DEFEAT';
        container.appendChild(title);

        // Rounds info
        const roundsInfo = document.createElement('div');
        roundsInfo.style.cssText = 'color:#aaa;font-size:0.85rem;margin-bottom:20px;';
        roundsInfo.textContent = `Completed in ${data.rounds} rounds`;
        container.appendChild(roundsInfo);

        // Rewards section (victory only)
        if (isVictory) {
            const rewardsDiv = document.createElement('div');
            rewardsDiv.style.cssText = 'color:#ccccaa;font-size:0.8rem;margin-bottom:12px;text-align:center;';
            rewardsDiv.innerHTML = '<div style="color:#ffcc33;font-weight:700;margin-bottom:4px;">Rewards</div>';

            // XP gained (placeholder calculation)
            const baseXP = this._isBoss ? 200 : 80;
            const xpGained = baseXP + data.rounds * 5;
            rewardsDiv.innerHTML += `<div>EXP: +${xpGained}</div>`;

            // Gold gained
            const goldGained = Math.floor(baseXP * 0.8 + Math.random() * 40);
            rewardsDiv.innerHTML += `<div>Gold: +${goldGained}</div>`;

            container.appendChild(rewardsDiv);
        }

        // Continue button
        const continueBtn = document.createElement('button');
        continueBtn.style.cssText = `
            padding:10px 32px;font-size:1rem;border:2px solid ${isVictory ? '#ffcc33' : '#888'};
            border-radius:8px;background:rgba(0,0,0,0.5);color:#fff;cursor:pointer;
            margin-top:12px;font-weight:700;
        `;
        continueBtn.textContent = 'Continue';
        continueBtn.addEventListener('click', () => this._exitBattle());
        container.appendChild(continueBtn);

        this._endScreenEl.appendChild(container);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Turn Order UI
    // ═══════════════════════════════════════════════════════════════════

    _refreshTurnOrderUI() {
        if (!this._turnOrderBarEl) return;
        if (!this._battleManager.turnOrder) return;

        const turnOrder = this._battleManager.turnOrder.getTurnOrder();
        this._turnOrderBarEl.innerHTML = '';

        const scrollContainer = document.createElement('div');
        scrollContainer.style.cssText = 'display:flex;gap:4px;overflow-x:auto;padding:4px;align-items:center;';

        for (const unit of turnOrder) {
            if (!unit.isAlive) continue;

            const unitEl = document.createElement('div');
            const isCurrent = this._battleManager.currentUnit === unit;
            const teamColor = unit.team === 0 ? '#3388cc' : '#cc3333';
            const borderColor = isCurrent ? '#ffcc33' : teamColor;
            const elemColor = ELEMENT_COLORS[unit.elementTypes[0]] || '#666';

            unitEl.style.cssText = `
                min-width:36px;height:36px;border-radius:6px;
                border:2px solid ${borderColor};background:${elemColor}33;
                display:flex;align-items:center;justify-content:center;
                flex-shrink:0;position:relative;overflow:hidden;
                ${isCurrent ? 'box-shadow:0 0 8px rgba(255,204,51,0.5);' : ''}
            `;

            // Mini canvas preview via UnitRenderer
            const miniCanvas = document.createElement('canvas');
            miniCanvas.width = 36;
            miniCanvas.height = 36;
            miniCanvas.style.cssText = 'width:36px;height:36px;border-radius:4px;';
            const mCtx = miniCanvas.getContext('2d');
            const inst = unit.spriteInstance || unit.spriteData || {};
            UnitRenderer.draw(mCtx, inst, 18, 18, 30, {
                time: this._time,
                team: unit.team,
                showHpBar: false,
                showLevel: false,
                showAura: false,
                showWeapon: true,
                showArmorGlow: true,
                showElementBadge: false,
            });
            unitEl.appendChild(miniCanvas);

            // Mini HP bar at bottom
            const miniHp = document.createElement('div');
            miniHp.style.cssText = `
                position:absolute;bottom:1px;left:2px;right:2px;height:3px;
                background:#1a1a2e;border-radius:1px;overflow:hidden;
            `;
            const hpFrac = unit.getHpFraction();
            const hpColor = hpFrac > 0.5 ? COLOR_HP_GREEN : hpFrac > 0.25 ? COLOR_HP_YELLOW : COLOR_HP_RED;
            const hpFill = document.createElement('div');
            hpFill.style.cssText = `width:${hpFrac * 100}%;height:100%;background:${hpColor};`;
            miniHp.appendChild(hpFill);
            unitEl.appendChild(miniHp);

            scrollContainer.appendChild(unitEl);
        }

        this._turnOrderBarEl.appendChild(scrollContainer);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Battle Log
    // ═══════════════════════════════════════════════════════════════════

    _addLogEntry(text) {
        this._battleLog.push(text);
        if (this._battleLog.length > BATTLE_LOG_MAX_LINES) {
            this._battleLog.shift();
        }
        this._refreshBattleLogUI();
    }

    _refreshBattleLogUI() {
        if (!this._battleLogEl) return;

        const logContent = this._battleLogEl.querySelector('.battle-log-content');
        if (!logContent) return;

        // Add latest entry
        const entry = document.createElement('div');
        entry.style.cssText = 'color:#ccccdd;font-size:0.65rem;padding:1px 0;border-bottom:1px solid rgba(255,255,255,0.05);';
        entry.textContent = this._battleLog[this._battleLog.length - 1];
        logContent.appendChild(entry);

        // Auto-scroll to bottom
        logContent.scrollTop = logContent.scrollHeight;
    }

    // ═══════════════════════════════════════════════════════════════════
    // DOM Overlay Creation
    // ═══════════════════════════════════════════════════════════════════

    _createDOMOverlays() {
        // Remove previous if any
        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
        }

        this._domContainer = document.createElement('div');
        this._domContainer.id = 'battle-scene-overlays';
        this._domContainer.style.cssText = `
            position:absolute;top:0;left:0;width:100%;height:100%;
            pointer-events:none;z-index:10;
        `;

        // Turn order bar at top
        this._turnOrderBarEl = document.createElement('div');
        this._turnOrderBarEl.id = 'turn-order-bar';
        this._turnOrderBarEl.style.cssText = `
            position:absolute;top:0;left:0;right:0;height:${TURN_ORDER_HEIGHT}px;
            background:rgba(0,0,0,0.7);border-bottom:1px solid rgba(255,255,255,0.1);
            pointer-events:auto;overflow:hidden;display:flex;align-items:center;
            padding:0 8px;
        `;
        this._domContainer.appendChild(this._turnOrderBarEl);

        // Ability bar at bottom
        this._abilityBarEl = document.createElement('div');
        this._abilityBarEl.id = 'ability-bar';
        this._abilityBarEl.className = 'hidden';
        this._abilityBarEl.style.cssText = `
            position:absolute;bottom:0;left:0;right:0;
            background:rgba(0,0,0,0.85);border-top:1px solid rgba(255,255,255,0.1);
            pointer-events:auto;padding:8px;
        `;
        this._domContainer.appendChild(this._abilityBarEl);

        // Battle log (right side, collapsible)
        this._battleLogEl = document.createElement('div');
        this._battleLogEl.id = 'battle-log';
        this._battleLogEl.style.cssText = `
            position:absolute;top:${TURN_ORDER_HEIGHT + 4}px;right:4px;
            width:140px;max-height:200px;background:rgba(0,0,0,0.6);
            border-radius:6px;border:1px solid rgba(255,255,255,0.08);
            pointer-events:auto;overflow:hidden;
        `;

        const logHeader = document.createElement('div');
        logHeader.style.cssText = `
            padding:4px 6px;font-size:0.6rem;font-weight:700;color:#aaa;
            border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.3);
            cursor:pointer;
        `;
        logHeader.textContent = 'Battle Log';
        this._battleLogEl.appendChild(logHeader);

        const logContent = document.createElement('div');
        logContent.className = 'battle-log-content';
        logContent.style.cssText = `
            max-height:170px;overflow-y:auto;padding:4px 6px;
        `;
        this._battleLogEl.appendChild(logContent);

        // Toggle log visibility
        let logVisible = true;
        logHeader.addEventListener('click', () => {
            logVisible = !logVisible;
            logContent.style.display = logVisible ? 'block' : 'none';
        });

        this._domContainer.appendChild(this._battleLogEl);

        // End screen overlay (hidden by default)
        this._endScreenEl = document.createElement('div');
        this._endScreenEl.id = 'battle-end-screen';
        this._endScreenEl.className = 'hidden';
        this._endScreenEl.style.cssText = `
            position:absolute;top:0;left:0;width:100%;height:100%;
            pointer-events:auto;z-index:20;
        `;
        this._domContainer.appendChild(this._endScreenEl);

        // Attach to game container
        const gameContainer = document.getElementById('game-container') || document.body;
        gameContainer.appendChild(this._domContainer);
    }

    // ═══════════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════════

    _screenToGrid(px, py) {
        const gx = this._gridOriginX;
        const gy = this._gridOriginY;
        const cellStep = CELL_SIZE + CELL_GAP;

        const gridX = Math.floor((px - gx) / cellStep);
        const gridY = Math.floor((py - gy) / cellStep);

        if (gridX < 0 || gridX >= BattleGrid.GRID_WIDTH) return null;
        if (gridY < 0 || gridY >= BattleGrid.TOTAL_HEIGHT) return null;

        // Check that the click is within the actual cell (not in the gap)
        const localX = px - gx - gridX * cellStep;
        const localY = py - gy - gridY * cellStep;
        if (localX > CELL_SIZE || localY > CELL_SIZE) return null;

        return { x: gridX, y: gridY };
    }

}

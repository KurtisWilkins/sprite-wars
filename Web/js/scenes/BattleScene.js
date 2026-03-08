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
import { SPRITE_RACES, EVOLUTION_FORMS } from '../data/SpriteData.js';
import { ABILITIES } from '../data/AbilityData.js';
import { rollBattleLoot, formatLootForDisplay } from '../systems/battle/BattleLootSystem.js';

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
const COLOR_GRID_LINES = '#222222';  // Clean black outlines
const COLOR_CELL_HIGHLIGHT = 'rgba(255, 255, 100, 0.35)';
const COLOR_CELL_TARGET_VALID = 'rgba(0, 255, 100, 0.25)';
const COLOR_CELL_TARGET_HOVER = 'rgba(0, 255, 100, 0.50)';
const COLOR_HP_GREEN = '#33cc66';
const COLOR_HP_YELLOW = '#cccc33';
const COLOR_HP_RED = '#cc3333';
const COLOR_BG_DEFAULT = '#2a4a3a';  // Medieval fantasy flat forest green
const COLOR_BG_BOSS = '#3a1a1a';    // Dark crimson flat cel-shaded

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

// ── Ability wrapper: converts raw AbilityData (snake_case) to battle format ──
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

/**
 * Resolve abilities for a sprite, using the canonical ABILITIES database.
 * Player sprites have simplified ability objects (abilityId, name, power).
 * Enemies may have no abilities — assign from the race/level.
 */
function _resolveAbilities(raw, raceData, stageData, level) {
    const wrapped = [];

    // 1. Try to use the sprite's own ability list (player sprites)
    if (raw.abilities && raw.abilities.length > 0) {
        for (const ab of raw.abilities) {
            const id = ab.abilityId || ab.ability_id;
            const canonical = ABILITIES[id];
            if (canonical) {
                wrapped.push(_wrapAbility(canonical));
            }
        }
    }

    // 2. If we found abilities from the sprite data, we're done
    if (wrapped.length > 0) return wrapped;

    // 3. Fallback for enemies with no abilities: assign based on element + level
    const elemType = (raceData.element_types && raceData.element_types[0]) || 'Fire';

    // Find abilities matching this element, sorted by base_power ascending
    const matching = [];
    for (const id in ABILITIES) {
        const ab = ABILITIES[id];
        if (ab.element_type === elemType || ab.element_type === 'None') {
            matching.push(ab);
        }
    }
    matching.sort((a, b) => a.base_power - b.base_power);

    // Pick up to 2 abilities appropriate for level
    const levelAppropriate = matching.filter(ab => ab.base_power <= 30 + level * 3);
    const picks = levelAppropriate.length > 0 ? levelAppropriate : matching.slice(0, 2);

    // Take the last (strongest) 2 that are level-appropriate
    const selected = picks.slice(-2);
    for (const ab of selected) {
        wrapped.push(_wrapAbility(ab));
    }

    // Always have at least Tackle (ability 155) as a fallback
    if (wrapped.length === 0 && ABILITIES[155]) {
        wrapped.push(_wrapAbility(ABILITIES[155]));
    }

    return wrapped;
}

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

        // ── Unit inspection ───────────────────────────────────────────
        this._inspectedUnit = null;
        this._inspectPanelEl = null;
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

        // Store return data so we can pass spawn position back to overworld
        this._returnData = data.returnData || null;

        // Reset state
        this._phase = PHASE_INTRO;
        this._introTimer = 0;
        this._floatingTexts = [];
        this._battleLog = [];
        this._battleResult = null;
        this._battleRewards = null;
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
        this._inspectedUnit = null;

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
        this._inspectPanelEl = null;
        this._inspectedUnit = null;

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

        // Update turn advance delay (skip if battle already ended)
        if (this._turnAdvanceDelay > 0 && this._phase !== PHASE_BATTLE_END) {
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
        // Detect player turn: when BattleManager chains AI turns synchronously,
        // awaitingPlayerInput becomes true but _advanceTurn() has already returned.
        // Catch it here and show the ability bar.
        if (this._phase === PHASE_TURNS &&
            this._battleManager.awaitingPlayerInput &&
            !this._autoBattle &&
            this._turnAdvanceDelay <= 0) {
            this._phase = PHASE_PLAYER_SELECT_ABILITY;
            this._showAbilityBar();
        }

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

        // Draw ability animation effects (screen flash, impact flash)
        if (this._currentAnim && this._currentAnim.type === 'ability_use') {
            this._renderAbilityEffect(ctx, renderer);
        }

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

                // Cell border — clean black outlines, uniform 2px
                ctx.strokeStyle = COLOR_GRID_LINES;
                ctx.lineWidth = 2;
                ctx.strokeRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            }
        }

        // Draw divider between player and enemy sides
        const dividerY = gy + BattleGrid.GRID_HEIGHT_PER_SIDE * (CELL_SIZE + CELL_GAP) - CELL_GAP / 2;
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 3;
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
                const spriteSize = CELL_SIZE - 4; // chibi sprites fill more of the cell

                // Update render cache position for floating text placement
                let cache = this._unitRenderCache.get(unit);
                if (!cache) {
                    cache = { spriteImg: null, x: cellX, y: cellY };
                    this._unitRenderCache.set(unit, cache);
                }
                cache.x = cellX;
                cache.y = cellY;

                // Apply shake offset if this unit is being hit by an ability animation
                let shakeX = 0;
                let shakeY = 0;
                if (this._currentAnim && this._currentAnim.type === 'ability_use' && this._currentAnim.targetPos) {
                    const tp = this._currentAnim.targetPos;
                    if (tp.x === x && tp.y === y) {
                        const progress = Math.min(1, this._animTimer / this._currentAnim.duration);
                        if (progress >= 0.1 && progress < 0.4) {
                            const shakeIntensity = (1 - (progress - 0.1) / 0.3) * 4;
                            shakeX = Math.sin(progress * 60) * shakeIntensity;
                            shakeY = Math.cos(progress * 45) * shakeIntensity * 0.5;
                        }
                    }
                }

                // Draw fully composited unit via UnitRenderer
                const inst = unit.spriteInstance || unit.spriteData || unit;
                UnitRenderer.draw(ctx, inst, centerX + shakeX, centerY + shakeY, spriteSize, {
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

    _renderAbilityEffect(ctx, renderer) {
        const anim = this._currentAnim;
        if (!anim) return;

        const progress = Math.min(1, this._animTimer / anim.duration);
        const ability = anim.ability;
        const elemColor = ELEMENT_COLORS[ability.elementType] || '#ffffff';

        // Phase 1 (0-0.3): Screen flash with element color
        if (progress < 0.3) {
            const flashAlpha = (1 - progress / 0.3) * 0.2;
            ctx.fillStyle = elemColor;
            ctx.globalAlpha = flashAlpha;
            ctx.fillRect(0, 0, this.engine.designWidth, this.engine.designHeight);
            ctx.globalAlpha = 1;
        }

        // Phase 2 (0.15-0.5): Impact flash at target cell (flat cel-shaded fill, no gradients)
        if (progress >= 0.15 && progress < 0.5) {
            const impactProgress = (progress - 0.15) / 0.35;
            const impactAlpha = (1 - impactProgress) * 0.6;
            const targetPos = anim.targetPos;
            if (targetPos) {
                const cellStep = CELL_SIZE + CELL_GAP;
                const tx = this._gridOriginX + targetPos.x * cellStep + CELL_SIZE / 2;
                const ty = this._gridOriginY + targetPos.y * cellStep + CELL_SIZE / 2;
                const radius = CELL_SIZE * (0.5 + impactProgress * 0.8);

                ctx.globalAlpha = impactAlpha;
                ctx.fillStyle = elemColor;
                ctx.beginPath();
                ctx.arc(tx, ty, radius, 0, Math.PI * 2);
                ctx.fill();
                // Clean black outline around impact
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        // Phase 3 (0.1-0.35): Shake the target unit slightly
        // This is handled in _renderUnits via _currentAnim reference
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

            // Tap on grid: inspect unit or close inspect panel
            if (input.isTap() && this._hoveredCell) {
                const grid = this._battleManager.grid;
                if (grid) {
                    const tappedUnit = grid.getUnitAt(this._hoveredCell);
                    if (tappedUnit && tappedUnit.isAlive) {
                        this._showUnitInspect(tappedUnit);
                    } else if (this._inspectedUnit) {
                        this._hideUnitInspect();
                    }
                }
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
                    this._hideUnitInspect();
                    this._confirmTarget(this._hoveredCell);
                } else {
                    // Tapped a non-target cell — inspect if there is a living unit
                    const grid = this._battleManager.grid;
                    if (grid) {
                        const tappedUnit = grid.getUnitAt(this._hoveredCell);
                        if (tappedUnit && tappedUnit.isAlive) {
                            this._showUnitInspect(tappedUnit);
                        } else if (this._inspectedUnit) {
                            this._hideUnitInspect();
                        }
                    }
                }
            }
            return;
        }

        // During PHASE_TURNS or PHASE_ANIMATING: allow unit inspection on tap
        if (this._phase === PHASE_TURNS || this._phase === PHASE_ANIMATING) {
            if (input.isTap() && this._hoveredCell) {
                const grid = this._battleManager.grid;
                if (grid) {
                    const tappedUnit = grid.getUnitAt(this._hoveredCell);
                    if (tappedUnit && tappedUnit.isAlive) {
                        this._showUnitInspect(tappedUnit);
                    } else if (this._inspectedUnit) {
                        this._hideUnitInspect();
                    }
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Battle Lifecycle
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Enrich raw team data so BattleManager._createBattleUnit() gets the
     * { instance, raceData, stageData, abilities } shape it expects.
     *
     * Player sprites from GameManager have: raceId, formId, level, stats,
     * abilities (simplified), elementTypes, maxHp, etc.
     *
     * Enemy sprites from encounters may only have: raceId, level, stage.
     */
    _enrichTeamData(rawTeam, isEnemy = false) {
        const enriched = [];

        for (const raw of rawTeam) {
            // Already enriched — pass through
            if (raw.instance && raw.raceData && raw.stageData) {
                enriched.push(raw);
                continue;
            }

            const raceId = raw.raceId;
            const raceData = SPRITE_RACES.find(r => r.race_id === raceId);
            if (!raceData) {
                console.warn(`BattleScene: Unknown raceId ${raceId}, skipping.`);
                continue;
            }

            // Resolve formId: player data has formId, enemies have stage (0-2)
            let formId = raw.formId;
            if (formId == null) {
                const stageIdx = raw.stage != null ? raw.stage : 0; // 0,1,2
                formId = raceId * 3 - 2 + stageIdx;
            }
            const stageData = EVOLUTION_FORMS[formId];
            if (!stageData) {
                console.warn(`BattleScene: Unknown formId ${formId}, skipping.`);
                continue;
            }

            // Build instance object with calculateAllEffectiveStats
            const level = raw.level || 1;
            // Deep copy equipment so each unit has its own equipment dict
            // (prevents shared-reference bug where all sprites show same armor)
            const rawEquipment = raw.equipment || {};
            const instanceEquipment = { ...rawEquipment };
            const instance = {
                ...raw,
                raceId,
                formId,
                level,
                equipment: instanceEquipment,
                calculateAllEffectiveStats(rd, sd, equipmentList, elemTypes, spriteClass) {
                    // Player sprites have pre-computed stats — use them as base
                    let baseStats;
                    if (this.stats && this.maxHp) {
                        baseStats = {
                            hp: this.maxHp,
                            atk: this.stats.attack || this.stats.atk || 1,
                            def: this.stats.defense || this.stats.def || 1,
                            spd: this.stats.speed || this.stats.spd || 1,
                            sp_atk: this.stats.specialAttack || this.stats.sp_atk || 1,
                            sp_def: this.stats.specialDefense || this.stats.sp_def || 1,
                        };
                    } else {
                        // Enemy sprites: compute from base_stats, growth, level, stage mult
                        baseStats = {};
                        const keys = ['hp', 'atk', 'def', 'spd', 'sp_atk', 'sp_def'];
                        for (const key of keys) {
                            const base = rd.base_stats[key] || 10;
                            const growth = rd.growth_rates[key] || 1;
                            const mult = sd.stat_multipliers[key] || 1;
                            baseStats[key] = Math.max(1, Math.floor((base + growth * this.level) * mult));
                        }
                    }
                    // Apply equipment stat bonuses with synergy multipliers
                    if (equipmentList && equipmentList.length > 0) {
                        for (const equip of equipmentList) {
                            const bonuses = equip.stat_bonuses || {};
                            for (const key of Object.keys(bonuses)) {
                                if (key in baseStats) {
                                    let bonus = bonuses[key] || 0;
                                    if (elemTypes && equip.element_synergy && elemTypes.includes(equip.element_synergy)) {
                                        bonus = Math.floor(bonus * (equip.element_synergy_multiplier || 1));
                                    }
                                    if (spriteClass && equip.class_synergy && spriteClass === equip.class_synergy) {
                                        bonus = Math.floor(bonus * (equip.class_synergy_multiplier || 1));
                                    }
                                    baseStats[key] = Math.max(1, baseStats[key] + bonus);
                                }
                            }
                        }
                    }
                    return baseStats;
                },
            };

            // Resolve abilities from the canonical ABILITIES database
            const abilities = _resolveAbilities(raw, raceData, stageData, level);

            enriched.push({
                instance,
                raceData,
                stageData,
                abilities,
                position: raw.position || null,
            });
        }

        return enriched;
    }

    _startBattle() {
        try {
            const config = {};

            // Provide element chart from engine data if available
            if (this.engine.data && this.engine.data.effectivenessMatrix) {
                config.elementChart = this.engine.data.effectivenessMatrix;
            }
            if (this.engine.data && this.engine.data.statusEffects) {
                config.statusDb = this.engine.data.statusEffects;
            }

            // Enrich raw team data into the format BattleManager expects
            const playerTeam = this._enrichTeamData(this._playerTeamData, false);
            const enemyTeam = this._enrichTeamData(this._enemyTeamData, true);

            if (playerTeam.length === 0) {
                console.error('BattleScene: No player units after enrichment. Raw data:', this._playerTeamData);
            }
            if (enemyTeam.length === 0) {
                console.error('BattleScene: No enemy units after enrichment. Raw data:', this._enemyTeamData);
            }

            this._battleManager.startBattle(
                playerTeam,
                enemyTeam,
                config
            );

            this._addLogEntry('Battle started!');
        } catch (err) {
            console.error('BattleScene._startBattle() error:', err);
            this._addLogEntry('Error starting battle. Check console.');
        }
    }

    _advanceTurn() {
        if (!this._battleManager.isBattleActive) return;

        // Let BattleManager process the next turn (synchronous)
        this._battleManager.processTurn();

        // Battle may have ended during processTurn
        if (!this._battleManager.isBattleActive) return;

        // After processTurn, check what state we are in
        if (this._battleManager.awaitingPlayerInput && !this._autoBattle) {
            this._phase = PHASE_PLAYER_SELECT_ABILITY;
            this._showAbilityBar();
        } else if (this._animQueue.length > 0) {
            // AI or auto-battle turn queued animations via ABILITY_USED event.
            // Enter animation phase; _updateAnimations will advance to next turn after.
            this._phase = PHASE_ANIMATING;
        } else {
            // AI turn with no visual animation (e.g. skip or status-prevented).
            // Add a brief delay so the player can read log entries.
            this._phase = PHASE_TURNS;
            this._turnAdvanceDelay = 0.4;
        }

        this._refreshTurnOrderUI();
    }

    _toggleAutoBattle() {
        this._autoBattle = !this._autoBattle;
        this._battleManager.toggleAutoBattle();
        if (this._autoBattle) {
            this._hideAbilityBar();
            this._addLogEntry('Auto-Battle enabled.');
            // If we were in ability selection, the BattleManager just executed
            // the AI turn for the current player unit. Transition to animation or next turn.
            if (this._phase === PHASE_PLAYER_SELECT_ABILITY ||
                this._phase === PHASE_PLAYER_SELECT_TARGET) {
                if (this._animQueue.length > 0) {
                    this._phase = PHASE_ANIMATING;
                } else {
                    this._phase = PHASE_TURNS;
                    this._turnAdvanceDelay = 0.5;
                }
            }
        } else {
            this._addLogEntry('Auto-Battle disabled.');
            // If it's still the player's turn and awaiting input, show ability bar
            if (this._battleManager.awaitingPlayerInput && this._battleManager.currentUnit) {
                this._phase = PHASE_PLAYER_SELECT_ABILITY;
                this._showAbilityBar();
            }
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
            // Skip player's turn as a penalty — properly end the turn
            this._battleManager.awaitingPlayerInput = false;
            this._battleManager._endCurrentTurn();
            this._hideAbilityBar();
            this._phase = PHASE_TURNS;
            this._turnAdvanceDelay = 0.6;
        }
    }

    _exitBattle() {
        this.engine.audio.stopMusic(400);
        const result = this._battleResult;

        // The battle scene is reached via changeTo() (Overworld -> Deployment -> Battle),
        // so the scene stack is empty and popScene() would silently resolve without
        // transitioning. Use changeTo() directly to return to the overworld.
        this.engine.scenes.changeTo('overworld', {
            battleResult: result,
            rewards: this._battleRewards || null,
            returnData: this._returnData,
        });
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
        // Play SFX immediately when the animation starts
        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/attack_hit.ogg'), 0.5
        );

        this._animQueue.push({
            type: 'ability_use',
            caster,
            ability,
            targetPos,
            duration: 0.5,
            startTime: this._time,
            onComplete: null,
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

                    // Queue visual effect for AI turns (player turns already queue via _confirmTarget)
                    if (caster.team === 1 || this._autoBattle) {
                        // Find target position from the first target
                        let targetPos = null;
                        if (targetInsts && targetInsts.length > 0) {
                            const targetUnit = this._findUnitByInstance(targetInsts[0]);
                            if (targetUnit) {
                                targetPos = { x: targetUnit.gridPosition.x, y: targetUnit.gridPosition.y };
                            }
                        }
                        // Queue ability animation for visual feedback
                        this._animQueue.push({
                            type: 'ability_use',
                            caster,
                            ability,
                            targetPos,
                            duration: 0.5,
                            startTime: this._time,
                            onComplete: null,
                        });
                        this.engine.audio.playSFX(
                            this.engine.assets.resolvePath('Audio/Sounds/attack_hit.ogg'), 0.4
                        );
                    }
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
        this._hideUnitInspect();

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

            // -- Equipment Loot Drops -----------------------------------------
            // Determine battle type, difficulty, player level, and element
            const battleType = this._isBoss ? 'boss' : 'normal';
            const difficulty = this._deriveDifficulty();
            const playerLevel = this._getHighestPlayerLevel();
            const battleElement = this._deriveBattleElement();

            const loot = rollBattleLoot(battleType, difficulty, playerLevel, battleElement);
            const lootDisplay = formatLootForDisplay(loot);

            if (lootDisplay.length > 0) {
                const lootDiv = document.createElement('div');
                lootDiv.style.cssText = 'margin-top:8px;text-align:center;';
                lootDiv.innerHTML = '<div style="color:#ffcc33;font-weight:700;font-size:0.8rem;margin-bottom:6px;">Equipment Found</div>';

                for (const item of lootDisplay) {
                    const itemEl = document.createElement('div');
                    itemEl.style.cssText = `
                        display:inline-flex;align-items:center;gap:6px;
                        background:rgba(255,255,255,0.06);border:1px solid ${item.rarityColor}40;
                        border-radius:6px;padding:4px 10px;margin:3px;font-size:0.75rem;
                    `;
                    itemEl.innerHTML = `
                        <span style="color:${item.rarityColor};font-weight:700;">${item.name}</span>
                        <span style="color:${item.rarityColor};font-size:0.65rem;opacity:0.8;">[${item.rarityLabel}]</span>
                        <span style="color:#aaa;font-size:0.65rem;">${item.statSummary}</span>
                    `;
                    lootDiv.appendChild(itemEl);
                }
                container.appendChild(lootDiv);
            }

            // Store rewards so _exitBattle() can pass them back to the overworld
            this._battleRewards = { xp: xpGained, gold: goldGained, loot: loot };
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
    // Loot Helpers
    // ═══════════════════════════════════════════════════════════════════

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

        // Unit inspection panel (hidden by default, slides up from bottom)
        this._inspectPanelEl = document.createElement('div');
        this._inspectPanelEl.id = 'unit-inspect-panel';
        this._inspectPanelEl.style.cssText = `
            position:absolute;bottom:0;left:0;width:100%;height:320px;
            background:rgba(0,0,0,0.85);border-top:2px solid rgba(255,255,255,0.15);
            border-radius:12px 12px 0 0;pointer-events:auto;display:none;
            flex-direction:column;z-index:15;overflow:hidden;
            box-sizing:border-box;padding:14px 16px 12px 16px;
        `;

        // Close button (X) in top-right
        const inspectCloseBtn = document.createElement('div');
        inspectCloseBtn.style.cssText = `
            position:absolute;top:8px;right:12px;width:32px;height:32px;
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;color:#aaa;font-size:1.2rem;font-weight:700;
            border-radius:6px;background:rgba(255,255,255,0.08);
            z-index:2;
        `;
        inspectCloseBtn.textContent = 'X';
        inspectCloseBtn.addEventListener('click', () => this._hideUnitInspect());
        this._inspectPanelEl.appendChild(inspectCloseBtn);

        // Content area (populated dynamically by _showUnitInspect)
        const inspectContent = document.createElement('div');
        inspectContent.className = 'inspect-content';
        inspectContent.style.cssText = `
            width:100%;height:100%;overflow-y:auto;overflow-x:hidden;
            padding-top:24px;box-sizing:border-box;
        `;
        this._inspectPanelEl.appendChild(inspectContent);

        this._domContainer.appendChild(this._inspectPanelEl);

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
    // Unit Inspection
    // ═══════════════════════════════════════════════════════════════════

    _showUnitInspect(unit) {
        if (!this._inspectPanelEl || !unit) return;

        this._inspectedUnit = unit;

        const content = this._inspectPanelEl.querySelector('.inspect-content');
        if (!content) return;
        content.innerHTML = '';

        const isAlly = unit.team === 0;
        const teamColor = isAlly ? '#3388cc' : '#cc3333';
        const teamLabel = isAlly ? 'Ally' : 'Enemy';
        const nameColor = isAlly ? '#ffcc33' : '#ff5555';

        // ── Header row: name, team badge, level ──────────────────────
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;';

        const nameEl = document.createElement('span');
        nameEl.style.cssText = `font-weight:700;font-size:1.05rem;color:${nameColor};`;
        nameEl.textContent = unit.getDisplayName();
        header.appendChild(nameEl);

        const teamBadge = document.createElement('span');
        teamBadge.style.cssText = `
            font-size:0.7rem;font-weight:700;color:#fff;background:${teamColor};
            border-radius:4px;padding:2px 8px;
        `;
        teamBadge.textContent = teamLabel;
        header.appendChild(teamBadge);

        const levelEl = document.createElement('span');
        levelEl.style.cssText = 'font-size:0.85rem;color:#aaa;margin-left:auto;';
        levelEl.textContent = `Lv. ${unit.level || '?'}`;
        header.appendChild(levelEl);

        content.appendChild(header);

        // ── Element badges ───────────────────────────────────────────
        if (unit.elementTypes && unit.elementTypes.length > 0) {
            const elemRow = document.createElement('div');
            elemRow.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;';
            for (const elem of unit.elementTypes) {
                const badge = document.createElement('span');
                const elemColor = ELEMENT_COLORS[elem] || '#666';
                badge.style.cssText = `
                    display:flex;align-items:center;gap:4px;
                    font-size:0.75rem;color:#ddd;
                `;
                const dot = document.createElement('span');
                dot.style.cssText = `
                    display:inline-block;width:10px;height:10px;border-radius:50%;
                    background:${elemColor};
                `;
                badge.appendChild(dot);
                badge.appendChild(document.createTextNode(elem));
                elemRow.appendChild(badge);
            }
            content.appendChild(elemRow);
        }

        // ── HP bar ───────────────────────────────────────────────────
        const hpFrac = unit.getHpFraction ? unit.getHpFraction() : (unit.currentHp / unit.maxHp);
        const hpColor = hpFrac > 0.5 ? COLOR_HP_GREEN : hpFrac > 0.25 ? COLOR_HP_YELLOW : COLOR_HP_RED;

        const hpRow = document.createElement('div');
        hpRow.style.cssText = 'margin-bottom:8px;';

        const hpLabel = document.createElement('div');
        hpLabel.style.cssText = 'font-size:0.75rem;color:#aaa;margin-bottom:3px;';
        hpLabel.textContent = `HP: ${unit.currentHp}/${unit.maxHp}`;
        hpRow.appendChild(hpLabel);

        const hpBarOuter = document.createElement('div');
        hpBarOuter.style.cssText = `
            width:100%;height:8px;background:#1a1a2e;border-radius:4px;overflow:hidden;
        `;
        const hpBarInner = document.createElement('div');
        hpBarInner.style.cssText = `
            width:${Math.max(0, Math.min(100, hpFrac * 100))}%;height:100%;
            background:${hpColor};border-radius:3px;
            transition:width 0.3s ease;
        `;
        hpBarOuter.appendChild(hpBarInner);
        hpRow.appendChild(hpBarOuter);
        content.appendChild(hpRow);

        // ── Stats grid (2 columns) ──────────────────────────────────
        const statsGrid = document.createElement('div');
        statsGrid.style.cssText = `
            display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;
            margin-bottom:8px;font-size:0.75rem;
        `;

        const stats = unit.stats || {};
        const statEntries = [
            { label: 'ATK', value: stats.atk },
            { label: 'DEF', value: stats.def },
            { label: 'SPD', value: stats.spd },
            { label: 'SP.ATK', value: stats.sp_atk },
            { label: 'SP.DEF', value: stats.sp_def },
        ];

        for (const entry of statEntries) {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;';
            const labelEl = document.createElement('span');
            labelEl.style.cssText = 'color:#888;';
            labelEl.textContent = entry.label;
            const valueEl = document.createElement('span');
            valueEl.style.cssText = 'color:#ddd;font-weight:600;';
            valueEl.textContent = entry.value != null ? entry.value : '?';
            row.appendChild(labelEl);
            row.appendChild(valueEl);
            statsGrid.appendChild(row);
        }
        content.appendChild(statsGrid);

        // ── Abilities list ───────────────────────────────────────────
        const abilityDb = this._battleManager._abilityDb;
        if (unit.equippedAbilities && unit.equippedAbilities.length > 0 && abilityDb) {
            const abilitiesLabel = document.createElement('div');
            abilitiesLabel.style.cssText = 'font-size:0.75rem;color:#888;margin-bottom:4px;font-weight:700;';
            abilitiesLabel.textContent = 'Abilities';
            content.appendChild(abilitiesLabel);

            const abilitiesList = document.createElement('div');
            abilitiesList.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;';

            for (const abilityId of unit.equippedAbilities) {
                const ability = abilityDb[abilityId];
                if (!ability) continue;

                const elemColor = ELEMENT_COLORS[ability.elementType] || '#666';
                const pp = unit.abilityPp ? (unit.abilityPp[abilityId] || 0) : '?';
                const ppMax = ability.ppMax || '?';

                const abEl = document.createElement('div');
                abEl.style.cssText = `
                    border:1px solid ${elemColor};border-radius:5px;
                    padding:4px 8px;font-size:0.7rem;color:#ddd;
                    background:rgba(0,0,0,0.4);
                `;

                const abName = document.createElement('div');
                abName.style.cssText = 'font-weight:600;';
                abName.textContent = ability.abilityName || `Ability ${abilityId}`;
                abEl.appendChild(abName);

                const abInfo = document.createElement('div');
                abInfo.style.cssText = 'color:#999;';
                abInfo.textContent = `Pwr:${ability.basePower || 0} PP:${pp}/${ppMax}`;
                abEl.appendChild(abInfo);

                abilitiesList.appendChild(abEl);
            }
            content.appendChild(abilitiesList);
        }

        // ── Active status effects ────────────────────────────────────
        if (unit.activeStatusEffects && unit.activeStatusEffects.length > 0) {
            const statusLabel = document.createElement('div');
            statusLabel.style.cssText = 'font-size:0.75rem;color:#888;margin-bottom:4px;font-weight:700;';
            statusLabel.textContent = 'Status Effects';
            content.appendChild(statusLabel);

            const statusRow = document.createElement('div');
            statusRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

            for (const effect of unit.activeStatusEffects) {
                const tag = document.createElement('span');
                tag.style.cssText = `
                    font-size:0.7rem;color:#ffaa33;background:rgba(255,170,51,0.15);
                    border:1px solid rgba(255,170,51,0.3);border-radius:4px;padding:2px 8px;
                `;
                tag.textContent = effect.effectName || effect.name || 'Unknown';
                statusRow.appendChild(tag);
            }
            content.appendChild(statusRow);
        }

        // Show the panel
        this._inspectPanelEl.style.display = 'flex';
    }

    _hideUnitInspect() {
        this._inspectedUnit = null;
        if (this._inspectPanelEl) {
            this._inspectPanelEl.style.display = 'none';
        }
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

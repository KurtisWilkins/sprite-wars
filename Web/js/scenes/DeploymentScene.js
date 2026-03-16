/**
 * DeploymentScene -- Pre-battle team deployment screen for Sprite Wars.
 * Allows the player to select up to 7 sprites from their party and position
 * them on a 9x9 player grid. The enemy 9x9 grid is displayed side-by-side
 * to the right. Player occupies rows 0-8, enemy rows 9-17.
 *
 * Uses Canvas for the grid preview and DOM panels for the roster/detail UI.
 *
 * enter(data) receives:
 *   { availableSprites: [...], enemyTeam: [...], templeId: number }
 */

import { Scene } from '../core/SceneManager.js';
import { eventBus, GameEvents } from '../core/EventBus.js';
import { BattleGrid } from '../systems/battle/BattleGrid.js';
import { SPRITE_RACES } from '../data/SpriteData.js';
import { UnitRenderer, ELEMENT_COLORS as UR_ELEMENT_COLORS } from '../systems/ui/UnitRenderer.js';
import { SkeletalAnimationSystem } from '../systems/rendering/SkeletalAnimationSystem.js';
import { SpriteInspectPanel } from '../systems/ui/SpriteInspectPanel.js';
import { getRaceSpritePath } from '../data/SpriteTextureHelper.js';

function _getSpriteName(inst) {
    if (!inst) return '???';
    if (inst.nickname) return inst.nickname;
    const race = SPRITE_RACES.find(r => r.race_id === inst.raceId);
    return race ? race.race_name : `Sprite #${inst.raceId || '?'}`;
}

// ── Layout Constants ────────────────────────────────────────────────────────
const GRID_CELL_SIZE = 32;
const GRID_GAP = 2;
const GRID_ORIGIN_X = 12;
const GRID_ORIGIN_Y = 76;
const GRID_SPACING = 16;      // horizontal gap between player and enemy grids
const ROSTER_PANEL_WIDTH = 180;
const DETAIL_PANEL_HEIGHT = 160;
const MAX_DEPLOY_UNITS = 7;
const PLAYER_DEPLOY_COLS = 9; // all 9 columns are deployable

// ── Colors ──────────────────────────────────────────────────────────────────
const COLOR_BG = '#1a2a3a';  // Medieval fantasy flat dark blue
const COLOR_GRID_EMPTY = 'rgba(60, 80, 120, 0.15)';
const COLOR_GRID_DEPLOY = 'rgba(50, 150, 255, 0.20)';
const COLOR_GRID_ENEMY = 'rgba(200, 50, 50, 0.12)';
const COLOR_GRID_PLACED = 'rgba(50, 200, 100, 0.35)';
const COLOR_GRID_HOVER = 'rgba(255, 255, 100, 0.30)';
const COLOR_GRID_INVALID = 'rgba(255, 80, 80, 0.20)';
const COLOR_GRID_LINES = '#222222';  // Clean black outlines

const ELEMENT_COLORS = {
    Fire: '#ff5533', Water: '#3399ff', Plant: '#33aa33', Ice: '#99ddff',
    Wind: '#88ccaa', Earth: '#996633', Electric: '#ffcc00', Dark: '#8844aa',
    Light: '#ffee99', Fairy: '#ff66aa', Solar: '#ffaa33', Lunar: '#8899cc',
    Metal: '#aaaacc', Poison: '#aa33aa',
};

export class DeploymentScene extends Scene {
    constructor(engine) {
        super(engine);

        // ── Input data ────────────────────────────────────────────────
        this._availableSprites = [];
        this._enemyTeamData = [];
        this._templeId = 0;

        // ── Deployment state ──────────────────────────────────────────
        /** @type {Array<{spriteData: object, position: {x:number,y:number}}|null>} */
        this._deployedUnits = [];
        this._selectedRosterIndex = -1;
        this._selectedDeployedIndex = -1;

        // ── Drag state ────────────────────────────────────────────────
        this._isDragging = false;
        this._dragSprite = null;
        this._dragOffsetX = 0;
        this._dragOffsetY = 0;
        this._dragScreenX = 0;
        this._dragScreenY = 0;

        // ── Hover state ───────────────────────────────────────────────
        this._hoveredCell = null;

        // ── Detail panel data ─────────────────────────────────────────
        this._detailSprite = null;
        this._inspectPanel = new SpriteInspectPanel();

        // ── DOM references ────────────────────────────────────────────
        this._domContainer = null;
        this._rosterPanelEl = null;
        this._detailPanelEl = null;
        this._startBtnEl = null;

        // ── Animation time tracker ──────────────────────────────────────
        this._time = 0;

        // ── Event cleanup ─────────────────────────────────────────────
        this._unsubs = [];
    }

    // ═══════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════

    async init() {
        await SkeletalAnimationSystem.preloadAssets(this.engine.assets).catch(() => {});
        this.initialized = true;
    }

    enter(data) {
        // Pull player team from passed data, gameData, or engine's GameManager
        const gm = this.engine.gameManager;
        const pd = (gm && gm.playerData) ? gm.playerData : {};
        this._availableSprites = data.availableSprites || (data.gameData && data.gameData.team) || pd.team || [];
        this._enemyTeamData = data.enemyTeam || data.enemies || [];
        this._templeId = data.templeId || 0;
        this._encounterData = data;

        // Reset state
        this._deployedUnits = [];
        this._selectedRosterIndex = -1;
        this._selectedDeployedIndex = -1;
        this._isDragging = false;
        this._dragSprite = null;
        this._hoveredCell = null;
        this._detailSprite = null;

        // Reset animation time
        this._time = 0;

        // Preload unit assets via UnitRenderer for rich composite rendering
        UnitRenderer.preloadTeam(this.engine, this._availableSprites).catch(() => {});
        UnitRenderer.preloadTeam(this.engine, this._enemyTeamData).catch(() => {});

        // Auto-deploy first 7 sprites in default positions
        this._autoDeployDefault();

        // Build DOM
        this._createDOM();
        this._refreshRosterPanel();
        this._refreshStartButton();

        // Play deployment theme
        this.engine.audio.playMusic(
            this.engine.assets.resolvePath('Audio/Music/DeploymentTheme.wav')
        );

        eventBus.emit(GameEvents.SCREEN_OPENED, 'deployment');
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
        this._rosterPanelEl = null;
        this._detailPanelEl = null;
        this._startBtnEl = null;

        eventBus.emit(GameEvents.SCREEN_CLOSED, 'deployment');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Update
    // ═══════════════════════════════════════════════════════════════════

    update(dt) {
        super.update(dt);
        this._time += dt;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════════════════════════════

    render(renderer) {
        const ctx = renderer.ctx;

        renderer.clear(COLOR_BG);

        // Title
        renderer.drawText('DEPLOY YOUR TEAM', this.engine.designWidth / 2, 20, {
            color: '#ffcc33',
            font: 'bold 18px sans-serif',
            align: 'center',
            baseline: 'top',
        });

        // Subtitle
        renderer.drawText(`Select up to ${MAX_DEPLOY_UNITS} sprites and position them on the grid`, this.engine.designWidth / 2, 46, {
            color: '#8888aa',
            font: '11px sans-serif',
            align: 'center',
            baseline: 'top',
        });

        // Draw player grid (left, 9x9) and enemy grid (right, 9x9)
        this._renderDeploymentGrid(ctx, renderer);

        // Draw enemy units on the enemy grid (right side)
        this._renderEnemyPreview(ctx, renderer);

        // Draw dragged sprite
        if (this._isDragging && this._dragSprite) {
            this._renderDragSprite(ctx, renderer);
        }

        super.render(renderer);
    }

    _renderDeploymentGrid(ctx, renderer) {
        const gx = GRID_ORIGIN_X;
        const gy = GRID_ORIGIN_Y;
        const cellStep = GRID_CELL_SIZE + GRID_GAP;
        const gridPixelW = BattleGrid.GRID_WIDTH * cellStep - GRID_GAP;

        // ── Player Grid (left) ──────────────────────────────────────────
        renderer.drawText('Your Formation', gx, gy - 14, {
            color: '#6688cc',
            font: 'bold 10px sans-serif',
            align: 'left',
            baseline: 'bottom',
        });

        for (let y = 0; y < BattleGrid.GRID_HEIGHT_PER_SIDE; y++) {
            for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
                const cellX = gx + x * cellStep;
                const cellY = gy + y * cellStep;

                // All player cells are deployable
                ctx.fillStyle = COLOR_GRID_DEPLOY;
                ctx.fillRect(cellX, cellY, GRID_CELL_SIZE, GRID_CELL_SIZE);

                // Check if a deployed unit is at this position
                const deployedIdx = this._getDeployedAtPosition(x, y);
                if (deployedIdx >= 0) {
                    ctx.fillStyle = COLOR_GRID_PLACED;
                    ctx.fillRect(cellX, cellY, GRID_CELL_SIZE, GRID_CELL_SIZE);
                    this._renderUnitInCell(ctx, renderer, this._deployedUnits[deployedIdx].spriteData, cellX, cellY, deployedIdx);
                }

                // Hover highlight
                if (this._hoveredCell && this._hoveredCell.x === x && this._hoveredCell.y === y) {
                    ctx.fillStyle = COLOR_GRID_HOVER;
                    ctx.fillRect(cellX, cellY, GRID_CELL_SIZE, GRID_CELL_SIZE);
                }

                // Cell border
                ctx.strokeStyle = COLOR_GRID_LINES;
                ctx.lineWidth = 2;
                ctx.strokeRect(cellX, cellY, GRID_CELL_SIZE, GRID_CELL_SIZE);

                // Empty cell marker
                if (deployedIdx < 0) {
                    ctx.fillStyle = 'rgba(255,255,255,0.1)';
                    ctx.font = '8px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('+', cellX + GRID_CELL_SIZE / 2, cellY + GRID_CELL_SIZE / 2);
                }
            }
        }

        // ── Enemy Grid (right, directly beside player grid) ─────────────
        const enemyGridX = gx + gridPixelW + GRID_SPACING;

        renderer.drawText('Enemy Territory', enemyGridX, gy - 14, {
            color: '#cc5555',
            font: 'bold 10px sans-serif',
            align: 'left',
            baseline: 'bottom',
        });

        for (let y = 0; y < BattleGrid.GRID_HEIGHT_PER_SIDE; y++) {
            for (let x = 0; x < BattleGrid.GRID_WIDTH; x++) {
                const cellX = enemyGridX + x * cellStep;
                const cellY = gy + y * cellStep;

                ctx.fillStyle = COLOR_GRID_ENEMY;
                ctx.fillRect(cellX, cellY, GRID_CELL_SIZE, GRID_CELL_SIZE);

                // Cell border
                ctx.strokeStyle = COLOR_GRID_LINES;
                ctx.lineWidth = 2;
                ctx.strokeRect(cellX, cellY, GRID_CELL_SIZE, GRID_CELL_SIZE);
            }
        }
    }

    _renderEnemyPreview(ctx, renderer) {
        const gx = GRID_ORIGIN_X;
        const gy = GRID_ORIGIN_Y;
        const cellStep = GRID_CELL_SIZE + GRID_GAP;
        const gridPixelW = BattleGrid.GRID_WIDTH * cellStep - GRID_GAP;
        const enemyGridX = gx + gridPixelW + GRID_SPACING;

        // Place each enemy on the enemy grid (right side)
        for (let i = 0; i < this._enemyTeamData.length; i++) {
            const enemy = this._enemyTeamData[i];

            // Use the enemy's position mapped to 0-based enemy grid coords
            let ex, ey;
            if (enemy.position) {
                ex = enemy.position.x;
                ey = enemy.position.y >= BattleGrid.ENEMY_ROW_MIN
                    ? enemy.position.y - BattleGrid.ENEMY_ROW_MIN
                    : enemy.position.y;
            } else {
                ex = i % BattleGrid.GRID_WIDTH;
                ey = Math.floor(i / BattleGrid.GRID_WIDTH);
            }

            // Clamp to enemy grid bounds
            if (ey < 0 || ey >= BattleGrid.GRID_HEIGHT_PER_SIDE) continue;
            if (ex < 0 || ex >= BattleGrid.GRID_WIDTH) continue;

            const cellX = enemyGridX + ex * cellStep;
            const cellY = gy + ey * cellStep;

            this._renderEnemyInCell(ctx, renderer, enemy, cellX, cellY);
        }
    }

    _renderUnitInCell(ctx, renderer, spriteData, cellX, cellY, deployedIdx) {
        const inst = spriteData.instance || spriteData;
        if (!inst && !spriteData.raceData) return;

        const centerX = cellX + GRID_CELL_SIZE / 2;
        const centerY = cellY + GRID_CELL_SIZE - 4;
        const size = GRID_CELL_SIZE - 2; // chibi sprites fill more cell space
        const isSelected = deployedIdx !== undefined && deployedIdx === this._selectedDeployedIndex;

        // Draw humanoid sprite with equipment
        const raceId = inst.raceId || inst.race_id || 1;
        const stage = inst.evolutionStage || inst.evolution_stage || 1;
        const equipment = inst.equipment || {};
        const animFrame = Math.floor(this._time * 2) % 4;

        SkeletalAnimationSystem.drawWithEquipment(
            ctx, raceId, stage, 0, animFrame,
            centerX, centerY, size,
            { equipment }
        );

        // Selection highlight
        if (isSelected) {
            ctx.strokeStyle = 'rgba(255, 220, 60, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(cellX + 1, cellY + 1, GRID_CELL_SIZE - 2, GRID_CELL_SIZE - 2);
        }

        // Level badge
        const level = inst.level || 1;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(cellX, cellY, 14, 10);
        ctx.fillStyle = '#fff';
        ctx.font = '7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${level}`, cellX + 7, cellY + 8);
        ctx.textAlign = 'left';

        // Element badge (bottom-right)
        const raceData = SPRITE_RACES.find(r => r.race_id === raceId);
        const elemArr = raceData && (raceData.element_types || raceData.elementTypes);
        if (elemArr && elemArr[0]) {
            const elem = elemArr[0];
            const ec = ELEMENT_COLORS[elem] || '#888';
            ctx.fillStyle = ec;
            ctx.beginPath();
            ctx.arc(cellX + GRID_CELL_SIZE - 5, cellY + GRID_CELL_SIZE - 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _renderEnemyInCell(ctx, renderer, enemyData, cellX, cellY) {
        const inst = enemyData.instance || enemyData;
        const centerX = cellX + GRID_CELL_SIZE / 2;
        const centerY = cellY + GRID_CELL_SIZE - 4;
        const size = GRID_CELL_SIZE - 2; // chibi sprites fill more cell space

        const raceId = inst.raceId || inst.race_id || 1;
        const stage = inst.evolutionStage || inst.evolution_stage || 1;
        const equipment = inst.equipment || {};
        const animFrame = Math.floor(this._time * 2) % 4;

        ctx.globalAlpha = 0.75;
        SkeletalAnimationSystem.drawWithEquipment(
            ctx, raceId, stage, 0, animFrame,
            centerX, centerY, size,
            { equipment }
        );
        ctx.globalAlpha = 1;

        // Level badge
        const level = inst.level || enemyData.level || 1;
        ctx.fillStyle = 'rgba(100,20,20,0.7)';
        ctx.fillRect(cellX, cellY, 14, 10);
        ctx.fillStyle = '#ff8888';
        ctx.font = '7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${level}`, cellX + 7, cellY + 8);
        ctx.textAlign = 'left';
    }

    _renderDragSprite(ctx, renderer) {
        const spriteData = this._dragSprite;
        if (!spriteData) return;

        const drawX = this._dragScreenX - GRID_CELL_SIZE / 2;
        const drawY = this._dragScreenY - GRID_CELL_SIZE / 2;

        ctx.fillStyle = 'rgba(50, 150, 255, 0.3)';
        ctx.fillRect(drawX, drawY, GRID_CELL_SIZE, GRID_CELL_SIZE);

        const inst = spriteData.instance || spriteData;
        const raceId = inst.raceId || inst.race_id || 1;
        const stage = inst.evolutionStage || inst.evolution_stage || 1;
        const equipment = inst.equipment || {};
        const animFrame = Math.floor(this._time * 2) % 4;

        ctx.globalAlpha = 0.75;
        SkeletalAnimationSystem.drawWithEquipment(
            ctx, raceId, stage, 0, animFrame,
            this._dragScreenX, this._dragScreenY + 4, GRID_CELL_SIZE - 2,
            { equipment }
        );
        ctx.globalAlpha = 1;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Input
    // ═══════════════════════════════════════════════════════════════════

    onInput(input) {
        const px = input.pointerPos.x;
        const py = input.pointerPos.y;

        // Update hovered cell (deployment grid only)
        this._hoveredCell = this._screenToDeployGrid(px, py);

        // Update drag position
        if (this._isDragging) {
            this._dragScreenX = px;
            this._dragScreenY = py;
        }

        // Handle pointer release (drop)
        if (this._isDragging && !input.isPressed()) {
            this._handleDrop(px, py);
            return;
        }

        // Handle taps
        if (input.isTap()) {
            // Check if tap is on the player deployment grid
            const cell = this._screenToDeployGrid(px, py);
            if (cell) {
                this._handleGridTap(cell);
                return;
            }

            // Check if tap is on the enemy grid (right side)
            const enemyCell = this._screenToEnemyGrid(px, py);
            if (enemyCell) {
                const enemy = this._getEnemyAtPosition(enemyCell.x, enemyCell.y);
                if (enemy) {
                    this._detailSprite = enemy;
                    this._selectedDeployedIndex = -1;
                    this._refreshDetailPanel();
                    this.engine.audio.playSFX(
                        this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.4
                    );
                    return;
                }
            }
        }

        // Handle pointer down for drag start from grid
        if (input.justPressed && input.justPressed()) {
            const cell = this._screenToDeployGrid(px, py);
            if (cell) {
                const deployIdx = this._getDeployedAtPosition(cell.x, cell.y);
                if (deployIdx >= 0) {
                    this._startDrag(deployIdx, px, py);
                }
            }
        }

        // Keyboard shortcuts
        if (input.isKeyJustPressed('Enter') || input.isKeyJustPressed('Space')) {
            if (this._canStartBattle()) {
                this._startBattle();
            }
        }
        if (input.isKeyJustPressed('Escape')) {
            this._goBack();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Deployment Logic
    // ═══════════════════════════════════════════════════════════════════

    _autoDeployDefault() {
        this._deployedUnits = [];
        const count = Math.min(MAX_DEPLOY_UNITS, this._availableSprites.length);

        // Default positions: center units in the 9x9 grid
        const defaultPositions = [];
        const startCol = Math.floor((BattleGrid.GRID_WIDTH - Math.min(count, 3)) / 2);
        const startRow = Math.floor((BattleGrid.GRID_HEIGHT_PER_SIDE - Math.ceil(count / 3)) / 2);
        for (let i = 0; i < count; i++) {
            const col = startCol + (i % 3);
            const row = startRow + Math.floor(i / 3);
            defaultPositions.push({ x: col, y: row });
        }

        for (let i = 0; i < count; i++) {
            this._deployedUnits.push({
                spriteData: this._availableSprites[i],
                position: { ...defaultPositions[i] },
            });
        }
    }

    _isDeployablePosition(x, y) {
        return x >= 0 && x < BattleGrid.GRID_WIDTH &&
               y >= 0 && y < BattleGrid.GRID_HEIGHT_PER_SIDE;
    }

    _getDeployedAtPosition(x, y) {
        for (let i = 0; i < this._deployedUnits.length; i++) {
            const d = this._deployedUnits[i];
            if (d.position.x === x && d.position.y === y) return i;
        }
        return -1;
    }

    _isPositionOccupied(x, y, excludeIndex = -1) {
        for (let i = 0; i < this._deployedUnits.length; i++) {
            if (i === excludeIndex) continue;
            const d = this._deployedUnits[i];
            if (d.position.x === x && d.position.y === y) return true;
        }
        return false;
    }

    _handleGridTap(cell) {
        if (!this._isDeployablePosition(cell.x, cell.y)) return;

        const deployIdx = this._getDeployedAtPosition(cell.x, cell.y);

        if (deployIdx >= 0) {
            // Tapped on a deployed unit: select it for detail view
            this._selectDeployedUnit(deployIdx);
        } else if (this._selectedRosterIndex >= 0) {
            // Place the selected roster unit here
            this._placeFromRoster(this._selectedRosterIndex, cell);
        }
    }

    _selectDeployedUnit(index) {
        this._selectedDeployedIndex = index;
        const data = this._deployedUnits[index].spriteData;
        this._detailSprite = data;
        this._refreshDetailPanel();

        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.4
        );
    }

    _selectRosterSprite(index) {
        // Check if already deployed
        const sprite = this._availableSprites[index];
        const alreadyDeployed = this._deployedUnits.some(
            d => d.spriteData === sprite
        );

        if (alreadyDeployed) {
            // Select the deployed version for detail view
            const depIdx = this._deployedUnits.findIndex(d => d.spriteData === sprite);
            if (depIdx >= 0) {
                this._selectDeployedUnit(depIdx);
            }
            return;
        }

        this._selectedRosterIndex = index;
        this._detailSprite = sprite;
        this._refreshDetailPanel();
        this._refreshRosterPanel();

        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.3
        );
    }

    _placeFromRoster(rosterIndex, cell) {
        const sprite = this._availableSprites[rosterIndex];
        if (!sprite) return;

        // Check max deployment count
        if (this._deployedUnits.length >= MAX_DEPLOY_UNITS) {
            // Replace: find the nearest deployed unit and swap it out
            // For now, just reject placement
            return;
        }

        // Check position not occupied
        if (this._isPositionOccupied(cell.x, cell.y)) return;

        this._deployedUnits.push({
            spriteData: sprite,
            position: { x: cell.x, y: cell.y },
        });

        this._selectedRosterIndex = -1;
        this._refreshRosterPanel();
        this._refreshStartButton();

        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_place.ogg'), 0.5
        );
    }

    _removeDeployedUnit(index) {
        if (index < 0 || index >= this._deployedUnits.length) return;
        this._deployedUnits.splice(index, 1);
        this._selectedDeployedIndex = -1;
        this._detailSprite = null;
        this._refreshRosterPanel();
        this._refreshDetailPanel();
        this._refreshStartButton();
    }

    _startDrag(deployedIndex, px, py) {
        this._isDragging = true;
        this._dragSprite = this._deployedUnits[deployedIndex].spriteData;
        this._dragScreenX = px;
        this._dragScreenY = py;
        this._selectedDeployedIndex = deployedIndex;
    }

    _handleDrop(px, py) {
        if (!this._isDragging || this._selectedDeployedIndex < 0) {
            this._isDragging = false;
            this._dragSprite = null;
            return;
        }

        const cell = this._screenToDeployGrid(px, py);

        if (cell && this._isDeployablePosition(cell.x, cell.y)) {
            // Check if another unit is at the drop position
            const existingIdx = this._getDeployedAtPosition(cell.x, cell.y);
            if (existingIdx >= 0 && existingIdx !== this._selectedDeployedIndex) {
                // Swap positions
                const temp = { ...this._deployedUnits[existingIdx].position };
                this._deployedUnits[existingIdx].position = { ...this._deployedUnits[this._selectedDeployedIndex].position };
                this._deployedUnits[this._selectedDeployedIndex].position = temp;
            } else if (existingIdx < 0) {
                // Move to empty cell
                this._deployedUnits[this._selectedDeployedIndex].position = { x: cell.x, y: cell.y };
            }
        }

        this._isDragging = false;
        this._dragSprite = null;
        this._selectedDeployedIndex = -1;
    }

    _canStartBattle() {
        return this._deployedUnits.length >= 1 && this._deployedUnits.length <= MAX_DEPLOY_UNITS;
    }

    async _startBattle() {
        if (!this._canStartBattle()) return;

        this.engine.audio.playSFX(
            this.engine.assets.resolvePath('Audio/Sounds/ui_confirm.ogg'), 0.6
        );

        // Build player team with grid positions mapped to full BattleGrid coordinates
        const playerTeam = this._deployedUnits.map(d => ({
            ...d.spriteData,
            position: { x: d.position.x, y: d.position.y },
        }));

        // Assign enemy positions to enemy side of the grid (rows 9-17)
        const enemyTeam = this._enemyTeamData.map((e, i) => {
            if (!e.position) {
                const defaultX = i % BattleGrid.GRID_WIDTH;
                const defaultY = BattleGrid.ENEMY_ROW_MIN + Math.floor(i / BattleGrid.GRID_WIDTH);
                return { ...e, position: { x: defaultX, y: defaultY } };
            }
            // Ensure existing positions are mapped to enemy row range
            const ey = e.position.y < BattleGrid.ENEMY_ROW_MIN
                ? e.position.y + BattleGrid.ENEMY_ROW_MIN
                : e.position.y;
            return { ...e, position: { x: e.position.x, y: ey } };
        });

        this.engine.audio.stopMusic(300);

        // Transition to RTSBattleScene (Hero's Hour-style real-time combat)
        try {
            await this.engine.scenes.changeTo('rts_battle', {
                playerTeam,
                enemyTeam,
                background: `Sprites/Battle Backgrounds/temple_${this._templeId || 1}.png`,
                isBoss: this._enemyTeamData.some(e => e.isBoss),
                returnData: this._encounterData.returnData || null,
            });
        } catch (err) {
            console.error('DeploymentScene: Failed to transition to battle:', err);
        }
    }

    _goBack() {
        this.engine.audio.stopMusic(300);
        const returnData = this._encounterData?.returnData || {};
        this.engine.scenes.changeTo('overworld', {
            spawnPoint: returnData.spawnPoint || null,
            gameData: returnData.gameData || null,
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // DOM Construction
    // ═══════════════════════════════════════════════════════════════════

    _createDOM() {
        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
        }

        this._domContainer = document.createElement('div');
        this._domContainer.id = 'deployment-scene-overlays';
        this._domContainer.style.cssText = `
            position:absolute;top:0;left:0;width:100%;height:100%;
            pointer-events:none;z-index:10;
        `;

        // Roster panel (right side)
        this._rosterPanelEl = document.createElement('div');
        this._rosterPanelEl.id = 'deployment-roster';
        this._rosterPanelEl.style.cssText = `
            position:absolute;top:60px;right:4px;
            width:${ROSTER_PANEL_WIDTH}px;
            max-height:${this.engine.designHeight - 60 - DETAIL_PANEL_HEIGHT - 60}px;
            background:rgba(0,0,0,0.7);border-radius:8px;
            border:1px solid rgba(255,255,255,0.1);
            pointer-events:auto;overflow-y:auto;
        `;
        this._domContainer.appendChild(this._rosterPanelEl);

        // Detail panel (bottom)
        this._detailPanelEl = document.createElement('div');
        this._detailPanelEl.id = 'deployment-detail';
        this._detailPanelEl.style.cssText = `
            position:absolute;bottom:52px;right:4px;
            width:280px;
            max-height:${this.engine.designHeight - 120}px;
            pointer-events:auto;overflow-y:auto;
        `;
        this._domContainer.appendChild(this._detailPanelEl);

        // Start Battle button
        this._startBtnEl = document.createElement('button');
        this._startBtnEl.id = 'deployment-start-btn';
        this._startBtnEl.style.cssText = `
            position:absolute;bottom:8px;left:50%;transform:translateX(-50%);
            padding:10px 36px;font-size:1rem;font-weight:700;
            border:2px solid #33aa66;border-radius:8px;
            background:rgba(30,100,60,0.8);color:#ffffff;
            cursor:pointer;pointer-events:auto;
            transition:background 0.2s;
        `;
        this._startBtnEl.textContent = 'Start Battle';
        this._startBtnEl.addEventListener('click', () => this._startBattle());
        this._startBtnEl.addEventListener('mouseenter', () => {
            this._startBtnEl.style.background = 'rgba(40,140,80,0.9)';
        });
        this._startBtnEl.addEventListener('mouseleave', () => {
            this._startBtnEl.style.background = 'rgba(30,100,60,0.8)';
        });
        this._domContainer.appendChild(this._startBtnEl);

        // Back button
        const backBtn = document.createElement('button');
        backBtn.style.cssText = `
            position:absolute;top:8px;left:8px;
            padding:6px 14px;font-size:0.8rem;
            border:1px solid #555;border-radius:6px;
            background:rgba(0,0,0,0.5);color:#aaa;
            cursor:pointer;pointer-events:auto;
        `;
        backBtn.textContent = '\u2190 Back';
        backBtn.addEventListener('click', () => this._goBack());
        this._domContainer.appendChild(backBtn);

        const gameContainer = document.getElementById('game-container') || document.body;
        gameContainer.appendChild(this._domContainer);
    }

    _refreshRosterPanel() {
        if (!this._rosterPanelEl) return;
        this._rosterPanelEl.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'padding:8px;font-size:0.75rem;font-weight:700;color:#aaa;border-bottom:1px solid rgba(255,255,255,0.08);';
        header.textContent = `Party (${this._deployedUnits.length}/${MAX_DEPLOY_UNITS} deployed)`;
        this._rosterPanelEl.appendChild(header);

        // List of available sprites — rendered via UnitRenderer.createUnitCard()
        for (let i = 0; i < this._availableSprites.length; i++) {
            const sprite = this._availableSprites[i];
            const spriteInst = sprite.instance || sprite;
            const isDeployed = this._deployedUnits.some(d => d.spriteData === sprite);

            const card = UnitRenderer.createUnitCard(spriteInst, {
                cardWidth: ROSTER_PANEL_WIDTH - 12,
                cardHeight: 52,
                previewSize: 42,
                showEquipment: true,
                showHpBar: false,
                isSelected: isDeployed,
                onClick: () => this._selectRosterSprite(i),
            });
            card.style.margin = '2px 4px';
            card.style.position = 'relative';

            // Add PNG race sprite portrait
            const raceId = spriteInst.raceId || spriteInst.race_id || Math.ceil((spriteInst.formId || spriteInst.form_id || 1) / 3);
            const stage = (((spriteInst.formId || spriteInst.form_id || 1) - 1) % 3);
            const spritePath = getRaceSpritePath(raceId, stage);
            if (spritePath) {
                const img = document.createElement('img');
                img.src = spritePath;
                img.style.cssText = 'width:42px;height:42px;object-fit:contain;image-rendering:pixelated;position:absolute;left:4px;top:5px;z-index:1;';
                img.onerror = () => { img.style.display = 'none'; };
                card.appendChild(img);
            }

            this._rosterPanelEl.appendChild(card);
        }
    }

    _refreshDetailPanel() {
        if (!this._detailPanelEl) return;

        const sprite = this._detailSprite;
        if (!sprite) {
            this._inspectPanel.hide();
            return;
        }

        const isEnemy = this._enemyTeamData.includes(sprite);
        const isDeployed = !isEnemy && this._deployedUnits.some(d => d.spriteData === sprite);

        this._inspectPanel.show(this._detailPanelEl, sprite, {
            position: 'right',
            isEnemy,
            isDeployed,
            onClose: () => {
                this._detailSprite = null;
                this._selectedDeployedIndex = -1;
                this._selectedRosterIndex = -1;
                this._refreshRosterPanel();
            },
            onRemove: isDeployed ? () => {
                const idx = this._deployedUnits.findIndex(d => d.spriteData === sprite);
                if (idx >= 0) this._removeDeployedUnit(idx);
            } : null,
            onDeposit: null,
        });
    }

    _refreshStartButton() {
        if (!this._startBtnEl) return;
        const canStart = this._canStartBattle();
        this._startBtnEl.style.opacity = canStart ? '1' : '0.4';
        this._startBtnEl.style.cursor = canStart ? 'pointer' : 'not-allowed';
        this._startBtnEl.textContent = `Start Battle (${this._deployedUnits.length}/${MAX_DEPLOY_UNITS})`;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Maps screen coordinates to a cell on the player grid (left side, 9x9).
     * Returns null if the position is outside the player grid.
     */
    _screenToDeployGrid(px, py) {
        const gx = GRID_ORIGIN_X;
        const gy = GRID_ORIGIN_Y;
        const cellStep = GRID_CELL_SIZE + GRID_GAP;

        const gridX = Math.floor((px - gx) / cellStep);
        const gridY = Math.floor((py - gy) / cellStep);

        if (gridX < 0 || gridX >= BattleGrid.GRID_WIDTH) return null;
        if (gridY < 0 || gridY >= BattleGrid.GRID_HEIGHT_PER_SIDE) return null;

        // Check we're inside the cell, not in the gap
        const localX = px - gx - gridX * cellStep;
        const localY = py - gy - gridY * cellStep;
        if (localX > GRID_CELL_SIZE || localY > GRID_CELL_SIZE) return null;

        return { x: gridX, y: gridY };
    }

    /**
     * Maps screen coordinates to a cell on the enemy grid (right side, 9x9).
     * Returns { x, y } in enemy-local coordinates (0-8), or null if outside.
     */
    _screenToEnemyGrid(px, py) {
        const cellStep = GRID_CELL_SIZE + GRID_GAP;
        const gridPixelW = BattleGrid.GRID_WIDTH * cellStep - GRID_GAP;
        const enemyGridX = GRID_ORIGIN_X + gridPixelW + GRID_SPACING;
        const gy = GRID_ORIGIN_Y;

        const gridX = Math.floor((px - enemyGridX) / cellStep);
        const gridY = Math.floor((py - gy) / cellStep);

        if (gridX < 0 || gridX >= BattleGrid.GRID_WIDTH) return null;
        if (gridY < 0 || gridY >= BattleGrid.GRID_HEIGHT_PER_SIDE) return null;

        const localX = px - enemyGridX - gridX * cellStep;
        const localY = py - gy - gridY * cellStep;
        if (localX > GRID_CELL_SIZE || localY > GRID_CELL_SIZE) return null;

        return { x: gridX, y: gridY };
    }

    /**
     * Find the enemy data at a given enemy-grid-local position (0-8, 0-8).
     * Returns the enemy object or null.
     */
    _getEnemyAtPosition(x, y) {
        for (let i = 0; i < this._enemyTeamData.length; i++) {
            const enemy = this._enemyTeamData[i];
            let ex, ey;
            if (enemy.position) {
                ex = enemy.position.x;
                ey = enemy.position.y >= BattleGrid.ENEMY_ROW_MIN
                    ? enemy.position.y - BattleGrid.ENEMY_ROW_MIN
                    : enemy.position.y;
            } else {
                ex = i % BattleGrid.GRID_WIDTH;
                ey = Math.floor(i / BattleGrid.GRID_WIDTH);
            }
            if (ex === x && ey === y) return enemy;
        }
        return null;
    }
}

/**
 * RTSBattleRenderer.js — Renders the Hero's Hour-style RTS battlefield.
 *
 * Draws:
 *   - Battlefield background with terrain indication
 *   - All living units as humanoid sprites with equipment
 *   - Health bars above units
 *   - Status effect icons
 *   - Floating damage/heal numbers
 *   - Attack/ability visual effects (slashes, projectiles, impact rings)
 *   - Dead unit fade-out
 *   - Team indicators (blue=player, red=enemy)
 */

import { HumanoidSpriteSystem } from './HumanoidSpriteSystem.js';
import { UnitState } from '../battle/RTSUnit.js';

// ── Colors ──────────────────────────────────────────────────────────────────
const COLOR_BG = '#1a1a2e';
const COLOR_FIELD_BG = '#16213e';
const COLOR_FIELD_BORDER = '#0f3460';
const COLOR_PLAYER_SIDE = 'rgba(40, 80, 180, 0.08)';
const COLOR_ENEMY_SIDE = 'rgba(180, 40, 40, 0.08)';
const COLOR_GRID_LINES = 'rgba(255, 255, 255, 0.03)';
const COLOR_HP_BG = 'rgba(0, 0, 0, 0.6)';
const COLOR_HP_GREEN = '#33cc66';
const COLOR_HP_YELLOW = '#cccc33';
const COLOR_HP_RED = '#cc3333';
const COLOR_PLAYER_BORDER = 'rgba(50, 120, 255, 0.4)';
const COLOR_ENEMY_BORDER = 'rgba(255, 50, 50, 0.4)';
const COLOR_SHADOW = 'rgba(0, 0, 0, 0.3)';

// ── Element Colors ──────────────────────────────────────────────────────────
const ELEMENT_COLORS = {
    Fire: '#ff6633', Water: '#3399ff', Nature: '#33cc66',
    Ice: '#88ccff', Air: '#aaddcc', Earth: '#cc9944',
    Electric: '#ffcc33', Dark: '#8855cc', Light: '#ffee88',
    Psychic: '#dd66cc', Spirit: '#99bbdd', Chaos: '#dd3344',
    Metal: '#aaaacc', Poison: '#aa66cc',
};

// ── Unit Draw Constants ─────────────────────────────────────────────────────
const UNIT_DRAW_SIZE = 32;        // Pixel size per unit sprite
const HP_BAR_WIDTH = 28;
const HP_BAR_HEIGHT = 3;
const HP_BAR_OFFSET_Y = 4;       // Above unit top
const LEVEL_BADGE_SIZE = 10;
const STATUS_ICON_SIZE = 8;

// ── Floating Text ───────────────────────────────────────────────────────────
const FLOAT_SPEED = 30;          // Pixels per second upward
const FLOAT_DURATION = 1.2;      // Seconds before fade
const FLOAT_FADE_START = 0.7;   // When to start fading

export class RTSBattleRenderer {

    /** @type {Array<{text: string, x: number, y: number, color: string, age: number, size: number}>} */
    _floatingTexts = [];

    /** @type {Array<{x: number, y: number, radius: number, color: string, age: number, maxAge: number}>} */
    _effects = [];

    /** Background image (if loaded). */
    _bgImage = null;

    /** Reference to the battle field for coordinate conversion. */
    _field = null;

    /** Elapsed render time for idle animations. */
    _elapsedTime = 0;

    constructor() {
        this._floatingTexts = [];
        this._effects = [];
        this._elapsedTime = 0;
    }

    /**
     * Set the battlefield reference for coordinate conversion.
     * @param {import('../battle/RTSBattleField.js').RTSBattleField} field
     */
    setField(field) {
        this._field = field;
    }

    /**
     * Set the background image.
     * @param {HTMLImageElement} img
     */
    setBackground(img) {
        this._bgImage = img;
    }

    // ── Main Render ─────────────────────────────────────────────────────────

    /**
     * Render the full battlefield.
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('../battle/RTSBattleField.js').RTSBattleField} field
     * @param {number} dt - Delta time for animations
     */
    render(ctx, field, dt) {
        this._field = field;
        this._elapsedTime += dt;

        // 1. Background
        this._drawBackground(ctx, field);

        // 2. Field area
        this._drawFieldArea(ctx, field);

        // 3. Ground shadows for all units
        this._drawShadows(ctx, field);

        // 4. Units (sorted by Y for depth)
        this._drawUnits(ctx, field, dt);

        // 5. Health bars and status icons
        this._drawUnitOverlays(ctx, field);

        // 6. Floating damage/heal text
        this._updateAndDrawFloatingTexts(ctx, dt);

        // 7. Visual effects (attack rings, projectile trails)
        this._updateAndDrawEffects(ctx, dt);
    }

    // ── Background ──────────────────────────────────────────────────────────

    _drawBackground(ctx, field) {
        // Full screen background
        ctx.fillStyle = COLOR_BG;
        ctx.fillRect(0, 0, 960, 540);

        // Background image
        if (this._bgImage && this._bgImage.complete) {
            ctx.globalAlpha = 0.3;
            ctx.drawImage(this._bgImage, 0, 0, 960, 540);
            ctx.globalAlpha = 1;
        }
    }

    _drawFieldArea(ctx, field) {
        const ox = field.offsetX;
        const oy = field.offsetY;
        const w = field.width;
        const h = field.height;

        // Field background
        ctx.fillStyle = COLOR_FIELD_BG;
        ctx.fillRect(ox, oy, w, h);

        // Team side tints
        ctx.fillStyle = COLOR_PLAYER_SIDE;
        ctx.fillRect(ox, oy, w / 2, h);
        ctx.fillStyle = COLOR_ENEMY_SIDE;
        ctx.fillRect(ox + w / 2, oy, w / 2, h);

        // Subtle grid lines
        ctx.strokeStyle = COLOR_GRID_LINES;
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= w; gx += 40) {
            ctx.beginPath();
            ctx.moveTo(ox + gx, oy);
            ctx.lineTo(ox + gx, oy + h);
            ctx.stroke();
        }
        for (let gy = 0; gy <= h; gy += 40) {
            ctx.beginPath();
            ctx.moveTo(ox, oy + gy);
            ctx.lineTo(ox + w, oy + gy);
            ctx.stroke();
        }

        // Center divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(ox + w / 2, oy);
        ctx.lineTo(ox + w / 2, oy + h);
        ctx.stroke();
        ctx.setLineDash([]);

        // Border
        ctx.strokeStyle = COLOR_FIELD_BORDER;
        ctx.lineWidth = 2;
        ctx.strokeRect(ox, oy, w, h);
    }

    // ── Shadows ─────────────────────────────────────────────────────────────

    _drawShadows(ctx, field) {
        for (const unit of field.units) {
            if (!unit.isAlive) continue;

            const screen = field.worldToScreen(unit.worldPos.x, unit.worldPos.y);
            ctx.fillStyle = COLOR_SHADOW;
            ctx.beginPath();
            ctx.ellipse(screen.x, screen.y + 2, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Units ───────────────────────────────────────────────────────────────

    _drawUnits(ctx, field, dt) {
        // Sort units by Y position for depth ordering
        const sortedUnits = [...field.units].sort((a, b) => a.worldPos.y - b.worldPos.y);

        for (const unit of sortedUnits) {
            const screen = field.worldToScreen(unit.worldPos.x, unit.worldPos.y);

            // Dead units fade out
            if (!unit.isAlive) {
                ctx.globalAlpha = 0.3;
                this._drawUnitSprite(ctx, unit, screen.x, screen.y, 0);
                ctx.globalAlpha = 1;
                continue;
            }

            // Hit flash
            if (unit.hitFlashTimer > 0) {
                ctx.globalAlpha = 0.6 + Math.sin(unit.hitFlashTimer * 30) * 0.4;
            } else {
                ctx.globalAlpha = 1;
            }

            // Attack animation: slight lunge toward target
            let drawX = screen.x;
            let drawY = screen.y;
            if (unit.state === UnitState.ATTACKING && unit.target) {
                const targetScreen = field.worldToScreen(unit.target.worldPos.x, unit.target.worldPos.y);
                const lungeProgress = unit.animTimer > 0 ? (0.3 - unit.animTimer) / 0.3 : 0;
                const lungeDist = 6 * Math.sin(lungeProgress * Math.PI);
                const dx = targetScreen.x - screen.x;
                const dy = targetScreen.y - screen.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                drawX += (dx / len) * lungeDist;
                drawY += (dy / len) * lungeDist;
            }

            // Cast animation: glow
            if (unit.state === UnitState.CASTING) {
                const castProgress = unit.animTimer > 0 ? (0.5 - unit.animTimer) / 0.5 : 0;
                const glowRadius = 16 + castProgress * 8;
                const elemColor = ELEMENT_COLORS[unit.elementTypes[0]] || '#ffffff';
                ctx.fillStyle = elemColor;
                ctx.globalAlpha = 0.15 + castProgress * 0.1;
                ctx.beginPath();
                ctx.arc(drawX, drawY - UNIT_DRAW_SIZE / 2, glowRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Idle animation: gentle bob and slow frame cycling for non-moving units
            let spriteFrame = unit.walkFrame;
            if (unit.state !== UnitState.MOVING) {
                // Slow idle frame cycling (alternates between 0 and 2)
                spriteFrame = Math.floor(this._elapsedTime * 1.5) % 2 === 0 ? 0 : 2;
                // Subtle idle bob
                drawY += Math.sin(this._elapsedTime * 2.5 + unit.worldPos.x * 0.1) * 1.5;
            }

            // Draw the unit sprite
            this._drawUnitSprite(ctx, unit, drawX, drawY, spriteFrame);

            // Team indicator ring
            ctx.strokeStyle = unit.team === 0 ? COLOR_PLAYER_BORDER : COLOR_ENEMY_BORDER;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(drawX, drawY + 2, 11, 5, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = 1;
        }
    }

    _drawUnitSprite(ctx, unit, x, y, frame) {
        // Use HumanoidSpriteSystem for composite sprites
        HumanoidSpriteSystem.drawWithEquipment(
            ctx, unit.raceId, unit.evolutionStage,
            unit.facing, frame != null ? frame : unit.walkFrame,
            x, y, UNIT_DRAW_SIZE,
            { showWeapon: true }
        );
    }

    // ── Unit Overlays (HP bars, status, level) ──────────────────────────────

    _drawUnitOverlays(ctx, field) {
        for (const unit of field.units) {
            if (!unit.isAlive) continue;

            const screen = field.worldToScreen(unit.worldPos.x, unit.worldPos.y);
            const topY = screen.y - UNIT_DRAW_SIZE - HP_BAR_OFFSET_Y;

            // HP bar
            const hpFrac = unit.getHpFraction();
            const barX = screen.x - HP_BAR_WIDTH / 2;
            const barY = topY;

            // Background
            ctx.fillStyle = COLOR_HP_BG;
            ctx.fillRect(barX - 1, barY - 1, HP_BAR_WIDTH + 2, HP_BAR_HEIGHT + 2);

            // Fill
            const hpColor = hpFrac > 0.5 ? COLOR_HP_GREEN
                : hpFrac > 0.25 ? COLOR_HP_YELLOW
                : COLOR_HP_RED;
            ctx.fillStyle = hpColor;
            ctx.fillRect(barX, barY, HP_BAR_WIDTH * hpFrac, HP_BAR_HEIGHT);

            // Level badge
            const level = unit.getLevel();
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(barX - 12, barY - 1, 11, 9);
            ctx.fillStyle = '#fff';
            ctx.font = '7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${level}`, barX - 6, barY + 6);

            // Status effect icons
            if (unit.activeStatusEffects.length > 0) {
                let iconX = screen.x - (unit.activeStatusEffects.length * (STATUS_ICON_SIZE + 1)) / 2;
                const iconY = topY - STATUS_ICON_SIZE - 2;

                for (const effect of unit.activeStatusEffects) {
                    const ed = effect.effectData;
                    if (!ed) continue;

                    // Color-coded status dot
                    const statusColor = ed.preventsAction ? '#ff4444'
                        : ed.isDot ? '#ff8800'
                        : '#44aaff';
                    ctx.fillStyle = statusColor;
                    ctx.beginPath();
                    ctx.arc(iconX + STATUS_ICON_SIZE / 2, iconY + STATUS_ICON_SIZE / 2,
                        STATUS_ICON_SIZE / 2, 0, Math.PI * 2);
                    ctx.fill();

                    iconX += STATUS_ICON_SIZE + 1;
                }
            }
        }

        ctx.textAlign = 'left'; // Reset
    }

    // ── Floating Text ───────────────────────────────────────────────────────

    /**
     * Add a floating damage/heal number.
     */
    addFloatingText(worldX, worldY, text, color = '#fff', size = 12) {
        if (!this._field) return;
        const screen = this._field.worldToScreen(worldX, worldY);
        this._floatingTexts.push({
            text,
            x: screen.x + (Math.random() - 0.5) * 10,
            y: screen.y - UNIT_DRAW_SIZE,
            color,
            age: 0,
            size,
        });
    }

    _updateAndDrawFloatingTexts(ctx, dt) {
        for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
            const ft = this._floatingTexts[i];
            ft.age += dt;
            ft.y -= FLOAT_SPEED * dt;

            if (ft.age >= FLOAT_DURATION) {
                this._floatingTexts.splice(i, 1);
                continue;
            }

            // Fade
            const alpha = ft.age > FLOAT_FADE_START
                ? 1 - (ft.age - FLOAT_FADE_START) / (FLOAT_DURATION - FLOAT_FADE_START)
                : 1;

            ctx.globalAlpha = alpha;
            ctx.font = `bold ${ft.size}px monospace`;
            ctx.textAlign = 'center';

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillText(ft.text, ft.x + 1, ft.y + 1);

            // Text
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);

            ctx.globalAlpha = 1;
        }
        ctx.textAlign = 'left';
    }

    // ── Visual Effects ──────────────────────────────────────────────────────

    /**
     * Add a visual effect (impact ring, spell glow).
     */
    addEffect(worldX, worldY, color = '#fff', radius = 20, duration = 0.4) {
        if (!this._field) return;
        const screen = this._field.worldToScreen(worldX, worldY);
        this._effects.push({
            x: screen.x,
            y: screen.y - UNIT_DRAW_SIZE / 2,
            radius,
            color,
            age: 0,
            maxAge: duration,
        });
    }

    _updateAndDrawEffects(ctx, dt) {
        for (let i = this._effects.length - 1; i >= 0; i--) {
            const e = this._effects[i];
            e.age += dt;

            if (e.age >= e.maxAge) {
                this._effects.splice(i, 1);
                continue;
            }

            const progress = e.age / e.maxAge;
            const alpha = 1 - progress;
            const currentRadius = e.radius * (0.5 + progress * 0.5);

            ctx.globalAlpha = alpha * 0.4;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = alpha * 0.8;
            ctx.strokeStyle = e.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(e.x, e.y, currentRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = 1;
        }
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────

    clear() {
        this._floatingTexts = [];
        this._effects = [];
        this._bgImage = null;
        this._field = null;
    }
}

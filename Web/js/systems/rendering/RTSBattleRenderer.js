/**
 * RTSBattleRenderer.js — Renders the RTS battlefield.
 *
 * Art Style: 2D mobile game cel-shaded style
 *   - Clean black outlines of uniform 2-3px thickness
 *   - Flat cel-shading with one highlight and one shadow per color zone (NO gradients)
 *   - Chibi proportions for units (large head, compact body)
 *   - Vibrant saturated fantasy color palette
 *   - Bold readable silhouettes
 *   - Clean geometric shapes for effects and UI
 *
 * Draws:
 *   - Battlefield background with flat cel-shaded terrain
 *   - All living units as chibi humanoid sprites with equipment
 *   - Health bars with clean black outlines
 *   - Status effect icons with outlines
 *   - Floating damage/heal numbers with outlines
 *   - Attack/ability visual effects (clean geometric shapes)
 *   - Dead unit fade-out
 *   - Team indicators (blue=player, red=enemy)
 */

import { HumanoidSpriteSystem } from './HumanoidSpriteSystem.js';
import { UnitState } from '../battle/RTSUnit.js';
import { BattleAnimationController } from '../battle/BattleAnimationController.js';
import { BattleVFXSystem } from '../battle/BattleVFXSystem.js';

// ── Cel-Shaded Color Palette (vibrant, saturated, flat) ─────────────────────
const COLOR_BG = '#1a1a2e';
const COLOR_FIELD_BG = '#2a4a3a';           // Vibrant grassy base
const COLOR_FIELD_BG_SHADOW = '#1e3a2c';    // One shadow tone for field
const COLOR_FIELD_BG_HIGHLIGHT = '#3a6a4a'; // One highlight tone for field
const COLOR_FIELD_BORDER = '#111111';        // Clean black outline for field
const COLOR_PLAYER_SIDE = '#2a4a5a';         // Flat blue-tinted ground (player side)
const COLOR_ENEMY_SIDE = '#4a2a2a';          // Flat red-tinted ground (enemy side)
const COLOR_GRID_LINES = 'rgba(255, 255, 255, 0.06)';
const COLOR_HP_BG = '#222222';
const COLOR_HP_BORDER = '#111111';           // Clean black outline for HP bars
const COLOR_HP_GREEN = '#33dd55';            // Vibrant green
const COLOR_HP_GREEN_HIGHLIGHT = '#55ff77';  // Highlight zone
const COLOR_HP_YELLOW = '#dddd33';
const COLOR_HP_YELLOW_HIGHLIGHT = '#ffff55';
const COLOR_HP_RED = '#dd3333';
const COLOR_HP_RED_HIGHLIGHT = '#ff5555';
const COLOR_PLAYER_RING = '#3388ff';         // Solid vibrant blue
const COLOR_ENEMY_RING = '#ff3333';          // Solid vibrant red
const COLOR_SHADOW = '#1a1a1a';              // Flat shadow (no transparency for clean cel look)
const COLOR_OUTLINE = '#111111';             // Universal clean black outline

// ── Element Colors (vibrant saturated) ──────────────────────────────────────
const ELEMENT_COLORS = {
    Fire: '#ff4422', Water: '#2288ff', Plant: '#22cc44',
    Ice: '#66ccff', Wind: '#88ddbb', Earth: '#cc8833',
    Electric: '#ffcc00', Dark: '#7744cc', Light: '#ffee44',
    Fairy: '#dd44cc', Solar: '#88bbdd', Lunar: '#dd2244',
    Metal: '#9999bb', Poison: '#aa44cc',
};

// ── Unit Draw Constants (chibi proportions) ─────────────────────────────────
const UNIT_DRAW_SIZE = 56;        // Chibi sprites drawn larger for big-head readability
const HP_BAR_WIDTH = 42;
const HP_BAR_HEIGHT = 5;
const HP_BAR_OFFSET_Y = 8;       // Above unit top
const OUTLINE_WIDTH = 2;          // Uniform outline thickness
const LEVEL_BADGE_SIZE = 12;
const STATUS_ICON_SIZE = 11;

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

    /** Currently selected unit (for highlight ring). @type {import('../battle/RTSUnit.js').RTSUnit|null} */
    selectedUnit = null;

    /** Animation controller for weapon-specific attack animations. */
    animController = new BattleAnimationController();

    /** VFX system for hit impacts, comic text, teleport smoke. */
    vfxSystem = new BattleVFXSystem();

    constructor() {
        this._floatingTexts = [];
        this._effects = [];
        this._elapsedTime = 0;
        this.selectedUnit = null;
        this.animController = new BattleAnimationController();
        this.vfxSystem = new BattleVFXSystem();
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

        // Update animation systems
        this.animController.update(dt);
        this.vfxSystem.update(dt);

        // Apply screen shake offset
        const shake = this.animController.getShakeOffset();

        ctx.save();
        if (shake.x !== 0 || shake.y !== 0) {
            ctx.translate(shake.x, shake.y);
        }

        // 1. Background
        this._drawBackground(ctx, field);

        // 2. Field area (flat cel-shaded terrain)
        this._drawFieldArea(ctx, field);

        // 3. Ground shadows for all units (flat, no transparency)
        this._drawShadows(ctx, field);

        // 4. Units (sorted by Y for depth)
        this._drawUnits(ctx, field, dt);

        // 5. Health bars and status icons (clean outlines)
        this._drawUnitOverlays(ctx, field);

        // 6. Floating damage/heal text (outlined)
        this._updateAndDrawFloatingTexts(ctx, dt);

        // 7. Visual effects (clean geometric shapes)
        this._updateAndDrawEffects(ctx, dt);

        // 8. VFX system (weapon impacts, comic text, smoke)
        this.vfxSystem.render(ctx);

        ctx.restore();
    }

    // ── Background ──────────────────────────────────────────────────────────

    _drawBackground(ctx, field) {
        // Full screen flat background
        ctx.fillStyle = COLOR_BG;
        ctx.fillRect(0, 0, 960, 540);

        // Background image (subtle overlay)
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

        // ── Flat cel-shaded field background ──
        // Base color fill
        ctx.fillStyle = COLOR_FIELD_BG;
        ctx.fillRect(ox, oy, w, h);

        // Player side flat tint (left half)
        ctx.fillStyle = COLOR_PLAYER_SIDE;
        ctx.fillRect(ox, oy, w / 2, h);

        // Enemy side flat tint (right half)
        ctx.fillStyle = COLOR_ENEMY_SIDE;
        ctx.fillRect(ox + w / 2, oy, w / 2, h);

        // ── Cel-shaded terrain patches (flat highlight/shadow zones) ──
        // Shadow strip along bottom edge
        ctx.fillStyle = COLOR_FIELD_BG_SHADOW;
        ctx.fillRect(ox, oy + h - 30, w, 30);

        // Highlight strip along top edge
        ctx.fillStyle = COLOR_FIELD_BG_HIGHLIGHT;
        ctx.fillRect(ox, oy, w, 20);

        // Subtle grid lines (clean, straight)
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

        // ── Center divider (clean dashed line) ──
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = OUTLINE_WIDTH;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(ox + w / 2, oy);
        ctx.lineTo(ox + w / 2, oy + h);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── Clean black outline border ──
        ctx.strokeStyle = COLOR_FIELD_BORDER;
        ctx.lineWidth = 3; // Bold clean outline
        ctx.strokeRect(ox, oy, w, h);
    }

    // ── Shadows (flat, clean) ───────────────────────────────────────────────

    _drawShadows(ctx, field) {
        for (const unit of field.units) {
            if (!unit.isAlive) continue;

            const screen = field.worldToScreen(unit.worldPos.x, unit.worldPos.y);

            // Flat shadow ellipse with clean outline
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = COLOR_SHADOW;
            ctx.beginPath();
            ctx.ellipse(screen.x, screen.y + 3, 12, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
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

            // Get animation controller visuals for this unit
            const animVis = this.animController.getUnitVisuals(unit);

            // Hit flash (clean solid flash, no wobbly effects)
            if (animVis.flashAlpha > 0 && animVis.flashColor) {
                ctx.globalAlpha = 1;
            } else if (unit.hitFlashTimer > 0) {
                // Clean on/off flash instead of wobbly sine
                ctx.globalAlpha = unit.hitFlashTimer > 0.075 ? 0.5 : 1.0;
            } else {
                ctx.globalAlpha = animVis.opacity != null ? animVis.opacity : 1;
            }

            // Apply animation offsets (weapon-specific lunge/recoil)
            let drawX = screen.x + (animVis.offsetX || 0);
            let drawY = screen.y + (animVis.offsetY || 0);

            // Fallback: basic lunge if no animation controller animation is active
            if (!animVis.offsetX && !animVis.offsetY) {
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
            }

            // Cast animation: flat cel-shaded glow (clean geometric circle, no gradient)
            if (unit.state === UnitState.CASTING) {
                const castProgress = unit.animTimer > 0 ? (0.5 - unit.animTimer) / 0.5 : 0;
                const glowRadius = 18 + castProgress * 10;
                const elemColor = ELEMENT_COLORS[unit.elementTypes[0]] || '#ffffff';

                // Outer glow ring (flat fill, no gradient)
                ctx.fillStyle = elemColor;
                ctx.globalAlpha = 0.2;
                ctx.beginPath();
                ctx.arc(drawX, drawY - UNIT_DRAW_SIZE / 2, glowRadius, 0, Math.PI * 2);
                ctx.fill();

                // Clean outline ring
                ctx.strokeStyle = elemColor;
                ctx.lineWidth = OUTLINE_WIDTH;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(drawX, drawY - UNIT_DRAW_SIZE / 2, glowRadius, 0, Math.PI * 2);
                ctx.stroke();

                ctx.globalAlpha = animVis.opacity != null ? animVis.opacity : 1;
            }

            // Idle animation: gentle bob and slow frame cycling
            let spriteFrame = unit.walkFrame;
            if (unit.state !== UnitState.MOVING) {
                // Slow idle frame cycling (alternates between 0 and 2)
                spriteFrame = Math.floor(this._elapsedTime * 1.5) % 2 === 0 ? 0 : 2;
                // Subtle idle bob (clean, small amplitude)
                drawY += Math.sin(this._elapsedTime * 2.5 + unit.worldPos.x * 0.1) * 1.5;
            }

            // Apply animation scale and rotation
            const hasTransform = (animVis.scaleX !== 1 || animVis.scaleY !== 1 || animVis.rotation);
            if (hasTransform) {
                ctx.save();
                ctx.translate(drawX, drawY - UNIT_DRAW_SIZE / 2);
                if (animVis.rotation) ctx.rotate(animVis.rotation);
                ctx.scale(animVis.scaleX || 1, animVis.scaleY || 1);
                ctx.translate(-drawX, -(drawY - UNIT_DRAW_SIZE / 2));
            }

            // Draw the unit sprite (chibi proportions handled by HumanoidSpriteSystem)
            this._drawUnitSprite(ctx, unit, drawX, drawY, spriteFrame);

            // Draw flash overlay if active (clean solid rect, no gradient)
            if (animVis.flashAlpha > 0 && animVis.flashColor) {
                ctx.globalAlpha = animVis.flashAlpha;
                ctx.fillStyle = animVis.flashColor;
                ctx.fillRect(drawX - UNIT_DRAW_SIZE / 2, drawY - UNIT_DRAW_SIZE, UNIT_DRAW_SIZE, UNIT_DRAW_SIZE);
            }

            if (hasTransform) {
                ctx.restore();
            }

            // ── Team indicator ring (clean outline, flat fill) ──
            const teamColor = unit.team === 0 ? COLOR_PLAYER_RING : COLOR_ENEMY_RING;
            // Flat filled ellipse
            ctx.fillStyle = teamColor;
            ctx.globalAlpha = 0.25;
            ctx.beginPath();
            ctx.ellipse(drawX, drawY + 3, 12, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Clean black outline
            ctx.globalAlpha = 1;
            ctx.strokeStyle = COLOR_OUTLINE;
            ctx.lineWidth = OUTLINE_WIDTH;
            ctx.beginPath();
            ctx.ellipse(drawX, drawY + 3, 12, 5, 0, 0, Math.PI * 2);
            ctx.stroke();

            // ── Selection highlight (clean geometric, no wobbly pulse) ──
            if (this.selectedUnit === unit) {
                // Clean pulsing golden ring (stepped opacity, not sine-wobbly)
                const pulseStep = Math.floor(this._elapsedTime * 3) % 2 === 0 ? 1.0 : 0.7;
                ctx.strokeStyle = '#ffdd33';
                ctx.globalAlpha = pulseStep;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(drawX, drawY + 3, 16, 7, 0, 0, Math.PI * 2);
                ctx.stroke();
                // Black outline around selection ring
                ctx.strokeStyle = COLOR_OUTLINE;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(drawX, drawY + 3, 17, 8, 0, 0, Math.PI * 2);
                ctx.stroke();

                // Selection arrow above unit (clean geometric triangle)
                const arrowBob = Math.floor(this._elapsedTime * 3) % 2 === 0 ? 0 : -3;
                const arrowY = drawY - UNIT_DRAW_SIZE - 10 + arrowBob;
                // Filled triangle
                ctx.fillStyle = '#ffdd33';
                ctx.globalAlpha = pulseStep;
                ctx.beginPath();
                ctx.moveTo(drawX, arrowY + 7);
                ctx.lineTo(drawX - 5, arrowY);
                ctx.lineTo(drawX + 5, arrowY);
                ctx.closePath();
                ctx.fill();
                // Black outline on triangle
                ctx.strokeStyle = COLOR_OUTLINE;
                ctx.lineWidth = OUTLINE_WIDTH;
                ctx.beginPath();
                ctx.moveTo(drawX, arrowY + 7);
                ctx.lineTo(drawX - 5, arrowY);
                ctx.lineTo(drawX + 5, arrowY);
                ctx.closePath();
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
        }
    }

    _drawUnitSprite(ctx, unit, x, y, frame) {
        // Use HumanoidSpriteSystem for composite sprites with equipment
        // UNIT_DRAW_SIZE is set for chibi proportions (large head, compact body)
        HumanoidSpriteSystem.drawWithEquipment(
            ctx, unit.raceId, unit.evolutionStage,
            unit.facing, frame != null ? frame : unit.walkFrame,
            x, y, UNIT_DRAW_SIZE,
            { equipment: unit.equipment || {} }
        );
    }

    // ── Unit Overlays (HP bars, status, level) — Clean outlines ─────────────

    _drawUnitOverlays(ctx, field) {
        for (const unit of field.units) {
            if (!unit.isAlive) continue;

            const screen = field.worldToScreen(unit.worldPos.x, unit.worldPos.y);
            const topY = screen.y - UNIT_DRAW_SIZE - HP_BAR_OFFSET_Y;

            // ── HP bar with clean black outline ──
            const hpFrac = unit.getHpFraction();
            const barX = screen.x - HP_BAR_WIDTH / 2;
            const barY = topY;

            // Background fill
            ctx.fillStyle = COLOR_HP_BG;
            ctx.fillRect(barX, barY, HP_BAR_WIDTH, HP_BAR_HEIGHT);

            // HP fill (flat cel-shaded: base color + highlight strip)
            let hpColor, hpHighlight;
            if (hpFrac > 0.5) {
                hpColor = COLOR_HP_GREEN;
                hpHighlight = COLOR_HP_GREEN_HIGHLIGHT;
            } else if (hpFrac > 0.25) {
                hpColor = COLOR_HP_YELLOW;
                hpHighlight = COLOR_HP_YELLOW_HIGHLIGHT;
            } else {
                hpColor = COLOR_HP_RED;
                hpHighlight = COLOR_HP_RED_HIGHLIGHT;
            }

            const fillWidth = HP_BAR_WIDTH * hpFrac;
            // Base color
            ctx.fillStyle = hpColor;
            ctx.fillRect(barX, barY, fillWidth, HP_BAR_HEIGHT);
            // Highlight strip (top 40% of bar - flat cel-shaded highlight zone)
            ctx.fillStyle = hpHighlight;
            ctx.fillRect(barX, barY, fillWidth, Math.floor(HP_BAR_HEIGHT * 0.4));

            // Clean black outline around entire HP bar
            ctx.strokeStyle = COLOR_HP_BORDER;
            ctx.lineWidth = OUTLINE_WIDTH;
            ctx.strokeRect(barX, barY, HP_BAR_WIDTH, HP_BAR_HEIGHT);

            // ── Level badge (clean outlined box) ──
            const level = unit.getLevel();
            const badgeX = barX - 14;
            const badgeW = 13;
            const badgeH = HP_BAR_HEIGHT + 2;
            // Fill
            ctx.fillStyle = '#2a2a3a';
            ctx.fillRect(badgeX, barY - 1, badgeW, badgeH + 1);
            // Highlight strip
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(badgeX, barY - 1, badgeW, Math.floor(badgeH * 0.4));
            // Outline
            ctx.strokeStyle = COLOR_OUTLINE;
            ctx.lineWidth = OUTLINE_WIDTH;
            ctx.strokeRect(badgeX, barY - 1, badgeW, badgeH + 1);
            // Level text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 7px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${level}`, badgeX + badgeW / 2, barY + 6);

            // ── Status effect icons (clean outlined circles) ──
            if (unit.activeStatusEffects.length > 0) {
                let iconX = screen.x - (unit.activeStatusEffects.length * (STATUS_ICON_SIZE + 2)) / 2;
                const iconY = topY - STATUS_ICON_SIZE - 3;

                for (const effect of unit.activeStatusEffects) {
                    const ed = effect.effectData;
                    if (!ed) continue;

                    // Color-coded status dot (vibrant saturated colors)
                    const statusColor = ed.preventsAction ? '#ff3333'
                        : ed.isDot ? '#ff8800'
                        : '#3399ff';

                    const cx = iconX + STATUS_ICON_SIZE / 2;
                    const cy = iconY + STATUS_ICON_SIZE / 2;
                    const r = STATUS_ICON_SIZE / 2;

                    // Flat filled circle
                    ctx.fillStyle = statusColor;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fill();

                    // Clean black outline
                    ctx.strokeStyle = COLOR_OUTLINE;
                    ctx.lineWidth = OUTLINE_WIDTH;
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.stroke();

                    iconX += STATUS_ICON_SIZE + 2;
                }
            }
        }

        ctx.textAlign = 'left'; // Reset
    }

    // ── Floating Text (outlined, clean) ─────────────────────────────────────

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

            // Clean black outline text (stroke then fill for clean cel-shaded look)
            ctx.strokeStyle = COLOR_OUTLINE;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.strokeText(ft.text, ft.x, ft.y);

            // Solid color fill
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);

            ctx.globalAlpha = 1;
        }
        ctx.textAlign = 'left';
    }

    // ── Visual Effects (clean geometric shapes) ─────────────────────────────

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

            // Flat filled circle (no gradient)
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Clean outlined ring
            ctx.globalAlpha = alpha * 0.9;
            ctx.strokeStyle = e.color;
            ctx.lineWidth = OUTLINE_WIDTH + 1;
            ctx.beginPath();
            ctx.arc(e.x, e.y, currentRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Black outline on outer edge for cel-shaded look
            ctx.strokeStyle = COLOR_OUTLINE;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(e.x, e.y, currentRadius + 1, 0, Math.PI * 2);
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
        this.selectedUnit = null;
    }
}

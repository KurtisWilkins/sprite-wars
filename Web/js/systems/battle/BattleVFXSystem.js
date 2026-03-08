/**
 * BattleVFXSystem.js — Canvas-based visual effects for RTS battles.
 * Ported from Game/Scripts/Battle/BattleVFXSystem.gd
 *
 * Spawns hit impacts, comic-book text, teleport smoke, knockback trails,
 * and element-specific VFX — all rendered via Canvas 2D drawing primitives.
 *
 * Doodle Art Style: wobbly lines, hand-drawn shapes, sketch marks,
 * hatching overlays, and decorative doodle particles.
 */

import { AttackStyle } from '../../data/WeaponAnimationData.js';

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_VFX = 30;
const COMIC_TEXT_THRESHOLD = 30;
const IMPACT_WORDS = ['BAM!', 'POW!', 'WHAM!', 'CRACK!', 'SMASH!'];

// ── Element Color Palette ───────────────────────────────────────────────────
const ELEMENT_COLORS = {
    Fire:     '#ff7326', Water:    '#338cff', Plant:    '#40d959',
    Ice:      '#80d9ff', Wind:     '#b3f2c0', Earth:   '#bf8c4d',
    Electric: '#fff24d', Dark:     '#6633cc', Light:   '#ffffcc',
    Fairy:    '#ff80d9', Lunar:    '#8c73e6', Solar:   '#ffd959',
    Metal:    '#b3bfd9', Poison:   '#80d94d',
};
const DEFAULT_COLOR = '#ffffff';

function elemColor(element) {
    return ELEMENT_COLORS[element] || DEFAULT_COLOR;
}

export class BattleVFXSystem {
    constructor() {
        /** @type {Array<{type: string, x: number, y: number, age: number, maxAge: number, data: object}>} */
        this._effects = [];

        /** Doodle-style decorative particles. */
        this.particles = [];
    }

    // ── Doodle Helpers ───────────────────────────────────────────────────────

    /**
     * Draw a wobbly line between two points with hand-drawn jitter.
     */
    _drawWobblyLine(ctx, x1, y1, x2, y2, segments = 6) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        ctx.beginPath();
        ctx.moveTo(x1 + (Math.random() - 0.5) * 1.5, y1 + (Math.random() - 0.5) * 1.5);
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const px = x1 + dx * t + (Math.random() - 0.5) * 3;
            const py = y1 + dy * t + (Math.random() - 0.5) * 3;
            ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    /**
     * Draw a wobbly circle (hand-drawn style).
     */
    _drawWobblyCircle(ctx, cx, cy, radius, points = 16) {
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const wobble = radius + (Math.random() - 0.5) * radius * 0.2;
            const px = cx + Math.cos(angle) * wobble;
            const py = cy + Math.sin(angle) * wobble;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
    }

    /**
     * Draw a hand-drawn star shape with uneven points.
     */
    _drawUnevenStar(ctx, cx, cy, outerR, innerR, points = 5) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2;
            const r = i % 2 === 0
                ? outerR + (Math.random() - 0.5) * outerR * 0.3
                : innerR + (Math.random() - 0.5) * innerR * 0.3;
            const px = cx + Math.cos(angle) * r + (Math.random() - 0.5) * 1.5;
            const py = cy + Math.sin(angle) * r + (Math.random() - 0.5) * 1.5;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
    }

    /**
     * Draw small decorative sketch marks around a point (motion lines, stars, spirals).
     */
    _drawSketchMarks(ctx, x, y, radius, count = 4) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const dist = radius * (0.6 + Math.random() * 0.6);
            const mx = x + Math.cos(angle) * dist;
            const my = y + Math.sin(angle) * dist;
            const markType = Math.floor(Math.random() * 3);

            ctx.beginPath();
            if (markType === 0) {
                // Small motion line
                const lineLen = 3 + Math.random() * 5;
                this._drawWobblyLine(ctx, mx, my, mx + Math.cos(angle) * lineLen, my + Math.sin(angle) * lineLen, 3);
            } else if (markType === 1) {
                // Tiny star
                this._drawUnevenStar(ctx, mx, my, 2 + Math.random() * 2, 1, 4);
                ctx.stroke();
            } else {
                // Small spiral
                for (let j = 0; j < 8; j++) {
                    const sa = j * 0.8;
                    const sr = j * 0.5;
                    const sx = mx + Math.cos(sa) * sr;
                    const sy = my + Math.sin(sa) * sr;
                    if (j === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.stroke();
            }
        }
    }

    /**
     * Draw a diagonal hatching overlay for sketch texture effect.
     */
    _drawHatchingOverlay(ctx, x, y, width, height, spacing = 6) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = '#2D2D2D';
        ctx.lineWidth = 0.5;
        for (let i = -height; i < width + height; i += spacing) {
            ctx.beginPath();
            ctx.moveTo(x + i, y);
            ctx.lineTo(x + i - height, y + height);
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Draw a wobbly speech/impact bubble border around text.
     */
    _drawWobblyBubble(ctx, cx, cy, w, h, spikeCount = 8) {
        ctx.beginPath();
        const points = spikeCount * 2;
        for (let i = 0; i <= points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const isSpike = i % 2 === 0;
            const rx = w * (isSpike ? 1.3 : 1.0) + (Math.random() - 0.5) * 4;
            const ry = h * (isSpike ? 1.3 : 1.0) + (Math.random() - 0.5) * 4;
            const px = cx + Math.cos(angle) * rx + (Math.random() - 0.5) * 2;
            const py = cy + Math.sin(angle) * ry + (Math.random() - 0.5) * 2;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Spawn a hit impact effect based on attack style.
     */
    spawnHitImpact(x, y, element, attackStyle = AttackStyle.SLASH) {
        this._enforce();
        const color = elemColor(element);
        switch (attackStyle) {
            case AttackStyle.SLASH:
                this._addEffect('slash_mark', x, y, 0.35, { color });
                break;
            case AttackStyle.THRUST:
                this._addEffect('stab_point', x, y, 0.30, { color });
                break;
            case AttackStyle.SMASH:
            case AttackStyle.BLOCK_BASH:
                this._addEffect('shockwave', x, y, 0.35, { color });
                break;
            case AttackStyle.CAST:
            case AttackStyle.HOLY_STRIKE:
                this._addEffect('magic_burst', x, y, 0.35, { color });
                break;
            case AttackStyle.PUNCH:
                this._addEffect('punch_star', x, y, 0.30, { color });
                break;
            default:
                this._addEffect('basic_hit', x, y, 0.25, { color });
                break;
        }
        // Spawn decorative doodle particles around every impact
        this.spawnDoodleParticles(x, y, 3, color);
    }

    /**
     * Spawn projectile impact (arrow/bolt/bullet).
     */
    spawnProjectileImpact(x, y, element) {
        this._enforce();
        const color = elemColor(element);
        this._addEffect('basic_hit', x, y, 0.25, { color });
        this._addEffect('particles', x, y, 0.35, { color, count: 4, spread: 15 });
        this.spawnDoodleParticles(x, y, 3, color);
    }

    /**
     * Spawn comic-book impact text for big hits.
     */
    spawnComicImpact(x, y, damage) {
        if (damage < COMIC_TEXT_THRESHOLD) return;
        this._enforce();
        const word = IMPACT_WORDS[Math.floor(Math.random() * IMPACT_WORDS.length)];
        const fontSize = 20 + Math.min(10, Math.floor(damage / 20));
        const ox = x + (Math.random() - 0.5) * 40;
        const oy = y - 10 - Math.random() * 20;
        this._addEffect('comic_text', ox, oy, 0.70, { word, fontSize });
    }

    /**
     * Spawn teleport smoke cloud.
     */
    spawnTeleportSmoke(x, y) {
        this._enforce();
        this._addEffect('smoke_cloud', x, y, 0.50, { color: 'rgba(77, 51, 115, 0.7)', radius: 20 });
    }

    /**
     * Spawn knockback trail between two positions.
     */
    spawnKnockbackTrail(fromX, fromY, toX, toY) {
        this._enforce();
        this._addEffect('motion_trail', fromX, fromY, 0.35, {
            color: 'rgba(230, 179, 77, 0.5)',
            toX, toY,
        });
    }

    /**
     * Spawn doodle-style decorative particles (stars, hearts, spirals, scribbles).
     */
    spawnDoodleParticles(x, y, count = 4, color = '#2D2D2D') {
        const shapes = ['star', 'heart', 'spiral', 'scribble', 'sparkle'];
        for (let i = 0; i < count; i++) {
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 40;
            const particle = {
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.5 + Math.random() * 0.3,
                size: 3 + Math.random() * 5,
                shape: shape,
                color: color,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 4
            };
            this.particles.push(particle);
        }
    }

    // ── Update & Render ─────────────────────────────────────────────────────

    /**
     * Update all active effects.
     * @param {number} dt
     */
    update(dt) {
        for (let i = this._effects.length - 1; i >= 0; i--) {
            this._effects[i].age += dt;
            if (this._effects[i].age >= this._effects[i].maxAge) {
                this._effects.splice(i, 1);
            }
        }

        // Update doodle particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 60 * dt; // gravity
            p.rotation += p.rotSpeed * dt;
        }
    }

    /**
     * Render all active effects to canvas.
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        for (const e of this._effects) {
            const progress = e.age / e.maxAge;
            const alpha = 1 - progress;

            switch (e.type) {
                case 'slash_mark':    this._drawSlashMark(ctx, e, progress, alpha); break;
                case 'stab_point':    this._drawStabPoint(ctx, e, progress, alpha); break;
                case 'shockwave':     this._drawShockwave(ctx, e, progress, alpha); break;
                case 'magic_burst':   this._drawMagicBurst(ctx, e, progress, alpha); break;
                case 'punch_star':    this._drawPunchStar(ctx, e, progress, alpha); break;
                case 'basic_hit':     this._drawBasicHit(ctx, e, progress, alpha); break;
                case 'particles':     this._drawParticles(ctx, e, progress, alpha); break;
                case 'comic_text':    this._drawComicText(ctx, e, progress); break;
                case 'smoke_cloud':   this._drawSmokeCloud(ctx, e, progress, alpha); break;
                case 'motion_trail':  this._drawMotionTrail(ctx, e, progress, alpha); break;
            }
        }

        // Render doodle particles
        for (const p of this.particles) {
            this.renderDoodleParticle(ctx, p);
        }
    }

    clear() {
        this._effects = [];
        this.particles = [];
    }

    // ── Doodle Particle Rendering ───────────────────────────────────────────

    renderDoodleParticle(ctx, p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.strokeStyle = p.color;
        ctx.fillStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        switch (p.shape) {
            case 'star':
                this.drawDoodleStar(ctx, 0, 0, p.size);
                break;
            case 'heart':
                this.drawDoodleHeart(ctx, 0, 0, p.size);
                break;
            case 'spiral':
                this.drawDoodleSpiral(ctx, 0, 0, p.size);
                break;
            case 'scribble':
                this.drawDoodleScribble(ctx, 0, 0, p.size);
                break;
            case 'sparkle':
                this.drawDoodleSparkle(ctx, 0, 0, p.size);
                break;
        }
        ctx.restore();
    }

    drawDoodleStar(ctx, x, y, size) {
        this._drawUnevenStar(ctx, x, y, size, size * 0.4, 5);
        ctx.stroke();
    }

    drawDoodleHeart(ctx, x, y, size) {
        const s = size * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y + s * 0.4 + (Math.random() - 0.5));
        ctx.bezierCurveTo(
            x - s * 1.2 + (Math.random() - 0.5), y - s * 0.8 + (Math.random() - 0.5),
            x - s * 0.4 + (Math.random() - 0.5), y - s * 1.4 + (Math.random() - 0.5),
            x + (Math.random() - 0.5), y - s * 0.6 + (Math.random() - 0.5)
        );
        ctx.bezierCurveTo(
            x + s * 0.4 + (Math.random() - 0.5), y - s * 1.4 + (Math.random() - 0.5),
            x + s * 1.2 + (Math.random() - 0.5), y - s * 0.8 + (Math.random() - 0.5),
            x + (Math.random() - 0.5), y + s * 0.4 + (Math.random() - 0.5)
        );
        ctx.stroke();
    }

    drawDoodleSpiral(ctx, x, y, size) {
        ctx.beginPath();
        const turns = 2.5;
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = t * Math.PI * 2 * turns;
            const r = t * size + (Math.random() - 0.5) * 0.5;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    drawDoodleScribble(ctx, x, y, size) {
        ctx.beginPath();
        const points = 8;
        for (let i = 0; i < points; i++) {
            const px = x + (Math.random() - 0.5) * size * 2;
            const py = y + (Math.random() - 0.5) * size * 2;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    drawDoodleSparkle(ctx, x, y, size) {
        // Four-pointed sparkle with wobbly lines
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i;
            const len = i % 2 === 0 ? size : size * 0.5;
            this._drawWobblyLine(ctx,
                x, y,
                x + Math.cos(angle) * len, y + Math.sin(angle) * len,
                3
            );
        }
    }

    // ── Drawing Implementations (Doodle Style) ──────────────────────────────

    _drawSlashMark(ctx, e, progress, alpha) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = e.data.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        // X-shaped slash with wobbly/sketchy lines
        for (let i = 0; i < 2; i++) {
            const angle = (Math.PI / 4) + (Math.PI / 2) * i;
            const len = 18;
            const x1 = Math.cos(angle) * -len;
            const y1 = Math.sin(angle) * -len;
            const x2 = Math.cos(angle) * len;
            const y2 = Math.sin(angle) * len;
            this._drawWobblyLine(ctx, x1, y1, x2, y2, 5);
        }
        // Decorative sketch marks around slash
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.5;
        this._drawSketchMarks(ctx, 0, 0, 22, 3);
        ctx.restore();
    }

    _drawStabPoint(ctx, e, progress, alpha) {
        ctx.save();
        ctx.translate(e.x, e.y);
        const scale = 0.5 + progress * 0.7;
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = e.data.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 4) + (Math.PI / 2) * i;
            const dir = { x: Math.cos(angle), y: Math.sin(angle) };
            this._drawWobblyLine(ctx, dir.x * 3, dir.y * 3, dir.x * 12, dir.y * 12, 3);
        }
        // Small decorative marks
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.4;
        this._drawSketchMarks(ctx, 0, 0, 14, 2);
        ctx.restore();
    }

    _drawShockwave(ctx, e, progress, alpha) {
        const radius = 6 + progress * 30;
        const lineWidth = 3 - progress * 2;
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = e.data.color;
        ctx.lineWidth = Math.max(0.5, lineWidth);
        ctx.lineCap = 'round';
        // Wobbly circle instead of clean arc
        this._drawWobblyCircle(ctx, e.x, e.y, radius, 20);
        ctx.stroke();
        // Decorative sketch marks around shockwave
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.4;
        this._drawSketchMarks(ctx, e.x, e.y, radius + 6, 4);
        ctx.restore();
    }

    _drawMagicBurst(ctx, e, progress, alpha) {
        ctx.save();
        ctx.translate(e.x, e.y);
        const scale = 0.3 + progress * 1.2;
        ctx.rotate(progress * Math.PI / 6);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = e.data.color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        const points = 6;
        for (let i = 0; i < points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const dir = { x: Math.cos(angle), y: Math.sin(angle) };
            this._drawWobblyLine(ctx, dir.x * 2, dir.y * 2, dir.x * 16, dir.y * 16, 4);
        }

        // Sketch texture hatching overlay on elemental burst
        ctx.globalAlpha = alpha * 0.15;
        ctx.strokeStyle = '#2D2D2D';
        ctx.lineWidth = 0.5;
        for (let i = -16; i < 16; i += 4) {
            ctx.beginPath();
            ctx.moveTo(i, -16);
            ctx.lineTo(i - 16, 16);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawPunchStar(ctx, e, progress, alpha) {
        ctx.save();
        ctx.translate(e.x, e.y);
        const popScale = progress < 0.3
            ? 0.2 + (progress / 0.3) * 1.1
            : 1.3 - (progress - 0.3) * 0.43;
        ctx.scale(popScale, popScale);
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = e.data.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        // Hand-drawn star with uneven points
        this._drawUnevenStar(ctx, 0, 0, 14, 8, 8);
        ctx.stroke();
        // Decorative sketch marks
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.5;
        this._drawSketchMarks(ctx, 0, 0, 16, 3);
        ctx.restore();
    }

    _drawBasicHit(ctx, e, progress, alpha) {
        const radius = 4 + progress * 16;
        ctx.save();
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = e.data.color;
        // Wobbly filled circle
        this._drawWobblyCircle(ctx, e.x, e.y, radius, 12);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = e.data.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        this._drawWobblyCircle(ctx, e.x, e.y, radius, 12);
        ctx.stroke();
        // Sketch marks
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.4;
        this._drawSketchMarks(ctx, e.x, e.y, radius + 4, 2);
        ctx.restore();
    }

    _drawParticles(ctx, e, progress, alpha) {
        if (!e.data._particles) {
            // Generate particle data on first render
            e.data._particles = [];
            for (let i = 0; i < (e.data.count || 4); i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = (e.data.spread || 15) * (0.3 + Math.random() * 0.7);
                e.data._particles.push({
                    dx: Math.cos(angle) * dist,
                    dy: Math.sin(angle) * dist,
                    size: 2 + Math.random() * 2,
                });
            }
        }
        ctx.save();
        ctx.fillStyle = e.data.color;
        for (const p of e.data._particles) {
            ctx.globalAlpha = alpha * 0.9;
            const px = e.x + p.dx * progress;
            const py = e.y + p.dy * progress;
            // Wobbly small rectangles instead of clean ones
            ctx.beginPath();
            const hs = p.size / 2;
            ctx.moveTo(px - hs + (Math.random() - 0.5), py - hs + (Math.random() - 0.5));
            ctx.lineTo(px + hs + (Math.random() - 0.5), py - hs + (Math.random() - 0.5));
            ctx.lineTo(px + hs + (Math.random() - 0.5), py + hs + (Math.random() - 0.5));
            ctx.lineTo(px - hs + (Math.random() - 0.5), py + hs + (Math.random() - 0.5));
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    _drawComicText(ctx, e, progress) {
        // Pop in, hold, fade out
        let scale, textAlpha;
        if (progress < 0.15) {
            // Pop in
            scale = 0.3 + (progress / 0.15) * 0.8;
            textAlpha = progress / 0.15;
        } else if (progress < 0.6) {
            // Hold
            scale = 1.1 - (progress - 0.15) * 0.22;
            textAlpha = 1;
        } else {
            // Fade out + float up
            scale = 1.0;
            textAlpha = 1 - (progress - 0.6) / 0.4;
        }

        const floatY = progress > 0.6 ? (progress - 0.6) / 0.4 * 30 : 0;
        const rotation = (Math.random() - 0.5) * 0.01; // subtle jitter

        ctx.save();
        ctx.translate(e.x, e.y - floatY);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        ctx.globalAlpha = textAlpha;

        // Measure text for bubble sizing
        ctx.font = `bold ${e.data.fontSize}px 'Comic Sans MS', 'Segoe Print', cursive, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textMetrics = ctx.measureText(e.data.word);
        const textW = textMetrics.width * 0.6;
        const textH = e.data.fontSize * 0.5;

        // Hand-drawn impact bubble with wobbly border
        ctx.fillStyle = 'rgba(255, 255, 230, 0.85)';
        this._drawWobblyBubble(ctx, 0, 0, textW, textH, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(26, 20, 20, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this._drawWobblyBubble(ctx, 0, 0, textW, textH, 10);
        ctx.stroke();

        // Small decoration marks around the text
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(26, 20, 20, 0.4)';
        ctx.globalAlpha = textAlpha * 0.5;
        this._drawSketchMarks(ctx, 0, 0, textW + 8, 4);
        ctx.globalAlpha = textAlpha;

        // Handwriting-style font rendering: use cursive/comic font
        ctx.font = `bold ${e.data.fontSize}px 'Comic Sans MS', 'Segoe Print', cursive, monospace`;

        // Outline (hand-drawn look: slightly offset multiple strokes)
        ctx.strokeStyle = 'rgba(26, 20, 20, 0.95)';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeText(e.data.word, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);

        // Shadow
        ctx.fillStyle = 'rgba(26, 26, 38, 0.9)';
        ctx.fillText(e.data.word, 3, 3);

        // Text
        ctx.fillStyle = '#ffffe6';
        ctx.fillText(e.data.word, 0, 0);

        ctx.restore();
    }

    _drawSmokeCloud(ctx, e, progress, alpha) {
        ctx.save();
        const r = (e.data.radius || 20);
        const puffCount = 6;
        if (!e.data._puffs) {
            e.data._puffs = [];
            for (let i = 0; i < puffCount; i++) {
                e.data._puffs.push({
                    ox: (Math.random() - 0.5) * r * 0.6,
                    oy: (Math.random() - 0.5) * r * 0.6,
                    dx: (Math.random() - 0.5) * r * 2,
                    dy: (Math.random() - 0.5) * r * 2,
                    size: 6 + Math.random() * 6,
                });
            }
        }
        ctx.fillStyle = e.data.color || 'rgba(77, 51, 115, 0.7)';
        ctx.lineCap = 'round';
        for (const p of e.data._puffs) {
            const px = e.x + p.ox + p.dx * progress;
            const py = e.y + p.oy + p.dy * progress;
            const size = p.size * (1 + progress * 0.5);
            ctx.globalAlpha = alpha * 0.7;
            // Wobbly puff circles instead of rectangles
            this._drawWobblyCircle(ctx, px, py, size * 0.6, 8);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawMotionTrail(ctx, e, progress, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = e.data.color || 'rgba(230, 179, 77, 0.5)';
        ctx.lineWidth = 4 - progress * 3.5;
        ctx.lineCap = 'round';
        // Wobbly motion trail line
        this._drawWobblyLine(ctx, e.x, e.y, e.data.toX, e.data.toY, 8);
        ctx.restore();
    }

    // ── Internal ────────────────────────────────────────────────────────────

    _addEffect(type, x, y, maxAge, data = {}) {
        this._effects.push({ type, x, y, age: 0, maxAge, data });
    }

    _enforce() {
        while (this._effects.length > MAX_VFX) {
            this._effects.shift();
        }
    }
}

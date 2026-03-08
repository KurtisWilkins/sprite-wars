/**
 * BattleVFXSystem.js — Canvas-based visual effects for RTS battles.
 * Ported from Game/Scripts/Battle/BattleVFXSystem.gd
 *
 * Spawns hit impacts, comic-book text, teleport smoke, knockback trails,
 * and element-specific VFX — all rendered via Canvas 2D drawing primitives.
 *
 * Cel-Shaded Art Style: clean black outlines of uniform thickness,
 * flat solid color fills, bold geometric shapes, no gradients or wobble.
 */

import { AttackStyle } from '../../data/WeaponAnimationData.js';

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_VFX = 30;
const COMIC_TEXT_THRESHOLD = 30;
const IMPACT_WORDS = ['BAM!', 'POW!', 'WHAM!', 'CRACK!', 'SMASH!'];

/** Uniform outline thickness for cel-shaded style (2-3px). */
const OUTLINE_WIDTH = 2.5;

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

/**
 * Derive a darker shade for cel-shaded shadow from a hex color.
 */
function darkenColor(hex, amount = 0.35) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.round(r * (1 - amount));
    const dg = Math.round(g * (1 - amount));
    const db = Math.round(b * (1 - amount));
    return `rgb(${dr},${dg},${db})`;
}

export class BattleVFXSystem {
    constructor() {
        /** @type {Array<{type: string, x: number, y: number, age: number, maxAge: number, data: object}>} */
        this._effects = [];

        /** Clean geometric decorative particles. */
        this.particles = [];
    }

    // ── Clean Geometric Helpers ──────────────────────────────────────────────

    /**
     * Draw a clean circle with flat fill and uniform black outline.
     */
    _drawCleanCircle(ctx, cx, cy, radius) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();
    }

    /**
     * Draw a clean star shape with precise even points.
     */
    _drawCleanStar(ctx, cx, cy, outerR, innerR, points = 5) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const angle = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
    }

    /**
     * Draw a clean diamond shape.
     */
    _drawCleanDiamond(ctx, cx, cy, size) {
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
    }

    /**
     * Draw clean straight parallel lines radiating outward from a point.
     */
    _drawCleanRadialLines(ctx, x, y, innerR, outerR, count = 4) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR);
            ctx.lineTo(x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR);
            ctx.stroke();
        }
    }

    /**
     * Draw a clean four-pointed sparkle.
     */
    _drawCleanSparkle(ctx, cx, cy, size) {
        ctx.beginPath();
        // Vertical
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size * 0.2, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size * 0.2, cy);
        ctx.closePath();
        // Horizontal
        ctx.moveTo(cx - size * 0.7, cy);
        ctx.lineTo(cx, cy + size * 0.15);
        ctx.lineTo(cx + size * 0.7, cy);
        ctx.lineTo(cx, cy - size * 0.15);
        ctx.closePath();
    }

    /**
     * Draw a clean impact burst shape (spiky circle).
     */
    _drawCleanBurst(ctx, cx, cy, outerR, innerR, spikeCount = 10) {
        ctx.beginPath();
        for (let i = 0; i < spikeCount * 2; i++) {
            const angle = (Math.PI * 2 * i) / (spikeCount * 2);
            const r = i % 2 === 0 ? outerR : innerR;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
    }

    /**
     * Apply standard cel-shaded fill + black outline to the current path.
     */
    _celFillAndStroke(ctx, fillColor, outlineWidth = OUTLINE_WIDTH) {
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
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
        // Spawn clean geometric particles around every impact
        this.spawnCleanParticles(x, y, 3, color);
    }

    /**
     * Spawn projectile impact (arrow/bolt/bullet).
     */
    spawnProjectileImpact(x, y, element) {
        this._enforce();
        const color = elemColor(element);
        this._addEffect('basic_hit', x, y, 0.25, { color });
        this._addEffect('particles', x, y, 0.35, { color, count: 4, spread: 15 });
        this.spawnCleanParticles(x, y, 3, color);
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
        this._addEffect('smoke_cloud', x, y, 0.50, { color: '#4D3373', radius: 20 });
    }

    /**
     * Spawn knockback trail between two positions.
     */
    spawnKnockbackTrail(fromX, fromY, toX, toY) {
        this._enforce();
        this._addEffect('motion_trail', fromX, fromY, 0.35, {
            color: '#e6b34d',
            toX, toY,
        });
    }

    /**
     * Spawn clean geometric decorative particles (stars, circles, diamonds, sparkles).
     */
    spawnCleanParticles(x, y, count = 4, color = '#2D2D2D') {
        const shapes = ['star', 'circle', 'diamond', 'sparkle'];
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

    // Keep legacy name as alias for backwards compatibility
    spawnDoodleParticles(x, y, count = 4, color = '#2D2D2D') {
        this.spawnCleanParticles(x, y, count, color);
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

        // Update particles
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

        // Render clean geometric particles
        for (const p of this.particles) {
            this.renderCleanParticle(ctx, p);
        }
    }

    clear() {
        this._effects = [];
        this.particles = [];
    }

    // ── Clean Particle Rendering ────────────────────────────────────────────

    renderCleanParticle(ctx, p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.life / p.maxLife;

        switch (p.shape) {
            case 'star':
                this._drawCleanStar(ctx, 0, 0, p.size, p.size * 0.4, 5);
                this._celFillAndStroke(ctx, p.color, 2);
                break;
            case 'circle':
                this._drawCleanCircle(ctx, 0, 0, p.size * 0.5);
                this._celFillAndStroke(ctx, p.color, 2);
                break;
            case 'diamond':
                this._drawCleanDiamond(ctx, 0, 0, p.size * 0.6);
                this._celFillAndStroke(ctx, p.color, 2);
                break;
            case 'sparkle':
                this._drawCleanSparkle(ctx, 0, 0, p.size);
                this._celFillAndStroke(ctx, p.color, 2);
                break;
        }
        ctx.restore();
    }

    // Keep legacy name as alias for backwards compatibility
    renderDoodleParticle(ctx, p) {
        this.renderCleanParticle(ctx, p);
    }

    // ── Drawing Implementations (Cel-Shaded Style) ──────────────────────────

    _drawSlashMark(ctx, e, progress, alpha) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = OUTLINE_WIDTH;
        ctx.lineCap = 'round';

        // Clean X-shaped slash with uniform straight lines
        const len = 18;
        for (let i = 0; i < 2; i++) {
            const angle = (Math.PI / 4) + (Math.PI / 2) * i;
            const x1 = Math.cos(angle) * -len;
            const y1 = Math.sin(angle) * -len;
            const x2 = Math.cos(angle) * len;
            const y2 = Math.sin(angle) * len;

            // Inner color line
            ctx.strokeStyle = e.data.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            // Black outline on top
            ctx.strokeStyle = '#1a1414';
            ctx.lineWidth = OUTLINE_WIDTH;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Clean radial accent lines
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = 1.5;
        this._drawCleanRadialLines(ctx, 0, 0, 14, 22, 4);

        ctx.restore();
    }

    _drawStabPoint(ctx, e, progress, alpha) {
        ctx.save();
        ctx.translate(e.x, e.y);
        const scale = 0.5 + progress * 0.7;
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha * 0.85;

        // Clean four-directional burst lines
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = OUTLINE_WIDTH;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 4) + (Math.PI / 2) * i;
            const dir = { x: Math.cos(angle), y: Math.sin(angle) };

            // Color line
            ctx.strokeStyle = e.data.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(dir.x * 3, dir.y * 3);
            ctx.lineTo(dir.x * 12, dir.y * 12);
            ctx.stroke();

            // Outline
            ctx.strokeStyle = '#1a1414';
            ctx.lineWidth = OUTLINE_WIDTH;
            ctx.beginPath();
            ctx.moveTo(dir.x * 3, dir.y * 3);
            ctx.lineTo(dir.x * 12, dir.y * 12);
            ctx.stroke();
        }

        // Center diamond
        ctx.globalAlpha = alpha * 0.6;
        this._drawCleanDiamond(ctx, 0, 0, 4);
        this._celFillAndStroke(ctx, e.data.color, 1.5);

        ctx.restore();
    }

    _drawShockwave(ctx, e, progress, alpha) {
        const radius = 6 + progress * 30;
        const lineWidth = 3 - progress * 2;
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;

        // Clean circle outline
        this._drawCleanCircle(ctx, e.x, e.y, radius);
        ctx.strokeStyle = e.data.color;
        ctx.lineWidth = Math.max(1, lineWidth);
        ctx.stroke();

        // Black outline ring
        this._drawCleanCircle(ctx, e.x, e.y, radius);
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = OUTLINE_WIDTH;
        ctx.stroke();

        // Clean radial accent lines around shockwave
        ctx.globalAlpha = alpha * 0.4;
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = 1.5;
        this._drawCleanRadialLines(ctx, e.x, e.y, radius + 2, radius + 8, 6);

        ctx.restore();
    }

    _drawMagicBurst(ctx, e, progress, alpha) {
        ctx.save();
        ctx.translate(e.x, e.y);
        const scale = 0.3 + progress * 1.2;
        ctx.rotate(progress * Math.PI / 6);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha * 0.85;

        // Clean six-pointed radial burst lines
        const points = 6;
        for (let i = 0; i < points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const dir = { x: Math.cos(angle), y: Math.sin(angle) };

            // Color line
            ctx.strokeStyle = e.data.color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(dir.x * 2, dir.y * 2);
            ctx.lineTo(dir.x * 16, dir.y * 16);
            ctx.stroke();

            // Black outline
            ctx.strokeStyle = '#1a1414';
            ctx.lineWidth = OUTLINE_WIDTH;
            ctx.beginPath();
            ctx.moveTo(dir.x * 2, dir.y * 2);
            ctx.lineTo(dir.x * 16, dir.y * 16);
            ctx.stroke();
        }

        // Center sparkle
        ctx.globalAlpha = alpha * 0.7;
        this._drawCleanSparkle(ctx, 0, 0, 6);
        this._celFillAndStroke(ctx, e.data.color, 1.5);

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

        // Clean star with flat fill and black outline
        this._drawCleanStar(ctx, 0, 0, 14, 8, 8);
        this._celFillAndStroke(ctx, e.data.color, OUTLINE_WIDTH);

        // Hard-edged shadow on lower half of star
        ctx.globalAlpha = alpha * 0.25;
        ctx.fillStyle = '#1a1414';
        ctx.save();
        ctx.beginPath();
        ctx.rect(-16, 0, 32, 16);
        ctx.clip();
        this._drawCleanStar(ctx, 0, 0, 14, 8, 8);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    _drawBasicHit(ctx, e, progress, alpha) {
        const radius = 4 + progress * 16;
        ctx.save();
        ctx.globalAlpha = alpha * 0.7;

        // Flat filled circle with black outline
        this._drawCleanCircle(ctx, e.x, e.y, radius);
        this._celFillAndStroke(ctx, e.data.color, OUTLINE_WIDTH);

        // Hard-edged shadow on lower half
        ctx.globalAlpha = alpha * 0.2;
        ctx.fillStyle = '#1a1414';
        ctx.save();
        ctx.beginPath();
        ctx.rect(e.x - radius - 1, e.y, radius * 2 + 2, radius + 1);
        ctx.clip();
        this._drawCleanCircle(ctx, e.x, e.y, radius);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    _drawParticles(ctx, e, progress, alpha) {
        if (!e.data._particles) {
            // Generate particle data on first render
            e.data._particles = [];
            for (let i = 0; i < (e.data.count || 4); i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = (e.data.spread || 15) * (0.3 + Math.random() * 0.7);
                const shapeType = Math.floor(Math.random() * 3); // 0=circle, 1=diamond, 2=star
                e.data._particles.push({
                    dx: Math.cos(angle) * dist,
                    dy: Math.sin(angle) * dist,
                    size: 2 + Math.random() * 2,
                    shapeType: shapeType,
                });
            }
        }
        ctx.save();
        for (const p of e.data._particles) {
            ctx.globalAlpha = alpha * 0.9;
            const px = e.x + p.dx * progress;
            const py = e.y + p.dy * progress;

            // Clean geometric particle shapes with outlines
            if (p.shapeType === 0) {
                this._drawCleanCircle(ctx, px, py, p.size);
            } else if (p.shapeType === 1) {
                this._drawCleanDiamond(ctx, px, py, p.size);
            } else {
                this._drawCleanStar(ctx, px, py, p.size, p.size * 0.4, 4);
            }
            this._celFillAndStroke(ctx, e.data.color, 1.5);
        }
        ctx.restore();
    }

    _drawComicText(ctx, e, progress) {
        // Pop in, hold, fade out
        let scale, textAlpha;
        if (progress < 0.15) {
            scale = 0.3 + (progress / 0.15) * 0.8;
            textAlpha = progress / 0.15;
        } else if (progress < 0.6) {
            scale = 1.1 - (progress - 0.15) * 0.22;
            textAlpha = 1;
        } else {
            scale = 1.0;
            textAlpha = 1 - (progress - 0.6) / 0.4;
        }

        const floatY = progress > 0.6 ? (progress - 0.6) / 0.4 * 30 : 0;

        ctx.save();
        ctx.translate(e.x, e.y - floatY);
        ctx.scale(scale, scale);
        ctx.globalAlpha = textAlpha;

        // Measure text for bubble sizing — clean bold sans-serif font
        ctx.font = `bold ${e.data.fontSize}px 'Arial Black', 'Arial', 'Helvetica', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textMetrics = ctx.measureText(e.data.word);
        const textW = textMetrics.width * 0.6;
        const textH = e.data.fontSize * 0.5;

        // Clean impact burst bubble with uniform-thickness outline
        this._drawCleanBurst(ctx, 0, 0, textW * 1.3, textH * 1.0, 10);
        ctx.fillStyle = '#fffff0';
        ctx.fill();
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = OUTLINE_WIDTH;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Clean bold sans-serif text with uniform black outline
        ctx.font = `bold ${e.data.fontSize}px 'Arial Black', 'Arial', 'Helvetica', sans-serif`;

        // Black outline (single clean stroke)
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeText(e.data.word, 0, 0);

        // Hard-edged shadow offset
        ctx.fillStyle = '#1a1a26';
        ctx.fillText(e.data.word, 2, 2);

        // Text fill
        ctx.fillStyle = '#fffff0';
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

        for (const p of e.data._puffs) {
            const px = e.x + p.ox + p.dx * progress;
            const py = e.y + p.oy + p.dy * progress;
            const size = p.size * (1 + progress * 0.5);
            ctx.globalAlpha = alpha * 0.7;

            // Clean flat circle puffs with black outline
            this._drawCleanCircle(ctx, px, py, size * 0.6);
            this._celFillAndStroke(ctx, e.data.color || '#4D3373', OUTLINE_WIDTH);
        }
        ctx.restore();
    }

    _drawMotionTrail(ctx, e, progress, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        ctx.lineWidth = 4 - progress * 3.5;
        ctx.lineCap = 'round';

        // Clean straight motion trail line
        ctx.strokeStyle = e.data.color || '#e6b34d';
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.data.toX, e.data.toY);
        ctx.stroke();

        // Black outline
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = OUTLINE_WIDTH;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.data.toX, e.data.toY);
        ctx.stroke();

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

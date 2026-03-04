/**
 * BattleVFXSystem.js — Canvas-based visual effects for RTS battles.
 * Ported from Game/Scripts/Battle/BattleVFXSystem.gd
 *
 * Spawns hit impacts, comic-book text, teleport smoke, knockback trails,
 * and element-specific VFX — all rendered via Canvas 2D drawing primitives.
 */

import { AttackStyle } from '../../data/WeaponAnimationData.js';

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_VFX = 30;
const COMIC_TEXT_THRESHOLD = 30;
const IMPACT_WORDS = ['BAM!', 'POW!', 'WHAM!', 'CRACK!', 'SMASH!'];

// ── Element Color Palette ───────────────────────────────────────────────────
const ELEMENT_COLORS = {
    Fire:     '#ff7326', Water:    '#338cff', Plant:    '#40d959',
    Ice:      '#80d9ff', Wind:     '#b3f2c0', Earth:    '#bf8c4d',
    Electric: '#fff24d', Dark:     '#6633cc', Light:    '#ffffcc',
    Fairy:    '#ff80d9', Lunar:    '#8c73e6', Solar:    '#ffd959',
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
    }

    /**
     * Spawn projectile impact (arrow/bolt/bullet).
     */
    spawnProjectileImpact(x, y, element) {
        this._enforce();
        const color = elemColor(element);
        this._addEffect('basic_hit', x, y, 0.25, { color });
        this._addEffect('particles', x, y, 0.35, { color, count: 4, spread: 15 });
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
    }

    clear() {
        this._effects = [];
    }

    // ── Drawing Implementations ─────────────────────────────────────────────

    _drawSlashMark(ctx, e, progress, alpha) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = e.data.color;
        ctx.lineWidth = 3;
        // X-shaped slash
        for (let i = 0; i < 2; i++) {
            const angle = (Math.PI / 4) + (Math.PI / 2) * i;
            const len = 18;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * -len, Math.sin(angle) * -len);
            ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            ctx.stroke();
        }
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
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 4) + (Math.PI / 2) * i;
            const dir = { x: Math.cos(angle), y: Math.sin(angle) };
            ctx.beginPath();
            ctx.moveTo(dir.x * 3, dir.y * 3);
            ctx.lineTo(dir.x * 12, dir.y * 12);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawShockwave(ctx, e, progress, alpha) {
        const radius = 6 + progress * 30;
        const lineWidth = 3 - progress * 2;
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = e.data.color;
        ctx.lineWidth = Math.max(0.5, lineWidth);
        ctx.beginPath();
        ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
        ctx.stroke();
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
        const points = 6;
        for (let i = 0; i < points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const dir = { x: Math.cos(angle), y: Math.sin(angle) };
            ctx.beginPath();
            ctx.moveTo(dir.x * 2, dir.y * 2);
            ctx.lineTo(dir.x * 16, dir.y * 16);
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
        const pts = 8;
        for (let i = 0; i < pts; i++) {
            const angle = (Math.PI * 2 * i) / pts;
            const len = i % 2 === 0 ? 14 : 8;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawBasicHit(ctx, e, progress, alpha) {
        const radius = 4 + progress * 16;
        ctx.save();
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = e.data.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = e.data.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
        ctx.stroke();
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
            ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
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
        ctx.font = `bold ${e.data.fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Outline
        ctx.strokeStyle = 'rgba(26, 20, 20, 0.95)';
        ctx.lineWidth = 4;
        ctx.strokeText(e.data.word, 0, 0);

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
        for (const p of e.data._puffs) {
            const px = e.x + p.ox + p.dx * progress;
            const py = e.y + p.oy + p.dy * progress;
            const size = p.size * (1 + progress * 0.5);
            ctx.globalAlpha = alpha * 0.7;
            ctx.fillRect(px - size / 2, py - size / 2, size, size);
        }
        ctx.restore();
    }

    _drawMotionTrail(ctx, e, progress, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = e.data.color || 'rgba(230, 179, 77, 0.5)';
        ctx.lineWidth = 4 - progress * 3.5;
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

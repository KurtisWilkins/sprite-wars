/**
 * RaceBodyRendererExt.js — Chibi doodle-style race-specific body rendering (Races 13-24).
 * Each race has a unique body shape, head features, and distinguishing characteristics
 * drawn in 64×64 logical space, rendered at 256×256 via 4× supersampling.
 *
 * Art style: Chibi doodle — oversized round heads (~50% of height), ~2.5 heads tall,
 * large anime eyes, tiny bodies, stubby limbs, bold 1.5px outlines, flat cel-shaded
 * fills, saturated colors, no gradients. Matches equipment sprite sheet art style.
 *
 * Race mappings:
 *   13=Lizard man, 14=Minotaur, 15=Monkey man, 16=Mummy, 17=Ork, 18=Rat man,
 *   19=Robot, 20=Shark man, 21=Skeleton, 22=Turtle man, 23=Wolf man, 24=Zombie
 */

// Direction constants
const DIR_DOWN  = 0;
const DIR_LEFT  = 1;
const DIR_RIGHT = 2;
const DIR_UP    = 3;

/** Race ID → visual type name mapping for races 13-24. */
export const RACE_BODY_TYPES_EXT = {
    13: 'lizardman',
    14: 'minotaur',
    15: 'monkeyman',
    16: 'mummy',
    17: 'ork',
    18: 'ratman',
    19: 'robot',
    20: 'sharkman',
    21: 'skeleton',
    22: 'turtleman',
    23: 'wolfman',
    24: 'zombie',
};

// Walk animation cycles (4 frames) — bouncy chibi stride
const WALK_CYCLES = [
    { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0  },
    { armL: -3, armR: 3,  legL: 3,  legR: -2, bob: -2 },
    { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0  },
    { armL: 3,  armR: -3, legL: -2, legR: 3,  bob: -2 },
];

// ── roundRect polyfill for older mobile WebViews ────────────────────────────
if (typeof CanvasRenderingContext2D !== 'undefined' &&
    !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
        const r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 0);
        const cr = Math.min(Math.max(0, r), Math.min(w, h) / 2);
        this.moveTo(x + cr, y);
        this.lineTo(x + w - cr, y);
        this.arcTo(x + w, y, x + w, y + cr, cr);
        this.lineTo(x + w, y + h - cr);
        this.arcTo(x + w, y + h, x + w - cr, y + h, cr);
        this.lineTo(x + cr, y + h);
        this.arcTo(x, y + h, x, y + h - cr, cr);
        this.lineTo(x, y + cr);
        this.arcTo(x, y, x + cr, y, cr);
        this.closePath();
    };
}

// ── Chibi Doodle Style Helpers ──────────────────────────────────────────────

/** Clean outline around a rounded rectangle (chibi-style 1.5px outline) */
function _drawCleanRectOutline(ctx, x, y, w, h, color = '#111111', lineWidth = 1.5) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const r = Math.min(2, w / 4, h / 4);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.roundRect(fx, fy, w, h, r);
    ctx.stroke();
    ctx.restore();
}

function _drawOutlinedRect(ctx, x, y, w, h, fillColor, outlineColor) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const r = Math.min(2, w / 4, h / 4);
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(fx, fy, w, h, r);
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function _drawRoundedRect(ctx, x, y, w, h, fillColor, outlineColor) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const r = Math.min(3, w / 3, h / 3);
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(fx, fy, w, h, r);
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
}

/** Chibi cel-shading: simple shadow on right side */
function _drawShading(ctx, x, y, w, h, midColor) {
    const sx = Math.floor(x) + Math.floor(w * 0.55);
    const sy = Math.floor(y) + 1;
    const sw = Math.ceil(w * 0.45) - 1;
    const sh = h - 2;
    if (sw <= 0 || sh <= 0) return;
    const r = Math.min(2, sw / 4, sh / 4);
    ctx.fillStyle = midColor;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, r);
    ctx.fill();
    ctx.globalAlpha = 1.0;
}

/** Chibi cel-shading: softer shadow */
function _drawSoftShading(ctx, x, y, w, h, midColor) {
    const sx = Math.floor(x) + Math.floor(w * 0.55);
    const sy = Math.floor(y) + 1;
    const sw = Math.ceil(w * 0.45) - 1;
    const sh = h - 2;
    if (sw <= 0 || sh <= 0) return;
    const r = Math.min(2, sw / 4, sh / 4);
    ctx.fillStyle = midColor;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, r);
    ctx.fill();
    ctx.globalAlpha = 1.0;
}

// ── Chibi Large Anime Eyes ──────────────────────────────────────────────
function _drawEyes(ctx, cx, eyeY, dir, colors, spacing) {
    const sp = spacing || 5;
    const eyeColor = colors.eye || '#4488cc';
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - sp - 2, eyeY, 5, 5);
        ctx.fillRect(cx + sp - 2, eyeY, 5, 5);
        ctx.fillStyle = eyeColor;
        ctx.fillRect(cx - sp - 1, eyeY + 1, 3, 4);
        ctx.fillRect(cx + sp - 1, eyeY + 1, 3, 4);
        ctx.fillStyle = '#111111';
        ctx.fillRect(cx - sp, eyeY + 2, 2, 2);
        ctx.fillRect(cx + sp, eyeY + 2, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - sp + 1, eyeY + 1, 2, 2);
        ctx.fillRect(cx + sp + 1, eyeY + 1, 2, 2);
        ctx.fillRect(cx - sp - 1, eyeY + 3, 1, 1);
        ctx.fillRect(cx + sp - 1, eyeY + 3, 1, 1);
        ctx.fillStyle = '#111111';
        ctx.fillRect(cx - sp - 2, eyeY - 1, 5, 1);
        ctx.fillRect(cx + sp - 2, eyeY - 1, 5, 1);
        ctx.fillRect(cx - sp - 2, eyeY + 5, 5, 1);
        ctx.fillRect(cx + sp - 2, eyeY + 5, 5, 1);
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        const ex = dir === DIR_RIGHT ? cx + 1 : cx - 5;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ex, eyeY, 4, 5);
        ctx.fillStyle = eyeColor;
        ctx.fillRect(ex + 1, eyeY + 1, 3, 3);
        ctx.fillStyle = '#111111';
        ctx.fillRect(ex + 1, eyeY + 2, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ex + 2, eyeY + 1, 1, 1);
        ctx.fillStyle = '#111111';
        ctx.fillRect(ex, eyeY - 1, 4, 1);
        ctx.fillRect(ex, eyeY + 5, 4, 1);
    }
}

// ── Chibi Mouth — tiny simple line ──────────────────────────────────────
function _drawMouth(ctx, cx, y, dir, color) {
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#111111';
        ctx.fillRect(cx - 1, y, 3, 1);
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        const mx = dir === DIR_RIGHT ? cx + 2 : cx - 3;
        ctx.fillStyle = '#111111';
        ctx.fillRect(mx, y, 2, 1);
    }
}

// ── Blush marks (chibi style pink cheeks) ───────────────────────────────
function _drawBlush(ctx, cx, blushY, dir, spacing) {
    if (dir === DIR_DOWN) {
        const sp = spacing || 6;
        ctx.fillStyle = '#ff8888';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(cx - sp - 1, blushY, 3, 2);
        ctx.fillRect(cx + sp - 1, blushY, 3, 2);
        ctx.globalAlpha = 1.0;
    }
}

// ── Chibi Hair — big and spiky ──────────────────────────────────────────
function _drawHairTop(ctx, x, y, w, dir, hairColor) {
    if (dir !== DIR_UP) {
        ctx.fillStyle = hairColor;
        ctx.fillRect(x - 2, y - 3, w + 4, 6);
        ctx.fillRect(x - 1, y - 5, w + 2, 3);
        if (dir === DIR_DOWN || dir === DIR_LEFT) ctx.fillRect(x - 3, y + 1, 4, 7);
        if (dir === DIR_DOWN || dir === DIR_RIGHT) ctx.fillRect(x + w - 1, y + 1, 4, 7);
        ctx.fillRect(x + Math.floor(w / 2) - 2, y - 7, 4, 3);
    }
}

function _drawHairBack(ctx, x, y, w, h, colors) {
    ctx.fillStyle = colors.hair;
    ctx.fillRect(x - 2, y, w + 4, h);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x - 2, y - 1, w + 4, 2);
    ctx.fillRect(x - 3, y, 2, h - 2);
    ctx.fillRect(x + w + 1, y, 2, h - 2);
}

function _drawLeg(ctx, x, y, w, h, colors) {
    _drawRoundedRect(ctx, x, y, w, h, colors.skin, colors.outline);
    _drawSoftShading(ctx, x, y, w, h, colors.mid);
}

function _drawArm(ctx, x, y, w, h, colors, side) {
    _drawRoundedRect(ctx, x, y, w, h, colors.skin, colors.outline);
    if (side === 'right') _drawSoftShading(ctx, x, y, w, h, colors.mid);
}

function _drawShoes(ctx, lx, ly, rx, ry, legW, colors) {
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(lx - 1, ly, legW + 2, 3);
    ctx.fillRect(rx - 1, ry, legW + 2, 3);
    ctx.fillStyle = '#221810';
    ctx.fillRect(lx - 1, ly + 2, legW + 2, 1);
    ctx.fillRect(rx - 1, ry + 2, legW + 2, 1);
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(lx, ly, legW, 1);
    ctx.fillRect(rx, ry, legW, 1);
}

function _drawTunic(ctx, x, y, w, h, skinColor) {
    const r = parseInt(skinColor.slice(1, 3), 16) - 30;
    const g = parseInt(skinColor.slice(3, 5), 16) - 30;
    const b = parseInt(skinColor.slice(5, 7), 16) - 30;
    ctx.fillStyle = `rgb(${Math.max(0, r)},${Math.max(0, g)},${Math.max(0, b)})`;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 1);
    ctx.fillStyle = `rgb(${Math.max(0, r - 20)},${Math.max(0, g - 20)},${Math.max(0, b - 20)})`;
    ctx.fillRect(x + 2, y + h - 3, w - 4, 2);
}

function _buildAnchors(cx, groundY, scale, walk, dims) {
    const headW = Math.round(dims.headW * scale);
    const headH = Math.round(dims.headH * scale);
    const torsoW = Math.round(dims.torsoW * scale);
    const torsoH = Math.round(dims.torsoH * scale);
    const armW = Math.round(dims.armW * scale);
    const armH = Math.round(dims.armH * scale);
    const legW = Math.round(dims.legW * scale);
    const legH = Math.round(dims.legH * scale);

    // Chibi proportions: oversized head sits directly on tiny torso
    const feetY = groundY;
    const legsTopY = feetY - legH;
    const torsoTopY = legsTopY - torsoH + 1;
    const neckGap = 0; // No visible neck — chibi head directly on torso
    const headTopY = torsoTopY - headH - neckGap + walk.bob;
    const shoulderY = torsoTopY + 2 + walk.bob;

    const gap = 2;
    const leftLegX = Math.floor(cx - legW - gap / 2);
    const rightLegX = Math.floor(cx + gap / 2);
    const leftArmX = Math.floor(cx - torsoW / 2 - armW);
    const rightArmX = Math.floor(cx + torsoW / 2);
    const headX = Math.floor(cx - headW / 2);
    const torsoX = Math.floor(cx - torsoW / 2);

    return {
        headX, headY: headTopY, headW, headH,
        torsoX, torsoY: torsoTopY, torsoW, torsoH,
        shoulderY,
        leftArmX, rightArmX, armW, armH,
        leftLegX, rightLegX, legW, legH,
        legsTopY, feetY, walk,
    };
}

function _drawGenericBody(ctx, a, dir, colors, hasTunic) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);

    // Back arms
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');

    // Short stubby legs
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);
    _drawShoes(ctx, leftLegX, legsTopY + walk.legL + legH - 3, rightLegX, legsTopY + walk.legR + legH - 3, legW, colors);

    // Compact torso
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    if (hasTunic) _drawTunic(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin);

    // Head
    if (dir === DIR_UP) _drawHairBack(ctx, headX, headY, headW, headH, colors);
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    // Face — large anime eyes, tiny mouth, blush
    const eyeY = headY + Math.floor(headH * 0.3);
    _drawEyes(ctx, cx, eyeY, dir, colors);
    _drawMouth(ctx, cx, headY + headH - 5, dir, colors.outline);
    _drawBlush(ctx, cx, eyeY + Math.floor(headH * 0.35), dir);
    _drawHairTop(ctx, headX, headY, headW, dir, colors.hair);

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Race-specific renderers (13-24)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Race 13: Lizard man ─────────────────────────────────────────────────────

// ── Race 13: Lizardman (Chibi Doodle) ────────────────────────────────────────
function _drawLizardman(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const bob = walk.bob;

    // Slightly wider head for lizard skull
    const lHeadW = headW + 2;
    const lHeadX = Math.floor(cx - lHeadW / 2);

    // --- Tail (behind body, visible from back and sides) ---
    if (dir !== DIR_DOWN) {
        const td = dir === DIR_LEFT ? 1 : (dir === DIR_RIGHT ? -1 : 0);
        const tailX = dir === DIR_UP ? cx - 1 : (dir === DIR_LEFT ? torsoX + torsoW - 1 : torsoX - 2);
        const tailY = torsoY + torsoH + bob - 2;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tailX, tailY, 3, 2);
        ctx.fillRect(tailX + td * 3, tailY + 1, 3, 2);
        ctx.fillRect(tailX + td * 6, tailY + 2, 2, 2);
        ctx.fillRect(tailX + td * 8, tailY + 3, 2, 2);
        ctx.fillRect(tailX + td * 10, tailY + 4, 2, 1);
        ctx.fillRect(tailX + td * 12, tailY + 4, 1, 1);
        // Scale marks on tail
        ctx.fillStyle = colors.mid;
        ctx.fillRect(tailX + td * 2, tailY + 1, 1, 1);
        ctx.fillRect(tailX + td * 5, tailY + 2, 1, 1);
        ctx.fillRect(tailX + td * 8, tailY + 3, 1, 1);
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);

    // --- Clawed feet (shoes with 2px claw extensions) ---
    const fLY = legsTopY + walk.legL + legH - 3;
    const fRY = legsTopY + walk.legR + legH - 3;
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(leftLegX - 1, fLY, legW + 2, 3);
    ctx.fillRect(rightLegX - 1, fRY, legW + 2, 3);
    // Claw tips
    ctx.fillStyle = '#443322';
    ctx.fillRect(leftLegX - 2, fLY + 2, 2, 2);
    ctx.fillRect(leftLegX + legW, fLY + 2, 2, 2);
    ctx.fillRect(rightLegX - 2, fRY + 2, 2, 2);
    ctx.fillRect(rightLegX + legW, fRY + 2, 2, 2);

    // --- Torso ---
    _drawRoundedRect(ctx, torsoX, torsoY + bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + bob, torsoW, torsoH, colors.mid);

    // Scale texture on torso (small V marks)
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(torsoX + 3, torsoY + bob + 2, 1, 1);
    ctx.fillRect(torsoX + 2, torsoY + bob + 3, 1, 1);
    ctx.fillRect(torsoX + 4, torsoY + bob + 3, 1, 1);
    ctx.fillRect(torsoX + 8, torsoY + bob + 5, 1, 1);
    ctx.fillRect(torsoX + 7, torsoY + bob + 6, 1, 1);
    ctx.fillRect(torsoX + 9, torsoY + bob + 6, 1, 1);
    ctx.fillRect(torsoX + 5, torsoY + bob + 8, 1, 1);
    ctx.fillRect(torsoX + 4, torsoY + bob + 9, 1, 1);
    ctx.fillRect(torsoX + 6, torsoY + bob + 9, 1, 1);
    ctx.globalAlpha = 1.0;

    // --- Head ---
    if (dir === DIR_UP) {
        // Spiny crest visible from back
        ctx.fillStyle = colors.hair || colors.mid;
        ctx.fillRect(cx - 1, headY - 2, 3, headH + 2);
    }
    _drawRoundedRect(ctx, lHeadX, headY, lHeadW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, lHeadX, headY, lHeadW, headH, colors.mid);

    // Scale marks on head
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(lHeadX + 3, headY + 3, 1, 1);
    ctx.fillRect(lHeadX + lHeadW - 4, headY + 4, 1, 1);
    ctx.globalAlpha = 1.0;

    // --- Spiny crest on top (3 small triangular spikes) ---
    ctx.fillStyle = colors.hair || colors.mid;
    if (dir !== DIR_UP) {
        ctx.fillRect(cx - 3, headY - 1, 2, 2);
        ctx.fillRect(cx - 2, headY - 3, 1, 2);
        ctx.fillRect(cx - 1, headY - 1, 2, 2);
        ctx.fillRect(cx, headY - 3, 1, 2);
        ctx.fillRect(cx + 1, headY - 1, 2, 2);
        ctx.fillRect(cx + 2, headY - 3, 1, 2);
    }

    // --- Face ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.3);

        // Reptile eyes with vertical slit pupils
        if (dir === DIR_DOWN) {
            // Draw eyes using _drawEyes base, then override pupils
            ctx.fillStyle = colors.eye || '#88aa22';
            ctx.fillRect(cx - 5 - 2, eyeY, 5, 5);
            ctx.fillRect(cx + 5 - 2, eyeY, 5, 5);
            // Vertical slit pupils (1px wide, 3px tall)
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 5, eyeY + 1, 1, 3);
            ctx.fillRect(cx + 5, eyeY + 1, 1, 3);
            // Highlight
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 4, eyeY + 1, 1, 1);
            ctx.fillRect(cx + 6, eyeY + 1, 1, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 5;
            ctx.fillStyle = colors.eye || '#88aa22';
            ctx.fillRect(ex, eyeY, 4, 5);
            ctx.fillStyle = '#111111';
            ctx.fillRect(ex + 2, eyeY + 1, 1, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex + 1, eyeY + 1, 1, 1);
        }

        // Small snout/muzzle
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.skin;
            ctx.fillRect(cx - 3, headY + headH - 4, 6, 3);
            ctx.fillStyle = colors.mid;
            ctx.fillRect(cx - 2, headY + headH - 3, 4, 2);
            // Nostrils
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 1, headY + headH - 2, 1, 1);
            ctx.fillRect(cx + 1, headY + headH - 2, 1, 1);
        } else {
            const snoutX = dir === DIR_RIGHT ? lHeadX + lHeadW - 1 : lHeadX - 3;
            ctx.fillStyle = colors.skin;
            ctx.fillRect(snoutX, headY + Math.floor(headH * 0.5), 3, 3);
            ctx.fillStyle = '#111111';
            const nDot = dir === DIR_RIGHT ? snoutX + 2 : snoutX;
            ctx.fillRect(nDot, headY + Math.floor(headH * 0.5) + 1, 1, 1);
        }

        // No mouth drawn (lizard snout serves as mouth area)
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
}

// ── Race 14: Minotaur (Chibi Doodle) ────────────────────────────────────────
function _drawMinotaur(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const bob = walk.bob;

    // Wider head and torso for bulky build
    const mHeadW = headW + 4;
    const mHeadX = Math.floor(cx - mHeadW / 2);
    const mTorsoW = torsoW + 3;
    const mTorsoX = Math.floor(cx - mTorsoW / 2);
    const mArmW = armW + 1;
    const mLegW = legW + 1;

    // --- Short stubby tail (back view only) ---
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 1, torsoY + torsoH + bob - 1, 3, 3);
        ctx.fillRect(cx, torsoY + torsoH + bob + 2, 2, 2);
    }

    // --- Back arms (thicker) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, mArmW, armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, leftArmX - 1, shoulderY + walk.armL, mArmW, armH, colors, 'left');
    // Fur tufts on back forearms
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(rightArmX, shoulderY + walk.armR + Math.floor(armH * 0.65), mArmW, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + Math.floor(armH * 0.65), mArmW, 2);
    }

    // --- Legs (thicker) ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, mLegW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, mLegW, legH, colors);

    // --- Hooved feet (blocky, wider +2px) ---
    const lhY = legsTopY + walk.legL + legH - 3;
    const rhY = legsTopY + walk.legR + legH - 3;
    ctx.fillStyle = '#332211';
    ctx.fillRect(leftLegX - 1, lhY, mLegW + 2, 3);
    ctx.fillRect(rightLegX - 1, rhY, mLegW + 2, 3);
    ctx.fillStyle = '#221810';
    ctx.fillRect(leftLegX - 1, lhY + 2, mLegW + 2, 1);
    ctx.fillRect(rightLegX - 1, rhY + 2, mLegW + 2, 1);

    // --- Torso (wider, bulky) ---
    _drawRoundedRect(ctx, mTorsoX, torsoY + bob, mTorsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, mTorsoX, torsoY + bob, mTorsoW, torsoH, colors.mid);
    // Chest fur patch
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(mTorsoX + 2, torsoY + bob + 1, mTorsoW - 4, Math.floor(torsoH * 0.4));
        ctx.globalAlpha = 1.0;
    }

    // --- Head (wider) ---
    if (dir === DIR_UP) _drawHairBack(ctx, mHeadX, headY, mHeadW, headH, colors);
    _drawRoundedRect(ctx, mHeadX, headY, mHeadW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, mHeadX, headY, mHeadW, headH, colors.mid);

    // --- Large curved horns (2 horns, ~8px tall, curving outward) ---
    ctx.fillStyle = '#998877';
    // Left horn
    ctx.fillRect(mHeadX, headY - 1, 3, 2);
    ctx.fillRect(mHeadX - 2, headY - 3, 3, 3);
    ctx.fillRect(mHeadX - 3, headY - 6, 2, 4);
    ctx.fillRect(mHeadX - 4, headY - 8, 2, 3);
    // Right horn
    ctx.fillRect(mHeadX + mHeadW - 3, headY - 1, 3, 2);
    ctx.fillRect(mHeadX + mHeadW - 1, headY - 3, 3, 3);
    ctx.fillRect(mHeadX + mHeadW + 1, headY - 6, 2, 4);
    ctx.fillRect(mHeadX + mHeadW + 2, headY - 8, 2, 3);
    // Horn tips (lighter)
    ctx.fillStyle = '#ccbbaa';
    ctx.fillRect(mHeadX - 4, headY - 8, 1, 1);
    ctx.fillRect(mHeadX + mHeadW + 3, headY - 8, 1, 1);

    // --- Face ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.3);

        // Small angry eyes (3x3 colored dots, no anime eyes)
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 6, eyeY, 3, 3);
            ctx.fillRect(cx + 4, eyeY, 3, 3);
            ctx.fillStyle = colors.eye || '#cc3333';
            ctx.fillRect(cx - 5, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 4, eyeY + 1, 2, 2);
            // Angry brow
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 6, eyeY - 1, 4, 1);
            ctx.fillRect(cx + 3, eyeY - 1, 4, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 5;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex, eyeY, 3, 3);
            ctx.fillStyle = colors.eye || '#cc3333';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
            ctx.fillStyle = '#111111';
            ctx.fillRect(ex, eyeY - 1, 3, 1);
        }

        // Bull snout (small flat muzzle 4x3 with nostrils)
        const snoutY = headY + headH - 5;
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.mid;
            ctx.fillRect(cx - 2, snoutY, 4, 3);
            // Nostrils (2 dots)
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 1, snoutY + 1, 1, 1);
            ctx.fillRect(cx + 1, snoutY + 1, 1, 1);
            // Nose ring (small U-shape, 3px wide)
            ctx.fillStyle = '#ddaa22';
            ctx.fillRect(cx - 1, snoutY + 2, 1, 2);
            ctx.fillRect(cx + 1, snoutY + 2, 1, 2);
            ctx.fillRect(cx - 1, snoutY + 3, 3, 1);
        } else {
            const mx = dir === DIR_RIGHT ? mHeadX + mHeadW - 2 : mHeadX - 1;
            ctx.fillStyle = colors.mid;
            ctx.fillRect(mx, snoutY, 3, 3);
            ctx.fillStyle = '#111111';
            ctx.fillRect(mx + (dir === DIR_RIGHT ? 2 : 0), snoutY + 1, 1, 1);
        }
    }

    // --- Front arms (thicker, with fur tufts) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, mArmW, armH, colors, 'right');
        ctx.fillStyle = colors.hair;
        ctx.fillRect(rightArmX, shoulderY + walk.armR + Math.floor(armH * 0.65), mArmW, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX - 1, shoulderY + walk.armL, mArmW, armH, colors, 'left');
        ctx.fillStyle = colors.hair;
        ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + Math.floor(armH * 0.65), mArmW, 2);
    }
}

// ── Race 15: Monkeyman (Chibi Doodle) ────────────────────────────────────────
function _drawMonkeyman(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const bob = walk.bob;

    // --- Long prehensile tail (behind body, visible from back and sides) ---
    if (dir !== DIR_DOWN) {
        const td = dir === DIR_LEFT ? 1 : (dir === DIR_RIGHT ? -1 : 0);
        const tailX = dir === DIR_UP ? cx - 1 : (dir === DIR_LEFT ? torsoX + torsoW : torsoX - 2);
        const tailY = torsoY + torsoH + bob - 3;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tailX, tailY, 2, 2);
        ctx.fillRect(tailX + td * 2, tailY - 1, 2, 2);
        ctx.fillRect(tailX + td * 4, tailY - 3, 2, 2);
        ctx.fillRect(tailX + td * 6, tailY - 4, 2, 2);
        ctx.fillRect(tailX + td * 8, tailY - 5, 2, 2);
        ctx.fillRect(tailX + td * 10, tailY - 4, 2, 2);
        ctx.fillRect(tailX + td * 12, tailY - 3, 2, 2);
        // Curling tip upward
        ctx.fillRect(tailX + td * 14, tailY - 5, 1, 2);
        ctx.fillRect(tailX + td * 15, tailY - 6, 1, 1);
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);

    // --- Standard shoes ---
    _drawShoes(ctx, leftLegX, legsTopY + walk.legL + legH - 3, rightLegX, legsTopY + walk.legR + legH - 3, legW, colors);

    // --- Torso ---
    _drawRoundedRect(ctx, torsoX, torsoY + bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + bob, torsoW, torsoH, colors.mid);

    // Belly patch (lighter colored oval on torso front)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair || '#eeddcc';
        ctx.globalAlpha = 0.4;
        ctx.fillRect(Math.floor(cx - 2), torsoY + bob + Math.floor(torsoH * 0.3), 4, 4);
        ctx.globalAlpha = 1.0;
    }

    // --- Head ---
    if (dir === DIR_UP) _drawHairBack(ctx, headX, headY, headW, headH, colors);
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    // --- Round monkey ears on sides (4x4 circles) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX - 4, headY + Math.floor(headH * 0.25), 4, 4);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(headX - 3, headY + Math.floor(headH * 0.25) + 1, 2, 2);
        ctx.fillStyle = '#111111';
        ctx.fillRect(headX - 4, headY + Math.floor(headH * 0.25), 4, 1);
        ctx.fillRect(headX - 4, headY + Math.floor(headH * 0.25), 1, 4);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX + headW, headY + Math.floor(headH * 0.25), 4, 4);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(headX + headW + 1, headY + Math.floor(headH * 0.25) + 1, 2, 2);
        ctx.fillStyle = '#111111';
        ctx.fillRect(headX + headW, headY + Math.floor(headH * 0.25), 4, 1);
        ctx.fillRect(headX + headW + 3, headY + Math.floor(headH * 0.25), 1, 4);
    }

    // --- Hair tuft on top (messy) ---
    _drawHairTop(ctx, headX, headY, headW, dir, colors.hair);

    // --- Face ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.3);

        // Friendly eyes using _drawEyes
        _drawEyes(ctx, cx, eyeY, dir, colors);

        // Small round nose (2x2 dark circle)
        const noseY = headY + Math.floor(headH * 0.55);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#332222';
            ctx.fillRect(cx - 1, noseY, 2, 2);
        } else {
            const nx = dir === DIR_RIGHT ? cx + 2 : cx - 3;
            ctx.fillStyle = '#332222';
            ctx.fillRect(nx, noseY, 2, 2);
        }

        // Wide grin mouth (5px line instead of 3px)
        const mouthY = headY + headH - 5;
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 2, mouthY, 5, 1);
        } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
            const mx = dir === DIR_RIGHT ? cx + 1 : cx - 4;
            ctx.fillStyle = '#111111';
            ctx.fillRect(mx, mouthY, 3, 1);
        }

        // Blush marks
        _drawBlush(ctx, cx, eyeY + Math.floor(headH * 0.35), dir);
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
}

// ── Race 16: Mummy (Chibi Doodle) ───────────────────────────────────────────
function _drawMummy(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const bob = walk.bob;

    const bandageColor = '#e8dcc0';
    const bandageLine = '#c4b898';
    const ageTint = '#556644';

    // --- Loose bandage strips dangling behind body ---
    ctx.fillStyle = bandageColor;
    ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + armH, 1, 5);
    ctx.fillRect(headX + headW + 1, headY + Math.floor(headH * 0.5), 1, 6);
    ctx.fillStyle = bandageLine;
    ctx.fillRect(torsoX + torsoW, torsoY + bob + Math.floor(torsoH * 0.5), 1, 4);

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, { skin: bandageColor, mid: bandageLine, outline: '#111111' }, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, { skin: bandageColor, mid: bandageLine, outline: '#111111' }, 'left');

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, { skin: bandageColor, mid: bandageLine, outline: '#111111' });
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, { skin: bandageColor, mid: bandageLine, outline: '#111111' });

    // Bandage lines on legs (every 3px)
    for (let y = 0; y < legH - 2; y += 3) {
        ctx.fillStyle = bandageLine;
        ctx.fillRect(leftLegX + 1, legsTopY + walk.legL + y, legW - 2, 1);
        ctx.fillRect(rightLegX + 1, legsTopY + walk.legR + y, legW - 2, 1);
    }

    // --- Wrapped feet (no shoes, bandage-colored rectangles) ---
    const lfY = legsTopY + walk.legL + legH - 3;
    const rfY = legsTopY + walk.legR + legH - 3;
    ctx.fillStyle = bandageColor;
    ctx.fillRect(leftLegX - 1, lfY, legW + 2, 3);
    ctx.fillRect(rightLegX - 1, rfY, legW + 2, 3);
    ctx.fillStyle = bandageLine;
    ctx.fillRect(leftLegX, lfY + 1, legW, 1);
    ctx.fillRect(rightLegX, rfY + 1, legW, 1);

    // --- Torso (bandage wrapped) ---
    _drawRoundedRect(ctx, torsoX, torsoY + bob, torsoW, torsoH, bandageColor, '#111111');
    // Horizontal bandage lines across torso (every 3px)
    for (let y = 1; y < torsoH - 1; y += 3) {
        ctx.fillStyle = bandageLine;
        const offset = (y % 6 < 3) ? 0 : 1;
        ctx.fillRect(torsoX + 1 + offset, torsoY + bob + y, torsoW - 2, 1);
    }

    // Age spots on torso (green/dark tint, 0.2 alpha)
    ctx.fillStyle = ageTint;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(torsoX + 2, torsoY + bob + 3, 2, 2);
    ctx.fillRect(torsoX + torsoW - 5, torsoY + bob + 7, 3, 2);
    ctx.globalAlpha = 1.0;

    // --- Head (bandage wrapped) ---
    _drawRoundedRect(ctx, headX, headY, headW, headH, bandageColor, '#111111');
    // Horizontal bandage lines on head
    for (let y = 2; y < headH - 2; y += 3) {
        ctx.fillStyle = bandageLine;
        const offset = (y % 6 < 3) ? 0 : 1;
        ctx.fillRect(headX + 1 + offset, headY + y, headW - 2, 1);
    }

    // Loose bandage strip from head
    ctx.fillStyle = bandageColor;
    if (dir !== DIR_UP) {
        ctx.fillRect(headX - 1, headY + Math.floor(headH * 0.3), 1, 5);
    }

    // Age spot on head
    ctx.fillStyle = ageTint;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(headX + headW - 4, headY + 3, 2, 2);
    ctx.globalAlpha = 1.0;

    // --- Face: one exposed eye, no mouth ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.3);

        if (dir === DIR_DOWN) {
            // Only draw ONE eye (right eye visible, left covered by bandage)
            // Right eye
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx + 5 - 2, eyeY, 5, 5);
            ctx.fillStyle = colors.eye || '#44ccaa';
            ctx.fillRect(cx + 5 - 1, eyeY + 1, 3, 4);
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx + 5, eyeY + 2, 2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx + 5 + 1, eyeY + 1, 2, 2);
            // Eyelid line
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx + 5 - 2, eyeY - 1, 5, 1);
            ctx.fillRect(cx + 5 - 2, eyeY + 5, 5, 1);
            // Left eye area: bandage covers it
            ctx.fillStyle = bandageLine;
            ctx.fillRect(cx - 5 - 2, eyeY, 5, 5);
        } else {
            // Side view: one eye visible
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 5;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex, eyeY, 4, 5);
            ctx.fillStyle = colors.eye || '#44ccaa';
            ctx.fillRect(ex + 1, eyeY + 1, 3, 3);
            ctx.fillStyle = '#111111';
            ctx.fillRect(ex + 1, eyeY + 2, 2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex + 2, eyeY + 1, 1, 1);
            ctx.fillStyle = '#111111';
            ctx.fillRect(ex, eyeY - 1, 4, 1);
            ctx.fillRect(ex, eyeY + 5, 4, 1);
        }

        // No mouth (covered by bandages)
    }

    // Bandage lines on back arms
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        for (let y = 2; y < armH; y += 3) {
            ctx.fillStyle = bandageLine;
            ctx.fillRect(rightArmX + 1, shoulderY + walk.armR + y, armW - 2, 1);
        }
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        for (let y = 2; y < armH; y += 3) {
            ctx.fillStyle = bandageLine;
            ctx.fillRect(leftArmX + 1, shoulderY + walk.armL + y, armW - 2, 1);
        }
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, { skin: bandageColor, mid: bandageLine, outline: '#111111' }, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, { skin: bandageColor, mid: bandageLine, outline: '#111111' }, 'left');

    // Bandage lines on front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        for (let y = 2; y < armH; y += 3) {
            ctx.fillStyle = bandageLine;
            ctx.fillRect(rightArmX + 1, shoulderY + walk.armR + y, armW - 2, 1);
        }
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        for (let y = 2; y < armH; y += 3) {
            ctx.fillStyle = bandageLine;
            ctx.fillRect(leftArmX + 1, shoulderY + walk.armL + y, armW - 2, 1);
        }
    }

    // Dangling bandage strip from front arm
    ctx.fillStyle = bandageColor;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(rightArmX + armW, shoulderY + walk.armR + Math.floor(armH * 0.6), 1, 4);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + Math.floor(armH * 0.6), 1, 4);
    }
}

// ── Race 17: Ork (Chibi Doodle) ─────────────────────────────────────────────
function _drawOrk(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;

    // Burly proportions: wider head and torso, thicker arms
    const orkHeadW = a.headW + 2;
    const orkHeadX = Math.floor(cx - orkHeadW / 2);
    const orkTorsoW = a.torsoW + 2;
    const orkTorsoX = Math.floor(cx - orkTorsoW / 2);
    const orkTorsoY = a.torsoY + bob;
    const orkArmW = a.armW + 1;

    // --- Back arms (thick) ---
    const rArmX = Math.floor(cx + orkTorsoW / 2);
    const lArmX = Math.floor(cx - orkTorsoW / 2) - orkArmW;
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, rArmX, a.shoulderY + a.walk.armR, orkArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, lArmX, a.shoulderY + a.walk.armL, orkArmW, a.armH, colors, 'left');

    // --- Legs ---
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, colors);

    // Heavy boots (wider, darker)
    const lBootY = a.legsTopY + a.walk.legL + a.legH - 3;
    const rBootY = a.legsTopY + a.walk.legR + a.legH - 3;
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(a.leftLegX - 2, lBootY, a.legW + 4, 4);
    ctx.fillRect(a.rightLegX - 2, rBootY, a.legW + 4, 4);
    ctx.fillStyle = '#221810';
    ctx.fillRect(a.leftLegX - 2, lBootY + 3, a.legW + 4, 1);
    ctx.fillRect(a.rightLegX - 2, rBootY + 3, a.legW + 4, 1);

    // --- Torso ---
    _drawRoundedRect(ctx, orkTorsoX, orkTorsoY, orkTorsoW, a.torsoH, colors.skin, '#111111');
    _drawSoftShading(ctx, orkTorsoX, orkTorsoY, orkTorsoW, a.torsoH, colors.mid);

    // --- Head ---
    if (dir === DIR_UP) _drawHairBack(ctx, orkHeadX, a.headY, orkHeadW, a.headH, colors);
    _drawRoundedRect(ctx, orkHeadX, a.headY, orkHeadW, a.headH, colors.skin, '#111111');
    _drawSoftShading(ctx, orkHeadX, a.headY, orkHeadW, a.headH, colors.mid);

    // Pointed ears (3px stubs from sides)
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.skin;
        if (dir === DIR_DOWN || dir === DIR_LEFT) {
            ctx.fillRect(orkHeadX - 3, a.headY + Math.floor(a.headH * 0.3), 3, 3);
        }
        if (dir === DIR_DOWN || dir === DIR_RIGHT) {
            ctx.fillRect(orkHeadX + orkHeadW, a.headY + Math.floor(a.headH * 0.3), 3, 3);
        }
    }

    // Angry brow: dark line above eyes
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#111111';
        const browY = a.headY + Math.floor(a.headH * 0.28);
        if (dir === DIR_DOWN) {
            ctx.fillRect(orkHeadX + 3, browY, orkHeadW - 6, 1);
        } else {
            const bx = dir === DIR_RIGHT ? cx - 1 : cx - 4;
            ctx.fillRect(bx, browY, 5, 1);
        }
    }

    // Beady eyes (smaller spacing=4)
    if (dir !== DIR_UP) {
        _drawEyes(ctx, cx, a.headY + Math.floor(a.headH * 0.33), dir, colors, 4);
    }

    // Small tusks: 2 white rectangles (1x3) poking up from lower jaw
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#ffffee';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 4, a.headY + a.headH - 3, 1, 3);
            ctx.fillRect(cx + 4, a.headY + a.headH - 3, 1, 3);
        } else {
            const tx = dir === DIR_RIGHT ? cx + 2 : cx - 2;
            ctx.fillRect(tx, a.headY + a.headH - 3, 1, 3);
        }
    }

    // Warpaint marks: 2 short lines under each eye
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#882222';
        const wpY = a.headY + Math.floor(a.headH * 0.55);
        ctx.fillRect(cx - 5, wpY, 2, 1);
        ctx.fillRect(cx - 5, wpY + 2, 2, 1);
        ctx.fillRect(cx + 4, wpY, 2, 1);
        ctx.fillRect(cx + 4, wpY + 2, 2, 1);
    }

    // Hair top (mohawk-ish)
    _drawHairTop(ctx, orkHeadX, a.headY, orkHeadW, dir, colors.hair);

    // --- Front arms (thick) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, rArmX, a.shoulderY + a.walk.armR, orkArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, lArmX, a.shoulderY + a.walk.armL, orkArmW, a.armH, colors, 'left');
}

// ── Race 18: Rat man (Chibi Doodle) ─────────────────────────────────────────
function _drawRatman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;

    // --- Tail (behind body, side/back views) ---
    if (dir !== DIR_DOWN) {
        ctx.strokeStyle = colors.mid || '#cc9988';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const td = dir === DIR_LEFT ? 1 : (dir === DIR_RIGHT ? -1 : 0);
        const tailX = dir === DIR_UP ? cx : (dir === DIR_LEFT ? a.torsoX + a.torsoW : a.torsoX);
        const tailY = a.torsoY + bob + a.torsoH - 2;
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(tailX + td * 5, tailY + 4);
        ctx.lineTo(tailX + td * 9, tailY + 2);
        ctx.lineTo(tailX + td * 14, tailY + 5);
        ctx.stroke();
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');

    // --- Legs ---
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, colors);
    _drawShoes(ctx, a.leftLegX, a.legsTopY + a.walk.legL + a.legH - 3,
               a.rightLegX, a.legsTopY + a.walk.legR + a.legH - 3, a.legW, colors);

    // --- Torso ---
    _drawRoundedRect(ctx, a.torsoX, a.torsoY + bob, a.torsoW, a.torsoH, colors.skin, '#111111');
    _drawSoftShading(ctx, a.torsoX, a.torsoY + bob, a.torsoW, a.torsoH, colors.mid);

    // --- Head ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, '#111111');
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Large round ears on top (5x5 with pink inside)
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 1, a.headY - 4, 5, 5);
        ctx.fillStyle = '#ddaaaa';
        ctx.fillRect(a.headX, a.headY - 3, 3, 3);
    }
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 4, 5, 5);
        ctx.fillStyle = '#ddaaaa';
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 3, 3, 3);
    }

    // Scraggly fur tufts on head
    ctx.fillStyle = colors.hair || colors.skin;
    ctx.fillRect(cx - 1, a.headY - 2, 2, 2);
    ctx.fillRect(cx + 2, a.headY - 1, 1, 2);
    ctx.fillRect(cx - 3, a.headY, 1, 2);

    // Pointed snout extending 3px
    if (dir !== DIR_UP) {
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.skin;
            ctx.fillRect(cx - 2, a.headY + a.headH, 4, 3);
            // Pink nose
            ctx.fillStyle = '#ee8899';
            ctx.fillRect(cx - 1, a.headY + a.headH + 2, 2, 1);
        } else {
            const snoutDir = dir === DIR_RIGHT ? 1 : -1;
            const sx = dir === DIR_RIGHT ? a.headX + a.headW : a.headX - 3;
            ctx.fillStyle = colors.skin;
            ctx.fillRect(sx, a.headY + Math.floor(a.headH * 0.5), 3, 3);
            ctx.fillStyle = '#ee8899';
            ctx.fillRect(sx + (dir === DIR_RIGHT ? 2 : 0), a.headY + Math.floor(a.headH * 0.5) + 1, 1, 1);
        }
    }

    // Small beady eyes: 2x2 dark dots
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35);
        ctx.fillStyle = '#111111';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 4, eyeY, 2, 2);
            ctx.fillRect(cx + 3, eyeY, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 3;
            ctx.fillRect(ex, eyeY, 2, 2);
        }
    }

    // Prominent front teeth: 2 white rectangles (2x3) from upper jaw
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#ffffee';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 2, a.headY + a.headH - 1, 2, 3);
            ctx.fillRect(cx + 1, a.headY + a.headH - 1, 2, 3);
        } else {
            const tx = dir === DIR_RIGHT ? cx + 1 : cx - 2;
            ctx.fillRect(tx, a.headY + a.headH - 1, 2, 3);
        }
    }

    // Whiskers: 3 thin lines each side (front/side only)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#111111';
        for (let i = 0; i < 3; i++) {
            const wy = a.headY + Math.floor(a.headH * 0.6) + i * 2;
            ctx.fillRect(a.headX - 4, wy, 5, 1);
            ctx.fillRect(a.headX + a.headW, wy, 5, 1);
        }
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        ctx.fillStyle = '#111111';
        const wx = dir === DIR_RIGHT ? a.headX + a.headW + 2 : a.headX - 6;
        for (let i = 0; i < 3; i++) {
            const wy = a.headY + Math.floor(a.headH * 0.5) + i * 2;
            ctx.fillRect(wx, wy, 4, 1);
        }
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
}

// ── Race 19: Robot (Chibi Doodle) ───────────────────────────────────────────
function _drawRobot(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;
    const metalColor = colors.skin || '#b8b8c8';
    const metalDark = colors.mid || '#8888a0';
    const glowColor = colors.eye || '#44ddff';

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');

    // --- Legs ---
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, colors);

    // Blocky feet (angular)
    const lFootY = a.legsTopY + a.walk.legL + a.legH - 2;
    const rFootY = a.legsTopY + a.walk.legR + a.legH - 2;
    _drawOutlinedRect(ctx, a.leftLegX - 1, lFootY, a.legW + 2, 3, metalDark, '#111111');
    _drawOutlinedRect(ctx, a.rightLegX - 1, rFootY, a.legW + 2, 3, metalDark, '#111111');

    // --- Torso (boxy) ---
    const torsoY = a.torsoY + bob;
    _drawOutlinedRect(ctx, a.torsoX, torsoY, a.torsoW, a.torsoH, metalColor, '#111111');
    _drawSoftShading(ctx, a.torsoX, torsoY, a.torsoW, a.torsoH, metalDark);

    // Panel lines on torso: vertical center + horizontal middle
    ctx.fillStyle = '#555566';
    ctx.fillRect(cx, torsoY + 2, 1, a.torsoH - 4);
    ctx.fillRect(a.torsoX + 2, torsoY + Math.floor(a.torsoH / 2), a.torsoW - 4, 1);

    // LED indicator on chest (2x2 colored square)
    if (dir !== DIR_UP) {
        ctx.fillStyle = glowColor;
        ctx.fillRect(cx - 1, torsoY + Math.floor(a.torsoH * 0.25), 2, 2);
    }

    // Joint circles at shoulders (2x2 dark dots)
    ctx.fillStyle = '#333344';
    ctx.fillRect(a.torsoX, a.shoulderY + bob, 2, 2);
    ctx.fillRect(a.torsoX + a.torsoW - 2, a.shoulderY + bob, 2, 2);

    // --- Head (boxy/angular, use _drawOutlinedRect) ---
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, metalColor, '#111111');
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, metalDark);

    // Antenna on top (single stalk ~5px with ball on top)
    ctx.fillStyle = '#555566';
    ctx.fillRect(cx, a.headY - 5, 1, 5);
    ctx.fillStyle = glowColor;
    ctx.fillRect(cx - 1, a.headY - 7, 3, 3);

    // Screen/visor eyes: one horizontal rectangle (8x3) with colored pixels
    if (dir !== DIR_UP) {
        const visorY = a.headY + Math.floor(a.headH * 0.3);
        ctx.fillStyle = '#111111';
        if (dir === DIR_DOWN) {
            ctx.fillRect(a.headX + 3, visorY, 8, 3);
            ctx.fillStyle = glowColor;
            ctx.fillRect(a.headX + 4, visorY + 1, 2, 1);
            ctx.fillRect(a.headX + 8, visorY + 1, 2, 1);
        } else {
            const vx = dir === DIR_RIGHT ? cx - 1 : cx - 5;
            ctx.fillRect(vx, visorY, 6, 3);
            ctx.fillStyle = glowColor;
            ctx.fillRect(vx + 1, visorY + 1, 2, 1);
            ctx.fillRect(vx + 4, visorY + 1, 1, 1);
        }
    }

    // Speaker grille: 3 horizontal lines (no mouth)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#555566';
        const grY = a.headY + Math.floor(a.headH * 0.65);
        ctx.fillRect(cx - 3, grY, 6, 1);
        ctx.fillRect(cx - 3, grY + 2, 6, 1);
        ctx.fillRect(cx - 3, grY + 4, 6, 1);
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
}

// ── Race 20: Shark man (Chibi Doodle) ───────────────────────────────────────
function _drawSharkman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;

    // Wider head and slightly wider torso
    const sharkHeadW = a.headW + 4;
    const sharkHeadX = Math.floor(cx - sharkHeadW / 2);
    const sharkTorsoW = a.torsoW + 1;
    const sharkTorsoX = Math.floor(cx - sharkTorsoW / 2);
    const sharkTorsoY = a.torsoY + bob;

    // --- Tail fin from back view (small V-shape) ---
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 3, sharkTorsoY + a.torsoH, 2, 3);
        ctx.fillRect(cx + 2, sharkTorsoY + a.torsoH, 2, 3);
        ctx.fillRect(cx - 1, sharkTorsoY + a.torsoH, 3, 2);
    }

    // --- Back arms with fin webbing ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.rightArmX + a.armW, a.shoulderY + a.walk.armR + 2, 2, Math.floor(a.armH * 0.5));
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + 2, 2, Math.floor(a.armH * 0.5));
    }

    // --- Legs with wider webbed feet ---
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, colors);
    // Webbed feet (+1px wider)
    const lFootY = a.legsTopY + a.walk.legL + a.legH - 3;
    const rFootY = a.legsTopY + a.walk.legR + a.legH - 3;
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftLegX - 1, lFootY, a.legW + 3, 3);
    ctx.fillRect(a.rightLegX - 1, rFootY, a.legW + 3, 3);
    ctx.fillStyle = '#111111';
    ctx.fillRect(a.leftLegX - 1, lFootY + 2, a.legW + 3, 1);
    ctx.fillRect(a.rightLegX - 1, rFootY + 2, a.legW + 3, 1);

    // --- Torso (slightly wider) ---
    _drawRoundedRect(ctx, sharkTorsoX, sharkTorsoY, sharkTorsoW, a.torsoH, colors.skin, '#111111');
    _drawSoftShading(ctx, sharkTorsoX, sharkTorsoY, sharkTorsoW, a.torsoH, colors.mid);

    // --- Head (wider for shark shape) ---
    _drawRoundedRect(ctx, sharkHeadX, a.headY, sharkHeadW, a.headH, colors.skin, '#111111');
    _drawSoftShading(ctx, sharkHeadX, a.headY, sharkHeadW, a.headH, colors.mid);

    // Shark fin on top of head (triangular, ~6px tall)
    ctx.fillStyle = colors.skin;
    ctx.fillRect(cx - 1, a.headY - 6, 3, 2);
    ctx.fillRect(cx - 1, a.headY - 4, 4, 2);
    ctx.fillRect(cx - 1, a.headY - 2, 5, 2);
    ctx.fillStyle = '#111111';
    ctx.fillRect(cx - 1, a.headY - 6, 1, 6);

    // Small dark eyes: 3x3, placed wide apart
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.25);
        ctx.fillStyle = '#111111';
        if (dir === DIR_DOWN) {
            ctx.fillRect(sharkHeadX + 2, eyeY, 3, 3);
            ctx.fillRect(sharkHeadX + sharkHeadW - 5, eyeY, 3, 3);
            ctx.fillStyle = '#333333';
            ctx.fillRect(sharkHeadX + 3, eyeY + 1, 1, 1);
            ctx.fillRect(sharkHeadX + sharkHeadW - 4, eyeY + 1, 1, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 5;
            ctx.fillRect(ex, eyeY, 3, 3);
            ctx.fillStyle = '#333333';
            ctx.fillRect(ex + 1, eyeY + 1, 1, 1);
        }
    }

    // Gill slits on sides of head (3 small lines each side)
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#111111';
        if (dir === DIR_DOWN || dir === DIR_LEFT) {
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(sharkHeadX + 1, a.headY + Math.floor(a.headH * 0.4) + i * 2, 2, 1);
            }
        }
        if (dir === DIR_DOWN || dir === DIR_RIGHT) {
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(sharkHeadX + sharkHeadW - 3, a.headY + Math.floor(a.headH * 0.4) + i * 2, 2, 1);
            }
        }
    }

    // Wide mouth with zigzag teeth
    if (dir !== DIR_UP) {
        const mouthY = a.headY + Math.floor(a.headH * 0.7);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#111111';
            ctx.fillRect(sharkHeadX + 3, mouthY, sharkHeadW - 6, 1);
            // Zigzag teeth (3-4 white triangular teeth)
            ctx.fillStyle = '#ffffff';
            for (let t = sharkHeadX + 4; t < sharkHeadX + sharkHeadW - 4; t += 3) {
                ctx.fillRect(t, mouthY - 1, 1, 1);
                ctx.fillRect(t + 1, mouthY, 1, 1);
            }
        } else {
            const mx = dir === DIR_RIGHT ? cx + 1 : cx - 6;
            ctx.fillStyle = '#111111';
            ctx.fillRect(mx, mouthY, 5, 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(mx + 1, mouthY - 1, 1, 1);
            ctx.fillRect(mx + 3, mouthY - 1, 1, 1);
        }
    }

    // --- Front arms with fin webbing ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.rightArmX + a.armW, a.shoulderY + a.walk.armR + 2, 2, Math.floor(a.armH * 0.5));
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + 2, 2, Math.floor(a.armH * 0.5));
    }
}

// ── Race 21: Skeleton (chibi doodle style) ──────────────────────────────────
function _drawSkeleton(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;
    const boneWhite = colors.skin || '#e8e0d0';
    const boneIvory = colors.mid || '#d5cdb8';
    const boneShadow = '#9a9080';
    const socketBlack = '#1a1018';
    const outline = colors.outline || '#111111';

    // --- Back arms (bone segments) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, { skin: boneWhite, mid: boneIvory, outline }, 'right');
        ctx.fillStyle = boneShadow;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + Math.floor(a.armH / 2), a.armW, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, { skin: boneWhite, mid: boneIvory, outline }, 'left');
        ctx.fillStyle = boneShadow;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH / 2), a.armW, 2);
    }

    // --- Bone legs ---
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, { skin: boneWhite, mid: boneIvory, outline });
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, { skin: boneWhite, mid: boneIvory, outline });
    // Joint lines at midpoint
    ctx.fillStyle = boneShadow;
    ctx.fillRect(a.leftLegX, a.legsTopY + a.walk.legL + Math.floor(a.legH / 2), a.legW, 2);
    ctx.fillRect(a.rightLegX, a.legsTopY + a.walk.legR + Math.floor(a.legH / 2), a.legW, 2);
    // Bare bone feet (small rectangles, no shoes)
    const skelFootYL = a.legsTopY + a.walk.legL + a.legH - 3;
    const skelFootYR = a.legsTopY + a.walk.legR + a.legH - 3;
    ctx.fillStyle = boneIvory;
    ctx.fillRect(a.leftLegX - 1, skelFootYL, a.legW + 2, 2);
    ctx.fillRect(a.rightLegX - 1, skelFootYR, a.legW + 2, 2);
    ctx.fillStyle = outline;
    ctx.fillRect(a.leftLegX - 1, skelFootYL + 2, a.legW + 2, 1);
    ctx.fillRect(a.rightLegX - 1, skelFootYR + 2, a.legW + 2, 1);

    // --- Ribcage torso ---
    _drawOutlinedRect(ctx, a.torsoX, a.torsoY + bob, a.torsoW, a.torsoH, boneWhite, outline);
    _drawSoftShading(ctx, a.torsoX, a.torsoY + bob, a.torsoW, a.torsoH, boneIvory);

    if (dir !== DIR_UP) {
        // Rib lines (3-4 horizontal lines)
        ctx.fillStyle = boneShadow;
        const ribSpacing = Math.floor(a.torsoH / 5);
        for (let i = 0; i < 4; i++) {
            const ry = a.torsoY + bob + 2 + i * ribSpacing;
            ctx.fillRect(a.torsoX + 2, ry, cx - a.torsoX - 3, 1);
            ctx.fillRect(cx + 1, ry, a.torsoX + a.torsoW - cx - 3, 1);
        }
    }
    if (dir === DIR_UP) {
        // Spine vertebrae dots from back
        ctx.fillStyle = boneShadow;
        const vertSpacing = Math.floor(a.torsoH / 5);
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(cx - 1, a.torsoY + bob + 2 + i * vertSpacing, 2, 2);
        }
    }

    // --- Skull head ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, boneWhite, outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, boneIvory);

    // Skull crack (1px diagonal)
    ctx.fillStyle = boneShadow;
    ctx.fillRect(cx + 2, a.headY + 2, 1, 1);
    ctx.fillRect(cx + 3, a.headY + 3, 1, 1);
    ctx.fillRect(cx + 4, a.headY + 4, 1, 1);

    // Skull face features
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.25);
        if (dir === DIR_DOWN) {
            // Hollow eye sockets (4x4 dark circles with 1x1 glowing dot)
            ctx.fillStyle = socketBlack;
            ctx.fillRect(cx - 6, eyeY, 4, 4);
            ctx.fillRect(cx + 3, eyeY, 4, 4);
            ctx.fillStyle = colors.eye || '#aaddaa';
            ctx.fillRect(cx - 5, eyeY + 1, 1, 1);
            ctx.fillRect(cx + 4, eyeY + 1, 1, 1);

            // Jaw with zigzag teeth
            const jawY = a.headY + a.headH - 4;
            ctx.fillStyle = boneShadow;
            ctx.fillRect(a.headX + 3, jawY, a.headW - 6, 1);
            ctx.fillStyle = '#ffffff';
            for (let tx = a.headX + 3; tx < a.headX + a.headW - 3; tx += 2) {
                ctx.fillRect(tx, jawY + 1, 1, 2);
            }
            ctx.fillStyle = socketBlack;
            for (let tx = a.headX + 4; tx < a.headX + a.headW - 4; tx += 2) {
                ctx.fillRect(tx, jawY + 1, 1, 2);
            }
        } else {
            // Side view — single socket
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 5;
            ctx.fillStyle = socketBlack;
            ctx.fillRect(ex, eyeY, 4, 4);
            ctx.fillStyle = colors.eye || '#aaddaa';
            ctx.fillRect(ex + 1, eyeY + 1, 1, 1);

            // Side jaw teeth
            const jawX = dir === DIR_RIGHT ? a.headX + a.headW - 4 : a.headX + 1;
            ctx.fillStyle = boneShadow;
            ctx.fillRect(jawX, a.headY + a.headH - 4, 3, 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(jawX, a.headY + a.headH - 3, 1, 2);
            ctx.fillRect(jawX + 2, a.headY + a.headH - 3, 1, 2);
        }
    }

    // --- Front arms (bone segments) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, { skin: boneWhite, mid: boneIvory, outline }, 'right');
        ctx.fillStyle = boneShadow;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + Math.floor(a.armH / 2), a.armW, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, { skin: boneWhite, mid: boneIvory, outline }, 'left');
        ctx.fillStyle = boneShadow;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH / 2), a.armW, 2);
    }
}

// ── Race 22: Turtle man (chibi doodle style) ────────────────────────────────
function _drawTurtleman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;
    const shellMain = '#558844';
    const shellDark = '#336622';
    const shellLight = '#77aa55';
    const beakColor = '#bbaa44';
    const outline = colors.outline || '#111111';
    const tLegW = a.legW + 1;
    const tArmW = a.armW + 1;

    // --- Back arms (stubby) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, tArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, tArmW, a.armH, colors, 'left');

    // --- Sturdy legs (thicker) ---
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, tLegW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, tLegW, a.legH, colors);
    // Flat wide feet (+2px width)
    const footW = tLegW + 4;
    const turtFootYL = a.legsTopY + a.walk.legL + a.legH - 3;
    const turtFootYR = a.legsTopY + a.walk.legR + a.legH - 3;
    ctx.fillStyle = colors.skin;
    ctx.fillRect(a.leftLegX - 2, turtFootYL - 1, footW, 3);
    ctx.fillRect(a.rightLegX - 2, turtFootYR - 1, footW, 3);
    ctx.fillStyle = outline;
    ctx.fillRect(a.leftLegX - 2, turtFootYL + 2, footW, 1);
    ctx.fillRect(a.rightLegX - 2, turtFootYR + 2, footW, 1);

    // --- Shell (behind body) ---
    const shellW = a.torsoW + 6;
    const shellH = a.torsoH + 4;
    const shellX = Math.floor(cx - shellW / 2);
    const shellY = a.torsoY + bob - 2;

    if (dir === DIR_UP || dir === DIR_LEFT || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, shellX, shellY, shellW, shellH, shellMain, outline);
        _drawSoftShading(ctx, shellX, shellY, shellW, shellH, shellDark);
        // Shell highlight
        ctx.fillStyle = shellLight;
        ctx.fillRect(shellX + 2, shellY + 2, Math.floor(shellW * 0.3), Math.floor(shellH * 0.3));
        // Hex grid lines on shell
        const thirdW = Math.floor(shellW / 3);
        ctx.fillStyle = shellDark;
        ctx.fillRect(shellX + thirdW, shellY + 2, 1, shellH - 4);
        ctx.fillRect(shellX + thirdW * 2, shellY + 2, 1, shellH - 4);
        ctx.fillRect(shellX + 2, shellY + Math.floor(shellH / 2), shellW - 4, 1);
    }

    // --- Wider torso (+3px for shell bulk) ---
    const wTorsoW = a.torsoW + 3;
    const wTorsoX = Math.floor(cx - wTorsoW / 2);
    _drawOutlinedRect(ctx, wTorsoX, a.torsoY + bob, wTorsoW, a.torsoH, colors.skin, outline);
    _drawSoftShading(ctx, wTorsoX, a.torsoY + bob, wTorsoW, a.torsoH, colors.mid);

    // Shell edge visible from front (curved lines at sides of torso)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = shellDark;
        ctx.fillRect(wTorsoX - 2, a.torsoY + bob + 2, 2, a.torsoH - 4);
        ctx.fillRect(wTorsoX + wTorsoW, a.torsoY + bob + 2, 2, a.torsoH - 4);
    }

    // --- Round head (smooth, slightly flat top, no hair) ---
    const headY = a.headY + 1;
    _drawRoundedRect(ctx, a.headX, headY, a.headW, a.headH - 1, colors.skin, outline);
    _drawSoftShading(ctx, a.headX, headY, a.headW, a.headH - 1, colors.mid);

    // Face
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor((a.headH - 1) * 0.3);
        _drawEyes(ctx, cx, eyeY, dir, colors, 5);

        // Beak-like mouth (2px triangle instead of standard mouth)
        if (dir === DIR_DOWN) {
            ctx.fillStyle = beakColor;
            ctx.fillRect(cx - 1, headY + a.headH - 5, 3, 2);
            ctx.fillRect(cx, headY + a.headH - 3, 1, 1);
        } else {
            const bx = dir === DIR_RIGHT ? a.headX + a.headW - 2 : a.headX - 1;
            ctx.fillStyle = beakColor;
            ctx.fillRect(bx, headY + Math.floor((a.headH - 1) * 0.55), 3, 2);
        }

        _drawBlush(ctx, cx, eyeY + 8, dir, 6);
    }

    // Short stubby tail (back view)
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 1, a.torsoY + bob + a.torsoH, 3, 3);
        ctx.fillStyle = outline;
        ctx.fillRect(cx - 1, a.torsoY + bob + a.torsoH + 3, 3, 1);
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, tArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, tArmW, a.armH, colors, 'left');
}

// ── Race 23: Wolf man (chibi doodle style) ──────────────────────────────────
function _drawWolfman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;
    const furColor = colors.skin;
    const furDark = colors.mid;
    const furMane = colors.hair;
    const eyeAmber = colors.eye || '#ddcc33';
    const outline = colors.outline || '#111111';

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');

    // --- Legs ---
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, colors);
    // Paw feet (slightly wider +1px)
    _drawShoes(ctx, a.leftLegX, a.legsTopY + a.walk.legL + a.legH - 3, a.rightLegX, a.legsTopY + a.walk.legR + a.legH - 3, a.legW + 1, { skin: furDark, outline });

    // --- Bushy tail (back and side views) ---
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = furMane;
        const tailDir = dir === DIR_LEFT ? -1 : (dir === DIR_RIGHT ? 1 : 0);
        const tailBaseX = cx + tailDir * Math.floor(a.torsoW / 2);
        const tailBaseY = a.torsoY + a.torsoH - 3 + bob;
        // 3-4 overlapping rectangles for bushy tail
        ctx.fillRect(tailBaseX, tailBaseY, 4, 3);
        ctx.fillRect(tailBaseX + tailDir * 3, tailBaseY - 2, 4, 3);
        ctx.fillRect(tailBaseX + tailDir * 5, tailBaseY - 4, 3, 2);
        ctx.fillRect(tailBaseX + tailDir * 7, tailBaseY - 5, 2, 2);
        ctx.fillStyle = outline;
        ctx.fillRect(tailBaseX + tailDir * 7 + (tailDir >= 0 ? 2 : -1), tailBaseY - 5, 1, 2);
    }

    // --- Torso ---
    _drawOutlinedRect(ctx, a.torsoX, a.torsoY + bob, a.torsoW, a.torsoH, furColor, outline);
    _drawSoftShading(ctx, a.torsoX, a.torsoY + bob, a.torsoW, a.torsoH, furDark);

    // Chest fur tuft (V-shape of lighter color, front view)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = furMane;
        ctx.fillRect(cx - 3, a.torsoY + bob + 1, 6, 1);
        ctx.fillRect(cx - 2, a.torsoY + bob + 2, 4, 1);
        ctx.fillRect(cx - 1, a.torsoY + bob + 3, 2, 1);
    }

    // --- Wolf head ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, furColor, outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, furDark);

    // Pointed wolf ears (2 triangles, ~5px tall)
    if (dir !== DIR_UP) {
        // Left ear
        ctx.fillStyle = furColor;
        ctx.fillRect(a.headX, a.headY - 5, 4, 5);
        ctx.fillRect(a.headX + 1, a.headY - 7, 2, 2);
        ctx.fillStyle = '#cc8888';
        ctx.fillRect(a.headX + 1, a.headY - 4, 2, 3);
        // Right ear
        ctx.fillStyle = furColor;
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 5, 4, 5);
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 7, 2, 2);
        ctx.fillStyle = '#cc8888';
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 4, 2, 3);
        // Ear outlines
        ctx.fillStyle = outline;
        ctx.fillRect(a.headX, a.headY - 5, 1, 5);
        ctx.fillRect(a.headX + a.headW - 1, a.headY - 5, 1, 5);
    } else {
        // Back of ears
        ctx.fillStyle = furColor;
        ctx.fillRect(a.headX, a.headY - 4, 4, 4);
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 4, 4, 4);
        ctx.fillStyle = outline;
        ctx.fillRect(a.headX, a.headY - 5, 4, 1);
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 5, 4, 1);
    }

    // Fur tufts on cheeks
    if (dir === DIR_DOWN) {
        ctx.fillStyle = furMane;
        ctx.fillRect(a.headX - 1, a.headY + Math.floor(a.headH * 0.5), 2, 2);
        ctx.fillRect(a.headX + a.headW - 1, a.headY + Math.floor(a.headH * 0.5), 2, 2);
    }

    // Face
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.25);
        // Wolf eyes with amber color, slightly narrower spacing
        _drawEyes(ctx, cx, eyeY, dir, { eye: eyeAmber }, 4);

        // Snout/muzzle
        if (dir === DIR_DOWN) {
            ctx.fillStyle = furColor;
            ctx.fillRect(cx - 2, a.headY + a.headH - 5, 5, 4);
            // Small nose on snout tip (2x2 dark)
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 1, a.headY + a.headH - 5, 2, 2);
            // Fangs (2 small pointed teeth, 1x2)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 1, a.headY + a.headH - 2, 1, 2);
            ctx.fillRect(cx + 1, a.headY + a.headH - 2, 1, 2);
            // Mouth line
            ctx.fillStyle = outline;
            ctx.fillRect(cx - 2, a.headY + a.headH - 3, 5, 1);
        } else {
            // Side snout (3px forward from edge)
            const snoutX = dir === DIR_RIGHT ? a.headX + a.headW - 1 : a.headX - 3;
            ctx.fillStyle = furColor;
            ctx.fillRect(snoutX, a.headY + Math.floor(a.headH * 0.45), 4, 3);
            ctx.fillStyle = '#111111';
            const nTip = dir === DIR_RIGHT ? snoutX + 3 : snoutX;
            ctx.fillRect(nTip, a.headY + Math.floor(a.headH * 0.45), 2, 2);
            // Side fang
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(snoutX + 1, a.headY + Math.floor(a.headH * 0.45) + 2, 1, 2);
            ctx.fillStyle = outline;
            ctx.fillRect(snoutX, a.headY + Math.floor(a.headH * 0.45) + 2, 4, 1);
        }
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
}

// ── Race 24: Zombie (chibi doodle style) ────────────────────────────────────
function _drawZombie(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;
    const decaySkin = colors.skin;
    const decayDark = colors.mid;
    const woundRed = '#882222';
    const boneExposed = '#d5cdb8';
    const slimeGreen = '#66884a';
    const outline = colors.outline || '#111111';

    // --- Back arms (right arm +2px longer, offset +1px for shambling) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, a.armW, a.armH + 2, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');

    // --- Legs ---
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, colors);
    // Torn/ragged shoes (notched bottom edge)
    const shoeY_L = a.legsTopY + a.walk.legL + a.legH - 3;
    const shoeY_R = a.legsTopY + a.walk.legR + a.legH - 3;
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(a.leftLegX - 1, shoeY_L, a.legW + 2, 3);
    ctx.fillRect(a.rightLegX - 1, shoeY_R, a.legW + 2, 3);
    // Notched bottom for torn look
    ctx.fillStyle = '#221810';
    ctx.fillRect(a.leftLegX, shoeY_L + 2, 2, 1);
    ctx.fillRect(a.rightLegX + 2, shoeY_R + 2, 2, 1);

    // Exposed bone on one leg (small white rectangle)
    ctx.fillStyle = boneExposed;
    ctx.fillRect(a.rightLegX + 1, a.legsTopY + a.walk.legR + Math.floor(a.legH * 0.5), a.legW - 2, 2);

    // --- Torso with tattered clothing ---
    _drawOutlinedRect(ctx, a.torsoX, a.torsoY + bob, a.torsoW, a.torsoH, decaySkin, outline);
    _drawSoftShading(ctx, a.torsoX, a.torsoY + bob, a.torsoW, a.torsoH, decayDark);

    // Torn edges on torso (irregular bottom, 2-3 notches)
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(a.torsoX + 1, a.torsoY + bob + 1, a.torsoW - 2, Math.floor(a.torsoH * 0.4));
    // Torn bottom edge notches
    const tearY = a.torsoY + bob + Math.floor(a.torsoH * 0.4);
    ctx.fillRect(a.torsoX + 1, tearY, 3, 2);
    ctx.fillRect(a.torsoX + 6, tearY, 2, 3);
    ctx.fillRect(a.torsoX + a.torsoW - 4, tearY, 2, 1);

    // Wound marks (2-3 small red/dark marks scattered on body)
    ctx.fillStyle = woundRed;
    ctx.fillRect(a.torsoX + 3, a.torsoY + bob + Math.floor(a.torsoH * 0.6), 2, 1);
    ctx.fillRect(a.torsoX + a.torsoW - 4, a.torsoY + bob + Math.floor(a.torsoH * 0.5), 2, 1);

    // Drool/slime drip
    ctx.fillStyle = slimeGreen;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(a.torsoX + a.torsoW - 2, a.torsoY + bob + a.torsoH - 1, 1, 3);
    ctx.globalAlpha = 1.0;

    // --- Head ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, decaySkin, outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, decayDark);

    // Messy hair patches (2-3 random small rectangles)
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.headX + 1, a.headY - 1, 3, 2);
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 2, 3, 3);
        ctx.fillRect(a.headX + Math.floor(a.headW * 0.4), a.headY - 1, 2, 2);
    }

    // Face
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.25);
        if (dir === DIR_DOWN) {
            // Left eye — normal using _drawEyes style
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 7, eyeY, 5, 5);
            ctx.fillStyle = colors.eye || '#88aa66';
            ctx.fillRect(cx - 6, eyeY + 1, 3, 3);
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 5, eyeY + 2, 2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 5, eyeY + 1, 1, 1);
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 7, eyeY - 1, 5, 1);
            ctx.fillRect(cx - 7, eyeY + 5, 5, 1);

            // Right eye — X-shaped (dead eye)
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx + 2, eyeY, 5, 5);
            ctx.fillStyle = decaySkin;
            ctx.fillRect(cx + 3, eyeY + 1, 3, 3);
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx + 3, eyeY + 1, 1, 1);
            ctx.fillRect(cx + 5, eyeY + 1, 1, 1);
            ctx.fillRect(cx + 4, eyeY + 2, 1, 1);
            ctx.fillRect(cx + 3, eyeY + 3, 1, 1);
            ctx.fillRect(cx + 5, eyeY + 3, 1, 1);

            // Open drooling mouth (wider, 4px, with drip)
            const mouthY = a.headY + a.headH - 4;
            ctx.fillStyle = '#221111';
            ctx.fillRect(cx - 2, mouthY, 4, 2);
            ctx.fillStyle = outline;
            ctx.fillRect(cx - 2, mouthY - 1, 4, 1);
            ctx.fillRect(cx - 2, mouthY + 2, 4, 1);
            // Drip below mouth (1px line, 2px down)
            ctx.fillStyle = slimeGreen;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(cx, mouthY + 2, 1, 2);
            ctx.globalAlpha = 1.0;
        } else {
            // Side view — one visible eye
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 5;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex, eyeY, 4, 5);
            ctx.fillStyle = colors.eye || '#88aa66';
            ctx.fillRect(ex + 1, eyeY + 1, 3, 3);
            ctx.fillStyle = '#111111';
            ctx.fillRect(ex + 1, eyeY + 2, 2, 2);
            ctx.fillStyle = '#111111';
            ctx.fillRect(ex, eyeY - 1, 4, 1);
            ctx.fillRect(ex, eyeY + 5, 4, 1);

            // Side mouth
            const sjX = dir === DIR_RIGHT ? a.headX + a.headW - 4 : a.headX + 1;
            ctx.fillStyle = '#221111';
            ctx.fillRect(sjX, a.headY + a.headH - 4, 3, 2);
            ctx.fillStyle = outline;
            ctx.fillRect(sjX, a.headY + a.headH - 2, 3, 1);
        }

        // Wound mark on face
        ctx.fillStyle = woundRed;
        ctx.fillRect(a.headX + a.headW - 5, a.headY + 2, 2, 1);
    }

    // Exposed bone on one arm (small white rectangle)
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillStyle = boneExposed;
        ctx.fillRect(a.rightArmX + 2, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.6), a.armW - 2, 2);
    }

    // --- Front arms (right arm +2px longer, +1px offset for shambling) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, a.armW, a.armH + 2, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════════════════

const RACE_RENDERERS_EXT = {
    13: _drawLizardman,
    14: _drawMinotaur,
    15: _drawMonkeyman,
    16: _drawMummy,
    17: _drawOrk,
    18: _drawRatman,
    19: _drawRobot,
    20: _drawSharkman,
    21: _drawSkeleton,
    22: _drawTurtleman,
    23: _drawWolfman,
    24: _drawZombie,
};

/**
 * Draw a race-specific humanoid body (races 13-24) and return anchor points.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} raceId — 13-24
 * @param {number} cx — center X of frame
 * @param {number} groundY — bottom Y (ground line)
 * @param {number} dir — 0=Down, 1=Left, 2=Right, 3=Up
 * @param {number} frame — walk cycle frame 0-3
 * @param {number} scale — evolution scale (0.9-1.0)
 * @param {Object} colors — { skin, mid, outline, hair, eye }
 * @returns {Object} anchor points for equipment positioning
 */
export function drawRaceBodyExt(ctx, raceId, cx, groundY, dir, frame, scale, colors) {
    const walk = WALK_CYCLES[frame % 4];

    // Chibi doodle proportions: oversized head, tiny body, stubby limbs (~2.5 heads tall)
    const dims = {
        headW: 22, headH: 20,
        torsoW: 16, torsoH: 12,
        armW: 5, armH: 12,
        legW: 6, legH: 10,
    };

    const a = _buildAnchors(cx, groundY, scale, walk, dims);
    const renderer = RACE_RENDERERS_EXT[raceId];
    if (renderer) {
        renderer(ctx, a, dir, colors);
    } else {
        // Fallback to generic human-like body
        _drawGenericBody(ctx, a, dir, colors, true);
    }

    return a;
}

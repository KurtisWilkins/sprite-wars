/**
 * RaceBodyRenderer.js — Chibi doodle-style race-specific body rendering (Races 1-12).
 * Each race has a unique body shape, head features, and distinguishing characteristics
 * drawn in 64×64 logical space, rendered at 256×256 via 4× supersampling.
 *
 * Art style: Chibi doodle — oversized round heads (~50% of height), ~2.5 heads tall,
 * large anime eyes, tiny bodies, stubby limbs, bold 1.5px outlines, flat cel-shaded
 * fills, saturated colors, no gradients. Matches equipment sprite sheet art style.
 *
 * Race mappings:
 *   1=Bug man, 2=Bear man, 3=Bird man, 4=Demon, 5=Devil, 6=Cat man,
 *   7=Elf, 8=Ent, 9=Fish man, 10=Ghost, 11=Golem, 12=Human
 */

// Direction constants
const DIR_DOWN  = 0;
const DIR_LEFT  = 1;
const DIR_RIGHT = 2;
const DIR_UP    = 3;

/** Race ID → visual type name mapping for races 1-12. */
export const RACE_BODY_TYPES = {
    1:  'bugman',
    2:  'bearman',
    3:  'birdman',
    4:  'demon',
    5:  'devil',
    6:  'catman',
    7:  'elf',
    8:  'ent',
    9:  'fishman',
    10: 'ghost',
    11: 'golem',
    12: 'human',
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

// ── Shared Helpers ──────────────────────────────────────────────────────────

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
        // Large round sclera (5×5 — big chibi eyes)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - sp - 2, eyeY, 5, 5);
        ctx.fillRect(cx + sp - 2, eyeY, 5, 5);
        // Colored iris (3×4)
        ctx.fillStyle = eyeColor;
        ctx.fillRect(cx - sp - 1, eyeY + 1, 3, 4);
        ctx.fillRect(cx + sp - 1, eyeY + 1, 3, 4);
        // Dark pupil (2×2)
        ctx.fillStyle = '#111111';
        ctx.fillRect(cx - sp, eyeY + 2, 2, 2);
        ctx.fillRect(cx + sp, eyeY + 2, 2, 2);
        // Big bright highlight (chibi sparkle)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - sp + 1, eyeY + 1, 2, 2);
        ctx.fillRect(cx + sp + 1, eyeY + 1, 2, 2);
        // Small secondary highlight
        ctx.fillRect(cx - sp - 1, eyeY + 3, 1, 1);
        ctx.fillRect(cx + sp - 1, eyeY + 3, 1, 1);
        // Outline
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
function _drawMouth(ctx, cx, y, dir, outlineColor) {
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
        // Big fluffy hair mass
        ctx.fillRect(x - 2, y - 3, w + 4, 6);
        ctx.fillRect(x - 1, y - 5, w + 2, 3);
        // Side bangs
        if (dir === DIR_DOWN || dir === DIR_LEFT) {
            ctx.fillRect(x - 3, y + 1, 4, 7);
        }
        if (dir === DIR_DOWN || dir === DIR_RIGHT) {
            ctx.fillRect(x + w - 1, y + 1, 4, 7);
        }
        // Spiky tuft on top
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

// ── Chibi Shoes — small and simple ──────────────────────────────────────
function _drawShoes(ctx, lx, ly, rx, ry, legW, colors) {
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(lx - 1, ly, legW + 2, 3);
    ctx.fillRect(rx - 1, ry, legW + 2, 3);
    // Sole
    ctx.fillStyle = '#221810';
    ctx.fillRect(lx - 1, ly + 2, legW + 2, 1);
    ctx.fillRect(rx - 1, ry + 2, legW + 2, 1);
    // Highlight
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
    // Belt
    ctx.fillStyle = `rgb(${Math.max(0, r - 20)},${Math.max(0, g - 20)},${Math.max(0, b - 20)})`;
    ctx.fillRect(x + 2, y + h - 3, w - 4, 2);
}

// ── Core body builder ───────────────────────────────────────────────────────

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

// ── Generic humanoid draw (used as base for most races) ─────────────────────

function _drawGenericBody(ctx, a, dir, colors, hasTunic) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);

    // Back arms
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }

    // Short stubby legs
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);
    _drawShoes(ctx, leftLegX, legsTopY + walk.legL + legH - 3, rightLegX, legsTopY + walk.legR + legH - 3, legW, colors);

    // Compact torso
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    if (hasTunic) _drawTunic(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin);

    // Head (back hair when facing up)
    if (dir === DIR_UP) _drawHairBack(ctx, headX, headY, headW, headH, colors);

    // Big round chibi head
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    // Face — large anime eyes, tiny mouth, blush marks
    const eyeY = headY + Math.floor(headH * 0.3);
    _drawEyes(ctx, cx, eyeY, dir, colors);
    _drawMouth(ctx, cx, headY + headH - 5, dir, colors.outline);
    _drawBlush(ctx, cx, eyeY + Math.floor(headH * 0.35), dir);
    _drawHairTop(ctx, headX, headY, headW, dir, colors.hair);

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Race-specific renderers
// ═══════════════════════════════════════════════════════════════════════════════

// ── Race 1: Bug man ─────────────────────────────────────────────────────────
function _drawBugman(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const bugArmW = armW - 1;

    // --- Back main arms (thin, segmented chitinous) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawOutlinedRect(ctx, rightArmX, shoulderY + walk.armR, bugArmW, armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, rightArmX, shoulderY + walk.armR, bugArmW, armH, colors.mid);
        // Joint band
        ctx.fillStyle = colors.outline;
        ctx.fillRect(rightArmX, shoulderY + walk.armR + Math.floor(armH * 0.45), bugArmW, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawOutlinedRect(ctx, leftArmX + 1, shoulderY + walk.armL, bugArmW, armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, leftArmX + 1, shoulderY + walk.armL, bugArmW, armH, colors.mid);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(leftArmX + 1, shoulderY + walk.armL + Math.floor(armH * 0.45), bugArmW, 1);
    }

    // --- Secondary (smaller) arms at lower torso, visible facing down ---
    if (dir === DIR_DOWN) {
        const secArmW = bugArmW - 2;
        const secArmH = armH - 4;
        const secArmY = torsoY + walk.bob + Math.floor(torsoH * 0.5);
        // Left secondary arm
        _drawOutlinedRect(ctx, leftArmX + 3, secArmY + walk.armL * 0.5, secArmW, secArmH, colors.mid, colors.outline);
        // Right secondary arm
        _drawOutlinedRect(ctx, rightArmX - 1, secArmY + walk.armR * 0.5, secArmW, secArmH, colors.mid, colors.outline);
        // Tiny claw tips on secondary arms
        ctx.fillStyle = colors.outline;
        ctx.fillRect(leftArmX + 3, secArmY + walk.armL * 0.5 + secArmH, secArmW, 1);
        ctx.fillRect(rightArmX - 1, secArmY + walk.armR * 0.5 + secArmH, secArmW, 1);
    }

    // --- Segmented chitinous legs with joint bands ---
    _drawOutlinedRect(ctx, leftLegX, legsTopY + walk.legL, legW - 1, legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, leftLegX, legsTopY + walk.legL, legW - 1, legH, colors.mid);
    _drawOutlinedRect(ctx, rightLegX, legsTopY + walk.legR, legW - 1, legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, rightLegX, legsTopY + walk.legR, legW - 1, legH, colors.mid);
    // Upper joint band
    ctx.fillStyle = colors.outline;
    ctx.fillRect(leftLegX, legsTopY + walk.legL + 2, legW - 1, 1);
    ctx.fillRect(rightLegX, legsTopY + walk.legR + 2, legW - 1, 1);
    // Lower joint band
    ctx.fillRect(leftLegX, legsTopY + walk.legL + Math.floor(legH * 0.6), legW - 1, 1);
    ctx.fillRect(rightLegX, legsTopY + walk.legR + Math.floor(legH * 0.6), legW - 1, 1);

    // Clawed tarsi (insect feet) — 3-pronged
    ctx.fillStyle = colors.outline;
    ctx.fillRect(leftLegX - 2, legsTopY + walk.legL + legH - 1, legW + 3, 2);
    ctx.fillRect(leftLegX - 3, legsTopY + walk.legL + legH, 2, 2);
    ctx.fillRect(leftLegX + Math.floor((legW - 1) / 2) - 1, legsTopY + walk.legL + legH + 1, 2, 1);
    ctx.fillRect(leftLegX + legW, legsTopY + walk.legL + legH, 2, 2);
    ctx.fillRect(rightLegX - 2, legsTopY + walk.legR + legH - 1, legW + 3, 2);
    ctx.fillRect(rightLegX - 3, legsTopY + walk.legR + legH, 2, 2);
    ctx.fillRect(rightLegX + Math.floor((legW - 1) / 2) - 1, legsTopY + walk.legR + legH + 1, 2, 1);
    ctx.fillRect(rightLegX + legW, legsTopY + walk.legR + legH, 2, 2);

    // --- Segmented thorax (torso) with chitinous plates ---
    _drawOutlinedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    // Chitin plate lines — two horizontal segments
    ctx.fillStyle = colors.outline;
    ctx.fillRect(torsoX + 2, torsoY + walk.bob + Math.floor(torsoH * 0.22), torsoW - 4, 1);
    ctx.fillRect(torsoX + 2, torsoY + walk.bob + Math.floor(torsoH * 0.5), torsoW - 4, 1);

    // --- Abdomen visible behind body (insect rear segment) ---
    if (dir === DIR_UP || dir === DIR_LEFT || dir === DIR_RIGHT) {
        const abdX = dir === DIR_UP ? cx - 6 : (dir === DIR_LEFT ? cx + 3 : cx - 9);
        const abdY = torsoY + torsoH - 2 + walk.bob;
        _drawOutlinedRect(ctx, abdX, abdY, 12, 7, colors.skin, colors.outline);
        _drawSoftShading(ctx, abdX, abdY, 12, 7, colors.mid);
        // Abdomen segment lines
        ctx.fillStyle = colors.outline;
        ctx.fillRect(abdX + 2, abdY + 2, 8, 1);
        ctx.fillRect(abdX + 2, abdY + 4, 8, 1);
    }

    // --- Bug head (extra-wide for compound eyes) ---
    const bugHeadW = headW + 10;
    const bugHeadX = Math.floor(cx - bugHeadW / 2);
    _drawRoundedRect(ctx, bugHeadX, headY, bugHeadW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, bugHeadX, headY, bugHeadW, headH, colors.mid);

    // --- Prominent compound eyes (large faceted hemispheres) ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.18);
        if (dir === DIR_DOWN) {
            // Left compound eye — large dome
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 15, eyeY, 11, 11);
            ctx.fillRect(cx - 14, eyeY - 1, 9, 1);
            ctx.fillRect(cx - 14, eyeY + 11, 9, 1);
            // Right compound eye
            ctx.fillRect(cx + 5, eyeY, 11, 11);
            ctx.fillRect(cx + 6, eyeY - 1, 9, 1);
            ctx.fillRect(cx + 6, eyeY + 11, 9, 1);
            // Faceted grid pattern on eyes
            ctx.fillStyle = colors.outline;
            ctx.globalAlpha = 0.2;
            ctx.fillRect(cx - 12, eyeY + 3, 8, 1);
            ctx.fillRect(cx - 12, eyeY + 6, 8, 1);
            ctx.fillRect(cx - 12, eyeY + 9, 8, 1);
            ctx.fillRect(cx - 10, eyeY + 1, 1, 9);
            ctx.fillRect(cx - 7, eyeY + 1, 1, 9);
            ctx.fillRect(cx + 7, eyeY + 3, 8, 1);
            ctx.fillRect(cx + 7, eyeY + 6, 8, 1);
            ctx.fillRect(cx + 7, eyeY + 9, 8, 1);
            ctx.fillRect(cx + 9, eyeY + 1, 1, 9);
            ctx.fillRect(cx + 12, eyeY + 1, 1, 9);
            ctx.globalAlpha = 1.0;
            // Highlights on compound eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 14, eyeY + 1, 4, 4);
            ctx.fillRect(cx + 6, eyeY + 1, 4, 4);
            ctx.fillRect(cx - 8, eyeY + 7, 2, 2);
            ctx.fillRect(cx + 12, eyeY + 7, 2, 2);
        } else {
            // Side view: one large compound eye
            const ex = dir === DIR_RIGHT ? cx + 4 : cx - 14;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY, 11, 11);
            ctx.fillRect(ex + 1, eyeY - 1, 9, 1);
            ctx.fillRect(ex + 1, eyeY + 11, 9, 1);
            // Facet grid
            ctx.fillStyle = colors.outline;
            ctx.globalAlpha = 0.2;
            ctx.fillRect(ex + 2, eyeY + 3, 7, 1);
            ctx.fillRect(ex + 2, eyeY + 6, 7, 1);
            ctx.fillRect(ex + 4, eyeY + 1, 1, 9);
            ctx.fillRect(ex + 7, eyeY + 1, 1, 9);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY + 1, 4, 4);
            ctx.fillRect(ex + 6, eyeY + 7, 2, 2);
        }
    }

    // --- Long segmented antennae with feathered tips ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.outline;
        // Left antenna — segmented stalk
        ctx.fillRect(cx - 7, headY - 6, 2, 6);
        ctx.fillRect(cx - 8, headY - 12, 2, 6);
        ctx.fillRect(cx - 10, headY - 16, 2, 5);
        // Feathered tip (3 prongs)
        ctx.fillRect(cx - 13, headY - 19, 2, 4);
        ctx.fillRect(cx - 10, headY - 19, 2, 4);
        ctx.fillRect(cx - 7, headY - 18, 2, 3);
        // Right antenna — segmented stalk
        ctx.fillRect(cx + 6, headY - 6, 2, 6);
        ctx.fillRect(cx + 7, headY - 12, 2, 6);
        ctx.fillRect(cx + 9, headY - 16, 2, 5);
        // Feathered tip (3 prongs)
        ctx.fillRect(cx + 6, headY - 18, 2, 3);
        ctx.fillRect(cx + 9, headY - 19, 2, 4);
        ctx.fillRect(cx + 12, headY - 19, 2, 4);
        // Segment joints (colored dots)
        ctx.fillStyle = colors.eye;
        ctx.fillRect(cx - 8, headY - 7, 2, 2);
        ctx.fillRect(cx - 10, headY - 13, 2, 2);
        ctx.fillRect(cx + 7, headY - 7, 2, 2);
        ctx.fillRect(cx + 9, headY - 13, 2, 2);
    } else {
        // Antennae from back view — pointing up
        ctx.fillStyle = colors.outline;
        ctx.fillRect(cx - 6, headY - 14, 2, 14);
        ctx.fillRect(cx + 5, headY - 14, 2, 14);
        ctx.fillStyle = colors.eye;
        ctx.fillRect(cx - 7, headY - 17, 4, 4);
        ctx.fillRect(cx + 4, headY - 17, 4, 4);
    }

    // --- Mandibles (prominent, visible from front and sides) ---
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#886633';
        // Left mandible — curved pincer shape
        ctx.fillRect(cx - 6, headY + headH - 2, 3, 4);
        ctx.fillRect(cx - 7, headY + headH + 1, 2, 2);
        ctx.fillRect(cx - 5, headY + headH + 2, 2, 2);
        // Right mandible
        ctx.fillRect(cx + 4, headY + headH - 2, 3, 4);
        ctx.fillRect(cx + 6, headY + headH + 1, 2, 2);
        ctx.fillRect(cx + 4, headY + headH + 2, 2, 2);
        // Mandible outline
        ctx.fillStyle = colors.outline;
        ctx.fillRect(cx - 7, headY + headH + 3, 2, 1);
        ctx.fillRect(cx + 6, headY + headH + 3, 2, 1);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = '#886633';
        ctx.fillRect(bugHeadX - 3, headY + headH - 4, 4, 3);
        ctx.fillRect(bugHeadX - 5, headY + headH - 2, 3, 3);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(bugHeadX - 5, headY + headH, 2, 1);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = '#886633';
        ctx.fillRect(bugHeadX + bugHeadW, headY + headH - 4, 4, 3);
        ctx.fillRect(bugHeadX + bugHeadW + 3, headY + headH - 2, 3, 3);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(bugHeadX + bugHeadW + 4, headY + headH, 2, 1);
    }

    // --- Front main arms with claw tips ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawOutlinedRect(ctx, rightArmX, shoulderY + walk.armR, bugArmW, armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, rightArmX, shoulderY + walk.armR, bugArmW, armH, colors.mid);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(rightArmX, shoulderY + walk.armR + Math.floor(armH * 0.45), bugArmW, 1);
        // Claw
        ctx.fillRect(rightArmX - 1, shoulderY + walk.armR + armH, bugArmW + 1, 2);
        ctx.fillRect(rightArmX + bugArmW - 1, shoulderY + walk.armR + armH + 1, 2, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawOutlinedRect(ctx, leftArmX + 1, shoulderY + walk.armL, bugArmW, armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, leftArmX + 1, shoulderY + walk.armL, bugArmW, armH, colors.mid);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(leftArmX + 1, shoulderY + walk.armL + Math.floor(armH * 0.45), bugArmW, 1);
        // Claw
        ctx.fillRect(leftArmX, shoulderY + walk.armL + armH, bugArmW + 1, 2);
        ctx.fillRect(leftArmX, shoulderY + walk.armL + armH + 1, 2, 1);
    }
}

// ── Race 2: Bear man ────────────────────────────────────────────────────────
function _drawBearman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    // Bear is the widest, stockiest race — extra proportions everywhere
    const bearTorsoW = a.torsoW + 10;
    const bearTorsoX = Math.floor(cx - bearTorsoW / 2);
    const bearHeadW = a.headW + 8;
    const bearHeadH = a.headH + 4;
    const bearHeadX = Math.floor(cx - bearHeadW / 2);
    const bearArmW = a.armW + 4;
    const bearArmH = a.armH + 2;
    const bearLegW = a.legW + 4;
    const bearLegH = a.legH + 1;
    // Cream belly color
    const bellyColor = '#ddc8a0';

    // --- Back thick arms with fur fringe ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, cx + Math.floor(bearTorsoW / 2), a.shoulderY + a.walk.armR, bearArmW, bearArmH, colors.skin, colors.outline);
        _drawSoftShading(ctx, cx + Math.floor(bearTorsoW / 2), a.shoulderY + a.walk.armR, bearArmW, bearArmH, colors.mid);
        // Fur fringe on arm edge
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx + Math.floor(bearTorsoW / 2) + bearArmW, a.shoulderY + a.walk.armR + 2, 2, 3);
        ctx.fillRect(cx + Math.floor(bearTorsoW / 2) + bearArmW, a.shoulderY + a.walk.armR + 6, 2, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, cx - Math.floor(bearTorsoW / 2) - bearArmW, a.shoulderY + a.walk.armL, bearArmW, bearArmH, colors.skin, colors.outline);
        _drawSoftShading(ctx, cx - Math.floor(bearTorsoW / 2) - bearArmW, a.shoulderY + a.walk.armL, bearArmW, bearArmH, colors.mid);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - Math.floor(bearTorsoW / 2) - bearArmW - 2, a.shoulderY + a.walk.armL + 2, 2, 3);
        ctx.fillRect(cx - Math.floor(bearTorsoW / 2) - bearArmW - 2, a.shoulderY + a.walk.armL + 6, 2, 2);
    }

    // --- Heavy-set legs (thick, wide) ---
    const legLX = Math.floor(cx - bearLegW - 2);
    const legRX = Math.floor(cx + 2);
    _drawRoundedRect(ctx, legLX, a.legsTopY + a.walk.legL, bearLegW, bearLegH, colors.skin, colors.outline);
    _drawSoftShading(ctx, legLX, a.legsTopY + a.walk.legL, bearLegW, bearLegH, colors.mid);
    _drawRoundedRect(ctx, legRX, a.legsTopY + a.walk.legR, bearLegW, bearLegH, colors.skin, colors.outline);
    _drawSoftShading(ctx, legRX, a.legsTopY + a.walk.legR, bearLegW, bearLegH, colors.mid);

    // --- Big flat paw feet with toe beans (NO shoes) ---
    const pawFeetW = bearLegW + 4;
    const feetLY = a.legsTopY + a.walk.legL + bearLegH - 1;
    const feetRY = a.legsTopY + a.walk.legR + bearLegH - 1;
    // Dark paw base
    ctx.fillStyle = '#332211';
    ctx.fillRect(legLX - 2, feetLY, pawFeetW, 4);
    ctx.fillRect(legRX - 2, feetRY, pawFeetW, 4);
    // Toe beans (pink pads — 4 toes)
    ctx.fillStyle = '#cc8899';
    ctx.fillRect(legLX - 1, feetLY + 3, 2, 2);
    ctx.fillRect(legLX + 2, feetLY + 3, 2, 2);
    ctx.fillRect(legLX + 5, feetLY + 3, 2, 2);
    ctx.fillRect(legLX + 8, feetLY + 3, 2, 2);
    ctx.fillRect(legRX - 1, feetRY + 3, 2, 2);
    ctx.fillRect(legRX + 2, feetRY + 3, 2, 2);
    ctx.fillRect(legRX + 5, feetRY + 3, 2, 2);
    ctx.fillRect(legRX + 8, feetRY + 3, 2, 2);
    // Main pad
    ctx.fillStyle = '#dd99aa';
    ctx.fillRect(legLX + 1, feetLY + 1, 6, 2);
    ctx.fillRect(legRX + 1, feetRY + 1, 6, 2);

    // --- Wide stocky torso with slight hunch ---
    const torsoYAdj = a.torsoY + a.walk.bob + 1; // Slightly lowered = hunched
    _drawRoundedRect(ctx, bearTorsoX, torsoYAdj, bearTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, bearTorsoX, torsoYAdj, bearTorsoW, a.torsoH, colors.mid);
    // Prominent lighter belly patch (cream/beige oval)
    ctx.fillStyle = bellyColor;
    ctx.fillRect(cx - 6, torsoYAdj + 1, 12, a.torsoH - 2);
    ctx.fillRect(cx - 5, torsoYAdj, 10, a.torsoH);
    // Fur fringe on torso edges (jagged silhouette)
    ctx.fillStyle = colors.skin;
    ctx.fillRect(bearTorsoX - 1, torsoYAdj + 2, 2, 2);
    ctx.fillRect(bearTorsoX - 1, torsoYAdj + 5, 2, 3);
    ctx.fillRect(bearTorsoX + bearTorsoW - 1, torsoYAdj + 1, 2, 3);
    ctx.fillRect(bearTorsoX + bearTorsoW - 1, torsoYAdj + 5, 2, 2);

    // --- Bear head ---
    _drawRoundedRect(ctx, bearHeadX, a.headY, bearHeadW, bearHeadH, colors.skin, colors.outline);
    _drawSoftShading(ctx, bearHeadX, a.headY, bearHeadW, bearHeadH, colors.mid);

    // --- Large rounded ears (direction-aware visibility) ---
    // Left ear (hidden when facing RIGHT, no pink when facing UP)
    if (dir !== DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(bearHeadX - 5, a.headY - 6, 11, 11);
        ctx.fillRect(bearHeadX - 4, a.headY - 7, 9, 1);
        ctx.fillRect(bearHeadX - 4, a.headY + 5, 9, 1);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(bearHeadX - 5, a.headY - 7, 11, 1);
        ctx.fillRect(bearHeadX - 6, a.headY - 5, 1, 9);
        if (dir !== DIR_UP) {
            ctx.fillStyle = '#dd8899';
            ctx.fillRect(bearHeadX - 2, a.headY - 4, 7, 7);
        }
    }
    // Right ear (hidden when facing LEFT, no pink when facing UP)
    if (dir !== DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(bearHeadX + bearHeadW - 6, a.headY - 6, 11, 11);
        ctx.fillRect(bearHeadX + bearHeadW - 5, a.headY - 7, 9, 1);
        ctx.fillRect(bearHeadX + bearHeadW - 5, a.headY + 5, 9, 1);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(bearHeadX + bearHeadW - 6, a.headY - 7, 11, 1);
        ctx.fillRect(bearHeadX + bearHeadW + 5, a.headY - 5, 1, 9);
        if (dir !== DIR_UP) {
            ctx.fillStyle = '#dd8899';
            ctx.fillRect(bearHeadX + bearHeadW - 5, a.headY - 4, 7, 7);
        }
    }

    // --- Face ---
    if (dir !== DIR_UP) {
        // Small beady eyes (bears have small eyes relative to head)
        const eyeY = a.headY + Math.floor(bearHeadH * 0.3);
        ctx.fillStyle = '#111';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 8, eyeY, 3, 3);
            ctx.fillRect(cx + 6, eyeY, 3, 3);
            // Tiny highlight
            ctx.fillStyle = '#555';
            ctx.fillRect(cx - 8, eyeY, 1, 1);
            ctx.fillRect(cx + 6, eyeY, 1, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 5 : cx - 7;
            ctx.fillRect(ex, eyeY, 3, 3);
            ctx.fillStyle = '#555';
            ctx.fillRect(ex, eyeY, 1, 1);
        }

        // Prominent rounded muzzle with big wet black nose
        if (dir === DIR_DOWN) {
            // Muzzle bump (lighter cream)
            ctx.fillStyle = bellyColor;
            ctx.fillRect(cx - 6, a.headY + bearHeadH - 10, 12, 8);
            ctx.fillRect(cx - 5, a.headY + bearHeadH - 11, 10, 1);
            // Big wet black nose (prominent)
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 4, a.headY + bearHeadH - 9, 8, 5);
            ctx.fillRect(cx - 3, a.headY + bearHeadH - 10, 6, 1);
            // Nose highlight (wet sheen)
            ctx.fillStyle = '#555';
            ctx.fillRect(cx - 3, a.headY + bearHeadH - 9, 3, 2);
            ctx.fillStyle = '#888';
            ctx.fillRect(cx - 2, a.headY + bearHeadH - 9, 1, 1);
            // Bear mouth (simple W below nose)
            ctx.fillStyle = '#111';
            ctx.fillRect(cx, a.headY + bearHeadH - 4, 1, 2);
            ctx.fillRect(cx - 2, a.headY + bearHeadH - 3, 1, 1);
            ctx.fillRect(cx + 2, a.headY + bearHeadH - 3, 1, 1);
        } else if (dir === DIR_LEFT) {
            ctx.fillStyle = bellyColor;
            ctx.fillRect(bearHeadX - 2, a.headY + bearHeadH - 9, 8, 7);
            ctx.fillStyle = '#111';
            ctx.fillRect(bearHeadX - 4, a.headY + bearHeadH - 8, 4, 4);
            ctx.fillStyle = '#555';
            ctx.fillRect(bearHeadX - 3, a.headY + bearHeadH - 8, 2, 2);
        } else if (dir === DIR_RIGHT) {
            ctx.fillStyle = bellyColor;
            ctx.fillRect(bearHeadX + bearHeadW - 6, a.headY + bearHeadH - 9, 8, 7);
            ctx.fillStyle = '#111';
            ctx.fillRect(bearHeadX + bearHeadW, a.headY + bearHeadH - 8, 4, 4);
            ctx.fillStyle = '#555';
            ctx.fillRect(bearHeadX + bearHeadW + 1, a.headY + bearHeadH - 8, 2, 2);
        }
    }

    // --- Front arms (thick, with fur fringe) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, cx + Math.floor(bearTorsoW / 2), a.shoulderY + a.walk.armR, bearArmW, bearArmH, colors.skin, colors.outline);
        _drawSoftShading(ctx, cx + Math.floor(bearTorsoW / 2), a.shoulderY + a.walk.armR, bearArmW, bearArmH, colors.mid);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx + Math.floor(bearTorsoW / 2) + bearArmW, a.shoulderY + a.walk.armR + 2, 2, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, cx - Math.floor(bearTorsoW / 2) - bearArmW, a.shoulderY + a.walk.armL, bearArmW, bearArmH, colors.skin, colors.outline);
        _drawSoftShading(ctx, cx - Math.floor(bearTorsoW / 2) - bearArmW, a.shoulderY + a.walk.armL, bearArmW, bearArmH, colors.mid);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - Math.floor(bearTorsoW / 2) - bearArmW - 2, a.shoulderY + a.walk.armL + 2, 2, 3);
    }

    // --- Big paw hands at arm ends (drawn AFTER arms so they're visible) ---
    if (dir !== DIR_UP) {
        const pawHandW = bearArmW + 2;
        const lArmX = cx - Math.floor(bearTorsoW / 2) - bearArmW;
        const rArmX = cx + Math.floor(bearTorsoW / 2);
        // Left paw
        ctx.fillStyle = '#332211';
        ctx.fillRect(lArmX - 1, a.shoulderY + a.walk.armL + bearArmH - 1, pawHandW, 4);
        ctx.fillStyle = '#cc8899';
        ctx.fillRect(lArmX, a.shoulderY + a.walk.armL + bearArmH + 1, 3, 2);
        ctx.fillRect(lArmX + 4, a.shoulderY + a.walk.armL + bearArmH + 1, 3, 2);
        // Right paw
        ctx.fillStyle = '#332211';
        ctx.fillRect(rArmX - 1, a.shoulderY + a.walk.armR + bearArmH - 1, pawHandW, 4);
        ctx.fillStyle = '#cc8899';
        ctx.fillRect(rArmX, a.shoulderY + a.walk.armR + bearArmH + 1, 3, 2);
        ctx.fillRect(rArmX + 4, a.shoulderY + a.walk.armR + bearArmH + 1, 3, 2);
    }
}

// ── Race 3: Bird man ────────────────────────────────────────────────────────
function _drawBirdman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    // Bird is slimmer and lighter than standard
    const birdTorsoW = a.torsoW - 2;
    const birdTorsoX = Math.floor(cx - birdTorsoW / 2);
    const birdLegW = a.legW - 1;
    const beakColor = '#ddaa44';
    const beakDark = '#bb8833';

    // --- Wing-arms (large feathered wings instead of arms) — back wings first ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        // Right wing (back)
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR, a.armW + 4, a.armH + 2);
        ctx.fillRect(a.rightArmX + a.armW + 2, a.shoulderY + a.walk.armR + 2, 4, a.armH - 2);
        ctx.fillRect(a.rightArmX + a.armW + 5, a.shoulderY + a.walk.armR + 4, 3, a.armH - 5);
        // Feather texture (layered barbs)
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + 3, a.armW + 3, 1);
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + 6, a.armW + 5, 1);
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + 9, a.armW + 3, 1);
        // Wing outline
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.rightArmX + a.armW + 7, a.shoulderY + a.walk.armR + 5, 1, a.armH - 6);
        // Primary flight feathers at wing tip
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.rightArmX + a.armW + 2, a.shoulderY + a.walk.armR + a.armH, 3, 3);
        ctx.fillRect(a.rightArmX + a.armW + 4, a.shoulderY + a.walk.armR + a.armH + 1, 3, 3);
        ctx.fillRect(a.rightArmX + a.armW + 6, a.shoulderY + a.walk.armR + a.armH, 2, 4);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        // Left wing (back)
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.leftArmX - 3, a.shoulderY + a.walk.armL, a.armW + 4, a.armH + 2);
        ctx.fillRect(a.leftArmX - 7, a.shoulderY + a.walk.armL + 2, 4, a.armH - 2);
        ctx.fillRect(a.leftArmX - 10, a.shoulderY + a.walk.armL + 4, 3, a.armH - 5);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.leftArmX - 6, a.shoulderY + a.walk.armL + 3, a.armW + 5, 1);
        ctx.fillRect(a.leftArmX - 8, a.shoulderY + a.walk.armL + 6, a.armW + 6, 1);
        ctx.fillRect(a.leftArmX - 6, a.shoulderY + a.walk.armL + 9, a.armW + 4, 1);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.leftArmX - 10, a.shoulderY + a.walk.armL + 5, 1, a.armH - 6);
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.leftArmX - 7, a.shoulderY + a.walk.armL + a.armH, 3, 3);
        ctx.fillRect(a.leftArmX - 9, a.shoulderY + a.walk.armL + a.armH + 1, 3, 3);
        ctx.fillRect(a.leftArmX - 10, a.shoulderY + a.walk.armL + a.armH, 2, 4);
    }
    // When facing up, show large folded wing silhouette on back
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(birdTorsoX - 6, a.shoulderY - 1, birdTorsoW + 12, a.torsoH + 4);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(birdTorsoX - 4, a.shoulderY + 1, 3, a.torsoH);
        ctx.fillRect(birdTorsoX + birdTorsoW + 1, a.shoulderY + 1, 3, a.torsoH);
        // Wing fold lines
        ctx.fillStyle = colors.outline;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(birdTorsoX - 2, a.shoulderY + 2, 1, a.torsoH - 2);
        ctx.fillRect(birdTorsoX + birdTorsoW + 1, a.shoulderY + 2, 1, a.torsoH - 2);
        ctx.globalAlpha = 1.0;
    }

    // --- Slim bird legs (thin, scaly) ---
    const legLX = Math.floor(cx - birdLegW - 1);
    const legRX = Math.floor(cx + 1);
    _drawOutlinedRect(ctx, legLX, a.legsTopY + a.walk.legL, birdLegW, a.legH, colors.skin, colors.outline);
    _drawOutlinedRect(ctx, legRX, a.legsTopY + a.walk.legR, birdLegW, a.legH, colors.skin, colors.outline);
    // Scaly texture (horizontal lines on legs)
    ctx.fillStyle = colors.outline;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(legLX + 1, a.legsTopY + a.walk.legL + 2, birdLegW - 2, 1);
    ctx.fillRect(legLX + 1, a.legsTopY + a.walk.legL + 4, birdLegW - 2, 1);
    ctx.fillRect(legRX + 1, a.legsTopY + a.walk.legR + 2, birdLegW - 2, 1);
    ctx.fillRect(legRX + 1, a.legsTopY + a.walk.legR + 4, birdLegW - 2, 1);
    ctx.globalAlpha = 1.0;

    // --- Raptor talons (3-toed claws, NO shoes) ---
    const talonColor = '#bbaa44';
    const feetLY = a.legsTopY + a.walk.legL + a.legH - 1;
    const feetRY = a.legsTopY + a.walk.legR + a.legH - 1;
    ctx.fillStyle = talonColor;
    // Left foot — 3 forward toes
    ctx.fillRect(legLX - 3, feetLY, 3, 3);
    ctx.fillRect(legLX + Math.floor(birdLegW / 2) - 1, feetLY, 3, 4);
    ctx.fillRect(legLX + birdLegW, feetLY, 3, 3);
    // Claw tips
    ctx.fillStyle = colors.outline;
    ctx.fillRect(legLX - 3, feetLY + 3, 1, 1);
    ctx.fillRect(legLX + Math.floor(birdLegW / 2), feetLY + 4, 1, 1);
    ctx.fillRect(legLX + birdLegW + 2, feetLY + 3, 1, 1);
    // Right foot
    ctx.fillStyle = talonColor;
    ctx.fillRect(legRX - 3, feetRY, 3, 3);
    ctx.fillRect(legRX + Math.floor(birdLegW / 2) - 1, feetRY, 3, 4);
    ctx.fillRect(legRX + birdLegW, feetRY, 3, 3);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(legRX - 3, feetRY + 3, 1, 1);
    ctx.fillRect(legRX + Math.floor(birdLegW / 2), feetRY + 4, 1, 1);
    ctx.fillRect(legRX + birdLegW + 2, feetRY + 3, 1, 1);

    // --- Tail feathers (visible from all angles) ---
    if (dir === DIR_UP || dir === DIR_LEFT || dir === DIR_RIGHT) {
        const tailDir = dir === DIR_UP ? 0 : dir;
        const tailX = dir === DIR_UP ? cx - 5 : (dir === DIR_LEFT ? cx + 3 : cx - 8);
        const tailY = a.torsoY + a.torsoH - 1 + a.walk.bob;
        ctx.fillStyle = colors.hair;
        ctx.fillRect(tailX, tailY, 10, 4);
        ctx.fillRect(tailX + 1, tailY + 4, 8, 3);
        ctx.fillRect(tailX + 2, tailY + 7, 6, 2);
        // Feather lines
        ctx.fillStyle = colors.mid;
        ctx.fillRect(tailX + 3, tailY + 1, 1, 5);
        ctx.fillRect(tailX + 6, tailY + 1, 1, 5);
    }
    if (dir === DIR_DOWN) {
        // Small tail peek below torso
        ctx.fillStyle = colors.hair;
        ctx.fillRect(cx - 3, a.torsoY + a.torsoH + a.walk.bob, 6, 3);
        ctx.fillRect(cx - 2, a.torsoY + a.torsoH + a.walk.bob + 3, 4, 2);
    }

    // --- Slim feathered torso ---
    _drawRoundedRect(ctx, birdTorsoX, a.torsoY + a.walk.bob, birdTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, birdTorsoX, a.torsoY + a.walk.bob, birdTorsoW, a.torsoH, colors.mid);
    // Feather overlay texture on torso (breast feathers)
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(birdTorsoX + 2, a.torsoY + a.walk.bob + 2, birdTorsoW - 4, 1);
    ctx.fillRect(birdTorsoX + 3, a.torsoY + a.walk.bob + 4, birdTorsoW - 6, 1);
    ctx.fillRect(birdTorsoX + 2, a.torsoY + a.walk.bob + 6, birdTorsoW - 4, 1);
    ctx.globalAlpha = 1.0;

    // --- Bird head with feather covering ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);
    // Feather texture on head
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(a.headX + 3, a.headY + 3, a.headW - 6, 1);
    ctx.fillRect(a.headX + 4, a.headY + 6, a.headW - 8, 1);
    ctx.globalAlpha = 1.0;

    // --- Feathered crest/plumage on top (instead of hair) ---
    ctx.fillStyle = colors.hair;
    // Three tall plume feathers
    ctx.fillRect(cx - 5, a.headY - 8, 4, 8);
    ctx.fillRect(cx - 4, a.headY - 11, 3, 4);
    ctx.fillRect(cx - 1, a.headY - 14, 4, 14);
    ctx.fillRect(cx, a.headY - 17, 3, 4);
    ctx.fillRect(cx + 3, a.headY - 10, 4, 10);
    ctx.fillRect(cx + 4, a.headY - 12, 3, 3);
    // Plume highlight
    ctx.fillStyle = colors.mid || colors.hair;
    ctx.fillRect(cx, a.headY - 15, 2, 6);
    ctx.fillRect(cx - 3, a.headY - 9, 2, 4);
    // Plume outline tips
    ctx.fillStyle = colors.outline;
    ctx.fillRect(cx + 1, a.headY - 18, 1, 2);
    ctx.fillRect(cx - 3, a.headY - 12, 1, 2);
    ctx.fillRect(cx + 5, a.headY - 13, 1, 2);

    // --- Large alert bird eyes (round, with visible iris ring) ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.25);
        if (dir === DIR_DOWN) {
            // Left eye — large round with iris ring
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 10, eyeY, 7, 7);
            ctx.fillRect(cx - 9, eyeY - 1, 5, 1);
            ctx.fillRect(cx - 9, eyeY + 7, 5, 1);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 9, eyeY + 1, 5, 5);
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 8, eyeY + 2, 3, 3);
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 9, eyeY + 1, 2, 2);
            // Right eye
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx + 4, eyeY, 7, 7);
            ctx.fillRect(cx + 5, eyeY - 1, 5, 1);
            ctx.fillRect(cx + 5, eyeY + 7, 5, 1);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx + 5, eyeY + 1, 5, 5);
            ctx.fillStyle = '#111';
            ctx.fillRect(cx + 6, eyeY + 2, 3, 3);
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx + 5, eyeY + 1, 2, 2);
        } else {
            // Side view — one large eye
            const ex = dir === DIR_RIGHT ? cx + 4 : cx - 10;
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex, eyeY, 7, 7);
            ctx.fillRect(ex + 1, eyeY - 1, 5, 1);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 1, eyeY + 1, 5, 5);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex + 2, eyeY + 2, 3, 3);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
        }
    }

    // --- Sharp raptor beak (prominent, colored) ---
    if (dir === DIR_DOWN) {
        const beakTop = a.headY + Math.floor(a.headH * 0.5);
        ctx.fillStyle = beakColor;
        ctx.fillRect(cx - 4, beakTop, 8, 5);
        ctx.fillRect(cx - 3, beakTop + 5, 6, 3);
        ctx.fillRect(cx - 2, beakTop + 8, 4, 2);
        // Beak seam line
        ctx.fillStyle = beakDark;
        ctx.fillRect(cx - 3, beakTop + 3, 6, 1);
        // Nostril dots
        ctx.fillStyle = '#997722';
        ctx.fillRect(cx - 2, beakTop + 1, 1, 1);
        ctx.fillRect(cx + 2, beakTop + 1, 1, 1);
        // Beak tip (darker)
        ctx.fillStyle = beakDark;
        ctx.fillRect(cx - 1, beakTop + 9, 2, 1);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = beakColor;
        ctx.fillRect(a.headX - 10, a.headY + Math.floor(a.headH * 0.35), 11, 5);
        ctx.fillRect(a.headX - 12, a.headY + Math.floor(a.headH * 0.35) + 1, 3, 3);
        ctx.fillRect(a.headX - 14, a.headY + Math.floor(a.headH * 0.35) + 2, 2, 1);
        ctx.fillStyle = beakDark;
        ctx.fillRect(a.headX - 10, a.headY + Math.floor(a.headH * 0.35) + 2, 10, 1);
        ctx.fillRect(a.headX - 14, a.headY + Math.floor(a.headH * 0.35) + 2, 2, 1);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = beakColor;
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.35), 11, 5);
        ctx.fillRect(a.headX + a.headW + 10, a.headY + Math.floor(a.headH * 0.35) + 1, 3, 3);
        ctx.fillRect(a.headX + a.headW + 13, a.headY + Math.floor(a.headH * 0.35) + 2, 2, 1);
        ctx.fillStyle = beakDark;
        ctx.fillRect(a.headX + a.headW + 1, a.headY + Math.floor(a.headH * 0.35) + 2, 10, 1);
        ctx.fillRect(a.headX + a.headW + 13, a.headY + Math.floor(a.headH * 0.35) + 2, 2, 1);
    }

    // --- Front wing-arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR, a.armW + 4, a.armH + 2);
        ctx.fillRect(a.rightArmX + a.armW + 2, a.shoulderY + a.walk.armR + 2, 4, a.armH - 2);
        ctx.fillRect(a.rightArmX + a.armW + 5, a.shoulderY + a.walk.armR + 4, 3, a.armH - 5);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + 3, a.armW + 3, 1);
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + 6, a.armW + 5, 1);
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.rightArmX + a.armW + 2, a.shoulderY + a.walk.armR + a.armH, 3, 3);
        ctx.fillRect(a.rightArmX + a.armW + 4, a.shoulderY + a.walk.armR + a.armH + 1, 3, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.leftArmX - 3, a.shoulderY + a.walk.armL, a.armW + 4, a.armH + 2);
        ctx.fillRect(a.leftArmX - 7, a.shoulderY + a.walk.armL + 2, 4, a.armH - 2);
        ctx.fillRect(a.leftArmX - 10, a.shoulderY + a.walk.armL + 4, 3, a.armH - 5);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.leftArmX - 6, a.shoulderY + a.walk.armL + 3, a.armW + 5, 1);
        ctx.fillRect(a.leftArmX - 8, a.shoulderY + a.walk.armL + 6, a.armW + 6, 1);
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.leftArmX - 7, a.shoulderY + a.walk.armL + a.armH, 3, 3);
        ctx.fillRect(a.leftArmX - 9, a.shoulderY + a.walk.armL + a.armH + 1, 3, 3);
    }
}

// ── Race 4: Demon ───────────────────────────────────────────────────────────
function _drawDemon(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    // Demon is muscular, slightly larger than standard
    const demonTorsoW = a.torsoW + 4;
    const demonTorsoX = Math.floor(cx - demonTorsoW / 2);
    const demonArmW = a.armW + 2;
    const demonArmH = a.armH + 1;
    const hornColor = '#554433';
    const hornLight = '#776655';
    const hoofColor = '#332222';

    // --- Bat-like wings on back (visible from behind and sides) ---
    if (dir === DIR_UP) {
        // Large unfolded bat wings from back
        ctx.fillStyle = colors.outline;
        // Left wing
        ctx.fillRect(demonTorsoX - 8, a.shoulderY - 4, 10, 10);
        ctx.fillRect(demonTorsoX - 12, a.shoulderY - 6, 6, 8);
        ctx.fillRect(demonTorsoX - 15, a.shoulderY - 4, 4, 6);
        // Wing membrane (darker skin)
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(demonTorsoX - 11, a.shoulderY - 3, 8, 6);
        ctx.globalAlpha = 1.0;
        // Wing bones
        ctx.fillStyle = colors.outline;
        ctx.fillRect(demonTorsoX - 13, a.shoulderY - 5, 1, 8);
        ctx.fillRect(demonTorsoX - 10, a.shoulderY - 3, 1, 6);
        // Right wing
        ctx.fillStyle = colors.outline;
        ctx.fillRect(demonTorsoX + demonTorsoW - 2, a.shoulderY - 4, 10, 10);
        ctx.fillRect(demonTorsoX + demonTorsoW + 6, a.shoulderY - 6, 6, 8);
        ctx.fillRect(demonTorsoX + demonTorsoW + 11, a.shoulderY - 4, 4, 6);
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(demonTorsoX + demonTorsoW + 3, a.shoulderY - 3, 8, 6);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = colors.outline;
        ctx.fillRect(demonTorsoX + demonTorsoW + 9, a.shoulderY - 3, 1, 6);
        ctx.fillRect(demonTorsoX + demonTorsoW + 12, a.shoulderY - 5, 1, 8);
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        // Folded wing visible on the back side
        const wingX = dir === DIR_LEFT ? cx + Math.floor(demonTorsoW / 2) : cx - Math.floor(demonTorsoW / 2) - 8;
        ctx.fillStyle = colors.outline;
        ctx.fillRect(wingX, a.shoulderY - 2, 8, 8);
        ctx.fillRect(wingX + 2, a.shoulderY - 4, 5, 3);
        ctx.fillRect(wingX + 4, a.shoulderY - 6, 3, 3);
        // Wing membrane hint
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(wingX + 1, a.shoulderY, 6, 5);
        ctx.globalAlpha = 1.0;
    } else if (dir === DIR_DOWN) {
        // Small folded wing tips peeking above shoulders
        ctx.fillStyle = colors.outline;
        ctx.fillRect(demonTorsoX - 3, a.shoulderY - 2, 4, 5);
        ctx.fillRect(demonTorsoX - 5, a.shoulderY - 4, 3, 4);
        ctx.fillRect(demonTorsoX - 6, a.shoulderY - 3, 2, 2);
        ctx.fillRect(demonTorsoX + demonTorsoW - 1, a.shoulderY - 2, 4, 5);
        ctx.fillRect(demonTorsoX + demonTorsoW + 2, a.shoulderY - 4, 3, 4);
        ctx.fillRect(demonTorsoX + demonTorsoW + 4, a.shoulderY - 3, 2, 2);
    }

    // --- Back muscular arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, demonArmW, demonArmH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, demonArmW, demonArmH, colors.mid);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, demonArmW, demonArmH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, demonArmW, demonArmH, colors.mid);
    }

    // --- Digitigrade legs with cloven hooves ---
    // Upper leg (thicker)
    _drawRoundedRect(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, Math.floor(a.legH * 0.55), colors.skin, colors.outline);
    _drawRoundedRect(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, Math.floor(a.legH * 0.55), colors.skin, colors.outline);
    // Lower leg (thinner, angled for digitigrade look)
    const lowerLegY = a.legsTopY + Math.floor(a.legH * 0.5);
    _drawOutlinedRect(ctx, a.leftLegX + 1, lowerLegY + a.walk.legL, a.legW - 2, a.legH - Math.floor(a.legH * 0.5), colors.skin, colors.outline);
    _drawOutlinedRect(ctx, a.rightLegX + 1, lowerLegY + a.walk.legR, a.legW - 2, a.legH - Math.floor(a.legH * 0.5), colors.skin, colors.outline);
    // Cloven hooves (large, split)
    ctx.fillStyle = hoofColor;
    const hLY = a.legsTopY + a.walk.legL + a.legH - 2;
    const hRY = a.legsTopY + a.walk.legR + a.legH - 2;
    ctx.fillRect(a.leftLegX - 1, hLY, a.legW + 2, 4);
    ctx.fillRect(a.rightLegX - 1, hRY, a.legW + 2, 4);
    // Hoof split
    ctx.fillStyle = '#111';
    ctx.fillRect(a.leftLegX + Math.floor(a.legW / 2), hLY, 1, 4);
    ctx.fillRect(a.rightLegX + Math.floor(a.legW / 2), hRY, 1, 4);
    // Hoof highlight
    ctx.fillStyle = '#554444';
    ctx.fillRect(a.leftLegX, hLY, a.legW / 2 - 1, 1);
    ctx.fillRect(a.rightLegX, hRY, a.legW / 2 - 1, 1);

    // --- Spiked tail with spade tip (visible from side/back) ---
    if (dir === DIR_LEFT || dir === DIR_RIGHT || dir === DIR_UP) {
        const tailDir = dir === DIR_UP ? DIR_LEFT : dir;
        const tailSign = tailDir === DIR_LEFT ? 1 : -1;
        const tailBaseX = tailDir === DIR_LEFT ? cx + Math.floor(demonTorsoW / 2) + 1 : cx - Math.floor(demonTorsoW / 2) - 4;
        const tailBaseY = a.torsoY + a.torsoH - 3 + a.walk.bob;
        // Thick spiked tail
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tailBaseX, tailBaseY, 3, 2);
        ctx.fillRect(tailBaseX + tailSign * 3, tailBaseY + 1, 3, 2);
        ctx.fillRect(tailBaseX + tailSign * 5, tailBaseY, 3, 2);
        ctx.fillRect(tailBaseX + tailSign * 7, tailBaseY - 1, 3, 2);
        // Spade/arrow tip (filled diamond shape)
        ctx.fillStyle = colors.outline;
        const tipX = tailBaseX + tailSign * 9;
        ctx.fillRect(tipX, tailBaseY - 3, 5, 5);
        ctx.fillRect(tipX + 1, tailBaseY - 4, 3, 1);
        ctx.fillRect(tipX + 1, tailBaseY + 2, 3, 1);
        ctx.fillRect(tipX + 2, tailBaseY - 5, 1, 1);
        ctx.fillRect(tipX + 2, tailBaseY + 3, 1, 1);
    }

    // --- Muscular torso with shoulder spikes ---
    _drawRoundedRect(ctx, demonTorsoX, a.torsoY + a.walk.bob, demonTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawShading(ctx, demonTorsoX, a.torsoY + a.walk.bob, demonTorsoW, a.torsoH, colors.mid);
    // Darker leathery skin texture lines
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(demonTorsoX + 2, a.torsoY + a.walk.bob + 3, demonTorsoW - 4, 1);
    ctx.fillRect(demonTorsoX + 3, a.torsoY + a.walk.bob + 6, demonTorsoW - 6, 1);
    ctx.globalAlpha = 1.0;
    // Shoulder bone spikes/protrusions
    ctx.fillStyle = hornColor;
    if (dir !== DIR_UP) {
        ctx.fillRect(demonTorsoX - 2, a.shoulderY + a.walk.bob, 3, 3);
        ctx.fillRect(demonTorsoX - 3, a.shoulderY + a.walk.bob - 1, 2, 2);
        ctx.fillRect(demonTorsoX + demonTorsoW - 1, a.shoulderY + a.walk.bob, 3, 3);
        ctx.fillRect(demonTorsoX + demonTorsoW + 1, a.shoulderY + a.walk.bob - 1, 2, 2);
    }

    // --- Demon head (angular, menacing) ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // --- Forehead third-eye gem ---
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.eye;
        ctx.fillRect(cx - 2, a.headY + 3, 4, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 1, a.headY + 3, 2, 1);
    }

    // --- Large curved ram-like horns (properly shaped with ridges) ---
    ctx.fillStyle = hornColor;
    if (dir !== DIR_UP) {
        // Left horn — curving outward and upward (ram-like spiral)
        ctx.fillRect(a.headX - 1, a.headY - 3, 5, 3);
        ctx.fillRect(a.headX - 4, a.headY - 7, 5, 5);
        ctx.fillRect(a.headX - 6, a.headY - 11, 4, 5);
        ctx.fillRect(a.headX - 5, a.headY - 14, 3, 4);
        ctx.fillRect(a.headX - 3, a.headY - 16, 3, 3);
        ctx.fillRect(a.headX, a.headY - 15, 3, 3);
        // Right horn — mirror
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 3, 5, 3);
        ctx.fillRect(a.headX + a.headW - 1, a.headY - 7, 5, 5);
        ctx.fillRect(a.headX + a.headW + 2, a.headY - 11, 4, 5);
        ctx.fillRect(a.headX + a.headW + 2, a.headY - 14, 3, 4);
        ctx.fillRect(a.headX + a.headW, a.headY - 16, 3, 3);
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 15, 3, 3);
        // Horn ridge rings
        ctx.fillStyle = hornLight;
        ctx.fillRect(a.headX - 3, a.headY - 5, 3, 1);
        ctx.fillRect(a.headX - 5, a.headY - 9, 3, 1);
        ctx.fillRect(a.headX - 4, a.headY - 13, 2, 1);
        ctx.fillRect(a.headX + a.headW, a.headY - 5, 3, 1);
        ctx.fillRect(a.headX + a.headW + 2, a.headY - 9, 3, 1);
        ctx.fillRect(a.headX + a.headW + 2, a.headY - 13, 2, 1);
    } else {
        // Back of horns
        ctx.fillRect(a.headX - 3, a.headY - 5, 5, 5);
        ctx.fillRect(a.headX - 5, a.headY - 10, 4, 6);
        ctx.fillRect(a.headX + a.headW - 2, a.headY - 5, 5, 5);
        ctx.fillRect(a.headX + a.headW + 1, a.headY - 10, 4, 6);
    }

    // --- Glowing narrow eye slits (menacing, NOT dots) ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            // Narrow menacing eyes — wider than tall, glowing
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 10, eyeY + 1, 7, 3);
            ctx.fillRect(cx + 4, eyeY + 1, 7, 3);
            // Glow halo
            ctx.fillStyle = colors.eye;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(cx - 11, eyeY, 9, 5);
            ctx.fillRect(cx + 3, eyeY, 9, 5);
            ctx.globalAlpha = 1.0;
            // Dark slit pupils (narrow vertical)
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 7, eyeY + 1, 1, 3);
            ctx.fillRect(cx + 7, eyeY + 1, 1, 3);
            // Angry brow ridge
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 10, eyeY - 1, 8, 2);
            ctx.fillRect(cx + 3, eyeY - 1, 8, 2);
            ctx.fillRect(cx - 11, eyeY, 2, 1);
            ctx.fillRect(cx + 10, eyeY, 2, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 9;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY + 1, 7, 3);
            ctx.fillStyle = colors.eye;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(ex - 1, eyeY, 9, 5);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#111';
            ctx.fillRect(ex + 3, eyeY + 1, 1, 3);
            ctx.fillStyle = colors.outline;
            ctx.fillRect(ex, eyeY - 1, 7, 2);
        }
        // Sharp teeth visible in mouth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 3, a.headY + a.headH - 5, 6, 3);
            // Fangs (white teeth)
            ctx.fillStyle = '#ddd';
            ctx.fillRect(cx - 3, a.headY + a.headH - 5, 1, 2);
            ctx.fillRect(cx - 1, a.headY + a.headH - 4, 1, 1);
            ctx.fillRect(cx + 1, a.headY + a.headH - 4, 1, 1);
            ctx.fillRect(cx + 3, a.headY + a.headH - 5, 1, 2);
        }
    }

    // --- Clawed hands (long nails at arm ends) ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#443322';
        // Left hand claws (3 prongs)
        ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + demonArmH, demonArmW + 2, 2);
        ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + demonArmH + 1, 1, 2);
        ctx.fillRect(a.leftArmX + 1, a.shoulderY + a.walk.armL + demonArmH + 1, 1, 2);
        ctx.fillRect(a.leftArmX + demonArmW, a.shoulderY + a.walk.armL + demonArmH + 1, 1, 2);
        // Right hand claws
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + demonArmH, demonArmW + 2, 2);
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + demonArmH + 1, 1, 2);
        ctx.fillRect(a.rightArmX + 3, a.shoulderY + a.walk.armR + demonArmH + 1, 1, 2);
        ctx.fillRect(a.rightArmX + demonArmW + 1, a.shoulderY + a.walk.armR + demonArmH + 1, 1, 2);
    }

    // --- Front muscular arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, demonArmW, demonArmH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, demonArmW, demonArmH, colors.mid);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, demonArmW, demonArmH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, demonArmW, demonArmH, colors.mid);
    }
}

// ── Race 5: Devil ───────────────────────────────────────────────────────────
function _drawDevil(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    // Devil: lean athletic trickster fiend — sinuous and mischievous
    const devilTorsoW = a.torsoW - 2;
    const devilTorsoX = Math.floor(cx - devilTorsoW / 2);
    const devilArmW = a.armW - 1;
    const devilLegW = a.legW - 1;
    const hornColor = '#776655';
    const hornLight = '#998877';
    const hoofColor = '#332222';
    const tunicR = Math.max(0, parseInt(colors.skin.slice(1, 3), 16) - 45);
    const tunicG = Math.max(0, parseInt(colors.skin.slice(3, 5), 16) - 45);
    const tunicB = Math.max(0, parseInt(colors.skin.slice(5, 7), 16) - 45);
    const tunicColor = `rgb(${tunicR},${tunicG},${tunicB})`;

    // --- Sinuous spade-tipped tail (visible from sides/back) ---
    if (dir === DIR_LEFT || dir === DIR_RIGHT || dir === DIR_UP) {
        const tailDir = dir === DIR_UP ? DIR_LEFT : dir;
        const ts = tailDir === DIR_LEFT ? 1 : -1;
        const tbx = tailDir === DIR_LEFT ? cx + Math.floor(devilTorsoW / 2) : cx - Math.floor(devilTorsoW / 2) - 2;
        const tby = a.torsoY + a.torsoH - 3 + a.walk.bob;
        // Slender sinuous tail curving up then down
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tbx, tby, 2, 2);
        ctx.fillRect(tbx + ts * 2, tby - 1, 2, 2);
        ctx.fillRect(tbx + ts * 4, tby - 3, 2, 2);
        ctx.fillRect(tbx + ts * 6, tby - 4, 2, 2);
        ctx.fillRect(tbx + ts * 7, tby - 3, 2, 2);
        ctx.fillRect(tbx + ts * 8, tby - 1, 2, 2);
        // Spade tip (diamond)
        ctx.fillStyle = colors.outline;
        const spX = tbx + ts * 9;
        ctx.fillRect(spX, tby - 2, 3, 3);
        ctx.fillRect(spX + 1, tby - 3, 1, 1);
        ctx.fillRect(spX + 1, tby + 1, 1, 1);
    }

    // --- Small bat wings (smaller than demon) ---
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(devilTorsoX - 3, a.shoulderY - 1, 5, 5);
        ctx.fillRect(devilTorsoX - 6, a.shoulderY - 2, 4, 3);
        ctx.fillRect(devilTorsoX + devilTorsoW - 2, a.shoulderY - 1, 5, 5);
        ctx.fillRect(devilTorsoX + devilTorsoW + 2, a.shoulderY - 2, 4, 3);
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(devilTorsoX - 4, a.shoulderY, 3, 3);
        ctx.fillRect(devilTorsoX + devilTorsoW, a.shoulderY, 3, 3);
        ctx.globalAlpha = 1.0;
    } else if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(devilTorsoX - 2, a.shoulderY, 3, 3);
        ctx.fillRect(devilTorsoX - 4, a.shoulderY - 1, 3, 2);
        ctx.fillRect(devilTorsoX + devilTorsoW - 1, a.shoulderY, 3, 3);
        ctx.fillRect(devilTorsoX + devilTorsoW + 1, a.shoulderY - 1, 3, 2);
    } else {
        const wX = dir === DIR_LEFT ? cx + Math.floor(devilTorsoW / 2) : cx - Math.floor(devilTorsoW / 2) - 5;
        ctx.fillStyle = colors.outline;
        ctx.fillRect(wX, a.shoulderY - 1, 5, 4);
        ctx.fillRect(wX + 1, a.shoulderY - 3, 3, 3);
    }

    // --- Back slim arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, devilArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, devilArmW, a.armH, colors.mid);
        // Elbow joint
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(a.rightArmX + 2, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.45), devilArmW - 2, 1);
        ctx.globalAlpha = 1.0;
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, devilArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, devilArmW, a.armH, colors.mid);
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(a.leftArmX + 2, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.45), devilArmW - 2, 1);
        ctx.globalAlpha = 1.0;
    }

    // --- Slim legs with cloven hooves ---
    const legLX = Math.floor(cx - devilLegW - 1);
    const legRX = Math.floor(cx + 1);
    _drawRoundedRect(ctx, legLX, a.legsTopY + a.walk.legL, devilLegW, a.legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, legLX, a.legsTopY + a.walk.legL, devilLegW, a.legH, colors.mid);
    _drawRoundedRect(ctx, legRX, a.legsTopY + a.walk.legR, devilLegW, a.legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, legRX, a.legsTopY + a.walk.legR, devilLegW, a.legH, colors.mid);
    // Cloven hooves
    const hLY = a.legsTopY + a.walk.legL + a.legH - 2;
    const hRY = a.legsTopY + a.walk.legR + a.legH - 2;
    ctx.fillStyle = hoofColor;
    ctx.fillRect(legLX - 1, hLY, devilLegW + 2, 3);
    ctx.fillRect(legRX - 1, hRY, devilLegW + 2, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(legLX - 1, hLY + 2, devilLegW + 2, 1);
    ctx.fillRect(legRX - 1, hRY + 2, devilLegW + 2, 1);
    // Hoof split
    ctx.fillRect(legLX + Math.floor(devilLegW / 2), hLY, 1, 3);
    ctx.fillRect(legRX + Math.floor(devilLegW / 2), hRY, 1, 3);

    // --- Lean torso with fitted vest ---
    _drawRoundedRect(ctx, devilTorsoX, a.torsoY + a.walk.bob, devilTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawShading(ctx, devilTorsoX, a.torsoY + a.walk.bob, devilTorsoW, a.torsoH, colors.mid);
    // Fitted dark vest overlay
    ctx.fillStyle = tunicColor;
    ctx.fillRect(devilTorsoX + 1, a.torsoY + a.walk.bob + 1, devilTorsoW - 2, a.torsoH - 2);
    // Vest lapel detail
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.outline;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob + 1, 2, Math.floor(a.torsoH * 0.4));
        ctx.globalAlpha = 1.0;
    }
    // Belt with buckle
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(devilTorsoX + 1, a.torsoY + a.walk.bob + a.torsoH - 4, devilTorsoW - 2, 3);
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(cx - 1, a.torsoY + a.walk.bob + a.torsoH - 4, 3, 3);

    // Neck
    ctx.fillStyle = colors.skin;
    ctx.fillRect(cx - 2, a.torsoY + a.walk.bob - 2, 4, 3);

    // --- Devil head (pointed chin shape) ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);
    // Pointed chin extension
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 2, a.headY + a.headH - 1, 4, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 3, a.headY + a.headH, 1, 1);
        ctx.fillRect(cx + 2, a.headY + a.headH, 1, 1);
    }

    // --- Pointed ears ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 3, a.headY + Math.floor(a.headH * 0.3), 4, 3);
        ctx.fillRect(a.headX - 6, a.headY + Math.floor(a.headH * 0.35), 4, 2);
        ctx.fillRect(a.headX - 8, a.headY + Math.floor(a.headH * 0.38), 3, 1);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX - 8, a.headY + Math.floor(a.headH * 0.38), 1, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW - 1, a.headY + Math.floor(a.headH * 0.3), 4, 3);
        ctx.fillRect(a.headX + a.headW + 2, a.headY + Math.floor(a.headH * 0.35), 4, 2);
        ctx.fillRect(a.headX + a.headW + 5, a.headY + Math.floor(a.headH * 0.38), 3, 1);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + a.headW + 7, a.headY + Math.floor(a.headH * 0.38), 1, 1);
    }

    // --- Sharply pointed thin horns (thinner than demon) ---
    ctx.fillStyle = hornColor;
    if (dir !== DIR_UP) {
        // Left horn — thin, sharply pointed upward
        ctx.fillRect(a.headX + 2, a.headY - 2, 2, 3);
        ctx.fillRect(a.headX + 1, a.headY - 5, 2, 4);
        ctx.fillRect(a.headX, a.headY - 8, 2, 4);
        ctx.fillRect(a.headX, a.headY - 10, 1, 3);
        // Right horn — mirror
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 2, 2, 3);
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 5, 2, 4);
        ctx.fillRect(a.headX + a.headW - 2, a.headY - 8, 2, 4);
        ctx.fillRect(a.headX + a.headW - 1, a.headY - 10, 1, 3);
        // Horn shine
        ctx.fillStyle = hornLight;
        ctx.fillRect(a.headX + 1, a.headY - 4, 1, 2);
        ctx.fillRect(a.headX + a.headW - 2, a.headY - 4, 1, 2);
    } else {
        ctx.fillRect(a.headX + 1, a.headY - 4, 2, 4);
        ctx.fillRect(a.headX, a.headY - 8, 2, 5);
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 4, 2, 4);
        ctx.fillRect(a.headX + a.headW - 2, a.headY - 8, 2, 5);
    }

    // --- Slitted cat-like eyes with glowing irises ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            // Glowing iris background
            ctx.fillStyle = colors.eye;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(cx - 8, eyeY, 6, 5);
            ctx.fillRect(cx + 3, eyeY, 6, 5);
            ctx.globalAlpha = 1.0;
            // Eye shape — narrow almond
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 7, eyeY + 1, 5, 3);
            ctx.fillRect(cx + 3, eyeY + 1, 5, 3);
            // Vertical slit pupil
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 5, eyeY + 1, 1, 3);
            ctx.fillRect(cx + 5, eyeY + 1, 1, 3);
            // Bright catchlight
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 7, eyeY + 1, 1, 1);
            ctx.fillRect(cx + 3, eyeY + 1, 1, 1);
            // Angled mischievous brow (raised outer edges)
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 7, eyeY - 1, 5, 1);
            ctx.fillRect(cx - 8, eyeY, 1, 1);
            ctx.fillRect(cx + 3, eyeY - 1, 5, 1);
            ctx.fillRect(cx + 8, eyeY, 1, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 7;
            ctx.fillStyle = colors.eye;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(ex - 1, eyeY, 6, 5);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY + 1, 5, 3);
            ctx.fillStyle = '#111111';
            ctx.fillRect(ex + 2, eyeY + 1, 1, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex, eyeY + 1, 1, 1);
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex, eyeY - 1, 5, 1);
        }

        // Mischievous grin with small fangs
        if (dir === DIR_DOWN) {
            const mouthY = a.headY + Math.floor(a.headH * 0.72);
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 3, mouthY, 7, 2);
            ctx.fillRect(cx + 4, mouthY - 1, 1, 1); // Smirk uptick
            // Small fangs
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(cx - 2, mouthY, 1, 2);
            ctx.fillRect(cx + 2, mouthY, 1, 2);
        }

        // Pointed goatee
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.hair;
            ctx.fillRect(cx - 1, a.headY + a.headH + 1, 3, 2);
            ctx.fillRect(cx, a.headY + a.headH + 3, 1, 2);
        }

        // Small nose
        _drawNose(ctx, cx, a.headY + Math.floor(a.headH * 0.55), dir);
    }

    // --- Clawed fingertips ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#443322';
        ctx.fillRect(a.leftArmX + 1, a.shoulderY + a.walk.armL + a.armH, devilArmW, 1);
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH + 1, 1, 2);
        ctx.fillRect(a.leftArmX + devilArmW, a.shoulderY + a.walk.armL + a.armH + 1, 1, 2);
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + a.armH, devilArmW, 1);
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + a.armH + 1, 1, 2);
        ctx.fillRect(a.rightArmX + devilArmW, a.shoulderY + a.walk.armR + a.armH + 1, 1, 2);
    }

    // --- Dark energy wisps around hands ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.eye;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH + 2, devilArmW + 2, 2);
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + a.armH + 2, devilArmW + 2, 2);
        ctx.globalAlpha = 1.0;
    }

    // --- Front slim arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, devilArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, devilArmW, a.armH, colors.mid);
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(a.rightArmX + 2, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.45), devilArmW - 2, 1);
        ctx.globalAlpha = 1.0;
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, devilArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, devilArmW, a.armH, colors.mid);
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(a.leftArmX + 2, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.45), devilArmW - 2, 1);
        ctx.globalAlpha = 1.0;
    }
}

// ── Race 6: Cat man ─────────────────────────────────────────────────────────
function _drawCatman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    // Cat: lithe agile feline warrior — narrower build with fur texture
    const catTorsoW = a.torsoW - 3;
    const catTorsoX = Math.floor(cx - catTorsoW / 2);
    const catArmW = a.armW - 1;
    const catLegW = a.legW - 1;
    // Fur pattern colors
    const stripeR = Math.max(0, parseInt(colors.skin.slice(1, 3), 16) - 35);
    const stripeG = Math.max(0, parseInt(colors.skin.slice(3, 5), 16) - 35);
    const stripeB = Math.max(0, parseInt(colors.skin.slice(5, 7), 16) - 35);
    const stripeColor = `rgb(${stripeR},${stripeG},${stripeB})`;
    const bellyR = Math.min(255, parseInt(colors.skin.slice(1, 3), 16) + 30);
    const bellyG = Math.min(255, parseInt(colors.skin.slice(3, 5), 16) + 30);
    const bellyB = Math.min(255, parseInt(colors.skin.slice(5, 7), 16) + 30);
    const bellyColor = `rgb(${bellyR},${bellyG},${bellyB})`;

    // --- Fluffy thick tail (drawn first, behind body) ---
    if (dir !== DIR_DOWN) {
        const tailDir = dir === DIR_UP ? DIR_LEFT : dir;
        const ts = tailDir === DIR_LEFT ? 1 : -1;
        const tbx = tailDir === DIR_LEFT ? cx + Math.floor(catTorsoW / 2) : cx - Math.floor(catTorsoW / 2) - 3;
        const tby = a.torsoY + a.torsoH - 3 + a.walk.bob;
        // Thick fluffy S-curve
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tbx, tby, 4, 3);
        ctx.fillRect(tbx + ts * 2, tby - 2, 4, 4);
        ctx.fillRect(tbx + ts * 4, tby - 5, 4, 5);
        ctx.fillRect(tbx + ts * 5, tby - 9, 4, 5);
        ctx.fillRect(tbx + ts * 4, tby - 12, 4, 5);
        ctx.fillRect(tbx + ts * 2, tby - 14, 4, 4);
        // Darker fluffy tip
        ctx.fillStyle = stripeColor;
        ctx.fillRect(tbx + ts * 1, tby - 16, 5, 5);
        ctx.fillRect(tbx + ts * 2, tby - 17, 4, 2);
        // Tail outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(tbx + ts * 2, tby - 17, 1, 1);
    }
    if (dir === DIR_DOWN) {
        // Tail tip visible behind body
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx + 5, a.torsoY + a.walk.bob - 2, 4, 4);
        ctx.fillRect(cx + 7, a.torsoY + a.walk.bob - 4, 4, 3);
        ctx.fillStyle = stripeColor;
        ctx.fillRect(cx + 8, a.torsoY + a.walk.bob - 6, 4, 3);
    }

    // --- Back slim arms with fur stripe ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, catArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, catArmW, a.armH, colors.mid);
        // Fur stripe marking
        ctx.fillStyle = stripeColor;
        ctx.fillRect(a.rightArmX + 2, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.3), catArmW - 2, 1);
        ctx.fillRect(a.rightArmX + 2, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.6), catArmW - 2, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, catArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, catArmW, a.armH, colors.mid);
        ctx.fillStyle = stripeColor;
        ctx.fillRect(a.leftArmX + 2, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.3), catArmW - 2, 1);
        ctx.fillRect(a.leftArmX + 2, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.6), catArmW - 2, 1);
    }

    // --- Slim digitigrade legs ---
    const legLX = Math.floor(cx - catLegW - 1);
    const legRX = Math.floor(cx + 1);
    _drawRoundedRect(ctx, legLX, a.legsTopY + a.walk.legL, catLegW, a.legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, legLX, a.legsTopY + a.walk.legL, catLegW, a.legH, colors.mid);
    _drawRoundedRect(ctx, legRX, a.legsTopY + a.walk.legR, catLegW, a.legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, legRX, a.legsTopY + a.walk.legR, catLegW, a.legH, colors.mid);
    // Fur stripe on legs
    ctx.fillStyle = stripeColor;
    ctx.fillRect(legLX + 1, a.legsTopY + a.walk.legL + Math.floor(a.legH * 0.25), catLegW - 2, 1);
    ctx.fillRect(legRX + 1, a.legsTopY + a.walk.legR + Math.floor(a.legH * 0.25), catLegW - 2, 1);

    // --- Padded paw feet (NO boots) ---
    const pawLY = a.legsTopY + a.walk.legL + a.legH - 1;
    const pawRY = a.legsTopY + a.walk.legR + a.legH - 1;
    // Paw base
    ctx.fillStyle = colors.skin;
    ctx.fillRect(legLX - 1, pawLY, catLegW + 3, 3);
    ctx.fillRect(legRX - 1, pawRY, catLegW + 3, 3);
    // Pink toe pads (3 toes visible)
    ctx.fillStyle = '#ee88aa';
    ctx.fillRect(legLX - 1, pawLY + 2, 2, 2);
    ctx.fillRect(legLX + 2, pawLY + 2, 2, 2);
    ctx.fillRect(legLX + 4, pawLY + 2, 2, 2);
    ctx.fillRect(legRX - 1, pawRY + 2, 2, 2);
    ctx.fillRect(legRX + 2, pawRY + 2, 2, 2);
    ctx.fillRect(legRX + 4, pawRY + 2, 2, 2);
    // Main pad
    ctx.fillStyle = '#dd7799';
    ctx.fillRect(legLX + 1, pawLY, 3, 2);
    ctx.fillRect(legRX + 1, pawRY, 3, 2);
    // Paw outline
    ctx.fillStyle = '#000000';
    ctx.fillRect(legLX - 2, pawLY + 3, catLegW + 4, 1);
    ctx.fillRect(legRX - 2, pawRY + 3, catLegW + 4, 1);

    // --- Slender torso with lighter belly and fur ruff ---
    _drawRoundedRect(ctx, catTorsoX, a.torsoY + a.walk.bob, catTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, catTorsoX, a.torsoY + a.walk.bob, catTorsoW, a.torsoH, colors.mid);
    // Lighter belly fur
    if (dir !== DIR_UP) {
        ctx.fillStyle = bellyColor;
        ctx.fillRect(catTorsoX + 2, a.torsoY + a.walk.bob + 2, catTorsoW - 4, a.torsoH - 4);
    }
    // Fur stripe pattern on sides
    ctx.fillStyle = stripeColor;
    ctx.fillRect(catTorsoX + 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.2), 2, 1);
    ctx.fillRect(catTorsoX + catTorsoW - 3, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.35), 2, 1);
    ctx.fillRect(catTorsoX + 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.55), 2, 1);
    // Fluffy neck ruff
    if (dir !== DIR_UP) {
        ctx.fillStyle = bellyColor;
        ctx.fillRect(catTorsoX - 2, a.torsoY + a.walk.bob - 2, catTorsoW + 4, 4);
        ctx.fillRect(catTorsoX - 1, a.torsoY + a.walk.bob - 3, catTorsoW + 2, 2);
        // Jagged ruff texture
        ctx.fillStyle = colors.skin;
        ctx.fillRect(catTorsoX - 2, a.torsoY + a.walk.bob - 2, 1, 1);
        ctx.fillRect(catTorsoX + 2, a.torsoY + a.walk.bob - 3, 1, 1);
        ctx.fillRect(catTorsoX + catTorsoW, a.torsoY + a.walk.bob - 2, 1, 1);
        ctx.fillRect(catTorsoX + catTorsoW - 3, a.torsoY + a.walk.bob - 3, 1, 1);
    }

    // --- Cat head with defined muzzle area ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);
    // Lighter muzzle area
    if (dir !== DIR_UP) {
        ctx.fillStyle = bellyColor;
        ctx.fillRect(cx - 3, a.headY + Math.floor(a.headH * 0.45), 6, Math.floor(a.headH * 0.4));
    }
    // Forehead M-marking
    if (dir !== DIR_UP) {
        ctx.fillStyle = stripeColor;
        ctx.fillRect(cx - 3, a.headY + 1, 2, 2);
        ctx.fillRect(cx - 1, a.headY + 2, 2, 1);
        ctx.fillRect(cx + 1, a.headY + 1, 2, 2);
    }

    // --- Large triangular cat ears with fur tufts ---
    if (dir !== DIR_RIGHT) {
        // Left ear
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 1, a.headY - 5, 7, 5);
        ctx.fillRect(a.headX, a.headY - 9, 5, 5);
        ctx.fillRect(a.headX + 1, a.headY - 12, 3, 4);
        ctx.fillRect(a.headX + 2, a.headY - 14, 2, 3);
        // Ear outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX - 2, a.headY - 4, 1, 4);
        ctx.fillRect(a.headX - 1, a.headY - 8, 1, 4);
        ctx.fillRect(a.headX, a.headY - 11, 1, 3);
        ctx.fillRect(a.headX + 1, a.headY - 13, 1, 3);
        ctx.fillRect(a.headX + 2, a.headY - 15, 1, 2);
        // Inner ear pink
        if (dir !== DIR_UP) {
            ctx.fillStyle = '#ee88aa';
            ctx.fillRect(a.headX + 2, a.headY - 6, 3, 4);
            ctx.fillRect(a.headX + 2, a.headY - 10, 2, 5);
            ctx.fillRect(a.headX + 3, a.headY - 12, 1, 3);
        }
        // Fur tuft at ear tip
        ctx.fillStyle = stripeColor;
        ctx.fillRect(a.headX + 2, a.headY - 16, 2, 2);
    }
    if (dir !== DIR_LEFT) {
        // Right ear
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW - 6, a.headY - 5, 7, 5);
        ctx.fillRect(a.headX + a.headW - 5, a.headY - 9, 5, 5);
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 12, 3, 4);
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 14, 2, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + a.headW + 1, a.headY - 4, 1, 4);
        ctx.fillRect(a.headX + a.headW, a.headY - 8, 1, 4);
        ctx.fillRect(a.headX + a.headW - 1, a.headY - 11, 1, 3);
        ctx.fillRect(a.headX + a.headW - 2, a.headY - 13, 1, 3);
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 15, 1, 2);
        if (dir !== DIR_UP) {
            ctx.fillStyle = '#ee88aa';
            ctx.fillRect(a.headX + a.headW - 5, a.headY - 6, 3, 4);
            ctx.fillRect(a.headX + a.headW - 4, a.headY - 10, 2, 5);
            ctx.fillRect(a.headX + a.headW - 4, a.headY - 12, 1, 3);
        }
        ctx.fillStyle = stripeColor;
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 16, 2, 2);
    }

    // --- Cat face features ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.25);

        // Large cat eyes with vertical slit pupils
        if (dir === DIR_DOWN) {
            // Left eye — large oval
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 8, eyeY, 6, 5);
            ctx.fillRect(cx - 7, eyeY - 1, 4, 1);
            ctx.fillRect(cx - 7, eyeY + 5, 4, 1);
            // Vertical slit pupil
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 6, eyeY, 1, 5);
            // Highlight
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 8, eyeY, 2, 2);
            // Right eye
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx + 3, eyeY, 6, 5);
            ctx.fillRect(cx + 4, eyeY - 1, 4, 1);
            ctx.fillRect(cx + 4, eyeY + 5, 4, 1);
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx + 6, eyeY, 1, 5);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx + 3, eyeY, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 8;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY, 6, 5);
            ctx.fillRect(ex + 1, eyeY - 1, 4, 1);
            ctx.fillStyle = '#111111';
            ctx.fillRect(ex + 3, eyeY, 1, 5);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex, eyeY, 2, 2);
        }

        // Whiskers (3 per side)
        ctx.fillStyle = '#000000';
        const whiskerY = a.headY + Math.floor(a.headH * 0.55);
        if (dir === DIR_DOWN) {
            ctx.fillRect(a.headX - 7, whiskerY - 2, 8, 1);
            ctx.fillRect(a.headX - 8, whiskerY + 1, 9, 1);
            ctx.fillRect(a.headX - 6, whiskerY + 4, 7, 1);
            ctx.fillRect(a.headX + a.headW, whiskerY - 2, 8, 1);
            ctx.fillRect(a.headX + a.headW, whiskerY + 1, 9, 1);
            ctx.fillRect(a.headX + a.headW, whiskerY + 4, 7, 1);
        } else if (dir === DIR_LEFT) {
            ctx.fillRect(a.headX - 8, whiskerY - 2, 9, 1);
            ctx.fillRect(a.headX - 9, whiskerY + 1, 10, 1);
            ctx.fillRect(a.headX - 7, whiskerY + 4, 8, 1);
        } else {
            ctx.fillRect(a.headX + a.headW, whiskerY - 2, 9, 1);
            ctx.fillRect(a.headX + a.headW, whiskerY + 1, 10, 1);
            ctx.fillRect(a.headX + a.headW, whiskerY + 4, 8, 1);
        }

        // Triangular pink cat nose
        if (dir === DIR_DOWN) {
            const noseY = a.headY + Math.floor(a.headH * 0.55);
            ctx.fillStyle = '#ee6688';
            ctx.fillRect(cx - 2, noseY, 4, 2);
            ctx.fillRect(cx - 1, noseY - 1, 2, 1);
            ctx.fillStyle = '#ff99aa';
            ctx.fillRect(cx - 1, noseY, 1, 1);
            // Nose outline
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 1, noseY + 2, 2, 1);
        } else {
            const nx = dir === DIR_RIGHT ? a.headX + a.headW : a.headX - 3;
            ctx.fillStyle = '#ee6688';
            ctx.fillRect(nx, a.headY + Math.floor(a.headH * 0.52), 3, 2);
        }

        // Cat "w" mouth (feline)
        if (dir === DIR_DOWN) {
            const mouthY = a.headY + Math.floor(a.headH * 0.72);
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 3, mouthY, 1, 1);
            ctx.fillRect(cx - 2, mouthY + 1, 1, 1);
            ctx.fillRect(cx - 1, mouthY, 1, 1);
            ctx.fillRect(cx, mouthY + 1, 1, 1);
            ctx.fillRect(cx + 1, mouthY, 1, 1);
            ctx.fillRect(cx + 2, mouthY + 1, 1, 1);
            ctx.fillRect(cx + 3, mouthY, 1, 1);
        }
    }

    // --- Retractable claw hints ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#dddddd';
        ctx.fillRect(a.leftArmX + 1, a.shoulderY + a.walk.armL + a.armH, catArmW, 1);
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH + 1, 1, 1);
        ctx.fillRect(a.leftArmX + Math.floor(catArmW / 2), a.shoulderY + a.walk.armL + a.armH + 1, 1, 1);
        ctx.fillRect(a.leftArmX + catArmW, a.shoulderY + a.walk.armL + a.armH + 1, 1, 1);
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + a.armH, catArmW, 1);
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + a.armH + 1, 1, 1);
        ctx.fillRect(a.rightArmX + Math.floor(catArmW / 2), a.shoulderY + a.walk.armR + a.armH + 1, 1, 1);
        ctx.fillRect(a.rightArmX + catArmW, a.shoulderY + a.walk.armR + a.armH + 1, 1, 1);
    }

    // --- Front slim arms with fur stripes ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, catArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, catArmW, a.armH, colors.mid);
        ctx.fillStyle = stripeColor;
        ctx.fillRect(a.rightArmX + 2, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.3), catArmW - 2, 1);
        ctx.fillRect(a.rightArmX + 2, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.6), catArmW - 2, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, catArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, catArmW, a.armH, colors.mid);
        ctx.fillStyle = stripeColor;
        ctx.fillRect(a.leftArmX + 2, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.3), catArmW - 2, 1);
        ctx.fillRect(a.leftArmX + 2, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.6), catArmW - 2, 1);
    }
}

// ── Race 7: Elf ─────────────────────────────────────────────────────────────
function _drawElf(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    // Elf: elegant slender warrior with ornate armor and flowing hair
    const elfTorsoW = a.torsoW - 2;
    const elfTorsoX = Math.floor(cx - elfTorsoW / 2);
    const elfArmW = a.armW - 1;
    const elfLegW = a.legW - 1;
    const armorColor = '#4a5680';
    const armorTrim = '#8899bb';
    const armorLight = '#5a6890';
    const goldTrim = '#ccaa44';
    const gemColor = '#44ddff';

    // --- Long flowing back hair (reaches mid-back, visible from behind) ---
    if (dir === DIR_UP) {
        const hairR = parseInt(colors.hair.slice(1,3),16), hairG = parseInt(colors.hair.slice(3,5),16), hairB = parseInt(colors.hair.slice(5,7),16);
        const hairShadow = `rgb(${Math.max(0,hairR-35)},${Math.max(0,hairG-35)},${Math.max(0,hairB-35)})`;
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.headX - 2, a.headY, a.headW + 4, a.headH + Math.floor(a.torsoH * 0.6));
        ctx.fillRect(a.headX - 1, a.headY + a.headH + Math.floor(a.torsoH * 0.6), a.headW + 2, Math.floor(a.torsoH * 0.3));
        ctx.fillRect(a.headX, a.headY + a.headH + Math.floor(a.torsoH * 0.9), a.headW, 3);
        // Hair highlight streak
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(a.headX + Math.floor(a.headW * 0.3), a.headY + 2, 3, a.headH + Math.floor(a.torsoH * 0.4));
        ctx.globalAlpha = 1.0;
        // Hair shadow
        ctx.fillStyle = hairShadow;
        ctx.fillRect(a.headX + a.headW, a.headY + 3, 2, a.headH + Math.floor(a.torsoH * 0.4));
    }

    // --- Slender legs ---
    _drawRoundedRect(ctx, a.leftLegX, a.legsTopY + a.walk.legL, elfLegW, a.legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.leftLegX, a.legsTopY + a.walk.legL, elfLegW, a.legH, colors.mid);
    _drawRoundedRect(ctx, a.rightLegX + 1, a.legsTopY + a.walk.legR, elfLegW, a.legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.rightLegX + 1, a.legsTopY + a.walk.legR, elfLegW, a.legH, colors.mid);

    // --- Ornate pointed elven boots ---
    ctx.fillStyle = '#445533';
    const bLY = a.legsTopY + a.walk.legL + a.legH - 2;
    const bRY = a.legsTopY + a.walk.legR + a.legH - 2;
    ctx.fillRect(a.leftLegX - 2, bLY, elfLegW + 3, 3);
    ctx.fillRect(a.leftLegX - 4, bLY + 1, 3, 2);
    ctx.fillRect(a.rightLegX - 1, bRY, elfLegW + 3, 3);
    ctx.fillRect(a.rightLegX + elfLegW + 1, bRY + 1, 3, 2);
    // Gold boot trim
    ctx.fillStyle = goldTrim;
    ctx.fillRect(a.leftLegX - 1, bLY, elfLegW + 1, 1);
    ctx.fillRect(a.rightLegX, bRY, elfLegW + 1, 1);
    // Boot outline
    ctx.fillStyle = '#000000';
    ctx.fillRect(a.leftLegX - 4, bLY + 2, elfLegW + 6, 1);
    ctx.fillRect(a.rightLegX - 1, bRY + 2, elfLegW + 5, 1);

    // --- Back arms with ornate sleeves ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, elfArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, elfArmW, a.armH, colors.mid);
        // Ornate armor sleeve
        ctx.fillStyle = armorColor;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR, elfArmW + 1, Math.floor(a.armH * 0.25));
        ctx.fillStyle = goldTrim;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.23), elfArmW + 1, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, elfArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX, a.shoulderY + a.walk.armL, elfArmW, a.armH, colors.mid);
        ctx.fillStyle = armorColor;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL, elfArmW + 1, Math.floor(a.armH * 0.25));
        ctx.fillStyle = goldTrim;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.23), elfArmW + 1, 1);
    }

    // --- Ornate armor torso ---
    _drawRoundedRect(ctx, elfTorsoX, a.torsoY + a.walk.bob, elfTorsoW, a.torsoH, armorColor, colors.outline);
    _drawSoftShading(ctx, elfTorsoX, a.torsoY + a.walk.bob, elfTorsoW, a.torsoH, armorLight);
    // Armor detail: center seam and trim
    ctx.fillStyle = armorTrim;
    ctx.fillRect(elfTorsoX + 1, a.torsoY + a.walk.bob, elfTorsoW - 2, 1);
    ctx.fillRect(elfTorsoX, a.torsoY + a.walk.bob + a.torsoH - 1, elfTorsoW, 1);
    // V-neck collar
    if (dir !== DIR_UP) {
        ctx.fillStyle = goldTrim;
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob, 2, 3);
        ctx.fillRect(cx - 2, a.torsoY + a.walk.bob, 1, 2);
        ctx.fillRect(cx + 1, a.torsoY + a.walk.bob, 1, 2);
    }
    // Ornate belt with elven buckle
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(elfTorsoX + 1, a.torsoY + a.walk.bob + a.torsoH - 4, elfTorsoW - 2, 3);
    ctx.fillStyle = goldTrim;
    ctx.fillRect(cx - 2, a.torsoY + a.walk.bob + a.torsoH - 4, 4, 3);
    // Leaf-shaped buckle gem
    ctx.fillStyle = gemColor;
    ctx.fillRect(cx - 1, a.torsoY + a.walk.bob + a.torsoH - 3, 2, 1);
    // Robe skirt extending below torso
    ctx.fillStyle = armorColor;
    ctx.fillRect(elfTorsoX - 1, a.torsoY + a.walk.bob + a.torsoH, elfTorsoW + 2, 3);
    ctx.fillStyle = goldTrim;
    ctx.fillRect(elfTorsoX - 1, a.torsoY + a.walk.bob + a.torsoH + 2, elfTorsoW + 2, 1);

    // Neck
    ctx.fillStyle = colors.skin;
    ctx.fillRect(cx - 2, a.torsoY + a.walk.bob - 2, 4, 3);

    // --- Elf head ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);
    // Higher cheekbones
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(a.headX + 1, a.headY + Math.floor(a.headH * 0.4), 3, 2);
        ctx.fillRect(a.headX + a.headW - 4, a.headY + Math.floor(a.headH * 0.4), 3, 2);
        ctx.globalAlpha = 1.0;
    }

    // --- Very long pointed ears extending past head ---
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        // Left ear — long, tapering point
        ctx.fillRect(a.headX - 5, a.headY + Math.floor(a.headH * 0.25), 6, 4);
        ctx.fillRect(a.headX - 10, a.headY + Math.floor(a.headH * 0.3), 6, 3);
        ctx.fillRect(a.headX - 14, a.headY + Math.floor(a.headH * 0.35), 5, 2);
        ctx.fillRect(a.headX - 17, a.headY + Math.floor(a.headH * 0.4), 4, 1);
        // Inner ear shadow
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(a.headX - 8, a.headY + Math.floor(a.headH * 0.3), 4, 2);
        ctx.globalAlpha = 1.0;
        // Ear tip outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX - 17, a.headY + Math.floor(a.headH * 0.4), 1, 1);
        // Ear jewelry (small gold ring)
        ctx.fillStyle = goldTrim;
        ctx.fillRect(a.headX - 6, a.headY + Math.floor(a.headH * 0.35), 2, 2);
    }
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 1, a.headY + Math.floor(a.headH * 0.25), 6, 4);
        ctx.fillRect(a.headX + a.headW + 4, a.headY + Math.floor(a.headH * 0.3), 6, 3);
        ctx.fillRect(a.headX + a.headW + 9, a.headY + Math.floor(a.headH * 0.35), 5, 2);
        ctx.fillRect(a.headX + a.headW + 13, a.headY + Math.floor(a.headH * 0.4), 4, 1);
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(a.headX + a.headW + 4, a.headY + Math.floor(a.headH * 0.3), 4, 2);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + a.headW + 16, a.headY + Math.floor(a.headH * 0.4), 1, 1);
        ctx.fillStyle = goldTrim;
        ctx.fillRect(a.headX + a.headW + 4, a.headY + Math.floor(a.headH * 0.35), 2, 2);
    }

    // --- Long flowing hair with volume and side locks ---
    ctx.fillStyle = colors.hair;
    if (dir !== DIR_UP) {
        // Voluminous top hair
        ctx.fillRect(a.headX - 3, a.headY - 3, a.headW + 6, 6);
        ctx.fillRect(a.headX - 2, a.headY - 5, a.headW + 4, 3);
        ctx.fillRect(a.headX, a.headY - 7, a.headW, 3);
        // Hair highlight
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.12;
        ctx.fillRect(a.headX + 1, a.headY - 5, 3, 4);
        ctx.globalAlpha = 1.0;
    }
    // Long side locks reaching past shoulders (mid-back)
    ctx.fillStyle = colors.hair;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 3, a.headY + 3, 4, a.headH + Math.floor(a.torsoH * 0.4));
        ctx.fillRect(a.headX - 2, a.headY + a.headH + Math.floor(a.torsoH * 0.4), 3, Math.floor(a.torsoH * 0.3));
        ctx.fillRect(a.headX - 1, a.headY + a.headH + Math.floor(a.torsoH * 0.7), 2, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 1, a.headY + 3, 4, a.headH + Math.floor(a.torsoH * 0.4));
        ctx.fillRect(a.headX + a.headW - 1, a.headY + a.headH + Math.floor(a.torsoH * 0.4), 3, Math.floor(a.torsoH * 0.3));
        ctx.fillRect(a.headX + a.headW, a.headY + a.headH + Math.floor(a.torsoH * 0.7), 2, 3);
    }

    // --- Ornate circlet/tiara on forehead ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = goldTrim;
        ctx.fillRect(a.headX + 2, a.headY + 1, a.headW - 4, 2);
        // Side finials
        ctx.fillRect(a.headX + 1, a.headY + 1, 1, 1);
        ctx.fillRect(a.headX + a.headW - 2, a.headY + 1, 1, 1);
        // Center gem (larger)
        ctx.fillStyle = gemColor;
        ctx.fillRect(cx - 1, a.headY, 3, 3);
        ctx.fillStyle = '#aaeeff';
        ctx.fillRect(cx, a.headY, 1, 1);
        // Gem glow
        ctx.fillStyle = gemColor;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(cx - 2, a.headY - 1, 5, 4);
        ctx.globalAlpha = 1.0;
    }

    // --- Elegant almond eyes (larger than human) ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            // Almond-shaped sclera
            ctx.fillStyle = '#f8f4f0';
            ctx.fillRect(cx - 8, eyeY + 1, 6, 4);
            ctx.fillRect(cx - 9, eyeY + 2, 1, 2);
            ctx.fillRect(cx + 3, eyeY + 1, 6, 4);
            ctx.fillRect(cx + 9, eyeY + 2, 1, 2);
            // Large colored iris
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 6, eyeY + 1, 3, 4);
            ctx.fillRect(cx + 4, eyeY + 1, 3, 4);
            // Dark pupil
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 5, eyeY + 2, 2, 2);
            ctx.fillRect(cx + 5, eyeY + 2, 2, 2);
            // Bright highlight sparkle
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 7, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 3, eyeY + 1, 2, 2);
            // Elegant thin lash line
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 8, eyeY, 6, 1);
            ctx.fillRect(cx - 9, eyeY + 1, 1, 1);
            ctx.fillRect(cx + 3, eyeY, 6, 1);
            ctx.fillRect(cx + 9, eyeY + 1, 1, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 7;
            ctx.fillStyle = '#f8f4f0';
            ctx.fillRect(ex, eyeY + 1, 6, 4);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 2, eyeY + 1, 3, 4);
            ctx.fillStyle = '#111111';
            ctx.fillRect(ex + 3, eyeY + 2, 2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex, eyeY, 6, 1);
        }

        // Small elegant nose
        _drawNose(ctx, cx, a.headY + Math.floor(a.headH * 0.55), dir);

        // Delicate mouth with subtle lip color
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 2, a.headY + Math.floor(a.headH * 0.72), 4, 1);
            ctx.fillStyle = '#cc8888';
            ctx.fillRect(cx - 1, a.headY + Math.floor(a.headH * 0.72) + 1, 2, 1);
        }
    }

    // --- Magic sparkles near hands ---
    ctx.fillStyle = '#aaddff';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH + 1, 2, 2);
    ctx.fillRect(a.leftArmX + 2, a.shoulderY + a.walk.armL + a.armH + 3, 1, 1);
    ctx.fillRect(a.rightArmX + elfArmW, a.shoulderY + a.walk.armR + a.armH + 1, 2, 2);
    ctx.fillRect(a.rightArmX + elfArmW - 2, a.shoulderY + a.walk.armR + a.armH + 3, 1, 1);
    ctx.globalAlpha = 1.0;

    // --- Front arms with ornate sleeves ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, elfArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, elfArmW, a.armH, colors.mid);
        ctx.fillStyle = armorColor;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR, elfArmW, Math.floor(a.armH * 0.25));
        ctx.fillStyle = goldTrim;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.23), elfArmW, 1);
        _drawHand(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR + a.armH - 1, elfArmW, colors);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, elfArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX, a.shoulderY + a.walk.armL, elfArmW, a.armH, colors.mid);
        ctx.fillStyle = armorColor;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL, elfArmW, Math.floor(a.armH * 0.25));
        ctx.fillStyle = goldTrim;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.23), elfArmW, 1);
        _drawHand(ctx, a.leftArmX, a.shoulderY + a.walk.armL + a.armH - 1, elfArmW, colors);
    }
}

// ── Race 8: Ent (Tree person) ───────────────────────────────────────────────
function _drawEnt(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    // Ent: gnarled tree warrior with bark texture, mossy patches, branch arms
    const barkColor = '#5a4030';
    const barkLight = '#7a6050';
    const barkDark = '#3a2820';
    const barkGrain = '#4a3525';
    const leafColor = '#449933';
    const leafDark = '#337722';
    const leafBright = '#66bb44';
    const mossColor = '#668844';
    const sapColor = '#cc8822';

    // --- Root-like feet (NO boots) spreading out ---
    const entLegW = a.legW + 3;
    _drawRoundedRect(ctx, a.leftLegX - 1, a.legsTopY + a.walk.legL, entLegW, a.legH + 2, barkColor, barkDark);
    _drawSoftShading(ctx, a.leftLegX - 1, a.legsTopY + a.walk.legL, entLegW, a.legH + 2, barkLight);
    _drawRoundedRect(ctx, a.rightLegX - 1, a.legsTopY + a.walk.legR, entLegW, a.legH + 2, barkColor, barkDark);
    _drawSoftShading(ctx, a.rightLegX - 1, a.legsTopY + a.walk.legR, entLegW, a.legH + 2, barkLight);
    // Bark grain on legs
    ctx.fillStyle = barkGrain;
    ctx.fillRect(a.leftLegX, a.legsTopY + a.walk.legL + Math.floor(a.legH * 0.2), entLegW - 2, 1);
    ctx.fillRect(a.leftLegX + 1, a.legsTopY + a.walk.legL + Math.floor(a.legH * 0.5), entLegW - 3, 1);
    ctx.fillRect(a.rightLegX + 1, a.legsTopY + a.walk.legR + Math.floor(a.legH * 0.3), entLegW - 3, 1);
    ctx.fillRect(a.rightLegX, a.legsTopY + a.walk.legR + Math.floor(a.legH * 0.65), entLegW - 2, 1);
    // Root tendrils spreading from feet
    ctx.fillStyle = barkDark;
    const rootLY = a.legsTopY + a.walk.legL + a.legH;
    const rootRY = a.legsTopY + a.walk.legR + a.legH;
    ctx.fillRect(a.leftLegX - 4, rootLY, entLegW + 6, 3);
    ctx.fillRect(a.leftLegX - 6, rootLY + 1, 3, 2);
    ctx.fillRect(a.leftLegX + entLegW + 1, rootLY + 1, 3, 2);
    ctx.fillRect(a.rightLegX - 4, rootRY, entLegW + 6, 3);
    ctx.fillRect(a.rightLegX - 5, rootRY + 1, 3, 2);
    ctx.fillRect(a.rightLegX + entLegW + 1, rootRY + 1, 3, 2);
    // Root outline
    ctx.fillStyle = '#000000';
    ctx.fillRect(a.leftLegX - 6, rootLY + 2, entLegW + 10, 1);
    ctx.fillRect(a.rightLegX - 5, rootRY + 2, entLegW + 9, 1);
    // Moss patch on one leg
    ctx.fillStyle = mossColor;
    ctx.fillRect(a.leftLegX, a.legsTopY + a.walk.legL + Math.floor(a.legH * 0.7), 3, 2);

    // --- Back branch arms with twig fingers ---
    const entArmW = a.armW + 2;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkLight);
        // Bark grain on arm
        ctx.fillStyle = barkGrain;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.3), entArmW - 2, 1);
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.6), entArmW - 2, 1);
        // Twig finger forks
        ctx.fillStyle = barkColor;
        ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH - 1, 2, 3);
        ctx.fillRect(a.rightArmX + entArmW - 1, a.shoulderY + a.walk.armR + a.armH - 1, 2, 3);
        ctx.fillRect(a.rightArmX + Math.floor(entArmW / 2), a.shoulderY + a.walk.armR + a.armH, 1, 2);
        // Small leaves at fingertips
        ctx.fillStyle = leafColor;
        ctx.fillRect(a.rightArmX - 2, a.shoulderY + a.walk.armR + a.armH + 1, entArmW + 3, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkLight);
        ctx.fillStyle = barkGrain;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.3), entArmW - 2, 1);
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.6), entArmW - 2, 1);
        ctx.fillStyle = barkColor;
        ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH - 1, 2, 3);
        ctx.fillRect(a.leftArmX + entArmW - 2, a.shoulderY + a.walk.armL + a.armH - 1, 2, 3);
        ctx.fillRect(a.leftArmX + Math.floor(entArmW / 2), a.shoulderY + a.walk.armL + a.armH, 1, 2);
        ctx.fillStyle = leafColor;
        ctx.fillRect(a.leftArmX - 3, a.shoulderY + a.walk.armL + a.armH + 1, entArmW + 3, 2);
    }

    // --- Thick gnarled bark trunk torso ---
    const entTorsoW = a.torsoW + 6;
    const entTorsoX = Math.floor(cx - entTorsoW / 2);
    _drawRoundedRect(ctx, entTorsoX, a.torsoY + a.walk.bob, entTorsoW, a.torsoH + 2, barkColor, barkDark);
    _drawShading(ctx, entTorsoX, a.torsoY + a.walk.bob, entTorsoW, a.torsoH + 2, barkLight);
    // Darker bark grain lines
    ctx.fillStyle = barkGrain;
    ctx.fillRect(entTorsoX + 2, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.1), entTorsoW - 4, 1);
    ctx.fillRect(entTorsoX + 3, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.3), entTorsoW - 6, 1);
    ctx.fillRect(entTorsoX + 2, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.5), entTorsoW - 4, 1);
    ctx.fillRect(entTorsoX + 3, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.7), entTorsoW - 6, 1);
    // Knotholes
    if (dir !== DIR_UP) {
        ctx.fillStyle = barkDark;
        ctx.fillRect(entTorsoX + 3, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.2), 3, 3);
        ctx.fillRect(entTorsoX + 4, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.15), 1, 1);
        ctx.fillRect(entTorsoX + entTorsoW - 5, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.45), 2, 2);
    }
    // Moss patches on trunk
    ctx.fillStyle = mossColor;
    ctx.fillRect(entTorsoX + 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.6), 3, 2);
    ctx.fillRect(entTorsoX + entTorsoW - 4, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.25), 2, 2);
    // Green tufts (mossy growth)
    ctx.fillStyle = leafColor;
    ctx.fillRect(entTorsoX - 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.55), 2, 3);
    ctx.fillRect(entTorsoX + entTorsoW - 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.4), 2, 2);

    // Glowing amber sap at shoulder joints
    ctx.fillStyle = sapColor;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(entTorsoX, a.shoulderY + a.walk.bob + 1, 2, 2);
    ctx.fillRect(entTorsoX + entTorsoW - 2, a.shoulderY + a.walk.bob + 1, 2, 2);
    ctx.globalAlpha = 1.0;
    // Sap glow halo
    ctx.fillStyle = sapColor;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(entTorsoX - 1, a.shoulderY + a.walk.bob, 4, 4);
    ctx.fillRect(entTorsoX + entTorsoW - 3, a.shoulderY + a.walk.bob, 4, 4);
    ctx.globalAlpha = 1.0;

    // --- Big woody head with craggy bark texture ---
    _drawRoundedRect(ctx, a.headX, a.headY + 2, a.headW, a.headH - 2, barkColor, barkDark);
    _drawShading(ctx, a.headX, a.headY + 2, a.headW, a.headH - 2, barkLight);
    // Craggy bark face texture (vertical grain lines)
    ctx.fillStyle = barkGrain;
    ctx.fillRect(a.headX + 2, a.headY + 4, 2, a.headH - 6);
    ctx.fillRect(a.headX + a.headW - 4, a.headY + 4, 2, a.headH - 6);
    ctx.fillRect(cx - 1, a.headY + 3, 1, Math.floor(a.headH * 0.3));
    // Rough bark outline texture
    ctx.fillStyle = barkDark;
    ctx.fillRect(a.headX + 1, a.headY + 3, 1, 2);
    ctx.fillRect(a.headX + a.headW - 2, a.headY + 4, 1, 2);

    // --- Leaf canopy crown (instead of hair) ---
    ctx.fillStyle = leafColor;
    ctx.fillRect(a.headX - 6, a.headY - 4, a.headW + 12, 8);
    ctx.fillRect(a.headX - 4, a.headY - 8, a.headW + 8, 5);
    ctx.fillRect(a.headX - 1, a.headY - 11, a.headW + 2, 4);
    ctx.fillRect(a.headX + 2, a.headY - 13, a.headW - 4, 3);
    // Darker leaf depth layers
    ctx.fillStyle = leafDark;
    ctx.fillRect(a.headX + 1, a.headY - 6, 4, 3);
    ctx.fillRect(a.headX + a.headW - 5, a.headY - 7, 4, 3);
    ctx.fillRect(a.headX + Math.floor(a.headW / 2) - 2, a.headY - 12, 4, 3);
    ctx.fillRect(a.headX - 3, a.headY - 3, 3, 2);
    ctx.fillRect(a.headX + a.headW, a.headY - 2, 3, 2);
    // Bright leaf highlights
    ctx.fillStyle = leafBright;
    ctx.fillRect(a.headX + 4, a.headY - 3, 3, 2);
    ctx.fillRect(a.headX + a.headW - 4, a.headY - 2, 2, 2);
    ctx.fillRect(a.headX + 2, a.headY - 9, 2, 2);
    ctx.fillRect(a.headX + a.headW - 1, a.headY - 8, 2, 2);
    // Leaf outline (rough, organic)
    ctx.fillStyle = '#000000';
    ctx.fillRect(a.headX - 6, a.headY - 4, a.headW + 12, 1);
    ctx.fillRect(a.headX - 4, a.headY - 8, 1, 4);
    ctx.fillRect(a.headX + a.headW + 3, a.headY - 8, 1, 4);
    // Flower buds in canopy
    ctx.fillStyle = '#ff88aa';
    ctx.fillRect(a.headX - 3, a.headY - 5, 2, 2);
    ctx.fillRect(a.headX + a.headW + 1, a.headY - 4, 2, 2);
    ctx.fillStyle = '#ffaa44';
    ctx.fillRect(a.headX + Math.floor(a.headW / 2) + 2, a.headY - 12, 2, 2);

    // --- Knot-hole eyes with glowing pupils ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35);
        if (dir === DIR_DOWN) {
            // Dark knot-hole hollows
            ctx.fillStyle = barkDark;
            ctx.fillRect(cx - 7, eyeY, 5, 5);
            ctx.fillRect(cx + 3, eyeY, 5, 5);
            ctx.fillRect(cx - 8, eyeY + 1, 1, 3);
            ctx.fillRect(cx + 8, eyeY + 1, 1, 3);
            // Glowing green pupils
            ctx.fillStyle = '#88ff44';
            ctx.fillRect(cx - 6, eyeY + 1, 3, 3);
            ctx.fillRect(cx + 4, eyeY + 1, 3, 3);
            // Bright pupil center
            ctx.fillStyle = '#ccff88';
            ctx.fillRect(cx - 5, eyeY + 2, 1, 1);
            ctx.fillRect(cx + 5, eyeY + 2, 1, 1);
            // Glow halo
            ctx.fillStyle = '#88ff44';
            ctx.globalAlpha = 0.2;
            ctx.fillRect(cx - 8, eyeY - 1, 7, 7);
            ctx.fillRect(cx + 2, eyeY - 1, 7, 7);
            ctx.globalAlpha = 1.0;
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 6;
            ctx.fillStyle = barkDark;
            ctx.fillRect(ex, eyeY, 5, 5);
            ctx.fillRect(ex - 1, eyeY + 1, 1, 3);
            ctx.fillStyle = '#88ff44';
            ctx.fillRect(ex + 1, eyeY + 1, 3, 3);
            ctx.fillStyle = '#ccff88';
            ctx.fillRect(ex + 2, eyeY + 2, 1, 1);
            ctx.fillStyle = '#88ff44';
            ctx.globalAlpha = 0.2;
            ctx.fillRect(ex - 1, eyeY - 1, 7, 7);
            ctx.globalAlpha = 1.0;
        }
        // Wooden mouth crease
        if (dir === DIR_DOWN) {
            ctx.fillStyle = barkDark;
            ctx.fillRect(cx - 3, a.headY + Math.floor(a.headH * 0.72), 6, 2);
            ctx.fillStyle = barkLight;
            ctx.fillRect(cx - 2, a.headY + Math.floor(a.headH * 0.72) + 1, 4, 1);
        }
    }

    // --- Front branch arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkLight);
        ctx.fillStyle = barkGrain;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.3), entArmW - 2, 1);
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.6), entArmW - 2, 1);
        // Twig fingers
        ctx.fillStyle = barkColor;
        ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH - 1, 2, 3);
        ctx.fillRect(a.rightArmX + entArmW - 1, a.shoulderY + a.walk.armR + a.armH - 1, 2, 3);
        ctx.fillRect(a.rightArmX + Math.floor(entArmW / 2), a.shoulderY + a.walk.armR + a.armH, 1, 2);
        ctx.fillStyle = leafColor;
        ctx.fillRect(a.rightArmX - 2, a.shoulderY + a.walk.armR + a.armH + 1, entArmW + 3, 2);
        // Sap glow at joint
        ctx.fillStyle = sapColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR, 2, 2);
        ctx.globalAlpha = 1.0;
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkLight);
        ctx.fillStyle = barkGrain;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.3), entArmW - 2, 1);
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.6), entArmW - 2, 1);
        ctx.fillStyle = barkColor;
        ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH - 1, 2, 3);
        ctx.fillRect(a.leftArmX + entArmW - 2, a.shoulderY + a.walk.armL + a.armH - 1, 2, 3);
        ctx.fillRect(a.leftArmX + Math.floor(entArmW / 2), a.shoulderY + a.walk.armL + a.armH, 1, 2);
        ctx.fillStyle = leafColor;
        ctx.fillRect(a.leftArmX - 3, a.shoulderY + a.walk.armL + a.armH + 1, entArmW + 3, 2);
        ctx.fillStyle = sapColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(a.leftArmX + entArmW - 3, a.shoulderY + a.walk.armL, 2, 2);
        ctx.globalAlpha = 1.0;
    }
}

// ── Race 9: Fish man ────────────────────────────────────────────────────────
function _drawFishman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const scaleLight = colors.mid;
    const bellyColor = '#aabbcc';

    // --- Tail fin from sides/back (visible from behind and sides) ---
    if (dir === DIR_UP || dir === DIR_LEFT || dir === DIR_RIGHT) {
        const tailSign = (dir === DIR_LEFT) ? 1 : -1;
        const tailX = (dir === DIR_UP) ? cx - 3 : (dir === DIR_LEFT ? cx + Math.floor(a.torsoW / 2) + 1 : cx - Math.floor(a.torsoW / 2) - 6);
        ctx.fillStyle = colors.hair;
        ctx.fillRect(tailX, a.torsoY + a.walk.bob + a.torsoH - 4, 6, 4);
        ctx.fillRect(tailX + tailSign * 2, a.torsoY + a.walk.bob + a.torsoH - 2, 4, 6);
        // Membrane detail
        ctx.fillStyle = scaleLight;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(tailX + 1, a.torsoY + a.walk.bob + a.torsoH, 4, 3);
        ctx.globalAlpha = 1.0;
    }

    // --- Flipper feet (wide, webbed) ---
    ctx.fillStyle = colors.skin;
    const fLY = a.legsTopY + a.walk.legL + a.legH - 2;
    const fRY = a.legsTopY + a.walk.legR + a.legH - 2;
    ctx.fillRect(a.leftLegX - 4, fLY, a.legW + 8, 4);
    ctx.fillRect(a.leftLegX - 5, fLY + 2, 2, 2);
    ctx.fillRect(a.leftLegX + a.legW + 3, fLY + 2, 2, 2);
    ctx.fillRect(a.rightLegX - 4, fRY, a.legW + 8, 4);
    ctx.fillRect(a.rightLegX - 5, fRY + 2, 2, 2);
    ctx.fillRect(a.rightLegX + a.legW + 3, fRY + 2, 2, 2);
    // Fin webbing lines
    ctx.fillStyle = colors.outline;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(a.leftLegX - 2, fLY + 1, 1, 3);
    ctx.fillRect(a.leftLegX + a.legW + 1, fLY + 1, 1, 3);
    ctx.fillRect(a.rightLegX - 2, fRY + 1, 1, 3);
    ctx.fillRect(a.rightLegX + a.legW + 1, fRY + 1, 1, 3);
    ctx.globalAlpha = 1.0;

    // --- Scaled legs ---
    _drawRoundedRect(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors.skin, colors.outline);
    _drawRoundedRect(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, colors.skin, colors.outline);
    // Scale pattern on legs
    ctx.fillStyle = scaleLight;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(a.leftLegX + 1, a.legsTopY + a.walk.legL + 2, 2, 2);
    ctx.fillRect(a.leftLegX + 4, a.legsTopY + a.walk.legL + 4, 2, 2);
    ctx.fillRect(a.rightLegX + 1, a.legsTopY + a.walk.legR + 3, 2, 2);
    ctx.fillRect(a.rightLegX + 4, a.legsTopY + a.walk.legR + 1, 2, 2);
    ctx.globalAlpha = 1.0;

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors.skin, colors.outline);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors.skin, colors.outline);
    }

    // --- Scaled torso with lighter underbelly ---
    _drawRoundedRect(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, scaleLight);
    // Lighter underbelly stripe
    if (dir !== DIR_UP) {
        ctx.fillStyle = bellyColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(a.torsoX + Math.floor(a.torsoW * 0.25), a.torsoY + a.walk.bob + 1, Math.floor(a.torsoW * 0.5), a.torsoH - 2);
        ctx.globalAlpha = 1.0;
    }
    // Scale pattern on torso
    ctx.fillStyle = scaleLight;
    ctx.globalAlpha = 0.5;
    for (let sy = a.torsoY + a.walk.bob + 1; sy < a.torsoY + a.walk.bob + a.torsoH - 1; sy += 3) {
        for (let sx = a.torsoX + 1; sx < a.torsoX + a.torsoW - 1; sx += 3) {
            ctx.fillRect(sx, sy, 2, 2);
        }
    }
    ctx.globalAlpha = 1.0;
    // Lateral line (horizontal stripe along body side)
    ctx.fillStyle = colors.outline;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(a.torsoX + 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH / 2), a.torsoW - 2, 1);
    ctx.globalAlpha = 1.0;

    // --- Fish head ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, scaleLight);
    // Lighter face underbelly
    if (dir !== DIR_UP) {
        ctx.fillStyle = bellyColor;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(a.headX + 4, a.headY + Math.floor(a.headH * 0.5), a.headW - 8, Math.floor(a.headH * 0.4));
        ctx.globalAlpha = 1.0;
    }

    // --- Gill frills on cheeks ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#cc6666';
        if (dir === DIR_DOWN || dir === DIR_LEFT) {
            ctx.fillRect(a.headX + 1, a.headY + Math.floor(a.headH * 0.45), 3, 1);
            ctx.fillRect(a.headX + 1, a.headY + Math.floor(a.headH * 0.45) + 2, 3, 1);
            ctx.fillRect(a.headX + 1, a.headY + Math.floor(a.headH * 0.45) + 4, 2, 1);
        }
        if (dir === DIR_DOWN || dir === DIR_RIGHT) {
            ctx.fillRect(a.headX + a.headW - 4, a.headY + Math.floor(a.headH * 0.45), 3, 1);
            ctx.fillRect(a.headX + a.headW - 4, a.headY + Math.floor(a.headH * 0.45) + 2, 3, 1);
            ctx.fillRect(a.headX + a.headW - 3, a.headY + Math.floor(a.headH * 0.45) + 4, 2, 1);
        }
    }

    // --- Large dorsal fin mohawk ---
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 2, a.headY - 10, 4, 10);
    ctx.fillRect(cx - 3, a.headY - 7, 6, 7);
    ctx.fillRect(cx - 1, a.headY - 14, 3, 5);
    ctx.fillRect(cx, a.headY - 16, 2, 3);
    // Fin membrane transparency
    ctx.fillStyle = scaleLight;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(cx - 1, a.headY - 6, 2, 5);
    ctx.globalAlpha = 1.0;
    // Fin spine
    ctx.fillStyle = colors.outline;
    ctx.fillRect(cx, a.headY - 16, 1, 16);

    // --- Large bulging fish eyes with iris ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.15);
        if (dir === DIR_DOWN) {
            // Bulging eye whites (protruding slightly from head)
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 11, eyeY, 9, 6);
            ctx.fillRect(cx - 12, eyeY + 1, 1, 4);
            ctx.fillRect(cx + 3, eyeY, 9, 6);
            ctx.fillRect(cx + 12, eyeY + 1, 1, 4);
            // Colored iris
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 8, eyeY + 1, 5, 4);
            ctx.fillRect(cx + 5, eyeY + 1, 5, 4);
            // Dark pupil
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 6, eyeY + 2, 3, 3);
            ctx.fillRect(cx + 6, eyeY + 2, 3, 3);
            // Highlight
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 9, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 4, eyeY + 1, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 10;
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex, eyeY, 9, 6);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 2, eyeY + 1, 5, 4);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex + 3, eyeY + 2, 3, 3);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
        }
        // Wide fish-lipped mouth
        if (dir === DIR_DOWN) {
            const mouthY = a.headY + Math.floor(a.headH * 0.7);
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 4, mouthY, 8, 3);
            ctx.fillRect(cx - 5, mouthY + 1, 1, 1);
            ctx.fillRect(cx + 4, mouthY + 1, 1, 1);
            // Inner mouth
            ctx.fillStyle = '#cc5555';
            ctx.fillRect(cx - 3, mouthY + 1, 6, 1);
        }
    }

    // --- Sparkle dots on scales ---
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(a.torsoX + 3, a.torsoY + a.walk.bob + 2, 1, 1);
    ctx.fillRect(a.torsoX + a.torsoW - 5, a.torsoY + a.walk.bob + 5, 1, 1);
    ctx.fillRect(a.headX + 5, a.headY + 3, 1, 1);
    ctx.fillRect(a.headX + a.headW - 6, a.headY + 6, 1, 1);

    // --- Webbed hands with membrane ---
    ctx.fillStyle = colors.skin;
    ctx.fillRect(a.leftArmX - 3, a.shoulderY + a.walk.armL + a.armH - 2, a.armW + 5, 4);
    ctx.fillRect(a.rightArmX - 2, a.shoulderY + a.walk.armR + a.armH - 2, a.armW + 5, 4);
    // Membrane between fingers
    ctx.fillStyle = scaleLight;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH, a.armW + 3, 2);
    ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH, a.armW + 3, 2);
    ctx.globalAlpha = 1.0;
    // Finger lines
    ctx.fillStyle = colors.outline;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH, 1, 2);
    ctx.fillRect(a.leftArmX + 2, a.shoulderY + a.walk.armL + a.armH, 1, 2);
    ctx.fillRect(a.rightArmX + a.armW - 1, a.shoulderY + a.walk.armR + a.armH, 1, 2);
    ctx.fillRect(a.rightArmX + a.armW + 2, a.shoulderY + a.walk.armR + a.armH, 1, 2);
    ctx.globalAlpha = 1.0;

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors.skin, colors.outline);
        // Scale pattern on arm
        ctx.fillStyle = scaleLight;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + 2, 2, 2);
        ctx.fillRect(a.rightArmX + 3, a.shoulderY + a.walk.armR + 5, 2, 2);
        ctx.globalAlpha = 1.0;
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors.skin, colors.outline);
        ctx.fillStyle = scaleLight;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(a.leftArmX + 1, a.shoulderY + a.walk.armL + 3, 2, 2);
        ctx.fillRect(a.leftArmX + 3, a.shoulderY + a.walk.armL + 1, 2, 2);
        ctx.globalAlpha = 1.0;
    }
}

// ── Race 10: Ghost ──────────────────────────────────────────────────────────
function _drawGhost(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // --- Ethereal aura glow (outermost layer) ---
    ctx.fillStyle = colors.skin;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(a.headX - 4, a.headY - 3, a.headW + 8, a.headH + a.torsoH + 20);
    ctx.globalAlpha = 1.0;

    // Ghost is semi-transparent
    ctx.save();
    ctx.globalAlpha = 0.6;

    // --- Back arms (wispy, fading at tips) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH - 2, colors.skin, colors.outline);
        // Fading tips
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + a.armH - 3, a.armW - 2, 3);
        ctx.globalAlpha = 0.6;
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH - 2, colors.skin, colors.outline);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.leftArmX + 1, a.shoulderY + a.walk.armL + a.armH - 3, a.armW - 2, 3);
        ctx.globalAlpha = 0.6;
    }

    // --- NO LEGS — ragged wispy tail with multiple tendrils ---
    ctx.fillStyle = colors.skin;
    const tailTop = a.legsTopY;
    ctx.fillRect(cx - 8, tailTop, 16, 3);
    ctx.fillRect(cx - 7, tailTop + 3, 14, 2);
    ctx.fillRect(cx - 5, tailTop + 5, 10, 2);
    ctx.fillRect(cx - 4, tailTop + 7, 8, 2);
    // Multiple tendrils (ragged bottom edge)
    ctx.fillRect(cx - 6, tailTop + 9, 3, 3);
    ctx.fillRect(cx - 1, tailTop + 9, 3, 4);
    ctx.fillRect(cx + 4, tailTop + 9, 3, 3);
    // Thinner wisps at very end
    ctx.globalAlpha = 0.35;
    ctx.fillRect(cx - 7, tailTop + 11, 2, 3);
    ctx.fillRect(cx, tailTop + 12, 2, 3);
    ctx.fillRect(cx + 5, tailTop + 11, 2, 3);
    ctx.fillRect(cx - 3, tailTop + 13, 1, 2);
    ctx.fillRect(cx + 3, tailTop + 14, 1, 2);
    ctx.globalAlpha = 0.6;
    // Ectoplasmic side wisps
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(cx - 9, tailTop + 1, 3, 4);
    ctx.fillRect(cx + 7, tailTop + 2, 3, 4);
    ctx.fillRect(cx - 8, tailTop + 6, 2, 3);
    ctx.fillRect(cx + 7, tailTop + 7, 2, 3);
    ctx.globalAlpha = 0.6;

    // --- Torso with ribcage hints ---
    _drawRoundedRect(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, colors.mid);
    // Ribcage visible through translucent body
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.outline;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(a.torsoX + 3, a.torsoY + a.walk.bob + 2, a.torsoW - 6, 1);
        ctx.fillRect(a.torsoX + 2, a.torsoY + a.walk.bob + 4, a.torsoW - 4, 1);
        ctx.fillRect(a.torsoX + 3, a.torsoY + a.walk.bob + 6, a.torsoW - 6, 1);
        ctx.fillRect(a.torsoX + 4, a.torsoY + a.walk.bob + 8, a.torsoW - 8, 1);
        ctx.globalAlpha = 0.6;
    }

    // --- Floating chain links ---
    ctx.fillStyle = '#888899';
    ctx.globalAlpha = 0.5;
    // Chain dangles from side
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.torsoX - 2, a.torsoY + a.walk.bob + 2, 2, 3);
        ctx.fillRect(a.torsoX - 3, a.torsoY + a.walk.bob + 5, 3, 2);
        ctx.fillRect(a.torsoX - 2, a.torsoY + a.walk.bob + 7, 2, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.torsoX + a.torsoW, a.torsoY + a.walk.bob + 3, 2, 3);
        ctx.fillRect(a.torsoX + a.torsoW, a.torsoY + a.walk.bob + 6, 3, 2);
        ctx.fillRect(a.torsoX + a.torsoW, a.torsoY + a.walk.bob + 8, 2, 3);
    }
    ctx.globalAlpha = 0.6;

    // --- Big translucent head with flowing ectoplasm ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH + 2, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH + 2, colors.mid);
    // Flowing ectoplasmic wisps from top of head
    ctx.fillStyle = colors.skin;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(a.headX + 2, a.headY - 4, 4, 5);
    ctx.fillRect(a.headX + a.headW - 6, a.headY - 5, 4, 6);
    ctx.fillRect(a.headX + Math.floor(a.headW / 2) - 1, a.headY - 7, 3, 7);
    // Thinner wisps reaching higher
    ctx.globalAlpha = 0.2;
    ctx.fillRect(a.headX + 3, a.headY - 7, 2, 4);
    ctx.fillRect(a.headX + a.headW - 5, a.headY - 8, 2, 4);
    ctx.fillRect(cx - 1, a.headY - 10, 2, 4);
    ctx.globalAlpha = 0.6;

    ctx.restore(); // Restore alpha

    // --- Deep hollow eye sockets with glowing pupils (always solid) ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.22);
        if (dir === DIR_DOWN) {
            // Deep hollow sockets (large, dark, oval)
            ctx.fillStyle = '#050510';
            ctx.fillRect(cx - 9, eyeY, 7, 8);
            ctx.fillRect(cx + 3, eyeY, 7, 8);
            ctx.fillRect(cx - 8, eyeY - 1, 5, 1);
            ctx.fillRect(cx + 4, eyeY - 1, 5, 1);
            ctx.fillRect(cx - 8, eyeY + 8, 5, 1);
            ctx.fillRect(cx + 4, eyeY + 8, 5, 1);
            // Glowing pupils floating inside
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 7, eyeY + 3, 3, 3);
            ctx.fillRect(cx + 5, eyeY + 3, 3, 3);
            // Pupil glow halo
            ctx.fillStyle = colors.eye;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(cx - 8, eyeY + 2, 5, 5);
            ctx.fillRect(cx + 4, eyeY + 2, 5, 5);
            ctx.globalAlpha = 1.0;
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 8;
            ctx.fillStyle = '#050510';
            ctx.fillRect(ex, eyeY, 7, 8);
            ctx.fillRect(ex + 1, eyeY - 1, 5, 1);
            ctx.fillRect(ex + 1, eyeY + 8, 5, 1);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 2, eyeY + 3, 3, 3);
            ctx.fillStyle = colors.eye;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(ex + 1, eyeY + 2, 5, 5);
            ctx.globalAlpha = 1.0;
        }
        // Wider O-shaped wailing mouth
        if (dir === DIR_DOWN) {
            const mouthY = a.headY + Math.floor(a.headH * 0.7);
            ctx.fillStyle = '#050510';
            ctx.fillRect(cx - 4, mouthY, 8, 4);
            ctx.fillRect(cx - 3, mouthY - 1, 6, 1);
            ctx.fillRect(cx - 3, mouthY + 4, 6, 1);
            // Inner mouth void
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 2, mouthY + 1, 4, 2);
        }
    }

    // --- Ethereal highlight sparkles ---
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(a.headX + 4, a.headY + 2, 3, 2);
    ctx.fillRect(a.headX + a.headW - 6, a.headY + 4, 2, 2);
    ctx.fillRect(a.torsoX + a.torsoW - 5, a.torsoY + 3 + a.walk.bob, 2, 2);
    ctx.fillRect(cx - 5, tailTop + 1, 2, 2);
    ctx.fillRect(cx + 4, tailTop + 3, 2, 1);
    ctx.fillRect(cx - 2, tailTop + 6, 1, 1);

    // --- Front arms (wispy, fading at tips) ---
    ctx.save();
    ctx.globalAlpha = 0.6;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH - 2, colors.skin, colors.outline);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + a.armH - 3, a.armW - 2, 4);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.globalAlpha = 0.6;
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH - 2, colors.skin, colors.outline);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.leftArmX + 1, a.shoulderY + a.walk.armL + a.armH - 3, a.armW - 2, 4);
    }
    ctx.restore();
}

// ── Race 11: Golem ──────────────────────────────────────────────────────────
function _drawGolem(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const stoneColor = colors.skin;
    const stoneDark = colors.outline;
    const stoneMid = colors.mid;
    const runeColor = colors.eye;
    const crystalColor = '#77aadd';
    const crystalBright = '#aaddff';

    // --- Dust particles at feet ---
    ctx.fillStyle = stoneMid;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(cx - 10, a.feetY + 1, 2, 1);
    ctx.fillRect(cx + 8, a.feetY + 2, 2, 1);
    ctx.fillRect(cx - 6, a.feetY + 3, 1, 1);
    ctx.fillRect(cx + 5, a.feetY + 1, 1, 1);
    ctx.globalAlpha = 1.0;

    // --- Massive pillar legs (widest, no knee) ---
    const golemLegW = a.legW + 5;
    const legLX = Math.floor(cx - golemLegW - 2);
    const legRX = Math.floor(cx + 2);
    _drawRoundedRect(ctx, legLX, a.legsTopY + a.walk.legL, golemLegW, a.legH + 1, stoneColor, stoneDark);
    _drawSoftShading(ctx, legLX, a.legsTopY + a.walk.legL, golemLegW, a.legH + 1, stoneMid);
    _drawRoundedRect(ctx, legRX, a.legsTopY + a.walk.legR, golemLegW, a.legH + 1, stoneColor, stoneDark);
    _drawSoftShading(ctx, legRX, a.legsTopY + a.walk.legR, golemLegW, a.legH + 1, stoneMid);
    // Construction seams at leg joints
    ctx.fillStyle = stoneDark;
    ctx.fillRect(legLX + 1, a.legsTopY + a.walk.legL, golemLegW - 2, 1);
    ctx.fillRect(legRX + 1, a.legsTopY + a.walk.legR, golemLegW - 2, 1);
    // Flat heavy stone feet
    ctx.fillRect(legLX - 2, a.legsTopY + a.walk.legL + a.legH, golemLegW + 4, 2);
    ctx.fillRect(legRX - 2, a.legsTopY + a.walk.legR + a.legH, golemLegW + 4, 2);
    // Rune on left leg
    ctx.fillStyle = runeColor;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(legLX + 2, a.legsTopY + a.walk.legL + 3, 3, 3);
    ctx.globalAlpha = 1.0;

    // --- Back massive arms ---
    const golemArmW = a.armW + 5;
    const golemArmH = a.armH + 2;
    const armLX = Math.floor(cx - a.torsoW / 2 - golemArmW - 2);
    const armRX = Math.floor(cx + a.torsoW / 2 + 2);
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, armRX, a.shoulderY + a.walk.armR, golemArmW, golemArmH, stoneColor, stoneDark);
        _drawSoftShading(ctx, armRX, a.shoulderY + a.walk.armR, golemArmW, golemArmH, stoneMid);
        // Seam at shoulder joint
        ctx.fillStyle = stoneDark;
        ctx.fillRect(armRX + 1, a.shoulderY + a.walk.armR, golemArmW - 2, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, armLX, a.shoulderY + a.walk.armL, golemArmW, golemArmH, stoneColor, stoneDark);
        _drawSoftShading(ctx, armLX, a.shoulderY + a.walk.armL, golemArmW, golemArmH, stoneMid);
        ctx.fillStyle = stoneDark;
        ctx.fillRect(armLX + 1, a.shoulderY + a.walk.armL, golemArmW - 2, 1);
    }

    // --- Massive blocky torso (widest race) ---
    const golemTorsoW = a.torsoW + 12;
    const golemTorsoX = Math.floor(cx - golemTorsoW / 2);
    _drawRoundedRect(ctx, golemTorsoX, a.torsoY + a.walk.bob, golemTorsoW, a.torsoH + 2, stoneColor, stoneDark);
    _drawSoftShading(ctx, golemTorsoX, a.torsoY + a.walk.bob, golemTorsoW, a.torsoH + 2, stoneMid);
    // Stone color variations (lighter and darker patches)
    ctx.fillStyle = stoneMid;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(golemTorsoX + 2, a.torsoY + a.walk.bob + 1, 5, 4);
    ctx.fillRect(golemTorsoX + golemTorsoW - 7, a.torsoY + a.walk.bob + 5, 4, 3);
    ctx.globalAlpha = 1.0;

    // Crack pattern network on torso
    ctx.fillStyle = stoneDark;
    ctx.fillRect(golemTorsoX + 3, a.torsoY + a.walk.bob + 3, 6, 1);
    ctx.fillRect(golemTorsoX + 7, a.torsoY + a.walk.bob + 3, 1, 4);
    ctx.fillRect(golemTorsoX + 7, a.torsoY + a.walk.bob + 6, 4, 1);
    ctx.fillRect(golemTorsoX + golemTorsoW - 9, a.torsoY + a.walk.bob + 2, 1, 5);
    ctx.fillRect(golemTorsoX + golemTorsoW - 9, a.torsoY + a.walk.bob + 2, 4, 1);
    ctx.fillRect(golemTorsoX + golemTorsoW - 6, a.torsoY + a.walk.bob + a.torsoH - 2, 5, 1);

    // Glowing chest rune (large, with cross pattern)
    if (dir !== DIR_UP) {
        ctx.fillStyle = runeColor;
        ctx.fillRect(cx - 3, a.torsoY + a.walk.bob + 2, 6, 6);
        // Cross shape inside rune
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob + 2, 2, 6);
        ctx.fillRect(cx - 3, a.torsoY + a.walk.bob + 4, 6, 2);
        // Glow halo
        ctx.fillStyle = runeColor;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(cx - 5, a.torsoY + a.walk.bob + 1, 10, 8);
        ctx.globalAlpha = 1.0;
    }
    // Construction seam at waist
    ctx.fillStyle = stoneDark;
    ctx.fillRect(golemTorsoX + 2, a.torsoY + a.walk.bob + a.torsoH, golemTorsoW - 4, 1);

    // --- Crystal growths on shoulders ---
    if (dir !== DIR_UP) {
        // Left shoulder crystals
        ctx.fillStyle = crystalColor;
        ctx.fillRect(golemTorsoX - 1, a.shoulderY + a.walk.bob - 5, 3, 6);
        ctx.fillRect(golemTorsoX + 1, a.shoulderY + a.walk.bob - 8, 2, 4);
        ctx.fillStyle = crystalBright;
        ctx.fillRect(golemTorsoX, a.shoulderY + a.walk.bob - 4, 1, 3);
        // Right shoulder crystals
        ctx.fillStyle = crystalColor;
        ctx.fillRect(golemTorsoX + golemTorsoW - 2, a.shoulderY + a.walk.bob - 4, 3, 5);
        ctx.fillRect(golemTorsoX + golemTorsoW - 3, a.shoulderY + a.walk.bob - 7, 2, 4);
        ctx.fillStyle = crystalBright;
        ctx.fillRect(golemTorsoX + golemTorsoW - 1, a.shoulderY + a.walk.bob - 3, 1, 3);
    }

    // --- Square head (no neck, directly on torso) ---
    const golemHeadW = a.headW + 4;
    const golemHeadX = Math.floor(cx - golemHeadW / 2);
    _drawRoundedRect(ctx, golemHeadX, a.headY + 2, golemHeadW, a.headH - 2, stoneColor, stoneDark);
    _drawSoftShading(ctx, golemHeadX, a.headY + 2, golemHeadW, a.headH - 2, stoneMid);
    // Forehead rune
    if (dir !== DIR_UP) {
        ctx.fillStyle = runeColor;
        ctx.fillRect(cx - 2, a.headY + 3, 4, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 1, a.headY + 4, 2, 1);
        // Rune glow
        ctx.fillStyle = runeColor;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(cx - 3, a.headY + 2, 6, 5);
        ctx.globalAlpha = 1.0;
    }
    // Head crack network
    ctx.fillStyle = stoneDark;
    ctx.fillRect(golemHeadX + golemHeadW - 6, a.headY + 4, 1, 8);
    ctx.fillRect(golemHeadX + golemHeadW - 7, a.headY + 6, 1, 5);
    ctx.fillRect(golemHeadX + golemHeadW - 8, a.headY + 8, 1, 3);
    ctx.fillRect(golemHeadX + 4, a.headY + a.headH - 4, 4, 1);
    ctx.fillRect(golemHeadX + 4, a.headY + a.headH - 5, 1, 2);

    // --- Rectangular glowing eyes ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35);
        ctx.fillStyle = runeColor;
        if (dir === DIR_DOWN) {
            // Wide rectangular eyes
            ctx.fillRect(cx - 9, eyeY, 7, 4);
            ctx.fillRect(cx + 3, eyeY, 7, 4);
            // Glow halo
            ctx.fillStyle = runeColor;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(cx - 10, eyeY - 1, 9, 6);
            ctx.fillRect(cx + 2, eyeY - 1, 9, 6);
            ctx.globalAlpha = 1.0;
            // Bright center
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 7, eyeY + 1, 3, 2);
            ctx.fillRect(cx + 5, eyeY + 1, 3, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 8;
            ctx.fillStyle = runeColor;
            ctx.fillRect(ex, eyeY, 7, 4);
            ctx.fillStyle = runeColor;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(ex - 1, eyeY - 1, 9, 6);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 2, eyeY + 1, 3, 2);
        }
    }

    // --- Biggest fists at arm bottoms ---
    const fistW = golemArmW + 3;
    const fistH = 4;
    ctx.fillStyle = stoneColor;
    ctx.fillRect(armLX - 1, a.shoulderY + a.walk.armL + golemArmH - 1, fistW, fistH);
    ctx.fillRect(armRX - 1, a.shoulderY + a.walk.armR + golemArmH - 1, fistW, fistH);
    ctx.fillStyle = stoneDark;
    ctx.fillRect(armLX - 1, a.shoulderY + a.walk.armL + golemArmH + fistH - 2, fistW, 1);
    ctx.fillRect(armRX - 1, a.shoulderY + a.walk.armR + golemArmH + fistH - 2, fistW, 1);
    // Rune on arm
    ctx.fillStyle = runeColor;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(armLX + 2, a.shoulderY + a.walk.armL + 4, 3, 3);
    ctx.fillRect(armRX + 2, a.shoulderY + a.walk.armR + 4, 3, 3);
    ctx.globalAlpha = 1.0;

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, armRX, a.shoulderY + a.walk.armR, golemArmW, golemArmH, stoneColor, stoneDark);
        _drawSoftShading(ctx, armRX, a.shoulderY + a.walk.armR, golemArmW, golemArmH, stoneMid);
        ctx.fillStyle = stoneDark;
        ctx.fillRect(armRX + 1, a.shoulderY + a.walk.armR, golemArmW - 2, 1);
        // Fist
        ctx.fillStyle = stoneColor;
        ctx.fillRect(armRX - 1, a.shoulderY + a.walk.armR + golemArmH - 1, fistW, fistH);
        ctx.fillStyle = stoneDark;
        ctx.fillRect(armRX - 1, a.shoulderY + a.walk.armR + golemArmH + fistH - 2, fistW, 1);
        // Arm rune
        ctx.fillStyle = runeColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(armRX + 2, a.shoulderY + a.walk.armR + 4, 3, 3);
        ctx.globalAlpha = 1.0;
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, armLX, a.shoulderY + a.walk.armL, golemArmW, golemArmH, stoneColor, stoneDark);
        _drawSoftShading(ctx, armLX, a.shoulderY + a.walk.armL, golemArmW, golemArmH, stoneMid);
        ctx.fillStyle = stoneDark;
        ctx.fillRect(armLX + 1, a.shoulderY + a.walk.armL, golemArmW - 2, 1);
        ctx.fillStyle = stoneColor;
        ctx.fillRect(armLX - 1, a.shoulderY + a.walk.armL + golemArmH - 1, fistW, fistH);
        ctx.fillStyle = stoneDark;
        ctx.fillRect(armLX - 1, a.shoulderY + a.walk.armL + golemArmH + fistH - 2, fistW, 1);
        ctx.fillStyle = runeColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(armLX + 2, a.shoulderY + a.walk.armL + 4, 3, 3);
        ctx.globalAlpha = 1.0;
    }
}

// ── Race 12: Human ──────────────────────────────────────────────────────────
function _drawHuman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const tunicColor = '#4466aa';
    const tunicDark = '#335599';
    const tunicLight = '#5577bb';
    const beltColor = '#8b6914';
    const beltBuckle = '#ccaa33';
    const capeColor = '#993333';
    const capeDark = '#772222';
    const bootColor = '#554422';
    const bootLight = '#665533';

    // --- Cape/cloak from shoulders (back layer, all angles) ---
    if (dir === DIR_UP) {
        // Full cape visible from back
        ctx.fillStyle = capeColor;
        ctx.fillRect(a.torsoX - 3, a.shoulderY + a.walk.bob, a.torsoW + 6, a.torsoH + a.legH + 4);
        ctx.fillRect(a.torsoX - 2, a.shoulderY + a.walk.bob + a.torsoH + a.legH + 4, a.torsoW + 4, 2);
        // Cape shading
        ctx.fillStyle = capeDark;
        ctx.fillRect(a.torsoX - 1, a.shoulderY + a.walk.bob + 3, 4, a.torsoH + a.legH);
        ctx.fillRect(a.torsoX + a.torsoW - 3, a.shoulderY + a.walk.bob + 3, 4, a.torsoH + a.legH);
        // Cape clasp at neck
        ctx.fillStyle = beltBuckle;
        ctx.fillRect(cx - 2, a.shoulderY + a.walk.bob, 4, 2);
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        // Cape trailing behind
        const capeX = dir === DIR_LEFT ? cx + Math.floor(a.torsoW / 2) - 1 : cx - Math.floor(a.torsoW / 2) - 5;
        ctx.fillStyle = capeColor;
        ctx.fillRect(capeX, a.shoulderY + a.walk.bob, 6, a.torsoH + 6);
        ctx.fillRect(capeX + 1, a.shoulderY + a.walk.bob + a.torsoH + 6, 4, 3);
        ctx.fillStyle = capeDark;
        ctx.fillRect(capeX + 1, a.shoulderY + a.walk.bob + 2, 2, a.torsoH + 3);
    } else {
        // Cape peeking from behind shoulders (front view)
        ctx.fillStyle = capeColor;
        ctx.fillRect(a.torsoX - 3, a.shoulderY + a.walk.bob, 3, a.torsoH + 4);
        ctx.fillRect(a.torsoX + a.torsoW, a.shoulderY + a.walk.bob, 3, a.torsoH + 4);
        ctx.fillStyle = capeDark;
        ctx.fillRect(a.torsoX - 2, a.shoulderY + a.walk.bob + a.torsoH + 2, 2, 3);
        ctx.fillRect(a.torsoX + a.torsoW + 1, a.shoulderY + a.walk.bob + a.torsoH + 2, 2, 3);
    }

    // --- Legs ---
    _drawRoundedRect(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors.skin, colors.outline);
    _drawRoundedRect(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, colors.skin, colors.outline);
    // Detailed boots (taller, with cuff and sole detail)
    ctx.fillStyle = bootColor;
    const bLY = a.legsTopY + a.walk.legL + Math.floor(a.legH * 0.4);
    const bRY = a.legsTopY + a.walk.legR + Math.floor(a.legH * 0.4);
    ctx.fillRect(a.leftLegX - 1, bLY, a.legW + 2, a.legH - Math.floor(a.legH * 0.4) + 2);
    ctx.fillRect(a.rightLegX - 1, bRY, a.legW + 2, a.legH - Math.floor(a.legH * 0.4) + 2);
    // Boot cuff trim
    ctx.fillStyle = bootLight;
    ctx.fillRect(a.leftLegX - 1, bLY, a.legW + 2, 1);
    ctx.fillRect(a.rightLegX - 1, bRY, a.legW + 2, 1);
    // Boot sole
    ctx.fillStyle = '#332211';
    ctx.fillRect(a.leftLegX - 2, a.legsTopY + a.walk.legL + a.legH, a.legW + 3, 2);
    ctx.fillRect(a.rightLegX - 1, a.legsTopY + a.walk.legR + a.legH, a.legW + 3, 2);

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors.skin, colors.outline);
        // Wristguard on back arm
        ctx.fillStyle = bootColor;
        ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH - 4, a.armW + 2, 3);
        ctx.fillStyle = bootLight;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + a.armH - 4, a.armW, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors.skin, colors.outline);
        ctx.fillStyle = bootColor;
        ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH - 4, a.armW + 2, 3);
        ctx.fillStyle = bootLight;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH - 4, a.armW, 1);
    }

    // --- Tunic torso with belt, collar, and cuffs ---
    _drawRoundedRect(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, tunicColor, colors.outline);
    _drawSoftShading(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, tunicDark);
    // Collar detail (V-shape or round)
    if (dir !== DIR_UP) {
        ctx.fillStyle = tunicLight;
        ctx.fillRect(a.torsoX + 2, a.torsoY + a.walk.bob, a.torsoW - 4, 2);
        // V-neck line
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob, 2, 3);
    }
    // Tunic hem trim
    ctx.fillStyle = tunicLight;
    ctx.fillRect(a.torsoX + 1, a.torsoY + a.walk.bob + a.torsoH - 1, a.torsoW - 2, 1);
    // Belt with buckle
    ctx.fillStyle = beltColor;
    ctx.fillRect(a.torsoX + 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.6), a.torsoW - 2, 2);
    // Belt buckle (shiny center)
    if (dir !== DIR_UP) {
        ctx.fillStyle = beltBuckle;
        ctx.fillRect(cx - 2, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.6), 4, 2);
        ctx.fillStyle = '#eedd55';
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH * 0.6), 2, 1);
    }
    // Shoulder cuffs
    ctx.fillStyle = tunicLight;
    ctx.fillRect(a.torsoX - 1, a.shoulderY + a.walk.bob, 3, 2);
    ctx.fillRect(a.torsoX + a.torsoW - 2, a.shoulderY + a.walk.bob, 3, 2);

    // --- Head ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // --- Styled hair with bangs ---
    ctx.fillStyle = colors.hair;
    if (dir !== DIR_UP) {
        // Top hair
        ctx.fillRect(a.headX - 2, a.headY - 3, a.headW + 4, 6);
        ctx.fillRect(a.headX - 1, a.headY - 5, a.headW + 2, 3);
        // Side framing hair
        ctx.fillRect(a.headX - 2, a.headY + 3, 3, 6);
        ctx.fillRect(a.headX + a.headW - 1, a.headY + 3, 3, 6);
        // Bangs (asymmetric, heroic style)
        ctx.fillRect(a.headX + 2, a.headY - 1, 5, 4);
        ctx.fillRect(a.headX + a.headW - 8, a.headY, 4, 3);
        // Hair highlight
        ctx.fillStyle = colors.mid || colors.hair;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(a.headX + 4, a.headY - 3, 3, 4);
        ctx.globalAlpha = 1.0;
    } else {
        // Back hair
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.headX - 2, a.headY - 1, a.headW + 4, a.headH + 3);
        ctx.fillRect(a.headX - 1, a.headY - 4, a.headW + 2, 4);
    }

    // --- Anime-style oval eyes with highlights (NOT dots) ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            // Large oval eye whites
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 9, eyeY, 7, 6);
            ctx.fillRect(cx - 10, eyeY + 1, 1, 4);
            ctx.fillRect(cx + 3, eyeY, 7, 6);
            ctx.fillRect(cx + 10, eyeY + 1, 1, 4);
            // Colored iris (large)
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 7, eyeY + 1, 4, 4);
            ctx.fillRect(cx + 4, eyeY + 1, 4, 4);
            // Dark pupil
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 6, eyeY + 2, 2, 3);
            ctx.fillRect(cx + 5, eyeY + 2, 2, 3);
            // Big highlight sparkle (anime style)
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 8, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 3, eyeY + 1, 2, 2);
            // Small secondary highlight
            ctx.fillRect(cx - 5, eyeY + 4, 1, 1);
            ctx.fillRect(cx + 7, eyeY + 4, 1, 1);
            // Thin upper lash line
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 9, eyeY - 1, 7, 1);
            ctx.fillRect(cx + 3, eyeY - 1, 7, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 8;
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex, eyeY, 7, 6);
            ctx.fillRect(ex - 1, eyeY + 1, 1, 4);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 2, eyeY + 1, 4, 4);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex + 3, eyeY + 2, 2, 3);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
            ctx.fillStyle = colors.outline;
            ctx.fillRect(ex, eyeY - 1, 7, 1);
        }
        // Small determined mouth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 2, a.headY + a.headH - 5, 4, 1);
            ctx.fillStyle = '#cc8888';
            ctx.fillRect(cx - 1, a.headY + a.headH - 4, 2, 1);
        }
    }

    // --- Cape clasp at collar (front view) ---
    if (dir === DIR_DOWN) {
        ctx.fillStyle = beltBuckle;
        ctx.fillRect(a.torsoX - 1, a.shoulderY + a.walk.bob, 2, 2);
        ctx.fillRect(a.torsoX + a.torsoW - 1, a.shoulderY + a.walk.bob, 2, 2);
    }

    // --- Front arms with wristguards ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors.skin, colors.outline);
        ctx.fillStyle = bootColor;
        ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH - 4, a.armW + 2, 3);
        ctx.fillStyle = bootLight;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + a.armH - 4, a.armW, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors.skin, colors.outline);
        ctx.fillStyle = bootColor;
        ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH - 4, a.armW + 2, 3);
        ctx.fillStyle = bootLight;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH - 4, a.armW, 1);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════════════════

const RACE_RENDERERS = {
    1:  _drawBugman,
    2:  _drawBearman,
    3:  _drawBirdman,
    4:  _drawDemon,
    5:  _drawDevil,
    6:  _drawCatman,
    7:  _drawElf,
    8:  _drawEnt,
    9:  _drawFishman,
    10: _drawGhost,
    11: _drawGolem,
    12: _drawHuman,
};

/**
 * Draw a race-specific humanoid body and return anchor points for equipment overlay.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} raceId — 1-12
 * @param {number} cx — center X of frame
 * @param {number} groundY — bottom Y (ground line)
 * @param {number} dir — 0=Down, 1=Left, 2=Right, 3=Up
 * @param {number} frame — walk cycle frame 0-3
 * @param {number} scale — evolution scale (0.9-1.0)
 * @param {Object} colors — { skin, mid, outline, hair, eye }
 * @returns {Object} anchor points for equipment positioning
 */
export function drawRaceBody(ctx, raceId, cx, groundY, dir, frame, scale, colors) {
    const walk = WALK_CYCLES[frame % 4];

    // Chibi doodle proportions: oversized head, tiny body, stubby limbs (~2.5 heads tall)
    const dims = {
        headW: 22, headH: 20,
        torsoW: 16, torsoH: 12,
        armW: 5, armH: 12,
        legW: 6, legH: 10,
    };

    const a = _buildAnchors(cx, groundY, scale, walk, dims);
    const renderer = RACE_RENDERERS[raceId] || _drawHuman;
    renderer(ctx, a, dir, colors);

    return a;
}

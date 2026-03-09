/**
 * RaceBodyRenderer.js — Race-specific humanoid body rendering (Races 1-12).
 * Each race has a unique body shape, head features, and distinguishing characteristics
 * drawn in 64×64 logical space, rendered at 256×256 via 4× supersampling.
 *
 * Art style: Flat cel-shaded, clean black outlines of uniform thickness, smooth rounded edges,
 * chibi proportions (head ~40% of total height), vibrant saturated colors,
 * hard-edged shading (3 flat fills per color zone: highlight, base, shadow),
 * NO gradients, simple dot eyes (small filled black circles), no pixel art.
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

// Walk animation cycles (4 frames) — bouncier chibi walk
const WALK_CYCLES = [
    { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0  },
    { armL: -4, armR: 4,  legL: 4,  legR: -2, bob: -2 },
    { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0  },
    { armL: 4,  armR: -4, legL: -2, legR: 4,  bob: -2 },
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

// ── Clean Cel-Shaded Style Helpers ──────────────────────────────────────────

/** Clean uniform-thickness outline around a rounded rectangle */
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

/** Hard-edged shadow zone on the right side (flat fill, no gradient, rounded edges) */
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

/** Hard-edged cel-shade shadow on right half (flat fill, no gradient, rounded edges) */
function _drawSoftShading(ctx, x, y, w, h, midColor) {
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

// ── Simple dot eyes (small filled black circles) ──────────────────────────
function _drawEyes(ctx, cx, eyeY, dir, colors, spacing) {
    const sp = spacing || 7;
    ctx.fillStyle = '#111111';
    if (dir === DIR_DOWN) {
        // Two small filled black dots
        ctx.fillRect(cx - sp - 1, eyeY + 2, 3, 3);
        ctx.fillRect(cx + sp - 1, eyeY + 2, 3, 3);
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        // Single dot for side view
        const ex = dir === DIR_RIGHT ? cx + 3 : cx - 5;
        ctx.fillRect(ex, eyeY + 2, 3, 3);
    }
}

// ── Simple small mouth ──────────────────────────────────────────────────
function _drawMouth(ctx, cx, y, dir, outlineColor) {
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#111111';
        // Simple small line mouth
        ctx.fillRect(cx - 1, y, 3, 1);
    }
}

// ── Clean blush marks (simple flat pink rectangles on cheeks) ────────────
function _drawBlush(ctx, cx, blushY, dir, spacing) {
    // No blush in clean cel-shaded style — keeping function as no-op for compatibility
}

// ── Fluffy chibi hair ────────────────────────────────────────────────────
function _drawHairTop(ctx, x, y, w, dir, hairColor) {
    if (dir !== DIR_UP) {
        ctx.fillStyle = hairColor;
        // Bigger, fluffier hair for chibi
        ctx.fillRect(x - 2, y - 3, w + 4, 6);
        ctx.fillRect(x - 1, y - 5, w + 2, 3);
        // Side bangs
        if (dir === DIR_DOWN || dir === DIR_LEFT) {
            ctx.fillRect(x - 3, y + 1, 4, 7);
        }
        if (dir === DIR_DOWN || dir === DIR_RIGHT) {
            ctx.fillRect(x + w - 1, y + 1, 4, 7);
        }
        // Hair tuft on top
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

// ── Cute round chibi shoes ───────────────────────────────────────────────
function _drawShoes(ctx, lx, ly, rx, ry, legW, colors) {
    ctx.fillStyle = '#553322';
    // Rounder, cuter shoes
    ctx.fillRect(lx - 1, ly, legW + 2, 3);
    ctx.fillRect(lx, ly + 3, legW, 1);
    ctx.fillRect(rx - 1, ry, legW + 2, 3);
    ctx.fillRect(rx, ry + 3, legW, 1);
    // Shoe highlight
    ctx.fillStyle = '#775544';
    ctx.fillRect(lx, ly, legW, 1);
    ctx.fillRect(rx, ry, legW, 1);
}

function _drawTunic(ctx, x, y, w, h, skinColor) {
    const r = parseInt(skinColor.slice(1, 3), 16) - 30;
    const g = parseInt(skinColor.slice(3, 5), 16) - 30;
    const b = parseInt(skinColor.slice(5, 7), 16) - 30;
    ctx.fillStyle = `rgb(${Math.max(0, r)},${Math.max(0, g)},${Math.max(0, b)})`;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 1);
    // Belt detail
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

    // Chibi proportions: big head on top, compact body below
    const feetY = groundY;
    const legsTopY = feetY - legH;
    const torsoTopY = legsTopY - torsoH + 1;
    const headTopY = torsoTopY - headH + 4 + walk.bob;  // head overlaps torso more
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

    // Back arms (stubby chibi arms)
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

    // Face — large anime eyes, small mouth, blush marks
    const eyeY = headY + Math.floor(headH * 0.3);
    _drawEyes(ctx, cx, eyeY, dir, colors);
    _drawMouth(ctx, cx, headY + headH - 5, dir, colors.outline);
    _drawBlush(ctx, cx, eyeY + 9, dir);
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
    ctx.fillRect(torsoX + 2, torsoY + walk.bob + 3, torsoW - 4, 1);
    ctx.fillRect(torsoX + 2, torsoY + walk.bob + 7, torsoW - 4, 1);

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

    // --- Big chibi bug head (extra-wide for compound eyes) ---
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

    // --- Big round chibi bear head ---
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
        ctx.fillStyle = beakColor;
        ctx.fillRect(cx - 4, a.headY + a.headH - 8, 8, 5);
        ctx.fillRect(cx - 3, a.headY + a.headH - 3, 6, 3);
        ctx.fillRect(cx - 2, a.headY + a.headH, 4, 2);
        // Beak seam line
        ctx.fillStyle = beakDark;
        ctx.fillRect(cx - 3, a.headY + a.headH - 5, 6, 1);
        // Nostril dots
        ctx.fillStyle = '#997722';
        ctx.fillRect(cx - 2, a.headY + a.headH - 7, 1, 1);
        ctx.fillRect(cx + 2, a.headY + a.headH - 7, 1, 1);
        // Beak tip (darker)
        ctx.fillStyle = beakDark;
        ctx.fillRect(cx - 1, a.headY + a.headH + 1, 2, 1);
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
    // Devil is sleek and slim — the trickster archetype (contrast with Demon's bulk)
    const devilTorsoW = a.torsoW - 2;
    const devilTorsoX = Math.floor(cx - devilTorsoW / 2);
    const devilArmW = a.armW - 1;
    const devilLegW = a.legW - 1;
    const hornColor = '#665544';
    const hornLight = '#887766';
    const hoofColor = '#443333';
    // Darker fitted tunic color derived from skin
    const tunicR = Math.max(0, parseInt(colors.skin.slice(1, 3), 16) - 40);
    const tunicG = Math.max(0, parseInt(colors.skin.slice(3, 5), 16) - 40);
    const tunicB = Math.max(0, parseInt(colors.skin.slice(5, 7), 16) - 40);
    const tunicColor = `rgb(${tunicR},${tunicG},${tunicB})`;

    // --- Small refined imp wings (visible from back/sides) ---
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.outline;
        // Left imp wing (smaller than demon's)
        ctx.fillRect(devilTorsoX - 4, a.shoulderY - 1, 6, 6);
        ctx.fillRect(devilTorsoX - 7, a.shoulderY - 2, 4, 4);
        ctx.fillRect(devilTorsoX - 8, a.shoulderY - 1, 2, 2);
        // Right imp wing
        ctx.fillRect(devilTorsoX + devilTorsoW - 2, a.shoulderY - 1, 6, 6);
        ctx.fillRect(devilTorsoX + devilTorsoW + 3, a.shoulderY - 2, 4, 4);
        ctx.fillRect(devilTorsoX + devilTorsoW + 6, a.shoulderY - 1, 2, 2);
        // Wing membrane
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(devilTorsoX - 5, a.shoulderY, 4, 4);
        ctx.fillRect(devilTorsoX + devilTorsoW + 1, a.shoulderY, 4, 4);
        ctx.globalAlpha = 1.0;
    } else if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(devilTorsoX - 3, a.shoulderY, 4, 3);
        ctx.fillRect(devilTorsoX - 5, a.shoulderY - 1, 3, 2);
        ctx.fillRect(devilTorsoX + devilTorsoW - 1, a.shoulderY, 4, 3);
        ctx.fillRect(devilTorsoX + devilTorsoW + 2, a.shoulderY - 1, 3, 2);
    } else {
        const wingX = dir === DIR_LEFT ? cx + Math.floor(devilTorsoW / 2) : cx - Math.floor(devilTorsoW / 2) - 6;
        ctx.fillStyle = colors.outline;
        ctx.fillRect(wingX, a.shoulderY - 1, 6, 5);
        ctx.fillRect(wingX + 2, a.shoulderY - 3, 3, 3);
    }

    // --- Back slim arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, devilArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, devilArmW, a.armH, colors.mid);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, devilArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, devilArmW, a.armH, colors.mid);
    }

    // --- Slim legs with refined cloven hooves ---
    const legLX = Math.floor(cx - devilLegW - 1);
    const legRX = Math.floor(cx + 1);
    _drawRoundedRect(ctx, legLX, a.legsTopY + a.walk.legL, devilLegW, a.legH, colors.skin, colors.outline);
    _drawRoundedRect(ctx, legRX, a.legsTopY + a.walk.legR, devilLegW, a.legH, colors.skin, colors.outline);
    // Small refined cloven hooves
    ctx.fillStyle = hoofColor;
    const hLY = a.legsTopY + a.walk.legL + a.legH - 2;
    const hRY = a.legsTopY + a.walk.legR + a.legH - 2;
    ctx.fillRect(legLX - 1, hLY, devilLegW + 2, 3);
    ctx.fillRect(legRX - 1, hRY, devilLegW + 2, 3);
    // Hoof split (thinner than demon's)
    ctx.fillStyle = '#111';
    ctx.fillRect(legLX + Math.floor(devilLegW / 2), hLY, 1, 3);
    ctx.fillRect(legRX + Math.floor(devilLegW / 2), hRY, 1, 3);

    // --- Forked tail (clearly different from demon's spade tail) ---
    if (dir === DIR_LEFT || dir === DIR_RIGHT || dir === DIR_UP) {
        const tailDir = dir === DIR_UP ? DIR_LEFT : dir;
        const tailSign = tailDir === DIR_LEFT ? 1 : -1;
        const tailBaseX = tailDir === DIR_LEFT ? cx + Math.floor(devilTorsoW / 2) : cx - Math.floor(devilTorsoW / 2) - 3;
        const tailBaseY = a.torsoY + a.torsoH - 3 + a.walk.bob;
        // Thin whip-like tail (thinner than demon)
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tailBaseX, tailBaseY, 2, 2);
        ctx.fillRect(tailBaseX + tailSign * 2, tailBaseY - 1, 2, 2);
        ctx.fillRect(tailBaseX + tailSign * 4, tailBaseY - 2, 2, 2);
        ctx.fillRect(tailBaseX + tailSign * 6, tailBaseY - 3, 2, 2);
        ctx.fillRect(tailBaseX + tailSign * 8, tailBaseY - 4, 2, 2);
        // Forked tip (two prongs splitting apart)
        ctx.fillStyle = colors.outline;
        const forkX = tailBaseX + tailSign * 9;
        ctx.fillRect(forkX, tailBaseY - 6, 2, 3);
        ctx.fillRect(forkX + tailSign * 1, tailBaseY - 7, 1, 2);
        ctx.fillRect(forkX, tailBaseY - 2, 2, 3);
        ctx.fillRect(forkX + tailSign * 1, tailBaseY + 1, 1, 2);
    }

    // --- Slim torso with fitted tunic ---
    _drawRoundedRect(ctx, devilTorsoX, a.torsoY + a.walk.bob, devilTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, devilTorsoX, a.torsoY + a.walk.bob, devilTorsoW, a.torsoH, colors.mid);
    // Fitted dark tunic overlay
    ctx.fillStyle = tunicColor;
    ctx.fillRect(devilTorsoX + 1, a.torsoY + a.walk.bob + 1, devilTorsoW - 2, a.torsoH - 2);
    // Tunic belt/sash
    ctx.fillStyle = colors.outline;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(devilTorsoX + 2, a.torsoY + a.walk.bob + a.torsoH - 3, devilTorsoW - 4, 2);
    ctx.globalAlpha = 1.0;

    // --- Devil head (slightly narrower, pointed chin) ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // --- Pointed ears (visible from front and sides) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 4, a.headY + 4, 5, 4);
        ctx.fillRect(a.headX - 6, a.headY + 5, 3, 2);
        ctx.fillRect(a.headX - 8, a.headY + 5, 2, 1);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 8, a.headY + 5, 1, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW - 1, a.headY + 4, 5, 4);
        ctx.fillRect(a.headX + a.headW + 3, a.headY + 5, 3, 2);
        ctx.fillRect(a.headX + a.headW + 6, a.headY + 5, 2, 1);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX + a.headW + 7, a.headY + 5, 1, 1);
    }

    // --- Swept-back elegant horns (curved backwards, thin and refined) ---
    ctx.fillStyle = hornColor;
    if (dir !== DIR_UP) {
        // Left horn — sweeping back elegantly
        ctx.fillRect(a.headX + 1, a.headY - 3, 3, 3);
        ctx.fillRect(a.headX - 1, a.headY - 6, 3, 4);
        ctx.fillRect(a.headX - 3, a.headY - 9, 3, 4);
        ctx.fillRect(a.headX - 5, a.headY - 11, 2, 3);
        ctx.fillRect(a.headX - 6, a.headY - 12, 1, 2);
        // Right horn — mirror
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 3, 3, 3);
        ctx.fillRect(a.headX + a.headW - 2, a.headY - 6, 3, 4);
        ctx.fillRect(a.headX + a.headW, a.headY - 9, 3, 4);
        ctx.fillRect(a.headX + a.headW + 3, a.headY - 11, 2, 3);
        ctx.fillRect(a.headX + a.headW + 5, a.headY - 12, 1, 2);
        // Horn shine
        ctx.fillStyle = hornLight;
        ctx.fillRect(a.headX, a.headY - 4, 1, 2);
        ctx.fillRect(a.headX + a.headW - 1, a.headY - 4, 1, 2);
    } else {
        // Horns from back
        ctx.fillRect(a.headX - 2, a.headY - 5, 4, 5);
        ctx.fillRect(a.headX - 4, a.headY - 9, 3, 5);
        ctx.fillRect(a.headX + a.headW - 2, a.headY - 5, 4, 5);
        ctx.fillRect(a.headX + a.headW + 1, a.headY - 9, 3, 5);
    }

    // --- Mischievous sly eyes (narrow, angled) ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            // Narrow sly angled eyes (different angle than demon — upward slant outward)
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 9, eyeY + 2, 6, 2);
            ctx.fillRect(cx - 10, eyeY + 1, 3, 1); // Upward slant on outer edge
            ctx.fillRect(cx + 4, eyeY + 2, 6, 2);
            ctx.fillRect(cx + 8, eyeY + 1, 3, 1);
            // Pupil dots
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 7, eyeY + 2, 2, 2);
            ctx.fillRect(cx + 6, eyeY + 2, 2, 2);
            // Thin brow (raised, mischievous)
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 9, eyeY, 7, 1);
            ctx.fillRect(cx + 3, eyeY, 7, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 8;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY + 2, 6, 2);
            ctx.fillRect(ex + (dir === DIR_RIGHT ? 4 : -1), eyeY + 1, 2, 1);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex + 2, eyeY + 2, 2, 2);
            ctx.fillStyle = colors.outline;
            ctx.fillRect(ex, eyeY, 6, 1);
        }

        // Smirking mouth with sharp canine teeth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#111';
            // Sly smirk (asymmetric, wider on one side)
            ctx.fillRect(cx - 3, a.headY + a.headH - 5, 7, 2);
            ctx.fillRect(cx + 4, a.headY + a.headH - 6, 1, 1); // Smirk uptick
            // Sharp canine fangs
            ctx.fillStyle = '#ddd';
            ctx.fillRect(cx - 3, a.headY + a.headH - 5, 1, 2);
            ctx.fillRect(cx + 3, a.headY + a.headH - 5, 1, 2);
        }

        // Pointed goatee/chin beard
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.hair;
            ctx.fillRect(cx - 2, a.headY + a.headH - 2, 4, 3);
            ctx.fillRect(cx - 1, a.headY + a.headH + 1, 2, 3);
            ctx.fillRect(cx, a.headY + a.headH + 4, 1, 2);
        }
    }

    // --- Dark energy wisps around hands (optional accent) ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.eye;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH, devilArmW + 2, 2);
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + a.armH, devilArmW + 2, 2);
        ctx.globalAlpha = 1.0;
    }

    // --- Front slim arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, devilArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, devilArmW, a.armH, colors.mid);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, devilArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, devilArmW, a.armH, colors.mid);
    }
}

// ── Race 6: Cat man ─────────────────────────────────────────────────────────
function _drawCatman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    // Cat is slender and agile — narrower than standard
    const catTorsoW = a.torsoW - 3;
    const catTorsoX = Math.floor(cx - catTorsoW / 2);
    const catArmW = a.armW - 1;
    const catLegW = a.legW - 1;
    // Darker stripe color for fur markings
    const stripeR = Math.max(0, parseInt(colors.skin.slice(1, 3), 16) - 35);
    const stripeG = Math.max(0, parseInt(colors.skin.slice(3, 5), 16) - 35);
    const stripeB = Math.max(0, parseInt(colors.skin.slice(5, 7), 16) - 35);
    const stripeColor = `rgb(${stripeR},${stripeG},${stripeB})`;
    // Lighter belly color
    const bellyR = Math.min(255, parseInt(colors.skin.slice(1, 3), 16) + 25);
    const bellyG = Math.min(255, parseInt(colors.skin.slice(3, 5), 16) + 25);
    const bellyB = Math.min(255, parseInt(colors.skin.slice(5, 7), 16) + 25);
    const bellyColor = `rgb(${bellyR},${bellyG},${bellyB})`;

    // --- Long curving tail (visible from all directions) ---
    // Draw tail FIRST so body draws over the base
    if (dir !== DIR_DOWN) {
        const tailDir = dir === DIR_UP ? DIR_LEFT : dir;
        const tailSign = tailDir === DIR_LEFT ? 1 : -1;
        const tailBaseX = tailDir === DIR_LEFT ? cx + Math.floor(catTorsoW / 2) : cx - Math.floor(catTorsoW / 2) - 3;
        const tailBaseY = a.torsoY + a.torsoH - 3 + a.walk.bob;
        ctx.fillStyle = colors.skin;
        // S-curve tail going up
        ctx.fillRect(tailBaseX, tailBaseY, 3, 2);
        ctx.fillRect(tailBaseX + tailSign * 2, tailBaseY - 2, 3, 3);
        ctx.fillRect(tailBaseX + tailSign * 4, tailBaseY - 5, 3, 4);
        ctx.fillRect(tailBaseX + tailSign * 5, tailBaseY - 8, 3, 4);
        ctx.fillRect(tailBaseX + tailSign * 4, tailBaseY - 11, 3, 4);
        ctx.fillRect(tailBaseX + tailSign * 2, tailBaseY - 13, 3, 3);
        // Fluffy tail tip (darker stripe)
        ctx.fillStyle = stripeColor;
        ctx.fillRect(tailBaseX + tailSign * 1, tailBaseY - 15, 4, 4);
        ctx.fillRect(tailBaseX + tailSign * 2, tailBaseY - 16, 3, 2);
        // Tail outline accent
        ctx.fillStyle = colors.outline;
        ctx.fillRect(tailBaseX + tailSign * 2, tailBaseY - 16, 1, 1);
    }
    if (dir === DIR_DOWN) {
        // Tail curving up behind — just the tip visible above body
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx + 5, a.torsoY + a.walk.bob - 2, 3, 4);
        ctx.fillRect(cx + 7, a.torsoY + a.walk.bob - 4, 3, 3);
        ctx.fillStyle = stripeColor;
        ctx.fillRect(cx + 8, a.torsoY + a.walk.bob - 6, 3, 3);
    }

    // --- Back slim arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, catArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, catArmW, a.armH, colors.mid);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, catArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, catArmW, a.armH, colors.mid);
    }

    // --- Slim flexible legs ---
    const legLX = Math.floor(cx - catLegW - 1);
    const legRX = Math.floor(cx + 1);
    _drawRoundedRect(ctx, legLX, a.legsTopY + a.walk.legL, catLegW, a.legH, colors.skin, colors.outline);
    _drawRoundedRect(ctx, legRX, a.legsTopY + a.walk.legR, catLegW, a.legH, colors.skin, colors.outline);

    // --- Soft padded paw feet with visible bean toes (NO shoes) ---
    const feetLY = a.legsTopY + a.walk.legL + a.legH - 1;
    const feetRY = a.legsTopY + a.walk.legR + a.legH - 1;
    // Paw base
    ctx.fillStyle = colors.skin;
    ctx.fillRect(legLX - 1, feetLY, catLegW + 2, 3);
    ctx.fillRect(legRX - 1, feetRY, catLegW + 2, 3);
    // Pink toe bean pads (4 small toes + 1 main pad)
    ctx.fillStyle = '#ee88aa';
    // Left paw toes
    ctx.fillRect(legLX - 1, feetLY + 2, 2, 2);
    ctx.fillRect(legLX + 1, feetLY + 2, 2, 2);
    ctx.fillRect(legLX + 3, feetLY + 2, 2, 2);
    ctx.fillRect(legLX + 5, feetLY + 2, 2, 2);
    // Left main pad
    ctx.fillStyle = '#dd7799';
    ctx.fillRect(legLX + 1, feetLY, 4, 2);
    // Right paw toes
    ctx.fillStyle = '#ee88aa';
    ctx.fillRect(legRX - 1, feetRY + 2, 2, 2);
    ctx.fillRect(legRX + 1, feetRY + 2, 2, 2);
    ctx.fillRect(legRX + 3, feetRY + 2, 2, 2);
    ctx.fillRect(legRX + 5, feetRY + 2, 2, 2);
    ctx.fillStyle = '#dd7799';
    ctx.fillRect(legRX + 1, feetRY, 4, 2);

    // --- Slender torso with lighter belly and fur ruff at neck ---
    _drawRoundedRect(ctx, catTorsoX, a.torsoY + a.walk.bob, catTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, catTorsoX, a.torsoY + a.walk.bob, catTorsoW, a.torsoH, colors.mid);
    // Lighter belly fur
    ctx.fillStyle = bellyColor;
    ctx.fillRect(catTorsoX + 2, a.torsoY + a.walk.bob + 1, catTorsoW - 4, a.torsoH - 2);
    // Fur ruff/mane around neck (fluffy collar)
    if (dir !== DIR_UP) {
        ctx.fillStyle = bellyColor;
        ctx.fillRect(catTorsoX - 2, a.torsoY + a.walk.bob - 2, catTorsoW + 4, 4);
        ctx.fillRect(catTorsoX - 1, a.torsoY + a.walk.bob - 3, catTorsoW + 2, 2);
        // Ruff fur texture (jagged edge)
        ctx.fillStyle = colors.skin;
        ctx.fillRect(catTorsoX - 2, a.torsoY + a.walk.bob - 2, 2, 1);
        ctx.fillRect(catTorsoX + catTorsoW + 1, a.torsoY + a.walk.bob - 2, 2, 1);
    }

    // --- Cat head ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);
    // Darker forehead stripe marking
    if (dir !== DIR_UP) {
        ctx.fillStyle = stripeColor;
        ctx.fillRect(cx - 2, a.headY + 1, 4, 3);
        ctx.fillRect(cx - 1, a.headY + 4, 2, 2);
    }

    // --- Large triangular ears (direction-aware visibility) ---
    // Left ear (hidden when facing RIGHT, no pink when facing UP)
    if (dir !== DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 2, a.headY - 6, 8, 6);
        ctx.fillRect(a.headX - 1, a.headY - 10, 6, 5);
        ctx.fillRect(a.headX, a.headY - 14, 4, 5);
        ctx.fillRect(a.headX + 1, a.headY - 16, 2, 3);
        // Left ear outline
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 3, a.headY - 5, 1, 5);
        ctx.fillRect(a.headX - 2, a.headY - 9, 1, 4);
        ctx.fillRect(a.headX - 1, a.headY - 13, 1, 4);
        ctx.fillRect(a.headX, a.headY - 15, 1, 3);
        ctx.fillRect(a.headX + 1, a.headY - 17, 1, 2);
        if (dir !== DIR_UP) {
            ctx.fillStyle = '#ee88aa';
            ctx.fillRect(a.headX + 1, a.headY - 7, 4, 5);
            ctx.fillRect(a.headX + 2, a.headY - 11, 3, 5);
            ctx.fillRect(a.headX + 2, a.headY - 13, 2, 3);
        }
    }
    // Right ear (hidden when facing LEFT, no pink when facing UP)
    if (dir !== DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW - 6, a.headY - 6, 8, 6);
        ctx.fillRect(a.headX + a.headW - 5, a.headY - 10, 6, 5);
        ctx.fillRect(a.headX + a.headW - 4, a.headY - 14, 4, 5);
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 16, 2, 3);
        // Right ear outline
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX + a.headW + 2, a.headY - 5, 1, 5);
        ctx.fillRect(a.headX + a.headW + 1, a.headY - 9, 1, 4);
        ctx.fillRect(a.headX + a.headW, a.headY - 13, 1, 4);
        ctx.fillRect(a.headX + a.headW - 1, a.headY - 15, 1, 3);
        ctx.fillRect(a.headX + a.headW - 2, a.headY - 17, 1, 2);
        if (dir !== DIR_UP) {
            ctx.fillStyle = '#ee88aa';
            ctx.fillRect(a.headX + a.headW - 5, a.headY - 7, 4, 5);
            ctx.fillRect(a.headX + a.headW - 5, a.headY - 11, 3, 5);
            ctx.fillRect(a.headX + a.headW - 4, a.headY - 13, 2, 3);
        }
    }

    // --- Cat face features ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.28);

        // --- Custom cat eyes with vertical slit pupils (NOT dot eyes) ---
        if (dir === DIR_DOWN) {
            // Left cat eye — oval with vertical slit
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 10, eyeY, 7, 6);
            ctx.fillRect(cx - 9, eyeY - 1, 5, 1);
            ctx.fillRect(cx - 9, eyeY + 6, 5, 1);
            // Vertical slit pupil
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 7, eyeY, 2, 6);
            // Highlight
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 9, eyeY, 2, 2);

            // Right cat eye
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx + 4, eyeY, 7, 6);
            ctx.fillRect(cx + 5, eyeY - 1, 5, 1);
            ctx.fillRect(cx + 5, eyeY + 6, 5, 1);
            ctx.fillStyle = '#111';
            ctx.fillRect(cx + 6, eyeY, 2, 6);
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx + 5, eyeY, 2, 2);
        } else {
            // Side view — one cat eye
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 9;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY, 7, 6);
            ctx.fillRect(ex + 1, eyeY - 1, 5, 1);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex + 3, eyeY, 2, 6);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY, 2, 2);
        }

        // --- Prominent whiskers (3 per side, longer) ---
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.outline;
            // Left whiskers — angled slightly
            ctx.fillRect(a.headX - 7, a.headY + Math.floor(a.headH * 0.5) - 1, 8, 1);
            ctx.fillRect(a.headX - 8, a.headY + Math.floor(a.headH * 0.5) + 2, 9, 1);
            ctx.fillRect(a.headX - 6, a.headY + Math.floor(a.headH * 0.5) + 5, 7, 1);
            // Right whiskers
            ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.5) - 1, 8, 1);
            ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.5) + 2, 9, 1);
            ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.5) + 5, 7, 1);
        } else if (dir === DIR_LEFT) {
            ctx.fillStyle = colors.outline;
            ctx.fillRect(a.headX - 8, a.headY + Math.floor(a.headH * 0.5) - 1, 9, 1);
            ctx.fillRect(a.headX - 9, a.headY + Math.floor(a.headH * 0.5) + 2, 10, 1);
            ctx.fillRect(a.headX - 7, a.headY + Math.floor(a.headH * 0.5) + 5, 8, 1);
        } else if (dir === DIR_RIGHT) {
            ctx.fillStyle = colors.outline;
            ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.5) - 1, 9, 1);
            ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.5) + 2, 10, 1);
            ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.5) + 5, 8, 1);
        }

        // --- Pink triangle nose ---
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#ee6688';
            ctx.fillRect(cx - 2, a.headY + a.headH - 7, 4, 2);
            ctx.fillRect(cx - 1, a.headY + a.headH - 8, 2, 1);
            // Nose highlight
            ctx.fillStyle = '#ff99aa';
            ctx.fillRect(cx - 1, a.headY + a.headH - 7, 1, 1);
        } else if (dir === DIR_LEFT) {
            ctx.fillStyle = '#ee6688';
            ctx.fillRect(a.headX - 2, a.headY + Math.floor(a.headH * 0.5), 3, 2);
        } else if (dir === DIR_RIGHT) {
            ctx.fillStyle = '#ee6688';
            ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.5), 3, 2);
        }

        // --- Cat "w" shaped mouth (feline smile) ---
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.outline;
            // W shape: two small curves meeting in center
            ctx.fillRect(cx - 3, a.headY + a.headH - 5, 1, 1);
            ctx.fillRect(cx - 2, a.headY + a.headH - 4, 1, 1);
            ctx.fillRect(cx - 1, a.headY + a.headH - 5, 1, 1);
            ctx.fillRect(cx, a.headY + a.headH - 4, 1, 1);
            ctx.fillRect(cx + 1, a.headY + a.headH - 5, 1, 1);
            ctx.fillRect(cx + 2, a.headY + a.headH - 4, 1, 1);
            ctx.fillRect(cx + 3, a.headY + a.headH - 5, 1, 1);
        }
    }

    // --- Retractable claw hints at fingertips ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#ddd';
        ctx.fillRect(a.leftArmX + 1, a.shoulderY + a.walk.armL + a.armH, catArmW, 1);
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH + 1, 1, 1);
        ctx.fillRect(a.leftArmX + catArmW, a.shoulderY + a.walk.armL + a.armH + 1, 1, 1);
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + a.armH, catArmW, 1);
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + a.armH + 1, 1, 1);
        ctx.fillRect(a.rightArmX + catArmW, a.shoulderY + a.walk.armR + a.armH + 1, 1, 1);
    }

    // --- Front slim arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, catArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, catArmW, a.armH, colors.mid);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, catArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, a.leftArmX + 1, a.shoulderY + a.walk.armL, catArmW, a.armH, colors.mid);
    }
}

// ── Race 7: Elf ─────────────────────────────────────────────────────────────
function _drawElf(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    // Elf is slender — narrower proportions
    const elfTorsoW = a.torsoW - 2;
    const elfTorsoX = Math.floor(cx - elfTorsoW / 2);
    const elfArmW = a.armW - 1;
    const elfLegW = a.legW - 1;
    const robeColor = '#4a5680';
    const robeTrim = '#8899bb';
    const robeLight = '#5a6890';

    // --- Back hair (long, flowing past shoulders — visible from behind) ---
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.headX - 2, a.headY, a.headW + 4, a.headH + 10);
        ctx.fillRect(a.headX - 1, a.headY + a.headH + 10, a.headW + 2, 6);
        ctx.fillRect(a.headX, a.headY + a.headH + 16, a.headW, 3);
        // Hair highlight streak
        ctx.fillStyle = colors.mid || colors.hair;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(a.headX + Math.floor(a.headW * 0.3), a.headY + 2, 3, a.headH + 8);
        ctx.globalAlpha = 1.0;
    }

    // --- Slender legs with pointed boots ---
    _drawRoundedRect(ctx, a.leftLegX, a.legsTopY + a.walk.legL, elfLegW, a.legH, colors.skin, colors.outline);
    _drawRoundedRect(ctx, a.rightLegX + 1, a.legsTopY + a.walk.legR, elfLegW, a.legH, colors.skin, colors.outline);
    // Pointed elven boots — elongated toe
    ctx.fillStyle = '#445533';
    const bLY = a.legsTopY + a.walk.legL + a.legH - 2;
    const bRY = a.legsTopY + a.walk.legR + a.legH - 2;
    ctx.fillRect(a.leftLegX - 2, bLY, elfLegW + 3, 3);
    ctx.fillRect(a.leftLegX - 4, bLY + 1, 3, 2);
    ctx.fillRect(a.rightLegX - 1, bRY, elfLegW + 3, 3);
    ctx.fillRect(a.rightLegX + elfLegW + 1, bRY + 1, 3, 2);
    // Boot trim
    ctx.fillStyle = '#667744';
    ctx.fillRect(a.leftLegX - 1, bLY, elfLegW + 1, 1);
    ctx.fillRect(a.rightLegX, bRY, elfLegW + 1, 1);

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, elfArmW, a.armH, colors.skin, colors.outline);
        // Robe sleeve on back arm
        ctx.fillStyle = robeColor;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR, elfArmW + 1, 4);
        ctx.fillStyle = robeTrim;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + 3, elfArmW + 1, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, elfArmW, a.armH, colors.skin, colors.outline);
        ctx.fillStyle = robeColor;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL, elfArmW + 1, 4);
        ctx.fillStyle = robeTrim;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + 3, elfArmW + 1, 1);
    }

    // --- Flowing robes torso ---
    _drawRoundedRect(ctx, elfTorsoX, a.torsoY + a.walk.bob, elfTorsoW, a.torsoH + 2, robeColor, colors.outline);
    _drawSoftShading(ctx, elfTorsoX, a.torsoY + a.walk.bob, elfTorsoW, a.torsoH + 2, robeLight);
    // Robe trim lines (v-neck and hem)
    ctx.fillStyle = robeTrim;
    ctx.fillRect(elfTorsoX + 1, a.torsoY + a.walk.bob, elfTorsoW - 2, 1);
    ctx.fillRect(elfTorsoX, a.torsoY + a.walk.bob + a.torsoH + 1, elfTorsoW, 1);
    // V-neck collar detail
    if (dir !== DIR_UP) {
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob, 2, 3);
        ctx.fillRect(cx - 2, a.torsoY + a.walk.bob, 1, 2);
        ctx.fillRect(cx + 1, a.torsoY + a.walk.bob, 1, 2);
    }
    // Robe skirt extends below torso
    ctx.fillStyle = robeColor;
    ctx.fillRect(elfTorsoX - 1, a.torsoY + a.walk.bob + a.torsoH, elfTorsoW + 2, 3);
    ctx.fillStyle = robeTrim;
    ctx.fillRect(elfTorsoX - 1, a.torsoY + a.walk.bob + a.torsoH + 2, elfTorsoW + 2, 1);

    // --- Head ---
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // --- Very long pointed ears extending far sideways ---
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 6, a.headY + 4, 7, 4);
        ctx.fillRect(a.headX - 10, a.headY + 5, 5, 3);
        ctx.fillRect(a.headX - 14, a.headY + 6, 5, 2);
        ctx.fillRect(a.headX - 17, a.headY + 7, 4, 1);
        // Inner ear blush
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(a.headX - 8, a.headY + 5, 4, 2);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 17, a.headY + 7, 1, 1);
    }
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 1, a.headY + 4, 7, 4);
        ctx.fillRect(a.headX + a.headW + 5, a.headY + 5, 5, 3);
        ctx.fillRect(a.headX + a.headW + 9, a.headY + 6, 5, 2);
        ctx.fillRect(a.headX + a.headW + 13, a.headY + 7, 4, 1);
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(a.headX + a.headW + 4, a.headY + 5, 4, 2);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX + a.headW + 16, a.headY + 7, 1, 1);
    }

    // --- Long flowing hair with side locks ---
    ctx.fillStyle = colors.hair;
    if (dir !== DIR_UP) {
        ctx.fillRect(a.headX - 3, a.headY - 3, a.headW + 6, 6);
        ctx.fillRect(a.headX - 2, a.headY - 5, a.headW + 4, 3);
        ctx.fillRect(a.headX, a.headY - 6, a.headW, 2);
    }
    // Long side locks past shoulders
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 3, a.headY + 3, 4, 14);
        ctx.fillRect(a.headX - 2, a.headY + 17, 3, 5);
        ctx.fillRect(a.headX - 1, a.headY + 22, 2, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 1, a.headY + 3, 4, 14);
        ctx.fillRect(a.headX + a.headW - 1, a.headY + 17, 3, 5);
        ctx.fillRect(a.headX + a.headW, a.headY + 22, 2, 3);
    }

    // --- Circlet/tiara on forehead ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#ccaa44';
        ctx.fillRect(a.headX + 3, a.headY + 1, a.headW - 6, 2);
        // Center gem
        ctx.fillStyle = '#44ddff';
        ctx.fillRect(cx - 1, a.headY, 3, 3);
        ctx.fillStyle = '#aaeeff';
        ctx.fillRect(cx, a.headY, 1, 1);
    }

    // --- Elegant almond eyes with iris (NOT dots) ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.32);
        if (dir === DIR_DOWN) {
            // Almond-shaped eye whites (wider than tall)
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 9, eyeY + 1, 7, 4);
            ctx.fillRect(cx - 10, eyeY + 2, 1, 2);
            ctx.fillRect(cx + 3, eyeY + 1, 7, 4);
            ctx.fillRect(cx + 10, eyeY + 2, 1, 2);
            // Colored iris
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 7, eyeY + 1, 4, 4);
            ctx.fillRect(cx + 4, eyeY + 1, 4, 4);
            // Dark pupil
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 6, eyeY + 2, 2, 2);
            ctx.fillRect(cx + 5, eyeY + 2, 2, 2);
            // Highlight sparkle
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 8, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 3, eyeY + 1, 2, 2);
            // Thin elegant lash line
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 9, eyeY, 7, 1);
            ctx.fillRect(cx + 3, eyeY, 7, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 8;
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex, eyeY + 1, 7, 4);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 2, eyeY + 1, 4, 4);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex + 3, eyeY + 2, 2, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
            ctx.fillStyle = colors.outline;
            ctx.fillRect(ex, eyeY, 7, 1);
        }
        // Small delicate mouth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 2, a.headY + a.headH - 5, 4, 1);
            ctx.fillStyle = '#cc8888';
            ctx.fillRect(cx - 1, a.headY + a.headH - 4, 2, 1);
        }
    }

    // --- Magic sparkles near hands ---
    ctx.fillStyle = '#aaddff';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH + 1, 2, 2);
    ctx.fillRect(a.leftArmX + 2, a.shoulderY + a.walk.armL + a.armH + 3, 1, 1);
    ctx.fillRect(a.rightArmX + elfArmW, a.shoulderY + a.walk.armR + a.armH + 1, 2, 2);
    ctx.fillRect(a.rightArmX + elfArmW - 2, a.shoulderY + a.walk.armR + a.armH + 3, 1, 1);
    ctx.globalAlpha = 1.0;

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, elfArmW, a.armH, colors.skin, colors.outline);
        ctx.fillStyle = robeColor;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR, elfArmW, 4);
        ctx.fillStyle = robeTrim;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + 3, elfArmW, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, elfArmW, a.armH, colors.skin, colors.outline);
        ctx.fillStyle = robeColor;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL, elfArmW, 4);
        ctx.fillStyle = robeTrim;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + 3, elfArmW, 1);
    }
}

// ── Race 8: Ent (Tree person) ───────────────────────────────────────────────
function _drawEnt(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const barkColor = '#5a4030';
    const barkLight = '#7a6050';
    const barkDark = '#3a2820';
    const leafColor = '#449933';
    const leafDark = '#337722';
    const leafBright = '#66bb44';
    const sapColor = '#cc8822';

    // --- Root feet with spreading tendrils ---
    const entLegW = a.legW + 4;
    _drawRoundedRect(ctx, a.leftLegX - 2, a.legsTopY + a.walk.legL, entLegW, a.legH + 2, barkColor, barkDark);
    _drawSoftShading(ctx, a.leftLegX - 2, a.legsTopY + a.walk.legL, entLegW, a.legH + 2, barkLight);
    _drawRoundedRect(ctx, a.rightLegX - 2, a.legsTopY + a.walk.legR, entLegW, a.legH + 2, barkColor, barkDark);
    _drawSoftShading(ctx, a.rightLegX - 2, a.legsTopY + a.walk.legR, entLegW, a.legH + 2, barkLight);
    // Root tendrils spreading wide
    ctx.fillStyle = barkDark;
    ctx.fillRect(a.leftLegX - 5, a.legsTopY + a.walk.legL + a.legH, entLegW + 8, 3);
    ctx.fillRect(a.leftLegX - 7, a.legsTopY + a.walk.legL + a.legH + 1, 3, 3);
    ctx.fillRect(a.leftLegX + entLegW + 1, a.legsTopY + a.walk.legL + a.legH + 2, 2, 2);
    ctx.fillRect(a.rightLegX - 5, a.legsTopY + a.walk.legR + a.legH, entLegW + 8, 3);
    ctx.fillRect(a.rightLegX + entLegW + 1, a.legsTopY + a.walk.legR + a.legH + 1, 3, 3);
    ctx.fillRect(a.rightLegX - 6, a.legsTopY + a.walk.legR + a.legH + 2, 2, 2);
    // Bark texture on legs
    ctx.fillStyle = barkLight;
    ctx.fillRect(a.leftLegX, a.legsTopY + a.walk.legL + 2, 2, 1);
    ctx.fillRect(a.rightLegX + 2, a.legsTopY + a.walk.legR + 3, 3, 1);

    // --- Back branch arms with twig fingers ---
    const entArmW = a.armW + 3;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkLight);
        // Branch fork at end
        ctx.fillStyle = barkColor;
        ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH - 1, 2, 4);
        ctx.fillRect(a.rightArmX + entArmW - 1, a.shoulderY + a.walk.armR + a.armH - 1, 2, 4);
        ctx.fillRect(a.rightArmX + 2, a.shoulderY + a.walk.armR + a.armH, 1, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkLight);
        ctx.fillStyle = barkColor;
        ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH - 1, 2, 4);
        ctx.fillRect(a.leftArmX + entArmW - 2, a.shoulderY + a.walk.armL + a.armH - 1, 2, 4);
        ctx.fillRect(a.leftArmX + 1, a.shoulderY + a.walk.armL + a.armH, 1, 3);
    }
    // Leaf clusters at twig finger tips
    ctx.fillStyle = leafColor;
    ctx.fillRect(a.leftArmX - 3, a.shoulderY + a.walk.armL + a.armH + 1, entArmW + 5, 4);
    ctx.fillRect(a.rightArmX - 2, a.shoulderY + a.walk.armR + a.armH + 1, entArmW + 5, 4);
    ctx.fillStyle = leafDark;
    ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH + 3, 3, 2);
    ctx.fillRect(a.rightArmX + entArmW - 2, a.shoulderY + a.walk.armR + a.armH + 3, 3, 2);

    // --- Thick bark trunk with knotholes ---
    const entTorsoW = a.torsoW + 8;
    const entTorsoX = Math.floor(cx - entTorsoW / 2);
    _drawRoundedRect(ctx, entTorsoX, a.torsoY + a.walk.bob, entTorsoW, a.torsoH + 2, barkColor, barkDark);
    _drawSoftShading(ctx, entTorsoX, a.torsoY + a.walk.bob, entTorsoW, a.torsoH + 2, barkLight);
    // Bark grain texture lines
    ctx.fillStyle = barkLight;
    ctx.fillRect(entTorsoX + 3, a.torsoY + a.walk.bob + 2, entTorsoW - 6, 1);
    ctx.fillRect(entTorsoX + 4, a.torsoY + a.walk.bob + 5, entTorsoW - 8, 1);
    ctx.fillRect(entTorsoX + 2, a.torsoY + a.walk.bob + 8, entTorsoW - 4, 1);
    // Knotholes (darker ovals on torso)
    if (dir !== DIR_UP) {
        ctx.fillStyle = barkDark;
        ctx.fillRect(entTorsoX + 3, a.torsoY + a.walk.bob + 3, 3, 3);
        ctx.fillRect(entTorsoX + 4, a.torsoY + a.walk.bob + 2, 1, 1);
        ctx.fillRect(entTorsoX + entTorsoW - 6, a.torsoY + a.walk.bob + 6, 3, 2);
    }
    // Glowing amber sap at shoulder joints
    ctx.fillStyle = sapColor;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(entTorsoX - 1, a.shoulderY + a.walk.bob + 1, 3, 2);
    ctx.fillRect(entTorsoX + entTorsoW - 2, a.shoulderY + a.walk.bob + 1, 3, 2);
    ctx.globalAlpha = 1.0;
    // Sap glow halo
    ctx.fillStyle = sapColor;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(entTorsoX - 2, a.shoulderY + a.walk.bob, 5, 4);
    ctx.fillRect(entTorsoX + entTorsoW - 3, a.shoulderY + a.walk.bob, 5, 4);
    ctx.globalAlpha = 1.0;

    // --- Mushrooms on shoulders ---
    if (dir !== DIR_UP) {
        // Left mushroom
        ctx.fillStyle = '#cc6644';
        ctx.fillRect(entTorsoX - 2, a.shoulderY + a.walk.bob - 4, 5, 3);
        ctx.fillStyle = '#aa5533';
        ctx.fillRect(entTorsoX - 1, a.shoulderY + a.walk.bob - 2, 3, 2);
        ctx.fillStyle = '#eebb88';
        ctx.fillRect(entTorsoX, a.shoulderY + a.walk.bob - 1, 1, 1);
        // Mushroom spots
        ctx.fillStyle = '#ffddaa';
        ctx.fillRect(entTorsoX - 1, a.shoulderY + a.walk.bob - 3, 1, 1);
        ctx.fillRect(entTorsoX + 2, a.shoulderY + a.walk.bob - 4, 1, 1);
        // Right mushroom (smaller)
        ctx.fillStyle = '#cc6644';
        ctx.fillRect(entTorsoX + entTorsoW - 3, a.shoulderY + a.walk.bob - 3, 4, 2);
        ctx.fillStyle = '#aa5533';
        ctx.fillRect(entTorsoX + entTorsoW - 2, a.shoulderY + a.walk.bob - 1, 2, 2);
    }

    // --- Big woody head ---
    _drawRoundedRect(ctx, a.headX, a.headY + 2, a.headW, a.headH - 2, barkColor, barkDark);
    _drawSoftShading(ctx, a.headX, a.headY + 2, a.headW, a.headH - 2, barkLight);
    // Bark face texture
    ctx.fillStyle = barkLight;
    ctx.fillRect(a.headX + 3, a.headY + 5, 3, a.headH - 8);
    ctx.fillRect(a.headX + a.headW - 6, a.headY + 5, 3, a.headH - 8);

    // --- Massive leafy canopy crown (multi-shade with flower buds) ---
    ctx.fillStyle = leafColor;
    ctx.fillRect(a.headX - 7, a.headY - 5, a.headW + 14, 9);
    ctx.fillRect(a.headX - 5, a.headY - 9, a.headW + 10, 5);
    ctx.fillRect(a.headX - 2, a.headY - 13, a.headW + 4, 5);
    ctx.fillRect(a.headX + 2, a.headY - 16, a.headW - 4, 4);
    // Darker leaf depth
    ctx.fillStyle = leafDark;
    ctx.fillRect(a.headX + 2, a.headY - 7, 5, 4);
    ctx.fillRect(a.headX + a.headW - 7, a.headY - 8, 5, 4);
    ctx.fillRect(a.headX + Math.floor(a.headW / 2) - 3, a.headY - 14, 5, 4);
    ctx.fillRect(a.headX - 4, a.headY - 4, 4, 3);
    ctx.fillRect(a.headX + a.headW, a.headY - 3, 4, 3);
    // Bright leaf highlights
    ctx.fillStyle = leafBright;
    ctx.fillRect(a.headX + 5, a.headY - 4, 3, 2);
    ctx.fillRect(a.headX + a.headW - 5, a.headY - 3, 3, 2);
    ctx.fillRect(a.headX + 3, a.headY - 11, 2, 2);
    ctx.fillRect(a.headX + a.headW - 2, a.headY - 10, 2, 2);
    // Flower buds in canopy
    ctx.fillStyle = '#ff88aa';
    ctx.fillRect(a.headX - 3, a.headY - 6, 2, 2);
    ctx.fillRect(a.headX + a.headW + 2, a.headY - 5, 2, 2);
    ctx.fillStyle = '#ffaa44';
    ctx.fillRect(a.headX + Math.floor(a.headW / 2) + 3, a.headY - 15, 2, 2);

    // --- Glowing amber eyes in bark ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.38);
        ctx.fillStyle = '#88ff44';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 7, eyeY, 5, 5);
            ctx.fillRect(cx + 3, eyeY, 5, 5);
            ctx.fillStyle = 'rgba(136,255,68,0.3)';
            ctx.fillRect(cx - 8, eyeY - 1, 7, 7);
            ctx.fillRect(cx + 2, eyeY - 1, 7, 7);
            ctx.fillStyle = '#ccff88';
            ctx.fillRect(cx - 6, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 4, eyeY + 1, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 5;
            ctx.fillRect(ex, eyeY, 5, 5);
            ctx.fillStyle = 'rgba(136,255,68,0.3)';
            ctx.fillRect(ex - 1, eyeY - 1, 7, 7);
            ctx.fillStyle = '#ccff88';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
        }
        // Wooden mouth crease
        if (dir === DIR_DOWN) {
            ctx.fillStyle = barkDark;
            ctx.fillRect(cx - 3, a.headY + a.headH - 5, 6, 2);
            ctx.fillStyle = barkLight;
            ctx.fillRect(cx - 2, a.headY + a.headH - 4, 4, 1);
        }
    }

    // --- Front branch arms with twig fingers ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkLight);
        // Twig fingers
        ctx.fillStyle = barkColor;
        ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH - 1, 2, 4);
        ctx.fillRect(a.rightArmX + entArmW - 1, a.shoulderY + a.walk.armR + a.armH - 1, 2, 4);
        ctx.fillStyle = leafColor;
        ctx.fillRect(a.rightArmX - 2, a.shoulderY + a.walk.armR + a.armH + 1, entArmW + 5, 4);
        // Sap glow at joint
        ctx.fillStyle = sapColor;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR, 2, 2);
        ctx.globalAlpha = 1.0;
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkLight);
        ctx.fillStyle = barkColor;
        ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH - 1, 2, 4);
        ctx.fillRect(a.leftArmX + entArmW - 2, a.shoulderY + a.walk.armL + a.armH - 1, 2, 4);
        ctx.fillStyle = leafColor;
        ctx.fillRect(a.leftArmX - 3, a.shoulderY + a.walk.armL + a.armH + 1, entArmW + 5, 4);
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
        const eyeY = a.headY + Math.floor(a.headH * 0.22);
        if (dir === DIR_DOWN) {
            // Bulging eye whites (protruding slightly from head)
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 11, eyeY, 9, 8);
            ctx.fillRect(cx - 12, eyeY + 1, 1, 6);
            ctx.fillRect(cx + 3, eyeY, 9, 8);
            ctx.fillRect(cx + 12, eyeY + 1, 1, 6);
            // Colored iris
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 8, eyeY + 1, 5, 6);
            ctx.fillRect(cx + 5, eyeY + 1, 5, 6);
            // Dark pupil
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 6, eyeY + 2, 3, 4);
            ctx.fillRect(cx + 6, eyeY + 2, 3, 4);
            // Highlight
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 9, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 4, eyeY + 1, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 10;
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex, eyeY, 9, 8);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 2, eyeY + 1, 5, 6);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex + 3, eyeY + 2, 3, 4);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
        }
        // Wide fish-lipped mouth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 4, a.headY + a.headH - 5, 8, 3);
            ctx.fillRect(cx - 5, a.headY + a.headH - 4, 1, 1);
            ctx.fillRect(cx + 4, a.headY + a.headH - 4, 1, 1);
            // Inner mouth
            ctx.fillStyle = '#cc5555';
            ctx.fillRect(cx - 3, a.headY + a.headH - 4, 6, 1);
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
            ctx.fillStyle = '#050510';
            ctx.fillRect(cx - 4, a.headY + a.headH - 6, 8, 5);
            ctx.fillRect(cx - 3, a.headY + a.headH - 7, 6, 1);
            ctx.fillRect(cx - 3, a.headY + a.headH - 1, 6, 1);
            // Inner mouth void
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 2, a.headY + a.headH - 5, 4, 3);
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
    const golemHeadW = a.headW + 8;
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

    // Chibi proportions: big head, compact body, stubby limbs
    const dims = {
        headW: 28, headH: 22,
        torsoW: 20, torsoH: 10,
        armW: 6, armH: 10,
        legW: 8, legH: 8,
    };

    const a = _buildAnchors(cx, groundY, scale, walk, dims);
    const renderer = RACE_RENDERERS[raceId] || _drawHuman;
    renderer(ctx, a, dir, colors);

    return a;
}

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

    // Back arms (thinner chibi bug arms)
    const bugArmW = armW - 1;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, rightArmX, shoulderY + walk.armR, bugArmW, armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, rightArmX, shoulderY + walk.armR, bugArmW, armH, colors.mid);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, leftArmX, shoulderY + walk.armL, bugArmW, armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, leftArmX, shoulderY + walk.armL, bugArmW, armH, colors.mid);
    }

    // Stubby jointed legs (short chibi legs)
    _drawRoundedRect(ctx, leftLegX, legsTopY + walk.legL, legW - 1, legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, leftLegX, legsTopY + walk.legL, legW - 1, legH, colors.mid);
    _drawRoundedRect(ctx, rightLegX, legsTopY + walk.legR, legW - 1, legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, rightLegX, legsTopY + walk.legR, legW - 1, legH, colors.mid);
    // Joint band on stubby legs
    ctx.fillStyle = colors.outline;
    ctx.fillRect(leftLegX, legsTopY + walk.legL + Math.floor(legH * 0.45), legW - 1, 1);
    ctx.fillRect(rightLegX, legsTopY + walk.legR + Math.floor(legH * 0.45), legW - 1, 1);
    // Pointed bug feet (small for stubby legs)
    ctx.fillStyle = colors.outline;
    ctx.fillRect(leftLegX - 1, legsTopY + walk.legL + legH - 2, legW + 1, 2);
    ctx.fillRect(leftLegX - 2, legsTopY + walk.legL + legH - 1, 1, 1);
    ctx.fillRect(leftLegX + legW, legsTopY + walk.legL + legH - 1, 1, 1);
    ctx.fillRect(rightLegX - 1, legsTopY + walk.legR + legH - 2, legW + 1, 2);
    ctx.fillRect(rightLegX - 2, legsTopY + walk.legR + legH - 1, 1, 1);
    ctx.fillRect(rightLegX + legW, legsTopY + walk.legR + legH - 1, 1, 1);

    // Segmented compact torso (single segment for short chibi torso)
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(torsoX + 2, torsoY + walk.bob + Math.floor(torsoH * 0.5), torsoW - 4, 1);

    // Big round chibi bug head (extra-wide for compound eyes)
    const bugHeadW = headW + 8;
    const bugHeadX = Math.floor(cx - bugHeadW / 2);
    if (dir === DIR_UP) _drawHairBack(ctx, bugHeadX, headY, bugHeadW, headH, colors);
    _drawRoundedRect(ctx, bugHeadX, headY, bugHeadW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, bugHeadX, headY, bugHeadW, headH, colors.mid);

    // Large cute compound eyes (anime-style, scaled for big chibi head)
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.22);
        if (dir === DIR_DOWN) {
            // Oversized round compound eyes
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 12, eyeY, 9, 9);
            ctx.fillRect(cx + 4, eyeY, 9, 9);
            // Faceted highlight (top-left sparkle)
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 11, eyeY + 1, 4, 4);
            ctx.fillRect(cx + 5, eyeY + 1, 4, 4);
            // Small secondary highlight
            ctx.fillRect(cx - 6, eyeY + 5, 2, 2);
            ctx.fillRect(cx + 10, eyeY + 5, 2, 2);
            // Facet lines (subtle compound pattern)
            ctx.fillStyle = colors.outline;
            ctx.globalAlpha = 0.25;
            ctx.fillRect(cx - 8, eyeY + 4, 5, 1);
            ctx.fillRect(cx + 7, eyeY + 4, 5, 1);
            ctx.globalAlpha = 1.0;
        } else {
            const ex = dir === DIR_RIGHT ? cx + 4 : cx - 11;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY, 9, 9);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY + 1, 4, 4);
            ctx.fillRect(ex + 5, eyeY + 5, 2, 2);
        }
        // Blush marks
        _drawBlush(ctx, cx, eyeY + 11, dir, 14);
    }

    // Cute antennae with round bobble tips (scaled up for bigger head)
    ctx.fillStyle = colors.outline;
    ctx.fillRect(cx - 6, headY - 10, 2, 10);
    ctx.fillRect(cx + 5, headY - 10, 2, 10);
    // Round bobble tips (larger)
    ctx.fillStyle = colors.eye;
    ctx.fillRect(cx - 9, headY - 14, 5, 5);
    ctx.fillRect(cx + 4, headY - 14, 5, 5);
    // Highlight on bobbles
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 8, headY - 13, 3, 3);
    ctx.fillRect(cx + 5, headY - 13, 3, 3);

    // Small cute mandibles when facing down
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(cx - 4, headY + headH - 3, 2, 3);
        ctx.fillRect(cx + 3, headY + headH - 3, 2, 3);
        // Tiny mouth between mandibles
        _drawMouth(ctx, cx, headY + headH - 2, dir, colors.outline);
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, rightArmX, shoulderY + walk.armR, bugArmW, armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, rightArmX, shoulderY + walk.armR, bugArmW, armH, colors.mid);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, leftArmX, shoulderY + walk.armL, bugArmW, armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, leftArmX, shoulderY + walk.armL, bugArmW, armH, colors.mid);
    }
}

// ── Race 2: Bear man ────────────────────────────────────────────────────────
function _drawBearman(ctx, a, dir, colors) {
    // Chibi bear: extra-wide stocky body with oversized round head
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bearTorsoW = a.torsoW + 6;
    const bearTorsoX = Math.floor(cx - bearTorsoW / 2);
    const bearHeadW = a.headW + 6;
    const bearHeadH = a.headH + 2;
    const bearHeadX = Math.floor(cx - bearHeadW / 2);
    const bearArmW = a.armW + 3;
    const bearLegW = a.legW + 3;

    // Back arms (thick puffy rounded)
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, cx + bearTorsoW / 2, a.shoulderY + a.walk.armR, bearArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, cx + bearTorsoW / 2, a.shoulderY + a.walk.armR, bearArmW, a.armH, colors.mid);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, cx - bearTorsoW / 2 - bearArmW, a.shoulderY + a.walk.armL, bearArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, cx - bearTorsoW / 2 - bearArmW, a.shoulderY + a.walk.armL, bearArmW, a.armH, colors.mid);
    }

    // Stocky stubby legs (wider for bear)
    _drawRoundedRect(ctx, Math.floor(cx - bearLegW - 1), a.legsTopY + a.walk.legL, bearLegW, a.legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, Math.floor(cx - bearLegW - 1), a.legsTopY + a.walk.legL, bearLegW, a.legH, colors.mid);
    _drawRoundedRect(ctx, Math.floor(cx + 1), a.legsTopY + a.walk.legR, bearLegW, a.legH, colors.skin, colors.outline);
    _drawSoftShading(ctx, Math.floor(cx + 1), a.legsTopY + a.walk.legR, bearLegW, a.legH, colors.mid);
    // Big puffy paw feet (rounded)
    ctx.fillStyle = colors.outline;
    ctx.fillRect(Math.floor(cx - bearLegW - 2), a.legsTopY + a.walk.legL + a.legH - 2, bearLegW + 4, 4);
    ctx.fillRect(Math.floor(cx), a.legsTopY + a.walk.legR + a.legH - 2, bearLegW + 4, 4);
    // Toe pads (3 toes for cuter look)
    ctx.fillStyle = colors.mid;
    ctx.fillRect(Math.floor(cx - bearLegW - 1), a.legsTopY + a.walk.legL + a.legH, 2, 2);
    ctx.fillRect(Math.floor(cx - bearLegW + 2), a.legsTopY + a.walk.legL + a.legH, 2, 2);
    ctx.fillRect(Math.floor(cx - bearLegW + 5), a.legsTopY + a.walk.legL + a.legH, 2, 2);
    ctx.fillRect(Math.floor(cx + 2), a.legsTopY + a.walk.legR + a.legH, 2, 2);
    ctx.fillRect(Math.floor(cx + 5), a.legsTopY + a.walk.legR + a.legH, 2, 2);
    ctx.fillRect(Math.floor(cx + 8), a.legsTopY + a.walk.legR + a.legH, 2, 2);

    // Wide stocky torso (rounded for softer chibi look)
    _drawRoundedRect(ctx, bearTorsoX, a.torsoY + a.walk.bob, bearTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, bearTorsoX, a.torsoY + a.walk.bob, bearTorsoW, a.torsoH, colors.mid);
    // Lighter belly patch (rounder)
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(cx - 4, a.torsoY + a.walk.bob + 2, 8, a.torsoH - 3);
    ctx.globalAlpha = 1.0;

    // Big round chibi bear head
    if (dir === DIR_UP) _drawHairBack(ctx, bearHeadX, a.headY, bearHeadW, bearHeadH, colors);
    _drawRoundedRect(ctx, bearHeadX, a.headY, bearHeadW, bearHeadH, colors.skin, colors.outline);
    _drawSoftShading(ctx, bearHeadX, a.headY, bearHeadW, bearHeadH, colors.mid);

    // Big round ears (proportionally larger for chibi head)
    ctx.fillStyle = colors.skin;
    ctx.fillRect(bearHeadX - 4, a.headY - 4, 9, 9);
    ctx.fillRect(bearHeadX + bearHeadW - 5, a.headY - 4, 9, 9);
    // Ear outline
    ctx.fillStyle = colors.outline;
    ctx.fillRect(bearHeadX - 4, a.headY - 5, 9, 1);
    ctx.fillRect(bearHeadX + bearHeadW - 5, a.headY - 5, 9, 1);
    // Inner ear (pink)
    ctx.fillStyle = '#dd8899';
    ctx.fillRect(bearHeadX - 2, a.headY - 2, 5, 5);
    ctx.fillRect(bearHeadX + bearHeadW - 3, a.headY - 2, 5, 5);

    // Face
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(bearHeadH * 0.28);
        _drawEyes(ctx, cx, eyeY, dir, colors, 8);
        _drawBlush(ctx, cx, eyeY + 10, dir, 13);
        // Cute round snout (bigger for chibi)
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.mid;
            ctx.fillRect(cx - 5, a.headY + bearHeadH - 8, 10, 6);
            // Big button nose
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - 3, a.headY + bearHeadH - 7, 6, 4);
            // Nose highlight
            ctx.fillStyle = '#555';
            ctx.fillRect(cx - 2, a.headY + bearHeadH - 7, 3, 2);
            // Cute small mouth
            _drawMouth(ctx, cx, a.headY + bearHeadH - 3, dir, colors.outline);
        }
    }

    // Big puffy paw hands at arm ends (rounded)
    ctx.fillStyle = colors.outline;
    const pawSize = bearArmW + 3;
    if (dir !== DIR_UP) {
        _drawRoundedRect(ctx, cx - bearTorsoW / 2 - bearArmW - 1, a.shoulderY + a.walk.armL + a.armH - 2, pawSize, 4, colors.outline, colors.outline);
        _drawRoundedRect(ctx, cx + bearTorsoW / 2 - 1, a.shoulderY + a.walk.armR + a.armH - 2, pawSize, 4, colors.outline, colors.outline);
        // Paw pad details
        ctx.fillStyle = colors.mid;
        ctx.fillRect(cx - bearTorsoW / 2 - bearArmW + 1, a.shoulderY + a.walk.armL + a.armH, 2, 1);
        ctx.fillRect(cx + bearTorsoW / 2 + 1, a.shoulderY + a.walk.armR + a.armH, 2, 1);
    }

    // Front arms (thick puffy rounded)
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, cx + bearTorsoW / 2, a.shoulderY + a.walk.armR, bearArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, cx + bearTorsoW / 2, a.shoulderY + a.walk.armR, bearArmW, a.armH, colors.mid);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, cx - bearTorsoW / 2 - bearArmW, a.shoulderY + a.walk.armL, bearArmW, a.armH, colors.skin, colors.outline);
        _drawSoftShading(ctx, cx - bearTorsoW / 2 - bearArmW, a.shoulderY + a.walk.armL, bearArmW, a.armH, colors.mid);
    }
}

// ── Race 3: Bird man ────────────────────────────────────────────────────────
function _drawBirdman(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Bigger feathered crest on chibi head (scaled up for larger head)
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 4, a.headY - 9, 4, 9);
    ctx.fillRect(cx, a.headY - 13, 4, 13);
    ctx.fillRect(cx + 4, a.headY - 8, 4, 8);
    // Crest highlight
    ctx.fillStyle = colors.mid || colors.hair;
    ctx.fillRect(cx + 1, a.headY - 12, 2, 5);
    // Crest outline tip
    ctx.fillStyle = colors.outline;
    ctx.fillRect(cx + 1, a.headY - 14, 2, 2);

    // Bigger beak (proportional to larger chibi head)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#ddaa44';
        ctx.fillRect(cx - 4, a.headY + a.headH - 8, 8, 5);
        ctx.fillRect(cx - 3, a.headY + a.headH - 3, 6, 2);
        // Beak line
        ctx.fillStyle = '#bb8833';
        ctx.fillRect(cx - 3, a.headY + a.headH - 5, 6, 1);
        // Nostril dots
        ctx.fillStyle = '#997722';
        ctx.fillRect(cx - 2, a.headY + a.headH - 7, 1, 1);
        ctx.fillRect(cx + 2, a.headY + a.headH - 7, 1, 1);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = '#ddaa44';
        ctx.fillRect(a.headX - 9, a.headY + Math.floor(a.headH * 0.38), 10, 5);
        ctx.fillRect(a.headX - 11, a.headY + Math.floor(a.headH * 0.38) + 1, 3, 3);
        ctx.fillStyle = '#bb8833';
        ctx.fillRect(a.headX - 8, a.headY + Math.floor(a.headH * 0.38) + 2, 8, 1);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = '#ddaa44';
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.38), 10, 5);
        ctx.fillRect(a.headX + a.headW + 9, a.headY + Math.floor(a.headH * 0.38) + 1, 3, 3);
        ctx.fillStyle = '#bb8833';
        ctx.fillRect(a.headX + a.headW + 1, a.headY + Math.floor(a.headH * 0.38) + 2, 8, 1);
    }

    // Fluffy feather fringe on stubby arms (wider for chibi)
    ctx.fillStyle = colors.hair;
    const armBottom = a.shoulderY + a.armH - 2;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.leftArmX - 3, armBottom + a.walk.armL, a.armW + 6, 4);
        ctx.fillRect(a.leftArmX - 2, armBottom + a.walk.armL + 4, a.armW + 4, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.rightArmX - 3, armBottom + a.walk.armR, a.armW + 6, 4);
        ctx.fillRect(a.rightArmX - 2, armBottom + a.walk.armR + 4, a.armW + 4, 2);
    }

    // Cute splayed toe feet (wider for chibi)
    ctx.fillStyle = '#ddaa44';
    const feetLY = a.legsTopY + a.walk.legL + a.legH - 2;
    const feetRY = a.legsTopY + a.walk.legR + a.legH - 2;
    ctx.fillRect(a.leftLegX - 4, feetLY, 4, 3);
    ctx.fillRect(a.leftLegX + a.legW, feetLY, 4, 3);
    ctx.fillRect(a.leftLegX - 2, feetLY + 3, 2, 1);
    ctx.fillRect(a.rightLegX - 4, feetRY, 4, 3);
    ctx.fillRect(a.rightLegX + a.legW, feetRY, 4, 3);
    ctx.fillRect(a.rightLegX + a.legW + 2, feetRY + 3, 2, 1);

    // Tail feathers (visible from back/side)
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(cx - 4, a.torsoY + a.torsoH - 1 + a.walk.bob, 8, 4);
        ctx.fillRect(cx - 3, a.torsoY + a.torsoH + 3 + a.walk.bob, 6, 2);
    }
}

// ── Race 4: Demon ───────────────────────────────────────────────────────────
function _drawDemon(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Horns (scaled up for bigger chibi head, pointed triangles)
    ctx.fillStyle = '#554433';
    // Left horn
    ctx.fillRect(a.headX - 2, a.headY - 5, 4, 5);
    ctx.fillRect(a.headX - 1, a.headY - 9, 3, 4);
    ctx.fillRect(a.headX, a.headY - 12, 2, 3);
    ctx.fillRect(a.headX + 1, a.headY - 13, 1, 2);
    // Right horn
    ctx.fillRect(a.headX + a.headW - 2, a.headY - 5, 4, 5);
    ctx.fillRect(a.headX + a.headW - 2, a.headY - 9, 3, 4);
    ctx.fillRect(a.headX + a.headW - 2, a.headY - 12, 2, 3);
    ctx.fillRect(a.headX + a.headW - 2, a.headY - 13, 1, 2);
    // Horn highlight
    ctx.fillStyle = '#776655';
    ctx.fillRect(a.headX - 1, a.headY - 4, 1, 3);
    ctx.fillRect(a.headX + a.headW - 1, a.headY - 4, 1, 3);

    // Pointed chin
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 2, a.headY + a.headH, 4, 2);
        ctx.fillRect(cx - 1, a.headY + a.headH + 2, 2, 1);
    }

    // Cloven hooves (adjusted for shorter legs)
    ctx.fillStyle = '#443322';
    const hLY = a.legsTopY + a.walk.legL + a.legH - 3;
    const hRY = a.legsTopY + a.walk.legR + a.legH - 3;
    ctx.fillRect(a.leftLegX - 1, hLY, a.legW + 2, 4);
    ctx.fillRect(a.leftLegX + Math.floor(a.legW / 2), hLY, 1, 4);
    ctx.fillRect(a.rightLegX - 1, hRY, a.legW + 2, 4);
    ctx.fillRect(a.rightLegX + Math.floor(a.legW / 2), hRY, 1, 4);

    // Tail (adjusted for shorter torso, visible from side/back)
    if (dir === DIR_LEFT || dir === DIR_RIGHT || dir === DIR_UP) {
        ctx.fillStyle = colors.outline;
        const tailDir = dir === DIR_UP ? DIR_LEFT : dir;
        const tailX = tailDir === DIR_LEFT ? cx + a.torsoW / 2 + 1 : cx - a.torsoW / 2 - 4;
        const tailY = a.torsoY + a.torsoH - 3 + a.walk.bob;
        ctx.fillRect(tailX, tailY, 3, 2);
        ctx.fillRect(tailX + (tailDir === DIR_LEFT ? 2 : -2), tailY + 1, 3, 2);
        ctx.fillRect(tailX + (tailDir === DIR_LEFT ? 4 : -4), tailY, 2, 2);
        ctx.fillRect(tailX + (tailDir === DIR_LEFT ? 5 : -5), tailY - 1, 2, 2);
        // Pointed arrow tip
        ctx.fillStyle = colors.eye;
        ctx.fillRect(tailX + (tailDir === DIR_LEFT ? 7 : -7), tailY - 2, 4, 4);
        ctx.fillRect(tailX + (tailDir === DIR_LEFT ? 8 : -7), tailY - 3, 2, 1);
        ctx.fillRect(tailX + (tailDir === DIR_LEFT ? 8 : -7), tailY + 2, 2, 1);
    }

    // Claw tips on stubby arms
    ctx.fillStyle = '#443322';
    if (dir !== DIR_UP) {
        ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH, a.armW + 2, 2);
        ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH, a.armW + 2, 2);
    }
}

// ── Race 5: Devil ───────────────────────────────────────────────────────────
function _drawDevil(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Larger swept-back horns (scaled for bigger chibi head)
    ctx.fillStyle = '#665544';
    // Left horn — sweeping outward and back
    ctx.fillRect(a.headX - 2, a.headY - 4, 5, 4);
    ctx.fillRect(a.headX - 5, a.headY - 8, 4, 4);
    ctx.fillRect(a.headX - 7, a.headY - 12, 3, 4);
    ctx.fillRect(a.headX - 8, a.headY - 15, 2, 3);
    // Right horn
    ctx.fillRect(a.headX + a.headW - 3, a.headY - 4, 5, 4);
    ctx.fillRect(a.headX + a.headW + 1, a.headY - 8, 4, 4);
    ctx.fillRect(a.headX + a.headW + 4, a.headY - 12, 3, 4);
    ctx.fillRect(a.headX + a.headW + 6, a.headY - 15, 2, 3);
    // Horn ridges
    ctx.fillStyle = '#887766';
    ctx.fillRect(a.headX - 1, a.headY - 3, 1, 2);
    ctx.fillRect(a.headX + a.headW, a.headY - 3, 1, 2);

    // Goatee when facing down (longer, pointier)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(cx - 2, a.headY + a.headH - 2, 4, 4);
        ctx.fillRect(cx - 1, a.headY + a.headH + 2, 2, 3);
        ctx.fillRect(cx, a.headY + a.headH + 5, 1, 2);
    }

    // Bat wing stubs (adjusted for shorter torso)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.torsoX - 4, a.shoulderY + 1, 5, 4);
        ctx.fillRect(a.torsoX - 6, a.shoulderY, 3, 3);
        ctx.fillRect(a.torsoX - 7, a.shoulderY - 1, 2, 2);
        ctx.fillRect(a.torsoX + a.torsoW, a.shoulderY + 1, 5, 4);
        ctx.fillRect(a.torsoX + a.torsoW + 4, a.shoulderY, 3, 3);
        ctx.fillRect(a.torsoX + a.torsoW + 6, a.shoulderY - 1, 2, 2);
    } else if (dir === DIR_UP) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.torsoX - 5, a.shoulderY - 2, 7, 7);
        ctx.fillRect(a.torsoX - 8, a.shoulderY - 3, 4, 5);
        ctx.fillRect(a.torsoX - 10, a.shoulderY - 2, 3, 3);
        ctx.fillRect(a.torsoX + a.torsoW - 1, a.shoulderY - 2, 7, 7);
        ctx.fillRect(a.torsoX + a.torsoW + 5, a.shoulderY - 3, 4, 5);
        ctx.fillRect(a.torsoX + a.torsoW + 8, a.shoulderY - 2, 3, 3);
    }

    // Hooved feet (adjusted for shorter legs)
    ctx.fillStyle = '#443322';
    ctx.fillRect(a.leftLegX - 1, a.legsTopY + a.walk.legL + a.legH - 3, a.legW + 2, 4);
    ctx.fillRect(a.rightLegX - 1, a.legsTopY + a.walk.legR + a.legH - 3, a.legW + 2, 4);
}

// ── Race 6: Cat man ─────────────────────────────────────────────────────────
function _drawCatman(ctx, a, dir, colors) {
    // Slim agile body
    const slimA = Object.assign({}, a, {
        torsoW: a.torsoW - 2, armW: a.armW - 1, legW: a.legW - 1
    });
    _drawGenericBody(ctx, slimA, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Bigger pointed cat ears (triangles scaled for chibi head)
    ctx.fillStyle = colors.skin;
    ctx.fillRect(a.headX - 2, a.headY - 8, 7, 8);
    ctx.fillRect(a.headX - 1, a.headY - 12, 5, 4);
    ctx.fillRect(a.headX, a.headY - 14, 3, 3);
    ctx.fillRect(a.headX + a.headW - 5, a.headY - 8, 7, 8);
    ctx.fillRect(a.headX + a.headW - 4, a.headY - 12, 5, 4);
    ctx.fillRect(a.headX + a.headW - 3, a.headY - 14, 3, 3);
    // Ear outline
    ctx.fillStyle = colors.outline;
    ctx.fillRect(a.headX - 2, a.headY - 8, 1, 6);
    ctx.fillRect(a.headX + a.headW + 1, a.headY - 8, 1, 6);
    // Inner ear (pink)
    ctx.fillStyle = '#dd8899';
    ctx.fillRect(a.headX, a.headY - 7, 4, 5);
    ctx.fillRect(a.headX + 1, a.headY - 10, 2, 3);
    ctx.fillRect(a.headX + a.headW - 4, a.headY - 7, 4, 5);
    ctx.fillRect(a.headX + a.headW - 3, a.headY - 10, 2, 3);

    // Fluffier whiskers when facing down (3 per side)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 5, a.headY + Math.floor(a.headH * 0.55), 6, 1);
        ctx.fillRect(a.headX - 6, a.headY + Math.floor(a.headH * 0.55) + 3, 7, 1);
        ctx.fillRect(a.headX - 4, a.headY + Math.floor(a.headH * 0.55) + 6, 5, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.55), 6, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.55) + 3, 7, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.55) + 6, 5, 1);
        // Cat nose (triangle)
        ctx.fillStyle = '#dd6688';
        ctx.fillRect(cx - 2, a.headY + a.headH - 6, 4, 2);
        ctx.fillRect(cx - 1, a.headY + a.headH - 7, 2, 1);
        // Cute w-shaped mouth
        ctx.fillStyle = colors.outline;
        ctx.fillRect(cx - 2, a.headY + a.headH - 4, 1, 1);
        ctx.fillRect(cx + 2, a.headY + a.headH - 4, 1, 1);
        ctx.fillRect(cx - 1, a.headY + a.headH - 3, 1, 1);
        ctx.fillRect(cx + 1, a.headY + a.headH - 3, 1, 1);
        ctx.fillRect(cx, a.headY + a.headH - 4, 1, 1);
    }

    // Tail (curvy, adjusted for shorter torso)
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        const tailDir = dir === DIR_UP ? DIR_LEFT : dir;
        const tailBaseX = tailDir === DIR_LEFT ? cx + a.torsoW / 2 : cx - a.torsoW / 2 - 3;
        const tailBaseY = a.torsoY + a.torsoH - 3 + a.walk.bob;
        ctx.fillRect(tailBaseX, tailBaseY, 3, 2);
        ctx.fillRect(tailBaseX + (tailDir === DIR_LEFT ? 2 : -2), tailBaseY - 2, 3, 3);
        ctx.fillRect(tailBaseX + (tailDir === DIR_LEFT ? 4 : -4), tailBaseY - 4, 3, 3);
        ctx.fillRect(tailBaseX + (tailDir === DIR_LEFT ? 5 : -5), tailBaseY - 7, 3, 4);
        ctx.fillRect(tailBaseX + (tailDir === DIR_LEFT ? 4 : -4), tailBaseY - 9, 3, 3);
        // Fluffy tail tip
        ctx.fillStyle = colors.mid;
        ctx.fillRect(tailBaseX + (tailDir === DIR_LEFT ? 3 : -4), tailBaseY - 11, 4, 4);
    }

    // Rounded padded feet (cute bean toes)
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftLegX - 1, a.legsTopY + a.walk.legL + a.legH - 2, a.legW + 2, 3);
    ctx.fillRect(a.rightLegX - 1, a.legsTopY + a.walk.legR + a.legH - 2, a.legW + 2, 3);
    // Bean toe pads
    ctx.fillStyle = '#dd8899';
    ctx.fillRect(a.leftLegX, a.legsTopY + a.walk.legL + a.legH, 2, 1);
    ctx.fillRect(a.leftLegX + 3, a.legsTopY + a.walk.legL + a.legH, 2, 1);
    ctx.fillRect(a.rightLegX, a.legsTopY + a.walk.legR + a.legH, 2, 1);
    ctx.fillRect(a.rightLegX + 3, a.legsTopY + a.walk.legR + a.legH, 2, 1);
}

// ── Race 7: Elf ─────────────────────────────────────────────────────────────
function _drawElf(ctx, a, dir, colors) {
    // Slim elegant body
    const slimA = Object.assign({}, a, {
        torsoW: a.torsoW - 2, armW: a.armW - 1, legW: a.legW - 1
    });
    _drawGenericBody(ctx, slimA, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Longer pointed ears extending sideways (scaled for bigger chibi head)
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 6, a.headY + 3, 7, 4);
        ctx.fillRect(a.headX - 9, a.headY + 4, 4, 3);
        ctx.fillRect(a.headX - 11, a.headY + 5, 3, 2);
        // Ear outline
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 11, a.headY + 5, 1, 2);
        ctx.fillStyle = colors.skin;
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW, a.headY + 3, 7, 4);
        ctx.fillRect(a.headX + a.headW + 6, a.headY + 4, 4, 3);
        ctx.fillRect(a.headX + a.headW + 9, a.headY + 5, 3, 2);
        // Ear outline
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX + a.headW + 11, a.headY + 5, 1, 2);
        ctx.fillStyle = colors.skin;
    }

    // Longer flowing hair (scaled for bigger head)
    ctx.fillStyle = colors.hair;
    if (dir !== DIR_UP) {
        ctx.fillRect(a.headX - 3, a.headY - 3, a.headW + 6, 6);
        ctx.fillRect(a.headX - 2, a.headY - 5, a.headW + 4, 3);
    }
    // Hair draping on sides (longer locks)
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 3, a.headY + 3, 4, 12);
        ctx.fillRect(a.headX - 2, a.headY + 15, 3, 4);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW, a.headY + 3, 4, 12);
        ctx.fillRect(a.headX + a.headW, a.headY + 15, 3, 4);
    }
    // Back hair (longer, flowing for elf)
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.headX - 2, a.headY, a.headW + 4, a.headH + 6);
        ctx.fillRect(a.headX - 1, a.headY + a.headH + 6, a.headW + 2, 4);
        // Hair highlight streak
        ctx.fillStyle = colors.mid || colors.hair;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(a.headX + Math.floor(a.headW * 0.3), a.headY + 2, 3, a.headH + 4);
        ctx.globalAlpha = 1.0;
    }

    // Elegant shoes (slim pointed)
    ctx.fillStyle = '#556644';
    ctx.fillRect(a.leftLegX - 2, a.legsTopY + a.walk.legL + a.legH - 2, a.legW + 3, 3);
    ctx.fillRect(a.rightLegX - 2, a.legsTopY + a.walk.legR + a.legH - 2, a.legW + 3, 3);
}

// ── Race 8: Ent (Tree person) ───────────────────────────────────────────────
function _drawEnt(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const barkColor = '#5a4030';
    const barkLight = '#7a6050';
    const barkDark = '#3a2820';
    const leafColor = '#449933';
    const leafDark = '#337722';

    // Root-like stubby legs (thick and gnarled, shorter for chibi)
    const entLegW = a.legW + 3;
    _drawRoundedRect(ctx, a.leftLegX - 1, a.legsTopY + a.walk.legL, entLegW, a.legH + 2, barkColor, barkDark);
    _drawSoftShading(ctx, a.leftLegX - 1, a.legsTopY + a.walk.legL, entLegW, a.legH + 2, barkLight);
    _drawRoundedRect(ctx, a.rightLegX - 1, a.legsTopY + a.walk.legR, entLegW, a.legH + 2, barkColor, barkDark);
    _drawSoftShading(ctx, a.rightLegX - 1, a.legsTopY + a.walk.legR, entLegW, a.legH + 2, barkLight);
    // Root tendrils at feet (wider spread)
    ctx.fillStyle = barkDark;
    ctx.fillRect(a.leftLegX - 4, a.legsTopY + a.walk.legL + a.legH, entLegW + 6, 3);
    ctx.fillRect(a.leftLegX - 5, a.legsTopY + a.walk.legL + a.legH + 1, 2, 2);
    ctx.fillRect(a.rightLegX - 4, a.legsTopY + a.walk.legR + a.legH, entLegW + 6, 3);
    ctx.fillRect(a.rightLegX + entLegW + 2, a.legsTopY + a.walk.legR + a.legH + 1, 2, 2);

    // Branch-like stubby arms
    const entArmW = a.armW + 2;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkLight);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkLight);
    }
    // Bigger leaf clusters at hands
    ctx.fillStyle = leafColor;
    ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH - 2, entArmW + 4, 5);
    ctx.fillRect(a.rightArmX - 2, a.shoulderY + a.walk.armR + a.armH - 2, entArmW + 4, 5);
    ctx.fillStyle = leafDark;
    ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH, 2, 2);
    ctx.fillRect(a.rightArmX + entArmW - 2, a.shoulderY + a.walk.armR + a.armH, 2, 2);

    // Thick bark trunk body (adjusted for shorter chibi torso)
    const entTorsoW = a.torsoW + 6;
    const entTorsoX = Math.floor(cx - entTorsoW / 2);
    _drawRoundedRect(ctx, entTorsoX, a.torsoY + a.walk.bob, entTorsoW, a.torsoH + 2, barkColor, barkDark);
    _drawSoftShading(ctx, entTorsoX, a.torsoY + a.walk.bob, entTorsoW, a.torsoH + 2, barkLight);
    // Bark texture lines (fewer for shorter torso)
    ctx.fillStyle = barkLight;
    ctx.fillRect(entTorsoX + 3, a.torsoY + a.walk.bob + 3, entTorsoW - 6, 1);
    ctx.fillRect(entTorsoX + 4, a.torsoY + a.walk.bob + 6, entTorsoW - 8, 1);
    // Knot detail
    ctx.fillStyle = barkDark;
    ctx.fillRect(entTorsoX + 4, a.torsoY + a.walk.bob + 4, 2, 2);

    // Big woody chibi head with leafy crown
    _drawRoundedRect(ctx, a.headX, a.headY + 2, a.headW, a.headH - 2, barkColor, barkDark);
    _drawSoftShading(ctx, a.headX, a.headY + 2, a.headW, a.headH - 2, barkLight);
    // Bark face texture (scaled for bigger head)
    ctx.fillStyle = barkLight;
    ctx.fillRect(a.headX + 3, a.headY + 5, 3, a.headH - 8);
    ctx.fillRect(a.headX + a.headW - 6, a.headY + 5, 3, a.headH - 8);

    // Bigger leafy crown (scaled up for chibi head)
    ctx.fillStyle = leafColor;
    ctx.fillRect(a.headX - 5, a.headY - 5, a.headW + 10, 9);
    ctx.fillRect(a.headX - 3, a.headY - 9, a.headW + 6, 5);
    ctx.fillRect(a.headX, a.headY - 12, a.headW, 4);
    // Dark leaf accents
    ctx.fillStyle = leafDark;
    ctx.fillRect(a.headX + 2, a.headY - 7, 4, 4);
    ctx.fillRect(a.headX + a.headW - 6, a.headY - 8, 4, 4);
    ctx.fillRect(a.headX + Math.floor(a.headW / 2) - 2, a.headY - 11, 4, 3);
    // Light leaf highlights
    ctx.fillStyle = '#66bb44';
    ctx.fillRect(a.headX + 4, a.headY - 4, 3, 2);
    ctx.fillRect(a.headX + a.headW - 4, a.headY - 3, 2, 2);

    // Eyes (bigger glowing in bark, anime-cute)
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.38);
        ctx.fillStyle = '#88ff44';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 7, eyeY, 5, 5);
            ctx.fillRect(cx + 3, eyeY, 5, 5);
            // Glow halo
            ctx.fillStyle = 'rgba(136,255,68,0.3)';
            ctx.fillRect(cx - 8, eyeY - 1, 7, 7);
            ctx.fillRect(cx + 2, eyeY - 1, 7, 7);
            // Eye highlight
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
        // Cute wooden mouth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = barkDark;
            ctx.fillRect(cx - 2, a.headY + a.headH - 5, 4, 2);
        }
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkLight);
        ctx.fillStyle = leafColor;
        ctx.fillRect(a.rightArmX - 2, a.shoulderY + a.walk.armR + a.armH - 2, entArmW + 4, 5);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkColor, barkDark);
        _drawSoftShading(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkLight);
        ctx.fillStyle = leafColor;
        ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH - 2, entArmW + 4, 5);
    }
}

// ── Race 9: Fish man ────────────────────────────────────────────────────────
function _drawFishman(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, false);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Larger fin crest on chibi head (scaled up)
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 2, a.headY - 9, 4, 9);
    ctx.fillRect(cx - 3, a.headY - 7, 6, 7);
    ctx.fillRect(cx - 1, a.headY - 13, 3, 5);
    // Fin membrane detail
    ctx.fillStyle = colors.mid || colors.hair;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(cx - 1, a.headY - 6, 2, 4);
    ctx.globalAlpha = 1.0;
    // Fin outline
    ctx.fillStyle = colors.outline;
    ctx.fillRect(cx, a.headY - 14, 1, 2);

    // Bigger fish eyes (overdrawn on top of generic eyes for fish look)
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.25);
        if (dir === DIR_DOWN) {
            // Large bulging round eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 10, eyeY, 8, 7);
            ctx.fillRect(cx + 3, eyeY, 8, 7);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 8, eyeY + 1, 5, 5);
            ctx.fillRect(cx + 4, eyeY + 1, 5, 5);
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 6, eyeY + 2, 3, 3);
            ctx.fillRect(cx + 6, eyeY + 2, 3, 3);
            // Highlight
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 8, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 4, eyeY + 1, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 9;
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex, eyeY, 8, 7);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 1, eyeY + 1, 5, 5);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex + 2, eyeY + 2, 3, 3);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
        }
        // Fish mouth (round)
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 3, a.headY + a.headH - 5, 6, 3);
            ctx.fillStyle = colors.skin;
            ctx.fillRect(cx - 2, a.headY + a.headH - 4, 4, 1);
        }
        // Blush
        _drawBlush(ctx, cx, eyeY + 9, dir, 12);
    }

    // Scale pattern on shorter torso (tighter pattern)
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.5;
    for (let sy = a.torsoY + a.walk.bob + 2; sy < a.torsoY + a.walk.bob + a.torsoH - 1; sy += 3) {
        for (let sx = a.torsoX + 2; sx < a.torsoX + a.torsoW - 2; sx += 3) {
            ctx.fillRect(sx, sy, 2, 2);
        }
    }
    ctx.globalAlpha = 1.0;

    // Webbed hands (wider fins at arm ends)
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH - 3, a.armW + 4, 4);
    ctx.fillRect(a.rightArmX - 2, a.shoulderY + a.walk.armR + a.armH - 3, a.armW + 4, 4);
    // Webbing lines
    ctx.fillStyle = colors.outline;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH - 1, 1, 2);
    ctx.fillRect(a.rightArmX + a.armW - 2, a.shoulderY + a.walk.armR + a.armH - 1, 1, 2);
    ctx.globalAlpha = 1.0;

    // Flipper feet (wider, flatter for chibi)
    ctx.fillStyle = colors.skin;
    const fLY = a.legsTopY + a.walk.legL + a.legH - 2;
    const fRY = a.legsTopY + a.walk.legR + a.legH - 2;
    ctx.fillRect(a.leftLegX - 3, fLY, a.legW + 6, 4);
    ctx.fillRect(a.rightLegX - 3, fRY, a.legW + 6, 4);
    // Fin lines on flippers
    ctx.fillStyle = colors.outline;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(a.leftLegX - 1, fLY + 1, 1, 2);
    ctx.fillRect(a.leftLegX + a.legW, fLY + 1, 1, 2);
    ctx.fillRect(a.rightLegX - 1, fRY + 1, 1, 2);
    ctx.fillRect(a.rightLegX + a.legW, fRY + 1, 1, 2);
    ctx.globalAlpha = 1.0;
}

// ── Race 10: Ghost ──────────────────────────────────────────────────────────
function _drawGhost(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Ghost is semi-transparent
    ctx.save();
    ctx.globalAlpha = 0.6;

    // Back arms (wispy, shorter chibi arms)
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH - 2, colors.skin, colors.outline);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH - 2, colors.skin, colors.outline);
    }

    // NO LEGS — shorter wispy spectral tail for chibi proportions
    ctx.fillStyle = colors.skin;
    const tailTop = a.legsTopY;
    ctx.fillRect(cx - 6, tailTop, 12, 3);
    ctx.fillRect(cx - 5, tailTop + 3, 10, 2);
    ctx.fillRect(cx - 4, tailTop + 5, 8, 2);
    ctx.fillRect(cx - 3, tailTop + 7, 6, 2);
    ctx.fillRect(cx - 2, tailTop + 9, 4, 2);
    // Wavy wisps (softer)
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(cx - 7, tailTop + 1, 3, 3);
    ctx.fillRect(cx + 5, tailTop + 2, 3, 3);
    ctx.fillRect(cx - 5, tailTop + 6, 2, 3);
    ctx.fillRect(cx + 4, tailTop + 7, 2, 3);
    ctx.fillRect(cx - 3, tailTop + 10, 2, 2);
    ctx.fillRect(cx + 2, tailTop + 10, 2, 2);
    ctx.globalAlpha = 0.6;

    // Torso (fading, rounded for chibi)
    _drawRoundedRect(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, colors.mid);

    // Big translucent chibi head
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawRoundedRect(ctx, a.headX, a.headY, a.headW, a.headH + 2, colors.skin, colors.outline);
    _drawSoftShading(ctx, a.headX, a.headY, a.headW, a.headH + 2, colors.mid);

    ctx.restore(); // Restore alpha

    // Large hollow dark eyes (always drawn solid, bigger for chibi)
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.25);
        if (dir === DIR_DOWN) {
            // Larger hollow eyes
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 8, eyeY, 6, 7);
            ctx.fillRect(cx + 3, eyeY, 6, 7);
            // Rounded eye top/bottom
            ctx.fillRect(cx - 7, eyeY - 1, 4, 1);
            ctx.fillRect(cx + 4, eyeY - 1, 4, 1);
            ctx.fillRect(cx - 7, eyeY + 7, 4, 1);
            ctx.fillRect(cx + 4, eyeY + 7, 4, 1);
            // Glowing pupil (bigger)
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 6, eyeY + 3, 3, 3);
            ctx.fillRect(cx + 5, eyeY + 3, 3, 3);
            // Glow halo around pupils
            ctx.fillStyle = colors.eye;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(cx - 7, eyeY + 2, 5, 5);
            ctx.fillRect(cx + 4, eyeY + 2, 5, 5);
            ctx.globalAlpha = 1.0;
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 7;
            ctx.fillStyle = '#111';
            ctx.fillRect(ex, eyeY, 6, 7);
            ctx.fillRect(ex + 1, eyeY - 1, 4, 1);
            ctx.fillRect(ex + 1, eyeY + 7, 4, 1);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 2, eyeY + 3, 3, 3);
            ctx.fillStyle = colors.eye;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(ex + 1, eyeY + 2, 5, 5);
            ctx.globalAlpha = 1.0;
        }
        // Wailing mouth (rounder for chibi)
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 3, a.headY + a.headH - 5, 6, 4);
            ctx.fillRect(cx - 2, a.headY + a.headH - 6, 4, 1);
        }
    }

    // Ethereal highlight sparkles (more for chibi charm)
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(a.headX + 4, a.headY + 2, 3, 2);
    ctx.fillRect(a.headX + a.headW - 6, a.headY + 4, 2, 2);
    ctx.fillRect(a.torsoX + a.torsoW - 5, a.torsoY + 3 + a.walk.bob, 2, 2);
    ctx.fillRect(cx - 4, tailTop + 1, 2, 2);
    ctx.fillRect(cx + 3, tailTop + 3, 2, 1);

    // Front arms (wispy, shorter)
    ctx.save();
    ctx.globalAlpha = 0.6;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH - 2, colors.skin, colors.outline);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH - 2, colors.skin, colors.outline);
    }
    ctx.restore();
}

// ── Race 11: Golem ──────────────────────────────────────────────────────────
function _drawGolem(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const stoneColor = colors.skin;
    const stoneDark = colors.outline;
    const stoneMid = colors.mid;

    // Shorter blocky pillar legs (stubby chibi)
    const golemLegW = a.legW + 4;
    _drawRoundedRect(ctx, Math.floor(cx - golemLegW - 2), a.legsTopY + a.walk.legL, golemLegW, a.legH, stoneColor, stoneDark);
    _drawSoftShading(ctx, Math.floor(cx - golemLegW - 2), a.legsTopY + a.walk.legL, golemLegW, a.legH, stoneMid);
    _drawRoundedRect(ctx, Math.floor(cx + 2), a.legsTopY + a.walk.legR, golemLegW, a.legH, stoneColor, stoneDark);
    _drawSoftShading(ctx, Math.floor(cx + 2), a.legsTopY + a.walk.legR, golemLegW, a.legH, stoneMid);
    // Flat stone feet
    ctx.fillStyle = stoneDark;
    ctx.fillRect(Math.floor(cx - golemLegW - 3), a.legsTopY + a.walk.legL + a.legH - 1, golemLegW + 2, 2);
    ctx.fillRect(Math.floor(cx + 1), a.legsTopY + a.walk.legR + a.legH - 1, golemLegW + 2, 2);

    // Huge blocky arms (wider, shorter)
    const golemArmW = a.armW + 4;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, cx + a.torsoW / 2 + 1, a.shoulderY + a.walk.armR, golemArmW, a.armH, stoneColor, stoneDark);
        _drawSoftShading(ctx, cx + a.torsoW / 2 + 1, a.shoulderY + a.walk.armR, golemArmW, a.armH, stoneMid);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, cx - a.torsoW / 2 - golemArmW - 1, a.shoulderY + a.walk.armL, golemArmW, a.armH, stoneColor, stoneDark);
        _drawSoftShading(ctx, cx - a.torsoW / 2 - golemArmW - 1, a.shoulderY + a.walk.armL, golemArmW, a.armH, stoneMid);
    }

    // Massive blocky torso (wider for golem, adjusted for shorter chibi height)
    const golemTorsoW = a.torsoW + 10;
    const golemTorsoX = Math.floor(cx - golemTorsoW / 2);
    _drawRoundedRect(ctx, golemTorsoX, a.torsoY + a.walk.bob, golemTorsoW, a.torsoH + 2, stoneColor, stoneDark);
    _drawSoftShading(ctx, golemTorsoX, a.torsoY + a.walk.bob, golemTorsoW, a.torsoH + 2, stoneMid);

    // Bigger glowing rune in chest center
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.eye;
        ctx.fillRect(cx - 3, a.torsoY + a.walk.bob + Math.floor(a.torsoH / 2) - 2, 6, 5);
        // Rune glow halo
        ctx.fillStyle = colors.eye;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(cx - 4, a.torsoY + a.walk.bob + Math.floor(a.torsoH / 2) - 3, 8, 7);
        ctx.globalAlpha = 1.0;
        // Rune highlight center
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH / 2) - 1, 3, 3);
    }

    // Crack lines (fewer for shorter torso)
    ctx.fillStyle = stoneDark;
    ctx.fillRect(golemTorsoX + 3, a.torsoY + a.walk.bob + 3, 5, 1);
    ctx.fillRect(golemTorsoX + 6, a.torsoY + a.walk.bob + 4, 1, 3);
    ctx.fillRect(golemTorsoX + golemTorsoW - 8, a.torsoY + a.walk.bob + a.torsoH - 3, 5, 1);

    // Bigger square chibi head (no neck, sits right on torso)
    const golemHeadW = a.headW + 6;
    const golemHeadX = Math.floor(cx - golemHeadW / 2);
    _drawRoundedRect(ctx, golemHeadX, a.headY + 2, golemHeadW, a.headH - 2, stoneColor, stoneDark);
    _drawSoftShading(ctx, golemHeadX, a.headY + 2, golemHeadW, a.headH - 2, stoneMid);

    // Bigger glowing rune eyes
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35);
        ctx.fillStyle = colors.eye;
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 8, eyeY, 6, 5);
            ctx.fillRect(cx + 3, eyeY, 6, 5);
            // Glow halo
            ctx.fillStyle = colors.eye;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(cx - 9, eyeY - 1, 8, 7);
            ctx.fillRect(cx + 2, eyeY - 1, 8, 7);
            ctx.globalAlpha = 1.0;
            // Eye highlight
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 7, eyeY + 1, 3, 2);
            ctx.fillRect(cx + 4, eyeY + 1, 3, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 7;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY, 6, 5);
            ctx.fillStyle = colors.eye;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(ex - 1, eyeY - 1, 8, 7);
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY + 1, 3, 2);
        }
    }

    // Head cracks (bigger for chibi head)
    ctx.fillStyle = stoneDark;
    ctx.fillRect(golemHeadX + golemHeadW - 6, a.headY + 4, 1, 7);
    ctx.fillRect(golemHeadX + golemHeadW - 7, a.headY + 6, 1, 4);
    ctx.fillRect(golemHeadX + 4, a.headY + a.headH - 5, 3, 1);

    // Fist details at arm bottoms
    if (dir !== DIR_UP) {
        ctx.fillStyle = stoneDark;
        ctx.fillRect(cx - a.torsoW / 2 - golemArmW - 1, a.shoulderY + a.walk.armL + a.armH - 1, golemArmW + 2, 2);
        ctx.fillRect(cx + a.torsoW / 2, a.shoulderY + a.walk.armR + a.armH - 1, golemArmW + 2, 2);
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, cx + a.torsoW / 2 + 1, a.shoulderY + a.walk.armR, golemArmW, a.armH, stoneColor, stoneDark);
        _drawSoftShading(ctx, cx + a.torsoW / 2 + 1, a.shoulderY + a.walk.armR, golemArmW, a.armH, stoneMid);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, cx - a.torsoW / 2 - golemArmW - 1, a.shoulderY + a.walk.armL, golemArmW, a.armH, stoneColor, stoneDark);
        _drawSoftShading(ctx, cx - a.torsoW / 2 - golemArmW - 1, a.shoulderY + a.walk.armL, golemArmW, a.armH, stoneMid);
    }
}

// ── Race 12: Human ──────────────────────────────────────────────────────────
function _drawHuman(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, true);
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

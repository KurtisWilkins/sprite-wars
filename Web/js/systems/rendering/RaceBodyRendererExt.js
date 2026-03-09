/**
 * RaceBodyRendererExt.js — Cel-shaded race-specific humanoid body rendering (Races 13-24).
 * Each race has a unique chibi body shape with big head, stubby limbs, simple dot eyes,
 * and distinguishing characteristics drawn in 64×64 logical space, rendered at 256×256 via 4× supersampling.
 *
 * Art style: Flat cel-shaded, clean black outlines of uniform thickness, smooth rounded edges,
 * chibi proportions, vibrant saturated colors, hard-edged shading (flat fills),
 * NO gradients, simple dot eyes, no pixel art.
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

// Walk animation cycles (4 frames) — bouncier chibi walk
const WALK_CYCLES = [
    { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0  },
    { armL: -4, armR: 4,  legL: 4,  legR: -2, bob: -2 },
    { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0  },
    { armL: 4,  armR: -4, legL: -2, legR: 4,  bob: -2 },
];

// ── Clean Cel-Shaded Helpers ─────────────────────────────────────────────

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

/** Hard-edged shadow zone on the right side (flat fill, no gradient) */
function _drawShading(ctx, x, y, w, h, midColor) {
    const sx = Math.floor(x) + Math.floor(w * 0.55);
    const sy = Math.floor(y) + 1;
    const sw = Math.ceil(w * 0.45) - 1;
    const sh = h - 2;
    const r = Math.min(2, sw / 4, sh / 4);
    ctx.fillStyle = midColor;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, r);
    ctx.fill();
}

/** Hard-edged cel-shade shadow on right half (flat fill, no gradient) */
function _drawSoftShading(ctx, x, y, w, h, midColor) {
    const sx = Math.floor(x) + Math.floor(w * 0.55);
    const sy = Math.floor(y) + 1;
    const sw = Math.ceil(w * 0.45) - 1;
    const sh = h - 2;
    const r = Math.min(2, sw / 4, sh / 4);
    ctx.fillStyle = midColor;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, r);
    ctx.fill();
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

function _drawMouth(ctx, cx, y, dir, color) {
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#111111';
        // Simple small line mouth
        ctx.fillRect(cx - 1, y, 3, 1);
    }
}

// ── Clean blush marks — no-op in cel-shaded style ──────────────────────
function _drawBlush(ctx, cx, blushY, dir, spacing) {
    // No blush in clean cel-shaded style — keeping function as no-op for compatibility
}

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
    ctx.fillStyle = '#553322';
    ctx.fillRect(lx - 1, ly, legW + 2, 3);
    ctx.fillRect(lx, ly + 3, legW, 1);
    ctx.fillRect(rx - 1, ry, legW + 2, 3);
    ctx.fillRect(rx, ry + 3, legW, 1);
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

    const feetY = groundY;
    const legsTopY = feetY - legH;
    const torsoTopY = legsTopY - torsoH + 1;
    const headTopY = torsoTopY - headH + 4 + walk.bob;
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

    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');

    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);
    _drawShoes(ctx, leftLegX, legsTopY + walk.legL + legH - 3, rightLegX, legsTopY + walk.legR + legH - 3, legW);

    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    if (hasTunic) _drawTunic(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin);

    if (dir === DIR_UP) _drawHairBack(ctx, headX, headY, headW, headH, colors);
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    const eyeY = headY + Math.floor(headH * 0.3);
    _drawEyes(ctx, cx, eyeY, dir, colors);
    _drawMouth(ctx, cx, headY + headH - 5, dir, colors.outline);
    _drawBlush(ctx, cx, eyeY + 9, dir);
    _drawHairTop(ctx, headX, headY, headW, dir, colors.hair);

    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Race-specific renderers (13-24)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Race 13: Lizard man ─────────────────────────────────────────────────────
function _drawLizardman(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, false);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Elongated snout
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 2, a.headY + a.headH - 2, 5, 4);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(cx - 1, a.headY + a.headH + 1, 3, 1);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 6, a.headY + Math.floor(a.headH * 0.4), 7, 4);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 7, a.headY + Math.floor(a.headH * 0.4) + 1, 2, 2);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.4), 7, 4);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX + a.headW + 6, a.headY + Math.floor(a.headH * 0.4) + 1, 2, 2);
    }

    // Ridge crest
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 1, a.headY - 4, 3, 4);
    ctx.fillRect(cx, a.headY - 6, 2, 3);

    // Scale pattern on torso (diamond pattern)
    ctx.fillStyle = colors.mid;
    for (let sy = a.torsoY + a.walk.bob + 2; sy < a.torsoY + a.walk.bob + a.torsoH - 2; sy += 3) {
        for (let sx = a.torsoX + 2; sx < a.torsoX + a.torsoW - 2; sx += 3) {
            ctx.fillRect(sx, sy, 2, 1);
        }
    }

    // Thick tail
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        const tailX = dir === DIR_LEFT ? cx + a.torsoW / 2 : cx - a.torsoW / 2 - 4;
        const tailY = a.torsoY + a.torsoH - 3 + a.walk.bob;
        ctx.fillRect(tailX, tailY, 4, 3);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 3 : -3), tailY + 1, 4, 3);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 6 : -6), tailY + 2, 3, 2);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 8 : -8), tailY + 3, 2, 2);
    }

    // Clawed tips on hands and feet
    ctx.fillStyle = '#443322';
    ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH, a.armW, 2);
    ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + a.armH, a.armW, 2);

    // 3-toe claws on feet
    const fLY = a.legsTopY + a.walk.legL + a.legH - 2;
    const fRY = a.legsTopY + a.walk.legR + a.legH - 2;
    ctx.fillRect(a.leftLegX - 2, fLY, 3, 3);
    ctx.fillRect(a.leftLegX + a.legW, fLY, 3, 3);
    ctx.fillRect(a.rightLegX - 2, fRY, 3, 3);
    ctx.fillRect(a.rightLegX + a.legW, fRY, 3, 3);
}

// ── Race 14: Minotaur ───────────────────────────────────────────────────────
function _drawMinotaur(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Massive body proportions
    const mTorsoW = a.torsoW + 6;
    const mTorsoX = Math.floor(cx - mTorsoW / 2);
    const mArmW = a.armW + 3;
    const mHeadW = a.headW + 4;
    const mHeadX = Math.floor(cx - mHeadW / 2);
    const mLegW = a.legW + 3;

    // Back arms
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, cx + mTorsoW / 2, a.shoulderY + a.walk.armR, mArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, cx - mTorsoW / 2 - mArmW, a.shoulderY + a.walk.armL, mArmW, a.armH, colors, 'left');

    // Thick legs with hooves
    _drawLeg(ctx, Math.floor(cx - mLegW - 1), a.legsTopY + a.walk.legL, mLegW, a.legH, colors);
    _drawLeg(ctx, Math.floor(cx + 1), a.legsTopY + a.walk.legR, mLegW, a.legH, colors);
    ctx.fillStyle = '#443322';
    ctx.fillRect(Math.floor(cx - mLegW - 2), a.legsTopY + a.walk.legL + a.legH - 3, mLegW + 3, 5);
    ctx.fillRect(Math.floor(cx), a.legsTopY + a.walk.legR + a.legH - 3, mLegW + 3, 5);

    // Massive torso
    _drawOutlinedRect(ctx, mTorsoX, a.torsoY + a.walk.bob, mTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawShading(ctx, mTorsoX, a.torsoY + a.walk.bob, mTorsoW, a.torsoH, colors.mid);

    // Wide head
    if (dir === DIR_UP) _drawHairBack(ctx, mHeadX, a.headY, mHeadW, a.headH, colors);
    _drawOutlinedRect(ctx, mHeadX, a.headY, mHeadW, a.headH + 2, colors.skin, colors.outline);
    _drawShading(ctx, mHeadX, a.headY, mHeadW, a.headH + 2, colors.mid);

    // Large curved bull horns
    ctx.fillStyle = '#887766';
    // Left horn
    ctx.fillRect(mHeadX - 3, a.headY - 2, 5, 4);
    ctx.fillRect(mHeadX - 6, a.headY - 5, 4, 4);
    ctx.fillRect(mHeadX - 7, a.headY - 7, 3, 3);
    // Right horn
    ctx.fillRect(mHeadX + mHeadW - 2, a.headY - 2, 5, 4);
    ctx.fillRect(mHeadX + mHeadW + 2, a.headY - 5, 4, 4);
    ctx.fillRect(mHeadX + mHeadW + 4, a.headY - 7, 3, 3);

    // Face — chibi minotaur
    if (dir !== DIR_UP) {
        _drawEyes(ctx, cx, a.headY + Math.floor(a.headH * 0.3), dir, colors, 6);
        _drawBlush(ctx, cx, a.headY + Math.floor(a.headH * 0.3) + 9, dir, 11);
        // Wide nose and nose ring
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.mid;
            ctx.fillRect(cx - 3, a.headY + a.headH - 5, 6, 3);
            ctx.fillStyle = '#ccaa44';
            ctx.fillRect(cx - 2, a.headY + a.headH - 3, 4, 2);
            ctx.fillRect(cx - 1, a.headY + a.headH - 1, 2, 2);
        }
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, cx + mTorsoW / 2, a.shoulderY + a.walk.armR, mArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, cx - mTorsoW / 2 - mArmW, a.shoulderY + a.walk.armL, mArmW, a.armH, colors, 'left');
}

// ── Race 15: Monkey man ─────────────────────────────────────────────────────
function _drawMonkeyman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Slim torso
    const mTorsoW = a.torsoW - 2;
    const mTorsoX = Math.floor(cx - mTorsoW / 2);

    // Long arms
    const longArmH = a.armH + 4;

    // Back arms (long)
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW - 1, longArmH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW - 1, longArmH, colors, 'left');

    // Shorter legs with gripping feet
    const mLegH = a.legH - 2;
    _drawLeg(ctx, a.leftLegX, a.legsTopY + 2 + a.walk.legL, a.legW - 1, mLegH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + 2 + a.walk.legR, a.legW - 1, mLegH, colors);
    // Gripping feet
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftLegX - 2, a.legsTopY + 2 + a.walk.legL + mLegH - 2, a.legW + 3, 3);
    ctx.fillRect(a.rightLegX - 2, a.legsTopY + 2 + a.walk.legR + mLegH - 2, a.legW + 3, 3);

    // Torso
    _drawOutlinedRect(ctx, mTorsoX, a.torsoY + a.walk.bob, mTorsoW, a.torsoH - 2, colors.skin, colors.outline);
    _drawShading(ctx, mTorsoX, a.torsoY + a.walk.bob, mTorsoW, a.torsoH - 2, colors.mid);

    // Round head
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Large round ears on sides
    ctx.fillStyle = colors.skin;
    ctx.fillRect(a.headX - 4, a.headY + 2, 5, 5);
    ctx.fillRect(a.headX + a.headW, a.headY + 2, 5, 5);
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.headX - 3, a.headY + 3, 3, 3);
    ctx.fillRect(a.headX + a.headW + 1, a.headY + 3, 3, 3);

    // Face — chibi monkeyman
    if (dir !== DIR_UP) {
        _drawEyes(ctx, cx, a.headY + Math.floor(a.headH * 0.35), dir, colors);
        _drawBlush(ctx, cx, a.headY + Math.floor(a.headH * 0.35) + 9, dir);
        // Wide grin
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 3, a.headY + a.headH - 4, 7, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 2, a.headY + a.headH - 4, 5, 1);
        }
    }

    // Curling prehensile tail
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        const tailX = dir === DIR_LEFT ? cx + mTorsoW / 2 + 1 : cx - mTorsoW / 2 - 3;
        const tailY = a.torsoY + a.torsoH - 4 + a.walk.bob;
        ctx.fillRect(tailX, tailY, 3, 2);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 2 : -2), tailY + 2, 3, 2);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 4 : -4), tailY + 3, 3, 2);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 5 : -5), tailY + 2, 2, 2);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 6 : -6), tailY, 2, 3);
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW - 1, longArmH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW - 1, longArmH, colors, 'left');
}

// ── Race 16: Mummy ──────────────────────────────────────────────────────────
function _drawMummy(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, false);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Bandage wrapping pattern - horizontal stripes across body
    ctx.fillStyle = '#d4c8a0';
    // Head bandages
    for (let y = a.headY + 2; y < a.headY + a.headH - 2; y += 3) {
        ctx.fillRect(a.headX + 1, y, a.headW - 2, 2);
    }
    // Torso bandages
    for (let y = a.torsoY + a.walk.bob + 1; y < a.torsoY + a.walk.bob + a.torsoH - 1; y += 3) {
        ctx.fillRect(a.torsoX + 1, y, a.torsoW - 2, 2);
    }
    // Arm bandages
    for (let y = 0; y < a.armH; y += 3) {
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + y, a.armW, 2);
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + y, a.armW, 2);
    }
    // Leg bandages
    for (let y = 0; y < a.legH; y += 3) {
        ctx.fillRect(a.leftLegX, a.legsTopY + a.walk.legL + y, a.legW, 2);
        ctx.fillRect(a.rightLegX, a.legsTopY + a.walk.legR + y, a.legW, 2);
    }

    // One glowing eye visible through bandages
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35);
        ctx.fillStyle = colors.eye;
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx + 3, eyeY, 3, 3);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 3;
            ctx.fillRect(ex, eyeY, 3, 3);
        }
        // Glow
        ctx.fillStyle = 'rgba(255,255,100,0.3)';
        ctx.fillRect(cx + (dir === DIR_DOWN ? 2 : (dir === DIR_RIGHT ? 1 : -4)), eyeY - 1, 5, 5);
    }

    // Loose trailing bandage strips at arm ends
    ctx.fillStyle = '#c4b890';
    ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH, 3, 4);
    ctx.fillRect(a.rightArmX + a.armW - 2, a.shoulderY + a.walk.armR + a.armH, 3, 4);

    // Dusty gray overlay dots for aged look
    ctx.fillStyle = 'rgba(128,128,128,0.2)';
    ctx.fillRect(a.torsoX + 3, a.torsoY + 3 + a.walk.bob, 2, 2);
    ctx.fillRect(a.torsoX + a.torsoW - 5, a.torsoY + a.torsoH - 5 + a.walk.bob, 2, 2);
    ctx.fillRect(a.headX + 4, a.headY + 5, 2, 2);
}

// ── Race 17: Ork ────────────────────────────────────────────────────────────
function _drawOrk(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Massive muscular proportions
    const orkTorsoW = a.torsoW + 4;
    const orkTorsoX = Math.floor(cx - orkTorsoW / 2);
    const orkArmW = a.armW + 2;

    // Back arms (beefy)
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, cx + orkTorsoW / 2, a.shoulderY + a.walk.armR, orkArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, cx - orkTorsoW / 2 - orkArmW, a.shoulderY + a.walk.armL, orkArmW, a.armH, colors, 'left');

    // Thick legs
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW + 2, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW + 2, a.legH, colors);
    _drawShoes(ctx, a.leftLegX, a.legsTopY + a.walk.legL + a.legH - 3, a.rightLegX, a.legsTopY + a.walk.legR + a.legH - 3, a.legW + 2);

    // Muscular torso (slightly hunched)
    _drawOutlinedRect(ctx, orkTorsoX, a.torsoY + a.walk.bob + 1, orkTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawShading(ctx, orkTorsoX, a.torsoY + a.walk.bob + 1, orkTorsoW, a.torsoH, colors.mid);
    _drawTunic(ctx, orkTorsoX, a.torsoY + a.walk.bob + 1, orkTorsoW, a.torsoH, colors.skin);

    // Head with heavy brow
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Heavy brow ridge
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX + 1, a.headY + Math.floor(a.headH * 0.25), a.headW - 2, 2);
    }

    // Small tusks from lower jaw
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#eeddcc';
        ctx.fillRect(cx - 4, a.headY + a.headH - 2, 2, 3);
        ctx.fillRect(cx + 3, a.headY + a.headH - 2, 2, 3);
    }

    // Face — chibi ork (smaller eyes under brow)
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35) + 2;
        _drawEyes(ctx, cx, eyeY, dir, colors, 4);
        _drawBlush(ctx, cx, eyeY + 9, dir, 9);
        // Flat nose
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.mid;
            ctx.fillRect(cx - 2, a.headY + a.headH - 5, 5, 3);
        }
    }

    _drawHairTop(ctx, a.headX, a.headY, a.headW, dir, colors.hair);

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, cx + orkTorsoW / 2, a.shoulderY + a.walk.armR, orkArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, cx - orkTorsoW / 2 - orkArmW, a.shoulderY + a.walk.armL, orkArmW, a.armH, colors, 'left');
}

// ── Race 18: Rat man ────────────────────────────────────────────────────────
function _drawRatman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Hunched lean body
    const rTorsoW = a.torsoW - 2;
    const rTorsoX = Math.floor(cx - rTorsoW / 2);

    // Thin wiry arms
    const rArmW = a.armW - 1;
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR + 1, rArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL + 1, rArmW, a.armH, colors, 'left');

    // Thin legs
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW - 1, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW - 1, a.legH, colors);
    // Long narrow feet
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftLegX - 2, a.legsTopY + a.walk.legL + a.legH - 2, a.legW + 3, 3);
    ctx.fillRect(a.rightLegX - 2, a.legsTopY + a.walk.legR + a.legH - 2, a.legW + 3, 3);

    // Hunched torso
    _drawOutlinedRect(ctx, rTorsoX, a.torsoY + a.walk.bob + 2, rTorsoW, a.torsoH - 2, colors.skin, colors.outline);
    _drawShading(ctx, rTorsoX, a.torsoY + a.walk.bob + 2, rTorsoW, a.torsoH - 2, colors.mid);
    _drawTunic(ctx, rTorsoX, a.torsoY + a.walk.bob + 2, rTorsoW, a.torsoH - 2, colors.skin);

    // Head with pointed snout
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Large round ears
    ctx.fillStyle = colors.skin;
    ctx.fillRect(a.headX - 3, a.headY - 3, 6, 6);
    ctx.fillRect(a.headX + a.headW - 2, a.headY - 3, 6, 6);
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.headX - 2, a.headY - 2, 4, 4);
    ctx.fillRect(a.headX + a.headW - 1, a.headY - 2, 4, 4);

    // Pointed snout
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 2, a.headY + a.headH - 2, 4, 4);
        ctx.fillStyle = '#222';
        ctx.fillRect(cx - 1, a.headY + a.headH + 1, 2, 2);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 5, a.headY + Math.floor(a.headH * 0.5), 6, 3);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.5), 6, 3);
    }

    // Beady eyes
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35);
        ctx.fillStyle = colors.eye;
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 4, eyeY, 3, 3);
            ctx.fillRect(cx + 2, eyeY, 3, 3);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 3;
            ctx.fillRect(ex, eyeY, 3, 3);
        }
        ctx.fillStyle = '#111';
        ctx.fillRect(cx - (dir === DIR_DOWN ? 3 : (dir === DIR_RIGHT ? -2 : 2)), eyeY + 1, 2, 2);
    }

    // Whiskers
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 2, a.headY + Math.floor(a.headH * 0.6), 3, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.6), 3, 1);
    }

    // Thin whip tail
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        const tx = dir === DIR_LEFT ? cx + rTorsoW / 2 + 1 : cx - rTorsoW / 2 - 2;
        const ty = a.torsoY + a.torsoH - 2 + a.walk.bob;
        ctx.fillRect(tx, ty, 2, 2);
        ctx.fillRect(tx + (dir === DIR_LEFT ? 2 : -2), ty + 1, 2, 2);
        ctx.fillRect(tx + (dir === DIR_LEFT ? 4 : -4), ty + 2, 2, 2);
        ctx.fillRect(tx + (dir === DIR_LEFT ? 6 : -6), ty + 3, 1, 2);
        ctx.fillRect(tx + (dir === DIR_LEFT ? 7 : -7), ty + 4, 1, 2);
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR + 1, rArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL + 1, rArmW, a.armH, colors, 'left');
}

// ── Race 19: Robot ──────────────────────────────────────────────────────────
function _drawRobot(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const metalColor = colors.skin;
    const metalDark = colors.outline;
    const metalMid = colors.mid;

    // Segmented/jointed arms
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawOutlinedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, metalColor, metalDark);
        ctx.fillStyle = metalDark;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + Math.floor(a.armH / 2), a.armW, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawOutlinedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, metalColor, metalDark);
        ctx.fillStyle = metalDark;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH / 2), a.armW, 2);
    }

    // Piston-like legs
    _drawOutlinedRect(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, metalColor, metalDark);
    _drawOutlinedRect(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, metalColor, metalDark);
    // Joint circles on legs
    ctx.fillStyle = metalDark;
    ctx.fillRect(a.leftLegX + 1, a.legsTopY + a.walk.legL + Math.floor(a.legH / 2), a.legW - 2, 2);
    ctx.fillRect(a.rightLegX + 1, a.legsTopY + a.walk.legR + Math.floor(a.legH / 2), a.legW - 2, 2);
    // Flat rectangular feet
    ctx.fillRect(a.leftLegX - 2, a.legsTopY + a.walk.legL + a.legH - 2, a.legW + 4, 4);
    ctx.fillRect(a.rightLegX - 2, a.legsTopY + a.walk.legR + a.legH - 2, a.legW + 4, 4);

    // Rectangular mechanical torso
    const rTorsoW = a.torsoW + 2;
    const rTorsoX = Math.floor(cx - rTorsoW / 2);
    _drawOutlinedRect(ctx, rTorsoX, a.torsoY + a.walk.bob, rTorsoW, a.torsoH, metalColor, metalDark);
    // Panel lines
    ctx.fillStyle = metalDark;
    ctx.fillRect(rTorsoX + 2, a.torsoY + a.walk.bob + 2, rTorsoW - 4, 1);
    ctx.fillRect(rTorsoX + 2, a.torsoY + a.walk.bob + a.torsoH - 3, rTorsoW - 4, 1);
    // Chest light (glowing dot)
    if (dir !== DIR_UP) {
        const frame = a.walk.bob === 0 ? 0 : 1;
        ctx.fillStyle = frame ? colors.eye : '#fff';
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH / 2) - 1, 3, 3);
    }

    // Square blocky head
    const robotHeadH = a.headH - 2;
    _drawOutlinedRect(ctx, a.headX, a.headY + 1, a.headW, robotHeadH, metalColor, metalDark);

    // Antenna
    ctx.fillStyle = metalDark;
    ctx.fillRect(cx - 1, a.headY - 6, 2, 7);
    // Antenna blinks on certain frames
    const blinkFrame = (a.walk.armL !== 0);
    ctx.fillStyle = blinkFrame ? colors.eye : metalMid;
    ctx.fillRect(cx - 2, a.headY - 7, 4, 2);

    // Visor-line for eyes
    if (dir !== DIR_UP) {
        const visorY = a.headY + Math.floor(robotHeadH * 0.4);
        ctx.fillStyle = colors.eye;
        ctx.fillRect(a.headX + 3, visorY, a.headW - 6, 3);
        ctx.fillStyle = '#fff';
        if (dir === DIR_DOWN) {
            ctx.fillRect(a.headX + 4, visorY + 1, 2, 1);
            ctx.fillRect(a.headX + a.headW - 6, visorY + 1, 2, 1);
        } else {
            const ex = dir === DIR_RIGHT ? a.headX + a.headW - 6 : a.headX + 4;
            ctx.fillRect(ex, visorY + 1, 2, 1);
        }
    }

    // Bolt/rivet dots at joints
    ctx.fillStyle = metalMid;
    ctx.fillRect(a.leftArmX + 1, a.shoulderY + a.walk.armL + 1, 2, 2);
    ctx.fillRect(a.rightArmX + a.armW - 3, a.shoulderY + a.walk.armR + 1, 2, 2);

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawOutlinedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, metalColor, metalDark);
        ctx.fillStyle = metalDark;
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + Math.floor(a.armH / 2), a.armW, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawOutlinedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, metalColor, metalDark);
        ctx.fillStyle = metalDark;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH / 2), a.armW, 2);
    }
}

// ── Race 20: Shark man ──────────────────────────────────────────────────────
function _drawSharkman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // V-shaped torso (wider at shoulders)
    const sTorsoW = a.torsoW + 2;
    const sTorsoX = Math.floor(cx - sTorsoW / 2);

    // Back arms (thick)
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, cx + sTorsoW / 2, a.shoulderY + a.walk.armR, a.armW + 1, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, cx - sTorsoW / 2 - a.armW - 1, a.shoulderY + a.walk.armL, a.armW + 1, a.armH, colors, 'left');

    // Strong legs
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW + 1, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW + 1, a.legH, colors);
    // Fin-like feet
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftLegX - 2, a.legsTopY + a.walk.legL + a.legH - 2, a.legW + 5, 4);
    ctx.fillRect(a.rightLegX - 2, a.legsTopY + a.walk.legR + a.legH - 2, a.legW + 5, 4);

    // Powerful torso
    _drawOutlinedRect(ctx, sTorsoX, a.torsoY + a.walk.bob, sTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawShading(ctx, sTorsoX, a.torsoY + a.walk.bob, sTorsoW, a.torsoH, colors.mid);

    // Dorsal fin on back
    if (dir === DIR_DOWN || dir === DIR_LEFT || dir === DIR_RIGHT) {
        ctx.fillStyle = colors.mid;
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob - 4, 3, 5);
        ctx.fillRect(cx, a.torsoY + a.walk.bob - 6, 2, 3);
    }
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.mid;
        ctx.fillRect(cx - 2, a.torsoY + a.walk.bob - 5, 5, 6);
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob - 7, 3, 3);
    }

    // Torpedo-shaped head
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Small eyes on sides
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#111';
            ctx.fillRect(a.headX + 2, eyeY, 3, 3);
            ctx.fillRect(a.headX + a.headW - 5, eyeY, 3, 3);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(a.headX + 3, eyeY + 1, 1, 1);
            ctx.fillRect(a.headX + a.headW - 4, eyeY + 1, 1, 1);
        }
        // Rows of teeth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#fff';
            for (let tx = cx - 4; tx <= cx + 3; tx += 2) {
                ctx.fillRect(tx, a.headY + a.headH - 3, 1, 2);
            }
        }
    }

    // Webbed fingers hint
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH - 3, a.armW + 2, 3);
    ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH - 3, a.armW + 2, 3);

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, cx + sTorsoW / 2, a.shoulderY + a.walk.armR, a.armW + 1, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, cx - sTorsoW / 2 - a.armW - 1, a.shoulderY + a.walk.armL, a.armW + 1, a.armH, colors, 'left');
}

// ── Race 21: Skeleton ───────────────────────────────────────────────────────
function _drawSkeleton(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const boneColor = '#e8e0d0';
    const boneDark = '#9a9080';
    const boneColors = { skin: boneColor, mid: '#d0c8b8', outline: boneDark, hair: colors.hair, eye: colors.eye };

    // Bony thin arms
    const skArmW = a.armW - 2;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawOutlinedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, skArmW, a.armH, boneColor, boneDark);
        ctx.fillStyle = boneDark;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.45), skArmW, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawOutlinedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, skArmW, a.armH, boneColor, boneDark);
        ctx.fillStyle = boneDark;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.45), skArmW, 2);
    }

    // Bony legs
    const skLegW = a.legW - 2;
    _drawOutlinedRect(ctx, a.leftLegX + 1, a.legsTopY + a.walk.legL, skLegW, a.legH, boneColor, boneDark);
    _drawOutlinedRect(ctx, a.rightLegX + 1, a.legsTopY + a.walk.legR, skLegW, a.legH, boneColor, boneDark);
    // Knobby knee detail
    ctx.fillStyle = boneColor;
    ctx.fillRect(a.leftLegX, a.legsTopY + a.walk.legL + Math.floor(a.legH * 0.4), skLegW + 2, 3);
    ctx.fillRect(a.rightLegX, a.legsTopY + a.walk.legR + Math.floor(a.legH * 0.4), skLegW + 2, 3);
    // Bony feet
    ctx.fillStyle = boneDark;
    ctx.fillRect(a.leftLegX - 1, a.legsTopY + a.walk.legL + a.legH - 2, skLegW + 4, 3);
    ctx.fillRect(a.rightLegX - 1, a.legsTopY + a.walk.legR + a.legH - 2, skLegW + 4, 3);

    // Ribcage torso
    _drawOutlinedRect(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, boneColor, boneDark);
    // Rib lines
    ctx.fillStyle = boneDark;
    for (let i = 0; i < 5; i++) {
        const ry = a.torsoY + a.walk.bob + 2 + i * Math.floor(a.torsoH / 5);
        ctx.fillRect(a.torsoX + 2, ry, a.torsoW - 4, 1);
    }
    // Spine line
    if (dir === DIR_DOWN || dir === DIR_UP) {
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob + 1, 2, a.torsoH - 2);
    }

    // Skull head
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, boneColor, boneDark);

    // Skull features
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.25);
        // Hollow eye sockets
        ctx.fillStyle = '#222';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 6, eyeY, 5, 5);
            ctx.fillRect(cx + 2, eyeY, 5, 5);
            // Glow in sockets
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 5, eyeY + 1, 3, 3);
            ctx.fillRect(cx + 3, eyeY + 1, 3, 3);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 5;
            ctx.fillRect(ex, eyeY, 5, 5);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 1, eyeY + 1, 3, 3);
        }
        // Nose holes
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#333';
            ctx.fillRect(cx - 1, a.headY + a.headH - 6, 1, 2);
            ctx.fillRect(cx + 1, a.headY + a.headH - 6, 1, 2);
        }
        // Jaw line with teeth
        ctx.fillStyle = boneDark;
        ctx.fillRect(a.headX + 2, a.headY + a.headH - 3, a.headW - 4, 1);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#fff';
            for (let tx = a.headX + 4; tx < a.headX + a.headW - 4; tx += 2) {
                ctx.fillRect(tx, a.headY + a.headH - 2, 1, 2);
            }
        }
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawOutlinedRect(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR, skArmW, a.armH, boneColor, boneDark);
        ctx.fillStyle = boneDark;
        ctx.fillRect(a.rightArmX + 1, a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.45), skArmW, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawOutlinedRect(ctx, a.leftArmX, a.shoulderY + a.walk.armL, skArmW, a.armH, boneColor, boneDark);
        ctx.fillStyle = boneDark;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.45), skArmW, 2);
    }
}

// ── Race 22: Turtle man ─────────────────────────────────────────────────────
function _drawTurtleman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const shellColor = '#558844';
    const shellDark = '#336622';

    // Short stubby arms
    const tArmH = a.armH - 2;
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, tArmH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, tArmH, colors, 'left');

    // Short stubby legs with wide flat feet
    const tLegH = a.legH - 2;
    _drawLeg(ctx, a.leftLegX, a.legsTopY + 2 + a.walk.legL, a.legW, tLegH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + 2 + a.walk.legR, a.legW, tLegH, colors);
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftLegX - 2, a.legsTopY + 2 + a.walk.legL + tLegH - 2, a.legW + 5, 4);
    ctx.fillRect(a.rightLegX - 2, a.legsTopY + 2 + a.walk.legR + tLegH - 2, a.legW + 5, 4);

    // Shell (behind body — large oval)
    const shellW = a.torsoW + 8;
    const shellH = a.torsoH + 6;
    const shellX = Math.floor(cx - shellW / 2);
    const shellY = a.torsoY + a.walk.bob - 2;
    ctx.fillStyle = shellDark;
    ctx.fillRect(shellX - 1, shellY - 1, shellW + 2, shellH + 2);
    ctx.fillStyle = shellColor;
    ctx.fillRect(shellX, shellY, shellW, shellH);
    // Shell pattern (hexagonal hints)
    ctx.fillStyle = shellDark;
    ctx.fillRect(shellX + Math.floor(shellW / 3), shellY + 2, 1, shellH - 4);
    ctx.fillRect(shellX + Math.floor(shellW * 2 / 3), shellY + 2, 1, shellH - 4);
    ctx.fillRect(shellX + 2, shellY + Math.floor(shellH / 2), shellW - 4, 1);

    // Body (on top of shell)
    _drawOutlinedRect(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, colors.skin, colors.outline);
    _drawShading(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, colors.mid);

    // Round head
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Face — chibi turtleman
    if (dir !== DIR_UP) {
        _drawEyes(ctx, cx, a.headY + Math.floor(a.headH * 0.35), dir, colors);
        _drawBlush(ctx, cx, a.headY + Math.floor(a.headH * 0.35) + 9, dir);
        // Beak-like mouth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#bbaa66';
            ctx.fillRect(cx - 2, a.headY + a.headH - 4, 4, 3);
        }
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, tArmH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, tArmH, colors, 'left');
}

// ── Race 23: Wolf man ───────────────────────────────────────────────────────
function _drawWolfman(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Pointed wolf ears
    ctx.fillStyle = colors.skin;
    ctx.fillRect(a.headX - 1, a.headY - 6, 5, 6);
    ctx.fillRect(a.headX, a.headY - 9, 3, 3);
    ctx.fillRect(a.headX + a.headW - 4, a.headY - 6, 5, 6);
    ctx.fillRect(a.headX + a.headW - 3, a.headY - 9, 3, 3);
    // Inner ear
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.headX + 1, a.headY - 5, 3, 4);
    ctx.fillRect(a.headX + a.headW - 3, a.headY - 5, 3, 4);

    // Elongated snout
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 2, a.headY + a.headH - 3, 5, 4);
        ctx.fillStyle = '#222';
        ctx.fillRect(cx - 1, a.headY + a.headH, 3, 2);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 5, a.headY + Math.floor(a.headH * 0.45), 6, 3);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.45), 6, 3);
    }

    // Fierce eyes
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35);
        ctx.fillStyle = colors.eye;
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 5, eyeY, 4, 3);
            ctx.fillRect(cx + 2, eyeY, 4, 3);
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 4, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 3, eyeY + 1, 2, 2);
        }
    }

    // Fur tuft on chest when facing down
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.torsoX + 4, a.torsoY + a.walk.bob + 1, a.torsoW - 8, 4);
    }

    // Bushy tail
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        const tailX = dir === DIR_LEFT ? cx + a.torsoW / 2 + 1 : cx - a.torsoW / 2 - 5;
        const tailY = a.torsoY + a.torsoH - 6 + a.walk.bob;
        ctx.fillRect(tailX, tailY, 5, 4);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 2 : -2), tailY - 2, 5, 4);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 3 : -3), tailY - 3, 4, 3);
    }

    // Padded paw feet (digitigrade hint)
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftLegX - 1, a.legsTopY + a.walk.legL + a.legH - 3, a.legW + 3, 4);
    ctx.fillRect(a.rightLegX - 1, a.legsTopY + a.walk.legR + a.legH - 3, a.legW + 3, 4);
    // Claw tips
    ctx.fillStyle = '#443322';
    ctx.fillRect(a.leftLegX - 2, a.legsTopY + a.walk.legL + a.legH, 3, 2);
    ctx.fillRect(a.leftLegX + a.legW, a.legsTopY + a.walk.legL + a.legH, 3, 2);
    ctx.fillRect(a.rightLegX - 2, a.legsTopY + a.walk.legR + a.legH, 3, 2);
    ctx.fillRect(a.rightLegX + a.legW, a.legsTopY + a.walk.legR + a.legH, 3, 2);
}

// ── Race 24: Zombie ─────────────────────────────────────────────────────────
function _drawZombie(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Slouched posture (torso drawn lower)
    const zTorsoY = a.torsoY + 2;

    // Back arms (one slightly longer)
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR + 2, a.armW, a.armH + 2, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL + 2, a.armW, a.armH, colors, 'left');

    // Shambling legs (one slightly shorter)
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR + 1, a.legW, a.legH - 1, colors);
    _drawShoes(ctx, a.leftLegX, a.legsTopY + a.walk.legL + a.legH - 3, a.rightLegX, a.legsTopY + a.walk.legR + a.legH - 3, a.legW);

    // Torso
    _drawOutlinedRect(ctx, a.torsoX, zTorsoY + a.walk.bob, a.torsoW, a.torsoH, colors.skin, colors.outline);
    _drawShading(ctx, a.torsoX, zTorsoY + a.walk.bob, a.torsoW, a.torsoH, colors.mid);

    // Torn clothing lines across torso
    ctx.fillStyle = colors.outline;
    ctx.fillRect(a.torsoX + 3, zTorsoY + a.walk.bob + 3, 5, 1);
    ctx.fillRect(a.torsoX + a.torsoW - 6, zTorsoY + a.walk.bob + 7, 4, 1);

    // Wound marks (red pixels)
    ctx.fillStyle = '#882222';
    ctx.fillRect(a.torsoX + 4, zTorsoY + a.walk.bob + 5, 3, 2);
    ctx.fillRect(a.torsoX + a.torsoW - 5, zTorsoY + a.walk.bob + 9, 2, 2);

    // Head
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Asymmetric face: one eye bigger
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            // Left eye (bigger)
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 6, eyeY, 5, 5);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 5, eyeY + 1, 3, 3);
            // Right eye (smaller, half-closed)
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx + 3, eyeY + 2, 3, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 4;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY, 4, 4);
        }
        // Exposed jaw
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 3, a.headY + a.headH - 3, 7, 2);
        }
    }

    // Patchy hair
    ctx.fillStyle = colors.hair;
    if (dir !== DIR_UP) {
        ctx.fillRect(a.headX, a.headY - 1, 5, 3);
        ctx.fillRect(a.headX + a.headW - 5, a.headY - 2, 4, 3);
    }

    // Green decay tint pixels
    ctx.fillStyle = 'rgba(80,120,60,0.25)';
    ctx.fillRect(a.torsoX + 2, zTorsoY + a.walk.bob + 2, 3, 3);
    ctx.fillRect(a.headX + 3, a.headY + 3, 2, 2);

    // Head wound
    ctx.fillStyle = '#882222';
    ctx.fillRect(a.headX + a.headW - 4, a.headY + 2, 3, 2);

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR + 2, a.armW, a.armH + 2, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL + 2, a.armW, a.armH, colors, 'left');
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

    // Chibi proportions: big head, compact body, stubby limbs
    const dims = {
        headW: 28, headH: 22,
        torsoW: 20, torsoH: 10,
        armW: 6, armH: 10,
        legW: 8, legH: 8,
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

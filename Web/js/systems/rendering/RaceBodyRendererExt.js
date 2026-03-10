/**
 * RaceBodyRendererExt.js — Adventure-Quest-style race-specific body rendering (Races 13-24).
 * Each race has a unique body shape, head features, and distinguishing characteristics
 * drawn in 64×64 logical space, rendered at 256×256 via 4× supersampling.
 *
 * Art style: Adventure Quest / heroic fantasy — thick 2px black outlines,
 * heroic proportions (~4.5 heads tall), broader shoulders, defined hands,
 * tall detailed boots, cel-shaded with hard shadows + specular highlights,
 * rich equipment/armor detail, expressive race-specific features.
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

// Walk animation cycles (4 frames) — heroic stride with pronounced arm swing
const WALK_CYCLES = [
    { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0  },
    { armL: -5, armR: 5,  legL: 5,  legR: -4, bob: -1 },
    { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0  },
    { armL: 5,  armR: -5, legL: -4, legR: 5,  bob: -1 },
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

// ── AQ-Style Rendering Helpers ──────────────────────────────────────────────

/** Thick clean outline around a rounded rectangle (AQ-style 2px black outline) */
function _drawCleanRectOutline(ctx, x, y, w, h, color = '#000000', lineWidth = 2) {
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
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
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
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
}

/** AQ-style cel-shading: hard shadow on right + specular highlight on left */
function _drawShading(ctx, x, y, w, h, midColor) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const sx = fx + Math.floor(w * 0.6);
    const sy = fy + 2;
    const sw = Math.ceil(w * 0.35);
    const sh = h - 4;
    if (sw > 0 && sh > 0) {
        const r = Math.min(2, sw / 4, sh / 4);
        ctx.fillStyle = midColor;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.roundRect(sx, sy, sw, sh, r);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    const hlW = Math.max(1, Math.floor(w * 0.15));
    const hlH = Math.max(1, h - 6);
    if (hlH > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.2;
        ctx.fillRect(fx + 2, fy + 3, hlW, hlH);
        ctx.globalAlpha = 1.0;
    }
}

/** AQ-style cel-shading with softer highlight */
function _drawSoftShading(ctx, x, y, w, h, midColor) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const sx = fx + Math.floor(w * 0.6);
    const sy = fy + 2;
    const sw = Math.ceil(w * 0.35);
    const sh = h - 4;
    if (sw > 0 && sh > 0) {
        const r = Math.min(2, sw / 4, sh / 4);
        ctx.fillStyle = midColor;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.roundRect(sx, sy, sw, sh, r);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    const hlW = Math.max(1, Math.floor(w * 0.12));
    const hlH = Math.max(1, h - 6);
    if (hlH > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(fx + 2, fy + 3, hlW, hlH);
        ctx.globalAlpha = 1.0;
    }
}

// ── AQ-Style Eyes — expressive with thick lids ──────────────────────────
function _drawEyes(ctx, cx, eyeY, dir, colors, spacing) {
    const sp = spacing || 5;
    const eyeColor = colors.eye || '#4488cc';
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - sp - 3, eyeY - 1, 6, 2);
        ctx.fillRect(cx + sp - 2, eyeY - 1, 6, 2);
        ctx.fillStyle = '#f8f4f0';
        ctx.fillRect(cx - sp - 2, eyeY + 1, 5, 4);
        ctx.fillRect(cx + sp - 2, eyeY + 1, 5, 4);
        ctx.fillStyle = eyeColor;
        ctx.fillRect(cx - sp - 1, eyeY + 1, 3, 3);
        ctx.fillRect(cx + sp - 1, eyeY + 1, 3, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - sp, eyeY + 2, 2, 2);
        ctx.fillRect(cx + sp, eyeY + 2, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - sp + 1, eyeY + 1, 1, 1);
        ctx.fillRect(cx + sp + 1, eyeY + 1, 1, 1);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - sp - 2, eyeY + 5, 5, 1);
        ctx.fillRect(cx + sp - 2, eyeY + 5, 5, 1);
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        const ex = dir === DIR_RIGHT ? cx + 2 : cx - 6;
        ctx.fillStyle = '#000000';
        ctx.fillRect(ex, eyeY - 1, 5, 2);
        ctx.fillStyle = '#f8f4f0';
        ctx.fillRect(ex, eyeY + 1, 4, 4);
        ctx.fillStyle = eyeColor;
        ctx.fillRect(ex + 1, eyeY + 1, 3, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(ex + 1, eyeY + 2, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ex + 2, eyeY + 1, 1, 1);
        ctx.fillStyle = '#000000';
        ctx.fillRect(ex, eyeY + 5, 4, 1);
    }
}

// ── AQ-Style Nose ────────────────────────────────────────────────────────
function _drawNose(ctx, cx, y, dir) {
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 1, y, 2, 2);
        ctx.fillRect(cx, y + 2, 1, 1);
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        const nx = dir === DIR_RIGHT ? cx + 3 : cx - 4;
        ctx.fillStyle = '#000000';
        ctx.fillRect(nx, y, 2, 2);
    }
}

// ── AQ-Style Mouth — defined lips ───────────────────────────────────────
function _drawMouth(ctx, cx, y, dir, color) {
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#221111';
        ctx.fillRect(cx - 3, y, 6, 1);
        ctx.fillStyle = '#443333';
        ctx.fillRect(cx - 2, y + 1, 4, 1);
        ctx.fillStyle = '#665555';
        ctx.fillRect(cx - 1, y + 1, 2, 1);
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        const mx = dir === DIR_RIGHT ? cx + 2 : cx - 4;
        ctx.fillStyle = '#221111';
        ctx.fillRect(mx, y, 3, 1);
        ctx.fillStyle = '#443333';
        ctx.fillRect(mx, y + 1, 2, 1);
    }
}

// ── Blush (no-op in AQ style) ───────────────────────────────────────────
function _drawBlush(ctx, cx, blushY, dir, spacing) {
    // AQ style does not use blush marks
}

// ── AQ-Style Hair — voluminous with defined strands ─────────────────────
function _drawHairTop(ctx, x, y, w, dir, hairColor) {
    if (dir !== DIR_UP) {
        const r = parseInt(hairColor.slice(1,3),16), g = parseInt(hairColor.slice(3,5),16), b = parseInt(hairColor.slice(5,7),16);
        const shadowColor = `rgb(${Math.max(0,r-40)},${Math.max(0,g-40)},${Math.max(0,b-40)})`;
        ctx.fillStyle = hairColor;
        ctx.fillRect(x - 3, y - 4, w + 6, 7);
        ctx.fillRect(x - 2, y - 6, w + 4, 3);
        ctx.fillRect(x + Math.floor(w / 2) - 2, y - 8, 5, 3);
        ctx.fillRect(x + Math.floor(w / 2) - 1, y - 9, 3, 2);
        if (dir === DIR_DOWN || dir === DIR_LEFT) {
            ctx.fillRect(x - 4, y + 1, 5, 8);
            ctx.fillStyle = shadowColor;
            ctx.fillRect(x - 3, y + 4, 3, 5);
        }
        ctx.fillStyle = hairColor;
        if (dir === DIR_DOWN || dir === DIR_RIGHT) {
            ctx.fillRect(x + w - 1, y + 1, 5, 8);
            ctx.fillStyle = shadowColor;
            ctx.fillRect(x + w, y + 4, 3, 5);
        }
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.15;
        ctx.fillRect(x + 1, y - 5, 3, 4);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 3, y - 4, w + 6, 1);
        ctx.fillRect(x - 2, y - 6, w + 4, 1);
    }
}

function _drawHairBack(ctx, x, y, w, h, colors) {
    ctx.fillStyle = colors.hair;
    ctx.fillRect(x - 3, y, w + 6, h);
    const r = parseInt(colors.hair.slice(1,3),16), g = parseInt(colors.hair.slice(3,5),16), b = parseInt(colors.hair.slice(5,7),16);
    ctx.fillStyle = `rgb(${Math.max(0,r-40)},${Math.max(0,g-40)},${Math.max(0,b-40)})`;
    ctx.fillRect(x + w, y + 2, 3, h - 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x - 3, y - 1, w + 6, 2);
    ctx.fillRect(x - 4, y, 2, h - 2);
    ctx.fillRect(x + w + 2, y, 2, h - 2);
}

function _drawLeg(ctx, x, y, w, h, colors) {
    _drawRoundedRect(ctx, x, y, w, h, colors.skin, colors.outline);
    _drawSoftShading(ctx, x, y, w, h, colors.mid);
    const kneeY = y + Math.floor(h * 0.45);
    ctx.fillStyle = colors.mid || colors.outline;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x + 1, kneeY, w - 2, 1);
    ctx.globalAlpha = 1.0;
}

function _drawArm(ctx, x, y, w, h, colors, side) {
    _drawRoundedRect(ctx, x, y, w, h, colors.skin, colors.outline);
    if (side === 'right') _drawSoftShading(ctx, x, y, w, h, colors.mid);
    const elbowY = y + Math.floor(h * 0.45);
    ctx.fillStyle = colors.mid || colors.outline;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x + 1, elbowY, w - 2, 1);
    ctx.globalAlpha = 1.0;
    _drawHand(ctx, x, y + h - 1, w, colors);
}

function _drawHand(ctx, x, y, armW, colors) {
    const hw = armW + 2;
    const hx = x - 1;
    ctx.fillStyle = colors.skin;
    ctx.fillRect(hx, y, hw, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(hx, y, hw, 1);
    ctx.fillRect(hx, y + 3, hw, 1);
    ctx.fillRect(hx + Math.floor(hw / 2), y + 1, 1, 2);
}

function _drawShoes(ctx, lx, ly, rx, ry, legW, colors) {
    const bootH = 6;
    const bootW = legW + 3;
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(lx - 1, ly - 2, bootW, bootH);
    ctx.fillRect(rx - 1, ry - 2, bootW, bootH);
    ctx.fillStyle = '#5a3828';
    ctx.fillRect(lx - 1, ly - 2, bootW, 2);
    ctx.fillRect(rx - 1, ry - 2, bootW, 2);
    ctx.fillStyle = '#3a2015';
    ctx.fillRect(lx - 2, ly + bootH - 4, bootW + 1, 2);
    ctx.fillRect(rx - 1, ry + bootH - 4, bootW + 1, 2);
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(lx - 2, ly + bootH - 2, bootW + 2, 2);
    ctx.fillRect(rx - 2, ry + bootH - 2, bootW + 2, 2);
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(lx + 1, ly, 2, 2);
    ctx.fillRect(rx + 1, ry, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.12;
    ctx.fillRect(lx, ly - 1, 2, bootH - 2);
    ctx.fillRect(rx, ry - 1, 2, bootH - 2);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#000000';
    ctx.fillRect(lx - 2, ly - 2, 1, bootH + 2);
    ctx.fillRect(lx + bootW - 1, ly - 2, 1, bootH + 2);
    ctx.fillRect(rx - 2, ry - 2, 1, bootH + 2);
    ctx.fillRect(rx + bootW - 1, ry - 2, 1, bootH + 2);
}

function _drawShoulders(ctx, a, dir, colors) {
    const pW = a.armW + 4;
    const pH = 5;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        const px = a.rightArmX - 2;
        const py = a.shoulderY + a.walk.armR - 2;
        _drawRoundedRect(ctx, px, py, pW, pH, colors.skin, '#000000');
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.2;
        ctx.fillRect(px + 1, py + 1, pW - 2, 1);
        ctx.globalAlpha = 1.0;
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        const px = a.leftArmX - 2;
        const py = a.shoulderY + a.walk.armL - 2;
        _drawRoundedRect(ctx, px, py, pW, pH, colors.skin, '#000000');
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.2;
        ctx.fillRect(px + 1, py + 1, pW - 2, 1);
        ctx.globalAlpha = 1.0;
    }
}

function _drawTunic(ctx, x, y, w, h, skinColor) {
    const r = parseInt(skinColor.slice(1, 3), 16) - 30;
    const g = parseInt(skinColor.slice(3, 5), 16) - 30;
    const b = parseInt(skinColor.slice(5, 7), 16) - 30;
    ctx.fillStyle = `rgb(${Math.max(0, r)},${Math.max(0, g)},${Math.max(0, b)})`;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 1);
    ctx.fillStyle = `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)})`;
    ctx.fillRect(x + 2, y + 1, w - 4, 2);
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(x + 1, y + h - 4, w - 2, 3);
    ctx.fillStyle = '#c0a040';
    ctx.fillRect(x + Math.floor(w / 2) - 1, y + h - 4, 3, 3);
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

    // AQ-style heroic proportions: broader shoulders, smaller head, defined neck
    const feetY = groundY;
    const legsTopY = feetY - legH;
    const torsoTopY = legsTopY - torsoH + 1;
    const neckGap = 2; // Shorter neck — AQ style has head close to broad shoulders
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

    // Legs with joints
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);
    _drawShoes(ctx, leftLegX, legsTopY + walk.legL + legH - 4, rightLegX, legsTopY + walk.legR + legH - 4, legW);

    // Broad torso
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    if (hasTunic) _drawTunic(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin);

    // Neck
    ctx.fillStyle = colors.skin;
    ctx.fillRect(cx - 2, torsoY + walk.bob - 2, 4, 3);

    // Head
    if (dir === DIR_UP) _drawHairBack(ctx, headX, headY, headW, headH, colors);
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    // Face — AQ-style
    const eyeY = headY + Math.floor(headH * 0.25);
    _drawEyes(ctx, cx, eyeY, dir, colors);
    _drawNose(ctx, cx, headY + Math.floor(headH * 0.55), dir);
    _drawMouth(ctx, cx, headY + Math.floor(headH * 0.72), dir, colors.outline);
    _drawHairTop(ctx, headX, headY, headW, dir, colors.hair);

    // Shoulder pauldrons
    _drawShoulders(ctx, a, dir, colors);

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Race-specific renderers (13-24)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Race 13: Lizard man ─────────────────────────────────────────────────────
function _drawLizardman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;
    // Thick muscular build — wider torso
    const lTorsoW = a.torsoW + 4;
    const lTorsoX = Math.floor(cx - lTorsoW / 2);
    const lTorsoY = a.torsoY + bob;
    const snoutLen = Math.floor(a.headH * 0.55);
    const frillH = Math.floor(a.headH * 0.5);

    // --- Thick muscular tail (behind body) ---
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 2, lTorsoY + a.torsoH - 1, 5, 5);
        ctx.fillRect(cx - 1, lTorsoY + a.torsoH + 4, 4, 4);
        ctx.fillRect(cx, lTorsoY + a.torsoH + 7, 3, 3);
        ctx.fillRect(cx + 1, lTorsoY + a.torsoH + 9, 2, 2);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(cx - 1, lTorsoY + a.torsoH, 3, 1);
        ctx.fillRect(cx, lTorsoY + a.torsoH + 5, 2, 1);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx + 2, lTorsoY + a.torsoH + 10, 1, 1);
    } else {
        const td = dir === DIR_DOWN ? 0 : (dir === DIR_LEFT ? 1 : -1);
        const tailBaseX = dir === DIR_LEFT ? lTorsoX + lTorsoW - 2 : (dir === DIR_RIGHT ? lTorsoX - 2 : cx - 3);
        const tailBaseY = lTorsoY + a.torsoH - 3;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tailBaseX + td * 0, tailBaseY, 6, 5);
        ctx.fillRect(tailBaseX + td * 5, tailBaseY + 2, 5, 4);
        ctx.fillRect(tailBaseX + td * 9, tailBaseY + 4, 4, 3);
        ctx.fillRect(tailBaseX + td * 12, tailBaseY + 6, 3, 2);
        ctx.fillRect(tailBaseX + td * 14, tailBaseY + 7, 2, 2);
        // Diamond scale pattern on tail
        ctx.fillStyle = colors.mid;
        ctx.fillRect(tailBaseX + td * 1, tailBaseY + 1, 2, 2);
        ctx.fillRect(tailBaseX + td * 4, tailBaseY + 1, 2, 2);
        ctx.fillRect(tailBaseX + td * 6, tailBaseY + 3, 2, 2);
        ctx.fillRect(tailBaseX + td * 10, tailBaseY + 5, 2, 1);
        // Tail outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(tailBaseX + td * 15, tailBaseY + 8, 1, 1);
    }

    // --- Spinal ridge/crest down back (visible from back and sides) ---
    if (dir === DIR_UP || dir === DIR_LEFT || dir === DIR_RIGHT) {
        ctx.fillStyle = colors.hair;
        for (let i = 0; i < 5; i++) {
            const spY = a.headY + a.headH + i * Math.floor(a.torsoH / 4);
            ctx.fillRect(cx - 1, spY, 3, 3);
            ctx.fillRect(cx, spY - 1, 1, 1);
        }
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');

    // --- Legs with clawed feet (no boots) ---
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, colors);
    // 3 clawed toes per foot
    const clawColor = '#443322';
    const fLY = a.legsTopY + a.walk.legL + a.legH - 1;
    const fRY = a.legsTopY + a.walk.legR + a.legH - 1;
    ctx.fillStyle = clawColor;
    ctx.fillRect(a.leftLegX - 2, fLY, 2, 4);
    ctx.fillRect(a.leftLegX + Math.floor(a.legW / 2) - 1, fLY, 2, 5);
    ctx.fillRect(a.leftLegX + a.legW, fLY, 2, 4);
    ctx.fillRect(a.rightLegX - 2, fRY, 2, 4);
    ctx.fillRect(a.rightLegX + Math.floor(a.legW / 2) - 1, fRY, 2, 5);
    ctx.fillRect(a.rightLegX + a.legW, fRY, 2, 4);
    // Claw tips
    ctx.fillStyle = '#000000';
    ctx.fillRect(a.leftLegX - 2, fLY + 3, 1, 1);
    ctx.fillRect(a.leftLegX + a.legW + 1, fLY + 3, 1, 1);
    ctx.fillRect(a.rightLegX - 2, fRY + 3, 1, 1);
    ctx.fillRect(a.rightLegX + a.legW + 1, fRY + 3, 1, 1);

    // --- Thick muscular torso with diamond scale texture ---
    _drawOutlinedRect(ctx, lTorsoX, lTorsoY, lTorsoW, a.torsoH, colors.skin, '#000000');
    _drawShading(ctx, lTorsoX, lTorsoY, lTorsoW, a.torsoH, colors.mid);
    // Diamond scale pattern rows
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.6;
    for (let row = 0; row < Math.floor(a.torsoH / 4); row++) {
        const sy = lTorsoY + 2 + row * 4;
        for (let col = 0; col < Math.floor(lTorsoW / 4); col++) {
            const sx = lTorsoX + 2 + col * 4 + (row % 2 === 1 ? 2 : 0);
            ctx.fillRect(sx, sy, 1, 1);
            ctx.fillRect(sx - 1, sy + 1, 3, 1);
            ctx.fillRect(sx, sy + 2, 1, 1);
        }
    }
    ctx.globalAlpha = 1.0;
    // Lighter ventral belly plate
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(lTorsoX + Math.floor(lTorsoW * 0.2), lTorsoY + 2, Math.floor(lTorsoW * 0.6), a.torsoH - 3);
        ctx.globalAlpha = 1.0;
    }

    // --- Thick neck ---
    ctx.fillStyle = colors.skin;
    ctx.fillRect(cx - 3, a.headY + a.headH - 1, 7, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 4, a.headY + a.headH + 2, 1, 1);
    ctx.fillRect(cx + 4, a.headY + a.headH + 2, 1, 1);

    // --- Head ---
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, '#000000');
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // --- Neck frill that flares out ---
    ctx.fillStyle = colors.hair;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 4, a.headY + a.headH - frillH, 5, frillH);
        ctx.fillRect(a.headX - 6, a.headY + a.headH - frillH + 2, 3, frillH - 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX - 6, a.headY + a.headH - frillH + 2, 1, frillH - 2);
    }
    ctx.fillStyle = colors.hair;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 1, a.headY + a.headH - frillH, 5, frillH);
        ctx.fillRect(a.headX + a.headW + 3, a.headY + a.headH - frillH + 2, 3, frillH - 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + a.headW + 5, a.headY + a.headH - frillH + 2, 1, frillH - 2);
    }

    // --- Spinal crest on top of head ---
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 1, a.headY - 6, 3, 4);
    ctx.fillRect(cx, a.headY - 8, 2, 3);
    ctx.fillRect(cx - 1, a.headY - 3, 3, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx, a.headY - 9, 1, 1);

    // --- Elongated lizard snout with teeth ---
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 5, a.headY + a.headH - 3, 10, snoutLen + 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 5, a.headY + a.headH + snoutLen - 2, 10, 1);
        // Teeth (upper jaw)
        ctx.fillStyle = '#eeeedd';
        ctx.fillRect(cx - 3, a.headY + a.headH + snoutLen - 3, 1, 2);
        ctx.fillRect(cx - 1, a.headY + a.headH + snoutLen - 3, 1, 2);
        ctx.fillRect(cx + 1, a.headY + a.headH + snoutLen - 3, 1, 2);
        ctx.fillRect(cx + 3, a.headY + a.headH + snoutLen - 3, 1, 2);
        // Nostrils
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 2, a.headY + a.headH - 2, 1, 1);
        ctx.fillRect(cx + 2, a.headY + a.headH - 2, 1, 1);
        // Forked tongue
        ctx.fillStyle = '#cc3333';
        ctx.fillRect(cx, a.headY + a.headH + snoutLen - 1, 1, 3);
        ctx.fillRect(cx - 1, a.headY + a.headH + snoutLen + 1, 1, 2);
        ctx.fillRect(cx + 1, a.headY + a.headH + snoutLen + 1, 1, 2);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - snoutLen - 2, a.headY + Math.floor(a.headH * 0.3), snoutLen + 3, 6);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX - snoutLen - 3, a.headY + Math.floor(a.headH * 0.3), 1, 6);
        ctx.fillStyle = '#eeeedd';
        ctx.fillRect(a.headX - snoutLen - 2, a.headY + Math.floor(a.headH * 0.3) + 5, 2, 2);
        ctx.fillRect(a.headX - snoutLen + 1, a.headY + Math.floor(a.headH * 0.3) + 4, 1, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX - snoutLen - 2, a.headY + Math.floor(a.headH * 0.3) + 1, 2, 1);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW - 1, a.headY + Math.floor(a.headH * 0.3), snoutLen + 3, 6);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + a.headW + snoutLen + 2, a.headY + Math.floor(a.headH * 0.3), 1, 6);
        ctx.fillStyle = '#eeeedd';
        ctx.fillRect(a.headX + a.headW + snoutLen, a.headY + Math.floor(a.headH * 0.3) + 5, 2, 2);
        ctx.fillRect(a.headX + a.headW + snoutLen - 2, a.headY + Math.floor(a.headH * 0.3) + 4, 1, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + a.headW + snoutLen, a.headY + Math.floor(a.headH * 0.3) + 1, 2, 1);
    }

    // --- Slitted reptile eyes (vertical pupils) ---
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.25);
        ctx.fillStyle = colors.eye;
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 6, eyeY, 4, 4);
            ctx.fillRect(cx + 3, eyeY, 4, 4);
            // Vertical slit pupil
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 5, eyeY, 1, 4);
            ctx.fillRect(cx + 4, eyeY, 1, 4);
            // Specular highlight
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 4, eyeY, 1, 1);
            ctx.fillRect(cx + 5, eyeY, 1, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 6;
            ctx.fillRect(ex, eyeY, 4, 4);
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex + 1, eyeY, 1, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex + 2, eyeY, 1, 1);
        }
    }

    // --- Clawed hands (3 claws) ---
    const clawH = Math.floor(a.armH * 0.18);
    const laY = a.shoulderY + a.walk.armL + a.armH;
    const raY = a.shoulderY + a.walk.armR + a.armH;
    ctx.fillStyle = clawColor;
    ctx.fillRect(a.leftArmX - 1, laY, 2, clawH);
    ctx.fillRect(a.leftArmX + Math.floor(a.armW / 2), laY, 2, clawH + 1);
    ctx.fillRect(a.leftArmX + a.armW - 1, laY, 2, clawH);
    ctx.fillRect(a.rightArmX - 1, raY, 2, clawH);
    ctx.fillRect(a.rightArmX + Math.floor(a.armW / 2), raY, 2, clawH + 1);
    ctx.fillRect(a.rightArmX + a.armW - 1, raY, 2, clawH);

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
    // Re-draw front arm claws on top
    ctx.fillStyle = clawColor;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.rightArmX - 1, raY, 2, clawH);
        ctx.fillRect(a.rightArmX + Math.floor(a.armW / 2), raY, 2, clawH + 1);
        ctx.fillRect(a.rightArmX + a.armW - 1, raY, 2, clawH);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.leftArmX - 1, laY, 2, clawH);
        ctx.fillRect(a.leftArmX + Math.floor(a.armW / 2), laY, 2, clawH + 1);
        ctx.fillRect(a.leftArmX + a.armW - 1, laY, 2, clawH);
    }
}

// ── Race 14: Minotaur ───────────────────────────────────────────────────────
function _drawMinotaur(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;

    // MASSIVE powerful build — extra wide torso
    const mTorsoW = a.torsoW + 8;
    const mTorsoX = Math.floor(cx - mTorsoW / 2);
    const mTorsoY = a.torsoY + bob;
    const mArmW = a.armW + 4;
    const mHeadW = a.headW + 6;
    const mHeadH = a.headH + 4;
    const mHeadX = Math.floor(cx - mHeadW / 2);
    const mLegW = a.legW + 4;
    const mLegH = a.legH + 2;
    const hornLen = Math.floor(mHeadH * 0.6);

    // --- Short bull tail (behind body) ---
    if (dir !== DIR_DOWN) {
        const td = dir === DIR_LEFT ? 1 : (dir === DIR_RIGHT ? -1 : 0);
        const tailX = dir === DIR_UP ? cx - 1 : (dir === DIR_LEFT ? mTorsoX + mTorsoW - 2 : mTorsoX);
        const tailY = mTorsoY + a.torsoH - 2;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tailX + td * 0, tailY, 3, 2);
        ctx.fillRect(tailX + td * 2, tailY + 2, 2, 3);
        ctx.fillRect(tailX + td * 3, tailY + 4, 2, 3);
        // Tail tuft
        ctx.fillStyle = colors.hair;
        ctx.fillRect(tailX + td * 2, tailY + 6, 4, 3);
        ctx.fillRect(tailX + td * 3, tailY + 7, 3, 2);
    }

    // --- Back arms (massive with fur on forearms) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, cx + Math.floor(mTorsoW / 2), a.shoulderY + a.walk.armR, mArmW, a.armH + 2, colors, 'right');
        // Fur tufts on forearm
        ctx.fillStyle = colors.hair;
        ctx.fillRect(cx + Math.floor(mTorsoW / 2), a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.5), mArmW, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, cx - Math.floor(mTorsoW / 2) - mArmW, a.shoulderY + a.walk.armL, mArmW, a.armH + 2, colors, 'left');
        ctx.fillStyle = colors.hair;
        ctx.fillRect(cx - Math.floor(mTorsoW / 2) - mArmW, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.5), mArmW, 3);
    }

    // --- Thick legs with cloven hooves (no boots) ---
    _drawLeg(ctx, Math.floor(cx - mLegW - 1), a.legsTopY + a.walk.legL, mLegW, mLegH, colors);
    _drawLeg(ctx, Math.floor(cx + 1), a.legsTopY + a.walk.legR, mLegW, mLegH, colors);
    // Cloven hooves
    const lhY = a.legsTopY + a.walk.legL + mLegH - 2;
    const rhY = a.legsTopY + a.walk.legR + mLegH - 2;
    ctx.fillStyle = '#332211';
    ctx.fillRect(Math.floor(cx - mLegW - 2), lhY, mLegW + 3, 4);
    ctx.fillRect(Math.floor(cx), rhY, mLegW + 3, 4);
    // Hoof split line
    ctx.fillStyle = '#000000';
    ctx.fillRect(Math.floor(cx - mLegW / 2 - 1), lhY + 1, 1, 3);
    ctx.fillRect(Math.floor(cx + mLegW / 2 + 1), rhY + 1, 1, 3);
    // Hoof outline
    ctx.fillRect(Math.floor(cx - mLegW - 2), lhY + 3, mLegW + 3, 1);
    ctx.fillRect(Math.floor(cx), rhY + 3, mLegW + 3, 1);

    // --- Barrel chest / massive torso ---
    _drawOutlinedRect(ctx, mTorsoX, mTorsoY, mTorsoW, a.torsoH + 2, colors.skin, '#000000');
    _drawShading(ctx, mTorsoX, mTorsoY, mTorsoW, a.torsoH + 2, colors.mid);
    // Chest fur
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(mTorsoX + 3, mTorsoY + 2, mTorsoW - 6, Math.floor(a.torsoH * 0.4));
        ctx.globalAlpha = 1.0;
    }
    // Pectoral muscle definition
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(mTorsoX + 2, mTorsoY + 2, Math.floor(mTorsoW / 2) - 2, 4);
    ctx.fillRect(mTorsoX + Math.floor(mTorsoW / 2) + 1, mTorsoY + 2, Math.floor(mTorsoW / 2) - 2, 4);
    // Abs
    ctx.fillRect(mTorsoX + 4, mTorsoY + Math.floor(a.torsoH * 0.45), mTorsoW - 8, 2);
    ctx.fillRect(mTorsoX + 4, mTorsoY + Math.floor(a.torsoH * 0.65), mTorsoW - 8, 2);
    ctx.globalAlpha = 1.0;

    // --- Thick neck (no gap — head sits directly on shoulders) ---
    ctx.fillStyle = colors.skin;
    ctx.fillRect(cx - 5, a.headY + mHeadH - 2, 10, 5);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 6, a.headY + mHeadH + 2, 1, 1);
    ctx.fillRect(cx + 5, a.headY + mHeadH + 2, 1, 1);

    // --- Dark mane (behind head) ---
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(mHeadX - 2, a.headY + 2, mHeadW + 4, mHeadH);
        ctx.fillRect(mHeadX - 1, a.headY + mHeadH, mHeadW + 2, 4);
    }

    // --- Huge bull head with broad snout ---
    _drawOutlinedRect(ctx, mHeadX, a.headY, mHeadW, mHeadH, colors.skin, '#000000');
    _drawShading(ctx, mHeadX, a.headY, mHeadW, mHeadH, colors.mid);

    // Small pointed ears
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(mHeadX - 4, a.headY + 3, 5, 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(mHeadX - 4, a.headY + 3, 1, 4);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(mHeadX - 3, a.headY + 4, 3, 2);
    }
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(mHeadX + mHeadW - 1, a.headY + 3, 5, 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(mHeadX + mHeadW + 3, a.headY + 3, 1, 4);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(mHeadX + mHeadW, a.headY + 4, 3, 2);
    }

    // --- Heavy brow ridge ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(mHeadX + 2, a.headY + Math.floor(mHeadH * 0.18), mHeadW - 4, 3);
        ctx.fillRect(cx - 1, a.headY + Math.floor(mHeadH * 0.15), 2, 2);
    }

    // --- Large curved horns with ridges ---
    ctx.fillStyle = '#998877';
    // Left horn
    ctx.fillRect(mHeadX - 2, a.headY, 4, 3);
    ctx.fillRect(mHeadX - 5, a.headY - 3, 4, 4);
    ctx.fillRect(mHeadX - 7, a.headY - hornLen + 2, 3, hornLen - 3);
    ctx.fillRect(mHeadX - 6, a.headY - hornLen, 2, 3);
    // Right horn
    ctx.fillRect(mHeadX + mHeadW - 2, a.headY, 4, 3);
    ctx.fillRect(mHeadX + mHeadW + 1, a.headY - 3, 4, 4);
    ctx.fillRect(mHeadX + mHeadW + 4, a.headY - hornLen + 2, 3, hornLen - 3);
    ctx.fillRect(mHeadX + mHeadW + 4, a.headY - hornLen, 2, 3);
    // Horn tips (lighter)
    ctx.fillStyle = '#ccbbaa';
    ctx.fillRect(mHeadX - 6, a.headY - hornLen, 1, 2);
    ctx.fillRect(mHeadX + mHeadW + 5, a.headY - hornLen, 1, 2);
    // Horn ridges
    ctx.fillStyle = '#776655';
    ctx.fillRect(mHeadX - 4, a.headY - 1, 2, 1);
    ctx.fillRect(mHeadX - 6, a.headY - 4, 2, 1);
    ctx.fillRect(mHeadX + mHeadW + 2, a.headY - 1, 2, 1);
    ctx.fillRect(mHeadX + mHeadW + 4, a.headY - 4, 2, 1);
    // Horn outlines
    ctx.fillStyle = '#000000';
    ctx.fillRect(mHeadX - 7, a.headY - hornLen, 1, hornLen + 2);
    ctx.fillRect(mHeadX + mHeadW + 6, a.headY - hornLen, 1, hornLen + 2);

    // --- Face features ---
    if (dir !== DIR_UP) {
        // Bovine eyes under brow
        const eyeY = a.headY + Math.floor(mHeadH * 0.35);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#f8f4f0';
            ctx.fillRect(cx - 7, eyeY, 5, 4);
            ctx.fillRect(cx + 3, eyeY, 5, 4);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 6, eyeY + 1, 3, 2);
            ctx.fillRect(cx + 4, eyeY + 1, 3, 2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 5, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 5, eyeY + 1, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 7;
            ctx.fillStyle = '#f8f4f0';
            ctx.fillRect(ex, eyeY, 5, 4);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 1, eyeY + 1, 3, 2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex + 2, eyeY + 1, 2, 2);
        }

        // Broad snout / muzzle with flared nostrils
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.mid;
            ctx.fillRect(cx - 6, a.headY + mHeadH - 7, 12, 6);
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 6, a.headY + mHeadH - 7, 12, 1);
            // Flared nostrils
            ctx.fillStyle = '#222222';
            ctx.fillRect(cx - 4, a.headY + mHeadH - 5, 3, 2);
            ctx.fillRect(cx + 2, a.headY + mHeadH - 5, 3, 2);
            // Gold nose ring
            ctx.fillStyle = '#ddaa22';
            ctx.fillRect(cx - 2, a.headY + mHeadH - 3, 5, 2);
            ctx.fillRect(cx - 3, a.headY + mHeadH - 2, 1, 3);
            ctx.fillRect(cx + 3, a.headY + mHeadH - 2, 1, 3);
            ctx.fillRect(cx - 2, a.headY + mHeadH, 5, 1);
            // Ring highlight
            ctx.fillStyle = '#ffdd44';
            ctx.fillRect(cx - 1, a.headY + mHeadH - 3, 1, 1);
        } else {
            const mx = dir === DIR_RIGHT ? mHeadX + mHeadW - 2 : mHeadX - 4;
            ctx.fillStyle = colors.mid;
            ctx.fillRect(mx, a.headY + mHeadH - 7, 6, 6);
            ctx.fillStyle = '#000000';
            ctx.fillRect(mx, a.headY + mHeadH - 7, 6, 1);
            // Nostril
            ctx.fillStyle = '#222222';
            ctx.fillRect(mx + (dir === DIR_RIGHT ? 4 : 0), a.headY + mHeadH - 5, 2, 2);
            // Side nose ring
            ctx.fillStyle = '#ddaa22';
            ctx.fillRect(mx + (dir === DIR_RIGHT ? 3 : 1), a.headY + mHeadH - 3, 3, 2);
            ctx.fillRect(mx + (dir === DIR_RIGHT ? 4 : 1), a.headY + mHeadH - 1, 2, 2);
        }
    }

    // --- Front arms (massive with fur on forearms) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, cx + Math.floor(mTorsoW / 2), a.shoulderY + a.walk.armR, mArmW, a.armH + 2, colors, 'right');
        ctx.fillStyle = colors.hair;
        ctx.fillRect(cx + Math.floor(mTorsoW / 2), a.shoulderY + a.walk.armR + Math.floor(a.armH * 0.5), mArmW, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, cx - Math.floor(mTorsoW / 2) - mArmW, a.shoulderY + a.walk.armL, mArmW, a.armH + 2, colors, 'left');
        ctx.fillStyle = colors.hair;
        ctx.fillRect(cx - Math.floor(mTorsoW / 2) - mArmW, a.shoulderY + a.walk.armL + Math.floor(a.armH * 0.5), mArmW, 3);
    }
}

// ── Race 15: Monkey man ─────────────────────────────────────────────────────
function _drawMonkeyman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;

    // Lean agile build
    const mTorsoW = a.torsoW - 2;
    const mTorsoX = Math.floor(cx - mTorsoW / 2);
    const mTorsoY = a.torsoY + bob + 2;
    const mTorsoH = a.torsoH - 3;

    // Longer arms than normal
    const longArmH = a.armH + 8;
    const mArmW = a.armW - 1;

    // Shorter legs
    const mLegH = a.legH - 2;
    const legY = a.legsTopY + 2;

    // --- Prehensile curled tail (behind body) ---
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        const td = dir === DIR_LEFT ? 1 : (dir === DIR_RIGHT ? -1 : 0);
        const tailX = dir === DIR_UP ? cx - 1 : (dir === DIR_LEFT ? mTorsoX + mTorsoW : mTorsoX - 2);
        const tailY = mTorsoY + mTorsoH - 3;
        // Curling S-shape tail
        ctx.fillRect(tailX + td * 0, tailY, 3, 2);
        ctx.fillRect(tailX + td * 2, tailY - 2, 2, 3);
        ctx.fillRect(tailX + td * 4, tailY - 3, 2, 2);
        ctx.fillRect(tailX + td * 5, tailY - 2, 2, 2);
        ctx.fillRect(tailX + td * 6, tailY, 2, 2);
        ctx.fillRect(tailX + td * 7, tailY + 2, 2, 3);
        ctx.fillRect(tailX + td * 7, tailY + 5, 2, 2);
        // Curl tip loops back
        ctx.fillRect(tailX + td * 6, tailY + 6, 2, 2);
        ctx.fillRect(tailX + td * 5, tailY + 5, 2, 2);
        ctx.fillRect(tailX + td * 4, tailY + 4, 2, 1);
        // Outline tip
        ctx.fillStyle = '#000000';
        ctx.fillRect(tailX + td * 4, tailY + 4, 1, 1);
    }

    // --- Back arms (very long) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, mArmW, longArmH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, mArmW, longArmH, colors, 'left');
    // Back gripping hands with long fingers
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        const hy = a.shoulderY + a.walk.armR + longArmH;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.rightArmX - 1, hy, mArmW + 2, 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.rightArmX - 1, hy + 3, 1, 2);
        ctx.fillRect(a.rightArmX + Math.floor(mArmW / 2), hy + 3, 1, 2);
        ctx.fillRect(a.rightArmX + mArmW, hy + 3, 1, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        const hy = a.shoulderY + a.walk.armL + longArmH;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.leftArmX - 1, hy, mArmW + 2, 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.leftArmX - 1, hy + 3, 1, 2);
        ctx.fillRect(a.leftArmX + Math.floor(mArmW / 2), hy + 3, 1, 2);
        ctx.fillRect(a.leftArmX + mArmW, hy + 3, 1, 2);
    }

    // --- Shorter legs with hand-like feet (no boots) ---
    _drawLeg(ctx, a.leftLegX, legY + a.walk.legL, a.legW - 1, mLegH, colors);
    _drawLeg(ctx, a.rightLegX, legY + a.walk.legR, a.legW - 1, mLegH, colors);
    // Prehensile gripping feet with spread toes
    const lfY = legY + a.walk.legL + mLegH - 1;
    const rfY = legY + a.walk.legR + mLegH - 1;
    ctx.fillStyle = colors.skin;
    ctx.fillRect(a.leftLegX - 3, lfY, a.legW + 5, 3);
    ctx.fillRect(a.rightLegX - 3, rfY, a.legW + 5, 3);
    // Toe outlines / finger separations
    ctx.fillStyle = '#000000';
    ctx.fillRect(a.leftLegX - 3, lfY + 2, 2, 2);
    ctx.fillRect(a.leftLegX + Math.floor(a.legW / 2) - 1, lfY + 2, 1, 2);
    ctx.fillRect(a.leftLegX + a.legW, lfY + 2, 2, 2);
    ctx.fillRect(a.rightLegX - 3, rfY + 2, 2, 2);
    ctx.fillRect(a.rightLegX + Math.floor(a.legW / 2) - 1, rfY + 2, 1, 2);
    ctx.fillRect(a.rightLegX + a.legW, rfY + 2, 2, 2);
    // Opposable big toe
    ctx.fillStyle = colors.skin;
    ctx.fillRect(a.leftLegX - 4, lfY + 1, 2, 2);
    ctx.fillRect(a.rightLegX - 4, rfY + 1, 2, 2);

    // --- Lean torso with lighter belly/chest area ---
    _drawOutlinedRect(ctx, mTorsoX, mTorsoY, mTorsoW, mTorsoH, colors.skin, '#000000');
    _drawShading(ctx, mTorsoX, mTorsoY, mTorsoW, mTorsoH, colors.mid);
    // Fur texture on sides
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(mTorsoX + 1, mTorsoY + 1, 2, mTorsoH - 2);
    ctx.fillRect(mTorsoX + mTorsoW - 3, mTorsoY + 1, 2, mTorsoH - 2);
    ctx.globalAlpha = 1.0;
    // Lighter belly/chest patch
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(mTorsoX + Math.floor(mTorsoW * 0.2), mTorsoY + 1, Math.floor(mTorsoW * 0.6), mTorsoH - 2);
        ctx.globalAlpha = 1.0;
    }

    // --- Round monkey head ---
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, '#000000');
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // --- Large prominent ears ---
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 6, a.headY + 1, 7, 8);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.headX - 5, a.headY + 2, 5, 6);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX - 6, a.headY + 1, 1, 8);
        ctx.fillRect(a.headX - 6, a.headY, 7, 1);
    }
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 1, a.headY + 1, 7, 8);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.headX + a.headW, a.headY + 2, 5, 6);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + a.headW + 5, a.headY + 1, 1, 8);
        ctx.fillRect(a.headX + a.headW - 1, a.headY, 7, 1);
    }

    // --- Facial markings around eyes (lighter fur) ---
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(cx - 6, a.headY + Math.floor(a.headH * 0.2), 12, Math.floor(a.headH * 0.3));
        ctx.globalAlpha = 1.0;
    }

    // Fur fringe at top of head
    ctx.fillStyle = colors.hair;
    ctx.fillRect(a.headX + 2, a.headY - 3, a.headW - 4, 4);
    ctx.fillRect(a.headX + 4, a.headY - 5, a.headW - 8, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(a.headX + 2, a.headY - 3, a.headW - 4, 1);

    // --- Face features ---
    if (dir !== DIR_UP) {
        // Large expressive eyes
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#f8f4f0';
            ctx.fillRect(cx - 6, eyeY, 5, 5);
            ctx.fillRect(cx + 2, eyeY, 5, 5);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 5, eyeY + 1, 3, 3);
            ctx.fillRect(cx + 3, eyeY + 1, 3, 3);
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 4, eyeY + 2, 2, 2);
            ctx.fillRect(cx + 4, eyeY + 2, 2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 3, eyeY + 1, 1, 1);
            ctx.fillRect(cx + 5, eyeY + 1, 1, 1);
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 6, eyeY - 1, 5, 1);
            ctx.fillRect(cx + 2, eyeY - 1, 5, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 6;
            ctx.fillStyle = '#f8f4f0';
            ctx.fillRect(ex, eyeY, 5, 5);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 1, eyeY + 1, 3, 3);
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex + 2, eyeY + 2, 2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex + 3, eyeY + 1, 1, 1);
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex, eyeY - 1, 5, 1);
        }

        // Flat broad nose
        const noseY = a.headY + Math.floor(a.headH * 0.55);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.mid;
            ctx.fillRect(cx - 3, noseY, 6, 3);
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 2, noseY + 1, 1, 1);
            ctx.fillRect(cx + 2, noseY + 1, 1, 1);
        } else {
            const nx = dir === DIR_RIGHT ? cx + 3 : cx - 4;
            ctx.fillStyle = colors.mid;
            ctx.fillRect(nx, noseY, 3, 3);
            ctx.fillStyle = '#000000';
            ctx.fillRect(nx + (dir === DIR_RIGHT ? 2 : 0), noseY + 1, 1, 1);
        }

        // Wide grin with teeth
        const mouthY = a.headY + Math.floor(a.headH * 0.75);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 4, mouthY, 9, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 3, mouthY, 7, 2);
        } else {
            const gx = dir === DIR_RIGHT ? cx + 2 : cx - 5;
            ctx.fillStyle = '#000000';
            ctx.fillRect(gx, mouthY, 4, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(gx + 1, mouthY, 2, 1);
        }
    }

    // --- Front arms (very long with gripping hands) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, mArmW, longArmH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, mArmW, longArmH, colors, 'left');
    // Front gripping hands with long fingers
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        const hy = a.shoulderY + a.walk.armR + longArmH;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.rightArmX - 1, hy, mArmW + 2, 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.rightArmX - 1, hy + 3, 1, 2);
        ctx.fillRect(a.rightArmX + Math.floor(mArmW / 2), hy + 3, 1, 2);
        ctx.fillRect(a.rightArmX + mArmW, hy + 3, 1, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        const hy = a.shoulderY + a.walk.armL + longArmH;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.leftArmX - 1, hy, mArmW + 2, 4);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.leftArmX - 1, hy + 3, 1, 2);
        ctx.fillRect(a.leftArmX + Math.floor(mArmW / 2), hy + 3, 1, 2);
        ctx.fillRect(a.leftArmX + mArmW, hy + 3, 1, 2);
    }
}

// ── Race 16: Mummy ──────────────────────────────────────────────────────────
function _drawMummy(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;
    const bandageColor = '#d4c8a0';
    const bandageDark = '#b0a478';
    const voidColor = '#2a1a0a';
    const skinColor = '#554433';
    const goldColor = '#ccaa33';
    const bandageStep = Math.max(3, Math.floor(a.torsoH / 6));

    // --- Trailing tattered bandage strips (behind body) ---
    ctx.fillStyle = bandageColor;
    ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH, 2, 7 + Math.abs(a.walk.armL));
    ctx.fillRect(a.rightArmX + a.armW, a.shoulderY + a.walk.armR + a.armH, 2, 6 + Math.abs(a.walk.armR));
    ctx.fillRect(a.torsoX - 1, a.torsoY + a.torsoH + bob - 2, 2, 6);
    ctx.fillRect(a.torsoX + a.torsoW - 1, a.torsoY + a.torsoH + bob - 1, 2, 5);
    // Tattered ends (uneven)
    ctx.fillStyle = bandageDark;
    ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH + 6, 1, 2);
    ctx.fillRect(a.torsoX - 1, a.torsoY + a.torsoH + bob + 3, 1, 2);

    // --- Back arms (bandaged) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
    }

    // --- Legs (bandaged, stiff robotic walk) ---
    const lLegOff = dir === DIR_DOWN || dir === DIR_LEFT ? 1 : 0;
    const rLegOff = dir === DIR_DOWN || dir === DIR_RIGHT ? 1 : 0;
    _drawLeg(ctx, a.leftLegX + lLegOff, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX - rLegOff, a.legsTopY + a.walk.legR, a.legW, a.legH, colors);
    // Leg bandage wraps with exposed skin gaps
    for (let y = 0; y < a.legH - 4; y += bandageStep) {
        ctx.fillStyle = bandageColor;
        ctx.fillRect(a.leftLegX + lLegOff, a.legsTopY + a.walk.legL + y, a.legW, 2);
        ctx.fillRect(a.rightLegX - rLegOff, a.legsTopY + a.walk.legR + y, a.legW, 2);
        ctx.fillStyle = voidColor;
        ctx.fillRect(a.leftLegX + lLegOff, a.legsTopY + a.walk.legL + y + 2, a.legW, 1);
        ctx.fillRect(a.rightLegX - rLegOff, a.legsTopY + a.walk.legR + y + 2, a.legW, 1);
    }
    // Exposed dried skin patches on legs
    ctx.fillStyle = skinColor;
    ctx.fillRect(a.leftLegX + lLegOff + 1, a.legsTopY + a.walk.legL + Math.floor(a.legH * 0.4), 3, 3);
    ctx.fillRect(a.rightLegX - rLegOff + 2, a.legsTopY + a.walk.legR + Math.floor(a.legH * 0.6), 2, 2);
    // Gold ankle bands
    ctx.fillStyle = goldColor;
    ctx.fillRect(a.leftLegX + lLegOff - 1, a.legsTopY + a.walk.legL + a.legH - 4, a.legW + 2, 2);
    ctx.fillRect(a.rightLegX - rLegOff - 1, a.legsTopY + a.walk.legR + a.legH - 4, a.legW + 2, 2);
    // Desiccated feet
    ctx.fillStyle = skinColor;
    ctx.fillRect(a.leftLegX + lLegOff - 1, a.legsTopY + a.walk.legL + a.legH - 1, a.legW + 2, 2);
    ctx.fillRect(a.rightLegX - rLegOff - 1, a.legsTopY + a.walk.legR + a.legH - 1, a.legW + 2, 2);

    // --- Torso (bandage wrapping IS the body, shambling posture) ---
    const torsoOff = dir === DIR_LEFT ? 1 : (dir === DIR_RIGHT ? -1 : 0);
    _drawOutlinedRect(ctx, a.torsoX + torsoOff, a.torsoY + bob, a.torsoW, a.torsoH, bandageColor, colors.outline);
    // Bandage rows with dark void gaps between
    for (let y = 0; y < a.torsoH - 1; y += 3) {
        ctx.fillStyle = bandageColor;
        ctx.fillRect(a.torsoX + torsoOff + 1, a.torsoY + bob + y, a.torsoW - 2, 2);
        ctx.fillStyle = voidColor;
        ctx.fillRect(a.torsoX + torsoOff + 1, a.torsoY + bob + y + 2, a.torsoW - 2, 1);
    }
    // Diagonal wrap detail
    ctx.fillStyle = bandageDark;
    ctx.fillRect(a.torsoX + torsoOff + 2, a.torsoY + bob + 1, 2, a.torsoH - 2);
    ctx.fillRect(a.torsoX + torsoOff + a.torsoW - 4, a.torsoY + bob + 1, 2, a.torsoH - 2);

    // Scarab on chest
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#2266aa';
        ctx.fillRect(cx - 2, a.torsoY + bob + 2, 4, 3);
        ctx.fillStyle = '#44aadd';
        ctx.fillRect(cx - 1, a.torsoY + bob + 3, 2, 1);
        // Scarab wings
        ctx.fillStyle = '#2266aa';
        ctx.fillRect(cx - 4, a.torsoY + bob + 3, 2, 2);
        ctx.fillRect(cx + 2, a.torsoY + bob + 3, 2, 2);
    }

    // Gold collar/pectoral
    ctx.fillStyle = goldColor;
    ctx.fillRect(a.torsoX + torsoOff - 1, a.torsoY + bob - 1, a.torsoW + 2, 2);
    // Gem in collar center
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#cc2222';
        ctx.fillRect(cx - 1, a.torsoY + bob - 1, 3, 2);
    }

    // Gold arm bands
    ctx.fillStyle = goldColor;
    ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + 2, a.armW + 2, 2);
    ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + 2, a.armW + 2, 2);

    // Arm bandage wraps with void gaps
    for (let y = 4; y < a.armH; y += 3) {
        ctx.fillStyle = bandageColor;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + y, a.armW, 2);
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + y, a.armW, 2);
        ctx.fillStyle = voidColor;
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + y + 2, a.armW, 1);
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + y + 2, a.armW, 1);
    }
    // Dessicated thin fingers
    ctx.fillStyle = '#554433';
    ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH, a.armW, 3);
    ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + a.armH, a.armW, 3);
    ctx.fillStyle = '#443322';
    ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH + 2, 1, 2);
    ctx.fillRect(a.leftArmX + a.armW, a.shoulderY + a.walk.armL + a.armH + 2, 1, 2);
    ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH + 2, 1, 2);
    ctx.fillRect(a.rightArmX + a.armW, a.shoulderY + a.walk.armR + a.armH + 2, 1, 2);

    // --- Head (bandage wrapped with pharaonic headdress) ---
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, bandageColor, colors.outline);
    // Head bandage wraps
    for (let y = 2; y < a.headH - 2; y += 3) {
        ctx.fillStyle = bandageColor;
        ctx.fillRect(a.headX + 1, a.headY + y, a.headW - 2, 2);
        ctx.fillStyle = voidColor;
        ctx.fillRect(a.headX + 1, a.headY + y + 2, a.headW - 2, 1);
    }

    // Egyptian pharaonic headdress (nemes)
    ctx.fillStyle = '#2244aa';
    ctx.fillRect(a.headX - 3, a.headY - 4, a.headW + 6, 5);
    ctx.fillRect(a.headX - 4, a.headY - 2, a.headW + 8, 3);
    // Headdress side flaps
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 4, a.headY + 1, 4, a.headH - 1);
        ctx.fillRect(a.headX - 5, a.headY + a.headH - 4, 4, 6);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW, a.headY + 1, 4, a.headH - 1);
        ctx.fillRect(a.headX + a.headW + 1, a.headY + a.headH - 4, 4, 6);
    }
    // Gold stripes on headdress
    ctx.fillStyle = goldColor;
    ctx.fillRect(a.headX - 2, a.headY - 3, a.headW + 4, 1);
    ctx.fillRect(a.headX - 3, a.headY, a.headW + 6, 1);

    // Eye of Horus on forehead
    if (dir === DIR_DOWN) {
        ctx.fillStyle = goldColor;
        ctx.fillRect(cx - 2, a.headY + 1, 4, 2);
        ctx.fillRect(cx - 1, a.headY, 2, 1);
    }

    // Glowing eye through bandage slit
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35);
        // Dark slit opening
        ctx.fillStyle = voidColor;
        if (dir === DIR_DOWN) {
            ctx.fillRect(a.headX + 3, eyeY, a.headW - 6, 3);
        } else {
            const sx = dir === DIR_RIGHT ? cx - 1 : cx - a.headW / 2 + 2;
            ctx.fillRect(sx, eyeY, Math.floor(a.headW * 0.5), 3);
        }
        // Glowing eye(s) in slit
        ctx.fillStyle = colors.eye;
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx + 3, eyeY + 1, 3, 2);
            ctx.fillRect(cx - 5, eyeY + 1, 3, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 4;
            ctx.fillRect(ex, eyeY + 1, 3, 2);
        }
        // Glow aura
        ctx.fillStyle = 'rgba(255,255,100,0.25)';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx + 2, eyeY - 1, 5, 5);
            ctx.fillRect(cx - 6, eyeY - 1, 5, 5);
        } else {
            const gx = dir === DIR_RIGHT ? cx + 1 : cx - 5;
            ctx.fillRect(gx, eyeY - 1, 5, 5);
        }
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
    // Re-apply front arm bandage wraps
    for (let y = 4; y < a.armH; y += 3) {
        ctx.fillStyle = bandageColor;
        if (dir === DIR_DOWN || dir === DIR_RIGHT) ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + y, a.armW, 2);
        if (dir === DIR_DOWN || dir === DIR_LEFT) ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + y, a.armW, 2);
    }
}

// ── Race 17: Ork ────────────────────────────────────────────────────────────
function _drawOrk(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;

    // Extra-wide hulking proportions
    const orkTorsoW = a.torsoW + 6;
    const orkTorsoX = Math.floor(cx - orkTorsoW / 2);
    const orkArmW = a.armW + 3;
    const orkLegW = a.legW + 3;
    const orkTorsoY = a.torsoY + bob;

    // Helper: draw iron bracer with spikes
    function drawBracer(bx, by, w) {
        ctx.fillStyle = '#555555';
        ctx.fillRect(bx - 1, by, w + 2, 3);
        ctx.fillStyle = '#777777';
        ctx.fillRect(bx, by, w, 1);
        ctx.fillStyle = '#000000';
        ctx.fillRect(bx - 1, by - 1, 1, 1);
        ctx.fillRect(bx + w, by - 1, 1, 1);
        ctx.fillRect(bx + Math.floor(w / 2), by - 2, 1, 2);
    }

    // --- Back arms (massive with bicep bulge) ---
    const rArmX = cx + Math.floor(orkTorsoW / 2);
    const lArmX = cx - Math.floor(orkTorsoW / 2) - orkArmW;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rArmX, a.shoulderY + a.walk.armR, orkArmW, a.armH + 2, colors, 'right');
        ctx.fillStyle = colors.skin;
        ctx.fillRect(rArmX - 1, a.shoulderY + a.walk.armR + 1, orkArmW + 2, 3);
        drawBracer(rArmX, a.shoulderY + a.walk.armR + a.armH - 2, orkArmW);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, lArmX, a.shoulderY + a.walk.armL, orkArmW, a.armH + 2, colors, 'left');
        ctx.fillStyle = colors.skin;
        ctx.fillRect(lArmX - 1, a.shoulderY + a.walk.armL + 1, orkArmW + 2, 3);
        drawBracer(lArmX, a.shoulderY + a.walk.armL + a.armH - 2, orkArmW);
    }

    // --- Thick legs with heavy iron boots ---
    _drawLeg(ctx, Math.floor(cx - orkLegW - 1), a.legsTopY + a.walk.legL, orkLegW, a.legH, colors);
    _drawLeg(ctx, Math.floor(cx + 1), a.legsTopY + a.walk.legR, orkLegW, a.legH, colors);
    // Iron plated boots
    const lBootY = a.legsTopY + a.walk.legL + a.legH - Math.floor(a.legH * 0.22);
    const rBootY = a.legsTopY + a.walk.legR + a.legH - Math.floor(a.legH * 0.22);
    ctx.fillStyle = '#555555';
    ctx.fillRect(Math.floor(cx - orkLegW - 2), lBootY, orkLegW + 4, 6);
    ctx.fillRect(Math.floor(cx), rBootY, orkLegW + 4, 6);
    ctx.fillStyle = '#666666';
    ctx.fillRect(Math.floor(cx - orkLegW - 1), lBootY + 1, orkLegW + 2, 1);
    ctx.fillRect(Math.floor(cx + 1), rBootY + 1, orkLegW + 2, 1);
    ctx.fillStyle = '#888888';
    ctx.fillRect(Math.floor(cx - orkLegW), lBootY + 3, 2, 1);
    ctx.fillRect(Math.floor(cx + 2), rBootY + 3, 2, 1);
    ctx.fillStyle = '#333333';
    ctx.fillRect(Math.floor(cx - orkLegW - 2), lBootY + 5, orkLegW + 4, 1);
    ctx.fillRect(Math.floor(cx), rBootY + 5, orkLegW + 4, 1);

    // --- Muscular torso with iron armor plates ---
    _drawOutlinedRect(ctx, orkTorsoX, orkTorsoY, orkTorsoW, a.torsoH + 1, colors.skin, '#000000');
    _drawShading(ctx, orkTorsoX, orkTorsoY, orkTorsoW, a.torsoH + 1, colors.mid);
    // Iron chest plate
    ctx.fillStyle = '#666666';
    ctx.fillRect(orkTorsoX + 2, orkTorsoY + 1, orkTorsoW - 4, Math.floor(a.torsoH * 0.5));
    ctx.fillStyle = '#777777';
    ctx.fillRect(orkTorsoX + 3, orkTorsoY + 2, orkTorsoW - 6, 2);
    ctx.fillStyle = '#555555';
    ctx.fillRect(orkTorsoX + 2, orkTorsoY + Math.floor(a.torsoH * 0.5), orkTorsoW - 4, 1);
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 2, orkTorsoY + Math.floor(a.torsoH * 0.5) + 1, 4, Math.floor(a.torsoH * 0.4));
    }
    // Battle scars on exposed skin
    ctx.fillStyle = '#884444';
    ctx.fillRect(orkTorsoX + 3, orkTorsoY + Math.floor(a.torsoH * 0.6), 4, 1);
    ctx.fillRect(orkTorsoX + orkTorsoW - 5, orkTorsoY + Math.floor(a.torsoH * 0.65), 1, 3);
    // Iron belt
    ctx.fillStyle = '#555555';
    ctx.fillRect(orkTorsoX + 1, orkTorsoY + a.torsoH - 2, orkTorsoW - 2, 3);
    ctx.fillStyle = '#888888';
    ctx.fillRect(cx - 2, orkTorsoY + a.torsoH - 2, 4, 3);

    // --- Thick bull neck ---
    ctx.fillStyle = colors.skin;
    ctx.fillRect(cx - 4, a.headY + a.headH - 1, 8, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 4, a.headY + a.headH - 1, 1, 3);
    ctx.fillRect(cx + 4, a.headY + a.headH - 1, 1, 3);

    // --- Broad flat head ---
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, '#000000');
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Pointed ears
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 5, a.headY + Math.floor(a.headH * 0.2), 6, 4);
        ctx.fillRect(a.headX - 7, a.headY + Math.floor(a.headH * 0.15), 3, 3);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.headX - 4, a.headY + Math.floor(a.headH * 0.3), 3, 2);
    }
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 1, a.headY + Math.floor(a.headH * 0.2), 6, 4);
        ctx.fillRect(a.headX + a.headW + 4, a.headY + Math.floor(a.headH * 0.15), 3, 3);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.headX + a.headW + 1, a.headY + Math.floor(a.headH * 0.3), 3, 2);
    }

    // Heavy brow ridge
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + 1, a.headY + Math.floor(a.headH * 0.2), a.headW - 2, 3);
    }

    // Mohawk
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 2, a.headY - Math.floor(a.headH * 0.45), 4, Math.floor(a.headH * 0.55));
    ctx.fillRect(cx - 1, a.headY - Math.floor(a.headH * 0.6), 3, 3);
    ctx.fillRect(cx, a.headY - Math.floor(a.headH * 0.7), 2, 2);
    if (dir !== DIR_DOWN) {
        ctx.fillRect(cx - 1, a.headY + 2, 3, a.headH - 4);
    }

    // Heavy underbite jaw
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.skin;
        if (dir === DIR_DOWN) {
            ctx.fillRect(a.headX + 1, a.headY + a.headH - 1, a.headW - 2, 3);
        } else {
            const jx = dir === DIR_RIGHT ? cx - 2 : cx - Math.floor(a.headW * 0.3);
            ctx.fillRect(jx, a.headY + a.headH - 1, Math.floor(a.headW * 0.6), 3);
        }
        ctx.fillStyle = '#000000';
        if (dir === DIR_DOWN) {
            ctx.fillRect(a.headX + 1, a.headY + a.headH + 1, a.headW - 2, 1);
        }
    }

    // Large tusks protruding upward from lower jaw
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#eeddcc';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - Math.floor(a.headW * 0.4), a.headY + a.headH - 3, 3, 5);
            ctx.fillRect(cx + Math.floor(a.headW * 0.25), a.headY + a.headH - 3, 3, 5);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - Math.floor(a.headW * 0.4) + 1, a.headY + a.headH - 3, 1, 2);
            ctx.fillRect(cx + Math.floor(a.headW * 0.25) + 1, a.headY + a.headH - 3, 1, 2);
        } else {
            const tx = dir === DIR_RIGHT ? cx + 3 : cx - 5;
            ctx.fillRect(tx, a.headY + a.headH - 3, 3, 5);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(tx + 1, a.headY + a.headH - 3, 1, 2);
        }
    }

    // Broad flat nose
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.mid;
        ctx.fillRect(cx - 3, a.headY + Math.floor(a.headH * 0.55), 6, 3);
        ctx.fillStyle = '#222222';
        ctx.fillRect(cx - 2, a.headY + Math.floor(a.headH * 0.6), 1, 1);
        ctx.fillRect(cx + 2, a.headY + Math.floor(a.headH * 0.6), 1, 1);
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        const nx = dir === DIR_RIGHT ? cx + 4 : cx - 5;
        ctx.fillStyle = colors.mid;
        ctx.fillRect(nx, a.headY + Math.floor(a.headH * 0.55), 2, 2);
    }

    // Red war paint stripes
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#cc2222';
        if (dir === DIR_DOWN) {
            ctx.fillRect(a.headX + 3, a.headY + Math.floor(a.headH * 0.3), 2, Math.floor(a.headH * 0.5));
            ctx.fillRect(a.headX + a.headW - 5, a.headY + Math.floor(a.headH * 0.3), 2, Math.floor(a.headH * 0.5));
        } else {
            const px = dir === DIR_RIGHT ? cx + 1 : cx - 3;
            ctx.fillRect(px, a.headY + Math.floor(a.headH * 0.3), 2, Math.floor(a.headH * 0.4));
        }
    }

    // Face scar (diagonal)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#884444';
        ctx.fillRect(a.headX + a.headW - 4, a.headY + Math.floor(a.headH * 0.35), 1, 1);
        ctx.fillRect(a.headX + a.headW - 5, a.headY + Math.floor(a.headH * 0.4), 1, 1);
        ctx.fillRect(a.headX + a.headW - 6, a.headY + Math.floor(a.headH * 0.45), 1, 1);
    }

    // Small beady angry eyes under brow
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3) + 2;
        const eyeColor = colors.eye || '#cc4400';
        if (dir === DIR_DOWN) {
            ctx.fillStyle = eyeColor;
            ctx.fillRect(cx - 4, eyeY, 2, 2);
            ctx.fillRect(cx + 3, eyeY, 2, 2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - 3, eyeY + 1, 1, 1);
            ctx.fillRect(cx + 3, eyeY + 1, 1, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 3;
            ctx.fillStyle = eyeColor;
            ctx.fillRect(ex, eyeY, 2, 2);
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex + 1, eyeY + 1, 1, 1);
        }
    }

    // --- Front arms (massive with spiked bracers) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rArmX, a.shoulderY + a.walk.armR, orkArmW, a.armH + 2, colors, 'right');
        ctx.fillStyle = colors.skin;
        ctx.fillRect(rArmX - 1, a.shoulderY + a.walk.armR + 1, orkArmW + 2, 3);
        drawBracer(rArmX, a.shoulderY + a.walk.armR + a.armH - 2, orkArmW);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, lArmX, a.shoulderY + a.walk.armL, orkArmW, a.armH + 2, colors, 'left');
        ctx.fillStyle = colors.skin;
        ctx.fillRect(lArmX - 1, a.shoulderY + a.walk.armL + 1, orkArmW + 2, 3);
        drawBracer(lArmX, a.shoulderY + a.walk.armL + a.armH - 2, orkArmW);
    }
}

// ── Race 18: Rat man ────────────────────────────────────────────────────────
function _drawRatman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;

    // Hunched lean build — narrower torso, thinner limbs
    const rTorsoW = a.torsoW - 4;
    const rTorsoX = Math.floor(cx - rTorsoW / 2);
    const rTorsoH = a.torsoH - 3;
    const rTorsoY = a.torsoY + bob + 3;
    const rArmW = a.armW - 2;
    const rLegW = a.legW - 2;

    // --- Long naked rat tail (behind body, thin curling) ---
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = '#cc9988';
        const td = dir === DIR_LEFT ? 1 : (dir === DIR_RIGHT ? -1 : 0);
        const tailX = dir === DIR_UP ? cx - 1 : (dir === DIR_LEFT ? rTorsoX + rTorsoW : rTorsoX - 1);
        const tailY = rTorsoY + rTorsoH - 2;
        ctx.fillRect(tailX + td * 0, tailY, 2, 2);
        ctx.fillRect(tailX + td * 2, tailY + 1, 2, 1);
        ctx.fillRect(tailX + td * 3, tailY + 2, 1, 1);
        ctx.fillRect(tailX + td * 4, tailY + 3, 1, 1);
        ctx.fillRect(tailX + td * 5, tailY + 4, 1, 1);
        ctx.fillRect(tailX + td * 6, tailY + 5, 1, 1);
        ctx.fillRect(tailX + td * 7, tailY + 5, 1, 1);
        ctx.fillRect(tailX + td * 8, tailY + 4, 1, 1);
        ctx.fillRect(tailX + td * 9, tailY + 3, 1, 1);
        ctx.fillRect(tailX + td * 10, tailY + 2, 1, 1);
        ctx.fillRect(tailX + td * 11, tailY + 1, 1, 1);
        // Outline tip
        ctx.fillStyle = '#000000';
        ctx.fillRect(tailX + td * 11, tailY + 1, 1, 1);
    }

    // --- Back arms (thin with clawed paw-hands) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR + 2, rArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL + 2, rArmW, a.armH, colors, 'left');

    // --- Thin legs with clawed feet ---
    _drawLeg(ctx, a.leftLegX + 1, a.legsTopY + a.walk.legL, rLegW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, rLegW, a.legH, colors);
    // Clawed rat feet
    const lfY = a.legsTopY + a.walk.legL + a.legH - 1;
    const rfY = a.legsTopY + a.walk.legR + a.legH - 1;
    ctx.fillStyle = '#cc9988';
    ctx.fillRect(a.leftLegX - 1, lfY, rLegW + 3, 2);
    ctx.fillRect(a.rightLegX - 1, rfY, rLegW + 3, 2);
    // Claw tips
    ctx.fillStyle = '#000000';
    ctx.fillRect(a.leftLegX - 1, lfY + 1, 1, 2);
    ctx.fillRect(a.leftLegX + rLegW + 1, lfY + 1, 1, 2);
    ctx.fillRect(a.leftLegX + Math.floor(rLegW / 2), lfY + 1, 1, 2);
    ctx.fillRect(a.rightLegX - 1, rfY + 1, 1, 2);
    ctx.fillRect(a.rightLegX + rLegW + 1, rfY + 1, 1, 2);
    ctx.fillRect(a.rightLegX + Math.floor(rLegW / 2), rfY + 1, 1, 2);

    // --- Tattered rags/cloak over torso ---
    ctx.fillStyle = '#554444';
    ctx.fillRect(rTorsoX - 2, rTorsoY - 2, rTorsoW + 4, rTorsoH + 2);
    ctx.fillStyle = '#443333';
    ctx.fillRect(rTorsoX - 3, rTorsoY - 1, rTorsoW + 6, 2);
    // Ragged bottom edge
    for (let x = rTorsoX - 2; x < rTorsoX + rTorsoW + 2; x += 2) {
        ctx.fillStyle = '#554444';
        ctx.fillRect(x, rTorsoY + rTorsoH - 1, 1, 1 + (x % 3));
    }
    // Tattered patches / holes showing skin
    ctx.fillStyle = colors.skin;
    ctx.fillRect(rTorsoX + 1, rTorsoY + Math.floor(rTorsoH * 0.3), 2, 2);
    ctx.fillRect(rTorsoX + rTorsoW - 3, rTorsoY + Math.floor(rTorsoH * 0.5), 2, 3);

    // --- Hunched torso under rags ---
    _drawOutlinedRect(ctx, rTorsoX, rTorsoY, rTorsoW, rTorsoH, colors.skin, '#000000');
    _drawShading(ctx, rTorsoX, rTorsoY, rTorsoW, rTorsoH, colors.mid);

    // Mangy fur texture on torso
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.4;
    for (let fy = rTorsoY + 2; fy < rTorsoY + rTorsoH - 2; fy += 3) {
        ctx.fillRect(rTorsoX + 1 + (fy % 2), fy, 1, 1);
        ctx.fillRect(rTorsoX + rTorsoW - 2 - (fy % 2), fy, 1, 1);
    }
    ctx.globalAlpha = 1.0;

    // --- Head with pointed rat snout ---
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, '#000000');
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Mangy fur texture on head
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(a.headX + 2, a.headY + 1, 1, 1);
    ctx.fillRect(a.headX + a.headW - 3, a.headY + 2, 1, 1);
    ctx.fillRect(a.headX + 4, a.headY + Math.floor(a.headH * 0.6), 1, 1);
    ctx.globalAlpha = 1.0;

    // Large round ears
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 5, a.headY - 5, 8, 8);
        ctx.fillStyle = '#ddaaaa';
        ctx.fillRect(a.headX - 4, a.headY - 4, 6, 6);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 3, a.headY - 3, 4, 4);
        ctx.fillStyle = '#ddaaaa';
        ctx.fillRect(a.headX - 2, a.headY - 2, 2, 2);
        // Ear outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX - 5, a.headY - 5, 8, 1);
        ctx.fillRect(a.headX - 5, a.headY - 5, 1, 8);
    }
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 5, 8, 8);
        ctx.fillStyle = '#ddaaaa';
        ctx.fillRect(a.headX + a.headW - 2, a.headY - 4, 6, 6);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW - 1, a.headY - 3, 4, 4);
        ctx.fillStyle = '#ddaaaa';
        ctx.fillRect(a.headX + a.headW, a.headY - 2, 2, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + a.headW - 3, a.headY - 5, 8, 1);
        ctx.fillRect(a.headX + a.headW + 4, a.headY - 5, 1, 8);
    }

    // Pointed snout with buck teeth and whiskers
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 3, a.headY + a.headH - 2, 6, 5);
        ctx.fillRect(cx - 2, a.headY + a.headH + 2, 4, 3);
        ctx.fillRect(cx - 1, a.headY + a.headH + 4, 2, 2);
        // Pink nose
        ctx.fillStyle = '#ee8899';
        ctx.fillRect(cx - 1, a.headY + a.headH + 5, 2, 2);
        // Buck teeth
        ctx.fillStyle = '#ffffee';
        ctx.fillRect(cx - 1, a.headY + a.headH + 3, 1, 2);
        ctx.fillRect(cx + 1, a.headY + a.headH + 3, 1, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx, a.headY + a.headH + 3, 1, 2);
        // Long thin whiskers (3 per side)
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX - 5, a.headY + Math.floor(a.headH * 0.5), 6, 1);
        ctx.fillRect(a.headX - 6, a.headY + Math.floor(a.headH * 0.6), 7, 1);
        ctx.fillRect(a.headX - 4, a.headY + Math.floor(a.headH * 0.7), 5, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.5), 6, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.6), 7, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.7), 5, 1);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 7, a.headY + Math.floor(a.headH * 0.4), 8, 4);
        ctx.fillRect(a.headX - 9, a.headY + Math.floor(a.headH * 0.45), 3, 3);
        ctx.fillStyle = '#ee8899';
        ctx.fillRect(a.headX - 10, a.headY + Math.floor(a.headH * 0.47), 2, 2);
        // Buck teeth on side
        ctx.fillStyle = '#ffffee';
        ctx.fillRect(a.headX - 8, a.headY + Math.floor(a.headH * 0.55), 1, 2);
        // Side whiskers
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX - 12, a.headY + Math.floor(a.headH * 0.4), 4, 1);
        ctx.fillRect(a.headX - 11, a.headY + Math.floor(a.headH * 0.5), 3, 1);
        ctx.fillRect(a.headX - 10, a.headY + Math.floor(a.headH * 0.6), 3, 1);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW - 1, a.headY + Math.floor(a.headH * 0.4), 8, 4);
        ctx.fillRect(a.headX + a.headW + 6, a.headY + Math.floor(a.headH * 0.45), 3, 3);
        ctx.fillStyle = '#ee8899';
        ctx.fillRect(a.headX + a.headW + 8, a.headY + Math.floor(a.headH * 0.47), 2, 2);
        ctx.fillStyle = '#ffffee';
        ctx.fillRect(a.headX + a.headW + 7, a.headY + Math.floor(a.headH * 0.55), 1, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + a.headW + 8, a.headY + Math.floor(a.headH * 0.4), 4, 1);
        ctx.fillRect(a.headX + a.headW + 8, a.headY + Math.floor(a.headH * 0.5), 3, 1);
        ctx.fillRect(a.headX + a.headW + 7, a.headY + Math.floor(a.headH * 0.6), 3, 1);
    }

    // Beady red/black eyes
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        const eyeColor = colors.eye || '#cc2222';
        if (dir === DIR_DOWN) {
            ctx.fillStyle = eyeColor;
            ctx.fillRect(cx - 5, eyeY, 3, 3);
            ctx.fillRect(cx + 3, eyeY, 3, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 4, eyeY, 1, 1);
            ctx.fillRect(cx + 4, eyeY, 1, 1);
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 4, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 3, eyeY + 1, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 4;
            ctx.fillStyle = eyeColor;
            ctx.fillRect(ex, eyeY, 3, 3);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex + 1, eyeY, 1, 1);
            ctx.fillStyle = '#111111';
            ctx.fillRect(ex, eyeY + 1, 2, 2);
        }
    }

    // --- Front arms (thin with grabby clawed paw-hands) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR + 2, rArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL + 2, rArmW, a.armH, colors, 'left');
    // Clawed paw-hands with long fingers
    ctx.fillStyle = '#cc9988';
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        const hy = a.shoulderY + a.walk.armR + 2 + a.armH;
        ctx.fillRect(a.rightArmX, hy, rArmW + 1, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.rightArmX - 1, hy + 1, 1, 3);
        ctx.fillRect(a.rightArmX + Math.floor(rArmW / 2), hy + 1, 1, 3);
        ctx.fillRect(a.rightArmX + rArmW, hy + 1, 1, 3);
    }
    ctx.fillStyle = '#cc9988';
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        const hy = a.shoulderY + a.walk.armL + 2 + a.armH;
        ctx.fillRect(a.leftArmX, hy, rArmW + 1, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.leftArmX - 1, hy + 1, 1, 3);
        ctx.fillRect(a.leftArmX + Math.floor(rArmW / 2), hy + 1, 1, 3);
        ctx.fillRect(a.leftArmX + rArmW, hy + 1, 1, 3);
    }
}

// ── Race 19: Robot ──────────────────────────────────────────────────────────
function _drawRobot(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;
    const metalColor = colors.skin || '#b8b8c8';
    const metalDark = '#555566';
    const metalMid = colors.mid || '#8888a0';
    const metalLight = '#d0d0e0';
    const glowColor = colors.eye || '#44ddff';

    // Helper: draw riveted plate segment
    function drawPlate(px, py, pw, ph) {
        _drawOutlinedRect(ctx, px, py, pw, ph, metalColor, '#000000');
        _drawSoftShading(ctx, px, py, pw, ph, metalDark);
        ctx.fillStyle = metalLight;
        ctx.fillRect(px + 1, py + 1, 1, 1);
        ctx.fillRect(px + pw - 2, py + 1, 1, 1);
        ctx.fillRect(px + 1, py + ph - 2, 1, 1);
        ctx.fillRect(px + pw - 2, py + ph - 2, 1, 1);
    }

    // Helper: draw segmented mechanical arm
    function drawMechArm(ax, ay, w, h) {
        const elbowOff = Math.floor(h * 0.45);
        drawPlate(ax, ay, w, elbowOff);
        ctx.fillStyle = metalDark;
        ctx.fillRect(ax - 1, ay + elbowOff, w + 2, 3);
        ctx.fillStyle = metalLight;
        ctx.fillRect(ax, ay + elbowOff + 1, w, 1);
        drawPlate(ax, ay + elbowOff + 3, w, h - elbowOff - 3);
        ctx.fillStyle = metalDark;
        ctx.fillRect(ax - 1, ay + h, w + 2, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(ax - 1, ay + h + 2, 1, 2);
        ctx.fillRect(ax + w, ay + h + 2, 1, 2);
        ctx.fillRect(ax + Math.floor(w / 2), ay + h + 2, 1, 2);
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) drawMechArm(a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH);
    if (dir === DIR_DOWN || dir === DIR_RIGHT) drawMechArm(a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH);

    // --- Piston-like legs with knee joints ---
    const lLegY = a.legsTopY + a.walk.legL;
    const rLegY = a.legsTopY + a.walk.legR;
    const kneeOff = Math.floor(a.legH * 0.45);
    drawPlate(a.leftLegX, lLegY, a.legW, kneeOff);
    drawPlate(a.rightLegX, rLegY, a.legW, kneeOff);
    ctx.fillStyle = metalDark;
    ctx.fillRect(a.leftLegX - 1, lLegY + kneeOff, a.legW + 2, 3);
    ctx.fillRect(a.rightLegX - 1, rLegY + kneeOff, a.legW + 2, 3);
    ctx.fillStyle = metalLight;
    ctx.fillRect(a.leftLegX, lLegY + kneeOff + 1, a.legW, 1);
    ctx.fillRect(a.rightLegX, rLegY + kneeOff + 1, a.legW, 1);
    drawPlate(a.leftLegX, lLegY + kneeOff + 3, a.legW, a.legH - kneeOff - 3);
    drawPlate(a.rightLegX, rLegY + kneeOff + 3, a.legW, a.legH - kneeOff - 3);
    // Flat mechanical feet
    ctx.fillStyle = metalDark;
    ctx.fillRect(a.leftLegX - 2, lLegY + a.legH - 2, a.legW + 4, 4);
    ctx.fillRect(a.rightLegX - 2, rLegY + a.legH - 2, a.legW + 4, 4);
    ctx.fillStyle = '#000000';
    ctx.fillRect(a.leftLegX - 2, lLegY + a.legH + 1, a.legW + 4, 1);
    ctx.fillRect(a.rightLegX - 2, rLegY + a.legH + 1, a.legW + 4, 1);

    // --- Rectangular mechanical torso with chest panel ---
    const rTorsoW = a.torsoW + 2;
    const rTorsoX = Math.floor(cx - rTorsoW / 2);
    const rTorsoY = a.torsoY + bob;
    drawPlate(rTorsoX, rTorsoY, rTorsoW, a.torsoH);
    ctx.fillStyle = metalDark;
    ctx.fillRect(rTorsoX + 2, rTorsoY + 2, rTorsoW - 4, 1);
    ctx.fillRect(rTorsoX + 2, rTorsoY + a.torsoH - 3, rTorsoW - 4, 1);
    ctx.fillRect(cx, rTorsoY + 3, 1, a.torsoH - 6);
    // Glowing core on chest
    if (dir !== DIR_UP) {
        ctx.fillStyle = glowColor;
        ctx.fillRect(cx - 2, rTorsoY + Math.floor(a.torsoH * 0.3), 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1, rTorsoY + Math.floor(a.torsoH * 0.3) + 1, 2, 2);
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(cx - 3, rTorsoY + Math.floor(a.torsoH * 0.3) - 1, 6, 6);
        ctx.globalAlpha = 1.0;
    }
    // Exhaust vents on sides
    ctx.fillStyle = metalDark;
    ctx.fillRect(rTorsoX + 1, rTorsoY + Math.floor(a.torsoH * 0.6), 2, 3);
    ctx.fillRect(rTorsoX + rTorsoW - 3, rTorsoY + Math.floor(a.torsoH * 0.6), 2, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(rTorsoX + 1, rTorsoY + Math.floor(a.torsoH * 0.6) + 1, 2, 1);
    ctx.fillRect(rTorsoX + rTorsoW - 3, rTorsoY + Math.floor(a.torsoH * 0.6) + 1, 2, 1);
    if (dir === DIR_DOWN) {
        ctx.fillStyle = metalMid;
        ctx.fillRect(cx - 4, rTorsoY + Math.floor(a.torsoH * 0.7), 2, 2);
        ctx.fillRect(cx + 3, rTorsoY + Math.floor(a.torsoH * 0.7), 2, 2);
    }

    // --- Neck cylinder ---
    ctx.fillStyle = metalDark;
    ctx.fillRect(cx - 2, a.headY + a.headH - 1, 4, 3);

    // --- Square blocky head ---
    const robotHeadH = a.headH - 2;
    drawPlate(a.headX, a.headY + 1, a.headW, robotHeadH);
    ctx.fillStyle = metalDark;
    ctx.fillRect(a.headX + 2, a.headY + 2, a.headW - 4, 1);
    ctx.fillRect(a.headX + 2, a.headY + robotHeadH - 1, a.headW - 4, 1);

    // Antenna
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 1, a.headY - Math.floor(a.headH * 0.45), 2, Math.floor(a.headH * 0.5));
    const blinkFrame = (a.walk.armL !== 0);
    ctx.fillStyle = blinkFrame ? glowColor : metalMid;
    ctx.fillRect(cx - 2, a.headY - Math.floor(a.headH * 0.5), 4, 2);
    if (blinkFrame) {
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(cx - 3, a.headY - Math.floor(a.headH * 0.55), 6, 4);
        ctx.globalAlpha = 1.0;
    }

    // Glowing visor (horizontal slit)
    if (dir !== DIR_UP) {
        const visorY = a.headY + 1 + Math.floor(robotHeadH * 0.35);
        ctx.fillStyle = '#000000';
        ctx.fillRect(a.headX + 2, visorY - 1, a.headW - 4, 5);
        ctx.fillStyle = glowColor;
        ctx.fillRect(a.headX + 3, visorY, a.headW - 6, 3);
        ctx.fillStyle = '#ffffff';
        if (dir === DIR_DOWN) {
            ctx.fillRect(a.headX + 4, visorY + 1, 2, 1);
            ctx.fillRect(a.headX + a.headW - 6, visorY + 1, 2, 1);
        } else {
            const ex = dir === DIR_RIGHT ? a.headX + a.headW - 6 : a.headX + 4;
            ctx.fillRect(ex, visorY + 1, 2, 1);
        }
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(a.headX + 2, visorY - 2, a.headW - 4, 7);
        ctx.globalAlpha = 1.0;
    }

    // Speaker grille on lower head
    if (dir === DIR_DOWN) {
        ctx.fillStyle = metalDark;
        ctx.fillRect(cx - 3, a.headY + 1 + Math.floor(robotHeadH * 0.7), 6, 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 2, a.headY + 1 + Math.floor(robotHeadH * 0.7), 1, 1);
        ctx.fillRect(cx, a.headY + 1 + Math.floor(robotHeadH * 0.7), 1, 1);
        ctx.fillRect(cx + 2, a.headY + 1 + Math.floor(robotHeadH * 0.7), 1, 1);
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) drawMechArm(a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH);
    if (dir === DIR_DOWN || dir === DIR_LEFT) drawMechArm(a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH);
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

    // Small predator eyes on sides + jaw/teeth
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#111';
            ctx.fillRect(a.headX + 2, eyeY, 3, 3);
            ctx.fillRect(a.headX + a.headW - 5, eyeY, 3, 3);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(a.headX + 3, eyeY + 1, 1, 1);
            ctx.fillRect(a.headX + a.headW - 4, eyeY + 1, 1, 1);
            // Rows of teeth
            ctx.fillStyle = '#fff';
            for (let tx = cx - 4; tx <= cx + 3; tx += 2) {
                ctx.fillRect(tx, a.headY + a.headH - 3, 1, 2);
            }
        } else {
            // Side view eye (positioned far forward on wide head)
            const ex = dir === DIR_RIGHT ? a.headX + a.headW - 5 : a.headX + 2;
            ctx.fillStyle = '#111';
            ctx.fillRect(ex, eyeY, 3, 3);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 1, eyeY + 1, 1, 1);
            // Side jaw/snout with teeth
            const jawX = dir === DIR_RIGHT ? a.headX + a.headW - 1 : a.headX - 3;
            ctx.fillStyle = colors.mid;
            ctx.fillRect(jawX, a.headY + Math.floor(a.headH * 0.5), 4, 5);
            ctx.fillStyle = '#fff';
            ctx.fillRect(jawX + (dir === DIR_RIGHT ? 1 : 0), a.headY + Math.floor(a.headH * 0.5) + 3, 1, 2);
            ctx.fillRect(jawX + (dir === DIR_RIGHT ? 2 : 1), a.headY + Math.floor(a.headH * 0.5) + 2, 1, 2);
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
    const bob = a.walk.bob;
    const boneWhite = '#e8e0d0';
    const boneIvory = '#d5cdb8';
    const boneShadow = '#9a9080';
    const jointDark = '#605848';
    const socketBlack = '#1a1018';

    // Bone arm dimensions — thin like humerus/radius
    const skArmW = Math.max(3, a.armW - 2);
    const elbowY_frac = 0.45;

    // Helper to draw a bone arm (humerus + elbow joint + radius)
    function drawBoneArm(ax, ay, w, h) {
        // Humerus (upper bone)
        const elbowOff = Math.floor(h * elbowY_frac);
        _drawOutlinedRect(ctx, ax, ay, w, elbowOff, boneWhite, '#000000');
        _drawSoftShading(ctx, ax, ay, w, elbowOff, boneIvory);
        // Elbow joint — dark circle
        ctx.fillStyle = jointDark;
        ctx.fillRect(ax - 1, ay + elbowOff - 1, w + 2, 3);
        ctx.fillStyle = boneShadow;
        ctx.fillRect(ax, ay + elbowOff, w, 1);
        // Radius (lower bone)
        _drawOutlinedRect(ctx, ax, ay + elbowOff + 2, w, h - elbowOff - 2, boneWhite, '#000000');
        _drawSoftShading(ctx, ax, ay + elbowOff + 2, w, h - elbowOff - 2, boneIvory);
        // Skeletal hand — bony fingers
        ctx.fillStyle = boneIvory;
        ctx.fillRect(ax - 1, ay + h - 1, w + 2, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(ax - 1, ay + h + 2, 1, 2);
        ctx.fillRect(ax + Math.floor(w / 2), ay + h + 2, 1, 2);
        ctx.fillRect(ax + w, ay + h + 2, 1, 2);
    }

    // Helper to draw a bone leg (femur + knee + tibia)
    function drawBoneLeg(lx, ly, w, h) {
        const skLegW = Math.max(3, w - 2);
        const lxOff = lx + 1;
        const kneeOff = Math.floor(h * 0.42);
        // Femur
        _drawOutlinedRect(ctx, lxOff, ly, skLegW, kneeOff, boneWhite, '#000000');
        _drawSoftShading(ctx, lxOff, ly, skLegW, kneeOff, boneIvory);
        // Knee joint — wider knob
        ctx.fillStyle = boneWhite;
        ctx.fillRect(lxOff - 1, ly + kneeOff - 1, skLegW + 2, 4);
        _drawCleanRectOutline(ctx, lxOff - 1, ly + kneeOff - 1, skLegW + 2, 4, '#000000', 2);
        ctx.fillStyle = jointDark;
        ctx.fillRect(lxOff, ly + kneeOff, skLegW, 1);
        // Tibia
        _drawOutlinedRect(ctx, lxOff, ly + kneeOff + 3, skLegW, h - kneeOff - 3, boneWhite, '#000000');
        _drawSoftShading(ctx, lxOff, ly + kneeOff + 3, skLegW, h - kneeOff - 3, boneIvory);
        // Bony foot — metatarsals
        ctx.fillStyle = boneIvory;
        ctx.fillRect(lxOff - 2, ly + h - 2, skLegW + 4, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(lxOff - 2, ly + h + 1, skLegW + 4, 1);
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) drawBoneArm(a.rightArmX + 1, a.shoulderY + a.walk.armR, skArmW, a.armH);
    if (dir === DIR_DOWN || dir === DIR_RIGHT) drawBoneArm(a.leftArmX, a.shoulderY + a.walk.armL, skArmW, a.armH);

    // --- Bone legs ---
    drawBoneLeg(a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH);
    drawBoneLeg(a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH);

    // --- Ribcage torso ---
    _drawOutlinedRect(ctx, a.torsoX, a.torsoY + bob, a.torsoW, a.torsoH, boneWhite, '#000000');
    _drawShading(ctx, a.torsoX, a.torsoY + bob, a.torsoW, a.torsoH, boneIvory);

    // Spine (center line)
    ctx.fillStyle = boneShadow;
    ctx.fillRect(cx - 1, a.torsoY + bob + 1, 2, a.torsoH - 2);

    // Visible ribs — curved lines from spine outward
    if (dir !== DIR_UP) {
        const ribSpacing = Math.floor(a.torsoH / 6);
        for (let i = 0; i < 5; i++) {
            const ry = a.torsoY + bob + 2 + i * ribSpacing;
            // Left ribs
            ctx.fillStyle = boneShadow;
            ctx.fillRect(a.torsoX + 2, ry, cx - a.torsoX - 3, 1);
            // Right ribs
            ctx.fillRect(cx + 1, ry, a.torsoX + a.torsoW - cx - 3, 1);
            // Rib highlight
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.15;
            ctx.fillRect(a.torsoX + 3, ry - 1, Math.floor(a.torsoW * 0.3), 1);
            ctx.globalAlpha = 1.0;
        }
    }
    if (dir === DIR_UP) {
        // Spine prominent from back
        ctx.fillStyle = jointDark;
        for (let i = 0; i < 5; i++) {
            const vy = a.torsoY + bob + 2 + i * Math.floor(a.torsoH / 5);
            ctx.fillRect(cx - 2, vy, 4, 2);
        }
    }

    // Tattered armor remnant — shoulder piece on one side
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillStyle = '#4a3828';
        ctx.fillRect(a.torsoX, a.torsoY + bob, Math.floor(a.torsoW * 0.35), 3);
        ctx.fillStyle = '#3a2818';
        ctx.fillRect(a.torsoX + 1, a.torsoY + bob + 1, Math.floor(a.torsoW * 0.3), 1);
    }

    // Pelvis bone
    ctx.fillStyle = boneIvory;
    ctx.fillRect(a.torsoX + 2, a.torsoY + bob + a.torsoH - 3, a.torsoW - 4, 3);
    _drawCleanRectOutline(ctx, a.torsoX + 2, a.torsoY + bob + a.torsoH - 3, a.torsoW - 4, 3, '#000000', 2);

    // --- Skull head ---
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, boneWhite, '#000000');
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, boneIvory);

    // Cranium highlight
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.2;
    ctx.fillRect(a.headX + 2, a.headY + 1, Math.floor(a.headW * 0.3), Math.floor(a.headH * 0.3));
    ctx.globalAlpha = 1.0;

    // Skull features
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.2);

        // Deep hollow eye sockets
        if (dir === DIR_DOWN) {
            ctx.fillStyle = socketBlack;
            ctx.fillRect(cx - 6, eyeY, 5, 5);
            ctx.fillRect(cx + 2, eyeY, 5, 5);
            // Glowing eye points
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 5, eyeY + 1, 3, 3);
            ctx.fillRect(cx + 3, eyeY + 1, 3, 3);
            // Bright glow center
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(cx - 4, eyeY + 2, 1, 1);
            ctx.fillRect(cx + 4, eyeY + 2, 1, 1);
            ctx.globalAlpha = 1.0;

            // Nasal cavity (triangle shape)
            ctx.fillStyle = socketBlack;
            ctx.fillRect(cx - 1, a.headY + Math.floor(a.headH * 0.55), 3, 3);
            ctx.fillRect(cx, a.headY + Math.floor(a.headH * 0.55) - 1, 1, 1);

            // Jaw with teeth
            ctx.fillStyle = boneShadow;
            ctx.fillRect(a.headX + 2, a.headY + a.headH - 4, a.headW - 4, 1);
            ctx.fillStyle = '#ffffff';
            for (let tx = a.headX + 3; tx < a.headX + a.headW - 3; tx += 2) {
                ctx.fillRect(tx, a.headY + a.headH - 3, 1, 2);
            }
            ctx.fillStyle = '#000000';
            for (let tx = a.headX + 4; tx < a.headX + a.headW - 4; tx += 2) {
                ctx.fillRect(tx, a.headY + a.headH - 3, 1, 2);
            }
        } else {
            // Side view — one socket
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 5;
            ctx.fillStyle = socketBlack;
            ctx.fillRect(ex, eyeY, 5, 5);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 1, eyeY + 1, 3, 3);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(ex + 2, eyeY + 2, 1, 1);
            ctx.globalAlpha = 1.0;

            // Side jaw with teeth
            const jawX = dir === DIR_RIGHT ? a.headX + a.headW - 2 : a.headX;
            ctx.fillStyle = boneShadow;
            ctx.fillRect(jawX, a.headY + a.headH - 4, 3, 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(jawX, a.headY + a.headH - 3, 1, 2);
            ctx.fillRect(jawX + 2, a.headY + a.headH - 3, 1, 2);
        }
    }

    // Cranium suture lines (skull cracks)
    ctx.fillStyle = boneShadow;
    ctx.fillRect(cx, a.headY + 1, 1, Math.floor(a.headH * 0.4));
    ctx.fillRect(a.headX + 2, a.headY + Math.floor(a.headH * 0.3), Math.floor(a.headW * 0.3), 1);

    // Neck vertebrae
    ctx.fillStyle = boneIvory;
    ctx.fillRect(cx - 1, a.headY + a.headH, 3, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 1, a.headY + a.headH, 3, 1);

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) drawBoneArm(a.rightArmX + 1, a.shoulderY + a.walk.armR, skArmW, a.armH);
    if (dir === DIR_DOWN || dir === DIR_LEFT) drawBoneArm(a.leftArmX, a.shoulderY + a.walk.armL, skArmW, a.armH);
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

    // Face — turtleman
    if (dir !== DIR_UP) {
        _drawEyes(ctx, cx, a.headY + Math.floor(a.headH * 0.35), dir, colors);
        _drawBlush(ctx, cx, a.headY + Math.floor(a.headH * 0.35) + Math.floor(a.headH * 0.45), dir);
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

    // AQ-style heroic proportions: broad shoulders, smaller head, thick limbs (~4.5 heads tall)
    const dims = {
        headW: 16, headH: 13,
        torsoW: 20, torsoH: 20,
        armW: 6, armH: 18,
        legW: 7, legH: 18,
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

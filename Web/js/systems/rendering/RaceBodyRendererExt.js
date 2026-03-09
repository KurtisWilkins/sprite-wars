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
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;
    const lTorsoW = a.torsoW + 2;
    const lTorsoX = Math.floor(cx - lTorsoW / 2);
    const lTorsoY = a.torsoY + bob;

    // --- Thick tail (behind body for front/side views) ---
    if (dir !== DIR_UP) {
        const tailBaseX = dir === DIR_LEFT ? lTorsoX + lTorsoW - 2 : (dir === DIR_RIGHT ? lTorsoX - 2 : cx - 2);
        const tailBaseY = lTorsoY + a.torsoH - 2;
        const td = dir === DIR_DOWN ? 0 : (dir === DIR_LEFT ? 1 : -1);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tailBaseX + td * 0, tailBaseY, 5, 4);
        ctx.fillRect(tailBaseX + td * 4, tailBaseY + 2, 4, 3);
        ctx.fillRect(tailBaseX + td * 7, tailBaseY + 4, 3, 3);
        ctx.fillRect(tailBaseX + td * 9, tailBaseY + 6, 2, 2);
        ctx.fillRect(tailBaseX + td * 10, tailBaseY + 7, 2, 2);
        // Scale plates on tail
        ctx.fillStyle = colors.mid;
        ctx.fillRect(tailBaseX + td * 1, tailBaseY + 1, 3, 1);
        ctx.fillRect(tailBaseX + td * 5, tailBaseY + 3, 2, 1);
        // Outline tip
        ctx.fillStyle = colors.outline;
        ctx.fillRect(tailBaseX + td * 11, tailBaseY + 8, 1, 1);
    }
    if (dir === DIR_UP) {
        // Tail visible from behind, going down
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 2, lTorsoY + a.torsoH - 1, 5, 4);
        ctx.fillRect(cx - 1, lTorsoY + a.torsoH + 3, 3, 3);
        ctx.fillRect(cx, lTorsoY + a.torsoH + 5, 2, 2);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(cx - 1, lTorsoY + a.torsoH, 3, 1);
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');

    // --- Legs with 3-clawed feet ---
    _drawLeg(ctx, a.leftLegX, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, a.legW, a.legH, colors);
    // 3 clawed toes per foot
    ctx.fillStyle = '#443322';
    const fLY = a.legsTopY + a.walk.legL + a.legH - 1;
    const fRY = a.legsTopY + a.walk.legR + a.legH - 1;
    ctx.fillRect(a.leftLegX - 2, fLY, 2, 3);
    ctx.fillRect(a.leftLegX + Math.floor(a.legW / 2) - 1, fLY, 2, 4);
    ctx.fillRect(a.leftLegX + a.legW, fLY, 2, 3);
    ctx.fillRect(a.rightLegX - 2, fRY, 2, 3);
    ctx.fillRect(a.rightLegX + Math.floor(a.legW / 2) - 1, fRY, 2, 4);
    ctx.fillRect(a.rightLegX + a.legW, fRY, 2, 3);

    // --- Muscular torso with overlapping scale armor plates ---
    _drawOutlinedRect(ctx, lTorsoX, lTorsoY, lTorsoW, a.torsoH, colors.skin, colors.outline);
    _drawShading(ctx, lTorsoX, lTorsoY, lTorsoW, a.torsoH, colors.mid);
    // Scale armor plate rows (overlapping chevrons)
    ctx.fillStyle = colors.mid;
    for (let row = 0; row < 3; row++) {
        const sy = lTorsoY + 2 + row * 3;
        for (let col = 0; col < Math.floor(lTorsoW / 4); col++) {
            const sx = lTorsoX + 2 + col * 4;
            ctx.fillRect(sx, sy, 3, 2);
            ctx.fillRect(sx + 1, sy + 1, 2, 1);
        }
    }
    // Lighter belly plate (ventral)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(lTorsoX + 3, lTorsoY + 2, lTorsoW - 6, a.torsoH - 3);
        ctx.globalAlpha = 1.0;
    }

    // --- Thick neck ---
    ctx.fillStyle = colors.skin;
    ctx.fillRect(cx - 3, a.headY + a.headH - 1, 6, 3);

    // --- Head ---
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Neck frill (flared sides of head)
    ctx.fillStyle = colors.hair;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 3, a.headY + a.headH - 6, 4, 6);
        ctx.fillRect(a.headX - 4, a.headY + a.headH - 4, 3, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 1, a.headY + a.headH - 6, 4, 6);
        ctx.fillRect(a.headX + a.headW + 1, a.headY + a.headH - 4, 3, 3);
    }

    // Dorsal spine crest from head down back
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 1, a.headY - 5, 3, 4);
    ctx.fillRect(cx, a.headY - 7, 2, 3);
    ctx.fillRect(cx - 1, a.headY - 3, 3, 3);
    if (dir === DIR_UP || dir === DIR_LEFT || dir === DIR_RIGHT) {
        // Spines down back
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(cx - 1, a.headY + a.headH + i * 3, 3, 2);
        }
    }

    // Prominent jaw/snout with teeth
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 4, a.headY + a.headH - 3, 8, 5);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(cx - 3, a.headY + a.headH + 1, 6, 1);
        // Teeth
        ctx.fillStyle = '#eeeedd';
        ctx.fillRect(cx - 2, a.headY + a.headH, 1, 2);
        ctx.fillRect(cx + 2, a.headY + a.headH, 1, 2);
        ctx.fillRect(cx, a.headY + a.headH, 1, 1);
        // Nostrils
        ctx.fillStyle = colors.outline;
        ctx.fillRect(cx - 2, a.headY + a.headH - 2, 1, 1);
        ctx.fillRect(cx + 2, a.headY + a.headH - 2, 1, 1);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 7, a.headY + Math.floor(a.headH * 0.35), 8, 5);
        ctx.fillStyle = '#eeeedd';
        ctx.fillRect(a.headX - 7, a.headY + Math.floor(a.headH * 0.35) + 4, 2, 2);
        ctx.fillRect(a.headX - 5, a.headY + Math.floor(a.headH * 0.35) + 3, 1, 2);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 8, a.headY + Math.floor(a.headH * 0.35) + 1, 2, 2);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW - 1, a.headY + Math.floor(a.headH * 0.35), 8, 5);
        ctx.fillStyle = '#eeeedd';
        ctx.fillRect(a.headX + a.headW + 5, a.headY + Math.floor(a.headH * 0.35) + 4, 2, 2);
        ctx.fillRect(a.headX + a.headW + 4, a.headY + Math.floor(a.headH * 0.35) + 3, 1, 2);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX + a.headW + 6, a.headY + Math.floor(a.headH * 0.35) + 1, 2, 2);
    }

    // Vertical slit-pupil eyes (NOT dots)
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        ctx.fillStyle = colors.eye;
        if (dir === DIR_DOWN) {
            // Yellow eye background
            ctx.fillRect(cx - 6, eyeY, 4, 4);
            ctx.fillRect(cx + 3, eyeY, 4, 4);
            // Vertical slit pupil
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 5, eyeY, 1, 4);
            ctx.fillRect(cx + 4, eyeY, 1, 4);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 6;
            ctx.fillRect(ex, eyeY, 4, 4);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex + 1, eyeY, 1, 4);
        }
    }

    // --- 3-clawed hands ---
    ctx.fillStyle = '#443322';
    const laY = a.shoulderY + a.walk.armL + a.armH;
    const raY = a.shoulderY + a.walk.armR + a.armH;
    ctx.fillRect(a.leftArmX - 1, laY, 2, 3);
    ctx.fillRect(a.leftArmX + Math.floor(a.armW / 2), laY, 2, 3);
    ctx.fillRect(a.leftArmX + a.armW - 1, laY, 2, 3);
    ctx.fillRect(a.rightArmX - 1, raY, 2, 3);
    ctx.fillRect(a.rightArmX + Math.floor(a.armW / 2), raY, 2, 3);
    ctx.fillRect(a.rightArmX + a.armW - 1, raY, 2, 3);

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
    // Re-draw front arm claws on top
    ctx.fillStyle = '#443322';
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.rightArmX - 1, raY, 2, 3);
        ctx.fillRect(a.rightArmX + Math.floor(a.armW / 2), raY, 2, 3);
        ctx.fillRect(a.rightArmX + a.armW - 1, raY, 2, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.leftArmX - 1, laY, 2, 3);
        ctx.fillRect(a.leftArmX + Math.floor(a.armW / 2), laY, 2, 3);
        ctx.fillRect(a.leftArmX + a.armW - 1, laY, 2, 3);
    }
}

// ── Race 14: Minotaur ───────────────────────────────────────────────────────
function _drawMinotaur(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;

    // MASSIVE proportions (2nd widest race)
    const mTorsoW = a.torsoW + 8;
    const mTorsoX = Math.floor(cx - mTorsoW / 2);
    const mArmW = a.armW + 4;
    const mHeadW = a.headW + 6;
    const mHeadH = a.headH + 3;
    const mHeadX = Math.floor(cx - mHeadW / 2);
    const mLegW = a.legW + 4;
    const mLegH = a.legH + 2;

    // --- Bovine tail with tuft (behind body) ---
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        const td = dir === DIR_LEFT ? 1 : (dir === DIR_RIGHT ? -1 : 0);
        const tailX = dir === DIR_UP ? cx - 1 : (dir === DIR_LEFT ? mTorsoX + mTorsoW - 2 : mTorsoX);
        const tailY = a.torsoY + a.torsoH - 2 + bob;
        ctx.fillRect(tailX + td * 0, tailY, 3, 2);
        ctx.fillRect(tailX + td * 2, tailY + 2, 2, 3);
        ctx.fillRect(tailX + td * 3, tailY + 4, 2, 3);
        ctx.fillRect(tailX + td * 4, tailY + 6, 2, 3);
        // Tail tuft
        ctx.fillStyle = colors.hair;
        ctx.fillRect(tailX + td * 3, tailY + 8, 4, 3);
        ctx.fillRect(tailX + td * 4, tailY + 9, 3, 3);
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, cx + Math.floor(mTorsoW / 2), a.shoulderY + a.walk.armR, mArmW, a.armH + 2, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, cx - Math.floor(mTorsoW / 2) - mArmW, a.shoulderY + a.walk.armL, mArmW, a.armH + 2, colors, 'left');

    // --- Thick legs with cloven hooves ---
    _drawLeg(ctx, Math.floor(cx - mLegW - 1), a.legsTopY + a.walk.legL, mLegW, mLegH, colors);
    _drawLeg(ctx, Math.floor(cx + 1), a.legsTopY + a.walk.legR, mLegW, mLegH, colors);
    // Cloven hooves (dark split hoof)
    ctx.fillStyle = '#332211';
    const lhY = a.legsTopY + a.walk.legL + mLegH - 2;
    const rhY = a.legsTopY + a.walk.legR + mLegH - 2;
    ctx.fillRect(Math.floor(cx - mLegW - 2), lhY, mLegW + 3, 4);
    ctx.fillRect(Math.floor(cx), rhY, mLegW + 3, 4);
    // Hoof split line
    ctx.fillStyle = '#111';
    ctx.fillRect(Math.floor(cx - mLegW / 2 - 1), lhY + 1, 1, 3);
    ctx.fillRect(Math.floor(cx + mLegW / 2 + 1), rhY + 1, 1, 3);

    // --- Barrel chest / massive torso ---
    _drawOutlinedRect(ctx, mTorsoX, a.torsoY + bob, mTorsoW, a.torsoH + 2, colors.skin, colors.outline);
    _drawShading(ctx, mTorsoX, a.torsoY + bob, mTorsoW, a.torsoH + 2, colors.mid);
    // Chest muscle definition
    ctx.fillStyle = colors.mid;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(mTorsoX + 2, a.torsoY + bob + 2, Math.floor(mTorsoW / 2) - 2, 3);
    ctx.fillRect(mTorsoX + Math.floor(mTorsoW / 2) + 1, a.torsoY + bob + 2, Math.floor(mTorsoW / 2) - 2, 3);
    ctx.globalAlpha = 1.0;

    // --- Thick neck ---
    ctx.fillStyle = colors.skin;
    ctx.fillRect(cx - 5, a.headY + mHeadH - 2, 10, 4);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(cx - 5, a.headY + mHeadH + 1, 1, 1);
    ctx.fillRect(cx + 4, a.headY + mHeadH + 1, 1, 1);

    // --- Dark mane (behind head) ---
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(mHeadX - 1, a.headY + 2, mHeadW + 2, mHeadH);
        ctx.fillRect(mHeadX, a.headY + mHeadH - 2, mHeadW, 4);
    }

    // --- Huge bull head with wide muzzle ---
    _drawOutlinedRect(ctx, mHeadX, a.headY, mHeadW, mHeadH, colors.skin, colors.outline);
    _drawShading(ctx, mHeadX, a.headY, mHeadW, mHeadH, colors.mid);

    // Small ears
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(mHeadX - 3, a.headY + 3, 4, 3);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(mHeadX - 2, a.headY + 4, 2, 1);
    }
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(mHeadX + mHeadW - 1, a.headY + 3, 4, 3);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(mHeadX + mHeadW, a.headY + 4, 2, 1);
    }

    // Fierce brow ridge
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(mHeadX + 2, a.headY + Math.floor(mHeadH * 0.2), mHeadW - 4, 3);
        // Brow furrowed middle
        ctx.fillRect(cx - 1, a.headY + Math.floor(mHeadH * 0.18), 2, 2);
    }

    // Large curved horns with ridges
    ctx.fillStyle = '#998877';
    // Left horn base -> curve up-out
    ctx.fillRect(mHeadX - 2, a.headY, 4, 4);
    ctx.fillRect(mHeadX - 5, a.headY - 3, 4, 4);
    ctx.fillRect(mHeadX - 7, a.headY - 6, 3, 4);
    ctx.fillRect(mHeadX - 8, a.headY - 9, 3, 4);
    ctx.fillRect(mHeadX - 7, a.headY - 11, 3, 3);
    // Right horn
    ctx.fillRect(mHeadX + mHeadW - 2, a.headY, 4, 4);
    ctx.fillRect(mHeadX + mHeadW + 1, a.headY - 3, 4, 4);
    ctx.fillRect(mHeadX + mHeadW + 4, a.headY - 6, 3, 4);
    ctx.fillRect(mHeadX + mHeadW + 5, a.headY - 9, 3, 4);
    ctx.fillRect(mHeadX + mHeadW + 4, a.headY - 11, 3, 3);
    // Horn ridges (darker lines)
    ctx.fillStyle = '#776655';
    ctx.fillRect(mHeadX - 4, a.headY - 2, 3, 1);
    ctx.fillRect(mHeadX - 6, a.headY - 5, 2, 1);
    ctx.fillRect(mHeadX - 7, a.headY - 8, 2, 1);
    ctx.fillRect(mHeadX + mHeadW + 1, a.headY - 2, 3, 1);
    ctx.fillRect(mHeadX + mHeadW + 4, a.headY - 5, 2, 1);
    ctx.fillRect(mHeadX + mHeadW + 5, a.headY - 8, 2, 1);

    // Face features
    if (dir !== DIR_UP) {
        // Eyes under brow
        const eyeY = a.headY + Math.floor(mHeadH * 0.35);
        _drawEyes(ctx, cx, eyeY, dir, colors, 7);

        // Wide muzzle area
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.mid;
            ctx.fillRect(cx - 5, a.headY + mHeadH - 7, 10, 5);
            // Flared nostrils
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - 3, a.headY + mHeadH - 5, 2, 2);
            ctx.fillRect(cx + 2, a.headY + mHeadH - 5, 2, 2);
            // Gold nose ring
            ctx.fillStyle = '#ddaa22';
            ctx.fillRect(cx - 2, a.headY + mHeadH - 3, 5, 2);
            ctx.fillRect(cx - 3, a.headY + mHeadH - 2, 1, 2);
            ctx.fillRect(cx + 3, a.headY + mHeadH - 2, 1, 2);
            ctx.fillRect(cx - 2, a.headY + mHeadH, 5, 1);
        } else {
            // Side muzzle
            const mx = dir === DIR_RIGHT ? mHeadX + mHeadW - 2 : mHeadX - 3;
            ctx.fillStyle = colors.mid;
            ctx.fillRect(mx, a.headY + mHeadH - 7, 5, 5);
            ctx.fillStyle = '#222';
            ctx.fillRect(mx + (dir === DIR_RIGHT ? 3 : 0), a.headY + mHeadH - 5, 2, 2);
            // Side nose ring
            ctx.fillStyle = '#ddaa22';
            ctx.fillRect(mx + (dir === DIR_RIGHT ? 2 : 1), a.headY + mHeadH - 3, 3, 2);
        }
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, cx + Math.floor(mTorsoW / 2), a.shoulderY + a.walk.armR, mArmW, a.armH + 2, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, cx - Math.floor(mTorsoW / 2) - mArmW, a.shoulderY + a.walk.armL, mArmW, a.armH + 2, colors, 'left');
}

// ── Race 15: Monkey man ─────────────────────────────────────────────────────
function _drawMonkeyman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;

    // Lean agile build, slightly crouched
    const mTorsoW = a.torsoW - 2;
    const mTorsoX = Math.floor(cx - mTorsoW / 2);
    const mTorsoY = a.torsoY + bob + 2; // crouched lower

    // VERY long arms (longest of all races)
    const longArmH = a.armH + 8;
    const mArmW = a.armW - 1;

    // --- Long curling prehensile tail (behind body) ---
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        const td = dir === DIR_LEFT ? 1 : (dir === DIR_RIGHT ? -1 : 0);
        const tailX = dir === DIR_UP ? cx - 1 : (dir === DIR_LEFT ? mTorsoX + mTorsoW : mTorsoX - 2);
        const tailY = mTorsoY + a.torsoH - 4;
        // Long curling S-shape
        ctx.fillRect(tailX + td * 0, tailY, 3, 2);
        ctx.fillRect(tailX + td * 2, tailY - 1, 3, 2);
        ctx.fillRect(tailX + td * 4, tailY - 2, 2, 2);
        ctx.fillRect(tailX + td * 5, tailY - 1, 2, 2);
        ctx.fillRect(tailX + td * 6, tailY + 1, 2, 2);
        ctx.fillRect(tailX + td * 7, tailY + 3, 2, 2);
        ctx.fillRect(tailX + td * 7, tailY + 5, 2, 2);
        // Curl tip (loops back)
        ctx.fillRect(tailX + td * 6, tailY + 6, 2, 2);
        ctx.fillRect(tailX + td * 5, tailY + 5, 2, 2);
    }

    // --- Back arms (very long, with gripping hands) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, mArmW, longArmH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, mArmW, longArmH, colors, 'left');
    // Back arm gripping hand fingers
    ctx.fillStyle = colors.mid;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        const hy = a.shoulderY + a.walk.armR + longArmH;
        ctx.fillRect(a.rightArmX - 1, hy, mArmW + 2, 3);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.rightArmX - 1, hy + 2, 1, 2);
        ctx.fillRect(a.rightArmX + mArmW, hy + 2, 1, 2);
    }
    ctx.fillStyle = colors.mid;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        const hy = a.shoulderY + a.walk.armL + longArmH;
        ctx.fillRect(a.leftArmX - 1, hy, mArmW + 2, 3);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.leftArmX - 1, hy + 2, 1, 2);
        ctx.fillRect(a.leftArmX + mArmW, hy + 2, 1, 2);
    }

    // --- Shorter legs with prehensile gripping feet ---
    const mLegH = a.legH - 2;
    const legY = a.legsTopY + 2;
    _drawLeg(ctx, a.leftLegX, legY + a.walk.legL, a.legW - 1, mLegH, colors);
    _drawLeg(ctx, a.rightLegX, legY + a.walk.legR, a.legW - 1, mLegH, colors);
    // Prehensile gripping feet with spread toes
    ctx.fillStyle = colors.mid;
    const lfY = legY + a.walk.legL + mLegH - 1;
    const rfY = legY + a.walk.legR + mLegH - 1;
    ctx.fillRect(a.leftLegX - 3, lfY, a.legW + 5, 3);
    ctx.fillRect(a.rightLegX - 3, rfY, a.legW + 5, 3);
    // Toe outlines
    ctx.fillStyle = colors.outline;
    ctx.fillRect(a.leftLegX - 3, lfY + 2, 2, 2);
    ctx.fillRect(a.leftLegX + a.legW, lfY + 2, 2, 2);
    ctx.fillRect(a.rightLegX - 3, rfY + 2, 2, 2);
    ctx.fillRect(a.rightLegX + a.legW, rfY + 2, 2, 2);

    // --- Lean torso ---
    _drawOutlinedRect(ctx, mTorsoX, mTorsoY, mTorsoW, a.torsoH - 3, colors.skin, colors.outline);
    _drawShading(ctx, mTorsoX, mTorsoY, mTorsoW, a.torsoH - 3, colors.mid);
    // Lighter belly patch
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(mTorsoX + 2, mTorsoY + 1, mTorsoW - 4, a.torsoH - 5);
        ctx.globalAlpha = 1.0;
    }

    // --- Round head ---
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Brow ridge
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(a.headX + 2, a.headY + Math.floor(a.headH * 0.2), a.headW - 4, 2);
        ctx.globalAlpha = 1.0;
    }

    // Large round side-ears
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 5, a.headY + 1, 6, 7);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.headX - 4, a.headY + 2, 4, 5);
    }
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 1, a.headY + 1, 6, 7);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.headX + a.headW, a.headY + 2, 4, 5);
    }

    // Lighter face/muzzle area
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(cx - 5, a.headY + Math.floor(a.headH * 0.4), 10, a.headH - Math.floor(a.headH * 0.4) - 1);
        ctx.globalAlpha = 1.0;
    }

    // Fur fringe at top of head
    ctx.fillStyle = colors.hair;
    ctx.fillRect(a.headX + 2, a.headY - 3, a.headW - 4, 4);
    ctx.fillRect(a.headX + 4, a.headY - 5, a.headW - 8, 3);

    // Face
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35);
        _drawEyes(ctx, cx, eyeY, dir, colors, 5);

        // Wide grin with teeth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 4, a.headY + a.headH - 5, 9, 3);
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 3, a.headY + a.headH - 5, 7, 2);
            // Flat nose
            ctx.fillStyle = colors.mid;
            ctx.fillRect(cx - 2, a.headY + a.headH - 8, 4, 2);
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - 1, a.headY + a.headH - 7, 1, 1);
            ctx.fillRect(cx + 1, a.headY + a.headH - 7, 1, 1);
        } else {
            // Side grin
            const gx = dir === DIR_RIGHT ? cx + 2 : cx - 5;
            ctx.fillStyle = colors.outline;
            ctx.fillRect(gx, a.headY + a.headH - 5, 4, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(gx + 1, a.headY + a.headH - 5, 2, 1);
        }
    }

    // --- Front arms (very long, with gripping hands) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, mArmW, longArmH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, mArmW, longArmH, colors, 'left');
    // Front arm gripping hands
    ctx.fillStyle = colors.mid;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        const hy = a.shoulderY + a.walk.armR + longArmH;
        ctx.fillRect(a.rightArmX - 1, hy, mArmW + 2, 3);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.rightArmX - 1, hy + 2, 1, 2);
        ctx.fillRect(a.rightArmX + Math.floor(mArmW / 2), hy + 2, 1, 2);
        ctx.fillRect(a.rightArmX + mArmW, hy + 2, 1, 2);
    }
    ctx.fillStyle = colors.mid;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        const hy = a.shoulderY + a.walk.armL + longArmH;
        ctx.fillRect(a.leftArmX - 1, hy, mArmW + 2, 3);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.leftArmX - 1, hy + 2, 1, 2);
        ctx.fillRect(a.leftArmX + Math.floor(mArmW / 2), hy + 2, 1, 2);
        ctx.fillRect(a.leftArmX + mArmW, hy + 2, 1, 2);
    }
}

// ── Race 16: Mummy ──────────────────────────────────────────────────────────
function _drawMummy(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;
    const bandageColor = '#d4c8a0';
    const bandageDark = '#b0a478';
    const voidColor = '#2a1a0a';
    const goldColor = '#ccaa33';

    // --- Trailing loose bandage strips (behind body) ---
    ctx.fillStyle = bandageColor;
    if (dir !== DIR_UP) {
        // Loose strips hanging from back
        ctx.fillRect(a.leftArmX - 2, a.shoulderY + a.walk.armL + a.armH, 2, 6 + Math.abs(a.walk.armL));
        ctx.fillRect(a.rightArmX + a.armW, a.shoulderY + a.walk.armR + a.armH, 2, 5 + Math.abs(a.walk.armR));
        ctx.fillRect(a.torsoX - 1, a.torsoY + a.torsoH + bob - 2, 2, 5);
        ctx.fillRect(a.torsoX + a.torsoW - 1, a.torsoY + a.torsoH + bob - 1, 2, 4);
    }

    // --- Back arms (bandaged) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH, colors, 'left');
    }

    // --- Legs (bandaged, shambling posture - offset) ---
    const lLegOff = dir === DIR_DOWN || dir === DIR_LEFT ? 1 : 0;
    const rLegOff = dir === DIR_DOWN || dir === DIR_RIGHT ? 1 : 0;
    _drawLeg(ctx, a.leftLegX + lLegOff, a.legsTopY + a.walk.legL, a.legW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX - rLegOff, a.legsTopY + a.walk.legR, a.legW, a.legH, colors);
    // Gold ankle bands
    ctx.fillStyle = goldColor;
    ctx.fillRect(a.leftLegX + lLegOff - 1, a.legsTopY + a.walk.legL + a.legH - 4, a.legW + 2, 2);
    ctx.fillRect(a.rightLegX - rLegOff - 1, a.legsTopY + a.walk.legR + a.legH - 4, a.legW + 2, 2);
    // Leg bandage wraps with void gaps
    for (let y = 0; y < a.legH - 4; y += 3) {
        ctx.fillStyle = bandageColor;
        ctx.fillRect(a.leftLegX + lLegOff, a.legsTopY + a.walk.legL + y, a.legW, 2);
        ctx.fillRect(a.rightLegX - rLegOff, a.legsTopY + a.walk.legR + y, a.legW, 2);
        ctx.fillStyle = voidColor;
        ctx.fillRect(a.leftLegX + lLegOff, a.legsTopY + a.walk.legL + y + 2, a.legW, 1);
        ctx.fillRect(a.rightLegX - rLegOff, a.legsTopY + a.walk.legR + y + 2, a.legW, 1);
    }
    // Dessicated thin fingers on feet
    ctx.fillStyle = '#554433';
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

    // Hulking top-heavy proportions with forward lean
    const orkTorsoW = a.torsoW + 6;
    const orkTorsoX = Math.floor(cx - orkTorsoW / 2);
    const orkArmW = a.armW + 3;
    const lean = dir === DIR_DOWN ? 1 : (dir === DIR_UP ? -1 : 0);
    const orkTorsoY = a.torsoY + bob + lean;

    // --- Back arms (massive, with bicep bulge) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, cx + Math.floor(orkTorsoW / 2), a.shoulderY + a.walk.armR, orkArmW, a.armH + 2, colors, 'right');
        // Bicep bulge
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx + Math.floor(orkTorsoW / 2) - 1, a.shoulderY + a.walk.armR + 1, orkArmW + 2, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, cx - Math.floor(orkTorsoW / 2) - orkArmW, a.shoulderY + a.walk.armL, orkArmW, a.armH + 2, colors, 'left');
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - Math.floor(orkTorsoW / 2) - orkArmW - 1, a.shoulderY + a.walk.armL + 1, orkArmW + 2, 3);
    }
    // Spiked wrist bracers on back arms
    ctx.fillStyle = '#554433';
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        const bY = a.shoulderY + a.walk.armR + a.armH - 2;
        ctx.fillRect(cx + Math.floor(orkTorsoW / 2) - 1, bY, orkArmW + 2, 3);
        ctx.fillStyle = '#888';
        ctx.fillRect(cx + Math.floor(orkTorsoW / 2), bY - 2, 2, 2);
        ctx.fillRect(cx + Math.floor(orkTorsoW / 2) + orkArmW - 2, bY - 2, 2, 2);
    }
    ctx.fillStyle = '#554433';
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        const bY = a.shoulderY + a.walk.armL + a.armH - 2;
        ctx.fillRect(cx - Math.floor(orkTorsoW / 2) - orkArmW - 1, bY, orkArmW + 2, 3);
        ctx.fillStyle = '#888';
        ctx.fillRect(cx - Math.floor(orkTorsoW / 2) - orkArmW, bY - 2, 2, 2);
        ctx.fillRect(cx - Math.floor(orkTorsoW / 2) - 2, bY - 2, 2, 2);
    }

    // --- Thick legs with heavy plated boots ---
    const orkLegW = a.legW + 3;
    _drawLeg(ctx, Math.floor(cx - orkLegW - 1), a.legsTopY + a.walk.legL, orkLegW, a.legH, colors);
    _drawLeg(ctx, Math.floor(cx + 1), a.legsTopY + a.walk.legR, orkLegW, a.legH, colors);
    // Heavy plated boots
    ctx.fillStyle = '#443322';
    const lBootY = a.legsTopY + a.walk.legL + a.legH - 4;
    const rBootY = a.legsTopY + a.walk.legR + a.legH - 4;
    ctx.fillRect(Math.floor(cx - orkLegW - 2), lBootY, orkLegW + 4, 6);
    ctx.fillRect(Math.floor(cx), rBootY, orkLegW + 4, 6);
    // Boot plate lines
    ctx.fillStyle = '#665544';
    ctx.fillRect(Math.floor(cx - orkLegW - 1), lBootY + 1, orkLegW + 2, 1);
    ctx.fillRect(Math.floor(cx + 1), rBootY + 1, orkLegW + 2, 1);
    // Boot spikes/rivets
    ctx.fillStyle = '#888';
    ctx.fillRect(Math.floor(cx - orkLegW - 2), lBootY, 2, 2);
    ctx.fillRect(Math.floor(cx + orkLegW + 2), rBootY, 2, 2);

    // --- Muscular torso with leather hide vest ---
    _drawOutlinedRect(ctx, orkTorsoX, orkTorsoY, orkTorsoW, a.torsoH + 1, colors.skin, colors.outline);
    _drawShading(ctx, orkTorsoX, orkTorsoY, orkTorsoW, a.torsoH + 1, colors.mid);
    // Leather hide vest with ragged edges
    ctx.fillStyle = '#665533';
    ctx.fillRect(orkTorsoX + 1, orkTorsoY + 1, orkTorsoW - 2, a.torsoH - 1);
    ctx.fillStyle = '#776644';
    ctx.fillRect(orkTorsoX + 2, orkTorsoY + 2, orkTorsoW - 4, a.torsoH - 3);
    // Vest opening (shows skin)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 2, orkTorsoY + 1, 4, a.torsoH - 2);
    }
    // Ragged bottom edge of vest
    ctx.fillStyle = '#665533';
    for (let x = orkTorsoX + 1; x < orkTorsoX + orkTorsoW - 1; x += 3) {
        ctx.fillRect(x, orkTorsoY + a.torsoH, 2, 1 + (x % 2));
    }
    // Battle scars on torso
    ctx.fillStyle = '#884444';
    ctx.fillRect(orkTorsoX + 3, orkTorsoY + 3, 3, 1);
    ctx.fillRect(orkTorsoX + orkTorsoW - 6, orkTorsoY + 5, 1, 3);

    // --- Thick neck ---
    ctx.fillStyle = colors.skin;
    ctx.fillRect(cx - 4, a.headY + a.headH - 1, 8, 3);

    // --- Head ---
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // Pointed ears (wide)
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 5, a.headY + 3, 6, 4);
        ctx.fillRect(a.headX - 7, a.headY + 2, 3, 3);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.headX - 4, a.headY + 4, 3, 2);
    }
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW - 1, a.headY + 3, 6, 4);
        ctx.fillRect(a.headX + a.headW + 4, a.headY + 2, 3, 3);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(a.headX + a.headW + 1, a.headY + 4, 3, 2);
    }

    // Heavy brow ridge
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX + 1, a.headY + Math.floor(a.headH * 0.2), a.headW - 2, 3);
    }

    // Mohawk hairstyle
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 2, a.headY - 6, 4, 7);
    ctx.fillRect(cx - 1, a.headY - 8, 3, 3);
    ctx.fillRect(cx, a.headY - 9, 2, 2);
    // Mohawk back trail
    if (dir !== DIR_DOWN) {
        ctx.fillRect(cx - 1, a.headY + 2, 3, a.headH - 4);
    }

    // Large tusks from lower jaw
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#eeddcc';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 6, a.headY + a.headH - 3, 3, 5);
            ctx.fillRect(cx + 4, a.headY + a.headH - 3, 3, 5);
            // Tusk tips
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 5, a.headY + a.headH - 3, 1, 2);
            ctx.fillRect(cx + 5, a.headY + a.headH - 3, 1, 2);
        } else {
            const tx = dir === DIR_RIGHT ? cx + 3 : cx - 5;
            ctx.fillRect(tx, a.headY + a.headH - 3, 3, 4);
        }
    }

    // Broad flat nose
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.mid;
        ctx.fillRect(cx - 3, a.headY + a.headH - 6, 6, 3);
        ctx.fillStyle = '#222';
        ctx.fillRect(cx - 2, a.headY + a.headH - 5, 1, 1);
        ctx.fillRect(cx + 2, a.headY + a.headH - 5, 1, 1);
    }

    // Red war paint stripes on face
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#cc2222';
        if (dir === DIR_DOWN) {
            ctx.fillRect(a.headX + 3, a.headY + Math.floor(a.headH * 0.3), 2, a.headH - Math.floor(a.headH * 0.3) - 3);
            ctx.fillRect(a.headX + a.headW - 5, a.headY + Math.floor(a.headH * 0.3), 2, a.headH - Math.floor(a.headH * 0.3) - 3);
        } else {
            const px = dir === DIR_RIGHT ? cx + 1 : cx - 3;
            ctx.fillRect(px, a.headY + Math.floor(a.headH * 0.3), 2, 6);
        }
    }

    // Face (eyes under brow)
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.35) + 2;
        _drawEyes(ctx, cx, eyeY, dir, colors, 5);
    }

    // --- Front arms (massive, with spiked bracers) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, cx + Math.floor(orkTorsoW / 2), a.shoulderY + a.walk.armR, orkArmW, a.armH + 2, colors, 'right');
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx + Math.floor(orkTorsoW / 2) - 1, a.shoulderY + a.walk.armR + 1, orkArmW + 2, 3);
        // Spiked bracer
        ctx.fillStyle = '#554433';
        const bY = a.shoulderY + a.walk.armR + a.armH - 2;
        ctx.fillRect(cx + Math.floor(orkTorsoW / 2) - 1, bY, orkArmW + 2, 3);
        ctx.fillStyle = '#888';
        ctx.fillRect(cx + Math.floor(orkTorsoW / 2), bY - 2, 2, 2);
        ctx.fillRect(cx + Math.floor(orkTorsoW / 2) + orkArmW - 2, bY - 2, 2, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, cx - Math.floor(orkTorsoW / 2) - orkArmW, a.shoulderY + a.walk.armL, orkArmW, a.armH + 2, colors, 'left');
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - Math.floor(orkTorsoW / 2) - orkArmW - 1, a.shoulderY + a.walk.armL + 1, orkArmW + 2, 3);
        ctx.fillStyle = '#554433';
        const bY = a.shoulderY + a.walk.armL + a.armH - 2;
        ctx.fillRect(cx - Math.floor(orkTorsoW / 2) - orkArmW - 1, bY, orkArmW + 2, 3);
        ctx.fillStyle = '#888';
        ctx.fillRect(cx - Math.floor(orkTorsoW / 2) - orkArmW, bY - 2, 2, 2);
        ctx.fillRect(cx - Math.floor(orkTorsoW / 2) - 2, bY - 2, 2, 2);
    }
}

// ── Race 18: Rat man ────────────────────────────────────────────────────────
function _drawRatman(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const bob = a.walk.bob;

    // Smallest/most hunched race
    const rTorsoW = a.torsoW - 4;
    const rTorsoX = Math.floor(cx - rTorsoW / 2);
    const rTorsoY = a.torsoY + bob + 3; // very hunched
    const rArmW = a.armW - 2; // thinnest limbs
    const rLegW = a.legW - 2;

    // --- Long naked whip tail (behind body) ---
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = '#cc9988';
        const td = dir === DIR_LEFT ? 1 : (dir === DIR_RIGHT ? -1 : 0);
        const tailX = dir === DIR_UP ? cx - 1 : (dir === DIR_LEFT ? rTorsoX + rTorsoW : rTorsoX - 1);
        const tailY = rTorsoY + a.torsoH - 4;
        // Long thin naked tail
        ctx.fillRect(tailX + td * 0, tailY, 2, 2);
        ctx.fillRect(tailX + td * 2, tailY + 1, 2, 1);
        ctx.fillRect(tailX + td * 3, tailY + 2, 1, 1);
        ctx.fillRect(tailX + td * 4, tailY + 3, 1, 1);
        ctx.fillRect(tailX + td * 5, tailY + 4, 1, 1);
        ctx.fillRect(tailX + td * 6, tailY + 5, 1, 1);
        ctx.fillRect(tailX + td * 7, tailY + 5, 1, 1);
        ctx.fillRect(tailX + td * 8, tailY + 4, 1, 1);
        ctx.fillRect(tailX + td * 9, tailY + 3, 1, 1);
        ctx.fillRect(tailX + td * 10, tailY + 3, 1, 1);
    }

    // --- Back arms (thinnest, with grabby long fingers) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR + 2, rArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL + 2, rArmW, a.armH, colors, 'left');

    // --- Thin legs ---
    _drawLeg(ctx, a.leftLegX + 1, a.legsTopY + a.walk.legL, rLegW, a.legH, colors);
    _drawLeg(ctx, a.rightLegX, a.legsTopY + a.walk.legR, rLegW, a.legH, colors);
    // Ratty clawed feet
    ctx.fillStyle = '#cc9988';
    const lfY = a.legsTopY + a.walk.legL + a.legH - 1;
    const rfY = a.legsTopY + a.walk.legR + a.legH - 1;
    ctx.fillRect(a.leftLegX - 1, lfY, rLegW + 3, 2);
    ctx.fillRect(a.rightLegX - 1, rfY, rLegW + 3, 2);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(a.leftLegX - 1, lfY + 1, 1, 2);
    ctx.fillRect(a.leftLegX + rLegW + 1, lfY + 1, 1, 2);
    ctx.fillRect(a.rightLegX - 1, rfY + 1, 1, 2);
    ctx.fillRect(a.rightLegX + rLegW + 1, rfY + 1, 1, 2);

    // --- Tattered hooded cloak (behind head, over torso) ---
    ctx.fillStyle = '#554444';
    // Cloak body draping over torso
    ctx.fillRect(rTorsoX - 2, rTorsoY - 2, rTorsoW + 4, a.torsoH);
    ctx.fillStyle = '#443333';
    ctx.fillRect(rTorsoX - 3, rTorsoY - 1, rTorsoW + 6, 2);
    // Ragged cloak bottom
    for (let x = rTorsoX - 2; x < rTorsoX + rTorsoW + 2; x += 2) {
        ctx.fillStyle = '#554444';
        ctx.fillRect(x, rTorsoY + a.torsoH - 2, 1, 1 + (x % 3));
    }
    // Cloak hood (behind head)
    ctx.fillStyle = '#554444';
    ctx.fillRect(a.headX - 2, a.headY - 2, a.headW + 4, a.headH + 2);
    ctx.fillStyle = '#443333';
    ctx.fillRect(a.headX - 3, a.headY - 3, a.headW + 6, 4);
    ctx.fillRect(a.headX - 3, a.headY - 2, 3, a.headH);
    ctx.fillRect(a.headX + a.headW, a.headY - 2, 3, a.headH);

    // --- Hunched torso (under cloak, just skin edges visible) ---
    _drawOutlinedRect(ctx, rTorsoX, rTorsoY, rTorsoW, a.torsoH - 3, colors.skin, colors.outline);
    _drawShading(ctx, rTorsoX, rTorsoY, rTorsoW, a.torsoH - 3, colors.mid);

    // --- Head with long pointed snout ---
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH, colors.skin, colors.outline);
    _drawShading(ctx, a.headX, a.headY, a.headW, a.headH, colors.mid);

    // HUGE round ears
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 5, a.headY - 5, 8, 8);
        ctx.fillStyle = '#ddaaaa'; // Pink inner ear
        ctx.fillRect(a.headX - 4, a.headY - 4, 6, 6);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 3, a.headY - 3, 4, 4);
        ctx.fillStyle = '#ddaaaa';
        ctx.fillRect(a.headX - 2, a.headY - 2, 2, 2);
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
    }

    // Long pointed whiskered snout
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 3, a.headY + a.headH - 2, 6, 5);
        ctx.fillRect(cx - 2, a.headY + a.headH + 2, 4, 3);
        ctx.fillRect(cx - 1, a.headY + a.headH + 4, 2, 2);
        // Pink nose
        ctx.fillStyle = '#ee8899';
        ctx.fillRect(cx - 1, a.headY + a.headH + 5, 2, 2);
        // Front incisors
        ctx.fillStyle = '#ffffee';
        ctx.fillRect(cx - 1, a.headY + a.headH + 3, 1, 2);
        ctx.fillRect(cx + 1, a.headY + a.headH + 3, 1, 2);
        // 3+ whiskers per side
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 4, a.headY + Math.floor(a.headH * 0.55), 5, 1);
        ctx.fillRect(a.headX - 5, a.headY + Math.floor(a.headH * 0.65), 6, 1);
        ctx.fillRect(a.headX - 3, a.headY + Math.floor(a.headH * 0.75), 4, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.55), 5, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.65), 6, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.75), 4, 1);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX - 7, a.headY + Math.floor(a.headH * 0.4), 8, 4);
        ctx.fillRect(a.headX - 9, a.headY + Math.floor(a.headH * 0.45), 3, 3);
        ctx.fillStyle = '#ee8899';
        ctx.fillRect(a.headX - 10, a.headY + Math.floor(a.headH * 0.47), 2, 2);
        // Side whiskers
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 12, a.headY + Math.floor(a.headH * 0.4), 4, 1);
        ctx.fillRect(a.headX - 11, a.headY + Math.floor(a.headH * 0.5), 3, 1);
        ctx.fillRect(a.headX - 10, a.headY + Math.floor(a.headH * 0.6), 3, 1);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(a.headX + a.headW - 1, a.headY + Math.floor(a.headH * 0.4), 8, 4);
        ctx.fillRect(a.headX + a.headW + 6, a.headY + Math.floor(a.headH * 0.45), 3, 3);
        ctx.fillStyle = '#ee8899';
        ctx.fillRect(a.headX + a.headW + 8, a.headY + Math.floor(a.headH * 0.47), 2, 2);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX + a.headW + 8, a.headY + Math.floor(a.headH * 0.4), 4, 1);
        ctx.fillRect(a.headX + a.headW + 8, a.headY + Math.floor(a.headH * 0.5), 3, 1);
        ctx.fillRect(a.headX + a.headW + 7, a.headY + Math.floor(a.headH * 0.6), 3, 1);
    }

    // Beady gleaming eyes
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        ctx.fillStyle = colors.eye;
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 5, eyeY, 3, 3);
            ctx.fillRect(cx + 3, eyeY, 3, 3);
            // Gleam highlight
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 4, eyeY, 1, 1);
            ctx.fillRect(cx + 4, eyeY, 1, 1);
            // Dark pupil
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 4, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 3, eyeY + 1, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 4;
            ctx.fillRect(ex, eyeY, 3, 3);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY, 1, 1);
            ctx.fillStyle = '#111';
            ctx.fillRect(ex, eyeY + 1, 2, 2);
        }
    }

    // --- Front arms (thin, with grabby long-fingered hands) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) _drawArm(ctx, a.rightArmX + 1, a.shoulderY + a.walk.armR + 2, rArmW, a.armH, colors, 'right');
    if (dir === DIR_DOWN || dir === DIR_LEFT) _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL + 2, rArmW, a.armH, colors, 'left');
    // Grabby long-fingered hands
    ctx.fillStyle = '#cc9988';
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        const hy = a.shoulderY + a.walk.armR + 2 + a.armH;
        ctx.fillRect(a.rightArmX, hy, rArmW + 1, 2);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.rightArmX - 1, hy + 1, 1, 3);
        ctx.fillRect(a.rightArmX + Math.floor(rArmW / 2), hy + 1, 1, 3);
        ctx.fillRect(a.rightArmX + rArmW, hy + 1, 1, 3);
    }
    ctx.fillStyle = '#cc9988';
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        const hy = a.shoulderY + a.walk.armL + 2 + a.armH;
        ctx.fillRect(a.leftArmX, hy, rArmW + 1, 2);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.leftArmX - 1, hy + 1, 1, 3);
        ctx.fillRect(a.leftArmX + Math.floor(rArmW / 2), hy + 1, 1, 3);
        ctx.fillRect(a.leftArmX + rArmW, hy + 1, 1, 3);
    }
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

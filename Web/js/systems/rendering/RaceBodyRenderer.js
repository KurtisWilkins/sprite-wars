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


// ── Race 1: Bug man (Chibi Doodle) ─────────────────────────────────────────
function _drawBugman(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);

    // --- Back arms (thin chitinous) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }

    // --- Secondary smaller arms on torso (front view only) ---
    if (dir === DIR_DOWN) {
        const secW = armW - 2;
        const secH = armH - 4;
        const secY = torsoY + walk.bob + Math.floor(torsoH * 0.5);
        _drawOutlinedRect(ctx, leftArmX + 3, secY + Math.floor(walk.armL * 0.5), secW, secH, colors.mid, colors.outline);
        _drawOutlinedRect(ctx, rightArmX - 1, secY + Math.floor(walk.armR * 0.5), secW, secH, colors.mid, colors.outline);
    }

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);

    // --- Clawed feet (2px wider with prong tips) ---
    const clawW = legW + 2;
    ctx.fillStyle = colors.outline;
    ctx.fillRect(leftLegX - 1, legsTopY + walk.legL + legH - 1, clawW, 2);
    ctx.fillRect(leftLegX - 2, legsTopY + walk.legL + legH, 1, 2);
    ctx.fillRect(leftLegX + legW, legsTopY + walk.legL + legH, 1, 2);
    ctx.fillRect(rightLegX - 1, legsTopY + walk.legR + legH - 1, clawW, 2);
    ctx.fillRect(rightLegX - 2, legsTopY + walk.legR + legH, 1, 2);
    ctx.fillRect(rightLegX + legW, legsTopY + walk.legR + legH, 1, 2);

    // --- Segmented torso ---
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    // Two horizontal segment lines
    ctx.fillStyle = colors.outline;
    ctx.fillRect(torsoX + 2, torsoY + walk.bob + Math.floor(torsoH * 0.3), torsoW - 4, 1);
    ctx.fillRect(torsoX + 2, torsoY + walk.bob + Math.floor(torsoH * 0.6), torsoW - 4, 1);

    // --- Bug head (extra-wide +4px for compound eyes) ---
    const bugHeadW = headW + 4;
    const bugHeadX = Math.floor(cx - bugHeadW / 2);
    _drawRoundedRect(ctx, bugHeadX, headY, bugHeadW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, bugHeadX, headY, bugHeadW, headH, colors.mid);

    // --- Compound eyes (solid colored ovals with single white highlight) ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.2);
        if (dir === DIR_DOWN) {
            // Left compound eye
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 11, eyeY, 7, 7);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 10, eyeY + 1, 2, 2);
            // Right compound eye
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx + 5, eyeY, 7, 7);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx + 6, eyeY + 1, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 9;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY, 7, 7);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
        }
    }

    // --- Short antennae (2 simple stalks ~8px with bulb tips) ---
    ctx.fillStyle = colors.outline;
    if (dir !== DIR_UP) {
        ctx.fillRect(cx - 5, headY - 6, 1, 6);
        ctx.fillRect(cx + 5, headY - 6, 1, 6);
        // Bulb tips
        ctx.fillStyle = colors.eye;
        ctx.fillRect(cx - 6, headY - 8, 3, 3);
        ctx.fillRect(cx + 4, headY - 8, 3, 3);
    } else {
        ctx.fillRect(cx - 4, headY - 6, 1, 6);
        ctx.fillRect(cx + 4, headY - 6, 1, 6);
        ctx.fillStyle = colors.eye;
        ctx.fillRect(cx - 5, headY - 8, 3, 3);
        ctx.fillRect(cx + 3, headY - 8, 3, 3);
    }

    // --- Small mandibles (front/side only) ---
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#886633';
        ctx.fillRect(cx - 4, headY + headH - 1, 3, 3);
        ctx.fillRect(cx + 2, headY + headH - 1, 3, 3);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = '#886633';
        ctx.fillRect(bugHeadX - 2, headY + headH - 3, 3, 2);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = '#886633';
        ctx.fillRect(bugHeadX + bugHeadW, headY + headH - 3, 3, 2);
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }
}

// ── Race 2: Bear man (Chibi Doodle) ───────────────────────────────────────
function _drawBearman(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const bearTorsoW = torsoW + 2;
    const bearTorsoX = Math.floor(cx - bearTorsoW / 2);
    const bearArmW = armW + 1;

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, bearArmW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, bearArmW, armH, colors, 'left');
    }

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);

    // --- Bear paw feet (slightly wider shoes, +1px each side) ---
    const pawW = legW + 2;
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(leftLegX - 1, legsTopY + walk.legL + legH - 3, pawW, 3);
    ctx.fillRect(rightLegX - 1, legsTopY + walk.legR + legH - 3, pawW, 3);
    // Toe beans
    ctx.fillStyle = '#cc8899';
    ctx.fillRect(leftLegX, legsTopY + walk.legL + legH - 1, 2, 1);
    ctx.fillRect(leftLegX + 3, legsTopY + walk.legL + legH - 1, 2, 1);
    ctx.fillRect(rightLegX, legsTopY + walk.legR + legH - 1, 2, 1);
    ctx.fillRect(rightLegX + 3, legsTopY + walk.legR + legH - 1, 2, 1);

    // --- Stocky torso ---
    _drawRoundedRect(ctx, bearTorsoX, torsoY + walk.bob, bearTorsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, bearTorsoX, torsoY + walk.bob, bearTorsoW, torsoH, colors.mid);
    // Lighter belly patch
    ctx.fillStyle = '#ddc8a0';
    ctx.fillRect(cx - 4, torsoY + walk.bob + 2, 8, torsoH - 4);

    // --- Bear head ---
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    // --- Round bear ears (5x4 semi-circles) ---
    if (dir !== DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX - 2, headY - 3, 5, 4);
        if (dir !== DIR_UP) {
            ctx.fillStyle = '#dd8899';
            ctx.fillRect(headX - 1, headY - 2, 3, 2);
        }
    }
    if (dir !== DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX + headW - 3, headY - 3, 5, 4);
        if (dir !== DIR_UP) {
            ctx.fillStyle = '#dd8899';
            ctx.fillRect(headX + headW - 2, headY - 2, 3, 2);
        }
    }

    // --- Face ---
    if (dir !== DIR_UP) {
        // Standard _drawEyes with smaller spacing
        const eyeY = headY + Math.floor(headH * 0.3);
        _drawEyes(ctx, cx, eyeY, dir, colors, 4);

        // Small round nose (3x2 dark oval)
        const noseY = headY + Math.floor(headH * 0.55);
        ctx.fillStyle = '#111111';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 1, noseY, 3, 2);
        } else {
            const nx = dir === DIR_RIGHT ? cx + 3 : cx - 4;
            ctx.fillRect(nx, noseY, 3, 2);
        }

        // Mouth
        _drawMouth(ctx, cx, headY + headH - 5, dir, colors.outline);

        // Fluffy tufts: fur marks on cheeks
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.mid;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(headX + 1, headY + Math.floor(headH * 0.5), 2, 3);
            ctx.fillRect(headX + headW - 3, headY + Math.floor(headH * 0.5), 2, 3);
            ctx.globalAlpha = 1.0;
        }
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, bearArmW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, bearArmW, armH, colors, 'left');
    }
}

// ── Race 3: Bird man (Chibi Doodle) ───────────────────────────────────────
function _drawBirdman(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const beakColor = '#ddaa44';
    const beakDark = '#bb8833';

    // --- Back wing-arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
        // Feather lines at bottom
        ctx.fillStyle = colors.hair;
        ctx.fillRect(rightArmX, shoulderY + walk.armR + armH - 3, armW, 1);
        ctx.fillRect(rightArmX - 1, shoulderY + walk.armR + armH - 1, armW + 2, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
        ctx.fillStyle = colors.hair;
        ctx.fillRect(leftArmX, shoulderY + walk.armL + armH - 3, armW, 1);
        ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + armH - 1, armW + 2, 1);
    }

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);

    // --- Taloned feet (thin claws) ---
    ctx.fillStyle = beakColor;
    ctx.fillRect(leftLegX - 2, legsTopY + walk.legL + legH - 1, legW + 3, 2);
    ctx.fillRect(rightLegX - 2, legsTopY + walk.legR + legH - 1, legW + 3, 2);
    // Claw tips
    ctx.fillStyle = colors.outline;
    ctx.fillRect(leftLegX - 2, legsTopY + walk.legL + legH + 1, 1, 1);
    ctx.fillRect(leftLegX + legW + 1, legsTopY + walk.legL + legH + 1, 1, 1);
    ctx.fillRect(rightLegX - 2, legsTopY + walk.legR + legH + 1, 1, 1);
    ctx.fillRect(rightLegX + legW + 1, legsTopY + walk.legR + legH + 1, 1, 1);

    // --- Tail feathers (back/side view) ---
    if (dir === DIR_UP || dir === DIR_LEFT || dir === DIR_RIGHT) {
        const tailX = dir === DIR_UP ? cx - 4 : (dir === DIR_LEFT ? cx + 2 : cx - 6);
        const tailY = torsoY + torsoH - 1 + walk.bob;
        ctx.fillStyle = colors.hair;
        ctx.fillRect(tailX, tailY, 3, 4);
        ctx.fillRect(tailX + 3, tailY + 1, 3, 3);
        ctx.fillRect(tailX + 1, tailY + 4, 3, 2);
    }

    // --- Torso ---
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);

    // --- Head ---
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    // --- Head crest/plume (3-4 pointed feather shapes on top) ---
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 4, headY - 5, 3, 5);
    ctx.fillRect(cx - 1, headY - 8, 3, 8);
    ctx.fillRect(cx + 2, headY - 6, 3, 6);
    ctx.fillRect(cx + 4, headY - 4, 2, 4);
    // Tips
    ctx.fillStyle = colors.outline;
    ctx.fillRect(cx, headY - 9, 1, 2);
    ctx.fillRect(cx + 3, headY - 7, 1, 2);

    // --- Simple dot eyes (2x2, placed higher on head) ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.25);
        ctx.fillStyle = '#111111';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 5, eyeY, 2, 2);
            ctx.fillRect(cx + 4, eyeY, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 4;
            ctx.fillRect(ex, eyeY, 2, 2);
        }
    }

    // --- Small pointed beak (instead of mouth) ---
    if (dir === DIR_DOWN) {
        ctx.fillStyle = beakColor;
        ctx.fillRect(cx - 2, headY + Math.floor(headH * 0.55), 4, 3);
        ctx.fillRect(cx - 1, headY + Math.floor(headH * 0.55) + 3, 2, 2);
        ctx.fillStyle = beakDark;
        ctx.fillRect(cx - 2, headY + Math.floor(headH * 0.55) + 1, 4, 1);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = beakColor;
        ctx.fillRect(headX - 4, headY + Math.floor(headH * 0.4), 5, 3);
        ctx.fillStyle = beakDark;
        ctx.fillRect(headX - 4, headY + Math.floor(headH * 0.4) + 1, 5, 1);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = beakColor;
        ctx.fillRect(headX + headW, headY + Math.floor(headH * 0.4), 5, 3);
        ctx.fillStyle = beakDark;
        ctx.fillRect(headX + headW, headY + Math.floor(headH * 0.4) + 1, 5, 1);
    }

    // --- Front wing-arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
        ctx.fillStyle = colors.hair;
        ctx.fillRect(rightArmX, shoulderY + walk.armR + armH - 3, armW, 1);
        ctx.fillRect(rightArmX - 1, shoulderY + walk.armR + armH - 1, armW + 2, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
        ctx.fillStyle = colors.hair;
        ctx.fillRect(leftArmX, shoulderY + walk.armL + armH - 3, armW, 1);
        ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + armH - 1, armW + 2, 1);
    }
}

// ── Race 4: Demon (Chibi Doodle) ──────────────────────────────────────────
function _drawDemon(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const hornColor = '#554433';

    // --- Bat wings on back (back view: zigzag shapes ~12px wide) ---
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.outline;
        // Left wing
        ctx.fillRect(torsoX - 6, shoulderY - 2, 6, 6);
        ctx.fillRect(torsoX - 10, shoulderY - 4, 5, 5);
        ctx.fillRect(torsoX - 12, shoulderY - 2, 3, 3);
        // Wing membrane
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(torsoX - 9, shoulderY - 1, 5, 4);
        ctx.globalAlpha = 1.0;
        // Right wing
        ctx.fillStyle = colors.outline;
        ctx.fillRect(torsoX + torsoW, shoulderY - 2, 6, 6);
        ctx.fillRect(torsoX + torsoW + 5, shoulderY - 4, 5, 5);
        ctx.fillRect(torsoX + torsoW + 9, shoulderY - 2, 3, 3);
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(torsoX + torsoW + 4, shoulderY - 1, 5, 4);
        ctx.globalAlpha = 1.0;
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        // Folded wing hint on back side
        const wingX = dir === DIR_LEFT ? cx + Math.floor(torsoW / 2) : cx - Math.floor(torsoW / 2) - 5;
        ctx.fillStyle = colors.outline;
        ctx.fillRect(wingX, shoulderY - 1, 5, 5);
        ctx.fillRect(wingX + 1, shoulderY - 3, 3, 3);
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }

    // --- Pointed tail (side/back view, curving line ~10px) ---
    if (dir === DIR_LEFT || dir === DIR_RIGHT || dir === DIR_UP) {
        const ts = dir === DIR_LEFT ? 1 : -1;
        const tailBaseX = dir === DIR_UP ? cx + 3 : (dir === DIR_LEFT ? cx + Math.floor(torsoW / 2) : cx - Math.floor(torsoW / 2) - 2);
        const tailBaseY = torsoY + torsoH - 2 + walk.bob;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tailBaseX, tailBaseY, 2, 1);
        ctx.fillRect(tailBaseX + ts * 2, tailBaseY - 1, 2, 1);
        ctx.fillRect(tailBaseX + ts * 4, tailBaseY - 2, 2, 1);
        ctx.fillRect(tailBaseX + ts * 6, tailBaseY - 1, 2, 1);
        // Spade tip
        ctx.fillStyle = colors.outline;
        ctx.fillRect(tailBaseX + ts * 8, tailBaseY - 3, 3, 3);
    }

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);

    // --- Pointed shoes (+1px tip) ---
    _drawShoes(ctx, leftLegX, legsTopY + walk.legL + legH - 3, rightLegX, legsTopY + walk.legR + legH - 3, legW, colors);
    // Pointed tips
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(leftLegX - 2, legsTopY + walk.legL + legH - 2, 1, 2);
    ctx.fillRect(rightLegX - 2, legsTopY + walk.legR + legH - 2, 1, 2);

    // --- Torso (slightly darker shading) ---
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);

    // --- Head ---
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    // --- Small curved horns (2 horns, ~6px tall) ---
    ctx.fillStyle = hornColor;
    if (dir !== DIR_UP) {
        // Left horn
        ctx.fillRect(headX + 1, headY - 4, 3, 4);
        ctx.fillRect(headX, headY - 6, 2, 3);
        // Right horn
        ctx.fillRect(headX + headW - 4, headY - 4, 3, 4);
        ctx.fillRect(headX + headW - 2, headY - 6, 2, 3);
    } else {
        ctx.fillRect(headX + 1, headY - 4, 3, 4);
        ctx.fillRect(headX + headW - 4, headY - 4, 3, 4);
    }

    // --- Pointed ears (3px triangles sticking out from sides) ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.skin;
        if (dir !== DIR_RIGHT) {
            ctx.fillRect(headX - 3, headY + Math.floor(headH * 0.3), 3, 3);
            ctx.fillRect(headX - 4, headY + Math.floor(headH * 0.3) + 1, 1, 1);
        }
        if (dir !== DIR_LEFT) {
            ctx.fillRect(headX + headW, headY + Math.floor(headH * 0.3), 3, 3);
            ctx.fillRect(headX + headW + 3, headY + Math.floor(headH * 0.3) + 1, 1, 1);
        }
    }

    // --- Face: standard eyes with red/orange color, mouth ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.3);
        _drawEyes(ctx, cx, eyeY, dir, colors);
        _drawMouth(ctx, cx, headY + headH - 5, dir, colors.outline);
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }
}

// ── Race 5: Devil (chibi doodle style) ───────────────────────────────────────
function _drawDevil(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH, shoulderY,
        leftArmX, rightArmX, armW, armH, leftLegX, rightLegX, legW, legH,
        legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const hornColor = '#776655';

    // --- Spade-tipped tail (sides/back) ---
    if (dir === DIR_LEFT || dir === DIR_RIGHT || dir === DIR_UP) {
        const ts = (dir === DIR_LEFT || dir === DIR_UP) ? 1 : -1;
        const tbx = ts === 1 ? cx + Math.floor(torsoW / 2) : cx - Math.floor(torsoW / 2) - 2;
        const tby = torsoY + torsoH - 3 + walk.bob;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tbx, tby, 2, 2);
        ctx.fillRect(tbx + ts * 3, tby - 2, 2, 2);
        ctx.fillRect(tbx + ts * 6, tby - 3, 2, 2);
        ctx.fillRect(tbx + ts * 8, tby - 1, 2, 2);
        // Spade tip
        ctx.fillStyle = colors.outline;
        ctx.fillRect(tbx + ts * 9, tby - 2, 3, 3);
    }

    // --- Small bat wings ---
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(torsoX - 3, shoulderY, 4, 4);
        ctx.fillRect(torsoX + torsoW - 1, shoulderY, 4, 4);
        ctx.fillStyle = colors.mid;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(torsoX - 2, shoulderY + 1, 3, 2);
        ctx.fillRect(torsoX + torsoW, shoulderY + 1, 3, 2);
        ctx.globalAlpha = 1.0;
    } else if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(torsoX - 2, shoulderY, 3, 3);
        ctx.fillRect(torsoX + torsoW - 1, shoulderY, 3, 3);
    } else {
        const wX = dir === DIR_LEFT ? cx + Math.floor(torsoW / 2) : cx - Math.floor(torsoW / 2) - 4;
        ctx.fillStyle = colors.outline;
        ctx.fillRect(wX, shoulderY - 1, 4, 3);
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);

    // --- Shoes (slightly pointed) ---
    _drawShoes(ctx, leftLegX, legsTopY + walk.legL + legH - 3, rightLegX, legsTopY + walk.legR + legH - 3, legW, colors);

    // --- Torso ---
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    // Dark vest overlay
    const tunicR = Math.max(0, parseInt(colors.skin.slice(1, 3), 16) - 45);
    const tunicG = Math.max(0, parseInt(colors.skin.slice(3, 5), 16) - 45);
    const tunicB = Math.max(0, parseInt(colors.skin.slice(5, 7), 16) - 45);
    ctx.fillStyle = `rgb(${tunicR},${tunicG},${tunicB})`;
    ctx.fillRect(torsoX + 1, torsoY + walk.bob + 1, torsoW - 2, torsoH - 2);

    // --- Head ---
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    // --- Pointed ears ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX - 3, headY + Math.floor(headH * 0.35), 4, 3);
        ctx.fillRect(headX - 5, headY + Math.floor(headH * 0.4), 3, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX + headW - 1, headY + Math.floor(headH * 0.35), 4, 3);
        ctx.fillRect(headX + headW + 2, headY + Math.floor(headH * 0.4), 3, 2);
    }

    // --- Short pointy horns (~4px) ---
    ctx.fillStyle = hornColor;
    if (dir !== DIR_UP) {
        ctx.fillRect(headX + 2, headY - 1, 2, 2);
        ctx.fillRect(headX + 1, headY - 4, 2, 3);
        ctx.fillRect(headX + headW - 4, headY - 1, 2, 2);
        ctx.fillRect(headX + headW - 3, headY - 4, 2, 3);
    } else {
        ctx.fillRect(headX + 1, headY - 3, 2, 3);
        ctx.fillRect(headX + headW - 3, headY - 3, 2, 3);
    }

    // --- Face ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.3);
        _drawEyes(ctx, cx, eyeY, dir, colors);
        const mouthY = headY + Math.floor(headH * 0.7);
        _drawMouth(ctx, cx, mouthY, dir, colors.outline);

        // Forked tongue (tiny 2px detail below mouth, front view)
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#cc4444';
            ctx.fillRect(cx - 1, mouthY + 1, 1, 2);
            ctx.fillRect(cx, mouthY + 1, 1, 2);
            ctx.fillRect(cx - 2, mouthY + 2, 1, 1);
            ctx.fillRect(cx + 1, mouthY + 2, 1, 1);
        }

        _drawBlush(ctx, cx, headY + Math.floor(headH * 0.55), dir);
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }
}

// ── Race 6: Cat man (chibi doodle style) ─────────────────────────────────────
function _drawCatman(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH, shoulderY,
        leftArmX, rightArmX, armW, armH, leftLegX, rightLegX, legW, legH,
        legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);

    // --- Tail (sides/back) ---
    if (dir !== DIR_DOWN) {
        const ts = (dir === DIR_LEFT || dir === DIR_UP) ? 1 : -1;
        const tbx = ts === 1 ? cx + Math.floor(torsoW / 2) : cx - Math.floor(torsoW / 2) - 2;
        const tby = torsoY + torsoH - 3 + walk.bob;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(tbx, tby, 2, 2);
        ctx.fillRect(tbx + ts * 2, tby - 2, 2, 2);
        ctx.fillRect(tbx + ts * 4, tby - 5, 2, 3);
        ctx.fillRect(tbx + ts * 5, tby - 8, 2, 4);
        ctx.fillRect(tbx + ts * 4, tby - 10, 2, 3);
        ctx.fillRect(tbx + ts * 3, tby - 12, 2, 3);
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);

    // --- Shoes (cat paws) ---
    const catShoeYL = legsTopY + walk.legL + legH - 3;
    const catShoeYR = legsTopY + walk.legR + legH - 3;
    _drawShoes(ctx, leftLegX, catShoeYL, rightLegX, catShoeYR, legW, colors);
    // Paw pads on shoes
    ctx.fillStyle = '#ee88aa';
    ctx.fillRect(leftLegX + 1, catShoeYL + 1, 2, 2);
    ctx.fillRect(rightLegX + 1, catShoeYR + 1, 2, 2);

    // --- Torso ---
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    // Lighter belly
    if (dir !== DIR_UP) {
        const bellyR = Math.min(255, parseInt(colors.skin.slice(1, 3), 16) + 30);
        const bellyG = Math.min(255, parseInt(colors.skin.slice(3, 5), 16) + 30);
        const bellyB = Math.min(255, parseInt(colors.skin.slice(5, 7), 16) + 30);
        ctx.fillStyle = `rgb(${bellyR},${bellyG},${bellyB})`;
        ctx.fillRect(torsoX + 2, torsoY + walk.bob + 2, torsoW - 4, torsoH - 4);
    }

    // --- Head ---
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    // --- Triangular cat ears (~5px tall) ---
    if (dir !== DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX, headY - 2, 5, 3);
        ctx.fillRect(headX + 1, headY - 5, 3, 3);
        ctx.fillRect(headX + 2, headY - 7, 1, 2);
        // Inner ear pink
        if (dir !== DIR_UP) {
            ctx.fillStyle = '#ee88aa';
            ctx.fillRect(headX + 1, headY - 4, 2, 3);
        }
    }
    if (dir !== DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX + headW - 5, headY - 2, 5, 3);
        ctx.fillRect(headX + headW - 4, headY - 5, 3, 3);
        ctx.fillRect(headX + headW - 3, headY - 7, 1, 2);
        if (dir !== DIR_UP) {
            ctx.fillStyle = '#ee88aa';
            ctx.fillRect(headX + headW - 3, headY - 4, 2, 3);
        }
    }

    // --- Face ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.3);
        // Cat eyes: use _drawEyes then override pupil with vertical slit
        _drawEyes(ctx, cx, eyeY, dir, colors);
        // Vertical slit pupils (override the round 2x2 pupil)
        ctx.fillStyle = '#111111';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 5, eyeY + 1, 1, 3);
            ctx.fillRect(cx + 5, eyeY + 1, 1, 3);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 4;
            ctx.fillRect(ex, eyeY + 1, 1, 3);
        }

        // Small cat nose (tiny inverted triangle, 2x2)
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#ee6688';
            ctx.fillRect(cx - 1, headY + Math.floor(headH * 0.55), 2, 2);
        }

        // Cat "w" mouth
        if (dir === DIR_DOWN) {
            const mouthY = headY + Math.floor(headH * 0.7);
            ctx.fillStyle = '#111111';
            ctx.fillRect(cx - 2, mouthY, 1, 1);
            ctx.fillRect(cx - 1, mouthY + 1, 1, 1);
            ctx.fillRect(cx, mouthY, 1, 1);
            ctx.fillRect(cx + 1, mouthY + 1, 1, 1);
            ctx.fillRect(cx + 2, mouthY, 1, 1);
        } else {
            _drawMouth(ctx, cx, headY + Math.floor(headH * 0.7), dir, colors.outline);
        }

        // Whiskers (3 thin lines each cheek, front/side views)
        ctx.fillStyle = '#000000';
        const whiskerY = headY + Math.floor(headH * 0.55);
        if (dir === DIR_DOWN) {
            ctx.fillRect(headX - 4, whiskerY - 1, 5, 1);
            ctx.fillRect(headX - 5, whiskerY + 1, 6, 1);
            ctx.fillRect(headX - 4, whiskerY + 3, 5, 1);
            ctx.fillRect(headX + headW, whiskerY - 1, 5, 1);
            ctx.fillRect(headX + headW, whiskerY + 1, 6, 1);
            ctx.fillRect(headX + headW, whiskerY + 3, 5, 1);
        } else if (dir === DIR_LEFT) {
            ctx.fillRect(headX - 5, whiskerY - 1, 6, 1);
            ctx.fillRect(headX - 6, whiskerY + 1, 7, 1);
            ctx.fillRect(headX - 5, whiskerY + 3, 6, 1);
        } else {
            ctx.fillRect(headX + headW, whiskerY - 1, 6, 1);
            ctx.fillRect(headX + headW, whiskerY + 1, 7, 1);
            ctx.fillRect(headX + headW, whiskerY + 3, 6, 1);
        }

        _drawBlush(ctx, cx, headY + Math.floor(headH * 0.55), dir, 7);
    }

    // --- Paw-like hands (pink circles at arm ends) ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#ee88aa';
        ctx.fillRect(leftArmX + 1, shoulderY + walk.armL + armH, 2, 2);
        ctx.fillRect(rightArmX + 1, shoulderY + walk.armR + armH, 2, 2);
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }
}

// ── Race 7: Elf (chibi doodle style) ─────────────────────────────────────────
function _drawElf(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH, shoulderY,
        leftArmX, rightArmX, armW, armH, leftLegX, rightLegX, legW, legH,
        legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const goldTrim = '#ccaa44';
    const gemColor = '#44ddff';

    // --- Back hair (visible from behind) ---
    if (dir === DIR_UP) {
        _drawHairBack(ctx, headX, headY, headW, headH + Math.floor(torsoH * 0.5), colors);
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);

    // --- Shoes ---
    _drawShoes(ctx, leftLegX, legsTopY + walk.legL + legH - 3, rightLegX, legsTopY + walk.legR + legH - 3, legW, colors);

    // --- Torso ---
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    // Leaf pattern decorations on torso (nature motif)
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#88aa66';
        ctx.fillRect(torsoX + 2, torsoY + walk.bob + 3, 2, 3);
        ctx.fillRect(torsoX + torsoW - 4, torsoY + walk.bob + 5, 3, 2);
    }

    // --- Head ---
    _drawRoundedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY, headW, headH, colors.mid);

    // --- Pointed ears (~6px long, 2px wide) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX - 3, headY + Math.floor(headH * 0.3), 4, 2);
        ctx.fillRect(headX - 6, headY + Math.floor(headH * 0.35), 4, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(headX + headW - 1, headY + Math.floor(headH * 0.3), 4, 2);
        ctx.fillRect(headX + headW + 2, headY + Math.floor(headH * 0.35), 4, 2);
    }

    // --- Long flowing hair ---
    _drawHairTop(ctx, headX, headY, headW, dir, colors.hair);
    // Side locks (longer than normal)
    ctx.fillStyle = colors.hair;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(headX - 3, headY + 3, 3, headH + Math.floor(torsoH * 0.3));
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(headX + headW, headY + 3, 3, headH + Math.floor(torsoH * 0.3));
    }

    // --- Circlet/tiara on forehead ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = goldTrim;
        ctx.fillRect(headX + 3, headY + 2, headW - 6, 1);
        // Center gem
        ctx.fillStyle = gemColor;
        ctx.fillRect(cx - 1, headY + 1, 2, 2);
    }

    // --- Face ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.3);
        _drawEyes(ctx, cx, eyeY, dir, colors, 6);
        _drawMouth(ctx, cx, headY + Math.floor(headH * 0.7), dir, colors.outline);
        _drawBlush(ctx, cx, headY + Math.floor(headH * 0.55), dir);
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }
}

// ── Race 8: Ent (chibi doodle style) ─────────────────────────────────────────
function _drawEnt(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH, shoulderY,
        leftArmX, rightArmX, armW, armH, leftLegX, rightLegX, legW, legH,
        legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const barkColor = '#5a4030';
    const barkLight = '#7a6050';
    const barkDark = '#3a2820';
    const leafColor = '#449933';
    const leafDark = '#337722';
    const leafBright = '#66bb44';
    const mossColor = '#668844';

    // --- Back branch arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, rightArmX, shoulderY + walk.armR, armW, armH, barkColor, barkDark);
        _drawSoftShading(ctx, rightArmX, shoulderY + walk.armR, armW, armH, barkLight);
        // Twig extensions
        ctx.fillStyle = barkColor;
        ctx.fillRect(rightArmX - 1, shoulderY + walk.armR + armH, 2, 3);
        ctx.fillRect(rightArmX + armW - 1, shoulderY + walk.armR + armH, 2, 2);
        ctx.fillStyle = leafColor;
        ctx.fillRect(rightArmX - 1, shoulderY + walk.armR + armH + 2, 3, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, leftArmX, shoulderY + walk.armL, armW, armH, barkColor, barkDark);
        _drawSoftShading(ctx, leftArmX, shoulderY + walk.armL, armW, armH, barkLight);
        ctx.fillStyle = barkColor;
        ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + armH, 2, 3);
        ctx.fillRect(leftArmX + armW - 1, shoulderY + walk.armL + armH, 2, 2);
        ctx.fillStyle = leafColor;
        ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + armH + 2, 3, 2);
    }

    // --- Legs (trunk-like) ---
    _drawRoundedRect(ctx, leftLegX, legsTopY + walk.legL, legW, legH, barkColor, barkDark);
    _drawSoftShading(ctx, leftLegX, legsTopY + walk.legL, legW, legH, barkLight);
    _drawRoundedRect(ctx, rightLegX, legsTopY + walk.legR, legW, legH, barkColor, barkDark);
    _drawSoftShading(ctx, rightLegX, legsTopY + walk.legR, legW, legH, barkLight);

    // --- Root-like feet (wider, brown) ---
    const entFootYL = legsTopY + walk.legL + legH - 3;
    const entFootYR = legsTopY + walk.legR + legH - 3;
    ctx.fillStyle = barkDark;
    ctx.fillRect(leftLegX - 2, entFootYL, legW + 4, 3);
    ctx.fillRect(rightLegX - 2, entFootYR, legW + 4, 3);
    ctx.fillStyle = '#221810';
    ctx.fillRect(leftLegX - 2, entFootYL + 2, legW + 4, 1);
    ctx.fillRect(rightLegX - 2, entFootYR + 2, legW + 4, 1);

    // --- Wider torso (trunk) ---
    const entTorsoW = torsoW + 2;
    const entTorsoX = Math.floor(cx - entTorsoW / 2);
    _drawRoundedRect(ctx, entTorsoX, torsoY + walk.bob, entTorsoW, torsoH, barkColor, barkDark);
    _drawSoftShading(ctx, entTorsoX, torsoY + walk.bob, entTorsoW, torsoH, barkLight);
    // Bark texture lines (3-4 horizontal)
    ctx.fillStyle = barkDark;
    ctx.fillRect(entTorsoX + 2, torsoY + walk.bob + Math.floor(torsoH * 0.2), entTorsoW - 4, 1);
    ctx.fillRect(entTorsoX + 3, torsoY + walk.bob + Math.floor(torsoH * 0.45), entTorsoW - 6, 1);
    ctx.fillRect(entTorsoX + 2, torsoY + walk.bob + Math.floor(torsoH * 0.7), entTorsoW - 4, 1);
    // Moss/leaf patches on body
    ctx.fillStyle = mossColor;
    ctx.fillRect(entTorsoX + 1, torsoY + walk.bob + Math.floor(torsoH * 0.55), 3, 2);
    ctx.fillStyle = leafColor;
    ctx.fillRect(entTorsoX + entTorsoW - 4, torsoY + walk.bob + Math.floor(torsoH * 0.3), 2, 2);

    // --- Head (wooden) ---
    _drawRoundedRect(ctx, headX, headY, headW, headH, barkColor, barkDark);
    _drawSoftShading(ctx, headX, headY, headW, headH, barkLight);

    // --- Leaf crown (instead of hair) ---
    ctx.fillStyle = leafColor;
    ctx.fillRect(headX - 3, headY - 2, headW + 6, 5);
    ctx.fillRect(headX - 1, headY - 5, headW + 2, 4);
    ctx.fillRect(headX + 2, headY - 7, headW - 4, 3);
    // Leaf depth
    ctx.fillStyle = leafDark;
    ctx.fillRect(headX + 1, headY - 4, 3, 2);
    ctx.fillRect(headX + headW - 4, headY - 3, 3, 2);
    // Bright highlights
    ctx.fillStyle = leafBright;
    ctx.fillRect(headX + 4, headY - 2, 2, 2);
    ctx.fillRect(headX + headW - 3, headY - 5, 2, 2);

    // --- Face (simple dot eyes, no mouth) ---
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.35);
        // Simple 3x3 dark circle eyes (no anime eyes for tree)
        ctx.fillStyle = '#222211';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 6, eyeY, 3, 3);
            ctx.fillRect(cx + 4, eyeY, 3, 3);
            // Tiny glow highlight
            ctx.fillStyle = '#88ff44';
            ctx.fillRect(cx - 5, eyeY + 1, 1, 1);
            ctx.fillRect(cx + 5, eyeY + 1, 1, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 5;
            ctx.fillRect(ex, eyeY, 3, 3);
            ctx.fillStyle = '#88ff44';
            ctx.fillRect(ex + 1, eyeY + 1, 1, 1);
        }
        // No mouth drawn (tree face)
    }

    // --- Front branch arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, rightArmX, shoulderY + walk.armR, armW, armH, barkColor, barkDark);
        _drawSoftShading(ctx, rightArmX, shoulderY + walk.armR, armW, armH, barkLight);
        ctx.fillStyle = barkColor;
        ctx.fillRect(rightArmX - 1, shoulderY + walk.armR + armH, 2, 3);
        ctx.fillRect(rightArmX + armW - 1, shoulderY + walk.armR + armH, 2, 2);
        ctx.fillStyle = leafColor;
        ctx.fillRect(rightArmX - 1, shoulderY + walk.armR + armH + 2, 3, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, leftArmX, shoulderY + walk.armL, armW, armH, barkColor, barkDark);
        _drawSoftShading(ctx, leftArmX, shoulderY + walk.armL, armW, armH, barkLight);
        ctx.fillStyle = barkColor;
        ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + armH, 2, 3);
        ctx.fillRect(leftArmX + armW - 1, shoulderY + walk.armL + armH, 2, 2);
        ctx.fillStyle = leafColor;
        ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + armH + 2, 3, 2);
    }
}

// ── Race 9: Fishman (chibi doodle) ──────────────────────────────────────────
function _drawFishman(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const scaleLight = colors.mid;

    // --- Tail fin (back/side views) ---
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(cx - 3, torsoY + walk.bob + torsoH - 2, 6, 4);
        ctx.fillRect(cx - 5, torsoY + walk.bob + torsoH + 2, 4, 3);
        ctx.fillRect(cx + 1, torsoY + walk.bob + torsoH + 2, 4, 3);
        ctx.fillStyle = scaleLight;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(cx - 2, torsoY + walk.bob + torsoH, 4, 3);
        ctx.globalAlpha = 1.0;
    }

    // --- Back arms ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }

    // --- Legs ---
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);

    // --- Webbed feet (wider shoes +2px each side with webbing lines) ---
    const shoeW = legW + 4;
    const lShoeX = leftLegX - 2;
    const rShoeX = rightLegX - 2;
    const lShoeY = Math.floor(legsTopY + walk.legL + legH - 3);
    const rShoeY = Math.floor(legsTopY + walk.legR + legH - 3);
    ctx.fillStyle = colors.skin;
    ctx.fillRect(lShoeX, lShoeY, shoeW, 3);
    ctx.fillRect(rShoeX, rShoeY, shoeW, 3);
    // Webbing lines
    ctx.fillStyle = colors.outline;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(lShoeX + 2, lShoeY + 1, 1, 2);
    ctx.fillRect(lShoeX + shoeW - 3, lShoeY + 1, 1, 2);
    ctx.fillRect(rShoeX + 2, rShoeY + 1, 1, 2);
    ctx.fillRect(rShoeX + shoeW - 3, rShoeY + 1, 1, 2);
    ctx.globalAlpha = 1.0;

    // --- Torso ---
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, scaleLight);
    // Lighter underbelly
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#aabbcc';
        ctx.globalAlpha = 0.4;
        ctx.fillRect(Math.floor(torsoX + torsoW * 0.25), torsoY + walk.bob + 1, Math.floor(torsoW * 0.5), torsoH - 2);
        ctx.globalAlpha = 1.0;
    }
    // Scale V-shapes on torso (decorative)
    ctx.fillStyle = scaleLight;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(torsoX + 3, torsoY + walk.bob + 2, 2, 1);
    ctx.fillRect(torsoX + 4, torsoY + walk.bob + 3, 2, 1);
    ctx.fillRect(torsoX + torsoW - 6, torsoY + walk.bob + 5, 2, 1);
    ctx.fillRect(torsoX + torsoW - 5, torsoY + walk.bob + 6, 2, 1);
    ctx.globalAlpha = 1.0;

    // --- Fish head (wider +2px) ---
    const fishHeadW = headW + 2;
    const fishHeadX = Math.floor(cx - fishHeadW / 2);
    if (dir === DIR_UP) _drawHairBack(ctx, fishHeadX, headY, fishHeadW, headH, colors);
    _drawRoundedRect(ctx, fishHeadX, headY, fishHeadW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, fishHeadX, headY, fishHeadW, headH, scaleLight);

    // --- Dorsal fin on top (~6px tall, semi-transparent) ---
    ctx.fillStyle = colors.hair;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(cx - 1, headY - 6, 3, 6);
    ctx.fillRect(cx - 2, headY - 4, 5, 4);
    ctx.fillRect(cx, headY - 8, 2, 3);
    ctx.globalAlpha = 1.0;
    // Fin spine
    ctx.fillStyle = colors.outline;
    ctx.fillRect(cx, headY - 8, 1, 8);

    // --- Face (front/side only) ---
    if (dir !== DIR_UP) {
        // Fish eyes with wider spacing
        const eyeY = Math.floor(headY + headH * 0.3);
        _drawEyes(ctx, cx, eyeY, dir, colors, 7);

        // Small gill lines on cheeks (2 thin lines each side)
        ctx.fillStyle = '#cc6666';
        if (dir === DIR_DOWN || dir === DIR_LEFT) {
            ctx.fillRect(fishHeadX + 1, Math.floor(headY + headH * 0.5), 2, 1);
            ctx.fillRect(fishHeadX + 1, Math.floor(headY + headH * 0.5) + 2, 2, 1);
        }
        if (dir === DIR_DOWN || dir === DIR_RIGHT) {
            ctx.fillRect(fishHeadX + fishHeadW - 3, Math.floor(headY + headH * 0.5), 2, 1);
            ctx.fillRect(fishHeadX + fishHeadW - 3, Math.floor(headY + headH * 0.5) + 2, 2, 1);
        }

        // Small O-shaped fish mouth (3x3 circle outline)
        if (dir === DIR_DOWN) {
            const mouthY = Math.floor(headY + headH * 0.7);
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 1, mouthY, 3, 1);
            ctx.fillRect(cx - 1, mouthY + 2, 3, 1);
            ctx.fillRect(cx - 2, mouthY + 1, 1, 1);
            ctx.fillRect(cx + 2, mouthY + 1, 1, 1);
        }
    }

    // --- Fin-like webbing at bottom of arms (2px extensions) ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.skin;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(leftArmX - 1, shoulderY + walk.armL + armH - 3, armW + 2, 2);
        ctx.fillRect(rightArmX - 1, shoulderY + walk.armR + armH - 3, armW + 2, 2);
        ctx.globalAlpha = 1.0;
    }

    // --- Front arms ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, armW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, armW, armH, colors, 'left');
    }
}

// ── Race 10: Ghost (chibi doodle) ──────────────────────────────────────────
function _drawGhost(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);

    // Floating offset (shifted up ~3px)
    const floatY = -3;

    // Ethereal glow around head (faint white outline, 0.3 alpha)
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(headX - 1, headY + floatY - 1, headW + 2, headH + 2);
    ctx.globalAlpha = 1.0;

    // Semi-transparent body
    ctx.save();
    ctx.globalAlpha = 0.7;

    // --- Back arms (wispy, no hands) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, rightArmX, shoulderY + walk.armR + floatY, armW, armH - 2, colors.skin, colors.outline);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(rightArmX + 1, shoulderY + walk.armR + floatY + armH - 3, armW - 2, 3);
        ctx.globalAlpha = 0.7;
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, leftArmX, shoulderY + walk.armL + floatY, armW, armH - 2, colors.skin, colors.outline);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(leftArmX + 1, shoulderY + walk.armL + floatY + armH - 3, armW - 2, 3);
        ctx.globalAlpha = 0.7;
    }

    // --- Ghost tail (wavy shape replacing legs, NO legs/shoes) ---
    ctx.fillStyle = colors.skin;
    const tailTop = legsTopY;
    ctx.fillRect(cx - 7, tailTop, 14, 3);
    ctx.fillRect(cx - 5, tailTop + 3, 10, 2);
    ctx.fillRect(cx - 4, tailTop + 5, 8, 2);
    // Tattered tendrils
    ctx.fillRect(cx - 5, tailTop + 7, 3, 3);
    ctx.fillRect(cx - 1, tailTop + 7, 3, 4);
    ctx.fillRect(cx + 3, tailTop + 7, 3, 3);
    // Fading wispy edges
    ctx.globalAlpha = 0.3;
    ctx.fillRect(cx - 6, tailTop + 9, 2, 2);
    ctx.fillRect(cx + 5, tailTop + 9, 2, 2);
    ctx.fillRect(cx, tailTop + 10, 1, 2);
    ctx.globalAlpha = 0.7;

    // --- Torso ---
    _drawRoundedRect(ctx, torsoX, torsoY + walk.bob + floatY, torsoW, torsoH, colors.skin, colors.outline);
    _drawSoftShading(ctx, torsoX, torsoY + walk.bob + floatY, torsoW, torsoH, colors.mid);

    // --- Head ---
    _drawRoundedRect(ctx, headX, headY + floatY, headW, headH, colors.skin, colors.outline);
    _drawSoftShading(ctx, headX, headY + floatY, headW, headH, colors.mid);

    ctx.restore(); // Restore globalAlpha

    // --- Hollow eye sockets with glowing dot (always solid, not transparent) ---
    if (dir !== DIR_UP) {
        const eyeY = Math.floor(headY + headH * 0.25) + floatY;
        if (dir === DIR_DOWN) {
            // Dark hollow sockets (4x4)
            ctx.fillStyle = '#050510';
            ctx.fillRect(cx - 7, eyeY, 4, 4);
            ctx.fillRect(cx + 3, eyeY, 4, 4);
            // Glowing dot inside (1x1 white)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 6, eyeY + 1, 1, 1);
            ctx.fillRect(cx + 4, eyeY + 1, 1, 1);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 6;
            ctx.fillStyle = '#050510';
            ctx.fillRect(ex, eyeY, 4, 4);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ex + 1, eyeY + 1, 1, 1);
        }

        // Open mouth: small oval (3x4 dark shape)
        if (dir === DIR_DOWN) {
            const mouthY = Math.floor(headY + headH * 0.65) + floatY;
            ctx.fillStyle = '#050510';
            ctx.fillRect(cx - 1, mouthY, 3, 4);
            ctx.fillRect(cx - 2, mouthY + 1, 1, 2);
            ctx.fillRect(cx + 2, mouthY + 1, 1, 2);
        }
    }

    // --- Ethereal highlight sparkles ---
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(headX + 4, headY + floatY + 2, 2, 2);
    ctx.fillRect(headX + headW - 5, headY + floatY + 4, 2, 1);
    ctx.fillRect(torsoX + torsoW - 4, torsoY + walk.bob + floatY + 2, 1, 1);

    // --- Front arms (wispy, fading tips) ---
    ctx.save();
    ctx.globalAlpha = 0.7;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, rightArmX, shoulderY + walk.armR + floatY, armW, armH - 2, colors.skin, colors.outline);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(rightArmX + 1, shoulderY + walk.armR + floatY + armH - 3, armW - 2, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.globalAlpha = 0.7;
        _drawRoundedRect(ctx, leftArmX, shoulderY + walk.armL + floatY, armW, armH - 2, colors.skin, colors.outline);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = colors.skin;
        ctx.fillRect(leftArmX + 1, shoulderY + walk.armL + floatY + armH - 3, armW - 2, 3);
    }
    ctx.restore();
}

// ── Race 11: Golem (chibi doodle) ──────────────────────────────────────────
function _drawGolem(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);
    const stoneColor = colors.skin;
    const stoneDark = colors.outline;
    const stoneMid = colors.mid;
    const gemColor = colors.eye || '#77aadd';

    // Wider dimensions for bulky stone look
    const golemHeadW = headW + 4;
    const golemHeadX = Math.floor(cx - golemHeadW / 2);
    const golemTorsoW = torsoW + 4;
    const golemTorsoX = Math.floor(cx - golemTorsoW / 2);
    const golemArmW = armW + 2;
    const golemLegW = legW + 2;
    const golemLegLX = Math.floor(leftLegX - 1);
    const golemLegRX = Math.floor(rightLegX - 1);

    // --- Back arms (thick) ---
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, rightArmX, shoulderY + walk.armR, golemArmW, armH, stoneColor, stoneDark);
        _drawSoftShading(ctx, rightArmX, shoulderY + walk.armR, golemArmW, armH, stoneMid);
        // Joint line
        ctx.fillStyle = stoneDark;
        ctx.fillRect(rightArmX + 1, shoulderY + walk.armR, golemArmW - 2, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, leftArmX, shoulderY + walk.armL, golemArmW, armH, stoneColor, stoneDark);
        _drawSoftShading(ctx, leftArmX, shoulderY + walk.armL, golemArmW, armH, stoneMid);
        ctx.fillStyle = stoneDark;
        ctx.fillRect(leftArmX + 1, shoulderY + walk.armL, golemArmW - 2, 1);
    }

    // --- Thick legs ---
    _drawRoundedRect(ctx, golemLegLX, legsTopY + walk.legL, golemLegW, legH, stoneColor, stoneDark);
    _drawSoftShading(ctx, golemLegLX, legsTopY + walk.legL, golemLegW, legH, stoneMid);
    _drawRoundedRect(ctx, golemLegRX, legsTopY + walk.legR, golemLegW, legH, stoneColor, stoneDark);
    _drawSoftShading(ctx, golemLegRX, legsTopY + walk.legR, golemLegW, legH, stoneMid);

    // --- Rocky/angular shoes (blocky, wider +2px) ---
    const shoeW = golemLegW + 2;
    ctx.fillStyle = stoneDark;
    ctx.fillRect(golemLegLX - 1, legsTopY + walk.legL + legH - 3, shoeW, 4);
    ctx.fillRect(golemLegRX - 1, legsTopY + walk.legR + legH - 3, shoeW, 4);
    ctx.fillStyle = stoneMid;
    ctx.fillRect(golemLegLX, legsTopY + walk.legL + legH - 3, shoeW - 2, 1);
    ctx.fillRect(golemLegRX, legsTopY + walk.legR + legH - 3, shoeW - 2, 1);

    // --- Wide torso ---
    _drawRoundedRect(ctx, golemTorsoX, torsoY + walk.bob, golemTorsoW, torsoH, stoneColor, stoneDark);
    _drawSoftShading(ctx, golemTorsoX, torsoY + walk.bob, golemTorsoW, torsoH, stoneMid);
    // Crack lines on torso (2-3 lines)
    ctx.fillStyle = stoneDark;
    ctx.fillRect(golemTorsoX + 2, torsoY + walk.bob + 3, 4, 1);
    ctx.fillRect(golemTorsoX + 5, torsoY + walk.bob + 3, 1, 3);
    ctx.fillRect(golemTorsoX + golemTorsoW - 6, torsoY + walk.bob + 6, 4, 1);

    // --- Crystal/gem embedded in chest (3x3 diamond shape) ---
    if (dir !== DIR_UP) {
        ctx.fillStyle = gemColor;
        ctx.fillRect(cx - 1, torsoY + walk.bob + 2, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(cx, torsoY + walk.bob + 2, 1, 1);
        ctx.globalAlpha = 1.0;
    }

    // --- Wide head (no hair, no mouth) ---
    _drawRoundedRect(ctx, golemHeadX, headY, golemHeadW, headH, stoneColor, stoneDark);
    _drawSoftShading(ctx, golemHeadX, headY, golemHeadW, headH, stoneMid);
    // Crack lines on head
    ctx.fillStyle = stoneDark;
    ctx.fillRect(golemHeadX + golemHeadW - 5, headY + 4, 1, 6);
    ctx.fillRect(golemHeadX + 3, headY + headH - 4, 3, 1);

    // --- Simple glowing dot eyes (3x3 colored squares, no anime eyes) ---
    if (dir !== DIR_UP) {
        const eyeY = Math.floor(headY + headH * 0.35);
        ctx.fillStyle = gemColor;
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 6, eyeY, 3, 3);
            ctx.fillRect(cx + 4, eyeY, 3, 3);
            // Glow
            ctx.globalAlpha = 0.3;
            ctx.fillRect(cx - 7, eyeY - 1, 5, 5);
            ctx.fillRect(cx + 3, eyeY - 1, 5, 5);
            ctx.globalAlpha = 1.0;
        } else {
            const ex = dir === DIR_RIGHT ? cx + 3 : cx - 5;
            ctx.fillRect(ex, eyeY, 3, 3);
            ctx.globalAlpha = 0.3;
            ctx.fillRect(ex - 1, eyeY - 1, 5, 5);
            ctx.globalAlpha = 1.0;
        }
    }

    // --- Front arms (thick) ---
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawRoundedRect(ctx, rightArmX, shoulderY + walk.armR, golemArmW, armH, stoneColor, stoneDark);
        _drawSoftShading(ctx, rightArmX, shoulderY + walk.armR, golemArmW, armH, stoneMid);
        ctx.fillStyle = stoneDark;
        ctx.fillRect(rightArmX + 1, shoulderY + walk.armR, golemArmW - 2, 1);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawRoundedRect(ctx, leftArmX, shoulderY + walk.armL, golemArmW, armH, stoneColor, stoneDark);
        _drawSoftShading(ctx, leftArmX, shoulderY + walk.armL, golemArmW, armH, stoneMid);
        ctx.fillStyle = stoneDark;
        ctx.fillRect(leftArmX + 1, shoulderY + walk.armL, golemArmW - 2, 1);
    }
}

// ── Race 12: Human (chibi doodle) ──────────────────────────────────────────
function _drawHuman(ctx, a, dir, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = a;
    const cx = Math.floor(torsoX + torsoW / 2);

    // Human is the most standard race — use generic body with tunic
    _drawGenericBody(ctx, a, dir, colors, true);

    // --- Belt detail (1px dark line at bottom of torso) ---
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(torsoX + 1, torsoY + walk.bob + torsoH - 3, torsoW - 2, 1);
    // Belt buckle
    if (dir !== DIR_UP) {
        ctx.fillStyle = '#ccaa33';
        ctx.fillRect(cx - 1, torsoY + walk.bob + torsoH - 3, 2, 1);
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

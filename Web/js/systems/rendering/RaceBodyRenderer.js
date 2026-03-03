/**
 * RaceBodyRenderer.js — Race-specific humanoid body rendering (Races 1-12).
 * Each race has a unique body shape, head features, and distinguishing characteristics
 * drawn at 64×64 pixel resolution.
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

// Walk animation cycles (4 frames)
const WALK_CYCLES = [
    { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0  },
    { armL: -3, armR: 3,  legL: 5,  legR: -3, bob: -1 },
    { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0  },
    { armL: 3,  armR: -3, legL: -3, legR: 5,  bob: -1 },
];

// ── Shared Helpers ──────────────────────────────────────────────────────────

function _drawOutlinedRect(ctx, x, y, w, h, fillColor, outlineColor) {
    ctx.fillStyle = outlineColor;
    ctx.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, w + 2, h + 2);
    ctx.fillStyle = fillColor;
    ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

function _drawShading(ctx, x, y, w, h, midColor) {
    ctx.fillStyle = midColor;
    ctx.fillRect(Math.floor(x) + Math.floor(w * 0.55), Math.floor(y), Math.ceil(w * 0.45), h);
}

function _drawEyes(ctx, cx, eyeY, dir, colors, spacing) {
    const sp = spacing || 5;
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - sp - 2, eyeY, 5, 4);
        ctx.fillRect(cx + sp - 2, eyeY, 5, 4);
        ctx.fillStyle = colors.eye;
        ctx.fillRect(cx - sp - 1, eyeY, 3, 4);
        ctx.fillRect(cx + sp - 1, eyeY, 3, 4);
        ctx.fillStyle = '#111';
        ctx.fillRect(cx - sp, eyeY + 2, 2, 2);
        ctx.fillRect(cx + sp, eyeY + 2, 2, 2);
    } else if (dir === DIR_LEFT || dir === DIR_RIGHT) {
        const ex = dir === DIR_RIGHT ? cx + 2 : cx - 4;
        ctx.fillStyle = '#fff';
        ctx.fillRect(ex - 1, eyeY, 5, 4);
        ctx.fillStyle = colors.eye;
        ctx.fillRect(ex, eyeY, 3, 4);
        ctx.fillStyle = '#111';
        ctx.fillRect(ex + 1, eyeY + 2, 2, 2);
    }
}

function _drawMouth(ctx, cx, y, dir, outlineColor) {
    if (dir === DIR_DOWN) {
        ctx.fillStyle = outlineColor;
        ctx.fillRect(cx - 2, y, 4, 1);
    }
}

function _drawHairTop(ctx, x, y, w, dir, hairColor) {
    if (dir !== DIR_UP) {
        ctx.fillStyle = hairColor;
        ctx.fillRect(x - 1, y - 2, w + 2, 5);
        if (dir === DIR_DOWN || dir === DIR_LEFT) {
            ctx.fillRect(x - 2, y + 1, 3, 5);
        }
        if (dir === DIR_DOWN || dir === DIR_RIGHT) {
            ctx.fillRect(x + w - 1, y + 1, 3, 5);
        }
    }
}

function _drawHairBack(ctx, x, y, w, h, colors) {
    ctx.fillStyle = colors.hair;
    ctx.fillRect(x - 1, y, w + 2, h - 2);
    ctx.fillStyle = colors.outline;
    ctx.fillRect(x - 1, y - 1, w + 2, 2);
    ctx.fillRect(x - 2, y, 2, h - 3);
    ctx.fillRect(x + w, y, 2, h - 3);
}

function _drawLeg(ctx, x, y, w, h, colors) {
    _drawOutlinedRect(ctx, x, y, w, h, colors.skin, colors.outline);
    _drawShading(ctx, x, y, w, h, colors.mid);
}

function _drawArm(ctx, x, y, w, h, colors, side) {
    _drawOutlinedRect(ctx, x, y, w, h, colors.skin, colors.outline);
    if (side === 'right') _drawShading(ctx, x, y, w, h, colors.mid);
}

function _drawShoes(ctx, lx, ly, rx, ry, legW, colors) {
    ctx.fillStyle = '#553322';
    ctx.fillRect(lx - 1, ly, legW + 3, 4);
    ctx.fillRect(rx - 1, ry, legW + 3, 4);
}

function _drawTunic(ctx, x, y, w, h, skinColor) {
    const r = parseInt(skinColor.slice(1, 3), 16) - 30;
    const g = parseInt(skinColor.slice(3, 5), 16) - 30;
    const b = parseInt(skinColor.slice(5, 7), 16) - 30;
    ctx.fillStyle = `rgb(${Math.max(0, r)},${Math.max(0, g)},${Math.max(0, b)})`;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 2);
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

    const feetY = groundY;
    const legsTopY = feetY - legH;
    const torsoTopY = legsTopY - torsoH + 2;
    const headTopY = torsoTopY - headH + 3 + walk.bob;
    const shoulderY = torsoTopY + 3 + walk.bob;

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

    // Legs
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW, legH, colors);
    _drawShoes(ctx, leftLegX, legsTopY + walk.legL + legH - 3, rightLegX, legsTopY + walk.legR + legH - 3, legW, colors);

    // Torso
    _drawOutlinedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    if (hasTunic) _drawTunic(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin);

    // Head (back hair when facing up)
    if (dir === DIR_UP) _drawHairBack(ctx, headX, headY, headW, headH, colors);

    // Head shape
    _drawOutlinedRect(ctx, headX, headY, headW, headH, colors.skin, colors.outline);
    _drawShading(ctx, headX, headY, headW, headH, colors.mid);

    // Face
    const eyeY = headY + Math.floor(headH * 0.35);
    _drawEyes(ctx, cx, eyeY, dir, colors);
    _drawMouth(ctx, cx, headY + headH - 4, dir, colors.outline);
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

    // Back arms (thinner)
    const bugArmW = armW - 1;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, bugArmW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, bugArmW, armH, colors, 'left');
    }

    // Thin jointed legs
    _drawLeg(ctx, leftLegX, legsTopY + walk.legL, legW - 1, legH, colors);
    _drawLeg(ctx, rightLegX, legsTopY + walk.legR, legW - 1, legH, colors);
    // Joint lines on legs
    ctx.fillStyle = colors.outline;
    ctx.fillRect(leftLegX, legsTopY + walk.legL + Math.floor(legH / 2), legW - 1, 1);
    ctx.fillRect(rightLegX, legsTopY + walk.legR + Math.floor(legH / 2), legW - 1, 1);

    // Segmented torso
    _drawOutlinedRect(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.skin, colors.outline);
    _drawShading(ctx, torsoX, torsoY + walk.bob, torsoW, torsoH, colors.mid);
    // Segment lines
    ctx.fillStyle = colors.outline;
    for (let i = 1; i <= 2; i++) {
        const sy = torsoY + walk.bob + Math.floor(torsoH * i / 3);
        ctx.fillRect(torsoX + 2, sy, torsoW - 4, 1);
    }

    // Wide head
    const bugHeadW = headW + 4;
    const bugHeadX = Math.floor(cx - bugHeadW / 2);
    if (dir === DIR_UP) _drawHairBack(ctx, bugHeadX, headY, bugHeadW, headH, colors);
    _drawOutlinedRect(ctx, bugHeadX, headY, bugHeadW, headH - 2, colors.skin, colors.outline);
    _drawShading(ctx, bugHeadX, headY, bugHeadW, headH - 2, colors.mid);

    // Compound eyes (larger bulging)
    if (dir !== DIR_UP) {
        const eyeY = headY + Math.floor(headH * 0.25);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 7, eyeY, 5, 5);
            ctx.fillRect(cx + 3, eyeY, 5, 5);
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 6, eyeY + 1, 2, 2);
            ctx.fillRect(cx + 4, eyeY + 1, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 2 : cx - 5;
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex, eyeY, 5, 5);
            ctx.fillStyle = '#fff';
            ctx.fillRect(ex + 1, eyeY + 1, 2, 2);
        }
    }

    // Antennae
    ctx.fillStyle = colors.outline;
    ctx.fillRect(cx - 4, headY - 6, 2, 6);
    ctx.fillRect(cx + 3, headY - 6, 2, 6);
    ctx.fillStyle = colors.eye;
    ctx.fillRect(cx - 5, headY - 8, 3, 3);
    ctx.fillRect(cx + 3, headY - 8, 3, 3);

    // Mandibles when facing down
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(cx - 3, headY + headH - 4, 2, 3);
        ctx.fillRect(cx + 2, headY + headH - 4, 2, 3);
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, rightArmX, shoulderY + walk.armR, bugArmW, armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, leftArmX, shoulderY + walk.armL, bugArmW, armH, colors, 'left');
    }
}

// ── Race 2: Bear man ────────────────────────────────────────────────────────
function _drawBearman(ctx, a, dir, colors) {
    const dims = { headW: 22, headH: 18, torsoW: 24, torsoH: 14, armW: 8, armH: 14, legW: 9, legH: 12 };
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Recalculate anchors for bear proportions
    const headX = Math.floor(cx - dims.headW / 2);
    const torsoX = Math.floor(cx - dims.torsoW / 2);

    // Back arms (thick)
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, cx + dims.torsoW / 2, a.shoulderY + a.walk.armR, dims.armW, dims.armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, cx - dims.torsoW / 2 - dims.armW, a.shoulderY + a.walk.armL, dims.armW, dims.armH, colors, 'left');
    }

    // Thick legs
    _drawLeg(ctx, Math.floor(cx - dims.legW - 1), a.legsTopY + a.walk.legL, dims.legW, dims.legH, colors);
    _drawLeg(ctx, Math.floor(cx + 1), a.legsTopY + a.walk.legR, dims.legW, dims.legH, colors);
    // Big feet
    ctx.fillStyle = colors.outline;
    ctx.fillRect(Math.floor(cx - dims.legW - 2), a.legsTopY + a.walk.legL + dims.legH - 3, dims.legW + 4, 5);
    ctx.fillRect(Math.floor(cx), a.legsTopY + a.walk.legR + dims.legH - 3, dims.legW + 4, 5);

    // Wide torso
    _drawOutlinedRect(ctx, torsoX, a.torsoY + a.walk.bob, dims.torsoW, dims.torsoH, colors.skin, colors.outline);
    _drawShading(ctx, torsoX, a.torsoY + a.walk.bob, dims.torsoW, dims.torsoH, colors.mid);

    // Round head
    if (dir === DIR_UP) _drawHairBack(ctx, headX, a.headY, dims.headW, dims.headH, colors);
    _drawOutlinedRect(ctx, headX, a.headY, dims.headW, dims.headH, colors.skin, colors.outline);
    _drawShading(ctx, headX, a.headY, dims.headW, dims.headH, colors.mid);

    // Round ears
    ctx.fillStyle = colors.skin;
    ctx.fillRect(headX - 2, a.headY - 1, 5, 5);
    ctx.fillRect(headX + dims.headW - 3, a.headY - 1, 5, 5);
    ctx.fillStyle = colors.mid;
    ctx.fillRect(headX - 1, a.headY, 3, 3);
    ctx.fillRect(headX + dims.headW - 2, a.headY, 3, 3);

    // Face
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(dims.headH * 0.35);
        _drawEyes(ctx, cx, eyeY, dir, colors, 5);
        // Snout
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.mid;
            ctx.fillRect(cx - 3, a.headY + dims.headH - 6, 6, 4);
            ctx.fillStyle = '#222';
            ctx.fillRect(cx - 1, a.headY + dims.headH - 5, 3, 2);
        }
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, cx + dims.torsoW / 2, a.shoulderY + a.walk.armR, dims.armW, dims.armH, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, cx - dims.torsoW / 2 - dims.armW, a.shoulderY + a.walk.armL, dims.armW, dims.armH, colors, 'left');
    }
}

// ── Race 3: Bird man ────────────────────────────────────────────────────────
function _drawBirdman(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Feathered crest on top
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 2, a.headY - 5, 2, 5);
    ctx.fillRect(cx, a.headY - 7, 2, 7);
    ctx.fillRect(cx + 2, a.headY - 4, 2, 4);

    // Beak (triangle protruding forward)
    if (dir === DIR_DOWN) {
        ctx.fillStyle = '#ddaa44';
        ctx.fillRect(cx - 2, a.headY + a.headH - 6, 4, 3);
        ctx.fillRect(cx - 1, a.headY + a.headH - 3, 2, 2);
    } else if (dir === DIR_LEFT) {
        ctx.fillStyle = '#ddaa44';
        ctx.fillRect(a.headX - 5, a.headY + Math.floor(a.headH * 0.45), 6, 3);
        ctx.fillRect(a.headX - 6, a.headY + Math.floor(a.headH * 0.45) + 1, 2, 2);
    } else if (dir === DIR_RIGHT) {
        ctx.fillStyle = '#ddaa44';
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.45), 6, 3);
        ctx.fillRect(a.headX + a.headW + 5, a.headY + Math.floor(a.headH * 0.45) + 1, 2, 2);
    }

    // Feather fringe on arms
    ctx.fillStyle = colors.hair;
    const armBottom = a.shoulderY + a.armH - 2;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.leftArmX - 1, armBottom + a.walk.armL, a.armW + 2, 3);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.rightArmX - 1, armBottom + a.walk.armR, a.armW + 2, 3);
    }

    // Splayed toe feet
    ctx.fillStyle = '#ddaa44';
    const feetLY = a.legsTopY + a.walk.legL + a.legH - 2;
    const feetRY = a.legsTopY + a.walk.legR + a.legH - 2;
    ctx.fillRect(a.leftLegX - 2, feetLY, 3, 2);
    ctx.fillRect(a.leftLegX + a.legW, feetLY, 3, 2);
    ctx.fillRect(a.rightLegX - 2, feetRY, 3, 2);
    ctx.fillRect(a.rightLegX + a.legW, feetRY, 3, 2);
}

// ── Race 4: Demon ───────────────────────────────────────────────────────────
function _drawDemon(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Horns (pointed triangles)
    ctx.fillStyle = '#554433';
    // Left horn
    ctx.fillRect(a.headX - 1, a.headY - 4, 3, 4);
    ctx.fillRect(a.headX, a.headY - 7, 2, 3);
    ctx.fillRect(a.headX + 1, a.headY - 9, 1, 2);
    // Right horn
    ctx.fillRect(a.headX + a.headW - 2, a.headY - 4, 3, 4);
    ctx.fillRect(a.headX + a.headW - 2, a.headY - 7, 2, 3);
    ctx.fillRect(a.headX + a.headW - 2, a.headY - 9, 1, 2);

    // Pointed chin
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        ctx.fillRect(cx - 1, a.headY + a.headH, 2, 2);
    }

    // Cloven hooves
    ctx.fillStyle = '#443322';
    const hLY = a.legsTopY + a.walk.legL + a.legH - 3;
    const hRY = a.legsTopY + a.walk.legR + a.legH - 3;
    ctx.fillRect(a.leftLegX - 1, hLY, a.legW + 2, 4);
    ctx.fillRect(a.leftLegX + Math.floor(a.legW / 2), hLY, 1, 4);
    ctx.fillRect(a.rightLegX - 1, hRY, a.legW + 2, 4);
    ctx.fillRect(a.rightLegX + Math.floor(a.legW / 2), hRY, 1, 4);

    // Tail (visible from side/back)
    if (dir === DIR_LEFT || dir === DIR_RIGHT || dir === DIR_UP) {
        ctx.fillStyle = colors.outline;
        const tailX = dir === DIR_LEFT ? cx + a.torsoW / 2 + 1 : cx - a.torsoW / 2 - 4;
        const tailY = a.torsoY + a.torsoH - 2 + a.walk.bob;
        ctx.fillRect(tailX, tailY, 3, 2);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 2 : -2), tailY + 2, 3, 2);
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 4 : -4), tailY + 1, 2, 2);
        // Pointed tip
        ctx.fillStyle = colors.eye;
        ctx.fillRect(tailX + (dir === DIR_LEFT ? 6 : -5), tailY, 3, 3);
    }

    // Claw tips on arms
    ctx.fillStyle = '#443322';
    if (dir !== DIR_UP) {
        ctx.fillRect(a.leftArmX, a.shoulderY + a.walk.armL + a.armH, a.armW, 2);
        ctx.fillRect(a.rightArmX, a.shoulderY + a.walk.armR + a.armH, a.armW, 2);
    }
}

// ── Race 5: Devil ───────────────────────────────────────────────────────────
function _drawDevil(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Curved/swept-back horns (larger than demon)
    ctx.fillStyle = '#665544';
    // Left horn
    ctx.fillRect(a.headX - 2, a.headY - 3, 4, 3);
    ctx.fillRect(a.headX - 4, a.headY - 6, 3, 3);
    ctx.fillRect(a.headX - 5, a.headY - 9, 2, 3);
    ctx.fillRect(a.headX - 5, a.headY - 11, 2, 2);
    // Right horn
    ctx.fillRect(a.headX + a.headW - 2, a.headY - 3, 4, 3);
    ctx.fillRect(a.headX + a.headW + 1, a.headY - 6, 3, 3);
    ctx.fillRect(a.headX + a.headW + 3, a.headY - 9, 2, 3);
    ctx.fillRect(a.headX + a.headW + 3, a.headY - 11, 2, 2);

    // Goatee when facing down
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(cx - 1, a.headY + a.headH - 2, 3, 4);
        ctx.fillRect(cx, a.headY + a.headH + 2, 1, 2);
    }

    // Bat wing stubs
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.torsoX - 3, a.shoulderY + 1, 4, 3);
        ctx.fillRect(a.torsoX - 4, a.shoulderY, 2, 2);
        ctx.fillRect(a.torsoX + a.torsoW, a.shoulderY + 1, 4, 3);
        ctx.fillRect(a.torsoX + a.torsoW + 3, a.shoulderY, 2, 2);
    } else if (dir === DIR_UP) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.torsoX - 4, a.shoulderY - 1, 6, 6);
        ctx.fillRect(a.torsoX - 6, a.shoulderY - 2, 3, 4);
        ctx.fillRect(a.torsoX + a.torsoW - 1, a.shoulderY - 1, 6, 6);
        ctx.fillRect(a.torsoX + a.torsoW + 4, a.shoulderY - 2, 3, 4);
    }

    // Hooved feet
    ctx.fillStyle = '#443322';
    ctx.fillRect(a.leftLegX - 1, a.legsTopY + a.walk.legL + a.legH - 3, a.legW + 2, 4);
    ctx.fillRect(a.rightLegX - 1, a.legsTopY + a.walk.legR + a.legH - 3, a.legW + 2, 4);
}

// ── Race 6: Cat man ─────────────────────────────────────────────────────────
function _drawCatman(ctx, a, dir, colors) {
    // Slim body
    const slimA = Object.assign({}, a, {
        torsoW: a.torsoW - 2, armW: a.armW - 1, legW: a.legW - 1
    });
    _drawGenericBody(ctx, slimA, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Pointed cat ears (triangles)
    ctx.fillStyle = colors.skin;
    ctx.fillRect(a.headX - 1, a.headY - 6, 5, 6);
    ctx.fillRect(a.headX, a.headY - 9, 3, 3);
    ctx.fillRect(a.headX + a.headW - 4, a.headY - 6, 5, 6);
    ctx.fillRect(a.headX + a.headW - 3, a.headY - 9, 3, 3);
    // Inner ear
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.headX + 1, a.headY - 5, 3, 4);
    ctx.fillRect(a.headX + a.headW - 3, a.headY - 5, 3, 4);

    // Whiskers when facing down
    if (dir === DIR_DOWN) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(a.headX - 3, a.headY + Math.floor(a.headH * 0.6), 4, 1);
        ctx.fillRect(a.headX - 3, a.headY + Math.floor(a.headH * 0.6) + 3, 4, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.6), 4, 1);
        ctx.fillRect(a.headX + a.headW, a.headY + Math.floor(a.headH * 0.6) + 3, 4, 1);
        // Cat nose
        ctx.fillStyle = colors.mid;
        ctx.fillRect(cx - 1, a.headY + a.headH - 5, 3, 2);
    }

    // Tail
    if (dir !== DIR_DOWN) {
        ctx.fillStyle = colors.skin;
        const tailBaseX = dir === DIR_LEFT ? cx + a.torsoW / 2 : cx - a.torsoW / 2 - 3;
        const tailBaseY = a.torsoY + a.torsoH - 4 + a.walk.bob;
        ctx.fillRect(tailBaseX, tailBaseY, 3, 2);
        ctx.fillRect(tailBaseX + (dir === DIR_LEFT ? 2 : -2), tailBaseY - 2, 3, 3);
        ctx.fillRect(tailBaseX + (dir === DIR_LEFT ? 4 : -4), tailBaseY - 4, 3, 3);
        ctx.fillRect(tailBaseX + (dir === DIR_LEFT ? 5 : -5), tailBaseY - 6, 3, 3);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(tailBaseX + (dir === DIR_LEFT ? 6 : -5), tailBaseY - 7, 2, 2);
    }

    // Padded feet
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftLegX - 1, a.legsTopY + a.walk.legL + a.legH - 2, a.legW + 2, 3);
    ctx.fillRect(a.rightLegX - 1, a.legsTopY + a.walk.legR + a.legH - 2, a.legW + 2, 3);
}

// ── Race 7: Elf ─────────────────────────────────────────────────────────────
function _drawElf(ctx, a, dir, colors) {
    // Slim elegant body
    const slimA = Object.assign({}, a, {
        torsoW: a.torsoW - 2, armW: a.armW - 1, legW: a.legW - 1
    });
    _drawGenericBody(ctx, slimA, dir, colors, true);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Pointed ears extending sideways
    ctx.fillStyle = colors.skin;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 5, a.headY + 3, 6, 3);
        ctx.fillRect(a.headX - 7, a.headY + 4, 3, 2);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW, a.headY + 3, 6, 3);
        ctx.fillRect(a.headX + a.headW + 4, a.headY + 4, 3, 2);
    }

    // Longer flowing hair
    ctx.fillStyle = colors.hair;
    if (dir !== DIR_UP) {
        ctx.fillRect(a.headX - 2, a.headY - 2, a.headW + 4, 5);
    }
    // Hair draping on sides
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        ctx.fillRect(a.headX - 2, a.headY + 3, 3, 8);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        ctx.fillRect(a.headX + a.headW, a.headY + 3, 3, 8);
    }
    // Back hair (longer for elf)
    if (dir === DIR_UP) {
        ctx.fillStyle = colors.hair;
        ctx.fillRect(a.headX - 1, a.headY, a.headW + 2, a.headH + 4);
    }
}

// ── Race 8: Ent (Tree person) ───────────────────────────────────────────────
function _drawEnt(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const barkColor = '#5a4030';
    const barkLight = '#7a6050';
    const leafColor = '#449933';

    // Root-like legs (thick and gnarled)
    const entLegW = a.legW + 2;
    _drawOutlinedRect(ctx, a.leftLegX - 1, a.legsTopY + a.walk.legL, entLegW, a.legH + 2, barkColor, '#3a2820');
    _drawOutlinedRect(ctx, a.rightLegX - 1, a.legsTopY + a.walk.legR, entLegW, a.legH + 2, barkColor, '#3a2820');
    // Root tendrils at feet
    ctx.fillStyle = '#3a2820';
    ctx.fillRect(a.leftLegX - 3, a.legsTopY + a.walk.legL + a.legH, entLegW + 4, 3);
    ctx.fillRect(a.rightLegX - 3, a.legsTopY + a.walk.legR + a.legH, entLegW + 4, 3);

    // Branch-like arms
    const entArmW = a.armW + 2;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawOutlinedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkColor, '#3a2820');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawOutlinedRect(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkColor, '#3a2820');
    }
    // Leaf clusters at hands
    ctx.fillStyle = leafColor;
    ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH - 2, entArmW + 2, 4);
    ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH - 2, entArmW + 2, 4);

    // Thick bark trunk body
    const entTorsoW = a.torsoW + 4;
    const entTorsoX = Math.floor(cx - entTorsoW / 2);
    _drawOutlinedRect(ctx, entTorsoX, a.torsoY + a.walk.bob, entTorsoW, a.torsoH + 2, barkColor, '#3a2820');
    // Bark texture lines
    ctx.fillStyle = barkLight;
    for (let i = 0; i < 3; i++) {
        const ty = a.torsoY + a.walk.bob + 3 + i * 4;
        ctx.fillRect(entTorsoX + 3, ty, entTorsoW - 6, 1);
    }

    // Woody head with leafy crown
    _drawOutlinedRect(ctx, a.headX, a.headY + 2, a.headW, a.headH - 2, barkColor, '#3a2820');
    // Bark face texture
    ctx.fillStyle = barkLight;
    ctx.fillRect(a.headX + 2, a.headY + 4, 2, a.headH - 6);
    ctx.fillRect(a.headX + a.headW - 4, a.headY + 4, 2, a.headH - 6);

    // Leafy crown
    ctx.fillStyle = leafColor;
    ctx.fillRect(a.headX - 3, a.headY - 4, a.headW + 6, 7);
    ctx.fillRect(a.headX - 1, a.headY - 7, a.headW + 2, 4);
    ctx.fillStyle = '#337722';
    ctx.fillRect(a.headX + 2, a.headY - 5, 3, 3);
    ctx.fillRect(a.headX + a.headW - 4, a.headY - 6, 3, 3);

    // Eyes (glowing in bark)
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.4);
        ctx.fillStyle = '#88ff44';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 4, eyeY, 3, 3);
            ctx.fillRect(cx + 2, eyeY, 3, 3);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 3;
            ctx.fillRect(ex, eyeY, 3, 3);
        }
    }

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawOutlinedRect(ctx, a.rightArmX, a.shoulderY + a.walk.armR, entArmW, a.armH, barkColor, '#3a2820');
        ctx.fillStyle = leafColor;
        ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH - 2, entArmW + 2, 4);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawOutlinedRect(ctx, a.leftArmX - 1, a.shoulderY + a.walk.armL, entArmW, a.armH, barkColor, '#3a2820');
        ctx.fillStyle = leafColor;
        ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH - 2, entArmW + 2, 4);
    }
}

// ── Race 9: Fish man ────────────────────────────────────────────────────────
function _drawFishman(ctx, a, dir, colors) {
    _drawGenericBody(ctx, a, dir, colors, false);
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Fin crest on head
    ctx.fillStyle = colors.hair;
    ctx.fillRect(cx - 1, a.headY - 7, 3, 7);
    ctx.fillRect(cx - 2, a.headY - 5, 5, 5);
    ctx.fillRect(cx - 1, a.headY - 9, 2, 3);

    // Wider head with large fish eyes
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            // Large round eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx - 7, eyeY, 6, 5);
            ctx.fillRect(cx + 2, eyeY, 6, 5);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 5, eyeY + 1, 3, 3);
            ctx.fillRect(cx + 3, eyeY + 1, 3, 3);
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 4, eyeY + 2, 2, 2);
            ctx.fillRect(cx + 4, eyeY + 2, 2, 2);
        }
        // Fish mouth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = colors.outline;
            ctx.fillRect(cx - 3, a.headY + a.headH - 4, 6, 2);
        }
    }

    // Scale pattern on torso
    ctx.fillStyle = colors.mid;
    for (let sy = a.torsoY + a.walk.bob + 2; sy < a.torsoY + a.walk.bob + a.torsoH - 2; sy += 4) {
        for (let sx = a.torsoX + 2; sx < a.torsoX + a.torsoW - 2; sx += 4) {
            ctx.fillRect(sx, sy, 2, 2);
        }
    }

    // Webbed hands (extra pixels at arm ends)
    ctx.fillStyle = colors.mid;
    ctx.fillRect(a.leftArmX - 1, a.shoulderY + a.walk.armL + a.armH - 3, a.armW + 2, 3);
    ctx.fillRect(a.rightArmX - 1, a.shoulderY + a.walk.armR + a.armH - 3, a.armW + 2, 3);

    // Flipper feet (wider at bottom)
    ctx.fillStyle = colors.skin;
    const fLY = a.legsTopY + a.walk.legL + a.legH - 3;
    const fRY = a.legsTopY + a.walk.legR + a.legH - 3;
    ctx.fillRect(a.leftLegX - 2, fLY, a.legW + 4, 4);
    ctx.fillRect(a.rightLegX - 2, fRY, a.legW + 4, 4);
}

// ── Race 10: Ghost ──────────────────────────────────────────────────────────
function _drawGhost(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);

    // Ghost is semi-transparent
    ctx.save();
    ctx.globalAlpha = 0.65;

    // Back arms (wispy)
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH - 2, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH - 2, colors, 'left');
    }

    // NO LEGS — wispy spectral tail instead
    ctx.fillStyle = colors.skin;
    const tailTop = a.legsTopY;
    ctx.fillRect(cx - 5, tailTop, 10, 4);
    ctx.fillRect(cx - 4, tailTop + 4, 8, 3);
    ctx.fillRect(cx - 3, tailTop + 7, 6, 3);
    ctx.fillRect(cx - 2, tailTop + 10, 4, 3);
    // Wavy wisps
    ctx.fillStyle = colors.mid;
    ctx.fillRect(cx - 6, tailTop + 2, 3, 3);
    ctx.fillRect(cx + 4, tailTop + 3, 3, 3);
    ctx.fillRect(cx - 4, tailTop + 8, 2, 3);
    ctx.fillRect(cx + 3, tailTop + 9, 2, 3);

    // Torso (fading)
    _drawOutlinedRect(ctx, a.torsoX, a.torsoY + a.walk.bob, a.torsoW, a.torsoH, colors.skin, colors.outline);

    // Head
    if (dir === DIR_UP) _drawHairBack(ctx, a.headX, a.headY, a.headW, a.headH, colors);
    _drawOutlinedRect(ctx, a.headX, a.headY, a.headW, a.headH + 2, colors.skin, colors.outline);

    ctx.restore(); // Restore alpha

    // Hollow dark eyes (always drawn solid)
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.3);
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 5, eyeY, 4, 5);
            ctx.fillRect(cx + 2, eyeY, 4, 5);
            // Tiny glow in eyes
            ctx.fillStyle = colors.eye;
            ctx.fillRect(cx - 4, eyeY + 2, 2, 2);
            ctx.fillRect(cx + 3, eyeY + 2, 2, 2);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 4;
            ctx.fillStyle = '#111';
            ctx.fillRect(ex, eyeY, 4, 5);
            ctx.fillStyle = colors.eye;
            ctx.fillRect(ex + 1, eyeY + 2, 2, 2);
        }
        // Wailing mouth
        if (dir === DIR_DOWN) {
            ctx.fillStyle = '#111';
            ctx.fillRect(cx - 2, a.headY + a.headH - 4, 4, 3);
        }
    }

    // Ethereal highlight sparkles
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(a.headX + 3, a.headY + 2, 2, 2);
    ctx.fillRect(a.torsoX + a.torsoW - 4, a.torsoY + 3 + a.walk.bob, 2, 2);
    ctx.fillRect(cx - 3, tailTop + 1, 2, 2);

    // Front arms
    ctx.save();
    ctx.globalAlpha = 0.65;
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawArm(ctx, a.rightArmX, a.shoulderY + a.walk.armR, a.armW, a.armH - 2, colors, 'right');
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawArm(ctx, a.leftArmX, a.shoulderY + a.walk.armL, a.armW, a.armH - 2, colors, 'left');
    }
    ctx.restore();
}

// ── Race 11: Golem ──────────────────────────────────────────────────────────
function _drawGolem(ctx, a, dir, colors) {
    const cx = Math.floor(a.torsoX + a.torsoW / 2);
    const stoneColor = colors.skin;
    const stoneDark = colors.outline;
    const stoneMid = colors.mid;

    // Massive blocky legs (pillars)
    const golemLegW = a.legW + 3;
    _drawOutlinedRect(ctx, Math.floor(cx - golemLegW - 2), a.legsTopY + a.walk.legL, golemLegW, a.legH, stoneColor, stoneDark);
    _drawOutlinedRect(ctx, Math.floor(cx + 2), a.legsTopY + a.walk.legR, golemLegW, a.legH, stoneColor, stoneDark);
    // No distinct feet — flat bottoms

    // Huge blocky arms
    const golemArmW = a.armW + 3;
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawOutlinedRect(ctx, cx + a.torsoW / 2 + 1, a.shoulderY + a.walk.armR, golemArmW, a.armH, stoneColor, stoneDark);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawOutlinedRect(ctx, cx - a.torsoW / 2 - golemArmW - 1, a.shoulderY + a.walk.armL, golemArmW, a.armH, stoneColor, stoneDark);
    }

    // Massive blocky torso
    const golemTorsoW = a.torsoW + 8;
    const golemTorsoX = Math.floor(cx - golemTorsoW / 2);
    _drawOutlinedRect(ctx, golemTorsoX, a.torsoY + a.walk.bob, golemTorsoW, a.torsoH + 2, stoneColor, stoneDark);
    _drawShading(ctx, golemTorsoX, a.torsoY + a.walk.bob, golemTorsoW, a.torsoH + 2, stoneMid);

    // Glowing rune in chest center
    if (dir !== DIR_UP) {
        ctx.fillStyle = colors.eye;
        ctx.fillRect(cx - 2, a.torsoY + a.walk.bob + Math.floor(a.torsoH / 2) - 1, 4, 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - 1, a.torsoY + a.walk.bob + Math.floor(a.torsoH / 2), 2, 2);
    }

    // Crack lines
    ctx.fillStyle = stoneDark;
    ctx.fillRect(golemTorsoX + 3, a.torsoY + a.walk.bob + 3, 4, 1);
    ctx.fillRect(golemTorsoX + 5, a.torsoY + a.walk.bob + 4, 1, 3);
    ctx.fillRect(golemTorsoX + golemTorsoW - 7, a.torsoY + a.walk.bob + a.torsoH - 4, 4, 1);

    // Square head (no neck)
    const golemHeadW = a.headW + 4;
    const golemHeadX = Math.floor(cx - golemHeadW / 2);
    _drawOutlinedRect(ctx, golemHeadX, a.headY + 2, golemHeadW, a.headH - 2, stoneColor, stoneDark);

    // Glowing rune eyes
    if (dir !== DIR_UP) {
        const eyeY = a.headY + Math.floor(a.headH * 0.4);
        ctx.fillStyle = colors.eye;
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 5, eyeY, 4, 3);
            ctx.fillRect(cx + 2, eyeY, 4, 3);
        } else {
            const ex = dir === DIR_RIGHT ? cx + 1 : cx - 4;
            ctx.fillRect(ex, eyeY, 4, 3);
        }
        // Glow
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        if (dir === DIR_DOWN) {
            ctx.fillRect(cx - 4, eyeY + 1, 2, 1);
            ctx.fillRect(cx + 3, eyeY + 1, 2, 1);
        }
    }

    // Head crack
    ctx.fillStyle = stoneDark;
    ctx.fillRect(golemHeadX + golemHeadW - 5, a.headY + 3, 1, 5);
    ctx.fillRect(golemHeadX + golemHeadW - 6, a.headY + 5, 1, 3);

    // Front arms
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        _drawOutlinedRect(ctx, cx + a.torsoW / 2 + 1, a.shoulderY + a.walk.armR, golemArmW, a.armH, stoneColor, stoneDark);
    }
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        _drawOutlinedRect(ctx, cx - a.torsoW / 2 - golemArmW - 1, a.shoulderY + a.walk.armL, golemArmW, a.armH, stoneColor, stoneDark);
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

    // Base dimensions (adjusted per race inside each renderer)
    const dims = {
        headW: 18, headH: 16,
        torsoW: 18, torsoH: 14,
        armW: 6, armH: 14,
        legW: 7, legH: 12,
    };

    const a = _buildAnchors(cx, groundY, scale, walk, dims);
    const renderer = RACE_RENDERERS[raceId] || _drawHuman;
    renderer(ctx, a, dir, colors);

    return a;
}

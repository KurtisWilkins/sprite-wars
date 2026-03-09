/**
 * CharacterOutfitRenderer.js — Draws character outfit overlays (clothing, hats,
 * hair, accessories) on top of a base humanoid body for trainers, the player,
 * and NPCs.
 *
 * Art style: Flat cel-shaded chibi — 64×64 canvas, 2-3px uniform black outlines,
 * flat color fills with hard-edged shading (highlight + base + shadow per zone),
 * NO gradients, vibrant saturated colors.
 *
 * Called after body rendering, before equipment rendering.
 *
 * Layer order (back to front):
 *   1. Hair (back)      — behind head when facing up
 *   2. Outfit/Clothing  — torso + arm sleeves
 *   3. Pants/Legs       — leg overlays
 *   4. Shoes            — foot area
 *   5. Hat              — on top of head
 *   6. Hair (front)     — bangs / fringe overlapping face
 *   7. Accessory        — backpack, net, glasses, scarf, cape
 */

// Direction constants (match HumanoidSpriteSystem)
const DIR_DOWN  = 0;
const DIR_LEFT  = 1;
const DIR_RIGHT = 2;
const DIR_UP    = 3;

// ── Internal Helpers ──────────────────────────────────────────────────────────

/**
 * Darken a hex color by `amount` (0-255) per channel.
 * @param {string} hex - e.g. "#4CAF50"
 * @param {number} amount - darken amount (0-255)
 * @returns {string} darkened hex color
 */
function _darkenColor(hex, amount) {
    const c = _parseHex(hex);
    const r = Math.max(0, c.r - amount);
    const g = Math.max(0, c.g - amount);
    const b = Math.max(0, c.b - amount);
    return _toHex(r, g, b);
}

/**
 * Lighten a hex color by `amount` (0-255) per channel.
 * @param {string} hex - e.g. "#4CAF50"
 * @param {number} amount - lighten amount (0-255)
 * @returns {string} lightened hex color
 */
function _lightenColor(hex, amount) {
    const c = _parseHex(hex);
    const r = Math.min(255, c.r + amount);
    const g = Math.min(255, c.g + amount);
    const b = Math.min(255, c.b + amount);
    return _toHex(r, g, b);
}

/** Parse hex string to {r, g, b}. */
function _parseHex(hex) {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
    };
}

/** Convert r, g, b to hex string. */
function _toHex(r, g, b) {
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/**
 * Draw a flat-filled rectangle with a 2px black outline (cel-shaded style).
 * All coordinates are floor'd to snap to whole pixels.
 */
function _drawCleanRect(ctx, x, y, w, h, fillColor) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    ctx.fillStyle = fillColor;
    ctx.fillRect(fx, fy, w, h);
    ctx.save();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'miter';
    ctx.strokeRect(fx, fy, w, h);
    ctx.restore();
}

/**
 * Draw a hard-edged shadow on the right 45% of a rectangle.
 * Flat fill, no gradient — matches the existing cel-shaded style.
 */
function _drawShadowZone(ctx, x, y, w, h, baseColor) {
    const shadow = _darkenColor(baseColor, 30);
    const sx = Math.floor(x) + Math.floor(w * 0.55);
    const sy = Math.floor(y) + 1;
    const sw = Math.ceil(w * 0.45) - 1;
    const sh = h - 2;
    if (sw > 0 && sh > 0) {
        ctx.fillStyle = shadow;
        ctx.fillRect(sx, sy, sw, sh);
    }
}

/**
 * Draw a small filled polygon (array of [x,y] pairs) with fill + 2px outline.
 */
function _drawPoly(ctx, points, fillColor) {
    if (points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(Math.floor(points[0][0]), Math.floor(points[0][1]));
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(Math.floor(points[i][0]), Math.floor(points[i][1]));
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'miter';
    ctx.stroke();
}

/**
 * Draw a filled arc/circle with outline (for round shapes like buns).
 */
function _drawCleanCircle(ctx, cx, cy, r, fillColor) {
    ctx.beginPath();
    ctx.arc(Math.floor(cx), Math.floor(cy), r, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// ── Layer 1: Hair (Back) ──────────────────────────────────────────────────────

function _drawHairBack(ctx, anchors, dir, appearance) {
    if (dir !== DIR_UP) return; // back hair only visible from behind
    const { headX, headY, headW, headH } = anchors;
    const hc = appearance.hairColor;
    const shadow = _darkenColor(hc, 30);
    const style = appearance.hairStyle || 'short';

    switch (style) {
        case 'short': {
            // Simple back coverage — rounded rectangle behind head
            _drawCleanRect(ctx, headX + 2, headY + 4, headW - 4, headH - 4, hc);
            _drawShadowZone(ctx, headX + 2, headY + 4, headW - 4, headH - 4, hc);
            break;
        }
        case 'long': {
            // Flowing hair down past shoulders
            _drawCleanRect(ctx, headX + 1, headY + 2, headW - 2, headH + 8, hc);
            _drawShadowZone(ctx, headX + 1, headY + 2, headW - 2, headH + 8, hc);
            // Tapered bottom
            _drawCleanRect(ctx, headX + 4, headY + headH + 6, headW - 8, 4, hc);
            break;
        }
        case 'spiky': {
            // Angular tufts sticking out
            _drawCleanRect(ctx, headX + 2, headY + 2, headW - 4, headH - 2, hc);
            // Spike tufts at top
            ctx.fillStyle = hc;
            ctx.fillRect(Math.floor(headX + 4), Math.floor(headY - 2), 4, 4);
            ctx.fillRect(Math.floor(headX + headW / 2 - 2), Math.floor(headY - 4), 4, 5);
            ctx.fillRect(Math.floor(headX + headW - 8), Math.floor(headY - 1), 4, 3);
            break;
        }
        case 'ponytail': {
            // Back coverage + gathered ponytail
            _drawCleanRect(ctx, headX + 2, headY + 3, headW - 4, headH - 4, hc);
            // Ponytail band
            const ptX = Math.floor(headX + headW / 2 - 3);
            const ptY = Math.floor(headY + headH - 2);
            _drawCleanRect(ctx, ptX, ptY, 6, 3, _darkenColor(hc, 50));
            // Ponytail hanging down
            _drawCleanRect(ctx, ptX + 1, ptY + 3, 4, 10, hc);
            _drawShadowZone(ctx, ptX + 1, ptY + 3, 4, 10, hc);
            break;
        }
        case 'bun': {
            // Back coverage + round bun on top
            _drawCleanRect(ctx, headX + 2, headY + 3, headW - 4, headH - 4, hc);
            _drawCleanCircle(ctx, headX + headW / 2, headY - 1, 5, hc);
            break;
        }
    }
}

// ── Layer 2: Outfit / Clothing ────────────────────────────────────────────────

function _drawOutfit(ctx, anchors, dir, appearance) {
    const { torsoX, torsoY, torsoW, torsoH, shoulderY,
            leftArmX, rightArmX, armW, armH, walk } = anchors;
    const oc = appearance.outfitColor;
    const ac = appearance.outfitAccent;
    const bob = walk.bob || 0;

    // --- Torso shirt/jacket ---
    _drawCleanRect(ctx, torsoX, torsoY + bob, torsoW, torsoH, oc);
    _drawShadowZone(ctx, torsoX, torsoY + bob, torsoW, torsoH, oc);

    // Belt / trim line at bottom of torso
    const beltY = Math.floor(torsoY + bob + torsoH - 3);
    ctx.fillStyle = ac;
    ctx.fillRect(Math.floor(torsoX), beltY, torsoW, 3);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.floor(torsoX), beltY, torsoW, 3);

    // Collar detail (front view only)
    if (dir === DIR_DOWN) {
        const collarX = Math.floor(torsoX + torsoW / 2 - 3);
        const collarY = Math.floor(torsoY + bob);
        ctx.fillStyle = ac;
        // Small V-shaped collar notch
        ctx.fillRect(collarX, collarY, 6, 2);
    }

    // --- Arm sleeves ---
    // Left sleeve
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        const laY = Math.floor(shoulderY + (walk.armL || 0));
        _drawCleanRect(ctx, leftArmX, laY, armW, Math.floor(armH * 0.6), oc);
        _drawShadowZone(ctx, leftArmX, laY, armW, Math.floor(armH * 0.6), oc);
    }
    // Right sleeve
    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        const raY = Math.floor(shoulderY + (walk.armR || 0));
        _drawCleanRect(ctx, rightArmX, raY, armW, Math.floor(armH * 0.6), oc);
        _drawShadowZone(ctx, rightArmX, raY, armW, Math.floor(armH * 0.6), oc);
    }
    // Side views — the closer arm sleeve
    if (dir === DIR_LEFT) {
        const laY = Math.floor(shoulderY + (walk.armL || 0));
        _drawCleanRect(ctx, leftArmX, laY, armW, Math.floor(armH * 0.6), oc);
        _drawShadowZone(ctx, leftArmX, laY, armW, Math.floor(armH * 0.6), oc);
    }
    if (dir === DIR_RIGHT) {
        const raY = Math.floor(shoulderY + (walk.armR || 0));
        _drawCleanRect(ctx, rightArmX, raY, armW, Math.floor(armH * 0.6), oc);
        _drawShadowZone(ctx, rightArmX, raY, armW, Math.floor(armH * 0.6), oc);
    }
}

// ── Layer 3: Pants / Legs ─────────────────────────────────────────────────────

function _drawPants(ctx, anchors, dir, appearance) {
    const { leftLegX, rightLegX, legW, legH, legsTopY, walk } = anchors;
    const pc = appearance.outfitAccent;

    // Left leg
    const llY = Math.floor(legsTopY + (walk.legL || 0));
    _drawCleanRect(ctx, leftLegX, llY, legW, legH, pc);
    _drawShadowZone(ctx, leftLegX, llY, legW, legH, pc);

    // Right leg
    const rlY = Math.floor(legsTopY + (walk.legR || 0));
    _drawCleanRect(ctx, rightLegX, rlY, legW, legH, pc);
    _drawShadowZone(ctx, rightLegX, rlY, legW, legH, pc);
}

// ── Layer 4: Shoes ────────────────────────────────────────────────────────────

function _drawShoes(ctx, anchors, dir, appearance) {
    const { leftLegX, rightLegX, legW, legH, legsTopY, walk } = anchors;
    const sc = appearance.shoeColor;
    const shoeH = 3;

    // Left shoe
    const lsY = Math.floor(legsTopY + (walk.legL || 0) + legH - shoeH);
    _drawCleanRect(ctx, leftLegX - 1, lsY, legW + 2, shoeH + 1, sc);

    // Right shoe
    const rsY = Math.floor(legsTopY + (walk.legR || 0) + legH - shoeH);
    _drawCleanRect(ctx, rightLegX - 1, rsY, legW + 2, shoeH + 1, sc);
}

// ── Layer 5: Hat ──────────────────────────────────────────────────────────────

function _drawHat(ctx, anchors, dir, appearance) {
    const style = appearance.hatStyle || 'none';
    if (style === 'none') return;
    const { headX, headY, headW, headH } = anchors;
    const hc = appearance.hatColor;
    const shadow = _darkenColor(hc, 30);
    const cx = Math.floor(headX + headW / 2);

    switch (style) {
        case 'cap': {
            // Baseball cap — curved crown + brim
            const capY = Math.floor(headY - 2);
            const capW = headW - 4;
            const capH = 8;
            const capX = Math.floor(cx - capW / 2);
            // Crown
            _drawCleanRect(ctx, capX, capY, capW, capH, hc);
            _drawShadowZone(ctx, capX, capY, capW, capH, hc);
            // Button on top
            ctx.fillStyle = shadow;
            ctx.fillRect(Math.floor(cx - 1), capY - 1, 3, 2);
            // Brim — extends forward/to the side
            if (dir === DIR_DOWN) {
                _drawCleanRect(ctx, capX - 3, capY + capH - 2, capW + 6, 3, shadow);
            } else if (dir === DIR_LEFT) {
                _drawCleanRect(ctx, capX - 6, capY + capH - 2, Math.floor(capW * 0.7), 3, shadow);
            } else if (dir === DIR_RIGHT) {
                _drawCleanRect(ctx, capX + Math.floor(capW * 0.3), capY + capH - 2, Math.floor(capW * 0.7) + 6, 3, shadow);
            } else {
                // From behind — just the band visible
                _drawCleanRect(ctx, capX - 1, capY + capH - 2, capW + 2, 3, shadow);
                // Adjustment strap
                ctx.fillStyle = _darkenColor(hc, 50);
                ctx.fillRect(Math.floor(cx - 2), capY + capH, 4, 2);
            }
            break;
        }
        case 'straw': {
            // Wide brim straw hat
            const hatY = Math.floor(headY - 4);
            const crownW = headW - 6;
            const crownH = 7;
            const crownX = Math.floor(cx - crownW / 2);
            // Crown — taller dome
            _drawCleanRect(ctx, crownX, hatY, crownW, crownH, hc);
            _drawShadowZone(ctx, crownX, hatY, crownW, crownH, hc);
            // Wide brim — extends well past head
            const brimW = headW + 10;
            const brimX = Math.floor(cx - brimW / 2);
            _drawCleanRect(ctx, brimX, hatY + crownH - 1, brimW, 3, hc);
            _drawShadowZone(ctx, brimX, hatY + crownH - 1, brimW, 3, hc);
            // Ribbon band
            ctx.fillStyle = _darkenColor(hc, 60);
            ctx.fillRect(crownX, Math.floor(hatY + crownH - 3), crownW, 2);
            break;
        }
        case 'bandana': {
            // Tied headband wrapping forehead
            const bandY = Math.floor(headY + 2);
            const bandW = headW + 2;
            const bandX = Math.floor(cx - bandW / 2);
            const bandH = 4;
            _drawCleanRect(ctx, bandX, bandY, bandW, bandH, hc);
            _drawShadowZone(ctx, bandX, bandY, bandW, bandH, hc);
            // Knot/tails on the side or back
            if (dir === DIR_DOWN) {
                // Slight fold in center
                ctx.fillStyle = shadow;
                ctx.fillRect(Math.floor(cx - 1), bandY, 2, bandH);
            } else if (dir === DIR_UP || dir === DIR_LEFT) {
                // Trailing tails
                const tailX = Math.floor(bandX + bandW - 2);
                ctx.fillStyle = hc;
                ctx.fillRect(tailX, bandY + bandH, 3, 5);
                ctx.fillRect(tailX + 2, bandY + bandH + 2, 3, 5);
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 1;
                ctx.strokeRect(tailX, bandY + bandH, 3, 5);
                ctx.strokeRect(tailX + 2, bandY + bandH + 2, 3, 5);
            } else {
                // DIR_RIGHT — tails on left side
                const tailX = Math.floor(bandX - 1);
                ctx.fillStyle = hc;
                ctx.fillRect(tailX, bandY + bandH, 3, 5);
                ctx.fillRect(tailX - 2, bandY + bandH + 2, 3, 5);
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 1;
                ctx.strokeRect(tailX, bandY + bandH, 3, 5);
                ctx.strokeRect(tailX - 2, bandY + bandH + 2, 3, 5);
            }
            break;
        }
        case 'hood': {
            // Hooded robe draped around head
            const hoodY = Math.floor(headY - 3);
            const hoodW = headW + 6;
            const hoodH = headH + 2;
            const hoodX = Math.floor(cx - hoodW / 2);
            // Outer hood shape
            _drawCleanRect(ctx, hoodX, hoodY, hoodW, hoodH, hc);
            _drawShadowZone(ctx, hoodX, hoodY, hoodW, hoodH, hc);
            // Inner shadow / face opening (front views)
            if (dir === DIR_DOWN) {
                const innerW = headW - 6;
                const innerX = Math.floor(cx - innerW / 2);
                ctx.fillStyle = _darkenColor(hc, 50);
                ctx.fillRect(innerX, hoodY + 4, innerW, hoodH - 6);
            }
            // Draping sides
            if (dir === DIR_LEFT || dir === DIR_DOWN) {
                ctx.fillStyle = shadow;
                ctx.fillRect(hoodX, hoodY + hoodH - 2, 4, 6);
            }
            if (dir === DIR_RIGHT || dir === DIR_DOWN) {
                ctx.fillStyle = shadow;
                ctx.fillRect(Math.floor(hoodX + hoodW - 4), hoodY + hoodH - 2, 4, 6);
            }
            break;
        }
    }
}

// ── Layer 6: Hair (Front) ─────────────────────────────────────────────────────

function _drawHairFront(ctx, anchors, dir, appearance) {
    if (dir === DIR_UP) return; // no front hair visible from behind
    const { headX, headY, headW, headH } = anchors;
    const hc = appearance.hairColor;
    const shadow = _darkenColor(hc, 30);
    const style = appearance.hairStyle || 'short';

    // Top hair — fluffy chibi volume
    const topY = Math.floor(headY - 3);

    switch (style) {
        case 'short': {
            // Simple top volume + small side tufts
            ctx.fillStyle = hc;
            ctx.fillRect(Math.floor(headX - 1), topY, headW + 2, 5);
            ctx.fillRect(Math.floor(headX), topY - 2, headW, 3);
            // Shadow on right side
            ctx.fillStyle = shadow;
            ctx.fillRect(Math.floor(headX + headW * 0.55), topY, Math.ceil(headW * 0.45) + 1, 5);
            // Side tufts
            if (dir === DIR_DOWN || dir === DIR_LEFT) {
                ctx.fillStyle = hc;
                ctx.fillRect(Math.floor(headX - 2), Math.floor(headY + 2), 3, 5);
            }
            if (dir === DIR_DOWN || dir === DIR_RIGHT) {
                ctx.fillStyle = hc;
                ctx.fillRect(Math.floor(headX + headW - 1), Math.floor(headY + 2), 3, 5);
            }
            break;
        }
        case 'long': {
            // Voluminous top + flowing side curtains
            ctx.fillStyle = hc;
            ctx.fillRect(Math.floor(headX - 2), topY, headW + 4, 6);
            ctx.fillRect(Math.floor(headX - 1), topY - 2, headW + 2, 3);
            // Shadow zone
            ctx.fillStyle = shadow;
            ctx.fillRect(Math.floor(headX + headW * 0.55), topY, Math.ceil(headW * 0.45) + 2, 6);
            // Long side curtains framing face
            if (dir === DIR_DOWN) {
                ctx.fillStyle = hc;
                ctx.fillRect(Math.floor(headX - 3), Math.floor(headY + 1), 4, headH - 2);
                ctx.fillRect(Math.floor(headX + headW - 1), Math.floor(headY + 1), 4, headH - 2);
                // Shadow on right curtain
                ctx.fillStyle = shadow;
                ctx.fillRect(Math.floor(headX + headW), Math.floor(headY + 1), 3, headH - 2);
            } else if (dir === DIR_LEFT) {
                ctx.fillStyle = hc;
                ctx.fillRect(Math.floor(headX - 3), Math.floor(headY + 1), 4, headH);
            } else {
                ctx.fillStyle = hc;
                ctx.fillRect(Math.floor(headX + headW - 1), Math.floor(headY + 1), 4, headH);
            }
            break;
        }
        case 'spiky': {
            // Angular spikes jutting upward
            const spikeBase = Math.floor(headX);
            ctx.fillStyle = hc;
            // Base volume
            ctx.fillRect(Math.floor(headX - 1), topY + 1, headW + 2, 5);
            // Individual spikes — 3-4 angular tufts
            const spikeW = Math.floor(headW / 4);
            for (let i = 0; i < 4; i++) {
                const sx = Math.floor(headX + i * spikeW);
                const spikeH = (i % 2 === 0) ? 6 : 8;
                ctx.fillStyle = (i >= 2) ? shadow : hc;
                ctx.fillRect(sx, Math.floor(topY - spikeH + 3), spikeW - 1, spikeH);
            }
            // Side spikes
            if (dir === DIR_DOWN || dir === DIR_LEFT) {
                ctx.fillStyle = hc;
                ctx.fillRect(Math.floor(headX - 4), Math.floor(headY + 1), 4, 4);
                ctx.fillRect(Math.floor(headX - 3), Math.floor(headY - 1), 3, 3);
            }
            if (dir === DIR_DOWN || dir === DIR_RIGHT) {
                ctx.fillStyle = shadow;
                ctx.fillRect(Math.floor(headX + headW), Math.floor(headY + 1), 4, 4);
                ctx.fillRect(Math.floor(headX + headW + 1), Math.floor(headY - 1), 3, 3);
            }
            break;
        }
        case 'ponytail': {
            // Moderate top volume + side-swept bangs
            ctx.fillStyle = hc;
            ctx.fillRect(Math.floor(headX - 1), topY, headW + 2, 5);
            ctx.fillRect(Math.floor(headX), topY - 1, headW, 2);
            // Shadow
            ctx.fillStyle = shadow;
            ctx.fillRect(Math.floor(headX + headW * 0.55), topY, Math.ceil(headW * 0.45) + 1, 5);
            // Side-swept bangs
            if (dir === DIR_DOWN) {
                ctx.fillStyle = hc;
                ctx.fillRect(Math.floor(headX - 2), Math.floor(headY + 1), 4, 6);
                // Small fringe
                ctx.fillRect(Math.floor(headX + 3), topY + 4, headW - 6, 2);
            }
            // Ponytail visible from side views
            if (dir === DIR_LEFT) {
                ctx.fillStyle = hc;
                ctx.fillRect(Math.floor(headX + headW - 1), Math.floor(headY + headH / 2), 4, 10);
                _drawCleanRect(ctx, headX + headW, headY + headH / 2 - 1, 3, 3, _darkenColor(hc, 50));
            }
            if (dir === DIR_RIGHT) {
                ctx.fillStyle = hc;
                ctx.fillRect(Math.floor(headX - 3), Math.floor(headY + headH / 2), 4, 10);
                _drawCleanRect(ctx, headX - 3, headY + headH / 2 - 1, 3, 3, _darkenColor(hc, 50));
            }
            break;
        }
        case 'bun': {
            // Neat top volume + bun on top
            ctx.fillStyle = hc;
            ctx.fillRect(Math.floor(headX - 1), topY + 1, headW + 2, 5);
            ctx.fillRect(Math.floor(headX), topY - 1, headW, 3);
            // Shadow
            ctx.fillStyle = shadow;
            ctx.fillRect(Math.floor(headX + headW * 0.55), topY + 1, Math.ceil(headW * 0.45) + 1, 5);
            // Bun on top of head (visible from front/sides)
            const bunX = Math.floor(headX + headW / 2);
            const bunY = Math.floor(topY - 3);
            _drawCleanCircle(ctx, bunX, bunY, 4, hc);
            // Bun shadow
            ctx.fillStyle = shadow;
            ctx.beginPath();
            ctx.arc(bunX + 1, bunY + 1, 2, 0, Math.PI * 2);
            ctx.fill();
            // Neat side bangs
            if (dir === DIR_DOWN) {
                ctx.fillStyle = hc;
                ctx.fillRect(Math.floor(headX - 1), Math.floor(headY + 2), 3, 4);
                ctx.fillRect(Math.floor(headX + headW - 2), Math.floor(headY + 2), 3, 4);
            }
            break;
        }
    }
}

// ── Layer 7: Accessories ──────────────────────────────────────────────────────

function _drawAccessory(ctx, anchors, dir, appearance) {
    const type = appearance.accessory || 'none';
    if (type === 'none') return;
    const ac = appearance.accessoryColor;
    const shadow = _darkenColor(ac, 30);
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH, walk } = anchors;
    const cx = Math.floor(torsoX + torsoW / 2);
    const bob = walk.bob || 0;

    switch (type) {
        case 'backpack': {
            // Rectangular pack on back — visible from behind and sides
            if (dir === DIR_UP) {
                const bpW = torsoW - 2;
                const bpH = torsoH + 4;
                const bpX = Math.floor(cx - bpW / 2);
                const bpY = Math.floor(torsoY + bob - 2);
                _drawCleanRect(ctx, bpX, bpY, bpW, bpH, ac);
                _drawShadowZone(ctx, bpX, bpY, bpW, bpH, ac);
                // Straps
                ctx.fillStyle = _darkenColor(ac, 40);
                ctx.fillRect(Math.floor(bpX + 2), bpY, 2, bpH);
                ctx.fillRect(Math.floor(bpX + bpW - 4), bpY, 2, bpH);
                // Flap
                ctx.fillStyle = shadow;
                ctx.fillRect(bpX + 1, bpY, bpW - 2, 3);
            } else if (dir === DIR_LEFT) {
                // Side peek of backpack
                const bpX = Math.floor(torsoX + torsoW - 1);
                const bpY = Math.floor(torsoY + bob - 1);
                _drawCleanRect(ctx, bpX, bpY, 5, torsoH + 2, ac);
                _drawShadowZone(ctx, bpX, bpY, 5, torsoH + 2, ac);
            } else if (dir === DIR_RIGHT) {
                const bpX = Math.floor(torsoX - 4);
                const bpY = Math.floor(torsoY + bob - 1);
                _drawCleanRect(ctx, bpX, bpY, 5, torsoH + 2, ac);
                _drawShadowZone(ctx, bpX, bpY, 5, torsoH + 2, ac);
            }
            // From front (DIR_DOWN) — straps visible on shoulders
            if (dir === DIR_DOWN) {
                ctx.fillStyle = _darkenColor(ac, 40);
                ctx.fillRect(Math.floor(torsoX + 2), Math.floor(torsoY + bob), 2, torsoH);
                ctx.fillRect(Math.floor(torsoX + torsoW - 4), Math.floor(torsoY + bob), 2, torsoH);
            }
            break;
        }
        case 'net': {
            // Small butterfly/bug net extending from arm
            const netDir = (dir === DIR_LEFT) ? -1 : 1;
            const armBaseX = (dir === DIR_LEFT) ? leftArmX : rightArmX;
            const armBaseY = Math.floor(shoulderY + (dir === DIR_LEFT ? (walk.armL || 0) : (walk.armR || 0)));
            if (dir !== DIR_UP) {
                // Handle (thin pole)
                const handleX = Math.floor(armBaseX + armW / 2 - 1);
                const handleY = Math.floor(armBaseY - 6);
                ctx.fillStyle = '#8B6C42';
                ctx.fillRect(handleX, handleY, 2, 14);
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 1;
                ctx.strokeRect(handleX, handleY, 2, 14);
                // Net hoop (circle outline at top)
                const hoopCX = handleX + 1;
                const hoopCY = handleY - 3;
                ctx.beginPath();
                ctx.arc(hoopCX, hoopCY, 5, 0, Math.PI * 2);
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 2;
                ctx.stroke();
                // Net mesh (lighter fill)
                ctx.beginPath();
                ctx.arc(hoopCX, hoopCY, 4, 0, Math.PI * 2);
                ctx.fillStyle = ac;
                ctx.globalAlpha = 0.5;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                // Net bag hanging down
                ctx.fillStyle = ac;
                ctx.globalAlpha = 0.4;
                ctx.fillRect(hoopCX - 2, hoopCY + 3, 4, 5);
                ctx.globalAlpha = 1.0;
            }
            break;
        }
        case 'glasses': {
            // Two small rectangles on face (front/side views)
            if (dir === DIR_DOWN) {
                const eyeY = Math.floor(headY + headH * 0.35);
                const glassW = 6;
                const glassH = 4;
                const gap = 2;
                const lx = Math.floor(cx - gap / 2 - glassW);
                const rx = Math.floor(cx + gap / 2);
                // Left lens
                _drawCleanRect(ctx, lx, eyeY, glassW, glassH, ac);
                // Right lens
                _drawCleanRect(ctx, rx, eyeY, glassW, glassH, ac);
                // Bridge
                ctx.fillStyle = '#111111';
                ctx.fillRect(Math.floor(cx - gap / 2), eyeY + 1, gap, 1);
                // Glint on lenses
                ctx.fillStyle = _lightenColor(ac, 80);
                ctx.fillRect(lx + 1, eyeY + 1, 2, 1);
                ctx.fillRect(rx + 1, eyeY + 1, 2, 1);
            } else if (dir === DIR_LEFT) {
                const eyeY = Math.floor(headY + headH * 0.35);
                const lensX = Math.floor(headX + 1);
                _drawCleanRect(ctx, lensX, eyeY, 5, 4, ac);
                // Arm extending back
                ctx.fillStyle = '#111111';
                ctx.fillRect(lensX + 5, eyeY + 1, headW - 6, 1);
            } else if (dir === DIR_RIGHT) {
                const eyeY = Math.floor(headY + headH * 0.35);
                const lensX = Math.floor(headX + headW - 6);
                _drawCleanRect(ctx, lensX, eyeY, 5, 4, ac);
                ctx.fillStyle = '#111111';
                ctx.fillRect(Math.floor(headX + 1), eyeY + 1, headW - 6, 1);
            }
            break;
        }
        case 'scarf': {
            // Draped cloth around neck area
            const scarfY = Math.floor(torsoY + bob - 2);
            const scarfW = torsoW + 4;
            const scarfX = Math.floor(cx - scarfW / 2);
            const scarfH = 5;
            _drawCleanRect(ctx, scarfX, scarfY, scarfW, scarfH, ac);
            _drawShadowZone(ctx, scarfX, scarfY, scarfW, scarfH, ac);
            // Trailing end (front view — hangs down)
            if (dir === DIR_DOWN) {
                ctx.fillStyle = ac;
                ctx.fillRect(Math.floor(cx - 1), scarfY + scarfH, 3, 6);
                ctx.fillStyle = shadow;
                ctx.fillRect(Math.floor(cx), scarfY + scarfH, 2, 6);
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 1;
                ctx.strokeRect(Math.floor(cx - 1), scarfY + scarfH, 3, 6);
            }
            // Side views — scarf end flutters behind
            if (dir === DIR_LEFT) {
                ctx.fillStyle = ac;
                ctx.fillRect(Math.floor(scarfX + scarfW - 2), scarfY + scarfH, 3, 5);
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 1;
                ctx.strokeRect(Math.floor(scarfX + scarfW - 2), scarfY + scarfH, 3, 5);
            }
            if (dir === DIR_RIGHT) {
                ctx.fillStyle = ac;
                ctx.fillRect(scarfX, scarfY + scarfH, 3, 5);
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 1;
                ctx.strokeRect(scarfX, scarfY + scarfH, 3, 5);
            }
            // Wrap detail — knot
            if (dir === DIR_DOWN || dir === DIR_UP) {
                ctx.fillStyle = shadow;
                ctx.fillRect(Math.floor(cx - 2), scarfY + 1, 4, 3);
            }
            break;
        }
        case 'cape': {
            // Flowing cloth from shoulders — visible from behind and sides
            const capeTopY = Math.floor(shoulderY + bob);
            const capeH = torsoH + anchors.legH + 2;
            if (dir === DIR_UP) {
                // Full cape visible from behind
                const capeW = torsoW + 6;
                const capeX = Math.floor(cx - capeW / 2);
                _drawCleanRect(ctx, capeX, capeTopY, capeW, capeH, ac);
                _drawShadowZone(ctx, capeX, capeTopY, capeW, capeH, ac);
                // Center fold line
                ctx.fillStyle = shadow;
                ctx.fillRect(Math.floor(cx - 1), capeTopY + 2, 2, capeH - 4);
                // Bottom scallop detail
                ctx.fillStyle = _darkenColor(ac, 20);
                ctx.fillRect(capeX + 2, Math.floor(capeTopY + capeH - 3), capeW - 4, 3);
            } else if (dir === DIR_LEFT) {
                // Side peek — cape trails behind on right side
                const capeX = Math.floor(torsoX + torsoW - 2);
                _drawCleanRect(ctx, capeX, capeTopY, 6, capeH, ac);
                _drawShadowZone(ctx, capeX, capeTopY, 6, capeH, ac);
            } else if (dir === DIR_RIGHT) {
                // Side peek — cape trails behind on left side
                const capeX = Math.floor(torsoX - 4);
                _drawCleanRect(ctx, capeX, capeTopY, 6, capeH, ac);
                _drawShadowZone(ctx, capeX, capeTopY, 6, capeH, ac);
            }
            // From front — collar/clasp visible
            if (dir === DIR_DOWN) {
                // Small shoulder clasps
                ctx.fillStyle = _lightenColor(ac, 40);
                ctx.fillRect(Math.floor(torsoX - 1), Math.floor(capeTopY), 3, 3);
                ctx.fillRect(Math.floor(torsoX + torsoW - 2), Math.floor(capeTopY), 3, 3);
                ctx.strokeStyle = '#111111';
                ctx.lineWidth = 1;
                ctx.strokeRect(Math.floor(torsoX - 1), Math.floor(capeTopY), 3, 3);
                ctx.strokeRect(Math.floor(torsoX + torsoW - 2), Math.floor(capeTopY), 3, 3);
            }
            break;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Draws character outfit overlays (clothing, hat, hair, accessories) on top of
 * a base humanoid body. Called after body rendering, before equipment rendering.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} anchors - Body anchor points from _buildAnchors() containing:
 *   headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
 *   shoulderY, leftArmX, rightArmX, armW, armH,
 *   leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk
 * @param {number} dir - 0=down, 1=left, 2=right, 3=up
 * @param {object} appearance - Config from CharacterAppearanceData.js
 */
export function drawCharacterOutfit(ctx, anchors, dir, appearance) {
    if (!appearance) return;

    // Layer 1: Hair behind head (only when facing up)
    _drawHairBack(ctx, anchors, dir, appearance);

    // Layer 2: Outfit / clothing over torso and arms
    _drawOutfit(ctx, anchors, dir, appearance);

    // Layer 3: Pants / legs
    _drawPants(ctx, anchors, dir, appearance);

    // Layer 4: Shoes
    _drawShoes(ctx, anchors, dir, appearance);

    // Layer 5: Hat on top of head
    _drawHat(ctx, anchors, dir, appearance);

    // Layer 6: Hair on front of head (bangs, fringe)
    _drawHairFront(ctx, anchors, dir, appearance);

    // Layer 7: Accessory
    _drawAccessory(ctx, anchors, dir, appearance);
}

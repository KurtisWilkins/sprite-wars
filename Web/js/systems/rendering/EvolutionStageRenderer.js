/**
 * EvolutionStageRenderer.js — Evolution-stage visual enhancements for race sprites.
 *
 * Applies cel-shaded visual effects on top of the base race body to differentiate
 * evolution stages. Called AFTER the base race body is drawn, BEFORE equipment.
 *
 * Art style: Adventure Quest / Flash-RPG cartoon style, 64x64 canvas, bold black
 * outlines, cel-shaded with hard-edged two-tone shading, expressive eyes, vibrant colors.
 *
 * Stage 0 (Base):  No modifications — base race body is sufficient
 * Stage 1 (Mid):   Element aura marks, shoulder accents, intensified eye highlights
 * Stage 2 (Final): Full element aura, crown/crest, element trail particles, enhanced marks
 */

// ── Element Color Map ─────────────────────────────────────────────────────────
const ELEMENT_COLORS = {
    fire:     { primary: '#ff6633', secondary: '#ffaa33', glow: '#ff440040' },
    water:    { primary: '#3399ff', secondary: '#66ccff', glow: '#3399ff40' },
    plant:    { primary: '#44bb44', secondary: '#88dd44', glow: '#44bb4440' },
    ice:      { primary: '#88ddff', secondary: '#cceeff', glow: '#88ddff40' },
    wind:     { primary: '#aaddaa', secondary: '#cceecc', glow: '#aaddaa40' },
    earth:    { primary: '#bb8844', secondary: '#ddaa66', glow: '#bb884440' },
    electric: { primary: '#ffdd44', secondary: '#ffee88', glow: '#ffdd4440' },
    dark:     { primary: '#8855aa', secondary: '#aa77cc', glow: '#8855aa40' },
    light:    { primary: '#ffeeaa', secondary: '#fff5cc', glow: '#ffeeaa40' },
    fairy:    { primary: '#ff88cc', secondary: '#ffaadd', glow: '#ff88cc40' },
    solar:    { primary: '#ffcc44', secondary: '#ffdd88', glow: '#ffcc4440' },
    lunar:    { primary: '#aabbdd', secondary: '#ccddee', glow: '#aabbdd40' },
    metal:    { primary: '#99aabb', secondary: '#bbc0cc', glow: '#99aabb40' },
    poison:   { primary: '#aa66cc', secondary: '#cc88dd', glow: '#aa66cc40' },
};

// Direction constants
const DIR_DOWN  = 0;
const DIR_LEFT  = 1;
const DIR_RIGHT = 2;
const DIR_UP    = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve element string to color set, normalizing case. */
function _getColors(element) {
    const key = (element || 'fire').toLowerCase();
    return ELEMENT_COLORS[key] || ELEMENT_COLORS.fire;
}

/** Draw a small outlined rectangle in cel-shaded style (flat fill + black outline). */
function _outlinedRect(ctx, x, y, w, h, fill) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    ctx.fillStyle = fill;
    ctx.fillRect(fx, fy, w, h);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'miter';
    ctx.strokeRect(fx, fy, w, h);
}

/** Draw a small filled rectangle (no outline, for tiny detail marks). */
function _tinyRect(ctx, x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

// ── Stage 1: Element Marks on Cheeks ──────────────────────────────────────────

function _drawFireMarks(ctx, cx, cheekY, dir, secondary, large) {
    const s = large ? 4 : 3;
    if (dir === DIR_DOWN) {
        // Left cheek: small flame triangle
        _tinyRect(ctx, cx - 9, cheekY, s, s, secondary);
        _tinyRect(ctx, cx - 9 + 1, cheekY - 1, s - 2, 1, secondary);
        // Right cheek
        _tinyRect(ctx, cx + 7, cheekY, s, s, secondary);
        _tinyRect(ctx, cx + 7 + 1, cheekY - 1, s - 2, 1, secondary);
    } else if (dir === DIR_LEFT) {
        _tinyRect(ctx, cx - 6, cheekY, s, s, secondary);
    } else if (dir === DIR_RIGHT) {
        _tinyRect(ctx, cx + 4, cheekY, s, s, secondary);
    }
}

function _drawWaterMarks(ctx, cx, cheekY, dir, secondary, large) {
    const s = large ? 3 : 2;
    if (dir === DIR_DOWN) {
        _tinyRect(ctx, cx - 9, cheekY, s, s + 1, secondary);
        _tinyRect(ctx, cx - 9 + 1, cheekY + s + 1, 1, 1, secondary);
        _tinyRect(ctx, cx + 7, cheekY, s, s + 1, secondary);
        _tinyRect(ctx, cx + 7 + 1, cheekY + s + 1, 1, 1, secondary);
    } else if (dir === DIR_LEFT) {
        _tinyRect(ctx, cx - 6, cheekY, s, s + 1, secondary);
    } else if (dir === DIR_RIGHT) {
        _tinyRect(ctx, cx + 4, cheekY, s, s + 1, secondary);
    }
}

function _drawLeafMarks(ctx, cx, cheekY, dir, secondary, large) {
    const s = large ? 4 : 3;
    if (dir === DIR_DOWN) {
        // Leaf shape: small diagonal rect
        _tinyRect(ctx, cx - 9, cheekY, s, s - 1, secondary);
        _tinyRect(ctx, cx - 9 + 1, cheekY - 1, s - 2, 1, secondary);
        _tinyRect(ctx, cx + 7, cheekY, s, s - 1, secondary);
        _tinyRect(ctx, cx + 7 + 1, cheekY - 1, s - 2, 1, secondary);
    } else if (dir === DIR_LEFT) {
        _tinyRect(ctx, cx - 6, cheekY, s, s - 1, secondary);
    } else if (dir === DIR_RIGHT) {
        _tinyRect(ctx, cx + 4, cheekY, s, s - 1, secondary);
    }
}

function _drawGenericMarks(ctx, cx, cheekY, dir, color, large) {
    const s = large ? 3 : 2;
    if (dir === DIR_DOWN) {
        _tinyRect(ctx, cx - 9, cheekY, s, s, color);
        _tinyRect(ctx, cx + 7, cheekY, s, s, color);
    } else if (dir === DIR_LEFT) {
        _tinyRect(ctx, cx - 6, cheekY, s, s, color);
    } else if (dir === DIR_RIGHT) {
        _tinyRect(ctx, cx + 4, cheekY, s, s, color);
    }
}

function _drawCrystalMarks(ctx, cx, cheekY, dir, color, large) {
    const s = large ? 3 : 2;
    if (dir === DIR_DOWN) {
        // Diamond/crystal shaped mark
        _tinyRect(ctx, cx - 9 + 1, cheekY - 1, s - 1, 1, color);
        _tinyRect(ctx, cx - 9, cheekY, s + 1, s - 1, color);
        _tinyRect(ctx, cx - 9 + 1, cheekY + s - 1, s - 1, 1, color);
        _tinyRect(ctx, cx + 7 + 1, cheekY - 1, s - 1, 1, color);
        _tinyRect(ctx, cx + 7, cheekY, s + 1, s - 1, color);
        _tinyRect(ctx, cx + 7 + 1, cheekY + s - 1, s - 1, 1, color);
    } else if (dir === DIR_LEFT) {
        _tinyRect(ctx, cx - 6, cheekY, s + 1, s, color);
    } else if (dir === DIR_RIGHT) {
        _tinyRect(ctx, cx + 4, cheekY, s + 1, s, color);
    }
}

/**
 * Draw element-specific cheek/face marks.
 * @param {boolean} large — true for stage 2 enhanced marks
 */
function _drawElementMarks(ctx, cx, cheekY, dir, element, colors, large) {
    const key = (element || 'fire').toLowerCase();
    switch (key) {
        case 'fire':     _drawFireMarks(ctx, cx, cheekY, dir, colors.secondary, large); break;
        case 'water':    _drawWaterMarks(ctx, cx, cheekY, dir, colors.secondary, large); break;
        case 'plant':    _drawLeafMarks(ctx, cx, cheekY, dir, colors.secondary, large); break;
        case 'ice':      _drawCrystalMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
        case 'electric': _drawGenericMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
        case 'dark':     _drawGenericMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
        case 'light':    _drawGenericMarks(ctx, cx, cheekY, dir, colors.secondary, large); break;
        case 'fairy':    _drawGenericMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
        case 'wind':     _drawGenericMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
        case 'earth':    _drawGenericMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
        case 'solar':    _drawGenericMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
        case 'lunar':    _drawGenericMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
        case 'metal':    _drawCrystalMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
        case 'poison':   _drawGenericMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
        default:         _drawGenericMarks(ctx, cx, cheekY, dir, colors.primary, large); break;
    }
}

// ── Stage 1: Shoulder Accents ─────────────────────────────────────────────────

function _drawShoulderAccents(ctx, anchors, dir, colors) {
    const { leftArmX, rightArmX, shoulderY, armW } = anchors;
    const accentH = 3;
    const primary = colors.primary;

    if (dir === DIR_DOWN || dir === DIR_LEFT) {
        // Left shoulder pad
        _outlinedRect(ctx, leftArmX, shoulderY, armW + 1, accentH, primary);
    }
    if (dir === DIR_DOWN || dir === DIR_RIGHT) {
        // Right shoulder pad
        _outlinedRect(ctx, rightArmX - 1, shoulderY, armW + 1, accentH, primary);
    }
    if (dir === DIR_UP) {
        // Both shoulder pads from behind
        _outlinedRect(ctx, leftArmX, shoulderY, armW + 1, accentH, primary);
        _outlinedRect(ctx, rightArmX - 1, shoulderY, armW + 1, accentH, primary);
    }
}

// ── Stage 1: Eye Highlights ───────────────────────────────────────────────────

function _drawEyeHighlights(ctx, anchors, dir, colors) {
    const cx = anchors.headX + Math.floor(anchors.headW / 2);
    const eyeY = anchors.headY + Math.floor(anchors.headH * 0.4);

    ctx.fillStyle = '#ffffff';
    if (dir === DIR_DOWN) {
        // Two 2px white sparkle dots on each eye
        ctx.fillRect(cx - 7, eyeY + 1, 2, 2);
        ctx.fillRect(cx + 6, eyeY + 1, 2, 2);
    } else if (dir === DIR_LEFT) {
        ctx.fillRect(cx - 4, eyeY + 1, 2, 2);
    } else if (dir === DIR_RIGHT) {
        ctx.fillRect(cx + 3, eyeY + 1, 2, 2);
    }
    // DIR_UP: no eyes visible from behind
}

// ── Stage 2: Element Aura (drawn BEHIND body) ────────────────────────────────

function _drawElementAura(ctx, anchors, colors) {
    const cx = anchors.headX + Math.floor(anchors.headW / 2);
    const bodyTop = anchors.headY - 2;
    const bodyBottom = anchors.feetY + 2;
    const bodyH = bodyBottom - bodyTop;
    const bodyW = Math.max(anchors.headW, anchors.torsoW) + 8;

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = colors.primary;
    // Flat rectangular aura glow — cel-shaded, no gradients
    ctx.fillRect(
        Math.floor(cx - bodyW / 2),
        Math.floor(bodyTop - 2),
        bodyW,
        bodyH + 4
    );
    // Slightly wider band at torso level for visual weight
    ctx.fillRect(
        Math.floor(cx - bodyW / 2 - 2),
        anchors.torsoY,
        bodyW + 4,
        anchors.torsoH
    );
    ctx.restore();
}

// ── Stage 2: Crown / Crest ────────────────────────────────────────────────────

function _drawCrown(ctx, anchors, dir, element, colors) {
    if (dir === DIR_UP) return; // No crown visible from behind

    const cx = anchors.headX + Math.floor(anchors.headW / 2);
    const topY = anchors.headY - 5; // Above the head
    const key = (element || 'fire').toLowerCase();
    const p = colors.primary;
    const s = colors.secondary;

    switch (key) {
        case 'fire':
            // Three flame-colored triangles
            _tinyRect(ctx, cx - 4, topY, 2, 3, p);
            _tinyRect(ctx, cx - 4, topY - 1, 2, 1, s);
            _tinyRect(ctx, cx - 1, topY - 1, 2, 4, p);
            _tinyRect(ctx, cx - 1, topY - 2, 2, 1, s);
            _tinyRect(ctx, cx + 2, topY, 2, 3, p);
            _tinyRect(ctx, cx + 2, topY - 1, 2, 1, s);
            // Black outline base
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'water':
            // Wave crest: curved blue shape
            _tinyRect(ctx, cx - 4, topY + 1, 8, 2, p);
            _tinyRect(ctx, cx - 3, topY, 3, 1, s);
            _tinyRect(ctx, cx + 1, topY, 3, 1, s);
            _tinyRect(ctx, cx - 2, topY - 1, 2, 1, p);
            _tinyRect(ctx, cx + 2, topY - 1, 2, 1, p);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'plant':
            // Leaf crown: green leaf shapes radiating upward
            _tinyRect(ctx, cx - 1, topY - 2, 2, 5, p);
            _tinyRect(ctx, cx - 4, topY - 1, 3, 3, s);
            _tinyRect(ctx, cx + 1, topY - 1, 3, 3, s);
            _tinyRect(ctx, cx - 3, topY, 1, 1, p);
            _tinyRect(ctx, cx + 3, topY, 1, 1, p);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'ice':
            // Crystalline crown: angular light-blue shapes
            _tinyRect(ctx, cx - 1, topY - 2, 2, 2, s);
            _tinyRect(ctx, cx - 3, topY, 2, 2, p);
            _tinyRect(ctx, cx + 1, topY, 2, 2, p);
            _tinyRect(ctx, cx - 5, topY + 1, 2, 1, s);
            _tinyRect(ctx, cx + 3, topY + 1, 2, 1, s);
            _tinyRect(ctx, cx - 1, topY - 3, 2, 1, p);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'wind':
            // Feather crest: wispy feather shapes
            _tinyRect(ctx, cx - 1, topY - 2, 2, 4, p);
            _tinyRect(ctx, cx - 3, topY - 1, 2, 2, s);
            _tinyRect(ctx, cx + 1, topY - 1, 2, 2, s);
            _tinyRect(ctx, cx - 4, topY, 1, 2, p);
            _tinyRect(ctx, cx + 4, topY, 1, 2, p);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'earth':
            // Stone crown: blocky stone shapes
            _tinyRect(ctx, cx - 4, topY, 3, 3, p);
            _tinyRect(ctx, cx - 1, topY - 1, 2, 4, s);
            _tinyRect(ctx, cx + 1, topY, 3, 3, p);
            _tinyRect(ctx, cx - 3, topY + 1, 1, 2, s);
            _tinyRect(ctx, cx + 3, topY + 1, 1, 2, s);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'electric':
            // Lightning bolt crown: zigzag yellow shapes
            _tinyRect(ctx, cx - 1, topY - 3, 2, 2, s);
            _tinyRect(ctx, cx + 1, topY - 1, 2, 2, p);
            _tinyRect(ctx, cx - 1, topY + 1, 2, 2, p);
            _tinyRect(ctx, cx - 3, topY - 1, 2, 3, s);
            _tinyRect(ctx, cx + 2, topY - 2, 2, 3, s);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'dark':
            // Shadow horn tips: two dark horn shapes
            _tinyRect(ctx, cx - 5, topY - 1, 2, 4, p);
            _tinyRect(ctx, cx - 5, topY - 2, 2, 1, s);
            _tinyRect(ctx, cx + 3, topY - 1, 2, 4, p);
            _tinyRect(ctx, cx + 3, topY - 2, 2, 1, s);
            _tinyRect(ctx, cx - 2, topY + 2, 4, 1, p);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'light':
            // Halo ring: flat outlined ellipse approximation
            _tinyRect(ctx, cx - 5, topY - 1, 10, 1, s);
            _tinyRect(ctx, cx - 6, topY, 1, 1, p);
            _tinyRect(ctx, cx + 5, topY, 1, 1, p);
            _tinyRect(ctx, cx - 5, topY + 1, 10, 1, s);
            _tinyRect(ctx, cx - 5, topY - 1, 10, 1, '#111111');
            _tinyRect(ctx, cx - 5, topY + 1, 10, 1, '#111111');
            // Inner bright fill
            _tinyRect(ctx, cx - 4, topY, 8, 1, s);
            break;

        case 'fairy':
            // Sparkle star crown: three small star points
            _tinyRect(ctx, cx - 1, topY - 2, 2, 1, s);
            _tinyRect(ctx, cx - 2, topY - 1, 4, 1, p);
            _tinyRect(ctx, cx - 1, topY, 2, 1, s);
            _tinyRect(ctx, cx - 5, topY, 1, 1, p);
            _tinyRect(ctx, cx + 4, topY, 1, 1, p);
            _tinyRect(ctx, cx - 4, topY - 1, 1, 1, s);
            _tinyRect(ctx, cx + 3, topY - 1, 1, 1, s);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'solar':
            // Sun ray crown: central circle with rays
            _tinyRect(ctx, cx - 2, topY - 1, 4, 3, p);
            _tinyRect(ctx, cx - 1, topY - 3, 2, 1, s);
            _tinyRect(ctx, cx - 1, topY + 2, 2, 1, s);
            _tinyRect(ctx, cx - 5, topY, 2, 1, s);
            _tinyRect(ctx, cx + 3, topY, 2, 1, s);
            _tinyRect(ctx, cx - 4, topY - 2, 1, 1, p);
            _tinyRect(ctx, cx + 3, topY - 2, 1, 1, p);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'lunar':
            // Crescent moon crown
            _tinyRect(ctx, cx - 1, topY - 2, 4, 4, p);
            _tinyRect(ctx, cx + 1, topY - 1, 2, 2, s);
            // Carve out inner part using destination-out compositing for crescent shape
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = '#000000';
            ctx.fillRect(Math.floor(cx), Math.floor(topY - 1), 2, 2);
            ctx.restore();
            // Redraw as crescent
            _tinyRect(ctx, cx - 2, topY - 1, 2, 3, p);
            _tinyRect(ctx, cx - 1, topY - 2, 3, 1, s);
            _tinyRect(ctx, cx, topY + 2, 2, 1, p);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'metal':
            // Gear/cog crown: blocky interlocking teeth
            _tinyRect(ctx, cx - 3, topY, 6, 3, p);
            _tinyRect(ctx, cx - 4, topY + 1, 1, 1, s);
            _tinyRect(ctx, cx + 3, topY + 1, 1, 1, s);
            _tinyRect(ctx, cx - 2, topY - 1, 1, 1, s);
            _tinyRect(ctx, cx + 1, topY - 1, 1, 1, s);
            _tinyRect(ctx, cx - 1, topY - 2, 2, 1, p);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        case 'poison':
            // Dripping crown: flat drip shapes
            _tinyRect(ctx, cx - 4, topY, 8, 2, p);
            _tinyRect(ctx, cx - 3, topY + 2, 1, 2, s);
            _tinyRect(ctx, cx, topY + 2, 1, 3, p);
            _tinyRect(ctx, cx + 3, topY + 2, 1, 2, s);
            _tinyRect(ctx, cx - 2, topY - 1, 4, 1, s);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;

        default:
            // Generic small crown
            _tinyRect(ctx, cx - 3, topY, 6, 3, p);
            _tinyRect(ctx, cx - 1, topY - 1, 2, 1, s);
            _tinyRect(ctx, cx - 5, topY + 3, 10, 1, '#111111');
            break;
    }
}

// ── Stage 2: Element Trail Particles ──────────────────────────────────────────

function _drawElementTrail(ctx, anchors, frameIndex, colors) {
    const feetY = anchors.feetY;
    const cx = anchors.headX + Math.floor(anchors.headW / 2);

    // 2-3 tiny squares that shift position based on frameIndex
    const offsets = [
        [  -6 + (frameIndex % 4),       0 ],
        [   3 - (frameIndex % 3),      -1 ],
        [  -1 + ((frameIndex + 2) % 3),  1 ],
    ];

    const particleColors = [colors.primary, colors.secondary, colors.primary];

    for (let i = 0; i < 3; i++) {
        const px = cx + offsets[i][0];
        const py = feetY + offsets[i][1];
        _tinyRect(ctx, px, py, 2, 2, particleColors[i]);
    }
}

// ── Stage 2: Enhanced Body Marks ──────────────────────────────────────────────

function _drawEnhancedBodyMarks(ctx, anchors, dir, colors) {
    const { torsoX, torsoY, torsoW, torsoH } = anchors;

    if (dir === DIR_UP) return;

    // Small element-colored accent line on the torso
    const markY = torsoY + Math.floor(torsoH / 2);

    if (dir === DIR_DOWN) {
        _tinyRect(ctx, torsoX + 2, markY, torsoW - 4, 1, colors.secondary);
        _tinyRect(ctx, torsoX + 3, markY + 2, torsoW - 6, 1, colors.primary);
    } else {
        // Side views: single accent line
        _tinyRect(ctx, torsoX + 1, markY, torsoW - 2, 1, colors.secondary);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Applies evolution-stage visual enhancements to a race sprite.
 * Called AFTER the base race body is drawn, BEFORE equipment.
 *
 * Stage 0 (Base): No modifications — the base race body is sufficient
 * Stage 1 (Mid): Adds element aura marks + slightly enhanced features
 * Stage 2 (Final): Adds full element aura, glowing marks, crown/crest accents
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} anchors — body anchor positions (from RaceBodyRenderer)
 * @param {number} dir — 0=down, 1=left, 2=right, 3=up
 * @param {number} stage — 0, 1, or 2
 * @param {string} element — element type: "fire", "water", "plant", "ice", "wind",
 *     "earth", "electric", "dark", "light", "fairy", "solar", "lunar", "metal", "poison"
 * @param {number} frameIndex — current animation frame (0-3) for subtle effects
 */
export function drawEvolutionEffects(ctx, anchors, dir, stage, element, frameIndex) {
    // Stage 0: no visual modifications
    if (stage <= 0) return;

    const colors = _getColors(element);
    const cx = anchors.headX + Math.floor(anchors.headW / 2);
    const cheekY = anchors.headY + Math.floor(anchors.headH * 0.5);

    if (stage === 1) {
        // ── Stage 1 (Mid-Evolution) ──────────────────────────────

        // 1. Element marks on cheeks/face
        _drawElementMarks(ctx, cx, cheekY, dir, element, colors, false);

        // 2. Shoulder accents
        _drawShoulderAccents(ctx, anchors, dir, colors);

        // 3. Intensified eye highlights (2px white sparkle)
        _drawEyeHighlights(ctx, anchors, dir, colors);

    } else if (stage >= 2) {
        // ── Stage 2 (Final Evolution) ────────────────────────────

        // 1. Element aura — semi-transparent glow around body
        //    NOTE: Drawn here (after body) as an overlay glow at low alpha.
        //    For a true behind-body aura, the caller should invoke
        //    drawEvolutionAura() before drawing the body.
        _drawElementAura(ctx, anchors, colors);

        // 2. Crown/crest on top of head
        _drawCrown(ctx, anchors, dir, element, colors);

        // 3. Element trail particles at feet
        _drawElementTrail(ctx, anchors, frameIndex, colors);

        // 4. Enhanced facial marks (larger than stage 1)
        _drawElementMarks(ctx, cx, cheekY, dir, element, colors, true);

        // 5. Enhanced body marks on torso
        _drawEnhancedBodyMarks(ctx, anchors, dir, colors);

        // 6. Shoulder accents (carried over from stage 1)
        _drawShoulderAccents(ctx, anchors, dir, colors);

        // 7. Eye highlights (carried over from stage 1)
        _drawEyeHighlights(ctx, anchors, dir, colors);
    }
}

/**
 * Draws ONLY the element aura glow — intended to be called BEFORE the body
 * is drawn so the aura renders behind the character. Stage 2 only.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} anchors — body anchor positions
 * @param {number} stage — 0, 1, or 2
 * @param {string} element — element type
 */
export function drawEvolutionAura(ctx, anchors, stage, element) {
    if (stage < 2) return;
    const colors = _getColors(element);
    _drawElementAura(ctx, anchors, colors);
}

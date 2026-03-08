/**
 * EquipmentRenderers.js — Per-item unique pixel-art rendering functions for all
 * equipment slot types. Called by HumanoidSpriteSystem to draw visually distinct
 * equipment overlays on 64×64 sprites.
 *
 * Each renderer accepts a visual config object from EquipmentVisualConfig.js and
 * draws unique pixel art based on the item's shape, colors, and effects.
 */

// Direction constants (match HumanoidSpriteSystem)
const DIR_DOWN  = 0;
const DIR_LEFT  = 1;
const DIR_RIGHT = 2;
const DIR_UP    = 3;

// ── Doodle Art Style Helpers ─────────────────────────────────────────────────

/** Doodle art style: Draw a hand-drawn wobbly line for equipment outlines */
function _eqDrawDoodleLine(ctx, x1, y1, x2, y2, color = '#2D2D2D', lineWidth = 1.5) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) { ctx.restore(); return; }
    const segments = Math.max(3, Math.floor(dist / 3));

    ctx.beginPath();
    ctx.moveTo(x1, y1);

    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const px = x1 + dx * t;
        const py = y1 + dy * t;
        const nx = -dy / dist;
        const ny = dx / dist;
        const wobble = Math.sin(t * Math.PI * 3) * 0.8;
        ctx.lineWidth = lineWidth + Math.sin(t * Math.PI * 2) * 0.4;
        ctx.lineTo(px + nx * wobble, py + ny * wobble);
    }

    ctx.stroke();
    ctx.restore();
}

/** Doodle art style: Draw wobbly outline around a rectangle for equipment */
function _eqDrawDoodleRectOutline(ctx, x, y, w, h, color = '#2D2D2D', lineWidth = 1.5) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    _eqDrawDoodleLine(ctx, fx, fy, fx + w, fy, color, lineWidth);
    _eqDrawDoodleLine(ctx, fx + w, fy, fx + w, fy + h, color, lineWidth);
    _eqDrawDoodleLine(ctx, fx + w, fy + h, fx, fy + h, color, lineWidth);
    _eqDrawDoodleLine(ctx, fx, fy + h, fx, fy, color, lineWidth);
}

/** Doodle art style: Add hatching/crosshatch shading overlay for equipment */
function _eqDrawDoodleHatching(ctx, x, y, width, height, color = '#2D2D2D', density = 0.35) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';

    const spacing = Math.floor(4 / density);
    ctx.beginPath();
    // Primary hatching lines (top-left to bottom-right)
    for (let offset = -height; offset < width + height; offset += spacing) {
        ctx.moveTo(x + offset, y);
        ctx.lineTo(x + offset - height, y + height);
    }
    ctx.stroke();
    ctx.restore();
}

/** Doodle art style: Draw a small star doodle (replaces glow sparkle) */
function _eqDrawDoodleStar(ctx, cx, cy, size, color = '#2D2D2D') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.6;

    const s = size || 3;
    ctx.beginPath();
    // Vertical line
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx, cy + s);
    // Horizontal line
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx + s, cy);
    // Diagonal lines (shorter)
    const ds = s * 0.7;
    ctx.moveTo(cx - ds, cy - ds);
    ctx.lineTo(cx + ds, cy + ds);
    ctx.moveTo(cx + ds, cy - ds);
    ctx.lineTo(cx - ds, cy + ds);
    ctx.stroke();
    ctx.restore();
}

/** Doodle art style: Draw a scribble circle (replaces glow effects) */
function _eqDrawDoodleScribbleCircle(ctx, cx, cy, radius, color = '#2D2D2D') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.4;

    ctx.beginPath();
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const wobble = Math.sin(angle * 3) * 0.6;
        const px = cx + (radius + wobble) * Math.cos(angle);
        const py = cy + (radius + wobble) * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEAPON RENDERER — 20 unique weapon shapes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Draw a weapon using per-item visual config.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} wx - Weapon X position
 * @param {number} wy - Weapon Y position
 * @param {number} dir - Direction (0-3)
 * @param {Object} config - Visual config from EquipmentVisualConfig
 * @param {Object} colors - Element skin colors
 */
export function drawWeaponByConfig(ctx, wx, wy, dir, config, colors) {
    if (!config) return;
    const shape = config.shape || 'sword';
    const bc = config.bladeColor || '#aab0b8';
    const bh = config.bladeHighlight || '#dde0e8';
    const hc = config.handleColor || '#553311';
    const gc = config.guardColor || '#887744';
    const gl = config.glowColor || null;
    const bLen = config.bladeLength || 20;
    const bW = config.bladeWidth || 4;

    // Doodle art style: replace glow rect with scribble circle and star doodles
    if (gl) {
        _eqDrawDoodleScribbleCircle(ctx, wx + bW / 2, wy - bLen / 2, bLen * 0.4, gl);
        _eqDrawDoodleStar(ctx, wx + bW / 2, wy - bLen + 2, 3, gl);
    }

    const flip = dir === DIR_LEFT ? -1 : 1;
    const ox = dir === DIR_LEFT ? -2 : 0;

    switch (shape) {
        case 'sword':
            _drawSword(ctx, wx + ox, wy, bc, bh, hc, gc, bLen, bW);
            break;
        case 'broadsword':
            _drawBroadsword(ctx, wx + ox, wy, bc, bh, hc, gc, bLen);
            break;
        case 'katana':
            _drawKatana(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'scimitar':
            _drawScimitar(ctx, wx + ox, wy, bc, bh, hc, gc, bLen);
            break;
        case 'dagger':
            _drawDagger(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'axe':
            _drawAxe(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'greataxe':
            _drawGreataxe(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'battleaxe':
            _drawBattleaxe(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'staff':
            _drawStaff(ctx, wx + ox, wy, bc, bh, hc, gc, bLen);
            break;
        case 'wand':
            _drawWand(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'scepter':
            _drawScepter(ctx, wx + ox, wy, bc, bh, hc, gc, bLen);
            break;
        case 'spear':
            _drawSpear(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'lance':
            _drawLance(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'halberd':
            _drawHalberd(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'crossbow':
            _drawCrossbow(ctx, wx + ox, wy, bc, bh, hc, gc);
            break;
        case 'longbow':
            _drawLongbow(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'mace':
            _drawMace(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'hammer':
            _drawHammer(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'flail':
            _drawFlail(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        case 'scythe':
            _drawScythe(ctx, wx + ox, wy, bc, bh, hc, bLen);
            break;
        default:
            _drawSword(ctx, wx + ox, wy, bc, bh, hc, gc, bLen, bW);
    }

    // Doodle art style: particles as tiny star doodles instead of square dots
    if (config.hasParticles && config.particleColor) {
        const seed = (wx * 7 + wy * 13) % 5;
        _eqDrawDoodleStar(ctx, wx - 4 + seed, wy - bLen + 4, 2, config.particleColor);
        _eqDrawDoodleStar(ctx, wx + 6 - seed, wy - bLen + 10, 2, config.particleColor);
        if (bLen > 20) _eqDrawDoodleStar(ctx, wx + seed - 2, wy - bLen + 16, 2, config.particleColor);
    }
}

// ── Individual weapon shape functions ──────────────────────────────────────

function _drawSword(ctx, x, y, bc, bh, hc, gc, len, w) {
    // Blade
    ctx.fillStyle = bc;
    ctx.fillRect(x, y - len, w, len);
    ctx.fillRect(x - 2, y - len - 2, w + 4, 4); // tip
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - len + 2, 2, len - 4);
    // Guard
    ctx.fillStyle = gc;
    ctx.fillRect(x - 4, y, 12, 4);
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y + 4, w, 8);
}

function _drawBroadsword(ctx, x, y, bc, bh, hc, gc, len) {
    // Wide blade (6px)
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y - len + 4, 6, len - 4);
    ctx.fillRect(x, y - len, 2, 4); // tip point
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 2, y - len + 6, 2, len - 8);
    // Fuller (center detail)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x, y - len + 8, 2, len - 12);
    // Guard (thick)
    ctx.fillStyle = gc;
    ctx.fillRect(x - 6, y, 16, 4);
    ctx.fillRect(x - 4, y - 2, 12, 2);
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y + 4, 4, 8);
    // Pommel
    ctx.fillStyle = gc;
    ctx.fillRect(x - 2, y + 12, 6, 4);
}

function _drawKatana(ctx, x, y, bc, bh, hc, len) {
    // Curved blade (slight offset per pixel row)
    ctx.fillStyle = bc;
    for (let i = 0; i < len; i++) {
        const curve = i < 6 ? 0 : Math.floor((i - 6) * 0.15);
        ctx.fillRect(x + curve, y - len + i, 4, 1);
    }
    // Tip
    ctx.fillRect(x, y - len - 2, 2, 2);
    // Highlight
    ctx.fillStyle = bh;
    for (let i = 2; i < len - 2; i++) {
        const curve = i < 6 ? 0 : Math.floor((i - 6) * 0.15);
        ctx.fillRect(x + curve + 2, y - len + i, 2, 1);
    }
    // Handle (wrapped, no guard)
    ctx.fillStyle = hc;
    ctx.fillRect(x, y, 4, 10);
    // Wrap detail
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, y + 2, 4, 2);
    ctx.fillRect(x, y + 6, 4, 2);
}

function _drawScimitar(ctx, x, y, bc, bh, hc, gc, len) {
    // Curved wider-at-tip blade
    ctx.fillStyle = bc;
    for (let i = 0; i < len; i++) {
        const w = i < len / 2 ? 4 : 6;
        const curve = Math.floor(i * 0.2);
        ctx.fillRect(x - curve, y - len + i, w, 1);
    }
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - len + 2, 2, len / 2);
    // Guard
    ctx.fillStyle = gc;
    ctx.fillRect(x - 2, y, 8, 4);
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y + 4, 4, 8);
}

function _drawDagger(ctx, x, y, bc, bh, hc, len) {
    const dLen = Math.min(len, 16);
    // Short blade
    ctx.fillStyle = bc;
    ctx.fillRect(x, y - dLen, 2, dLen);
    ctx.fillRect(x, y - dLen - 2, 2, 2); // tip
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - dLen + 2, 2, 2);
    // Handle (no guard)
    ctx.fillStyle = hc;
    ctx.fillRect(x - 2, y, 6, 6);
}

function _drawAxe(ctx, x, y, bc, bh, hc, len) {
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 8, 4, 28);
    // Axe head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 6, y - 14, 12, 10);
    ctx.fillRect(x - 8, y - 12, 4, 6);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 6, y - 12, 2, 6);
    // Edge detail
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x - 8, y - 10, 2, 2);
}

function _drawGreataxe(ctx, x, y, bc, bh, hc, len) {
    // Thick shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 4, 4, 28);
    // Double axe heads
    ctx.fillStyle = bc;
    ctx.fillRect(x - 8, y - 12, 8, 12);
    ctx.fillRect(x + 4, y - 12, 8, 12);
    ctx.fillRect(x - 10, y - 10, 4, 8);
    ctx.fillRect(x + 10, y - 10, 4, 8);
    // Highlights
    ctx.fillStyle = bh;
    ctx.fillRect(x - 8, y - 10, 2, 8);
    ctx.fillRect(x + 4, y - 10, 2, 8);
}

function _drawBattleaxe(ctx, x, y, bc, bh, hc, len) {
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 6, 4, 28);
    // Large single head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 8, y - 14, 14, 12);
    ctx.fillRect(x - 10, y - 12, 4, 8);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 8, y - 12, 2, 8);
    // Blade edge
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x - 10, y - 10, 2, 4);
}

function _drawStaff(ctx, x, y, bc, bh, hc, gc, len) {
    // Shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 20, 4, 36);
    // Shaft detail
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y - 8, 2, 20);
    // Crystal/orb on top
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y - 26, 8, 8);
    ctx.fillRect(x, y - 28, 4, 2);
    // Inner glow
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - 24, 4, 4);
    // Glow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = bc;
    ctx.fillRect(x - 4, y - 28, 12, 12);
    ctx.restore();
    // Mounting
    ctx.fillStyle = gc;
    ctx.fillRect(x - 2, y - 20, 8, 2);
}

function _drawWand(ctx, x, y, bc, bh, hc, len) {
    // Short shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 8, 4, 20);
    // Glowing tip
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y - 12, 6, 6);
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - 10, 2, 2);
    // Glow
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = bc;
    ctx.fillRect(x - 4, y - 14, 10, 10);
    ctx.restore();
}

function _drawScepter(ctx, x, y, bc, bh, hc, gc, len) {
    // Ornate shaft
    ctx.fillStyle = gc;
    ctx.fillRect(x, y - 12, 4, 24);
    // Ring details
    ctx.fillStyle = bh;
    ctx.fillRect(x - 2, y - 4, 8, 2);
    ctx.fillRect(x - 2, y + 4, 8, 2);
    // Large gemstone (8×10)
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y - 20, 8, 10);
    ctx.fillRect(x, y - 22, 4, 2);
    ctx.fillRect(x, y - 10, 4, 2);
    // Gem highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 2, y - 18, 4, 4);
    // Glow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = bc;
    ctx.fillRect(x - 6, y - 24, 16, 18);
    ctx.restore();
}

function _drawSpear(ctx, x, y, bc, bh, hc, len) {
    // Long shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 12, 4, 32);
    // Pointed head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y - 20, 8, 10);
    ctx.fillRect(x, y - 22, 4, 4);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - 20, 2, 8);
}

function _drawLance(ctx, x, y, bc, bh, hc, len) {
    // Longer shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 8, 4, 32);
    // Wide pointed head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 4, y - 18, 10, 12);
    ctx.fillRect(x - 2, y - 22, 6, 6);
    ctx.fillRect(x, y - 24, 2, 4);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 2, y - 18, 2, 10);
    // Handguard
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x - 2, y - 8, 8, 2);
}

function _drawHalberd(ctx, x, y, bc, bh, hc, len) {
    // Long shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 12, 4, 32);
    // Axe head (one side)
    ctx.fillStyle = bc;
    ctx.fillRect(x - 8, y - 18, 10, 10);
    ctx.fillRect(x - 10, y - 16, 4, 6);
    // Spear point above
    ctx.fillRect(x, y - 24, 4, 8);
    ctx.fillRect(x, y - 26, 2, 2);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 8, y - 16, 2, 6);
}

function _drawCrossbow(ctx, x, y, bc, bh, hc, gc) {
    // Stock
    ctx.fillStyle = hc;
    ctx.fillRect(x - 2, y, 12, 4);
    ctx.fillRect(x + 6, y + 2, 4, 8);
    // Bow limbs
    ctx.fillStyle = bc;
    ctx.fillRect(x - 8, y - 6, 4, 12);
    ctx.fillRect(x + 10, y - 6, 4, 12);
    // String
    ctx.fillStyle = bh;
    ctx.fillRect(x - 6, y - 6, 18, 2);
    // Trigger
    ctx.fillStyle = gc || hc;
    ctx.fillRect(x + 2, y + 4, 2, 4);
}

function _drawLongbow(ctx, x, y, bc, bh, hc, len) {
    // Curved bow body
    ctx.fillStyle = hc;
    for (let i = 0; i < 28; i++) {
        const curve = Math.floor(Math.sin((i / 27) * Math.PI) * 6);
        ctx.fillRect(x - curve, y - 14 + i, 4, 1);
    }
    // String
    ctx.fillStyle = bh;
    ctx.fillRect(x + 2, y - 14, 2, 28);
    // Grip
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y, 6, 4);
}

function _drawMace(ctx, x, y, bc, bh, hc, len) {
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y, 4, 16);
    // Spiked ball head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 4, y - 10, 10, 10);
    // Spikes (4 directional)
    ctx.fillRect(x, y - 12, 2, 2);       // top
    ctx.fillRect(x - 6, y - 6, 2, 2);    // left
    ctx.fillRect(x + 6, y - 6, 2, 2);    // right
    ctx.fillRect(x, y, 2, 2);            // bottom
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 2, y - 8, 4, 4);
}

function _drawHammer(ctx, x, y, bc, bh, hc, len) {
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 4, 4, 24);
    // Flat heavy head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 6, y - 12, 16, 8);
    // Top detail
    ctx.fillStyle = bh;
    ctx.fillRect(x - 6, y - 12, 16, 2);
    // Edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x - 6, y - 10, 2, 6);
}

function _drawFlail(ctx, x, y, bc, bh, hc, len) {
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y + 4, 4, 10);
    // Chain (2px dots)
    ctx.fillStyle = '#999999';
    ctx.fillRect(x, y, 2, 2);
    ctx.fillRect(x + 2, y - 2, 2, 2);
    ctx.fillRect(x, y - 4, 2, 2);
    ctx.fillRect(x + 2, y - 6, 2, 2);
    // Ball
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y - 14, 8, 8);
    // Spikes
    ctx.fillRect(x, y - 16, 4, 2);
    ctx.fillRect(x - 4, y - 12, 2, 4);
    ctx.fillRect(x + 6, y - 12, 2, 4);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - 12, 2, 4);
}

function _drawScythe(ctx, x, y, bc, bh, hc, len) {
    // Long shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 12, 4, 32);
    // Curved blade at top
    ctx.fillStyle = bc;
    ctx.fillRect(x + 2, y - 20, 2, 10);
    ctx.fillRect(x + 4, y - 22, 2, 10);
    ctx.fillRect(x + 6, y - 24, 2, 8);
    ctx.fillRect(x + 8, y - 24, 2, 6);
    ctx.fillRect(x + 10, y - 22, 2, 4);
    // Mount
    ctx.fillRect(x - 2, y - 16, 6, 4);
    // Highlight (blade edge)
    ctx.fillStyle = bh;
    ctx.fillRect(x + 4, y - 22, 2, 2);
    ctx.fillRect(x + 6, y - 24, 2, 2);
    ctx.fillRect(x + 8, y - 24, 2, 2);
}


// ═══════════════════════════════════════════════════════════════════════════════
// HELMET RENDERER — 13 unique helmet styles
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Draw a helmet using per-item visual config.
 */
export function drawHelmetByConfig(ctx, x, y, w, h, config, colors) {
    if (!config) return;
    const style = config.style || 'cap';
    const mc = config.mainColor || '#888888';
    const tc = config.trimColor || '#666666';
    const gem = config.gemColor || null;
    const ht = config.height || 6;
    const hasVisor = config.hasVisor || false;
    const vc = config.visorColor || '#444444';
    const gl = config.glowColor || null;
    const hasPlume = config.hasPlume || false;
    const pc = config.plumeColor || '#cc3333';

    // Doodle art style: replace glow rect with scribble circle
    if (gl) {
        _eqDrawDoodleScribbleCircle(ctx, x + w / 2, y + ht / 2, Math.max(w, ht) * 0.5, gl);
    }

    switch (style) {
        case 'cap':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht);
            ctx.fillRect(x + 2, y - 2, w - 4, 2);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + ht - 2, w, 2);
            break;

        case 'helm':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht + 2);
            ctx.fillRect(x + 2, y - 2, w - 4, 2);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y, w, 2); // top trim
            ctx.fillRect(x, y + ht, w, 2); // bottom trim
            if (hasVisor) {
                ctx.fillStyle = vc;
                ctx.fillRect(x + 2, y + Math.floor(ht * 0.6), w - 4, 2);
            }
            break;

        case 'circlet':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y + 2, w, 4);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2) - 2, y, 4, 4);
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillRect(x + Math.floor(w / 2) - 2, y, 2, 2);
            }
            break;

        case 'crown':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y + 2, w, ht - 2);
            // Three peaks
            ctx.fillRect(x + 2, y - 2, 2, 4);
            ctx.fillRect(x + Math.floor(w / 2), y - 4, 2, 6);
            ctx.fillRect(x + w - 4, y - 2, 2, 4);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + ht - 2, w, 2);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2), y, 2, 2);
            }
            break;

        case 'hood':
            ctx.fillStyle = mc;
            ctx.fillRect(x - 2, y, w + 4, ht + 4);
            ctx.fillRect(x, y - 2, w, 2);
            // Draping sides
            ctx.fillRect(x - 2, y + ht, 4, 6);
            ctx.fillRect(x + w - 2, y + ht, 4, 6);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + ht + 2, w, 2);
            break;

        case 'visor':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht + 2);
            ctx.fillRect(x + 2, y - 2, w - 4, 2);
            // Eye slit
            ctx.fillStyle = '#111111';
            ctx.fillRect(x + 2, y + Math.floor(ht * 0.4), w - 4, 2);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + ht, w, 2);
            break;

        case 'turban':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht + 2);
            ctx.fillRect(x + 2, y - 4, w - 4, 4);
            ctx.fillRect(x + 4, y - 6, w - 8, 2);
            // Wrap detail
            ctx.fillStyle = tc;
            ctx.fillRect(x + 2, y + 2, w - 4, 2);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2), y - 2, 2, 2);
            }
            break;

        case 'tiara':
            ctx.fillStyle = mc;
            ctx.fillRect(x + 2, y + 2, w - 4, 2);
            // Central element
            ctx.fillRect(x + Math.floor(w / 2) - 2, y - 2, 4, 6);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2), y - 2, 2, 2);
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fillRect(x + Math.floor(w / 2), y - 2, 2, 2);
            }
            break;

        case 'antlers':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y + 2, w, 4); // base band
            // Left antler
            ctx.fillRect(x - 2, y - 2, 2, 6);
            ctx.fillRect(x - 4, y - 6, 2, 6);
            ctx.fillRect(x - 6, y - 8, 2, 4);
            // Right antler
            ctx.fillRect(x + w, y - 2, 2, 6);
            ctx.fillRect(x + w + 2, y - 6, 2, 6);
            ctx.fillRect(x + w + 4, y - 8, 2, 4);
            if (gem) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = gem;
                ctx.fillRect(x - 6, y - 8, 2, 2);
                ctx.fillRect(x + w + 4, y - 8, 2, 2);
                ctx.restore();
            }
            break;

        case 'diadem':
            ctx.fillStyle = mc;
            ctx.fillRect(x + 2, y + 2, w - 4, 2);
            // Vertical central element
            ctx.fillRect(x + Math.floor(w / 2), y - 4, 2, 8);
            ctx.fillStyle = tc;
            ctx.fillRect(x + Math.floor(w / 2) - 2, y - 2, 6, 2);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2), y - 2, 2, 2);
            }
            break;

        case 'cowl':
            ctx.fillStyle = mc;
            ctx.fillRect(x - 2, y - 2, w + 4, ht + 4);
            ctx.fillRect(x, y - 4, w, 2);
            // Hood shadow
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + ht, w, 2);
            ctx.fillRect(x - 2, y + 2, 2, ht);
            ctx.fillRect(x + w, y + 2, 2, ht);
            break;

        case 'veil':
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht + 6);
            ctx.restore();
            // Headband
            ctx.fillStyle = tc;
            ctx.fillRect(x, y, w, 2);
            break;

        case 'coronet':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y + 2, w, 4);
            // Two peaks (shorter than crown)
            ctx.fillRect(x + 4, y, 2, 2);
            ctx.fillRect(x + w - 6, y, 2, 2);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + 4, w, 2);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2), y, 2, 2);
            }
            break;

        default:
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht);
    }

    // Plume
    if (hasPlume) {
        ctx.fillStyle = pc;
        ctx.fillRect(x + w - 2, y - 6, 4, 8);
        ctx.fillRect(x + w, y - 8, 2, 2);
    }

    // Doodle art style: hatching overlay and wobbly outline on helmet
    _eqDrawDoodleHatching(ctx, x, y, w, ht, tc || '#2D2D2D', 0.3);
    _eqDrawDoodleRectOutline(ctx, x, y, w, ht, tc || '#2D2D2D', 1.2);
}


// ═══════════════════════════════════════════════════════════════════════════════
// CHEST ARMOR RENDERER — 11 unique chest styles
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Draw chest armor using per-item visual config.
 */
export function drawChestByConfig(ctx, x, y, w, h, config, colors) {
    if (!config) return;
    const style = config.style || 'tunic';
    const mc = config.mainColor || '#888877';
    const tc = config.trimColor || '#666655';
    const ac = config.accentColor || '#777766';
    const hasSh = config.hasShoulders || false;
    const sc = config.shoulderColor || mc;
    const hasBelt = config.hasBelt || false;
    const beltC = config.beltColor || '#555544';
    const gl = config.glowColor || null;
    const pattern = config.pattern || 'none';

    // Doodle art style: replace glow rect with scribble circle
    if (gl) {
        _eqDrawDoodleScribbleCircle(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 0.4, gl);
    }

    // Base fill by style
    switch (style) {
        case 'tunic':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y, 2, h); // left edge
            ctx.fillRect(x + w - 2, y, 2, h); // right edge
            break;

        case 'vest':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = ac;
            ctx.fillRect(x + Math.floor(w * 0.3), y, Math.floor(w * 0.4), h);
            break;

        case 'robe':
            ctx.fillStyle = mc;
            ctx.fillRect(x - 2, y, w + 4, h + 2);
            ctx.fillStyle = tc;
            ctx.fillRect(x - 2, y + h, w + 4, 2);
            ctx.fillStyle = ac;
            ctx.fillRect(Math.floor(x + w / 2) - 2, y, 4, h);
            break;

        case 'plate':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Horizontal segments
            ctx.fillStyle = tc;
            for (let i = 4; i < h; i += 4) {
                ctx.fillRect(x, y + i, w, 2);
            }
            break;

        case 'mail':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Chain dots
            ctx.fillStyle = ac;
            for (let iy = 0; iy < h; iy += 4) {
                for (let ix = (iy % 8 === 0 ? 0 : 2); ix < w; ix += 4) {
                    ctx.fillRect(x + ix, y + iy, 2, 2);
                }
            }
            break;

        case 'cuirass':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Curved center plate
            ctx.fillStyle = ac;
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
            ctx.fillStyle = tc;
            ctx.fillRect(Math.floor(x + w / 2), y, 2, h);
            break;

        case 'cloak':
            ctx.fillStyle = mc;
            ctx.fillRect(x - 4, y, w + 8, h);
            ctx.fillStyle = tc;
            ctx.fillRect(x - 4, y + h - 2, w + 8, 2);
            ctx.fillStyle = ac;
            ctx.fillRect(x, y, w, h - 2);
            break;

        case 'harness':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // X-pattern straps
            ctx.fillStyle = tc;
            for (let i = 0; i < Math.min(w, h); i++) {
                const px1 = x + Math.floor(i * w / h);
                const px2 = x + w - 2 - Math.floor(i * w / h);
                ctx.fillRect(px1, y + i, 2, 2);
                ctx.fillRect(px2, y + i, 2, 2);
            }
            break;

        case 'mantle':
            // Heavy shoulders
            ctx.fillStyle = mc;
            ctx.fillRect(x - 2, y, w + 4, 6);
            // Lighter body
            ctx.fillStyle = ac;
            ctx.fillRect(x, y + 6, w, h - 6);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + h - 2, w, 2);
            break;

        case 'jerkin':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // V-neck detail
            ctx.fillStyle = ac;
            ctx.fillRect(Math.floor(x + w / 2) - 2, y, 2, 4);
            ctx.fillRect(Math.floor(x + w / 2), y, 2, 4);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + h - 2, w, 2);
            break;

        case 'breastplate':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Raised center plate
            ctx.fillStyle = ac;
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + 2, y + 2, Math.floor(w * 0.4), h - 4);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + h - 2, w, 2);
            break;

        default:
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
    }

    // Apply pattern overlay
    _applyPattern(ctx, x, y, w, h, pattern, ac);

    // Shoulders
    if (hasSh) {
        ctx.fillStyle = sc;
        ctx.fillRect(x - 2, y, 4, 4);
        ctx.fillRect(x + w - 2, y, 4, 4);
    }

    // Belt
    if (hasBelt) {
        ctx.fillStyle = beltC;
        ctx.fillRect(x, y + h - 2, w, 2);
    }

    // Doodle art style: hatching overlay and wobbly outline on chest armor
    _eqDrawDoodleHatching(ctx, x, y, w, h, tc || '#2D2D2D', 0.3);
    _eqDrawDoodleRectOutline(ctx, x, y, w, h, tc || '#2D2D2D', 1.2);
}

function _applyPattern(ctx, x, y, w, h, pattern, color) {
    if (pattern === 'none') return;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';

    switch (pattern) {
        case 'scales':
            for (let iy = 2; iy < h - 2; iy += 4) {
                for (let ix = (iy % 8 < 4 ? 0 : 2); ix < w - 2; ix += 4) {
                    ctx.fillRect(x + ix, y + iy, 4, 2);
                }
            }
            break;
        case 'chains':
            for (let iy = 0; iy < h; iy += 4) {
                for (let ix = (iy % 8 === 0 ? 0 : 2); ix < w; ix += 4) {
                    ctx.fillRect(x + ix, y + iy, 2, 2);
                }
            }
            break;
        case 'stripes':
            for (let iy = 2; iy < h; iy += 4) {
                ctx.fillRect(x, y + iy, w, 2);
            }
            break;
        case 'runes':
            ctx.fillStyle = color || '#aaccff';
            ctx.globalAlpha = 0.35;
            ctx.fillRect(x + 4, y + 2, 2, 2);
            ctx.fillRect(x + w - 6, y + Math.floor(h / 2), 2, 2);
            if (h > 8) ctx.fillRect(x + Math.floor(w / 2), y + h - 4, 2, 2);
            break;
        case 'crystal':
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 3; i++) {
                const cx = x + 2 + ((i * 6 + 2) % (w - 4));
                const cy = y + 2 + ((i * 4) % (h - 4));
                ctx.fillRect(cx, cy, 2, 2);
            }
            break;
    }
    ctx.restore();
}


// ═══════════════════════════════════════════════════════════════════════════════
// LEGS ARMOR RENDERER — 8 unique leg armor styles
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Draw leg armor for a single leg using per-item visual config.
 */
export function drawLegsArmorByConfig(ctx, legX, legY, legW, legH, config) {
    if (!config) return;
    const style = config.style || 'leggings';
    const mc = config.mainColor || '#888877';
    const tc = config.trimColor || '#666655';
    const kc = config.kneeColor || mc;
    const hasKnee = config.hasKneePlates || false;
    const gl = config.glowColor || null;

    if (gl) {
        _eqDrawDoodleScribbleCircle(ctx, legX + legW / 2, legY + legH / 2, Math.max(legW, legH) * 0.4, gl);
    }

    switch (style) {
        case 'leggings':
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, legW, legH);
            break;

        case 'greaves':
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, legW, legH);
            ctx.fillStyle = tc;
            ctx.fillRect(legX, legY + Math.floor(legH * 0.3), legW, 2);
            ctx.fillRect(legX, legY + Math.floor(legH * 0.7), legW, 2);
            break;

        case 'pants':
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, legW, legH);
            ctx.fillStyle = tc;
            ctx.fillRect(legX + Math.floor(legW / 2), legY, 2, legH);
            break;

        case 'guards':
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, Math.floor(legW * 0.7), legH);
            ctx.fillStyle = tc;
            ctx.fillRect(legX, legY, Math.floor(legW * 0.7), 2);
            break;

        case 'cuisses':
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, legW, legH);
            // Joint gap at knee
            ctx.fillStyle = tc;
            ctx.fillRect(legX, legY + Math.floor(legH * 0.5), legW, 2);
            break;

        case 'tassets':
            ctx.fillStyle = mc;
            // Hanging strips
            ctx.fillRect(legX, legY, Math.floor(legW * 0.4), legH);
            ctx.fillRect(legX + Math.floor(legW * 0.6), legY, Math.floor(legW * 0.4), legH);
            ctx.fillStyle = tc;
            ctx.fillRect(legX, legY, legW, 2);
            break;

        case 'chaps':
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, legW, legH);
            // Open back (darker center stripe)
            ctx.fillStyle = tc;
            ctx.fillRect(legX + Math.floor(legW * 0.3), legY + 2, Math.floor(legW * 0.4), legH - 2);
            break;

        case 'skirt':
            ctx.fillStyle = mc;
            ctx.fillRect(legX - 2, legY, legW + 4, Math.floor(legH * 0.6));
            ctx.fillStyle = tc;
            ctx.fillRect(legX - 2, legY + Math.floor(legH * 0.6) - 2, legW + 4, 2);
            break;

        default:
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, legW, legH);
    }

    // Knee plates
    if (hasKnee) {
        ctx.fillStyle = kc;
        ctx.fillRect(legX, legY + 2, legW, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(legX, legY + 2, Math.floor(legW * 0.5), 2);
    }

    // Doodle art style: hatching overlay and wobbly outline on leg armor
    _eqDrawDoodleHatching(ctx, legX, legY, legW, legH, tc || '#2D2D2D', 0.3);
    _eqDrawDoodleRectOutline(ctx, legX, legY, legW, legH, tc || '#2D2D2D', 1);
}


// ═══════════════════════════════════════════════════════════════════════════════
// BOOTS RENDERER — 7 unique boot styles
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Draw boots using per-item visual config.
 */
export function drawBootsByConfig(ctx, x, y, w, h, config) {
    if (!config) return;
    const style = config.style || 'boots';
    const mc = config.mainColor || '#664422';
    const sole = config.soleColor || '#442211';
    const hasBuckle = config.hasBuckle || false;
    const bkC = config.buckleColor || '#888888';
    const gl = config.glowColor || null;

    if (gl) {
        _eqDrawDoodleScribbleCircle(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 0.4, gl);
    }

    switch (style) {
        case 'sandals':
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 2, w, 2);
            // Straps
            ctx.fillStyle = mc;
            ctx.fillRect(x, y + h - 4, w, 2);
            ctx.fillRect(x + 2, y, 2, h);
            break;

        case 'boots':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 2, w, 2);
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(x, y, Math.floor(w * 0.4), h - 2);
            break;

        case 'sabatons':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Armor segments
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x, y + 2, w, 2);
            if (h > 6) ctx.fillRect(x, y + 6, w, 2);
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 2, w, 2);
            break;

        case 'slippers':
            ctx.fillStyle = mc;
            ctx.fillRect(x + 2, y + 2, w - 4, h - 2);
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 2, w, 2);
            break;

        case 'treads':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Thick sole
            ctx.fillStyle = sole;
            ctx.fillRect(x - 2, y + h - 4, w + 4, 4);
            break;

        case 'greaves':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y - 2, w, h + 2);
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 2, w, 2);
            // Shin guard highlight
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(x, y - 2, Math.floor(w * 0.4), h);
            break;

        case 'kicks':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Two-tone
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + Math.floor(h / 2), w, Math.ceil(h / 2));
            // Accent stripe
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(x + 2, y + Math.floor(h / 2), w - 4, 2);
            break;

        default:
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 2, w, 2);
    }

    // Buckle
    if (hasBuckle) {
        ctx.fillStyle = bkC;
        ctx.fillRect(x + Math.floor(w / 2) - 2, y + 2, 4, 2);
    }

    // Doodle art style: hatching overlay and wobbly outline on boots
    _eqDrawDoodleHatching(ctx, x, y, w, h, sole || '#2D2D2D', 0.3);
    _eqDrawDoodleRectOutline(ctx, x, y, w, h, sole || '#2D2D2D', 1);
}


// ═══════════════════════════════════════════════════════════════════════════════
// GLOVES RENDERER — 8 unique glove styles
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Draw gloves using per-item visual config.
 */
export function drawGlovesByConfig(ctx, ax, ay, w, h, side, config) {
    if (!config) return;
    const style = config.style || 'gloves';
    const mc = config.mainColor || '#888877';
    const cc = config.cuffColor || '#666655';
    const kc = config.knuckleColor || mc;
    const hasGem = config.hasGem || false;
    const gemC = config.gemColor || '#ffffff';
    const gl = config.glowColor || null;

    const handH = 6; // bottom 6px is the "hand"
    const handY = ay + h - handH;

    if (gl) {
        _eqDrawDoodleScribbleCircle(ctx, ax + w / 2, handY + handH / 2, Math.max(w, handH) * 0.4, gl);
    }

    switch (style) {
        case 'gloves':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY, w, handH);
            break;

        case 'gauntlets':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY - 4, w, handH + 4);
            ctx.fillStyle = kc;
            ctx.fillRect(ax, handY, w, 2);
            ctx.fillStyle = cc;
            ctx.fillRect(ax, handY - 4, w, 2);
            break;

        case 'wraps':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY, w, handH);
            // Wrap pattern (alternating)
            ctx.fillStyle = cc;
            ctx.fillRect(ax, handY + 2, w, 2);
            break;

        case 'bracers':
            // Forearm only (upper portion)
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY - 6, w, 6);
            ctx.fillStyle = cc;
            ctx.fillRect(ax, handY - 6, w, 2);
            break;

        case 'mitts':
            ctx.fillStyle = mc;
            ctx.fillRect(ax - 2, handY, w + 2, handH);
            ctx.fillStyle = cc;
            ctx.fillRect(ax - 2, handY, w + 2, 2);
            break;

        case 'fists':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY, w, handH);
            ctx.fillStyle = kc;
            ctx.fillRect(ax, handY + 2, w, 2);
            // Spike
            ctx.fillRect(ax + Math.floor(w / 2), handY - 2, 2, 2);
            break;

        case 'knuckles':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY + 2, w, 2);
            break;

        case 'clasp':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY, w, 4);
            if (hasGem) {
                ctx.fillStyle = gemC;
                ctx.fillRect(ax + Math.floor(w / 2), handY, 2, 2);
            }
            break;

        default:
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY, w, handH);
    }

    // Gem on back of hand
    if (hasGem && style !== 'clasp') {
        ctx.fillStyle = gemC;
        ctx.fillRect(ax + Math.floor(w / 2), handY, 2, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(ax + Math.floor(w / 2), handY, 2, 2);
        // Doodle art style: tiny star sparkle on gem
        _eqDrawDoodleStar(ctx, ax + Math.floor(w / 2) + 1, handY + 1, 2, gemC);
    }

    // Doodle art style: wobbly outline on gloves
    _eqDrawDoodleRectOutline(ctx, ax, handY, w, handH, cc || '#2D2D2D', 1);
}


// ═══════════════════════════════════════════════════════════════════════════════
// RING RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Draw a ring using per-item visual config.
 */
export function drawRingByConfig(ctx, rx, ry, config) {
    if (!config) return;
    const bandC = config.bandColor || '#aa7744';
    const gemC = config.gemColor || null;
    const gemShape = config.gemShape || 'none';
    const gl = config.glowColor || null;
    const sparkle = config.sparkle || false;

    // Ring band (6×2)
    ctx.fillStyle = bandC;
    ctx.fillRect(rx, ry, 6, 2);

    // Gem
    if (gemC && gemShape !== 'none') {
        ctx.fillStyle = gemC;
        switch (gemShape) {
            case 'round':
                ctx.fillRect(rx + 2, ry - 2, 2, 2);
                break;
            case 'diamond':
                ctx.fillRect(rx + 2, ry - 4, 2, 2);
                ctx.fillRect(rx, ry - 2, 6, 2);
                break;
            case 'square':
                ctx.fillRect(rx, ry - 2, 4, 2);
                break;
        }
    }

    // Doodle art style: sparkle as tiny star doodle
    if (sparkle) {
        _eqDrawDoodleStar(ctx, rx + 3, ry - 2, 2, '#ffffff');
    }

    // Doodle art style: glow as scribble circle
    if (gl) {
        _eqDrawDoodleScribbleCircle(ctx, rx + 3, ry, 4, gl);
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// AMULET RENDERER — 8 unique pendant shapes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Draw an amulet using per-item visual config.
 */
export function drawAmuletByConfig(ctx, cx, neckY, dir, config) {
    if (!config) return;
    const chainC = config.chainColor || '#888877';
    const pendC = config.pendantColor || '#777777';
    const shape = config.pendantShape || 'circle';
    const gemC = config.gemColor || null;
    const gl = config.glowColor || null;

    // Chain
    ctx.fillStyle = chainC;
    if (dir === DIR_DOWN) {
        ctx.fillRect(cx - 4, neckY, 2, 4);
        ctx.fillRect(cx + 2, neckY, 2, 4);
        ctx.fillRect(cx - 2, neckY + 2, 2, 2);
        ctx.fillRect(cx, neckY + 2, 2, 2);
    } else {
        const chainX = dir === DIR_RIGHT ? cx + 2 : cx - 2;
        ctx.fillRect(chainX, neckY, 2, 4);
    }

    // Pendant position
    const gemY = neckY + 4;
    const gemX = dir === DIR_DOWN ? cx - 2 : (dir === DIR_RIGHT ? cx : cx - 2);

    // Pendant shape
    ctx.fillStyle = pendC;
    switch (shape) {
        case 'circle':
            ctx.fillRect(gemX, gemY, 6, 4);
            break;
        case 'diamond':
            ctx.fillRect(gemX + 2, gemY - 2, 2, 2);
            ctx.fillRect(gemX, gemY, 6, 2);
            ctx.fillRect(gemX + 2, gemY + 2, 2, 2);
            break;
        case 'teardrop':
            ctx.fillRect(gemX + 2, gemY - 2, 2, 2);
            ctx.fillRect(gemX, gemY, 6, 2);
            ctx.fillRect(gemX, gemY + 2, 4, 2);
            break;
        case 'oval':
            ctx.fillRect(gemX, gemY, 4, 6);
            break;
        case 'star':
            ctx.fillRect(gemX + 2, gemY - 2, 2, 2);
            ctx.fillRect(gemX, gemY, 6, 2);
            ctx.fillRect(gemX + 2, gemY + 2, 2, 2);
            ctx.fillRect(gemX - 2, gemY, 2, 2);
            ctx.fillRect(gemX + 6, gemY, 2, 2);
            break;
        case 'crescent':
            ctx.fillRect(gemX, gemY, 4, 4);
            ctx.fillRect(gemX + 2, gemY - 2, 2, 2);
            // Cut-out
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(gemX + 2, gemY, 2, 2);
            break;
        case 'fang':
            ctx.fillRect(gemX, gemY, 4, 2);
            ctx.fillRect(gemX + 2, gemY + 2, 2, 4);
            break;
        case 'heart':
            ctx.fillRect(gemX, gemY, 2, 4);
            ctx.fillRect(gemX + 4, gemY, 2, 4);
            ctx.fillRect(gemX + 2, gemY + 2, 2, 2);
            ctx.fillRect(gemX + 2, gemY + 4, 2, 2);
            break;
        default:
            ctx.fillRect(gemX, gemY, 6, 4);
    }

    // Gem highlight
    if (gemC) {
        ctx.fillStyle = gemC;
        ctx.fillRect(gemX + (dir === DIR_DOWN ? 2 : 0), gemY, 2, 2);
        // Doodle art style: tiny star sparkle on gem
        _eqDrawDoodleStar(ctx, gemX + (dir === DIR_DOWN ? 3 : 1), gemY + 1, 2, gemC);
    }

    // Doodle art style: glow as scribble circle
    if (gl) {
        _eqDrawDoodleScribbleCircle(ctx, gemX + 3, gemY + 2, 5, gl);
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// CRYSTAL RENDERER — 6 unique crystal shapes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Draw a floating crystal using per-item visual config.
 */
export function drawCrystalByConfig(ctx, crx, cry, dir, frame, config) {
    if (!config) return;
    const cc = config.crystalColor || '#888899';
    const ic = config.innerColor || '#aaaaaa';
    const oc = config.outlineColor || '#666677';
    const sz = config.size || 'small';
    const shape = config.shape || 'diamond';
    const ps = config.pulseSpeed || 0.5;
    const gl = config.glowColor || '#888888';
    const hasTrail = config.hasTrail || false;

    // Size multiplier
    const sizeMap = { small: 2, medium: 3, large: 4 };
    const s = sizeMap[sz] || 2;

    // Pulse opacity based on frame (0-3)
    const pulse = [0.7, 0.85, 1.0, 0.85][frame % 4];
    const adjustedPulse = 0.5 + pulse * 0.5 * ps;

    ctx.save();
    ctx.globalAlpha = adjustedPulse;

    // Trail (fading dots behind)
    if (hasTrail) {
        ctx.globalAlpha = adjustedPulse * 0.3;
        ctx.fillStyle = cc;
        const trailDir = dir === DIR_LEFT ? 1 : dir === DIR_RIGHT ? -1 : 0;
        ctx.fillRect(crx + trailDir * 4, cry + 4, 2, 2);
        ctx.fillRect(crx + trailDir * 8, cry + 6, 2, 2);
        ctx.globalAlpha = adjustedPulse;
    }

    // Crystal shape
    switch (shape) {
        case 'diamond':
            // Outline
            ctx.fillStyle = oc;
            ctx.fillRect(crx + Math.round(1 * s), cry - Math.round(1 * s), Math.round(1 * s), Math.round(1 * s));
            ctx.fillRect(crx, cry, Math.round(3 * s), Math.round(2 * s));
            ctx.fillRect(crx + Math.round(1 * s), cry + Math.round(2 * s), Math.round(1 * s), Math.round(1 * s));
            // Fill
            ctx.fillStyle = cc;
            ctx.fillRect(crx + Math.round(0.5 * s), cry + Math.round(0.5 * s), Math.round(2 * s), Math.round(1 * s));
            break;

        case 'hexagon':
            ctx.fillStyle = oc;
            ctx.fillRect(crx + Math.round(1 * s), cry - Math.round(0.5 * s), Math.round(1 * s), Math.round(1 * s));
            ctx.fillRect(crx, cry + Math.round(0.5 * s), Math.round(3 * s), Math.round(1 * s));
            ctx.fillRect(crx + Math.round(1 * s), cry + Math.round(1.5 * s), Math.round(1 * s), Math.round(1 * s));
            ctx.fillStyle = cc;
            ctx.fillRect(crx + Math.round(0.5 * s), cry, Math.round(2 * s), Math.round(2 * s));
            break;

        case 'prism':
            ctx.fillStyle = oc;
            ctx.fillRect(crx + Math.round(1 * s), cry - Math.round(1 * s), Math.round(1 * s), Math.round(4 * s));
            ctx.fillRect(crx, cry, Math.round(3 * s), Math.round(2 * s));
            ctx.fillStyle = cc;
            ctx.fillRect(crx + Math.round(0.5 * s), cry - Math.round(0.5 * s), Math.round(2 * s), Math.round(3 * s));
            break;

        case 'orb':
            ctx.fillStyle = oc;
            ctx.fillRect(crx, cry, Math.round(3 * s), Math.round(3 * s));
            ctx.fillStyle = cc;
            ctx.fillRect(crx + Math.round(0.5 * s), cry + Math.round(0.5 * s), Math.round(2 * s), Math.round(2 * s));
            // Shine
            ctx.fillStyle = ic;
            ctx.fillRect(crx + Math.round(0.5 * s), cry + Math.round(0.5 * s), Math.round(1 * s), Math.round(1 * s));
            break;

        case 'star':
            ctx.fillStyle = cc;
            // Center
            ctx.fillRect(crx, cry, Math.round(3 * s), Math.round(3 * s));
            // Points
            ctx.fillRect(crx + Math.round(1 * s), cry - Math.round(1 * s), Math.round(1 * s), Math.round(1 * s));
            ctx.fillRect(crx - Math.round(1 * s), cry + Math.round(1 * s), Math.round(1 * s), Math.round(1 * s));
            ctx.fillRect(crx + Math.round(3 * s), cry + Math.round(1 * s), Math.round(1 * s), Math.round(1 * s));
            ctx.fillRect(crx + Math.round(1 * s), cry + Math.round(3 * s), Math.round(1 * s), Math.round(1 * s));
            break;

        case 'shard':
            ctx.fillStyle = oc;
            ctx.fillRect(crx + Math.round(1 * s), cry - Math.round(2 * s), Math.round(1 * s), Math.round(5 * s));
            ctx.fillStyle = cc;
            ctx.fillRect(crx + Math.round(1 * s), cry - Math.round(1.5 * s), Math.round(1 * s), Math.round(4 * s));
            ctx.fillRect(crx, cry, Math.round(1 * s), Math.round(2 * s));
            break;

        default:
            ctx.fillStyle = cc;
            ctx.fillRect(crx + 2, cry, 2, 2);
            ctx.fillRect(crx, cry + 2, 6, 4);
            ctx.fillRect(crx + 2, cry + 6, 2, 2);
    }

    // Inner highlight
    ctx.fillStyle = ic;
    ctx.fillRect(crx + Math.round(1 * s), cry + Math.round(0.5 * s), Math.round(1 * s), Math.round(1 * s));

    // Doodle art style: outer glow as scribble circle + star doodle
    if (gl) {
        ctx.restore(); // restore before calling doodle helpers that manage their own state
        const glowRadius = Math.round(2.5 * s);
        _eqDrawDoodleScribbleCircle(ctx, crx + Math.round(1.5 * s), cry + Math.round(1.5 * s), glowRadius, gl);
        _eqDrawDoodleStar(ctx, crx + Math.round(1.5 * s), cry + Math.round(1.5 * s), Math.round(1.5 * s), gl);
        return; // already restored
    }

    ctx.restore();
}

/**
 * EquipmentRenderers.js — Per-item unique pixel-art rendering functions for all
 * equipment slot types. Called by HumanoidSpriteSystem to draw visually distinct
 * equipment overlays on 32×32 sprites.
 *
 * Each renderer accepts a visual config object from EquipmentVisualConfig.js and
 * draws unique pixel art based on the item's shape, colors, and effects.
 */

// Direction constants (match HumanoidSpriteSystem)
const DIR_DOWN  = 0;
const DIR_LEFT  = 1;
const DIR_RIGHT = 2;
const DIR_UP    = 3;

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
    const bLen = config.bladeLength || 10;
    const bW = config.bladeWidth || 2;

    // Draw glow effect behind weapon
    if (gl) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = gl;
        ctx.fillRect(wx - 3, wy - bLen - 2, bW + 6, bLen + 8);
        ctx.restore();
    }

    const flip = dir === DIR_LEFT ? -1 : 1;
    const ox = dir === DIR_LEFT ? -1 : 0;

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

    // Particles
    if (config.hasParticles && config.particleColor) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = config.particleColor;
        const seed = (wx * 7 + wy * 13) % 5;
        ctx.fillRect(wx - 2 + seed, wy - bLen + 2, 1, 1);
        ctx.fillRect(wx + 3 - seed, wy - bLen + 5, 1, 1);
        if (bLen > 10) ctx.fillRect(wx + seed - 1, wy - bLen + 8, 1, 1);
        ctx.restore();
    }
}

// ── Individual weapon shape functions ──────────────────────────────────────

function _drawSword(ctx, x, y, bc, bh, hc, gc, len, w) {
    // Blade
    ctx.fillStyle = bc;
    ctx.fillRect(x, y - len, w, len);
    ctx.fillRect(x - 1, y - len - 1, w + 2, 2); // tip
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - len + 1, 1, len - 2);
    // Guard
    ctx.fillStyle = gc;
    ctx.fillRect(x - 2, y, 6, 2);
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y + 2, w, 4);
}

function _drawBroadsword(ctx, x, y, bc, bh, hc, gc, len) {
    // Wide blade (3px)
    ctx.fillStyle = bc;
    ctx.fillRect(x - 1, y - len + 2, 3, len - 2);
    ctx.fillRect(x, y - len, 1, 2); // tip point
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 1, y - len + 3, 1, len - 4);
    // Fuller (center detail)
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x, y - len + 4, 1, len - 6);
    // Guard (thick)
    ctx.fillStyle = gc;
    ctx.fillRect(x - 3, y, 8, 2);
    ctx.fillRect(x - 2, y - 1, 6, 1);
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y + 2, 2, 4);
    // Pommel
    ctx.fillStyle = gc;
    ctx.fillRect(x - 1, y + 6, 3, 2);
}

function _drawKatana(ctx, x, y, bc, bh, hc, len) {
    // Curved blade (slight offset per pixel row)
    ctx.fillStyle = bc;
    for (let i = 0; i < len; i++) {
        const curve = i < 3 ? 0 : Math.floor((i - 3) * 0.15);
        ctx.fillRect(x + curve, y - len + i, 2, 1);
    }
    // Tip
    ctx.fillRect(x, y - len - 1, 1, 1);
    // Highlight
    ctx.fillStyle = bh;
    for (let i = 1; i < len - 1; i++) {
        const curve = i < 3 ? 0 : Math.floor((i - 3) * 0.15);
        ctx.fillRect(x + curve + 1, y - len + i, 1, 1);
    }
    // Handle (wrapped, no guard)
    ctx.fillStyle = hc;
    ctx.fillRect(x, y, 2, 5);
    // Wrap detail
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, y + 1, 2, 1);
    ctx.fillRect(x, y + 3, 2, 1);
}

function _drawScimitar(ctx, x, y, bc, bh, hc, gc, len) {
    // Curved wider-at-tip blade
    ctx.fillStyle = bc;
    for (let i = 0; i < len; i++) {
        const w = i < len / 2 ? 2 : 3;
        const curve = Math.floor(i * 0.2);
        ctx.fillRect(x - curve, y - len + i, w, 1);
    }
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - len + 1, 1, len / 2);
    // Guard
    ctx.fillStyle = gc;
    ctx.fillRect(x - 1, y, 4, 2);
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y + 2, 2, 4);
}

function _drawDagger(ctx, x, y, bc, bh, hc, len) {
    const dLen = Math.min(len, 8);
    // Short blade
    ctx.fillStyle = bc;
    ctx.fillRect(x, y - dLen, 1, dLen);
    ctx.fillRect(x, y - dLen - 1, 1, 1); // tip
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - dLen + 1, 1, 1);
    // Handle (no guard)
    ctx.fillStyle = hc;
    ctx.fillRect(x - 1, y, 3, 3);
}

function _drawAxe(ctx, x, y, bc, bh, hc, len) {
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 4, 2, 14);
    // Axe head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 3, y - 7, 6, 5);
    ctx.fillRect(x - 4, y - 6, 2, 3);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 3, y - 6, 1, 3);
    // Edge detail
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x - 4, y - 5, 1, 1);
}

function _drawGreataxe(ctx, x, y, bc, bh, hc, len) {
    // Thick shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 2, 2, 14);
    // Double axe heads
    ctx.fillStyle = bc;
    ctx.fillRect(x - 4, y - 6, 4, 6);
    ctx.fillRect(x + 2, y - 6, 4, 6);
    ctx.fillRect(x - 5, y - 5, 2, 4);
    ctx.fillRect(x + 5, y - 5, 2, 4);
    // Highlights
    ctx.fillStyle = bh;
    ctx.fillRect(x - 4, y - 5, 1, 4);
    ctx.fillRect(x + 2, y - 5, 1, 4);
}

function _drawBattleaxe(ctx, x, y, bc, bh, hc, len) {
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 3, 2, 14);
    // Large single head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 4, y - 7, 7, 6);
    ctx.fillRect(x - 5, y - 6, 2, 4);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 4, y - 6, 1, 4);
    // Blade edge
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x - 5, y - 5, 1, 2);
}

function _drawStaff(ctx, x, y, bc, bh, hc, gc, len) {
    // Shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 10, 2, 18);
    // Shaft detail
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x, y - 4, 1, 10);
    // Crystal/orb on top
    ctx.fillStyle = bc;
    ctx.fillRect(x - 1, y - 13, 4, 4);
    ctx.fillRect(x, y - 14, 2, 1);
    // Inner glow
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - 12, 2, 2);
    // Glow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y - 14, 6, 6);
    ctx.restore();
    // Mounting
    ctx.fillStyle = gc;
    ctx.fillRect(x - 1, y - 10, 4, 1);
}

function _drawWand(ctx, x, y, bc, bh, hc, len) {
    // Short shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 4, 2, 10);
    // Glowing tip
    ctx.fillStyle = bc;
    ctx.fillRect(x - 1, y - 6, 3, 3);
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - 5, 1, 1);
    // Glow
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y - 7, 5, 5);
    ctx.restore();
}

function _drawScepter(ctx, x, y, bc, bh, hc, gc, len) {
    // Ornate shaft
    ctx.fillStyle = gc;
    ctx.fillRect(x, y - 6, 2, 12);
    // Ring details
    ctx.fillStyle = bh;
    ctx.fillRect(x - 1, y - 2, 4, 1);
    ctx.fillRect(x - 1, y + 2, 4, 1);
    // Large gemstone (4×4)
    ctx.fillStyle = bc;
    ctx.fillRect(x - 1, y - 10, 4, 5);
    ctx.fillRect(x, y - 11, 2, 1);
    ctx.fillRect(x, y - 5, 2, 1);
    // Gem highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 1, y - 9, 2, 2);
    // Glow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = bc;
    ctx.fillRect(x - 3, y - 12, 8, 9);
    ctx.restore();
}

function _drawSpear(ctx, x, y, bc, bh, hc, len) {
    // Long shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 6, 2, 16);
    // Pointed head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 1, y - 10, 4, 5);
    ctx.fillRect(x, y - 11, 2, 2);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - 10, 1, 4);
}

function _drawLance(ctx, x, y, bc, bh, hc, len) {
    // Longer shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 4, 2, 16);
    // Wide pointed head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y - 9, 5, 6);
    ctx.fillRect(x - 1, y - 11, 3, 3);
    ctx.fillRect(x, y - 12, 1, 2);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 1, y - 9, 1, 5);
    // Handguard
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x - 1, y - 4, 4, 1);
}

function _drawHalberd(ctx, x, y, bc, bh, hc, len) {
    // Long shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 6, 2, 16);
    // Axe head (one side)
    ctx.fillStyle = bc;
    ctx.fillRect(x - 4, y - 9, 5, 5);
    ctx.fillRect(x - 5, y - 8, 2, 3);
    // Spear point above
    ctx.fillRect(x, y - 12, 2, 4);
    ctx.fillRect(x, y - 13, 1, 1);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 4, y - 8, 1, 3);
}

function _drawCrossbow(ctx, x, y, bc, bh, hc, gc) {
    // Stock
    ctx.fillStyle = hc;
    ctx.fillRect(x - 1, y, 6, 2);
    ctx.fillRect(x + 3, y + 1, 2, 4);
    // Bow limbs
    ctx.fillStyle = bc;
    ctx.fillRect(x - 4, y - 3, 2, 6);
    ctx.fillRect(x + 5, y - 3, 2, 6);
    // String
    ctx.fillStyle = bh;
    ctx.fillRect(x - 3, y - 3, 9, 1);
    // Trigger
    ctx.fillStyle = gc || hc;
    ctx.fillRect(x + 1, y + 2, 1, 2);
}

function _drawLongbow(ctx, x, y, bc, bh, hc, len) {
    // Curved bow body
    ctx.fillStyle = hc;
    for (let i = 0; i < 14; i++) {
        const curve = Math.floor(Math.sin((i / 13) * Math.PI) * 3);
        ctx.fillRect(x - curve, y - 7 + i, 2, 1);
    }
    // String
    ctx.fillStyle = bh;
    ctx.fillRect(x + 1, y - 7, 1, 14);
    // Grip
    ctx.fillStyle = bc;
    ctx.fillRect(x - 1, y, 3, 2);
}

function _drawMace(ctx, x, y, bc, bh, hc, len) {
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y, 2, 8);
    // Spiked ball head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 2, y - 5, 5, 5);
    // Spikes (4 directional)
    ctx.fillRect(x, y - 6, 1, 1);       // top
    ctx.fillRect(x - 3, y - 3, 1, 1);   // left
    ctx.fillRect(x + 3, y - 3, 1, 1);   // right
    ctx.fillRect(x, y, 1, 1);            // bottom
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x - 1, y - 4, 2, 2);
}

function _drawHammer(ctx, x, y, bc, bh, hc, len) {
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 2, 2, 12);
    // Flat heavy head
    ctx.fillStyle = bc;
    ctx.fillRect(x - 3, y - 6, 8, 4);
    // Top detail
    ctx.fillStyle = bh;
    ctx.fillRect(x - 3, y - 6, 8, 1);
    // Edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x - 3, y - 5, 1, 3);
}

function _drawFlail(ctx, x, y, bc, bh, hc, len) {
    // Handle
    ctx.fillStyle = hc;
    ctx.fillRect(x, y + 2, 2, 5);
    // Chain (1px dots)
    ctx.fillStyle = '#999999';
    ctx.fillRect(x, y, 1, 1);
    ctx.fillRect(x + 1, y - 1, 1, 1);
    ctx.fillRect(x, y - 2, 1, 1);
    ctx.fillRect(x + 1, y - 3, 1, 1);
    // Ball
    ctx.fillStyle = bc;
    ctx.fillRect(x - 1, y - 7, 4, 4);
    // Spikes
    ctx.fillRect(x, y - 8, 2, 1);
    ctx.fillRect(x - 2, y - 6, 1, 2);
    ctx.fillRect(x + 3, y - 6, 1, 2);
    // Highlight
    ctx.fillStyle = bh;
    ctx.fillRect(x, y - 6, 1, 2);
}

function _drawScythe(ctx, x, y, bc, bh, hc, len) {
    // Long shaft
    ctx.fillStyle = hc;
    ctx.fillRect(x, y - 6, 2, 16);
    // Curved blade at top
    ctx.fillStyle = bc;
    ctx.fillRect(x + 1, y - 10, 1, 5);
    ctx.fillRect(x + 2, y - 11, 1, 5);
    ctx.fillRect(x + 3, y - 12, 1, 4);
    ctx.fillRect(x + 4, y - 12, 1, 3);
    ctx.fillRect(x + 5, y - 11, 1, 2);
    // Mount
    ctx.fillRect(x - 1, y - 8, 3, 2);
    // Highlight (blade edge)
    ctx.fillStyle = bh;
    ctx.fillRect(x + 2, y - 11, 1, 1);
    ctx.fillRect(x + 3, y - 12, 1, 1);
    ctx.fillRect(x + 4, y - 12, 1, 1);
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
    const ht = config.height || 3;
    const hasVisor = config.hasVisor || false;
    const vc = config.visorColor || '#444444';
    const gl = config.glowColor || null;
    const hasPlume = config.hasPlume || false;
    const pc = config.plumeColor || '#cc3333';

    // Glow effect
    if (gl) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = gl;
        ctx.fillRect(x - 2, y - 2, w + 4, ht + 4);
        ctx.restore();
    }

    switch (style) {
        case 'cap':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht);
            ctx.fillRect(x + 1, y - 1, w - 2, 1);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + ht - 1, w, 1);
            break;

        case 'helm':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht + 1);
            ctx.fillRect(x + 1, y - 1, w - 2, 1);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y, w, 1); // top trim
            ctx.fillRect(x, y + ht, w, 1); // bottom trim
            if (hasVisor) {
                ctx.fillStyle = vc;
                ctx.fillRect(x + 1, y + Math.floor(ht * 0.6), w - 2, 1);
            }
            break;

        case 'circlet':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y + 1, w, 2);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2) - 1, y, 2, 2);
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillRect(x + Math.floor(w / 2) - 1, y, 1, 1);
            }
            break;

        case 'crown':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y + 1, w, ht - 1);
            // Three peaks
            ctx.fillRect(x + 1, y - 1, 1, 2);
            ctx.fillRect(x + Math.floor(w / 2), y - 2, 1, 3);
            ctx.fillRect(x + w - 2, y - 1, 1, 2);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + ht - 1, w, 1);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2), y, 1, 1);
            }
            break;

        case 'hood':
            ctx.fillStyle = mc;
            ctx.fillRect(x - 1, y, w + 2, ht + 2);
            ctx.fillRect(x, y - 1, w, 1);
            // Draping sides
            ctx.fillRect(x - 1, y + ht, 2, 3);
            ctx.fillRect(x + w - 1, y + ht, 2, 3);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + ht + 1, w, 1);
            break;

        case 'visor':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht + 1);
            ctx.fillRect(x + 1, y - 1, w - 2, 1);
            // Eye slit
            ctx.fillStyle = '#111111';
            ctx.fillRect(x + 1, y + Math.floor(ht * 0.4), w - 2, 1);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + ht, w, 1);
            break;

        case 'turban':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht + 1);
            ctx.fillRect(x + 1, y - 2, w - 2, 2);
            ctx.fillRect(x + 2, y - 3, w - 4, 1);
            // Wrap detail
            ctx.fillStyle = tc;
            ctx.fillRect(x + 1, y + 1, w - 2, 1);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2), y - 1, 1, 1);
            }
            break;

        case 'tiara':
            ctx.fillStyle = mc;
            ctx.fillRect(x + 1, y + 1, w - 2, 1);
            // Central element
            ctx.fillRect(x + Math.floor(w / 2) - 1, y - 1, 2, 3);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2), y - 1, 1, 1);
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fillRect(x + Math.floor(w / 2), y - 1, 1, 1);
            }
            break;

        case 'antlers':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y + 1, w, 2); // base band
            // Left antler
            ctx.fillRect(x - 1, y - 1, 1, 3);
            ctx.fillRect(x - 2, y - 3, 1, 3);
            ctx.fillRect(x - 3, y - 4, 1, 2);
            // Right antler
            ctx.fillRect(x + w, y - 1, 1, 3);
            ctx.fillRect(x + w + 1, y - 3, 1, 3);
            ctx.fillRect(x + w + 2, y - 4, 1, 2);
            if (gem) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = gem;
                ctx.fillRect(x - 3, y - 4, 1, 1);
                ctx.fillRect(x + w + 2, y - 4, 1, 1);
                ctx.restore();
            }
            break;

        case 'diadem':
            ctx.fillStyle = mc;
            ctx.fillRect(x + 1, y + 1, w - 2, 1);
            // Vertical central element
            ctx.fillRect(x + Math.floor(w / 2), y - 2, 1, 4);
            ctx.fillStyle = tc;
            ctx.fillRect(x + Math.floor(w / 2) - 1, y - 1, 3, 1);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2), y - 1, 1, 1);
            }
            break;

        case 'cowl':
            ctx.fillStyle = mc;
            ctx.fillRect(x - 1, y - 1, w + 2, ht + 2);
            ctx.fillRect(x, y - 2, w, 1);
            // Hood shadow
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + ht, w, 1);
            ctx.fillRect(x - 1, y + 1, 1, ht);
            ctx.fillRect(x + w, y + 1, 1, ht);
            break;

        case 'veil':
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht + 3);
            ctx.restore();
            // Headband
            ctx.fillStyle = tc;
            ctx.fillRect(x, y, w, 1);
            break;

        case 'coronet':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y + 1, w, 2);
            // Two peaks (shorter than crown)
            ctx.fillRect(x + 2, y, 1, 1);
            ctx.fillRect(x + w - 3, y, 1, 1);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + 2, w, 1);
            if (gem) {
                ctx.fillStyle = gem;
                ctx.fillRect(x + Math.floor(w / 2), y, 1, 1);
            }
            break;

        default:
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, ht);
    }

    // Plume
    if (hasPlume) {
        ctx.fillStyle = pc;
        ctx.fillRect(x + w - 1, y - 3, 2, 4);
        ctx.fillRect(x + w, y - 4, 1, 1);
    }
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

    // Glow
    if (gl) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = gl;
        ctx.fillRect(x - 2, y - 1, w + 4, h + 2);
        ctx.restore();
    }

    // Base fill by style
    switch (style) {
        case 'tunic':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y, 1, h); // left edge
            ctx.fillRect(x + w - 1, y, 1, h); // right edge
            break;

        case 'vest':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = ac;
            ctx.fillRect(x + Math.floor(w * 0.3), y, Math.floor(w * 0.4), h);
            break;

        case 'robe':
            ctx.fillStyle = mc;
            ctx.fillRect(x - 1, y, w + 2, h + 1);
            ctx.fillStyle = tc;
            ctx.fillRect(x - 1, y + h, w + 2, 1);
            ctx.fillStyle = ac;
            ctx.fillRect(Math.floor(x + w / 2) - 1, y, 2, h);
            break;

        case 'plate':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Horizontal segments
            ctx.fillStyle = tc;
            for (let i = 2; i < h; i += 2) {
                ctx.fillRect(x, y + i, w, 1);
            }
            break;

        case 'mail':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Chain dots
            ctx.fillStyle = ac;
            for (let iy = 0; iy < h; iy += 2) {
                for (let ix = (iy % 4 === 0 ? 0 : 1); ix < w; ix += 2) {
                    ctx.fillRect(x + ix, y + iy, 1, 1);
                }
            }
            break;

        case 'cuirass':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Curved center plate
            ctx.fillStyle = ac;
            ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
            ctx.fillStyle = tc;
            ctx.fillRect(Math.floor(x + w / 2), y, 1, h);
            break;

        case 'cloak':
            ctx.fillStyle = mc;
            ctx.fillRect(x - 2, y, w + 4, h);
            ctx.fillStyle = tc;
            ctx.fillRect(x - 2, y + h - 1, w + 4, 1);
            ctx.fillStyle = ac;
            ctx.fillRect(x, y, w, h - 1);
            break;

        case 'harness':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // X-pattern straps
            ctx.fillStyle = tc;
            for (let i = 0; i < Math.min(w, h); i++) {
                const px1 = x + Math.floor(i * w / h);
                const px2 = x + w - 1 - Math.floor(i * w / h);
                ctx.fillRect(px1, y + i, 1, 1);
                ctx.fillRect(px2, y + i, 1, 1);
            }
            break;

        case 'mantle':
            // Heavy shoulders
            ctx.fillStyle = mc;
            ctx.fillRect(x - 1, y, w + 2, 3);
            // Lighter body
            ctx.fillStyle = ac;
            ctx.fillRect(x, y + 3, w, h - 3);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + h - 1, w, 1);
            break;

        case 'jerkin':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // V-neck detail
            ctx.fillStyle = ac;
            ctx.fillRect(Math.floor(x + w / 2) - 1, y, 1, 2);
            ctx.fillRect(Math.floor(x + w / 2), y, 1, 2);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + h - 1, w, 1);
            break;

        case 'breastplate':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Raised center plate
            ctx.fillStyle = ac;
            ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + 1, y + 1, Math.floor(w * 0.4), h - 2);
            ctx.fillStyle = tc;
            ctx.fillRect(x, y + h - 1, w, 1);
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
        ctx.fillRect(x - 1, y, 2, 2);
        ctx.fillRect(x + w - 1, y, 2, 2);
    }

    // Belt
    if (hasBelt) {
        ctx.fillStyle = beltC;
        ctx.fillRect(x, y + h - 1, w, 1);
    }
}

function _applyPattern(ctx, x, y, w, h, pattern, color) {
    if (pattern === 'none') return;
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';

    switch (pattern) {
        case 'scales':
            for (let iy = 1; iy < h - 1; iy += 2) {
                for (let ix = (iy % 4 < 2 ? 0 : 1); ix < w - 1; ix += 2) {
                    ctx.fillRect(x + ix, y + iy, 2, 1);
                }
            }
            break;
        case 'chains':
            for (let iy = 0; iy < h; iy += 2) {
                for (let ix = (iy % 4 === 0 ? 0 : 1); ix < w; ix += 2) {
                    ctx.fillRect(x + ix, y + iy, 1, 1);
                }
            }
            break;
        case 'stripes':
            for (let iy = 1; iy < h; iy += 2) {
                ctx.fillRect(x, y + iy, w, 1);
            }
            break;
        case 'runes':
            ctx.fillStyle = color || '#aaccff';
            ctx.globalAlpha = 0.35;
            ctx.fillRect(x + 2, y + 1, 1, 1);
            ctx.fillRect(x + w - 3, y + Math.floor(h / 2), 1, 1);
            if (h > 4) ctx.fillRect(x + Math.floor(w / 2), y + h - 2, 1, 1);
            break;
        case 'crystal':
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 3; i++) {
                const cx = x + 1 + ((i * 3 + 1) % (w - 2));
                const cy = y + 1 + ((i * 2) % (h - 2));
                ctx.fillRect(cx, cy, 1, 1);
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
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = gl;
        ctx.fillRect(legX - 1, legY - 1, legW + 2, legH + 2);
        ctx.restore();
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
            ctx.fillRect(legX, legY + Math.floor(legH * 0.3), legW, 1);
            ctx.fillRect(legX, legY + Math.floor(legH * 0.7), legW, 1);
            break;

        case 'pants':
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, legW, legH);
            ctx.fillStyle = tc;
            ctx.fillRect(legX + Math.floor(legW / 2), legY, 1, legH);
            break;

        case 'guards':
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, Math.floor(legW * 0.7), legH);
            ctx.fillStyle = tc;
            ctx.fillRect(legX, legY, Math.floor(legW * 0.7), 1);
            break;

        case 'cuisses':
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, legW, legH);
            // Joint gap at knee
            ctx.fillStyle = tc;
            ctx.fillRect(legX, legY + Math.floor(legH * 0.5), legW, 1);
            break;

        case 'tassets':
            ctx.fillStyle = mc;
            // Hanging strips
            ctx.fillRect(legX, legY, Math.floor(legW * 0.4), legH);
            ctx.fillRect(legX + Math.floor(legW * 0.6), legY, Math.floor(legW * 0.4), legH);
            ctx.fillStyle = tc;
            ctx.fillRect(legX, legY, legW, 1);
            break;

        case 'chaps':
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, legW, legH);
            // Open back (darker center stripe)
            ctx.fillStyle = tc;
            ctx.fillRect(legX + Math.floor(legW * 0.3), legY + 1, Math.floor(legW * 0.4), legH - 1);
            break;

        case 'skirt':
            ctx.fillStyle = mc;
            ctx.fillRect(legX - 1, legY, legW + 2, Math.floor(legH * 0.6));
            ctx.fillStyle = tc;
            ctx.fillRect(legX - 1, legY + Math.floor(legH * 0.6) - 1, legW + 2, 1);
            break;

        default:
            ctx.fillStyle = mc;
            ctx.fillRect(legX, legY, legW, legH);
    }

    // Knee plates
    if (hasKnee) {
        ctx.fillStyle = kc;
        ctx.fillRect(legX, legY + 1, legW, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(legX, legY + 1, Math.floor(legW * 0.5), 1);
    }
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
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = gl;
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.restore();
    }

    switch (style) {
        case 'sandals':
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 1, w, 1);
            // Straps
            ctx.fillStyle = mc;
            ctx.fillRect(x, y + h - 2, w, 1);
            ctx.fillRect(x + 1, y, 1, h);
            break;

        case 'boots':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 1, w, 1);
            // Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(x, y, Math.floor(w * 0.4), h - 1);
            break;

        case 'sabatons':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Armor segments
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x, y + 1, w, 1);
            if (h > 3) ctx.fillRect(x, y + 3, w, 1);
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 1, w, 1);
            break;

        case 'slippers':
            ctx.fillStyle = mc;
            ctx.fillRect(x + 1, y + 1, w - 2, h - 1);
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 1, w, 1);
            break;

        case 'treads':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Thick sole
            ctx.fillStyle = sole;
            ctx.fillRect(x - 1, y + h - 2, w + 2, 2);
            break;

        case 'greaves':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y - 1, w, h + 1);
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 1, w, 1);
            // Shin guard highlight
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(x, y - 1, Math.floor(w * 0.4), h);
            break;

        case 'kicks':
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            // Two-tone
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + Math.floor(h / 2), w, Math.ceil(h / 2));
            // Accent stripe
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(x + 1, y + Math.floor(h / 2), w - 2, 1);
            break;

        default:
            ctx.fillStyle = mc;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = sole;
            ctx.fillRect(x, y + h - 1, w, 1);
    }

    // Buckle
    if (hasBuckle) {
        ctx.fillStyle = bkC;
        ctx.fillRect(x + Math.floor(w / 2) - 1, y + 1, 2, 1);
    }
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

    const handH = 3; // bottom 3px is the "hand"
    const handY = ay + h - handH;

    if (gl) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = gl;
        ctx.fillRect(ax - 1, handY - 1, w + 2, handH + 2);
        ctx.restore();
    }

    switch (style) {
        case 'gloves':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY, w, handH);
            break;

        case 'gauntlets':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY - 2, w, handH + 2);
            ctx.fillStyle = kc;
            ctx.fillRect(ax, handY, w, 1);
            ctx.fillStyle = cc;
            ctx.fillRect(ax, handY - 2, w, 1);
            break;

        case 'wraps':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY, w, handH);
            // Wrap pattern (alternating)
            ctx.fillStyle = cc;
            ctx.fillRect(ax, handY + 1, w, 1);
            break;

        case 'bracers':
            // Forearm only (upper portion)
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY - 3, w, 3);
            ctx.fillStyle = cc;
            ctx.fillRect(ax, handY - 3, w, 1);
            break;

        case 'mitts':
            ctx.fillStyle = mc;
            ctx.fillRect(ax - 1, handY, w + 1, handH);
            ctx.fillStyle = cc;
            ctx.fillRect(ax - 1, handY, w + 1, 1);
            break;

        case 'fists':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY, w, handH);
            ctx.fillStyle = kc;
            ctx.fillRect(ax, handY + 1, w, 1);
            // Spike
            ctx.fillRect(ax + Math.floor(w / 2), handY - 1, 1, 1);
            break;

        case 'knuckles':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY + 1, w, 1);
            break;

        case 'clasp':
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY, w, 2);
            if (hasGem) {
                ctx.fillStyle = gemC;
                ctx.fillRect(ax + Math.floor(w / 2), handY, 1, 1);
            }
            break;

        default:
            ctx.fillStyle = mc;
            ctx.fillRect(ax, handY, w, handH);
    }

    // Gem on back of hand
    if (hasGem && style !== 'clasp') {
        ctx.fillStyle = gemC;
        ctx.fillRect(ax + Math.floor(w / 2), handY, 1, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(ax + Math.floor(w / 2), handY, 1, 1);
    }
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

    // Ring band (3×1)
    ctx.fillStyle = bandC;
    ctx.fillRect(rx, ry, 3, 1);

    // Gem
    if (gemC && gemShape !== 'none') {
        ctx.fillStyle = gemC;
        switch (gemShape) {
            case 'round':
                ctx.fillRect(rx + 1, ry - 1, 1, 1);
                break;
            case 'diamond':
                ctx.fillRect(rx + 1, ry - 2, 1, 1);
                ctx.fillRect(rx, ry - 1, 3, 1);
                break;
            case 'square':
                ctx.fillRect(rx, ry - 1, 2, 1);
                break;
        }
    }

    // Sparkle
    if (sparkle) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(rx + 1, ry - 1, 1, 1);
    }

    // Glow
    if (gl) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = gl;
        ctx.fillRect(rx - 1, ry - 2, 5, 4);
        ctx.restore();
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
        ctx.fillRect(cx - 2, neckY, 1, 2);
        ctx.fillRect(cx + 1, neckY, 1, 2);
        ctx.fillRect(cx - 1, neckY + 1, 1, 1);
        ctx.fillRect(cx, neckY + 1, 1, 1);
    } else {
        const chainX = dir === DIR_RIGHT ? cx + 1 : cx - 1;
        ctx.fillRect(chainX, neckY, 1, 2);
    }

    // Pendant position
    const gemY = neckY + 2;
    const gemX = dir === DIR_DOWN ? cx - 1 : (dir === DIR_RIGHT ? cx : cx - 1);

    // Pendant shape
    ctx.fillStyle = pendC;
    switch (shape) {
        case 'circle':
            ctx.fillRect(gemX, gemY, 3, 2);
            break;
        case 'diamond':
            ctx.fillRect(gemX + 1, gemY - 1, 1, 1);
            ctx.fillRect(gemX, gemY, 3, 1);
            ctx.fillRect(gemX + 1, gemY + 1, 1, 1);
            break;
        case 'teardrop':
            ctx.fillRect(gemX + 1, gemY - 1, 1, 1);
            ctx.fillRect(gemX, gemY, 3, 1);
            ctx.fillRect(gemX, gemY + 1, 2, 1);
            break;
        case 'oval':
            ctx.fillRect(gemX, gemY, 2, 3);
            break;
        case 'star':
            ctx.fillRect(gemX + 1, gemY - 1, 1, 1);
            ctx.fillRect(gemX, gemY, 3, 1);
            ctx.fillRect(gemX + 1, gemY + 1, 1, 1);
            ctx.fillRect(gemX - 1, gemY, 1, 1);
            ctx.fillRect(gemX + 3, gemY, 1, 1);
            break;
        case 'crescent':
            ctx.fillRect(gemX, gemY, 2, 2);
            ctx.fillRect(gemX + 1, gemY - 1, 1, 1);
            // Cut-out
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(gemX + 1, gemY, 1, 1);
            break;
        case 'fang':
            ctx.fillRect(gemX, gemY, 2, 1);
            ctx.fillRect(gemX + 1, gemY + 1, 1, 2);
            break;
        case 'heart':
            ctx.fillRect(gemX, gemY, 1, 2);
            ctx.fillRect(gemX + 2, gemY, 1, 2);
            ctx.fillRect(gemX + 1, gemY + 1, 1, 1);
            ctx.fillRect(gemX + 1, gemY + 2, 1, 1);
            break;
        default:
            ctx.fillRect(gemX, gemY, 3, 2);
    }

    // Gem highlight
    if (gemC) {
        ctx.fillStyle = gemC;
        ctx.fillRect(gemX + (dir === DIR_DOWN ? 1 : 0), gemY, 1, 1);
    }

    // Glow
    if (gl) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = gl;
        ctx.fillRect(gemX - 1, gemY - 1, 5, 4);
        ctx.restore();
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
    const sizeMap = { small: 1, medium: 1.5, large: 2 };
    const s = sizeMap[sz] || 1;

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
        ctx.fillRect(crx + trailDir * 2, cry + 2, 1, 1);
        ctx.fillRect(crx + trailDir * 4, cry + 3, 1, 1);
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
            ctx.fillRect(crx + 1, cry, 1, 1);
            ctx.fillRect(crx, cry + 1, 3, 2);
            ctx.fillRect(crx + 1, cry + 3, 1, 1);
    }

    // Inner highlight
    ctx.fillStyle = ic;
    ctx.fillRect(crx + Math.round(1 * s), cry + Math.round(0.5 * s), Math.round(1 * s), Math.round(1 * s));

    // Outer glow
    if (gl) {
        ctx.globalAlpha = adjustedPulse * 0.2;
        ctx.fillStyle = gl;
        const glowSize = Math.round(2 * s);
        ctx.fillRect(crx - glowSize, cry - glowSize, Math.round(3 * s) + glowSize * 2, Math.round(3 * s) + glowSize * 2);
    }

    ctx.restore();
}

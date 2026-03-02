/**
 * HumanoidSpriteSystem.js — Professional pixel-art humanoid sprite renderer
 * with layered equipment overlays from weapon theme sprite sheets.
 *
 * Generates animated humanoid sprites for all 72 forms by compositing:
 *   1. Base humanoid body with element-colored skin (procedural pixel art)
 *   2. Equipment overlays extracted from weapon theme sheets:
 *      - Helmet, Chest, Boots, Gloves from left column of theme sheets
 *      - Weapon (sword/axe/staff/spear/crossbow) from theme sheets
 *   3. Rarity glow effects for epic/legendary gear
 *
 * Output format: 128x128 sprite sheets (4 dirs × 4 walk frames, 32×32 per frame)
 * Direction indices: 0=Down, 1=Left, 2=Right, 3=Up
 *
 * Equipment changes invalidate the cache, causing re-compositing on next draw.
 */

import { RACE_THEME_MAP, THEME_PATHS, EQUIPMENT_ROWS, STAGE_ARMOR_TIER } from '../../data/WeaponThemeData.js';
import { SPRITE_RACES } from '../../data/SpriteData.js';
import { EQUIPMENT } from '../../data/EquipmentData.js';

// ── Frame Constants ──────────────────────────────────────────────────────────
const FRAME_SIZE = 32;
const SHEET_COLS = 4;  // 4 walk frames
const SHEET_ROWS = 4;  // 4 directions (down, left, right, up)

// Direction indices
const DIR_DOWN  = 0;
const DIR_LEFT  = 1;
const DIR_RIGHT = 2;
const DIR_UP    = 3;

// ── Pixel Body Proportions (within 32×32 frame) ────────────────────────────
// Professional pixel-art humanoid at ~22px tall within frame
const BODY = {
    headW: 10, headH: 9,
    torsoW: 10, torsoH: 8,
    armW: 3,   armH: 8,
    legW: 4,   legH: 7,
    footW: 5,  footH: 2,
    shoulderW: 12,
};

// ── Caches ────────────────────────────────────────────────────────────────────
const _compositeCache = new Map();  // cacheKey → HTMLCanvasElement (128×128)
const _themeImageCache = new Map(); // themePath → HTMLImageElement
const _bodySheetImage = { img: null };

// ── Element Skin Colors ─────────────────────────────────────────────────────
const ELEMENT_SKIN = {
    Fire:     { skin: '#e8a060', mid: '#c87840', outline: '#8b5a2b', hair: '#cc3322', eye: '#ff4400' },
    Water:    { skin: '#88b8d8', mid: '#6898b8', outline: '#4a6a8a', hair: '#2266aa', eye: '#44aaff' },
    Nature:   { skin: '#8bc878', mid: '#6ba858', outline: '#4a7a3a', hair: '#337722', eye: '#44cc44' },
    Ice:      { skin: '#c0d8e8', mid: '#a0b8c8', outline: '#6a8a9a', hair: '#88bbdd', eye: '#aaeeff' },
    Air:      { skin: '#d0d8c0', mid: '#b0b8a0', outline: '#7a8a6a', hair: '#99aa88', eye: '#ccddaa' },
    Earth:    { skin: '#c8a878', mid: '#a88858', outline: '#7a6a4a', hair: '#664422', eye: '#cc8833' },
    Electric: { skin: '#e8d860', mid: '#c8b840', outline: '#8a7a2a', hair: '#ddaa00', eye: '#ffee00' },
    Dark:     { skin: '#8868a8', mid: '#684888', outline: '#4a3a6a', hair: '#332244', eye: '#aa44ff' },
    Light:    { skin: '#f0e8c0', mid: '#d0c8a0', outline: '#a09060', hair: '#eedd88', eye: '#ffee88' },
    Psychic:  { skin: '#d088c8', mid: '#b068a8', outline: '#7a4a7a', hair: '#cc44aa', eye: '#ff66cc' },
    Spirit:   { skin: '#b0c8d8', mid: '#90a8b8', outline: '#6a7a8a', hair: '#7799bb', eye: '#99ccee' },
    Chaos:    { skin: '#d86060', mid: '#b84040', outline: '#7a3030', hair: '#aa2211', eye: '#ff3322' },
    Metal:    { skin: '#b8b8c0', mid: '#9898a0', outline: '#6a6a7a', hair: '#888899', eye: '#aaaacc' },
    Poison:   { skin: '#a088c0', mid: '#8068a0', outline: '#5a4a6a', hair: '#773399', eye: '#aa55dd' },
};

// ── Rarity Glow Colors ──────────────────────────────────────────────────────
const RARITY_GLOW = {
    common: null,
    uncommon: '#33cc66',
    rare: '#3399ff',
    epic: '#aa44ff',
    legendary: '#ffaa00',
};

/**
 * Build a cache key that includes equipment loadout so different gear = different sprite.
 */
function _buildCacheKey(raceId, stage, equipment) {
    const eqParts = [];
    if (equipment) {
        // Sort keys for consistent hashing
        for (const slot of ['weapon', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'ring', 'amulet', 'crystal']) {
            const val = equipment[slot];
            if (val) eqParts.push(`${slot}:${typeof val === 'object' ? (val.equipment_id || 0) : val}`);
        }
    }
    return `${raceId}_${stage}_${eqParts.join('|')}`;
}

/**
 * Resolve equipment ID to data object.
 */
function _getEquipData(eqIdOrData) {
    if (!eqIdOrData) return null;
    if (typeof eqIdOrData === 'object') return eqIdOrData;
    return EQUIPMENT.find(e => e.equipment_id === eqIdOrData) || null;
}

/**
 * Determine weapon sub-type from name.
 */
function _guessWeaponType(name) {
    if (!name) return 'sword';
    const n = name.toLowerCase();
    if (n.includes('axe'))                      return 'axe';
    if (n.includes('staff') || n.includes('wand')) return 'staff';
    if (n.includes('bow') || n.includes('crossbow')) return 'crossbow';
    if (n.includes('spear') || n.includes('lance')) return 'spear';
    if (n.includes('dagger') || n.includes('knife')) return 'sword';
    if (n.includes('mace') || n.includes('hammer')) return 'axe';
    return 'sword';
}

// ═══════════════════════════════════════════════════════════════════════════════
// HumanoidSpriteSystem
// ═══════════════════════════════════════════════════════════════════════════════

export class HumanoidSpriteSystem {

    /**
     * Preload all required assets.
     */
    static async preloadAssets(assets) {
        try {
            _bodySheetImage.img = await assets.loadImage('../Sprites/Units/newbodytypes (1).png');
        } catch (e) {
            console.warn('HumanoidSpriteSystem: Could not load body types sheet', e);
        }

        const themePromises = [];
        const loadedThemes = new Set();
        for (const raceId in RACE_THEME_MAP) {
            const themeName = RACE_THEME_MAP[raceId].theme;
            const path = THEME_PATHS[themeName];
            if (path && !loadedThemes.has(path)) {
                loadedThemes.add(path);
                themePromises.push(
                    assets.loadImage(path)
                        .then(img => { _themeImageCache.set(path, img); })
                        .catch(() => {})
                );
            }
        }
        await Promise.all(themePromises);
    }

    /**
     * Get or generate a composite 128×128 walk cycle sprite sheet.
     * Equipment-aware: different equipment = different cached sheet.
     */
    static getCompositeSheet(raceId, stage = 1, equipment = null) {
        const cacheKey = _buildCacheKey(raceId, stage, equipment);
        if (_compositeCache.has(cacheKey)) {
            return _compositeCache.get(cacheKey);
        }
        const sheet = this._generateCompositeSheet(raceId, stage, equipment);
        _compositeCache.set(cacheKey, sheet);
        return sheet;
    }

    /**
     * Invalidate cached sprite for a specific unit's equipment loadout.
     */
    static invalidateCache(raceId, stage, equipment) {
        const cacheKey = _buildCacheKey(raceId, stage, equipment);
        _compositeCache.delete(cacheKey);
    }

    /**
     * Draw a single humanoid frame directly to canvas.
     */
    static drawFrame(ctx, raceId, stage, direction, frame, x, y, size, equipment = null) {
        const sheet = this.getCompositeSheet(raceId, stage, equipment);
        const sx = (frame % SHEET_COLS) * FRAME_SIZE;
        const sy = direction * FRAME_SIZE;
        const halfSize = size / 2;

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet,
            sx, sy, FRAME_SIZE, FRAME_SIZE,
            x - halfSize, y - size, size, size
        );
        ctx.imageSmoothingEnabled = true;
    }

    /**
     * Draw a humanoid with full equipment overlays.
     */
    static drawWithEquipment(ctx, raceId, stage, direction, frame, x, y, size, opts = {}) {
        const equipment = opts.equipment || null;
        this.drawFrame(ctx, raceId, stage, direction, frame, x, y, size, equipment);

        // Rarity glow effect for highest-rarity equipped item
        if (equipment) {
            const bestRarity = this._getHighestRarity(equipment);
            const glowColor = RARITY_GLOW[bestRarity];
            if (glowColor) {
                ctx.save();
                ctx.globalAlpha = 0.25 + Math.sin(Date.now() * 0.003) * 0.1;
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = bestRarity === 'legendary' ? 10 : 6;
                ctx.strokeStyle = glowColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(x, y - size * 0.4, size * 0.4, size * 0.5, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    /**
     * Clear all cached composite sheets.
     */
    static clearCache() {
        _compositeCache.clear();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private: Sheet Generation
    // ═══════════════════════════════════════════════════════════════════════════

    static _generateCompositeSheet(raceId, stage, equipment) {
        const sheet = document.createElement('canvas');
        sheet.width  = FRAME_SIZE * SHEET_COLS;
        sheet.height = FRAME_SIZE * SHEET_ROWS;
        const ctx = sheet.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const race = SPRITE_RACES.find(r => r.race_id === raceId);
        const elemType = (race && race.element_types && race.element_types[0]) || 'Fire';
        const colors = ELEMENT_SKIN[elemType] || ELEMENT_SKIN.Fire;

        const raceTheme = RACE_THEME_MAP[raceId] || RACE_THEME_MAP[1];
        const themePath = THEME_PATHS[raceTheme.theme];
        const themeImg = themePath ? _themeImageCache.get(themePath) : null;
        const armorTier = STAGE_ARMOR_TIER[stage] || 0;

        // Resolve equipment data
        const eqData = {};
        if (equipment) {
            for (const slot of ['weapon', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'ring', 'amulet', 'crystal']) {
                eqData[slot] = _getEquipData(equipment[slot]);
            }
        }

        // Determine weapon type for rendering
        let weaponType = raceTheme.weapon || 'sword';
        if (eqData.weapon) {
            weaponType = _guessWeaponType(eqData.weapon.equipment_name);
        }

        // Generate all 4 directions × 4 walk frames
        for (let dir = 0; dir < 4; dir++) {
            for (let frame = 0; frame < 4; frame++) {
                const fx = frame * FRAME_SIZE;
                const fy = dir * FRAME_SIZE;

                this._drawHumanoidFrame(ctx, fx, fy, dir, frame, stage, colors, armorTier,
                    themeImg, raceTheme, weaponType, eqData);
            }
        }

        return sheet;
    }

    /**
     * Draw one complete humanoid frame with all equipment layers.
     * Professional pixel-art quality with proper anatomy, shading, and animation.
     */
    static _drawHumanoidFrame(ctx, fx, fy, dir, frame, stage, colors, armorTier,
                               themeImg, raceTheme, weaponType, eqData) {
        // Scale factor based on evolution stage (stage 3 = slightly larger)
        const scale = 0.9 + (stage - 1) * 0.05;

        // Walking animation offsets
        const walk = [
            { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0,  weaponAngle: 0 },
            { armL: -2, armR: 2,  legL: 3,  legR: -2, bob: -1, weaponAngle: -5 },
            { armL: 0,  armR: 0,  legL: 0,  legR: 0,  bob: 0,  weaponAngle: 0 },
            { armL: 2,  armR: -2, legL: -2, legR: 3,  bob: -1, weaponAngle: 5 },
        ][frame];

        // Body reference point (center-bottom of character in frame)
        const cx = fx + FRAME_SIZE / 2;
        const groundY = fy + FRAME_SIZE - 2;
        const bob = walk.bob;

        // ── Dimensions ─────────────────────────────────────────
        const headW = Math.round(BODY.headW * scale);
        const headH = Math.round(BODY.headH * scale);
        const torsoW = Math.round(BODY.torsoW * scale);
        const torsoH = Math.round(BODY.torsoH * scale);
        const armW = Math.round(BODY.armW * scale);
        const armH = Math.round(BODY.armH * scale);
        const legW = Math.round(BODY.legW * scale);
        const legH = Math.round(BODY.legH * scale);

        // ── Anchor points ─────────────────────────────────────
        const feetY = groundY;
        const legsTopY = feetY - legH;
        const torsoTopY = legsTopY - torsoH + 1;
        const headTopY = torsoTopY - headH + 2 + bob;
        const shoulderY = torsoTopY + 2 + bob;

        // Determine drawing order based on direction
        const isFacingDown = dir === DIR_DOWN;
        const isFacingUp   = dir === DIR_UP;
        const isFacingLeft = dir === DIR_LEFT;
        const isFacingRight = dir === DIR_RIGHT;

        // ────────────────────────────────────────────────────────
        // LAYER 1: Back arm (behind body when facing down/side)
        // ────────────────────────────────────────────────────────
        if (isFacingDown || isFacingLeft) {
            this._drawArm(ctx, cx + torsoW / 2, shoulderY, armW, armH,
                walk.armR, colors, 'right', eqData.gloves);
        }
        if (isFacingDown || isFacingRight) {
            this._drawArm(ctx, cx - torsoW / 2 - armW, shoulderY, armW, armH,
                walk.armL, colors, 'left', eqData.gloves);
        }

        // Back weapon (behind body when facing down)
        if (isFacingUp) {
            this._drawWeaponPixel(ctx, cx, shoulderY, armH, dir, frame, weaponType,
                colors, themeImg, raceTheme, eqData.weapon, armorTier);
        }

        // ────────────────────────────────────────────────────────
        // LAYER 2: Legs + boots
        // ────────────────────────────────────────────────────────
        this._drawLegs(ctx, cx, legsTopY, legW, legH, walk, colors, dir, eqData.boots, eqData.legs);

        // ────────────────────────────────────────────────────────
        // LAYER 3: Torso + chest armor
        // ────────────────────────────────────────────────────────
        this._drawTorso(ctx, cx, torsoTopY + bob, torsoW, torsoH, colors, dir, armorTier,
            themeImg, raceTheme, eqData.chest);

        // ────────────────────────────────────────────────────────
        // LAYER 4: Head + helmet
        // ────────────────────────────────────────────────────────
        this._drawHead(ctx, cx, headTopY, headW, headH, colors, dir,
            themeImg, raceTheme, eqData.helmet, armorTier);

        // ────────────────────────────────────────────────────────
        // LAYER 5: Front arms + weapon
        // ────────────────────────────────────────────────────────
        if (isFacingDown || isFacingRight) {
            this._drawArm(ctx, cx + torsoW / 2, shoulderY, armW, armH,
                walk.armR, colors, 'right', eqData.gloves);
        }
        if (isFacingDown || isFacingLeft) {
            this._drawArm(ctx, cx - torsoW / 2 - armW, shoulderY, armW, armH,
                walk.armL, colors, 'left', eqData.gloves);
        }
        if (isFacingUp) {
            // Arms already drawn, weapon behind body
        } else {
            this._drawWeaponPixel(ctx, cx, shoulderY, armH, dir, frame, weaponType,
                colors, themeImg, raceTheme, eqData.weapon, armorTier);
        }

        // ────────────────────────────────────────────────────────
        // LAYER 6: Accessory effects (ring, amulet, crystal)
        // ────────────────────────────────────────────────────────

        // Ring: small glowing band on front hand
        if (eqData.ring) {
            const ringPos = this._drawRingEffect(ctx, cx, shoulderY, armH, torsoW, walk, dir);
            this._renderRing(ctx, ringPos, eqData.ring);
        }

        // Amulet: pendant/necklace on neck/upper chest
        if (eqData.amulet) {
            this._drawAmuletEffect(ctx, cx, torsoTopY, bob, dir, eqData.amulet);
        }

        // Crystal: floating diamond above/behind shoulder
        if (eqData.crystal) {
            this._drawCrystalEffect(ctx, cx, headTopY, torsoW, dir, frame, eqData.crystal);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Body Part Renderers (pixel-art quality)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Draw the head with optional helmet overlay.
     */
    static _drawHead(ctx, cx, topY, w, h, colors, dir, themeImg, raceTheme, helmetData, armorTier) {
        const x = Math.floor(cx - w / 2);
        const y = Math.floor(topY);

        // Hair (back layer, visible from behind)
        if (dir === DIR_UP) {
            ctx.fillStyle = colors.hair;
            ctx.fillRect(x - 1, y, w + 2, h - 1);
            ctx.fillStyle = colors.outline;
            ctx.fillRect(x - 1, y - 1, w + 2, 1);
            ctx.fillRect(x - 2, y, 1, h - 2);
            ctx.fillRect(x + w + 1, y, 1, h - 2);
        }

        // Head shape
        ctx.fillStyle = colors.outline;
        ctx.fillRect(x - 1, y, w + 2, h + 1); // outline
        ctx.fillStyle = colors.skin;
        ctx.fillRect(x, y + 1, w, h - 1); // main face
        // Skin highlight (left side shading for 3D effect)
        ctx.fillStyle = colors.mid;
        ctx.fillRect(x + Math.floor(w * 0.6), y + 1, Math.floor(w * 0.4), h - 1);

        // Facial features (only when facing down or sides)
        if (dir !== DIR_UP) {
            // Eyes
            const eyeY = y + Math.floor(h * 0.35);
            if (dir === DIR_DOWN) {
                // Two eyes
                const eyeSpacing = Math.floor(w * 0.3);
                ctx.fillStyle = '#fff';
                ctx.fillRect(cx - eyeSpacing - 1, eyeY, 3, 2);
                ctx.fillRect(cx + eyeSpacing - 1, eyeY, 3, 2);
                ctx.fillStyle = colors.eye;
                ctx.fillRect(cx - eyeSpacing, eyeY, 2, 2);
                ctx.fillRect(cx + eyeSpacing, eyeY, 2, 2);
                ctx.fillStyle = '#111';
                ctx.fillRect(cx - eyeSpacing, eyeY + 1, 1, 1);
                ctx.fillRect(cx + eyeSpacing, eyeY + 1, 1, 1);
            } else {
                // Side-facing: one eye visible
                const eyeX = dir === DIR_RIGHT ? cx + 1 : cx - 2;
                ctx.fillStyle = '#fff';
                ctx.fillRect(eyeX - 1, eyeY, 3, 2);
                ctx.fillStyle = colors.eye;
                ctx.fillRect(eyeX, eyeY, 2, 2);
                ctx.fillStyle = '#111';
                ctx.fillRect(eyeX, eyeY + 1, 1, 1);
            }

            // Mouth (subtle)
            if (dir === DIR_DOWN) {
                ctx.fillStyle = colors.outline;
                ctx.fillRect(cx - 1, y + h - 3, 2, 1);
            }
        }

        // Hair (front layer)
        if (dir !== DIR_UP) {
            ctx.fillStyle = colors.hair;
            // Hair on top
            ctx.fillRect(x - 1, y - 1, w + 2, 3);
            // Side hair wisps
            if (dir === DIR_DOWN || dir === DIR_LEFT) {
                ctx.fillRect(x - 1, y + 1, 2, 3);
            }
            if (dir === DIR_DOWN || dir === DIR_RIGHT) {
                ctx.fillRect(x + w - 1, y + 1, 2, 3);
            }
        }

        // ── Helmet overlay ─────────────────────────────────────
        if (helmetData && themeImg && themeImg.complete) {
            this._overlayEquipmentPiece(ctx, themeImg, 'helmet', armorTier,
                x - 1, y - 2, w + 2, h + 1);
        } else if (helmetData) {
            // Procedural helmet (when no theme sheet available)
            const rarity = helmetData.rarity || 'common';
            const helmColor = this._getArmorColor(rarity, colors);
            ctx.fillStyle = helmColor;
            ctx.fillRect(x - 1, y - 2, w + 2, 4);
            ctx.fillRect(x, y - 3, w, 1);
            // Visor highlight
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(x, y - 2, Math.floor(w * 0.4), 3);
        }
    }

    /**
     * Draw the torso with optional chest armor overlay.
     */
    static _drawTorso(ctx, cx, topY, w, h, colors, dir, armorTier, themeImg, raceTheme, chestData) {
        const x = Math.floor(cx - w / 2);
        const y = Math.floor(topY);

        // Base torso
        ctx.fillStyle = colors.outline;
        ctx.fillRect(x - 1, y, w + 2, h + 1);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(x, y, w, h);
        // Shading
        ctx.fillStyle = colors.mid;
        ctx.fillRect(x + Math.floor(w * 0.55), y, Math.ceil(w * 0.45), h);

        // ── Chest armor overlay ─────────────────────────────────
        if (chestData && themeImg && themeImg.complete) {
            this._overlayEquipmentPiece(ctx, themeImg, 'chestplate', armorTier,
                x - 1, y - 1, w + 2, h + 2);
        } else if (chestData) {
            // Procedural chest armor
            const rarity = chestData.rarity || 'common';
            const armorColor = this._getArmorColor(rarity, colors);
            ctx.fillStyle = armorColor;
            ctx.fillRect(x, y, w, h);
            // Armor plates
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x + 1, y + 1, Math.floor(w * 0.4), h - 2);
            // Dark trim
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(x, y + h - 1, w, 1);
            ctx.fillRect(cx - 1, y, 2, h);
        } else {
            // Basic tunic when no armor
            const tunicColor = this._shiftColor(colors.skin, -30);
            ctx.fillStyle = tunicColor;
            ctx.fillRect(x + 1, y + 1, w - 2, h - 1);
        }
    }

    /**
     * Draw legs with optional boots and leg armor.
     */
    static _drawLegs(ctx, cx, topY, legW, legH, walk, colors, dir, bootsData, legsData) {
        const gap = 1;
        const leftLegX = Math.floor(cx - legW - gap / 2);
        const rightLegX = Math.floor(cx + gap / 2);

        // Left leg
        const lly = Math.floor(topY + walk.legL);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(leftLegX - 1, lly, legW + 2, legH + 1);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(leftLegX, lly, legW, legH);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(leftLegX + Math.floor(legW * 0.5), lly, Math.ceil(legW * 0.5), legH);

        // Right leg
        const rly = Math.floor(topY + walk.legR);
        ctx.fillStyle = colors.outline;
        ctx.fillRect(rightLegX - 1, rly, legW + 2, legH + 1);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(rightLegX, rly, legW, legH);
        ctx.fillStyle = colors.mid;
        ctx.fillRect(rightLegX + Math.floor(legW * 0.5), rly, Math.ceil(legW * 0.5), legH);

        // ── Leg armor overlay ───────────────────────────────────
        if (legsData) {
            const rarity = legsData.rarity || 'common';
            const armorColor = this._getArmorColor(rarity, colors);
            ctx.fillStyle = armorColor;
            ctx.fillRect(leftLegX, lly, legW, Math.floor(legH * 0.6));
            ctx.fillRect(rightLegX, rly, legW, Math.floor(legH * 0.6));
            // Knee plates
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(leftLegX, lly + 1, legW, 2);
            ctx.fillRect(rightLegX, rly + 1, legW, 2);
        }

        // ── Boot overlay ────────────────────────────────────────
        const bootH = 3;
        if (bootsData) {
            const rarity = bootsData.rarity || 'common';
            const bootColor = this._getArmorColor(rarity, colors);
            ctx.fillStyle = bootColor;
            ctx.fillRect(leftLegX - 1, lly + legH - bootH, legW + 2, bootH + 1);
            ctx.fillRect(rightLegX - 1, rly + legH - bootH, legW + 2, bootH + 1);
            // Boot highlight
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(leftLegX, lly + legH - bootH, Math.floor(legW * 0.4), bootH);
            ctx.fillRect(rightLegX, rly + legH - bootH, Math.floor(legW * 0.4), bootH);
        } else {
            // Simple shoes
            ctx.fillStyle = '#553322';
            ctx.fillRect(leftLegX - 1, lly + legH - 2, legW + 2, 3);
            ctx.fillRect(rightLegX - 1, rly + legH - 2, legW + 2, 3);
        }
    }

    /**
     * Draw an arm with optional glove overlay.
     */
    static _drawArm(ctx, x, topY, w, h, swing, colors, side, glovesData) {
        const ax = Math.floor(x);
        const ay = Math.floor(topY + swing);

        ctx.fillStyle = colors.outline;
        ctx.fillRect(ax - 1, ay, w + 2, h + 1);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(ax, ay, w, h);
        ctx.fillStyle = colors.mid;
        if (side === 'right') {
            ctx.fillRect(ax + Math.floor(w * 0.5), ay, Math.ceil(w * 0.5), h);
        }

        // Glove overlay (covers hand = bottom 3px of arm)
        if (glovesData) {
            const rarity = glovesData.rarity || 'common';
            const gloveColor = this._getArmorColor(rarity, colors);
            ctx.fillStyle = gloveColor;
            ctx.fillRect(ax, ay + h - 3, w, 3);
        }
    }

    /**
     * Draw weapon as pixel art (procedural or from theme sheet).
     */
    static _drawWeaponPixel(ctx, cx, shoulderY, armH, dir, frame, weaponType,
                             colors, themeImg, raceTheme, weaponData, armorTier) {
        // Position weapon relative to character's hand
        let wx, wy;
        const handOffset = armH - 2;

        switch (dir) {
            case DIR_DOWN:
                wx = cx + 5;
                wy = shoulderY + 2;
                break;
            case DIR_LEFT:
                wx = cx - 8;
                wy = shoulderY + 1;
                break;
            case DIR_RIGHT:
                wx = cx + 6;
                wy = shoulderY + 1;
                break;
            case DIR_UP:
                wx = cx - 6;
                wy = shoulderY - 2;
                break;
        }

        // Try extracting weapon from theme sheet
        if (themeImg && themeImg.complete && themeImg.width > 0) {
            const equipRow = EQUIPMENT_ROWS[weaponType];
            if (equipRow) {
                const tier = Math.min(armorTier, equipRow.tiers - 1);
                const srcX = tier * (equipRow.cellW + 4) + equipRow.offsetX;
                const srcY = equipRow.offsetY;

                if (srcX + equipRow.cellW <= themeImg.width &&
                    srcY + equipRow.cellH <= themeImg.height) {
                    ctx.save();
                    ctx.imageSmoothingEnabled = false;
                    const drawW = Math.floor(equipRow.cellW * 0.6);
                    const drawH = Math.floor(equipRow.cellH * 0.6);

                    // Flip weapon for left-facing
                    if (dir === DIR_LEFT) {
                        ctx.translate(wx + drawW / 2, wy);
                        ctx.scale(-1, 1);
                        ctx.drawImage(themeImg,
                            srcX, srcY, equipRow.cellW, equipRow.cellH,
                            -drawW / 2, 0, drawW, drawH);
                    } else {
                        ctx.drawImage(themeImg,
                            srcX, srcY, equipRow.cellW, equipRow.cellH,
                            wx, wy, drawW, drawH);
                    }
                    ctx.restore();
                    return;
                }
            }
        }

        // Procedural weapon fallback (detailed pixel art)
        this._drawProceduralWeapon(ctx, wx, wy, dir, weaponType, weaponData, colors);
    }

    /**
     * Draw a procedural pixel-art weapon.
     */
    static _drawProceduralWeapon(ctx, wx, wy, dir, weaponType, weaponData, colors) {
        const rarity = weaponData ? (weaponData.rarity || 'common') : 'common';
        const bladeTint = this._getWeaponColor(rarity);
        const handleColor = '#553311';
        const pommelColor = '#887744';

        switch (weaponType) {
            case 'sword': {
                // Blade
                ctx.fillStyle = bladeTint;
                if (dir === DIR_LEFT) {
                    ctx.fillRect(wx - 1, wy - 8, 2, 12);
                    ctx.fillRect(wx - 2, wy - 9, 4, 2); // tip
                } else {
                    ctx.fillRect(wx, wy - 8, 2, 12);
                    ctx.fillRect(wx - 1, wy - 9, 4, 2);
                }
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillRect(wx, wy - 7, 1, 8);
                // Guard
                ctx.fillStyle = pommelColor;
                ctx.fillRect(wx - 2, wy + 3, 6, 2);
                // Handle
                ctx.fillStyle = handleColor;
                ctx.fillRect(wx, wy + 5, 2, 4);
                break;
            }
            case 'axe': {
                // Handle
                ctx.fillStyle = handleColor;
                ctx.fillRect(wx, wy - 4, 2, 14);
                // Axe head
                ctx.fillStyle = bladeTint;
                ctx.fillRect(wx - 3, wy - 6, 6, 5);
                ctx.fillRect(wx - 4, wy - 5, 2, 3);
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(wx - 3, wy - 5, 1, 3);
                break;
            }
            case 'staff': {
                // Shaft
                ctx.fillStyle = '#665533';
                ctx.fillRect(wx, wy - 10, 2, 18);
                // Crystal top
                const crystalColor = weaponData && weaponData.element_synergy
                    ? (ELEMENT_SKIN[weaponData.element_synergy] || ELEMENT_SKIN.Light).eye
                    : '#aaccff';
                ctx.fillStyle = crystalColor;
                ctx.fillRect(wx - 1, wy - 12, 4, 4);
                ctx.fillRect(wx, wy - 13, 2, 1);
                // Glow
                ctx.fillStyle = crystalColor;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(wx - 2, wy - 13, 6, 6);
                ctx.globalAlpha = 1;
                break;
            }
            case 'spear': {
                // Shaft
                ctx.fillStyle = handleColor;
                ctx.fillRect(wx, wy - 6, 2, 16);
                // Spearhead
                ctx.fillStyle = bladeTint;
                ctx.fillRect(wx - 1, wy - 10, 4, 5);
                ctx.fillRect(wx, wy - 11, 2, 2);
                break;
            }
            case 'crossbow': {
                // Stock
                ctx.fillStyle = handleColor;
                ctx.fillRect(wx - 1, wy, 6, 2);
                ctx.fillRect(wx + 3, wy + 1, 2, 4);
                // Bow limbs
                ctx.fillStyle = '#776644';
                ctx.fillRect(wx - 3, wy - 3, 2, 6);
                ctx.fillRect(wx + 5, wy - 3, 2, 6);
                // String
                ctx.fillStyle = '#ccccaa';
                ctx.fillRect(wx - 2, wy - 3, 8, 1);
                break;
            }
            default: {
                // Generic weapon
                ctx.fillStyle = bladeTint;
                ctx.fillRect(wx, wy - 6, 2, 10);
                ctx.fillStyle = handleColor;
                ctx.fillRect(wx - 1, wy + 3, 4, 3);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Equipment Overlay from Theme Sheet
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Extract and overlay an equipment piece from the theme sprite sheet.
     */
    static _overlayEquipmentPiece(ctx, themeImg, pieceType, armorTier, dx, dy, dw, dh) {
        const equipRow = EQUIPMENT_ROWS[pieceType];
        if (!equipRow) return;

        const tier = Math.min(armorTier, equipRow.tiers - 1);
        const srcX = tier * (equipRow.cellW + 4) + equipRow.offsetX;
        const srcY = equipRow.offsetY;

        if (srcX + equipRow.cellW > themeImg.width ||
            srcY + equipRow.cellH > themeImg.height) return;

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(themeImg,
            srcX, srcY, equipRow.cellW, equipRow.cellH,
            dx, dy, dw, dh);
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Accessory Renderers (Ring, Amulet, Crystal)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get rarity-based accent color for accessories.
     */
    static _getAccessoryColor(rarity) {
        switch (rarity) {
            case 'legendary': return '#ffaa00';
            case 'epic':      return '#aa44ff';
            case 'rare':      return '#4488ff';
            case 'uncommon':  return '#44cc66';
            default:          return '#aa8855';
        }
    }

    /**
     * Draw a small glowing ring/band on the front hand.
     * Rendered as a 2-3px band with a 1px sparkle highlight.
     */
    static _drawRingEffect(ctx, cx, shoulderY, armH, torsoW, walk, dir) {
        // No ring data — nothing to draw (caller checks, but guard anyway)
        // Position ring at the hand of the front arm
        const armW = 3;
        let rx, ry;

        if (dir === DIR_DOWN) {
            // Front hand is the right arm (drawn in front)
            rx = Math.floor(cx + torsoW / 2);
            ry = Math.floor(shoulderY + walk.armR + armH - 2);
        } else if (dir === DIR_LEFT) {
            // Left-facing: left arm is in front
            rx = Math.floor(cx - torsoW / 2 - armW);
            ry = Math.floor(shoulderY + walk.armL + armH - 2);
        } else if (dir === DIR_RIGHT) {
            // Right-facing: right arm is in front
            rx = Math.floor(cx + torsoW / 2);
            ry = Math.floor(shoulderY + walk.armR + armH - 2);
        } else {
            // Facing up: ring not visible (hands face away)
            return;
        }

        return { x: rx, y: ry };
    }

    /**
     * Render the ring pixels at the computed position.
     */
    static _renderRing(ctx, ringPos, ringData) {
        if (!ringPos) return;
        const rarity = ringData.rarity || 'common';
        const color = this._getAccessoryColor(rarity);

        const rx = ringPos.x;
        const ry = ringPos.y;

        // Ring band (2px wide, 1px tall)
        ctx.fillStyle = color;
        ctx.fillRect(rx, ry, 3, 1);

        // Ring body / gem (1px centered on band)
        ctx.fillRect(rx + 1, ry - 1, 1, 1);

        // Sparkle highlight (1px bright white pixel)
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(rx + 1, ry - 1, 1, 1);

        // Subtle glow around the ring
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = color;
        ctx.fillRect(rx - 1, ry - 1, 5, 3);
        ctx.restore();
    }

    /**
     * Draw a small pendant/necklace below the head on the neck/upper chest area.
     * 3-4px wide gem/circle with rarity-based coloring and a subtle glow.
     */
    static _drawAmuletEffect(ctx, cx, torsoTopY, bob, dir, amuletData) {
        if (dir === DIR_UP) return; // Amulet not visible from behind

        const rarity = amuletData.rarity || 'common';
        const gemColor = this._getAccessoryColor(rarity);

        // Necklace sits at the top of the torso (neck area)
        const neckY = Math.floor(torsoTopY + bob);
        const neckCx = Math.floor(cx);

        // Chain (thin line from shoulders down to pendant)
        ctx.fillStyle = '#888877';
        if (dir === DIR_DOWN) {
            // V-shaped chain visible from front
            ctx.fillRect(neckCx - 2, neckY, 1, 2);
            ctx.fillRect(neckCx + 1, neckY, 1, 2);
            ctx.fillRect(neckCx - 1, neckY + 1, 1, 1);
            ctx.fillRect(neckCx,     neckY + 1, 1, 1);
        } else {
            // Side view: single chain line
            const chainX = dir === DIR_RIGHT ? neckCx + 1 : neckCx - 1;
            ctx.fillRect(chainX, neckY, 1, 2);
        }

        // Pendant gem (centered below chain)
        const gemY = neckY + 2;
        const gemX = dir === DIR_DOWN ? neckCx - 1 : (dir === DIR_RIGHT ? neckCx : neckCx - 1);

        // Gem body
        ctx.fillStyle = gemColor;
        if (dir === DIR_DOWN) {
            // Front view: 3px wide diamond/circle shape
            ctx.fillRect(gemX, gemY, 3, 2);
            ctx.fillRect(gemX + 1, gemY - 1, 1, 1); // top point
            ctx.fillRect(gemX + 1, gemY + 2, 1, 1);  // bottom point
        } else {
            // Side view: 2px visible
            ctx.fillRect(gemX, gemY, 2, 2);
        }

        // Gem highlight (1px bright spot)
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        if (dir === DIR_DOWN) {
            ctx.fillRect(gemX, gemY, 1, 1);
        } else {
            ctx.fillRect(gemX, gemY, 1, 1);
        }

        // Subtle glow around the gem
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = gemColor;
        ctx.fillRect(gemX - 1, gemY - 1, dir === DIR_DOWN ? 5 : 4, 4);
        ctx.restore();
    }

    /**
     * Draw a small floating crystal above/behind the shoulder area.
     * 3-5px diamond shape with element-based or rarity coloring.
     * Pulsing opacity effect based on frame number.
     */
    static _drawCrystalEffect(ctx, cx, headTopY, torsoW, dir, frame, crystalData) {
        const rarity = crystalData.rarity || 'common';

        // Determine crystal color: element_synergy takes priority, then rarity
        let crystalColor;
        if (crystalData.element_synergy && ELEMENT_SKIN[crystalData.element_synergy]) {
            crystalColor = ELEMENT_SKIN[crystalData.element_synergy].eye;
        } else {
            crystalColor = this._getAccessoryColor(rarity);
        }

        // Position: floating above/behind the shoulder
        let crx, cry;
        if (dir === DIR_DOWN) {
            crx = Math.floor(cx - torsoW / 2 - 3);
            cry = Math.floor(headTopY - 1);
        } else if (dir === DIR_UP) {
            crx = Math.floor(cx + torsoW / 2 + 1);
            cry = Math.floor(headTopY - 1);
        } else if (dir === DIR_LEFT) {
            crx = Math.floor(cx + 2);
            cry = Math.floor(headTopY - 2);
        } else {
            crx = Math.floor(cx - 4);
            cry = Math.floor(headTopY - 2);
        }

        // Pulsing opacity (alternates brightness based on frame number)
        const pulse = [0.7, 0.85, 1.0, 0.85][frame];

        ctx.save();
        ctx.globalAlpha = pulse;

        // Diamond shape (5px tall, 3px wide at center)
        //     X       (top)
        //    XXX      (middle)
        //     X       (bottom)
        ctx.fillStyle = crystalColor;
        ctx.fillRect(crx + 1, cry, 1, 1);       // top point
        ctx.fillRect(crx,     cry + 1, 3, 2);   // middle body
        ctx.fillRect(crx + 1, cry + 3, 1, 1);   // bottom point

        // Inner highlight (bright center pixel)
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(crx + 1, cry + 1, 1, 1);

        // Outer glow
        ctx.globalAlpha = pulse * 0.2;
        ctx.fillStyle = crystalColor;
        ctx.fillRect(crx - 1, cry - 1, 5, 6);

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Color Helpers
    // ═══════════════════════════════════════════════════════════════════════════

    static _getArmorColor(rarity, colors) {
        switch (rarity) {
            case 'legendary': return '#d4a520';
            case 'epic':      return '#7744bb';
            case 'rare':      return '#3377cc';
            case 'uncommon':  return '#448844';
            default:          return '#666677';
        }
    }

    static _getWeaponColor(rarity) {
        switch (rarity) {
            case 'legendary': return '#e8c840';
            case 'epic':      return '#9955dd';
            case 'rare':      return '#4488dd';
            case 'uncommon':  return '#55aa55';
            default:          return '#aab0b8';
        }
    }

    static _shiftColor(hex, amount) {
        // Simple color shift for tunic variation
        const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
        return `rgb(${r},${g},${b})`;
    }

    static _getHighestRarity(equipment) {
        const rank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
        let best = 'common';
        for (const slot of Object.keys(equipment)) {
            const data = _getEquipData(equipment[slot]);
            if (data && rank[data.rarity] > rank[best]) {
                best = data.rarity;
            }
        }
        return best;
    }
}

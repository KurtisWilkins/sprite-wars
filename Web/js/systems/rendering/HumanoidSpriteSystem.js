/**
 * HumanoidSpriteSystem.js — Professional pixel-art humanoid sprite renderer
 * with layered equipment overlays and race-specific body shapes.
 *
 * Generates animated humanoid sprites for all 72 forms by compositing:
 *   1. Race-specific humanoid body (24 unique races) with element-colored skin
 *   2. Equipment overlays with per-item unique visuals (144 items)
 *   3. Rarity glow effects for epic/legendary gear
 *
 * Output format: 256x256 sprite sheets (4 dirs × 4 walk frames, 64×64 per frame)
 * Direction indices: 0=Down, 1=Left, 2=Right, 3=Up
 *
 * Equipment changes invalidate the cache, causing re-compositing on next draw.
 */

import { RACE_THEME_MAP, THEME_PATHS, EQUIPMENT_ROWS, STAGE_ARMOR_TIER } from '../../data/WeaponThemeData.js';
import { SPRITE_RACES } from '../../data/SpriteData.js';
import { EQUIPMENT } from '../../data/EquipmentData.js';
import { getVisualConfig, getSlotVisualDefaults } from '../../data/EquipmentVisualConfig.js';
import {
    drawWeaponByConfig, drawHelmetByConfig, drawChestByConfig,
    drawLegsArmorByConfig, drawBootsByConfig, drawGlovesByConfig,
    drawRingByConfig, drawAmuletByConfig, drawCrystalByConfig
} from './EquipmentRenderers.js';
import { drawRaceBody } from './RaceBodyRenderer.js';
import { drawRaceBodyExt } from './RaceBodyRendererExt.js';

// ── Frame Constants ──────────────────────────────────────────────────────────
const FRAME_SIZE = 64;
const SHEET_COLS = 4;  // 4 walk frames
const SHEET_ROWS = 4;  // 4 directions (down, left, right, up)

// Direction indices
const DIR_DOWN  = 0;
const DIR_LEFT  = 1;
const DIR_RIGHT = 2;
const DIR_UP    = 3;

// ── Pixel Body Proportions (within 64×64 frame) ────────────────────────────
// Professional pixel-art humanoid at ~44px tall within frame
const BODY = {
    headW: 18, headH: 16,
    torsoW: 18, torsoH: 14,
    armW: 6,   armH: 14,
    legW: 7,   legH: 12,
    footW: 9,  footH: 4,
    shoulderW: 22,
};

/**
 * Dispatch race body rendering to the appropriate race-specific renderer.
 * Races 1-12 use RaceBodyRenderer, races 13-24 use RaceBodyRendererExt.
 * Returns anchor points for equipment positioning.
 */
function _drawRaceSpecificBody(ctx, raceId, cx, groundY, dir, frame, scale, colors) {
    if (raceId >= 1 && raceId <= 12) {
        return drawRaceBody(ctx, raceId, cx, groundY, dir, frame, scale, colors);
    } else if (raceId >= 13 && raceId <= 24) {
        return drawRaceBodyExt(ctx, raceId, cx, groundY, dir, frame, scale, colors);
    }
    // Fallback for unknown race IDs: use Human (race 12) rendering
    return drawRaceBody(ctx, 12, cx, groundY, dir, frame, scale, colors);
}

// ── Caches ────────────────────────────────────────────────────────────────────
const _compositeCache = new Map();  // cacheKey → HTMLCanvasElement (256×256)
const _themeImageCache = new Map(); // themePath → HTMLImageElement
const _bodySheetImage = { img: null };

// ── Element Skin Colors ─────────────────────────────────────────────────────
const ELEMENT_SKIN = {
    Fire:     { skin: '#e8a060', mid: '#c87840', outline: '#8b5a2b', hair: '#cc3322', eye: '#ff4400' },
    Water:    { skin: '#88b8d8', mid: '#6898b8', outline: '#4a6a8a', hair: '#2266aa', eye: '#44aaff' },
    Plant:    { skin: '#8bc878', mid: '#6ba858', outline: '#4a7a3a', hair: '#337722', eye: '#44cc44' },
    Ice:      { skin: '#c0d8e8', mid: '#a0b8c8', outline: '#6a8a9a', hair: '#88bbdd', eye: '#aaeeff' },
    Wind:     { skin: '#d0d8c0', mid: '#b0b8a0', outline: '#7a8a6a', hair: '#99aa88', eye: '#ccddaa' },
    Earth:    { skin: '#c8a878', mid: '#a88858', outline: '#7a6a4a', hair: '#664422', eye: '#cc8833' },
    Electric: { skin: '#e8d860', mid: '#c8b840', outline: '#8a7a2a', hair: '#ddaa00', eye: '#ffee00' },
    Dark:     { skin: '#8868a8', mid: '#684888', outline: '#4a3a6a', hair: '#332244', eye: '#aa44ff' },
    Light:    { skin: '#f0e8c0', mid: '#d0c8a0', outline: '#a09060', hair: '#eedd88', eye: '#ffee88' },
    Fairy:    { skin: '#d088c8', mid: '#b068a8', outline: '#7a4a7a', hair: '#cc44aa', eye: '#ff66cc' },
    Solar:    { skin: '#b0c8d8', mid: '#90a8b8', outline: '#6a7a8a', hair: '#7799bb', eye: '#99ccee' },
    Lunar:    { skin: '#d86060', mid: '#b84040', outline: '#7a3030', hair: '#aa2211', eye: '#ff3322' },
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
     * Get or generate a composite 256×256 walk cycle sprite sheet.
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
                    themeImg, raceTheme, weaponType, eqData, raceId);
            }
        }

        return sheet;
    }

    /**
     * Draw one complete humanoid frame with race-specific body and equipment layers.
     * Uses RaceBodyRenderer for unique race shapes, then overlays equipment.
     */
    static _drawHumanoidFrame(ctx, fx, fy, dir, frame, stage, colors, armorTier,
                               themeImg, raceTheme, weaponType, eqData, raceId) {
        // Scale factor based on evolution stage (stage 3 = slightly larger)
        const scale = 0.9 + (stage - 1) * 0.05;

        // Body reference point (center-bottom of character in frame)
        const cx = fx + FRAME_SIZE / 2;
        const groundY = fy + FRAME_SIZE - 3;

        // ────────────────────────────────────────────────────────
        // Draw race-specific body and get anchor points for equipment
        // ────────────────────────────────────────────────────────
        const anchors = _drawRaceSpecificBody(ctx, raceId, cx, groundY, dir, frame, scale, colors);

        // Extract anchor points
        const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
                shoulderY, leftArmX, rightArmX, armW, armH,
                leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = anchors;

        const headTopY = headY;
        const torsoTopY = torsoY;

        // ────────────────────────────────────────────────────────
        // EQUIPMENT OVERLAYS (drawn on top of race body)
        // ────────────────────────────────────────────────────────

        // ── Helmet overlay ─────────────────────────────────────
        if (eqData.helmet) {
            const helmetId = eqData.helmet.equipment_id || 0;
            const helmetVisual = helmetId ? getVisualConfig(helmetId) : null;

            if (helmetVisual && helmetVisual.style) {
                drawHelmetByConfig(ctx, headX - 1, headY - 3, headW + 2, headH + 2, helmetVisual, colors);
            } else if (themeImg && themeImg.complete) {
                this._overlayEquipmentPiece(ctx, themeImg, 'helmet', armorTier,
                    headX - 1, headY - 3, headW + 2, headH + 2);
            } else {
                const fallbackHelmet = getSlotVisualDefaults('helmet');
                drawHelmetByConfig(ctx, headX - 1, headY - 3, headW + 2, headH + 2, fallbackHelmet, colors);
            }
        }

        // ── Chest armor overlay ────────────────────────────────
        if (eqData.chest) {
            const chestId = eqData.chest.equipment_id || 0;
            const chestVisual = chestId ? getVisualConfig(chestId) : null;

            if (chestVisual && chestVisual.style) {
                drawChestByConfig(ctx, torsoX, torsoY, torsoW, torsoH, chestVisual, colors);
            } else if (themeImg && themeImg.complete) {
                this._overlayEquipmentPiece(ctx, themeImg, 'chestplate', armorTier,
                    torsoX - 1, torsoY - 1, torsoW + 2, torsoH + 2);
            } else {
                const fallbackChest = getSlotVisualDefaults('chest');
                drawChestByConfig(ctx, torsoX, torsoY, torsoW, torsoH, fallbackChest, colors);
            }
        }

        // ── Leg armor overlay ──────────────────────────────────
        if (eqData.legs) {
            const legsId = eqData.legs.equipment_id || 0;
            const legsVisual = legsId ? getVisualConfig(legsId) : null;
            const legArmorH = Math.floor(legH * 0.6);

            if (legsVisual && legsVisual.style) {
                drawLegsArmorByConfig(ctx, leftLegX, Math.floor(legsTopY + walk.legL), legW, legArmorH, legsVisual);
                drawLegsArmorByConfig(ctx, rightLegX, Math.floor(legsTopY + walk.legR), legW, legArmorH, legsVisual);
            } else {
                const fallbackLegs = getSlotVisualDefaults('legs');
                drawLegsArmorByConfig(ctx, leftLegX, Math.floor(legsTopY + walk.legL), legW, legArmorH, fallbackLegs);
                drawLegsArmorByConfig(ctx, rightLegX, Math.floor(legsTopY + walk.legR), legW, legArmorH, fallbackLegs);
            }
        }

        // ── Boot overlay ───────────────────────────────────────
        if (eqData.boots) {
            const bootsId = eqData.boots.equipment_id || 0;
            const bootsVisual = bootsId ? getVisualConfig(bootsId) : null;
            const bootH = 5;

            if (bootsVisual && bootsVisual.style) {
                drawBootsByConfig(ctx, leftLegX - 1, Math.floor(legsTopY + walk.legL + legH - bootH), legW + 2, bootH + 2, bootsVisual);
                drawBootsByConfig(ctx, rightLegX - 1, Math.floor(legsTopY + walk.legR + legH - bootH), legW + 2, bootH + 2, bootsVisual);
            } else {
                const fallbackBoots = getSlotVisualDefaults('boots');
                drawBootsByConfig(ctx, leftLegX - 1, Math.floor(legsTopY + walk.legL + legH - bootH), legW + 2, bootH + 2, fallbackBoots);
                drawBootsByConfig(ctx, rightLegX - 1, Math.floor(legsTopY + walk.legR + legH - bootH), legW + 2, bootH + 2, fallbackBoots);
            }
        }

        // ── Glove overlay ──────────────────────────────────────
        if (eqData.gloves) {
            const glovesId = eqData.gloves.equipment_id || 0;
            const glovesVisual = glovesId ? getVisualConfig(glovesId) : null;

            if (glovesVisual && glovesVisual.style) {
                drawGlovesByConfig(ctx, leftArmX, Math.floor(shoulderY + walk.armL), armW, armH, 'left', glovesVisual);
                drawGlovesByConfig(ctx, rightArmX, Math.floor(shoulderY + walk.armR), armW, armH, 'right', glovesVisual);
            } else {
                const fallbackGloves = getSlotVisualDefaults('gloves');
                drawGlovesByConfig(ctx, leftArmX, Math.floor(shoulderY + walk.armL), armW, armH, 'left', fallbackGloves);
                drawGlovesByConfig(ctx, rightArmX, Math.floor(shoulderY + walk.armR), armW, armH, 'right', fallbackGloves);
            }
        }

        // ── Weapon overlay ─────────────────────────────────────
        this._drawWeaponPixel(ctx, cx, shoulderY, armH, dir, frame, weaponType,
            colors, themeImg, raceTheme, eqData.weapon, armorTier);

        // ── Ring overlay ───────────────────────────────────────
        if (eqData.ring) {
            const ringPos = this._drawRingEffect(ctx, cx, shoulderY, armH, torsoW, walk, dir);
            this._renderRing(ctx, ringPos, eqData.ring);
        }

        // ── Amulet overlay ─────────────────────────────────────
        if (eqData.amulet) {
            this._drawAmuletEffect(ctx, cx, torsoTopY, walk.bob, dir, eqData.amulet);
        }

        // ── Crystal overlay ────────────────────────────────────
        if (eqData.crystal) {
            this._drawCrystalEffect(ctx, cx, headTopY, torsoW, dir, frame, eqData.crystal);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Body Part Renderers — DEPRECATED: Body drawing now in RaceBodyRenderer.js
    // Equipment, weapon, and accessory overlays remain here.
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Draw weapon as pixel art (procedural or from theme sheet).
     */
    static _drawWeaponPixel(ctx, cx, shoulderY, armH, dir, frame, weaponType,
                             colors, themeImg, raceTheme, weaponData, armorTier) {
        // Position weapon relative to character's hand (scaled for 64x64)
        let wx, wy;
        const handOffset = armH - 4;

        switch (dir) {
            case DIR_DOWN:
                wx = cx + 10;
                wy = shoulderY + 4;
                break;
            case DIR_LEFT:
                wx = cx - 16;
                wy = shoulderY + 2;
                break;
            case DIR_RIGHT:
                wx = cx + 12;
                wy = shoulderY + 2;
                break;
            case DIR_UP:
                wx = cx - 12;
                wy = shoulderY - 4;
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
     * Draw a procedural pixel-art weapon using per-item visual config.
     * Each of the 144 weapons renders with its own unique shape, colors, and effects.
     */
    static _drawProceduralWeapon(ctx, wx, wy, dir, weaponType, weaponData, colors) {
        // Look up unique visual config for this specific weapon
        const eqId = weaponData ? (weaponData.equipment_id || 0) : 0;
        const visualConfig = eqId ? getVisualConfig(eqId) : null;

        if (visualConfig && visualConfig.shape) {
            // Use the per-item unique renderer
            drawWeaponByConfig(ctx, wx, wy, dir, visualConfig, colors);
            return;
        }

        // Fallback: generic rarity-based rendering for unknown weapons
        const rarity = weaponData ? (weaponData.rarity || 'common') : 'common';
        const fallbackConfig = getSlotVisualDefaults('weapon');
        fallbackConfig.bladeColor = this._getWeaponColor(rarity);
        fallbackConfig.shape = weaponType || 'sword';
        drawWeaponByConfig(ctx, wx, wy, dir, fallbackConfig, colors);
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
        // Position ring at the hand of the front arm (scaled for 64x64)
        const ringArmW = 6;
        let rx, ry;

        if (dir === DIR_DOWN) {
            rx = Math.floor(cx + torsoW / 2);
            ry = Math.floor(shoulderY + walk.armR + armH - 4);
        } else if (dir === DIR_LEFT) {
            rx = Math.floor(cx - torsoW / 2 - ringArmW);
            ry = Math.floor(shoulderY + walk.armL + armH - 4);
        } else if (dir === DIR_RIGHT) {
            rx = Math.floor(cx + torsoW / 2);
            ry = Math.floor(shoulderY + walk.armR + armH - 4);
        } else {
            return;
        }

        return { x: rx, y: ry };
    }

    /**
     * Render the ring pixels at the computed position using per-item visual config.
     */
    static _renderRing(ctx, ringPos, ringData) {
        if (!ringPos) return;
        const ringId = ringData.equipment_id || 0;
        const ringVisual = ringId ? getVisualConfig(ringId) : null;

        if (ringVisual && ringVisual.bandColor) {
            drawRingByConfig(ctx, ringPos.x, ringPos.y, ringVisual);
        } else {
            // Fallback
            const fallback = getSlotVisualDefaults('ring');
            fallback.bandColor = this._getAccessoryColor(ringData.rarity || 'common');
            drawRingByConfig(ctx, ringPos.x, ringPos.y, fallback);
        }
    }

    /**
     * Draw a small pendant/necklace below the head on the neck/upper chest area.
     * Uses per-item visual config for unique appearance per amulet.
     */
    static _drawAmuletEffect(ctx, cx, torsoTopY, bob, dir, amuletData) {
        if (dir === DIR_UP) return; // Amulet not visible from behind

        const neckY = Math.floor(torsoTopY + bob);
        const neckCx = Math.floor(cx);

        const amuletId = amuletData.equipment_id || 0;
        const amuletVisual = amuletId ? getVisualConfig(amuletId) : null;

        if (amuletVisual && amuletVisual.pendantShape) {
            drawAmuletByConfig(ctx, neckCx, neckY, dir, amuletVisual);
        } else {
            // Fallback
            const fallback = getSlotVisualDefaults('amulet');
            fallback.pendantColor = this._getAccessoryColor(amuletData.rarity || 'common');
            drawAmuletByConfig(ctx, neckCx, neckY, dir, fallback);
        }
    }

    /**
     * Draw a small floating crystal above/behind the shoulder area.
     * Uses per-item visual config for unique shape, color, and animation per crystal.
     */
    static _drawCrystalEffect(ctx, cx, headTopY, torsoW, dir, frame, crystalData) {
        // Position: floating above/behind the shoulder (scaled for 64x64)
        let crx, cry;
        if (dir === DIR_DOWN) {
            crx = Math.floor(cx - torsoW / 2 - 6);
            cry = Math.floor(headTopY - 2);
        } else if (dir === DIR_UP) {
            crx = Math.floor(cx + torsoW / 2 + 2);
            cry = Math.floor(headTopY - 2);
        } else if (dir === DIR_LEFT) {
            crx = Math.floor(cx + 4);
            cry = Math.floor(headTopY - 4);
        } else {
            crx = Math.floor(cx - 8);
            cry = Math.floor(headTopY - 4);
        }

        const crystalId = crystalData.equipment_id || 0;
        const crystalVisual = crystalId ? getVisualConfig(crystalId) : null;

        if (crystalVisual && crystalVisual.crystalColor) {
            drawCrystalByConfig(ctx, crx, cry, dir, frame, crystalVisual);
        } else {
            // Fallback: determine color from element or rarity
            const rarity = crystalData.rarity || 'common';
            let fallbackColor;
            if (crystalData.element_synergy && ELEMENT_SKIN[crystalData.element_synergy]) {
                fallbackColor = ELEMENT_SKIN[crystalData.element_synergy].eye;
            } else {
                fallbackColor = this._getAccessoryColor(rarity);
            }
            const fallback = getSlotVisualDefaults('crystal');
            fallback.crystalColor = fallbackColor;
            fallback.innerColor = fallbackColor;
            fallback.glowColor = fallbackColor;
            drawCrystalByConfig(ctx, crx, cry, dir, frame, fallback);
        }
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

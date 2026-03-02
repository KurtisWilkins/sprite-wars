/**
 * HumanoidSpriteSystem.js — Composite humanoid sprite rendering with
 * weapon/armor overlays from theme sprite sheets.
 *
 * Generates animated humanoid sprites for all 72 forms by compositing:
 *   1. Base body from the Units body types sheet
 *   2. Armor overlay from the race's weapon theme sheet
 *   3. Weapon overlay from the theme's equipment column
 *
 * Designed to work with the existing SpriteSheetGenerator walk cycle format
 * (128x128, 4 dirs x 4 frames, 32x32 per frame) and also supports
 * direct rendering for the RTS battle system.
 */

import { RACE_THEME_MAP, THEME_PATHS, EQUIPMENT_ROWS, STAGE_ARMOR_TIER } from '../../data/WeaponThemeData.js';
import { SPRITE_RACES } from '../../data/SpriteData.js';

// ── Constants ───────────────────────────────────────────────────────────────
const FRAME_SIZE = 32;
const SHEET_COLS = 4;  // 4 walk frames
const SHEET_ROWS = 4;  // 4 directions (down, left, right, up)

// Body type sheet layout (from newbodytypes (1).png — 550x260)
const BODY_FRAME_W = 22;
const BODY_FRAME_H = 26;
const BODY_PADDING = 2;
const BODY_SHEET_ROWS = 3;  // 3 evolution stage rows

// Direction indices matching SpriteSheetGenerator format
const DIR_DOWN = 0;
const DIR_LEFT = 1;
const DIR_RIGHT = 2;
const DIR_UP = 3;

// Theme sheet animated character extraction
const THEME_ANIM_START_X = 110;
const THEME_ANIM_START_Y = 160;
const THEME_FRAME_W = 48;
const THEME_FRAME_H = 48;
const THEME_FRAMES_PER_DIR = 9;

// ── Caches ──────────────────────────────────────────────────────────────────
const _compositeCache = new Map();  // "raceId_stage" → HTMLCanvasElement (128x128 sheet)
const _themeImageCache = new Map(); // themePath → HTMLImageElement
const _bodySheetImage = { img: null };

/**
 * Skin color palettes per element type.
 */
const ELEMENT_SKIN_COLORS = {
    Fire:     { skin: '#e8a060', outline: '#8b5a2b' },
    Water:    { skin: '#88b8d8', outline: '#4a6a8a' },
    Nature:   { skin: '#8bc878', outline: '#4a7a3a' },
    Ice:      { skin: '#c0d8e8', outline: '#6a8a9a' },
    Air:      { skin: '#d0d8c0', outline: '#7a8a6a' },
    Earth:    { skin: '#c8a878', outline: '#7a6a4a' },
    Electric: { skin: '#e8d860', outline: '#8a7a2a' },
    Dark:     { skin: '#8868a8', outline: '#4a3a6a' },
    Light:    { skin: '#f0e8c0', outline: '#a09060' },
    Psychic:  { skin: '#d088c8', outline: '#7a4a7a' },
    Spirit:   { skin: '#b0c8d8', outline: '#6a7a8a' },
    Chaos:    { skin: '#d86060', outline: '#7a3030' },
    Metal:    { skin: '#b8b8c0', outline: '#6a6a7a' },
    Poison:   { skin: '#a088c0', outline: '#5a4a6a' },
};

export class HumanoidSpriteSystem {

    /**
     * Preload all required assets for humanoid sprite generation.
     * @param {import('../../core/AssetLoader.js').AssetLoader} assets
     */
    static async preloadAssets(assets) {
        // Load body types sheet
        try {
            _bodySheetImage.img = await assets.loadImage('../Sprites/Units/newbodytypes (1).png');
        } catch (e) {
            console.warn('HumanoidSpriteSystem: Could not load body types sheet', e);
        }

        // Preload all theme sheets used by races
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
     * Get or generate a composite 128x128 walk cycle sprite sheet for a race+stage.
     * @param {number} raceId - 1-24
     * @param {number} stage - 1, 2, or 3
     * @returns {HTMLCanvasElement} 128x128 sprite sheet
     */
    static getCompositeSheet(raceId, stage = 1) {
        const cacheKey = `${raceId}_${stage}`;
        if (_compositeCache.has(cacheKey)) {
            return _compositeCache.get(cacheKey);
        }

        const sheet = this._generateCompositeSheet(raceId, stage);
        _compositeCache.set(cacheKey, sheet);
        return sheet;
    }

    /**
     * Draw a single humanoid frame directly to a canvas context.
     * Used by RTSBattleRenderer for efficient per-frame rendering.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} raceId
     * @param {number} stage
     * @param {number} direction - 0=down, 1=left, 2=right, 3=up
     * @param {number} frame - Walk frame 0-3
     * @param {number} x - Destination X (center)
     * @param {number} y - Destination Y (bottom)
     * @param {number} size - Draw size (width = height)
     */
    static drawFrame(ctx, raceId, stage, direction, frame, x, y, size) {
        const sheet = this.getCompositeSheet(raceId, stage);
        const sx = (frame % SHEET_COLS) * FRAME_SIZE;
        const sy = direction * FRAME_SIZE;
        const halfSize = size / 2;

        ctx.drawImage(sheet,
            sx, sy, FRAME_SIZE, FRAME_SIZE,
            x - halfSize, y - size, size, size
        );
    }

    /**
     * Draw a humanoid with weapon overlay.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} raceId
     * @param {number} stage
     * @param {number} direction
     * @param {number} frame
     * @param {number} x - Center X
     * @param {number} y - Bottom Y
     * @param {number} size
     * @param {object} opts - { showWeapon: true, weaponType: null }
     */
    static drawWithEquipment(ctx, raceId, stage, direction, frame, x, y, size, opts = {}) {
        // Draw base humanoid
        this.drawFrame(ctx, raceId, stage, direction, frame, x, y, size);

        // Draw weapon overlay if available
        if (opts.showWeapon !== false) {
            this._drawWeaponOverlay(ctx, raceId, stage, direction, x, y, size, opts.weaponType);
        }
    }

    /**
     * Clear all cached composite sheets (call on scene change).
     */
    static clearCache() {
        _compositeCache.clear();
    }

    // ── Private: Sheet Generation ───────────────────────────────────────────

    static _generateCompositeSheet(raceId, stage) {
        const sheet = document.createElement('canvas');
        sheet.width = FRAME_SIZE * SHEET_COLS;
        sheet.height = FRAME_SIZE * SHEET_ROWS;
        const ctx = sheet.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Get race data for skin colors
        const race = SPRITE_RACES.find(r => r.race_id === raceId);
        const elemType = (race && race.element_types && race.element_types[0]) || 'Fire';
        const colors = ELEMENT_SKIN_COLORS[elemType] || ELEMENT_SKIN_COLORS.Fire;

        // Get theme info
        const raceTheme = RACE_THEME_MAP[raceId] || RACE_THEME_MAP[1];
        const themePath = THEME_PATHS[raceTheme.theme];
        const themeImg = themePath ? _themeImageCache.get(themePath) : null;
        const armorTier = STAGE_ARMOR_TIER[stage] || 0;

        // Try to extract from theme sheet first (animated characters)
        if (themeImg && themeImg.complete && themeImg.width > 0) {
            this._generateFromThemeSheet(ctx, themeImg, armorTier, stage);
        } else {
            // Fallback: generate procedural humanoid with body types sheet
            this._generateProceduralHumanoid(ctx, raceId, stage, colors);
        }

        return sheet;
    }

    /**
     * Extract animated characters from a weapon theme sprite sheet.
     * The theme sheets have animated characters in the right portion,
     * organized by direction blocks with helmet and body armor variants.
     */
    static _generateFromThemeSheet(ctx, themeImg, armorTier, stage) {
        // The animated region of each theme sheet has rows of characters:
        // - Rows alternate between "with helmet" and "with body armor"
        // - Each row has 4 direction blocks × 9 frames
        // - We pick the armor tier row based on evolution stage

        // Select which armor row to use (0=light, 1=medium, 2=heavy)
        const armorRowOffset = Math.min(armorTier, 1); // 0 = helmet row, 1 = full body row

        const directions = [DIR_DOWN, DIR_LEFT, DIR_RIGHT, DIR_UP];
        const srcFrameW = THEME_FRAME_W;
        const srcFrameH = THEME_FRAME_H;

        for (let dirIdx = 0; dirIdx < 4; dirIdx++) {
            // Each direction block in the theme sheet
            const blockStartX = THEME_ANIM_START_X + (dirIdx * THEME_FRAMES_PER_DIR * srcFrameW)
                + (dirIdx * 8); // gap between blocks

            // Use armor row offset
            const srcRowY = THEME_ANIM_START_Y + (armorRowOffset * (srcFrameH + 4));

            for (let frame = 0; frame < 4; frame++) {
                // Sample 4 frames from the 9 available (0, 2, 4, 6)
                const srcFrame = frame * 2;
                const srcX = blockStartX + srcFrame * srcFrameW;
                const srcY = srcRowY;

                const dstX = frame * FRAME_SIZE;
                const dstY = dirIdx * FRAME_SIZE;

                // Validate source coordinates are within image bounds
                if (srcX + srcFrameW <= themeImg.width && srcY + srcFrameH <= themeImg.height) {
                    ctx.drawImage(themeImg,
                        srcX, srcY, srcFrameW, srcFrameH,
                        dstX, dstY, FRAME_SIZE, FRAME_SIZE
                    );
                } else {
                    // Fallback: draw a colored placeholder
                    this._drawPlaceholderFrame(ctx, dstX, dstY, dirIdx, frame, '#c88040');
                }
            }
        }
    }

    /**
     * Generate a procedural humanoid sprite with limbs and element-colored body.
     */
    static _generateProceduralHumanoid(ctx, raceId, stage, colors) {
        const bodySheet = _bodySheetImage.img;

        // Walk animation offsets [idle, step1, idle2, step2]
        const walkCycle = [
            { armL: 0, armR: 0, legL: 0, legR: 0, bob: 0 },
            { armL: -2, armR: 2, legL: 3, legR: -1, bob: -1 },
            { armL: 0, armR: 0, legL: 0, legR: 0, bob: 0 },
            { armL: 2, armR: -2, legL: -1, legR: 3, bob: -1 },
        ];

        // Scale factor based on evolution stage
        const sizeScale = 0.85 + (stage - 1) * 0.075;
        const bodyW = Math.floor(16 * sizeScale);
        const bodyH = Math.floor(18 * sizeScale);

        for (let dirIdx = 0; dirIdx < 4; dirIdx++) {
            for (let frame = 0; frame < 4; frame++) {
                const fx = frame * FRAME_SIZE;
                const fy = dirIdx * FRAME_SIZE;
                const anim = walkCycle[frame];

                // Body center in frame
                const cx = fx + FRAME_SIZE / 2;
                const by = fy + 4 + anim.bob;

                // Try to draw from body type sheet
                if (bodySheet && bodySheet.complete && bodySheet.width > 0) {
                    const bodyIdx = Math.min(raceId - 1, 23);
                    const col = bodyIdx % 24;
                    const row = Math.min(stage - 1, BODY_SHEET_ROWS - 1);
                    const srcX = col * (BODY_FRAME_W + BODY_PADDING) + BODY_PADDING;
                    const srcY = row * 86 + 10;

                    if (srcX + BODY_FRAME_W <= bodySheet.width && srcY + BODY_FRAME_H <= bodySheet.height) {
                        ctx.drawImage(bodySheet,
                            srcX, srcY, BODY_FRAME_W, BODY_FRAME_H,
                            cx - bodyW / 2, by, bodyW, bodyH
                        );
                    } else {
                        this._drawBody(ctx, cx - bodyW / 2, by, bodyW, bodyH, colors);
                    }
                } else {
                    this._drawBody(ctx, cx - bodyW / 2, by, bodyW, bodyH, colors);
                }

                // Draw limbs
                const armH = Math.floor(8 * sizeScale);
                const legH = Math.floor(7 * sizeScale);
                const limbW = 3;

                // Legs
                const legY = by + bodyH - 2;
                const legLX = cx - limbW - 1;
                const legRX = cx + 1;
                this._drawLimb(ctx, legLX, legY + anim.legL, limbW, legH, colors);
                this._drawLimb(ctx, legRX, legY + anim.legR, limbW, legH, colors);

                // Arms
                const armY = by + 4;
                const armLX = cx - bodyW / 2 - limbW;
                const armRX = cx + bodyW / 2;
                this._drawLimb(ctx, armLX, armY + anim.armL, limbW, armH, colors);
                this._drawLimb(ctx, armRX, armY + anim.armR, limbW, armH, colors);
            }
        }
    }

    static _drawBody(ctx, x, y, w, h, colors) {
        // Outline
        ctx.fillStyle = colors.outline;
        ctx.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, w + 2, h + 2);
        // Fill
        ctx.fillStyle = colors.skin;
        ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w * 0.3), h);
    }

    static _drawLimb(ctx, x, y, w, h, colors) {
        ctx.fillStyle = colors.outline;
        ctx.fillRect(Math.floor(x) - 1, Math.floor(y), w + 2, h + 1);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
    }

    static _drawPlaceholderFrame(ctx, x, y, direction, frame, color) {
        const cx = x + FRAME_SIZE / 2;
        const cy = y + FRAME_SIZE / 2;
        // Simple colored circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        // Direction indicator
        ctx.fillStyle = '#fff';
        const offsets = [
            { dx: 0, dy: 4 },  // down
            { dx: -4, dy: 0 }, // left
            { dx: 4, dy: 0 },  // right
            { dx: 0, dy: -4 }, // up
        ];
        const off = offsets[direction];
        ctx.fillRect(cx + off.dx - 1, cy + off.dy - 1, 3, 3);
    }

    /**
     * Draw a weapon overlay on top of a character.
     */
    static _drawWeaponOverlay(ctx, raceId, stage, direction, x, y, size, weaponType) {
        const raceTheme = RACE_THEME_MAP[raceId] || RACE_THEME_MAP[1];
        const themePath = THEME_PATHS[raceTheme.theme];
        const themeImg = themePath ? _themeImageCache.get(themePath) : null;
        if (!themeImg || !themeImg.complete) return;

        const wType = weaponType || raceTheme.weapon;
        const equipRow = EQUIPMENT_ROWS[wType];
        if (!equipRow) return;

        const tier = STAGE_ARMOR_TIER[stage] || 0;
        const tierIdx = Math.min(tier, equipRow.tiers - 1);

        // Extract weapon icon from left column
        const srcX = tierIdx * (equipRow.cellW + 4) + 4;
        const srcY = equipRow.offsetY;
        const srcW = equipRow.cellW;
        const srcH = equipRow.cellH;

        if (srcX + srcW > themeImg.width || srcY + srcH > themeImg.height) return;

        // Position weapon relative to character
        const weaponSize = size * 0.5;
        const halfSize = size / 2;

        // Direction-based weapon positioning
        let wx, wy;
        switch (direction) {
            case DIR_DOWN:
                wx = x + halfSize * 0.3;
                wy = y - size * 0.5;
                break;
            case DIR_LEFT:
                wx = x - halfSize * 0.6;
                wy = y - size * 0.5;
                break;
            case DIR_RIGHT:
                wx = x + halfSize * 0.4;
                wy = y - size * 0.5;
                break;
            case DIR_UP:
                wx = x - halfSize * 0.3;
                wy = y - size * 0.6;
                break;
            default:
                wx = x + halfSize * 0.3;
                wy = y - size * 0.5;
        }

        ctx.drawImage(themeImg,
            srcX, srcY, srcW, srcH,
            wx, wy, weaponSize, weaponSize * (srcH / srcW)
        );
    }
}

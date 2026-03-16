/**
 * SkeletalAnimationSystem.js — Skeletal 2D animation system for humanoid sprites.
 *
 * Replaces the sprite-sheet-based HumanoidSpriteSystem with a bone-driven approach
 * where each body part (head, torso, arms, legs, hands, feet) is a separate PNG
 * positioned and animated via hierarchical bone transforms.
 *
 * Drop-in replacement: exposes the same public API as HumanoidSpriteSystem so
 * callers can switch without code changes.
 *
 * Output format: 1024x1024 composite sheets (4 dirs x 4 walk frames, 256x256 per frame)
 * Direction indices: 0=Down, 1=Left, 2=Right, 3=Up
 *
 * Asset layout:
 *   Skeleton JSON: Sprites/Characters/{Race}/parts/{Race}_S{stage}_skeleton.json
 *   Part PNGs:     Sprites/Characters/{Race}/parts/{Race}_S{stage}_{part}.png
 *   Manifest:      Sprites/Characters/skeletal_manifest.json
 */

import { RACE_THEME_MAP, THEME_PATHS, EQUIPMENT_ROWS, STAGE_ARMOR_TIER } from '../../data/WeaponThemeData.js';
import { SPRITE_RACES } from '../../data/SpriteData.js';
import { findEquipmentWithExpansion } from '../../data/EquipmentData.js';
import { getVisualConfig, getSlotVisualDefaults } from '../../data/EquipmentVisualConfig.js';
import {
    drawWeaponByConfig, drawHelmetByConfig, drawChestByConfig,
    drawLegsArmorByConfig, drawBootsByConfig, drawGlovesByConfig,
    drawRingByConfig, drawAmuletByConfig, drawCrystalByConfig
} from './EquipmentRenderers.js';
import { drawEvolutionEffects } from './EvolutionStageRenderer.js';
import { getTrainerAppearance, getPlayerAppearance, getNPCAppearance } from '../../data/CharacterAppearanceData.js';
import { drawCharacterOutfit } from './CharacterOutfitRenderer.js';
// getRaceName available from SpriteTextureHelper.js but we use local RACE_NAMES lookup

// ── Constants ────────────────────────────────────────────────────────────────

const RENDER_SCALE = 4;            // 4x supersampling (logical 64 -> 256px frames)
const LOGICAL_FRAME = 64;          // Logical coordinate space per frame
const FRAME_SIZE = LOGICAL_FRAME * RENDER_SCALE;  // 256px actual frame on sheet
const SHEET_COLS = 4;              // 4 walk frames per row
const SHEET_ROWS = 4;              // 4 direction rows

const DIR_DOWN  = 0;
const DIR_LEFT  = 1;
const DIR_RIGHT = 2;
const DIR_UP    = 3;

/** 2px padding baked into each part PNG for rotation anti-aliasing */
const PART_PADDING = 2;

/** Maximum cached composite sheets (LRU eviction) — ~120MB ceiling */
const MAX_CACHE_ENTRIES = 30;

// ── Race Name Lookup ─────────────────────────────────────────────────────────

const RACE_NAMES = {
    1: 'Human', 2: 'Elf', 3: 'Demon', 4: 'Devil', 5: 'CatMan',
    6: 'BearMan', 7: 'WolfMan', 8: 'MonkeyMan', 9: 'BugMan', 10: 'BirdMan',
    11: 'Ent', 12: 'FishMan', 13: 'Ghost', 14: 'Golem', 15: 'LizardMan',
    16: 'Minotaur', 17: 'Mummy', 18: 'Ork', 19: 'RatMan', 20: 'Robot',
    21: 'Skeleton', 22: 'SharkMan', 23: 'TurtleMan', 24: 'Zombie',
};

// ── Walk Animation Keyframes ─────────────────────────────────────────────────
// Each frame defines per-bone transform deltas (rotation in degrees, translate in px).
// Frame 0 & 2 are neutral/passing stances; 1 & 3 are opposite extremes of the stride.

const WALK_KEYFRAMES = [
    // Frame 0 — Neutral stance
    {
        head:       { rotation: 0,   tx: 0,  ty: 0   },
        torso:      { rotation: 0,   tx: 0,  ty: 0   },
        left_arm:   { rotation: 0,   tx: 0,  ty: 0   },
        right_arm:  { rotation: 0,   tx: 0,  ty: 0   },
        left_leg:   { rotation: 0,   tx: 0,  ty: 0   },
        right_leg:  { rotation: 0,   tx: 0,  ty: 0   },
        left_hand:  { rotation: 0,   tx: 0,  ty: 0   },
        right_hand: { rotation: 0,   tx: 0,  ty: 0   },
        left_foot:  { rotation: 0,   tx: 0,  ty: 0   },
        right_foot: { rotation: 0,   tx: 0,  ty: 0   },
    },
    // Frame 1 — Left foot forward, right arm forward (contralateral swing)
    {
        head:       { rotation: 0,   tx: 0,  ty: -0.5 },
        torso:      { rotation: 0,   tx: 0,  ty: -1.5 },
        left_arm:   { rotation: -18, tx: 0,  ty: 0    },
        right_arm:  { rotation: 18,  tx: 0,  ty: 0    },
        left_leg:   { rotation: 22,  tx: 0,  ty: 0    },
        right_leg:  { rotation: -20, tx: 0,  ty: 0    },
        left_hand:  { rotation: -10, tx: 0,  ty: 0    },
        right_hand: { rotation: 10,  tx: 0,  ty: 0    },
        left_foot:  { rotation: 5,   tx: 1,  ty: -1   },
        right_foot: { rotation: -5,  tx: -1, ty: 0    },
    },
    // Frame 2 — Neutral passing stance
    {
        head:       { rotation: 0,   tx: 0,  ty: 0   },
        torso:      { rotation: 0,   tx: 0,  ty: 0   },
        left_arm:   { rotation: 0,   tx: 0,  ty: 0   },
        right_arm:  { rotation: 0,   tx: 0,  ty: 0   },
        left_leg:   { rotation: 0,   tx: 0,  ty: 0   },
        right_leg:  { rotation: 0,   tx: 0,  ty: 0   },
        left_hand:  { rotation: 0,   tx: 0,  ty: 0   },
        right_hand: { rotation: 0,   tx: 0,  ty: 0   },
        left_foot:  { rotation: 0,   tx: 0,  ty: 0   },
        right_foot: { rotation: 0,   tx: 0,  ty: 0   },
    },
    // Frame 3 — Right foot forward, left arm forward
    {
        head:       { rotation: 0,   tx: 0,  ty: -0.5 },
        torso:      { rotation: 0,   tx: 0,  ty: -1.5 },
        left_arm:   { rotation: 18,  tx: 0,  ty: 0    },
        right_arm:  { rotation: -18, tx: 0,  ty: 0    },
        left_leg:   { rotation: -20, tx: 0,  ty: 0    },
        right_leg:  { rotation: 22,  tx: 0,  ty: 0    },
        left_hand:  { rotation: 10,  tx: 0,  ty: 0    },
        right_hand: { rotation: -10, tx: 0,  ty: 0    },
        left_foot:  { rotation: -5,  tx: -1, ty: 0    },
        right_foot: { rotation: 5,   tx: 1,  ty: -1   },
    },
];

// ── Draw Order Per Direction ─────────────────────────────────────────────────
// Controls painter-order so nearer limbs overlap farther ones correctly.

const DRAW_ORDER = {
    [DIR_DOWN]: [
        'left_leg', 'right_leg', 'left_foot', 'right_foot',
        'right_arm', 'right_hand',
        'torso',
        'left_arm', 'left_hand',
        'head',
    ],
    [DIR_LEFT]: [
        'right_leg', 'right_foot', 'right_arm', 'right_hand',
        'torso',
        'left_leg', 'left_foot', 'left_arm', 'left_hand',
        'head',
    ],
    [DIR_RIGHT]: [
        'left_leg', 'left_foot', 'left_arm', 'left_hand',
        'torso',
        'right_leg', 'right_foot', 'right_arm', 'right_hand',
        'head',
    ],
    [DIR_UP]: [
        'head',
        'left_leg', 'right_leg', 'left_foot', 'right_foot',
        'left_arm', 'right_arm', 'left_hand', 'right_hand',
        'torso',
    ],
};

// ── Element Skin Colors (matches HumanoidSpriteSystem) ──────────────────────

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
    Solar:    { skin: '#e8c888', mid: '#c8a868', outline: '#8a7a5a', hair: '#ccaa44', eye: '#ddbb33' },
    Lunar:    { skin: '#b8c0d8', mid: '#98a0b8', outline: '#6a7088', hair: '#8899bb', eye: '#aabbdd' },
    Metal:    { skin: '#b8b8c0', mid: '#9898a0', outline: '#6a6a7a', hair: '#888899', eye: '#aaaacc' },
    Poison:   { skin: '#a088c0', mid: '#8068a0', outline: '#5a4a6a', hair: '#773399', eye: '#aa55dd' },
};

// ── Rarity Glow Colors ──────────────────────────────────────────────────────

const RARITY_GLOW = {
    common:    null,
    uncommon:  '#33cc66',
    rare:      '#3399ff',
    epic:      '#aa44ff',
    legendary: '#ffaa00',
};

// ── Module State ─────────────────────────────────────────────────────────────

/** Stored AssetLoader reference for path resolution */
let _assetLoader = null;

/** Part image cache: "RaceName_S{stage}_{partname}" -> HTMLImageElement|null */
const _partImageCache = new Map();

/** Part load promise dedup: same key -> Promise */
const _partLoadPromises = new Map();

/** Skeleton JSON cache: "RaceName_S{stage}" -> skeleton data object */
const _skeletonCache = new Map();

/** Skeleton load promise dedup */
const _skeletonLoadPromises = new Map();

/** Skeletal manifest cache (loaded once) */
let _manifest = null;

/** Composite sheet LRU cache */
const _compositeCache = new Map();   // cacheKey -> HTMLCanvasElement (1024x1024)
const _compositeLRU = [];            // LRU order: most recent at end

/** Theme image cache for equipment overlays */
const _themeImageCache = new Map();  // themePath -> HTMLImageElement

// ═════════════════════════════════════════════════════════════════════════════
// Internal: Asset Loading
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Load an image via the AssetLoader (adds ../ prefix for correct path resolution).
 * Falls back to direct loading with ../ prefix if no AssetLoader is available.
 * Returns null on failure instead of throwing.
 */
function _loadImage(path) {
    if (_assetLoader) {
        return _assetLoader.loadImage(path).catch(err => {
            console.warn(`[SkeletalAnimationSystem] Failed to load image: ${path}`, err);
            return null;
        });
    }

    const resolvedPath = `../${path}`;
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn(`[SkeletalAnimationSystem] Failed to load image: ${resolvedPath}`);
            resolve(null);
        };
        img.src = resolvedPath;
    });
}

/**
 * Load a JSON file via fetch, resolving the path with ../ prefix.
 * Returns null on failure.
 */
function _loadJSON(path) {
    const resolvedPath = `../${path}`;
    return fetch(resolvedPath)
        .then(resp => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
        })
        .catch(err => {
            console.warn(`[SkeletalAnimationSystem] Failed to load JSON: ${resolvedPath}`, err);
            return null;
        });
}

/**
 * Load the skeletal manifest listing all available skeletons.
 */
function _loadManifest() {
    if (_manifest) return Promise.resolve(_manifest);
    return _loadJSON('Sprites/Characters/skeletal_manifest.json').then(data => {
        _manifest = data;
        return data;
    });
}

/**
 * Load a skeleton JSON for a given race/stage.
 * Caches result for synchronous retrieval later.
 */
function _loadSkeleton(raceName, stage) {
    const key = `${raceName}_S${stage}`;
    if (_skeletonCache.has(key)) return Promise.resolve(_skeletonCache.get(key));
    if (_skeletonLoadPromises.has(key)) return _skeletonLoadPromises.get(key);

    const path = `Sprites/Characters/${raceName}/parts/${raceName}_S${stage}_skeleton.json`;
    const promise = _loadJSON(path).then(data => {
        _skeletonCache.set(key, data);
        return data;
    });
    _skeletonLoadPromises.set(key, promise);
    return promise;
}

/**
 * Get cached skeleton data synchronously (returns null if not loaded yet).
 */
function _getCachedSkeleton(raceName, stage) {
    return _skeletonCache.get(`${raceName}_S${stage}`) || null;
}

/**
 * Load a single part PNG for a given race, stage, and part name.
 * Caches the HTMLImageElement (or null on failure).
 */
function _loadPartImage(raceName, stage, partName) {
    const key = `${raceName}_S${stage}_${partName}`;
    if (_partImageCache.has(key)) return Promise.resolve(_partImageCache.get(key));
    if (_partLoadPromises.has(key)) return _partLoadPromises.get(key);

    const path = `Sprites/Characters/${raceName}/parts/${raceName}_S${stage}_${partName}.png`;
    const promise = _loadImage(path).then(img => {
        _partImageCache.set(key, img || null);
        return img || null;
    });
    _partLoadPromises.set(key, promise);
    return promise;
}

/**
 * Get a cached part image synchronously (returns null if not loaded or missing).
 */
function _getCachedPartImage(raceName, stage, partName) {
    return _partImageCache.get(`${raceName}_S${stage}_${partName}`) || null;
}

// ═════════════════════════════════════════════════════════════════════════════
// Internal: Bone Transform Resolution
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Compute world-space transforms for all bones in a skeleton at a given frame.
 *
 * Each bone's transform is the composition of:
 *   1. The bone's rest pose (offset from parent, base rotation/scale from skeleton.json)
 *   2. The animation keyframe delta (rotation, tx, ty) for the current walk frame
 *
 * Returns a Map<partName, { worldX, worldY, worldRotation, worldScale }> in the
 * skeleton's source coordinate space (typically 96x96).
 *
 * @param {object} skeleton - Parsed skeleton.json data
 * @param {number} frameIndex - Walk frame index (0-3)
 * @returns {Map<string, {worldX: number, worldY: number, worldRotation: number, worldScale: number}>}
 */
function _computeBoneTransforms(skeleton, frameIndex) {
    const bones = skeleton.bones || {};
    const keyframe = WALK_KEYFRAMES[frameIndex % 4];
    const result = new Map();

    // Topological traversal: process parents before children.
    // Build adjacency list for BFS from root(s).
    const children = {};
    const roots = [];
    for (const boneName of Object.keys(bones)) {
        const bone = bones[boneName];
        if (!bone.parent) {
            roots.push(boneName);
        } else {
            if (!children[bone.parent]) children[bone.parent] = [];
            children[bone.parent].push(boneName);
        }
    }

    // BFS traversal
    const queue = [...roots];
    for (const root of roots) {
        // Root bone: position is its offset directly in source space
        const rootBone = bones[root];
        const sourceSize = skeleton.source_size || 96;
        const anim = keyframe[root] || { rotation: 0, tx: 0, ty: 0 };

        result.set(root, {
            worldX: (rootBone.offset_x || 0) * sourceSize + anim.tx,
            worldY: (rootBone.offset_y || 0) * sourceSize + anim.ty,
            worldRotation: (rootBone.rotation || 0) + anim.rotation,
            worldScale: rootBone.scale || 1.0,
        });
    }

    // Process children in BFS order
    let head = 0;
    while (head < queue.length) {
        const current = queue[head++];
        const kids = children[current] || [];
        for (const childName of kids) {
            queue.push(childName);
            const childBone = bones[childName];
            const parentTransform = result.get(current);
            const anim = keyframe[childName] || { rotation: 0, tx: 0, ty: 0 };
            const sourceSize = skeleton.source_size || 96;

            // Child offset is relative to parent, expressed as fraction of source_size
            const localX = (childBone.offset_x || 0) * sourceSize;
            const localY = (childBone.offset_y || 0) * sourceSize;

            // Apply parent rotation to local offset
            const parentRad = (parentTransform.worldRotation * Math.PI) / 180;
            const cosP = Math.cos(parentRad);
            const sinP = Math.sin(parentRad);
            const rotatedX = localX * cosP - localY * sinP;
            const rotatedY = localX * sinP + localY * cosP;

            result.set(childName, {
                worldX: parentTransform.worldX + rotatedX * parentTransform.worldScale + anim.tx,
                worldY: parentTransform.worldY + rotatedY * parentTransform.worldScale + anim.ty,
                worldRotation: parentTransform.worldRotation + (childBone.rotation || 0) + anim.rotation,
                worldScale: parentTransform.worldScale * (childBone.scale || 1.0),
            });
        }
    }

    return result;
}

/**
 * Convert skeleton-space bone transforms to logical frame coordinates (64x64).
 *
 * Centers the skeleton in the logical frame with the feet near the bottom.
 *
 * @param {Map} boneTransforms - Output of _computeBoneTransforms
 * @param {object} skeleton - Skeleton data
 * @returns {Map<string, {x, y, rotation, scale}>} Transforms in 64x64 logical space
 */
function _mapToLogicalSpace(boneTransforms, skeleton) {
    const sourceSize = skeleton.source_size || 96;
    // Scale factor from source space to logical frame space
    const scaleFactor = (LOGICAL_FRAME * 0.92) / sourceSize;
    // Center offset to place skeleton in frame center-bottom
    const offsetX = LOGICAL_FRAME / 2 - (sourceSize * scaleFactor) / 2;
    const offsetY = LOGICAL_FRAME - 3 - (sourceSize * scaleFactor);

    const mapped = new Map();
    for (const [name, t] of boneTransforms) {
        mapped.set(name, {
            x: t.worldX * scaleFactor + offsetX,
            y: t.worldY * scaleFactor + offsetY,
            rotation: t.worldRotation,
            scale: t.worldScale * scaleFactor,
        });
    }
    return mapped;
}

// ═════════════════════════════════════════════════════════════════════════════
// Internal: Part Drawing
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Draw a single skeletal part onto the canvas.
 *
 * The part PNG has 2px padding on each side. The anchor point defines where
 * the bone joint is located within the original (unpadded) part, so we offset
 * drawing so the anchor aligns with the bone world position, then rotate
 * around that anchor.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img - Part PNG
 * @param {object} partDef - Part definition from skeleton.json (width, height, anchor)
 * @param {object} transform - {x, y, rotation, scale} in logical space
 * @param {boolean} flipH - Whether to mirror horizontally (for Right direction)
 */
function _drawPart(ctx, img, partDef, transform, flipH) {
    if (!img || !partDef) return;

    ctx.save();

    const { x, y, rotation, scale } = transform;
    const anchorX = (partDef.anchor ? partDef.anchor.x : partDef.width / 2) + PART_PADDING;
    const anchorY = (partDef.anchor ? partDef.anchor.y : partDef.height / 2) + PART_PADDING;
    const imgW = partDef.width + PART_PADDING * 2;
    const imgH = partDef.height + PART_PADDING * 2;

    // Move to the bone position in logical space
    ctx.translate(x, y);

    // Apply horizontal flip for Right direction (mirror of Left)
    if (flipH) {
        ctx.scale(-1, 1);
    }

    // Rotate around the bone joint (anchor point)
    const rad = (rotation * Math.PI) / 180;
    ctx.rotate(rad);

    // Draw the part image so that its anchor point sits at the origin
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = -anchorX * scale;
    const drawY = -anchorY * scale;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    ctx.restore();
}

/**
 * Draw all skeletal parts for one frame of one direction.
 *
 * @param {CanvasRenderingContext2D} ctx - Target canvas context
 * @param {object} skeleton - Skeleton data
 * @param {string} raceName - Race name for part image lookup
 * @param {number} stage - Evolution stage (1-3)
 * @param {number} direction - Direction index (0-3)
 * @param {number} frameIndex - Walk frame (0-3)
 * @param {Map} logicalTransforms - Bone transforms in logical space
 */
function _drawSkeletalFrame(ctx, skeleton, raceName, stage, direction, frameIndex, logicalTransforms) {
    const parts = skeleton.parts || {};
    const flipH = direction === DIR_RIGHT;

    // Determine draw order: always use direction-aware ordering for correct
    // depth (e.g., head behind torso when facing up, near arm in front when
    // facing left/right). The skeleton's flat draw_order is only used for
    // DIR_DOWN since it was designed for front-facing view.
    const dirDrawOrder = DRAW_ORDER[direction] || DRAW_ORDER[DIR_DOWN];
    const skelDrawOrder = skeleton.draw_order;
    const drawOrder = (direction === DIR_DOWN && Array.isArray(skelDrawOrder) && skelDrawOrder.length > 0)
        ? skelDrawOrder
        : dirDrawOrder;

    // If the skeleton defines extra parts not in our standard draw order,
    // collect them and draw them after standard parts.
    const standardParts = new Set(drawOrder);
    const extraParts = [];
    for (const partName of Object.keys(parts)) {
        if (!standardParts.has(partName)) {
            extraParts.push(partName);
        }
    }

    // Draw in painter order (back to front)
    const fullOrder = [...drawOrder, ...extraParts];
    for (const partName of fullOrder) {
        const partDef = parts[partName];
        if (!partDef) continue;

        const transform = logicalTransforms.get(partName);
        if (!transform) continue;

        const img = _getCachedPartImage(raceName, stage, partName);
        if (!img) continue; // Graceful skip for missing parts

        // For Left direction, use transforms as-is.
        // For Right direction, mirror X positions and flip each part horizontally.
        let adjustedTransform = transform;
        if (flipH) {
            adjustedTransform = {
                x: LOGICAL_FRAME - transform.x,
                y: transform.y,
                rotation: -transform.rotation,
                scale: transform.scale,
            };
        }

        _drawPart(ctx, img, partDef, adjustedTransform, flipH);
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Internal: Anchor Computation for Equipment Overlays
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Build equipment anchor points from skeletal bone transforms so that
 * equipment renderers (helmet, chest, boots, etc.) can position correctly.
 *
 * Returns an anchor object matching the format expected by equipment renderers
 * and CharacterOutfitRenderer (same shape as HumanoidSpriteSystem's _buildCharacterAnchors).
 *
 * @param {Map} logicalTransforms - Bone transforms in logical space
 * @param {object} skeleton - Skeleton data
 * @param {number} direction - Direction index
 * @param {number} frameIndex - Walk frame index
 * @returns {object} Anchor points compatible with equipment renderers
 */
function _buildAnchorsFromBones(logicalTransforms, skeleton, direction, frameIndex) {
    const parts = skeleton.parts || {};

    // Helper to get a bone position or fall back to a reasonable default
    const pos = (name) => {
        const t = logicalTransforms.get(name);
        return t || { x: LOGICAL_FRAME / 2, y: LOGICAL_FRAME / 2, rotation: 0, scale: 1 };
    };

    const headT = pos('head');
    const torsoT = pos('torso');
    const leftArmT = pos('left_arm');
    const rightArmT = pos('right_arm');
    const leftLegT = pos('left_leg');
    const rightLegT = pos('right_leg');

    // Derive sizes from skeleton part definitions, scaled to logical space
    const sourceSize = skeleton.source_size || 96;
    const scaleFactor = (LOGICAL_FRAME * 0.92) / sourceSize;

    const headPart = parts.head || { width: 35, height: 42 };
    const torsoPart = parts.torso || { width: 20, height: 21 };
    const armPart = parts.left_arm || parts.right_arm || { width: 8, height: 20 };
    const legPart = parts.left_leg || parts.right_leg || { width: 8, height: 20 };

    const headW = Math.round(headPart.width * scaleFactor);
    const headH = Math.round(headPart.height * scaleFactor);
    const torsoW = Math.round(torsoPart.width * scaleFactor);
    const torsoH = Math.round(torsoPart.height * scaleFactor);
    const armW = Math.round(armPart.width * scaleFactor);
    const armH = Math.round(armPart.height * scaleFactor);
    const legW = Math.round(legPart.width * scaleFactor);
    const legH = Math.round(legPart.height * scaleFactor);

    // Compute positions — bone positions are at the anchor/joint, so we
    // offset to get the bounding box top-left for equipment drawing.
    const headX = Math.floor(headT.x - headW / 2);
    const headY = Math.floor(headT.y - headH / 2);
    const torsoX = Math.floor(torsoT.x - torsoW / 2);
    const torsoY = Math.floor(torsoT.y - torsoH / 2);

    const shoulderY = Math.floor(torsoT.y - torsoH / 2 + 2);

    const leftArmX = Math.floor(leftArmT.x - armW / 2);
    const rightArmX = Math.floor(rightArmT.x - armW / 2);

    const leftLegX = Math.floor(leftLegT.x - legW / 2);
    const rightLegX = Math.floor(rightLegT.x - legW / 2);

    const legsTopY = Math.floor(leftLegT.y - legH / 2);
    const feetY = Math.floor(Math.max(
        leftLegT.y + legH / 2,
        rightLegT.y + legH / 2
    ));

    // Walk cycle deltas for compatibility with equipment renderers
    // that expect walk.armL, walk.legL etc. as pixel offsets
    const kf = WALK_KEYFRAMES[frameIndex % 4];
    const walk = {
        armL: kf.left_arm ? kf.left_arm.tx : 0,
        armR: kf.right_arm ? kf.right_arm.tx : 0,
        legL: kf.left_leg ? kf.left_leg.tx : 0,
        legR: kf.right_leg ? kf.right_leg.tx : 0,
        bob: kf.torso ? kf.torso.ty : 0,
    };

    return {
        headX, headY, headW, headH,
        torsoX, torsoY, torsoW, torsoH,
        shoulderY,
        leftArmX, rightArmX, armW, armH,
        leftLegX, rightLegX, legW, legH,
        legsTopY, feetY, walk,
    };
}

// ═════════════════════════════════════════════════════════════════════════════
// Internal: Equipment Drawing (mirrors HumanoidSpriteSystem equipment logic)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Resolve an equipment ID or data object to a full equipment data object.
 */
function _getEquipData(eqIdOrData) {
    if (!eqIdOrData) return null;
    if (typeof eqIdOrData === 'object') return eqIdOrData;
    return findEquipmentWithExpansion(eqIdOrData) || null;
}

/**
 * Determine weapon sub-type from its name string.
 */
function _guessWeaponType(name) {
    if (!name) return 'sword';
    const n = name.toLowerCase();
    if (n.includes('axe'))                             return 'axe';
    if (n.includes('staff') || n.includes('wand'))     return 'staff';
    if (n.includes('bow') || n.includes('crossbow'))   return 'crossbow';
    if (n.includes('spear') || n.includes('lance'))    return 'spear';
    if (n.includes('dagger') || n.includes('knife'))   return 'sword';
    if (n.includes('mace') || n.includes('hammer'))    return 'axe';
    return 'sword';
}

/**
 * Build a cache key that encodes raceId, stage, and equipment loadout.
 */
function _buildCacheKey(raceId, stage, equipment) {
    const eqParts = [];
    if (equipment) {
        for (const slot of ['weapon', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'ring', 'amulet', 'crystal']) {
            const val = equipment[slot];
            if (val) eqParts.push(`${slot}:${typeof val === 'object' ? (val.equipment_id || 0) : val}`);
        }
    }
    return `skel_${raceId}_${stage}_${eqParts.join('|')}`;
}

/**
 * Get rarity-based accent color for accessories.
 */
function _getAccessoryColor(rarity) {
    switch (rarity) {
        case 'legendary': return '#ffaa00';
        case 'epic':      return '#aa44ff';
        case 'rare':      return '#4488ff';
        case 'uncommon':  return '#44cc66';
        default:          return '#aa8855';
    }
}

/**
 * Get rarity-based weapon blade color.
 */
function _getWeaponColor(rarity) {
    switch (rarity) {
        case 'legendary': return '#e8c840';
        case 'epic':      return '#9955dd';
        case 'rare':      return '#4488dd';
        case 'uncommon':  return '#55aa55';
        default:          return '#aab0b8';
    }
}

/**
 * Determine the highest rarity among all equipped items.
 */
function _getHighestRarity(equipment) {
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

/**
 * Draw all equipment overlays onto a single frame using the bone-derived anchors.
 *
 * This mirrors HumanoidSpriteSystem._drawHumanoidFrame's equipment section but
 * uses anchor positions derived from the skeletal bone hierarchy.
 */
function _drawEquipmentOverlays(ctx, anchors, dir, frame, stage, raceId, eqData, raceTheme, themeImg, armorTier, colors) {
    const { headX, headY, headW, headH, torsoX, torsoY, torsoW, torsoH,
            shoulderY, leftArmX, rightArmX, armW, armH,
            leftLegX, rightLegX, legW, legH, legsTopY, feetY, walk } = anchors;

    const headTopY = headY;
    const torsoTopY = torsoY;
    const cx = Math.floor((torsoX + torsoW / 2));

    // ── Evolution stage effects (before equipment) ──
    const race = SPRITE_RACES.find(r => r.race_id === raceId);
    const elemType = (race && race.element_types && race.element_types[0]) || 'Fire';
    const elemLower = elemType.toLowerCase();
    drawEvolutionEffects(ctx, anchors, dir, stage - 1, elemLower, frame);

    // ── Helmet ──
    if (eqData.helmet) {
        const helmetId = eqData.helmet.equipment_id || 0;
        const helmetVisual = helmetId ? getVisualConfig(helmetId) : null;
        if (helmetVisual && helmetVisual.style) {
            drawHelmetByConfig(ctx, headX - 1, headY - 3, headW + 2, headH + 2, helmetVisual, colors);
        } else {
            const fallback = getSlotVisualDefaults('helmet');
            drawHelmetByConfig(ctx, headX - 1, headY - 3, headW + 2, headH + 2, fallback, colors);
        }
    }

    // ── Chest armor ──
    if (eqData.chest) {
        const chestId = eqData.chest.equipment_id || 0;
        const chestVisual = chestId ? getVisualConfig(chestId) : null;
        if (chestVisual && chestVisual.style) {
            drawChestByConfig(ctx, torsoX, torsoY, torsoW, torsoH, chestVisual, colors);
        } else {
            const fallback = getSlotVisualDefaults('chest');
            drawChestByConfig(ctx, torsoX, torsoY, torsoW, torsoH, fallback, colors);
        }
    }

    // ── Leg armor ──
    if (eqData.legs) {
        const legsId = eqData.legs.equipment_id || 0;
        const legsVisual = legsId ? getVisualConfig(legsId) : null;
        const legArmorH = Math.floor(legH * 0.6);
        const cfg = (legsVisual && legsVisual.style) ? legsVisual : getSlotVisualDefaults('legs');
        drawLegsArmorByConfig(ctx, leftLegX, Math.floor(legsTopY + walk.legL), legW, legArmorH, cfg);
        drawLegsArmorByConfig(ctx, rightLegX, Math.floor(legsTopY + walk.legR), legW, legArmorH, cfg);
    }

    // ── Boots ──
    if (eqData.boots) {
        const bootsId = eqData.boots.equipment_id || 0;
        const bootsVisual = bootsId ? getVisualConfig(bootsId) : null;
        const bootH = Math.round(legH * 0.35);
        const cfg = (bootsVisual && bootsVisual.style) ? bootsVisual : getSlotVisualDefaults('boots');
        drawBootsByConfig(ctx, leftLegX - 1, Math.floor(legsTopY + walk.legL + legH - bootH), legW + 2, bootH + 2, cfg);
        drawBootsByConfig(ctx, rightLegX - 1, Math.floor(legsTopY + walk.legR + legH - bootH), legW + 2, bootH + 2, cfg);
    }

    // ── Gloves ──
    if (eqData.gloves) {
        const glovesId = eqData.gloves.equipment_id || 0;
        const glovesVisual = glovesId ? getVisualConfig(glovesId) : null;
        const cfg = (glovesVisual && glovesVisual.style) ? glovesVisual : getSlotVisualDefaults('gloves');
        drawGlovesByConfig(ctx, leftArmX, Math.floor(shoulderY + walk.armL), armW, armH, 'left', cfg);
        drawGlovesByConfig(ctx, rightArmX, Math.floor(shoulderY + walk.armR), armW, armH, 'right', cfg);
    }

    // ── Weapon ──
    {
        let weaponType = (raceTheme && raceTheme.weapon) || 'sword';
        if (eqData.weapon) {
            weaponType = _guessWeaponType(eqData.weapon.equipment_name);
        }

        const handOffset = armH - 4;
        let wx, wy;
        switch (dir) {
            case DIR_DOWN:  wx = cx + 10; wy = shoulderY + handOffset; break;
            case DIR_LEFT:  wx = cx - 14; wy = shoulderY + handOffset - 2; break;
            case DIR_RIGHT: wx = cx + 10; wy = shoulderY + handOffset - 2; break;
            case DIR_UP:    wx = cx - 10; wy = shoulderY - 4; break;
        }

        const eqId = eqData.weapon ? (eqData.weapon.equipment_id || 0) : 0;
        const visualConfig = eqId ? getVisualConfig(eqId) : null;

        if (visualConfig && visualConfig.shape) {
            drawWeaponByConfig(ctx, wx, wy, dir, visualConfig, colors);
        } else if (themeImg && themeImg.complete && themeImg.width > 0) {
            const equipRow = EQUIPMENT_ROWS[weaponType];
            if (equipRow) {
                const tier = Math.min(armorTier, equipRow.tiers - 1);
                const srcX = tier * (equipRow.cellW + 4) + equipRow.offsetX;
                const srcY = equipRow.offsetY;
                if (srcX + equipRow.cellW <= themeImg.width &&
                    srcY + equipRow.cellH <= themeImg.height) {
                    ctx.save();
                    ctx.imageSmoothingEnabled = true;
                    const drawW = Math.floor(equipRow.cellW * 0.6);
                    const drawH = Math.floor(equipRow.cellH * 0.6);
                    if (dir === DIR_LEFT) {
                        ctx.translate(wx + drawW / 2, wy);
                        ctx.scale(-1, 1);
                        ctx.drawImage(themeImg, srcX, srcY, equipRow.cellW, equipRow.cellH, -drawW / 2, 0, drawW, drawH);
                    } else {
                        ctx.drawImage(themeImg, srcX, srcY, equipRow.cellW, equipRow.cellH, wx, wy, drawW, drawH);
                    }
                    ctx.restore();
                }
            }
        } else if (eqData.weapon) {
            const rarity = eqData.weapon.rarity || 'common';
            const fallbackConfig = getSlotVisualDefaults('weapon');
            fallbackConfig.bladeColor = _getWeaponColor(rarity);
            fallbackConfig.shape = weaponType;
            drawWeaponByConfig(ctx, wx, wy, dir, fallbackConfig, colors);
        }
    }

    // ── Ring ──
    if (eqData.ring) {
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
            rx = null; // Not visible from behind
        }

        if (rx != null) {
            const ringId = eqData.ring.equipment_id || 0;
            const ringVisual = ringId ? getVisualConfig(ringId) : null;
            if (ringVisual && ringVisual.bandColor) {
                drawRingByConfig(ctx, rx, ry, ringVisual);
            } else {
                const fallback = getSlotVisualDefaults('ring');
                fallback.bandColor = _getAccessoryColor(eqData.ring.rarity || 'common');
                drawRingByConfig(ctx, rx, ry, fallback);
            }
        }
    }

    // ── Amulet ──
    if (eqData.amulet && dir !== DIR_UP) {
        const neckY = Math.floor(torsoTopY + walk.bob);
        const neckCx = cx;
        const amuletId = eqData.amulet.equipment_id || 0;
        const amuletVisual = amuletId ? getVisualConfig(amuletId) : null;
        if (amuletVisual && amuletVisual.pendantShape) {
            drawAmuletByConfig(ctx, neckCx, neckY, dir, amuletVisual);
        } else {
            const fallback = getSlotVisualDefaults('amulet');
            fallback.pendantColor = _getAccessoryColor(eqData.amulet.rarity || 'common');
            drawAmuletByConfig(ctx, neckCx, neckY, dir, fallback);
        }
    }

    // ── Crystal ──
    if (eqData.crystal) {
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

        const crystalId = eqData.crystal.equipment_id || 0;
        const crystalVisual = crystalId ? getVisualConfig(crystalId) : null;
        if (crystalVisual && crystalVisual.crystalColor) {
            drawCrystalByConfig(ctx, crx, cry, dir, frame, crystalVisual);
        } else {
            const rarity = eqData.crystal.rarity || 'common';
            let fallbackColor;
            if (eqData.crystal.element_synergy && ELEMENT_SKIN[eqData.crystal.element_synergy]) {
                fallbackColor = ELEMENT_SKIN[eqData.crystal.element_synergy].eye;
            } else {
                fallbackColor = _getAccessoryColor(rarity);
            }
            const fallback = getSlotVisualDefaults('crystal');
            fallback.crystalColor = fallbackColor;
            fallback.innerColor = fallbackColor;
            fallback.glowColor = fallbackColor;
            drawCrystalByConfig(ctx, crx, cry, dir, frame, fallback);
        }
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Internal: Default (Fallback) Skeleton
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Generate a generic fallback skeleton when the race-specific skeleton.json
 * is missing. Produces a reasonable humanoid layout that works for any race.
 */
function _buildFallbackSkeleton(raceName, stage) {
    return {
        race: raceName,
        stage: stage,
        source_size: 96,
        parts: {
            head:       { file: `${raceName}_S${stage}_head.png`,       width: 35, height: 42, anchor: { x: 18, y: 40 } },
            torso:      { file: `${raceName}_S${stage}_torso.png`,      width: 20, height: 21, anchor: { x: 10, y: 10 } },
            left_arm:   { file: `${raceName}_S${stage}_left_arm.png`,   width: 8,  height: 20, anchor: { x: 4,  y: 2  } },
            right_arm:  { file: `${raceName}_S${stage}_right_arm.png`,  width: 8,  height: 20, anchor: { x: 4,  y: 2  } },
            left_leg:   { file: `${raceName}_S${stage}_left_leg.png`,   width: 8,  height: 20, anchor: { x: 4,  y: 2  } },
            right_leg:  { file: `${raceName}_S${stage}_right_leg.png`,  width: 8,  height: 20, anchor: { x: 4,  y: 2  } },
            left_hand:  { file: `${raceName}_S${stage}_left_hand.png`,  width: 6,  height: 6,  anchor: { x: 3,  y: 1  } },
            right_hand: { file: `${raceName}_S${stage}_right_hand.png`, width: 6,  height: 6,  anchor: { x: 3,  y: 1  } },
            left_foot:  { file: `${raceName}_S${stage}_left_foot.png`,  width: 8,  height: 5,  anchor: { x: 4,  y: 1  } },
            right_foot: { file: `${raceName}_S${stage}_right_foot.png`, width: 8,  height: 5,  anchor: { x: 4,  y: 1  } },
        },
        bones: {
            torso:      { parent: null,       offset_x: 0.50, offset_y: 0.45, rotation: 0, scale: 1.0 },
            head:       { parent: 'torso',    offset_x: 0.00, offset_y: -0.28, rotation: 0, scale: 1.0 },
            left_arm:   { parent: 'torso',    offset_x: -0.11, offset_y: -0.06, rotation: 0, scale: 1.0 },
            right_arm:  { parent: 'torso',    offset_x: 0.11,  offset_y: -0.06, rotation: 0, scale: 1.0 },
            left_leg:   { parent: 'torso',    offset_x: -0.05, offset_y: 0.17,  rotation: 0, scale: 1.0 },
            right_leg:  { parent: 'torso',    offset_x: 0.05,  offset_y: 0.17,  rotation: 0, scale: 1.0 },
            left_hand:  { parent: 'left_arm', offset_x: 0.00,  offset_y: 0.14,  rotation: 0, scale: 1.0 },
            right_hand: { parent: 'right_arm',offset_x: 0.00,  offset_y: 0.14,  rotation: 0, scale: 1.0 },
            left_foot:  { parent: 'left_leg', offset_x: 0.00,  offset_y: 0.14,  rotation: 0, scale: 1.0 },
            right_foot: { parent: 'right_leg',offset_x: 0.00,  offset_y: 0.14,  rotation: 0, scale: 1.0 },
        },
        draw_order: [
            'left_leg', 'right_leg', 'left_foot', 'right_foot',
            'torso', 'left_arm', 'right_arm',
            'left_hand', 'right_hand', 'head',
        ],
    };
}

// ═════════════════════════════════════════════════════════════════════════════
// Public API: SkeletalAnimationSystem
// ═════════════════════════════════════════════════════════════════════════════

export class SkeletalAnimationSystem {

    /**
     * Preload all skeletal part PNGs and skeleton data for all 24 races x 3 stages.
     * Also preloads equipment theme images.
     *
     * @param {object} assets - AssetLoader instance with loadImage() method
     */
    static async preloadAssets(assets) {
        _assetLoader = assets;

        // Load the skeletal manifest (lists which races have skeletal data)
        await _loadManifest();

        // Load skeletons and part images for all 24 races x 3 stages
        const allPromises = [];

        for (let raceId = 1; raceId <= 24; raceId++) {
            const raceName = RACE_NAMES[raceId];
            if (!raceName) continue;

            for (let stage = 1; stage <= 3; stage++) {
                // Load skeleton JSON
                const skelPromise = _loadSkeleton(raceName, stage).then(skeleton => {
                    if (!skeleton) {
                        // Use fallback skeleton; still try to load whatever part PNGs exist
                        const fallback = _buildFallbackSkeleton(raceName, stage);
                        _skeletonCache.set(`${raceName}_S${stage}`, fallback);
                        return fallback;
                    }
                    return skeleton;
                }).then(skeleton => {
                    // Load all part images defined in the skeleton
                    const partPromises = [];
                    const parts = skeleton.parts || {};
                    for (const partName of Object.keys(parts)) {
                        partPromises.push(_loadPartImage(raceName, stage, partName));
                    }
                    return Promise.all(partPromises);
                });

                allPromises.push(skelPromise);
            }
        }

        // Load equipment theme images in parallel
        const loadedThemes = new Set();
        for (const raceId in RACE_THEME_MAP) {
            const themeName = RACE_THEME_MAP[raceId].theme;
            const path = THEME_PATHS[themeName];
            if (path && !loadedThemes.has(path)) {
                loadedThemes.add(path);
                allPromises.push(
                    _loadImage(path)
                        .then(img => { if (img) _themeImageCache.set(path, img); })
                );
            }
        }

        await Promise.all(allPromises);
    }

    /**
     * Get or generate a composite 1024x1024 walk cycle sprite sheet.
     * Equipment-aware: different loadouts produce different cached sheets.
     *
     * @param {number} raceId - Race ID (1-24)
     * @param {number} stage - Evolution stage (1-3, default 1)
     * @param {object|null} equipment - Equipment loadout object
     * @returns {HTMLCanvasElement} 1024x1024 sprite sheet canvas
     */
    static getCompositeSheet(raceId, stage = 1, equipment = null) {
        const cacheKey = _buildCacheKey(raceId, stage, equipment);

        if (_compositeCache.has(cacheKey)) {
            // Promote in LRU
            const idx = _compositeLRU.indexOf(cacheKey);
            if (idx !== -1) _compositeLRU.splice(idx, 1);
            _compositeLRU.push(cacheKey);
            return _compositeCache.get(cacheKey);
        }

        const sheet = this._generateCompositeSheet(raceId, stage, equipment);
        _compositeCache.set(cacheKey, sheet);
        _compositeLRU.push(cacheKey);

        // Evict oldest entries when over capacity
        while (_compositeLRU.length > MAX_CACHE_ENTRIES) {
            const evictKey = _compositeLRU.shift();
            _compositeCache.delete(evictKey);
        }

        return sheet;
    }

    /**
     * Draw a single skeletal frame directly to the given canvas context.
     *
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {number} raceId - Race ID (1-24)
     * @param {number} stage - Evolution stage (1-3)
     * @param {number} direction - Direction index (0=Down, 1=Left, 2=Right, 3=Up)
     * @param {number} frame - Walk frame index (0-3)
     * @param {number} x - Center X position on canvas
     * @param {number} y - Bottom Y position on canvas (feet)
     * @param {number} size - Desired render size (width and height)
     * @param {object|null} equipment - Equipment loadout
     */
    static drawFrame(ctx, raceId, stage, direction, frame, x, y, size, equipment = null) {
        const sheet = this.getCompositeSheet(raceId, stage, equipment);
        const sx = (frame % SHEET_COLS) * FRAME_SIZE;
        const sy = direction * FRAME_SIZE;
        const halfSize = size / 2;

        // High-quality downscale from 256x256 for smooth anti-aliased look
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sheet,
            sx, sy, FRAME_SIZE, FRAME_SIZE,
            x - halfSize, y - size, size, size
        );
    }

    /**
     * Draw a humanoid with full equipment overlays and rarity glow.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} raceId
     * @param {number} stage
     * @param {number} direction
     * @param {number} frame
     * @param {number} x
     * @param {number} y
     * @param {number} size
     * @param {object} opts - { equipment }
     */
    static drawWithEquipment(ctx, raceId, stage, direction, frame, x, y, size, opts = {}) {
        const equipment = opts.equipment || null;
        this.drawFrame(ctx, raceId, stage, direction, frame, x, y, size, equipment);

        // Rarity glow effect for highest-rarity equipped item
        if (equipment) {
            const bestRarity = _getHighestRarity(equipment);
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
     * Draw a trainer/player/NPC with outfit overlays based on character appearance.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} raceId
     * @param {number} stage
     * @param {number} direction
     * @param {number} frame
     * @param {number} x
     * @param {number} y
     * @param {number} size
     * @param {object} opts - { equipment, trainerTitle, isPlayer, npcType }
     */
    static drawCharacter(ctx, raceId, stage, direction, frame, x, y, size, opts = {}) {
        // Draw base sprite with equipment
        this.drawWithEquipment(ctx, raceId, stage, direction, frame, x, y, size, opts);

        // Determine appearance config
        let appearance = null;
        if (opts.isPlayer) {
            appearance = getPlayerAppearance();
        } else if (opts.trainerTitle) {
            appearance = getTrainerAppearance(opts.trainerTitle);
        } else if (opts.npcType) {
            appearance = getNPCAppearance(opts.npcType);
        }

        // Draw outfit overlay if appearance config exists
        if (appearance) {
            const halfSize = size / 2;
            const drawX = x - halfSize;
            const drawY = y - size;

            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.scale(size / LOGICAL_FRAME, size / LOGICAL_FRAME);

            // Build anchors for outfit rendering
            const raceName = RACE_NAMES[raceId] || 'Human';
            const skeleton = _getCachedSkeleton(raceName, stage) || _buildFallbackSkeleton(raceName, stage);
            const boneTransforms = _computeBoneTransforms(skeleton, frame);
            const logicalTransforms = _mapToLogicalSpace(boneTransforms, skeleton);
            const fAnchors = _buildAnchorsFromBones(logicalTransforms, skeleton, direction, frame);

            drawCharacterOutfit(ctx, fAnchors, direction, appearance);
            ctx.restore();
        }
    }

    /**
     * Clear all cached composite sheets, part images, skeleton data, and reset state.
     */
    static clearCache() {
        _compositeCache.clear();
        _compositeLRU.length = 0;
        _partImageCache.clear();
        _partLoadPromises.clear();
        _skeletonCache.clear();
        _skeletonLoadPromises.clear();
        _themeImageCache.clear();
        _manifest = null;
        _assetLoader = null;
    }

    /**
     * Invalidate a specific cached composite sheet (e.g., after equipment change).
     *
     * @param {number} raceId
     * @param {number} stage
     * @param {object|null} equipment
     */
    static invalidateCache(raceId, stage, equipment) {
        const cacheKey = _buildCacheKey(raceId, stage, equipment);
        _compositeCache.delete(cacheKey);
        const idx = _compositeLRU.indexOf(cacheKey);
        if (idx !== -1) _compositeLRU.splice(idx, 1);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Private: Composite Sheet Generation
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Generate a full 1024x1024 composite sprite sheet (4 directions x 4 walk frames).
     * Each 256x256 frame is rendered by assembling skeletal parts at 4x supersampled
     * resolution from a 64x64 logical coordinate space.
     *
     * @param {number} raceId
     * @param {number} stage
     * @param {object|null} equipment
     * @returns {HTMLCanvasElement}
     */
    static _generateCompositeSheet(raceId, stage, equipment) {
        const sheet = document.createElement('canvas');
        sheet.width  = FRAME_SIZE * SHEET_COLS;   // 1024
        sheet.height = FRAME_SIZE * SHEET_ROWS;   // 1024
        const ctx = sheet.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const raceName = RACE_NAMES[raceId] || 'Human';
        const skeleton = _getCachedSkeleton(raceName, stage) || _buildFallbackSkeleton(raceName, stage);

        // Resolve race colors for equipment rendering
        const race = SPRITE_RACES.find(r => r.race_id === raceId);
        const elemType = (race && race.element_types && race.element_types[0]) || 'Fire';
        const colors = ELEMENT_SKIN[elemType] || ELEMENT_SKIN.Fire;

        // Equipment theme data
        const raceTheme = RACE_THEME_MAP[raceId] || RACE_THEME_MAP[1];
        const themePath = THEME_PATHS[raceTheme.theme];
        const themeImg = themePath ? _themeImageCache.get(themePath) : null;
        const armorTier = STAGE_ARMOR_TIER[stage] || 0;

        // Resolve equipment data objects
        const eqData = {};
        if (equipment) {
            for (const slot of ['weapon', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'ring', 'amulet', 'crystal']) {
                eqData[slot] = _getEquipData(equipment[slot]);
            }
        }

        // Generate all 4 directions x 4 walk frames
        for (let dir = 0; dir < 4; dir++) {
            for (let frame = 0; frame < 4; frame++) {
                const frameX = frame * FRAME_SIZE;
                const frameY = dir * FRAME_SIZE;

                // Compute bone transforms for this frame
                const boneTransforms = _computeBoneTransforms(skeleton, frame);
                const logicalTransforms = _mapToLogicalSpace(boneTransforms, skeleton);

                // Draw into the frame region at 4x scale
                ctx.save();
                ctx.translate(frameX, frameY);
                ctx.scale(RENDER_SCALE, RENDER_SCALE);

                // Draw skeletal body parts in painter order
                _drawSkeletalFrame(ctx, skeleton, raceName, stage, dir, frame, logicalTransforms);

                // Build equipment anchors and draw overlays
                const anchors = _buildAnchorsFromBones(logicalTransforms, skeleton, dir, frame);
                _drawEquipmentOverlays(ctx, anchors, dir, frame, stage, raceId, eqData, raceTheme, themeImg, armorTier, colors);

                ctx.restore();
            }
        }

        return sheet;
    }
}

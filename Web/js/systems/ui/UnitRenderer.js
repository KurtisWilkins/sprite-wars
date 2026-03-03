/**
 * UnitRenderer — Shared composite sprite renderer for all scenes.
 *
 * Draws a fully composited unit on a Canvas context:
 *   1. Base sprite via HumanoidSpriteSystem (with equipment layers)
 *   2. Weapon overlay from the equipped weapon's theme sheet
 *   3. Armor tint / rarity glow border
 *   4. Element aura particles
 *   5. Status effect icons
 *   6. HP bar
 *   7. Level badge
 *
 * All sprite rendering uses HumanoidSpriteSystem — no legacy sprite
 * image files are loaded or displayed.
 *
 * Used by SpriteCenterScene, DeploymentScene, and BattleScene.
 */

import { assetRegistry } from '../../data/AssetRegistry.js';
import { SPRITE_RACES } from '../../data/SpriteData.js';
import { EQUIPMENT } from '../../data/EquipmentData.js';
import { HumanoidSpriteSystem } from '../rendering/HumanoidSpriteSystem.js';

// ── Element colors ──────────────────────────────────────────────────────────
export const ELEMENT_COLORS = {
    Fire: '#ff5533', Water: '#3399ff', Nature: '#33aa33', Ice: '#99ddff',
    Air: '#88ccaa', Earth: '#996633', Electric: '#ffcc00', Dark: '#8844aa',
    Light: '#ffee99', Psychic: '#ff66aa', Spirit: '#9988dd', Chaos: '#ff8833',
    Metal: '#aaaacc', Poison: '#aa33aa',
};

// ── Rarity glow colors ─────────────────────────────────────────────────────
const RARITY_COLORS = {
    common:    null,
    uncommon:  '#33cc66',
    rare:      '#3399ff',
    epic:      '#aa44ff',
    legendary: '#ffaa00',
};

// ── Weapon theme sheet layout ───────────────────────────────────────────────
// Rows/cols of the "best" weapon icon to extract per weapon type mapping
const WEAPON_TYPE_CELLS = {
    sword:  { col: 0, row: 0 },
    axe:    { col: 2, row: 0 },
    staff:  { col: 4, row: 0 },
    bow:    { col: 6, row: 0 },
    dagger: { col: 1, row: 0 },
    spear:  { col: 3, row: 0 },
    mace:   { col: 5, row: 0 },
    default:{ col: 0, row: 0 },
};

// (Old character sheet constants removed — HumanoidSpriteSystem handles all rendering)

// ── Animation timing ────────────────────────────────────────────────────────
const IDLE_ANIM_SPEED = 2.5;     // frames per second for idle bob
const AURA_SPEED = 1.8;          // particles per second
const STATUS_FLASH_SPEED = 2.0;  // flashes per second

/**
 * Image cache to avoid reloading.
 * @type {Map<string, HTMLImageElement|null>}
 */
const _imageCache = new Map();

/**
 * Load or retrieve an image from cache.
 * @param {object} engine - The game engine (needs engine.assets.loadImage)
 * @param {string} path
 * @returns {Promise<HTMLImageElement|null>}
 */
async function _loadImage(engine, path) {
    if (!path) return null;
    if (_imageCache.has(path)) return _imageCache.get(path);

    // Mark as loading
    _imageCache.set(path, null);
    try {
        const img = await engine.assets.loadImage(path);
        _imageCache.set(path, img);
        return img;
    } catch {
        _imageCache.set(path, null);
        return null;
    }
}

/**
 * Synchronous cache lookup (returns null if not yet loaded).
 * @param {string} path
 * @returns {HTMLImageElement|null}
 */
function _getCachedImage(path) {
    return _imageCache.get(path) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// UnitRenderer class
// ═══════════════════════════════════════════════════════════════════════════

export class UnitRenderer {

    /**
     * Preload all images needed to render a unit.
     * Call this in scene enter() so images are cached before render().
     * @param {object} engine
     * @param {object} spriteInstance - The sprite data object
     */
    static async preloadUnit(engine, spriteInstance) {
        if (!spriteInstance) return;

        const formId = spriteInstance.formId || spriteInstance.form_id || 1;
        const raceId = spriteInstance.raceId || spriteInstance.race_id || Math.ceil(formId / 3);

        // 1. Weapon theme sheet (if weapon equipped)
        const equipment = spriteInstance.equipment || {};
        if (equipment.weapon) {
            const weaponData = UnitRenderer._getEquipmentData(equipment.weapon);
            const weaponPath = UnitRenderer._getWeaponThemePath(weaponData, raceId);
            await _loadImage(engine, weaponPath);
        }

        // 2. Element icons
        const race = SPRITE_RACES.find(r => r.race_id === raceId);
        const elements = spriteInstance.elementTypes || spriteInstance.element_types
            || (race ? race.element_types : ['Fire']);
        for (const elem of elements) {
            const iconPath = assetRegistry.getElementIcon(elem);
            await _loadImage(engine, iconPath);
        }

        // 3. Status effect VFX
        const statuses = spriteInstance.activeStatusEffects || [];
        for (const s of statuses) {
            const effectId = s.effectId || s.effect_id || (s.effectData && s.effectData.effect_id);
            if (effectId) {
                await _loadImage(engine, assetRegistry.getStatusVfx(effectId));
            }
        }
    }

    /**
     * Preload units for a whole team.
     * @param {object} engine
     * @param {object[]} team
     */
    static async preloadTeam(engine, team) {
        if (!team || !team.length) return;
        await Promise.all(team.map(s => UnitRenderer.preloadUnit(engine, s)));
    }

    // ═══════════════════════════════════════════════════════════════════
    // Main draw method — draws a fully composited unit
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Draw a fully composited unit at the given position.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} spriteInstance - Sprite data (raceId, formId, equipment, etc.)
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} size - Width/height of the render area
     * @param {object} opts
     * @param {number} [opts.time=0] - Current time in seconds (for animations)
     * @param {number} [opts.team=0] - 0=player, 1=enemy
     * @param {boolean} [opts.showHpBar=false]
     * @param {number} [opts.hpFraction=1]
     * @param {boolean} [opts.showLevel=true]
     * @param {boolean} [opts.showAura=true]
     * @param {boolean} [opts.showStatusIcons=false]
     * @param {boolean} [opts.showWeapon=true]
     * @param {boolean} [opts.showArmorGlow=true]
     * @param {boolean} [opts.showElementBadge=true]
     * @param {boolean} [opts.isSelected=false]
     * @param {number} [opts.alpha=1]
     * @param {number} [opts.direction=0] - 0=down,1=left,2=right,3=up
     * @param {number} [opts.animFrame=0] - Which frame in the walk cycle
     * @param {object[]} [opts.statusEffects=[]]
     */
    static draw(ctx, spriteInstance, x, y, size, opts = {}) {
        if (!spriteInstance) return;

        const time = opts.time || 0;
        const team = opts.team || 0;
        const alpha = opts.alpha !== undefined ? opts.alpha : 1;
        const showHpBar = opts.showHpBar || false;
        const hpFraction = opts.hpFraction !== undefined ? opts.hpFraction : 1;
        const showLevel = opts.showLevel !== undefined ? opts.showLevel : true;
        const showAura = opts.showAura !== undefined ? opts.showAura : true;
        const showWeapon = opts.showWeapon !== undefined ? opts.showWeapon : true;
        const showArmorGlow = opts.showArmorGlow !== undefined ? opts.showArmorGlow : true;
        const showElementBadge = opts.showElementBadge !== undefined ? opts.showElementBadge : true;
        const showStatusIcons = opts.showStatusIcons || false;
        const isSelected = opts.isSelected || false;
        const direction = opts.direction || 0;
        const statusEffects = opts.statusEffects || spriteInstance.activeStatusEffects || [];

        const formId = spriteInstance.formId || spriteInstance.form_id || 1;
        const raceId = spriteInstance.raceId || spriteInstance.race_id || Math.ceil(formId / 3);
        const race = SPRITE_RACES.find(r => r.race_id === raceId);
        const elements = spriteInstance.elementTypes || spriteInstance.element_types
            || (race ? race.element_types : ['Fire']);
        const primaryElem = elements[0] || 'Fire';
        const elemColor = ELEMENT_COLORS[primaryElem] || '#ffffff';
        const level = spriteInstance.level || 1;
        const equipment = spriteInstance.equipment || {};

        const halfSize = size / 2;
        const left = x - halfSize;
        const top = y - halfSize;

        ctx.save();
        ctx.globalAlpha = alpha;

        // ── Idle bob animation ──────────────────────────────────────
        const bobOffset = Math.sin(time * IDLE_ANIM_SPEED * Math.PI) * (size * 0.03);

        // ── Selection highlight ring ────────────────────────────────
        if (isSelected) {
            ctx.save();
            ctx.strokeStyle = '#ffdd44';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#ffdd44';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x, y + bobOffset, halfSize + 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // ── Element aura (subtle pulsing glow behind sprite) ────────
        if (showAura) {
            UnitRenderer._drawElementAura(ctx, x, y + bobOffset, size, elemColor, time, elements);
        }

        // ── Armor glow border (rarity-based) ────────────────────────
        if (showArmorGlow) {
            UnitRenderer._drawArmorGlow(ctx, x, y + bobOffset, size, equipment);
        }

        // ── Base race sprite ────────────────────────────────────────
        UnitRenderer._drawBaseSprite(ctx, spriteInstance, x, y + bobOffset, size, formId, direction, time, team, elemColor, level);

        // ── Weapon overlay ──────────────────────────────────────────
        if (showWeapon && equipment.weapon) {
            UnitRenderer._drawWeaponOverlay(ctx, equipment.weapon, raceId, x, y + bobOffset, size, direction);
        }

        // ── HP Bar ──────────────────────────────────────────────────
        if (showHpBar) {
            UnitRenderer._drawHpBar(ctx, left, top + size + 2 + bobOffset, size, hpFraction);
        }

        // ── Element badge(s) ────────────────────────────────────────
        if (showElementBadge) {
            UnitRenderer._drawElementBadges(ctx, elements, left + size - 2, top - 2 + bobOffset, size);
        }

        // ── Level badge ─────────────────────────────────────────────
        if (showLevel) {
            UnitRenderer._drawLevelBadge(ctx, level, left - 1, top - 1 + bobOffset, size);
        }

        // ── Status effect icons ─────────────────────────────────────
        if (showStatusIcons && statusEffects.length > 0) {
            UnitRenderer._drawStatusIcons(ctx, statusEffects, x, top + size + (showHpBar ? 10 : 2), size, time);
        }

        // ── Team indicator border ───────────────────────────────────
        const teamColor = team === 0 ? 'rgba(51,153,255,0.5)' : 'rgba(255,51,51,0.5)';
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(left, top + bobOffset, size, size);

        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Draw helpers
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Draw the base race sprite using HumanoidSpriteSystem.
     * Always uses the procedural renderer — equipment layers are composited
     * automatically when present, bare humanoid rendered when empty.
     */
    static _drawBaseSprite(ctx, inst, cx, cy, size, formId, direction, time, team, elemColor, level) {
        const halfSize = size / 2;
        const raceId = inst.raceId || inst.race_id || Math.ceil(formId / 3);
        const stage = inst.evolutionStage || inst.evolution_stage || (((formId - 1) % 3) + 1);
        const equipment = inst.equipment || {};
        const animFrame = Math.floor(time * 3) % 4;

        // Always use HumanoidSpriteSystem which composites all 9 equipment
        // slots (helmet, chest, boots, gloves, ring, amulet, crystal, weapon,
        // legs) as visual layers. When no equipment is present, renders a
        // bare humanoid with element-colored skin.
        HumanoidSpriteSystem.drawWithEquipment(
            ctx, raceId, stage, direction, animFrame,
            cx, cy + halfSize, size,
            { equipment }
        );
    }

    /**
     * Draw element aura — pulsing glow + floating particles.
     */
    static _drawElementAura(ctx, cx, cy, size, elemColor, time, elements) {
        const r = size / 2 + 4;
        const pulse = 0.3 + Math.sin(time * AURA_SPEED * Math.PI) * 0.15;

        // Outer glow
        ctx.save();
        ctx.globalAlpha *= pulse;
        const gradient = ctx.createRadialGradient(cx, cy, size / 2, cx, cy, r + 6);
        gradient.addColorStop(0, elemColor + '00');
        gradient.addColorStop(0.6, elemColor + '22');
        gradient.addColorStop(1, elemColor + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Floating particles (3-5 small dots orbiting the unit)
        const numParticles = Math.min(elements.length * 2 + 1, 5);
        for (let i = 0; i < numParticles; i++) {
            ctx.save();
            const angle = (time * 0.8 + (i / numParticles) * Math.PI * 2) % (Math.PI * 2);
            const orbitR = r + 2 + Math.sin(time * 1.5 + i) * 3;
            const px = cx + Math.cos(angle) * orbitR;
            const py = cy + Math.sin(angle) * orbitR * 0.6; // flattened orbit
            const pSize = 1.5 + Math.sin(time * 2 + i * 1.3) * 0.8;

            const pColor = ELEMENT_COLORS[elements[i % elements.length]] || elemColor;
            ctx.fillStyle = pColor;
            ctx.globalAlpha *= (0.5 + Math.sin(time * 3 + i) * 0.3);
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    /**
     * Draw armor/equipment rarity glow.
     */
    static _drawArmorGlow(ctx, cx, cy, size, equipment) {
        // Find highest rarity equipped item
        let bestRarity = 'common';
        const rarityRank = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
        for (const slotKey of Object.keys(equipment)) {
            const eqId = equipment[slotKey];
            if (!eqId) continue;
            const eqData = typeof eqId === 'object' ? eqId : EQUIPMENT.find(e => e.equipment_id === eqId);
            if (eqData && rarityRank[eqData.rarity] > rarityRank[bestRarity]) {
                bestRarity = eqData.rarity;
            }
        }

        const glowColor = RARITY_COLORS[bestRarity];
        if (!glowColor) return;

        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = bestRarity === 'legendary' ? 12 : bestRarity === 'epic' ? 8 : 5;
        ctx.strokeStyle = glowColor + '88';
        ctx.lineWidth = 1.5;
        const r = size / 2 + 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw weapon overlay from theme sprite sheet.
     */
    static _drawWeaponOverlay(ctx, weaponIdOrData, raceId, cx, cy, size, direction) {
        const weaponData = UnitRenderer._getEquipmentData(weaponIdOrData);
        if (!weaponData) return;

        const weaponPath = UnitRenderer._getWeaponThemePath(weaponData, raceId);
        const img = _getCachedImage(weaponPath);
        if (!img) return;

        // Extract weapon icon from the theme sheet
        // Theme sheets are large (1691x1039) grids. We'll pick a weapon
        // based on the weapon name hints.
        const wType = UnitRenderer._guessWeaponType(weaponData.equipment_name);
        const cell = WEAPON_TYPE_CELLS[wType] || WEAPON_TYPE_CELLS.default;

        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;

        // Calculate actual cell dimensions from the sheet
        // Theme sheets appear to be roughly 35 columns × 21 rows of ~48px cells
        const actualCellW = Math.floor(imgW / 35);
        const actualCellH = Math.floor(imgH / 21);

        const sx = cell.col * actualCellW;
        const sy = cell.row * actualCellH;

        // Draw weapon icon overlaid in the bottom-right of the sprite
        const weaponSize = size * 0.45;
        const weaponX = cx + size * 0.15;
        const weaponY = cy + size * 0.1;

        ctx.save();
        // Slight rotation based on direction
        const rotations = [0, -0.3, 0.3, 0];
        ctx.translate(weaponX, weaponY);
        ctx.rotate(rotations[direction % 4]);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img,
            sx, sy, actualCellW, actualCellH,
            -weaponSize / 2, -weaponSize / 2, weaponSize, weaponSize
        );
        ctx.imageSmoothingEnabled = true;
        ctx.restore();
    }

    /**
     * Draw element badge icons.
     */
    static _drawElementBadges(ctx, elements, rightX, topY, unitSize) {
        const badgeSize = Math.max(8, unitSize * 0.25);
        for (let i = 0; i < elements.length; i++) {
            const elem = elements[i];
            const iconImg = _getCachedImage(assetRegistry.getElementIcon(elem));
            const bx = rightX - badgeSize * (i + 1) - i * 1;
            const by = topY;

            if (iconImg) {
                ctx.drawImage(iconImg, bx, by, badgeSize, badgeSize);
            } else {
                // Colored dot fallback
                const c = ELEMENT_COLORS[elem] || '#fff';
                ctx.fillStyle = c;
                ctx.beginPath();
                ctx.arc(bx + badgeSize / 2, by + badgeSize / 2, badgeSize / 2 - 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }

    /**
     * Draw level badge (bottom-left corner).
     */
    static _drawLevelBadge(ctx, level, leftX, topY, unitSize) {
        const badgeW = Math.max(14, unitSize * 0.35);
        const badgeH = Math.max(10, unitSize * 0.22);
        const bx = leftX;
        const by = topY;

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeW, badgeH, 3);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(7, unitSize * 0.18)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${level}`, bx + badgeW / 2, by + badgeH / 2);
    }

    /**
     * Draw HP bar below the unit.
     */
    static _drawHpBar(ctx, x, y, width, fraction) {
        const barH = Math.max(3, width * 0.08);
        const barW = width;

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 1);
        ctx.fill();

        // HP fill
        let hpColor;
        if (fraction > 0.5) hpColor = '#33cc66';
        else if (fraction > 0.25) hpColor = '#cccc33';
        else hpColor = '#cc3333';

        const fillW = Math.max(0, barW * Math.min(1, fraction));
        if (fillW > 0) {
            ctx.fillStyle = hpColor;
            ctx.beginPath();
            ctx.roundRect(x, y, fillW, barH, 1);
            ctx.fill();
        }

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, 1);
        ctx.stroke();
    }

    /**
     * Draw status effect icons in a row below HP bar.
     */
    static _drawStatusIcons(ctx, statusEffects, cx, topY, unitSize, time) {
        const iconSize = Math.max(8, unitSize * 0.2);
        const totalW = statusEffects.length * (iconSize + 1);
        let startX = cx - totalW / 2;

        for (let i = 0; i < statusEffects.length; i++) {
            const s = statusEffects[i];
            const effectId = s.effectId || s.effect_id || (s.effectData && s.effectData.effect_id) || 0;
            const ix = startX + i * (iconSize + 1);
            const flash = Math.sin(time * STATUS_FLASH_SPEED * Math.PI + i) > 0 ? 1 : 0.6;

            ctx.save();
            ctx.globalAlpha *= flash;

            // Try loading VFX image
            const vfxPath = assetRegistry.getStatusVfx(effectId);
            const vfxImg = _getCachedImage(vfxPath);
            if (vfxImg) {
                // Effect sprites are strips — extract first frame
                const frameW = Math.min(vfxImg.width, 64);
                const frameH = Math.min(frameW, vfxImg.height);
                ctx.drawImage(vfxImg, 0, 0, frameW, frameH, ix, topY, iconSize, iconSize);
            } else {
                // Fallback colored square
                const statusColors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff'];
                ctx.fillStyle = statusColors[effectId % statusColors.length] || '#ff4444';
                ctx.fillRect(ix, topY, iconSize, iconSize);
            }

            // Duration indicator (turns remaining)
            const turns = s.remainingTurns || s.remaining_turns || 0;
            if (turns > 0) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${Math.max(5, iconSize * 0.5)}px sans-serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`${turns}`, ix + iconSize, topY + iconSize);
            }

            ctx.restore();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DOM card renderer — for list-based UIs (inventory, roster)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Create a DOM element representing a sprite unit card with preview canvas.
     * Used by SpriteCenterScene (team tab) and DeploymentScene (roster panel).
     *
     * @param {object} spriteInstance
     * @param {object} opts
     * @param {number} [opts.cardWidth=160]
     * @param {number} [opts.cardHeight=60]
     * @param {number} [opts.previewSize=48]
     * @param {boolean} [opts.showEquipment=true]
     * @param {boolean} [opts.showHpBar=true]
     * @param {number} [opts.hpFraction=1]
     * @param {boolean} [opts.isSelected=false]
     * @param {Function} [opts.onClick]
     * @returns {HTMLElement}
     */
    static createUnitCard(spriteInstance, opts = {}) {
        const cardWidth = opts.cardWidth || 160;
        const cardHeight = opts.cardHeight || 60;
        const previewSize = opts.previewSize || 48;
        const showEquipment = opts.showEquipment !== undefined ? opts.showEquipment : true;
        const showHpBar = opts.showHpBar !== undefined ? opts.showHpBar : true;
        const hpFraction = opts.hpFraction !== undefined ? opts.hpFraction : 1;
        const isSelected = opts.isSelected || false;

        const inst = spriteInstance;
        const raceId = inst.raceId || inst.race_id || 1;
        const race = SPRITE_RACES.find(r => r.race_id === raceId);
        const elements = inst.elementTypes || inst.element_types || (race ? race.element_types : ['Fire']);
        const primaryElem = elements[0] || 'Fire';
        const elemColor = ELEMENT_COLORS[primaryElem] || '#ffffff';
        const level = inst.level || 1;
        const equipment = inst.equipment || {};

        const name = inst.nickname || (race ? race.race_name : `Sprite #${raceId}`);

        // Card container
        const card = document.createElement('div');
        card.style.cssText = `
            display:flex;align-items:center;gap:6px;
            padding:4px 6px;border-radius:6px;cursor:pointer;
            background:${isSelected ? elemColor + '30' : 'rgba(255,255,255,0.05)'};
            border:1px solid ${isSelected ? elemColor + '88' : 'rgba(255,255,255,0.08)'};
            width:${cardWidth}px;height:${cardHeight}px;
            transition:background 0.15s;position:relative;overflow:hidden;
        `;
        card.addEventListener('mouseenter', () => {
            card.style.background = elemColor + '25';
        });
        card.addEventListener('mouseleave', () => {
            card.style.background = isSelected ? elemColor + '30' : 'rgba(255,255,255,0.05)';
        });
        if (opts.onClick) card.addEventListener('click', opts.onClick);

        // Preview canvas (draws the composite sprite)
        const canvas = document.createElement('canvas');
        canvas.width = previewSize;
        canvas.height = previewSize + (showHpBar ? 6 : 0);
        canvas.style.cssText = `width:${previewSize}px;height:${canvas.height}px;flex-shrink:0;`;
        card.appendChild(canvas);

        // Draw composite sprite on the canvas
        const pCtx = canvas.getContext('2d');
        const drawSize = previewSize - 4;
        UnitRenderer.draw(pCtx, inst, previewSize / 2, previewSize / 2, drawSize, {
            time: Math.random() * 10, // varied starting anim phase
            showHpBar,
            hpFraction,
            showLevel: true,
            showAura: true,
            showWeapon: true,
            showArmorGlow: true,
            showElementBadge: true,
            showStatusIcons: false,
        });

        // Info column
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'flex:1;min-width:0;';

        // Name row
        const nameRow = document.createElement('div');
        nameRow.style.cssText = `font-size:0.75rem;font-weight:600;color:#ddddee;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
        nameRow.textContent = name;
        infoDiv.appendChild(nameRow);

        // Level + elements row
        const metaRow = document.createElement('div');
        metaRow.style.cssText = 'font-size:0.6rem;color:#888;display:flex;align-items:center;gap:3px;';
        metaRow.textContent = `Lv${level}`;
        for (const elem of elements) {
            const dot = document.createElement('span');
            dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;
                background:${ELEMENT_COLORS[elem] || '#888'};`;
            dot.title = elem;
            metaRow.appendChild(dot);
        }
        infoDiv.appendChild(metaRow);

        // Equipment summary row
        if (showEquipment && Object.keys(equipment).length > 0) {
            const eqRow = document.createElement('div');
            eqRow.style.cssText = 'font-size:0.5rem;color:#666;margin-top:1px;';
            const eqNames = [];
            for (const [slot, eqId] of Object.entries(equipment)) {
                if (!eqId) continue;
                const eqData = UnitRenderer._getEquipmentData(eqId);
                if (eqData) {
                    const rarityColor = RARITY_COLORS[eqData.rarity] || '#888';
                    eqNames.push(`<span style="color:${rarityColor}">${eqData.equipment_name}</span>`);
                }
            }
            if (eqNames.length > 0) {
                eqRow.innerHTML = eqNames.slice(0, 3).join(' · ');
                if (eqNames.length > 3) eqRow.innerHTML += ` +${eqNames.length - 3}`;
                infoDiv.appendChild(eqRow);
            }
        }

        card.appendChild(infoDiv);
        return card;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Equipment detail panel renderer
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Create a DOM element showing equipped items in a paper-doll layout.
     * @param {object} equipment - { weapon: id, helmet: id, chest: id, ... }
     * @param {number} [size=120]
     * @returns {HTMLElement}
     */
    static createEquipmentDisplay(equipment, size = 120) {
        const container = document.createElement('div');
        container.style.cssText = `
            position:relative;width:${size}px;height:${size}px;
            background:rgba(0,0,0,0.3);border-radius:8px;
            border:1px solid rgba(255,255,255,0.1);
        `;

        // Slot positions (relative percentages for paper-doll layout)
        const slotPositions = {
            helmet:  { x: 0.5,  y: 0.05, label: 'H' },
            weapon:  { x: 0.05, y: 0.35, label: 'W' },
            chest:   { x: 0.5,  y: 0.30, label: 'C' },
            gloves:  { x: 0.95, y: 0.35, label: 'G' },
            legs:    { x: 0.5,  y: 0.55, label: 'L' },
            ring:    { x: 0.05, y: 0.65, label: 'R' },
            boots:   { x: 0.5,  y: 0.78, label: 'B' },
            amulet:  { x: 0.95, y: 0.65, label: 'A' },
            crystal: { x: 0.95, y: 0.05, label: 'X' },
        };

        const slotSize = Math.max(16, size * 0.2);

        for (const [slot, pos] of Object.entries(slotPositions)) {
            const eqId = equipment[slot];
            const eqData = eqId ? UnitRenderer._getEquipmentData(eqId) : null;
            const rarityColor = eqData ? (RARITY_COLORS[eqData.rarity] || '#555') : '#333';

            const slotEl = document.createElement('div');
            slotEl.style.cssText = `
                position:absolute;
                left:${pos.x * size - slotSize / 2}px;
                top:${pos.y * size - slotSize / 2}px;
                width:${slotSize}px;height:${slotSize}px;
                border-radius:4px;
                background:${eqData ? rarityColor + '33' : 'rgba(60,60,80,0.4)'};
                border:1px solid ${eqData ? rarityColor + '88' : 'rgba(255,255,255,0.1)'};
                display:flex;align-items:center;justify-content:center;
                font-size:${slotSize * 0.4}px;color:${eqData ? '#fff' : '#444'};
                cursor:pointer;
            `;
            slotEl.title = eqData ? `${eqData.equipment_name} (${eqData.rarity})` : `Empty ${slot} slot`;
            slotEl.textContent = pos.label;
            container.appendChild(slotEl);
        }

        return container;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Internal helpers
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get equipment data from ID or object.
     */
    static _getEquipmentData(eqIdOrData) {
        if (!eqIdOrData) return null;
        if (typeof eqIdOrData === 'object') return eqIdOrData;
        return EQUIPMENT.find(e => e.equipment_id === eqIdOrData) || null;
    }

    /**
     * Get the weapon theme sprite sheet path for the given weapon + race.
     */
    static _getWeaponThemePath(weaponData, raceId) {
        if (!weaponData) return '';
        // Use element synergy to pick themed weapon sheet, fallback to default
        const elem = (weaponData.element_synergy || '').toLowerCase();
        if (elem) {
            const key = 'weapon_' + elem;
            const path = assetRegistry.constructor.EQUIPMENT_SLOT_ICONS[key];
            if (path) return path;
        }
        return assetRegistry.getEquipmentIcon(weaponData.equipment_id, 'weapon', weaponData.element_synergy || '');
    }

    /**
     * Guess weapon sub-type from name for sprite sheet cell selection.
     */
    static _guessWeaponType(name) {
        if (!name) return 'default';
        const n = name.toLowerCase();
        if (n.includes('sword') || n.includes('blade')) return 'sword';
        if (n.includes('axe')) return 'axe';
        if (n.includes('staff') || n.includes('wand')) return 'staff';
        if (n.includes('bow')) return 'bow';
        if (n.includes('dagger') || n.includes('knife')) return 'dagger';
        if (n.includes('spear') || n.includes('lance')) return 'spear';
        if (n.includes('mace') || n.includes('hammer')) return 'mace';
        return 'sword';
    }
}

export default UnitRenderer;

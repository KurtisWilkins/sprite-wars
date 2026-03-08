/**
 * BattleAnimationController.js — Canvas-based attack animation system for RTS battles.
 * Ported from Game/Scripts/Battle/BattleAnimationController.gd
 *
 * Drives unit lunge/recoil movement, hit flash, screen shake, and coordinates
 * with the VFX system. Uses tween-style interpolation on unit draw offsets.
 *
 * Cel-Shaded Art Style: clean uniform outlines, flat bold damage numbers with
 * sans-serif font, clean straight motion lines, enhanced squash-stretch (20% more).
 */

import { AttackStyle, getWeaponProfile, getTotalDuration } from '../../data/WeaponAnimationData.js';

// ── Easing Functions ────────────────────────────────────────────────────────
function easeOutQuad(t) { return t * (2 - t); }
function easeInQuad(t) { return t * t; }
function easeOutBack(t) { const c = 1.70158; return 1 + (--t) * t * ((c + 1) * t + c); }
function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
function easeInExpo(t) { return t === 0 ? 0 : Math.pow(2, 10 * (t - 1)); }
function easeOutBounce(t) {
    if (t < 1/2.75) return 7.5625*t*t;
    if (t < 2/2.75) return 7.5625*(t-=1.5/2.75)*t+0.75;
    if (t < 2.5/2.75) return 7.5625*(t-=2.25/2.75)*t+0.9375;
    return 7.5625*(t-=2.625/2.75)*t+0.984375;
}
function easeOutElastic(t) {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
}

// ── Cel-Shaded Art Style Constants ──────────────────────────────────────────
/** Squash-stretch enhancement factor for cartoony cel-shaded feel (20% boost). */
const SQUASH_STRETCH_BOOST = 1.2;
/** Uniform outline width for cel-shaded style. */
const OUTLINE_WIDTH = 2.5;

// ── Animation State ─────────────────────────────────────────────────────────
// Each active animation tracks offsets applied to a unit during rendering.

export class BattleAnimationController {
    constructor() {
        /**
         * Map of unit -> animation state.
         * @type {Map<object, {offsetX: number, offsetY: number, scaleX: number, scaleY: number,
         *   rotation: number, flashColor: string|null, flashAlpha: number, opacity: number,
         *   anims: Array}>}
         */
        this._unitStates = new Map();

        /** Screen shake state. */
        this._shake = { intensity: 0, timer: 0, duration: 0, offsetX: 0, offsetY: 0 };

        /** Active motion lines for cel-shaded trailing effects. */
        this._motionLines = [];

        /** Clean cel-shaded damage number popups. */
        this._damageNumbers = [];
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Get the current visual offsets for a unit.
     * @param {object} unit - RTSUnit
     * @returns {{offsetX: number, offsetY: number, scaleX: number, scaleY: number, rotation: number, flashColor: string|null, flashAlpha: number, opacity: number}}
     */
    getUnitVisuals(unit) {
        const state = this._unitStates.get(unit);
        if (!state) return { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1, rotation: 0, flashColor: null, flashAlpha: 0, opacity: 1 };
        return {
            offsetX: state.offsetX,
            offsetY: state.offsetY,
            scaleX: state.scaleX,
            scaleY: state.scaleY,
            rotation: state.rotation,
            flashColor: state.flashColor,
            flashAlpha: state.flashAlpha,
            opacity: state.opacity,
        };
    }

    /**
     * Get the current screen shake offset.
     * @returns {{x: number, y: number}}
     */
    getShakeOffset() {
        return { x: this._shake.offsetX, y: this._shake.offsetY };
    }

    /**
     * Play a weapon-specific attack animation on a unit.
     * @param {object} attacker - RTSUnit
     * @param {object} target - RTSUnit (nullable)
     * @param {string} weaponType - Weapon name
     * @param {string} element - Element type for VFX
     * @param {import('./BattleVFXSystem.js').BattleVFXSystem} vfxSystem
     * @param {object} field - RTSBattleField for coordinate conversion
     */
    playAttackAnimation(attacker, target, weaponType, element, vfxSystem, field) {
        const profile = getWeaponProfile(weaponType);
        const style = profile.style;
        const totalDur = getTotalDuration(profile);
        const moveDist = profile.move_distance;
        const shake = profile.shake_intensity;
        const hasProjectile = profile.projectile;

        // Direction toward target
        let dirX = 1, dirY = 0;
        if (target) {
            const dx = target.worldPos.x - attacker.worldPos.x;
            const dy = target.worldPos.y - attacker.worldPos.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            dirX = dx / len;
            dirY = dy / len;
        }

        const lungeX = dirX * moveDist;
        const lungeY = dirY * moveDist;

        const state = this._getOrCreateState(attacker);
        const windUp = profile.wind_up;
        const strikeTime = profile.strike;
        const recovery = profile.recovery;

        // Build animation sequence based on style
        const anims = [];

        switch (style) {
            case AttackStyle.SLASH:
                anims.push(...this._buildSlash(lungeX, lungeY, profile.arc_degrees, windUp, strikeTime, recovery));
                break;
            case AttackStyle.THRUST:
                anims.push(...this._buildThrust(lungeX, lungeY, windUp, strikeTime, recovery));
                break;
            case AttackStyle.SMASH:
                anims.push(...this._buildSmash(lungeX, lungeY, windUp, strikeTime, recovery));
                break;
            case AttackStyle.DRAW_RELEASE:
                anims.push(...this._buildDrawRelease(lungeX, lungeY, windUp, strikeTime, recovery));
                break;
            case AttackStyle.THROW:
                anims.push(...this._buildThrow(lungeX, lungeY, windUp, strikeTime, recovery));
                break;
            case AttackStyle.CAST:
                anims.push(...this._buildCast(windUp, strikeTime, recovery, element));
                break;
            case AttackStyle.PUNCH:
                anims.push(...this._buildPunch(lungeX, lungeY, windUp, strikeTime, recovery));
                break;
            case AttackStyle.BLOCK_BASH:
                anims.push(...this._buildBlockBash(lungeX, lungeY, windUp, strikeTime, recovery));
                break;
            case AttackStyle.HOLY_STRIKE:
                anims.push(...this._buildHolyStrike(lungeX, lungeY, windUp, strikeTime, recovery));
                break;
            case AttackStyle.GUNFIRE:
                anims.push(...this._buildGunfire(lungeX, lungeY, windUp, strikeTime, recovery));
                break;
            default:
                anims.push(...this._buildSlash(lungeX, lungeY, 120, windUp, strikeTime, recovery));
                break;
        }

        state.anims = anims;
        state._animTime = 0;
        state._totalDuration = totalDur;

        // Store attacker info for motion lines
        state._attackDir = { x: dirX, y: dirY };
        state._isAttacking = true;

        // Shake on impact
        if (shake > 0) {
            const hitTime = totalDur * profile.hit_frame_pct;
            state._shakeAt = hitTime;
            state._shakeIntensity = shake;
        }

        // VFX on impact
        if (target && vfxSystem && field) {
            const hitTime = totalDur * profile.hit_frame_pct;
            state._vfxAt = hitTime;
            state._vfxTarget = target;
            state._vfxElement = element;
            state._vfxStyle = style;
            state._vfxProjectile = hasProjectile;
            state._vfxField = field;
            state._vfxSystem = vfxSystem;
        }
    }

    /**
     * Play a hit reaction on a unit (flash + shake).
     */
    playHitReaction(unit, damage, isCrit) {
        const state = this._getOrCreateState(unit);
        const duration = 0.25;
        const shakeAmt = isCrit ? 8 : 4;

        state.anims = [
            // Flash red
            { prop: 'flashAlpha', from: 0, to: 1, start: 0, dur: duration * 0.15, ease: easeOutExpo,
              extra: () => { state.flashColor = 'rgba(255, 100, 100, 0.6)'; } },
            { prop: 'flashAlpha', from: 1, to: 0, start: duration * 0.15, dur: duration * 0.35, ease: easeOutQuad },
            // Shake horizontally
            ...this._buildShakeSteps('offsetX', shakeAmt, isCrit ? 6 : 4, duration),
        ];

        if (isCrit) {
            // Squash-stretch enhanced by 20% for cel-shaded feel
            state.anims.push(
                { prop: 'scaleX', from: 1, to: 1.2 * SQUASH_STRETCH_BOOST, start: 0, dur: duration * 0.3, ease: easeOutExpo },
                { prop: 'scaleY', from: 1, to: 0.85 / SQUASH_STRETCH_BOOST, start: 0, dur: duration * 0.3, ease: easeOutExpo },
                { prop: 'scaleX', from: 1.2 * SQUASH_STRETCH_BOOST, to: 1, start: duration * 0.3, dur: duration * 0.7, ease: easeOutElastic },
                { prop: 'scaleY', from: 0.85 / SQUASH_STRETCH_BOOST, to: 1, start: duration * 0.3, dur: duration * 0.7, ease: easeOutElastic },
            );
        }

        state._animTime = 0;
        state._totalDuration = duration;
    }

    /**
     * Play a faint animation (fade + shrink).
     */
    playFaintAnimation(unit) {
        const state = this._getOrCreateState(unit);
        const duration = 0.6;
        state.anims = [
            { prop: 'opacity', from: 1, to: 0, start: 0, dur: duration, ease: easeInQuad },
            { prop: 'scaleX', from: 1, to: 0.5, start: 0, dur: duration, ease: easeInQuad },
            { prop: 'scaleY', from: 1, to: 0.5, start: 0, dur: duration, ease: easeInQuad },
            { prop: 'offsetY', from: 0, to: 20, start: 0, dur: duration, ease: easeInQuad },
        ];
        state._animTime = 0;
        state._totalDuration = duration;
    }

    /**
     * Play a class special animation.
     * @param {object} attacker
     * @param {object} target
     * @param {object} specialData - from ClassSpecialAnimations
     * @param {import('./BattleVFXSystem.js').BattleVFXSystem} vfxSystem
     * @param {object} field
     */
    playClassSpecial(attacker, target, specialData, vfxSystem, field) {
        const state = this._getOrCreateState(attacker);
        const totalDur = specialData.total_duration;
        const preMove = specialData.pre_move;
        const strikeCount = specialData.strike_count;
        const strikeInterval = specialData.strike_interval;
        const hasTeleport = specialData.has_teleport;
        const shake = specialData.shake_intensity;

        let dirX = 1, dirY = 0;
        if (target) {
            const dx = target.worldPos.x - attacker.worldPos.x;
            const dy = target.worldPos.y - attacker.worldPos.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            dirX = dx / len;
            dirY = dy / len;
        }

        const anims = [];

        if (hasTeleport && target) {
            // Assassin teleport: vanish, reposition, strike, return
            const vanishDur = totalDur * 0.2;
            const appearDur = totalDur * 0.15;
            const strikeDur = totalDur * 0.2;
            const returnDur = totalDur * 0.25;

            // Vanish
            anims.push({ prop: 'opacity', from: 1, to: 0, start: 0, dur: vanishDur, ease: easeInExpo });
            anims.push({ prop: 'scaleY', from: 1, to: 1.3 * SQUASH_STRETCH_BOOST, start: 0, dur: vanishDur, ease: easeInQuad });

            // Teleport smoke at vanish point
            if (vfxSystem && field) {
                const scrA = field.worldToScreen(attacker.worldPos.x, attacker.worldPos.y);
                setTimeout(() => vfxSystem.spawnTeleportSmoke(scrA.x, scrA.y), vanishDur * 1000);
            }

            // Jump behind target (offset)
            const behindX = dirX * 24;
            const behindY = dirY * 24;
            anims.push({ prop: 'offsetX', from: 0, to: behindX, start: vanishDur, dur: 0.01, ease: easeOutQuad });
            anims.push({ prop: 'offsetY', from: 0, to: behindY, start: vanishDur, dur: 0.01, ease: easeOutQuad });

            // Appear
            anims.push({ prop: 'opacity', from: 0, to: 1, start: vanishDur, dur: appearDur, ease: easeOutExpo });
            anims.push({ prop: 'scaleX', from: 1, to: 1, start: vanishDur, dur: 0.01, ease: easeOutQuad });
            anims.push({ prop: 'scaleY', from: 1.3 * SQUASH_STRETCH_BOOST, to: 1, start: vanishDur, dur: appearDur, ease: easeOutQuad });

            // Teleport smoke at appear point
            if (vfxSystem && field && target) {
                const scrT = field.worldToScreen(target.worldPos.x + behindX, target.worldPos.y + behindY);
                setTimeout(() => vfxSystem.spawnTeleportSmoke(scrT.x, scrT.y), vanishDur * 1000);
            }

            // Strike lunge
            const strikeStart = vanishDur + appearDur;
            anims.push({ prop: 'offsetX', from: behindX, to: 0, start: strikeStart, dur: strikeDur, ease: easeOutExpo });
            anims.push({ prop: 'offsetY', from: behindY, to: 0, start: strikeStart, dur: strikeDur, ease: easeOutExpo });

            // Return
            const returnStart = strikeStart + strikeDur + 0.05;
            anims.push({ prop: 'opacity', from: 1, to: 0, start: returnStart, dur: returnDur * 0.3, ease: easeInQuad });
            anims.push({ prop: 'offsetX', from: 0, to: 0, start: returnStart + returnDur * 0.3, dur: 0.01, ease: easeOutQuad });
            anims.push({ prop: 'offsetY', from: 0, to: 0, start: returnStart + returnDur * 0.3, dur: 0.01, ease: easeOutQuad });
            anims.push({ prop: 'opacity', from: 0, to: 1, start: returnStart + returnDur * 0.3, dur: returnDur * 0.7, ease: easeOutQuad });

        } else {
            // Standard special: pre-move, multi-strike, return
            const preDur = totalDur * 0.25;
            const moveX = preMove.x * dirX;
            const moveY = preMove.y || 0;

            // Pre-move
            anims.push({ prop: 'offsetX', from: 0, to: moveX, start: 0, dur: preDur, ease: easeOutBack });
            anims.push({ prop: 'offsetY', from: 0, to: moveY, start: 0, dur: preDur, ease: easeOutBack });

            // Multi-strike
            const strikeStart = preDur;
            for (let i = 0; i < strikeCount; i++) {
                const sStart = strikeStart + i * strikeInterval;
                const sLungeX = dirX * 12 + (Math.random() - 0.5) * 6;
                anims.push({ prop: 'offsetX', from: moveX, to: moveX + sLungeX, start: sStart, dur: strikeInterval * 0.4, ease: easeOutExpo });
                anims.push({ prop: 'offsetX', from: moveX + sLungeX, to: moveX, start: sStart + strikeInterval * 0.4, dur: strikeInterval * 0.6, ease: easeInQuad });
            }

            // Return
            const returnStart = totalDur * 0.75;
            const returnDur = totalDur * 0.25;
            anims.push({ prop: 'offsetX', from: moveX, to: 0, start: returnStart, dur: returnDur, ease: easeOutQuad });
            anims.push({ prop: 'offsetY', from: moveY, to: 0, start: returnStart, dur: returnDur, ease: easeOutQuad });
        }

        state.anims = anims;
        state._animTime = 0;
        state._totalDuration = totalDur;
        state._attackDir = { x: dirX, y: dirY };
        state._isAttacking = true;

        // Screen shake on final impact
        if (shake > 0) {
            state._shakeAt = totalDur * 0.7;
            state._shakeIntensity = shake;
        }
    }

    /**
     * Apply screen shake manually.
     */
    applyScreenShake(intensity, duration = 0.2) {
        this._shake.intensity = intensity;
        this._shake.duration = duration;
        this._shake.timer = 0;
    }

    /**
     * Spawn a clean cel-shaded damage number popup.
     * @param {number} x - Screen X position
     * @param {number} y - Screen Y position
     * @param {number} damage - Damage amount to display
     * @param {boolean} [isCrit=false] - Whether this is a critical hit
     * @param {string} [color='#ffffe6'] - Text color
     */
    spawnDamageNumber(x, y, damage, isCrit = false, color = '#ffffe6') {
        this._damageNumbers.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y,
            text: String(Math.round(damage)),
            isCrit: isCrit,
            color: color,
            life: 0.8,
            maxLife: 0.8,
            vx: (Math.random() - 0.5) * 20,
            vy: -60 - Math.random() * 30,
            rotation: (Math.random() - 0.5) * 0.3,
            scale: isCrit ? 1.4 : 1.0,
        });
    }

    // ── Update ──────────────────────────────────────────────────────────────

    /**
     * Update all active animations.
     * @param {number} dt
     */
    update(dt) {
        // Update unit animations
        for (const [unit, state] of this._unitStates) {
            if (!state.anims || state.anims.length === 0) continue;

            state._animTime += dt;
            const t = state._animTime;

            // Spawn motion lines during attack movement
            if (state._isAttacking && state._attackDir) {
                const speed = Math.abs(state.offsetX) + Math.abs(state.offsetY);
                if (speed > 2) {
                    this._spawnMotionLine(unit, state);
                }
            }

            // Process animation keyframes
            for (const anim of state.anims) {
                if (t >= anim.start && t < anim.start + anim.dur) {
                    const localT = (t - anim.start) / anim.dur;
                    const easedT = anim.ease ? anim.ease(localT) : localT;
                    state[anim.prop] = anim.from + (anim.to - anim.from) * easedT;
                    if (anim.extra && localT < 0.05) anim.extra();
                } else if (t >= anim.start + anim.dur) {
                    state[anim.prop] = anim.to;
                }
            }

            // Trigger screen shake at hit time
            if (state._shakeAt != null && t >= state._shakeAt) {
                this.applyScreenShake(state._shakeIntensity, 0.2);
                state._shakeAt = null;
            }

            // Trigger VFX at hit time
            if (state._vfxAt != null && t >= state._vfxAt) {
                const tgt = state._vfxTarget;
                const sys = state._vfxSystem;
                const fld = state._vfxField;
                if (tgt && sys && fld) {
                    const scr = fld.worldToScreen(tgt.worldPos.x, tgt.worldPos.y);
                    if (state._vfxProjectile) {
                        sys.spawnProjectileImpact(scr.x, scr.y - 24, state._vfxElement);
                    } else {
                        sys.spawnHitImpact(scr.x, scr.y - 24, state._vfxElement, state._vfxStyle);
                    }
                }
                state._vfxAt = null;
            }

            // Clean up finished animations
            if (t >= state._totalDuration) {
                state.offsetX = 0;
                state.offsetY = 0;
                state.scaleX = 1;
                state.scaleY = 1;
                state.rotation = 0;
                state.flashColor = null;
                state.flashAlpha = 0;
                state._isAttacking = false;
                state._attackDir = null;
                // Reset opacity for non-faint animations (faint ends at opacity 0)
                if (state.opacity > 0) {
                    state.opacity = 1;
                }
                state.anims = [];
            }
        }

        // Update screen shake
        if (this._shake.timer < this._shake.duration) {
            this._shake.timer += dt;
            const remaining = 1 - this._shake.timer / this._shake.duration;
            this._shake.offsetX = (Math.random() - 0.5) * this._shake.intensity * 12 * remaining;
            this._shake.offsetY = (Math.random() - 0.5) * this._shake.intensity * 12 * remaining;
        } else {
            this._shake.offsetX = 0;
            this._shake.offsetY = 0;
        }

        // Update motion lines
        for (let i = this._motionLines.length - 1; i >= 0; i--) {
            this._motionLines[i].life -= dt;
            if (this._motionLines[i].life <= 0) {
                this._motionLines.splice(i, 1);
            }
        }

        // Update damage numbers
        for (let i = this._damageNumbers.length - 1; i >= 0; i--) {
            const dn = this._damageNumbers[i];
            dn.life -= dt;
            if (dn.life <= 0) {
                this._damageNumbers.splice(i, 1);
                continue;
            }
            dn.x += dn.vx * dt;
            dn.y += dn.vy * dt;
            dn.vy += 80 * dt; // gravity
        }
    }

    /**
     * Render cel-shaded overlays (motion lines, damage numbers).
     * Call after rendering units.
     * @param {CanvasRenderingContext2D} ctx
     */
    renderDoodleOverlays(ctx) {
        // Render motion lines
        this._renderMotionLines(ctx);
        // Render damage numbers
        this._renderDamageNumbers(ctx);
    }

    clear() {
        this._unitStates.clear();
        this._shake = { intensity: 0, timer: 0, duration: 0, offsetX: 0, offsetY: 0 };
        this._motionLines = [];
        this._damageNumbers = [];
    }

    // ── Motion Lines ────────────────────────────────────────────────────────

    /**
     * Spawn clean straight parallel lines trailing behind a moving sprite.
     */
    _spawnMotionLine(unit, state) {
        if (!unit.worldPos) return;
        const dir = state._attackDir;
        if (!dir) return;

        // Only spawn every few frames (throttle)
        if (Math.random() > 0.3) return;

        const perpX = -dir.y;
        const perpY = dir.x;
        const count = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < count; i++) {
            const spread = (i - count / 2) * 4;
            const baseX = (unit.worldPos.x || 0) + state.offsetX - dir.x * 8;
            const baseY = (unit.worldPos.y || 0) + state.offsetY - dir.y * 8;
            const lineLen = 6 + Math.random() * 8;
            this._motionLines.push({
                x1: baseX + perpX * spread,
                y1: baseY + perpY * spread,
                x2: baseX + perpX * spread - dir.x * lineLen,
                y2: baseY + perpY * spread - dir.y * lineLen,
                life: 0.15 + Math.random() * 0.1,
                maxLife: 0.15 + Math.random() * 0.1,
            });
        }
    }

    /**
     * Render motion lines with clean straight cel-shaded style.
     * @param {CanvasRenderingContext2D} ctx
     */
    _renderMotionLines(ctx) {
        if (this._motionLines.length === 0) return;

        ctx.save();
        ctx.strokeStyle = '#1a1414';
        ctx.lineWidth = OUTLINE_WIDTH;
        ctx.lineCap = 'round';

        for (const ml of this._motionLines) {
            const alpha = ml.life / ml.maxLife;
            ctx.globalAlpha = alpha * 0.6;
            ctx.beginPath();
            // Clean straight parallel line
            ctx.moveTo(ml.x1, ml.y1);
            ctx.lineTo(ml.x2, ml.y2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Render clean cel-shaded damage numbers with uniform black outline.
     * @param {CanvasRenderingContext2D} ctx
     */
    _renderDamageNumbers(ctx) {
        if (this._damageNumbers.length === 0) return;

        for (const dn of this._damageNumbers) {
            const alpha = Math.min(1, dn.life / (dn.maxLife * 0.3));

            ctx.save();
            ctx.translate(dn.x, dn.y);
            ctx.rotate(dn.rotation);
            ctx.scale(dn.scale, dn.scale);
            ctx.globalAlpha = alpha;

            const fontSize = dn.isCrit ? 18 : 14;
            ctx.font = `bold ${fontSize}px 'Arial Black', 'Arial', 'Helvetica', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Clean uniform black outline (single stroke, no wobble)
            ctx.strokeStyle = '#1a1414';
            ctx.lineWidth = 3.5;
            ctx.lineJoin = 'round';
            ctx.strokeText(dn.text, 0, 0);

            // Fill text with solid color
            ctx.fillStyle = dn.color;
            ctx.fillText(dn.text, 0, 0);

            // Clean geometric star accents for crits
            if (dn.isCrit) {
                ctx.globalAlpha = alpha * 0.6;
                for (let i = 0; i < 3; i++) {
                    const starAngle = (Math.PI * 2 * i) / 3 + dn.rotation;
                    const starDist = fontSize * 0.8;
                    const sx = Math.cos(starAngle) * starDist;
                    const sy = Math.sin(starAngle) * starDist;

                    // Clean four-pointed star
                    ctx.beginPath();
                    for (let j = 0; j < 8; j++) {
                        const a = (Math.PI * 2 * j) / 8;
                        const r = j % 2 === 0 ? 3 : 1.5;
                        const px = sx + Math.cos(a) * r;
                        const py = sy + Math.sin(a) * r;
                        if (j === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fillStyle = dn.color;
                    ctx.fill();
                    ctx.strokeStyle = '#1a1414';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }

            ctx.restore();
        }
    }

    // ── Animation Builders ──────────────────────────────────────────────────

    _buildSlash(lx, ly, arcDeg, windUp, strike, recovery) {
        const halfArc = (arcDeg / 2) * Math.PI / 180;
        return [
            { prop: 'offsetX', from: 0, to: -lx * 0.2, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetY', from: 0, to: -ly * 0.2, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'rotation', from: 0, to: -halfArc, start: 0, dur: windUp, ease: easeOutQuad },
            // Enhanced squash-stretch on wind-up (cel-shaded 20% boost)
            { prop: 'scaleX', from: 1, to: 1 - 0.06 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleY', from: 1, to: 1 + 0.08 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetX', from: -lx * 0.2, to: lx, start: windUp, dur: strike, ease: easeOutBack },
            { prop: 'offsetY', from: -ly * 0.2, to: ly, start: windUp, dur: strike, ease: easeOutBack },
            { prop: 'rotation', from: -halfArc, to: halfArc, start: windUp, dur: strike, ease: easeInQuad },
            { prop: 'scaleX', from: 1 - 0.06 * SQUASH_STRETCH_BOOST, to: 1 + 0.08 * SQUASH_STRETCH_BOOST, start: windUp, dur: strike, ease: easeOutBack },
            { prop: 'scaleY', from: 1 + 0.08 * SQUASH_STRETCH_BOOST, to: 1 - 0.06 * SQUASH_STRETCH_BOOST, start: windUp, dur: strike, ease: easeOutBack },
            { prop: 'offsetX', from: lx, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'offsetY', from: ly, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'rotation', from: halfArc, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'scaleX', from: 1 + 0.08 * SQUASH_STRETCH_BOOST, to: 1, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'scaleY', from: 1 - 0.06 * SQUASH_STRETCH_BOOST, to: 1, start: windUp + strike, dur: recovery, ease: easeOutQuad },
        ];
    }

    _buildThrust(lx, ly, windUp, strike, recovery) {
        return [
            { prop: 'offsetX', from: 0, to: -lx * 0.3, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetY', from: 0, to: -ly * 0.3, start: 0, dur: windUp, ease: easeOutQuad },
            // Squash on wind-up
            { prop: 'scaleX', from: 1, to: 1 + 0.06 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleY', from: 1, to: 1 - 0.06 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetX', from: -lx * 0.3, to: lx, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'offsetY', from: -ly * 0.3, to: ly, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'scaleX', from: 1 + 0.06 * SQUASH_STRETCH_BOOST, to: 1, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'scaleY', from: 1 - 0.06 * SQUASH_STRETCH_BOOST, to: 1, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'offsetX', from: lx, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'offsetY', from: ly, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
        ];
    }

    _buildSmash(lx, ly, windUp, strike, recovery) {
        return [
            { prop: 'offsetY', from: 0, to: -20, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleX', from: 1, to: 0.9 / SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleY', from: 1, to: 1.15 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetX', from: 0, to: lx, start: windUp, dur: strike, ease: easeInExpo },
            { prop: 'offsetY', from: -20, to: ly + 8, start: windUp, dur: strike, ease: easeInExpo },
            { prop: 'scaleX', from: 0.9 / SQUASH_STRETCH_BOOST, to: 1.15 * SQUASH_STRETCH_BOOST, start: windUp, dur: strike, ease: easeInExpo },
            { prop: 'scaleY', from: 1.15 * SQUASH_STRETCH_BOOST, to: 0.85 / SQUASH_STRETCH_BOOST, start: windUp, dur: strike, ease: easeInExpo },
            { prop: 'offsetX', from: lx, to: 0, start: windUp + strike, dur: recovery, ease: easeOutElastic },
            { prop: 'offsetY', from: ly + 8, to: 0, start: windUp + strike, dur: recovery, ease: easeOutElastic },
            { prop: 'scaleX', from: 1.15 * SQUASH_STRETCH_BOOST, to: 1, start: windUp + strike, dur: recovery, ease: easeOutElastic },
            { prop: 'scaleY', from: 0.85 / SQUASH_STRETCH_BOOST, to: 1, start: windUp + strike, dur: recovery, ease: easeOutElastic },
        ];
    }

    _buildDrawRelease(lx, ly, windUp, strike, recovery) {
        return [
            { prop: 'offsetX', from: 0, to: lx, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleX', from: 1, to: 1.08 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleY', from: 1, to: 0.95 / SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetX', from: lx, to: -lx * 0.3, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'scaleX', from: 1.08 * SQUASH_STRETCH_BOOST, to: 0.95, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'scaleY', from: 0.95 / SQUASH_STRETCH_BOOST, to: 1.05, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'offsetX', from: -lx * 0.3, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'scaleX', from: 0.95, to: 1, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'scaleY', from: 1.05, to: 1, start: windUp + strike, dur: recovery, ease: easeOutQuad },
        ];
    }

    _buildThrow(lx, ly, windUp, strike, recovery) {
        return [
            { prop: 'offsetX', from: 0, to: -lx * 0.2, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'rotation', from: 0, to: -0.26, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetX', from: -lx * 0.2, to: lx * 0.6, start: windUp, dur: strike, ease: easeOutBack },
            { prop: 'rotation', from: -0.26, to: 0.17, start: windUp, dur: strike, ease: easeInQuad },
            { prop: 'offsetX', from: lx * 0.6, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'rotation', from: 0.17, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
        ];
    }

    _buildCast(windUp, strike, recovery, element) {
        return [
            { prop: 'offsetY', from: 0, to: -12, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleX', from: 1, to: 1.1 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleY', from: 1, to: 1.1 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleX', from: 1.1 * SQUASH_STRETCH_BOOST, to: 1.2 * SQUASH_STRETCH_BOOST, start: windUp, dur: strike * 0.3, ease: easeOutExpo },
            { prop: 'scaleY', from: 1.1 * SQUASH_STRETCH_BOOST, to: 1.2 * SQUASH_STRETCH_BOOST, start: windUp, dur: strike * 0.3, ease: easeOutExpo },
            { prop: 'scaleX', from: 1.2 * SQUASH_STRETCH_BOOST, to: 1, start: windUp + strike * 0.3, dur: strike * 0.7, ease: easeInQuad },
            { prop: 'scaleY', from: 1.2 * SQUASH_STRETCH_BOOST, to: 1, start: windUp + strike * 0.3, dur: strike * 0.7, ease: easeInQuad },
            { prop: 'offsetY', from: -12, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
        ];
    }

    _buildPunch(lx, ly, windUp, strike, recovery) {
        return [
            { prop: 'offsetX', from: 0, to: -lx * 0.1, start: 0, dur: windUp, ease: easeOutQuad },
            // Squash-stretch on punch wind-up
            { prop: 'scaleX', from: 1, to: 1 - 0.08 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleY', from: 1, to: 1 + 0.1 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetX', from: -lx * 0.1, to: lx, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'offsetY', from: 0, to: ly, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'scaleX', from: 1 - 0.08 * SQUASH_STRETCH_BOOST, to: 1 + 0.1 * SQUASH_STRETCH_BOOST, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'scaleY', from: 1 + 0.1 * SQUASH_STRETCH_BOOST, to: 1 - 0.08 * SQUASH_STRETCH_BOOST, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'offsetX', from: lx, to: 0, start: windUp + strike, dur: recovery, ease: easeOutBounce },
            { prop: 'offsetY', from: ly, to: 0, start: windUp + strike, dur: recovery, ease: easeOutBounce },
            { prop: 'scaleX', from: 1 + 0.1 * SQUASH_STRETCH_BOOST, to: 1, start: windUp + strike, dur: recovery, ease: easeOutBounce },
            { prop: 'scaleY', from: 1 - 0.08 * SQUASH_STRETCH_BOOST, to: 1, start: windUp + strike, dur: recovery, ease: easeOutBounce },
        ];
    }

    _buildBlockBash(lx, ly, windUp, strike, recovery) {
        return [
            { prop: 'scaleX', from: 1, to: 1.15 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleY', from: 1, to: 0.95 / SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetX', from: 0, to: -lx * 0.1, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetX', from: -lx * 0.1, to: lx, start: windUp, dur: strike, ease: easeOutBack },
            { prop: 'offsetY', from: 0, to: ly, start: windUp, dur: strike, ease: easeOutBack },
            { prop: 'scaleX', from: 1.15 * SQUASH_STRETCH_BOOST, to: 1, start: windUp, dur: strike, ease: easeOutQuad },
            { prop: 'scaleY', from: 0.95 / SQUASH_STRETCH_BOOST, to: 1.05, start: windUp, dur: strike, ease: easeOutQuad },
            { prop: 'offsetX', from: lx, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'offsetY', from: ly, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'scaleX', from: 1, to: 1, start: windUp + strike, dur: recovery, ease: easeOutQuad },
            { prop: 'scaleY', from: 1.05, to: 1, start: windUp + strike, dur: recovery, ease: easeOutQuad },
        ];
    }

    _buildHolyStrike(lx, ly, windUp, strike, recovery) {
        return [
            { prop: 'offsetY', from: 0, to: -24, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleX', from: 1, to: 1.1 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'scaleY', from: 1, to: 1.15 * SQUASH_STRETCH_BOOST, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetX', from: 0, to: lx, start: windUp, dur: strike, ease: easeInExpo },
            { prop: 'offsetY', from: -24, to: ly, start: windUp, dur: strike, ease: easeInExpo },
            { prop: 'scaleX', from: 1.1 * SQUASH_STRETCH_BOOST, to: 1.15 * SQUASH_STRETCH_BOOST, start: windUp, dur: strike, ease: easeInExpo },
            { prop: 'scaleY', from: 1.15 * SQUASH_STRETCH_BOOST, to: 0.9 / SQUASH_STRETCH_BOOST, start: windUp, dur: strike, ease: easeInExpo },
            { prop: 'offsetX', from: lx, to: 0, start: windUp + strike, dur: recovery, ease: easeOutElastic },
            { prop: 'offsetY', from: ly, to: 0, start: windUp + strike, dur: recovery, ease: easeOutElastic },
            { prop: 'scaleX', from: 1.15 * SQUASH_STRETCH_BOOST, to: 1, start: windUp + strike, dur: recovery, ease: easeOutElastic },
            { prop: 'scaleY', from: 0.9 / SQUASH_STRETCH_BOOST, to: 1, start: windUp + strike, dur: recovery, ease: easeOutElastic },
        ];
    }

    _buildGunfire(lx, ly, windUp, strike, recovery) {
        return [
            { prop: 'offsetX', from: 0, to: -lx * 0.15, start: 0, dur: windUp, ease: easeOutQuad },
            { prop: 'offsetX', from: -lx * 0.15, to: lx, start: windUp, dur: strike, ease: easeOutExpo },
            { prop: 'flashAlpha', from: 0, to: 0.6, start: windUp, dur: strike * 0.5, ease: easeOutExpo,
              extra: () => { } },
            { prop: 'flashAlpha', from: 0.6, to: 0, start: windUp + strike * 0.5, dur: strike * 0.5, ease: easeInQuad },
            { prop: 'offsetX', from: lx, to: 0, start: windUp + strike, dur: recovery, ease: easeOutQuad },
        ];
    }

    _buildShakeSteps(prop, amount, steps, duration) {
        const anims = [];
        const stepDur = duration / steps;
        for (let i = 0; i < steps; i++) {
            const offset = amount * (i % 2 === 0 ? 1 : -1) * (1 - i / steps);
            anims.push({ prop, from: i === 0 ? 0 : undefined, to: offset, start: i * stepDur, dur: stepDur, ease: easeOutQuad });
        }
        anims.push({ prop, from: undefined, to: 0, start: duration - stepDur * 0.5, dur: stepDur * 0.5, ease: easeOutQuad });
        return anims;
    }

    // ── Internal ────────────────────────────────────────────────────────────

    _getOrCreateState(unit) {
        if (!this._unitStates.has(unit)) {
            this._unitStates.set(unit, {
                offsetX: 0, offsetY: 0,
                scaleX: 1, scaleY: 1,
                rotation: 0,
                flashColor: null, flashAlpha: 0,
                opacity: 1,
                anims: [],
                _animTime: 0, _totalDuration: 0,
                _shakeAt: null, _shakeIntensity: 0,
                _vfxAt: null,
                _isAttacking: false,
                _attackDir: null,
            });
        }
        return this._unitStates.get(unit);
    }
}

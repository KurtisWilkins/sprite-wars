/**
 * AssassinTeleportSystem.js — Teleport mechanics for Assassin-class units in RTS battles.
 * Ported from Game/Scripts/Battle/AssassinTeleportSystem.gd
 *
 * When an Assassin attacks, they can teleport behind the target for bonus damage
 * and increased critical hit chance.
 */

// ── Constants ───────────────────────────────────────────────────────────────
export const TELEPORT_CRIT_BONUS = 0.25;
export const BACKSTAB_DAMAGE_MULTIPLIER = 1.3;
const TELEPORT_CLASS_TYPES = new Set(['Assassin']);

/**
 * Check if a unit can perform a teleport strike in RTS mode.
 * @param {import('./RTSUnit.js').RTSUnit} unit
 * @returns {boolean}
 */
export function canTeleport(unit) {
    if (!unit || !unit.isAlive) return false;
    return TELEPORT_CLASS_TYPES.has(unit.classType);
}

/**
 * Execute teleport repositioning for an RTS unit.
 * Moves the attacker behind the target.
 * @param {import('./RTSUnit.js').RTSUnit} attacker
 * @param {import('./RTSUnit.js').RTSUnit} target
 * @returns {{success: boolean, fromX: number, fromY: number, toX: number, toY: number, critBonus: number, damageMult: number}}
 */
export function executeTeleport(attacker, target) {
    const result = {
        success: false,
        fromX: attacker.worldPos.x,
        fromY: attacker.worldPos.y,
        toX: attacker.worldPos.x,
        toY: attacker.worldPos.y,
        critBonus: 0,
        damageMult: 1.0,
    };

    if (!target || !target.isAlive) return result;

    // Calculate "behind" direction
    const dx = target.worldPos.x - attacker.worldPos.x;
    const dy = target.worldPos.y - attacker.worldPos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return result;

    const dirX = dx / len;
    const dirY = dy / len;

    // Teleport behind target (24px past target position)
    const behindX = target.worldPos.x + dirX * 24;
    const behindY = target.worldPos.y + dirY * 24;

    // Move the attacker
    result.success = true;
    result.fromX = attacker.worldPos.x;
    result.fromY = attacker.worldPos.y;
    result.toX = behindX;
    result.toY = behindY;
    result.critBonus = TELEPORT_CRIT_BONUS;
    result.damageMult = BACKSTAB_DAMAGE_MULTIPLIER;

    // Actually move the unit
    attacker.worldPos.x = behindX;
    attacker.worldPos.y = behindY;

    return result;
}

/**
 * Get teleport description for battle log.
 * @param {string} name
 * @returns {string}
 */
export function getTeleportDescription(name) {
    return `${name} vanishes into shadow and reappears behind the target!`;
}

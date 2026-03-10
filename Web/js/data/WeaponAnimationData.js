/**
 * WeaponAnimationData.js — Maps weapon types to attack animation profiles.
 * Ported from Game/Data/Animations/WeaponAnimationData.gd
 *
 * Each profile defines how a weapon visually performs its attack:
 *   style:         AttackStyle enum value
 *   wind_up:       Seconds for anticipation phase
 *   strike:        Seconds for the strike motion
 *   recovery:      Seconds returning to idle
 *   move_distance: Pixels the unit lunges forward (negative = recoil)
 *   arc_degrees:   Rotation arc for swing-type attacks
 *   shake_intensity: Screen shake on impact (0.0-1.0)
 *   projectile:    Whether this spawns a visible projectile
 *   hit_frame_pct: When damage applies (0.0-1.0 through total duration)
 */

// ── Attack Style Enum ───────────────────────────────────────────────────────
export const AttackStyle = {
    SLASH:        0,
    THRUST:       1,
    SMASH:        2,
    DRAW_RELEASE: 3,
    THROW:        4,
    CAST:         5,
    PUNCH:        6,
    BLOCK_BASH:   7,
    HOLY_STRIKE:  8,
    GUNFIRE:      9,
};

// ── Weapon Animation Profiles ───────────────────────────────────────────────
export const WEAPON_PROFILES = {
    // ── Slash Weapons ──
    sword:      { style: AttackStyle.SLASH, wind_up: 0.12, strike: 0.15, recovery: 0.15, move_distance: 16, arc_degrees: 120, shake_intensity: 0.3, projectile: false, hit_frame_pct: 0.55 },
    longsword:  { style: AttackStyle.SLASH, wind_up: 0.15, strike: 0.18, recovery: 0.17, move_distance: 20, arc_degrees: 140, shake_intensity: 0.4, projectile: false, hit_frame_pct: 0.55 },
    greatsword: { style: AttackStyle.SLASH, wind_up: 0.20, strike: 0.20, recovery: 0.20, move_distance: 24, arc_degrees: 160, shake_intensity: 0.5, projectile: false, hit_frame_pct: 0.55 },
    shortsword: { style: AttackStyle.SLASH, wind_up: 0.08, strike: 0.10, recovery: 0.12, move_distance: 12, arc_degrees: 90,  shake_intensity: 0.2, projectile: false, hit_frame_pct: 0.50 },
    axe:        { style: AttackStyle.SLASH, wind_up: 0.18, strike: 0.15, recovery: 0.17, move_distance: 18, arc_degrees: 150, shake_intensity: 0.5, projectile: false, hit_frame_pct: 0.55 },

    // ── Thrust Weapons ──
    spear:        { style: AttackStyle.THRUST, wind_up: 0.12, strike: 0.12, recovery: 0.16, move_distance: 24, arc_degrees: 0, shake_intensity: 0.25, projectile: false, hit_frame_pct: 0.55 },
    halberd:      { style: AttackStyle.THRUST, wind_up: 0.16, strike: 0.14, recovery: 0.18, move_distance: 28, arc_degrees: 0, shake_intensity: 0.35, projectile: false, hit_frame_pct: 0.55 },
    lance:        { style: AttackStyle.THRUST, wind_up: 0.14, strike: 0.10, recovery: 0.16, move_distance: 30, arc_degrees: 0, shake_intensity: 0.3,  projectile: false, hit_frame_pct: 0.50 },
    dagger:       { style: AttackStyle.THRUST, wind_up: 0.06, strike: 0.08, recovery: 0.10, move_distance: 14, arc_degrees: 0, shake_intensity: 0.15, projectile: false, hit_frame_pct: 0.45 },
    poison_blade: { style: AttackStyle.THRUST, wind_up: 0.08, strike: 0.10, recovery: 0.12, move_distance: 14, arc_degrees: 0, shake_intensity: 0.2,  projectile: false, hit_frame_pct: 0.50 },

    // ── Smash Weapons ──
    mace:          { style: AttackStyle.SMASH, wind_up: 0.16, strike: 0.14, recovery: 0.18, move_distance: 14, arc_degrees: 0, shake_intensity: 0.5,  projectile: false, hit_frame_pct: 0.55 },
    holy_mace:     { style: AttackStyle.HOLY_STRIKE, wind_up: 0.18, strike: 0.16, recovery: 0.18, move_distance: 14, arc_degrees: 0, shake_intensity: 0.45, projectile: false, hit_frame_pct: 0.55 },
    warhammer:     { style: AttackStyle.SMASH, wind_up: 0.22, strike: 0.16, recovery: 0.22, move_distance: 16, arc_degrees: 0, shake_intensity: 0.65, projectile: false, hit_frame_pct: 0.60 },
    flail:         { style: AttackStyle.SMASH, wind_up: 0.20, strike: 0.18, recovery: 0.20, move_distance: 18, arc_degrees: 0, shake_intensity: 0.55, projectile: false, hit_frame_pct: 0.55 },
    maul:          { style: AttackStyle.SMASH, wind_up: 0.25, strike: 0.18, recovery: 0.25, move_distance: 20, arc_degrees: 0, shake_intensity: 0.7,  projectile: false, hit_frame_pct: 0.60 },
    siege_hammer:  { style: AttackStyle.SMASH, wind_up: 0.28, strike: 0.20, recovery: 0.28, move_distance: 22, arc_degrees: 0, shake_intensity: 0.8,  projectile: false, hit_frame_pct: 0.60 },
    battering_ram: { style: AttackStyle.SMASH, wind_up: 0.30, strike: 0.22, recovery: 0.30, move_distance: 30, arc_degrees: 0, shake_intensity: 0.9,  projectile: false, hit_frame_pct: 0.60 },

    // ── Draw & Release Weapons ──
    bow:            { style: AttackStyle.DRAW_RELEASE, wind_up: 0.25, strike: 0.08, recovery: 0.15, move_distance: -4,  arc_degrees: 0, shake_intensity: 0.1,  projectile: true, hit_frame_pct: 0.55 },
    shortbow:       { style: AttackStyle.DRAW_RELEASE, wind_up: 0.18, strike: 0.06, recovery: 0.12, move_distance: -3,  arc_degrees: 0, shake_intensity: 0.08, projectile: true, hit_frame_pct: 0.50 },
    longbow:        { style: AttackStyle.DRAW_RELEASE, wind_up: 0.30, strike: 0.08, recovery: 0.18, move_distance: -6,  arc_degrees: 0, shake_intensity: 0.12, projectile: true, hit_frame_pct: 0.58 },
    crossbow:       { style: AttackStyle.DRAW_RELEASE, wind_up: 0.20, strike: 0.05, recovery: 0.20, move_distance: -2,  arc_degrees: 0, shake_intensity: 0.15, projectile: true, hit_frame_pct: 0.50 },
    heavy_crossbow: { style: AttackStyle.DRAW_RELEASE, wind_up: 0.28, strike: 0.06, recovery: 0.25, move_distance: -3,  arc_degrees: 0, shake_intensity: 0.2,  projectile: true, hit_frame_pct: 0.55 },
    repeater:       { style: AttackStyle.DRAW_RELEASE, wind_up: 0.10, strike: 0.04, recovery: 0.10, move_distance: -2,  arc_degrees: 0, shake_intensity: 0.1,  projectile: true, hit_frame_pct: 0.45 },

    // ── Throw Weapons ──
    javelin:        { style: AttackStyle.THROW, wind_up: 0.20, strike: 0.10, recovery: 0.15, move_distance: 12, arc_degrees: 0, shake_intensity: 0.2,  projectile: true, hit_frame_pct: 0.55 },
    throwing_spear: { style: AttackStyle.THROW, wind_up: 0.22, strike: 0.10, recovery: 0.16, move_distance: 14, arc_degrees: 0, shake_intensity: 0.25, projectile: true, hit_frame_pct: 0.55 },
    pilum:          { style: AttackStyle.THROW, wind_up: 0.24, strike: 0.12, recovery: 0.18, move_distance: 16, arc_degrees: 0, shake_intensity: 0.3,  projectile: true, hit_frame_pct: 0.55 },
    flask:          { style: AttackStyle.THROW, wind_up: 0.15, strike: 0.12, recovery: 0.15, move_distance: 8,  arc_degrees: 0, shake_intensity: 0.15, projectile: true, hit_frame_pct: 0.50 },
    mortar:         { style: AttackStyle.THROW, wind_up: 0.20, strike: 0.15, recovery: 0.18, move_distance: 6,  arc_degrees: 0, shake_intensity: 0.35, projectile: true, hit_frame_pct: 0.55 },

    // ── Cast Weapons ──
    staff:       { style: AttackStyle.CAST, wind_up: 0.20, strike: 0.15, recovery: 0.15, move_distance: 0, arc_degrees: 0, shake_intensity: 0.15, projectile: false, hit_frame_pct: 0.55 },
    wand:        { style: AttackStyle.CAST, wind_up: 0.15, strike: 0.12, recovery: 0.13, move_distance: 0, arc_degrees: 0, shake_intensity: 0.12, projectile: false, hit_frame_pct: 0.50 },
    orb:         { style: AttackStyle.CAST, wind_up: 0.22, strike: 0.18, recovery: 0.15, move_distance: 0, arc_degrees: 0, shake_intensity: 0.2,  projectile: false, hit_frame_pct: 0.55 },
    tome:        { style: AttackStyle.CAST, wind_up: 0.25, strike: 0.18, recovery: 0.17, move_distance: 0, arc_degrees: 0, shake_intensity: 0.18, projectile: false, hit_frame_pct: 0.58 },
    holy_symbol: { style: AttackStyle.CAST, wind_up: 0.22, strike: 0.16, recovery: 0.15, move_distance: 0, arc_degrees: 0, shake_intensity: 0.15, projectile: false, hit_frame_pct: 0.55 },
    relic:       { style: AttackStyle.CAST, wind_up: 0.25, strike: 0.20, recovery: 0.18, move_distance: 0, arc_degrees: 0, shake_intensity: 0.2,  projectile: false, hit_frame_pct: 0.58 },
    chalice:     { style: AttackStyle.CAST, wind_up: 0.22, strike: 0.18, recovery: 0.16, move_distance: 0, arc_degrees: 0, shake_intensity: 0.15, projectile: false, hit_frame_pct: 0.55 },
    scepter:     { style: AttackStyle.CAST, wind_up: 0.20, strike: 0.15, recovery: 0.15, move_distance: 0, arc_degrees: 0, shake_intensity: 0.15, projectile: false, hit_frame_pct: 0.55 },

    // ── Punch Weapons ──
    fist:     { style: AttackStyle.PUNCH, wind_up: 0.06, strike: 0.06, recovery: 0.08, move_distance: 16, arc_degrees: 0, shake_intensity: 0.25, projectile: false, hit_frame_pct: 0.45 },
    bo_staff: { style: AttackStyle.PUNCH, wind_up: 0.10, strike: 0.08, recovery: 0.10, move_distance: 18, arc_degrees: 0, shake_intensity: 0.3,  projectile: false, hit_frame_pct: 0.50 },
    nunchaku: { style: AttackStyle.PUNCH, wind_up: 0.08, strike: 0.06, recovery: 0.08, move_distance: 14, arc_degrees: 0, shake_intensity: 0.2,  projectile: false, hit_frame_pct: 0.45 },

    // ── Shield Weapons ──
    shield:       { style: AttackStyle.BLOCK_BASH, wind_up: 0.14, strike: 0.12, recovery: 0.14, move_distance: 16, arc_degrees: 0, shake_intensity: 0.4,  projectile: false, hit_frame_pct: 0.50 },
    tower_shield: { style: AttackStyle.BLOCK_BASH, wind_up: 0.18, strike: 0.14, recovery: 0.18, move_distance: 18, arc_degrees: 0, shake_intensity: 0.55, projectile: false, hit_frame_pct: 0.55 },

    // ── Gunfire Weapons ──
    pistol:      { style: AttackStyle.GUNFIRE, wind_up: 0.12, strike: 0.04, recovery: 0.18, move_distance: -6,  arc_degrees: 0, shake_intensity: 0.35, projectile: true, hit_frame_pct: 0.45 },
    musket:      { style: AttackStyle.GUNFIRE, wind_up: 0.20, strike: 0.04, recovery: 0.25, move_distance: -10, arc_degrees: 0, shake_intensity: 0.5,  projectile: true, hit_frame_pct: 0.48 },
    blunderbuss: { style: AttackStyle.GUNFIRE, wind_up: 0.22, strike: 0.05, recovery: 0.28, move_distance: -12, arc_degrees: 0, shake_intensity: 0.6,  projectile: true, hit_frame_pct: 0.48 },
};

/**
 * Get the animation profile for a weapon type. Falls back to sword if unknown.
 * @param {string} weaponType
 * @returns {object}
 */
export function getWeaponProfile(weaponType) {
    return WEAPON_PROFILES[weaponType] || WEAPON_PROFILES.sword;
}

/**
 * Get the total animation duration for a weapon profile.
 * @param {object} profile
 * @returns {number}
 */
export function getTotalDuration(profile) {
    return (profile.wind_up || 0.12) + (profile.strike || 0.12) + (profile.recovery || 0.15);
}

/**
 * Get the time in seconds when the hit frame occurs.
 * @param {object} profile
 * @returns {number}
 */
export function getHitTime(profile) {
    return getTotalDuration(profile) * (profile.hit_frame_pct || 0.55);
}

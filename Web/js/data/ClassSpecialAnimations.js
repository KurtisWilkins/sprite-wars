/**
 * ClassSpecialAnimations.js — Unique special attack animations per class.
 * Ported from Game/Data/Animations/ClassSpecialAnimations.gd
 *
 * Each class has a signature move with unique visual flourishes,
 * movement patterns, and VFX cues.
 */

export const CLASS_SPECIALS = {
    Barbarian: {
        description: 'Berserker Rush — Rapid multi-slash frenzy',
        pre_move: { x: 32, y: 0 },
        strike_count: 3,
        strike_interval: 0.12,
        total_duration: 0.85,
        vfx_style: 'slash_flurry',
        shake_intensity: 0.6,
        flash_color: 'rgba(255, 77, 26, 0.4)',
        has_teleport: false,
    },
    Fighter: {
        description: 'Shield Wall — Brace, then powerful counter-strike',
        pre_move: { x: 8, y: 0 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 0.70,
        vfx_style: 'shield_flash',
        shake_intensity: 0.45,
        flash_color: 'rgba(153, 179, 255, 0.3)',
        has_teleport: false,
    },
    Archer: {
        description: 'Arrow Rain — Leap back and fire a volley skyward',
        pre_move: { x: -20, y: 0 },
        strike_count: 5,
        strike_interval: 0.08,
        total_duration: 0.90,
        vfx_style: 'arrow_rain',
        shake_intensity: 0.3,
        flash_color: 'rgba(230, 217, 128, 0.3)',
        has_teleport: false,
    },
    Spearman: {
        description: 'Spear Charge — Dash forward with devastating thrust',
        pre_move: { x: 48, y: 0 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 0.65,
        vfx_style: 'pierce_trail',
        shake_intensity: 0.5,
        flash_color: 'rgba(204, 204, 230, 0.3)',
        has_teleport: false,
    },
    Heavy: {
        description: 'Fortress Slam — Ground pound creating radial shockwave',
        pre_move: { x: 0, y: -16 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 0.95,
        vfx_style: 'ground_shockwave',
        shake_intensity: 0.8,
        flash_color: 'rgba(179, 128, 77, 0.4)',
        has_teleport: false,
    },
    Wizard: {
        description: 'Arcane Burst — Channel swirling energy then release',
        pre_move: { x: 0, y: 0 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 1.0,
        vfx_style: 'arcane_explosion',
        shake_intensity: 0.5,
        flash_color: 'rgba(128, 77, 255, 0.4)',
        has_teleport: false,
    },
    Javelin: {
        description: 'Javelin Volley — Rapid multi-throw barrage',
        pre_move: { x: 12, y: 0 },
        strike_count: 3,
        strike_interval: 0.15,
        total_duration: 0.80,
        vfx_style: 'projectile_volley',
        shake_intensity: 0.35,
        flash_color: 'rgba(204, 179, 128, 0.3)',
        has_teleport: false,
    },
    Alchemist: {
        description: 'Potion Loom — Toss volatile flask creating expanding cloud',
        pre_move: { x: 8, y: 0 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 0.85,
        vfx_style: 'potion_cloud',
        shake_intensity: 0.25,
        flash_color: 'rgba(77, 230, 102, 0.3)',
        has_teleport: false,
    },
    Cleric: {
        description: 'Divine Light — Raise hands, healing circle expands outward',
        pre_move: { x: 0, y: -8 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 0.90,
        vfx_style: 'divine_circle',
        shake_intensity: 0.15,
        flash_color: 'rgba(255, 255, 179, 0.35)',
        has_teleport: false,
    },
    Ambrosian: {
        description: 'Soul Link — Ethereal tethers form between allies',
        pre_move: { x: 0, y: 0 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 1.0,
        vfx_style: 'soul_tether',
        shake_intensity: 0.1,
        flash_color: 'rgba(179, 128, 255, 0.3)',
        has_teleport: false,
    },
    Assassin: {
        description: 'Shadow Step — Vanish in smoke, teleport behind target, backstab',
        pre_move: { x: 0, y: 0 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 0.80,
        vfx_style: 'shadow_smoke',
        shake_intensity: 0.4,
        flash_color: 'rgba(51, 26, 77, 0.5)',
        has_teleport: true,
    },
    Monk: {
        description: 'Flurry — Rapid-fire combo punches with afterimages',
        pre_move: { x: 24, y: 0 },
        strike_count: 5,
        strike_interval: 0.06,
        total_duration: 0.70,
        vfx_style: 'afterimage_combo',
        shake_intensity: 0.45,
        flash_color: 'rgba(255, 230, 77, 0.3)',
        has_teleport: false,
    },
    Crossbow: {
        description: 'Bolt Barrage — Rapid-fire crossbow bolt volley',
        pre_move: { x: -8, y: 0 },
        strike_count: 4,
        strike_interval: 0.10,
        total_duration: 0.80,
        vfx_style: 'bolt_volley',
        shake_intensity: 0.3,
        flash_color: 'rgba(179, 179, 204, 0.3)',
        has_teleport: false,
    },
    Handgunner: {
        description: 'Cannon Blast — Charged heavy shot with muzzle flash and smoke',
        pre_move: { x: -12, y: 0 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 0.85,
        vfx_style: 'muzzle_blast',
        shake_intensity: 0.7,
        flash_color: 'rgba(255, 153, 26, 0.45)',
        has_teleport: false,
    },
    Siegebreaker: {
        description: 'Wall Break — Full-body charge smashing through everything',
        pre_move: { x: 56, y: 0 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 0.90,
        vfx_style: 'impact_shockwave',
        shake_intensity: 0.9,
        flash_color: 'rgba(230, 153, 51, 0.5)',
        has_teleport: false,
    },
    Paladin: {
        description: 'Holy Judgement — Raise weapon, beam of light descends on target',
        pre_move: { x: 0, y: -12 },
        strike_count: 1,
        strike_interval: 0,
        total_duration: 1.0,
        vfx_style: 'divine_beam',
        shake_intensity: 0.55,
        flash_color: 'rgba(255, 242, 153, 0.5)',
        has_teleport: false,
    },
};

/**
 * Get the special animation data for a class name.
 * @param {string} className
 * @returns {object|null}
 */
export function getClassSpecial(className) {
    return CLASS_SPECIALS[className] || null;
}

/**
 * Check if a class has a teleport-based special.
 * @param {string} className
 * @returns {boolean}
 */
export function hasTeleportSpecial(className) {
    const special = CLASS_SPECIALS[className];
    return special ? special.has_teleport : false;
}

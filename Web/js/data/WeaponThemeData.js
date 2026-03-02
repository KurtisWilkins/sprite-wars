/**
 * WeaponThemeData.js — Maps Sprite races to weapon theme sprite sheets
 * and defines extraction coordinates for equipment overlays.
 *
 * Each weapon theme sheet (1691x1039) contains:
 *   - Left column: Equipment items (helmet, armor, boots, weapons) in 3 tiers
 *   - Main area: Animated humanoid sprites wearing equipment
 *     - 4 direction blocks (down, left, right, up), each with ~9 walk frames
 *     - 2 armor rows: helmet-equipped + full-body
 *
 * The sprite sheets use a consistent grid: ~48px cells.
 */

// ── Theme sheet cell dimensions ─────────────────────────────────────────────
export const THEME_CELL_W = 48;
export const THEME_CELL_H = 48;

// ── Equipment icon extraction from left column ──────────────────────────────
// Each row in the left column contains 3 tier variants (light/medium/heavy)
export const EQUIPMENT_ROWS = {
    helmet:      { row: 0, tiers: 3, cellW: 32, cellH: 32, offsetX: 8, offsetY: 4 },
    shoulderpad: { row: 1, tiers: 3, cellW: 32, cellH: 24, offsetX: 8, offsetY: 36 },
    eyes:        { row: 2, tiers: 4, cellW: 16, cellH: 10, offsetX: 12, offsetY: 64 },
    ears:        { row: 3, tiers: 4, cellW: 16, cellH: 12, offsetX: 12, offsetY: 80 },
    faceguard:   { row: 4, tiers: 4, cellW: 24, cellH: 20, offsetX: 8, offsetY: 96 },
    boots:       { row: 5, tiers: 4, cellW: 20, cellH: 12, offsetX: 10, offsetY: 120 },
    gloves:      { row: 6, tiers: 3, cellW: 16, cellH: 12, offsetX: 12, offsetY: 140 },
    chestplate:  { row: 7, tiers: 3, cellW: 32, cellH: 28, offsetX: 8, offsetY: 156 },
    sword:       { row: 8, tiers: 3, cellW: 16, cellH: 40, offsetX: 16, offsetY: 192 },
    axe:         { row: 9, tiers: 3, cellW: 20, cellH: 40, offsetX: 14, offsetY: 240 },
    staff:       { row: 10, tiers: 3, cellW: 12, cellH: 44, offsetX: 18, offsetY: 288 },
    spear:       { row: 11, tiers: 3, cellW: 12, cellH: 48, offsetX: 18, offsetY: 340 },
    crossbow:    { row: 12, tiers: 2, cellW: 28, cellH: 20, offsetX: 10, offsetY: 396 },
    shield:      { row: 13, tiers: 2, cellW: 24, cellH: 28, offsetX: 12, offsetY: 424 },
};

// ── Animated character sprite regions ───────────────────────────────────────
// The main animated section starts after the equipment column
export const ANIM_REGION = {
    startX: 110,        // X pixel where animated frames begin
    startY: 160,        // Y pixel where first animation row begins
    frameW: 48,         // Width per animation frame
    frameH: 48,         // Height per animation frame
    framesPerDir: 9,    // Walk frames per direction
    directions: 4,      // down, left, right, up
    armorRows: 2,       // helmet row + full body row per direction block
    gapBetweenBlocks: 8, // Pixel gap between direction blocks
};

// ── Race-to-theme mapping ───────────────────────────────────────────────────
// Maps each race_id to a weapon theme and default weapon type
export const RACE_THEME_MAP = {
    1:  { theme: 'Fire Theme',           weapon: 'sword',  armor: 'heavy' },   // Emberpaw (Fire/Berserker)
    2:  { theme: 'Water Theme',          weapon: 'shield', armor: 'heavy' },   // Tidalfin (Water/Guardian)
    3:  { theme: 'Forest Theme',         weapon: 'crossbow', armor: 'medium' }, // Thornvine (Nature/Ranger)
    4:  { theme: 'Water Theme',          weapon: 'sword',  armor: 'light' },   // Frostfang (Ice/Assassin)
    5:  { theme: 'Fairy Theme',          weapon: 'crossbow', armor: 'light' }, // Galecrest (Air/Archer)
    6:  { theme: 'Rock Theme',           weapon: 'axe',    armor: 'heavy' },   // Terraclaw (Earth/Knight)
    7:  { theme: 'Electric Theme',       weapon: 'staff',  armor: 'medium' },  // Voltail (Electric/Wizard)
    8:  { theme: 'Demon Theme',          weapon: 'sword',  armor: 'light' },   // Gloomshade (Dark/Assassin)
    9:  { theme: 'Golden Angel Theme',   weapon: 'staff',  armor: 'medium' },  // Luminos (Light/Cleric)
    10: { theme: 'Fairy Theme',          weapon: 'staff',  armor: 'medium' },  // Glimmerwing (Psychic/Summoner)
    11: { theme: 'Lunar Theme',          weapon: 'staff',  armor: 'medium' },  // Spectrail (Spirit/Wizard)
    12: { theme: 'Demon Theme',          weapon: 'axe',    armor: 'heavy' },   // Ignisurge (Chaos/Berserker)
    13: { theme: 'English Knight Theme', weapon: 'sword',  armor: 'heavy' },   // Ironhusk (Metal/Knight)
    14: { theme: 'Bug Theme',            weapon: 'crossbow', armor: 'medium' }, // Venomire (Poison/Ranger)
    15: { theme: 'Fire Theme',           weapon: 'shield', armor: 'heavy' },   // Blazeguard (Fire/Guardian)
    16: { theme: 'Water Theme',          weapon: 'crossbow', armor: 'medium' }, // Aquashot (Water/Archer)
    17: { theme: 'Electric Theme',       weapon: 'staff',  armor: 'medium' },  // Pyrovolt (Fire+Electric/Wizard)
    18: { theme: 'Bug Theme',            weapon: 'spear',  armor: 'medium' },  // Venomthorn (Poison+Nature/Spearman)
    19: { theme: 'Demon Theme',          weapon: 'spear',  armor: 'medium' },  // Shadowflare (Dark+Fire/Spearman)
    20: { theme: 'Fairy Theme',          weapon: 'staff',  armor: 'medium' },  // Crystalmist (Ice+Psychic/Cleric)
    21: { theme: 'TeutonicTheme',        weapon: 'axe',    armor: 'heavy' },   // Ironstorm (Metal+Air/Berserker)
    22: { theme: 'Forest Theme',         weapon: 'staff',  armor: 'medium' },  // Spiritbloom (Spirit+Nature/Summoner)
    23: { theme: 'Golden Angel Theme',   weapon: 'shield', armor: 'heavy' },   // Solarius (Light+Chaos/Guardian)
    24: { theme: 'Lunar Theme',          weapon: 'staff',  armor: 'medium' },  // Eclipsar (Dark+Spirit/Summoner)
};

// ── Class-to-weapon defaults ────────────────────────────────────────────────
export const CLASS_WEAPON_MAP = {
    Berserker: 'axe',
    Guardian:  'shield',
    Ranger:    'crossbow',
    Assassin:  'sword',
    Archer:    'crossbow',
    Knight:    'sword',
    Wizard:    'staff',
    Cleric:    'staff',
    Summoner:  'staff',
    Spearman:  'spear',
};

// ── Armor tier by evolution stage ───────────────────────────────────────────
export const STAGE_ARMOR_TIER = {
    1: 0, // Light / base
    2: 1, // Medium / upgraded
    3: 2, // Heavy / final
};

// ── Theme file paths ────────────────────────────────────────────────────────
export const THEME_PATHS = {
    'Fire Theme':           '../Sprites/Weapons/Fire Theme.png',
    'Water Theme':          '../Sprites/Weapons/Water Theme.png',
    'Forest Theme':         '../Sprites/Weapons/Forest Theme.png',
    'Rock Theme':           '../Sprites/Weapons/Rock Theme.png',
    'Electric Theme':       '../Sprites/Weapons/Electric Theme.png',
    'Demon Theme':          '../Sprites/Weapons/Demon Theme.png',
    'Golden Angel Theme':   '../Sprites/Weapons/Golden Angel Theme.png',
    'Fairy Theme':          '../Sprites/Weapons/Fairy Theme.png',
    'Lunar Theme':          '../Sprites/Weapons/Lunar Theme.png',
    'Bug Theme':            '../Sprites/Weapons/Bug Theme.png',
    'English Knight Theme': '../Sprites/Weapons/English Knight Theme.png',
    'TeutonicTheme':        '../Sprites/Weapons/TeutonicTheme.png',
    'Aztec Theme':          '../Sprites/Weapons/Aztec Theme.png',
    'Bone Theme':           '../Sprites/Weapons/Bone Theme.png',
    'Colonial Theme':       '../Sprites/Weapons/Colonial Theme.png',
    'Desert Theme':         '../Sprites/Weapons/Desert Theme.png',
    'Dragon Theme':         '../Sprites/Weapons/Dragon Theme.png',
    'Fish People Theme':    '../Sprites/Weapons/Fish People Theme.png',
    'French Knight Theme':  '../Sprites/Weapons/French Knight Theme.png',
    'Jester Theme':         '../Sprites/Weapons/Jester Theme.png',
    'Ork Theme':            '../Sprites/Weapons/Ork Theme.png',
    'Peasant 1 Theme':      '../Sprites/Weapons/Peasant 1 Theme.png',
    'Peasant 2 Theme':      '../Sprites/Weapons/Peasant 2 Theme.png',
    'Pirate Theme':         '../Sprites/Weapons/Pirate Theme.png',
    'Roman Theme':          '../Sprites/Weapons/Roman Theme.png',
    'Samurai Theme':        '../Sprites/Weapons/Samurai Theme.png',
    'SewerPeopleTheme':     '../Sprites/Weapons/SewerPeopleTheme.png',
    'Wolf Theme':           '../Sprites/Weapons/Wolf Theme.png',
};

/**
 * Get the theme config for a given race and evolution stage.
 * @param {number} raceId
 * @param {number} stage - 1, 2, or 3
 * @returns {{ themePath: string, weapon: string, armorTier: number }}
 */
export function getThemeForRace(raceId, stage = 1) {
    const raceTheme = RACE_THEME_MAP[raceId] || RACE_THEME_MAP[1];
    const themePath = THEME_PATHS[raceTheme.theme] || THEME_PATHS['Fire Theme'];
    const armorTier = STAGE_ARMOR_TIER[stage] || 0;
    return {
        themePath,
        weapon: raceTheme.weapon,
        armorTier,
        themeName: raceTheme.theme,
    };
}

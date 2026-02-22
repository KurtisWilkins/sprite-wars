/**
 * AbilityData - All 160 abilities ported from AbilityDatabase.gd
 * Elements: Fire(1-11), Water(12-22), Plant(23-33), Ice(34-44), Wind(45-55),
 *           Earth(56-66), Electric(67-77), Dark(78-88), Light(89-99),
 *           Fairy(100-110), Lunar(111-121), Solar(122-132), Metal(133-143),
 *           Poison(144-154), Class(155-160)
 */

function a(id, name, element, classAff, target, power, acc, pp, cd, priority, statusIds, statusChance, desc, physical, critBonus) {
    return {
        ability_id: id, ability_name: name, element_type: element, class_affinity: classAff,
        targeting_type: target, base_power: power, accuracy: acc, pp_max: pp,
        cooldown_turns: cd, priority_modifier: priority, status_effect_ids: statusIds,
        status_apply_chance: statusChance, description: desc, is_physical: physical, crit_rate_bonus: critBonus
    };
}

export const ABILITIES = {
    // === FIRE (1-11) ===
    1:  a(1,  "Ember Shot",     "fire", "striker",  "single_enemy", 40, 1.0, 20, 0, 0, [], 0.0, "Launches a small bolt of flame at a single foe.", false, 0.0),
    2:  a(2,  "Flame Lance",    "fire", "striker",  "single_enemy", 70, 0.95, 12, 0, 0, [], 0.0, "Hurls a concentrated spear of fire that pierces through defenses.", false, 0.0),
    3:  a(3,  "Inferno Blast",  "fire", "striker",  "single_enemy", 100, 0.85, 8, 0, 0, [], 0.0, "Unleashes a devastating explosion of condensed flame.", false, 0.05),
    4:  a(4,  "Heat Wave",      "fire", "striker",  "row",          50, 0.9, 10, 0, 0, [], 0.0, "Sends a rolling wave of scorching air across an entire row.", false, 0.0),
    5:  a(5,  "Eruption",       "fire", "striker",  "aoe_circle",   80, 0.85, 5, 2, 0, [], 0.0, "Triggers a volcanic eruption beneath all enemies.", false, 0.0),
    6:  a(6,  "Scorch",         "fire", "striker",  "single_enemy", 30, 0.95, 15, 0, 0, [101], 0.5, "Sears a target with lingering flames that may inflict a burn.", false, 0.0),
    7:  a(7,  "Smoke Screen",   "fire", "support",  "single_enemy", 0, 0.9, 10, 0, 0, [201], 1.0, "Engulfs the foe in thick smoke, sharply reducing accuracy.", false, 0.0),
    8:  a(8,  "Fire Shield",    "fire", "guardian", "self",          0, 1.0, 10, 0, 0, [301], 1.0, "Wraps the user in a cloak of fire, boosting defense.", false, 0.0),
    9:  a(9,  "Cauterize",      "fire", "support",  "single_ally",  0, 1.0, 8, 0, 0, [401], 1.0, "Applies controlled flame to an ally's wounds, restoring HP.", false, 0.0),
    10: a(10, "Dragon Breath",  "fire", "striker",  "single_enemy", 120, 0.8, 3, 3, 0, [101], 0.3, "Channels the fury of ancient dragons into a cataclysmic torrent.", false, 0.1),
    11: a(11, "Quick Spark",    "fire", "striker",  "single_enemy", 40, 1.0, 15, 0, 1, [], 0.0, "Flicks a spark at blinding speed, always striking first.", false, 0.0),

    // === WATER (12-22) ===
    12: a(12, "Aqua Jet",       "water", "striker",  "single_enemy", 40, 1.0, 20, 0, 0, [], 0.0, "Fires a pressurized stream of water at a single target.", false, 0.0),
    13: a(13, "Tidal Surge",    "water", "striker",  "single_enemy", 70, 0.95, 12, 0, 0, [], 0.0, "Summons a powerful tidal wave that crashes down on a foe.", false, 0.0),
    14: a(14, "Abyssal Crush",  "water", "striker",  "single_enemy", 100, 0.85, 8, 0, 0, [], 0.0, "Channels the crushing pressure of the deep ocean.", false, 0.05),
    15: a(15, "Riptide",        "water", "striker",  "row",          50, 0.9, 10, 0, 0, [], 0.0, "Drags a violent current across an enemy row.", false, 0.0),
    16: a(16, "Maelstrom",      "water", "striker",  "aoe_circle",   80, 0.85, 5, 2, 0, [], 0.0, "Conjures a massive whirlpool that engulfs all enemies.", false, 0.0),
    17: a(17, "Drench",         "water", "striker",  "single_enemy", 30, 0.95, 15, 0, 0, [102], 0.5, "Soaks the target in frigid water, potentially chilling them.", false, 0.0),
    18: a(18, "Fog Bank",       "water", "support",  "single_enemy", 0, 0.9, 10, 0, 0, [202], 1.0, "Blankets the foe in dense oceanic fog, lowering accuracy.", false, 0.0),
    19: a(19, "Aqua Veil",      "water", "guardian", "self",          0, 1.0, 10, 0, 0, [302], 1.0, "Surrounds the user with a water barrier, raising sp_def.", false, 0.0),
    20: a(20, "Healing Rain",   "water", "support",  "single_ally",  0, 1.0, 8, 0, 0, [402], 1.0, "Calls down gentle restorative rain on an ally.", false, 0.0),
    21: a(21, "Leviathan Fang", "water", "striker",  "single_enemy", 120, 0.8, 3, 3, 0, [102], 0.3, "Summons a spectral sea beast whose jaws crush the foe.", true, 0.1),
    22: a(22, "Splash Dash",    "water", "striker",  "single_enemy", 40, 1.0, 15, 0, 1, [], 0.0, "Dashes forward in a burst of water, striking first.", true, 0.0),

    // === PLANT (23-33) ===
    23: a(23, "Vine Whip",       "plant", "striker",  "single_enemy", 40, 1.0, 20, 0, 0, [], 0.0, "Lashes out with a thorny vine at a single foe.", true, 0.0),
    24: a(24, "Thorn Barrage",   "plant", "striker",  "single_enemy", 70, 0.95, 12, 0, 0, [], 0.0, "Fires a rapid volley of razor-sharp thorns.", true, 0.0),
    25: a(25, "Ancient Oak Slam","plant", "striker",  "single_enemy", 100, 0.85, 8, 0, 0, [], 0.0, "Summons a colossal tree trunk that crashes down.", true, 0.05),
    26: a(26, "Razor Leaf Storm","plant", "striker",  "row",          50, 0.9, 10, 0, 0, [], 0.0, "Whips up blade-like leaves across an enemy row.", true, 0.0),
    27: a(27, "Overgrowth",      "plant", "striker",  "aoe_circle",   80, 0.85, 5, 2, 0, [], 0.0, "Causes explosive plant growth across the battlefield.", false, 0.0),
    28: a(28, "Poison Spore",    "plant", "striker",  "single_enemy", 30, 0.95, 15, 0, 0, [103], 0.5, "Releases toxic spores that may poison the target.", false, 0.0),
    29: a(29, "Tangling Roots",  "plant", "support",  "single_enemy", 0, 0.9, 10, 0, 0, [203], 1.0, "Roots bind the foe, drastically reducing speed.", false, 0.0),
    30: a(30, "Bark Armor",      "plant", "guardian", "self",          0, 1.0, 10, 0, 0, [303], 1.0, "Coats the user in hardened bark, raising physical defense.", false, 0.0),
    31: a(31, "Photosynthesis",  "plant", "support",  "single_ally",  0, 1.0, 8, 0, 0, [403], 1.0, "Channels sunlight into an ally, regenerating HP.", false, 0.0),
    32: a(32, "World Tree Wrath","plant", "striker",  "single_enemy", 120, 0.8, 3, 3, 0, [203], 0.3, "Invokes the World Tree's full destructive fury.", true, 0.1),
    33: a(33, "Briar Snap",      "plant", "striker",  "single_enemy", 40, 1.0, 15, 0, 1, [], 0.0, "A lightning-fast briar lash that strikes first.", true, 0.0),

    // === ICE (34-44) ===
    34: a(34, "Frost Shard",     "ice", "striker",  "single_enemy", 40, 1.0, 20, 0, 0, [], 0.0, "Flings a jagged shard of ice at a target.", false, 0.0),
    35: a(35, "Glacial Spike",   "ice", "striker",  "single_enemy", 70, 0.95, 12, 0, 0, [], 0.0, "Drives a massive spike of glacial ice upward.", false, 0.0),
    36: a(36, "Shatter Point",   "ice", "striker",  "single_enemy", 100, 0.85, 8, 0, 0, [], 0.0, "Encases foe in ice then shatters it with a sonic crack.", false, 0.05),
    37: a(37, "Freezing Gale",   "ice", "striker",  "row",          50, 0.9, 10, 0, 0, [], 0.0, "Sends a howling frozen wind across an enemy row.", false, 0.0),
    38: a(38, "Blizzard",        "ice", "striker",  "aoe_circle",   80, 0.85, 5, 2, 0, [], 0.0, "Summons a catastrophic blizzard burying all enemies.", false, 0.0),
    39: a(39, "Frostbite",       "ice", "striker",  "single_enemy", 30, 0.95, 15, 0, 0, [104], 0.5, "Bites with numbing cold, potentially freezing.", false, 0.0),
    40: a(40, "Frozen Shackles", "ice", "support",  "single_enemy", 0, 0.9, 10, 0, 0, [204], 1.0, "Encases the foe's legs in ice, cutting speed.", false, 0.0),
    41: a(41, "Permafrost",      "ice", "guardian", "self",          0, 1.0, 10, 0, 0, [304], 1.0, "Hardens the body with permafrost, raising defense.", false, 0.0),
    42: a(42, "Glacial Mend",    "ice", "support",  "single_ally",  0, 1.0, 8, 0, 0, [404], 1.0, "Applies soothing frost to wounds, restoring HP.", false, 0.0),
    43: a(43, "Absolute Zero",   "ice", "striker",  "single_enemy", 120, 0.8, 3, 3, 0, [104], 0.3, "Drops temperature to absolute zero, annihilating.", false, 0.1),
    44: a(44, "Ice Fang",        "ice", "striker",  "single_enemy", 40, 1.0, 15, 0, 1, [], 0.0, "Lunges with ice-coated fangs, always moves first.", true, 0.0),

    // === WIND (45-55) ===
    45: a(45, "Gust Slash",      "wind", "striker",  "single_enemy", 40, 1.0, 20, 0, 0, [], 0.0, "Sends a razor-thin blade of compressed air.", false, 0.0),
    46: a(46, "Cyclone Cutter",  "wind", "striker",  "single_enemy", 70, 0.95, 12, 0, 0, [], 0.0, "Spins up a localized cyclone that tears into a foe.", false, 0.0),
    47: a(47, "Tempest Fury",    "wind", "striker",  "single_enemy", 100, 0.85, 8, 0, 0, [], 0.0, "Unleashes the full wrath of a tempest on one target.", false, 0.05),
    48: a(48, "Gale Sweep",      "wind", "striker",  "row",          50, 0.9, 10, 0, 0, [], 0.0, "A sweeping gale-force wind batters all enemies in a row.", false, 0.0),
    49: a(49, "Hurricane",       "wind", "striker",  "aoe_circle",   80, 0.85, 5, 2, 0, [], 0.0, "Conjures a raging hurricane across the battlefield.", false, 0.0),
    50: a(50, "Suffocate",       "wind", "striker",  "single_enemy", 30, 0.95, 15, 0, 0, [105], 0.5, "Rips air away from the target, causing suffocation.", false, 0.0),
    51: a(51, "Tailwind Drain",  "wind", "support",  "single_enemy", 0, 0.9, 10, 0, 0, [205], 1.0, "Steals the wind from the foe, lowering speed.", false, 0.0),
    52: a(52, "Zephyr Cloak",    "wind", "guardian", "self",          0, 1.0, 10, 0, 0, [305], 1.0, "Wraps in swirling winds, boosting evasion and speed.", false, 0.0),
    53: a(53, "Second Wind",     "wind", "support",  "single_ally",  0, 1.0, 8, 0, 0, [405], 1.0, "Grants an ally a revitalizing breeze that restores HP.", false, 0.0),
    54: a(54, "Sky Rend",        "wind", "striker",  "single_enemy", 120, 0.8, 3, 3, 0, [205], 0.3, "Tears open the sky, dropping compressed wind.", false, 0.1),
    55: a(55, "Slipstream",      "wind", "striker",  "single_enemy", 40, 1.0, 15, 0, 1, [], 0.0, "Rides a tailwind burst to strike first.", true, 0.0),

    // === EARTH (56-66) ===
    56: a(56, "Rock Throw",      "earth", "striker",  "single_enemy", 40, 1.0, 20, 0, 0, [], 0.0, "Hurls a dense chunk of rock at a target.", true, 0.0),
    57: a(57, "Boulder Crush",   "earth", "striker",  "single_enemy", 70, 0.95, 12, 0, 0, [], 0.0, "Drops a massive boulder onto the foe.", true, 0.0),
    58: a(58, "Tectonic Slam",   "earth", "striker",  "single_enemy", 100, 0.85, 8, 0, 0, [], 0.0, "Channels tectonic force into a single devastating strike.", true, 0.05),
    59: a(59, "Fault Line",      "earth", "striker",  "row",          50, 0.9, 10, 0, 0, [], 0.0, "Cracks the ground along a fault line, shaking a row.", true, 0.0),
    60: a(60, "Earthquake",      "earth", "striker",  "aoe_circle",   80, 0.85, 5, 2, 0, [], 0.0, "Triggers a massive earthquake across the battlefield.", true, 0.0),
    61: a(61, "Mud Sling",       "earth", "striker",  "single_enemy", 30, 0.95, 15, 0, 0, [106], 0.5, "Flings heavy mud that may blind the target.", true, 0.0),
    62: a(62, "Quicksand",       "earth", "support",  "single_enemy", 0, 0.9, 10, 0, 0, [206], 1.0, "Traps the foe in sinking quicksand, reducing speed.", false, 0.0),
    63: a(63, "Stone Wall",      "earth", "guardian", "self",          0, 1.0, 10, 0, 0, [306], 1.0, "Raises a wall of solid stone, massively boosting def.", false, 0.0),
    64: a(64, "Earthen Embrace", "earth", "support",  "single_ally",  0, 1.0, 8, 0, 0, [406], 1.0, "Wraps an ally in earth energy, restoring HP.", false, 0.0),
    65: a(65, "Continental Crush","earth", "striker",  "single_enemy", 120, 0.8, 3, 3, 0, [206], 0.3, "Compresses continental force into a single strike.", true, 0.1),
    66: a(66, "Pebble Shot",     "earth", "striker",  "single_enemy", 40, 1.0, 15, 0, 1, [], 0.0, "Flicks a stone at incredible velocity, always first.", true, 0.0),

    // === ELECTRIC (67-77) ===
    67: a(67, "Spark Bolt",      "electric", "striker",  "single_enemy", 40, 1.0, 20, 0, 0, [], 0.0, "Fires a crackling bolt of electricity.", false, 0.0),
    68: a(68, "Thunder Strike",  "electric", "striker",  "single_enemy", 70, 0.95, 12, 0, 0, [], 0.0, "Calls down a focused bolt of thunder.", false, 0.0),
    69: a(69, "Gigavolt Cannon", "electric", "striker",  "single_enemy", 100, 0.85, 8, 0, 0, [], 0.0, "Discharges a beam of one billion volts.", false, 0.05),
    70: a(70, "Chain Lightning", "electric", "striker",  "row",          50, 0.9, 10, 0, 0, [], 0.0, "Lightning arcs from foe to foe across a row.", false, 0.0),
    71: a(71, "Ion Storm",       "electric", "striker",  "aoe_circle",   80, 0.85, 5, 2, 0, [], 0.0, "Ionizes the atmosphere into a devastating storm.", false, 0.0),
    72: a(72, "Static Shock",    "electric", "striker",  "single_enemy", 30, 0.95, 15, 0, 0, [107], 0.5, "Zaps the target, may cause paralysis.", false, 0.0),
    73: a(73, "Electromagnetic Pulse", "electric", "support", "single_enemy", 0, 0.9, 10, 0, 0, [207], 1.0, "Disruptive pulse scrambles coordination, lowers atk.", false, 0.0),
    74: a(74, "Charge Up",       "electric", "guardian", "self",          0, 1.0, 10, 0, 0, [307], 1.0, "Accumulates charge, boosting sp_atk and speed.", false, 0.0),
    75: a(75, "Defibrillate",    "electric", "support",  "single_ally",  0, 1.0, 8, 0, 0, [407], 1.0, "Jolts an ally with controlled shock, restoring HP.", false, 0.0),
    76: a(76, "Plasma Annihilation", "electric", "striker", "single_enemy", 120, 0.8, 3, 3, 0, [107], 0.3, "Converts air to superheated plasma.", false, 0.1),
    77: a(77, "Volt Tackle",     "electric", "striker",  "single_enemy", 40, 1.0, 15, 0, 1, [], 0.0, "Charges headlong cloaked in electricity.", true, 0.0),

    // === DARK (78-88) ===
    78: a(78, "Shadow Strike",   "Dark", "Assassin",  "single", 40, 1.0, 15, 0, 0, [], 0.0, "A swift strike from the shadows.", true, 0.05),
    79: a(79, "Dark Pulse",      "Dark", "Sorcerer",  "row",    65, 0.95, 10, 0, 0, [5], 0.2, "A wave of dark energy that may cause flinching.", false, 0.0),
    80: a(80, "Nightmare",       "Dark", "Sorcerer",  "single", 0, 0.85, 10, 2, 0, [8], 1.0, "Traps the target in a terrifying nightmare.", false, 0.0),
    81: a(81, "Void Fang",       "Dark", "Berserker", "single", 80, 0.9, 8, 1, 0, [], 0.0, "Bites with fangs imbued with void energy.", true, 0.1),
    82: a(82, "Shadow Veil",     "Dark", "Assassin",  "self",   0, 1.0, 5, 3, 0, [10], 1.0, "Wraps self in shadows, boosting evasion sharply.", false, 0.0),
    83: a(83, "Abyssal Blast",   "Dark", "Sorcerer",  "aoe_circle", 90, 0.85, 5, 2, 0, [], 0.0, "Unleashes concentrated darkness.", false, 0.0),
    84: a(84, "Drain Life",      "Dark", "Sorcerer",  "single", 55, 0.95, 10, 0, 0, [], 0.0, "Drains life force. Heals user by 50% of damage.", false, 0.0),
    85: a(85, "Backstab",        "Dark", "Assassin",  "single", 70, 1.0, 8, 1, 1, [], 0.0, "Precise strike that always hits first. Double from behind.", true, 0.15),
    86: a(86, "Hex Bolt",        "Dark", "Sorcerer",  "single", 50, 0.95, 12, 0, 0, [6], 0.3, "Cursed energy bolt. Double damage on status-afflicted.", false, 0.0),
    87: a(87, "Umbral Storm",    "Dark", "Berserker", "all",    100, 0.8, 3, 3, 0, [], 0.0, "A storm of pure darkness engulfs all foes.", false, 0.0),
    88: a(88, "Shadow Snare",    "Dark", "Ranger",    "single", 35, 0.95, 12, 0, 0, [12], 0.4, "Shadow tendrils grip the target, reducing speed.", false, 0.0),

    // === LIGHT (89-99) ===
    89: a(89, "Holy Beam",       "Light", "Cleric",   "single", 60, 0.95, 12, 0, 0, [], 0.0, "A focused beam of holy light.", false, 0.0),
    90: a(90, "Divine Shield",   "Light", "Guardian",  "single_ally", 0, 1.0, 8, 1, 1, [13], 1.0, "Creates a shield of light reducing damage.", false, 0.0),
    91: a(91, "Purify",          "Light", "Cleric",   "single_ally", 0, 1.0, 10, 0, 0, [], 0.0, "Removes all negative status effects from an ally.", false, 0.0),
    92: a(92, "Radiant Burst",   "Light", "Sorcerer", "aoe_circle", 75, 0.9, 6, 1, 0, [], 0.0, "An explosion of radiant energy sears all enemies.", false, 0.0),
    93: a(93, "Heal Light",      "Light", "Cleric",   "single_ally", 0, 1.0, 8, 0, 0, [14], 1.0, "Bathes an ally in gentle light, restoring HP.", false, 0.0),
    94: a(94, "Smite",           "Light", "Guardian",  "single", 70, 0.95, 8, 0, 0, [], 0.0, "Strikes with righteous fury. Extra vs Dark types.", true, 0.05),
    95: a(95, "Blessing Aura",   "Light", "Cleric",   "all_allies", 0, 1.0, 3, 3, 0, [15], 1.0, "Blesses all allies, boosting defense for 3 turns.", false, 0.0),
    96: a(96, "Flash",           "Light", "Ranger",    "row",    40, 1.0, 15, 0, 0, [16], 0.3, "A blinding flash that may reduce accuracy.", false, 0.0),
    97: a(97, "Judgement Ray",   "Light", "Sorcerer", "pierce", 85, 0.85, 5, 2, 0, [], 0.0, "A piercing ray of divine judgement.", false, 0.05),
    98: a(98, "Sanctuary",       "Light", "Cleric",   "all_allies", 0, 1.0, 2, 4, 0, [14], 1.0, "Creates a zone of healing for all allies.", false, 0.0),
    99: a(99, "Radiant Lance",   "Light", "Guardian",  "line",   80, 0.9, 6, 1, 0, [], 0.0, "Hurls a lance of solid light piercing enemies in a line.", true, 0.1),

    // === FAIRY (100-110) ===
    100: a(100, "Pixie Dust",    "Fairy", "Trickster", "single", 45, 1.0, 15, 0, 0, [17], 0.2, "Enchanted dust that may confuse the target.", false, 0.0),
    101: a(101, "Moonbeam",      "Fairy", "Sorcerer",  "single", 65, 0.95, 10, 0, 0, [], 0.0, "Channels moonlight into a focused beam of fae energy.", false, 0.0),
    102: a(102, "Charm",         "Fairy", "Trickster", "single", 0, 0.85, 10, 1, 0, [17], 1.0, "Charms the target with fae magic, causing confusion.", false, 0.0),
    103: a(103, "Fae Wind",      "Fairy", "Ranger",    "column", 55, 0.95, 10, 0, 0, [], 0.0, "A magical breeze carries fae energy down a column.", false, 0.0),
    104: a(104, "Nature's Gift",  "Fairy", "Cleric",   "single_ally", 0, 1.0, 5, 2, 0, [14], 1.0, "Channels nature's healing to restore a large amount of HP.", false, 0.0),
    105: a(105, "Enchant",       "Fairy", "Trickster", "single_ally", 0, 1.0, 5, 2, 0, [18], 1.0, "Enchants an ally's attacks with fae magic, boosting sp_atk.", false, 0.0),
    106: a(106, "Sylph Rush",    "Fairy", "Striker",   "single", 70, 0.95, 8, 0, 1, [], 0.0, "A swift dash empowered by fae energy. Strikes first.", true, 0.05),
    107: a(107, "Fairy Ring",    "Fairy", "Guardian",  "adjacent_allies", 0, 1.0, 5, 3, 0, [13], 1.0, "Creates a protective fairy ring around nearby allies.", false, 0.0),
    108: a(108, "Dazzle",        "Fairy", "Trickster", "row",    50, 0.9, 10, 0, 0, [16], 0.35, "A dazzling display that may reduce accuracy.", false, 0.0),
    109: a(109, "Fae Barrage",   "Fairy", "Sorcerer",  "random", 25, 0.9, 10, 0, 0, [], 0.0, "Launches 3-5 bolts of fae energy at random targets.", false, 0.0),
    110: a(110, "Dreamweave",    "Fairy", "Sorcerer",  "aoe_circle", 95, 0.8, 3, 3, 0, [8], 0.2, "Weaves a dream spell that may put foes to sleep.", false, 0.0),

    // === LUNAR (111-121) ===
    111: a(111, "Crescent Slash", "Lunar", "Assassin",  "single", 55, 0.95, 12, 0, 0, [], 0.0, "A crescent-shaped blade of moonlight.", true, 0.1),
    112: a(112, "Lunar Tide",    "Lunar", "Sorcerer",  "row",    60, 0.9, 10, 0, 0, [], 0.0, "A wave of lunar energy across a row of enemies.", false, 0.0),
    113: a(113, "Moonrise",      "Lunar", "Cleric",    "all_allies", 0, 1.0, 3, 4, 0, [19], 1.0, "Calls upon the moon to boost all allies' special stats.", false, 0.0),
    114: a(114, "Eclipse Ray",   "Lunar", "Sorcerer",  "pierce", 80, 0.85, 5, 2, 0, [], 0.0, "A ray of eclipse energy that pierces through all.", false, 0.05),
    115: a(115, "Waning Light",  "Lunar", "Trickster", "single", 45, 0.95, 12, 0, 0, [20], 0.3, "Fading moonlight saps the target's attack power.", false, 0.0),
    116: a(116, "Moonfall",      "Lunar", "Berserker", "diamond", 85, 0.85, 5, 2, 0, [], 0.0, "Calls down a fragment of moonlight in a diamond pattern.", false, 0.0),
    117: a(117, "Silver Fang",   "Lunar", "Assassin",  "single", 70, 0.95, 8, 0, 0, [], 0.0, "Strikes with silver-coated fangs empowered by moonlight.", true, 0.15),
    118: a(118, "Night Shroud",  "Lunar", "Assassin",  "self",   0, 1.0, 5, 3, 0, [10], 1.0, "Cloaks the user in the darkness of a new moon.", false, 0.0),
    119: a(119, "Tidal Pull",    "Lunar", "Guardian",  "single", 50, 0.9, 10, 0, 0, [12], 0.4, "The moon's gravitational pull drags the target.", false, 0.0),
    120: a(120, "Penumbra",      "Lunar", "Sorcerer",  "all",    70, 0.8, 3, 3, 0, [16], 0.25, "Shadows of the penumbra engulf all enemies.", false, 0.0),
    121: a(121, "Lunar Blessing","Lunar", "Cleric",    "single_ally", 0, 1.0, 5, 2, 0, [14, 19], 1.0, "A powerful lunar blessing that heals and buffs.", false, 0.0),

    // === SOLAR (122-132) ===
    122: a(122, "Solar Flare",   "Solar", "Sorcerer",  "single", 60, 0.95, 12, 0, 0, [1], 0.15, "A concentrated blast of solar energy that may burn.", false, 0.0),
    123: a(123, "Sunbeam",       "Solar", "Sorcerer",  "line",   75, 0.9, 8, 1, 0, [], 0.0, "A beam of concentrated sunlight cuts through a line.", false, 0.0),
    124: a(124, "Daybreak",      "Solar", "Cleric",    "all_allies", 0, 1.0, 3, 4, 0, [21], 1.0, "The dawn's light invigorates all allies, boosting attack.", false, 0.0),
    125: a(125, "Corona Blast",  "Solar", "Berserker", "aoe_circle", 90, 0.8, 4, 2, 0, [1], 0.3, "A devastating explosion of solar corona energy.", false, 0.05),
    126: a(126, "Photon Strike", "Solar", "Striker",   "single", 75, 0.95, 8, 0, 0, [], 0.0, "Channels sunlight into a physical strike.", true, 0.1),
    127: a(127, "Solar Charge",  "Solar", "Guardian",  "self",   0, 1.0, 5, 2, 0, [22], 1.0, "Absorbs solar energy to boost defense for 3 turns.", false, 0.0),
    128: a(128, "Heat Haze",     "Solar", "Trickster", "row",    50, 0.9, 10, 0, 0, [16], 0.25, "Creates a shimmering heat haze reducing accuracy.", false, 0.0),
    129: a(129, "Prominence",    "Solar", "Sorcerer",  "column", 70, 0.9, 7, 1, 0, [], 0.0, "A solar prominence scorches enemies in a column.", false, 0.0),
    130: a(130, "Sunrise Heal",  "Solar", "Cleric",    "single_ally", 0, 1.0, 6, 1, 0, [14], 1.0, "The warmth of sunrise restores an ally's HP.", false, 0.0),
    131: a(131, "Supernova",     "Solar", "Berserker", "all",    110, 0.75, 2, 4, 0, [1], 0.4, "A cataclysmic explosion. The ultimate Solar attack.", false, 0.0),
    132: a(132, "Light Spear",   "Solar", "Striker",   "pierce", 65, 0.95, 8, 0, 0, [], 0.0, "Hurls a spear of solid light that pierces through.", true, 0.05),

    // === METAL (133-143) ===
    133: a(133, "Iron Slam",     "Metal", "Berserker", "single", 65, 0.95, 12, 0, 0, [], 0.0, "Slams the target with a heavy metallic limb.", true, 0.0),
    134: a(134, "Steel Barrier", "Metal", "Guardian",  "self",   0, 1.0, 5, 2, 0, [22], 1.0, "Hardens the body to steel, sharply boosting defense.", false, 0.0),
    135: a(135, "Blade Storm",   "Metal", "Striker",   "adjacent", 55, 0.9, 10, 0, 0, [], 0.0, "Whirls metal blades that slice all adjacent enemies.", true, 0.05),
    136: a(136, "Magnet Pull",   "Metal", "Trickster", "single", 40, 0.95, 12, 0, 0, [12], 0.3, "Uses magnetic force to pull and damage the target.", false, 0.0),
    137: a(137, "Rivet Shot",    "Metal", "Ranger",    "single", 50, 1.0, 15, 0, 0, [], 0.0, "Fires a rivet with perfect accuracy.", true, 0.0),
    138: a(138, "Alloy Crush",   "Metal", "Berserker", "single", 85, 0.85, 6, 1, 0, [20], 0.2, "A devastating crush that may lower defense.", true, 0.0),
    139: a(139, "Shrapnel Burst","Metal", "Ranger",    "diamond", 60, 0.9, 8, 1, 0, [], 0.0, "Explodes into metal shrapnel, hitting a diamond area.", true, 0.0),
    140: a(140, "Forge Flame",   "Metal", "Sorcerer",  "single", 70, 0.9, 8, 0, 0, [1], 0.15, "Superheats metal to forge temperature and hurls it.", false, 0.0),
    141: a(141, "Iron Curtain",  "Metal", "Guardian",  "all_allies", 0, 1.0, 3, 3, 0, [13], 1.0, "Raises an iron curtain that shields all allies.", false, 0.0),
    142: a(142, "Meltdown",      "Metal", "Berserker", "aoe_circle", 95, 0.8, 3, 3, 0, [1], 0.3, "Causes a catastrophic metal meltdown in an area.", false, 0.0),
    143: a(143, "Titanium Fist", "Metal", "Striker",   "single", 90, 0.9, 5, 1, 0, [], 0.0, "A devastating punch with a titanium-hardened fist.", true, 0.1),

    // === POISON (144-154) ===
    144: a(144, "Toxic Spit",    "Poison", "Ranger",   "single", 40, 0.95, 15, 0, 0, [2], 0.3, "Spits a glob of toxic venom that may poison.", false, 0.0),
    145: a(145, "Venom Fang",    "Poison", "Assassin", "single", 60, 0.95, 10, 0, 0, [2], 0.4, "Bites with venomous fangs. High poison chance.", true, 0.05),
    146: a(146, "Miasma",        "Poison", "Sorcerer", "aoe_circle", 50, 0.9, 8, 1, 0, [2], 0.35, "Releases a cloud of poisonous miasma.", false, 0.0),
    147: a(147, "Acid Spray",    "Poison", "Sorcerer", "column", 55, 0.9, 10, 0, 0, [20], 0.25, "Sprays corrosive acid that may lower defense.", false, 0.0),
    148: a(148, "Toxic Spore",   "Poison", "Ranger",   "row",    35, 0.9, 12, 0, 0, [2], 0.45, "Releases toxic spores across a row.", false, 0.0),
    149: a(149, "Venomshock",    "Poison", "Striker",  "single", 50, 0.95, 10, 0, 0, [], 0.0, "Deals double damage to poisoned targets.", false, 0.0),
    150: a(150, "Corrosion",     "Poison", "Trickster","single", 45, 0.95, 10, 0, 0, [20], 0.5, "Corrodes the target's armor, very likely to lower defense.", false, 0.0),
    151: a(151, "Plague Cloud",  "Poison", "Sorcerer", "all",    60, 0.8, 5, 2, 0, [2], 0.4, "A devastating cloud of plague engulfs all enemies.", false, 0.0),
    152: a(152, "Toxic Needle",  "Poison", "Assassin", "single", 30, 1.0, 15, 0, 1, [2], 0.5, "A quick needle strike that always goes first.", true, 0.0),
    153: a(153, "Biohazard",     "Poison", "Berserker","cross",  80, 0.85, 5, 2, 0, [2], 0.35, "Unleashes a biohazardous explosion in a cross pattern.", false, 0.0),
    154: a(154, "Noxious Bite",  "Poison", "Berserker","single", 75, 0.9, 8, 1, 0, [2], 0.6, "A powerful bite dripping with toxins.", true, 0.05),

    // === CLASS / UNIVERSAL (155-160) ===
    155: a(155, "Tackle",        "None", "Any",       "single", 35, 1.0, 20, 0, 0, [], 0.0, "A basic physical tackle. Every Sprite can learn this.", true, 0.0),
    156: a(156, "Guard",         "None", "Guardian",  "self",   0, 1.0, 15, 0, 2, [22], 1.0, "Raises guard, boosting defense for 1 turn.", false, 0.0),
    157: a(157, "Quick Strike",  "None", "Striker",   "single", 40, 1.0, 15, 0, 1, [], 0.0, "A swift strike that always goes first.", true, 0.0),
    158: a(158, "Focus Energy",  "None", "Any",       "self",   0, 1.0, 10, 2, 0, [23], 1.0, "Focuses energy to sharply boost critical hit rate.", false, 0.0),
    159: a(159, "Rest",          "None", "Any",       "self",   0, 1.0, 5, 3, 0, [14, 8], 1.0, "Falls asleep for 2 turns, fully restoring HP.", false, 0.0),
    160: a(160, "Rage",          "None", "Berserker", "self",   0, 1.0, 5, 3, 0, [21], 1.0, "Enters a rage, sharply boosting attack but lowering defense.", false, 0.0),
};

/** Get a single ability by ID */
export function getAbility(id) {
    return ABILITIES[id] || null;
}

/** Get all abilities of a given element */
export function getAbilitiesByElement(element) {
    const el = element.toLowerCase();
    return Object.values(ABILITIES).filter(a => a.element_type.toLowerCase() === el);
}

/** Get all abilities of a given class affinity */
export function getAbilitiesByClass(className) {
    const cls = className.toLowerCase();
    return Object.values(ABILITIES).filter(a => a.class_affinity.toLowerCase() === cls);
}

/** Get all abilities as an array */
export function getAllAbilities() {
    return Object.values(ABILITIES);
}

/** Get ability count */
export const ABILITY_COUNT = 160;

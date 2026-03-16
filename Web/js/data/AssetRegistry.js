/**
 * AssetRegistry — Central asset path mapping for all Sprite Wars game entities.
 * Provides lookup methods for sprites, icons, VFX, audio, tilesets, and UI assets.
 * Ported from GDScript autoload singleton (Game/Autoloads/AssetRegistry.gd).
 *
 * All paths are web-relative from Web/js/data/ to the project root asset folders.
 */

class AssetRegistry {

  // -------------------------------------------------------------------------
  // Element icon path lookup (14 elements)
  // -------------------------------------------------------------------------
  static ELEMENT_ICONS = {
    "Fire":     "../Sprites/ElementIcons/FireElement.png",
    "Water":    "../Sprites/ElementIcons/WaterElement.png",
    "Plant":    "../Sprites/ElementIcons/GrassElement.png",
    "Ice":      "../Sprites/ElementIcons/IceElement.png",
    "Wind":     "../Sprites/ElementIcons/WindElement.png",
    "Earth":    "../Sprites/ElementIcons/RockElement.png",
    "Electric": "../Sprites/ElementIcons/LightingElement.png",
    "Dark":     "../Sprites/ElementIcons/DarkElement.png",
    "Light":    "../Sprites/ElementIcons/LightElement.png",
    "Fairy":    "../Sprites/ElementIcons/FairyElement.png",
    "Solar":    "../Sprites/ElementIcons/LunarElement.png",
    "Lunar":    "../Sprites/ElementIcons/SolarElement.png",
    "Metal":    "../Sprites/ElementIcons/RockElement.png",
    "Poison":   "../Sprites/ElementIcons/GrassElement.png",
  };

  // -------------------------------------------------------------------------
  // Character sprite paths keyed by form_id (1-72)
  // form_id = race_id * 3 - 2 (stage 1), race_id * 3 - 1 (stage 2), race_id * 3 (stage 3)
  // 24 races x 3 evolution stages = 72 forms
  // -------------------------------------------------------------------------
  static CHARACTER_SPRITES = {
    // Race 1 — Human
    1:  "../Sprites/Characters/Human/Human_S1_Idle.png",
    2:  "../Sprites/Characters/Human/Human_S2_Idle.png",
    3:  "../Sprites/Characters/Human/Human_S3_Idle.png",
    // Race 2 — Elf
    4:  "../Sprites/Characters/Elf/Elf_S1_Idle.png",
    5:  "../Sprites/Characters/Elf/Elf_S2_Idle.png",
    6:  "../Sprites/Characters/Elf/Elf_S3_Idle.png",
    // Race 3 — Demon
    7:  "../Sprites/Characters/Demon/Demon_S1_Idle.png",
    8:  "../Sprites/Characters/Demon/Demon_S2_Idle.png",
    9:  "../Sprites/Characters/Demon/Demon_S3_Idle.png",
    // Race 4 — Devil
    10: "../Sprites/Characters/Devil/Devil_S1_Idle.png",
    11: "../Sprites/Characters/Devil/Devil_S2_Idle.png",
    12: "../Sprites/Characters/Devil/Devil_S3_Idle.png",
    // Race 5 — CatMan
    13: "../Sprites/Characters/CatMan/CatMan_S1_Idle.png",
    14: "../Sprites/Characters/CatMan/CatMan_S2_Idle.png",
    15: "../Sprites/Characters/CatMan/CatMan_S3_Idle.png",
    // Race 6 — BearMan
    16: "../Sprites/Characters/BearMan/BearMan_S1_Idle.png",
    17: "../Sprites/Characters/BearMan/BearMan_S2_Idle.png",
    18: "../Sprites/Characters/BearMan/BearMan_S3_Idle.png",
    // Race 7 — WolfMan
    19: "../Sprites/Characters/WolfMan/WolfMan_S1_Idle.png",
    20: "../Sprites/Characters/WolfMan/WolfMan_S2_Idle.png",
    21: "../Sprites/Characters/WolfMan/WolfMan_S3_Idle.png",
    // Race 8 — MonkeyMan
    22: "../Sprites/Characters/MonkeyMan/MonkeyMan_S1_Idle.png",
    23: "../Sprites/Characters/MonkeyMan/MonkeyMan_S2_Idle.png",
    24: "../Sprites/Characters/MonkeyMan/MonkeyMan_S3_Idle.png",
    // Race 9 — BugMan
    25: "../Sprites/Characters/BugMan/BugMan_S1_Idle.png",
    26: "../Sprites/Characters/BugMan/BugMan_S2_Idle.png",
    27: "../Sprites/Characters/BugMan/BugMan_S3_Idle.png",
    // Race 10 — BirdMan
    28: "../Sprites/Characters/BirdMan/BirdMan_S1_Idle.png",
    29: "../Sprites/Characters/BirdMan/BirdMan_S2_Idle.png",
    30: "../Sprites/Characters/BirdMan/BirdMan_S3_Idle.png",
    // Race 11 — Ent
    31: "../Sprites/Characters/Ent/Ent_S1_Idle.png",
    32: "../Sprites/Characters/Ent/Ent_S2_Idle.png",
    33: "../Sprites/Characters/Ent/Ent_S3_Idle.png",
    // Race 12 — FishMan
    34: "../Sprites/Characters/FishMan/FishMan_S1_Idle.png",
    35: "../Sprites/Characters/FishMan/FishMan_S2_Idle.png",
    36: "../Sprites/Characters/FishMan/FishMan_S3_Idle.png",
    // Race 13 — Ghost
    37: "../Sprites/Characters/Ghost/Ghost_S1_Idle.png",
    38: "../Sprites/Characters/Ghost/Ghost_S2_Idle.png",
    39: "../Sprites/Characters/Ghost/Ghost_S3_Idle.png",
    // Race 14 — Golem
    40: "../Sprites/Characters/Golem/Golem_S1_Idle.png",
    41: "../Sprites/Characters/Golem/Golem_S2_Idle.png",
    42: "../Sprites/Characters/Golem/Golem_S3_Idle.png",
    // Race 15 — LizardMan
    43: "../Sprites/Characters/LizardMan/LizardMan_S1_Idle.png",
    44: "../Sprites/Characters/LizardMan/LizardMan_S2_Idle.png",
    45: "../Sprites/Characters/LizardMan/LizardMan_S3_Idle.png",
    // Race 16 — Minotaur
    46: "../Sprites/Characters/Minotaur/Minotaur_S1_Idle.png",
    47: "../Sprites/Characters/Minotaur/Minotaur_S2_Idle.png",
    48: "../Sprites/Characters/Minotaur/Minotaur_S3_Idle.png",
    // Race 17 — Mummy
    49: "../Sprites/Characters/Mummy/Mummy_S1_Idle.png",
    50: "../Sprites/Characters/Mummy/Mummy_S2_Idle.png",
    51: "../Sprites/Characters/Mummy/Mummy_S3_Idle.png",
    // Race 18 — Ork
    52: "../Sprites/Characters/Ork/Ork_S1_Idle.png",
    53: "../Sprites/Characters/Ork/Ork_S2_Idle.png",
    54: "../Sprites/Characters/Ork/Ork_S3_Idle.png",
    // Race 19 — RatMan
    55: "../Sprites/Characters/RatMan/RatMan_S1_Idle.png",
    56: "../Sprites/Characters/RatMan/RatMan_S2_Idle.png",
    57: "../Sprites/Characters/RatMan/RatMan_S3_Idle.png",
    // Race 20 — Robot
    58: "../Sprites/Characters/Robot/Robot_S1_Idle.png",
    59: "../Sprites/Characters/Robot/Robot_S2_Idle.png",
    60: "../Sprites/Characters/Robot/Robot_S3_Idle.png",
    // Race 21 — Skeleton
    61: "../Sprites/Characters/Skeleton/Skeleton_S1_Idle.png",
    62: "../Sprites/Characters/Skeleton/Skeleton_S2_Idle.png",
    63: "../Sprites/Characters/Skeleton/Skeleton_S3_Idle.png",
    // Race 22 — SharkMan
    64: "../Sprites/Characters/SharkMan/SharkMan_S1_Idle.png",
    65: "../Sprites/Characters/SharkMan/SharkMan_S2_Idle.png",
    66: "../Sprites/Characters/SharkMan/SharkMan_S3_Idle.png",
    // Race 23 — TurtleMan
    67: "../Sprites/Characters/TurtleMan/TurtleMan_S1_Idle.png",
    68: "../Sprites/Characters/TurtleMan/TurtleMan_S2_Idle.png",
    69: "../Sprites/Characters/TurtleMan/TurtleMan_S3_Idle.png",
    // Race 24 — Zombie
    70: "../Sprites/Characters/Zombie/Zombie_S1_Idle.png",
    71: "../Sprites/Characters/Zombie/Zombie_S2_Idle.png",
    72: "../Sprites/Characters/Zombie/Zombie_S3_Idle.png",
  };

  // -------------------------------------------------------------------------
  // Character sprite directory names keyed by form_id (1-72)
  // Used to resolve attack, death, and directional animation strips
  // -------------------------------------------------------------------------
  static CHARACTER_SPRITE_DIRS = {
    // Race 1 — Human
    1:  "Human",
    2:  "Human",
    3:  "Human",
    // Race 2 — Elf
    4:  "Elf",
    5:  "Elf",
    6:  "Elf",
    // Race 3 — Demon
    7:  "Demon",
    8:  "Demon",
    9:  "Demon",
    // Race 4 — Devil
    10: "Devil",
    11: "Devil",
    12: "Devil",
    // Race 5 — CatMan
    13: "CatMan",
    14: "CatMan",
    15: "CatMan",
    // Race 6 — BearMan
    16: "BearMan",
    17: "BearMan",
    18: "BearMan",
    // Race 7 — WolfMan
    19: "WolfMan",
    20: "WolfMan",
    21: "WolfMan",
    // Race 8 — MonkeyMan
    22: "MonkeyMan",
    23: "MonkeyMan",
    24: "MonkeyMan",
    // Race 9 — BugMan
    25: "BugMan",
    26: "BugMan",
    27: "BugMan",
    // Race 10 — BirdMan
    28: "BirdMan",
    29: "BirdMan",
    30: "BirdMan",
    // Race 11 — Ent
    31: "Ent",
    32: "Ent",
    33: "Ent",
    // Race 12 — FishMan
    34: "FishMan",
    35: "FishMan",
    36: "FishMan",
    // Race 13 — Ghost
    37: "Ghost",
    38: "Ghost",
    39: "Ghost",
    // Race 14 — Golem
    40: "Golem",
    41: "Golem",
    42: "Golem",
    // Race 15 — LizardMan
    43: "LizardMan",
    44: "LizardMan",
    45: "LizardMan",
    // Race 16 — Minotaur
    46: "Minotaur",
    47: "Minotaur",
    48: "Minotaur",
    // Race 17 — Mummy
    49: "Mummy",
    50: "Mummy",
    51: "Mummy",
    // Race 18 — Ork
    52: "Ork",
    53: "Ork",
    54: "Ork",
    // Race 19 — RatMan
    55: "RatMan",
    56: "RatMan",
    57: "RatMan",
    // Race 20 — Robot
    58: "Robot",
    59: "Robot",
    60: "Robot",
    // Race 21 — Skeleton
    61: "Skeleton",
    62: "Skeleton",
    63: "Skeleton",
    // Race 22 — SharkMan
    64: "SharkMan",
    65: "SharkMan",
    66: "SharkMan",
    // Race 23 — TurtleMan
    67: "TurtleMan",
    68: "TurtleMan",
    69: "TurtleMan",
    // Race 24 — Zombie
    70: "Zombie",
    71: "Zombie",
    72: "Zombie",
  };

  // -------------------------------------------------------------------------
  // Ability icon paths keyed by ability_id (1-160)
  // -------------------------------------------------------------------------
  static ABILITY_ICONS = {
    // --- Fire abilities (IDs 1-11) -> Pyromanser ---
    1:   "../Sprites/AbilityIcons/Pyromanser/PNG/Icon1.png",
    2:   "../Sprites/AbilityIcons/Pyromanser/PNG/Icon2.png",
    3:   "../Sprites/AbilityIcons/Pyromanser/PNG/Icon3.png",
    4:   "../Sprites/AbilityIcons/Pyromanser/PNG/Icon4.png",
    5:   "../Sprites/AbilityIcons/Pyromanser/PNG/Icon5.png",
    6:   "../Sprites/AbilityIcons/Pyromanser/PNG/Icon6.png",
    7:   "../Sprites/AbilityIcons/Pyromanser/PNG/Icon7.png",
    8:   "../Sprites/AbilityIcons/Pyromanser/PNG/Icon8.png",
    9:   "../Sprites/AbilityIcons/Pyromanser/PNG/Icon9.png",
    10:  "../Sprites/AbilityIcons/Pyromanser/PNG/Icon10.png",
    11:  "../Sprites/AbilityIcons/Pyromanser/PNG/Icon11.png",
    // --- Water abilities (IDs 12-22) -> icons 1 (sk1_ pattern, A variant) ---
    12:  "../Sprites/AbilityIcons/icons 1/sk1_water_burst_A.png",
    13:  "../Sprites/AbilityIcons/icons 1/sk1_ice_burst_A.png",
    14:  "../Sprites/AbilityIcons/icons 1/sk1_ice_spike_A.png",
    15:  "../Sprites/AbilityIcons/icons 1/sk1_storm_A.png",
    16:  "../Sprites/AbilityIcons/icons 1/sk1_cure_A.png",
    17:  "../Sprites/AbilityIcons/icons 1/sk1_regenerate_A.png",
    18:  "../Sprites/AbilityIcons/icons 1/sk1_defense_up_A.png",
    19:  "../Sprites/AbilityIcons/icons 1/sk1_guard_A.png",
    20:  "../Sprites/AbilityIcons/icons 1/sk1_chain_A.png",
    21:  "../Sprites/AbilityIcons/icons 1/sk1_empower_A.png",
    22:  "../Sprites/AbilityIcons/icons 1/sk1_dash_A.png",
    // --- Plant abilities (IDs 23-33) -> Druid ---
    23:  "../Sprites/AbilityIcons/Druid/PNG/Icon1.png",
    24:  "../Sprites/AbilityIcons/Druid/PNG/Icon2.png",
    25:  "../Sprites/AbilityIcons/Druid/PNG/Icon3.png",
    26:  "../Sprites/AbilityIcons/Druid/PNG/Icon4.png",
    27:  "../Sprites/AbilityIcons/Druid/PNG/Icon5.png",
    28:  "../Sprites/AbilityIcons/Druid/PNG/Icon6.png",
    29:  "../Sprites/AbilityIcons/Druid/PNG/Icon7.png",
    30:  "../Sprites/AbilityIcons/Druid/PNG/Icon8.png",
    31:  "../Sprites/AbilityIcons/Druid/PNG/Icon9.png",
    32:  "../Sprites/AbilityIcons/Druid/PNG/Icon10.png",
    33:  "../Sprites/AbilityIcons/Druid/PNG/Icon11.png",
    // --- Ice abilities (IDs 34-44) -> Cryomancer ---
    34:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon1.png",
    35:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon2.png",
    36:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon3.png",
    37:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon4.png",
    38:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon5.png",
    39:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon6.png",
    40:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon7.png",
    41:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon8.png",
    42:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon9.png",
    43:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon10.png",
    44:  "../Sprites/AbilityIcons/Cryomancer/PNG/Icon11.png",
    // --- Wind abilities (IDs 45-55) -> Aeromancer ---
    45:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon1Aeromancer.png",
    46:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon10Aeromancer.png",
    47:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon11Aeromancer.png",
    48:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon12Aeromancer.png",
    49:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon13.png",
    50:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon14.png",
    51:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon15.png",
    52:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon16.png",
    53:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon17.png",
    54:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon18.png",
    55:  "../Sprites/AbilityIcons/Aeromancer/PNG/Icon19.png",
    // --- Earth abilities (IDs 56-66) -> Barbarian_skills ---
    56:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon1.png",
    57:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon2.png",
    58:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon3.png",
    59:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon4.png",
    60:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon5.png",
    61:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon6.png",
    62:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon7.png",
    63:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon8.png",
    64:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon9.png",
    65:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon10.png",
    66:  "../Sprites/AbilityIcons/Barbarian_skills/PNG/Icon11.png",
    // --- Electric abilities (IDs 67-77) -> Lightning mage pack ---
    67:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon1.png",
    68:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon2.png",
    69:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon3.png",
    70:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon4.png",
    71:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon5.png",
    72:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon6.png",
    73:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon7.png",
    74:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon8.png",
    75:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon9.png",
    76:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon10.png",
    77:  "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon11.png",
    // --- Dark abilities (IDs 78-88) -> Necromancer Skill Icons ---
    78:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon1.png",
    79:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon2.png",
    80:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon3.png",
    81:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon4.png",
    82:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon5.png",
    83:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon6.png",
    84:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon7.png",
    85:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon8.png",
    86:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon9.png",
    87:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon10.png",
    88:  "../Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon11.png",
    // --- Light abilities (IDs 89-99) -> Paladin ---
    89:  "../Sprites/AbilityIcons/Paladin/PNG/Icon1.png",
    90:  "../Sprites/AbilityIcons/Paladin/PNG/Icon2.png",
    91:  "../Sprites/AbilityIcons/Paladin/PNG/Icon3.png",
    92:  "../Sprites/AbilityIcons/Paladin/PNG/Icon4.png",
    93:  "../Sprites/AbilityIcons/Paladin/PNG/Icon5.png",
    94:  "../Sprites/AbilityIcons/Paladin/PNG/Icon6.png",
    95:  "../Sprites/AbilityIcons/Paladin/PNG/Icon7.png",
    96:  "../Sprites/AbilityIcons/Paladin/PNG/Icon8.png",
    97:  "../Sprites/AbilityIcons/Paladin/PNG/Icon9.png",
    98:  "../Sprites/AbilityIcons/Paladin/PNG/Icon10.png",
    99:  "../Sprites/AbilityIcons/Paladin/PNG/Icon11.png",
    // --- Fairy abilities (IDs 100-110) -> Fairy skills ---
    100: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon1.png",
    101: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon2.png",
    102: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon3.png",
    103: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon4.png",
    104: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon5.png",
    105: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon6.png",
    106: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon7.png",
    107: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon8.png",
    108: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon9.png",
    109: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon10.png",
    110: "../Sprites/AbilityIcons/Fairy skills/PNG/Icon11.png",
    // --- Lunar abilities (IDs 111-121) -> Curse ---
    111: "../Sprites/AbilityIcons/Curse/PNG/Icon1.png",
    112: "../Sprites/AbilityIcons/Curse/PNG/Icon2.png",
    113: "../Sprites/AbilityIcons/Curse/PNG/Icon3.png",
    114: "../Sprites/AbilityIcons/Curse/PNG/Icon4.png",
    115: "../Sprites/AbilityIcons/Curse/PNG/Icon5.png",
    116: "../Sprites/AbilityIcons/Curse/PNG/Icon6.png",
    117: "../Sprites/AbilityIcons/Curse/PNG/Icon7.png",
    118: "../Sprites/AbilityIcons/Curse/PNG/Icon8.png",
    119: "../Sprites/AbilityIcons/Curse/PNG/Icon9.png",
    120: "../Sprites/AbilityIcons/Curse/PNG/Icon10.png",
    121: "../Sprites/AbilityIcons/Curse/PNG/Icon11.png",
    // --- Solar abilities (IDs 122-132) -> Demon_skills ---
    122: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon1.png",
    123: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon2.png",
    124: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon3.png",
    125: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon4.png",
    126: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon5.png",
    127: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon6.png",
    128: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon7.png",
    129: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon8.png",
    130: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon9.png",
    131: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon10.png",
    132: "../Sprites/AbilityIcons/Demon_skills/PNG/Icon11.png",
    // --- Metal abilities (IDs 133-143) -> Blacksmith ---
    133: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon1.png",
    134: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon2.png",
    135: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon3.png",
    136: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon4.png",
    137: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon5.png",
    138: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon6.png",
    139: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon7.png",
    140: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon8.png",
    141: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon9.png",
    142: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon10.png",
    143: "../Sprites/AbilityIcons/Blacksmith/PNG/Icon11.png",
    // --- Poison abilities (IDs 144-154) -> Alchemy1 ---
    144: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon1.png",
    145: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon2.png",
    146: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon3.png",
    147: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon4.png",
    148: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon5.png",
    149: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon6.png",
    150: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon7.png",
    151: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon8.png",
    152: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon9.png",
    153: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon10.png",
    154: "../Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon11.png",
    // --- Class abilities (IDs 155-160) ---
    155: "../Sprites/AbilityIcons/Spearsman/PNG/Icon1.png",
    156: "../Sprites/AbilityIcons/Archer/PNG/BowShot.png",
    157: "../Sprites/AbilityIcons/Lightning mage pack/PNG/Icon1.png",
    158: "../Sprites/AbilityIcons/Swordsman_skills/PNG/Icon1.png",
    159: "../Sprites/AbilityIcons/Priest Skill Icons/PNG/Icon1.png",
    160: "../Sprites/AbilityIcons/Thief/PNG/Icon1.png",
  };

  // -------------------------------------------------------------------------
  // Ability VFX folder paths keyed by element name
  // Points to sprite sheet folders inside AttackEffects/RPG Effect All/Effect and FX/
  // -------------------------------------------------------------------------
  static ABILITY_VFX = {
    "Fire":         "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 16",
    "Fire_alt":     "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 17",
    "Water":        "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 18",
    "Water_alt":    "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 19",
    "Plant":        "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 20",
    "Plant_alt":    "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 21",
    "Ice":          "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 22",
    "Ice_alt":      "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 23",
    "Wind":         "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 24",
    "Wind_alt":     "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 25",
    "Earth":        "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 26",
    "Earth_alt":    "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 27",
    "Electric":     "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 28",
    "Electric_alt": "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 29",
    "Dark":         "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 30",
    "Light":        "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 31",
    "Fairy":        "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 32",
    "Solar":        "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 33",
    "Lunar":        "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 34",
    "Metal":        "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 35",
    "Poison":       "../Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 36",
  };

  // -------------------------------------------------------------------------
  // Battle effect sprite paths (basic combat VFX)
  // -------------------------------------------------------------------------
  static BATTLE_EFFECTS = {
    "attack":    "../Sprites/Effects/attack.png",
    "enemy_hit": "../Sprites/Effects/Enemy Hit.png",
    "flame":     "../Sprites/Effects/Flame.png",
    "freeze":    "../Sprites/Effects/Freeze.png",
    "heal":      "../Sprites/Effects/Heal.png",
    "lightning": "../Sprites/Effects/Lightning.png",
  };

  // -------------------------------------------------------------------------
  // Equipment icon fallback paths by slot_type
  // Weapon icons mapped by element; armor slots use generic items sprite
  // Slot types match EquipmentDatabase: weapon, helmet, chest, legs, boots,
  // gloves, ring, amulet, crystal
  // -------------------------------------------------------------------------
  static EQUIPMENT_SLOT_ICONS = {
    // Weapon icons by element theme
    "weapon_fire":     "../Sprites/Weapons/Fire Theme.png",
    "weapon_water":    "../Sprites/Weapons/Water Theme.png",
    "weapon_plant":    "../Sprites/Weapons/Forest Theme.png",
    "weapon_ice":      "../Sprites/Weapons/Water Theme.png",
    "weapon_wind":     "../Sprites/Weapons/Fairy Theme.png",
    "weapon_earth":    "../Sprites/Weapons/Rock Theme.png",
    "weapon_electric": "../Sprites/Weapons/Electric Theme.png",
    "weapon_dark":     "../Sprites/Weapons/Demon Theme.png",
    "weapon_light":    "../Sprites/Weapons/Golden Angel Theme.png",
    "weapon_fairy":    "../Sprites/Weapons/Fairy Theme.png",
    "weapon_solar":    "../Sprites/Weapons/Lunar Theme.png",
    "weapon_lunar":    "../Sprites/Weapons/Demon Theme.png",
    "weapon_metal":    "../Sprites/Weapons/English Knight Theme.png",
    "weapon_poison":   "../Sprites/Weapons/Bug Theme.png",
    "weapon_default":  "../Sprites/Weapons/Peasant 1 Theme.png",
    // Non-weapon slot fallbacks
    "weapon":  "../Sprites/Weapons/Peasant 1 Theme.png",
    "helmet":  "../Sprites/Objects/items.png",
    "chest":   "../Sprites/Objects/items.png",
    "legs":    "../Sprites/Objects/items.png",
    "boots":   "../Sprites/Objects/items.png",
    "gloves":  "../Sprites/Objects/items.png",
    "ring":    "../Sprites/Objects/items.png",
    "amulet":  "../Sprites/Objects/items.png",
    "crystal": "../Sprites/Objects/items.png",
  };

  // -------------------------------------------------------------------------
  // Consumable icon paths keyed by item_id (matching ConsumableData.gd)
  // Potions: 101-105, Status cures: 111-114, Revival: 121-122,
  // Battle items: 131-133, Utility: 141-142, Element gems: 151-154
  // -------------------------------------------------------------------------
  static CONSUMABLE_ICONS = {
    // Potions (101-105) -> Potions/PNG/Transperent/
    101: "../Sprites/AbilityIcons/Potions/PNG/Transperent/Icon1.png",
    102: "../Sprites/AbilityIcons/Potions/PNG/Transperent/Icon2.png",
    103: "../Sprites/AbilityIcons/Potions/PNG/Transperent/Icon3.png",
    104: "../Sprites/AbilityIcons/Potions/PNG/Transperent/Icon4.png",
    105: "../Sprites/AbilityIcons/Potions/PNG/Transperent/Icon5.png",
    // Status cures (111-114) -> Anti-buffs/PNG/
    111: "../Sprites/AbilityIcons/Anti-buffs/PNG/Icon1.png",
    112: "../Sprites/AbilityIcons/Anti-buffs/PNG/Icon2.png",
    113: "../Sprites/AbilityIcons/Anti-buffs/PNG/Icon3.png",
    114: "../Sprites/AbilityIcons/Anti-buffs/PNG/Icon4.png",
    // Revival items (121-122) -> Potions/PNG/Transperent/
    121: "../Sprites/AbilityIcons/Potions/PNG/Transperent/Icon6.png",
    122: "../Sprites/AbilityIcons/Potions/PNG/Transperent/Icon7.png",
    // Battle items (131-133) -> Buffs/PNG/
    131: "../Sprites/AbilityIcons/Buffs/PNG/Icon1.png",
    132: "../Sprites/AbilityIcons/Buffs/PNG/Icon2.png",
    133: "../Sprites/AbilityIcons/Buffs/PNG/Icon3.png",
    // Utility items (141-142) -> icons 1 (sk1_ pattern)
    141: "../Sprites/AbilityIcons/icons 1/sk1_far_sight_A.png",
    142: "../Sprites/AbilityIcons/icons 1/sk1_greed_A.png",
    // Element gems (151-154) -> Element icons
    151: "../Sprites/ElementIcons/FireElement.png",
    152: "../Sprites/ElementIcons/WaterElement.png",
    153: "../Sprites/ElementIcons/GrassElement.png",
    154: "../Sprites/ElementIcons/IceElement.png",
  };

  // -------------------------------------------------------------------------
  // Crystal (catching) icon paths keyed by item_id (201-208)
  // -------------------------------------------------------------------------
  static CRYSTAL_ICONS = {
    201: "../Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon1.png",
    202: "../Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon2.png",
    203: "../Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon3.png",
    204: "../Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon4.png",
    205: "../Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon5.png",
    206: "../Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon6.png",
    207: "../Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon7.png",
    208: "../Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon8.png",
  };

  // -------------------------------------------------------------------------
  // Status effect icon paths keyed by effect_id (1-24)
  // All share the same atlas; individual frames extracted at runtime.
  // -------------------------------------------------------------------------
  static STATUS_EFFECT_ICONS = {
    1:  "../Sprites/Icons/Status Effects.png",
    2:  "../Sprites/Icons/Status Effects.png",
    3:  "../Sprites/Icons/Status Effects.png",
    4:  "../Sprites/Icons/Status Effects.png",
    5:  "../Sprites/Icons/Status Effects.png",
    6:  "../Sprites/Icons/Status Effects.png",
    7:  "../Sprites/Icons/Status Effects.png",
    8:  "../Sprites/Icons/Status Effects.png",
    9:  "../Sprites/Icons/Status Effects.png",
    10: "../Sprites/Icons/Status Effects.png",
    11: "../Sprites/Icons/Status Effects.png",
    12: "../Sprites/Icons/Status Effects.png",
    13: "../Sprites/Icons/Status Effects.png",
    14: "../Sprites/Icons/Status Effects.png",
    15: "../Sprites/Icons/Status Effects.png",
    16: "../Sprites/Icons/Status Effects.png",
    17: "../Sprites/Icons/Status Effects.png",
    18: "../Sprites/Icons/Status Effects.png",
    19: "../Sprites/Icons/Status Effects.png",
    20: "../Sprites/Icons/Status Effects.png",
    21: "../Sprites/Icons/Status Effects.png",
    22: "../Sprites/Icons/Status Effects.png",
    23: "../Sprites/Icons/Status Effects.png",
    24: "../Sprites/Icons/Status Effects.png",
  };

  // -------------------------------------------------------------------------
  // Status effect VFX paths keyed by effect_id (1-24)
  // Matches StatusEffectDatabase.gd effect_ids exactly
  // -------------------------------------------------------------------------
  static STATUS_EFFECT_VFX = {
    // DoT effects
    1:  "../Sprites/Effects/Flame.png",       // Burn
    2:  "../Sprites/Effects/attack.png",       // Poison
    3:  "../Sprites/Effects/Enemy Hit.png",    // Bleed
    // Disable effects
    4:  "../Sprites/Effects/Freeze.png",       // Freeze
    5:  "../Sprites/Effects/Lightning.png",    // Paralysis
    6:  "../Sprites/Effects/attack.png",       // Sleep
    7:  "../Sprites/Effects/attack.png",       // Confusion
    8:  "../Sprites/Effects/attack.png",       // Fear
    // Stat buff effects
    9:  "../Sprites/Effects/Heal.png",         // ATK Up
    10: "../Sprites/Effects/Heal.png",         // DEF Up
    11: "../Sprites/Effects/Lightning.png",    // SPD Up
    12: "../Sprites/Effects/Heal.png",         // SP.ATK Up
    13: "../Sprites/Effects/Heal.png",         // SP.DEF Up
    14: "../Sprites/Effects/Heal.png",         // Evasion Up
    // Stat debuff effects
    15: "../Sprites/Effects/attack.png",       // ATK Down
    16: "../Sprites/Effects/attack.png",       // DEF Down
    17: "../Sprites/Effects/Freeze.png",       // SPD Down
    18: "../Sprites/Effects/attack.png",       // SP.ATK Down
    19: "../Sprites/Effects/attack.png",       // SP.DEF Down
    20: "../Sprites/Effects/attack.png",       // Accuracy Down
    // Heal / Shield / Special
    21: "../Sprites/Effects/Heal.png",         // Regen
    22: "../Sprites/Effects/Heal.png",         // Shield
    23: "../Sprites/Effects/Enemy Hit.png",    // Taunt
    24: "../Sprites/Effects/Flame.png",        // Curse
  };

  // -------------------------------------------------------------------------
  // Battle background paths keyed by area theme keywords
  // -------------------------------------------------------------------------
  static BATTLE_BACKGROUNDS = {
    "cave":        "../Sprites/Battle Backgrounds/Cave.png",
    "volcanic":    "../Sprites/Battle Backgrounds/Cave.png",
    "underground": "../Sprites/Battle Backgrounds/Cave.png",
    "overworld":   "../Sprites/Battle Backgrounds/Overworld.png",
    "forest":      "../Sprites/Battle Backgrounds/Overworld.png",
    "plains":      "../Sprites/Battle Backgrounds/Overworld.png",
    "route":       "../Sprites/Battle Backgrounds/Overworld.png",
    "town":        "../Sprites/Battle Backgrounds/Overworld.png",
    "beach":       "../Sprites/Battle Backgrounds/Overworld.png",
    "mountain":    "../Sprites/Battle Backgrounds/Cave.png",
    "swamp":       "../Sprites/Battle Backgrounds/Overworld.png",
    "desert":      "../Sprites/Battle Backgrounds/Overworld.png",
    "ruins":       "../Sprites/Battle Backgrounds/Cave.png",
    "temple":      "../Sprites/Battle Backgrounds/Cave.png",
  };

  // -------------------------------------------------------------------------
  // Tileset paths by theme
  // -------------------------------------------------------------------------
  static TILESETS = {
    "cave":                     "../Sprites/Tiles/RogueAdventure/Cavern/RA_Cavern.png",
    "cave_folder":              "../Sprites/Tiles/RogueAdventure/Cavern",
    "town":                     "../Sprites/Tiles/RogueAdventure/Village/RA_Village.png",
    "town_folder":              "../Sprites/Tiles/RogueAdventure/Village",
    "overworld":                "../Sprites/Tiles/RogueAdventure/Overworld/RA_Overworld.png",
    "overworld_folder":         "../Sprites/Tiles/RogueAdventure/Overworld",
    "home":                     "../Sprites/Tiles/RogueAdventure/Interior/RA_Interior.png",
    "home_folder":              "../Sprites/Tiles/RogueAdventure/Interior",
    "fantasy_dreamland":        "../Sprites/Tiles/FantasyDreamland",
    "fantasy_dreamland_reborn": "../Sprites/Tiles/FantasyDreamlandReborn",
    "rogue_adventure":          "../Sprites/Tiles/RogueAdventure",
    "farm_game_world":          "../Sprites/Tiles/FarmGameWorld",
    "buildings":                "../Sprites/Tiles/Buildings",
    "characters":               "../Sprites/Characters",
    "extras":                   "../Sprites/Tiles/Extras",
    "flowers":                  "../Sprites/Tiles/Flowers",
    "icons":                    "../Sprites/Tiles/Icons",
    "prefab_tiles":             "../Sprites/Tiles/PrefabTiles",
  };

  // -------------------------------------------------------------------------
  // Music track paths (Audio/Music/)
  // Tracks with _Intro and _Loop variants should crossfade in AudioManager.
  // -------------------------------------------------------------------------
  static MUSIC = {
    "battle":         "../Audio/Music/Battle_Theme_Loop.wav",
    "battle_intro":   "../Audio/Music/Battle_Theme_Intro.wav",
    "battle_loop":    "../Audio/Music/Battle_Theme_Loop.wav",
    "boss_battle":    "../Audio/Music/Boss_Battle_Loop.wav",
    "boss_battle_intro": "../Audio/Music/Boss_Battle_Intro.wav",
    "boss_battle_loop":  "../Audio/Music/Boss_Battle_Loop.wav",
    "overworld":      "../Audio/Music/Overworld_Theme.wav",
    "town":           "../Audio/Music/Town_Theme.wav",
    "forest":         "../Audio/Music/Deep_Forest.wav",
    "dungeon":        "../Audio/Music/Time_Cave.wav",
    "title":          "../Audio/Music/Title_Screen.wav",
    "victory":        "../Audio/Music/Victory_Fanfare_Loop.wav",
    "victory_intro":  "../Audio/Music/Victory_Fanfare_Intro.wav",
    "victory_loop":   "../Audio/Music/Victory_Fanfare_Loop.wav",
    "game_over":      "../Audio/Music/Game Over.wav",
    "cutscene":       "../Audio/Music/Lullaby_Loop.wav",
    "cutscene_intro": "../Audio/Music/Lullaby_Intro.wav",
    "cutscene_loop":  "../Audio/Music/Lullaby_Loop.wav",
    "villain":        "../Audio/Music/Evil_Gloating_Loop.wav",
    "villain_intro":  "../Audio/Music/Evil_Gloating_Intro.wav",
    "villain_loop":   "../Audio/Music/Evil_Gloating_Loop.wav",
  };

  // -------------------------------------------------------------------------
  // Sound effect paths (Audio/Sounds/)
  // -------------------------------------------------------------------------
  static SFX = {
    "hit":          "../Audio/Sounds/Hit.ogg",
    "menu_confirm": "../Audio/Sounds/Menu Confirm.ogg",
    "menu_cancel":  "../Audio/Sounds/Menu Cancel.ogg",
    "menu_move":    "../Audio/Sounds/Menu Move.ogg",
    "item_confirm": "../Audio/Sounds/Item Confirm.ogg",
    "item_discard": "../Audio/Sounds/Item Discard.ogg",
    "item_use":     "../Audio/Sounds/Item Use.ogg",
    "open":         "../Audio/Sounds/Open.ogg",
    "prompt":       "../Audio/Sounds/Prompt.ogg",
    "recover":      "../Audio/Sounds/Recover.ogg",
  };

  // -------------------------------------------------------------------------
  // Class icon (single atlas -- individual class frames extracted at runtime)
  // -------------------------------------------------------------------------
  static CLASS_ICONS_ATLAS = "../Sprites/ClassIcons/FinishedIcons.png";

  // -------------------------------------------------------------------------
  // Weather effect paths
  // -------------------------------------------------------------------------
  static WEATHER_EFFECTS = {
    "leaves":      "../Sprites/Weather/Leaves",
    "rain_drop":   "../Sprites/Weather/RainDrop",
    "rain_splash": "../Sprites/Weather/RainSplash",
    "snow":        "../Sprites/Weather/SnowFlake",
  };

  // -------------------------------------------------------------------------
  // Fallback / placeholder paths
  // -------------------------------------------------------------------------
  static FALLBACK_SPRITE = "../Sprites/Monsters/Slime.png";
  static FALLBACK_ICON   = "../Sprites/Objects/items.png";
  static FALLBACK_VFX    = "../Sprites/Effects/attack.png";

  // -------------------------------------------------------------------------
  // Race metadata for reverse lookups
  // Maps race_id -> { name, element(s), class }
  // -------------------------------------------------------------------------
  static RACE_META = {
    1:  { name: "Bug Man",      elements: ["Fire"],               class: "Barbarian" },
    2:  { name: "Bear Man",     elements: ["Water"],              class: "Paladin" },
    3:  { name: "Bird Man",     elements: ["Plant"],              class: "Javelin" },
    4:  { name: "Demon",        elements: ["Ice"],                class: "Assassin" },
    5:  { name: "Devil",        elements: ["Wind"],               class: "Archer" },
    6:  { name: "Cat Man",      elements: ["Earth"],              class: "Fighter" },
    7:  { name: "Elf",          elements: ["Electric"],           class: "Wizard" },
    8:  { name: "Ent",          elements: ["Dark"],               class: "Assassin" },
    9:  { name: "Fish Man",     elements: ["Light"],              class: "Cleric" },
    10: { name: "Ghost",        elements: ["Fairy"],              class: "Alchemist" },
    11: { name: "Golem",        elements: ["Solar"],              class: "Wizard" },
    12: { name: "Human",        elements: ["Lunar"],              class: "Barbarian" },
    13: { name: "Lizard Man",   elements: ["Metal"],              class: "Fighter" },
    14: { name: "Minotaur",     elements: ["Poison"],             class: "Javelin" },
    15: { name: "Monkey Man",   elements: ["Fire"],               class: "Paladin" },
    16: { name: "Mummy",        elements: ["Water"],              class: "Archer" },
    17: { name: "Ork",          elements: ["Fire", "Electric"],   class: "Wizard" },
    18: { name: "Rat Man",      elements: ["Poison", "Plant"],    class: "Spearman" },
    19: { name: "Robot",        elements: ["Dark", "Fire"],       class: "Spearman" },
    20: { name: "Shark Man",    elements: ["Ice", "Fairy"],       class: "Cleric" },
    21: { name: "Skeleton",     elements: ["Metal", "Wind"],      class: "Barbarian" },
    22: { name: "Turtle Man",   elements: ["Solar", "Plant"],     class: "Alchemist" },
    23: { name: "Wolf Man",     elements: ["Light", "Lunar"],     class: "Paladin" },
    24: { name: "Zombie",       elements: ["Dark", "Solar"],      class: "Alchemist" },
  };


  // =========================================================================
  //  LOOKUP METHODS
  // =========================================================================

  /**
   * Returns the icon path for the given element name, or the fallback icon.
   * @param {string} elementName
   * @returns {string}
   */
  getElementIcon(elementName) {
    return AssetRegistry.ELEMENT_ICONS[elementName] ?? AssetRegistry.FALLBACK_ICON;
  }

  /**
   * Returns the sprite path for a specific form_id (1-72).
   * @param {number} formId
   * @returns {string}
   */
  getCharacterSprite(formId) {
    return AssetRegistry.CHARACTER_SPRITES[formId] ?? AssetRegistry.FALLBACK_SPRITE;
  }

  /**
   * Returns the character directory name for a specific form_id (1-72).
   * Used to resolve attack, death, and directional animation strips.
   * @param {number} formId
   * @returns {string|null}
   */
  getCharacterSpriteDir(formId) {
    return AssetRegistry.CHARACTER_SPRITE_DIRS[formId] || null;
  }

  /**
   * Returns an array of [stage1_path, stage2_path, stage3_path] for the given race_id (1-24).
   * @param {number} raceId
   * @returns {string[]}
   */
  getRaceSprites(raceId) {
    const baseForm = raceId * 3 - 2;
    return [
      AssetRegistry.CHARACTER_SPRITES[baseForm]     ?? AssetRegistry.FALLBACK_SPRITE,
      AssetRegistry.CHARACTER_SPRITES[baseForm + 1] ?? AssetRegistry.FALLBACK_SPRITE,
      AssetRegistry.CHARACTER_SPRITES[baseForm + 2] ?? AssetRegistry.FALLBACK_SPRITE,
    ];
  }

  /**
   * Returns the race name string for a given race_id, or "Unknown" if not found.
   * @param {number} raceId
   * @returns {string}
   */
  getRaceName(raceId) {
    const meta = AssetRegistry.RACE_META[raceId] ?? {};
    return meta.name ?? "Unknown";
  }

  /**
   * Returns the primary element for a given race_id, or "Fire" as default.
   * @param {number} raceId
   * @returns {string}
   */
  getRacePrimaryElement(raceId) {
    const meta = AssetRegistry.RACE_META[raceId] ?? {};
    const elements = meta.elements ?? ["Fire"];
    return elements[0];
  }

  /**
   * Returns the ability icon path for the given ability_id (1-160).
   * @param {number} abilityId
   * @returns {string}
   */
  getAbilityIcon(abilityId) {
    return AssetRegistry.ABILITY_ICONS[abilityId] ?? AssetRegistry.FALLBACK_ICON;
  }

  /**
   * Returns the VFX folder path for abilities of the given element.
   * @param {string} elementName
   * @returns {string}
   */
  getAbilityVfxFolder(elementName) {
    return AssetRegistry.ABILITY_VFX[elementName] ?? "";
  }

  /**
   * Returns the battle effect sprite path for the given key.
   * @param {string} effectKey
   * @returns {string}
   */
  getBattleEffect(effectKey) {
    return AssetRegistry.BATTLE_EFFECTS[effectKey] ?? AssetRegistry.FALLBACK_VFX;
  }

  /**
   * Returns the equipment icon path for the given equipment_id.
   * Tries to resolve a themed weapon icon based on element, falls back to generic.
   * @param {number} equipmentId
   * @param {string} [slotType="weapon"]
   * @param {string} [element=""]
   * @returns {string}
   */
  getEquipmentIcon(equipmentId, slotType = "weapon", element = "") {
    if (slotType === "weapon" && element !== "") {
      const key = "weapon_" + element.toLowerCase();
      if (key in AssetRegistry.EQUIPMENT_SLOT_ICONS) {
        return AssetRegistry.EQUIPMENT_SLOT_ICONS[key];
      }
      return AssetRegistry.EQUIPMENT_SLOT_ICONS["weapon_default"] ?? AssetRegistry.FALLBACK_ICON;
    }
    return AssetRegistry.EQUIPMENT_SLOT_ICONS[slotType] ?? AssetRegistry.FALLBACK_ICON;
  }

  /**
   * Returns the consumable icon path for the given item_id (101-154).
   * @param {number} itemId
   * @returns {string}
   */
  getConsumableIcon(itemId) {
    return AssetRegistry.CONSUMABLE_ICONS[itemId] ?? AssetRegistry.FALLBACK_ICON;
  }

  /**
   * Returns the crystal icon path for the given item_id (201-208).
   * @param {number} itemId
   * @returns {string}
   */
  getCrystalIcon(itemId) {
    return AssetRegistry.CRYSTAL_ICONS[itemId] ?? AssetRegistry.FALLBACK_ICON;
  }

  /**
   * Returns the status effect icon path (atlas) for the given effect_id (1-24).
   * @param {number} effectId
   * @returns {string}
   */
  getStatusIcon(effectId) {
    return AssetRegistry.STATUS_EFFECT_ICONS[effectId] ?? AssetRegistry.FALLBACK_ICON;
  }

  /**
   * Returns the status effect VFX sprite path for the given effect_id (1-24).
   * @param {number} effectId
   * @returns {string}
   */
  getStatusVfx(effectId) {
    return AssetRegistry.STATUS_EFFECT_VFX[effectId] ?? AssetRegistry.FALLBACK_VFX;
  }

  /**
   * Returns the battle background path for the given area type keyword.
   * @param {string} areaType
   * @returns {string}
   */
  getBattleBackground(areaType) {
    return AssetRegistry.BATTLE_BACKGROUNDS[areaType] ?? "../Sprites/Battle Backgrounds/Overworld.png";
  }

  /**
   * Returns the tileset path for the given theme keyword.
   * @param {string} theme
   * @returns {string}
   */
  getTileset(theme) {
    return AssetRegistry.TILESETS[theme] ?? "../Sprites/Tiles/RogueAdventure/Overworld/RA_Overworld.png";
  }

  /**
   * Returns the music track path for the given track key.
   * For tracks with intro/loop variants, use "battle_intro" / "battle_loop" etc.
   * @param {string} trackKey
   * @returns {string}
   */
  getMusic(trackKey) {
    return AssetRegistry.MUSIC[trackKey] ?? "";
  }

  /**
   * Returns both intro and loop paths for a music track that has them.
   * Returns { intro: path, loop: path }. If no intro exists, intro == loop.
   * @param {string} trackKey
   * @returns {{ intro: string, loop: string }}
   */
  getMusicPair(trackKey) {
    const introKey = trackKey + "_intro";
    const loopKey = trackKey + "_loop";
    const loopPath = AssetRegistry.MUSIC[loopKey] ?? AssetRegistry.MUSIC[trackKey] ?? "";
    const introPath = AssetRegistry.MUSIC[introKey] ?? loopPath;
    return { intro: introPath, loop: loopPath };
  }

  /**
   * Returns the sound effect path for the given SFX key.
   * @param {string} sfxKey
   * @returns {string}
   */
  getSfx(sfxKey) {
    return AssetRegistry.SFX[sfxKey] ?? "";
  }

  /**
   * Returns the weather effect folder path for the given weather key.
   * @param {string} weatherKey
   * @returns {string}
   */
  getWeatherEffect(weatherKey) {
    return AssetRegistry.WEATHER_EFFECTS[weatherKey] ?? "";
  }

  /**
   * Converts a race_id (1-24) and stage (1-3) to a form_id (1-72).
   * @param {number} raceId
   * @param {number} stage
   * @returns {number}
   */
  raceStageToFormId(raceId, stage) {
    return raceId * 3 - 3 + stage;
  }

  /**
   * Converts a form_id (1-72) back to a race_id (1-24) and stage (1-3).
   * @param {number} formId
   * @returns {{ raceId: number, stage: number }}
   */
  formIdToRaceStage(formId) {
    const raceId = Math.ceil(formId / 3.0);
    const stage = formId - (raceId * 3 - 3);
    return { raceId, stage };
  }
}

// Export as a singleton instance for global access (mirrors GDScript autoload)
const assetRegistry = new AssetRegistry();
export default assetRegistry;
export { assetRegistry, AssetRegistry };

## AssetRegistry — Central asset path mapping for all Sprite Wars game entities.
## Provides lookup methods for sprites, icons, VFX, audio, tilesets, and UI assets.
## Loaded as an autoload singleton for global access.
extends Node


# ---------------------------------------------------------------------------
# Element icon path lookup (14 elements)
# ---------------------------------------------------------------------------
const ELEMENT_ICONS: Dictionary = {
	"Fire": "res://Sprites/ElementIcons/FireElement.png",
	"Water": "res://Sprites/ElementIcons/WaterElement.png",
	"Nature": "res://Sprites/ElementIcons/GrassElement.png",
	"Ice": "res://Sprites/ElementIcons/IceElement.png",
	"Air": "res://Sprites/ElementIcons/WindElement.png",
	"Earth": "res://Sprites/ElementIcons/RockElement.png",
	"Electric": "res://Sprites/ElementIcons/LightingElement.png",
	"Dark": "res://Sprites/ElementIcons/DarkElement.png",
	"Light": "res://Sprites/ElementIcons/LightElement.png",
	"Psychic": "res://Sprites/ElementIcons/FairyElement.png",
	"Spirit": "res://Sprites/ElementIcons/LunarElement.png",
	"Chaos": "res://Sprites/ElementIcons/SolarElement.png",
	"Metal": "res://Sprites/ElementIcons/RockElement.png",
	"Poison": "res://Sprites/ElementIcons/GrassElement.png",
}


# ---------------------------------------------------------------------------
# Character sprite paths keyed by form_id (1-72)
# form_id = race_id * 3 - 2 (stage 1), race_id * 3 - 1 (stage 2), race_id * 3 (stage 3)
# 24 races x 3 evolution stages = 72 forms
# ---------------------------------------------------------------------------
const CHARACTER_SPRITES: Dictionary = {
	# Race 1 — Emberpaw (Fire / Berserker)
	1: "res://Sprites/Monsters/Slime.png",
	2: "res://Sprites/Monsters/Slime.png",
	3: "res://Sprites/Monsters/Slime.png",
	# Race 2 — Tidalfin (Water / Guardian)
	4: "res://Sprites/Monsters/Snake.png",
	5: "res://Sprites/Monsters/Snake.png",
	6: "res://Sprites/Monsters/Snake.png",
	# Race 3 — Thornvine (Nature / Ranger)
	7: "res://Sprites/Monsters/Bug.png",
	8: "res://Sprites/Monsters/Bug.png",
	9: "res://Sprites/Monsters/Bug.png",
	# Race 4 — Frostfang (Ice / Assassin)
	10: "res://Sprites/Monsters/Bat.png",
	11: "res://Sprites/Monsters/Bat.png",
	12: "res://Sprites/Monsters/Bat.png",
	# Race 5 — Galecrest (Air / Archer)
	13: "res://Sprites/Monsters/Crow.png",
	14: "res://Sprites/Monsters/Crow.png",
	15: "res://Sprites/Monsters/Crow.png",
	# Race 6 — Terraclaw (Earth / Knight)
	16: "res://Sprites/Monsters/Gourmet.png",
	17: "res://Sprites/Monsters/Gourmet.png",
	18: "res://Sprites/Monsters/Gourmet.png",
	# Race 7 — Voltail (Electric / Wizard)
	19: "res://Sprites/Monsters/Bee.png",
	20: "res://Sprites/Monsters/Bee.png",
	21: "res://Sprites/Monsters/Bee.png",
	# Race 8 — Gloomshade (Dark / Assassin)
	22: "res://Sprites/Monsters/Bat.png",
	23: "res://Sprites/Monsters/Bat.png",
	24: "res://Sprites/Monsters/Bat.png",
	# Race 9 — Luminos (Light / Cleric)
	25: "res://Sprites/Monsters/Bee.png",
	26: "res://Sprites/Monsters/Bee.png",
	27: "res://Sprites/Monsters/Bee.png",
	# Race 10 — Glimmerwing (Psychic / Summoner)
	28: "res://Sprites/Monsters/Bee.png",
	29: "res://Sprites/Monsters/Bee.png",
	30: "res://Sprites/Monsters/Bee.png",
	# Race 11 — Spectrail (Spirit / Wizard)
	31: "res://Sprites/Monsters/Snake.png",
	32: "res://Sprites/Monsters/Snake.png",
	33: "res://Sprites/Monsters/Snake.png",
	# Race 12 — Ignisurge (Chaos / Berserker)
	34: "res://Sprites/Monsters/Slime.png",
	35: "res://Sprites/Monsters/Slime.png",
	36: "res://Sprites/Monsters/Slime.png",
	# Race 13 — Ironhusk (Metal / Knight)
	37: "res://Sprites/Monsters/Bug.png",
	38: "res://Sprites/Monsters/Bug.png",
	39: "res://Sprites/Monsters/Bug.png",
	# Race 14 — Venomire (Poison / Ranger)
	40: "res://Sprites/Monsters/Snake.png",
	41: "res://Sprites/Monsters/Snake.png",
	42: "res://Sprites/Monsters/Snake.png",
	# Race 15 — Blazeguard (Fire / Guardian)
	43: "res://Sprites/Monsters/Gourmet.png",
	44: "res://Sprites/Monsters/Gourmet.png",
	45: "res://Sprites/Monsters/Gourmet.png",
	# Race 16 — Aquashot (Water / Archer)
	46: "res://Sprites/Monsters/Crow.png",
	47: "res://Sprites/Monsters/Crow.png",
	48: "res://Sprites/Monsters/Crow.png",
	# Race 17 — Pyrovolt (Fire+Electric / Wizard)
	49: "res://Sprites/Monsters/Slime.png",
	50: "res://Sprites/Monsters/Slime.png",
	51: "res://Sprites/Monsters/Slime.png",
	# Race 18 — Venomthorn (Poison+Nature / Spearman)
	52: "res://Sprites/Monsters/Bug.png",
	53: "res://Sprites/Monsters/Bug.png",
	54: "res://Sprites/Monsters/Bug.png",
	# Race 19 — Shadowflare (Dark+Fire / Spearman)
	55: "res://Sprites/Monsters/Bat.png",
	56: "res://Sprites/Monsters/Bat.png",
	57: "res://Sprites/Monsters/Bat.png",
	# Race 20 — Crystalmist (Ice+Psychic / Cleric)
	58: "res://Sprites/Monsters/Crow.png",
	59: "res://Sprites/Monsters/Crow.png",
	60: "res://Sprites/Monsters/Crow.png",
	# Race 21 — Ironstorm (Metal+Air / Berserker)
	61: "res://Sprites/Monsters/Crow.png",
	62: "res://Sprites/Monsters/Crow.png",
	63: "res://Sprites/Monsters/Crow.png",
	# Race 22 — Spiritbloom (Spirit+Nature / Summoner)
	64: "res://Sprites/Monsters/Bug.png",
	65: "res://Sprites/Monsters/Bug.png",
	66: "res://Sprites/Monsters/Bug.png",
	# Race 23 — Solarius (Light+Chaos / Guardian) — legendary phoenix
	67: "res://Sprites/Characters/Character 1.png",
	68: "res://Sprites/Characters/Character 1.png",
	69: "res://Sprites/Characters/Character 1.png",
	# Race 24 — Eclipsar (Dark+Spirit / Summoner) — legendary dragon
	70: "res://Sprites/Characters/Character 2.png",
	71: "res://Sprites/Characters/Character 2.png",
	72: "res://Sprites/Characters/Character 2.png",
}


# ---------------------------------------------------------------------------
# Ability icon paths keyed by ability_id (1-160)
# ---------------------------------------------------------------------------
const ABILITY_ICONS: Dictionary = {
	# --- Fire abilities (IDs 1-11) -> Pyromanser ---
	1: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon1.png",
	2: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon2.png",
	3: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon3.png",
	4: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon4.png",
	5: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon5.png",
	6: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon6.png",
	7: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon7.png",
	8: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon8.png",
	9: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon9.png",
	10: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon10.png",
	11: "res://Sprites/AbilityIcons/Pyromanser/PNG/Icon11.png",
	# --- Water abilities (IDs 12-22) -> icons 1 (sk1_ pattern, A variant) ---
	12: "res://Sprites/AbilityIcons/icons 1/sk1_water_burst_A.png",
	13: "res://Sprites/AbilityIcons/icons 1/sk1_ice_burst_A.png",
	14: "res://Sprites/AbilityIcons/icons 1/sk1_ice_spike_A.png",
	15: "res://Sprites/AbilityIcons/icons 1/sk1_storm_A.png",
	16: "res://Sprites/AbilityIcons/icons 1/sk1_cure_A.png",
	17: "res://Sprites/AbilityIcons/icons 1/sk1_regenerate_A.png",
	18: "res://Sprites/AbilityIcons/icons 1/sk1_defense_up_A.png",
	19: "res://Sprites/AbilityIcons/icons 1/sk1_guard_A.png",
	20: "res://Sprites/AbilityIcons/icons 1/sk1_chain_A.png",
	21: "res://Sprites/AbilityIcons/icons 1/sk1_empower_A.png",
	22: "res://Sprites/AbilityIcons/icons 1/sk1_dash_A.png",
	# --- Nature / Plant abilities (IDs 23-33) -> Druid ---
	23: "res://Sprites/AbilityIcons/Druid/PNG/Icon1.png",
	24: "res://Sprites/AbilityIcons/Druid/PNG/Icon2.png",
	25: "res://Sprites/AbilityIcons/Druid/PNG/Icon3.png",
	26: "res://Sprites/AbilityIcons/Druid/PNG/Icon4.png",
	27: "res://Sprites/AbilityIcons/Druid/PNG/Icon5.png",
	28: "res://Sprites/AbilityIcons/Druid/PNG/Icon6.png",
	29: "res://Sprites/AbilityIcons/Druid/PNG/Icon7.png",
	30: "res://Sprites/AbilityIcons/Druid/PNG/Icon8.png",
	31: "res://Sprites/AbilityIcons/Druid/PNG/Icon9.png",
	32: "res://Sprites/AbilityIcons/Druid/PNG/Icon10.png",
	33: "res://Sprites/AbilityIcons/Druid/PNG/Icon11.png",
	# --- Ice abilities (IDs 34-44) -> Cryomancer ---
	34: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon1.png",
	35: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon2.png",
	36: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon3.png",
	37: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon4.png",
	38: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon5.png",
	39: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon6.png",
	40: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon7.png",
	41: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon8.png",
	42: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon9.png",
	43: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon10.png",
	44: "res://Sprites/AbilityIcons/Cryomancer/PNG/Icon11.png",
	# --- Air / Wind abilities (IDs 45-55) -> Aeromancer ---
	45: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon1Aeromancer.png",
	46: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon10Aeromancer.png",
	47: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon11Aeromancer.png",
	48: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon12Aeromancer.png",
	49: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon13.png",
	50: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon14.png",
	51: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon15.png",
	52: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon16.png",
	53: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon17.png",
	54: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon18.png",
	55: "res://Sprites/AbilityIcons/Aeromancer/PNG/Icon19.png",
	# --- Earth abilities (IDs 56-66) -> Barbarian_skills ---
	56: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon1.png",
	57: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon2.png",
	58: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon3.png",
	59: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon4.png",
	60: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon5.png",
	61: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon6.png",
	62: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon7.png",
	63: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon8.png",
	64: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon9.png",
	65: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon10.png",
	66: "res://Sprites/AbilityIcons/Barbarian_skills/PNG/Icon11.png",
	# --- Electric abilities (IDs 67-77) -> Lightning mage pack ---
	67: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon1.png",
	68: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon2.png",
	69: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon3.png",
	70: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon4.png",
	71: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon5.png",
	72: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon6.png",
	73: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon7.png",
	74: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon8.png",
	75: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon9.png",
	76: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon10.png",
	77: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon11.png",
	# --- Dark abilities (IDs 78-88) -> Necromancer Skill Icons ---
	78: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon1.png",
	79: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon2.png",
	80: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon3.png",
	81: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon4.png",
	82: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon5.png",
	83: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon6.png",
	84: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon7.png",
	85: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon8.png",
	86: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon9.png",
	87: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon10.png",
	88: "res://Sprites/AbilityIcons/Necromancer Skill Icons/PNG/Icon11.png",
	# --- Light abilities (IDs 89-99) -> Paladin ---
	89: "res://Sprites/AbilityIcons/Paladin/PNG/Icon1.png",
	90: "res://Sprites/AbilityIcons/Paladin/PNG/Icon2.png",
	91: "res://Sprites/AbilityIcons/Paladin/PNG/Icon3.png",
	92: "res://Sprites/AbilityIcons/Paladin/PNG/Icon4.png",
	93: "res://Sprites/AbilityIcons/Paladin/PNG/Icon5.png",
	94: "res://Sprites/AbilityIcons/Paladin/PNG/Icon6.png",
	95: "res://Sprites/AbilityIcons/Paladin/PNG/Icon7.png",
	96: "res://Sprites/AbilityIcons/Paladin/PNG/Icon8.png",
	97: "res://Sprites/AbilityIcons/Paladin/PNG/Icon9.png",
	98: "res://Sprites/AbilityIcons/Paladin/PNG/Icon10.png",
	99: "res://Sprites/AbilityIcons/Paladin/PNG/Icon11.png",
	# --- Psychic / Fairy abilities (IDs 100-110) -> Fairy skills ---
	100: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon1.png",
	101: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon2.png",
	102: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon3.png",
	103: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon4.png",
	104: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon5.png",
	105: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon6.png",
	106: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon7.png",
	107: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon8.png",
	108: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon9.png",
	109: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon10.png",
	110: "res://Sprites/AbilityIcons/Fairy skills/PNG/Icon11.png",
	# --- Spirit / Lunar abilities (IDs 111-121) -> Curse ---
	111: "res://Sprites/AbilityIcons/Curse/PNG/Icon1.png",
	112: "res://Sprites/AbilityIcons/Curse/PNG/Icon2.png",
	113: "res://Sprites/AbilityIcons/Curse/PNG/Icon3.png",
	114: "res://Sprites/AbilityIcons/Curse/PNG/Icon4.png",
	115: "res://Sprites/AbilityIcons/Curse/PNG/Icon5.png",
	116: "res://Sprites/AbilityIcons/Curse/PNG/Icon6.png",
	117: "res://Sprites/AbilityIcons/Curse/PNG/Icon7.png",
	118: "res://Sprites/AbilityIcons/Curse/PNG/Icon8.png",
	119: "res://Sprites/AbilityIcons/Curse/PNG/Icon9.png",
	120: "res://Sprites/AbilityIcons/Curse/PNG/Icon10.png",
	121: "res://Sprites/AbilityIcons/Curse/PNG/Icon11.png",
	# --- Chaos / Solar abilities (IDs 122-132) -> Demon_skills ---
	122: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon1.png",
	123: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon2.png",
	124: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon3.png",
	125: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon4.png",
	126: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon5.png",
	127: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon6.png",
	128: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon7.png",
	129: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon8.png",
	130: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon9.png",
	131: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon10.png",
	132: "res://Sprites/AbilityIcons/Demon_skills/PNG/Icon11.png",
	# --- Metal abilities (IDs 133-143) -> Blacksmith ---
	133: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon1.png",
	134: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon2.png",
	135: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon3.png",
	136: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon4.png",
	137: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon5.png",
	138: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon6.png",
	139: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon7.png",
	140: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon8.png",
	141: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon9.png",
	142: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon10.png",
	143: "res://Sprites/AbilityIcons/Blacksmith/PNG/Icon11.png",
	# --- Poison abilities (IDs 144-154) -> Alchemy1 ---
	144: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon1.png",
	145: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon2.png",
	146: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon3.png",
	147: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon4.png",
	148: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon5.png",
	149: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon6.png",
	150: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon7.png",
	151: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon8.png",
	152: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon9.png",
	153: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon10.png",
	154: "res://Sprites/AbilityIcons/Alchemy1/PNG/Transperent/Icon11.png",
	# --- Class abilities (IDs 155-160) ---
	155: "res://Sprites/AbilityIcons/Spearsman/PNG/Icon1.png",
	156: "res://Sprites/AbilityIcons/Archer/PNG/BowShot.png",
	157: "res://Sprites/AbilityIcons/Lightning mage pack/PNG/Icon1.png",
	158: "res://Sprites/AbilityIcons/Swordsman_skills/PNG/Icon1.png",
	159: "res://Sprites/AbilityIcons/Priest Skill Icons/PNG/Icon1.png",
	160: "res://Sprites/AbilityIcons/Thief/PNG/Icon1.png",
}


# ---------------------------------------------------------------------------
# Ability VFX folder paths keyed by element name
# Points to sprite sheet folders inside AttackEffects/RPG Effect All/Effect and FX/
# ---------------------------------------------------------------------------
const ABILITY_VFX: Dictionary = {
	"Fire": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 16",
	"Fire_alt": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 17",
	"Water": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 18",
	"Water_alt": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 19",
	"Nature": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 20",
	"Nature_alt": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 21",
	"Ice": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 22",
	"Ice_alt": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 23",
	"Air": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 24",
	"Air_alt": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 25",
	"Earth": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 26",
	"Earth_alt": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 27",
	"Electric": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 28",
	"Electric_alt": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 29",
	"Dark": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 30",
	"Light": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 31",
	"Psychic": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 32",
	"Spirit": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 33",
	"Chaos": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 34",
	"Metal": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 35",
	"Poison": "res://Sprites/AttackEffects/RPG Effect All/Effect and FX/Effects 36",
}


# ---------------------------------------------------------------------------
# Battle effect sprite paths (basic combat VFX)
# ---------------------------------------------------------------------------
const BATTLE_EFFECTS: Dictionary = {
	"attack": "res://Sprites/Effects/attack.png",
	"enemy_hit": "res://Sprites/Effects/Enemy Hit.png",
	"flame": "res://Sprites/Effects/Flame.png",
	"freeze": "res://Sprites/Effects/Freeze.png",
	"heal": "res://Sprites/Effects/Heal.png",
	"lightning": "res://Sprites/Effects/Lightning.png",
}


# ---------------------------------------------------------------------------
# Equipment icon fallback paths by slot_type
# Weapon icons mapped by element; armor slots use generic items sprite
# Slot types match EquipmentDatabase: weapon, helmet, chest, legs, boots,
# gloves, ring, amulet, crystal
# ---------------------------------------------------------------------------
const EQUIPMENT_SLOT_ICONS: Dictionary = {
	# Weapon icons by element theme
	"weapon_fire": "res://Sprites/Weapons/Fire Theme.png",
	"weapon_water": "res://Sprites/Weapons/Water Theme.png",
	"weapon_nature": "res://Sprites/Weapons/Forest Theme.png",
	"weapon_ice": "res://Sprites/Weapons/Water Theme.png",
	"weapon_air": "res://Sprites/Weapons/Fairy Theme.png",
	"weapon_earth": "res://Sprites/Weapons/Rock Theme.png",
	"weapon_electric": "res://Sprites/Weapons/Electric Theme.png",
	"weapon_dark": "res://Sprites/Weapons/Demon Theme.png",
	"weapon_light": "res://Sprites/Weapons/Golden Angel Theme.png",
	"weapon_psychic": "res://Sprites/Weapons/Fairy Theme.png",
	"weapon_spirit": "res://Sprites/Weapons/Lunar Theme.png",
	"weapon_chaos": "res://Sprites/Weapons/Demon Theme.png",
	"weapon_metal": "res://Sprites/Weapons/English Knight Theme.png",
	"weapon_poison": "res://Sprites/Weapons/Bug Theme.png",
	"weapon_default": "res://Sprites/Weapons/Peasant 1 Theme.png",
	# Non-weapon slot fallbacks
	"weapon": "res://Sprites/Weapons/Peasant 1 Theme.png",
	"helmet": "res://Sprites/Objects/items.png",
	"chest": "res://Sprites/Objects/items.png",
	"legs": "res://Sprites/Objects/items.png",
	"boots": "res://Sprites/Objects/items.png",
	"gloves": "res://Sprites/Objects/items.png",
	"ring": "res://Sprites/Objects/items.png",
	"amulet": "res://Sprites/Objects/items.png",
	"crystal": "res://Sprites/Objects/items.png",
}


# ---------------------------------------------------------------------------
# Consumable icon paths keyed by item_id (matching ConsumableData.gd)
# Potions: 101-105, Status cures: 111-114, Revival: 121-122,
# Battle items: 131-133, Utility: 141-142, Element gems: 151-154
# ---------------------------------------------------------------------------
const CONSUMABLE_ICONS: Dictionary = {
	# Potions (101-105) -> Potions/PNG/Transperent/
	101: "res://Sprites/AbilityIcons/Potions/PNG/Transperent/Icon1.png",
	102: "res://Sprites/AbilityIcons/Potions/PNG/Transperent/Icon2.png",
	103: "res://Sprites/AbilityIcons/Potions/PNG/Transperent/Icon3.png",
	104: "res://Sprites/AbilityIcons/Potions/PNG/Transperent/Icon4.png",
	105: "res://Sprites/AbilityIcons/Potions/PNG/Transperent/Icon5.png",
	# Status cures (111-114) -> Anti-buffs/PNG/
	111: "res://Sprites/AbilityIcons/Anti-buffs/PNG/Icon1.png",
	112: "res://Sprites/AbilityIcons/Anti-buffs/PNG/Icon2.png",
	113: "res://Sprites/AbilityIcons/Anti-buffs/PNG/Icon3.png",
	114: "res://Sprites/AbilityIcons/Anti-buffs/PNG/Icon4.png",
	# Revival items (121-122) -> Potions/PNG/Transperent/
	121: "res://Sprites/AbilityIcons/Potions/PNG/Transperent/Icon6.png",
	122: "res://Sprites/AbilityIcons/Potions/PNG/Transperent/Icon7.png",
	# Battle items (131-133) -> Buffs/PNG/
	131: "res://Sprites/AbilityIcons/Buffs/PNG/Icon1.png",
	132: "res://Sprites/AbilityIcons/Buffs/PNG/Icon2.png",
	133: "res://Sprites/AbilityIcons/Buffs/PNG/Icon3.png",
	# Utility items (141-142) -> icons 1 (sk1_ pattern)
	141: "res://Sprites/AbilityIcons/icons 1/sk1_far_sight_A.png",
	142: "res://Sprites/AbilityIcons/icons 1/sk1_greed_A.png",
	# Element gems (151-154) -> Element icons
	151: "res://Sprites/ElementIcons/FireElement.png",
	152: "res://Sprites/ElementIcons/WaterElement.png",
	153: "res://Sprites/ElementIcons/GrassElement.png",
	154: "res://Sprites/ElementIcons/IceElement.png",
}


# ---------------------------------------------------------------------------
# Crystal (catching) icon paths keyed by item_id (201-208)
# ---------------------------------------------------------------------------
const CRYSTAL_ICONS: Dictionary = {
	201: "res://Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon1.png",
	202: "res://Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon2.png",
	203: "res://Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon3.png",
	204: "res://Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon4.png",
	205: "res://Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon5.png",
	206: "res://Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon6.png",
	207: "res://Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon7.png",
	208: "res://Sprites/AbilityIcons/Artefacts/PNG/Transperent/Icon8.png",
}


# ---------------------------------------------------------------------------
# Status effect icon paths keyed by effect_id (1-24)
# All share the same atlas; individual frames extracted at runtime.
# ---------------------------------------------------------------------------
const STATUS_EFFECT_ICONS: Dictionary = {
	1: "res://Sprites/Icons/Status Effects.png",
	2: "res://Sprites/Icons/Status Effects.png",
	3: "res://Sprites/Icons/Status Effects.png",
	4: "res://Sprites/Icons/Status Effects.png",
	5: "res://Sprites/Icons/Status Effects.png",
	6: "res://Sprites/Icons/Status Effects.png",
	7: "res://Sprites/Icons/Status Effects.png",
	8: "res://Sprites/Icons/Status Effects.png",
	9: "res://Sprites/Icons/Status Effects.png",
	10: "res://Sprites/Icons/Status Effects.png",
	11: "res://Sprites/Icons/Status Effects.png",
	12: "res://Sprites/Icons/Status Effects.png",
	13: "res://Sprites/Icons/Status Effects.png",
	14: "res://Sprites/Icons/Status Effects.png",
	15: "res://Sprites/Icons/Status Effects.png",
	16: "res://Sprites/Icons/Status Effects.png",
	17: "res://Sprites/Icons/Status Effects.png",
	18: "res://Sprites/Icons/Status Effects.png",
	19: "res://Sprites/Icons/Status Effects.png",
	20: "res://Sprites/Icons/Status Effects.png",
	21: "res://Sprites/Icons/Status Effects.png",
	22: "res://Sprites/Icons/Status Effects.png",
	23: "res://Sprites/Icons/Status Effects.png",
	24: "res://Sprites/Icons/Status Effects.png",
}


# ---------------------------------------------------------------------------
# Status effect VFX paths keyed by effect_id (1-24)
# Matches StatusEffectDatabase.gd effect_ids exactly
# ---------------------------------------------------------------------------
const STATUS_EFFECT_VFX: Dictionary = {
	# DoT effects
	1: "res://Sprites/Effects/Flame.png",        # Burn
	2: "res://Sprites/Effects/attack.png",        # Poison
	3: "res://Sprites/Effects/Enemy Hit.png",     # Bleed
	# Disable effects
	4: "res://Sprites/Effects/Freeze.png",        # Freeze
	5: "res://Sprites/Effects/Lightning.png",     # Paralysis
	6: "res://Sprites/Effects/attack.png",        # Sleep
	7: "res://Sprites/Effects/attack.png",        # Confusion
	8: "res://Sprites/Effects/attack.png",        # Fear
	# Stat buff effects
	9: "res://Sprites/Effects/Heal.png",          # ATK Up
	10: "res://Sprites/Effects/Heal.png",         # DEF Up
	11: "res://Sprites/Effects/Lightning.png",    # SPD Up
	12: "res://Sprites/Effects/Heal.png",         # SP.ATK Up
	13: "res://Sprites/Effects/Heal.png",         # SP.DEF Up
	14: "res://Sprites/Effects/Heal.png",         # Evasion Up
	# Stat debuff effects
	15: "res://Sprites/Effects/attack.png",       # ATK Down
	16: "res://Sprites/Effects/attack.png",       # DEF Down
	17: "res://Sprites/Effects/Freeze.png",       # SPD Down
	18: "res://Sprites/Effects/attack.png",       # SP.ATK Down
	19: "res://Sprites/Effects/attack.png",       # SP.DEF Down
	20: "res://Sprites/Effects/attack.png",       # Accuracy Down
	# Heal / Shield / Special
	21: "res://Sprites/Effects/Heal.png",         # Regen
	22: "res://Sprites/Effects/Heal.png",         # Shield
	23: "res://Sprites/Effects/Enemy Hit.png",    # Taunt
	24: "res://Sprites/Effects/Flame.png",        # Curse
}


# ---------------------------------------------------------------------------
# Battle background paths keyed by area theme keywords
# ---------------------------------------------------------------------------
const BATTLE_BACKGROUNDS: Dictionary = {
	"cave": "res://Sprites/Battle Backgrounds/Cave.png",
	"volcanic": "res://Sprites/Battle Backgrounds/Cave.png",
	"underground": "res://Sprites/Battle Backgrounds/Cave.png",
	"overworld": "res://Sprites/Battle Backgrounds/Overworld.png",
	"forest": "res://Sprites/Battle Backgrounds/Overworld.png",
	"plains": "res://Sprites/Battle Backgrounds/Overworld.png",
	"route": "res://Sprites/Battle Backgrounds/Overworld.png",
	"town": "res://Sprites/Battle Backgrounds/Overworld.png",
	"beach": "res://Sprites/Battle Backgrounds/Overworld.png",
	"mountain": "res://Sprites/Battle Backgrounds/Cave.png",
	"swamp": "res://Sprites/Battle Backgrounds/Overworld.png",
	"desert": "res://Sprites/Battle Backgrounds/Overworld.png",
	"ruins": "res://Sprites/Battle Backgrounds/Cave.png",
	"temple": "res://Sprites/Battle Backgrounds/Cave.png",
}


# ---------------------------------------------------------------------------
# Tileset paths by theme
# ---------------------------------------------------------------------------
const TILESETS: Dictionary = {
	"cave": "res://Sprites/Tilesets/Cave.png",
	"cave_folder": "res://Sprites/Tilesets/Cave",
	"town": "res://Sprites/Tilesets/Town.png",
	"town_folder": "res://Sprites/Tilesets/Town",
	"overworld": "res://Sprites/Tilesets/Overworld.png",
	"overworld_folder": "res://Sprites/Tilesets/Overworld",
	"home": "res://Sprites/Tilesets/Home.png",
	"home_folder": "res://Sprites/Tilesets/Home",
	"fantasy_dreamland": "res://Sprites/Tiles Sprites/Fantasy Dreamland",
	"fantasy_dreamland_reborn": "res://Sprites/Tiles Sprites/Fantasy Dreamland Reborn",
	"rogue_adventure": "res://Sprites/Tiles Sprites/Rogue Adventure",
	"farm_game_world": "res://Sprites/Tiles Sprites/Farm Game World",
	"buildings": "res://Sprites/Tiles Sprites/Buildings",
	"characters_asai": "res://Sprites/Tiles Sprites/Characters ASAI",
	"extras": "res://Sprites/Tiles Sprites/Extras",
	"flowers": "res://Sprites/Tiles Sprites/Flowers",
	"icons": "res://Sprites/Tiles Sprites/Icons",
	"prefab_tiles": "res://Sprites/Tiles Sprites/Prefab Tiles",
}


# ---------------------------------------------------------------------------
# Music track paths (res://Audio/Music/)
# Tracks with _Intro and _Loop variants should crossfade in AudioManager.
# ---------------------------------------------------------------------------
const MUSIC: Dictionary = {
	"battle": "res://Audio/Music/Battle_Theme_Loop.wav",
	"battle_intro": "res://Audio/Music/Battle_Theme_Intro.wav",
	"battle_loop": "res://Audio/Music/Battle_Theme_Loop.wav",
	"boss_battle": "res://Audio/Music/Boss_Battle_Loop.wav",
	"boss_battle_intro": "res://Audio/Music/Boss_Battle_Intro.wav",
	"boss_battle_loop": "res://Audio/Music/Boss_Battle_Loop.wav",
	"overworld": "res://Audio/Music/Overworld_Theme.wav",
	"town": "res://Audio/Music/Town_Theme.wav",
	"forest": "res://Audio/Music/Deep_Forest.wav",
	"dungeon": "res://Audio/Music/Time_Cave.wav",
	"title": "res://Audio/Music/Title_Screen.wav",
	"victory": "res://Audio/Music/Victory_Fanfare_Loop.wav",
	"victory_intro": "res://Audio/Music/Victory_Fanfare_Intro.wav",
	"victory_loop": "res://Audio/Music/Victory_Fanfare_Loop.wav",
	"game_over": "res://Audio/Music/Game Over.wav",
	"cutscene": "res://Audio/Music/Lullaby_Loop.wav",
	"cutscene_intro": "res://Audio/Music/Lullaby_Intro.wav",
	"cutscene_loop": "res://Audio/Music/Lullaby_Loop.wav",
	"villain": "res://Audio/Music/Evil_Gloating_Loop.wav",
	"villain_intro": "res://Audio/Music/Evil_Gloating_Intro.wav",
	"villain_loop": "res://Audio/Music/Evil_Gloating_Loop.wav",
}


# ---------------------------------------------------------------------------
# Sound effect paths (res://Audio/Sounds/)
# ---------------------------------------------------------------------------
const SFX: Dictionary = {
	"hit": "res://Audio/Sounds/Hit.ogg",
	"menu_confirm": "res://Audio/Sounds/Menu Confirm.ogg",
	"menu_cancel": "res://Audio/Sounds/Menu Cancel.ogg",
	"menu_move": "res://Audio/Sounds/Menu Move.ogg",
	"item_confirm": "res://Audio/Sounds/Item Confirm.ogg",
	"item_discard": "res://Audio/Sounds/Item Discard.ogg",
	"item_use": "res://Audio/Sounds/Item Use.ogg",
	"open": "res://Audio/Sounds/Open.ogg",
	"prompt": "res://Audio/Sounds/Prompt.ogg",
	"recover": "res://Audio/Sounds/Recover.ogg",
}


# ---------------------------------------------------------------------------
# Class icon (single atlas — individual class frames extracted at runtime)
# ---------------------------------------------------------------------------
const CLASS_ICONS_ATLAS: String = "res://Sprites/ClassIcons/FinishedIcons.png"


# ---------------------------------------------------------------------------
# Weather effect paths
# ---------------------------------------------------------------------------
const WEATHER_EFFECTS: Dictionary = {
	"leaves": "res://Sprites/Weather/Leaves",
	"rain_drop": "res://Sprites/Weather/RainDrop",
	"rain_splash": "res://Sprites/Weather/RainSplash",
	"snow": "res://Sprites/Weather/SnowFlake",
}


# ---------------------------------------------------------------------------
# Fallback / placeholder paths
# ---------------------------------------------------------------------------
const FALLBACK_SPRITE: String = "res://Sprites/Monsters/Slime.png"
const FALLBACK_ICON: String = "res://Sprites/Objects/items.png"
const FALLBACK_VFX: String = "res://Sprites/Effects/attack.png"


# ---------------------------------------------------------------------------
# Race metadata for reverse lookups
# Maps race_id -> { name, base_sprite, element(s) }
# ---------------------------------------------------------------------------
const RACE_META: Dictionary = {
	1: { "name": "Emberpaw", "elements": ["Fire"], "class": "Berserker" },
	2: { "name": "Tidalfin", "elements": ["Water"], "class": "Guardian" },
	3: { "name": "Thornvine", "elements": ["Nature"], "class": "Ranger" },
	4: { "name": "Frostfang", "elements": ["Ice"], "class": "Assassin" },
	5: { "name": "Galecrest", "elements": ["Air"], "class": "Archer" },
	6: { "name": "Terraclaw", "elements": ["Earth"], "class": "Knight" },
	7: { "name": "Voltail", "elements": ["Electric"], "class": "Wizard" },
	8: { "name": "Gloomshade", "elements": ["Dark"], "class": "Assassin" },
	9: { "name": "Luminos", "elements": ["Light"], "class": "Cleric" },
	10: { "name": "Glimmerwing", "elements": ["Psychic"], "class": "Summoner" },
	11: { "name": "Spectrail", "elements": ["Spirit"], "class": "Wizard" },
	12: { "name": "Ignisurge", "elements": ["Chaos"], "class": "Berserker" },
	13: { "name": "Ironhusk", "elements": ["Metal"], "class": "Knight" },
	14: { "name": "Venomire", "elements": ["Poison"], "class": "Ranger" },
	15: { "name": "Blazeguard", "elements": ["Fire"], "class": "Guardian" },
	16: { "name": "Aquashot", "elements": ["Water"], "class": "Archer" },
	17: { "name": "Pyrovolt", "elements": ["Fire", "Electric"], "class": "Wizard" },
	18: { "name": "Venomthorn", "elements": ["Poison", "Nature"], "class": "Spearman" },
	19: { "name": "Shadowflare", "elements": ["Dark", "Fire"], "class": "Spearman" },
	20: { "name": "Crystalmist", "elements": ["Ice", "Psychic"], "class": "Cleric" },
	21: { "name": "Ironstorm", "elements": ["Metal", "Air"], "class": "Berserker" },
	22: { "name": "Spiritbloom", "elements": ["Spirit", "Nature"], "class": "Summoner" },
	23: { "name": "Solarius", "elements": ["Light", "Chaos"], "class": "Guardian" },
	24: { "name": "Eclipsar", "elements": ["Dark", "Spirit"], "class": "Summoner" },
}


# ===========================================================================
#  LOOKUP METHODS
# ===========================================================================


## Returns the icon path for the given element name, or the fallback icon.
func get_element_icon(element_name: String) -> String:
	return ELEMENT_ICONS.get(element_name, FALLBACK_ICON)


## Returns the sprite path for a specific form_id (1-72).
func get_character_sprite(form_id: int) -> String:
	return CHARACTER_SPRITES.get(form_id, FALLBACK_SPRITE)


## Returns an array of [stage1_path, stage2_path, stage3_path] for the given race_id (1-24).
func get_race_sprites(race_id: int) -> Array[String]:
	var base_form := race_id * 3 - 2
	return [
		CHARACTER_SPRITES.get(base_form, FALLBACK_SPRITE),
		CHARACTER_SPRITES.get(base_form + 1, FALLBACK_SPRITE),
		CHARACTER_SPRITES.get(base_form + 2, FALLBACK_SPRITE),
	]


## Returns the race name string for a given race_id, or "Unknown" if not found.
func get_race_name(race_id: int) -> String:
	var meta: Dictionary = RACE_META.get(race_id, {})
	return meta.get("name", "Unknown")


## Returns the primary element for a given race_id, or "Fire" as default.
func get_race_primary_element(race_id: int) -> String:
	var meta: Dictionary = RACE_META.get(race_id, {})
	var elements: Array = meta.get("elements", ["Fire"])
	return elements[0]


## Returns the ability icon path for the given ability_id (1-160).
func get_ability_icon(ability_id: int) -> String:
	return ABILITY_ICONS.get(ability_id, FALLBACK_ICON)


## Returns the VFX folder path for abilities of the given element.
func get_ability_vfx_folder(element_name: String) -> String:
	return ABILITY_VFX.get(element_name, "")


## Returns the battle effect sprite path for the given key.
func get_battle_effect(effect_key: String) -> String:
	return BATTLE_EFFECTS.get(effect_key, FALLBACK_VFX)


## Returns the equipment icon path for the given equipment_id.
## Tries to resolve a themed weapon icon based on element, falls back to generic.
func get_equipment_icon(equipment_id: int, slot_type: String = "weapon", element: String = "") -> String:
	if slot_type == "weapon" and element != "":
		var key := "weapon_" + element.to_lower()
		if EQUIPMENT_SLOT_ICONS.has(key):
			return EQUIPMENT_SLOT_ICONS[key]
		return EQUIPMENT_SLOT_ICONS.get("weapon_default", FALLBACK_ICON)
	return EQUIPMENT_SLOT_ICONS.get(slot_type, FALLBACK_ICON)


## Returns the consumable icon path for the given item_id (101-120).
func get_consumable_icon(item_id: int) -> String:
	return CONSUMABLE_ICONS.get(item_id, FALLBACK_ICON)


## Returns the crystal icon path for the given item_id (201-208).
func get_crystal_icon(item_id: int) -> String:
	return CRYSTAL_ICONS.get(item_id, FALLBACK_ICON)


## Returns the status effect icon path (atlas) for the given effect_id (1-24).
func get_status_icon(effect_id: int) -> String:
	return STATUS_EFFECT_ICONS.get(effect_id, FALLBACK_ICON)


## Returns the status effect VFX sprite path for the given effect_id (1-24).
func get_status_vfx(effect_id: int) -> String:
	return STATUS_EFFECT_VFX.get(effect_id, FALLBACK_VFX)


## Returns the battle background path for the given area type keyword.
func get_battle_background(area_type: String) -> String:
	return BATTLE_BACKGROUNDS.get(area_type, "res://Sprites/Battle Backgrounds/Overworld.png")


## Returns the tileset path for the given theme keyword.
func get_tileset(theme: String) -> String:
	return TILESETS.get(theme, "res://Sprites/Tilesets/Overworld.png")


## Returns the music track path for the given track key.
## For tracks with intro/loop variants, use "battle_intro" / "battle_loop" etc.
func get_music(track_key: String) -> String:
	return MUSIC.get(track_key, "")


## Returns both intro and loop paths for a music track that has them.
## Returns { "intro": path, "loop": path }. If no intro exists, intro == loop.
func get_music_pair(track_key: String) -> Dictionary:
	var intro_key := track_key + "_intro"
	var loop_key := track_key + "_loop"
	var loop_path: String = MUSIC.get(loop_key, MUSIC.get(track_key, ""))
	var intro_path: String = MUSIC.get(intro_key, loop_path)
	return { "intro": intro_path, "loop": loop_path }


## Returns the sound effect path for the given SFX key.
func get_sfx(sfx_key: String) -> String:
	return SFX.get(sfx_key, "")


## Returns the weather effect folder path for the given weather key.
func get_weather_effect(weather_key: String) -> String:
	return WEATHER_EFFECTS.get(weather_key, "")


## Converts a race_id (1-24) and stage (1-3) to a form_id (1-72).
func race_stage_to_form_id(race_id: int, stage: int) -> int:
	return race_id * 3 - 3 + stage


## Converts a form_id (1-72) back to a race_id (1-24) and stage (1-3).
func form_id_to_race_stage(form_id: int) -> Dictionary:
	var race_id := ceili(float(form_id) / 3.0)
	var stage := form_id - (race_id * 3 - 3)
	return { "race_id": race_id, "stage": stage }

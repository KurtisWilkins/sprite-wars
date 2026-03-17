/**
 * EquipmentVisualConfig.js — Unique visual configurations for all 144 equipment items.
 * Maps equipment_id to cel-shaded rendering parameters for the SkeletalAnimationSystem.
 *
 * Equipment ID ranges:
 *   Base (54):     1001-1006 weapon, 1011-1016 helmet, 1021-1026 chest,
 *                  1031-1036 legs, 1041-1046 boots, 1051-1056 gloves,
 *                  1061-1066 ring, 1071-1076 amulet, 1081-1086 crystal
 *   Expanded (90): 1101-1110 weapon, 1111-1120 helmet, 1121-1130 chest,
 *                  1131-1140 legs, 1141-1150 boots, 1151-1160 gloves,
 *                  1161-1170 ring, 1171-1180 amulet, 1181-1190 crystal
 *
 * Every item has a completely unique color palette and visual signature so players
 * can identify any piece of equipment at a glance on 32×32 sprites.
 */

export const EQUIPMENT_VISUALS = {

	// ══════════════════════════════════════════════════════════════════════════
	// WEAPONS  (slot: "weapon")  —  16 items
	// ══════════════════════════════════════════════════════════════════════════

	// 1001 — Iron Sword (common)
	1001: {
		shape: 'sword',
		bladeColor: '#A8A8A8',
		bladeHighlight: '#C8C8C8',
		handleColor: '#6B4226',
		guardColor: '#7A7A7A',
		glowColor: null,
		bladeLength: 10,
		bladeWidth: 2,
		hasParticles: false,
		particleColor: '#FFFFFF'
	},

	// 1002 — Steel Blade (common)
	1002: {
		shape: 'sword',
		bladeColor: '#C0C0C0',
		bladeHighlight: '#E8E8E8',
		handleColor: '#4A3520',
		guardColor: '#8E8E8E',
		glowColor: null,
		bladeLength: 11,
		bladeWidth: 2,
		hasParticles: false,
		particleColor: '#FFFFFF'
	},

	// 1003 — Flame Sword (uncommon, Fire)
	1003: {
		shape: 'sword',
		bladeColor: '#E85820',
		bladeHighlight: '#FF9E44',
		handleColor: '#5C1A00',
		guardColor: '#B84400',
		glowColor: '#FF6600',
		bladeLength: 11,
		bladeWidth: 2,
		hasParticles: true,
		particleColor: '#FF4400'
	},

	// 1004 — Tempest Blade (rare, Air)
	1004: {
		shape: 'sword',
		bladeColor: '#88E0F0',
		bladeHighlight: '#CCFFFF',
		handleColor: '#3A5C6E',
		guardColor: '#66B8CC',
		glowColor: '#00DDFF',
		bladeLength: 12,
		bladeWidth: 2,
		hasParticles: true,
		particleColor: '#AAEEFF'
	},

	// 1005 — Shadow Edge (epic, Dark)
	1005: {
		shape: 'sword',
		bladeColor: '#4A1060',
		bladeHighlight: '#8830A8',
		handleColor: '#1A0A20',
		guardColor: '#6B2090',
		glowColor: '#9B30FF',
		bladeLength: 13,
		bladeWidth: 2,
		hasParticles: true,
		particleColor: '#7B00CC'
	},

	// 1006 — Excalibur (legendary, Light)
	1006: {
		shape: 'broadsword',
		bladeColor: '#FFE066',
		bladeHighlight: '#FFFFF0',
		handleColor: '#8B7332',
		guardColor: '#DAA520',
		glowColor: '#FFDD00',
		bladeLength: 14,
		bladeWidth: 3,
		hasParticles: true,
		particleColor: '#FFF8AA'
	},

	// 1101 — Wraithcleaver (uncommon, Dark)
	1101: {
		shape: 'axe',
		bladeColor: '#3CB89C',
		bladeHighlight: '#80FFD4',
		handleColor: '#2A3A30',
		guardColor: '#2D8C74',
		glowColor: '#40E0B0',
		bladeLength: 10,
		bladeWidth: 3,
		hasParticles: true,
		particleColor: '#66FFCC'
	},

	// 1102 — Voidfang Dagger (rare, Dark)
	1102: {
		shape: 'dagger',
		bladeColor: '#5C2D91',
		bladeHighlight: '#9B59B6',
		handleColor: '#120824',
		guardColor: '#3D1A5C',
		glowColor: '#7B3FA0',
		bladeLength: 8,
		bladeWidth: 1,
		hasParticles: true,
		particleColor: '#8E44AD'
	},

	// 1103 — Stormbreaker Axe (rare, Electric)
	1103: {
		shape: 'greataxe',
		bladeColor: '#E8D020',
		bladeHighlight: '#FFF580',
		handleColor: '#4A3B10',
		guardColor: '#B8A418',
		glowColor: '#FFE800',
		bladeLength: 13,
		bladeWidth: 3,
		hasParticles: true,
		particleColor: '#FFF200'
	},

	// 1104 — Serpent's Kiss (epic, Poison)
	1104: {
		shape: 'scimitar',
		bladeColor: '#2ECC40',
		bladeHighlight: '#6EF080',
		handleColor: '#1A4A1A',
		guardColor: '#1D8C2F',
		glowColor: '#39FF14',
		bladeLength: 12,
		bladeWidth: 2,
		hasParticles: true,
		particleColor: '#00FF41'
	},

	// 1105 — Celestial Warblade (epic, Light)
	1105: {
		shape: 'broadsword',
		bladeColor: '#FFD700',
		bladeHighlight: '#FFFDE0',
		handleColor: '#705818',
		guardColor: '#CCAC00',
		glowColor: '#FFE44D',
		bladeLength: 14,
		bladeWidth: 3,
		hasParticles: true,
		particleColor: '#FFFACD'
	},

	// 1106 — Bonecrusher Mace (uncommon, Earth)
	1106: {
		shape: 'mace',
		bladeColor: '#8B7355',
		bladeHighlight: '#B09878',
		handleColor: '#5C4A32',
		guardColor: '#706048',
		glowColor: null,
		bladeLength: 10,
		bladeWidth: 3,
		hasParticles: false,
		particleColor: '#B8A080'
	},

	// 1107 — Frostbite Katana (rare, Ice)
	1107: {
		shape: 'katana',
		bladeColor: '#70C8E8',
		bladeHighlight: '#C0F0FF',
		handleColor: '#283848',
		guardColor: '#4890B0',
		glowColor: '#80D8F0',
		bladeLength: 14,
		bladeWidth: 1,
		hasParticles: true,
		particleColor: '#A0E8FF'
	},

	// 1108 — Thunderlord's Gavel (epic, Electric)
	1108: {
		shape: 'hammer',
		bladeColor: '#DAA520',
		bladeHighlight: '#FFD24D',
		handleColor: '#3D2B08',
		guardColor: '#B88C18',
		glowColor: '#FFD700',
		bladeLength: 12,
		bladeWidth: 3,
		hasParticles: true,
		particleColor: '#FFEE58'
	},

	// 1109 — Moonfire Scythe (legendary, Spirit)
	1109: {
		shape: 'scythe',
		bladeColor: '#B0C4DE',
		bladeHighlight: '#E8F0FF',
		handleColor: '#2C3848',
		guardColor: '#7890A8',
		glowColor: '#C0D8F0',
		bladeLength: 16,
		bladeWidth: 2,
		hasParticles: true,
		particleColor: '#D8ECFF'
	},

	// 1110 — Dreadnought Blade (legendary, Chaos)
	1110: {
		shape: 'sword',
		bladeColor: '#C41E3A',
		bladeHighlight: '#FF4060',
		handleColor: '#1A0A0E',
		guardColor: '#8B1025',
		glowColor: '#FF2040',
		bladeLength: 16,
		bladeWidth: 3,
		hasParticles: true,
		particleColor: '#FF0033'
	},

	// ══════════════════════════════════════════════════════════════════════════
	// HELMETS  (slot: "helmet")  —  16 items
	// ══════════════════════════════════════════════════════════════════════════

	// 1011 — Leather Cap (common)
	1011: {
		style: 'cap',
		mainColor: '#8B6934',
		trimColor: '#6B4F24',
		gemColor: null,
		height: 2,
		width: 0,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: null,
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1012 — Iron Helm (common)
	1012: {
		style: 'helm',
		mainColor: '#909090',
		trimColor: '#6E6E6E',
		gemColor: null,
		height: 3,
		width: 1,
		hasVisor: true,
		visorColor: '#505050',
		glowColor: null,
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1013 — Frost Circlet (uncommon, Ice)
	1013: {
		style: 'circlet',
		mainColor: '#82CFEE',
		trimColor: '#5AAEC8',
		gemColor: '#AAEEFF',
		height: 2,
		width: 1,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#60D0F0',
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1014 — Thunder Crown (rare, Electric)
	1014: {
		style: 'crown',
		mainColor: '#FFD700',
		trimColor: '#CCAC00',
		gemColor: '#FFF44F',
		height: 4,
		width: 2,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#FFE44D',
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1015 — Dragonscale Helm (epic, Fire)
	1015: {
		style: 'helm',
		mainColor: '#D44A1A',
		trimColor: '#FF6B3A',
		gemColor: '#FF3300',
		height: 5,
		width: 2,
		hasVisor: true,
		visorColor: '#8B2010',
		glowColor: '#FF4500',
		hasPlume: true,
		plumeColor: '#FF6600'
	},

	// 1016 — Crown of the Ancients (legendary, Spirit)
	1016: {
		style: 'crown',
		mainColor: '#B0C4DE',
		trimColor: '#D8E8FF',
		gemColor: '#E0E8FF',
		height: 6,
		width: 3,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#C8D8FF',
		hasPlume: true,
		plumeColor: '#A8C0E0'
	},

	// 1111 — Ironjaw Visor (common)
	1111: {
		style: 'visor',
		mainColor: '#606060',
		trimColor: '#484848',
		gemColor: null,
		height: 3,
		width: 1,
		hasVisor: true,
		visorColor: '#3A3A3A',
		glowColor: null,
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1112 — Mystic Turban (uncommon, Psychic)
	1112: {
		style: 'turban',
		mainColor: '#8844AA',
		trimColor: '#6B2D8E',
		gemColor: '#CC66FF',
		height: 4,
		width: 1,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#AA55DD',
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1113 — Blazeguard Helm (rare, Fire)
	1113: {
		style: 'helm',
		mainColor: '#CC3300',
		trimColor: '#FF5500',
		gemColor: '#FF8800',
		height: 4,
		width: 2,
		hasVisor: true,
		visorColor: '#991F00',
		glowColor: '#FF4400',
		hasPlume: true,
		plumeColor: '#FF6622'
	},

	// 1114 — Deepwater Cowl (uncommon, Water)
	1114: {
		style: 'cowl',
		mainColor: '#2C6E9E',
		trimColor: '#1A4E7A',
		gemColor: null,
		height: 3,
		width: 1,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#3080B0',
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1115 — Stormcaller Coronet (epic, Electric)
	1115: {
		style: 'coronet',
		mainColor: '#F0C800',
		trimColor: '#FFE040',
		gemColor: '#FFFF66',
		height: 3,
		width: 2,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#FFE000',
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1116 — Shadow Veil (rare, Dark)
	1116: {
		style: 'veil',
		mainColor: '#3D1F5C',
		trimColor: '#5A2E8A',
		gemColor: '#8040B0',
		height: 3,
		width: 1,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#6030A0',
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1117 — Sunforged Diadem (epic, Light)
	1117: {
		style: 'diadem',
		mainColor: '#FFD000',
		trimColor: '#FFF0A0',
		gemColor: '#FFFBE0',
		height: 3,
		width: 2,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#FFDD33',
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1118 — Venom Hood (uncommon, Poison)
	1118: {
		style: 'hood',
		mainColor: '#3A7A28',
		trimColor: '#2A5C1C',
		gemColor: null,
		height: 3,
		width: 1,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#44AA22',
		hasPlume: false,
		plumeColor: '#000000'
	},

	// 1119 — Starfall Crown (legendary, Spirit+Psychic)
	1119: {
		style: 'crown',
		mainColor: '#C0C8E0',
		trimColor: '#E0E8FF',
		gemColor: '#F0F0FF',
		height: 5,
		width: 3,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#D0D8FF',
		hasPlume: true,
		plumeColor: '#E8E0FF'
	},

	// 1120 — Primeval Antlers (legendary, Nature)
	1120: {
		style: 'antlers',
		mainColor: '#6B4E2E',
		trimColor: '#8B6E44',
		gemColor: '#44CC44',
		height: 6,
		width: 3,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: '#33BB33',
		hasPlume: false,
		plumeColor: '#000000'
	},

	// ══════════════════════════════════════════════════════════════════════════
	// CHEST ARMOR  (slot: "chest")  —  16 items
	// ══════════════════════════════════════════════════════════════════════════

	// 1021 — Cloth Tunic (common)
	1021: {
		style: 'tunic',
		mainColor: '#C8B080',
		trimColor: '#A08858',
		accentColor: '#B09868',
		hasShoulders: false,
		shoulderColor: '#000000',
		hasBelt: true,
		beltColor: '#705830',
		glowColor: null,
		pattern: 'none'
	},

	// 1022 — Chainmail Vest (common)
	1022: {
		style: 'mail',
		mainColor: '#B0B0B0',
		trimColor: '#888888',
		accentColor: '#989898',
		hasShoulders: false,
		shoulderColor: '#000000',
		hasBelt: true,
		beltColor: '#5C4020',
		glowColor: null,
		pattern: 'chains'
	},

	// 1023 — Verdant Robe (uncommon, Nature)
	1023: {
		style: 'robe',
		mainColor: '#3DAA50',
		trimColor: '#2D8840',
		accentColor: '#4FCC66',
		hasShoulders: false,
		shoulderColor: '#000000',
		hasBelt: true,
		beltColor: '#5A7040',
		glowColor: '#44BB55',
		pattern: 'none'
	},

	// 1024 — Abyssal Plate (rare, Dark)
	1024: {
		style: 'plate',
		mainColor: '#3D1852',
		trimColor: '#5C2878',
		accentColor: '#4E2066',
		hasShoulders: true,
		shoulderColor: '#5A2880',
		hasBelt: true,
		beltColor: '#2A1038',
		glowColor: '#7030A0',
		pattern: 'runes'
	},

	// 1025 — Stormweave Armor (epic, Electric)
	1025: {
		style: 'plate',
		mainColor: '#4488CC',
		trimColor: '#DDEEFF',
		accentColor: '#66AAEE',
		hasShoulders: true,
		shoulderColor: '#5599DD',
		hasBelt: true,
		beltColor: '#336699',
		glowColor: '#88CCFF',
		pattern: 'runes'
	},

	// 1026 — Aegis of Solarius (legendary, Light)
	1026: {
		style: 'plate',
		mainColor: '#F0D060',
		trimColor: '#FFF0B0',
		accentColor: '#FFE880',
		hasShoulders: true,
		shoulderColor: '#E8C840',
		hasBelt: true,
		beltColor: '#B89830',
		glowColor: '#FFE44D',
		pattern: 'runes'
	},

	// 1121 — Wolfhide Jerkin (common)
	1121: {
		style: 'jerkin',
		mainColor: '#7A6A58',
		trimColor: '#5C4E40',
		accentColor: '#6B5C4A',
		hasShoulders: false,
		shoulderColor: '#000000',
		hasBelt: true,
		beltColor: '#4A3C2E',
		glowColor: null,
		pattern: 'none'
	},

	// 1122 — Embersteel Cuirass (uncommon, Fire)
	1122: {
		style: 'cuirass',
		mainColor: '#CC4420',
		trimColor: '#FF6644',
		accentColor: '#DD5530',
		hasShoulders: true,
		shoulderColor: '#B83818',
		hasBelt: true,
		beltColor: '#882210',
		glowColor: '#FF5500',
		pattern: 'none'
	},

	// 1123 — Tidewoven Cloak (uncommon, Water)
	1123: {
		style: 'cloak',
		mainColor: '#3070AA',
		trimColor: '#5090CC',
		accentColor: '#4080BB',
		hasShoulders: false,
		shoulderColor: '#000000',
		hasBelt: false,
		beltColor: '#000000',
		glowColor: '#4488CC',
		pattern: 'none'
	},

	// 1124 — Thunderscale Mail (rare, Electric)
	1124: {
		style: 'mail',
		mainColor: '#D4B830',
		trimColor: '#FFE060',
		accentColor: '#E0C840',
		hasShoulders: true,
		shoulderColor: '#C0A828',
		hasBelt: true,
		beltColor: '#8A7A18',
		glowColor: '#FFE040',
		pattern: 'scales'
	},

	// 1125 — Shadow Silk Robe (rare, Dark)
	1125: {
		style: 'robe',
		mainColor: '#3A1A58',
		trimColor: '#582888',
		accentColor: '#4A2070',
		hasShoulders: false,
		shoulderColor: '#000000',
		hasBelt: true,
		beltColor: '#2A1040',
		glowColor: '#6828A0',
		pattern: 'runes'
	},

	// 1126 — Nature's Embrace (epic, Nature)
	1126: {
		style: 'plate',
		mainColor: '#2E8B40',
		trimColor: '#50CC60',
		accentColor: '#3EAA50',
		hasShoulders: true,
		shoulderColor: '#268832',
		hasBelt: true,
		beltColor: '#1C6624',
		glowColor: '#44DD55',
		pattern: 'scales'
	},

	// 1127 — Voidwalker Plate (epic, Dark+Spirit)
	1127: {
		style: 'plate',
		mainColor: '#2C1858',
		trimColor: '#5030A0',
		accentColor: '#3A2070',
		hasShoulders: true,
		shoulderColor: '#4028A0',
		hasBelt: true,
		beltColor: '#1A1040',
		glowColor: '#5038B0',
		pattern: 'runes'
	},

	// 1128 — Crystal Lattice Armor (rare, Metal+Ice)
	1128: {
		style: 'plate',
		mainColor: '#E0E8F0',
		trimColor: '#F0F4FF',
		accentColor: '#C8D8E8',
		hasShoulders: true,
		shoulderColor: '#D0DCE8',
		hasBelt: true,
		beltColor: '#A0B0C0',
		glowColor: '#E8F0FF',
		pattern: 'crystal'
	},

	// 1129 — Phoenixfeather Mantle (legendary, Fire+Air)
	1129: {
		style: 'mantle',
		mainColor: '#E04010',
		trimColor: '#FF8040',
		accentColor: '#FF6020',
		hasShoulders: true,
		shoulderColor: '#CC3008',
		hasBelt: false,
		beltColor: '#000000',
		glowColor: '#FF5020',
		pattern: 'scales'
	},

	// 1130 — Worldbreaker Harness (legendary, Earth+Chaos)
	1130: {
		style: 'harness',
		mainColor: '#8B5A2B',
		trimColor: '#CC3030',
		accentColor: '#A06030',
		hasShoulders: true,
		shoulderColor: '#B04020',
		hasBelt: true,
		beltColor: '#6A3A18',
		glowColor: '#DD4422',
		pattern: 'runes'
	},

	// ══════════════════════════════════════════════════════════════════════════
	// LEGS  (slot: "legs")  —  16 items
	// ══════════════════════════════════════════════════════════════════════════

	// 1031 — Cloth Leggings (common)
	1031: {
		style: 'leggings',
		mainColor: '#C8B080',
		trimColor: '#A09060',
		kneeColor: '#B8A070',
		hasKneePlates: false,
		glowColor: null
	},

	// 1032 — Reinforced Greaves (common)
	1032: {
		style: 'greaves',
		mainColor: '#909090',
		trimColor: '#707070',
		kneeColor: '#A0A0A0',
		hasKneePlates: true,
		glowColor: null
	},

	// 1033 — Sandstone Guards (uncommon, Earth)
	1033: {
		style: 'guards',
		mainColor: '#C4A86C',
		trimColor: '#A88C50',
		kneeColor: '#D4B878',
		hasKneePlates: true,
		glowColor: '#D0B870'
	},

	// 1034 — Venom-Laced Cuisses (rare, Poison)
	1034: {
		style: 'cuisses',
		mainColor: '#3DAA40',
		trimColor: '#6B2D8E',
		kneeColor: '#50CC55',
		hasKneePlates: true,
		glowColor: '#44BB33'
	},

	// 1035 — Glacial Legplates (epic, Ice)
	1035: {
		style: 'greaves',
		mainColor: '#70B8E0',
		trimColor: '#A0D8F0',
		kneeColor: '#90D0F0',
		hasKneePlates: true,
		glowColor: '#88D4F0'
	},

	// 1036 — Greaves of the Worldwalker (legendary, Earth)
	1036: {
		style: 'greaves',
		mainColor: '#8B6A3E',
		trimColor: '#DAA520',
		kneeColor: '#C0982E',
		hasKneePlates: true,
		glowColor: '#D4A828'
	},

	// 1131 — Pathfinder Chaps (common)
	1131: {
		style: 'chaps',
		mainColor: '#C8A878',
		trimColor: '#A88858',
		kneeColor: '#B89868',
		hasKneePlates: false,
		glowColor: null
	},

	// 1132 — Ironroot Legguards (uncommon, Nature+Metal)
	1132: {
		style: 'guards',
		mainColor: '#6E8060',
		trimColor: '#8A8A78',
		kneeColor: '#7A907A',
		hasKneePlates: true,
		glowColor: '#7A9E6A'
	},

	// 1133 — Mistweaver Pants (uncommon, Air)
	1133: {
		style: 'pants',
		mainColor: '#B8C8D0',
		trimColor: '#D0D8E0',
		kneeColor: '#C4D0D8',
		hasKneePlates: false,
		glowColor: '#C0D4E0'
	},

	// 1134 — Blazewalk Greaves (rare, Fire)
	1134: {
		style: 'greaves',
		mainColor: '#CC4418',
		trimColor: '#FF6830',
		kneeColor: '#E05828',
		hasKneePlates: true,
		glowColor: '#FF5020'
	},

	// 1135 — Moonlit Trousers (rare, Spirit)
	1135: {
		style: 'pants',
		mainColor: '#8AACC8',
		trimColor: '#B0CCE0',
		kneeColor: '#A0BCD0',
		hasKneePlates: false,
		glowColor: '#A8C8E0'
	},

	// 1136 — Stormsurge Cuisses (epic, Electric+Water)
	1136: {
		style: 'cuisses',
		mainColor: '#2870A8',
		trimColor: '#E8D020',
		kneeColor: '#4888B8',
		hasKneePlates: true,
		glowColor: '#50A0D0'
	},

	// 1137 — Deathstalker Leggings (epic, Dark+Poison)
	1137: {
		style: 'leggings',
		mainColor: '#2A3A20',
		trimColor: '#5C2878',
		kneeColor: '#3C5030',
		hasKneePlates: true,
		glowColor: '#446830'
	},

	// 1138 — Sunblessed Tassets (rare, Light)
	1138: {
		style: 'tassets',
		mainColor: '#F0D860',
		trimColor: '#FFF0A0',
		kneeColor: '#E8D050',
		hasKneePlates: false,
		glowColor: '#FFE860'
	},

	// 1139 — Void-Touched Greaves (legendary, Dark+Chaos)
	1139: {
		style: 'greaves',
		mainColor: '#4A1030',
		trimColor: '#8820A0',
		kneeColor: '#6A1848',
		hasKneePlates: true,
		glowColor: '#7A18A0'
	},

	// 1140 — Titan's Stride (legendary, Earth+Metal)
	1140: {
		style: 'greaves',
		mainColor: '#B08040',
		trimColor: '#D0A060',
		kneeColor: '#C09050',
		hasKneePlates: true,
		glowColor: '#C89848'
	},

	// ══════════════════════════════════════════════════════════════════════════
	// BOOTS  (slot: "boots")  —  16 items
	// ══════════════════════════════════════════════════════════════════════════

	// 1041 — Worn Sandals (common)
	1041: {
		style: 'sandals',
		mainColor: '#C4A06C',
		soleColor: '#8B6934',
		tongueColor: '#B89060',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: false,
		buckleColor: '#000000',
		glowColor: null
	},

	// 1042 — Scout Boots (common)
	1042: {
		style: 'boots',
		mainColor: '#5C3D1E',
		soleColor: '#3A2810',
		tongueColor: '#6B4A28',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: true,
		buckleColor: '#8A8A8A',
		glowColor: null
	},

	// 1043 — Windrunner Boots (uncommon, Air)
	1043: {
		style: 'boots',
		mainColor: '#B0BCC8',
		soleColor: '#8898A8',
		tongueColor: '#C0CCD8',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: true,
		buckleColor: '#D0DCE8',
		glowColor: '#C0D0E0'
	},

	// 1044 — Tidewalker Boots (rare, Water)
	1044: {
		style: 'boots',
		mainColor: '#2878B0',
		soleColor: '#1A5888',
		tongueColor: '#3890C8',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: true,
		buckleColor: '#48A8D8',
		glowColor: '#3898C8'
	},

	// 1045 — Shadowstep Treads (epic, Dark)
	1045: {
		style: 'treads',
		mainColor: '#38184E',
		soleColor: '#200E30',
		tongueColor: '#4A2068',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: false,
		buckleColor: '#000000',
		glowColor: '#5830A0'
	},

	// 1046 — Hermes Wings (legendary, Air)
	1046: {
		style: 'sandals',
		mainColor: '#F0D060',
		soleColor: '#C8A830',
		tongueColor: '#FFE080',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: true,
		buckleColor: '#FFE860',
		glowColor: '#FFE040'
	},

	// 1141 — Rootwalker Treads (common)
	1141: {
		style: 'treads',
		mainColor: '#7A5C38',
		soleColor: '#5A4024',
		tongueColor: '#8A6C48',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: false,
		buckleColor: '#000000',
		glowColor: null
	},

	// 1142 — Ashstepper Boots (uncommon, Fire)
	1142: {
		style: 'boots',
		mainColor: '#A04030',
		soleColor: '#6E2820',
		tongueColor: '#B85040',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: true,
		buckleColor: '#CC6050',
		glowColor: '#CC4430'
	},

	// 1143 — Frostglide Sabatons (uncommon, Ice)
	1143: {
		style: 'sabatons',
		mainColor: '#80C0E0',
		soleColor: '#5898B8',
		tongueColor: '#A0D4F0',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: true,
		buckleColor: '#B0E0F8',
		glowColor: '#90D0F0'
	},

	// 1144 — Skystrider Kicks (rare, Air)
	1144: {
		style: 'kicks',
		mainColor: '#E0E8F0',
		soleColor: '#B8C8D8',
		tongueColor: '#F0F4FF',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: false,
		buckleColor: '#000000',
		glowColor: '#D8E4F0'
	},

	// 1145 — Darkdrift Shoes (rare, Dark)
	1145: {
		style: 'boots',
		mainColor: '#1E0E30',
		soleColor: '#100820',
		tongueColor: '#301848',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: true,
		buckleColor: '#5028A0',
		glowColor: '#3818A0'
	},

	// 1146 — Crystal Slippers (epic, Psychic+Light)
	1146: {
		style: 'slippers',
		mainColor: '#F0C0D8',
		soleColor: '#D8A0C0',
		tongueColor: '#FFD0E8',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: true,
		buckleColor: '#FFE8F0',
		glowColor: '#F0B8D0'
	},

	// 1147 — Thunderhoof Greaves (epic, Electric)
	1147: {
		style: 'greaves',
		mainColor: '#E0C020',
		soleColor: '#B89818',
		tongueColor: '#F0D840',
		hasSpurs: true,
		spurColor: '#FFE858',
		hasBuckle: true,
		buckleColor: '#FFE040',
		glowColor: '#FFD828'
	},

	// 1148 — Venomtread Boots (uncommon, Poison)
	1148: {
		style: 'boots',
		mainColor: '#2E6E28',
		soleColor: '#1C4A18',
		tongueColor: '#3E8E38',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: true,
		buckleColor: '#4CAA44',
		glowColor: '#3C8830'
	},

	// 1149 — Starwalker Sandals (legendary, Spirit+Light)
	1149: {
		style: 'sandals',
		mainColor: '#C8C0D0',
		soleColor: '#F0D860',
		tongueColor: '#E0D8E8',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: true,
		buckleColor: '#FFE880',
		glowColor: '#D8D0E8'
	},

	// 1150 — Epochal Boots (legendary, Metal+Earth)
	1150: {
		style: 'boots',
		mainColor: '#B08848',
		soleColor: '#887040',
		tongueColor: '#C89858',
		hasSpurs: true,
		spurColor: '#D0A060',
		hasBuckle: true,
		buckleColor: '#808890',
		glowColor: '#C09050'
	},

	// ══════════════════════════════════════════════════════════════════════════
	// GLOVES  (slot: "gloves")  —  16 items
	// ══════════════════════════════════════════════════════════════════════════

	// 1051 — Cloth Gloves (common)
	1051: {
		style: 'gloves',
		mainColor: '#C8B080',
		cuffColor: '#A89060',
		knuckleColor: '#B8A070',
		hasGem: false,
		gemColor: '#000000',
		glowColor: null
	},

	// 1052 — Battle Gauntlets (common)
	1052: {
		style: 'gauntlets',
		mainColor: '#909090',
		cuffColor: '#707070',
		knuckleColor: '#A0A0A0',
		hasGem: false,
		gemColor: '#000000',
		glowColor: null
	},

	// 1053 — Magma Grips (uncommon, Fire)
	1053: {
		style: 'gauntlets',
		mainColor: '#CC4420',
		cuffColor: '#A03818',
		knuckleColor: '#E05830',
		hasGem: false,
		gemColor: '#000000',
		glowColor: '#E04818'
	},

	// 1054 — Ironbark Gauntlets (rare, Nature+Metal)
	1054: {
		style: 'gauntlets',
		mainColor: '#6B5A38',
		cuffColor: '#8A8A80',
		knuckleColor: '#7E6E48',
		hasGem: true,
		gemColor: '#44AA44',
		glowColor: '#5A8A3A'
	},

	// 1055 — Psychic Wraps (epic, Psychic)
	1055: {
		style: 'wraps',
		mainColor: '#7B44AA',
		cuffColor: '#6030A0',
		knuckleColor: '#9958CC',
		hasGem: true,
		gemColor: '#FF88CC',
		glowColor: '#CC66FF'
	},

	// 1056 — Fists of the Colossus (legendary, Earth)
	1056: {
		style: 'fists',
		mainColor: '#8B6A3E',
		cuffColor: '#DAA520',
		knuckleColor: '#B8862D',
		hasGem: true,
		gemColor: '#FFD700',
		glowColor: '#D4A420'
	},

	// 1151 — Irongrip Mitts (common)
	1151: {
		style: 'mitts',
		mainColor: '#585858',
		cuffColor: '#404040',
		knuckleColor: '#686868',
		hasGem: false,
		gemColor: '#000000',
		glowColor: null
	},

	// 1152 — Flamecaster Wraps (uncommon, Fire)
	1152: {
		style: 'wraps',
		mainColor: '#C83820',
		cuffColor: '#A02C14',
		knuckleColor: '#E04830',
		hasGem: false,
		gemColor: '#000000',
		glowColor: '#DD3818'
	},

	// 1153 — Frost Weaver Gloves (uncommon, Ice)
	1153: {
		style: 'gloves',
		mainColor: '#78B8D8',
		cuffColor: '#5898B8',
		knuckleColor: '#98D0E8',
		hasGem: false,
		gemColor: '#000000',
		glowColor: '#88C8E0'
	},

	// 1154 — Windrider Bracers (rare, Air)
	1154: {
		style: 'bracers',
		mainColor: '#D0D8E0',
		cuffColor: '#B0C0CC',
		knuckleColor: '#E0E8F0',
		hasGem: true,
		gemColor: '#F0F8FF',
		glowColor: '#D8E4F0'
	},

	// 1155 — Earthshaker Gauntlets (rare, Earth)
	1155: {
		style: 'gauntlets',
		mainColor: '#8B6E45',
		cuffColor: '#6E5530',
		knuckleColor: '#A8865C',
		hasGem: true,
		gemColor: '#B89050',
		glowColor: '#A08048'
	},

	// 1156 — Shadow Grip (epic, Dark)
	1156: {
		style: 'gloves',
		mainColor: '#1E0E30',
		cuffColor: '#3A1858',
		knuckleColor: '#2E1840',
		hasGem: true,
		gemColor: '#8040C0',
		glowColor: '#5020A0'
	},

	// 1157 — Sparktouch Gloves (epic, Electric)
	1157: {
		style: 'gloves',
		mainColor: '#E0C020',
		cuffColor: '#C0A018',
		knuckleColor: '#F0D840',
		hasGem: true,
		gemColor: '#FFEE66',
		glowColor: '#FFE030'
	},

	// 1158 — Nature's Clasp (rare, Nature)
	1158: {
		style: 'clasp',
		mainColor: '#3A8A38',
		cuffColor: '#2C6C2A',
		knuckleColor: '#4CAA4A',
		hasGem: true,
		gemColor: '#66CC66',
		glowColor: '#44AA40'
	},

	// 1159 — Chaos Knuckles (legendary, Chaos)
	1159: {
		style: 'knuckles',
		mainColor: '#AA1828',
		cuffColor: '#1A0A10',
		knuckleColor: '#CC2838',
		hasGem: true,
		gemColor: '#FF3344',
		glowColor: '#DD2030'
	},

	// 1160 — Titan Fists (legendary, Metal+Earth)
	1160: {
		style: 'fists',
		mainColor: '#B08848',
		cuffColor: '#DAA520',
		knuckleColor: '#C89858',
		hasGem: true,
		gemColor: '#FFD040',
		glowColor: '#D0A030'
	},

	// ══════════════════════════════════════════════════════════════════════════
	// RINGS  (slot: "ring")  —  16 items
	// ══════════════════════════════════════════════════════════════════════════

	// 1061 — Copper Ring (common)
	1061: {
		bandColor: '#B87333',
		gemColor: '#000000',
		gemShape: 'none',
		glowColor: null,
		sparkle: false
	},

	// 1062 — Silver Band (common)
	1062: {
		bandColor: '#C0C0C0',
		gemColor: '#000000',
		gemShape: 'none',
		glowColor: null,
		sparkle: false
	},

	// 1063 — Venomfang Ring (uncommon, Poison)
	1063: {
		bandColor: '#3AA830',
		gemColor: '#66DD44',
		gemShape: 'round',
		glowColor: '#44CC22',
		sparkle: false
	},

	// 1064 — Ring of Meteors (rare, Fire+Earth)
	1064: {
		bandColor: '#D47020',
		gemColor: '#FF8844',
		gemShape: 'diamond',
		glowColor: '#FF6620',
		sparkle: true
	},

	// 1065 — Signet of the Abyss (epic, Dark)
	1065: {
		bandColor: '#181018',
		gemColor: '#8040C0',
		gemShape: 'square',
		glowColor: '#6020A0',
		sparkle: true
	},

	// 1066 — Band of Eternity (legendary)
	1066: {
		bandColor: '#FFD700',
		gemColor: '#FFFFFF',
		gemShape: 'diamond',
		glowColor: '#FFE44D',
		sparkle: true
	},

	// 1161 — Emberstone Ring (common, Fire)
	1161: {
		bandColor: '#A07040',
		gemColor: '#DD4422',
		gemShape: 'round',
		glowColor: null,
		sparkle: false
	},

	// 1162 — Frostfire Band (uncommon, Ice+Fire)
	1162: {
		bandColor: '#6090CC',
		gemColor: '#DD4444',
		gemShape: 'round',
		glowColor: '#8080D0',
		sparkle: false
	},

	// 1163 — Verdant Signet (uncommon, Nature)
	1163: {
		bandColor: '#3A8830',
		gemColor: '#66CC44',
		gemShape: 'round',
		glowColor: '#44AA28',
		sparkle: false
	},

	// 1164 — Stormchaser Ring (rare, Electric)
	1164: {
		bandColor: '#D8C020',
		gemColor: '#FFEE44',
		gemShape: 'diamond',
		glowColor: '#FFE020',
		sparkle: true
	},

	// 1165 — Shadow Circlet (rare, Dark)
	1165: {
		bandColor: '#2A1040',
		gemColor: '#6030A0',
		gemShape: 'square',
		glowColor: '#4820A0',
		sparkle: false
	},

	// 1166 — Radiant Loop (epic, Light)
	1166: {
		bandColor: '#F0D020',
		gemColor: '#FFFFA0',
		gemShape: 'diamond',
		glowColor: '#FFE840',
		sparkle: true
	},

	// 1167 — Iron Will Band (uncommon, Metal)
	1167: {
		bandColor: '#808890',
		gemColor: '#B0B8C0',
		gemShape: 'square',
		glowColor: null,
		sparkle: false
	},

	// 1168 — Void Ring (epic, Dark+Spirit)
	1168: {
		bandColor: '#301060',
		gemColor: '#7838C8',
		gemShape: 'round',
		glowColor: '#5820B0',
		sparkle: true
	},

	// 1169 — Celestial Band (legendary, Light+Spirit)
	1169: {
		bandColor: '#C0B8D0',
		gemColor: '#FFE880',
		gemShape: 'diamond',
		glowColor: '#D8D0E8',
		sparkle: true
	},

	// 1170 — Eternity's Edge (legendary, Chaos+Metal)
	1170: {
		bandColor: '#B82030',
		gemColor: '#D0D0D8',
		gemShape: 'diamond',
		glowColor: '#CC2838',
		sparkle: true
	},

	// ══════════════════════════════════════════════════════════════════════════
	// AMULETS  (slot: "amulet")  —  16 items
	// ══════════════════════════════════════════════════════════════════════════

	// 1071 — Wooden Pendant (common)
	1071: {
		chainColor: '#8B7355',
		pendantColor: '#6B4226',
		pendantShape: 'circle',
		gemColor: '#8B6934',
		glowColor: null
	},

	// 1072 — Pearl Necklace (common)
	1072: {
		chainColor: '#D0D0D0',
		pendantColor: '#F0EDE0',
		pendantShape: 'circle',
		gemColor: '#FFF8F0',
		glowColor: null
	},

	// 1073 — Tidecaller Amulet (uncommon, Water)
	1073: {
		chainColor: '#5088AA',
		pendantColor: '#2878B0',
		pendantShape: 'teardrop',
		gemColor: '#48A0D8',
		glowColor: '#3890C8'
	},

	// 1074 — Sunstone Amulet (rare, Light+Fire)
	1074: {
		chainColor: '#DAA520',
		pendantColor: '#E8A020',
		pendantShape: 'diamond',
		gemColor: '#FFD040',
		glowColor: '#FFBB22'
	},

	// 1075 — Specter's Locket (epic, Spirit)
	1075: {
		chainColor: '#8AACC8',
		pendantColor: '#B0C4DE',
		pendantShape: 'oval',
		gemColor: '#C8D8F0',
		glowColor: '#A0C0E0'
	},

	// 1076 — Heart of Eclipsar (legendary, Dark+Spirit)
	1076: {
		chainColor: '#8A80A0',
		pendantColor: '#5C2888',
		pendantShape: 'heart',
		gemColor: '#9848D0',
		glowColor: '#7830B8'
	},

	// 1171 — Wolfclaw Pendant (common)
	1171: {
		chainColor: '#787878',
		pendantColor: '#989898',
		pendantShape: 'fang',
		gemColor: '#A8A8A8',
		glowColor: null
	},

	// 1172 — Ember Heart (uncommon, Fire)
	1172: {
		chainColor: '#A05030',
		pendantColor: '#CC3020',
		pendantShape: 'heart',
		gemColor: '#FF4430',
		glowColor: '#DD3018'
	},

	// 1173 — Seafoam Choker (uncommon, Water)
	1173: {
		chainColor: '#408890',
		pendantColor: '#30A898',
		pendantShape: 'oval',
		gemColor: '#50C8B8',
		glowColor: '#40B8A8'
	},

	// 1174 — Thunder Torc (rare, Electric)
	1174: {
		chainColor: '#D8B820',
		pendantColor: '#F0D030',
		pendantShape: 'crescent',
		gemColor: '#FFE850',
		glowColor: '#FFD828'
	},

	// 1175 — Nightshade Locket (rare, Dark+Poison)
	1175: {
		chainColor: '#4A2060',
		pendantColor: '#3A6028',
		pendantShape: 'oval',
		gemColor: '#68A840',
		glowColor: '#508830'
	},

	// 1176 — Starlight Medallion (epic, Light+Spirit)
	1176: {
		chainColor: '#C0B8C8',
		pendantColor: '#E8E0F0',
		pendantShape: 'star',
		gemColor: '#FFF8FF',
		glowColor: '#E0D8F0'
	},

	// 1177 — Ironblood Talisman (uncommon, Metal)
	1177: {
		chainColor: '#787880',
		pendantColor: '#888890',
		pendantShape: 'diamond',
		gemColor: '#B83030',
		glowColor: null
	},

	// 1178 — Spirit Lantern (epic, Spirit)
	1178: {
		chainColor: '#7098B8',
		pendantColor: '#90B8D8',
		pendantShape: 'teardrop',
		gemColor: '#C8E0F8',
		glowColor: '#A0C8E8'
	},

	// 1179 — Chaos Anchor (legendary, Chaos+Dark)
	1179: {
		chainColor: '#881828',
		pendantColor: '#AA1020',
		pendantShape: 'diamond',
		gemColor: '#181018',
		glowColor: '#CC1828'
	},

	// 1180 — World Seed Amulet (legendary, Nature+Earth)
	1180: {
		chainColor: '#6A8A40',
		pendantColor: '#3E8830',
		pendantShape: 'circle',
		gemColor: '#DAA520',
		glowColor: '#4CAA38'
	},

	// ══════════════════════════════════════════════════════════════════════════
	// CRYSTALS  (slot: "crystal")  —  16 items
	// ══════════════════════════════════════════════════════════════════════════

	// 1081 — Dim Shard (common)
	1081: {
		crystalColor: '#808080',
		innerColor: '#989898',
		outlineColor: '#606060',
		size: 'small',
		shape: 'diamond',
		pulseSpeed: 0.5,
		glowColor: '#888888',
		hasTrail: false
	},

	// 1082 — Bright Shard (common)
	1082: {
		crystalColor: '#E0E0E0',
		innerColor: '#F8F8F8',
		outlineColor: '#B0B0B0',
		size: 'small',
		shape: 'diamond',
		pulseSpeed: 0.6,
		glowColor: '#F0F0F0',
		hasTrail: false
	},

	// 1083 — Metallic Prism (uncommon, Metal)
	1083: {
		crystalColor: '#B0B8C0',
		innerColor: '#D0D8E0',
		outlineColor: '#808890',
		size: 'medium',
		shape: 'prism',
		pulseSpeed: 0.8,
		glowColor: '#C0C8D0',
		hasTrail: false
	},

	// 1084 — Chaosfire Gem (rare, Chaos+Fire)
	1084: {
		crystalColor: '#CC3818',
		innerColor: '#FF6830',
		outlineColor: '#8A2010',
		size: 'medium',
		shape: 'hexagon',
		pulseSpeed: 1.2,
		glowColor: '#FF4820',
		hasTrail: true
	},

	// 1085 — Nexus Core (epic, Psychic)
	1085: {
		crystalColor: '#CC44AA',
		innerColor: '#FF80DD',
		outlineColor: '#882278',
		size: 'large',
		shape: 'orb',
		pulseSpeed: 1.5,
		glowColor: '#DD66CC',
		hasTrail: true
	},

	// 1086 — Primordial Crystal (legendary)
	1086: {
		crystalColor: '#E8E8FF',
		innerColor: '#FFFFFF',
		outlineColor: '#C0C0E0',
		size: 'large',
		shape: 'star',
		pulseSpeed: 2.0,
		glowColor: '#F0F0FF',
		hasTrail: true
	},

	// 1181 — Flame Core (common, Fire)
	1181: {
		crystalColor: '#E07020',
		innerColor: '#FF9040',
		outlineColor: '#A04810',
		size: 'small',
		shape: 'diamond',
		pulseSpeed: 0.7,
		glowColor: '#F07828',
		hasTrail: false
	},

	// 1182 — Ice Heart Shard (uncommon, Ice)
	1182: {
		crystalColor: '#88C8E8',
		innerColor: '#C0E8FF',
		outlineColor: '#5898B8',
		size: 'medium',
		shape: 'shard',
		pulseSpeed: 0.8,
		glowColor: '#A0D8F8',
		hasTrail: false
	},

	// 1183 — Thunder Gem (uncommon, Electric)
	1183: {
		crystalColor: '#D8C020',
		innerColor: '#FFE858',
		outlineColor: '#A89018',
		size: 'medium',
		shape: 'hexagon',
		pulseSpeed: 1.0,
		glowColor: '#FFE040',
		hasTrail: false
	},

	// 1184 — Nature's Tear (rare, Nature)
	1184: {
		crystalColor: '#38AA40',
		innerColor: '#60DD68',
		outlineColor: '#208828',
		size: 'medium',
		shape: 'prism',
		pulseSpeed: 1.0,
		glowColor: '#48CC50',
		hasTrail: true
	},

	// 1185 — Shadow Prism (rare, Dark)
	1185: {
		crystalColor: '#3A1858',
		innerColor: '#6030A0',
		outlineColor: '#200E38',
		size: 'medium',
		shape: 'prism',
		pulseSpeed: 1.1,
		glowColor: '#5020A0',
		hasTrail: true
	},

	// 1186 — Radiant Geode (epic, Light)
	1186: {
		crystalColor: '#F0D020',
		innerColor: '#FFF060',
		outlineColor: '#C0A010',
		size: 'large',
		shape: 'orb',
		pulseSpeed: 1.4,
		glowColor: '#FFE830',
		hasTrail: true
	},

	// 1187 — Iron Nucleus (uncommon, Metal)
	1187: {
		crystalColor: '#808890',
		innerColor: '#A0A8B0',
		outlineColor: '#606870',
		size: 'medium',
		shape: 'hexagon',
		pulseSpeed: 0.7,
		glowColor: '#909AA0',
		hasTrail: false
	},

	// 1188 — Spirit Dewdrop (epic, Spirit)
	1188: {
		crystalColor: '#90B8D8',
		innerColor: '#C0E0FF',
		outlineColor: '#6090B0',
		size: 'large',
		shape: 'orb',
		pulseSpeed: 1.3,
		glowColor: '#A8D0F0',
		hasTrail: true
	},

	// 1189 — Chaosfire Opal (legendary, Chaos+Fire)
	1189: {
		crystalColor: '#CC2818',
		innerColor: '#FF5828',
		outlineColor: '#881808',
		size: 'large',
		shape: 'star',
		pulseSpeed: 1.8,
		glowColor: '#FF3818',
		hasTrail: true
	},

	// 1190 — Genesis Crystal (legendary, all)
	1190: {
		crystalColor: '#E0D0F0',
		innerColor: '#F8F0FF',
		outlineColor: '#B0A0C8',
		size: 'large',
		shape: 'star',
		pulseSpeed: 2.0,
		glowColor: '#E8E0FF',
		hasTrail: true
	}
};

// ══════════════════════════════════════════════════════════════════════════════
// Slot-type default visual configs (fallbacks for missing / unequipped slots)
// ══════════════════════════════════════════════════════════════════════════════

const SLOT_VISUAL_DEFAULTS = {
	weapon: {
		shape: 'sword',
		bladeColor: '#888888',
		bladeHighlight: '#AAAAAA',
		handleColor: '#5C3D1E',
		guardColor: '#666666',
		glowColor: null,
		bladeLength: 9,
		bladeWidth: 2,
		hasParticles: false,
		particleColor: '#FFFFFF'
	},
	helmet: {
		style: 'cap',
		mainColor: '#787878',
		trimColor: '#585858',
		gemColor: null,
		height: 2,
		width: 0,
		hasVisor: false,
		visorColor: '#000000',
		glowColor: null,
		hasPlume: false,
		plumeColor: '#000000'
	},
	chest: {
		style: 'tunic',
		mainColor: '#888880',
		trimColor: '#686860',
		accentColor: '#787870',
		hasShoulders: false,
		shoulderColor: '#000000',
		hasBelt: false,
		beltColor: '#000000',
		glowColor: null,
		pattern: 'none'
	},
	legs: {
		style: 'pants',
		mainColor: '#888880',
		trimColor: '#686860',
		kneeColor: '#787870',
		hasKneePlates: false,
		glowColor: null
	},
	boots: {
		style: 'boots',
		mainColor: '#605040',
		soleColor: '#403020',
		tongueColor: '#706050',
		hasSpurs: false,
		spurColor: '#000000',
		hasBuckle: false,
		buckleColor: '#000000',
		glowColor: null
	},
	gloves: {
		style: 'gloves',
		mainColor: '#888880',
		cuffColor: '#686860',
		knuckleColor: '#787870',
		hasGem: false,
		gemColor: '#000000',
		glowColor: null
	},
	ring: {
		bandColor: '#888888',
		gemColor: '#000000',
		gemShape: 'none',
		glowColor: null,
		sparkle: false
	},
	amulet: {
		chainColor: '#888888',
		pendantColor: '#787878',
		pendantShape: 'circle',
		gemColor: '#989898',
		glowColor: null
	},
	crystal: {
		crystalColor: '#888888',
		innerColor: '#AAAAAA',
		outlineColor: '#666666',
		size: 'small',
		shape: 'diamond',
		pulseSpeed: 0.5,
		glowColor: '#888888',
		hasTrail: false
	}
};

// ══════════════════════════════════════════════════════════════════════════════
// Helper functions
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the unique visual configuration for a given equipment ID.
 * @param {number} equipmentId — The equipment_id to look up.
 * @returns {Object|null} The visual config object, or null if not found.
 */
export function getVisualConfig(equipmentId) {
	return EQUIPMENT_VISUALS[equipmentId] || null;
}

/**
 * Returns the default visual configuration for a given slot type.
 * Used as a fallback when no equipment is equipped in that slot.
 * @param {string} slotType — One of: "weapon","helmet","chest","legs","boots","gloves","ring","amulet","crystal"
 * @returns {Object|null} The default visual config object, or null for unknown slots.
 */
export function getSlotVisualDefaults(slotType) {
	const defaults = SLOT_VISUAL_DEFAULTS[slotType];
	return defaults ? { ...defaults } : null;
}

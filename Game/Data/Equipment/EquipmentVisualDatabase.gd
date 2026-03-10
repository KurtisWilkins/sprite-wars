## EquipmentVisualDatabase — Unique visual rendering properties for all 144 equipment items.
## Each equipment item has distinct visual parameters so players can immediately
## tell different equipment apart when equipped on a Sprite.
##
## Visual configs are used by the sprite compositor to draw unique cel-shaded
## representations of each piece of equipment.
class_name EquipmentVisualDatabase
extends RefCounted


## ── Weapon Visual Configs ────────────────────────────────────────────────────
## shape, bladeColor, bladeHighlight, handleColor, guardColor, glowColor,
## bladeLength, bladeWidth, hasParticles, particleColor

static func get_weapon_visuals() -> Dictionary:
	return {
		# Base weapons (1001-1006)
		1001: {"shape":"sword","bladeColor":"#a5a8ad","bladeHighlight":"#d8dade","handleColor":"#774c21","guardColor":"#a3915b","glowColor":"","bladeLength":10,"bladeWidth":2,"hasParticles":false,"particleColor":""},
		1002: {"shape":"sword","bladeColor":"#cfd3db","bladeHighlight":"#fbfbfc","handleColor":"#624c36","guardColor":"#ab9d75","glowColor":"","bladeLength":11,"bladeWidth":2,"hasParticles":false,"particleColor":""},
		1003: {"shape":"sword","bladeColor":"#e28868","bladeHighlight":"#f4c081","handleColor":"#884a21","guardColor":"#d3834d","glowColor":"#ef8742","bladeLength":11,"bladeWidth":2,"hasParticles":true,"particleColor":"#f3a771"},
		1004: {"shape":"sword","bladeColor":"#b3dae4","bladeHighlight":"#ffffff","handleColor":"#5b6e81","guardColor":"#a0c0d5","glowColor":"#a0daf7","bladeLength":12,"bladeWidth":2,"hasParticles":true,"particleColor":"#dff6fc"},
		1005: {"shape":"sword","bladeColor":"#8051be","bladeHighlight":"#b287dd","handleColor":"#3b2254","guardColor":"#6d49a4","glowColor":"#a174ce","bladeLength":13,"bladeWidth":2,"hasParticles":true,"particleColor":"#c7a0f7"},
		1006: {"shape":"broadsword","bladeColor":"#e3cf77","bladeHighlight":"#fcfadf","handleColor":"#a68136","guardColor":"#dab868","glowColor":"#f7e4a0","bladeLength":14,"bladeWidth":3,"hasParticles":true,"particleColor":"#fcf6df"},
		# Expanded weapons (1101-1110)
		1101: {"shape":"battleaxe","bladeColor":"#68b89d","bladeHighlight":"#b3e4d0","handleColor":"#4a5f5f","guardColor":"#709f8f","glowColor":"#83d0af","bladeLength":12,"bladeWidth":3,"hasParticles":true,"particleColor":"#96dfc0"},
		1102: {"shape":"dagger","bladeColor":"#6d49a4","bladeHighlight":"#a483d0","handleColor":"#3b2254","guardColor":"#5d3585","glowColor":"#9370c1","bladeLength":8,"bladeWidth":1,"hasParticles":true,"particleColor":"#b596df"},
		1103: {"shape":"greataxe","bladeColor":"#d8b559","bladeHighlight":"#f4df81","handleColor":"#735f36","guardColor":"#b5a349","glowColor":"#efcd42","bladeLength":14,"bladeWidth":3,"hasParticles":true,"particleColor":"#f7eda0"},
		1104: {"shape":"scimitar","bladeColor":"#68b868","bladeHighlight":"#b3e4b3","handleColor":"#366236","guardColor":"#7cb57c","glowColor":"#91d391","bladeLength":12,"bladeWidth":2,"hasParticles":true,"particleColor":"#b9efb9"},
		1105: {"shape":"broadsword","bladeColor":"#dcd077","bladeHighlight":"#f9f1c0","handleColor":"#968235","guardColor":"#cdb564","glowColor":"#f4df81","bladeLength":14,"bladeWidth":3,"hasParticles":true,"particleColor":"#fcf6df"},
		1106: {"shape":"mace","bladeColor":"#aca196","bladeHighlight":"#cdc3b9","handleColor":"#715d49","guardColor":"#917f6d","glowColor":"","bladeLength":11,"bladeWidth":3,"hasParticles":false,"particleColor":""},
		1107: {"shape":"katana","bladeColor":"#b3d0e4","bladeHighlight":"#eff6fd","handleColor":"#495d71","guardColor":"#8eafc5","glowColor":"#c0e1f9","bladeLength":13,"bladeWidth":1,"hasParticles":true,"particleColor":"#dff0fc"},
		1108: {"shape":"hammer","bladeColor":"#d8b559","bladeHighlight":"#f7e4a0","handleColor":"#885f21","guardColor":"#d9a325","glowColor":"#f3d371","bladeLength":12,"bladeWidth":3,"hasParticles":true,"particleColor":"#f9f1c0"},
		1109: {"shape":"scythe","bladeColor":"#d0d8e9","bladeHighlight":"#ffffff","handleColor":"#5b6e81","guardColor":"#abb5ca","glowColor":"#dfebfc","bladeLength":15,"bladeWidth":2,"hasParticles":true,"particleColor":"#eff6fd"},
		1110: {"shape":"broadsword","bladeColor":"#d34d4d","bladeHighlight":"#f48b81","handleColor":"#542222","guardColor":"#a63636","glowColor":"#f37171","bladeLength":16,"bladeWidth":3,"hasParticles":true,"particleColor":"#f49681"},
	}


## ── Helmet Visual Configs ────────────────────────────────────────────────────
## style, mainColor, trimColor, gemColor, height, width, hasVisor, visorColor,
## glowColor, hasPlume, plumeColor

static func get_helmet_visuals() -> Dictionary:
	return {
		1011: {"style":"cap","mainColor":"#8b6b44","trimColor":"#6b4b24","gemColor":"","height":3,"width":0,"hasVisor":false,"visorColor":"","glowColor":"","hasPlume":false,"plumeColor":""},
		1012: {"style":"helm","mainColor":"#8888aa","trimColor":"#666688","gemColor":"","height":4,"width":1,"hasVisor":true,"visorColor":"#555577","glowColor":"","hasPlume":false,"plumeColor":""},
		1013: {"style":"circlet","mainColor":"#88bbdd","trimColor":"#aaddff","gemColor":"#66ccff","height":2,"width":1,"hasVisor":false,"visorColor":"","glowColor":"#88ccff","hasPlume":false,"plumeColor":""},
		1014: {"style":"crown","mainColor":"#ddaa22","trimColor":"#ffdd44","gemColor":"#ffee00","height":5,"width":1,"hasVisor":false,"visorColor":"","glowColor":"#ffcc00","hasPlume":false,"plumeColor":""},
		1015: {"style":"helm","mainColor":"#cc5522","trimColor":"#ee7733","gemColor":"#ff4400","height":5,"width":2,"hasVisor":true,"visorColor":"#aa4411","glowColor":"#ff5500","hasPlume":false,"plumeColor":""},
		1016: {"style":"crown","mainColor":"#8899cc","trimColor":"#aabbee","gemColor":"#bbddff","height":5,"width":2,"hasVisor":false,"visorColor":"","glowColor":"#aaccff","hasPlume":true,"plumeColor":"#99bbdd"},
		# Expanded helmets
		1111: {"style":"visor","mainColor":"#555566","trimColor":"#444455","gemColor":"","height":4,"width":1,"hasVisor":true,"visorColor":"#333344","glowColor":"","hasPlume":false,"plumeColor":""},
		1112: {"style":"turban","mainColor":"#9955aa","trimColor":"#bb77cc","gemColor":"#dd88ee","height":4,"width":2,"hasVisor":false,"visorColor":"","glowColor":"#cc66dd","hasPlume":false,"plumeColor":""},
		1113: {"style":"helm","mainColor":"#cc3322","trimColor":"#ee5533","gemColor":"#ff6644","height":5,"width":1,"hasVisor":true,"visorColor":"#aa2211","glowColor":"#ff4433","hasPlume":true,"plumeColor":"#ff8844"},
		1114: {"style":"cowl","mainColor":"#3377aa","trimColor":"#4499cc","gemColor":"","height":4,"width":2,"hasVisor":false,"visorColor":"","glowColor":"#4488bb","hasPlume":false,"plumeColor":""},
		1115: {"style":"coronet","mainColor":"#ddaa22","trimColor":"#ffcc33","gemColor":"#ffee44","height":4,"width":1,"hasVisor":false,"visorColor":"","glowColor":"#ffdd33","hasPlume":false,"plumeColor":""},
		1116: {"style":"veil","mainColor":"#443366","trimColor":"#554477","gemColor":"","height":4,"width":2,"hasVisor":false,"visorColor":"","glowColor":"#553388","hasPlume":false,"plumeColor":""},
		1117: {"style":"tiara","mainColor":"#ddcc44","trimColor":"#ffee66","gemColor":"#ffff88","height":3,"width":1,"hasVisor":false,"visorColor":"","glowColor":"#ffdd55","hasPlume":false,"plumeColor":""},
		1118: {"style":"hood","mainColor":"#337733","trimColor":"#448844","gemColor":"","height":4,"width":2,"hasVisor":false,"visorColor":"","glowColor":"#449944","hasPlume":false,"plumeColor":""},
		1119: {"style":"crown","mainColor":"#aabbdd","trimColor":"#ccddff","gemColor":"#eeeeff","height":6,"width":2,"hasVisor":false,"visorColor":"","glowColor":"#bbccee","hasPlume":true,"plumeColor":"#ddeeff"},
		1120: {"style":"antlers","mainColor":"#665533","trimColor":"#887744","gemColor":"#44aa44","height":6,"width":3,"hasVisor":false,"visorColor":"","glowColor":"#55cc55","hasPlume":false,"plumeColor":""},
	}


## ── Chest Visual Configs ─────────────────────────────────────────────────────
## style, mainColor, trimColor, accentColor, hasShoulders, shoulderColor,
## hasBelt, beltColor, glowColor, pattern
## Valid patterns: none, chains, runes, scales, crystal, stripes, cel_accent
## "cel_accent" — small clean decorative marks (dots, tiny stars, flat shapes)
## used for the Flat Cel-Shaded Chibi art style.

static func get_chest_visuals() -> Dictionary:
	return {
		1021: {"style":"tunic","mainColor":"#bbaa88","trimColor":"#998866","accentColor":"#aa9977","hasShoulders":false,"shoulderColor":"","hasBelt":true,"beltColor":"#776644","glowColor":"","pattern":"none"},
		1022: {"style":"mail","mainColor":"#9999aa","trimColor":"#777788","accentColor":"#888899","hasShoulders":false,"shoulderColor":"","hasBelt":true,"beltColor":"#666677","glowColor":"","pattern":"chains"},
		1023: {"style":"robe","mainColor":"#448844","trimColor":"#336633","accentColor":"#66aa66","hasShoulders":false,"shoulderColor":"","hasBelt":true,"beltColor":"#557744","glowColor":"#55aa55","pattern":"none"},
		1024: {"style":"plate","mainColor":"#443366","trimColor":"#332255","accentColor":"#554477","hasShoulders":true,"shoulderColor":"#553377","hasBelt":true,"beltColor":"#332244","glowColor":"#6644aa","pattern":"runes"},
		1025: {"style":"mail","mainColor":"#4477cc","trimColor":"#3366bb","accentColor":"#5588dd","hasShoulders":true,"shoulderColor":"#5599ee","hasBelt":true,"beltColor":"#335599","glowColor":"#4488dd","pattern":"chains"},
		1026: {"style":"plate","mainColor":"#ddaa33","trimColor":"#cc9922","accentColor":"#eebb44","hasShoulders":true,"shoulderColor":"#eebb44","hasBelt":true,"beltColor":"#bb8822","glowColor":"#ffcc44","pattern":"runes"},
		# Expanded chest
		1121: {"style":"jerkin","mainColor":"#887766","trimColor":"#776655","accentColor":"#998877","hasShoulders":false,"shoulderColor":"","hasBelt":true,"beltColor":"#665544","glowColor":"","pattern":"none"},
		1122: {"style":"cuirass","mainColor":"#cc5533","trimColor":"#aa4422","accentColor":"#dd6644","hasShoulders":true,"shoulderColor":"#cc5533","hasBelt":true,"beltColor":"#993322","glowColor":"#dd5533","pattern":"scales"},
		1123: {"style":"cloak","mainColor":"#3377aa","trimColor":"#226699","accentColor":"#4488bb","hasShoulders":false,"shoulderColor":"","hasBelt":false,"beltColor":"","glowColor":"#4499cc","pattern":"none"},
		1124: {"style":"mail","mainColor":"#ddaa22","trimColor":"#cc9911","accentColor":"#eebb33","hasShoulders":true,"shoulderColor":"#ddaa22","hasBelt":true,"beltColor":"#bb8811","glowColor":"#eebb33","pattern":"scales"},
		1125: {"style":"robe","mainColor":"#443366","trimColor":"#332255","accentColor":"#554477","hasShoulders":false,"shoulderColor":"","hasBelt":true,"beltColor":"#332244","glowColor":"#5533aa","pattern":"runes"},
		1126: {"style":"breastplate","mainColor":"#448844","trimColor":"#337733","accentColor":"#55aa55","hasShoulders":true,"shoulderColor":"#55aa55","hasBelt":true,"beltColor":"#336633","glowColor":"#66bb66","pattern":"none"},
		1127: {"style":"plate","mainColor":"#443377","trimColor":"#332266","accentColor":"#554488","hasShoulders":true,"shoulderColor":"#5544aa","hasBelt":true,"beltColor":"#332255","glowColor":"#6655bb","pattern":"runes"},
		1128: {"style":"breastplate","mainColor":"#aabbcc","trimColor":"#99aacc","accentColor":"#bbccdd","hasShoulders":true,"shoulderColor":"#aabbdd","hasBelt":true,"beltColor":"#8899aa","glowColor":"#bbccee","pattern":"crystal"},
		1129: {"style":"mantle","mainColor":"#cc5522","trimColor":"#dd6633","accentColor":"#ee8844","hasShoulders":true,"shoulderColor":"#ee7733","hasBelt":false,"beltColor":"","glowColor":"#ff8833","pattern":"none"},
		1130: {"style":"harness","mainColor":"#886644","trimColor":"#775533","accentColor":"#cc5533","hasShoulders":true,"shoulderColor":"#997755","hasBelt":true,"beltColor":"#664422","glowColor":"#cc4433","pattern":"stripes"},
	}


## ── Legs Visual Configs ──────────────────────────────────────────────────────
## style, mainColor, trimColor, kneeColor, hasKneePlates, glowColor

static func get_legs_visuals() -> Dictionary:
	return {
		1031: {"style":"leggings","mainColor":"#bbaa88","trimColor":"#998866","kneeColor":"","hasKneePlates":false,"glowColor":""},
		1032: {"style":"greaves","mainColor":"#888899","trimColor":"#666677","kneeColor":"#999aaa","hasKneePlates":true,"glowColor":""},
		1033: {"style":"guards","mainColor":"#bb9966","trimColor":"#997744","kneeColor":"#ccaa77","hasKneePlates":true,"glowColor":"#ccaa66"},
		1034: {"style":"cuisses","mainColor":"#559944","trimColor":"#447733","kneeColor":"#775599","hasKneePlates":true,"glowColor":"#66aa55"},
		1035: {"style":"greaves","mainColor":"#77bbdd","trimColor":"#5599bb","kneeColor":"#99ddff","hasKneePlates":true,"glowColor":"#88ccee"},
		1036: {"style":"greaves","mainColor":"#886644","trimColor":"#997755","kneeColor":"#ddaa33","hasKneePlates":true,"glowColor":"#ccaa44"},
		# Expanded legs
		1131: {"style":"chaps","mainColor":"#aa8866","trimColor":"#887744","kneeColor":"","hasKneePlates":false,"glowColor":""},
		1132: {"style":"guards","mainColor":"#668866","trimColor":"#557755","kneeColor":"#888899","hasKneePlates":true,"glowColor":"#77aa77"},
		1133: {"style":"pants","mainColor":"#aabbcc","trimColor":"#99aabb","kneeColor":"","hasKneePlates":false,"glowColor":"#bbccdd"},
		1134: {"style":"greaves","mainColor":"#cc5533","trimColor":"#aa4422","kneeColor":"#dd6644","hasKneePlates":true,"glowColor":"#dd5533"},
		1135: {"style":"leggings","mainColor":"#8899bb","trimColor":"#7788aa","kneeColor":"#99aacc","hasKneePlates":false,"glowColor":"#99aabb"},
		1136: {"style":"cuisses","mainColor":"#4477aa","trimColor":"#336699","kneeColor":"#ddaa22","hasKneePlates":true,"glowColor":"#5588bb"},
		1137: {"style":"leggings","mainColor":"#335544","trimColor":"#224433","kneeColor":"#553377","hasKneePlates":true,"glowColor":"#446655"},
		1138: {"style":"tassets","mainColor":"#ddcc44","trimColor":"#ccbb33","kneeColor":"#eedd55","hasKneePlates":true,"glowColor":"#ddcc44"},
		1139: {"style":"greaves","mainColor":"#553333","trimColor":"#442222","kneeColor":"#663355","hasKneePlates":true,"glowColor":"#773344"},
		1140: {"style":"greaves","mainColor":"#bb8844","trimColor":"#aa7733","kneeColor":"#ccaa55","hasKneePlates":true,"glowColor":"#ccaa44"},
	}


## ── Boots Visual Configs ─────────────────────────────────────────────────────
## style, mainColor, soleColor, tongueColor, hasSpurs, spurColor, hasBuckle,
## buckleColor, glowColor

static func get_boots_visuals() -> Dictionary:
	return {
		1041: {"style":"sandals","mainColor":"#aa8855","trimColor":"#886633","soleColor":"#775522","hasBuckle":false,"buckleColor":"","glowColor":""},
		1042: {"style":"boots","mainColor":"#664422","trimColor":"#553311","soleColor":"#442211","hasBuckle":true,"buckleColor":"#886644","glowColor":""},
		1043: {"style":"boots","mainColor":"#aabbcc","trimColor":"#99aabb","soleColor":"#8899aa","hasBuckle":false,"buckleColor":"","glowColor":"#bbccdd"},
		1044: {"style":"boots","mainColor":"#3377aa","trimColor":"#226699","soleColor":"#225588","hasBuckle":true,"buckleColor":"#4488bb","glowColor":"#4499cc"},
		1045: {"style":"treads","mainColor":"#443366","trimColor":"#332255","soleColor":"#221144","hasBuckle":false,"buckleColor":"","glowColor":"#5544aa"},
		1046: {"style":"sandals","mainColor":"#ddaa33","trimColor":"#ccaa44","soleColor":"#bb9922","hasBuckle":true,"buckleColor":"#eebb44","glowColor":"#ffcc44"},
		# Expanded boots
		1141: {"style":"treads","mainColor":"#886644","trimColor":"#775533","soleColor":"#664422","hasBuckle":false,"buckleColor":"","glowColor":""},
		1142: {"style":"boots","mainColor":"#aa5533","trimColor":"#884422","soleColor":"#773311","hasBuckle":true,"buckleColor":"#cc6644","glowColor":"#cc5533"},
		1143: {"style":"sabatons","mainColor":"#88bbdd","trimColor":"#77aacc","soleColor":"#6699bb","hasBuckle":true,"buckleColor":"#99ccee","glowColor":"#aaddff"},
		1144: {"style":"boots","mainColor":"#bbccdd","trimColor":"#aabbcc","soleColor":"#99aabb","hasBuckle":true,"buckleColor":"#ccddee","glowColor":"#ccddee"},
		1145: {"style":"boots","mainColor":"#332244","trimColor":"#221133","soleColor":"#110022","hasBuckle":false,"buckleColor":"","glowColor":"#443366"},
		1146: {"style":"slippers","mainColor":"#ddaacc","trimColor":"#ccbbdd","soleColor":"#cc99bb","hasBuckle":false,"buckleColor":"","glowColor":"#eeccdd"},
		1147: {"style":"greaves","mainColor":"#ddaa22","trimColor":"#cc9911","soleColor":"#bb8811","hasBuckle":true,"buckleColor":"#eebb33","glowColor":"#eebb33"},
		1148: {"style":"boots","mainColor":"#337733","trimColor":"#226622","soleColor":"#225522","hasBuckle":true,"buckleColor":"#448844","glowColor":"#449944"},
		1149: {"style":"sandals","mainColor":"#aabbcc","trimColor":"#ccaa44","soleColor":"#99aabb","hasBuckle":true,"buckleColor":"#ddcc55","glowColor":"#bbccdd"},
		1150: {"style":"sabatons","mainColor":"#bb8844","trimColor":"#aa7733","soleColor":"#887744","hasBuckle":true,"buckleColor":"#ccaa55","glowColor":"#ccaa44"},
	}


## ── Gloves Visual Configs ────────────────────────────────────────────────────
## style, mainColor, cuffColor, knuckleColor, hasGem, gemColor, glowColor

static func get_gloves_visuals() -> Dictionary:
	return {
		1051: {"style":"gloves","mainColor":"#bbaa88","cuffColor":"#998866","knuckleColor":"","hasGem":false,"gemColor":"","glowColor":""},
		1052: {"style":"gauntlets","mainColor":"#888899","cuffColor":"#666677","knuckleColor":"#999aaa","hasGem":false,"gemColor":"","glowColor":""},
		1053: {"style":"gauntlets","mainColor":"#cc5533","cuffColor":"#aa4422","knuckleColor":"#dd6644","hasGem":false,"gemColor":"","glowColor":"#dd5533"},
		1054: {"style":"gauntlets","mainColor":"#668844","cuffColor":"#557733","knuckleColor":"#888899","hasGem":false,"gemColor":"","glowColor":"#77aa55"},
		1055: {"style":"wraps","mainColor":"#9955aa","cuffColor":"#884499","knuckleColor":"#bb77cc","hasGem":true,"gemColor":"#dd88ee","glowColor":"#cc66dd"},
		1056: {"style":"gauntlets","mainColor":"#886644","cuffColor":"#775533","knuckleColor":"#ddaa33","hasGem":true,"gemColor":"#eebb44","glowColor":"#ccaa44"},
		# Expanded gloves
		1151: {"style":"mitts","mainColor":"#555566","cuffColor":"#444455","knuckleColor":"#666677","hasGem":false,"gemColor":"","glowColor":""},
		1152: {"style":"wraps","mainColor":"#cc4433","cuffColor":"#aa3322","knuckleColor":"#dd5544","hasGem":false,"gemColor":"","glowColor":"#cc4433"},
		1153: {"style":"gloves","mainColor":"#88bbdd","cuffColor":"#77aacc","knuckleColor":"#99ccee","hasGem":false,"gemColor":"","glowColor":"#aaddff"},
		1154: {"style":"bracers","mainColor":"#bbccdd","cuffColor":"#aabbcc","knuckleColor":"#ccddee","hasGem":false,"gemColor":"","glowColor":"#ccddee"},
		1155: {"style":"gauntlets","mainColor":"#886644","cuffColor":"#775533","knuckleColor":"#997755","hasGem":true,"gemColor":"#aa8866","glowColor":"#998866"},
		1156: {"style":"gauntlets","mainColor":"#332244","cuffColor":"#221133","knuckleColor":"#443355","hasGem":true,"gemColor":"#553388","glowColor":"#443366"},
		1157: {"style":"gloves","mainColor":"#ddaa22","cuffColor":"#cc9911","knuckleColor":"#eebb33","hasGem":true,"gemColor":"#ffdd44","glowColor":"#eebb33"},
		1158: {"style":"gauntlets","mainColor":"#448844","cuffColor":"#337733","knuckleColor":"#55aa55","hasGem":false,"gemColor":"","glowColor":"#55aa55"},
		1159: {"style":"gauntlets","mainColor":"#882222","cuffColor":"#661111","knuckleColor":"#aa3333","hasGem":true,"gemColor":"#cc2222","glowColor":"#aa3333"},
		1160: {"style":"gauntlets","mainColor":"#bb8844","cuffColor":"#aa7733","knuckleColor":"#ddaa33","hasGem":true,"gemColor":"#eebb44","glowColor":"#ccaa44"},
	}


## ── Ring Visual Configs ──────────────────────────────────────────────────────
## bandColor, gemColor, gemShape, glowColor, sparkle

static func get_ring_visuals() -> Dictionary:
	return {
		1061: {"bandColor":"#aa7744","gemColor":"","gemShape":"none","glowColor":"","sparkle":false},
		1062: {"bandColor":"#bbbbcc","gemColor":"","gemShape":"none","glowColor":"","sparkle":false},
		1063: {"bandColor":"#448844","gemColor":"#55cc55","gemShape":"round","glowColor":"#55aa55","sparkle":true},
		1064: {"bandColor":"#cc7733","gemColor":"#ff8833","gemShape":"diamond","glowColor":"#dd7733","sparkle":true},
		1065: {"bandColor":"#332244","gemColor":"#7744bb","gemShape":"diamond","glowColor":"#6633aa","sparkle":true},
		1066: {"bandColor":"#ddaa33","gemColor":"#ffffff","gemShape":"diamond","glowColor":"#ffdd66","sparkle":true},
		# Expanded rings
		1161: {"bandColor":"#bb7744","gemColor":"#cc4433","gemShape":"round","glowColor":"","sparkle":false},
		1162: {"bandColor":"#6688bb","gemColor":"#dd5533","gemShape":"round","glowColor":"#8899cc","sparkle":true},
		1163: {"bandColor":"#448844","gemColor":"#66cc66","gemShape":"round","glowColor":"#55aa55","sparkle":true},
		1164: {"bandColor":"#ccaa22","gemColor":"#ffee44","gemShape":"diamond","glowColor":"#ddbb33","sparkle":true},
		1165: {"bandColor":"#332244","gemColor":"#553377","gemShape":"square","glowColor":"#443366","sparkle":true},
		1166: {"bandColor":"#ddcc44","gemColor":"#ffee88","gemShape":"diamond","glowColor":"#ffdd66","sparkle":true},
		1167: {"bandColor":"#888899","gemColor":"","gemShape":"none","glowColor":"","sparkle":false},
		1168: {"bandColor":"#443366","gemColor":"#7755aa","gemShape":"diamond","glowColor":"#664499","sparkle":true},
		1169: {"bandColor":"#bbaa66","gemColor":"#eeeeff","gemShape":"diamond","glowColor":"#ccbb88","sparkle":true},
		1170: {"bandColor":"#aa5544","gemColor":"#bbbbcc","gemShape":"diamond","glowColor":"#bb6655","sparkle":true},
	}


## ── Amulet Visual Configs ────────────────────────────────────────────────────
## chainColor, pendantColor, pendantShape, gemColor, glowColor

static func get_amulet_visuals() -> Dictionary:
	return {
		1071: {"chainColor":"#776644","pendantColor":"#886644","pendantShape":"circle","gemColor":"","glowColor":""},
		1072: {"chainColor":"#aaaaaa","pendantColor":"#eeeedd","pendantShape":"circle","gemColor":"","glowColor":""},
		1073: {"chainColor":"#6699aa","pendantColor":"#3388aa","pendantShape":"teardrop","gemColor":"#44aacc","glowColor":"#4499bb"},
		1074: {"chainColor":"#ccaa44","pendantColor":"#ddaa33","pendantShape":"diamond","gemColor":"#ffcc44","glowColor":"#ddbb33"},
		1075: {"chainColor":"#8899bb","pendantColor":"#7788aa","pendantShape":"oval","gemColor":"#99aacc","glowColor":"#8899bb"},
		1076: {"chainColor":"#9988aa","pendantColor":"#7755aa","pendantShape":"heart","gemColor":"#9977cc","glowColor":"#8866bb"},
		# Expanded amulets
		1171: {"chainColor":"#888888","pendantColor":"#777777","pendantShape":"fang","gemColor":"","glowColor":""},
		1172: {"chainColor":"#cc6644","pendantColor":"#cc3322","pendantShape":"heart","gemColor":"#ff4433","glowColor":"#dd4433"},
		1173: {"chainColor":"#55aaaa","pendantColor":"#44bbbb","pendantShape":"oval","gemColor":"#66cccc","glowColor":"#55bbbb"},
		1174: {"chainColor":"#ddaa33","pendantColor":"#ccaa22","pendantShape":"crescent","gemColor":"#eebb44","glowColor":"#ddbb33"},
		1175: {"chainColor":"#553366","pendantColor":"#664477","pendantShape":"oval","gemColor":"#447744","glowColor":"#553377"},
		1176: {"chainColor":"#cccccc","pendantColor":"#ddddee","pendantShape":"star","gemColor":"#ffffff","glowColor":"#ddddee"},
		1177: {"chainColor":"#888888","pendantColor":"#777788","pendantShape":"diamond","gemColor":"#aa5544","glowColor":""},
		1178: {"chainColor":"#88aacc","pendantColor":"#7799bb","pendantShape":"teardrop","gemColor":"#aaccee","glowColor":"#88aacc"},
		1179: {"chainColor":"#662222","pendantColor":"#881111","pendantShape":"diamond","gemColor":"#cc2222","glowColor":"#aa2222"},
		1180: {"chainColor":"#669944","pendantColor":"#558833","pendantShape":"circle","gemColor":"#ddaa33","glowColor":"#66aa44"},
	}


## ── Crystal Visual Configs ───────────────────────────────────────────────────
## crystalColor, innerColor, outlineColor, size, shape, pulseSpeed, glowColor, hasTrail
## Valid shapes: diamond, prism, hexagon, orb, star, shard
## Cel-shaded style note: In Flat Cel-Shaded Chibi rendering mode, all crystal and gem
## shapes are drawn as simple colorful filled shapes with clean uniform black
## outlines (1-2px consistent thickness). Complex facets are replaced with a single bright
## inner highlight dot and flat shadow tones for depth. This keeps gems readable
## at chibi sprite scale while matching the flat cel-shaded aesthetic.

static func get_crystal_visuals() -> Dictionary:
	return {
		1081: {"crystalColor":"#888899","innerColor":"#aaaaaa","outlineColor":"#666677","size":"small","shape":"diamond","pulseSpeed":0.5,"glowColor":"#888888","hasTrail":false},
		1082: {"crystalColor":"#ccccdd","innerColor":"#eeeeff","outlineColor":"#aaaacc","size":"small","shape":"diamond","pulseSpeed":0.6,"glowColor":"#ccccdd","hasTrail":false},
		1083: {"crystalColor":"#aaaacc","innerColor":"#ccccee","outlineColor":"#8888aa","size":"medium","shape":"prism","pulseSpeed":0.8,"glowColor":"#aabbcc","hasTrail":false},
		1084: {"crystalColor":"#dd6633","innerColor":"#ff8844","outlineColor":"#aa4422","size":"medium","shape":"hexagon","pulseSpeed":1.0,"glowColor":"#dd6633","hasTrail":true},
		1085: {"crystalColor":"#cc55aa","innerColor":"#ee77cc","outlineColor":"#aa4488","size":"large","shape":"orb","pulseSpeed":1.2,"glowColor":"#dd66bb","hasTrail":true},
		1086: {"crystalColor":"#ddddee","innerColor":"#ffffff","outlineColor":"#bbbbdd","size":"large","shape":"star","pulseSpeed":1.5,"glowColor":"#eeeeff","hasTrail":true},
		# Expanded crystals
		1181: {"crystalColor":"#dd7733","innerColor":"#ff9944","outlineColor":"#aa5522","size":"small","shape":"diamond","pulseSpeed":0.7,"glowColor":"#dd7733","hasTrail":false},
		1182: {"crystalColor":"#88ccee","innerColor":"#aaddff","outlineColor":"#66aacc","size":"medium","shape":"shard","pulseSpeed":0.8,"glowColor":"#88ccee","hasTrail":false},
		1183: {"crystalColor":"#ddaa22","innerColor":"#ffcc44","outlineColor":"#bb8811","size":"medium","shape":"hexagon","pulseSpeed":0.9,"glowColor":"#ddbb33","hasTrail":false},
		1184: {"crystalColor":"#55aa55","innerColor":"#77cc77","outlineColor":"#448844","size":"medium","shape":"prism","pulseSpeed":1.0,"glowColor":"#66bb66","hasTrail":true},
		1185: {"crystalColor":"#553377","innerColor":"#7755aa","outlineColor":"#442266","size":"medium","shape":"prism","pulseSpeed":1.0,"glowColor":"#663399","hasTrail":true},
		1186: {"crystalColor":"#ddcc44","innerColor":"#ffee66","outlineColor":"#bbaa22","size":"large","shape":"orb","pulseSpeed":1.3,"glowColor":"#eedd55","hasTrail":true},
		1187: {"crystalColor":"#888899","innerColor":"#aaaabb","outlineColor":"#666677","size":"medium","shape":"hexagon","pulseSpeed":0.7,"glowColor":"#8888aa","hasTrail":false},
		1188: {"crystalColor":"#88aadd","innerColor":"#aaccff","outlineColor":"#6688bb","size":"large","shape":"orb","pulseSpeed":1.2,"glowColor":"#99bbee","hasTrail":true},
		1189: {"crystalColor":"#dd5533","innerColor":"#ff7744","outlineColor":"#aa3322","size":"large","shape":"star","pulseSpeed":1.5,"glowColor":"#ee6644","hasTrail":true},
		1190: {"crystalColor":"#ccccee","innerColor":"#ffffff","outlineColor":"#aaaadd","size":"large","shape":"star","pulseSpeed":2.0,"glowColor":"#ddddff","hasTrail":true},
	}


## ── Unified Lookup ───────────────────────────────────────────────────────────

## Get the visual config for any equipment ID.
static func get_visual_config(equipment_id: int) -> Dictionary:
	# Determine slot from ID range
	var slot_visuals: Dictionary = {}

	# Base weapons: 1001-1006, expanded: 1101-1110
	if (equipment_id >= 1001 and equipment_id <= 1006) or (equipment_id >= 1101 and equipment_id <= 1110):
		slot_visuals = get_weapon_visuals()
	# Base helmets: 1011-1016, expanded: 1111-1120
	elif (equipment_id >= 1011 and equipment_id <= 1016) or (equipment_id >= 1111 and equipment_id <= 1120):
		slot_visuals = get_helmet_visuals()
	# Base chest: 1021-1026, expanded: 1121-1130
	elif (equipment_id >= 1021 and equipment_id <= 1026) or (equipment_id >= 1121 and equipment_id <= 1130):
		slot_visuals = get_chest_visuals()
	# Base legs: 1031-1036, expanded: 1131-1140
	elif (equipment_id >= 1031 and equipment_id <= 1036) or (equipment_id >= 1131 and equipment_id <= 1140):
		slot_visuals = get_legs_visuals()
	# Base boots: 1041-1046, expanded: 1141-1150
	elif (equipment_id >= 1041 and equipment_id <= 1046) or (equipment_id >= 1141 and equipment_id <= 1150):
		slot_visuals = get_boots_visuals()
	# Base gloves: 1051-1056, expanded: 1151-1160
	elif (equipment_id >= 1051 and equipment_id <= 1056) or (equipment_id >= 1151 and equipment_id <= 1160):
		slot_visuals = get_gloves_visuals()
	# Base rings: 1061-1066, expanded: 1161-1170
	elif (equipment_id >= 1061 and equipment_id <= 1066) or (equipment_id >= 1161 and equipment_id <= 1170):
		slot_visuals = get_ring_visuals()
	# Base amulets: 1071-1076, expanded: 1171-1180
	elif (equipment_id >= 1071 and equipment_id <= 1076) or (equipment_id >= 1171 and equipment_id <= 1180):
		slot_visuals = get_amulet_visuals()
	# Base crystals: 1081-1086, expanded: 1181-1190
	elif (equipment_id >= 1081 and equipment_id <= 1086) or (equipment_id >= 1181 and equipment_id <= 1190):
		slot_visuals = get_crystal_visuals()

	return slot_visuals.get(equipment_id, {})


## Get default visual config for a slot type (used when no specific config exists).
static func get_slot_defaults(slot_type: String) -> Dictionary:
	match slot_type:
		"weapon":
			return {"shape":"sword","bladeColor":"#aab0b8","bladeHighlight":"#dde0e8","handleColor":"#553311","guardColor":"#887744","glowColor":"","bladeLength":10,"bladeWidth":2,"hasParticles":false,"particleColor":""}
		"helmet":
			return {"style":"cap","mainColor":"#888888","trimColor":"#666666","gemColor":"","height":3,"width":0,"hasVisor":false,"visorColor":"","glowColor":"","hasPlume":false,"plumeColor":""}
		"chest":
			return {"style":"tunic","mainColor":"#888877","trimColor":"#666655","accentColor":"#777766","hasShoulders":false,"shoulderColor":"","hasBelt":false,"beltColor":"","glowColor":"","pattern":"none"}
		"legs":
			return {"style":"leggings","mainColor":"#888877","trimColor":"#666655","kneeColor":"","hasKneePlates":false,"glowColor":""}
		"boots":
			return {"style":"boots","mainColor":"#664422","trimColor":"#553311","soleColor":"#442211","hasBuckle":false,"buckleColor":"","glowColor":""}
		"gloves":
			return {"style":"gloves","mainColor":"#888877","cuffColor":"#666655","knuckleColor":"","hasGem":false,"gemColor":"","glowColor":""}
		"ring":
			return {"bandColor":"#aa7744","gemColor":"","gemShape":"none","glowColor":"","sparkle":false}
		"amulet":
			return {"chainColor":"#888888","pendantColor":"#777777","pendantShape":"circle","gemColor":"","glowColor":""}
		"crystal":
			return {"crystalColor":"#888899","innerColor":"#aaaaaa","outlineColor":"#666677","size":"small","shape":"diamond","pulseSpeed":0.5,"glowColor":"#888888","hasTrail":false}
		_:
			return {}


## Flat cel-shaded art style rendering overrides for equipment visuals.
## Equipment drawn on chibi sprites uses clean uniform outlines and flat color fills.
static func get_cel_shaded_equipment_style() -> Dictionary:
	return {
		"outline_wobble": 0.0,           # No wobble — clean uniform outlines
		"outline_thickness": 2.0,        # Consistent outline thickness for cel-shaded look
		"outline_color": Color("1a1a1a"),# Crisp black outline
		"fill_hatching": false,          # No hatching — flat color fills only
		"glow_style": "solid",           # Solid flat glow instead of gradient
		"sparkle_style": "star_clean",   # Clean sharp-edged stars for sparkles
		"gem_style": "colored_circle",   # Simple colored circles for gems
		"pastel_shift": 0.0,             # No pastel shift — vibrant saturated colors
	}


## Validate that all equipment IDs in the database have visual configs.
static func validate_all_configs() -> Array[String]:
	var errors: Array[String] = []
	var all_visuals := {}
	all_visuals.merge(get_weapon_visuals())
	all_visuals.merge(get_helmet_visuals())
	all_visuals.merge(get_chest_visuals())
	all_visuals.merge(get_legs_visuals())
	all_visuals.merge(get_boots_visuals())
	all_visuals.merge(get_gloves_visuals())
	all_visuals.merge(get_ring_visuals())
	all_visuals.merge(get_amulet_visuals())
	all_visuals.merge(get_crystal_visuals())

	# Check all expected IDs
	var expected_ids: Array[int] = []
	# Base: 6 per slot × 9 slots = 54
	for base in [1001, 1011, 1021, 1031, 1041, 1051, 1061, 1071, 1081]:
		for i in range(6):
			expected_ids.append(base + i)
	# Expanded: 10 per slot × 9 slots = 90
	for base in [1101, 1111, 1121, 1131, 1141, 1151, 1161, 1171, 1181]:
		for i in range(10):
			expected_ids.append(base + i)

	for eid in expected_ids:
		if eid not in all_visuals:
			errors.append("Missing visual config for equipment_id %d" % eid)

	return errors

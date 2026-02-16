## EvolutionData — Static database of all 72 evolution form definitions.
## [P1-007, P1-008] Defines stages 1-3 for each of the 24 Sprite races.
##
## Design notes:
##   - form_id = race_id * 3 - 2 (stage 1), race_id * 3 - 1 (stage 2), race_id * 3 (stage 3)
##   - Stage 1: all multipliers 1.0, no evolution trigger
##   - Stage 2: multipliers 1.3-1.5x on key stats, evolves at level 16-20
##   - Stage 3: multipliers 1.6-2.0x on key stats, evolves at level 32-36 (some item-based)
##   - ability_changes: {learn_level, ability_id, replaces_ability_id} per stage
##   - Ability IDs reference AbilityDatabase.gd
class_name EvolutionData
extends RefCounted

## Return all 72 evolution form dictionaries keyed by form_id.
static func get_all_forms() -> Dictionary:
	return {
		# ══════════════════════════════════════════════════════════════════════
		# RACE 1 — Emberpaw → Infernoclaw → Blazerath (Fire / Berserker)
		# ══════════════════════════════════════════════════════════════════════
		1: {
			"form_id": 1, "race_id": 1, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		2: {
			"form_id": 2, "race_id": 1, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.5, "def": 1.3, "spd": 1.4, "sp_atk": 1.3, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 16, "ability_id": 5, "replaces_ability_id": -1},
				{"learn_level": 20, "ability_id": 8, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 16,
			"evolution_trigger_description": "Evolves at level 16.",
		},
		3: {
			"form_id": 3, "race_id": 1, "stage_number": 3,
			"stat_multipliers": {"hp": 1.6, "atk": 2.0, "def": 1.6, "spd": 1.8, "sp_atk": 1.6, "sp_def": 1.6},
			"ability_changes": [
				{"learn_level": 32, "ability_id": 10, "replaces_ability_id": 1},
				{"learn_level": 36, "ability_id": 11, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 32,
			"evolution_trigger_description": "Evolves at level 32.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 2 — Tidalfin → Torrentscale → Abyssguard (Water / Guardian)
		# ══════════════════════════════════════════════════════════════════════
		4: {
			"form_id": 4, "race_id": 2, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		5: {
			"form_id": 5, "race_id": 2, "stage_number": 2,
			"stat_multipliers": {"hp": 1.4, "atk": 1.3, "def": 1.4, "spd": 1.3, "sp_atk": 1.3, "sp_def": 1.4},
			"ability_changes": [
				{"learn_level": 17, "ability_id": 16, "replaces_ability_id": -1},
				{"learn_level": 21, "ability_id": 19, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 17,
			"evolution_trigger_description": "Evolves at level 17.",
		},
		6: {
			"form_id": 6, "race_id": 2, "stage_number": 3,
			"stat_multipliers": {"hp": 1.8, "atk": 1.6, "def": 1.9, "spd": 1.6, "sp_atk": 1.7, "sp_def": 1.9},
			"ability_changes": [
				{"learn_level": 34, "ability_id": 22, "replaces_ability_id": 12},
				{"learn_level": 36, "ability_id": 23, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 34,
			"evolution_trigger_description": "Evolves at level 34.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 3 — Thornvine → Briarwarden → Sylvanguard (Nature / Ranger)
		# ══════════════════════════════════════════════════════════════════════
		7: {
			"form_id": 7, "race_id": 3, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		8: {
			"form_id": 8, "race_id": 3, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.3, "def": 1.4, "spd": 1.3, "sp_atk": 1.4, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 16, "ability_id": 27, "replaces_ability_id": -1},
				{"learn_level": 19, "ability_id": 30, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 16,
			"evolution_trigger_description": "Evolves at level 16.",
		},
		9: {
			"form_id": 9, "race_id": 3, "stage_number": 3,
			"stat_multipliers": {"hp": 1.7, "atk": 1.6, "def": 1.8, "spd": 1.6, "sp_atk": 1.8, "sp_def": 1.7},
			"ability_changes": [
				{"learn_level": 33, "ability_id": 33, "replaces_ability_id": 24},
				{"learn_level": 36, "ability_id": 34, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 33,
			"evolution_trigger_description": "Evolves at level 33.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 4 — Frostfang → Glacierclaw → Blizzarbane (Ice / Assassin)
		# ══════════════════════════════════════════════════════════════════════
		10: {
			"form_id": 10, "race_id": 4, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		11: {
			"form_id": 11, "race_id": 4, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.4, "def": 1.3, "spd": 1.5, "sp_atk": 1.4, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 18, "ability_id": 38, "replaces_ability_id": -1},
				{"learn_level": 22, "ability_id": 41, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 18,
			"evolution_trigger_description": "Evolves at level 18.",
		},
		12: {
			"form_id": 12, "race_id": 4, "stage_number": 3,
			"stat_multipliers": {"hp": 1.6, "atk": 1.8, "def": 1.6, "spd": 2.0, "sp_atk": 1.8, "sp_def": 1.6},
			"ability_changes": [
				{"learn_level": 35, "ability_id": 44, "replaces_ability_id": 35},
				{"learn_level": 36, "ability_id": 45, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "item",
			"evolution_trigger_value": 101,
			"evolution_trigger_description": "Evolves when exposed to a Frost Shard.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 5 — Galecrest → Stormwing → Tempestlord (Air / Archer)
		# ══════════════════════════════════════════════════════════════════════
		13: {
			"form_id": 13, "race_id": 5, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		14: {
			"form_id": 14, "race_id": 5, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.3, "def": 1.3, "spd": 1.5, "sp_atk": 1.4, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 16, "ability_id": 49, "replaces_ability_id": -1},
				{"learn_level": 20, "ability_id": 52, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 16,
			"evolution_trigger_description": "Evolves at level 16.",
		},
		15: {
			"form_id": 15, "race_id": 5, "stage_number": 3,
			"stat_multipliers": {"hp": 1.6, "atk": 1.7, "def": 1.6, "spd": 2.0, "sp_atk": 1.8, "sp_def": 1.6},
			"ability_changes": [
				{"learn_level": 34, "ability_id": 55, "replaces_ability_id": 46},
				{"learn_level": 36, "ability_id": 56, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 34,
			"evolution_trigger_description": "Evolves at level 34.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 6 — Terraclaw → Boulderknee → Monolithion (Earth / Knight)
		# ══════════════════════════════════════════════════════════════════════
		16: {
			"form_id": 16, "race_id": 6, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		17: {
			"form_id": 17, "race_id": 6, "stage_number": 2,
			"stat_multipliers": {"hp": 1.4, "atk": 1.3, "def": 1.5, "spd": 1.3, "sp_atk": 1.3, "sp_def": 1.4},
			"ability_changes": [
				{"learn_level": 18, "ability_id": 60, "replaces_ability_id": -1},
				{"learn_level": 22, "ability_id": 63, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 18,
			"evolution_trigger_description": "Evolves at level 18.",
		},
		18: {
			"form_id": 18, "race_id": 6, "stage_number": 3,
			"stat_multipliers": {"hp": 1.8, "atk": 1.7, "def": 2.0, "spd": 1.6, "sp_atk": 1.6, "sp_def": 1.8},
			"ability_changes": [
				{"learn_level": 34, "ability_id": 66, "replaces_ability_id": 57},
				{"learn_level": 36, "ability_id": 67, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 34,
			"evolution_trigger_description": "Evolves at level 34.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 7 — Voltail → Arcstrike → Thunderlord (Electric / Wizard)
		# ══════════════════════════════════════════════════════════════════════
		19: {
			"form_id": 19, "race_id": 7, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		20: {
			"form_id": 20, "race_id": 7, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.3, "def": 1.3, "spd": 1.4, "sp_atk": 1.5, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 17, "ability_id": 71, "replaces_ability_id": -1},
				{"learn_level": 21, "ability_id": 74, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 17,
			"evolution_trigger_description": "Evolves at level 17.",
		},
		21: {
			"form_id": 21, "race_id": 7, "stage_number": 3,
			"stat_multipliers": {"hp": 1.6, "atk": 1.6, "def": 1.6, "spd": 1.8, "sp_atk": 2.0, "sp_def": 1.7},
			"ability_changes": [
				{"learn_level": 33, "ability_id": 77, "replaces_ability_id": 68},
				{"learn_level": 36, "ability_id": 78, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 33,
			"evolution_trigger_description": "Evolves at level 33.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 8 — Gloomshade → Nightfang → Voidreaver (Dark / Assassin)
		# ══════════════════════════════════════════════════════════════════════
		22: {
			"form_id": 22, "race_id": 8, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		23: {
			"form_id": 23, "race_id": 8, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.5, "def": 1.3, "spd": 1.4, "sp_atk": 1.4, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 18, "ability_id": 82, "replaces_ability_id": -1},
				{"learn_level": 22, "ability_id": 85, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 18,
			"evolution_trigger_description": "Evolves at level 18.",
		},
		24: {
			"form_id": 24, "race_id": 8, "stage_number": 3,
			"stat_multipliers": {"hp": 1.6, "atk": 1.9, "def": 1.6, "spd": 1.8, "sp_atk": 1.8, "sp_def": 1.6},
			"ability_changes": [
				{"learn_level": 35, "ability_id": 88, "replaces_ability_id": 79},
				{"learn_level": 36, "ability_id": 89, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "item",
			"evolution_trigger_value": 102,
			"evolution_trigger_description": "Evolves when exposed to a Shadow Gem.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 9 — Luminos → Radiancewing → Dawnkeeper (Light / Cleric)
		# ══════════════════════════════════════════════════════════════════════
		25: {
			"form_id": 25, "race_id": 9, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		26: {
			"form_id": 26, "race_id": 9, "stage_number": 2,
			"stat_multipliers": {"hp": 1.4, "atk": 1.3, "def": 1.3, "spd": 1.3, "sp_atk": 1.4, "sp_def": 1.5},
			"ability_changes": [
				{"learn_level": 17, "ability_id": 93, "replaces_ability_id": -1},
				{"learn_level": 20, "ability_id": 96, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 17,
			"evolution_trigger_description": "Evolves at level 17.",
		},
		27: {
			"form_id": 27, "race_id": 9, "stage_number": 3,
			"stat_multipliers": {"hp": 1.8, "atk": 1.6, "def": 1.7, "spd": 1.6, "sp_atk": 1.9, "sp_def": 2.0},
			"ability_changes": [
				{"learn_level": 34, "ability_id": 99, "replaces_ability_id": 90},
				{"learn_level": 36, "ability_id": 100, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 34,
			"evolution_trigger_description": "Evolves at level 34.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 10 — Glimmerwing → Prismoth → Mindweaver (Psychic / Summoner)
		# ══════════════════════════════════════════════════════════════════════
		28: {
			"form_id": 28, "race_id": 10, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		29: {
			"form_id": 29, "race_id": 10, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.3, "def": 1.3, "spd": 1.3, "sp_atk": 1.5, "sp_def": 1.4},
			"ability_changes": [
				{"learn_level": 18, "ability_id": 104, "replaces_ability_id": -1},
				{"learn_level": 22, "ability_id": 107, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 18,
			"evolution_trigger_description": "Evolves at level 18.",
		},
		30: {
			"form_id": 30, "race_id": 10, "stage_number": 3,
			"stat_multipliers": {"hp": 1.7, "atk": 1.6, "def": 1.6, "spd": 1.7, "sp_atk": 2.0, "sp_def": 1.8},
			"ability_changes": [
				{"learn_level": 35, "ability_id": 110, "replaces_ability_id": 101},
				{"learn_level": 36, "ability_id": 111, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 35,
			"evolution_trigger_description": "Evolves at level 35.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 11 — Spectrail → Phantomcoil → Ethereon (Spirit / Wizard)
		# ══════════════════════════════════════════════════════════════════════
		31: {
			"form_id": 31, "race_id": 11, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		32: {
			"form_id": 32, "race_id": 11, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.3, "def": 1.3, "spd": 1.4, "sp_atk": 1.5, "sp_def": 1.4},
			"ability_changes": [
				{"learn_level": 19, "ability_id": 115, "replaces_ability_id": -1},
				{"learn_level": 23, "ability_id": 118, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 19,
			"evolution_trigger_description": "Evolves at level 19.",
		},
		33: {
			"form_id": 33, "race_id": 11, "stage_number": 3,
			"stat_multipliers": {"hp": 1.7, "atk": 1.6, "def": 1.7, "spd": 1.8, "sp_atk": 2.0, "sp_def": 1.8},
			"ability_changes": [
				{"learn_level": 35, "ability_id": 121, "replaces_ability_id": 112},
				{"learn_level": 36, "ability_id": 122, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "item",
			"evolution_trigger_value": 103,
			"evolution_trigger_description": "Evolves when exposed to a Spirit Essence.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 12 — Ignisurge → Chaosflame → Entropyrex (Chaos / Berserker)
		# ══════════════════════════════════════════════════════════════════════
		34: {
			"form_id": 34, "race_id": 12, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		35: {
			"form_id": 35, "race_id": 12, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.5, "def": 1.3, "spd": 1.4, "sp_atk": 1.4, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 20, "ability_id": 126, "replaces_ability_id": -1},
				{"learn_level": 24, "ability_id": 129, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 20,
			"evolution_trigger_description": "Evolves at level 20.",
		},
		36: {
			"form_id": 36, "race_id": 12, "stage_number": 3,
			"stat_multipliers": {"hp": 1.7, "atk": 2.0, "def": 1.6, "spd": 1.8, "sp_atk": 1.8, "sp_def": 1.6},
			"ability_changes": [
				{"learn_level": 36, "ability_id": 132, "replaces_ability_id": 123},
				{"learn_level": 36, "ability_id": 133, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "item",
			"evolution_trigger_value": 104,
			"evolution_trigger_description": "Evolves when exposed to a Chaos Crystal.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 13 — Ironhusk → Steelshell → Titanforge (Metal / Knight)
		# ══════════════════════════════════════════════════════════════════════
		37: {
			"form_id": 37, "race_id": 13, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		38: {
			"form_id": 38, "race_id": 13, "stage_number": 2,
			"stat_multipliers": {"hp": 1.4, "atk": 1.3, "def": 1.5, "spd": 1.3, "sp_atk": 1.3, "sp_def": 1.4},
			"ability_changes": [
				{"learn_level": 18, "ability_id": 137, "replaces_ability_id": -1},
				{"learn_level": 22, "ability_id": 140, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 18,
			"evolution_trigger_description": "Evolves at level 18.",
		},
		39: {
			"form_id": 39, "race_id": 13, "stage_number": 3,
			"stat_multipliers": {"hp": 1.8, "atk": 1.7, "def": 2.0, "spd": 1.6, "sp_atk": 1.6, "sp_def": 1.8},
			"ability_changes": [
				{"learn_level": 34, "ability_id": 143, "replaces_ability_id": 134},
				{"learn_level": 36, "ability_id": 144, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 34,
			"evolution_trigger_description": "Evolves at level 34.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 14 — Venomire → Toxicscale → Plaguestalker (Poison / Ranger)
		# ══════════════════════════════════════════════════════════════════════
		40: {
			"form_id": 40, "race_id": 14, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		41: {
			"form_id": 41, "race_id": 14, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.3, "def": 1.3, "spd": 1.4, "sp_atk": 1.4, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 16, "ability_id": 148, "replaces_ability_id": -1},
				{"learn_level": 20, "ability_id": 151, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 16,
			"evolution_trigger_description": "Evolves at level 16.",
		},
		42: {
			"form_id": 42, "race_id": 14, "stage_number": 3,
			"stat_multipliers": {"hp": 1.7, "atk": 1.7, "def": 1.7, "spd": 1.8, "sp_atk": 1.8, "sp_def": 1.7},
			"ability_changes": [
				{"learn_level": 33, "ability_id": 154, "replaces_ability_id": 145},
				{"learn_level": 36, "ability_id": 155, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 33,
			"evolution_trigger_description": "Evolves at level 33.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 15 — Blazeguard → Infernowall → Magmashield (Fire / Guardian)
		# ══════════════════════════════════════════════════════════════════════
		43: {
			"form_id": 43, "race_id": 15, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		44: {
			"form_id": 44, "race_id": 15, "stage_number": 2,
			"stat_multipliers": {"hp": 1.4, "atk": 1.3, "def": 1.4, "spd": 1.3, "sp_atk": 1.3, "sp_def": 1.4},
			"ability_changes": [
				{"learn_level": 17, "ability_id": 6, "replaces_ability_id": -1},
				{"learn_level": 21, "ability_id": 9, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 17,
			"evolution_trigger_description": "Evolves at level 17.",
		},
		45: {
			"form_id": 45, "race_id": 15, "stage_number": 3,
			"stat_multipliers": {"hp": 1.9, "atk": 1.6, "def": 1.8, "spd": 1.6, "sp_atk": 1.7, "sp_def": 1.8},
			"ability_changes": [
				{"learn_level": 34, "ability_id": 10, "replaces_ability_id": 1},
				{"learn_level": 36, "ability_id": 11, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 34,
			"evolution_trigger_description": "Evolves at level 34.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 16 — Aquashot → Torrentbow → Tidesurfer (Water / Archer)
		# ══════════════════════════════════════════════════════════════════════
		46: {
			"form_id": 46, "race_id": 16, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		47: {
			"form_id": 47, "race_id": 16, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.4, "def": 1.3, "spd": 1.4, "sp_atk": 1.4, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 17, "ability_id": 17, "replaces_ability_id": -1},
				{"learn_level": 21, "ability_id": 20, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 17,
			"evolution_trigger_description": "Evolves at level 17.",
		},
		48: {
			"form_id": 48, "race_id": 16, "stage_number": 3,
			"stat_multipliers": {"hp": 1.6, "atk": 1.8, "def": 1.6, "spd": 1.8, "sp_atk": 1.8, "sp_def": 1.6},
			"ability_changes": [
				{"learn_level": 34, "ability_id": 22, "replaces_ability_id": 12},
				{"learn_level": 36, "ability_id": 23, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 34,
			"evolution_trigger_description": "Evolves at level 34.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 17 — Pyrovolt → Plasmaflare → Thunderblaze (Fire+Electric / Wizard)
		# ══════════════════════════════════════════════════════════════════════
		49: {
			"form_id": 49, "race_id": 17, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		50: {
			"form_id": 50, "race_id": 17, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.3, "def": 1.3, "spd": 1.4, "sp_atk": 1.5, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 19, "ability_id": 8, "replaces_ability_id": -1},
				{"learn_level": 23, "ability_id": 74, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 19,
			"evolution_trigger_description": "Evolves at level 19.",
		},
		51: {
			"form_id": 51, "race_id": 17, "stage_number": 3,
			"stat_multipliers": {"hp": 1.6, "atk": 1.6, "def": 1.6, "spd": 1.8, "sp_atk": 2.0, "sp_def": 1.7},
			"ability_changes": [
				{"learn_level": 35, "ability_id": 11, "replaces_ability_id": 1},
				{"learn_level": 36, "ability_id": 78, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 35,
			"evolution_trigger_description": "Evolves at level 35.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 18 — Venomthorn → Blightstinger → Plaguebramble (Poison+Nature / Spearman)
		# ══════════════════════════════════════════════════════════════════════
		52: {
			"form_id": 52, "race_id": 18, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		53: {
			"form_id": 53, "race_id": 18, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.4, "def": 1.3, "spd": 1.3, "sp_atk": 1.3, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 17, "ability_id": 148, "replaces_ability_id": -1},
				{"learn_level": 21, "ability_id": 30, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 17,
			"evolution_trigger_description": "Evolves at level 17.",
		},
		54: {
			"form_id": 54, "race_id": 18, "stage_number": 3,
			"stat_multipliers": {"hp": 1.7, "atk": 1.8, "def": 1.7, "spd": 1.6, "sp_atk": 1.7, "sp_def": 1.7},
			"ability_changes": [
				{"learn_level": 34, "ability_id": 155, "replaces_ability_id": 145},
				{"learn_level": 36, "ability_id": 34, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 34,
			"evolution_trigger_description": "Evolves at level 34.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 19 — Shadowflare → Duskblade → Eclipsefire (Dark+Fire / Spearman)
		# ══════════════════════════════════════════════════════════════════════
		55: {
			"form_id": 55, "race_id": 19, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		56: {
			"form_id": 56, "race_id": 19, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.5, "def": 1.3, "spd": 1.4, "sp_atk": 1.3, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 19, "ability_id": 82, "replaces_ability_id": -1},
				{"learn_level": 23, "ability_id": 8, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 19,
			"evolution_trigger_description": "Evolves at level 19.",
		},
		57: {
			"form_id": 57, "race_id": 19, "stage_number": 3,
			"stat_multipliers": {"hp": 1.7, "atk": 2.0, "def": 1.6, "spd": 1.8, "sp_atk": 1.7, "sp_def": 1.6},
			"ability_changes": [
				{"learn_level": 35, "ability_id": 89, "replaces_ability_id": 79},
				{"learn_level": 36, "ability_id": 11, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "item",
			"evolution_trigger_value": 105,
			"evolution_trigger_description": "Evolves when exposed to a Dusk Ember.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 20 — Crystalmist → Frostveil → Glacialpsych (Ice+Psychic / Cleric)
		# ══════════════════════════════════════════════════════════════════════
		58: {
			"form_id": 58, "race_id": 20, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		59: {
			"form_id": 59, "race_id": 20, "stage_number": 2,
			"stat_multipliers": {"hp": 1.4, "atk": 1.3, "def": 1.3, "spd": 1.3, "sp_atk": 1.4, "sp_def": 1.5},
			"ability_changes": [
				{"learn_level": 18, "ability_id": 41, "replaces_ability_id": -1},
				{"learn_level": 22, "ability_id": 107, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 18,
			"evolution_trigger_description": "Evolves at level 18.",
		},
		60: {
			"form_id": 60, "race_id": 20, "stage_number": 3,
			"stat_multipliers": {"hp": 1.8, "atk": 1.6, "def": 1.7, "spd": 1.6, "sp_atk": 1.9, "sp_def": 2.0},
			"ability_changes": [
				{"learn_level": 35, "ability_id": 45, "replaces_ability_id": 35},
				{"learn_level": 36, "ability_id": 111, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 35,
			"evolution_trigger_description": "Evolves at level 35.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 21 — Ironstorm → Steelgale → Titanwing (Metal+Air / Berserker)
		# ══════════════════════════════════════════════════════════════════════
		61: {
			"form_id": 61, "race_id": 21, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		62: {
			"form_id": 62, "race_id": 21, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.4, "def": 1.4, "spd": 1.3, "sp_atk": 1.3, "sp_def": 1.3},
			"ability_changes": [
				{"learn_level": 18, "ability_id": 137, "replaces_ability_id": -1},
				{"learn_level": 22, "ability_id": 52, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 18,
			"evolution_trigger_description": "Evolves at level 18.",
		},
		63: {
			"form_id": 63, "race_id": 21, "stage_number": 3,
			"stat_multipliers": {"hp": 1.7, "atk": 1.9, "def": 1.8, "spd": 1.7, "sp_atk": 1.6, "sp_def": 1.7},
			"ability_changes": [
				{"learn_level": 35, "ability_id": 144, "replaces_ability_id": 134},
				{"learn_level": 36, "ability_id": 56, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 35,
			"evolution_trigger_description": "Evolves at level 35.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 22 — Spiritbloom → Ancestralgrove → Worldtree (Spirit+Nature / Summoner)
		# ══════════════════════════════════════════════════════════════════════
		64: {
			"form_id": 64, "race_id": 22, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		65: {
			"form_id": 65, "race_id": 22, "stage_number": 2,
			"stat_multipliers": {"hp": 1.3, "atk": 1.3, "def": 1.3, "spd": 1.3, "sp_atk": 1.5, "sp_def": 1.4},
			"ability_changes": [
				{"learn_level": 19, "ability_id": 115, "replaces_ability_id": -1},
				{"learn_level": 23, "ability_id": 30, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 19,
			"evolution_trigger_description": "Evolves at level 19.",
		},
		66: {
			"form_id": 66, "race_id": 22, "stage_number": 3,
			"stat_multipliers": {"hp": 1.7, "atk": 1.6, "def": 1.7, "spd": 1.6, "sp_atk": 2.0, "sp_def": 1.8},
			"ability_changes": [
				{"learn_level": 35, "ability_id": 122, "replaces_ability_id": 112},
				{"learn_level": 36, "ability_id": 34, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "item",
			"evolution_trigger_value": 106,
			"evolution_trigger_description": "Evolves when exposed to a World Seed.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 23 — Solarius → Novaflare → Cosmosguard (Light+Chaos / Guardian) [LEGENDARY]
		# ══════════════════════════════════════════════════════════════════════
		67: {
			"form_id": 67, "race_id": 23, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		68: {
			"form_id": 68, "race_id": 23, "stage_number": 2,
			"stat_multipliers": {"hp": 1.4, "atk": 1.3, "def": 1.4, "spd": 1.3, "sp_atk": 1.4, "sp_def": 1.5},
			"ability_changes": [
				{"learn_level": 20, "ability_id": 99, "replaces_ability_id": -1},
				{"learn_level": 24, "ability_id": 132, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 20,
			"evolution_trigger_description": "Evolves at level 20.",
		},
		69: {
			"form_id": 69, "race_id": 23, "stage_number": 3,
			"stat_multipliers": {"hp": 1.9, "atk": 1.7, "def": 1.9, "spd": 1.7, "sp_atk": 1.8, "sp_def": 2.0},
			"ability_changes": [
				{"learn_level": 36, "ability_id": 100, "replaces_ability_id": 90},
				{"learn_level": 36, "ability_id": 133, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "item",
			"evolution_trigger_value": 107,
			"evolution_trigger_description": "Evolves when exposed to a Celestial Core.",
		},

		# ══════════════════════════════════════════════════════════════════════
		# RACE 24 — Eclipsar → Twilightmaw → Voidemperor (Dark+Spirit / Summoner) [LEGENDARY]
		# ══════════════════════════════════════════════════════════════════════
		70: {
			"form_id": 70, "race_id": 24, "stage_number": 1,
			"stat_multipliers": {"hp": 1.0, "atk": 1.0, "def": 1.0, "spd": 1.0, "sp_atk": 1.0, "sp_def": 1.0},
			"ability_changes": [],
			"evolution_trigger_type": "none",
			"evolution_trigger_value": 0,
			"evolution_trigger_description": "Base form.",
		},
		71: {
			"form_id": 71, "race_id": 24, "stage_number": 2,
			"stat_multipliers": {"hp": 1.4, "atk": 1.3, "def": 1.3, "spd": 1.3, "sp_atk": 1.5, "sp_def": 1.4},
			"ability_changes": [
				{"learn_level": 20, "ability_id": 88, "replaces_ability_id": -1},
				{"learn_level": 24, "ability_id": 121, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "level",
			"evolution_trigger_value": 20,
			"evolution_trigger_description": "Evolves at level 20.",
		},
		72: {
			"form_id": 72, "race_id": 24, "stage_number": 3,
			"stat_multipliers": {"hp": 1.8, "atk": 1.7, "def": 1.7, "spd": 1.7, "sp_atk": 2.0, "sp_def": 1.9},
			"ability_changes": [
				{"learn_level": 36, "ability_id": 89, "replaces_ability_id": 79},
				{"learn_level": 36, "ability_id": 122, "replaces_ability_id": -1},
			],
			"evolution_trigger_type": "item",
			"evolution_trigger_value": 108,
			"evolution_trigger_description": "Evolves when exposed to an Eclipse Shard.",
		},
	}


## Return a single form dictionary by form_id.
static func get_form(form_id: int) -> Dictionary:
	var all_forms := get_all_forms()
	return all_forms.get(form_id, {})


## Return all three forms for a given race_id.
static func get_forms_for_race(race_id: int) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	var all_forms := get_all_forms()
	for fid: int in [race_id * 3 - 2, race_id * 3 - 1, race_id * 3]:
		if all_forms.has(fid):
			result.append(all_forms[fid])
	return result


## Return the form for a specific race and stage.
static func get_form_for_stage(race_id: int, stage: int) -> Dictionary:
	var form_id: int = race_id * 3 - 3 + stage
	return get_form(form_id)


## Return all forms that use item-based evolution.
static func get_item_evolution_forms() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	var all_forms := get_all_forms()
	for fid: int in all_forms:
		var form: Dictionary = all_forms[fid]
		if form.get("evolution_trigger_type", "") == "item":
			result.append(form)
	return result


## Get the evolution item ID required for a specific race's stage 3, or -1 if level-based.
static func get_evolution_item_id(race_id: int) -> int:
	var stage_3 := get_form_for_stage(race_id, 3)
	if stage_3.get("evolution_trigger_type", "") == "item":
		return int(stage_3.get("evolution_trigger_value", -1))
	return -1

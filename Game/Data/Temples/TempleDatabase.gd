## TempleDatabase — Static database of all 30 temple definitions.
## 14 elemental temples + 16 class-based temples (2 per class).
## Each temple follows the TempleData schema with: temple_id, temple_name,
## temple_type, dominant_element/class, difficulty_tier, region_areas,
## boss_data, unlock_prerequisites, reward_pool.
class_name TempleDatabase
extends RefCounted


static func get_all_temples() -> Array[Dictionary]:
	return [
		# ══════════════════════════════════════════════════════════════════
		# ELEMENTAL TEMPLES (14)
		# ══════════════════════════════════════════════════════════════════

		# ── 1. Fire Temple ───────────────────────────────────────────────
		{
			"temple_id": 1,
			"temple_name": "Blazecore Sanctum",
			"temple_type": "elemental",
			"dominant_element": "Fire",
			"dominant_class": "",
			"secondary_elements": ["Earth", "Chaos"],
			"difficulty_tier": 2,
			"region_areas": [
				{"area_name": "Molten Corridor", "area_type": "corridor", "encounter_table_id": 101, "tileset_ref": "res://Sprites/Tilesets/fire_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/lava_ambient.ogg", "npc_data": []},
				{"area_name": "Ember Chamber", "area_type": "chamber", "encounter_table_id": 102, "tileset_ref": "res://Sprites/Tilesets/fire_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/lava_ambient.ogg", "npc_data": []},
				{"area_name": "Flame Puzzle Hall", "area_type": "puzzle", "encounter_table_id": 103, "tileset_ref": "res://Sprites/Tilesets/fire_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/fire_crackle.ogg", "npc_data": []},
				{"area_name": "Inferno Arena", "area_type": "boss_arena", "encounter_table_id": 104, "tileset_ref": "res://Sprites/Tilesets/fire_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 1, "level_offset": 3, "ability_ids": [1, 5, 12, 28], "ai_profile": "aggressive"},
			"unlock_prerequisites": {"quest_ids": [5], "temple_ids": [], "min_level": 5},
			"reward_pool": {
				"equipment_ids": [1001, 1002, 1003],
				"drop_rates": {1001: 0.3, 1002: 0.2, 1003: 0.1},
				"first_clear_bonus": {"xp": 200, "currency": 200, "items": [{"item_id": 201, "count": 5}], "unlocks": ["bonus_1"]},
			},
		},

		# ── 2. Water Temple ──────────────────────────────────────────────
		{
			"temple_id": 2,
			"temple_name": "Abyssal Depths",
			"temple_type": "elemental",
			"dominant_element": "Water",
			"dominant_class": "",
			"secondary_elements": ["Ice", "Nature"],
			"difficulty_tier": 2,
			"region_areas": [
				{"area_name": "Tidal Passage", "area_type": "corridor", "encounter_table_id": 201, "tileset_ref": "res://Sprites/Tilesets/water_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/water_drip.ogg", "npc_data": []},
				{"area_name": "Coral Chamber", "area_type": "chamber", "encounter_table_id": 202, "tileset_ref": "res://Sprites/Tilesets/water_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/underwater.ogg", "npc_data": []},
				{"area_name": "Whirlpool Puzzle", "area_type": "puzzle", "encounter_table_id": 203, "tileset_ref": "res://Sprites/Tilesets/water_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/water_rush.ogg", "npc_data": []},
				{"area_name": "Leviathan's Lair", "area_type": "boss_arena", "encounter_table_id": 204, "tileset_ref": "res://Sprites/Tilesets/water_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 2, "level_offset": 3, "ability_ids": [2, 8, 15, 30], "ai_profile": "defensive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 5},
			"reward_pool": {
				"equipment_ids": [1004, 1005, 1006],
				"drop_rates": {1004: 0.3, 1005: 0.2, 1006: 0.1},
				"first_clear_bonus": {"xp": 200, "currency": 200, "items": [{"item_id": 201, "count": 5}], "unlocks": ["bonus_2"]},
			},
		},

		# ── 3. Nature Temple ─────────────────────────────────────────────
		{
			"temple_id": 3,
			"temple_name": "Verdant Sanctum",
			"temple_type": "elemental",
			"dominant_element": "Nature",
			"dominant_class": "",
			"secondary_elements": ["Water", "Earth"],
			"difficulty_tier": 3,
			"region_areas": [
				{"area_name": "Vine Corridor", "area_type": "corridor", "encounter_table_id": 301, "tileset_ref": "res://Sprites/Tilesets/nature_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/forest_ambient.ogg", "npc_data": []},
				{"area_name": "Grove Chamber", "area_type": "chamber", "encounter_table_id": 302, "tileset_ref": "res://Sprites/Tilesets/nature_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/birds.ogg", "npc_data": []},
				{"area_name": "Root Puzzle", "area_type": "puzzle", "encounter_table_id": 303, "tileset_ref": "res://Sprites/Tilesets/nature_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/wind_leaves.ogg", "npc_data": []},
				{"area_name": "Ancient Treant Arena", "area_type": "boss_arena", "encounter_table_id": 304, "tileset_ref": "res://Sprites/Tilesets/nature_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 3, "level_offset": 4, "ability_ids": [3, 9, 18, 35], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 8},
			"reward_pool": {
				"equipment_ids": [1007, 1008, 1009],
				"drop_rates": {1007: 0.3, 1008: 0.2, 1009: 0.1},
				"first_clear_bonus": {"xp": 300, "currency": 250, "items": [{"item_id": 202, "count": 3}], "unlocks": ["bonus_3"]},
			},
		},

		# ── 4. Ice Temple ────────────────────────────────────────────────
		{
			"temple_id": 4,
			"temple_name": "Frostpeak Citadel",
			"temple_type": "elemental",
			"dominant_element": "Ice",
			"dominant_class": "",
			"secondary_elements": ["Water", "Air"],
			"difficulty_tier": 4,
			"region_areas": [
				{"area_name": "Frozen Corridor", "area_type": "corridor", "encounter_table_id": 401, "tileset_ref": "res://Sprites/Tilesets/ice_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/blizzard.ogg", "npc_data": []},
				{"area_name": "Crystal Cavern", "area_type": "chamber", "encounter_table_id": 402, "tileset_ref": "res://Sprites/Tilesets/ice_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/ice_crack.ogg", "npc_data": []},
				{"area_name": "Ice Slide Puzzle", "area_type": "puzzle", "encounter_table_id": 403, "tileset_ref": "res://Sprites/Tilesets/ice_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/wind_howl.ogg", "npc_data": []},
				{"area_name": "Glacial Throne", "area_type": "boss_arena", "encounter_table_id": 404, "tileset_ref": "res://Sprites/Tilesets/ice_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 4, "level_offset": 4, "ability_ids": [4, 10, 22, 40], "ai_profile": "aggressive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [2], "min_level": 12},
			"reward_pool": {
				"equipment_ids": [1010, 1011, 1012],
				"drop_rates": {1010: 0.25, 1011: 0.15, 1012: 0.08},
				"first_clear_bonus": {"xp": 400, "currency": 350, "items": [{"item_id": 202, "count": 5}], "unlocks": ["bonus_4"]},
			},
		},

		# ── 5. Air Temple ────────────────────────────────────────────────
		{
			"temple_id": 5,
			"temple_name": "Skyreach Spire",
			"temple_type": "elemental",
			"dominant_element": "Air",
			"dominant_class": "",
			"secondary_elements": ["Electric", "Ice"],
			"difficulty_tier": 3,
			"region_areas": [
				{"area_name": "Windswept Path", "area_type": "corridor", "encounter_table_id": 501, "tileset_ref": "res://Sprites/Tilesets/air_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/strong_wind.ogg", "npc_data": []},
				{"area_name": "Cloud Chamber", "area_type": "chamber", "encounter_table_id": 502, "tileset_ref": "res://Sprites/Tilesets/air_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/high_altitude.ogg", "npc_data": []},
				{"area_name": "Gale Throne", "area_type": "boss_arena", "encounter_table_id": 503, "tileset_ref": "res://Sprites/Tilesets/air_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 5, "level_offset": 3, "ability_ids": [5, 11, 20, 38], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 8},
			"reward_pool": {
				"equipment_ids": [1013, 1014, 1015],
				"drop_rates": {1013: 0.3, 1014: 0.2, 1015: 0.1},
				"first_clear_bonus": {"xp": 300, "currency": 250, "items": [{"item_id": 202, "count": 3}], "unlocks": ["bonus_5"]},
			},
		},

		# ── 6. Earth Temple ──────────────────────────────────────────────
		{
			"temple_id": 6,
			"temple_name": "Stonehollow Depths",
			"temple_type": "elemental",
			"dominant_element": "Earth",
			"dominant_class": "",
			"secondary_elements": ["Metal", "Nature"],
			"difficulty_tier": 4,
			"region_areas": [
				{"area_name": "Quarry Tunnel", "area_type": "corridor", "encounter_table_id": 601, "tileset_ref": "res://Sprites/Tilesets/earth_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/cave_drip.ogg", "npc_data": []},
				{"area_name": "Cavern Rest", "area_type": "rest", "encounter_table_id": 0, "tileset_ref": "res://Sprites/Tilesets/earth_rest.tres", "ambient_audio_ref": "res://Audio/Sounds/cave_ambient.ogg", "npc_data": [{"npc_id": "cave_healer", "position": Vector2(540, 960), "dialog_id": "cave_heal"}]},
				{"area_name": "Seismic Chamber", "area_type": "chamber", "encounter_table_id": 602, "tileset_ref": "res://Sprites/Tilesets/earth_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/rumble.ogg", "npc_data": []},
				{"area_name": "Golem's Core", "area_type": "boss_arena", "encounter_table_id": 603, "tileset_ref": "res://Sprites/Tilesets/earth_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 6, "level_offset": 4, "ability_ids": [6, 14, 25, 42], "ai_profile": "defensive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [1], "min_level": 12},
			"reward_pool": {
				"equipment_ids": [1016, 1017, 1018],
				"drop_rates": {1016: 0.25, 1017: 0.15, 1018: 0.08},
				"first_clear_bonus": {"xp": 400, "currency": 350, "items": [{"item_id": 202, "count": 5}], "unlocks": ["bonus_6"]},
			},
		},

		# ── 7. Electric Temple ───────────────────────────────────────────
		{
			"temple_id": 7,
			"temple_name": "Thundervolt Tower",
			"temple_type": "elemental",
			"dominant_element": "Electric",
			"dominant_class": "",
			"secondary_elements": ["Metal", "Air"],
			"difficulty_tier": 5,
			"region_areas": [
				{"area_name": "Charged Hallway", "area_type": "corridor", "encounter_table_id": 701, "tileset_ref": "res://Sprites/Tilesets/electric_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/electric_hum.ogg", "npc_data": []},
				{"area_name": "Capacitor Chamber", "area_type": "chamber", "encounter_table_id": 702, "tileset_ref": "res://Sprites/Tilesets/electric_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/sparks.ogg", "npc_data": []},
				{"area_name": "Circuit Puzzle", "area_type": "puzzle", "encounter_table_id": 703, "tileset_ref": "res://Sprites/Tilesets/electric_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/electric_hum.ogg", "npc_data": []},
				{"area_name": "Dynamo Core", "area_type": "boss_arena", "encounter_table_id": 704, "tileset_ref": "res://Sprites/Tilesets/electric_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 7, "level_offset": 5, "ability_ids": [7, 16, 29, 45], "ai_profile": "aggressive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [5], "min_level": 18},
			"reward_pool": {
				"equipment_ids": [1019, 1020, 1021],
				"drop_rates": {1019: 0.25, 1020: 0.15, 1021: 0.08},
				"first_clear_bonus": {"xp": 500, "currency": 400, "items": [{"item_id": 203, "count": 3}], "unlocks": ["bonus_7"]},
			},
		},

		# ── 8. Dark Temple ───────────────────────────────────────────────
		{
			"temple_id": 8,
			"temple_name": "Shadowmaw Crypt",
			"temple_type": "elemental",
			"dominant_element": "Dark",
			"dominant_class": "",
			"secondary_elements": ["Poison", "Spirit"],
			"difficulty_tier": 6,
			"region_areas": [
				{"area_name": "Shadow Corridor", "area_type": "corridor", "encounter_table_id": 801, "tileset_ref": "res://Sprites/Tilesets/dark_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/dark_whisper.ogg", "npc_data": []},
				{"area_name": "Void Chamber", "area_type": "chamber", "encounter_table_id": 802, "tileset_ref": "res://Sprites/Tilesets/dark_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/eerie_drone.ogg", "npc_data": []},
				{"area_name": "Darkness Puzzle", "area_type": "puzzle", "encounter_table_id": 803, "tileset_ref": "res://Sprites/Tilesets/dark_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/heartbeat.ogg", "npc_data": []},
				{"area_name": "Umbral Sanctum", "area_type": "boss_arena", "encounter_table_id": 804, "tileset_ref": "res://Sprites/Tilesets/dark_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 8, "level_offset": 5, "ability_ids": [8, 17, 33, 50], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [10], "temple_ids": [], "min_level": 22},
			"reward_pool": {
				"equipment_ids": [1022, 1023, 1024],
				"drop_rates": {1022: 0.2, 1023: 0.12, 1024: 0.06},
				"first_clear_bonus": {"xp": 600, "currency": 500, "items": [{"item_id": 203, "count": 5}], "unlocks": ["bonus_8"]},
			},
		},

		# ── 9. Light Temple ──────────────────────────────────────────────
		{
			"temple_id": 9,
			"temple_name": "Radiant Cathedral",
			"temple_type": "elemental",
			"dominant_element": "Light",
			"dominant_class": "",
			"secondary_elements": ["Psychic", "Spirit"],
			"difficulty_tier": 5,
			"region_areas": [
				{"area_name": "Luminous Hall", "area_type": "corridor", "encounter_table_id": 901, "tileset_ref": "res://Sprites/Tilesets/light_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/choir_soft.ogg", "npc_data": []},
				{"area_name": "Prism Chamber", "area_type": "chamber", "encounter_table_id": 902, "tileset_ref": "res://Sprites/Tilesets/light_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/bells.ogg", "npc_data": []},
				{"area_name": "Reflection Puzzle", "area_type": "puzzle", "encounter_table_id": 903, "tileset_ref": "res://Sprites/Tilesets/light_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/light_hum.ogg", "npc_data": []},
				{"area_name": "Solar Altar", "area_type": "boss_arena", "encounter_table_id": 904, "tileset_ref": "res://Sprites/Tilesets/light_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 9, "level_offset": 5, "ability_ids": [9, 19, 31, 48], "ai_profile": "support"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [3], "min_level": 18},
			"reward_pool": {
				"equipment_ids": [1025, 1026, 1027],
				"drop_rates": {1025: 0.25, 1026: 0.15, 1027: 0.08},
				"first_clear_bonus": {"xp": 500, "currency": 400, "items": [{"item_id": 203, "count": 3}], "unlocks": ["bonus_9"]},
			},
		},

		# ── 10. Psychic Temple ───────────────────────────────────────────
		{
			"temple_id": 10,
			"temple_name": "Mindrift Sanctum",
			"temple_type": "elemental",
			"dominant_element": "Psychic",
			"dominant_class": "",
			"secondary_elements": ["Light", "Spirit"],
			"difficulty_tier": 6,
			"region_areas": [
				{"area_name": "Thought Corridor", "area_type": "corridor", "encounter_table_id": 1001, "tileset_ref": "res://Sprites/Tilesets/psychic_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/psychic_drone.ogg", "npc_data": []},
				{"area_name": "Illusion Chamber", "area_type": "chamber", "encounter_table_id": 1002, "tileset_ref": "res://Sprites/Tilesets/psychic_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/mind_whisper.ogg", "npc_data": []},
				{"area_name": "Mind Maze", "area_type": "puzzle", "encounter_table_id": 1003, "tileset_ref": "res://Sprites/Tilesets/psychic_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/psychic_pulse.ogg", "npc_data": []},
				{"area_name": "Dream Nexus", "area_type": "boss_arena", "encounter_table_id": 1004, "tileset_ref": "res://Sprites/Tilesets/psychic_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 10, "level_offset": 5, "ability_ids": [10, 21, 34, 52], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [9], "min_level": 22},
			"reward_pool": {
				"equipment_ids": [1028, 1029, 1030],
				"drop_rates": {1028: 0.2, 1029: 0.12, 1030: 0.06},
				"first_clear_bonus": {"xp": 600, "currency": 500, "items": [{"item_id": 203, "count": 5}], "unlocks": ["bonus_10"]},
			},
		},

		# ── 11. Spirit Temple ────────────────────────────────────────────
		{
			"temple_id": 11,
			"temple_name": "Ethereal Reliquary",
			"temple_type": "elemental",
			"dominant_element": "Spirit",
			"dominant_class": "",
			"secondary_elements": ["Dark", "Psychic"],
			"difficulty_tier": 7,
			"region_areas": [
				{"area_name": "Spectral Hall", "area_type": "corridor", "encounter_table_id": 1101, "tileset_ref": "res://Sprites/Tilesets/spirit_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/ghost_wind.ogg", "npc_data": []},
				{"area_name": "Shrine Rest", "area_type": "rest", "encounter_table_id": 0, "tileset_ref": "res://Sprites/Tilesets/spirit_rest.tres", "ambient_audio_ref": "res://Audio/Sounds/peaceful_spirits.ogg", "npc_data": [{"npc_id": "spirit_healer", "position": Vector2(540, 960), "dialog_id": "spirit_heal"}]},
				{"area_name": "Ectoplasm Chamber", "area_type": "chamber", "encounter_table_id": 1102, "tileset_ref": "res://Sprites/Tilesets/spirit_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/spirit_moan.ogg", "npc_data": []},
				{"area_name": "Phantom Throne", "area_type": "boss_arena", "encounter_table_id": 1103, "tileset_ref": "res://Sprites/Tilesets/spirit_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 11, "level_offset": 6, "ability_ids": [11, 23, 36, 55], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [8, 10], "min_level": 28},
			"reward_pool": {
				"equipment_ids": [1031, 1032, 1033],
				"drop_rates": {1031: 0.2, 1032: 0.1, 1033: 0.05},
				"first_clear_bonus": {"xp": 700, "currency": 600, "items": [{"item_id": 203, "count": 5}], "unlocks": ["bonus_11"]},
			},
		},

		# ── 12. Chaos Temple ─────────────────────────────────────────────
		{
			"temple_id": 12,
			"temple_name": "Maelstrom Pinnacle",
			"temple_type": "elemental",
			"dominant_element": "Chaos",
			"dominant_class": "",
			"secondary_elements": ["Fire", "Dark"],
			"difficulty_tier": 8,
			"region_areas": [
				{"area_name": "Entropy Corridor", "area_type": "corridor", "encounter_table_id": 1201, "tileset_ref": "res://Sprites/Tilesets/chaos_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/chaos_static.ogg", "npc_data": []},
				{"area_name": "Flux Chamber", "area_type": "chamber", "encounter_table_id": 1202, "tileset_ref": "res://Sprites/Tilesets/chaos_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/reality_warp.ogg", "npc_data": []},
				{"area_name": "Paradox Puzzle", "area_type": "puzzle", "encounter_table_id": 1203, "tileset_ref": "res://Sprites/Tilesets/chaos_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/distortion.ogg", "npc_data": []},
				{"area_name": "Rift Core", "area_type": "boss_arena", "encounter_table_id": 1204, "tileset_ref": "res://Sprites/Tilesets/chaos_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 12, "level_offset": 7, "ability_ids": [12, 24, 37, 58], "ai_profile": "berserker"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [11], "min_level": 35},
			"reward_pool": {
				"equipment_ids": [1034, 1035, 1036],
				"drop_rates": {1034: 0.18, 1035: 0.10, 1036: 0.04},
				"first_clear_bonus": {"xp": 900, "currency": 800, "items": [{"item_id": 203, "count": 8}], "unlocks": ["bonus_12"]},
			},
		},

		# ── 13. Metal Temple ─────────────────────────────────────────────
		{
			"temple_id": 13,
			"temple_name": "Ironforge Bastion",
			"temple_type": "elemental",
			"dominant_element": "Metal",
			"dominant_class": "",
			"secondary_elements": ["Earth", "Electric"],
			"difficulty_tier": 5,
			"region_areas": [
				{"area_name": "Smelting Corridor", "area_type": "corridor", "encounter_table_id": 1301, "tileset_ref": "res://Sprites/Tilesets/metal_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/metal_clank.ogg", "npc_data": []},
				{"area_name": "Foundry Chamber", "area_type": "chamber", "encounter_table_id": 1302, "tileset_ref": "res://Sprites/Tilesets/metal_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/forge_fire.ogg", "npc_data": []},
				{"area_name": "Gear Puzzle", "area_type": "puzzle", "encounter_table_id": 1303, "tileset_ref": "res://Sprites/Tilesets/metal_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/gears.ogg", "npc_data": []},
				{"area_name": "Anvil Sanctum", "area_type": "boss_arena", "encounter_table_id": 1304, "tileset_ref": "res://Sprites/Tilesets/metal_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 13, "level_offset": 5, "ability_ids": [13, 26, 39, 47], "ai_profile": "defensive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [6], "min_level": 18},
			"reward_pool": {
				"equipment_ids": [1037, 1038, 1039],
				"drop_rates": {1037: 0.25, 1038: 0.15, 1039: 0.08},
				"first_clear_bonus": {"xp": 500, "currency": 400, "items": [{"item_id": 203, "count": 3}], "unlocks": ["bonus_13"]},
			},
		},

		# ── 14. Poison Temple ────────────────────────────────────────────
		{
			"temple_id": 14,
			"temple_name": "Toxin Hollow",
			"temple_type": "elemental",
			"dominant_element": "Poison",
			"dominant_class": "",
			"secondary_elements": ["Nature", "Dark"],
			"difficulty_tier": 5,
			"region_areas": [
				{"area_name": "Miasma Tunnel", "area_type": "corridor", "encounter_table_id": 1401, "tileset_ref": "res://Sprites/Tilesets/poison_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/bubbling.ogg", "npc_data": []},
				{"area_name": "Venom Pool Chamber", "area_type": "chamber", "encounter_table_id": 1402, "tileset_ref": "res://Sprites/Tilesets/poison_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/acid_drip.ogg", "npc_data": []},
				{"area_name": "Corrosion Puzzle", "area_type": "puzzle", "encounter_table_id": 1403, "tileset_ref": "res://Sprites/Tilesets/poison_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/toxic_hiss.ogg", "npc_data": []},
				{"area_name": "Blight Sanctum", "area_type": "boss_arena", "encounter_table_id": 1404, "tileset_ref": "res://Sprites/Tilesets/poison_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 14, "level_offset": 5, "ability_ids": [14, 27, 41, 49], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [3], "min_level": 18},
			"reward_pool": {
				"equipment_ids": [1040, 1041, 1042],
				"drop_rates": {1040: 0.25, 1041: 0.15, 1042: 0.08},
				"first_clear_bonus": {"xp": 500, "currency": 400, "items": [{"item_id": 203, "count": 3}], "unlocks": ["bonus_14"]},
			},
		},

		# ══════════════════════════════════════════════════════════════════
		# CLASS-BASED TEMPLES (16) — 2 per class
		# ══════════════════════════════════════════════════════════════════

		# ── 15. Spearman Temple I: Lancer's Trial ────────────────────────
		{
			"temple_id": 15,
			"temple_name": "Lancer's Trial",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Spearman",
			"secondary_elements": ["Fire", "Poison"],
			"difficulty_tier": 3,
			"region_areas": [
				{"area_name": "Training Grounds", "area_type": "corridor", "encounter_table_id": 1501, "tileset_ref": "res://Sprites/Tilesets/spearman_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/spear_clash.ogg", "npc_data": []},
				{"area_name": "Sparring Hall", "area_type": "chamber", "encounter_table_id": 1502, "tileset_ref": "res://Sprites/Tilesets/spearman_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/combat_shouts.ogg", "npc_data": []},
				{"area_name": "Impaler's Arena", "area_type": "boss_arena", "encounter_table_id": 1503, "tileset_ref": "res://Sprites/Tilesets/spearman_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 18, "level_offset": 3, "ability_ids": [18, 32, 44, 56], "ai_profile": "aggressive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 8},
			"reward_pool": {
				"equipment_ids": [1043, 1044],
				"drop_rates": {1043: 0.3, 1044: 0.15},
				"first_clear_bonus": {"xp": 300, "currency": 200, "items": [], "unlocks": []},
			},
		},

		# ── 16. Spearman Temple II: Dragoon Citadel ──────────────────────
		{
			"temple_id": 16,
			"temple_name": "Dragoon Citadel",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Spearman",
			"secondary_elements": ["Dark", "Fire"],
			"difficulty_tier": 7,
			"region_areas": [
				{"area_name": "Rampart Walk", "area_type": "corridor", "encounter_table_id": 1601, "tileset_ref": "res://Sprites/Tilesets/spearman2_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/war_drums.ogg", "npc_data": []},
				{"area_name": "War Room", "area_type": "chamber", "encounter_table_id": 1602, "tileset_ref": "res://Sprites/Tilesets/spearman2_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/armor_march.ogg", "npc_data": []},
				{"area_name": "Armory Rest", "area_type": "rest", "encounter_table_id": 0, "tileset_ref": "res://Sprites/Tilesets/spearman2_rest.tres", "ambient_audio_ref": "res://Audio/Sounds/peaceful.ogg", "npc_data": []},
				{"area_name": "Dragoon's Peak", "area_type": "boss_arena", "encounter_table_id": 1603, "tileset_ref": "res://Sprites/Tilesets/spearman2_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 19, "level_offset": 6, "ability_ids": [19, 38, 51, 60], "ai_profile": "aggressive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [15], "min_level": 28},
			"reward_pool": {
				"equipment_ids": [1045, 1046, 1047],
				"drop_rates": {1045: 0.2, 1046: 0.12, 1047: 0.05},
				"first_clear_bonus": {"xp": 700, "currency": 550, "items": [{"item_id": 203, "count": 3}], "unlocks": []},
			},
		},

		# ── 17. Archer Temple I: Marksman's Range ────────────────────────
		{
			"temple_id": 17,
			"temple_name": "Marksman's Range",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Archer",
			"secondary_elements": ["Air", "Water"],
			"difficulty_tier": 3,
			"region_areas": [
				{"area_name": "Target Corridor", "area_type": "corridor", "encounter_table_id": 1701, "tileset_ref": "res://Sprites/Tilesets/archer_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/arrow_whistle.ogg", "npc_data": []},
				{"area_name": "Shooting Gallery", "area_type": "chamber", "encounter_table_id": 1702, "tileset_ref": "res://Sprites/Tilesets/archer_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/bowstring.ogg", "npc_data": []},
				{"area_name": "Sniper's Perch", "area_type": "boss_arena", "encounter_table_id": 1703, "tileset_ref": "res://Sprites/Tilesets/archer_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 5, "level_offset": 3, "ability_ids": [5, 20, 38, 46], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 8},
			"reward_pool": {
				"equipment_ids": [1048, 1049],
				"drop_rates": {1048: 0.3, 1049: 0.15},
				"first_clear_bonus": {"xp": 300, "currency": 200, "items": [], "unlocks": []},
			},
		},

		# ── 18. Archer Temple II: Eagle's Aerie ──────────────────────────
		{
			"temple_id": 18,
			"temple_name": "Eagle's Aerie",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Archer",
			"secondary_elements": ["Air", "Electric"],
			"difficulty_tier": 7,
			"region_areas": [
				{"area_name": "Cliffside Path", "area_type": "corridor", "encounter_table_id": 1801, "tileset_ref": "res://Sprites/Tilesets/archer2_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/mountain_wind.ogg", "npc_data": []},
				{"area_name": "Crosswind Chamber", "area_type": "chamber", "encounter_table_id": 1802, "tileset_ref": "res://Sprites/Tilesets/archer2_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/eagle_cry.ogg", "npc_data": []},
				{"area_name": "Accuracy Puzzle", "area_type": "puzzle", "encounter_table_id": 1803, "tileset_ref": "res://Sprites/Tilesets/archer2_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/wind_howl.ogg", "npc_data": []},
				{"area_name": "Sky Throne", "area_type": "boss_arena", "encounter_table_id": 1804, "tileset_ref": "res://Sprites/Tilesets/archer2_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 16, "level_offset": 6, "ability_ids": [16, 30, 43, 57], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [17], "min_level": 28},
			"reward_pool": {
				"equipment_ids": [1050, 1051, 1052],
				"drop_rates": {1050: 0.2, 1051: 0.12, 1052: 0.05},
				"first_clear_bonus": {"xp": 700, "currency": 550, "items": [{"item_id": 203, "count": 3}], "unlocks": []},
			},
		},

		# ── 19. Wizard Temple I: Arcane Academy ──────────────────────────
		{
			"temple_id": 19,
			"temple_name": "Arcane Academy",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Wizard",
			"secondary_elements": ["Electric", "Psychic"],
			"difficulty_tier": 4,
			"region_areas": [
				{"area_name": "Library Wing", "area_type": "corridor", "encounter_table_id": 1901, "tileset_ref": "res://Sprites/Tilesets/wizard_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/page_turn.ogg", "npc_data": []},
				{"area_name": "Spell Lab", "area_type": "chamber", "encounter_table_id": 1902, "tileset_ref": "res://Sprites/Tilesets/wizard_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/magic_hum.ogg", "npc_data": []},
				{"area_name": "Rune Puzzle", "area_type": "puzzle", "encounter_table_id": 1903, "tileset_ref": "res://Sprites/Tilesets/wizard_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/arcane_pulse.ogg", "npc_data": []},
				{"area_name": "Archmage's Study", "area_type": "boss_arena", "encounter_table_id": 1904, "tileset_ref": "res://Sprites/Tilesets/wizard_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 7, "level_offset": 4, "ability_ids": [7, 16, 29, 45], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 12},
			"reward_pool": {
				"equipment_ids": [1053, 1054, 1055],
				"drop_rates": {1053: 0.25, 1054: 0.15, 1055: 0.08},
				"first_clear_bonus": {"xp": 400, "currency": 300, "items": [{"item_id": 202, "count": 3}], "unlocks": []},
			},
		},

		# ── 20. Wizard Temple II: Sorcerer's Sanctum ─────────────────────
		{
			"temple_id": 20,
			"temple_name": "Sorcerer's Sanctum",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Wizard",
			"secondary_elements": ["Spirit", "Chaos"],
			"difficulty_tier": 8,
			"region_areas": [
				{"area_name": "Enchanted Hallway", "area_type": "corridor", "encounter_table_id": 2001, "tileset_ref": "res://Sprites/Tilesets/wizard2_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/deep_magic.ogg", "npc_data": []},
				{"area_name": "Summoning Circle", "area_type": "chamber", "encounter_table_id": 2002, "tileset_ref": "res://Sprites/Tilesets/wizard2_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/chanting.ogg", "npc_data": []},
				{"area_name": "Mage's Rest", "area_type": "rest", "encounter_table_id": 0, "tileset_ref": "res://Sprites/Tilesets/wizard2_rest.tres", "ambient_audio_ref": "res://Audio/Sounds/peaceful.ogg", "npc_data": []},
				{"area_name": "Grand Sorcerer's Sanctum", "area_type": "boss_arena", "encounter_table_id": 2003, "tileset_ref": "res://Sprites/Tilesets/wizard2_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 11, "level_offset": 7, "ability_ids": [11, 23, 36, 55], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [19], "min_level": 35},
			"reward_pool": {
				"equipment_ids": [1056, 1057, 1058],
				"drop_rates": {1056: 0.18, 1057: 0.10, 1058: 0.04},
				"first_clear_bonus": {"xp": 900, "currency": 700, "items": [{"item_id": 203, "count": 5}], "unlocks": []},
			},
		},

		# ── 21. Knight Temple I: Shield Wall Keep ────────────────────────
		{
			"temple_id": 21,
			"temple_name": "Shield Wall Keep",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Knight",
			"secondary_elements": ["Earth", "Metal"],
			"difficulty_tier": 4,
			"region_areas": [
				{"area_name": "Battlement Walk", "area_type": "corridor", "encounter_table_id": 2101, "tileset_ref": "res://Sprites/Tilesets/knight_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/armor_march.ogg", "npc_data": []},
				{"area_name": "Great Hall", "area_type": "chamber", "encounter_table_id": 2102, "tileset_ref": "res://Sprites/Tilesets/knight_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/sword_clash.ogg", "npc_data": []},
				{"area_name": "Warden's Throne", "area_type": "boss_arena", "encounter_table_id": 2103, "tileset_ref": "res://Sprites/Tilesets/knight_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 6, "level_offset": 4, "ability_ids": [6, 14, 25, 42], "ai_profile": "defensive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 12},
			"reward_pool": {
				"equipment_ids": [1059, 1060],
				"drop_rates": {1059: 0.25, 1060: 0.15},
				"first_clear_bonus": {"xp": 400, "currency": 300, "items": [{"item_id": 202, "count": 3}], "unlocks": []},
			},
		},

		# ── 22. Knight Temple II: Paladin's Fortress ─────────────────────
		{
			"temple_id": 22,
			"temple_name": "Paladin's Fortress",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Knight",
			"secondary_elements": ["Light", "Metal"],
			"difficulty_tier": 8,
			"region_areas": [
				{"area_name": "Garrison Hall", "area_type": "corridor", "encounter_table_id": 2201, "tileset_ref": "res://Sprites/Tilesets/knight2_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/trumpet_fanfare.ogg", "npc_data": []},
				{"area_name": "Valor Chamber", "area_type": "chamber", "encounter_table_id": 2202, "tileset_ref": "res://Sprites/Tilesets/knight2_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/heavy_armor.ogg", "npc_data": []},
				{"area_name": "Chapel Rest", "area_type": "rest", "encounter_table_id": 0, "tileset_ref": "res://Sprites/Tilesets/knight2_rest.tres", "ambient_audio_ref": "res://Audio/Sounds/choir_soft.ogg", "npc_data": []},
				{"area_name": "Grand Paladin's Sanctum", "area_type": "boss_arena", "encounter_table_id": 2203, "tileset_ref": "res://Sprites/Tilesets/knight2_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 13, "level_offset": 7, "ability_ids": [13, 26, 39, 47], "ai_profile": "defensive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [21], "min_level": 35},
			"reward_pool": {
				"equipment_ids": [1061, 1062, 1063],
				"drop_rates": {1061: 0.18, 1062: 0.10, 1063: 0.04},
				"first_clear_bonus": {"xp": 900, "currency": 700, "items": [{"item_id": 203, "count": 5}], "unlocks": []},
			},
		},

		# ── 23. Healer/Cleric Temple I: Sanctuary of Light ──────────────
		{
			"temple_id": 23,
			"temple_name": "Sanctuary of Light",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Cleric",
			"secondary_elements": ["Light", "Nature"],
			"difficulty_tier": 4,
			"region_areas": [
				{"area_name": "Healing Ward", "area_type": "corridor", "encounter_table_id": 2301, "tileset_ref": "res://Sprites/Tilesets/cleric_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/gentle_bells.ogg", "npc_data": []},
				{"area_name": "Prayer Hall", "area_type": "chamber", "encounter_table_id": 2302, "tileset_ref": "res://Sprites/Tilesets/cleric_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/hymn.ogg", "npc_data": []},
				{"area_name": "High Priest's Altar", "area_type": "boss_arena", "encounter_table_id": 2303, "tileset_ref": "res://Sprites/Tilesets/cleric_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 9, "level_offset": 4, "ability_ids": [9, 19, 31, 48], "ai_profile": "support"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 12},
			"reward_pool": {
				"equipment_ids": [1064, 1065],
				"drop_rates": {1064: 0.25, 1065: 0.15},
				"first_clear_bonus": {"xp": 400, "currency": 300, "items": [{"item_id": 102, "count": 10}], "unlocks": []},
			},
		},

		# ── 24. Healer/Cleric Temple II: Crystal Hospice ─────────────────
		{
			"temple_id": 24,
			"temple_name": "Crystal Hospice",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Cleric",
			"secondary_elements": ["Ice", "Psychic"],
			"difficulty_tier": 7,
			"region_areas": [
				{"area_name": "Recovery Wing", "area_type": "corridor", "encounter_table_id": 2401, "tileset_ref": "res://Sprites/Tilesets/cleric2_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/crystal_chime.ogg", "npc_data": []},
				{"area_name": "Meditation Chamber", "area_type": "chamber", "encounter_table_id": 2402, "tileset_ref": "res://Sprites/Tilesets/cleric2_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/flowing_water.ogg", "npc_data": []},
				{"area_name": "Restoration Puzzle", "area_type": "puzzle", "encounter_table_id": 2403, "tileset_ref": "res://Sprites/Tilesets/cleric2_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/healing_tone.ogg", "npc_data": []},
				{"area_name": "Grand Healer's Sanctum", "area_type": "boss_arena", "encounter_table_id": 2404, "tileset_ref": "res://Sprites/Tilesets/cleric2_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 20, "level_offset": 6, "ability_ids": [20, 34, 48, 59], "ai_profile": "support"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [23], "min_level": 28},
			"reward_pool": {
				"equipment_ids": [1066, 1067, 1068],
				"drop_rates": {1066: 0.2, 1067: 0.12, 1068: 0.05},
				"first_clear_bonus": {"xp": 700, "currency": 550, "items": [{"item_id": 103, "count": 10}], "unlocks": []},
			},
		},

		# ── 25. Assassin Temple I: Shadow Dojo ───────────────────────────
		{
			"temple_id": 25,
			"temple_name": "Shadow Dojo",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Assassin",
			"secondary_elements": ["Dark", "Ice"],
			"difficulty_tier": 4,
			"region_areas": [
				{"area_name": "Silent Corridor", "area_type": "corridor", "encounter_table_id": 2501, "tileset_ref": "res://Sprites/Tilesets/assassin_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/silence.ogg", "npc_data": []},
				{"area_name": "Trap Chamber", "area_type": "chamber", "encounter_table_id": 2502, "tileset_ref": "res://Sprites/Tilesets/assassin_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/blade_draw.ogg", "npc_data": []},
				{"area_name": "Shadowmaster's Ring", "area_type": "boss_arena", "encounter_table_id": 2503, "tileset_ref": "res://Sprites/Tilesets/assassin_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 4, "level_offset": 4, "ability_ids": [4, 10, 22, 40], "ai_profile": "aggressive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 12},
			"reward_pool": {
				"equipment_ids": [1069, 1070],
				"drop_rates": {1069: 0.25, 1070: 0.15},
				"first_clear_bonus": {"xp": 400, "currency": 300, "items": [], "unlocks": []},
			},
		},

		# ── 26. Assassin Temple II: Nightblade Fortress ──────────────────
		{
			"temple_id": 26,
			"temple_name": "Nightblade Fortress",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Assassin",
			"secondary_elements": ["Dark", "Poison"],
			"difficulty_tier": 8,
			"region_areas": [
				{"area_name": "Shadow Passage", "area_type": "corridor", "encounter_table_id": 2601, "tileset_ref": "res://Sprites/Tilesets/assassin2_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/footsteps_soft.ogg", "npc_data": []},
				{"area_name": "Venom Chamber", "area_type": "chamber", "encounter_table_id": 2602, "tileset_ref": "res://Sprites/Tilesets/assassin2_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/drip_echo.ogg", "npc_data": []},
				{"area_name": "Stealth Puzzle", "area_type": "puzzle", "encounter_table_id": 2603, "tileset_ref": "res://Sprites/Tilesets/assassin2_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/shadows.ogg", "npc_data": []},
				{"area_name": "Nightblade's Sanctum", "area_type": "boss_arena", "encounter_table_id": 2604, "tileset_ref": "res://Sprites/Tilesets/assassin2_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 8, "level_offset": 7, "ability_ids": [8, 17, 33, 50], "ai_profile": "aggressive"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [25], "min_level": 35},
			"reward_pool": {
				"equipment_ids": [1071, 1072, 1073],
				"drop_rates": {1071: 0.18, 1072: 0.10, 1073: 0.04},
				"first_clear_bonus": {"xp": 900, "currency": 700, "items": [{"item_id": 203, "count": 5}], "unlocks": []},
			},
		},

		# ── 27. Berserker Temple I: Rage Pit ─────────────────────────────
		{
			"temple_id": 27,
			"temple_name": "Rage Pit",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Berserker",
			"secondary_elements": ["Fire", "Chaos"],
			"difficulty_tier": 5,
			"region_areas": [
				{"area_name": "Bloodstone Corridor", "area_type": "corridor", "encounter_table_id": 2701, "tileset_ref": "res://Sprites/Tilesets/berserker_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/war_cries.ogg", "npc_data": []},
				{"area_name": "Brawl Chamber", "area_type": "chamber", "encounter_table_id": 2702, "tileset_ref": "res://Sprites/Tilesets/berserker_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/impact.ogg", "npc_data": []},
				{"area_name": "Warchief's Arena", "area_type": "boss_arena", "encounter_table_id": 2703, "tileset_ref": "res://Sprites/Tilesets/berserker_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 1, "level_offset": 5, "ability_ids": [1, 12, 28, 44], "ai_profile": "berserker"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 15},
			"reward_pool": {
				"equipment_ids": [1074, 1075],
				"drop_rates": {1074: 0.25, 1075: 0.15},
				"first_clear_bonus": {"xp": 500, "currency": 400, "items": [], "unlocks": []},
			},
		},

		# ── 28. Berserker Temple II: Warlord's Domain ────────────────────
		{
			"temple_id": 28,
			"temple_name": "Warlord's Domain",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Berserker",
			"secondary_elements": ["Chaos", "Metal"],
			"difficulty_tier": 9,
			"region_areas": [
				{"area_name": "Destruction Path", "area_type": "corridor", "encounter_table_id": 2801, "tileset_ref": "res://Sprites/Tilesets/berserker2_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/destruction.ogg", "npc_data": []},
				{"area_name": "Carnage Chamber", "area_type": "chamber", "encounter_table_id": 2802, "tileset_ref": "res://Sprites/Tilesets/berserker2_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/heavy_breathing.ogg", "npc_data": []},
				{"area_name": "Pit Rest", "area_type": "rest", "encounter_table_id": 0, "tileset_ref": "res://Sprites/Tilesets/berserker2_rest.tres", "ambient_audio_ref": "res://Audio/Sounds/bonfire.ogg", "npc_data": []},
				{"area_name": "Warlord's Throne", "area_type": "boss_arena", "encounter_table_id": 2803, "tileset_ref": "res://Sprites/Tilesets/berserker2_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 12, "level_offset": 8, "ability_ids": [12, 24, 37, 58], "ai_profile": "berserker"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [27, 12], "min_level": 42},
			"reward_pool": {
				"equipment_ids": [1076, 1077, 1078],
				"drop_rates": {1076: 0.15, 1077: 0.08, 1078: 0.03},
				"first_clear_bonus": {"xp": 1100, "currency": 900, "items": [{"item_id": 203, "count": 8}], "unlocks": []},
			},
		},

		# ── 29. Summoner Temple I: Spirit Grove ──────────────────────────
		{
			"temple_id": 29,
			"temple_name": "Spirit Grove",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Summoner",
			"secondary_elements": ["Spirit", "Nature"],
			"difficulty_tier": 5,
			"region_areas": [
				{"area_name": "Whispering Path", "area_type": "corridor", "encounter_table_id": 2901, "tileset_ref": "res://Sprites/Tilesets/summoner_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/spirit_whisper.ogg", "npc_data": []},
				{"area_name": "Conjuring Circle", "area_type": "chamber", "encounter_table_id": 2902, "tileset_ref": "res://Sprites/Tilesets/summoner_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/conjure.ogg", "npc_data": []},
				{"area_name": "Binding Puzzle", "area_type": "puzzle", "encounter_table_id": 2903, "tileset_ref": "res://Sprites/Tilesets/summoner_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/arcane_hum.ogg", "npc_data": []},
				{"area_name": "Grand Summoner's Circle", "area_type": "boss_arena", "encounter_table_id": 2904, "tileset_ref": "res://Sprites/Tilesets/summoner_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 10, "level_offset": 5, "ability_ids": [10, 21, 34, 52], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [], "min_level": 15},
			"reward_pool": {
				"equipment_ids": [1079, 1080, 1081],
				"drop_rates": {1079: 0.25, 1080: 0.15, 1081: 0.08},
				"first_clear_bonus": {"xp": 500, "currency": 400, "items": [{"item_id": 203, "count": 2}], "unlocks": []},
			},
		},

		# ── 30. Summoner Temple II: Eclipsar's Throne ────────────────────
		{
			"temple_id": 30,
			"temple_name": "Eclipsar's Throne",
			"temple_type": "class_based",
			"dominant_element": "",
			"dominant_class": "Summoner",
			"secondary_elements": ["Dark", "Spirit"],
			"difficulty_tier": 10,
			"region_areas": [
				{"area_name": "Twilight Approach", "area_type": "corridor", "encounter_table_id": 3001, "tileset_ref": "res://Sprites/Tilesets/summoner2_corridor.tres", "ambient_audio_ref": "res://Audio/Sounds/void_echo.ogg", "npc_data": []},
				{"area_name": "Eclipse Chamber", "area_type": "chamber", "encounter_table_id": 3002, "tileset_ref": "res://Sprites/Tilesets/summoner2_chamber.tres", "ambient_audio_ref": "res://Audio/Sounds/reality_tear.ogg", "npc_data": []},
				{"area_name": "Dimensional Puzzle", "area_type": "puzzle", "encounter_table_id": 3003, "tileset_ref": "res://Sprites/Tilesets/summoner2_puzzle.tres", "ambient_audio_ref": "res://Audio/Sounds/dimensional_rift.ogg", "npc_data": []},
				{"area_name": "Sanctum Rest", "area_type": "rest", "encounter_table_id": 0, "tileset_ref": "res://Sprites/Tilesets/summoner2_rest.tres", "ambient_audio_ref": "res://Audio/Sounds/calm_void.ogg", "npc_data": [{"npc_id": "ancient_spirit", "position": Vector2(540, 960), "dialog_id": "final_warning"}]},
				{"area_name": "Eclipsar's Throne Room", "area_type": "boss_arena", "encounter_table_id": 3004, "tileset_ref": "res://Sprites/Tilesets/summoner2_boss.tres", "ambient_audio_ref": "res://Audio/Sounds/boss_ambient.ogg", "npc_data": []},
			],
			"boss_data": {"sprite_race_id": 24, "level_offset": 10, "ability_ids": [24, 36, 55, 60], "ai_profile": "tactical"},
			"unlock_prerequisites": {"quest_ids": [], "temple_ids": [29, 11, 12], "min_level": 50},
			"reward_pool": {
				"equipment_ids": [1082, 1083, 1084],
				"drop_rates": {1082: 0.15, 1083: 0.08, 1084: 0.03},
				"first_clear_bonus": {"xp": 1500, "currency": 1200, "items": [{"item_id": 203, "count": 10}], "unlocks": ["legendary_bonus"]},
			},
		},
	]


## ── Helpers ─────────────────────────────────────────────────────────────────

## Find a specific temple by ID.
static func get_temple(temple_id: int) -> Dictionary:
	for temple: Dictionary in get_all_temples():
		if int(temple.get("temple_id", 0)) == temple_id:
			return temple
	return {}


## Get all temples of a given type ("elemental" or "class_based").
static func get_temples_by_type(temple_type: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for temple: Dictionary in get_all_temples():
		if temple.get("temple_type", "") == temple_type:
			result.append(temple)
	return result


## Get all temples for a given dominant element.
static func get_temples_by_element(element: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for temple: Dictionary in get_all_temples():
		if temple.get("dominant_element", "") == element:
			result.append(temple)
	return result


## Get all temples for a given dominant class.
static func get_temples_by_class(class_type: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for temple: Dictionary in get_all_temples():
		if temple.get("dominant_class", "") == class_type:
			result.append(temple)
	return result


## Get temples within a difficulty range.
static func get_temples_by_difficulty(min_tier: int, max_tier: int) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for temple: Dictionary in get_all_temples():
		var tier: int = int(temple.get("difficulty_tier", 0))
		if tier >= min_tier and tier <= max_tier:
			result.append(temple)
	return result


## Get the total number of temples.
static func get_temple_count() -> int:
	return get_all_temples().size()

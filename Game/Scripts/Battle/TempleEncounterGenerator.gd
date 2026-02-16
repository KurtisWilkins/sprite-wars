## TempleEncounterGenerator — Generates enemy encounters for temple areas.
## Selects Sprites matching the temple's element/class theme, scales their
## levels based on the player's average level and temple difficulty, and
## produces complete encounter data including backgrounds and music.
class_name TempleEncounterGenerator
extends RefCounted

## ── Constants ────────────────────────────────────────────────────────────────

## Base number of enemies per encounter, scaled by area position within temple.
const BASE_ENEMY_COUNT: int = 3
const MAX_ENEMY_COUNT: int = 6

## Level scaling offset per difficulty tier (applied on top of player average).
const LEVEL_PER_DIFFICULTY_TIER: float = 1.5

## Level variance range: enemies are +/- this many levels from the computed base.
const LEVEL_VARIANCE: int = 2

## Boss level bonus added on top of the standard scaling.
const BOSS_EXTRA_LEVEL_OFFSET: int = 3

## Probability that an encounter pulls from the secondary element pool.
const SECONDARY_ELEMENT_CHANCE: float = 0.25

## Encounter background path template.
const BG_PATH_TEMPLATE: String = "res://Sprites/Battle Backgrounds/%s_bg.png"

## Music path template for temple encounters.
const MUSIC_PATH_TEMPLATE: String = "res://Audio/Music/temple_%s.wav"

## Evolution stage weights for encounter generation.
## Lower difficulty temples use more stage-1 Sprites; higher use stage 2-3.
const STAGE_WEIGHTS_BY_DIFFICULTY: Dictionary = {
	1: [0.9, 0.1, 0.0],
	2: [0.8, 0.2, 0.0],
	3: [0.6, 0.35, 0.05],
	4: [0.5, 0.4, 0.1],
	5: [0.3, 0.5, 0.2],
	6: [0.2, 0.5, 0.3],
	7: [0.1, 0.5, 0.4],
	8: [0.05, 0.4, 0.55],
	9: [0.0, 0.3, 0.7],
	10: [0.0, 0.2, 0.8],
}


## ── Public API ──────────────────────────────────────────────────────────────

## Generate a standard encounter for a temple area.
## Returns: {enemy_team: Array[Dictionary], background: String, music: String}
## Each enemy dict: {race_id, form_id, level, stats, ability_ids, ai_profile}
static func generate_encounter(
	temple_data: Dictionary,
	area_index: int,
	player_avg_level: float,
) -> Dictionary:
	var difficulty: int = int(temple_data.get("difficulty_tier", 1))
	var total_areas: int = (temple_data.get("region_areas", []) as Array).size()

	# Scale enemy count by area position (deeper areas have more enemies).
	var area_ratio: float = float(area_index + 1) / float(maxi(total_areas, 1))
	var enemy_count: int = clampi(
		BASE_ENEMY_COUNT + int(area_ratio * 2.0),
		BASE_ENEMY_COUNT,
		MAX_ENEMY_COUNT
	)

	# Determine the base enemy level.
	var base_level: int = _calculate_base_level(player_avg_level, difficulty, area_index)

	# Select themed Sprites.
	var element: String = str(temple_data.get("dominant_element", ""))
	var class_type: String = str(temple_data.get("dominant_class", ""))
	var secondary_elements: Array = temple_data.get("secondary_elements", [])
	var race_ids: Array = _select_sprites_for_theme(element, class_type, enemy_count, secondary_elements)

	# Build enemy team.
	var enemy_team: Array[Dictionary] = []
	for race_id in race_ids:
		var level: int = clampi(
			base_level + randi_range(-LEVEL_VARIANCE, LEVEL_VARIANCE),
			1,
			SpriteInstance.MAX_LEVEL
		)
		var enemy: Dictionary = _build_enemy(int(race_id), level, difficulty)
		enemy_team.append(enemy)

	# Determine background and music.
	var theme_key: String = element.to_lower() if not element.is_empty() else class_type.to_lower()
	var background: String = BG_PATH_TEMPLATE % theme_key
	var music: String = MUSIC_PATH_TEMPLATE % theme_key

	return {
		"enemy_team": enemy_team,
		"background": background,
		"music": music,
	}


## Generate a boss encounter for the temple.
## Boss uses the temple_data.boss_data configuration with enhanced stats.
## Returns: {enemy_team: Array[Dictionary], background: String, music: String}
static func generate_boss_encounter(
	temple_data: Dictionary,
	player_avg_level: float,
) -> Dictionary:
	var difficulty: int = int(temple_data.get("difficulty_tier", 1))
	var boss_data: Dictionary = temple_data.get("boss_data", {})

	var boss_race_id: int = int(boss_data.get("sprite_race_id", 1))
	var level_offset: int = int(boss_data.get("level_offset", 0))
	var boss_abilities: Array = boss_data.get("ability_ids", [])
	var ai_profile: String = str(boss_data.get("ai_profile", "tactical"))

	# Calculate boss level.
	var base_level: int = _calculate_base_level(player_avg_level, difficulty, 999)
	var boss_level: int = clampi(
		base_level + level_offset + BOSS_EXTRA_LEVEL_OFFSET,
		1,
		SpriteInstance.MAX_LEVEL
	)

	# Build the boss unit.
	var race_data: Dictionary = SpriteRaces.get_race(boss_race_id)
	var stage: int = 3  # Bosses are always final evolution.
	var form_id: int = _get_form_id(boss_race_id, stage)
	var base_stats: Dictionary = _get_stats_at_level(race_data, boss_level)
	var scaled_stats: Dictionary = _scale_enemy_stats(base_stats, boss_level)

	# Boss gets a 20% stat boost on top of scaling.
	for stat_key: String in scaled_stats:
		scaled_stats[stat_key] = int(float(scaled_stats[stat_key]) * 1.2)

	var boss_unit: Dictionary = {
		"race_id": boss_race_id,
		"form_id": form_id,
		"level": boss_level,
		"stats": scaled_stats,
		"ability_ids": boss_abilities,
		"ai_profile": ai_profile,
		"is_boss": true,
	}

	# Boss may have 1-2 minions.
	var enemy_team: Array[Dictionary] = [boss_unit]
	var element: String = str(temple_data.get("dominant_element", ""))
	var class_type: String = str(temple_data.get("dominant_class", ""))
	var minion_count: int = clampi(difficulty / 4, 0, 2)

	if minion_count > 0:
		var minion_race_ids: Array = _select_sprites_for_theme(element, class_type, minion_count, [])
		for rid in minion_race_ids:
			var minion_level: int = clampi(boss_level - 3, 1, SpriteInstance.MAX_LEVEL)
			var minion: Dictionary = _build_enemy(int(rid), minion_level, difficulty)
			enemy_team.append(minion)

	var theme_key: String = element.to_lower() if not element.is_empty() else class_type.to_lower()

	return {
		"enemy_team": enemy_team,
		"background": BG_PATH_TEMPLATE % theme_key,
		"music": "res://Audio/Music/temple_boss.wav",
	}


## ── Sprite Selection ────────────────────────────────────────────────────────

## Select Sprite race IDs matching the temple's element or class theme.
## Pulls primarily from the dominant theme with a chance for secondary elements.
static func _select_sprites_for_theme(
	element: String,
	class_type: String,
	count: int,
	secondary_elements: Array = [],
) -> Array:
	var candidates: Array[int] = []

	# Gather primary candidates.
	if not element.is_empty():
		candidates.append_array(SpriteRaces.get_races_by_element(element))
	if not class_type.is_empty():
		candidates.append_array(SpriteRaces.get_races_by_class(class_type))

	# Deduplicate.
	var unique_candidates: Array[int] = []
	for rid in candidates:
		if rid not in unique_candidates:
			unique_candidates.append(rid)

	# Gather secondary candidates.
	var secondary_candidates: Array[int] = []
	for sec_element: String in secondary_elements:
		var sec_races: Array[int] = SpriteRaces.get_races_by_element(sec_element)
		for rid in sec_races:
			if rid not in secondary_candidates and rid not in unique_candidates:
				secondary_candidates.append(rid)

	# If we have no candidates at all, fall back to all races.
	if unique_candidates.is_empty() and secondary_candidates.is_empty():
		var all_races: Dictionary = SpriteRaces.get_all_races()
		for rid: int in all_races:
			unique_candidates.append(rid)

	# Select the requested number of Sprites.
	var selected: Array = []
	for _i in count:
		# Chance to pull from secondary pool.
		if not secondary_candidates.is_empty() and randf() < SECONDARY_ELEMENT_CHANCE:
			selected.append(secondary_candidates[randi() % secondary_candidates.size()])
		elif not unique_candidates.is_empty():
			selected.append(unique_candidates[randi() % unique_candidates.size()])

	return selected


## ── Enemy Building ──────────────────────────────────────────────────────────

## Build a complete enemy dictionary for a given race and level.
static func _build_enemy(race_id: int, level: int, difficulty: int) -> Dictionary:
	var race_data: Dictionary = SpriteRaces.get_race(race_id)
	var stage: int = _pick_evolution_stage(difficulty)
	var form_id: int = _get_form_id(race_id, stage)
	var base_stats: Dictionary = _get_stats_at_level(race_data, level)
	var scaled_stats: Dictionary = _scale_enemy_stats(base_stats, level)

	return {
		"race_id": race_id,
		"form_id": form_id,
		"level": level,
		"stats": scaled_stats,
		"ability_ids": [],  # Populated by the battle system from race/stage data.
		"ai_profile": "balanced",
		"is_boss": false,
	}


## Scale enemy stats based on level with a slight difficulty multiplier.
static func _scale_enemy_stats(base_stats: Dictionary, level: int) -> Dictionary:
	# Apply a mild level-based multiplier to make enemies slightly tougher.
	var level_mult: float = 1.0 + float(level) * 0.005
	var result: Dictionary = {}
	for key: String in SpriteInstance.STAT_KEYS:
		var base_val: int = int(base_stats.get(key, 10))
		result[key] = maxi(1, int(float(base_val) * level_mult))
	return result


## ── Private Helpers ─────────────────────────────────────────────────────────

## Calculate the base enemy level from player level, difficulty, and area depth.
static func _calculate_base_level(
	player_avg_level: float,
	difficulty: int,
	area_index: int,
) -> int:
	var difficulty_bonus: float = float(difficulty) * LEVEL_PER_DIFFICULTY_TIER
	var area_bonus: float = float(mini(area_index, 5)) * 0.5
	return clampi(
		int(player_avg_level + difficulty_bonus + area_bonus),
		1,
		SpriteInstance.MAX_LEVEL
	)


## Pick an evolution stage (1-3) based on difficulty tier weights.
static func _pick_evolution_stage(difficulty: int) -> int:
	var clamped_diff: int = clampi(difficulty, 1, 10)
	var weights: Array = STAGE_WEIGHTS_BY_DIFFICULTY.get(clamped_diff, [0.5, 0.4, 0.1])
	var roll: float = randf()
	var cumulative: float = 0.0
	for i in weights.size():
		cumulative += float(weights[i])
		if roll <= cumulative:
			return i + 1  # Stages are 1-indexed.
	return 1


## Get the form_id for a race at a given evolution stage.
## Convention: form_id = race_id * 3 - (3 - stage)
static func _get_form_id(race_id: int, stage: int) -> int:
	return race_id * 3 - (3 - stage)


## Calculate raw stats at a given level from race data dictionary.
static func _get_stats_at_level(race_data: Dictionary, level: int) -> Dictionary:
	var base_stats: Dictionary = race_data.get("base_stats", {})
	var growth_rates: Dictionary = race_data.get("growth_rates", {})
	var result: Dictionary = {}
	for key: String in SpriteInstance.STAT_KEYS:
		var base: float = float(base_stats.get(key, 10))
		var growth: float = float(growth_rates.get(key, 1.0))
		result[key] = int(base + growth * float(maxi(level - 1, 0)))
	return result

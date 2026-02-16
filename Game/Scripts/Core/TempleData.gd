## TempleData — Data schema for explorable temple/dungeon regions.
## [P9-001] Defines temple identity, elemental/class theming, difficulty,
## region areas with encounter tables, reward pools, boss configuration,
## and unlock prerequisites. The game features 30+ temples.
class_name TempleData
extends Resource

## ── Identity ──────────────────────────────────────────────────────────────────

@export var temple_id: int = 0
@export var temple_name: String = ""

## ── Theming ───────────────────────────────────────────────────────────────────

## Whether this temple is themed around an element or a class archetype.
@export_enum("elemental", "class_based") var temple_type: String = "elemental"

## The primary element for elemental temples (e.g. "Fire"). Empty for class_based.
@export var dominant_element: String = ""

## The primary class for class_based temples (e.g. "Knight"). Empty for elemental.
@export var dominant_class: String = ""

## Additional elements present in encounter tables and environmental hazards.
@export var secondary_elements: Array[String] = []

## ── Difficulty ─────────────────────────────────────────────────────────────────

## 1-10 scale. Determines enemy level scaling, encounter density, and trap frequency.
@export_range(1, 10) var difficulty_tier: int = 1

## ── Region Areas ──────────────────────────────────────────────────────────────

## Each area within the temple. Players progress through areas sequentially.
## Each entry is a Dictionary:
##   {
##     "area_name": String,
##     "area_type": String,            — "corridor", "chamber", "puzzle", "boss_arena", "rest"
##     "encounter_table_id": int,      — reference to encounter table resource
##     "tileset_ref": String,          — path to the tileset resource
##     "ambient_audio_ref": String,    — path to the ambient audio track
##     "npc_data": Array[Dictionary],  — NPCs in this area: [{npc_id, position, dialog_id}]
##   }
@export var region_areas: Array[Dictionary] = []

## ── Reward Pool ───────────────────────────────────────────────────────────────

## {
##   "equipment_ids": Array[int],              — possible equipment drops
##   "drop_rates": Dictionary {equip_id: float}, — per-item drop chance (0.0-1.0)
##   "first_clear_bonus": Dictionary {         — one-time reward for first completion
##       "xp": int, "currency": int, "items": Array[Dictionary], "unlocks": Array[String]
##   }
## }
@export var reward_pool: Dictionary = {
	"equipment_ids": [],
	"drop_rates": {},
	"first_clear_bonus": {
		"xp": 0,
		"currency": 0,
		"items": [],
		"unlocks": [],
	},
}

## ── Boss ──────────────────────────────────────────────────────────────────────

## Configuration for the temple's boss encounter.
## {
##   "sprite_race_id": int,     — the boss Sprite's race
##   "level_offset": int,       — added to the player's average level to determine boss level
##   "ability_ids": Array[int], — the boss's ability loadout
##   "ai_profile": String,      — AI behavior profile key (e.g. "aggressive", "defensive", "tactical")
## }
@export var boss_data: Dictionary = {
	"sprite_race_id": 0,
	"level_offset": 0,
	"ability_ids": [],
	"ai_profile": "balanced",
}

## ── Unlock Prerequisites ──────────────────────────────────────────────────────

## Conditions that must be met before this temple is accessible.
## {
##   "quest_ids": Array[int],   — quests that must be completed
##   "temple_ids": Array[int],  — temples that must be cleared
##   "min_level": int,          — minimum player (top-10 average) level
## }
@export var unlock_prerequisites: Dictionary = {
	"quest_ids": [],
	"temple_ids": [],
	"min_level": 1,
}

## ── Completion State ──────────────────────────────────────────────────────────

## Runtime flag: has this temple been completed at least once?
@export var is_completed: bool = false


## ── Constants ─────────────────────────────────────────────────────────────────

const VALID_TEMPLE_TYPES: PackedStringArray = PackedStringArray([
	"elemental", "class_based",
])

const VALID_AREA_TYPES: PackedStringArray = PackedStringArray([
	"corridor", "chamber", "puzzle", "boss_arena", "rest",
])

const VALID_AI_PROFILES: PackedStringArray = PackedStringArray([
	"aggressive", "defensive", "tactical", "balanced", "support", "berserker",
])


## ── Helpers ───────────────────────────────────────────────────────────────────

## Get the total number of areas in this temple.
func get_area_count() -> int:
	return region_areas.size()


## Get a specific area by index. Returns empty Dictionary if out of range.
func get_area(index: int) -> Dictionary:
	if index >= 0 and index < region_areas.size():
		return region_areas[index]
	return {}


## Get the boss arena area (the last area of type "boss_arena"), or empty dict.
func get_boss_arena() -> Dictionary:
	for i in range(region_areas.size() - 1, -1, -1):
		if region_areas[i].get("area_type", "") == "boss_arena":
			return region_areas[i]
	return {}


## Calculate the boss's actual level given the player's average level.
func get_boss_level(player_avg_level: float) -> int:
	var offset: int = int(boss_data.get("level_offset", 0))
	return maxi(1, int(player_avg_level) + offset)


## Check if the player meets unlock prerequisites.
## [completed_quests] — Array[int] of completed quest IDs.
## [completed_temples] — Array[int] of completed temple IDs.
## [player_avg_level] — the player's top-10 average level.
func can_unlock(
	completed_quests: Array[int],
	completed_temples: Array[int],
	player_avg_level: float,
) -> bool:
	# Check minimum level.
	var min_lvl: int = int(unlock_prerequisites.get("min_level", 1))
	if player_avg_level < float(min_lvl):
		return false

	# Check required quests.
	var req_quests: Array = unlock_prerequisites.get("quest_ids", [])
	for qid in req_quests:
		if int(qid) not in completed_quests:
			return false

	# Check required temples.
	var req_temples: Array = unlock_prerequisites.get("temple_ids", [])
	for tid in req_temples:
		if int(tid) not in completed_temples:
			return false

	return true


## Roll for equipment drops from the reward pool. Returns an Array[int] of
## equipment IDs that dropped.
func roll_drops() -> Array[int]:
	var drops: Array[int] = []
	var equip_ids: Array = reward_pool.get("equipment_ids", [])
	var rates: Dictionary = reward_pool.get("drop_rates", {})
	for eid in equip_ids:
		var rate: float = float(rates.get(eid, 0.0))
		if randf() <= rate:
			drops.append(int(eid))
	return drops


## Get the first-clear bonus rewards dictionary.
func get_first_clear_bonus() -> Dictionary:
	return reward_pool.get("first_clear_bonus", {})


## ── Validation ────────────────────────────────────────────────────────────────

func validate() -> Array[String]:
	var errors: Array[String] = []
	if temple_id <= 0:
		errors.append("temple_id must be a positive integer.")
	if temple_name.is_empty():
		errors.append("temple_name is required.")
	if temple_type not in VALID_TEMPLE_TYPES:
		errors.append("temple_type '%s' is invalid." % temple_type)
	if temple_type == "elemental" and dominant_element.is_empty():
		errors.append("elemental temples require a dominant_element.")
	if temple_type == "class_based" and dominant_class.is_empty():
		errors.append("class_based temples require a dominant_class.")
	if difficulty_tier < 1 or difficulty_tier > 10:
		errors.append("difficulty_tier must be 1-10.")
	if region_areas.is_empty():
		errors.append("At least one region_area is required.")
	for i in region_areas.size():
		var area: Dictionary = region_areas[i]
		if not area.has("area_name"):
			errors.append("region_areas[%d] missing 'area_name'." % i)
		if area.has("area_type") and area["area_type"] not in VALID_AREA_TYPES:
			errors.append("region_areas[%d] area_type '%s' is invalid." % [i, area["area_type"]])
	if not boss_data.has("sprite_race_id") or int(boss_data.get("sprite_race_id", 0)) <= 0:
		errors.append("boss_data.sprite_race_id must be a positive integer.")
	var ai_profile: String = str(boss_data.get("ai_profile", ""))
	if not ai_profile.is_empty() and ai_profile not in VALID_AI_PROFILES:
		errors.append("boss_data.ai_profile '%s' is not valid." % ai_profile)
	return errors

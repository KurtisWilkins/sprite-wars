## SpriteCrySystem — Manages playback of Sprite voice cries with context-based pitch variation.
## [P11-025] Each of the 72 Sprite forms (24 races x 3 stages) has a unique cry.
class_name SpriteCrySystem
extends RefCounted

# ==============================================================================
# Constants
# ==============================================================================

const CRIES_PATH: String = "res://Audio/Cries/"

## Pitch multipliers for different playback contexts.
## Encounter: normal, Evolution: triumphant (higher), Catch: excited (slightly higher),
## Faint: defeated (lower and slower), Inspect: neutral.
const CONTEXT_PITCH: Dictionary = {
	"encounter": 1.0,
	"evolution": 1.15,
	"catch": 1.08,
	"faint": 0.75,
	"inspect": 1.0,
	"battle_intro": 1.0,
	"victory": 1.1,
	"level_up": 1.05,
}

## Small random pitch variation range applied on top of context pitch.
const PITCH_VARIATION: float = 0.03

# ==============================================================================
# Data
# ==============================================================================

## Maps form_id → cry file path (relative to res://).
## Populated via register_cry() or bulk-loaded from a data file.
var cry_map: Dictionary = {}

# ==============================================================================
# Public API
# ==============================================================================

## Play the cry for a specific Sprite form in a given context.
## [param form_id] Unique ID of the Sprite form (1–72).
## [param context] Playback context: "encounter", "evolution", "catch", "faint", "inspect",
##                 "battle_intro", "victory", "level_up".
func play_cry(form_id: int, context: String = "encounter") -> void:
	var path := _resolve_cry_path(form_id)
	if path.is_empty():
		push_warning("SpriteCrySystem: No cry registered for form_id %d" % form_id)
		return

	if not ResourceLoader.exists(path):
		push_warning("SpriteCrySystem: Cry file not found — '%s'" % path)
		return

	var stream: AudioStream = load(path)
	if not stream:
		return

	# Apply context-based pitch.
	var base_pitch: float = CONTEXT_PITCH.get(context, 1.0)
	var variation := randf_range(-PITCH_VARIATION, PITCH_VARIATION)
	var final_pitch := clampf(base_pitch + variation, 0.5, 2.0)

	AudioManager.voice_player.stream = stream
	AudioManager.voice_player.pitch_scale = final_pitch
	AudioManager.voice_player.volume_db = AudioManager._volume_to_db(AudioManager.voice_volume)
	AudioManager.voice_player.play()

	# Duck music during cry playback.
	AudioManager._duck_music(true)
	if not AudioManager.voice_player.finished.is_connected(_on_cry_finished):
		AudioManager.voice_player.finished.connect(_on_cry_finished, CONNECT_ONE_SHOT)


## Register a cry file path for a specific form.
## [param form_id] Unique form identifier (1–72).
## [param cry_path] Full res:// path to the .ogg cry file, OR just the filename stem.
func register_cry(form_id: int, cry_path: String) -> void:
	# If a full path is provided, store it directly.
	if cry_path.begins_with("res://"):
		cry_map[form_id] = cry_path
	else:
		# Assume it is a filename stem; prepend the cries directory.
		cry_map[form_id] = CRIES_PATH + cry_path + ".ogg"


## Batch-register cries from a dictionary of { form_id: cry_path }.
func register_bulk(data: Dictionary) -> void:
	for form_id: int in data:
		register_cry(form_id, data[form_id])


## Remove a cry registration.
func unregister_cry(form_id: int) -> void:
	cry_map.erase(form_id)


## Construct the expected cry path from a race_id and evolution stage.
## Uses the naming convention: {RaceName}_S{Stage}_Cry
## [param race_id] The race identifier (1–24).
## [param stage] Evolution stage (1, 2, or 3).
## Returns the res:// path string (does not verify the file exists).
func get_cry_path(race_id: int, stage: int) -> String:
	# If a form_id can be derived deterministically:
	var form_id := _form_id_from_race_stage(race_id, stage)
	if cry_map.has(form_id):
		return cry_map[form_id]
	# Return the conventional path even if not explicitly registered.
	return CRIES_PATH + "Race%02d_S%d_Cry.ogg" % [race_id, stage]


## Check if a cry is registered for a given form.
func has_cry(form_id: int) -> bool:
	return cry_map.has(form_id)


## Auto-register cries for all 24 races x 3 stages using the naming convention.
## Only registers paths for files that actually exist on disk.
func auto_register_all() -> void:
	for race_id in range(1, 25):  # 1–24
		for stage in range(1, 4):  # 1–3
			var form_id := _form_id_from_race_stage(race_id, stage)
			var path := CRIES_PATH + "Race%02d_S%d_Cry.ogg" % [race_id, stage]
			if ResourceLoader.exists(path):
				cry_map[form_id] = path

# ==============================================================================
# Internal
# ==============================================================================

## Resolve the cry path for a form_id, checking the map first, then falling back
## to the conventional naming pattern.
func _resolve_cry_path(form_id: int) -> String:
	if cry_map.has(form_id):
		return cry_map[form_id]
	# Derive race/stage from form_id and try the conventional path.
	var race_id := _race_from_form_id(form_id)
	var stage := _stage_from_form_id(form_id)
	if race_id > 0 and stage > 0:
		return CRIES_PATH + "Race%02d_S%d_Cry.ogg" % [race_id, stage]
	return ""


## Convert (race_id, stage) to a linear form_id.
## Formula: form_id = (race_id - 1) * 3 + stage
## Race 1 Stage 1 = 1, Race 1 Stage 2 = 2, ..., Race 24 Stage 3 = 72.
func _form_id_from_race_stage(race_id: int, stage: int) -> int:
	return (race_id - 1) * 3 + stage


## Extract race_id from a form_id.
func _race_from_form_id(form_id: int) -> int:
	if form_id < 1 or form_id > 72:
		return 0
	return ((form_id - 1) / 3) + 1


## Extract stage from a form_id.
func _stage_from_form_id(form_id: int) -> int:
	if form_id < 1 or form_id > 72:
		return 0
	return ((form_id - 1) % 3) + 1


func _on_cry_finished() -> void:
	AudioManager._duck_music(false)
	# Reset pitch scale to default.
	AudioManager.voice_player.pitch_scale = 1.0

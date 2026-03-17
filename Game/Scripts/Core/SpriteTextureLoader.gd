## SpriteTextureLoader — Loads assembled race sprite textures for UI display.
class_name SpriteTextureLoader
extends RefCounted

## Cache to avoid reloading textures.
static var _cache: Dictionary = {}

## Get the portrait texture for a sprite instance.
## Returns the assembled sprite PNG for the race + evolution stage.
static func get_portrait_texture(sprite_instance: SpriteInstance) -> Texture2D:
	if sprite_instance == null:
		return null
	var race_id: int = sprite_instance.race_id
	var stage: int = (sprite_instance.form_id - 1) % 3
	return get_race_texture(race_id, stage)

## Get texture for a race at a specific evolution stage.
static func get_race_texture(race_id: int, stage: int) -> Texture2D:
	var path: String = RaceBodyPartMapping.get_assembled_sprite_path(race_id, stage)
	if path.is_empty():
		return null
	if _cache.has(path):
		return _cache[path]
	if not ResourceLoader.exists(path):
		push_warning("SpriteTextureLoader: texture not found: %s" % path)
		return null
	var tex: Texture2D = load(path)
	_cache[path] = tex
	return tex

## Get texture by form_id directly (1-72).
static func get_form_texture(form_id: int) -> Texture2D:
	var race_id: int = int(ceil(float(form_id) / 3.0))
	var stage: int = (form_id - 1) % 3
	return get_race_texture(race_id, stage)

## Clear the texture cache.
static func clear_cache() -> void:
	_cache.clear()

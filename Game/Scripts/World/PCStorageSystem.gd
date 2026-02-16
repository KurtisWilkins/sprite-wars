## PCStorageSystem — Manages the Sprite storage box system (PC equivalent).
## [Progression] Handles depositing and withdrawing Sprites between the active
## team and long-term storage, with sorting, filtering, and search capabilities.
class_name PCStorageSystem
extends RefCounted


## ── Constants ───────────────────────────────────────────────────────────────

## Maximum number of Sprites that can be held in storage.
const MAX_STORAGE: int = 500

## Minimum team size — the player must always have at least one Sprite on team.
const MIN_TEAM_SIZE: int = 1

## Valid sort keys for get_sorted_storage().
const VALID_SORT_KEYS: PackedStringArray = PackedStringArray([
	"level", "race_id", "form_id", "instance_id", "name",
])


## ── Core Operations ─────────────────────────────────────────────────────────

## Deposit a Sprite from the team into storage.
## The player must retain at least MIN_TEAM_SIZE Sprites on the team.
##
## Parameters:
##   sprite      — the SpriteInstance Resource to deposit
##   player_data — the PlayerData Resource
##
## Returns:
##   true if the deposit succeeded, false if blocked (team too small or storage full).
func deposit(sprite: Resource, player_data: Resource) -> bool:
	if sprite == null or not (sprite is SpriteInstance):
		push_warning("PCStorageSystem.deposit: invalid sprite.")
		return false

	if player_data == null or not (player_data is PlayerData):
		push_warning("PCStorageSystem.deposit: invalid player_data.")
		return false

	# Check storage capacity.
	if player_data.storage.size() >= MAX_STORAGE:
		push_warning("PCStorageSystem.deposit: storage is full (%d/%d)." % [
			player_data.storage.size(), MAX_STORAGE
		])
		return false

	# Ensure team retains minimum size.
	if player_data.team.size() <= MIN_TEAM_SIZE:
		push_warning("PCStorageSystem.deposit: cannot deposit — team would be empty.")
		return false

	# Find and remove from team.
	var found_index: int = -1
	for i in player_data.team.size():
		if player_data.team[i] is SpriteInstance and player_data.team[i].instance_id == sprite.instance_id:
			found_index = i
			break

	if found_index < 0:
		push_warning("PCStorageSystem.deposit: sprite not found in team.")
		return false

	var removed = player_data.team[found_index]
	player_data.team.remove_at(found_index)
	player_data.storage.append(removed)
	return true


## Withdraw a Sprite from storage into the active team.
## The team must have room (under PlayerData.MAX_TEAM_SIZE).
##
## Parameters:
##   sprite      — the SpriteInstance Resource to withdraw
##   player_data — the PlayerData Resource
##
## Returns:
##   true if the withdrawal succeeded, false if blocked (team full or not found).
func withdraw(sprite: Resource, player_data: Resource) -> bool:
	if sprite == null or not (sprite is SpriteInstance):
		push_warning("PCStorageSystem.withdraw: invalid sprite.")
		return false

	if player_data == null or not (player_data is PlayerData):
		push_warning("PCStorageSystem.withdraw: invalid player_data.")
		return false

	# Check team capacity.
	if player_data.team.size() >= PlayerData.MAX_TEAM_SIZE:
		push_warning("PCStorageSystem.withdraw: team is full (%d/%d)." % [
			player_data.team.size(), PlayerData.MAX_TEAM_SIZE
		])
		return false

	# Find and remove from storage.
	var found_index: int = -1
	for i in player_data.storage.size():
		if player_data.storage[i] is SpriteInstance and player_data.storage[i].instance_id == sprite.instance_id:
			found_index = i
			break

	if found_index < 0:
		push_warning("PCStorageSystem.withdraw: sprite not found in storage.")
		return false

	var removed = player_data.storage[found_index]
	player_data.storage.remove_at(found_index)
	player_data.team.append(removed)
	return true


## ── Sorting & Filtering ────────────────────────────────────────────────────

## Get a sorted and filtered view of the player's storage.
##
## Parameters:
##   player_data — the PlayerData Resource
##   sort_by     — sort key: "level", "race_id", "form_id", "instance_id", "name"
##   filters     — Dictionary of filter criteria:
##     {
##       "min_level": int,        — minimum level (inclusive)
##       "max_level": int,        — maximum level (inclusive)
##       "race_id": int,          — filter to a specific race (-1 = any)
##       "element": String,       — filter by element type ("" = any)
##       "rarity": String,        — filter by rarity ("" = any)
##     }
##   ascending   — true for ascending sort, false for descending
##
## Returns:
##   Array of SpriteInstance Resources matching the filters, sorted as specified.
func get_sorted_storage(
	player_data: Resource,
	sort_by: String = "level",
	filters: Dictionary = {},
	ascending: bool = true,
) -> Array:
	if player_data == null or not (player_data is PlayerData):
		return []

	# Apply filters.
	var filtered: Array = _apply_filters(player_data.storage, filters)

	# Sort.
	var sort_key: String = sort_by if sort_by in VALID_SORT_KEYS else "level"
	filtered.sort_custom(func(a, b) -> bool:
		var val_a = _get_sort_value(a, sort_key)
		var val_b = _get_sort_value(b, sort_key)
		if ascending:
			return val_a < val_b
		else:
			return val_a > val_b
	)

	return filtered


## Search storage by query string, matching against nickname, race_id, and form_id.
##
## Parameters:
##   player_data — the PlayerData Resource
##   query       — search string (case-insensitive). Matches nickname, and
##                 numeric queries match race_id or form_id.
##
## Returns:
##   Array of SpriteInstance Resources matching the query.
func search_storage(player_data: Resource, query: String) -> Array:
	if player_data == null or not (player_data is PlayerData):
		return []

	if query.strip_edges().is_empty():
		return player_data.storage.duplicate()

	var search_lower: String = query.strip_edges().to_lower()
	var search_int: int = -1
	if search_lower.is_valid_int():
		search_int = int(search_lower)

	var results: Array = []

	for sprite in player_data.storage:
		if not (sprite is SpriteInstance):
			continue

		# Match nickname.
		if not sprite.nickname.is_empty() and sprite.nickname.to_lower().contains(search_lower):
			results.append(sprite)
			continue

		# Match numeric ID (race_id or form_id).
		if search_int > 0:
			if sprite.race_id == search_int or sprite.form_id == search_int:
				results.append(sprite)
				continue

		# Match level as a number.
		if search_int > 0 and sprite.level == search_int:
			results.append(sprite)
			continue

	return results


## ── Capacity Queries ────────────────────────────────────────────────────────

## Get the current storage usage.
func get_storage_count(player_data: Resource) -> int:
	if player_data == null or not (player_data is PlayerData):
		return 0
	return player_data.storage.size()


## Get the number of free storage slots.
func get_free_slots(player_data: Resource) -> int:
	return MAX_STORAGE - get_storage_count(player_data)


## Whether storage is at maximum capacity.
func is_storage_full(player_data: Resource) -> bool:
	return get_storage_count(player_data) >= MAX_STORAGE


## Whether the team can accept another Sprite (for withdraw validation).
func can_withdraw(player_data: Resource) -> bool:
	if player_data == null or not (player_data is PlayerData):
		return false
	return player_data.team.size() < PlayerData.MAX_TEAM_SIZE


## Whether the team can deposit a Sprite (not at minimum size).
func can_deposit(player_data: Resource) -> bool:
	if player_data == null or not (player_data is PlayerData):
		return false
	return player_data.team.size() > MIN_TEAM_SIZE and not is_storage_full(player_data)


## ── Batch Operations ────────────────────────────────────────────────────────

## Swap a Sprite from the team with one from storage in a single operation.
##
## Parameters:
##   team_sprite    — the SpriteInstance to move from team to storage
##   storage_sprite — the SpriteInstance to move from storage to team
##   player_data    — the PlayerData Resource
##
## Returns:
##   true if the swap succeeded, false if either Sprite was not found.
func swap(
	team_sprite: Resource,
	storage_sprite: Resource,
	player_data: Resource,
) -> bool:
	if team_sprite == null or storage_sprite == null:
		return false
	if player_data == null or not (player_data is PlayerData):
		return false

	# Find both Sprites.
	var team_idx: int = _find_in_array(player_data.team, team_sprite)
	var storage_idx: int = _find_in_array(player_data.storage, storage_sprite)

	if team_idx < 0 or storage_idx < 0:
		return false

	# Perform the swap atomically.
	var temp_team = player_data.team[team_idx]
	var temp_storage = player_data.storage[storage_idx]
	player_data.team[team_idx] = temp_storage
	player_data.storage[storage_idx] = temp_team

	return true


## ── Internal Helpers ────────────────────────────────────────────────────────

## Apply filters to an array of SpriteInstances.
func _apply_filters(sprites: Array, filters: Dictionary) -> Array:
	if filters.is_empty():
		return sprites.duplicate()

	var min_level: int = int(filters.get("min_level", 0))
	var max_level: int = int(filters.get("max_level", SpriteInstance.MAX_LEVEL))
	var filter_race_id: int = int(filters.get("race_id", -1))
	# element and rarity filters are reserved for when race_data lookup is available.

	var result: Array = []
	for sprite in sprites:
		if not (sprite is SpriteInstance):
			continue

		# Level range filter.
		if sprite.level < min_level or sprite.level > max_level:
			continue

		# Race filter.
		if filter_race_id > 0 and sprite.race_id != filter_race_id:
			continue

		result.append(sprite)

	return result


## Get the sortable value for a Sprite by key.
func _get_sort_value(sprite: SpriteInstance, sort_key: String) -> Variant:
	match sort_key:
		"level":
			return sprite.level
		"race_id":
			return sprite.race_id
		"form_id":
			return sprite.form_id
		"instance_id":
			return sprite.instance_id
		"name":
			if not sprite.nickname.is_empty():
				return sprite.nickname.to_lower()
			return "zzzz_%d" % sprite.race_id  # Unnamed Sprites sort last.
		_:
			return sprite.level


## Find a SpriteInstance in an array by instance_id. Returns -1 if not found.
func _find_in_array(arr: Array, sprite: Resource) -> int:
	if sprite == null or not (sprite is SpriteInstance):
		return -1
	for i in arr.size():
		if arr[i] is SpriteInstance and arr[i].instance_id == sprite.instance_id:
			return i
	return -1

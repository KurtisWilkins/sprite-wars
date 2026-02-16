## ItemInventory — Standalone inventory container for managing item stacks,
## category filtering, and sorting.
## [P5-015] Used by PlayerData and potentially by shops, NPC traders, and storage.
class_name ItemInventory
extends RefCounted

## ── Constants ───────────────────────────────────────────────────────────────

const VALID_CATEGORIES: PackedStringArray = PackedStringArray([
	"crystals", "potions", "key_items", "battle_items", "materials",
])

const SORT_MODES: PackedStringArray = PackedStringArray([
	"name", "rarity", "category", "count",
])

## ── Data ────────────────────────────────────────────────────────────────────

## Items stored as {item_id (int): count (int)}.
var items: Dictionary = {}  # {int: int}

## Maximum total number of unique item stacks.
var max_capacity: int = 999

## ── Signals ─────────────────────────────────────────────────────────────────

## Note: RefCounted cannot have signals in Godot 4; use a callback pattern or
## check return values instead. These are documented as the intended contract.
## signal item_added(item_id: int, count: int)
## signal item_removed(item_id: int, count: int)
## signal inventory_full()


## ── Constructor ─────────────────────────────────────────────────────────────

func _init(capacity: int = 999) -> void:
	max_capacity = capacity


## ── Public API ──────────────────────────────────────────────────────────────

## Adds [count] of [item_id] to the inventory.
## Returns true if the items were successfully added, false if the inventory
## is at capacity for new stacks or if invalid input is provided.
func add_item(item_id: int, count: int = 1) -> bool:
	if count <= 0:
		return false

	# If item already exists, just increase the count
	if items.has(item_id):
		items[item_id] = items[item_id] + count
		return true

	# New item: check capacity
	if items.size() >= max_capacity:
		return false

	items[item_id] = count
	return true


## Removes [count] of [item_id] from the inventory.
## Returns true if the removal was successful, false if the player doesn't
## have enough of the item.
func remove_item(item_id: int, count: int = 1) -> bool:
	if count <= 0:
		return false

	if not items.has(item_id):
		return false

	var current_count: int = items[item_id]
	if current_count < count:
		return false

	var new_count: int = current_count - count
	if new_count <= 0:
		items.erase(item_id)
	else:
		items[item_id] = new_count

	return true


## Returns true if the inventory contains at least [count] of [item_id].
func has_item(item_id: int, count: int = 1) -> bool:
	if not items.has(item_id):
		return false
	return items[item_id] >= count


## Returns the current count of [item_id] in the inventory, or 0.
func get_count(item_id: int) -> int:
	return items.get(item_id, 0)


## Returns all items belonging to the given category.
## Each entry: {item_id: int, count: int, data: Dictionary}
## [data] is populated from the item data resource if available.
func get_items_by_category(category: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []

	for item_id: int in items:
		var item_data: Dictionary = _get_item_data(item_id)
		var item_category: String = item_data.get("category", "materials")
		if item_category == category:
			result.append({
				"item_id": item_id,
				"count": items[item_id],
				"data": item_data,
			})

	return result


## Returns all items in the inventory.
## Each entry: {item_id: int, count: int, data: Dictionary}
func get_all_items() -> Array[Dictionary]:
	var result: Array[Dictionary] = []

	for item_id: int in items:
		var item_data: Dictionary = _get_item_data(item_id)
		result.append({
			"item_id": item_id,
			"count": items[item_id],
			"data": item_data,
		})

	return result


## Sorts the inventory by the specified criteria.
## Supported sort_by values: "name", "rarity", "category", "count".
func sort_items(sort_by: String = "name") -> void:
	if sort_by not in SORT_MODES:
		push_warning("ItemInventory: unsupported sort mode '%s'" % sort_by)
		return

	# Gather all items into a sortable array
	var item_list: Array[Dictionary] = get_all_items()

	match sort_by:
		"name":
			item_list.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
				var name_a: String = a.get("data", {}).get("name", "")
				var name_b: String = b.get("data", {}).get("name", "")
				return name_a < name_b
			)
		"rarity":
			item_list.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
				var rarity_a: int = _rarity_to_int(a.get("data", {}).get("rarity", "common"))
				var rarity_b: int = _rarity_to_int(b.get("data", {}).get("rarity", "common"))
				return rarity_a > rarity_b  # Higher rarity first
			)
		"category":
			item_list.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
				var cat_a: String = a.get("data", {}).get("category", "materials")
				var cat_b: String = b.get("data", {}).get("category", "materials")
				return cat_a < cat_b
			)
		"count":
			item_list.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
				return a.get("count", 0) > b.get("count", 0)  # Highest count first
			)

	# Rebuild the items dictionary in sorted order. Godot 4 Dictionaries
	# maintain insertion order, so this preserves the sorted sequence.
	var new_items: Dictionary = {}
	for entry: Dictionary in item_list:
		new_items[entry["item_id"]] = entry["count"]
	items = new_items


## ── Capacity Queries ────────────────────────────────────────────────────────

## Returns the number of unique item stacks in the inventory.
func get_unique_item_count() -> int:
	return items.size()


## Returns true if the inventory cannot accept new unique item stacks.
func is_full() -> bool:
	return items.size() >= max_capacity


## Returns the total number of individual items across all stacks.
func get_total_item_count() -> int:
	var total: int = 0
	for item_id: int in items:
		total += items[item_id]
	return total


## Clears the entire inventory.
func clear() -> void:
	items.clear()


## ── Serialization ───────────────────────────────────────────────────────────

## Serializes the inventory to a Dictionary for save/load.
func to_dict() -> Dictionary:
	var data: Dictionary = {}
	for item_id: int in items:
		data[str(item_id)] = items[item_id]
	return data


## Restores the inventory from a saved Dictionary.
func from_dict(data: Dictionary) -> void:
	items.clear()
	for key: String in data:
		if key.is_valid_int():
			items[key.to_int()] = int(data[key])


## ── Helpers ─────────────────────────────────────────────────────────────────

## Retrieves the item data resource for the given item_id.
## Returns a Dictionary with at minimum {name, category, rarity, description, price}.
## In production, this would load from a centralized ItemDatabase resource.
func _get_item_data(item_id: int) -> Dictionary:
	# Placeholder: production code would look up from a global item database.
	# e.g. ItemDatabase.get_item(item_id)
	return {
		"item_id": item_id,
		"name": "Item #%d" % item_id,
		"category": "materials",
		"rarity": "common",
		"description": "",
		"price": 10,
	}


## Converts a rarity string to a sortable integer value.
func _rarity_to_int(rarity: String) -> int:
	match rarity:
		"common":
			return 0
		"uncommon":
			return 1
		"rare":
			return 2
		"legendary":
			return 3
		_:
			return 0

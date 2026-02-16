## ShopSystem — Manages shop inventories, buy/sell transactions, stock tracking,
## and currency validation.
## [P5-014] Each shop has a unique inventory with optional limited stock.
extends Node

## ── Shop Inventories ────────────────────────────────────────────────────────

## Dictionary mapping shop_id (String) to an Array of item entries.
## Each item entry: {item_id: int, price: int, stock: int (-1 for infinite), category: String}
var shop_inventories: Dictionary = {}  # {String: Array[Dictionary]}

## ── Configuration ───────────────────────────────────────────────────────────

## Sell price multiplier relative to buy price (0.5 = 50%).
@export var sell_price_ratio: float = 0.5

## ── Signals ─────────────────────────────────────────────────────────────────

signal shop_opened_signal(shop_id: String, inventory: Array)
signal shop_closed_signal(shop_id: String)
signal item_bought(shop_id: String, item_id: int, quantity: int, total_cost: int)
signal item_sold(item_id: int, quantity: int, currency_gained: int)
signal purchase_failed(shop_id: String, item_id: int, reason: String)


## ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	add_to_group("shop_system")


## ── Public API ──────────────────────────────────────────────────────────────

## Registers a shop's inventory. Called during map loading or from data files.
func register_shop(shop_id: String, inventory: Array[Dictionary]) -> void:
	shop_inventories[shop_id] = inventory


## Opens a shop by emitting signals for the UI layer to display the shop screen.
func open_shop(shop_id: String) -> void:
	if not shop_inventories.has(shop_id):
		push_warning("ShopSystem: no inventory registered for shop '%s'" % shop_id)
		return

	EventBus.shop_opened.emit(shop_id)
	shop_opened_signal.emit(shop_id, shop_inventories[shop_id])


## Closes the shop UI.
func close_shop(shop_id: String) -> void:
	shop_closed_signal.emit(shop_id)


## Attempts to purchase an item from a shop.
## Returns: {success: bool, reason: String}
func buy_item(shop_id: String, item_index: int, quantity: int = 1) -> Dictionary:
	# Validate shop exists
	if not shop_inventories.has(shop_id):
		return {"success": false, "reason": "Shop not found."}

	var inventory: Array = shop_inventories[shop_id]

	# Validate item index
	if item_index < 0 or item_index >= inventory.size():
		return {"success": false, "reason": "Invalid item."}

	var item_entry: Dictionary = inventory[item_index]
	var item_id: int = item_entry.get("item_id", 0)
	var price: int = item_entry.get("price", 0)
	var stock: int = item_entry.get("stock", -1)  # -1 = infinite

	# Validate quantity
	if quantity <= 0:
		return {"success": false, "reason": "Invalid quantity."}

	# Check stock availability
	if stock != -1 and stock < quantity:
		return {"success": false, "reason": "Not enough stock. Only %d remaining." % stock}

	# Calculate total cost
	var total_cost: int = price * quantity

	# Check player currency
	var player_currency: int = _get_player_currency()
	if player_currency < total_cost:
		return {
			"success": false,
			"reason": "Not enough currency. Need %d, have %d." % [total_cost, player_currency],
		}

	# Deduct currency
	_deduct_currency(total_cost)

	# Add items to player inventory
	_add_items_to_inventory(item_id, quantity)

	# Deduct stock (if not infinite)
	if stock != -1:
		item_entry["stock"] = stock - quantity

	# Emit signals
	item_bought.emit(shop_id, item_id, quantity, total_cost)
	EventBus.currency_changed.emit(-total_cost)
	EventBus.sfx_requested.emit("purchase", Vector2.ZERO)

	return {"success": true, "reason": ""}


## Sells an item from the player's inventory.
## Returns: {success: bool, currency_gained: int}
func sell_item(item_id: int, quantity: int = 1) -> Dictionary:
	if quantity <= 0:
		return {"success": false, "currency_gained": 0}

	# Check if the player has enough of this item
	if not _player_has_item(item_id, quantity):
		return {"success": false, "currency_gained": 0}

	# Check if the item is sellable (key items typically aren't)
	if _is_key_item(item_id):
		return {"success": false, "currency_gained": 0}

	# Calculate sell price
	var buy_price: int = _get_item_buy_price(item_id)
	var sell_price: int = maxi(1, int(float(buy_price) * sell_price_ratio))
	var currency_gained: int = sell_price * quantity

	# Remove items from inventory
	_remove_items_from_inventory(item_id, quantity)

	# Add currency
	_add_currency(currency_gained)

	# Emit signals
	item_sold.emit(item_id, quantity, currency_gained)
	EventBus.currency_changed.emit(currency_gained)
	EventBus.sfx_requested.emit("sell", Vector2.ZERO)

	return {"success": true, "currency_gained": currency_gained}


## Returns the full shop inventory data for display in the shop UI.
func get_shop_data(shop_id: String) -> Array[Dictionary]:
	if not shop_inventories.has(shop_id):
		return []

	var result: Array[Dictionary] = []
	var inventory: Array = shop_inventories[shop_id]

	for item_entry: Dictionary in inventory:
		var display_entry: Dictionary = item_entry.duplicate()
		# Enrich with item data for the UI
		display_entry["sell_price"] = maxi(1, int(float(item_entry.get("price", 0)) * sell_price_ratio))
		display_entry["can_afford"] = _get_player_currency() >= item_entry.get("price", 0)
		display_entry["in_stock"] = item_entry.get("stock", -1) != 0
		result.append(display_entry)

	return result


## Returns the sell price for a given item.
func get_sell_price(item_id: int) -> int:
	var buy_price: int = _get_item_buy_price(item_id)
	return maxi(1, int(float(buy_price) * sell_price_ratio))


## ── Currency Helpers ────────────────────────────────────────────────────────

func _get_player_currency() -> int:
	if GameManager.player_data and GameManager.player_data.get("currency") != null:
		return GameManager.player_data.currency
	return 0


func _deduct_currency(amount: int) -> void:
	if GameManager.player_data and GameManager.player_data.get("currency") != null:
		GameManager.player_data.currency = maxi(0, GameManager.player_data.currency - amount)


func _add_currency(amount: int) -> void:
	if GameManager.player_data and GameManager.player_data.get("currency") != null:
		GameManager.player_data.currency += amount


## ── Inventory Helpers ───────────────────────────────────────────────────────

func _add_items_to_inventory(item_id: int, count: int) -> void:
	if GameManager.player_data and GameManager.player_data.has_method("add_item"):
		GameManager.player_data.add_item(item_id, count)
	else:
		# Fallback: emit item_acquired for other systems to handle
		EventBus.item_acquired.emit(null, count)


func _remove_items_from_inventory(item_id: int, count: int) -> void:
	if GameManager.player_data and GameManager.player_data.has_method("remove_item"):
		GameManager.player_data.remove_item(item_id, count)


func _player_has_item(item_id: int, count: int = 1) -> bool:
	if GameManager.player_data and GameManager.player_data.has_method("has_item"):
		return GameManager.player_data.has_item(item_id, count)
	return false


func _is_key_item(item_id: int) -> bool:
	# Key items (category = "key_items") cannot be sold.
	if GameManager.player_data and GameManager.player_data.has_method("get_item_category"):
		return GameManager.player_data.get_item_category(item_id) == "key_items"
	return false


func _get_item_buy_price(item_id: int) -> int:
	# Look up the buy price across all registered shops
	for shop_id: String in shop_inventories:
		var inventory: Array = shop_inventories[shop_id]
		for item_entry: Dictionary in inventory:
			if item_entry.get("item_id", -1) == item_id:
				return item_entry.get("price", 0)
	# Fallback: check item data resource
	return 10  # Minimum fallback price

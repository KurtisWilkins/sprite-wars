/**
 * ShopSystem — Manages shop inventories, buy/sell transactions, stock tracking,
 * and currency validation.
 * [P5-014] Each shop has a unique inventory with optional limited stock.
 *
 * Ported from Game/Scripts/World/ShopSystem.gd
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// ── ShopSystem Class ────────────────────────────────────────────────────────

export class ShopSystem {
    /**
     * @param {object} [config]
     * @param {number} [config.sellPriceRatio] - Sell price multiplier (0.5 = 50%).
     * @param {object} [config.gameManager]    - Reference to game manager for player data.
     */
    constructor(config = {}) {
        // ── Configuration ───────────────────────────────────────────────

        /** Sell price multiplier relative to buy price (0.5 = 50%). */
        this.sellPriceRatio = config.sellPriceRatio ?? 0.5;

        /** Reference to game manager for player data access. */
        this.gameManager = config.gameManager || null;

        // ── Shop Inventories ────────────────────────────────────────────

        /**
         * Dictionary mapping shopId to an Array of item entries.
         * Each item entry: { itemId, price, stock (-1 for infinite), category }
         * @type {Object.<string, object[]>}
         */
        this.shopInventories = {};
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Registers a shop's inventory. Called during map loading or from data files.
     * @param {string} shopId
     * @param {object[]} inventory - Array of item entries:
     *   { itemId: number, price: number, stock: number (-1 = infinite), category: string }
     */
    registerShop(shopId, inventory) {
        this.shopInventories[shopId] = inventory;
    }

    /**
     * Opens a shop by emitting signals for the UI layer to display the shop screen.
     * @param {string} shopId
     */
    openShop(shopId) {
        if (!this.shopInventories[shopId]) {
            console.warn(`ShopSystem: no inventory registered for shop '${shopId}'`);
            return;
        }

        eventBus.emit('shop_opened', shopId);
        eventBus.emit('shop_opened_signal', shopId, this.shopInventories[shopId]);
    }

    /**
     * Closes the shop UI.
     * @param {string} shopId
     */
    closeShop(shopId) {
        eventBus.emit('shop_closed_signal', shopId);
    }

    /**
     * Attempts to purchase an item from a shop.
     *
     * @param {string} shopId
     * @param {number} itemIndex - Index within the shop's inventory array.
     * @param {number} [quantity=1]
     * @returns {{ success: boolean, reason: string }}
     */
    buyItem(shopId, itemIndex, quantity = 1) {
        // Validate shop exists
        if (!this.shopInventories[shopId]) {
            return { success: false, reason: 'Shop not found.' };
        }

        const inventory = this.shopInventories[shopId];

        // Validate item index
        if (itemIndex < 0 || itemIndex >= inventory.length) {
            return { success: false, reason: 'Invalid item.' };
        }

        const itemEntry = inventory[itemIndex];
        const itemId = itemEntry.itemId ?? itemEntry.item_id ?? 0;
        const price = itemEntry.price ?? 0;
        const stock = itemEntry.stock ?? -1; // -1 = infinite

        // Validate quantity
        if (quantity <= 0) {
            return { success: false, reason: 'Invalid quantity.' };
        }

        // Check stock availability
        if (stock !== -1 && stock < quantity) {
            return { success: false, reason: `Not enough stock. Only ${stock} remaining.` };
        }

        // Calculate total cost
        const totalCost = price * quantity;

        // Check player currency
        const playerCurrency = this._getPlayerCurrency();
        if (playerCurrency < totalCost) {
            return {
                success: false,
                reason: `Not enough currency. Need ${totalCost}, have ${playerCurrency}.`,
            };
        }

        // Deduct currency
        this._deductCurrency(totalCost);

        // Add items to player inventory
        this._addItemsToInventory(itemId, quantity);

        // Deduct stock (if not infinite)
        if (stock !== -1) {
            itemEntry.stock = stock - quantity;
        }

        // Emit signals
        eventBus.emit('item_bought', shopId, itemId, quantity, totalCost);
        eventBus.emit(GameEvents.GOLD_CHANGED, -totalCost);
        eventBus.emit('sfx_requested', 'purchase', { x: 0, y: 0 });

        return { success: true, reason: '' };
    }

    /**
     * Sells an item from the player's inventory.
     *
     * @param {number} itemId
     * @param {number} [quantity=1]
     * @returns {{ success: boolean, currencyGained: number }}
     */
    sellItem(itemId, quantity = 1) {
        if (quantity <= 0) {
            return { success: false, currencyGained: 0 };
        }

        // Check if the player has enough of this item
        if (!this._playerHasItem(itemId, quantity)) {
            return { success: false, currencyGained: 0 };
        }

        // Check if the item is sellable (key items typically aren't)
        if (this._isKeyItem(itemId)) {
            return { success: false, currencyGained: 0 };
        }

        // Calculate sell price
        const buyPrice = this._getItemBuyPrice(itemId);
        const sellPrice = Math.max(1, Math.floor(buyPrice * this.sellPriceRatio));
        const currencyGained = sellPrice * quantity;

        // Remove items from inventory
        this._removeItemsFromInventory(itemId, quantity);

        // Add currency
        this._addCurrency(currencyGained);

        // Emit signals
        eventBus.emit('item_sold', itemId, quantity, currencyGained);
        eventBus.emit(GameEvents.GOLD_CHANGED, currencyGained);
        eventBus.emit('sfx_requested', 'sell', { x: 0, y: 0 });

        return { success: true, currencyGained };
    }

    /**
     * Returns the full shop inventory data for display in the shop UI.
     *
     * @param {string} shopId
     * @returns {object[]} Array of display entries.
     */
    getShopData(shopId) {
        if (!this.shopInventories[shopId]) {
            return [];
        }

        const result = [];
        const inventory = this.shopInventories[shopId];

        for (const itemEntry of inventory) {
            const displayEntry = { ...itemEntry };
            // Enrich with computed data for the UI
            displayEntry.sellPrice = Math.max(
                1,
                Math.floor((itemEntry.price ?? 0) * this.sellPriceRatio)
            );
            displayEntry.canAfford = this._getPlayerCurrency() >= (itemEntry.price ?? 0);
            displayEntry.inStock = (itemEntry.stock ?? -1) !== 0;
            result.push(displayEntry);
        }

        return result;
    }

    /**
     * Returns the sell price for a given item.
     * @param {number} itemId
     * @returns {number}
     */
    getSellPrice(itemId) {
        const buyPrice = this._getItemBuyPrice(itemId);
        return Math.max(1, Math.floor(buyPrice * this.sellPriceRatio));
    }

    // ── Currency Helpers ────────────────────────────────────────────────────

    /**
     * @returns {number}
     */
    _getPlayerCurrency() {
        const playerData = this.gameManager?.playerData;
        if (playerData && playerData.currency != null) {
            return playerData.currency;
        }
        return 0;
    }

    /**
     * @param {number} amount
     */
    _deductCurrency(amount) {
        const playerData = this.gameManager?.playerData;
        if (playerData && playerData.currency != null) {
            playerData.currency = Math.max(0, playerData.currency - amount);
        }
    }

    /**
     * @param {number} amount
     */
    _addCurrency(amount) {
        const playerData = this.gameManager?.playerData;
        if (playerData && playerData.currency != null) {
            playerData.currency += amount;
        }
    }

    // ── Inventory Helpers ───────────────────────────────────────────────────

    /**
     * @param {number} itemId
     * @param {number} count
     */
    _addItemsToInventory(itemId, count) {
        const playerData = this.gameManager?.playerData;
        if (playerData && typeof playerData.addItem === 'function') {
            playerData.addItem(itemId, count);
        } else {
            // Fallback: emit item_acquired for other systems to handle
            eventBus.emit(GameEvents.ITEM_OBTAINED, { itemId, count });
        }
    }

    /**
     * @param {number} itemId
     * @param {number} count
     */
    _removeItemsFromInventory(itemId, count) {
        const playerData = this.gameManager?.playerData;
        if (playerData && typeof playerData.removeItem === 'function') {
            playerData.removeItem(itemId, count);
        }
    }

    /**
     * @param {number} itemId
     * @param {number} [count=1]
     * @returns {boolean}
     */
    _playerHasItem(itemId, count = 1) {
        const playerData = this.gameManager?.playerData;
        if (playerData && typeof playerData.hasItem === 'function') {
            return playerData.hasItem(itemId, count);
        }
        return false;
    }

    /**
     * @param {number} itemId
     * @returns {boolean}
     */
    _isKeyItem(itemId) {
        const playerData = this.gameManager?.playerData;
        if (playerData && typeof playerData.getItemCategory === 'function') {
            return playerData.getItemCategory(itemId) === 'key_items';
        }
        return false;
    }

    /**
     * Looks up the buy price for an item across all registered shops.
     * @param {number} itemId
     * @returns {number}
     */
    _getItemBuyPrice(itemId) {
        for (const shopId of Object.keys(this.shopInventories)) {
            const inventory = this.shopInventories[shopId];
            for (const itemEntry of inventory) {
                const entryItemId = itemEntry.itemId ?? itemEntry.item_id ?? -1;
                if (entryItemId === itemId) {
                    return itemEntry.price ?? 0;
                }
            }
        }
        // Fallback: minimum fallback price
        return 10;
    }
}

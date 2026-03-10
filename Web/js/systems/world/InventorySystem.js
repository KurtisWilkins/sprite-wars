/**
 * InventorySystem — Manages item inventory (stacks, categories, sorting) and
 * equipment inventory (equip/unequip, stat changes, comparison with synergy).
 *
 * Ported from:
 *   Game/Scripts/World/ItemInventory.gd
 *   Game/Scripts/World/EquipmentInventorySystem.gd
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// ── Constants ───────────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['crystals', 'potions', 'key_items', 'battle_items', 'materials'];
const SORT_MODES = ['name', 'rarity', 'category', 'count'];

const EQUIPMENT_SLOTS = ['weapon', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'ring', 'amulet', 'crystal'];
const STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'sp_atk', 'sp_def'];

// ── ItemInventory Class ─────────────────────────────────────────────────────

/**
 * Standalone inventory container for managing item stacks,
 * category filtering, and sorting.
 * [P5-015] Used by PlayerData and potentially by shops, NPC traders, and storage.
 */
export class ItemInventory {
    /**
     * @param {number} [capacity=999] - Maximum number of unique item stacks.
     * @param {Function} [getItemDataFn] - Optional callback to look up item data by ID.
     */
    constructor(capacity = 999, getItemDataFn = null) {
        /**
         * Items stored as { itemId (number): count (number) }.
         * Uses a Map to maintain insertion order for sorting.
         * @type {Map<number, number>}
         */
        this.items = new Map();

        /** Maximum total number of unique item stacks. */
        this.maxCapacity = capacity;

        /** Optional item data lookup function. */
        this._getItemDataFn = getItemDataFn || null;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Adds [count] of [itemId] to the inventory.
     * Returns true if the items were successfully added, false if the inventory
     * is at capacity for new stacks or if invalid input is provided.
     *
     * @param {number} itemId
     * @param {number} [count=1]
     * @returns {boolean}
     */
    addItem(itemId, count = 1) {
        if (count <= 0) {
            return false;
        }

        // If item already exists, just increase the count
        if (this.items.has(itemId)) {
            this.items.set(itemId, this.items.get(itemId) + count);
            return true;
        }

        // New item: check capacity
        if (this.items.size >= this.maxCapacity) {
            return false;
        }

        this.items.set(itemId, count);
        return true;
    }

    /**
     * Removes [count] of [itemId] from the inventory.
     * Returns true if the removal was successful, false if the player doesn't
     * have enough of the item.
     *
     * @param {number} itemId
     * @param {number} [count=1]
     * @returns {boolean}
     */
    removeItem(itemId, count = 1) {
        if (count <= 0) {
            return false;
        }

        if (!this.items.has(itemId)) {
            return false;
        }

        const currentCount = this.items.get(itemId);
        if (currentCount < count) {
            return false;
        }

        const newCount = currentCount - count;
        if (newCount <= 0) {
            this.items.delete(itemId);
        } else {
            this.items.set(itemId, newCount);
        }

        return true;
    }

    /**
     * Returns true if the inventory contains at least [count] of [itemId].
     * @param {number} itemId
     * @param {number} [count=1]
     * @returns {boolean}
     */
    hasItem(itemId, count = 1) {
        if (!this.items.has(itemId)) {
            return false;
        }
        return this.items.get(itemId) >= count;
    }

    /**
     * Returns the current count of [itemId] in the inventory, or 0.
     * @param {number} itemId
     * @returns {number}
     */
    getCount(itemId) {
        return this.items.get(itemId) || 0;
    }

    /**
     * Returns all items belonging to the given category.
     * Each entry: { itemId, count, data }
     *
     * @param {string} category
     * @returns {object[]}
     */
    getItemsByCategory(category) {
        const result = [];

        for (const [itemId, count] of this.items) {
            const itemData = this._getItemData(itemId);
            const itemCategory = itemData.category || 'materials';
            if (itemCategory === category) {
                result.push({
                    itemId,
                    count,
                    data: itemData,
                });
            }
        }

        return result;
    }

    /**
     * Returns all items in the inventory.
     * Each entry: { itemId, count, data }
     *
     * @returns {object[]}
     */
    getAllItems() {
        const result = [];

        for (const [itemId, count] of this.items) {
            const itemData = this._getItemData(itemId);
            result.push({
                itemId,
                count,
                data: itemData,
            });
        }

        return result;
    }

    /**
     * Sorts the inventory by the specified criteria.
     * Supported sortBy values: "name", "rarity", "category", "count".
     *
     * @param {string} [sortBy='name']
     */
    sortItems(sortBy = 'name') {
        if (!SORT_MODES.includes(sortBy)) {
            console.warn(`ItemInventory: unsupported sort mode '${sortBy}'`);
            return;
        }

        // Gather all items into a sortable array
        const itemList = this.getAllItems();

        switch (sortBy) {
            case 'name':
                itemList.sort((a, b) => {
                    const nameA = (a.data?.name || '').toLowerCase();
                    const nameB = (b.data?.name || '').toLowerCase();
                    return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
                });
                break;
            case 'rarity':
                itemList.sort((a, b) => {
                    const rarityA = ItemInventory._rarityToInt(a.data?.rarity || 'common');
                    const rarityB = ItemInventory._rarityToInt(b.data?.rarity || 'common');
                    return rarityB - rarityA; // Higher rarity first
                });
                break;
            case 'category':
                itemList.sort((a, b) => {
                    const catA = (a.data?.category || 'materials').toLowerCase();
                    const catB = (b.data?.category || 'materials').toLowerCase();
                    return catA < catB ? -1 : catA > catB ? 1 : 0;
                });
                break;
            case 'count':
                itemList.sort((a, b) => b.count - a.count); // Highest count first
                break;
        }

        // Rebuild the items Map in sorted order
        const newItems = new Map();
        for (const entry of itemList) {
            newItems.set(entry.itemId, entry.count);
        }
        this.items = newItems;
    }

    // ── Capacity Queries ────────────────────────────────────────────────────

    /**
     * Returns the number of unique item stacks in the inventory.
     * @returns {number}
     */
    getUniqueItemCount() {
        return this.items.size;
    }

    /**
     * Returns true if the inventory cannot accept new unique item stacks.
     * @returns {boolean}
     */
    isFull() {
        return this.items.size >= this.maxCapacity;
    }

    /**
     * Returns the total number of individual items across all stacks.
     * @returns {number}
     */
    getTotalItemCount() {
        let total = 0;
        for (const count of this.items.values()) {
            total += count;
        }
        return total;
    }

    /**
     * Clears the entire inventory.
     */
    clear() {
        this.items.clear();
    }

    // ── Serialization ───────────────────────────────────────────────────────

    /**
     * Serializes the inventory to an object for save/load.
     * @returns {object}
     */
    toDict() {
        const data = {};
        for (const [itemId, count] of this.items) {
            data[String(itemId)] = count;
        }
        return data;
    }

    /**
     * Restores the inventory from a saved object.
     * @param {object} data
     */
    fromDict(data) {
        this.items.clear();
        for (const key of Object.keys(data)) {
            const itemId = parseInt(key, 10);
            if (!isNaN(itemId)) {
                this.items.set(itemId, parseInt(data[key], 10) || 0);
            }
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Retrieves the item data for the given itemId.
     * Returns an object with at minimum { name, category, rarity, description, price }.
     *
     * @param {number} itemId
     * @returns {object}
     */
    _getItemData(itemId) {
        if (typeof this._getItemDataFn === 'function') {
            const data = this._getItemDataFn(itemId);
            if (data) return data;
        }

        // Placeholder: production code would look up from a global item database
        return {
            itemId,
            name: `Item #${itemId}`,
            category: 'materials',
            rarity: 'common',
            description: '',
            price: 10,
        };
    }

    /**
     * Converts a rarity string to a sortable integer value.
     * @param {string} rarity
     * @returns {number}
     */
    static _rarityToInt(rarity) {
        switch (rarity) {
            case 'common':    return 0;
            case 'uncommon':  return 1;
            case 'rare':      return 2;
            case 'legendary': return 3;
            default:          return 0;
        }
    }
}

// ── EquipmentInventorySystem Class ──────────────────────────────────────────

/**
 * Manages equipping, unequipping, and comparing gear.
 * [Progression] Handles the full lifecycle of equipment on Sprites: validation
 * of slot and level requirements, stat change calculation, inventory transfer,
 * and side-by-side equipment comparison with synergy awareness.
 */
export class EquipmentInventorySystem {
    constructor() {
        // Stateless system — all data comes from parameters
    }

    // ── Core Operations ─────────────────────────────────────────────────────

    /**
     * Equip an item onto a Sprite. Validates requirements, unequips any existing
     * item in that slot (returning it to the player's equipment inventory), and
     * applies the new equipment.
     *
     * @param {object} sprite      - The sprite instance { level, equipment: {}, ... }
     * @param {object} equipment   - The equipment data { equipmentId, slotType, levelRequirement, statBonuses, ... }
     * @param {object} playerData  - The player data { equipmentInventory: [], ... }
     * @returns {{ success: boolean, oldItem: object|null, statChanges: object, error: string }}
     */
    equipItem(sprite, equipment, playerData) {
        const result = {
            success: false,
            oldItem: null,
            statChanges: {},
            error: '',
        };

        // ── Validation ──────────────────────────────────────────────────
        if (!sprite) {
            result.error = 'Invalid sprite.';
            return result;
        }

        if (!equipment) {
            result.error = 'Invalid equipment.';
            return result;
        }

        if (!playerData) {
            result.error = 'Invalid player data.';
            return result;
        }

        // Check level requirement
        const levelReq = equipment.levelRequirement ?? equipment.level_requirement ?? 0;
        if (sprite.level < levelReq) {
            result.error = `Sprite level ${sprite.level} is below the level ${levelReq} requirement.`;
            return result;
        }

        // Validate slot type
        const slot = equipment.slotType ?? equipment.slot_type ?? '';
        if (!EQUIPMENT_SLOTS.includes(slot)) {
            result.error = `Invalid equipment slot: ${slot}.`;
            return result;
        }

        // ── Snapshot stats before change ────────────────────────────────
        const spriteElements = this._getSpriteElements(sprite, playerData);
        const spriteClass = this._getSpriteClass(sprite, playerData);

        const oldEquipList = this._resolveEquipmentList(sprite, playerData);
        const statsBefore = this._calculateStatBonuses(oldEquipList, spriteElements, spriteClass);

        // ── Handle previously equipped item ─────────────────────────────
        const spriteEquipment = sprite.equipment || {};
        const oldEquipmentId = parseInt(spriteEquipment[slot] ?? -1, 10);
        let oldItem = null;

        if (oldEquipmentId >= 0) {
            oldItem = this._findEquipmentById(oldEquipmentId, playerData, oldEquipList);
            if (oldItem) {
                // Return old item to player inventory
                if (!playerData.equipmentInventory) {
                    playerData.equipmentInventory = [];
                }
                playerData.equipmentInventory.push(oldItem);
            }
            result.oldItem = oldItem;
        }

        // ── Equip the new item ──────────────────────────────────────────
        if (!sprite.equipment) {
            sprite.equipment = {};
        }
        sprite.equipment[slot] = equipment.equipmentId ?? equipment.equipment_id;

        // ── Calculate stat changes (before removing from inventory) ─────
        const newEquipList = this._resolveEquipmentList(sprite, playerData);
        const statsAfter = this._calculateStatBonuses(newEquipList, spriteElements, spriteClass);

        // Remove the new item from the player's equipment inventory
        if (playerData.equipmentInventory) {
            const eqId = equipment.equipmentId ?? equipment.equipment_id;
            const removeIdx = playerData.equipmentInventory.findIndex(
                (e) => (e.equipmentId ?? e.equipment_id) === eqId
            );
            if (removeIdx >= 0) {
                playerData.equipmentInventory.splice(removeIdx, 1);
            }
        }

        const statChanges = {};
        for (const key of STAT_KEYS) {
            const before = statsBefore[key] || 0;
            const after = statsAfter[key] || 0;
            statChanges[key] = {
                before,
                after,
                diff: after - before,
            };
        }

        result.statChanges = statChanges;
        result.success = true;
        return result;
    }

    /**
     * Unequip an item from a specific slot on a Sprite, returning it to the
     * player's equipment inventory.
     *
     * @param {object} sprite    - The sprite instance
     * @param {string} slotType  - Equipment slot name
     * @param {object} playerData
     * @returns {{ success: boolean, removedItem: object|null, statChanges: object, error: string }}
     */
    unequipItem(sprite, slotType, playerData) {
        const result = {
            success: false,
            removedItem: null,
            statChanges: {},
            error: '',
        };

        if (!sprite) {
            result.error = 'Invalid sprite.';
            return result;
        }

        if (!playerData) {
            result.error = 'Invalid player data.';
            return result;
        }

        if (!EQUIPMENT_SLOTS.includes(slotType)) {
            result.error = `Invalid equipment slot: ${slotType}.`;
            return result;
        }

        const spriteEquipment = sprite.equipment || {};
        const equippedId = parseInt(spriteEquipment[slotType] ?? -1, 10);
        if (equippedId < 0) {
            result.error = `No equipment in slot '${slotType}'.`;
            return result;
        }

        // Snapshot stats before
        const spriteElements = this._getSpriteElements(sprite, playerData);
        const spriteClass = this._getSpriteClass(sprite, playerData);
        const oldEquipList = this._resolveEquipmentList(sprite, playerData);
        const statsBefore = this._calculateStatBonuses(oldEquipList, spriteElements, spriteClass);

        // Find the equipment data and return it to inventory
        const removedItem = this._findEquipmentById(equippedId, playerData, oldEquipList);
        if (removedItem) {
            if (!playerData.equipmentInventory) {
                playerData.equipmentInventory = [];
            }
            playerData.equipmentInventory.push(removedItem);
            result.removedItem = removedItem;
        }

        // Clear the slot
        if (sprite.equipment) {
            delete sprite.equipment[slotType];
        }

        // Calculate new stats
        const newEquipList = this._resolveEquipmentList(sprite, playerData);
        const statsAfter = this._calculateStatBonuses(newEquipList, spriteElements, spriteClass);

        const statChanges = {};
        for (const key of STAT_KEYS) {
            const before = statsBefore[key] || 0;
            const after = statsAfter[key] || 0;
            statChanges[key] = {
                before,
                after,
                diff: after - before,
            };
        }

        result.statChanges = statChanges;
        result.success = true;
        return result;
    }

    /**
     * Get all equipment from the player's inventory that can be equipped in
     * a specific slot on a specific Sprite.
     *
     * @param {object} sprite
     * @param {string} slotType
     * @param {object} playerData
     * @returns {object[]} Array of equipment data matching slot and level requirements.
     */
    getEquippableItems(sprite, slotType, playerData) {
        const equippable = [];

        if (!sprite || !playerData) {
            return equippable;
        }

        if (!EQUIPMENT_SLOTS.includes(slotType)) {
            return equippable;
        }

        const inventory = playerData.equipmentInventory || [];
        for (const item of inventory) {
            const itemSlot = item.slotType ?? item.slot_type ?? '';
            if (itemSlot !== slotType) {
                continue;
            }
            const levelReq = item.levelRequirement ?? item.level_requirement ?? 0;
            if (sprite.level < levelReq) {
                continue;
            }
            equippable.push(item);
        }

        // Sort by total stat bonus descending for better UX
        equippable.sort((a, b) => this._totalStatValue(b) - this._totalStatValue(a));

        return equippable;
    }

    /**
     * Compare two equipment pieces, showing stat differences with synergy applied.
     *
     * @param {object|null} current       - Currently equipped equipment data (null if empty)
     * @param {object}      candidate     - Equipment data being considered
     * @param {string[]}    spriteElements - The Sprite's element types
     * @param {string}      spriteClass   - The Sprite's class type
     * @returns {{ statDiffs: object, currentSynergy: boolean, candidateSynergy: boolean, isUpgrade: boolean, totalDiff: number }}
     */
    compareEquipment(current, candidate, spriteElements = [], spriteClass = '') {
        const result = {
            statDiffs: {},
            currentSynergy: false,
            candidateSynergy: false,
            isUpgrade: false,
            totalDiff: 0,
        };

        // Get effective stat bonuses for current equipment
        let currentBonuses = {};
        if (current) {
            currentBonuses = this._getEffectiveStatBonuses(current, spriteElements, spriteClass);
            result.currentSynergy = this._hasActiveSynergy(current, spriteElements, spriteClass);
        }

        // Get effective stat bonuses for candidate equipment
        let candidateBonuses = {};
        if (candidate) {
            candidateBonuses = this._getEffectiveStatBonuses(candidate, spriteElements, spriteClass);
            result.candidateSynergy = this._hasActiveSynergy(candidate, spriteElements, spriteClass);
        }

        // Calculate per-stat differences
        let totalDiff = 0;
        for (const key of STAT_KEYS) {
            const curVal = currentBonuses[key] || 0;
            const candVal = candidateBonuses[key] || 0;
            const diff = candVal - curVal;
            totalDiff += diff;

            result.statDiffs[key] = {
                current: curVal,
                candidate: candVal,
                diff,
            };
        }

        result.totalDiff = totalDiff;
        result.isUpgrade = totalDiff > 0;

        return result;
    }

    // ── Internal Helpers ────────────────────────────────────────────────────

    /**
     * Resolve the list of equipment data currently equipped on a Sprite.
     * @param {object} sprite
     * @param {object} playerData
     * @returns {object[]}
     */
    _resolveEquipmentList(sprite, playerData) {
        const equipped = [];
        const spriteEquipment = sprite.equipment || {};
        const inventory = playerData.equipmentInventory || [];

        for (const slot of EQUIPMENT_SLOTS) {
            const eid = parseInt(spriteEquipment[slot] ?? -1, 10);
            if (eid < 0) {
                continue;
            }
            // Search in player_data's equipment_inventory
            for (const item of inventory) {
                const itemEid = item.equipmentId ?? item.equipment_id ?? -1;
                if (itemEid === eid) {
                    equipped.push(item);
                    break;
                }
            }
        }
        return equipped;
    }

    /**
     * Calculate total stat bonuses from an equipment list.
     * @param {object[]} equipmentList
     * @param {string[]} spriteElements
     * @param {string} spriteClass
     * @returns {object}
     */
    _calculateStatBonuses(equipmentList, spriteElements, spriteClass) {
        const totals = {};
        for (const key of STAT_KEYS) {
            totals[key] = 0;
        }

        for (const equip of equipmentList) {
            const bonuses = this._getEffectiveStatBonuses(equip, spriteElements, spriteClass);
            for (const key of STAT_KEYS) {
                totals[key] += (bonuses[key] || 0);
            }
        }

        return totals;
    }

    /**
     * Gets effective stat bonuses for an equipment item, including synergy.
     * @param {object} equip
     * @param {string[]} spriteElements
     * @param {string} spriteClass
     * @returns {object}
     */
    _getEffectiveStatBonuses(equip, spriteElements, spriteClass) {
        if (typeof equip.getEffectiveStatBonuses === 'function') {
            return equip.getEffectiveStatBonuses(spriteElements, spriteClass);
        }
        // Fallback: use raw stat bonuses
        const bonuses = equip.statBonuses ?? equip.stat_bonuses ?? {};
        const result = {};
        for (const key of STAT_KEYS) {
            result[key] = bonuses[key] || 0;
        }
        return result;
    }

    /**
     * Check if an equipment piece has active element or class synergy.
     * @param {object} equip
     * @param {string[]} spriteElements
     * @param {string} spriteClass
     * @returns {boolean}
     */
    _hasActiveSynergy(equip, spriteElements, spriteClass) {
        const elementSynergy = equip.elementSynergy ?? equip.element_synergy ?? '';
        if (elementSynergy && spriteElements.includes(elementSynergy)) {
            return true;
        }
        const classSynergy = equip.classSynergy ?? equip.class_synergy ?? '';
        if (classSynergy && classSynergy === spriteClass) {
            return true;
        }
        return false;
    }

    /**
     * Get total raw stat value of an equipment piece (for sorting).
     * @param {object} equip
     * @returns {number}
     */
    _totalStatValue(equip) {
        const bonuses = equip.statBonuses ?? equip.stat_bonuses ?? {};
        let total = 0;
        for (const key of STAT_KEYS) {
            total += Math.abs(bonuses[key] || 0);
        }
        return total;
    }

    /**
     * Attempt to determine a Sprite's element types from race data.
     * @param {object} sprite
     * @param {object} _playerData
     * @returns {string[]}
     */
    _getSpriteElements(sprite, _playerData) {
        // In the full game, this would look up SpriteRaceData via a database.
        return sprite.elements || [];
    }

    /**
     * Attempt to determine a Sprite's class type from race data.
     * @param {object} sprite
     * @param {object} _playerData
     * @returns {string}
     */
    _getSpriteClass(sprite, _playerData) {
        // Same as above -- would look up from SpriteRaceData in full integration.
        return sprite.spriteClass || sprite.sprite_class || '';
    }

    /**
     * Find an equipment item by ID from either the player inventory or equipped list.
     * @param {number} equipmentId
     * @param {object} playerData
     * @param {object[]} equippedList
     * @returns {object|null}
     */
    _findEquipmentById(equipmentId, playerData, equippedList) {
        // Check the equipped list first
        for (const item of equippedList) {
            const eid = item.equipmentId ?? item.equipment_id ?? -1;
            if (eid === equipmentId) {
                return item;
            }
        }

        // Check the player's unequipped inventory
        const inventory = playerData.equipmentInventory || [];
        for (const item of inventory) {
            const eid = item.equipmentId ?? item.equipment_id ?? -1;
            if (eid === equipmentId) {
                return item;
            }
        }

        return null;
    }
}

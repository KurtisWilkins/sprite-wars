/**
 * StorageSystem — Manages the Sprite storage box system (PC equivalent).
 * [Progression] Handles depositing and withdrawing Sprites between the active
 * team and long-term storage, with sorting, filtering, and search capabilities.
 *
 * Ported from Game/Scripts/World/PCStorageSystem.gd
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// ── Constants ───────────────────────────────────────────────────────────────

/** Maximum number of Sprites that can be held in storage. */
const MAX_STORAGE = 500;

/** Minimum team size -- the player must always have at least one Sprite on team. */
const MIN_TEAM_SIZE = 1;

/** Maximum team size. */
const MAX_TEAM_SIZE = 14;

/** Valid sort keys for getSortedStorage(). */
const VALID_SORT_KEYS = ['level', 'raceId', 'formId', 'instanceId', 'name'];

// ── StorageSystem Class ─────────────────────────────────────────────────────

export class StorageSystem {
    /**
     * @param {object} [config]
     * @param {number} [config.maxStorage]  - Override max storage capacity.
     * @param {number} [config.minTeamSize] - Override minimum team size.
     * @param {number} [config.maxTeamSize] - Override maximum team size.
     */
    constructor(config = {}) {
        this.maxStorage = config.maxStorage ?? MAX_STORAGE;
        this.minTeamSize = config.minTeamSize ?? MIN_TEAM_SIZE;
        this.maxTeamSize = config.maxTeamSize ?? MAX_TEAM_SIZE;
    }

    // ── Core Operations ─────────────────────────────────────────────────────

    /**
     * Deposit a Sprite from the team into storage.
     * The player must retain at least minTeamSize Sprites on the team.
     *
     * @param {object} sprite      - The sprite instance to deposit (must have instanceId).
     * @param {object} playerData  - The player data { team: [], storage: [] }.
     * @returns {boolean} true if the deposit succeeded.
     */
    deposit(sprite, playerData) {
        if (!sprite) {
            console.warn('StorageSystem.deposit: invalid sprite.');
            return false;
        }

        if (!playerData) {
            console.warn('StorageSystem.deposit: invalid playerData.');
            return false;
        }

        const team = playerData.team || [];
        const storage = playerData.storage || [];

        // Check storage capacity
        if (storage.length >= this.maxStorage) {
            console.warn(
                `StorageSystem.deposit: storage is full (${storage.length}/${this.maxStorage}).`
            );
            return false;
        }

        // Ensure team retains minimum size
        if (team.length <= this.minTeamSize) {
            console.warn('StorageSystem.deposit: cannot deposit -- team would be empty.');
            return false;
        }

        // Find and remove from team
        const spriteInstanceId = sprite.instanceId ?? sprite.instance_id;
        const foundIndex = team.findIndex(
            (s) => s && (s.instanceId ?? s.instance_id) === spriteInstanceId
        );

        if (foundIndex < 0) {
            console.warn('StorageSystem.deposit: sprite not found in team.');
            return false;
        }

        const removed = team.splice(foundIndex, 1)[0];
        storage.push(removed);

        // Ensure playerData references are updated
        playerData.team = team;
        playerData.storage = storage;

        eventBus.emit(GameEvents.TEAM_CHANGED, playerData.team);
        return true;
    }

    /**
     * Withdraw a Sprite from storage into the active team.
     * The team must have room (under maxTeamSize).
     *
     * @param {object} sprite      - The sprite instance to withdraw.
     * @param {object} playerData  - The player data { team: [], storage: [] }.
     * @returns {boolean} true if the withdrawal succeeded.
     */
    withdraw(sprite, playerData) {
        if (!sprite) {
            console.warn('StorageSystem.withdraw: invalid sprite.');
            return false;
        }

        if (!playerData) {
            console.warn('StorageSystem.withdraw: invalid playerData.');
            return false;
        }

        const team = playerData.team || [];
        const storage = playerData.storage || [];

        // Check team capacity
        if (team.length >= this.maxTeamSize) {
            console.warn(
                `StorageSystem.withdraw: team is full (${team.length}/${this.maxTeamSize}).`
            );
            return false;
        }

        // Find and remove from storage
        const spriteInstanceId = sprite.instanceId ?? sprite.instance_id;
        const foundIndex = storage.findIndex(
            (s) => s && (s.instanceId ?? s.instance_id) === spriteInstanceId
        );

        if (foundIndex < 0) {
            console.warn('StorageSystem.withdraw: sprite not found in storage.');
            return false;
        }

        const removed = storage.splice(foundIndex, 1)[0];
        team.push(removed);

        playerData.team = team;
        playerData.storage = storage;

        eventBus.emit(GameEvents.TEAM_CHANGED, playerData.team);
        return true;
    }

    // ── Sorting & Filtering ─────────────────────────────────────────────────

    /**
     * Get a sorted and filtered view of the player's storage.
     *
     * @param {object} playerData - The player data { storage: [] }.
     * @param {string} [sortBy='level'] - Sort key.
     * @param {object} [filters={}]     - Filter criteria:
     *   { minLevel, maxLevel, raceId, element, rarity }
     * @param {boolean} [ascending=true]
     * @returns {object[]} Filtered and sorted array of sprite instances.
     */
    getSortedStorage(playerData, sortBy = 'level', filters = {}, ascending = true) {
        if (!playerData) {
            return [];
        }

        const storage = playerData.storage || [];

        // Apply filters
        const filtered = this._applyFilters(storage, filters);

        // Normalize sort key
        const sortKey = VALID_SORT_KEYS.includes(sortBy) ? sortBy : 'level';

        // Sort
        filtered.sort((a, b) => {
            const valA = this._getSortValue(a, sortKey);
            const valB = this._getSortValue(b, sortKey);

            if (typeof valA === 'string' && typeof valB === 'string') {
                return ascending
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }

            return ascending ? valA - valB : valB - valA;
        });

        return filtered;
    }

    /**
     * Search storage by query string, matching against nickname, raceId, and formId.
     *
     * @param {object} playerData - The player data { storage: [] }.
     * @param {string} query      - Search string (case-insensitive).
     * @returns {object[]} Matching sprite instances.
     */
    searchStorage(playerData, query) {
        if (!playerData) {
            return [];
        }

        const storage = playerData.storage || [];

        if (!query || query.trim().length === 0) {
            return [...storage];
        }

        const searchLower = query.trim().toLowerCase();
        const searchInt = parseInt(searchLower, 10);
        const isNumeric = !isNaN(searchInt) && searchInt > 0;

        const results = [];

        for (const sprite of storage) {
            if (!sprite) continue;

            // Match nickname
            const nickname = sprite.nickname || '';
            if (nickname && nickname.toLowerCase().includes(searchLower)) {
                results.push(sprite);
                continue;
            }

            // Match numeric ID (raceId or formId)
            if (isNumeric) {
                const raceId = sprite.raceId ?? sprite.race_id ?? 0;
                const formId = sprite.formId ?? sprite.form_id ?? 0;
                if (raceId === searchInt || formId === searchInt) {
                    results.push(sprite);
                    continue;
                }

                // Match level as a number
                if (sprite.level === searchInt) {
                    results.push(sprite);
                    continue;
                }
            }
        }

        return results;
    }

    // ── Capacity Queries ────────────────────────────────────────────────────

    /**
     * Get the current storage usage.
     * @param {object} playerData
     * @returns {number}
     */
    getStorageCount(playerData) {
        if (!playerData) return 0;
        return (playerData.storage || []).length;
    }

    /**
     * Get the number of free storage slots.
     * @param {object} playerData
     * @returns {number}
     */
    getFreeSlots(playerData) {
        return this.maxStorage - this.getStorageCount(playerData);
    }

    /**
     * Whether storage is at maximum capacity.
     * @param {object} playerData
     * @returns {boolean}
     */
    isStorageFull(playerData) {
        return this.getStorageCount(playerData) >= this.maxStorage;
    }

    /**
     * Whether the team can accept another Sprite (for withdraw validation).
     * @param {object} playerData
     * @returns {boolean}
     */
    canWithdraw(playerData) {
        if (!playerData) return false;
        return (playerData.team || []).length < this.maxTeamSize;
    }

    /**
     * Whether the team can deposit a Sprite (not at minimum size).
     * @param {object} playerData
     * @returns {boolean}
     */
    canDeposit(playerData) {
        if (!playerData) return false;
        return (playerData.team || []).length > this.minTeamSize && !this.isStorageFull(playerData);
    }

    // ── Batch Operations ────────────────────────────────────────────────────

    /**
     * Swap a Sprite from the team with one from storage in a single operation.
     *
     * @param {object} teamSprite    - Sprite to move from team to storage.
     * @param {object} storageSprite - Sprite to move from storage to team.
     * @param {object} playerData    - The player data.
     * @returns {boolean} true if the swap succeeded.
     */
    swap(teamSprite, storageSprite, playerData) {
        if (!teamSprite || !storageSprite) {
            return false;
        }
        if (!playerData) {
            return false;
        }

        const team = playerData.team || [];
        const storage = playerData.storage || [];

        // Find both Sprites
        const teamInstanceId = teamSprite.instanceId ?? teamSprite.instance_id;
        const storageInstanceId = storageSprite.instanceId ?? storageSprite.instance_id;

        const teamIdx = team.findIndex(
            (s) => s && (s.instanceId ?? s.instance_id) === teamInstanceId
        );
        const storageIdx = storage.findIndex(
            (s) => s && (s.instanceId ?? s.instance_id) === storageInstanceId
        );

        if (teamIdx < 0 || storageIdx < 0) {
            return false;
        }

        // Perform the swap atomically
        const tempTeam = team[teamIdx];
        const tempStorage = storage[storageIdx];
        team[teamIdx] = tempStorage;
        storage[storageIdx] = tempTeam;

        playerData.team = team;
        playerData.storage = storage;

        eventBus.emit(GameEvents.TEAM_CHANGED, playerData.team);
        return true;
    }

    // ── Internal Helpers ────────────────────────────────────────────────────

    /**
     * Apply filters to an array of sprite instances.
     *
     * @param {object[]} sprites
     * @param {object} filters
     * @returns {object[]}
     */
    _applyFilters(sprites, filters) {
        if (!filters || Object.keys(filters).length === 0) {
            return [...sprites];
        }

        const minLevel = filters.minLevel ?? filters.min_level ?? 0;
        const maxLevel = filters.maxLevel ?? filters.max_level ?? 100;
        const filterRaceId = filters.raceId ?? filters.race_id ?? -1;
        // Element and rarity filters are reserved for when race_data lookup is available

        const result = [];
        for (const sprite of sprites) {
            if (!sprite) continue;

            // Level range filter
            const level = sprite.level ?? 0;
            if (level < minLevel || level > maxLevel) {
                continue;
            }

            // Race filter
            const raceId = sprite.raceId ?? sprite.race_id ?? 0;
            if (filterRaceId > 0 && raceId !== filterRaceId) {
                continue;
            }

            result.push(sprite);
        }

        return result;
    }

    /**
     * Get the sortable value for a Sprite by key.
     *
     * @param {object} sprite
     * @param {string} sortKey
     * @returns {number|string}
     */
    _getSortValue(sprite, sortKey) {
        switch (sortKey) {
            case 'level':
                return sprite.level ?? 0;
            case 'raceId':
                return sprite.raceId ?? sprite.race_id ?? 0;
            case 'formId':
                return sprite.formId ?? sprite.form_id ?? 0;
            case 'instanceId':
                return sprite.instanceId ?? sprite.instance_id ?? 0;
            case 'name': {
                const nickname = sprite.nickname || '';
                if (nickname) {
                    return nickname.toLowerCase();
                }
                // Unnamed Sprites sort last
                return `zzzz_${sprite.raceId ?? sprite.race_id ?? 0}`;
            }
            default:
                return sprite.level ?? 0;
        }
    }

    /**
     * Find a sprite instance in an array by instanceId. Returns -1 if not found.
     *
     * @param {object[]} arr
     * @param {object} sprite
     * @returns {number}
     */
    _findInArray(arr, sprite) {
        if (!sprite) return -1;
        const targetId = sprite.instanceId ?? sprite.instance_id;
        for (let i = 0; i < arr.length; i++) {
            const s = arr[i];
            if (s && (s.instanceId ?? s.instance_id) === targetId) {
                return i;
            }
        }
        return -1;
    }
}

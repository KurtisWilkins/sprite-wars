/**
 * SaveManager - Offline-first save system using localStorage
 * Ported from Game/Autoloads/SaveManager.gd
 *
 * Features: multiple save slots, auto-save timer, checksum validation,
 * backup/restore, schema migration, cloud sync queue, JSON export/import.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// -- Constants -------------------------------------------------------------------

const MAX_SLOTS = 3;
const SAVE_KEY_PREFIX = 'sw_save_';
const CHECKSUM_KEY_SUFFIX = '_checksum';
const BACKUP_KEY_SUFFIX = '_backup';
const SCHEMA_VERSION = 1;
const AUTO_SAVE_INTERVAL_MS = 300_000; // 5 minutes

// -- SaveManager -----------------------------------------------------------------

export class SaveManager {
    /**
     * @param {Object} [deps] - Optional dependency injection
     * @param {Object} [deps.gameManager] - Reference to GameManager instance
     * @param {Object} [deps.authManager] - Reference to AuthManager instance
     */
    constructor(deps = {}) {
        /** @type {Object|null} */
        this._gameManager = deps.gameManager || null;

        /** @type {Object|null} */
        this._authManager = deps.authManager || null;

        /** Auto-save interval in milliseconds */
        this.autoSaveIntervalMs = AUTO_SAVE_INTERVAL_MS;

        /** The slot used for auto-save (defaults to last manually-saved slot) */
        this.autoSaveSlot = 0;

        /** @private */
        this._autoSaveTimerId = null;

        /** @private */
        this._isSaving = false;

        /** @private */
        this._lastSaveSlot = -1;

        /** @type {Array<Object>} Cloud sync queue for future backend integration */
        this.cloudSyncQueue = [];

        /** @type {boolean} Whether cloud sync is available */
        this.isCloudAvailable = false;

        console.log('[SaveManager] Created.');
    }

    // -- Initialization ----------------------------------------------------------

    /**
     * Initialize the save manager and start auto-save timer.
     */
    init() {
        // Wire up EventBus
        eventBus.on(GameEvents.GAME_SAVED, () => {
            this._onSaveRequested();
        });

        this._startAutoSave();
        console.log('[SaveManager] Initialized.');
    }

    /**
     * Set the game manager reference (for auto-save access to player data).
     * @param {Object} gameManager
     */
    setGameManager(gameManager) {
        this._gameManager = gameManager;
    }

    /**
     * Set the auth manager reference (for user-scoped save keys).
     * @param {Object} authManager
     */
    setAuthManager(authManager) {
        this._authManager = authManager;
    }

    /**
     * Shut down the save manager, stopping timers.
     */
    destroy() {
        this._stopAutoSave();
    }

    // -- Public API: Save --------------------------------------------------------

    /**
     * Save player data to the given slot.
     * @param {number} slot - Slot index (0 to MAX_SLOTS - 1)
     * @param {Object} playerData - The player data object to serialize
     * @returns {boolean} True on success
     */
    saveData(slot, playerData) {
        if (!this._isValidSlot(slot)) {
            console.error('[SaveManager] Invalid save slot:', slot);
            return false;
        }

        if (this._isSaving) {
            console.warn('[SaveManager] Save already in progress, skipping.');
            return false;
        }

        this._isSaving = true;

        try {
            // Step 1: Serialize player data
            const serialized = this._serializePlayerData(playerData);
            if (!serialized || Object.keys(serialized).length === 0) {
                console.error('[SaveManager] Serialization produced empty data.');
                this._isSaving = false;
                return false;
            }

            // Step 2: Validate schema
            const validation = this._validateSchema(serialized);
            if (!validation.valid) {
                console.error('[SaveManager] Serialized data failed validation:');
                for (const err of validation.errors) {
                    console.error('  -', err);
                }
                this._isSaving = false;
                return false;
            }

            // Step 3: Detect tamper warnings (sanity check on own output)
            const tamperWarnings = this._detectTampering(serialized);
            if (tamperWarnings.length > 0) {
                console.warn('[SaveManager] Tamper detection flagged serialized data:');
                for (const w of tamperWarnings) console.warn('  -', w);
            }

            // Step 4: Generate and embed integrity hash
            serialized._integrityHash = this._generateIntegrityHash(serialized);

            // Step 5: Write to localStorage
            const writeSuccess = this._writeLocal(slot, serialized);
            if (!writeSuccess) {
                console.error('[SaveManager] Failed to write save for slot', slot);
                this._isSaving = false;
                return false;
            }

            // Step 6: Generate and write checksum
            const checksum = this._generateChecksum(serialized);
            this._writeChecksum(slot, checksum);

            // Step 7: Queue cloud sync
            if (this.isCloudAvailable) {
                this._queueCloudSync(slot, serialized);
            }

            this._lastSaveSlot = slot;
            this.autoSaveSlot = slot;
            this._isSaving = false;

            console.log('[SaveManager] Save completed for slot %d.', slot);
            eventBus.emit(GameEvents.GAME_SAVED, { success: true, slot });
            return true;

        } catch (e) {
            console.error('[SaveManager] Save error:', e);
            this._isSaving = false;
            return false;
        }
    }

    // -- Public API: Load --------------------------------------------------------

    /**
     * Load player data from the given slot.
     * @param {number} slot - Slot index
     * @returns {Object|null} The deserialized player data, or null on failure
     */
    loadSave(slot) {
        if (!this._isValidSlot(slot)) {
            console.error('[SaveManager] Invalid save slot:', slot);
            return null;
        }

        // Step 1: Read from localStorage
        let data = this._readLocal(slot);
        if (!data) {
            console.warn('[SaveManager] No save data found for slot', slot);
            return null;
        }

        // Step 2: Validate checksum
        const storedChecksum = this._readChecksum(slot);
        if (storedChecksum) {
            if (!this._validateChecksum(data, storedChecksum)) {
                console.error('[SaveManager] Checksum mismatch for slot %d! Save may be corrupted.', slot);
                const backupData = this._readBackup(slot);
                if (backupData) {
                    console.warn('[SaveManager] Loading backup for slot', slot);
                    data = backupData;
                } else {
                    console.error('[SaveManager] No backup available. Proceeding with potentially corrupted data.');
                }
            }
        }

        // Step 3: Verify integrity hash
        const storedHash = data._integrityHash || '';
        if (storedHash) {
            if (!this._verifyIntegrity(data, storedHash)) {
                console.error('[SaveManager] Integrity hash mismatch for slot %d! Save may be tampered.', slot);
                const tamperFlags = this._detectTampering(data);
                for (const flag of tamperFlags) {
                    console.error('[SaveManager] Tamper:', flag);
                }
            }
        }

        // Step 4: Validate schema
        const validation = this._validateSchema(data);
        if (!validation.valid) {
            console.warn('[SaveManager] Save data for slot %d has validation errors:', slot);
            for (const err of validation.errors) console.warn('  -', err);
        }

        // Step 5: Migrate if old version
        const saveVersion = parseInt(data.schema_version || '1', 10);
        if (saveVersion < SCHEMA_VERSION) {
            console.log('[SaveManager] Migrating save from v%d to v%d.', saveVersion, SCHEMA_VERSION);
            data = this._migrateSave(data, saveVersion);
        }

        // Step 6: Deserialize to player data object
        const playerData = this._deserializePlayerData(data);
        if (!playerData) {
            console.error('[SaveManager] Deserialization failed for slot', slot);
            return null;
        }

        this._lastSaveSlot = slot;
        this.autoSaveSlot = slot;
        console.log('[SaveManager] Load completed for slot %d.', slot);
        return playerData;
    }

    // -- Public API: Delete ------------------------------------------------------

    /**
     * Delete a save slot.
     * @param {number} slot
     * @returns {boolean}
     */
    deleteSave(slot) {
        if (!this._isValidSlot(slot)) {
            console.error('[SaveManager] Invalid save slot:', slot);
            return false;
        }

        let deletedAny = false;
        const keys = [
            this._getSaveKey(slot),
            this._getChecksumKey(slot),
            this._getBackupKey(slot),
        ];

        for (const key of keys) {
            try {
                if (localStorage.getItem(key) !== null) {
                    localStorage.removeItem(key);
                    deletedAny = true;
                }
            } catch (e) {
                console.error('[SaveManager] Failed to delete:', key, e);
            }
        }

        if (deletedAny) {
            console.log('[SaveManager] Deleted save slot %d.', slot);
        }
        return deletedAny;
    }

    // -- Public API: Save Info ---------------------------------------------------

    /**
     * Get metadata about a specific save slot without fully loading it.
     * @param {number} slot
     * @returns {Object}
     */
    getSaveInfo(slot) {
        const info = {
            slot,
            exists: false,
            timestamp: 0,
            playtime: 0,
            playerName: '',
            teamPreview: [],
            progressPct: 0,
        };

        if (!this._isValidSlot(slot)) return info;

        const data = this._readLocal(slot);
        if (!data) return info;

        info.exists = true;
        info.timestamp = parseFloat(data.save_timestamp || 0);
        info.playtime = parseFloat(data.play_time_seconds || 0);
        info.playerName = String(data.player_name || '');

        // Team preview
        const team = data.team || [];
        info.teamPreview = team.slice(0, 10).map(sprite => ({
            formId: parseInt(sprite.form_id || 0, 10),
            level: parseInt(sprite.level || 1, 10),
            nickname: String(sprite.nickname || ''),
        }));

        // Progress percentage
        info.progressPct = this._calculateProgress(data);

        return info;
    }

    /**
     * Get info for all save slots.
     * @returns {Array<Object>}
     */
    getAllSaveInfo() {
        const allInfo = [];
        for (let slot = 0; slot < MAX_SLOTS; slot++) {
            allInfo.push(this.getSaveInfo(slot));
        }
        return allInfo;
    }

    // -- Public API: Export / Import (JSON) ---------------------------------------

    /**
     * Export a save slot as a JSON string (for sharing or backup).
     * @param {number} slot
     * @returns {string|null}
     */
    exportSave(slot) {
        const data = this._readLocal(slot);
        if (!data) return null;

        const exportData = {
            _exportVersion: 1,
            _exportedAt: Date.now(),
            _game: 'sprite-wars',
            slot,
            data,
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import save data from a JSON string into a slot.
     * @param {number} slot
     * @param {string} jsonString
     * @returns {{ success: boolean, error?: string }}
     */
    importSave(slot, jsonString) {
        if (!this._isValidSlot(slot)) {
            return { success: false, error: 'Invalid save slot.' };
        }

        try {
            const parsed = JSON.parse(jsonString);

            // Validate export format
            if (!parsed || !parsed.data || parsed._game !== 'sprite-wars') {
                return { success: false, error: 'Invalid save file format.' };
            }

            const data = parsed.data;

            // Validate schema
            const validation = this._validateSchema(data);
            if (!validation.valid) {
                return { success: false, error: 'Save data failed validation: ' + validation.errors.join('; ') };
            }

            // Write to local
            const success = this._writeLocal(slot, data);
            if (!success) {
                return { success: false, error: 'Failed to write save data.' };
            }

            // Regenerate checksum
            const checksum = this._generateChecksum(data);
            this._writeChecksum(slot, checksum);

            console.log('[SaveManager] Imported save to slot %d.', slot);
            return { success: true };

        } catch (e) {
            return { success: false, error: 'Failed to parse JSON: ' + e.message };
        }
    }

    // -- Auto-Save ---------------------------------------------------------------

    /** @private */
    _startAutoSave() {
        this._stopAutoSave();
        if (this.autoSaveIntervalMs > 0) {
            this._autoSaveTimerId = setInterval(() => {
                this._autoSave();
            }, this.autoSaveIntervalMs);
        }
    }

    /** @private */
    _stopAutoSave() {
        if (this._autoSaveTimerId !== null) {
            clearInterval(this._autoSaveTimerId);
            this._autoSaveTimerId = null;
        }
    }

    /** @private */
    _autoSave() {
        if (!this._gameManager) return;
        if (!this._gameManager.playerData) return;
        if (this._gameManager.isInBattle) return; // Don't auto-save during battle

        console.log('[SaveManager] Auto-save triggered for slot %d.', this.autoSaveSlot);
        const success = this.saveData(this.autoSaveSlot, this._gameManager.playerData);
        eventBus.emit(GameEvents.GAME_SAVED, { success, slot: this.autoSaveSlot, auto: true });
    }

    /** @private */
    _onSaveRequested() {
        const slot = this._lastSaveSlot >= 0 ? this._lastSaveSlot : 0;
        if (this._gameManager && this._gameManager.playerData) {
            this.saveData(slot, this._gameManager.playerData);
        }
    }

    // -- Storage Keys (user-scoped) ----------------------------------------------

    /** @private */
    _getUserPrefix() {
        if (this._authManager && this._authManager.isAuthenticated()) {
            const user = this._authManager.getCurrentUser();
            return user ? user.username + '_' : '';
        }
        return '';
    }

    /** @private */
    _getSaveKey(slot) {
        return SAVE_KEY_PREFIX + this._getUserPrefix() + 'slot_' + slot;
    }

    /** @private */
    _getChecksumKey(slot) {
        return this._getSaveKey(slot) + CHECKSUM_KEY_SUFFIX;
    }

    /** @private */
    _getBackupKey(slot) {
        return this._getSaveKey(slot) + BACKUP_KEY_SUFFIX;
    }

    // -- Local Storage I/O -------------------------------------------------------

    /**
     * Write serialized save data as JSON to localStorage.
     * Creates a backup of existing data first.
     * @private
     */
    _writeLocal(slot, data) {
        const key = this._getSaveKey(slot);

        try {
            // Create backup of existing save first
            const existing = localStorage.getItem(key);
            if (existing) {
                const backupKey = this._getBackupKey(slot);
                localStorage.setItem(backupKey, existing);
            }

            // Write the new save
            const jsonString = JSON.stringify(data, null, '\t');
            localStorage.setItem(key, jsonString);
            return true;

        } catch (e) {
            console.error('[SaveManager] Cannot write save data:', e);
            return false;
        }
    }

    /**
     * Read a save from localStorage and parse it.
     * @private
     * @returns {Object|null}
     */
    _readLocal(slot) {
        const key = this._getSaveKey(slot);
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            const parsed = JSON.parse(raw);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                console.error('[SaveManager] Save data root is not an object:', key);
                return null;
            }
            return parsed;

        } catch (e) {
            console.error('[SaveManager] Failed to read/parse save:', key, e);
            return null;
        }
    }

    /**
     * Read backup data for a slot.
     * @private
     * @returns {Object|null}
     */
    _readBackup(slot) {
        const key = this._getBackupKey(slot);
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    // -- Checksum ----------------------------------------------------------------

    /**
     * Generate a simple hash checksum of the serialized data.
     * Uses a FNV-1a-style hash since SubtleCrypto is async.
     * @private
     */
    _generateChecksum(data) {
        const jsonString = JSON.stringify(data);
        let hash = 0x811c9dc5; // FNV offset basis
        for (let i = 0; i < jsonString.length; i++) {
            hash ^= jsonString.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193); // FNV prime
        }
        return (hash >>> 0).toString(16).padStart(8, '0');
    }

    /**
     * Validate a checksum against the save data.
     * @private
     */
    _validateChecksum(data, checksum) {
        const computed = this._generateChecksum(data);
        if (computed.length !== checksum.length) return false;

        // Constant-time comparison
        let result = 0;
        for (let i = 0; i < computed.length; i++) {
            result |= computed.charCodeAt(i) ^ checksum.charCodeAt(i);
        }
        return result === 0;
    }

    /** @private */
    _writeChecksum(slot, checksum) {
        const key = this._getChecksumKey(slot);
        try {
            localStorage.setItem(key, checksum);
        } catch (e) {
            console.warn('[SaveManager] Failed to write checksum:', e);
        }
    }

    /** @private */
    _readChecksum(slot) {
        const key = this._getChecksumKey(slot);
        try {
            return (localStorage.getItem(key) || '').trim();
        } catch (e) {
            return '';
        }
    }

    // -- Integrity Hash ----------------------------------------------------------

    /** @private */
    _generateIntegrityHash(data) {
        // Hash all data except the hash key itself
        const copy = { ...data };
        delete copy._integrityHash;
        return this._generateChecksum(copy);
    }

    /** @private */
    _verifyIntegrity(data, storedHash) {
        const computed = this._generateIntegrityHash(data);
        return computed === storedHash;
    }

    // -- Tamper Detection --------------------------------------------------------

    /** @private */
    _detectTampering(data) {
        const warnings = [];

        // Check for absurd values
        if (data.gold !== undefined && (data.gold < 0 || data.gold > 999_999_999)) {
            warnings.push('Gold value out of expected range: ' + data.gold);
        }

        const team = data.team || [];
        for (let i = 0; i < team.length; i++) {
            const sprite = team[i];
            if (sprite.level !== undefined && (sprite.level < 1 || sprite.level > 100)) {
                warnings.push(`Team sprite ${i} has suspicious level: ${sprite.level}`);
            }
        }

        return warnings;
    }

    // -- Schema Validation -------------------------------------------------------

    /** @private */
    _validateSchema(data) {
        const errors = [];

        if (typeof data !== 'object' || data === null) {
            errors.push('Save data is not an object.');
            return { valid: false, errors };
        }

        // Required fields
        if (data.player_name === undefined) {
            errors.push('Missing required field: player_name');
        }

        // Type checks for optional fields
        if (data.team !== undefined && !Array.isArray(data.team)) {
            errors.push('Field "team" must be an array.');
        }

        if (data.gold !== undefined && typeof data.gold !== 'number') {
            errors.push('Field "gold" must be a number.');
        }

        if (data.completed_temple_ids !== undefined && !Array.isArray(data.completed_temple_ids)) {
            errors.push('Field "completed_temple_ids" must be an array.');
        }

        return { valid: errors.length === 0, errors };
    }

    // -- Schema Migration --------------------------------------------------------

    /** @private */
    _migrateSave(data, fromVersion) {
        let migrated = { ...data };

        // Migrate from v0 to v1: add schema_version and missing fields
        if (fromVersion < 1) {
            if (!migrated.schema_version) migrated.schema_version = 1;
            if (!migrated.completed_temple_ids) migrated.completed_temple_ids = [];
            if (!migrated.completed_quest_ids) migrated.completed_quest_ids = [];
            if (!migrated.sprite_registry) migrated.sprite_registry = {};
            if (migrated.gold === undefined) migrated.gold = 0;
        }

        migrated.schema_version = SCHEMA_VERSION;
        return migrated;
    }

    // -- Serialization / Deserialization -----------------------------------------

    /** @private */
    _serializePlayerData(playerData) {
        if (!playerData) return null;

        const serialized = {
            schema_version: SCHEMA_VERSION,
            save_timestamp: Date.now(),
            player_name: playerData.playerName || playerData.player_name || '',
            play_time_seconds: playerData.playTimeSeconds || playerData.play_time_seconds || 0,
            gold: playerData.gold || 0,
            team: (playerData.team || []).map(sprite => this._serializeSprite(sprite)),
            storage: (playerData.storage || []).map(sprite => this._serializeSprite(sprite)),
            inventory: playerData.inventory || {},
            completed_temple_ids: playerData.completedTempleIds || playerData.completed_temple_ids || [],
            completed_quest_ids: playerData.completedQuestIds || playerData.completed_quest_ids || [],
            sprite_registry: playerData.spriteRegistry || playerData.sprite_registry || {},
            current_area_id: playerData.currentAreaId || playerData.current_area_id || '',
            flags: playerData.flags || {},
        };

        return serialized;
    }

    /** @private */
    _serializeSprite(sprite) {
        if (!sprite) return null;
        return {
            instance_id: sprite.instanceId || sprite.instance_id || 0,
            race_id: sprite.raceId || sprite.race_id || 0,
            form_id: sprite.formId || sprite.form_id || 0,
            nickname: sprite.nickname || '',
            level: sprite.level || 1,
            xp: sprite.xp || 0,
            current_hp: sprite.currentHp || sprite.current_hp || 0,
            max_hp: sprite.maxHp || sprite.max_hp || 0,
            element_types: sprite.elementTypes || sprite.element_types || [],
            abilities: sprite.abilities || [],
            stats: sprite.stats || {},
            equipment: sprite.equipment || {},
        };
    }

    /** @private */
    _deserializePlayerData(data) {
        if (!data) return null;

        return {
            playerName: data.player_name || '',
            playTimeSeconds: parseFloat(data.play_time_seconds || 0),
            gold: parseInt(data.gold || 0, 10),
            team: (data.team || []).filter(Boolean).map(s => this._deserializeSprite(s)),
            storage: (data.storage || []).filter(Boolean).map(s => this._deserializeSprite(s)),
            inventory: data.inventory || {},
            completedTempleIds: data.completed_temple_ids || [],
            completedQuestIds: data.completed_quest_ids || [],
            spriteRegistry: data.sprite_registry || {},
            currentAreaId: data.current_area_id || '',
            flags: data.flags || {},
        };
    }

    /** @private */
    _deserializeSprite(data) {
        if (!data) return null;
        return {
            instanceId: data.instance_id || 0,
            raceId: data.race_id || 0,
            formId: data.form_id || 0,
            nickname: data.nickname || '',
            level: parseInt(data.level || 1, 10),
            xp: parseInt(data.xp || 0, 10),
            currentHp: parseInt(data.current_hp || 0, 10),
            maxHp: parseInt(data.max_hp || 0, 10),
            elementTypes: data.element_types || [],
            abilities: data.abilities || [],
            stats: data.stats || {},
            equipment: data.equipment || {},
        };
    }

    // -- Progress Calculation ----------------------------------------------------

    /** @private */
    _calculateProgress(data) {
        let totalPoints = 0;
        let earnedPoints = 0;

        // Temples: 30 total, each worth 2 points = 60 points
        const completedTemples = data.completed_temple_ids || [];
        totalPoints += 60;
        earnedPoints += Math.min(completedTemples.length, 30) * 2;

        // Sprite registry: 72 forms, each caught = 1 point = 72 points
        const registry = data.sprite_registry || {};
        totalPoints += 72;
        for (const key of Object.keys(registry)) {
            if (registry[key] === 'caught') {
                earnedPoints += 1;
            }
        }

        // Quests completed: estimate 50 total, each 1 point = 50 points
        const completedQuests = data.completed_quest_ids || [];
        totalPoints += 50;
        earnedPoints += Math.min(completedQuests.length, 50);

        if (totalPoints <= 0) return 0;
        return Math.max(0, Math.min(100, (earnedPoints / totalPoints) * 100));
    }

    // -- Cloud Sync Queue --------------------------------------------------------

    /** @private */
    _queueCloudSync(slot, data) {
        this.cloudSyncQueue.push({
            slot,
            data,
            queuedAt: Date.now(),
        });
        console.log('[SaveManager] Queued cloud sync for slot %d (queue size: %d).', slot, this.cloudSyncQueue.length);
    }

    // -- Slot Validation ---------------------------------------------------------

    /** @private */
    _isValidSlot(slot) {
        return Number.isInteger(slot) && slot >= 0 && slot < MAX_SLOTS;
    }

    /** Total number of save slots */
    get maxSlots() {
        return MAX_SLOTS;
    }
}

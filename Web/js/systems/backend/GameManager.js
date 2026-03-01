/**
 * GameManager - Central game state manager and scene coordinator
 * Ported from Game/Autoloads/GameManager.gd
 *
 * Manages player data, game time tracking, area transitions, battle state,
 * and coordinates save/load operations.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// -- Default Player Data ---------------------------------------------------------

function createDefaultPlayerData() {
    return {
        playerName: '',
        playTimeSeconds: 0,
        gold: 100,
        team: [],
        storage: [],
        inventory: {
            101: 5,  // Small Potion x5
            111: 2,  // Antidote x2
            201: 10, // Basic Crystal x10
        },
        equipmentInventory: [
            1001, // Iron Sword
        ],
        completedTempleIds: [],
        completedQuestIds: [],
        spriteRegistry: {},
        currentAreaId: '',
        flags: {},
    };
}

function createStarterSprite() {
    return {
        instanceId: 1,
        raceId: 1,
        formId: 1,
        nickname: '',
        level: 5,
        xp: 0,
        currentHp: 50,
        maxHp: 50,
        elementTypes: ['Fire'],
        abilities: [
            { abilityId: 1, name: 'Ember Shot', element: 'Fire', power: 40, targetingType: 'single' },
            { abilityId: 155, name: 'Tackle', element: 'None', power: 30, targetingType: 'single' },
        ],
        stats: {
            attack: 12,
            defense: 8,
            speed: 10,
            specialAttack: 14,
            specialDefense: 9,
        },
        equipment: {},
    };
}

function _createWaterStarter() {
    return {
        instanceId: 2,
        raceId: 2,
        formId: 4,
        nickname: '',
        level: 5,
        xp: 0,
        currentHp: 55,
        maxHp: 55,
        elementTypes: ['Water'],
        abilities: [
            { abilityId: 12, name: 'Aqua Jet', element: 'Water', power: 40, targetingType: 'single' },
            { abilityId: 155, name: 'Tackle', element: 'None', power: 30, targetingType: 'single' },
        ],
        stats: {
            attack: 9,
            defense: 12,
            speed: 8,
            specialAttack: 11,
            specialDefense: 13,
        },
        equipment: {},
    };
}

function _createNatureStarter() {
    return {
        instanceId: 3,
        raceId: 3,
        formId: 7,
        nickname: '',
        level: 5,
        xp: 0,
        currentHp: 52,
        maxHp: 52,
        elementTypes: ['Nature'],
        abilities: [
            { abilityId: 23, name: 'Vine Whip', element: 'Nature', power: 40, targetingType: 'single' },
            { abilityId: 155, name: 'Tackle', element: 'None', power: 30, targetingType: 'single' },
        ],
        stats: {
            attack: 10,
            defense: 10,
            speed: 9,
            specialAttack: 13,
            specialDefense: 11,
        },
        equipment: {},
    };
}

function _createIceStarter() {
    return {
        instanceId: 4,
        raceId: 4,
        formId: 10,
        nickname: '',
        level: 5,
        xp: 0,
        currentHp: 48,
        maxHp: 48,
        elementTypes: ['Ice'],
        abilities: [
            { abilityId: 34, name: 'Frost Shard', element: 'Ice', power: 40, targetingType: 'single' },
            { abilityId: 155, name: 'Tackle', element: 'None', power: 30, targetingType: 'single' },
        ],
        stats: {
            attack: 13,
            defense: 8,
            speed: 14,
            specialAttack: 12,
            specialDefense: 9,
        },
        equipment: {},
    };
}

function _createAirStarter() {
    return {
        instanceId: 5,
        raceId: 5,
        formId: 13,
        nickname: '',
        level: 5,
        xp: 0,
        currentHp: 45,
        maxHp: 45,
        elementTypes: ['Air'],
        abilities: [
            { abilityId: 45, name: 'Gust Slash', element: 'Wind', power: 40, targetingType: 'single' },
            { abilityId: 155, name: 'Tackle', element: 'None', power: 30, targetingType: 'single' },
        ],
        stats: {
            attack: 11,
            defense: 7,
            speed: 15,
            specialAttack: 11,
            specialDefense: 8,
        },
        equipment: {},
    };
}

function _createEarthStarter() {
    return {
        instanceId: 6,
        raceId: 6,
        formId: 16,
        nickname: '',
        level: 5,
        xp: 0,
        currentHp: 60,
        maxHp: 60,
        elementTypes: ['Earth'],
        abilities: [
            { abilityId: 56, name: 'Rock Throw', element: 'Earth', power: 40, targetingType: 'single' },
            { abilityId: 155, name: 'Tackle', element: 'None', power: 30, targetingType: 'single' },
        ],
        stats: {
            attack: 12,
            defense: 14,
            speed: 6,
            specialAttack: 7,
            specialDefense: 11,
        },
        equipment: {},
    };
}

function _createElectricStarter() {
    return {
        instanceId: 7,
        raceId: 7,
        formId: 19,
        nickname: '',
        level: 5,
        xp: 0,
        currentHp: 45,
        maxHp: 45,
        elementTypes: ['Electric'],
        abilities: [
            { abilityId: 67, name: 'Spark Bolt', element: 'Electric', power: 40, targetingType: 'single' },
            { abilityId: 155, name: 'Tackle', element: 'None', power: 30, targetingType: 'single' },
        ],
        stats: {
            attack: 7,
            defense: 8,
            speed: 13,
            specialAttack: 15,
            specialDefense: 10,
        },
        equipment: {},
    };
}

function _createDarkStarter() {
    return {
        instanceId: 8,
        raceId: 8,
        formId: 22,
        nickname: '',
        level: 5,
        xp: 0,
        currentHp: 48,
        maxHp: 48,
        elementTypes: ['Dark'],
        abilities: [
            { abilityId: 78, name: 'Shadow Strike', element: 'Dark', power: 40, targetingType: 'single' },
            { abilityId: 155, name: 'Tackle', element: 'None', power: 30, targetingType: 'single' },
        ],
        stats: {
            attack: 13,
            defense: 8,
            speed: 13,
            specialAttack: 12,
            specialDefense: 10,
        },
        equipment: {},
    };
}

function _createLightStarter() {
    return {
        instanceId: 9,
        raceId: 9,
        formId: 25,
        nickname: '',
        level: 5,
        xp: 0,
        currentHp: 55,
        maxHp: 55,
        elementTypes: ['Light'],
        abilities: [
            { abilityId: 89, name: 'Holy Beam', element: 'Light', power: 40, targetingType: 'single' },
            { abilityId: 155, name: 'Tackle', element: 'None', power: 30, targetingType: 'single' },
        ],
        stats: {
            attack: 7,
            defense: 10,
            speed: 9,
            specialAttack: 13,
            specialDefense: 14,
        },
        equipment: {},
    };
}

function _createPoisonStarter() {
    return {
        instanceId: 10,
        raceId: 14,
        formId: 40,
        nickname: '',
        level: 5,
        xp: 0,
        currentHp: 50,
        maxHp: 50,
        elementTypes: ['Poison'],
        abilities: [
            { abilityId: 144, name: 'Toxic Spit', element: 'Poison', power: 35, targetingType: 'single' },
            { abilityId: 155, name: 'Tackle', element: 'None', power: 30, targetingType: 'single' },
        ],
        stats: {
            attack: 10,
            defense: 9,
            speed: 12,
            specialAttack: 11,
            specialDefense: 9,
        },
        equipment: {},
    };
}

// -- GameManager -----------------------------------------------------------------

export class GameManager {
    /**
     * @param {Object} [deps] - Optional dependency injection
     * @param {Object} [deps.saveManager] - Reference to SaveManager instance
     * @param {Object} [deps.screenManager] - Reference to ScreenManager instance
     */
    constructor(deps = {}) {
        /** @type {Object|null} */
        this._saveManager = deps.saveManager || null;

        /** @type {Object|null} */
        this._screenManager = deps.screenManager || null;

        /** @type {Object} The main player data object */
        this.playerData = null;

        /** @type {string} Current overworld area ID */
        this.currentAreaId = '';

        /** @type {number} Total game time in seconds */
        this.gameTimeSeconds = 0;

        /** @type {boolean} Whether the game is currently in a battle */
        this.isInBattle = false;

        /** @type {boolean} Whether the game has been started / loaded */
        this.isGameActive = false;

        /** @private Game time tracking interval ID */
        this._gameTimeTimerId = null;

        /** @private Last timestamp for delta calculation */
        this._lastTimestamp = 0;

        console.log('[GameManager] Created.');
    }

    // -- Initialization ----------------------------------------------------------

    /**
     * Initialize the game manager.
     */
    init() {
        this.playerData = createDefaultPlayerData();
        this._startGameTimer();
        console.log('[GameManager] Initialized.');
    }

    /**
     * Set the save manager reference.
     * @param {Object} saveManager
     */
    setSaveManager(saveManager) {
        this._saveManager = saveManager;
    }

    /**
     * Set the screen manager reference.
     * @param {Object} screenManager
     */
    setScreenManager(screenManager) {
        this._screenManager = screenManager;
    }

    /**
     * Shut down the game manager, stopping timers.
     */
    destroy() {
        this._stopGameTimer();
    }

    // -- Public API: New Game / Load / Save --------------------------------------

    /**
     * Start a new game with starter data.
     */
    startNewGame() {
        this.playerData = createDefaultPlayerData();
        this.playerData.playerName = 'Trainer';
        this.playerData.team = [
            createStarterSprite(),      // 1. Emberpaw (Fire)
            _createWaterStarter(),      // 2. Tidalfin (Water)
            _createNatureStarter(),     // 3. Thornvine (Nature)
            _createIceStarter(),        // 4. Frostfang (Ice)
            _createAirStarter(),        // 5. Galecrest (Air)
            _createEarthStarter(),      // 6. Terraclaw (Earth)
            _createElectricStarter(),   // 7. Voltail (Electric)
            _createDarkStarter(),       // 8. Gloomshade (Dark)
            _createLightStarter(),      // 9. Luminos (Light)
            _createPoisonStarter(),     // 10. Venomire (Poison)
        ];
        this.currentAreaId = 'starter_town';
        this.gameTimeSeconds = 0;
        this.isInBattle = false;
        this.isGameActive = true;

        eventBus.emit(GameEvents.SCENE_CHANGED, this.currentAreaId);
        console.log('[GameManager] New game started.');
    }

    /**
     * Load a game from a save slot.
     * @param {number} saveSlot
     */
    loadGame(saveSlot) {
        if (!this._saveManager) {
            console.error('[GameManager] SaveManager not available.');
            eventBus.emit(GameEvents.GAME_LOADED, { success: false });
            return;
        }

        const data = this._saveManager.loadSave(saveSlot);
        if (data) {
            this.playerData = data;
            this.currentAreaId = data.currentAreaId || '';
            this.gameTimeSeconds = data.playTimeSeconds || 0;
            this.isInBattle = false;
            this.isGameActive = true;
            eventBus.emit(GameEvents.GAME_LOADED, { success: true, slot: saveSlot });
            console.log('[GameManager] Game loaded from slot %d.', saveSlot);
        } else {
            eventBus.emit(GameEvents.GAME_LOADED, { success: false, slot: saveSlot });
            console.error('[GameManager] Failed to load game from slot %d.', saveSlot);
        }
    }

    /**
     * Save the current game to a slot.
     * @param {number} saveSlot
     */
    saveGame(saveSlot) {
        if (!this._saveManager) {
            console.error('[GameManager] SaveManager not available.');
            eventBus.emit(GameEvents.GAME_SAVED, { success: false });
            return;
        }

        // Update play time before saving
        if (this.playerData) {
            this.playerData.playTimeSeconds = this.gameTimeSeconds;
            this.playerData.currentAreaId = this.currentAreaId;
        }

        const success = this._saveManager.saveData(saveSlot, this.playerData);
        eventBus.emit(GameEvents.GAME_SAVED, { success, slot: saveSlot });
    }

    // -- Public API: Battle Management -------------------------------------------

    /**
     * Transition the game into battle mode.
     * @param {Object} battleData - Data describing the battle encounter
     */
    transitionToBattle(battleData) {
        this.isInBattle = true;
        eventBus.emit(GameEvents.BATTLE_STARTED, battleData);
        console.log('[GameManager] Transitioning to battle.');
    }

    /**
     * End the current battle and return to the overworld.
     * @param {Object} result - Battle result data { result: 'player_win'|'enemy_win'|'draw', rewards: {...} }
     */
    endBattle(result) {
        this.isInBattle = false;
        eventBus.emit(GameEvents.BATTLE_ENDED, result);
        console.log('[GameManager] Battle ended:', result.result || 'unknown');
    }

    // -- Public API: Area Transitions --------------------------------------------

    /**
     * Transition to a different overworld area.
     * @param {string} areaId
     */
    transitionToArea(areaId) {
        const previousArea = this.currentAreaId;
        eventBus.emit(GameEvents.SCENE_CHANGED, { from: previousArea, to: areaId });
        this.currentAreaId = areaId;
        if (this.playerData) {
            this.playerData.currentAreaId = areaId;
        }
        console.log('[GameManager] Area transition: %s -> %s', previousArea, areaId);
    }

    // -- Public API: Stats Helpers -----------------------------------------------

    /**
     * Calculate the average level of the player's top 10 highest-leveled Sprites.
     * Ported from [P9-007] in GameManager.gd.
     * @returns {number}
     */
    getTop10AverageLevel() {
        if (!this.playerData) return 1;

        const allSprites = [
            ...(this.playerData.team || []),
            ...(this.playerData.storage || []),
        ];

        if (allSprites.length === 0) return 1;

        // Sort descending by level
        allSprites.sort((a, b) => (b.level || 1) - (a.level || 1));

        const topCount = Math.min(10, allSprites.length);
        let total = 0;
        for (let i = 0; i < topCount; i++) {
            total += allSprites[i].level || 1;
        }

        return total / topCount;
    }

    // -- Public API: Player Data Accessors ---------------------------------------

    /**
     * Get a team sprite by index.
     * @param {number} index
     * @returns {Object|null}
     */
    getTeamSprite(index) {
        if (!this.playerData || !this.playerData.team) return null;
        if (index < 0 || index >= this.playerData.team.length) return null;
        return this.playerData.team[index];
    }

    /**
     * Get the current team size.
     * @returns {number}
     */
    getTeamSize() {
        if (!this.playerData || !this.playerData.team) return 0;
        return this.playerData.team.length;
    }

    /**
     * Add gold and emit event.
     * @param {number} amount
     */
    addGold(amount) {
        if (!this.playerData) return;
        this.playerData.gold = (this.playerData.gold || 0) + amount;
        eventBus.emit(GameEvents.GOLD_CHANGED, this.playerData.gold);
    }

    /**
     * Spend gold. Returns true if successful (enough gold).
     * @param {number} amount
     * @returns {boolean}
     */
    spendGold(amount) {
        if (!this.playerData) return false;
        if ((this.playerData.gold || 0) < amount) return false;
        this.playerData.gold -= amount;
        eventBus.emit(GameEvents.GOLD_CHANGED, this.playerData.gold);
        return true;
    }

    /**
     * Check if a flag is set.
     * @param {string} flagName
     * @returns {boolean}
     */
    getFlag(flagName) {
        if (!this.playerData || !this.playerData.flags) return false;
        return !!this.playerData.flags[flagName];
    }

    /**
     * Set a game flag.
     * @param {string} flagName
     * @param {boolean} value
     */
    setFlag(flagName, value = true) {
        if (!this.playerData) return;
        if (!this.playerData.flags) this.playerData.flags = {};
        this.playerData.flags[flagName] = value;
    }

    /**
     * Check if the player has a specific item.
     * @param {number} itemId
     * @returns {boolean}
     */
    hasItem(itemId) {
        if (!this.playerData || !this.playerData.inventory) return false;
        const inv = this.playerData.inventory;
        for (const category of Object.values(inv)) {
            if (Array.isArray(category)) {
                if (category.some(item => item && item.itemId === itemId)) return true;
            }
        }
        return false;
    }

    /**
     * Check if a quest is completed.
     * @param {string} questId
     * @returns {boolean}
     */
    isQuestCompleted(questId) {
        if (!this.playerData) return false;
        return (this.playerData.completedQuestIds || []).includes(questId);
    }

    /**
     * Get formatted play time string (HH:MM:SS).
     * @returns {string}
     */
    getFormattedPlayTime() {
        const totalSec = Math.floor(this.gameTimeSeconds);
        const hours = Math.floor(totalSec / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // -- Private: Game Timer -----------------------------------------------------

    /** @private */
    _startGameTimer() {
        this._stopGameTimer();
        this._lastTimestamp = performance.now();
        this._gameTimeTimerId = setInterval(() => {
            if (!this.isGameActive) return;
            const now = performance.now();
            const delta = (now - this._lastTimestamp) / 1000;
            this._lastTimestamp = now;
            this.gameTimeSeconds += delta;
        }, 1000);
    }

    /** @private */
    _stopGameTimer() {
        if (this._gameTimeTimerId !== null) {
            clearInterval(this._gameTimeTimerId);
            this._gameTimeTimerId = null;
        }
    }
}

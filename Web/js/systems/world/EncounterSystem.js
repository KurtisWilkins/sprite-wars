/**
 * EncounterSystem — Manages wild Sprite encounter logic including step-based
 * probability, per-area encounter tables, level scaling, and battle data generation.
 * [P5-006] Drives random encounters when the player walks through encounter zones.
 *
 * Ported from Game/Scripts/World/EncounterSystem.gd
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// ── EncounterTable Inner Class ──────────────────────────────────────────────

/**
 * Defines the weighted pool of wild Sprites for a specific area.
 */
class EncounterTable {
    /**
     * @param {object[]} [entries] - Array of species entries.
     *   Each entry: { raceId, minLevel, maxLevel, weight, rarity }
     */
    constructor(entries = []) {
        /**
         * Array of species entries with rarity-based weighting.
         * @type {object[]}
         */
        this.speciesWeights = entries;

        /**
         * Total weight for weighted random selection.
         * @type {number}
         */
        this._totalWeight = 0.0;

        this._recalculateTotalWeight();
    }

    /**
     * Adds a species entry to the table.
     * @param {object} entry
     */
    addEntry(entry) {
        this.speciesWeights.push(entry);
        this._recalculateTotalWeight();
    }

    /**
     * Recalculates the total weight from all entries.
     */
    _recalculateTotalWeight() {
        this._totalWeight = 0.0;
        for (const entry of this.speciesWeights) {
            this._totalWeight += (entry.weight ?? 1.0);
        }
    }

    /**
     * Selects a random species entry using weighted random selection.
     * @returns {object} The selected entry, or empty object if table is empty.
     */
    rollSpecies() {
        if (this.speciesWeights.length === 0) {
            return {};
        }
        if (this._totalWeight <= 0.0) {
            return this.speciesWeights[0];
        }

        const roll = Math.random() * this._totalWeight;
        let cumulative = 0.0;
        for (const entry of this.speciesWeights) {
            cumulative += (entry.weight ?? 1.0);
            if (roll <= cumulative) {
                return entry;
            }
        }
        return this.speciesWeights[this.speciesWeights.length - 1];
    }
}

// ── EncounterSystem Class ───────────────────────────────────────────────────

export class EncounterSystem {
    /**
     * @param {object} [config]
     * @param {number} [config.baseEncounterRate]       - Base probability per step.
     * @param {number} [config.minStepsBetweenEncounters] - Grace period steps.
     * @param {number} [config.maxStepsWithoutEncounter]  - Force encounter after this many steps.
     * @param {object} [config.weatherSystem]            - Reference to WeatherSystem.
     */
    constructor(config = {}) {
        // ── Configuration ───────────────────────────────────────────────

        /** Base probability of encountering a wild Sprite per step in an encounter zone. */
        this.baseEncounterRate = config.baseEncounterRate ?? 0.1;

        /** Minimum number of steps before an encounter can trigger (grace period). */
        this.minStepsBetweenEncounters = config.minStepsBetweenEncounters ?? 4;

        /** Maximum steps before an encounter is forced (anti-frustration cap). */
        this.maxStepsWithoutEncounter = config.maxStepsWithoutEncounter ?? 30;

        // ── Encounter Tables ────────────────────────────────────────────

        /**
         * Dictionary mapping area_id to an EncounterTable instance.
         * @type {Object.<string, EncounterTable>}
         */
        this.encounterTables = {};

        /** Number of steps taken in encounter zones since the last encounter. */
        this.stepsSinceEncounter = 0;

        // ── External References ─────────────────────────────────────────

        /** Reference to WeatherSystem for modifiers. */
        this.weatherSystem = config.weatherSystem || null;
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Registers an encounter table for the given area.
     * @param {string} areaId
     * @param {object[]} entries - Array of species entries:
     *   { raceId: number, minLevel: number, maxLevel: number, weight: number, rarity: string }
     */
    registerTable(areaId, entries) {
        this.encounterTables[areaId] = new EncounterTable(entries);
    }

    /**
     * Called each time the player steps on an encounter tile.
     * Returns a non-empty object with encounter data if an encounter triggers,
     * or an empty object if no encounter occurs.
     *
     * @param {string} areaId
     * @returns {object} Encounter data or empty object.
     */
    checkEncounter(areaId) {
        this.stepsSinceEncounter += 1;

        if (!this.encounterTables[areaId]) {
            return {};
        }

        // Grace period: no encounters until minimum steps reached
        if (this.stepsSinceEncounter < this.minStepsBetweenEncounters) {
            return {};
        }

        // Calculate effective encounter rate with progressive increase
        let effectiveRate = this._calculateEncounterRate();

        // Apply weather modifier if a WeatherSystem is present
        effectiveRate *= this._getWeatherModifier();

        // Force encounter at max steps
        if (this.stepsSinceEncounter >= this.maxStepsWithoutEncounter) {
            effectiveRate = 1.0;
        }

        // Roll the dice
        if (Math.random() > effectiveRate) {
            return {};
        }

        // Encounter triggered -- roll species and level
        const table = this.encounterTables[areaId];
        const speciesEntry = table.rollSpecies();

        if (!speciesEntry || Object.keys(speciesEntry).length === 0) {
            return {};
        }

        const level = this._determineLevel(speciesEntry);

        this.stepsSinceEncounter = 0;

        const encounterData = {
            type: 'wild',
            areaId: areaId,
            raceId: speciesEntry.raceId ?? speciesEntry.race_id ?? 0,
            level: level,
            rarity: speciesEntry.rarity || 'common',
        };

        return encounterData;
    }

    /**
     * Builds a full battle data object from encounter data, ready for the
     * BattleManager to consume.
     *
     * @param {object} encounterData
     * @returns {object} Battle data.
     */
    buildWildBattle(encounterData) {
        const raceId = encounterData.raceId ?? encounterData.race_id ?? 0;
        const level = encounterData.level ?? 1;
        const rarity = encounterData.rarity || 'common';

        // Generate wild Sprite stats using the race data
        const wildSprite = {
            raceId: raceId,
            level: level,
            rarity: rarity,
            isWild: true,
        };

        // Apply rarity stat bonuses
        const ivBonus = this._getRarityIvBonus(rarity);
        wildSprite.ivBonus = ivBonus;

        const battleData = {
            battleType: 'wild',
            areaId: encounterData.areaId || '',
            enemyTeam: [wildSprite],
            canFlee: true,
            canCatch: true,
            background: this._getBattleBackground(encounterData.areaId || ''),
        };

        // Include weather condition if active
        const weatherCondition = this._getWeatherBattleCondition();
        if (weatherCondition && Object.keys(weatherCondition).length > 0) {
            battleData.weatherCondition = weatherCondition;
        }

        return battleData;
    }

    /**
     * Resets the step counter (e.g. after using a repel item).
     */
    resetStepCounter() {
        this.stepsSinceEncounter = 0;
    }

    // ── Encounter Rate Calculation ──────────────────────────────────────────

    /**
     * Progressive encounter rate: increases with more steps taken since last encounter.
     * @returns {number}
     */
    _calculateEncounterRate() {
        const stepsOverMin = this.stepsSinceEncounter - this.minStepsBetweenEncounters;
        let progress = stepsOverMin / (this.maxStepsWithoutEncounter - this.minStepsBetweenEncounters);
        progress = Math.max(0.0, Math.min(1.0, progress));

        // Quadratic ramp from baseEncounterRate toward 1.0
        return this.baseEncounterRate + (1.0 - this.baseEncounterRate) * progress * progress;
    }

    // ── Level Determination ─────────────────────────────────────────────────

    /**
     * Determines the level for the encountered Sprite.
     * @param {object} speciesEntry
     * @returns {number}
     */
    _determineLevel(speciesEntry) {
        const minLevel = speciesEntry.minLevel ?? speciesEntry.min_level ?? 1;
        const maxLevel = speciesEntry.maxLevel ?? speciesEntry.max_level ?? minLevel;
        // Random integer in [minLevel, maxLevel]
        return Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
    }

    // ── Rarity Bonuses ──────────────────────────────────────────────────────

    /**
     * Rarity modifies the individual value (IV) bonus for the wild Sprite's stats.
     * @param {string} rarity
     * @returns {number}
     */
    _getRarityIvBonus(rarity) {
        switch (rarity) {
            case 'common':    return 0.0;
            case 'uncommon':  return 0.05;
            case 'rare':      return 0.10;
            case 'legendary': return 0.20;
            default:          return 0.0;
        }
    }

    // ── Weather Integration ─────────────────────────────────────────────────

    /**
     * Gets the encounter rate modifier from the WeatherSystem if present.
     * @returns {number}
     */
    _getWeatherModifier() {
        if (!this.weatherSystem) {
            return 1.0;
        }
        if (typeof this.weatherSystem.getEncounterRateModifier === 'function') {
            return this.weatherSystem.getEncounterRateModifier(this.weatherSystem.currentWeather);
        }
        return 1.0;
    }

    /**
     * Gets the active weather's battle condition from the WeatherSystem.
     * @returns {object}
     */
    _getWeatherBattleCondition() {
        if (!this.weatherSystem) {
            return {};
        }
        if (typeof this.weatherSystem.getBattleCondition === 'function') {
            return this.weatherSystem.getBattleCondition(this.weatherSystem.currentWeather);
        }
        return {};
    }

    // ── Battle Background ───────────────────────────────────────────────────

    /**
     * Returns the battle background path for the given area.
     * @param {string} areaId
     * @returns {string}
     */
    _getBattleBackground(areaId) {
        const bgMap = {
            'starter_town':  'Sprites/Battle Backgrounds/grassland.png',
            'ember_cave':    'Sprites/Battle Backgrounds/cave.png',
            'frost_peak':    'Sprites/Battle Backgrounds/snow.png',
            'shadow_forest': 'Sprites/Battle Backgrounds/forest.png',
        };
        return bgMap[areaId] || 'Sprites/Battle Backgrounds/grassland.png';
    }
}

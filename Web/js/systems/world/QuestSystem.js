/**
 * QuestSystem — Quest state machine for Sprite Wars.
 * Manages active, completed, and available quests. Listens to EventBus signals
 * to automatically update objective progress when game events occur.
 *
 * Ported from Game/Autoloads/QuestManager.gd
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// ── QuestSystem Class ───────────────────────────────────────────────────────

export class QuestSystem {
    /**
     * @param {object} [config]
     * @param {object} [config.gameManager]    - Reference to game manager for player data.
     * @param {Function} [config.loadAllQuestData] - Callback returning all quest definitions.
     */
    constructor(config = {}) {
        // ── External References ─────────────────────────────────────────
        this.gameManager = config.gameManager || null;
        this._loadAllQuestDataFn = config.loadAllQuestData || (() => []);

        // ── State ───────────────────────────────────────────────────────

        /**
         * Each entry: { questData: object, objectivesProgress: number[], state: string }
         * questData mirrors the QuestData schema fields.
         * objectivesProgress[i] tracks the current count for objective i.
         * state is one of: "active", "ready_to_complete".
         * @type {object[]}
         */
        this.activeQuests = [];

        /**
         * Quest IDs that have been completed and rewards claimed.
         * @type {number[]}
         */
        this.completedQuests = [];

        /**
         * Quest IDs whose prerequisites are met and can be accepted by the player.
         * @type {number[]}
         */
        this.availableQuests = [];

        /**
         * The quest_id currently tracked on the HUD. -1 means none.
         * @type {number}
         */
        this._trackedQuestId = -1;

        // Connect EventBus signals
        this._connectEventBusSignals();
    }

    // ── Signal Connections ──────────────────────────────────────────────────

    _connectEventBusSignals() {
        eventBus.on(GameEvents.BATTLE_ENDED, (result) => this._onBattleEnded(result));
        eventBus.on('catch_succeeded', (spriteData) => this._onCatchSucceeded(spriteData));
        eventBus.on('area_entered', (areaId) => this._onAreaEntered(areaId));
        eventBus.on('npc_interaction_ended', (npcId) => this._onNpcInteractionEnded(npcId));
        eventBus.on('temple_completed', (templeId) => this._onTempleCompleted(templeId));
        eventBus.on(GameEvents.ITEM_OBTAINED, (data) => this._onItemAcquired(data));
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Activate a quest by ID. Returns true if the quest was successfully activated.
     * The quest must be in availableQuests and not already active or completed.
     *
     * @param {number} questId
     * @returns {boolean}
     */
    activateQuest(questId) {
        if (this.completedQuests.includes(questId)) {
            console.warn(`QuestSystem: quest ${questId} is already completed.`);
            return false;
        }

        if (this._findActiveQuestIndex(questId) >= 0) {
            console.warn(`QuestSystem: quest ${questId} is already active.`);
            return false;
        }

        if (!this.availableQuests.includes(questId)) {
            console.warn(`QuestSystem: quest ${questId} is not available.`);
            return false;
        }

        // Look up quest data from the data source
        const questData = this._loadQuestData(questId);
        if (!questData || Object.keys(questData).length === 0) {
            console.warn(`QuestSystem: quest ${questId} data not found.`);
            return false;
        }

        // Build the objectives progress array initialized to zero
        const objectives = questData.objectives || [];
        const progress = new Array(objectives.length).fill(0);

        const questEntry = {
            questData: questData,
            objectivesProgress: progress,
            state: 'active',
        };

        this.activeQuests.push(questEntry);

        // Remove from available
        const availIdx = this.availableQuests.indexOf(questId);
        if (availIdx >= 0) {
            this.availableQuests.splice(availIdx, 1);
        }

        // Auto-track the first activated quest if nothing is tracked
        if (this._trackedQuestId < 0) {
            this._trackedQuestId = questId;
        }

        eventBus.emit(GameEvents.QUEST_STARTED, questData);
        return true;
    }

    /**
     * Update objective progress for a specific quest. Called automatically by
     * event handlers or manually for custom objective types.
     * Returns true if any objective was updated.
     *
     * @param {number} questId
     * @param {string} objectiveType
     * @param {string} target
     * @param {number} [amount=1]
     * @returns {boolean}
     */
    updateObjective(questId, objectiveType, target, amount = 1) {
        const idx = this._findActiveQuestIndex(questId);
        if (idx < 0) {
            return false;
        }

        const questEntry = this.activeQuests[idx];
        if (questEntry.state !== 'active') {
            return false;
        }

        const questData = questEntry.questData;
        const objectives = questData.objectives || [];
        const progress = questEntry.objectivesProgress;
        let anyUpdated = false;

        for (let i = 0; i < objectives.length; i++) {
            const obj = objectives[i];
            if ((obj.type || '') !== objectiveType) {
                continue;
            }
            if (String(obj.target || '') !== target) {
                continue;
            }

            const required = parseInt(obj.count, 10) || 1;
            if (progress[i] >= required) {
                continue; // Already complete
            }

            progress[i] = Math.min(progress[i] + amount, required);
            anyUpdated = true;
            eventBus.emit(GameEvents.QUEST_UPDATED, questData, i);
        }

        if (anyUpdated) {
            questEntry.objectivesProgress = progress;
            this.activeQuests[idx] = questEntry;

            // Check if the quest is now ready to complete
            if (this.checkCompletion(questId)) {
                questEntry.state = 'ready_to_complete';
                this.activeQuests[idx] = questEntry;
            }
        }

        return anyUpdated;
    }

    /**
     * Check whether all objectives for a quest are fulfilled.
     * @param {number} questId
     * @returns {boolean}
     */
    checkCompletion(questId) {
        const idx = this._findActiveQuestIndex(questId);
        if (idx < 0) {
            return false;
        }

        const questEntry = this.activeQuests[idx];
        const questData = questEntry.questData;
        const objectives = questData.objectives || [];
        const progress = questEntry.objectivesProgress;

        for (let i = 0; i < objectives.length; i++) {
            const required = parseInt(objectives[i].count, 10) || 1;
            if (progress[i] < required) {
                return false;
            }
        }

        return objectives.length > 0;
    }

    /**
     * Complete a quest and return its rewards object.
     * Removes the quest from activeQuests and adds it to completedQuests.
     *
     * @param {number} questId
     * @returns {object} Rewards dictionary, or empty object if failed.
     */
    completeQuest(questId) {
        const idx = this._findActiveQuestIndex(questId);
        if (idx < 0) {
            console.warn(`QuestSystem: cannot complete quest ${questId} -- not active.`);
            return {};
        }

        if (!this.checkCompletion(questId)) {
            console.warn(`QuestSystem: quest ${questId} objectives are not all fulfilled.`);
            return {};
        }

        const questEntry = this.activeQuests[idx];
        const questData = questEntry.questData;
        const rewards = questData.rewards || {};

        // Move to completed
        this.activeQuests.splice(idx, 1);
        if (!this.completedQuests.includes(questId)) {
            this.completedQuests.push(questId);
        }

        // Update tracked quest if this was the tracked one
        if (this._trackedQuestId === questId) {
            this._trackedQuestId = this._findNextActiveQuestId();
        }

        // Update player data
        const playerData = this.gameManager?.playerData;
        if (playerData && typeof playerData.completeQuest === 'function') {
            playerData.completeQuest(questId);
        }

        eventBus.emit(GameEvents.QUEST_COMPLETED, questData);

        // Refresh available quests after completion (new quests may unlock)
        const allQuests = this._loadAllQuestData();
        this.refreshAvailableQuests(allQuests, this.completedQuests);

        return rewards;
    }

    /**
     * Return the full list of active quest entries.
     * @returns {object[]}
     */
    getActiveQuests() {
        return this.activeQuests;
    }

    /**
     * Return the state of a given quest: "locked", "available", "active",
     * "ready_to_complete", "complete", or "unknown".
     *
     * @param {number} questId
     * @returns {string}
     */
    getQuestState(questId) {
        if (this.completedQuests.includes(questId)) {
            return 'complete';
        }
        if (this.availableQuests.includes(questId)) {
            return 'available';
        }
        const idx = this._findActiveQuestIndex(questId);
        if (idx >= 0) {
            return this.activeQuests[idx].state || 'active';
        }
        return 'locked';
    }

    /**
     * Check whether a quest's prerequisites are met given a set of completed IDs.
     * @param {number} questId
     * @param {number[]} completedIds
     * @returns {boolean}
     */
    checkPrerequisites(questId, completedIds) {
        const questData = this._loadQuestData(questId);
        if (!questData || Object.keys(questData).length === 0) {
            return false;
        }
        const prereqs = questData.prerequisiteQuestIds || questData.prerequisite_quest_ids || [];
        for (const prereqId of prereqs) {
            if (!completedIds.includes(parseInt(prereqId, 10))) {
                return false;
            }
        }
        return true;
    }

    /**
     * Scan all quests and mark those whose prerequisites are now met as available.
     * Skips quests that are already active, completed, or already available.
     *
     * @param {object[]} allQuests
     * @param {number[]} completedIds
     */
    refreshAvailableQuests(allQuests, completedIds) {
        for (const questData of allQuests) {
            const qid = parseInt(questData.questId ?? questData.quest_id ?? 0, 10);
            if (qid <= 0) {
                continue;
            }
            if (completedIds.includes(qid)) {
                continue;
            }
            if (this.availableQuests.includes(qid)) {
                continue;
            }
            if (this._findActiveQuestIndex(qid) >= 0) {
                continue;
            }

            const prereqs = questData.prerequisiteQuestIds || questData.prerequisite_quest_ids || [];
            let prereqsMet = true;
            for (const prereqId of prereqs) {
                if (!completedIds.includes(parseInt(prereqId, 10))) {
                    prereqsMet = false;
                    break;
                }
            }

            if (prereqsMet) {
                this.availableQuests.push(qid);
                eventBus.emit('quest_available', questData);
            }
        }
    }

    /**
     * Return the currently tracked quest entry for HUD display, or empty object.
     * @returns {object}
     */
    getTrackedQuest() {
        if (this._trackedQuestId < 0) {
            return {};
        }
        const idx = this._findActiveQuestIndex(this._trackedQuestId);
        if (idx < 0) {
            return {};
        }
        return this.activeQuests[idx];
    }

    /**
     * Set the quest currently tracked on the HUD.
     * @param {number} questId
     */
    setTrackedQuest(questId) {
        if (this._findActiveQuestIndex(questId) >= 0) {
            this._trackedQuestId = questId;
        } else {
            console.warn(`QuestSystem: cannot track quest ${questId} -- not active.`);
        }
    }

    // ── Event Handlers ──────────────────────────────────────────────────────

    /**
     * @param {object} result
     */
    _onBattleEnded(result) {
        const isVictory = result.victory ?? false;
        if (!isVictory) {
            return;
        }

        // Handle "defeat_enemies" objectives
        const enemiesDefeated = result.enemiesDefeated || result.enemies_defeated || [];
        for (const enemyData of enemiesDefeated) {
            const enemyId = String(enemyData.raceId ?? enemyData.race_id ?? '');
            this._broadcastObjectiveUpdate('defeat_enemies', enemyId, 1);
        }

        // Handle "win_battle_condition" objectives
        const battleType = String(result.battleType ?? result.battle_type ?? '');
        if (battleType) {
            this._broadcastObjectiveUpdate('win_battle_condition', battleType, 1);
        }

        // Generic battle win target
        this._broadcastObjectiveUpdate('win_battle_condition', 'any', 1);
    }

    /**
     * @param {object} spriteData
     */
    _onCatchSucceeded(spriteData) {
        const raceIdStr = spriteData ? String(spriteData.raceId ?? spriteData.race_id ?? '') : '';
        this._broadcastObjectiveUpdate('catch_sprite', raceIdStr, 1);
        // Also count as "any" catch
        this._broadcastObjectiveUpdate('catch_sprite', 'any', 1);
    }

    /**
     * @param {string} areaId
     */
    _onAreaEntered(areaId) {
        this._broadcastObjectiveUpdate('reach_area', areaId, 1);
    }

    /**
     * @param {string} npcId
     */
    _onNpcInteractionEnded(npcId) {
        this._broadcastObjectiveUpdate('talk_to_npc', npcId, 1);
    }

    /**
     * @param {string} templeId
     */
    _onTempleCompleted(templeId) {
        this._broadcastObjectiveUpdate('complete_temple', templeId, 1);
    }

    /**
     * @param {object} data - { itemId, count } or resource-like object
     */
    _onItemAcquired(data) {
        let itemIdStr = '';
        if (data) {
            if (data.equipmentId != null) {
                itemIdStr = String(data.equipmentId);
            } else if (data.itemId != null) {
                itemIdStr = String(data.itemId);
            } else if (data.item_id != null) {
                itemIdStr = String(data.item_id);
            }
        }
        const quantity = data?.count ?? data?.quantity ?? 1;

        if (itemIdStr) {
            this._broadcastObjectiveUpdate('collect_items', itemIdStr, quantity);
            // Handle "deliver_item" as well (same trigger, different objective type)
            this._broadcastObjectiveUpdate('deliver_item', itemIdStr, quantity);
        }
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Broadcast an objective update to all active quests.
     * @param {string} objectiveType
     * @param {string} target
     * @param {number} amount
     */
    _broadcastObjectiveUpdate(objectiveType, target, amount) {
        for (let i = 0; i < this.activeQuests.length; i++) {
            const questEntry = this.activeQuests[i];
            const qid = parseInt(questEntry.questData.questId ?? questEntry.questData.quest_id ?? 0, 10);
            this.updateObjective(qid, objectiveType, target, amount);
        }
    }

    /**
     * Find the index of an active quest by questId. Returns -1 if not found.
     * @param {number} questId
     * @returns {number}
     */
    _findActiveQuestIndex(questId) {
        for (let i = 0; i < this.activeQuests.length; i++) {
            const qd = this.activeQuests[i].questData;
            if (parseInt(qd.questId ?? qd.quest_id ?? 0, 10) === questId) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Find the next active quest ID for tracking after the current tracked quest
     * is completed. Returns -1 if no active quests remain.
     * @returns {number}
     */
    _findNextActiveQuestId() {
        if (this.activeQuests.length === 0) {
            return -1;
        }
        const qd = this.activeQuests[0].questData;
        return parseInt(qd.questId ?? qd.quest_id ?? -1, 10);
    }

    /**
     * Load quest data by ID from the data source.
     * @param {number} questId
     * @returns {object}
     */
    _loadQuestData(questId) {
        const allQuests = this._loadAllQuestData();
        for (const quest of allQuests) {
            if (parseInt(quest.questId ?? quest.quest_id ?? 0, 10) === questId) {
                return quest;
            }
        }
        return {};
    }

    /**
     * Load all quest definitions from data sources.
     * @returns {object[]}
     */
    _loadAllQuestData() {
        if (typeof this._loadAllQuestDataFn === 'function') {
            return this._loadAllQuestDataFn();
        }
        return [];
    }

    // ── Save / Load Integration ─────────────────────────────────────────────

    /**
     * Serialize the quest system state to an object for saving.
     * @returns {object}
     */
    toDict() {
        return {
            activeQuests: JSON.parse(JSON.stringify(this.activeQuests)),
            completedQuests: [...this.completedQuests],
            availableQuests: [...this.availableQuests],
            trackedQuestId: this._trackedQuestId,
        };
    }

    /**
     * Restore quest system state from a saved object.
     * @param {object} data
     */
    fromDict(data) {
        this.activeQuests = [];
        const savedActive = data.activeQuests || data.active_quests || [];
        for (const entry of savedActive) {
            this.activeQuests.push(entry);
        }

        this.completedQuests = [];
        const savedCompleted = data.completedQuests || data.completed_quests || [];
        for (const qid of savedCompleted) {
            this.completedQuests.push(parseInt(qid, 10));
        }

        this.availableQuests = [];
        const savedAvailable = data.availableQuests || data.available_quests || [];
        for (const qid of savedAvailable) {
            this.availableQuests.push(parseInt(qid, 10));
        }

        this._trackedQuestId = parseInt(data.trackedQuestId ?? data.tracked_quest_id ?? -1, 10);
    }
}

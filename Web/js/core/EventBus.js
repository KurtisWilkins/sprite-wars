/**
 * EventBus - Global event system for decoupled communication
 * Ported from Game/Autoloads/EventBus.gd
 */
export class EventBus {
    constructor() {
        this._listeners = {};
        this._onceListeners = {};
    }

    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
        return () => this.off(event, callback);
    }

    once(event, callback) {
        if (!this._onceListeners[event]) this._onceListeners[event] = [];
        this._onceListeners[event].push(callback);
    }

    off(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        }
        if (this._onceListeners[event]) {
            this._onceListeners[event] = this._onceListeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, ...args) {
        const listeners = this._listeners[event];
        if (listeners) {
            for (const cb of listeners) cb(...args);
        }
        const onceListeners = this._onceListeners[event] || [];
        this._onceListeners[event] = []; // clear before firing so errors don't leave stale listeners
        for (const cb of onceListeners) cb(...args);
    }

    clear(event) {
        if (event) {
            delete this._listeners[event];
            delete this._onceListeners[event];
        } else {
            this._listeners = {};
            this._onceListeners = {};
        }
    }
}

// Singleton instance
export const eventBus = new EventBus();

// Common game events (matching Godot signals)
export const GameEvents = {
    // Battle events
    BATTLE_STARTED: 'battle_started',
    BATTLE_ENDED: 'battle_ended',
    TURN_STARTED: 'turn_started',
    TURN_ENDED: 'turn_ended',
    UNIT_ATTACKED: 'unit_attacked',
    UNIT_DAMAGED: 'unit_damaged',
    UNIT_HEALED: 'unit_healed',
    UNIT_DEFEATED: 'unit_defeated',
    ABILITY_USED: 'ability_used',
    STATUS_APPLIED: 'status_applied',
    STATUS_REMOVED: 'status_removed',
    CATCH_ATTEMPTED: 'catch_attempted',
    CATCH_RESULT: 'catch_result',

    // Progression events
    XP_GAINED: 'xp_gained',
    LEVEL_UP: 'level_up',
    EVOLUTION_READY: 'evolution_ready',
    EVOLUTION_COMPLETE: 'evolution_complete',
    ABILITY_LEARNED: 'ability_learned',

    // World events
    SCENE_CHANGED: 'scene_changed',
    ENCOUNTER_TRIGGERED: 'encounter_triggered',
    NPC_INTERACTED: 'npc_interacted',
    DIALOGUE_STARTED: 'dialogue_started',
    DIALOGUE_ENDED: 'dialogue_ended',
    ITEM_OBTAINED: 'item_obtained',
    ITEM_USED: 'item_used',

    // Quest events
    QUEST_STARTED: 'quest_started',
    QUEST_UPDATED: 'quest_updated',
    QUEST_COMPLETED: 'quest_completed',
    OBJECTIVE_COMPLETE: 'objective_complete',

    // UI events
    SCREEN_OPENED: 'screen_opened',
    SCREEN_CLOSED: 'screen_closed',
    NOTIFICATION: 'notification',

    // Player events
    GOLD_CHANGED: 'gold_changed',
    TEAM_CHANGED: 'team_changed',
    EQUIPMENT_CHANGED: 'equipment_changed',
    EQUIPMENT_DROPPED: 'equipment_dropped',
    EQUIPMENT_LOOTED: 'equipment_looted',
    BATTLE_LOOT_ROLLED: 'battle_loot_rolled',

    // System events
    GAME_SAVED: 'game_saved',
    GAME_LOADED: 'game_loaded',
    SETTINGS_CHANGED: 'settings_changed',
    AUTH_STATE_CHANGED: 'auth_state_changed',
};

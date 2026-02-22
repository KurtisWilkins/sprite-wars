/**
 * DialogueSystem — Full-featured NPC dialogue UI with typewriter text, speaker
 * portraits, branching choices, conditional dialogue, and action callbacks.
 * [P5-008] Renders as an overlay on the game canvas.
 *
 * Ported from Game/Scripts/World/DialogueSystem.gd
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// ── DialogueSystem Class ────────────────────────────────────────────────────

export class DialogueSystem {
    /**
     * @param {object} [config]
     * @param {number} [config.typewriterSpeed]       - Characters per second.
     * @param {number} [config.continueIndicatorDelay] - Seconds before showing indicator.
     * @param {object} [config.gameManager]            - Reference to game manager for condition/action evaluation.
     */
    constructor(config = {}) {
        // ── Configuration ───────────────────────────────────────────────

        /** Characters revealed per second during typewriter effect. */
        this.typewriterSpeed = config.typewriterSpeed ?? 40.0;

        /** Time in seconds to wait after typewriter finishes before showing indicator. */
        this.continueIndicatorDelay = config.continueIndicatorDelay ?? 0.3;

        /** Reference to the game manager (for condition/action evaluation). */
        this.gameManager = config.gameManager || null;

        // ── State ───────────────────────────────────────────────────────

        /** Whether the dialogue system is currently showing dialogue. */
        this.isActive = false;

        /** The full dialogue sequence being played. @type {object[]} */
        this.currentDialogue = [];

        /** Index of the currently displayed dialogue entry. */
        this.currentIndex = 0;

        /** Typewriter state. */
        this._visibleCharacters = 0;
        this._totalCharacters = 0;
        this._typewriterTimer = 0.0;
        this._typewriterActive = false;
        this._waitingForInput = false;

        /** Currently displayed choices (if any). @type {object[]} */
        this._currentChoices = [];

        /** Timer for continue indicator delay. */
        this._continueIndicatorTimer = -1;

        /** Whether the continue indicator should be shown. */
        this.showContinueIndicator = false;

        /** Whether the choices UI should be shown. */
        this.showChoices = false;

        // ── Current Line Rendering State (for external renderer) ────────

        /** Current speaker name. */
        this.speakerName = '';

        /** Current portrait path/key. */
        this.portraitPath = '';

        /** Full text of the current dialogue line. */
        this.fullText = '';

        /** Currently visible text (typewriter slice). */
        this.visibleText = '';

        /** Choices to render. @type {object[]} */
        this.visibleChoices = [];
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Starts a dialogue sequence.
     *
     * Each entry in dialogueData is an object with:
     *   speaker: string  - name of the speaking character
     *   text: string     - the dialogue text (may contain BBCode-like markup)
     *   portrait: string - path/key to the speaker's portrait texture (optional)
     *   choices: Array<object> - branching choices (optional)
     *     Each choice: { text, nextIndex, condition, action }
     *
     * @param {object[]} dialogueData
     */
    startDialogue(dialogueData) {
        if (!dialogueData || dialogueData.length === 0) {
            return;
        }

        this.currentDialogue = dialogueData;
        this.currentIndex = 0;
        this.isActive = true;

        eventBus.emit(GameEvents.DIALOGUE_STARTED);
        eventBus.emit('npc_interaction_started', this._getCurrentSpeakerId());

        this._showLine(this.currentIndex);
    }

    /**
     * Advances to the next dialogue line, or closes if at the end.
     */
    advance() {
        if (!this.isActive) {
            return;
        }

        // If typewriter is still animating, skip to full text
        if (this._typewriterActive) {
            this._skipTypewriter();
            return;
        }

        // If we have active choices, don't advance until one is selected
        if (this._currentChoices.length > 0) {
            return;
        }

        // Move to next line
        this.currentIndex += 1;
        if (this.currentIndex >= this.currentDialogue.length) {
            this.closeDialogue();
            return;
        }

        this._showLine(this.currentIndex);
    }

    /**
     * Shows a branching choice UI for the current dialogue line.
     * @param {object[]} choices
     */
    showChoicesUI(choices) {
        this._clearChoices();
        this._currentChoices = choices;
        this._waitingForInput = false;
        this.showContinueIndicator = false;

        const visibleChoices = [];
        for (let i = 0; i < choices.length; i++) {
            const choice = choices[i];

            // Evaluate condition if present
            if (choice.condition && choice.condition.length > 0) {
                if (!this._evaluateCondition(choice.condition)) {
                    continue;
                }
            }

            visibleChoices.push({
                index: i,
                text: choice.text || '...',
            });
        }

        this.visibleChoices = visibleChoices;
        this.showChoices = true;
    }

    /**
     * Selects a choice by its index in the original choices array.
     * @param {number} index
     */
    selectChoice(index) {
        if (index < 0 || index >= this._currentChoices.length) {
            return;
        }

        const choice = this._currentChoices[index];
        eventBus.emit('choice_selected', index, choice);

        // Execute action if present
        if (choice.action && choice.action.length > 0) {
            this._executeAction(choice.action);
        }

        // Navigate to the specified dialogue index
        const nextIndex = choice.nextIndex ?? choice.next_index ?? -1;
        this._clearChoices();

        if (nextIndex >= 0 && nextIndex < this.currentDialogue.length) {
            this.currentIndex = nextIndex;
            this._showLine(this.currentIndex);
        } else {
            this.closeDialogue();
        }
    }

    /**
     * Closes the dialogue UI and cleans up state.
     */
    closeDialogue() {
        this.isActive = false;
        this._typewriterActive = false;
        this._waitingForInput = false;

        this._clearChoices();

        const speakerId = this._getCurrentSpeakerId();

        this.currentDialogue = [];
        this.currentIndex = 0;
        this.speakerName = '';
        this.portraitPath = '';
        this.fullText = '';
        this.visibleText = '';
        this.showContinueIndicator = false;

        eventBus.emit(GameEvents.DIALOGUE_ENDED);
        eventBus.emit('npc_interaction_ended', speakerId);
    }

    // ── Update Loop ─────────────────────────────────────────────────────────

    /**
     * Called every frame by the game loop.
     * @param {number} delta - Time since last frame in seconds.
     */
    update(delta) {
        if (!this.isActive) {
            return;
        }

        // Handle typewriter animation
        if (this._typewriterActive) {
            this._typewriterTimer += delta;
            const charsToShow = Math.floor(this._typewriterTimer * this.typewriterSpeed);
            if (charsToShow > this._visibleCharacters) {
                this._visibleCharacters = Math.min(charsToShow, this._totalCharacters);
                this.visibleText = this._getVisibleSlice(this.fullText, this._visibleCharacters);

                if (this._visibleCharacters >= this._totalCharacters) {
                    this._onTypewriterFinished();
                }
            }
            return;
        }

        // Handle continue indicator delay
        if (this._continueIndicatorTimer >= 0) {
            this._continueIndicatorTimer -= delta;
            if (this._continueIndicatorTimer <= 0) {
                this._continueIndicatorTimer = -1;
                if (this._waitingForInput) {
                    this.showContinueIndicator = true;
                }
            }
        }
    }

    /**
     * Handles player input (call from game loop or input handler).
     * Advances dialogue on accept/tap input when waiting for input.
     */
    handleInput() {
        if (!this.isActive) {
            return;
        }
        if (this._waitingForInput || this._typewriterActive) {
            this.advance();
        }
    }

    // ── Internal: Line Display ──────────────────────────────────────────────

    /**
     * @param {number} index
     */
    _showLine(index) {
        if (index < 0 || index >= this.currentDialogue.length) {
            this.closeDialogue();
            return;
        }

        const line = this.currentDialogue[index];

        // Speaker name
        this.speakerName = line.speaker || '';

        // Portrait
        this.portraitPath = line.portrait || '';

        // Text with typewriter effect
        this.fullText = line.text || '';
        this._startTypewriter();

        // Hide continue indicator and choices until typewriter finishes
        this.showContinueIndicator = false;
        this._clearChoices();

        eventBus.emit('dialogue_line_shown', index);
    }

    // ── Internal: Typewriter Effect ─────────────────────────────────────────

    _startTypewriter() {
        this._visibleCharacters = 0;
        this._totalCharacters = this._countVisibleCharacters(this.fullText);
        this._typewriterTimer = 0.0;
        this._typewriterActive = true;
        this._waitingForInput = false;
        this.visibleText = '';
    }

    _skipTypewriter() {
        this._typewriterActive = false;
        this._visibleCharacters = this._totalCharacters;
        this.visibleText = this._stripBBCode(this.fullText);
        this._onTypewriterFinished();
    }

    _onTypewriterFinished() {
        this._typewriterActive = false;
        this.visibleText = this._stripBBCode(this.fullText);

        const line = this.currentIndex < this.currentDialogue.length
            ? this.currentDialogue[this.currentIndex]
            : {};

        // Check for choices on this line
        const choices = line.choices || [];
        if (choices.length > 0) {
            this.showChoicesUI(choices);
        } else {
            this._waitingForInput = true;
            // Show continue indicator after a brief delay
            this._continueIndicatorTimer = this.continueIndicatorDelay;
        }
    }

    // ── Internal: Choice Handling ───────────────────────────────────────────

    _clearChoices() {
        this._currentChoices = [];
        this.visibleChoices = [];
        this.showChoices = false;
    }

    // ── Condition Evaluation ────────────────────────────────────────────────

    /**
     * Evaluates a condition string against the current game state.
     *
     * Supported conditions:
     *   "quest_completed:quest_id" - checks quest completion
     *   "has_item:item_id"         - checks player inventory
     *   "flag:flag_name"           - checks a boolean game flag
     *
     * @param {string} condition
     * @returns {boolean}
     */
    _evaluateCondition(condition) {
        if (!condition) {
            return true;
        }

        const playerData = this.gameManager?.playerData || null;

        // quest_completed:quest_id
        if (condition.startsWith('quest_completed:')) {
            const questId = condition.substring('quest_completed:'.length);
            if (playerData && typeof playerData.isQuestCompleted === 'function') {
                return playerData.isQuestCompleted(questId);
            }
            return false;
        }

        // has_item:item_id
        if (condition.startsWith('has_item:')) {
            const itemIdStr = condition.substring('has_item:'.length);
            const itemId = parseInt(itemIdStr, 10);
            if (!isNaN(itemId) && playerData && typeof playerData.hasItem === 'function') {
                return playerData.hasItem(itemId);
            }
            return false;
        }

        // flag:flag_name
        if (condition.startsWith('flag:')) {
            const flagName = condition.substring('flag:'.length);
            if (playerData && typeof playerData.getFlag === 'function') {
                return playerData.getFlag(flagName);
            }
            return false;
        }

        console.warn(`DialogueSystem: unrecognized condition '${condition}'`);
        return true;
    }

    // ── Action Execution ────────────────────────────────────────────────────

    /**
     * Executes a dialogue action string.
     *
     * Supported actions:
     *   "give_item:item_id:count"
     *   "set_flag:flag_name"
     *   "start_quest:quest_id"
     *   "heal_team"
     *
     * @param {string} action
     */
    _executeAction(action) {
        if (!action) {
            return;
        }

        const parts = action.split(':');
        const playerData = this.gameManager?.playerData || null;

        switch (parts[0]) {
            case 'give_item': {
                if (parts.length >= 2) {
                    const itemId = parseInt(parts[1], 10);
                    const count = parts.length >= 3 ? parseInt(parts[2], 10) || 1 : 1;
                    if (!isNaN(itemId)) {
                        eventBus.emit(GameEvents.ITEM_OBTAINED, { itemId, count });
                    }
                }
                break;
            }
            case 'set_flag': {
                if (parts.length >= 2 && playerData && typeof playerData.setFlag === 'function') {
                    playerData.setFlag(parts[1], true);
                }
                break;
            }
            case 'start_quest': {
                if (parts.length >= 2) {
                    eventBus.emit(GameEvents.QUEST_STARTED, parts[1]);
                }
                break;
            }
            case 'heal_team': {
                eventBus.emit('heal_team_requested');
                break;
            }
            default: {
                console.warn(`DialogueSystem: unrecognized action '${action}'`);
                break;
            }
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    /**
     * Counts visible characters excluding BBCode-like tags.
     * @param {string} bbcodeText
     * @returns {number}
     */
    _countVisibleCharacters(bbcodeText) {
        const stripped = bbcodeText.replace(/\[.*?\]/g, '');
        return stripped.length;
    }

    /**
     * Strips BBCode-like tags from text.
     * @param {string} bbcodeText
     * @returns {string}
     */
    _stripBBCode(bbcodeText) {
        return bbcodeText.replace(/\[.*?\]/g, '');
    }

    /**
     * Returns a slice of the text showing only the first N visible characters,
     * preserving any BBCode tags encountered along the way.
     * @param {string} bbcodeText
     * @param {number} visibleCount
     * @returns {string}
     */
    _getVisibleSlice(bbcodeText, visibleCount) {
        let visible = 0;
        let result = '';
        let i = 0;

        while (i < bbcodeText.length && visible < visibleCount) {
            if (bbcodeText[i] === '[') {
                // Include the entire tag
                const closeIndex = bbcodeText.indexOf(']', i);
                if (closeIndex !== -1) {
                    result += bbcodeText.substring(i, closeIndex + 1);
                    i = closeIndex + 1;
                    continue;
                }
            }
            result += bbcodeText[i];
            visible++;
            i++;
        }

        return result;
    }

    /**
     * @returns {string}
     */
    _getCurrentSpeakerId() {
        if (this.currentIndex < this.currentDialogue.length) {
            return this.currentDialogue[this.currentIndex].speaker || '';
        }
        return '';
    }
}

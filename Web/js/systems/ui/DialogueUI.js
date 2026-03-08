/**
 * DialogueUI - NPC dialogue display with typewriter text, choices, speaker name
 * Ported from Game/Scripts/World/DialogueSystem.gd
 *
 * Renders into the #dialogue-box DOM element. Provides typewriter text reveal,
 * speaker portrait, branching choice selection, conditional choices, and
 * action callbacks.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// -- Constants -------------------------------------------------------------------

const DEFAULT_TYPEWRITER_SPEED = 40; // characters per second
const CONTINUE_INDICATOR_DELAY_MS = 300;

// -- DialogueUI ------------------------------------------------------------------

export class DialogueUI {
    /**
     * @param {Object} [deps] - Optional dependency injection
     * @param {Object} [deps.gameManager] - Reference to GameManager for condition evaluation
     */
    constructor(deps = {}) {
        /** @type {Object|null} */
        this._gameManager = deps.gameManager || null;

        // -- DOM references --
        /** @type {HTMLElement|null} */
        this._dialogueBox = null;
        /** @type {HTMLElement|null} */
        this._nameLabel = null;
        /** @type {HTMLElement|null} */
        this._textLabel = null;
        /** @type {HTMLElement|null} */
        this._portraitImg = null;
        /** @type {HTMLElement|null} */
        this._choicesContainer = null;
        /** @type {HTMLElement|null} */
        this._continueIndicator = null;

        // -- Configuration --
        /** Characters revealed per second during typewriter effect */
        this.typewriterSpeed = DEFAULT_TYPEWRITER_SPEED;

        // -- State --
        /** Whether the dialogue system is currently active */
        this.isActive = false;

        /** The full dialogue sequence being played */
        this._currentDialogue = [];

        /** Index of the currently displayed line */
        this._currentIndex = 0;

        /** @private Typewriter state */
        this._visibleChars = 0;
        this._totalChars = 0;
        this._typewriterTimerId = null;
        this._typewriterActive = false;
        this._waitingForInput = false;

        /** @private Currently displayed choices */
        this._currentChoices = [];

        /** @private Bound handlers for cleanup */
        this._boundOnClick = this._onUserInput.bind(this);
        this._boundOnKeydown = this._onKeydown.bind(this);

        console.log('[DialogueUI] Created.');
    }

    // -- Initialization ----------------------------------------------------------

    /**
     * Initialize the dialogue UI by locating DOM elements.
     * Expected DOM structure in #dialogue-box:
     *   <div id="dialogue-box">
     *     <img id="dialogue-portrait" />
     *     <div id="dialogue-speaker"></div>
     *     <div id="dialogue-text"></div>
     *     <div id="dialogue-choices"></div>
     *     <div id="dialogue-continue"></div>
     *   </div>
     */
    init() {
        this._dialogueBox = document.getElementById('dialogue-box');
        if (!this._dialogueBox) {
            this._dialogueBox = this._buildDialogueBox();
        }

        this._nameLabel = this._dialogueBox.querySelector('#dialogue-speaker') ||
                           this._dialogueBox.querySelector('.dialogue-speaker');
        this._textLabel = this._dialogueBox.querySelector('#dialogue-text') ||
                          this._dialogueBox.querySelector('.dialogue-text');
        this._portraitImg = this._dialogueBox.querySelector('#dialogue-portrait') ||
                            this._dialogueBox.querySelector('.dialogue-portrait');
        this._choicesContainer = this._dialogueBox.querySelector('#dialogue-choices') ||
                                 this._dialogueBox.querySelector('.dialogue-choices');
        this._continueIndicator = this._dialogueBox.querySelector('#dialogue-continue') ||
                                  this._dialogueBox.querySelector('.dialogue-continue');

        // Ensure all elements exist (create fallbacks)
        if (!this._nameLabel) {
            this._nameLabel = document.createElement('div');
            this._nameLabel.id = 'dialogue-speaker';
            this._dialogueBox.prepend(this._nameLabel);
        }
        if (!this._textLabel) {
            this._textLabel = document.createElement('div');
            this._textLabel.id = 'dialogue-text';
            this._dialogueBox.appendChild(this._textLabel);
        }
        if (!this._portraitImg) {
            this._portraitImg = document.createElement('img');
            this._portraitImg.id = 'dialogue-portrait';
            this._dialogueBox.prepend(this._portraitImg);
        }
        if (!this._choicesContainer) {
            this._choicesContainer = document.createElement('div');
            this._choicesContainer.id = 'dialogue-choices';
            this._dialogueBox.appendChild(this._choicesContainer);
        }
        if (!this._continueIndicator) {
            this._continueIndicator = document.createElement('div');
            this._continueIndicator.id = 'dialogue-continue';
            this._continueIndicator.textContent = '\u25BC'; // Down-pointing triangle
            this._dialogueBox.appendChild(this._continueIndicator);
        }

        // Initial hidden state
        this._dialogueBox.style.display = 'none';
        this._continueIndicator.style.display = 'none';
        this._clearChoices();

        console.log('[DialogueUI] Initialized.');
    }

    /**
     * Set the game manager reference.
     * @param {Object} gameManager
     */
    setGameManager(gameManager) {
        this._gameManager = gameManager;
    }

    // -- Public API: Start Dialogue -----------------------------------------------

    /**
     * Start a dialogue sequence.
     * Each entry in dialogueData is an object with:
     *   speaker: string - name of the speaking character
     *   text: string - the dialogue text
     *   portrait: string - URL/path to the speaker's portrait image (optional)
     *   choices: Array<Object> - branching choices (optional)
     *     Each choice: { text: string, nextIndex: number, condition: string, action: string }
     *
     * @param {Array<Object>} dialogueData
     */
    startDialogue(dialogueData) {
        if (!dialogueData || dialogueData.length === 0) return;

        this._currentDialogue = dialogueData;
        this._currentIndex = 0;
        this.isActive = true;

        this._dialogueBox.style.display = '';
        this._attachInputListeners();

        eventBus.emit(GameEvents.DIALOGUE_STARTED, this._getCurrentSpeakerId());
        this._showLine(this._currentIndex);
    }

    // -- Public API: Advance ------------------------------------------------------

    /**
     * Advance to the next dialogue line, or close if at the end.
     */
    advance() {
        if (!this.isActive) return;

        // If typewriter is still animating, skip to full text
        if (this._typewriterActive) {
            this._skipTypewriter();
            return;
        }

        // If we have active choices, don't advance until one is selected
        if (this._currentChoices.length > 0) return;

        // Move to next line
        this._currentIndex += 1;
        if (this._currentIndex >= this._currentDialogue.length) {
            this.closeDialogue();
            return;
        }

        this._showLine(this._currentIndex);
    }

    // -- Public API: Show Choices ------------------------------------------------

    /**
     * Show branching choices for the current dialogue line.
     * @param {Array<Object>} choices - Array of { text, nextIndex, condition, action }
     */
    showChoices(choices) {
        this._clearChoices();
        this._currentChoices = choices;
        this._waitingForInput = false;
        this._continueIndicator.style.display = 'none';

        for (let i = 0; i < choices.length; i++) {
            const choice = choices[i];

            // Evaluate condition if present
            if (choice.condition && choice.condition.length > 0) {
                if (!this._evaluateCondition(choice.condition)) {
                    continue;
                }
            }

            const button = document.createElement('button');
            button.className = 'dialogue-choice-btn';
            button.textContent = choice.text || '...';
            Object.assign(button.style, {
                display: 'block',
                width: '100%',
                padding: '10px 16px',
                marginBottom: '6px',
                background: '#2A3D6E',
                color: '#FFFFFF',
                border: '3px solid #1A1A1A',
                borderRadius: '8px',
                fontSize: '15px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                textAlign: 'left',
                cursor: 'pointer',
            });

            const choiceIndex = i;
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this._onChoiceSelected(choiceIndex);
            });

            // Hover effect
            button.addEventListener('mouseenter', () => {
                button.style.background = '#3A5090';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = '#2A3D6E';
            });

            this._choicesContainer.appendChild(button);
        }

        this._choicesContainer.style.display = '';
    }

    // -- Public API: Close -------------------------------------------------------

    /**
     * Close the dialogue UI and clean up state.
     */
    closeDialogue() {
        const speakerId = this._getCurrentSpeakerId();

        this.isActive = false;
        this._typewriterActive = false;
        this._waitingForInput = false;
        this._stopTypewriter();
        this._detachInputListeners();

        this._dialogueBox.style.display = 'none';
        this._clearChoices();

        this._currentDialogue = [];
        this._currentIndex = 0;

        eventBus.emit(GameEvents.DIALOGUE_ENDED, speakerId);
    }

    // -- Internal: Line Display --------------------------------------------------

    /** @private */
    _showLine(index) {
        if (index < 0 || index >= this._currentDialogue.length) {
            this.closeDialogue();
            return;
        }

        const line = this._currentDialogue[index];

        // Speaker name
        const speaker = line.speaker || '';
        this._nameLabel.textContent = speaker;
        this._nameLabel.style.display = speaker ? '' : 'none';

        // Portrait
        const portraitPath = line.portrait || '';
        if (portraitPath) {
            this._portraitImg.src = portraitPath;
            this._portraitImg.style.display = '';
            this._portraitImg.onerror = () => { this._portraitImg.style.display = 'none'; };
        } else {
            this._portraitImg.style.display = 'none';
        }

        // Text with typewriter effect
        const text = line.text || '';
        this._textLabel.textContent = ''; // Clear; typewriter will reveal
        this._textLabel.dataset.fullText = text;
        this._startTypewriter(text);

        // Hide continue indicator and choices until typewriter finishes
        this._continueIndicator.style.display = 'none';
        this._clearChoices();
    }

    // -- Internal: Typewriter Effect ---------------------------------------------

    /** @private */
    _startTypewriter(text) {
        this._stopTypewriter();

        this._visibleChars = 0;
        this._totalChars = this._countVisibleChars(text);
        this._typewriterActive = true;
        this._waitingForInput = false;
        this._textLabel.textContent = '';

        if (this._totalChars === 0) {
            this._onTypewriterFinished();
            return;
        }

        const fullText = text;
        const intervalMs = 1000 / this.typewriterSpeed;

        this._typewriterTimerId = setInterval(() => {
            this._visibleChars += 1;
            this._textLabel.textContent = fullText.substring(0, this._visibleChars);

            if (this._visibleChars >= this._totalChars) {
                this._onTypewriterFinished();
            }
        }, intervalMs);
    }

    /** @private */
    _skipTypewriter() {
        this._stopTypewriter();
        this._typewriterActive = false;
        this._visibleChars = this._totalChars;

        const fullText = this._textLabel.dataset.fullText || '';
        this._textLabel.textContent = fullText;
        this._onTypewriterFinished();
    }

    /** @private */
    _stopTypewriter() {
        if (this._typewriterTimerId !== null) {
            clearInterval(this._typewriterTimerId);
            this._typewriterTimerId = null;
        }
    }

    /** @private */
    _onTypewriterFinished() {
        this._stopTypewriter();
        this._typewriterActive = false;

        const line = this._currentIndex < this._currentDialogue.length
            ? this._currentDialogue[this._currentIndex]
            : {};

        // Check for choices on this line
        const choices = line.choices || [];
        if (choices.length > 0) {
            this.showChoices(choices);
        } else {
            this._waitingForInput = true;
            // Show continue indicator after brief delay
            setTimeout(() => {
                if (this._waitingForInput && this._continueIndicator) {
                    this._continueIndicator.style.display = '';
                }
            }, CONTINUE_INDICATOR_DELAY_MS);
        }
    }

    // -- Internal: Choice Handling -----------------------------------------------

    /** @private */
    _onChoiceSelected(index) {
        if (index < 0 || index >= this._currentChoices.length) return;

        const choice = this._currentChoices[index];

        // Emit choice event
        eventBus.emit('dialogue_choice_selected', { index, choice });

        // Execute action if present
        if (choice.action) {
            this._executeAction(choice.action);
        }

        // Navigate to the specified dialogue index
        const nextIndex = choice.nextIndex !== undefined ? choice.nextIndex : -1;
        this._clearChoices();
        this._currentChoices = [];

        if (nextIndex >= 0 && nextIndex < this._currentDialogue.length) {
            this._currentIndex = nextIndex;
            this._showLine(this._currentIndex);
        } else {
            this.closeDialogue();
        }
    }

    /** @private */
    _clearChoices() {
        this._currentChoices = [];
        if (this._choicesContainer) {
            this._choicesContainer.innerHTML = '';
            this._choicesContainer.style.display = 'none';
        }
    }

    // -- Condition Evaluation ----------------------------------------------------

    /**
     * Evaluate a condition string against the current game state.
     * Supported conditions:
     *   "quest_completed:quest_id"
     *   "has_item:item_id"
     *   "flag:flag_name"
     * @private
     */
    _evaluateCondition(condition) {
        if (!condition) return true;
        if (!this._gameManager) return true;

        // quest_completed:quest_id
        if (condition.startsWith('quest_completed:')) {
            const questId = condition.substring('quest_completed:'.length);
            if (typeof this._gameManager.isQuestCompleted === 'function') {
                return this._gameManager.isQuestCompleted(questId);
            }
            return false;
        }

        // has_item:item_id
        if (condition.startsWith('has_item:')) {
            const itemIdStr = condition.substring('has_item:'.length);
            const itemId = parseInt(itemIdStr, 10);
            if (!isNaN(itemId) && typeof this._gameManager.hasItem === 'function') {
                return this._gameManager.hasItem(itemId);
            }
            return false;
        }

        // flag:flag_name
        if (condition.startsWith('flag:')) {
            const flagName = condition.substring('flag:'.length);
            if (typeof this._gameManager.getFlag === 'function') {
                return this._gameManager.getFlag(flagName);
            }
            return false;
        }

        console.warn('[DialogueUI] Unrecognized condition:', condition);
        return true;
    }

    // -- Action Execution --------------------------------------------------------

    /**
     * Execute a dialogue action string.
     * Supported actions:
     *   "give_item:item_id:count"
     *   "set_flag:flag_name"
     *   "start_quest:quest_id"
     *   "heal_team"
     * @private
     */
    _executeAction(action) {
        if (!action) return;

        const parts = action.split(':');

        switch (parts[0]) {
            case 'give_item':
                if (parts.length >= 2) {
                    const itemId = parseInt(parts[1], 10);
                    const count = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
                    if (!isNaN(itemId)) {
                        eventBus.emit(GameEvents.ITEM_OBTAINED, { itemId, itemName: `Item #${itemId}` }, count);
                    }
                }
                break;
            case 'set_flag':
                if (parts.length >= 2 && this._gameManager && typeof this._gameManager.setFlag === 'function') {
                    this._gameManager.setFlag(parts[1], true);
                }
                break;
            case 'start_quest':
                if (parts.length >= 2) {
                    eventBus.emit(GameEvents.QUEST_STARTED, { questId: parts[1] });
                }
                break;
            case 'heal_team':
                eventBus.emit('heal_team_requested');
                break;
            default:
                console.warn('[DialogueUI] Unrecognized action:', action);
        }
    }

    // -- Input Handling ----------------------------------------------------------

    /** @private */
    _attachInputListeners() {
        this._dialogueBox.addEventListener('click', this._boundOnClick);
        document.addEventListener('keydown', this._boundOnKeydown);
    }

    /** @private */
    _detachInputListeners() {
        this._dialogueBox.removeEventListener('click', this._boundOnClick);
        document.removeEventListener('keydown', this._boundOnKeydown);
    }

    /** @private */
    _onUserInput(e) {
        // Ignore clicks on choice buttons
        if (e && e.target && e.target.classList.contains('dialogue-choice-btn')) return;
        this.advance();
    }

    /** @private */
    _onKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
            e.preventDefault();
            this.advance();
        }
    }

    // -- Helpers -----------------------------------------------------------------

    /** Count visible characters, stripping simple BBCode/HTML-style tags */
    _countVisibleChars(text) {
        // Strip tags like [b], [color=...], etc.
        const stripped = text.replace(/\[.*?\]/g, '');
        return stripped.length;
    }

    /** @private */
    _getCurrentSpeakerId() {
        if (this._currentIndex < this._currentDialogue.length) {
            return this._currentDialogue[this._currentIndex].speaker || '';
        }
        return '';
    }

    // -- Fallback DOM Builder ----------------------------------------------------

    /** @private Build the dialogue box DOM structure if not found in HTML */
    _buildDialogueBox() {
        const box = document.createElement('div');
        box.id = 'dialogue-box';
        Object.assign(box.style, {
            position: 'fixed',
            bottom: '0',
            left: '0',
            width: '100%',
            maxHeight: '40%',
            background: '#1E1533',
            borderTop: '3px solid #1A1A1A',
            padding: '16px 20px',
            boxSizing: 'border-box',
            zIndex: '8000',
            display: 'none',
            fontFamily: 'Arial, Helvetica, sans-serif',
        });

        const portrait = document.createElement('img');
        portrait.id = 'dialogue-portrait';
        Object.assign(portrait.style, {
            width: '64px',
            height: '64px',
            objectFit: 'contain',
            float: 'left',
            marginRight: '12px',
            display: 'none',
        });
        box.appendChild(portrait);

        const speaker = document.createElement('div');
        speaker.id = 'dialogue-speaker';
        Object.assign(speaker.style, {
            color: '#66AAFF',
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '4px',
            fontFamily: 'Arial, Helvetica, sans-serif',
        });
        box.appendChild(speaker);

        const text = document.createElement('div');
        text.id = 'dialogue-text';
        Object.assign(text.style, {
            color: '#FFFFFF',
            fontSize: '16px',
            lineHeight: '1.5',
            minHeight: '48px',
            marginBottom: '8px',
            fontFamily: 'Arial, Helvetica, sans-serif',
        });
        box.appendChild(text);

        const choices = document.createElement('div');
        choices.id = 'dialogue-choices';
        choices.style.display = 'none';
        box.appendChild(choices);

        const indicator = document.createElement('div');
        indicator.id = 'dialogue-continue';
        Object.assign(indicator.style, {
            textAlign: 'right',
            color: '#88AADD',
            fontSize: '14px',
            fontFamily: 'Arial, Helvetica, sans-serif',
            animation: 'pulse 1.2s infinite',
            display: 'none',
        });
        indicator.textContent = '\u25BC  Tap to continue';
        box.appendChild(indicator);

        document.body.appendChild(box);
        return box;
    }
}

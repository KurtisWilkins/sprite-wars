/**
 * ScreenManager - Push/pop navigation with animated transitions (DOM-based)
 * Ported from Game/Scripts/UI/ScreenTransitionManager.gd
 *
 * Manages a navigation stack of screen names, renders screens into a
 * container div (#screen-panel), and plays slide/fade/scale transitions.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// -- Constants -------------------------------------------------------------------

const TRANSITION_DURATION_MS = 300;

// -- ScreenManager ---------------------------------------------------------------

export class ScreenManager {
    /**
     * @param {string} containerId - The ID of the container element (default: 'screen-panel')
     */
    constructor(containerId = 'screen-panel') {
        /** @type {HTMLElement|null} */
        this._container = null;

        /** @type {string} */
        this._containerId = containerId;

        /** @type {Array<string>} Navigation stack of screen names */
        this.navigationStack = [];

        /** @type {HTMLElement|null} Currently displayed screen element */
        this._currentScreen = null;

        /** @type {string|null} Name of the current screen */
        this._currentScreenName = null;

        /** @type {boolean} Whether a transition is currently playing */
        this.isTransitioning = false;

        /** @type {HTMLElement|null} Transition overlay element */
        this._overlay = null;

        /** @type {Map<string, Function>} Registered screen builder functions */
        this._screenBuilders = new Map();

        console.log('[ScreenManager] Created.');
    }

    // -- Initialization ----------------------------------------------------------

    /**
     * Initialize the screen manager by locating/creating DOM elements.
     */
    init() {
        this._container = document.getElementById(this._containerId);
        if (!this._container) {
            // Create the container if it does not exist
            this._container = document.createElement('div');
            this._container.id = this._containerId;
            this._container.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;';
            document.body.appendChild(this._container);
        }

        // Ensure the container has proper styling for transitions
        this._container.style.position = 'relative';
        this._container.style.overflow = 'hidden';

        // Create the transition overlay
        this._overlay = document.createElement('div');
        this._overlay.className = 'screen-transition-overlay';
        this._overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0);
            pointer-events: none;
            z-index: 9999;
            display: none;
            transition: background ${TRANSITION_DURATION_MS * 0.5}ms ease-in-out;
        `;
        this._container.appendChild(this._overlay);

        console.log('[ScreenManager] Initialized with container #%s.', this._containerId);
    }

    // -- Screen Registration -----------------------------------------------------

    /**
     * Register a screen builder function. When the screen is pushed, the builder
     * is called and should return an HTMLElement (the screen content).
     *
     * @param {string} screenName - Unique name for the screen
     * @param {Function} builder - A function() => HTMLElement that builds the screen
     */
    registerScreen(screenName, builder) {
        this._screenBuilders.set(screenName, builder);
    }

    // -- Public API: Push --------------------------------------------------------

    /**
     * Push a new screen onto the navigation stack.
     * @param {string} screenName - The name of the registered screen
     * @param {string} [transition='slide_left'] - Transition type
     * @param {Object} [params={}] - Optional parameters passed to the screen builder
     */
    pushScreen(screenName, transition = 'slide_left', params = {}) {
        if (this.isTransitioning) return;

        const builder = this._screenBuilders.get(screenName);
        if (!builder) {
            console.error('[ScreenManager] No screen registered for "%s".', screenName);
            return;
        }

        this.navigationStack.push(screenName);

        const newScreen = builder(params);
        if (!newScreen) {
            console.error('[ScreenManager] Builder for "%s" returned null.', screenName);
            this.navigationStack.pop();
            return;
        }

        this._playTransition(transition, () => {
            this._removeCurrentScreen();
            this._setCurrentScreen(newScreen, screenName);
        });
    }

    // -- Public API: Pop ---------------------------------------------------------

    /**
     * Pop the current screen and return to the previous one.
     * @param {string} [transition='slide_right'] - Transition type
     */
    popScreen(transition = 'slide_right') {
        if (this.isTransitioning) return;

        if (this.navigationStack.length <= 1) {
            console.warn('[ScreenManager] Cannot pop -- stack has <= 1 screen.');
            return;
        }

        this.navigationStack.pop();
        const previousName = this.navigationStack[this.navigationStack.length - 1];

        const builder = this._screenBuilders.get(previousName);
        if (!builder) {
            console.error('[ScreenManager] No screen registered for "%s".', previousName);
            return;
        }

        const previousScreen = builder({});

        this._playTransition(transition, () => {
            this._removeCurrentScreen();
            this._setCurrentScreen(previousScreen, previousName);
        });
    }

    // -- Public API: Replace -----------------------------------------------------

    /**
     * Replace the current screen without modifying the stack depth.
     * @param {string} screenName
     * @param {string} [transition='fade']
     * @param {Object} [params={}]
     */
    replaceScreen(screenName, transition = 'fade', params = {}) {
        if (this.isTransitioning) return;

        const builder = this._screenBuilders.get(screenName);
        if (!builder) {
            console.error('[ScreenManager] No screen registered for "%s".', screenName);
            return;
        }

        const newScreen = builder(params);

        if (this.navigationStack.length > 0) {
            this.navigationStack[this.navigationStack.length - 1] = screenName;
        } else {
            this.navigationStack.push(screenName);
        }

        this._playTransition(transition, () => {
            this._removeCurrentScreen();
            this._setCurrentScreen(newScreen, screenName);
        });
    }

    // -- Public API: Clear -------------------------------------------------------

    /**
     * Clear the entire navigation stack.
     */
    clearStack() {
        this.navigationStack = [];
        this._removeCurrentScreen();
    }

    // -- Public API: Query -------------------------------------------------------

    /**
     * Get the name of the current screen.
     * @returns {string}
     */
    getCurrentScreenName() {
        if (this.navigationStack.length === 0) return '';
        return this.navigationStack[this.navigationStack.length - 1];
    }

    /**
     * Get the navigation stack depth.
     * @returns {number}
     */
    getStackDepth() {
        return this.navigationStack.length;
    }

    /**
     * Check if a screen can be popped (stack has > 1 entry).
     * @returns {boolean}
     */
    canGoBack() {
        return this.navigationStack.length > 1;
    }

    // -- Transition Playback -----------------------------------------------------

    /** @private */
    _playTransition(type, onMidpoint) {
        this.isTransitioning = true;
        this._overlay.style.display = 'block';
        this._overlay.style.pointerEvents = 'all';

        switch (type) {
            case 'slide_left':
                this._transitionSlide(onMidpoint, -1);
                break;
            case 'slide_right':
                this._transitionSlide(onMidpoint, 1);
                break;
            case 'fade':
                this._transitionFade(onMidpoint);
                break;
            case 'scale_up':
                this._transitionScale(onMidpoint);
                break;
            case 'none':
                onMidpoint();
                this._finishTransition();
                return;
            default:
                this._transitionFade(onMidpoint);
                break;
        }
    }

    /** @private */
    _transitionFade(onMidpoint) {
        const halfDuration = TRANSITION_DURATION_MS * 0.5;

        // Phase 1: Fade to black
        this._overlay.style.transition = `background ${halfDuration}ms ease-in`;
        this._overlay.style.background = 'rgba(0,0,0,0)';

        // Force reflow
        void this._overlay.offsetWidth;
        this._overlay.style.background = 'rgba(0,0,0,1)';

        setTimeout(() => {
            onMidpoint();

            // Phase 2: Fade from black
            this._overlay.style.transition = `background ${halfDuration}ms ease-out`;
            this._overlay.style.background = 'rgba(0,0,0,0)';

            setTimeout(() => {
                this._finishTransition();
            }, halfDuration);
        }, halfDuration);
    }

    /** @private */
    _transitionSlide(onMidpoint, direction) {
        const halfDuration = TRANSITION_DURATION_MS * 0.5;
        const containerWidth = this._container.offsetWidth || window.innerWidth;
        const offset = direction * containerWidth;

        if (this._currentScreen) {
            // Slide the current screen out
            this._currentScreen.style.transition = `transform ${halfDuration}ms ease-in`;
            this._currentScreen.style.transform = `translateX(${offset}px)`;
        }

        setTimeout(() => {
            onMidpoint();

            // Position the new screen offscreen and slide it in
            if (this._currentScreen) {
                this._currentScreen.style.transition = 'none';
                this._currentScreen.style.transform = `translateX(${-offset}px)`;

                // Force reflow
                void this._currentScreen.offsetWidth;

                this._currentScreen.style.transition = `transform ${halfDuration}ms ease-out`;
                this._currentScreen.style.transform = 'translateX(0)';
            }

            setTimeout(() => {
                this._finishTransition();
            }, halfDuration);
        }, halfDuration);
    }

    /** @private */
    _transitionScale(onMidpoint) {
        const fadeOutDuration = TRANSITION_DURATION_MS * 0.4;
        const fadeInDuration = TRANSITION_DURATION_MS * 0.3;

        // Fade overlay to black
        this._overlay.style.transition = `background ${fadeOutDuration}ms ease-in`;
        this._overlay.style.background = 'rgba(0,0,0,0)';
        void this._overlay.offsetWidth;
        this._overlay.style.background = 'rgba(0,0,0,1)';

        setTimeout(() => {
            onMidpoint();

            // Scale the new screen in
            if (this._currentScreen) {
                this._currentScreen.style.transform = 'scale(0.8)';
                this._currentScreen.style.opacity = '0';
                void this._currentScreen.offsetWidth;
                this._currentScreen.style.transition = `transform ${fadeInDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${fadeInDuration}ms ease-out`;
                this._currentScreen.style.transform = 'scale(1)';
                this._currentScreen.style.opacity = '1';
            }

            // Fade overlay out
            this._overlay.style.transition = `background ${fadeInDuration}ms ease-out`;
            this._overlay.style.background = 'rgba(0,0,0,0)';

            setTimeout(() => {
                this._finishTransition();
            }, fadeInDuration);
        }, fadeOutDuration);
    }

    /** @private */
    _finishTransition() {
        this.isTransitioning = false;
        this._overlay.style.display = 'none';
        this._overlay.style.pointerEvents = 'none';
        this._overlay.style.background = 'rgba(0,0,0,0)';

        // Clean up any leftover inline transforms on the current screen
        if (this._currentScreen) {
            this._currentScreen.style.transition = '';
            this._currentScreen.style.transform = '';
            this._currentScreen.style.opacity = '';
        }

        const screenName = this.getCurrentScreenName();
        if (screenName) {
            eventBus.emit(GameEvents.SCREEN_OPENED, screenName);
        }
    }

    // -- Internal: Screen Lifecycle -----------------------------------------------

    /** @private */
    _removeCurrentScreen() {
        if (this._currentScreen && this._currentScreen.parentNode) {
            // Call cleanup handler if registered
            if (typeof this._currentScreen._onRemove === 'function') {
                this._currentScreen._onRemove();
            }
            this._currentScreen.parentNode.removeChild(this._currentScreen);
        }
        this._currentScreen = null;
        this._currentScreenName = null;
    }

    /** @private */
    _setCurrentScreen(element, screenName) {
        this._currentScreen = element;
        this._currentScreenName = screenName;

        // Style the screen to fill the container
        element.style.position = 'absolute';
        element.style.top = '0';
        element.style.left = '0';
        element.style.width = '100%';
        element.style.height = '100%';
        element.style.overflow = 'auto';

        // Insert before the overlay (so overlay is always on top)
        this._container.insertBefore(element, this._overlay);
    }
}

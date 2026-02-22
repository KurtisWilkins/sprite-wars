/**
 * NotificationSystem - Toast notifications, item pickups, level-ups, quest updates
 * Ported from Game/Scripts/UI/NotificationSystem.gd
 *
 * Queues notifications and shows up to maxVisible at a time with slide-in/slide-out
 * animations. Renders into the #notification-area div.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// -- Constants -------------------------------------------------------------------

const NOTIFICATION_HEIGHT_PX = 80;
const NOTIFICATION_MARGIN_PX = 12;
const NOTIFICATION_PADDING_PX = 16;
const SLIDE_DURATION_MS = 300;
const SAFE_AREA_TOP_PX = 48;

/** Type-to-color mapping (matching GDScript TYPE_COLORS) */
const TYPE_COLORS = {
    info:    { bg: 'rgba(15,38,69,0.92)',   border: '#3380e6' },
    success: { bg: 'rgba(15,57,27,0.92)',   border: '#33bf59' },
    warning: { bg: 'rgba(69,57,11,0.92)',   border: '#e6bf26' },
    error:   { bg: 'rgba(65,15,15,0.92)',   border: '#d93333' },
    reward:  { bg: 'rgba(73,57,8,0.92)',    border: '#f2bf1a' },
};

/** Style prefix mapping for special notification types */
const STYLE_PREFIXES = {
    level_up: '[LV UP] ',
    quest:    '[QUEST] ',
    item:     '',
    toast:    '',
};

// -- NotificationSystem ----------------------------------------------------------

export class NotificationSystem {
    /**
     * @param {string} containerId - ID of the notification container element (default: 'notification-area')
     */
    constructor(containerId = 'notification-area') {
        /** @type {HTMLElement|null} */
        this._container = null;

        /** @type {string} */
        this._containerId = containerId;

        /** @type {number} Maximum number of visible notifications */
        this.maxVisible = 3;

        /** @type {number} Default display duration in seconds */
        this.defaultDuration = 3.0;

        /** @type {Array<Object>} Queued notifications waiting to be shown */
        this._queue = [];

        /** @type {Array<HTMLElement>} Currently visible notification elements */
        this._active = [];

        console.log('[NotificationSystem] Created.');
    }

    // -- Initialization ----------------------------------------------------------

    /**
     * Initialize the notification system by locating/creating DOM elements and
     * wiring EventBus signals.
     */
    init() {
        this._container = document.getElementById(this._containerId);
        if (!this._container) {
            this._container = document.createElement('div');
            this._container.id = this._containerId;
            document.body.appendChild(this._container);
        }

        // Style the container
        Object.assign(this._container.style, {
            position: 'fixed',
            top: SAFE_AREA_TOP_PX + 'px',
            left: '0',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: NOTIFICATION_MARGIN_PX + 'px',
            pointerEvents: 'none',
            zIndex: '9000',
        });

        // Connect EventBus signals
        eventBus.on(GameEvents.NOTIFICATION, (message, type) => {
            this.showToast(message, type);
        });

        eventBus.on(GameEvents.ITEM_OBTAINED, (item, quantity) => {
            this._onItemAcquired(item, quantity);
        });

        eventBus.on(GameEvents.LEVEL_UP, (spriteData, newLevel) => {
            this._onLevelUp(spriteData, newLevel);
        });

        eventBus.on(GameEvents.QUEST_UPDATED, (quest, objectiveIndex) => {
            this._onQuestUpdated(quest, objectiveIndex);
        });

        console.log('[NotificationSystem] Initialized.');
    }

    // -- Public API ---------------------------------------------------------------

    /**
     * Show a simple toast notification.
     * @param {string} message
     * @param {string} [type='info'] - One of: info, success, warning, error, reward
     * @param {number} [duration] - Display duration in seconds (defaults to this.defaultDuration)
     */
    showToast(message, type = 'info', duration) {
        this._enqueue({
            message,
            type,
            duration: duration !== undefined ? duration : this.defaultDuration,
            style: 'toast',
        });
    }

    /**
     * Show an item-received notification with optional icon.
     * @param {string} itemName
     * @param {string} [iconUrl] - URL/path to icon image
     * @param {number} [quantity=1]
     */
    showItemReceived(itemName, iconUrl, quantity = 1) {
        const qtyText = quantity > 1 ? ` x${quantity}` : '';
        this._enqueue({
            message: `Received: ${itemName}${qtyText}`,
            type: 'reward',
            duration: this.defaultDuration,
            style: 'item',
            iconUrl: iconUrl || null,
        });
    }

    /**
     * Show a level-up notification.
     * @param {string} spriteName
     * @param {number} newLevel
     */
    showLevelUp(spriteName, newLevel) {
        this._enqueue({
            message: `${spriteName} reached Level ${newLevel}!`,
            type: 'success',
            duration: this.defaultDuration + 1.0,
            style: 'level_up',
        });
    }

    /**
     * Show a quest update notification.
     * @param {string} questTitle
     * @param {string} updateText
     */
    showQuestUpdate(questTitle, updateText) {
        this._enqueue({
            message: `${questTitle} -- ${updateText}`,
            type: 'info',
            duration: this.defaultDuration + 0.5,
            style: 'quest',
        });
    }

    /**
     * Dismiss all active notifications immediately.
     */
    clearAll() {
        this._queue = [];
        const activeCopy = [...this._active];
        for (const el of activeCopy) {
            this._dismissNotification(el);
        }
    }

    // -- Queue Management --------------------------------------------------------

    /** @private */
    _enqueue(data) {
        this._queue.push(data);
        this._processQueue();
    }

    /** @private */
    _processQueue() {
        while (this._active.length < this.maxVisible && this._queue.length > 0) {
            const data = this._queue.shift();
            this._spawnNotification(data);
        }
    }

    // -- Notification Creation ---------------------------------------------------

    /** @private */
    _spawnNotification(data) {
        const notif = this._createNotificationElement(data);
        this._container.appendChild(notif);
        this._active.push(notif);

        // Animate entrance
        this._animateIn(notif);

        // Auto-dismiss after duration
        const durationMs = (data.duration || this.defaultDuration) * 1000;
        notif._dismissTimerId = setTimeout(() => {
            this._dismissNotification(notif);
        }, durationMs);
    }

    /** @private */
    _createNotificationElement(data) {
        const typeStr = data.type || 'info';
        const colors = TYPE_COLORS[typeStr] || TYPE_COLORS.info;
        const prefix = STYLE_PREFIXES[data.style] || '';

        // Panel
        const panel = document.createElement('div');
        panel.className = 'notification-toast';
        Object.assign(panel.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: 'calc(100% - 32px)',
            maxWidth: '600px',
            minHeight: NOTIFICATION_HEIGHT_PX + 'px',
            padding: `${NOTIFICATION_PADDING_PX * 0.5}px ${NOTIFICATION_PADDING_PX}px`,
            background: colors.bg,
            borderLeft: `4px solid ${colors.border}`,
            borderRadius: '10px',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
            opacity: '0',
            transform: `translateY(-${NOTIFICATION_HEIGHT_PX}px)`,
            transition: `opacity ${SLIDE_DURATION_MS}ms ease-out, transform ${SLIDE_DURATION_MS}ms ease-out`,
        });

        // Icon (optional)
        if (data.iconUrl) {
            const icon = document.createElement('img');
            icon.src = data.iconUrl;
            icon.alt = '';
            Object.assign(icon.style, {
                width: '48px',
                height: '48px',
                objectFit: 'contain',
                flexShrink: '0',
            });
            icon.onerror = () => { icon.style.display = 'none'; };
            panel.appendChild(icon);
        }

        // Message label
        const label = document.createElement('span');
        label.textContent = prefix + (data.message || '');
        Object.assign(label.style, {
            color: '#ffffff',
            fontSize: '16px',
            lineHeight: '1.3',
            flex: '1',
            wordBreak: 'break-word',
        });
        panel.appendChild(label);

        // Tap to dismiss on mobile
        panel.addEventListener('click', () => {
            this._dismissNotification(panel);
        });

        return panel;
    }

    // -- Dismissal ---------------------------------------------------------------

    /** @private */
    _dismissNotification(notif) {
        if (!notif || !notif.parentNode) return;
        if (!this._active.includes(notif)) return;

        // Clear auto-dismiss timer
        if (notif._dismissTimerId) {
            clearTimeout(notif._dismissTimerId);
            notif._dismissTimerId = null;
        }

        // Animate out
        this._animateOut(notif);

        setTimeout(() => {
            const idx = this._active.indexOf(notif);
            if (idx !== -1) {
                this._active.splice(idx, 1);
            }
            if (notif.parentNode) {
                notif.parentNode.removeChild(notif);
            }
            this._processQueue();
        }, SLIDE_DURATION_MS);
    }

    // -- Animations --------------------------------------------------------------

    /** @private */
    _animateIn(notif) {
        // Start state is set in creation (opacity:0, translateY negative)
        // Force reflow to ensure the start state is applied
        void notif.offsetWidth;

        notif.style.opacity = '1';
        notif.style.transform = 'translateY(0)';
    }

    /** @private */
    _animateOut(notif) {
        notif.style.transition = `opacity ${SLIDE_DURATION_MS}ms ease-in, transform ${SLIDE_DURATION_MS}ms ease-in`;
        notif.style.opacity = '0';
        notif.style.transform = `translateY(-${NOTIFICATION_HEIGHT_PX}px)`;
    }

    // -- EventBus Handlers -------------------------------------------------------

    /** @private */
    _onItemAcquired(item, quantity) {
        const itemName = (item && item.itemName) ? item.itemName : 'Unknown Item';
        const iconUrl = (item && item.iconPath) ? item.iconPath : null;
        this.showItemReceived(itemName, iconUrl, quantity || 1);
    }

    /** @private */
    _onLevelUp(spriteData, newLevel) {
        let name = 'Sprite';
        if (spriteData) {
            name = spriteData.nickname || spriteData.displayName || `Sprite #${spriteData.instanceId || 0}`;
        }
        this.showLevelUp(name, newLevel);
    }

    /** @private */
    _onQuestUpdated(quest, _objectiveIndex) {
        const questTitle = (quest && quest.questTitle) ? quest.questTitle : 'Quest';
        this.showQuestUpdate(questTitle, 'Objective updated');
    }
}

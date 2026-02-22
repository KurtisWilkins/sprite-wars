/**
 * AuthManager - Web authentication system for Sprite Wars
 * NEW (no GDScript equivalent) - Handles login, registration, guest mode,
 * session management, and player profile data using localStorage for demo.
 * Designed with hooks for real backend integration.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// -- Simple hash for demo purposes (NOT cryptographically secure) ----------------

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to positive hex string
    return (hash >>> 0).toString(16).padStart(8, '0');
}

function hashPassword(password, salt) {
    // Double-hash with salt for slightly better demo security
    const salted = salt + ':' + password;
    const firstPass = simpleHash(salted);
    return simpleHash(firstPass + ':' + salt);
}

function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// -- Constants -------------------------------------------------------------------

const STORAGE_ACCOUNTS_KEY = 'sw_accounts';
const STORAGE_SESSION_KEY = 'sw_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 4;

// -- AuthManager -----------------------------------------------------------------

export class AuthManager {
    constructor() {
        /** @type {Object|null} Current authenticated user */
        this._currentUser = null;

        /** @type {string|null} Current session token */
        this._sessionToken = null;

        /** @type {boolean} Whether the manager has been initialized */
        this._initialized = false;

        console.log('[AuthManager] Created.');
    }

    // -- Initialization ----------------------------------------------------------

    /**
     * Initialize the auth manager. Restores session from localStorage if valid.
     */
    init() {
        this._initialized = true;
        this._restoreSession();
        console.log('[AuthManager] Initialized. Authenticated:', this.isAuthenticated());
    }

    // -- Public API: Registration ------------------------------------------------

    /**
     * Register a new account.
     * @param {string} username
     * @param {string} password
     * @param {string} [displayName] - Optional display name, defaults to username
     * @returns {{ success: boolean, error?: string, user?: Object }}
     */
    register(username, password, displayName = '') {
        // Validate username
        const usernameClean = (username || '').trim().toLowerCase();
        if (usernameClean.length < MIN_USERNAME_LENGTH) {
            return { success: false, error: `Username must be at least ${MIN_USERNAME_LENGTH} characters.` };
        }
        if (usernameClean.length > MAX_USERNAME_LENGTH) {
            return { success: false, error: `Username must be at most ${MAX_USERNAME_LENGTH} characters.` };
        }
        if (!/^[a-z0-9_]+$/.test(usernameClean)) {
            return { success: false, error: 'Username may only contain letters, numbers, and underscores.' };
        }

        // Validate password
        if (!password || password.length < MIN_PASSWORD_LENGTH) {
            return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
        }

        // Check if username already exists
        const accounts = this._loadAccounts();
        if (accounts[usernameClean]) {
            return { success: false, error: 'Username is already taken.' };
        }

        // Create account
        const salt = generateId();
        const passwordHash = hashPassword(password, salt);
        const userId = generateId();
        const now = Date.now();

        const account = {
            userId,
            username: usernameClean,
            displayName: (displayName || username).trim(),
            passwordHash,
            salt,
            isGuest: false,
            createdAt: now,
            lastLoginAt: now,
            profile: this._createDefaultProfile(displayName || username),
        };

        accounts[usernameClean] = account;
        this._saveAccounts(accounts);

        // Auto-login after registration
        this._setSession(account);

        console.log('[AuthManager] Registered new account: %s', usernameClean);
        eventBus.emit(GameEvents.AUTH_STATE_CHANGED, { type: 'register', user: this.getCurrentUser() });

        return { success: true, user: this.getCurrentUser() };
    }

    // -- Public API: Login -------------------------------------------------------

    /**
     * Log in with username and password.
     * @param {string} username
     * @param {string} password
     * @returns {{ success: boolean, error?: string, user?: Object }}
     */
    login(username, password) {
        const usernameClean = (username || '').trim().toLowerCase();

        if (!usernameClean || !password) {
            return { success: false, error: 'Username and password are required.' };
        }

        const accounts = this._loadAccounts();
        const account = accounts[usernameClean];

        if (!account) {
            return { success: false, error: 'Invalid username or password.' };
        }

        // Verify password
        const attemptHash = hashPassword(password, account.salt);
        if (attemptHash !== account.passwordHash) {
            return { success: false, error: 'Invalid username or password.' };
        }

        // Update last login
        account.lastLoginAt = Date.now();
        accounts[usernameClean] = account;
        this._saveAccounts(accounts);

        // Create session
        this._setSession(account);

        console.log('[AuthManager] Login successful: %s', usernameClean);
        eventBus.emit(GameEvents.AUTH_STATE_CHANGED, { type: 'login', user: this.getCurrentUser() });

        return { success: true, user: this.getCurrentUser() };
    }

    // -- Public API: Guest Mode --------------------------------------------------

    /**
     * Log in as a guest. Creates a temporary guest account.
     * @returns {{ success: boolean, user: Object }}
     */
    loginAsGuest() {
        const guestId = generateId();
        const guestUsername = 'guest_' + guestId.substr(0, 8);
        const now = Date.now();

        const account = {
            userId: guestId,
            username: guestUsername,
            displayName: 'Trainer',
            passwordHash: '',
            salt: '',
            isGuest: true,
            createdAt: now,
            lastLoginAt: now,
            profile: this._createDefaultProfile('Trainer'),
        };

        // Save guest account so saves can be associated with it
        const accounts = this._loadAccounts();
        accounts[guestUsername] = account;
        this._saveAccounts(accounts);

        // Create session
        this._setSession(account);

        console.log('[AuthManager] Guest login: %s', guestUsername);
        eventBus.emit(GameEvents.AUTH_STATE_CHANGED, { type: 'guest_login', user: this.getCurrentUser() });

        return { success: true, user: this.getCurrentUser() };
    }

    // -- Public API: Upgrade Guest -----------------------------------------------

    /**
     * Upgrade a guest account to a full account by setting username and password.
     * @param {string} newUsername
     * @param {string} password
     * @param {string} [displayName]
     * @returns {{ success: boolean, error?: string, user?: Object }}
     */
    upgradeGuestAccount(newUsername, password, displayName = '') {
        if (!this.isAuthenticated() || !this._currentUser.isGuest) {
            return { success: false, error: 'No guest account is active.' };
        }

        const usernameClean = (newUsername || '').trim().toLowerCase();

        // Validate
        if (usernameClean.length < MIN_USERNAME_LENGTH) {
            return { success: false, error: `Username must be at least ${MIN_USERNAME_LENGTH} characters.` };
        }
        if (usernameClean.length > MAX_USERNAME_LENGTH) {
            return { success: false, error: `Username must be at most ${MAX_USERNAME_LENGTH} characters.` };
        }
        if (!/^[a-z0-9_]+$/.test(usernameClean)) {
            return { success: false, error: 'Username may only contain letters, numbers, and underscores.' };
        }
        if (!password || password.length < MIN_PASSWORD_LENGTH) {
            return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
        }

        const accounts = this._loadAccounts();

        // Check if new username is taken (and not the current guest name)
        if (accounts[usernameClean] && usernameClean !== this._currentUser.username) {
            return { success: false, error: 'Username is already taken.' };
        }

        // Remove old guest entry
        const oldUsername = this._currentUser.username;
        const account = accounts[oldUsername];
        delete accounts[oldUsername];

        // Update account
        const salt = generateId();
        account.username = usernameClean;
        account.displayName = (displayName || newUsername).trim();
        account.passwordHash = hashPassword(password, salt);
        account.salt = salt;
        account.isGuest = false;

        accounts[usernameClean] = account;
        this._saveAccounts(accounts);

        // Refresh session
        this._setSession(account);

        console.log('[AuthManager] Guest account upgraded: %s -> %s', oldUsername, usernameClean);
        eventBus.emit(GameEvents.AUTH_STATE_CHANGED, { type: 'upgrade', user: this.getCurrentUser() });

        return { success: true, user: this.getCurrentUser() };
    }

    // -- Public API: Logout ------------------------------------------------------

    /**
     * Log out the current user and destroy the session.
     */
    logout() {
        const username = this._currentUser ? this._currentUser.username : 'unknown';
        this._currentUser = null;
        this._sessionToken = null;
        this._clearSession();

        console.log('[AuthManager] Logged out: %s', username);
        eventBus.emit(GameEvents.AUTH_STATE_CHANGED, { type: 'logout', user: null });
    }

    // -- Public API: Session Queries ---------------------------------------------

    /**
     * Check if a user is currently authenticated.
     * @returns {boolean}
     */
    isAuthenticated() {
        return this._currentUser !== null && this._sessionToken !== null;
    }

    /**
     * Check if the current user is a guest.
     * @returns {boolean}
     */
    isGuest() {
        return this._currentUser !== null && this._currentUser.isGuest === true;
    }

    /**
     * Get the current authenticated user (safe copy).
     * @returns {Object|null} { userId, username, displayName, isGuest, profile, createdAt, lastLoginAt }
     */
    getCurrentUser() {
        if (!this._currentUser) return null;
        return {
            userId: this._currentUser.userId,
            username: this._currentUser.username,
            displayName: this._currentUser.displayName,
            isGuest: this._currentUser.isGuest,
            profile: { ...this._currentUser.profile },
            createdAt: this._currentUser.createdAt,
            lastLoginAt: this._currentUser.lastLoginAt,
        };
    }

    /**
     * Get the current session token.
     * @returns {string|null}
     */
    getSessionToken() {
        return this._sessionToken;
    }

    // -- Public API: Profile Management ------------------------------------------

    /**
     * Update the current user's profile data.
     * @param {Object} profileUpdate - Partial profile object to merge
     * @returns {boolean}
     */
    updateProfile(profileUpdate) {
        if (!this.isAuthenticated()) return false;

        Object.assign(this._currentUser.profile, profileUpdate);

        // Persist to accounts store
        const accounts = this._loadAccounts();
        const account = accounts[this._currentUser.username];
        if (account) {
            account.profile = { ...this._currentUser.profile };
            accounts[this._currentUser.username] = account;
            this._saveAccounts(accounts);
        }

        eventBus.emit(GameEvents.AUTH_STATE_CHANGED, { type: 'profile_updated', user: this.getCurrentUser() });
        return true;
    }

    /**
     * Change the current user's password.
     * @param {string} currentPassword
     * @param {string} newPassword
     * @returns {{ success: boolean, error?: string }}
     */
    changePassword(currentPassword, newPassword) {
        if (!this.isAuthenticated() || this._currentUser.isGuest) {
            return { success: false, error: 'Not logged in with a full account.' };
        }

        const accounts = this._loadAccounts();
        const account = accounts[this._currentUser.username];
        if (!account) {
            return { success: false, error: 'Account not found.' };
        }

        // Verify current password
        const attemptHash = hashPassword(currentPassword, account.salt);
        if (attemptHash !== account.passwordHash) {
            return { success: false, error: 'Current password is incorrect.' };
        }

        if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
            return { success: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
        }

        // Update password
        const newSalt = generateId();
        account.salt = newSalt;
        account.passwordHash = hashPassword(newPassword, newSalt);
        accounts[this._currentUser.username] = account;
        this._saveAccounts(accounts);

        console.log('[AuthManager] Password changed for: %s', this._currentUser.username);
        return { success: true };
    }

    /**
     * Delete the current account. Requires the password for safety (guests exempt).
     * @param {string} [password] - Required for non-guest accounts
     * @returns {{ success: boolean, error?: string }}
     */
    deleteAccount(password) {
        if (!this.isAuthenticated()) {
            return { success: false, error: 'Not logged in.' };
        }

        const accounts = this._loadAccounts();
        const account = accounts[this._currentUser.username];

        // Non-guests must verify password
        if (!this._currentUser.isGuest) {
            if (!password) {
                return { success: false, error: 'Password is required to delete account.' };
            }
            const attemptHash = hashPassword(password, account.salt);
            if (attemptHash !== account.passwordHash) {
                return { success: false, error: 'Incorrect password.' };
            }
        }

        const username = this._currentUser.username;
        delete accounts[username];
        this._saveAccounts(accounts);

        // Clean up save data associated with this user
        for (let i = 0; i < 3; i++) {
            localStorage.removeItem(`sw_save_${username}_slot_${i}`);
            localStorage.removeItem(`sw_save_${username}_slot_${i}_checksum`);
            localStorage.removeItem(`sw_save_${username}_slot_${i}_backup`);
        }

        this.logout();

        console.log('[AuthManager] Account deleted: %s', username);
        return { success: true };
    }

    // -- Public API: Account List (for debug/admin) ------------------------------

    /**
     * Get a list of all registered accounts (usernames only, no passwords).
     * @returns {Array<{ username: string, displayName: string, isGuest: boolean, createdAt: number }>}
     */
    listAccounts() {
        const accounts = this._loadAccounts();
        return Object.values(accounts).map(a => ({
            username: a.username,
            displayName: a.displayName,
            isGuest: a.isGuest,
            createdAt: a.createdAt,
        }));
    }

    // -- Private: Session Management ---------------------------------------------

    /** @private */
    _setSession(account) {
        this._currentUser = account;
        this._sessionToken = generateToken();

        const sessionData = {
            token: this._sessionToken,
            username: account.username,
            expiresAt: Date.now() + SESSION_DURATION_MS,
        };

        try {
            localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionData));
        } catch (e) {
            console.warn('[AuthManager] Failed to save session to localStorage:', e);
        }
    }

    /** @private */
    _restoreSession() {
        try {
            const raw = localStorage.getItem(STORAGE_SESSION_KEY);
            if (!raw) return;

            const sessionData = JSON.parse(raw);

            // Check expiry
            if (sessionData.expiresAt < Date.now()) {
                console.log('[AuthManager] Session expired.');
                this._clearSession();
                return;
            }

            // Find the account
            const accounts = this._loadAccounts();
            const account = accounts[sessionData.username];
            if (!account) {
                console.log('[AuthManager] Session account not found.');
                this._clearSession();
                return;
            }

            this._currentUser = account;
            this._sessionToken = sessionData.token;
            console.log('[AuthManager] Session restored for: %s', account.username);
        } catch (e) {
            console.warn('[AuthManager] Failed to restore session:', e);
            this._clearSession();
        }
    }

    /** @private */
    _clearSession() {
        try {
            localStorage.removeItem(STORAGE_SESSION_KEY);
        } catch (e) {
            // Ignore
        }
    }

    // -- Private: Account Storage ------------------------------------------------

    /** @private */
    _loadAccounts() {
        try {
            const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
            if (!raw) return {};
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[AuthManager] Failed to load accounts:', e);
            return {};
        }
    }

    /** @private */
    _saveAccounts(accounts) {
        try {
            localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
        } catch (e) {
            console.error('[AuthManager] Failed to save accounts:', e);
        }
    }

    // -- Private: Default Profile ------------------------------------------------

    /** @private */
    _createDefaultProfile(displayName) {
        return {
            displayName: (displayName || 'Trainer').trim(),
            avatarId: 0,
            title: 'Novice Trainer',
            bio: '',
            favoriteElement: '',
            stats: {
                battlesWon: 0,
                battlesLost: 0,
                spritesCaught: 0,
                templesCompleted: 0,
                questsCompleted: 0,
                totalPlayTimeSeconds: 0,
            },
        };
    }
}

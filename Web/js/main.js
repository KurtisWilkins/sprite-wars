/**
 * Sprite Wars - Web Edition
 * Main entry point
 *
 * This is the bootstrap file that initializes the game engine,
 * sets up authentication, loads assets, and starts the game loop.
 */
import { Engine } from './core/Engine.js';
import { eventBus, GameEvents } from './core/EventBus.js';
import { AudioManager } from './systems/audio/AudioManager.js';

// ============================================================
// Global engine instance
// ============================================================
let engine = null;
let audioManager = null;

// ============================================================
// Authentication UI
// ============================================================
function setupAuthUI() {
    const loginScreen = document.getElementById('login-screen');
    const gameContainer = document.getElementById('game-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Login button
    document.getElementById('login-btn').addEventListener('click', async () => {
        const username = document.getElementById('username-input').value.trim();
        const password = document.getElementById('password-input').value;

        if (!username) {
            showAuthError('Please enter a username');
            return;
        }

        const authManager = await getAuthManager();
        const result = authManager.login(username, password);
        if (result.success) {
            startGame(result.user);
        } else {
            showAuthError(result.error);
        }
    });

    // Register toggle
    document.getElementById('register-btn').addEventListener('click', () => {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    document.getElementById('back-login-btn').addEventListener('click', () => {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Register submit
    document.getElementById('do-register-btn').addEventListener('click', async () => {
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;

        if (!username || username.length < 3) {
            showAuthError('Username must be at least 3 characters');
            return;
        }
        if (!password || password.length < 4) {
            showAuthError('Password must be at least 4 characters');
            return;
        }
        if (password !== confirm) {
            showAuthError('Passwords do not match');
            return;
        }

        const authManager = await getAuthManager();
        const result = authManager.register(username, password, email);
        if (result.success) {
            startGame(result.user);
        } else {
            showAuthError(result.error);
        }
    });

    // Guest play
    document.getElementById('guest-btn').addEventListener('click', async () => {
        const authManager = await getAuthManager();
        const result = authManager.loginAsGuest();
        startGame(result.user);
    });

    // Enter key on password field
    document.getElementById('password-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('login-btn').click();
    });

    // Check for existing session
    checkExistingSession();
}

let _authManagerInstance = null;
async function getAuthManager() {
    if (!_authManagerInstance) {
        const { AuthManager } = await import('./systems/backend/AuthManager.js');
        _authManagerInstance = new AuthManager();
    }
    return _authManagerInstance;
}

async function checkExistingSession() {
    const authManager = await getAuthManager();
    if (authManager.isAuthenticated()) {
        const user = authManager.getCurrentUser();
        startGame(user);
    }
}

function showAuthError(message) {
    // Create temporary error element
    const existing = document.querySelector('.auth-error');
    if (existing) existing.remove();

    const err = document.createElement('p');
    err.className = 'auth-error';
    err.style.cssText = 'color: #cc4444; text-align: center; font-size: 0.85rem; margin-top: 8px;';
    err.textContent = message;

    const activeForm = document.querySelector('.auth-form:not(.hidden)');
    if (activeForm) activeForm.appendChild(err);

    setTimeout(() => err.remove(), 3000);
}

// ============================================================
// Game Initialization
// ============================================================
async function startGame(user) {
    const loginScreen = document.getElementById('login-screen');
    const gameContainer = document.getElementById('game-container');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const loadingBar = document.getElementById('loading-bar');

    // Switch screens
    loginScreen.classList.remove('active');
    gameContainer.classList.add('active');
    loadingOverlay.classList.remove('hidden');

    // Initialize engine
    engine = new Engine('game-canvas');
    engine.audio.init();
    audioManager = new AudioManager(engine);

    // Store user data
    engine.currentUser = user;

    loadingText.textContent = 'Loading game data...';

    // Dynamically import game modules
    try {
        // Load core data modules
        loadingText.textContent = 'Loading element data...';
        loadingBar.style.width = '5%';
        const { ELEMENT_IDS, ELEMENT_NAMES, EFFECTIVENESS_CHART } = await import('./data/ElementData.js');
        engine.data = engine.data || {};
        engine.data.elements = { ids: ELEMENT_IDS, names: ELEMENT_NAMES };
        engine.data.effectivenessMatrix = EFFECTIVENESS_CHART;

        loadingText.textContent = 'Loading sprite data...';
        loadingBar.style.width = '15%';
        const spriteDataModule = await import('./data/SpriteData.js');
        engine.data.races = spriteDataModule.SPRITE_RACES;
        engine.data.evolutionData = spriteDataModule.EVOLUTION_FORMS;

        loadingText.textContent = 'Loading ability data...';
        loadingBar.style.width = '25%';
        const { ABILITIES } = await import('./data/AbilityData.js');
        engine.data.abilities = ABILITIES;

        loadingText.textContent = 'Loading status effects...';
        loadingBar.style.width = '30%';
        const { STATUS_EFFECTS } = await import('./data/StatusEffectData.js');
        const statusMap = {};
        STATUS_EFFECTS.forEach(e => { statusMap[e.effect_id] = e; });
        engine.data.statusEffects = statusMap;

        loadingText.textContent = 'Loading equipment data...';
        loadingBar.style.width = '35%';
        const { EQUIPMENT } = await import('./data/EquipmentData.js');
        engine.data.equipment = EQUIPMENT;

        loadingText.textContent = 'Loading item data...';
        loadingBar.style.width = '40%';
        const itemDataModule = await import('./data/ItemData.js');
        engine.data.consumables = itemDataModule.CONSUMABLES;
        engine.data.crystals = itemDataModule.CRYSTALS;
        engine.data.statusCures = itemDataModule.STATUS_CURES;
        engine.data.evolutionItems = itemDataModule.EVOLUTION_ITEMS;
        engine.data.keyItems = itemDataModule.KEY_ITEMS;

        loadingText.textContent = 'Loading temple data...';
        loadingBar.style.width = '45%';
        const { TEMPLES } = await import('./data/TempleData.js');
        engine.data.temples = TEMPLES;

        loadingText.textContent = 'Loading quest data...';
        loadingBar.style.width = '50%';
        const { QUESTS } = await import('./data/QuestData.js');
        engine.data.quests = QUESTS;

        loadingText.textContent = 'Loading encounter data...';
        loadingBar.style.width = '55%';
        const { ENCOUNTER_TABLES } = await import('./data/EncounterData.js');
        engine.data.encounters = ENCOUNTER_TABLES;

        loadingText.textContent = 'Loading learnset data...';
        loadingBar.style.width = '60%';
        const { LEARNSETS } = await import('./data/LearnsetData.js');
        engine.data.learnsets = LEARNSETS;

        // Load asset registry
        loadingText.textContent = 'Loading asset registry...';
        loadingBar.style.width = '65%';
        const { assetRegistry } = await import('./data/AssetRegistry.js');
        engine._assetRegistry = assetRegistry;

        // Load save manager
        loadingText.textContent = 'Loading save system...';
        loadingBar.style.width = '70%';
        const { SaveManager } = await import('./systems/backend/SaveManager.js');
        engine.saveManager = new SaveManager();

        // Load game manager
        const { GameManager } = await import('./systems/backend/GameManager.js');
        engine.gameManager = new GameManager(engine);

        // Load UI systems
        loadingText.textContent = 'Loading UI systems...';
        loadingBar.style.width = '75%';
        const { NotificationSystem } = await import('./systems/ui/NotificationSystem.js');
        engine.notifications = new NotificationSystem();

        // Preload essential assets
        loadingText.textContent = 'Loading sprites and audio...';
        loadingBar.style.width = '80%';

        // Load a minimal set of essential assets
        const essentialImages = [
            assetRegistry.getBattleBackground('overworld'),
            assetRegistry.getBattleBackground('cave'),
            assetRegistry.getBattleEffect('attack'),
            assetRegistry.getBattleEffect('heal'),
        ].filter(Boolean);

        await engine.assets.preloadBatch({
            images: essentialImages,
        }, (progress) => {
            const totalProgress = 80 + (progress * 15);
            loadingBar.style.width = `${totalProgress}%`;
        });

        // Register scenes
        loadingText.textContent = 'Initializing scenes...';
        loadingBar.style.width = '95%';

        const { MainMenuScene } = await import('./scenes/MainMenuScene.js');
        const { OverworldScene } = await import('./scenes/OverworldScene.js');
        const { BattleScene } = await import('./scenes/BattleScene.js');
        const { DeploymentScene } = await import('./scenes/DeploymentScene.js');
        const { SpriteCenterScene } = await import('./scenes/SpriteCenterScene.js');
        const { BagScene } = await import('./scenes/BagScene.js');

        engine.scenes.register('main_menu', MainMenuScene);
        engine.scenes.register('overworld', OverworldScene);
        engine.scenes.register('battle', BattleScene);
        engine.scenes.register('deployment', DeploymentScene);
        engine.scenes.register('sprite_center', SpriteCenterScene);
        engine.scenes.register('bag', BagScene);

        // Initialize game state
        engine.gameManager.init(user);

        // Load save data if exists (loadGame internally calls saveManager.loadSave)
        engine.gameManager.loadGame(0);

        loadingBar.style.width = '100%';
        loadingText.textContent = 'Ready!';

        // Short delay then show game
        await new Promise(r => setTimeout(r, 300));
        loadingOverlay.classList.add('hidden');

        // Show top HUD
        document.getElementById('top-hud').classList.remove('hidden');
        updateHUD();

        // Start game loop and go to main menu
        engine.start();
        await engine.scenes.changeTo('main_menu', { user }, false);

        console.log('Sprite Wars Web v0.1.0 initialized');

    } catch (error) {
        console.error('Failed to initialize game:', error);
        loadingText.textContent = `Error: ${error.message}. Check console for details.`;
        loadingBar.style.width = '0%';
    }
}

// ============================================================
// HUD Updates
// ============================================================
function updateHUD() {
    if (!engine || !engine.gameManager) return;
    const player = engine.gameManager.playerData;
    if (!player) return;

    document.getElementById('player-name').textContent = player.name || 'Trainer';
    document.getElementById('player-level').textContent = `Lv.${player.level || 1}`;
    document.getElementById('gold-display').textContent = `${player.gold || 0}g`;
}

// Menu button
document.getElementById('menu-btn')?.addEventListener('click', () => {
    eventBus.emit(GameEvents.SCREEN_OPENED, 'pause_menu');
});

// Update HUD on relevant events
eventBus.on(GameEvents.GOLD_CHANGED, updateHUD);
eventBus.on(GameEvents.LEVEL_UP, updateHUD);
eventBus.on(GameEvents.GAME_LOADED, updateHUD);

// ============================================================
// Boot
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    setupAuthUI();
});

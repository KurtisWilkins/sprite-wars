/**
 * MainMenuScene - Title screen with Continue, New Game, Settings, Credits.
 * Ported from Game/Scripts/UI/Screens/MainMenuScreen.gd
 *
 * Uses Canvas rendering for the animated background (particle stars, logo)
 * and DOM buttons from the #screen-panel overlay for the menu actions.
 */
import { Scene } from '../core/SceneManager.js';
import { eventBus, GameEvents } from '../core/EventBus.js';

// ── Constants ──────────────────────────────────────────────────────────────
const LOGO_Y = 160;
const TITLE_Y = 290;
const SUBTITLE_Y = 330;
const VERSION_TEXT = 'v0.1.0 Web';

const BG_COLOR = '#0d0d1e';
const STAR_COUNT = 80;
const STAR_SPEED_MIN = 4;
const STAR_SPEED_MAX = 20;

const BUTTON_DEFS = [
    { id: 'continue', label: 'Continue',  color: '#339966', hoverColor: '#3db87a' },
    { id: 'new_game', label: 'New Game',  color: '#3380e6', hoverColor: '#4a96ff' },
    { id: 'settings', label: 'Settings',  color: '#5a5a73', hoverColor: '#6e6e8c' },
    { id: 'credits',  label: 'Credits',   color: '#5a5a73', hoverColor: '#6e6e8c' },
];

const BUTTON_WIDTH = 240;
const BUTTON_HEIGHT = 44;
const BUTTON_SPACING = 14;
const BUTTON_START_Y = 400;

export class MainMenuScene extends Scene {
    constructor(engine) {
        super(engine);

        // Background stars
        this._stars = [];

        // Logo image (loaded async)
        this._logoImg = null;

        // Button state
        this._buttons = [];
        this._hoveredButton = null;

        // Fade-in animation
        this._fadeAlpha = 0;
        this._buttonFadeProgress = 0;

        // Save data detection
        this._hasSaveData = false;

        // DOM elements created by this scene
        this._domContainer = null;

        // Listeners to clean up
        this._unsubs = [];
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    async init() {
        // Pre-generate stars
        for (let i = 0; i < STAR_COUNT; i++) {
            this._stars.push(this._createStar());
        }

        // Build button metadata
        this._buttons = BUTTON_DEFS.map((def, idx) => ({
            ...def,
            x: (this.engine.designWidth - BUTTON_WIDTH) / 2,
            y: BUTTON_START_Y + idx * (BUTTON_HEIGHT + BUTTON_SPACING),
            w: BUTTON_WIDTH,
            h: BUTTON_HEIGHT,
            alpha: 0,
            offsetY: 20,
        }));

        // Try loading logo
        try {
            this._logoImg = await this.engine.assets.loadImage('Sprites/Images/Logo.png');
        } catch (_) {
            this._logoImg = null;
        }

        this.initialized = true;
    }

    enter(data) {
        this._fadeAlpha = 0;
        this._buttonFadeProgress = 0;
        this._hoveredButton = null;

        // Reset button animations
        for (const btn of this._buttons) {
            btn.alpha = 0;
            btn.offsetY = 20;
        }

        // Check for save data
        this._hasSaveData = this._detectSaveData();

        // Hide Continue if no save
        const continueBtn = this._buttons.find(b => b.id === 'continue');
        if (continueBtn) {
            continueBtn.visible = this._hasSaveData;
        }

        // Recalculate Y positions accounting for hidden continue button
        this._repositionButtons();

        // Play menu music
        this.engine.audio.playMusic(
            this.engine.assets.resolvePath('Audio/Music/TitleTheme.wav')
        );

        // Listen for settings changes
        this._unsubs.push(
            eventBus.on(GameEvents.SETTINGS_CHANGED, () => {
                // Could refresh volume sliders, etc.
            })
        );

        eventBus.emit(GameEvents.SCREEN_OPENED, 'main_menu');
    }

    exit() {
        // Clean up event listeners
        for (const unsub of this._unsubs) {
            if (typeof unsub === 'function') unsub();
        }
        this._unsubs = [];

        // Remove DOM elements if any
        if (this._domContainer && this._domContainer.parentNode) {
            this._domContainer.parentNode.removeChild(this._domContainer);
            this._domContainer = null;
        }

        eventBus.emit(GameEvents.SCREEN_CLOSED, 'main_menu');
    }

    // ── Update ─────────────────────────────────────────────────────────────

    update(dt) {
        // Fade in
        if (this._fadeAlpha < 1) {
            this._fadeAlpha = Math.min(1, this._fadeAlpha + dt * 1.6);
        }

        // Staggered button fade-in
        this._buttonFadeProgress += dt;
        for (let i = 0; i < this._buttons.length; i++) {
            const btn = this._buttons[i];
            if (btn.visible === false) continue;
            const delay = 0.3 + i * 0.1;
            const elapsed = this._buttonFadeProgress - delay;
            if (elapsed > 0) {
                const t = Math.min(1, elapsed / 0.3);
                const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
                btn.alpha = eased;
                btn.offsetY = 20 * (1 - eased);
            }
        }

        // Animate stars
        for (const star of this._stars) {
            star.y += star.speed * dt;
            star.twinkle += dt * star.twinkleSpeed;
            if (star.y > this.engine.designHeight + 5) {
                star.y = -5;
                star.x = Math.random() * this.engine.designWidth;
            }
        }

        super.update(dt);
    }

    // ── Render ─────────────────────────────────────────────────────────────

    render(renderer) {
        const ctx = renderer.ctx;

        // Background
        renderer.clear(BG_COLOR);

        // Save/restore for global alpha
        renderer.save();
        renderer.setAlpha(this._fadeAlpha);

        // Draw stars
        for (const star of this._stars) {
            const flicker = 0.5 + 0.5 * Math.sin(star.twinkle);
            const alpha = star.baseAlpha * flicker * this._fadeAlpha;
            ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw logo or title text
        if (this._logoImg && this._logoImg.complete) {
            const logoW = 200;
            const logoH = 100;
            const logoX = (this.engine.designWidth - logoW) / 2;
            renderer.drawImageRaw(this._logoImg, logoX, LOGO_Y, logoW, logoH);
        }

        // Title text (always drawn, acts as fallback if logo missing)
        renderer.drawText('SPRITE WARS', this.engine.designWidth / 2, TITLE_Y, {
            color: '#f2d966',
            font: 'bold 32px sans-serif',
            align: 'center',
            baseline: 'middle',
            shadow: true,
            shadowColor: 'rgba(242, 217, 102, 0.3)',
        });

        // Subtitle
        renderer.drawText('Legends of the Shattered Grid', this.engine.designWidth / 2, SUBTITLE_Y, {
            color: '#b0b0c8',
            font: '14px sans-serif',
            align: 'center',
            baseline: 'middle',
        });

        // Draw buttons
        for (const btn of this._buttons) {
            if (btn.visible === false) continue;
            if (btn.alpha <= 0) continue;

            renderer.save();
            renderer.setAlpha(btn.alpha * this._fadeAlpha);

            const drawY = btn.y + btn.offsetY;
            const isHovered = (this._hoveredButton === btn.id);
            const bgColor = isHovered ? btn.hoverColor : btn.color;

            // Button background with rounded corners
            this._drawRoundedRect(ctx, btn.x, drawY, btn.w, btn.h, 10, bgColor);

            // Pressed darkening
            if (isHovered && this.engine.input.isPressed()) {
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                this._fillRoundedRect(ctx, btn.x, drawY, btn.w, btn.h, 10);
            }

            // Button label
            renderer.drawText(btn.label, btn.x + btn.w / 2, drawY + btn.h / 2, {
                color: '#ffffff',
                font: 'bold 16px sans-serif',
                align: 'center',
                baseline: 'middle',
            });

            renderer.restore();
        }

        // Version label at bottom
        renderer.drawText(VERSION_TEXT, this.engine.designWidth / 2, this.engine.designHeight - 24, {
            color: '#80808c',
            font: '10px sans-serif',
            align: 'center',
            baseline: 'bottom',
        });

        renderer.restore();

        super.render(renderer);
    }

    // ── Input ──────────────────────────────────────────────────────────────

    onInput(input) {
        const px = input.pointerPos.x;
        const py = input.pointerPos.y;

        // Determine which button is hovered
        this._hoveredButton = null;
        for (const btn of this._buttons) {
            if (btn.visible === false) continue;
            const drawY = btn.y + btn.offsetY;
            if (px >= btn.x && px <= btn.x + btn.w &&
                py >= drawY && py <= drawY + btn.h) {
                this._hoveredButton = btn.id;
                break;
            }
        }

        // Handle taps
        if (input.isTap() && this._hoveredButton) {
            this.engine.audio.playSFX(
                this.engine.assets.resolvePath('Audio/Sounds/ui_click.ogg'), 0.6
            );
            this._onButtonPressed(this._hoveredButton);
        }

        // Keyboard shortcuts
        if (input.isKeyJustPressed('KeyN')) {
            this._onButtonPressed('new_game');
        }
        if (input.isKeyJustPressed('KeyC') && this._hasSaveData) {
            this._onButtonPressed('continue');
        }
        if (input.isKeyJustPressed('Escape')) {
            this._onButtonPressed('settings');
        }
    }

    // ── Button Handlers ────────────────────────────────────────────────────

    _onButtonPressed(buttonId) {
        switch (buttonId) {
            case 'continue':
                this._loadSaveAndEnterGame();
                break;

            case 'new_game':
                this._startNewGame();
                break;

            case 'settings':
                this._openSettings();
                break;

            case 'credits':
                this._openCredits();
                break;
        }
    }

    _loadSaveAndEnterGame() {
        // Load the most recent save slot from localStorage
        const saveData = this._loadMostRecentSave();
        if (!saveData) {
            this._startNewGame();
            return;
        }

        eventBus.emit(GameEvents.GAME_LOADED, saveData);

        this.engine.audio.stopMusic(400);
        this.engine.scenes.changeTo('overworld', {
            saveData,
            fromSave: true,
        });
    }

    _startNewGame() {
        // Initialize fresh game state
        const newGameData = {
            playerName: 'Trainer',
            gold: 500,
            team: [],
            collection: [],
            currentRegion: 'verdant_temple',
            questLog: [],
            playTime: 0,
            newGame: true,
        };

        eventBus.emit(GameEvents.GAME_LOADED, newGameData);

        this.engine.audio.stopMusic(400);
        this.engine.scenes.changeTo('overworld', {
            gameData: newGameData,
            fromNewGame: true,
        });
    }

    _openSettings() {
        // Push settings as a modal overlay using the screen panel DOM element
        const panel = document.getElementById('screen-panel');
        if (!panel) return;

        panel.classList.remove('hidden');
        panel.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'panel-header';

        const title = document.createElement('span');
        title.className = 'panel-title';
        title.textContent = 'Settings';

        const backBtn = document.createElement('button');
        backBtn.className = 'panel-back-btn';
        backBtn.textContent = '\u2190';
        backBtn.addEventListener('click', () => {
            panel.classList.add('hidden');
            panel.innerHTML = '';
        });

        header.appendChild(backBtn);
        header.appendChild(title);
        panel.appendChild(header);

        // Content
        const content = document.createElement('div');
        content.className = 'panel-content';

        // Master volume slider
        content.appendChild(this._createVolumeSlider('Master Volume', this.engine.audio.masterVolume, (val) => {
            this.engine.audio.setMasterVolume(val);
        }));

        // Music volume slider
        content.appendChild(this._createVolumeSlider('Music Volume', this.engine.audio.musicVolume, (val) => {
            this.engine.audio.setMusicVolume(val);
        }));

        // SFX volume slider
        content.appendChild(this._createVolumeSlider('SFX Volume', this.engine.audio.sfxVolume, (val) => {
            this.engine.audio.setSfxVolume(val);
        }));

        // Mute toggle
        const muteRow = document.createElement('div');
        muteRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-top:20px;';
        const muteLabel = document.createElement('span');
        muteLabel.style.color = 'var(--text)';
        muteLabel.textContent = 'Mute All';
        const muteToggle = document.createElement('button');
        muteToggle.className = 'btn btn-secondary';
        muteToggle.textContent = this.engine.audio.isMuted ? 'Unmute' : 'Mute';
        muteToggle.style.cssText = 'padding:8px 16px;font-size:0.85rem;';
        muteToggle.addEventListener('click', () => {
            const muted = this.engine.audio.toggleMute();
            muteToggle.textContent = muted ? 'Unmute' : 'Mute';
        });
        muteRow.appendChild(muteLabel);
        muteRow.appendChild(muteToggle);
        content.appendChild(muteRow);

        panel.appendChild(content);
    }

    _openCredits() {
        const panel = document.getElementById('screen-panel');
        if (!panel) return;

        panel.classList.remove('hidden');
        panel.innerHTML = '';

        // Header
        const header = document.createElement('div');
        header.className = 'panel-header';

        const title = document.createElement('span');
        title.className = 'panel-title';
        title.textContent = 'Credits';

        const backBtn = document.createElement('button');
        backBtn.className = 'panel-back-btn';
        backBtn.textContent = '\u2190';
        backBtn.addEventListener('click', () => {
            panel.classList.add('hidden');
            panel.innerHTML = '';
        });

        header.appendChild(backBtn);
        header.appendChild(title);
        panel.appendChild(header);

        // Credits content
        const content = document.createElement('div');
        content.className = 'panel-content';
        content.style.textAlign = 'center';

        const credits = [
            { role: 'Game Design', name: 'Sprite Wars Team' },
            { role: 'Programming', name: 'Technical Director' },
            { role: 'Art & Sprites', name: 'Art Lead & Environment Artist' },
            { role: 'Music & SFX', name: 'Sound Designer' },
            { role: 'QA & Testing', name: 'QA / Playtester' },
        ];

        for (const entry of credits) {
            const section = document.createElement('div');
            section.style.cssText = 'margin-bottom:24px;';

            const role = document.createElement('div');
            role.style.cssText = 'color:var(--primary);font-weight:700;font-size:0.85rem;margin-bottom:4px;';
            role.textContent = entry.role;

            const name = document.createElement('div');
            name.style.cssText = 'color:var(--text);font-size:1rem;';
            name.textContent = entry.name;

            section.appendChild(role);
            section.appendChild(name);
            content.appendChild(section);
        }

        const copyright = document.createElement('div');
        copyright.style.cssText = 'color:var(--text-dim);font-size:0.75rem;margin-top:40px;';
        copyright.textContent = '\u00A9 2026 Sprite Wars. All rights reserved.';
        content.appendChild(copyright);

        panel.appendChild(content);
    }

    // ── Save Data ──────────────────────────────────────────────────────────

    _detectSaveData() {
        for (let slot = 0; slot < 3; slot++) {
            const key = `sprite_wars_save_${slot}`;
            if (localStorage.getItem(key) !== null) {
                return true;
            }
        }
        return false;
    }

    _loadMostRecentSave() {
        let newest = null;
        let newestTime = 0;

        for (let slot = 0; slot < 3; slot++) {
            const key = `sprite_wars_save_${slot}`;
            const raw = localStorage.getItem(key);
            if (!raw) continue;
            try {
                const data = JSON.parse(raw);
                const saveTime = data.saveTimestamp || 0;
                if (saveTime >= newestTime) {
                    newestTime = saveTime;
                    newest = data;
                }
            } catch (_) {
                continue;
            }
        }

        return newest;
    }

    // ── Button Positioning ─────────────────────────────────────────────────

    _repositionButtons() {
        let visibleIndex = 0;
        for (const btn of this._buttons) {
            if (btn.visible === false) continue;
            btn.y = BUTTON_START_Y + visibleIndex * (BUTTON_HEIGHT + BUTTON_SPACING);
            visibleIndex++;
        }
    }

    // ── Star Factory ───────────────────────────────────────────────────────

    _createStar() {
        return {
            x: Math.random() * this.engine.designWidth,
            y: Math.random() * this.engine.designHeight,
            size: Math.random() * 1.5 + 0.5,
            speed: STAR_SPEED_MIN + Math.random() * (STAR_SPEED_MAX - STAR_SPEED_MIN),
            baseAlpha: Math.random() * 0.6 + 0.2,
            twinkle: Math.random() * Math.PI * 2,
            twinkleSpeed: 1 + Math.random() * 3,
        };
    }

    // ── Canvas Drawing Helpers ─────────────────────────────────────────────

    _drawRoundedRect(ctx, x, y, w, h, r, color) {
        ctx.fillStyle = color;
        this._fillRoundedRect(ctx, x, y, w, h, r);
    }

    _fillRoundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }

    // ── DOM Helpers ────────────────────────────────────────────────────────

    _createVolumeSlider(label, initialValue, onChange) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:16px;';

        const labelEl = document.createElement('span');
        labelEl.style.cssText = 'color:var(--text);width:110px;font-size:0.85rem;';
        labelEl.textContent = label;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = String(Math.round(initialValue * 100));
        slider.style.cssText = 'flex:1;accent-color:var(--primary);';
        slider.addEventListener('input', () => {
            onChange(parseInt(slider.value, 10) / 100);
            valueEl.textContent = slider.value + '%';
        });

        const valueEl = document.createElement('span');
        valueEl.style.cssText = 'color:var(--text-dim);width:40px;text-align:right;font-size:0.8rem;';
        valueEl.textContent = Math.round(initialValue * 100) + '%';

        row.appendChild(labelEl);
        row.appendChild(slider);
        row.appendChild(valueEl);

        return row;
    }
}

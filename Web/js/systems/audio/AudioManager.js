/**
 * AudioManager - High-level audio management
 * Ported from Game/Autoloads/AudioManager.gd
 * Wraps AudioEngine with game-specific music/SFX logic
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

export class AudioManager {
    constructor(engine) {
        this.engine = engine;
        this.audio = engine.audio;
        this._currentRegion = null;
        this._battleMusic = null;

        // Settings (loaded from save)
        this._settings = {
            masterVolume: 1.0,
            musicVolume: 0.7,
            sfxVolume: 0.8,
            muted: false
        };

        this._setupEventListeners();
    }

    _setupEventListeners() {
        eventBus.on(GameEvents.BATTLE_STARTED, (data) => {
            const track = data.isBoss ? 'boss_battle' : 'battle';
            this.playMusic(track);
        });

        eventBus.on(GameEvents.BATTLE_ENDED, (data) => {
            if (data.victory) {
                this.playMusic('victory', false);
            }
        });

        eventBus.on(GameEvents.SCENE_CHANGED, (sceneName) => {
            this._onSceneChanged(sceneName);
        });

        eventBus.on(GameEvents.UNIT_DAMAGED, () => {
            this.playSFX('hit');
        });

        eventBus.on(GameEvents.ITEM_USED, () => {
            this.playSFX('item_use');
        });

        eventBus.on(GameEvents.LEVEL_UP, () => {
            this.playSFX('recover');
        });
    }

    _onSceneChanged(sceneName) {
        const musicMap = {
            'main_menu': 'title',
            'overworld': 'overworld',
            'battle': null, // handled by BATTLE_STARTED
            'sprite_center': 'town',
            'deployment': null,
        };

        const track = musicMap[sceneName];
        if (track) {
            this.playMusic(track);
        }
    }

    playMusic(trackKey, loop = true) {
        // Use AssetRegistry to resolve track path
        const registry = this.engine._assetRegistry;
        if (registry) {
            const path = registry.getMusic(trackKey);
            if (path) {
                const resolvedPath = this.engine.assets.resolvePath(path);
                this.audio.playMusic(resolvedPath, loop);
            }
        }
    }

    playSFX(sfxKey, volume = 1.0) {
        const registry = this.engine._assetRegistry;
        if (registry) {
            const path = registry.getSfx(sfxKey);
            if (path) {
                const resolvedPath = this.engine.assets.resolvePath(path);
                this.audio.playSFX(resolvedPath, volume);
            }
        }
    }

    playRegionAmbient(regionType) {
        if (regionType === this._currentRegion) return;
        this._currentRegion = regionType;

        const ambientMap = {
            'cave': 'dungeon',
            'forest': 'forest',
            'town': 'town',
            'beach': 'overworld',
            'mountain': 'overworld',
            'swamp': 'dungeon',
            'desert': 'overworld',
            'ruins': 'dungeon',
            'temple': 'dungeon',
            'volcanic': 'dungeon',
            'plains': 'overworld',
        };

        const track = ambientMap[regionType] || 'overworld';
        this.playMusic(track);
    }

    loadSettings(settings) {
        if (!settings) return;
        this._settings = { ...this._settings, ...settings };
        this.audio.setMasterVolume(this._settings.masterVolume);
        this.audio.setMusicVolume(this._settings.musicVolume);
        this.audio.setSfxVolume(this._settings.sfxVolume);
        if (this._settings.muted) this.audio.toggleMute();
    }

    getSettings() {
        return { ...this._settings };
    }

    setMasterVolume(vol) {
        this._settings.masterVolume = vol;
        this.audio.setMasterVolume(vol);
    }

    setMusicVolume(vol) {
        this._settings.musicVolume = vol;
        this.audio.setMusicVolume(vol);
    }

    setSfxVolume(vol) {
        this._settings.sfxVolume = vol;
        this.audio.setSfxVolume(vol);
    }

    toggleMute() {
        this._settings.muted = this.audio.toggleMute();
        return this._settings.muted;
    }
}

/**
 * AudioEngine - Web Audio API wrapper for music and SFX
 * Ported from Game/Autoloads/AudioManager.gd
 */
import { eventBus, GameEvents } from './EventBus.js';

export class AudioEngine {
    constructor() {
        this._ctx = null;
        this._musicGain = null;
        this._sfxGain = null;
        this._masterGain = null;

        this._currentMusic = null;
        this._currentMusicSource = null;
        this._musicVolume = 0.7;
        this._sfxVolume = 0.8;
        this._masterVolume = 1.0;
        this._muted = false;

        // Audio element pools for SFX
        this._sfxPool = {};
        this._musicElement = null;
    }

    init() {
        // Use HTML5 Audio elements for broad compatibility
        this._musicElement = new Audio();
        this._musicElement.loop = true;
        this._updateMusicVolume();
    }

    _updateMusicVolume() {
        if (this._musicElement) {
            this._musicElement.volume = this._muted ? 0 : this._musicVolume * this._masterVolume;
        }
    }

    _getSfxVolume() {
        return this._muted ? 0 : this._sfxVolume * this._masterVolume;
    }

    // --- Music ---

    playMusic(src, loop = true) {
        if (!this._musicElement) this.init();
        if (this._currentMusic === src) return;

        this._currentMusic = src;
        this._musicElement.src = src;
        this._musicElement.loop = loop;
        this._updateMusicVolume();
        this._musicElement.play().catch(() => {
            // Autoplay blocked; will play on next user interaction
            const handler = () => {
                this._musicElement.play().catch(() => {});
                document.removeEventListener('click', handler);
                document.removeEventListener('touchstart', handler);
            };
            document.addEventListener('click', handler);
            document.addEventListener('touchstart', handler);
        });
    }

    stopMusic(fadeMs = 500) {
        if (!this._musicElement) return;
        if (fadeMs > 0) {
            const startVol = this._musicElement.volume;
            const steps = 20;
            const stepMs = fadeMs / steps;
            let step = 0;
            const interval = setInterval(() => {
                step++;
                this._musicElement.volume = startVol * (1 - step / steps);
                if (step >= steps) {
                    clearInterval(interval);
                    this._musicElement.pause();
                    this._musicElement.currentTime = 0;
                    this._musicElement.volume = startVol;
                    this._currentMusic = null;
                }
            }, stepMs);
        } else {
            this._musicElement.pause();
            this._musicElement.currentTime = 0;
            this._currentMusic = null;
        }
    }

    pauseMusic() {
        if (this._musicElement) this._musicElement.pause();
    }

    resumeMusic() {
        if (this._musicElement && this._currentMusic) {
            this._musicElement.play().catch(() => {});
        }
    }

    // --- SFX ---

    playSFX(src, volume = 1.0) {
        const audio = new Audio(src);
        audio.volume = this._getSfxVolume() * volume;
        audio.play().catch(() => {});
        return audio;
    }

    // --- Volume controls ---

    setMasterVolume(vol) {
        this._masterVolume = Math.max(0, Math.min(1, vol));
        this._updateMusicVolume();
        eventBus.emit(GameEvents.SETTINGS_CHANGED, { masterVolume: this._masterVolume });
    }

    setMusicVolume(vol) {
        this._musicVolume = Math.max(0, Math.min(1, vol));
        this._updateMusicVolume();
        eventBus.emit(GameEvents.SETTINGS_CHANGED, { musicVolume: this._musicVolume });
    }

    setSfxVolume(vol) {
        this._sfxVolume = Math.max(0, Math.min(1, vol));
        eventBus.emit(GameEvents.SETTINGS_CHANGED, { sfxVolume: this._sfxVolume });
    }

    toggleMute() {
        this._muted = !this._muted;
        this._updateMusicVolume();
        return this._muted;
    }

    get masterVolume() { return this._masterVolume; }
    get musicVolume() { return this._musicVolume; }
    get sfxVolume() { return this._sfxVolume; }
    get isMuted() { return this._muted; }
}

/**
 * WeatherSystem — Manages overworld weather effects including particles,
 * overlays, transitions, encounter rate modifiers, and battle conditions.
 * [P5-017] Supports 9 weather types with smooth transitions between states.
 *
 * Ported from Game/Scripts/World/WeatherSystem.gd
 * Adapted from Godot GPUParticles2D/ColorRect to Canvas-based rendering.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// ── WeatherSystem Class ─────────────────────────────────────────────────────

export class WeatherSystem {
    /**
     * @param {object} [config]
     * @param {string} [config.initialWeather] - Starting weather type.
     * @param {HTMLCanvasElement} [config.canvas] - Canvas for particle rendering.
     */
    constructor(config = {}) {
        // ── Configuration ───────────────────────────────────────────────

        /** Currently active weather type. */
        this.currentWeather = config.initialWeather || 'clear';

        /** Previous weather type (for transition blending). */
        this._previousWeather = 'clear';

        /** Canvas reference for particle rendering. */
        this._canvas = config.canvas || null;

        /** Canvas 2D context for particle rendering. */
        this._ctx = this._canvas ? this._canvas.getContext('2d') : null;

        // ── Weather Type Definitions ────────────────────────────────────

        /**
         * Configuration for each weather type.
         * @type {Object.<string, object>}
         */
        this.weatherConfigs = {
            clear: {
                particleTexture: '',
                color: { r: 1, g: 1, b: 1, a: 0 },
                overlayAlpha: 0.0,
                intensity: 0.0,
                wind: { x: 0, y: 0 },
                particleAmount: 0,
                particleLifetime: 1.0,
            },
            rain: {
                particleTexture: 'Sprites/Weather/rain_drop.png',
                color: { r: 0.3, g: 0.35, b: 0.5, a: 0.15 },
                overlayAlpha: 0.15,
                intensity: 1.0,
                wind: { x: -30.0, y: 200.0 },
                particleAmount: 200,
                particleLifetime: 1.5,
            },
            snow: {
                particleTexture: 'Sprites/Weather/snowflake.png',
                color: { r: 0.8, g: 0.85, b: 0.95, a: 0.1 },
                overlayAlpha: 0.1,
                intensity: 0.7,
                wind: { x: -10.0, y: 40.0 },
                particleAmount: 150,
                particleLifetime: 4.0,
            },
            sandstorm: {
                particleTexture: 'Sprites/Weather/sand_particle.png',
                color: { r: 0.7, g: 0.55, b: 0.3, a: 0.3 },
                overlayAlpha: 0.3,
                intensity: 1.5,
                wind: { x: 150.0, y: 20.0 },
                particleAmount: 300,
                particleLifetime: 2.0,
            },
            fog: {
                particleTexture: '',
                color: { r: 0.75, g: 0.78, b: 0.8, a: 0.4 },
                overlayAlpha: 0.4,
                intensity: 0.0,
                wind: { x: 5.0, y: 0.0 },
                particleAmount: 0,
                particleLifetime: 1.0,
            },
            leaves: {
                particleTexture: 'Sprites/Weather/leaf.png',
                color: { r: 0.9, g: 0.85, b: 0.7, a: 0.05 },
                overlayAlpha: 0.05,
                intensity: 0.3,
                wind: { x: 40.0, y: 30.0 },
                particleAmount: 30,
                particleLifetime: 5.0,
            },
            volcanic_ash: {
                particleTexture: 'Sprites/Weather/ash_particle.png',
                color: { r: 0.3, g: 0.25, b: 0.2, a: 0.35 },
                overlayAlpha: 0.35,
                intensity: 1.2,
                wind: { x: 10.0, y: 50.0 },
                particleAmount: 250,
                particleLifetime: 3.0,
            },
            fairy_sparkle: {
                particleTexture: 'Sprites/Weather/sparkle.png',
                color: { r: 0.9, g: 0.8, b: 1.0, a: 0.08 },
                overlayAlpha: 0.08,
                intensity: 0.4,
                wind: { x: 0.0, y: -15.0 },
                particleAmount: 60,
                particleLifetime: 3.5,
            },
            shadow_mist: {
                particleTexture: 'Sprites/Weather/shadow_wisp.png',
                color: { r: 0.15, g: 0.1, b: 0.2, a: 0.45 },
                overlayAlpha: 0.45,
                intensity: 0.6,
                wind: { x: 0.0, y: -5.0 },
                particleAmount: 80,
                particleLifetime: 4.0,
            },
        };

        // ── Encounter Rate Modifiers ────────────────────────────────────

        /**
         * How each weather type modifies the base encounter rate.
         * > 1.0 = more encounters, < 1.0 = fewer encounters.
         * @type {Object.<string, number>}
         */
        this._encounterRateModifiers = {
            clear: 1.0,
            rain: 1.2,
            snow: 0.8,
            sandstorm: 1.5,
            fog: 1.3,
            leaves: 1.0,
            volcanic_ash: 1.4,
            fairy_sparkle: 0.7,
            shadow_mist: 1.6,
        };

        // ── Battle Condition Data ───────────────────────────────────────

        /**
         * Battle conditions imposed by active weather.
         * @type {Object.<string, object>}
         */
        this._battleConditions = {
            clear: {},
            rain: {
                elementBoost: 'Water',
                elementNerf: 'Fire',
                accuracyModifier: 0.95,
            },
            snow: {
                elementBoost: 'Ice',
                elementNerf: 'Plant',
                speedModifier: 0.9,
            },
            sandstorm: {
                elementBoost: 'Earth',
                accuracyModifier: 0.85,
                dotDamagePerTurn: 5,
                dotImmuneElements: ['Earth', 'Metal'],
            },
            fog: {
                accuracyModifier: 0.80,
            },
            leaves: {},
            volcanic_ash: {
                elementBoost: 'Fire',
                elementNerf: 'Plant',
                accuracyModifier: 0.90,
            },
            fairy_sparkle: {
                elementBoost: 'Fairy',
                healingModifier: 1.2,
            },
            shadow_mist: {
                elementBoost: 'Dark',
                elementNerf: 'Light',
                accuracyModifier: 0.85,
            },
        };

        // ── Internal State ──────────────────────────────────────────────

        /** Whether a weather transition is currently in progress. */
        this._isTransitioning = false;

        /** Transition progress (0.0 to 1.0). */
        this._transitionProgress = 0.0;

        /** Total transition duration in seconds. */
        this._transitionDuration = 0.0;

        /** Transition elapsed time. */
        this._transitionElapsed = 0.0;

        /** Target weather for current transition. */
        this._transitionTarget = '';

        /** Overlay color state for transitions. */
        this._currentOverlayColor = { r: 0, g: 0, b: 0, a: 0 };

        /** Start overlay color for transition lerp. */
        this._startOverlayColor = { r: 0, g: 0, b: 0, a: 0 };

        /** Target overlay color for transition lerp. */
        this._targetOverlayColor = { r: 0, g: 0, b: 0, a: 0 };

        // ── Particle Simulation ─────────────────────────────────────────

        /**
         * Active particles for canvas-based simulation.
         * Each: { x, y, vx, vy, life, maxLife, size, alpha }
         * @type {object[]}
         */
        this._particles = [];

        /** Current particle configuration. */
        this._particleConfig = null;

        /** Whether particles are actively emitting. */
        this._emitting = false;

        /** Particle spawn accumulator. */
        this._spawnAccumulator = 0.0;

        // Apply initial weather
        this._applyWeatherImmediate(this.currentWeather);
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Transitions to a new weather type over the specified duration.
     * If transitionTime is 0, the change is applied immediately.
     *
     * @param {string} weatherType
     * @param {number} [transitionTime=1.0] - Duration in seconds.
     */
    setWeather(weatherType, transitionTime = 1.0) {
        if (weatherType === this.currentWeather) {
            return;
        }

        if (!this.weatherConfigs[weatherType]) {
            console.warn(`WeatherSystem: unknown weather type '${weatherType}'`);
            return;
        }

        this._previousWeather = this.currentWeather;
        this.currentWeather = weatherType;

        eventBus.emit('weather_changed', this._previousWeather, this.currentWeather);

        if (transitionTime <= 0.0) {
            this._applyWeatherImmediate(weatherType);
            return;
        }

        eventBus.emit('weather_transition_started', weatherType);
        this._isTransitioning = true;
        this._transitionDuration = transitionTime;
        this._transitionElapsed = 0.0;
        this._transitionTarget = weatherType;

        const config = this.weatherConfigs[weatherType];

        // Store start and target overlay colors for lerp
        this._startOverlayColor = { ...this._currentOverlayColor };
        this._targetOverlayColor = { ...config.color };

        // Start configuring particles for the new weather
        this._configureParticles(config);
    }

    /**
     * Returns the encounter rate modifier for the given weather type.
     * @param {string} weather
     * @returns {number}
     */
    getEncounterRateModifier(weather) {
        return this._encounterRateModifiers[weather] ?? 1.0;
    }

    /**
     * Returns the battle condition object for the given weather type.
     * Empty object means no weather-based battle modifiers.
     * @param {string} weather
     * @returns {object}
     */
    getBattleCondition(weather) {
        return this._battleConditions[weather] || {};
    }

    /**
     * Returns true if a weather transition is currently in progress.
     * @returns {boolean}
     */
    isTransitioning() {
        return this._isTransitioning;
    }

    // ── Update Loop ─────────────────────────────────────────────────────────

    /**
     * Called every frame by the game loop.
     * @param {number} delta - Time since last frame in seconds.
     */
    update(delta) {
        // Handle transition
        if (this._isTransitioning) {
            this._transitionElapsed += delta;
            this._transitionProgress = Math.min(
                this._transitionElapsed / this._transitionDuration,
                1.0
            );

            // Cubic ease-in-out interpolation
            const t = this._transitionProgress;
            const easedT = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

            // Lerp overlay color
            this._currentOverlayColor = {
                r: this._lerp(this._startOverlayColor.r, this._targetOverlayColor.r, easedT),
                g: this._lerp(this._startOverlayColor.g, this._targetOverlayColor.g, easedT),
                b: this._lerp(this._startOverlayColor.b, this._targetOverlayColor.b, easedT),
                a: this._lerp(this._startOverlayColor.a, this._targetOverlayColor.a, easedT),
            };

            if (this._transitionProgress >= 1.0) {
                this._isTransitioning = false;
                eventBus.emit('weather_transition_completed', this.currentWeather);
            }
        }

        // Update particle simulation
        this._updateParticles(delta);
    }

    // ── Rendering ───────────────────────────────────────────────────────────

    /**
     * Renders the weather overlay and particles to the canvas.
     * Call this after rendering the game world but before UI.
     *
     * @param {CanvasRenderingContext2D} [ctx] - Context to render to.
     *   If not provided, uses the internal canvas context.
     * @param {number} [canvasWidth]
     * @param {number} [canvasHeight]
     */
    render(ctx, canvasWidth, canvasHeight) {
        const renderCtx = ctx || this._ctx;
        if (!renderCtx) return;

        const w = canvasWidth || (this._canvas ? this._canvas.width : 0);
        const h = canvasHeight || (this._canvas ? this._canvas.height : 0);
        if (w === 0 || h === 0) return;

        // Draw overlay
        const c = this._currentOverlayColor;
        if (c.a > 0.001) {
            renderCtx.save();
            renderCtx.globalAlpha = c.a;
            renderCtx.fillStyle = `rgb(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(c.b * 255)})`;
            renderCtx.fillRect(0, 0, w, h);
            renderCtx.restore();
        }

        // Draw particles
        this._renderParticles(renderCtx);
    }

    /**
     * Returns the current overlay color for external renderers.
     * @returns {{ r: number, g: number, b: number, a: number }}
     */
    getOverlayColor() {
        return { ...this._currentOverlayColor };
    }

    /**
     * Returns a copy of the current particle array for external renderers.
     * @returns {object[]}
     */
    getParticles() {
        return this._particles.map((p) => ({ ...p }));
    }

    // ── Internal: Immediate Application ─────────────────────────────────────

    /**
     * @param {string} weatherType
     */
    _applyWeatherImmediate(weatherType) {
        const config = this.weatherConfigs[weatherType] || this.weatherConfigs.clear;

        // Apply overlay
        this._currentOverlayColor = { ...config.color };

        // Apply particles
        if (config.particleAmount > 0) {
            this._configureParticles(config);
            this._emitting = true;
        } else {
            this._emitting = false;
            this._particles = [];
        }
    }

    // ── Internal: Particle Configuration ────────────────────────────────────

    /**
     * @param {object} config
     */
    _configureParticles(config) {
        this._particleConfig = {
            wind: { ...config.wind },
            intensity: config.intensity || 0,
            amount: config.particleAmount || 0,
            lifetime: config.particleLifetime || 1.0,
            texture: config.particleTexture || '',
        };

        if (config.particleAmount > 0) {
            this._emitting = true;
        } else {
            this._emitting = false;
        }
    }

    // ── Internal: Particle Simulation ───────────────────────────────────────

    /**
     * Updates all active particles and spawns new ones.
     * @param {number} delta
     */
    _updateParticles(delta) {
        if (!this._particleConfig) return;

        // Spawn new particles
        if (this._emitting && this._particleConfig.amount > 0) {
            const spawnRate = this._particleConfig.amount / this._particleConfig.lifetime;
            this._spawnAccumulator += spawnRate * delta;

            while (this._spawnAccumulator >= 1.0 && this._particles.length < this._particleConfig.amount * 2) {
                this._spawnParticle();
                this._spawnAccumulator -= 1.0;
            }
        }

        // Update existing particles
        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.life -= delta;

            if (p.life <= 0) {
                this._particles.splice(i, 1);
                continue;
            }

            // Apply wind / velocity
            p.x += p.vx * delta;
            p.y += p.vy * delta;

            // Calculate alpha based on remaining life
            const lifeRatio = p.life / p.maxLife;
            p.alpha = lifeRatio < 0.2 ? lifeRatio / 0.2 : (lifeRatio > 0.8 ? (1.0 - lifeRatio) / 0.2 : 1.0);
        }
    }

    /**
     * Spawns a single particle at a random position along the top/sides.
     */
    _spawnParticle() {
        const config = this._particleConfig;
        if (!config) return;

        const canvasW = this._canvas ? this._canvas.width : 800;
        const canvasH = this._canvas ? this._canvas.height : 600;

        // Determine spawn position based on wind direction
        let x, y;
        if (config.wind.y > 0) {
            // Wind blowing downward -- spawn at top
            x = Math.random() * canvasW * 1.5 - canvasW * 0.25;
            y = -10;
        } else if (config.wind.y < 0) {
            // Wind blowing upward -- spawn at bottom
            x = Math.random() * canvasW * 1.5 - canvasW * 0.25;
            y = canvasH + 10;
        } else {
            // Horizontal wind -- spawn at the side
            x = config.wind.x > 0 ? -10 : canvasW + 10;
            y = Math.random() * canvasH;
        }

        const baseSpeed = config.intensity * 50.0;
        const speedVariance = config.intensity * 30.0;
        const speed = baseSpeed + Math.random() * speedVariance;

        // Normalize wind direction for velocity
        const windMag = Math.sqrt(config.wind.x * config.wind.x + config.wind.y * config.wind.y);
        let vx = 0;
        let vy = 0;
        if (windMag > 0) {
            vx = (config.wind.x / windMag) * speed + (Math.random() - 0.5) * 20;
            vy = (config.wind.y / windMag) * speed + (Math.random() - 0.5) * 20;
        } else {
            vx = (Math.random() - 0.5) * 20;
            vy = speed * 0.5 + Math.random() * speed * 0.5;
        }

        const lifetime = config.lifetime * (0.7 + Math.random() * 0.6);
        const size = 2 + Math.random() * 4;

        this._particles.push({
            x,
            y,
            vx,
            vy,
            life: lifetime,
            maxLife: lifetime,
            size,
            alpha: 1.0,
        });
    }

    /**
     * Renders particles to the canvas context.
     * @param {CanvasRenderingContext2D} ctx
     */
    _renderParticles(ctx) {
        if (this._particles.length === 0) return;

        const config = this._particleConfig;
        if (!config) return;

        ctx.save();

        for (const p of this._particles) {
            ctx.globalAlpha = p.alpha * 0.6;

            // Determine particle color based on weather type
            const weatherColor = this._getParticleColor();
            ctx.fillStyle = weatherColor;

            // For rain, draw lines; for everything else, draw circles/dots
            if (this.currentWeather === 'rain') {
                ctx.strokeStyle = weatherColor;
                ctx.lineWidth = 1;
                ctx.globalAlpha = p.alpha * 0.4;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.vx * 0.02, p.y + p.vy * 0.02);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    /**
     * Returns a CSS color string for the current weather's particles.
     * @returns {string}
     */
    _getParticleColor() {
        switch (this.currentWeather) {
            case 'rain':         return 'rgba(150, 180, 220, 0.8)';
            case 'snow':         return 'rgba(240, 245, 255, 0.9)';
            case 'sandstorm':    return 'rgba(200, 170, 100, 0.7)';
            case 'leaves':       return 'rgba(100, 160, 60, 0.8)';
            case 'volcanic_ash': return 'rgba(80, 70, 60, 0.6)';
            case 'fairy_sparkle': return 'rgba(230, 200, 255, 0.9)';
            case 'shadow_mist':  return 'rgba(40, 20, 60, 0.5)';
            default:             return 'rgba(200, 200, 200, 0.5)';
        }
    }

    // ── Utility ─────────────────────────────────────────────────────────────

    /**
     * Linear interpolation.
     * @param {number} a
     * @param {number} b
     * @param {number} t
     * @returns {number}
     */
    _lerp(a, b, t) {
        return a + (b - a) * t;
    }
}

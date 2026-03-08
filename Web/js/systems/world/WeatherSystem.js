/**
 * WeatherSystem — Manages overworld weather effects including particles,
 * overlays, transitions, encounter rate modifiers, and battle conditions.
 * [P5-017] Supports 9 weather types with smooth transitions between states.
 *
 * Ported from Game/Scripts/World/WeatherSystem.gd
 * Adapted from Godot GPUParticles2D/ColorRect to Canvas-based rendering.
 *
 * Cel-Shaded Art Style: clean rain lines, geometric snowflakes, smooth clouds,
 * and clean weather effect marks with flat fills and black outlines.
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
         * Each: { x, y, vx, vy, life, maxLife, size, alpha, wobble, rotation }
         * @type {object[]}
         */
        this._particles = [];

        /** Current particle configuration. */
        this._particleConfig = null;

        /** Whether particles are actively emitting. */
        this._emitting = false;

        /** Particle spawn accumulator. */
        this._spawnAccumulator = 0.0;

        // ── Weather Effect Marks ──────────────────────────────────────

        /**
         * Weather effect marks (wind swirls, puddles, etc.).
         * Each: { x, y, type, life, maxLife, size, rotation }
         * @type {object[]}
         */
        this._weatherMarks = [];

        /** Weather mark spawn accumulator. */
        this._markSpawnAccumulator = 0.0;

        // ── Cloud State ─────────────────────────────────────────────────

        /**
         * Clean cloud shapes for overcast weather types.
         * Each: { x, y, speed, size, bobPhase }
         * @type {object[]}
         */
        this._clouds = [];

        /** Whether clouds have been initialized. */
        this._cloudsInitialized = false;

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

        // Initialize clouds for cloud-based weather
        this._initClouds(weatherType);
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

        // Update weather effect marks
        this._updateWeatherMarks(delta);

        // Update clouds
        this._updateClouds(delta);
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

        // Draw clean clouds (behind particles)
        this._renderClouds(renderCtx, w, h);

        // Draw particles (cel-shaded style)
        this._renderParticles(renderCtx);

        // Draw weather effect marks
        this._renderWeatherMarks(renderCtx);
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

        // Initialize clouds
        this._initClouds(weatherType);
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

            // Update phase for animation
            p.wobble = (p.wobble || 0) + delta * 3;
            p.rotation = (p.rotation || 0) + delta * (p.rotSpeed || 0);

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
            wobble: Math.random() * Math.PI * 2,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 2,
        });
    }

    /**
     * Renders particles to the canvas context with clean cel-shaded style.
     * @param {CanvasRenderingContext2D} ctx
     */
    _renderParticles(ctx) {
        if (this._particles.length === 0) return;

        const config = this._particleConfig;
        if (!config) return;

        ctx.save();
        ctx.lineCap = 'round';

        for (const p of this._particles) {
            ctx.globalAlpha = p.alpha * 0.6;

            const weatherColor = this._getParticleColor();

            if (this.currentWeather === 'rain') {
                // Clean rain: straight lines with uniform thickness
                ctx.strokeStyle = weatherColor;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = p.alpha * 0.5;
                ctx.beginPath();
                const rainLen = 0.025;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.vx * rainLen, p.y + p.vy * rainLen);
                ctx.stroke();

                // Clean splash circle at end of life
                if (p.life < p.maxLife * 0.1) {
                    ctx.globalAlpha = p.alpha * 0.3;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 2, 0, Math.PI, true);
                    ctx.stroke();
                }

            } else if (this.currentWeather === 'snow') {
                // Clean geometric snowflakes
                ctx.strokeStyle = weatherColor;
                ctx.fillStyle = weatherColor;
                ctx.lineWidth = 1;
                ctx.globalAlpha = p.alpha * 0.7;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);

                if (p.size > 3.5) {
                    // Larger snowflakes: clean geometric crystal shape
                    const arms = 6;
                    const r = p.size * 0.6;
                    for (let i = 0; i < arms; i++) {
                        const angle = (Math.PI * 2 * i) / arms;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
                        ctx.stroke();
                        // Clean branch on each arm
                        const branchAngle = angle + 0.4;
                        const branchR = r * 0.4;
                        const branchStart = r * 0.5;
                        ctx.beginPath();
                        ctx.moveTo(
                            Math.cos(angle) * branchStart,
                            Math.sin(angle) * branchStart
                        );
                        ctx.lineTo(
                            Math.cos(angle) * branchStart + Math.cos(branchAngle) * branchR,
                            Math.sin(angle) * branchStart + Math.sin(branchAngle) * branchR
                        );
                        ctx.stroke();
                    }
                } else {
                    // Smaller snowflakes: clean filled circle
                    ctx.globalAlpha = p.alpha * 0.4;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = p.alpha * 0.7;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.restore();

            } else {
                // Other weather: clean filled circles
                ctx.fillStyle = weatherColor;
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

    // ── Clouds ───────────────────────────────────────────────────────────────

    /**
     * Initialize clean cloud shapes for the current weather.
     */
    _initClouds(weatherType) {
        this._clouds = [];

        // Only show clouds for certain weather types
        const cloudWeathers = ['rain', 'snow', 'fog', 'sandstorm', 'volcanic_ash', 'shadow_mist'];
        if (!cloudWeathers.includes(weatherType)) {
            this._cloudsInitialized = false;
            return;
        }

        const canvasW = this._canvas ? this._canvas.width : 800;
        const cloudCount = weatherType === 'fog' ? 8 : 4;

        for (let i = 0; i < cloudCount; i++) {
            this._clouds.push({
                x: Math.random() * canvasW * 1.3 - canvasW * 0.15,
                y: 10 + Math.random() * 60,
                speed: 5 + Math.random() * 15,
                size: 20 + Math.random() * 30,
                bobPhase: Math.random() * Math.PI * 2,
                puffs: this._generateCloudPuffs(3 + Math.floor(Math.random() * 3)),
            });
        }
        this._cloudsInitialized = true;
    }

    /**
     * Generate smooth puff shapes for a single cloud.
     */
    _generateCloudPuffs(count) {
        const puffs = [];
        for (let i = 0; i < count; i++) {
            puffs.push({
                ox: (i - count / 2) * 12 + (Math.random() - 0.5) * 6,
                oy: (Math.random() - 0.5) * 8,
                radius: 8 + Math.random() * 8,
            });
        }
        return puffs;
    }

    /**
     * Update cloud positions.
     */
    _updateClouds(delta) {
        if (this._clouds.length === 0) return;

        const canvasW = this._canvas ? this._canvas.width : 800;

        for (const cloud of this._clouds) {
            cloud.x += cloud.speed * delta;
            cloud.bobPhase += delta * 1.5;

            // Wrap around screen
            if (cloud.x > canvasW + cloud.size * 2) {
                cloud.x = -cloud.size * 2;
            }
        }
    }

    /**
     * Render clean smooth clouds with flat fill and uniform outlines.
     */
    _renderClouds(ctx, canvasWidth, canvasHeight) {
        if (this._clouds.length === 0) return;

        ctx.save();

        for (const cloud of this._clouds) {
            const bobY = Math.sin(cloud.bobPhase) * 2;

            ctx.globalAlpha = 0.18;
            ctx.fillStyle = 'rgba(220, 220, 235, 0.6)';
            ctx.strokeStyle = 'rgba(100, 100, 120, 0.3)';
            ctx.lineWidth = 1.5;

            // Draw each puff as a clean circle with flat fill
            for (const puff of cloud.puffs) {
                const px = cloud.x + puff.ox;
                const py = cloud.y + puff.oy + bobY;
                const r = puff.radius;

                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // ── Weather Effect Marks ─────────────────────────────────────────────────

    /**
     * Update and spawn weather effect marks.
     */
    _updateWeatherMarks(delta) {
        const canvasW = this._canvas ? this._canvas.width : 800;
        const canvasH = this._canvas ? this._canvas.height : 600;

        // Spawn new marks based on weather type
        const markRate = this._getMarkSpawnRate();
        if (markRate > 0) {
            this._markSpawnAccumulator += markRate * delta;
            while (this._markSpawnAccumulator >= 1.0 && this._weatherMarks.length < 20) {
                this._spawnWeatherMark(canvasW, canvasH);
                this._markSpawnAccumulator -= 1.0;
            }
        }

        // Update existing marks
        for (let i = this._weatherMarks.length - 1; i >= 0; i--) {
            const mark = this._weatherMarks[i];
            mark.life -= delta;
            if (mark.life <= 0) {
                this._weatherMarks.splice(i, 1);
                continue;
            }
            mark.rotation += delta * (mark.rotSpeed || 0);
        }
    }

    /**
     * Returns the spawn rate for weather marks based on current weather.
     */
    _getMarkSpawnRate() {
        switch (this.currentWeather) {
            case 'rain':       return 2.0;   // puddle scribbles
            case 'snow':       return 0.5;   // snowdrift marks
            case 'sandstorm':  return 3.0;   // wind swirls
            case 'fog':        return 1.0;   // wavy lines
            case 'leaves':     return 0.8;   // leaf swirl marks
            case 'volcanic_ash': return 1.5; // ash piles
            case 'fairy_sparkle': return 1.0; // sparkle annotations
            case 'shadow_mist':  return 1.2; // shadow wisps
            default:           return 0;
        }
    }

    /**
     * Spawn a single weather annotation mark.
     */
    _spawnWeatherMark(canvasW, canvasH) {
        const type = this._getMarkType();
        const lifetime = 2.0 + Math.random() * 2.0;

        this._weatherMarks.push({
            x: Math.random() * canvasW,
            y: canvasH * 0.5 + Math.random() * canvasH * 0.5, // Bottom half of screen
            type: type,
            life: lifetime,
            maxLife: lifetime,
            size: 4 + Math.random() * 8,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.5,
        });
    }

    /**
     * Returns the annotation mark type for the current weather.
     */
    _getMarkType() {
        switch (this.currentWeather) {
            case 'rain':        return Math.random() < 0.5 ? 'puddle' : 'splash';
            case 'snow':        return Math.random() < 0.5 ? 'snowdrift' : 'icecrystal';
            case 'sandstorm':   return Math.random() < 0.6 ? 'windswirl' : 'dustpile';
            case 'fog':         return 'wavyline';
            case 'leaves':      return 'leafswirl';
            case 'volcanic_ash': return Math.random() < 0.5 ? 'ashpile' : 'emberglow';
            case 'fairy_sparkle': return 'sparklenote';
            case 'shadow_mist':  return 'shadowwisp';
            default:            return 'windswirl';
        }
    }

    /**
     * Render doodle weather annotation marks.
     */
    _renderWeatherMarks(ctx) {
        if (this._weatherMarks.length === 0) return;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const mark of this._weatherMarks) {
            const alpha = Math.min(1, mark.life / (mark.maxLife * 0.3)) * 0.3;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = 'rgba(80, 80, 100, 0.5)';
            ctx.fillStyle = 'rgba(80, 80, 100, 0.2)';
            ctx.lineWidth = 1;

            ctx.save();
            ctx.translate(mark.x, mark.y);
            ctx.rotate(mark.rotation);

            switch (mark.type) {
                case 'puddle':
                    this._drawDoodlePuddle(ctx, mark.size);
                    break;
                case 'splash':
                    this._drawDoodleSplash(ctx, mark.size);
                    break;
                case 'snowdrift':
                    this._drawDoodleSnowdrift(ctx, mark.size);
                    break;
                case 'icecrystal':
                    this._drawDoodleIceCrystal(ctx, mark.size);
                    break;
                case 'windswirl':
                    this._drawDoodleWindSwirl(ctx, mark.size);
                    break;
                case 'dustpile':
                    this._drawDoodleDustPile(ctx, mark.size);
                    break;
                case 'wavyline':
                    this._drawDoodleWavyLine(ctx, mark.size);
                    break;
                case 'leafswirl':
                    this._drawDoodleLeafSwirl(ctx, mark.size);
                    break;
                case 'ashpile':
                    this._drawDoodleAshPile(ctx, mark.size);
                    break;
                case 'emberglow':
                    this._drawDoodleEmberGlow(ctx, mark.size);
                    break;
                case 'sparklenote':
                    this._drawDoodleSparkleNote(ctx, mark.size);
                    break;
                case 'shadowwisp':
                    this._drawDoodleShadowWisp(ctx, mark.size);
                    break;
            }

            ctx.restore();
        }

        ctx.restore();
    }

    // ── Doodle Mark Drawing Methods ─────────────────────────────────────────

    _drawDoodlePuddle(ctx, size) {
        // Scribble puddle: wobbly ellipse with internal lines
        ctx.beginPath();
        const points = 10;
        for (let i = 0; i <= points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const rx = size * 1.2 + (Math.random() - 0.5) * size * 0.3;
            const ry = size * 0.5 + (Math.random() - 0.5) * size * 0.15;
            const px = Math.cos(angle) * rx;
            const py = Math.sin(angle) * ry;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Internal ripple line
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.5, size * 0.2, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    _drawDoodleSplash(ctx, size) {
        // Small splash: radiating wobbly lines
        const arms = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < arms; i++) {
            const angle = (Math.PI * 2 * i) / arms + (Math.random() - 0.5) * 0.3;
            const len = size * (0.5 + Math.random() * 0.5);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(
                Math.cos(angle) * len + (Math.random() - 0.5),
                Math.sin(angle) * len + (Math.random() - 0.5)
            );
            ctx.stroke();
        }
    }

    _drawDoodleSnowdrift(ctx, size) {
        // Gentle mound shape
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.quadraticCurveTo(-size * 0.3 + (Math.random() - 0.5), -size * 0.6, 0, -size * 0.4 + (Math.random() - 0.5));
        ctx.quadraticCurveTo(size * 0.3 + (Math.random() - 0.5), -size * 0.6, size, 0);
        ctx.stroke();
    }

    _drawDoodleIceCrystal(ctx, size) {
        // Six-armed crystal
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * size + (Math.random() - 0.5), Math.sin(angle) * size + (Math.random() - 0.5));
            ctx.stroke();
        }
    }

    _drawDoodleWindSwirl(ctx, size) {
        // Spiral wind mark
        ctx.beginPath();
        const turns = 1.5;
        const steps = 15;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = t * Math.PI * 2 * turns;
            const r = t * size + (Math.random() - 0.5) * 0.8;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    _drawDoodleDustPile(ctx, size) {
        // Small cluster of dots
        for (let i = 0; i < 5; i++) {
            const dx = (Math.random() - 0.5) * size;
            const dy = (Math.random() - 0.5) * size * 0.5;
            ctx.beginPath();
            ctx.arc(dx, dy, 0.5 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    _drawDoodleWavyLine(ctx, size) {
        // Horizontal wavy line
        ctx.beginPath();
        const segments = 6;
        for (let i = 0; i <= segments; i++) {
            const px = (i / segments - 0.5) * size * 3;
            const py = Math.sin(i * 1.2) * size * 0.4 + (Math.random() - 0.5) * 0.5;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    _drawDoodleLeafSwirl(ctx, size) {
        // Curved swirl with a leaf shape at the tip
        ctx.beginPath();
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = t * Math.PI * 1.5;
            const r = t * size;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        // Small leaf at end
        const endAngle = Math.PI * 1.5;
        const endR = size;
        const lx = Math.cos(endAngle) * endR;
        const ly = Math.sin(endAngle) * endR;
        ctx.beginPath();
        ctx.ellipse(lx, ly, size * 0.3, size * 0.15, endAngle, 0, Math.PI * 2);
        ctx.stroke();
    }

    _drawDoodleAshPile(ctx, size) {
        // Small irregular mound
        ctx.beginPath();
        ctx.moveTo(-size * 0.8, 0);
        ctx.lineTo(-size * 0.4 + (Math.random() - 0.5), -size * 0.3 + (Math.random() - 0.5));
        ctx.lineTo(0 + (Math.random() - 0.5), -size * 0.4 + (Math.random() - 0.5));
        ctx.lineTo(size * 0.4 + (Math.random() - 0.5), -size * 0.2 + (Math.random() - 0.5));
        ctx.lineTo(size * 0.8, 0);
        ctx.stroke();
    }

    _drawDoodleEmberGlow(ctx, size) {
        // Small star shape
        ctx.strokeStyle = 'rgba(200, 100, 30, 0.4)';
        const arms = 4;
        for (let i = 0; i < arms; i++) {
            const angle = (Math.PI * 2 * i) / arms;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * size * 0.5, Math.sin(angle) * size * 0.5);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 150, 50, 0.3)';
        ctx.fill();
    }

    _drawDoodleSparkleNote(ctx, size) {
        // Musical-note-like sparkle
        ctx.strokeStyle = 'rgba(200, 170, 255, 0.4)';
        // Four-pointed sparkle
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i + Math.PI / 4;
            const len = i % 2 === 0 ? size : size * 0.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            ctx.stroke();
        }
    }

    _drawDoodleShadowWisp(ctx, size) {
        // Wavy dark wisp
        ctx.strokeStyle = 'rgba(30, 15, 50, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const segments = 8;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const px = t * size * 2 - size;
            const py = Math.sin(t * Math.PI * 2) * size * 0.4 + (Math.random() - 0.5) * 0.5;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
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

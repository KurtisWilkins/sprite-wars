/**
 * Engine - Core game loop and canvas management
 * Replaces Godot's MainLoop / SceneTree
 */
import { eventBus } from './EventBus.js';
import { InputManager } from './InputManager.js';
import { SceneManager } from './SceneManager.js';
import { AssetLoader } from './AssetLoader.js';
import { AudioEngine } from './AudioEngine.js';
import { Renderer } from './Renderer.js';

export class Engine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Design resolution (landscape mobile)
        this.designWidth = 960;
        this.designHeight = 540;
        this.scale = 1;

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this._fpsCounter = 0;
        this._fpsTimer = 0;
        this.running = false;
        this.paused = false;

        // Subsystems
        this.renderer = new Renderer(this.ctx, this);
        this.input = new InputManager(this.canvas, this);
        this.scenes = new SceneManager(this);
        this.assets = new AssetLoader();
        this.audio = new AudioEngine();

        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.paused = true;
                eventBus.emit('game_paused');
            } else {
                this.paused = false;
                this.lastTime = performance.now();
                eventBus.emit('game_resumed');
            }
        });
    }

    _resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;

        const scaleX = containerW / this.designWidth;
        const scaleY = containerH / this.designHeight;
        this.scale = Math.min(scaleX, scaleY);

        this.canvas.width = this.designWidth;
        this.canvas.height = this.designHeight;
        this.canvas.style.width = `${this.designWidth * this.scale}px`;
        this.canvas.style.height = `${this.designHeight * this.scale}px`;

        this.ctx.imageSmoothingEnabled = false;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this._loop(t));
    }

    stop() {
        this.running = false;
    }

    _loop(timestamp) {
        if (!this.running) return;
        requestAnimationFrame((t) => this._loop(t));

        this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = timestamp;

        // FPS counter
        this._fpsCounter++;
        this._fpsTimer += this.deltaTime;
        if (this._fpsTimer >= 1.0) {
            this.fps = this._fpsCounter;
            this._fpsCounter = 0;
            this._fpsTimer = 0;
        }

        if (!this.paused) {
            this._update(this.deltaTime);
            this._render();
        }

        this.input.endFrame();
    }

    _update(dt) {
        this.scenes.update(dt);
    }

    _render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.scenes.render(this.renderer);
    }

    getMousePos(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) / this.scale,
            y: (clientY - rect.top) / this.scale
        };
    }
}

/**
 * SceneManager - Manages game scenes/screens
 * Replaces Godot's SceneTree.change_scene_to_packed()
 */
import { eventBus, GameEvents } from './EventBus.js';

export class Scene {
    constructor(engine) {
        this.engine = engine;
        this.entities = [];
        this.initialized = false;
    }

    async init() { this.initialized = true; }
    enter(data) {}
    exit() {}
    update(dt) {
        for (const entity of this.entities) {
            if (entity.active && entity.update) entity.update(dt);
        }
    }
    render(renderer) {
        for (const entity of this.entities) {
            if (entity.visible && entity.render) entity.render(renderer);
        }
    }
    onInput(input) {}

    addEntity(entity) {
        this.entities.push(entity);
        this.entities.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        return entity;
    }

    removeEntity(entity) {
        const idx = this.entities.indexOf(entity);
        if (idx !== -1) this.entities.splice(idx, 1);
    }
}

export class SceneManager {
    constructor(engine) {
        this.engine = engine;
        this._scenes = {};
        this._currentScene = null;
        this._currentName = '';
        this._transitioning = false;
        this._sceneStack = [];
    }

    register(name, sceneClass) {
        this._scenes[name] = sceneClass;
    }

    get current() { return this._currentScene; }
    get currentName() { return this._currentName; }

    async changeTo(name, data = {}, transition = true) {
        if (this._transitioning) return;
        const SceneClass = this._scenes[name];
        if (!SceneClass) {
            console.error(`Scene "${name}" not registered`);
            return;
        }

        this._transitioning = true;

        try {
            if (transition) {
                await this._fadeOut();
            }

            // Exit current scene
            if (this._currentScene) {
                this._currentScene.exit();
            }

            // Create and init new scene
            const scene = new SceneClass(this.engine);
            if (!scene.initialized) {
                await scene.init();
            }
            scene.enter(data);

            this._currentScene = scene;
            this._currentName = name;

            if (transition) {
                await this._fadeIn();
            }

            eventBus.emit(GameEvents.SCENE_CHANGED, name, data);
        } catch (err) {
            console.error(`SceneManager: Error transitioning to "${name}":`, err);
            // Ensure fade overlay is cleared so the screen isn't stuck black
            const overlay = document.getElementById('transition-overlay');
            if (overlay) {
                overlay.classList.remove('fade-in');
                overlay.classList.add('hidden');
            }
        } finally {
            this._transitioning = false;
        }
    }

    pushScene(name, data = {}) {
        if (this._currentScene) {
            this._sceneStack.push({
                name: this._currentName,
                scene: this._currentScene
            });
        }
        return this.changeTo(name, data, true);
    }

    async popScene() {
        if (this._sceneStack.length === 0) {
            throw new Error('SceneManager: No scene to pop -- stack is empty');
        }
        const prev = this._sceneStack.pop();

        this._transitioning = true;
        try {
            await this._fadeOut();

            if (this._currentScene) this._currentScene.exit();
            prev.scene.enter({});
            this._currentScene = prev.scene;
            this._currentName = prev.name;

            await this._fadeIn();
        } catch (err) {
            console.error('SceneManager: Error during popScene:', err);
            const overlay = document.getElementById('transition-overlay');
            if (overlay) {
                overlay.classList.remove('fade-in');
                overlay.classList.add('hidden');
            }
        } finally {
            this._transitioning = false;
        }
    }

    update(dt) {
        if (this._currentScene && !this._transitioning) {
            this._currentScene.onInput(this.engine.input);
            this._currentScene.update(dt);
        }
    }

    render(renderer) {
        if (this._currentScene) {
            this._currentScene.render(renderer);
        }
    }

    async _fadeOut(duration = 400) {
        const overlay = document.getElementById('transition-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden', 'fade-out');
        overlay.classList.add('fade-in');
        await this._wait(duration);
    }

    async _fadeIn(duration = 400) {
        const overlay = document.getElementById('transition-overlay');
        if (!overlay) return;
        overlay.classList.remove('fade-in');
        overlay.classList.add('fade-out');
        await this._wait(duration);
        overlay.classList.remove('fade-out');
        overlay.classList.add('hidden');
    }

    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

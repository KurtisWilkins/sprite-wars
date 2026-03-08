/**
 * OverworldMap — Manages the tile-based overworld map, collision, encounter zones,
 * area transitions, and placed objects.
 * [P5-001] Core map system for all overworld navigation.
 *
 * Ported from Game/Scripts/World/OverworldMap.gd
 *
 * Doodle Art Style: paper texture overlay, wobbly grid lines, chibi-style
 * player/NPC rendering helpers, and decorative ambient doodle elements.
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// ── Configuration Defaults ──────────────────────────────────────────────────

/** TileMap layer index used for walkability collision checks. */
const DEFAULT_COLLISION_LAYER = 1;

/** TileMap layer index for tall grass / encounter zones. */
const DEFAULT_ENCOUNTER_LAYER = 2;

/** Grid cell size in pixels (must match TileMap tile_size). */
const DEFAULT_GRID_SIZE = 16;

// ── Doodle Art Style Constants ──────────────────────────────────────────────

/** Grain noise intensity for paper texture effect. */
const PAPER_GRAIN_ALPHA = 0.03;

/** Wobbly grid line alpha. */
const DOODLE_GRID_ALPHA = 0.06;

/** Ambient decoration spawn chance per tile during render. */
const DECO_SPAWN_CHANCE = 0.005;

// ── OverworldMap Class ──────────────────────────────────────────────────────

export class OverworldMap {
    /**
     * @param {object} [config]
     * @param {number} [config.collisionLayer] - TileMap layer index for collision.
     * @param {number} [config.encounterLayer] - TileMap layer index for encounter zones.
     * @param {number} [config.gridSize]       - Grid cell size in pixels.
     */
    constructor(config = {}) {
        // ── Configuration ───────────────────────────────────────────────
        this.collisionLayer = config.collisionLayer ?? DEFAULT_COLLISION_LAYER;
        this.encounterLayer = config.encounterLayer ?? DEFAULT_ENCOUNTER_LAYER;
        this.gridSize = config.gridSize ?? DEFAULT_GRID_SIZE;

        // ── Tile Data ───────────────────────────────────────────────────
        // Layers stored as: layers[layerIndex] = Map<"x,y" -> tileData>
        // Each tileData: { sourceId, atlasCoords: {x, y}, alternative }
        /** @type {Map<string, object>[]} */
        this._layers = [];

        // ── Runtime State ───────────────────────────────────────────────

        /**
         * Dictionary mapping area_id (String) -> rect defining trigger zones
         * for area transitions. Each rect: { x, y, w, h }
         * @type {Object.<string, {x: number, y: number, w: number, h: number}>}
         */
        this.transitionZones = {};

        /**
         * Currently placed NPC references keyed by grid key "x,y" for O(1) lookup.
         * @type {Map<string, object>}
         */
        this._npcLookup = new Map();

        /**
         * Currently placed interactable objects keyed by grid key "x,y".
         * @type {Map<string, object>}
         */
        this._objectLookup = new Map();

        /**
         * Cached map pixel bounds for camera clamping.
         * @type {{x: number, y: number, w: number, h: number}}
         */
        this.mapBoundsPx = { x: 0, y: 0, w: 0, h: 0 };

        /**
         * Current map ID.
         * @type {string}
         */
        this.currentMapId = '';

        // ── Doodle Art State ────────────────────────────────────────────

        /**
         * Cached ambient doodle decorations for the current map.
         * Each: { x, y, type, size, rotation }
         * @type {Array<object>}
         */
        this._doodleDecorations = [];

        /**
         * Whether doodle decorations have been generated for the current map.
         * @type {boolean}
         */
        this._decoGenerated = false;
    }

    // ── Map Loading ─────────────────────────────────────────────────────────

    /**
     * Loads tileset, map layers, transitions, and placed objects from a data dict.
     *
     * Expected keys:
     *   tilesetPath: string   - path/key to the tileset resource
     *   layers: Array<object> - per-layer tile data
     *     Each: { layerIndex: number, cells: Array<{ pos: {x, y}, sourceId, atlasCoords: {x,y}, alternative }> }
     *   transitions: Object   - { areaId: { x, y, w, h } }
     *   objects: Array<object> - see placeObjects()
     *   npcs: Array<object>   - NPC placement data
     *   mapId: string
     *
     * @param {object} mapData
     */
    loadMap(mapData) {
        this._clearMap();

        // Load tileset (in JS/Canvas context the tileset is handled by the renderer;
        // we store the path for reference)
        const tilesetPath = mapData.tilesetPath || mapData.tileset_path || '';
        // Tileset loading is renderer-specific; stored for external use
        this.tilesetPath = tilesetPath;

        // Populate tile layers
        const layers = mapData.layers || [];
        for (const layerData of layers) {
            const layerIndex = layerData.layerIndex ?? layerData.layer_index ?? 0;

            // Ensure layers array is large enough
            while (this._layers.length <= layerIndex) {
                this._layers.push(new Map());
            }

            const cells = layerData.cells || [];
            for (const cell of cells) {
                const pos = cell.pos || { x: 0, y: 0 };
                const key = `${pos.x},${pos.y}`;
                this._layers[layerIndex].set(key, {
                    sourceId: cell.sourceId ?? cell.source_id ?? 0,
                    atlasCoords: cell.atlasCoords ?? cell.atlas_coords ?? { x: 0, y: 0 },
                    alternative: cell.alternative ?? 0,
                });
            }
        }

        // Parse transition zones
        this.transitionZones = {};
        const transitions = mapData.transitions || {};
        for (const areaId of Object.keys(transitions)) {
            const rectData = transitions[areaId];
            this.transitionZones[areaId] = {
                x: rectData.x ?? 0,
                y: rectData.y ?? 0,
                w: rectData.w ?? 0,
                h: rectData.h ?? 0,
            };
        }

        // Place objects (chests, signs, etc.)
        const objects = mapData.objects || [];
        this.placeObjects(objects);

        // Cache map bounds
        this._updateMapBounds();

        this.currentMapId = mapData.mapId ?? mapData.map_id ?? 'unknown';

        // Generate doodle decorations for this map
        this._generateDoodleDecorations();

        eventBus.emit('map_loaded', this.currentMapId);
    }

    // ── Tile Queries ────────────────────────────────────────────────────────

    /**
     * Returns the tile source ID at the given world position on the base layer (0).
     * @param {{x: number, y: number}} worldPos
     * @returns {number} source ID, or -1 if no tile.
     */
    getTileAt(worldPos) {
        const gridPos = this.worldToGrid(worldPos);
        return this._getCellSourceId(0, gridPos);
    }

    /**
     * Returns true if the grid cell is walkable (no collision tile present).
     * @param {{x: number, y: number}} gridPos
     * @returns {boolean}
     */
    isWalkable(gridPos) {
        // A cell is walkable if the collision layer has no tile there
        const sourceId = this._getCellSourceId(this.collisionLayer, gridPos);
        if (sourceId !== -1) {
            return false;
        }

        // Also check for NPC blocking
        const key = `${gridPos.x},${gridPos.y}`;
        if (this._npcLookup.has(key)) {
            return false;
        }

        // Check for blocking objects
        if (this._objectLookup.has(key)) {
            const obj = this._objectLookup.get(key);
            if (obj && typeof obj.isBlocking === 'function' && obj.isBlocking()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Returns true if the grid cell is an encounter zone (tall grass, etc.).
     * @param {{x: number, y: number}} gridPos
     * @returns {boolean}
     */
    isEncounterZone(gridPos) {
        const sourceId = this._getCellSourceId(this.encounterLayer, gridPos);
        return sourceId !== -1;
    }

    /**
     * Returns the target area_id if the given grid position overlaps a transition
     * zone, or "" if no transition exists at that position.
     * @param {{x: number, y: number}} gridPos
     * @returns {string}
     */
    getTransitionAt(gridPos) {
        const worldX = gridPos.x * this.gridSize + this.gridSize * 0.5;
        const worldY = gridPos.y * this.gridSize + this.gridSize * 0.5;

        for (const areaId of Object.keys(this.transitionZones)) {
            const zone = this.transitionZones[areaId];
            if (
                worldX >= zone.x &&
                worldX <= zone.x + zone.w &&
                worldY >= zone.y &&
                worldY <= zone.y + zone.h
            ) {
                return areaId;
            }
        }

        return '';
    }

    /**
     * Returns the NPC at the given grid position, or null if none.
     * @param {{x: number, y: number}} gridPos
     * @returns {object|null}
     */
    getNpcAt(gridPos) {
        const key = `${gridPos.x},${gridPos.y}`;
        return this._npcLookup.get(key) || null;
    }

    /**
     * Returns the interactable object at the given grid position, or null.
     * @param {{x: number, y: number}} gridPos
     * @returns {object|null}
     */
    getObjectAt(gridPos) {
        const key = `${gridPos.x},${gridPos.y}`;
        return this._objectLookup.get(key) || null;
    }

    // ── Object Placement ────────────────────────────────────────────────────

    /**
     * Places interactable objects from an array of data dictionaries.
     * Each entry: { type: string, gridPos: {x, y}, data: object }
     *
     * In the JS/Canvas context, object instances are plain objects or class
     * instances with optional setup() and isBlocking() methods.
     *
     * @param {object[]} objects
     */
    placeObjects(objects) {
        for (const objData of objects) {
            const type = objData.type || objData.scenePath || objData.scene_path || '';
            const gridPos = objData.gridPos ?? objData.grid_pos ?? { x: 0, y: 0 };
            const data = objData.data || {};

            if (!type) {
                console.warn(`OverworldMap: object missing type at (${gridPos.x}, ${gridPos.y})`);
                continue;
            }

            // Build a plain object instance
            const instance = {
                type,
                gridPos: { x: gridPos.x, y: gridPos.y },
                position: {
                    x: gridPos.x * this.gridSize + this.gridSize * 0.5,
                    y: gridPos.y * this.gridSize + this.gridSize * 0.5,
                },
                data: { ...data },
                _blocking: data.blocking ?? false,
                isBlocking() {
                    return this._blocking;
                },
            };

            // Call setup if a factory provides one
            if (typeof objData.factory === 'function') {
                const created = objData.factory(data);
                if (created) {
                    Object.assign(instance, created);
                }
            }

            const key = `${gridPos.x},${gridPos.y}`;
            this._objectLookup.set(key, instance);
            eventBus.emit('object_placed', instance, gridPos);
        }
    }

    // ── NPC Registration ────────────────────────────────────────────────────

    /**
     * Registers an NPC at a grid position for lookup. Called by NPCController on
     * ready or whenever the NPC moves.
     * @param {object} npc
     * @param {{x: number, y: number}} gridPos
     */
    registerNpc(npc, gridPos) {
        // Remove old position if the NPC was previously registered
        for (const [key, value] of this._npcLookup) {
            if (value === npc) {
                this._npcLookup.delete(key);
                break;
            }
        }
        const newKey = `${gridPos.x},${gridPos.y}`;
        this._npcLookup.set(newKey, npc);
    }

    /**
     * Unregisters an NPC (e.g. when removed from the scene).
     * @param {object} npc
     */
    unregisterNpc(npc) {
        for (const [key, value] of this._npcLookup) {
            if (value === npc) {
                this._npcLookup.delete(key);
                return;
            }
        }
    }

    // ── Coordinate Helpers ──────────────────────────────────────────────────

    /**
     * Converts a world position to a grid position.
     * @param {{x: number, y: number}} worldPos
     * @returns {{x: number, y: number}}
     */
    worldToGrid(worldPos) {
        return {
            x: Math.floor(worldPos.x / this.gridSize),
            y: Math.floor(worldPos.y / this.gridSize),
        };
    }

    /**
     * Converts a grid position to a centered world position.
     * @param {{x: number, y: number}} gridPos
     * @returns {{x: number, y: number}}
     */
    gridToWorld(gridPos) {
        return {
            x: gridPos.x * this.gridSize + this.gridSize * 0.5,
            y: gridPos.y * this.gridSize + this.gridSize * 0.5,
        };
    }

    // ── Layer Data Access (for rendering) ───────────────────────────────────

    /**
     * Returns the tile data at a specific layer and grid position.
     * @param {number} layerIndex
     * @param {{x: number, y: number}} gridPos
     * @returns {object|null} Tile data or null if no tile.
     */
    getTileData(layerIndex, gridPos) {
        if (layerIndex < 0 || layerIndex >= this._layers.length) {
            return null;
        }
        const key = `${gridPos.x},${gridPos.y}`;
        return this._layers[layerIndex].get(key) || null;
    }

    /**
     * Returns all tiles on a given layer.
     * @param {number} layerIndex
     * @returns {Map<string, object>} Map of "x,y" -> tileData
     */
    getLayerTiles(layerIndex) {
        if (layerIndex < 0 || layerIndex >= this._layers.length) {
            return new Map();
        }
        return this._layers[layerIndex];
    }

    /**
     * Returns the number of tile layers.
     * @returns {number}
     */
    getLayerCount() {
        return this._layers.length;
    }

    // ── Doodle Art Style Rendering ──────────────────────────────────────────

    /**
     * Renders the doodle overlay effects on top of already-rendered tiles.
     * Call this after the tile renderer has drawn the base map.
     *
     * @param {CanvasRenderingContext2D} ctx
     * @param {{x: number, y: number}} cameraOffset - Camera scroll offset in pixels
     * @param {number} viewWidth - Visible viewport width in pixels
     * @param {number} viewHeight - Visible viewport height in pixels
     */
    renderDoodleOverlay(ctx, cameraOffset, viewWidth, viewHeight) {
        ctx.save();

        // 1. Paper texture: subtle grain overlay
        this._renderPaperGrain(ctx, viewWidth, viewHeight);

        // 2. Doodle grid lines: wobbly hand-drawn grid over tiles
        this._renderDoodleGrid(ctx, cameraOffset, viewWidth, viewHeight);

        // 3. Ambient doodle decorations (flowers, clouds, etc.)
        this._renderDoodleDecorations(ctx, cameraOffset, viewWidth, viewHeight);

        ctx.restore();
    }

    /**
     * Renders a doodle-style chibi player character on the overworld.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX - Screen X position (center)
     * @param {number} screenY - Screen Y position (center)
     * @param {object} [options]
     * @param {string} [options.color='#4488ff'] - Player base color
     * @param {number} [options.direction=0] - Facing direction (0=down, 1=left, 2=right, 3=up)
     * @param {number} [options.bobPhase=0] - Walk cycle phase for bounce
     */
    renderDoodlePlayer(ctx, screenX, screenY, options = {}) {
        const color = options.color || '#4488ff';
        const dir = options.direction || 0;
        const bob = options.bobPhase || 0;
        const bounceY = Math.sin(bob * Math.PI * 2) * 1.5;

        ctx.save();
        ctx.translate(screenX, screenY + bounceY);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Chibi proportions: oversized head, small body
        const headR = this.gridSize * 0.35;
        const bodyH = this.gridSize * 0.25;

        // Body (small rectangle with wobbly edges)
        ctx.fillStyle = color;
        ctx.strokeStyle = '#2D2D2D';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const bw = headR * 0.7;
        ctx.moveTo(-bw + (Math.random() - 0.5) * 0.5, 0);
        ctx.lineTo(bw + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
        ctx.lineTo(bw + (Math.random() - 0.5) * 0.5, bodyH + (Math.random() - 0.5) * 0.5);
        ctx.lineTo(-bw + (Math.random() - 0.5) * 0.5, bodyH + (Math.random() - 0.5) * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Head (large wobbly circle)
        ctx.fillStyle = '#ffe8cc';
        this._drawWobblyCircleLocal(ctx, 0, -headR * 0.6, headR, 12);
        ctx.fill();
        ctx.stroke();

        // Eyes (simple dots, position based on direction)
        ctx.fillStyle = '#2D2D2D';
        if (dir !== 3) { // Not facing up
            const eyeSpread = headR * 0.3;
            const eyeY = -headR * 0.7;
            const eyeOffX = dir === 1 ? -2 : dir === 2 ? 2 : 0;
            ctx.beginPath();
            ctx.arc(-eyeSpread + eyeOffX, eyeY, 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(eyeSpread + eyeOffX, eyeY, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Hair tuft (wobbly triangle on top)
        ctx.strokeStyle = '#2D2D2D';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2 + (Math.random() - 0.5), -headR * 1.4);
        ctx.lineTo(0, -headR * 1.8 + (Math.random() - 0.5));
        ctx.lineTo(2 + (Math.random() - 0.5), -headR * 1.4);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Renders a doodle-style NPC on the overworld.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} screenX
     * @param {number} screenY
     * @param {object} [options]
     * @param {string} [options.color='#ff8844'] - NPC base color
     * @param {string} [options.hatColor] - Optional hat color for differentiation
     * @param {number} [options.bobPhase=0] - Idle bob phase
     */
    renderDoodleNpc(ctx, screenX, screenY, options = {}) {
        const color = options.color || '#ff8844';
        const hatColor = options.hatColor || null;
        const bob = options.bobPhase || 0;
        const bounceY = Math.sin(bob * Math.PI * 2) * 0.8;

        ctx.save();
        ctx.translate(screenX, screenY + bounceY);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const headR = this.gridSize * 0.32;
        const bodyH = this.gridSize * 0.22;

        // Body
        ctx.fillStyle = color;
        ctx.strokeStyle = '#2D2D2D';
        ctx.lineWidth = 1.5;
        const bw = headR * 0.65;
        ctx.beginPath();
        ctx.moveTo(-bw + (Math.random() - 0.5) * 0.5, 0);
        ctx.lineTo(bw + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
        ctx.lineTo(bw + (Math.random() - 0.5) * 0.5, bodyH + (Math.random() - 0.5) * 0.5);
        ctx.lineTo(-bw + (Math.random() - 0.5) * 0.5, bodyH + (Math.random() - 0.5) * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.fillStyle = '#ffe0c0';
        this._drawWobblyCircleLocal(ctx, 0, -headR * 0.55, headR, 12);
        ctx.fill();
        ctx.stroke();

        // Eyes
        ctx.fillStyle = '#2D2D2D';
        const eyeSpread = headR * 0.3;
        const eyeY = -headR * 0.65;
        ctx.beginPath();
        ctx.arc(-eyeSpread, eyeY, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eyeSpread, eyeY, 1, 0, Math.PI * 2);
        ctx.fill();

        // Simple smile
        ctx.strokeStyle = '#2D2D2D';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(0, eyeY + 3, headR * 0.2, 0.1, Math.PI - 0.1);
        ctx.stroke();

        // Optional hat
        if (hatColor) {
            ctx.fillStyle = hatColor;
            ctx.strokeStyle = '#2D2D2D';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-headR * 0.8 + (Math.random() - 0.5), -headR * 1.1);
            ctx.lineTo(headR * 0.8 + (Math.random() - 0.5), -headR * 1.1 + (Math.random() - 0.5));
            ctx.lineTo(headR * 0.5 + (Math.random() - 0.5), -headR * 1.6 + (Math.random() - 0.5));
            ctx.lineTo(-headR * 0.5 + (Math.random() - 0.5), -headR * 1.6 + (Math.random() - 0.5));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        ctx.restore();
    }

    // ── Doodle Rendering Internals ──────────────────────────────────────────

    /**
     * Render subtle paper grain texture across the viewport.
     */
    _renderPaperGrain(ctx, w, h) {
        ctx.globalAlpha = PAPER_GRAIN_ALPHA;
        // Draw a sparse dot pattern to simulate paper grain
        const step = 4;
        ctx.fillStyle = '#8B7D6B';
        for (let y = 0; y < h; y += step) {
            for (let x = 0; x < w; x += step) {
                if (Math.random() < 0.3) {
                    ctx.fillRect(x + Math.random() * 2, y + Math.random() * 2, 1, 1);
                }
            }
        }
    }

    /**
     * Render faint wobbly grid lines over the tile grid.
     */
    _renderDoodleGrid(ctx, cameraOffset, viewWidth, viewHeight) {
        ctx.globalAlpha = DOODLE_GRID_ALPHA;
        ctx.strokeStyle = '#4a4a4a';
        ctx.lineWidth = 0.5;

        const gs = this.gridSize;
        const startX = Math.floor(cameraOffset.x / gs) * gs - cameraOffset.x;
        const startY = Math.floor(cameraOffset.y / gs) * gs - cameraOffset.y;

        // Vertical lines
        for (let x = startX; x < viewWidth; x += gs) {
            ctx.beginPath();
            const segments = Math.ceil(viewHeight / 20);
            for (let i = 0; i <= segments; i++) {
                const py = (viewHeight / segments) * i;
                const px = x + (Math.random() - 0.5) * 1.5;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = startY; y < viewHeight; y += gs) {
            ctx.beginPath();
            const segments = Math.ceil(viewWidth / 20);
            for (let i = 0; i <= segments; i++) {
                const px = (viewWidth / segments) * i;
                const py = y + (Math.random() - 0.5) * 1.5;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
    }

    /**
     * Generate ambient doodle decorations across the map.
     * Decorations are seeded based on tile positions for consistency.
     */
    _generateDoodleDecorations() {
        this._doodleDecorations = [];
        this._decoGenerated = true;

        const decoTypes = ['flower', 'cloud', 'grass_tuft', 'pebble', 'butterfly', 'mushroom'];

        // Walk base layer and sprinkle decorations
        if (this._layers.length === 0) return;
        const baseLayer = this._layers[0];

        for (const [key] of baseLayer) {
            // Use a deterministic pseudo-random based on tile key
            const [gx, gy] = key.split(',').map(Number);
            const seed = ((gx * 73856093) ^ (gy * 19349663)) & 0x7FFFFFFF;
            const pseudoRand = (seed % 1000) / 1000;

            if (pseudoRand < DECO_SPAWN_CHANCE * 200) {
                const typeIndex = seed % decoTypes.length;
                this._doodleDecorations.push({
                    x: gx * this.gridSize + (((seed >> 3) % 100) / 100) * this.gridSize,
                    y: gy * this.gridSize + (((seed >> 7) % 100) / 100) * this.gridSize,
                    type: decoTypes[typeIndex],
                    size: 2 + (seed % 4),
                    rotation: ((seed >> 11) % 628) / 100,
                });
            }
        }
    }

    /**
     * Render doodle decorations visible in the viewport.
     */
    _renderDoodleDecorations(ctx, cameraOffset, viewWidth, viewHeight) {
        if (this._doodleDecorations.length === 0) return;

        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#5a5a4a';
        ctx.fillStyle = '#5a5a4a';
        ctx.lineWidth = 0.8;
        ctx.lineCap = 'round';

        for (const deco of this._doodleDecorations) {
            const sx = deco.x - cameraOffset.x;
            const sy = deco.y - cameraOffset.y;

            // Skip if outside viewport
            if (sx < -20 || sx > viewWidth + 20 || sy < -20 || sy > viewHeight + 20) continue;

            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(deco.rotation);

            switch (deco.type) {
                case 'flower':
                    this._drawDoodleFlower(ctx, deco.size);
                    break;
                case 'cloud':
                    this._drawDoodleCloud(ctx, deco.size);
                    break;
                case 'grass_tuft':
                    this._drawDoodleGrassTuft(ctx, deco.size);
                    break;
                case 'pebble':
                    this._drawDoodlePebble(ctx, deco.size);
                    break;
                case 'butterfly':
                    this._drawDoodleButterfly(ctx, deco.size);
                    break;
                case 'mushroom':
                    this._drawDoodleMushroom(ctx, deco.size);
                    break;
            }

            ctx.restore();
        }
    }

    /**
     * Draw a tiny doodle flower.
     */
    _drawDoodleFlower(ctx, size) {
        const s = size;
        // Petals
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * s, Math.sin(angle) * s, s * 0.5, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Center dot
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Stem
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.lineTo(0 + (Math.random() - 0.5), s * 2.5);
        ctx.stroke();
    }

    /**
     * Draw a tiny doodle cloud.
     */
    _drawDoodleCloud(ctx, size) {
        const s = size;
        ctx.beginPath();
        ctx.arc(-s * 0.5, 0, s * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s * 0.3, -s * 0.2, s * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s * 0.8, 0, s * 0.4, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Draw a tiny grass tuft.
     */
    _drawDoodleGrassTuft(ctx, size) {
        for (let i = 0; i < 3; i++) {
            const baseX = (i - 1) * size * 0.5;
            ctx.beginPath();
            ctx.moveTo(baseX, 0);
            ctx.quadraticCurveTo(
                baseX + (Math.random() - 0.5) * size, -size * 1.5,
                baseX + (Math.random() - 0.5) * 2, -size * 2
            );
            ctx.stroke();
        }
    }

    /**
     * Draw a tiny pebble.
     */
    _drawDoodlePebble(ctx, size) {
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.6, size * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Draw a tiny butterfly.
     */
    _drawDoodleButterfly(ctx, size) {
        // Wings
        ctx.beginPath();
        ctx.ellipse(-size * 0.4, 0, size * 0.5, size * 0.3, -0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(size * 0.4, 0, size * 0.5, size * 0.3, 0.3, 0, Math.PI * 2);
        ctx.stroke();
        // Body
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.3);
        ctx.lineTo(0, size * 0.3);
        ctx.stroke();
    }

    /**
     * Draw a tiny mushroom.
     */
    _drawDoodleMushroom(ctx, size) {
        // Cap
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, Math.PI, 0);
        ctx.stroke();
        // Stem
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, 0);
        ctx.lineTo(-size * 0.2, size * 0.6);
        ctx.lineTo(size * 0.2, size * 0.6);
        ctx.lineTo(size * 0.2, 0);
        ctx.stroke();
    }

    /**
     * Helper: draw a wobbly circle at local coordinates.
     */
    _drawWobblyCircleLocal(ctx, cx, cy, radius, points = 12) {
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const wobble = radius + (Math.random() - 0.5) * radius * 0.15;
            const px = cx + Math.cos(angle) * wobble;
            const py = cy + Math.sin(angle) * wobble;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
    }

    // ── Internals ───────────────────────────────────────────────────────────

    /**
     * Returns the source ID for a cell on a given layer, or -1 if empty.
     * @param {number} layerIndex
     * @param {{x: number, y: number}} gridPos
     * @returns {number}
     */
    _getCellSourceId(layerIndex, gridPos) {
        if (layerIndex < 0 || layerIndex >= this._layers.length) {
            return -1;
        }
        const key = `${gridPos.x},${gridPos.y}`;
        const data = this._layers[layerIndex].get(key);
        if (data) {
            return data.sourceId;
        }
        return -1;
    }

    /**
     * Clears all map data, objects, and NPCs.
     */
    _clearMap() {
        this._objectLookup.clear();
        this._npcLookup.clear();
        this.transitionZones = {};
        this._layers = [];
        this.mapBoundsPx = { x: 0, y: 0, w: 0, h: 0 };
        this._doodleDecorations = [];
        this._decoGenerated = false;
    }

    /**
     * Calculates the pixel bounds of the map from all layer data.
     */
    _updateMapBounds() {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const layer of this._layers) {
            for (const key of layer.keys()) {
                const [gx, gy] = key.split(',').map(Number);
                if (gx < minX) minX = gx;
                if (gy < minY) minY = gy;
                if (gx > maxX) maxX = gx;
                if (gy > maxY) maxY = gy;
            }
        }

        if (minX === Infinity) {
            this.mapBoundsPx = { x: 0, y: 0, w: 0, h: 0 };
            return;
        }

        this.mapBoundsPx = {
            x: minX * this.gridSize,
            y: minY * this.gridSize,
            w: (maxX - minX + 1) * this.gridSize,
            h: (maxY - minY + 1) * this.gridSize,
        };
    }
}

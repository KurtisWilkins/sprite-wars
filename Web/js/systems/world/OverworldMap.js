/**
 * OverworldMap — Manages the tile-based overworld map, collision, encounter zones,
 * area transitions, and placed objects.
 * [P5-001] Core map system for all overworld navigation.
 *
 * Ported from Game/Scripts/World/OverworldMap.gd
 */
import { eventBus, GameEvents } from '../../core/EventBus.js';

// ── Configuration Defaults ──────────────────────────────────────────────────

/** TileMap layer index used for walkability collision checks. */
const DEFAULT_COLLISION_LAYER = 1;

/** TileMap layer index for tall grass / encounter zones. */
const DEFAULT_ENCOUNTER_LAYER = 2;

/** Grid cell size in pixels (must match TileMap tile_size). */
const DEFAULT_GRID_SIZE = 16;

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

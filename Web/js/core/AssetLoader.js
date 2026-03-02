/**
 * AssetLoader - Loads and caches images, audio, and data
 * Replaces Godot's ResourceLoader / preload()
 */
export class AssetLoader {
    constructor() {
        this._cache = {};
        this._loading = {};
        this._totalAssets = 0;
        this._loadedAssets = 0;
        this._basePath = '..'; // Relative to Web/ directory, points to sprite-wars root
    }

    get progress() {
        return this._totalAssets > 0 ? this._loadedAssets / this._totalAssets : 0;
    }

    setBasePath(path) {
        this._basePath = path;
    }

    /**
     * Convert a Godot res:// path to a web-relative path
     */
    resolvePath(godotPath) {
        if (godotPath.startsWith('res://')) {
            return `${this._basePath}/${godotPath.replace('res://', '')}`;
        }
        if (godotPath.startsWith('/') || godotPath.startsWith('http')) {
            return godotPath;
        }
        return `${this._basePath}/${godotPath}`;
    }

    /**
     * Load a single image
     */
    loadImage(path) {
        const resolvedPath = this.resolvePath(path);
        if (this._cache[resolvedPath]) {
            return Promise.resolve(this._cache[resolvedPath]);
        }
        if (this._loading[resolvedPath]) {
            return this._loading[resolvedPath];
        }

        this._totalAssets++;
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this._cache[resolvedPath] = img;
                this._loadedAssets++;
                delete this._loading[resolvedPath];
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${resolvedPath}`);
                this._loadedAssets++;
                delete this._loading[resolvedPath];
                resolve(null); // Don't reject, use null for missing assets
            };
            img.src = resolvedPath;
        });

        this._loading[resolvedPath] = promise;
        return promise;
    }

    /**
     * Load multiple images in parallel
     */
    async loadImages(paths) {
        const results = {};
        const promises = paths.map(async (path) => {
            const img = await this.loadImage(path);
            results[path] = img;
        });
        await Promise.all(promises);
        return results;
    }

    /**
     * Load an audio file
     */
    loadAudio(path) {
        const resolvedPath = this.resolvePath(path);
        if (this._cache[resolvedPath]) {
            return Promise.resolve(this._cache[resolvedPath]);
        }
        if (this._loading[resolvedPath]) {
            return this._loading[resolvedPath];
        }

        this._totalAssets++;
        const promise = new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.oncanplaythrough = () => {
                this._cache[resolvedPath] = audio;
                this._loadedAssets++;
                delete this._loading[resolvedPath];
                resolve(audio);
            };
            audio.onerror = () => {
                console.warn(`Failed to load audio: ${resolvedPath}`);
                this._loadedAssets++;
                delete this._loading[resolvedPath];
                resolve(null);
            };
            audio.src = resolvedPath;
        });

        this._loading[resolvedPath] = promise;
        return promise;
    }

    /**
     * Load a JSON data file
     */
    async loadJSON(path) {
        const resolvedPath = this.resolvePath(path);
        if (this._cache[resolvedPath]) {
            return this._cache[resolvedPath];
        }

        try {
            const response = await fetch(resolvedPath);
            const data = await response.json();
            this._cache[resolvedPath] = data;
            return data;
        } catch (e) {
            console.warn(`Failed to load JSON: ${resolvedPath}`, e);
            return null;
        }
    }

    /**
     * Get a cached asset (already loaded)
     */
    get(path) {
        const resolvedPath = this.resolvePath(path);
        return this._cache[resolvedPath] || null;
    }

    /**
     * Check if an asset is loaded
     */
    isLoaded(path) {
        const resolvedPath = this.resolvePath(path);
        return resolvedPath in this._cache;
    }

    /**
     * Preload a batch of assets with progress callback
     */
    async preloadBatch(manifest, onProgress) {
        this._totalAssets = 0;
        this._loadedAssets = 0;

        const promises = [];

        for (const path of (manifest.images || [])) {
            promises.push(this.loadImage(path).then(() => {
                if (onProgress) onProgress(this.progress);
            }));
        }

        for (const path of (manifest.audio || [])) {
            promises.push(this.loadAudio(path).then(() => {
                if (onProgress) onProgress(this.progress);
            }));
        }

        for (const path of (manifest.json || [])) {
            this._totalAssets++;
            promises.push(this.loadJSON(path).then(() => {
                this._loadedAssets++;
                if (onProgress) onProgress(this.progress);
            }));
        }

        await Promise.all(promises);
    }

    /**
     * Extract a sprite from a sprite sheet
     */
    extractSprite(sheetImage, sx, sy, sw, sh) {
        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheetImage, sx, sy, sw, sh, 0, 0, sw, sh);

        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }

    clearCache() {
        this._cache = {};
        this._totalAssets = 0;
        this._loadedAssets = 0;
    }
}

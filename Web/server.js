/**
 * Sprite Wars - Simple static file server
 * Run with: node server.js
 *
 * This serves the game files for local development.
 * For production, use any static web hosting (Nginx, Apache, Netlify, Vercel, etc.)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.ico': 'image/x-icon',
    '.asset': 'application/octet-stream',
    '.prefab': 'application/octet-stream',
};

// Directory for tile metadata storage
const TILE_METADATA_DIR = path.join(ROOT, 'Web', 'data', 'tile-metadata');

// Ensure tile metadata directory exists
fs.mkdirSync(TILE_METADATA_DIR, { recursive: true });

// Sanitize a filename to prevent path traversal
function sanitizeFilename(name) {
    // Remove any path separators and dangerous characters
    return name.replace(/[\/\\:*?"<>|.\x00]/g, '_').replace(/^_+|_+$/g, '');
}

// Helper to parse JSON request body (no external dependencies)
function parseJsonBody(req, callback) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const parsed = JSON.parse(body);
            callback(null, parsed);
        } catch (err) {
            callback(err, null);
        }
    });
    req.on('error', err => callback(err, null));
}

// Recursively find all files matching an extension under a directory
function findFilesRecursive(dir, ext, baseDir, results) {
    results = results || [];
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
        return results;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findFilesRecursive(fullPath, ext, baseDir, results);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(ext)) {
            // Return path relative to project root
            results.push(path.relative(baseDir, fullPath));
        }
    }
    return results;
}

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // ─── API: POST /api/skeleton/save ───
    if (req.method === 'POST' && pathname === '/api/skeleton/save') {
        parseJsonBody(req, (err, body) => {
            if (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
                return;
            }

            const race = body && body.race;
            const stage = body && body.stage;
            const data = body && body.data;

            if (!race || typeof race !== 'string' || !stage || !data) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing race, stage, or data in request body' }));
                return;
            }

            // Sanitize race name to prevent path traversal
            const sanitizedRace = race.replace(/[\/\\:*?"<>|.\x00]/g, '');
            const sanitizedStage = parseInt(stage, 10);
            if (!sanitizedRace || isNaN(sanitizedStage) || sanitizedStage < 1 || sanitizedStage > 3) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid race name or stage number' }));
                return;
            }

            const partsDir = path.join(ROOT, 'Sprites', 'Characters', sanitizedRace, 'parts');
            const filePath = path.join(partsDir, `${sanitizedRace}_S${sanitizedStage}_skeleton.json`);

            // Verify resolved path is within the expected directory
            if (!filePath.startsWith(path.join(ROOT, 'Sprites', 'Characters'))) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
            }

            // Ensure the parts directory exists
            fs.mkdirSync(partsDir, { recursive: true });

            fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (writeErr) => {
                if (writeErr) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to save skeleton data' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, file: `${sanitizedRace}_S${sanitizedStage}_skeleton.json` }));
            });
        });
        return;
    }

    // ─── API: POST /api/tile-metadata/save ───
    if (req.method === 'POST' && pathname === '/api/tile-metadata/save') {
        parseJsonBody(req, (err, data) => {
            if (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
                return;
            }

            // Extract filename from tileset.filename
            const rawFilename = data && data.tileset && data.tileset.filename;
            if (!rawFilename || typeof rawFilename !== 'string') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing tileset.filename in request body' }));
                return;
            }

            const sanitized = sanitizeFilename(rawFilename);
            if (!sanitized) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid filename after sanitization' }));
                return;
            }

            const filePath = path.join(TILE_METADATA_DIR, sanitized + '.json');

            // Verify resolved path is still within the metadata directory
            if (!filePath.startsWith(TILE_METADATA_DIR)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
            }

            fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (writeErr) => {
                if (writeErr) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to save metadata' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, filename: sanitized + '.json' }));
            });
        });
        return;
    }

    // ─── API: GET /api/tile-metadata/load?tileset=FILENAME ───
    if (req.method === 'GET' && pathname === '/api/tile-metadata/load') {
        const tileset = parsedUrl.searchParams.get('tileset');
        if (!tileset || typeof tileset !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing tileset query parameter' }));
            return;
        }

        const sanitized = sanitizeFilename(tileset);
        if (!sanitized) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid filename' }));
            return;
        }

        const filePath = path.join(TILE_METADATA_DIR, sanitized + '.json');

        // Verify resolved path is still within the metadata directory
        if (!filePath.startsWith(TILE_METADATA_DIR)) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
        }

        fs.readFile(filePath, 'utf8', (readErr, content) => {
            if (readErr) {
                if (readErr.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Metadata not found for tileset: ' + sanitized }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to read metadata' }));
                }
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(content);
        });
        return;
    }

    // ─── API: GET /api/tile-metadata/list ───
    if (req.method === 'GET' && pathname === '/api/tile-metadata/list') {
        fs.readdir(TILE_METADATA_DIR, (readErr, files) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to list metadata files' }));
                return;
            }
            const jsonFiles = files.filter(f => f.endsWith('.json'));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(jsonFiles));
        });
        return;
    }

    // ─── API: GET /api/tilesets/list ───
    if (req.method === 'GET' && pathname === '/api/tilesets/list') {
        const tilesDir = path.join(ROOT, 'Sprites', 'Tiles');
        try {
            const pngFiles = findFilesRecursive(tilesDir, '.png', ROOT, []);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(pngFiles));
        } catch (scanErr) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to scan tilesets directory' }));
        }
        return;
    }

    // ─── API: POST /api/editor-config/save ───
    if (req.method === 'POST' && pathname === '/api/editor-config/save') {
        parseJsonBody(req, (err, body) => {
            if (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
                return;
            }

            const race = body && body.race;
            const stage = body && body.stage;
            const config = body && body.config;

            if (!race || typeof race !== 'string' || !stage || !config) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing race, stage, or config in request body' }));
                return;
            }

            // Sanitize race name to prevent path traversal
            const sanitizedRace = race.replace(/[\/\\:*?"<>|.\x00]/g, '');
            const sanitizedStage = parseInt(stage, 10);
            if (!sanitizedRace || isNaN(sanitizedStage) || sanitizedStage < 1 || sanitizedStage > 3) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid race name or stage number' }));
                return;
            }

            const partsDir = path.join(ROOT, 'Sprites', 'Characters', sanitizedRace, 'parts');
            const filePath = path.join(partsDir, `${sanitizedRace}_S${sanitizedStage}_editor_config.json`);

            // Verify resolved path is within the expected directory
            if (!filePath.startsWith(path.join(ROOT, 'Sprites', 'Characters'))) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
            }

            // Ensure the parts directory exists
            fs.mkdirSync(partsDir, { recursive: true });

            const saveData = {
                race: sanitizedRace,
                stage: sanitizedStage,
                config: config,
                updated_at: new Date().toISOString()
            };

            fs.writeFile(filePath, JSON.stringify(saveData, null, 2), 'utf8', (writeErr) => {
                if (writeErr) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to save editor config' }));
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, file: `${sanitizedRace}_S${sanitizedStage}_editor_config.json` }));
            });
        });
        return;
    }

    // ─── API: GET /api/editor-config/load?race=RACE&stage=STAGE ───
    if (req.method === 'GET' && pathname === '/api/editor-config/load') {
        const race = parsedUrl.searchParams.get('race');
        const stage = parsedUrl.searchParams.get('stage');

        if (!race || typeof race !== 'string' || !stage) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing race or stage query parameter' }));
            return;
        }

        // Sanitize race name to prevent path traversal
        const sanitizedRace = race.replace(/[\/\\:*?"<>|.\x00]/g, '');
        const sanitizedStage = parseInt(stage, 10);
        if (!sanitizedRace || isNaN(sanitizedStage) || sanitizedStage < 1 || sanitizedStage > 3) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid race name or stage number' }));
            return;
        }

        const filePath = path.join(ROOT, 'Sprites', 'Characters', sanitizedRace, 'parts', `${sanitizedRace}_S${sanitizedStage}_editor_config.json`);

        // Verify resolved path is within the expected directory
        if (!filePath.startsWith(path.join(ROOT, 'Sprites', 'Characters'))) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Forbidden' }));
            return;
        }

        fs.readFile(filePath, 'utf8', (readErr, content) => {
            if (readErr) {
                if (readErr.code === 'ENOENT') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ config: null }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to read editor config' }));
                }
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(content);
        });
        return;
    }

    // ─── API: POST /api/editor-config/copy-body ───
    if (req.method === 'POST' && pathname === '/api/editor-config/copy-body') {
        parseJsonBody(req, (err, body) => {
            if (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON body' }));
                return;
            }

            const sourceRace = body && body.source_race;
            const sourceStage = body && body.source_stage;
            const targetRace = body && body.target_race;
            const targetStage = body && body.target_stage;
            const excludeParts = (body && body.exclude_parts) || [];

            if (!sourceRace || typeof sourceRace !== 'string' ||
                !targetRace || typeof targetRace !== 'string' ||
                !sourceStage || !targetStage) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing source_race, source_stage, target_race, or target_stage' }));
                return;
            }

            if (!Array.isArray(excludeParts)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'exclude_parts must be an array' }));
                return;
            }

            // Sanitize race names to prevent path traversal
            const sanitizedSourceRace = sourceRace.replace(/[\/\\:*?"<>|.\x00]/g, '');
            const sanitizedTargetRace = targetRace.replace(/[\/\\:*?"<>|.\x00]/g, '');
            const sanitizedSourceStage = parseInt(sourceStage, 10);
            const sanitizedTargetStage = parseInt(targetStage, 10);

            if (!sanitizedSourceRace || !sanitizedTargetRace ||
                isNaN(sanitizedSourceStage) || sanitizedSourceStage < 1 || sanitizedSourceStage > 3 ||
                isNaN(sanitizedTargetStage) || sanitizedTargetStage < 1 || sanitizedTargetStage > 3) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid race name or stage number' }));
                return;
            }

            const charsDir = path.join(ROOT, 'Sprites', 'Characters');
            const sourceFile = path.join(charsDir, sanitizedSourceRace, 'parts', `${sanitizedSourceRace}_S${sanitizedSourceStage}_skeleton.json`);
            const targetFile = path.join(charsDir, sanitizedTargetRace, 'parts', `${sanitizedTargetRace}_S${sanitizedTargetStage}_skeleton.json`);

            // Verify resolved paths are within the Characters directory
            if (!sourceFile.startsWith(charsDir) || !targetFile.startsWith(charsDir)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Forbidden' }));
                return;
            }

            // Read source skeleton
            fs.readFile(sourceFile, 'utf8', (srcErr, srcContent) => {
                if (srcErr) {
                    if (srcErr.code === 'ENOENT') {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Source skeleton not found: ' + sanitizedSourceRace + ' S' + sanitizedSourceStage }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to read source skeleton' }));
                    }
                    return;
                }

                let sourceData;
                try {
                    sourceData = JSON.parse(srcContent);
                } catch (parseErr) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to parse source skeleton JSON' }));
                    return;
                }

                // Read target skeleton (or start with empty object)
                fs.readFile(targetFile, 'utf8', (tgtErr, tgtContent) => {
                    let targetData = {};
                    if (!tgtErr) {
                        try {
                            targetData = JSON.parse(tgtContent);
                        } catch (parseErr) {
                            // If target is corrupt, start fresh
                            targetData = {};
                        }
                    }

                    // Copy bone offsets from source to target, excluding specified parts
                    const sourceBones = sourceData.bones || sourceData.bone_offsets || {};
                    const targetBones = targetData.bones || targetData.bone_offsets || {};
                    const boneKey = sourceData.bones ? 'bones' : 'bone_offsets';

                    for (const boneName of Object.keys(sourceBones)) {
                        if (!excludeParts.includes(boneName)) {
                            targetBones[boneName] = JSON.parse(JSON.stringify(sourceBones[boneName]));
                        }
                    }

                    targetData[boneKey] = targetBones;

                    // Ensure target parts directory exists
                    const targetPartsDir = path.join(charsDir, sanitizedTargetRace, 'parts');
                    fs.mkdirSync(targetPartsDir, { recursive: true });

                    fs.writeFile(targetFile, JSON.stringify(targetData, null, 2), 'utf8', (writeErr) => {
                        if (writeErr) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Failed to save target skeleton' }));
                            return;
                        }
                        const copiedParts = Object.keys(sourceBones).filter(b => !excludeParts.includes(b));
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            copied_parts: copiedParts,
                            excluded_parts: excludeParts,
                            target_file: `${sanitizedTargetRace}_S${sanitizedTargetStage}_skeleton.json`
                        }));
                    });
                });
            });
        });
        return;
    }

    // ─── Static file serving ───
    // Parse URL and decode
    let urlPath = decodeURIComponent(req.url.split('?')[0]);

    // Default to index.html
    if (urlPath === '/' || urlPath === '') {
        urlPath = '/Web/index.html';
    } else if (urlPath.startsWith('/Web/')) {
        // Already has Web/ prefix
    } else if (urlPath.startsWith('/Sprites/') || urlPath.startsWith('/Audio/') || urlPath.startsWith('/Game/')) {
        // Asset paths - serve from root
    } else {
        // Assume relative to Web/
        urlPath = '/Web' + urlPath;
    }

    const filePath = path.join(ROOT, urlPath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // Check if file exists
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }

        // Determine MIME type
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Set CORS and caching headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=60');

        // Stream the file
        res.writeHead(200, { 'Content-Type': contentType });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on('error', () => {
            res.writeHead(500);
            res.end('Internal Server Error');
        });
    });
});

server.listen(PORT, () => {
    console.log(`\n  Sprite Wars Web Server`);
    console.log(`  =====================`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Game:    http://localhost:${PORT}/Web/index.html`);
    console.log(`  Admin:   http://localhost:${PORT}/Web/tile-admin.html`);
    console.log(`  Editor:  http://localhost:${PORT}/Web/sprite-editor.html`);
    console.log(`\n  API Endpoints:`);
    console.log(`    POST /api/skeleton/save`);
    console.log(`    POST /api/tile-metadata/save`);
    console.log(`    GET  /api/tile-metadata/load`);
    console.log(`    GET  /api/tile-metadata/list`);
    console.log(`    GET  /api/tilesets/list`);
    console.log(`    POST /api/editor-config/save`);
    console.log(`    GET  /api/editor-config/load`);
    console.log(`    POST /api/editor-config/copy-body`);
    console.log(`\n  Press Ctrl+C to stop\n`);
});

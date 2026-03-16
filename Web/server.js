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
    console.log(`\n  Press Ctrl+C to stop\n`);
});

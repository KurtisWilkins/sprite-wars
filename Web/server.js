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

const server = http.createServer((req, res) => {
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
        res.setHeader('Cache-Control', 'public, max-age=3600');

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
    console.log(`\n  Press Ctrl+C to stop\n`);
});

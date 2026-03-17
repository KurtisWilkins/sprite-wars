/**
 * Vercel Serverless Function: GET /api/tile-metadata/load?tileset=FILENAME
 *
 * Loads tile metadata from the GitHub repository.
 *
 * Required env vars: GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH (optional)
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const tileset = req.query.tileset;
    if (!tileset || typeof tileset !== 'string') {
        return res.status(400).json({ error: 'Missing tileset query parameter' });
    }

    const sanitized = tileset.replace(/[\/\\:*?"<>|.\x00]/g, '_').replace(/^_+|_+$/g, '');
    if (!sanitized) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
        return res.status(500).json({ error: 'Server misconfigured: GITHUB_TOKEN and GITHUB_REPO required' });
    }

    const filePath = `Web/data/tile-metadata/${sanitized}.json`;

    try {
        const getResp = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SpriteWars-Editor'
                }
            }
        );

        if (getResp.status === 404) {
            return res.status(404).json({ error: 'Metadata not found for tileset: ' + sanitized });
        }

        if (!getResp.ok) {
            const errText = await getResp.text();
            return res.status(502).json({ error: 'GitHub API error: ' + getResp.status + ' ' + errText.substring(0, 200) });
        }

        const fileData = await getResp.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        return res.status(200).json(JSON.parse(content));
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load metadata: ' + err.message });
    }
}

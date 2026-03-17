/**
 * Vercel Serverless Function: GET /api/tilesets/list
 *
 * Lists all tileset PNG files. Uses GitHub Trees API for recursive listing.
 *
 * Required env vars: GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH (optional)
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
        return res.status(500).json({ error: 'Server misconfigured: GITHUB_TOKEN and GITHUB_REPO required' });
    }

    try {
        // Use the Git Trees API with recursive flag to list all files under Sprites/Tiles
        const treeResp = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/git/trees/${GITHUB_BRANCH}?recursive=1`,
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SpriteWars-Editor'
                }
            }
        );

        if (!treeResp.ok) {
            const errText = await treeResp.text();
            return res.status(502).json({ error: 'GitHub API error: ' + treeResp.status + ' ' + errText.substring(0, 200) });
        }

        const tree = await treeResp.json();
        const pngFiles = tree.tree
            .filter(item => item.type === 'blob' && item.path.startsWith('Sprites/Tiles') && item.path.toLowerCase().endsWith('.png'))
            .map(item => item.path);

        return res.status(200).json(pngFiles);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to list tilesets: ' + err.message });
    }
}

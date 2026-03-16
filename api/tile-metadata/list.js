/**
 * Vercel Serverless Function: GET /api/tile-metadata/list
 *
 * Lists all tile metadata JSON files from the GitHub repository.
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

    const dirPath = 'Web/data/tile-metadata';

    try {
        const getResp = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${dirPath}?ref=${GITHUB_BRANCH}`,
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SpriteWars-Editor'
                }
            }
        );

        if (getResp.status === 404) {
            return res.status(200).json([]);
        }

        if (!getResp.ok) {
            const errText = await getResp.text();
            return res.status(502).json({ error: 'GitHub API error: ' + getResp.status + ' ' + errText.substring(0, 200) });
        }

        const files = await getResp.json();
        const jsonFiles = files
            .filter(f => f.type === 'file' && f.name.endsWith('.json'))
            .map(f => f.name);

        return res.status(200).json(jsonFiles);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to list metadata: ' + err.message });
    }
}

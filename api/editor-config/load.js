/**
 * Vercel Serverless Function: GET /api/editor-config/load?race=RACE&stage=STAGE
 *
 * Loads editor configuration from the GitHub repository.
 *
 * Required env vars: GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH (optional)
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const race = req.query.race;
    const stage = req.query.stage;

    if (!race || typeof race !== 'string' || !stage) {
        return res.status(400).json({ error: 'Missing race or stage query parameter' });
    }

    const sanitizedRace = race.replace(/[\/\\:*?"<>|.\x00]/g, '');
    const sanitizedStage = parseInt(stage, 10);

    if (!sanitizedRace || isNaN(sanitizedStage) || sanitizedStage < 1 || sanitizedStage > 3) {
        return res.status(400).json({ error: 'Invalid race name or stage number' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
        return res.status(500).json({ error: 'Server misconfigured: GITHUB_TOKEN and GITHUB_REPO required' });
    }

    const fileName = `${sanitizedRace}_S${sanitizedStage}_editor_config.json`;
    const filePath = `Sprites/Characters/${sanitizedRace}/parts/${fileName}`;

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
            return res.status(200).json({ config: null });
        }

        if (!getResp.ok) {
            const errText = await getResp.text();
            return res.status(502).json({ error: 'GitHub API error: ' + getResp.status + ' ' + errText.substring(0, 200) });
        }

        const fileData = await getResp.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        return res.status(200).json(JSON.parse(content));
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load editor config: ' + err.message });
    }
}

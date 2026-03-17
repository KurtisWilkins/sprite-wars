/**
 * Vercel Serverless Function: POST /api/editor-config/save
 *
 * Saves editor configuration by committing to the GitHub repository.
 *
 * Required env vars: GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH (optional, defaults to "main")
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { race, stage, config } = req.body || {};

    if (!race || typeof race !== 'string' || !stage || !config) {
        return res.status(400).json({ error: 'Missing race, stage, or config in request body' });
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
    const saveData = {
        race: sanitizedRace,
        stage: sanitizedStage,
        config: config,
        updated_at: new Date().toISOString()
    };
    const content = JSON.stringify(saveData, null, 2);
    const contentBase64 = Buffer.from(content, 'utf8').toString('base64');

    try {
        let existingSha = null;
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

        if (getResp.ok) {
            existingSha = (await getResp.json()).sha;
        } else if (getResp.status !== 404) {
            const errText = await getResp.text();
            return res.status(502).json({ error: 'GitHub API error: ' + getResp.status + ' ' + errText.substring(0, 200) });
        }

        const putBody = {
            message: `Update ${fileName} via Sprite Editor`,
            content: contentBase64,
            branch: GITHUB_BRANCH
        };
        if (existingSha) putBody.sha = existingSha;

        const putResp = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'SpriteWars-Editor'
                },
                body: JSON.stringify(putBody)
            }
        );

        if (!putResp.ok) {
            const errText = await putResp.text();
            return res.status(502).json({ error: 'GitHub API error: ' + putResp.status + ' ' + errText.substring(0, 200) });
        }

        return res.status(200).json({ success: true, file: fileName });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to save editor config: ' + err.message });
    }
}

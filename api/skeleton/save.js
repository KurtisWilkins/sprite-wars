/**
 * Vercel Serverless Function: POST /api/skeleton/save
 *
 * Saves skeleton JSON data by committing it to the GitHub repository
 * via the GitHub Contents API.
 *
 * Required environment variables:
 *   GITHUB_TOKEN  — Personal access token with repo write access
 *   GITHUB_REPO   — Repository in "owner/repo" format (e.g. "MyOrg/sprite-wars")
 *   GITHUB_BRANCH — Target branch (defaults to "main")
 */

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { race, stage, data } = req.body || {};

    if (!race || typeof race !== 'string' || !stage || !data) {
        return res.status(400).json({ error: 'Missing race, stage, or data in request body' });
    }

    // Sanitize inputs
    const sanitizedRace = race.replace(/[\/\\:*?"<>|.\x00]/g, '');
    const sanitizedStage = parseInt(stage, 10);

    if (!sanitizedRace || isNaN(sanitizedStage) || sanitizedStage < 1 || sanitizedStage > 3) {
        return res.status(400).json({ error: 'Invalid race name or stage number' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
        return res.status(500).json({
            error: 'Server misconfigured: GITHUB_TOKEN and GITHUB_REPO environment variables are required'
        });
    }

    const fileName = `${sanitizedRace}_S${sanitizedStage}_skeleton.json`;
    const filePath = `Sprites/Characters/${sanitizedRace}/parts/${fileName}`;
    const content = JSON.stringify(data, null, 2);
    const contentBase64 = Buffer.from(content, 'utf8').toString('base64');

    try {
        // Check if file already exists (need its SHA to update)
        let existingSha = null;
        const getUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
        const getResp = await fetch(getUrl, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'SpriteWars-Editor'
            }
        });

        if (getResp.ok) {
            const existing = await getResp.json();
            existingSha = existing.sha;
        } else if (getResp.status !== 404) {
            const errText = await getResp.text();
            return res.status(502).json({ error: 'GitHub API error (GET): ' + getResp.status + ' ' + errText.substring(0, 200) });
        }

        // Create or update the file
        const putUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;
        const putBody = {
            message: `Update ${fileName} via Sprite Editor`,
            content: contentBase64,
            branch: GITHUB_BRANCH
        };
        if (existingSha) {
            putBody.sha = existingSha;
        }

        const putResp = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'SpriteWars-Editor'
            },
            body: JSON.stringify(putBody)
        });

        if (!putResp.ok) {
            const errText = await putResp.text();
            return res.status(502).json({ error: 'GitHub API error (PUT): ' + putResp.status + ' ' + errText.substring(0, 200) });
        }

        const result = await putResp.json();
        return res.status(200).json({
            success: true,
            file: fileName,
            commit: result.commit ? result.commit.sha : null
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to save skeleton: ' + err.message });
    }
}

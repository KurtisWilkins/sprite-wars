/**
 * Vercel Serverless Function: POST /api/editor-config/copy-body
 *
 * Copies bone offsets from one race/stage skeleton to another via GitHub API.
 *
 * Required env vars: GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH (optional)
 */

async function githubFetch(url, token, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'SpriteWars-Editor',
            ...(options.headers || {})
        }
    });
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { source_race, source_stage, target_race, target_stage, exclude_parts = [] } = req.body || {};

    if (!source_race || !target_race || !source_stage || !target_stage) {
        return res.status(400).json({ error: 'Missing source_race, source_stage, target_race, or target_stage' });
    }

    if (!Array.isArray(exclude_parts)) {
        return res.status(400).json({ error: 'exclude_parts must be an array' });
    }

    const sanitizedSourceRace = source_race.replace(/[\/\\:*?"<>|.\x00]/g, '');
    const sanitizedTargetRace = target_race.replace(/[\/\\:*?"<>|.\x00]/g, '');
    const sanitizedSourceStage = parseInt(source_stage, 10);
    const sanitizedTargetStage = parseInt(target_stage, 10);

    if (!sanitizedSourceRace || !sanitizedTargetRace ||
        isNaN(sanitizedSourceStage) || sanitizedSourceStage < 1 || sanitizedSourceStage > 3 ||
        isNaN(sanitizedTargetStage) || sanitizedTargetStage < 1 || sanitizedTargetStage > 3) {
        return res.status(400).json({ error: 'Invalid race name or stage number' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = process.env.GITHUB_REPO;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

    if (!GITHUB_TOKEN || !GITHUB_REPO) {
        return res.status(500).json({ error: 'Server misconfigured: GITHUB_TOKEN and GITHUB_REPO required' });
    }

    const sourcePath = `Sprites/Characters/${sanitizedSourceRace}/parts/${sanitizedSourceRace}_S${sanitizedSourceStage}_skeleton.json`;
    const targetPath = `Sprites/Characters/${sanitizedTargetRace}/parts/${sanitizedTargetRace}_S${sanitizedTargetStage}_skeleton.json`;
    const apiBase = `https://api.github.com/repos/${GITHUB_REPO}/contents`;

    try {
        // Read source skeleton
        const srcResp = await githubFetch(`${apiBase}/${sourcePath}?ref=${GITHUB_BRANCH}`, GITHUB_TOKEN);
        if (srcResp.status === 404) {
            return res.status(404).json({ error: `Source skeleton not found: ${sanitizedSourceRace} S${sanitizedSourceStage}` });
        }
        if (!srcResp.ok) {
            return res.status(502).json({ error: 'GitHub API error reading source: ' + srcResp.status });
        }
        const srcFile = await srcResp.json();
        const sourceData = JSON.parse(Buffer.from(srcFile.content, 'base64').toString('utf8'));

        // Read target skeleton (may not exist)
        let targetData = {};
        let targetSha = null;
        const tgtResp = await githubFetch(`${apiBase}/${targetPath}?ref=${GITHUB_BRANCH}`, GITHUB_TOKEN);
        if (tgtResp.ok) {
            const tgtFile = await tgtResp.json();
            targetSha = tgtFile.sha;
            try {
                targetData = JSON.parse(Buffer.from(tgtFile.content, 'base64').toString('utf8'));
            } catch { targetData = {}; }
        }

        // Copy bone offsets
        const sourceBones = sourceData.bones || sourceData.bone_offsets || {};
        const boneKey = sourceData.bones ? 'bones' : 'bone_offsets';
        const targetBones = targetData[boneKey] || {};

        for (const boneName of Object.keys(sourceBones)) {
            if (!exclude_parts.includes(boneName)) {
                targetBones[boneName] = JSON.parse(JSON.stringify(sourceBones[boneName]));
            }
        }
        targetData[boneKey] = targetBones;

        // Save target
        const contentBase64 = Buffer.from(JSON.stringify(targetData, null, 2), 'utf8').toString('base64');
        const targetFileName = `${sanitizedTargetRace}_S${sanitizedTargetStage}_skeleton.json`;
        const putBody = {
            message: `Copy body from ${sanitizedSourceRace} S${sanitizedSourceStage} to ${sanitizedTargetRace} S${sanitizedTargetStage}`,
            content: contentBase64,
            branch: GITHUB_BRANCH
        };
        if (targetSha) putBody.sha = targetSha;

        const putResp = await githubFetch(`${apiBase}/${targetPath}`, GITHUB_TOKEN, {
            method: 'PUT',
            body: JSON.stringify(putBody)
        });

        if (!putResp.ok) {
            const errText = await putResp.text();
            return res.status(502).json({ error: 'GitHub API error saving target: ' + putResp.status + ' ' + errText.substring(0, 200) });
        }

        const copiedParts = Object.keys(sourceBones).filter(b => !exclude_parts.includes(b));
        return res.status(200).json({
            success: true,
            copied_parts: copiedParts,
            excluded_parts: exclude_parts,
            target_file: targetFileName
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to copy body: ' + err.message });
    }
}

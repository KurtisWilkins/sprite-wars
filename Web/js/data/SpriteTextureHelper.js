/**
 * SpriteTextureHelper — Resolves race sprite paths for Web UI.
 */

const RACE_NAMES = {
    1: 'Human', 2: 'Elf', 3: 'Demon', 4: 'Devil', 5: 'CatMan',
    6: 'BearMan', 7: 'WolfMan', 8: 'MonkeyMan', 9: 'BugMan', 10: 'BirdMan',
    11: 'Ent', 12: 'FishMan', 13: 'Ghost', 14: 'Golem', 15: 'LizardMan',
    16: 'Minotaur', 17: 'Mummy', 18: 'Ork', 19: 'RatMan', 20: 'Robot',
    21: 'Skeleton', 22: 'SharkMan', 23: 'TurtleMan', 24: 'Zombie',
};

export function getRaceName(raceId) {
    return RACE_NAMES[raceId] || 'Unknown';
}

export function getRaceSpritePath(raceId, stage) {
    const name = getRaceName(raceId);
    if (name === 'Unknown') return null;
    const s = Math.max(0, Math.min(2, stage));
    return `Sprites/Characters/${name}/Stage${s}/${name}_stage${s}.png`;
}

export function getFormSpritePath(formId) {
    const raceId = Math.ceil(formId / 3);
    const stage = (formId - 1) % 3;
    return getRaceSpritePath(raceId, stage);
}

export function getPortraitPath(spriteInstance) {
    if (!spriteInstance) return null;
    const raceId = spriteInstance.raceId || spriteInstance.race_id || 1;
    const formId = spriteInstance.formId || spriteInstance.form_id || 1;
    const stage = (formId - 1) % 3;
    return getRaceSpritePath(raceId, stage);
}

export { RACE_NAMES };

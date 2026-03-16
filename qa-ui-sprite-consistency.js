#!/usr/bin/env node
/**
 * QA Validation Script — UI Sprite Consistency
 *
 * Verifies that all UI screens in Web/js consistently use SkeletalAnimationSystem
 * for sprite rendering with NO PNG fallback overlays.
 *
 * Checks:
 *   1. No PNG img overlays (getRaceSpritePath / _Idle.png) in key UI files
 *   2. BattleUI uses canvas-based portraits with SkeletalAnimationSystem
 *   3. OverworldScene has no HumanoidSpriteSystem references in lines 240-540
 *   4. Import cleanup — unused getRaceSpritePath imports removed
 *   5. All 72 skeleton JSON files exist (24 races x 3 stages)
 *   6. No non-legacy file imports from HumanoidSpriteSystem.legacy.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const WEB_JS = path.join(ROOT, 'Web', 'js');

let totalPass = 0;
let totalFail = 0;

function pass(msg) {
    totalPass++;
    console.log(`  \x1b[32mPASS\x1b[0m  ${msg}`);
}

function fail(msg) {
    totalFail++;
    console.log(`  \x1b[31mFAIL\x1b[0m  ${msg}`);
}

function readFile(relPath) {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 1: No PNG img overlays for sprite display
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== CHECK 1: No PNG img overlays for sprite display ===');

const pngOverlayFiles = [
    'Web/js/scenes/SpriteCenterScene.js',
    'Web/js/scenes/DeploymentScene.js',
    'Web/js/scenes/BagScene.js',
    'Web/js/systems/ui/GlossaryScreen.js',
    'Web/js/systems/ui/MenuScreens.js',
    'Web/js/systems/ui/SpriteInspectPanel.js',
    'Web/js/systems/ui/UnitRenderer.js',
];

for (const relPath of pngOverlayFiles) {
    const content = readFile(relPath);
    const basename = path.basename(relPath);
    if (!content) {
        fail(`${basename}: file not found`);
        continue;
    }

    // Check for img elements that use getRaceSpritePath or _Idle.png paths for sprite display.
    // We need to distinguish between:
    //   - sprite display (getRaceSpritePath, _Idle.png as sprite src) => BAD
    //   - equipment/asset icons (icon_path, asset.path) => OK
    //   - registry thumbnails using getFormSpritePath => flagged separately

    const hasGetRaceSpritePath = /getRaceSpritePath/.test(content);
    const hasIdlePngImg = /createElement\s*\(\s*['"]img['"]\s*\)[\s\S]{0,200}_Idle\.png/.test(content);

    // More targeted: look for img elements whose src is set to a getRaceSpritePath result
    const imgWithRaceSprite = /createElement\s*\(\s*['"]img['"]\s*\)[\s\S]{0,300}getRaceSpritePath/.test(content);

    if (hasGetRaceSpritePath || imgWithRaceSprite || hasIdlePngImg) {
        fail(`${basename}: contains PNG sprite overlay (getRaceSpritePath or _Idle.png img element)`);
    } else {
        // Also check for createElement('img') with getFormSpritePath (registry thumbnails)
        // This is a secondary concern — getFormSpritePath creates Idle.png paths
        const hasFormSpritePath = /getFormSpritePath/.test(content);
        const imgWithFormSprite = /createElement\s*\(\s*['"]img['"]\s*\)[\s\S]{0,300}getFormSpritePath/.test(content);

        if (imgWithFormSprite) {
            fail(`${basename}: uses getFormSpritePath to create <img> sprite overlays (PNG fallback)`);
        } else {
            pass(`${basename}: no PNG sprite overlays`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 2: BattleUI uses canvas-based portraits with SkeletalAnimationSystem
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== CHECK 2: BattleUI uses canvas-based SkeletalAnimationSystem portraits ===');

const battleUIContent = readFile('Web/js/systems/ui/BattleUI.js');
if (!battleUIContent) {
    fail('BattleUI.js: file not found');
} else {
    // 2a: Imports SkeletalAnimationSystem (not getRaceSpritePath/getPortraitPath)
    const hasSkeletalImport = /import\s+\{[^}]*SkeletalAnimationSystem[^}]*\}\s+from/.test(battleUIContent);
    const hasGetRaceSpriteImport = /getRaceSpritePath/.test(battleUIContent);
    const hasGetPortraitImport = /getPortraitPath/.test(battleUIContent);

    if (hasSkeletalImport && !hasGetRaceSpriteImport && !hasGetPortraitImport) {
        pass('BattleUI.js: imports SkeletalAnimationSystem (no getRaceSpritePath/getPortraitPath)');
    } else {
        if (!hasSkeletalImport) fail('BattleUI.js: missing SkeletalAnimationSystem import');
        if (hasGetRaceSpriteImport) fail('BattleUI.js: still imports getRaceSpritePath');
        if (hasGetPortraitImport) fail('BattleUI.js: still imports getPortraitPath');
    }

    // 2b: _addTurnOrderPortrait creates a canvas (not img)
    const portraitMethod = battleUIContent.match(/_addTurnOrderPortrait[\s\S]*?(?=\n    \/\/ --|^\s{4}\w|\n    \/\*\*)/m);
    const portraitSection = portraitMethod ? portraitMethod[0] : battleUIContent;

    // Check that _addTurnOrderPortrait contains createElement('canvas')
    const hasCanvasInPortrait = /(?:_addTurnOrderPortrait[\s\S]{0,800}createElement\s*\(\s*['"]canvas['"]\s*\))/.test(battleUIContent);
    const hasImgInPortrait = /(?:_addTurnOrderPortrait[\s\S]{0,800}createElement\s*\(\s*['"]img['"]\s*\))/.test(battleUIContent);

    if (hasCanvasInPortrait && !hasImgInPortrait) {
        pass('BattleUI.js: _addTurnOrderPortrait creates canvas element (not img)');
    } else {
        if (!hasCanvasInPortrait) fail('BattleUI.js: _addTurnOrderPortrait does not create canvas element');
        if (hasImgInPortrait) fail('BattleUI.js: _addTurnOrderPortrait creates img element (should be canvas)');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 3: OverworldScene has no HumanoidSpriteSystem references in lines 240-540
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== CHECK 3: OverworldScene — no HumanoidSpriteSystem refs in lines 240-540 ===');

const overworldContent = readFile('Web/js/scenes/OverworldScene.js');
if (!overworldContent) {
    fail('OverworldScene.js: file not found');
} else {
    const lines = overworldContent.split('\n');
    const targetLines = lines.slice(239, 540); // lines 240-540 (0-indexed: 239-539)
    const targetBlock = targetLines.join('\n');

    const humanoidRefs = targetBlock.match(/HumanoidSpriteSystem/g);
    if (humanoidRefs && humanoidRefs.length > 0) {
        fail(`OverworldScene.js lines 240-540: found ${humanoidRefs.length} HumanoidSpriteSystem reference(s)`);
    } else {
        pass('OverworldScene.js lines 240-540: no HumanoidSpriteSystem references');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 4: Import cleanup — getRaceSpritePath removed from files that had PNG overlay removed
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== CHECK 4: Import cleanup — no unused getRaceSpritePath imports ===');

// Files that should NOT import getRaceSpritePath (the main UI files minus OverworldScene
// which legitimately uses it for player sprite sheet loading)
const importCleanupFiles = [
    'Web/js/scenes/DeploymentScene.js',
    'Web/js/scenes/BagScene.js',
    'Web/js/systems/ui/GlossaryScreen.js',
    'Web/js/systems/ui/MenuScreens.js',
    'Web/js/systems/ui/SpriteInspectPanel.js',
    'Web/js/systems/ui/UnitRenderer.js',
    'Web/js/systems/ui/BattleUI.js',
];

for (const relPath of importCleanupFiles) {
    const content = readFile(relPath);
    const basename = path.basename(relPath);
    if (!content) {
        fail(`${basename}: file not found`);
        continue;
    }

    const hasImport = /import\s+\{[^}]*getRaceSpritePath[^}]*\}\s+from/.test(content);
    if (hasImport) {
        fail(`${basename}: still has getRaceSpritePath import (should be removed)`);
    } else {
        pass(`${basename}: no getRaceSpritePath import`);
    }
}

// Also check SpriteCenterScene — it uses getFormSpritePath, not getRaceSpritePath
const spriteCenterContent = readFile('Web/js/scenes/SpriteCenterScene.js');
if (spriteCenterContent) {
    const hasRaceSprite = /import\s+\{[^}]*getRaceSpritePath[^}]*\}\s+from/.test(spriteCenterContent);
    if (hasRaceSprite) {
        fail('SpriteCenterScene.js: still has getRaceSpritePath import');
    } else {
        pass('SpriteCenterScene.js: no getRaceSpritePath import');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 5: All 72 skeleton JSON files exist (24 races x 3 stages)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== CHECK 5: Skeleton JSON files (24 races x 3 stages = 72) ===');

const RACES = [
    'BearMan', 'BirdMan', 'BugMan', 'CatMan', 'Demon', 'Devil',
    'Elf', 'Ent', 'FishMan', 'Ghost', 'Golem', 'Human',
    'LizardMan', 'Minotaur', 'MonkeyMan', 'Mummy', 'Ork', 'RatMan',
    'Robot', 'SharkMan', 'Skeleton', 'TurtleMan', 'WolfMan', 'Zombie',
];

let skeletonPass = 0;
let skeletonFail = 0;
const missingSkeletons = [];

for (const race of RACES) {
    for (let stage = 1; stage <= 3; stage++) {
        const jsonPath = path.join(
            ROOT, 'Sprites', 'Characters', race, 'parts',
            `${race}_S${stage}_skeleton.json`
        );
        if (fs.existsSync(jsonPath)) {
            skeletonPass++;
        } else {
            skeletonFail++;
            missingSkeletons.push(`${race}_S${stage}_skeleton.json`);
        }
    }
}

if (skeletonFail === 0) {
    pass(`All 72 skeleton JSON files exist (${skeletonPass}/72)`);
} else {
    fail(`Missing ${skeletonFail} skeleton JSON file(s) out of 72:`);
    for (const m of missingSkeletons) {
        console.log(`         - ${m}`);
    }
    if (skeletonPass > 0) {
        console.log(`         (${skeletonPass} of 72 found)`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK 6: No non-legacy file imports from HumanoidSpriteSystem.legacy.js
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n=== CHECK 6: No non-legacy imports from HumanoidSpriteSystem.legacy.js ===');

// Recursively find all .js files under Web/js
function walkDir(dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...walkDir(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            results.push(fullPath);
        }
    }
    return results;
}

const allJsFiles = walkDir(WEB_JS);
const legacyImportPattern = /import\s+\{[^}]*\}\s+from\s+['"][^'"]*HumanoidSpriteSystem\.legacy[^'"]*['"]/;
let legacyImportViolations = [];

for (const filePath of allJsFiles) {
    const basename = path.basename(filePath);
    // The legacy file itself is exempt
    if (basename === 'HumanoidSpriteSystem.legacy.js') continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    if (legacyImportPattern.test(content)) {
        const relPath = path.relative(ROOT, filePath);
        legacyImportViolations.push(relPath);
    }
}

if (legacyImportViolations.length === 0) {
    pass('No non-legacy file imports from HumanoidSpriteSystem.legacy.js');
} else {
    fail(`${legacyImportViolations.length} file(s) import from HumanoidSpriteSystem.legacy.js:`);
    for (const v of legacyImportViolations) {
        console.log(`         - ${v}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60));
console.log(`RESULTS:  ${totalPass} passed, ${totalFail} failed, ${totalPass + totalFail} total`);
if (totalFail === 0) {
    console.log('\x1b[32mAll checks passed! UI sprite rendering is consistent.\x1b[0m');
} else {
    console.log(`\x1b[31m${totalFail} check(s) failed — see details above.\x1b[0m`);
}
console.log('='.repeat(60) + '\n');

process.exit(totalFail > 0 ? 1 : 0);

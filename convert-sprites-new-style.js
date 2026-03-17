#!/usr/bin/env node
/**
 * convert-sprites-new-style.js
 *
 * Converts all races to use S3-format skeletons across all stages.
 * - Template races (Human, CatMan, Skeleton, Devil): their S3 format/PNGs propagate to S1/S2
 * - Non-template races: use a template race's body, but keep their own S3 head + extra_0
 */

const fs = require('fs');
const path = require('path');

const CHARS_DIR = path.join(__dirname, 'Sprites', 'Characters');

// The 4 template races whose bodies are the canonical reference
const TEMPLATE_RACES = ['Human', 'CatMan', 'Skeleton', 'Devil'];

// Map each non-template race to the template whose body they'll use
const RACE_TO_TEMPLATE = {
    // Human body (standard humanoid)
    Elf:        'Human',
    Mummy:      'Human',
    Zombie:     'Human',
    Ghost:      'Human',
    Ork:        'Human',
    // CatMan body (animal humanoid)
    BearMan:    'CatMan',
    WolfMan:    'CatMan',
    MonkeyMan:  'CatMan',
    RatMan:     'CatMan',
    BirdMan:    'CatMan',
    // Skeleton body (thin/bony)
    Robot:      'Skeleton',
    Golem:      'Skeleton',
    // Devil body (bulky/demon)
    Demon:      'Devil',
    Minotaur:   'Devil',
    LizardMan:  'Devil',
    FishMan:    'Devil',
    SharkMan:   'Devil',
    BugMan:     'Devil',
    TurtleMan:  'Devil',
    Ent:        'Devil',
};

// Body parts that come from the template (everything except head and extras)
const BODY_PARTS = [
    'torso', 'left_arm', 'right_arm', 'left_hand', 'right_hand',
    'left_leg', 'right_leg', 'left_foot', 'right_foot'
];

// Parts that stay unique to each race (thematic)
const HEAD_PARTS = ['head', 'extra_0'];

const ALL_STAGES = [1, 2, 3];

let stats = { skeletonsWritten: 0, pngsCopied: 0, errors: [] };

function loadJson(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        return null;
    }
}

function copyFile(src, dst) {
    try {
        if (src === dst) return; // skip self-copy
        fs.copyFileSync(src, dst);
        stats.pngsCopied++;
    } catch (e) {
        stats.errors.push(`COPY FAIL: ${src} -> ${dst}: ${e.message}`);
    }
}

function buildSkeleton(race, stage, templateSkeleton, raceHeadData) {
    // Start from the template skeleton
    const skel = JSON.parse(JSON.stringify(templateSkeleton));
    skel.race = race;
    skel.stage = stage;
    skel.source_size = 128; // All stages use S3 size

    // Update file references for body parts to point to this race's files
    for (const partName of Object.keys(skel.parts)) {
        const isHeadPart = HEAD_PARTS.includes(partName);

        if (isHeadPart && raceHeadData && raceHeadData[partName]) {
            // Use the race's own head/extra data (dimensions, bbox, anchor)
            skel.parts[partName] = JSON.parse(JSON.stringify(raceHeadData[partName]));
        }

        // Always update the file reference to this race/stage
        skel.parts[partName].file = `${race}_S${stage}_${partName}.png`;
    }

    return skel;
}

// ─── Load all template S3 skeletons ───
console.log('Loading template S3 skeletons...');
const templateSkeletons = {};
for (const tmpl of TEMPLATE_RACES) {
    const skelPath = path.join(CHARS_DIR, tmpl, 'parts', `${tmpl}_S3_skeleton.json`);
    templateSkeletons[tmpl] = loadJson(skelPath);
    if (!templateSkeletons[tmpl]) {
        console.error(`FATAL: Cannot load template skeleton: ${skelPath}`);
        process.exit(1);
    }
    console.log(`  Loaded ${tmpl} S3 template (${Object.keys(templateSkeletons[tmpl].parts).length} parts)`);
}

// ─── Process template races ───
console.log('\n=== Processing TEMPLATE races ===');
for (const race of TEMPLATE_RACES) {
    const partsDir = path.join(CHARS_DIR, race, 'parts');
    const s3Skel = templateSkeletons[race];

    for (const stage of [1, 2]) {
        // Build skeleton JSON for this stage (same as S3 but with updated stage/filenames)
        const skel = buildSkeleton(race, stage, s3Skel, s3Skel.parts);
        const skelPath = path.join(partsDir, `${race}_S${stage}_skeleton.json`);
        fs.writeFileSync(skelPath, JSON.stringify(skel, null, 2));
        stats.skeletonsWritten++;
        console.log(`  Wrote ${race} S${stage} skeleton`);

        // Copy S3 PNGs to S1/S2 names (all parts including head)
        for (const partName of Object.keys(s3Skel.parts)) {
            const srcPng = path.join(partsDir, `${race}_S3_${partName}.png`);
            const dstPng = path.join(partsDir, `${race}_S${stage}_${partName}.png`);
            if (fs.existsSync(srcPng)) {
                copyFile(srcPng, dstPng);
            }
        }
    }
    console.log(`  ${race}: S1 and S2 now match S3 format`);
}

// ─── Process non-template races ───
console.log('\n=== Processing NON-TEMPLATE races ===');
for (const [race, templateName] of Object.entries(RACE_TO_TEMPLATE)) {
    const partsDir = path.join(CHARS_DIR, race, 'parts');
    const tmplPartsDir = path.join(CHARS_DIR, templateName, 'parts');
    const tmplSkel = templateSkeletons[templateName];

    // Load this race's S3 skeleton to get their head/extra dimensions
    const raceS3Path = path.join(partsDir, `${race}_S3_skeleton.json`);
    const raceS3 = loadJson(raceS3Path);

    // Extract head part data from the race's own S3 (or fall back to template)
    let raceHeadData = {};
    if (raceS3 && raceS3.parts) {
        for (const hp of HEAD_PARTS) {
            if (raceS3.parts[hp]) {
                raceHeadData[hp] = raceS3.parts[hp];
            }
        }
    }

    console.log(`  ${race} (template: ${templateName})`);

    for (const stage of ALL_STAGES) {
        // Build skeleton: template body + race's head
        const skel = buildSkeleton(race, stage, tmplSkel, raceHeadData);
        const skelPath = path.join(partsDir, `${race}_S${stage}_skeleton.json`);
        fs.writeFileSync(skelPath, JSON.stringify(skel, null, 2));
        stats.skeletonsWritten++;

        // Copy template's S3 BODY PNGs -> this race's stage PNGs
        for (const partName of BODY_PARTS) {
            const srcPng = path.join(tmplPartsDir, `${templateName}_S3_${partName}.png`);
            const dstPng = path.join(partsDir, `${race}_S${stage}_${partName}.png`);
            if (fs.existsSync(srcPng)) {
                copyFile(srcPng, dstPng);
            } else {
                stats.errors.push(`MISSING TEMPLATE PNG: ${srcPng}`);
            }
        }

        // Copy this race's own S3 head + extra PNGs to this stage
        for (const hp of HEAD_PARTS) {
            const srcPng = path.join(partsDir, `${race}_S3_${hp}.png`);
            const dstPng = path.join(partsDir, `${race}_S${stage}_${hp}.png`);
            if (fs.existsSync(srcPng)) {
                copyFile(srcPng, dstPng);
            }
            // extra_0 may not exist for all races - that's OK
        }
    }
}

// ─── Summary ───
console.log('\n=== CONVERSION COMPLETE ===');
console.log(`  Skeletons written: ${stats.skeletonsWritten}`);
console.log(`  PNGs copied: ${stats.pngsCopied}`);
if (stats.errors.length > 0) {
    console.log(`\n  ERRORS (${stats.errors.length}):`);
    for (const err of stats.errors) {
        console.log(`    ${err}`);
    }
} else {
    console.log('  No errors!');
}

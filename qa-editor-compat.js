#!/usr/bin/env node
/**
 * QA Script: Validate all 72 skeleton/stage combos are compatible
 * with the sprite editor's loadSkeleton() logic.
 *
 * Checks:
 *  1. Skeleton JSON exists and is valid JSON
 *  2. The 10 core body part PNGs exist
 *  3. Bone hierarchy is valid (no circular refs, torso is root with parent=null)
 *  4. All bones reference valid parent names
 *  5. offset_x and offset_y are between 0 and 1 (normalized)
 *  6. No NaN or Infinity values in any numeric fields
 */

const fs = require('fs');
const path = require('path');

const RACES = [
  'Human', 'Elf', 'Demon', 'Devil', 'CatMan', 'BearMan', 'WolfMan',
  'MonkeyMan', 'BugMan', 'BirdMan', 'Ent', 'FishMan', 'Ghost', 'Golem',
  'LizardMan', 'Minotaur', 'Mummy', 'Ork', 'RatMan', 'Robot', 'Skeleton',
  'SharkMan', 'TurtleMan', 'Zombie'
];

const STAGES = [1, 2, 3];

const CORE_PARTS = [
  'head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg',
  'left_hand', 'right_hand', 'left_foot', 'right_foot'
];

// All 13 parts the editor iterates over
const ALL_BODY_PARTS = [
  'head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg',
  'left_hand', 'right_hand', 'left_foot', 'right_foot', 'tail', 'wings', 'accessory'
];

const BASE_DIR = path.join(__dirname, 'Sprites', 'Characters');

let totalIssues = 0;
let totalWarnings = 0;
let totalCombos = 0;
let passedCombos = 0;

const issues = [];
const warnings = [];

function addIssue(race, stage, msg) {
  totalIssues++;
  issues.push({ race, stage, msg });
}

function addWarning(race, stage, msg) {
  totalWarnings++;
  warnings.push({ race, stage, msg });
}

/**
 * Recursively walk an object looking for NaN or Infinity in numeric fields.
 */
function findBadNumbers(obj, path, race, stage) {
  if (obj === null || obj === undefined) return;
  if (typeof obj === 'number') {
    if (Number.isNaN(obj)) {
      addIssue(race, stage, `NaN value at ${path}`);
    } else if (!Number.isFinite(obj)) {
      addIssue(race, stage, `Infinity value at ${path}`);
    }
    return;
  }
  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      findBadNumbers(val, `${path}.${key}`, race, stage);
    }
  }
}

/**
 * Detect circular references in bone hierarchy.
 * Returns true if circular reference found.
 */
function hasCircularRef(bones, startBone) {
  const visited = new Set();
  let current = startBone;
  while (current !== null && current !== undefined) {
    if (visited.has(current)) return true;
    visited.add(current);
    if (!bones[current]) break;
    current = bones[current].parent;
  }
  return false;
}

function validateCombo(race, stage) {
  totalCombos++;
  let comboIssues = 0;
  const partsDir = path.join(BASE_DIR, race, 'parts');

  // --- Check 1: Skeleton JSON exists and is valid ---
  const skelPath = path.join(partsDir, `${race}_S${stage}_skeleton.json`);
  let skelData = null;

  if (!fs.existsSync(skelPath)) {
    addIssue(race, stage, `Skeleton JSON missing: ${skelPath}`);
    comboIssues++;
    // Can't do further bone checks without skeleton
  } else {
    const raw = fs.readFileSync(skelPath, 'utf8');
    try {
      skelData = JSON.parse(raw);
    } catch (e) {
      addIssue(race, stage, `Skeleton JSON parse error: ${e.message}`);
      comboIssues++;
    }
  }

  // --- Check 2: 10 core body part PNGs exist ---
  for (const part of CORE_PARTS) {
    const pngPath = path.join(partsDir, `${race}_S${stage}_${part}.png`);
    if (!fs.existsSync(pngPath)) {
      addIssue(race, stage, `Missing core PNG: ${race}_S${stage}_${part}.png`);
      comboIssues++;
    }
  }

  // If skeleton data is available, do deeper checks
  if (skelData) {
    // --- Check 6: No NaN or Infinity anywhere ---
    findBadNumbers(skelData, 'root', race, stage);

    const bones = skelData.bones || {};
    const boneNames = Object.keys(bones);

    // --- Check 3: torso is root with parent=null ---
    if (!bones.torso) {
      addIssue(race, stage, 'Bone hierarchy: "torso" bone is missing');
      comboIssues++;
    } else if (bones.torso.parent !== null) {
      addIssue(race, stage, `Bone hierarchy: torso.parent should be null, got "${bones.torso.parent}"`);
      comboIssues++;
    }

    // --- Check 4: All bones reference valid parent names ---
    for (const [boneName, bone] of Object.entries(bones)) {
      if (bone.parent !== null && bone.parent !== undefined) {
        if (!bones[bone.parent]) {
          addIssue(race, stage, `Bone "${boneName}" references non-existent parent "${bone.parent}"`);
          comboIssues++;
        }
      }
    }

    // --- Check 3 (continued): No circular references ---
    for (const boneName of boneNames) {
      if (hasCircularRef(bones, boneName)) {
        addIssue(race, stage, `Circular reference detected starting from bone "${boneName}"`);
        comboIssues++;
        break; // one report per combo is enough
      }
    }

    // --- Check 5: offset_x and offset_y are normalized (0..1) ---
    for (const [boneName, bone] of Object.entries(bones)) {
      if (bone.offset_x !== undefined) {
        if (typeof bone.offset_x !== 'number') {
          addIssue(race, stage, `Bone "${boneName}": offset_x is not a number (${typeof bone.offset_x})`);
          comboIssues++;
        } else if (bone.offset_x < 0 || bone.offset_x > 1) {
          addIssue(race, stage, `Bone "${boneName}": offset_x=${bone.offset_x} is outside [0,1]`);
          comboIssues++;
        }
      }
      if (bone.offset_y !== undefined) {
        if (typeof bone.offset_y !== 'number') {
          addIssue(race, stage, `Bone "${boneName}": offset_y is not a number (${typeof bone.offset_y})`);
          comboIssues++;
        } else if (bone.offset_y < 0 || bone.offset_y > 1) {
          addIssue(race, stage, `Bone "${boneName}": offset_y=${bone.offset_y} is outside [0,1]`);
          comboIssues++;
        }
      }
    }

    // Additional warning: bones defined in skeleton but not in the 10 core parts
    for (const boneName of boneNames) {
      if (!ALL_BODY_PARTS.includes(boneName)) {
        addWarning(race, stage, `Bone "${boneName}" is not one of the 13 known BODY_PARTS`);
      }
    }
  }

  if (comboIssues === 0) passedCombos++;
}

// ── Main ──
console.log('='.repeat(70));
console.log('  Sprite Wars QA: Editor Skeleton Compatibility Check');
console.log('  Validating all 72 race/stage combos against sprite-editor.html');
console.log('='.repeat(70));
console.log();

for (const race of RACES) {
  for (const stage of STAGES) {
    validateCombo(race, stage);
  }
}

// ── Report ──
if (issues.length > 0) {
  console.log(`ISSUES (${issues.length}):`);
  console.log('-'.repeat(70));
  let lastKey = '';
  for (const { race, stage, msg } of issues) {
    const key = `${race} S${stage}`;
    if (key !== lastKey) {
      console.log();
      console.log(`  [${key}]`);
      lastKey = key;
    }
    console.log(`    FAIL  ${msg}`);
  }
  console.log();
}

if (warnings.length > 0) {
  console.log(`WARNINGS (${warnings.length}):`);
  console.log('-'.repeat(70));
  let lastKey = '';
  for (const { race, stage, msg } of warnings) {
    const key = `${race} S${stage}`;
    if (key !== lastKey) {
      console.log();
      console.log(`  [${key}]`);
      lastKey = key;
    }
    console.log(`    WARN  ${msg}`);
  }
  console.log();
}

console.log('='.repeat(70));
console.log(`  SUMMARY`);
console.log(`  Total combos checked:  ${totalCombos}`);
console.log(`  Passed (no issues):    ${passedCombos}/${totalCombos}`);
console.log(`  Failed:                ${totalCombos - passedCombos}/${totalCombos}`);
console.log(`  Total issues:          ${totalIssues}`);
console.log(`  Total warnings:        ${totalWarnings}`);
console.log('='.repeat(70));

process.exit(totalIssues > 0 ? 1 : 0);

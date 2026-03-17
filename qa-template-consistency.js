#!/usr/bin/env node
/**
 * QA Script: Template Consistency Checker
 *
 * Verifies that non-template races correctly use their assigned template body.
 * Compares bone offsets, part dimensions, head uniqueness, and PNG file sizes.
 */

const fs = require('fs');
const path = require('path');

const CHARS_DIR = '/home/user/sprite-wars/Sprites/Characters';

const TEMPLATE_ASSIGNMENTS = {
  Human:   ['Elf', 'Mummy', 'Zombie', 'Ghost', 'Ork'],
  CatMan:  ['BearMan', 'WolfMan', 'MonkeyMan', 'RatMan', 'BirdMan'],
  Skeleton:['Robot', 'Golem'],
  Devil:   ['Demon', 'Minotaur', 'LizardMan', 'FishMan', 'SharkMan', 'BugMan', 'TurtleMan', 'Ent'],
};

const BODY_PARTS = [
  'torso', 'left_arm', 'right_arm', 'left_hand', 'right_hand',
  'left_leg', 'right_leg', 'left_foot', 'right_foot'
];

const STAGES = [1, 2, 3];

function loadSkeleton(race, stage) {
  const filePath = path.join(CHARS_DIR, race, 'parts', `${race}_S${stage}_skeleton.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function getPngSize(race, stage, part) {
  const filePath = path.join(CHARS_DIR, race, 'parts', `${race}_S${stage}_${part}.png`);
  try {
    return fs.statSync(filePath).size;
  } catch (e) {
    return null;
  }
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => deepEqual(a[k], b[k]));
  }
  return false;
}

// ---- Main ----

let totalDiscrepancies = 0;
let totalChecks = 0;
const discrepancies = [];

function report(template, race, stage, category, detail) {
  totalDiscrepancies++;
  const msg = `[${template} -> ${race} S${stage}] ${category}: ${detail}`;
  discrepancies.push(msg);
}

// Load all template S3 skeletons first
const templateSkeletons = {};
for (const tmpl of Object.keys(TEMPLATE_ASSIGNMENTS)) {
  const skel = loadSkeleton(tmpl, 3);
  if (!skel) {
    console.error(`FATAL: Cannot load template skeleton for ${tmpl} S3`);
    process.exit(1);
  }
  templateSkeletons[tmpl] = skel;
}

for (const [template, races] of Object.entries(TEMPLATE_ASSIGNMENTS)) {
  const tmplSkel = templateSkeletons[template];

  for (const race of races) {
    for (const stage of STAGES) {
      const raceSkel = loadSkeleton(race, stage);
      if (!raceSkel) {
        report(template, race, stage, 'MISSING_FILE', `Skeleton JSON not found`);
        continue;
      }

      // CHECK 1: Bone offsets for body parts must match template S3
      for (const part of BODY_PARTS) {
        totalChecks++;
        const tmplBone = tmplSkel.bones[part];
        const raceBone = raceSkel.bones[part];

        if (!tmplBone) {
          report(template, race, stage, 'BONE_MISSING_TEMPLATE', `Bone "${part}" missing from template`);
          continue;
        }
        if (!raceBone) {
          report(template, race, stage, 'BONE_MISSING_RACE', `Bone "${part}" missing from race skeleton`);
          continue;
        }

        for (const field of ['offset_x', 'offset_y', 'rotation', 'scale', 'parent']) {
          if (!deepEqual(tmplBone[field], raceBone[field])) {
            report(template, race, stage, 'BONE_MISMATCH',
              `Bone "${part}.${field}": expected ${JSON.stringify(tmplBone[field])}, got ${JSON.stringify(raceBone[field])}`);
          }
        }
      }

      // CHECK 2: Body part dimensions (width, height, source_bbox, source_center, anchor)
      for (const part of BODY_PARTS) {
        totalChecks++;
        const tmplPart = tmplSkel.parts[part];
        const racePart = raceSkel.parts[part];

        if (!tmplPart) {
          report(template, race, stage, 'PART_MISSING_TEMPLATE', `Part "${part}" missing from template`);
          continue;
        }
        if (!racePart) {
          report(template, race, stage, 'PART_MISSING_RACE', `Part "${part}" missing from race skeleton`);
          continue;
        }

        for (const field of ['width', 'height', 'source_bbox', 'source_center', 'anchor']) {
          if (!deepEqual(tmplPart[field], racePart[field])) {
            report(template, race, stage, 'DIMENSION_MISMATCH',
              `Part "${part}.${field}": expected ${JSON.stringify(tmplPart[field])}, got ${JSON.stringify(racePart[field])}`);
          }
        }
      }

      // CHECK 3: Head part data should be DIFFERENT from template (unique head)
      totalChecks++;
      const tmplHead = tmplSkel.parts.head;
      const raceHead = raceSkel.parts.head;
      if (tmplHead && raceHead) {
        // Compare dimensional properties (excluding file name which will always differ)
        const headFields = ['width', 'height', 'source_bbox', 'source_center', 'anchor'];
        let allMatch = true;
        for (const field of headFields) {
          if (!deepEqual(tmplHead[field], raceHead[field])) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) {
          report(template, race, stage, 'HEAD_NOT_UNIQUE',
            `Head dimensions are identical to template -- expected unique head data`);
        }
      } else if (!raceHead) {
        report(template, race, stage, 'HEAD_MISSING', `Head part missing from race skeleton`);
      }

      // CHECK 4: Body PNGs should be identical files (same file size) as template S3
      for (const part of BODY_PARTS) {
        totalChecks++;
        const tmplSize = getPngSize(template, 3, part);
        const raceSize = getPngSize(race, stage, part);

        if (tmplSize === null) {
          report(template, race, stage, 'PNG_MISSING_TEMPLATE', `PNG "${part}" missing from template`);
          continue;
        }
        if (raceSize === null) {
          report(template, race, stage, 'PNG_MISSING_RACE', `PNG "${part}" missing from race`);
          continue;
        }

        if (tmplSize !== raceSize) {
          report(template, race, stage, 'PNG_SIZE_MISMATCH',
            `PNG "${part}": template=${tmplSize} bytes, race=${raceSize} bytes`);
        }
      }
    }
  }
}

// ---- Output Report ----

console.log('='.repeat(80));
console.log('  QA TEMPLATE CONSISTENCY REPORT');
console.log('='.repeat(80));
console.log(`  Date: ${new Date().toISOString()}`);
console.log(`  Total checks performed: ${totalChecks}`);
console.log(`  Total discrepancies found: ${totalDiscrepancies}`);
console.log('='.repeat(80));

if (discrepancies.length === 0) {
  console.log('\n  ALL CHECKS PASSED -- No discrepancies found.\n');
} else {
  // Group by category
  const byCategory = {};
  for (const d of discrepancies) {
    const match = d.match(/\] ([A-Z_]+):/);
    const cat = match ? match[1] : 'UNKNOWN';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(d);
  }

  for (const [cat, items] of Object.entries(byCategory)) {
    console.log(`\n--- ${cat} (${items.length}) ---`);
    for (const item of items) {
      console.log(`  ${item}`);
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log(`  RESULT: ${totalDiscrepancies === 0 ? 'PASS' : 'FAIL'} (${totalDiscrepancies} issue(s))`);
console.log('='.repeat(80));

process.exit(totalDiscrepancies > 0 ? 1 : 0);

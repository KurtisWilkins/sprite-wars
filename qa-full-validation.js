#!/usr/bin/env node
/**
 * Sprite Wars — Comprehensive QA Validation Script
 * Validates all 72 skeleton JSONs, PNG assets, head consistency,
 * and template body-part matching.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Configuration ───────────────────────────────────────────────────────────

const BASE = path.join(__dirname, 'Sprites', 'Characters');
const ALL_RACES = [
  'BearMan','BirdMan','BugMan','CatMan','Demon','Devil','Elf','Ent',
  'FishMan','Ghost','Golem','Human','LizardMan','Minotaur','MonkeyMan',
  'Mummy','Ork','RatMan','Robot','SharkMan','Skeleton','TurtleMan',
  'WolfMan','Zombie'
];
const STAGES = [1, 2, 3];

const REQUIRED_PARTS = [
  'head','torso','left_arm','right_arm','left_leg','right_leg',
  'left_hand','right_hand','left_foot','right_foot'
];

// Races that keep their own unique heads (excluded from head-copy check)
const TEMPLATE_HEAD_RACES = ['Human','CatMan','Devil','Skeleton','Zombie'];
const NEW_HEAD_RACES = ALL_RACES.filter(r => !TEMPLATE_HEAD_RACES.includes(r));

// Template mapping for body parts (non-head)
const TEMPLATE_MAP = {
  Elf: 'Human', Mummy: 'Human', Zombie: 'Human', Ghost: 'Human', Ork: 'Human',
  BearMan: 'CatMan', WolfMan: 'CatMan', MonkeyMan: 'CatMan', RatMan: 'CatMan', BirdMan: 'CatMan',
  Robot: 'Skeleton', Golem: 'Skeleton',
  Demon: 'Devil', Minotaur: 'Devil', LizardMan: 'Devil', FishMan: 'Devil',
  SharkMan: 'Devil', BugMan: 'Devil', TurtleMan: 'Devil', Ent: 'Devil'
};

const BODY_PARTS = ['torso','left_arm','right_arm','left_leg','right_leg',
                    'left_hand','right_hand','left_foot','right_foot'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

let totalIssues = 0;
let totalWarnings = 0;
let totalChecks = 0;
const issues = [];
const warnings = [];

function issue(msg) {
  totalIssues++;
  issues.push(msg);
}
function warn(msg) {
  totalWarnings++;
  warnings.push(msg);
}
function check() { totalChecks++; }

function skeletonPath(race, stage) {
  return path.join(BASE, race, 'parts', `${race}_S${stage}_skeleton.json`);
}

function partPngPath(race, stage, part) {
  return path.join(BASE, race, 'parts', `${race}_S${stage}_${part}.png`);
}

function fileHash(fpath) {
  try {
    const buf = fs.readFileSync(fpath);
    return crypto.createHash('md5').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function isPngHeader(fpath) {
  try {
    const buf = Buffer.alloc(8);
    const fd = fs.openSync(fpath, 'r');
    fs.readSync(fd, buf, 0, 8, 0);
    fs.closeSync(fd);
    // PNG magic bytes: 137 80 78 71 13 10 26 10
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
           buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A;
  } catch {
    return false;
  }
}

function readPngDimensions(fpath) {
  try {
    const buf = Buffer.alloc(24);
    const fd = fs.openSync(fpath, 'r');
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    // IHDR chunk starts at byte 16, width at 16, height at 20 (big-endian)
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } catch {
    return null;
  }
}

function hasNaNOrInfinity(obj, path_str) {
  const found = [];
  function walk(o, p) {
    if (o === null || o === undefined) return;
    if (typeof o === 'number') {
      if (isNaN(o) || !isFinite(o)) {
        found.push(`${p} = ${o}`);
      }
    } else if (typeof o === 'object') {
      for (const [k, v] of Object.entries(o)) {
        walk(v, `${p}.${k}`);
      }
    }
  }
  walk(obj, path_str);
  return found;
}

// ─── Section 1: Skeleton JSON Validation ─────────────────────────────────────

function validateSkeletons() {
  console.log('\n' + '='.repeat(70));
  console.log('SECTION 1: Skeleton JSON Validation (72 files)');
  console.log('='.repeat(70));

  let parsed = 0;
  const skeletons = {};

  for (const race of ALL_RACES) {
    for (const stage of STAGES) {
      const fp = skeletonPath(race, stage);
      const label = `${race}_S${stage}`;

      // 1a. File exists
      check();
      if (!fs.existsSync(fp)) {
        issue(`[MISSING] ${label}: skeleton JSON not found at ${fp}`);
        continue;
      }

      // 1b. Valid JSON
      check();
      let data;
      try {
        const raw = fs.readFileSync(fp, 'utf8');
        data = JSON.parse(raw);
        parsed++;
      } catch (e) {
        issue(`[PARSE] ${label}: Invalid JSON — ${e.message}`);
        continue;
      }

      skeletons[label] = data;

      // 1c. source_size = 128
      check();
      if (data.source_size !== 128) {
        issue(`[SOURCE_SIZE] ${label}: source_size=${data.source_size}, expected 128`);
      }

      // 1d. All required parts present
      check();
      const partKeys = Object.keys(data.parts || {});
      for (const rp of REQUIRED_PARTS) {
        if (!partKeys.includes(rp)) {
          issue(`[MISSING_PART] ${label}: required part "${rp}" not found in parts`);
        }
      }

      // 1e. Each part has valid width, height, anchor
      for (const rp of REQUIRED_PARTS) {
        const part = (data.parts || {})[rp];
        if (!part) continue;

        check();
        if (typeof part.width !== 'number' || part.width <= 0) {
          issue(`[PART] ${label}.${rp}: invalid width=${part.width}`);
        }
        check();
        if (typeof part.height !== 'number' || part.height <= 0) {
          issue(`[PART] ${label}.${rp}: invalid height=${part.height}`);
        }
        check();
        if (!part.anchor || typeof part.anchor.x !== 'number' || typeof part.anchor.y !== 'number') {
          issue(`[PART] ${label}.${rp}: missing or invalid anchor`);
        }
      }

      // 1f. Bones validation
      const bones = data.bones || {};

      // torso must have parent=null
      check();
      if (!bones.torso) {
        issue(`[BONES] ${label}: torso bone missing`);
      } else if (bones.torso.parent !== null) {
        issue(`[BONES] ${label}: torso.parent=${bones.torso.parent}, expected null`);
      }

      // All bones have valid parent references (no dangling, no circular)
      for (const [boneName, bone] of Object.entries(bones)) {
        check();
        if (bone.parent !== null && !bones[bone.parent]) {
          issue(`[BONES] ${label}: bone "${boneName}" references non-existent parent "${bone.parent}"`);
        }

        // Check offset_x/offset_y in [0,1]
        check();
        if (typeof bone.offset_x !== 'number' || bone.offset_x < 0 || bone.offset_x > 1) {
          issue(`[OFFSET] ${label}: bone "${boneName}".offset_x=${bone.offset_x} out of [0,1]`);
        }
        check();
        if (typeof bone.offset_y !== 'number' || bone.offset_y < 0 || bone.offset_y > 1) {
          issue(`[OFFSET] ${label}: bone "${boneName}".offset_y=${bone.offset_y} out of [0,1]`);
        }
      }

      // Circular reference check
      for (const [boneName] of Object.entries(bones)) {
        check();
        const visited = new Set();
        let cur = boneName;
        let circular = false;
        while (cur !== null && bones[cur]) {
          if (visited.has(cur)) {
            circular = true;
            break;
          }
          visited.add(cur);
          cur = bones[cur].parent;
        }
        if (circular) {
          issue(`[CIRCULAR] ${label}: circular bone reference detected starting from "${boneName}"`);
        }
      }

      // 1g. NaN / Infinity check
      check();
      const nanFinds = hasNaNOrInfinity(data, label);
      for (const nf of nanFinds) {
        issue(`[NaN/Inf] ${nf}`);
      }
    }
  }

  console.log(`  Parsed: ${parsed}/72 skeleton JSONs`);
  return skeletons;
}

// ─── Section 2: PNG Existence Check ──────────────────────────────────────────

function validatePngExistence(skeletons) {
  console.log('\n' + '='.repeat(70));
  console.log('SECTION 2: Referenced PNG Existence');
  console.log('='.repeat(70));

  let found = 0;
  let missing = 0;
  let empty = 0;

  for (const race of ALL_RACES) {
    for (const stage of STAGES) {
      const label = `${race}_S${stage}`;
      const data = skeletons[label];
      if (!data) continue;

      for (const [partName, partData] of Object.entries(data.parts || {})) {
        const pngPath = path.join(BASE, race, 'parts', partData.file || `${race}_S${stage}_${partName}.png`);

        check();
        if (!fs.existsSync(pngPath)) {
          issue(`[PNG_MISSING] ${label}: ${partName} PNG not found: ${path.basename(pngPath)}`);
          missing++;
        } else {
          const stat = fs.statSync(pngPath);
          check();
          if (stat.size === 0) {
            issue(`[PNG_EMPTY] ${label}: ${partName} PNG is 0 bytes: ${path.basename(pngPath)}`);
            empty++;
          } else {
            found++;
          }
        }
      }
    }
  }

  console.log(`  PNGs found: ${found}, missing: ${missing}, empty: ${empty}`);
}

// ─── Section 3: Head PNG Validation for New-Head Races ───────────────────────

function validateHeadPngs(skeletons) {
  console.log('\n' + '='.repeat(70));
  console.log('SECTION 3: Head PNG Validation (19 new-head races)');
  console.log('='.repeat(70));

  let racesOk = 0;
  let racesWithIssues = 0;

  for (const race of NEW_HEAD_RACES) {
    const headHashes = [];
    let raceOk = true;

    for (const stage of STAGES) {
      const label = `${race}_S${stage}`;
      const headPath = partPngPath(race, stage, 'head');

      // Check it exists
      check();
      if (!fs.existsSync(headPath)) {
        issue(`[HEAD_MISSING] ${label}: head PNG not found`);
        raceOk = false;
        continue;
      }

      // Check it's a valid PNG
      check();
      if (!isPngHeader(headPath)) {
        issue(`[HEAD_INVALID] ${label}: head PNG has invalid PNG header`);
        raceOk = false;
        continue;
      }

      // Check dimensions match skeleton JSON
      const data = skeletons[label];
      if (data && data.parts && data.parts.head) {
        const dims = readPngDimensions(headPath);
        if (dims) {
          check();
          if (dims.width !== data.parts.head.width || dims.height !== data.parts.head.height) {
            issue(`[HEAD_DIM] ${label}: head PNG is ${dims.width}x${dims.height} but skeleton says ${data.parts.head.width}x${data.parts.head.height}`);
            raceOk = false;
          }
        }
      }

      headHashes.push({ stage, hash: fileHash(headPath) });
    }

    // All 3 stages should have identical head PNGs
    if (headHashes.length === 3) {
      check();
      const unique = new Set(headHashes.map(h => h.hash));
      if (unique.size !== 1) {
        issue(`[HEAD_MISMATCH] ${race}: head PNGs differ across stages ` +
              `(S1=${headHashes[0].hash?.slice(0,8)}, S2=${headHashes[1].hash?.slice(0,8)}, S3=${headHashes[2].hash?.slice(0,8)})`);
        raceOk = false;
      }
    }

    if (raceOk) racesOk++;
    else racesWithIssues++;
  }

  console.log(`  Races OK: ${racesOk}/19, with issues: ${racesWithIssues}`);
}

// ─── Section 4: Template Consistency ─────────────────────────────────────────

function validateTemplateConsistency() {
  console.log('\n' + '='.repeat(70));
  console.log('SECTION 4: Template Body Part Consistency');
  console.log('='.repeat(70));

  let matches = 0;
  let mismatches = 0;
  let skipped = 0;

  for (const [race, template] of Object.entries(TEMPLATE_MAP)) {
    // Body parts should match template's S3 PNGs
    const templateStage = 3;

    for (const part of BODY_PARTS) {
      for (const stage of STAGES) {
        const racePng = partPngPath(race, stage, part);
        const templatePng = partPngPath(template, templateStage, part);

        check();
        if (!fs.existsSync(racePng)) {
          // Already reported in section 2
          skipped++;
          continue;
        }
        if (!fs.existsSync(templatePng)) {
          warn(`[TEMPLATE_REF] ${template}_S${templateStage}_${part}.png does not exist (template reference)`);
          skipped++;
          continue;
        }

        const raceHash = fileHash(racePng);
        const templateHash = fileHash(templatePng);

        if (raceHash === templateHash) {
          matches++;
        } else {
          issue(`[TEMPLATE] ${race}_S${stage}_${part}.png does NOT match template ${template}_S${templateStage}_${part}.png`);
          mismatches++;
        }
      }
    }
  }

  console.log(`  Body part checks — matches: ${matches}, mismatches: ${mismatches}, skipped: ${skipped}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║          SPRITE WARS — COMPREHENSIVE QA VALIDATION                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Base path: ${BASE}`);

  // Verify base path exists
  if (!fs.existsSync(BASE)) {
    console.error(`ERROR: Base path does not exist: ${BASE}`);
    process.exit(1);
  }

  const skeletons = validateSkeletons();
  validatePngExistence(skeletons);
  validateHeadPngs(skeletons);
  validateTemplateConsistency();

  // ─── Final Report ──────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('FINAL REPORT');
  console.log('='.repeat(70));
  console.log(`Total checks performed: ${totalChecks}`);
  console.log(`Issues found: ${totalIssues}`);
  console.log(`Warnings: ${totalWarnings}`);

  if (issues.length > 0) {
    console.log('\n--- ALL ISSUES ---');
    for (const iss of issues) {
      console.log(`  FAIL: ${iss}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n--- WARNINGS ---');
    for (const w of warnings) {
      console.log(`  WARN: ${w}`);
    }
  }

  if (totalIssues === 0 && totalWarnings === 0) {
    console.log('\n  *** ALL CHECKS PASSED ***');
  }

  console.log('\n' + '='.repeat(70));
  process.exit(totalIssues > 0 ? 1 : 0);
}

main();

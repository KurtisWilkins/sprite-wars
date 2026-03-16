#!/usr/bin/env node
/**
 * QA Script: Validate all 72 skeleton JSON files (24 races x 3 stages)
 * under Sprites/Characters/
 */

const fs = require('fs');
const path = require('path');

const CHARACTERS_DIR = path.join(__dirname, 'Sprites', 'Characters');

const RACES = [
  'Human', 'Elf', 'Demon', 'Devil', 'CatMan', 'BearMan', 'WolfMan',
  'MonkeyMan', 'BugMan', 'BirdMan', 'Ent', 'FishMan', 'Ghost', 'Golem',
  'LizardMan', 'Minotaur', 'Mummy', 'Ork', 'RatMan', 'Robot', 'Skeleton',
  'SharkMan', 'TurtleMan', 'Zombie'
];

const STAGES = [1, 2, 3];

const REQUIRED_TOP_KEYS = ['race', 'stage', 'source_size', 'parts', 'bones', 'draw_order'];

const REQUIRED_PARTS = [
  'head', 'torso', 'left_arm', 'right_arm', 'left_hand', 'right_hand',
  'left_leg', 'right_leg', 'left_foot', 'right_foot'
];

const REQUIRED_PART_FIELDS = ['file', 'width', 'height', 'source_bbox', 'source_center', 'anchor'];

const REQUIRED_BONE_FIELDS = ['parent', 'offset_x', 'offset_y', 'rotation', 'scale'];

const REQUIRED_DRAW_ORDER_ENTRIES = [
  'head', 'torso', 'left_arm', 'right_arm', 'left_foot', 'right_foot',
  'left_leg', 'right_leg', 'left_hand', 'right_hand'
];

let totalErrors = 0;
let totalWarnings = 0;
let filesChecked = 0;
let filesMissing = 0;
let filesInvalidJson = 0;

const errors = [];
const warnings = [];

function addError(file, message) {
  errors.push({ file, message });
  totalErrors++;
}

function addWarning(file, message) {
  warnings.push({ file, message });
  totalWarnings++;
}

function validateFile(race, stage) {
  const fileName = `${race}_S${stage}_skeleton.json`;
  const filePath = path.join(CHARACTERS_DIR, race, 'parts', fileName);
  const label = `${race}/parts/${fileName}`;

  // Check file exists
  if (!fs.existsSync(filePath)) {
    addError(label, 'File does not exist');
    filesMissing++;
    return;
  }

  filesChecked++;

  // Check 1: Valid JSON
  let data;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(raw);
  } catch (e) {
    addError(label, `Invalid JSON: ${e.message}`);
    filesInvalidJson++;
    return;
  }

  // Check 2: Required top-level keys
  for (const key of REQUIRED_TOP_KEYS) {
    if (!(key in data)) {
      addError(label, `Missing required top-level key: "${key}"`);
    }
  }

  // Check 8: source_size must be 128
  if ('source_size' in data && data.source_size !== 128) {
    addError(label, `source_size is ${data.source_size}, expected 128`);
  }

  // Check 9: Stage value is correct (1, 2, or 3)
  if ('stage' in data) {
    if (![1, 2, 3].includes(data.stage)) {
      addError(label, `Invalid stage value: ${data.stage} (expected 1, 2, or 3)`);
    }
    if (data.stage !== stage) {
      addError(label, `Stage value ${data.stage} does not match expected stage ${stage} from filename`);
    }
  }

  // Check 10: Race name matches directory name
  if ('race' in data && data.race !== race) {
    addError(label, `Race "${data.race}" does not match directory name "${race}"`);
  }

  // Check 3: Required parts exist
  if (data.parts && typeof data.parts === 'object') {
    for (const partName of REQUIRED_PARTS) {
      if (!(partName in data.parts)) {
        addError(label, `Missing required part: "${partName}"`);
      }
    }

    // Check 4: Each part has required fields
    for (const [partName, partData] of Object.entries(data.parts)) {
      if (typeof partData !== 'object' || partData === null) {
        addError(label, `Part "${partName}" is not a valid object`);
        continue;
      }

      for (const field of REQUIRED_PART_FIELDS) {
        if (!(field in partData)) {
          addError(label, `Part "${partName}" missing required field: "${field}"`);
        }
      }

      // Check source_bbox is array of 4
      if ('source_bbox' in partData) {
        if (!Array.isArray(partData.source_bbox)) {
          addError(label, `Part "${partName}": source_bbox is not an array`);
        } else if (partData.source_bbox.length !== 4) {
          addError(label, `Part "${partName}": source_bbox has ${partData.source_bbox.length} elements, expected 4`);
        }
      }

      // Check source_center is array of 2
      if ('source_center' in partData) {
        if (!Array.isArray(partData.source_center)) {
          addError(label, `Part "${partName}": source_center is not an array`);
        } else if (partData.source_center.length !== 2) {
          addError(label, `Part "${partName}": source_center has ${partData.source_center.length} elements, expected 2`);
        }
      }

      // Check anchor is object with x,y
      if ('anchor' in partData) {
        if (typeof partData.anchor !== 'object' || partData.anchor === null || Array.isArray(partData.anchor)) {
          addError(label, `Part "${partName}": anchor is not a valid object`);
        } else {
          if (!('x' in partData.anchor)) {
            addError(label, `Part "${partName}": anchor missing "x" property`);
          }
          if (!('y' in partData.anchor)) {
            addError(label, `Part "${partName}": anchor missing "y" property`);
          }
        }
      }

      // Check 7: file field matches pattern {Race}_S{Stage}_{part}.png
      if ('file' in partData) {
        const expectedPattern = `${race}_S${stage}_${partName}.png`;
        if (partData.file !== expectedPattern) {
          // Could be an extra part with a different naming convention - only error for required parts
          if (REQUIRED_PARTS.includes(partName)) {
            addError(label, `Part "${partName}": file is "${partData.file}", expected "${expectedPattern}"`);
          } else {
            // For extra parts, check it at least starts with the race/stage prefix
            const prefix = `${race}_S${stage}_`;
            if (!partData.file.startsWith(prefix)) {
              addError(label, `Part "${partName}": file "${partData.file}" does not start with expected prefix "${prefix}"`);
            }
          }
        }
      }
    }
  } else if ('parts' in data) {
    addError(label, '"parts" is not a valid object');
  }

  // Check 5: Every bone has required fields
  if (data.bones && typeof data.bones === 'object') {
    for (const [boneName, boneData] of Object.entries(data.bones)) {
      if (typeof boneData !== 'object' || boneData === null) {
        addError(label, `Bone "${boneName}" is not a valid object`);
        continue;
      }

      for (const field of REQUIRED_BONE_FIELDS) {
        if (!(field in boneData)) {
          addError(label, `Bone "${boneName}" missing required field: "${field}"`);
        }
      }
    }
  } else if ('bones' in data) {
    addError(label, '"bones" is not a valid object');
  }

  // Check 6: draw_order includes required entries
  if ('draw_order' in data) {
    if (!Array.isArray(data.draw_order)) {
      addError(label, '"draw_order" is not an array');
    } else {
      for (const entry of REQUIRED_DRAW_ORDER_ENTRIES) {
        if (!data.draw_order.includes(entry)) {
          addError(label, `draw_order missing required entry: "${entry}"`);
        }
      }
    }
  }
}

// Run validation
console.log('=== Sprite Wars Skeleton JSON QA Validation ===');
console.log(`Checking ${RACES.length} races x ${STAGES.length} stages = ${RACES.length * STAGES.length} expected files\n`);

for (const race of RACES) {
  for (const stage of STAGES) {
    validateFile(race, stage);
  }
}

// Print results
console.log('--- ERRORS ---');
if (errors.length === 0) {
  console.log('No errors found!');
} else {
  // Group errors by file
  const grouped = {};
  for (const err of errors) {
    if (!grouped[err.file]) grouped[err.file] = [];
    grouped[err.file].push(err.message);
  }
  for (const [file, msgs] of Object.entries(grouped)) {
    console.log(`\n[${file}]`);
    for (const msg of msgs) {
      console.log(`  ERROR: ${msg}`);
    }
  }
}

console.log('\n--- SUMMARY ---');
console.log(`Files expected:      ${RACES.length * STAGES.length}`);
console.log(`Files checked:       ${filesChecked}`);
console.log(`Files missing:       ${filesMissing}`);
console.log(`Files invalid JSON:  ${filesInvalidJson}`);
console.log(`Total errors:        ${totalErrors}`);
console.log(`\nResult: ${totalErrors === 0 ? 'PASS' : 'FAIL'}`);

process.exit(totalErrors === 0 ? 0 : 1);

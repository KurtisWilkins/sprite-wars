const fs = require('fs');
const path = require('path');

const CHARS_DIR = path.join(__dirname, 'Sprites', 'Characters');

const RACES = [
  'Human', 'Elf', 'Demon', 'Devil', 'CatMan', 'BearMan', 'WolfMan',
  'MonkeyMan', 'BugMan', 'BirdMan', 'Ent', 'FishMan', 'Ghost', 'Golem',
  'LizardMan', 'Minotaur', 'Mummy', 'Ork', 'RatMan', 'Robot', 'Skeleton',
  'SharkMan', 'TurtleMan', 'Zombie'
];

const STAGES = [1, 2, 3];

let totalJsons = 0;
let totalRefs = 0;
let missingFiles = [];
let zeroByteFiles = [];
let missingJsons = [];

for (const race of RACES) {
  for (const stage of STAGES) {
    const jsonName = `${race}_S${stage}_skeleton.json`;
    const jsonPath = path.join(CHARS_DIR, race, 'parts', jsonName);

    if (!fs.existsSync(jsonPath)) {
      missingJsons.push(jsonPath);
      continue;
    }

    totalJsons++;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
      console.error(`ERROR: Failed to parse ${jsonPath}: ${e.message}`);
      continue;
    }

    const parts = data.parts;
    if (!parts || typeof parts !== 'object') {
      console.error(`WARNING: No "parts" section in ${jsonPath}`);
      continue;
    }

    for (const [partName, partData] of Object.entries(parts)) {
      const pngFile = partData.file;
      if (!pngFile) {
        console.error(`WARNING: Part "${partName}" in ${jsonName} has no "file" field`);
        continue;
      }

      totalRefs++;
      const pngPath = path.join(CHARS_DIR, race, 'parts', pngFile);

      if (!fs.existsSync(pngPath)) {
        missingFiles.push({ json: jsonName, race, stage, part: partName, file: pngFile, expectedPath: pngPath });
      } else {
        const stat = fs.statSync(pngPath);
        if (stat.size === 0) {
          zeroByteFiles.push({ json: jsonName, race, stage, part: partName, file: pngFile, path: pngPath });
        }
      }
    }
  }
}

// === Report ===
console.log('='.repeat(70));
console.log('QA PNG Reference Check — Sprite Wars Skeleton Files');
console.log('='.repeat(70));
console.log(`\nScanned ${totalJsons} skeleton JSON files across ${RACES.length} races × ${STAGES.length} stages`);
console.log(`Total PNG references checked: ${totalRefs}`);

if (missingJsons.length > 0) {
  console.log(`\n--- MISSING SKELETON JSON FILES (${missingJsons.length}) ---`);
  for (const p of missingJsons) {
    console.log(`  MISSING JSON: ${p}`);
  }
}

if (missingFiles.length > 0) {
  console.log(`\n--- MISSING PNG FILES (${missingFiles.length}) ---`);
  for (const m of missingFiles) {
    console.log(`  [${m.race}/S${m.stage}] Part "${m.part}" references "${m.file}" — NOT FOUND`);
    console.log(`    Expected: ${m.expectedPath}`);
  }
} else {
  console.log('\nNo missing PNG files found.');
}

if (zeroByteFiles.length > 0) {
  console.log(`\n--- ZERO-BYTE (CORRUPTED) PNG FILES (${zeroByteFiles.length}) ---`);
  for (const z of zeroByteFiles) {
    console.log(`  [${z.race}/S${z.stage}] Part "${z.part}" file "${z.file}" is 0 bytes`);
    console.log(`    Path: ${z.path}`);
  }
} else {
  console.log('No zero-byte PNG files found.');
}

const totalIssues = missingJsons.length + missingFiles.length + zeroByteFiles.length;
console.log(`\n${'='.repeat(70)}`);
console.log(`TOTAL ISSUES: ${totalIssues}`);
console.log('='.repeat(70));

process.exit(totalIssues > 0 ? 1 : 0);

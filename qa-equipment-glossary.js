#!/usr/bin/env node
/**
 * QA Script — Equipment Glossary Integration Validation
 * Validates EquipmentAssetRegistry.js + GlossaryScreen.js integration.
 *
 * Checks:
 *  1. EquipmentAssetRegistry.js syntax (valid JS parse)
 *  2. All PNG paths exist on disk
 *  3. GlossaryScreen.js syntax (valid JS parse)
 *  4. Import paths between the two files
 *  5. CATEGORY_TO_SLOT values are valid SLOT_TYPES
 *  6. Every asset has a non-empty name
 *  7. Total asset count ~977
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB_DIR = path.join(__dirname, 'Web');
const REGISTRY_PATH = path.join(WEB_DIR, 'js', 'data', 'EquipmentAssetRegistry.js');
const GLOSSARY_PATH = path.join(WEB_DIR, 'js', 'systems', 'ui', 'GlossaryScreen.js');
const EQUIPMENT_DATA_PATH = path.join(WEB_DIR, 'js', 'data', 'EquipmentData.js');

let totalChecks = 0;
let passed = 0;
let failed = 0;
const issues = [];

function check(label, ok, detail) {
    totalChecks++;
    if (ok) {
        passed++;
        console.log(`  PASS  ${label}`);
    } else {
        failed++;
        const msg = detail ? `${label} — ${detail}` : label;
        issues.push(msg);
        console.log(`  FAIL  ${label}`);
        if (detail) console.log(`        ${detail}`);
    }
}

// ---------------------------------------------------------------------------
// Helper: strip ES module syntax so we can parse with Node's vm
// ---------------------------------------------------------------------------
function stripESM(src) {
    // Remove import statements
    let code = src.replace(/^\s*import\s+.*?;\s*$/gm, '');
    // Replace `export const` / `export function` / `export default` with plain declarations
    code = code.replace(/^\s*export\s+default\s+/gm, '');
    code = code.replace(/^\s*export\s+/gm, '');
    return code;
}

// ===== 1. EquipmentAssetRegistry.js syntax =================================
console.log('\n=== 1. EquipmentAssetRegistry.js Syntax ===');
let registrySrc;
try {
    registrySrc = fs.readFileSync(REGISTRY_PATH, 'utf8');
    check('File readable', true);
} catch (e) {
    check('File readable', false, e.message);
    process.exit(1);
}

let registryScript;
try {
    const stripped = stripESM(registrySrc);
    registryScript = new vm.Script(stripped, { filename: 'EquipmentAssetRegistry.js' });
    check('Valid JavaScript syntax', true);
} catch (e) {
    check('Valid JavaScript syntax', false, e.message);
}

// Execute in sandbox to extract data
const registryCtx = {};
try {
    // Replace const/let with var so variables become sandbox globals
    let stripped = stripESM(registrySrc);
    stripped = stripped.replace(/\b(const|let)\s+/g, 'var ');
    const sandbox = { module: { exports: {} }, exports: {} };
    vm.createContext(sandbox);
    vm.runInContext(stripped, sandbox);
    registryCtx.ASSET_CATEGORIES = sandbox.ASSET_CATEGORIES;
    registryCtx.CATEGORY_TO_SLOT = sandbox.CATEGORY_TO_SLOT;
    registryCtx.EQUIPMENT_ASSETS = sandbox.EQUIPMENT_ASSETS;
    registryCtx.getEquipmentAssets = sandbox.getEquipmentAssets;
    registryCtx.getEquipmentAssetsBySlot = sandbox.getEquipmentAssetsBySlot;
    check('Sandbox execution', true);
} catch (e) {
    check('Sandbox execution', false, e.message);
}

// ===== 2. All 977 PNG paths exist ==========================================
console.log('\n=== 2. PNG Path Verification ===');
const assets = registryCtx.EQUIPMENT_ASSETS || [];
let missingCount = 0;
const missingPaths = [];

for (const asset of assets) {
    // Paths in registry are relative to Web/ (e.g. ../Sprites/...)
    const resolved = path.resolve(WEB_DIR, asset.path);
    if (!fs.existsSync(resolved)) {
        missingCount++;
        if (missingPaths.length < 15) {
            missingPaths.push(asset.path);
        }
    }
}

check('PNG files exist on disk', missingCount === 0,
    missingCount > 0 ? `${missingCount} missing files. First few:\n        ${missingPaths.join('\n        ')}` : undefined);
console.log(`    Total assets checked: ${assets.length}`);
console.log(`    Missing: ${missingCount}`);

// ===== 3. GlossaryScreen.js syntax =========================================
console.log('\n=== 3. GlossaryScreen.js Syntax ===');
let glossarySrc;
try {
    glossarySrc = fs.readFileSync(GLOSSARY_PATH, 'utf8');
    check('File readable', true);
} catch (e) {
    check('File readable', false, e.message);
}

try {
    const stripped = stripESM(glossarySrc);
    new vm.Script(stripped, { filename: 'GlossaryScreen.js' });
    check('Valid JavaScript syntax', true);
} catch (e) {
    check('Valid JavaScript syntax', false, e.message);
}

// ===== 4. Import paths =====================================================
console.log('\n=== 4. Import Path Verification ===');

// Check that GlossaryScreen imports from EquipmentAssetRegistry
const registryImportRe = /import\s+\{[^}]*\}\s+from\s+['"]([^'"]*EquipmentAssetRegistry[^'"]*)['"]/;
const registryImportMatch = glossarySrc.match(registryImportRe);
check('GlossaryScreen imports EquipmentAssetRegistry', !!registryImportMatch,
    registryImportMatch ? undefined : 'No import from EquipmentAssetRegistry found');

if (registryImportMatch) {
    const importPath = registryImportMatch[1];
    // GlossaryScreen is at Web/js/systems/ui/GlossaryScreen.js
    // Registry is at Web/js/data/EquipmentAssetRegistry.js
    // Expected relative: ../../data/EquipmentAssetRegistry.js
    const glossaryDir = path.dirname(GLOSSARY_PATH);
    const resolvedImport = path.resolve(glossaryDir, importPath);
    const registryAbs = REGISTRY_PATH;
    check('Import path resolves correctly',
        resolvedImport === registryAbs,
        resolvedImport !== registryAbs ? `Import resolves to ${resolvedImport}, expected ${registryAbs}` : undefined);
}

// Check which symbols are imported
const importedSymbols = registryImportMatch
    ? registryImportMatch[0].match(/\{([^}]*)\}/)[1].split(',').map(s => s.trim())
    : [];
const expectedSymbols = ['getEquipmentAssets', 'getEquipmentAssetsBySlot', 'ASSET_CATEGORIES', 'CATEGORY_TO_SLOT'];
for (const sym of expectedSymbols) {
    check(`Imports "${sym}"`, importedSymbols.includes(sym),
        !importedSymbols.includes(sym) ? `"${sym}" not found in import statement` : undefined);
}

// ===== 5. CATEGORY_TO_SLOT validation ======================================
console.log('\n=== 5. Category-to-Slot Mapping ===');

// Read SLOT_TYPES from EquipmentData.js
let slotTypes = [];
try {
    const eqSrc = fs.readFileSync(EQUIPMENT_DATA_PATH, 'utf8');
    const slotMatch = eqSrc.match(/SLOT_TYPES\s*=\s*\[([^\]]+)\]/);
    if (slotMatch) {
        slotTypes = slotMatch[1].match(/"([^"]+)"/g).map(s => s.replace(/"/g, ''));
    }
    check('SLOT_TYPES loaded from EquipmentData.js', slotTypes.length > 0,
        slotTypes.length === 0 ? 'Could not parse SLOT_TYPES' : `Found ${slotTypes.length} slot types: ${slotTypes.join(', ')}`);
} catch (e) {
    check('SLOT_TYPES loaded from EquipmentData.js', false, e.message);
}

const catToSlot = registryCtx.CATEGORY_TO_SLOT || {};
const invalidSlots = [];
for (const [cat, slot] of Object.entries(catToSlot)) {
    if (!slotTypes.includes(slot)) {
        invalidSlots.push(`${cat} -> "${slot}"`);
    }
}
check('All CATEGORY_TO_SLOT values are valid SLOT_TYPES', invalidSlots.length === 0,
    invalidSlots.length > 0 ? `Invalid mappings: ${invalidSlots.join(', ')}` : undefined);

// Also verify every ASSET_CATEGORIES entry has a mapping
const categories = registryCtx.ASSET_CATEGORIES || [];
const unmapped = categories.filter(c => !(c in catToSlot));
check('Every ASSET_CATEGORY has a slot mapping', unmapped.length === 0,
    unmapped.length > 0 ? `Unmapped categories: ${unmapped.join(', ')}` : undefined);

// ===== 6. Name quality =====================================================
console.log('\n=== 6. Name Quality ===');
const emptyNames = assets.filter(a => !a.name || a.name.trim() === '');
check('All assets have non-empty names', emptyNames.length === 0,
    emptyNames.length > 0 ? `${emptyNames.length} assets have empty names. First: ${JSON.stringify(emptyNames.slice(0, 3))}` : undefined);

// Check for names that are just the filename (poor quality)
const rawFileNames = assets.filter(a => a.name === a.filename);
if (rawFileNames.length > 0) {
    check('Names are not raw filenames', false, `${rawFileNames.length} assets use raw filename as name`);
} else {
    check('Names are not raw filenames', true);
}

// ===== 7. Count verification ===============================================
console.log('\n=== 7. Count Verification ===');
const count = assets.length;
check('Asset count is approximately 977', count >= 950 && count <= 1010,
    `Count is ${count} (expected ~977)`);
console.log(`    Exact count: ${count}`);

// Per-category breakdown
const catCounts = {};
for (const a of assets) {
    catCounts[a.category] = (catCounts[a.category] || 0) + 1;
}
console.log('    Per-category breakdown:');
for (const [cat, cnt] of Object.entries(catCounts).sort()) {
    console.log(`      ${cat}: ${cnt}`);
}

// ===== Summary =============================================================
console.log('\n' + '='.repeat(60));
console.log(`QA SUMMARY: ${totalChecks} checks — ${passed} passed, ${failed} failed`);
if (issues.length > 0) {
    console.log('\nIssues:');
    issues.forEach((iss, i) => console.log(`  ${i + 1}. ${iss}`));
}
console.log('='.repeat(60));

process.exit(failed > 0 ? 1 : 0);

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (name) => fs.readFileSync(path.join(__dirname, '..', 'tools', name, 'index.html'), 'utf8');
const wg = read('wg-organisator');
const household = read('haushaltsbuch-kassenbon');

test('WG and household finance use distinct local storage namespaces', () => {
  for (const [wgKey, householdKey] of [
    ['wg_kassenbon_data', 'kassenbon_data'],
    ['wg_budgetbuch_budgets', 'budgetbuch_budgets'],
    ['wg_budgetbuch_goals', 'budgetbuch_goals']
  ]) {
    assert.match(wg, new RegExp("localStorage\\.(?:getItem|setItem)\\('"+wgKey+"'"));
    assert.doesNotMatch(wg, new RegExp("localStorage\\.(?:getItem|setItem)\\('"+householdKey+"'"));
    assert.match(household, new RegExp("localStorage\\.(?:getItem|setItem)\\('"+householdKey+"'"));
    assert.doesNotMatch(household, new RegExp("localStorage\\.(?:getItem|setItem)\\('"+wgKey+"'"));
  }
});

test('both tools retain the same Supabase authentication project', () => {
  const project = /const SUPABASE_URL = "([^"]+)"/;
  const wgUrl = wg.match(project)?.[1];
  const householdUrl = household.match(project)?.[1];
  assert.ok(wgUrl);
  assert.equal(wgUrl, householdUrl);
  assert.match(wg, /supabaseClient\.auth\.signInWithPassword/);
  assert.match(household, /supabaseClient\.auth\.signInWithPassword/);
});

test('WG cloud finance maps exclusively to WG-local keys', () => {
  const loader = wg.match(/async function ladeWGObjekt\(cloudObj\) \{([\s\S]*?)\n        async function ladeWGausCloud\(/)?.[1];
  assert.ok(loader, 'WG cloud hydration function exists');
  for (const [field, key] of [
    ['data', 'wg_kassenbon_data'],
    ['budgets', 'wg_budgetbuch_budgets'],
    ['goals', 'wg_budgetbuch_goals']
  ]) {
    assert.match(loader, new RegExp('\\b' + field + "\\s*:\\s*'" + key + "'"));
  }
  assert.match(loader, /Object\.entries\(fields\)\.map/);
  assert.match(loader, /localStorage\.setItem\(storageKey, serialized\)/);
  assert.match(loader, /localStorage\.removeItem\(storageKey\)/);
});

test('WG cloud writes return explicit success/failure status', () => {
  const save = wg.match(/async function speichereWGinCloud\(\) \{([\s\S]*?)\n        async function kopiereWGLink\(/)?.[1];
  assert.ok(save, 'WG cloud save function exists');
  assert.match(save, /if \(\!wgBinId \|\| \!\/\^\[a-zA-Z0-9_-\]\{4,128\}\$\/\.test\(wgBinId\)\) return false;/);
  assert.match(save, /WG-Cloud-Speicherung fehlgeschlagen/);
  assert.match(save, /if \(\!response\.ok\) throw new Error/);
  assert.match(save, /if \(isSecureWgId\(wgBinId\)\)/);
  assert.match(save, /return secureWgSaving;/);
  assert.match(save, /return true;\s*\} catch \(error\) \{\s*console\.error\("Fehler beim Speichern in Cloud:", error\);\s*return false;/);
});

test('household backups carry a format identifier and reject WG payloads', () => {
  assert.match(household, /format: 'helferlein-haushaltsbuch'/);
  assert.match(household, /Dies ist kein Haushaltsbuch-Backup/);
  assert.match(household, /Unbekanntes Backup-Format/);
});

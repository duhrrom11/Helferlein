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

test('WG cloud hydration maps finance fields to WG-only local keys', () => {
  assert.match(wg, /async function ladeWGObjekt\(cloudObj\)/);
  for (const [field, key] of [
    ['data', 'wg_kassenbon_data'],
    ['budgets', 'wg_budgetbuch_budgets'],
    ['goals', 'wg_budgetbuch_goals']
  ]) {
    assert.ok(wg.includes(field + ": '" + key + "'"), 'Missing WG-only mapping: ' + field);
  }
  assert.match(wg, /for \(const \[storageKey, serialized\] of entries\)/);
  assert.match(wg, /localStorage\.setItem\(storageKey, serialized\)/);
});

test('WG cloud writes report failure and secure-WG saves track unsaved changes', () => {
  assert.match(wg, /async function speichereWGinCloud\(\)/);
  assert.match(wg, /if \(!wgBinId \|\| !\/\^\[a-zA-Z0-9_-\]\{4,128\}\$\/\.test\(wgBinId\)\) return false/);
  assert.match(wg, /secureWgDirty = true/);
  assert.match(wg, /secureWgSaving = secureWgSaving\.catch\(\(\) => false\)\.then/);
  assert.match(wg, /WG-Cloud-Speicherung fehlgeschlagen/);
  assert.match(wg, /console\.error\("Fehler beim Speichern in Cloud:", error\)/);
});
test('household backups carry a format identifier and reject WG payloads', () => {
  assert.match(household, /format: 'helferlein-haushaltsbuch'/);
  assert.match(household, /Dies ist kein Haushaltsbuch-Backup/);
  assert.match(household, /Unbekanntes Backup-Format/);
});

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
  for (const [field, key] of [
    ['data', 'wg_kassenbon_data'],
    ['budgets', 'wg_budgetbuch_budgets'],
    ['goals', 'wg_budgetbuch_goals']
  ]) {
    assert.ok(wg.includes("cloudObj."+field+" !== undefined) localStorage.setItem('"+key+"'"));
  }
});

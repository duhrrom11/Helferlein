'use strict';
// A9: isolated, read-only source contracts. No Supabase credentials or live requests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'shared', 'helferlein-cloud-migration.js'), 'utf8');

test('anonymous entry exposes optional migration and does not start an upload', () => {
  assert.match(source, /Cloud-Sicherung \(optional\)/);
  assert.match(source, /Ohne Anmeldung kannst du das Tool lokal verwenden/);
  assert.match(source, /if \(!data \|\| !data\.user \|\| !data\.user\.id\) throw new Error\('Bitte zuerst anmelden'\)/);
  assert.match(source, /button\('Lokale Daten in Supabase übernehmen', async \(\) => \{/);
  assert.match(source, /await authenticated\(\);[\s\S]*?ensureOnline\(\);/);
});

test('account mismatch remains a blocking dialog, not a cosmetic warning', () => {
  assert.match(source, /blocked\.setAttribute\('role', 'alertdialog'\)/);
  assert.match(source, /blocked\.setAttribute\('aria-modal', 'true'\)/);
  assert.match(source, /Lokale Daten gehören zu einem anderen Konto/);
  assert.match(source, /if \(disposed \|\| accountSwitchInProgress \|\| !!blocked/);
  assert.match(source, /return verifiedOwner === owner/);
});

test('cloud errors and conflicts remain visible to assistive technology', () => {
  assert.match(source, /status\.setAttribute\('role', 'status'\)/);
  assert.match(source, /status\.textContent = 'Fehler: '/);
  assert.match(source, /Keine Daten überschrieben/);
  assert.match(source, /Ausstehende lokale Änderungen müssen zuerst geklärt werden/);
});

test('account changes and offline writes cannot silently enable cloud upload', () => {
  assert.match(source, /localStorage\.getItem\(enabledKey\(user\.id\)\) === 'true'/);
  assert.match(source, /if \(!uid \|\| owner !== uid\) throw new Error/);
  assert.match(source, /ensureOnline\(\)/);
  assert.match(source, /if \(!await isEnabled\(\)\) throw new Error/);
});

test('anonymous missing-session message is explained without masking account protection errors', () => {
  assert.match(source, /!currentOwner\(\) && \/\^Auth session missing!/);
  assert.match(source, /Nicht angemeldet\. Deine lokalen Daten bleiben auf diesem Gerät/);
  assert.match(source, /: prefix \+ ': ' \+ lastConflictMessage/);
  assert.match(source, /lastConflictMessage = error && error\.message/);
});


const vm = require('node:vm');
const householdHtml = fs.readFileSync(path.join(__dirname, '..', 'tools', 'haushaltsbuch-kassenbon', 'index.html'), 'utf8');
const guardStart = householdHtml.indexOf('function householdCloudSnapshot() {');
const guardEnd = householdHtml.indexOf('function householdCloudChanged() {', guardStart);
if (guardStart < 0 || guardEnd < 0) throw new Error('A9 household production guard block missing');
const householdGuardCode = householdHtml.slice(guardStart, guardEnd);

function runHouseholdGuard({owner = null, bridge = null, entries = '[]', budgets = '{}', goals = '[]'} = {}) {
  const values = new Map([
    ['kassenbon_data', entries],
    ['budgetbuch_budgets', budgets],
    ['budgetbuch_goals', goals]
  ]);
  if (owner !== null) values.set('helferlein_cloud_owner_haushaltsbuch-kassenbon', owner);
  const alerts = [];
  let writes = 0;
  const context = {
    window: bridge === null ? {} : {helferleinCloudBridge: bridge},
    localStorage: {
      getItem: key => values.has(key) ? values.get(key) : null,
      setItem: () => { writes++; throw new Error('Unexpected write in guard test'); }
    },
    alert: message => alerts.push(message)
  };
  vm.runInNewContext(householdGuardCode, context, {timeout: 1000});
  const allowed = vm.runInNewContext('householdCloudCanSave()', context, {timeout: 1000});
  assert.equal(writes, 0, 'guard must never write to storage');
  return {allowed, alerts};
}

test('A9 household guard permits unclaimed local-only use without cloud bridge', () => {
  const result = runHouseholdGuard();
  assert.equal(result.allowed, true);
  assert.deepEqual(result.alerts, []);
});

test('A9 household guard blocks claimed account when protection bridge is missing', () => {
  const result = runHouseholdGuard({owner:'synthetic-account'});
  assert.equal(result.allowed, false);
  assert.match(result.alerts[0], /Kontoschutz noch nicht geladen/);
});

test('A9 household guard blocks account switch or migration before local write', () => {
  const result = runHouseholdGuard({owner:'synthetic-account', bridge:{canWriteLocal:()=>false}});
  assert.equal(result.allowed, false);
  assert.match(result.alerts[0], /Kontowechsel oder Cloud-Übernahme aktiv/);
});

test('A9 household guard permits valid account only when bridge explicitly allows writes', () => {
  const result = runHouseholdGuard({owner:'synthetic-account', bridge:{canWriteLocal:()=>true}});
  assert.equal(result.allowed, true);
  assert.deepEqual(result.alerts, []);
});

test('A9 household guard refuses malformed local snapshot under active cloud protection', () => {
  for (const scenario of [
    {entries:'{ "not": "array" }'},
    {budgets:'[]'},
    {goals:'not-json'}
  ]) {
    const result = runHouseholdGuard({owner:'synthetic-account', bridge:{canWriteLocal:()=>true}, ...scenario});
    assert.equal(result.allowed, false);
    assert.match(result.alerts[0], /Speichern gesperrt/);
  }
});


// Run the real saveData implementation as well: the guard alone cannot prove
// that the write entry point honors its false return value.
const saveStart = householdHtml.indexOf('function saveData(data) {', guardEnd);
const saveEnd = householdHtml.indexOf('function getBudgets() {', saveStart);
if (saveStart < 0 || saveEnd < 0) throw new Error('A9 household saveData production block missing');
const householdSaveCode = householdHtml.slice(saveStart, saveEnd);

function runHouseholdSave({owner = null, bridge = null, entries = '[]', budgets = '{}', goals = '[]', failWrite = false} = {}) {
  const values = new Map([
    ['kassenbon_data', entries],
    ['budgetbuch_budgets', budgets],
    ['budgetbuch_goals', goals]
  ]);
  if (owner !== null) values.set('helferlein_cloud_owner_haushaltsbuch-kassenbon', owner);
  const writes = [], alerts = [];
  let cloudChanges = 0;
  const context = {
    window: bridge === null ? {} : {helferleinCloudBridge: bridge},
    localStorage: {
      getItem: key => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => {
        if (failWrite) throw new Error('Synthetic storage quota exceeded');
        writes.push({key, value});
        values.set(key, value);
      }
    },
    householdCloudChanged: () => {cloudChanges++;},
    alert: message => alerts.push(message),
    console: {error:()=>{}}
  };
  vm.runInNewContext(householdGuardCode + '\\n' + householdSaveCode, context, {timeout:1000});
  const result = vm.runInNewContext("saveData([{id:'synthetic-only'}])", context, {timeout:1000});
  return {result, writes, alerts, cloudChanges};
}

test('A9 actual saveData blocks writes and cloud notification during account switch', () => {
  const state = runHouseholdSave({owner:'synthetic-account',bridge:{canWriteLocal:()=>false}});
  assert.equal(state.result, false);
  assert.equal(state.writes.length, 0);
  assert.equal(state.cloudChanges, 0);
  assert.match(state.alerts[0], /Speichern gesperrt/);
});

test('A9 actual saveData blocks writes if claimed account protection is unavailable', () => {
  const state = runHouseholdSave({owner:'synthetic-account'});
  assert.equal(state.result, false);
  assert.equal(state.writes.length, 0);
  assert.equal(state.cloudChanges, 0);
});

test('A9 actual saveData allows exactly one local write after account guard approves', () => {
  const state = runHouseholdSave({owner:'synthetic-account',bridge:{canWriteLocal:()=>true}});
  assert.equal(state.result, true);
  assert.equal(state.writes.length, 1);
  assert.equal(state.writes[0].key, 'kassenbon_data');
  assert.equal(JSON.parse(state.writes[0].value)[0].id, 'synthetic-only');
  assert.equal(state.cloudChanges, 1);
});

test('A9 actual saveData handles storage failure without cloud notification', () => {
  const state = runHouseholdSave({owner:'synthetic-account',bridge:{canWriteLocal:()=>true},failWrite:true});
  assert.equal(state.result, false);
  assert.equal(state.writes.length, 0);
  assert.equal(state.cloudChanges, 0);
  assert.match(state.alerts[0], /Speichern fehlgeschlagen/);
});

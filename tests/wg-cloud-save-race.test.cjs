'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'tools', 'wg-organisator', 'index.html'), 'utf8');
const start = html.indexOf('async function speichereWGinCloud()');
const end = html.indexOf('async function kopiereWGLink()', start);
assert.ok(start >= 0 && end > start, 'WG save function exists');
const saveSource = html.slice(start, end);

function harness(initialQueue = Promise.resolve()) {
  const writes = [];
  const alerts = [];
  const state = {
    wgBinId: 'secure_AAAA',
    secureWgChangeVersion: 0,
    secureWgSavedVersion: 0,
    secureWgDirty: false,
    secureWgSaving: initialQueue,
    isSecureWgId: id => id.startsWith('secure_'),
    getFlatmates: () => [], getNotes: () => [], getData: () => [],
    getBudgets: () => ({}), getSavingsGoals: () => [],
    getEvents: () => [], getInventory: () => [],
    getDiets: () => ({}), getCleaningPlan: () => [],
    getShoppingList: () => [], getCookingPlan: () => [],
    getContracts: () => [], getInfoData: () => ({}),
    saveSecureWg: async (_snapshot, expectedWgId) => {
      writes.push(expectedWgId);
      return true;
    },
    alert: message => alerts.push(message),
    console: { error: () => {} }
  };
  const context = vm.createContext(state);
  vm.runInContext(saveSource, context);
  return { context, writes, alerts, save: () => vm.runInContext('speichereWGinCloud()', context) };
}

test('queued secure WG save does not write to another WG after navigation', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const h = harness(blocked);
  const pending = h.save();
  h.context.wgBinId = 'secure_BBBB';
  release();
  assert.equal(await pending, false);
  assert.deepEqual(h.writes, []);
});

test('queued secure WG save retains its originating WG ID', async () => {
  const h = harness();
  assert.equal(await h.save(), true);
  assert.deepEqual(h.writes, ['secure_AAAA']);
});

test('multiple queued secure WG saves preserve their originating WG ID', async () => {
  const h = harness();
  const first = h.save();
  const second = h.save();
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.deepEqual(h.writes, ['secure_AAAA', 'secure_AAAA']);
});

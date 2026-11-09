/* Offline account-boundary regression. Does not connect to Supabase. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync('shared/helferlein-cloud-migration.js', 'utf8');

function harness(shared, uid, options = {}) {
  const elements = [];
  const events = new Map();
  let reloads = 0;
  let onAuthChange = null;
  let finishSave = null;
  const classes = new Set(['helferlein-account-check']);
  class Element {
    constructor(tag) {
      this.tagName = tag;
      this.children = [];
      this.attrs = {};
      this.listeners = {};
      this.style = {};
      this.classList = {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name)
      };
      this.value = '';
      elements.push(this);
    }
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.children.push(node); }
    prepend(...nodes) { this.children.unshift(...nodes); }
    setAttribute(key, val) { this.attrs[key] = val; }
    removeAttribute(key) { delete this.attrs[key]; }
    addEventListener(key, cb) { this.listeners[key] = cb; }
    remove() { this.removed = true; }
    focus() {}
    querySelectorAll(selector) { return elements.filter(e => e.tagName === selector); }
  }
  const document = {
    documentElement: { classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) } },
    body: new Element('body'),
    createElement: tag => new Element(tag),
    addEventListener() {},
    removeEventListener() {},
    visibilityState: 'visible'
  };
  const localStorage = {
    getItem: key => shared.has(key) ? shared.get(key) : null,
    setItem: (key, value) => { shared.set(key, String(value)); },
    removeItem: key => { shared.delete(key); }
  };
  const window = {
    location: { reload: () => { reloads++; } },
    addEventListener: (event, cb) => events.set(event, cb),
    removeEventListener: event => events.delete(event),
    HelferleinCloudStore: { createStore: () => ({
      dispose() {},
      status() { return {}; },
      async load() { return options.remoteData ? { source: 'cloud', data: options.remoteData } : { source: 'cloud-empty', data: null }; },
      async hasPending() { return false; },
      async flush() { return false; },
      async save() { return options.holdSave ? new Promise(resolve => { finishSave = resolve; }) : true; }
    }) }
  };
  const client = {
    auth: {
      getUser: async () => ({ data: { user: uid ? { id: uid } : null }, error: null }),
      onAuthStateChange: callback => { onAuthChange = callback; return { data: { subscription: { unsubscribe() {} } } }; }
    }
  };
  const ctx = vm.createContext({ window, document, navigator: { onLine: true },
    localStorage, setTimeout, confirm: () => true, console });
  vm.runInContext(script, ctx);
  const bridge = window.HelferleinCloudMigration.mount({
    client, tool: options.plants ? 'pflanzenpflege-giessplan' : 'test-tool',
    localKey: options.plants ? 'pflanzen_pass_v10' : 'test_records',
    collection: options.plants ? 'plants' : 'items',
    ...(options.bundle ? { localFormat: 'bundle', bundleSources: [
      { key: 'test_entries', field: 'items', kind: 'array' },
      { key: 'test_budgets', field: 'budgets', kind: 'record' },
      { key: 'test_goals', field: 'goals', kind: 'array' }
    ] } : {}),
    refresh() {}
  });
  async function wait() { await new Promise(resolve => setTimeout(resolve, 20)); }
  return {
    wait, bridge, classes, shared,
    setUser(next) { uid = next; if (onAuthChange) onAuthChange('SIGNED_IN', {}); },
    finishSave() { assert.ok(finishSave, 'save started'); finishSave(true); },
    get reloads() { return reloads; },
    async importCloud() {
      await wait();
      const button = elements.find(e => e.tagName === 'button' && e.textContent === 'Cloud-Daten lokal übernehmen');
      assert.ok(button, 'cloud import action exists');
      await button.listeners.click();
    },
    async switch() {
      await wait();
      const button = elements.find(e => e.tagName === 'button' &&
        e.textContent === 'Zum derzeit angemeldeten Konto wechseln');
      assert.ok(button, 'account-switch action shown for mismatched owner');
      await button.listeners.click();
    }
  };
}
const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const owner = 'helferlein_cloud_owner_test-tool';
const slot = uid => 'helferlein_cloud_slot_test-tool_' + uid;
const journal = 'helferlein_cloud_switch_test-tool';

(async () => {
  const shared = new Map([[owner, A], ['test_records', JSON.stringify({ items: [{ id: 'a' }] })]]);
  const first = harness(shared, B);
  await first.switch();
  assert.equal(shared.get(owner), B);
  assert.equal(shared.has('test_records'), false, 'second account starts empty');
  assert.equal(JSON.parse(shared.get(slot(A))).bytes,
    JSON.stringify({ items: [{ id: 'a' }] }), 'original account data saved');
  assert.equal(shared.has(journal), false, 'switch journal committed');
  assert.equal(first.reloads, 1);

  shared.set('test_records', JSON.stringify({ items: [{ id: 'b' }] }));
  const verifiedB = harness(shared, B);
  await verifiedB.wait();
  assert.equal(verifiedB.bridge.canWriteLocal(), true,
    'verified newly switched account can save locally without opting into cloud');
  assert.equal(await verifiedB.bridge.changed({ items: [{ id: 'local-b' }] }), false,
    'local-only changes must not upload without opt-in');
  verifiedB.bridge.dispose();
  const second = harness(shared, A);
  await second.switch();
  assert.equal(shared.get(owner), A);
  assert.deepEqual(JSON.parse(shared.get('test_records')), { items: [{ id: 'a' }] });
  assert.equal(JSON.parse(shared.get(slot(B))).bytes,
    JSON.stringify({ items: [{ id: 'b' }] }));
  assert.equal(second.reloads, 1);

  shared.set(journal, JSON.stringify({
    from: A, bytes: JSON.stringify({ items: [{ id: 'a' }] })
  }));
  shared.set(owner, B);
  shared.set('test_records', JSON.stringify({ items: [{ id: 'b' }] }));
  const recovered = harness(shared, B);
  await recovered.wait();
  assert.equal(shared.get(owner), A, 'interrupted switch restores original owner');
  assert.deepEqual(JSON.parse(shared.get('test_records')), { items: [{ id: 'a' }] });
  assert.equal(shared.has(journal), false);
  assert.equal(recovered.reloads, 1);

  shared.set(owner, A);
  shared.set(slot(B), '{"bytes":"not-json"}');
  const rejected = harness(shared, B);
  await rejected.switch();
  assert.equal(shared.get(owner), A, 'damaged destination cannot replace active account');
  assert.equal(shared.has(journal), false);
  const during = new Map([[owner, A],
    ['helferlein_cloud_enabled_test-tool_' + A, 'true'],
    ['test_records', JSON.stringify({ items: [{ id: 'pending' }] })]]);
  const concurrent = harness(during, A, { holdSave: true });
  await concurrent.wait();
  const pending = concurrent.bridge.changed({ items: [{ id: 'pending-update' }] });
  await concurrent.wait();
  concurrent.setUser(B);
  await concurrent.switch();
  assert.equal(during.get(owner), A, 'switch blocked during unfinished save');
  assert.equal(during.has(journal), false, 'blocked switch never starts journal');
  concurrent.finishSave();
  await pending;
  concurrent.bridge.dispose();

  const bundled = new Map([[owner, A],
    ['test_entries', '[{"id":"entry"}]'],
    ['test_budgets', '{"food":120}'],
    ['test_goals', '[{"id":"goal"}]']]);
  const bundleA = harness(bundled, B, { bundle: true });
  await bundleA.switch();
  assert.equal(bundled.has('test_entries'), false);
  assert.equal(bundled.has('test_budgets'), false);
  assert.equal(bundled.has('test_goals'), false);
  assert.equal(bundled.get(owner), B);
  bundled.set('test_entries', '[{"id":"second-account"}]');
  const bundleB = harness(bundled, A, { bundle: true });
  await bundleB.switch();
  assert.equal(bundled.get('test_entries'), '[{"id":"entry"}]');
  assert.equal(bundled.get('test_budgets'), '{"food":120}');
  assert.equal(bundled.get('test_goals'), '[{"id":"goal"}]');
  assert.equal(bundled.get(owner), A);

  const initialBundle = { items: [{ id: 'entry' }], budgets: { food: 120 }, goals: [{ id: 'goal' }] };
  const remoteBundle = { items: [{ id: 'entry' }], budgets: { food: 180 }, goals: [{ id: 'goal' }] };
  const refreshed = new Map([
    [owner, A],
    ['helferlein_cloud_enabled_test-tool_' + A, 'true'],
    ['helferlein_cloud_test-tool_' + A + '_cache', JSON.stringify(initialBundle)],
    ['test_entries', JSON.stringify(initialBundle.items)],
    ['test_budgets', JSON.stringify(initialBundle.budgets)],
    ['test_goals', JSON.stringify(initialBundle.goals)]
  ]);
  const remoteHarness = harness(refreshed, A, { bundle: true, remoteData: remoteBundle });
  await remoteHarness.wait();
  const applied = await remoteHarness.bridge.refreshFromCloud();
  // Mount may already refresh on startup; a second refresh then correctly returns false.
  assert.ok(applied || remoteHarness.bridge.getStatus().refreshApplied > 0,
    'remote household changes should apply on startup or explicit refresh');
  assert.equal(JSON.parse(refreshed.get('test_budgets')).food, 180,
    'remote budget update applied even when entries and goals are unchanged');
  assert.deepEqual(JSON.parse(refreshed.get('test_entries')), initialBundle.items);
  remoteHarness.bridge.dispose();

  // Device 2: an untouched default plant record is safe to replace; any user edits remain protected.
  const plantOwner = 'helferlein_cloud_owner_pflanzenpflege-giessplan';
  const defaultPlants = { plants: [], monthWaterLiters: 0, totalHarvestGrams: 0,
    inventory: [{ name: 'Tomatendünger Flüssig', qty: '1 L' }, { name: 'Bio Blumenerde', qty: '40 L' }],
    seeds: [], beetSlots: Array(16).fill(null), cisternMax: 500, cisternCurrent: 500 };
  const remotePlants = { ...defaultPlants, plants: [{ id: 'real-plant' }] };
  const plantKey = 'pflanzen_pass_v10';
  const safePlantStorage = new Map([[plantOwner, A], [plantKey, JSON.stringify(defaultPlants)]]);
  const safePlant = harness(safePlantStorage, A, { plants: true, remoteData: remotePlants });
  await safePlant.importCloud();
  assert.equal(JSON.parse(safePlantStorage.get(plantKey)).plants[0].id, 'real-plant',
    'cloud plant imported over untouched defaults');
  safePlant.bridge.dispose();
  for (const changed of [
    { ...defaultPlants, inventory: [{ name: 'Personal', qty: '1' }] },
    { ...defaultPlants, cisternCurrent: 250 },
    { ...defaultPlants, plants: [{ id: 'local' }] },
    { ...defaultPlants, extra: 'user data' }
  ]) {
    const original = JSON.stringify(changed);
    const guardedStorage = new Map([[plantOwner, A], [plantKey, original]]);
    const guarded = harness(guardedStorage, A, { plants: true, remoteData: remotePlants });
    await guarded.importCloud();
    assert.equal(guardedStorage.get(plantKey), original, 'modified local data must not be replaced');
    guarded.bridge.dispose();
  }

  console.log('Cloud account switching offline regression passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

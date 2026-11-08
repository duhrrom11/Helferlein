const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('tools/wg-organisator/index.html', 'utf8');
const start = html.indexOf('async function ladeWGObjekt(cloudObj)');
const end = html.indexOf('async function ladeWGausCloud()', start);
assert.ok(start !== -1 && end > start, 'WG cloud cache loader exists');
const source = html.slice(start, end);
const cache = new Map();
const localStorage = {
  getItem: key => cache.has(key) ? cache.get(key) : null,
  setItem: (key, value) => cache.set(key, String(value)),
  removeItem: key => cache.delete(key)
};
const context = vm.createContext({ localStorage, wgBinId: 'secure_12345678-1234-4234-8234-123456789012' });
vm.runInContext(source, context);

(async () => {
  cache.set('wg_notes', '["stale"]');
  cache.set('wg_flatmates', '["stale"]');
  await vm.runInContext('ladeWGObjekt({ budgets: {} })', context);
  assert.equal(cache.has('wg_notes'), false, 'Missing cloud notes must clear old cache');
  assert.equal(cache.has('wg_flatmates'), false, 'Missing cloud flatmates must clear old cache');
  assert.equal(cache.get('wg_budgetbuch_budgets'), '{}');
  cache.set('wg_notes', '["keep"]');
  await assert.rejects(
    vm.runInContext('ladeWGObjekt({ notes: "invalid" })', context),
    /Ungültiges WG-Datenformat/
  );
  assert.equal(cache.get('wg_notes'), '["keep"]', 'Invalid payload must not modify cache');
  await vm.runInContext('ladeWGObjekt({ flatmates: ["Anna"] })', context);
  assert.equal(JSON.parse(cache.get('wg_flatmates'))[0].vorname, 'Anna');
  console.log('WG cache regression checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

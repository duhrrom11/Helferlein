'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'tools', 'wg-organisator', 'index.html'), 'utf8');
const start = html.indexOf('async function ladeWGausCloud()');
const end = html.indexOf('// Retry unsaved secure-WG changes', start);
assert.ok(start >= 0 && end > start, 'secure WG cloud loader exists');
const loaderSource = html.slice(start, end);

async function runScenario(changeDuringFetch, expected) {
  let resolveFetch;
  const remote = new Promise(resolve => { resolveFetch = resolve; });
  let hydrations = 0;
  const context = vm.createContext({
    wgBinId: 'secure_12345678',
    secureWgChangeVersion: 1,
    secureWgDirty: false,
    secureWgSavedVersion: 0,
    secureWgSaveBlocked: false,
    secureWgRevision: null,
    isSecureWgId: id => id.startsWith('secure_'),
    SECURE_WG_PREFIX: 'secure_',
    getAuthenticatedWgUser: async () => ({ id: 'user' }),
    supabaseClient: { from: () => ({ select: () => ({ eq: () => ({ single: () => remote }) }) }) },
    ladeWGObjekt: async () => { hydrations++; return true; },
    console: { error: () => {} },
    NPOINT_API_BASE: 'unused'
  });
  vm.runInContext(loaderSource, context);
  const pending = vm.runInContext('ladeWGausCloud()', context);
  // The mock request is pending while the simulated local change occurs.
  changeDuringFetch(context);
  resolveFetch({ data: { payload: { data: [] }, updated_at: '2026-11-10T00:00:00Z' }, error: null });
  const result = await pending;
  assert.equal(result, expected);
  assert.equal(hydrations, expected ? 1 : 0, 'stale remote data must never hydrate local storage');
}

test('secure WG loads unchanged remote snapshot', async () => {
  await runScenario(() => {}, true);
});
test('secure WG rejects remote snapshot after local edit during fetch', async () => {
  await runScenario(ctx => { ctx.secureWgChangeVersion++; ctx.secureWgDirty = true; }, false);
});
test('secure WG rejects remote snapshot if local dirty flag changes', async () => {
  await runScenario(ctx => { ctx.secureWgDirty = true; }, false);
});
test('secure WG rejects remote snapshot after switching WG', async () => {
  await runScenario(ctx => { ctx.wgBinId = 'secure_another'; }, false);
});

/* Node.js-only unit checks; no network or production data. Run: node tests/cloud-store.test.cjs */
'use strict';
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const script = fs.readFileSync('shared/helferlein-cloud-store.js', 'utf8');
function harness(online = true, offlineSession = false) {
  const entries = new Map();
  const localStorage = {
    getItem: k => entries.has(k) ? entries.get(k) : null,
    setItem: (k, v) => entries.set(k, String(v)),
    removeItem: k => entries.delete(k)
  };
  const rows = [];
  let uid = 'alice';
  const client = {
    auth: {
      getUser: async () => offlineSession && !navigator.onLine
        ? { data: { user: null }, error: new Error('Network unavailable') }
        : { data: { user: uid ? { id: uid } : null }, error: null },
      ...(offlineSession ? { getSession: async () => ({ data: { session: uid ? { user: { id: uid }, expires_at: Date.now() / 1000 + 3600 } : null }, error: null }) } : {})
    },
    from: table => {
      assert.equal(table, 'user_data');
      let filters = {};
      const query = {
        select() { return query; },
        eq(k, v) { filters[k] = v; return query; },
        order() { return query; },
        limit: async () => ({ data: rows.filter(r => Object.entries(filters).every(([k,v]) => r[k] === v)), error: null }),
        insert(value) {
          const row = { id: rows.length + 1, updated_at: 'revision-1', ...value };
          rows.push(row);
          return { select: async () => ({ data: [{ id: row.id, updated_at: row.updated_at }], error: null }) };
        },
        update(value) {
          return {
            eq(k, v) { filters[k] = v; return this; },
            select: async () => {
              const row = rows.find(r => Object.entries(filters).every(([k,v]) => r[k] === v));
              if (!row) return { data: [], error: null };
              Object.assign(row, value);
              return { data: [{ id: row.id, updated_at: row.updated_at }], error: null };
            }
          };
        }
      };
      return query;
    }
  };
  const window = {};
  const navigator = { onLine: online };
  vm.runInNewContext(script, { window, navigator, localStorage, JSON, Promise, Error, Date });
  return { client, rows, navigator, localStorage, setUser: id => { uid = id; },
    store: window.HelferleinCloudStore.createStore(client, 'plants') };
}
(async () => {
  const cachedOffline = harness(true, true);
  cachedOffline.localStorage.setItem('helferlein_cloud_owner_plants', 'alice');
  assert.equal(await cachedOffline.store.save({ plants: [1] }), true);
  cachedOffline.navigator.onLine = false;
  assert.equal(await cachedOffline.store.save({ plants: [1, 2] }), false,
    'offline cached account writes pending instead of requiring network');
  assert.equal(await cachedOffline.store.hasPending(), true);
  cachedOffline.navigator.onLine = true;
  assert.equal(await cachedOffline.store.flush(), true);
  assert.equal(await cachedOffline.store.hasPending(), false);
  assert.deepEqual(cachedOffline.rows[0].data, { plants: [1, 2] });
  cachedOffline.navigator.onLine = false;
  cachedOffline.localStorage.setItem('helferlein_cloud_owner_plants', 'bob');
  await assert.rejects(cachedOffline.store.save({ plants: [3] }), /Sign in required/,
    'different owner cannot write account pending data offline');
  const firstOffline = harness(false);
  assert.equal(await firstOffline.store.save({ plants: [42] }), false);
  assert.equal(await firstOffline.store.hasPending(), true);
  firstOffline.navigator.onLine = true;
  await assert.rejects(firstOffline.store.flush(), /baseline unknown/);
  assert.equal(await firstOffline.store.hasPending(), true);
  assert.equal(firstOffline.rows.length, 0);
  assert.equal((await firstOffline.store.reconcilePending()).status, 'ready');
  assert.equal(await firstOffline.store.flush(), true);
  assert.equal(firstOffline.rows.length, 1);
  assert.equal(await firstOffline.store.hasPending(), false);

  const conflicting = harness(false);
  await conflicting.store.save({ plants: [55] });
  conflicting.rows.push({ id: 1, user_id: 'alice', tool: 'plants', data: { plants: [99] }, updated_at: 'remote' });
  conflicting.navigator.onLine = true;
  assert.equal((await conflicting.store.reconcilePending()).status, 'conflict');
  assert.equal(await conflicting.store.hasPending(), true);
  assert.deepEqual(conflicting.rows[0].data, { plants: [99] });

  const h = harness();
  assert.equal((await h.store.load()).source, 'cloud-empty');
  assert.equal(await h.store.save({ plants: [1] }), true);
  assert.equal(h.rows.length, 1);
  assert.deepEqual(h.rows[0].data, { plants: [1] });
  h.navigator.onLine = false;
  assert.equal(await h.store.save({ plants: [1, 2] }), false);
  assert.equal(await h.store.hasPending(), true);
  assert.equal((await h.store.load()).source, 'pending');
  h.navigator.onLine = true;
  assert.equal(await h.store.flush(), true);
  assert.equal(await h.store.hasPending(), false);
  assert.deepEqual(h.rows[0].data, { plants: [1, 2] });
  // Simulate an upload committed remotely but the client never received the ack.
  h.navigator.onLine = false;
  assert.equal(await h.store.save({ plants: [1, 2, 3] }), false);
  h.rows[0].data = { plants: [1, 2, 3] };
  h.rows[0].updated_at = 'remote-ack-lost';
  h.navigator.onLine = true;
  assert.equal(await h.store.flush(), true);
  assert.equal(await h.store.hasPending(), false);
  assert.equal(h.rows.length, 1);
  // A different remote value must not be silently overwritten.
  h.navigator.onLine = false;
  await h.store.save({ plants: [9] });
  h.rows[0].data = { plants: [777] };
  h.rows[0].updated_at = 'remote-conflict';
  h.navigator.onLine = true;
  await assert.rejects(h.store.flush(), /Cloud changed/);
  assert.equal(await h.store.hasPending(), true);
  h.setUser('bob');
  assert.equal((await h.store.load()).source, 'cloud-empty');
  assert.equal(await h.store.hasPending(), false);
  h.setUser(null);
  assert.equal((await h.store.load()).source, 'signed-out');
  console.log('Cloud store unit checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });

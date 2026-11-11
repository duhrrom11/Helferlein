'use strict';
// Targeted mocked IndexedDB transaction regression test; NOT a real browser test.
// Run: node --experimental-strip-types --test tests/security/heir-indexeddb-store.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
const OWNER = '11111111-1111-4111-8111-111111111111';
const HEIR = '22222222-2222-4222-8222-222222222222';
const KEY = '55555555-5555-4555-8555-555555555555';

function isolatedIdb() {
  const rows = new Map();
  const db = {
    objectStoreNames: { contains: () => true },
    createObjectStore() { throw Error('unexpected create'); },
    close() {},
    transaction(_table, mode) {
      const tx = {
        oncomplete: null, onabort: null, onerror: null,
        aborted: false,
        abort() { this.aborted = true; queueMicrotask(() => this.onabort?.()); },
        objectStore() {
          return {
            get(key) {
              const request = { result: undefined, onsuccess: null, onerror: null };
              queueMicrotask(() => {
                if (tx.aborted) return;
                request.result = structuredClone(rows.get(key.join(':')));
                request.onsuccess?.();
                if (mode === 'readonly' && !tx.aborted) queueMicrotask(() => tx.oncomplete?.());
              });
              return request;
            },
            put(value) {
              queueMicrotask(() => {
                if (tx.aborted) return;
                rows.set(`${value.userId}:${value.keyId}`, structuredClone(value));
                tx.oncomplete?.();
              });
            },
          };
        },
      };
      return tx;
    },
  };
  const factory = {
    open() {
      const request = { result: db, onsuccess: null, onerror: null, onblocked: null };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  };
  return { factory, rows };
}

async function record(userId = HEIR, keyId = KEY) {
  const pair = await webcrypto.subtle.generateKey({ name: 'X25519' }, false, ['deriveBits']);
  const publicKeyHex = Buffer.from(await webcrypto.subtle.exportKey('raw', pair.publicKey)).toString('hex');
  return { userId, keyId, privateKey: pair.privateKey, publicKeyHex, status: 'pending' };
}

test('cannot silently overwrite, downgrade, or initially mark a device key verified', async () => {
  const { createIndexedDbHeirKeyStore } = await import('../../supabase/functions/_shared/heir-device-keys-staging.ts');
  const { factory } = isolatedIdb();
  const store = createIndexedDbHeirKeyStore(factory);
  const r = await record();
  await assert.rejects(store.save({ ...r, status: 'verified' }));
  assert.equal(await store.load(HEIR, KEY), null);
  await store.save(r);
  assert.equal((await store.load(HEIR, KEY)).status, 'pending');
  const other = await record();
  await assert.rejects(store.save(other));
  await assert.rejects(store.save({ ...r, publicKeyHex: other.publicKeyHex }));
  await store.save({ ...r, status: 'verified' });
  assert.equal((await store.load(HEIR, KEY)).status, 'verified');
  await assert.rejects(store.save(r));
  await assert.rejects(store.save({ ...r, status: 'verified' }));
  assert.equal(await store.load(OWNER, KEY), null);
  const final = await store.load(HEIR, KEY);
  assert.equal(final.publicKeyHex, r.publicKeyHex);
  assert.equal(final.privateKey.extractable, false);
  await assert.rejects(webcrypto.subtle.exportKey('pkcs8', final.privateKey));
});

test('corrupted stored public key or substituted private key is rejected on load', async () => {
  const { createIndexedDbHeirKeyStore } = await import('../../supabase/functions/_shared/heir-device-keys-staging.ts');
  const { factory, rows } = isolatedIdb();
  const store = createIndexedDbHeirKeyStore(factory);
  const original = await record();
  await store.save(original);
  const substituted = await record();
  rows.set(`${HEIR}:${KEY}`, structuredClone({ ...original, privateKey: substituted.privateKey }));
  assert.equal(await store.load(HEIR, KEY), null);
  rows.set(`${HEIR}:${KEY}`, structuredClone({ ...original, publicKeyHex: substituted.publicKeyHex }));
  assert.equal(await store.load(HEIR, KEY), null);
});

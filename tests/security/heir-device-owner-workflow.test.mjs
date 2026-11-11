import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  enrollHeirDeviceKey, openHeirEnvelopeOnDevice,
} from '../../supabase/functions/_shared/heir-device-keys-staging.ts';
import { stageOwnerHeirEnvelope } from '../../supabase/functions/_shared/heir-envelope-owner-staging.ts';
import { HEIR_HPKE_SUITE, sealHeirDek } from '../../supabase/functions/_shared/heir-hpke-envelope.ts';

const OWNER = '11111111-1111-4111-8111-111111111111';
const HEIR = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';
const KEY = '55555555-5555-4555-8555-555555555555';
const CHALLENGE = '66666666-6666-4666-8666-666666666666';
const VAULT = 'v_abcdefgh';
const hex = bytes => Buffer.from(bytes).toString('hex');
function storage() {
  const values = new Map();
  return {
    values,
    async save(record) { values.set(`${record.userId}:${record.keyId}`, structuredClone(record)); },
    async load(userId, keyId) { return values.get(`${userId}:${keyId}`) ?? null; },
  };
}
function server() {
  let expected;
  let state = 'initial';
  return {
    get state() { return state; },
    async begin(publicKeyHex) {
      const recipient = await webcrypto.subtle.importKey('raw', Buffer.from(publicKeyHex, 'hex'), 'X25519', false, []);
      const pair = await webcrypto.subtle.generateKey('X25519', false, ['deriveBits']);
      const shared = await webcrypto.subtle.deriveBits({ name: 'X25519', public: recipient }, pair.privateKey, 256);
      const salt = webcrypto.getRandomValues(new Uint8Array(32));
      const raw = await webcrypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveBits']);
      const proof = await webcrypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt,
        info: new TextEncoder().encode(`Helferlein/heir-key-proof/v1/${HEIR}/${KEY}/${publicKeyHex}`) }, raw, 256);
      expected = hex(new Uint8Array(proof));
      state = 'pending';
      return { ok: true, keyId: KEY, challengeId: CHALLENGE, suite: HEIR_HPKE_SUITE,
        ephemeralPublicKeyHex: hex(new Uint8Array(await webcrypto.subtle.exportKey('raw', pair.publicKey))), saltHex: hex(salt) };
    },
    async confirm({ keyId, challengeId, proofHex }) {
      assert.equal(keyId, KEY);
      assert.equal(challengeId, CHALLENGE);
      assert.equal(state, 'pending');
      state = 'consumed';
      return { ok: proofHex === expected };
    },
  };
}

// Node test runner has WebCrypto; no real account, network or database used.
Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });

test('heir enrollment saves nonextractable X25519 private key before confirming ownership', async () => {
  const store = storage();
  const remote = server();
  const result = await enrollHeirDeviceKey(HEIR, store, {
    begin: x => remote.begin(x),
    confirm: async x => {
      const saved = await store.load(HEIR, KEY);
      assert.equal(saved?.status, 'pending');
      assert.equal(saved.privateKey.extractable, false);
      await assert.rejects(webcrypto.subtle.exportKey('pkcs8', saved.privateKey));
      return remote.confirm(x);
    },
  });
  assert.equal(result.ok, true);
  assert.equal(remote.state, 'consumed');
  assert.equal((await store.load(HEIR, KEY)).status, 'verified');
  assert.equal(await store.load(STRANGER, KEY), null);
});

test('failed enrollment and failed persistence do not mark a device key verified', async () => {
  const store = storage();
  const remote = server();
  const result = await enrollHeirDeviceKey(HEIR, store, { begin: x => remote.begin(x), confirm: async () => ({ ok: false }) });
  assert.deepEqual(result, { ok: false });
  assert.equal((await store.load(HEIR, KEY)).status, 'pending');
  let confirms = 0;
  const badStore = { async save() { throw new Error('quota'); }, async load() { return null; } };
  assert.deepEqual(await enrollHeirDeviceKey(HEIR, badStore, {
    begin: x => server().begin(x), confirm: async () => { confirms++; return { ok: true }; },
  }), { ok: false });
  assert.equal(confirms, 0);
});

test('owner can wrap only for independently confirmed verified key; heir can open only locally', async () => {
  const store = storage();
  const registered = await enrollHeirDeviceKey(HEIR, store, server());
  assert.equal(registered.ok, true);
  const publicBytes = Buffer.from(registered.publicKeyHex, 'hex');
  const fingerprint = hex(await webcrypto.subtle.digest('SHA-256', publicBytes));
  const ctx = { ownerUserId: OWNER, heirUserId: HEIR, vaultId: VAULT };
  const dek = webcrypto.getRandomValues(new Uint8Array(32));
  let submitted = null;
  const key = { heirUserId: HEIR, keyId: KEY, publicKeyHex: registered.publicKeyHex,
    fingerprintHex: fingerprint, suite: HEIR_HPKE_SUITE, verified: true,
    revoked: false, assignmentVersion: 2, assignmentActive: true };
  const directory = {
    async readVerifiedHeirKey() { return key; },
    async putEnvelope(input) { submitted = input; return { ok: true }; },
  };
  assert.deepEqual(await stageOwnerHeirEnvelope(dek, ctx, fingerprint, directory),
    { ok: true, keyId: KEY, assignmentVersion: 2 });
  assert.equal(Object.hasOwn(submitted, 'dek'), false);
  assert.equal(Object.hasOwn(submitted, 'privateKey'), false);
  assert.equal(submitted.wrappedDekHex.length, 96);
  const opened = await openHeirEnvelopeOnDevice(HEIR, KEY, store, submitted,
    { ...ctx, keyId: KEY, assignmentVersion: 2 });
  assert.deepEqual(Buffer.from(opened), Buffer.from(dek));
  await assert.rejects(openHeirEnvelopeOnDevice(STRANGER, KEY, store, submitted,
    { ...ctx, keyId: KEY, assignmentVersion: 2 }));
  await assert.rejects(openHeirEnvelopeOnDevice(HEIR, KEY, store, submitted,
    { ...ctx, keyId: KEY, assignmentVersion: 3 }));
});

test('foreign, revoked, unverified or changed key prevents owner envelope submission', async () => {
  const store = storage();
  const registered = await enrollHeirDeviceKey(HEIR, store, server());
  assert.equal(registered.ok, true);
  const fingerprint = hex(await webcrypto.subtle.digest('SHA-256', Buffer.from(registered.publicKeyHex, 'hex')));
  const ctx = { ownerUserId: OWNER, heirUserId: HEIR, vaultId: VAULT };
  const key = { heirUserId: HEIR, keyId: KEY, publicKeyHex: registered.publicKeyHex,
    fingerprintHex: fingerprint, suite: HEIR_HPKE_SUITE, verified: true,
    revoked: false, assignmentVersion: 1, assignmentActive: true };
  let submissions = 0;
  const directory = { async readVerifiedHeirKey() { return key; }, async putEnvelope() { submissions++; return { ok: true }; } };
  const dek = webcrypto.getRandomValues(new Uint8Array(32));
  assert.deepEqual(await stageOwnerHeirEnvelope(dek, ctx, '0'.repeat(64), directory), { ok: false });
  key.revoked = true;
  assert.deepEqual(await stageOwnerHeirEnvelope(dek, ctx, fingerprint, directory), { ok: false });
  key.revoked = false; key.verified = false;
  assert.deepEqual(await stageOwnerHeirEnvelope(dek, ctx, fingerprint, directory), { ok: false });
  key.verified = true; key.assignmentActive = false;
  assert.deepEqual(await stageOwnerHeirEnvelope(dek, ctx, fingerprint, directory), { ok: false });
  key.assignmentActive = true; key.publicKeyHex = '0'.repeat(64);
  assert.deepEqual(await stageOwnerHeirEnvelope(dek, ctx, fingerprint, directory), { ok: false });
  assert.equal(submissions, 0);
});

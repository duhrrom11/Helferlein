import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createHeirKeyProofStaging, respondToHeirKeyChallenge } from '../../build/heir-key-proof-staging.js';
import { createHeirReleaseStaging } from '../../build/heir-release-staging.js';
import { sealHeirDek, openHeirDek, HEIR_HPKE_SUITE } from '../../build/heir-hpke-envelope.js';

const uid = '22222222-2222-4222-8222-222222222222';
const owner = '11111111-1111-4111-8111-111111111111';
const wrong = '33333333-3333-4333-8333-333333333333';
const vault = 'v_abcdefgh';
const verify = async h => ({ 'Bearer heir': uid, 'Bearer owner': owner, 'Bearer wrong': wrong })[h] ?? null;
const asHex = b => Buffer.from(b).toString('hex');
const record = () => ({
  keys: new Map(), challenges: new Map(), alarm: null,
  assignment: { status: 'active' },
  txCount: 0, commits: 0, rollbacks: 0,
});
function dbFor(s) {
  return {
    async transaction(fn) {
      s.txCount++;
      const backup = structuredClone({ keys: s.keys, challenges: s.challenges, alarm: s.alarm, assignment: s.assignment });
      const tx = {
        async exec(sql, v) {
          if (sql.includes('INSERT INTO heir_private.heir_public_keys')) {
            s.keys.set(v[0], { uid: v[1], publicHex: v[3], verified_at: null, revoked_at: null }); return 1;
          }
          if (sql.includes('INSERT INTO heir_private.heir_key_proofs')) {
            s.challenges.set(v[0], { keyId: v[1], uid: v[2], expectedHash: v[3], consumed: false }); return 1;
          }
          if (sql.includes('UPDATE heir_private.heir_key_proofs')) {
            const c = s.challenges.get(v[0]); if (!c || c.consumed) return 0; c.consumed = true; return 1;
          }
          if (sql.includes('UPDATE heir_private.heir_public_keys')) {
            const k = s.keys.get(v[0]); if (!k || k.verified_at) return 0; k.verified_at = 'verified'; return 1;
          }
          if (sql.includes('INSERT INTO heir_private.heir_release_cases')) {
            s.alarm = { state: 'grace', graceComplete: false }; return 1;
          }
          if (sql.includes('UPDATE heir_private.heir_release_cases')) {
            if (s.alarm?.state !== 'grace') return 0; s.alarm.state = 'cancelled'; return 1;
          }
          throw Error('unexpected exec ' + sql);
        },
        async one(sql, v) {
          if (sql.includes('pg_advisory_xact_lock')) return { locked: null };
          if (sql.includes('count(*)::int AS n FROM heir_private.heir_key_proofs')) {
            return { n: [...s.challenges.values()].filter(c => c.uid === v[0] && !c.consumed).length };
          }
          if (sql.includes('FROM heir_private.heir_public_keys')) {
            const k = s.keys.get(v[0]); return k?.uid === v[1] ? { verified_at: k.verified_at, revoked_at: k.revoked_at } : null;
          }
          if (sql.includes('FROM heir_private.heir_key_proofs')) {
            const c = s.challenges.get(v[0]);
            return c && c.keyId === v[1] && c.uid === v[2]
              ? { valid: !c.consumed, expected_match: c.expectedHash === v[3] } : null;
          }
          if (sql.includes('FROM public.vault_cloud_snapshots')) return v[0] === owner ? { vault_id: vault } : null;
          if (sql.includes('FROM heir_private.heir_assignments')) return v[0] === owner && v[1] === uid ? s.assignment : null;
          if (sql.includes('FROM heir_private.heir_release_cases')) return s.alarm
            ? { state: s.alarm.state, grace_complete: s.alarm.graceComplete } : null;
          throw Error('unexpected one ' + sql);
        },
      };
      try { const value = await fn(tx); s.commits++; return value; }
      catch (err) {
        Object.assign(s, backup); s.rollbacks++; throw err;
      }
    },
  };
}

test('X25519 possession proof is identity-bound, one-time, and required before key verification', async () => {
  const s = record(), service = createHeirKeyProofStaging(dbFor(s), verify);
  const keys = await webcrypto.subtle.generateKey('X25519', false, ['deriveBits']);
  const publicHex = asHex(await webcrypto.subtle.exportKey('raw', keys.publicKey));
  const enrollment = await service.beginEnrollment('Bearer heir', publicHex);
  assert.equal(enrollment.ok, true);
  assert.equal(s.keys.get(enrollment.keyId)?.verified_at, null);
  const proof = await respondToHeirKeyChallenge(keys.privateKey, enrollment, uid, publicHex);
  assert.deepEqual(await service.confirmEnrollment('Bearer wrong', { ...enrollment, proofHex: proof }), { ok: false });
  assert.deepEqual(await service.confirmEnrollment('Bearer heir', { ...enrollment, proofHex: proof }), { ok: true });
  assert.equal(s.keys.get(enrollment.keyId)?.verified_at, 'verified');
  assert.deepEqual(await service.confirmEnrollment('Bearer heir', { ...enrollment, proofHex: proof }), { ok: false });
});

test('incorrect possession proof burns challenge without authorizing public key', async () => {
  const s = record(), service = createHeirKeyProofStaging(dbFor(s), verify);
  const keys = await webcrypto.subtle.generateKey('X25519', false, ['deriveBits']);
  const publicHex = asHex(await webcrypto.subtle.exportKey('raw', keys.publicKey));
  const enrollment = await service.beginEnrollment('Bearer heir', publicHex);
  const correct = await respondToHeirKeyChallenge(keys.privateKey, enrollment, uid, publicHex);
  assert.deepEqual(await service.confirmEnrollment('Bearer heir', { ...enrollment, proofHex: '0'.repeat(64) }), { ok: false });
  assert.deepEqual(await service.confirmEnrollment('Bearer heir', { ...enrollment, proofHex: correct }), { ok: false });
  assert.equal(s.keys.get(enrollment.keyId)?.verified_at, null);
});

test('RFC9180 HPKE X25519/AES-256-GCM envelope roundtrips; wrong context or key fails closed', async () => {
  const keys = await webcrypto.subtle.generateKey('X25519', false, ['deriveBits']);
  const publicHex = asHex(await webcrypto.subtle.exportKey('raw', keys.publicKey));
  const dek = webcrypto.getRandomValues(new Uint8Array(32));
  const ctx = { ownerUserId: owner, heirUserId: uid, vaultId: vault,
    keyId: '55555555-5555-4555-8555-555555555555', assignmentVersion: 1 };
  const envelope = await sealHeirDek(dek, publicHex, ctx);
  assert.equal(envelope.suite, HEIR_HPKE_SUITE);
  assert.equal(envelope.encapsulatedKeyHex.length, 64);
  assert.equal(envelope.wrappedDekHex.length, 96);
  const recovered = await openHeirDek(envelope, keys.privateKey, publicHex, ctx);
  assert.deepEqual(Buffer.from(recovered), Buffer.from(dek));
  await assert.rejects(openHeirDek(envelope, keys.privateKey, publicHex, { ...ctx, assignmentVersion: 2 }));
  const other = await webcrypto.subtle.generateKey('X25519', false, ['deriveBits']);
  await assert.rejects(openHeirDek(envelope, other.privateKey, publicHex, ctx));
});

test('alarm grace is measured by DB only and NEVER releases envelope without separate review', async () => {
  const s = record(), service = createHeirReleaseStaging(dbFor(s), verify);
  assert.deepEqual(await service.raiseAlarm('Bearer wrong', { ownerUserId: owner, vaultId: vault }), { ok: false });
  assert.deepEqual(await service.raiseAlarm('Bearer heir', { ownerUserId: owner, vaultId: vault }), { ok: true, state: 'grace' });
  assert.deepEqual(await service.raiseAlarm('Bearer heir', { ownerUserId: owner, vaultId: vault }), { ok: true, state: 'grace' });
  s.alarm.graceComplete = true;
  assert.deepEqual(await service.reviewStatus('Bearer heir', { ownerUserId: owner, vaultId: vault }),
    { ok: true, state: 'pending_independent_review' });
  assert.deepEqual(await service.reviewStatus('Bearer wrong', { ownerUserId: owner, vaultId: vault }), { ok: false });
  assert.deepEqual(await service.cancelAlarm('Bearer heir', vault), { ok: false });
  assert.deepEqual(await service.cancelAlarm('Bearer owner', vault), { ok: true });
  assert.deepEqual(await service.reviewStatus('Bearer heir', { ownerUserId: owner, vaultId: vault }), { ok: true, state: 'locked' });
  assert.deepEqual(await service.raiseAlarm('Bearer heir', { ownerUserId: owner, vaultId: vault }), { ok: false });
  assert.equal('fetchEnvelope' in service, false);
});

test('RFC 9180 Appendix A.1 X25519 KEM known-answer vector', async () => {
  // Official RFC vector for DHKEM(X25519, HKDF-SHA256). The KEM is identical
  // regardless of whether the selected HPKE AEAD is AES-128 or AES-256-GCM.
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const js = readFileSync(resolve(import.meta.dirname, '../../build/heir-hpke-envelope.js'), 'utf8')
    .replace('async function kemShared(', 'export async function kemShared(');
  const { kemShared } = await import('data:text/javascript,' + encodeURIComponent(js));
  const enc = Buffer.from('37fda3567bdbd628e88668c3c8d7e97d1d1253b6d4ea6d44c150f741f1bf4431', 'hex');
  const skE = Buffer.from('52c4a758a802cd8b936eceea314432798d5baf2d7e9235dc084ab1b9cfa2f736', 'hex');
  const pkR = Buffer.from('3948cfe0ad1ddb695d780e59077195da6c56506b027329794ab02bca80815c4d', 'hex');
  const expected = 'fe0e18c9f024ce43799ae393c7e8fe8fce9d218875e8227b0187c04e7d2ea1fc';
  const privateKey = await webcrypto.subtle.importKey('pkcs8', Buffer.concat([
    Buffer.from('302e020100300506032b656e04220420', 'hex'), skE
  ]), 'X25519', false, ['deriveBits']);
  const publicKey = await webcrypto.subtle.importKey('raw', pkR, 'X25519', false, []);
  const dh = await webcrypto.subtle.deriveBits({ name: 'X25519', public: publicKey }, privateKey, 256);
  assert.equal(asHex(await kemShared(dh, enc, pkR)), expected);
});


test('enrollment rejects fourth outstanding challenge per heir', async () => {
  const state = record();
  const service = createHeirKeyProofStaging(dbFor(state), verify);
  for (let i = 0; i < 4; i++) {
    const keys = await webcrypto.subtle.generateKey('X25519', false, ['deriveBits']);
    const publicHex = asHex(await webcrypto.subtle.exportKey('raw', keys.publicKey));
    const result = await service.beginEnrollment('Bearer heir', publicHex);
    assert.equal(result.ok, i < 3);
  }
  assert.equal(state.challenges.size, 3);
});

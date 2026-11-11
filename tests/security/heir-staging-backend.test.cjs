'use strict';
// Targeted contract tests for the non-deployed staging backend.
// Mock transactions DO NOT verify real PostgreSQL locking/RLS/permissions.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const typescript = readFileSync(resolve(__dirname, '../../supabase/functions/_shared/heir-staging-backend.ts'), 'utf8');
const js = stripTypeScriptTypes(typescript, { mode: 'strip' }).replace(/^export /gm, '');
const createHeirStagingBackend = vm.runInNewContext(js + '\ncreateHeirStagingBackend', {
  crypto: crypto.webcrypto, btoa, atob, Uint8Array, Object, Number, String, Array, Error,
}, { timeout: 1000 });
const equal = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
const OWNER = '11111111-1111-4111-8111-111111111111';
const HEIR = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
const INV = '44444444-4444-4444-8444-444444444444';
const KEY = '55555555-5555-4555-8555-555555555555';
const VAULT = 'v_abcdefgh';
const fp = 'f'.repeat(64);
const input = { vaultId: VAULT, intendedUserId: HEIR, ttlSeconds: 3600 };
const env = { vaultId: VAULT, heirUserId: HEIR, keyId: KEY, publicKeyFingerprintHex: fp,
  encapsulatedKeyHex: 'a'.repeat(64), wrappedDekHex: 'b'.repeat(96),
  suite: 'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM' };
const verify = async h => ({ 'Bearer owner': OWNER, 'Bearer heir': HEIR, 'Bearer other': OTHER })[h] ?? null;

function memory() {
  const state = { vault: VAULT, invitation: null, assignment: null, key: { heir: HEIR, keyId: KEY, fingerprint_hex: fp, verified: true }, envelope: null, pendingCount: 0, rollbackCount: 0, calls: [] };
  const backend = {
    async transaction(fn) {
      const before = structuredClone({ invitation: state.invitation, assignment: state.assignment, envelope: state.envelope, pendingCount: state.pendingCount });
      const tx = {
        async one(sql, v) {
          state.calls.push({ op: 'one', sql, values: v });
          if (/FROM public\.vault_cloud_snapshots/.test(sql)) return v[0] === OWNER && state.vault ? { vault_id: state.vault } : null;
          if (/count\(\*\)::int AS n/.test(sql)) return { n: state.pendingCount };
          if (/SELECT owner_user_id FROM heir_private\.heir_invitations/.test(sql)) return state.invitation?.digest === v[0] ? { owner_user_id: OWNER } : null;
          if (/FROM heir_private\.heir_invitations/.test(sql) && /FOR UPDATE/.test(sql)) {
            const inv = state.invitation;
            if (!inv) return null;
            if (/token_hash=decode/.test(sql)) return inv.digest === v[1] && v[0] === OWNER ? { invitation_id: INV, vault_id: inv.vault_id, intended_user_id: HEIR, eligible: !inv.accepted && !inv.revoked && !inv.expired } : null;
            return v[0] === INV && v[1] === OWNER ? { accepted_at: inv.accepted ? '2026-11-11' : null, revoked_at: inv.revoked ? '2026-11-11' : null, intended_user_id: HEIR } : null;
          }
          if (/FROM heir_private\.heir_assignments/.test(sql)) return state.assignment && v[0] === OWNER && v[1] === HEIR ? { status: state.assignment.status, version: state.assignment.version } : null;
          if (/FROM heir_private\.heir_public_keys/.test(sql)) return state.key.verified && state.key.heir === v[0] && state.key.keyId === v[1] ? { fingerprint_hex: state.key.fingerprint_hex } : null;
          throw new Error('unexpected one: ' + sql);
        },
        async exec(sql, v) {
          state.calls.push({ op: 'exec', sql, values: v });
          if (/INSERT INTO heir_private\.heir_invitations/.test(sql)) {
            state.invitation = { digest: v[3], vault_id: v[1], accepted: false, revoked: false, expired: false };
            state.pendingCount++;
            return 1;
          }
          if (/UPDATE heir_private\.heir_invitations SET accepted_at/.test(sql)) {
            if (!state.invitation || state.invitation.accepted || state.invitation.revoked || state.invitation.expired) return 0;
            state.invitation.accepted = true; return 1;
          }
          if (/INSERT INTO heir_private\.heir_assignments/.test(sql)) {
            if (state.assignment) return 0;
            state.assignment = { status: 'active', version: 1 }; return 1;
          }
          if (/UPDATE heir_private\.heir_invitations SET revoked_at/.test(sql)) {
            if (state.invitation?.accepted || state.invitation?.revoked) return 0;
            state.invitation.revoked = true; return 1;
          }
          if (/UPDATE heir_private\.heir_assignments/.test(sql)) {
            if (state.assignment?.status !== 'active') return 0;
            state.assignment.status = 'revoked'; state.assignment.version++; return 1;
          }
          if (/UPDATE heir_private\.heir_envelopes/.test(sql)) {
            if (state.envelope) state.envelope.revoked = true;
            return state.envelope ? 1 : 0;
          }
          if (/INSERT INTO heir_private\.heir_envelopes/.test(sql)) {
            if (state.envelope?.revoked) return 0;
            state.envelope = { owner: v[0], heir: v[1], key: v[2], wrapped: v[6], revoked: false };
            return 1;
          }
          throw new Error('unexpected exec: ' + sql);
        },
      };
      try { return await fn(tx); }
      catch (error) {
        Object.assign(state, before);
        state.rollbackCount++;
        throw error;
      }
    },
  };
  return { state, svc: createHeirStagingBackend(backend, verify) };
}

async function created(m) {
  const result = await m.svc.createInvitation('Bearer owner', input);
  assert.equal(result.ok, true);
  assert.match(result.token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(m.state.invitation.digest, /^[0-9a-f]{64}$/);
  assert.notEqual(m.state.invitation.digest, result.token);
  assert.equal(m.state.invitation.digest, crypto.createHash('sha256').update(Buffer.from(result.token.replace(/-/g,'+').replace(/_/g,'/')+'=', 'base64')).digest('hex'));
  return result.token;
}

test('only verified owner and matching snapshot can create; token generated once and stored hashed', async () => {
  const m = memory();
  equal(await m.svc.createInvitation('Bearer other', input), { ok: false });
  equal(await m.svc.createInvitation(null, input), { ok: false });
  equal(await m.svc.createInvitation('Bearer owner', { ...input, vaultId: 'v_wrongvault' }), { ok: false });
  assert.equal(m.state.invitation, null);
  await created(m);
  assert.equal(m.state.calls.some(c => c.sql.includes('FOR UPDATE') && c.sql.includes('vault_cloud_snapshots')), true);
});

test('invite token bound to verified intended heir, single-use and DB-clock preconditions', async () => {
  const m = memory(); const token = await created(m);
  equal(await m.svc.redeemInvitation('Bearer other', token), { ok: false });
  equal(await m.svc.redeemInvitation('Bearer heir', 'bad'), { ok: false });
  equal(await m.svc.redeemInvitation('Bearer heir', token), { ok: true });
  assert.equal(m.state.assignment.status, 'active');
  equal(await m.svc.redeemInvitation('Bearer heir', token), { ok: false });
  assert.ok(m.state.rollbackCount >= 2);
});

test('revoke pending invitation denies later redemption; accepted revocation disables envelope', async () => {
  const pending = memory(); const first = await created(pending);
  equal(await pending.svc.revokeInvitation('Bearer owner', { vaultId: VAULT, invitationId: INV }), { ok: true });
  equal(await pending.svc.redeemInvitation('Bearer heir', first), { ok: false });
  const active = memory(); const token = await created(active);
  equal(await active.svc.redeemInvitation('Bearer heir', token), { ok: true });
  equal(await active.svc.putEnvelope('Bearer other', env), { ok: false });
  equal(await active.svc.putEnvelope('Bearer owner', { ...env, publicKeyFingerprintHex: 'e'.repeat(64) }), { ok: false });
  equal(await active.svc.putEnvelope('Bearer owner', env), { ok: true });
  assert.equal(active.state.envelope.wrapped, env.wrappedDekHex);
  equal(await active.svc.revokeInvitation('Bearer owner', { vaultId: VAULT, invitationId: INV }), { ok: true });
  assert.equal(active.state.assignment.status, 'revoked');
  assert.equal(active.state.envelope.revoked, true);
  equal(await active.svc.putEnvelope('Bearer owner', env), { ok: false });
});

test('unverified heir key is rejected; failed duplicate enrollment rolls back acceptance', async () => {
  const m = memory(); const token = await created(m);
  m.state.assignment = { status: 'revoked', version: 2 };
  equal(await m.svc.redeemInvitation('Bearer heir', token), { ok: false });
  assert.equal(m.state.invitation.accepted, false, 'transaction rollback required');
  m.state.assignment = null;
  equal(await m.svc.redeemInvitation('Bearer heir', token), { ok: true });
  m.state.key.verified = false;
  equal(await m.svc.putEnvelope('Bearer owner', env), { ok: false });
  assert.equal(m.state.envelope, null);
});

test('invalid payloads, TTLs and database errors fail closed without exposing secrets', async () => {
  const m = memory();
  for (const ttl of [0, 899, 604801, 100.5]) equal(await m.svc.createInvitation('Bearer owner', { ...input, ttlSeconds: ttl }), { ok: false });
  equal(await m.svc.putEnvelope('Bearer owner', { ...env, wrappedDekHex: 'bad' }), { ok: false });
  equal(await m.svc.revokeInvitation('Bearer heir', { vaultId: VAULT, invitationId: INV }), { ok: false });
  m.state.pendingCount = 20;
  equal(await m.svc.createInvitation('Bearer owner', input), { ok: false });
});

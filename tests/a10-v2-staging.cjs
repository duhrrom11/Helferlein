/* Single focused synthetic contract; no Supabase, browser storage or real secrets. */
'use strict';
const assert = require('node:assert/strict');
const { seal } = require('../assets/a10-v2-encrypted-envelope.js');
const { stage, inspect } = require('../assets/a10-v2-staging.js');
(async () => {
  const vaultId = 'v_synthetic1234';
  const password = 'synthetic-only-long-password-123';
  const payload = { vaultId, masterKeyHex: 'a'.repeat(64),
    encryptedData: { iv: Buffer.alloc(12, 1).toString('base64'),
      ciphertext: Buffer.alloc(32, 2).toString('base64') } };
  const envelope = await seal(payload, password, { explicitConsent: true });
  const records = new Map();
  const driver = {
    transact: async (id, update) => { const next = update(records.get(id)); records.set(id, next); return next; },
    read: async id => records.get(id)
  };
  assert.deepEqual(await inspect(driver, vaultId), { vaultId, status: 'EMPTY', active: false });
  await assert.rejects(stage(driver, vaultId, envelope, password, {}), /A10_V2_STAGING_REJECTED/);
  await assert.rejects(stage(driver, vaultId, envelope, 'wrong-password-12345678',
    { explicitConsent: true, confirmVaultId: vaultId }), /A10_V2_INVALID_OR_AUTH_FAILED/);
  assert.equal(records.size, 0);
  const outcome = await stage(driver, vaultId, envelope, password,
    { explicitConsent: true, confirmVaultId: vaultId });
  assert.deepEqual(outcome, { vaultId, status: 'STAGED_NOT_ACTIVE', active: false });
  const stored = records.get(vaultId);
  assert.equal(stored.active, null);
  assert.equal(JSON.stringify(stored).includes(payload.masterKeyHex), false);
  assert.deepEqual(await inspect(driver, vaultId), { vaultId, status: 'STAGED_NOT_ACTIVE', active: false });
  await assert.rejects(stage(driver, vaultId, envelope, password,
    { explicitConsent: true, confirmVaultId: vaultId }), /A10_V2_STAGING_REJECTED/);
  assert.deepEqual(records.get(vaultId), stored);
  console.log('A10 isolated V2 staging: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });

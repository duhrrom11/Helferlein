'use strict';
// Focused synthetic recovery-to-staging gate; no real storage or Supabase.
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { prepare } = require('../assets/a10-v1-v2-migration-preflight.js');
const { stageVerified } = require('../assets/a10-recovery-verified-staging.js');
(async () => {
  const vaultId = 'v_syntheticStage1234';
  const backupPassword = 'independent-backup-password-123';
  const v2Password = 'different-v2-password-456789';
  const keyBytes = webcrypto.getRandomValues(new Uint8Array(32));
  const key = await webcrypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv },
    key, new TextEncoder().encode(JSON.stringify({ entries: [{ title: 'synthetic' }] }))));
  const legacy = {
    vaultId, masterKeyHex: Buffer.from(keyBytes).toString('hex'),
    encryptedData: { iv: Buffer.from(iv).toString('base64'),
      ciphertext: Buffer.from(ciphertext).toString('base64') },
    ownerName: 'Synthetic', ownerEmail: 'synthetic@example.invalid',
    checkInIntervalDays: 30, lastCheckIn: '2026-01-01T00:00:00.000Z', trustees: []
  };
  const original = JSON.stringify(legacy);
  const options = { explicitConsent: true, confirmVaultId: vaultId,
    confirmIndependentBackup: true, confirmStagingOnly: true };
  const artifacts = await prepare(legacy, backupPassword, v2Password, options);
  let writes = 0;
  let stored;
  const driver = {
    async transact(key, transform) {
      const next = transform(stored);
      stored = structuredClone(next);
      writes++;
      return structuredClone(stored);
    },
    async read() { return structuredClone(stored); }
  };
  await assert.rejects(stageVerified(driver, artifacts, backupPassword, v2Password,
    { ...options, confirmStagingOnly: false }));
  await assert.rejects(stageVerified(driver, artifacts, 'wrong-backup-password-123', v2Password, options));
  await assert.rejects(stageVerified(driver, artifacts, backupPassword, 'wrong-v2-password-123456', options));
  await assert.rejects(stageVerified(driver, { ...artifacts, vaultId: 'v_foreignStage1234' },
    backupPassword, v2Password, { ...options, confirmVaultId: 'v_foreignStage1234' }));
  assert.equal(writes, 0, 'failed recovery must never reach storage');
  assert.deepEqual(await stageVerified(driver, artifacts, backupPassword, v2Password, options),
    { vaultId, status: 'RECOVERY_VERIFIED_STAGED_NOT_ACTIVE', active: false });
  assert.equal(writes, 1);
  assert.equal(stored.active, null);
  assert.equal(stored.status, 'STAGED_NOT_ACTIVE');
  assert.equal(JSON.stringify(stored).includes(legacy.masterKeyHex), false);
  await assert.rejects(stageVerified(driver, artifacts, backupPassword, v2Password, options),
    /A10_V2_STAGING_REJECTED/);
  assert.equal(writes, 1, 'no overwrite');
  assert.equal(JSON.stringify(legacy), original, 'V1 remains untouched');
  console.log('A10 independent V1 recovery gate -> encrypted V2 staging only: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });

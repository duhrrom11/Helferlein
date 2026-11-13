'use strict';
// Focused synthetic WebCrypto roundtrip, no browser persistence, accounts, cloud or Supabase.
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { prepare, verifyRecovery } = require('../assets/a10-v1-v2-migration-preflight.js');
const backupApi = require('../assets/a10-v1-portable-backup.js');
const v2 = require('../assets/a10-v2-encrypted-envelope.js');
(async () => {
  const vaultId = 'v_syntheticMigration123';
  const backupPassword = 'independent-backup-password-123';
  const v2Password = 'different-v2-password-456789';
  const keyBytes = webcrypto.getRandomValues(new Uint8Array(32));
  const key = await webcrypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const entries = { entries: [{ title: 'synthetic-entry', value: 'no-real-secret' }] };
  const ciphertext = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv },
    key, new TextEncoder().encode(JSON.stringify(entries))));
  const legacy = {
    vaultId, masterKeyHex: Buffer.from(keyBytes).toString('hex'),
    encryptedData: { iv: Buffer.from(iv).toString('base64'), ciphertext: Buffer.from(ciphertext).toString('base64') },
    ownerName: 'Synthetic Owner', ownerEmail: 'synthetic@example.invalid',
    checkInIntervalDays: 30, lastCheckIn: '2026-01-01T00:00:00.000Z', trustees: []
    // alarmPersons intentionally absent to exercise historical normalization.
  };
  const before = JSON.stringify(legacy);
  const consent = { explicitConsent: true, confirmVaultId: vaultId, confirmIndependentBackup: true };
  await assert.rejects(prepare(legacy, backupPassword, v2Password, {}), /A10_MIGRATION_PREFLIGHT_REJECTED/);
  await assert.rejects(prepare(legacy, v2Password, v2Password, consent), /A10_MIGRATION_PREFLIGHT_REJECTED/);
  const prepared = await prepare(legacy, backupPassword, v2Password, consent);
  assert.equal(prepared.status, 'PREPARED_NOT_STAGED_NOT_ACTIVE');
  assert.equal(JSON.stringify(legacy), before);
  assert.equal(JSON.stringify(prepared).includes(legacy.masterKeyHex), false);
  assert.deepEqual(await backupApi.restore(prepared.backup, backupPassword), legacy);
  assert.deepEqual((await v2.unlock(prepared.envelope, v2Password, { explicitConsent: true })).alarmPersons, []);
  assert.deepEqual(await verifyRecovery(JSON.parse(JSON.stringify(prepared)), backupPassword, v2Password, consent),
    { vaultId, status: 'RECOVERY_VERIFIED_NO_WRITE', active: false });
  await assert.rejects(verifyRecovery(prepared, 'wrong-backup-password-123', v2Password, consent));
  await assert.rejects(verifyRecovery(prepared, backupPassword, 'wrong-v2-password-123456', consent));
  await assert.rejects(verifyRecovery({ ...prepared, vaultId: 'v_foreignMigration123' },
    backupPassword, v2Password, { ...consent, confirmVaultId: 'v_foreignMigration123' }));
  console.log('A10 isolated V1 backup -> V2 -> independent recovery: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });

'use strict';
// Synthetic selected encrypted file must match V2 envelope before any staged write.
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { File } = require('node:buffer');
const { prepare } = require('../assets/a10-v1-v2-migration-preflight.js');
const { stageFromSelectedBackup } = require('../assets/a10-file-bound-recovery-staging.js');
(async () => {
  const backupPassword = 'synthetic-independent-backup-1234';
  const v2Password = 'synthetic-different-v2-password-456';
  const vaultId = 'v_fileBoundStage123';
  async function legacy(label) {
    const bytes = webcrypto.getRandomValues(new Uint8Array(32));
    const key = await webcrypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt']);
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const cipher = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
      new TextEncoder().encode(JSON.stringify({ entries: [{ label }] }))));
    return { vaultId, masterKeyHex: Buffer.from(bytes).toString('hex'),
      encryptedData: { iv: Buffer.from(iv).toString('base64'),
        ciphertext: Buffer.from(cipher).toString('base64') },
      ownerName: 'Synthetic', ownerEmail: 'synthetic@example.invalid',
      checkInIntervalDays: 30, lastCheckIn: '2026-01-01T00:00:00.000Z', trustees: [] };
  }
  const options = { explicitConsent: true, confirmIndependentBackup: true,
    confirmStagingOnly: true, confirmVaultId: vaultId };
  const source = await legacy('original');
  const snapshot = JSON.stringify(source);
  const artifacts = await prepare(source, backupPassword, v2Password, options);
  const unrelated = await prepare(await legacy('different'), backupPassword, v2Password, options);
  const file = (data, name = 'helferlein-a10-v1-encrypted-backup.json') =>
    new File([JSON.stringify(data)], name, { type: 'application/json' });
  let stored;
  let attempts = 0;
  const driver = { async transact(id, transform) {
    attempts++;
    const next = transform(stored);
    stored = structuredClone(next);
    return structuredClone(stored);
  }};
  const run = (selected, opts = options) => stageFromSelectedBackup(driver, selected,
    artifacts, backupPassword, v2Password, opts);
  await assert.rejects(run(file(unrelated.backup)), /A10_MIGRATION_PREFLIGHT_REJECTED/);
  await assert.rejects(run(file(artifacts.backup, 'wrong-name.json')));
  await assert.rejects(run(file(artifacts.backup), { ...options, confirmStagingOnly: false }));
  await assert.rejects(run(new File(['{'], 'helferlein-a10-v1-encrypted-backup.json',
    { type: 'application/json' })));
  assert.equal(attempts, 0, 'invalid or mismatched file must not stage');
  const result = await run(file(artifacts.backup));
  assert.deepEqual(result, { vaultId, status: 'RECOVERY_VERIFIED_STAGED_NOT_ACTIVE', active: false });
  assert.equal(attempts, 1);
  assert.equal(stored.status, 'STAGED_NOT_ACTIVE');
  assert.equal(stored.active, null);
  assert.equal(JSON.stringify(stored).includes(source.masterKeyHex), false);
  await assert.rejects(run(file(artifacts.backup)));
  assert.equal(attempts, 2, 'existing record is rejected by transaction');
  assert.equal(JSON.stringify(source), snapshot);
  console.log('A10 selected encrypted backup file bound to inactive V2 staging: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });

'use strict';
// Synthetic attested file snapshot must pass both exact-byte and cryptographic gates.
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { File } = require('node:buffer');
const { prepare } = require('../assets/a10-v1-v2-migration-preflight.js');
const { attestExport } = require('../assets/a10-backup-file-integrity.js');
const { stageAttested } = require('../assets/a10-attested-file-staging.js');
(async () => {
  const vaultId = 'v_attestedFile123';
  const backupPassword = 'independent-synthetic-backup-password-123';
  const v2Password = 'separate-synthetic-v2-password-456';
  const bytes = webcrypto.getRandomValues(new Uint8Array(32));
  const key = await webcrypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt']);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
    new TextEncoder().encode('{"entries":[{"title":"synthetic"}]}')));
  const source = { vaultId, masterKeyHex: Buffer.from(bytes).toString('hex'),
    encryptedData: { iv: Buffer.from(iv).toString('base64'),
      ciphertext: Buffer.from(cipher).toString('base64') },
    ownerName: 'Synthetic', ownerEmail: 'synthetic@example.invalid',
    checkInIntervalDays: 30, lastCheckIn: '2026-01-01T00:00:00.000Z', trustees: [] };
  const options = { explicitConsent: true, confirmIndependentStorage: true,
    confirmIndependentBackup: true, confirmStagingOnly: true, confirmVaultId: vaultId };
  const artifacts = await prepare(source, backupPassword, v2Password, options);
  const backupText = JSON.stringify(artifacts.backup);
  const attestation = await attestExport(backupText, options);
  const file = text => new File([text], 'helferlein-a10-v1-encrypted-backup.json',
    { type: 'application/json' });
  let stored;
  let writes = 0;
  const driver = { async transact(id, transform) {
    writes++;
    stored = structuredClone(transform(stored));
    return structuredClone(stored);
  }};
  const run = (selected, token = attestation, opts = options) =>
    stageAttested(driver, selected, token, artifacts, backupPassword, v2Password, opts);
  await assert.rejects(run(file(backupText + ' ')), /A10_BACKUP_FILE_INTEGRITY_REJECTED/);
  await assert.rejects(run(file(backupText), { ...attestation, sha256: 'f'.repeat(64) }));
  await assert.rejects(run(file(backupText), attestation,
    { ...options, confirmIndependentStorage: false }));
  assert.equal(writes, 0);
  // Even if the selected file changes between successive reads, only the first
  // immutable snapshot is used for BOTH SHA-256 and decryption.
  let reads = 0;
  const changingFile = {
    name: 'helferlein-a10-v1-encrypted-backup.json', type: 'application/json',
    size: Buffer.byteLength(backupText),
    async arrayBuffer() {
      reads++;
      return Uint8Array.from(Buffer.from(reads === 1 ? backupText : '{}')).buffer;
    }
  };
  const result = await run(changingFile);
  assert.deepEqual(result, { vaultId, status: 'RECOVERY_VERIFIED_STAGED_NOT_ACTIVE', active: false });
  assert.equal(reads, 1);
  assert.equal(writes, 1);
  assert.equal(stored.status, 'STAGED_NOT_ACTIVE');
  assert.equal(stored.active, null);
  assert.equal(JSON.stringify(stored).includes(source.masterKeyHex), false);
  await assert.rejects(run(file(backupText)));
  assert.equal(writes, 2);
  console.log('A10 attested exact-byte snapshot + recovery-verified inactive staging: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });

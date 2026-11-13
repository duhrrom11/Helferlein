'use strict';
// Synthetic exact-byte attestation. No filesystem, production data or Supabase.
const assert = require('node:assert/strict');
const { File } = require('node:buffer');
const { attestExport, verifySelectedFile } = require('../assets/a10-backup-file-integrity.js');
(async () => {
  const options = { explicitConsent: true, confirmIndependentStorage: true };
  const name = 'helferlein-a10-v1-encrypted-backup.json';
  const bytes = JSON.stringify({ version: 1, ciphertext: 'synthetic-encrypted-data-only' });
  const file = (text, filename = name) => new File([text], filename, { type: 'application/json' });
  const attestation = await attestExport(bytes, options);
  assert.equal(attestation.status, 'EXPORT_BYTES_ATTESTED_NOT_STORED');
  assert.match(attestation.sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(await verifySelectedFile(file(bytes), attestation, options), {
    filename: name, bytes: Buffer.byteLength(bytes),
    status: 'SELECTED_FILE_BYTES_MATCH_EXPORT_NO_WRITE'
  });
  await assert.rejects(verifySelectedFile(file(bytes + ' '), attestation, options));
  await assert.rejects(verifySelectedFile(file(bytes.replace('synthetic', 'different')), attestation, options));
  await assert.rejects(verifySelectedFile(file(bytes, 'wrong.json'), attestation, options));
  await assert.rejects(verifySelectedFile(file(bytes), { ...attestation, sha256: 'f'.repeat(64) }, options));
  await assert.rejects(verifySelectedFile(file(bytes), attestation,
    { explicitConsent: true, confirmIndependentStorage: false }));
  await assert.rejects(attestExport(bytes, { explicitConsent: false, confirmIndependentStorage: true }));
  await assert.rejects(verifySelectedFile(file('x'.repeat(1500001)), attestation, options));
  assert.equal(Object.keys(attestation).includes('ciphertext'), false);
  console.log('A10 selected backup exact-byte SHA-256 attestation: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });

/* Focused isolated V2 envelope contract. No browser storage, production accounts or Supabase. */
'use strict';
const assert = require('node:assert/strict');
// Node.js 22 exposes WebCrypto on globalThis.crypto; do not overwrite its getter.
globalThis.btoa = text => Buffer.from(text, 'binary').toString('base64');
globalThis.atob = text => Buffer.from(text, 'base64').toString('binary');
const { seal, unlock } = require('../assets/a10-v2-encrypted-envelope.js');
(async () => {
  const payload = {
    vaultId: 'v_synthetic1234',
    masterKeyHex: 'a'.repeat(64),
    encryptedData: { iv: Buffer.alloc(12, 1).toString('base64'), ciphertext: Buffer.alloc(32, 2).toString('base64') },
    ownerName: 'Synthetic Owner', trustees: [], alarmPersons: []
  };
  const password = 'synthetic-password-only-32-characters';
  const sealed = await seal(payload, password, { explicitConsent: true });
  assert.equal(sealed.version, 2);
  assert.equal(JSON.stringify(sealed).includes(payload.masterKeyHex), false);
  assert.equal(JSON.stringify(sealed).includes(payload.ownerName), false);
  assert.deepEqual(await unlock(sealed, password, { explicitConsent: true }), payload);
  assert.notEqual((await seal(payload, password, { explicitConsent: true })).ciphertext, sealed.ciphertext);
  await assert.rejects(unlock(sealed, 'incorrect-password-123456', { explicitConsent: true }), /A10_V2_INVALID_OR_AUTH_FAILED/);
  await assert.rejects(unlock({ ...sealed, ciphertext: sealed.ciphertext.slice(0, -4) + 'AAAA' }, password, { explicitConsent: true }), /A10_V2_INVALID_OR_AUTH_FAILED/);
  await assert.rejects(unlock(sealed, password), /A10_V2_INVALID_OR_AUTH_FAILED/);
  await assert.rejects(seal(payload, password), /A10_V2_INVALID_OR_AUTH_FAILED/);
  console.log('A10 isolated V2 envelope: PASS');
})().catch(error => { console.error(error); console.error('::error title=A10 V2 contract failure::' + String(error.stack || error.message || error).replace(/\r?\n/g, '%0A')); process.exitCode = 1; });

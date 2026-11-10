'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateEnvelopeMetadata, authorizeEnvelopeRelease } = require('../tools/digitaler-nachlass/key-envelope-contract-v2.cjs');
const sample = () => ({
  schemaVersion: 2,
  vaultId: 'vault_0123456789abcdef',
  heirUserId: '123e4567-e89b-42d3-a456-426614174000',
  keyId: 'key_0123456789abcdef',
  cipherSuite: 'HPKE-Base-X25519-HKDF-SHA256-AES-256-GCM',
  nonce: Buffer.alloc(12, 1).toString('base64url'),
  wrappedDek: Buffer.alloc(64, 2).toString('base64url'),
  associatedData: { schemaVersion: 2, vaultId: 'vault_0123456789abcdef',
    heirUserId: '123e4567-e89b-42d3-a456-426614174000', keyId: 'key_0123456789abcdef' }
});
test('accepts only proposed v2 envelope metadata shape', () => {
  assert.equal(validateEnvelopeMetadata(sample()), true);
});
test('rejects secret fields, unknown fields and invalid suite', () => {
  for (const update of [
    { masterKeyHex: 'a'.repeat(64) }, { dek: 'sensitive' }, { token: 'bearer' },
    { cipherSuite: 'AES-ECB' }, { wrappedDek: 'x' }, { nonce: 'wrong' }
  ]) assert.equal(validateEnvelopeMetadata({ ...sample(), ...update }), false);
});
test('binds associated data to vault, heir and key identifier', () => {
  for (const field of ['vaultId', 'heirUserId', 'keyId', 'schemaVersion']) {
    const item = sample();
    item.associatedData[field] = 'forged';
    assert.equal(validateEnvelopeMetadata(item), false);
  }
});
test('offline envelope release remains disabled for forged server claims', () => {
  assert.deepEqual(authorizeEnvelopeRelease({ role: 'admin', state: 'RELEASED' }),
    { allowed: false, code: 'release_not_configured' });
});

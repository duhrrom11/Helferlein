'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { wrapRecoveryKey, unwrapRecoveryKey } = require('../tools/digitaler-nachlass/recovery-offline-v2.cjs');
const vaultId = 'vault_0123456789abcdef', keyId = 'key_0123456789abcdef';
const passphrase = 'correct horse battery staple and another secret';
test('offline recovery roundtrip with independently random DEK', async () => {
  const dek = randomBytes(32);
  const envelope = await wrapRecoveryKey({ vaultId, keyId, dek, passphrase });
  assert.deepEqual(await unwrapRecoveryKey(envelope, passphrase, vaultId, keyId), dek);
  assert.equal(Object.values(envelope).includes(dek.toString('base64url')), false);
  assert.equal(JSON.stringify(envelope).includes(passphrase), false);
});
test('random salt and nonce prevent deterministic recovery envelopes', async () => {
  const dek = randomBytes(32);
  const a = await wrapRecoveryKey({ vaultId, keyId, dek, passphrase });
  const b = await wrapRecoveryKey({ vaultId, keyId, dek, passphrase });
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.nonce, b.nonce);
  assert.notEqual(a.ciphertext, b.ciphertext);
});
test('wrong passphrase, vault binding and key generation are rejected', async () => {
  const envelope = await wrapRecoveryKey({ vaultId, keyId, dek: randomBytes(32), passphrase });
  await assert.rejects(unwrapRecoveryKey(envelope, 'an entirely different recovery passphrase', vaultId, keyId), /recovery_failed/);
  await assert.rejects(unwrapRecoveryKey(envelope, passphrase, 'vault_9999999999999999', keyId), /invalid_recovery_envelope/);
  await assert.rejects(unwrapRecoveryKey(envelope, passphrase, vaultId, 'key_9999999999999999'), /invalid_recovery_envelope/);
});
test('tampering with ciphertext, nonce, tag and KDF metadata fails closed', async () => {
  const envelope = await wrapRecoveryKey({ vaultId, keyId, dek: randomBytes(32), passphrase });
  for (const field of ['ciphertext', 'nonce', 'tag', 'salt']) {
    const broken = { ...envelope, [field]: envelope[field].slice(0,-1) + (envelope[field].endsWith('A') ? 'B' : 'A') };
    await assert.rejects(unwrapRecoveryKey(broken, passphrase, vaultId, keyId));
  }
  await assert.rejects(unwrapRecoveryKey({ ...envelope, kdf: 'scrypt-N2' }, passphrase, vaultId, keyId), /invalid_recovery_envelope/);
  await assert.rejects(unwrapRecoveryKey({ ...envelope, plaintextKey: 'secret' }, passphrase, vaultId, keyId), /invalid_recovery_envelope/);
});
test('rejects weak passphrases and invalid DEK without modifying input', async () => {
  const dek = randomBytes(32);
  const copy = Buffer.from(dek);
  await assert.rejects(wrapRecoveryKey({ vaultId, keyId, dek, passphrase: 'short' }), /invalid_recovery_passphrase/);
  await assert.rejects(wrapRecoveryKey({ vaultId, keyId, dek: Buffer.alloc(16), passphrase }), /invalid_dek/);
  assert.deepEqual(dek, copy);
});

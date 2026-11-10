'use strict';
// Offline recovery prototype: password-based wrapping of a random 256-bit DEK.
// No database, network, heir release, deployment, or migration integration.
const { randomBytes, scrypt: scryptCallback, createCipheriv, createDecipheriv } = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(scryptCallback);
const VERSION = 2;
const KDF = 'scrypt-N16384-r8-p1';
const CIPHER = 'aes-256-gcm';
const N = 16384, r = 8, p = 1;
const MAX_MEMORY = 32 * 1024 * 1024;
const ID = /^[A-Za-z0-9_-]{16,128}$/;
const b64 = value => Buffer.from(value).toString('base64url');
function fromB64(value, size) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid_recovery_envelope');
  const bytes = Buffer.from(value, 'base64url');
  if (bytes.length !== size || b64(bytes) !== value) throw new Error('invalid_recovery_envelope');
  return bytes;
}
function checkPassphrase(value) {
  if (typeof value !== 'string' || value.length < 16 || value.length > 1024 ||
      Buffer.byteLength(value, 'utf8') > 4096) throw new Error('invalid_recovery_passphrase');
}
function aad(vaultId, keyId) {
  if (typeof vaultId !== 'string' || !ID.test(vaultId) ||
      typeof keyId !== 'string' || !ID.test(keyId)) throw new Error('invalid_recovery_identity');
  return Buffer.from(JSON.stringify(['helferlein-nachlass-recovery', VERSION, vaultId, keyId]), 'utf8');
}
async function derive(passphrase, salt) {
  return scrypt(passphrase, salt, 32, { N, r, p, maxmem: MAX_MEMORY });
}
async function wrapRecoveryKey({ vaultId, keyId, dek, passphrase }) {
  checkPassphrase(passphrase);
  const associatedData = aad(vaultId, keyId);
  if (!Buffer.isBuffer(dek) || dek.length !== 32) throw new Error('invalid_dek');
  const salt = randomBytes(32);
  const nonce = randomBytes(12);
  const key = await derive(passphrase, salt);
  try {
    const cipher = createCipheriv(CIPHER, key, nonce, { authTagLength: 16 });
    cipher.setAAD(associatedData);
    const ciphertext = Buffer.concat([cipher.update(dek), cipher.final()]);
    return Object.freeze({
      version: VERSION, kdf: KDF, cipher: CIPHER, vaultId, keyId,
      salt: b64(salt), nonce: b64(nonce), ciphertext: b64(ciphertext),
      tag: b64(cipher.getAuthTag())
    });
  } finally {
    key.fill(0);
  }
}
async function unwrapRecoveryKey(envelope, passphrase, expectedVaultId, expectedKeyId) {
  checkPassphrase(passphrase);
  const expectedAad = aad(expectedVaultId, expectedKeyId);
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
      Object.keys(envelope).sort().join(',') !==
      ['version','kdf','cipher','vaultId','keyId','salt','nonce','ciphertext','tag'].sort().join(',') ||
      envelope.version !== VERSION || envelope.kdf !== KDF || envelope.cipher !== CIPHER ||
      envelope.vaultId !== expectedVaultId || envelope.keyId !== expectedKeyId) {
    throw new Error('invalid_recovery_envelope');
  }
  const salt = fromB64(envelope.salt, 32);
  const nonce = fromB64(envelope.nonce, 12);
  const ciphertext = fromB64(envelope.ciphertext, 32);
  const tag = fromB64(envelope.tag, 16);
  const key = await derive(passphrase, salt);
  try {
    const decipher = createDecipheriv(CIPHER, key, nonce, { authTagLength: 16 });
    decipher.setAAD(expectedAad);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('recovery_failed');
  } finally {
    key.fill(0);
  }
}
module.exports = { wrapRecoveryKey, unwrapRecoveryKey };

'use strict';

// Offline schema validator for proposed v2 envelope metadata.
// Does not create keys, decrypt data, authorize release, or touch storage.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID = /^[A-Za-z0-9_-]{16,128}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;
function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function bytes(value, size) {
  if (typeof value !== 'string' || !B64URL.test(value)) return false;
  if (value.length !== Math.ceil(size * 8 / 6)) return false;
  try {
    const decoded = Buffer.from(value, 'base64url');
    return decoded.length === size && decoded.toString('base64url') === value;
  } catch { return false; }
}
const forbidden = new Set(['masterKeyHex', 'dek', 'plaintextKey', 'recoveryKey', 'privateKey', 'keyFragment', 'legacyKey', 'secret', 'token']);
function noSecretFields(value, depth = 0) {
  if (depth > 6 || !plainObject(value)) return false;
  return Object.entries(value).every(([key, field]) =>
    !forbidden.has(key) && (field === null || typeof field !== 'object' || noSecretFields(field, depth + 1)));
}
function validateEnvelopeMetadata(input) {
  if (!plainObject(input) || !noSecretFields(input)) return false;
  const required = ['schemaVersion', 'vaultId', 'heirUserId', 'keyId', 'cipherSuite', 'nonce', 'wrappedDek', 'associatedData'];
  if (Object.keys(input).length !== required.length || required.some(k => !Object.hasOwn(input, k))) return false;
  if (input.schemaVersion !== 2 || !ID.test(input.vaultId) || !UUID.test(input.heirUserId) ||
      !ID.test(input.keyId) || input.cipherSuite !== 'HPKE-Base-X25519-HKDF-SHA256-AES-256-GCM') return false;
  if (!bytes(input.nonce, 12) || typeof input.wrappedDek !== 'string' ||
      input.wrappedDek.length < 32 || input.wrappedDek.length > 8192 || !B64URL.test(input.wrappedDek)) return false;
  const ad = input.associatedData;
  return plainObject(ad) && Object.keys(ad).length === 4 &&
    ad.schemaVersion === 2 && ad.vaultId === input.vaultId &&
    ad.heirUserId === input.heirUserId && ad.keyId === input.keyId;
}
function authorizeEnvelopeRelease() {
  // Explicitly impossible offline; requires an audited server transaction.
  return Object.freeze({ allowed: false, code: 'release_not_configured' });
}
module.exports = { validateEnvelopeMetadata, authorizeEnvelopeRelease };

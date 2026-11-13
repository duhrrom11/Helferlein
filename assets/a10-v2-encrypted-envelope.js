/* A10 V2 encrypted envelope (isolated, not loaded by production).
 * No storage, migration, activation or cloud side effects.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10V2Envelope = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const enc = new TextEncoder();
  const dec = new TextDecoder('utf-8', { fatal: true });
  const ITERATIONS = 600000;
  const MAX = 1024 * 1024;
  const AAD = enc.encode('Helferlein:A10:vault-v2:envelope:1');
  const fail = () => { throw new Error('A10_V2_INVALID_OR_AUTH_FAILED'); };
  const b64 = bytes => {
    let out = '';
    for (const byte of bytes) out += String.fromCharCode(byte);
    return btoa(out);
  };
  function un64(value, size, max = size) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) fail();
    let bytes;
    try { bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0)); } catch (_) { fail(); }
    if (bytes.length < size || bytes.length > max || b64(bytes) !== value) fail();
    return bytes;
  }
  function passwordCheck(password) {
    if (typeof password !== 'string' || password.length < 16 || enc.encode(password).length > 1024) fail();
  }
  function validate(envelope) {
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
      Object.keys(envelope).sort().join(',') !== 'ciphertext,iterations,iv,kdf,salt,version' ||
      envelope.version !== 2 || envelope.kdf !== 'PBKDF2-SHA256' || envelope.iterations !== ITERATIONS) fail();
    return {
      salt: un64(envelope.salt, 16),
      iv: un64(envelope.iv, 12),
      ciphertext: un64(envelope.ciphertext, 17, MAX + 16)
    };
  }
  async function derive(password, salt, usage) {
    passwordCheck(password);
    const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt },
      material, { name: 'AES-GCM', length: 256 }, false, [usage]);
  }
  function validPayload(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
      typeof value.vaultId !== 'string' || !/^v_[A-Za-z0-9_-]{8,80}$/.test(value.vaultId) ||
      typeof value.masterKeyHex !== 'string' || !/^[0-9a-f]{64}$/i.test(value.masterKeyHex) ||
      !value.encryptedData || typeof value.encryptedData !== 'object' ||
      typeof value.encryptedData.iv !== 'string' || typeof value.encryptedData.ciphertext !== 'string') fail();
    un64(value.encryptedData.iv, 12);
    un64(value.encryptedData.ciphertext, 16, MAX);
    return value;
  }
  async function seal(payload, password, options) {
    if (!options || options.explicitConsent !== true) fail();
    validPayload(payload);
    const snapshot = JSON.stringify(payload);
    const bytes = enc.encode(snapshot);
    if (bytes.length > MAX) fail();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    try {
      const key = await derive(password, salt, 'encrypt');
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: AAD }, key, bytes));
      if (JSON.stringify(payload) !== snapshot) fail();
      return Object.freeze({
        version: 2, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS,
        salt: b64(salt), iv: b64(iv), ciphertext: b64(ciphertext)
      });
    } finally { bytes.fill(0); }
  }
  async function unlock(envelope, password, options) {
    if (!options || options.explicitConsent !== true) fail();
    const { salt, iv, ciphertext } = validate(envelope);
    let plaintext;
    try {
      const key = await derive(password, salt, 'decrypt');
      plaintext = new Uint8Array(await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, additionalData: AAD }, key, ciphertext));
      const payload = JSON.parse(dec.decode(plaintext));
      validPayload(payload);
      return structuredClone(payload); // caller must manage lifetime; never persisted by this module
    } catch (_) { fail(); }
    finally { if (plaintext) plaintext.fill(0); }
  }
  return Object.freeze({ seal, unlock, validate });
});

/* A10 experimental local key envelope v2. NOT wired to production vault flows.
 * Browser WebCrypto only. No localStorage, Supabase, Firebase or auto-migration.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10KeyEnvelopeV2 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const VERSION = 2;
    const ITERATIONS = 600000;
    const KEY_BYTES = 32;
    const SALT_BYTES = 16;
    const IV_BYTES = 12;
    const CIPHER_BYTES = KEY_BYTES + 16;
    const context = new TextEncoder().encode('Helferlein:A10:local-key-envelope:v2');
    function cryptoProvider() {
        const provider = globalThis.crypto;
        if (!provider || !provider.subtle || !provider.getRandomValues) throw new Error('WebCrypto erforderlich');
        return provider;
    }
    function validKey(key) {
        return typeof key === 'string' && /^[0-9a-f]{64}$/i.test(key);
    }
    function bytesToBase64(bytes) {
        if (typeof btoa !== 'function') throw new Error('Base64 nicht verfügbar');
        let binary = '';
        for (const value of bytes) binary += String.fromCharCode(value);
        return btoa(binary);
    }
    function base64ToBytes(value, expected) {
        if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('Ungültiges Base64');
        const decoded = Uint8Array.from(atob(value), c => c.charCodeAt(0));
        if (decoded.length !== expected || bytesToBase64(decoded) !== value) throw new Error('Ungültige Feldlänge');
        return decoded;
    }
    function validate(envelope) {
        if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
            Object.keys(envelope).sort().join(',') !== 'ciphertext,iterations,iv,kdf,salt,version' ||
            envelope.version !== VERSION || envelope.kdf !== 'PBKDF2-SHA256' ||
            envelope.iterations !== ITERATIONS) throw new Error('Unbekanntes Schlüsselformat');
        return {
            salt: base64ToBytes(envelope.salt, SALT_BYTES),
            iv: base64ToBytes(envelope.iv, IV_BYTES),
            ciphertext: base64ToBytes(envelope.ciphertext, CIPHER_BYTES)
        };
    }
    async function derive(password, salt, usage) {
        if (typeof password !== 'string' || password.length < 16) throw new Error('Passwort zu kurz');
        const provider = cryptoProvider();
        const base = await provider.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
        return provider.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
            base, { name: 'AES-GCM', length: 256 }, false, [usage]
        );
    }
    async function wrapKey(hexKey, password) {
        if (!validKey(hexKey)) throw new Error('Ungültiger Masterkey');
        const provider = cryptoProvider();
        const salt = provider.getRandomValues(new Uint8Array(SALT_BYTES));
        const iv = provider.getRandomValues(new Uint8Array(IV_BYTES));
        const raw = Uint8Array.from(hexKey.match(/.{2}/g), byte => parseInt(byte, 16));
        try {
            const wrappingKey = await derive(password, salt, 'encrypt');
            const encrypted = await provider.subtle.encrypt(
                { name: 'AES-GCM', iv, additionalData: context }, wrappingKey, raw
            );
            return Object.freeze({
                version: VERSION, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS,
                salt: bytesToBase64(salt), iv: bytesToBase64(iv),
                ciphertext: bytesToBase64(new Uint8Array(encrypted))
            });
        } finally {
            raw.fill(0);
        }
    }
    async function unwrapKey(envelope, password) {
        const fields = validate(envelope);
        const wrappingKey = await derive(password, fields.salt, 'decrypt');
        const raw = new Uint8Array(await cryptoProvider().subtle.decrypt(
            { name: 'AES-GCM', iv: fields.iv, additionalData: context },
            wrappingKey, fields.ciphertext
        ));
        try {
            if (raw.length !== KEY_BYTES) throw new Error('Ungültige Masterkeylänge');
            return Array.from(raw, b => b.toString(16).padStart(2, '0')).join('');
        } finally {
            raw.fill(0);
        }
    }
    return Object.freeze({ wrapKey, unwrapKey, validate });
});

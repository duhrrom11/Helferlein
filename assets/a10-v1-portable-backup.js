/* A10 experimental portable encrypted V1 backup; never imported by production.
 * Pure WebCrypto: no localStorage, cloud, IndexedDB, file writes or activation.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10V1Backup = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const ITERATIONS = 600000;
    const AAD = new TextEncoder().encode('Helferlein:A10:portable-v1-backup:v1');
    const encode = new TextEncoder();
    const decode = new TextDecoder('utf-8', { fatal: true });
    const fields = 'ciphertext,iterations,iv,kdf,salt,version';
    const maxBytes = 1024 * 1024;
    const b64 = bytes => {
        let text = '';
        for (const byte of bytes) text += String.fromCharCode(byte);
        return btoa(text);
    };
    function from64(text, min, max) {
        if (typeof text !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) throw new Error('A10_BACKUP_INVALID');
        const bytes = Uint8Array.from(atob(text), c => c.charCodeAt(0));
        if (bytes.length < min || bytes.length > max || b64(bytes) !== text) throw new Error('A10_BACKUP_INVALID');
        return bytes;
    }
    function validLegacy(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
            !/^v_[A-Za-z0-9_-]{8,80}$/.test(value.vaultId || '') ||
            typeof value.masterKeyHex !== 'string' || !/^[0-9a-f]{64}$/i.test(value.masterKeyHex) ||
            !value.encryptedData || typeof value.encryptedData !== 'object' ||
            typeof value.encryptedData.iv !== 'string' || typeof value.encryptedData.ciphertext !== 'string' ||
            typeof value.ownerName !== 'string' || typeof value.ownerEmail !== 'string' ||
            !Number.isInteger(value.checkInIntervalDays) || value.checkInIntervalDays < 1 ||
            value.checkInIntervalDays > 3650 || typeof value.lastCheckIn !== 'string' ||
            !Number.isFinite(Date.parse(value.lastCheckIn)) ||
            !Array.isArray(value.trustees) || !Array.isArray(value.alarmPersons)) throw new Error('A10_BACKUP_INVALID_LEGACY');
        from64(value.encryptedData.iv, 12, 12);
        from64(value.encryptedData.ciphertext, 16, maxBytes);
        return value;
    }
    function validateBackup(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
            Object.keys(value).sort().join(',') !== fields ||
            value.version !== 1 || value.kdf !== 'PBKDF2-SHA256' ||
            value.iterations !== ITERATIONS) throw new Error('A10_BACKUP_INVALID');
        return {
            salt: from64(value.salt, 16, 16),
            iv: from64(value.iv, 12, 12),
            ciphertext: from64(value.ciphertext, 16, maxBytes + 16)
        };
    }
    async function key(password, salt, usage) {
        if (typeof password !== 'string' || password.length < 16) throw new Error('A10_BACKUP_PASSWORD');
        const imported = await crypto.subtle.importKey('raw', encode.encode(password), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: ITERATIONS, salt },
            imported, { name: 'AES-GCM', length: 256 }, false, [usage]);
    }
    async function create(legacy, password) {
        validLegacy(legacy);
        const original = JSON.stringify(legacy);
        const plain = encode.encode(original);
        if (plain.byteLength > maxBytes) throw new Error('A10_BACKUP_TOO_LARGE');
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        try {
            const wrappingKey = await key(password, salt, 'encrypt');
            const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: AAD }, wrappingKey, plain);
            if (JSON.stringify(legacy) !== original) throw new Error('A10_BACKUP_CHANGED');
            return Object.freeze({ version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS,
                salt: b64(salt), iv: b64(iv), ciphertext: b64(new Uint8Array(encrypted)) });
        } finally { plain.fill(0); }
    }
    async function restore(backup, password) {
        const { salt, iv, ciphertext } = validateBackup(backup);
        const wrappingKey = await key(password, salt, 'decrypt');
        const decrypted = new Uint8Array(await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv, additionalData: AAD }, wrappingKey, ciphertext));
        try {
            const legacy = JSON.parse(decode.decode(decrypted));
            validLegacy(legacy);
            return structuredClone(legacy); // explicit caller-controlled recovery; no persistence
        } finally { decrypted.fill(0); }
    }
    return Object.freeze({ create, restore, validateBackup });
});

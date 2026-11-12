/* A10 isolated migration preflight. NEVER imported by production pages.
 * Pure in-memory preparation only; no storage, network, activation or deletion.
 */
(function (root, factory) {
    const api = factory(
        typeof module === 'object' && module.exports
            ? require('./a10-local-key-envelope-v2.js')
            : root.HelferleinA10KeyEnvelopeV2
    );
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10MigrationPreflight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (envelopes) {
    'use strict';
    const META_FIELDS = ['ownerName', 'ownerEmail', 'checkInIntervalDays', 'lastCheckIn', 'trustees', 'alarmPersons'];
    const encode = new TextEncoder();
    const decode = new TextDecoder();
    function keyFormat(key) { return typeof key === 'string' && /^[a-f0-9]{64}$/i.test(key); }
    function ciphertextShape(payload) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
            typeof payload.iv !== 'string' || typeof payload.ciphertext !== 'string') throw new Error('Ungültiger Ciphertext');
        const iv = Uint8Array.from(atob(payload.iv), c => c.charCodeAt(0));
        const data = Uint8Array.from(atob(payload.ciphertext), c => c.charCodeAt(0));
        if (iv.length !== 12 || data.length < 16) throw new Error('Ungültige Ciphertextlänge');
        return { iv, data };
    }
    async function aesKey(hex) {
        const raw = Uint8Array.from(hex.match(/.{2}/g), h => parseInt(h, 16));
        try { return await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
        finally { raw.fill(0); }
    }
    async function decrypt(payload, key) {
        const { iv, data } = ciphertextShape(payload);
        return JSON.parse(decode.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)));
    }
    async function encrypt(value, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const bytes = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encode.encode(JSON.stringify(value))));
        return { iv: btoa(String.fromCharCode(...iv)), ciphertext: btoa(String.fromCharCode(...bytes)) };
    }
    async function prepare(legacy, password) {
        if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy) ||
            !/^v_[A-Za-z0-9_-]{8,80}$/.test(legacy.vaultId || '') ||
            !keyFormat(legacy.masterKeyHex) || !legacy.encryptedData ||
            META_FIELDS.some(name => !Object.hasOwn(legacy, name)) ||
            typeof legacy.ownerName !== 'string' || typeof legacy.ownerEmail !== 'string' ||
            !Number.isInteger(legacy.checkInIntervalDays) || legacy.checkInIntervalDays < 1 ||
            legacy.checkInIntervalDays > 3650 || typeof legacy.lastCheckIn !== 'string' ||
            !Number.isFinite(Date.parse(legacy.lastCheckIn)) ||
            !Array.isArray(legacy.trustees) || !Array.isArray(legacy.alarmPersons) ||
            legacy.trustees.length > 100 || legacy.alarmPersons.length > 100) {
            throw new Error('Legacy-Tresor nicht migrationsfähig');
        }
        const original = JSON.stringify(legacy);
        const key = await aesKey(legacy.masterKeyHex);
        const entries = await decrypt(legacy.encryptedData, key);
        if (!entries || !Array.isArray(entries.entries)) throw new Error('Tresorinhalt ungültig');
        const metadata = Object.fromEntries(META_FIELDS.map(name => [name, legacy[name]]));
        const encryptedConfig = await encrypt(metadata, key);
        const recovered = await decrypt(encryptedConfig, key);
        if (JSON.stringify(recovered) !== JSON.stringify(metadata)) throw new Error('Metadaten-Roundtrip fehlgeschlagen');
        const keyEnvelope = await envelopes.wrapKey(legacy.masterKeyHex, password);
        if (await envelopes.unwrapKey(keyEnvelope, password) !== legacy.masterKeyHex.toLowerCase()) {
            throw new Error('Schlüssel-Roundtrip fehlgeschlagen');
        }
        if (JSON.stringify(legacy) !== original) throw new Error('Legacy-Tresor während Prüfung geändert');
        const staged = { formatVersion: 2, vaultId: legacy.vaultId, encryptedData: structuredClone(legacy.encryptedData), encryptedConfig, keyEnvelope };
        if (JSON.stringify(staged).includes(legacy.masterKeyHex)) throw new Error('Klartextschlüssel im Staging');
        return structuredClone(staged);
    }
    return Object.freeze({ prepare });
});

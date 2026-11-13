/* A10 experimental historical V1 normalization. NOT imported by production.
 * Read-only, explicit opt-in; never persists, deletes or activates a vault.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10HistoricalV1 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
    function reject() { throw new Error('A10_V1_UNSAFE_OR_UNSUPPORTED'); }
    function bytes64(text, min, max) {
        if (typeof text !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) reject();
        let bytes;
        try { bytes = Uint8Array.from(atob(text), x => x.charCodeAt(0)); } catch (_) { reject(); }
        let encoded = '';
        for (const byte of bytes) encoded += String.fromCharCode(byte);
        if (bytes.length < min || bytes.length > max || btoa(encoded) !== text) reject();
        return bytes;
    }
    function safeClone(record) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) reject();
        // JSON persisted V1 format: reject cycles, accessors, functions and unsupported values.
        let copy;
        try {
            const serialized = JSON.stringify(record);
            if (typeof serialized !== 'string' || serialized.length > 1400000) reject();
            copy = JSON.parse(serialized);
            if (JSON.stringify(copy) !== serialized) reject();
            if (Object.keys(record).some(key => {
                const desc = Object.getOwnPropertyDescriptor(record, key);
                return !desc || !own(desc, 'value');
            })) reject();
        } catch (_) { reject(); }
        return copy;
    }
    async function normalize(record, options) {
        if (!options || options.explicitConsent !== true) throw new Error('A10_V1_EXPLICIT_CONSENT_REQUIRED');
        const value = safeClone(record);
        if (!/^v_[A-Za-z0-9_-]{8,80}$/.test(value.vaultId || '') ||
            typeof value.masterKeyHex !== 'string' || !/^[0-9a-f]{64}$/i.test(value.masterKeyHex) ||
            !value.encryptedData || typeof value.encryptedData !== 'object' ||
            Array.isArray(value.encryptedData) ||
            Object.keys(value.encryptedData).sort().join(',') !== 'ciphertext,iv' ||
            typeof value.ownerName !== 'string' || typeof value.ownerEmail !== 'string' ||
            !Number.isInteger(value.checkInIntervalDays) || value.checkInIntervalDays < 1 ||
            value.checkInIntervalDays > 3650 || typeof value.lastCheckIn !== 'string' ||
            !Number.isFinite(Date.parse(value.lastCheckIn)) ||
            !Array.isArray(value.trustees) || value.trustees.length > 100) reject();
        const added = [];
        // Only known optional V1 field. Do not invent contacts, owners, check-ins or IDs.
        if (!own(value, 'alarmPersons')) {
            value.alarmPersons = [];
            added.push('alarmPersons');
        }
        for (const group of [value.trustees, value.alarmPersons]) {
            if (!Array.isArray(group) || group.length > 100 ||
                !group.every(person => person && typeof person === 'object' &&
                    !Array.isArray(person) && typeof person.name === 'string' &&
                    person.name.length <= 500)) reject();
        }
        const iv = bytes64(value.encryptedData.iv, 12, 12);
        const ciphertext = bytes64(value.encryptedData.ciphertext, 16, 1024 * 1024);
        const raw = Uint8Array.from(value.masterKeyHex.match(/.{2}/g), h => parseInt(h, 16));
        let decrypted;
        try {
            const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
            decrypted = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext));
            const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decrypted));
            if (!payload || typeof payload !== 'object' || !Array.isArray(payload.entries)) reject();
        } catch (_) { reject(); }
        finally {
            raw.fill(0);
            if (decrypted) decrypted.fill(0);
        }
        // Unknown top-level fields remain unchanged, including their original values.
        return Object.freeze({ normalized: structuredClone(value), added: Object.freeze(added) });
    }
    return Object.freeze({ normalize });
});

/* A10 isolated V2 recovery and rollback planning; NOT loaded by production.
 * Pure read-only recovery, pure rollback decision. No persistence, no activation.
 */
(function (root, factory) {
    const api = factory(
        typeof module === 'object' && module.exports
            ? require('./a10-local-key-envelope-v2.js')
            : root.HelferleinA10KeyEnvelopeV2
    );
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10RecoveryRollback = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (envelopes) {
    'use strict';
    const decode = new TextDecoder('utf-8', { fatal: true });
    const META_FIELDS = ['ownerName', 'ownerEmail', 'checkInIntervalDays', 'lastCheckIn', 'trustees', 'alarmPersons'];
    function assertRecord(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ungültiger Datensatz');
    }
    function base64Bytes(text, minimum, maximum) {
        if (typeof text !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(text)) throw new Error('Ungültiges Base64');
        const bytes = Uint8Array.from(atob(text), c => c.charCodeAt(0));
        if (bytes.length < minimum || bytes.length > maximum ||
            btoa(String.fromCharCode(...bytes)) !== text) throw new Error('Ungültige Ciphertextlänge');
        return bytes;
    }
    async function decrypt(payload, key) {
        assertRecord(payload);
        if (Object.keys(payload).sort().join(',') !== 'ciphertext,iv') throw new Error('Ungültiges Payloadformat');
        const iv = base64Bytes(payload.iv, 12, 12);
        const ciphertext = base64Bytes(payload.ciphertext, 16, 1024 * 1024);
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return JSON.parse(decode.decode(plain));
    }
    function validateConfig(config) {
        assertRecord(config);
        if (Object.keys(config).sort().join(',') !== [...META_FIELDS].sort().join(',') ||
            typeof config.ownerName !== 'string' || typeof config.ownerEmail !== 'string' ||
            !Number.isInteger(config.checkInIntervalDays) || config.checkInIntervalDays < 1 ||
            config.checkInIntervalDays > 3650 || typeof config.lastCheckIn !== 'string' ||
            !Number.isFinite(Date.parse(config.lastCheckIn)) ||
            !Array.isArray(config.trustees) || !Array.isArray(config.alarmPersons) ||
            config.trustees.length > 100 || config.alarmPersons.length > 100) {
            throw new Error('Ungültige entschlüsselte Konfiguration');
        }
    }
    async function recover(staged, password) {
        assertRecord(staged);
        if (Object.keys(staged).sort().join(',') !==
            'encryptedConfig,encryptedData,formatVersion,keyEnvelope,vaultId' ||
            staged.formatVersion !== 2 || !/^v_[A-Za-z0-9_-]{8,80}$/.test(staged.vaultId)) {
            throw new Error('Unbekanntes V2-Tresorformat');
        }
        const hex = await envelopes.unwrapKey(staged.keyEnvelope, password);
        const raw = Uint8Array.from(hex.match(/.{2}/g), h => parseInt(h, 16));
        let key;
        try { key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']); }
        finally { raw.fill(0); }
        const entries = await decrypt(staged.encryptedData, key);
        if (!entries || typeof entries !== 'object' || !Array.isArray(entries.entries)) {
            throw new Error('Ungültige Tresoreinträge');
        }
        const config = await decrypt(staged.encryptedConfig, key);
        validateConfig(config);
        return structuredClone({ vaultId: staged.vaultId, entries: entries.entries, config });
    }
    // Never returns an instruction to delete or overwrite V1.
    // A production storage protocol must later provide atomic CAS and durable recovery.
    function rollbackDecision(state) {
        assertRecord(state);
        if (Object.keys(state).sort().join(',') !== 'active,legacyIntact,stagingPresent' ||
            typeof state.legacyIntact !== 'boolean' ||
            typeof state.stagingPresent !== 'boolean' ||
            !['v1', 'v2', 'unknown'].includes(state.active)) {
            throw new Error('Unbekannter Migrationszustand');
        }
        if (!state.legacyIntact) return Object.freeze({ safe: false, action: 'STOP_AND_RECOVER_EXTERNALLY' });
        if (state.active !== 'v1') return Object.freeze({ safe: false, action: 'STOP_NO_AUTOMATIC_ROLLBACK' });
        return Object.freeze({ safe: true, action: state.stagingPresent ? 'KEEP_V1_IGNORE_STAGING' : 'KEEP_V1' });
    }
    return Object.freeze({ recover, rollbackDecision });
});

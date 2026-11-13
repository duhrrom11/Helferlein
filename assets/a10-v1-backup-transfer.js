/* A10 inactive encrypted V1 file transfer protocol. No DOM, I/O or storage writes.
 * Caller must explicitly confirm export and import; import is PREVIEW ONLY.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10BackupTransfer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const MAX_FILE_BYTES = 1500000;
    const enc = new TextEncoder();
    const dec = new TextDecoder('utf-8', { fatal: true });
    function fail(code) { throw new Error(code); }
    function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
    function jsonObject(text) {
        if (typeof text !== 'string' || enc.encode(text).length > MAX_FILE_BYTES) fail('A10_TRANSFER_FILE_INVALID');
        let value;
        try { value = JSON.parse(text); } catch (_) { fail('A10_TRANSFER_FILE_INVALID'); }
        if (!value || typeof value !== 'object' || Array.isArray(value)) fail('A10_TRANSFER_FILE_INVALID');
        return value;
    }
    function validateFile(file) {
        if (!file || typeof file !== 'object' || Array.isArray(file) ||
            Object.keys(file).sort().join(',') !== 'backup,format,version' ||
            file.format !== 'Helferlein-A10-Encrypted-V1' || file.version !== 1) fail('A10_TRANSFER_FILE_INVALID');
        const backup = globalThis.HelferleinA10V1Backup;
        if (!backup || typeof backup.validateBackup !== 'function') fail('A10_TRANSFER_DEPENDENCY_MISSING');
        backup.validateBackup(file.backup);
        return file;
    }
    async function exportFile(legacy, password, options) {
        if (!options || options.explicitConsent !== true) fail('A10_TRANSFER_EXPORT_CONFIRMATION_REQUIRED');
        const api = globalThis.HelferleinA10V1Backup;
        if (!api || typeof api.create !== 'function') fail('A10_TRANSFER_DEPENDENCY_MISSING');
        const envelope = await api.create(legacy, password);
        const text = JSON.stringify({ format: 'Helferlein-A10-Encrypted-V1', version: 1, backup: envelope });
        if (enc.encode(text).length > MAX_FILE_BYTES) fail('A10_TRANSFER_FILE_INVALID');
        return Object.freeze({ filename: 'helferlein-a10-v1-encrypted.json', mime: 'application/json', text });
    }
    async function previewImport(fileText, password, options) {
        if (!options || options.explicitConsent !== true) fail('A10_TRANSFER_IMPORT_CONFIRMATION_REQUIRED');
        // A destination with any existing data is a conflict: no overwrite, even with matching vault ID.
        if (!own(options, 'destinationEmpty') || options.destinationEmpty !== true ||
            !own(options, 'currentVaultId') || options.currentVaultId !== null) fail('A10_TRANSFER_DESTINATION_CONFLICT');
        if (typeof options.expectedVaultId !== 'string' ||
            !/^v_[A-Za-z0-9_-]{8,80}$/.test(options.expectedVaultId)) fail('A10_TRANSFER_EXPECTED_ID_REQUIRED');
        const file = validateFile(jsonObject(fileText));
        const api = globalThis.HelferleinA10V1Backup;
        const legacy = await api.restore(file.backup, password);
        if (legacy.vaultId !== options.expectedVaultId) fail('A10_TRANSFER_VAULT_ID_MISMATCH');
        const normalizer = globalThis.HelferleinA10HistoricalV1;
        if (!normalizer || typeof normalizer.normalize !== 'function') fail('A10_TRANSFER_DEPENDENCY_MISSING');
        const checked = await normalizer.normalize(legacy, { explicitConsent: true });
        // Caller receives only a detached preview. There is deliberately no commit/import API.
        return Object.freeze({ vaultId: legacy.vaultId, added: checked.added,
            preview: structuredClone(checked.normalized), requiresSeparateCommit: true });
    }
    return Object.freeze({ exportFile, previewImport, validateFile, MAX_FILE_BYTES });
});

/* A10 inactive encrypted V1 backup export/import preview. No file, storage or network writes.
 * Every action requires explicit consent. Import is a read-only decision, never a commit.
 */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10BackupTransfer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';
    const MAX_FILE_BYTES = 1500000;
    const own = (obj, name) => Object.prototype.hasOwnProperty.call(obj, name);
    const reject = name => { throw new Error(name); };
    const consent = options => {
        if (!options || options.explicitConsent !== true) reject('A10_TRANSFER_CONFIRMATION_REQUIRED');
    };
    function parseFile(text) {
        if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_FILE_BYTES) reject('A10_TRANSFER_FILE_INVALID');
        let parsed;
        try { parsed = JSON.parse(text); } catch (_) { reject('A10_TRANSFER_FILE_INVALID'); }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) reject('A10_TRANSFER_FILE_INVALID');
        return parsed;
    }
    function validateExisting(existing) {
        if (existing === null) return null;
        if (!existing || typeof existing !== 'object' || Array.isArray(existing) ||
            !/^v_[A-Za-z0-9_-]{8,80}$/.test(existing.vaultId || '')) reject('A10_TRANSFER_EXISTING_INVALID');
        return existing;
    }
    async function prepareExport(legacy, password, options) {
        consent(options);
        const backup = await root.HelferleinA10V1Backup.create(legacy, password);
        const fileText = JSON.stringify(backup);
        if (new TextEncoder().encode(fileText).length > MAX_FILE_BYTES) reject('A10_TRANSFER_FILE_TOO_LARGE');
        // No filesystem access: the caller may offer a download only after user confirmation.
        return Object.freeze({ fileText, filename: 'helferlein-a10-v1-encrypted-backup.json' });
    }
    async function previewImport(fileText, password, options) {
        consent(options);
        if (!options || typeof options.expectedVaultId !== 'string' ||
            !/^v_[A-Za-z0-9_-]{8,80}$/.test(options.expectedVaultId)) reject('A10_TRANSFER_EXPECTED_ID_REQUIRED');
        const existing = validateExisting(own(options, 'existing') ? options.existing : null);
        const parsed = parseFile(fileText);
        const restored = await root.HelferleinA10V1Backup.restore(parsed, password);
        if (restored.vaultId !== options.expectedVaultId) reject('A10_TRANSFER_FOREIGN_VAULT');
        if (existing) {
            if (existing.vaultId !== restored.vaultId) reject('A10_TRANSFER_EXISTING_ID_CONFLICT');
            // Even same-vault restores cannot silently overwrite an existing record.
            reject('A10_TRANSFER_EXISTING_VAULT_PROTECTED');
        }
        // Deliberately no persistence API; returning a separate copy is not an import.
        return Object.freeze({ decision: 'PREVIEW_ONLY_NO_WRITE', vaultId: restored.vaultId,
            recovered: structuredClone(restored) });
    }
    return Object.freeze({ prepareExport, previewImport });
});

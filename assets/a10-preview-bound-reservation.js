/* A10 isolated preview-bound import reservation. NOT loaded by production.
 * Re-authenticates the exact backup bytes immediately before an atomic empty-key reservation.
 * No import, no V1 modification, no activation.
 */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10PreviewBoundReservation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
    'use strict';
    const fail = code => { throw new Error(code); };
    const bytes = new TextEncoder();
    async function fingerprint(fileText) {
        if (typeof fileText !== 'string' || bytes.encode(fileText).byteLength > 1500000) fail('A10_BOUND_FILE_INVALID');
        const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes.encode(fileText)));
        return Array.from(hash, b => b.toString(16).padStart(2, '0')).join('');
    }
    function check(options) {
        if (!options || options.explicitConsent !== true) fail('A10_BOUND_CONFIRMATION_REQUIRED');
        if (typeof options.expectedVaultId !== 'string' ||
            !/^v_[A-Za-z0-9_-]{8,80}$/.test(options.expectedVaultId)) fail('A10_BOUND_ID_INVALID');
    }
    async function preview(fileText, password, options) {
        check(options);
        const digest = await fingerprint(fileText);
        const checked = await root.HelferleinA10BackupTransfer.previewImport(fileText, password, {
            explicitConsent: true, expectedVaultId: options.expectedVaultId, existing: null
        });
        if (checked.vaultId !== options.expectedVaultId || checked.decision !== 'PREVIEW_ONLY_NO_WRITE') fail('A10_BOUND_PREVIEW_INVALID');
        return Object.freeze({ vaultId: checked.vaultId, backupFingerprint: digest,
            decision: 'AUTHENTICATED_PREVIEW_NO_WRITE' });
    }
    async function reserveAfterPreview(driver, fileText, password, previousPreview, options) {
        check(options);
        if (!previousPreview || previousPreview.decision !== 'AUTHENTICATED_PREVIEW_NO_WRITE' ||
            previousPreview.vaultId !== options.expectedVaultId ||
            typeof previousPreview.backupFingerprint !== 'string' ||
            !/^[0-9a-f]{64}$/.test(previousPreview.backupFingerprint)) fail('A10_BOUND_PREVIEW_INVALID');
        const digest = await fingerprint(fileText);
        if (digest !== previousPreview.backupFingerprint) fail('A10_BOUND_FILE_CHANGED');
        // Re-authenticate password, file and expected ID; never trust an earlier preview alone.
        const fresh = await preview(fileText, password, options);
        if (fresh.backupFingerprint !== digest) fail('A10_BOUND_FILE_CHANGED');
        return root.HelferleinA10ImportReservation.reserve(driver, fresh.vaultId, {
            vaultId: fresh.vaultId, backupFingerprint: digest
        }, { explicitConsent: true });
    }
    return Object.freeze({ preview, reserveAfterPreview });
});

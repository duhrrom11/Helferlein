/* A10 isolated import reservation only. Never imports, decrypts, activates or deletes V1.
 * Atomic IndexedDB check+reservation, same-origin tabs; no production integration.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10ImportReservation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const reject = code => { throw new Error(code); };
    function validId(id) { return typeof id === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(id); }
    function validCandidate(candidate, key) {
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) ||
            Object.keys(candidate).sort().join(',') !== 'backupFingerprint,vaultId' ||
            candidate.vaultId !== key || typeof candidate.backupFingerprint !== 'string' ||
            !/^[0-9a-f]{64}$/.test(candidate.backupFingerprint)) reject('A10_IMPORT_CANDIDATE_INVALID');
    }
    function reserve(driver, vaultId, candidate, options) {
        if (!options || options.explicitConsent !== true) reject('A10_IMPORT_CONFIRMATION_REQUIRED');
        if (!driver || typeof driver.transact !== 'function' || !validId(vaultId)) reject('A10_IMPORT_DRIVER_INVALID');
        validCandidate(candidate, vaultId);
        // No preliminary read: conflict detection and reservation are in one readwrite transaction.
        return driver.transact(vaultId, current => {
            if (current !== undefined && current !== null) reject('A10_IMPORT_DESTINATION_OCCUPIED');
            return { format: 'A10_IMPORT_RESERVATION_ONLY', vaultId,
                backupFingerprint: candidate.backupFingerprint, revision: 0,
                status: 'RESERVED_NO_IMPORT', active: null };
        });
    }
    return Object.freeze({ reserve });
});

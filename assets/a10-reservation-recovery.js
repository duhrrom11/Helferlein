/* A10 isolated, read-only recovery classification. Never clears or resumes reservations.
 * No production integration, no writes, no activation.
 */
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10ReservationRecovery = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    'use strict';
    const id = value => typeof value === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(value);
    const invalid = () => { throw new Error('A10_RECOVERY_INVALID'); };
    function classify(value, vaultId) {
        if (!id(vaultId)) invalid();
        if (value === undefined || value === null) return Object.freeze({ decision: 'EMPTY_NO_RESERVATION', canAutoResume: false });
        if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
        if (value.format === 'A10_IMPORT_RESERVATION_ONLY') {
            if (Object.keys(value).sort().join(',') !== 'active,backupFingerprint,format,revision,status,vaultId' ||
                value.vaultId !== vaultId || value.status !== 'RESERVED_NO_IMPORT' ||
                value.active !== null || value.revision !== 0 ||
                typeof value.backupFingerprint !== 'string' ||
                !/^[0-9a-f]{64}$/.test(value.backupFingerprint)) invalid();
            return Object.freeze({ decision: 'ORPHANED_RESERVATION_MANUAL_REVIEW', canAutoResume: false,
                backupFingerprint: value.backupFingerprint });
        }
        if (value.active === 'v1' && value.legacy && value.legacy.vaultId === vaultId &&
            Number.isSafeInteger(value.revision) && value.revision >= 0)
            return Object.freeze({ decision: 'EXISTING_V1_KEEP_UNCHANGED', canAutoResume: false });
        invalid();
    }
    function inspect(indexedDB, dbName, vaultId) {
        if (!indexedDB || typeof indexedDB.open !== 'function' ||
            typeof dbName !== 'string' || !/^a10-isolated-[A-Za-z0-9_-]+$/.test(dbName) ||
            !id(vaultId)) invalid();
        // Read-only, and never create a missing DB or object store during recovery.
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);
            let missing = false;
            request.onupgradeneeded = () => {
                missing = true;
                request.transaction.abort();
            };
            request.onerror = () => {
                if (missing) resolve(classify(undefined, vaultId));
                else reject(request.error || new Error('A10_RECOVERY_OPEN_FAILED'));
            };
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('vaults')) {
                    db.close(); resolve(classify(undefined, vaultId)); return;
                }
                let value;
                const tx = db.transaction('vaults', 'readonly');
                const get = tx.objectStore('vaults').get(vaultId);
                get.onsuccess = () => { value = get.result; };
                tx.oncomplete = () => {
                    db.close();
                    try { resolve(classify(value, vaultId)); } catch (error) { reject(error); }
                };
                tx.onabort = () => { db.close(); reject(tx.error || new Error('A10_RECOVERY_READ_FAILED')); };
                tx.onerror = () => { db.close(); reject(tx.error || new Error('A10_RECOVERY_READ_FAILED')); };
            };
        });
    }
    return Object.freeze({ classify, inspect });
});

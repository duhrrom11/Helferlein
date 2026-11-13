/* A10 isolated manual orphan cleanup. Never imported by production.
 * Deletes ONLY an exact, explicitly confirmed reservation in one IndexedDB transaction.
 * No import, activation, V1 mutation, automatic cleanup, or cloud access.
 */
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10OrphanCleanup = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    'use strict';
    const fail = code => { throw new Error(code); };
    const validId = x => typeof x === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(x);
    const validHash = x => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);
    function isReservation(x, vaultId, hash) {
        return x && typeof x === 'object' && !Array.isArray(x) &&
            Object.keys(x).sort().join(',') === 'active,backupFingerprint,format,revision,status,vaultId' &&
            x.format === 'A10_IMPORT_RESERVATION_ONLY' && x.status === 'RESERVED_NO_IMPORT' &&
            x.active === null && x.revision === 0 && x.vaultId === vaultId &&
            x.backupFingerprint === hash;
    }
    function cleanup(indexedDB, dbName, vaultId, expectedFingerprint, options) {
        if (!options || options.explicitConsent !== true || options.confirmVaultId !== vaultId ||
            options.confirmFingerprint !== expectedFingerprint) fail('A10_CLEANUP_CONFIRMATION_REQUIRED');
        if (!indexedDB || typeof indexedDB.open !== 'function' ||
            typeof dbName !== 'string' || !/^a10-isolated-[A-Za-z0-9_-]+$/.test(dbName) ||
            !validId(vaultId) || !validHash(expectedFingerprint)) fail('A10_CLEANUP_INVALID');
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName);
            let missingDb = false;
            request.onupgradeneeded = () => {
                missingDb = true;
                request.transaction.abort(); // cleanup must never create a database
            };
            request.onerror = () => reject(new Error(missingDb ? 'A10_CLEANUP_NOT_FOUND' : 'A10_CLEANUP_OPEN_FAILED'));
            request.onsuccess = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('vaults')) {
                    db.close(); reject(new Error('A10_CLEANUP_NOT_FOUND')); return;
                }
                let done = false;
                const tx = db.transaction('vaults', 'readwrite');
                const store = tx.objectStore('vaults');
                const abort = error => {
                    if (!done) { done = true; reject(error); }
                    try { tx.abort(); } catch (_) { /* already inactive */ }
                };
                tx.onabort = () => {
                    db.close();
                    if (!done) { done = true; reject(tx.error || new Error('A10_CLEANUP_ABORT')); }
                };
                tx.onerror = () => {
                    if (!done) { done = true; reject(tx.error || new Error('A10_CLEANUP_FAILED')); }
                };
                tx.oncomplete = () => {
                    db.close();
                    if (!done) { done = true; resolve(Object.freeze({ decision: 'CONFIRMED_RESERVATION_CLEARED', vaultId })); }
                };
                const get = store.get(vaultId);
                get.onsuccess = () => {
                    if (!isReservation(get.result, vaultId, expectedFingerprint)) {
                        abort(new Error('A10_CLEANUP_CONFLICT')); return;
                    }
                    try { store.delete(vaultId); } catch (_) { abort(new Error('A10_CLEANUP_FAILED')); }
                };
                get.onerror = () => abort(new Error('A10_CLEANUP_READ_FAILED'));
            };
        });
    }
    return Object.freeze({ cleanup });
});

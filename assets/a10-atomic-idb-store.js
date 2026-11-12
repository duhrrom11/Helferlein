/* A10 experimental atomic migration store. NOT imported by any production page.
 * IndexedDB single-record readwrite transaction provides same-origin tab serialization.
 * No migration activation, no legacy deletion, no cloud access or automatic opening.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.HelferleinA10AtomicStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const clone = value => structuredClone(value);
    const conflict = () => { throw new Error('A10_REVISION_CONFLICT'); };
    function valid(state) {
        if (!state || typeof state !== 'object' || Array.isArray(state) ||
            Object.keys(state).sort().join(',') !== 'active,legacy,revision,staging' ||
            !Number.isSafeInteger(state.revision) || state.revision < 0 ||
            !state.legacy || typeof state.legacy !== 'object' ||
            typeof state.legacy.vaultId !== 'string' ||
            !['v1', 'v2'].includes(state.active) ||
            (state.staging !== null && (!state.staging || typeof state.staging !== 'object' ||
                state.staging.formatVersion !== 2 || state.staging.vaultId !== state.legacy.vaultId)) ||
            (state.active === 'v2' && state.staging === null)) throw new Error('A10_INVALID_STATE');
        return state;
    }
    function nextState(current, expectedRevision, action, candidate) {
        valid(current);
        if (!Number.isSafeInteger(expectedRevision) || current.revision !== expectedRevision ||
            expectedRevision === Number.MAX_SAFE_INTEGER) conflict();
        const next = clone(current);
        if (action === 'stage') {
            if (next.active !== 'v1' || next.staging !== null || !candidate ||
                candidate.formatVersion !== 2 || candidate.vaultId !== next.legacy.vaultId ||
                Object.hasOwn(candidate, 'masterKeyHex') || !candidate.encryptedConfig ||
                !candidate.encryptedData || !candidate.keyEnvelope) conflict();
            next.staging = clone(candidate);
        } else if (action === 'activate') {
            // Activation is a synthetic protocol operation only. Do not expose in production.
            if (next.active !== 'v1' || !next.staging || candidate !== true) conflict();
            next.active = 'v2';
        } else conflict();
        next.revision++;
        valid(next);
        if (JSON.stringify(next.legacy) !== JSON.stringify(current.legacy)) conflict();
        return next;
    }
    // Driver must execute read and write inside ONE serializable, atomic transaction.
    // It MUST reject the promise on abort, error or quota failure.
    async function commit(driver, key, expectedRevision, action, candidate) {
        if (!driver || typeof driver.transact !== 'function' ||
            typeof key !== 'string' || !/^v_[A-Za-z0-9_-]{8,80}$/.test(key)) throw new Error('A10_INVALID_DRIVER');
        return driver.transact(key, current => {
            if (!current || current.legacy.vaultId !== key) conflict();
            return nextState(current, expectedRevision, action, candidate);
        });
    }
    function requestPromise(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('A10_IDB_REQUEST_FAILED'));
        });
    }
    function indexedDbDriver(indexedDB, dbName) {
        if (!indexedDB || typeof indexedDB.open !== 'function' ||
            typeof dbName !== 'string' || !/^a10-isolated-[A-Za-z0-9_-]+$/.test(dbName)) {
            throw new Error('A10_INVALID_DRIVER');
        }
        async function open() {
            const request = indexedDB.open(dbName, 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains('vaults')) request.result.createObjectStore('vaults');
            };
            return requestPromise(request);
        }
        return Object.freeze({
            async transact(key, transform) {
                const db = await open();
                try {
                    return await new Promise((resolve, reject) => {
                        const tx = db.transaction('vaults', 'readwrite');
                        const store = tx.objectStore('vaults');
                        let result;
                        let settled = false;
                        const fail = error => {
                            if (!settled) { settled = true; reject(error || new Error('A10_IDB_ABORT')); }
                        };
                        tx.onabort = () => fail(tx.error);
                        tx.onerror = () => fail(tx.error);
                        tx.oncomplete = () => {
                            if (!settled) { settled = true; resolve(clone(result)); }
                        };
                        const get = store.get(key);
                        get.onsuccess = () => {
                            try {
                                result = transform(clone(get.result));
                                store.put(clone(result), key);
                            } catch (error) {
                                try { tx.abort(); } catch (_) { /* already inactive */ }
                                fail(error);
                            }
                        };
                        get.onerror = () => {
                            try { tx.abort(); } catch (_) { /* already inactive */ }
                            fail(get.error);
                        };
                    });
                } finally { db.close(); }
            }
        });
    }
    return Object.freeze({ nextState, commit, indexedDbDriver });
});

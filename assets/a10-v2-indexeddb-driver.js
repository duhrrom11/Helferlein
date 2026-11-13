/* A10 V2 dedicated IndexedDB staging adapter. ISOLATED; never loaded by production.
 * Database name must start a10-isolated-v2-; never opens the V1 database.
 * All callbacks are synchronous inside a single readwrite transaction.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10V2IndexedDB = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const reject = () => { throw new Error('A10_V2_IDB_REJECTED'); };
  const clone = value => value === undefined ? undefined : structuredClone(value);
  function driver(indexedDB, dbName) {
    if (!indexedDB || typeof indexedDB.open !== 'function' ||
        typeof dbName !== 'string' || !/^a10-isolated-v2-[A-Za-z0-9_-]{1,80}$/.test(dbName)) reject();
    const keyOk = key => typeof key === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(key);
    function open() {
      return new Promise((resolve, rejectOpen) => {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains('staged')) req.result.createObjectStore('staged');
        };
        req.onerror = () => rejectOpen(req.error || new Error('A10_V2_IDB_OPEN_FAILED'));
        req.onblocked = () => rejectOpen(new Error('A10_V2_IDB_BLOCKED'));
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('staged')) { db.close(); rejectOpen(new Error('A10_V2_IDB_SCHEMA')); }
          else resolve(db);
        };
      });
    }
    async function transact(key, transform) {
      if (!keyOk(key) || typeof transform !== 'function') reject();
      const db = await open();
      try {
        return await new Promise((resolve, rejectTx) => {
          let tx;
          try { tx = db.transaction('staged', 'readwrite'); }
          catch (error) { rejectTx(error); return; }
          let next;
          let done = false;
          const fail = error => { if (!done) { done = true; rejectTx(error || new Error('A10_V2_IDB_ABORT')); } };
          tx.onabort = () => fail(tx.error);
          tx.onerror = () => fail(tx.error);
          tx.oncomplete = () => { if (!done) { done = true; resolve(clone(next)); } };
          const get = tx.objectStore('staged').get(key);
          get.onerror = () => { try { tx.abort(); } catch (_) {} fail(get.error); };
          get.onsuccess = () => {
            try {
              next = transform(clone(get.result));
              if (!next || typeof next !== 'object' || Array.isArray(next) ||
                  next.vaultId !== key || next.format !== 'A10_V2_STAGING_ONLY' ||
                  next.status !== 'STAGED_NOT_ACTIVE' || next.active !== null ||
                  next.revision !== 0) reject();
              tx.objectStore('staged').put(clone(next), key);
            } catch (error) { try { tx.abort(); } catch (_) {} fail(error); }
          };
        });
      } finally { db.close(); }
    }
    async function read(key) {
      if (!keyOk(key)) reject();
      const db = await open();
      try {
        return await new Promise((resolve, rejectRead) => {
          const tx = db.transaction('staged', 'readonly');
          let result;
          tx.onabort = () => rejectRead(tx.error || new Error('A10_V2_IDB_ABORT'));
          tx.onerror = () => rejectRead(tx.error || new Error('A10_V2_IDB_READ_FAILED'));
          tx.oncomplete = () => resolve(clone(result));
          const req = tx.objectStore('staged').get(key);
          req.onsuccess = () => { result = req.result; };
          req.onerror = () => { try { tx.abort(); } catch (_) {} };
        });
      } finally { db.close(); }
    }
    return Object.freeze({ transact, read });
  }
  return Object.freeze({ driver });
});

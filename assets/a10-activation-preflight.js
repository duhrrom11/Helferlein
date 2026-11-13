/* A10 Gate 3 isolated atomic activation-preparation journal.
 * NO activation, V1 modification, cloud, deletion or production wiring.
 * Dedicated a10-isolated-v2-activation-* IndexedDB database only.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./a10-v2-encrypted-envelope.js') : root.HelferleinA10V2Envelope,
    typeof module === 'object' && module.exports
      ? require('./a10-staged-readback.js') : root.HelferleinA10StagedReadback
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10ActivationPreflight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (envelopeApi, readback) {
  'use strict';
  const fail = () => { throw new Error('A10_ACTIVATION_PREFLIGHT_REJECTED'); };
  const idOk = id => typeof id === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(id);
  const hashOk = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
  const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const digest = async envelope => hex(new Uint8Array(await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(JSON.stringify(envelope)))));
  const clone = value => value === undefined ? undefined : structuredClone(value);
  function journal(indexedDB, dbName) {
    if (!indexedDB || typeof indexedDB.open !== 'function' ||
        typeof dbName !== 'string' ||
        !/^a10-isolated-v2-activation-[A-Za-z0-9_-]{1,80}$/.test(dbName)) fail();
    function open() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('preflight'))
            request.result.createObjectStore('preflight');
        };
        request.onerror = () => reject(request.error || new Error('A10_JOURNAL_OPEN'));
        request.onblocked = () => reject(new Error('A10_JOURNAL_BLOCKED'));
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('preflight')) {
            db.close(); reject(new Error('A10_JOURNAL_SCHEMA'));
          } else resolve(db);
        };
      });
    }
    async function read(vaultId) {
      if (!idOk(vaultId)) fail();
      const db = await open();
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction('preflight', 'readonly');
          let value;
          tx.onabort = () => reject(tx.error || new Error('A10_JOURNAL_ABORT'));
          tx.onerror = () => reject(tx.error || new Error('A10_JOURNAL_READ'));
          tx.oncomplete = () => resolve(clone(value));
          tx.objectStore('preflight').get(vaultId).onsuccess = e => { value = e.target.result; };
        });
      } finally { db.close(); }
    }
    async function compareAndSwap(vaultId, expectedRevision, next) {
      if (!idOk(vaultId) || !Number.isSafeInteger(expectedRevision) ||
          expectedRevision < -1 || expectedRevision > 1 ||
          !next || next.vaultId !== vaultId || next.active !== false ||
          next.activationAllowed !== false || !hashOk(next.envelopeSha256) ||
          !['PREPARED_NOT_ACTIVE', 'ROLLED_BACK_NOT_ACTIVE'].includes(next.status) ||
          (next.status === 'PREPARED_NOT_ACTIVE' && (expectedRevision !== -1 || next.revision !== 0)) ||
          (next.status === 'ROLLED_BACK_NOT_ACTIVE' && (expectedRevision !== 0 || next.revision !== 1)))
        fail();
      const db = await open();
      try {
        return await new Promise((resolve, reject) => {
          const tx = db.transaction('preflight', 'readwrite');
          let committed;
          let settled = false;
          const failTx = error => { if (!settled) { settled = true; reject(error || new Error('A10_JOURNAL_ABORT')); } };
          tx.onabort = () => failTx(tx.error);
          tx.onerror = () => failTx(tx.error);
          tx.oncomplete = () => { if (!settled) { settled = true; resolve(clone(committed)); } };
          const store = tx.objectStore('preflight');
          const req = store.get(vaultId);
          req.onerror = () => { try { tx.abort(); } catch (_) {} };
          req.onsuccess = () => {
            try {
              const current = req.result;
              const actualRevision = current === undefined ? -1 : current.revision;
              if (actualRevision !== expectedRevision ||
                  (current && (current.active !== false || current.activationAllowed !== false ||
                    current.vaultId !== vaultId || !hashOk(current.envelopeSha256) ||
                    (expectedRevision === 0 && (current.status !== 'PREPARED_NOT_ACTIVE' ||
                      current.envelopeSha256 !== next.envelopeSha256))))) fail();
              committed = clone(next);
              store.put(committed, vaultId);
            } catch (_) { try { tx.abort(); } catch (_) {} failTx(new Error('A10_JOURNAL_CONFLICT')); }
          };
        });
      } finally { db.close(); }
    }
    return Object.freeze({ read, compareAndSwap });
  }
  async function prepare(stagingDriver, journalDriver, vaultId, envelope, password, options) {
    if (!idOk(vaultId) || options?.explicitConsent !== true ||
        options?.confirmIndependentBackup !== true ||
        options?.confirmStagingOnly !== true ||
        options?.confirmVaultId !== vaultId ||
        options?.confirmPrepareNotActivate !== true ||
        !stagingDriver || typeof stagingDriver.read !== 'function' ||
        !journalDriver || typeof journalDriver.compareAndSwap !== 'function' ||
        typeof journalDriver.read !== 'function') fail();
    // Persisted source must be independently authenticated before a journal write.
    const checked = await readback.verify(stagingDriver, vaultId, envelope, password, {
      explicitConsent: true, confirmStagingOnly: true, confirmVaultId: vaultId
    });
    if (checked.status !== 'PERSISTED_RECOVERY_VERIFIED_NOT_ACTIVE' || checked.active !== false) fail();
    const payload = await envelopeApi.unlock(envelope, password, { explicitConsent: true });
    if (payload.vaultId !== vaultId) fail();
    const envelopeSha256 = await digest(envelope);
    if (options.confirmEnvelopeSha256 !== envelopeSha256) fail();
    const next = { vaultId, envelopeSha256, revision: 0,
      status: 'PREPARED_NOT_ACTIVE', active: false, activationAllowed: false };
    return Object.freeze(await journalDriver.compareAndSwap(vaultId, -1, next));
  }
  async function rollback(stagingDriver, journalDriver, vaultId, envelope, password, options) {
    if (!idOk(vaultId) || options?.explicitConsent !== true ||
        options?.confirmVaultId !== vaultId || options?.confirmRollback !== true ||
        options?.confirmStagingOnly !== true ||
        !stagingDriver || typeof stagingDriver.read !== 'function' ||
        !journalDriver || typeof journalDriver.read !== 'function' ||
        typeof journalDriver.compareAndSwap !== 'function') fail();
    const previous = await journalDriver.read(vaultId);
    if (!previous || previous.status !== 'PREPARED_NOT_ACTIVE' ||
        previous.revision !== 0 || previous.active !== false ||
        previous.activationAllowed !== false) fail();
    const checked = await readback.verify(stagingDriver, vaultId, envelope, password, {
      explicitConsent: true, confirmStagingOnly: true, confirmVaultId: vaultId
    });
    if (checked.status !== 'PERSISTED_RECOVERY_VERIFIED_NOT_ACTIVE' ||
        previous.envelopeSha256 !== await digest(envelope)) fail();
    return Object.freeze(await journalDriver.compareAndSwap(vaultId, 0, {
      vaultId, envelopeSha256: previous.envelopeSha256, revision: 1,
      status: 'ROLLED_BACK_NOT_ACTIVE', active: false, activationAllowed: false
    }));
  }
  return Object.freeze({ journal, prepare, rollback });
});

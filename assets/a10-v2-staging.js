/* A10 V2 encrypted staging gate, isolated and NOT wired to production.
 * Driver must implement atomic transact(key, updater) over a dedicated staging store.
 * No V1 reads/writes, activation, migration, import or cloud side effects.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./a10-v2-encrypted-envelope.js')
      : root.HelferleinA10V2Envelope
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10V2Staging = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (envelopeApi) {
  'use strict';
  const fail = () => { throw new Error('A10_V2_STAGING_REJECTED'); };
  const validId = id => typeof id === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(id);
  const recordKeys = 'active,envelope,format,revision,status,vaultId';
  function validateRecord(record, vaultId) {
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        Object.keys(record).sort().join(',') !== recordKeys ||
        record.format !== 'A10_V2_STAGING_ONLY' || record.status !== 'STAGED_NOT_ACTIVE' ||
        record.active !== null || record.revision !== 0 || record.vaultId !== vaultId) fail();
    envelopeApi.validate(record.envelope);
    return record;
  }
  async function stage(driver, vaultId, envelope, password, options) {
    if (!options || options.explicitConsent !== true ||
        options.confirmVaultId !== vaultId || !validId(vaultId) ||
        !driver || typeof driver.transact !== 'function') fail();
    // Authentication and payload binding happen BEFORE the storage transaction.
    // Never pass a decrypted payload to the storage driver.
    const payload = await envelopeApi.unlock(envelope, password, { explicitConsent: true });
    if (payload.vaultId !== vaultId) fail();
    const snapshot = JSON.stringify(envelope);
    envelopeApi.validate(envelope);
    const sealed = JSON.parse(snapshot);
    const result = await driver.transact(vaultId, current => {
      if (current !== undefined && current !== null) fail();
      if (JSON.stringify(envelope) !== snapshot) fail();
      return { format: 'A10_V2_STAGING_ONLY', vaultId, revision: 0,
        status: 'STAGED_NOT_ACTIVE', active: null, envelope: sealed };
    });
    // The driver may return a record or only a transaction completion marker.
    if (result && typeof result === 'object' && 'format' in result) validateRecord(result, vaultId);
    return Object.freeze({ vaultId, status: 'STAGED_NOT_ACTIVE', active: false });
  }
  async function inspect(driver, vaultId) {
    if (!validId(vaultId) || !driver || typeof driver.read !== 'function') fail();
    const current = await driver.read(vaultId);
    if (current === null || current === undefined) return Object.freeze({ vaultId, status: 'EMPTY', active: false });
    validateRecord(current, vaultId);
    return Object.freeze({ vaultId, status: 'STAGED_NOT_ACTIVE', active: false });
  }
  return Object.freeze({ stage, inspect });
});

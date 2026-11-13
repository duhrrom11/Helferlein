/* A10 isolated persisted V2 staging readback gate. Never activates or modifies data.
 * Requires a separately read encrypted record and authenticates its envelope.
 * Not loaded by production.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./a10-v2-encrypted-envelope.js') : root.HelferleinA10V2Envelope
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10StagedReadback = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (envelopeApi) {
  'use strict';
  const fail = () => { throw new Error('A10_STAGED_READBACK_REJECTED'); };
  const validId = id => typeof id === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(id);
  async function verify(driver, vaultId, expectedEnvelope, password, options) {
    if (!options || options.explicitConsent !== true ||
        options.confirmStagingOnly !== true || options.confirmVaultId !== vaultId ||
        !validId(vaultId) || !driver || typeof driver.read !== 'function' ||
        typeof password !== 'string') fail();
    // Authenticate expected ciphertext before reading the persistent record.
    const expected = await envelopeApi.unlock(expectedEnvelope, password, { explicitConsent: true });
    if (expected.vaultId !== vaultId) fail();
    const record = await driver.read(vaultId);
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        Object.keys(record).sort().join(',') !== 'active,envelope,format,revision,status,vaultId' ||
        record.vaultId !== vaultId || record.format !== 'A10_V2_STAGING_ONLY' ||
        record.status !== 'STAGED_NOT_ACTIVE' || record.active !== null ||
        record.revision !== 0) fail();
    envelopeApi.validate(record.envelope);
    // Exact envelope equality prevents substitution with another valid ciphertext
    // for the same vault. The decrypted payload is never returned or stored.
    if (JSON.stringify(record.envelope) !== JSON.stringify(expectedEnvelope)) fail();
    const actual = await envelopeApi.unlock(record.envelope, password, { explicitConsent: true });
    if (JSON.stringify(actual) !== JSON.stringify(expected) || actual.vaultId !== vaultId) fail();
    return Object.freeze({ vaultId, status: 'PERSISTED_RECOVERY_VERIFIED_NOT_ACTIVE', active: false });
  }
  return Object.freeze({ verify });
});

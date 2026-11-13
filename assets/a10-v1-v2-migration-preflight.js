/* A10 isolated V1->V2 migration preflight. Never persists, activates, deletes or exports files.
 * Requires separate backup and V2 passwords; returns encrypted artifacts only.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./a10-historical-v1-normalizer.js') : root.HelferleinA10HistoricalV1,
    typeof module === 'object' && module.exports
      ? require('./a10-v1-portable-backup.js') : root.HelferleinA10V1Backup,
    typeof module === 'object' && module.exports
      ? require('./a10-v2-encrypted-envelope.js') : root.HelferleinA10V2Envelope
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10MigrationPreflight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (historical, backupApi, v2) {
  'use strict';
  const fail = () => { throw new Error('A10_MIGRATION_PREFLIGHT_REJECTED'); };
  const stable = value => JSON.stringify(value);
  function same(a, b) { return stable(a) === stable(b); }
  function optionsValid(options, vaultId) {
    if (!options || options.explicitConsent !== true || options.confirmVaultId !== vaultId ||
        options.confirmIndependentBackup !== true) fail();
  }
  async function prepare(legacy, backupPassword, v2Password, options) {
    if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) fail();
    optionsValid(options, legacy.vaultId);
    if (typeof backupPassword !== 'string' || typeof v2Password !== 'string' ||
        backupPassword === v2Password || backupPassword.length < 16 || v2Password.length < 16) fail();
    const original = structuredClone(legacy);
    const { normalized } = await historical.normalize(original, { explicitConsent: true });
    if (normalized.vaultId !== options.confirmVaultId) fail();
    // Preserve the original V1 bytes/fields in the independent encrypted backup.
    const backup = await backupApi.create(original, backupPassword);
    const restored = await backupApi.restore(backup, backupPassword);
    if (!same(restored, original)) fail();
    const envelope = await v2.seal(normalized, v2Password, { explicitConsent: true });
    const unlocked = await v2.unlock(envelope, v2Password, { explicitConsent: true });
    if (!same(unlocked, normalized)) fail();
    if (unlocked.vaultId !== restored.vaultId) fail();
    return Object.freeze({
      vaultId: original.vaultId, status: 'PREPARED_NOT_STAGED_NOT_ACTIVE',
      backup: Object.freeze(structuredClone(backup)),
      envelope: Object.freeze(structuredClone(envelope))
    });
  }
  async function verifyRecovery(artifacts, backupPassword, v2Password, options) {
    if (!artifacts || typeof artifacts !== 'object' || Array.isArray(artifacts) ||
        Object.keys(artifacts).sort().join(',') !== 'backup,envelope,status,vaultId' ||
        artifacts.status !== 'PREPARED_NOT_STAGED_NOT_ACTIVE') fail();
    optionsValid(options, artifacts.vaultId);
    if (backupPassword === v2Password) fail();
    const legacy = await backupApi.restore(artifacts.backup, backupPassword);
    const v2payload = await v2.unlock(artifacts.envelope, v2Password, { explicitConsent: true });
    if (legacy.vaultId !== artifacts.vaultId || v2payload.vaultId !== legacy.vaultId) fail();
    const { normalized } = await historical.normalize(legacy, { explicitConsent: true });
    if (!same(v2payload, normalized)) fail();
    // No decrypted secrets returned to caller; only explicit success signal.
    return Object.freeze({ vaultId: legacy.vaultId, status: 'RECOVERY_VERIFIED_NO_WRITE', active: false });
  }
  return Object.freeze({ prepare, verifyRecovery });
});

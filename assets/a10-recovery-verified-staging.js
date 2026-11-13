/* A10 isolated recovery-verified V2 staging gate. Not imported by production.
 * Verifies independent encrypted V1 recovery before staging an encrypted V2 envelope.
 * Never activates, deletes, or writes V1 data.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./a10-v1-v2-migration-preflight.js') : root.HelferleinA10MigrationPreflight,
    typeof module === 'object' && module.exports
      ? require('./a10-v2-staging.js') : root.HelferleinA10V2Staging
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10VerifiedStaging = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (migration, staging) {
  'use strict';
  const fail = () => { throw new Error('A10_RECOVERY_STAGING_REJECTED'); };
  async function stageVerified(driver, artifacts, backupPassword, v2Password, options) {
    if (!options || options.explicitConsent !== true ||
        options.confirmIndependentBackup !== true ||
        options.confirmVaultId !== artifacts?.vaultId ||
        options.confirmStagingOnly !== true ||
        typeof backupPassword !== 'string' || typeof v2Password !== 'string' ||
        backupPassword === v2Password) fail();
    // No write before independent backup recovery, V2 unlock and exact binding.
    const recovered = await migration.verifyRecovery(
      artifacts, backupPassword, v2Password, options);
    if (recovered.status !== 'RECOVERY_VERIFIED_NO_WRITE' ||
        recovered.vaultId !== artifacts.vaultId || recovered.active !== false) fail();
    // Staging re-authenticates the V2 envelope and enforces no-overwrite atomically.
    const staged = await staging.stage(driver, artifacts.vaultId, artifacts.envelope,
      v2Password, { explicitConsent: true, confirmVaultId: artifacts.vaultId });
    if (staged.status !== 'STAGED_NOT_ACTIVE' || staged.active !== false) fail();
    return Object.freeze({ vaultId: artifacts.vaultId,
      status: 'RECOVERY_VERIFIED_STAGED_NOT_ACTIVE', active: false });
  }
  return Object.freeze({ stageVerified });
});

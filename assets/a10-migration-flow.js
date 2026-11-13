/* A10 isolated functional V1 -> encrypted backup -> V2 staging -> authenticated readback.
 * NO production wiring, V1 writes, activation, cloud or deletion.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./a10-v1-v2-migration-preflight.js') : root.HelferleinA10MigrationPreflight,
    typeof module === 'object' && module.exports
      ? require('./a10-recovery-verified-staging.js') : root.HelferleinA10VerifiedStaging,
    typeof module === 'object' && module.exports
      ? require('./a10-staged-readback.js') : root.HelferleinA10StagedReadback
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10MigrationFlow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (preflight, staging, readback) {
  'use strict';
  const fail = () => { throw new Error('A10_MIGRATION_FLOW_REJECTED'); };
  async function prepareAndStage(driver, legacy, backupPassword, v2Password, options) {
    if (!options || options.explicitConsent !== true ||
        options.confirmIndependentBackup !== true ||
        options.confirmStagingOnly !== true ||
        options.confirmVaultId !== legacy?.vaultId ||
        !driver || typeof driver.read !== 'function' ||
        typeof driver.transact !== 'function') fail();
    const vaultId = legacy.vaultId;
    // Check destination before expensive KDFs; atomic staging still rejects a race.
    if ((await driver.read(vaultId)) != null) fail();
    const artifacts = await preflight.prepare(legacy, backupPassword, v2Password, options);
    const recovery = await preflight.verifyRecovery(
      artifacts, backupPassword, v2Password, options);
    if (recovery.status !== 'RECOVERY_VERIFIED_NO_WRITE' || recovery.vaultId !== vaultId) fail();
    await staging.stageVerified(driver, artifacts, backupPassword, v2Password, options);
    const verified = await readback.verify(driver, vaultId, artifacts.envelope,
      v2Password, options);
    if (verified.status !== 'PERSISTED_RECOVERY_VERIFIED_NOT_ACTIVE' ||
        verified.active !== false) fail();
    // Caller must separately export and retain backup before any future activation.
    return Object.freeze({
      vaultId, status: 'BACKUP_READY_V2_STAGED_VERIFIED_NOT_ACTIVE',
      active: false, backup: artifacts.backup
    });
  }
  return Object.freeze({ prepareAndStage });
});

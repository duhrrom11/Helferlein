/* A10 isolated encrypted backup FILE -> verified V2 staging gate.
 * No production wiring, V1 mutations, activation or Supabase access.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./a10-v1-portable-backup.js') : root.HelferleinA10V1Backup,
    typeof module === 'object' && module.exports
      ? require('./a10-recovery-verified-staging.js') : root.HelferleinA10VerifiedStaging
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10FileBoundStaging = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (backup, verified) {
  'use strict';
  const fail = () => { throw new Error('A10_FILE_BOUND_STAGING_REJECTED'); };
  const MAX_BYTES = 1500000;
  async function stageFromSelectedBackup(driver, file, artifacts, backupPassword, v2Password, options) {
    if (!options || options.explicitConsent !== true ||
        options.confirmIndependentBackup !== true || options.confirmStagingOnly !== true ||
        !artifacts || options.confirmVaultId !== artifacts.vaultId ||
        !file || file.name !== 'helferlein-a10-v1-encrypted-backup.json' ||
        typeof file.text !== 'function' || !Number.isSafeInteger(file.size) ||
        file.size < 1 || file.size > MAX_BYTES ||
        (file.type && file.type !== 'application/json' && file.type !== 'text/plain')) fail();
    // The selected file, not an in-memory backup, is the authoritative V1 recovery input.
    const raw = await file.text();
    if (typeof raw !== 'string' || new TextEncoder().encode(raw).length !== file.size) fail();
    let selected;
    try { selected = JSON.parse(raw); backup.validateBackup(selected); }
    catch (_) { fail(); }
    if (!artifacts.envelope || artifacts.status !== 'PREPARED_NOT_STAGED_NOT_ACTIVE') fail();
    // Explicitly discard the original in-memory backup: a mismatched selected file
    // must fail the normalized V1-to-V2 comparison before any write is attempted.
    return verified.stageVerified(driver, {
      vaultId: artifacts.vaultId,
      status: 'PREPARED_NOT_STAGED_NOT_ACTIVE',
      backup: selected,
      envelope: artifacts.envelope
    }, backupPassword, v2Password, options);
  }
  return Object.freeze({ stageFromSelectedBackup });
});

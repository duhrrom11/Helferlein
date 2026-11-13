/* A10 isolated exact-byte attestation -> recovery-verified encrypted staging.
 * Snapshot selected File once to avoid a verify/read race. No production wiring.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./a10-backup-file-integrity.js') : root.HelferleinA10BackupFileIntegrity,
    typeof module === 'object' && module.exports
      ? require('./a10-file-bound-recovery-staging.js') : root.HelferleinA10FileBoundStaging
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10AttestedFileStaging = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (integrity, fileBound) {
  'use strict';
  const fail = () => { throw new Error('A10_ATTESTED_FILE_STAGING_REJECTED'); };
  async function stageAttested(driver, file, attestation, artifacts,
    backupPassword, v2Password, options) {
    if (!options || options.explicitConsent !== true ||
        options.confirmIndependentStorage !== true ||
        options.confirmIndependentBackup !== true ||
        options.confirmStagingOnly !== true ||
        !file || typeof file.arrayBuffer !== 'function' ||
        !Number.isSafeInteger(file.size) || file.size < 1 || file.size > 1500000) fail();
    // Read the external file exactly once. Both the SHA-256 gate and cryptographic
    // recovery gate consume this same in-memory snapshot, not separate file reads.
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length !== file.size) fail();
    const snapshot = Object.freeze({
      name: file.name, type: file.type, size: bytes.length,
      arrayBuffer: async () => bytes.slice().buffer,
      text: async () => new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    });
    await integrity.verifySelectedFile(snapshot, attestation, options);
    return fileBound.stageFromSelectedBackup(driver, snapshot, artifacts,
      backupPassword, v2Password, options);
  }
  return Object.freeze({ stageAttested });
});

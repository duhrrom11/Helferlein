/* A10 Gate 2: isolated offline selected-file preview, deliberately not loaded
 * by the production vault page. No passwords, writes, migration or activation.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports
      ? require('./a10-backup-file-integrity.js') : root.HelferleinA10BackupFileIntegrity,
    typeof module === 'object' && module.exports
      ? require('./a10-v1-portable-backup.js') : root.HelferleinA10V1Backup
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10OfflinePreview = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (integrity, backup) {
  'use strict';
  const fail = () => { throw new Error('A10_PREVIEW_REJECTED'); };
  async function preview(backupFile, attestationFile, options) {
    if (!options || options.explicitConsent !== true ||
        options.confirmIndependentStorage !== true ||
        !attestationFile || typeof attestationFile.text !== 'function' ||
        !Number.isSafeInteger(attestationFile.size) ||
        attestationFile.size < 1 || attestationFile.size > 4096 ||
        attestationFile.name !== 'a10-backup-sha256-attestation.json') fail();
    let attestation;
    try { attestation = JSON.parse(await attestationFile.text()); }
    catch (_) { fail(); }
    const matched = await integrity.verifySelectedFile(backupFile, attestation, options);
    let selected;
    try {
      const raw = await backupFile.text();
      if (new TextEncoder().encode(raw).length !== backupFile.size) fail();
      selected = JSON.parse(raw);
      backup.validateBackup(selected);
    } catch (_) { fail(); }
    // Preview exposes only format and exact-file hash, never ciphertext or secrets.
    return Object.freeze({
      status: 'OFFLINE_ENCRYPTED_BACKUP_PREVIEW_ONLY_NO_WRITE',
      format: 'A10_ENCRYPTED_V1_BACKUP', bytes: matched.bytes,
      sha256: attestation.sha256, activationAllowed: false
    });
  }
  return Object.freeze({ preview });
});

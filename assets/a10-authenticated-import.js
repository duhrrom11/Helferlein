/* A10 functional gate: selected encrypted V1 file -> authenticated local preview
 * -> explicit confirmation -> isolated inactive V2 IndexedDB staging.
 * Never loaded by production. No V1 writes, cloud, deletion or activation.
 */
(function (root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('./a10-backup-file-integrity.js') : root.HelferleinA10BackupFileIntegrity,
    typeof module === 'object' && module.exports ? require('./a10-v1-portable-backup.js') : root.HelferleinA10V1Backup,
    typeof module === 'object' && module.exports ? require('./a10-historical-v1-normalizer.js') : root.HelferleinA10HistoricalV1,
    typeof module === 'object' && module.exports ? require('./a10-v2-encrypted-envelope.js') : root.HelferleinA10V2Envelope,
    typeof module === 'object' && module.exports ? require('./a10-v2-staging.js') : root.HelferleinA10V2Staging,
    typeof module === 'object' && module.exports ? require('./a10-staged-readback.js') : root.HelferleinA10StagedReadback
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10AuthenticatedImport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this,
  function (integrity, backupApi, historical, envelopeApi, staging, readback) {
    'use strict';
    const reject = () => { throw new Error('A10_AUTHENTICATED_IMPORT_REJECTED'); };
    const validId = id => typeof id === 'string' && /^v_[A-Za-z0-9_-]{8,80}$/.test(id);
    const required = options => options?.explicitConsent === true &&
      options?.confirmIndependentStorage === true && options?.confirmIndependentBackup === true &&
      options?.confirmStagingOnly === true;
    const sha256 = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      b => b.toString(16).padStart(2, '0')).join('');
    async function prepareSelectedFile(file, attestationFile, backupPassword, v2Password, options) {
      if (!required(options) || !file || !attestationFile ||
          typeof file.arrayBuffer !== 'function' || typeof attestationFile.arrayBuffer !== 'function' ||
          !Number.isSafeInteger(file.size) || file.size < 1 || file.size > 1500000 ||
          attestationFile.name !== 'a10-backup-sha256-attestation.json' ||
          !Number.isSafeInteger(attestationFile.size) || attestationFile.size < 1 ||
          attestationFile.size > 4096 || typeof backupPassword !== 'string' ||
          typeof v2Password !== 'string' || backupPassword === v2Password ||
          backupPassword.length < 16 || v2Password.length < 16) reject();
      // Snapshot both selected files once; verify and decrypt the same immutable bytes.
      const bytes = new Uint8Array(await file.arrayBuffer());
      const sidecar = new Uint8Array(await attestationFile.arrayBuffer());
      if (bytes.length !== file.size || sidecar.length !== attestationFile.size) reject();
      let attestation, encrypted;
      try {
        const decode = new TextDecoder('utf-8', { fatal: true });
        attestation = JSON.parse(decode.decode(sidecar));
        encrypted = JSON.parse(decode.decode(bytes));
      } catch (_) { reject(); }
      const snapshot = { name: file.name, type: file.type, size: bytes.length,
        arrayBuffer: async () => bytes.slice().buffer };
      await integrity.verifySelectedFile(snapshot, attestation, options);
      backupApi.validateBackup(encrypted);
      let legacy, normalized;
      try {
        legacy = await backupApi.restore(encrypted, backupPassword);
        normalized = (await historical.normalize(legacy, { explicitConsent: true })).normalized;
        if (!validId(legacy.vaultId) || legacy.vaultId !== normalized.vaultId ||
            options.confirmVaultId !== legacy.vaultId) reject();
        const envelope = await envelopeApi.seal(normalized, v2Password, { explicitConsent: true });
        const verified = await envelopeApi.unlock(envelope, v2Password, { explicitConsent: true });
        if (JSON.stringify(verified) !== JSON.stringify(normalized)) reject();
        return Object.freeze({
          status: 'AUTHENTICATED_LOCAL_PREVIEW_NO_WRITE', vaultId: legacy.vaultId,
          bytes: bytes.length, sha256: await sha256(bytes), envelope: Object.freeze(envelope),
          active: false
        });
      } finally {
        bytes.fill(0); sidecar.fill(0);
        legacy = undefined; normalized = undefined;
      }
    }
    async function confirmAndStage(driver, prepared, v2Password, options) {
      if (!required(options) || options.confirmStage !== true ||
          !prepared || Object.keys(prepared).sort().join(',') !==
            'active,bytes,envelope,sha256,status,vaultId' ||
          prepared.status !== 'AUTHENTICATED_LOCAL_PREVIEW_NO_WRITE' ||
          prepared.active !== false || !validId(prepared.vaultId) ||
          options.confirmVaultId !== prepared.vaultId ||
          options.confirmSha256 !== prepared.sha256 ||
          !/^[0-9a-f]{64}$/.test(prepared.sha256) ||
          !Number.isSafeInteger(prepared.bytes) || prepared.bytes < 1 ||
          prepared.bytes > 1500000 || !driver ||
          typeof driver.read !== 'function' || typeof driver.transact !== 'function') reject();
      // Authenticate again before the first write. The driver enforces atomic no-overwrite.
      const decrypted = await envelopeApi.unlock(prepared.envelope, v2Password, { explicitConsent: true });
      if (decrypted.vaultId !== prepared.vaultId) reject();
      if ((await driver.read(prepared.vaultId)) != null) reject();
      const staged = await staging.stage(driver, prepared.vaultId, prepared.envelope, v2Password,
        { explicitConsent: true, confirmVaultId: prepared.vaultId });
      if (staged.status !== 'STAGED_NOT_ACTIVE' || staged.active !== false) reject();
      const checked = await readback.verify(driver, prepared.vaultId, prepared.envelope,
        v2Password, { explicitConsent: true, confirmStagingOnly: true,
          confirmVaultId: prepared.vaultId });
      if (checked.status !== 'PERSISTED_RECOVERY_VERIFIED_NOT_ACTIVE' ||
          checked.active !== false) reject();
      return Object.freeze({ status: 'AUTHENTICATED_IMPORT_STAGED_NOT_ACTIVE',
        vaultId: prepared.vaultId, active: false, activationAllowed: false,
        sha256: prepared.sha256 });
    }
    return Object.freeze({ prepareSelectedFile, confirmAndStage });
  });

/* A10 Gate 2 consent-bound selected-file preview workflow.
 * Test-only isolated UI adapter. Production controls remain disabled.
 * No password, plaintext, storage, import, staging or activation.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10PreviewWorkflow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const fail = () => { throw new Error('A10_PREVIEW_UI_REJECTED'); };
  async function previewFromConsentUI(documentRef, previewService, options) {
    if (!documentRef || !previewService || typeof previewService.preview !== 'function' ||
        !options || options.explicitConsent !== true ||
        options.confirmIndependentStorage !== true ||
        options.isolatedSyntheticHarness !== true) fail();
    const panel = documentRef.getElementById('a10-migration-panel');
    const consent = documentRef.getElementById('a10-migration-consent');
    const backup = documentRef.getElementById('a10-backup-file');
    const attestation = documentRef.getElementById('a10-attestation-file');
    // The actual production panel is hardcoded disabled; a synthetic harness must
    // explicitly identify itself, not be inferred from caller options alone.
    if (!panel || panel.dataset.a10Release !== 'synthetic-preview-only' ||
        !consent || !consent.checked || !backup || !attestation ||
        backup.files?.length !== 1 || attestation.files?.length !== 1) fail();
    const result = await previewService.preview(backup.files[0], attestation.files[0], {
      explicitConsent: true, confirmIndependentStorage: true
    });
    if (result.status !== 'OFFLINE_ENCRYPTED_BACKUP_PREVIEW_ONLY_NO_WRITE' ||
        result.activationAllowed !== false) fail();
    return Object.freeze({ status: result.status, format: result.format,
      bytes: result.bytes, sha256: result.sha256, activationAllowed: false });
  }
  return Object.freeze({ previewFromConsentUI });
});

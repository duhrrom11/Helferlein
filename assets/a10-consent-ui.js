/* A10 Gate 2 consent-bound UI controller. Production release gate is hardcoded OFF.
 * No storage, cloud, V1 read, activation or import. Preview-only isolated mode
 * is available to synthetic tests, not to the production page.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10ConsentUI = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PRODUCTION_RELEASE_ENABLED = false;
  const fail = () => { throw new Error('A10_UI_NOT_RELEASED'); };
  function bind(documentRef, previewService, options) {
    const panel = documentRef?.getElementById('a10-migration-panel');
    if (!panel || panel.dataset.a10Release !== 'disabled') fail();
    const ids = ['a10-migration-consent', 'a10-backup-file', 'a10-attestation-file', 'a10-migration-preview',
      'a10-migration-stage', 'a10-migration-activate'];
    const elements = ids.map(id => documentRef.getElementById(id));
    if (elements.some(el => !el)) fail();
    // Fail closed even if the markup was accidentally edited to remove disabled.
    elements.forEach(el => { el.disabled = true; el.setAttribute('aria-disabled', 'true'); });
    const consent = documentRef.getElementById('a10-migration-consent');
    if (consent.checked) consent.checked = false;
    const status = documentRef.getElementById('a10-migration-status');
    if (status) status.textContent = 'A10 nicht freigegeben – kein Import, keine Aktivierung.';
    // No caller-supplied flag may override the production release decision.
    if (!PRODUCTION_RELEASE_ENABLED) {
      return Object.freeze({ status: 'A10_UI_DISABLED_NO_ACTIONS', enabled: false });
    }
    fail();
  }
  return Object.freeze({ bind });
});

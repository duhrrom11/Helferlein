/* A10 isolated browser-only encrypted V1 backup file handoff.
 * NOT loaded by production. No persistence, migration, cloud, or activation.
 * Download requires a caller-initiated user gesture; import is read-only.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10BackupFileHandoff = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  const MAX_BYTES = 1500000;
  const fail = () => { throw new Error('A10_FILE_HANDOFF_REJECTED'); };
  const consent = options => {
    if (!options || options.explicitConsent !== true ||
        options.confirmIndependentStorage !== true) fail();
  };
  function downloadPrepared(prepared, options) {
    consent(options);
    if (!prepared || typeof prepared !== 'object' ||
        prepared.filename !== 'helferlein-a10-v1-encrypted-backup.json' ||
        typeof prepared.fileText !== 'string' ||
        new TextEncoder().encode(prepared.fileText).length > MAX_BYTES) fail();
    // Check envelope shape before constructing a browser download.
    const parsed = JSON.parse(prepared.fileText);
    root.HelferleinA10V1Backup.validateBackup(parsed);
    if (!root.document || !root.URL || !root.Blob) fail();
    const blob = new Blob([prepared.fileText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = prepared.filename;
    anchor.hidden = true;
    try {
      document.body.appendChild(anchor);
      anchor.click();
      return Object.freeze({ status: 'DOWNLOAD_REQUESTED_NOT_VERIFIED', bytes: blob.size });
    } finally {
      anchor.remove();
      // Revoke on next task; do not revoke before the browser starts the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  async function previewSelectedFile(file, password, options) {
    consent(options);
    if (!file || typeof file.text !== 'function' ||
        typeof file.size !== 'number' || file.size < 1 || file.size > MAX_BYTES ||
        file.name !== 'helferlein-a10-v1-encrypted-backup.json' ||
        file.type && !['application/json', 'text/plain'].includes(file.type)) fail();
    const text = await file.text();
    if (new TextEncoder().encode(text).length !== file.size) fail();
    return root.HelferleinA10BackupTransfer.previewImport(text, password, options);
  }
  return Object.freeze({ downloadPrepared, previewSelectedFile });
});

/* A10 isolated exact-byte backup file integrity gate.
 * Cryptographic SHA-256 attestation for a separately retained encrypted V1 file.
 * No storage, V1 writes, migration, activation or production wiring.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HelferleinA10BackupFileIntegrity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_BYTES = 1500000;
  const NAME = 'helferlein-a10-v1-encrypted-backup.json';
  const fail = () => { throw new Error('A10_BACKUP_FILE_INTEGRITY_REJECTED'); };
  function validOptions(options) {
    if (!options || options.explicitConsent !== true ||
        options.confirmIndependentStorage !== true) fail();
  }
  const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  async function digest(bytes) {
    return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  }
  function validBytes(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 1 || bytes.length > MAX_BYTES) fail();
  }
  async function attestExport(fileText, options) {
    validOptions(options);
    if (typeof fileText !== 'string') fail();
    const bytes = new TextEncoder().encode(fileText);
    validBytes(bytes);
    // A digest is not proof of durable storage; it is only an exact-byte comparison token.
    return Object.freeze({ filename: NAME, bytes: bytes.length,
      sha256: await digest(bytes), status: 'EXPORT_BYTES_ATTESTED_NOT_STORED' });
  }
  async function verifySelectedFile(file, attestation, options) {
    validOptions(options);
    if (!file || file.name !== NAME || typeof file.arrayBuffer !== 'function' ||
        !Number.isSafeInteger(file.size) || file.size < 1 || file.size > MAX_BYTES ||
        (file.type && !['application/json', 'text/plain'].includes(file.type)) ||
        !attestation || Object.keys(attestation).sort().join(',') !==
          'bytes,filename,sha256,status' ||
        attestation.filename !== NAME || attestation.status !== 'EXPORT_BYTES_ATTESTED_NOT_STORED' ||
        attestation.bytes !== file.size || typeof attestation.sha256 !== 'string' ||
        !/^[0-9a-f]{64}$/.test(attestation.sha256)) fail();
    const bytes = new Uint8Array(await file.arrayBuffer());
    validBytes(bytes);
    if (bytes.length !== file.size || await digest(bytes) !== attestation.sha256) fail();
    return Object.freeze({ filename: NAME, bytes: bytes.length,
      status: 'SELECTED_FILE_BYTES_MATCH_EXPORT_NO_WRITE' });
  }
  return Object.freeze({ attestExport, verifySelectedFile });
});

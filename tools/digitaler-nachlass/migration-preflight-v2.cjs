'use strict';

// Read-only migration preflight. No key material is returned, transformed or persisted.
// This is not an encryptor, a migration runner, or a release authorization.
const HEX_256 = /^[a-f0-9]{64}$/i;
const VAULT_ID = /^v_[A-Za-z0-9_-]{8,128}$/;
const PERSON_ID = /^[A-Za-z0-9_-]{1,128}$/;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const fail = code => Object.freeze({ eligible: false, code, mode: 'legacy_read_only', requiresOwnerOptIn: true });
function assessLegacyVault(input) {
  if (!isObject(input)) return fail('invalid_vault');
  if (!VAULT_ID.test(input.vaultId || '')) return fail('invalid_vault_id');
  if (!HEX_256.test(input.masterKeyHex || '')) return fail('invalid_legacy_key');
  if (!isObject(input.encryptedData) ||
      typeof input.encryptedData.iv !== 'string' || !input.encryptedData.iv ||
      typeof input.encryptedData.ciphertext !== 'string' || !input.encryptedData.ciphertext) {
    return fail('invalid_ciphertext');
  }
  if (!Array.isArray(input.alarmPersons)) return fail('missing_heir_inventory');
  if (input.alarmPersons.length > 100) return fail('too_many_heirs');
  const ids = new Set();
  for (const person of input.alarmPersons) {
    if (!isObject(person) || typeof person.id !== 'string' || !PERSON_ID.test(person.id) || ids.has(person.id)) {
      return fail('invalid_or_duplicate_heir');
    }
    ids.add(person.id);
  }
  // Never include names, emails, keys, ciphertext, or existing URL fragments.
  return Object.freeze({
    eligible: true, code: 'preflight_only', mode: 'legacy_read_only',
    requiresOwnerOptIn: true, requiresIndependentRecovery: true,
    requiresServerSecurityReview: true, vaultId: input.vaultId, heirCount: ids.size
  });
}
function decideMigrationGate(input) {
  // No browser-supplied booleans can unlock a migration.
  // A separate reviewed server process must implement each gate and the transaction.
  return Object.freeze({ allowed: false, code: 'migration_disabled', requiresOwnerOptIn: true });
}
module.exports = { assessLegacyVault, decideMigrationGate };

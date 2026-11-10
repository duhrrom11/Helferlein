'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assessLegacyVault, decideMigrationGate } = require('../tools/digitaler-nachlass/migration-preflight-v2.cjs');
const fixture = () => ({
  vaultId: 'v_legacy123456',
  masterKeyHex: 'a'.repeat(64),
  encryptedData: { iv: 'not-a-real-iv', ciphertext: 'not-real-data' },
  alarmPersons: [{ id: 'heir_1', name: 'Private Name', contact: 'private@example.org' }]
});
test('preflight reports only structural readiness, never secrets or personal data', () => {
  const result = assessLegacyVault(fixture());
  assert.equal(result.eligible, true);
  assert.equal(result.mode, 'legacy_read_only');
  assert.equal(result.requiresOwnerOptIn, true);
  assert.equal(result.heirCount, 1);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /aaaaaa|Private Name|private@example|not-real/);
});
test('rejects malformed legacy keys, ciphertext and IDs', () => {
  for (const change of [
    { masterKeyHex: 'invalid' },
    { encryptedData: {} },
    { vaultId: '../other' },
    { alarmPersons: null },
    { alarmPersons: [{ id: 'bad/id' }] },
    { alarmPersons: [{ id: 'same' }, { id: 'same' }] }
  ]) {
    assert.equal(assessLegacyVault({ ...fixture(), ...change }).eligible, false);
  }
});
test('migration remains disabled even with forged readiness and owner claims', () => {
  for (const input of [null, {}, { actorId: 'trusted-server', ownerConfirmed: true,
    firebaseRulesReviewed: true, backupVerified: true, migrationEnabled: true }]) {
    assert.deepEqual(decideMigrationGate(input), {
      allowed: false, code: 'migration_disabled', requiresOwnerOptIn: true
    });
  }
});
test('preflight never mutates legacy configuration', () => {
  const original = fixture();
  const before = JSON.stringify(original);
  assessLegacyVault(original);
  assert.equal(JSON.stringify(original), before);
});

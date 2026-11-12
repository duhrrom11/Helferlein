'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { initial, stage, activate, recoverAfterCrash } = require('../assets/a10-migration-protocol.js');
const legacy = { vaultId: 'v_synthetic123', masterKeyHex: 'ca'.repeat(32), encryptedData: { iv: 'synthetic' } };
const candidate = {
    formatVersion: 2, vaultId: legacy.vaultId,
    encryptedData: { iv: 'synthetic' }, encryptedConfig: { iv: 'synthetic' },
    keyEnvelope: { version: 2 }
};
test('staging preserves original V1 and active marker, interruption remains on V1', () => {
    const start = initial(legacy);
    const before = JSON.stringify(start);
    const staged = stage(start, 0, candidate);
    assert.equal(JSON.stringify(start), before);
    assert.equal(staged.active, 'v1');
    assert.equal(staged.revision, 1);
    assert.deepEqual(staged.legacy, legacy);
    assert.deepEqual(recoverAfterCrash(staged), { action: 'KEEP_V1_IGNORE_STAGING', revision: 1 });
    assert.deepEqual(recoverAfterCrash(JSON.parse(JSON.stringify(staged))),
        { action: 'KEEP_V1_IGNORE_STAGING', revision: 1 });
});
test('activation requires explicit simulated gate and exact revision; V1 fallback intact', () => {
    const staged = stage(initial(legacy), 0, candidate);
    assert.throws(() => activate(staged, 1, false));
    assert.throws(() => activate(staged, 0, true));
    const active = activate(staged, 1, true);
    assert.equal(active.active, 'v2');
    assert.equal(active.revision, 2);
    assert.deepEqual(active.legacy, legacy);
    assert.deepEqual(recoverAfterCrash(active), { action: 'KEEP_V2_NO_AUTOMATIC_ROLLBACK', revision: 2 });
    assert.equal(staged.active, 'v1');
});
test('conflicting writes, mismatched vaults, malformed and stale state fail closed', () => {
    const start = initial(legacy);
    assert.throws(() => stage(start, 1, candidate));
    assert.throws(() => stage(start, 0, { ...candidate, vaultId: 'v_other' }));
    assert.throws(() => stage(start, 0, { ...candidate, masterKeyHex: legacy.masterKeyHex }));
    const staged = stage(start, 0, candidate);
    assert.throws(() => stage(staged, 1, candidate));
    assert.throws(() => stage(staged, 0, candidate));
    assert.throws(() => activate(start, 0, true));
    assert.throws(() => recoverAfterCrash({ ...staged, active: 'v2', staging: null }));
    assert.throws(() => recoverAfterCrash({ ...staged, revision: -1 }));
    assert.deepEqual(start.legacy, legacy);
});
test('mutating returned states or input candidates cannot alter prior snapshots', () => {
    const start = initial(legacy);
    const staged = stage(start, 0, candidate);
    staged.legacy.vaultId = 'v_changed';
    staged.staging.vaultId = 'v_changed';
    assert.deepEqual(start.legacy, legacy);
    assert.equal(candidate.vaultId, legacy.vaultId);
});

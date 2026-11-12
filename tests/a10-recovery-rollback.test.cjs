'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { prepare } = require('../assets/a10-migration-preflight.js');
const { recover, rollbackDecision } = require('../assets/a10-recovery-rollback.js');
const password = 'synthetic-only-recovery-passphrase';
const keyHex = 'ab'.repeat(32);
async function syntheticLegacy() {
    const key = await crypto.subtle.importKey('raw', Uint8Array.from(keyHex.match(/.{2}/g), x => parseInt(x, 16)), 'AES-GCM', false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const entries = [{ id: 'synthetic-entry', title: 'synthetic sample' }];
    const bytes = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ entries })));
    const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));
    return {
        vaultId: 'v_synthetic123456', masterKeyHex: keyHex,
        encryptedData: { iv: b64(iv), ciphertext: b64(bytes) },
        ownerName: 'synthetic owner', ownerEmail: 'synthetic@example.invalid',
        checkInIntervalDays: 30, lastCheckIn: '2026-01-01T00:00:00.000Z',
        trustees: [{ name: 'synthetic trustee' }], alarmPersons: [{ name: 'synthetic alarm' }]
    };
}
test('synthetic device-change roundtrip with serialized V2 data, no source mutation', async () => {
    const legacy = await syntheticLegacy();
    const original = JSON.stringify(legacy);
    const staged = await prepare(legacy, password);
    const transferred = JSON.parse(JSON.stringify(staged));
    const restored = await recover(transferred, password);
    assert.equal(restored.vaultId, legacy.vaultId);
    assert.deepEqual(restored.entries, [{ id: 'synthetic-entry', title: 'synthetic sample' }]);
    assert.equal(restored.config.ownerName, legacy.ownerName);
    assert.deepEqual(restored.config.trustees, legacy.trustees);
    assert.deepEqual(restored.config.alarmPersons, legacy.alarmPersons);
    assert.equal(JSON.stringify(legacy), original);
    assert.equal(JSON.stringify(transferred).includes(keyHex), false);
    assert.equal(JSON.stringify(transferred).includes('synthetic trustee'), false);
});
test('wrong password, corrupt ciphertext and altered config fail closed', async () => {
    const staged = await prepare(await syntheticLegacy(), password);
    const snapshot = JSON.stringify(staged);
    await assert.rejects(recover(staged, 'incorrect-synthetic-password'));
    for (const field of ['encryptedData', 'encryptedConfig']) {
        const corrupted = structuredClone(staged);
        corrupted[field].ciphertext = 'AA' + corrupted[field].ciphertext.slice(2);
        await assert.rejects(recover(corrupted, password));
    }
    for (const change of [
        { formatVersion: 1 }, { vaultId: 'wrong' }, { extra: 'unexpected' },
        { encryptedConfig: { iv: 'AAAA', ciphertext: 'AAAA' } }
    ]) {
        await assert.rejects(recover({ ...staged, ...change }, password));
    }
    assert.equal(JSON.stringify(staged), snapshot);
});
test('interrupted migration never deletes or overwrites V1', () => {
    assert.deepEqual(rollbackDecision({ active: 'v1', legacyIntact: true, stagingPresent: false }),
        { safe: true, action: 'KEEP_V1' });
    assert.deepEqual(rollbackDecision({ active: 'v1', legacyIntact: true, stagingPresent: true }),
        { safe: true, action: 'KEEP_V1_IGNORE_STAGING' });
    for (const active of ['v2', 'unknown']) {
        assert.deepEqual(rollbackDecision({ active, legacyIntact: true, stagingPresent: true }),
            { safe: false, action: 'STOP_NO_AUTOMATIC_ROLLBACK' });
    }
    assert.deepEqual(rollbackDecision({ active: 'v1', legacyIntact: false, stagingPresent: true }),
        { safe: false, action: 'STOP_AND_RECOVER_EXTERNALLY' });
    assert.throws(() => rollbackDecision({ active: 'v1', legacyIntact: true, stagingPresent: true, unexpected: true }));
});

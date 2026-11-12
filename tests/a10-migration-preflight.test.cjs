'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { prepare } = require('../assets/a10-migration-preflight.js');
const { unwrapKey } = require('../assets/a10-local-key-envelope-v2.js');
const keyHex = '4b'.repeat(32);
const password = 'synthetic-migration-password-only';
async function fixture() {
    const raw = Uint8Array.from(keyHex.match(/.{2}/g), x => parseInt(x, 16));
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
        new TextEncoder().encode(JSON.stringify({ entries: [{ id: 'synthetic', title: 'sample' }] })));
    const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
    return {
        vaultId: 'v_synthetic123456', masterKeyHex: keyHex,
        encryptedData: { iv: b64(iv), ciphertext: b64(encrypted) },
        ownerName: 'synthetic owner', ownerEmail: 'synthetic@example.invalid',
        checkInIntervalDays: 30, lastCheckIn: '2026-01-01T00:00:00.000Z',
        trustees: [{ name: 'synthetic contact' }], alarmPersons: []
    };
}
test('synthetic V1 to V2 preflight is memory-only, no key or metadata in staged output', async () => {
    const legacy = await fixture();
    const before = JSON.stringify(legacy);
    const staged = await prepare(legacy, password);
    assert.equal(JSON.stringify(legacy), before);
    assert.equal(staged.formatVersion, 2);
    assert.equal(staged.vaultId, legacy.vaultId);
    assert.deepEqual(staged.encryptedData, legacy.encryptedData);
    assert.equal(await unwrapKey(staged.keyEnvelope, password), keyHex);
    assert.equal(JSON.stringify(staged).includes(keyHex), false);
    assert.equal(JSON.stringify(staged).includes('synthetic owner'), false);
    assert.equal(JSON.stringify(staged).includes('synthetic contact'), false);
    assert.equal(Object.hasOwn(staged, 'masterKeyHex'), false);
    assert.equal(Object.hasOwn(staged, 'ownerName'), false);
});
test('wrong key and malformed legacy records fail without modifying input', async () => {
    const legacy = await fixture();
    const broken = structuredClone(legacy);
    broken.masterKeyHex = 'aa'.repeat(32);
    const snapshot = JSON.stringify(broken);
    await assert.rejects(prepare(broken, password));
    assert.equal(JSON.stringify(broken), snapshot);
    for (const invalid of [
        { ...legacy, vaultId: 'wrong' },
        { ...legacy, encryptedData: { iv: 'AAAA', ciphertext: 'AAAA' } },
        { ...legacy, trustees: null },
        { ...legacy, checkInIntervalDays: 0 }
    ]) {
        const before = JSON.stringify(invalid);
        await assert.rejects(prepare(invalid, password));
        assert.equal(JSON.stringify(invalid), before);
    }
});
test('short password rejects migration without touching legacy data', async () => {
    const legacy = await fixture();
    const snapshot = JSON.stringify(legacy);
    await assert.rejects(prepare(legacy, 'short'));
    assert.equal(JSON.stringify(legacy), snapshot);
});

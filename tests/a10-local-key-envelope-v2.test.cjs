'use strict';
// Isolated synthetic-only tests; never touches localStorage or network.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { wrapKey, unwrapKey, validate } = require(path.join(__dirname, '../assets/a10-local-key-envelope-v2.js'));
const key = 'a4'.repeat(32);
const password = 'synthetic-test-password-not-real';
test('v2 synthetic roundtrip, random salt and IV, no raw key serialized', async () => {
    const first = await wrapKey(key, password);
    const second = await wrapKey(key, password);
    assert.equal(first.version, 2);
    assert.notEqual(first.salt, second.salt);
    assert.notEqual(first.iv, second.iv);
    assert.equal(await unwrapKey(first, password), key);
    assert.equal(await unwrapKey(second, password), key);
    assert.equal(JSON.stringify(first).includes(key), false);
    assert.equal(Object.hasOwn(first, 'masterKeyHex'), false);
});
test('v2 rejects wrong password and tampered ciphertext', async () => {
    const envelope = await wrapKey(key, password);
    await assert.rejects(unwrapKey(envelope, 'different-synthetic-password'));
    const altered = { ...envelope, ciphertext: envelope.ciphertext.replace(/^./, envelope.ciphertext[0] === 'A' ? 'B' : 'A') };
    await assert.rejects(unwrapKey(altered, password));
});
test('v2 rejects malformed and unsupported envelopes before KDF', async () => {
    const envelope = await wrapKey(key, password);
    for (const change of [
        { version: 1 }, { version: 3 }, { iterations: 1 }, { kdf: 'none' },
        { salt: '' }, { iv: 'a' }, { ciphertext: 'AAAA' }, { masterKeyHex: key }
    ]) {
        assert.throws(() => validate({ ...envelope, ...change }));
    }
    await assert.rejects(wrapKey('bad', password));
    await assert.rejects(wrapKey(key, 'short'));
    await assert.rejects(unwrapKey(envelope, 'short'));
});
test('v1 legacy data remains untouched and unsupported by v2 reader', async () => {
    const legacy = { vaultId: 'v_synthetic', masterKeyHex: key, encryptedData: { iv: 'synthetic', ciphertext: 'synthetic' } };
    const before = JSON.stringify(legacy);
    assert.throws(() => validate(legacy));
    assert.equal(JSON.stringify(legacy), before);
});

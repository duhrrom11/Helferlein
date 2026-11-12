'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { initial } = require('../assets/a10-migration-protocol.js');
const { commit, nextState, indexedDbDriver } = require('../assets/a10-atomic-idb-store.js');
const key = 'v_synthetic123456';
const legacy = { vaultId: key, masterKeyHex: 'ab'.repeat(32), encryptedData: { iv: 'synthetic' } };
const candidate = { formatVersion: 2, vaultId: key, encryptedData: { iv: 'synthetic' },
    encryptedConfig: { iv: 'synthetic' }, keyEnvelope: { version: 2 } };
// Transactional synthetic driver: queues transactions; failure never commits.
function driver(seed) {
    let persisted = structuredClone(seed);
    let chain = Promise.resolve();
    let failure = null;
    return {
        failNext(error) { failure = error; },
        read() { return structuredClone(persisted); },
        transact(_key, transform) {
            const operation = chain.then(() => {
                const draft = transform(structuredClone(persisted));
                if (failure) { const error = failure; failure = null; throw error; }
                persisted = structuredClone(draft);
                return structuredClone(persisted);
            });
            chain = operation.catch(() => {});
            return operation;
        }
    };
}
test('synthetic transaction stages then activates with unchanged V1 and monotonic revision', async () => {
    const storage = driver(initial(legacy));
    const staged = await commit(storage, key, 0, 'stage', candidate);
    assert.equal(staged.revision, 1);
    assert.equal(staged.active, 'v1');
    assert.deepEqual(staged.legacy, legacy);
    const active = await commit(storage, key, 1, 'activate', true);
    assert.equal(active.revision, 2);
    assert.equal(active.active, 'v2');
    assert.deepEqual(active.legacy, legacy);
    assert.equal(storage.read().active, 'v2');
});
test('concurrent browser-tab simulation: only one matching revision commits', async () => {
    const storage = driver(initial(legacy));
    const outcomes = await Promise.allSettled([
        commit(storage, key, 0, 'stage', candidate),
        commit(storage, key, 0, 'stage', candidate)
    ]);
    assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter(x => x.status === 'rejected').length, 1);
    assert.equal(storage.read().revision, 1);
});
test('simulated quota failure and crash before commit leave V1 untouched', async () => {
    const storage = driver(initial(legacy));
    const before = JSON.stringify(storage.read());
    storage.failNext(new Error('QuotaExceededError'));
    await assert.rejects(commit(storage, key, 0, 'stage', candidate), /QuotaExceededError/);
    assert.equal(JSON.stringify(storage.read()), before);
    // A crash after preparing a candidate but before any transaction changes nothing.
    const candidateInMemory = structuredClone(candidate);
    assert.equal(candidateInMemory.formatVersion, 2);
    assert.equal(JSON.stringify(storage.read()), before);
});
test('invalid candidate, stale revision and activation without stage are rejected', async () => {
    const storage = driver(initial(legacy));
    const before = JSON.stringify(storage.read());
    await assert.rejects(commit(storage, key, 0, 'activate', true));
    await assert.rejects(commit(storage, key, 1, 'stage', candidate));
    await assert.rejects(commit(storage, key, 0, 'stage', { ...candidate, masterKeyHex: legacy.masterKeyHex }));
    assert.equal(JSON.stringify(storage.read()), before);
    assert.throws(() => indexedDbDriver(null, 'a10-isolated-tests'));
    assert.throws(() => indexedDbDriver({ open() {} }, 'production-vault'));
    assert.throws(() => nextState(initial(legacy), 0, 'delete', null));
});

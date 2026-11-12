'use strict';
// A10 only: real Chromium persistent-profile restart and real IndexedDB abort tests.
// Synthetic localhost origin, temporary OS profile; never touches a production vault.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const vaultId = 'v_syntheticRestart123';
const legacy = { vaultId, masterKeyHex: 'b7'.repeat(32), encryptedData: { iv: 'synthetic-only' } };
const candidate = { formatVersion: 2, vaultId, encryptedData: { iv: 'synthetic' },
    encryptedConfig: { iv: 'synthetic' }, keyEnvelope: { version: 2 } };
const dbName = 'a10-isolated-restart-profile';
const script = path.resolve(__dirname, '../assets/a10-atomic-idb-store.js');
async function run() {
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-synthetic-chromium-'));
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
            res.end('<!doctype html><title>A10 synthetic persistent-profile test</title>');
        } else if (req.url === '/assets/a10-atomic-idb-store.js') {
            res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
            res.end(await fs.readFile(script));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    let context;
    async function start() {
        context = await chromium.launchPersistentContext(profile, { headless: true });
        const page = context.pages()[0] || await context.newPage();
        await page.goto(url);
        await page.addScriptTag({ url: '/assets/a10-atomic-idb-store.js' });
        return page;
    }
    async function read(page) {
        return page.evaluate(async ({ dbName, vaultId }) => {
            const req = indexedDB.open(dbName);
            const db = await new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            try {
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction('vaults', 'readonly');
                    const get = tx.objectStore('vaults').get(vaultId);
                    get.onsuccess = () => resolve(get.result);
                    get.onerror = () => reject(get.error);
                });
            } finally { db.close(); }
        }, { dbName, vaultId });
    }
    try {
        let page = await start();
        await page.evaluate(async ({ dbName, vaultId, legacy }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            await driver.transact(vaultId, () => ({
                active: 'v1', revision: 0, legacy, staging: null
            }));
        }, { dbName, vaultId, legacy });
        const baseline = await read(page);
        assert.equal(baseline.revision, 0);
        // Fault injection #1: exception from transform after reading.
        const transformFailure = await page.evaluate(async ({ dbName, vaultId }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            try {
                await driver.transact(vaultId, () => { throw new Error('A10_SYNTHETIC_WRITE_FAILURE'); });
                return false;
            } catch (error) { return error.message === 'A10_SYNTHETIC_WRITE_FAILURE'; }
        }, { dbName, vaultId });
        assert.equal(transformFailure, true);
        assert.deepEqual(await read(page), baseline);
        // Fault injection #2: actual IndexedDB put followed by transaction abort.
        const abortResult = await page.evaluate(async ({ dbName, vaultId }) => {
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open(dbName);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            try {
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction('vaults', 'readwrite');
                    const store = tx.objectStore('vaults');
                    const get = store.get(vaultId);
                    get.onsuccess = () => {
                        const modified = { ...get.result, revision: 999 };
                        const put = store.put(modified, vaultId);
                        put.onsuccess = () => tx.abort();
                    };
                    tx.onabort = () => resolve(true);
                    tx.onerror = () => reject(tx.error);
                    tx.oncomplete = () => resolve(false);
                });
            } finally { db.close(); }
        }, { dbName, vaultId });
        assert.equal(abortResult, true);
        assert.deepEqual(await read(page), baseline);
        // Successful stage is the only committed change.
        const staged = await page.evaluate(async ({ dbName, vaultId, candidate }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            return HelferleinA10AtomicStore.commit(driver, vaultId, 0, 'stage', candidate);
        }, { dbName, vaultId, candidate });
        assert.equal(staged.active, 'v1');
        assert.equal(staged.revision, 1);
        assert.deepEqual(staged.legacy, legacy);
        await context.close(); context = null;
        page = await start(); // Fresh Chromium process, SAME persistent OS profile.
        assert.deepEqual(await read(page), staged);
        // Revision conflict after restart cannot overwrite persisted stage.
        const stale = await page.evaluate(async ({ dbName, vaultId, candidate }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            try {
                await HelferleinA10AtomicStore.commit(driver, vaultId, 0, 'stage', candidate);
                return false;
            } catch (error) { return error.message === 'A10_REVISION_CONFLICT'; }
        }, { dbName, vaultId, candidate });
        assert.equal(stale, true);
        assert.deepEqual(await read(page), staged);
        // A second restart verifies the committed activation marker and unchanged V1.
        const activated = await page.evaluate(async ({ dbName, vaultId }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            return HelferleinA10AtomicStore.commit(driver, vaultId, 1, 'activate', true);
        }, { dbName, vaultId });
        assert.equal(activated.active, 'v2');
        assert.deepEqual(activated.legacy, legacy);
        await context.close(); context = null;
        page = await start();
        assert.deepEqual(await read(page), activated);
        console.log('PASS real Chromium persistent profile: restart x2, abort after put, transform error, stale CAS, V1 intact');
    } finally {
        if (context) await context.close();
        await new Promise(resolve => server.close(resolve));
        await fs.rm(profile, { recursive: true, force: true });
    }
}
run().catch(error => { console.error(error); process.exitCode = 1; });

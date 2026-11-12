'use strict';
// Real Chromium + IndexedDB with deterministic synthetic storage fault injection.
// No real quota exhaustion or disk-full operation; localhost and disposable profile only.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vaultId = 'v_syntheticQuota123';
const dbName = 'a10-isolated-quota-faults';
const legacy = { vaultId, masterKeyHex: 'ef'.repeat(32), encryptedData: { iv: 'synthetic' } };
const candidate = { formatVersion: 2, vaultId, encryptedData: { iv: 'synthetic' },
    encryptedConfig: { iv: 'synthetic' }, keyEnvelope: { version: 2 } };
async function main() {
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-quota-synthetic-'));
    const source = path.resolve(__dirname, '../assets/a10-atomic-idb-store.js');
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<!doctype html><title>A10 synthetic quota injection</title>');
        } else if (req.url === '/assets/a10-atomic-idb-store.js') {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(await fs.readFile(source));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    let browser;
    try {
        browser = await chromium.launchPersistentContext(profile, { headless: true });
        const page = browser.pages()[0] || await browser.newPage();
        await page.goto(url);
        await page.addScriptTag({ url: '/assets/a10-atomic-idb-store.js' });
        const test = await page.evaluate(async ({ dbName, vaultId, legacy, candidate }) => {
            const api = HelferleinA10AtomicStore;
            const driver = api.indexedDbDriver(indexedDB, dbName);
            const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
            const read = async () => {
                const open = indexedDB.open(dbName);
                const db = await new Promise((resolve, reject) => {
                    open.onsuccess = () => resolve(open.result);
                    open.onerror = () => reject(open.error);
                });
                try {
                    return await new Promise((resolve, reject) => {
                        const tx = db.transaction('vaults', 'readonly');
                        const get = tx.objectStore('vaults').get(vaultId);
                        get.onsuccess = () => resolve(get.result);
                        get.onerror = () => reject(get.error);
                    });
                } finally { db.close(); }
            };
            await driver.transact(vaultId, () => ({ active: 'v1', revision: 0, legacy, staging: null }));
            const initial = await read();
            const originalPut = IDBObjectStore.prototype.put;
            // Inject a browser-native QuotaExceededError exactly where the adapter calls put.
            // This tests adapter error handling, not real quota exhaustion.
            let quotaError = false;
            IDBObjectStore.prototype.put = function (...args) {
                IDBObjectStore.prototype.put = originalPut;
                throw new DOMException('A10 synthetic quota exceeded', 'QuotaExceededError');
            };
            try {
                await api.commit(driver, vaultId, 0, 'stage', candidate);
            } catch (error) { quotaError = error.name === 'QuotaExceededError'; }
            finally { IDBObjectStore.prototype.put = originalPut; }
            const afterQuota = await read();
            // Inject an asynchronous disk-like transaction abort AFTER a real put request succeeds.
            // Aborting the transaction rolls back its writes.
            const originalPut2 = IDBObjectStore.prototype.put;
            let injectedAbort = false;
            IDBObjectStore.prototype.put = function (...args) {
                const request = originalPut2.apply(this, args);
                IDBObjectStore.prototype.put = originalPut2;
                const tx = this.transaction;
                request.addEventListener('success', () => {
                    injectedAbort = true;
                    tx.abort();
                }, { once: true });
                return request;
            };
            let abortRejected = false;
            try { await api.commit(driver, vaultId, 0, 'stage', candidate); }
            catch (_) { abortRejected = true; }
            finally { IDBObjectStore.prototype.put = originalPut2; }
            const afterAbort = await read();
            const staged = await api.commit(driver, vaultId, 0, 'stage', candidate);
            // Once V2 marker is active, a failed write must preserve that marker and V1.
            const activated = await api.commit(driver, vaultId, 1, 'activate', true);
            let activeQuota = false;
            IDBObjectStore.prototype.put = function () {
                IDBObjectStore.prototype.put = originalPut;
                throw new DOMException('A10 synthetic quota exceeded', 'QuotaExceededError');
            };
            try {
                await driver.transact(vaultId, state => ({ ...state, revision: state.revision + 1 }));
            } catch (error) { activeQuota = error.name === 'QuotaExceededError'; }
            finally { IDBObjectStore.prototype.put = originalPut; }
            const afterActiveQuota = await read();
            return {
                quotaError, injectedAbort, abortRejected, activeQuota,
                initialPreserved: equal(initial, afterQuota) && equal(initial, afterAbort),
                stagedValid: staged.active === 'v1' && staged.revision === 1 && equal(staged.legacy, legacy),
                activePreserved: equal(activated, afterActiveQuota) &&
                    activated.active === 'v2' && equal(activated.legacy, legacy)
            };
        }, { dbName, vaultId, legacy, candidate });
        for (const [name, ok] of Object.entries(test)) assert.equal(ok, true, name + ': ' + JSON.stringify(test));
        await browser.close(); browser = null;
        browser = await chromium.launchPersistentContext(profile, { headless: true });
        const reopened = browser.pages()[0] || await browser.newPage();
        await reopened.goto(url);
        const recovered = await reopened.evaluate(async ({ dbName, vaultId }) => {
            const open = indexedDB.open(dbName);
            const db = await new Promise((resolve, reject) => {
                open.onsuccess = () => resolve(open.result);
                open.onerror = () => reject(open.error);
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
        assert.equal(recovered.active, 'v2');
        assert.equal(recovered.revision, 2);
        assert.deepEqual(recovered.legacy, legacy);
        console.log('PASS synthetic QuotaExceededError, real IDB abort after put, activation-marker and V1 preservation, restart');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(profile, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

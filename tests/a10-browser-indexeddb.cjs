'use strict';
// Real Chromium/IndexedDB integration tests. Only ephemeral localhost and synthetic records.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const fixture = {
    vaultId: 'v_syntheticBrowser123', masterKeyHex: 'ab'.repeat(32),
    encryptedData: { iv: 'synthetic' }
};
const candidate = {
    formatVersion: 2, vaultId: fixture.vaultId,
    encryptedData: { iv: 'synthetic' },
    encryptedConfig: { iv: 'synthetic' }, keyEnvelope: { version: 2 }
};
async function main() {
    const server = http.createServer((req, res) => {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        if (pathname !== '/' && pathname !== '/assets/a10-atomic-idb-store.js') {
            res.writeHead(404); res.end(); return;
        }
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', pathname === '/' ? 'text/html' : 'text/javascript');
        res.end(pathname === '/' ? '<!doctype html><title>A10 synthetic IndexedDB test</title>' :
            fs.readFileSync(path.join(root, 'assets/a10-atomic-idb-store.js')));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        const url = 'http://127.0.0.1:' + server.address().port;
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const pageA = await context.newPage();
        const pageB = await context.newPage();
        await Promise.all([pageA.goto(url), pageB.goto(url)]);
        await Promise.all([pageA.addScriptTag({ url: '/assets/a10-atomic-idb-store.js' }),
            pageB.addScriptTag({ url: '/assets/a10-atomic-idb-store.js' })]);
        const dbName = 'a10-isolated-browser-' + process.pid;
        async function seed() {
            return pageA.evaluate(async ({ dbName, fixture }) => {
                const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
                // Initial V1 seed is synthetic and occurs only in the isolated browser origin.
                await driver.transact(fixture.vaultId, () => ({
                    active: 'v1', revision: 0, legacy: structuredClone(fixture), staging: null
                }));
            }, { dbName, fixture });
        }
        async function read(page) {
            return page.evaluate(async ({ dbName, key }) => {
                const request = indexedDB.open(dbName);
                const db = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                try {
                    const tx = db.transaction('vaults', 'readonly');
                    return await new Promise((resolve, reject) => {
                        const req = tx.objectStore('vaults').get(key);
                        req.onsuccess = () => resolve(req.result);
                        req.onerror = () => reject(req.error);
                    });
                } finally { db.close(); }
            }, { dbName, key: fixture.vaultId });
        }
        await seed();
        const before = await read(pageB);
        assert.equal(before.active, 'v1');
        // Real IndexedDB abort: put is queued, then transaction explicitly aborted.
        const aborted = await pageA.evaluate(async ({ dbName, key, candidate }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            try {
                await driver.transact(key, current => {
                    const staged = HelferleinA10AtomicStore.nextState(current, 0, 'stage', candidate);
                    throw new Error('A10_SYNTHETIC_ABORT');
                });
                return false;
            } catch (error) { return error.message === 'A10_SYNTHETIC_ABORT'; }
        }, { dbName, key: fixture.vaultId, candidate });
        assert.equal(aborted, true);
        assert.deepEqual(await read(pageB), before);
        const results = await Promise.all([pageA, pageB].map(page =>
            page.evaluate(async ({ dbName, key, candidate }) => {
                const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
                try {
                    const value = await HelferleinA10AtomicStore.commit(driver, key, 0, 'stage', candidate);
                    return { ok: true, revision: value.revision };
                } catch (error) { return { ok: false, message: error.message }; }
            }, { dbName, key: fixture.vaultId, candidate })));
        assert.equal(results.filter(x => x.ok).length, 1, JSON.stringify(results));
        assert.equal(results.filter(x => !x.ok && x.message === 'A10_REVISION_CONFLICT').length, 1);
        const staged = await read(pageB);
        assert.equal(staged.revision, 1);
        assert.equal(staged.active, 'v1');
        assert.deepEqual(staged.legacy, fixture);
        await pageA.reload();
        await pageA.addScriptTag({ url: '/assets/a10-atomic-idb-store.js' });
        assert.deepEqual(await read(pageA), staged);
        // Simulated process interruption: close the entire browser context and reopen.
        await context.close();
        const reopened = await browser.newContext();
        const fresh = await reopened.newPage();
        await fresh.goto(url);
        // Separate browser context intentionally has isolated storage; don't claim
        // cross-context persistence. The reload above tests persistence within origin.
        assert.equal(await fresh.evaluate(() => indexedDB.databases().then(x => x.length)), 0);
        await reopened.close();
        console.log('PASS real Chromium IndexedDB: abort, two tabs, CAS, reload, unchanged V1');
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

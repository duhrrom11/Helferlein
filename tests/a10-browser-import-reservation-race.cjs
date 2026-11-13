'use strict';
// Synthetic localhost Chromium only. No real accounts, cloud, vaults or production DB.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
async function main() {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-import-race-'));
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<title>A10 synthetic race</title>'); return; }
        if (req.url === '/store.js' || req.url === '/reserve.js') {
            const filename = req.url === '/store.js' ? 'a10-atomic-idb-store.js' : 'a10-atomic-import-reservation.js';
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(await fs.readFile(path.resolve(__dirname, '../assets', filename))); return;
        }
        res.writeHead(404); res.end();
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    const vaultId = 'v_syntheticImportRace123';
    const dbName = 'a10-isolated-import-race-' + process.pid;
    const legacy = { vaultId, masterKeyHex: 'a5'.repeat(32), encryptedData: { iv: 'synthetic-v1' } };
    try {
        browser = await chromium.launchPersistentContext(path.join(dir, 'profile'), { headless: true });
        const a = browser.pages()[0] || await browser.newPage();
        const b = await browser.newPage();
        for (const page of [a, b]) {
            await page.goto('http://127.0.0.1:' + server.address().port);
            await page.addScriptTag({ url: '/store.js' });
            await page.addScriptTag({ url: '/reserve.js' });
        }
        const candidate = { vaultId, backupFingerprint: 'b7'.repeat(32) };
        const attempt = page => page.evaluate(async ({ dbName, vaultId, candidate }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            try {
                return { ok: true, value: await HelferleinA10ImportReservation.reserve(
                    driver, vaultId, candidate, { explicitConsent: true }) };
            } catch (error) { return { ok: false, code: error.message }; }
        }, { dbName, vaultId, candidate });
        const first = await Promise.all([attempt(a), attempt(b)]);
        assert.equal(first.filter(x => x.ok).length, 1, JSON.stringify(first));
        assert.equal(first.filter(x => x.code === 'A10_IMPORT_DESTINATION_OCCUPIED').length, 1);
        assert.equal(first.find(x => x.ok).value.status, 'RESERVED_NO_IMPORT');
        assert.equal(first.find(x => x.ok).value.active, null);
        const again = await attempt(b);
        assert.equal(again.code, 'A10_IMPORT_DESTINATION_OCCUPIED');
        // A reserved destination never silently overwrites even on the same fingerprint.
        const denied = await a.evaluate(async ({ dbName, vaultId, candidate }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            const reject = async (record, options) => {
                try { await HelferleinA10ImportReservation.reserve(driver, vaultId, record, options); return false; }
                catch (_) { return true; }
            };
            return {
                noConsent: await reject(candidate, {}),
                foreignId: await reject({ ...candidate, vaultId: 'v_foreignImport123' }, { explicitConsent: true }),
                malformedHash: await reject({ ...candidate, backupFingerprint: 'wrong' }, { explicitConsent: true })
            };
        }, { dbName, vaultId, candidate });
        assert.deepEqual(denied, { noConsent: true, foreignId: true, malformedHash: true });
        // Separate key: a pre-existing V1 record cannot be replaced by any import reservation.
        const existingKey = 'v_syntheticExistingV1';
        await a.evaluate(async ({ dbName, existingKey, legacy }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            await driver.transact(existingKey, () => ({
                active: 'v1', revision: 0, staging: null, legacy: { ...legacy, vaultId: existingKey }
            }));
        }, { dbName, existingKey, legacy });
        const before = await a.evaluate(async ({ dbName, existingKey }) => {
            const db = await new Promise((resolve, reject) => {
                const r = indexedDB.open(dbName); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
            });
            try {
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction('vaults', 'readonly');
                    const r = tx.objectStore('vaults').get(existingKey);
                    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
                });
            } finally { db.close(); }
        }, { dbName, existingKey });
        const occupied = await Promise.all([a, b].map(page => page.evaluate(async ({ dbName, existingKey }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            try {
                await HelferleinA10ImportReservation.reserve(driver, existingKey,
                    { vaultId: existingKey, backupFingerprint: 'c8'.repeat(32) }, { explicitConsent: true });
                return false;
            } catch (error) { return error.message === 'A10_IMPORT_DESTINATION_OCCUPIED'; }
        }, { dbName, existingKey })));
        assert.deepEqual(occupied, [true, true]);
        await a.reload();
        const after = await a.evaluate(async ({ dbName, existingKey }) => {
            const db = await new Promise((resolve, reject) => {
                const r = indexedDB.open(dbName); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
            });
            try {
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction('vaults', 'readonly');
                    const r = tx.objectStore('vaults').get(existingKey);
                    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
                });
            } finally { db.close(); }
        }, { dbName, existingKey });
        assert.deepEqual(after, before);
        assert.equal(after.active, 'v1');
        assert.deepEqual(after.legacy, { ...legacy, vaultId: existingKey });
        console.log('PASS A10 synthetic two-tab atomic import reservation race, fail-closed conflicts and immutable V1 fallback');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(dir, { recursive: true, force: true });
    }
}
main().catch(e => { console.error(e); process.exitCode = 1; });

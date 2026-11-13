'use strict';
// Synthetic localhost IndexedDB only. No real import, vault activation, cloud or production accounts.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
async function main() {
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-sim-commit-'));
    const scripts = { '/store.js': 'a10-atomic-idb-store.js', '/reserve.js': 'a10-atomic-import-reservation.js',
        '/commit.js': 'a10-simulated-import-commit.js' };
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<title>A10 synthetic commit</title>'); }
        else if (Object.hasOwn(scripts, req.url)) {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(await fs.readFile(path.resolve(__dirname, '../assets', scripts[req.url])));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    const dbName = 'a10-isolated-simcommit-' + process.pid;
    const vaultId = 'v_syntheticSimCommit123';
    const existingId = 'v_syntheticSimExistingV1';
    const changedId = 'v_syntheticSimChanged';
    const abortId = 'v_syntheticSimAbort123';
    const fingerprint = 'ab'.repeat(32);
    const otherFingerprint = 'cd'.repeat(32);
    const options = { explicitConsent: true, confirmVaultId: vaultId, confirmFingerprint: fingerprint };
    const legacy = { vaultId: existingId, masterKeyHex: 'ee'.repeat(32),
        encryptedData: { iv: 'synthetic-only' }, nested: { preserve: true } };
    const original = { active: 'v1', revision: 0, staging: null, legacy };
    try {
        browser = await chromium.launchPersistentContext(profile, { headless: true });
        const pages = [browser.pages()[0] || await browser.newPage(), await browser.newPage()];
        for (const page of pages) {
            await page.goto('http://127.0.0.1:' + server.address().port);
            for (const script of Object.keys(scripts)) await page.addScriptTag({ url: script });
        }
        await pages[0].evaluate(async ({ dbName, vaultId, existingId, changedId, abortId, fingerprint, otherFingerprint, original }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            await driver.transact(existingId, () => original);
            for (const [id, hash] of [[vaultId, fingerprint], [changedId, otherFingerprint], [abortId, fingerprint]]) {
                await HelferleinA10ImportReservation.reserve(driver, id,
                    { vaultId: id, backupFingerprint: hash }, { explicitConsent: true });
            }
        }, { dbName, vaultId, existingId, changedId, abortId, fingerprint, otherFingerprint, original });
        const negatives = await pages[0].evaluate(async ({ dbName, vaultId, existingId, changedId, fingerprint, options }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            const run = async (id, hash, opts) => {
                try { await HelferleinA10SimulatedImportCommit.commit(driver, id, hash, opts); return 'UNSAFE_ACCEPTED'; }
                catch (error) { return error.message; }
            };
            return {
                noConsent: await run(vaultId, fingerprint, { ...options, explicitConsent: false }),
                wrongConfirm: await run(vaultId, fingerprint, { ...options, confirmFingerprint: '00'.repeat(32) }),
                wrongHash: await run(changedId, fingerprint, { ...options, confirmVaultId: changedId }),
                occupiedV1: await run(existingId, fingerprint, { ...options, confirmVaultId: existingId }),
                invalidHash: await run(vaultId, 'invalid', { ...options, confirmFingerprint: 'invalid' })
            };
        }, { dbName, vaultId, existingId, changedId, fingerprint, options });
        assert.equal(negatives.noConsent, 'A10_SIM_COMMIT_CONFIRMATION_REQUIRED');
        assert.equal(negatives.wrongConfirm, 'A10_SIM_COMMIT_CONFIRMATION_REQUIRED');
        assert.equal(negatives.wrongHash, 'A10_SIM_COMMIT_CONFLICT');
        assert.equal(negatives.occupiedV1, 'A10_SIM_COMMIT_CONFLICT');
        assert.equal(negatives.invalidHash, 'A10_SIM_COMMIT_INVALID');
        // Aborted transaction must leave the exact reservation marker unchanged.
        const abortResult = await pages[0].evaluate(async ({ dbName, abortId, fingerprint }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            const before = await driver.transact(abortId, x => x);
            let failed = false;
            try { await driver.transact(abortId, () => { throw new Error('SYNTHETIC_ABORT'); }); }
            catch (error) { failed = error.message === 'SYNTHETIC_ABORT'; }
            const after = await driver.transact(abortId, x => x);
            return { failed, before, after };
        }, { dbName, abortId, fingerprint });
        assert.equal(abortResult.failed, true);
        assert.deepEqual(abortResult.after, abortResult.before);
        assert.equal(abortResult.after.status, 'RESERVED_NO_IMPORT');
        // Two real tabs compete for the same marker; one atomic commit, one conflict.
        const attempts = await Promise.all(pages.map(page => page.evaluate(async ({ dbName, vaultId, fingerprint, options }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            try {
                const value = await HelferleinA10SimulatedImportCommit.commit(driver, vaultId, fingerprint, options);
                return { ok: true, value };
            } catch (error) { return { ok: false, error: error.message }; }
        }, { dbName, vaultId, fingerprint, options })));
        assert.equal(attempts.filter(x => x.ok).length, 1, JSON.stringify(attempts));
        assert.equal(attempts.filter(x => x.error === 'A10_SIM_COMMIT_CONFLICT').length, 1);
        assert.deepEqual(attempts.find(x => x.ok).value, {
            format: 'A10_SIMULATED_IMPORT_COMMIT_ONLY', vaultId, backupFingerprint: fingerprint,
            revision: 1, status: 'SIMULATED_NO_DATA', active: null
        });
        await pages[0].reload();
        const persisted = await pages[0].evaluate(async ({ dbName, vaultId, existingId, changedId, abortId }) => {
            const req = indexedDB.open(dbName);
            const db = await new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
            try {
                const tx = db.transaction('vaults', 'readonly');
                const store = tx.objectStore('vaults');
                const get = key => new Promise((resolve, reject) => {
                    const r = store.get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
                });
                return { committed: await get(vaultId), existing: await get(existingId),
                    changed: await get(changedId), aborted: await get(abortId) };
            } finally { db.close(); }
        }, { dbName, vaultId, existingId, changedId, abortId });
        assert.equal(persisted.committed.status, 'SIMULATED_NO_DATA');
        assert.equal(persisted.committed.active, null);
        assert.deepEqual(persisted.existing, original);
        assert.equal(persisted.changed.backupFingerprint, otherFingerprint);
        assert.equal(persisted.changed.status, 'RESERVED_NO_IMPORT');
        assert.deepEqual(persisted.aborted, abortResult.before);
        console.log('PASS A10 synthetic atomic marker-only commit: two tabs, abort, wrong fingerprint, immutable V1');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(profile, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

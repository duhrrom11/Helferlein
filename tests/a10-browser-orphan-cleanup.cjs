'use strict';
// Real Chromium, two tabs, localhost and disposable synthetic IndexedDB only.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
async function main() {
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-cleanup-'));
    const scripts = { '/store.js': 'a10-atomic-idb-store.js', '/reserve.js': 'a10-atomic-import-reservation.js',
        '/recovery.js': 'a10-reservation-recovery.js', '/cleanup.js': 'a10-orphan-cleanup.js' };
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<title>A10 synthetic cleanup</title>'); }
        else if (Object.hasOwn(scripts, req.url)) {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(await fs.readFile(path.resolve(__dirname, '../assets', scripts[req.url])));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    const dbName = 'a10-isolated-cleanup-' + process.pid;
    const vaultId = 'v_syntheticCleanupRace123';
    const occupiedId = 'v_syntheticProtectedV1';
    const swappedId = 'v_syntheticChangedMarker';
    const hash = 'ab'.repeat(32), otherHash = 'cd'.repeat(32);
    const options = { explicitConsent: true, confirmVaultId: vaultId, confirmFingerprint: hash };
    try {
        browser = await chromium.launchPersistentContext(profile, { headless: true });
        const pages = [browser.pages()[0] || await browser.newPage(), await browser.newPage()];
        for (const page of pages) {
            await page.goto('http://127.0.0.1:' + server.address().port);
            for (const script of Object.keys(scripts)) await page.addScriptTag({ url: script });
        }
        const original = { active: 'v1', revision: 0, staging: null,
            legacy: { vaultId: occupiedId, masterKeyHex: 'fe'.repeat(32), encryptedData: { iv: 'synthetic' } } };
        await pages[0].evaluate(async ({ dbName, vaultId, occupiedId, swappedId, hash, otherHash, original }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            await driver.transact(occupiedId, () => original);
            for (const [id, fingerprint] of [[vaultId, hash], [swappedId, otherHash]]) {
                await HelferleinA10ImportReservation.reserve(driver, id,
                    { vaultId: id, backupFingerprint: fingerprint }, { explicitConsent: true });
            }
        }, { dbName, vaultId, occupiedId, swappedId, hash, otherHash, original });
        const denied = await pages[0].evaluate(async ({ dbName, vaultId, occupiedId, swappedId, hash, options }) => {
            const run = async (id, fingerprint, opts) => {
                try { await HelferleinA10OrphanCleanup.cleanup(indexedDB, dbName, id, fingerprint, opts); return 'UNSAFE_CLEARED'; }
                catch (e) { return e.message; }
            };
            return {
                noConsent: await run(vaultId, hash, { ...options, explicitConsent: false }),
                noConfirmId: await run(vaultId, hash, { ...options, confirmVaultId: 'v_foreign12345678' }),
                noConfirmHash: await run(vaultId, hash, { ...options, confirmFingerprint: '00'.repeat(32) }),
                changedMarker: await run(swappedId, hash, { ...options, confirmVaultId: swappedId }),
                existingV1: await run(occupiedId, hash, { ...options, confirmVaultId: occupiedId })
            };
        }, { dbName, vaultId, occupiedId, swappedId, hash, options });
        assert.equal(denied.noConsent, 'A10_CLEANUP_CONFIRMATION_REQUIRED');
        assert.equal(denied.noConfirmId, 'A10_CLEANUP_CONFIRMATION_REQUIRED');
        assert.equal(denied.noConfirmHash, 'A10_CLEANUP_CONFIRMATION_REQUIRED');
        assert.equal(denied.changedMarker, 'A10_CLEANUP_CONFLICT');
        assert.equal(denied.existingV1, 'A10_CLEANUP_CONFLICT');
        const before = await pages[0].evaluate(({ dbName, vaultId }) =>
            HelferleinA10ReservationRecovery.inspect(indexedDB, dbName, vaultId), { dbName, vaultId });
        assert.equal(before.decision, 'ORPHANED_RESERVATION_MANUAL_REVIEW');
        // Same-origin tabs race: only one transaction may delete the exact marker.
        const attempts = await Promise.all(pages.map(page => page.evaluate(async ({ dbName, vaultId, hash, options }) => {
            try { return (await HelferleinA10OrphanCleanup.cleanup(indexedDB, dbName, vaultId, hash, options)).decision; }
            catch (error) { return error.message; }
        }, { dbName, vaultId, hash, options })));
        assert.equal(attempts.filter(x => x === 'CONFIRMED_RESERVATION_CLEARED').length, 1, JSON.stringify(attempts));
        assert.equal(attempts.filter(x => x === 'A10_CLEANUP_CONFLICT').length, 1);
        await pages[0].reload();
        await pages[0].addScriptTag({ url: '/recovery.js' });
        const after = await pages[0].evaluate(async ({ dbName, vaultId, occupiedId, swappedId }) => {
            const inspect = id => HelferleinA10ReservationRecovery.inspect(indexedDB, dbName, id);
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open(dbName); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
            });
            const raw = await new Promise((resolve, reject) => {
                const tx = db.transaction('vaults', 'readonly');
                const req = tx.objectStore('vaults').get(occupiedId);
                req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
            });
            db.close();
            return { cleared: await inspect(vaultId), v1: await inspect(occupiedId), swapped: await inspect(swappedId), raw };
        }, { dbName, vaultId, occupiedId, swappedId });
        assert.equal(after.cleared.decision, 'EMPTY_NO_RESERVATION');
        assert.equal(after.v1.decision, 'EXISTING_V1_KEEP_UNCHANGED');
        assert.equal(after.swapped.decision, 'ORPHANED_RESERVATION_MANUAL_REVIEW');
        assert.equal(after.swapped.backupFingerprint, otherHash);
        assert.deepEqual(after.raw, original);
        console.log('PASS A10 explicit atomic cleanup, two-tab race, changed fingerprint, occupied V1, reload preservation');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(profile, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

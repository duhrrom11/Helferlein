'use strict';
// Synthetic localhost Chromium persistent profile. Never uses production storage.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
async function main() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-orphan-recovery-'));
    const scripts = {
        '/backup.js': 'a10-v1-portable-backup.js',
        '/transfer.js': 'a10-v1-backup-transfer.js',
        '/store.js': 'a10-atomic-idb-store.js',
        '/reserve.js': 'a10-atomic-import-reservation.js',
        '/bound.js': 'a10-preview-bound-reservation.js',
        '/recovery.js': 'a10-reservation-recovery.js'
    };
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<title>A10 synthetic recovery</title>'); }
        else if (Object.hasOwn(scripts, req.url)) {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(await fs.readFile(path.resolve(__dirname, '../assets', scripts[req.url])));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const profile = path.join(root, 'persistent-profile');
    const url = 'http://127.0.0.1:' + server.address().port;
    const dbName = 'a10-isolated-recovery-' + process.pid;
    const vaultId = 'v_syntheticOrphanedVault123';
    const existingId = 'v_syntheticV1Unchanged123';
    let browser;
    async function launch() {
        browser = await chromium.launchPersistentContext(profile, { headless: true });
        const page = browser.pages()[0] || await browser.newPage();
        await page.goto(url);
        for (const script of Object.keys(scripts)) await page.addScriptTag({ url: script });
        return page;
    }
    async function stop() { if (browser) await browser.close(); browser = null; }
    try {
        let page = await launch();
        const fixture = await page.evaluate(async ({ dbName, vaultId, existingId }) => {
            const keyHex = 'd4'.repeat(32);
            const key = await crypto.subtle.importKey('raw', Uint8Array.from(keyHex.match(/.{2}/g), h => parseInt(h, 16)), 'AES-GCM', false, ['encrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
                new TextEncoder().encode(JSON.stringify({ entries: [{ id: 'synthetic' }] }))));
            const b64 = bytes => btoa(String.fromCharCode(...bytes));
            const legacy = { vaultId, masterKeyHex: keyHex, encryptedData: { iv: b64(iv), ciphertext: b64(ciphertext) },
                ownerName: 'Synthetic', ownerEmail: '', checkInIntervalDays: 30,
                lastCheckIn: '2026-11-13T00:00:00.000Z', trustees: [], alarmPersons: [] };
            const fileText = (await HelferleinA10BackupTransfer.prepareExport(
                legacy, 'synthetic-crash-recovery-password', { explicitConsent: true })).fileText;
            const original = { active: 'v1', revision: 0, staging: null, legacy: { ...legacy, vaultId: existingId } };
            await HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName).transact(existingId, () => original);
            const preview = await HelferleinA10PreviewBoundReservation.preview(
                fileText, 'synthetic-crash-recovery-password', { explicitConsent: true, expectedVaultId: vaultId });
            return { fileText, preview, original };
        }, { dbName, vaultId, existingId });
        // Abort after authenticated preview, before reservation: nothing should be written.
        const before = await page.evaluate(({ dbName, vaultId, existingId }) => Promise.all([
            HelferleinA10ReservationRecovery.inspect(indexedDB, dbName, vaultId),
            HelferleinA10ReservationRecovery.inspect(indexedDB, dbName, existingId)
        ]), { dbName, vaultId, existingId });
        assert.equal(before[0].decision, 'EMPTY_NO_RESERVATION');
        assert.equal(before[1].decision, 'EXISTING_V1_KEEP_UNCHANGED');
        await stop(); // simulated process interruption between preview and reservation
        page = await launch();
        const afterRestart = await page.evaluate(({ dbName, vaultId }) =>
            HelferleinA10ReservationRecovery.inspect(indexedDB, dbName, vaultId), { dbName, vaultId });
        assert.equal(afterRestart.decision, 'EMPTY_NO_RESERVATION');
        // Resume is forbidden: explicitly re-authenticate the exact file and reserve only with consent.
        const reserved = await page.evaluate(async ({ dbName, vaultId, fileText, preview }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            return HelferleinA10PreviewBoundReservation.reserveAfterPreview(
                driver, fileText, 'synthetic-crash-recovery-password', preview,
                { explicitConsent: true, expectedVaultId: vaultId });
        }, { dbName, vaultId, ...fixture });
        assert.equal(reserved.status, 'RESERVED_NO_IMPORT');
        await stop(); // interrupted after reservation, before any import (which does not exist)
        page = await launch();
        const result = await page.evaluate(async ({ dbName, vaultId, existingId, fileText, preview }) => {
            const api = HelferleinA10ReservationRecovery;
            const orphan = await api.inspect(indexedDB, dbName, vaultId);
            const v1 = await api.inspect(indexedDB, dbName, existingId);
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            let retry;
            try {
                await HelferleinA10PreviewBoundReservation.reserveAfterPreview(driver, fileText,
                    'synthetic-crash-recovery-password', preview,
                    { explicitConsent: true, expectedVaultId: vaultId });
                retry = 'UNSAFE_ACCEPTED';
            } catch (error) { retry = error.message; }
            const malformed = (() => {
                try { api.classify({ format: 'A10_IMPORT_RESERVATION_ONLY', vaultId, status: 'RESERVED_NO_IMPORT' }, vaultId); return false; }
                catch (_) { return true; }
            })();
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open(dbName);
                req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
            });
            const raw = await new Promise((resolve, reject) => {
                const tx = db.transaction('vaults', 'readonly');
                const req = tx.objectStore('vaults').get(existingId);
                req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
            });
            db.close();
            return { orphan, v1, retry, malformed, raw };
        }, { dbName, vaultId, existingId, ...fixture });
        assert.equal(result.orphan.decision, 'ORPHANED_RESERVATION_MANUAL_REVIEW');
        assert.equal(result.orphan.canAutoResume, false);
        assert.equal(result.orphan.backupFingerprint, fixture.preview.backupFingerprint);
        assert.equal(result.v1.decision, 'EXISTING_V1_KEEP_UNCHANGED');
        assert.equal(result.retry, 'A10_IMPORT_DESTINATION_OCCUPIED');
        assert.equal(result.malformed, true);
        assert.deepEqual(result.raw, fixture.original);
        console.log('PASS A10 synthetic preview abort/restart, orphaned reservation fail-closed, V1 unchanged');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(root, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

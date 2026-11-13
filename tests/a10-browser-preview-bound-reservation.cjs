'use strict';
// Synthetic-only Chromium; localhost isolated IndexedDB; no real imports.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
async function main() {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-bound-preview-'));
    const scripts = {
        '/backup.js': 'a10-v1-portable-backup.js',
        '/transfer.js': 'a10-v1-backup-transfer.js',
        '/store.js': 'a10-atomic-idb-store.js',
        '/reserve.js': 'a10-atomic-import-reservation.js',
        '/bound.js': 'a10-preview-bound-reservation.js'
    };
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<title>synthetic A10 bound preview</title>'); }
        else if (Object.hasOwn(scripts, req.url)) {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(await fs.readFile(path.resolve(__dirname, '../assets', scripts[req.url])));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    const vaultId = 'v_syntheticBoundPreview123';
    const existingId = 'v_syntheticProtectedV1';
    const dbName = 'a10-isolated-bound-preview-' + process.pid;
    try {
        browser = await chromium.launchPersistentContext(path.join(dir, 'profile'), { headless: true });
        const pages = [browser.pages()[0] || await browser.newPage(), await browser.newPage()];
        for (const page of pages) {
            await page.goto('http://127.0.0.1:' + server.address().port);
            for (const script of Object.keys(scripts)) await page.addScriptTag({ url: script });
        }
        const fixture = await pages[0].evaluate(async ({ vaultId, existingId, dbName }) => {
            const keyHex = 'a1'.repeat(32);
            const key = await crypto.subtle.importKey('raw', Uint8Array.from(keyHex.match(/.{2}/g), h => parseInt(h, 16)), 'AES-GCM', false, ['encrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
                new TextEncoder().encode(JSON.stringify({ entries: [{ id: 1, name: 'synthetic' }] }))));
            const b64 = a => btoa(String.fromCharCode(...a));
            const legacy = { vaultId, masterKeyHex: keyHex, encryptedData: { iv: b64(iv), ciphertext: b64(ciphertext) },
                ownerName: 'Synthetic', ownerEmail: '', checkInIntervalDays: 30,
                lastCheckIn: '2026-11-13T00:00:00.000Z', trustees: [], alarmPersons: [] };
            const password = 'synthetic-bound-password-2026';
            const fileText = (await HelferleinA10BackupTransfer.prepareExport(legacy, password, { explicitConsent: true })).fileText;
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            const original = { active: 'v1', revision: 0, staging: null, legacy: { ...legacy, vaultId: existingId } };
            await driver.transact(existingId, () => original);
            return { fileText, password, original };
        }, { vaultId, existingId, dbName });
        const options = { expectedVaultId: vaultId, explicitConsent: true };
        const preview = await pages[0].evaluate(({ fileText, password, options }) =>
            HelferleinA10PreviewBoundReservation.preview(fileText, password, options),
        { ...fixture, options });
        const checks = await pages[0].evaluate(async ({ fixture, preview, options, dbName, vaultId, existingId }) => {
            const api = HelferleinA10PreviewBoundReservation;
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            const attempt = async (fileText, password, token, opts, key = vaultId) => {
                try { await api.reserveAfterPreview(driver, fileText, password, token, opts); return 'ACCEPTED'; }
                catch (error) { return error.message; }
            };
            const altered = fixture.fileText.replace(/.$/, c => c === '}' ? ' ' : '}');
            const before = await driver.transact(existingId, state => state);
            return {
                changed: await attempt(altered, fixture.password, preview, options),
                wrongPassword: await attempt(fixture.fileText, 'wrong-synthetic-password-2026', preview, options),
                foreignId: await attempt(fixture.fileText, fixture.password, preview, { ...options, expectedVaultId: existingId }),
                noConsent: await attempt(fixture.fileText, fixture.password, preview, { ...options, explicitConsent: false }),
                forgedFingerprint: await attempt(fixture.fileText, fixture.password, { ...preview, backupFingerprint: 'f'.repeat(64) }, options),
                before
            };
        }, { fixture, preview, options, dbName, vaultId, existingId });
        assert.equal(checks.changed, 'A10_BOUND_FILE_CHANGED');
        assert.notEqual(checks.wrongPassword, 'ACCEPTED');
        assert.notEqual(checks.foreignId, 'ACCEPTED');
        assert.equal(checks.noConsent, 'A10_BOUND_CONFIRMATION_REQUIRED');
        assert.equal(checks.forgedFingerprint, 'A10_BOUND_FILE_CHANGED');
        const attempts = await Promise.all(pages.map(page => page.evaluate(async ({ fixture, preview, options, dbName }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            try {
                const result = await HelferleinA10PreviewBoundReservation.reserveAfterPreview(
                    driver, fixture.fileText, fixture.password, preview, options);
                return { ok: true, status: result.status, fingerprint: result.backupFingerprint };
            } catch (error) { return { ok: false, error: error.message }; }
        }, { fixture, preview, options, dbName })));
        assert.equal(attempts.filter(x => x.ok).length, 1, JSON.stringify(attempts));
        assert.equal(attempts.filter(x => x.error === 'A10_IMPORT_DESTINATION_OCCUPIED').length, 1);
        assert.equal(attempts.find(x => x.ok).status, 'RESERVED_NO_IMPORT');
        assert.equal(attempts.find(x => x.ok).fingerprint, preview.backupFingerprint);
        await pages[0].reload();
        const after = await pages[0].evaluate(async ({ dbName, existingId }) => {
            const req = indexedDB.open(dbName);
            const db = await new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
            try {
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction('vaults', 'readonly');
                    const r = tx.objectStore('vaults').get(existingId);
                    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
                });
            } finally { db.close(); }
        }, { dbName, existingId });
        assert.deepEqual(after, fixture.original);
        assert.deepEqual(checks.before, fixture.original);
        console.log('PASS A10 authenticated preview bound to exact backup bytes, tampering, foreign ID, two-tab race and unchanged V1');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(dir, { recursive: true, force: true });
    }
}
main().catch(e => { console.error(e); process.exitCode = 1; });

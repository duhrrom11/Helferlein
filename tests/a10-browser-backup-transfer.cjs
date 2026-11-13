'use strict';
// A10 isolated Chromium synthetic export/import; no production origins or storage.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
async function main() {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-transfer-synthetic-'));
    const scripts = {
        '/backup.js': path.resolve(__dirname, '../assets/a10-v1-portable-backup.js'),
        '/transfer.js': path.resolve(__dirname, '../assets/a10-v1-backup-transfer.js')
    };
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>A10 synthetic transfer</title>'); }
        else if (Object.hasOwn(scripts, req.url)) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(await fs.readFile(scripts[req.url])); }
        else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launchPersistentContext(path.join(tmp, 'browser'), { headless: true });
        const page = browser.pages()[0] || await browser.newPage();
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.addScriptTag({ url: '/backup.js' });
        await page.addScriptTag({ url: '/transfer.js' });
        const result = await page.evaluate(async () => {
            const api = HelferleinA10BackupTransfer;
            const password = 'synthetic-transfer-password-2026';
            const masterKeyHex = '3c'.repeat(32);
            const key = await crypto.subtle.importKey('raw',
                Uint8Array.from(masterKeyHex.match(/.{2}/g), x => parseInt(x, 16)),
                'AES-GCM', false, ['encrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
                new TextEncoder().encode(JSON.stringify({ entries: [{ id: 1, label: 'synthetic' }] }))));
            const b64 = bytes => btoa(String.fromCharCode(...bytes));
            const original = {
                vaultId: 'v_' + 'aa'.repeat(16), masterKeyHex,
                encryptedData: { iv: b64(iv), ciphertext: b64(cipher) },
                ownerName: 'Synthetic', ownerEmail: 'synthetic@example.invalid',
                checkInIntervalDays: 30, lastCheckIn: '2026-11-13T00:00:00.000Z',
                trustees: [{ id: 1, name: 'Synthetic trustee' }], alarmPersons: [],
                unknownExtension: { keep: ['nested', 12] }
            };
            const existing = structuredClone(original);
            const originalSnapshot = JSON.stringify(original);
            const existingSnapshot = JSON.stringify(existing);
            const expectReject = async (name, work) => {
                try { await work(); return [name, false]; } catch (_) { return [name, true]; }
            };
            const exportDenied = await expectReject('exportWithoutConsent',
                () => api.prepareExport(original, password, {}));
            const exported = await api.prepareExport(original, password, { explicitConsent: true });
            const options = { explicitConsent: true, expectedVaultId: original.vaultId, existing: null };
            const preview = await api.previewImport(exported.fileText, password, options);
            const file = JSON.parse(exported.fileText);
            const corrupted = { ...file, ciphertext: file.ciphertext.slice(0, -4) + 'AAAA' };
            const failures = await Promise.all([
                expectReject('importWithoutConsent', () => api.previewImport(exported.fileText, password, { ...options, explicitConsent: false })),
                expectReject('missingExpectedId', () => api.previewImport(exported.fileText, password, { explicitConsent: true })),
                expectReject('wrongPassword', () => api.previewImport(exported.fileText, 'wrong-synthetic-password-2026', options)),
                expectReject('corruptedFile', () => api.previewImport(JSON.stringify(corrupted), password, options)),
                expectReject('truncatedFile', () => api.previewImport(exported.fileText.slice(0, -20), password, options)),
                expectReject('oversizeFile', () => api.previewImport(' '.repeat(1500001), password, options)),
                expectReject('foreignVaultId', () => api.previewImport(exported.fileText, password, { ...options, expectedVaultId: 'v_' + 'bb'.repeat(16) })),
                expectReject('existingSameVault', () => api.previewImport(exported.fileText, password, { ...options, existing })),
                expectReject('existingOtherVault', () => api.previewImport(exported.fileText, password, { ...options, existing: { vaultId: 'v_' + 'bb'.repeat(16) } })),
                expectReject('invalidExisting', () => api.previewImport(exported.fileText, password, { ...options, existing: {} })),
                expectReject('unknownFormat', () => api.previewImport(JSON.stringify({ ...file, version: 999 }), password, options))
            ]);
            return {
                exportDenied, failures, preview,
                originalUnchanged: JSON.stringify(original) === originalSnapshot,
                existingUnchanged: JSON.stringify(existing) === existingSnapshot,
                fileHasPlaintextKey: exported.fileText.includes(masterKeyHex),
                filename: exported.filename
            };
        });
        assert.equal(result.exportDenied[1], true);
        for (const [name, rejected] of result.failures) assert.equal(rejected, true, name);
        assert.equal(result.preview.decision, 'PREVIEW_ONLY_NO_WRITE');
        assert.equal(result.preview.recovered.masterKeyHex, '3c'.repeat(32));
        assert.deepEqual(result.preview.recovered.unknownExtension, { keep: ['nested', 12] });
        assert.equal(result.originalUnchanged, true);
        assert.equal(result.existingUnchanged, true);
        assert.equal(result.fileHasPlaintextKey, false);
        assert.equal(result.filename, 'helferlein-a10-v1-encrypted-backup.json');
        console.log('PASS synthetic confirmed export, read-only preview, malformed file, wrong password, foreign ID, conflicts, unchanged source');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(tmp, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

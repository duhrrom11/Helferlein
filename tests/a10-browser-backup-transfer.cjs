'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
async function main() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-transfer-synthetic-'));
    const scripts = {
        '/backup.js': '../assets/a10-v1-portable-backup.js',
        '/normalize.js': '../assets/a10-historical-v1-normalizer.js',
        '/transfer.js': '../assets/a10-v1-backup-transfer.js'
    };
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<title>synthetic A10 transfer</title>'); }
        else if (Object.hasOwn(scripts, req.url)) {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(await fs.readFile(path.resolve(__dirname, scripts[req.url])));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    let context;
    async function start(profile) {
        context = await chromium.launchPersistentContext(path.join(root, profile), { headless: true });
        const page = context.pages()[0] || await context.newPage();
        await page.goto(url);
        for (const script of Object.keys(scripts)) await page.addScriptTag({ url: script });
        return page;
    }
    try {
        let page = await start('source');
        const exported = await page.evaluate(async () => {
            const hex = 'bc'.repeat(32);
            const key = await crypto.subtle.importKey('raw', Uint8Array.from(hex.match(/.{2}/g), h => parseInt(h, 16)), 'AES-GCM', false, ['encrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
                new TextEncoder().encode(JSON.stringify({ entries: [{ id: 1, label: 'synthetic' }] }))));
            const b64 = bytes => btoa(String.fromCharCode(...bytes));
            const legacy = { vaultId: 'v_' + 'ac'.repeat(16), masterKeyHex: hex,
                encryptedData: { iv: b64(iv), ciphertext: b64(data) }, ownerName: 'Synthetic',
                ownerEmail: '', checkInIntervalDays: 30, lastCheckIn: '2026-01-01T00:00:00.000Z',
                trustees: [{ id: 1, name: 'Person 1' }], unknownLegacyField: { retain: true } };
            const before = JSON.stringify(legacy);
            const api = HelferleinA10BackupTransfer;
            const denied = await api.exportFile(legacy, 'synthetic-transfer-password-2026', {}).then(() => false, () => true);
            const file = await api.exportFile(legacy, 'synthetic-transfer-password-2026', { explicitConsent: true });
            return { denied, file, unchanged: JSON.stringify(legacy) === before, legacy };
        });
        assert.equal(exported.denied, true);
        assert.equal(exported.unchanged, true);
        assert.equal(exported.file.text.includes(exported.legacy.masterKeyHex), false);
        assert.equal(exported.file.text.includes('Synthetic'), false);
        await context.close(); context = null;
        await fs.rm(path.join(root, 'source'), { recursive: true, force: true });
        page = await start('fresh');
        const results = await page.evaluate(async ({ file, legacy }) => {
            const api = HelferleinA10BackupTransfer;
            const password = 'synthetic-transfer-password-2026';
            const valid = { explicitConsent: true, destinationEmpty: true, currentVaultId: null, expectedVaultId: legacy.vaultId };
            const rejects = async (text, pass, opts) =>
                api.previewImport(text, pass, opts).then(() => false, () => true);
            const fileObject = JSON.parse(file.text);
            const broken = { ...fileObject, backup: { ...fileObject.backup,
                ciphertext: fileObject.backup.ciphertext.slice(0, -4) + 'AAAA' } };
            const tests = {
                missingConsent: await rejects(file.text, password, { ...valid, explicitConsent: false }),
                wrongPassword: await rejects(file.text, 'incorrect-transfer-password-2026', valid),
                corruptFile: await rejects('{"broken":', password, valid),
                damagedCiphertext: await rejects(JSON.stringify(broken), password, valid),
                foreignVaultId: await rejects(file.text, password, { ...valid, expectedVaultId: 'v_foreignVault123' }),
                existingDifferentVault: await rejects(file.text, password, { ...valid, destinationEmpty: false, currentVaultId: 'v_existingVault123' }),
                existingSameVault: await rejects(file.text, password, { ...valid, destinationEmpty: false, currentVaultId: legacy.vaultId }),
                missingDestinationProof: await rejects(file.text, password, { explicitConsent: true, expectedVaultId: legacy.vaultId }),
                unknownFormat: await rejects(JSON.stringify({ ...fileObject, version: 2 }), password, valid),
                unknownField: await rejects(JSON.stringify({ ...fileObject, extra: 1 }), password, valid),
                oversize: await rejects(' '.repeat(api.MAX_FILE_BYTES + 1), password, valid)
            };
            const before = localStorage.length;
            const preview = await api.previewImport(file.text, password, valid);
            return { tests, preview, storageUnchanged: localStorage.length === before };
        }, { file: exported.file, legacy: exported.legacy });
        for (const [name, pass] of Object.entries(results.tests)) assert.equal(pass, true, name);
        assert.equal(results.storageUnchanged, true);
        assert.equal(results.preview.requiresSeparateCommit, true);
        assert.equal(results.preview.vaultId, exported.legacy.vaultId);
        assert.deepEqual(results.preview.added, ['alarmPersons']);
        assert.deepEqual(results.preview.preview, { ...exported.legacy, alarmPersons: [] });
        console.log('PASS synthetic confirmed export and read-only import: lost profile, bad file/password, foreign ID, conflicts, original intact');
    } finally {
        if (context) await context.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(root, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

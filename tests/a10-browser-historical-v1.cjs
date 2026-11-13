'use strict';
// A10 synthetic historical V1 only: no production app, accounts or database.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
async function run() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-historical-v1-'));
    const scripts = {
        '/normalizer.js': path.resolve(__dirname, '../assets/a10-historical-v1-normalizer.js'),
        '/backup.js': path.resolve(__dirname, '../assets/a10-v1-portable-backup.js')
    };
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>synthetic historical V1</title>'); }
        else if (Object.hasOwn(scripts, req.url)) {
            res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(await fs.readFile(scripts[req.url]));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launchPersistentContext(path.join(root, 'source'), { headless: true });
        const page = browser.pages()[0] || await browser.newPage();
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.addScriptTag({ url: '/normalizer.js' });
        await page.addScriptTag({ url: '/backup.js' });
        const results = await page.evaluate(async () => {
            const normalizer = HelferleinA10HistoricalV1;
            const backupApi = HelferleinA10V1Backup;
            const password = 'synthetic-historical-password-2026';
            const hex = '9f'.repeat(32);
            const key = await crypto.subtle.importKey('raw', Uint8Array.from(hex.match(/.{2}/g), x => parseInt(x, 16)), 'AES-GCM', false, ['encrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
                new TextEncoder().encode(JSON.stringify({ entries: [{ id: 1, name: 'synthetic' }] }))));
            const b64 = a => btoa(String.fromCharCode(...a));
            const old = {
                vaultId: 'v_' + 'bc'.repeat(16), masterKeyHex: hex,
                encryptedData: { iv: b64(iv), ciphertext: b64(cipher) },
                ownerName: 'Synthetic Owner', ownerEmail: '', checkInIntervalDays: 30,
                lastCheckIn: '2026-01-01T00:00:00.000Z',
                trustees: [{ id: 1, name: 'Person 1', role: 'Partner/in' }],
                unknownLegacyExtension: { custom: ['keep', { count: 42 }] }
            };
            const snapshot = JSON.stringify(old);
            const denied = await normalizer.normalize(old, {}).then(() => false, () => true);
            const result = await normalizer.normalize(old, { explicitConsent: true });
            const backup = await backupApi.create(result.normalized, password);
            const restored = await backupApi.restore(backup, password);
            const bad = async changed => normalizer.normalize(changed, { explicitConsent: true }).then(() => false, () => true);
            const negatives = {
                wrongKey: await bad({ ...old, masterKeyHex: 'ff'.repeat(32) }),
                corruptCipher: await bad({ ...old, encryptedData: { ...old.encryptedData, ciphertext: b64(new Uint8Array(32)) } }),
                badIV: await bad({ ...old, encryptedData: { ...old.encryptedData, iv: 'bad' } }),
                missingOwner: await bad({ ...old, ownerName: undefined }),
                missingTrustees: await bad({ ...old, trustees: undefined }),
                invalidContacts: await bad({ ...old, trustees: [{ id: 1, name: 42 }] }),
                invalidDate: await bad({ ...old, lastCheckIn: 'not-a-date' }),
                invalidVaultId: await bad({ ...old, vaultId: 'wrong' }),
                unknownBackupVersion: await backupApi.restore({ ...backup, version: 7 }, password).then(() => false, () => true),
                wrongPassword: await backupApi.restore(backup, 'wrong-synthetic-password-2026').then(() => false, () => true),
                tamperedBackup: await backupApi.restore({ ...backup, ciphertext: backup.ciphertext.slice(0, -4) + 'AAAA' }, password).then(() => false, () => true)
            };
            const full = { ...old, alarmPersons: [] };
            const fullResult = await normalizer.normalize(full, { explicitConsent: true });
            return { denied, added: result.added, restored, normalized: result.normalized,
                originalUnchanged: JSON.stringify(old) === snapshot,
                unknownPreserved: JSON.stringify(restored.unknownLegacyExtension) === JSON.stringify(old.unknownLegacyExtension),
                fullUnchanged: JSON.stringify(fullResult.normalized) === JSON.stringify(full),
                fullAdded: fullResult.added, negatives };
        });
        assert.equal(results.denied, true);
        assert.deepEqual(results.added, ['alarmPersons']);
        assert.deepEqual(results.restored, results.normalized);
        assert.equal(results.originalUnchanged, true);
        assert.equal(results.unknownPreserved, true);
        assert.equal(results.fullUnchanged, true);
        assert.deepEqual(results.fullAdded, []);
        for (const [name, passed] of Object.entries(results.negatives)) assert.equal(passed, true, name);
        console.log('PASS synthetic historical V1 normalization, unknown extensions, authenticated ciphertext, encrypted backup recovery and negatives');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(root, { recursive: true, force: true });
    }
}
run().catch(error => { console.error(error); process.exitCode = 1; });

'use strict';
// A10 source-contract regression: no execution of production legacy code or storage.
// Synthetic fixtures reflect initVault() V1 shape in assets/heir-owner-legacy.js.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const legacySource = path.resolve(__dirname, '../assets/heir-owner-legacy.js');
const backupSource = path.resolve(__dirname, '../assets/a10-v1-portable-backup.js');
async function main() {
    const source = await fs.readFile(legacySource, 'utf8');
    const init = source.slice(source.indexOf('async function initVault()'), source.indexOf('function getVaultConfig()'));
    assert.ok(init.includes("localStorage.setItem('digital_estate_vault', JSON.stringify(cfg))"));
    assert.ok(init.includes('currentDecryptedVault = { entries: [] }'));
    assert.ok(source.includes('return { ciphertext: b64(encrypted), iv: b64(iv) };'));
    const fields = ['vaultId', 'ownerName', 'ownerEmail', 'masterKeyHex', 'checkInIntervalDays',
        'lastCheckIn', 'trustees', 'alarmPersons', 'encryptedData'];
    for (const field of fields) assert.match(init, new RegExp('\\b' + field + '\\b'));
    assert.match(init, /\{ id: 1, name: "Person 1", role: "Partner\/in" \}/);
    assert.match(init, /\{ id: 2, name: "Person 2", role: "Kind" \}/);
    assert.match(init, /\{ id: 3, name: "Notar", role: "Rechtsbeistand" \}/);
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-schema-synthetic-'));
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>A10 schema</title>'); }
        else if (req.url === '/backup.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(await fs.readFile(backupSource)); }
        else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launchPersistentContext(profile, { headless: true });
        const page = browser.pages()[0] || await browser.newPage();
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.addScriptTag({ url: '/backup.js' });
        const result = await page.evaluate(async () => {
            const api = HelferleinA10V1Backup;
            const masterKeyHex = 'a3'.repeat(32);
            const key = await crypto.subtle.importKey('raw', Uint8Array.from(masterKeyHex.match(/.{2}/g), x => parseInt(x, 16)),
                'AES-GCM', false, ['encrypt', 'decrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const entries = { entries: [{ id: 1, title: 'Synthetic example', type: 'note', content: 'synthetic' }] };
            const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
                new TextEncoder().encode(JSON.stringify(entries))));
            const b64 = a => btoa(String.fromCharCode(...a));
            const legacy = {
                vaultId: 'v_' + 'a1'.repeat(16), ownerName: 'Dein Name', ownerEmail: '',
                masterKeyHex, checkInIntervalDays: 30, lastCheckIn: '2026-11-13T00:00:00.000Z',
                trustees: [
                    { id: 1, name: 'Person 1', role: 'Partner/in' },
                    { id: 2, name: 'Person 2', role: 'Kind' },
                    { id: 3, name: 'Notar', role: 'Rechtsbeistand' }
                ], alarmPersons: [], encryptedData: { ciphertext: b64(cipher), iv: b64(iv) }
            };
            const password = 'synthetic-schema-password-2026';
            const snapshot = JSON.stringify(legacy);
            const backup = await api.create(legacy, password);
            const restored = await api.restore(backup, password);
            const decrypted = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: Uint8Array.from(atob(restored.encryptedData.iv), x => x.charCodeAt(0)) },
                key, Uint8Array.from(atob(restored.encryptedData.ciphertext), x => x.charCodeAt(0)))));
            const negatives = {};
            const reject = async (name, changed) => {
                negatives[name] = await api.create(changed, password).then(() => false, () => true);
            };
            await reject('missingMasterKey', { ...legacy, masterKeyHex: undefined });
            await reject('badVaultId', { ...legacy, vaultId: 'wrong' });
            await reject('badIv', { ...legacy, encryptedData: { ...legacy.encryptedData, iv: 'bad' } });
            await reject('badCiphertext', { ...legacy, encryptedData: { ...legacy.encryptedData, ciphertext: 'bad' } });
            await reject('badInterval', { ...legacy, checkInIntervalDays: 0 });
            await reject('badContacts', { ...legacy, trustees: 'not-array' });
            await reject('missingTimestamp', { ...legacy, lastCheckIn: 'invalid' });
            const tampered = { ...backup, ciphertext: backup.ciphertext.slice(0, -4) + 'AAAA' };
            negatives.tamperedBackup = await api.restore(tampered, password).then(() => false, () => true);
            negatives.wrongPassword = await api.restore(backup, 'wrong-synthetic-password-2026').then(() => false, () => true);
            return { snapshot, after: JSON.stringify(legacy), restored, decrypted, entries, negatives,
                backupLeaksKey: JSON.stringify(backup).includes(masterKeyHex) };
        });
        assert.equal(result.snapshot, result.after);
        assert.deepEqual(result.restored.encryptedData && result.decrypted, result.entries);
        assert.equal(result.restored.masterKeyHex, 'a3'.repeat(32));
        assert.deepEqual(result.restored.trustees.map(x => x.role), ['Partner/in', 'Kind', 'Rechtsbeistand']);
        assert.equal(result.backupLeaksKey, false);
        for (const [name, ok] of Object.entries(result.negatives)) assert.equal(ok, true, name);
        console.log('PASS source-derived synthetic V1 fixture, AES-GCM payload, portable backup and negative cases');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(profile, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

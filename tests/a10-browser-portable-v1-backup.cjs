'use strict';
// Real Chromium: portable encrypted synthetic V1 backup survives loss of original profile.
// No production data, origin, localStorage, Supabase or remote service.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const vaultId = 'v_syntheticPortable123';
const password = 'synthetic-only-backup-password-2026';
async function main() {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-portable-v1-'));
    const source = path.resolve(__dirname, '../assets/a10-v1-portable-backup.js');
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>A10 portable backup</title>'); }
        else if (req.url === '/assets/a10-v1-portable-backup.js') {
            res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(await fs.readFile(source));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    let browser;
    async function open(profile) {
        browser = await chromium.launchPersistentContext(path.join(root, profile), { headless: true });
        const page = browser.pages()[0] || await browser.newPage();
        await page.goto(url);
        await page.addScriptTag({ url: '/assets/a10-v1-portable-backup.js' });
        return page;
    }
    try {
        const first = await open('source');
        const result = await first.evaluate(async ({ vaultId, password }) => {
            const masterKeyHex = '3a'.repeat(32);
            const raw = Uint8Array.from(masterKeyHex.match(/.{2}/g), x => parseInt(x, 16));
            const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const payload = new TextEncoder().encode(JSON.stringify({ entries: [{ id: 'synthetic-entry', label: 'demo' }] }));
            const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload));
            const b64 = a => btoa(String.fromCharCode(...a));
            const legacy = { vaultId, masterKeyHex, encryptedData: { iv: b64(iv), ciphertext: b64(cipher) },
                ownerName: 'Synthetic Owner', ownerEmail: 'synthetic@example.invalid',
                checkInIntervalDays: 30, lastCheckIn: '2026-01-01T00:00:00.000Z',
                trustees: [{ id: 'synthetic-trustee' }], alarmPersons: [] };
            const original = structuredClone(legacy);
            const backup = await HelferleinA10V1Backup.create(legacy, password);
            return { legacy, original, backup };
        }, { vaultId, password });
        assert.deepEqual(result.legacy, result.original, 'Backup must not modify source');
        assert.equal(JSON.stringify(result.backup).includes(result.legacy.masterKeyHex), false);
        assert.equal(JSON.stringify(result.backup).includes('Synthetic Owner'), false);
        await browser.close(); browser = null;
        // Simulate loss of original browser profile, retaining only exported encrypted artifact.
        await fs.rm(path.join(root, 'source'), { recursive: true, force: true });
        const second = await open('fresh');
        const outcome = await second.evaluate(async ({ backup, password }) => {
            const api = HelferleinA10V1Backup;
            const wrong = await api.restore(backup, 'incorrect-synthetic-password-2026')
                .then(() => false, () => true);
            const changed = { ...backup, ciphertext: backup.ciphertext.slice(0, -4) + 'AAAA' };
            const corrupt = await api.restore(changed, password).then(() => false, () => true);
            const malformed = await api.restore({ ...backup, version: 99 }, password).then(() => false, () => true);
            const restored = await api.restore(backup, password);
            const duplicate = await api.create(restored, password);
            return { wrong, corrupt, malformed, restored, duplicate };
        }, { backup: result.backup, password });
        assert.equal(outcome.wrong, true, 'Wrong password must fail closed');
        assert.equal(outcome.corrupt, true, 'Tampered ciphertext must fail closed');
        assert.equal(outcome.malformed, true, 'Unknown format must fail closed');
        assert.deepEqual(outcome.restored, result.legacy, 'Fresh profile must recover exact V1');
        assert.notEqual(outcome.duplicate.ciphertext, result.backup.ciphertext, 'Fresh salt/IV required');
        assert.equal(outcome.restored.masterKeyHex, result.legacy.masterKeyHex);
        console.log('PASS independent synthetic encrypted V1 backup: lost profile, fresh recovery, wrong password, tampering, unchanged original');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(root, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

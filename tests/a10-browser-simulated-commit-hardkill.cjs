'use strict';
// Isolated A10: actual Chromium SIGKILL during an IndexedDB transaction and after a committed marker.
// All data synthetic, localhost-only origin, disposable persistent profile. No production import.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const vaultId = 'v_syntheticSimCrash123';
const existingId = 'v_syntheticSimCrashV1';
const completedId = 'v_syntheticSimCompleted';
const fingerprint = 'ab'.repeat(32);
const dbName = 'a10-isolated-sim-hardkill';
const original = { active: 'v1', revision: 0, staging: null, legacy: {
    vaultId: existingId, masterKeyHex: 'ce'.repeat(32), encryptedData: { iv: 'synthetic' } } };
function chromiumPid(profile) {
    const lines = execFileSync('ps', ['-eo', 'pid=,args='], { encoding: 'utf8' }).split('\n');
    const matches = lines.map(line => {
        const match = /^\s*(\d+)\s+(.*)$/.exec(line);
        return match && match[2].includes('--user-data-dir=' + profile) &&
            !match[2].includes('--type=') ? Number(match[1]) : null;
    }).filter(Boolean);
    assert.equal(matches.length, 1, 'Expected one isolated Chromium browser process');
    return matches[0];
}
async function main() {
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-sim-commit-hardkill-'));
    const scripts = {
        '/store.js': 'a10-atomic-idb-store.js',
        '/reserve.js': 'a10-atomic-import-reservation.js',
        '/commit.js': 'a10-simulated-import-commit.js'
    };
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<title>A10 synthetic SIGKILL</title>'); }
        else if (Object.hasOwn(scripts, req.url)) {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(await fs.readFile(path.resolve(__dirname, '../assets', scripts[req.url])));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    let browser;
    async function start() {
        browser = await chromium.launchPersistentContext(profile, { headless: true });
        const page = browser.pages()[0] || await browser.newPage();
        await page.goto(url);
        for (const script of Object.keys(scripts)) await page.addScriptTag({ url: script });
        return page;
    }
    async function read(page, key) {
        return page.evaluate(async ({ dbName, key }) => {
            const req = indexedDB.open(dbName);
            const db = await new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
            });
            try {
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction('vaults', 'readonly');
                    const get = tx.objectStore('vaults').get(key);
                    get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error);
                });
            } finally { db.close(); }
        }, { dbName, key });
    }
    const reserved = key => ({ format: 'A10_IMPORT_RESERVATION_ONLY', vaultId: key,
        backupFingerprint: fingerprint, revision: 0, status: 'RESERVED_NO_IMPORT', active: null });
    const committed = key => ({ format: 'A10_SIMULATED_IMPORT_COMMIT_ONLY', vaultId: key,
        backupFingerprint: fingerprint, revision: 1, status: 'SIMULATED_NO_DATA', active: null });
    try {
        let page = await start();
        await page.evaluate(async ({ dbName, vaultId, existingId, completedId, fingerprint, original }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            await driver.transact(existingId, () => original);
            for (const id of [vaultId, completedId]) {
                await HelferleinA10ImportReservation.reserve(driver, id,
                    { vaultId: id, backupFingerprint: fingerprint }, { explicitConsent: true });
            }
        }, { dbName, vaultId, existingId, completedId, fingerprint, original });
        assert.deepEqual(await read(page, vaultId), reserved(vaultId));
        const pid = chromiumPid(profile);
        let signal;
        const checkpoint = new Promise(resolve => { signal = resolve; });
        await page.exposeBinding('a10SimCrashCheckpoint', () => signal());
        // A real readwrite transaction is kept open with repeated puts; kill while in flight.
        // Every put is a synthetic marker with the final shape, never actual vault content.
        const pending = page.evaluate(async ({ dbName, vaultId, fingerprint }) => {
            const req = indexedDB.open(dbName);
            const db = await new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
            });
            const tx = db.transaction('vaults', 'readwrite');
            const store = tx.objectStore('vaults');
            const get = store.get(vaultId);
            get.onsuccess = () => {
                const current = get.result;
                if (!current || current.format !== 'A10_IMPORT_RESERVATION_ONLY' ||
                    current.status !== 'RESERVED_NO_IMPORT' || current.backupFingerprint !== fingerprint) {
                    tx.abort(); return;
                }
                let count = 0;
                const write = () => {
                    const request = store.put({ format: 'A10_SIMULATED_IMPORT_COMMIT_ONLY',
                        vaultId, backupFingerprint: fingerprint, revision: 1,
                        status: 'SIMULATED_NO_DATA', active: null }, vaultId);
                    request.onsuccess = () => {
                        count++;
                        if (count === 5) void window.a10SimCrashCheckpoint();
                        if (count < 50000) write();
                    };
                };
                write();
            };
            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error || new Error('A10_SIM_ABORT'));
                tx.onerror = () => reject(tx.error || new Error('A10_SIM_ERROR'));
            });
            db.close();
        }, { dbName, vaultId, fingerprint }).catch(() => {});
        await Promise.race([checkpoint, new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SIGKILL checkpoint timed out')), 15000))]);
        process.kill(pid, 'SIGKILL');
        await Promise.race([pending, new Promise(resolve => setTimeout(resolve, 3000))]);
        browser = null;
        page = await start();
        const recovered = await read(page, vaultId);
        assert.ok(JSON.stringify(recovered) === JSON.stringify(reserved(vaultId)) ||
            JSON.stringify(recovered) === JSON.stringify(committed(vaultId)),
            'Recovery must be an entire reserved or committed marker, never partial');
        assert.deepEqual(await read(page, existingId), original);
        // If the transaction rolled back, an explicit confirmed retry is possible.
        // If it committed, retry must fail closed.
        const retry = await page.evaluate(async ({ dbName, vaultId, fingerprint }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            try {
                return { ok: true, value: await HelferleinA10SimulatedImportCommit.commit(
                    driver, vaultId, fingerprint, { explicitConsent: true,
                        confirmVaultId: vaultId, confirmFingerprint: fingerprint }) };
            } catch (error) { return { ok: false, error: error.message }; }
        }, { dbName, vaultId, fingerprint });
        if (recovered.status === 'RESERVED_NO_IMPORT') {
            assert.equal(retry.ok, true);
            assert.deepEqual(retry.value, committed(vaultId));
        } else {
            assert.equal(retry.ok, false);
            assert.equal(retry.error, 'A10_SIM_COMMIT_CONFLICT');
        }
        assert.deepEqual(await read(page, vaultId), committed(vaultId));
        // Two tabs compete for a second reserved key. Exactly one can commit.
        const second = await browser.newPage();
        await second.goto(url);
        for (const script of Object.keys(scripts)) await second.addScriptTag({ url: script });
        const race = await Promise.all([page, second].map(tab => tab.evaluate(async ({ dbName, completedId, fingerprint }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            try {
                await HelferleinA10SimulatedImportCommit.commit(driver, completedId, fingerprint,
                    { explicitConsent: true, confirmVaultId: completedId, confirmFingerprint: fingerprint });
                return 'COMMITTED';
            } catch (error) { return error.message; }
        }, { dbName, completedId, fingerprint })));
        assert.equal(race.filter(x => x === 'COMMITTED').length, 1, JSON.stringify(race));
        assert.equal(race.filter(x => x === 'A10_SIM_COMMIT_CONFLICT').length, 1);
        assert.deepEqual(await read(page, completedId), committed(completedId));
        assert.deepEqual(await read(page, existingId), original);
        // SIGKILL after a fully completed marker: restart must not regress or activate.
        process.kill(chromiumPid(profile), 'SIGKILL');
        browser = null;
        page = await start();
        assert.deepEqual(await read(page, vaultId), committed(vaultId));
        assert.deepEqual(await read(page, completedId), committed(completedId));
        assert.deepEqual(await read(page, existingId), original);
        console.log('PASS A10 real Chromium SIGKILL in-flight and post-commit, atomic marker recovery, two-tab race, immutable V1');
    } finally {
        if (browser) await browser.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(profile, { recursive: true, force: true });
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

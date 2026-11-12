'use strict';
// A10 only: kill the actual Chromium process while a real IndexedDB transaction is open.
// Isolated localhost origin, synthetic V1, disposable profile; no production storage.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const profilePrefix = 'a10-synthetic-hardkill-';
const vaultId = 'v_syntheticHardKill123';
const dbName = 'a10-isolated-hardkill';
const legacy = { vaultId, masterKeyHex: 'cd'.repeat(32), encryptedData: { iv: 'synthetic' } };
const staged = { active: 'v1', revision: 1, legacy,
    staging: { formatVersion: 2, vaultId, encryptedData: { iv: 'synthetic' },
        encryptedConfig: { iv: 'synthetic' }, keyEnvelope: { version: 2 } } };
const activated = { ...staged, active: 'v2', revision: 2 };
const script = path.resolve(__dirname, '../assets/a10-atomic-idb-store.js');
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
async function run() {
    const profile = await fs.mkdtemp(path.join(os.tmpdir(), profilePrefix));
    const server = http.createServer(async (req, res) => {
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<!doctype html><title>synthetic A10 crash test</title>');
        } else if (req.url === '/assets/a10-atomic-idb-store.js') {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(await fs.readFile(script));
        } else { res.writeHead(404); res.end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    let context;
    async function start() {
        context = await chromium.launchPersistentContext(profile, { headless: true });
        const page = context.pages()[0] || await context.newPage();
        await page.goto(url);
        await page.addScriptTag({ url: '/assets/a10-atomic-idb-store.js' });
        return page;
    }
    async function read(page) {
        return page.evaluate(async ({ dbName, vaultId }) => {
            const req = indexedDB.open(dbName);
            const db = await new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            try {
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction('vaults', 'readonly');
                    const get = tx.objectStore('vaults').get(vaultId);
                    get.onsuccess = () => resolve(get.result);
                    get.onerror = () => reject(get.error);
                });
            } finally { db.close(); }
        }, { dbName, vaultId });
    }
    try {
        let page = await start();
        await page.evaluate(async ({ dbName, vaultId, staged }) => {
            const driver = HelferleinA10AtomicStore.indexedDbDriver(indexedDB, dbName);
            await driver.transact(vaultId, () => staged);
        }, { dbName, vaultId, staged });
        assert.deepEqual(await read(page), staged);
        // Force a real process kill while IDB write transaction remains active.
        // A loop of puts keeps the transaction open; signal after the first writes.
        const pid = chromiumPid(profile);
        let signal;
        const signalled = new Promise(resolve => { signal = resolve; });
        await page.exposeBinding('a10CrashSignal', () => { signal(); });
        const pending = page.evaluate(async ({ dbName, vaultId, activated }) => {
            const req = indexedDB.open(dbName);
            const db = await new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            const tx = db.transaction('vaults', 'readwrite');
            const store = tx.objectStore('vaults');
            let count = 0;
            const write = () => {
                const put = store.put({ ...activated, revision: 2, syntheticWriteCount: count }, vaultId);
                put.onsuccess = () => {
                    count++;
                    if (count === 5) void window.a10CrashSignal();
                    if (count < 50000) write();
                };
            };
            write();
            await new Promise((resolve, reject) => {
                tx.oncomplete = resolve;
                tx.onabort = () => reject(tx.error);
                tx.onerror = () => reject(tx.error);
            });
            db.close();
        }, { dbName, vaultId, activated }).catch(() => {});
        await Promise.race([signalled, new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timed out before IndexedDB crash checkpoint')), 15000))]);
        process.kill(pid, 'SIGKILL');
        await Promise.race([pending, new Promise(resolve => setTimeout(resolve, 3000))]);
        // Relaunch same profile; no application-side recovery writes.
        context = null;
        page = await start();
        const recovered = await read(page);
        // A transaction may either commit fully or roll back; partial marker/revision is forbidden.
        assert.deepEqual(recovered, staged, 'In-flight transaction must not leave partial state');
        assert.deepEqual(recovered.legacy, legacy);
        console.log('PASS real Chromium SIGKILL mid-IDB transaction; same-profile recovery kept V1 staging');
    } finally {
        if (context) await context.close().catch(() => {});
        await new Promise(resolve => server.close(resolve));
        await fs.rm(profile, { recursive: true, force: true });
    }
}
run().catch(error => { console.error(error); process.exitCode = 1; });

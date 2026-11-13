'use strict';
// Focused localhost Chromium test; isolated DB, synthetic data, no Supabase or production origin.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-v2-idb-'));
  const files = {
    '/envelope.js': 'a10-v2-encrypted-envelope.js',
    '/staging.js': 'a10-v2-staging.js',
    '/driver.js': 'a10-v2-indexeddb-driver.js'
  };
  const server = http.createServer(async (req, res) => {
    if (req.url === '/') { res.writeHead(200, {'Content-Type':'text/html'}); res.end('A10 isolated'); return; }
    if (!files[req.url]) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'Content-Type':'text/javascript'});
    res.end(await fs.readFile(path.resolve(__dirname, '../assets', files[req.url])));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launchPersistentContext(path.join(profile, 'profile'), { headless: true });
    const pages = [browser.pages()[0] || await browser.newPage(), await browser.newPage()];
    for (const page of pages) {
      await page.goto('http://127.0.0.1:' + server.address().port);
      for (const url of Object.keys(files)) await page.addScriptTag({ url });
    }
    const dbName = 'a10-isolated-v2-synthetic-' + process.pid;
    const vaultId = 'v_syntheticRace123';
    const password = 'synthetic-long-password-123456';
    const candidate = { vaultId, masterKeyHex: 'a'.repeat(64),
      encryptedData: { iv: btoa(String.fromCharCode(...new Uint8Array(12))),
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(32))) } };
    const envelope = await pages[0].evaluate(async ({ candidate, password }) =>
      HelferleinA10V2Envelope.seal(candidate, password, { explicitConsent: true }), { candidate, password });
    const attempt = page => page.evaluate(async ({ dbName, vaultId, envelope, password }) => {
      const driver = HelferleinA10V2IndexedDB.driver(indexedDB, dbName);
      try { return { ok: true, value: await HelferleinA10V2Staging.stage(
        driver, vaultId, envelope, password, { explicitConsent: true, confirmVaultId: vaultId }) }; }
      catch (e) { return { ok: false, code: e.message }; }
    }, { dbName, vaultId, envelope, password });
    const results = await Promise.all(pages.map(attempt));
    assert.equal(results.filter(x => x.ok).length, 1, JSON.stringify(results));
    assert.equal(results.filter(x => x.code === 'A10_V2_STAGING_REJECTED').length, 1);
    const saved = await pages[0].evaluate(async ({ dbName, vaultId }) => {
      const d = HelferleinA10V2IndexedDB.driver(indexedDB, dbName);
      return d.read(vaultId);
    }, { dbName, vaultId });
    assert.equal(saved.active, null);
    assert.equal(JSON.stringify(saved).includes(candidate.masterKeyHex), false);
    assert.equal((await attempt(pages[0])).code, 'A10_V2_STAGING_REJECTED');
    // A synthetic V1 marker is placed under another key, then challenged and compared byte-for-byte.
    const v1id = 'v_syntheticLegacy123';
    const legacy = { vaultId: v1id, masterKeyHex: 'b'.repeat(64), active: 'v1' };
    await pages[0].evaluate(async ({ dbName, v1id, legacy }) => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
      });
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction('staged', 'readwrite');
          tx.objectStore('staged').put(legacy, v1id);
          tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
        });
      } finally { db.close(); }
    }, { dbName, v1id, legacy });
    const denied = await pages[1].evaluate(async ({ dbName, v1id, envelope, password }) => {
      const d = HelferleinA10V2IndexedDB.driver(indexedDB, dbName);
      try { await HelferleinA10V2Staging.stage(d, v1id, envelope, password,
        { explicitConsent: true, confirmVaultId: v1id }); return false; }
      catch (_) { return true; }
    }, { dbName, v1id, envelope, password });
    assert.equal(denied, true);
    await pages[0].reload();
    for (const url of Object.keys(files)) await pages[0].addScriptTag({ url });
    const after = await pages[0].evaluate(async ({ dbName, v1id }) =>
      HelferleinA10V2IndexedDB.driver(indexedDB, dbName).read(v1id), { dbName, v1id });
    assert.deepEqual(after, legacy);
    console.log('A10 V2 isolated real IndexedDB two-tab staging: PASS');
  } finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    await fs.rm(profile, { recursive: true, force: true });
  }
})().catch(e => { console.error(e); process.exitCode = 1; });

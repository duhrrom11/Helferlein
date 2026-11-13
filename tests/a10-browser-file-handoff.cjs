'use strict';
// Real download to filesystem and upload into fresh Chromium context, synthetic only.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-file-handoff-'));
  const scripts = {
    '/backup.js': 'a10-v1-portable-backup.js',
    '/transfer.js': 'a10-v1-backup-transfer.js',
    '/handoff.js': 'a10-backup-file-handoff.js'
  };
  const server = http.createServer(async (req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!doctype html><title>isolated A10</title><input type="file" id="file">');
    } else if (scripts[req.url]) {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      res.end(await fs.readFile(path.join(__dirname, '../assets', scripts[req.url])));
    } else { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const setup = async context => {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:' + server.address().port);
      for (const url of Object.keys(scripts)) await page.addScriptTag({ url });
      return page;
    };
    const origin = await browser.newContext({ acceptDownloads: true });
    const page = await setup(origin);
    const data = await page.evaluate(async () => {
      const masterKeyHex = 'ab'.repeat(32);
      const key = await crypto.subtle.importKey('raw',
        Uint8Array.from(masterKeyHex.match(/.{2}/g), x => parseInt(x, 16)),
        'AES-GCM', false, ['encrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
        new TextEncoder().encode(JSON.stringify({ entries: [{ title: 'synthetic' }] }))));
      const b64 = bytes => btoa(String.fromCharCode(...bytes));
      const vaultId = 'v_syntheticFile123';
      const legacy = { vaultId, masterKeyHex, encryptedData: { iv: b64(iv), ciphertext: b64(cipher) },
        ownerName: 'Synthetic', ownerEmail: 'synthetic@example.invalid',
        checkInIntervalDays: 30, lastCheckIn: '2026-01-01T00:00:00.000Z', trustees: [], alarmPersons: [] };
      const password = 'synthetic-backup-password-123456';
      const prepared = await HelferleinA10BackupTransfer.prepareExport(legacy, password, { explicitConsent: true });
      try {
        HelferleinA10BackupFileHandoff.downloadPrepared(prepared, { explicitConsent: true });
        throw new Error('download without storage confirmation accepted');
      } catch (error) {
        if (error.message !== 'A10_FILE_HANDOFF_REJECTED') throw error;
      }
      return { prepared, vaultId, password, legacy };
    });
    const downloadPromise = page.waitForEvent('download');
    const downloadStatus = await page.evaluate(prepared =>
      HelferleinA10BackupFileHandoff.downloadPrepared(prepared,
        { explicitConsent: true, confirmIndependentStorage: true }), data.prepared);
    assert.equal(downloadStatus.status, 'DOWNLOAD_REQUESTED_NOT_VERIFIED');
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'helferlein-a10-v1-encrypted-backup.json');
    const exportedPath = path.join(temp, download.suggestedFilename());
    await download.saveAs(exportedPath);
    const bytes = await fs.readFile(exportedPath, 'utf8');
    assert.equal(bytes.includes(data.legacy.masterKeyHex), false);
    assert.deepEqual(JSON.parse(bytes), JSON.parse(data.prepared.fileText));
    await origin.close();
    // New independent browser context with empty storage, only encrypted file passed in.
    const fresh = await browser.newContext({ acceptDownloads: false });
    const receiver = await setup(fresh);
    await receiver.locator('#file').setInputFiles(exportedPath);
    const result = await receiver.evaluate(async ({ vaultId, password }) => {
      const file = document.querySelector('#file').files[0];
      const options = { explicitConsent: true, confirmIndependentStorage: true,
        expectedVaultId: vaultId, existing: null };
      const preview = await HelferleinA10BackupFileHandoff.previewSelectedFile(file, password, options);
      let wrongRejected = false;
      try { await HelferleinA10BackupFileHandoff.previewSelectedFile(file,
        'incorrect-synthetic-password-123', options); } catch (_) { wrongRejected = true; }
      let occupiedRejected = false;
      try { await HelferleinA10BackupFileHandoff.previewSelectedFile(file, password,
        { ...options, existing: { vaultId } }); } catch (_) { occupiedRejected = true; }
      return { preview, wrongRejected, occupiedRejected,
        storageEntries: localStorage.length };
    }, { vaultId: data.vaultId, password: data.password });
    assert.equal(result.preview.decision, 'PREVIEW_ONLY_NO_WRITE');
    assert.deepEqual(result.preview.recovered, data.legacy);
    assert.equal(result.wrongRejected, true);
    assert.equal(result.occupiedRejected, true);
    assert.equal(result.storageEntries, 0);
    await fresh.close();
    console.log('A10 isolated encrypted file download + fresh browser upload/recovery: PASS');
  } finally {
    await browser.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

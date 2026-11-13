'use strict';
// End-to-end synthetic browser handoff: real downloaded file -> fresh context -> encrypted IDB staging.
// No production origin, Supabase, V1 writes, or activation.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
(async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'a10-file-idb-'));
  const files = [
    'a10-v1-portable-backup.js',
    'a10-historical-v1-normalizer.js',
    'a10-v2-encrypted-envelope.js',
    'a10-v1-v2-migration-preflight.js',
    'a10-v2-staging.js',
    'a10-recovery-verified-staging.js',
    'a10-file-bound-recovery-staging.js',
    'a10-v2-indexeddb-driver.js',
    'a10-backup-file-handoff.js',
    'a10-backup-file-integrity.js',
    'a10-attested-file-staging.js'
  ];
  const server = http.createServer(async (req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!doctype html><title>A10 isolated</title><input type="file" id="backup">');
      return;
    }
    const name = req.url.slice(1);
    if (!files.includes(name)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end(await fs.readFile(path.join(__dirname, '../assets', name)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const setup = async context => {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:' + server.address().port);
      for (const name of files) await page.addScriptTag({ url: '/' + name });
      return page;
    };
    const origin = await browser.newContext({ acceptDownloads: true });
    const source = await setup(origin);
    const credentials = {
      vaultId: 'v_browserFileIDB123',
      backupPassword: 'independent-browser-backup-123',
      v2Password: 'separate-browser-v2-password-456'
    };
    const prepared = await source.evaluate(async ({ vaultId, backupPassword, v2Password }) => {
      const keyBytes = crypto.getRandomValues(new Uint8Array(32));
      const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv },
        key, new TextEncoder().encode(JSON.stringify({ entries: [{ title: 'synthetic' }] }))));
      const b64 = bytes => btoa(String.fromCharCode(...bytes));
      const legacy = { vaultId,
        masterKeyHex: [...keyBytes].map(b => b.toString(16).padStart(2, '0')).join(''),
        encryptedData: { iv: b64(iv), ciphertext: b64(ciphertext) },
        ownerName: 'Synthetic', ownerEmail: 'synthetic@example.invalid',
        checkInIntervalDays: 30, lastCheckIn: '2026-01-01T00:00:00.000Z',
        trustees: [], alarmPersons: [] };
      const artifacts = await HelferleinA10MigrationPreflight.prepare(
        legacy, backupPassword, v2Password,
        { explicitConsent: true, confirmVaultId: vaultId, confirmIndependentBackup: true });
      const attestation = await HelferleinA10BackupFileIntegrity.attestExport(
        JSON.stringify(artifacts.backup),
        { explicitConsent: true, confirmIndependentStorage: true });
      return { artifacts, legacy, attestation };
    }, credentials);
    const downloadPromise = source.waitForEvent('download');
    const downloadResult = await source.evaluate(backup =>
      HelferleinA10BackupFileHandoff.downloadPrepared({
        filename: 'helferlein-a10-v1-encrypted-backup.json', fileText: JSON.stringify(backup)
      }, { explicitConsent: true, confirmIndependentStorage: true }), prepared.artifacts.backup);
    assert.equal(downloadResult.status, 'DOWNLOAD_REQUESTED_NOT_VERIFIED');
    const download = await downloadPromise;
    const exportedPath = path.join(temp, download.suggestedFilename());
    await download.saveAs(exportedPath);
    assert.equal((await fs.readFile(exportedPath, 'utf8')).includes(prepared.legacy.masterKeyHex), false);
    await origin.close();
    const fresh = await browser.newContext();
    const receiver = await setup(fresh);
    await receiver.locator('#backup').setInputFiles(exportedPath);
    // The attacker changes the actual selected file bytes while preserving its
    // expected name and JSON MIME type. Attestation must reject before any IDB write.
    const exportedBytes = await fs.readFile(exportedPath);
    const tamperedBytes = Buffer.concat([exportedBytes, Buffer.from(' ')]);
    await receiver.locator('#backup').setInputFiles({
      name: 'helferlein-a10-v1-encrypted-backup.json',
      mimeType: 'application/json', buffer: tamperedBytes
    });
    const tamperedFileResult = await receiver.evaluate(async ({ artifacts, attestation, credentials }) => {
      const { vaultId, backupPassword, v2Password } = credentials;
      const driver = HelferleinA10V2IndexedDB.driver(indexedDB,
        'a10-isolated-v2-file-to-idb-synthetic');
      const options = { explicitConsent: true, confirmIndependentStorage: true,
        confirmIndependentBackup: true, confirmStagingOnly: true, confirmVaultId: vaultId };
      let rejected = false;
      try {
        await HelferleinA10AttestedFileStaging.stageAttested(driver,
          document.querySelector('#backup').files[0], attestation, artifacts,
          backupPassword, v2Password, options);
      } catch (_) { rejected = true; }
      return { rejected, stored: await driver.read(vaultId) };
    }, { artifacts: prepared.artifacts, attestation: prepared.attestation, credentials });
    assert.equal(tamperedFileResult.rejected, true, 'modified selected file must be rejected');
    assert.equal(tamperedFileResult.stored, undefined, 'tampered file must not stage');
    await receiver.locator('#backup').setInputFiles(exportedPath);
    const result = await receiver.evaluate(async ({ artifacts, attestation, credentials }) => {
      const { vaultId, backupPassword, v2Password } = credentials;
      const file = document.querySelector('#backup').files[0];
      const dbName = 'a10-isolated-v2-file-to-idb-synthetic';
      const driver = HelferleinA10V2IndexedDB.driver(indexedDB, dbName);
      const options = { explicitConsent: true, confirmIndependentStorage: true,
        confirmIndependentBackup: true,
        confirmStagingOnly: true, confirmVaultId: vaultId };
      let wrongPasswordRejected = false;
      try { await HelferleinA10AttestedFileStaging.stageAttested(driver, file,
        attestation, artifacts, 'wrong-backup-password-123', v2Password, options); }
      catch (_) { wrongPasswordRejected = true; }
      let tamperedRejected = false;
      try { await HelferleinA10AttestedFileStaging.stageAttested(driver, file,
        { ...attestation, sha256: '0'.repeat(64) }, artifacts,
        backupPassword, v2Password, options); }
      catch (_) { tamperedRejected = true; }
      const before = await driver.read(vaultId);
      const staged = await HelferleinA10AttestedFileStaging.stageAttested(driver,
        file, attestation, artifacts, backupPassword, v2Password, options);
      const stored = await driver.read(vaultId);
      let repeatRejected = false;
      try { await HelferleinA10AttestedFileStaging.stageAttested(driver, file,
        attestation, artifacts, backupPassword, v2Password, options); }
      catch (_) { repeatRejected = true; }
      return { wrongPasswordRejected, tamperedRejected, before, staged, stored, repeatRejected,
        localStorageCount: localStorage.length };
    }, { artifacts: prepared.artifacts, attestation: prepared.attestation, credentials });
    assert.equal(result.wrongPasswordRejected, true);
    assert.equal(result.tamperedRejected, true);
    assert.equal(result.before, undefined);
    assert.equal(result.staged.status, 'RECOVERY_VERIFIED_STAGED_NOT_ACTIVE');
    assert.equal(result.stored.status, 'STAGED_NOT_ACTIVE');
    assert.equal(result.stored.active, null);
    assert.equal(result.repeatRejected, true);
    assert.equal(result.localStorageCount, 0);
    assert.equal(JSON.stringify(result.stored).includes(prepared.legacy.masterKeyHex), false);
    await receiver.reload();
    for (const name of files) await receiver.addScriptTag({ url: '/' + name });
    const after = await receiver.evaluate(async vaultId =>
      HelferleinA10V2IndexedDB.driver(indexedDB,
        'a10-isolated-v2-file-to-idb-synthetic').read(vaultId), credentials.vaultId);
    assert.deepEqual(after, result.stored);
    await fresh.close();
    console.log('A10 attested real browser file -> fresh-context verified encrypted IDB staging: PASS');
  } finally {
    await browser.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
    await fs.rm(temp, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

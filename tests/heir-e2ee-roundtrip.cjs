// Synthetic-only browser E2EE roundtrip. Never connects to Supabase or uses real data.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, extname } = require('node:path');
const root = resolve(__dirname, '..');
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (path !== '/tools/digitaler-nachlass/erben-uebergabe.html' && path !== '/assets/heir-e2ee-handoff.js') {
    res.writeHead(404); res.end(); return;
  }
  try {
    const bytes = await readFile(resolve(root, '.' + path));
    res.writeHead(200, {'Content-Type': extname(path) === '.js' ? 'application/javascript' : 'text/html'});
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({acceptDownloads:true});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/tools/digitaler-nachlass/erben-uebergabe.html');
    const password = 'SYNTHETIC-ONLY-Password-2026!';
    await page.locator('#keyPassphrase').fill(password);
    await page.locator('#keyPassphraseConfirm').fill(password);
    const privateDownloadPromise = page.waitForEvent('download');
    await page.locator('#createKey').click();
    const privateDownload = await privateDownloadPromise;
    const privateFile = await privateDownload.path();
    assert.match(await page.locator('#keyStatus').innerText(), /Privater Schlüssel heruntergeladen/);
    assert.equal(await page.locator('#downloadPublicKey').isEnabled(), true);
    await page.locator('#createKey').click();
    assert.match(await page.locator('#keyStatus').innerText(), /Bitte zuerst den öffentlichen Schlüssel herunterladen/);
    const publicDownloadPromise = page.waitForEvent('download');
    await page.locator('#downloadPublicKey').click();
    const publicDownload = await publicDownloadPromise;
    const publicFile = await publicDownload.path();
    await page.evaluate(async () => {
      const raw = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']);
      const plaintext = new TextEncoder().encode(JSON.stringify({entries:[{title:'Synthetic release test',value:'TEST ONLY'}]}));
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plaintext));
      const b64 = b => btoa(Array.from(b,x=>String.fromCharCode(x)).join(''));
      localStorage.setItem('digital_estate_vault',JSON.stringify({
        masterKeyHex:Array.from(raw,x=>x.toString(16).padStart(2,'0')).join(''),
        encryptedData:{iv:b64(iv),ciphertext:b64(ciphertext)}
      }));
      raw.fill(0);
    });
    await page.locator('#publicKeyFile').setInputFiles(publicFile);
    await page.locator('#confirmRelease').check();
    const estateDownloadPromise = page.waitForEvent('download');
    await page.locator('#exportEstate').click();
    const estateDownload = await estateDownloadPromise;
    assert.match(await page.locator('#exportStatus').innerText(), /Verschlüsseltes Nachlasspaket erstellt/);
    await page.locator('#privateKeyFile').setInputFiles(privateFile);
    await page.locator('#estateFile').setInputFiles(await estateDownload.path());
    await page.locator('#unlockPassphrase').fill('WRONG-PASSWORD');
    await page.locator('#openEstate').click();
    assert.match(await page.locator('#openStatus').innerText(), /Entschlüsselung fehlgeschlagen/);
    assert.equal(await page.locator('#estateOutput').innerText(),'');
    await page.locator('#unlockPassphrase').fill(password);
    await page.locator('#openEstate').click();
    assert.match(await page.locator('#openStatus').innerText(), /Nachlass lokal entschlüsselt/);
    assert.match(await page.locator('#estateOutput').innerText(), /Synthetic release test/);
    assert.match(await page.locator('#estateOutput').innerText(), /TEST ONLY/);
    assert.deepEqual(errors,[]);
    await page.evaluate(() => localStorage.removeItem('digital_estate_vault'));
    console.log('PASS: E2EE synthetic browser roundtrip, wrong-password rejection, and key regeneration protection');
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1}).finally(()=>server.close());

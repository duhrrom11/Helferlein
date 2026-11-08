// Ausfuehren: node --test tests/vault-local-save.test.cjs
// Fuehrt die echte saveLocalConfig-Implementierung isoliert aus.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/digitaler-nachlass/index.html'), 'utf8');
const start = html.indexOf('        let localSaveRevision = 0;');
const end = html.indexOf('        // Synchronisierungen nacheinander ausf', start);
assert.ok(start >= 0 && end > start, 'Lokaler Speicher-Code muss vorhanden sein');
const source = html.slice(start, end);

function setup(encryptVaultPayload) {
  const writes = [];
  const context = vm.createContext({
    encryptVaultPayload,
    currentDecryptedVault: { entries: [] },
    currentMasterKeyHex: 'test-key',
    localStorage: { setItem(key, value) { writes.push({ key, value: JSON.parse(value) }); } },
    document: { getElementById() { return null; } }
  });
  vm.runInContext(source + '\nthis.save = saveLocalConfig;', context);
  return { save: context.save, writes };
}

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}

test('aelterer Verschluesselungsvorgang darf neuere Daten nicht ueberschreiben', async () => {
  const first = deferred();
  const second = deferred();
  let count = 0;
  const { save, writes } = setup(() => ++count === 1 ? first.promise : second.promise);
  const oldSave = save({ ownerName: 'alt' });
  const newSave = save({ ownerName: 'neu' });
  second.resolve('cipher-new');
  assert.equal(await newSave, true);
  first.resolve('cipher-old');
  assert.equal(await oldSave, false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].value.ownerName, 'neu');
  assert.equal(writes[0].value.encryptedData, 'cipher-new');
});

test('normales lokales Speichern liefert true', async () => {
  const { save, writes } = setup(async () => 'encrypted');
  assert.equal(await save({ ownerName: 'Test' }), true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, 'digital_estate_vault');
});

test('fehlgeschlagene Verschluesselung schreibt nichts', async () => {
  const { save, writes } = setup(async () => { throw new Error('encrypt failed'); });
  await assert.rejects(save({ ownerName: 'Test' }), /encrypt failed/);
  assert.equal(writes.length, 0);
});

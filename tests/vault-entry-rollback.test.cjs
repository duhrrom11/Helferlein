// Ausfuehren: node --test tests/vault-entry-rollback.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/notizen/index.html'), 'utf8');
const start = html.indexOf('        let localConfigUpdateQueue = Promise.resolve();');
const end = html.indexOf('        // Synchronisierungen nacheinander ausführen:', start);
assert.ok(start >= 0 && end > start, 'Warteschlangen-Code fehlt');
const source = html.slice(start, end);

function setup(failMode) {
  const original = [{ id: 1, title: 'Vorhanden' }, { id: 2, title: 'Behalten' }];
  const vault = { entries: structuredClone(original) };
  let stored = { encryptedData: 'alt' };
  let nextMode = failMode;
  const context = vm.createContext({
    currentDecryptedVault: vault,
    getVaultConfig: () => structuredClone(stored),
    saveLocalConfig: async cfg => {
      await Promise.resolve();
      if (nextMode === 'throw') throw new Error('Verschluesselung fehlgeschlagen');
      if (nextMode === 'false') return false;
      stored = structuredClone(cfg);
      return true;
    }
  });
  vm.runInContext(source + '\nthis.update = updateLocalConfig;', context);
  return { update: context.update, vault, original, setMode: mode => { nextMode = mode; } };
}

for (const mode of ['throw', 'false']) {
  test('Hinzufuegen wird bei ' + mode + ' zurueckgenommen', async () => {
    const h = setup(mode);
    const operation = h.update(() => { h.vault.entries.unshift({ id: 3, title: 'Ungespeichert' }); });
    if (mode === 'throw') await assert.rejects(operation, /Verschluesselung fehlgeschlagen/);
    else assert.equal(await operation, false);
    assert.deepEqual(h.vault.entries, h.original);
  });

  test('Loeschen wird bei ' + mode + ' zurueckgenommen', async () => {
    const h = setup(mode);
    const operation = h.update(() => { h.vault.entries = h.vault.entries.filter(e => e.id !== 1); });
    if (mode === 'throw') await assert.rejects(operation, /Verschluesselung fehlgeschlagen/);
    else assert.equal(await operation, false);
    assert.deepEqual(h.vault.entries, h.original);
  });
}

test('nach Ruecknahme bleibt die Warteschlange nutzbar', async () => {
  const h = setup('throw');
  await assert.rejects(h.update(() => { h.vault.entries.push({ id: 3, title: 'Fehler' }); }));
  assert.deepEqual(h.vault.entries, h.original);
  h.setMode('ok');
  assert.equal(await h.update(() => { h.vault.entries.push({ id: 4, title: 'Erfolg' }); }), true);
  assert.deepEqual(h.vault.entries.map(e => e.id), [1, 2, 4]);
});

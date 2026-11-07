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
    vaultReady: true,
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

function setupSequence(outcomes) {
  const vault = { entries: [{ id: 1, title: 'Original' }] };
  const snapshots = [];
  let calls = 0;
  const context = vm.createContext({
    vaultReady: true,
    currentDecryptedVault: vault,
    getVaultConfig: () => ({}),
    saveLocalConfig: async () => {
      const outcome = outcomes[calls++];
      await new Promise(resolve => setImmediate(resolve));
      if (outcome === 'throw') throw new Error('Verschluesselung fehlgeschlagen');
      if (outcome === false) return false;
      snapshots.push(structuredClone(vault.entries));
      return true;
    }
  });
  vm.runInContext(source + '\nthis.update = updateLocalConfig;', context);
  return { update: context.update, vault, snapshots, calls: () => calls };
}

test('erfolgreiche Aenderung bleibt nach fehlgeschlagener Folgeaktion erhalten', async () => {
  const h = setupSequence([true, 'throw']);
  const first = h.update(() => { h.vault.entries.push({ id: 2, title: 'Gespeichert' }); });
  const second = h.update(() => { h.vault.entries.push({ id: 3, title: 'Fehler' }); });
  assert.equal(await first, true);
  await assert.rejects(second, /Verschluesselung fehlgeschlagen/);
  assert.deepEqual(h.vault.entries.map(e => e.id), [1, 2]);
  assert.deepEqual(h.snapshots.map(s => s.map(e => e.id)), [[1, 2]]);
});

test('fehlgeschlagene Aenderung beeinflusst folgende erfolgreiche Aktion nicht', async () => {
  const h = setupSequence([false, true]);
  const first = h.update(() => { h.vault.entries.push({ id: 2, title: 'Fehler' }); });
  const second = h.update(() => { h.vault.entries.push({ id: 3, title: 'Gespeichert' }); });
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.deepEqual(h.vault.entries.map(e => e.id), [1, 3]);
  assert.deepEqual(h.snapshots.map(s => s.map(e => e.id)), [[1, 3]]);
});

test('mehrere gleichzeitige Aktionen werden geordnet verarbeitet und isoliert zurueckgenommen', async () => {
  const h = setupSequence([true, false, true, 'throw', true]);
  const operations = [2, 3, 4, 5, 6].map(id =>
    h.update(() => { h.vault.entries.push({ id, title: String(id) }); })
      .then(value => value, () => 'throw')
  );
  assert.deepEqual(await Promise.all(operations), [true, false, true, 'throw', true]);
  assert.deepEqual(h.vault.entries.map(e => e.id), [1, 2, 4, 6]);
  assert.deepEqual(h.snapshots.map(s => s.map(e => e.id)), [[1, 2], [1, 2, 4], [1, 2, 4, 6]]);
  assert.equal(h.calls(), 5);
});

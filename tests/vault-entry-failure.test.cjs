// Ausfuehren: node --test tests/vault-entry-failure.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/digitaler-nachlass/index.html'), 'utf8');
const start = html.indexOf('        async function saveVaultEntry()');
const end = html.indexOf('        async function performCheckIn()', start);
assert.ok(start >= 0 && end > start, 'Tresorfunktionen fehlen');
const source = html.slice(start, end);

function setup(result) {
  const inputs = {
    entryTitle: { value: 'Wichtiger Eintrag' },
    entryCategory: { value: 'Notiz' },
    entryContent: { value: 'Geheimer Inhalt' }
  };
  const vault = { entries: [{ id: 123, title: 'Vorhanden' }] };
  const alerts = [];
  let cloudCalls = 0;
  let renderCalls = 0;
  const context = vm.createContext({
    currentDecryptedVault: vault,
    document: { getElementById: id => inputs[id] },
    updateLocalConfig: async mutate => {
      if (result === 'throw-after-mutate') {
        mutate({});
        throw new Error('Verschluesselung fehlgeschlagen');
      }
      if (result === 'throw') throw new Error('Speichern fehlgeschlagen');
      if (result === false) return false;
      mutate({});
      return true;
    },
    syncVaultToFirebase: async () => { cloudCalls++; return false; },
    renderVaultEntries: () => { renderCalls++; },
    alert: msg => alerts.push(msg),
    console: { error() {} },
    Date
  });
  vm.runInContext(source + '\nthis.addEntry = saveVaultEntry; this.removeEntry = deleteVaultEntry;', context);
  return {
    add: context.addEntry, remove: context.removeEntry,
    vault, inputs, alerts,
    cloudCalls: () => cloudCalls,
    renderCalls: () => renderCalls
  };
}

for (const action of ['add', 'remove']) {
  for (const failure of [false, 'throw', 'throw-after-mutate']) {
    test(action + ': lokaler Fehler ' + String(failure) + ' stoppt Cloud-Sync und Erfolgsmeldung', async () => {
      const h = setup(failure);
      await (action === 'add' ? h.add() : h.remove(123));
      assert.equal(h.cloudCalls(), 0);
      assert.equal(h.renderCalls(), 0);
      assert.equal(h.alerts.length, 1);
      assert.match(h.alerts[0], /nicht dauerhaft lokal gespeichert werden/);
      assert.doesNotMatch(h.alerts[0], /✅/);
      if (action === 'add') {
        assert.equal(h.inputs.entryTitle.value, 'Wichtiger Eintrag');
        assert.equal(h.inputs.entryContent.value, 'Geheimer Inhalt');
      }
    });
  }
  test(action + ': lokaler Erfolg fuehrt zum Cloud-Sync-Versuch', async () => {
    const h = setup(true);
    await (action === 'add' ? h.add() : h.remove(123));
    assert.equal(h.cloudCalls(), 1);
    assert.equal(h.renderCalls(), 1);
    assert.match(h.alerts.at(-1), /nur lokal/);
  });
}

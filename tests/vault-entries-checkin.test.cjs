// Ausfuehren: node --test tests/vault-entries-checkin.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/digitaler-nachlass/index.html'), 'utf8');
const start = html.indexOf('        async function saveVaultEntry()');
const end = html.indexOf('        async function updateDeadmanInterval()', start);
assert.ok(start >= 0 && end > start, 'Tresor- und Check-in-Funktionen fehlen');
const source = html.slice(start, end);

function setup() {
  const vault = { entries: [] };
  let cfg = { lastCheckIn: '2020-01-01T00:00:00.000Z' };
  let queue = Promise.resolve();
  const alerts = [];
  const inputs = {
    entryTitle: { value: '' },
    entryCategory: { value: 'Notiz' },
    entryContent: { value: '' }
  };
  const context = vm.createContext({
    currentDecryptedVault: vault,
    document: { getElementById: id => inputs[id] },
    Date, alert: msg => alerts.push(msg),
    renderVaultEntries() {}, renderApp() {},
    syncVaultToFirebase: async () => false,
    updateLocalConfig: mutate => {
      const op = queue.then(async () => {
        const next = structuredClone(cfg);
        mutate(next);
        await Promise.resolve();
        cfg = next;
        return true;
      });
      queue = op.then(() => undefined, () => undefined);
      return op;
    }
  });
  vm.runInContext(source + '\nthis.saveEntry = saveVaultEntry; this.deleteEntry = deleteVaultEntry; this.checkIn = performCheckIn;', context);
  return { saveEntry: context.saveEntry, deleteEntry: context.deleteEntry, checkIn: context.checkIn, inputs, vault, alerts, config: () => cfg };
}

test('zwei schnell hinzugefuegte Tresoreintraege bleiben erhalten', async () => {
  const h = setup();
  h.inputs.entryTitle.value = 'Erster';
  h.inputs.entryContent.value = 'Inhalt 1';
  const first = h.saveEntry();
  h.inputs.entryTitle.value = 'Zweiter';
  h.inputs.entryContent.value = 'Inhalt 2';
  const second = h.saveEntry();
  await Promise.all([first, second]);
  assert.deepEqual(h.vault.entries.map(e => e.title), ['Zweiter', 'Erster']);
});

test('Loeschen entfernt nur den gewaehlten Eintrag', async () => {
  const h = setup();
  h.vault.entries.push({ id: 101, title: 'Behalten' }, { id: 202, title: 'Entfernen' });
  await h.deleteEntry(202);
  assert.deepEqual(h.vault.entries.map(e => e.id), [101]);
});

test('Check-in aktualisiert lokalen Zeitstempel', async () => {
  const h = setup();
  await h.checkIn();
  assert.notEqual(h.config().lastCheckIn, '2020-01-01T00:00:00.000Z');
  assert.ok(Number.isFinite(Date.parse(h.config().lastCheckIn)));
  assert.match(h.alerts.at(-1), /nur lokal gespeichert/);
});

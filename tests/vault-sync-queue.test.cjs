// Ausfuehren: node --test tests/vault-sync-queue.test.cjs
// Testet den tatsaechlichen Warteschlangen-Code aus der HTML-Datei ohne Firebase-Zugriff.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/digitaler-nachlass/index.html'), 'utf8');
const start = html.indexOf('        let vaultSyncQueue = Promise.resolve();');
const end = html.indexOf('        async function performVaultSync(', start);
assert.ok(start >= 0 && end > start, 'Warteschlangen-Code muss vorhanden sein');
const queueCode = html.slice(start, end);

function setup(performVaultSync) {
  const events = [];
  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, {
          innerText: '',
          classList: {
            add(name) { events.push([id, 'add', name]); },
            remove(name) { events.push([id, 'remove', name]); },
            toggle(name, enabled) { events.push([id, enabled ? 'add' : 'remove', name]); }
          }
        });
      }
      return elements.get(id);
    }
  };
  const logs = [];
  const context = vm.createContext({
    Promise, document, console: { error(...args) { logs.push(args); } },
    performVaultSync
  });
  vm.runInContext(queueCode + '\nthis.sync = syncVaultToFirebase;', context);
  return { sync: context.sync, events, elements, logs };
}

test('Cloud-Status zeigt Fehlschlag und nachfolgenden Erfolg', async () => {
  let calls = 0;
  const { sync, elements } = setup(async () => ++calls === 2);
  assert.equal(await sync(true), false);
  assert.match(elements.get('vault-sync-result').textContent, /nicht bestätigt/);
  assert.equal(await sync(true), true);
  assert.match(elements.get('vault-sync-result').textContent, /bestätigt/);
});

test('ein fehlgeschlagener Auftrag blockiert den naechsten nicht', async () => {
  const calls = [];
  const { sync } = setup(async () => {
    calls.push(calls.length + 1);
    return calls.length === 1 ? false : true;
  });
  const first = sync(true);
  const second = sync(true);
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.deepEqual(calls, [1, 2]);
});

test('unerwartete Ausnahme liefert false und Warteschlange laeuft weiter', async () => {
  let calls = 0;
  const { sync, logs } = setup(async () => {
    calls++;
    if (calls === 1) throw new Error('simulierter Firebase-Fehler');
    return true;
  });
  assert.equal(await sync(true), false);
  assert.equal(await sync(true), true);
  assert.equal(calls, 2);
  assert.equal(logs.length, 1);
});

test('Auftraege werden nicht parallel ausgefuehrt', async () => {
  let active = 0;
  let maxActive = 0;
  const { sync } = setup(async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return true;
  });
  assert.deepEqual(await Promise.all([sync(true), sync(true), sync(true)]), [true, true, true]);
  assert.equal(maxActive, 1);
});

test('unerwarteter manueller Fehler zeigt Fehlermeldung', async () => {
  const { sync, elements, events } = setup(async () => { throw new Error('Testfehler'); });
  assert.equal(await sync(false), false);
  assert.match(elements.get('syncErrorMessage').innerText, /nicht abgeschlossen/);
  assert.ok(events.some(e => e[0] === 'syncStatusError' && e[1] === 'remove' && e[2] === 'hidden'));
});

// Ausfuehren: node --test tests/vault-config-update.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/notizen/index.html'), 'utf8');
const start = html.indexOf('        let localConfigUpdateQueue = Promise.resolve();');
const end = html.indexOf('        // Synchronisierungen nacheinander ausführen:', start);
assert.ok(start >= 0 && end > start, 'Konfigurations-Warteschlange muss vorhanden sein');
const source = html.slice(start, end);

function setup(initial = {}) {
  let stored = structuredClone(initial);
  const updates = [];
  const context = vm.createContext({
    Promise,
    getVaultConfig: () => structuredClone(stored),
    saveLocalConfig: async cfg => {
      await new Promise(resolve => setImmediate(resolve));
      stored = structuredClone(cfg);
      updates.push(structuredClone(cfg));
      return true;
    }
  });
  vm.runInContext(source + '\nthis.update = updateLocalConfig;', context);
  return { update: context.update, updates, read: () => stored };
}

test('gleichzeitige Einstellungen werden zusammen erhalten', async () => {
  const { update, read, updates } = setup({ ownerName: 'Alt', checkInIntervalDays: 30 });
  const name = update(cfg => { cfg.ownerName = 'Neu'; });
  const interval = update(cfg => { cfg.checkInIntervalDays = 7; });
  assert.deepEqual(await Promise.all([name, interval]), [true, true]);
  assert.equal(read().ownerName, 'Neu');
  assert.equal(read().checkInIntervalDays, 7);
  assert.equal(updates.length, 2);
});

test('nach fehlgeschlagener Mutation bleibt Warteschlange nutzbar', async () => {
  const { update, read } = setup({ ownerName: 'Alt' });
  await assert.rejects(update(() => { throw new Error('Testfehler'); }), /Testfehler/);
  assert.equal(await update(cfg => { cfg.ownerName = 'Neu'; }), true);
  assert.equal(read().ownerName, 'Neu');
});

test('Mutationen laufen in Aufrufreihenfolge', async () => {
  const { update, read } = setup({ count: 0 });
  await Promise.all([
    update(cfg => { cfg.count += 1; }),
    update(cfg => { cfg.count *= 3; })
  ]);
  assert.equal(read().count, 3);
});

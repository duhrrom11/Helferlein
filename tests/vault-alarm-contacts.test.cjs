// Ausfuehren: node --test tests/vault-alarm-contacts.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../tools/notizen/index.html'), 'utf8');
function extract(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'Funktionscode fehlt: ' + startMarker);
  return html.slice(start, end);
}
const source = extract('        async function addAlarmPerson()', '        function sendEmailToPerson(');

function setup(initial = []) {
  let stored = { alarmPersons: structuredClone(initial) };
  let queue = Promise.resolve();
  const alerts = [];
  const inputs = {
    newAlarmPersonName: { value: '' },
    newAlarmPersonContact: { value: '' }
  };
  const context = vm.createContext({
    document: { getElementById: id => inputs[id] },
    getVaultConfig: () => structuredClone(stored),
    updateLocalConfig: mutate => {
      const operation = queue.then(() => {
        const cfg = structuredClone(stored);
        mutate(cfg);
        stored = cfg;
        return true;
      });
      queue = operation.then(() => undefined, () => undefined);
      return operation;
    },
    syncVaultToFirebase: async () => false,
    renderAlarmPersons: () => {},
    alert: message => alerts.push(message),
    Math
  });
  vm.runInContext(source + '\nthis.add = addAlarmPerson; this.remove = deleteAlarmPerson;', context);
  return { add: context.add, remove: context.remove, inputs, alerts, read: () => stored };
}

test('zwei unmittelbar hinzugefuegte Kontakte bleiben erhalten', async () => {
  const h = setup();
  h.inputs.newAlarmPersonName.value = 'Anna';
  h.inputs.newAlarmPersonContact.value = 'anna@example.test';
  const first = h.add();
  h.inputs.newAlarmPersonName.value = 'Berta';
  h.inputs.newAlarmPersonContact.value = 'berta@example.test';
  const second = h.add();
  await Promise.all([first, second]);
  assert.deepEqual(h.read().alarmPersons.map(p => p.name), ['Anna', 'Berta']);
  assert.equal(h.alerts.length, 2);
});

test('Loeschen verwendet die ID statt einer veralteten Position', async () => {
  const h = setup([
    { id: 'a', name: 'Anna' },
    { id: 'b', name: 'Berta' },
    { id: 'c', name: 'Clara' }
  ]);
  await Promise.all([h.remove(0), h.remove(1)]);
  assert.deepEqual(h.read().alarmPersons.map(p => p.id), ['c']);
});

test('ungueltiger Index loescht keinen Kontakt', async () => {
  const h = setup([{ id: 'a', name: 'Anna' }]);
  await h.remove(5);
  assert.equal(h.read().alarmPersons.length, 1);
  assert.match(h.alerts[0], /nicht gefunden/);
});

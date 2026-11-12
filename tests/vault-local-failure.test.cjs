// Ausfuehren: node --test tests/vault-local-failure.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../assets/heir-owner-legacy.js'), 'utf8');
function extract(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'Funktionscode fehlt: ' + startMarker);
  return html.slice(start, end);
}
const source = extract('        async function saveSettings()', '        async function addAlarmPerson()')
  + '\n' + extract('        async function performCheckIn()', '        async function updateDeadmanInterval()');

function setup(saveResult) {
  const alerts = [];
  let cloudCalls = 0;
  let renderCalls = 0;
  const cfg = {};
  const inputs = {
    ownerNameInput: { value: 'Testperson' },
    ownerEmailInput: { value: 'test@example.invalid' }
  };
  const context = vm.createContext({
    document: { getElementById: id => inputs[id] },
    updateLocalConfig: async mutate => {
      if (saveResult === 'throw') throw new Error('Speicherfehler');
      if (saveResult === false) return false;
      mutate(cfg);
      return true;
    },
    syncVaultToFirebase: async () => { cloudCalls++; return false; },
    renderApp: () => { renderCalls++; },
    alert: message => alerts.push(message),
    console: { error() {} },
    Date
  });
  vm.runInContext(source + '\nthis.saveSettingsTest = saveSettings; this.checkInTest = performCheckIn;', context);
  return {
    saveSettings: context.saveSettingsTest,
    checkIn: context.checkInTest,
    alerts, cfg,
    cloudCalls: () => cloudCalls,
    renderCalls: () => renderCalls
  };
}

for (const operation of ['saveSettings', 'checkIn']) {
  for (const failure of [false, 'throw']) {
    test(operation + ' bei lokalem Fehler ' + String(failure) + ': keine Cloud und keine Erfolgsmeldung', async () => {
      const h = setup(failure);
      await h[operation]();
      assert.equal(h.cloudCalls(), 0);
      assert.equal(h.renderCalls(), 0);
      assert.equal(h.alerts.length, 1);
      assert.match(h.alerts[0], /konnten? nicht lokal gespeichert werden/);
      assert.doesNotMatch(h.alerts[0], /✅/);
    });
  }
  test(operation + ': erfolgreiche lokale Speicherung versucht Cloud-Sync', async () => {
    const h = setup(true);
    await h[operation]();
    assert.equal(h.cloudCalls(), 1);
    assert.match(h.alerts.at(-1), /nur lokal gespeichert/);
    if (operation === 'checkIn') assert.ok(h.cfg.lastCheckIn);
    else assert.equal(h.cfg.ownerName, 'Testperson');
  });
}

const trusteeSource = extract('        async function saveTrustees()', '        // Render Notfall-Kit Vorschau');

function setupTrustees(mode) {
  const inputs = Object.fromEntries(Array.from({ length: 3 }, (_, i) => [
    [`tName_${i}`, { value: ` Person ${i} ` }],
    [`tRole_${i}`, { value: ` Rolle ${i} ` }]
  ]).flat());
  const alerts = [];
  const errors = [];
  const original = Array.from({ length: 3 }, () => ({ name: 'Alt', role: 'Alt' }));
  let stored = structuredClone(original);
  let cloudCalls = 0;
  const context = vm.createContext({
    document: { getElementById: id => inputs[id] },
    updateLocalConfig: async mutate => {
      const cfg = { trustees: structuredClone(stored) };
      mutate(cfg);
      if (mode === 'throw') throw new Error('Speicherfehler');
      if (mode === false) return false;
      stored = cfg.trustees;
      return true;
    },
    syncVaultToFirebase: async () => {
      cloudCalls++;
      return mode !== 'cloud-fail';
    },
    alert: message => alerts.push(message),
    console: { error: (...args) => errors.push(args) }
  });
  vm.runInContext(trusteeSource + '\nthis.save = saveTrustees;', context);
  return { save: context.save, alerts, errors, inputs, original,
    read: () => stored, cloudCalls: () => cloudCalls };
}

for (const mode of [false, 'throw']) {
  test('Vertrauenspersonen: lokaler Fehler ' + mode + ' verhindert Cloud-Sync', async () => {
    const h = setupTrustees(mode);
    await h.save();
    assert.equal(h.cloudCalls(), 0);
    assert.deepEqual(h.read(), h.original);
    assert.equal(h.inputs.tName_0.value, ' Person 0 ');
    assert.match(h.alerts[0], /konnten nicht lokal gespeichert werden/);
    assert.doesNotMatch(h.alerts[0], /✅/);
    if (mode === 'throw') assert.equal(h.errors.length, 1);
  });
}

test('Vertrauenspersonen: Cloud-Fehler nach lokaler Speicherung wird gemeldet', async () => {
  const h = setupTrustees('cloud-fail');
  await h.save();
  assert.equal(h.cloudCalls(), 1);
  assert.equal(h.read()[0].name, 'Person 0');
  assert.equal(h.read()[2].role, 'Rolle 2');
  assert.match(h.alerts[0], /nur lokal gespeichert/);
});

test('Vertrauenspersonen: erfolgreicher lokaler und Cloud-Speichervorgang', async () => {
  const h = setupTrustees('ok');
  await h.save();
  assert.equal(h.cloudCalls(), 1);
  assert.equal(h.read()[1].name, 'Person 1');
  assert.match(h.alerts[0], /Cloud-Synchronisierung abgeschlossen/);
});

const intervalSource = extract('        async function updateDeadmanInterval()', '        async function saveTrustees()');

function setupInterval(mode) {
  const input = { value: '7' };
  const alerts = [];
  const errors = [];
  let storedInterval = 30;
  let cloudCalls = 0;
  const context = vm.createContext({
    document: { getElementById: id => {
      assert.equal(id, 'deadmanIntervalSelect');
      return input;
    } },
    updateLocalConfig: async mutate => {
      const cfg = { checkInIntervalDays: storedInterval };
      mutate(cfg);
      if (mode === 'throw') throw new Error('Speicherfehler');
      if (mode === false) return false;
      storedInterval = cfg.checkInIntervalDays;
      return true;
    },
    syncVaultToFirebase: async () => {
      cloudCalls++;
      return mode !== 'cloud-fail';
    },
    alert: message => alerts.push(message),
    console: { error: (...args) => errors.push(args) }
  });
  vm.runInContext(intervalSource + '\nthis.saveInterval = updateDeadmanInterval;', context);
  return { save: context.saveInterval, input, alerts, errors,
    storedInterval: () => storedInterval, cloudCalls: () => cloudCalls };
}

for (const mode of [false, 'throw']) {
  test('Check-in-Intervall: lokaler Fehler ' + mode + ' verhindert Cloud-Sync', async () => {
    const h = setupInterval(mode);
    await h.save();
    assert.equal(h.cloudCalls(), 0);
    assert.equal(h.storedInterval(), 30);
    assert.equal(h.input.value, '7');
    assert.match(h.alerts[0], /konnte nicht lokal gespeichert werden/);
    assert.doesNotMatch(h.alerts[0], /✅/);
    if (mode === 'throw') assert.equal(h.errors.length, 1);
  });
}

test('Check-in-Intervall: Cloud-Fehler nach lokaler Speicherung wird gemeldet', async () => {
  const h = setupInterval('cloud-fail');
  await h.save();
  assert.equal(h.storedInterval(), 7);
  assert.equal(h.cloudCalls(), 1);
  assert.match(h.alerts[0], /nur lokal gespeichert/);
  assert.match(h.alerts[0], /NICHT aktualisiert/);
});

test('Check-in-Intervall: erfolgreiche Speicherung ohne Fehlermeldung', async () => {
  const h = setupInterval('ok');
  await h.save();
  assert.equal(h.storedInterval(), 7);
  assert.equal(h.cloudCalls(), 1);
  assert.equal(h.alerts.length, 0);
});

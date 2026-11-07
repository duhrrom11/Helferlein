// Ausfuehren: node --test tests/vault-local-failure.test.cjs
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

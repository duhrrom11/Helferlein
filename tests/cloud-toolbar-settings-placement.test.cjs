'use strict';
// Protect against restoring the legacy cloud toolbar ahead of the tool header.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('shared/helferlein-cloud-migration.js', 'utf8');
const affectedTools = [
  'autokosten-reifenwechsel',
  'backform-umrechner',
  'haushaltsbuch-kassenbon',
  'haustier-gesundheitspass',
  'parkplatz-merker-parkschein-timer',
  'pflanzenpflege-giessplan',
  'umzugskisten-inventar',
  'verliehene-gegenstaende-verwalten',
  'zaehlerstaende-erfassen'
];
test('Cloud controls render in a collapsed settings section, never before the header', () => {
  assert.match(source, /document\.getElementById\('settingsModal'\)/);
  assert.match(source, /document\.getElementById\('settings-modal'\)/);
  assert.match(source, /document\.createElement\('details'\)/);
  assert.match(source, /settingsContent\.append\(settingsDisclosure\)/);
  assert.doesNotMatch(source, /\(target \|\| document\.body\)\.prepend\(host\)/);
});
for (const tool of affectedTools) {
  test(tool + ' has a settings destination for shared cloud controls', () => {
    const html = fs.readFileSync('tools/' + tool + '/index.html', 'utf8');
    assert.match(html, /HelferleinCloudMigration\.mount/);
    assert.match(html, /id="settings(?:Modal|-modal)"/);
    assert.doesNotMatch(html, /Cloud-Sicherung \(optional\)/);
  });
}

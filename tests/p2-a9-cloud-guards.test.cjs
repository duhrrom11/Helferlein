'use strict';
// A9: isolated, read-only source contracts. No Supabase credentials or live requests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'shared', 'helferlein-cloud-migration.js'), 'utf8');

test('anonymous entry exposes optional migration and does not start an upload', () => {
  assert.match(source, /Supabase-Datenübernahme \(freiwillig\)/);
  assert.match(source, /Lokale Daten bleiben unverändert, bis du eine Übernahme bestätigst/);
  assert.match(source, /if \(!data \|\| !data\.user \|\| !data\.user\.id\) throw new Error\('Bitte zuerst anmelden'\)/);
  assert.match(source, /button\('Lokale Daten in Supabase übernehmen', async \(\) => \{/);
  assert.match(source, /await authenticated\(\);[\s\S]*?ensureOnline\(\);/);
});

test('account mismatch remains a blocking dialog, not a cosmetic warning', () => {
  assert.match(source, /blocked\.setAttribute\('role', 'alertdialog'\)/);
  assert.match(source, /blocked\.setAttribute\('aria-modal', 'true'\)/);
  assert.match(source, /Lokale Daten gehören zu einem anderen Konto/);
  assert.match(source, /if \(disposed \|\| accountSwitchInProgress \|\| !!blocked/);
  assert.match(source, /return verifiedOwner === owner/);
});

test('cloud errors and conflicts remain visible to assistive technology', () => {
  assert.match(source, /status\.setAttribute\('role', 'status'\)/);
  assert.match(source, /status\.textContent = 'Fehler: '/);
  assert.match(source, /Keine Daten überschrieben/);
  assert.match(source, /Ausstehende lokale Änderungen müssen zuerst geklärt werden/);
});

test('account changes and offline writes cannot silently enable cloud upload', () => {
  assert.match(source, /localStorage\.getItem\(enabledKey\(user\.id\)\) === 'true'/);
  assert.match(source, /if \(!uid \|\| owner !== uid\) throw new Error/);
  assert.match(source, /ensureOnline\(\)/);
  assert.match(source, /if \(!await isEnabled\(\)\) throw new Error/);
});

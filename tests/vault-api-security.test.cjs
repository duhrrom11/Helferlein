// Statische Sicherheits-Regressionstests. Keine Laufzeit- oder Integrationstests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../supabase/functions/vault-api/index.ts'), 'utf8');

test('API prueft Bearer-Token serverseitig mit Supabase Auth', () => {
  assert.match(source, /request\.headers\.get\("Authorization"\)/);
  assert.match(source, /supabase\.auth\.getUser\(token\)/);
  assert.match(source, /if \(error \|\| !data\.user\)/);
});

test('Eigentuemerabfrage verwendet verifizierte Benutzer-ID', () => {
  assert.match(source, /\.from\("vault_ownership"\)/);
  assert.match(source, /\.eq\("vault_id", vaultId\)/);
  assert.match(source, /\.eq\("owner_user_id", data\.user\.id\)/);
  assert.match(source, /if \(!ownership\)/);
});

test('keine Tresordatenfreigabe nach Eigentuemerkontrolle', () => {
  assert.match(source, /error: "vault_access_not_configured"/);
  assert.doesNotMatch(source, /from ["\x27]npm:firebase-admin|from ["\x27]npm:googleapis|\.collection\(/i);
});

test('JSON-Body hat Byte-Limit und verweigert Uebergroesse', () => {
  assert.match(source, /const MAX_BODY_BYTES = 4096;/);
  assert.match(source, /received \+= value\.byteLength/);
  assert.match(source, /if \(received > MAX_BODY_BYTES\)/);
  assert.match(source, /status: 413/);
});

test('Tresor-ID wird serverseitig auf festes Format begrenzt', () => {
  assert.match(source, /typeof vaultId !== "string"/);
  assert.match(source, /\^v_\[A-Za-z0-9_-\]\{8,80\}\$/);
});

test('CORS und POST-Pruefung sind vorhanden', () => {
  assert.match(source, /https:\/\/duhrrom11\.github\.io/);
  assert.match(source, /request\.method === "OPTIONS"/);
  assert.match(source, /request\.method !== "POST"/);
  assert.match(source, /origin && origin !== ALLOWED_ORIGIN/);
});

test('keine Client-Selbstzuordnung und Service-Key nur aus Umgebung', () => {
  assert.match(source, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
  assert.doesNotMatch(source, /\.insert\(|\.upsert\(|\.update\(/);
  assert.match(source, /Cache-Control": "no-store"/);
});

'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'tools', 'digitaler-nachlass', 'index.html'), 'utf8');
const legacy = fs.readFileSync(path.join(__dirname, '..', 'assets', 'heir-owner-legacy.js'), 'utf8');
const controller = fs.readFileSync(path.join(__dirname, '..', 'assets', 'a10-consent-ui.js'), 'utf8');
assert.match(controller, /const PRODUCTION_RELEASE_ENABLED = false/);
assert.match(controller, /elements\\.forEach\\(el => \\{ el\\.disabled = true/);
const checks = [
  ['read stored vault', /const storedVault = localStorage\.getItem\('digital_estate_vault'\)/],
  ['create only when absent', /if \(storedVault === null\)/],
  ['reject invalid JSON', /catch \(error\) \{\s*throw new Error\("Vorhandene Tresordaten sind nicht lesbar/],
  ['reject invalid config', /typeof cfg !== 'object'/],
  ['reject array config', /Array\.isArray\(cfg\)/],
  ['validate encryption key', /\^\[a-f0-9\]\{64\}\$/],
  ['require encrypted payload', /!cfg\.encryptedData/],
  ['decrypt existing payload', /decryptVaultPayload\(cfg\.encryptedData, currentMasterKeyHex\)/],
  ['require array entries', /!Array\.isArray\(dec\.entries\)/],
  ['fail closed on decryption error', /throw new Error\("Der Tresor konnte nicht entschlüsselt werden/],
  ['retain decrypted vault', /currentDecryptedVault = dec;/],
  ['visible error message', /Tresor gesperrt:/],
  ['accessible alert', /notice\.setAttribute\('role', 'alert'\)/],
  ['A10 migration UI explicitly disabled', /id="a10-migration-panel"[^>]*data-a10-release="disabled"/],
  ['A10 consent disabled', /id="a10-migration-consent"[^>]*disabled/],
  ['A10 controller loaded', /src="\\.\\.\\/\\.\\.\\/assets\\/a10-consent-ui\\.js"/],
  ['A10 backup file disabled', /id="a10-backup-file"[^>]*disabled/],
  ['A10 attestation file disabled', /id="a10-attestation-file"[^>]*disabled/],
  ['A10 preview disabled', /id="a10-migration-preview"[^>]*disabled/],
  ['A10 staging disabled', /id="a10-migration-stage"[^>]*disabled/],
  ['A10 activation disabled', /id="a10-migration-activate"[^>]*disabled/],
  ['A10 no production migration script', /<script[^>]+src="[^"]*a10-migration-flow\\.js"/, true],
  ['no silent empty fallback', /currentDecryptedVault = \(dec && dec\.entries\) \? dec : \{ entries: \[\] \};/, true],
];
for (const [label, pattern, absent] of checks) {
  const source = label.startsWith('A10 ') ? html : legacy;
  assert.equal(pattern.test(source), !absent, label);
}
console.log('Vault fail-closed policy: ' + checks.length + ' assertions passed');

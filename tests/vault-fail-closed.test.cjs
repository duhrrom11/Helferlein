'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'tools', 'digitaler-nachlass', 'index.html'), 'utf8');
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
  ['no silent empty fallback', /currentDecryptedVault = \(dec && dec\.entries\) \? dec : \{ entries: \[\] \};/, true],
];
for (const [label, pattern, absent] of checks) {
  assert.equal(pattern.test(html), !absent, label);
}
console.log('Vault fail-closed policy: ' + checks.length + ' assertions passed');

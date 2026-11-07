// Node.js: node tests/backup-key-policy.test.cjs
// Extract the real production backup policy from index.html (no duplicated allowlist).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('        function isAuthSessionStorageKey(key) {');
const end = html.indexOf('        async function exportGlobalBackup()', start);
assert.ok(start >= 0 && end > start, 'Production backup policy not found');
const source = html.slice(start, end);
const isAllowed = new Function(source + '\nreturn isHelferleinBackupKey;')();
const cases = [
  {
    "key": "hub_favorites",
    "expected": true
  },
  {
    "key": "kassenbon_data",
    "expected": true
  },
  {
    "key": "budgetbuch_budgets",
    "expected": true
  },
  {
    "key": "budgetbuch_goals",
    "expected": true
  },
  {
    "key": "mini_homebox_pro",
    "expected": true
  },
  {
    "key": "wg_flatmates",
    "expected": true
  },
  {
    "key": "wg_notes",
    "expected": true
  },
  {
    "key": "wg_events",
    "expected": true
  },
  {
    "key": "wg_inventory",
    "expected": true
  },
  {
    "key": "wg_cleaning",
    "expected": true
  },
  {
    "key": "sb-avapuibsidubuzxjtyld-auth-token",
    "expected": false
  },
  {
    "key": "sb-avapuibsidubuzxjtyld-auth-token-code-verifier",
    "expected": false
  },
  {
    "key": "supabase.auth.token",
    "expected": false
  },
  {
    "key": "firebase:authUser:demo",
    "expected": false
  },
  {
    "key": "firebase:redirectUser:demo",
    "expected": false
  },
  {
    "key": "firebase:host:demo",
    "expected": false
  },
  {
    "key": "firebase:authEvent:demo",
    "expected": false
  },
  {
    "key": "unrelated_app_token",
    "expected": false
  },
  {
    "key": "random_private_key",
    "expected": false
  },
  {
    "key": "__proto__",
    "expected": false
  }
];
for (const [index, test] of cases.entries()) {
  assert.equal(isAllowed(test.key), test.expected, 'Check ' + (index + 1) + ': ' + test.key);
}
console.log(cases.length + ' backup allowlist regression checks passed');

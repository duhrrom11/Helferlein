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
  },
  { "key": "unknown_personal_data", "expected": false },
  { "key": "wg_active_bin_id", "expected": true },
  { "key": "wg_diets", "expected": true },
  { "key": "wg_shopping", "expected": true },
  { "key": "wg_cooking", "expected": true },
  { "key": "wg_contracts", "expected": true },
  { "key": "wg_infoboard", "expected": true },
  { "key": "digital_estate_vault", "expected": true },
  { "key": "kfz_tracker_pro_v3", "expected": true },
  { "key": "haustier_pass_pro_v5", "expected": true },
  { "key": "park_end_time", "expected": true },
  { "key": "park_history_pro_v3", "expected": true },
  { "key": "verleih_tracker_pro_v3", "expected": true },
  { "key": "dismiss_frost", "expected": true },
  { "key": "pflanzen_pass_v10", "expected": true },
  { "key": "energie_tracker_pro_v8", "expected": true },
  { "key": "helperly_recipes_pro", "expected": true },
  { "key": "constructor", "expected": false },
  { "key": "prototype", "expected": false },
  { "key": "sb-other-project-auth-token", "expected": false }
];
for (const [index, test] of cases.entries()) {
  assert.equal(isAllowed(test.key), test.expected, 'Check ' + (index + 1) + ': ' + test.key);
}
console.log(cases.length + ' backup allowlist regression checks passed');

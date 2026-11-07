'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const begin = html.indexOf('function isAuthSessionStorageKey(key)');
const end = html.indexOf('async function exportGlobalBackup()', begin);
assert(begin >= 0 && end > begin, 'Backup policy missing');
const policy = html.slice(begin, end);
const context = vm.createContext({});
vm.runInContext(policy + '\nthis.checkKey = isHelferleinBackupKey;', context);
const cases = [
  [
    "hub_favorites",
    true
  ],
  [
    "kassenbon_data",
    true
  ],
  [
    "budgetbuch_budgets",
    true
  ],
  [
    "budgetbuch_goals",
    true
  ],
  [
    "mini_homebox_pro",
    true
  ],
  [
    "wg_active_bin_id",
    true
  ],
  [
    "wg_flatmates",
    true
  ],
  [
    "wg_notes",
    true
  ],
  [
    "wg_events",
    true
  ],
  [
    "wg_inventory",
    true
  ],
  [
    "wg_diets",
    true
  ],
  [
    "wg_cleaning",
    true
  ],
  [
    "wg_shopping",
    true
  ],
  [
    "wg_cooking",
    true
  ],
  [
    "wg_contracts",
    true
  ],
  [
    "wg_infoboard",
    true
  ],
  [
    "digital_estate_vault",
    true
  ],
  [
    "kfz_tracker_pro_v3",
    true
  ],
  [
    "haustier_pass_pro_v5",
    true
  ],
  [
    "park_end_time",
    true
  ],
  [
    "park_history_pro_v3",
    true
  ],
  [
    "verleih_tracker_pro_v3",
    true
  ],
  [
    "dismiss_frost",
    true
  ],
  [
    "pflanzen_pass_v10",
    true
  ],
  [
    "energie_tracker_pro_v8",
    true
  ],
  [
    "helperly_recipes_pro",
    true
  ],
  [
    "sb-abc-auth-token",
    false
  ],
  [
    "supabase.auth.token",
    false
  ],
  [
    "firebase:authUser:123",
    false
  ],
  [
    "refresh_token",
    false
  ],
  [
    "access_token",
    false
  ],
  [
    "session_id",
    false
  ],
  [
    "password",
    false
  ],
  [
    "secret",
    false
  ],
  [
    "private_key",
    false
  ],
  [
    "__proto__",
    false
  ],
  [
    "constructor",
    false
  ],
  [
    "prototype",
    false
  ],
  [
    "unrelated_site_key",
    false
  ],
  [
    "unknown_tool_key",
    false
  ],
  [
    "auth-token",
    false
  ],
  [
    "pkce_verifier",
    false
  ]
];
for (const [key, expected] of cases) {
    assert.equal(context.checkKey(key), expected, 'Unexpected backup policy for ' + key);
}
assert.match(html, /!isHelferleinBackupKey\(key\)\) continue/, 'Export must use allowlist');
assert.match(html, /entries\.filter\(\(\[key\]\) => !isHelferleinBackupKey\(key\)\)/, 'Import must reject unsupported keys');
assert.match(html, /if \(rejected\.length\)/, 'Import must fail closed');
assert.match(html, /containsVault/, 'Vault backup warning missing');
assert.match(html, /if \(!confirm\(warning\)\) return/, 'Export confirmation missing');
console.log('Backup policy OK: ' + cases.length + ' key cases and 5 integration checks');

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
  ["wg_last_loaded_bin_id", true],
  ["wg_kassenbon_data", true],
  ["wg_budgetbuch_budgets", true],
  ["wg_budgetbuch_goals", true],
  ["helferlein_ui_theme_v1", true],
  ["helferlein_ui_layout_nachlass_v1", true],
  ["helferlein_ui_layout_backform_v1", true],
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
assert.match(html, /const supported = entries\.filter\(\(\[key\]\) => isHelferleinBackupKey\(key\)\)/, 'Import must allowlist restored keys');
assert.match(html, /containsVault/, 'Vault backup warning missing');
assert.match(html, /if \(!confirm\(warning\)\) return/, 'Export confirmation missing');

// Legacy backups may contain unrelated storage keys: never write them.
assert.match(html, /for \(const \[key, value\] of supported\)/, 'Only supported keys may be written');
assert.match(html, /if \(!supported\.length\)/, 'No supported keys must abort import');
assert.match(html, /rejected\.length[\s\S]*?NICHT importiert/, 'Ignored entries must be disclosed before confirmation');
assert.match(html, /const previous = supported\.map/, 'Capture previous values before import');
assert.match(html, /catch \(writeError\)/, 'Handle partial write failures');
assert.match(html, /localStorage\.removeItem\(key\)/, 'Rollback newly inserted keys');
assert.match(html, /localStorage\.setItem\(key, oldValue\)/, 'Rollback overwritten keys');
assert.match(html, /rollbackFailed/, 'Report incomplete rollback');
assert.match(html, /nicht unterstützte Einträge wurden übersprungen/, 'Report skipped keys after success');
assert.match(html, /if \(!confirm\(/, 'Import must require user confirmation');

assert.match(html, /if \(containsVault && !encrypted\)/, 'Vault backup must never export as plaintext');
assert.match(html, /requestBackupPassword\("Neues Backup-Passwort/, 'Encryption must use masked password entry');
assert.match(html, /plaintext\.byteLength > 20 \* 1024 \* 1024/, 'Decrypted backup must be size-bounded');
assert.match(html, /entries\.length > 500/, 'Reject excessive restore entries');
assert.match(html, /new Date\(backup\.created\)\.toLocaleString/, 'Show backup date before overwrite');
assert.match(html, /Die Sicherung könnte unvollständig sein/, 'Warn before incomplete backup export');
assert.match(html, /const changed = supported\.filter/, 'Show changed local data before restore');
assert.match(html, /if \(vaultChanged && !confirm\(/, 'Require extra confirmation for vault replacement');
console.log('Backup policy OK: ' + cases.length + ' key cases and 15 integration checks');

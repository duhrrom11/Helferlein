'use strict';
// Static guardrails for the read-only night coordinator.
// Does not contact production services or modify user data.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const workflow = fs.readFileSync('.github/workflows/night-coordinator.yml','utf8');
const script = fs.readFileSync('scripts/night-coordinator.cjs','utf8');
assert.match(workflow,/cron: '\*\/5 \* \* \* \*'/);
assert.match(workflow,/contents: read/);
assert.match(workflow,/issues: write/);
assert.doesNotMatch(workflow,/contents: write|deployments: write|pull-requests: write/);
assert.match(workflow,/persist-credentials: false/);
assert.match(workflow,/cancel-in-progress: false/);
assert.match(script,/timeZone: 'Europe\/Berlin'/);
assert.doesNotMatch(script,/Outside Berlin night window/);
assert.match(script,/hour>=6 && !manual && state.lastReportDay!==localDay/);
assert.match(script,/day===localDay && !x.manual/);
assert.match(script,/result,manual/);
assert.match(script,/req\.setTimeout\(15000/);
assert.match(script,/method!=='GET'/);
assert.match(script,/attempt>=2/);
assert.match(script,/GITHUB_STEP_SUMMARY/);
assert.match(script,/if \(failedCheck\) process\.exitCode=1/);
assert.match(script,/Invalid night checkpoint/);
assert.match(script,/refusing to create a duplicate checkpoint/);
assert.doesNotMatch(script,/SUPABASE_SERVICE_ROLE_KEY|supabase db push|supabase functions deploy/);

const scoped=script.slice(script.indexOf('const checks = ['),script.indexOf('function encodeState'));
assert.match(scoped,/wishlist-syntax/);
assert.match(scoped,/wishlist-unit/);
assert.match(scoped,/wishlist-public-safety/);
assert.match(scoped,/wishlist-release/);
assert.doesNotMatch(scoped,/tools\/|vault-api|wg-organisator|release-smoke|supabase\/migrations|supabase-produktivabnahme/);
assert.match(script,/Helferlein Wunschliste – Nachtschicht-Arbeitsstand/);
console.log('Wishlist-only night coordinator guardrails: OK');

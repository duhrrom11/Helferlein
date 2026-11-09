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
// Keep the continuous coordinator read-only and bounded even as tasks expand.
assert.match(workflow,/timeout-minutes: 4/);
assert.match(workflow,/node --check scripts\/night-coordinator\.cjs/);
assert.match(workflow,/node --check scripts\/night-coordinator-guardrails\.cjs/);
assert.doesNotMatch(workflow,/\b(?:actions|id-token|packages|checks|statuses): write\b/);
assert.doesNotMatch(workflow,/\b(?:gh pr merge|git push|supabase db push|supabase functions deploy)\b/);
assert.match(script,/timeZone: 'Europe\/Berlin'/);
assert.doesNotMatch(script,/Outside Berlin night window/);
assert.match(script,/Invalid night checkpoint/);
assert.match(script,/refusing to create a duplicate checkpoint/);
assert.doesNotMatch(script,/SUPABASE_SERVICE_ROLE_KEY|supabase db push|supabase functions deploy/);
console.log('Night coordinator static guardrails: OK');

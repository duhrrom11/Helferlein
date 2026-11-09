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
assert.match(script,/Invalid night checkpoint/);
assert.match(script,/refusing to create a duplicate checkpoint/);
assert.doesNotMatch(script,/SUPABASE_SERVICE_ROLE_KEY|supabase db push|supabase functions deploy/);
console.log('Night coordinator static guardrails: OK');

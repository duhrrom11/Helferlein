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
// The step summary must render Markdown paragraphs, not literal backslash-n text.
const summaryLine = script.split('\n').find(line => line.includes('fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY'));
assert.ok(summaryLine, 'GitHub step summary write missing');
assert.ok(summaryLine.includes(String.raw`'### Helferlein-Koordinator\n\n'`), 'Summary heading needs paragraph breaks');
assert.ok(summaryLine.includes(String.raw`+summary+'\n\n[Status-Issue]`), 'Status link needs paragraph breaks');
assert.ok(!summaryLine.includes(String.raw`\\n`), 'Literal escaped newlines must not reach the summary');
console.log('Night coordinator static guardrails: OK');

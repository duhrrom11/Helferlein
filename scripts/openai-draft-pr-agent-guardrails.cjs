'use strict';
// Static, offline safety checks for the manually triggered Draft-PR agent.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const workflow = fs.readFileSync('.github/workflows/openai-draft-pr-agent.yml', 'utf8');
assert.match(workflow, /workflow_dispatch:/);
assert.doesNotMatch(workflow, /^\s*schedule:/m);
assert.match(workflow, /^  contents: write$/m);
assert.match(workflow, /^  pull-requests: write$/m);
assert.doesNotMatch(workflow, /^\s*(?:deployments|id-token|actions|issues|packages): write$/m);
assert.match(workflow, /persist-credentials: false/);
assert.match(workflow, /timeout-minutes: 5/);
assert.match(workflow, /node --check scripts\/openai-draft-pr-agent\.cjs/);
assert.match(workflow, /node scripts\/openai-draft-pr-agent\.cjs/);
assert.match(workflow, /Verify strict output allowlist/);
assert.match(workflow, /git diff --cached --name-only/);
assert.match(workflow, /gh pr create --draft/);
assert.doesNotMatch(workflow, /\b(?:gh pr merge|supabase db push|supabase functions deploy)\b/);
console.log('Draft-PR agent workflow guardrails: OK');

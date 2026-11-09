'use strict';
// Offline static guardrails: never call external APIs or inspect secret values.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const workflow = fs.readFileSync('.github/workflows/openai-readonly-agent.yml', 'utf8');
const agent = fs.readFileSync('scripts/openai-readonly-agent.cjs', 'utf8');
assert.match(workflow, /permissions:\s*\n\s+contents: read\s*\n/);
assert.doesNotMatch(workflow, /\b(?:contents|issues|pull-requests|deployments|actions|packages): write\b/);
assert.match(workflow, /persist-credentials: false/);
assert.match(workflow, /timeout-minutes: 4/);
assert.match(workflow, /node --check scripts\/openai-readonly-agent\.cjs/);
assert.match(agent, /store:false/);
assert.match(agent, /max_output_tokens:2500/);
assert.match(agent, /new AbortController\(\)/);
assert.doesNotMatch(agent, /SUPABASE_SERVICE_ROLE_KEY|supabase db push|supabase functions deploy|git push|gh pr merge/);
console.log('Read-only agent workflow guardrails: OK');

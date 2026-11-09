'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const runnerPath = path.resolve(__dirname, '../scripts/run-regressions.cjs');
const source = fs.readFileSync(runnerPath, 'utf8');
new vm.Script(source, { filename: runnerPath });
const expected = [
  'wg-cache','household-csv','household-backup','household-render',
  'household-ics','household-storage','household-warranty','household-date',
  'household-photo-removal','household-ocr','household-photo-validation',
  'household-receipt-id','household-ocr-total','household-pdf-summary',
  'household-all-csv','household-duplicate'
];
for (const name of expected) {
  const file = path.resolve(__dirname, name + '-regression.cjs');
  assert.ok(fs.existsSync(file), 'Missing regression file: ' + file);
  assert.ok(source.includes("'" + name + "'"), 'Runner omits regression: ' + name);
}
assert.equal(expected.length, 16);
assert.match(source, /timeout:\s*timeoutMs/, 'Runner must bound child execution');
assert.match(source, /maxBuffer:\s*maxOutputBytes/, 'Runner must bound child output');
assert.match(source, /if \(failures\.length\) process\.exitCode = 1/, 'Runner must fail on any failed child');
assert.match(source, /GITHUB_STEP_SUMMARY/, 'Runner must publish CI summary');
assert.match(source, /ETIMEDOUT/, 'Runner must identify timeouts');
assert.match(source, /ENOBUFS/, 'Runner must identify output overflow');
assert.match(source, /result\.signal/, 'Runner must handle signal termination');
console.log('Regression runner guardrails passed (16 files and 7 safety conditions)');

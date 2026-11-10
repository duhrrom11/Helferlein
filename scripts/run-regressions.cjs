'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const names = [
  'wg-cache','household-csv','household-backup','household-render',
  'household-ics','household-storage','household-warranty','household-date',
  'household-photo-removal','household-ocr','household-photo-validation',
  'household-receipt-id','household-ocr-total','household-pdf-summary',
  'household-all-csv','household-duplicate'
];
const results = [];
const timeoutMs = 30000;
const maxOutputBytes = 2 * 1024 * 1024;
const suiteStarted = Date.now();
for (const name of names) {
  const file = 'tests/' + name + '-regression.cjs';
  const started = Date.now();
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '..', file)], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    timeout: timeoutMs, maxBuffer: maxOutputBytes
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const passed = result.status === 0 && !result.error && !result.signal;
  const duration = Date.now() - started;
  const reason = passed ? 'ok' : result.error?.code === 'ETIMEDOUT' ? 'timeout' : result.error?.code === 'ENOBUFS' ? 'output limit' : result.error ? result.error.code || 'launch error' : result.signal ? 'signal ' + result.signal : 'exit ' + result.status;
  results.push({ file, passed, duration, reason });
  console.log((passed ? 'PASS ' : 'FAIL ') + file + ' (' + duration + ' ms, ' + reason + ')');
}
const failures = results.filter(item => !item.passed);
const summary = [
  '### Offline regression suite', '',
  '| Check | Result | Duration | Reason |', '| --- | --- | ---: | --- |',
  ...results.map(item => '| ' + item.file + ' | ' + (item.passed ? 'PASS' : 'FAIL') + ' | ' + item.duration + ' ms | ' + item.reason + ' |'),
  '', '**' + (results.length - failures.length) + '/' + results.length + ' passed** in ' + (Date.now() - suiteStarted) + ' ms',
  failures.length ? 'Failed: ' + failures.map(item => item.file).join(', ') : 'All checks passed.'
].join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) {
  try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary); }
  catch (error) { console.error('Summary write failed:', error.message); }
}
console.log(summary);
if (failures.length) process.exitCode = 1;

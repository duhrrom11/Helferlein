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
for (const name of names) {
  const file = 'tests/' + name + '-regression.cjs';
  const started = Date.now();
  const result = spawnSync(process.execPath, [path.resolve(__dirname, '..', file)], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8',
    timeout: 30000, maxBuffer: 2 * 1024 * 1024
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  const passed = result.status === 0 && !result.error && !result.signal;
  const duration = Date.now() - started;
  results.push({ file, passed, duration });
  console.log((passed ? 'PASS ' : 'FAIL ') + file + ' (' + duration + ' ms)');
}
const failures = results.filter(item => !item.passed);
const summary = [
  '### Offline regression suite', '',
  '| Check | Result | Duration |', '| --- | --- | ---: |',
  ...results.map(item => '| ' + item.file + ' | ' + (item.passed ? 'PASS' : 'FAIL') + ' | ' + item.duration + ' ms |'),
  '', '**' + (results.length - failures.length) + '/' + results.length + ' passed**'
].join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) {
  try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary); }
  catch (error) { console.error('Summary write failed:', error.message); }
}
console.log(summary);
if (failures.length) process.exitCode = 1;

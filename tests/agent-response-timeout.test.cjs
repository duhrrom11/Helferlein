'use strict';
// Offline structural regression: the API response body must be consumed
// before the 90-second timeout is cleared. No API calls or secrets.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

for (const name of ['openai-draft-pr-agent.cjs', 'openai-readonly-agent.cjs']) {
  test(name + ' retains abort timeout through JSON parsing', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', name), 'utf8');
    const start = source.indexOf('async function main()');
    assert.notEqual(start, -1, 'main function missing');
    const main = source.slice(start);
    const fetchPos = main.indexOf("await fetch('https://api.openai.com/v1/responses'");
    const jsonPos = main.indexOf('await res.json()', fetchPos) >= 0
      ? main.indexOf('await res.json()', fetchPos)
      : main.indexOf('await response.json()', fetchPos);
    const finallyPos = main.indexOf('finally {clearTimeout(timeout);}', fetchPos);
    assert.ok(fetchPos >= 0, 'expected API request missing');
    assert.ok(jsonPos > fetchPos, 'JSON parsing must follow fetch');
    assert.ok(finallyPos > jsonPos, 'timeout must be cleared only after JSON parsing');
    assert.match(main.slice(0, fetchPos), /setTimeout\(\(\)=>\w+\.abort\(\),90000\)/,
      '90-second abort timer missing');
  });
}

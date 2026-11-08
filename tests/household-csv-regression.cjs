const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('tools/haushaltsbuch-kassenbon/index.html', 'utf8');
const start = html.indexOf('function steuerCsvFeld(value)');
const end = html.indexOf('function exportSteuerCSV()', start);
assert.ok(start >= 0 && end > start, 'Tax CSV escaping function exists');
const context = vm.createContext({});
vm.runInContext(html.slice(start, end), context);
const csv = value => vm.runInContext('steuerCsvFeld(' + JSON.stringify(value) + ')', context);
assert.equal(csv('Hallo; Welt'), '"Hallo; Welt"');
assert.equal(csv('Ein "Zitat"'), '"Ein ""Zitat"""');
assert.equal(csv('Zeile\nzwei'), '"Zeile\nzwei"');
assert.equal(csv('=1+1'), '"\'=1+1"');
assert.equal(csv('  @SUM(A1)'), '"\'  @SUM(A1)"');
assert.equal(csv(null), '""');
console.log('Household tax CSV regression checks passed');

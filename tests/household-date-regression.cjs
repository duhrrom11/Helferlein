const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('tools/haushaltsbuch-kassenbon/index.html', 'utf8');
const start = html.indexOf('function parseReceiptDate(');
const end = html.indexOf('function renderApp()', start);
assert.ok(start >= 0 && end > start);
const ctx = vm.createContext({Date});
vm.runInContext(html.slice(start, end), ctx);
const run = value => vm.runInContext('parseReceiptDate(' + JSON.stringify(value) + ')', ctx);
assert.equal(run('2024-02-29').getFullYear(), 2024);
assert.equal(run('2024-02-29').getMonth(), 1);
assert.equal(run('2024-02-29').getDate(), 29);
assert.equal(run('2024-02-29').getHours(), 12);
for (const value of ['2025-02-29', '2025-02-31', '2025-13-01', '2025-00-10', '2025-01-00', '2025-1-1', 'not-a-date']) {
    assert.equal(Number.isFinite(run(value).getTime()), false, value);
}
const expiry = vm.runInContext("addWarrantyMonths(parseReceiptDate('2025-01-31'), 1)", ctx);
assert.equal(expiry.getMonth(), 1);
assert.equal(expiry.getDate(), 28);
const sortStart = html.indexOf('data.sort((a, b) =>');
const sortEnd = html.indexOf('if (!saveData(data)) return;', sortStart);
assert.ok(sortStart >= 0 && sortEnd > sortStart, 'receipt sorting found');
const sortSource = html.slice(sortStart, sortEnd);
assert.match(sortSource, /parseReceiptDate\(a\.date\)/);
assert.match(sortSource, /parseReceiptDate\(b\.date\)/);
console.log('Receipt local-date regression checks passed');

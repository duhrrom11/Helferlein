const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('tools/haushaltsbuch-kassenbon/index.html', 'utf8');
const start = html.indexOf('function getData()');
const end = html.indexOf('function updateFormUI()', start);
assert.ok(start >= 0 && end > start, 'storage functions found');
const source = html.slice(start, end);
const stored = new Map();
let failWrites = false;
const alerts = [];
const localStorage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => {
        if (failWrites) throw new Error('QuotaExceededError');
        stored.set(key, value);
    }
};
const ctx = vm.createContext({localStorage, alert: msg => alerts.push(msg), console: {error() {}}});
vm.runInContext(source, ctx);
const run = expression => vm.runInContext(expression, ctx);
assert.equal(run('getData().length'), 0);
assert.equal(run('Object.keys(getBudgets()).length'), 0);
assert.equal(run('getSavingsGoals().length'), 0);
stored.set('kassenbon_data', '{}');
stored.set('budgetbuch_budgets', '[]');
stored.set('budgetbuch_goals', '{}');
assert.equal(run('getData().length'), 0);
assert.equal(run('Object.keys(getBudgets()).length'), 0);
assert.equal(run('getSavingsGoals().length'), 0);
assert.equal(run('saveData([{id:1}])'), true);
assert.equal(run('getData().length'), 1);
failWrites = true;
assert.equal(run('saveData([])'), false);
assert.equal(run('saveBudgets({})'), false);
assert.equal(run('saveSavingsGoals([])'), false);
assert.equal(run('getData().length'), 1, 'failed write retains existing data');
assert.equal(alerts.length, 3);
console.log('Household storage regression checks passed');

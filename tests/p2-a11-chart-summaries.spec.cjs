'use strict';
const {test, expect} = require('./helpers/p2-browser-safety.cjs');
const fs = require('node:fs');
const path = require('node:path');

// Execute the unchanged production summary calculation in a detached browser DOM.
// No app initialization, login, network API, localStorage writes or production records.
for (const tool of ['wg-organisator', 'haushaltsbuch-kassenbon']) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'tools', tool, 'index.html'), 'utf8');
  const start = html.indexOf('            // Text alternatives share the exact calculated values used by the charts.');
  const end = html.indexOf('            const budgetContainer = document.getElementById(', start);
  if (start < 0 || end < 0) throw new Error('Missing production summary block: ' + tool);
  const productionSummaryCode = html.slice(start, end);

  test(tool + ' – accessible chart descriptions reference live summary text', async ({page}) => {
    const chartMarkup = ['categoryChart', 'cashflowChart'].map(id => {
      const match = html.match(new RegExp('<canvas id="' + id + '"[^>]*><\\/canvas>'));
      if (!match) throw new Error('Missing production canvas: ' + tool + '/' + id);
      return match[0] + '<p id="' + id + 'Summary"></p>';
    }).join('');
    await page.goto('http://127.0.0.1:8765/index.html', {waitUntil:'domcontentloaded'});
    await page.setContent('<main>' + chartMarkup + '</main>');
    const scenarios = [
      {categories:{}, income:0, expense:0},
      {categories:{Lebensmittel:12.5}, income:20, expense:12.5},
      {categories:{Wohnen:99.99}, income:30, expense:99.99},
      {categories:{}, income:0, expense:0}
    ];
    let previousDescriptions = null;
    for (const scenario of scenarios) {
      await page.evaluate(({code, scenario}) => {
        new Function('categoryExpenses', 'totalIncome', 'totalExpense', code)(
          scenario.categories, scenario.income, scenario.expense
        );
      }, {code:productionSummaryCode, scenario});
      const descriptions = [];
      for (const id of ['categoryChart', 'cashflowChart']) {
        const canvas = page.locator('#' + id);
        await expect(canvas).toHaveAttribute('role', 'img');
        await expect(canvas).toHaveAttribute('aria-describedby', id + 'Summary');
        await expect(canvas).toHaveAccessibleName(/Diagramm:/);
        const summary = await page.locator('#' + id + 'Summary').textContent();
        expect(summary.length).toBeGreaterThan(10);
        await expect(canvas).toHaveAccessibleDescription(summary);
        descriptions.push(summary);
      }
      if (previousDescriptions) expect(descriptions).not.toEqual(previousDescriptions);
      previousDescriptions = descriptions;
    }
  });

  test(tool + ' – isolated real chart summaries: zero, values, updates, injection', async ({page}) => {
  test(tool + ' – isolated real chart summaries: zero, values, updates, injection', async ({page}) => {
    await page.goto('http://127.0.0.1:8765/index.html', {waitUntil:'domcontentloaded'});
    await page.setContent('<main><p id="categoryChartSummary"></p><p id="cashflowChartSummary"></p></main>');
    const scenarios = [
      {categories:{}, income:0, expense:0, empty:true},
      {categories:{Lebensmittel:12.5, Wohnen:100}, income:200, expense:112.5},
      {categories:{'<img src=x onerror=alert(1)>':3, Lebensmittel:0}, income:1, expense:3},
      {categories:{Energie:7}, income:0, expense:7}
    ];
    for (const scenario of scenarios) {
      await page.evaluate(({code, scenario}) => {
        // The extracted production block runs with only synthetic in-memory values.
        const execute = new Function('categoryExpenses', 'totalIncome', 'totalExpense', code);
        execute(scenario.categories, scenario.income, scenario.expense);
      }, {code:productionSummaryCode, scenario});
      const category = await page.locator('#categoryChartSummary').textContent();
      const cashflow = await page.locator('#cashflowChartSummary').textContent();
      if (scenario.empty) expect(category).toBe('Keine Ausgaben in diesem Monat.');
      else for (const [name, value] of Object.entries(scenario.categories)) {
        if (value > 0) {
          expect(category).toContain(name);
          expect(category).toContain(value.toLocaleString('de-DE', {style:'currency',currency:'EUR'}));
        } else expect(category).not.toContain(name);
      }
      expect(cashflow).toContain(scenario.income.toLocaleString('de-DE', {style:'currency',currency:'EUR'}));
      expect(cashflow).toContain(scenario.expense.toLocaleString('de-DE', {style:'currency',currency:'EUR'}));
      expect(cashflow).toContain((scenario.income-scenario.expense).toLocaleString('de-DE', {style:'currency',currency:'EUR'}));
      expect(await page.locator('#categoryChartSummary img').count()).toBe(0);
    }
    expect(await page.locator('#categoryChartSummary').textContent()).not.toContain('Lebensmittel');
  });
}

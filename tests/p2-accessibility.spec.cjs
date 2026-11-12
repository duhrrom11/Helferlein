'use strict';
const {test, expect} = require('./helpers/p2-browser-safety.cjs');
const fs = require('node:fs');
const AxeBuilder = require('@axe-core/playwright').default;
const home = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const routes = ['index.html', ...new Set([...home.matchAll(/href="(tools\/[^"#]+\/index.html)"/g)].map(match => match[1]))];
for (const width of [320, 375, 768]) for (const route of routes) {
  test(`${route} – reflow, names, navigation and settings at ${width}px`, async ({page}, testInfo) => {
    await page.setViewportSize({width, height:900});
    await page.goto('http://127.0.0.1:8765/' + route, {waitUntil:'networkidle'});
    // Refuse to turn missing external CSS into false audit evidence.
    expect(await page.locator('body').evaluate(el => getComputedStyle(el).margin)).toBe('0px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await expect(page.getByRole('heading', {level:1})).toHaveCount(1);
    if (route !== 'index.html') {
      const homeLink = page.locator('header').getByRole('link', {name:'Helferlein Startseite'});
      await expect(homeLink).toBeVisible();
      await expect(homeLink).toHaveAttribute('href', '../../index.html');
    }
    const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    await testInfo.attach('wcag-observations', {body:JSON.stringify(results.violations,null,2),contentType:'application/json'});
    // Other recorded failures remain explicit findings; do not claim full WCAG compliance.
    expect(results.violations.filter(item => ['label','select-name','scrollable-region-focusable'].includes(item.id))).toEqual([]);
    await page.screenshot({path:testInfo.outputPath('entry.png'),fullPage:true});
    await page.getByRole('button', {name:'Einstellungen öffnen',exact:true}).click();
    const settings = page.locator('#settingsModal, #settings-modal');
    if (await settings.count()) {
      await expect(settings).toBeVisible();
      await expect(settings).toHaveAttribute('role','dialog');
      expect(await settings.evaluate(el=>el.contains(document.activeElement))).toBe(true);
      // Traverse both wrap boundaries, rather than only testing the opening focus.
      await page.keyboard.press('Shift+Tab');
      expect(await settings.evaluate(el=>el.contains(document.activeElement))).toBe(true);
      await page.keyboard.press('Tab');
      expect(await settings.evaluate(el=>el.contains(document.activeElement))).toBe(true);
      await page.screenshot({path:testInfo.outputPath('settings.png')});
      await page.keyboard.press('Escape');
      await expect(settings).toBeHidden();
      await expect(page.getByRole('button', {name:'Einstellungen öffnen',exact:true})).toBeFocused();
    } else await expect(page.locator('#section-settings')).toBeVisible();
    if (route !== 'index.html') {
      await page.locator('header').getByRole('link', {name:'Helferlein Startseite'}).click();
      await expect(page.locator('#toolsGrid .tool-card')).toHaveCount(11);
    }
  });
}

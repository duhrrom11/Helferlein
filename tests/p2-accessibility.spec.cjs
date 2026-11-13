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
    // This gate covers the audited entry states, not full WCAG conformance.
    expect(results.violations.filter(item => ['label','select-name','scrollable-region-focusable','color-contrast','target-size'].includes(item.id))).toEqual([]);
    const missingVisibleLabels = await page.locator('main input[placeholder],main textarea[placeholder]').evaluateAll(nodes => nodes
      .filter(node => node.getClientRects().length && node.type !== 'hidden')
      .filter(node => !Array.from(node.labels).some(label => label.getClientRects().length && label.textContent.trim()))
      .map(node => node.id));
    expect(missingVisibleLabels).toEqual([]);
    await page.screenshot({path:testInfo.outputPath('entry.png'),fullPage:true});
    if (route === 'tools/digitaler-nachlass/index.html') {
      await expect(page.locator('#login-panel')).toBeVisible();
      await expect(page.locator('#owner-app')).toBeHidden();
      await page.locator('header').getByRole('link', {name:'Helferlein Startseite'}).click();
      await expect(page.locator('#toolsGrid .tool-card')).toHaveCount(11);
      return; // Owner settings require a password; the authenticated estate suite covers them.
    }
    await page.getByRole('button', {name:'Einstellungen öffnen',exact:true}).click();
    const settings = page.locator('#settingsModal, #settings-modal');
    if (await settings.count()) {
      await expect(settings).toBeVisible();
      await expect(settings).toHaveAttribute('role','dialog');
      await expect(settings.locator('input[type="email"]')).toHaveAccessibleName(/E-Mail/i);
      await expect(settings.locator('input[type="password"]')).toHaveAccessibleName(/Passwort/i);
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

for (const route of routes) {
  test(`${route} – dark entry contrast`, async ({page}, testInfo) => {
    await page.setViewportSize({width:375,height:900});
    await page.emulateMedia({colorScheme:'dark'});
    await page.goto('http://127.0.0.1:8765/' + route, {waitUntil:'networkidle'});
    const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    await testInfo.attach('dark-wcag-observations', {body:JSON.stringify(results.violations,null,2),contentType:'application/json'});
    expect(results.violations.filter(item => item.id === 'color-contrast')).toEqual([]);
    await page.screenshot({path:testInfo.outputPath('dark-entry.png'),fullPage:true});
  });
}

test('WG onboarding keeps unavailable actions out of keyboard focus', async ({page}) => {
  await page.setViewportSize({width:320,height:900});
  await page.goto('http://127.0.0.1:8765/tools/wg-organisator/index.html',{waitUntil:'networkidle'});
  await expect(page.getByRole('button',{name:/Private WG erstellen/})).toBeVisible();
  const save = page.locator('#saveBtn');
  await save.evaluate(node => node.focus());
  await expect(save).not.toBeFocused();
  for (const id of ['receiptIsFixkosten','receiptIsTax']) {
    const bounds = await page.locator('#'+id).boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(24);
    expect(bounds.height).toBeGreaterThanOrEqual(24);
  }
  await page.getByRole('button',{name:'Einstellungen öffnen',exact:true}).click();
  await expect(page.locator('#settingsModal')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('wg_active_bin_id'))).toBeNull();
});

test('Car field labels persist and conditional fuel fields follow their inputs', async ({page}) => {
  await page.setViewportSize({width:320,height:900});
  await page.goto('http://127.0.0.1:8765/tools/autokosten-reifenwechsel/index.html',{waitUntil:'networkidle'});
  await page.locator('#carName').fill('Nur lokal geprüft');
  await expect(page.locator('label[for="carName"] .helferlein-field-label')).toHaveText('Fahrzeugname');
  await page.locator('#eventType').selectOption('Tanken');
  for (const id of ['eventKm','eventLitres']) await expect(page.locator('label[for="'+id+'"]')).toBeVisible();
  await page.locator('#eventType').selectOption('TÜV / HU');
  for (const id of ['eventKm','eventLitres']) await expect(page.locator('label[for="'+id+'"]')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
});

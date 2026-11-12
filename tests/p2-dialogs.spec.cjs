'use strict';
const {test, expect} = require('./helpers/p2-browser-safety.cjs');
const {cases, openDialog} = require('./helpers/p2-dialog-cases.cjs');
const AxeBuilder = require('@axe-core/playwright').default;
const base = 'http://127.0.0.1:8765/tools/';
const matrix = [[320,'light'],[375,'light'],[768,'light'],[375,'dark']];

for (const [width, theme] of matrix) for (const item of cases) {
  test(item.tool+'/'+item.id+' at '+width+'px '+theme, async ({page}, testInfo) => {
    await page.setViewportSize({width, height:900});
    await page.emulateMedia({colorScheme:theme});
    await page.goto(base + item.tool + '/index.html', {waitUntil:'networkidle'});
    expect(await page.locator('body').evaluate(node => getComputedStyle(node).margin)).toBe('0px');
    const returnTo = await openDialog(page, item);
    const dialog = page.locator('#' + item.id);
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAccessibleName(/\S/);
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    // Both wrap boundaries plus a programmatic attempt to focus the background.
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    await page.locator('header a').evaluate(node => node.focus());
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
    const bounds = await dialog.locator(':scope > div').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(901);
    const results = await new AxeBuilder({page}).include('#'+item.id)
      .withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    await testInfo.attach('dialog-wcag-observations', {body:JSON.stringify(results.violations,null,2), contentType:'application/json'});
    expect(results.violations).toEqual([]);
    await page.screenshot({path:testInfo.outputPath('dialog.png')});
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(returnTo).toBeFocused();
    expect(await page.locator('header a').evaluate(node => !!node.closest('[inert]'))).toBe(false);
  });
}

test('A top dialog closes first and returns to the underlying settings dialog', async ({page}) => {
  await page.goto(base+'pflanzenpflege-giessplan/index.html',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Einstellungen öffnen',exact:true}).click();
  // Simulate overlapping legacy overlays with the existing read-only help toggle.
  await page.evaluate(() => window.toggleHelpModal());
  await expect(page.locator('#helpModal')).toBeVisible();
  await expect(page.locator('#settingsModal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#helpModal')).toBeHidden();
  await expect(page.locator('#settingsModal')).toBeVisible();
  expect(await page.locator('#settingsModal').evaluate(node => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#settingsModal')).toBeHidden();
  await expect(page.getByRole('button',{name:'Einstellungen öffnen',exact:true})).toBeFocused();
});

test('Beet assignment is a keyboard button and cancelling creates no data', async ({page}) => {
  const item = cases.find(item => item.id === 'beetModal');
  await page.goto(base+item.tool+'/index.html',{waitUntil:'networkidle'});
  await openDialog(page,item);
  const before = await page.evaluate(() => JSON.stringify(localStorage));
  const field = page.locator('#beetGrid').getByRole('button',{name:'Feld 1 + Belegen',exact:true});
  await field.focus();
  const prompt = page.waitForEvent('dialog');
  const press = field.press('Enter');
  await (await prompt).dismiss();
  await press;
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before);
});

test('Calculation summaries announce meaningful updates without a live ticking timer', async ({page}) => {
  await page.goto(base+'backform-umrechner/index.html',{waitUntil:'networkidle'});
  const result = page.locator('#conversion-results');
  await expect(result).toHaveAttribute('role','status');
  await expect(result).toHaveAttribute('aria-atomic','true');
  await page.locator('#target-d').fill('26');
  await expect(result).toContainText('1.00');
  expect(await page.locator('#timer-display').evaluate(node => !!node.closest('[aria-live], [role="status"]'))).toBe(false);
  await page.goto(base+'pflanzenpflege-giessplan/index.html',{waitUntil:'networkidle'});
  await openDialog(page,cases.find(item => item.id === 'roiModal'));
  await expect(page.locator('#roiResult')).toHaveAttribute('role','status');
  await page.locator('#roiExpenses').fill('-1');
  await page.locator('#roiPricePerKg').click();
  await expect(page.locator('#roiResult')).toContainText('Ungültige Eingabe');
  await expect(page.locator('#roiResult')).toContainText('Bitte gültige, nichtnegative Beträge');
});

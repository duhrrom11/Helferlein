const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8765';
const tools = [
  ['kassenbon','tools/haushaltsbuch-kassenbon/index.html'],
  ['kisten','tools/umzugskisten-inventar/index.html'],
  ['wg-kasse','tools/wg-organisator/index.html'],
  ['notizen','tools/digitaler-nachlass/index.html'],
  ['kfz','tools/autokosten-reifenwechsel/index.html'],
  ['haustier','tools/haustier-gesundheitspass/index.html'],
  ['parken','tools/parkplatz-merker-parkschein-timer/index.html'],
  ['verleih','tools/verliehene-gegenstaende-verwalten/index.html'],
  ['pflanzen','tools/pflanzenpflege-giessplan/index.html'],
  ['energie','tools/zaehlerstaende-erfassen/index.html'],
  ['backform','tools/backform-umrechner/index.html']
];
// Steps 1-11: real homepage-to-tool navigation (not only direct HTTP requests).
for (const [id, href] of tools) {
  test('Launch navigation: ' + id, async ({ page }) => {
    await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
    const link = page.locator('a[href="' + href + '"]').first();
    await expect(link).toBeVisible();
    await link.click({ noWaitAfter: true });
    await expect(page).toHaveURL(new RegExp(href.split('/').map(encodeURIComponent).join('/').replaceAll('%2F','/').replaceAll('%2E','.').replaceAll('%2D','-') + '$'));
    await expect(page.locator('body')).toBeVisible();
    expect((await page.title()).trim().length).toBeGreaterThan(0);
  });
}
// Steps 12-22: each tool works at mobile viewport and exposes a real document.
for (const [id, href] of tools) {
  test('Mobile tool page: ' + id, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(base + '/' + href, { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
    expect((await page.title()).trim().length).toBeGreaterThan(0);
    await expect(page.locator('body')).toBeVisible();
  });
}
// Steps 23-30: core launch interactions and data safety.
test('Settings modal opens', async ({ page }) => {
  await page.goto(base + '/index.html');
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsModal')).toBeVisible();
});
test('Settings modal closes with Escape', async ({ page }) => {
  await page.goto(base + '/index.html');
  await page.locator('#settingsBtn').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#settingsModal')).toBeHidden();
});
test('Settings modal closes via close button', async ({ page }) => {
  await page.goto(base + '/index.html');
  await page.locator('#settingsBtn').click();
  await page.locator('#cancelSettingsBtn').click();
  await expect(page.locator('#settingsModal')).toBeHidden();
});
test('Tool search hides unrelated cards', async ({ page }) => {
  await page.goto(base + '/index.html');
  await page.locator('#searchBox').fill('kassenbon');
  await page.evaluate(() => filterTools());
  await expect(page.locator('#toolsGrid .tool-card[data-id="kassenbon"]')).toBeVisible();
  await expect(page.locator('#toolsGrid .tool-card[data-id="haustier"]')).toBeHidden();
});
test('Tool search restores all cards after clearing', async ({ page }) => {
  await page.goto(base + '/index.html');
  await page.locator('#searchBox').fill('unwahrscheinlicher-suchbegriff-987');
  await page.evaluate(() => filterTools());
  await expect(page.locator('#toolsGrid .tool-card[data-id="kassenbon"]')).toBeHidden();
  await page.locator('#searchBox').fill('');
  await page.evaluate(() => filterTools());
  await expect(page.locator('#toolsGrid .tool-card[data-id="kassenbon"]')).toBeVisible();
});
test('Favorites survive a browser reload', async ({ page }) => {
  await page.goto(base + '/index.html');
  await page.evaluate(() => { localStorage.removeItem('hub_favorites'); toggleFavorite('kassenbon'); });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hub_favorites')))).toContain('kassenbon');
  await page.reload();
  await expect(page.locator('#favoritesSection')).toBeVisible();
  await expect(page.locator('#favoritesGrid .tool-card[data-id="kassenbon"]')).toBeVisible();
});
test('Favorites can be removed without affecting other data', async ({ page }) => {
  await page.goto(base + '/index.html');
  const result = await page.evaluate(() => {
    localStorage.setItem('hub_favorites', '["kassenbon"]');
    localStorage.setItem('unrelated_key', 'preserve');
    toggleFavorite('kassenbon');
    return { fav: JSON.parse(localStorage.getItem('hub_favorites')), unrelated: localStorage.getItem('unrelated_key') };
  });
  expect(result).toEqual({ fav: [], unrelated: 'preserve' });
});
test('Malformed backup cannot replace existing favorites', async ({ page }) => {
  await page.goto(base + '/index.html');
  await page.evaluate(() => localStorage.setItem('hub_favorites', '["kisten"]'));
  page.on('dialog', async d => d.accept());
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({
    name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('not valid json')
  });
  await expect.poll(() => page.evaluate(() => localStorage.getItem('hub_favorites'))).toBe('["kisten"]');
});

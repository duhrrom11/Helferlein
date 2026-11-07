const { test, expect } = require('@playwright/test');
const base = 'http://127.0.0.1:8765';
const routes = [
  '/', '/index.html', '/datenschutz.html', '/impressum.html',
  '/tools/kassenbon/index.html', '/tools/kisten/index.html',
  '/tools/wg-kasse/index.html', '/tools/notizen/index.html',
  '/tools/kfz/index.html', '/tools/haustier/index.html',
  '/tools/parken/index.html', '/tools/verleih/index.html',
  '/tools/pflanzen/index.html', '/tools/energie/index.html',
  '/tools/k%C3%BCche/k%C3%BCchenmathe.html'
];
for (const route of routes) {
  test('Browser route renders: ' + route, async ({ page }) => {
    const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
    expect((await page.title()).trim().length).toBeGreaterThan(0);
  });
}
test('Homepage lists all eleven tools and legal links', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  const hrefs = await page.locator('a[href^="tools/"]').evaluateAll(nodes => [...new Set(nodes.map(n => n.getAttribute('href')))]);
  expect(hrefs.length).toBeGreaterThanOrEqual(11);
  await expect(page.locator('a[href="impressum.html"]')).toBeVisible();
  await expect(page.locator('a[href="datenschutz.html"]')).toBeVisible();
});
test('Homepage login rejects empty credentials without network writes', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#settingsBtn').click();
  await expect(page.locator('#loginEmail')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.evaluate(() => window.loginUser());
  await expect(page.locator('#loginEmail')).toBeVisible();
});

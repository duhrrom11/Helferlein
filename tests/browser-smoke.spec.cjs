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

test('Backup exports only allowed local browser data', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('hub_favorites', '["kassenbon"]');
    localStorage.setItem('sb-auth-token', 'SHOULD_NOT_EXPORT');
    localStorage.setItem('unknown_private', 'SHOULD_NOT_EXPORT');
  });
  page.on('dialog', dialog => dialog.accept());
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => window.exportGlobalBackup());
  const download = await downloadPromise;
  const fs = require('node:fs');
  const data = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(data.app).toBe('Helferlein');
  expect(data.version).toBe('2.0');
  expect(data.localStorage.hub_favorites).toBe('["kassenbon"]');
  expect(data.localStorage['sb-auth-token']).toBeUndefined();
  expect(data.localStorage.unknown_private).toBeUndefined();
});
test('Backup restore rejects unsupported keys and preserves local values', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('hub_favorites', '["kisten"]');
  });
  page.on('dialog', dialog => dialog.accept());
  const payload = {
    version: '2.0', app: 'Helferlein', created: new Date().toISOString(),
    localStorage: { hub_favorites: '["kassenbon"]', 'sb-auth-token': 'SHOULD_NOT_IMPORT' }
  };
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({
    name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload))
  });
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('hub_favorites'))).toBe('["kassenbon"]');
  expect(await page.evaluate(() => localStorage.getItem('sb-auth-token'))).toBeNull();
});

test('Cloud auth UI renders signed-in user with mocked client, without backend calls', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    window.supabaseClient.auth.getUser = async () => ({
      data: { user: { email: '<script>example@invalid.test</script>' } }, error: null
    });
    await updateUserDisplay();
  });
  await expect(page.locator('#userInfo')).toContainText('<script>example@invalid.test</script>');
  expect(await page.locator('#userInfo script').count()).toBe(0);
  await expect(page.locator('#cloudStatus')).toContainText('Angemeldet');
});
test('Cloud auth UI handles unavailable backend with mocked client', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    window.supabaseClient.auth.getUser = async () => ({ data: { user: null }, error: { message: 'offline' } });
    await updateUserDisplay();
  });
  await expect(page.locator('#cloudStatus')).toContainText('Anmeldestatus konnte nicht geladen werden');
  await expect(page.locator('#userInfo')).toContainText('Nicht angemeldet');
});
test('Empty registration is rejected before cloud request', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.supabaseClient.auth.signUp = () => { throw new Error('Network call forbidden in test'); };
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
  });
  const dialogs = [];
  page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
  await page.evaluate(() => registerUser());
  expect(dialogs).toContain('Bitte E-Mail und Passwort eingeben.');
});

test('Successful mocked login normalizes email and clears password', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async () => {
    let received = null;
    window.supabaseClient.auth.signInWithPassword = async payload => { received = payload; return { error: null }; };
    window.supabaseClient.auth.getUser = async () => ({ data: { user: { email: 'person@example.invalid' } }, error: null });
    openSettings();
    document.getElementById('loginEmail').value = '  PERSON@EXAMPLE.INVALID  ';
    document.getElementById('loginPassword').value = 'local-only-secret';
    await loginUser();
    return { received, password: document.getElementById('loginPassword').value };
  });
  expect(result.received).toEqual({ email: 'person@example.invalid', password: 'local-only-secret' });
  expect(result.password).toBe('');
  await expect(page.locator('#settingsModal')).toBeHidden();
  await expect(page.locator('#userInfo')).toContainText('person@example.invalid');
});
test('Mocked rejected login clears password and keeps settings open', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  const dialogs = [];
  page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
  await page.evaluate(async () => {
    window.supabaseClient.auth.signInWithPassword = async () => ({ error: { message: 'Anmeldung abgelehnt' } });
    openSettings();
    document.getElementById('loginEmail').value = 'person@example.invalid';
    document.getElementById('loginPassword').value = 'local-only-secret';
    await loginUser();
  });
  expect(dialogs).toContain('Anmeldung abgelehnt');
  await expect(page.locator('#loginPassword')).toHaveValue('');
  await expect(page.locator('#settingsModal')).toBeVisible();
});
test('Mocked logout clears password and shows signed-out status', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async () => {
    let calls = 0;
    window.supabaseClient.auth.signOut = async () => { calls++; return { error: null }; };
    window.supabaseClient.auth.getUser = async () => ({ data: { user: null }, error: null });
    document.getElementById('loginPassword').value = 'local-only-secret';
    await logoutUser();
    return { calls, password: document.getElementById('loginPassword').value };
  });
  expect(result).toEqual({ calls: 1, password: '' });
  await expect(page.locator('#userInfo')).toContainText('Nicht angemeldet');
});

test('Rejected auth status request hides stale signed-in identity', async ({ page }) => {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    window.supabaseClient.auth.getUser = async () => ({
      data: { user: { email: 'person@example.invalid' } }, error: null
    });
    await updateUserDisplay();
    window.supabaseClient.auth.getUser = async () => { throw new Error('offline'); };
    await updateUserDisplay();
  });
  await expect(page.locator('#userInfo')).toHaveText('Nicht angemeldet');
  await expect(page.locator('#cloudStatus')).toHaveText('Anmeldestatus konnte nicht geladen werden');
});

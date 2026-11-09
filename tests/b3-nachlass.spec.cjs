const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/tools/digitaler-nachlass/index.html';
for(const width of [390,768,900,1200,1440]){
 test('Digitaler Nachlass B3 responsive and security warning visible at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-nachlass')).toBeVisible();
  await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
  await expect(page.locator('.b3-vault-nav')).toBeVisible();
  await expect(page.getByRole('alert').filter({hasText:'Wichtiger Sicherheitshinweis'})).toBeVisible();
  const x=await page.evaluate(()=>{
   const main=document.getElementById('main-content').getBoundingClientRect();
   const nav=document.querySelector('.b3-vault-nav').getBoundingClientRect();
   const warning=document.querySelector('.b3-security-notice').getBoundingClientRect();
   return {scroll:document.documentElement.scrollWidth,main:{left:main.left,right:main.right},nav:{left:nav.left,right:nav.right},warning:{left:warning.left,right:warning.right}};
  });
  expect(x.scroll).toBeLessThanOrEqual(width+4);
  expect(x.nav.left).toBeGreaterThanOrEqual(x.main.left-4);
  expect(x.nav.right).toBeLessThanOrEqual(x.main.right+4);
  expect(x.warning.right).toBeLessThanOrEqual(width+4);
 });
}
test('Nachlass original vault tabs and more actions are reachable',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.tab-btn[data-tab="deadman"]').click();
 await expect(page.locator('#section-deadman')).toBeVisible();
 await expect(page.locator('#section-vault')).toBeHidden();
 await page.locator('.tab-btn[data-tab="trustees"]').click();
 await expect(page.locator('#section-trustees')).toBeVisible();
 await page.locator('#b3-nachlass-more>summary').click();
 await expect(page.locator('#manualSyncBtn')).toBeVisible();
 await page.locator('.tab-btn[data-tab="kit"]').click();
 await expect(page.locator('#section-kit')).toBeVisible();
});
test('Nachlass settings gear holds account, theme and Ko-fi footer',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#section-settings')).toBeVisible();
 await expect(page.locator('#cloud-status-text')).toBeVisible();
 await expect(page.locator('#b3-nachlass-theme')).toBeVisible();
 await expect(page.locator('#b3-nachlass-edit')).toBeVisible();
 const footer=await page.locator('#section-settings .b3-settings-footer a').evaluateAll(ns=>ns.map(n=>({text:n.textContent.trim(),href:n.getAttribute('href')})));
 expect(footer).toEqual([{text:'☕ Kaffee spendieren',href:'https://ko-fi.com/duhrrom'},{text:'↗ Entdecke mehr Helferlein',href:'../../index.html'}]);
});
test('Nachlass layout editor cancels without updating sensitive records',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-nachlass-edit').click();
 await expect(page.locator('#b3-nachlass-editor')).toBeVisible();
 await expect(page.locator('#b3-nachlass-editor').getByRole('button',{name:'Tresor',exact:false})).toHaveCount(0);
 await page.locator('#b3-nachlass-editor').getByRole('button',{name:'Standardlayout'}).click();
 await page.locator('#b3-nachlass-editor').getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.locator('#b3-nachlass-editor')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_nachlass_v1'))).toBeNull();
});
test('Nachlass global dark and light mode preserve the security warning',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-nachlass-theme').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 const dark=await page.locator('.b3-security-notice').evaluate(el=>({text:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
 expect(dark.text).not.toBe(dark.bg);
 await page.locator('#b3-nachlass-theme').selectOption('light');
 await expect(page.locator('body')).toHaveClass(/b3-light/);
 const light=await page.locator('.b3-security-notice').evaluate(el=>({text:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
 expect(light.text).not.toBe(light.bg);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('light');
});

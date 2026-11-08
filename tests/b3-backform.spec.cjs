const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/tools/backform-umrechner/index.html';
for(const width of [390,768,900,1200,1440]){
 test('B3 Backform responsive at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-backform')).toBeVisible();
  await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
  await expect(page.locator('.b3-backform-tabs')).toBeVisible();
  await expect(page.locator('#tab-rechner')).toBeVisible();
  const dims=await page.evaluate(()=>{
    const main=document.getElementById('main-content').getBoundingClientRect();
    const nav=document.querySelector('.b3-backform-nav').getBoundingClientRect();
    const children=[...document.getElementById('main-content').children].map(el=>{
      const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};
    });
    return {scroll:document.documentElement.scrollWidth,nav:{left:nav.left,right:nav.right},main:{left:main.left,right:main.right},children};
  });
  expect(dims.scroll).toBeLessThanOrEqual(width+4);
  expect(dims.nav.left).toBeGreaterThanOrEqual(-2);
  expect(dims.nav.right).toBeLessThanOrEqual(width+2);
  for(const r of dims.children){
   expect(r.left).toBeGreaterThanOrEqual(dims.main.left-2);
   expect(r.right).toBeLessThanOrEqual(dims.main.right+2);
  }
 });
}
test('Backform conversion ratio and unchanged input calculation',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await expect(page.locator('#res-factor')).toHaveText('0.59');
 await page.locator('#target-d').fill('26');
 await expect(page.locator('#res-factor')).toHaveText('1.00');
 await page.locator('#target-d').fill('20');
 await expect(page.locator('#res-factor')).toHaveText('0.59');
 expect(await page.evaluate(()=>localStorage.getItem('helperly_recipes_pro'))).toBeNull();
});
test('Backform original tabs and multi-timer can be opened without creating recipes',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto(url,{waitUntil:'domcontentloaded'});
 for(const id of ['finder','substanz','tools','rezepte','rechner']){
   await page.locator('#btn-tab-'+id).click();
   await expect(page.locator('#tab-'+id)).toBeVisible();
 }
 await page.locator('#b3-backform-more>summary').click();
 await page.getByRole('button',{name:'Kochmodus & Multi-Timer'}).click();
 await expect(page.locator('#cook-modal')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('helperly_recipes_pro'))).toBeNull();
});
test('Backform account, design settings and supporter links are intact',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#settings-modal')).toBeVisible();
 await expect(page.locator('#cloud-status-box')).toBeVisible();
 await expect(page.locator('#b3-backform-theme')).toBeVisible();
 await expect(page.locator('#b3-backform-edit')).toBeVisible();
 const links=await page.locator('#settings-modal .b3-settings-footer a').evaluateAll(ns=>ns.map(n=>({text:n.textContent.trim(),href:n.getAttribute('href')})));
 expect(links).toEqual([{text:'☕ Kaffee spendieren',href:'https://ko-fi.com/duhrrom'},{text:'↗ Entdecke mehr Helferlein',href:'../../index.html'}]);
});
test('Backform tab editor cancels without writing saved recipes',async({page})=>{
 await page.setViewportSize({width:900,height:900});await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-backform-edit').click();
 await expect(page.locator('#b3-backform-editor')).toBeVisible();
 await page.locator('#b3-backform-editor').getByRole('button',{name:'Standardlayout'}).click();
 await page.locator('#b3-backform-editor').getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.locator('#b3-backform-editor')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_backform_v1'))).toBeNull();
 expect(await page.evaluate(()=>localStorage.getItem('helperly_recipes_pro'))).toBeNull();
});
test('Backform dark and light mode retain readable conversion results',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-backform-theme').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 let c=await page.locator('#cloud-status-box').evaluate(n=>({fg:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor}));
 expect(c.fg).not.toBe(c.bg);
 await page.locator('#b3-backform-theme').selectOption('light');
 await expect(page.locator('body')).toHaveClass(/b3-light/);
 c=await page.locator('#cloud-status-box').evaluate(n=>({fg:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor}));
 expect(c.fg).not.toBe(c.bg);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('light');
});

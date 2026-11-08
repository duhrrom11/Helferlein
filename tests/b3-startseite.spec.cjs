const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/index.html';
for(const width of [390,768,900,1200,1440]){
 test('B3 homepage is responsive and shows all tools at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-home')).toBeVisible();
  await expect(page.locator('.b3-hub-hero')).toBeVisible();
  await expect(page.locator('#toolsGrid .tool-card')).toHaveCount(11);
  await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
  const r=await page.evaluate(()=>{
   const main=document.querySelector('.b3-hub-main').getBoundingClientRect();
   const head=document.querySelector('.b3-hub-header').getBoundingClientRect();
   const cards=[...document.querySelectorAll('#toolsGrid .tool-card')].map(el=>{
    const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};
   });
   return {scroll:document.documentElement.scrollWidth,main:{left:main.left,right:main.right},head:{left:head.left,right:head.right},cards};
  });
  expect(r.scroll).toBeLessThanOrEqual(width+4);
  expect(r.head.left).toBeGreaterThanOrEqual(-2);expect(r.head.right).toBeLessThanOrEqual(width+2);
  for(const c of r.cards){expect(c.left).toBeGreaterThanOrEqual(r.main.left-2);expect(c.right).toBeLessThanOrEqual(r.main.right+2)}
 });
}
test('B3 category chips and search compose without hiding favorites',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 const cards=page.locator('#toolsGrid .tool-card:visible');
 await expect(cards).toHaveCount(11);
 await page.getByRole('button',{name:'Finanzen'}).click();
 await expect(cards).toHaveCount(3);
 await expect(page.locator('#b3-result-count')).toContainText('3 von 11');
 await page.locator('#searchBox').fill('Wasser');
 await expect(cards).toHaveCount(1);
 await expect(page.locator('#toolsGrid .tool-card[data-id="energie"]')).toBeVisible();
 await page.locator('#searchBox').fill('keinpassendeswerkzeug123');
 await expect(page.locator('#searchEmptyState')).toBeVisible();
 await page.locator('#searchBox').fill('');
 await page.getByRole('button',{name:'Alle 11'}).click();
 await expect(cards).toHaveCount(11);
 await expect(page.locator('#searchEmptyState')).toBeHidden();
});
test('B3 home keeps favorites and quickstart links functional without cloud writes',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('#toolsGrid .tool-card[data-id="pflanzen"] .fav-btn').click();
 await expect(page.locator('#favoritesSection')).toBeVisible();
 await expect(page.locator('#favoritesGrid .tool-card')).toHaveCount(1);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hub_favorites')||'[]'))).toEqual(['pflanzen']);
 await page.locator('#favoritesGrid .fav-btn').click();
 await expect(page.locator('#favoritesSection')).toBeHidden();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hub_favorites')||'[]'))).toEqual([]);
 const urls=await page.locator('.b3-preview-list a').evaluateAll(a=>a.map(x=>x.getAttribute('href')));
 expect(urls).toEqual(['tools/haushaltsbuch-kassenbon/index.html','tools/pflanzenpflege-giessplan/index.html','tools/backform-umrechner/index.html']);
});
test('B3 home settings preserve cloud, safety backup and footer links',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#settingsModal')).toBeVisible();
 await expect(page.locator('#cloudStatus')).toBeVisible();
 await expect(page.getByRole('button',{name:'Backup',exact:false})).toBeVisible();
 await expect(page.locator('#b3-hub-theme')).toBeVisible();
 await expect(page.locator('#settingsModal')).toContainText('Backup-Dateien sind nicht verschlüsselt');
 const links=await page.locator('#settingsModal .b3-hub-settings-footer a').evaluateAll(a=>a.map(x=>({text:x.textContent.trim(),href:x.getAttribute('href')})));
 expect(links).toEqual([{text:'☕ Kaffee spendieren',href:'https://ko-fi.com/duhrrom'},{text:'↗ Entdecke mehr Helferlein',href:'#toolDiscovery'}]);
});
test('B3 home light/dark mode shares the established B3 theme key',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-hub-theme').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 const bg1=await page.locator('#toolsGrid .tool-card').first().evaluate(e=>getComputedStyle(e).backgroundColor);
 await page.locator('#b3-hub-theme').selectOption('light');
 await expect(page.locator('body')).not.toHaveClass(/b3-dark/);
 const bg2=await page.locator('#toolsGrid .tool-card').first().evaluate(e=>getComputedStyle(e).backgroundColor);
 expect(bg1).not.toBe(bg2);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('light');
});

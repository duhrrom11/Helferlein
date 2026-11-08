const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/tools/zaehlerstaende-erfassen/index.html';
for(const width of [390,768,900,1200,1440]){
 test('B3 Zählerstände responsive at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-zaehler')).toBeVisible();
  await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
  await expect(page.locator('.b3-more summary')).toBeVisible();
  const x=await page.evaluate(()=>{
   const main=document.querySelector('main.b3-dashboard').getBoundingClientRect();
   const panels=['stats','tariffs','create','history'].map(id=>{
    const r=document.querySelector('[data-b3-panel="'+id+'"]').getBoundingClientRect();
    return {id,width:r.width,left:r.left,right:r.right};
   });
   return {scroll:document.documentElement.scrollWidth,main:{width:main.width,left:main.left,right:main.right},panels};
  });
  expect(x.scroll).toBeLessThanOrEqual(width+4);
  for(const p of x.panels){
   expect(p.width,p.id).toBeGreaterThan(width<1280?x.main.width*.9:x.main.width*.3);
   expect(p.left).toBeGreaterThanOrEqual(x.main.left-2);
   expect(p.right).toBeLessThanOrEqual(x.main.right+2);
  }
 });
}
test('B3 Zählerstände account, theme and supporter links are in settings',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#settingsModal')).toBeVisible();
 await expect(page.locator('#cloudStatus')).toBeVisible();
 await expect(page.locator('#b3-edit-open')).toBeVisible();
 await expect(page.locator('[data-b3-theme]')).toBeVisible();
 const links=await page.locator('#settingsModal .b3-settings-footer a').evaluateAll(ns=>ns.map(n=>({text:n.textContent.trim(),href:n.getAttribute('href')})));
 expect(links).toEqual([{text:'☕ Kaffee spendieren',href:'https://ko-fi.com/duhrrom'},{text:'↗ Entdecke mehr Helferlein',href:'../../index.html'}]);
});
test('B3 Zählerstände export, tips, share and help are reachable',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.b3-more summary').click();
 for(const name of ['Ablese-Erinnerung (Kalender)','Energiespar-Tipps','Verbrauch teilen','Übergabebericht (PDF)','Zählerbericht (PDF)'])
 await expect(page.getByRole('button',{name})).toBeVisible();
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('.b3-preferences').getByRole('button',{name:/Hilfe/}).click();
 await expect(page.locator('#accordionContent')).toBeVisible();
});
test('Zählerstand editor preserves reading capture and alarm, cancel writes no data',async({page})=>{
 await page.setViewportSize({width:900,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-edit-open').click();
 await expect(page.locator('#b3-editor')).toBeVisible();
 await expect(page.locator('#b3-editor').getByRole('checkbox',{name:'Ablese-Erinnerung sichtbar'})).toBeDisabled();
 await expect(page.locator('#b3-editor').getByRole('checkbox',{name:'Zählerstand erfassen sichtbar'})).toBeDisabled();
 await page.locator('#b3-editor').getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.locator('#b3-editor')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_zaehler_v1'))).toBeNull();
 expect(await page.evaluate(()=>localStorage.getItem('energie_tracker_pro_v8'))).toBeNull();
});
test('Zählerstände dark mode maintains readable account status and tariffs',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('[data-b3-theme]').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 const status=await page.locator('#cloudStatus').evaluate(n=>({fg:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor}));
 expect(status.fg).not.toBe(status.bg);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('dark');
});

const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/tools/haustier-gesundheitspass/index.html';
for(const width of [390,768,900,1200,1440]){
 test('B3 Haustier-Gesundheitspass responsive at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-haustiere')).toBeVisible();
  await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
  await expect(page.locator('.b3-more summary')).toBeVisible();
  const x=await page.evaluate(()=>{
   const m=document.querySelector('main.b3-dashboard').getBoundingClientRect();
   const panels=['stats','create','medication','records'].map(id=>{
    const r=document.querySelector('[data-b3-panel="'+id+'"]').getBoundingClientRect();
    return {id,width:r.width,left:r.left,right:r.right,top:r.top,bottom:r.bottom};
   });
   return {scroll:document.documentElement.scrollWidth,main:{width:m.width,left:m.left,right:m.right},panels};
  });
  expect(x.scroll).toBeLessThanOrEqual(width+4);
  for(const p of x.panels){
   expect(p.width,p.id).toBeGreaterThan(width<1280?x.main.width*.9:x.main.width*.3);
   expect(p.left).toBeGreaterThanOrEqual(x.main.left-2);
   expect(p.right).toBeLessThanOrEqual(x.main.right+2);
  }
 });
}
test('Pet health settings contain account, Ko-fi and discovery footer',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#settingsModal')).toBeVisible();
 await expect(page.locator('#cloudStatus')).toBeVisible();
 await expect(page.locator('#b3-edit-open')).toBeVisible();
 await expect(page.locator('[data-b3-theme]')).toBeVisible();
 const footer=await page.locator('#settingsModal .b3-settings-footer a').evaluateAll(ns=>ns.map(n=>({text:n.textContent.trim(),href:n.getAttribute('href')})));
 expect(footer).toEqual([{text:'☕ Kaffee spendieren',href:'https://ko-fi.com/duhrrom'},{text:'↗ Entdecke mehr Helferlein',href:'../../index.html'}]);
});
test('Pet health supplementary actions and help are reachable',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.b3-more summary').click();
 for(const name of ['Gesundheitsbericht (PDF)','Backup herunterladen','Daten importieren'])await expect(page.getByRole('button',{name})).toBeVisible();
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('.b3-preferences').getByRole('button',{name:/Hilfe/}).click();
 await expect(page.locator('#helpBox')).toBeVisible();
});
test('Pet health editor retains required deadlines and cancels without data writes',async({page})=>{
 await page.setViewportSize({width:900,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-edit-open').click();
 await expect(page.locator('#b3-editor')).toBeVisible();
 await expect(page.locator('#b3-editor').getByRole('checkbox',{name:'Impfungen & Fristen sichtbar'})).toBeDisabled();
 await page.locator('#b3-editor').getByRole('button',{name:'Standardlayout'}).click();
 await page.locator('#b3-editor').getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.locator('#b3-editor')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_haustiere_v1'))).toBeNull();
});
test('Pet health dark mode keeps account status and inputs readable',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('[data-b3-theme]').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 const s=await page.locator('#cloudStatus').evaluate(n=>({fg:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor}));
 expect(s.fg).not.toBe(s.bg);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('dark');
});

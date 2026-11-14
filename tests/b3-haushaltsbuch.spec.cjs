const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/tools/haushaltsbuch-kassenbon/index.html';
for(const width of [390,768,900,1200,1440]){
 test('B3 Haushaltsbuch readable at '+width+'px',async ({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-haushaltsbuch')).toBeVisible();
  await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
  await expect(page.locator('.b3-more summary')).toBeVisible();
  const dims=await page.evaluate(()=>{
   const main=document.querySelector('main.b3-dashboard').getBoundingClientRect();
   const panels=['stats','charts','form','history'].map(id=>{
    const r=document.querySelector('[data-b3-panel="'+id+'"]').getBoundingClientRect();
    return {id,width:r.width,left:r.left,right:r.right,top:r.top,bottom:r.bottom};
   });
   return {scrollWidth:document.documentElement.scrollWidth,main:{left:main.left,right:main.right,width:main.width},panels};
  });
  expect(dims.scrollWidth).toBeLessThanOrEqual(width+4);
  for(const p of dims.panels){
   expect(p.width,p.id).toBeGreaterThan(width<1280?dims.main.width*.9:dims.main.width*.3);
   expect(p.left).toBeGreaterThanOrEqual(dims.main.left-2);
   expect(p.right).toBeLessThanOrEqual(dims.main.right+2);
  }
 });
}
test('B3 Haushaltsbuch Konto, Ko-fi and discovery are consolidated',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#settingsModal')).toBeVisible();
 await expect(page.locator('#cloudStatus')).toBeVisible();
 await expect(page.locator('#b3-edit-open')).toBeVisible();
 await expect(page.locator('[data-b3-theme]')).toBeVisible();
 const footer=await page.locator('#settingsModal .b3-settings-footer a').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent.trim(),href:n.getAttribute('href')})));
 expect(footer).toEqual([{text:expect.stringContaining('Freiwillig unterstützen'),href:'https://ko-fi.com/duhrrom'},{text:'↗ Entdecke mehr Helferlein',href:'../../index.html'}]);
});
test('B3 Haushaltsbuch navigation and actions are reachable',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.b3-more summary').click();
 await expect(page.getByRole('button',{name:'Steuer-Datei herunterladen (CSV)'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Finanzbericht (PDF)'})).toBeVisible();
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('.b3-preferences').getByRole('button',{name:/Hilfe/}).click();
 await expect(page.locator('#guideSection')).toBeVisible();
});
test('B3 Haushaltsbuch dashboard editor cancels without storing changes',async({page})=>{
 await page.setViewportSize({width:900,height:900});await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-edit-open').click();
 await expect(page.locator('#b3-editor')).toBeVisible();
 await page.locator('#b3-editor').getByRole('button',{name:'Standardlayout'}).click();
 await page.locator('#b3-editor').getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.locator('#b3-editor')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_haushaltsbuch_v1'))).toBeNull();
});
test('B3 Haushaltsbuch dark mode preserves visibility of controls',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('[data-b3-theme]').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 const x=await page.locator('#cloudStatus').evaluate(n=>({fg:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor}));
 expect(x.fg).not.toBe(x.bg);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('dark');
});

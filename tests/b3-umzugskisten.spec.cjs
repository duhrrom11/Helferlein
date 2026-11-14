const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/tools/umzugskisten-inventar/index.html';
for(const width of [390,768,900,1200,1440]){
 test('B3 Umzugskisten layout at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-umzugskisten')).toBeVisible();
  await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
  await expect(page.locator('.b3-more summary')).toBeVisible();
  const sizes=await page.evaluate(()=>{
   const m=document.querySelector('main.b3-dashboard').getBoundingClientRect();
   const rects=['stats','values','create','inventory'].map(id=>{
    const r=document.querySelector('[data-b3-panel="'+id+'"]').getBoundingClientRect();
    return {id,width:r.width,left:r.left,right:r.right,top:r.top,bottom:r.bottom};
   });
   return {scrollWidth:document.documentElement.scrollWidth,main:{left:m.left,right:m.right,width:m.width},rects};
  });
  expect(sizes.scrollWidth).toBeLessThanOrEqual(width+4);
  for(const p of sizes.rects){
   expect(p.width,p.id).toBeGreaterThan(width<1280?sizes.main.width*.9:sizes.main.width*.3);
   expect(p.left).toBeGreaterThanOrEqual(sizes.main.left-2);
   expect(p.right).toBeLessThanOrEqual(sizes.main.right+2);
  }
 });
}
test('Umzugskisten settings contain account, design, Ko-fi and discovery',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#settingsModal')).toBeVisible();
 await expect(page.locator('#cloudStatus')).toBeVisible();
 await expect(page.locator('#b3-edit-open')).toBeVisible();
 await expect(page.locator('[data-b3-theme]')).toBeVisible();
 const links=await page.locator('#settingsModal .b3-settings-footer a').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent.trim(),href:n.getAttribute('href')})));
 expect(links).toEqual([{text:expect.stringContaining('Freiwillig unterstützen'),href:'https://ko-fi.com/duhrrom'},{text:'↗ Entdecke mehr Helferlein',href:'../../index.html'}]);
});
test('QR scanner, PDFs, help and backup are accessible from menus',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.b3-more summary').click();
 for(const name of ['QR- & Barcode-Scanner','Inventar als PDF','QR-Etiketten als PDF','Sicherung herunterladen'])await expect(page.getByRole('button',{name})).toBeVisible();
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('.b3-preferences').getByRole('button',{name:/Hilfe/}).click();
 await expect(page.locator('#helpBox')).toBeVisible();
});
test('Umzugskisten editor cancels without persisting changes',async({page})=>{
 await page.setViewportSize({width:900,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-edit-open').click();
 await expect(page.locator('#b3-editor')).toBeVisible();
 await page.locator('#b3-editor').getByRole('button',{name:'Standardlayout'}).click();
 await page.locator('#b3-editor').getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.locator('#b3-editor')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_umzugskisten_v1'))).toBeNull();
});
test('Dark theme keeps account and form inputs readable',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('[data-b3-theme]').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 const v=await page.locator('#cloudStatus').evaluate(n=>({fg:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor}));
 expect(v.fg).not.toBe(v.bg);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('dark');
});

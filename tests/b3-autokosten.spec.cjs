const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/tools/autokosten-reifenwechsel/index.html';
for(const width of [390,768,900,1200,1440]){
 test('Autokosten B3 layout responsive at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-autokosten')).toBeVisible();
  await expect(page.locator('.b3-tool-title h1')).toBeVisible();
  await expect(page.locator('.b3-settings-trigger')).toBeVisible();
  await expect(page.locator('.b3-more summary')).toBeVisible();
  const x=await page.evaluate(()=>{
   const main=document.querySelector('main.b3-dashboard').getBoundingClientRect();
   const ids=['stats','create','records'];
   return {doc:document.documentElement.scrollWidth,main,rects:ids.map(id=>{const r=document.querySelector('[data-b3-panel="'+id+'"]').getBoundingClientRect();return {id,left:r.left,right:r.right,width:r.width}})};
  });
  expect(x.doc).toBeLessThanOrEqual(width+3);
  for(const p of x.rects){
   expect(p.width,p.id+' too narrow').toBeGreaterThan(width<768?width*.72:width<1280?x.main.width*.9:x.main.width*.3);
   expect(p.left).toBeGreaterThanOrEqual(x.main.left-2);
   expect(p.right).toBeLessThanOrEqual(x.main.right+2);
  }
 });
}
test('Autokosten settings, Ko-fi and discovery link appear together',async({page})=>{
 await page.setViewportSize({width:390,height:850});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#settingsModal')).toBeVisible();
 await expect(page.locator('#cloudStatus')).toBeVisible();
 await expect(page.locator('[data-b3-theme]')).toBeVisible();
 await expect(page.locator('#b3-edit-open')).toBeVisible();
 const links=await page.locator('#settingsModal .b3-settings-footer a').evaluateAll(ns=>ns.map(n=>({label:n.textContent.trim(),href:n.getAttribute('href')})));
 expect(links).toEqual([{label:expect.stringContaining('Freiwillig unterstützen'),href:'https://ko-fi.com/duhrrom'},{label:'↗ Entdecke mehr Helferlein',href:'../../index.html'}]);
});
test('Autokosten more tools and help actions remain accessible',async({page})=>{
 await page.setViewportSize({width:390,height:850});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.b3-more summary').click();
 await expect(page.getByRole('button',{name:'PDF-Report'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Backup herunterladen'})).toBeVisible();
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('.b3-preferences').getByRole('button',{name:/Hilfe/}).click();
 await expect(page.locator('#helpBox')).toBeVisible();
});
test('Car dashboard editor cancels non-persistent visual changes',async({page})=>{
 await page.setViewportSize({width:900,height:850});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-edit-open').click();
 await expect(page.locator('#b3-editor')).toBeVisible();
 await page.locator('#b3-editor').getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.locator('#b3-editor')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_autokosten_v1'))).toBeNull();
});
test('Global dark mode is readable and consistent with shared theme',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('[data-b3-theme]').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 const status=await page.locator('#cloudStatus').evaluate(node=>({fg:getComputedStyle(node).color,bg:getComputedStyle(node).backgroundColor}));
 expect(status.fg).not.toBe(status.bg);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('dark');
});

const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/tools/parkplatz-merker-parkschein-timer/index.html';
for(const width of [390,768,900,1200,1440]){
 test('Parkplatz B3 responsive at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-parkplatz')).toBeVisible();
  await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
  await expect(page.locator('.b3-more summary')).toBeVisible();
  const dimensions=await page.evaluate(()=>{
   const m=document.querySelector('main.b3-dashboard').getBoundingClientRect();
   return {scroll:document.documentElement.scrollWidth,main:{width:m.width,left:m.left,right:m.right},
    panels:['stats','timer','history','recommendations'].map(id=>{
     const r=document.querySelector('[data-b3-panel="'+id+'"]').getBoundingClientRect();
     return {id,width:r.width,left:r.left,right:r.right};
    })};
  });
  expect(dimensions.scroll).toBeLessThanOrEqual(width+4);
  for(const p of dimensions.panels){
   expect(p.width,p.id).toBeGreaterThan(width<1280?dimensions.main.width*.9:dimensions.main.width*.3);
   expect(p.left).toBeGreaterThanOrEqual(dimensions.main.left-2);
   expect(p.right).toBeLessThanOrEqual(dimensions.main.right+2);
  }
 });
}
test('Parkplatz account, Ko-fi and discovery stay in settings',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#settingsModal')).toBeVisible();
 await expect(page.locator('#cloud-status-text')).toBeVisible();
 await expect(page.locator('#b3-edit-open')).toBeVisible();
 await expect(page.locator('[data-b3-theme]')).toBeVisible();
 const links=await page.locator('#settingsModal .b3-settings-footer a').evaluateAll(ns=>ns.map(n=>({text:n.textContent.trim(),href:n.getAttribute('href')})));
 expect(links).toEqual([{text:expect.stringContaining('Freiwillig unterstützen'),href:'https://ko-fi.com/duhrrom'},{text:'↗ Entdecke mehr Helferlein',href:'../../index.html'}]);
});
test('Parking PDF, push alerts and help are reachable',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.b3-more summary').click();
 await expect(page.getByRole('button',{name:'Push-Alarm aktivieren'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Parkbericht (PDF)'})).toBeVisible();
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('.b3-preferences').getByRole('button',{name:/Hilfe/}).click();
 await expect(page.locator('#helpModal')).toBeVisible();
});
test('Park-Timer is non-hideable in dashboard editor without creating timer data',async({page})=>{
 await page.setViewportSize({width:900,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-edit-open').click();
 await expect(page.locator('#b3-editor')).toBeVisible();
 await expect(page.locator('#b3-editor').getByRole('checkbox',{name:'Parkschein-Timer & Parkplatz erfassen sichtbar'})).toBeDisabled();
 await page.locator('#b3-editor').getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.locator('#b3-editor')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_parkplatz_v1'))).toBeNull();
 expect(await page.evaluate(()=>localStorage.getItem('park_end_time'))).toBeNull();
});
test('Dark theme keeps clock and account visible',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('[data-b3-theme]').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 const status=await page.locator('#cloud-status-text').evaluate(n=>({color:getComputedStyle(n).color,bg:getComputedStyle(n.parentElement).backgroundColor}));
 expect(status.color).not.toBe(status.bg);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('dark');
});

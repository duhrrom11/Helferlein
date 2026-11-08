const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/tools/verliehene-gegenstaende-verwalten/index.html';
for(const width of [390,768,900,1200,1440]){
 test('Verliehene Gegenstände B3 responsive at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-verleih')).toBeVisible();
  await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
  await expect(page.locator('.b3-more summary')).toBeVisible();
  const measurements=await page.evaluate(()=>{
   const m=document.querySelector('main.b3-dashboard').getBoundingClientRect();
   const p=['stats','create','inventory','loans','recommendations'].map(id=>{
    const r=document.querySelector('[data-b3-panel="'+id+'"]').getBoundingClientRect();
    return {id,width:r.width,left:r.left,right:r.right};
   });
   return {scroll:document.documentElement.scrollWidth,main:{width:m.width,left:m.left,right:m.right},panels:p};
  });
  expect(measurements.scroll).toBeLessThanOrEqual(width+4);
  for(const p of measurements.panels){
   expect(p.width,p.id).toBeGreaterThan(width<1280?measurements.main.width*.9:measurements.main.width*.3);
   expect(p.left).toBeGreaterThanOrEqual(measurements.main.left-2);
   expect(p.right).toBeLessThanOrEqual(measurements.main.right+2);
  }
 });
}
test('Verleih account, Ko-fi and discovery appear in settings',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#settingsModal')).toBeVisible();
 await expect(page.locator('#cloud-status-text')).toBeVisible();
 await expect(page.locator('#b3-edit-open')).toBeVisible();
 await expect(page.locator('[data-b3-theme]')).toBeVisible();
 const footer=await page.locator('#settingsModal .b3-settings-footer a').evaluateAll(ns=>ns.map(n=>({text:n.textContent.trim(),href:n.getAttribute('href')})));
 expect(footer).toEqual([{text:'☕ Kaffee spendieren',href:'https://ko-fi.com/duhrrom'},{text:'↗ Entdecke mehr Helferlein',href:'../../index.html'}]);
});
test('Verleih PDF action and help are accessible',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.b3-more summary').click();
 await expect(page.getByRole('button',{name:'Verleih-Bericht (PDF)'})).toBeVisible();
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('.b3-preferences').getByRole('button',{name:/Hilfe/}).click();
 await expect(page.locator('#helpModal')).toBeVisible();
});
test('Verleih dashboard always preserves the return list and cancel stores nothing',async({page})=>{
 await page.setViewportSize({width:900,height:900});await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-edit-open').click();
 await expect(page.locator('#b3-editor')).toBeVisible();
 await expect(page.locator('#b3-editor').getByRole('checkbox',{name:'Verleih-Liste & Rückgaben sichtbar'})).toBeDisabled();
 await page.locator('#b3-editor').getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.locator('#b3-editor')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_verleih_v1'))).toBeNull();
 expect(await page.evaluate(()=>localStorage.getItem('verleih_tracker_pro_v3'))).toBeNull();
});
test('Verleih dark mode preserves readable account status',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('[data-b3-theme]').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 const st=await page.locator('#cloud-status-text').evaluate(el=>({fg:getComputedStyle(el).color,bg:getComputedStyle(el.parentElement).backgroundColor}));
 expect(st.fg).not.toBe(st.bg);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('dark');
});

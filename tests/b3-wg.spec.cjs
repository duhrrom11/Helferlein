const {test,expect}=require('@playwright/test');
const url='http://127.0.0.1:8765/tools/wg-organisator/index.html';
for(const width of [390,768,900,1200,1440]){
 test('WG B3 responsive at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await expect(page.locator('body.b3-wg')).toBeVisible();
  await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
  await expect(page.locator('.b3-more summary')).toBeVisible();
  const x=await page.evaluate(()=>{
   const main=document.querySelector('main.b3-dashboard').getBoundingClientRect();
   const panels=['stats','notes','expenses','calendar','cleaning'].map(id=>{
    const r=document.querySelector('[data-b3-panel="'+id+'"]').getBoundingClientRect();
    return {id,width:r.width,left:r.left,right:r.right,top:r.top,bottom:r.bottom};
   });
   return {width:document.documentElement.scrollWidth,main:{width:main.width,left:main.left,right:main.right},panels};
  });
  expect(x.width).toBeLessThanOrEqual(width+4);
  for(const p of x.panels){
   expect(p.width,p.id).toBeGreaterThan(width<1280?x.main.width*.9:x.main.width*.3);
   expect(p.left).toBeGreaterThanOrEqual(x.main.left-2);
   expect(p.right).toBeLessThanOrEqual(x.main.right+2);
  }
 });
}
test('WG settings preserve account and show correct footer order',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await expect(page.locator('#settingsModal')).toBeVisible();
 await expect(page.locator('#cloud-status-text')).toBeVisible();
 await expect(page.locator('#b3-edit-open')).toBeVisible();
 await expect(page.locator('[data-b3-theme]')).toBeVisible();
 const links=await page.locator('#settingsModal .b3-settings-footer a').evaluateAll(ns=>ns.map(n=>({text:n.textContent.trim(),href:n.getAttribute('href')})));
 expect(links).toEqual([{text:'☕ Kaffee spendieren',href:'https://ko-fi.com/duhrrom'},{text:'↗ Entdecke mehr Helferlein',href:'../../index.html'}]);
});
test('WG extra tools and help modal are reachable',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.locator('.b3-more summary').click();
 for(const label of ['Mitglieder / Kontakte','Manuell synchronisieren','Finanzbericht (PDF)','WG-Link teilen','WLAN QR-Code'])
  await expect(page.getByRole('button',{name:label})).toBeVisible();
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('.b3-preferences').getByRole('button',{name:/Hilfe/}).click();
 await expect(page.locator('#helpModal')).toBeVisible();
});
test('WG dashboard editing cancels without writing layout',async({page})=>{
 await page.setViewportSize({width:900,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('#b3-edit-open').click();
 await expect(page.locator('#b3-editor')).toBeVisible();
 await page.locator('#b3-editor').getByRole('button',{name:'Standardlayout'}).click();
 await page.locator('#b3-editor').getByRole('button',{name:'Abbrechen'}).click();
 await expect(page.locator('#b3-editor')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_layout_wg_v1'))).toBeNull();
});
test('WG dark mode updates styles without changing app data',async({page})=>{
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Einstellungen öffnen'}).click();
 await page.locator('[data-b3-theme]').selectOption('dark');
 await expect(page.locator('body')).toHaveClass(/b3-dark/);
 const status=await page.locator('#cloud-status-text').evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el.parentElement).backgroundColor}));
 expect(status.color).not.toBe(status.background);
 expect(await page.evaluate(()=>localStorage.getItem('helferlein_ui_theme_v1'))).toBe('dark');
});

test('First visit shows original WG creation action but preserves navigation',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await expect(page.locator('#b3-wg-onboarding')).toBeVisible();
 await expect(page.getByRole('button',{name:/WG-Plan mit 1 Klick erstellen/})).toBeVisible();
 await expect(page.getByRole('button',{name:'Einstellungen öffnen'})).toBeVisible();
 await expect(page.locator('.b3-more summary')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('wg_active_bin_id'))).toBeNull();
});

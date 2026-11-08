const {test,expect}=require('@playwright/test');
const root='http://127.0.0.1:8765';
test('WG new local workspace never overwrites the standalone household book',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('kassenbon_data',JSON.stringify([{id:987,title:'Privates Haushaltsbuch'}]));
  localStorage.setItem('budgetbuch_budgets',JSON.stringify({Privat:900}));
  localStorage.setItem('budgetbuch_goals',JSON.stringify([{title:'Privat sparen'}]));
 });
 await page.goto(root+'/tools/wg-organisator/index.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#b3-wg-onboarding')).toBeVisible();
 await page.getByRole('button',{name:/WG-Plan mit 1 Klick erstellen/}).click();
 await page.waitForURL(/\?id=local_[a-f0-9]{32}/);
 await expect(page.locator('#b3-wg-legacy-cloud-warning')).toBeVisible();
 const result=await page.evaluate(()=>({
  receipts:JSON.parse(localStorage.getItem('kassenbon_data')),
  budgets:JSON.parse(localStorage.getItem('budgetbuch_budgets')),
  goals:JSON.parse(localStorage.getItem('budgetbuch_goals')),
  wgKeys:Object.keys(localStorage).filter(k=>k.startsWith('helferlein_wg_v2_'))
 }));
 expect(result.receipts).toEqual([{id:987,title:'Privates Haushaltsbuch'}]);
 expect(result.budgets).toEqual({Privat:900});
 expect(result.goals).toEqual([{title:'Privat sparen'}]);
 expect(result.wgKeys.length).toBeGreaterThanOrEqual(10);
 expect(await page.evaluate(()=>localStorage.getItem('wg_active_bin_id'))).toMatch(/^local_[a-f0-9]{32}$/);
});
test('WG does not contact unsecured cloud on initial load',async({page})=>{
 let cloudCalls=0;
 await page.route(/api\.npoint\.io|jsonkeeper\.com/,route=>{cloudCalls++;return route.abort()});
 await page.goto(root+'/tools/wg-organisator/index.html?id=local_existing',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#b3-wg-legacy-cloud-warning')).toBeVisible();
 await page.waitForTimeout(1200);
 expect(cloudCalls).toBe(0);
});
test('WG legacy transfer requires affirmative confirmation and never deletes source keys',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('wg_notes','[{"id":12,"title":"Altbestand"}]'));
 await page.goto(root+'/tools/wg-organisator/index.html?id=local_other',{waitUntil:'domcontentloaded'});
 page.once('dialog',dlg=>dlg.dismiss());
 await page.evaluate(()=>importLegacyWgData());
 let x=await page.evaluate(()=>({legacy:localStorage.getItem('wg_notes'),namespaced:localStorage.getItem('helferlein_wg_v2_local_other_wg_notes')}));
 expect(x.legacy).toContain('Altbestand');expect(x.namespaced).toBeNull();
 page.once('dialog',dlg=>dlg.accept());
 await page.evaluate(()=>importLegacyWgData());
 // Import also shows an informational alert.
 page.once('dialog',dlg=>dlg.accept());
 x=await page.evaluate(()=>({legacy:localStorage.getItem('wg_notes'),namespaced:localStorage.getItem('helferlein_wg_v2_local_other_wg_notes')}));
 expect(x.namespaced).toBe(x.legacy);
});
for(const p of [
 'tools/autokosten-reifenwechsel/index.html',
 'tools/haushaltsbuch-kassenbon/index.html',
 'tools/haustier-gesundheitspass/index.html',
 'tools/umzugskisten-inventar/index.html',
 'tools/parkplatz-merker-parkschein-timer/index.html',
 'tools/zaehlerstaende-erfassen/index.html'
]){
 test('Output helper available in '+p,async({page})=>{
  await page.goto(root+'/'+p,{waitUntil:'domcontentloaded'});
  const x=await page.evaluate(()=>({
   escape:window.HelferleinSafe?.html('<img src=x onerror=alert(1)>'),
   image:window.HelferleinSafe?.photo('javascript:alert(1)')
  }));
  expect(x.escape).toContain('&lt;img');expect(x.image).toBe('');
 });
}

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

test('New Nachlass vault uses passphrase and never persists master key beside ciphertext',async({page})=>{
 await page.goto(root+'/tools/digitaler-nachlass/index.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#vault-password-gate')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('digital_estate_vault'))).toBeNull();
 await page.locator('input[aria-label="Tresor-Passwort"]').fill('Langes-Sicheres-Tresorpasswort-2026');
 await page.locator('input[aria-label="Tresor-Passwort bestätigen"]').fill('Langes-Sicheres-Tresorpasswort-2026');
 await page.getByRole('button',{name:'Tresor geschützt erstellen'}).click();
 await expect(page.locator('#vault-password-gate')).toHaveCount(0);
 let cfg=await page.evaluate(()=>JSON.parse(localStorage.getItem('digital_estate_vault')));
 expect(cfg.masterKeyHex).toBeUndefined();
 expect(cfg.passwordKdf.alg).toBe('PBKDF2-SHA256');
 expect(cfg.passwordKdf.iterations).toBeGreaterThanOrEqual(200000);
 expect(cfg.encryptedData.ciphertext).toBeTruthy();
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#vault-password-gate')).toBeVisible();
 await page.locator('input[aria-label="Tresor-Passwort"]').fill('FalschesPasswort');
 await page.getByRole('button',{name:'Tresor entsperren'}).click();
 await expect(page.locator('#vault-password-gate [role="alert"]')).toContainText('Falsches Passwort',{timeout:12000});
 await page.locator('input[aria-label="Tresor-Passwort"]').fill('Langes-Sicheres-Tresorpasswort-2026');
 await page.getByRole('button',{name:'Tresor entsperren'}).click();
 try {
  await expect(page.locator('#vault-password-gate')).toHaveCount(0,{timeout:12000});
 }catch(e){
  console.log('Tresor-Entsperrstatus:',await page.locator('#vault-password-gate [role="alert"]').textContent());
  throw e;
 }
 cfg=await page.evaluate(()=>JSON.parse(localStorage.getItem('digital_estate_vault')));
 expect(cfg.masterKeyHex).toBeUndefined();
});
test('Legacy Nachlass vault remains readable and migration only after consent',async({page})=>{
 await page.goto(root+'/tools/digitaler-nachlass/index.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const key=new Uint8Array(32);crypto.getRandomValues(key);
  const hex=Array.from(key,x=>x.toString(16).padStart(2,'0')).join('');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey=await crypto.subtle.importKey('raw',key,{name:'AES-GCM'},false,['encrypt']);
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},cryptoKey,new TextEncoder().encode(JSON.stringify({entries:[]})));
  const b64=v=>btoa(String.fromCharCode(...new Uint8Array(v)));
  localStorage.setItem('digital_estate_vault',JSON.stringify({
   vaultId:'v_local_fixture',ownerName:'',ownerEmail:'',masterKeyHex:hex,
   checkInIntervalDays:30,lastCheckIn:new Date().toISOString(),trustees:[],alarmPersons:[],
   encryptedData:{iv:b64(iv),ciphertext:b64(ciphertext)}
  }));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('.tab-btn[data-tab="settings"]').first().evaluate(e=>e.click());
 await expect(page.locator('#b3-vault-legacy-warning')).toBeVisible();
 const dialogs=[];
 page.on('dialog',async dialog=>{
  dialogs.push(dialog.type());
  if(dialog.type()==='prompt')await dialog.accept('Sicheres-Migrations-Passwort-2026');
  else await dialog.accept();
 });
 await page.locator('#b3-vault-legacy-warning button').click();
 await expect(page.locator('#b3-vault-legacy-warning')).toBeHidden();
 const cfg=await page.evaluate(()=>JSON.parse(localStorage.getItem('digital_estate_vault')));
 expect(cfg.masterKeyHex).toBeUndefined();
 expect(cfg.passwordKdf.alg).toBe('PBKDF2-SHA256');
 expect(dialogs).toContain('confirm');
 expect(dialogs.filter(x=>x==='prompt')).toHaveLength(2);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#vault-password-gate')).toBeVisible();
 await page.locator('input[aria-label="Tresor-Passwort"]').fill('Sicheres-Migrations-Passwort-2026');
 await page.getByRole('button',{name:'Tresor entsperren'}).click();
 await expect(page.locator('#vault-password-gate')).toHaveCount(0);
});

test('Malicious recipe HTML renders as inert text, not executable elements',async({page})=>{
 await page.goto(root+'/tools/backform-umrechner/index.html',{waitUntil:'domcontentloaded'});
 await page.locator('#recipe-name').fill('<img src=x onerror="window.__xssHit=true">');
 await page.locator('#recipe-input').fill('250 g <img src=x onerror="window.__xssHit=true">');
 await page.evaluate(()=>calculateRecipe());
 const result=await page.evaluate(()=>{
  const root=document.getElementById('recipe-output')||document.getElementById('recipe-result');
  return {hit:window.__xssHit===true,html:root?.innerHTML||'',text:root?.textContent||''};
 });
 expect(result.hit).toBe(false);
 expect(result.html).not.toContain('<img');
 expect(result.text).toContain('<img');
});
test('Escaped QR onclick argument remains inert and preserves exact input',async({page})=>{
 await page.goto(root+'/tools/umzugskisten-inventar/index.html',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(()=>{
  const payload='");window.__xssHit=true;//<img src=x onerror=alert(1)>';
  window.__received=null;
  window.__qrFixture=value=>{window.__received=value;};
  const b=document.createElement('div');
  b.innerHTML='<button onclick="window.__qrFixture('+HelferleinSafe.jsArg(payload)+')">Test</button>';
  document.body.append(b);
  b.querySelector('button').click();
  const r={received:window.__received,hit:window.__xssHit===true,images:b.querySelectorAll('img').length};
  b.remove();
  return r;
 });
 expect(result.received).toBe('");window.__xssHit=true;//<img src=x onerror=alert(1)>');
 expect(result.hit).toBe(false);
 expect(result.images).toBe(0);
});

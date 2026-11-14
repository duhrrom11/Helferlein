import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())});
test('platform preferences, real notices, five-touch Easter egg and optional donations',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.locator('.toolya-settings')).toBeVisible();await page.evaluate(()=>window.toolyaBuddy.setMotion('off'));
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('toolya:notice',{detail:{type:'success',message:'Bestätigt gespeichert.'}})));
 const avatar=page.locator('.tb-avatar');await expect(avatar).toBeVisible();await expect.poll(()=>avatar.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
 for(let i=0;i<5;i++)await avatar.tap();await expect(page.locator('.tb-body')).toContainText('kitzlig');
 expect(await page.evaluate(()=>window.toolyaBuddy.tickle())).toBe(false);
 const link=page.locator('a.toolya-donation').first();await expect(link).toHaveAttribute('href','https://ko-fi.com/duhrrom');await expect(link).toHaveAttribute('rel','noopener noreferrer');
 await expect(link.locator('small')).toContainText('Freiwillig');expect(errors).toEqual([]);
 await page.screenshot({path:'/tmp/toolya-platform-mobile.png',fullPage:true});
});
test('critical notice and native confirmation suppress Easter egg; reduced motion stays still',async({page})=>{
 await page.goto('/');await page.evaluate(()=>window.toolyaBuddy.show('warning','Wichtiger Hinweis'));
 expect(await page.evaluate(()=>{for(let i=0;i<5;i++)window.toolyaBuddy.tickle();return window.toolyaBuddy.current.message})).toBe('Wichtiger Hinweis');
 await page.evaluate(()=>{window.pendingToolyaConfirmation=window.toolyaBuddy.confirm({message:'Wirklich fortfahren?'})});
 expect(await page.evaluate(()=>window.toolyaBuddy.tickle())).toBe(false);await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.pendingToolyaConfirmation)).toBe(false);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.tb-avatar').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
});
test('all canonical tool routes mount shared context without duplicate buddies or overflow',async({page})=>{
 for(const route of ['autokosten-reifenwechsel','backform-umrechner','digitaler-nachlass','haushaltsbuch-kassenbon','haustier-gesundheitspass','parkplatz-merker-parkschein-timer','pflanzenpflege-giessplan','umzugskisten-inventar','verliehene-gegenstaende-verwalten','wg-organisator','zaehlerstaende-erfassen']){
  await page.goto('/tools/'+route+'/');await expect(page.locator('.toolya-buddy')).toHaveCount(1);await expect(page.locator('.toolya-context')).toHaveText(/\S/);
  expect(await page.locator('.toolya-buddy').evaluate(e=>e.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
 }
});

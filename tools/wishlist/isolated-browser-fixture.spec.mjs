import {test,expect} from '@playwright/test';
import {loadIsolatedWishesPage} from './isolated-browser-fixture.mjs';

const hostileHtml=`<!doctype html><html><head><title>Isolation regression</title>
<script >window.__executedFromScript=true;</script >
<ScRiPt>window.__executedFromMixedCase=true;</sCrIpT >
<script src="/app.mjs"></script>
<script src="https://cdn.jsdelivr.net/unsafe.js"></script>
</head><body>
<img src="https://outside.invalid/image.png" onerror="window.__executedFromEvent=true">
<a id="unsafeLink" href="javascript:window.__executedFromLink=true">test</a>
</body></html>`;

for(const dashboardModules of [false,true]){
 test('CSP isolation blocks malformed script tags, event handlers and unapproved app bootstrap (dashboardModules='+dashboardModules+')',async({page})=>{
  await loadIsolatedWishesPage(page,{dashboardModules,htmlOverride:hostileHtml});
  await expect(page.locator('script')).toHaveCount(4);
  await page.waitForLoadState('load');
  const result=await page.evaluate(()=>({
   fromScript:window.__executedFromScript===true,
   fromMixedCase:window.__executedFromMixedCase===true,
   fromEvent:window.__executedFromEvent===true,
   fromBootstrap:window.__dashboard!==undefined
  }));
  expect(result).toEqual({fromScript:false,fromMixedCase:false,fromEvent:false,fromBootstrap:false});
  await page.locator('#unsafeLink').click();
  expect(await page.evaluate(()=>window.__executedFromLink===true)).toBe(false);
 });
}
test('CSP allows explicitly approved dashboard modules for browser integration',async({page})=>{
 await loadIsolatedWishesPage(page,{dashboardModules:true,htmlOverride:hostileHtml});
 const valid=await page.evaluate(async()=>{
  const {membershipForSelectedList}=await import('/bulk-helpers.mjs');
  return membershipForSelectedList({membershipReady:true,membershipByList:new Map([['l',new Set(['w'])]]),listId:'l'}).has('w');
 });
 expect(valid).toBe(true);
});

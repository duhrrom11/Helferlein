import {test,expect} from '@playwright/test';
import {loadIsolatedWishesPage} from './isolated-browser-fixture.mjs';

// Real dashboard module, isolated with strict CSP and read-only mock data.
test.beforeEach(async({page})=>{
 await loadIsolatedWishesPage(page,{dashboardModules:true});
 await page.evaluate(async()=>{
  const state={user:{id:'user-a'},fail:false,hold:null,writes:0,reads:[]};
  const lists=[
   {id:'list-a',title:'Liste A',description:'',icon:'🎁',color:'#abcdef',visibility:'private',archived:false,created_at:'2026-01-02'},
   {id:'list-b',title:'Liste B',description:'',icon:'🎁',color:'#abcdef',visibility:'private',archived:false,created_at:'2026-01-01'}
  ];
  const wishes=[{id:'wish-a',note:'Test',priority:'normal',created_at:'2026-01-01',wishlist_products:{title:'Wunsch A'}}];
  const membership=[{list_id:'list-a',wish_id:'wish-a'}];
  const db={from(table){
   const q={select(){return this},eq(field,value){this.uid=value;return this},order(){return this},range(from,to){this.bounds=[from,to];return this},
    then(resolve,reject){return Promise.resolve().then(async()=>{
     state.reads.push(table);
     if(state.hold&&table==='wishlist_list_items')await state.hold;
     if(state.fail&&table==='wishlist_list_items')return {data:null,error:new Error('membership unavailable')};
     return {data:table==='wishlist_lists'?lists:table==='wishlist_wishes'?wishes:membership,error:null};
    }).then(resolve,reject)},
    insert(){state.writes++;throw Error('writes forbidden')},update(){state.writes++;throw Error('writes forbidden')},delete(){state.writes++;throw Error('writes forbidden')}
   };return q;
  }};
  window.__dashboardTest=state;
  const {mountListsDashboard}=await import('/lists-dashboard.mjs');
  window.__dashboard=mountListsDashboard(db,()=>state.user);
 });
});
test('real dashboard: failed membership reload clears DOM cards, bulk selection and exposes retry',async({page})=>{
 await page.evaluate(()=>window.__dashboard.refresh());
 await expect(page.locator('#listWishCards .list-wish-card')).toHaveCount(1);
 await page.locator('#listWishCards input[type=checkbox]').first().check();
 await expect(page.locator('#bulkSelectedCount')).toContainText('1 ausgewählt');
 await page.evaluate(()=>{window.__dashboardTest.fail=true});
 await page.evaluate(()=>window.__dashboard.refresh());
 await expect(page.locator('#listWishCards .list-wish-card')).toHaveCount(0);
 await expect(page.locator('#bulkSelectedCount')).toContainText('0 ausgewählt');
 await expect(page.locator('#bulkAdd')).toBeDisabled();
 await expect(page.locator('#listItemsRetry')).toBeVisible();
 expect(await page.evaluate(()=>window.__dashboardTest.writes)).toBe(0);
});
test('real dashboard: list switch after reload does not retain selection',async({page})=>{
 await page.evaluate(()=>window.__dashboard.refresh());
 await page.locator('#listWishCards input[type=checkbox]').first().check();
 await expect(page.locator('#bulkSelectedCount')).toContainText('1 ausgewählt');
 await page.locator('#listsContent .list-card').filter({hasText:'Liste B'}).getByRole('button',{name:'Öffnen'}).click();
 await expect(page.locator('#bulkSelectedCount')).toContainText('0 ausgewählt');
 expect(await page.evaluate(()=>window.__dashboardTest.writes)).toBe(0);
});
test('real dashboard: pending membership reload locks bulk selection until finished',async({page})=>{
 await page.evaluate(()=>window.__dashboard.refresh());
 await page.evaluate(()=>{window.__dashboardTest.hold=new Promise(resolve=>window.__releaseMembership=resolve);window.__pendingRefresh=window.__dashboard.refresh()});
 await expect(page.locator('#bulkAdd')).toBeDisabled();
 await expect(page.locator('#listWishCards .list-wish-card')).toHaveCount(0);
 await page.evaluate(()=>window.__releaseMembership());
 await page.evaluate(()=>window.__pendingRefresh);
 await expect(page.locator('#listWishCards .list-wish-card')).toHaveCount(1);
 expect(await page.evaluate(()=>window.__dashboardTest.writes)).toBe(0);
});

test('real dashboard: retry recovers from membership error without stale bulk selection',async({page})=>{
 await page.evaluate(()=>window.__dashboard.refresh());
 await page.locator('#listWishCards input[type=checkbox]').first().check();
 await page.evaluate(()=>{window.__dashboardTest.fail=true});
 await page.evaluate(()=>window.__dashboard.refresh());
 await expect(page.locator('#bulkSelectedCount')).toContainText('0 ausgewählt');
 await page.evaluate(()=>{window.__dashboardTest.fail=false});
 await page.locator('#listItemsRetry').click();
 await expect(page.locator('#listWishCards .list-wish-card')).toHaveCount(1);
 await expect(page.locator('#bulkSelectedCount')).toContainText('0 ausgewählt');
 await expect(page.locator('#listItemsFeedback')).toBeHidden();
 expect(await page.evaluate(()=>window.__dashboardTest.writes)).toBe(0);
});
test('real dashboard: account switch invalidates pending membership response',async({page})=>{
 await page.evaluate(()=>window.__dashboard.refresh());
 await page.evaluate(()=>{
  window.__dashboardTest.hold=new Promise(resolve=>window.__releaseMembership=resolve);
  window.__pendingRefresh=window.__dashboard.refresh();
 });
 await expect(page.locator('#listWishCards .list-wish-card')).toHaveCount(0);
 await page.evaluate(()=>{window.__dashboardTest.user={id:'user-b'};window.__releaseMembership()});
 await page.evaluate(()=>window.__pendingRefresh);
 await expect(page.locator('#listWishCards .list-wish-card')).toHaveCount(0);
 await expect(page.locator('#bulkAdd')).toBeDisabled();
 expect(await page.evaluate(()=>window.__dashboardTest.writes)).toBe(0);
});

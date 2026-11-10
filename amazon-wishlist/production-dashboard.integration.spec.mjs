import {readFile} from 'node:fs/promises';
import {test,expect} from '@playwright/test';
import {loadIsolatedWishesPage} from './isolated-browser-fixture.mjs';

// The real production HTML, not the historical dashboard-only fixture.
// CSP blocks Supabase, network calls and app bootstrap; only dashboard modules load.
test('production Wishes HTML retains export tools and mounts dashboard without writes',async({page})=>{
 const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
 await loadIsolatedWishesPage(page,{dashboardModules:true,htmlOverride:html});
 await expect(page.locator('#listsDashboard')).toHaveCount(1);
 for(const id of ['exportWishes','exportWishesJson','backupFile','previewBackup','wishListSelect','listWishCards','bulkConfirmDialog']){
  await expect(page.locator('#'+id)).toHaveCount(1);
 }
 const result=await page.evaluate(async()=>{
  const {mountListsDashboard}=await import('/lists-dashboard.mjs');
  let writes=0;
  const db={from(table){
   const q={select(){return this},eq(){return this},order(){return this},range(){return this},
    then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject)},
    insert(){writes++;throw Error('Unexpected write to '+table)},
    update(){writes++;throw Error('Unexpected write to '+table)},
    delete(){writes++;throw Error('Unexpected write to '+table)}};
   return q;
  }};
  const dashboard=mountListsDashboard(db,()=>({id:'owner-a'}));
  await dashboard.refresh();
  return {writes,visible:!document.getElementById('listsDashboard').hidden,lists:document.getElementById('listsTotal').textContent};
 });
 expect(result).toEqual({writes:0,visible:true,lists:'0'});
});

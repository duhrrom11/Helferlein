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

test('production dashboard toolbar stays inside a 320px viewport',async({page})=>{
 await page.setViewportSize({width:320,height:700});
 const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
 await loadIsolatedWishesPage(page,{htmlOverride:html});
 await page.evaluate(()=>{
  const root=document.getElementById('listsDashboard');
  for(let node=root;node&&node!==document.body;node=node.parentElement)node.hidden=false;
  // The production mobile toolbar lives inside a collapsed <details> disclosure.
  // Open it before measuring visible button bounds at 320px.
  const toolbar=root.querySelector('[role="group"][aria-label="Sammelaktionen für Wünsche"]');
  const disclosure=toolbar?.closest('details');
  if(disclosure)disclosure.open=true;
 });
 const bar=page.getByRole('group',{name:'Sammelaktionen für Wünsche'});
 await expect(bar).toBeVisible();
 const overflowing=await bar.locator('button').evaluateAll(buttons=>buttons.filter(b=>{
  const r=b.getBoundingClientRect();
  return r.width>0&&r.height>0&&(r.left<0||r.right>innerWidth+1);
 }).map(b=>b.id));
 expect(overflowing).toEqual([]);
});

test('production HTML dashboard clears private list cards and editor choices on logout',async({page})=>{
 const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
 await loadIsolatedWishesPage(page,{dashboardModules:true,htmlOverride:html});
 const result=await page.evaluate(async()=>{
  let currentUser={id:'owner-a'},writes=0;
  const db={from(table){
   const q={select(){return this},eq(){return this},order(){return this},range(){return this},
    then(resolve,reject){
     const data=table==='wishlist_lists'?[{id:'private-a',user_id:'owner-a',title:'Private Liste',description:'',icon:'🎁',color:'#9D78E8',visibility:'private',archived:false,created_at:'2026-01-01'}]:[];
     return Promise.resolve({data,error:null}).then(resolve,reject);
    },
    insert(){writes++;throw Error('Unexpected write')},update(){writes++;throw Error('Unexpected write')},delete(){writes++;throw Error('Unexpected write')}};
   return q;
  }};
  const {mountListsDashboard}=await import('/lists-dashboard.mjs');
  const dashboard=mountListsDashboard(db,()=>currentUser);
  await dashboard.refresh();
  const before={visible:!document.getElementById('listsDashboard').hidden,options:document.getElementById('wishListSelect').options.length};
  currentUser=null;
  await dashboard.refresh();
  const after={hidden:document.getElementById('listsDashboard').hidden,options:document.getElementById('wishListSelect').options.length,privateText:document.getElementById('listsContent').textContent};
  return {before,after,writes};
 });
 expect(result.before.visible).toBe(true);
 expect(result.before.options).toBe(2);
 expect(result.after).toEqual({hidden:true,options:1,privateText:''});
 expect(result.writes).toBe(0);
});

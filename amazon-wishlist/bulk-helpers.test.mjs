import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleBulkTargets,summarizeBulk,bulkContextValid,bulkErrorHint,fetchAllPages,bulkControlsEnabled,currentDashboardLoad} from './bulk-helpers.mjs';
import {filterListWishes} from './list-features.mjs';

const items=[
 {id:'a',priority:1,created_at:'2026-01-01',wishlist_products:{title:'Äpfel'},note:'rot'},
 {id:'b',priority:2,created_at:'2026-01-03',wishlist_products:{title:'Buch'},note:'lesen'},
 {id:'c',priority:3,created_at:'2026-01-02',wishlist_products:{title:'Computer'},note:''}
];
test('bulk selection deduplicates, ignores unknown IDs and respects current membership',()=>{
 assert.deepEqual(eligibleBulkTargets(['a','a','b','missing','c'],['a','b','c'],new Set(['b']),true),['a','c']);
 assert.deepEqual(eligibleBulkTargets(['a','b','c'],['a','b','c'],new Set(['b']),false),['b']);
});
test('interrupted bulk retains failed and unprocessed targets, never successful targets',()=>{
 const result=summarizeBulk({targets:['a','b','c','d'],completed:['a'],failed:['b'],stopped:true});
 assert.deepEqual(result,{total:4,success:1,failed:['b'],remaining:['c','d'],interrupted:true});
});
test('complete bulk reports no pending changes',()=>{
 assert.deepEqual(summarizeBulk({targets:['a','b'],completed:['a','b']}),{total:2,success:2,failed:[],remaining:[],interrupted:false});
});
test('account switches, missing membership snapshot and archived list block bulk actions',()=>{
 const job={uid:'user-1',listId:'list-1'},base={userId:'user-1',listId:'list-1',ready:true,activeListIds:new Set(['list-1'])};
 assert.equal(bulkContextValid(job,base),true);
 assert.equal(bulkContextValid(job,{...base,userId:'user-2'}),false);
 assert.equal(bulkContextValid(job,{...base,ready:false}),false);
 assert.equal(bulkContextValid(job,{...base,activeListIds:new Set()}),false);
});
test('failure messages classify permission, duplicate, network and unknown errors',()=>{
 assert.match(bulkErrorHint({code:'42501'}),/Berechtigung/);
 assert.match(bulkErrorHint({code:'23505'}),/Bereits/);
 assert.match(bulkErrorHint({message:'Failed to fetch'}),/Verbindungsproblem/);
 assert.match(bulkErrorHint({message:'unexpected'}),/fehlgeschlagen/);
});
test('filters combine category, marker, assignment and search',()=>{
 const result=filterListWishes(items,{search:'buch',category:'books',categories:{b:'books'},marker:'star',markers:{b:'star'},assignment:'assigned',assignedIds:new Set(['b'])});
 assert.deepEqual(result.map(x=>x.id),['b']);
 assert.deepEqual(filterListWishes(items,{category:'uncategorized',categories:{b:'books'}}).map(x=>x.id),['c','a']);
 assert.deepEqual(filterListWishes(items,{marker:'none',markers:{b:'star'}}).map(x=>x.id),['c','a']);
});
test('sort order by priority, title and oldest is stable',()=>{
 assert.deepEqual(filterListWishes(items,{sort:'priority'}).map(x=>x.id),['a','b','c']);
 assert.deepEqual(filterListWishes(items,{sort:'title-desc'}).map(x=>x.id),['c','b','a']);
 assert.deepEqual(filterListWishes(items,{sort:'oldest'}).map(x=>x.id),['a','c','b']);
});

test('pagination loads all pages in order',async()=>{
 const pages=[[1,2],[3,4],[5]],calls=[];
 const result=await fetchAllPages(async(from,to)=>{calls.push([from,to]);return {data:pages[calls.length-1]}},{pageSize:2});
 assert.deepEqual(result,[1,2,3,4,5]);assert.deepEqual(calls,[[0,1],[2,3],[4,5]]);
});
test('pagination propagates load errors without returning partial data',async()=>{
 await assert.rejects(()=>fetchAllPages(async()=>({error:new Error('network')})),/network/);
});
test('pagination ignores stale responses after account switch',async()=>{
 let current=true;
 const result=await fetchAllPages(async()=>{current=false;return {data:[1]}},{isCurrent:()=>current});
 assert.equal(result,null);
});

test('invalid pagination size fails fast instead of looping forever',async()=>{
 await assert.rejects(()=>fetchAllPages(async()=>({data:[1]}),{pageSize:0}),/pageSize/);
 await assert.rejects(()=>fetchAllPages(async()=>({data:[1]}),{pageSize:1.5}),/pageSize/);
});
test('malformed paginated server response fails explicitly',async()=>{
 await assert.rejects(()=>fetchAllPages(async()=>({data:{id:'wrong'}})),/array/);
});

test('regression: reload disables bulk controls immediately until membership is ready',()=>{
 assert.equal(bulkControlsEnabled({membershipReady:true,bulkBusy:false}),true);
 assert.equal(bulkControlsEnabled({membershipReady:false,bulkBusy:false}),false);
 assert.equal(bulkControlsEnabled({membershipReady:false,bulkBusy:true}),false);
 assert.equal(bulkControlsEnabled({membershipReady:true,bulkBusy:true}),false);
});
test('regression: rejected initial read cannot publish a stale error after account switch or newer reload',()=>{
 const active={requestedUserId:'user-a',currentUserId:'user-a',requestedGeneration:3,currentGeneration:3};
 assert.equal(currentDashboardLoad(active),true);
 assert.equal(currentDashboardLoad({...active,currentUserId:'user-b'}),false);
 assert.equal(currentDashboardLoad({...active,currentGeneration:4}),false);
 assert.equal(currentDashboardLoad({...active,currentUserId:null}),false);
});
test('regression: rejected initial read may show error only for active load',async()=>{
 let currentUser='user-a',generation=1,status='loading';
 const rejected=Promise.reject(new Error('connection lost'));
 const load=async()=>{
  try{await rejected}catch(error){
   if(!currentDashboardLoad({requestedUserId:'user-a',currentUserId:currentUser,requestedGeneration:1,currentGeneration:generation}))return;
   status='error';throw error;
  }
 };
 await assert.rejects(load,/connection lost/);
 assert.equal(status,'error');
 status='loading';currentUser='user-b';generation=2;
 await load();
 assert.equal(status,'loading');
});

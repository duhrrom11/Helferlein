import test from 'node:test';
import assert from 'node:assert/strict';
import {executeBulkJob,eligibleBulkTargets,fetchAllPages} from './bulk-helpers.mjs';
import {filterListWishes} from './list-features.mjs';

function mockDatabase({wishes=['a','b','c','d'],assigned=['a'],fail=[]}={}){
 const membership=new Set(assigned),failures=new Set(fail),writes=[];
 return {
  membership,writes,
  async page(from,to){return {data:wishes.slice(from,to+1).map(id=>({id}))}},
  async write(add,id){writes.push({add,id});if(failures.has(id))return {error:{code:'42501'}};if(add)membership.add(id);else membership.delete(id);return {error:null}},
  resolve(id){failures.delete(id)}
 };
}
test('workflow: paginated wishes -> filter -> assign -> retry only failures',async()=>{
 const db=mockDatabase({fail:['c']});
 const pages=await fetchAllPages((from,to)=>db.page(from,to),{pageSize:2});
 assert.deepEqual(pages.map(w=>w.id),['a','b','c','d']);
 const targets=eligibleBulkTargets(pages.map(w=>w.id),pages.map(w=>w.id),db.membership,true);
 const first=await executeBulkJob({targets,write:id=>db.write(true,id)});
 assert.deepEqual(first.completed,['b','d']);assert.deepEqual(first.failed,['c']);
 assert.deepEqual([...db.membership].sort(),['a','b','d']);
 db.resolve('c');
 const retryTargets=eligibleBulkTargets(first.failed,pages.map(w=>w.id),db.membership,true);
 const second=await executeBulkJob({targets:retryTargets,write:id=>db.write(true,id)});
 assert.equal(second.success,1);assert.deepEqual([...db.membership].sort(),['a','b','c','d']);
 assert.deepEqual(db.writes.map(w=>w.id),['b','c','d','c']);
});
test('workflow: stop after first write and resume only unprocessed wishes',async()=>{
 const db=mockDatabase({assigned:[]});let stop=false;
 const first=await executeBulkJob({targets:['a','b','c'],write:async id=>{const response=await db.write(true,id);stop=true;return response},shouldStop:()=>stop});
 assert.deepEqual(first.completed,['a']);assert.deepEqual(first.remaining,['b','c']);
 const second=await executeBulkJob({targets:first.remaining,write:id=>db.write(true,id)});
 assert.deepEqual(second.completed,['b','c']);assert.equal(db.writes.length,3);
});
test('workflow: account switch during in-flight write prevents subsequent writes',async()=>{
 const db=mockDatabase({assigned:[]});let current='user-1';
 const result=await executeBulkJob({targets:['a','b'],isCurrent:()=>current==='user-1',write:async id=>{const response=await db.write(true,id);current='user-2';return response}});
 assert.equal(result.invalidated,true);assert.equal(db.writes.length,1);
 assert.equal(result.completed.length,0); // first server write may already have committed
});
test('workflow: overlapping page requests reject stale account response',async()=>{
 let resolveFirst;const pending=new Promise(resolve=>{resolveFirst=resolve});let generation=1;
 const old=fetchAllPages(()=>pending,{pageSize:2,isCurrent:()=>generation===1});
 generation=2;
 const newer=await fetchAllPages(async()=>({data:[{id:'new'}]}),{pageSize:2,isCurrent:()=>generation===2});
 resolveFirst({data:[{id:'old'}]});
 assert.equal(await old,null);assert.deepEqual(newer,[{id:'new'}]);
});
test('workflow: load error never returns partial membership snapshot',async()=>{
 let calls=0;
 await assert.rejects(()=>fetchAllPages(async()=>{calls++;return calls===1?{data:['a','b']}:{error:new Error('connection lost')}},{pageSize:2}),/connection lost/);
});
test('workflow: filtering assigned wishes after simulated changes',async()=>{
 const db=mockDatabase({assigned:['a']});
 const items=[{id:'a',created_at:'2026-01-01',priority:1,wishlist_products:{title:'A'}},{id:'b',created_at:'2026-01-02',priority:2,wishlist_products:{title:'B'}}];
 assert.deepEqual(filterListWishes(items,{assignment:'assigned',assignedIds:db.membership}).map(w=>w.id),['a']);
 await db.write(true,'b');
 assert.deepEqual(filterListWishes(items,{assignment:'assigned',assignedIds:db.membership}).map(w=>w.id),['b','a']);
});

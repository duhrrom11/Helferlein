// Isolated, deterministic regression tests. No browser, credentials or Supabase access.
const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const load=()=>import(pathToFileURL(path.resolve(__dirname,'../amazon-wishlist/bulk-helpers.mjs')).href);
test('write error before first mutation needs no refresh',async()=>{
 const {moveFailureState}=await load();
 assert.deepEqual(moveFailureState({writeStarted:false,contextValid:true}),{uncertain:false,refreshRequired:false,mayPublish:true});
});
test('write error after partial change requires refresh and uncertainty warning',async()=>{
 const {moveFailureState}=await load();
 assert.deepEqual(moveFailureState({writeStarted:true,contextValid:true}),{uncertain:true,refreshRequired:true,mayPublish:true});
});
test('context switch must not publish stale move feedback',async()=>{
 const {moveFailureState,bulkMoveRefreshStatus}=await load();
 assert.deepEqual(moveFailureState({writeStarted:true,contextValid:false}),{uncertain:true,refreshRequired:false,mayPublish:false});
 assert.equal(bulkMoveRefreshStatus('done',{refreshSucceeded:false,currentContext:false}),null);
});
test('bulk move failed refresh is explicitly provisional',async()=>{
 const {bulkMoveRefreshStatus}=await load();
 assert.match(bulkMoveRefreshStatus('2 verschoben',{refreshSucceeded:false,currentContext:true}),/Vorläufiges Ergebnis: 2 verschoben/);
 assert.equal(bulkMoveRefreshStatus('2 verschoben',{refreshSucceeded:true,currentContext:true}),'2 verschoben');
});
test('uncertain bulk outcomes overlap failed and unfinished counters',async()=>{
 const {bulkMoveCounts}=await load();
 assert.deepEqual(bulkMoveCounts({total:5,moved:1,failed:2,uncertain:2,stopped:true}),{total:5,moved:1,failed:2,uncertain:2,unfinished:2,overlapPossible:true});
 assert.throws(()=>bulkMoveCounts({total:2,moved:2,failed:1,uncertain:0}),RangeError);
});
test('bulk write outcome after invalidation never publishes progress',async()=>{
 const {executeBulkJob}=await load();let current=true,progress=0;
 const result=await executeBulkJob({targets:['a','b'],write:async()=>{current=false;return {error:new Error('network')}},isCurrent:()=>current,onProgress:()=>progress++});
 assert.equal(result.invalidated,true);assert.equal(progress,0);assert.equal(result.completed.length,0);
});
test('bulk write error is reported without automatic retry',async()=>{
 const {executeBulkJob}=await load();let writes=0;
 const result=await executeBulkJob({targets:['a'],write:async()=>{writes++;throw Error('timeout')}});
 assert.equal(writes,1);assert.equal(result.failed.length,1);assert.equal(result.errors[0].reason,'Verbindungsproblem – bitte Verbindung prüfen.');
});

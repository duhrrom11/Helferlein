// Read-only source integration assertions; no DOM, network, credentials or database.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../amazon-wishlist/lists-dashboard.mjs'),'utf8');
const helpers=fs.readFileSync(path.join(__dirname,'../amazon-wishlist/bulk-helpers.mjs'),'utf8');
test('dashboard imports every move status decision from pure helpers',()=>{
 for(const name of ['bulkMoveRefreshStatus','moveFailureState','bulkMoveCounts']){
  assert.match(source,new RegExp('\\b'+name+'\\b'));
  assert.match(helpers,new RegExp('export function '+name+'\\('));
 }
});
test('failed bulk refresh labels summary provisional under active context',()=>{
 assert.match(source,/bulkMoveRefreshStatus\(summary,\{refreshSucceeded:false,currentContext:true\}\)/);
 assert.match(source,/refreshGeneration===loadGeneration/);
});
test('single move marks started writes and handles ambiguous failures',()=>{
 assert.match(source,/writeStarted=true/);
 assert.match(source,/moveFailureState\(\{writeStarted,contextValid:current\(\)\}\)/);
 assert.match(source,/Zuordnungsstand unklar/);
});
test('bulk counts are derived from validated helper and not additive uncertainty',()=>{
 assert.match(source,/bulkMoveCounts\(\{total:targets\.length,moved,failed,uncertain:partial,stopped\}\)/);
 assert.match(source,/Überschneidung mit fehlgeschlagen\/nicht abgeschlossen möglich/);
});

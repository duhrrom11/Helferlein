'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createTransactionalHeirRepository}=require('../tools/digitaler-nachlass/heir-transaction-v2.cjs');
const id={vaultId:'v_12345678',userId:'22222222-2222-4222-8222-222222222222'};
function fake({failAt,rollbackFails=false,rows=[]}={}){
 const calls=[];let releases=0;
 const client={query:async(sql,args)=>{
  const kind=sql.startsWith('BEGIN')?'BEGIN':sql.startsWith('COMMIT')?'COMMIT':sql.startsWith('ROLLBACK')?'ROLLBACK':'SELECT';
  calls.push({kind,args});
  if(kind===failAt||(kind==='ROLLBACK'&&rollbackFails))throw Error('private_'+kind);
  return {rows:kind==='SELECT'?rows:[]};
 },release:()=>{releases++;}};
 return {pool:{connect:async()=>client},calls,get releases(){return releases;}};
}
test('invalid identity never executes SELECT and still closes transaction',async()=>{
 const f=fake();assert.equal(await createTransactionalHeirRepository(f.pool).readAuthorizedEnvelopeSnapshot({vaultId:'invalid',userId:id.userId}),null);
 assert.deepEqual(f.calls.map(x=>x.kind),['BEGIN','COMMIT']);assert.equal(f.releases,1);
});
test('SELECT failure rolls back and releases, never commits',async()=>{
 const f=fake({failAt:'SELECT'});
 await assert.rejects(createTransactionalHeirRepository(f.pool).readAuthorizedEnvelopeSnapshot(id),/private_SELECT/);
 assert.deepEqual(f.calls.map(x=>x.kind),['BEGIN','SELECT','ROLLBACK']);assert.equal(f.releases,1);
});
test('COMMIT failure triggers rollback and releases, never returns ciphertext',async()=>{
 const f=fake({failAt:'COMMIT'});
 await assert.rejects(createTransactionalHeirRepository(f.pool).readAuthorizedEnvelopeSnapshot(id),/private_COMMIT/);
 assert.deepEqual(f.calls.map(x=>x.kind),['BEGIN','SELECT','COMMIT','ROLLBACK']);assert.equal(f.releases,1);
});
test('rollback failure does not replace original SELECT failure',async()=>{
 const f=fake({failAt:'SELECT',rollbackFails:true});
 await assert.rejects(createTransactionalHeirRepository(f.pool).readAuthorizedEnvelopeSnapshot(id),/private_SELECT/);
 assert.deepEqual(f.calls.map(x=>x.kind),['BEGIN','SELECT','ROLLBACK']);assert.equal(f.releases,1);
});
test('BEGIN failure releases without issuing rollback or select',async()=>{
 const f=fake({failAt:'BEGIN'});
 await assert.rejects(createTransactionalHeirRepository(f.pool).readAuthorizedEnvelopeSnapshot(id),/private_BEGIN/);
 assert.deepEqual(f.calls.map(x=>x.kind),['BEGIN']);assert.equal(f.releases,1);
});

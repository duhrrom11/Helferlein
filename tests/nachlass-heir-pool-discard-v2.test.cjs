'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createTransactionalHeirRepository}=require('../tools/digitaler-nachlass/heir-transaction-v2.cjs');
const identity={vaultId:'v_12345678',userId:'22222222-2222-4222-8222-222222222222'};
for(const mode of ['BEGIN','ROLLBACK']) test('discard pooled client after '+mode+' failure',async()=>{
 let releaseArgs=[];
 const client={query:async(sql)=>{if(mode==='BEGIN'&&sql.startsWith('BEGIN'))throw Error('begin failed');if(mode==='ROLLBACK'&&sql.toUpperCase().startsWith('SELECT'))throw Error('select failed');if(mode==='ROLLBACK'&&sql==='ROLLBACK')throw Error('rollback failed');return {rows:[]};},release:(err)=>releaseArgs.push(err)};
 await assert.rejects(createTransactionalHeirRepository({connect:async()=>client}).readAuthorizedEnvelopeSnapshot(identity));
 assert.equal(releaseArgs.length,1);
 assert.ok(releaseArgs[0] instanceof Error,'broken connection must be discarded from pool');
});

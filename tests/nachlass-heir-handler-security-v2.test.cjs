'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHeirReadHandler}=require('../tools/digitaler-nachlass/heir-handler-v2.cjs');
const heir='22222222-2222-4222-8222-222222222222';
const foreign='33333333-3333-4333-8333-333333333333';
const url='https://localhost/v2/vaults/v_12345678/heir-envelope';
const request=()=>new Request(url,{headers:{authorization:'Bearer abcdefghijklmnop'}});
function pool(rows){let connects=0;const calls=[];return {get connects(){return connects;},calls,connect:async()=>{connects++;return {query:async(sql,args)=>{calls.push({sql,args});return {rows:sql.startsWith('select')?rows:[]};},release:()=>{}};}};}
const auth=userId=>({getUser:async()=>({data:{user:{id:userId,email_confirmed_at:'2026-01-01'}},error:null})});
const row={vault_id:'v_12345678',owner_user_id:'11111111-1111-4111-8111-111111111111',state:'RELEASED',membership_vault_id:'v_12345678',heir_user_id:heir,status:'ACTIVE',identity_verified:true,encrypted_envelope:{ciphertext:'only-encrypted'}};
test('rejected auth never connects to database',async()=>{const db=pool([row]);const handler=createHeirReadHandler({auth:{getUser:async()=>({data:{user:null},error:null})},pool:db});assert.equal((await handler(request())).status,401);assert.equal(db.connects,0);});
test('foreign verified identity is bound as SQL parameter and denied',async()=>{const db=pool([row]);const res=await createHeirReadHandler({auth:auth(foreign),pool:db})(request());assert.equal(res.status,404);assert.deepEqual(db.calls.find(x=>x.args).args,['v_12345678',foreign]);});
test('revoked membership never yields ciphertext',async()=>{const db=pool([{...row,status:'REVOKED'}]);const res=await createHeirReadHandler({auth:auth(heir),pool:db})(request());assert.equal(res.status,404);assert.doesNotMatch(await res.text(),/only-encrypted/);});
test('database error masks details and releases pooled client',async()=>{let releases=0;const db={connect:async()=>({query:async()=>{throw Error('secret database details');},release:()=>{releases++;}})};const res=await createHeirReadHandler({auth:auth(heir),pool:db})(request());assert.equal(res.status,503);assert.deepEqual(await res.json(),{error:'unavailable'});assert.equal(releases,1);});

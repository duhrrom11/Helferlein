'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readHeirEnvelope}=require('../tools/digitaler-nachlass/heir-read-api-v2.cjs');
const OWNER='11111111-1111-4111-8111-111111111111';
const HEIR='22222222-2222-4222-8222-222222222222';
const OTHER='33333333-3333-4333-8333-333333333333';
const id='v_12345678';
const req=(method='GET',path=`/v2/vaults/${id}/heir-envelope`,token=true)=>new Request('https://localhost'+path,{method,headers:token?{authorization:'Bearer abcdefghijklmnop'}:{}});
const auth=(uid=HEIR)=>({getUser:async()=>({data:{user:{id:uid,email_confirmed_at:'2026-01-01'}},error:null})});
const snap=(state='RELEASED',userId=HEIR)=>({vault:{id,ownerUserId:OWNER,state},membership:{vaultId:id,userId,status:'ACTIVE',identityVerified:true},envelope:{ciphertext:'encrypted'}});
const repository=value=>({readAuthorizedEnvelopeSnapshot:async()=>value});
test('released heir gets encrypted envelope only',async()=>{
 const res=await readHeirEnvelope(req(),{auth:auth(),repository:repository(snap())});
 assert.equal(res.status,200);assert.deepEqual(await res.json(),{encryptedEnvelope:{ciphertext:'encrypted'}});
});
test('foreign heir and premature release are denied',async()=>{
 for(const snapshot of [snap('LOCKED'),snap('ALARM_PENDING'),snap('REVOKED'),snap('RELEASED',OTHER),{...snap(),membership:{...snap().membership,status:'REVOKED'}},{...snap(),vault:{...snap().vault,id:'v_other123'}}]){
  const res=await readHeirEnvelope(req(),{auth:auth(),repository:repository(snapshot)});assert.equal(res.status,404);
 }
});
test('no repository, no token, and malformed requests fail closed',async()=>{
 assert.equal((await readHeirEnvelope(req(),{auth:auth()})).status,503);
 assert.equal((await readHeirEnvelope(req('GET',undefined,false),{auth:auth(),repository:repository(snap())})).status,401);
 assert.equal((await readHeirEnvelope(req('POST'),{auth:auth(),repository:repository(snap())})).status,405);
 assert.equal((await readHeirEnvelope(req('GET','/v2/vaults/v_bad/heir-envelope'),{auth:auth(),repository:repository(snap())})).status,404);
});
test('replayed read after revocation is denied by fresh snapshot',async()=>{
 let current=snap();const repo={readAuthorizedEnvelopeSnapshot:async()=>current};
 assert.equal((await readHeirEnvelope(req(),{auth:auth(),repository:repo})).status,200);
 current={...current,membership:{...current.membership,status:'REVOKED'}};
 assert.equal((await readHeirEnvelope(req(),{auth:auth(),repository:repo})).status,404);
});
test('repository error never reveals internals',async()=>{
 const res=await readHeirEnvelope(req(),{auth:auth(),repository:{readAuthorizedEnvelopeSnapshot:async()=>{throw Error('private');}}});
 assert.equal(res.status,503);assert.deepEqual(await res.json(),{error:'unavailable'});
});

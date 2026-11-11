import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createHeirPgAdmission } from '../../supabase/functions/_shared/heir-http-rate-limit-staging.ts';

globalThis.crypto ??= webcrypto;
const route='/v1/heirs/invitations/create';
const user='11111111-1111-4111-8111-111111111111';
const request=new Request('https://api.example.com', {method:'GET'});
function fixture(remote='ci-test-ip') {
 const hits=new Map(), keys=[];
 const backend={transaction:async fn=>fn({one:async (_sql, [hash,path])=>{
   assert.equal(typeof hash,'string');assert.equal(hash.length,64);
   const key=hash+path;keys.push([hash,path]); const n=(hits.get(key)??0)+1;hits.set(key,n);return {hits:n};
 }})};
 return {admission:createHeirPgAdmission(backend,{remoteIdentity:async()=>remote}),keys};
}
test('pre-auth admission limits bursts without storing IPs or bearer tokens', async()=>{
 const {admission,keys}=fixture();for(let i=0;i<30;i++)assert.equal(await admission.preAuth(request,route),true);
 assert.equal(await admission.preAuth(request,route),false);
 assert.equal(keys[0][0].includes('ci-test-ip'),false);
});
test('authenticated invitations stricter, other routes separately counted',async()=>{
 const {admission}=fixture();for(let i=0;i<3;i++)assert.equal(await admission.user(user,route),true);
 assert.equal(await admission.user(user,route),false);
 assert.equal(await admission.user(user,'/v1/heirs/invitations/redeem'),true);
 assert.equal(await admission.user('bad',route),false);
});
test('invalid ingress identity and backend failure both deny',async()=>{
 const denied=createHeirPgAdmission({transaction:async()=>{throw Error('db unavailable')}},{remoteIdentity:async()=> 'ci-test-ip'});
 assert.equal(await denied.preAuth(request,route),false);
 assert.equal(await denied.user(user,route),false);
 const spoofed=createHeirPgAdmission({transaction:async()=>{throw Error('must not query')}},{remoteIdentity:async()=> null});
 assert.equal(await spoofed.preAuth(request,route),false);
});

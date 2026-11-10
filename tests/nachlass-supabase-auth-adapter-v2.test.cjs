'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { authenticateSupabase, createSupabaseVerifier } = require('../tools/digitaler-nachlass/supabase-auth-adapter-v2.cjs');
const ID = '123e4567-e89b-42d3-a456-426614174000';
const req = token => new Request('https://localhost/v2/vaults/v_12345678/alarm', {method:'POST', headers: token ? {authorization:'Bearer '+token} : {}});
const TOKEN = 'abcdefghijklmnop';
test('server verifies bearer through injected Supabase getUser', async () => {
  let called = 0;
  const principal = await authenticateSupabase(req(TOKEN), {getUser: async token => {
    assert.equal(token, TOKEN); called++;
    return {data:{user:{id:ID,email_confirmed_at:'2026-01-01T00:00:00Z',role:'service_role',user_metadata:{admin:true}}},error:null};
  }});
  assert.deepEqual(principal,{userId:ID});
  assert.equal(called,1);
});
test('missing token never reaches auth provider', async () => {
  let called = false;
  await assert.rejects(authenticateSupabase(req(null), {getUser: async () => {called=true;return {};}}),/unauthorized/);
  assert.equal(called,false);
});
test('reject anonymous, unconfirmed, invalid, and failed identities', async () => {
  for (const user of [null,{id:ID},{id:ID,is_anonymous:true,email_confirmed_at:'yes'},{id:'attacker',email_confirmed_at:'yes'}]) {
    await assert.rejects(authenticateSupabase(req(TOKEN), {getUser:async()=>({data:{user},error:null})}),/unauthorized/);
  }
  await assert.rejects(authenticateSupabase(req(TOKEN), {getUser:async()=>({data:{user:{id:ID,email_confirmed_at:'yes'}},error:{message:'invalid'}})}),/unauthorized/);
  await assert.rejects(authenticateSupabase(req(TOKEN), {getUser:async()=>{throw Error('private token');}}),/unauthorized/);
});
test('invalid verifier dependency fails closed', () => {
  for (const value of [null,{}, {getUser: true}]) assert.throws(()=>createSupabaseVerifier(value),/invalid_auth_client/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeirHttpStaging } from '../../supabase/functions/_shared/heir-http-staging.ts';

const ORIGIN = 'https://duhrrom11.github.io';
const BASE = 'https://example.supabase.co/v1/heirs';
const UID = '11111111-1111-4111-8111-111111111111';
const vaultId = 'v_abcdefgh';
const id = '22222222-2222-4222-8222-222222222222';
const jwt = 'Bearer valid.token.1234';
const token = 'a'.repeat(43);
const action = '/invitations/create';
const req = (path, body, headers={}, method='POST') => new Request(BASE+path, {
  method,
  headers: { Origin: ORIGIN, Authorization: jwt, 'Content-Type': 'application/json', ...headers },
  ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
});
function fixture(overrides={}) {
  const calls = [];
  const service = name => async (...args) => { calls.push([name,...args]);return {ok:true, token, state:'grace'}; };
  const services = {
    createInvitation:service('create'), redeemInvitation:service('redeem'), revokeInvitation:service('revoke'),
    putEnvelope:service('envelope'), beginEnrollment:service('keyBegin'), confirmEnrollment:service('keyConfirm'),
    raiseAlarm:service('raise'), cancelAlarm:service('cancel'), reviewStatus:service('status'),
  };
  const verifier = async header => header === jwt ? UID : null;
  const opts = {
    allowedOrigins:[ORIGIN],verifyUser:verifier,
    admission:{preAuth:async()=>true, user:async()=>true},services,
    ...overrides,
  };
  return {handle:createHeirHttpStaging(opts),calls};
}
test('origin, method, preflight and strict route prevent unauthorized requests', async () => {
  const {handle,calls} = fixture();
  assert.equal((await handle(req(action, {vaultId,intendedUserId:id,ttlSeconds:3600},{Origin:'https://evil.example'}))).status,403);
  assert.equal((await handle(req(action,{vaultId,intendedUserId:id,ttlSeconds:3600}, {}, 'GET'))).status,405);
  assert.equal((await handle(req('/envelopes/fetch',{}))).status,404);
  assert.equal((await handle(req(action+'?token=leak',{}))).status,404);
  const preflight = await handle(req(action,undefined,{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization, content-type'},'OPTIONS'));
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-origin'),ORIGIN);
  assert.equal(calls.length,0);
});
test('verified user, mandatory admission and exact JSON shape', async () => {
  const {handle,calls} = fixture();
  assert.equal((await handle(req(action,{vaultId,intendedUserId:id,ttlSeconds:3600},{Authorization:'Bearer invalid.token.123'}))).status,401);
  assert.equal((await handle(req(action,{vaultId,intendedUserId:id,ttlSeconds:3600,ownerUserId:UID}))).status,400);
  assert.equal((await handle(req(action,{vaultId,intendedUserId:id,ttlSeconds:3600},{'Content-Type':'text/plain'}))).status,400);
  assert.equal((await handle(req(action,'"'+('x'.repeat(8192))+'"'))).status,400);
  assert.equal(calls.length,0);
  const {handle:blocked} = fixture({admission:{preAuth:async()=>false,user:async()=>true}});
  assert.equal((await blocked(req(action,{vaultId,intendedUserId:id,ttlSeconds:3600}))).status,429);
});
test('invitation token only returned after owner service success, never logged/cached', async () => {
  const {handle,calls}=fixture();
  const r=await handle(req(action,{vaultId,intendedUserId:id,ttlSeconds:3600}));
  assert.equal(r.status,200);
  assert.deepEqual(await r.json(),{ok:true,token});
  assert.match(r.headers.get('cache-control'),/no-store/);
  assert.equal(r.headers.get('referrer-policy'),'no-referrer');
  assert.equal(calls[0][0],'create');
  assert.equal(calls[0][1],jwt);
});
test('API routes preserve service authorization and hide accidental extra fields', async () => {
  const {handle,calls}=fixture();
  const r=await handle(req('/alarms/status',{ownerUserId:id,vaultId}));
  assert.deepEqual(await r.json(),{ok:true,state:'grace'});
  const r2=await handle(req('/invitations/redeem',{token}));
  assert.deepEqual(await r2.json(),{ok:true});
  assert.equal(calls[1][2],token);
  assert.equal(calls.length,2);
});
test('missing rate limiter and service failures fail closed', async () => {
  const s=fixture();
  assert.throws(()=>createHeirHttpStaging({allowedOrigins:[ORIGIN],verifyUser:async()=>UID,admission:null,services:{}}));
  const {handle}=fixture({admission:{preAuth:async()=>true,user:async()=>{throw new Error('DB down')} }});
  assert.equal((await handle(req(action,{vaultId,intendedUserId:id,ttlSeconds:3600}))).status,403);
  assert.equal(s.calls.length,0);
});

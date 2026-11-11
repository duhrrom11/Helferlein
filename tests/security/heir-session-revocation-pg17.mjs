/** CI ONLY. An authentic pg-role check against synthetic auth.sessions rows.
 * Never runs against production: exact database / host / role guard required.
 */
import assert from 'node:assert/strict';
import pg from 'pg';
import { createHeirPgTransactionAdapter } from '../../supabase/functions/_shared/heir-pg-transaction-adapter.ts';
import { createHeirActiveSessionVerifier } from '../../supabase/functions/_shared/heir-active-session-staging.ts';
const UID='11111111-1111-4111-8111-111111111111';
const SID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
if(process.env.HEIR_ISOLATED_TEST_DB!=='1' || process.env.PGDATABASE!=='helferlein_heir_ci' ||
   process.env.PGHOST!=='127.0.0.1' || process.env.PGUSER!=='heir_ci_backend' ||
   process.env.HEIR_CI_ROLE_PASSWORD!=='test-server-role-local-only' ||
   process.env.PGPASSWORD!=='isolated-ci-only') throw Error('isolated_pg_only');

const restricted=new pg.Pool({host:'127.0.0.1',port:5432,database:'helferlein_heir_ci',
 user:'heir_ci_backend',password:process.env.HEIR_CI_ROLE_PASSWORD,max:2});
const admin=new pg.Pool({host:'127.0.0.1',port:5432,database:'helferlein_heir_ci',
 user:'postgres',password:process.env.PGPASSWORD,max:1});
const fake={
 auth:{
  async getUser(token){return {data:{user:token==='valid_owner_token'?{id:UID}:null},error:null};},
  async getClaims(token){return {data:token==='valid_owner_token'?
    {claims:{sub:UID,session_id:SID,exp:Math.floor(Date.now()/1000)+600}}:null,error:null};}
 }
};
try{
 const verify=createHeirActiveSessionVerifier(createHeirPgTransactionAdapter(restricted),fake);
 assert.equal(await verify('Bearer valid_owner_token'),UID,'CI active session accepted');
 assert.equal(await verify('Bearer forged_owner_token'),null);
 await assert.rejects(restricted.query('DELETE FROM auth.sessions WHERE id=$1',[SID]),
    /permission denied|row-level security/i,'backend cannot terminate sessions');
 await admin.query('DELETE FROM auth.sessions WHERE id=$1',[SID]);
 assert.equal(await verify('Bearer valid_owner_token'),null,
  'unexpired JWT with revoked session must be rejected');
 const noClaims={auth:{...fake.auth,async getClaims(){
   return {data:{claims:{sub:UID,session_id:SID,exp:Math.floor(Date.now()/1000)+600}},error:'invalid_signature'};
 }}};
 assert.equal(await createHeirActiveSessionVerifier(createHeirPgTransactionAdapter(restricted),noClaims)('Bearer valid_owner_token'),null);
 console.log(JSON.stringify({status:'passed',database:'isolated PostgreSQL 17',
  checks:['valid signed claim and existing auth session','revocation immediately denies old JWT',
  'restricted role cannot delete sessions','invalid cryptographic claims denied']}));
}finally{
 await admin.query('INSERT INTO auth.sessions(id,user_id) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',[SID,UID]);
 await Promise.all([restricted.end(),admin.end()]);
}

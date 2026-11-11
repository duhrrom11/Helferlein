/** CI-only HTTPS server: actual HTTP composition -> restricted pg adapter.
 * NEVER deploy. It refuses any database/host other than the ephemeral CI fixture.
 * Its Supabase auth.getUser provider is a test double, NOT live Supabase Auth.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:https';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { createHeirPgTransactionAdapter } from '../../supabase/functions/_shared/heir-pg-transaction-adapter.ts';
import { composeHeirServerStaging } from '../../supabase/functions/_shared/heir-server-composition-staging.ts';

const OWNER='11111111-1111-4111-8111-111111111111';
const OTHER='33333333-3333-4333-8333-333333333333';
const HEIR='22222222-2222-4222-8222-222222222222';
const VAULT='v_abcdefgh';
const ownerToken='ci_owner_ephemeral_access_token';
const otherToken='ci_other_ephemeral_access_token';
const heirToken='ci_heir_ephemeral_access_token';
const users=new Map([[ownerToken,OWNER],[otherToken,OTHER],[heirToken,HEIR]]);

if(process.env.HEIR_ISOLATED_TEST_DB!=='1'||process.env.PGDATABASE!=='helferlein_heir_ci'||
   process.env.PGHOST!=='127.0.0.1'||process.env.PGUSER!=='heir_ci_backend'||
   process.env.HEIR_CI_ROLE_PASSWORD!=='test-server-role-local-only'||
   !process.env.HEIR_CI_TLS_KEY||!process.env.HEIR_CI_TLS_CERT) {
  throw Error('refusing non-ephemeral test environment');
}
const pool=new Pool({host:'127.0.0.1',port:5432,database:'helferlein_heir_ci',
  user:'heir_ci_backend',password:process.env.HEIR_CI_ROLE_PASSWORD,max:4,
  connectionTimeoutMillis:2000,statement_timeout:5000});
const db=createHeirPgTransactionAdapter(pool);
const ingress=new WeakMap();
let httpHandler;
const csp="default-src 'none'; script-src 'self'; connect-src 'self'; style-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const page=`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Isolierter Erben-Test</title></head><body><main id="host"></main><script src="/assets/heir-owner-invitations-staging.js"></script><script src="/assets/heir-owner-invitations-transport-staging.js"></script><script src="/assets/heir-owner-session-staging.js"></script><script src="/ci/heir-e2e-harness.js"></script></body></html>`;
const harness=`(() => {
  'use strict';
  const OWNER='${OWNER}', OTHER='${OTHER}', HEIR='${HEIR}', VAULT='${VAULT}';
  const tokens={owner:'${ownerToken}',other:'${otherToken}',heir:'${heirToken}',invalid:'ci_revoked_server_access_token'};
  let active='owner', currentToken=tokens.owner, listeners=new Set();
  const ids={owner:OWNER,other:OTHER,heir:HEIR,invalid:OWNER};
  const auth={
    async getSession(){return {error:null,data:{session:active?{access_token:currentToken,expires_at:Math.floor(Date.now()/1000)+300}:null}};},
    async getUser(token){return {error:null,data:{user:token===currentToken && active?{id:ids[active]}:null}};},
    onAuthStateChange(callback){listeners.add(callback);return {data:{subscription:{unsubscribe(){listeners.delete(callback);}}}}}
  };
  window.ci={
    auth,
    confirm:true,
    setAccount(account){active=account;currentToken=account?tokens[account]:null;for(const cb of listeners)cb(account?'SIGNED_IN':'SIGNED_OUT',null);},
    sessionRevokedOnServer(){active='invalid';currentToken=tokens.invalid;for(const cb of listeners)cb('SIGNED_IN',null);},
    listenerCount(){return listeners.size;},
    setConfirmation(value){this.confirm=value;},
    dispose(){this.binding?.dispose()},
    VAULT,OWNER,OTHER,HEIR
  };
  window.ci.binding=window.HeirOwnerSessionStaging.attach({
    host:document.getElementById('host'),vaultId:VAULT,supabase:{auth},confirm:()=>window.ci.confirm
  });
})();`;
const files=new Map([
 ['/assets/heir-owner-invitations-staging.js','assets/heir-owner-invitations-staging.js'],
 ['/assets/heir-owner-invitations-transport-staging.js','assets/heir-owner-invitations-transport-staging.js'],
 ['/assets/heir-owner-session-staging.js','assets/heir-owner-session-staging.js']
]);
function safeHeaders(res,contentType){
 res.setHeader('Content-Type',contentType);
 res.setHeader('Cache-Control','no-store, private');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',csp);
 res.setHeader('Strict-Transport-Security','max-age=0'); // ephemeral self-signed localhost: never pin
}
const server=createServer({key:readFileSync(process.env.HEIR_CI_TLS_KEY),cert:readFileSync(process.env.HEIR_CI_TLS_CERT)},async(req,res)=>{
 const remote=req.socket.remoteAddress;
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remote)){res.writeHead(403);res.end();return;}
 const path=req.url;
 if(req.method==='GET' && (path==='/'||path==='/index.html'||files.has(path)||path==='/ci/heir-e2e-harness.js')){
   const type=path.endsWith('.js')?'application/javascript; charset=utf-8':'text/html; charset=utf-8';
   safeHeaders(res,type);
   res.statusCode=200;
   res.end(path==='/ci/heir-e2e-harness.js'?harness:files.has(path)?readFileSync(files.get(path)):page);
   return;
 }
 try{
   const url=`https://127.0.0.1:${server.address().port}${path}`;
   const request=new Request(url,{method:req.method,headers:req.headers,
     body:req.method==='GET'||req.method==='HEAD'?undefined:req,duplex:'half'});
   ingress.set(request,remote);
   const result=await httpHandler(request);
   res.statusCode=result.status;
   for(const [key,val] of result.headers)res.setHeader(key,val);
   safeHeaders(res,'application/json; charset=utf-8');
   res.end(Buffer.from(await result.arrayBuffer()));
 }catch{
   safeHeaders(res,'application/json; charset=utf-8');
   res.statusCode=403;res.end('{"ok":false}');
 }
});
server.on('error',err=>{console.error('ci_https_server_failed',err.code||'unknown');process.exitCode=1;});
server.listen(0,'127.0.0.1',()=>{
 const origin=`https://127.0.0.1:${server.address().port}`;
 httpHandler=composeHeirServerStaging({
   database:db,
   supabaseAuth:{auth:{async getUser(token){return {data:{user:users.has(token)?{id:users.get(token)}:null},error:null};}}},
   trustedIngress:{async remoteIdentity(request){return ingress.get(request)||null;}},
   allowedOrigins:[origin]
 });
 console.log(JSON.stringify({ready:true,origin,synthetic_auth_only:true,ephemeral_pg_only:true}));
});
const cleanup=async()=>{server.close();await pool.end();};
process.on('SIGTERM',()=>{void cleanup().then(()=>process.exit(0));});

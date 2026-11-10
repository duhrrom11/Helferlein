'use strict';
const { authenticateSupabase } = require('./supabase-auth-adapter-v2.cjs');
const { authorize } = require('./supabase-heir-access-v2.cjs');
const ID = /^v_[A-Za-z0-9_-]{8,128}$/;
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'};
function response(status,error){return new Response(JSON.stringify({error}),{status,headers});}
// Read-only, server-only. Repository MUST return one transactionally consistent
// snapshot and re-check revocation. No browser-side database access is authorized.
async function readHeirEnvelope(request,{auth,repository}={}){
 if(!(request instanceof Request))return response(400,'invalid_request');
 if(request.method!=='GET')return response(405,'method_not_allowed');
 const url=new URL(request.url);
 const match=/^\/v2\/vaults\/([^/]+)\/heir-envelope$/.exec(url.pathname);
 if(!match||!ID.test(match[1])||url.search)return response(404,'not_found');
 let principal;
 try{principal=await authenticateSupabase(request,auth);}
 catch{return response(401,'unauthorized');}
 if(!repository||typeof repository.readAuthorizedEnvelopeSnapshot!=='function')return response(503,'not_configured');
 try{
  const snapshot=await repository.readAuthorizedEnvelopeSnapshot({vaultId:match[1],userId:principal.userId});
  if(!snapshot||!snapshot.vault||snapshot.vault.id!==match[1]||
     !snapshot.membership||snapshot.membership.userId!==principal.userId||
     !authorize({principal:{...principal,verified:true},vault:snapshot.vault,
       membership:snapshot.membership,action:'READ_HEIR_ENVELOPE'}).allowed||
     !snapshot.envelope||typeof snapshot.envelope!=='object'||Array.isArray(snapshot.envelope))
    return response(404,'not_found');
  return new Response(JSON.stringify({encryptedEnvelope:snapshot.envelope}),{status:200,headers});
 }catch{return response(503,'unavailable');}
}
module.exports={readHeirEnvelope};

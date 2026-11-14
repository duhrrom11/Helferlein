// REVIEW ONLY. Requires rate-limit SQL and server-only service-role secret.
// The function intentionally fails closed if the quota service is unavailable.
import {normalizeWishlistUrl,parseWishlistPage,combineProducts,ScrapeError} from './amazon-scraper-core.mjs';
import {signedIpFingerprint,gatewayNonceFromHeaders,IpGuardError} from './ip-guard.mjs';
import {corsOrigin,parseBodyText,quotaDecision,validQuotaConfig,GuardError,MAX_REQUEST_BYTES} from './scrape-guard.mjs';
const json=(body:unknown,status=200,origin:string|null=null,extra:Record<string,string>={})=>new Response(JSON.stringify(body),{status,headers:{
  'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'vary':'Origin',...(origin?{'access-control-allow-origin':origin}:{}),
  'access-control-allow-headers':'authorization, apikey, content-type',
  'access-control-allow-methods':'POST, OPTIONS',...extra
}});
const MAX_HTML_BYTES=1_500_000;
async function readBounded(response:Response,max:number) {
  const length=response.headers.get('content-length');
  if(length!==null && (!/^\d+$/.test(length)||Number(length)>max))throw new ScrapeError('BAD_RESPONSE','Antwort ist zu groß.');
  const reader=response.body?.getReader();if(!reader)throw new ScrapeError('BAD_RESPONSE','Leere Antwort.');
  const decoder=new TextDecoder();let html='';let received=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;received+=value.byteLength;
    if(received>max)throw new ScrapeError('BAD_RESPONSE','Antwort ist zu groß.');
    html+=decoder.decode(value,{stream:true});
  }}finally{if(received>max)await reader.cancel().catch(()=>{});reader.releaseLock();}
  return html+decoder.decode();
}
Deno.serve(async request=>{
  const origin=corsOrigin(request.headers.get('origin'));
  // Non-browser clients may omit Origin, but browser callers must use allowlisted origins.
  if(request.headers.has('origin')&&!origin)return json({error:'Origin nicht erlaubt.'},403);
  if(request.method==='OPTIONS')return json({},200,origin);
  if(request.method!=='POST')return json({error:'Nur POST erlaubt.'},405,origin);
  const respond=(body:unknown,status=200,extra:Record<string,string>={})=>json(body,status,origin,extra);
  const contentType=request.headers.get('content-type')||'';
  if(!/^application\/json(?:\s*;|\s*$)/i.test(contentType))return respond({error:'JSON erforderlich.'},415);
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>MAX_REQUEST_BYTES))return respond({error:'Anfrage zu groß.'},413);
  const accessToken=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if(!accessToken)return respond({error:'Anmeldung erforderlich.'},401);
  const supabaseUrl=Deno.env.get('SUPABASE_URL');
  const anonKey=Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!anonKey||!validQuotaConfig(supabaseUrl,serviceRoleKey))return respond({error:'Serverkonfiguration unvollständig.'},503);
  try{
    const raw=await readBounded(new Response(request.body),MAX_REQUEST_BYTES);
    const base=normalizeWishlistUrl(parseBodyText(raw));
    const auth=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{authorization:`Bearer ${accessToken}`,apikey:anonKey},signal:AbortSignal.timeout(7000)});
    if(!auth.ok)return respond({error:'Sitzung nicht gültig.'},401);
    const currentUser=await auth.json();
    if(typeof currentUser?.id!=='string'||!/^[0-9a-f-]{36}$/i.test(currentUser.id))return respond({error:'Sitzung nicht gültig.'},401);
    // Only accept HMAC-signed IP from a separately configured trusted ingress.
    // Never trust x-forwarded-for or client-supplied IP headers.
    let ipFingerprint:string;let gatewayNonce:string;
    try {gatewayNonce=gatewayNonceFromHeaders(request.headers);ipFingerprint=await signedIpFingerprint(request.headers,Date.now(),Deno.env.get('GATEWAY_IP_SIGNATURE_SECRET'),Deno.env.get('IP_FINGERPRINT_SECRET'),request.method,new URL(request.url).pathname);}
    catch{return respond({error:'Sicherheitsgateway nicht verfügbar.'},503);}
    // Claim user + IP quotas atomically BEFORE any Amazon request. Fail closed.
    let quotaResponse:Response;
    try{quotaResponse=await fetch(`${supabaseUrl}/rest/v1/rpc/wishlist_amazon_scrape_claim_v11`,{
      method:'POST',headers:{apikey:serviceRoleKey,authorization:`Bearer ${serviceRoleKey}`,'content-type':'application/json'},
      body:JSON.stringify({p_user_id:currentUser.id,p_ip_fingerprint:ipFingerprint,p_nonce:gatewayNonce}),signal:AbortSignal.timeout(5000)
    });}catch{return respond({error:'Abrufbegrenzung derzeit nicht verfügbar.'},503);}
    if(!quotaResponse.ok)return respond({error:'Abrufbegrenzung derzeit nicht verfügbar.'},503);
    let decision;
    try{decision=quotaDecision(await quotaResponse.json());}catch{return respond({error:'Abrufbegrenzung derzeit nicht verfügbar.'},503);}
    if(!decision.allowed)return respond({error:'Abruflimit erreicht. Bitte später erneut versuchen.',code:'RATE_LIMIT',retryAfterSeconds:decision.retryAfter},429,{'retry-after':String(decision.retryAfter)});
    const pages=[];const visited=new Set<number>();let page=1;
    for(let i=0;i<5;i++){
      if(visited.has(page))break;visited.add(page);
      const source=page===1?base:`${base}?page=${page}`;
      const res=await fetch(source,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'accept':'text/html','user-agent':'Mozilla/5.0 (compatible; HelferleinWishlistImporter/1.0)'}});
      if(res.status>=300&&res.status<400)throw new ScrapeError('REDIRECT','Amazon hat die Anfrage umgeleitet; Import abgebrochen.');
      if([403,429,503].includes(res.status))throw new ScrapeError('BLOCKED','Amazon hat den Abruf eingeschränkt.');
      if(!res.ok)throw new ScrapeError('UPSTREAM','Amazon-Liste nicht abrufbar.');
      if(!(res.headers.get('content-type')||'').toLowerCase().includes('text/html'))throw new ScrapeError('BAD_RESPONSE','Unerwartetes Amazon-Antwortformat.');
      const html=await readBounded(res,MAX_HTML_BYTES);
      const parsed=parseWishlistPage(html,100,page,base.split("/").at(-1));pages.push(parsed);
      if(!parsed.nextPage||parsed.nextPage<=page)break;page=parsed.nextPage;
    }
    const products=combineProducts(pages);const partial=pages.length>=5&&pages.at(-1)?.nextPage!=null;
    return respond({products,pagesFetched:pages.length,partial,warning:products.length===0?'Keine Produkte erkannt. Liste eventuell privat oder Layout geändert.':null});
  }catch(error){
    if(error instanceof GuardError)return respond({error:error.message,code:error.code},error.status);
    if(error instanceof ScrapeError)return respond({error:error.message,code:error.code},422);
    return respond({error:'Importvorschau konnte nicht geladen werden.'},502);
  }
});

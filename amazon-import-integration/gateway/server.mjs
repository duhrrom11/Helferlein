import {createServer} from 'node:http';
import {createServer as createTlsServer} from 'node:https';
import {readFileSync} from 'node:fs';
import {canonicalIP} from '../supabase/functions/amazon-wishlist-scrape/ip-guard.mjs';
import {signTrustedGatewayIdentity} from '../supabase/functions/amazon-wishlist-scrape/ip-guard.mjs';

const isLoopback=ip=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);
const respond=(res,status,obj)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(obj));};
export function createLocalAmazonGateway({upstream,secret,port=0,hostname='127.0.0.1',fetchImpl=fetch,maxBytes=8192,production=false,tls,allowedOrigin,requestsPerMinute=30}={}){
 if(typeof secret!=='string'||secret.length<32)throw Error('GATEWAY_IP_SIGNATURE_SECRET benötigt mindestens 32 Zeichen');
 if(!production&&!isLoopback(hostname))throw Error('Gateway darf ausschließlich auf Loopback lauschen');
 if(production&&(!tls?.key||!tls?.cert||typeof allowedOrigin!=='string'||!/^https:\/\/[^/]+$/.test(allowedOrigin)||!Number.isInteger(requestsPerMinute)||requestsPerMinute<1))throw Error('Produktions-Ingress benötigt TLS, feste HTTPS-Origin und gültiges Rate-Limit');
 const quotas=new Map();
 const target=new URL(upstream||'');
 if(!['http:','https:'].includes(target.protocol)||target.username||target.password||target.search||target.hash||!target.pathname.endsWith('/functions/v1/amazon-wishlist-scrape'))throw Error('Ungültiger Edge-Endpunkt');
 if(target.protocol!=='https:'&&!isLoopback(target.hostname))throw Error('Unsicherer Remote-Upstream');
 const server=(production?createTlsServer({key:tls.key,cert:tls.cert},handler):createServer(handler));
 async function handler(req,res){
  if(!production&&!isLoopback(req.socket.remoteAddress)){respond(res,403,{error:'Nur lokale Clients erlaubt.'});return;}
  if(production&&req.url==='/api/amazon-wishlist-preview'&&req.method==='OPTIONS'&&req.headers.origin===allowedOrigin){res.writeHead(204,{'access-control-allow-origin':allowedOrigin,'access-control-allow-methods':'POST','access-control-allow-headers':'authorization, content-type','access-control-max-age':'300','vary':'Origin','cache-control':'no-store'});res.end();return;}
  if(req.url!=='/api/amazon-wishlist-preview'||req.method!=='POST'){respond(res,404,{error:'Route nicht gefunden.'});return;}
  // Never trust forwarded IP headers: the TLS socket is the only client identity.
  if(production){
   if(req.headers.origin!==allowedOrigin){respond(res,403,{error:'Origin nicht zugelassen.'});return;}
   res.setHeader('access-control-allow-origin',allowedOrigin);
   res.setHeader('vary','Origin');
   const ip=canonicalIP(req.socket.remoteAddress);
   const now=Date.now();
   for(const [key,entry] of quotas)if(entry.until<=now)quotas.delete(key);
   const entry=quotas.get(ip);
   if(entry&&entry.count>=requestsPerMinute){respond(res,429,{error:'Anfragelimit erreicht.'});return;}
   if(entry)entry.count++;else quotas.set(ip,{count:1,until:now+60000});
  }else if(req.headers.origin){respond(res,403,{error:'Browser-Origin nicht zugelassen; Same-Origin-Dev-Proxy verwenden.'});return;}
  const authorization=req.headers.authorization;
  if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9._~+/-]+=*$/.test(authorization)){respond(res,401,{error:'Anmeldung erforderlich.'});return;}
  if(!/^application\/json(?:\s*;|\s*$)/i.test(req.headers['content-type']||'')){respond(res,415,{error:'JSON erforderlich.'});return;}
  if(Number(req.headers['content-length'])>maxBytes){respond(res,413,{error:'Anfrage zu groß.'});return;}
  let body='';let length=0;const decoder=new TextDecoder('utf-8',{fatal:true});
  try{for await(const chunk of req){length+=chunk.length;if(length>maxBytes){respond(res,413,{error:'Anfrage zu groß.'});return;}body+=decoder.decode(chunk,{stream:true});}body+=decoder.decode();}
  catch{if(!res.writableEnded)respond(res,400,{error:'Anfrage unvollständig.'});return;}
  let data;try{data=JSON.parse(body);if(!data||typeof data.url!=='string'||Object.keys(data).length!==1)throw Error();}catch{respond(res,400,{error:'Ungültige Anfrage.'});return;}
  try{
   const headers=await signTrustedGatewayIdentity(req.socket.remoteAddress,Date.now(),secret,'POST',target.pathname);
   // Never forward client-supplied gateway headers, x-forwarded-for, cookies or API keys.
   const upstreamResponse=await fetchImpl(target,{method:'POST',redirect:'manual',headers:{...headers,'content-type':'application/json',authorization},body:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
   if(upstreamResponse.status>=300&&upstreamResponse.status<400){respond(res,502,{error:'Upstream-Redirect abgelehnt.'});return;}
   const contentType=upstreamResponse.headers.get('content-type')||'';
   if(!contentType.toLowerCase().includes('application/json')){respond(res,502,{error:'Ungültige Upstream-Antwort.'});return;}
   const chunks=[];let total=0;
   if(upstreamResponse.body){for await(const chunk of upstreamResponse.body){total+=chunk.byteLength;if(total>512000){respond(res,502,{error:'Upstream-Antwort zu groß.'});return;}chunks.push(Buffer.from(chunk));}}
   res.writeHead(upstreamResponse.status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(Buffer.concat(chunks,total));
  }catch{if(!res.writableEnded)respond(res,502,{error:'Gateway-Verbindung fehlgeschlagen.'});}
 }
 return {server,listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,hostname,()=>{server.off('error',reject);resolve(server.address());});}),close:()=>new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()))};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const production=process.env.GATEWAY_MODE==='production';
 const gateway=createLocalAmazonGateway({upstream:process.env.AMAZON_EDGE_URL,secret:process.env.GATEWAY_IP_SIGNATURE_SECRET,port:Number(process.env.GATEWAY_PORT||8787),hostname:production?'0.0.0.0':'127.0.0.1',production,allowedOrigin:process.env.GATEWAY_ALLOWED_ORIGIN,tls:production?{key:readFileSync(process.env.GATEWAY_TLS_KEY_FILE),cert:readFileSync(process.env.GATEWAY_TLS_CERT_FILE)}:undefined});
 gateway.listen().then(a=>console.log(`${production?'TLS-Ingress':'Lokales Gateway'} auf Port ${a.port}`)).catch(e=>{console.error(e.message);process.exitCode=1;});
}

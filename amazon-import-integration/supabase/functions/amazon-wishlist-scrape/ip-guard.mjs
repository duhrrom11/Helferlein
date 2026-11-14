// Signed gateway identity: do NOT trust X-Forwarded-For or client-provided IP headers.
// A separately deployed, trusted ingress must replace (not append) these headers.
export class IpGuardError extends Error { constructor(message='Vertrauenswürdige Gateway-Identität fehlt.') {super(message);} }
const utf8 = new TextEncoder();
const hex = bytes => [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
const key = secret => crypto.subtle.importKey('raw',utf8.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
export const canonicalIP = ip => {
  if(typeof ip !== 'string' || ip.length>45)throw new IpGuardError('Ungültige IP.');
  if(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)){
    if(!ip.split('.').every(n=>Number(n)<=255&&String(Number(n))===n))throw new IpGuardError('Ungültige IPv4.');
    return ip;
  }
  if(!/^[0-9a-f:.]+$/i.test(ip) || !ip.includes(':') || ip.includes('%'))throw new IpGuardError('Ungültige IPv6.');
  try {
    const host=new URL(`http://[${ip}]/`).hostname;
    if(!/^\[[0-9a-f:]+\]$/.test(host))throw new Error('not canonical IPv6');
    const canonical=host.slice(1,-1);
    // IPv4-mapped IPv6 is the same remote host for quota purposes.
    if(canonical.startsWith('::ffff:')){
      const tail=canonical.slice(7).split(':');
      if(tail.length===2&&tail.every(x=>/^[0-9a-f]{1,4}$/.test(x))){
        const bytes=tail.flatMap(x=>[parseInt(x,16)>>8,parseInt(x,16)&255]);
        return bytes.join('.');
      }
    }
    return canonical;
  } catch {throw new IpGuardError('Ungültige IPv6.');}
};
const validIP = ip => {try {canonicalIP(ip);return true;} catch{return false;}};
const noncePattern=/^[0-9a-f]{32}$/;
export function gatewayNonce() {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}
export function gatewayNonceFromHeaders(headers) {
  const nonce=headers.get('x-helferlein-gateway-nonce');
  if(!noncePattern.test(nonce||''))throw new IpGuardError('Ungültige Gateway-Nonce.');
  return nonce;
}
export async function signedIpFingerprint(headers,nowMs,signatureSecret,fingerprintSecret,method='POST',pathname='/functions/v1/amazon-wishlist-scrape') {
  if(typeof signatureSecret!=='string'||signatureSecret.length<32||typeof fingerprintSecret!=='string'||fingerprintSecret.length<32)throw new IpGuardError('Gateway nicht konfiguriert.');
  const ip=headers.get('x-helferlein-gateway-ip');
  const ts=headers.get('x-helferlein-gateway-ts');
  const sig=headers.get('x-helferlein-gateway-signature');
  const nonce=gatewayNonceFromHeaders(headers);
  if(!validIP(ip)||!/^\d{13}$/.test(ts||'')||!Number.isSafeInteger(Number(ts))||Math.abs(nowMs-Number(ts))>30_000||!(/^[a-f0-9]{64}$/i.test(sig||'')))throw new IpGuardError();
  const k=await key(signatureSecret);
  // WebCrypto verify avoids a custom timing-dependent comparison.
  const signature=Uint8Array.from(sig.match(/../g).map(x=>parseInt(x,16)));
  if(!await crypto.subtle.verify('HMAC',k,signature,utf8.encode(`${ts}\n${canonicalIP(ip)}\n${method}\n${pathname}\n${nonce}`)))throw new IpGuardError();
  const fk=await key(fingerprintSecret);
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC',fk,utf8.encode(canonicalIP(ip)))));
}

// Reference gateway signer. Call ONLY after the trusted ingress has established
// the actual remote peer IP and stripped all incoming x-helferlein-gateway-* headers.
export async function signTrustedGatewayIdentity(ip, nowMs, signatureSecret, method='POST', pathname='/functions/v1/amazon-wishlist-scrape') {
  if (!validIP(ip) || !Number.isSafeInteger(nowMs) || typeof signatureSecret !== 'string' || signatureSecret.length < 32)
    throw new IpGuardError('Invalid trusted gateway inputs');
  const ts=String(nowMs);
  const nonce=gatewayNonce();
  const k=await key(signatureSecret);
  const signature=hex(new Uint8Array(await crypto.subtle.sign('HMAC',k,utf8.encode(`${ts}\n${canonicalIP(ip)}\n${method}\n${pathname}\n${nonce}`))));
  return {'x-helferlein-gateway-ip':canonicalIP(ip),'x-helferlein-gateway-ts':ts,'x-helferlein-gateway-nonce':nonce,'x-helferlein-gateway-signature':signature};
}

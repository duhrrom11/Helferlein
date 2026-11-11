/* NON-DEPLOYED: opt-in same-origin HTTP transport for the owner's invitation list.
 * Public Github Pages deliberately never supplies an authenticated session or enables this.
 * Server must independently verify each bearer via Supabase auth.getUser and DB ownership.
 */
(function (root) {
  'use strict';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const VAULT=/^v_[A-Za-z0-9_-]{8,80}$/;
  const ROUTES=Object.freeze({
    '/v1/heirs/invitations/list': ['vaultId'],
    '/v1/heirs/invitations/revoke': ['vaultId','invitationId']
  });
  const MAX_RESPONSE=16384;
  function exact(value, keys) {
    return value && typeof value==='object' && !Array.isArray(value) &&
      Object.keys(value).length===keys.length && keys.every(k=>Object.hasOwn(value,k));
  }
  async function boundedJson(response) {
    const size=response.headers.get('content-length');
    if(size && (!/^\d+$/.test(size) || Number(size)>MAX_RESPONSE)) throw Error('unavailable');
    if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||'')) throw Error('unavailable');
    if(!response.body) throw Error('unavailable');
    const reader=response.body.getReader();
    const chunks=[];let length=0;
    try {
      for (;;) {
        const {done,value}=await reader.read();
        if(done)break;
        length+=value.byteLength;
        if(length>MAX_RESPONSE)throw Error('unavailable');
        chunks.push(value);
      }
      const bytes=new Uint8Array(length);let at=0;
      for(const part of chunks){bytes.set(part,at);at+=part.length;}
      return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    } finally { try { await reader.cancel(); } catch {} }
  }
  function create(options) {
    const location=root.location;
    if(!location || !options || typeof options.getAccessToken!=='function' ||
       !['https:','http:'].includes(location.protocol) ||
       (location.protocol==='http:' && !['localhost','127.0.0.1','[::1]'].includes(location.hostname)) ||
       typeof root.fetch!=='function')throw Error('unavailable');
    // No caller-supplied API host, redirects or cross-origin credentials.
    const origin=location.origin;
    if(!origin || origin==='null')throw Error('unavailable');
    return async function request(path, body) {
      if(!Object.hasOwn(ROUTES,path) || !exact(body,ROUTES[path]) ||
         !VAULT.test(body.vaultId) || (path.endsWith('/revoke')&&!UUID.test(body.invitationId))) {
        throw Error('unavailable');
      }
      const token=await options.getAccessToken();
      if(typeof token!=='string' || token.length<8 || token.length>4096 ||
         !/^[A-Za-z0-9._~-]+$/.test(token))throw Error('unauthenticated');
      if(options.signal?.aborted)throw Error('session_changed');
      const controller=new AbortController();
      const cancel=()=>controller.abort();
      if(options.signal)options.signal.addEventListener('abort',cancel,{once:true});
      if(options.signal?.aborted)controller.abort();
      const timeout=root.setTimeout(()=>controller.abort(),8000);
      try {
        if(controller.signal.aborted)throw Error('session_changed');
        const response=await root.fetch(origin+path,{
          method:'POST',mode:'same-origin',credentials:'omit',cache:'no-store',redirect:'error',
          referrerPolicy:'no-referrer',signal:controller.signal,
          headers:{'authorization':'Bearer '+token,'content-type':'application/json'},
          body:JSON.stringify(body)
        });
        if((response.status===401 || response.status===403) && typeof options.onUnauthorized==='function')
          options.onUnauthorized();
        if(controller.signal.aborted)throw Error('session_changed');
        if(!response.ok || response.redirected || response.url &&
           new URL(response.url).origin!==origin)throw Error('unavailable');
        const data=await boundedJson(response);
        if(!data || data.ok!==true)return Promise.reject(Error('unavailable'));
        // Only expected response types; caller's rendering layer validates each record.
        if(path.endsWith('/revoke')) {
          if(!exact(data,['ok']))throw Error('unavailable');
          return {ok:true};
        }
        if(!exact(data,['ok','invitations','hasMore']) ||
           !Array.isArray(data.invitations) || data.invitations.length>50 ||
           typeof data.hasMore!=='boolean')throw Error('unavailable');
        return {ok:true,invitations:data.invitations,hasMore:data.hasMore};
      } finally {
        root.clearTimeout(timeout);
        if(options.signal)options.signal.removeEventListener('abort',cancel);
      }
    };
  }
  root.HeirOwnerInvitationTransportStaging=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);

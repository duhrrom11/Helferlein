/* NOT ACTIVATED: explicit host-only bridge to the existing Supabase auth client.
 * The public bootstrap MUST remain disabled. No tokens retained or persisted here.
 * Session changes immediately dispose owner data and abort in-flight requests.
 */
(function (root) {
  'use strict';
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const VAULT=/^v_[A-Za-z0-9_-]{8,80}$/;
  function attach(options) {
    if(!options || !options.host || !VAULT.test(options.vaultId) ||
       !options.supabase?.auth || typeof options.supabase.auth.getSession!=='function' ||
       typeof options.supabase.auth.getUser!=='function' ||
       typeof options.supabase.auth.onAuthStateChange!=='function' ||
       !root.HeirOwnerInvitationsStaging?.mount ||
       !root.HeirOwnerInvitationTransportStaging?.create ||
       typeof options.confirm!=='function') throw Error('session_bridge_unconfigured');
    let generation=0, userId=null, disposed=false, mounted=null;
    let requestAbort=new AbortController();
    let expiryTimer=null;
    const disable=()=>{
      generation++;
      if(expiryTimer!==null){root.clearTimeout(expiryTimer);expiryTimer=null;}
      requestAbort.abort();
      requestAbort=new AbortController();
      userId=null;
      if(mounted)mounted.dispose();
      mounted=root.HeirOwnerInvitationsStaging.mount(options.host,{enabled:false});
    };
    const current=async (gen, expectedUser)=>{
      const {data:sessionData,error:sessionError}=await options.supabase.auth.getSession();
      if(disposed || generation!==gen || sessionError)throw Error('session_changed');
      const session=sessionData?.session;
      const token=session?.access_token;
      if(typeof token!=='string' || !Number.isFinite(session.expires_at) ||
         session.expires_at*1000<=Date.now()+5000 ||
         !/^[A-Za-z0-9._~-]{8,4096}$/.test(token))throw Error('session_expired');
      // Local getSession is a token source only; remote getUser is authoritative.
      const {data:userData,error:userError}=await options.supabase.auth.getUser(token);
      const id=userData?.user?.id;
      if(disposed || generation!==gen || userError || !UUID.test(id) ||
         (expectedUser && id.toLowerCase()!==expectedUser))throw Error('identity_changed');
      return {token,id:id.toLowerCase(),expiresAt:session.expires_at*1000};
    };
    async function refresh() {
      if(disposed)return;
      disable();
      const gen=generation;
      try {
        const account=await current(gen,null);
        if(disposed || generation!==gen)return;
        userId=account.id;
        // Close even an idle view before the currently verified access token expires.
        expiryTimer=root.setTimeout(()=>{
          if(!disposed && generation===gen)disable();
        },Math.max(0,Math.min(2147483647,account.expiresAt-Date.now()-5000)));
        const request=root.HeirOwnerInvitationTransportStaging.create({
          signal:requestAbort.signal,
          onUnauthorized:()=>{if(!disposed && generation===gen)disable();},
          getAccessToken:async()=>{
            try { const value=await current(gen,userId);return value.token; }
            catch(error){if(!disposed && generation===gen)disable();throw error;}
          }
        });
        if(mounted)mounted.dispose();
        mounted=root.HeirOwnerInvitationsStaging.mount(options.host,{
          enabled:true,vaultId:options.vaultId,request,confirm:options.confirm
        });
      } catch {
        if(!disposed && generation===gen)disable();
      }
    }
    // No asynchronous Supabase calls inside the callback: invalidation is immediate.
    const {data:subscription}=options.supabase.auth.onAuthStateChange((event)=>{
      if(disposed)return;
      disable();
      if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED' || event==='INITIAL_SESSION') {
        // Schedule outside the auth callback to avoid lock contention with getSession.
        const pendingGeneration=generation;
        root.queueMicrotask(()=>{if(!disposed && generation===pendingGeneration)void refresh();});
      }
    });
    if(!subscription?.subscription || typeof subscription.subscription.unsubscribe!=='function') {
      disable();throw Error('session_subscription_unavailable');
    }
    void refresh();
    return Object.freeze({refresh,dispose(){
      if(disposed)return;
      disposed=true;disable();subscription.subscription.unsubscribe();
    }});
  }
  root.HeirOwnerSessionStaging=Object.freeze({attach});
})(typeof window!=='undefined'?window:globalThis);

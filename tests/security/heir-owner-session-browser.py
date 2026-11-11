"""Isolated Chromium security gate for Supabase auth lifecycle (synthetic sessions only).
No external network, real tokens, or productive heir access.
"""
import json
import tempfile
import threading
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
SCRIPTS=[ROOT/'assets'/name for name in (
    'heir-owner-invitations-staging.js',
    'heir-owner-invitations-transport-staging.js',
    'heir-owner-session-staging.js')]
OWNER='11111111-1111-4111-8111-111111111111'
OTHER='33333333-3333-4333-8333-333333333333'
HEIR='22222222-2222-4222-8222-222222222222'
INV='44444444-4444-4444-8444-444444444444'

class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()

def main():
    with tempfile.TemporaryDirectory(prefix='heir-session-ci-') as temp:
        Path(temp,'index.html').write_text('<!doctype html><meta charset="utf-8"><main id="host"></main>')
        server=ThreadingHTTPServer(('127.0.0.1',0),lambda *a,**kw:Handler(*a,directory=temp,**kw))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            with sync_playwright() as pw:
                browser=pw.chromium.launch(headless=True)
                try:
                    page=browser.new_page(service_workers='block')
                    origin=f'http://127.0.0.1:{server.server_port}'
                    calls=[]
                    config={'unauthorized':False}
                    def api(route):
                        request=route.request
                        token=request.headers.get('authorization','')
                        calls.append({'path':request.url.split(origin)[-1],'authorization':token})
                        if config['unauthorized']:
                            route.fulfill(status=401,content_type='application/json',body='{"ok":false}')
                        else:
                            route.fulfill(status=200,content_type='application/json',body=json.dumps({
                                'ok':True,'hasMore':False,'invitations':[{
                                    'invitationId':INV,'intendedUserId':HEIR,
                                    'status':'pending','expiresAt':'2027-01-01T12:00:00Z'
                                }]}))
                    page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin+'/') else route.abort())
                    page.route(origin+'/v1/heirs/invitations/**',api)
                    page.goto(origin+'/index.html')
                    for script in SCRIPTS:page.add_script_tag(path=str(script))
                    page.evaluate("""([owner,other])=>{
                      window.authState={id:owner,token:'owner_isolated_valid_token',error:false,listeners:[],userCalls:0,expiresAt:Math.floor(Date.now()/1000)+300};
                      window.fakeSupabase={auth:{
                        getSession:async()=>({data:{session:window.authState.token?{
                          access_token:window.authState.token,expires_at:window.authState.expiresAt
                        }:null},error:null}),
                        getUser:async(token)=>{window.authState.userCalls++;
                          return {data:{user:token===window.authState.token&&!window.authState.error
                            ?{id:window.authState.id}:null},error:window.authState.error?'denied':null};
                        },
                        onAuthStateChange:(callback)=>{
                          window.authState.listeners.push(callback);
                          return {data:{subscription:{unsubscribe:()=>{
                            window.authState.listeners=window.authState.listeners.filter(x=>x!==callback);
                          }}}};
                        }
                      }};
                      window.emitAuth=(event)=>{for(const listener of window.authState.listeners)listener(event,null);};
                      window.bridge=window.HeirOwnerSessionStaging.attach({
                        supabase:window.fakeSupabase,vaultId:'v_abcdefgh',
                        host:document.querySelector('#host'),confirm:()=>true
                      });
                    }""",[OWNER,OTHER])
                    page.get_by_text('Ausstehend',exact=True).wait_for()
                    assert len(calls)==1 and calls[0]['authorization']=='Bearer owner_isolated_valid_token'
                    page.evaluate("""()=>{
                      window.authState.token=null;window.authState.id=null;window.emitAuth('SIGNED_OUT');
                    }""")
                    page.get_by_text('Noch nicht freigeschaltet',exact=False).wait_for()
                    assert page.get_by_text(INV).count()==0
                    assert page.get_by_role('button',name='Liste aktualisieren').is_disabled()
                    before=len(calls)
                    page.evaluate("window.bridge.refresh()")
                    page.wait_for_timeout(150)
                    assert len(calls)==before, 'logout must not send HTTP request'
                    page.evaluate("""(other)=>{
                      window.authState.id=other;
                      window.authState.token='other_isolated_valid_token';
                      window.emitAuth('SIGNED_IN');
                    }""",OTHER)
                    page.get_by_text('Ausstehend',exact=True).wait_for()
                    assert calls[-1]['authorization']=='Bearer other_isolated_valid_token'
                    assert calls[-1]['authorization']!=calls[0]['authorization']
                    # A valid session near expiry must clear an idle view proactively.
                    page.evaluate("""()=>{
                      window.authState.expiresAt=Math.floor(Date.now()/1000)+8;
                      window.emitAuth('TOKEN_REFRESHED');
                    }""")
                    page.get_by_text('Ausstehend',exact=True).wait_for()
                    page.get_by_text('Noch nicht freigeschaltet',exact=False).wait_for(timeout=6000)
                    assert page.get_by_text(INV).count()==0
                    page.evaluate("""()=>{
                      window.authState.expiresAt=Math.floor(Date.now()/1000)+300;
                      window.emitAuth('SIGNED_IN');
                    }""")
                    page.get_by_text('Ausstehend',exact=True).wait_for()
                    config['unauthorized']=True
                    page.get_by_role('button',name='Liste aktualisieren').click()
                    page.get_by_text('Noch nicht freigeschaltet',exact=False).wait_for()
                    assert page.get_by_text(INV).count()==0, '401 must clear prior owner metadata'
                    assert page.get_by_role('button',name='Liste aktualisieren').is_disabled()
                    page.evaluate('window.bridge.dispose()')
                    assert page.evaluate('window.authState.listeners.length')==0
                    assert page.evaluate('localStorage.length')==0
                    print(json.dumps({'status':'passed','real_chromium':True,
                        'checks':['verified browser session','logout clears metadata',
                        'account change cannot reuse old token','401 clears metadata',
                        'proactive idle expiry','subscription removed','no bearer persisted']}))
                finally:browser.close()
        finally:
            server.shutdown();server.server_close();thread.join(timeout=5)

if __name__=='__main__':main()

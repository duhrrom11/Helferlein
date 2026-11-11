"""Real isolated Chromium test for opt-in same-origin owner HTTP transport.
No Supabase credentials, production endpoints or external network.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading, tempfile, json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
JS=ROOT/'assets/heir-owner-invitations-staging.js'
TRANSPORT=ROOT/'assets/heir-owner-invitations-transport-staging.js'
ID='44444444-4444-4444-8444-444444444444'
HEIR='22222222-2222-4222-8222-222222222222'
VAULT='v_abcdefgh'

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()

def main():
    with tempfile.TemporaryDirectory(prefix='heir-owner-http-gate-') as work:
        Path(work,'index.html').write_text('<!doctype html><meta charset="utf-8"><main id="host"></main>')
        server=ThreadingHTTPServer(('127.0.0.1',0),lambda *a,**kw:Handler(*a,directory=work,**kw))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        try:
            with sync_playwright() as pw:
                browser=pw.chromium.launch(headless=True)
                try:
                    context=browser.new_context(service_workers='block')
                    origin=f'http://127.0.0.1:{server.server_port}'
                    context.route('**/*',lambda route: route.continue_()
                        if route.request.url.startswith(origin+'/') else route.abort())
                    page=context.new_page()
                    calls=[]
                    state={'value':'pending','token_valid':True,'redirect':False}
                    def api(route):
                        request=route.request
                        calls.append({'url':request.url,'method':request.method,
                            'authorization':request.headers.get('authorization'),
                            'body':request.post_data_json})
                        if state['redirect']:
                            route.fulfill(status=302,headers={'Location':'https://elsewhere.example/blocked'},body='')
                        elif not state['token_valid']:
                            route.fulfill(status=401,content_type='application/json',body='{"ok":false}')
                        elif request.url.endswith('/list'):
                            route.fulfill(status=200,content_type='application/json',body=json.dumps({
                                'ok':True,'hasMore':False,'invitations':[{
                                    'invitationId':ID,'intendedUserId':HEIR,'status':state['value'],
                                    'expiresAt':'2026-11-12T12:00:00Z','secret':'must-not-render'
                                }]}))
                        elif request.url.endswith('/revoke'):
                            assert request.post_data_json=={'vaultId':VAULT,'invitationId':ID}
                            state['value']='revoked'
                            route.fulfill(status=200,content_type='application/json',body='{"ok":true}')
                        else: route.abort()
                    page.route(origin+'/v1/heirs/invitations/**',api)
                    page.goto(origin+'/index.html')
                    page.add_script_tag(path=str(JS))
                    page.add_script_tag(path=str(TRANSPORT))
                    page.evaluate("""(vault)=>{
                      window.ownerToken='isolated_browser_token';
                      window.ownerCalls=0;
                      const request=window.HeirOwnerInvitationTransportStaging.create({
                        getAccessToken:async()=>{window.ownerCalls++;return window.ownerToken;}
                      });
                      window.ownerRequest=request;
                      window.ownerConfirm=false;
                      window.HeirOwnerInvitationsStaging.mount(document.querySelector('#host'),{
                        enabled:true,vaultId:vault,request,
                        confirm:()=>window.ownerConfirm
                      });
                    }""",VAULT)
                    page.get_by_text('Ausstehend',exact=True).wait_for()
                    assert page.get_by_text(HEIR).count()==1
                    assert 'must-not-render' not in page.locator('#host').inner_text()
                    button=page.get_by_role('button',name='Einladung '+ID+' widerrufen')
                    button.click()
                    assert len(calls)==1, 'no revoke before positive confirmation'
                    page.evaluate('window.ownerConfirm=true')
                    button.click()
                    page.get_by_text('Widerrufen',exact=True).wait_for()
                    assert len(calls)==3, calls
                    assert all(x['authorization']=='Bearer isolated_browser_token' for x in calls)
                    assert all(x['method']=='POST' and x['url'].startswith(origin+'/') for x in calls)
                    assert page.evaluate('localStorage.length')==0
                    assert 'isolated_browser_token' not in page.url
                    state['token_valid']=False
                    page.get_by_role('button',name='Liste aktualisieren').click()
                    page.get_by_text('Einladungen konnten nicht geladen werden.',exact=False).wait_for()
                    before=len(calls)
                    invalid=page.evaluate("""async()=>{
                      try {await window.ownerRequest('/v1/heirs/envelopes/fetch',{vaultId:'v_abcdefgh'});return false}
                      catch{return true}
                    }""")
                    assert invalid and len(calls)==before
                    state['redirect']=True
                    state['token_valid']=True
                    invalid_redirect=page.evaluate("""async()=>{
                      try{await window.ownerRequest('/v1/heirs/invitations/list',{vaultId:'v_abcdefgh'});return false}
                      catch{return true}
                    }""")
                    assert invalid_redirect
                    print(json.dumps({'status':'passed','real_chromium':True,
                        'same_origin_authenticated_fetch':True,'confirmed_revoke':True,
                        'denied_unauthorized_and_redirect':True,'checks':5}))
                finally: browser.close()
        finally:
            server.shutdown();server.server_close();thread.join(timeout=5)

if __name__=='__main__': main()

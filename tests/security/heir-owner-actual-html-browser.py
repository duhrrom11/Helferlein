"""Real owner HTML CSP smoke in isolated Chromium; all third-party network blocked."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),lambda *args,**kw:Handler(*args,directory=str(ROOT),**kw))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        origin=f'http://127.0.0.1:{server.server_port}'
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True)
            try:
                page=browser.new_page(service_workers='block')
                page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin+'/') else route.abort())
                page.add_init_script("""(() => {
                  window.alert=()=>{};
                  window.__loginCalls=0;
                  window.firebase={apps:[{}],firestore:()=>({})};
                  window.supabase={createClient:()=>({auth:{
                    async signInWithPassword(){window.__loginCalls++;return {error:null};},
                    async signUp(){return {error:null};},
                    async signOut(){return {error:null};},
                    async getUser(){return {data:{user:null},error:null};}
                  }})};
                })()""")
                page.goto(origin+'/tools/digitaler-nachlass/index.html',wait_until='domcontentloaded',timeout=20000)
                assert page.locator('script:not([src])').count()==0
                assert page.locator('[onclick],[onchange],[onsubmit],[onload]').count()==0
                csp=page.locator('meta[http-equiv="Content-Security-Policy"]').get_attribute('content')
                assert "script-src 'self'" in csp and "'unsafe-inline'" not in csp.split('style-src')[0]
                assert "object-src 'none'" in csp
                assert page.locator('script[src="../../assets/heir-owner-legacy.js"]').count()==1
                page.evaluate("""() => {
                  document.getElementById('auth-email').value='test@example.invalid';
                  document.getElementById('auth-password').value='synthetic-only';
                  document.querySelector('[data-heir-auth-action="login"]').click();
                }""")
                page.wait_for_function('()=>window.__loginCalls===1',timeout=5000)
                page.evaluate("""() => {
                  const script=document.createElement('script');
                  script.textContent='window.__cspInlineRan=true';
                  document.body.append(script);
                }""")
                assert page.evaluate('window.__cspInlineRan===undefined'), 'inline script must be blocked by real CSP'
                assert page.locator('script[src="../../assets/heir-owner-legacy.js"]').count()==1
                print('{"status":"passed","real_chromium":true,"owner_html":true,"inline_script_blocked":true,"login_listener":true}')
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__=='__main__':
    main()

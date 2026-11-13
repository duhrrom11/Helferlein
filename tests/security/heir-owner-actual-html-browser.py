"""Actual current owner HTML and real CSP; no production network or data writes."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), lambda *args, **kw: Handler(*args, directory=str(ROOT), **kw))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        origin = f'http://127.0.0.1:{server.server_port}'
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            try:
                page = browser.new_page(service_workers='block')
                signins = []
                def route_request(route):
                    url = route.request.url
                    if url.startswith(origin + '/'):
                        route.continue_()
                    elif url.startswith('https://avapuibsidubuzxjtyld.supabase.co/auth/v1/token'):
                        signins.append(True)
                        route.fulfill(status=400, content_type='application/json', body='{"error":"invalid_grant","error_description":"Synthetic refusal only"}')
                    else:
                        route.abort()
                page.route('**/*', route_request)
                page.goto(origin + '/tools/digitaler-nachlass/index.html', wait_until='domcontentloaded', timeout=20000)
                assert page.locator('script:not([src])').count() == 0
                assert page.locator('[onclick],[onchange],[onsubmit],[onload]').count() == 0
                csp = page.locator('meta[http-equiv="Content-Security-Policy"]').get_attribute('content')
                for directive in ["script-src 'self'", "script-src-attr 'none'", "object-src 'none'", "form-action 'none'", "base-uri 'none'"]:
                    assert directive in csp, directive
                assert "'unsafe-inline'" not in csp and "'unsafe-eval'" not in csp
                assert "connect-src https://avapuibsidubuzxjtyld.supabase.co" in csp
                assert page.locator('script[src^="https:"]').count() == 0
                assert page.locator('script[src="../../assets/vendor/supabase-2.57.0.js"]').count() == 1
                assert page.locator('script[src="../../assets/estate-owner.js"]').count() == 1
                assert page.locator('script[src="../../assets/heir-owner-legacy.js"]').count() == 0
                assert page.locator('#login-panel').is_visible()
                assert page.locator('#owner-app').is_hidden()
                page.locator('#email').fill('synthetic@example.invalid')
                page.locator('#password').fill('synthetic-password-only')
                page.locator('#login-form button[type=submit]').click()
                page.wait_for_function("() => document.getElementById('message').textContent.includes('Konto-Passwort')")
                assert len(signins) == 1, 'actual login listener must call the isolated auth adapter once'
                assert page.locator('#owner-app').is_hidden()
                assert page.evaluate("localStorage.getItem('digital_estate_vault')") is None
                page.evaluate("""() => {
                    const script = document.createElement('script');
                    script.textContent = 'window.__cspInlineRan = true';
                    document.body.append(script);
                    const button = document.createElement('button');
                    button.setAttribute('onclick', 'window.__cspAttributeRan = true');
                    document.body.append(button); button.click(); button.remove();
                }""")
                assert page.evaluate('window.__cspInlineRan === undefined')
                assert page.evaluate('window.__cspAttributeRan === undefined')
                print('{"status":"passed","real_chromium":true,"owner_html":true,"inline_script_blocked":true,"inline_event_blocked":true,"actual_login_listener":true,"rejected_auth_creates_no_vault":true}')
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()

if __name__ == '__main__':
    main()

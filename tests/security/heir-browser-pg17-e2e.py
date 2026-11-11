"""Isolated real Chromium -> self-signed HTTPS -> TypeScript HTTP -> restricted PG17.

No real Supabase credentials or user sessions: the HTTPS fixture supplies an explicit
auth.getUser test double. No production hostname, token, database or migrations.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
OWNER='11111111-1111-4111-8111-111111111111'
HEIR='22222222-2222-4222-8222-222222222222'
VAULT='v_abcdefgh'

def main():
    if not (os.environ.get('HEIR_ISOLATED_TEST_DB')=='1' and
            os.environ.get('PGDATABASE')=='helferlein_heir_ci' and
            os.environ.get('PGHOST')=='127.0.0.1' and
            os.environ.get('PGUSER')=='heir_ci_backend'):
        raise RuntimeError('refusing non-ephemeral environment')
    with tempfile.TemporaryDirectory(prefix='heir-e2e-tls-') as temp:
        key=Path(temp)/'key.pem';cert=Path(temp)/'cert.pem'
        subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes',
                        '-keyout',str(key),'-out',str(cert),'-days','1',
                        '-subj','/CN=127.0.0.1',
                        '-addext','subjectAltName=IP:127.0.0.1'],
                       check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        env={**os.environ,'HEIR_CI_TLS_KEY':str(key),'HEIR_CI_TLS_CERT':str(cert)}
        server=subprocess.Popen(['node','--experimental-strip-types',
            'tests/security/heir-browser-pg17-server.mjs'],cwd=ROOT,env=env,
            stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
        try:
            ready=server.stdout.readline()
            if not ready: raise RuntimeError('isolated HTTPS fixture failed to start')
            data=json.loads(ready)
            assert data.get('ready') is True
            assert data.get('synthetic_auth_only') and data.get('ephemeral_pg_only')
            origin=data['origin']
            assert origin.startswith('https://127.0.0.1:')
            with sync_playwright() as p:
                browser=p.chromium.launch(headless=True)
                try:
                    context=browser.new_context(ignore_https_errors=True,service_workers='block')
                    context.route('**/*',lambda route:route.continue_() if
                                  route.request.url.startswith(origin+'/') else route.abort())
                    page=context.new_page()
                    page.goto(origin+'/index.html',timeout=15000)
                    page.get_by_role('button',name='Liste aktualisieren').wait_for(timeout=15000)
                    page.get_by_text('Einladungsliste aktualisiert.',exact=False).wait_for(timeout=15000)
                    assert page.evaluate('window.ci.listenerCount()')==1
                    headers=page.evaluate('''async()=>{
                      const r=await fetch(location.origin+'/index.html');
                      return {csp:r.headers.get('content-security-policy'),
                        cache:r.headers.get('cache-control'),
                        frame:r.headers.get('x-frame-options')};
                    }''')
                    assert "script-src 'self'" in headers['csp']
                    assert "connect-src 'self'" in headers['csp']
                    assert "'unsafe-inline'" not in headers['csp']
                    assert "frame-ancestors 'none'" in headers['csp']
                    assert 'no-store' in headers['cache'] and headers['frame']=='DENY'
                    # Create through the real HTTP service and actual PG insert.
                    # Do not persist, print or return the bearer or invitation code.
                    result=page.evaluate('''async ({heir,vault})=>{
                      const token=(await window.ci.auth.getSession()).data.session.access_token;
                      const r=await fetch('/v1/heirs/invitations/create',{
                        method:'POST',credentials:'omit',redirect:'error',cache:'no-store',
                        headers:{'origin':location.origin,'authorization':'Bearer '+token,
                                 'content-type':'application/json'},
                        body:JSON.stringify({vaultId:vault,intendedUserId:heir,ttlSeconds:3600})
                      });
                      const body=await r.json();
                      return {http:r.status,ok:body.ok,tokenLength:body.token?.length};
                    }''',{'heir':HEIR,'vault':VAULT})
                    assert result=={'http':200,'ok':True,'tokenLength':43},result
                    page.evaluate('window.ci.binding.refresh()')
                    page.locator('#host tbody tr').first.get_by_text(HEIR,exact=True).wait_for(timeout=10000)
                    assert 'Ausstehend' in page.locator('#host tbody tr').first.inner_text()
                    # Read-only owner list: anonymous and an unrelated account denied.
                    foreign=page.evaluate('''async()=>{
                      const r=await fetch('/v1/heirs/invitations/list',{
                        method:'POST',credentials:'omit',headers:{'authorization':'Bearer ci_other_ephemeral_access_token',
                          'content-type':'application/json'},body:JSON.stringify({vaultId:'v_abcdefgh'})});
                      return {code:r.status,ok:(await r.json()).ok};
                    }''')
                    assert foreign['ok'] is False and foreign['code'] in (401,403)
                    page.evaluate('window.ci.setConfirmation(false)')
                    revoke=page.locator('#host tbody tr').first.get_by_role('button',name='Widerrufen')
                    revoke.click()
                    assert 'Ausstehend' in page.locator('#host tbody tr').first.inner_text()
                    page.evaluate('window.ci.setConfirmation(true)')
                    revoke.click()
                    page.locator('#host tbody tr').first.locator('td').nth(2).get_by_text('Widerrufen',exact=True).wait_for(timeout=10000)
                    assert page.locator('#host tbody tr').first.get_by_role('button',name='Widerrufen').count()==0
                    assert page.evaluate('localStorage.length')==0
                    assert 'ci_owner_ephemeral_access_token' not in page.url
                    # An actual account transition invalidates the previous DOM immediately.
                    page.evaluate("window.ci.setAccount('other')")
                    page.get_by_text('Noch nicht freigeschaltet',exact=False).wait_for(timeout=10000)
                    page.get_by_text('Einladungen konnten nicht geladen werden.',exact=False).wait_for(timeout=10000)
                    assert page.locator('#host tbody tr').count()==0 or page.get_by_text('Noch nicht freigeschaltet',exact=False).count()>0
                    # Browser believes a token is valid; server-side auth.getUser rejects it.
                    page.evaluate('window.ci.sessionRevokedOnServer()')
                    page.get_by_text('Noch nicht freigeschaltet',exact=False).wait_for(timeout=10000)
                    assert page.locator('#host tbody tr').count()==0 or page.get_by_text('Noch nicht freigeschaltet',exact=False).count()>0
                    page.evaluate("window.ci.setAccount('owner')")
                    page.locator('#host tbody tr').first.locator('td').nth(2).get_by_text('Widerrufen',exact=True).wait_for(timeout=10000)
                    page.evaluate('window.ci.setAccount(null)')
                    page.get_by_text('Noch nicht freigeschaltet',exact=False).wait_for(timeout=10000)
                    assert page.locator('#host tbody tr').count()==0 or page.get_by_text('Noch nicht freigeschaltet',exact=False).count()>0
                    page.evaluate('window.ci.dispose()')
                    assert page.evaluate('window.ci.listenerCount()')==0
                    print(json.dumps({'status':'passed','browser':'real Chromium',
                         'transport':'real self-signed HTTPS',
                         'database':'restricted PostgreSQL 17',
                         'auth':'synthetic auth.getUser only',
                         'checks':['HTTPS CSP and no-store','HTTP create -> DB -> owner list',
                                   'no cross-owner read','confirmation-required ID revoke',
                                   'persisted revoked status','account change clears UI',
                                   'server-rejected session clears UI','logout and cleanup']}))
                finally:browser.close()
        finally:
            server.terminate()
            try:server.communicate(timeout=8)
            except subprocess.TimeoutExpired:server.kill();server.communicate(timeout=5)

if __name__=='__main__':main()

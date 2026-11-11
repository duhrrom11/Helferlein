#!/usr/bin/env python3
"""Real IndexedDB security gate. No production services or external network.

Usage: python tests/security/heir-indexeddb-real-browser.py
Requires tsc 5.8+, Python Playwright and a Chromium allowed to visit localhost.
FAIL (exit nonzero) if browser navigation or IndexedDB is unavailable.
"""
from __future__ import annotations

import functools
import http.server
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'supabase/functions/_shared'
HEIR = '22222222-2222-4222-8222-222222222222'
OTHER = '33333333-3333-4333-8333-333333333333'
KEY = '55555555-5555-4555-8555-555555555555'
OWNER = '11111111-1111-4111-8111-111111111111'
VAULT = 'v_abcdefgh'

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'")
        super().end_headers()


def main():
    with tempfile.TemporaryDirectory(prefix='helferlein-idb-gate-') as tmp:
        folder = Path(tmp) / 'served'
        folder.mkdir()
        source = [str(SRC / name) for name in (
            'heir-device-keys-staging.ts', 'heir-key-proof-staging.ts',
            'heir-hpke-envelope.ts', 'heir-staging-backend.ts')]
        subprocess.run(['tsc', '--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'ES2022',
                        '--moduleResolution', 'bundler', '--rewriteRelativeImportExtensions',
                        '--lib', 'es2022,dom', '--outDir', str(folder), *source],
                       check=True, cwd=ROOT)
        (folder / 'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Isolated IndexedDB Gate</title>')
        httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(folder)))
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            with sync_playwright() as pw:
                # Prefer the Playwright-managed binary installed on the CI runner.
                # Fallback to system Chromium for local developer environments.
                executable = pw.chromium.executable_path
                if not Path(executable).is_file():
                    executable = shutil.which('chromium') or shutil.which('chromium-browser')
                if not executable:
                    raise RuntimeError('No real Chromium executable found')
                context = pw.chromium.launch_persistent_context(str(Path(tmp) / 'profile'), executable_path=executable,
                                                                headless=True, args=['--no-sandbox', '--disable-background-networking',
                                                                    '--disable-default-apps', '--disable-sync',
                                                                    '--disable-component-update'], service_workers='block')
                try:
                    url = f'http://127.0.0.1:{httpd.server_port}/index.html'
                    context.route('**/*', lambda route: route.continue_()
                        if route.request.url.startswith(f'http://127.0.0.1:{httpd.server_port}/') else route.abort())
                    page = context.new_page()
                    page.goto(url, timeout=9000)
                    assert page.evaluate('isSecureContext && !!indexedDB && !!crypto.subtle')
                    one = page.evaluate('''async ({heir,key,other}) => {
                        const {createIndexedDbHeirKeyStore} = await import('/heir-device-keys-staging.js');
                        const store = createIndexedDbHeirKeyStore(indexedDB);
                        const pair = await crypto.subtle.generateKey({name:'X25519'},false,['deriveBits']);
                        const publicKeyHex = Array.from(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)),
                            x=>x.toString(16).padStart(2,'0')).join('');
                        const record={userId:heir,keyId:key,publicKeyHex,privateKey:pair.privateKey,status:'pending'};
                        await store.save(record);
                        const pending=await store.load(heir,key);
                        if(!pending||pending.status!=='pending'||pending.privateKey.extractable)throw Error('persistence failure');
                        let denied=false;
                        try{await crypto.subtle.exportKey('pkcs8',pending.privateKey)}catch{denied=true}
                        if(!denied||await store.load(other,key))throw Error('key export/cross-account exposure');
                        await store.save({...record,status:'verified'});
                        let downgraded=false;
                        try{await store.save(record)}catch{downgraded=true}
                        if(!downgraded)throw Error('verified key downgraded');
                        return {publicKeyHex,cryptoKeyPersisted:true,exportDenied:true,downgradeDenied:true};
                    }''', {'heir':HEIR,'key':KEY,'other':OTHER})
                    second = context.new_page()
                    second.goto(url, timeout=9000)
                    two = second.evaluate('''async ({heir,key,owner,vault,other})=>{
                        const {createIndexedDbHeirKeyStore,openHeirEnvelopeOnDevice}=await import('/heir-device-keys-staging.js');
                        const {sealHeirDek}=await import('/heir-hpke-envelope.js');
                        const store=createIndexedDbHeirKeyStore(indexedDB);
                        const saved=await store.load(heir,key);
                        if(!saved||saved.status!=='verified'||saved.privateKey.extractable)throw Error('key lost across tabs');
                        const dek=crypto.getRandomValues(new Uint8Array(32));
                        const context={ownerUserId:owner,heirUserId:heir,vaultId:vault,keyId:key,assignmentVersion:1};
                        const sealed=await sealHeirDek(dek,saved.publicKeyHex,context);
                        const opened=await openHeirEnvelopeOnDevice(heir,key,store,sealed,context);
                        if(opened.some((v,i)=>v!==dek[i]))throw Error('HPKE mismatch');
                        let foreignDenied=false;
                        try{await openHeirEnvelopeOnDevice(other,key,store,sealed,context)}catch{foreignDenied=true}
                        if(!foreignDenied)throw Error('foreign identity accepted');
                        return {secondTabPersistence:true,roundTrip:true,foreignDenied:true};
                    }''', {'heir':HEIR,'key':KEY,'owner':OWNER,'vault':VAULT,'other':OTHER})
                    print(json.dumps({'status':'passed','real_chromium':True,'real_indexeddb':True,'checks':2,'first':one,'second':two},indent=2))
                finally:
                    context.close()
        finally:
            httpd.shutdown()
            thread.join(timeout=5)

if __name__=='__main__':
    main()

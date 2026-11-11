"""Only isolated Chromium; no production host, authentication or network calls."""
from pathlib import Path
from playwright.sync_api import sync_playwright

JS = Path(__file__).resolve().parents[2] / "assets/heir-owner-invitations-staging.js"
ID = "44444444-4444-4444-8444-444444444444"
HEIR = "22222222-2222-4222-8222-222222222222"
VAULT = "v_abcdefgh"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_content('<div id="host"></div>')
    page.add_script_tag(path=str(JS))
    page.evaluate("""() => {
      window.calls=[];
      const record={invitationId:'44444444-4444-4444-8444-444444444444',
        intendedUserId:'22222222-2222-4222-8222-222222222222',status:'pending',
        expiresAt:'2026-11-12T12:00:00Z',token_hash:'must-not-appear'};
      window.request=async (path,body) => {
        window.calls.push({path,body});
        if(path.endsWith('/list')) return {ok:true,invitations:[record],hasMore:false};
        record.status='revoked'; return {ok:true};
      };
      window.HeirOwnerInvitationsStaging.mount(document.querySelector('#host'),{
        enabled:true,vaultId:'v_abcdefgh',request:window.request,confirm:()=>true});
    }""")
    page.get_by_text(ID).wait_for()
    assert page.get_by_text(HEIR).count() == 1
    assert page.get_by_text("Ausstehend").count() == 1
    assert "must-not-appear" not in page.locator("#host").inner_text()
    page.get_by_role("button",name="Einladung "+ID+" widerrufen").click()
    page.get_by_text("Widerrufen",exact=True).wait_for()
    assert page.get_by_role("button",name="Einladung "+ID+" widerrufen").count() == 0
    calls=page.evaluate("window.calls")
    assert len(calls)==3, calls
    assert calls[1]=={"path":"/v1/heirs/invitations/revoke","body":{"vaultId":VAULT,"invitationId":ID}}
    page.evaluate("""() => {
      window.HeirOwnerInvitationsStaging.mount(document.querySelector('#host'),{enabled:false});
    }""")
    assert "Noch nicht freigeschaltet" in page.locator("#host").inner_text()
    assert page.get_by_role("button",name="Liste aktualisieren").is_disabled()
    browser.close()
print("Chromium isolated owner list, metadata filtering, revoke, disabled default: passed")

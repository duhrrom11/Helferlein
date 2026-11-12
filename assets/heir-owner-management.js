/* LOCAL ONLY. Owner UI integration; no service-role key or master vault key in browser.
 * Place at assets/heir-owner-management.js and load with defer after existing scripts.
 * Requires server endpoint supabase/functions/heir-invitations/index.ts.
 * A separate server-side readiness approval is mandatory before enabling.
 */
(() => {
  'use strict';
  const URL = 'https://avapuibsidubuzxjtyld.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC';
  const ENDPOINT = `${URL}/functions/v1/heir-invitations`;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Deliberately false: enable only in a reviewed local source change after backend approval.
  const BACKEND_APPROVED = false;
  const el = (id) => document.getElementById(id);
  const status = (message) => { el('heirInvitationStatus').textContent = message; };
  const issueButton = el('heirIssueButton');
  const revokeButton = el('heirRevokeButton');
  if (!issueButton || !revokeButton) return;
  const tokenArea = el('heirIssuedTokenArea');
  const tokenInput = el('heirIssuedToken');
  const clearToken = () => { tokenInput.value = ''; tokenArea.hidden = true; };
  el('heirClearToken').addEventListener('click', clearToken);
  window.addEventListener('pagehide', clearToken);
  // The legacy Supabase client is declared in a classic script at the end of
  // <body>. Resolve it when needed, not while this deferred script initializes.
  function existingAuthClient() {
    try { return typeof supabaseClient !== 'undefined' ? supabaseClient : null; }
    catch { return null; }
  }
  async function sessionToken() {
    const authClient = existingAuthClient();
    if (!authClient) throw new Error('Supabase ist nicht verfügbar.');
    const { data, error } = await authClient.auth.getSession();
    if (error || !data?.session?.access_token) throw new Error('Bitte zuerst im Cloud-Konto anmelden.');
    return data.session.access_token;
  }
  async function invoke(payload) {
    if (!BACKEND_APPROVED) throw new Error('Einladungsbackend ist noch nicht freigegeben.');
    const bearer = await sessionToken();
    const response = await fetch(ENDPOINT, {
      method: 'POST', mode: 'cors', cache: 'no-store', credentials: 'omit',
      headers: { Authorization: `Bearer ${bearer}`, apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let body = null;
    try { body = await response.json(); } catch { /* generic failure */ }
    if (!response.ok || !body || typeof body !== 'object') {
      if (response.status === 401) throw new Error('Anmeldung abgelaufen. Bitte erneut anmelden.');
      if (response.status === 503) throw new Error('Einladungsbackend noch nicht verfügbar.');
      throw new Error('Aktion nicht möglich. Bitte Berechtigungen und Eingaben prüfen.');
    }
    return body;
  }
  issueButton.disabled = !BACKEND_APPROVED;
  revokeButton.disabled = !BACKEND_APPROVED;
  el('heirIssueForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    clearToken();
    const recipientUserId = el('heirRecipientUserId').value.trim();
    if (!UUID.test(recipientUserId)) { status('Bitte eine gültige Erben-Benutzer-ID eingeben.'); return; }
    issueButton.disabled = true;
    try {
      const data = await invoke({ action: 'issue', recipientUserId });
      if (!UUID.test(data.invitationId) || !/^[a-f0-9]{64}$/.test(data.token)) throw new Error('Ungültige Serverantwort.');
      el('heirInvitationId').value = data.invitationId;
      tokenInput.value = data.token;
      tokenArea.hidden = false;
      status(`Einladung erstellt. ID für Widerruf eingetragen. Ablauf: ${new Date(data.expiresAt).toLocaleString('de-DE')}.`);
    } catch (error) { status(error instanceof Error ? error.message : 'Aktion fehlgeschlagen.'); }
    finally { issueButton.disabled = !BACKEND_APPROVED; }
  });
  el('heirRevokeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    clearToken();
    const invitationId = el('heirInvitationId').value.trim();
    if (!UUID.test(invitationId)) { status('Bitte eine gültige Einladungs-ID eingeben.'); return; }
    if (!window.confirm('Diese Einladung und eine bereits angenommene Zuordnung widerrufen?')) return;
    revokeButton.disabled = true;
    try {
      const data = await invoke({ action: 'revoke', invitationId });
      if (data.status !== 'revoked') throw new Error('Widerruf nicht bestätigt.');
      status('Einladung widerrufen. Es werden keine Tresordaten freigegeben.');
    } catch (error) { status(error instanceof Error ? error.message : 'Widerruf fehlgeschlagen.'); }
    finally { revokeButton.disabled = !BACKEND_APPROVED; }
  });
})();
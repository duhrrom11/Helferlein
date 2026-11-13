/* Owner UI integration; no service-role key or master vault key in browser.
 * Place at assets/heir-owner-management.js and load with defer after existing scripts.
 * Requires server endpoint supabase/functions/heir-invitations/index.ts.
 * Backend requires authenticated owner and service-role-only database RPCs.
 */
(() => {
  'use strict';
  const URL = 'https://avapuibsidubuzxjtyld.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC';
  const ENDPOINT = `${URL}/functions/v1/heir-invitations`;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Deliberately false: enable only in a reviewed local source change after backend approval.
  const BACKEND_APPROVED = true;
  const el = (id) => document.getElementById(id);
  const status = (message) => { el('heirInvitationStatus').textContent = message; };
  const issueButton = el('heirIssueButton');
  const revokeButton = el('heirRevokeButton');
  if (!issueButton || !revokeButton) return;
  const myIdField = el('heirMyUserId');
  const myIdCopy = el('heirCopyMyUserId');
  const myIdStatus = el('heirMyUserIdStatus');
  const clearMyId = () => {
    if (myIdField) myIdField.value = '';
    if (myIdCopy) myIdCopy.disabled = true;
  };
  if (el('heirLoadMyUserId')) el('heirLoadMyUserId').addEventListener('click', async () => {
    clearMyId();
    try {
      const client = existingAuthClient();
      if (!client) throw new Error('Anmeldung gerade nicht möglich.');
      const {data,error} = await client.auth.getUser();
      if (error || !data?.user || !UUID.test(data.user.id))
        throw new Error('Bitte melde dich zuerst an.');
      myIdField.value = data.user.id;
      myIdCopy.disabled = false;
      myIdStatus.textContent = 'Deine Kennung ist bereit. Gib sie nur an die Person weiter, die dich einladen soll.';
    } catch (error) {
      myIdStatus.textContent = error instanceof Error ? error.message : 'Kennung nicht verfügbar.';
    }
  });
  if (myIdCopy) myIdCopy.addEventListener('click', async () => {
    if (!UUID.test(myIdField.value)) return;
    try {
      await navigator.clipboard.writeText(myIdField.value);
      myIdStatus.textContent = 'Kennung kopiert.';
    } catch { myIdStatus.textContent = 'Kopieren nicht möglich. Bitte die Kennung markieren und kopieren.'; }
  });
  window.addEventListener('pagehide', clearMyId);
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
    if (error || !data?.session?.access_token) throw new Error('Bitte melde dich zuerst an.');
    return data.session.access_token;
  }
  async function invoke(payload) {
    if (!BACKEND_APPROVED) throw new Error('Einladungen sind derzeit nicht verfügbar.');
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
      if (response.status === 503) throw new Error('Einladungen sind derzeit nicht verfügbar.');
      throw new Error('Das hat nicht geklappt. Bitte prüfe deine Eingaben.');
    }
    return body;
  }
  issueButton.disabled = !BACKEND_APPROVED;
  revokeButton.disabled = !BACKEND_APPROVED;
  el('heirIssueForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    clearToken();
    const recipientUserId = el('heirRecipientUserId').value.trim();
    if (!UUID.test(recipientUserId)) { status('Bitte gib die Kennung der Person ein.'); return; }
    issueButton.disabled = true;
    try {
      const data = await invoke({ action: 'issue', recipientUserId });
      if (!UUID.test(data.invitationId) || !/^[a-f0-9]{64}$/.test(data.token)) throw new Error('Das hat leider nicht geklappt. Bitte versuche es erneut.');
      el('heirInvitationId').value = data.invitationId;
      tokenInput.value = data.token;
      tokenArea.hidden = false;
      status(`Einladung erstellt. Sie ist gültig bis ${new Date(data.expiresAt).toLocaleString('de-DE')}.`);
    } catch (error) { status(error instanceof Error ? error.message : 'Aktion fehlgeschlagen.'); }
    finally { issueButton.disabled = !BACKEND_APPROVED; }
  });
  const listButton = el('heirListButton');
  const listHost = el('heirLiveList');
  async function loadInvitations() {
    if (!BACKEND_APPROVED || !listButton || !listHost) return;
    listButton.disabled = true;
    listHost.textContent = 'Einladungen werden geladen …';
    try {
      const result = await invoke({action:'list'});
      if (!Array.isArray(result.invitations) || result.invitations.length > 50)
        throw new Error('Das hat leider nicht geklappt. Bitte versuche es erneut.');
      const list = document.createElement('ul');
      const labels = {pending:'Ausstehend',accepted:'Angenommen',expired:'Abgelaufen',revoked:'Widerrufen'};
      for (const item of result.invitations) {
        if (!UUID.test(item.invitationId) || !UUID.test(item.recipientUserId) ||
            !Object.hasOwn(labels,item.status) || !Number.isFinite(Date.parse(item.expiresAt)))
          throw new Error('Das hat leider nicht geklappt. Bitte versuche es erneut.');
        const entry = document.createElement('li');
        entry.className = 'py-2 border-b border-slate-700';
        entry.textContent = labels[item.status] + ' · Empfänger ' + item.recipientUserId +
          ' · bis ' + new Date(item.expiresAt).toLocaleString('de-DE') + ' · ID ' + item.invitationId;
        if (item.status === 'pending' || item.status === 'accepted') {
          const choose = document.createElement('button');
          choose.type = 'button';
          choose.className = 'ml-2 underline';
          choose.textContent = 'Für Widerruf auswählen';
          choose.addEventListener('click',() => { el('heirInvitationId').value = item.invitationId; });
          entry.append(choose);
        }
        list.append(entry);
      }
      listHost.replaceChildren();
      if (result.invitations.length) listHost.append(list);
      else listHost.textContent = 'Noch keine Einladungen vorhanden.';
    } catch { listHost.textContent = 'Einladungen konnten nicht geladen werden.'; }
    finally { listButton.disabled = !BACKEND_APPROVED; }
  }
  if (listButton) {
    listButton.disabled = !BACKEND_APPROVED;
    listButton.addEventListener('click',loadInvitations);
  }
  el('heirRevokeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    clearToken();
    const invitationId = el('heirInvitationId').value.trim();
    if (!UUID.test(invitationId)) { status('Bitte wähle eine Einladung aus.'); return; }
    if (!window.confirm('Möchtest du diese Einladung wirklich zurücknehmen?')) return;
    revokeButton.disabled = true;
    try {
      const data = await invoke({ action: 'revoke', invitationId });
      if (data.status !== 'revoked') throw new Error('Einladung konnte nicht zurückgenommen werden.');
      status('Einladung zurückgenommen.');
      void loadInvitations();
    } catch (error) { status(error instanceof Error ? error.message : 'Das hat leider nicht geklappt.'); }
    finally { revokeButton.disabled = !BACKEND_APPROVED; }
  });
})();
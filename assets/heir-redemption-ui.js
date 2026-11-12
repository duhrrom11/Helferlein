/* Erbeneinladung annehmen. Keine Schlüssel oder Tokens werden gespeichert. */
(() => {
  'use strict';
  const endpoint = 'https://avapuibsidubuzxjtyld.supabase.co/functions/v1/heir-redemption';
  const publishableKey = 'sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC';
  const form = document.getElementById('heirAcceptForm');
  if (!form) return;
  const tokenField = document.getElementById('heirAcceptToken');
  const button = document.getElementById('heirAcceptButton');
  const message = document.getElementById('heirAcceptStatus');
  const status = (value) => { message.textContent = value; };
  const clear = () => { tokenField.value = ''; };
  window.addEventListener('pagehide', clear);
  function authClient() {
    try { return typeof supabaseClient !== 'undefined' ? supabaseClient : null; }
    catch { return null; }
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = tokenField.value.trim();
    if (!/^[a-f0-9]{64}$/.test(token)) {
      status('Bitte den vollständigen 64-stelligen Einmalcode eingeben.');
      return;
    }
    const client = authClient();
    if (!client) { status('Cloud-Anmeldung ist nicht verfügbar.'); return; }
    button.disabled = true;
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data?.session?.access_token) {
        status('Bitte zuerst mit dem eigenen Erbenkonto anmelden.');
        return;
      }
      const response = await fetch(endpoint, {
        method: 'POST', mode: 'cors', cache: 'no-store', credentials: 'omit',
        headers: {
          Authorization: 'Bearer ' + data.session.access_token,
          apikey: publishableKey, 'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result?.status !== 'accepted') throw new Error('unexpected_response');
        status('Einladung angenommen. Dadurch werden noch keine Tresordaten freigegeben.');
      } else if (response.status === 429) status('Zu viele Versuche. Bitte später erneut versuchen.');
      else if (response.status === 503) status('Die Annahme ist serverseitig noch nicht aktiviert.');
      else if (response.status === 401 || response.status === 403) status('Anmeldung ungültig oder abgelaufen.');
      else status('Einladung nicht gefunden, abgelaufen oder bereits verwendet.');
    } catch {
      status('Serververbindung nicht verfügbar. Bitte später erneut versuchen.');
    } finally {
      clear();
      button.disabled = false;
    }
  });
})();

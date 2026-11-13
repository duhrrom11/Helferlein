(function () {
  'use strict';
  const endpoint = 'https://avapuibsidubuzxjtyld.supabase.co/functions/v1/estate-emergency';
  const key = 'sb_publishable_95Vz26YwSFFWukFbqTBjMw_pv10kOFC';
  const panel = document.getElementById('estateEmergencyOwner');
  if (!panel) return;
  const result = document.getElementById('estateEmergencyStatus');
  const register = document.getElementById('estateRegisterKeys');
  const refresh = document.getElementById('estateRefreshAlarm');
  const cancel = document.getElementById('estateCancelAlarm');
  const status = message => { result.textContent = message; };
  const hex = bytes => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
  async function hash(token) {
    const bytes = new TextEncoder().encode(token);
    return hex(await crypto.subtle.digest('SHA-256', bytes));
  }
  async function token() {
    if (typeof supabaseClient === 'undefined') throw Error('Bitte melde dich zuerst unter „Mein Konto“ an.');
    const {data, error} = await supabaseClient.auth.getSession();
    if (error || !data.session?.access_token) throw Error('Bitte melde dich zuerst unter „Mein Konto“ an.');
    const {data:user, error:userError} = await supabaseClient.auth.getUser();
    if (userError || !user.user) throw Error('Bitte melde dich erneut an.');
    return data.session.access_token;
  }
  async function send(action, keys) {
    const bearer = await token();
    const response = await fetch(endpoint, {
      method: 'POST', cache:'no-store',
      headers: {'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+bearer},
      body: JSON.stringify(action === 'register' ? {action, keys} : {action})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(response.status === 401 ? 'Bitte melde dich erneut an.' : 'Verbindung fehlgeschlagen. Bitte später erneut versuchen.');
    return data;
  }
  function display(data) {
    if (data.status === 'countdown' && data.deadline) {
      status('Ein Notfallalarm läuft bis ' + new Date(data.deadline).toLocaleString('de-DE') + '. Du kannst ihn mit „Ich lebe noch“ beenden.');
    } else if (data.status === 'expired') {
      status('Die 24 Stunden sind abgelaufen. Eine Tresorfreigabe findet derzeit noch nicht statt.');
    } else if (data.status === 'canceled') {
      status('Entwarnung gespeichert. Der Alarm ist beendet.');
    } else {
      status('Zurzeit läuft kein Notfallalarm.');
    }
  }
  register.addEventListener('click', async () => {
    if (typeof vaultReady === 'undefined' || !vaultReady) return status('Bitte öffne zuerst deinen Tresor.');
    register.disabled = true;
    status('Schlüssel werden vorbereitet …');
    try {
      const cfg = getVaultConfig();
      const people = cfg?.alarmPersons || [];
      if (!people.length) throw Error('Bitte lege zuerst eine Vertrauensperson an.');
      const entries = [];
      for (const person of people) {
        const code = currentDecryptedVault?.trusteeKeys?.[person.id];
        if (typeof code !== 'string' || !/^[a-f0-9]{64}$/.test(code)) {
          throw Error('Für ' + person.name + ' fehlt ein Schlüssel. Bitte erst einen erstellen.');
        }
        entries.push({id:person.id, hash:await hash(code)});
      }
      const saved = await send('register',entries);
      status(saved.registered + ' persönliche Schlüssel sind für die Alarmprüfung hinterlegt. Der Tresor kann dadurch noch nicht geöffnet werden.');
    } catch (error) { status(error.message || 'Das hat leider nicht geklappt.'); }
    finally { register.disabled = false; }
  });
  refresh.addEventListener('click', async () => {
    refresh.disabled = true;
    try { display(await send('status')); }
    catch (error) { status(error.message || 'Status nicht verfügbar.'); }
    finally { refresh.disabled = false; }
  });
  async function doCancel() {
    try { display(await send('cancel')); return true; }
    catch (error) { status((error.message || 'Entwarnung nicht gespeichert.') + ' Bitte erneut versuchen.'); return false; }
  }
  cancel.addEventListener('click', doCancel);
  window.estateOwnerCancelAlarm = doCancel;
})();
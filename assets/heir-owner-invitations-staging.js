/* NON-DEPLOYED owner invitation view. No API host, credentials, or automatic activation.
 * A reviewed host must supply a same-origin authenticated transport and vault scope. */
(function (root) {
  'use strict';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const VAULT = /^v_[A-Za-z0-9_-]{8,80}$/;
  const STATES = Object.freeze({pending:'Ausstehend',accepted:'Angenommen',expired:'Abgelaufen',revoked:'Widerrufen'});
  function valid(item) {
    return item && UUID.test(item.invitationId) && UUID.test(item.intendedUserId) &&
      Object.hasOwn(STATES, item.status) &&
      typeof item.expiresAt === 'string' && Number.isFinite(Date.parse(item.expiresAt));
  }
  function mount(host, options) {
    if (!host || typeof host.replaceChildren !== 'function') throw Error('invalid_host');
    const doc = host.ownerDocument;
    const mk = (tag, value) => { const el=doc.createElement(tag); if(value !== undefined) el.textContent=value; return el; };
    let epoch=0, working=false, items=[];
    const ready = options && options.enabled === true && VAULT.test(options.vaultId) &&
      typeof options.request === 'function';
    const heading=mk('h4','Einladungen des Besitzers');
    const message=mk('p');
    message.setAttribute('role','status');message.setAttribute('aria-live','polite');
    const refresh=mk('button','Liste aktualisieren');refresh.type='button';
    const table=mk('table'), thead=mk('thead'), body=mk('tbody');
    const labels=['Einladungs-ID','Empfänger-Konto-ID','Status','Gültig bis','Aktion'];
    const tr=mk('tr');
    for(const label of labels) { const th=mk('th',label);th.scope='col';tr.append(th); }
    thead.append(tr);table.append(thead,body);
    host.replaceChildren(heading,message,refresh,table);
    function status(value) { message.textContent=value; }
    function draw() {
      body.replaceChildren();
      if (!items.length) { const row=mk('tr'), cell=mk('td','Keine Einladungen vorhanden.');cell.colSpan=5;row.append(cell);body.append(row);return; }
      for(const item of items) {
        const row=mk('tr');
        for(const value of [item.invitationId,item.intendedUserId,STATES[item.status],new Date(item.expiresAt).toLocaleString('de-DE')])
          row.append(mk('td',value));
        const cell=mk('td');
        if(item.status==='pending' || item.status==='accepted') {
          const button=mk('button','Widerrufen');button.type='button';
          button.disabled=working;
          button.setAttribute('aria-label','Einladung '+item.invitationId+' widerrufen');
          button.addEventListener('click',()=>revoke(item.invitationId));
          cell.append(button);
        } else cell.textContent='Keine Aktion';
        row.append(cell);body.append(row);
      }
    }
    async function load() {
      if(!ready || working) return;
      const seq=++epoch;working=true;refresh.disabled=true;status('Einladungen werden geladen …');draw();
      try {
        const result=await options.request('/v1/heirs/invitations/list',{vaultId:options.vaultId});
        if(seq!==epoch)return;
        if(!result || result.ok!==true || !Array.isArray(result.invitations) ||
          typeof result.hasMore!=='boolean' || result.invitations.length>50 ||
          !result.invitations.every(valid)) throw Error('invalid_response');
        items=result.invitations.map(x=>({invitationId:x.invitationId,intendedUserId:x.intendedUserId,
          status:x.status,expiresAt:x.expiresAt}));
        status(result.hasMore?'Die neuesten 50 Einladungen. Weitere Einträge sind vorhanden.':'Einladungsliste aktualisiert.');
      } catch { if(seq===epoch){ items=[];status('Einladungen konnten nicht geladen werden. Anmeldung und Serververbindung prüfen; bitte erneut versuchen.'); } }
      finally { if(seq===epoch){working=false;refresh.disabled=false;draw();} }
    }
    async function revoke(id) {
      if(!ready || working || !UUID.test(id) || !items.some(x=>x.invitationId===id && ['pending','accepted'].includes(x.status)))return;
      if(typeof options.confirm !== 'function' || options.confirm('Diese Einladung unwiderruflich sperren?')!==true)return;
      const seq=++epoch;working=true;refresh.disabled=true;status('Widerruf wird geprüft …');draw();
      try {
        const result=await options.request('/v1/heirs/invitations/revoke',{vaultId:options.vaultId,invitationId:id});
        if(seq!==epoch)return;
        if(!result || result.ok!==true)throw Error('denied');
        status('Widerruf bestätigt. Liste wird aktualisiert …');
      } catch { if(seq===epoch) status('Widerruf nicht bestätigt. Berechtigung und Verbindung prüfen; Status erneut laden.'); }
      finally { if(seq===epoch){working=false;refresh.disabled=false;draw();} }
      await load();
    }
    refresh.addEventListener('click',load);
    if(!ready){refresh.disabled=true;status('Noch nicht freigeschaltet: keine geprüfte Serververbindung. Keine Einladung wird versendet oder freigegeben.');}
    else {status('Bereit, die Einladungen abzurufen.');void load();}
    draw();
    return {refresh:load,dispose(){epoch++;working=true;refresh.disabled=true;host.replaceChildren();}};
  }
  root.HeirOwnerInvitationsStaging=Object.freeze({mount});
})(typeof window!=='undefined'?window:globalThis);

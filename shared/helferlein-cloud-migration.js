/* Opt-in migration controls. Never replace existing local records automatically. */
(function (global) {
  'use strict';
  function mount({ client, tool, localKey, collection, refresh, target }) {
    if (!client || !/^[a-z0-9_-]{1,80}$/i.test(tool) || !localKey || !collection) throw new Error('Invalid migration configuration');
    if (typeof localKey !== 'string' || localKey.length > 160 || !/^[a-z0-9_-]+$/i.test(localKey) || typeof collection !== 'string' || !/^[a-z]{1,40}$/i.test(collection)) throw new Error('Invalid local collection');
    if (!client.auth || typeof client.auth.onAuthStateChange !== 'function') throw new Error('Invalid auth client');
    if (target && typeof target.prepend !== 'function') throw new Error('Invalid migration target');
    const store = global.HelferleinCloudStore.createStore(client, tool);
    let enabledUser = null;
    let queue = Promise.resolve();
    let refreshInProgress = false;
    let lastSyncError = null;
    const enabledKey = uid => 'helferlein_cloud_enabled_' + tool + '_' + uid;
    const ownerKey = 'helferlein_cloud_owner_' + tool;
    const cacheKey = uid => 'helferlein_cloud_' + tool + '_' + uid + '_cache';
    // The legacy application still reads one shared localStorage key.
    // Fail closed when a different account is active; never upload its contents.
    function assertOwner(uid) {
      const owner = localStorage.getItem(ownerKey);
      if (!uid || owner !== uid) throw new Error('Benutzerwechsel erkannt: lokaler Speicher ist nicht diesem Konto zugeordnet. Cloud-Sync gesperrt.');
    }
    function validPayload(value) { return !!value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value[collection]); }
    async function currentUser() {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      return data && data.user && typeof data.user.id === 'string' ? data.user : null;
    }
    function isOwner(uid) { return !!uid && localStorage.getItem(ownerKey) === uid; }
    async function isEnabled() {
      const user = await currentUser();
      return !!user && user.id === enabledUser &&
        isOwner(user.id) &&
        localStorage.getItem(enabledKey(user.id)) === 'true';
    }
    function safeLocalBytes() { return localStorage.getItem(localKey); }
    async function enable() {
      const user = await currentUser();
      if (!user || !user.id) throw new Error('Bitte zuerst anmelden');
      const existingOwner = localStorage.getItem(ownerKey);
      if (existingOwner && existingOwner !== user.id) throw new Error('Lokale Daten gehören zu einem anderen Konto; Übernahme gesperrt');
      if ((await currentUser())?.id !== user.id) throw new Error('Konto vor Aktivierung gewechselt');
      localStorage.setItem(ownerKey, user.id);
      localStorage.setItem(enabledKey(user.id), 'true');
      enabledUser = user.id;
    }
    function reportError(error) { lastSyncError = error && error.message ? error.message : String(error); status.textContent = 'Cloud: ' + lastSyncError; }
    function changed(data) {
      if (!data || typeof data !== 'object' || Array.isArray(data)) { reportError(new Error('Ungültige lokale Änderungen')); return Promise.resolve(false); }
      // Called after the existing synchronous local save succeeded.
      // Failed uploads must remain pending, and are never silently discarded.
      const expectedOwner = localStorage.getItem(ownerKey);
      if (expectedOwner && !validPayload(data)) { reportError(new Error('Ungültige Werkzeugdaten')); return Promise.resolve(false); }
      let snapshot;
      try { snapshot = JSON.parse(JSON.stringify(data)); } catch (error) { return Promise.reject(new Error('Änderungen konnten nicht serialisiert werden')); }
      queue = queue.catch(() => {}).then(async () => {
        if (!await isEnabled() || localStorage.getItem(ownerKey) !== expectedOwner) return;
        if (!validPayload(snapshot)) throw new Error('Ungültige Datensammlung vor Cloud-Speicherung');
        try {
          const user = await currentUser();
          assertOwner(user && user.id);
          if (user.id !== expectedOwner) throw new Error('Konto während lokaler Speicherung gewechselt');
          const uploaded = await store.save(snapshot);
          if (uploaded) lastSyncError = null;
          if (await isEnabled() && localStorage.getItem(ownerKey) === expectedOwner) status.textContent = uploaded ? 'Lokal und in Supabase gespeichert' : 'Lokal gespeichert · Cloud-Synchronisierung ausstehend';
        } catch (error) {
          reportError(error);
        }
      });
      return queue;
    }
    async function refreshFromCloud() {
      if (refreshInProgress || !navigator.onLine || !await isEnabled()) return false;
      if (document.visibilityState === 'hidden') return false;
      refreshInProgress = true;
      try {
        await queue.catch(() => {});
        const user = await currentUser();
        if (!user || !isOwner(user.id) || await store.hasPending()) return false;
        const before = safeLocalBytes();
        if (before === null) return false;
        const cachedBytes = localStorage.getItem(cacheKey(user.id));
        if (cachedBytes === null) return false;
        const result = await store.load();
        if (result.source !== 'cloud' || !validPayload(result.data)) return false;
        if (localStorage.getItem(enabledKey(user.id)) !== 'true') return false;
        if ((await currentUser())?.id !== user.id || !isOwner(user.id)) return false;
        if (await store.hasPending()) return false;
        if (safeLocalBytes() !== before) return false;
        if (before !== null && cachedBytes !== null) {
          let previous;
          try { previous = JSON.parse(cachedBytes); } catch (_) { return false; }
          let local;
          try { local = JSON.parse(before); } catch (_) { return false; }
          if (!validPayload(local) || !validPayload(previous)) return false;
          if (JSON.stringify(previous) !== JSON.stringify(local)) return false;
        }
        if (before !== null && cachedBytes === null) return false;
        if (localStorage.getItem(ownerKey) !== user.id) return false;
        const incoming = JSON.stringify(result.data);
        if (!incoming || incoming === 'null') return false;
        if (before === incoming) return false;
        if ((await currentUser())?.id !== user.id) return false;
        if (safeLocalBytes() !== before) return false;
        localStorage.setItem(localKey, incoming);
        lastSyncError = null;
        status.textContent = 'Aktuelle Supabase-Daten übernommen';
        if (typeof refresh === 'function') { try { refresh(); } catch (error) { reportError(error); } }
        return true;
      } catch (error) { reportError(error); return false; }
      finally { refreshInProgress = false; }
    }
    async function resume() {
      // Finish queued local writes before attempting a reconnect flush.
      await queue.catch(() => {});
      if (!await isEnabled() || !navigator.onLine || !localStorage.getItem(ownerKey)) return;
      if (refreshInProgress) return;
      try {
        const user = await currentUser();
        assertOwner(user && user.id);
        const done = await store.flush();
        if (!await store.hasPending()) await refreshFromCloud();
        if (done && await isEnabled() && localStorage.getItem(ownerKey) === user.id) status.textContent = 'Ausstehende Änderungen synchronisiert';
      } catch (error) {
        status.textContent = 'Synchronisierung ausstehend: ' + (error.message || String(error));
      }
    }
    global.addEventListener('online', () => { void resume().catch(reportError); });
    let blocked = null;
    async function guardAccount() {
      const user = await currentUser();
      const owner = localStorage.getItem(ownerKey);
      if ((await currentUser())?.id !== (user && user.id)) throw new Error('Account changed during guard');
      const mismatch = !!(owner && (!user || owner !== user.id));
      if (mismatch) enabledUser = null;
      if (!mismatch && !owner && blocked) { blocked.remove(); blocked = null; }
      if (mismatch && !blocked) {
        blocked = document.createElement('div');
        blocked.setAttribute('role', 'alertdialog');
        blocked.setAttribute('aria-modal', 'true');
        blocked.setAttribute('aria-label', 'Kontoschutz');
        blocked.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f172a;color:white;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;padding:24px;font:18px system-ui;text-align:center';
        const message = document.createElement('p');
        message.textContent = 'Dieses Gerät enthält lokale Daten eines anderen Kontos. Die Dateneingabe bleibt gesperrt, bis das ursprüngliche Konto wieder angemeldet ist. Daten werden nicht gelöscht.';
        const back = document.createElement('button');
        back.type = 'button';
        back.textContent = 'Zur Anmeldung';
        back.style.cssText = 'padding:10px 16px;background:white;color:#0f172a;border-radius:8px;cursor:pointer';
        back.addEventListener('click', () => {
          const login = document.querySelector('[id*="login" i], [id*="auth" i], [class*="login" i]');
          if (login && typeof login.scrollIntoView === 'function') login.scrollIntoView();
          status.textContent = 'Bitte zum ursprünglichen Konto zurückwechseln.';
        });
        blocked.append(message, back);
        document.body.appendChild(blocked);
      } else if (!mismatch && blocked) {
        blocked.remove(); blocked = null;
      }
    }
    global.addEventListener('focus', () => { void refreshFromCloud().catch(reportError); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void refreshFromCloud().catch(reportError); });
    let authGeneration = 0;
    client.auth.onAuthStateChange(() => {
      const generation = ++authGeneration;
      // Never run account-sensitive queries synchronously inside the auth callback.
      setTimeout(() => {
        void guardAccount().catch(error => { status.textContent = 'Kontoprüfung fehlgeschlagen: ' + error.message; });
        void currentUser().then(user => {
          if (generation !== authGeneration) return;
          enabledUser = user && localStorage.getItem(ownerKey) === user.id &&
            localStorage.getItem(enabledKey(user.id)) === 'true' ? user.id : null;
          if (enabledUser) void resume().catch(reportError);
        }).catch(() => { if (generation === authGeneration) enabledUser = null; });
      }, 0);
    });
    const host = document.createElement('section');
    host.setAttribute('aria-label', 'Supabase-Datenübernahme');
    host.style.cssText = 'margin:12px 0;padding:12px;border:1px solid #94a3b8;border-radius:12px;background:#f8fafc;color:#0f172a;font:14px system-ui';
    const title = document.createElement('strong');
    title.textContent = 'Supabase-Datenübernahme (freiwillig)';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Lokale Daten bleiben unverändert, bis du eine Übernahme bestätigst.';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    function button(label, handler) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.style.cssText = 'padding:7px 10px;border:1px solid #64748b;border-radius:8px;background:white;color:#0f172a';
      b.addEventListener('click', async () => {
        if (b.disabled) return;
        for (const item of actions.querySelectorAll('button')) item.disabled = true;
        try { await handler(); } catch (error) {
          status.textContent = 'Fehler: ' + (error.message || String(error));
        } finally {
          for (const item of actions.querySelectorAll('button')) item.disabled = false;
        }
      });
      b.setAttribute('aria-label', label);
      actions.appendChild(b);
    }
    function localData() {
      const raw = localStorage.getItem(localKey);
      if (raw === null) return null;
      let value;
      try { value = JSON.parse(raw); } catch (_) { throw new Error('Lokale Daten sind beschädigt; Original bleibt erhalten'); }
      if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value[collection])) {
        throw new Error('Lokale Daten sind nicht lesbar; keine Übernahme möglich');
      }
      return value;
    }
    async function authenticated() {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      if (!data || !data.user || !data.user.id) throw new Error('Bitte zuerst anmelden');
    }
    button('Cloud-Status anzeigen', async () => {
      await authenticated();
      const user = await currentUser();
      const owner = localStorage.getItem(ownerKey);
      if (!user || !user.id) throw new Error('Anmeldung nicht mehr verfügbar');
      if (owner && owner !== user.id) throw new Error('Lokale Daten gehören zu einem anderen Konto');
      const result = await store.load();
      if (localStorage.getItem(ownerKey) !== owner) throw new Error('Kontozuordnung während Statusabfrage gewechselt');
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Statusabfrage gewechselt');
      const local = localData();
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während Statusanzeige gewechselt');
      status.textContent = 'Cloud: ' + result.source + ' · Lokal: ' +
        (local ? local[collection].length + ' Einträge' : 'keine Daten') +
        (await store.hasPending() ? ' · Synchronisierung ausstehend' : '');
    });
    button('Lokale Daten in Supabase übernehmen', async () => {
      await authenticated();
      if (!navigator.onLine) throw new Error('Für die erste Übernahme ist Internet erforderlich');
      const local = localData();
      if (!local) throw new Error('Keine gültigen lokalen Daten vorhanden');
      const originalBytes = localStorage.getItem(localKey);
      const owner = localStorage.getItem(ownerKey);
      const user = await currentUser();
      if (!user || !user.id) throw new Error('Anmeldung während Datenübernahme verloren');
      if (owner && owner !== user.id) throw new Error('Lokale Daten sind einem anderen Benutzer zugeordnet');
      if (await store.hasPending()) throw new Error('Zuerst ausstehende Synchronisierung klären');
      const cloud = await store.load();
      if (cloud.source !== 'cloud-empty') throw new Error('Cloud enthält Daten oder ist nicht eindeutig erreichbar; Übernahme blockiert');
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während Cloud-Prüfung gewechselt');
      if (!confirm('Lokale ' + local[collection].length + ' Einträge einmalig in die leere Supabase-Cloud übertragen? Lokale Daten bleiben erhalten.')) return;
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Bestätigung gewechselt');
      if (localStorage.getItem(localKey) !== originalBytes) throw new Error('Lokale Daten haben sich während der Bestätigung geändert; bitte erneut prüfen');
      if (localStorage.getItem(ownerKey) !== owner) throw new Error('Kontozuordnung wurde während der Bestätigung geändert');
      const result = await store.save(local);
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Übertragung gewechselt');
      if (result && localStorage.getItem(localKey) !== originalBytes) throw new Error('Lokale Daten nach Upload verändert; automatische Aktivierung gesperrt');
      if (result && !navigator.onLine) throw new Error('Verbindung nach Übertragung verloren; bitte Cloud-Status prüfen');
      if (result) await enable();
      status.textContent = result ? 'Daten übertragen · weitere Änderungen werden synchronisiert.' : 'Übertragung ausstehend.';
    });
    button('Cloud-Daten lokal übernehmen', async () => {
      await authenticated();
      if (!navigator.onLine) throw new Error('Cloud-Laden erfordert Internet');
      if (localStorage.getItem(localKey) !== null) throw new Error('Lokale Daten vorhanden; automatisches Überschreiben ist gesperrt');
      const owner = localStorage.getItem(ownerKey);
      const user = await currentUser();
      if (!user || !user.id) throw new Error('Anmeldung während Cloud-Laden verloren');
      if (owner && owner !== user.id) throw new Error('Lokaler Speicher gehört einem anderen Konto');
      if (await store.hasPending()) throw new Error('Ausstehende lokale Änderungen vorhanden');
      const result = await store.load();
      if (result.source !== 'cloud') throw new Error('Keine eindeutig abrufbaren Cloud-Daten');
      if (!navigator.onLine) throw new Error('Verbindung beim Cloud-Laden verloren');
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während Cloud-Abfrage gewechselt');
      if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data) || !Array.isArray(result.data[collection])) throw new Error('Cloud-Datenformat ungültig');
      if (!confirm(result.data[collection].length + ' Cloud-Einträge in den bisher leeren lokalen Speicher laden?')) return;
      // Recheck before writing: never replace local data added while awaiting confirmation.
      if (localStorage.getItem(localKey) !== null) throw new Error('Lokale Daten wurden inzwischen angelegt');
      if (!await isEnabled() && enabledUser !== null) throw new Error('Cloud-Zuordnung während Übernahme geändert');
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Bestätigung gewechselt');
      if (localStorage.getItem(ownerKey) !== owner) throw new Error('Kontozuordnung hat sich geändert');
      if (await store.hasPending()) throw new Error('Neue lokale Änderungen erkannt; Cloud-Übernahme abgebrochen');
      if (!navigator.onLine) throw new Error('Verbindung während Cloud-Übernahme verloren');
      localStorage.setItem(localKey, JSON.stringify(result.data));
      await enable();
      if ((await currentUser())?.id !== user.id) throw new Error('Konto nach Übernahme gewechselt');
      status.textContent = 'Cloud-Daten lokal geladen. Seite wird aktualisiert.';
      if (typeof refresh === 'function') { try { refresh(); } catch (error) { status.textContent = 'Daten übernommen, Anzeige konnte nicht aktualisiert werden: ' + error.message; } }
    });
    button('Offline-Änderungen abgleichen', async () => {
      if (!await isEnabled()) throw new Error('Cloud-Synchronisierung ist nicht aktiviert');
      const user = await currentUser();
      assertOwner(user && user.id);
      await queue.catch(() => {});
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während des Abgleichs gewechselt');
      if (!navigator.onLine) throw new Error('Für den Offline-Abgleich ist wieder Internet erforderlich');
      const result = await store.reconcilePending();
      assertOwner(user.id);
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während des Abgleichs gewechselt');
      if (result.status === 'conflict') {
        status.textContent = 'Konflikt: Cloud und lokale Änderungen unterscheiden sich. Keine Daten überschrieben.';
        return;
      }
      if (result.status === 'ready') {
        if (!await isEnabled()) throw new Error('Synchronisierung wurde deaktiviert');
        if (!confirm('Die Cloud ist leer. Ausstehende lokale Änderungen jetzt nach Supabase übertragen?')) {
          status.textContent = 'Übertragung nicht bestätigt; lokale Änderungen bleiben erhalten.';
          return;
        }
        if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Bestätigung gewechselt');
        assertOwner(user.id);
        if (!await store.hasPending()) throw new Error('Ausstehende Änderungen haben sich verändert');
        const done = await store.flush();
        status.textContent = done ? 'Offline-Änderungen übertragen' : 'Änderungen bleiben ausstehend';
      } else {
        status.textContent = result.status === 'already-synced'
          ? 'Änderungen bereits in Supabase vorhanden; bestätigt'
          : 'Kein ungeklärter Offline-Ausgangsstand';
      }
    });
    button('Ausstehende Änderungen synchronisieren', async () => {
      if (!await isEnabled()) throw new Error('Cloud-Synchronisierung zuerst durch bestätigte Übernahme aktivieren');
      await queue.catch(() => {});
      const user = await currentUser();
      assertOwner(user && user.id);
      if (!await isEnabled()) throw new Error('Cloud-Synchronisierung während des Vorgangs deaktiviert');
      if (!navigator.onLine) throw new Error('Für manuelle Synchronisierung ist Internet erforderlich');
      const done = await store.flush();
      if (localStorage.getItem(ownerKey) !== user.id) throw new Error('Kontozuordnung während Synchronisierung gewechselt');
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Synchronisierung gewechselt');
      status.textContent = done ? 'Synchronisierung abgeschlossen' : 'Keine Übertragung möglich oder erforderlich';
    });
    void guardAccount().catch(error => { status.textContent = 'Kontoprüfung fehlgeschlagen: ' + error.message; });
    void currentUser().then(user => {
      if (user && isOwner(user.id) &&
          localStorage.getItem(enabledKey(user.id)) === 'true') {
        enabledUser = user.id;
        void resume().catch(error => { status.textContent = 'Cloud-Wiederaufnahme fehlgeschlagen: ' + error.message; });
      }
    }).catch(error => { status.textContent = 'Cloud-Start fehlgeschlagen: ' + error.message; });
    host.append(title, status, actions);
    (target || document.body).prepend(host);
    return { store, host, changed, resume };
  }
  global.HelferleinCloudMigration = Object.freeze({ mount });
})(window);

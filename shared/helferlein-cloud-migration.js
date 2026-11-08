/* Opt-in migration controls. Never replace existing local records automatically. */
(function (global) {
  'use strict';
  function mount({ client, tool, localKey, collection, refresh, target }) {
    const store = global.HelferleinCloudStore.createStore(client, tool);
    let enabledUser = null;
    let queue = Promise.resolve();
    const enabledKey = uid => 'helferlein_cloud_enabled_' + tool + '_' + uid;
    const ownerKey = 'helferlein_cloud_owner_' + tool;
    // The legacy application still reads one shared localStorage key.
    // Fail closed when a different account is active; never upload its contents.
    function assertOwner(uid) {
      const owner = localStorage.getItem(ownerKey);
      if (owner !== uid) throw new Error('Benutzerwechsel erkannt: lokaler Speicher ist nicht diesem Konto zugeordnet. Cloud-Sync gesperrt.');
    }
    async function currentUser() {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      return data.user;
    }
    async function isEnabled() {
      const user = await currentUser();
      return !!user && user.id === enabledUser &&
        localStorage.getItem(ownerKey) === user.id &&
        localStorage.getItem(enabledKey(user.id)) === 'true';
    }
    async function enable() {
      const user = await currentUser();
      if (!user) throw new Error('Bitte zuerst anmelden');
      const existingOwner = localStorage.getItem(ownerKey);
      if (existingOwner && existingOwner !== user.id) throw new Error('Lokale Daten gehören zu einem anderen Konto; Übernahme gesperrt');
      localStorage.setItem(ownerKey, user.id);
      enabledUser = user.id;
      localStorage.setItem(enabledKey(user.id), 'true');
    }
    function changed(data) {
      // Called after the existing synchronous local save succeeded.
      // Failed uploads must remain pending, and are never silently discarded.
      queue = queue.catch(() => {}).then(async () => {
        if (!await isEnabled()) return;
        try {
          const user = await currentUser();
          assertOwner(user.id);
          const uploaded = await store.save(data);
          status.textContent = uploaded ? 'Lokal und in Supabase gespeichert' : 'Lokal gespeichert · Cloud-Synchronisierung ausstehend';
        } catch (error) {
          status.textContent = 'Lokal gespeichert · Cloud-Synchronisierung fehlgeschlagen: ' + error.message;
        }
      });
      return queue;
    }
    async function resume() {
      // Finish queued local writes before attempting a reconnect flush.
      await queue.catch(() => {});
      if (!await isEnabled() || !navigator.onLine) return;
      try {
        const done = await store.flush();
        if (done) status.textContent = 'Ausstehende Änderungen synchronisiert';
      } catch (error) {
        status.textContent = 'Synchronisierung ausstehend: ' + error.message;
      }
    }
    global.addEventListener('online', () => { void resume(); });
    let blocked = null;
    async function guardAccount() {
      const user = await currentUser();
      const owner = localStorage.getItem(ownerKey);
      const mismatch = !!(owner && (!user || owner !== user.id));
      if (mismatch && !blocked) {
        blocked = document.createElement('div');
        blocked.setAttribute('role', 'alertdialog');
        blocked.setAttribute('aria-modal', 'true');
        blocked.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f172a;color:white;display:flex;align-items:center;justify-content:center;padding:24px;font:18px system-ui;text-align:center';
        blocked.textContent = 'Dieses Gerät enthält lokale Daten eines anderen Kontos. Zum Schutz vor Vermischung ist die Anwendung gesperrt. Bitte zum ursprünglichen Konto zurückwechseln. Die Daten wurden nicht gelöscht.';
        document.body.appendChild(blocked);
      } else if (!mismatch && blocked) {
        blocked.remove(); blocked = null;
      }
    }
    client.auth.onAuthStateChange(() => {
      // Never run account-sensitive queries synchronously inside the auth callback.
      setTimeout(() => {
        void guardAccount().catch(() => {});
        void currentUser().then(user => {
          enabledUser = user && localStorage.getItem(ownerKey) === user.id &&
            localStorage.getItem(enabledKey(user.id)) === 'true' ? user.id : null;
          if (enabledUser) void resume();
        }).catch(() => { enabledUser = null; });
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
        for (const item of actions.querySelectorAll('button')) item.disabled = true;
        try { await handler(); } catch (error) {
          status.textContent = 'Fehler: ' + (error.message || String(error));
        } finally {
          for (const item of actions.querySelectorAll('button')) item.disabled = false;
        }
      });
      actions.appendChild(b);
    }
    function localData() {
      const raw = localStorage.getItem(localKey);
      if (raw === null) return null;
      const value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || !Array.isArray(value[collection])) {
        throw new Error('Lokale Daten sind nicht lesbar; keine Übernahme möglich');
      }
      return value;
    }
    async function authenticated() {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error('Bitte zuerst anmelden');
    }
    button('Cloud-Status anzeigen', async () => {
      await authenticated();
      const result = await store.load();
      const local = localData();
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
      if (owner && owner !== user.id) throw new Error('Lokale Daten sind einem anderen Benutzer zugeordnet');
      if (await store.hasPending()) throw new Error('Zuerst ausstehende Synchronisierung klären');
      const cloud = await store.load();
      if (cloud.source !== 'cloud-empty') throw new Error('Cloud enthält Daten oder ist nicht eindeutig erreichbar; Übernahme blockiert');
      if (!confirm('Lokale ' + local[collection].length + ' Einträge einmalig in die leere Supabase-Cloud übertragen? Lokale Daten bleiben erhalten.')) return;
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Bestätigung gewechselt');
      if (localStorage.getItem(localKey) !== originalBytes) throw new Error('Lokale Daten haben sich während der Bestätigung geändert; bitte erneut prüfen');
      const result = await store.save(local);
      if (result) await enable();
      status.textContent = result ? 'Daten übertragen · weitere Änderungen werden synchronisiert.' : 'Übertragung ausstehend.';
    });
    button('Cloud-Daten lokal übernehmen', async () => {
      await authenticated();
      if (!navigator.onLine) throw new Error('Cloud-Laden erfordert Internet');
      if (localStorage.getItem(localKey) !== null) throw new Error('Lokale Daten vorhanden; automatisches Überschreiben ist gesperrt');
      const owner = localStorage.getItem(ownerKey);
      const user = await currentUser();
      if (owner && owner !== user.id) throw new Error('Lokaler Speicher gehört einem anderen Konto');
      if (await store.hasPending()) throw new Error('Ausstehende lokale Änderungen vorhanden');
      const result = await store.load();
      if (result.source !== 'cloud') throw new Error('Keine eindeutig abrufbaren Cloud-Daten');
      if (!result.data || !Array.isArray(result.data[collection])) throw new Error('Cloud-Datenformat ungültig');
      if (!confirm(result.data[collection].length + ' Cloud-Einträge in den bisher leeren lokalen Speicher laden?')) return;
      // Recheck before writing: never replace local data added while awaiting confirmation.
      if (localStorage.getItem(localKey) !== null) throw new Error('Lokale Daten wurden inzwischen angelegt');
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Bestätigung gewechselt');
      localStorage.setItem(localKey, JSON.stringify(result.data));
      await enable();
      status.textContent = 'Cloud-Daten lokal geladen. Seite wird aktualisiert.';
      if (typeof refresh === 'function') refresh();
    });
    button('Ausstehende Änderungen synchronisieren', async () => {
      if (!await isEnabled()) throw new Error('Cloud-Synchronisierung zuerst durch bestätigte Übernahme aktivieren');
      const done = await store.flush();
      status.textContent = done ? 'Synchronisierung abgeschlossen' : 'Keine Übertragung möglich oder erforderlich';
    });
    void guardAccount().catch(() => {});
    void currentUser().then(user => {
      if (user && localStorage.getItem(ownerKey) === user.id &&
          localStorage.getItem(enabledKey(user.id)) === 'true') {
        enabledUser = user.id;
        void resume();
      }
    }).catch(() => {});
    host.append(title, status, actions);
    (target || document.body).prepend(host);
    return { store, host, changed, resume };
  }
  global.HelferleinCloudMigration = Object.freeze({ mount });
})(window);

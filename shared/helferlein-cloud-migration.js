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
    let disposed = false;
    let importInProgress = false;
    let migrationInProgress = false;
    let activeOperation = null;
    let accountGeneration = 0;
    let statusGeneration = 0;
    let reconnectInProgress = false;
    let lastRefreshAt = null;
    let lastReconnectAt = null;
    let lastConflictMessage = null;
    let accountSwitchInProgress = false;
    let lastCloudSource = null;
    let lastLocalChangeAt = null;
    let lastAccountChangeAt = null;
    let lastStatusCheckAt = null;
    let lastImportAt = null;
    let lastUploadAt = null;
    let lastPendingCheckAt = null;
    let lastStatusErrorAt = null;
    let lastAuthCheckAt = null;
    let refreshAttempts = 0;
    let refreshApplied = 0;
    let reconnectAttempts = 0;
    let reconnectSuccesses = 0;
    let lastGuardAt = null;
    let lastGuardMismatch = null;
    let lastEnableAt = null;
    let lastRefreshSkippedAt = null;
    let lastOperationStartedAt = null;
    let lastOperationEndedAt = null;
    let lastOwnerAtStatus = null;
    let lastAuthStateAt = null;
    const enabledKey = uid => 'helferlein_cloud_enabled_' + tool + '_' + uid;
    const ownerKey = 'helferlein_cloud_owner_' + tool;
    const cacheKey = uid => 'helferlein_cloud_' + tool + '_' + uid + '_cache';
    const now = () => new Date().toISOString();
    // The legacy application still reads one shared localStorage key.
    // Fail closed when a different account is active; never upload its contents.
    function assertActive() { if (disposed) throw new Error('Cloud-Verbindung wurde beendet'); }
    function requireOnlineAndActive() { assertActive(); ensureOnline(); }
    function beginOperation(name) { assertActive(); if (accountSwitchInProgress) throw new Error('Kontowechsel läuft'); if (activeOperation) throw new Error('Ein anderer Cloud-Vorgang läuft: ' + activeOperation); activeOperation = name; lastOperationStartedAt = now(); }
    function endOperation(name) { if (activeOperation === name) { activeOperation = null; lastOperationEndedAt = now(); } }
    function isBusy() { return disposed || !!activeOperation || importInProgress || migrationInProgress || accountSwitchInProgress; }
    function assertOwner(uid) {
      assertActive();
      const owner = localStorage.getItem(ownerKey);
      if (!uid || owner !== uid) throw new Error('Benutzerwechsel erkannt: lokaler Speicher ist nicht diesem Konto zugeordnet. Cloud-Sync gesperrt.');
    }
    function validPayload(value) { return !!value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value[collection]); }
    function assertValidPayload(value) { if (!validPayload(value)) throw new Error('Werkzeugdaten haben ein ungültiges Format'); return value; }
    async function currentUser() {
      assertActive();
      const { data, error } = await client.auth.getUser();
      if (error) { lastStatusErrorAt = now(); lastSyncError = error.message || String(error); throw error; }
      assertActive();
      lastAuthCheckAt = now();
      lastOwnerAtStatus = currentOwner();
      return data && data.user && typeof data.user.id === 'string' ? data.user : null;
    }
    function isOwner(uid) { return ownerMatches(uid); }
    function ensureOwner(uid) { assertActive(); if (!isOwner(uid)) throw new Error('Lokale Kontozuordnung hat sich geändert'); }
    function ensureOnline() { if (typeof navigator === 'undefined' || !navigator.onLine) throw new Error('Internetverbindung erforderlich'); }
    function ensureNoPending(pending) { lastPendingCheckAt = now(); if (pending) { lastConflictMessage = 'Ausstehende Offline-Daten'; throw new Error('Ausstehende lokale Änderungen müssen zuerst geklärt werden'); } }
    function ensureCollection(data) { return assertValidPayload(data); }
    function safeParseLocal() { const bytes = safeLocalBytes(); if (bytes === null) return null; try { return JSON.parse(bytes); } catch (_) { throw new Error('Lokale Daten beschädigt; Original bleibt erhalten'); } }
    async function isEnabled() {
      if (disposed) return false;
      const user = await currentUser();
      if (disposed) return false;
      if (accountSwitchInProgress) return false;
      return !!user && user.id === enabledUser &&
        isOwner(user.id) &&
        localStorage.getItem(enabledKey(user.id)) === 'true';
    }
    function safeLocalBytes() { assertActive(); return localStorage.getItem(localKey); }
    function localCount(data) { return validPayload(data) ? data[collection].length : null; }
    function validateLocal() { const data = safeParseLocal(); if (data !== null) ensureCollection(data); return data; }
    function hasValidLocal() { try { return validPayload(validateLocal()); } catch (_) { return false; } }
    function requireUser(user) { if (!user || typeof user.id !== 'string' || !user.id) throw new Error('Anmeldung erforderlich'); return user.id; }
    function ensureLocalUnchanged(bytes) { assertActive(); if (safeLocalBytes() !== bytes) throw new Error('Lokale Daten wurden zwischenzeitlich verändert'); }
    function ensureOwnerUnchanged(owner) { assertActive(); if (currentOwner() !== owner) throw new Error('Kontozuordnung wurde zwischenzeitlich verändert'); }
    async function enable() {
      assertActive();
      if (activeOperation === 'refresh') throw new Error('Cloud-Aktualisierung läuft');
      if (accountSwitchInProgress) throw new Error('Kontowechsel läuft');
      const user = await currentUser();
      requireUser(user);
      const existingOwner = currentOwner();
      if (existingOwner && existingOwner !== user.id) { lastConflictMessage = 'Lokale Daten gehören zu einem anderen Konto'; lastStatusErrorAt = now(); throw new Error('Lokale Daten gehören zu einem anderen Konto; Übernahme gesperrt'); }
      if ((await currentUser())?.id !== user.id) { lastConflictMessage = 'Konto vor Aktivierung gewechselt'; throw new Error('Konto vor Aktivierung gewechselt'); }
      assertActive();
      localStorage.setItem(ownerKey, user.id);
      if (currentOwner() !== user.id) { lastConflictMessage = 'Kontozuordnung konnte nicht gespeichert werden'; throw new Error('Kontozuordnung konnte nicht gespeichert werden'); }
      localStorage.setItem(enabledKey(user.id), 'true');
      if (localStorage.getItem(enabledKey(user.id)) !== 'true') { lastConflictMessage = 'Cloud-Aktivierung konnte nicht gespeichert werden'; throw new Error('Cloud-Aktivierung konnte nicht gespeichert werden'); }
      enabledUser = user.id;
      accountGeneration++;
      lastAccountChangeAt = now();
      lastEnableAt = now();
    }
    function reportError(error) { if (disposed) return; lastStatusErrorAt = now(); lastSyncError = error && error.message ? error.message : String(error); lastConflictMessage = lastSyncError; setStatus('Cloud: ' + lastSyncError); }
    function setStatus(message) { if (!disposed) { statusGeneration++; status.textContent = message; } }
    function statusError(prefix, error) { lastStatusErrorAt = now(); lastConflictMessage = error && error.message ? error.message : String(error); setStatus(prefix + ': ' + lastConflictMessage); }
    function currentOwner() { return localStorage.getItem(ownerKey); }
    function ownerMatches(uid) { return !!uid && currentOwner() === uid; }
    function assertSameAccount(uid, generation) { if (!sameAccount(uid, generation)) throw new Error('Konto während Cloud-Vorgang gewechselt'); }
    function sameAccount(uid, generation) { return !disposed && !!uid && enabledUser === uid && accountGeneration === generation && isOwner(uid); }
    function changed(data) {
      if (disposed) return Promise.resolve(false);
      lastLocalChangeAt = now();
      lastOwnerAtStatus = currentOwner();
      if (accountSwitchInProgress) { lastConflictMessage = 'Kontowechsel während Änderung'; return Promise.resolve(false); }
      if (!validPayload(data)) { reportError(new Error('Ungültige lokale Änderungen')); return Promise.resolve(false); }
      // Called after the existing synchronous local save succeeded.
      // Failed uploads must remain pending, and are never silently discarded.
      const expectedOwner = currentOwner();
      const expectedGeneration = accountGeneration;
      if (activeOperation === 'import' || activeOperation === 'upload') { lastConflictMessage = 'Datenübernahme läuft'; return Promise.resolve(false); }
      if (expectedOwner && !validPayload(data)) { reportError(new Error('Ungültige Werkzeugdaten')); return Promise.resolve(false); }
      if (expectedOwner && enabledUser && expectedOwner !== enabledUser) { reportError(new Error('Kontowechsel während lokaler Änderung')); return Promise.resolve(false); }
      if (expectedOwner && currentOwner() !== expectedOwner) { lastConflictMessage = 'Kontozuordnung während Änderung gewechselt'; return Promise.resolve(false); }
      let snapshot;
      try { snapshot = JSON.parse(JSON.stringify(data)); } catch (error) { reportError(error); return Promise.reject(new Error('Änderungen konnten nicht serialisiert werden')); }
      queue = queue.catch(() => {}).then(async () => {
        assertActive();
        if (accountSwitchInProgress) { lastConflictMessage = 'Kontowechsel während Cloud-Speicherung'; return false; }
        if (disposed || expectedGeneration !== accountGeneration) { lastConflictMessage = 'Konto während Cloud-Speicherung geändert'; return false; }
        if (!await isEnabled() || currentOwner() !== expectedOwner) { lastConflictMessage = 'Cloud-Speicherung für Konto nicht aktiv'; return false; }
        if (!validPayload(snapshot)) throw new Error('Ungültige Datensammlung vor Cloud-Speicherung');
        try {
          const user = await currentUser();
          assertOwner(user && user.id);
          if (user.id !== expectedOwner) throw new Error('Konto während lokaler Speicherung gewechselt');
          if (expectedGeneration !== accountGeneration) return false;
          const uploaded = await store.save(snapshot);
          if (disposed || expectedGeneration !== accountGeneration) return false;
          if (uploaded) { lastSyncError = null; lastConflictMessage = null; lastReconnectAt = now(); lastUploadAt = now(); }
          if (await isEnabled() && currentOwner() === expectedOwner) setStatus(uploaded ? 'Lokal und in Supabase gespeichert' : 'Lokal gespeichert · Cloud-Synchronisierung ausstehend');
        } catch (error) {
          reportError(error);
        }
      });
      return queue;
    }
    async function refreshFromCloud() {
      if (disposed || importInProgress || migrationInProgress || reconnectInProgress || accountSwitchInProgress) { lastRefreshSkippedAt = now(); return false; }
      refreshAttempts++;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') { lastRefreshSkippedAt = now(); return false; }
      if (refreshInProgress || activeOperation || !navigator.onLine || !await isEnabled()) { lastRefreshSkippedAt = now(); return false; }
      if (currentOwner() !== enabledUser) { lastRefreshSkippedAt = now(); lastConflictMessage = 'Kontozuordnung passt nicht'; return false; }
      if (lastConflictMessage && (await store.hasPending())) return false;
      if (safeLocalBytes() === null) { lastRefreshSkippedAt = now(); lastConflictMessage = 'Keine lokalen Daten für Cloud-Aktualisierung'; return false; }
      if (await store.hasPending()) { lastRefreshSkippedAt = now(); lastConflictMessage = 'Offline-Änderungen vor Cloud-Aktualisierung'; return false; }
      if (document.visibilityState === 'hidden') { lastRefreshSkippedAt = now(); return false; }
      refreshInProgress = true;
      activeOperation = 'refresh';
      const refreshOwner = enabledUser;
      const refreshGeneration = accountGeneration;
      const ownerAtStart = currentOwner();
      try {
        if (!ownerAtStart) { lastRefreshSkippedAt = now(); lastConflictMessage = 'Kontozuordnung fehlt'; return false; }
        await queue.catch(() => {});
        const user = await currentUser();
        if (!sameAccount(refreshOwner, refreshGeneration)) return false;
        assertActive();
        if (!user || !isOwner(user.id) || await store.hasPending()) return false;
        if (ownerAtStart !== user.id) return false;
        if (!isOwner(user.id)) return false;
        const before = safeLocalBytes();
        if (before === null) return false;
        if (!hasValidLocal()) { lastConflictMessage = 'Lokale Daten ungültig'; return false; }
        if (!isOwner(refreshOwner)) return false;
        if (accountSwitchInProgress) return false;
        const cachedBytes = localStorage.getItem(cacheKey(user.id));
        if (cachedBytes === null) return false;
        const result = await store.load();
        lastCloudSource = result.source;
        if (result.source !== 'cloud' || !validPayload(result.data)) return false;
        if (result.data[collection].some(item => item === undefined)) return false;
        if (accountSwitchInProgress) return false;
        if (localStorage.getItem(enabledKey(user.id)) !== 'true') return false;
        if (disposed) return false;
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
        if (currentOwner() !== ownerAtStart) return false;
        if (!sameAccount(refreshOwner, refreshGeneration)) return false;
        const incoming = JSON.stringify(result.data);
        if (!incoming || incoming === 'null') return false;
        if (before === incoming) { lastRefreshAt = now(); lastSyncError = null; lastConflictMessage = null; return false; }
        if ((await currentUser())?.id !== user.id) return false;
        if (refreshOwner !== enabledUser || refreshGeneration !== accountGeneration) return false;
        if (await store.hasPending()) return false;
        ensureLocalUnchanged(before);
        ensureOwnerUnchanged(ownerAtStart);
        localStorage.setItem(localKey, incoming);
        refreshApplied++;
        lastRefreshAt = now();
        lastSyncError = null;
        lastConflictMessage = null;
        setStatus('Aktuelle Supabase-Daten übernommen');
        if (typeof refresh === 'function') { try { refresh(); } catch (error) { reportError(error); } }
        return true;
      } catch (error) { reportError(error); return false; }
      finally { refreshInProgress = false; endOperation('refresh'); }
    }
    async function resume() {
      if (disposed || migrationInProgress || importInProgress || activeOperation || reconnectInProgress || accountSwitchInProgress) return;
      reconnectAttempts++;
      if (!navigator.onLine || !currentOwner()) { lastRefreshSkippedAt = now(); return; }
      reconnectInProgress = true;
      const reconnectGeneration = accountGeneration;
      const reconnectOwner = currentOwner();
      try {
        assertActive();
      // Finish queued local writes before attempting a reconnect flush.
      await queue.catch(() => {});
      if (!await isEnabled() || !navigator.onLine || !reconnectOwner) { lastRefreshSkippedAt = now(); return; }
      if (refreshInProgress) { lastRefreshSkippedAt = now(); return; }
      try {
        const user = await currentUser();
        assertOwner(user && user.id);
        if (reconnectOwner !== currentOwner()) return;
        const done = await store.flush();
        if (!sameAccount(user.id, reconnectGeneration)) return;
        if (reconnectOwner !== currentOwner()) return;
        if (!await store.hasPending()) { lastReconnectAt = now(); reconnectSuccesses++; }
        if (done && await isEnabled() && isOwner(user.id)) setStatus('Ausstehende Änderungen synchronisiert');
      } catch (error) {
        statusError('Synchronisierung ausstehend', error);
      }
      } finally { reconnectInProgress = false; }
      if (!disposed && sameAccount(enabledUser, reconnectGeneration) && reconnectOwner === currentOwner()) void refreshFromCloud().catch(reportError);
    }
    const onOnline = () => { if (!disposed) void resume().catch(reportError); };
    global.addEventListener('online', onOnline);
    let blocked = null;
    async function guardAccount() {
      if (disposed) return;
      const user = await currentUser();
      const owner = currentOwner();
      lastGuardAt = now();
      if ((await currentUser())?.id !== (user && user.id)) throw new Error('Account changed during guard');
      if (disposed) return;
      const mismatch = !!(owner && (!user || owner !== user.id));
      lastGuardMismatch = mismatch;
      lastOwnerAtStatus = owner;
      if (accountSwitchInProgress) return;
      if (disposed) return;
      if (mismatch && enabledUser !== null) { enabledUser = null; accountGeneration++; lastAccountChangeAt = now(); lastCloudSource = null; lastSyncError = 'Kontowechsel erkannt'; }
      if (!mismatch && blocked) { blocked.remove(); blocked = null; lastConflictMessage = null; }
      if (mismatch && !blocked) {
        blocked = document.createElement('div');
        blocked.setAttribute('role', 'alertdialog');
        blocked.setAttribute('aria-modal', 'true');
        blocked.setAttribute('aria-label', 'Kontoschutz');
        blocked.setAttribute('aria-live', 'polite');
        blocked.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f172a;color:white;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;padding:24px;font:18px system-ui;text-align:center';
        const message = document.createElement('p');
        message.textContent = 'Dieses Gerät enthält lokale Daten eines anderen Kontos. Die Dateneingabe bleibt gesperrt, bis das ursprünglich zugeordnete Konto wieder angemeldet ist. Daten werden nicht gelöscht.';
        const form = document.createElement('form');
        form.style.cssText = 'display:grid;gap:10px;width:min(100%,360px);margin:12px auto';
        const email = document.createElement('input');
        email.type = 'email';
        email.inputMode = 'email';
        email.autocomplete = 'username';
        email.maxLength = 254;
        email.required = true;
        email.spellcheck = false;
        email.placeholder = 'E-Mail des ursprünglichen Kontos';
        email.name = 'helferlein-account-email';
        email.setAttribute('aria-label', 'E-Mail des ursprünglichen Kontos');
        const password = document.createElement('input');
        password.type = 'password';
        password.autocomplete = 'current-password';
        password.minLength = 1;
        password.required = true;
        password.spellcheck = false;
        password.placeholder = 'Passwort';
        password.name = 'helferlein-account-password';
        password.setAttribute('aria-label', 'Passwort');
        const loginButton = document.createElement('button');
        loginButton.type = 'submit';
        loginButton.setAttribute('aria-label', 'Mit dem ursprünglich zugeordneten Konto anmelden');
        loginButton.textContent = 'Zum ursprünglichen Konto anmelden';
        loginButton.style.cssText = 'padding:10px;border-radius:8px;background:#fff;color:#0f172a;cursor:pointer';
        form.append(email, password, loginButton);
        form.noValidate = false;
        const back = document.createElement('button');
        back.type = 'button';
        back.textContent = 'E-Mail-Eingabe auswählen';
        back.style.cssText = 'padding:10px 16px;background:white;color:#0f172a;border-radius:8px;cursor:pointer';
        back.addEventListener('click', () => {
          if (disposed) return;
          email.focus();
          setStatus('Bitte zum ursprünglichen Konto zurückwechseln.');
        });
        blocked.append(message, form, back);
        blocked.style.overflowY = 'auto';
        blocked.setAttribute('tabindex', '-1');
        blocked.setAttribute('aria-describedby', 'helferlein-account-protection-message-' + tool);
        message.id = 'helferlein-account-protection-message-' + tool;
        form.addEventListener('submit', async event => {
          event.preventDefault();
          if (disposed || accountSwitchInProgress) return;
          if (!email.value.trim() || !password.value) return;
          if (currentOwner() === null) return;
          accountSwitchInProgress = true;
          loginButton.disabled = true;
          loginButton.setAttribute('aria-busy', 'true');
          email.disabled = true;
          password.disabled = true;
          try {
            if (typeof client.auth.signInWithPassword !== 'function') throw new Error('Anmeldung nicht verfügbar');
            const result = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
            if (result.error) throw result.error;
            password.value = '';
            const signedIn = await currentUser();
            assertActive();
            if (!signedIn || signedIn.id !== currentOwner()) throw new Error('Bitte das ursprünglich zugeordnete Konto verwenden');
            if (disposed) return;
            enabledUser = signedIn.id;
            accountGeneration++;
            lastAccountChangeAt = now();
            lastSyncError = null;
            setStatus('Ursprüngliches Konto wieder angemeldet');
          } catch (error) { statusError('Kontowechsel fehlgeschlagen', error); }
          finally { accountSwitchInProgress = false; loginButton.disabled = false; loginButton.removeAttribute('aria-busy'); email.disabled = false; password.disabled = false; void guardAccount().catch(reportError); }
        });
        document.body.appendChild(blocked);
        email.focus();
      } else if (!mismatch && blocked) {
        blocked.remove(); blocked = null;
      }
    }
    const onFocus = () => { if (!disposed) void refreshFromCloud().catch(reportError); };
    global.addEventListener('focus', onFocus);
    const onVisibility = () => { if (!disposed && document.visibilityState === 'visible') void refreshFromCloud().catch(reportError); };
    document.addEventListener('visibilitychange', onVisibility);
    let authGeneration = 0;
    const authSubscription = client.auth.onAuthStateChange(() => {
      if (disposed) return;
      const generation = ++authGeneration;
      accountGeneration++;
      // Never run account-sensitive queries synchronously inside the auth callback.
      setTimeout(() => {
        if (disposed || generation !== authGeneration) return;
        void guardAccount().catch(error => statusError('Kontoprüfung fehlgeschlagen', error));
        void currentUser().then(user => {
          if (generation !== authGeneration) return;
          if (disposed || generation !== authGeneration) return;
          enabledUser = user && localStorage.getItem(ownerKey) === user.id &&
            localStorage.getItem(enabledKey(user.id)) === 'true' ? user.id : null;
          if (enabledUser) void resume().catch(reportError);
          else setStatus('Cloud-Synchronisierung für dieses Konto nicht aktiviert');
        }).catch(error => { if (generation === authGeneration) { enabledUser = null; statusError('Anmeldung konnte nicht geprüft werden', error); } });
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
        if (disposed || b.disabled) return;
        for (const item of actions.querySelectorAll('button')) item.disabled = true;
        try { assertActive(); await handler(); } catch (error) {
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
      assertActive();
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      assertActive();
      if (!data || !data.user || !data.user.id) throw new Error('Bitte zuerst anmelden');
    }
    button('Cloud-Status anzeigen', async () => {
      await authenticated();
      const user = await currentUser();
      const owner = localStorage.getItem(ownerKey);
      requireUser(user);
      if (owner && owner !== user.id) throw new Error('Lokale Daten gehören zu einem anderen Konto');
      const result = await store.load();
      lastCloudSource = result.source;
      if (localStorage.getItem(ownerKey) !== owner) throw new Error('Kontozuordnung während Statusabfrage gewechselt');
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Statusabfrage gewechselt');
      const local = localData();
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während Statusanzeige gewechselt');
      setStatus('Cloud: ' + result.source + ' · Lokal: ' +
        (local ? local[collection].length + ' Einträge' : 'keine Daten') +
        (await store.hasPending() ? ' · Synchronisierung ausstehend' : ''));
    });
    button('Lokale Daten in Supabase übernehmen', async () => {
      beginOperation('upload');
      migrationInProgress = true;
      try {
      await authenticated();
      ensureOnline();
      const local = localData();
      if (!local) throw new Error('Keine gültigen lokalen Daten vorhanden');
      const originalBytes = safeLocalBytes();
      const owner = localStorage.getItem(ownerKey);
      const user = await currentUser();
      if (!user || !user.id) throw new Error('Anmeldung während Datenübernahme verloren');
      if (owner && owner !== user.id) throw new Error('Lokale Daten sind einem anderen Benutzer zugeordnet');
      ensureNoPending(await store.hasPending());
      const cloud = await store.load();
      if (cloud.source !== 'cloud-empty') { lastConflictMessage = 'Cloud enthält bereits Daten'; throw new Error('Cloud enthält Daten oder ist nicht eindeutig erreichbar; Übernahme blockiert'); }
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während Cloud-Prüfung gewechselt');
      if (!confirm('Lokale ' + local[collection].length + ' Einträge einmalig in die leere Supabase-Cloud übertragen? Lokale Daten bleiben erhalten.')) return;
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Bestätigung gewechselt');
      ensureLocalUnchanged(originalBytes);
      ensureOwnerUnchanged(owner);
      const result = await store.save(local);
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Übertragung gewechselt');
      if (result) ensureLocalUnchanged(originalBytes);
      if (result && !navigator.onLine) throw new Error('Verbindung nach Übertragung verloren; bitte Cloud-Status prüfen');
      if (result) await enable();
      status.textContent = result ? 'Daten übertragen · weitere Änderungen werden synchronisiert.' : 'Übertragung ausstehend.';
      } finally { migrationInProgress = false; endOperation('upload'); }
    });
    button('Cloud-Daten lokal übernehmen', async () => {
      beginOperation('import');
      importInProgress = true;
      try {
      await authenticated();
      ensureOnline();
      if (localStorage.getItem(localKey) !== null) throw new Error('Lokale Daten vorhanden; automatisches Überschreiben ist gesperrt');
      const owner = localStorage.getItem(ownerKey);
      const user = await currentUser();
      if (!user || !user.id) throw new Error('Anmeldung während Cloud-Laden verloren');
      if (owner && owner !== user.id) throw new Error('Lokaler Speicher gehört einem anderen Konto');
      ensureNoPending(await store.hasPending());
      const result = await store.load();
      if (result.source !== 'cloud') { lastCloudSource = result.source; throw new Error('Keine eindeutig abrufbaren Cloud-Daten'); }
      if (!navigator.onLine) throw new Error('Verbindung beim Cloud-Laden verloren');
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während Cloud-Abfrage gewechselt');
      ensureCollection(result.data);
      if (!confirm(result.data[collection].length + ' Cloud-Einträge in den bisher leeren lokalen Speicher laden?')) return;
      // Recheck before writing: never replace local data added while awaiting confirmation.
      if (localStorage.getItem(localKey) !== null) throw new Error('Lokale Daten wurden inzwischen angelegt');
      if (!await isEnabled() && enabledUser !== null) throw new Error('Cloud-Zuordnung während Übernahme geändert');
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Bestätigung gewechselt');
      ensureOwnerUnchanged(owner);
      if (await store.hasPending()) throw new Error('Neue lokale Änderungen erkannt; Cloud-Übernahme abgebrochen');
      ensureOnline();
      localStorage.setItem(localKey, JSON.stringify(result.data));
      await enable();
      if ((await currentUser())?.id !== user.id) throw new Error('Konto nach Übernahme gewechselt');
      status.textContent = 'Cloud-Daten lokal geladen. Seite wird aktualisiert.';
      if (typeof refresh === 'function') { try { refresh(); } catch (error) { status.textContent = 'Daten übernommen, Anzeige konnte nicht aktualisiert werden: ' + error.message; } }
      } finally { importInProgress = false; endOperation('import'); }
    });
    button('Offline-Änderungen abgleichen', async () => {
      beginOperation('reconcile');
      try {
      if (!await isEnabled()) throw new Error('Cloud-Synchronisierung ist nicht aktiviert');
      const user = await currentUser();
      assertOwner(user && user.id);
      await queue.catch(() => {});
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während des Abgleichs gewechselt');
      ensureOnline();
      const result = await store.reconcilePending();
      assertOwner(user.id);
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während des Abgleichs gewechselt');
      if (result.status === 'conflict') {
        lastConflictMessage = 'Offline-Änderungen stehen im Konflikt mit Cloud-Daten';
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
      } finally { endOperation('reconcile'); }
    });
    button('Ausstehende Änderungen synchronisieren', async () => {
      beginOperation('flush');
      try {
      if (!await isEnabled()) throw new Error('Cloud-Synchronisierung zuerst durch bestätigte Übernahme aktivieren');
      await queue.catch(() => {});
      const user = await currentUser();
      assertOwner(user && user.id);
      if (!await isEnabled()) throw new Error('Cloud-Synchronisierung während des Vorgangs deaktiviert');
      assertActive();
      ensureOnline();
      const done = await store.flush();
      ensureOwner(user.id);
      if ((await currentUser())?.id !== user.id) throw new Error('Konto während der Synchronisierung gewechselt');
      if (done) lastConflictMessage = null;
      setStatus(done ? 'Synchronisierung abgeschlossen' : 'Keine Übertragung möglich oder erforderlich');
      } finally { endOperation('flush'); }
    });
    void guardAccount().catch(error => { status.textContent = 'Kontoprüfung fehlgeschlagen: ' + error.message; });
    void currentUser().then(user => {
      if (disposed) return;
      if (user && isOwner(user.id) &&
          localStorage.getItem(enabledKey(user.id)) === 'true') {
        enabledUser = user.id;
        void resume().catch(error => { status.textContent = 'Cloud-Wiederaufnahme fehlgeschlagen: ' + error.message; });
      }
    }).catch(error => statusError('Cloud-Start fehlgeschlagen', error));
    host.append(title, status, actions);
    (target || document.body).prepend(host);
    function dispose() {
      if (disposed) return;
      disposed = true;
      lastCloudSource = null;
      enabledUser = null;
      accountGeneration++;
      authGeneration++;
      lastAccountChangeAt = now();
      lastAuthStateAt = now();
      accountSwitchInProgress = false;
      activeOperation = null;
      reconnectInProgress = false;
      global.removeEventListener('online', onOnline);
      global.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      if (authSubscription && authSubscription.data && authSubscription.data.subscription) authSubscription.data.subscription.unsubscribe();
      if (blocked) { blocked.remove(); blocked = null; }
      queue = Promise.resolve(false);
      store.dispose();
      host.remove();
    }
    return { store, host, changed, resume, refreshFromCloud, dispose, getStatus: () => ({ disposed, enabledUser, activeOperation, lastSyncError, lastConflictMessage, lastCloudSource, accountSwitchInProgress, statusGeneration, lastRefreshAt, lastReconnectAt, lastLocalChangeAt, lastAccountChangeAt, lastAuthCheckAt, lastPendingCheckAt, lastStatusErrorAt, lastUploadAt, lastImportAt, lastGuardAt, lastGuardMismatch, lastEnableAt, lastRefreshSkippedAt, lastOperationStartedAt, lastOperationEndedAt, lastOwnerAtStatus, lastAuthStateAt, refreshAttempts, refreshApplied, reconnectAttempts, reconnectSuccesses, store: store.status() }) };
  }
  global.HelferleinCloudMigration = Object.freeze({ mount });
})(window);

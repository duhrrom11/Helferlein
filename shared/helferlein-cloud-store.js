/* Helferlein cloud persistence: opt-in adapter for supported tools.
 * Legacy local data is never uploaded automatically.
 */
(function (global) {
  'use strict';
  function createStore(client, tool) {
    if (!client || !client.auth || typeof client.auth.getUser !== 'function' || typeof client.from !== 'function' || !/^[a-z0-9_-]{1,80}$/i.test(tool)) throw new Error('Invalid cloud store configuration');
    const prefix = 'helferlein_cloud_' + tool + '_';
    let flushing = null;
    let saving = null;
    let operationOwner = null;
    let closed = false;
    let stateVersion = 0;
    let lastError = null;
    let lastSuccessfulSync = null;
    let lastCloudRead = null;
    let lastConflict = null;
    let lastPendingAt = null;
    let lastAckAt = null;
    let lastConflictAt = null;
    let lastSaveAt = null;
    let lastReconcileAt = null;
    let lastUserCheckAt = null;
    let lastUserId = null;
    let failedReads = 0;
    let failedWrites = 0;
    const snapshot = data => JSON.parse(JSON.stringify(data));
    const now = () => new Date().toISOString();
    const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
    const clone = value => snapshot(value);
    const payloadBytes = value => JSON.stringify(value);
    const validRevision = value => value === null || (typeof value === 'string' && value.length > 0);
    const isValidUid = uid => typeof uid === 'string' && /^[a-z0-9-]{1,100}$/i.test(uid);
    const raw = key => localStorage.getItem(key);
    const has = key => raw(key) !== null;
    const ensureUnchanged = (key, bytes, reason) => { if (raw(key) !== bytes) { rememberConflict(reason); throw new Error('Local synchronization state changed: ' + reason); } };
    const readBytes = k => ({ pending: raw(k.pending), base: raw(k.base), revision: raw(k.revision) });
    const isConnected = () => typeof navigator !== 'undefined' && navigator.onLine;
    const rememberConflict = reason => { lastConflictAt = now(); lastConflict = { reason, at: lastConflictAt }; };
    const assertOpen = () => { if (closed) throw new Error('Cloud store is closed'); };
    const assertOnline = () => { if (!isConnected()) throw new Error('Offline; cloud write deferred'); };
    const ensureOwner = uid => { if (lastUserId && lastUserId !== uid) throw new Error('Account switched during cloud operation'); };
    const read = key => {
      assertOpen();
      const value = raw(key);
      if (value === null) return null;
      try { return JSON.parse(value); } catch (_) { rememberConflict('invalid-local-json'); throw new Error('Stored synchronization metadata is not valid JSON: ' + key); }
    };
    const write = (key, value) => { assertOpen(); localStorage.setItem(key, JSON.stringify(value)); stateVersion++; };
    const remove = key => { assertOpen(); localStorage.removeItem(key); stateVersion++; };
    const writePending = (k, value) => { write(k.pending, value); lastPendingAt = now(); };
    async function userId() {
      assertOpen();
      const { data, error } = await client.auth.getUser();
      if (error) { lastError = error; throw error; }
      assertOpen();
      lastUserCheckAt = now();
      lastUserId = data && data.user && typeof data.user.id === 'string' ? data.user.id : null;
      return lastUserId;
    }
    function keys(uid) {
      assertOpen();
      if (!isValidUid(uid)) throw new Error('Invalid user identity');
      return { cache: prefix + uid + '_cache', pending: prefix + uid + '_pending',
        revision: prefix + uid + '_revision', base: prefix + uid + '_base' };
    }
    async function fetchCloud(uid) {
      assertOpen();
      if (!uid) throw new Error('Missing cloud user');
      assertOnline();
      const { data, error } = await client.from('user_data')
        .select('id,data,updated_at').eq('user_id', uid).eq('tool', tool)
        .order('updated_at', { ascending: false }).limit(2);
      if (error) { lastError = error; failedReads++; throw error; }
      assertOpen();
      lastCloudRead = now();
      if (!Array.isArray(data)) { failedReads++; rememberConflict('invalid-cloud-response'); throw new Error('Invalid cloud response'); }
      if (data.length > 1) { failedReads++; rememberConflict('duplicate-cloud-rows'); throw new Error('Multiple cloud records found; manual resolution required'); }
      const row = data[0] || null;
      if (row && !isRecord(row)) { failedReads++; rememberConflict('invalid-cloud-row'); throw new Error('Invalid cloud record'); }
      if (row && (!row.id || typeof row.updated_at !== 'string' || !row.updated_at)) { failedReads++; rememberConflict('invalid-cloud-identity'); throw new Error('Invalid cloud record identity'); }
      if (row && !isRecord(row.data)) { failedReads++; rememberConflict('invalid-cloud-payload'); throw new Error('Invalid cloud payload'); }
      if (await userId() !== uid) { rememberConflict('cloud-read-account-change'); throw new Error('Account changed during cloud request'); }
      return row;
    }
    async function load() {
      assertOpen();
      const uid = await userId();
      if (!uid) return { data: null, source: 'signed-out' };
      ensureOwner(uid);
      if (flushing && operationOwner !== uid) { rememberConflict('other-account-flushing'); throw new Error('Another account has an active sync'); }
      const generation = stateVersion;
      const pendingAtStart = has(keys(uid).pending);
      const initialPendingBytes = raw(keys(uid).pending);
      const k = keys(uid);
      const pending = read(k.pending);
      if (pendingAtStart !== has(k.pending)) throw new Error('Pending state changed before load');
      if (localStorage.getItem(k.pending) !== null && (!pending || typeof pending !== 'object' || Array.isArray(pending))) throw new Error('Invalid pending payload');
      if (localStorage.getItem(k.pending) !== null) {
        if (!pendingAtStart) throw new Error('Pending state changed during load');
        if (flushing && operationOwner !== uid) throw new Error('Different account syncing');
        if (await userId() !== uid) throw new Error('Account changed during pending load');
        assertOpen();
        ensureUnchanged(k.pending, initialPendingBytes, 'pending-load-race');
        return { data: clone(pending), source: 'pending' };
      }
      if (!isConnected()) {
        if (flushing && operationOwner !== uid) throw new Error('Different account syncing');
        if (await userId() !== uid) throw new Error('Account changed during offline load');
        if (generation !== stateVersion) throw new Error('Local state changed during offline load');
        assertOpen();
        const cached = read(k.cache);
        if (cached !== null && !isRecord(cached)) throw new Error('Invalid offline cache');
        if (has(k.pending)) { rememberConflict('offline-read-race'); throw new Error('Pending changes appeared during offline read'); }
        return { data: cached === null ? null : clone(cached), source: 'offline' };
      }
      try {
        const row = await fetchCloud(uid);
        if (await userId() !== uid) throw new Error('Account changed during cloud load');
        if (generation !== stateVersion) { rememberConflict('cloud-load-race'); throw new Error('Local synchronization state changed during cloud load'); }
        if (has(k.pending)) { rememberConflict('pending-during-read'); throw new Error('Pending changes appeared during cloud read'); }
        write(k.cache, row ? clone(row.data) : null);
        write(k.revision, row ? row.updated_at : null);
        lastError = null;
        lastConflict = null;
        return { data: row ? clone(row.data) : null, source: row ? 'cloud' : 'cloud-empty' };
      } catch (error) {
        if (await userId() !== uid) throw new Error('Account changed during cloud load');
        if (has(k.pending)) throw error;
        if (generation !== stateVersion) throw error;
        failedReads++;
        assertOpen();
        const cached = read(k.cache);
        if (cached !== null && !isRecord(cached)) throw new Error('Invalid offline cache');
        lastError = error;
        return { data: cached === null ? null : clone(cached), source: 'offline-error', error };
      }
    }
    async function flush() {
      assertOpen();
      const uid = await userId();
      if (!uid) throw new Error('Sign in required');
      ensureOwner(uid);
      if (flushing) {
        if (operationOwner !== uid) throw new Error('Different account has an active sync');
        assertOpen();
        return flushing;
      }
      operationOwner = uid;
      flushing = performFlush(uid).catch(error => { lastError = error; failedWrites++; throw error; });
      try { return await flushing; } finally { flushing = null; operationOwner = null; }
    }
    function canonical(value) {
      if (Array.isArray(value)) return value.map(canonical);
      if (value && typeof value === 'object') return Object.keys(value).sort().reduce((out, key) => { out[key] = canonical(value[key]); return out; }, {});
      return value;
    }
    function sameData(a, b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
    function assertPending(k, expected) { ensureUnchanged(k.pending, expected, 'pending-changed'); }
    function assertBase(k, expected) { ensureUnchanged(k.base, expected, 'baseline-changed'); }
    function finishAcknowledged(k, pending, revision) {
      if (typeof revision !== 'string' || !revision) throw new Error('Missing acknowledgement revision');
      if (!isRecord(pending)) throw new Error('Cannot acknowledge invalid pending data');
      if (!validRevision(revision)) throw new Error('Invalid acknowledgement revision');
      assertOpen();
      write(k.revision, revision);
      write(k.cache, clone(pending));
      lastAckAt = now();
      if (localStorage.getItem(k.pending) === payloadBytes(pending)) {
        remove(k.pending);
        remove(k.base);
      } else {
        write(k.base, { revision });
      }
    }
    async function performFlush(expectedUid) {
      assertOpen();
      const uid = await userId();
      if (!uid || uid !== expectedUid) throw new Error('Account changed before flush');
      const k = keys(uid);
      const pending = read(k.pending);
      if (localStorage.getItem(k.pending) === null || !isConnected()) return false;
      const initialState = readBytes(k);
      assertOpen();
      if (saving && operationOwner && operationOwner !== uid) throw new Error('Account sync conflict');
      const pendingBytes = initialState.pending;
      if (pendingBytes === null) return false;
      const baseBytes = initialState.base;
      if (!isRecord(pending)) throw new Error('Invalid pending data; upload blocked');
      const base = read(k.base);
      if (!isRecord(base)) {
        throw new Error('Missing sync baseline; manual reconciliation required');
      }
      if (base.unresolved) { rememberConflict('unresolved-baseline'); throw new Error('Cloud baseline unknown; local edits retained for manual reconciliation'); }
      if (!('revision' in base)) { rememberConflict('missing-revision'); throw new Error('Missing sync revision; local edits preserved'); }
      if (!validRevision(base.revision)) throw new Error('Invalid sync revision');
      if (base.revision === '') throw new Error('Empty sync revision');
      if (typeof base.unresolved !== 'undefined' && base.unresolved !== false) throw new Error('Unexpected baseline state');
      assertPending(k, pendingBytes);
      const row = await fetchCloud(uid);
      if (await userId() !== uid) throw new Error('Account changed during sync; pending data preserved');
      if (localStorage.getItem(k.pending) !== pendingBytes) { rememberConflict('pending-race'); return false; }
      if (raw(k.base) !== baseBytes) { rememberConflict('baseline-race'); return false; }
      assertOpen();
      if ((row ? row.updated_at : null) !== base.revision) {
        rememberConflict('remote-revision-changed');
        // An earlier request may have reached Supabase before the browser lost
        // its response. An exact match is safe to acknowledge without writing.
        if (row && sameData(row.data, pending)) {
          lastConflict = null;
          if (await userId() !== uid) throw new Error('Account changed before acknowledging remote write');
          if (localStorage.getItem(k.pending) !== pendingBytes) return false;
          assertBase(k, baseBytes);
          finishAcknowledged(k, pending, row.updated_at);
          return true;
        }
        rememberConflict('remote-conflict');
        throw new Error('Cloud changed since last sync; pending data preserved');
      }
      if (row && !row.updated_at) { rememberConflict('missing-remote-revision'); throw new Error('Cloud revision unavailable'); }
      assertBase(k, baseBytes);
      if (!isConnected()) return false;
      if (raw(k.base) !== baseBytes) { rememberConflict('baseline-race'); return false; }
      if (row) {
        if (await userId() !== uid) throw new Error('Account changed before cloud update');
        if (localStorage.getItem(k.pending) !== pendingBytes) { rememberConflict('pending-edited-before-write'); return false; }
        const { data, error } = await client.from('user_data')
          .update({ data: pending, updated_at: new Date().toISOString() })
          .eq('id', row.id).eq('user_id', uid).eq('tool', tool).eq('updated_at', row.updated_at)
          .select('id,updated_at');
        if (error) { lastError = error; failedWrites++; throw error; }
        if (raw(k.pending) !== pendingBytes) rememberConflict('edit-during-update');
        if (!Array.isArray(data) || data.length !== 1 || data[0].id !== row.id || typeof data[0].updated_at !== 'string' || !data[0].updated_at) throw new Error('Concurrent cloud change; pending data preserved');
        if (await userId() !== uid) throw new Error('Account changed after cloud update');
        write(k.revision, data[0].updated_at);
      } else {
        if (await userId() !== uid) throw new Error('Account changed before cloud insert');
        if (localStorage.getItem(k.pending) !== pendingBytes) return false;
        const { data, error } = await client.from('user_data')
          .insert({ user_id: uid, tool, data: pending }).select('id,updated_at');
        if (error) { lastError = error; throw error; }
        if (raw(k.pending) !== pendingBytes) rememberConflict('edit-during-insert');
        if (!Array.isArray(data) || data.length !== 1 || !data[0].id || typeof data[0].updated_at !== 'string' || !data[0].updated_at) throw new Error('Cloud insert not confirmed; pending data preserved');
        if (await userId() !== uid) throw new Error('Account changed after cloud insert');
        write(k.revision, data[0].updated_at);
      }
      if (await userId() !== uid) { rememberConflict('post-write-account-change'); throw new Error('Account changed after sync; pending data preserved'); }
      if (raw(k.revision) === initialState.revision && initialState.revision !== null) throw new Error('Cloud revision was not advanced');
      assertOpen();
      if (localStorage.getItem(k.pending) === null) { rememberConflict('pending-removed'); throw new Error('Pending data unexpectedly removed'); }
      assertBase(k, baseBytes);
      // A newer local edit may have arrived while the request was in flight.
      // Keep it queued with the new server revision rather than deleting it.
      finishAcknowledged(k, pending, read(k.revision));
      lastSuccessfulSync = now();
      lastConflict = null;
      failedWrites = 0;
      lastError = null;
      return true;
    }
    async function save(data) {
      assertOpen();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid local data payload');
      if (typeof navigator === 'undefined') throw new Error('Browser connection state unavailable');
      if (!isRecord(data)) throw new Error('Expected record data');
      if (Object.keys(data).length === 0) throw new Error('Empty payload requires explicit migration');
      if (Object.getPrototypeOf(data) !== Object.prototype && Object.getPrototypeOf(data) !== null) throw new Error('Unsupported data prototype');
      // Serialize local writes as well as uploads, preserving each baseline.
      const previous = saving || Promise.resolve();
      const expectedUid = await userId();
      if (!expectedUid) throw new Error('Sign in required');
      ensureOwner(expectedUid);
      const immutable = snapshot(data);
      lastSaveAt = now();
      if (JSON.stringify(immutable) !== JSON.stringify(data)) throw new Error('Unsupported non-JSON payload');
      if (!isRecord(immutable)) throw new Error('Invalid serialized payload');
      const next = previous.catch(() => {}).then(() => performSave(immutable, expectedUid));
      saving = next;
      try { return await next; } finally { if (saving === next) saving = null; }
    }
    async function performSave(data, expectedUid) {
      assertOpen();
      const uid = await userId();
      if (!uid || uid !== expectedUid) { rememberConflict('queued-save-account-change'); throw new Error('Account changed before queued save'); }
      if (flushing && operationOwner !== uid) throw new Error('Different account has an active upload');
      const k = keys(uid);
      if (flushing && operationOwner !== uid) throw new Error('Different account syncing');
      if (closed) throw new Error('Store closed before local save');
      if (localStorage.getItem(k.pending) === null) {
        // Record the local edit even when the first baseline cannot be fetched.
        // It must NOT be uploaded until the baseline is known and reconciled.
        if (localStorage.getItem(k.revision) === null) {
          if (isConnected()) {
            try {
              const row = await fetchCloud(uid);
              if (await userId() !== uid) throw new Error('Account changed while preparing save');
              write(k.cache, row ? clone(row.data) : null);
              write(k.revision, row ? row.updated_at : null);
            } catch (error) {
              if (await userId() !== uid) throw error;
              write(k.base, { unresolved: true });
              writePending(k, data);
              return false;
            }
          } else {
            write(k.base, { unresolved: true });
            writePending(k, data);
            return false;
          }
        }
        write(k.base, { revision: read(k.revision) });
      }
      if (await userId() !== uid) throw new Error('Account changed before local pending write');
      if (flushing && operationOwner !== uid) throw new Error('Account changed during upload');
      writePending(k, data);
      if (!isConnected()) return false;
      if (await userId() !== uid) { rememberConflict('pending-save-account-change'); throw new Error('Account changed after pending save'); }
      // Wait for an in-flight upload, then send the latest queued snapshot.
      // Otherwise a second edit could remain pending indefinitely while online.
      if (flushing) {
        try { await flushing; } catch (error) { lastError = error; return false; }
        if (await userId() !== uid) return false;
      }
      return flush();
    }
    async function reconcilePending() {
      assertOpen();
      // Explicit user action only. Never guess which conflicting version wins.
      const uid = await userId();
      if (!uid) throw new Error('Sign in required');
      ensureOwner(uid);
      if (flushing && operationOwner !== uid) throw new Error('Another account syncing');
      assertOnline();
      const k = keys(uid);
      if (localStorage.getItem(k.pending) === null) {
        if (await userId() !== uid) throw new Error('Account changed during pending inspection');
        return { status: 'nothing-pending' };
      }
      const base = read(k.base);
      if (!base || !base.unresolved) {
        if (await userId() !== uid) throw new Error('Account changed during baseline inspection');
        return { status: 'baseline-known' };
      }
      if (flushing) throw new Error('Sync already in progress');
      const pending = read(k.pending);
      if (!pending || typeof pending !== 'object' || Array.isArray(pending)) throw new Error('Invalid pending data');
      const row = await fetchCloud(uid);
      lastReconcileAt = now();
      if (await userId() !== uid) throw new Error('Account changed during reconciliation');
      assertOnline();
      if (row && sameData(row.data, pending)) {
        assertPending(k, JSON.stringify(pending));
        if (await userId() !== uid) throw new Error('Account changed during acknowledgement');
        finishAcknowledged(k, pending, row.updated_at);
        lastSuccessfulSync = new Date().toISOString();
        return { status: 'already-synced' };
      }
      if (row) {
        rememberConflict('reconciliation-remote-exists');
        if (localStorage.getItem(k.pending) !== JSON.stringify(pending)) throw new Error('Pending data changed during conflict detection');
        return { status: 'conflict' };
      }
      if (localStorage.getItem(k.base) !== JSON.stringify(base)) throw new Error('Baseline changed during reconciliation');
      // Empty cloud is confirmed now. A later concurrent insert is still
      // guarded by the existing fetch/compare path in performFlush().
      assertPending(k, JSON.stringify(pending));
      if (await userId() !== uid) throw new Error('Account changed before reconciliation commit');
      assertOpen();
      assertOnline();
      write(k.base, { revision: null });
      lastConflict = null;
      return { status: 'ready' };
    }
    async function hasPending() {
      assertOpen();
      const uid = await userId();
      if (!uid) return false;
      ensureOwner(uid);
      if (flushing && operationOwner !== uid) throw new Error('Another account syncing');
      const exists = localStorage.getItem(keys(uid).pending) !== null;
      if (await userId() !== uid) throw new Error('Account changed during pending check');
      assertOpen();
      return exists;
    }
    function dispose() { closed = true; stateVersion++; lastError = null; lastUserId = null; }
    async function inspect() { assertOpen(); const uid = await userId(); if (!uid) return { signedOut: true }; const k = keys(uid); return { signedOut: false, pending: has(k.pending), cache: has(k.cache), baseline: has(k.base), revision: read(k.revision), lastConflict }; }
    function status() { return { closed, syncing: !!flushing, saving: !!saving, operationOwner, stateVersion, lastCloudRead, lastSuccessfulSync, lastPendingAt, lastAckAt, lastSaveAt, lastReconcileAt, lastUserCheckAt, failedReads, failedWrites, lastConflict, lastError: lastError ? String(lastError.message || lastError) : null }; }
    return { load, save, flush, hasPending, reconcilePending, inspect, dispose, status };
  }
  global.HelferleinCloudStore = { createStore };
})(window);

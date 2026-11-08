/* Helferlein cloud persistence: opt-in adapter for two tools.
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
    const snapshot = data => JSON.parse(JSON.stringify(data));
    const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
    const validRevision = value => value === null || (typeof value === 'string' && value.length > 0);
    const raw = key => localStorage.getItem(key);
    const isConnected = () => typeof navigator !== 'undefined' && navigator.onLine;
    const assertOpen = () => { if (closed) throw new Error('Cloud store is closed'); };
    const assertOnline = () => { if (!isConnected()) throw new Error('Offline; cloud write deferred'); };
    const read = key => {
      assertOpen();
      const value = raw(key);
      if (value === null) return null;
      try { return JSON.parse(value); } catch (_) { throw new Error('Stored synchronization metadata is not valid JSON: ' + key); }
    };
    const write = (key, value) => { assertOpen(); localStorage.setItem(key, JSON.stringify(value)); stateVersion++; };
    const remove = key => { assertOpen(); localStorage.removeItem(key); stateVersion++; };
    async function userId() {
      assertOpen();
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      assertOpen();
      return data && data.user && typeof data.user.id === 'string' ? data.user.id : null;
    }
    function keys(uid) {
      assertOpen();
      if (!/^[a-z0-9-]{1,100}$/i.test(uid)) throw new Error('Invalid user identity');
      return { cache: prefix + uid + '_cache', pending: prefix + uid + '_pending',
        revision: prefix + uid + '_revision', base: prefix + uid + '_base' };
    }
    async function fetchCloud(uid) {
      assertOpen();
      if (!uid) throw new Error('Missing cloud user');
      const { data, error } = await client.from('user_data')
        .select('id,data,updated_at').eq('user_id', uid).eq('tool', tool)
        .order('updated_at', { ascending: false }).limit(2);
      if (error) { lastError = error; throw error; }
      assertOpen();
      lastCloudRead = new Date().toISOString();
      if (!Array.isArray(data)) throw new Error('Invalid cloud response');
      if (data.length > 1) throw new Error('Multiple cloud records found; manual resolution required');
      const row = data[0] || null;
      if (row && (typeof row !== 'object' || Array.isArray(row))) throw new Error('Invalid cloud record');
      if (row && (!row.id || typeof row.updated_at !== 'string' || !row.updated_at)) throw new Error('Invalid cloud record identity');
      if (row && !isRecord(row.data)) throw new Error('Invalid cloud payload');
      if (row && row.data === null) throw new Error('Null cloud payload');
      return row;
    }
    async function load() {
      assertOpen();
      const uid = await userId();
      if (!uid) return { data: null, source: 'signed-out' };
      if (flushing && operationOwner !== uid) throw new Error('Another account has an active sync');
      const generation = stateVersion;
      const k = keys(uid);
      const pending = read(k.pending);
      if (localStorage.getItem(k.pending) !== null && (!pending || typeof pending !== 'object' || Array.isArray(pending))) throw new Error('Invalid pending payload');
      if (localStorage.getItem(k.pending) !== null) {
        if (flushing && operationOwner !== uid) throw new Error('Different account syncing');
        if (await userId() !== uid) throw new Error('Account changed during pending load');
        return { data: pending, source: 'pending' };
      }
      if (!isConnected()) {
        if (flushing && operationOwner !== uid) throw new Error('Different account syncing');
        if (await userId() !== uid) throw new Error('Account changed during offline load');
        assertOpen();
        const cached = read(k.cache);
        if (cached !== null && (typeof cached !== 'object' || Array.isArray(cached))) throw new Error('Invalid offline cache');
        return { data: cached, source: 'offline' };
      }
      try {
        const row = await fetchCloud(uid);
        if (await userId() !== uid) throw new Error('Account changed during cloud load');
        if (generation !== stateVersion) throw new Error('Local synchronization state changed during cloud load');
        write(k.cache, row ? row.data : null);
        write(k.revision, row ? row.updated_at : null);
        lastError = null;
        return { data: row ? row.data : null, source: row ? 'cloud' : 'cloud-empty' };
      } catch (error) {
        if (await userId() !== uid) throw new Error('Account changed during cloud load');
        assertOpen();
        const cached = read(k.cache);
        if (cached !== null && (typeof cached !== 'object' || Array.isArray(cached))) throw new Error('Invalid offline cache');
        return { data: cached, source: 'offline-error', error };
      }
    }
    async function flush() {
      assertOpen();
      const uid = await userId();
      if (!uid) throw new Error('Sign in required');
      if (flushing) {
        if (operationOwner !== uid) throw new Error('Different account has an active sync');
        return flushing;
      }
      operationOwner = uid;
      flushing = performFlush(uid);
      try { return await flushing; } finally { flushing = null; operationOwner = null; }
    }
    function canonical(value) {
      if (Array.isArray(value)) return value.map(canonical);
      if (value && typeof value === 'object') return Object.keys(value).sort().reduce((out, key) => { out[key] = canonical(value[key]); return out; }, {});
      return value;
    }
    function sameData(a, b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
    function assertPending(k, expected) { if (raw(k.pending) !== expected) throw new Error('Pending data changed during cloud operation'); }
    function assertBase(k, expected) { if (raw(k.base) !== expected) throw new Error('Sync baseline changed during cloud operation'); }
    function finishAcknowledged(k, pending, revision) {
      if (typeof revision !== 'string' || !revision) throw new Error('Missing acknowledgement revision');
      assertOpen();
      write(k.revision, revision);
      write(k.cache, pending);
      if (localStorage.getItem(k.pending) === JSON.stringify(pending)) {
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
      if (saving && operationOwner && operationOwner !== uid) throw new Error('Account sync conflict');
      const pendingBytes = raw(k.pending);
      const baseBytes = raw(k.base);
      if (!pending || typeof pending !== 'object' || Array.isArray(pending)) throw new Error('Invalid pending data; upload blocked');
      const base = read(k.base);
      if (!isRecord(base)) {
        throw new Error('Missing sync baseline; manual reconciliation required');
      }
      if (base.unresolved) throw new Error('Cloud baseline unknown; local edits retained for manual reconciliation');
      if (!('revision' in base)) throw new Error('Missing sync revision; local edits preserved');
      if (!validRevision(base.revision)) throw new Error('Invalid sync revision');
      if (base.revision === '') throw new Error('Empty sync revision');
      assertPending(k, pendingBytes);
      const row = await fetchCloud(uid);
      if (await userId() !== uid) throw new Error('Account changed during sync; pending data preserved');
      if (localStorage.getItem(k.pending) !== pendingBytes) return false;
      assertOpen();
      if ((row ? row.updated_at : null) !== base.revision) {
        // An earlier request may have reached Supabase before the browser lost
        // its response. An exact match is safe to acknowledge without writing.
        if (row && sameData(row.data, pending)) {
          if (await userId() !== uid) throw new Error('Account changed before acknowledging remote write');
          if (localStorage.getItem(k.pending) !== pendingBytes) return false;
          finishAcknowledged(k, pending, row.updated_at);
          return true;
        }
        throw new Error('Cloud changed since last sync; pending data preserved');
      }
      if (row && !row.updated_at) throw new Error('Cloud revision unavailable');
      assertBase(k, baseBytes);
      if (!isConnected()) return false;
      if (raw(k.base) !== baseBytes) return false;
      if (row) {
        if (await userId() !== uid) throw new Error('Account changed before cloud update');
        if (localStorage.getItem(k.pending) !== pendingBytes) return false;
        const { data, error } = await client.from('user_data')
          .update({ data: pending, updated_at: new Date().toISOString() })
          .eq('id', row.id).eq('user_id', uid).eq('tool', tool).eq('updated_at', row.updated_at)
          .select('id,updated_at');
        if (error) { lastError = error; throw error; }
        if (!Array.isArray(data) || data.length !== 1 || data[0].id !== row.id || typeof data[0].updated_at !== 'string' || !data[0].updated_at) throw new Error('Concurrent cloud change; pending data preserved');
        if (await userId() !== uid) throw new Error('Account changed after cloud update');
        write(k.revision, data[0].updated_at);
      } else {
        if (await userId() !== uid) throw new Error('Account changed before cloud insert');
        if (localStorage.getItem(k.pending) !== pendingBytes) return false;
        const { data, error } = await client.from('user_data')
          .insert({ user_id: uid, tool, data: pending }).select('id,updated_at');
        if (error) { lastError = error; throw error; }
        if (!Array.isArray(data) || data.length !== 1 || !data[0].id || typeof data[0].updated_at !== 'string' || !data[0].updated_at) throw new Error('Cloud insert not confirmed; pending data preserved');
        if (await userId() !== uid) throw new Error('Account changed after cloud insert');
        write(k.revision, data[0].updated_at);
      }
      if (await userId() !== uid) throw new Error('Account changed after sync; pending data preserved');
      assertOpen();
      if (localStorage.getItem(k.pending) === null) throw new Error('Pending data unexpectedly removed');
      assertBase(k, baseBytes);
      // A newer local edit may have arrived while the request was in flight.
      // Keep it queued with the new server revision rather than deleting it.
      finishAcknowledged(k, pending, read(k.revision));
      lastSuccessfulSync = new Date().toISOString();
      lastError = null;
      return true;
    }
    async function save(data) {
      assertOpen();
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid local data payload');
      if (typeof navigator === 'undefined') throw new Error('Browser connection state unavailable');
      if (!isRecord(data)) throw new Error('Expected record data');
      // Serialize local writes as well as uploads, preserving each baseline.
      const previous = saving || Promise.resolve();
      const expectedUid = await userId();
      if (!expectedUid) throw new Error('Sign in required');
      const immutable = snapshot(data);
      if (!immutable || typeof immutable !== 'object' || Array.isArray(immutable)) throw new Error('Invalid serialized payload');
      const next = previous.catch(() => {}).then(() => performSave(immutable, expectedUid));
      saving = next;
      try { return await next; } finally { if (saving === next) saving = null; }
    }
    async function performSave(data, expectedUid) {
      assertOpen();
      const uid = await userId();
      if (!uid || uid !== expectedUid) throw new Error('Account changed before queued save');
      if (flushing && operationOwner !== uid) throw new Error('Different account has an active upload');
      const k = keys(uid);
      if (flushing && operationOwner !== uid) throw new Error('Different account syncing');
      if (localStorage.getItem(k.pending) === null) {
        // Record the local edit even when the first baseline cannot be fetched.
        // It must NOT be uploaded until the baseline is known and reconciled.
        if (localStorage.getItem(k.revision) === null) {
          if (isConnected()) {
            try {
              const row = await fetchCloud(uid);
              if (await userId() !== uid) throw new Error('Account changed while preparing save');
              write(k.cache, row ? row.data : null);
              write(k.revision, row ? row.updated_at : null);
            } catch (error) {
              if (await userId() !== uid) throw error;
              write(k.base, { unresolved: true });
              write(k.pending, data);
              return false;
            }
          } else {
            write(k.base, { unresolved: true });
            write(k.pending, data);
            return false;
          }
        }
        write(k.base, { revision: read(k.revision) });
      }
      if (await userId() !== uid) throw new Error('Account changed before local pending write');
      if (flushing && operationOwner !== uid) throw new Error('Account changed during upload');
      write(k.pending, data);
      if (!isConnected()) return false;
      if (await userId() !== uid) throw new Error('Account changed after pending save');
      // Wait for an in-flight upload, then send the latest queued snapshot.
      // Otherwise a second edit could remain pending indefinitely while online.
      if (flushing) {
        try { await flushing; } catch (_) { return false; }
        if (await userId() !== uid) return false;
      }
      return flush();
    }
    async function reconcilePending() {
      assertOpen();
      // Explicit user action only. Never guess which conflicting version wins.
      const uid = await userId();
      if (!uid) throw new Error('Sign in required');
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
      return { status: 'ready' };
    }
    async function hasPending() {
      assertOpen();
      const uid = await userId();
      if (!uid) return false;
      if (flushing && operationOwner !== uid) throw new Error('Another account syncing');
      const exists = localStorage.getItem(keys(uid).pending) !== null;
      if (await userId() !== uid) throw new Error('Account changed during pending check');
      assertOpen();
      return exists;
    }
    function dispose() { closed = true; stateVersion++; }
    function status() { return { closed, syncing: !!flushing, saving: !!saving, operationOwner, stateVersion, lastCloudRead, lastSuccessfulSync, lastError: lastError ? String(lastError.message || lastError) : null }; }
    return { load, save, flush, hasPending, reconcilePending, dispose, status };
  }
  global.HelferleinCloudStore = { createStore };
})(window);

/* Helferlein cloud persistence: draft adapter, not yet wired to live tools.
 * Legacy local data is never uploaded automatically.
 */
(function (global) {
  'use strict';
  function createStore(client, tool) {
    if (!client || !/^[a-z0-9_-]{1,80}$/i.test(tool)) throw new Error('Invalid cloud store configuration');
    const prefix = 'helferlein_cloud_' + tool + '_';
    let flushing = null;
    let saving = null;
    const read = key => {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    };
    const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    async function userId() {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      return data.user ? data.user.id : null;
    }
    function keys(uid) {
      return { cache: prefix + uid + '_cache', pending: prefix + uid + '_pending',
        revision: prefix + uid + '_revision', base: prefix + uid + '_base' };
    }
    async function fetchCloud(uid) {
      const { data, error } = await client.from('user_data')
        .select('id,data,updated_at').eq('user_id', uid).eq('tool', tool)
        .order('updated_at', { ascending: false }).limit(2);
      if (error) throw error;
      if (data.length > 1) throw new Error('Multiple cloud records found; manual resolution required');
      return data[0] || null;
    }
    async function load() {
      const uid = await userId();
      if (!uid) return { data: null, source: 'signed-out' };
      const k = keys(uid);
      const pending = read(k.pending);
      if (localStorage.getItem(k.pending) !== null) return { data: pending, source: 'pending' };
      if (!navigator.onLine) return { data: read(k.cache), source: 'offline' };
      try {
        const row = await fetchCloud(uid);
        if (await userId() !== uid) throw new Error('Account changed during cloud load');
        write(k.cache, row ? row.data : null);
        write(k.revision, row ? row.updated_at : null);
        return { data: row ? row.data : null, source: row ? 'cloud' : 'cloud-empty' };
      } catch (error) {
        return { data: read(k.cache), source: 'offline-error', error };
      }
    }
    async function flush() {
      if (flushing) return flushing;
      flushing = performFlush();
      try { return await flushing; } finally { flushing = null; }
    }
    function sameData(a, b) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    function finishAcknowledged(k, pending, revision) {
      write(k.revision, revision);
      write(k.cache, pending);
      if (localStorage.getItem(k.pending) === JSON.stringify(pending)) {
        localStorage.removeItem(k.pending);
        localStorage.removeItem(k.base);
      } else {
        write(k.base, { revision });
      }
    }
    async function performFlush() {
      const uid = await userId();
      if (!uid) throw new Error('Sign in required');
      const k = keys(uid);
      const pending = read(k.pending);
      if (localStorage.getItem(k.pending) === null || !navigator.onLine) return false;
      const base = read(k.base);
      if (base === null || typeof base !== 'object') {
        throw new Error('Missing sync baseline; manual reconciliation required');
      }
      if (base.unresolved) throw new Error('Cloud baseline unknown; local edits retained for manual reconciliation');
      if (!('revision' in base)) throw new Error('Missing sync revision; local edits preserved');
      const row = await fetchCloud(uid);
      if (await userId() !== uid) throw new Error('Account changed during sync; pending data preserved');
      if ((row ? row.updated_at : null) !== base.revision) {
        // An earlier request may have reached Supabase before the browser lost
        // its response. An exact match is safe to acknowledge without writing.
        if (row && sameData(row.data, pending)) {
          finishAcknowledged(k, pending, row.updated_at);
          return true;
        }
        throw new Error('Cloud changed since last sync; pending data preserved');
      }
      if (row) {
        if (await userId() !== uid) throw new Error('Account changed before cloud update');
        const { data, error } = await client.from('user_data')
          .update({ data: pending, updated_at: new Date().toISOString() })
          .eq('id', row.id).eq('user_id', uid).eq('updated_at', row.updated_at)
          .select('id,updated_at');
        if (error) throw error;
        if (!data || data.length !== 1) throw new Error('Concurrent cloud change; pending data preserved');
        write(k.revision, data[0].updated_at);
      } else {
        if (await userId() !== uid) throw new Error('Account changed before cloud insert');
        const { data, error } = await client.from('user_data')
          .insert({ user_id: uid, tool, data: pending }).select('id,updated_at');
        if (error) throw error;
        if (!data || data.length !== 1) throw new Error('Cloud insert not confirmed; pending data preserved');
        write(k.revision, data[0].updated_at);
      }
      if (await userId() !== uid) throw new Error('Account changed after sync; pending data preserved');
      // A newer local edit may have arrived while the request was in flight.
      // Keep it queued with the new server revision rather than deleting it.
      finishAcknowledged(k, pending, read(k.revision));
      return true;
    }
    async function save(data) {
      // Serialize local writes as well as uploads, preserving each baseline.
      const previous = saving || Promise.resolve();
      const next = previous.catch(() => {}).then(() => performSave(data));
      saving = next;
      try { return await next; } finally { if (saving === next) saving = null; }
    }
    async function performSave(data) {
      const uid = await userId();
      if (!uid) throw new Error('Sign in required');
      const k = keys(uid);
      if (localStorage.getItem(k.pending) === null) {
        // Record the local edit even when the first baseline cannot be fetched.
        // It must NOT be uploaded until the baseline is known and reconciled.
        if (localStorage.getItem(k.revision) === null) {
          if (navigator.onLine) {
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
      write(k.pending, data);
      if (!navigator.onLine) return false;
      // Wait for an in-flight upload, then send the latest queued snapshot.
      // Otherwise a second edit could remain pending indefinitely while online.
      if (flushing) {
        try { await flushing; } catch (_) { return false; }
        if (await userId() !== uid) return false;
      }
      return flush();
    }
    async function reconcilePending() {
      // Explicit user action only. Never guess which conflicting version wins.
      const uid = await userId();
      if (!uid) throw new Error('Sign in required');
      if (!navigator.onLine) throw new Error('Internet connection required');
      const k = keys(uid);
      if (localStorage.getItem(k.pending) === null) return { status: 'nothing-pending' };
      const base = read(k.base);
      if (!base || !base.unresolved) return { status: 'baseline-known' };
      const pending = read(k.pending);
      const row = await fetchCloud(uid);
      if (await userId() !== uid) throw new Error('Account changed during reconciliation');
      if (row && sameData(row.data, pending)) {
        finishAcknowledged(k, pending, row.updated_at);
        return { status: 'already-synced' };
      }
      if (row) return { status: 'conflict' };
      // Empty cloud is confirmed now. A later concurrent insert is still
      // guarded by the existing fetch/compare path in performFlush().
      write(k.base, { revision: null });
      return { status: 'ready' };
    }
    async function hasPending() {
      const uid = await userId();
      return uid ? localStorage.getItem(keys(uid).pending) !== null : false;
    }
    return { load, save, flush, hasPending, reconcilePending };
  }
  global.HelferleinCloudStore = { createStore };
})(window);

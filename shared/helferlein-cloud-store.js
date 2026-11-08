/* Helferlein: authenticated cloud persistence with a local offline queue.
 * No automatic upload of legacy browser data: migration must be user-approved.
 * The caller owns rendering and supplies its own local storage key.
 */
(function (global) {
  'use strict';
  function createStore(client, tool, localKey) {
    if (!client || !tool || !localKey) throw new Error('Cloud store configuration missing');
    const pendingKey = 'helferlein_pending_' + tool;
    const cacheKey = 'helferlein_cache_' + tool;
    const read = key => {
      try { const raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }
      catch (_) { return null; }
    };
    async function currentUser() {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      return data.user;
    }
    async function fetchCloud(user) {
      const { data, error } = await client.from('user_data')
        .select('id,data,updated_at').eq('user_id', user.id).eq('tool', tool)
        .order('updated_at', { ascending: false }).limit(1);
      if (error) throw error;
      return data[0] || null;
    }
    async function load() {
      const pending = read(pendingKey);
      if (pending !== null) return { data: pending, source: 'pending' };
      if (!navigator.onLine) return { data: read(cacheKey), source: 'offline' };
      const user = await currentUser();
      if (!user) return { data: read(localKey), source: 'local-unauthenticated' };
      try {
        const row = await fetchCloud(user);
        if (row) {
          localStorage.setItem(cacheKey, JSON.stringify(row.data));
          return { data: row.data, source: 'cloud' };
        }
        return { data: null, source: 'cloud-empty' };
      } catch (error) {
        return { data: read(cacheKey), source: 'offline-error', error };
      }
    }
    async function flush() {
      const pending = read(pendingKey);
      if (pending === null || !navigator.onLine) return false;
      const user = await currentUser();
      if (!user) return false;
      const row = await fetchCloud(user);
      // No blind overwrite: the server may have changed while this device was offline.
      const base = read(pendingKey + '_base');
      if (row && base !== row.updated_at) {
        throw new Error('Cloud conflict: remote data changed; resolve before syncing');
      }
      if (row) {
        const { error } = await client.from('user_data').update({ data: pending, updated_at: new Date().toISOString() })
          .eq('id', row.id).eq('user_id', user.id).eq('updated_at', row.updated_at).select('id');
        if (error) throw error;
      } else {
        if (base !== null) throw new Error('Cloud conflict: previous record missing');
        const { error } = await client.from('user_data').insert({ user_id: user.id, tool, data: pending });
        if (error) throw error;
      }
      localStorage.setItem(cacheKey, JSON.stringify(pending));
      localStorage.removeItem(pendingKey);
      localStorage.removeItem(pendingKey + '_base');
      return true;
    }
    async function save(data) {
      const user = await currentUser();
      if (!user) throw new Error('Sign in before saving cloud data');
      if (read(pendingKey) === null) {
        const row = navigator.onLine ? await fetchCloud(user) : null;
        localStorage.setItem(pendingKey + '_base', JSON.stringify(row ? row.updated_at : null));
      }
      localStorage.setItem(pendingKey, JSON.stringify(data));
      return flush();
    }
    return { load, save, flush, hasPending: () => read(pendingKey) !== null };
  }
  global.HelferleinCloudStore = { createStore };
})(window);

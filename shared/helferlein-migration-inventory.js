/* Read-only migration inventory. Does not upload, overwrite or delete data. */
(function (global) {
  'use strict';
  const sources = Object.freeze([
    { tool: 'pflanzenpflege-giessplan', key: 'pflanzen_pass_v10', collection: 'plants' },
    { tool: 'zaehlerstaende-erfassen', key: 'energie_tracker_pro_v8', collection: 'readings' }
  ]);
  function inspectLocal() {
    return sources.map(source => {
      const raw = localStorage.getItem(source.key);
      if (raw === null) return { tool: source.tool, key: source.key, state: 'absent', count: 0 };
      try {
        const value = JSON.parse(raw);
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
            !Array.isArray(value[source.collection])) {
          return { tool: source.tool, key: source.key, state: 'invalid', count: null };
        }
        return { tool: source.tool, key: source.key, state: 'valid',
          count: value[source.collection].length, bytes: raw.length };
      } catch (_) {
        return { tool: source.tool, key: source.key, state: 'invalid', count: null };
      }
    });
  }
  async function inspectCloud(client) {
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    if (!auth.user) throw new Error('Sign in required');
    const results = [];
    for (const source of sources) {
      const { data, error } = await client.from('user_data').select('id,updated_at')
        .eq('user_id', auth.user.id).eq('tool', source.tool).limit(2);
      if (error) throw error;
      results.push({ tool: source.tool, records: data.length,
        state: data.length > 1 ? 'duplicate' : data.length ? 'exists' : 'empty' });
    }
    return results;
  }
  global.HelferleinMigrationInventory = Object.freeze({ inspectLocal, inspectCloud });
})(window);

'use strict';

// Server-only adapter: inject a trusted Supabase Auth client configured on the server.
// getUser(token) validates the bearer with Supabase Auth. Never use getSession()
// or user_metadata as an authorization source.
const { authenticate } = require('./server-auth-v2.cjs');
function createSupabaseVerifier(auth) {
  if (!auth || typeof auth.getUser !== 'function') throw new TypeError('invalid_auth_client');
  return async token => {
    const { data, error } = await auth.getUser(token);
    if (error || !data || !data.user || !data.user.id) return null;
    const user = data.user;
    if (user.is_anonymous === true || !user.email_confirmed_at && !user.phone_confirmed_at) return null;
    return { userId: user.id, verified: true };
  };
}
async function authenticateSupabase(request, auth) {
  return authenticate(request, createSupabaseVerifier(auth));
}
module.exports = { createSupabaseVerifier, authenticateSupabase };

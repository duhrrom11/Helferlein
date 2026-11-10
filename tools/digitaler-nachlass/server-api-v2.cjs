'use strict';

// Offline HTTP boundary for a FUTURE Nachlass v2 API.
// No DB, no identity provider, no keys, no deployment, no feature flag.
// Every request is denied regardless of credentials, body or claimed role.
const MAX_BYTES = 4096;
const METHODS = Object.freeze(['POST']);
const ACTIONS = Object.freeze(['alarm', 'check-in', 'revoke', 'heir-envelope']);

function reply(status, error) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer'
    }
  });
}

async function handleNachlassV2(request) {
  if (!(request instanceof Request)) return reply(400, 'invalid_request');
  let url;
  try { url = new URL(request.url); }
  catch { return reply(400, 'invalid_request'); }

  // Do not reflect secrets or IDs. Do not parse bodies, accept bearer tokens,
  // call a service role, or use client-supplied identity/time/state.
  if (!METHODS.includes(request.method)) return reply(405, 'method_not_allowed');
  const match = /^\/v2\/vaults\/([A-Za-z0-9_-]{8,128})\/(alarm|check-in|revoke|heir-envelope)$/.exec(url.pathname);
  if (!match) return reply(404, 'not_found');
  const contentLength = request.headers.get('content-length');
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BYTES)) {
    return reply(413, 'request_too_large');
  }
  // Intentionally deny even a correctly shaped request from an authenticated user.
  // Only a separately reviewed server implementation may replace this guard.
  return reply(503, 'not_configured');
}

module.exports = { handleNachlassV2, ACTIONS, MAX_BYTES };

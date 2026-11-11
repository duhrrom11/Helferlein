/**
 * NOT DEPLOYED. Explicit, fail-closed HTTP boundary for the private heir services.
 * No network listener, no Edge Function entrypoint, no key-release or snapshot API.
 * Integration MUST supply a server-only verifier and durable admission controls.
 */
import type { VerifyUser } from './heir-staging-backend.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BEARER = /^Bearer [A-Za-z0-9._~-]{8,4096}$/;
const MAX_BODY = 8192;
const routes = {
  '/v1/heirs/invitations/create': ['vaultId', 'intendedUserId', 'ttlSeconds'],
  '/v1/heirs/invitations/redeem': ['token'],
  '/v1/heirs/invitations/revoke': ['vaultId', 'invitationId'],
  '/v1/heirs/envelopes/put': ['vaultId', 'heirUserId', 'keyId', 'publicKeyFingerprintHex', 'encapsulatedKeyHex', 'wrappedDekHex', 'suite'],
  '/v1/heirs/keys/begin': ['publicKeyHex'],
  '/v1/heirs/keys/confirm': ['keyId', 'challengeId', 'proofHex'],
  '/v1/heirs/alarms/raise': ['ownerUserId', 'vaultId'],
  '/v1/heirs/alarms/cancel': ['vaultId'],
  '/v1/heirs/alarms/status': ['ownerUserId', 'vaultId'],
} as const;
type Route = keyof typeof routes;
type Body = Record<string, unknown>;
type ServiceResult = { ok: boolean; [key: string]: unknown };
type Invocation = (auth: string | null, payload: any) => Promise<ServiceResult>;

export interface HeirHttpServices {
  createInvitation: Invocation;
  redeemInvitation: Invocation;
  revokeInvitation: Invocation;
  putEnvelope: Invocation;
  beginEnrollment: Invocation;
  confirmEnrollment: Invocation;
  raiseAlarm: Invocation;
  cancelAlarm: Invocation;
  reviewStatus: Invocation;
}
export interface HeirHttpAdmission {
  /** Must enforce a distributed, bounded rate limit BEFORE verifying bearer tokens. */
  preAuth(request: Request, route: Route): Promise<boolean>;
  /** Must enforce a distributed per-verified-user rate limit; failure denies. */
  user(userId: string, route: Route): Promise<boolean>;
}
export interface HeirHttpConfig {
  allowedOrigins: readonly string[];
  verifyUser: VerifyUser;
  admission: HeirHttpAdmission;
  services: HeirHttpServices;
}

function cleanOrigin(input: string): boolean {
  try {
    const url = new URL(input);
    return url.origin === input && url.protocol === 'https:' && !url.username && !url.password;
  } catch { return false; }
}
function json(status: number, payload: Record<string, unknown>, origin?: string): Response {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'Pragma': 'no-cache',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
  });
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'authorization, content-type');
    headers.set('Access-Control-Max-Age', '0');
  }
  return new Response(JSON.stringify(payload), { status, headers });
}
function exactShape(body: Body, keys: readonly string[]): boolean {
  return Object.keys(body).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(body, key));
}
async function readSmallJson(request: Request): Promise<Body | null> {
  const size = request.headers.get('content-length');
  if (size && (!/^\d+$/.test(size) || Number(size) > MAX_BODY)) return null;
  if (request.headers.get('content-type')?.toLowerCase() !== 'application/json') return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > MAX_BODY) return null;
      chunks.push(result.value);
    }
    if (!bytes) return null;
    const merged = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(merged));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Body;
  } catch { return null; }
  finally { try { await reader.cancel(); } catch { /* already closed */ } }
}

/** Instantiate only inside a reviewed private HTTP runtime; no runtime created here. */
export function createHeirHttpStaging(config: HeirHttpConfig): (request: Request) => Promise<Response> {
  if (!config || !Array.isArray(config.allowedOrigins) || !config.allowedOrigins.length ||
      config.allowedOrigins.some(origin => !cleanOrigin(origin)) ||
      typeof config.verifyUser !== 'function' || !config.admission ||
      typeof config.admission.preAuth !== 'function' || typeof config.admission.user !== 'function' ||
      !config.services || Object.values(config.services).some(fn => typeof fn !== 'function')) {
    throw new Error('heir_http_unconfigured');
  }
  const allowed = new Set(config.allowedOrigins);
  return async request => {
    const origin = request.headers.get('origin');
    // Explicit origin avoids browser cross-site requests and opaque/null origins.
    if (!origin || !allowed.has(origin)) return json(403, { ok: false });
    let path: string;
    try {
      const url = new URL(request.url);
      if (url.search || url.hash || url.username || url.password) return json(404, { ok: false }, origin);
      path = url.pathname;
    } catch { return json(404, { ok: false }, origin); }
    if (!Object.prototype.hasOwnProperty.call(routes, path)) return json(404, { ok: false }, origin);
    const route = path as Route;
    if (request.method === 'OPTIONS') {
      const h = request.headers.get('access-control-request-headers') ?? '';
      if (request.headers.get('access-control-request-method') !== 'POST' ||
          h.split(',').map(s => s.trim().toLowerCase()).some(v => !['authorization', 'content-type'].includes(v))) {
        return json(403, { ok: false }, origin);
      }
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Max-Age': '0',
        'Cache-Control': 'no-store',
        'Vary': 'Origin',
      } });
    }
    if (request.method !== 'POST') return json(405, { ok: false }, origin);
    try {
      if (await config.admission.preAuth(request, route) !== true) return json(429, { ok: false }, origin);
      const auth = request.headers.get('authorization');
      if (!auth || !BEARER.test(auth)) return json(401, { ok: false }, origin);
      const userId = await config.verifyUser(auth);
      if (!userId || !UUID.test(userId)) return json(401, { ok: false }, origin);
      if (await config.admission.user(userId, route) !== true) return json(429, { ok: false }, origin);
      const body = await readSmallJson(request);
      if (!body || !exactShape(body, routes[route])) return json(400, { ok: false }, origin);
      const ops = config.services;
      // No endpoint returns a plaintext master key, DEK, encrypted snapshot, or released envelope.
      let result: ServiceResult;
      switch (route) {
        case '/v1/heirs/invitations/create': result = await ops.createInvitation(auth, body); break;
        case '/v1/heirs/invitations/redeem': result = await ops.redeemInvitation(auth, body.token); break;
        case '/v1/heirs/invitations/revoke': result = await ops.revokeInvitation(auth, body); break;
        case '/v1/heirs/envelopes/put': result = await ops.putEnvelope(auth, body); break;
        case '/v1/heirs/keys/begin': result = await ops.beginEnrollment(auth, body.publicKeyHex); break;
        case '/v1/heirs/keys/confirm': result = await ops.confirmEnrollment(auth, body); break;
        case '/v1/heirs/alarms/raise': result = await ops.raiseAlarm(auth, body); break;
        case '/v1/heirs/alarms/cancel': result = await ops.cancelAlarm(auth, body.vaultId); break;
        case '/v1/heirs/alarms/status': result = await ops.reviewStatus(auth, body); break;
      }
      if (!result || result.ok !== true) return json(403, { ok: false }, origin);
      if (route === '/v1/heirs/invitations/create') {
        return typeof result.token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(result.token)
          ? json(200, { ok: true, token: result.token }, origin) : json(403, { ok: false }, origin);
      }
      if (route === '/v1/heirs/keys/begin') {
        const { keyId, challengeId, ephemeralPublicKeyHex, saltHex, suite } = result;
        return typeof keyId === 'string' && UUID.test(keyId) &&
          typeof challengeId === 'string' && UUID.test(challengeId) &&
          typeof ephemeralPublicKeyHex === 'string' && /^[a-f0-9]{64}$/.test(ephemeralPublicKeyHex) &&
          typeof saltHex === 'string' && /^[a-f0-9]{64}$/.test(saltHex) &&
          suite === 'HPKE-v1-X25519-HKDF-SHA256-AES-256-GCM'
          ? json(200, { ok: true, keyId, challengeId, ephemeralPublicKeyHex, saltHex, suite }, origin)
          : json(403, { ok: false }, origin);
      }
      if (route === '/v1/heirs/alarms/status' || route === '/v1/heirs/alarms/raise') {
        const state = result.state;
        return ['locked', 'grace', 'pending_independent_review'].includes(String(state))
          ? json(200, { ok: true, state }, origin) : json(403, { ok: false }, origin);
      }
      return json(200, { ok: true }, origin);
    } catch {
      // No raw database errors, access tokens, invitation tokens or key material in responses.
      return json(403, { ok: false }, origin);
    }
  };
}

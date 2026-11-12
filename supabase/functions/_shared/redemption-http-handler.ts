/**
 * Staging-only HTTP boundary for invitation redemption.
 * Inert by default: no database access unless a reviewed caller explicitly
 * supplies enabled=true AND a verified auth client + atomic store.
 * Not connected to a deployed Edge Function.
 */
import type { AuthUserLookup } from "./verified-user.ts";
import type { AtomicRedemptionStore } from "./atomic-invitation-redemption.ts";
import { redeemVerifiedInvitation } from "./verified-redemption-request.ts";
import type { RateDecision } from "./heir-rate-limit.ts";

const ORIGIN = "https://duhrrom11.github.io";
const MAX_BYTES = 512;
function response(status: number, error: string, headers: Headers): Response {
  return new Response(JSON.stringify({ error }), { status, headers });
}
export async function handleRedemptionRequest(
  request: Request,
  dependencies: { auth: AuthUserLookup; store: AtomicRedemptionStore; rateLimit: (verifiedUserId: string) => Promise<RateDecision>; enabled?: boolean },
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  if (origin === ORIGIN) {
    headers.set("Access-Control-Allow-Origin", ORIGIN);
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: origin === ORIGIN ? 204 : 403, headers });
  }
  if (origin && origin !== ORIGIN) return response(403, "forbidden_origin", headers);
  if (request.method !== "POST") return response(405, "method_not_allowed", headers);
  // Never activate this from request parameters or a browser-controlled header.
  if (dependencies.enabled !== true) return response(503, "not_configured", headers);
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !/^Bearer [A-Za-z0-9._~-]+$/.test(authHeader)) {
    return response(401, "unauthorized", headers);
  }
  // Require JSON and reject ambiguous requests before handling a bearer secret.
  const contentType = request.headers.get("Content-Type");
  if (!contentType || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType)) {
    return response(415, "unsupported_media_type", headers);
  }
  let token: unknown;
  try {
    if (Number(request.headers.get("Content-Length")) > MAX_BYTES) {
      return response(413, "request_too_large", headers);
    }
    const reader = request.body?.getReader();
    if (!reader) return response(400, "invalid_request", headers);
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) {
          await reader.cancel();
          return response(413, "request_too_large", headers);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
        Object.keys(parsed).length !== 1 || !Object.hasOwn(parsed, "token")) {
      return response(400, "invalid_request", headers);
    }
    token = (parsed as Record<string, unknown>).token;
  } catch {
    return response(400, "invalid_request", headers);
  }
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    return response(400, "invalid_request", headers);
  }
  const result = await redeemVerifiedInvitation(dependencies.auth, dependencies.store, authHeader, token, dependencies.rateLimit);
  if (result === "limited") return response(429, "rate_limited", headers);
  if (result === "unavailable") return response(503, "unavailable", headers);
  if (result !== "accepted") return response(404, "not_found", headers);
  return new Response(JSON.stringify({ status: "accepted" }), { status: 200, headers });
}

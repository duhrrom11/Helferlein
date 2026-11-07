// Staging only: never reads Firebase, never returns vault data.
// Deployment is a separate, manual step. Do not use in production.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://duhrrom11.github.io";
const EXPECTED_PROJECT_REF = "ojfoijljykjhveejvkfx";

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
    headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
  }
  const reply = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), { status, headers });

  if (request.method === "OPTIONS") {
    return new Response(null, { status: origin === ALLOWED_ORIGIN ? 204 : 403, headers });
  }
  if (origin && origin !== ALLOWED_ORIGIN) return reply(403, "forbidden_origin");
  if (request.method !== "POST") return reply(405, "method_not_allowed");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const allowedUserId = Deno.env.get("FIREBASE_HEALTHCHECK_TEST_USER_ID");
  if (!url || !anonKey || !url.startsWith(`https://${EXPECTED_PROJECT_REF}.supabase.co`)) {
    return reply(503, "not_configured");
  }
  // Explicit allowlist must be configured server-side; no default owner.
  if (!allowedUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(allowedUserId)) {
    return reply(503, "not_configured");
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) return reply(401, "unauthorized");
  const token = authorization.replace(/^Bearer\s+/i, "");
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return reply(401, "unauthorized");
  if (data.user.id !== allowedUserId) return reply(403, "forbidden");

  // Intentional fail-closed result. No Firebase SDK, credentials or data access.
  return reply(503, "not_configured");
});

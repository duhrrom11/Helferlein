// Helferlein: geschuetzter Einstiegspunkt fuer die spaetere Tresor-API.
// Diese Funktion gibt absichtlich KEINE Tresordaten frei.
// Deployment: Supabase Edge Functions mit JWT-Pruefung aktiviert lassen.
// Erforderliche Secrets: SUPABASE_URL, SUPABASE_ANON_KEY (Supabase-Umgebung).
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://duhrrom11.github.io";

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info";
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: origin === ALLOWED_ORIGIN ? 204 : 403, headers });
  }
  // Origin kann von Nicht-Browser-Clients gefaelscht oder weggelassen werden.
  // Daher bleibt die serverseitige Authentifizierung unabdingbar.
  if (origin && origin !== ALLOWED_ORIGIN) {
    return new Response(JSON.stringify({ error: "forbidden_origin" }), { status: 403, headers });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    return new Response(JSON.stringify({ error: "service_unavailable" }), { status: 503, headers });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers });
  }

  // Der Client darf nur eine Tresor-ID anfragen, keine Eigentuemerdaten setzen.
  // Begrenze die gelesenen Bytes unabhaengig von Content-Length.
  // Die API erwartet nur eine kurze JSON-Nachricht mit einer Tresor-ID.
  const MAX_BODY_BYTES = 4096;
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers });
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > MAX_BODY_BYTES) {
          await reader.cancel();
          return new Response(JSON.stringify({ error: "request_too_large" }), { status: 413, headers });
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers });
  }
  const vaultId = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).vaultId
    : undefined;
  if (typeof vaultId !== "string" || !/^v_[A-Za-z0-9_-]{8,80}$/.test(vaultId)) {
    return new Response(JSON.stringify({ error: "invalid_vault_id" }), { status: 400, headers });
  }

  // Service-Role-Schluessel darf ausschliesslich serverseitig hinterlegt werden.
  // Er darf niemals in Browsercode oder API-Antworten erscheinen.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: "service_unavailable" }), { status: 503, headers });
  }
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ownership, error: ownershipError } = await admin
    .from("vault_ownership")
    .select("vault_id")
    .eq("vault_id", vaultId)
    .eq("owner_user_id", data.user.id)
    .maybeSingle();

  if (ownershipError) {
    console.error("Vault ownership lookup failed", ownershipError.code);
    return new Response(JSON.stringify({ error: "service_unavailable" }), { status: 503, headers });
  }
  if (!ownership) {
    // Keine Auskunft, ob ein fremder Tresor existiert.
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers });
  }

  // Trotz erfolgreicher Eigentuemerkontrolle weiterhin KEIN Firestore-Zugriff.
  // Erst nach sicherer Migration, API-Design und Tests aktivieren.
  return new Response(JSON.stringify({ error: "vault_access_not_configured" }), {
    status: 503,
    headers,
  });
});

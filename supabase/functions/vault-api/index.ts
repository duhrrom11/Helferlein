// Helferlein: geschuetzter Einstiegspunkt fuer die spaetere Tresor-API.
// Diese Funktion gibt absichtlich KEINE Tresordaten frei.
// Deployment: Supabase Edge Functions mit JWT-Pruefung aktiviert lassen.
// Erforderliche Secrets: SUPABASE_URL, SUPABASE_ANON_KEY (Supabase-Umgebung).
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (request) => {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
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

  // Fail closed: keine Firestore-Admin-Zugangsdaten, keine Tresor-ID-Zuordnung,
  // keine Tresoroperationen bis eine gepruefte Autorisierung implementiert ist.
  return new Response(JSON.stringify({ error: "vault_access_not_configured" }), {
    status: 503,
    headers,
  });
});

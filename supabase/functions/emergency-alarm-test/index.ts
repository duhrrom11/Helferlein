// Helferlein – Notfallalarm, isolierter Entwurf (NICHT bereitgestellt).
// Keine Firebase-Verbindung, kein E-Mail-Versand, keine Datenfreigabe.
// Erst nach serverseitiger Berechtigungsprüfung und separater Sicherheitsfreigabe erweitern.
const ALLOWED_ORIGIN = "https://duhrrom11.github.io";
const EXPECTED_PROJECT_REF = "ojfoijljykjhveejvkfx";

Deno.serve((_request: Request) => {
  const origin = _request.headers.get("Origin");
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
  if (_request.method === "OPTIONS") {
    return new Response(null, { status: origin === ALLOWED_ORIGIN ? 204 : 403, headers });
  }
  if (origin && origin !== ALLOWED_ORIGIN) {
    return new Response(JSON.stringify({ error: "forbidden_origin" }), { status: 403, headers });
  }
  if (_request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }
  // Keine Eingaben verarbeiten und keine Alarmaktionen ausführen.
  // Eine unerwartete Bereitstellung darf keine Funktionalität freischalten.
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  if (!url.startsWith(`https://${EXPECTED_PROJECT_REF}.supabase.co`)) {
    return new Response(JSON.stringify({ error: "not_configured" }), { status: 503, headers });
  }
  return new Response(JSON.stringify({ error: "not_configured" }), { status: 503, headers });
});

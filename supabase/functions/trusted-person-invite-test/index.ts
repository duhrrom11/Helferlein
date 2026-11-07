// Helferlein – Einladungs-API, INAKTIVER ENTWURF.
// Nicht bereitgestellt. Keine Einladungen, E-Mails oder Datenbankänderungen.
// Authentifizierung und Eigentümerprüfung sind VOR einer Aktivierung zu implementieren.
const ALLOWED_ORIGIN = "https://duhrrom11.github.io";

Deno.serve((request: Request) => {
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
  if (request.method === "OPTIONS") {
    return new Response(null, { status: origin === ALLOWED_ORIGIN ? 204 : 403, headers });
  }
  if (origin && origin !== ALLOWED_ORIGIN) {
    return new Response(JSON.stringify({ error: "forbidden_origin" }), { status: 403, headers });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }
  // Absichtlich keine Verarbeitung von Token, Benutzer- oder Tresor-IDs.
  // Dieser Endpunkt bleibt auch bei versehentlichem Deployment funktionslos.
  return new Response(JSON.stringify({ error: "not_configured" }), { status: 503, headers });
});

# Firebase–Supabase-Verbindung: isolierter Staging-Plan

Stand: 2026-11-07. **Planung, keine Freischaltung und kein Deployment.**

## Umgebungsgrenzen

- Firebase TEST: Projekt-ID `helferlein-test`, Firestore `(default)`, Rules `allow read, write: if false;`.
- Supabase TEST: Projekt-Ref `ojfoijljykjhveejvkfx`.
- Firebase PROD und Supabase PROD bleiben unberührt. Keine produktiven Vault-IDs oder Daten in Staging übertragen.
- Vorhandene Staging-Edge-Function `vault-api` bleibt unverändert und fail-closed; selbst Eigentümer erhalten nur `503 vault_access_not_configured`.

## Authentifizierung und Berechtigungen

- Staging-Dienstkonto: `helferlein-vault-test@helferlein-test.iam.gserviceaccount.com`.
- Laut manueller IAM-Prüfung: nur Rolle `Cloud Datastore Viewer` (projektweit lesend), keine privaten Schlüssel.
- Server-SDKs / Google Cloud IAM können Firestore-Sicherheitsregeln umgehen. Die Regeln sind **keine** zusätzliche Schranke für Dienstkonten.
- Die Viewer-Rolle ist projektweit; vor produktivem Einsatz sind Datenisolation, engere Berechtigungen und ggf. eine dedizierte Datenbank / Ressourcengrenze zu prüfen.
- Bevorzugt kurzlebige, schlüssellose Identität (Workload Identity Federation), falls mit Supabase Edge Functions praktikabel und nachweislich sicher. Falls nicht, Schlüsselverwendung erst nach gesonderter Risikoabwägung; Schlüssel ausschließlich als verschlüsseltes Staging-Secret, nie in GitHub, Browser, Chat, Logs oder Screenshots.
- Noch **keine** Schlüssel erstellen, keine Secrets eintragen.

## Geplanter minimaler Verbindungstest (noch nicht implementiert)

1. Separaten, nicht produktiv genutzten Staging-Endpunkt implementieren, nicht in die bestehende `vault-api` einbauen.
2. Test-Endpunkt gegen unautorisierte Aufrufe schützen; keine generische Firebase-Proxy-Funktion.
3. Server-seitig Google-Identität nur für Projekt `helferlein-test` verwenden; Projekt-ID und Ziel explizit prüfen, kein dynamisches Ziel aus Client-Eingaben.
4. Optional nur eine feste, synthetische und nicht sensible Staging-Testressource lesen. Keine Listenabfragen, keine produktiven Tresorpfade und keine Rückgabe von Firestore-Inhalten.
5. Antwort nur `ok` / `not_configured` / `error` ohne Identitätsdaten, Schlüssel, Tokens oder Rohfehler.
6. Negativtests: kein Token, falsches Projekt, falsche Berechtigung, ungültiger Aufrufer, fehlende Credentials; alle müssen sicher scheitern.
7. Nach Test Berechtigungen und Schlüsselstatus erneut kontrollieren; erst danach über die nächste Ausbaustufe entscheiden.

## Bereits beobachtete Tests

- Supabase A (synthetischer Eigentümer): HTTP 503 `vault_access_not_configured`.
- Supabase B (fremder Benutzer): HTTP 404 `not_found`.
- Ungültige Tresor-ID: HTTP 400 `invalid_vault_id`.
- `public.vault_ownership`: RLS aktiv; `anon` und `authenticated` haben keine direkten SELECT-Privilegien.
- Firebase Staging Firestore Rules: `allow read, write: if false;`.
- Staging-Dienstkonto hat laut Nutzer keine privaten Schlüssel.

Diese Beobachtungen sind keine vollständige Sicherheitsprüfung.

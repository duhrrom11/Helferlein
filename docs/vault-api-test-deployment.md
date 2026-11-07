# Helferlein – sichere Bereitstellung und Abnahme der Vault-API

**Status:** Testanleitung, keine Freigabe fuer Produktivbetrieb. Die produktiven Firestore-Regeln bleiben gesperrt (`allow read, write: if false`).

## 1. Isolierte Testumgebung

- Separates Supabase-Testprojekt und separate Firestore-Testdatenbank verwenden. **Keine** produktiven Service-Role-Schluessel oder Firebase-Zugangsdaten in GitHub speichern.
- Vor jeglicher Migration Backup und Wiederherstellung pruefen.
- Supabase CLI lokal installieren, mit Testprojekt verbinden und die Migration in der Testumgebung ausfuehren.
- Sicherstellen, dass `public.vault_ownership` RLS aktiviert hat und `anon`/`authenticated` keine direkten Tabellenrechte haben.
- Ein Testkonto A und ein separates Testkonto B anlegen. Einen Test-Tresor ausschliesslich serverseitig dem Konto A zuordnen.

## 2. Funktion bereitstellen

Mit der Supabase CLI aus dem Repository-Verzeichnis (nach Authentifizierung und Verknuepfung mit dem **Testprojekt**):

```sh
supabase functions deploy vault-api --project-ref TEST_PROJECT_REF
```

Die JWT-Gateway-Pruefung in `supabase/config.toml` ist auf `true` gesetzt. Vor dem Deployment die JWT-Kompatibilitaet mit der tatsaechlichen Supabase-Projektkonfiguration pruefen; insbesondere bei asymmetrischen Signing Keys. Die Funktion prueft Bearer-Tokens zusaetzlich mit `auth.getUser(token)`.

Erforderliche serverseitige Umgebungsvariablen: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Supabase stellt sie je nach Umgebung automatisch bereit; Verfuegbarkeit pruefen. Service-Role-Schluessel niemals in Browsercode, Tickets oder Logs kopieren.

## 3. Testmatrix

Anfragen gehen per POST an `/functions/v1/vault-api` mit JSON `{"vaultId":"v_test12345678"}`. Fuer authentifizierte Anfragen den **gueltigen Access Token** des jeweiligen Testkontos verwenden; bei aktivierter Gateway-Pruefung den passenden `apikey`-Header des Testprojekts setzen.

| Testfall | Erwartung |
| --- | --- |
| Kein Bearer-Token | 401 (ggf. bereits am Supabase-Gateway) |
| Ungueltiger/abgelaufener Token | 401 |
| Ungueltige JSON-Daten | 400 |
| Tresor-ID mit ungueltigem Format | 400 |
| Konto B fragt Tresor von A an | 404, keine Existenzinformation |
| Konto A fragt eigenen zugeordneten Tresor an | 503 `vault_access_not_configured`; **keine Tresordaten** |
| Datenbank nicht verfuegbar | 503, keine Tresordaten |
| Browser-Origin `https://duhrrom11.github.io` | CORS-Preflight 204 |
| Fremder Browser-Origin | CORS-Preflight 403 |
| GET statt POST | 405 (ohne unzulaessigen Origin) |

**Wichtig:** CORS verhindert keine direkten API-Anfragen ausserhalb des Browsers. Die Authentifizierung und serverseitige Autorisierung sind die Sicherheitsgrenze. Gateway-Fehler koennen andere Statuscodes als die Funktion selbst liefern.

## 4. Abnahmekriterien

- Alle negativen Tests bestanden, keine Tresordaten in Antworten oder Logs.
- Eigentuemerzuordnung wird nur von privilegierter Serverlogik geschrieben.
- Keine selbststaendige Zuordnung durch E-Mail, Tresor-ID oder Erben-Link.
- Keine Firestore-Zugriffe aus der Edge Function, bevor Berechtigungsmodell, serverseitige Check-ins, Notfallfreigabe und Schluesselmanagement implementiert und getestet sind.
- Erst danach gesonderte Freigabe fuer Produktivdeployment. **Nicht** die offenen Firestore-Regeln wiederherstellen.

## 5. Offene Punkte

Diese Datei fuehrt weder Migration noch Deployment aus. Es gibt noch keine durchgefuehrten Laufzeit- oder Integrationstests. Das bisherige Erbenportal mit vorab verteilten Schluesseln muss vor einer echten sicheren Freigabe neu entworfen werden.

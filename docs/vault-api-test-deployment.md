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

## 6. HTTP-Smoke-Test ausschliesslich gegen das Testprojekt

Vorbereitung: Eine **separate** Supabase-Projektinstanz erstellen und die unveraenderte, weiterhin gesperrte Vault-API dort bereitstellen. Die Testinstanz darf keine Verbindung zu produktiven Tresordaten oder produktiven Firebase-Zugangsdaten besitzen. Der Test benoetigt nur den **oeffentlichen anon/publishable-kompatiblen API-Key des Testprojekts**, niemals einen Service-Role-Key. Fuer eine Edge Function mit Gateway-JWT-Pruefung muss der verwendete apikey vom Gateway akzeptiert werden.

Im lokalen Terminal (nicht in GitHub Actions mit produktiven Secrets):

```sh
export VAULT_API_TEST_URL="https://TESTPROJEKTREF.supabase.co/functions/v1/vault-api"
export VAULT_API_TEST_ANON_KEY="TESTPROJEKT_ANON_KEY"
node tests/vault-api-smoke.cjs
```

Das Skript akzeptiert ausschliesslich HTTPS-Adressen der Form `<20-zeichen-projektreferenz>.supabase.co/functions/v1/vault-api`, verweigert die bekannte produktive Projektadresse und folgt keinen Redirects. Nur Test-Zugangsdaten einsetzen. Der Test sendet **keine** gueltigen Benutzer-Tokens und greift **nicht** auf Tresordaten zu.

**Abnahme:** Die beiden POST-Anfragen ohne gueltigen Token muessen 401/403 ergeben; der fremde Origin-Preflight 401/403; der erlaubte Origin-Preflight **204**. Falls das Gateway OPTIONS mit 401/403 abweist, gilt der Test als **fehlgeschlagen**: CORS/Gateway-Konfiguration in der isolierten Testumgebung klaeren, nicht die Browser-Sicherheit umgehen. Die Testergebnisse dokumentieren und erst dann die naechsten Integrationstests vorbereiten.

**Einschraenkungen:** Dieser Smoke-Test prueft weder Eigentuemermigration noch gueltige Nutzer-Tokens, Tresorzugriff, Firestore oder Notfallfreigabe. Es erfolgt keine produktive Bereitstellung.

### Erweiterte Autorisierungstests (optional, erst nach Test-Migration)

Zwei **verschiedene** Supabase-Testbenutzer A und B anlegen. Einen ausschliesslich synthetischen Test-Tresor durch eine privilegierte, auditierte Testoperation **nur A** zuordnen. Keine Zuordnung anhand einer vom Client behaupteten E-Mail oder Tresor-ID. Fuer beide Benutzer gueltige, kurzlebige Access-Tokens aus der Testumgebung beschaffen und **nicht** in Dateien, GitHub-Issues oder Shell-History speichern.

Das Skript unterstuetzt dann zusaetzlich diese Umgebungsvariablen:

- `VAULT_API_TEST_TOKEN_A`: gueltiger Access-Token von Eigentuemer A
- `VAULT_API_TEST_TOKEN_B`: gueltiger Access-Token des fremden Benutzers B
- `VAULT_API_TEST_VAULT_ID`: ausschliesslich synthetische, serverseitig A zugeordnete Test-ID

Alle drei muessen gemeinsam gesetzt sein; sonst werden die erweiterten Tests nicht ausgefuehrt (bei unvollstaendigen Angaben mit Fehler abgebrochen). Erwartet: B erhaelt 404, A erhaelt weiterhin 503 (keine Tresordaten), ungueltige Tresor-ID 400 und zu grosse Anfrage 413. **Nicht** als Erfolg werten, wenn A ebenfalls wegen ungueltiger Authentifizierung 401/403 erhaelt. Zugangstokens nach Testende aus der Umgebung entfernen.

Diese Tests setzen eine tatsaechlich bereitgestellte isolierte Testfunktion und die kontrolliert angelegte Testzuordnung voraus; sie fuehren selbst keine Migration oder Bereitstellung durch.

# Nachlass v2 – Server-Integrationsvertrag (nicht deployed)

Stand 2026-11-10. Dieses Dokument definiert die **Grenze zwischen vertrauenswürdigem Server und untrusted Browser**. Es existiert derzeit **kein produktiver v2-Endpunkt**.

## 1. Sicherheitsgrenzen

- Der Browser darf ausschließlich einen Supabase-/Firebase-Authentifizierungstoken (je nach festgelegtem Identity Provider), eine opaque Vault-Referenz und eine angeforderte Aktion senden.
- `actorId`, `ownerId`, `activeHeirIds`, `state`, `version`, `alarmStartedAtMs`, `serverNowMs`, `releaseAt`, `isAdmin` und `keyEnvelope` aus Request-Body oder URL sind **niemals** autoritativ.
- Der Server validiert Token, Audience, Issuer, Ablauf und Identität und ermittelt alle Rollen und Beziehungen aus servergeschützten Tabellen. Anonyme oder nicht eingeladene Akteure scheitern.
- Eine reine `Origin`-/CORS-Prüfung ist **keine** Authentisierung. Ein URL-Parameter `person` ist **keine** Autorisierung.
- Die `release-policy-v2.cjs` ist nur eine Offline-Zustandsprüfung. Insbesondere gibt es absichtlich **keine** `RELEASE`-Aktion: ein String `trusted-server` wäre leicht fälschbar. `releaseDue` ist nur ein Zeitprädikat und darf allein niemals Schlüssel ausliefern.

## 2. Minimaler API-Vertrag (künftig)

`POST /v2/vaults/{opaqueVaultId}/alarm`: eingeladene Person löst Alarm aus. Der Server prüft Einladung, Rate Limit, Sperrstatus, schreibt den Startzeitpunkt anhand Serverzeit und erhöht atomar die Version. Antwort enthält **keine** Schlüsselhülle.

`POST /v2/vaults/{opaqueVaultId}/check-in`: authentisierter Eigentümer bestätigt Aktivität und bricht ausstehende Alarme transaktional ab.

`POST /v2/vaults/{opaqueVaultId}/revoke`: authentisierter Eigentümer widerruft Einladung oder Tresorzugang. Nach Offenlegung des DEK ist Rotation notwendig.

`GET /v2/vaults/{opaqueVaultId}/heir-envelope`: authentisierte, aktive Erbenperson. Der Server liest den Zustand **erneut** aus dem geschützten Datenspeicher und gibt die personengebundene, verschlüsselte Schlüsselhülle ausschließlich bei `RELEASED` zurück. Kein Klartext-DEK.

Interne Release-Verarbeitung: nur über nicht öffentlich aufrufbare, privilegierte Serverfunktion; Serverzeit; Versionsvergleich und atomarer `ALARM_PENDING -> RELEASED`-Übergang; nach Eigentümer-Check-in oder Widerruf kein Release. Kein frei wählbares `actorId=trusted-server`.

## 3. Transaktionen und Idempotenz

- Jedes Mutation-Request trägt einen zufälligen Idempotency-Key. Erneute identische Requests liefern dasselbe Ergebnis; abweichender Body mit gleichem Key wird abgewiesen.
- Der Zustand wird mit `version` als Compare-and-Swap in einer Datenbanktransaktion aktualisiert. Zeitprüfung und Update erfolgen in derselben Transaktion.
- Parallel laufender Check-in und Release: nur eine Transaktion gewinnt. Es darf niemals ein Schlüssel ausgegeben werden, dessen Berechtigung zum Zeitpunkt der autoritativen Prüfung bereits widerrufen ist.
- Fehlerantworten: `401 unauthorized`, `403 forbidden`, `404 not_found`, `409 conflict`, `429 rate_limited`, `503 not_configured`. Keine Rohfehler, keine Geheimnisse in Logs.
- `Cache-Control: no-store` auf sämtlichen privaten Antworten. Keine Secret-URLs in Analytics, Referrer, Mail-Tracking oder Protokollen.

## 4. Firestore-Regelprüfung vor Integration

Produktives Firebase-Projekt `nachlass-app-99df8`: der aktuelle veröffentlichte Firestore-Regeltext liegt weiterhin **nicht** vor. Der Staging-Stand `helferlein-test` (`allow read, write: if false`) darf nicht als Produktionsbeleg verwendet werden. Insbesondere ist zu klären, ob `vaults/{vaultId}` öffentlich gelesen oder `emergencyTriggers` ohne Identitätsprüfung aktualisiert werden kann.

**Stop-Gate:** Kein Umschalten bestehender Links, kein Produktiv-Deployment, keine Schlüsselrotation und keine Datenmigration ohne geprüfte Firestore-Regeln, festgelegten Identity Provider, überprüftes Schlüsselhüllenverfahren, Emulator-Negativtests, Recovery-Probe und Rollback-Plan.

## Isolierte API-Vorbereitung (2026-11-10)

Der CommonJS-Baustein `tools/digitaler-nachlass/server-api-v2.cjs` enthält eine bewusst **nicht angebundene** HTTP-Schnittstelle `handleNachlassV2(Request)`. Er akzeptiert die geplanten Pfadformen `/v2/vaults/{vaultId}/{alarm|check-in|revoke|heir-envelope}`, führt aber **keine** Aktion aus und liefert für jeden formal gültigen Aufruf ausschließlich `503 not_configured`. Unbekannte Pfade liefern `404`, andere Methoden `405`. Der Baustein enthält keine Datenbank-Credentials, keinen Firebase-/Supabase-Client, keine Schlüssel und keinen aktivierbaren Feature-Schalter.

`tests/nachlass-server-api-v2.test.cjs` prüft alle vier deaktivierten Aktionen, gefälschte Identitäts- und Release-Felder, unbekannte Routen, Methoden und Antwort-Header. Die CI wurde um diese Tests ergänzt.

**Wichtig:** Dies ist kein produktiver Edge-Function-Endpunkt. Er wird nicht automatisch deployed, nicht von der bestehenden Erben-Seite verwendet und kann keine echten Zugriffe schützen. Vor Anbindung müssen Firestore-Regeln, Identity Provider, Zustandsmodell und Krypto geprüft werden. Ein künftiger produktiver Handler muss außerdem Streaming-Body-Limits, echte Authentisierung, Datenbanktransaktionen und Auditprotokolle implementieren.

## Isolierte Authentifizierungsvorbereitung (2026-11-10)

`tools/digitaler-nachlass/server-auth-v2.cjs` exportiert `parseBearer` und `authenticate(Request, verifyToken)`. Das Modul akzeptiert ausschließlich ein syntaktisch gültiges Bearer-Token, verlangt einen **serverseitig bereitgestellten** Verifizierer und gibt nur eine verifizierte UUID-Nutzeridentität zurück. Vom Verifizierer gelieferte `isAdmin`-, `role`- oder `ownerId`-Felder werden verworfen. Fehler werden einheitlich als `unauthorized` behandelt.

**Sicherheitsgrenze:** Der übergebene `verifyToken`-Callback ist ein Vertrauensanker. Er darf niemals aus einem HTTP-Request oder aus Browsercode stammen. Er muss künftig Token-Signatur, Issuer, Audience, Ablauf, Sperrstatus und die Identität über den festgelegten Identity Provider prüfen. Die Rückgabe `verified: true` ist nur sicher, wenn sie ausschließlich vom echten Server-Verifizierer stammt. Es gibt noch keine solche produktive Implementierung. Der neue Authentifizierungsbaustein ist absichtlich **nicht** mit `server-api-v2.cjs` verbunden; die API bleibt uneingeschränkt fail-closed.

`tests/nachlass-server-auth-v2.test.cjs` enthält isolierte Negativfälle für fehlende/ungültige Tokens, fehlenden Verifizierer, Verifiziererfehler und unzulässige Identitätsfelder. Keine produktiven Daten oder Konten werden benötigt.

## Reproduzierbare lokale Tests (2026-11-10)

Im Repository-Root mit Node.js 22 ausführen:

```sh
node --test tests/nachlass-server-api-v2.test.cjs tests/nachlass-server-auth-v2.test.cjs tests/nachlass-release-policy-v2.test.cjs
```

Die GitHub-Workflow-Datei `.github/workflows/b3-nachlass.yml` führt dieselben Tests zusammen mit den B3-Regressionstests aus. Ein grüner GitHub-Actions-Lauf ist bislang **nicht nachgewiesen**; die verfügbare Commit-Workflow-Abfrage zeigt nur PR-bezogene Läufe und kann Push-Läufe übersehen.

**Tatsächlich lokal durchgeführt:** Die 9 API- und Authentifizierungs-Tests wurden unter Node.js v22.16.0 mit lokal anhand des GitHub-Quelltexts rekonstruierten Kopien ausgeführt: 9 bestanden, 0 fehlgeschlagen. Dies ist kein kryptografischer Audit, kein Test des produktiven Deployments und kein vollständiger Checkout des GitHub-Standes. Die Release-Policy-Tests, B3-Tests und Browser-Tests sind in diesem lokalen Lauf nicht enthalten.

Produktive Daten, Auth-Konten und Firebase-/Supabase-Projekte wurden beim lokalen Lauf nicht angesprochen.

## Prüfstand 2026-11-10: Vollständiger Testlauf

- Lokales ZIP `Helferlein-main.zip` ist ein **älterer Snapshot vom 2026-11-08**. Mit Node.js 22.16.0 wurden daraus die vier enthaltenen B3-Tests ausgeführt: **4 bestanden, 0 fehlgeschlagen**. Das ist **kein** Nachweis für den aktuellen `main`-Stand.
- Die aktuellen GitHub-Quelltexte der neuen Tests und Module wurden über den GitHub-Connector eingesehen. Ein vollständiger aktueller Git-Checkout war in der Ausführungsumgebung nicht möglich (DNS-/Netzwerkzugriff auf github.com nicht verfügbar).
- Playwright-Browsertests konnten hier nicht ausgeführt werden: die Chromium-Binärdatei ist lokal nicht installiert; der GitHub-Workflow installiert sie dagegen bei Ausführung.
- Die GitHub-Actions-Abfrage `fetch_commit_workflow_runs` filtert nur PR-Läufe und ist **kein verlässlicher Beleg**, dass es keinen Push-Lauf gibt.
- `.github/workflows/b3-nachlass.yml` hat nun `workflow_dispatch` für einen manuellen Lauf, `pipefail` für korrekte Fehlerweitergabe und ein `nachlass-test-evidence`-Artefakt mit TAP- und Browserprotokollen (14 Tage Aufbewahrung). **Es wurde kein Workflow-Lauf ausgelöst oder als bestanden bestätigt.**
- Zum Nachweis im GitHub-Repository unter **Actions → B3 Nachlass pilot → Run workflow** den Branch `main` wählen. Anschließend den Status aller Jobs prüfen und das Artefakt `nachlass-test-evidence` auswerten. Fehlgeschlagene Tests vor einer Freigabe korrigieren.
- Die Browserprüfung darf keine produktiven Nachlassdatensätze erzeugen; für echte Zugriffs-Negativtests ist weiterhin ein isolierter Emulator erforderlich.

**Freigabe bleibt gesperrt**, bis der aktuelle GitHub-Stand vollständig grün ist und die Firebase-PROD-Regeln separat auditiert wurden.

## Bestands-Härtung ohne Datenmigration (2026-11-10)

- Neue Tresor-IDs (`v_` plus 16 kryptografisch zufällige Bytes) und neue Vertrauenspersonen-IDs (`p_` plus 16 Bytes) verwenden `crypto.getRandomValues` statt `Math.random`. Vorhandene IDs werden unverändert eingelesen.
- Die Personenliste schreibt keine vollständigen Erben-Links mehr in `data-link`-Attribute. Kopier- und E-Mail-Aktionen erzeugen den Link erst nach Benutzerinteraktion aus der lokal vorhandenen Konfiguration.
- Die Notfall-Kit-Vorschau zeigt keinen vollständigen Link als Klartext. **QR-Codes und explizit erstellte PDFs enthalten weiterhin den vollständigen Schlüssel** und müssen vertraulich behandelt werden. Die neue Link-Behandlung ist keine serverseitige Freigabe.
- Die bestehende Speicherung des Tresor-Masterschlüssels im lokalen Browser und bestehende Legacy-Erben-Links bleiben unverändert. Keine bestehende Sicherheitslücke wird rückwirkend durch eine zufälligere Kennung behoben.
- Zwei zusätzliche B3-Regressionstests prüfen die ID-Erzeugung und das Fehlen geheimer Links in DOM-Attributen. CI-Lauf zum letzten Commit: https://github.com/duhrrom11/Helferlein/actions/runs/42775887101. Ein grünes Ergebnis muss vor Freigabe bestätigt werden.

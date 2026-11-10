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

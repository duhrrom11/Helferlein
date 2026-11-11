# Helferlein 10 – Gerätegebundene Erbenschlüssel und Eigentümer-Hüllen

**11. November 2026 · Nur Staging-Code im Repository · nicht deployed · keine produktive Erbenfreigabe.**

## Fertiggestellte Komponenten

- `supabase/functions/_shared/heir-device-keys-staging.ts`: erzeugt einen neuen, nicht exportierbaren X25519-Privatschlüssel auf dem Erbengerät, nimmt die fünfminütige Challenge des bereits vorhandenen `heir-key-proof-staging.ts` entgegen und bestätigt sie nur über den serverseitig verifizierten Account. Vor der Bestätigung ist die Schlüsselspeicherung zwingend; ein Datenbank-/Quota-Fehler verhindert die Bestätigung. Bei einem fehlgeschlagenen oder mehrdeutigen Bestätigungsergebnis bleibt der lokale Status `pending`, nicht `verified`. Es gibt **keine** automatische Wiederholung verbrauchter Challenges.
- `createIndexedDbHeirKeyStore(factory)`: optionaler Browser-Speicher für `CryptoKey` über IndexedDB Structured Clone. Keine Exportfunktion für private Schlüssel, keine Hinterlegung in `localStorage`, URL oder serverseitigem JSON. Lokal indiziert nach `(userId,keyId)`. Bei fehlender IDB-Unterstützung scheitert Enrollment geschlossen. Dieser Adapter wurde typgeprüft, aber noch **nicht in einem echten Browser/IndexedDB** ausgeführt.
- `openHeirEnvelopeOnDevice`: entschlüsselt eine zuvor **serverseitig bereits freigegebene** HPKE-Schlüsselhülle nur mit passender Konten-ID, Schlüssel-ID und lokal verifiziertem Geräteschlüssel. Führt selbst **keine** Serverberechtigungsprüfung durch und ist kein Freigabeendpunkt.
- `supabase/functions/_shared/heir-envelope-owner-staging.ts`: Eigentümergerät ruft die verifizierte Erben-Public-Key- und Zuordnungsversion aus einer **zukünftig authentifizierten** Server-Schnittstelle ab. Der Eigentümer muss zusätzlich den SHA-256-Fingerabdruck **unabhängig** mit dem Erben abgleichen. Erst dann wird der 32-Byte-DEK lokal mit HPKE verpackt; der Server bekommt ausschließlich verschlüsselte Hülle, KEM-Public-Key und Zuordnungsmetadaten. Server-`putEnvelope` muss die Rechte/Version vor Speicherung erneut atomar prüfen.

## Benutzungsgrenzen und Sicherheit

1. Diese Module werden von keiner produktiven Edge Function und keiner Live-UI importiert. Die bestehende Sperrseite des Erben-Portals bleibt erhalten.
2. Die API-Adapter `HeirEnrollmentServer` und `OwnerEnvelopeDirectory` sind bewusst **nicht** mit Supabase-Netzwerk oder einem SQL-Konto verbunden. Browser-`userId` ist lediglich ein lokaler Schlüsselindex und darf niemals als serverseitige Authentifizierung gelten. Die serverseitigen Backendmodule müssen `auth.getUser()` selbst prüfen.
3. Der im Browser nicht exportierbare Schlüssel verhindert Raw-Key-Export, aber **nicht** seine Verwendung durch bösartiges JavaScript derselben Origin. Die heutige Besitzeroberfläche lädt Drittanbieterskripte; eine strikte CSP, Trusted Script-Auslieferung, XSS-Audit und Origin-Isolation sind vor Integration erforderlich.
4. Der separat bestätigte Public-Key-Fingerprint muss den tatsächlichen Erben über einen unabhängigen Kanal erreichen. Ein Fingerprint, der nur aus derselben Server-Antwort kopiert wird, beweist keine Identität. Wechselnde Public Keys benötigen erneute Bestätigung und neue Hüllen.
5. Gerät verloren, Browserdaten gelöscht oder privater X25519-Schlüssel nicht wiederherstellbar: Die bisherige Hülle kann nicht geöffnet werden. Mehrgeräte-Registrierung, Backup/Key-Rotation, Widerruf bereits ausgegebener Schlüssel und nutzerkontrollierte Recovery sind **noch offen**.
6. Der bestehende verschlüsselte Eigentümer-Tresor benutzt ein historisches Master-Key-Format. Es wurde **kein** vorhandener Master-Key aus LocalStorage gelesen und es gibt noch keine freigegebene Abbildung auf eine rotierbare DEK. Unkontrolliertes Wiederverpacken oder Migrieren bestehender Nutzergeheimnisse ist untersagt.
7. Das Staging-Freigabemodul meldet nach Fristablauf nur `pending_independent_review`. **Keine** Schlüsselhülle darf allein wegen eines abgelaufenen Countdowns ausgeliefert werden.

## Nachgewiesene Prüfungen

Aus dem Repository-Root mit Node.js 22.16 und TypeScript 5.x:

```sh
tsc --noEmit --allowImportingTsExtensions --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom --strict --skipLibCheck supabase/functions/_shared/heir-staging-backend.ts supabase/functions/_shared/heir-key-proof-staging.ts supabase/functions/_shared/heir-hpke-envelope.ts supabase/functions/_shared/heir-release-staging.ts supabase/functions/_shared/heir-device-keys-staging.ts supabase/functions/_shared/heir-envelope-owner-staging.ts
node --experimental-strip-types --test tests/security/heir-device-owner-workflow.test.mjs
```

**Ergebnis:** 4/4 neue Tests bestanden. Verifiziert: Schlüssel nicht exportierbar, Speichern vor Bestätigung, Quota-/Bestätigungsfehler bleiben gesperrt, lokale Besitzer-Erben-HPKE-Runde mit unabhängigem Fingerprint, falsche Identität/Zuordnung/Schlüssel/Widerruf werden verweigert. Zusätzlich erneut **5/5 bestehende** Schlüssel-/Alarmtests ausgeführt. Kein echter Browser-/IndexedDB-Test, keine echten Supabase-JWT-/RLS-/PG17-Zwei-Session-Tests, keine unabhängige Kryptografie-Abnahme.

## Nächstes Sicherheits-Gate

Ein isolierter PostgreSQL-17-Datenbanktest mit zwei voneinander unabhängigen Sessions; minimal berechtigter Server-Rolle und geprüftem `EXECUTE`, `FORCE RLS`, Lock-/Race-Verhalten, Eigentümerwechsel und Widerruf. Danach Web-Client-CSP/XSS-Audit, serverseitig verifizierte Auth-Adapter und ein echter Besitzer/Erben-End-to-End-Test mit **synthetischen Daten ausschließlich in der isolierten Umgebung**. Erst anschließend Migration, Deployment und separate Freigabeentscheidung.
